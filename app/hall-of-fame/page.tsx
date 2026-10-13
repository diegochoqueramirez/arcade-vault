import HallOfFame from "@/app/components/HallOfFame";
import { getGames, getLeaderboard } from "@/app/data/catalog.server";

export default async function HallOfFamePage() {
  const games = await getGames();
  const boards = await Promise.all(games.map((g) => getLeaderboard(g.id, 12)));
  const leaderboards = Object.fromEntries(games.map((g, i) => [g.id, boards[i]]));

  return (
    <HallOfFame games={games.map(({ id, title }) => ({ id, title }))} leaderboards={leaderboards} />
  );
}
