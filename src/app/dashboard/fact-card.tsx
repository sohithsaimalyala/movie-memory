import type { MovieFactView } from "@/lib/facts";
import { FactPanel } from "./fact-panel";

type FactCardProps = {
  movieTitle: string;
  initialFact: MovieFactView | null;
};

export function FactCard({ movieTitle, initialFact }: FactCardProps) {
  return (
    <section
      aria-labelledby="fact-heading"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8"
    >
      <div className="flex min-h-10 items-center justify-between gap-4">
        <h2
          id="fact-heading"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
        >
          Fun fact
        </h2>
        <span className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
          AI
        </span>
      </div>
      <FactPanel movieTitle={movieTitle} initialFact={initialFact} />
    </section>
  );
}
