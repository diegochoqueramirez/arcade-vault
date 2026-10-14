import {
  CELL,
  type Cell,
  DIR_DELTA,
  type Dir,
  HUD_H,
  type Sprite,
} from "./constants";
import type { SnakePalette } from "./skins";
// Margen del segmento dentro de la celda y tamaño máximo del sprite de fruta.
export const SEGMENT_INSET = 2;
export const SEGMENT_SIZE = CELL - SEGMENT_INSET * 2;
export const FRUIT_SIZE = CELL - 8;
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
// Caja del sprite centrado en la celda, cabiendo en `size` y con su proporción.
export function spriteBox(sp: Sprite, cell: Cell, size: number) {
  const scale = Math.min(size / sp.sw, size / sp.sh);
  const w = sp.sw * scale;
  const h = sp.sh * scale;
  const x = cellX(cell) + (CELL - w) / 2;
  const y = cellY(cell) + (CELL - h) / 2;
  return { x, y, w, h };
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
  // Segmentos (con su glow) pre-renderizados por el motor (SPEC 10): `segment(isHead)`
  // devuelve el sprite y `pad` su margen; aquí solo se copian, 0 shadowBlur por frame.
  draw(
    ctx: CanvasRenderingContext2D,
    dir: Dir,
    palette: SnakePalette,
    segment: (isHead: boolean) => CanvasImageSource,
    pad: number,
  ) {
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const c = this.cells[i];
      ctx.drawImage(
        segment(i === 0),
        cellX(c) + SEGMENT_INSET - pad,
        cellY(c) + SEGMENT_INSET - pad,
      );
    }
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
  // `img`: sprite ya escalado y tintado por el motor con el filtro de la skin (una vez por
  // fruta y skin), con el desplazamiento subpíxel de la caja incluido: sin ctx.filter por frame.
  draw(ctx: CanvasRenderingContext2D, img: CanvasImageSource) {
    const { x, y } = spriteBox(this.sprite, this.cell, FRUIT_SIZE);
    ctx.drawImage(img, Math.floor(x), Math.floor(y));
  }
}
