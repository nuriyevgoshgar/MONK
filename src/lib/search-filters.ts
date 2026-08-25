// Filter definitions shared by the search API and the search UI, so the two
// cannot disagree about what "under an hour" means or how a filter is spelled
// in the query string.

export type DurationBucket = "any" | "short" | "medium" | "long" | "epic";

/** Seconds. `max: null` means "no upper bound". */
export type DurationRange = { min: number; max: number | null };

const HOUR = 3600;

export const DURATION_BUCKETS: {
  id: DurationBucket;
  label: string;
  range: DurationRange | null;
}[] = [
  { id: "any", label: "Any length", range: null },
  { id: "short", label: "Under 1 hour", range: { min: 0, max: HOUR } },
  { id: "medium", label: "1 – 3 hours", range: { min: HOUR, max: 3 * HOUR } },
  { id: "long", label: "3 – 10 hours", range: { min: 3 * HOUR, max: 10 * HOUR } },
  { id: "epic", label: "Over 10 hours", range: { min: 10 * HOUR, max: null } },
];

export type SearchFilters = {
  language: string;
  category: string;
  duration: DurationBucket;
};

export const NO_FILTERS: SearchFilters = {
  language: "",
  category: "",
  duration: "any",
};

/** True when at least one filter would narrow the result set. */
export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.language !== "" ||
    filters.category !== "" ||
    filters.duration !== "any"
  );
}

/** Null for "any", and for a bucket id that is not one of ours. */
export function durationRange(bucket: string): DurationRange | null {
  return DURATION_BUCKETS.find((b) => b.id === bucket)?.range ?? null;
}

/**
 * The query string for a search. Empty values are omitted rather than sent
 * blank, which keeps the URL readable and the cache key stable.
 */
export function buildSearchParams(
  query: string,
  filters: SearchFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (query !== "") params.set("q", query);
  if (filters.language !== "") params.set("language", filters.language);
  if (filters.category !== "") params.set("category", filters.category);
  if (filters.duration !== "any") params.set("duration", filters.duration);

  return params;
}

/** Reads filters back out of a request, ignoring anything unrecognised. */
export function readFilters(params: URLSearchParams): SearchFilters {
  const duration = params.get("duration") ?? "any";

  return {
    language: params.get("language")?.trim() ?? "",
    category: params.get("category")?.trim() ?? "",
    duration: DURATION_BUCKETS.some((b) => b.id === duration)
      ? (duration as DurationBucket)
      : "any",
  };
}
