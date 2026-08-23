"use client";

import { useEffect } from "react";
import type { SleepTimer } from "./player-context";

// Stops playback when a minute-based sleep timer runs out. "End of chapter"
// is not a clock, so it is handled where a chapter finishes instead.
export function useSleepTimer(sleep: SleepTimer, onExpire: () => void) {
  useEffect(() => {
    if (sleep.kind !== "minutes") return;

    const remaining = sleep.endsAt - Date.now();

    if (remaining <= 0) {
      onExpire();
      return;
    }

    const id = setTimeout(onExpire, remaining);
    return () => clearTimeout(id);
    // `onExpire` is stable in the provider; re-running on every render would
    // restart the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleep]);
}
