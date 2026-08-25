"use client";

import { useEffect, useState } from "react";
import {
  clearAllDownloads,
  formatBytes,
  listDownloads,
  storageUsed,
  type DownloadRecord,
} from "@/lib/offline/downloads";
import { useOfflineSupported } from "@/lib/offline/use-offline-supported";
import { PLAYBACK_SPEEDS } from "@/lib/player/types";
import { updateSettings, useSettings, type ThemeChoice } from "@/lib/settings";

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

// Plain data loading, so both the effect and the clear handler can reuse it
// without either of them setting state on the other's behalf.
async function loadDownloadState() {
  const [records, estimate] = await Promise.all([listDownloads(), storageUsed()]);
  return { records, estimate };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-xs uppercase tracking-[0.15em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SettingsView() {
  const { theme, defaultSpeed } = useSettings();
  const supported = useOfflineSupported();
  const [downloads, setDownloads] = useState<DownloadRecord[] | null>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    loadDownloadState()
      .then((loaded) => {
        if (cancelled) return;
        setDownloads(loaded.records);
        setUsage(loaded.estimate);
      })
      .catch(() => {
        if (!cancelled) setDownloads([]);
      });

    return () => {
      cancelled = true;
    };
  }, [supported]);

  const clear = async () => {
    setClearing(true);
    await clearAllDownloads();

    const loaded = await loadDownloadState();
    setDownloads(loaded.records);
    setUsage(loaded.estimate);
    setClearing(false);
  };

  const downloadedBytes = (downloads ?? []).reduce((sum, r) => sum + r.bytes, 0);

  return (
    <div>
      <Section title="Theme">
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateSettings({ theme: option.value })}
              aria-pressed={theme === option.value}
              className={`tap rounded-xl text-sm ${
                theme === option.value
                  ? "bg-accent text-background"
                  : "bg-surface-raised text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Default speed">
        <div className="grid grid-cols-4 gap-2">
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => updateSettings({ defaultSpeed: speed })}
              aria-pressed={defaultSpeed === speed}
              className={`tap rounded-xl text-sm tabular-nums ${
                defaultSpeed === speed
                  ? "bg-accent text-background"
                  : "bg-surface-raised text-foreground"
              }`}
            >
              {speed}×
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          New books start at this speed. Changing it in the player only affects
          what is playing.
        </p>
      </Section>

      <Section title="Downloads">
        {!supported ? (
          <p className="text-sm text-muted">
            This browser cannot store downloads.
          </p>
        ) : downloads === null ? (
          <p className="text-sm text-muted">Checking…</p>
        ) : downloads.length === 0 ? (
          <p className="text-sm text-muted">
            No downloaded books. Download one from its book page to listen
            without a connection.
          </p>
        ) : (
          <>
            <p className="text-sm">
              {downloads.length}{" "}
              {downloads.length === 1 ? "book" : "books"} ·{" "}
              {formatBytes(downloadedBytes)}
            </p>
            <ul className="mt-2 text-xs text-muted">
              {downloads.map((record) => (
                <li key={record.bookId}>
                  {record.summary.title} — {formatBytes(record.bytes)}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={clear}
              disabled={clearing}
              className="tap mt-3 w-full rounded-xl border border-accent text-sm text-accent"
            >
              {clearing ? "Clearing…" : "Delete all downloads"}
            </button>
          </>
        )}
      </Section>

      <Section title="Storage">
        {usage && usage.quota > 0 ? (
          <>
            <p className="text-sm">
              {formatBytes(usage.usage)} used of {formatBytes(usage.quota)}{" "}
              available
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${Math.min(100, (usage.usage / usage.quota) * 100)}%`,
                }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            This browser does not report a storage estimate.
          </p>
        )}
      </Section>
    </div>
  );
}
