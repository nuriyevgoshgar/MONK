// Reading one book page: fetch it, extract it, hand it on.
//
// Shared by the catalogue crawl and the single-URL mode, so adding a book by
// link goes through exactly the same robots check, extraction and gates as a
// book found by crawling. A second copy of this would be a second place for
// those checks to drift out of step.

import { extractBook } from "../extract.ts";
import { isAllowed } from "../robots.ts";
import type { BookHandler, SourceContext } from "./context.ts";

/** True when the page yielded a book that was passed to the handler. */
export async function ingestBookPage(
  ctx: SourceContext,
  url: string,
  handle: BookHandler,
): Promise<boolean> {
  if (!isAllowed(ctx.robots, url)) {
    await ctx.onSkip(url, "disallowed by robots.txt");
    return false;
  }

  let response: Awaited<ReturnType<typeof ctx.client.fetchText>>;

  try {
    response = await ctx.client.fetchText(url);
  } catch (error) {
    await ctx.onBroken(url, error instanceof Error ? error.message : "fetch failed");
    return false;
  }

  if (response.status !== 200) {
    await ctx.onBroken(url, `returned ${response.status}`);
    return false;
  }

  const parsed = extractBook(response.body, response.url);

  if (!parsed.title || parsed.chapters.length === 0) {
    await ctx.onSkip(
      url,
      !parsed.title ? "no title found" : "no audio chapters found",
      parsed.title,
    );
    return false;
  }

  await handle({
    title: parsed.title,
    author: parsed.author ?? "Unknown",
    narrator: parsed.narrator ?? "Unknown",
    coverUrl: parsed.coverUrl ?? "",
    description: parsed.description ?? "",
    category: parsed.category ?? "Uncategorised",
    // Not guessed. This used to default to "tr", which quietly labelled every
    // page that failed to state a language as Turkish — wrong data, and wrong
    // in a way the language allow-list would then act on. "Unknown" is honest,
    // and an allow-list rejects it rather than trusting a guess.
    language: parsed.language ?? "Unknown",
    totalDuration:
      parsed.totalDuration ?? parsed.chapters.reduce((sum, c) => sum + c.duration, 0),
    sourceUrl: response.url,
    licenseText: parsed.licenseText,
    chapters: parsed.chapters,
  });

  return true;
}
