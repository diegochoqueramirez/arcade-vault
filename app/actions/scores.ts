"use server";

import { updateTag } from "next/cache";
import { createPublicClient } from "@/app/lib/supabase/public";

export type SaveScoreInput = { gameId: string; playerName: string; score: number };
export type SaveScoreResult = { ok: true } | { ok: false; error: "invalid" | "unavailable" };

// Solo juegos reales; la FK de la BD no distingue.
const SAVEABLE_GAMES = ["asteroids"];
const PLAYER_NAME = /^[A-Z0-9_]{1,12}$/;
const MAX_SCORE = 9_999_999;

export async function saveScore(input: SaveScoreInput): Promise<SaveScoreResult> {
  const gameId = input?.gameId;
  const playerName = typeof input?.playerName === "string" ? input.playerName.trim().toUpperCase() : "";
  const score = input?.score;

  if (
    !SAVEABLE_GAMES.includes(gameId) ||
    !PLAYER_NAME.test(playerName) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return { ok: false, error: "invalid" };
  }

  try {
    // Sin user_id: el grant de insert no lo permite.
    const { error } = await createPublicClient()
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
