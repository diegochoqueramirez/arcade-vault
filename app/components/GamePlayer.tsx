"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveScore, type SaveScoreResult } from "@/app/actions/scores";
import GameCanvas, { type GameController } from "@/app/components/GameCanvas";
import PauseButton from "@/app/components/PauseButton";
import PauseOverlay from "@/app/components/PauseOverlay";
import PlayerHud from "@/app/components/PlayerHud";
import SkinSelector from "@/app/components/SkinSelector";
import type { Game } from "@/app/data/catalog";
import { GAME_ENGINES } from "@/app/lib/games/registry";
import { createSnapshotStore } from "@/app/lib/games/snapshot-store";
import {
  DEFAULT_SKIN,
  type GameSnapshot,
  type SkinId,
} from "@/app/lib/games/types";
// Placeholder visual: HUD con valores fijos, sin lógica de juego ni persistencia.
const PLACEHOLDER: GameSnapshot = {
  score: 0,
  lives: 3,
  level: 1,
  paused: false,
};
// Último nombre guardado: pre-rellena el modal de game over en la siguiente partida.
const PLAYER_NAME_KEY = "av_player_name";
const PLAYER_NAME_RE = /^[A-Z0-9_]{1,12}$/;
export default function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  // Puntuación final de la partida: null = sin modal. Un solo estado abre el modal y le pasa
  // la puntuación en el mismo render (sustituye a over + finalScore).
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("INVITADO");
  type SaveError = Extract<SaveScoreResult, { ok: false }>["error"];
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  // Se incrementa en cada error para reiniciar la animación del mensaje.
  const [errorTick, setErrorTick] = useState(0);
  const [saving, startSaving] = useTransition();
  // Juegos con motor registrado; el resto conserva el HUD fijo del placeholder.
  const engine = GAME_ENGINES[game.id];
  // Skin de la partida en curso (sin persistencia: cada visita empieza en classic).
  const [selectedSkin, setSkin] = useState<SkinId>(DEFAULT_SKIN);
  const hasSkins = !!engine?.skins;
  const skin = hasSkins ? selectedSkin : DEFAULT_SKIN;
  // Snapshot en un store externo (SPEC 10): el motor escribe en él y solo re-renderizan
  // PlayerHud, PauseButton y PauseOverlay; GamePlayer no guarda snapshot ni pausa en estado.
  // useState lazy sin setter: instancia estable, nunca provoca renders (react-hooks/refs
  // impide leer un useRef durante el render).
  const [store] = useState(() =>
    createSnapshotStore(engine ? { score: 0, paused: false } : PLACEHOLDER),
  );
  const gameRef = useRef<GameController>(null);
  // Con motor, el motor es la fuente de verdad de la pausa (botón, teclas y pestaña).
  const togglePause = () => {
    if (engine) gameRef.current?.togglePause();
    else store.set({ ...store.get(), paused: !store.get().paused });
  };
  // Puntuación del modal: la notifica el motor; fija en el placeholder.
  const handleGameOver = (s: number) => {
    // Pre-rellena el modal con el último nombre guardado (si es válido).
    try {
      const stored = localStorage.getItem(PLAYER_NAME_KEY);
      if (stored && PLAYER_NAME_RE.test(stored)) setName(stored);
    } catch {}
    setFinalScore(s);
  };
  // Con motor, end() dispara onGameOver, que abre el modal.
  const end = () => {
    if (engine) gameRef.current?.end();
    else setFinalScore(PLACEHOLDER.score);
  };
  const restart = () => {
    if (engine) gameRef.current?.restart();
    else store.set(PLACEHOLDER);
    setFinalScore(null);
    setSaved(false);
    setSaveError(null);
  };
  // Solo los juegos con motor persisten en Supabase; el placeholder conserva el guardado visual.
  const save = () => {
    if (finalScore === null) return;
    if (!engine) {
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
        try {
          localStorage.setItem(PLAYER_NAME_KEY, name);
        } catch {}
      } else {
        setSaveError(result.error);
        setErrorTick((t) => t + 1);
      }
    });
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <PlayerHud store={store} name={name} />
        <div className="player-hud-controls">
          {hasSkins && (
            <SkinSelector gameId={game.id} value={skin} onChange={setSkin} />
          )}
          <div className="hud-actions">
            <PauseButton store={store} onClick={togglePause} />
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
      </div>
      <div className="crt">
        <div className="crt-screen">
          {engine ? (
            // key={skin}: cambiar de skin remonta GameCanvas y reinicia la partida
            // (el motor se crea una sola vez y fija la paleta en su factory).
            <GameCanvas
              key={skin}
              ref={gameRef}
              create={engine.create}
              width={engine.width}
              height={engine.height}
              options={{ skin }}
              onStateChange={store.set}
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
          <PauseOverlay store={store} />
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {finalScore !== null && (
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
                {engine && (
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
