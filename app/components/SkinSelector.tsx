"use client";
import { SKIN_IDS, type SkinId } from "@/app/lib/games/types";
const LABELS: Record<SkinId, string> = {
  classic: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
// Selector de skin de un juego concreto (cada juego tiene el suyo).
export default function SkinSelector({
  gameId,
  value,
  onChange,
}: {
  gameId: string;
  value: SkinId;
  onChange: (skin: SkinId) => void;
}) {
  return (
    <div
      className="skin-selector"
      role="group"
      aria-label="Skin del juego"
      data-game={gameId}
    >
      <span className="skin-selector-label">SKIN</span>
      {SKIN_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={"skin-chip skin-" + id + (value === id ? " active" : "")}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {LABELS[id]}
        </button>
      ))}
    </div>
  );
}
