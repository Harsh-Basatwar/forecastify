"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { UserRole, hasPermission, canViewFinancials, maskFinancials, Permission } from "./rbac";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: 'owner',
  setRole: () => {},
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
  const [role, setRoleState] = useState<UserRole>('owner');
  const [loading, setLoading] = useState(true);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("forecastify_user_role", newRole);
    }
  };

  useEffect(() => {
    let active = true;

    // Load saved role preference if present
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("forecastify_user_role") as UserRole;
      if (savedRole) setRoleState(savedRole);
    }

    const applySession = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      setUser(next?.user ?? null);

      if (next?.user) {
        // Try fetching user role from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", next.user.id)
          .maybeSingle();

        if (profile?.role && active) {
          setRoleState(profile.role as UserRole);
        } else if (next.user.user_metadata?.role && active) {
          setRoleState(next.user.user_metadata.role as UserRole);
        }
      }

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
    <AuthContext.Provider value={{ user, session, role, setRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function useRBAC() {
  const { role, setRole } = useAuth();
  return {
    role,
    setRole,
    can: (permission: Permission) => hasPermission(role, permission),
    canViewFinancials: canViewFinancials(role),
    maskFinancials: <T extends Record<string, any>>(data: T) => maskFinancials(data, role),
  };
}

