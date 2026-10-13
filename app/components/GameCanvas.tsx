"use client";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import type {
  GameCallbacks,
  GameEngine,
  GameFactory,
} from "@/app/lib/games/types";
// Controlador expuesto al padre; destroy() lo gestiona solo este componente.
export type GameController = Omit<GameEngine, "destroy">;
interface Props extends GameCallbacks {
  create: GameFactory;
  width: number;
  height: number;
  ref?: Ref<GameController>;
}
// Resolución lógica fija; CSS la escala dentro del .crt-screen (letterbox si no es 4:3).
export default function GameCanvas({
  create,
  width,
  height,
  ref,
  ...callbacks
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine | null>(null);
  // Los callbacks y la fábrica viven en refs para que su identidad no recree el motor.
  const callbacksRef = useRef(callbacks);
  const createRef = useRef(create);
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
    const game = createRef.current(canvas, {
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
      width={width}
      height={height}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
