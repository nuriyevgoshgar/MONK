"use client";

import type { SearchFacets } from "@/lib/facets";
import {
  DURATION_BUCKETS,
  type DurationBucket,
  type SearchFilters,
  hasActiveFilters,
  NO_FILTERS,
} from "@/lib/search-filters";

const SELECT_CLASS =
  "tap min-w-0 flex-1 appearance-none rounded-xl border border-border bg-surface " +
  "px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none";

type Props = {
  facets: SearchFacets;
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
};

export function SearchFilterBar({ facets, filters, onChange }: Props) {
  const active = hasActiveFilters(filters);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.language}
          onChange={(event) =>
            onChange({ ...filters, language: event.target.value })
          }
          aria-label="Filter by language"
          className={SELECT_CLASS}
        >
          <option value="">Any language</option>
          {facets.languages.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(event) =>
            onChange({ ...filters, category: event.target.value })
          }
          aria-label="Filter by category"
          className={SELECT_CLASS}
        >
          <option value="">Any category</option>
          {facets.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={filters.duration}
          onChange={(event) =>
            onChange({
              ...filters,
              duration: event.target.value as DurationBucket,
            })
          }
          aria-label="Filter by length"
          className={SELECT_CLASS}
        >
          {DURATION_BUCKETS.map((bucket) => (
            <option key={bucket.id} value={bucket.id}>
              {bucket.label}
            </option>
          ))}
        </select>
      </div>

      {active && (
        <button
          type="button"
          onClick={() => onChange(NO_FILTERS)}
          className="tap mt-2 text-xs text-accent underline underline-offset-4"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
