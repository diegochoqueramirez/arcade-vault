import {
  ASSETS,
  BASE_STEP_MS,
  CELL,
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
  type Sprite,
  START_DIR,
  STEP_MS_PER_LEVEL,
  W,
} from "./constants";
import {
  FRUIT_SIZE,
  Fruit,
  SEGMENT_SIZE,
  Snake,
  sameCell,
  spriteBox,
} from "./entities";
import { SKINS } from "./skins";
import {
  DEFAULT_SKIN,
  type GameCallbacks,
  type GameEngine,
  type GameOptions,
  type GameSnapshot,
} from "../types";
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
  options?: GameOptions,
): GameEngine {
  // Skin fija durante la vida del motor (GameCanvas remonta al cambiarla).
  const palette = SKINS[options?.skin ?? DEFAULT_SKIN];
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
  // Lienzo offscreen; con `pad`, origen trasladado para que la forma empiece en (0, 0)
  // y quede margen alrededor para el glow.
  function makeCanvas(w: number, h: number, pad = 0) {
    const s = document.createElement("canvas");
    s.width = Math.ceil(w) + pad * 2;
    s.height = Math.ceil(h) + pad * 2;
    const c = s.getContext("2d");
    if (!c) throw new Error("Canvas 2D no disponible");
    c.translate(pad, pad);
    return { s, c };
  }
  // Tablero estático (fondo + casillas alternas) pintado una vez por motor con la paleta
  // del skin; cada frame solo se copia (SPEC 10).
  const board = renderBoard();
  function renderBoard() {
    const { s, c } = makeCanvas(W, H);
    c.fillStyle = palette.background;
    c.fillRect(0, 0, W, H);
    c.fillStyle = palette.checker;
    for (let row = 0; row < ROWS; row++)
      for (let col = row % 2; col < COLS; col += 2)
        c.fillRect(col * CELL, HUD_H + row * CELL, CELL, CELL);
    return s;
  }
  function drawBoard() {
    ctx.drawImage(board, 0, 0);
  }
  // Sprites pre-renderizados (SPEC 10): segmentos con glow y texto del HUD se pintan una
  // vez en canvas offscreen y se copian con drawImage; 0 shadowBlur por frame.
  // Margen alrededor de la forma para que el glow no se recorte.
  const PAD = Math.ceil(Math.max(palette.glow, palette.hudGlow) * 1.5) + 2;
  const segments = new Map<boolean, HTMLCanvasElement>();
  function segment(isHead: boolean) {
    let s = segments.get(isHead);
    if (!s) {
      const made = makeCanvas(SEGMENT_SIZE, SEGMENT_SIZE, PAD);
      const c = made.c;
      const color = isHead ? palette.head : palette.body;
      c.fillStyle = color;
      c.shadowColor = color;
      c.shadowBlur = palette.glow;
      c.beginPath();
      c.roundRect(0, 0, SEGMENT_SIZE, SEGMENT_SIZE, palette.segmentRadius);
      c.fill();
      c.shadowBlur = 0;
      s = made.s;
      segments.set(isHead, s);
    }
    return s;
  }
  // Fruta escalada y tintada con el filtro de la skin una sola vez por recorte. El sprite
  // incluye la fracción subpíxel de la caja (igual en toda celda: CELL es entero), así que
  // copiarlo en (floor(x), floor(y)) reproduce el dibujo original.
  const fruitSprites = new Map<Sprite, HTMLCanvasElement>();
  function fruitSprite(sp: Sprite) {
    let s = fruitSprites.get(sp);
    if (!s) {
      const { x, y, w, h } = spriteBox(sp, { col: 0, row: 0 }, FRUIT_SIZE);
      const fx = x - Math.floor(x);
      const fy = y - Math.floor(y);
      const made = makeCanvas(fx + w, fy + h);
      made.c.filter = palette.fruitFilter;
      made.c.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, fx, fy, w, h);
      made.c.filter = "none";
      s = made.s;
      fruitSprites.set(sp, s);
    }
    return s;
  }
  // HUD (barra, línea y texto con glow) en un canvas fuera del Map: se repinta solo
  // cuando cambian score, nivel o longitud.
  let hudKey = "";
  let hudSprite: HTMLCanvasElement | null = null;
  function hudImage() {
    const key = `${score}|${level}|${snake.length}`;
    if (!hudSprite || key !== hudKey) {
      const { s, c } = makeCanvas(W, HUD_H, PAD);
      c.fillStyle = palette.hudBar;
      c.fillRect(0, 0, W, HUD_H);
      c.fillStyle = palette.hudLine;
      c.fillRect(0, HUD_H - 1, W, 1);
      c.fillStyle = palette.hudText;
      c.shadowColor = palette.hudText;
      c.shadowBlur = palette.hudGlow;
      c.font = "bold 18px monospace";
      c.textBaseline = "middle";
      c.textAlign = "left";
      c.fillText(`Score: ${score}`, 10, HUD_H / 2);
      c.textAlign = "center";
      c.fillText(`Nivel: ${level}`, W / 2, HUD_H / 2);
      c.textAlign = "right";
      c.fillText(`Longitud: ${snake.length}`, W - 10, HUD_H / 2);
      c.shadowBlur = 0;
      hudKey = key;
      hudSprite = s;
    }
    return hudSprite;
  }
  function drawHUD() {
    // El sprite empieza en (-PAD, -PAD): la barra queda en (0, 0) como antes.
    ctx.drawImage(hudImage(), -PAD, -PAD);
  }
  function drawOverlay(message: string) {
    ctx.fillStyle = palette.overlayBg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = palette.overlayText;
    ctx.shadowColor = palette.overlayText;
    ctx.shadowBlur = palette.hudGlow;
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, W / 2, H / 2);
    ctx.shadowBlur = 0;
  }
  function draw() {
    drawBoard();
    if (!sheetReady) return;
    if (fruit) fruit.draw(ctx, fruitSprite(fruit.sprite));
    snake.draw(ctx, dir, palette, segment, PAD);
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
