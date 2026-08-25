// Turns a book page's HTML into the fields the schema needs.
//
// UNVERIFIED AGAINST THE LIVE SITE. seslikitab.org is unreachable from the
// environment this was written in, so the selectors below have never seen the
// real markup. The order is deliberate — structured data first, because it is
// the part least likely to need tuning:
//
//   1. JSON-LD (schema.org Audiobook/Book/AudioObject) — standard, stable
//   2. OpenGraph / <meta> tags — widely present, coarse
//   3. Regex over the raw HTML — a last resort, and the first thing to fix
//
// Anything that cannot be extracted is left undefined; the caller decides
// whether the record is complete enough to keep.

export type ExtractedChapter = {
  index: number;
  title: string;
  audioUrl: string;
  duration: number;
};

export type ExtractedBook = {
  title?: string;
  author?: string;
  narrator?: string;
  coverUrl?: string;
  description?: string;
  category?: string;
  language?: string;
  totalDuration?: number;
  licenseText?: string;
  chapters: ExtractedChapter[];
};

const decodeEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ");

const clean = (value: string | undefined) => {
  const text = decodeEntities(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : undefined;
};

/** Accepts ISO-8601 ("PT1H2M3S") and clock ("1:02:03" / "12:34") forms. */
export function parseDuration(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return undefined;

  const text = value.trim();

  // A bare number of seconds, which some feeds send as a string.
  if (/^\d+(\.\d+)?$/.test(text)) {
    const seconds = Math.round(Number(text));
    return seconds > 0 ? seconds : undefined;
  }

  const iso = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/i.exec(text);
  if (iso) {
    const [, h, m, s] = iso;
    const total = Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
    return total > 0 ? Math.round(total) : undefined;
  }

  if (/^\d{1,3}(:\d{1,2}){1,2}$/.test(text)) {
    const parts = text.split(":").map(Number);
    const total = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1];
    return total > 0 ? total : undefined;
  }

  return undefined;
}

function collectJsonLd(html: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      // A document may hold a single node, an array, or an @graph wrapper.
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { "@graph"?: unknown[] })["@graph"])
          ? (parsed as { "@graph": unknown[] })["@graph"]
          : [parsed];

      for (const node of nodes) {
        if (node && typeof node === "object") found.push(node as Record<string, unknown>);
      }
    } catch {
      // Malformed JSON-LD is common; fall through to the other strategies.
    }
  }

  return found;
}

const nameOf = (value: unknown): string | undefined => {
  if (typeof value === "string") return clean(value);
  if (Array.isArray(value)) return nameOf(value[0]);
  if (value && typeof value === "object") return clean(String((value as { name?: string }).name ?? ""));
  return undefined;
};

const urlOf = (value: unknown): string | undefined => {
  if (typeof value === "string") return clean(value);
  if (Array.isArray(value)) return urlOf(value[0]);
  if (value && typeof value === "object") {
    const record = value as { url?: string; contentUrl?: string };
    return clean(record.contentUrl ?? record.url ?? "");
  }
  return undefined;
};

function metaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
      "i",
    );
    const direct = pattern.exec(html);
    if (direct) return clean(direct[1]);

    // Same tag with the attributes in the opposite order.
    const reversed = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ).exec(html);
    if (reversed) return clean(reversed[1]);
  }

  return undefined;
}

const AUDIO_EXTENSIONS = /\.(mp3|m4a|m4b|aac|ogg|opus|wav|flac)(\?[^"'\s]*)?$/i;

/** Audio sources, in document order, deduplicated. */
function findAudioUrls(html: string, pageUrl: string): string[] {
  const urls: string[] = [];
  const push = (raw: string | undefined) => {
    const value = clean(raw);
    if (!value) return;

    try {
      const absolute = new URL(value, pageUrl).toString();
      if (AUDIO_EXTENSIONS.test(absolute) && !urls.includes(absolute)) urls.push(absolute);
    } catch {
      // Not a usable URL.
    }
  };

  for (const match of html.matchAll(/<(?:audio|source)[^>]+src=["']([^"']+)["']/gi)) push(match[1]);
  for (const match of html.matchAll(/data-(?:src|audio|file|url|mp3)=["']([^"']+)["']/gi)) push(match[1]);
  // Media URLs embedded in inline scripts (playlist arrays and the like),
  // absolute and root-relative alike — both shapes are common.
  for (const match of html.matchAll(/["'](https?:\/\/[^"']+?\.(?:mp3|m4a|m4b|aac|ogg|opus|wav|flac))(?:\?[^"']*)?["']/gi)) push(match[1]);
  for (const match of html.matchAll(/["'](\/[^"':\s]+?\.(?:mp3|m4a|m4b|aac|ogg|opus|wav|flac))(?:\?[^"']*)?["']/gi)) push(match[1]);

  return urls;
}

function chaptersFromJsonLd(nodes: Record<string, unknown>[], pageUrl: string): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];

  for (const node of nodes) {
    const parts = node.hasPart ?? node.track ?? node.episode;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (!part || typeof part !== "object") continue;

      const record = part as Record<string, unknown>;
      const audioUrl = urlOf(record.contentUrl ?? record.associatedMedia ?? record.url);
      if (!audioUrl) continue;

      try {
        chapters.push({
          index: chapters.length,
          title: nameOf(record.name) ?? `Chapter ${chapters.length + 1}`,
          audioUrl: new URL(audioUrl, pageUrl).toString(),
          duration: parseDuration(record.duration) ?? 0,
        });
      } catch {
        // Skip a part whose URL will not resolve.
      }
    }

    if (chapters.length > 0) break;
  }

  return chapters;
}

export function extractBook(html: string, pageUrl: string): ExtractedBook {
  const nodes = collectJsonLd(html);
  const wanted = new Set(["audiobook", "book", "audioobject", "creativework", "podcastepisode"]);
  const main = nodes.find((node) => {
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    return types.some((t) => typeof t === "string" && wanted.has(t.toLowerCase()));
  }) ?? nodes[0];

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const langAttr = /<html[^>]+lang=["']([^"']+)["']/i.exec(html);

  let chapters = chaptersFromJsonLd(nodes, pageUrl);

  if (chapters.length === 0) {
    chapters = findAudioUrls(html, pageUrl).map((audioUrl, index) => ({
      index,
      title: `Chapter ${index + 1}`,
      audioUrl,
      duration: 0,
    }));
  }

  return {
    title:
      nameOf(main?.name) ??
      metaContent(html, ["og:title", "twitter:title"]) ??
      clean(titleTag?.[1]),
    author: nameOf(main?.author) ?? metaContent(html, ["book:author", "author"]),
    narrator: nameOf(main?.readBy ?? main?.actor ?? main?.performer),
    coverUrl:
      urlOf(main?.image) ?? metaContent(html, ["og:image", "twitter:image"]),
    description:
      clean(typeof main?.description === "string" ? main.description : undefined) ??
      metaContent(html, ["og:description", "description"]),
    category: nameOf(main?.genre) ?? metaContent(html, ["article:section"]),
    language:
      clean(typeof main?.inLanguage === "string" ? main.inLanguage : nameOf(main?.inLanguage)) ??
      metaContent(html, ["og:locale"]) ??
      clean(langAttr?.[1]),
    totalDuration:
      parseDuration(main?.duration) ??
      (chapters.length > 0
        ? chapters.reduce((sum, chapter) => sum + chapter.duration, 0) || undefined
        : undefined),
    licenseText:
      urlOf(main?.license) ??
      nameOf(main?.license) ??
      clean(typeof main?.copyrightNotice === "string" ? main.copyrightNotice : undefined) ??
      metaContent(html, ["license", "dc.rights", "copyright"]),
    chapters,
  };
}
