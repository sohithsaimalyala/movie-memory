import { test } from "node:test";
import assert from "node:assert/strict";
import { MOVIE_TITLE_MAX_LENGTH, validateMovieTitle } from "../src/lib/movie-title.ts";

test("trims surrounding whitespace", () => {
  assert.deepEqual(validateMovieTitle("  Inception  "), { ok: true, value: "Inception" });
});

test("rejects non-strings, empty, and whitespace-only input", () => {
  for (const input of [undefined, null, 42, {}, "", "   ", "  "]) {
    assert.equal(validateMovieTitle(input).ok, false, JSON.stringify(input));
  }
});

test("allows exactly 200 code points, including emoji", () => {
  assert.equal(validateMovieTitle("a".repeat(MOVIE_TITLE_MAX_LENGTH)).ok, true);
  // 200 emoji are 400 UTF-16 units but 200 code points, matching VARCHAR(200).
  assert.equal(validateMovieTitle("🎬".repeat(200)).ok, true);
});

test("rejects more than 200 code points", () => {
  assert.equal(validateMovieTitle("a".repeat(201)).ok, false);
  assert.equal(validateMovieTitle("🎬".repeat(201)).ok, false);
});

test("rejects control characters inside the title", () => {
  for (const input of ["Star\nWars", "Star\tWars", "Star\u0000Wars"]) {
    const result = validateMovieTitle(input);
    assert.equal(result.ok, false);
    assert.match(result.error, /control characters/);
  }
});

test("accepts non-Latin titles", () => {
  assert.deepEqual(validateMovieTitle("千と千尋の神隠し"), { ok: true, value: "千と千尋の神隠し" });
});
