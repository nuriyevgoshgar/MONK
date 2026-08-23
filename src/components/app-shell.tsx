import Link from "next/link";
import type { ReactNode } from "react";

// Mobile-first frame: a 375px-baseline column that simply gets wider and stays
// centred on desktop. The bottom padding clears the tab bar and the
// mini-player, both of which are fixed to the bottom of every screen.
export function AppShell({
  children,
  back = false,
}: {
  children: ReactNode;
  back?: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-44">
      <header className="flex items-center justify-between pt-8 pb-6">
        {back ? (
          <Link href="/" className="tap -ml-2 flex items-center text-sm text-muted">
            ← Home
          </Link>
        ) : (
          <span className="font-serif text-3xl tracking-tight">MONK</span>
        )}
        <span className="text-xs uppercase tracking-[0.2em] text-muted">
          Listen quietly
        </span>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
