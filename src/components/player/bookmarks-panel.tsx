"use client";

import { useCallback, useEffect, useState } from "react";
import { BookmarkIcon, TrashIcon } from "@/components/icons";
import { formatClock } from "@/lib/format";
import { useDeviceId } from "@/lib/use-device-id";
import {
  usePlayerActions,
  usePlayerStatus,
  usePlayerTime,
} from "./player-context";

type Bookmark = {
  id: string;
  chapterId: string;
  positionSec: number;
  note: string | null;
  chapter: { index: number; title: string };
};

export function BookmarksPanel() {
  const { book, chapter } = usePlayerStatus();
  const { goToChapter, seekTo } = usePlayerActions();
  const { position } = usePlayerTime();
  const userId = useDeviceId();
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);

  const bookId = book?.id;

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!userId || !bookId) return;

      fetch(
        `/api/bookmarks?userId=${encodeURIComponent(userId)}&bookId=${encodeURIComponent(bookId)}`,
        { signal },
      )
        .then((response) => response.json())
        .then((data: { bookmarks: Bookmark[] }) => setBookmarks(data.bookmarks))
        .catch(() => {
          // Offline or aborted — leave whatever is on screen.
        });
    },
    [userId, bookId],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const add = async () => {
    if (!userId || !book || !chapter) return;

    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        bookId: book.id,
        chapterId: chapter.id,
        positionSec: Math.floor(position),
      }),
    });

    load();
  };

  const remove = async (id: string) => {
    if (!userId) return;

    setBookmarks((current) => current?.filter((mark) => mark.id !== id) ?? null);
    await fetch(
      `/api/bookmarks?userId=${encodeURIComponent(userId)}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  };

  const jumpTo = (mark: Bookmark) => {
    if (mark.chapter.index !== chapter?.index) goToChapter(mark.chapter.index);
    // The chapter change queues its own seek, so wait for it to settle.
    setTimeout(() => seekTo(mark.positionSec), 150);
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-xs uppercase tracking-[0.15em] text-muted">
        Bookmarks
      </h3>

      <button
        type="button"
        onClick={add}
        className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm text-background"
      >
        <BookmarkIcon className="h-4 w-4" />
        Bookmark {formatClock(position)}
      </button>

      {bookmarks && bookmarks.length > 0 ? (
        <ul className="mt-3 max-h-48 overflow-y-auto">
          {bookmarks.map((mark) => (
            <li key={mark.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => jumpTo(mark)}
                className="tap min-w-0 flex-1 rounded-xl px-2 text-left text-sm"
              >
                <span className="block truncate">{mark.chapter.title}</span>
                <span className="block text-xs text-muted">
                  {formatClock(mark.positionSec)}
                  {mark.note ? ` · ${mark.note}` : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => remove(mark.id)}
                aria-label="Delete bookmark"
                className="tap flex shrink-0 items-center justify-center text-muted"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted">
          No bookmarks in this book yet.
        </p>
      )}
    </section>
  );
}
