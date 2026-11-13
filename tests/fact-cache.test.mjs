import { test } from "node:test";
import assert from "node:assert/strict";
import { FACT_CACHE_TTL_MS, createFactCache, factCacheKey } from "../src/lib/fact-cache.ts";

const fact = (movieTitle, content) => ({ id: content, movieTitle, content, createdAt: "2026-01-01T00:00:00.000Z" });

function setup() {
  let now = 1_000;
  const cache = createFactCache(() => now);
  const calls = [];
  const fetcher = (result) => () => {
    calls.push(result.content);
    return Promise.resolve(result);
  };
  return { cache, calls, fetcher, advance: (ms) => (now += ms) };
}

const KEY = factCacheKey("user-1", "Interstellar");

test("keys are scoped by user and movie", () => {
  assert.notEqual(factCacheKey("user-1", "Up"), factCacheKey("user-2", "Up"));
  assert.notEqual(factCacheKey("user-1", "Up"), factCacheKey("user-1", "Heat"));
});

test("cache hit within 30 seconds avoids a second request", async () => {
  const { cache, calls, fetcher, advance } = setup();
  await cache.load(KEY, fetcher(fact("Interstellar", "a")));
  advance(FACT_CACHE_TTL_MS - 1);
  const hit = await cache.load(KEY, fetcher(fact("Interstellar", "b")));
  assert.equal(hit.content, "a");
  assert.deepEqual(calls, ["a"]);
});

test("entries expire after 30 seconds", async () => {
  const { cache, calls, fetcher, advance } = setup();
  await cache.load(KEY, fetcher(fact("Interstellar", "a")));
  advance(FACT_CACHE_TTL_MS);
  const fresh = await cache.load(KEY, fetcher(fact("Interstellar", "b")));
  assert.equal(fresh.content, "b");
  assert.deepEqual(calls, ["a", "b"]);
});

test("refresh bypasses a valid cache entry and updates it", async () => {
  const { cache, calls, fetcher } = setup();
  await cache.load(KEY, fetcher(fact("Interstellar", "a")));
  const refreshed = await cache.load(KEY, fetcher(fact("Interstellar", "b")), { refresh: true });
  assert.equal(refreshed.content, "b");
  assert.equal(cache.get(KEY).content, "b");
  assert.deepEqual(calls, ["a", "b"]);
});

test("invalidate removes the entry", async () => {
  const { cache, fetcher } = setup();
  await cache.load(KEY, fetcher(fact("Interstellar", "a")));
  cache.invalidate(KEY);
  assert.equal(cache.get(KEY), null);
});

test("concurrent loads for one key share a single request", async () => {
  const { cache } = setup();
  let calls = 0;
  let resolve;
  const slow = () => {
    calls += 1;
    return new Promise((r) => (resolve = r));
  };
  const first = cache.load(KEY, slow);
  const second = cache.load(KEY, slow);
  resolve(fact("Interstellar", "a"));
  assert.deepEqual(await Promise.all([first, second]), [fact("Interstellar", "a"), fact("Interstellar", "a")]);
  assert.equal(calls, 1);
});

test("a request finishing after invalidation does not repopulate the cache", async () => {
  const { cache } = setup();
  let resolve;
  const pending = cache.load(KEY, () => new Promise((r) => (resolve = r)));
  cache.invalidate(KEY); // e.g. the user changed movies mid-request
  resolve(fact("Interstellar", "stale"));
  await pending;
  assert.equal(cache.get(KEY), null);
});

test("failed loads are not cached", async () => {
  const { cache, fetcher } = setup();
  await assert.rejects(cache.load(KEY, () => Promise.reject(new Error("boom"))));
  assert.equal(cache.get(KEY), null);
  const ok = await cache.load(KEY, fetcher(fact("Interstellar", "a")));
  assert.equal(ok.content, "a");
});
