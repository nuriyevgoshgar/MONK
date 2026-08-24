import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyLicense } from "./license.ts";

test("an unlabelled title is skipped — silence is not permission", () => {
  const verdict = classifyLicense(undefined);

  assert.equal(verdict.allowed, false);
  assert.match(verdict.allowed === false ? verdict.reason : "", /no licence stated/);
});

test("recognises public domain markers, including Turkish", () => {
  for (const text of ["Public Domain", "Kamu malı", "telifsiz", "CC0 1.0"]) {
    assert.equal(classifyLicense(text).allowed, true, text);
  }
});

test("recognises Creative Commons URLs", () => {
  assert.equal(
    classifyLicense("https://creativecommons.org/licenses/by/4.0/").allowed,
    true,
  );
});

test("rejects reserved rights even alongside a permissive-looking word", () => {
  const verdict = classifyLicense("Creative Commons — all rights reserved");

  assert.equal(verdict.allowed, false);
  assert.match(verdict.allowed === false ? verdict.reason : "", /reserves rights/);
});

test("rejects Turkish reserved-rights notices", () => {
  assert.equal(classifyLicense("Tüm hakları saklıdır").allowed, false);
});

test("rejects a licence it does not recognise rather than guessing", () => {
  const verdict = classifyLicense("Some Bespoke Licence v2");

  assert.equal(verdict.allowed, false);
  assert.match(verdict.allowed === false ? verdict.reason : "", /not recognised as free/);
});
