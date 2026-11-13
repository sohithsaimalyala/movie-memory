import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../src/lib/api-client.ts";
import { saveMovieOptimistically } from "../src/lib/optimistic-movie.ts";

test("shows the new title immediately, then applies the server value", async () => {
  const shown = [];
  let resolvePersist;
  const promise = saveMovieOptimistically({
    previous: "Up",
    next: "Heat",
    apply: (title) => shown.push(title),
    persist: () => new Promise((r) => (resolvePersist = r)),
  });
  assert.deepEqual(shown, ["Heat"]); // optimistic before the request resolves
  resolvePersist({ favoriteMovie: "Heat" });
  assert.deepEqual(await promise, { ok: true, saved: "Heat" });
  assert.deepEqual(shown, ["Heat", "Heat"]);
});

test("rolls back and surfaces the API message when the request fails", async () => {
  const shown = [];
  const result = await saveMovieOptimistically({
    previous: "Up",
    next: "Heat",
    apply: (title) => shown.push(title),
    persist: () => Promise.reject(new ApiError(422, "VALIDATION_ERROR", "Enter a movie title.")),
  });
  assert.deepEqual(result, { ok: false, error: "Enter a movie title." });
  assert.deepEqual(shown, ["Heat", "Up"]);
});

test("unexpected errors roll back with a generic message", async () => {
  const shown = [];
  const result = await saveMovieOptimistically({
    previous: "Up",
    next: "Heat",
    apply: (title) => shown.push(title),
    persist: () => Promise.reject(new Error("socket hang up")),
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "We couldn't save your movie. Please try again.");
  assert.deepEqual(shown, ["Heat", "Up"]);
});
