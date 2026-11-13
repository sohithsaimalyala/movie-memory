import type {
  ApiErrorBody,
  ApiErrorCode,
  FactResponse,
  MeResponse,
  UpdateMovieResponse,
} from "@/lib/api-types";

export type ClientErrorCode = ApiErrorCode | "NETWORK_ERROR" | "INVALID_RESPONSE" | "HTTP_ERROR";

/** Every failure from the API client is normalized to this error. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;

  constructor(status: number, code: ClientErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

function isErrorBody(value: unknown): value is ApiErrorBody {
  const error = (value as ApiErrorBody | null)?.error;
  return typeof error?.code === "string" && typeof error?.message === "string";
}

export async function request<T>(path: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(path, {
      ...init,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Couldn't reach the server. Check your connection and try again.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(response.status, response.ok ? "INVALID_RESPONSE" : "HTTP_ERROR", GENERIC_MESSAGE);
  }

  if (!response.ok) {
    if (isErrorBody(body)) throw new ApiError(response.status, body.error.code, body.error.message);
    throw new ApiError(response.status, "HTTP_ERROR", GENERIC_MESSAGE);
  }
  return body as T;
}

export const api = {
  getMe: () => request<MeResponse>("/api/me"),
  updateMovie: (title: string) =>
    request<UpdateMovieResponse>("/api/me/movie", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),
  getFact: (options: { refresh?: boolean } = {}) =>
    request<FactResponse>(options.refresh ? "/api/fact?refresh=1" : "/api/fact"),
};
