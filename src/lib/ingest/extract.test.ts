import assert from "node:assert/strict";
import { test } from "node:test";
import { extractBook, parseDuration } from "./extract.ts";

// Invented fixtures — this markup is not from the source site, which could not
// be reached. They pin the extraction logic, not the site's real selectors.
const PAGE_URL = "https://example.test/kitap/ornek-kitap";

test("parses ISO-8601 durations", () => {
  assert.equal(parseDuration("PT1H2M3S"), 3723);
  assert.equal(parseDuration("PT45M"), 2700);
});

test("parses clock durations", () => {
  assert.equal(parseDuration("1:02:03"), 3723);
  assert.equal(parseDuration("12:34"), 754);
});

test("reads a bare number of seconds, sent as a string or a number", () => {
  assert.equal(parseDuration("1800"), 1800);
  assert.equal(parseDuration(1800), 1800);
  assert.equal(parseDuration("0"), undefined);
});

test("rejects values it cannot read", () => {
  assert.equal(parseDuration("soon"), undefined);
  assert.equal(parseDuration(undefined), undefined);
});

test("prefers JSON-LD over meta tags", () => {
  const html = `<html lang="tr"><head>
    <meta property="og:title" content="Wrong Title">
    <script type="application/ld+json">${JSON.stringify({
      "@type": "Audiobook",
      name: "A Lantern in the Fog",
      author: { name: "H. Aydın" },
      readBy: { name: "Test Narrator" },
      image: "/covers/lantern.jpg",
      description: "An invented description for a fixture.",
      genre: "Classics",
      inLanguage: "tr",
      duration: "PT2H",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      hasPart: [
        { "@type": "AudioObject", name: "One", contentUrl: "/audio/1.mp3", duration: "PT30M" },
        { "@type": "AudioObject", name: "Two", contentUrl: "/audio/2.mp3", duration: "PT30M" },
      ],
    })}</script></head><body></body></html>`;

  const book = extractBook(html, PAGE_URL);

  assert.equal(book.title, "A Lantern in the Fog");
  assert.equal(book.author, "H. Aydın");
  assert.equal(book.narrator, "Test Narrator");
  assert.equal(book.category, "Classics");
  assert.equal(book.language, "tr");
  assert.equal(book.totalDuration, 7200);
  assert.equal(book.coverUrl, "/covers/lantern.jpg");
  assert.match(book.licenseText ?? "", /publicdomain/);
  assert.equal(book.chapters.length, 2);
  assert.equal(book.chapters[0].audioUrl, "https://example.test/audio/1.mp3");
  assert.equal(book.chapters[1].duration, 1800);
});

test("falls back to OpenGraph when there is no JSON-LD", () => {
  const html = `<html lang="tr"><head>
    <meta property="og:title" content="Fixture Title">
    <meta property="og:description" content="Fixture description.">
    <meta property="og:image" content="https://example.test/c.jpg">
    </head><body><audio src="/audio/only.mp3"></audio></body></html>`;

  const book = extractBook(html, PAGE_URL);

  assert.equal(book.title, "Fixture Title");
  assert.equal(book.description, "Fixture description.");
  assert.equal(book.coverUrl, "https://example.test/c.jpg");
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0].audioUrl, "https://example.test/audio/only.mp3");
});

test("finds audio in <source> tags and inline scripts, without duplicates", () => {
  const html = `<html><body>
    <audio><source src="/audio/a.mp3"></audio>
    <script>var playlist = ["https://example.test/audio/a.mp3","/audio/b.m4a"];</script>
    </body></html>`;

  const book = extractBook(html, PAGE_URL);
  const urls = book.chapters.map((c) => c.audioUrl);

  assert.equal(urls.length, 2);
  assert.ok(urls.includes("https://example.test/audio/a.mp3"));
  assert.ok(urls.includes("https://example.test/audio/b.m4a"));
});

test("ignores non-audio links", () => {
  const html = `<html><body><a href="/cover.jpg">x</a><img src="/x.png"></body></html>`;
  assert.equal(extractBook(html, PAGE_URL).chapters.length, 0);
});

test("decodes HTML entities in the title", () => {
  const html = `<html><head><title>Rain &amp; Stone</title></head><body></body></html>`;
  assert.equal(extractBook(html, PAGE_URL).title, "Rain & Stone");
});

test("survives malformed JSON-LD", () => {
  const html = `<html><head>
    <script type="application/ld+json">{ not json </script>
    <meta property="og:title" content="Still Works"></head><body></body></html>`;

  assert.equal(extractBook(html, PAGE_URL).title, "Still Works");
});
