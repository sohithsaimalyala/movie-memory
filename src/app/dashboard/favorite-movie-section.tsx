"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Fact } from "@/lib/api-types";
import { api } from "@/lib/api-client";
import { factCache, factCacheKey } from "@/lib/fact-cache";
import { validateMovieTitle } from "@/lib/movie-title";
import { saveMovieOptimistically } from "@/lib/optimistic-movie";
import { FactCard } from "./fact-card";
import { MovieCard } from "./movie-card";

type Props = {
  userId: string;
  initialMovie: string;
  initialFact: Fact | null;
};

const secondaryButton =
  "h-10 rounded-full border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 motion-reduce:transition-none";
const primaryButton =
  "h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 motion-reduce:transition-none";

export function FavoriteMovieSection({ userId, initialMovie, initialFact }: Props) {
  const [movie, setMovie] = useState(initialMovie);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialMovie);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  function startEditing() {
    setDraft(movie);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return; // prevent duplicate saves

    const result = validateMovieTitle(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.value === movie) {
      cancel();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    setEditing(false);

    const previous = movie;
    const outcome = await saveMovieOptimistically({
      previous,
      next: result.value,
      apply: setMovie,
      persist: api.updateMovie,
    });

    if (outcome.ok) {
      factCache.invalidate(factCacheKey(userId, previous));
      factCache.invalidate(factCacheKey(userId, outcome.saved));
    } else {
      setDraft(result.value);
      setEditing(true);
      setError(outcome.error);
    }
    savingRef.current = false;
    setSaving(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") cancel();
  }

  const editForm = (
    <form onSubmit={save} noValidate className="mt-3 flex flex-col gap-3">
      <label htmlFor="movie-title" className="sr-only">
        Favorite movie
      </label>
      <input
        id="movie-title"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "movie-title-error" : undefined}
        className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 text-lg text-zinc-50 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 aria-invalid:border-red-400"
      />
      {error && (
        <p id="movie-title-error" role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className={primaryButton}>
          Save
        </button>
        <button type="button" onClick={cancel} disabled={saving} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <>
      <MovieCard
        title={movie}
        actions={
          editing ? null : (
            <button type="button" onClick={startEditing} disabled={saving} className={secondaryButton}>
              {saving ? "Saving…" : "Edit"}
            </button>
          )
        }
        body={editing ? editForm : undefined}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {saving ? "Saving your favorite movie" : ""}
      </p>
      <FactCard userId={userId} movieTitle={movie} initialFact={initialFact} paused={saving} />
    </>
  );
}
