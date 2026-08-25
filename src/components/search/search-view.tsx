"use client";

import { useEffect, useState } from "react";
import { BookCard } from "@/components/book-card";
import { SearchIcon } from "@/components/icons";
import { SearchFilterBar } from "@/components/search/search-filters";
import { BookListSkeleton } from "@/components/skeletons";
import type { BookSummary } from "@/lib/book-summary";
import type { SearchFacets } from "@/lib/facets";
import {
  buildSearchParams,
  hasActiveFilters,
  NO_FILTERS,
  type SearchFilters,
} from "@/lib/search-filters";

const DEBOUNCE_MS = 150;

// Results are stored together with the query string that produced them, so
// "are we still searching?" is derived rather than tracked in its own state.
// The key covers the filters too: changing one has to invalidate the results
// exactly the way changing the search term does.
type Results = { key: string; books: BookSummary[]; took: number };

export function SearchView({ facets }: { facets: SearchFacets }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS);
  const [results, setResults] = useState<Results | null>(null);

  const trimmed = query.trim();
  const key = buildSearchParams(trimmed, filters).toString();

  // A blank term with a filter set is still a search: it means "show me
  // everything in this category".
  const searching = trimmed !== "" || hasActiveFilters(filters);
  // Null while a request for the current key is in flight, which is also what
  // drives the loading skeletons below.
  const current = searching && results?.key === key ? results : null;

  useEffect(() => {
    if (!searching) return;

    const controller = new AbortController();

    // Debounced so typing does not fire a request per keystroke.
    const timer = setTimeout(() => {
      fetch(`/api/search?${key}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data: { books: BookSummary[]; took: number }) =>
          setResults({ key, books: data.books, took: data.took }),
        )
        .catch(() => {
          // Aborted by the next keystroke, or offline.
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, searching]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Title, author, narrator, category"
          aria-label="Search the catalogue"
          autoComplete="off"
          className="tap w-full rounded-2xl border border-border bg-surface py-3 pr-4 pl-12 text-base
            placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <SearchFilterBar
        facets={facets}
        filters={filters}
        onChange={setFilters}
      />

      <div aria-live="polite" className="flex flex-1 flex-col">
        {!searching ? (
          <p className="mt-6 text-sm text-muted">
            Search by title, author, narrator or category — or pick a filter to
            browse.
          </p>
        ) : current === null ? (
          <div className="mt-6">
            <BookListSkeleton count={3} />
          </div>
        ) : current.books.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="font-serif text-lg">Nothing found</p>
            <p className="mt-2 text-sm text-muted">
              {trimmed === ""
                ? "No book matches these filters. Try widening one."
                : `No book matches “${trimmed}”. Try an author, or clear a filter.`}
            </p>
          </div>
        ) : (
          <>
            <h2 className="sr-only">Search results</h2>
            <p className="mt-4 text-xs text-muted">
              {current.books.length}{" "}
              {current.books.length === 1 ? "result" : "results"} ·{" "}
              {current.took}ms
            </p>
            <ul className="mt-3 flex flex-col gap-4">
              {current.books.map((book) => (
                <li key={book.id}>
                  <BookCard book={book} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
