import { useAuth } from "@/components/auth/AuthProvider";
import { Login } from "@/components/auth/Login";
import { App } from "@/App";

/** Auth gate. The initial theme is painted pre-render by the inline boot script
 * in index.html (from the cached CSS vars); App applies the authoritative theme
 * once preferences load. */
export function Root() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Login />;
  return <App />;
}
