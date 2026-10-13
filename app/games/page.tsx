import Library from "../components/Library";
import { getGames } from "../data/catalog.server";

export default async function GamesPage() {
  const games = await getGames();
  return <Library games={games} />;
}
