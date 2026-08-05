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
function isStaleRefreshToken(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return message.includes("refresh token") || message.includes("session from session id");
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

    const resolveSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          // Discard the unusable token locally so the client stops replaying it.
          // scope: "local" avoids a network call that would fail for the same reason.
          if (isStaleRefreshToken(error)) {
            await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          }
          applySession(null);
          return;
        }

        applySession(data.session);
      } catch (err) {
        if (isStaleRefreshToken(err)) {
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        }
        // Never leave the app stuck on its loading state.
        applySession(null);
      }
    };

    resolveSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
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
      // The server rejected the token (already expired or revoked). The local
      // session still has to go, so clear it and let the listener update state.
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
