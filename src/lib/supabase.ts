import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mockSupabase } from "./mockBackend";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** When Supabase isn't configured, fall back to a local in-memory mock so the UI
 * can be previewed without a backend — but ONLY in dev. In a production build a
 * missing env is a misconfiguration we want to fail loudly on, not silently mock. */
export const isMockBackend = import.meta.env.DEV && (!url || !anonKey);

export const supabase: SupabaseClient = isMockBackend
  ? mockSupabase
  : createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } });

if (isMockBackend) {
  console.warn(
    "[Nimbus] Running in DEMO mode (no Supabase env). Data is stored locally in your browser and AI features are disabled. " +
      "Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local to use a real backend.",
  );
}
