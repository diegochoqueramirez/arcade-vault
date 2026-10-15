"use client";
import Image from "next/image";
import { useState } from "react";
// Pokédex nacional completa (hasta Gen 9).
const MAX_POKEMON = 1025;
function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}
export default function PokemonCounter() {
  const [count, setCount] = useState(0);
  const isEmpty = count === 0;
  const atMax = count >= MAX_POKEMON;
  const increment = () => setCount((c) => Math.min(c + 1, MAX_POKEMON));
  const reset = () => setCount(0);
  return (
    <section className="poke fade-in">
      <h1 className="poke-title pixel">Contador Pokémon</h1>
      <p className="poke-sub">
        Cada clic suma uno y muestra el Pokémon con ese número de la Pokédex
        nacional.
      </p>
      <div className="poke-screen" aria-live="polite">
        {isEmpty ? (
          <p className="poke-empty pixel">
            Pulsa +1 para ver tu primer Pokémon
          </p>
        ) : (
          <Image
            key={count}
            className="poke-sprite"
            src={spriteUrl(count)}
            alt={`Pokémon número ${count}`}
            width={96}
            height={96}
            unoptimized
          />
        )}
      </div>
      <output className="poke-count pixel" aria-label={`Contador: ${count}`}>
        Nº {String(count).padStart(4, "0")}
      </output>
      <div className="poke-actions">
        <button className="btn yellow xl" onClick={increment} disabled={atMax}>
          +1
        </button>
        <button className="btn ghost" onClick={reset} disabled={isEmpty}>
          Reiniciar
        </button>
      </div>
      {atMax && (
        <p className="poke-done">Has visto los {MAX_POKEMON} Pokémon.</p>
      )}
    </section>
  );
}
