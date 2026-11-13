type FactCardProps = { movieTitle: string };

// Placeholder until Stage 6 adds AI-generated facts; shows no fact content.
export function FactCard({ movieTitle }: FactCardProps) {
  return (
    <section
      aria-labelledby="fact-heading"
      className="rounded-2xl border border-dashed border-zinc-800 p-6 sm:p-8"
    >
      <div className="flex min-h-10 items-center justify-between gap-4">
        <h2
          id="fact-heading"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
        >
          Fun fact
        </h2>
        <span className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
          Coming soon
        </span>
      </div>
      <p className="mt-3 text-zinc-400 [overflow-wrap:anywhere]">
        AI-generated fun facts about{" "}
        <span className="font-medium text-zinc-200">{movieTitle}</span> will
        appear here.
      </p>
    </section>
  );
}
