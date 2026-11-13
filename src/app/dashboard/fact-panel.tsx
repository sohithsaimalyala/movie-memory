"use client";

import { useActionState } from "react";
import type { MovieFactView } from "@/lib/facts";
import { generateFactAction, type FactPanelState } from "./actions";

type FactPanelProps = {
  movieTitle: string;
  initialFact: MovieFactView | null;
};

export function FactPanel({ movieTitle, initialFact }: FactPanelProps) {
  const [state, formAction, pending] = useActionState<FactPanelState, FormData>(
    generateFactAction,
    { fact: initialFact, error: null },
  );
  // Never show a fact generated for a different movie than the current one.
  const fact = state.fact?.movieTitle === movieTitle ? state.fact : null;

  return (
    <div className="mt-3">
      <div aria-busy={pending}>
        {pending ? (
          <div className="space-y-2 pt-1" aria-hidden>
            <div className="h-4 w-full animate-pulse rounded bg-zinc-800 motion-reduce:animate-none" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800 motion-reduce:animate-none" />
          </div>
        ) : fact ? (
          <>
            <p className="text-lg leading-relaxed text-zinc-100 [overflow-wrap:anywhere]">
              {fact.content}
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              AI-generated and not independently verified.
            </p>
          </>
        ) : (
          <p className="text-zinc-400 [overflow-wrap:anywhere]">
            No fun fact yet for{" "}
            <span className="font-medium text-zinc-200">{movieTitle}</span>.
          </p>
        )}
      </div>

      {/* Stays mounted (so updates are announced) but takes no space when empty. */}
      <p role="status" aria-live="polite" className="mt-3 text-sm empty:mt-0">
        {pending ? (
          <span className="text-zinc-400">Generating a fun fact… this can take a few seconds.</span>
        ) : state.error ? (
          <span className="text-red-400">{state.error}</span>
        ) : null}
      </p>

      <form action={formAction} className="mt-5">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full border border-amber-400/60 px-4 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          {pending ? "Generating…" : fact ? "Get another fact" : "Generate a fun fact"}
        </button>
      </form>
    </div>
  );
}
