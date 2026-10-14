import type { GameSnapshot } from "@/app/lib/games/types";
// Store externo del snapshot (SPEC 10): el motor escribe con set() y solo re-renderizan
// los componentes suscritos (useSyncExternalStore), no el GamePlayer entero.
export interface SnapshotStore {
  get(): GameSnapshot;
  set(s: GameSnapshot): void; // notifica a los suscriptores
  subscribe(fn: () => void): () => void;
}
export function createSnapshotStore(initial: GameSnapshot): SnapshotStore {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (s) => {
      current = s;
      listeners.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
