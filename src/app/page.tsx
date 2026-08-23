import { AppShell } from "@/components/app-shell";
import { BookCard } from "@/components/book-card";
import { db } from "@/lib/db";

// The catalogue is read per request: prerendering would bake the seed data
// into the build output.
export const dynamic = "force-dynamic";

// Read straight from the database so the seeded catalogue is visible end to
// end. Home's real rows (Continue listening, New, Popular, categories) arrive
// with the screens step.
export default async function HomePage() {
  const books = await db.book.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { chapters: true } } },
  });

  return (
    <AppShell>
      <h1 className="font-serif text-2xl">Catalogue</h1>
      <p className="mt-2 text-sm text-muted">
        {books.length} seeded {books.length === 1 ? "title" : "titles"} — public
        domain works with placeholder narration.
      </p>

      {books.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
          Nothing here yet. Run{" "}
          <code className="text-accent">npm run db:seed</code> to load the
          development catalogue.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {books.map((book) => (
            <li key={book.id}>
              <BookCard
                title={book.title}
                author={book.author}
                narrator={book.narrator}
                coverUrl={book.coverUrl}
                category={book.category}
                totalDuration={book.totalDuration}
                chapterCount={book._count.chapters}
                sourceUrl={book.sourceUrl}
                license={book.license}
              />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
