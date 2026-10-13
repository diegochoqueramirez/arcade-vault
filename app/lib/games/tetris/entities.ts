import { COLORS, COLS, PIECES, PIECE_TYPES } from "./constants";
export type Shape = number[][];
// ── Utils ─────────────────────────────────────────────────────────────────────
// Rotación horaria: transpuesta + inversión de filas.
export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
) {
  if (!colorIndex) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS[colorIndex];
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}
// ── Piece ─────────────────────────────────────────────────────────────────────
export class Piece {
  type: number;
  shape: Shape;
  x: number;
  y = 0;
  constructor(type: number) {
    this.type = type;
    this.shape = PIECES[type].map((row) => [...row]);
    this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2);
  }
  // Recorre las celdas ocupadas en coordenadas de tablero.
  forEachCell(fn: (x: number, y: number, v: number) => void, oy = this.y) {
    for (let r = 0; r < this.shape.length; r++)
      for (let c = 0; c < this.shape[r].length; c++)
        if (this.shape[r][c]) fn(this.x + c, oy + r, this.shape[r][c]);
  }
}
export function randomPiece() {
  return new Piece(Math.floor(Math.random() * PIECE_TYPES) + 1);
}
