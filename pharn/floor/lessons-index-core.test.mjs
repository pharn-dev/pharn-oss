// pharn/floor/lessons-index-core.test.mjs — hermetic tests for the PRODUCT lessons-index core.
//
// Everything here is a pure function over an in-memory canon string, except the buildIndex cases at the
// end, which use a temp directory (buildIndex is the one entry point that touches the filesystem).
//
// House rule observed throughout: a control character used in a fixture is CONSTRUCTED
// (`String.fromCharCode`), never typed as a literal byte — an invisible control char in a source file is
// unreadable in a diff and survives a copy-paste only by luck.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  parseLessons,
  renderIndex,
  buildIndex,
  TYPE_ENUM,
  CHARS_PER_TOKEN,
  ABSENT,
  MALFORMED,
  CANON_PATH,
  OUT_PATH,
  STATUS_OK,
  STATUS_NO_CANON,
  PRODUCT_PROFILE,
  productProfile,
} from "./lessons-index-core.mjs";

const one = (body) => parseLessons(body)[0];

/** Make a temp repo. `canon === null` means "no canon file at all". */
function tmpRepo(canon) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-lessons-index-"));
  if (canon !== null) {
    const abs = join(dir, CANON_PATH);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, canon);
  }
  return dir;
}

// ── SECTION 1 — parsing ────────────────────────────────────────────────────────────────────────────

test("enumerates by `## L<n> ` heading membership, sorted by numeric id", () => {
  const canon = ["## L10 — ten", "", "body", "", "## L2 — two", "", "body"].join("\n");
  assert.deepEqual(
    parseLessons(canon).map((e) => e.id),
    ["L2", "L10"]
  );
});

test("`## L1x` does not match L1 — the trailing space is required", () => {
  assert.equal(parseLessons("## L1x — not a lesson\n\nbody").length, 0);
});

test("a heading in a lesson BODY at `###` level never registers as a lesson", () => {
  const canon = ["## L1 — one", "", "### L2 — a sub-heading, not a lesson", "", "body"].join("\n");
  assert.deepEqual(
    parseLessons(canon).map((e) => e.id),
    ["L1"]
  );
});

test("a well-formed tag line in its defined position yields type + concepts", () => {
  const e = one(["## L1 — a title", "", "type: floor · concepts: [enum-gate, taint]", "", "**Lesson.** x"].join("\n"));
  assert.equal(e.type, "floor");
  assert.equal(e.concepts, "enum-gate,taint");
});

test("an ABSENT tag line renders `-` and never fails the generator (L3 — hand-written entries)", () => {
  const e = one(["## L1 — a title", "", "**Lesson.** x"].join("\n"));
  assert.equal(e.type, ABSENT);
  assert.equal(e.concepts, ABSENT);
});

test("a MALFORMED tag line renders `?` — distinct from absent, so it cannot hide", () => {
  for (const bad of [
    "type: nonsense · concepts: [a]", // type not in TYPE_ENUM
    "type: floor · concepts: []", // empty concepts
    "type: floor · concepts: [A]", // uppercase concept
    "type: floor · concepts: [a, a]", // duplicate concept
    "type: floor · concepts: [a, b, c, d, e, f, g]", // over CONCEPTS_MAX
    "type: floor, concepts: [a]", // wrong separator (no middle dot)
    "type: floor · concepts: [a", // unterminated
    "type: floor", // no concepts at all
  ]) {
    const e = one(["## L1 — a title", "", bad, "", "**Lesson.** x"].join("\n"));
    assert.equal(e.type, MALFORMED, `expected MALFORMED for: ${bad}`);
    assert.equal(e.concepts, MALFORMED, `expected MALFORMED for: ${bad}`);
  }
});

test("L6: a `type:` line in the BODY is DATA, not a declaration — only the defined position counts", () => {
  const canon = ["## L1 — a title", "", "**Lesson.** Prose that mentions type: floor · concepts: [x] inline.", "", "more"].join("\n");
  assert.equal(one(canon).type, ABSENT);
});

test("L14: a control character inside a concept is rejected (guard-before-shape composition)", () => {
  // Honest scope (P0): in THIS parser the trailing-NEWLINE vector L14 documents is structurally
  // UNREACHABLE — the tag line is produced by a line-split, so no `\n` can survive inside it. The guard is
  // retained anyway as the PRECONDITION L14 prescribes (compose, never replace), because the reachable
  // control-char class is wider than the newline: a TAB, a NUL or a DEL can sit inside a line.
  for (const code of [0x00, 0x09, 0x7f]) {
    const ch = String.fromCharCode(code);
    const e = one(["## L1 — a title", "", `type: floor · concepts: [ta${ch}int]`, "", "x"].join("\n"));
    assert.equal(e.type, MALFORMED, `expected MALFORMED for control char 0x${code.toString(16)}`);
  }
});

test("the date comes from the `- promoted:` provenance line, else `-`", () => {
  const withDate = one(["## L1 — t", "", "**Lesson.** x", "", "- promoted: 2026-06-24 via gated `/pharn-memory-promote`."].join("\n"));
  assert.equal(withDate.date, "2026-06-24");
  assert.equal(one("## L1 — t\n\n**Lesson.** x").date, ABSENT);
});

test("the ~tokens span is the FULL section — heading through the line before the next `##`", () => {
  const canon = ["## L1 — t", "", "aaaa", "", "## L2 — u", "", "bbbbbbbb"].join("\n");
  const [a, b] = parseLessons(canon);
  // L1's span is "## L1 — t\n\naaaa\n" — the trailing blank line before the next heading is included.
  assert.equal(a.chars, "## L1 — t\n\naaaa\n".length);
  assert.equal(a.tokens, Math.ceil(a.chars / CHARS_PER_TOKEN));
  assert.ok(b.chars > 0);
});

test("a duplicate lesson id is a hard throw, never a silent overwrite (fail-closed)", () => {
  assert.throws(() => parseLessons("## L1 — a\n\nx\n\n## L1 — b\n\ny"), /duplicate lesson id "L1"/);
});

test("a title with a fence-closing sequence is REFUSED, not sanitized (P5)", () => {
  assert.throws(() => parseLessons("## L1 — title with ``` in it\n\nx"), /fence-closing sequence/);
});

test("a title with a control character is REFUSED", () => {
  const ch = String.fromCharCode(0x07);
  assert.throws(() => parseLessons(`## L1 — bell${ch}title\n\nx`), /control character/);
});

// ── SECTION 2 — rendering ──────────────────────────────────────────────────────────────────────────

test("a title carrying back-ticks and `||` survives verbatim (canon free text is DATA)", () => {
  const title = "Index an arbitrary key with an own-property test, never `||`/`??`";
  const out = renderIndex(parseLessons(`## L1 — ${title}\n\nx`));
  assert.ok(out.includes(title), "the title must be reproduced verbatim as DATA");
});

test("rows live inside a ```text fence", () => {
  const out = renderIndex(parseLessons("## L1 — t\n\nx"));
  assert.match(out, /```text\nL1 /);
});

test("the header states tagged / malformed / untagged counts", () => {
  const canon = [
    "## L1 — untagged",
    "",
    "x",
    "",
    "## L2 — tagged",
    "",
    "type: floor · concepts: [a]",
    "",
    "x",
    "",
    "## L3 — broken",
    "",
    "type: bogus · concepts: [a]",
    "",
    "x",
  ].join("\n");
  const out = renderIndex(parseLessons(canon));
  assert.match(out, /3 lessons · 1 tagged · 1 malformed · 1 untagged/);
});

test("the rendered index tells the user the file is a disposable cache they may need to exclude", () => {
  // The honest-labelling half of the pharn/.run/ location choice: a user whose own linters scan `pharn/.run/`
  // would otherwise see the cache rewritten under them with nothing explaining why (GRILL F6).
  const out = renderIndex(parseLessons("## L1 — t\n\nx"));
  assert.match(out, /disposable CACHE/);
  assert.match(out, /exclude this path/);
});

test("the rendered index never carries a `rule_id:` + `problem:` pair (validate CHECK 5)", () => {
  const out = renderIndex(parseLessons("## L1 — t\n\nx"));
  assert.ok(!(/rule_id:/.test(out) && /problem:/.test(out)), "the index must never look like a finding template");
});

test("rendering is deterministic — two runs over the same canon are byte-identical", () => {
  const canon = "## L1 — a\n\nx\n\n## L2 — b\n\ntype: eval · concepts: [m]\n\ny";
  assert.equal(renderIndex(parseLessons(canon)), renderIndex(parseLessons(canon)));
});

// ── SECTION 3 — buildIndex, and THE deliberate product divergence: no-canon is a BENIGN NO-OP ──────

test("canon with lessons -> status ok, with rendered content", () => {
  const dir = tmpRepo("## L1 — a title\n\ntype: floor · concepts: [x]\n\nbody\n");
  try {
    const r = buildIndex(dir);
    assert.equal(r.status, STATUS_OK);
    assert.equal(r.entries.length, 1);
    assert.match(r.content, /# Lessons index/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PRODUCT DIVERGENCE: an ABSENT canon is `no-canon`, NOT a throw (the dev copy refuses here)", () => {
  const dir = tmpRepo(null);
  try {
    const r = buildIndex(dir);
    assert.equal(r.status, STATUS_NO_CANON);
    assert.deepEqual(r.entries, []);
    assert.equal(r.content, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PRODUCT DIVERGENCE: a canon with ZERO `## L<n> ` headings is `no-canon`, NOT a throw", () => {
  // A user may keep a hand-written memory-bank file with prose and no promoted lessons yet. Refusing
  // there would make a fresh install RED for the most common possible state.
  const dir = tmpRepo("# Lessons learned\n\nNothing promoted yet.\n");
  try {
    assert.equal(buildIndex(dir).status, STATUS_NO_CANON);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a PRESENT but INVALID canon still throws — no-canon leniency never covers a broken canon", () => {
  const dir = tmpRepo("## L1 — a\n\nx\n\n## L1 — b\n\ny\n");
  try {
    assert.throws(() => buildIndex(dir), /duplicate lesson id "L1"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CHECK-5 hazard: canon titles yielding both `rule_id:` and `problem:` are REFUSED at buildIndex", () => {
  // Re-derived for THIS OUT_PATH rather than copied: `pharn/.run/` is not in validate.mjs's
  // EXCLUDE_SEGMENTS, so being gitignored does NOT exempt the cache from validate's walk.
  const dir = tmpRepo("## L1 — a title mentioning rule_id: SEC-1\n\nx\n\n## L2 — a title mentioning problem: y\n\nz\n");
  try {
    assert.throws(() => buildIndex(dir), /would trip CHECK 5/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── DRIFT GUARD ───────────────────────────────────────────────────────────────────────────────────

test("✧ the DEFAULT profile holds the product values (L41 — the no-argument path is the production path)", () => {
  // The dev surface's values live in its own wrapper (.dev/floor/lessons-index-core.mjs) and are pinned by the
  // dev suite, which may read this file — never the reverse: a user's install ships pharn/floor/ WITHOUT .dev/.
  assert.equal(CANON_PATH, "pharn/memory-bank/lessons-learned.md");
  assert.equal(OUT_PATH, "pharn/.run/lessons-index.md");
  assert.equal(PRODUCT_PROFILE.canonPath, CANON_PATH);
  assert.equal(PRODUCT_PROFILE.regen, "node pharn/floor/gen-lessons-index.mjs .");
  assert.deepEqual(productProfile(), PRODUCT_PROFILE);
  assert.deepEqual(TYPE_ENUM, ["process", "contract", "floor", "scoping", "tooling", "eval"]);
});

test("a non-default root moves canonPath and puts the flag in the regenerate hint; the output stays pharn/.run/", () => {
  const p = productProfile(".dev/memory-bank");
  assert.equal(p.canonPath, ".dev/memory-bank/lessons-learned.md");
  assert.equal(p.outPath, "pharn/.run/lessons-index.md");
  assert.equal(p.regen, "node pharn/floor/gen-lessons-index.mjs --canon-root .dev/memory-bank .");
  const out = renderIndex(parseLessons("## L1 — a\n\nx\n"), p);
  assert.match(out, /^<!-- GENERATED by pharn\/floor\/gen-lessons-index\.mjs from \.dev\/memory-bank\/lessons-learned\.md /);
  assert.match(out, /regenerate with `node pharn\/floor\/gen-lessons-index\.mjs --canon-root \.dev\/memory-bank \.`/);
});

test("productProfile runs the canon-root grammar too — an importer cannot build a profile the flag refuses", () => {
  for (const bad of ["../x", "/abs", "a/./b", "", "--x"]) {
    assert.throws(() => productProfile(bad), /lessons-index: --canon-root/, JSON.stringify(bad));
  }
  assert.equal(productProfile("./team/canon/").canonPath, "team/canon/lessons-learned.md", "normalized like the CLI");
});

test("renderIndex uses the profile it is given — every surface-specific paragraph comes from it", () => {
  const p = { canonPath: "c/l.md", outPath: "o.md", gen: "g.mjs", regen: "regen-cmd", storageNote: "", columnsNote: "COLS\n" };
  const out = renderIndex(parseLessons("## L1 — a\n\nx\n"), p);
  assert.match(out, /^<!-- GENERATED by g\.mjs from c\/l\.md — DO NOT EDIT\. Regenerate: regen-cmd -->\n/);
  assert.match(out, /read"\.\n\n1 lessons · /, "an empty storageNote leaves exactly one blank line before the counts");
  assert.match(out, /\n\nCOLS\n\n```text\n/);
  assert.doesNotMatch(out, /disposable CACHE/);
});

// ── ✧ L6: only genuine ABSENCE is benign — a present-but-unreadable canon must fail closed ────────

// The bare `catch` mapped EVERY read failure to STATUS_NO_CANON. On this product surface no-canon is a
// deliberate benign no-op (the honest normal state of a fresh install, and the intended divergence from
// the dev twin, which throws) — but that same catch also swallowed EACCES/EISDIR on a canon that EXISTS
// and HOLDS lessons. `/pharn-plan` would then declare `applied_lessons: none` as though the user had no
// lessons at all: a real I/O failure presenting as an empty memory-bank.

test("✧ L6: a canon path that is a DIRECTORY (EISDIR) throws rather than reporting no-canon", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-lessons-eisdir-"));
  try {
    // Create the canon PATH as a directory, so the read fails with EISDIR rather than ENOENT.
    mkdirSync(join(dir, CANON_PATH), { recursive: true });
    assert.throws(
      () => buildIndex(dir),
      (e) => e && e.code !== "ENOENT",
      "a present-but-unreadable canon must surface the I/O error, never present as an empty memory-bank"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ L6: the DELIBERATE product divergence is preserved — a genuinely ABSENT canon is still benign", () => {
  const dir = tmpRepo(null);
  try {
    const r = buildIndex(dir);
    assert.equal(r.status, STATUS_NO_CANON, "no memory-bank at all is the honest normal state of a fresh install");
    assert.deepEqual(r.entries, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ L6: an empty-but-READABLE canon is still benign — that is a successful read with no lessons", () => {
  const dir = tmpRepo("");
  try {
    assert.equal(buildIndex(dir).status, STATUS_NO_CANON, "an empty canon read successfully must stay a no-op");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
