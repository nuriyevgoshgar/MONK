import assert from "node:assert/strict";
import { test } from "node:test";
import { feedUrl, parseFeed, toSourceBook } from "./librivox.ts";

// Invented fixture following the documented feed shape. The real API was
// unreachable when this was written, so these tests pin the mapping, not the
// upstream contract.
type FixtureSection = {
  section_number?: string;
  title?: string;
  listen_url?: string;
  playtime?: string;
  readers?: { display_name?: string }[];
};

type FixtureEntry = {
  id?: string;
  title?: string;
  description?: string;
  language?: string;
  totaltimesecs?: number;
  url_librivox?: string;
  url_zip_file?: string;
  authors?: { first_name?: string; last_name?: string }[];
  genres?: { name?: string }[];
  sections: FixtureSection[];
};

const entry = (): FixtureEntry => ({
  id: "1234",
  title: "A Fixture Voyage",
  description: "<p>An <b>invented</b> description.</p>",
  language: "English",
  totaltimesecs: 7200,
  url_librivox: "https://librivox.org/a-fixture-voyage/",
  url_zip_file: "https://www.archive.org/download/fixture_voyage_1234/fixture.zip",
  authors: [{ first_name: "Ada", last_name: "Fixture" }],
  genres: [{ name: "Adventure" }],
  sections: [
    {
      section_number: "1",
      title: "Departure",
      listen_url: "https://archive.org/download/fixture_voyage_1234/one.mp3",
      playtime: "1800",
      readers: [{ display_name: "Reader One" }],
    },
    {
      section_number: "2",
      title: "Arrival",
      listen_url: "https://archive.org/download/fixture_voyage_1234/two.mp3",
      playtime: "30:00",
      readers: [{ display_name: "Reader One" }],
    },
  ],
});

test("maps a feed entry onto the fields the schema needs", () => {
  const book = toSourceBook(entry());

  assert.ok(book);
  assert.equal(book.title, "A Fixture Voyage");
  assert.equal(book.author, "Ada Fixture");
  assert.equal(book.narrator, "Reader One");
  assert.equal(book.category, "Adventure");
  assert.equal(book.language, "English");
  assert.equal(book.totalDuration, 7200);
  assert.equal(book.sourceUrl, "https://librivox.org/a-fixture-voyage/");
  assert.equal(book.chapters.length, 2);
});

test("strips HTML out of the description", () => {
  assert.equal(toSourceBook(entry())?.description, "An invented description.");
});

test("derives the cover from the archive.org item identifier", () => {
  assert.equal(
    toSourceBook(entry())?.coverUrl,
    "https://archive.org/services/img/fixture_voyage_1234",
  );
});

test("reads both seconds and clock playtimes", () => {
  const book = toSourceBook(entry());
  assert.equal(book?.chapters[0].duration, 1800);
  assert.equal(book?.chapters[1].duration, 1800);
});

test("labels a multi-reader book rather than crediting only one", () => {
  const raw = entry();
  raw.sections[1].readers = [{ display_name: "Reader Two" }];

  assert.match(toSourceBook(raw)?.narrator ?? "", /and others$/);
});

test("falls back when the feed credits no reader", () => {
  const raw = entry();
  raw.sections.forEach((section) => (section.readers = []));

  assert.equal(toSourceBook(raw)?.narrator, "LibriVox Volunteers");
});

test("renumbers chapters from zero, in section order", () => {
  const raw = entry();
  raw.sections.reverse();

  const chapters = toSourceBook(raw)?.chapters ?? [];
  assert.deepEqual(chapters.map((c) => c.index), [0, 1]);
  assert.equal(chapters[0].title, "Departure");
});

test("rejects an entry with no playable audio", () => {
  const raw = entry();
  raw.sections.forEach((section) => (section.listen_url = undefined));

  assert.equal(toSourceBook(raw), null);
});

test("rejects an entry with no title or source URL", () => {
  const raw = entry();
  raw.title = "";

  assert.equal(toSourceBook(raw), null);
});

test("marks every LibriVox recording public domain", () => {
  assert.equal(toSourceBook(entry())?.licenseText, "Public domain (LibriVox)");
});

test("builds a paginated feed URL, with an optional language filter", () => {
  const url = new URL(feedUrl(100, { pageSize: 50, language: "Turkish" }));

  assert.equal(url.searchParams.get("offset"), "100");
  assert.equal(url.searchParams.get("limit"), "50");
  assert.equal(url.searchParams.get("language"), "Turkish");
  assert.equal(url.searchParams.get("extended"), "1");
});

test("survives a feed body that is not the expected shape", () => {
  assert.deepEqual(parseFeed("not json"), []);
  assert.deepEqual(parseFeed('{"error":"nope"}'), []);
});
