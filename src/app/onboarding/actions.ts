"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { validateMovieTitle } from "@/lib/movie-title";

export type OnboardingState = { error: string | null; title: string };

export async function saveFavoriteMovie(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  // Server actions are reachable by direct POST, so authenticate here too.
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  const raw = formData.get("title");
  const submitted = typeof raw === "string" ? raw : "";
  const result = validateMovieTitle(raw);
  if (!result.ok) {
    return { error: result.error, title: submitted };
  }

  try {
    // Write-once: onboarding only fills an empty favorite movie for this user.
    await prisma.user.updateMany({
      where: { id: user.id, favoriteMovie: null },
      data: { favoriteMovie: result.value },
    });
  } catch (error) {
    console.error("saveFavoriteMovie: database update failed", {
      userId: user.id,
      error: error instanceof Error ? error.name : "UnknownError",
      code: (error as { code?: unknown })?.code,
    });
    return { error: "We couldn't save your movie. Please try again.", title: submitted };
  }

  // Outside try/catch: redirect() works by throwing.
  redirect("/dashboard");
}
