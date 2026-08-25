"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, TrashIcon } from "@/components/icons";
import type { BookSummary } from "@/lib/book-summary";
import {
  deleteDownload,
  discardPartial,
  downloadBook,
  formatBytes,
  getDownload,
} from "@/lib/offline/downloads";
import { useOfflineSupported } from "@/lib/offline/use-offline-supported";
import type { PlayerBook } from "@/lib/player/types";

type State =
  | { kind: "checking" }
  | { kind: "idle" }
  | { kind: "downloading"; fraction: number }
  | { kind: "done"; bytes: number }
  | { kind: "error"; message: string };

export function DownloadButton({
  book,
  summary,
}: {
  book: PlayerBook;
  summary: BookSummary;
}) {
  const supported = useOfflineSupported();
  const [state, setState] = useState<State>({ kind: "checking" });
  const abortRef = useRef<AbortController | null>(null);

  // Loaded inside the effect with a cancellation guard rather than through a
  // shared async callback, so no state is set after the button unmounts.
  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    getDownload(book.id)
      .then((record) => {
        if (cancelled) return;
        setState(record ? { kind: "done", bytes: record.bytes } : { kind: "idle" });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "idle" });
      });

    return () => {
      cancelled = true;
    };
  }, [supported, book.id]);

  // Cancelling mid-flight aborts the fetch and drops whatever already landed.
  useEffect(() => () => abortRef.current?.abort(), []);

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "downloading", fraction: 0 });

    try {
      const record = await downloadBook(
        book,
        summary,
        (fraction) => setState({ kind: "downloading", fraction }),
        controller.signal,
      );
      setState({ kind: "done", bytes: record.bytes });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        await discardPartial(book);
        setState({ kind: "idle" });
        return;
      }

      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Download failed",
      });
    } finally {
      abortRef.current = null;
    }
  };

  const remove = async () => {
    await deleteDownload(book.id);
    setState({ kind: "idle" });
  };

  if (!supported) return null;

  if (state.kind === "checking") {
    return <div className="tap mt-3 animate-pulse rounded-2xl bg-surface" />;
  }

  if (state.kind === "downloading") {
    const percent = Math.round(state.fraction * 100);

    return (
      <div className="mt-3 rounded-2xl border border-border bg-surface p-3">
        <div className="flex items-center justify-between text-sm">
          <span>Downloading… {percent}%</span>
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="text-accent underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  if (state.kind === "done") {
    return (
      <button
        type="button"
        onClick={remove}
        className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-accent text-sm text-accent"
      >
        <TrashIcon className="h-4 w-4" />
        Downloaded · {formatBytes(state.bytes)} — remove
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm"
      >
        <DownloadIcon className="h-4 w-4" />
        Download for offline
      </button>
      {state.kind === "error" && (
        <p className="mt-2 text-center text-xs text-accent">{state.message}</p>
      )}
    </>
  );
}
