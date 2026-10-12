import { connection } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
export type HealthResponse = { ok: true } | { ok: false; error: "unavailable" };
const json = (body: HealthResponse, status: number) =>
  Response.json(body, { status });
export async function GET() {
  // Fuera del try: corta el prerender del build en vez de capturarlo como fallo.
  await connection();
  try {
    const supabase = await createClient();
    // Sin tablas en public: listBuckets hace una petición real al proyecto (URL + key).
    // Con la publishable key devuelve [] sin error; no usa Storage más allá del ping.
    const { error } = await supabase.storage.listBuckets();
    if (error) throw error;
    return json({ ok: true }, 200);
  } catch (err) {
    console.error("[health/supabase] Supabase no disponible:", err);
    return json({ ok: false, error: "unavailable" }, 500);
  }
}
