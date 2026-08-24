// Writes a crawled book into the database.
//
// Re-runnable by design: books are matched on sourceUrl (the page they came
// from, which is stable and unique) and chapters on (bookId, index), so a
// second crawl updates rows instead of duplicating them.

import { db } from "../db.ts";
import type { ExtractedChapter } from "./extract.ts";
import { slugify } from "./slug.ts";

export { slugify };

export type IngestableBook = {
  title: string;
  slug: string;
  author: string;
  narrator: string;
  coverUrl: string;
  description: string;
  category: string;
  language: string;
  totalDuration: number;
  sourceUrl: string;
  license: string;
  chapters: ExtractedChapter[];
};

/** Appends a counter if the slug is taken by a different source URL. */
async function uniqueSlug(base: string, sourceUrl: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const clash = await db.book.findUnique({
      where: { slug: candidate },
      select: { sourceUrl: true },
    });

    if (!clash || clash.sourceUrl === sourceUrl) return candidate;
  }

  return `${base}-${Date.now()}`;
}

export async function upsertBook(book: IngestableBook) {
  const slug = await uniqueSlug(book.slug, book.sourceUrl);

  const fields = {
    title: book.title,
    slug,
    author: book.author,
    narrator: book.narrator,
    coverUrl: book.coverUrl,
    description: book.description,
    category: book.category,
    language: book.language,
    totalDuration: book.totalDuration,
    license: book.license,
  };

  const record = await db.book.upsert({
    where: { sourceUrl: book.sourceUrl },
    create: { sourceUrl: book.sourceUrl, ...fields },
    update: fields,
  });

  for (const chapter of book.chapters) {
    const chapterFields = {
      title: chapter.title,
      audioUrl: chapter.audioUrl,
      duration: chapter.duration,
    };

    await db.chapter.upsert({
      where: { bookId_index: { bookId: record.id, index: chapter.index } },
      create: { bookId: record.id, index: chapter.index, ...chapterFields },
      update: chapterFields,
    });
  }

  // Drop chapters left over from a previous, longer version of this book.
  await db.chapter.deleteMany({
    where: { bookId: record.id, index: { gte: book.chapters.length } },
  });

  return { id: record.id, slug };
}
