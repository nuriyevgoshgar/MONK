import assert from "node:assert/strict";
import { test } from "node:test";
import { findBookLinks, findNextPageLink } from "./discover.ts";

const BASE = "https://example.test";
const PAGE = `${BASE}/katalog`;
const options = { baseUrl: BASE, bookUrlPattern: /\/kitap\/[^/]+\/?$/ };

test("keeps only links matching the book URL pattern", () => {
  const html = `
    <a href="/kitap/bir">1</a>
    <a href="/kitap/iki/">2</a>
    <a href="/hakkinda">about</a>
    <a href="/kitap/bir/bolum/3">chapter</a>`;

  const links = findBookLinks(html, PAGE, options);

  assert.deepEqual(links.sort(), [`${BASE}/kitap/bir`, `${BASE}/kitap/iki/`].sort());
});

test("never follows links off the source host", () => {
  const html = `<a href="https://elsewhere.test/kitap/bir">off-site</a>`;
  assert.deepEqual(findBookLinks(html, PAGE, options), []);
});

test("deduplicates repeated links", () => {
  const html = `<a href="/kitap/bir">a</a><a href="/kitap/bir">b</a>`;
  assert.equal(findBookLinks(html, PAGE, options).length, 1);
});

test("finds a rel=next pagination link", () => {
  const html = `<a rel="next" href="/katalog?sayfa=2">next</a>`;
  assert.equal(findNextPageLink(html, PAGE, BASE), `${BASE}/katalog?sayfa=2`);
});

test("returns nothing when pagination points off-site", () => {
  const html = `<a rel="next" href="https://elsewhere.test/katalog?p=2">next</a>`;
  assert.equal(findNextPageLink(html, PAGE, BASE), undefined);
});
