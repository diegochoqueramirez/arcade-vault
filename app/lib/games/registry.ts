import { H as ARKANOID_H, W as ARKANOID_W } from "./arkanoid/constants";
import { createArkanoidGame } from "./arkanoid/engine";
import { H as ASTEROIDS_H, W as ASTEROIDS_W } from "./asteroids/constants";
import { createAsteroidsGame } from "./asteroids/engine";
import { H as TETRIS_H, W as TETRIS_W } from "./tetris/constants";
import { createTetrisGame } from "./tetris/engine";
import type { GameFactory } from "./types";
// Motores montables en /games/[id]/play. Añadir un juego: entrada aquí + id en PLAYABLE_GAMES.
export const GAME_ENGINES: Record<
  string,
  { create: GameFactory; width: number; height: number }
> = {
  asteroids: {
    create: createAsteroidsGame,
    width: ASTEROIDS_W,
    height: ASTEROIDS_H,
  },
  tetris: {
    create: createTetrisGame,
    width: TETRIS_W,
    height: TETRIS_H,
  },
  arkanoid: {
    create: createArkanoidGame,
    width: ARKANOID_W,
    height: ARKANOID_H,
  },
};
