import {
  ASSETS,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  H,
  LEVELS,
  LIVES,
  PADDLE_SPEED,
  POINTS_PER_BLOCK,
  SPRITES,
  W,
} from "./constants";
import {
  Ball,
  Block,
  Explosion,
  Paddle,
  drawSkinnedSprite,
  overlaps,
} from "./entities";
import { SKINS } from "./skins";
import {
  DEFAULT_SKIN,
  type GameCallbacks,
  type GameEngine,
  type GameOptions,
} from "../types";
// Arkanoid siempre informa vidas y nivel.
interface ArkanoidSnapshot {
  score: number;
  lives: number; // 0..3
  level: number; // 1..5
  paused: boolean;
}
type Status = "playing" | "gameover" | "win";
// Teclas cuyo comportamiento por defecto (scroll) se bloquea.
const PREVENT_DEFAULT = new Set(["ArrowLeft", "ArrowRight"]);
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}
export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
): GameEngine {
  // Skin fijo durante la vida del motor (GameCanvas remonta con key={skin}).
  const palette = SKINS[options?.skin ?? DEFAULT_SKIN];
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Assets ──────────────────────────────────────────────────────────────────
  // Hasta que carga el spritesheet no se simula ni se dibujan sprites.
  const sheet = new Image();
  let sheetReady = false;
  sheet.onload = () => {
    sheetReady = true;
  };
  sheet.src = ASSETS.spritesheet;
  const bounceSound = new Audio(ASSETS.bounce);
  const breakSound = new Audio(ASSETS.break);
  const activeSounds = new Set<HTMLAudioElement>();
  // Clon por efecto para que se solapen, como el original.
  function playSound(base: HTMLAudioElement) {
    const sound = base.cloneNode() as HTMLAudioElement;
    activeSounds.add(sound);
    sound.addEventListener("ended", () => activeSounds.delete(sound));
    // El navegador puede bloquear el audio antes de un gesto del usuario.
    sound.play().catch(() => activeSounds.delete(sound));
  }
  function stopSounds() {
    for (const sound of activeSounds) sound.pause();
    activeSounds.clear();
  }
  // ── Input ───────────────────────────────────────────────────────────────────
  const keys = { ArrowLeft: false, ArrowRight: false };
  function onKeyDown(e: KeyboardEvent) {
    // Escribir en un campo (p. ej. el input del modal) no afecta al juego.
    if (isEditable(e.target)) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    const isPauseKey = e.code === "KeyP" || e.code === "Escape";
    if (isPauseKey) {
      if (!e.repeat && status === "playing") togglePause();
      return;
    }
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = false;
  }
  function onMouseMove(e: MouseEvent) {
    if (paused || status !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) * W) / rect.width;
    paddle.moveTo(mouseX - paddle.w / 2);
  }
  function clearInput() {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  }
  // Autopausa al ocultar la pestaña; reanudar es siempre manual.
  function onVisibilityChange() {
    if (document.hidden) pause();
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onMouseMove);
  document.addEventListener("visibilitychange", onVisibilityChange);
  // ── Estado del juego ────────────────────────────────────────────────────────
  let paddle = new Paddle();
  const ball = new Ball();
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = LIVES;
  let level = 1;
  let status: Status = "playing";
  let paused = false;
  // Pelota sobre la paleta con la velocidad del nivel actual.
  function initBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }
  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map(
      (b) =>
        new Block(
          BLOCKS_ORIGIN_X + b.col * BLOCK_W,
          BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
          BLOCK_W,
          BLOCK_H,
          b.color,
        ),
    );
    explosions = [];
    initBall();
  }
  function initGame() {
    stopSounds();
    paddle = new Paddle();
    score = 0;
    lives = LIVES;
    status = "playing";
    loadLevel(1);
  }
  // Única vía al fin de partida: garantiza un solo onGameOver por partida.
  function gameOver(final: "gameover" | "win" = "gameover") {
    if (status !== "playing") return;
    status = final;
    callbacks.onGameOver(score);
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (status !== "playing") return;
    // Paleta
    if (keys.ArrowLeft) paddle.moveTo(paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight) paddle.moveTo(paddle.x + PADDLE_SPEED * dt);
    // Pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Rebote en paredes (izquierda, derecha, techo)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playSound(bounceSound);
    }
    // Rebote en la paleta
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      playSound(bounceSound);
    }
    // Bloques: uno por frame
    for (const block of blocks) {
      if (!block.alive || !overlaps(ball, block)) continue;
      block.alive = false;
      explosions.push(
        new Explosion(block.x, block.y, block.w, block.h, block.color),
      );
      score += POINTS_PER_BLOCK;
      ball.vy = -ball.vy;
      playSound(breakSound);
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) loadLevel(level + 1);
        else gameOver("win");
      }
      break;
    }
    // Explosiones
    explosions.forEach((e) => e.update(dt));
    explosions = explosions.filter((e) => !e.done);
    // Pelota perdida
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        gameOver();
      } else {
        initBall();
      }
    }
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  // Glow del texto (solo si el skin lo usa); se resetea tras cada dibujo.
  function setTextGlow(color: string) {
    if (palette.hudGlow === 0) return;
    ctx.shadowColor = color;
    ctx.shadowBlur = palette.hudGlow;
  }
  function clearGlow() {
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
  function drawHUD() {
    ctx.fillStyle = palette.hud;
    setTextGlow(palette.hud);
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Score: ${score}`, 10, 10);
    ctx.textAlign = "center";
    ctx.fillText(`Nivel: ${level}`, W / 2, 10);
    clearGlow();
    const ballSize = 16;
    const ballSpacing = 4;
    for (let i = 0; i < lives; i++) {
      const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
      drawSkinnedSprite(
        ctx,
        sheet,
        SPRITES.ball,
        bx,
        10,
        ballSize,
        ballSize,
        palette.spriteFilter,
      );
    }
  }
  function drawOverlay(message: string) {
    ctx.fillStyle = palette.overlayBg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = palette.overlayText;
    setTextGlow(palette.overlayText);
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, W / 2, H / 2);
    clearGlow();
  }
  // Scanlines CRT (solo retro): 1 px oscuro cada 4 px.
  function drawScanlines() {
    if (!palette.scanlines) return;
    ctx.fillStyle = palette.scanlines;
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  }
  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    if (!sheetReady) return;
    blocks.forEach((b) => b.alive && b.draw(ctx, sheet, palette));
    explosions.forEach((e) => e.draw(ctx, sheet, palette));
    paddle.draw(ctx, sheet, palette);
    ball.draw(ctx, sheet, palette);
    if (status === "playing") drawHUD();
    if (status === "gameover") drawOverlay("GAME OVER");
    if (status === "win") drawOverlay("¡Completaste el juego!");
    drawScanlines();
  }
  // ── Notificación a React ────────────────────────────────────────────────────
  // Solo se emite si algún campo cambió respecto al último snapshot: nunca por frame.
  let lastSnapshot: ArkanoidSnapshot | null = null;
  function emitStateIfChanged() {
    const next: ArkanoidSnapshot = { score, lives, level, paused };
    if (
      lastSnapshot &&
      lastSnapshot.score === next.score &&
      lastSnapshot.lives === next.lives &&
      lastSnapshot.level === next.level &&
      lastSnapshot.paused === next.paused
    )
      return;
    lastSnapshot = next;
    callbacks.onStateChange(next);
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
    stopSounds();
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
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sheet.onload = null;
      stopSounds();
    },
  };
}
