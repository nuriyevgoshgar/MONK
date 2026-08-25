"use client";

import { useEffect, useState } from "react";
import { PlayIcon } from "@/components/icons";
import { usePlayerActions, usePlayerStatus } from "@/components/player/player-context";
import { getDeviceId } from "@/lib/device-id";
import { formatClock } from "@/lib/format";
import type { PlayerBook, SavedProgress } from "@/lib/player/types";

// Progress lives against a device id held in the browser, so where to resume
// can only be worked out on the client.
export function BookActions({ book }: { book: PlayerBook }) {
  const { playBook } = usePlayerActions();
  const { book: playingBook, isPlaying } = usePlayerStatus();
  const [saved, setSaved] = useState<SavedProgress | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const userId = getDeviceId();

    fetch(
      `/api/progress?userId=${encodeURIComponent(userId)}&bookId=${encodeURIComponent(book.id)}`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((data: { progress: SavedProgress | null }) => setSaved(data.progress))
      .catch(() => {
        // No saved position — the button just says "Play".
      });

    return () => controller.abort();
  }, [book.id]);

  const isCurrent = playingBook?.id === book.id;
  const resumable = saved && !saved.finished && saved.positionSec > 0;

  const label = isCurrent && isPlaying
    ? "Playing"
    : resumable
      ? `Resume at ${formatClock(saved.positionSec)}`
      : "Play";

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() =>
          playBook(book, saved?.chapterIndex ?? 0, saved?.positionSec ?? 0)
        }
        className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-base font-medium text-background"
      >
        <PlayIcon className="h-5 w-5" />
        {label}
      </button>

      {resumable && (
        <p className="mt-2 text-center text-xs text-muted">
          Chapter {(saved.chapterIndex ?? 0) + 1} ·{" "}
          {book.chapters[saved.chapterIndex]?.title}
        </p>
      )}
    </div>
  );
}
