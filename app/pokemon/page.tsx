import type { Metadata } from "next";
import PokemonCounter from "@/app/components/PokemonCounter";
export const metadata: Metadata = {
  title: "Contador Pokémon",
};
export default function PokemonPage() {
  return <PokemonCounter />;
}
