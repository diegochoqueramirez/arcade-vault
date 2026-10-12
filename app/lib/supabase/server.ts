import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";
// Para Server Components y Route Handlers. cookies() es API de request:
// no usar dentro de "use cache"; con cacheComponents, llamarlo dentro de <Suspense>.
export async function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components no pueden escribir cookies; el refresco de sesión irá en proxy.ts (spec de Auth).
        }
      },
    },
  });
}
