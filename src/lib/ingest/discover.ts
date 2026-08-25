// Finds book-page links on a catalogue page.
//
// UNVERIFIED AGAINST THE LIVE SITE — the URL shape is a guess. It is a regex
// rather than a hardcoded path so it can be corrected from the environment
// (INGEST_BOOK_URL_PATTERN) without touching this file.

export type DiscoverOptions = {
  /** Matched against each link's pathname to decide if it is a book page. */
  bookUrlPattern: RegExp;
  /** Links off the source host are never followed. */
  baseUrl: string;
};

function absoluteLinks(html: string, pageUrl: string): string[] {
  const links: string[] = [];

  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], pageUrl);
      url.hash = "";
      links.push(url.toString());
    } catch {
      // Not a resolvable href.
    }
  }

  return links;
}

export function findBookLinks(
  html: string,
  pageUrl: string,
  options: DiscoverOptions,
): string[] {
  const host = new URL(options.baseUrl).host;
  const seen = new Set<string>();

  for (const link of absoluteLinks(html, pageUrl)) {
    const url = new URL(link);
    // Same host only: a crawl should never wander onto another site.
    if (url.host !== host) continue;
    if (!options.bookUrlPattern.test(url.pathname)) continue;

    seen.add(url.toString());
  }

  return [...seen];
}

/** "Next page" style links, so the catalogue can be walked without guessing URLs. */
export function findNextPageLink(
  html: string,
  pageUrl: string,
  baseUrl: string,
): string | undefined {
  const relNext = /<a[^>]+rel=["']next["'][^>]*href=["']([^"'#]+)["']/i.exec(html)
    ?? /<link[^>]+rel=["']next["'][^>]*href=["']([^"'#]+)["']/i.exec(html);

  const candidate = relNext?.[1];
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate, pageUrl);
    return url.host === new URL(baseUrl).host ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
