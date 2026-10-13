// Contrato común de los motores de juego (SPEC 07).
export interface GameSnapshot {
  score: number;
  paused: boolean;
  lives?: number; // undefined → el HUD oculta vidas
  level?: number; // undefined → el HUD oculta nivel
  extra?: { label: string; value: string }[];
}
export interface GameCallbacks {
  onStateChange(snapshot: GameSnapshot): void; // solo cuando algún campo cambia
  onGameOver(finalScore: number): void; // una vez por partida
}
export interface GameEngine {
  pause(): void;
  resume(): void;
  togglePause(): void;
  end(): void; // fuerza game over → dispara onGameOver
  restart(): void; // nueva partida → dispara onStateChange
  destroy(): void; // cancela rAF y quita todos los listeners
}
export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;
