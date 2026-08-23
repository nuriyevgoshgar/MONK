"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { getDeviceId } from "@/lib/device-id";
import type { SavedProgress } from "@/lib/player/types";

// The device id never changes once read, so there is nothing to subscribe to.
const subscribe = () => () => {};
const getServerSnapshot = () => null;

// Identifies the listener and hands back whatever position they left behind,
// so a reload resumes on the right chapter at the right second. Deliberately
// never starts playback: browsers block autoplay, and it would be rude.
export function useRestoreProgress(onRestore: (saved: SavedProgress) => void) {
  // Read through useSyncExternalStore rather than an effect: localStorage is
  // not available while rendering on the server, and this keeps the server
  // and client markup identical.
  const userId = useSyncExternalStore(subscribe, getDeviceId, getServerSnapshot);

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
