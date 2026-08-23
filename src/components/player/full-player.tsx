"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  BookmarkIcon,
  ChevronDownIcon,
  ListIcon,
  MoonIcon,
} from "@/components/icons";
import { BookmarksPanel } from "./bookmarks-panel";
import { usePlayerActions, usePlayerStatus } from "./player-context";
import {
  ChaptersPanel,
  SleepPanel,
  SpeedPanel,
  type PanelKind,
} from "./player-panels";
import { Scrubber } from "./scrubber";
import { TransportControls } from "./transport-controls";

// Distance the sheet has to be dragged before it counts as a dismiss.
const CLOSE_THRESHOLD_PX = 110;

function OptionButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] ${
        active ? "bg-surface-raised text-foreground" : "text-muted"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

export function FullPlayer() {
  const { book, chapter, expanded, error, sleep, speed } = usePlayerStatus();
  const { setExpanded, retry } = usePlayerActions();
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);

  if (!book || !chapter) return null;

  // Derived rather than reset in an effect: a closed sheet has no open panel.
  const activePanel = expanded ? panel : null;

  const togglePanel = (kind: PanelKind) =>
    setPanel((current) => (current === kind ? null : kind));

  const close = () => {
    setPanel(null);
    setExpanded(false);
  };

  const sleepLabel =
    sleep.kind === "minutes"
      ? `${sleep.minutes}m`
      : sleep.kind === "end-of-chapter"
        ? "Chapter"
        : "Sleep";

  return (
    <div
      role="dialog"
      aria-label="Player"
      aria-hidden={!expanded}
      // Position comes from a class rather than a pixel value so this renders
      // identically on the server, where there is no window to measure.
      className={`fixed inset-0 z-50 bg-background transition-transform duration-300 ease-out ${
        expanded ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      style={
        dragY > 0
          ? { transform: `translateY(${dragY}px)`, transition: "none" }
          : undefined
      }
      onTouchStart={(event) => {
        dragStartRef.current = event.touches[0].clientY;
      }}
      onTouchMove={(event) => {
        if (dragStartRef.current === null) return;
        // Downward drags only — this is a dismiss, not a free-moving sheet.
        setDragY(Math.max(0, event.touches[0].clientY - dragStartRef.current));
      }}
      onTouchEnd={() => {
        dragStartRef.current = null;
        if (dragY > CLOSE_THRESHOLD_PX) close();
        setDragY(0);
      }}
    >
      <div className="mx-auto flex h-full max-w-lg flex-col px-5 pb-[env(safe-area-inset-bottom)]">
        <header className="flex items-center justify-between py-3">
          <button
            type="button"
            onClick={close}
            aria-label="Close player"
            className="tap flex items-center justify-center text-muted"
          >
            <ChevronDownIcon />
          </button>
          <span className="text-xs uppercase tracking-[0.2em] text-muted">
            Now playing
          </span>
          <span className="w-11" />
        </header>

        <div className="flex flex-1 flex-col justify-center gap-6 overflow-y-auto py-2">
          <Image
            src={book.coverUrl}
            alt=""
            width={320}
            height={320}
            unoptimized={book.coverUrl.endsWith(".svg")}
            className="mx-auto aspect-square w-full max-w-[280px] rounded-2xl object-cover"
          />

          <div className="text-center">
            <Link
              href={`/book/${book.slug}`}
              onClick={close}
              className="font-serif text-2xl leading-tight"
            >
              {book.title}
            </Link>
            <p className="mt-1 text-sm text-muted">{book.author}</p>
            <p className="mt-3 text-sm">{chapter.title}</p>
            <p className="text-xs text-muted">
              Chapter {chapter.index + 1} of {book.chapters.length}
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-accent/40 bg-accent-soft p-4 text-sm">
              <p>{error}</p>
              <button
                type="button"
                onClick={retry}
                className="tap mt-2 rounded-xl bg-accent px-4 text-sm text-background"
              >
                Try again
              </button>
            </div>
          )}

          <Scrubber />
          <TransportControls />

          <div className="flex items-stretch justify-center gap-2">
            <OptionButton
              active={activePanel === "speed"}
              onClick={() => togglePanel("speed")}
              label={`${speed}×`}
            >
              <span className="text-sm tabular-nums">{speed}×</span>
            </OptionButton>
            <OptionButton
              active={activePanel === "sleep" || sleep.kind !== "off"}
              onClick={() => togglePanel("sleep")}
              label={sleepLabel}
            >
              <MoonIcon className="h-5 w-5" />
            </OptionButton>
            <OptionButton
              active={activePanel === "chapters"}
              onClick={() => togglePanel("chapters")}
              label="Chapters"
            >
              <ListIcon className="h-5 w-5" />
            </OptionButton>
            <OptionButton
              active={activePanel === "bookmarks"}
              onClick={() => togglePanel("bookmarks")}
              label="Marks"
            >
              <BookmarkIcon className="h-5 w-5" />
            </OptionButton>
          </div>

          {activePanel === "speed" && <SpeedPanel />}
          {activePanel === "sleep" && <SleepPanel />}
          {activePanel === "chapters" && <ChaptersPanel />}
          {activePanel === "bookmarks" && <BookmarksPanel />}
        </div>
      </div>
    </div>
  );
}
