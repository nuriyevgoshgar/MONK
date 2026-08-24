import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowed, parseRobots, userAgentToken } from "./robots.ts";

const at = (base: string) => `https://example.test${base}`;

test("derives the robots token from a full User-Agent string", () => {
  assert.equal(userAgentToken("MONK/0.1 (+https://example.test)"), "monk");
});

test("applies the wildcard group when no specific group matches", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /private/", "monk");

  assert.equal(isAllowed(rules, at("/private/x")), false);
  assert.equal(isAllowed(rules, at("/public/x")), true);
});

test("prefers the group naming our agent over the wildcard", () => {
  const rules = parseRobots(
    "User-agent: *\nDisallow: /\n\nUser-agent: monk\nDisallow: /admin/",
    "monk",
  );

  assert.equal(isAllowed(rules, at("/books/1")), true);
  assert.equal(isAllowed(rules, at("/admin/panel")), false);
});

test("an empty Disallow means everything is allowed", () => {
  const rules = parseRobots("User-agent: *\nDisallow:", "monk");
  assert.equal(isAllowed(rules, at("/anything")), true);
});

test("the longest matching rule wins, and Allow breaks a tie", () => {
  const rules = parseRobots(
    "User-agent: *\nDisallow: /books/\nAllow: /books/free/",
    "monk",
  );

  assert.equal(isAllowed(rules, at("/books/paid/1")), false);
  assert.equal(isAllowed(rules, at("/books/free/1")), true);
});

test("honours * and $ wildcards", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /*.pdf$", "monk");

  assert.equal(isAllowed(rules, at("/docs/manual.pdf")), false);
  assert.equal(isAllowed(rules, at("/docs/manual.pdf.html")), true);
});

test("reads Crawl-delay in milliseconds", () => {
  const rules = parseRobots("User-agent: *\nCrawl-delay: 5", "monk");
  assert.equal(rules.crawlDelayMs, 5000);
});

test("consecutive User-agent lines share one rule group", () => {
  const rules = parseRobots("User-agent: monk\nUser-agent: other\nDisallow: /x/", "monk");
  assert.equal(isAllowed(rules, at("/x/1")), false);
});

test("ignores comments", () => {
  const rules = parseRobots("# comment\nUser-agent: *\nDisallow: /x/ # trailing", "monk");
  assert.equal(isAllowed(rules, at("/x/1")), false);
});
