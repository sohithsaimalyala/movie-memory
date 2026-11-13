export type SaveMovieResult = { ok: true; saved: string } | { ok: false; error: string };

/**
 * Shows `next` immediately, persists it, then applies the server's value.
 * On failure the previous title is restored and a friendly message returned.
 */
export async function saveMovieOptimistically(options: {
  previous: string;
  next: string;
  apply: (title: string) => void;
  persist: (title: string) => Promise<{ favoriteMovie: string }>;
}): Promise<SaveMovieResult> {
  const { previous, next, apply, persist } = options;
  apply(next);
  try {
    const { favoriteMovie } = await persist(next);
    apply(favoriteMovie);
    return { ok: true, saved: favoriteMovie };
  } catch (error) {
    apply(previous);
    return {
      ok: false,
      // ApiError messages are already user-facing; anything else gets a generic message.
      error:
        error instanceof Error && error.name === "ApiError"
          ? error.message
          : "We couldn't save your movie. Please try again.",
    };
  }
}
