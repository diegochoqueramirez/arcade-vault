// Tipos y constantes del catálogo. Sin dependencias de servidor: seguro para Client Components.
// Las lecturas de Supabase viven en catalog.server.ts.
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number;
  plays: string;
}
export const CATEGORIES = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
] as const;

export interface ScoreEntry {
  id: number;
  rank: number;
  name: string;
  score: number;
  date: string; // "dd/mm/aaaa" (UTC)
}
