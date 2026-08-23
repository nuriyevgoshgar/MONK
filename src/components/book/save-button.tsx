"use client";

import { useEffect, useState } from "react";
import { useDeviceId } from "@/lib/use-device-id";

type ShelfEntry = { status: string };

// "Saved" here means "on a shelf at all". Playing a book files it under
// Listening automatically, so this button is only about keeping it for later.
export function SaveButton({ bookId }: { bookId: string }) {
  const userId = useDeviceId();
  const [onShelf, setOnShelf] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    fetch(
      `/api/shelf?userId=${encodeURIComponent(userId)}&bookId=${encodeURIComponent(bookId)}`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((data: { entries: ShelfEntry[] }) => setOnShelf(data.entries.length > 0))
      .catch(() => setOnShelf(false));

    return () => controller.abort();
  }, [userId, bookId]);

  const toggle = async () => {
    if (!userId || busy) return;

    setBusy(true);
    const next = !onShelf;
    setOnShelf(next);

    try {
      if (next) {
        await fetch("/api/shelf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, bookId, status: "saved" }),
        });
      } else {
        await fetch(
          `/api/shelf?userId=${encodeURIComponent(userId)}&bookId=${encodeURIComponent(bookId)}`,
          { method: "DELETE" },
        );
      }
    } catch {
      setOnShelf(!next); // Put the button back the way it was.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={onShelf === null}
      aria-pressed={onShelf === true}
      className={`tap mt-3 w-full rounded-2xl border text-sm ${
        onShelf
          ? "border-accent text-accent"
          : "border-border bg-surface text-foreground"
      }`}
    >
      {onShelf ? "Saved to library" : "Save"}
    </button>
  );
}
