"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

/**
 * A refresh token the server has rejected can never be recovered. Detect it so
 * the stale copy can be dropped instead of being retried on every page load.
 */
function clearStaleLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

function isStaleRefreshToken(error: unknown): boolean {
  if (!error) return false;
  const message = typeof error === "string"
    ? error.toLowerCase()
    : ((error as { message?: string; error_description?: string })?.message ||
       (error as { message?: string; error_description?: string })?.error_description ||
       "").toLowerCase();
  return (
    message.includes("refresh token") ||
    message.includes("invalid_grant") ||
    message.includes("not found") ||
    message.includes("session from session id") ||
    message.includes("jwt expired")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const applySession = (next: Session | null) => {
      if (!active) return;
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    };

    const handleStaleToken = async (err: unknown) => {
      if (isStaleRefreshToken(err)) {
        clearStaleLocalStorage();
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
      applySession(null);
    };

    const resolveSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          await handleStaleToken(error);
          return;
        }

        applySession(data.session);
      } catch (err) {
        await handleStaleToken(err);
      }
    };

    resolveSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        applySession(null);
      } else {
        applySession(session);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    } finally {
      clearStaleLocalStorage();
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
