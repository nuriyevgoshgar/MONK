// An allow-list of languages to keep, applied after a book has been mapped but
// before it is saved.
//
// This is not the same thing as the LibriVox feed's own `language` parameter.
// That one asks the source for a single language; this one filters whatever any
// source hands back, so a feed that ignores the request — or an HTML crawl with
// no such parameter at all — still cannot slip other languages into the
// catalogue.

/** Normalises "  English , turkish " to ["english", "turkish"]. */
export function parseLanguageList(raw: string | null | undefined): string[] {
  if (!raw) return [];

  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== "");
}

/**
 * An empty allow-list means "no restriction" rather than "allow nothing" — a
 * blank setting should not silently reject the whole catalogue.
 */
export function isLanguageAllowed(
  language: string,
  allowed: string[],
): boolean {
  if (allowed.length === 0) return true;

  return allowed.includes(language.trim().toLowerCase());
}

/** The skip reason recorded in the run report, so a run explains itself. */
export function languageSkipReason(
  language: string,
  allowed: string[],
): string {
  return (
    `language "${language}" is not in the allowed list ` +
    `(${allowed.join(", ")}) — skipped`
  );
}
