// Catalogue ingestion for MONK.
//
//   npm run ingest              # 5 books, dry run — prints what it parsed
//   npm run ingest -- --write   # same, but writes to the database
//   npm run ingest -- --limit 200 --pages 20 --write
//
// Three rules are enforced by the code rather than by the operator:
//
//   1. robots.txt is fetched first and obeyed. An unreadable robots.txt aborts
//      the run — it is never read as permission.
//   2. One request at a time, at least INGEST_DELAY_MS apart, raised to match
//      any Crawl-delay, with a User-Agent that identifies this crawler.
//   3. Only titles whose page states a public domain or free licence are kept.
//      Anything unlabelled is skipped and logged.
//
// The parsing itself has never run against the live site (it was unreachable
// when this was written), so expect the selectors to need tuning. Start with
// the dry run and read the report file.

import path from "node:path";
import { db } from "../src/lib/db.ts";
import { findBookLinks, findNextPageLink } from "../src/lib/ingest/discover.ts";
import { extractBook } from "../src/lib/ingest/extract.ts";
import { PoliteClient } from "../src/lib/ingest/http.ts";
import { classifyLicense } from "../src/lib/ingest/license.ts";
import { slugify, upsertBook } from "../src/lib/ingest/persist.ts";
import { IngestReport } from "../src/lib/ingest/report.ts";
import { fetchRobots, isAllowed } from "../src/lib/ingest/robots.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

function readArgs(argv: string[]) {
  const value = (flag: string, fallback: number) => {
    const index = argv.indexOf(flag);
    if (index === -1) return fallback;
    const parsed = Number(argv[index + 1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  return {
    limit: value("--limit", 5),
    pages: value("--pages", 2),
    // Writing is opt-in: the default run only shows what it parsed.
    write: argv.includes("--write"),
  };
}

function readEnv() {
  const baseUrl = process.env.INGEST_BASE_URL;

  if (!baseUrl) {
    throw new Error("INGEST_BASE_URL is not set. Copy .env.example to .env.");
  }

  return {
    baseUrl,
    userAgent: process.env.INGEST_USER_AGENT ?? "MONK/0.1 (+https://github.com/nuriyevgoshgar/monk)",
    delayMs: Number(process.env.INGEST_DELAY_MS ?? 1000),
    catalogPath: process.env.INGEST_CATALOG_PATH ?? "/",
    // Which paths count as a book page. Tune from .env, not from the code.
    bookUrlPattern: new RegExp(process.env.INGEST_BOOK_URL_PATTERN ?? "/(kitap|book|audiobook)/[^/]+/?$"),
  };
}

async function collectBookUrls(
  client: PoliteClient,
  env: ReturnType<typeof readEnv>,
  robots: Awaited<ReturnType<typeof fetchRobots>>,
  report: IngestReport,
  limit: number,
  maxPages: number,
): Promise<string[]> {
  const found: string[] = [];
  let pageUrl: string | undefined = new URL(env.catalogPath, env.baseUrl).toString();

  for (let page = 0; page < maxPages && pageUrl && found.length < limit; page += 1) {
    if (!isAllowed(robots, pageUrl)) {
      await report.record("skipped", pageUrl, { reason: "disallowed by robots.txt" });
      break;
    }

    const response = await client.fetchText(pageUrl);

    if (response.status !== 200) {
      await report.record("broken", pageUrl, { reason: `catalogue page returned ${response.status}` });
      break;
    }

    for (const link of findBookLinks(response.body, response.url, env)) {
      if (!found.includes(link)) found.push(link);
    }

    console.log(`  catalogue page ${page + 1}: ${found.length} book link(s) so far`);
    pageUrl = findNextPageLink(response.body, response.url, env.baseUrl);
  }

  return found.slice(0, limit);
}

function describe(book: ReturnType<typeof extractBook>, url: string) {
  const line = (label: string, value: unknown) =>
    console.log(`    ${label.padEnd(14)} ${value === undefined || value === "" ? "—" : value}`);

  console.log(`\n  ${url}`);
  line("title", book.title);
  line("author", book.author);
  line("narrator", book.narrator);
  line("category", book.category);
  line("language", book.language);
  line("duration", book.totalDuration ? `${book.totalDuration}s` : undefined);
  line("cover", book.coverUrl);
  line("licence", book.licenseText);
  line("chapters", book.chapters.length);

  for (const chapter of book.chapters.slice(0, 3)) {
    console.log(`      ${chapter.index + 1}. ${chapter.title} — ${chapter.audioUrl}`);
  }

  if (book.chapters.length > 3) console.log(`      … ${book.chapters.length - 3} more`);

  const description = book.description ?? "";
  line("description", description.length > 100 ? description.slice(0, 100) + "…" : description);
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const env = readEnv();
  const report = new IngestReport(path.join(ROOT, "logs", "ingest.jsonl"));
  await report.start();

  console.log(`Source:    ${env.baseUrl}`);
  console.log(`User-Agent ${env.userAgent}`);
  console.log(`Mode:      ${args.write ? "WRITE to database" : "dry run (pass --write to save)"}\n`);

  console.log("Checking robots.txt…");
  const robots = await fetchRobots(env.baseUrl, env.userAgent);

  const client = new PoliteClient({ userAgent: env.userAgent, delayMs: env.delayMs });
  client.respectCrawlDelay(robots.crawlDelayMs);

  console.log(
    robots.absent
      ? "  no robots.txt served — treating as unrestricted"
      : `  ${robots.disallow.length} disallow rule(s), crawl delay ${client.currentDelayMs}ms`,
  );

  const catalogUrl = new URL(env.catalogPath, env.baseUrl).toString();

  if (!isAllowed(robots, catalogUrl)) {
    throw new Error(
      `robots.txt disallows ${catalogUrl}. Stopping — this is the site asking not ` +
        `to be crawled here, and the crawl will not proceed against it.`,
    );
  }

  console.log(`\nCollecting up to ${args.limit} book link(s)…`);
  const bookUrls = await collectBookUrls(client, env, robots, report, args.limit, args.pages);

  if (bookUrls.length === 0) {
    console.log(
      "\nNo book links found. The catalogue path or INGEST_BOOK_URL_PATTERN " +
        "probably needs adjusting for this site's URL shape.",
    );
    return;
  }

  console.log(`\nFetching ${bookUrls.length} book page(s)…`);

  for (const url of bookUrls) {
    if (!isAllowed(robots, url)) {
      await report.record("skipped", url, { reason: "disallowed by robots.txt" });
      continue;
    }

    let response: Awaited<ReturnType<typeof client.fetchText>>;

    try {
      response = await client.fetchText(url);
    } catch (error) {
      await report.record("broken", url, {
        reason: error instanceof Error ? error.message : "fetch failed",
      });
      continue;
    }

    if (response.status !== 200) {
      await report.record("broken", url, { reason: `returned ${response.status}` });
      continue;
    }

    const parsed = extractBook(response.body, response.url);
    describe(parsed, response.url);

    const verdict = classifyLicense(parsed.licenseText);

    if (!verdict.allowed) {
      console.log(`    -> SKIPPED: ${verdict.reason}`);
      await report.record("skipped", url, { title: parsed.title, reason: verdict.reason });
      continue;
    }

    if (!parsed.title || parsed.chapters.length === 0) {
      const reason = !parsed.title ? "no title found" : "no audio chapters found";
      console.log(`    -> SKIPPED: ${reason}`);
      await report.record("skipped", url, { title: parsed.title, reason });
      continue;
    }

    if (!parsed.narrator) {
      await report.record("skipped", url, {
        title: parsed.title,
        reason: "no narrator found; stored as “Unknown” — every book page must credit one",
      });
    }

    if (!args.write) {
      console.log("    -> parsed OK (dry run, not saved)");
      continue;
    }

    const totalDuration =
      parsed.totalDuration ?? parsed.chapters.reduce((sum, c) => sum + c.duration, 0);

    const saved = await upsertBook({
      title: parsed.title,
      slug: slugify(parsed.title),
      author: parsed.author ?? "Unknown",
      narrator: parsed.narrator ?? "Unknown",
      coverUrl: parsed.coverUrl ?? "",
      description: parsed.description ?? "",
      category: parsed.category ?? "Uncategorised",
      language: parsed.language ?? "tr",
      totalDuration,
      sourceUrl: response.url,
      license: verdict.license,
      chapters: parsed.chapters,
    });

    console.log(`    -> saved as /book/${saved.slug}`);
    await report.record("ingested", url, { title: parsed.title });
  }

  const summary = report.summary;
  console.log(
    `\n${summary.ingested} ingested, ${summary.skipped} skipped, ${summary.broken} broken ` +
      `across ${client.requestCount} request(s).`,
  );
  console.log(`Report: ${path.relative(ROOT, summary.file)}`);
}

try {
  await main();
} finally {
  await db.$disconnect();
}
