"use client";
import { useSyncExternalStore } from "react";
import type { SnapshotStore } from "@/app/lib/games/snapshot-store";
// Botón PAUSA/REANUDAR: solo re-renderiza cuando cambia `paused`.
export default function PauseButton({
  store,
  onClick,
}: {
  store: SnapshotStore;
  onClick: () => void;
}) {
  const getPaused = () => store.get().paused;
  const paused = useSyncExternalStore(store.subscribe, getPaused, getPaused);
  return (
    <button className="btn yellow" onClick={onClick}>
      {paused ? "REANUDAR" : "PAUSA"}
    </button>
  );
}
