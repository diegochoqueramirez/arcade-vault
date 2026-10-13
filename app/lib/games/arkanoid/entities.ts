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
  draw(ctx: CanvasRenderingContext2D, sheet: CanvasImageSource) {
    drawSprite(ctx, sheet, SPRITES.paddle, this.x, this.y, this.w, this.h);
  }
}
export class Ball {
  x = 0;
  y = 0;
  w = BALL_SIZE;
  h = BALL_SIZE;
  vx = 0;
  vy = 0;
  draw(ctx: CanvasRenderingContext2D, sheet: CanvasImageSource) {
    drawSprite(ctx, sheet, SPRITES.ball, this.x, this.y, this.w, this.h);
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
  draw(ctx: CanvasRenderingContext2D, sheet: CanvasImageSource) {
    drawSprite(
      ctx,
      sheet,
      SPRITES.blocks[this.color],
      this.x,
      this.y,
      this.w,
      this.h,
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
  draw(ctx: CanvasRenderingContext2D, sheet: CanvasImageSource) {
    const frame = Math.min(
      Math.floor((this.elapsed / EXPLOSION_DURATION) * 4),
      3,
    );
    drawSprite(
      ctx,
      sheet,
      EXPLOSION_FRAMES[this.color][frame],
      this.x,
      this.y,
      this.w,
      this.h,
    );
  }
}
