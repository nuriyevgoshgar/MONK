// The generic HTML source: walk a catalogue, follow book links, read each page.
//
// Used for sites with no API. Selectors are guesses until run against the real
// markup — see src/lib/ingest/extract.ts.

import { findBookLinks, findNextPageLink } from "../discover.ts";
import { extractBook } from "../extract.ts";
import { isAllowed } from "../robots.ts";
import type { BookHandler, SourceContext } from "./context.ts";

export type HtmlSourceOptions = {
  baseUrl: string;
  catalogPath: string;
  bookUrlPattern: RegExp;
  maxPages: number;
};

async function collectBookUrls(
  ctx: SourceContext,
  options: HtmlSourceOptions,
): Promise<string[]> {
  const found: string[] = [];
  let pageUrl: string | undefined = new URL(options.catalogPath, options.baseUrl).toString();

  for (let page = 0; page < options.maxPages && pageUrl && found.length < ctx.limit; page += 1) {
    if (!isAllowed(ctx.robots, pageUrl)) {
      await ctx.onSkip(pageUrl, "disallowed by robots.txt");
      break;
    }

    const response = await ctx.client.fetchText(pageUrl);

    if (response.status !== 200) {
      await ctx.onBroken(pageUrl, `catalogue page returned ${response.status}`);
      break;
    }

    for (const link of findBookLinks(response.body, response.url, options)) {
      if (!found.includes(link)) found.push(link);
    }

    ctx.log(`  catalogue page ${page + 1}: ${found.length} book link(s) so far`);
    pageUrl = findNextPageLink(response.body, response.url, options.baseUrl);
  }

  return found.slice(0, ctx.limit);
}

export async function crawlHtml(
  ctx: SourceContext,
  options: HtmlSourceOptions,
  handle: BookHandler,
): Promise<void> {
  const catalogUrl = new URL(options.catalogPath, options.baseUrl).toString();

  if (!isAllowed(ctx.robots, catalogUrl)) {
    throw new Error(
      `robots.txt disallows ${catalogUrl}. Stopping — this is the site asking not ` +
        `to be crawled here, and the crawl will not proceed against it.`,
    );
  }

  ctx.log(`\nCollecting up to ${ctx.limit} book link(s)…`);
  const bookUrls = await collectBookUrls(ctx, options);

  if (bookUrls.length === 0) {
    ctx.log(
      "\nNo book links found. The catalogue path or INGEST_BOOK_URL_PATTERN " +
        "probably needs adjusting for this site's URL shape.",
    );
    return;
  }

  ctx.log(`\nFetching ${bookUrls.length} book page(s)…`);

  for (const url of bookUrls) {
    if (!isAllowed(ctx.robots, url)) {
      await ctx.onSkip(url, "disallowed by robots.txt");
      continue;
    }

    let response: Awaited<ReturnType<typeof ctx.client.fetchText>>;

    try {
      response = await ctx.client.fetchText(url);
    } catch (error) {
      await ctx.onBroken(url, error instanceof Error ? error.message : "fetch failed");
      continue;
    }

    if (response.status !== 200) {
      await ctx.onBroken(url, `returned ${response.status}`);
      continue;
    }

    const parsed = extractBook(response.body, response.url);

    if (!parsed.title || parsed.chapters.length === 0) {
      await ctx.onSkip(
        url,
        !parsed.title ? "no title found" : "no audio chapters found",
        parsed.title,
      );
      continue;
    }

    await handle({
      title: parsed.title,
      author: parsed.author ?? "Unknown",
      narrator: parsed.narrator ?? "Unknown",
      coverUrl: parsed.coverUrl ?? "",
      description: parsed.description ?? "",
      category: parsed.category ?? "Uncategorised",
      language: parsed.language ?? "tr",
      totalDuration:
        parsed.totalDuration ?? parsed.chapters.reduce((sum, c) => sum + c.duration, 0),
      sourceUrl: response.url,
      licenseText: parsed.licenseText,
      chapters: parsed.chapters,
    });
  }
}
