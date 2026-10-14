"use client";
import { useSyncExternalStore } from "react";
import type { SnapshotStore } from "@/app/lib/games/snapshot-store";
// Stats del HUD React: el único componente que re-renderiza con score/vidas/nivel/extra.
export default function PlayerHud({
  store,
  name,
}: {
  store: SnapshotStore;
  name: string;
}) {
  const { score, lives, level, extra } = useSyncExternalStore(
    store.subscribe,
    store.get,
    store.get,
  );
  return (
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
      {lives !== undefined && (
        <div className="hud-stat lives">
          <div className="l">Vidas</div>
          <div className="v">{"♥ ".repeat(lives).trim()}</div>
        </div>
      )}
      {level !== undefined && (
        <div className="hud-stat level">
          <div className="l">Nivel</div>
          <div className="v">{String(level).padStart(2, "0")}</div>
        </div>
      )}
      {extra?.map((e) => (
        <div key={e.label} className="hud-stat">
          <div className="l">{e.label}</div>
          <div className="v">{e.value}</div>
        </div>
      ))}
    </div>
  );
}
