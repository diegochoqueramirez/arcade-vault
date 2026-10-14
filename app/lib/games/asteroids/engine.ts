import {
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  type KeyState,
  Particle,
  PowerUp,
  Ship,
  clearGlow,
  dist,
  rand,
  setGlow,
} from "./entities";
import { SKINS } from "./skins";
import { createSprites } from "./sprites";
import {
  DEFAULT_SKIN,
  type GameCallbacks,
  type GameEngine,
  type GameOptions,
} from "../types";
// Asteroids siempre informa vidas y nivel.
interface AsteroidsSnapshot {
  score: number;
  lives: number; // 0..3
  level: number; // >= 1
  paused: boolean;
}
type Status = "playing" | "dead" | "gameover";
// Teclas cuyo comportamiento por defecto (scroll) se bloquea.
const PREVENT_DEFAULT = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Space",
]);
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}
export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
): GameEngine {
  // Paleta fija durante toda la vida del motor (cambiar de skin lo recrea).
  const palette = SKINS[options?.skin ?? DEFAULT_SKIN];
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Input ───────────────────────────────────────────────────────────────────
  const keys: KeyState = {};
  const justPressed: KeyState = {};
  function onKeyDown(e: KeyboardEvent) {
    // Escribir en un campo (p. ej. el input del modal) no afecta al juego.
    if (isEditable(e.target)) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    const isPauseKey = e.code === "KeyP" || e.code === "Escape";
    if (isPauseKey && !e.repeat && status !== "gameover") {
      togglePause();
      return;
    }
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }
  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }
  function clearInput() {
    for (const code in keys) delete keys[code];
    for (const code in justPressed) delete justPressed[code];
  }
  // Autopausa al ocultar la pestaña; reanudar es siempre manual.
  function onVisibilityChange() {
    if (document.hidden) pause();
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  document.addEventListener("visibilitychange", onVisibilityChange);
  // ── Estado del juego ────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let status: Status = "playing";
  let deadTimer = 0;
  let paused = false;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    status = "playing";
    spawnAsteroids(4);
  }
  // Única vía a "gameover": garantiza un solo onGameOver por partida.
  function gameOver() {
    if (status === "gameover") return;
    status = "gameover";
    ship.dead = true;
    callbacks.onGameOver(score);
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      gameOver();
    } else {
      status = "dead";
      deadTimer = 2;
    }
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    // En gameover solo se animan las partículas; el reinicio llega por restart().
    if (status === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }
    if (status === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        status = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  // Caché de sprites con glow (SPEC 10): vive en este closure y se libera con el motor.
  const sprites = createSprites(palette);
  function drawLifeIcon(x: number, y: number) {
    sprites.shape(ctx, "life", 20, x, y, 0, palette.hudGlow, (c) => {
      c.rotate(-Math.PI / 2);
      c.strokeStyle = palette.lifeIcon;
      setGlow(c, palette.lifeIcon, palette.hudGlow);
      c.lineWidth = 1.2;
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(9, 0);
      c.lineTo(-6, -5);
      c.lineTo(-3, 0);
      c.lineTo(-6, 5);
      c.closePath();
      c.stroke();
      clearGlow(c);
    });
  }
  function drawHUD() {
    // textBaseline lo deja el texto "3x" del power-up y nunca se restablece: se
    // replica en el sprite para conservar exactamente la posición original del HUD.
    const baseline = ctx.textBaseline;
    const hudKey = `${score}|${level}|${baseline}`;
    sprites.text(ctx, "hud", hudKey, W, 36, palette.hudGlow, (c) => {
      c.textBaseline = baseline;
      c.fillStyle = palette.hud;
      setGlow(c, palette.hud, palette.hudGlow);
      c.font = "15px monospace";
      c.textAlign = "left";
      c.fillText(`SCORE  ${score}`, 14, 26);
      c.textAlign = "center";
      c.fillText(`NIVEL ${level}`, W / 2, 26);
      clearGlow(c);
    });
    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);
    if (ship.tripleShot > 0) {
      const label = `3x  ${ship.tripleShot.toFixed(1)}s`;
      sprites.text(
        ctx,
        "triple",
        `${label}|${baseline}`,
        W / 2,
        56,
        palette.hudGlow,
        (c) => {
          c.textBaseline = baseline;
          c.font = "15px monospace";
          c.textAlign = "left";
          c.fillStyle = palette.hudAccent;
          setGlow(c, palette.hudAccent, palette.hudGlow);
          c.fillText(label, 14, 46);
          clearGlow(c);
        },
      );
    }
  }
  function drawOverlay(title: string, sub: string) {
    ctx.textAlign = "center";
    ctx.fillStyle = palette.overlayTitle;
    setGlow(ctx, palette.overlayTitle, palette.hudGlow);
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    clearGlow(ctx);
    ctx.font = "18px monospace";
    ctx.fillStyle = palette.overlaySub;
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }
  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(ctx, palette));
    asteroids.forEach((a) => a.draw(ctx, palette, sprites));
    powerUps.forEach((p) => p.draw(ctx, palette, sprites));
    bullets.forEach((b) => b.draw(ctx, palette, sprites));
    ship.draw(ctx, palette, sprites);
    drawHUD();
    if (status === "gameover") drawOverlay("GAME OVER", `PUNTAJE: ${score}`);
  }
  // ── Notificación a React ────────────────────────────────────────────────────
  // Solo se emite si algún campo cambió respecto al último snapshot: nunca por frame.
  let lastSnapshot: AsteroidsSnapshot | null = null;
  function emitStateIfChanged() {
    const next: AsteroidsSnapshot = { score, lives, level, paused };
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
      update(dt);
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
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
