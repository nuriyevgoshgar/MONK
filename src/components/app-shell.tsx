import type { ReactNode } from "react";

// Mobile-first frame: a 375px-baseline column that simply gets wider and stays
// centred on desktop. The bottom tab bar and mini-player land here in the
// screens step.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-16">
      <header className="flex items-center justify-between pt-8 pb-6">
        <span className="font-serif text-3xl tracking-tight">MONK</span>
        <span className="text-xs uppercase tracking-[0.2em] text-muted">
          Listen quietly
        </span>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
