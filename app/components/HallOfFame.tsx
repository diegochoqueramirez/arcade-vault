"use client";

import Link from "next/link";
import { useState } from "react";
import type { Game } from "@/app/data/catalog";
import type { ScoreEntry } from "@/app/data/catalog";

const TOP_CLASS = [" top1", " top2", " top3"];

interface HallOfFameProps {
  games: Pick<Game, "id" | "title">[];
  leaderboards: Record<string, ScoreEntry[]>;
}

export default function HallOfFame({ games, leaderboards }: HallOfFameProps) {
  const [tab, setTab] = useState(games[0].id);
  const rows = leaderboards[tab] ?? [];
  const [first, second, third] = rows;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button key={g.id} className={"chip" + (tab === g.id ? " active" : "")} onClick={() => setTab(g.id)}>
            {g.title}
          </button>
        ))}
      </div>

      {first && second && third && (
        <div className="podium">
          <div className="podium-slot silver">
            <div className="rank-num">02</div>
            <div className="name">{second.name}</div>
            <div className="score">{second.score.toLocaleString("es-ES")}</div>
            <div className="date">{second.date}</div>
          </div>
          <div className="podium-slot gold">
            <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>CAMPEÓN</div>
            <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>01</div>
            <div className="name">{first.name}</div>
            <div className="score" style={{ fontSize: 20 }}>{first.score.toLocaleString("es-ES")}</div>
            <div className="date">{first.date}</div>
          </div>
          <div className="podium-slot bronze">
            <div className="rank-num">03</div>
            <div className="name">{third.name}</div>
            <div className="score">{third.score.toLocaleString("es-ES")}</div>
            <div className="date">{third.date}</div>
          </div>
        </div>
      )}

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          // key con la pestaña para que la animación escalonada se repita al cambiar de juego
          <div key={r.id} className={"tr" + (TOP_CLASS[i] ?? "")} style={{ animationDelay: `${i * 50}ms` }}>
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
