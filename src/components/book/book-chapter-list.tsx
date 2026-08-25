"use client";

import { PlayIcon } from "@/components/icons";
import { usePlayerActions, usePlayerStatus } from "@/components/player/player-context";
import { formatDuration } from "@/lib/format";
import type { PlayerBook } from "@/lib/player/types";

export function BookChapterList({ book }: { book: PlayerBook }) {
  const { playBook } = usePlayerActions();
  const { book: playingBook, chapterIndex, isPlaying } = usePlayerStatus();

  return (
    <section className="mt-8">
      <h2 className="text-xs uppercase tracking-[0.15em] text-muted">
        {book.chapters.length} chapters
      </h2>

      <ol className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {book.chapters.map((chapter) => {
          const current =
            playingBook?.id === book.id && chapterIndex === chapter.index;

          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => playBook(book, chapter.index, 0)}
                className="tap flex w-full items-center gap-3 px-4 text-left"
              >
                <span
                  className={`w-6 shrink-0 text-xs tabular-nums ${
                    current ? "text-accent" : "text-muted"
                  }`}
                >
                  {current && isPlaying ? (
                    <PlayIcon className="h-4 w-4" />
                  ) : (
                    chapter.index + 1
                  )}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    current ? "text-accent" : ""
                  }`}
                >
                  {chapter.title}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatDuration(chapter.duration)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
