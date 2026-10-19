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
import { BULLET_FIELD_LINE_RE, FM_RE, fieldEntries, stripBom, matchFrontmatter, readField, readValue } from "./frontmatter-core.mjs";

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
  "loop-closeout.mjs", // 6.44.0: reads LOOP.md's envelope and SPEC.md's state
  "installed-skills-core.mjs", // 6.47.0: reads an installed SKILL.md's name/description for the catalogue
  // 6.64.3 (frontmatter-parser-parity, audit ENF-3): the loose-fence family. Each tests `startsWith("---")` on purpose
  // (validate.mjs's model, mirrored by the count-* readers) and now strips the BOM first; before, a BOM'd capability
  // was "not a capability" and validate printed GREEN over it.
  "validate.mjs",
  "count-lenses.mjs",
  "count-grillers.mjs",
  "count-verifiers.mjs",
  "check-model-config.mjs",
  "griller-extract.mjs",
  // 6.64.3: readers that already stripped (or used matchFrontmatter) but were not listed — found by the closure below.
  "render-cost-ledger.mjs",
  "instruction-files-core.mjs",
  "ac-tests-lock.mjs",
  "spec-template-core.mjs",
];

// A module that tests the frontmatter fence, by any of the spellings the floor uses: the shared anchor, the matcher,
// the loose `startsWith("---")` of the validate.mjs family, or a private regex literal anchored on `^---`.
const ANCHOR_IDIOM_RE = /\bFM_RE\b|\bmatchFrontmatter\(|startsWith\("---"|\/\^---/;
// A module that strips the BOM before that test: it calls stripBom, or reads through matchFrontmatter (which does).
const APPLIES_STRIP_RE = /\bstripBom\(|\bmatchFrontmatter\(/;
// The `key: value` line grammar as a regex literal: `^(` or `^-[ \t]+(` followed by the `[A-Za-z_]` key class. It
// matches FIELD_LINE_RE, BULLET_FIELD_LINE_RE and the key-class variants the retired copies used; it deliberately does
// not match validate.mjs's family grammar `^([A-Za-z0-9_]+):`, a separate, mirrored model (see the core's header).
const LINE_GRAMMAR_RE = /\^(?:-\[ \\t\]\+)?\(\[A-Za-z_\]/;
// The one module allowed its own line grammar, and why. instruction-files-core.mjs walks a NESTED YAML block mapping
// (`paths:` with indented items) in a Claude Code rule file — TOP_KEY_RE and NESTED_KEY_RE — which the flat
// `fieldEntries` does not model; it reads flat lines with the core's FIELD_LINE_RE.
const LINE_GRAMMAR_ALLOWLIST = ["instruction-files-core.mjs"];

function nonTestFloorModules() {
  return readdirSync(HERE).filter((n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs") && n !== "frontmatter-core.mjs");
}

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

// Since 6.64.3 a call to matchFrontmatter also counts: it strips by construction, and instruction-files-core.mjs and
// ac-tests-lock.mjs read only through it. The pin is WIDENED by exactly that one spelling, and says so here.
test("✧ every consumer actually APPLIES the BOM strip (stripBom, or matchFrontmatter) — importing it is not using it", () => {
  for (const name of CONSUMERS) {
    const src = readFileSync(join(HERE, name), "utf8");
    assert.match(src, APPLIES_STRIP_RE, `${name} never calls stripBom or matchFrontmatter — the BOM would still reach its fence test`);
  }
});

test("✧ CLOSURE (6.64.3): every non-test floor module that tests the frontmatter fence is a listed consumer", () => {
  const readers = nonTestFloorModules().filter((f) => ANCHOR_IDIOM_RE.test(readFileSync(join(HERE, f), "utf8")));
  assert.ok(readers.length >= CONSUMERS.length, "non-vacuity: the idiom finds at least the listed consumers");
  assert.deepEqual(
    readers.filter((f) => !CONSUMERS.includes(f)),
    [],
    "a module tests the frontmatter fence but is not in CONSUMERS — list it (which requires it to strip the BOM)"
  );
  assert.deepEqual(
    CONSUMERS.filter((f) => !readers.includes(f)),
    [],
    "a CONSUMERS entry no longer tests the fence — drop it, or the list stops describing the floor"
  );
});

test("✧ the anchor closure's predicates DISCRIMINATE (L60): each old idiom is seen; a raw fence test is not a strip", () => {
  for (const src of [
    'if (!text.startsWith("---")) return null;',
    "const m = text.match(FM_RE);",
    "const m = matchFrontmatter(t);",
    "if (/^---\\r?\\n/.test(t)) x();",
  ]) {
    assert.match(src, ANCHOR_IDIOM_RE, src);
  }
  assert.doesNotMatch('if (!text.startsWith("---")) return null;', APPLIES_STRIP_RE);
  assert.match("const text = stripBom(raw);", APPLIES_STRIP_RE);
});

test("✧ CLOSURE (6.64.3): no non-test floor module but the core declares the `key: value` line grammar (one allowlisted)", () => {
  const holders = nonTestFloorModules().filter((f) => LINE_GRAMMAR_RE.test(readFileSync(join(HERE, f), "utf8")));
  assert.deepEqual(
    holders.filter((f) => !LINE_GRAMMAR_ALLOWLIST.includes(f)),
    [],
    "read `key: value` lines with frontmatter-core.mjs fieldEntries (FIELD_LINE_RE / BULLET_FIELD_LINE_RE), never a private regex"
  );
  for (const f of LINE_GRAMMAR_ALLOWLIST) {
    assert.ok(holders.includes(f), `${f} is allowlisted but no longer declares the grammar — remove the stale entry`);
  }
  assert.match(readFileSync(join(HERE, "frontmatter-core.mjs"), "utf8"), LINE_GRAMMAR_RE, "non-vacuity: the pattern finds the core's own");
});

test("✧ the line-grammar predicate DISCRIMINATES (L60): every retired spelling is caught; validate's family grammar is not", () => {
  const retired = [
    String.raw`const kv = line.match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);`,
    String.raw`const kv = line.match(/^-[ \t]+([A-Za-z_][\w-]*):[ \t]*(.*)$/);`,
    String.raw`const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):[ \t]*(.*)$/);`,
    String.raw`const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);`,
  ];
  for (const src of retired) assert.match(src, LINE_GRAMMAR_RE, src);
  assert.doesNotMatch(String.raw`const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);`, LINE_GRAMMAR_RE);
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

// ── The ONE line reader (6.64.3): fieldEntries ────────────────────────────────────────────────────────────────

test("fieldEntries: every match in file order, the value exactly as captured, repeats kept for the caller to judge", () => {
  const lines = ["a: 1", "not a field", "b-c:   two  # note", "a: 3", "  indented: no", "_x:"];
  assert.deepEqual(fieldEntries(lines), [
    { key: "a", raw: "1" },
    { key: "b-c", raw: "two  # note" },
    { key: "a", raw: "3" },
    { key: "_x", raw: "" },
  ]);
  assert.deepEqual(fieldEntries(["- a: 1", "a: 2", "-   b: x"], BULLET_FIELD_LINE_RE), [
    { key: "a", raw: "1" },
    { key: "b", raw: "x" },
  ]);
  assert.deepEqual(fieldEntries("a: 1"), [], "a non-array (a raw block passed by mistake) yields nothing, never a throw");
  assert.deepEqual(fieldEntries([null, 7, "a: 1"]), [{ key: "a", raw: "1" }]);
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
