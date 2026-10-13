import type { SkinId } from "../types";
// Todos los colores que dibuja Asteroids. `classic` = colores originales, idénticos.
export interface AsteroidsPalette {
  bg: string; // fondo del canvas
  ship: string;
  thrust: string; // llama del propulsor
  bullet: string;
  asteroid: string;
  powerUp: string; // rombo + texto "3x"
  particle: string; // la opacidad la anima el motor (globalAlpha)
  hud: string; // SCORE / NIVEL
  hudAccent: string; // contador de triple disparo
  lifeIcon: string;
  overlayTitle: string; // GAME OVER
  overlaySub: string;
  glow: number; // shadowBlur de entidades (0 = sin glow)
  hudGlow: number; // shadowBlur del texto del HUD / overlay
}
// Contraste WCAG medido frente a `bg` (ver references/game-with-themes.md).
export const SKINS: Record<SkinId, AsteroidsPalette> = {
  classic: {
    bg: "#000",
    ship: "#fff",
    thrust: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    asteroid: "#fff",
    powerUp: "#0ff",
    particle: "#fff",
    hud: "#fff",
    hudAccent: "#0ff",
    lifeIcon: "#fff",
    overlayTitle: "#fff",
    overlaySub: "rgba(255,255,255,0.65)",
    glow: 0,
    hudGlow: 0,
  },
  // Tokens del sitio (--cyan, --magenta, --yellow, --green) sobre casi negro.
  neon: {
    bg: "#07070f",
    ship: "#00f5ff",
    thrust: "rgba(245, 255, 0, 0.9)",
    bullet: "#f5ff00",
    asteroid: "#ff2d8a",
    powerUp: "#00ff88",
    particle: "#ff7ab8",
    hud: "#00f5ff",
    hudAccent: "#00ff88",
    lifeIcon: "#00f5ff",
    overlayTitle: "#ff2d8a",
    overlaySub: "rgba(230, 233, 255, 0.72)",
    glow: 12,
    hudGlow: 6,
  },
  // Monitor de fósforo verde: un solo tono en varios brillos, sin glow.
  retro: {
    bg: "#0b140c",
    ship: "#b4ff9e",
    thrust: "rgba(140, 255, 122, 0.7)",
    bullet: "#e6ffde",
    asteroid: "#4fcf4a",
    powerUp: "#d8ffcc",
    particle: "#4fcf4a",
    hud: "#8cff7a",
    hudAccent: "#d8ffcc",
    lifeIcon: "#8cff7a",
    overlayTitle: "#8cff7a",
    overlaySub: "#5cbf55",
    glow: 0,
    hudGlow: 0,
  },
};
