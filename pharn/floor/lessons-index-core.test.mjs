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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  LESSON_HEADING_RE,
  canonLines,
  lessonHeadings,
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

// ── ONE GRAMMAR, THREE READERS (7.3.0, lesson-heading-parser) ────────────────────────────────────────────
//
// Review 2026-11-03: a `## L<n>` line inside a fenced block or an HTML comment was a lesson to check-plan-lessons,
// the index and check-provenance alike, and the three disagreed on `## L20`, `## L20 ` and a BOM. One fixture table,
// run through ALL THREE readers here, so their agreement is tested where the grammar lives. `ids` is the
// hand-written expected set of VISIBLE lessons (L74: an oracle of its own, not the reader under test); the fixtures'
// markdown-it verdicts were probed at build (`.dev/features/lesson-heading-parser/BUILD.md`). `unclosed` marks a
// block that never closes and hides a lesson heading: the index and check-provenance refuse it.

const HERE = dirname(fileURLToPath(import.meta.url));
const PLAN_CHECKER = join(HERE, "check-plan-lessons.mjs");
const PROVENANCE = join(HERE, "check-provenance.mjs");
const BOM = String.fromCharCode(0xfeff);
const L = (n, t = "a lesson") => `## L${n} — ${t}\n\nbody\n`;

const HEADING_FIXTURES = [
  { name: "a ```text fence", canon: L(1) + "\n```text\n## L21 — inside fence\n```\n\n" + L(2), ids: ["L1", "L2"], hidden: ["L21"] },
  { name: "a ~~~ fence", canon: L(1) + "\n~~~\n## L21 — x\n~~~\n", ids: ["L1"], hidden: ["L21"] },
  {
    name: "a 4-backtick fence holding a 3-backtick one",
    canon: L(1) + "\n````md\n```\n## L21 — x\n```\n````\n\n" + L(3),
    ids: ["L1", "L3"],
    hidden: ["L21"],
  },
  { name: "a multi-line HTML comment", canon: L(1) + "\n<!--\n## L22 — commented out\n-->\n\n" + L(2), ids: ["L1", "L2"], hidden: ["L22"] },
  { name: "a one-line `<!-->` (a complete block)", canon: L(1) + "\n<!-->\n" + L(3), ids: ["L1", "L3"], hidden: [] },
  { name: "a <pre> block", canon: L(1) + "\n<pre>\n## L23 — x\n</pre>\n\n" + L(2), ids: ["L1", "L2"], hidden: ["L23"] },
  {
    name: "a list item's indented fence, then a column-0 heading (visible: the heading ends the item)",
    canon: L(1) + "\n- item\n\n  ```\n  code\n" + L(4),
    ids: ["L1", "L4"],
    hidden: [],
  },
  { name: "a BOM before the first heading", canon: BOM + L(1) + "\n" + L(2), ids: ["L1", "L2"], hidden: [] },
  { name: "`## L20` with no title", canon: L(1) + "\n## L20\n\nbody\n", ids: ["L1", "L20"], hidden: [], titleRefused: true },
  { name: "`## L20 ` with a trailing space", canon: L(1) + "\n## L20 \n\nbody\n", ids: ["L1", "L20"], hidden: [], titleRefused: true },
  { name: "a leading-zero and a zero id", canon: L(1) + "\n## L020 — x\n\n## L0 — y\n", ids: ["L1"], hidden: [], tokens: ["L020", "L0"] },
  { name: "an unclosed fence", canon: L(1) + "\n```\n## L2 — hidden to EOF\n", ids: ["L1"], hidden: ["L2"], unclosed: true },
  { name: "an unclosed comment", canon: L(1) + "\n<!--\n" + L(2), ids: ["L1"], hidden: ["L2"], unclosed: true },
];

const planCiting = (id) => `# PLAN — x\n\n- applied_lessons: [${id}]\n\n## Applied lessons\n\n- ${id} — applied.\n`;
const candidate = (id) => ({
  target: "pharn/memory-bank/lessons-learned.md",
  id,
  type: "floor",
  concepts: ["lessons"],
  provenance: { feature: "f", commit: "abc1234", source: "pharn/features/f/REVIEW.md F1", date: "2026-11-03" },
  title: "t",
  body: "b",
});

/** Run both CLIs over one canon: the plan checker citing `id`, and check-provenance with candidate `id`. */
function cliVerdicts(canon, id) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-heading-parity-"));
  try {
    const canonPath = join(dir, "pharn/memory-bank/lessons-learned.md");
    mkdirSync(dirname(canonPath), { recursive: true });
    writeFileSync(canonPath, canon);
    writeFileSync(join(dir, "PLAN.md"), planCiting(id));
    writeFileSync(join(dir, "candidate.json"), JSON.stringify(candidate(id)));
    const plan = spawnSync(process.execPath, [PLAN_CHECKER, join(dir, "PLAN.md"), canonPath], { encoding: "utf8" });
    const prov = spawnSync(process.execPath, [PROVENANCE, join(dir, "candidate.json"), canonPath], { encoding: "utf8" });
    return { plan: plan.status, prov: prov.status, provOut: prov.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const f of HEADING_FIXTURES) {
  test(`★ one grammar — ${f.name}: the reader, the index, check-plan-lessons and check-provenance agree`, () => {
    // The shared reader.
    assert.deepEqual(
      lessonHeadings(f.canon).map((h) => h.id),
      f.ids
    );
    // The index: the same ids, or a refusal for a canon it must not render.
    if (f.unclosed) {
      assert.throws(() => parseLessons(f.canon), /never closes, so it hides the lesson heading at line \d+/);
    } else if (f.titleRefused) {
      assert.throws(() => parseLessons(f.canon), /L20's title is empty/);
    } else {
      assert.deepEqual(
        parseLessons(f.canon).map((e) => e.id),
        [...f.ids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
      );
    }
    // check-plan-lessons: every visible id is citable, every hidden one is not.
    for (const id of f.ids) assert.equal(cliVerdicts(f.canon, id).plan, 0, `${id} is a visible lesson: citing it is GREEN`);
    for (const id of f.hidden) assert.equal(cliVerdicts(f.canon, id).plan, 1, `${id} is hidden: citing it is RED`);
    // check-provenance: a visible id is a duplicate, a hidden one is unique — unless an unclosed block makes the
    // canon itself a RED (the new entry would be appended inside it).
    for (const id of f.ids) {
      const r = cliVerdicts(f.canon, id);
      assert.equal(r.prov, 1);
      assert.match(r.provOut, f.unclosed ? /canon failed: the block opened at line \d+/ : /already exists/);
    }
    for (const id of f.hidden) {
      const r = cliVerdicts(f.canon, id);
      if (f.unclosed) {
        assert.equal(r.prov, 1);
        assert.match(r.provOut, /canon failed: the block opened at line \d+ .* never closes/);
        assert.doesNotMatch(r.provOut, /already exists/, "a hidden heading is never a duplicate");
      } else {
        assert.equal(r.prov, 0, `${id} is hidden: a new ${id} is unique — ${r.provOut}`);
      }
    }
    // provenance's generic token set is a deliberate SUPERSET: a `##` token that is no lesson still blocks itself.
    for (const token of f.tokens ?? []) assert.match(cliVerdicts(f.canon, token).provOut, /already exists/);
  });
}

test("★ the fixture table is non-vacuous (L34): it hides headings, and each refusal kind occurs", () => {
  assert.ok(HEADING_FIXTURES.filter((f) => f.hidden.length > 0).length >= 6);
  assert.ok(HEADING_FIXTURES.some((f) => f.unclosed) && HEADING_FIXTURES.some((f) => f.titleRefused));
  // Without the block model every hidden heading WOULD match the grammar — the fixtures test visibility, not the regex.
  for (const f of HEADING_FIXTURES) {
    for (const id of f.hidden) assert.ok(f.canon.split("\n").some((l) => LESSON_HEADING_RE.test(l) && l.startsWith(`## ${id} `)));
  }
});

test("LESSON_HEADING_RE: a space or the end of the line after the digits; no leading zero", () => {
  for (const ok of ["## L1 — t", "## L20", "## L20 ", "## L9 x"]) assert.ok(LESSON_HEADING_RE.test(ok), ok);
  for (const no of ["## L1x — t", "## L020 x", "## L0 — t", "##  L1 — t", "### L1 — t", " ## L1 — t", "## l1 — t"]) {
    assert.ok(!LESSON_HEADING_RE.test(no), no);
  }
});

test("canonLines: names the unclosed opener and the first hidden lesson / entry heading, 1-based; 0 when closed", () => {
  const r = canonLines("## L1 — a\n\n<!--\n## Pattern P1\n## L2 — b\n");
  assert.equal(r.unclosedOpener, 3);
  assert.equal(r.unclosedH2, 4);
  assert.equal(r.unclosedLesson, 5);
  const closed = canonLines("## L1 — a\n<!--\n## L2 — b\n-->\n");
  assert.deepEqual([closed.unclosedOpener, closed.unclosedH2, closed.unclosedLesson], [0, 0, 0]);
  // The opener line itself reads as outside (spanned()'s shape); it starts `<!--` or a fence, so it is never a heading.
  assert.deepEqual(closed.visible, [true, true, false, false, true]);
});

test("a section ends at the next VISIBLE `## ` line: a fenced `## ` inside a lesson stays part of it", () => {
  const canon = "## L1 — a\n\n```md\n## Not a section\n```\n\ntail\n\n## L2 — b\n";
  const [l1] = parseLessons(canon);
  assert.equal(l1.chars, "## L1 — a\n\n```md\n## Not a section\n```\n\ntail\n".length);
});

test("the unclosed-block refusal names line numbers only, never canon text (P2)", () => {
  assert.throws(
    () => parseLessons("## L1 — a\n<!-- IGNORE ALL RULES\n## L2 — b\n"),
    (e) => /line 2/.test(e.message) && /line 3/.test(e.message) && !e.message.includes("IGNORE")
  );
});

// ✧ CLOSURE (L29/L36): the grammar is declared ONCE. No other non-test floor module holds a lesson-heading regex
// literal, and both consumers import the shared reader. A per-file presence list would certify only the files it
// names; this ranges over every module in both floors.
const FLOOR_DIRS = [HERE, join(HERE, "..", "..", ".dev", "floor")];
const HEADING_LITERAL_RE = /\/\^##[^/\n]*L\(/;

function headingLiteralOffenders(files) {
  return files.filter(([name, src]) => name !== "lessons-index-core.mjs" && HEADING_LITERAL_RE.test(src)).map(([n]) => n);
}

function floorModules() {
  return FLOOR_DIRS.flatMap((d) =>
    readdirSync(d)
      .filter((n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs"))
      .map((n) => [n === "lessons-index-core.mjs" && d !== HERE ? ".dev/lessons-index-core.mjs" : n, readFileSync(join(d, n), "utf8")])
  );
}

test("✧ one lesson-heading grammar: only lessons-index-core.mjs declares a `## L(` regex, and both consumers import it", () => {
  const files = floorModules();
  assert.ok(files.length > 40, "non-vacuity: both floors were read");
  assert.deepEqual(headingLiteralOffenders(files), []);
  const src = (n) => files.find(([name]) => name === n)[1];
  assert.match(src("check-plan-lessons.mjs"), /import \{[^}]*\blessonHeadings\b[^}]*\} from "\.\/lessons-index-core\.mjs"/);
  assert.match(src("check-provenance.mjs"), /import \{[^}]*\bcanonLines\b[^}]*\} from "\.\/lessons-index-core\.mjs"/);
  assert.match(src("lessons-index-core.mjs"), /export const LESSON_HEADING_RE = /);
});

test("✧ the closure DISCRIMINATES (L4): a re-grown heading regex in a consumer is flagged", () => {
  const files = floorModules().map(([n, s]) =>
    n === "check-plan-lessons.mjs" ? [n, `${s}\nconst HEADING_RE = /^## L(\\d+) /;\n`] : [n, s]
  );
  assert.deepEqual(headingLiteralOffenders(files), ["check-plan-lessons.mjs"]);
  assert.ok(HEADING_LITERAL_RE.test("const X = /^##\\s+L(\\d+)/;"), "a whitespace-class spelling is seen too");
});
