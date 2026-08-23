"use client";

import { useState } from "react";
import { formatClock } from "@/lib/format";
import { usePlayerActions, usePlayerTime } from "./player-context";

// The track is drawn with elements and the native range input sits on top of
// it, transparent. Styling `::-webkit-slider-runnable-track` directly is not
// portable — a real input keeps touch, keyboard and pointer capture for free.
export function Scrubber() {
  const { position, duration } = usePlayerTime();
  const { seekTo } = usePlayerActions();
  const [dragValue, setDragValue] = useState<number | null>(null);

  const max = duration || 0;
  // While dragging, the thumb follows the finger rather than the audio
  // element, so the position does not fight the user.
  const value = dragValue ?? position;
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const commit = () => {
    if (dragValue !== null) seekTo(dragValue);
    setDragValue(null);
  };

  return (
    <div className="w-full">
      <div className="relative flex h-11 items-center">
        <div className="pointer-events-none absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${percent}%` }}
          />
        </div>

        <input
          type="range"
          min={0}
          max={max || 1}
          step={1}
          value={value}
          aria-label="Seek"
          disabled={max === 0}
          onChange={(event) => setDragValue(Number(event.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          className="relative h-11 w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:shadow
            [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-accent"
        />
      </div>

      <div className="flex justify-between text-xs tabular-nums text-muted">
        <span>{formatClock(value)}</span>
        <span>-{formatClock(Math.max(0, max - value))}</span>
      </div>
    </div>
  );
}
