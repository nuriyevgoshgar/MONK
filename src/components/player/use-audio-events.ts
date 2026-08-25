"use client";

import { useEffect, useRef, type RefObject } from "react";

export type AudioCallbacks = {
  onTime: (position: number, duration: number) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  onBufferingChange: (buffering: boolean) => void;
  onError: () => void;
  onEnded: () => void;
};

// Binds the media events once and reads the callbacks through a ref, so the
// listeners never have to be torn down and re-attached mid-playback.
export function useAudioEvents(
  audioRef: RefObject<HTMLAudioElement | null>,
  pendingSeekRef: RefObject<number | null>,
  callbacks: AudioCallbacks,
) {
  const callbacksRef = useRef(callbacks);

  // Kept current in an effect rather than during render: writing a ref while
  // rendering is not safe under concurrent rendering.
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const duration = () => (Number.isFinite(audio.duration) ? audio.duration : 0);
    const reportTime = () => callbacksRef.current.onTime(audio.currentTime, duration());

    const onLoadedMetadata = () => {
      // A restored or queued position can only be applied once the browser
      // knows how long the file is.
      const seek = pendingSeekRef.current;

      if (seek !== null) {
        audio.currentTime = seek;
        pendingSeekRef.current = null;
      }

      reportTime();
    };

    const listeners = [
      ["timeupdate", reportTime],
      ["loadedmetadata", onLoadedMetadata],
      ["durationchange", onLoadedMetadata],
      ["play", () => callbacksRef.current.onPlayingChange(true)],
      ["pause", () => callbacksRef.current.onPlayingChange(false)],
      ["waiting", () => callbacksRef.current.onBufferingChange(true)],
      ["playing", () => callbacksRef.current.onBufferingChange(false)],
      ["canplay", () => callbacksRef.current.onBufferingChange(false)],
      ["error", () => callbacksRef.current.onError()],
      ["ended", () => callbacksRef.current.onEnded()],
    ] as const;

    for (const [event, handler] of listeners) {
      audio.addEventListener(event, handler);
    }

    return () => {
      for (const [event, handler] of listeners) {
        audio.removeEventListener(event, handler);
      }
    };
  }, [audioRef, pendingSeekRef]);
}
