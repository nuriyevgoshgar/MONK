"use client";

import { useEffect, type RefObject } from "react";
import type { PlayerChapter } from "@/lib/player/types";

// Points the audio element at the current chapter. Guarded by the id of what
// is already loaded, so an unrelated re-render cannot restart playback, and
// re-applies the playback rate because a fresh source resets it.
export function useChapterSource(
  audioRef: RefObject<HTMLAudioElement | null>,
  loadedChapterRef: RefObject<string | null>,
  shouldPlayRef: RefObject<boolean>,
  chapter: PlayerChapter | null,
  speed: number,
  onLoadStart: () => void,
  onPlayFailed: () => void,
) {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !chapter) return;
    if (loadedChapterRef.current === chapter.id) return;

    loadedChapterRef.current = chapter.id;
    audio.src = chapter.audioUrl;
    audio.load();
    onLoadStart();

    if (shouldPlayRef.current) {
      shouldPlayRef.current = false;
      void audio.play().catch(onPlayFailed);
    }
    // The callbacks are recreated each render; re-running on them would
    // reload the chapter constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, audioRef, loadedChapterRef, shouldPlayRef]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, chapter, audioRef]);
}
