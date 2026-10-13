import {
  CELL,
  type Cell,
  DIR_DELTA,
  type Dir,
  HUD_H,
  type Sprite,
} from "./constants";
import type { SnakePalette } from "./skins";
export function sameCell(a: Cell, b: Cell) {
  return a.col === b.col && a.row === b.row;
}
// Esquina superior izquierda de la celda en el canvas.
function cellX(c: Cell) {
  return c.col * CELL;
}
function cellY(c: Cell) {
  return HUD_H + c.row * CELL;
}
// Dibuja el sprite centrado en la celda, cabiendo en `size` y con su proporción.
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  sp: Sprite,
  cell: Cell,
  size: number,
) {
  const scale = Math.min(size / sp.sw, size / sp.sh);
  const w = sp.sw * scale;
  const h = sp.sh * scale;
  const x = cellX(cell) + (CELL - w) / 2;
  const y = cellY(cell) + (CELL - h) / 2;
  ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}
export class Snake {
  // Cabeza en [0].
  cells: Cell[];
  constructor(start: Cell[]) {
    this.cells = start.map((c) => ({ ...c }));
  }
  get head() {
    return this.cells[0];
  }
  get length() {
    return this.cells.length;
  }
  nextHead(dir: Dir): Cell {
    const d = DIR_DELTA[dir];
    return { col: this.head.col + d.col, row: this.head.row + d.row };
  }
  // Sin crecer, la cola deja su celda en el mismo paso: no cuenta como choque.
  hits(cell: Cell, ignoreTail: boolean) {
    const end = ignoreTail ? this.cells.length - 1 : this.cells.length;
    for (let i = 0; i < end; i++)
      if (sameCell(this.cells[i], cell)) return true;
    return false;
  }
  advance(head: Cell, grow: boolean) {
    this.cells.unshift(head);
    if (!grow) this.cells.pop();
  }
  draw(ctx: CanvasRenderingContext2D, dir: Dir, palette: SnakePalette) {
    const inset = 2;
    const size = CELL - inset * 2;
    // Glow solo en los segmentos; se resetea antes de los ojos.
    ctx.shadowBlur = palette.glow;
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const c = this.cells[i];
      const color = i === 0 ? palette.head : palette.body;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.roundRect(
        cellX(c) + inset,
        cellY(c) + inset,
        size,
        size,
        palette.segmentRadius,
      );
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    this.drawEyes(ctx, dir, palette);
  }
  private drawEyes(
    ctx: CanvasRenderingContext2D,
    dir: Dir,
    palette: SnakePalette,
  ) {
    const cx = cellX(this.head) + CELL / 2;
    const cy = cellY(this.head) + CELL / 2;
    const d = DIR_DELTA[dir];
    // Ojos adelantados en la dirección de avance y separados en la perpendicular.
    const fwd = 7;
    const side = 8;
    const eye = 6;
    ctx.fillStyle = palette.eye;
    for (const s of [-1, 1]) {
      const ex = cx + d.col * fwd + d.row * side * s;
      const ey = cy + d.row * fwd + d.col * side * s;
      ctx.fillRect(ex - eye / 2, ey - eye / 2, eye, eye);
    }
  }
}
export class Fruit {
  constructor(
    public cell: Cell,
    public sprite: Sprite,
  ) {}
  // El filtro de la skin tiñe solo el sprite y se restaura después.
  draw(
    ctx: CanvasRenderingContext2D,
    sheet: CanvasImageSource,
    palette: SnakePalette,
  ) {
    ctx.filter = palette.fruitFilter;
    drawSprite(ctx, sheet, this.sprite, this.cell, CELL - 8);
    ctx.filter = "none";
  }
}
