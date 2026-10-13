import { H as ARKANOID_H, W as ARKANOID_W } from "./arkanoid/constants";
import { createArkanoidGame } from "./arkanoid/engine";
import { H as ASTEROIDS_H, W as ASTEROIDS_W } from "./asteroids/constants";
import { createAsteroidsGame } from "./asteroids/engine";
import { SKINS as ASTEROIDS_SKINS } from "./asteroids/skins";
import { H as SNAKE_H, W as SNAKE_W } from "./snake/constants";
import { createSnakeGame } from "./snake/engine";
import { H as TETRIS_H, W as TETRIS_W } from "./tetris/constants";
import { createTetrisGame } from "./tetris/engine";
import type { GameFactory, SkinId } from "./types";
// Motores montables en /games/[id]/play. Añadir un juego: entrada aquí + id en PLAYABLE_GAMES.
// `skins` es opcional: solo los juegos con skins muestran el selector en GamePlayer.
export const GAME_ENGINES: Record<
  string,
  {
    create: GameFactory;
    width: number;
    height: number;
    skins?: Record<SkinId, unknown>;
  }
> = {
  asteroids: {
    create: createAsteroidsGame,
    width: ASTEROIDS_W,
    height: ASTEROIDS_H,
    skins: ASTEROIDS_SKINS,
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
  snake: {
    create: createSnakeGame,
    width: SNAKE_W,
    height: SNAKE_H,
  },
};
