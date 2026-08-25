"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";

// Route-level error boundary. Anything thrown while rendering a screen lands
// here instead of a blank page.
export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center">
        <h1 className="font-serif text-2xl">Something went wrong</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          This screen failed to load. Anything already playing keeps playing.
        </p>
        <button
          type="button"
          onClick={reset}
          className="tap mt-5 w-full rounded-2xl bg-accent px-6 text-sm font-medium text-background"
        >
          Try again
        </button>
        {error.digest && (
          <p className="mt-3 text-[11px] text-muted">Reference: {error.digest}</p>
        )}
      </div>
    </AppShell>
  );
}
