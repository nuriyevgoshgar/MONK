import { AppShell } from "@/components/app-shell";

// The remaining tabs get their real screens in later steps; until then they
// say so rather than rendering a dead end.
export function TabPlaceholder({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <AppShell>
      <h1 className="font-serif text-2xl">{title}</h1>
      <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-muted">
        {note}
      </p>
    </AppShell>
  );
}
