// pharn/floor/frontmatter-core.test.mjs — tests for the shared frontmatter anchor + BOM normalisation.
//
// L4: an authored fixture passes by construction, so the ✧ cases are MUTANTS — each asserts the thing
// FAILS when the guard is removed, not merely that it passes when everything is fine.
//
// L29/L31: the defect this core exists for was a SET problem — `FM_RE` copy-pasted into six checkers with
// nothing ranging over them. The consumer-set pin below is therefore the load-bearing test in this file:
// it enumerates the consumers and asserts none re-declares its own anchor, so a seventh consumer that
// copies the old idiom fails here rather than silently reintroducing the BOM defect.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FM_RE, stripBom, matchFrontmatter } from "./frontmatter-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BOM = "﻿";
const SPEC = "---\nspec_id: S1\nstate: Draft\n---\n\n# Body\n";

// The consumers that read frontmatter. Materialised HERE, in one place, so every rule below ranges over
// it and a new consumer is covered by adding one string.
const CONSUMERS = [
  "check-spec.mjs",
  "check-loop-record.mjs",
  "check-loop-decision.mjs",
  "check-plan-lessons.mjs",
  "check-plan-spec-agree.mjs",
  "check-ship-briefing.mjs",
  "render-ship-briefing.mjs",
];

// ── stripBom ──────────────────────────────────────────────────────────────────────────────────────

test("strips a single leading BOM", () => {
  assert.equal(stripBom(BOM + "hello"), "hello");
});

test("is idempotent on already-clean text", () => {
  assert.equal(stripBom("hello"), "hello");
  assert.equal(stripBom(stripBom(BOM + "hello")), "hello");
});

test("✧ strips EXACTLY ONE BOM — a doubled BOM keeps the second, so malformed input stays malformed", () => {
  assert.equal(stripBom(BOM + BOM + "hello"), BOM + "hello");
});

test("✧ a BOM that is not at offset 0 is CONTENT and is left alone", () => {
  assert.equal(stripBom("a" + BOM + "b"), "a" + BOM + "b");
});

test("✧ a non-string passes through untouched rather than throwing", () => {
  for (const v of [null, undefined, 42, {}]) assert.equal(stripBom(v), v);
});

// ── the defect this core exists for ───────────────────────────────────────────────────────────────

test("✧ THE DEFECT: a BOM defeats the bare ^--- anchor", () => {
  assert.ok(SPEC.match(FM_RE), "the clean spec must match");
  assert.equal((BOM + SPEC).match(FM_RE), null, "a BOM-prefixed spec must NOT match the bare anchor — this is the bug");
});

test("✧ THE FIX: matchFrontmatter treats the BOM-prefixed spec identically to its clean twin", () => {
  const clean = matchFrontmatter(SPEC);
  const bommed = matchFrontmatter(BOM + SPEC);
  assert.ok(bommed, "a BOM-prefixed spec must match after normalisation");
  assert.equal(bommed[0], clean[0], "the captured block must be byte-identical to the clean twin's");
  assert.equal(bommed[1], clean[1], "the captured frontmatter body must be identical too");
});

test("✧ NOT a masking layer: a genuinely frontmatter-less file still fails, BOM or not", () => {
  assert.equal(matchFrontmatter("# no frontmatter\n"), null);
  assert.equal(matchFrontmatter(BOM + "# no frontmatter\n"), null);
});

test("the anchor stays CRLF-tolerant after normalisation", () => {
  const crlf = SPEC.replace(/\n/g, "\r\n");
  assert.ok(matchFrontmatter(crlf), "CRLF must still match");
  assert.ok(matchFrontmatter(BOM + crlf), "BOM + CRLF (the same Windows editor class) must match");
});

// ── ✧ THE CONSUMER-SET PIN (L29/L31 — the reason this file exists) ────────────────────────────────

test("✧ no consumer re-declares its own FM_RE — the copy-paste that caused this defect cannot return", () => {
  for (const name of CONSUMERS) {
    const src = readFileSync(join(HERE, name), "utf8");
    assert.ok(
      !/^const FM_RE\s*=/m.test(src),
      `${name} declares its own FM_RE — import it from frontmatter-core.mjs instead, or the BOM defect returns in this file only`
    );
  }
});

test("✧ every consumer imports the shared core", () => {
  for (const name of CONSUMERS) {
    const src = readFileSync(join(HERE, name), "utf8");
    assert.match(src, /from "\.\/frontmatter-core\.mjs"/, `${name} must import the shared frontmatter core`);
  }
});

test("✧ every consumer actually APPLIES stripBom — importing it is not using it", () => {
  for (const name of CONSUMERS) {
    const src = readFileSync(join(HERE, name), "utf8");
    assert.match(src, /stripBom\(/, `${name} imports the core but never calls stripBom — the BOM would still reach FM_RE`);
  }
});

test("✧ the consumer list is not empty and names only files that exist", () => {
  assert.ok(CONSUMERS.length >= 6, "the enumeration must not silently shrink");
  for (const name of CONSUMERS) {
    assert.doesNotThrow(() => readFileSync(join(HERE, name), "utf8"), `${name} is listed as a consumer but does not exist`);
  }
});

test("✧ this core holds no literal BOM character — it would be invisible in every diff", () => {
  const src = readFileSync(join(HERE, "frontmatter-core.mjs"), "utf8");
  assert.ok(!src.includes(BOM), "frontmatter-core.mjs must express the BOM as an escape, never as a literal");
});
