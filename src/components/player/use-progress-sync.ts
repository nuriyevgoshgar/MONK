"use client";

import { useCallback, useEffect, useRef } from "react";
import { SAVE_INTERVAL_MS } from "@/lib/player/types";

export type ProgressSnapshot = {
  userId: string;
  bookId: string;
  chapterId: string;
  positionSec: number;
  finished: boolean;
};

// Writes the listening position back to the server: on a timer while playing,
// and whenever the caller asks (pause, chapter change). The tab going away is
// handled here with sendBeacon, which survives the page being torn down where
// a normal fetch would be cancelled.
export function useProgressSync(
  getSnapshot: () => ProgressSnapshot | null,
  isPlaying: boolean,
) {
  const snapshotRef = useRef(getSnapshot);

  useEffect(() => {
    snapshotRef.current = getSnapshot;
  }, [getSnapshot]);

  const save = useCallback((useBeacon = false) => {
    const snapshot = snapshotRef.current();

    if (!snapshot) return;

    const body = JSON.stringify(snapshot);

    if (useBeacon && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        "/api/progress",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }

    void fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Losing one write is fine — the next tick sends the newer position.
    });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const id = setInterval(() => save(), SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying, save]);

  useEffect(() => {
    const onHide = () => save(true);
    const onVisibility = () => {
      // On mobile this is often the last callback that runs before the page
      // is frozen, so it matters more than `pagehide`.
      if (document.visibilityState === "hidden") save(true);
    };

    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [save]);

  return save;
}
