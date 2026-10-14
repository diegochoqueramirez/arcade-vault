import type { SkinId } from "../types";
// Todos los colores que dibuja Frogger (primitivas canvas, sin sprites).
// `classic` = colores originales del motor, idénticos.
export interface FroggerPalette {
  road: string;
  roadLine: string;
  river: string;
  safe: string;
  goalRow: string; // fila de metas (bajo el HUD)
  goalSlot: string;
  goalBorder: string;
  cars: string[]; // uno por carril (row % length)
  wheel: string;
  truck: string;
  truckCab: string;
  log: string;
  logLine: string;
  turtle: string;
  turtleScale: string;
  turtleSubmerged: string;
  frog: string;
  frogDark: string;
  eyeWhite: string;
  eyePupil: string;
  hudText: string;
  life: string;
  timeOk: string;
  timeWarn: string;
  timeLow: string;
  overlayBg: string;
  overlayText: string;
  glow: number; // shadowBlur de rana y vehículos (0 = sin glow)
  hudGlow: number; // shadowBlur del texto del HUD / overlay
}
// Contraste WCAG medido frente a la zona de fondo (ver references/game-with-themes.md).
export const SKINS: Record<SkinId, FroggerPalette> = {
  classic: {
    road: "#0a0a0a",
    roadLine: "#3a3a3a",
    river: "#06204a",
    safe: "#0d3a14",
    goalRow: "#2f7a2f",
    goalSlot: "#0b2a0e",
    goalBorder: "#ffc94a",
    cars: ["#ff3b3b", "#ffd800", "#3b8bff"],
    wheel: "#111",
    truck: "#9a9a9a",
    truckCab: "#d0d0d0",
    log: "#8a5a2b",
    logLine: "#5c3a1a",
    turtle: "#2fae4a",
    turtleScale: "#1b6e2c",
    turtleSubmerged: "rgba(47,174,74,0.35)",
    frog: "#39ff6a",
    frogDark: "#1a9a3a",
    eyeWhite: "#fff",
    eyePupil: "#000",
    hudText: "#fff",
    life: "#39ff6a",
    timeOk: "#39ff6a",
    timeWarn: "#ffd800",
    timeLow: "#ff3b3b",
    overlayBg: "rgba(0,0,0,0.6)",
    overlayText: "#fff",
    glow: 0,
    hudGlow: 0,
  },
  // Tokens del sitio (--cyan, --magenta, --yellow, --green) sobre zonas casi negras.
  neon: {
    road: "#07070f",
    roadLine: "#2a2a4a",
    river: "#050b1a",
    safe: "#0d0614",
    goalRow: "#0d0d1a",
    goalSlot: "#03030a",
    goalBorder: "#f5ff00",
    cars: ["#ff2d8a", "#f5ff00", "#00f5ff"],
    wheel: "#1a1a2e",
    truck: "#b06bff",
    truckCab: "#e0c8ff",
    log: "#ff8a3d",
    logLine: "#7a3a10",
    turtle: "#ff2d8a",
    turtleScale: "#7a0a3e",
    turtleSubmerged: "rgba(255,45,138,0.35)",
    frog: "#00ff88",
    frogDark: "#00a85a",
    eyeWhite: "#fff",
    eyePupil: "#07070f",
    hudText: "#00f5ff",
    life: "#00ff88",
    timeOk: "#00ff88",
    timeWarn: "#f5ff00",
    timeLow: "#ff2d8a",
    overlayBg: "rgba(0,0,0,0.6)",
    overlayText: "#ff2d8a",
    glow: 12,
    hudGlow: 6,
  },
  // 8 bits apagada sobre fondos oscuros cálidos/verdosos; sin glow.
  retro: {
    road: "#16120c",
    roadLine: "#3a3226",
    river: "#0f1a1c",
    safe: "#1a2010",
    goalRow: "#2a3418",
    goalSlot: "#121608",
    goalBorder: "#d8b048",
    cars: ["#d0614a", "#d8b048", "#6a9ad0"],
    wheel: "#0c0a06",
    truck: "#a89c84",
    truckCab: "#d8ccb0",
    log: "#a8743c",
    logLine: "#5a3a1a",
    turtle: "#5fb0a0",
    turtleScale: "#2e6a60",
    turtleSubmerged: "rgba(95,176,160,0.35)",
    frog: "#c8ec80",
    frogDark: "#6a8a30",
    eyeWhite: "#f0e6c8",
    eyePupil: "#16120c",
    hudText: "#f0e6c8",
    life: "#c8ec80",
    timeOk: "#c8ec80",
    timeWarn: "#d8b048",
    timeLow: "#d0614a",
    overlayBg: "rgba(0,0,0,0.6)",
    overlayText: "#f0e6c8",
    glow: 0,
    hudGlow: 0,
  },
};
