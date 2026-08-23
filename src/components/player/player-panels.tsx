"use client";

import { formatDuration } from "@/lib/format";
import { PLAYBACK_SPEEDS } from "@/lib/player/types";
import { usePlayerActions, usePlayerStatus } from "./player-context";

export type PanelKind = "speed" | "sleep" | "chapters" | "bookmarks";

const SLEEP_MINUTES = [5, 15, 30, 45, 60] as const;

function PanelShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-xs uppercase tracking-[0.15em] text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap rounded-xl px-4 text-sm ${
        active
          ? "bg-accent text-background"
          : "bg-surface-raised text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function SpeedPanel() {
  const { speed } = usePlayerStatus();
  const { setSpeed } = usePlayerActions();

  return (
    <PanelShell title="Speed">
      <div className="grid grid-cols-4 gap-2">
        {PLAYBACK_SPEEDS.map((option) => (
          <Choice
            key={option}
            active={option === speed}
            onClick={() => setSpeed(option)}
          >
            {option}×
          </Choice>
        ))}
      </div>
    </PanelShell>
  );
}

export function SleepPanel() {
  const { sleep } = usePlayerStatus();
  const { setSleepTimer } = usePlayerActions();

  return (
    <PanelShell title="Sleep timer">
      <div className="grid grid-cols-3 gap-2">
        <Choice
          active={sleep.kind === "off"}
          onClick={() => setSleepTimer({ kind: "off" })}
        >
          Off
        </Choice>
        {SLEEP_MINUTES.map((minutes) => (
          <Choice
            key={minutes}
            active={sleep.kind === "minutes" && sleep.minutes === minutes}
            onClick={() =>
              setSleepTimer({
                kind: "minutes",
                minutes,
                endsAt: Date.now() + minutes * 60_000,
              })
            }
          >
            {minutes}m
          </Choice>
        ))}
        <Choice
          active={sleep.kind === "end-of-chapter"}
          onClick={() => setSleepTimer({ kind: "end-of-chapter" })}
        >
          End of chapter
        </Choice>
      </div>
    </PanelShell>
  );
}

export function ChaptersPanel() {
  const { book, chapterIndex } = usePlayerStatus();
  const { goToChapter } = usePlayerActions();

  if (!book) return null;

  return (
    <PanelShell title="Chapters">
      <ol className="-mx-1 max-h-60 overflow-y-auto">
        {book.chapters.map((chapter) => {
          const current = chapter.index === chapterIndex;

          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => goToChapter(chapter.index)}
                className={`tap flex w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${
                  current ? "text-accent" : "text-foreground"
                }`}
              >
                <span className="w-5 shrink-0 text-xs tabular-nums text-muted">
                  {chapter.index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{chapter.title}</span>
                <span className="shrink-0 text-xs text-muted">
                  {formatDuration(chapter.duration)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </PanelShell>
  );
}
