import type { Fact } from "@/lib/api-types";

export const FACT_CACHE_TTL_MS = 30_000;

type Entry = { fact: Fact; expiresAt: number };

/**
 * In-memory client cache for facts, keyed by user and movie title.
 * - Entries expire after the TTL.
 * - Concurrent loads for the same key share one request.
 * - invalidate() also discards results from requests still in flight.
 */
export function createFactCache(now: () => number = Date.now, ttlMs = FACT_CACHE_TTL_MS) {
  const entries = new Map<string, Entry>();
  const inFlight = new Map<string, Promise<Fact>>();
  const generations = new Map<string, number>();

  function get(key: string): Fact | null {
    const entry = entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return null;
    }
    return entry.fact;
  }

  function set(key: string, fact: Fact): void {
    entries.set(key, { fact, expiresAt: now() + ttlMs });
  }

  function invalidate(key: string): void {
    entries.delete(key);
    generations.set(key, (generations.get(key) ?? 0) + 1);
  }

  function load(key: string, fetcher: () => Promise<Fact>, options: { refresh?: boolean } = {}): Promise<Fact> {
    const refresh = options.refresh ?? false;
    if (!refresh) {
      const hit = get(key);
      if (hit) return Promise.resolve(hit);
    }

    const flightKey = refresh ? `${key}\u0000refresh` : key;
    const pending = inFlight.get(flightKey);
    if (pending) return pending;

    const generation = generations.get(key) ?? 0;
    const promise = fetcher()
      .then((fact) => {
        if ((generations.get(key) ?? 0) === generation) set(key, fact);
        return fact;
      })
      .finally(() => inFlight.delete(flightKey));
    inFlight.set(flightKey, promise);
    return promise;
  }

  return { get, set, invalidate, load };
}

export type FactCache = ReturnType<typeof createFactCache>;

export const factCache = createFactCache();

export function factCacheKey(userId: string, movieTitle: string): string {
  return `${userId}\u0000${movieTitle}`;
}
