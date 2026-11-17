import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { flushCloudWritesForLogout, setActiveAccount } from "./store";
import { supabase, supabaseConfigured } from "./supabase";

export type AuthStatus = "unconfigured" | "loading" | "signed-out" | "signed-in";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsEmailVerification: boolean }>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function callbackUrl(path: string): string {
  if (typeof window === "undefined") throw new Error("Authentication redirects require a browser.");
  return `${window.location.origin}${path}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(supabaseConfigured ? "loading" : "unconfigured");
  const [user, setUser] = useState<User | null>(null);

  const acceptSession = useCallback((session: Session | null) => {
    const nextUser = session?.user ?? null;
    setUser(nextUser);
    setStatus(nextUser ? "signed-in" : "signed-out");
    void setActiveAccount(nextUser?.id ?? null);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) console.error("Could not restore Supabase session", error);
      acceptSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (alive) acceptSession(session);
      });
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [acceptSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async signIn(email, password) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl("/auth/callback") },
        });
        if (error) throw error;
        return { needsEmailVerification: !data.session };
      },
      async signOut() {
        if (!supabase) return;
        const saved = await flushCloudWritesForLogout();
        if (!saved)
          throw new Error(
            "Your latest changes are not synced. Resolve the sync notice before signing out.",
          );
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      async requestPasswordReset(email) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: callbackUrl("/reset-password"),
        });
        if (error) throw error;
      },
      async updatePassword(password) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
