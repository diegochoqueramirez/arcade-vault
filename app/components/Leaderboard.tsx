import type { ScoreEntry } from "@/app/data/scores";

const TOP_CLASS = [" top1", " top2", " top3"];

export default function Leaderboard({ scores }: { scores: ScoreEntry[] }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {scores.map((r, i) => (
        <div key={r.name} className={"lb-row" + (TOP_CLASS[i] ?? "")}>
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>{r.date}</div>
          </div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
        </div>
      ))}
    </div>
  );
}
