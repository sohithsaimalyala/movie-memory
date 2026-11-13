export const MOVIE_TITLE_MAX_LENGTH = 200;

export type MovieTitleResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Shared server-side rules for a favorite movie title. Length is counted in
 * Unicode code points to match PostgreSQL's VARCHAR(200).
 */
export function validateMovieTitle(input: unknown): MovieTitleResult {
  if (typeof input !== "string") {
    return { ok: false, error: "Enter a movie title." };
  }

  const value = input.trim();
  if (value.length === 0) {
    return { ok: false, error: "Enter a movie title." };
  }
  if (CONTROL_CHARACTER.test(value)) {
    return {
      ok: false,
      error: "Movie title can't contain line breaks, tabs, or other control characters.",
    };
  }
  if (Array.from(value).length > MOVIE_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Movie title must be ${MOVIE_TITLE_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, value };
}
