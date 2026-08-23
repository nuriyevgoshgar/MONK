"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { PlayerBook } from "@/lib/player/types";
import { useSettings } from "@/lib/settings";
import {
  PlayerActionsContext,
  PlayerStatusContext,
  PlayerTimeContext,
  type PlayerActions,
  type PlayerStatus,
  type PlayerTime,
  type SleepTimer,
} from "./player-context";
import { useAudioEvents } from "./use-audio-events";
import { useMediaSession } from "./use-media-session";
import { useProgressSync, type ProgressSnapshot } from "./use-progress-sync";
import { useRestoreProgress } from "./use-restore-progress";
import { useSleepTimer } from "./use-sleep-timer";

type Track = { book: PlayerBook; chapterIndex: number };

const LOAD_ERROR =
  "Could not load this chapter. Check your connection and try again.";

// The one <audio> element in the app. It lives in the root layout, so route
// changes never unmount it and playback continues across navigation.
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [track, setTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The default from Settings applies until the listener changes speed for
  // whatever is playing; starting a different book falls back to the default.
  const { defaultSpeed } = useSettings();
  const [speedOverride, setSpeed] = useState<number | null>(null);
  const speed = speedOverride ?? defaultSpeed;
  const [sleep, setSleepTimer] = useState<SleepTimer>({ kind: "off" });
  const [expanded, setExpanded] = useState(false);
  const [time, setTime] = useState<PlayerTime>({ position: 0, duration: 0 });

  // Position is mirrored into a ref so saving and seeking can read the latest
  // value without re-subscribing to state on every tick.
  const positionRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  const shouldPlayRef = useRef(false);
  const finishedRef = useRef(false);
  const loadedChapterRef = useRef<string | null>(null);

  const chapter = track ? (track.book.chapters[track.chapterIndex] ?? null) : null;

  const userId = useRestoreProgress((saved) => {
    pendingSeekRef.current = saved.positionSec;
    positionRef.current = saved.positionSec;
    finishedRef.current = saved.finished;
    setTime({
      position: saved.positionSec,
      duration: saved.book.chapters[saved.chapterIndex]?.duration ?? 0,
    });
    setTrack({ book: saved.book, chapterIndex: saved.chapterIndex });
  });

  const getSnapshot = useCallback((): ProgressSnapshot | null => {
    if (!userId || !track) return null;

    const current = track.book.chapters[track.chapterIndex];
    if (!current) return null;

    return {
      userId,
      bookId: track.book.id,
      chapterId: current.id,
      positionSec: Math.floor(positionRef.current),
      finished: finishedRef.current,
    };
  }, [userId, track]);

  const saveProgress = useProgressSync(getSnapshot, isPlaying);

  // Point the element at the current chapter. Guarded by the loaded id so an
  // unrelated re-render cannot restart playback.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !chapter) return;
    if (loadedChapterRef.current === chapter.id) return;

    loadedChapterRef.current = chapter.id;
    audio.src = chapter.audioUrl;
    audio.load();
    setError(null);

    if (shouldPlayRef.current) {
      shouldPlayRef.current = false;
      void audio.play().catch(() => setIsPlaying(false));
    }
  }, [chapter]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, chapter]);

  // What happens when a chapter runs out: stop for the sleep timer, mark the
  // book finished on the last chapter, otherwise roll straight into the next.
  const handleEnded = useCallback(() => {
    if (!track) return;

    positionRef.current = chapter?.duration ?? positionRef.current;
    const isLastChapter = track.chapterIndex >= track.book.chapters.length - 1;

    if (sleep.kind === "end-of-chapter") {
      setSleepTimer({ kind: "off" });
      saveProgress();
      return;
    }

    if (isLastChapter) {
      finishedRef.current = true;
      saveProgress();
      return;
    }

    // Save the chapter that just finished, then roll into the next one.
    saveProgress();
    pendingSeekRef.current = 0;
    positionRef.current = 0;
    shouldPlayRef.current = true;
    setTrack({ book: track.book, chapterIndex: track.chapterIndex + 1 });
  }, [track, chapter, sleep, saveProgress]);

  const endedRef = useRef(handleEnded);

  useEffect(() => {
    endedRef.current = handleEnded;
  }, [handleEnded]);

  useAudioEvents(audioRef, pendingSeekRef, {
    onTime: (position, duration) => {
      positionRef.current = position;
      setTime({ position, duration });
    },
    onPlayingChange: (playing) => {
      setIsPlaying(playing);
      if (playing) setError(null);
      else saveProgress();
    },
    onBufferingChange: (value) => {
      setBuffering(value);
      if (!value) setError(null);
    },
    onError: () => {
      setBuffering(false);
      setIsPlaying(false);
      setError(LOAD_ERROR);
    },
    onEnded: () => endedRef.current(),
  });

  const play = useCallback(() => {
    void audioRef.current?.play().catch(() => setIsPlaying(false));
  }, []);

  const pause = useCallback(() => audioRef.current?.pause(), []);

  useSleepTimer(sleep, () => {
    audioRef.current?.pause();
    setSleepTimer({ kind: "off" });
  });

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    if (audio.paused) play();
    else audio.pause();
  }, [track, play]);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const limit = Number.isFinite(audio.duration) ? audio.duration : seconds;
    const clamped = Math.max(0, Math.min(seconds, limit));

    audio.currentTime = clamped;
    positionRef.current = clamped;
    setTime((current) => ({ ...current, position: clamped }));
  }, []);

  const skip = useCallback(
    (deltaSeconds: number) => {
      const audio = audioRef.current;
      if (audio) seekTo(audio.currentTime + deltaSeconds);
    },
    [seekTo],
  );

  const playBook = useCallback(
    (book: PlayerBook, chapterIndex = 0, positionSec = 0) => {
      const target = book.chapters[chapterIndex];
      if (!target) return;

      const sameChapter =
        track?.book.id === book.id && track.chapterIndex === chapterIndex;

      finishedRef.current = false;

      if (sameChapter && audioRef.current) {
        if (positionSec > 0) seekTo(positionSec);
        play();
        return;
      }

      // Switching away — write down where the previous book was left.
      saveProgress();

      if (track?.book.id !== book.id) setSpeed(null);

      pendingSeekRef.current = positionSec;
      positionRef.current = positionSec;
      shouldPlayRef.current = true;
      setTime({ position: positionSec, duration: target.duration });
      setTrack({ book, chapterIndex });
    },
    [track, seekTo, play, saveProgress],
  );

  const goToChapter = useCallback(
    (index: number) => {
      if (track) playBook(track.book, index, 0);
    },
    [track, playBook],
  );

  const retry = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !chapter) return;

    setError(null);
    setBuffering(true);
    pendingSeekRef.current = positionRef.current;
    audio.load();
    play();
  }, [chapter, play]);

  const onChapterDelta = useCallback(
    (delta: number) => {
      if (track) goToChapter(track.chapterIndex + delta);
    },
    [track, goToChapter],
  );

  useMediaSession({
    book: track?.book ?? null,
    chapter,
    isPlaying,
    onPlay: play,
    onPause: pause,
    onSeek: seekTo,
    onSkip: skip,
    onChapterDelta,
  });

  const status = useMemo<PlayerStatus>(
    () => ({
      book: track?.book ?? null,
      chapter,
      chapterIndex: track?.chapterIndex ?? 0,
      isPlaying,
      buffering,
      error,
      speed,
      sleep,
      expanded,
    }),
    [track, chapter, isPlaying, buffering, error, speed, sleep, expanded],
  );

  const actions = useMemo<PlayerActions>(
    () => ({
      playBook,
      toggle,
      pause,
      seekTo,
      skip,
      goToChapter,
      setSpeed,
      setSleepTimer,
      setExpanded,
      retry,
    }),
    [playBook, toggle, pause, seekTo, skip, goToChapter, retry],
  );

  return (
    <PlayerActionsContext.Provider value={actions}>
      <PlayerStatusContext.Provider value={status}>
        <PlayerTimeContext.Provider value={time}>
          {children}
          <audio ref={audioRef} preload="metadata" playsInline />
        </PlayerTimeContext.Provider>
      </PlayerStatusContext.Provider>
    </PlayerActionsContext.Provider>
  );
}
