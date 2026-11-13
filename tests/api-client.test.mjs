import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, request } from "../src/lib/api-client.ts";

const json = (status, body) => () => Promise.resolve(new Response(JSON.stringify(body), { status }));

test("returns parsed JSON on success and sends same-origin credentials", async () => {
  let seen;
  const fetchImpl = (url, init) => {
    seen = init;
    return Promise.resolve(new Response(JSON.stringify({ favoriteMovie: "Up" }), { status: 200 }));
  };
  assert.deepEqual(await request("/api/me/movie", { method: "PUT" }, fetchImpl), { favoriteMovie: "Up" });
  assert.equal(seen.credentials, "same-origin");
  assert.equal(seen.headers.Accept, "application/json");
});

test("normalizes API error bodies into ApiError with status and code", async () => {
  const fetchImpl = json(422, { error: { code: "VALIDATION_ERROR", message: "Enter a movie title." } });
  await assert.rejects(request("/api/me/movie", {}, fetchImpl), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 422);
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.equal(error.message, "Enter a movie title.");
    return true;
  });
});

test("401 responses keep the UNAUTHORIZED code", async () => {
  const fetchImpl = json(401, { error: { code: "UNAUTHORIZED", message: "Sign in required." } });
  await assert.rejects(request("/api/me", {}, fetchImpl), { name: "ApiError", status: 401, code: "UNAUTHORIZED" });
});

test("non-JSON error responses become HTTP_ERROR with a generic message", async () => {
  const fetchImpl = () => Promise.resolve(new Response("<html>Bad gateway</html>", { status: 502 }));
  await assert.rejects(request("/api/fact", {}, fetchImpl), { status: 502, code: "HTTP_ERROR" });
});

test("error bodies with an unexpected shape become HTTP_ERROR", async () => {
  await assert.rejects(request("/api/fact", {}, json(500, { oops: true })), { status: 500, code: "HTTP_ERROR" });
});

test("invalid JSON on a 2xx response becomes INVALID_RESPONSE", async () => {
  const fetchImpl = () => Promise.resolve(new Response("not json", { status: 200 }));
  await assert.rejects(request("/api/me", {}, fetchImpl), { status: 200, code: "INVALID_RESPONSE" });
});

test("network failures become NETWORK_ERROR with status 0", async () => {
  const fetchImpl = () => Promise.reject(new TypeError("Failed to fetch"));
  await assert.rejects(request("/api/me", {}, fetchImpl), { status: 0, code: "NETWORK_ERROR" });
});
