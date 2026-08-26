// An allow-list of languages to keep, applied after a book has been mapped but
// before it is saved.
//
// This is not the same thing as the LibriVox feed's own `language` parameter.
// That one asks the source for a single language; this one filters whatever any
// source hands back, so a feed that ignores the request — or an HTML crawl with
// no such parameter at all — still cannot slip other languages into the
// catalogue.

// Sources spell the same language two different ways: a schema.org page says
// inLanguage "tr" or "en-US", while the LibriVox feed says "Turkish". Comparing
// the raw strings would reject a genuinely Turkish book for looking like "tr",
// so both sides are canonicalised to one name first.
const CODE_TO_NAME: Record<string, string> = {
  ar: "arabic",
  az: "azerbaijani",
  de: "german",
  en: "english",
  es: "spanish",
  fa: "persian",
  fr: "french",
  it: "italian",
  ja: "japanese",
  la: "latin",
  pt: "portuguese",
  ru: "russian",
  tr: "turkish",
  zh: "chinese",
};

/**
 * "  EN-us " and "English" both become "english"; an unrecognised value is
 * lower-cased and otherwise left alone rather than dropped, so a language this
 * table has never heard of still compares consistently against itself.
 */
export function canonicalLanguage(value: string): string {
  const trimmed = value.trim().toLowerCase();
  // Regional variants: en-US, pt-BR, zh-Hans.
  const base = trimmed.split(/[-_]/)[0];

  return CODE_TO_NAME[base] ?? trimmed;
}

/** Normalises "  English , tr " to ["english", "turkish"]. */
export function parseLanguageList(raw: string | null | undefined): string[] {
  if (!raw) return [];

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map(canonicalLanguage);
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

  return allowed.includes(canonicalLanguage(language));
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
