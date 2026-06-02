import { useLayoutEffect } from "react";
import { applyTheme, DEFAULT_THEME, TWEAK_DEFAULTS } from "@/domain/themes";
import { useAuth } from "@/components/auth/AuthProvider";
import { Login } from "@/components/auth/Login";
import { App } from "@/App";

/** Applies a default theme immediately (before preferences load) and gates on auth. */
export function Root() {
  const { session, loading } = useAuth();

  useLayoutEffect(() => {
    applyTheme(DEFAULT_THEME, TWEAK_DEFAULTS);
  }, []);

  if (loading) return null;
  if (!session) return <Login />;
  return <App />;
}
