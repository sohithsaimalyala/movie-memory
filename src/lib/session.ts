import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type CurrentUser = SessionUser & { favoriteMovie: string | null };

// The only way pages and API routes should identify the current user.
// cache() dedupes the database session lookup within a single request.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id, name, email, image } = session.user;
  return { id, name: name ?? null, email: email ?? null, image: image ?? null };
});

// Session user plus app data used for routing (onboarding vs dashboard).
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const row = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { favoriteMovie: true },
  });
  if (!row) return null;

  return { ...sessionUser, favoriteMovie: row.favoriteMovie };
});
