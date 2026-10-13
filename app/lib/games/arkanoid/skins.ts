import type { SkinId } from "../types";
import type { BlockColor } from "./constants";
// Todos los colores que dibuja Arkanoid. Paleta, bola y bloques son sprites del
// spritesheet (sin modificar): se tintan con `ctx.filter` solo al dibujarlos.
// `classic` = colores originales, idénticos, sin filtro.
export interface ArkanoidPalette {
  bg: string; // fondo del canvas
  hud: string; // Score / Nivel
  overlayBg: string; // velo de GAME OVER / victoria
  overlayText: string;
  spriteFilter: string; // ctx.filter para paleta, bola, vidas, bloques y explosiones
  blockFilter: Partial<Record<BlockColor, string>>; // override por color de bloque
  paddleGlow: string; // shadowColor de la paleta
  ballGlow: string; // shadowColor de la bola
  glow: number; // shadowBlur de paleta/bola (0 = sin glow)
  hudGlow: number; // shadowBlur del texto del HUD / overlay
  scanlines: string | null; // líneas CRT sobre todo el canvas (null = sin líneas)
}
// Contraste WCAG medido frente a `bg` (ver references/game-with-themes.md).
export const SKINS: Record<SkinId, ArkanoidPalette> = {
  classic: {
    bg: "#000",
    hud: "#fff",
    overlayBg: "rgba(0, 0, 0, 0.6)",
    overlayText: "#fff",
    spriteFilter: "none",
    blockFilter: {},
    paddleGlow: "transparent",
    ballGlow: "transparent",
    glow: 0,
    hudGlow: 0,
    scanlines: null,
  },
  // Tokens del sitio (--cyan, --magenta, --yellow) sobre casi negro; sprites saturados.
  neon: {
    bg: "#07070f",
    hud: "#00f5ff",
    overlayBg: "rgba(7, 7, 15, 0.7)",
    overlayText: "#ff2d8a",
    spriteFilter: "saturate(1.6) brightness(1.4)",
    // El bloque gris es muy oscuro en el sprite: se aclara más para llegar a ≥3:1.
    blockFilter: { gray: "saturate(1.6) brightness(2)" },
    paddleGlow: "#00f5ff",
    ballGlow: "#f5ff00",
    glow: 12,
    hudGlow: 6,
    scanlines: null,
  },
  // CRT ámbar cálido: sprites apagados (sepia parcial, conservan su tono) + scanlines.
  retro: {
    bg: "#1a1208",
    hud: "#ffb000",
    overlayBg: "rgba(26, 18, 8, 0.7)",
    overlayText: "#ffb000",
    spriteFilter: "sepia(0.4) saturate(0.8) brightness(1.2)",
    blockFilter: { gray: "sepia(0.4) saturate(0.8) brightness(1.8)" },
    paddleGlow: "transparent",
    ballGlow: "transparent",
    glow: 0,
    hudGlow: 0,
    scanlines: "rgba(0, 0, 0, 0.18)",
  },
};
