import {
  BASE_ROUND_MS,
  CELL,
  COLS,
  DIR_DELTA,
  type Direction,
  FRAME_MS,
  GOAL_COLS,
  GOAL_WIDTH,
  H,
  JUMP_MS,
  MIN_ROUND_MS,
  POINTS_GOAL,
  POINTS_PER_ROW,
  POINTS_PER_SECOND_LEFT,
  POINTS_ROUND,
  ROUND_MS_PER_LEVEL,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_START,
  ROWS,
  START_COL,
  START_LIVES,
  W,
} from "./constants";
import {
  buildLanes,
  type Entity,
  type Frog,
  type Lane,
  updateTurtle,
} from "./entities";
import {
  DEFAULT_SKIN,
  type GameCallbacks,
  type GameEngine,
  type GameOptions,
  type GameSnapshot,
} from "../types";
import { SKINS } from "./skins";
type Status = "playing" | "gameover";
// Teclas cuyo comportamiento por defecto (scroll) se bloquea.
const PREVENT_DEFAULT = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);
const KEY_DIR: Record<string, Direction> = {
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
function roundMs(level: number) {
  return Math.max(
    MIN_ROUND_MS,
    BASE_ROUND_MS - (level - 1) * ROUND_MS_PER_LEVEL,
  );
}
const FROG_HALF = 0.35; // media anchura del cuerpo de la rana, en celdas
const isRiverRow = (row: number) =>
  row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
const isRoadRow = (row: number) => row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
function newFrog(): Frog {
  return {
    col: START_COL,
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: START_COL,
    targetRow: ROW_START,
    facing: "up",
  };
}
export function createFroggerGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
): GameEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const palette = SKINS[options?.skin ?? DEFAULT_SKIN];
  // Glow (solo skins con glow > 0) sobre el contexto indicado (pantalla u offscreen);
  // siempre se resetea tras dibujar para que no se filtre.
  function setGlow(c: CanvasRenderingContext2D, color: string, blur: number) {
    c.shadowColor = color;
    c.shadowBlur = blur;
  }
  function clearGlow(c: CanvasRenderingContext2D) {
    c.shadowBlur = 0;
  }
  // ── Input ───────────────────────────────────────────────────────────────────
  // Un salto por pulsación (sin autorepetición); se guarda la última dirección pendiente.
  let pendingDir: Direction | null = null;
  function onKeyDown(e: KeyboardEvent) {
    // Escribir en un campo (p. ej. el input del modal) no afecta al juego.
    if (isEditable(e.target)) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    // P / Esc usan la misma pausa que el botón de la plataforma (vía snapshot).
    const isPauseKey = e.code === "KeyP" || e.code === "Escape";
    if (isPauseKey) {
      if (!e.repeat && status === "playing") togglePause();
      return;
    }
    const next = KEY_DIR[e.code];
    if (next && !e.repeat && !paused && status === "playing") pendingDir = next;
  }
  function clearInput() {
    pendingDir = null;
  }
  // Autopausa al ocultar la pestaña; reanudar es siempre manual.
  function onVisibilityChange() {
    if (document.hidden) pause();
  }
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  // ── Estado del juego ────────────────────────────────────────────────────────
  let lanes: Lane[] = buildLanes(1);
  let frog = newFrog();
  let goals: boolean[] = GOAL_COLS.map(() => false);
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let timeLeft = roundMs(1);
  // Fila más alta alcanzada en el trayecto actual (puntos solo por filas nuevas).
  let bestRow = ROW_START;
  let status: Status = "playing";
  let paused = false;
  function initGame() {
    lanes = buildLanes(1);
    frog = newFrog();
    goals = GOAL_COLS.map(() => false);
    score = 0;
    lives = START_LIVES;
    level = 1;
    timeLeft = roundMs(1);
    bestRow = ROW_START;
    status = "playing";
  }
  // Nueva rana en la fila de inicio: tras morir o tras ocupar una boca.
  function resetFrog() {
    frog = newFrog();
    bestRow = ROW_START;
    timeLeft = roundMs(level);
    clearInput();
  }
  // Única vía al fin de partida: garantiza un solo onGameOver por partida.
  function gameOver() {
    if (status !== "playing") return;
    status = "gameover";
    callbacks.onGameOver(score);
  }
  // ── Colisiones y soporte (paso 5) ───────────────────────────────────────────
  // Vehículo letal si se solapa con el cuerpo de la rana (elipse de 28 px ≈ 0.35 celdas por lado).
  function checkRoadCollision(f: Frog, ls: Lane[]): boolean {
    const left = f.col + 0.5 - FROG_HALF;
    const right = f.col + 0.5 + FROG_HALF;
    return ls.some(
      (lane) =>
        lane.row === f.row &&
        isRoadRow(lane.row) &&
        lane.entities.some((e) => left < e.col + e.width && right > e.col),
    );
  }
  // Tronco o tortuga visible bajo el centro de la rana; tortuga sumergida = sin soporte.
  function getSupport(f: Frog, ls: Lane[]): Entity | null {
    const center = f.col + 0.5;
    const lane = ls.find((l) => l.row === f.row && isRiverRow(l.row));
    const e = lane?.entities.find(
      (en) => center >= en.col && center < en.col + en.width,
    );
    if (!e || e.submerged) return null;
    return e;
  }
  // Boca libre bajo el centro de la rana: se marca y puntúa. Boca ocupada o seto → false (muerte).
  function checkGoal(f: Frog, gs: boolean[]): boolean {
    if (f.row !== ROW_GOALS) return false;
    const center = f.col + 0.5;
    const i = GOAL_COLS.findIndex(
      (c) => center >= c && center < c + GOAL_WIDTH,
    );
    if (i === -1 || gs[i]) return false;
    gs[i] = true;
    score += POINTS_GOAL + Math.floor(timeLeft / 1000) * POINTS_PER_SECOND_LEFT;
    return true;
  }
  // ── Ronda y muerte (pasos 6 y 7) ────────────────────────────────────────────
  // Las 5 bocas llenas: bonus de ronda, siguiente nivel (más rápido y menos tiempo).
  function completeRound() {
    score += POINTS_ROUND;
    goals = GOAL_COLS.map(() => false);
    level++;
    lanes = buildLanes(level);
    resetFrog();
  }
  // Resta una vida. Sin vidas: React recibe lives = 0 antes de onGameOver; la simulación se detiene
  // (el loop solo sigue dibujando el overlay GAME OVER).
  function killFrog() {
    if (status !== "playing") return;
    lives--;
    if (lives <= 0) {
      lives = 0;
      emitStateIfChanged();
      gameOver();
      return;
    }
    resetFrog();
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  // Desplazamiento en celdas de un carril para este frame.
  const laneDelta = (lane: Lane, dt: number) =>
    (lane.speed * lane.dir * (dt / FRAME_MS)) / CELL;
  function moveLanes(dt: number) {
    for (const lane of lanes) {
      const delta = laneDelta(lane, dt);
      for (const e of lane.entities) {
        e.col += delta;
        // Reintroducción por el lado opuesto, conservando la separación del carril.
        if (lane.dir === 1 && e.col >= COLS) e.col -= lane.span;
        if (lane.dir === -1 && e.col + e.width <= 0) e.col += lane.span;
        if (e.type === "turtle") updateTurtle(e, dt);
      }
    }
  }
  function startJump(dir: Direction) {
    const d = DIR_DELTA[dir];
    const targetCol = frog.col + d.col;
    const targetRow = frog.row + d.row;
    frog.facing = dir;
    // Bordes: ni salir por los laterales ni por abajo.
    if (targetCol < 0 || targetCol > COLS - 1) return;
    if (targetRow < ROW_GOALS || targetRow > ROW_START) return;
    frog.animating = true;
    frog.animT = 0;
    frog.targetCol = targetCol;
    frog.targetRow = targetRow;
  }
  // Lógica de la celda destino tras completar un salto.
  function land() {
    frog.col = frog.targetCol;
    frog.row = frog.targetRow;
    frog.animating = false;
    if (frog.row < bestRow) {
      score += (bestRow - frog.row) * POINTS_PER_ROW;
      bestRow = frog.row;
    }
    if (frog.row === ROW_GOALS) {
      if (!checkGoal(frog, goals)) killFrog();
      else if (goals.every(Boolean)) completeRound();
      else resetFrog();
      return;
    }
    if (isRoadRow(frog.row) && checkRoadCollision(frog, lanes)) killFrog();
    else if (isRiverRow(frog.row) && !getSupport(frog, lanes)) killFrog();
  }
  function update(dt: number) {
    if (status !== "playing") return;
    moveLanes(dt);
    if (!frog.animating && pendingDir) {
      startJump(pendingDir);
      pendingDir = null;
    }
    if (frog.animating) {
      frog.animT += dt;
      if (frog.animT >= JUMP_MS) land();
    } else if (isRiverRow(frog.row)) {
      // En el río la rana viaja con su soporte; sin soporte (o tortuga sumergida) muere.
      const support = getSupport(frog, lanes);
      const lane = lanes.find((l) => l.row === frog.row);
      if (!support || !lane) killFrog();
      else {
        frog.col += laneDelta(lane, dt);
        frog.targetCol = frog.col;
        // Arrastrada fuera por el borde: muerte cuando su centro sale del canvas.
        if (frog.col < -0.5 || frog.col > COLS - 0.5) killFrog();
      }
    } else if (isRoadRow(frog.row) && checkRoadCollision(frog, lanes)) {
      killFrog();
    }
    if (status !== "playing") return;
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      killFrog();
    }
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  // Fondo estático (filas por zona + líneas de carretera) pintado una sola vez por motor
  // en un canvas offscreen con la paleta del skin; cada frame solo lo copia (SPEC 10).
  const background = renderBackground();
  function renderBackground(): HTMLCanvasElement {
    const bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    const bgCtx = bg.getContext("2d");
    if (!bgCtx) throw new Error("Canvas 2D no disponible");
    for (let row = 0; row < ROWS; row++) {
      bgCtx.fillStyle =
        row === ROW_GOALS
          ? palette.goalRow
          : isRiverRow(row)
            ? palette.river
            : isRoadRow(row)
              ? palette.road
              : palette.safe;
      bgCtx.fillRect(0, row * CELL, W, CELL);
    }
    // Líneas discontinuas entre carriles de carretera.
    bgCtx.fillStyle = palette.roadLine;
    for (let row = ROW_ROAD_TOP + 1; row <= ROW_ROAD_BOT; row++)
      for (let x = 0; x < W; x += CELL)
        bgCtx.fillRect(x + 8, row * CELL - 1, 24, 2);
    return bg;
  }
  function drawBackground() {
    ctx.drawImage(background, 0, 0);
  }
  // Sprites pre-renderizados (SPEC 10, paso 8): cada forma con glow (coche, camión, rana,
  // texto del HUD) se pinta una sola vez en un canvas offscreen y cada frame solo se copia
  // con drawImage. shadowBlur deja de calcularse por frame (era el coste del skin neon).
  // Margen alrededor de la forma para que el glow no se recorte en el sprite.
  const PAD = Math.ceil(Math.max(palette.glow, palette.hudGlow) * 1.5) + 2;
  const sprites = new Map<string, HTMLCanvasElement>();
  function makeCanvas(w: number, h: number) {
    const s = document.createElement("canvas");
    s.width = Math.ceil(w) + PAD * 2;
    s.height = Math.ceil(h) + PAD * 2;
    const c = s.getContext("2d");
    if (!c) throw new Error("Canvas 2D no disponible");
    c.translate(PAD, PAD);
    return { s, c };
  }
  // Sprite cacheado por clave; paint dibuja con origen en la esquina de la forma.
  function sprite(
    key: string,
    w: number,
    h: number,
    paint: (c: CanvasRenderingContext2D) => void,
  ) {
    let cached = sprites.get(key);
    if (!cached) {
      const { s, c } = makeCanvas(w, h);
      paint(c);
      sprites.set(key, s);
      cached = s;
    }
    return cached;
  }
  function drawGoals() {
    // La mitad superior de la fila queda libre para el HUD.
    const top = 16;
    GOAL_COLS.forEach((col, i) => {
      const x = col * CELL;
      const w = GOAL_WIDTH * CELL;
      ctx.fillStyle = palette.goalSlot;
      ctx.fillRect(x, top, w, CELL - top);
      ctx.strokeStyle = palette.goalBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, top + 1, w - 2, CELL - top - 2);
      if (goals[i])
        drawFrogShape(x + w / 2, top + (CELL - top) / 2, "up", false, 0.6);
    });
  }
  function paintCar(c: CanvasRenderingContext2D, w: number, color: string) {
    c.fillStyle = palette.wheel;
    for (const wx of [8, w - 8]) {
      c.beginPath();
      c.arc(wx, 8, 5, 0, Math.PI * 2);
      c.arc(wx, CELL - 8, 5, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = color;
    setGlow(c, color, palette.glow);
    c.fillRect(3, 8, w - 6, CELL - 16);
    clearGlow(c);
  }
  function drawCar(e: Entity, lane: Lane, y: number) {
    const w = e.width * CELL;
    const color = palette.cars[lane.row % palette.cars.length];
    const s = sprite(`car:${color}:${w}`, w, CELL, (c) =>
      paintCar(c, w, color),
    );
    ctx.drawImage(s, e.col * CELL - PAD, y - PAD);
  }
  function paintTruck(c: CanvasRenderingContext2D, w: number, dir: number) {
    const cabW = 22;
    // Cabina en el frente (sentido de la marcha).
    const cabX = dir === 1 ? w - cabW - 2 : 2;
    const bodyX = dir === 1 ? 2 : cabW + 4;
    c.fillStyle = palette.truck;
    setGlow(c, palette.truck, palette.glow);
    c.fillRect(bodyX, 6, w - cabW - 6, CELL - 12);
    c.fillStyle = palette.truckCab;
    c.fillRect(cabX, 9, cabW, CELL - 18);
    clearGlow(c);
  }
  function drawTruck(e: Entity, lane: Lane, y: number) {
    const w = e.width * CELL;
    const s = sprite(`truck:${lane.dir}:${w}`, w, CELL, (c) =>
      paintTruck(c, w, lane.dir),
    );
    ctx.drawImage(s, e.col * CELL - PAD, y - PAD);
  }
  function drawLog(e: Entity, y: number) {
    const x = e.col * CELL;
    const w = e.width * CELL;
    ctx.fillStyle = palette.log;
    ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
    ctx.fillStyle = palette.logLine;
    for (let lx = x + 14; lx < x + w - 10; lx += 18)
      ctx.fillRect(lx, y + 12, 10, 2);
    ctx.fillRect(x + 6, y + CELL - 16, w - 12, 2);
  }
  function drawTurtles(e: Entity, y: number) {
    for (let i = 0; i < e.width; i++) {
      const cx = (e.col + i) * CELL + CELL / 2;
      const cy = y + CELL / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      if (e.submerged) {
        ctx.strokeStyle = palette.turtleSubmerged;
        ctx.lineWidth = 2;
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = palette.turtle;
      ctx.fill();
      // Escamas: rombo central y cuatro placas.
      ctx.fillStyle = palette.turtleScale;
      ctx.fillRect(cx - 4, cy - 4, 8, 8);
      for (const [dx, dy] of [
        [-8, -8],
        [8, -8],
        [-8, 8],
        [8, 8],
      ])
        ctx.fillRect(cx + dx - 2, cy + dy - 2, 4, 4);
    }
  }
  function drawLanes() {
    for (const lane of lanes) {
      const y = lane.row * CELL;
      for (const e of lane.entities) {
        if (e.type === "car") drawCar(e, lane, y);
        else if (e.type === "truck") drawTruck(e, lane, y);
        else if (e.type === "log") drawLog(e, y);
        else drawTurtles(e, y);
      }
    }
  }
  // Rana centrada en (cx, cy): cuerpo elipse 28×24, ojos al frente, patas extendidas al saltar.
  // Sprite de FROG_BOX × FROG_BOX px centrado (patas ≤ 21 px del centro en cualquier giro).
  const FROG_BOX = 48;
  const FROG_ANGLE: Record<Direction, number> = {
    up: 0,
    right: Math.PI / 2,
    down: Math.PI,
    left: -Math.PI / 2,
  };
  function paintFrog(
    c: CanvasRenderingContext2D,
    facing: Direction,
    jumping: boolean,
    scale: number,
  ) {
    c.translate(FROG_BOX / 2, FROG_BOX / 2);
    c.rotate(FROG_ANGLE[facing]);
    c.scale(scale, scale);
    const legReach = jumping ? 18 : 12;
    c.fillStyle = palette.frogDark;
    for (const sx of [-1, 1]) {
      c.fillRect(sx * legReach - 3, -12, 6, 8);
      c.fillRect(sx * legReach - 3, jumping ? 8 : 4, 6, 8);
    }
    c.fillStyle = palette.frog;
    setGlow(c, palette.frog, palette.glow);
    c.beginPath();
    c.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
    c.fill();
    clearGlow(c);
    for (const sx of [-6, 6]) {
      c.fillStyle = palette.eyeWhite;
      c.beginPath();
      c.arc(sx, -9, 4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = palette.eyePupil;
      c.beginPath();
      c.arc(sx, -10, 2, 0, Math.PI * 2);
      c.fill();
    }
  }
  function drawFrogShape(
    cx: number,
    cy: number,
    facing: Direction,
    jumping: boolean,
    scale = 1,
  ) {
    const s = sprite(
      `frog:${facing}:${jumping}:${scale}`,
      FROG_BOX,
      FROG_BOX,
      (c) => paintFrog(c, facing, jumping, scale),
    );
    ctx.drawImage(s, cx - FROG_BOX / 2 - PAD, cy - FROG_BOX / 2 - PAD);
  }
  function drawFrog() {
    const t = frog.animating ? Math.min(frog.animT / JUMP_MS, 1) : 0;
    const col = frog.col + (frog.targetCol - frog.col) * t;
    const row = frog.row + (frog.targetRow - frog.row) * t;
    drawFrogShape(
      col * CELL + CELL / 2,
      row * CELL + CELL / 2,
      frog.facing,
      frog.animating,
    );
  }
  // Texto del HUD con glow: se repinta solo cuando cambian score o nivel (no va al Map de
  // sprites para no acumular un canvas por puntuación).
  let hudKey = "";
  let hudSprite: HTMLCanvasElement | null = null;
  function hudText() {
    const key = `${score}|${level}`;
    if (!hudSprite || key !== hudKey) {
      const { s, c } = makeCanvas(W, 16);
      c.fillStyle = palette.hudText;
      setGlow(c, palette.hudText, palette.hudGlow);
      c.font = "bold 16px monospace";
      c.textBaseline = "top";
      c.textAlign = "left";
      c.fillText(`SCORE ${score}`, 6, 0);
      c.textAlign = "center";
      c.fillText(`NIVEL ${level}`, W / 2, 0);
      clearGlow(c);
      hudKey = key;
      hudSprite = s;
    }
    return hudSprite;
  }
  function drawHUD() {
    // El sprite empieza en (-PAD, -PAD): el texto queda en y = 0 como antes.
    ctx.drawImage(hudText(), -PAD, -PAD);
    // Vidas: un círculo verde por vida, arriba a la derecha.
    ctx.fillStyle = palette.life;
    for (let i = 0; i < lives; i++) {
      ctx.beginPath();
      ctx.arc(W - 10 - i * 16, 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Barra de tiempo al pie de la fila de inicio: verde → amarillo → rojo.
    const ratio = timeLeft / roundMs(level);
    ctx.fillStyle =
      ratio > 0.5
        ? palette.timeOk
        : ratio > 0.25
          ? palette.timeWarn
          : palette.timeLow;
    ctx.fillRect(0, H - 6, W * ratio, 6);
  }
  // Overlay GAME OVER: solo con la partida terminada; conserva el glow directo.
  function drawOverlay(message: string) {
    ctx.fillStyle = palette.overlayBg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = palette.overlayText;
    setGlow(ctx, palette.overlayText, palette.hudGlow);
    ctx.font = "bold 56px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, W / 2, H / 2);
    clearGlow(ctx);
  }
  function draw() {
    drawBackground();
    drawGoals();
    drawLanes();
    drawFrog();
    drawHUD();
    if (status === "gameover") drawOverlay("GAME OVER");
  }
  // ── Notificación a React ────────────────────────────────────────────────────
  // Solo se emite si cambia score, vidas, nivel o pausa: nunca por frame ni por segundo
  // (el tiempo restante solo se ve en la barra del canvas).
  let last: GameSnapshot | null = null;
  function emitStateIfChanged() {
    if (
      last &&
      last.score === score &&
      last.lives === lives &&
      last.level === level &&
      last.paused === paused
    )
      return;
    last = { score, lives, level, paused };
    callbacks.onStateChange(last);
  }
  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;
  function loop(ts: number) {
    // dt en ms, acotado para que una pestaña en segundo plano no teletransporte nada.
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
    lastTime = ts;
    // Pausado: se congela update() pero se sigue dibujando.
    if (!paused) update(dt);
    draw();
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
    },
  };
}
