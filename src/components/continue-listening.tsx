"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PlayIcon } from "@/components/icons";
import { usePlayerActions } from "@/components/player/player-context";
import { getDeviceId } from "@/lib/device-id";
import { formatClock } from "@/lib/format";
import type { SavedProgress } from "@/lib/player/types";

// Reads the listener's most recent position. Client-side because the device
// id that identifies them only exists in the browser.
export function ContinueListening() {
  const { playBook } = usePlayerActions();
  const [saved, setSaved] = useState<SavedProgress | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/progress?userId=${encodeURIComponent(getDeviceId())}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data: { progress: SavedProgress | null }) => setSaved(data.progress))
      .catch(() => {
        // Nothing to continue — the section stays hidden.
      });

    return () => controller.abort();
  }, []);

  if (!saved) return null;

  const chapter = saved.book.chapters[saved.chapterIndex];
  if (!chapter) return null;

  const percent = Math.min(100, (saved.positionSec / chapter.duration) * 100);

  return (
    <section className="mb-8">
      <h2 className="text-xs uppercase tracking-[0.15em] text-muted">
        Continue listening
      </h2>

      <button
        type="button"
        onClick={() => playBook(saved.book, saved.chapterIndex, saved.positionSec)}
        className="mt-3 flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left"
      >
        <Image
          src={saved.book.coverUrl}
          alt=""
          width={64}
          height={64}
          unoptimized={saved.book.coverUrl.endsWith(".svg")}
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-lg">
            {saved.book.title}
          </span>
          <span className="block truncate text-xs text-muted">
            {chapter.title}
          </span>
          <span className="mt-2 block h-1 w-full rounded-full bg-surface-raised">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${percent}%` }}
            />
          </span>
          <span className="mt-1 block text-[11px] text-muted">
            {saved.finished ? "Finished" : `Resume at ${formatClock(saved.positionSec)}`}
          </span>
        </span>
        <PlayIcon className="h-6 w-6 shrink-0 text-accent" />
      </button>
    </section>
  );
}
