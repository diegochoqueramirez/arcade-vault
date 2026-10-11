import { notFound } from "next/navigation";
import GamePlayer from "@/app/components/GamePlayer";
import { getGameById, getGames } from "@/app/data/games";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

export default async function GamePlayPage(props: PageProps<"/games/[id]/play">) {
  const { id } = await props.params;
  const game = await getGameById(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
