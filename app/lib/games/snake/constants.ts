// Dimensiones lógicas del canvas (el CSS lo escala).
export const W = 800;
export const H = 600;
// Barra de HUD arriba y tablero de COLS × ROWS celdas debajo.
export const HUD_H = 40;
export const CELL = 40;
export const COLS = 20;
export const ROWS = 14;
export interface Cell {
  col: number;
  row: number;
}
export type Dir = "up" | "down" | "left" | "right";
export const DIR_DELTA: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
export const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
// Cabeza primero; la serpiente arranca hacia la derecha.
export const START_CELLS: Cell[] = [
  { col: 5, row: 7 },
  { col: 4, row: 7 },
  { col: 3, row: 7 },
];
export const START_DIR: Dir = "right";
export const BASE_STEP_MS = 150; // nivel 1
export const STEP_MS_PER_LEVEL = 10; // −10 ms por nivel
export const MIN_STEP_MS = 60;
export const FRUITS_PER_LEVEL = 5;
export const POINTS_PER_FRUIT = 10;
export const MAX_QUEUED_TURNS = 2;
export const ASSETS = {
  fruits: "/games/snake/fruits.png",
};
// Recorte dentro de fruits.png.
export interface Sprite {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
// Fila pixel (y 136–295). Coordenadas de sprites.js verificadas por píxeles;
// los nombres de sprites.js están desplazados respecto a la imagen, aquí van los reales.
const ROW_Y = 136;
const ROW_H = 160;
const fruit = (sx: number, sw: number): Sprite => ({
  sx,
  sy: ROW_Y,
  sw,
  sh: ROW_H,
});
export const FRUIT_SPRITES = {
  apple: fruit(34, 110),
  banana: fruit(186, 150),
  pineapple: fruit(378, 110),
  grape: fruit(540, 130),
  pumpkin: fruit(712, 130),
  turnip: fruit(894, 110),
  eggplant: fruit(1066, 110),
  strawberry: fruit(1228, 130),
  cherry: fruit(1400, 130),
  carrot: fruit(1582, 110),
  mushroom: fruit(1734, 150),
  broccoli: fruit(1906, 150),
  watermelon: fruit(2068, 170),
  pepper: fruit(2250, 140),
  kiwi: fruit(2432, 130),
  lemon: fruit(2604, 130),
  orange: fruit(2786, 110),
  peach: fruit(2948, 130),
  peanut: fruit(3110, 150),
  raspberry: fruit(3302, 110),
  tomato: fruit(3454, 150),
  bowl: fruit(3637, 130),
} satisfies Record<string, Sprite>;
export const FRUIT_LIST: Sprite[] = Object.values(FRUIT_SPRITES);
