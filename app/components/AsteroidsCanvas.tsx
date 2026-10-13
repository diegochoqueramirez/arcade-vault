"use client";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import { H, W } from "@/app/lib/games/asteroids/constants";
import {
  type AsteroidsCallbacks,
  type AsteroidsGame,
  createAsteroidsGame,
} from "@/app/lib/games/asteroids/engine";
// Controlador expuesto al padre; destroy() lo gestiona solo este componente.
export type AsteroidsController = Omit<AsteroidsGame, "destroy">;
interface Props extends AsteroidsCallbacks {
  ref?: Ref<AsteroidsController>;
}
// Resolución lógica fija; CSS la escala para llenar el .crt-screen (4:3).
export default function AsteroidsCanvas({ ref, ...callbacks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  // Los callbacks viven en un ref para que su identidad no recree el motor.
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useImperativeHandle(
    ref,
    () => ({
      pause: () => gameRef.current?.pause(),
      resume: () => gameRef.current?.resume(),
      togglePause: () => gameRef.current?.togglePause(),
      end: () => gameRef.current?.end(),
      restart: () => gameRef.current?.restart(),
    }),
    [],
  );
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createAsteroidsGame(canvas, {
      onStateChange: (s) => callbacksRef.current.onStateChange(s),
      onGameOver: (score) => callbacksRef.current.onGameOver(score),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
