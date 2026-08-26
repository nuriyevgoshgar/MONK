import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalLanguage,
  isLanguageAllowed,
  languageSkipReason,
  parseLanguageList,
} from "./language.ts";

test("maps an ISO code to the name the feeds use", () => {
  assert.equal(canonicalLanguage("tr"), "turkish");
  assert.equal(canonicalLanguage("en"), "english");
  assert.equal(canonicalLanguage("de"), "german");
});

test("strips a regional suffix before mapping", () => {
  assert.equal(canonicalLanguage("en-US"), "english");
  assert.equal(canonicalLanguage("pt_BR"), "portuguese");
  assert.equal(canonicalLanguage("zh-Hans"), "chinese");
});

test("leaves an unrecognised language alone rather than dropping it", () => {
  assert.equal(canonicalLanguage("  Klingon "), "klingon");
  assert.equal(canonicalLanguage("Multilingual"), "multilingual");
  assert.equal(canonicalLanguage("Unknown"), "unknown");
});

test("a code and its name are the same language", () => {
  // The bug this exists to prevent: a schema.org page says inLanguage "tr"
  // while the allow-list says "Turkish", and the book is rejected for the
  // wrong reason.
  const allowed = parseLanguageList("English,Turkish");

  assert.equal(isLanguageAllowed("tr", allowed), true);
  assert.equal(isLanguageAllowed("en-GB", allowed), true);
  assert.equal(isLanguageAllowed("Turkish", allowed), true);
});

test("an allow-list written in codes accepts the names too", () => {
  const allowed = parseLanguageList("en, tr");

  assert.equal(isLanguageAllowed("English", allowed), true);
  assert.equal(isLanguageAllowed("Turkish", allowed), true);
  assert.equal(isLanguageAllowed("German", allowed), false);
});

test("an unstated language is not quietly let through", () => {
  const allowed = parseLanguageList("English,Turkish");
  assert.equal(isLanguageAllowed("Unknown", allowed), false);
});

test("splits, trims and lower-cases the list", () => {
  assert.deepEqual(parseLanguageList("  English , turkish "), [
    "english",
    "turkish",
  ]);
});

test("treats missing or blank settings as an empty list", () => {
  assert.deepEqual(parseLanguageList(undefined), []);
  assert.deepEqual(parseLanguageList(null), []);
  assert.deepEqual(parseLanguageList(""), []);
  assert.deepEqual(parseLanguageList("  ,  , "), []);
});

test("an empty allow-list keeps everything, rather than nothing", () => {
  // A blank setting must not silently reject the whole catalogue.
  assert.equal(isLanguageAllowed("German", []), true);
  assert.equal(isLanguageAllowed("English", []), true);
});

test("keeps a language on the list, whatever its casing", () => {
  const allowed = parseLanguageList("English,Turkish");

  assert.equal(isLanguageAllowed("English", allowed), true);
  assert.equal(isLanguageAllowed("english", allowed), true);
  assert.equal(isLanguageAllowed("  TURKISH  ", allowed), true);
});

test("rejects every language off the list", () => {
  const allowed = parseLanguageList("English,Turkish");

  for (const language of [
    "German",
    "French",
    "Spanish",
    "Latin",
    "Russian",
    "Japanese",
    "Old English",
    "Multilingual",
  ]) {
    assert.equal(
      isLanguageAllowed(language, allowed),
      false,
      `${language} should be rejected`,
    );
  }
});

test("does not match on a prefix", () => {
  // "Old English" starts with neither "English" nor the other way round, but a
  // sloppy substring check would let it through.
  assert.equal(isLanguageAllowed("Old English", ["english"]), false);
  assert.equal(isLanguageAllowed("English", ["old english"]), false);
});

test("the skip reason names both the language and the list", () => {
  const reason = languageSkipReason("German", ["english", "turkish"]);

  assert.match(reason, /German/);
  assert.match(reason, /english, turkish/);
});
