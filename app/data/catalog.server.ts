import "server-only";
import { cacheTag } from "next/cache";
import type { Database } from "@/app/lib/supabase/database.types";
import { createPublicClient } from "@/app/lib/supabase/public";
import type { Game, GameCategory, GameColor, ScoreEntry } from "./catalog";
type GameStatsRow = Database["public"]["Views"]["game_stats"]["Row"];
// Las columnas de una vista llegan como nullable en los tipos generados.
function toGame(row: GameStatsRow): Game {
  return {
    id: row.id!,
    title: row.title!,
    short: row.short!,
    long: row.long!,
    cat: row.cat as GameCategory,
    cover: row.cover!,
    color: row.color as GameColor,
    best: row.best ?? 0,
    plays: row.plays!,
  };
}
// Tag "scores" porque best se deriva de las puntuaciones.
export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheTag("games", "scores");
  const { data, error } = await createPublicClient()
    .from("game_stats")
    .select("*")
    .order("created_at");
  if (error)
    throw new Error(
      `Supabase: no se pudieron leer los juegos: ${error.message}`,
    );
  return data.map(toGame);
}
export async function getGameById(id: string): Promise<Game | undefined> {
  "use cache";
  cacheTag("games", "scores");
  const { data, error } = await createPublicClient()
    .from("game_stats")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error(
      `Supabase: no se pudo leer el juego ${id}: ${error.message}`,
    );
  return data ? toGame(data) : undefined;
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

// Todas las entradas; empate → la más antigua primero.
export async function getLeaderboard(gameId: string, limit: number): Promise<ScoreEntry[]> {
  "use cache";
  cacheTag("scores");
  const { data, error } = await createPublicClient()
    .from("scores")
    .select("id, player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Supabase: no se pudo leer el leaderboard de ${gameId}: ${error.message}`);
  return data.map((row, i) => ({
    id: row.id,
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: DATE_FORMAT.format(new Date(row.created_at)),
  }));
}
