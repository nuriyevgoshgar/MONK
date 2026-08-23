"use client";

import { useEffect, useRef } from "react";
import type { SavedProgress } from "@/lib/player/types";
import { useDeviceId } from "@/lib/use-device-id";

// Identifies the listener and hands back whatever position they left behind,
// so a reload resumes on the right chapter at the right second. Deliberately
// never starts playback: browsers block autoplay, and it would be rude.
export function useRestoreProgress(onRestore: (saved: SavedProgress) => void) {
  const userId = useDeviceId();

  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    fetch(`/api/progress?userId=${encodeURIComponent(userId)}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data: { progress: SavedProgress | null }) => {
        if (data.progress && data.progress.book.chapters.length > 0) {
          onRestoreRef.current(data.progress);
        }
      })
      .catch(() => {
        // Nothing saved yet, or offline — start with an empty player.
      });

    return () => controller.abort();
  }, [userId]);

  return userId;
}
