import { H, POWERUP_TTL, RADII, SPEEDS, TRIPLE_SPREAD, W } from "./constants";
import type { AsteroidsPalette } from "./skins";
import type { AsteroidsSprites } from "./sprites";
export type AsteroidSize = 1 | 2 | 3;
export type KeyState = Record<string, boolean>;
interface Point {
  x: number;
  y: number;
}
// ── Utils ─────────────────────────────────────────────────────────────────────
export const wrap = (v: number, max: number) => ((v % max) + max) % max;
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const rand = (min: number, max: number) =>
  min + Math.random() * (max - min);
export const randInt = (min: number, max: number) =>
  Math.floor(rand(min, max + 1));
// Glow del skin (0 = desactivado). Siempre se resetea tras dibujar con clearGlow.
export function setGlow(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}
export function clearGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowBlur = 0;
}
// ── Bullet ────────────────────────────────────────────────────────────────────
export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;
  constructor(x: number, y: number, angle: number) {
    const SPEED = 520;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(
    ctx: CanvasRenderingContext2D,
    palette: AsteroidsPalette,
    sprites: AsteroidsSprites,
  ) {
    const r = this.radius;
    sprites.shape(
      ctx,
      "bullet",
      r * 2,
      this.x,
      this.y,
      0,
      palette.glow,
      (c) => {
        c.fillStyle = palette.bullet;
        setGlow(c, palette.bullet, palette.glow);
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fill();
        clearGlow(c);
      },
    );
  }
}
// ── Asteroid ──────────────────────────────────────────────────────────────────
export class Asteroid {
  x: number;
  y: number;
  size: AsteroidSize;
  radius: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  verts: [number, number][] = [];
  dead = false;
  constructor(x: number, y: number, size: AsteroidSize = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);
    // Polígono irregular
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }
  split(): Asteroid[] {
    if (this.size <= 1) return [];
    const next = (this.size - 1) as AsteroidSize;
    return [
      new Asteroid(this.x, this.y, next),
      new Asteroid(this.x, this.y, next),
    ];
  }
  // Polígono único por asteroide: su sprite se cachea con el propio asteroide como clave.
  draw(
    ctx: CanvasRenderingContext2D,
    palette: AsteroidsPalette,
    sprites: AsteroidsSprites,
  ) {
    const verts = this.verts;
    const size = this.radius * 2 + 2; // + trazo
    sprites.shape(
      ctx,
      this,
      size,
      this.x,
      this.y,
      this.rot,
      palette.glow,
      (c) => {
        c.strokeStyle = palette.asteroid;
        setGlow(c, palette.asteroid, palette.glow);
        c.lineWidth = 1.5;
        c.lineJoin = "round";
        c.beginPath();
        c.moveTo(verts[0][0], verts[0][1]);
        for (let i = 1; i < verts.length; i++)
          c.lineTo(verts[i][0], verts[i][1]);
        c.closePath();
        c.stroke();
        clearGlow(c);
      },
    );
  }
}
// ── PowerUp ───────────────────────────────────────────────────────────────────
export class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(
    ctx: CanvasRenderingContext2D,
    palette: AsteroidsPalette,
    sprites: AsteroidsSprites,
  ) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    // Pulso cuantizado a 0,25 px: ~15 sprites por skin, diferencia imperceptible.
    const r = Math.round(this.radius * pulse * 4) / 4;
    const size = (r + 1) * Math.SQRT2 * 2; // rombo girado 45° + trazo
    const rot = Math.PI / 4;
    sprites.shape(
      ctx,
      `pu:${r}`,
      size,
      this.x,
      this.y,
      rot,
      palette.glow,
      (c) => {
        c.strokeStyle = palette.powerUp;
        setGlow(c, palette.powerUp, palette.glow);
        c.lineWidth = 2;
        c.strokeRect(-r, -r, r * 2, r * 2);
        clearGlow(c);
      },
    );
    // El texto "3x" nunca tuvo glow (restore lo quitaba antes de fillText).
    ctx.fillStyle = palette.powerUp;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
    clearGlow(ctx);
  }
}
// ── Ship ──────────────────────────────────────────────────────────────────────
export class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  tripleShot = 0;
  dead = false;
  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }
  update(dt: number, keys: KeyState) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;
    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;
    if (keys.ArrowLeft) this.angle -= ROT * dt;
    if (keys.ArrowRight) this.angle += ROT * dt;
    this.thrusting = !!keys.ArrowUp;
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }
    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }
  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }
  draw(
    ctx: CanvasRenderingContext2D,
    palette: AsteroidsPalette,
    sprites: AsteroidsSprites,
  ) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;
    const { x, y, angle } = this;
    // Silueta clásica: triángulo con muesca trasera (nariz en x = 20).
    sprites.shape(ctx, "ship", 42, x, y, angle, palette.glow, (c) => {
      c.strokeStyle = palette.ship;
      setGlow(c, palette.ship, palette.glow);
      c.lineWidth = 1.5;
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(20, 0); // nariz
      c.lineTo(-12, -9); // ala izquierda
      c.lineTo(-7, 0); // muesca trasera
      c.lineTo(-12, 9); // ala derecha
      c.closePath();
      c.stroke();
      clearGlow(c);
    });
    // Llama del propulsor; largo cuantizado a 0,5 px (17 sprites como máximo).
    if (this.thrusting && Math.random() > 0.35) {
      const len = Math.round(rand(6, 14) * 2) / 2;
      sprites.shape(ctx, `flame:${len}`, 46, x, y, angle, palette.glow, (c) => {
        c.strokeStyle = palette.thrust;
        setGlow(c, palette.thrust, palette.glow);
        c.lineWidth = 1.5;
        c.lineJoin = "round";
        c.beginPath();
        c.moveTo(-8, -4);
        c.lineTo(-8 - len, 0);
        c.lineTo(-8, 4);
        c.stroke();
        clearGlow(c);
      });
    }
  }
}
// ── Particle (explosión) ──────────────────────────────────────────────────────
export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }
  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  // Sin glow: hay muchas partículas a la vez y penalizaría el rendimiento.
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    const alpha = this.ttl / this.life;
    ctx.globalAlpha = Number(alpha.toFixed(2));
    ctx.strokeStyle = palette.particle;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
