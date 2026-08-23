"use client";

import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "@/components/icons";
import { SKIP_BACK_SEC, SKIP_FORWARD_SEC } from "@/lib/player/types";
import { usePlayerActions, usePlayerStatus } from "./player-context";

export function TransportControls() {
  const { isPlaying, buffering } = usePlayerStatus();
  const { toggle, skip } = usePlayerActions();

  return (
    <div className="flex items-center justify-center gap-8">
      <button
        type="button"
        onClick={() => skip(-SKIP_BACK_SEC)}
        aria-label={`Back ${SKIP_BACK_SEC} seconds`}
        className="tap relative flex items-center justify-center text-foreground"
      >
        <SkipBackIcon className="h-9 w-9" />
        <span className="absolute text-[9px] font-medium tabular-nums">
          {SKIP_BACK_SEC}
        </span>
      </button>

      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="flex h-18 w-18 items-center justify-center rounded-full bg-accent text-background"
      >
        {buffering ? (
          <span
            className="h-6 w-6 animate-spin rounded-full border-2 border-background/40 border-t-background"
            aria-hidden="true"
          />
        ) : isPlaying ? (
          <PauseIcon className="h-8 w-8" />
        ) : (
          <PlayIcon className="h-8 w-8" />
        )}
      </button>

      <button
        type="button"
        onClick={() => skip(SKIP_FORWARD_SEC)}
        aria-label={`Forward ${SKIP_FORWARD_SEC} seconds`}
        className="tap relative flex items-center justify-center text-foreground"
      >
        <SkipForwardIcon className="h-9 w-9" />
        <span className="absolute text-[9px] font-medium tabular-nums">
          {SKIP_FORWARD_SEC}
        </span>
      </button>
    </div>
  );
}
