"use server";
import { createHash } from "node:crypto";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { isPlayable } from "@/app/lib/games/playable";
import { createAdminClient } from "@/app/lib/supabase/admin";
export type SaveScoreInput = {
  gameId: string;
  playerName: string;
  score: number;
};
export type SaveScoreResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "unavailable" | "rate_limited" };
const PLAYER_NAME = /^[A-Z0-9_]{1,12}$/;
const MAX_SCORE = 9_999_999;
// SPEC 11: máximo de guardados por IP en una ventana fija.
const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 60;
// Clave del rate limit: IP hasheada (no se guarda en claro).
async function rateLimitKey(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown";
  return "score:" + createHash("sha256").update(ip).digest("hex");
}
export async function saveScore(
  input: SaveScoreInput,
): Promise<SaveScoreResult> {
  const gameId = input?.gameId;
  const playerName =
    typeof input?.playerName === "string"
      ? input.playerName.trim().toUpperCase()
      : "";
  const score = input?.score;
  if (
    !isPlayable(gameId) ||
    !PLAYER_NAME.test(playerName) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return { ok: false, error: "invalid" };
  }
  try {
    // Clave secreta: anon ya no tiene grant de insert en scores (SPEC 11).
    const supabase = createAdminClient();
    const { data: allowed, error: limitError } = await supabase.rpc(
      "check_rate_limit",
      {
        p_key: await rateLimitKey(),
        p_limit: RATE_LIMIT,
        p_window_seconds: RATE_WINDOW_SECONDS,
      },
    );
    // Falla cerrado: si el rate limit no responde, no se inserta.
    if (limitError) throw limitError;
    if (!allowed) return { ok: false, error: "rate_limited" };
    // Sin user_id: aún no hay autenticación real.
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: playerName, score });
    if (error) throw error;
  } catch (error) {
    console.error("saveScore: Supabase falló", error);
    return { ok: false, error: "unavailable" };
  }
  updateTag("scores");
  return { ok: true };
}
