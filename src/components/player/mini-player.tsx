"use client";

import Image from "next/image";
import { PauseIcon, PlayIcon } from "@/components/icons";
import {
  usePlayerActions,
  usePlayerStatus,
  usePlayerTime,
} from "./player-context";

// Sits above the bottom nav on every screen. Tapping it opens the full player.
export function MiniPlayer() {
  const { book, chapter, isPlaying, buffering, error, expanded } =
    usePlayerStatus();
  const { toggle, setExpanded } = usePlayerActions();
  const { position, duration } = usePlayerTime();

  if (!book || !chapter) return null;

  const percent = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div
      className={`fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30
        transition-opacity ${expanded ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="mx-auto max-w-lg px-3">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg">
          <div className="flex items-center gap-3 p-2">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="tap flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left"
              aria-label={`Open player for ${book.title}`}
            >
              <Image
                src={book.coverUrl}
                alt=""
                width={44}
                height={44}
                unoptimized={book.coverUrl.endsWith(".svg")}
                className="h-11 w-11 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{book.title}</span>
                <span className="block truncate text-xs text-muted">
                  {error
                    ? "Playback problem — tap to retry"
                    : buffering
                      ? "Buffering…"
                      : chapter.title}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="tap flex items-center justify-center rounded-full text-foreground"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

          <div className="h-0.5 w-full bg-surface">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
