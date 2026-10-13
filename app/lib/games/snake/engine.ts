import {
  ASSETS,
  BASE_STEP_MS,
  CELL,
  COLORS,
  COLS,
  type Cell,
  type Dir,
  FRUIT_LIST,
  FRUITS_PER_LEVEL,
  H,
  HUD_H,
  MAX_QUEUED_TURNS,
  MIN_STEP_MS,
  OPPOSITE,
  POINTS_PER_FRUIT,
  ROWS,
  START_CELLS,
  START_DIR,
  STEP_MS_PER_LEVEL,
  W,
} from "./constants";
import { Fruit, Snake, sameCell } from "./entities";
import type { GameCallbacks, GameEngine, GameSnapshot } from "../types";
type Status = "playing" | "gameover" | "win";
// Teclas cuyo comportamiento por defecto (scroll) se bloquea.
const PREVENT_DEFAULT = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);
const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}
function stepMs(level: number) {
  return Math.max(MIN_STEP_MS, BASE_STEP_MS - (level - 1) * STEP_MS_PER_LEVEL);
}
export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Assets ──────────────────────────────────────────────────────────────────
  // Hasta que carga fruits.png no se simula ni se dibujan sprites.
  const sheet = new Image();
  let sheetReady = false;
  sheet.onload = () => {
    sheetReady = true;
  };
  sheet.src = ASSETS.fruits;
  // ── Input ───────────────────────────────────────────────────────────────────
  // Giros pendientes, aplicados uno por paso.
  let dirQueue: Dir[] = [];
  function queueTurn(next: Dir) {
    const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if (next === last || next === OPPOSITE[last]) return;
    if (dirQueue.length < MAX_QUEUED_TURNS) dirQueue.push(next);
  }
  function onKeyDown(e: KeyboardEvent) {
    // Escribir en un campo (p. ej. el input del modal) no afecta al juego.
    if (isEditable(e.target)) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    const isPauseKey = e.code === "KeyP" || e.code === "Escape";
    if (isPauseKey) {
      if (!e.repeat && status === "playing") togglePause();
      return;
    }
    const next = KEY_DIR[e.code];
    if (next && !paused && status === "playing") queueTurn(next);
  }
  function clearInput() {
    dirQueue = [];
  }
  // Autopausa al ocultar la pestaña; reanudar es siempre manual.
  function onVisibilityChange() {
    if (document.hidden) pause();
  }
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  // ── Estado del juego ────────────────────────────────────────────────────────
  let snake = new Snake(START_CELLS);
  let dir: Dir = START_DIR;
  let fruit: Fruit | null = null;
  let fruitsEaten = 0;
  let score = 0;
  let level = 1;
  let status: Status = "playing";
  let paused = false;
  let stepAcc = 0;
  // Fruta al azar en una celda libre; false si el tablero está lleno.
  function spawnFruit() {
    const free: Cell[] = [];
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        const cell = { col, row };
        if (!snake.hits(cell, false)) free.push(cell);
      }
    if (free.length === 0) {
      fruit = null;
      return false;
    }
    const cell = free[Math.floor(Math.random() * free.length)];
    const sprite = FRUIT_LIST[Math.floor(Math.random() * FRUIT_LIST.length)];
    fruit = new Fruit(cell, sprite);
    return true;
  }
  function initGame() {
    snake = new Snake(START_CELLS);
    dir = START_DIR;
    dirQueue = [];
    fruitsEaten = 0;
    score = 0;
    level = 1;
    stepAcc = 0;
    status = "playing";
    spawnFruit();
  }
  // Única vía al fin de partida: garantiza un solo onGameOver por partida.
  function gameOver(final: "gameover" | "win" = "gameover") {
    if (status !== "playing") return;
    status = final;
    callbacks.onGameOver(score);
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function step() {
    const turn = dirQueue.shift();
    if (turn) dir = turn;
    const next = snake.nextHead(dir);
    const grow = fruit !== null && sameCell(next, fruit.cell);
    const outside =
      next.col < 0 || next.col >= COLS || next.row < 0 || next.row >= ROWS;
    if (outside || snake.hits(next, !grow)) {
      gameOver();
      return;
    }
    snake.advance(next, grow);
    if (!grow) return;
    fruitsEaten++;
    score += POINTS_PER_FRUIT;
    level = 1 + Math.floor(fruitsEaten / FRUITS_PER_LEVEL);
    if (!spawnFruit()) gameOver("win");
  }
  function update(dt: number) {
    if (status !== "playing") return;
    stepAcc += dt * 1000;
    while (status === "playing" && stepAcc >= stepMs(level)) {
      stepAcc -= stepMs(level);
      step();
    }
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBoard() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COLORS.checker;
    for (let row = 0; row < ROWS; row++)
      for (let col = row % 2; col < COLS; col += 2)
        ctx.fillRect(col * CELL, HUD_H + row * CELL, CELL, CELL);
  }
  function drawHUD() {
    ctx.fillStyle = COLORS.hudBar;
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = COLORS.hudLine;
    ctx.fillRect(0, HUD_H - 1, W, 1);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${score}`, 10, HUD_H / 2);
    ctx.textAlign = "center";
    ctx.fillText(`Nivel: ${level}`, W / 2, HUD_H / 2);
    ctx.textAlign = "right";
    ctx.fillText(`Longitud: ${snake.length}`, W - 10, HUD_H / 2);
  }
  function drawOverlay(message: string) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, W / 2, H / 2);
  }
  function draw() {
    drawBoard();
    if (!sheetReady) return;
    fruit?.draw(ctx, sheet);
    snake.draw(ctx, dir);
    drawHUD();
    if (status === "gameover") drawOverlay("GAME OVER");
    if (status === "win") drawOverlay("¡TABLERO COMPLETO!");
  }
  // ── Notificación a React ────────────────────────────────────────────────────
  // Solo se emite si algún campo cambió respecto al último snapshot: nunca por frame.
  let last: {
    score: number;
    level: number;
    length: number;
    paused: boolean;
  } | null = null;
  function emitStateIfChanged() {
    const length = snake.length;
    if (
      last &&
      last.score === score &&
      last.level === level &&
      last.length === length &&
      last.paused === paused
    )
      return;
    last = { score, level, length, paused };
    const snapshot: GameSnapshot = {
      score,
      level,
      paused,
      extra: [{ label: "LONGITUD", value: String(length) }],
    };
    callbacks.onStateChange(snapshot);
  }
  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;
  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    // Pausado: simulación y canvas congelados (la pausa la dibuja React).
    if (!paused) {
      if (sheetReady) update(dt);
      draw();
    }
    emitStateIfChanged();
    rafId = requestAnimationFrame(loop);
  }
  // ── Pausa ───────────────────────────────────────────────────────────────────
  function pause() {
    paused = true;
    clearInput();
    emitStateIfChanged();
  }
  function resume() {
    paused = false;
    clearInput();
    emitStateIfChanged();
  }
  function togglePause() {
    if (paused) resume();
    else pause();
  }
  // ── Fin y reinicio ──────────────────────────────────────────────────────────
  function end() {
    // Se despausa para que el canvas dibuje el overlay GAME OVER.
    paused = false;
    clearInput();
    gameOver();
    emitStateIfChanged();
  }
  function restart() {
    paused = false;
    clearInput();
    initGame();
    emitStateIfChanged();
  }
  initGame();
  rafId = requestAnimationFrame(loop);
  return {
    pause,
    resume,
    togglePause,
    end,
    restart,
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sheet.onload = null;
    },
  };
}
