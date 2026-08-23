"use client";

import { useEffect } from "react";
import type { PlayerBook, PlayerChapter } from "@/lib/player/types";
import { SKIP_BACK_SEC, SKIP_FORWARD_SEC } from "@/lib/player/types";

type MediaSessionArgs = {
  book: PlayerBook | null;
  chapter: PlayerChapter | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (deltaSeconds: number) => void;
  onChapterDelta: (delta: number) => void;
};

// Puts the current chapter on the lock screen, in the notification shade and
// on headphone buttons.
export function useMediaSession({
  book,
  chapter,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onSkip,
  onChapterDelta,
}: MediaSessionArgs) {
  useEffect(() => {
    if (!("mediaSession" in navigator) || !book || !chapter) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapter.title,
      artist: book.author,
      album: book.title,
      artwork: [{ src: book.coverUrl, sizes: "600x600" }],
    });
  }, [book, chapter]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => onPlay()],
      ["pause", () => onPause()],
      ["seekbackward", () => onSkip(-SKIP_BACK_SEC)],
      ["seekforward", () => onSkip(SKIP_FORWARD_SEC)],
      ["previoustrack", () => onChapterDelta(-1)],
      ["nexttrack", () => onChapterDelta(1)],
      [
        "seekto",
        (details) => {
          if (typeof details.seekTime === "number") onSeek(details.seekTime);
        },
      ],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Not every browser supports every action.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore — nothing to clean up if it was never set.
        }
      }
    };
  }, [onPlay, onPause, onSeek, onSkip, onChapterDelta]);
}
