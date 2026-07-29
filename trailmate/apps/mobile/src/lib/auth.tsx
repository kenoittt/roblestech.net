/**
 * Auth session + current profile (FR-1.1, FR-1.2, FR-1.3).
 *
 * One provider owns the Supabase session and the matching public.users row, so screens can
 * ask "who is this and are they an organizer?" without each one re-querying.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { UserRow } from "@/types/database";

interface AuthState {
  session: Session | null;
  profile: UserRow | null;
  loading: boolean;
  isOrganizer: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setProfile(null);
      return;
    }
    // The row is created by the on_auth_user_created trigger, so this is a read, not an
    // upsert — if it is missing, something is wrong with the trigger, not with the client.
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", activeSession.user.id)
      .maybeSingle();

    if (error) {
      console.error("could not load profile", error.message);
      setProfile(null);
      return;
    }
    setProfile((data as UserRow | null) ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      await loadProfile(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      isOrganizer: profile?.role_flags.includes("organizer") ?? false,
      isAdmin: profile?.role_flags.includes("admin") ?? false,
      refreshProfile: () => loadProfile(session),

      async signInWithEmail(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },

      async signUpWithEmail(email, password, displayName) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
      },

      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, profile, loading, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
