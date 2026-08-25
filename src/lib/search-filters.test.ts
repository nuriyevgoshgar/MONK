import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DURATION_BUCKETS,
  buildSearchParams,
  durationRange,
  hasActiveFilters,
  NO_FILTERS,
  readFilters,
} from "./search-filters.ts";

test("no filters is not active", () => {
  assert.equal(hasActiveFilters(NO_FILTERS), false);
});

test("any single filter makes it active", () => {
  assert.equal(hasActiveFilters({ ...NO_FILTERS, language: "German" }), true);
  assert.equal(hasActiveFilters({ ...NO_FILTERS, category: "Poetry" }), true);
  assert.equal(hasActiveFilters({ ...NO_FILTERS, duration: "short" }), true);
});

test("omits empty values from the query string", () => {
  assert.equal(buildSearchParams("", NO_FILTERS).toString(), "");
  assert.equal(buildSearchParams("twain", NO_FILTERS).toString(), "q=twain");
});

test("carries every set filter into the query string", () => {
  const params = buildSearchParams("twain", {
    language: "English",
    category: "Poetry",
    duration: "short",
  });

  assert.equal(params.get("q"), "twain");
  assert.equal(params.get("language"), "English");
  assert.equal(params.get("category"), "Poetry");
  assert.equal(params.get("duration"), "short");
});

test("round-trips through the query string", () => {
  const filters = {
    language: "German",
    category: "Children's Fiction",
    duration: "long" as const,
  };

  assert.deepEqual(readFilters(buildSearchParams("", filters)), filters);
});

test("falls back to 'any' for a duration bucket it does not know", () => {
  const params = new URLSearchParams({ duration: "forever" });
  assert.equal(readFilters(params).duration, "any");
});

test("reads missing filters as blank rather than null", () => {
  assert.deepEqual(readFilters(new URLSearchParams()), NO_FILTERS);
});

test("trims whitespace out of filter values", () => {
  const params = new URLSearchParams({ language: "  German  " });
  assert.equal(readFilters(params).language, "German");
});

test("'any' has no range, so it never narrows the query", () => {
  assert.equal(durationRange("any"), null);
  assert.equal(durationRange("nonsense"), null);
});

test("buckets tile the range without overlapping", () => {
  // Half-open [min, max): a book of exactly one hour belongs to "1 - 3 hours"
  // and to nothing else. An overlap here would double-count books.
  const ranges = DURATION_BUCKETS.filter((b) => b.range !== null).map(
    (b) => b.range!,
  );

  for (let i = 0; i < ranges.length - 1; i++) {
    assert.equal(
      ranges[i].max,
      ranges[i + 1].min,
      "each bucket must end exactly where the next begins",
    );
  }

  assert.equal(ranges[0].min, 0, "the first bucket starts at zero");
  assert.equal(ranges.at(-1)?.max, null, "the last bucket is open-ended");
});

test("under an hour means strictly under 3600 seconds", () => {
  assert.deepEqual(durationRange("short"), { min: 0, max: 3600 });
});
