import { AppShell } from "@/components/app-shell";
import { BookCard } from "@/components/book-card";
import { ContinueListening } from "@/components/continue-listening";
import { bookSummarySelect, toBookSummary } from "@/lib/book-summary";
import { db } from "@/lib/db";

// The catalogue is read per request: prerendering would bake the seed data
// into the build output.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rows = await db.book.findMany({
    orderBy: { title: "asc" },
    select: bookSummarySelect,
  });
  const books = rows.map(toBookSummary);

  return (
    <AppShell>
      <ContinueListening />

      <h1 className="text-xs uppercase tracking-[0.15em] text-muted">
        All books
      </h1>

      {books.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
          Nothing here yet. Run{" "}
          <code className="text-accent">npm run db:seed</code> to load the
          development catalogue.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {books.map((book) => (
            <li key={book.id}>
              <BookCard book={book} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
