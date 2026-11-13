import type { ReactNode } from "react";

type MovieCardProps = {
  title: string;
  /** Header controls, such as the Edit button. */
  actions?: ReactNode;
  /** Replaces the title display, such as the inline edit form. */
  body?: ReactNode;
};

export function MovieCard({ title, actions, body }: MovieCardProps) {
  return (
    <section
      aria-labelledby="favorite-movie-heading"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8"
    >
      <div className="flex min-h-10 items-center justify-between gap-4">
        <h2
          id="favorite-movie-heading"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400"
        >
          Your favorite movie
        </h2>
        {actions}
      </div>
      {body ?? (
        <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 [overflow-wrap:anywhere] sm:text-5xl sm:leading-tight">
          {title}
        </p>
      )}
    </section>
  );
}
