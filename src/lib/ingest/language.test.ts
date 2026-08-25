import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isLanguageAllowed,
  languageSkipReason,
  parseLanguageList,
} from "./language.ts";

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
