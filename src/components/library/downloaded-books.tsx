"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PlayIcon } from "@/components/icons";
import { usePlayerActions } from "@/components/player/player-context";
import { formatDuration } from "@/lib/format";
import {
  formatBytes,
  listDownloads,
  type DownloadRecord,
} from "@/lib/offline/downloads";
import { useOfflineSupported } from "@/lib/offline/use-offline-supported";

// Reads from IndexedDB rather than the server, so this section still works
// with no connection — and plays the book straight from the stored metadata
// instead of navigating to a page that would not load.
export function DownloadedBooks() {
  const { playBook } = usePlayerActions();
  const supported = useOfflineSupported();
  const [records, setRecords] = useState<DownloadRecord[] | null>(null);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    listDownloads()
      .then((found) => {
        if (!cancelled) setRecords(found);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      });

    return () => {
      cancelled = true;
    };
  }, [supported]);

  if (!supported || !records || records.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xs uppercase tracking-[0.15em] text-muted">
        Downloaded
      </h2>

      <ul className="mt-3 flex flex-col gap-3">
        {records.map((record) => (
          <li key={record.bookId}>
            <button
              type="button"
              onClick={() => playBook(record.book, 0, 0)}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-3 text-left"
            >
              <Image
                src={record.summary.coverUrl}
                alt=""
                width={56}
                height={56}
                unoptimized={record.summary.coverUrl.endsWith(".svg")}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-lg">
                  {record.summary.title}
                </span>
                <span className="block truncate text-xs text-muted">
                  {record.summary.author}
                </span>
                <span className="block text-[11px] text-muted">
                  {formatDuration(record.summary.totalDuration)} ·{" "}
                  {formatBytes(record.bytes)} · available offline
                </span>
              </span>
              <PlayIcon className="h-6 w-6 shrink-0 text-accent" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
