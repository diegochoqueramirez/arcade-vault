import Library from "../components/Library";
import { getGames } from "../data/games";

export default async function GamesPage() {
  const games = await getGames();
  return <Library games={games} />;
}
