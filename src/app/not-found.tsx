import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFound() {
  return (
    <AppShell>
      <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center">
        <h1 className="font-serif text-2xl">Not here</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          That book is not in the catalogue. It may have been removed, or the
          link may be wrong.
        </p>
        <Link
          href="/"
          className="tap mt-5 flex items-center justify-center rounded-2xl bg-accent px-6 text-sm font-medium text-background"
        >
          Back to the catalogue
        </Link>
      </div>
    </AppShell>
  );
}
