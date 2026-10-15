import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv, getSupabaseSecretKey } from "./env";
// Cliente con la clave secreta (rol service_role): única vía de escritura en scores.
// Solo lo importa app/actions/*.
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  return createClient<Database>(url, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
