"use server";

import { redirect } from "next/navigation";
import {
  generateFact,
  getLatestFactForCurrentMovie,
  type FactErrorCode,
  type MovieFactView,
} from "@/lib/facts";
import { getSessionUser } from "@/lib/session";

export type FactPanelState = {
  fact: MovieFactView | null;
  error: string | null;
};

const ERROR_MESSAGES: Record<Exclude<FactErrorCode, "NO_FAVORITE_MOVIE">, string> = {
  NOT_CONFIGURED: "Fun facts aren't available right now.",
  COOLDOWN: "Please wait a few seconds before getting another fact.",
  RATE_LIMITED: "Too many requests right now. Please try again in a moment.",
  TIMEOUT: "That took too long. Please try again.",
  UNKNOWN_MOVIE: "We couldn't find reliable facts about this title.",
  MOVIE_CHANGED: "Your favorite movie changed. Generate a fact for your new movie.",
  UPSTREAM_ERROR: "Something went wrong generating a fact. Please try again.",
};

// Uses no client input: the user comes from the session and the movie from the database.
// The previous state is ignored because useActionState sends it from the browser.
export async function generateFactAction(): Promise<FactPanelState> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  const result = await generateFact(user.id);
  if (result.ok) {
    return { fact: result.fact, error: null };
  }
  if (result.code === "NO_FAVORITE_MOVIE") {
    redirect("/onboarding");
  }

  // Keep showing the latest saved fact for the user's current movie, read from the database.
  const fact = await getLatestFactForCurrentMovie(user.id);
  return { fact, error: ERROR_MESSAGES[result.code] };
}
