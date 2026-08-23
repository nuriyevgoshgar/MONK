"use client";

import type { BookSummary } from "@/lib/book-summary";
import type { PlayerBook } from "@/lib/player/types";
import { idbClear, idbDelete, idbGet, idbGetAll, idbPut } from "./idb";

// Must match AUDIO_CACHE in public/sw.js — the worker reads what this writes.
const AUDIO_CACHE = "monk-audio-v1";

export type DownloadRecord = {
  bookId: string;
  book: PlayerBook;
  summary: BookSummary;
  bytes: number;
  savedAt: number;
};

export const offlineSupported = () =>
  typeof window !== "undefined" && "caches" in window && "indexedDB" in window;

export const listDownloads = () => idbGetAll<DownloadRecord>();

export const getDownload = (bookId: string) => idbGet<DownloadRecord>(bookId);

// Fetches every chapter into the cache the service worker serves from, so the
// book plays with no network at all. Progress is reported 0..1 across the
// whole book, counting bytes within the chapter currently in flight.
export async function downloadBook(
  book: PlayerBook,
  summary: BookSummary,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<DownloadRecord> {
  const cache = await caches.open(AUDIO_CACHE);
  const total = book.chapters.length;
  let bytes = 0;

  for (const [index, chapter] of book.chapters.entries()) {
    if (signal.aborted) throw new DOMException("Download cancelled", "AbortError");

    const response = await fetch(chapter.audioUrl, { signal });

    if (!response.ok || !response.body) {
      throw new Error(`Could not download “${chapter.title}”`);
    }

    const expected = Number(response.headers.get("Content-Length") ?? 0);
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      parts.push(value);
      received += value.byteLength;

      const withinChapter = expected > 0 ? received / expected : 0;
      onProgress((index + withinChapter) / total);
    }

    const blob = new Blob(parts as BlobPart[], {
      type: response.headers.get("Content-Type") ?? "audio/wav",
    });

    // Only written once the chapter arrived whole, so a cancelled download
    // never leaves a truncated file behind.
    await cache.put(
      chapter.audioUrl,
      new Response(blob, {
        headers: {
          "Content-Type": blob.type,
          "Content-Length": String(blob.size),
          "Accept-Ranges": "bytes",
        },
      }),
    );

    bytes += blob.size;
    onProgress((index + 1) / total);
  }

  const record: DownloadRecord = {
    bookId: book.id,
    book,
    summary,
    bytes,
    savedAt: Date.now(),
  };

  await idbPut(record);
  return record;
}

export async function deleteDownload(bookId: string): Promise<void> {
  const record = await getDownload(bookId);
  const cache = await caches.open(AUDIO_CACHE);

  if (record) {
    await Promise.all(
      record.book.chapters.map((chapter) => cache.delete(chapter.audioUrl)),
    );
  }

  await idbDelete(bookId);
}

// Used when a download is cancelled part way: drop whatever already landed.
export async function discardPartial(book: PlayerBook): Promise<void> {
  const cache = await caches.open(AUDIO_CACHE);
  await Promise.all(book.chapters.map((chapter) => cache.delete(chapter.audioUrl)));
  await idbDelete(book.id);
}

export async function clearAllDownloads(): Promise<void> {
  await caches.delete(AUDIO_CACHE);
  await idbClear();
}

export async function storageUsed(): Promise<{ usage: number; quota: number }> {
  if (!navigator.storage?.estimate) return { usage: 0, quota: 0 };

  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
