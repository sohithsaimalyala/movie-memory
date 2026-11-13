import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { validateMovieTitle } from "@/lib/movie-title";
import { jsonError, jsonOk, unauthorized } from "@/lib/api-response";
import type { UpdateMovieResponse } from "@/lib/api-types";

// Updates the signed-in user's favorite movie. The user always comes from the session;
// any user id in the body is ignored.
export async function PUT(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  // Requiring JSON also blocks simple cross-site form posts.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request body as JSON.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body is not valid JSON.");
  }

  const title = typeof body === "object" && body !== null ? (body as { title?: unknown }).title : undefined;
  const result = validateMovieTitle(title);
  if (!result.ok) {
    return jsonError(422, "VALIDATION_ERROR", result.error);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { favoriteMovie: result.value },
      select: { favoriteMovie: true },
    });
    const response: UpdateMovieResponse = { favoriteMovie: updated.favoriteMovie ?? result.value };
    return jsonOk(response);
  } catch (error) {
    console.error("PUT /api/me/movie: update failed", {
      userId: user.id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError(500, "INTERNAL_ERROR", "We couldn't save your movie. Please try again.");
  }
}
