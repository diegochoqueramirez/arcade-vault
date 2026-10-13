import type { GameCallbacks, GameEngine, GameSnapshot } from "../types";
import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLS,
  FONT_MONO,
  FONT_SANS,
  H,
  KICKS,
  LINE_SCORES,
  NEXT_SIZE,
  PANEL_X,
  ROWS,
  THEME,
  W,
} from "./constants";
import {
  type Piece,
  type Shape,
  drawBlock,
  randomPiece,
  rotateCW,
} from "./entities";
type Status = "playing" | "gameover";
type Board = number[][];
// Teclas cuyo comportamiento por defecto (scroll) se bloquea.
const PREVENT_DEFAULT = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);
const CONTROLS: [string[], string][] = [
  [["←", "→"], "mover"],
  [["↑"], "rotar"],
  [["↓"], "bajar"],
  [["Space"], "caída"],
  [["P"], "pausa"],
];
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}
function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}
export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Estado del juego ────────────────────────────────────────────────────────
  let board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = 1000; // ms
  let dropAccum = 0; // ms
  let status: Status = "playing";
  let paused = false;
  function collide(shape: Shape, ox: number, oy: number) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }
  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }
  function merge() {
    current.forEachCell((x, y, v) => {
      board[y][x] = v;
    });
  }
  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] ?? 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }
  function ghostY() {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }
  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }
  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }
  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }
  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) gameOver();
  }
  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropAccum = 0;
    status = "playing";
    next = randomPiece();
    spawn();
  }
  // Única vía a "gameover": garantiza un solo onGameOver por partida.
  function gameOver() {
    if (status === "gameover") return;
    status = "gameover";
    callbacks.onGameOver(score);
  }
  // ── Input ───────────────────────────────────────────────────────────────────
  // Una acción por keydown (incluye autorrepetición), como el original: no hay
  // mapa de teclas pulsadas, así que pausar/reanudar no deja input pendiente.
  function onKeyDown(e: KeyboardEvent) {
    // Escribir en un campo (p. ej. el input del modal) no afecta al juego.
    if (isEditable(e.target)) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    const isPauseKey = e.code === "KeyP" || e.code === "Escape";
    if (isPauseKey) {
      if (!e.repeat && status !== "gameover") togglePause();
      return;
    }
    if (paused || status === "gameover") return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
    emitStateIfChanged();
  }
  // Autopausa al ocultar la pestaña; reanudar es siempre manual.
  function onVisibilityChange() {
    if (document.hidden) pause();
  }
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (status === "gameover") return;
    dropAccum += dt * 1000;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawGrid() {
    ctx.strokeStyle = THEME.gridLine;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }
  function drawBoard() {
    ctx.save();
    ctx.translate(BOARD_X, BOARD_Y);
    ctx.fillStyle = THEME.canvasBg;
    ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
    drawGrid();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);
    // En gameover la pieza que no cabe no se dibuja (el original congelaba el frame previo).
    if (status === "playing") {
      const gy = ghostY();
      current.forEachCell((x, y, v) => drawBlock(ctx, x, y, v, BLOCK, 0.2), gy);
      current.forEachCell((x, y, v) => drawBlock(ctx, x, y, v, BLOCK));
    }
    ctx.strokeStyle = THEME.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, COLS * BLOCK - 1, ROWS * BLOCK - 1);
    ctx.restore();
  }
  function drawLabel(text: string, y: number) {
    ctx.font = `600 10px ${FONT_SANS}`;
    ctx.letterSpacing = "2px";
    ctx.fillStyle = THEME.label;
    ctx.fillText(text, PANEL_X, y);
    ctx.letterSpacing = "0px";
  }
  function drawValue(text: string, y: number) {
    ctx.font = `700 26px ${FONT_MONO}`;
    ctx.letterSpacing = "1px";
    ctx.fillStyle = THEME.value;
    ctx.fillText(text, PANEL_X, y);
    ctx.letterSpacing = "0px";
  }
  function drawNext(y: number) {
    ctx.fillStyle = THEME.canvasBg;
    ctx.fillRect(PANEL_X, y, NEXT_SIZE, NEXT_SIZE);
    ctx.strokeStyle = THEME.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(PANEL_X + 0.5, y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    ctx.save();
    ctx.translate(PANEL_X, y);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(ctx, offX + c, offY + r, shape[r][c], 30);
    ctx.restore();
  }
  function drawControls(y: number) {
    ctx.textBaseline = "middle";
    CONTROLS.forEach(([keys, action], i) => {
      const cy = y + i * 24 + 9;
      let x = PANEL_X;
      ctx.font = `11px ${FONT_SANS}`;
      for (const key of keys) {
        const w = ctx.measureText(key).width + 14;
        ctx.fillStyle = THEME.kbdBg;
        ctx.strokeStyle = THEME.kbdBorder;
        ctx.beginPath();
        ctx.roundRect(x + 0.5, cy - 8.5, w, 17, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = THEME.kbdText;
        ctx.fillText(key, x + 7, cy + 1);
        x += w + 4;
      }
      ctx.font = `12px ${FONT_SANS}`;
      ctx.fillStyle = THEME.controlsText;
      ctx.fillText(action, x, cy + 1);
    });
    ctx.textBaseline = "top";
  }
  // Panel lateral del original (SCORE, LINES, LEVEL, NEXT, CONTROLS), dibujado en el canvas.
  function drawPanel() {
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    drawLabel("SCORE", 4);
    drawValue(score.toLocaleString("es-ES"), 22);
    drawLabel("LINES", 72);
    drawValue(String(lines), 90);
    drawLabel("LEVEL", 140);
    drawValue(String(level), 158);
    drawLabel("NEXT", 208);
    drawNext(226);
    drawLabel("CONTROLS", 368);
    drawControls(386);
  }
  function drawGameOver() {
    // Velo con desenfoque, como el backdrop-filter del overlay original.
    ctx.filter = "blur(4px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
    ctx.fillStyle = THEME.overlayBg;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 28px ${FONT_SANS}`;
    ctx.letterSpacing = "4px";
    ctx.fillStyle = THEME.gameOver;
    ctx.fillText("GAME OVER", W / 2, H / 2 - 14);
    ctx.letterSpacing = "0px";
    ctx.font = `14px ${FONT_MONO}`;
    ctx.fillStyle = THEME.value;
    ctx.fillText(
      `Puntuación: ${score.toLocaleString("es-ES")}`,
      W / 2,
      H / 2 + 20,
    );
  }
  function draw() {
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, W, H);
    drawBoard();
    drawPanel();
    if (status === "gameover") drawGameOver();
  }
  // ── Notificación a React ────────────────────────────────────────────────────
  // Solo se emite si algún campo cambió respecto al último snapshot: nunca por frame.
  let last: {
    score: number;
    level: number;
    lines: number;
    paused: boolean;
  } | null = null;
  function emitStateIfChanged() {
    if (
      last &&
      last.score === score &&
      last.level === level &&
      last.lines === lines &&
      last.paused === paused
    )
      return;
    last = { score, level, lines, paused };
    const snapshot: GameSnapshot = {
      score,
      level,
      paused,
      extra: [{ label: "Líneas", value: String(lines) }],
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
      update(dt);
      draw();
    }
    emitStateIfChanged();
    rafId = requestAnimationFrame(loop);
  }
  // ── Pausa ───────────────────────────────────────────────────────────────────
  function pause() {
    paused = true;
    emitStateIfChanged();
  }
  function resume() {
    paused = false;
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
    gameOver();
    emitStateIfChanged();
  }
  function restart() {
    paused = false;
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
    },
  };
}
