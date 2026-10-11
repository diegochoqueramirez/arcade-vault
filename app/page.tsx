import Library from "./components/Library";
import { getGames } from "./data/games";

export default async function Home() {
  const games = await getGames();
  return <Library games={games} />;
}
