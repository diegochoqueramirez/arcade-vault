// Rejilla de COLS × ROWS celdas; el canvas lógico es exactamente la rejilla (el CSS lo escala).
export const COLS = 16;
export const ROWS = 14;
export const CELL = 40; // px
export const W = COLS * CELL; // 640
export const H = ROWS * CELL; // 560
// Zonas (índice de fila, 0 = arriba).
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;
export const START_COL = Math.floor(COLS / 2);
// 5 bocas destino de 2 columnas cada una en la fila de metas (columna inicial de cada boca).
export const GOAL_COLS = [1, 4, 7, 10, 13];
export const GOAL_WIDTH = 2;
export const START_LIVES = 3;
export const JUMP_MS = 120;
export const FRAME_MS = 16; // dt de referencia: velocidades en px/frame
export const LEVEL_SPEED_FACTOR = 1.15; // +15 % por nivel
// Temporizador de ronda: 15 s en nivel 1, −1 s por nivel, mínimo 8 s.
export const BASE_ROUND_MS = 15_000;
export const ROUND_MS_PER_LEVEL = 1_000;
export const MIN_ROUND_MS = 8_000;
// Ciclo de inmersión de las tortugas.
export const TURTLE_VISIBLE_MS = 3_000;
export const TURTLE_SUBMERGED_MS = 1_500;
export const POINTS_PER_ROW = 10;
export const POINTS_GOAL = 50;
export const POINTS_ROUND = 200;
export const POINTS_PER_SECOND_LEFT = 10;
export type Direction = "up" | "down" | "left" | "right";
export const DIR_DELTA: Record<Direction, { col: number; row: number }> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
