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
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { FM_RE, stripBom, matchFrontmatter, readField, readValue } from "./frontmatter-core.mjs";

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

// ── The ONE value reader (6.20.5): readValue / readField ─────────────────────────────────────────────────

test("readValue: the quote is resolved BEFORE an inline comment; an unquoted ` #` opens a comment, `feat#3` does not", () => {
  assert.equal(readValue(' "a # b" '), "a # b");
  assert.equal(readValue('"FEAT-1" # note'), "FEAT-1");
  assert.equal(readValue("feat-1 # note"), "feat-1");
  assert.equal(readValue("feat#3"), "feat#3");
  assert.equal(readValue("'single'"), "single");
  assert.equal(readValue(""), "");
});

test("readField: LAST-wins across a duplicated key, exact key match, undefined when absent", () => {
  assert.equal(readField("spec_id: old\nspec_id: new", "spec_id"), "new");
  assert.equal(readField('spec_id: "x"\r\nspec_id: y # c', "spec_id"), "y", "CRLF-tolerant, and the last copy wins");
  assert.equal(readField("spec_ids: a\nspec_id2: b", "spec_id"), undefined, "a key is matched exactly, never by prefix");
  assert.equal(readField("a: 1", "spec_id"), undefined);
  assert.equal(readField('spec_content_hash: ""\nspec_content_hash: ' + "a".repeat(64), "spec_content_hash"), "a".repeat(64));
});

// ✧ PARITY, EXECUTED (L52 — the set is named): the consumers that read a SPEC/PLAN pin field are check-spec.mjs (its
// parseSpec, observable through --spec-id and --state), check-plan-spec-agree.mjs (its readCarried, observable through
// its exit) and ac-tests-lock.mjs (covered behaviourally in ac-tests-lock.test.mjs). Both CLIs run as child
// processes here, over the same duplicated / quoted / commented variants, and must read what readField reads.
const VARIANTS = [
  ["spec_id: old\nspec_id: new", "spec_id"],
  ['spec_id: "a # b"', "spec_id"],
  ["spec_id: feat-1 # note", "spec_id"],
  ['spec_id: "feat-2" # note', "spec_id"],
  ["spec_id: feat#3", "spec_id"],
  ['spec_id: "x"\nspec_id: y # c', "spec_id"],
  ["state: Draft\nstate: Approved # ratified", "state"],
  ["state: Approved\nstate: Draft", "state"],
];

test("✧ PARITY: check-spec.mjs --spec-id / --state read every variant exactly as readField does", () => {
  const dir = mkdtempSync(join(tmpdir(), "fm-parity-"));
  try {
    for (const [block, key] of VARIANTS) {
      const p = join(dir, "SPEC.md");
      writeFileSync(p, `---\n${block}\n---\n\n## Intent\n\nx\n`);
      const r = spawnSync(process.execPath, [join(HERE, "check-spec.mjs"), key === "state" ? "--state" : "--spec-id", p], {
        encoding: "utf8",
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, `${readField(block, key)}\n`, `check-spec and readField disagree on ${JSON.stringify(block)}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ PARITY: check-plan-spec-agree.mjs accepts a PLAN exactly when readField reads the SPEC's id and pin from it", () => {
  const dir = mkdtempSync(join(tmpdir(), "fm-parity-"));
  try {
    const body = "\n## Intent\n\nwhat and why\n\n## Scope\n\nfiller\n\n## Acceptance Criteria\n\nfiller\n\n## Constraints\n\nfiller\n\n";
    const H = createHash("sha256").update(body).digest("hex");
    const stale = "b".repeat(64);
    writeFileSync(join(dir, "SPEC.md"), `---\nspec_id: my-feature\nstate: Approved\nspec_content_hash: ${H}\n---\n${body}`);
    const plans = [
      `spec_id: my-feature\nspec_content_hash: ${stale}\nspec_content_hash: ${H}`, // stale then current → current
      `spec_id: my-feature\nspec_content_hash: ${H}\nspec_content_hash: ${stale}`, // current then stale → stale
      `spec_id: my-feature\nspec_content_hash: "${H}" # carried`,
      `spec_id: other\nspec_id: my-feature\nspec_content_hash: ${H}`,
      `spec_id: my-feature\nspec_id: other\nspec_content_hash: ${H}`,
      `spec_id: "my-feature" # note\nspec_content_hash: ${H} # note`,
    ];
    let accepted = 0;
    for (const block of plans) {
      writeFileSync(join(dir, "PLAN.md"), `---\n${block}\n---\n\n## Approach\n\nimplement it.\n`);
      const r = spawnSync(process.execPath, [join(HERE, "check-plan-spec-agree.mjs"), join(dir, "PLAN.md"), join(dir, "SPEC.md")], {
        encoding: "utf8",
      });
      const expected = readField(block, "spec_id") === "my-feature" && readField(block, "spec_content_hash") === H;
      assert.equal(r.status === 0, expected, `check-plan-spec-agree and readField disagree on ${JSON.stringify(block)}: ${r.stdout}`);
      if (expected) accepted++;
    }
    assert.ok(accepted >= 2 && accepted < plans.length, "non-vacuity: both an accepted and a refused variant");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ CLOSURE: no other non-test floor module declares its own frontmatter value reader", () => {
  // The three readers this retired (check-spec's and check-plan-spec-agree's readValue, ac-tests-lock's scalar) were
  // named functions; a re-introduced copy under either name fails here. BOUND: a reader under ANOTHER name is not
  // ranged over (the ship-briefing pair's stripQuotes reads other artifacts and is out of scope).
  const offenders = [];
  for (const f of readdirSync(HERE).filter((n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs") && n !== "frontmatter-core.mjs")) {
    if (/\bfunction\s+(readValue|scalar)\s*\(/.test(readFileSync(join(HERE, f), "utf8"))) offenders.push(f);
  }
  assert.deepEqual(offenders, [], "read a frontmatter field with frontmatter-core.mjs readField / readValue");
  assert.match(
    readFileSync(join(HERE, "frontmatter-core.mjs"), "utf8"),
    /export function readValue\(/,
    "non-vacuity: the pattern finds the core's own"
  );
});
