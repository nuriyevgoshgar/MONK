"use client";

import { useEffect, useState } from "react";
import { BookCard } from "@/components/book-card";
import { SearchIcon } from "@/components/icons";
import type { BookSummary } from "@/lib/book-summary";

const DEBOUNCE_MS = 150;

// Results are stored together with the query they answer, so "are we still
// searching?" is derived rather than tracked in its own state.
type Results = { query: string; books: BookSummary[]; took: number };

export function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);

  const trimmed = query.trim();
  // Null while a search is in flight for the current term, which is also what
  // drives the loading skeletons below.
  const current = results && results.query === trimmed ? results : null;

  useEffect(() => {
    const term = query.trim();
    if (term === "") return;

    const controller = new AbortController();

    // Debounced so typing does not fire a request per keystroke.
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((data: { books: BookSummary[]; took: number }) =>
          setResults({ query: term, books: data.books, took: data.took }),
        )
        .catch(() => {
          // Aborted by the next keystroke, or offline.
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

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

      <div aria-live="polite" className="flex flex-1 flex-col">
        {trimmed === "" ? (
          <p className="mt-6 text-sm text-muted">
            Search by title, author, narrator or category.
          </p>
        ) : current === null ? (
          <ul className="mt-6 flex flex-col gap-4" aria-hidden="true">
            {[0, 1, 2].map((key) => (
              <li
                key={key}
                className="h-30 animate-pulse rounded-2xl border border-border bg-surface"
              />
            ))}
          </ul>
        ) : current.books.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="font-serif text-lg">Nothing found</p>
            <p className="mt-2 text-sm text-muted">
              No book matches “{trimmed}”. Try an author or a category.
            </p>
          </div>
        ) : (
          <>
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
