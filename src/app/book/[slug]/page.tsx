import Image from "next/image";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BookActions } from "@/components/book/book-actions";
import { BookChapterList } from "@/components/book/book-chapter-list";
import { db } from "@/lib/db";
import { formatDuration } from "@/lib/format";
import type { PlayerBook } from "@/lib/player/types";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: PageProps<"/book/[slug]">) {
  const { slug } = await params;

  const book = await db.book.findUnique({
    where: { slug },
    include: { chapters: { orderBy: { index: "asc" } } },
  });

  if (!book) notFound();

  const playerBook: PlayerBook = {
    id: book.id,
    slug: book.slug,
    title: book.title,
    author: book.author,
    narrator: book.narrator,
    coverUrl: book.coverUrl,
    chapters: book.chapters.map((chapter) => ({
      id: chapter.id,
      index: chapter.index,
      title: chapter.title,
      audioUrl: chapter.audioUrl,
      duration: chapter.duration,
    })),
  };

  return (
    <AppShell back>
      <Image
        src={book.coverUrl}
        alt=""
        width={320}
        height={320}
        unoptimized={book.coverUrl.endsWith(".svg")}
        className="mx-auto aspect-square w-full max-w-[240px] rounded-2xl object-cover"
      />

      <div className="mt-6 text-center">
        <h1 className="font-serif text-3xl leading-tight">{book.title}</h1>
        <p className="mt-1 text-muted">{book.author}</p>
        <p className="mt-3 text-sm text-muted">Narrated by {book.narrator}</p>
        <p className="mt-1 text-xs text-muted">
          {book.category} · {book.language.toUpperCase()} ·{" "}
          {formatDuration(book.totalDuration)}
        </p>
      </div>

      <BookActions book={playerBook} />

      <p className="mt-8 text-sm leading-relaxed text-muted">
        {book.description}
      </p>

      <BookChapterList book={playerBook} />

      <footer className="mt-8 rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
        <p>{book.license}</p>
        <a
          href={book.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-accent underline underline-offset-2"
        >
          View the original source
        </a>
      </footer>
    </AppShell>
  );
}
