import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify } from "./slug.ts";

test("folds Turkish characters to ASCII", () => {
  assert.equal(slugify("Çalıkuşu Şarkısı"), "calikusu-sarkisi");
});

test("collapses punctuation and trims separators", () => {
  assert.equal(slugify("  The Wind — & the Willows!  "), "the-wind-the-willows");
});

test("falls back rather than returning an empty slug", () => {
  assert.equal(slugify("!!!"), "book");
});
