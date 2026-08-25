// Decides whether a title may be ingested at all.
//
// The rule is "public domain or freely licensed only", and this module is
// deliberately strict: a title is kept only when its page states a licence we
// recognise as free. Silence is not permission, so anything unlabelled is
// skipped and logged for a human to look at. That way an unattended crawl
// cannot quietly pull in material it has no right to.
//
// Turkish markers are included because the source catalogue is Turkish.

const FREE_MARKERS = [
  "public domain",
  "publicdomain",
  "kamu malı",
  "kamu mali",
  "telifsiz",
  "telif hakkı bulunmamaktadır",
  "creativecommons.org",
  "creative commons",
  "cc0",
  "cc-by",
  "cc by",
  "gnu free documentation",
  "gutenberg",
  "librivox",
  "no known copyright",
  "copyright free",
  "royalty free",
];

// Checked first: an explicit reservation overrides anything permissive-looking
// that happens to appear on the same page.
const RESERVED_MARKERS = [
  "all rights reserved",
  "tüm hakları saklıdır",
  "tum haklari saklidir",
  "her hakkı saklıdır",
  "©",
  "(c)",
  "copyright ©",
  "nc-nd",
  "noncommercial",
  "no derivatives",
];

export type LicenseVerdict =
  | { allowed: true; license: string }
  | { allowed: false; reason: string };

export function classifyLicense(licenseText: string | undefined): LicenseVerdict {
  const text = (licenseText ?? "").trim();

  if (text.length === 0) {
    return {
      allowed: false,
      reason:
        "no licence stated on the page — skipped, because only public domain or " +
        "freely licensed titles may be ingested",
    };
  }

  const haystack = text.toLowerCase();

  const reserved = RESERVED_MARKERS.find((marker) => haystack.includes(marker));
  if (reserved) {
    return { allowed: false, reason: `licence reserves rights (matched "${reserved}"): ${text}` };
  }

  const free = FREE_MARKERS.find((marker) => haystack.includes(marker));
  if (free) return { allowed: true, license: text };

  return {
    allowed: false,
    reason:
      `licence not recognised as free (matched no known marker): ${text}. ` +
      `Add the marker to FREE_MARKERS in src/lib/ingest/license.ts if it is one.`,
  };
}
