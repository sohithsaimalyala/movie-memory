import type { ApiErrorBody, ApiErrorCode } from "@/lib/api-types";

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonOk<T>(body: T, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  headers: Record<string, string> = {},
): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export const unauthorized = () => jsonError(401, "UNAUTHORIZED", "Sign in required.");
