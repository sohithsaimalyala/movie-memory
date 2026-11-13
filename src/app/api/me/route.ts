import { getCurrentUser } from "@/lib/session";
import { jsonOk, unauthorized } from "@/lib/api-response";
import type { MeResponse } from "@/lib/api-types";

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body: MeResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    favoriteMovie: user.favoriteMovie,
  };
  return jsonOk(body);
}
