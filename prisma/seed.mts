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
// Written by an ingestion run (scripts/export-catalog.mjs). Optional: without
// it the seed loads only the hand-written development books.
const CATALOG_FILE = path.join(ROOT, "prisma", "seed-data", "catalog.json");

function audioUrlFor(book: SeedBook, index: number): string {
  // Ingested books carry real, absolute audio URLs; only the hand-written
  // development books point at the locally generated samples.
  return `/samples/${book.slug}/${index + 1}.wav`;
}

// Omit rather than intersect: SeedBook's own `chapters` would otherwise win
// and the audioUrl below would not typecheck.
type CatalogBook = Omit<SeedBook, "chapters"> & {
  sourceUrl: string;
  license: string;
  chapters: (SeedChapter & { audioUrl: string })[];
};

async function loadCatalog(): Promise<CatalogBook[]> {
  try {
    const raw = await readFile(CATALOG_FILE, "utf8");
    const parsed = JSON.parse(raw) as { books?: CatalogBook[] };
    return Array.isArray(parsed.books) ? parsed.books : [];
  } catch {
    return [];
  }
}

async function seedCatalogBook(book: CatalogBook) {
  const totalDuration = book.chapters.reduce((sum, c) => sum + c.duration, 0);

  const fields = {
    title: book.title,
    author: book.author,
    narrator: book.narrator,
    coverUrl: book.coverUrl,
    description: book.description,
    category: book.category,
    language: book.language,
    totalDuration,
    license: book.license,
  };

  const record = await db.book.upsert({
    where: { sourceUrl: book.sourceUrl },
    create: { sourceUrl: book.sourceUrl, slug: book.slug, ...fields },
    update: { slug: book.slug, ...fields },
  });

  for (const [index, chapter] of book.chapters.entries()) {
    const chapterFields = {
      title: chapter.title,
      duration: chapter.duration,
      audioUrl: chapter.audioUrl,
    };

    await db.chapter.upsert({
      where: { bookId_index: { bookId: record.id, index } },
      create: { bookId: record.id, index, ...chapterFields },
      update: chapterFields,
    });
  }

  await db.chapter.deleteMany({
    where: { bookId: record.id, index: { gte: book.chapters.length } },
  });
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

  const catalog = await loadCatalog();

  if (catalog.length > 0) {
    console.log(`\nSeeding ${catalog.length} ingested book(s) from catalog.json`);

    for (const book of catalog) {
      await seedCatalogBook(book);
    }
  }

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
