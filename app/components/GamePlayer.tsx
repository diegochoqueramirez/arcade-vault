"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveScore, type SaveScoreResult } from "@/app/actions/scores";
import AsteroidsCanvas, {
  type AsteroidsController,
} from "@/app/components/AsteroidsCanvas";
import type { Game } from "@/app/data/catalog";
import type { AsteroidsSnapshot } from "@/app/lib/games/asteroids/engine";
// Placeholder visual: HUD con valores fijos, sin lógica de juego ni persistencia.
const SCORE = 0;
const LIVES = 3;
const LEVEL = 1;
export default function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const [placeholderPaused, setPlaceholderPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("INVITADO");
  type SaveError = Extract<SaveScoreResult, { ok: false }>["error"];
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  // Se incrementa en cada error para reiniciar la animación del mensaje.
  const [errorTick, setErrorTick] = useState(0);
  const [saving, startSaving] = useTransition();
  // Solo asteroids tiene motor real; el resto conserva el HUD fijo del placeholder.
  const isAsteroids = game.id === "asteroids";
  const [snapshot, setSnapshot] = useState<AsteroidsSnapshot>({
    score: SCORE,
    lives: LIVES,
    level: LEVEL,
    paused: false,
  });
  const asteroidsRef = useRef<AsteroidsController>(null);
  // En asteroids el motor es la fuente de verdad de la pausa (botón, teclas y pestaña).
  const { score, lives, level, paused } = isAsteroids
    ? snapshot
    : { score: SCORE, lives: LIVES, level: LEVEL, paused: placeholderPaused };
  const togglePause = () => {
    if (isAsteroids) asteroidsRef.current?.togglePause();
    else setPlaceholderPaused((p) => !p);
  };
  // Puntuación del modal: la notifica el motor en asteroids; fija en el placeholder.
  const [finalScore, setFinalScore] = useState(SCORE);
  const handleGameOver = (s: number) => {
    setFinalScore(s);
    setOver(true);
  };
  // En asteroids, end() dispara onGameOver, que abre el modal.
  const end = () => {
    if (isAsteroids) asteroidsRef.current?.end();
    else setOver(true);
  };
  const restart = () => {
    if (isAsteroids) asteroidsRef.current?.restart();
    setPlaceholderPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(null);
  };
  // Solo asteroids persiste en Supabase; el placeholder conserva el guardado visual.
  const save = () => {
    if (!isAsteroids) {
      setSaved(true);
      return;
    }
    startSaving(async () => {
      const result = await saveScore({
        gameId: game.id,
        playerName: name,
        score: finalScore,
      });
      if (result.ok) {
        setSaveError(null);
        setSaved(true);
      } else {
        setSaveError(result.error);
        setErrorTick((t) => t + 1);
      }
    });
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim()}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={end}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/games/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          {game.id === "asteroids" ? (
            <AsteroidsCanvas
              ref={asteroidsRef}
              onStateChange={setSnapshot}
              onGameOver={handleGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{finalScore.toLocaleString("es-ES")}</div>
            {!saved ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    maxLength={12}
                    disabled={saving}
                    aria-invalid={saveError === "invalid"}
                    aria-describedby={saveError ? "save-error" : undefined}
                    className={
                      saveError === "invalid" ? "is-invalid" : undefined
                    }
                    onChange={(e) => {
                      setName(e.target.value.toUpperCase().slice(0, 12));
                      if (saveError === "invalid") setSaveError(null);
                    }}
                    placeholder="TUS INICIALES"
                  />
                  <button
                    className={"btn yellow" + (saving ? " is-saving" : "")}
                    onClick={save}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        GUARDANDO<span className="saving-dots">...</span>
                      </>
                    ) : (
                      "GUARDAR PUNTUACIÓN"
                    )}
                  </button>
                </div>
                <div className="save-error-slot" aria-live="polite">
                  {saveError && (
                    <p key={errorTick} id="save-error" className="save-error">
                      {saveError === "invalid"
                        ? "NOMBRE INVÁLIDO: 1–12 CARACTERES A-Z 0-9 _"
                        : "NO SE PUDO GUARDAR. REINTENTA."}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="saved-row">
                <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
                {isAsteroids && (
                  <Link href={`/games/${game.id}`} className="ranking-link">
                    VER RANKING
                  </Link>
                )}
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/games")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
