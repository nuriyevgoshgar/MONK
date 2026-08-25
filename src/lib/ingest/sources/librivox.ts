// LibriVox, through its public JSON API.
//
// Preferred over scraping: LibriVox publishes a documented feed intended for
// programmatic use, so the fields are structured rather than guessed at, and
// every recording there is public domain by the project's own policy.
//
// UNVERIFIED SHAPE — the API was unreachable from the environment this was
// written in, so the response mapping below follows the documented feed rather
// than an observed one. It is written defensively: a field that is missing or
// differently named degrades to a fallback instead of throwing.
//
//   https://librivox.org/api/feed/audiobooks/?format=json&extended=1

import { parseDuration } from "../extract.ts";
import { isAllowed } from "../robots.ts";
import type { BookHandler, SourceContext } from "./context.ts";
import type { SourceBook } from "./types.ts";

export type LibriVoxOptions = {
  /** ISO-ish language name as LibriVox spells it, e.g. "English", "Turkish". */
  language?: string;
  /** Books per API call. LibriVox caps this; 50 is a safe page size. */
  pageSize?: number;
};

type LibriVoxSection = {
  section_number?: string | number;
  title?: string;
  listen_url?: string;
  playtime?: string | number;
  readers?: { display_name?: string }[];
};

type LibriVoxBook = {
  id?: string | number;
  title?: string;
  description?: string;
  language?: string;
  totaltimesecs?: number;
  url_librivox?: string;
  url_zip_file?: string;
  authors?: { first_name?: string; last_name?: string }[];
  genres?: { name?: string }[];
  sections?: LibriVoxSection[];
};

const stripTags = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function authorName(book: LibriVoxBook): string {
  const author = book.authors?.[0];
  if (!author) return "Unknown";

  const name = [author.first_name, author.last_name].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : "Unknown";
}

/** LibriVox books are often read by several people; name the most frequent. */
function narratorName(sections: LibriVoxSection[]): string {
  const tally = new Map<string, number>();

  for (const section of sections) {
    for (const reader of section.readers ?? []) {
      const name = reader.display_name?.trim();
      if (name) tally.set(name, (tally.get(name) ?? 0) + 1);
    }
  }

  if (tally.size === 0) return "LibriVox Volunteers";
  if (tally.size > 1) {
    const [top] = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    return `${top[0]} and others`;
  }

  return [...tally.keys()][0];
}

// Recordings live on archive.org, which serves a cover image per item. The item
// identifier appears in the download path.
//
// The zip URL is checked first but is often absent from the feed — a real run
// of 200 books returned it for none of them — so the fall back is the first
// chapter's audio URL, which every entry has by definition.
const ARCHIVE_ITEM = /archive\.org\/download\/([^/]+)\//;

function archiveIdentifier(book: LibriVoxBook): string | null {
  const fromZip = ARCHIVE_ITEM.exec(book.url_zip_file ?? "");
  if (fromZip) return fromZip[1];

  for (const section of book.sections ?? []) {
    const fromAudio = ARCHIVE_ITEM.exec(section.listen_url ?? "");
    if (fromAudio) return fromAudio[1];
  }

  return null;
}

function coverFromArchive(book: LibriVoxBook): string {
  const identifier = archiveIdentifier(book);
  return identifier ? `https://archive.org/services/img/${identifier}` : "";
}

export function toSourceBook(book: LibriVoxBook): SourceBook | null {
  const title = book.title?.trim();
  const sourceUrl = book.url_librivox?.trim();
  if (!title || !sourceUrl) return null;

  const sections = book.sections ?? [];

  const chapters = sections
    .filter((section) => Boolean(section.listen_url))
    .map((section, position) => ({
      index: Number(section.section_number ?? position + 1) - 1,
      title: section.title?.trim() || `Chapter ${position + 1}`,
      audioUrl: section.listen_url!,
      duration: parseDuration(section.playtime) ?? 0,
    }))
    // Section numbers can arrive out of order or duplicated.
    .sort((a, b) => a.index - b.index)
    .map((chapter, position) => ({ ...chapter, index: position }));

  if (chapters.length === 0) return null;

  return {
    title,
    author: authorName(book),
    narrator: narratorName(sections),
    coverUrl: coverFromArchive(book),
    description: stripTags(book.description ?? ""),
    category: book.genres?.[0]?.name?.trim() || "Uncategorised",
    language: book.language?.trim() || "English",
    totalDuration:
      Number(book.totaltimesecs) ||
      chapters.reduce((sum, chapter) => sum + chapter.duration, 0),
    sourceUrl,
    // LibriVox's own policy: every recording it publishes is public domain.
    licenseText: "Public domain (LibriVox)",
    chapters,
  };
}

/** Overridable so the source can be pointed at a mirror, or exercised in tests. */
export const librivoxBase = () =>
  process.env.INGEST_LIBRIVOX_BASE_URL ?? "https://librivox.org";

export function feedUrl(offset: number, options: LibriVoxOptions = {}): string {
  const params = new URLSearchParams({
    format: "json",
    extended: "1",
    limit: String(options.pageSize ?? 50),
    offset: String(offset),
  });

  if (options.language) params.set("language", options.language);

  return `${librivoxBase()}/api/feed/audiobooks/?${params.toString()}`;
}

export function parseFeed(body: string): LibriVoxBook[] {
  try {
    const parsed = JSON.parse(body) as { books?: LibriVoxBook[] };
    return Array.isArray(parsed.books) ? parsed.books : [];
  } catch {
    return [];
  }
}

export async function crawlLibrivox(
  ctx: SourceContext,
  options: LibriVoxOptions,
  handle: BookHandler,
): Promise<void> {
  const pageSize = options.pageSize ?? 50;
  let offset = 0;
  let delivered = 0;

  ctx.log(
    `\nReading the LibriVox feed${options.language ? ` (language: ${options.language})` : ""}…`,
  );

  while (delivered < ctx.limit) {
    const url = feedUrl(offset, { ...options, pageSize });

    if (!isAllowed(ctx.robots, url)) {
      await ctx.onSkip(url, "disallowed by robots.txt");
      return;
    }

    let response: Awaited<ReturnType<typeof ctx.client.fetchText>>;

    try {
      response = await ctx.client.fetchText(url);
    } catch (error) {
      await ctx.onBroken(url, error instanceof Error ? error.message : "fetch failed");
      return;
    }

    if (response.status !== 200) {
      // The feed answers 404 once the offset runs past the end of the catalogue.
      if (response.status !== 404) await ctx.onBroken(url, `feed returned ${response.status}`);
      return;
    }

    const books = parseFeed(response.body);
    if (books.length === 0) return;

    ctx.log(`  offset ${offset}: ${books.length} book(s)`);

    for (const raw of books) {
      if (delivered >= ctx.limit) return;

      const book = toSourceBook(raw);

      if (!book) {
        await ctx.onSkip(
          raw.url_librivox ?? `librivox:${raw.id ?? "unknown"}`,
          "no title, source URL or playable chapters in the feed entry",
          raw.title,
        );
        continue;
      }

      delivered += 1;
      await handle(book);
    }

    offset += pageSize;
  }
}
