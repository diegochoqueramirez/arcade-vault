import {
  BALL_SIZE,
  type BlockColor,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  PADDLE_H,
  PADDLE_W,
  PADDLE_Y,
  SPRITES,
  type Sprite,
  W,
} from "./constants";
import type { ArkanoidPalette } from "./skins";
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  sp: Sprite,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}
// Dibuja un sprite tintado con el filtro/glow del skin y restaura el ctx después
// para que no se filtre al resto del frame. Sin filtro ni glow (classic) no toca el ctx.
export function drawSkinnedSprite(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  sp: Sprite,
  x: number,
  y: number,
  w: number,
  h: number,
  filter: string,
  glowColor = "transparent",
  glow = 0,
) {
  if (filter === "none" && glow === 0) {
    drawSprite(ctx, sheet, sp, x, y, w, h);
    return;
  }
  ctx.save();
  ctx.filter = filter;
  if (glow > 0) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glow;
  }
  drawSprite(ctx, sheet, sp, x, y, w, h);
  ctx.restore();
}
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export function overlaps(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
export class Paddle {
  x = (W - PADDLE_W) / 2;
  y = PADDLE_Y;
  w = PADDLE_W;
  h = PADDLE_H;
  // Recorta x al canvas.
  moveTo(x: number) {
    this.x = Math.max(0, Math.min(W - this.w, x));
  }
  draw(
    ctx: CanvasRenderingContext2D,
    sheet: CanvasImageSource,
    palette: ArkanoidPalette,
  ) {
    drawSkinnedSprite(
      ctx,
      sheet,
      SPRITES.paddle,
      this.x,
      this.y,
      this.w,
      this.h,
      palette.spriteFilter,
      palette.paddleGlow,
      palette.glow,
    );
  }
}
export class Ball {
  x = 0;
  y = 0;
  w = BALL_SIZE;
  h = BALL_SIZE;
  vx = 0;
  vy = 0;
  draw(
    ctx: CanvasRenderingContext2D,
    sheet: CanvasImageSource,
    palette: ArkanoidPalette,
  ) {
    drawSkinnedSprite(
      ctx,
      sheet,
      SPRITES.ball,
      this.x,
      this.y,
      this.w,
      this.h,
      palette.spriteFilter,
      palette.ballGlow,
      palette.glow,
    );
  }
}
export class Block {
  alive = true;
  constructor(
    public x: number,
    public y: number,
    public w: number,
    public h: number,
    public color: BlockColor,
  ) {}
  draw(
    ctx: CanvasRenderingContext2D,
    sheet: CanvasImageSource,
    palette: ArkanoidPalette,
  ) {
    // Bloques sin glow: 60 shadowBlur por frame penalizarían el rendimiento.
    drawSkinnedSprite(
      ctx,
      sheet,
      SPRITES.blocks[this.color],
      this.x,
      this.y,
      this.w,
      this.h,
      palette.blockFilter[this.color] ?? palette.spriteFilter,
    );
  }
}
export class Explosion {
  elapsed = 0; // ms
  constructor(
    public x: number,
    public y: number,
    public w: number,
    public h: number,
    public color: BlockColor,
  ) {}
  get done() {
    return this.elapsed >= EXPLOSION_DURATION;
  }
  update(dt: number) {
    this.elapsed += dt * 1000;
  }
  draw(
    ctx: CanvasRenderingContext2D,
    sheet: CanvasImageSource,
    palette: ArkanoidPalette,
  ) {
    const frame = Math.min(
      Math.floor((this.elapsed / EXPLOSION_DURATION) * 4),
      3,
    );
    drawSkinnedSprite(
      ctx,
      sheet,
      EXPLOSION_FRAMES[this.color][frame],
      this.x,
      this.y,
      this.w,
      this.h,
      palette.spriteFilter,
    );
  }
}
