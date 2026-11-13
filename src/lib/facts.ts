import "server-only";
import { APIConnectionTimeoutError, RateLimitError } from "openai";
import { prisma } from "@/lib/prisma";
import { generateMovieFactText, isOpenAIConfigured } from "@/lib/openai";

/** Basic per-user cost guard between generations; not a full rate limiter. */
export const FACT_COOLDOWN_MS = 10_000;
const AVOID_RECENT_FACTS = 3;

export type MovieFactView = {
  id: string;
  movieTitle: string;
  content: string;
  createdAt: string;
};

export type FactErrorCode =
  | "NO_FAVORITE_MOVIE"
  | "NOT_CONFIGURED"
  | "COOLDOWN"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UNKNOWN_MOVIE"
  | "MOVIE_CHANGED"
  | "UPSTREAM_ERROR";

export type GenerateFactResult =
  | { ok: true; fact: MovieFactView }
  | { ok: false; code: FactErrorCode };

const factSelect = { id: true, movieTitle: true, content: true, createdAt: true } as const;

function toView(fact: { id: string; movieTitle: string; content: string; createdAt: Date }): MovieFactView {
  return { ...fact, createdAt: fact.createdAt.toISOString() };
}

/** Latest saved fact for this user's given movie title; never facts for other titles or users. */
export async function getLatestFact(userId: string, movieTitle: string): Promise<MovieFactView | null> {
  const fact = await prisma.movieFact.findFirst({
    where: { userId, movieTitle },
    orderBy: { createdAt: "desc" },
    select: factSelect,
  });
  return fact ? toView(fact) : null;
}

/** Reads the user's current favorite movie fresh (uncached) and returns its latest fact. */
export async function getLatestFactForCurrentMovie(userId: string): Promise<MovieFactView | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { favoriteMovie: true },
  });
  return user?.favoriteMovie ? getLatestFact(userId, user.favoriteMovie) : null;
}

// Coalesces simultaneous generations for the same user within this Node process.
const inFlight = new Map<string, Promise<GenerateFactResult>>();

export function generateFact(userId: string): Promise<GenerateFactResult> {
  const existing = inFlight.get(userId);
  if (existing) return existing;

  const promise = runGeneration(userId).finally(() => {
    inFlight.delete(userId);
  });
  inFlight.set(userId, promise);
  return promise;
}

async function runGeneration(userId: string): Promise<GenerateFactResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { favoriteMovie: true },
  });
  const movieTitle = user?.favoriteMovie;
  if (!movieTitle) return { ok: false, code: "NO_FAVORITE_MOVIE" };

  if (!isOpenAIConfigured()) return { ok: false, code: "NOT_CONFIGURED" };

  const latest = await prisma.movieFact.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < FACT_COOLDOWN_MS) {
    return { ok: false, code: "COOLDOWN" };
  }

  const recent = await prisma.movieFact.findMany({
    where: { userId, movieTitle },
    orderBy: { createdAt: "desc" },
    take: AVOID_RECENT_FACTS,
    select: { content: true },
  });

  let result;
  try {
    result = await generateMovieFactText(movieTitle, recent.map((fact) => fact.content));
  } catch (error) {
    const code: FactErrorCode =
      error instanceof RateLimitError
        ? "RATE_LIMITED"
        : error instanceof APIConnectionTimeoutError
          ? "TIMEOUT"
          : "UPSTREAM_ERROR";
    console.error("generateFact: OpenAI request failed", {
      userId,
      code,
      error: error instanceof Error ? error.constructor.name : "UnknownError",
      status: (error as { status?: unknown })?.status,
    });
    return { ok: false, code };
  }

  if (result.kind === "unknown") return { ok: false, code: "UNKNOWN_MOVIE" };
  if (result.kind === "invalid") {
    console.error("generateFact: invalid model output", { userId, reason: result.reason });
    return { ok: false, code: "UPSTREAM_ERROR" };
  }

  // Saved under the title actually used, even if the user changed movies meanwhile.
  const fact = await prisma.movieFact.create({
    data: { userId, movieTitle, content: result.text },
    select: factSelect,
  });

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { favoriteMovie: true },
  });
  if (current?.favoriteMovie !== movieTitle) {
    return { ok: false, code: "MOVIE_CHANGED" };
  }

  return { ok: true, fact: toView(fact) };
}
