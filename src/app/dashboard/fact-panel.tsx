"use client";

import { useEffect, useRef, useState } from "react";
import type { Fact } from "@/lib/api-types";
import { ApiError, api } from "@/lib/api-client";
import { factCache, factCacheKey } from "@/lib/fact-cache";

type FactPanelProps = {
  userId: string;
  movieTitle: string;
  initialFact: Fact | null;
  paused: boolean;
};

const GENERIC_ERROR = "Something went wrong loading a fact. Please try again.";

function loadFact(userId: string, movieTitle: string, refresh: boolean): Promise<Fact> {
  return factCache.load(
    factCacheKey(userId, movieTitle),
    async () => {
      const { fact } = await api.getFact({ refresh });
      // The server answers for the user's current movie; never cache it under another title.
      if (fact.movieTitle !== movieTitle) {
        throw new ApiError(409, "MOVIE_CHANGED", "Your favorite movie changed. Please try again.");
      }
      return fact;
    },
    { refresh },
  );
}

export function FactPanel({ userId, movieTitle, initialFact, paused }: FactPanelProps) {
  const [fact, setFact] = useState<Fact | null>(initialFact);
  const [error, setError] = useState<{ movie: string; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  function settle(id: number, movie: string, promise: Promise<Fact>) {
    promise
      .then((next) => {
        if (id !== requestId.current) return;
        setFact(next);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError({ movie, message: caught instanceof ApiError ? caught.message : GENERIC_ERROR });
      })
      .finally(() => {
        if (id === requestId.current) setRefreshing(false);
      });
  }

  // Load the fact for the current movie: cache hit within 30s, otherwise GET /api/fact.
  useEffect(() => {
    if (paused) return; // wait until a movie change is saved
    const key = factCacheKey(userId, movieTitle);
    if (initialFact?.movieTitle === movieTitle && !factCache.get(key)) {
      factCache.set(key, initialFact); // server-rendered fact seeds the cache
    }
    settle(++requestId.current, movieTitle, loadFact(userId, movieTitle, false));
  }, [userId, movieTitle, paused, initialFact]);

  function refresh() {
    setRefreshing(true);
    setError(null);
    settle(++requestId.current, movieTitle, loadFact(userId, movieTitle, true));
  }

  // Only ever display a fact or error that belongs to the current movie.
  const shownFact = !paused && fact?.movieTitle === movieTitle ? fact : null;
  const shownError = !paused && error?.movie === movieTitle ? error.message : null;
  const loading = paused || refreshing || (!shownFact && !shownError);

  return (
    <div className="mt-3">
      <div aria-busy={loading}>
        {loading && !shownFact ? (
          <div className="space-y-2 pt-1" aria-hidden>
            <div className="h-4 w-full animate-pulse rounded bg-zinc-800 motion-reduce:animate-none" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800 motion-reduce:animate-none" />
          </div>
        ) : shownFact ? (
          <>
            <p className="text-lg leading-relaxed text-zinc-100 [overflow-wrap:anywhere]">
              {shownFact.content}
            </p>
            <p className="mt-2 text-xs text-zinc-400">AI-generated and not independently verified.</p>
          </>
        ) : (
          <p className="text-zinc-400 [overflow-wrap:anywhere]">
            No fun fact yet for <span className="font-medium text-zinc-200">{movieTitle}</span>.
          </p>
        )}
      </div>

      {/* Stays mounted (so updates are announced) but takes no space when empty. */}
      <p role="status" aria-live="polite" className="mt-3 text-sm empty:mt-0">
        {loading ? (
          <span className="text-zinc-400">Loading a fun fact… this can take a few seconds.</span>
        ) : shownError ? (
          <span className="text-red-400">{shownError}</span>
        ) : null}
      </p>

      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="mt-5 h-10 rounded-full border border-amber-400/60 px-4 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
      >
        {loading ? "Loading…" : shownFact ? "Get another fact" : "Generate a fun fact"}
      </button>
    </div>
  );
}
