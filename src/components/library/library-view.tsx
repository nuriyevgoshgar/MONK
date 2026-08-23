"use client";

import { useEffect, useState } from "react";
import { BookCard } from "@/components/book-card";
import { DownloadedBooks } from "@/components/library/downloaded-books";
import type { BookSummary } from "@/lib/book-summary";
import { SHELF_LABELS, SHELF_STATUSES, type ShelfStatus } from "@/lib/shelf";
import { useDeviceId } from "@/lib/use-device-id";

type ShelfEntry = { status: string; book: BookSummary };

const EMPTY_COPY: Record<ShelfStatus, string> = {
  saved: "Nothing saved yet. Tap Save on a book to keep it for later.",
  listening: "Nothing in progress. Books land here as soon as you press play.",
  done: "No finished books yet. They arrive here when you reach the end.",
};

export function LibraryView() {
  const userId = useDeviceId();
  const [entries, setEntries] = useState<ShelfEntry[] | null>(null);
  const [tab, setTab] = useState<ShelfStatus>("listening");

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    fetch(`/api/shelf?userId=${encodeURIComponent(userId)}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data: { entries: ShelfEntry[] }) => setEntries(data.entries))
      .catch(() => setEntries([]));

    return () => controller.abort();
  }, [userId]);

  const visible = (entries ?? []).filter((entry) => entry.status === tab);

  return (
    <div className="flex flex-1 flex-col">
      <div
        role="tablist"
        aria-label="Shelves"
        className="flex gap-1 rounded-2xl border border-border bg-surface p-1"
      >
        {SHELF_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={tab === status}
            onClick={() => setTab(status)}
            className={`tap flex-1 rounded-xl text-sm ${
              tab === status ? "bg-accent text-background" : "text-muted"
            }`}
          >
            {SHELF_LABELS[status]}
          </button>
        ))}
      </div>

      {entries === null ? (
        <ul className="mt-4 flex flex-col gap-4" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <li
              key={key}
              className="h-30 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="font-serif text-lg">{SHELF_LABELS[tab]}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {EMPTY_COPY[tab]}
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {visible.map((entry) => (
            <li key={entry.book.id}>
              <BookCard book={entry.book} />
            </li>
          ))}
        </ul>
      )}

      <DownloadedBooks />
    </div>
  );
}
