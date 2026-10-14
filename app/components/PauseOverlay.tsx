"use client";
import { useSyncExternalStore } from "react";
import type { SnapshotStore } from "@/app/lib/games/snapshot-store";
// Overlay EN PAUSA sobre el CRT: solo re-renderiza cuando cambia `paused`.
export default function PauseOverlay({ store }: { store: SnapshotStore }) {
  const getPaused = () => store.get().paused;
  const paused = useSyncExternalStore(store.subscribe, getPaused, getPaused);
  if (!paused) return null;
  return (
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
  );
}
