import { notFound } from "next/navigation";
import { Suspense } from "react";
import GamePlayer from "@/app/components/GamePlayer";
import ScreenLoading from "@/app/components/ScreenLoading";
import { getGameById, getGames } from "@/app/data/games";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

// params se lee dentro de Suspense para no atar el App Shell a una URL (Partial Prefetching).
export default function GamePlayPage({ params }: PageProps<"/games/[id]/play">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <GamePlay params={params} />
    </Suspense>
  );
}

async function GamePlay({ params }: Pick<PageProps<"/games/[id]/play">, "params">) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
