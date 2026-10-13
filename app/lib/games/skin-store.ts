"use client";
import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SKIN, SKIN_IDS, type SkinId } from "./types";
// Skin elegido por juego, persistido en localStorage (`av-skin:<gameId>`).
const KEY_PREFIX = "av-skin:";
const CHANGE_EVENT = "av-skin-change";
const keyFor = (gameId: string) => KEY_PREFIX + gameId;
function isSkinId(v: unknown): v is SkinId {
  return typeof v === "string" && (SKIN_IDS as readonly string[]).includes(v);
}
function readSkin(gameId: string): SkinId {
  try {
    const v = window.localStorage.getItem(keyFor(gameId));
    return isSkinId(v) ? v : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}
function writeSkin(gameId: string, skin: SkinId) {
  try {
    window.localStorage.setItem(keyFor(gameId), skin);
  } catch {
    // localStorage no disponible (modo privado, cuota): se queda en DEFAULT_SKIN.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: gameId }));
}
// Componentes de la misma pestaña (evento propio) + otras pestañas (`storage`).
function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(KEY_PREFIX)) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
const getServerSnapshot = (): SkinId => DEFAULT_SKIN;
export function useGameSkin(gameId: string): [SkinId, (skin: SkinId) => void] {
  const skin = useSyncExternalStore(
    subscribe,
    () => readSkin(gameId),
    getServerSnapshot,
  );
  const setSkin = useCallback(
    (next: SkinId) => writeSkin(gameId, next),
    [gameId],
  );
  return [skin, setSkin];
}
