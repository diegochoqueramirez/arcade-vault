// Resolución lógica del canvas (px). El escalado visual lo hace CSS.
export const W = 800;
export const H = 600;
// Tablero: COLS × ROWS celdas de BLOCK px (300×600, como el original).
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
// Layout: tablero + gap 20 + panel 160, centrado en el canvas.
export const BOARD_X = 160;
export const BOARD_Y = 0;
export const PANEL_X = BOARD_X + COLS * BLOCK + 20;
export const NEXT_SIZE = 120; // vista previa 120×120, bloques de 30
// Índice 1–7 = tipo de pieza; 0 = celda vacía.
export const COLORS = [
  "",
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
] as const;
export const PIECES: readonly (readonly number[][])[] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];
export const PIECE_TYPES = 7;
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const KICKS = [0, -1, 1, -2, 2] as const;
// Tema oscuro del style.css original.
export const THEME = {
  bg: "#0f0f17",
  canvasBg: "#1a1a25",
  border: "#2a2a3a",
  gridLine: "#22222e",
  label: "#555570",
  value: "#7aa2f7",
  controlsText: "#888",
  kbdBg: "#22223a",
  kbdBorder: "#3a3a5a",
  kbdText: "#aaa",
  overlayBg: "rgba(10, 10, 20, 0.75)",
  gameOver: "#e57373",
} as const;
export const FONT_SANS = "system-ui, -apple-system, sans-serif";
export const FONT_MONO = "'Courier New', Courier, monospace";
