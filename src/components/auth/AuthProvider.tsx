/* Supabase Auth session provider — replaces the prototype's localStorage gate. */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";

interface AuthValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    let prevUser: string | null = null;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Only drop cached server state on a real sign-out or a user switch — NOT on
      // every SIGNED_IN / TOKEN_REFRESHED (those re-fire on tab refocus and would
      // otherwise wipe prefs and make the theme flash back to default).
      const nextUser = s?.user?.id ?? null;
      if (event === "SIGNED_OUT" || (prevUser && nextUser && prevUser !== nextUser)) {
        queryClient.clear();
      }
      prevUser = nextUser;
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    session,
    user: session?.user ?? null,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
