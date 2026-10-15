import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";
// Cliente sin cookies (rol anon, solo lectura): apto dentro de "use cache".
// Solo lo importa app/data/catalog.server.ts.
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
