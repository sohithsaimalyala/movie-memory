import "server-only";
import { cache } from "react";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

// The only way pages and API routes should identify the current user.
// cache() dedupes the database session lookup within a single request.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id, name, email, image } = session.user;
  return { id, name: name ?? null, email: email ?? null, image: image ?? null };
});
