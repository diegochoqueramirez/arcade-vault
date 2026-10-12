// Referencias literales a process.env.NEXT_PUBLIC_*: Next solo las inlinea en el bundle cliente así.
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `Supabase: faltan variables de entorno: ${missing.join(", ")}`,
    );
  }
  return { url: url!, publishableKey: publishableKey! };
}
