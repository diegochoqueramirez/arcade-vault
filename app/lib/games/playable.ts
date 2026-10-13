// Sin dependencias: lo importan el cliente y la Server Action saveScore.
export const PLAYABLE_GAMES = ["asteroids", "tetris", "arkanoid"] as const;
export type PlayableGameId = (typeof PLAYABLE_GAMES)[number];
export function isPlayable(id: unknown): id is PlayableGameId {
  return (PLAYABLE_GAMES as readonly unknown[]).includes(id);
}
