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
  // Fondo estático (SPEC 10, P4): fondo, tablero vacío con rejilla y borde, etiquetas,
  // marco de NEXT y CONTROLS se pintan una sola vez en un canvas offscreen y cada frame
  // se copian con un drawImage. Los bloques nunca se solapan con rejilla ni bordes.
  const NEXT_Y = 226;
  const background = renderBackground();
  function renderBackground(): HTMLCanvasElement {
    const bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    const c = bg.getContext("2d");
    if (!c) throw new Error("Canvas 2D no disponible");
    c.fillStyle = THEME.bg;
    c.fillRect(0, 0, W, H);
    paintBoardFrame(c);
    c.textAlign = "left";
    c.textBaseline = "top";
    paintLabel(c, "SCORE", 4);
    paintLabel(c, "LINES", 72);
    paintLabel(c, "LEVEL", 140);
    paintLabel(c, "NEXT", 208);
    paintNextFrame(c, NEXT_Y);
    paintLabel(c, "CONTROLS", 368);
    paintControls(c, 386);
    return bg;
  }
  function paintBoardFrame(c: CanvasRenderingContext2D) {
    c.save();
    c.translate(BOARD_X, BOARD_Y);
    c.fillStyle = THEME.canvasBg;
    c.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
    c.strokeStyle = THEME.gridLine;
    c.lineWidth = 0.5;
    for (let col = 1; col < COLS; col++) {
      c.beginPath();
      c.moveTo(col * BLOCK, 0);
      c.lineTo(col * BLOCK, ROWS * BLOCK);
      c.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      c.beginPath();
      c.moveTo(0, r * BLOCK);
      c.lineTo(COLS * BLOCK, r * BLOCK);
      c.stroke();
    }
    c.strokeStyle = THEME.border;
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, COLS * BLOCK - 1, ROWS * BLOCK - 1);
    c.restore();
  }
  function paintLabel(c: CanvasRenderingContext2D, text: string, y: number) {
    c.font = `600 10px ${FONT_SANS}`;
    c.letterSpacing = "2px";
    c.fillStyle = THEME.label;
    c.fillText(text, PANEL_X, y);
    c.letterSpacing = "0px";
  }
  function paintNextFrame(c: CanvasRenderingContext2D, y: number) {
    c.fillStyle = THEME.canvasBg;
    c.fillRect(PANEL_X, y, NEXT_SIZE, NEXT_SIZE);
    c.strokeStyle = THEME.border;
    c.lineWidth = 1;
    c.strokeRect(PANEL_X + 0.5, y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);
  }
  function paintControls(c: CanvasRenderingContext2D, y: number) {
    c.textBaseline = "middle";
    CONTROLS.forEach(([keys, action], i) => {
      const cy = y + i * 24 + 9;
      let x = PANEL_X;
      c.font = `11px ${FONT_SANS}`;
      for (const key of keys) {
        const w = c.measureText(key).width + 14;
        c.fillStyle = THEME.kbdBg;
        c.strokeStyle = THEME.kbdBorder;
        c.beginPath();
        c.roundRect(x + 0.5, cy - 8.5, w, 17, 3);
        c.fill();
        c.stroke();
        c.fillStyle = THEME.kbdText;
        c.fillText(key, x + 7, cy + 1);
        x += w + 4;
      }
      c.font = `12px ${FONT_SANS}`;
      c.fillStyle = THEME.controlsText;
      c.fillText(action, x, cy + 1);
    });
    c.textBaseline = "top";
  }
  function drawBoard() {
    ctx.save();
    ctx.translate(BOARD_X, BOARD_Y);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);
    // En gameover la pieza que no cabe no se dibuja (el original congelaba el frame previo).
    if (status === "playing") {
      const gy = ghostY();
      current.forEachCell((x, y, v) => drawBlock(ctx, x, y, v, BLOCK, 0.2), gy);
      current.forEachCell((x, y, v) => drawBlock(ctx, x, y, v, BLOCK));
    }
    ctx.restore();
  }
  function drawValue(text: string, y: number) {
    ctx.font = `700 26px ${FONT_MONO}`;
    ctx.letterSpacing = "1px";
    ctx.fillStyle = THEME.value;
    ctx.fillText(text, PANEL_X, y);
    ctx.letterSpacing = "0px";
  }
  function drawNext(y: number) {
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
  // Panel lateral del original (SCORE, LINES, LEVEL, NEXT, CONTROLS): etiquetas, marco de
  // NEXT y controles van en el fondo; aquí solo se pinta lo que cambia.
  function drawPanel() {
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    drawValue(score.toLocaleString("es-ES"), 22);
    drawValue(String(lines), 90);
    drawValue(String(level), 158);
    drawNext(NEXT_Y);
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
    ctx.drawImage(background, 0, 0);
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
