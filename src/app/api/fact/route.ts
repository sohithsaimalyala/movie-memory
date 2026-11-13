import { getSessionUser } from "@/lib/session";
import { generateFact, getLatestFactForCurrentMovie, type FactErrorCode } from "@/lib/facts";
import { jsonError, jsonOk, unauthorized } from "@/lib/api-response";
import type { FactResponse } from "@/lib/api-types";

const FACT_ERRORS: Record<FactErrorCode, { status: number; message: string }> = {
  NO_FAVORITE_MOVIE: { status: 409, message: "Choose a favorite movie first." },
  NOT_CONFIGURED: { status: 503, message: "Fun facts aren't available right now." },
  COOLDOWN: { status: 429, message: "Please wait a few seconds before getting another fact." },
  RATE_LIMITED: { status: 429, message: "Too many requests right now. Please try again in a moment." },
  TIMEOUT: { status: 504, message: "That took too long. Please try again." },
  UNKNOWN_MOVIE: { status: 422, message: "We couldn't find reliable facts about this title." },
  MOVIE_CHANGED: { status: 409, message: "Your favorite movie changed. Please try again." },
  UPSTREAM_ERROR: { status: 502, message: "Something went wrong generating a fact. Please try again." },
};

/**
 * GET /api/fact            -> latest saved fact for the user's current movie;
 *                             generates one only if none exists yet.
 * GET /api/fact?refresh=1  -> always generates a new fact (subject to the cooldown).
 */
export async function GET(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";

  if (!refresh) {
    const existing = await getLatestFactForCurrentMovie(user.id);
    if (existing) return jsonOk<FactResponse>({ fact: existing });
  }

  const result = await generateFact(user.id);
  if (result.ok) return jsonOk<FactResponse>({ fact: result.fact });

  const { status, message } = FACT_ERRORS[result.code];
  return jsonError(status, result.code, message, result.code === "COOLDOWN" ? { "Retry-After": "10" } : {});
}
