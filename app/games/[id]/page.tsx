import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Leaderboard from "@/app/components/Leaderboard";
import ScreenLoading from "@/app/components/ScreenLoading";
import { getGameById, getGames, getLeaderboard } from "@/app/data/catalog.server";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

// params se lee dentro de Suspense para no atar el App Shell a una URL (Partial Prefetching).
export default function GameDetailPage({ params }: PageProps<"/games/[id]">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <GameDetail params={params} />
    </Suspense>
  );
}

async function GameDetail({ params }: Pick<PageProps<"/games/[id]">, "params">) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();
  const scores = await getLeaderboard(id, 10);

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div className="v" style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}>
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div className="v" style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}>
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.id}/play`} className="btn xl pulse">
              ▶  JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard scores={scores} />
      </aside>
    </div>
  );
}
