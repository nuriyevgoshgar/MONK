"use client";

import { createContext, useContext } from "react";
import type { PlayerBook, PlayerChapter } from "@/lib/player/types";

export type SleepTimer =
  | { kind: "off" }
  | { kind: "minutes"; minutes: number; endsAt: number }
  | { kind: "end-of-chapter" };

export type PlayerStatus = {
  book: PlayerBook | null;
  chapter: PlayerChapter | null;
  chapterIndex: number;
  isPlaying: boolean;
  buffering: boolean;
  error: string | null;
  speed: number;
  sleep: SleepTimer;
  expanded: boolean;
};

export type PlayerActions = {
  playBook: (
    book: PlayerBook,
    chapterIndex?: number,
    positionSec?: number,
  ) => void;
  toggle: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  skip: (deltaSeconds: number) => void;
  goToChapter: (index: number) => void;
  setSpeed: (speed: number) => void;
  setSleepTimer: (timer: SleepTimer) => void;
  setExpanded: (expanded: boolean) => void;
  retry: () => void;
};

export type PlayerTime = {
  position: number;
  duration: number;
};

// Three contexts rather than one: `timeupdate` fires several times a second,
// and putting position in the same context as the actions would re-render
// every button in the app on each tick.
export const PlayerStatusContext = createContext<PlayerStatus | null>(null);
export const PlayerActionsContext = createContext<PlayerActions | null>(null);
export const PlayerTimeContext = createContext<PlayerTime>({
  position: 0,
  duration: 0,
});

function useRequired<T>(value: T | null, name: string): T {
  if (!value) throw new Error(`${name} must be used inside <PlayerProvider>`);
  return value;
}

export const usePlayerStatus = () =>
  useRequired(useContext(PlayerStatusContext), "usePlayerStatus");

export const usePlayerActions = () =>
  useRequired(useContext(PlayerActionsContext), "usePlayerActions");

export const usePlayerTime = () => useContext(PlayerTimeContext);
