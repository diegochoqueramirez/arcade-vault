import type { SkinId } from "../types";
// Todos los colores que dibuja Snake. `classic` = colores originales, idénticos.
export interface SnakePalette {
  background: string; // tablero
  checker: string; // casillas alternas
  hudBar: string;
  hudLine: string; // línea inferior del HUD
  hudText: string; // Score / Nivel / Longitud
  head: string;
  body: string;
  eye: string;
  overlayBg: string; // velo de GAME OVER
  overlayText: string;
  segmentRadius: number; // redondeo de los segmentos (solo visual)
  glow: number; // shadowBlur de la serpiente (0 = sin glow)
  hudGlow: number; // shadowBlur del texto del HUD / overlay
  fruitFilter: string; // ctx.filter del sprite de fruta ("none" = original)
}
// Contraste WCAG medido frente a `background` / `hudBar` (ver references/game-with-themes.md).
export const SKINS: Record<SkinId, SnakePalette> = {
  classic: {
    background: "#0a0a18",
    checker: "rgba(255, 255, 255, 0.025)",
    hudBar: "#05050d",
    hudLine: "rgba(0, 255, 136, 0.35)",
    hudText: "#fff",
    head: "#00ff88",
    body: "#00c46a",
    eye: "#0a0a18",
    overlayBg: "rgba(0, 0, 0, 0.6)",
    overlayText: "#fff",
    segmentRadius: 8,
    glow: 0,
    hudGlow: 0,
    fruitFilter: "none",
  },
  // Tokens del sitio (--cyan, --magenta, --yellow, --green) sobre casi negro.
  neon: {
    background: "#07070f",
    checker: "rgba(0, 245, 255, 0.04)",
    hudBar: "#03030a",
    hudLine: "rgba(255, 45, 138, 0.7)",
    hudText: "#00f5ff",
    head: "#f5ff00",
    body: "#00ff88",
    eye: "#07070f",
    overlayBg: "rgba(0, 0, 0, 0.6)",
    overlayText: "#ff2d8a",
    segmentRadius: 8,
    glow: 12,
    hudGlow: 6,
    fruitFilter: "saturate(1.6) contrast(1.15)",
  },
  // Monitor de fósforo ámbar: un tono en varios brillos, sin glow, segmentos cuadrados.
  retro: {
    background: "#1a1206",
    checker: "rgba(255, 176, 0, 0.04)",
    hudBar: "#120c03",
    hudLine: "rgba(255, 176, 0, 0.45)",
    hudText: "#ffb000",
    head: "#ffd27a",
    body: "#d9901a",
    eye: "#1a1206",
    overlayBg: "rgba(0, 0, 0, 0.6)",
    overlayText: "#ffd27a",
    segmentRadius: 2,
    glow: 0,
    hudGlow: 0,
    fruitFilter: "sepia(1) saturate(1.8) brightness(1.1)",
  },
};
