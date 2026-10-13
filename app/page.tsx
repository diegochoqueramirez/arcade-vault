import Home from "./components/Home";
import RevealObserver from "./components/RevealObserver";
import { getRecentScores, getTopPlayersToday } from "./data/activity";
import { getGames } from "./data/catalog.server";

export default async function HomePage() {
  const [games, recentScores, topPlayers] = await Promise.all([
    getGames(),
    getRecentScores(),
    getTopPlayersToday(),
  ]);
  return (
    <>
      <Home games={games} recentScores={recentScores} topPlayers={topPlayers} />
      <RevealObserver />
    </>
  );
}
