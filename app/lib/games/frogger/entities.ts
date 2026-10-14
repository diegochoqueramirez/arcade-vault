import {
  LEVEL_SPEED_FACTOR,
  TURTLE_SUBMERGED_MS,
  TURTLE_VISIBLE_MS,
  type Direction,
} from "./constants";
// `col` es fraccionario (posición continua en celdas); `width` en celdas.
export interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  phaseMs?: number; // tortugas: posición en el ciclo visible → bajo el agua (independiente por grupo)
}
export interface Lane {
  row: number;
  speed: number; // px/frame (a FRAME_MS)
  dir: 1 | -1;
  span: number; // longitud del bucle en celdas (≥ COLS + width): separación constante al reintroducir
  entities: Entity[];
}
export interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
  facing: Direction;
}
interface LaneTemplate {
  row: number;
  speed: number; // nivel 1
  dir: 1 | -1;
  type: Entity["type"];
  width: number;
  count: number;
  spacing: number; // celdas entre inicios de entidades; hueco = spacing − width ≥ 1
}
// Carretera (filas 8–12): 1.5–4 px/frame, sentidos alternos.
// Río (filas 1–6): 1–3 px/frame, troncos 2–4, grupos de tortugas 2–3.
const LANES: LaneTemplate[] = [
  { row: 1, speed: 1, dir: -1, type: "log", width: 3, count: 4, spacing: 5 },
  { row: 2, speed: 3, dir: 1, type: "log", width: 2, count: 5, spacing: 4 },
  {
    row: 3,
    speed: 1.8,
    dir: -1,
    type: "turtle",
    width: 2,
    count: 5,
    spacing: 4,
  },
  { row: 4, speed: 2.2, dir: 1, type: "log", width: 4, count: 3, spacing: 7 },
  { row: 5, speed: 1.2, dir: 1, type: "log", width: 3, count: 4, spacing: 5 },
  {
    row: 6,
    speed: 1.5,
    dir: -1,
    type: "turtle",
    width: 3,
    count: 4,
    spacing: 5,
  },
  {
    row: 8,
    speed: 1.8,
    dir: -1,
    type: "truck",
    width: 3,
    count: 3,
    spacing: 7,
  },
  { row: 9, speed: 4, dir: 1, type: "car", width: 1, count: 2, spacing: 9 },
  { row: 10, speed: 2, dir: -1, type: "truck", width: 2, count: 3, spacing: 7 },
  { row: 11, speed: 2.5, dir: 1, type: "car", width: 1, count: 3, spacing: 6 },
  { row: 12, speed: 1.5, dir: -1, type: "car", width: 1, count: 4, spacing: 5 },
];
const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
export function buildLanes(level: number): Lane[] {
  const factor = LEVEL_SPEED_FACTOR ** (level - 1);
  return LANES.map((t) => ({
    row: t.row,
    speed: t.speed * factor,
    dir: t.dir,
    span: t.count * t.spacing,
    entities: Array.from({ length: t.count }, (_, i) =>
      t.type === "turtle"
        ? {
            col: i * t.spacing,
            width: t.width,
            type: t.type,
            submerged: false,
            // Desfase por grupo para que no se sumerjan todas a la vez.
            phaseMs: (i * 1_700 + t.row * 600) % TURTLE_CYCLE_MS,
          }
        : { col: i * t.spacing, width: t.width, type: t.type },
    ),
  }));
}
// Avanza el ciclo de una tortuga y actualiza `submerged`.
export function updateTurtle(e: Entity, dt: number): void {
  e.phaseMs = ((e.phaseMs ?? 0) + dt) % TURTLE_CYCLE_MS;
  e.submerged = e.phaseMs >= TURTLE_VISIBLE_MS;
}
