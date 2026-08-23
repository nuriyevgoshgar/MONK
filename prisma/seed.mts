// Seeds the development catalogue from prisma/seed-data/books.json.
//
// Hand-written data only — nothing here is crawled. Re-running is safe: books
// are matched on their slug and chapters on (book, index), so a second run
// updates rows instead of duplicating them.
//
//   npm run db:seed

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db.ts";

type SeedChapter = {
  title: string;
  duration: number;
};

type SeedBook = {
  slug: string;
  title: string;
  author: string;
  narrator: string;
  coverUrl: string;
  description: string;
  category: string;
  language: string;
  sourceUrl: string;
  license: string;
  chapters: SeedChapter[];
};

const ROOT = path.resolve(import.meta.dirname, "..");
const SEED_FILE = path.join(ROOT, "prisma", "seed-data", "books.json");

function audioUrlFor(book: SeedBook, index: number): string {
  return `/samples/${book.slug}/${index + 1}.wav`;
}

async function seedBook(book: SeedBook) {
  const totalDuration = book.chapters.reduce(
    (total, chapter) => total + chapter.duration,
    0,
  );

  const fields = {
    title: book.title,
    author: book.author,
    narrator: book.narrator,
    coverUrl: book.coverUrl,
    description: book.description,
    category: book.category,
    language: book.language,
    totalDuration,
    sourceUrl: book.sourceUrl,
    license: book.license,
  };

  const record = await db.book.upsert({
    where: { slug: book.slug },
    create: { slug: book.slug, ...fields },
    update: fields,
  });

  for (const [index, chapter] of book.chapters.entries()) {
    const chapterFields = {
      title: chapter.title,
      duration: chapter.duration,
      audioUrl: audioUrlFor(book, index),
    };

    await db.chapter.upsert({
      where: { bookId_index: { bookId: record.id, index } },
      create: { bookId: record.id, index, ...chapterFields },
      update: chapterFields,
    });
  }

  // Drop chapters left over from an earlier, longer version of this book.
  const removed = await db.chapter.deleteMany({
    where: { bookId: record.id, index: { gte: book.chapters.length } },
  });

  return { totalDuration, removed: removed.count };
}

function warnAboutMissingAudio(books: SeedBook[]) {
  const missing = books.filter(
    (book) => !existsSync(path.join(ROOT, "public", "samples", book.slug)),
  );

  if (missing.length > 0) {
    console.warn(
      `\n! No sample audio for ${missing.length} book(s). Run: npm run sample:audio`,
    );
  }
}

async function main() {
  const raw = await readFile(SEED_FILE, "utf8");
  const books: SeedBook[] = JSON.parse(raw).books;

  console.log(`Seeding ${books.length} books from ${path.basename(SEED_FILE)}\n`);

  for (const book of books) {
    const { totalDuration, removed } = await seedBook(book);
    const note = removed > 0 ? ` (${removed} stale chapter(s) removed)` : "";
    console.log(
      `  ${book.title} — ${book.chapters.length} chapters, ${totalDuration}s${note}`,
    );
  }

  warnAboutMissingAudio(books);

  const [bookCount, chapterCount] = await Promise.all([
    db.book.count(),
    db.chapter.count(),
  ]);

  console.log(`\nDatabase now holds ${bookCount} books / ${chapterCount} chapters.`);
}

try {
  await main();
} finally {
  await db.$disconnect();
}
