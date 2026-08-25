// Catalogue ingestion for MONK.
//
//   npm run ingest                                    # dry run, 5 books
//   npm run ingest -- --source librivox --write       # public domain audiobooks
//   npm run ingest -- --source librivox --language Turkish --limit 5000 --write
//   npm run ingest -- --source html --write           # a site with no API
//
// Rules the code enforces rather than trusting the operator to remember:
//
//   1. robots.txt is fetched first and obeyed. Unreadable aborts the run — it
//      is never read as permission.
//   2. One request at a time, at least INGEST_DELAY_MS apart, raised to match
//      Crawl-delay, with a User-Agent that identifies this crawler.
//   3. Only titles stating a public domain or free licence are kept.
//
// Nothing is written until --write is passed.

import path from "node:path";
import { db } from "../src/lib/db.ts";
import { PoliteClient } from "../src/lib/ingest/http.ts";
import { classifyLicense } from "../src/lib/ingest/license.ts";
import { slugify, upsertBook } from "../src/lib/ingest/persist.ts";
import { IngestReport } from "../src/lib/ingest/report.ts";
import { fetchRobots } from "../src/lib/ingest/robots.ts";
import type { BookHandler, SourceContext } from "../src/lib/ingest/sources/context.ts";
import { crawlHtml } from "../src/lib/ingest/sources/html.ts";
import { crawlLibrivox, librivoxBase } from "../src/lib/ingest/sources/librivox.ts";
import type { SourceBook } from "../src/lib/ingest/sources/types.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

function readArgs(argv: string[]) {
  const num = (flag: string, fallback: number) => {
    const index = argv.indexOf(flag);
    const parsed = Number(argv[index + 1]);
    return index !== -1 && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  const str = (flag: string, fallback?: string) => {
    const index = argv.indexOf(flag);
    return index !== -1 && argv[index + 1] ? argv[index + 1] : fallback;
  };

  return {
    source: str("--source", process.env.INGEST_SOURCE ?? "html")!,
    language: str("--language"),
    limit: num("--limit", 5),
    pages: num("--pages", 2),
    write: argv.includes("--write"),
  };
}

function htmlOptions() {
  const baseUrl = process.env.INGEST_BASE_URL;
  if (!baseUrl) throw new Error("INGEST_BASE_URL is not set. Copy .env.example to .env.");

  return {
    baseUrl,
    catalogPath: process.env.INGEST_CATALOG_PATH ?? "/",
    bookUrlPattern: new RegExp(
      process.env.INGEST_BOOK_URL_PATTERN ?? "/(kitap|book|audiobook)/[^/]+/?$",
    ),
  };
}

function describe(book: SourceBook) {
  const line = (label: string, value: unknown) =>
    console.log(`    ${label.padEnd(12)} ${value === undefined || value === "" ? "—" : value}`);

  console.log(`\n  ${book.sourceUrl}`);
  line("title", book.title);
  line("author", book.author);
  line("narrator", book.narrator);
  line("category", book.category);
  line("language", book.language);
  line("duration", `${book.totalDuration}s`);
  line("licence", book.licenseText);
  line("chapters", book.chapters.length);

  for (const chapter of book.chapters.slice(0, 2)) {
    console.log(`      ${chapter.index + 1}. ${chapter.title} — ${chapter.audioUrl}`);
  }

  if (book.chapters.length > 2) console.log(`      … ${book.chapters.length - 2} more`);
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const report = new IngestReport(path.join(ROOT, "logs", "ingest.jsonl"));
  await report.start();

  const userAgent =
    process.env.INGEST_USER_AGENT ?? "MONK/0.1 (+https://github.com/nuriyevgoshgar/monk)";
  const isLibrivox = args.source === "librivox";
  const originUrl = isLibrivox ? librivoxBase() : htmlOptions().baseUrl;

  console.log(`Source:     ${args.source} (${originUrl})`);
  console.log(`User-Agent: ${userAgent}`);
  console.log(`Mode:       ${args.write ? "WRITE to database" : "dry run (pass --write to save)"}\n`);

  console.log("Checking robots.txt…");
  const robots = await fetchRobots(originUrl, userAgent);

  const client = new PoliteClient({
    userAgent,
    delayMs: Number(process.env.INGEST_DELAY_MS ?? 1000),
  });
  client.respectCrawlDelay(robots.crawlDelayMs);

  console.log(
    robots.absent
      ? "  no robots.txt served — treating as unrestricted"
      : `  ${robots.disallow.length} disallow rule(s), crawl delay ${client.currentDelayMs}ms`,
  );

  let kept = 0;

  const ctx: SourceContext = {
    client,
    robots,
    limit: args.limit,
    log: (message) => console.log(message),
    onSkip: (url, reason, title) => report.record("skipped", url, { reason, title }),
    onBroken: (url, reason) => report.record("broken", url, { reason }),
  };

  const handle: BookHandler = async (book) => {
    describe(book);

    const verdict = classifyLicense(book.licenseText);

    if (!verdict.allowed) {
      console.log(`    -> SKIPPED: ${verdict.reason}`);
      await report.record("skipped", book.sourceUrl, { title: book.title, reason: verdict.reason });
      return;
    }

    if (!args.write) {
      console.log("    -> parsed OK (dry run, not saved)");
      kept += 1;
      return;
    }

    const saved = await upsertBook({
      ...book,
      slug: slugify(book.title),
      license: verdict.license,
    });

    console.log(`    -> saved as /book/${saved.slug}`);
    kept += 1;
    await report.record("ingested", book.sourceUrl, { title: book.title });
  };

  if (isLibrivox) {
    await crawlLibrivox(ctx, { language: args.language }, handle);
  } else {
    await crawlHtml(ctx, { ...htmlOptions(), maxPages: args.pages }, handle);
  }

  const summary = report.summary;
  console.log(
    `\n${args.write ? summary.ingested + " ingested" : kept + " would be ingested"}, ` +
      `${summary.skipped} skipped, ${summary.broken} broken ` +
      `across ${client.requestCount} request(s).`,
  );
  console.log(`Report: ${path.relative(ROOT, summary.file)}`);
}

try {
  await main();
} finally {
  await db.$disconnect();
}
