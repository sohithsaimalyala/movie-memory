// Shared request/response shapes for /api routes and the typed client.

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "NO_FAVORITE_MOVIE"
  | "NOT_CONFIGURED"
  | "COOLDOWN"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UNKNOWN_MOVIE"
  | "MOVIE_CHANGED"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorBody = { error: { code: ApiErrorCode; message: string } };

export type MeResponse = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  favoriteMovie: string | null;
};

export type UpdateMovieRequest = { title: string };
export type UpdateMovieResponse = { favoriteMovie: string };

export type Fact = {
  id: string;
  movieTitle: string;
  content: string;
  createdAt: string;
};

export type FactResponse = { fact: Fact };
