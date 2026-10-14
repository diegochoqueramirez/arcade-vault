import type { AsteroidsPalette } from "./skins";
// Sprites offscreen (patrón SPEC 10, paso 8): cada forma con glow se pinta una sola vez
// en un canvas aparte y cada frame solo se copia con drawImage, así shadowBlur no se
// calcula por frame en el canvas principal. La caché vive en el closure de cada motor
// (se libera al cambiar de skin o salir). Sin glow (classic / retro) se dibuja en vector
// directo: el resultado es idéntico al original y no hay coste de blur que ahorrar.
// paint dibuja la forma con el origen en su centro.
export type Paint = (c: CanvasRenderingContext2D) => void;
export interface AsteroidsSprites {
  // Dibuja una forma de lado `size` centrada en (x, y) y girada `rot`.
  // `key` identifica el sprite (string, o el objeto dueño de una forma única).
  shape(
    ctx: CanvasRenderingContext2D,
    key: string | object,
    size: number,
    x: number,
    y: number,
    rot: number,
    glow: number,
    paint: Paint,
  ): void;
  // Texto con glow cacheado hasta que cambie `key` (un canvas por slot, fuera del Map).
  text(
    ctx: CanvasRenderingContext2D,
    slot: string,
    key: string,
    w: number,
    h: number,
    glow: number,
    paint: Paint,
  ): void;
}
export function createSprites(palette: AsteroidsPalette): AsteroidsSprites {
  // Margen alrededor de la forma para que el glow no se recorte.
  const PAD = Math.ceil(Math.max(palette.glow, palette.hudGlow) * 1.5) + 2;
  const byKey = new Map<string, HTMLCanvasElement>();
  const byOwner = new WeakMap<object, HTMLCanvasElement>();
  const texts = new Map<string, { key: string; s: HTMLCanvasElement }>();
  function makeCanvas(w: number, h: number) {
    const s = document.createElement("canvas");
    s.width = w + PAD * 2;
    s.height = h + PAD * 2;
    const c = s.getContext("2d");
    if (!c) throw new Error("Canvas 2D no disponible");
    return { s, c };
  }
  function build(size: number, paint: Paint) {
    const { s, c } = makeCanvas(size, size);
    c.translate(PAD + size / 2, PAD + size / 2);
    paint(c);
    return s;
  }
  function get(key: string | object, size: number, paint: Paint) {
    if (typeof key === "string") {
      let s = byKey.get(key);
      if (!s) byKey.set(key, (s = build(size, paint)));
      return s;
    }
    let s = byOwner.get(key);
    if (!s) byOwner.set(key, (s = build(size, paint)));
    return s;
  }
  return {
    shape(ctx, key, size, x, y, rot, glow, paint) {
      const sz = Math.ceil(size);
      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      if (glow > 0) {
        ctx.drawImage(get(key, sz, paint), -sz / 2 - PAD, -sz / 2 - PAD);
      } else {
        paint(ctx);
      }
      ctx.restore();
    },
    text(ctx, slot, key, w, h, glow, paint) {
      if (glow <= 0) {
        paint(ctx);
        return;
      }
      let cached = texts.get(slot);
      if (!cached || cached.key !== key) {
        const { s, c } = makeCanvas(w, h);
        c.translate(PAD, PAD);
        paint(c);
        cached = { key, s };
        texts.set(slot, cached);
      }
      // El sprite empieza en (-PAD, -PAD): el texto queda en sus coordenadas originales.
      ctx.drawImage(cached.s, -PAD, -PAD);
    },
  };
}
