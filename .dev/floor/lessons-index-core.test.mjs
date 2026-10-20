// .dev/floor/lessons-index-core.test.mjs — hermetic tests for the lessons-index core.
//
// Everything here is a pure function over an in-memory canon string, except the three DRIFT GUARDS at the
// end, which read live repo files on purpose (they exist precisely to notice when those files change).
//
// House rule observed throughout: a control character used in a fixture is CONSTRUCTED
// (`String.fromCharCode`), never typed as a literal byte — an invisible control char in a source file is
// unreadable in a diff and survives a copy-paste only by luck. (This file's first draft embedded a literal
// NUL, which is the empirical case for the rule.)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseLessons, renderIndex, TYPE_ENUM, CHARS_PER_TOKEN, ABSENT, MALFORMED, DEV_PROFILE } from "./lessons-index-core.mjs";
import { PRODUCT_PROFILE, renderIndex as productRenderIndex } from "../../pharn/floor/lessons-index-core.mjs";

const one = (body) => parseLessons(body)[0];

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

test("an ABSENT tag line renders `-` and never fails the generator (L3 — legacy entries)", () => {
  const e = one(["## L1 — a title", "", "**Lesson.** x"].join("\n"));
  assert.equal(e.type, ABSENT);
  assert.equal(e.concepts, ABSENT);
});

test("a MALFORMED tag line renders `?` — distinct from absent, so it cannot hide (GRILL F2)", () => {
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
  const withDate = one(["## L1 — t", "", "**Lesson.** x", "", "- promoted: 2026-06-24 via gated `/review`."].join("\n"));
  assert.equal(withDate.date, "2026-06-24");
  assert.equal(one("## L1 — t\n\n**Lesson.** x").date, ABSENT);
});

test("GRILL F3: the ~tokens span is the FULL section — heading through the line before the next `##`", () => {
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

test("a title carrying back-ticks and `||` survives verbatim (the live L15 shape)", () => {
  const title = "Index an arbitrary key with an own-property test, never `||`/`??`";
  const out = renderIndex(parseLessons(`## L1 — ${title}\n\nx`));
  assert.ok(out.includes(title), "the title must be reproduced verbatim as DATA");
});

test("rows live inside a ```text fence", () => {
  const out = renderIndex(parseLessons("## L1 — t\n\nx"));
  assert.match(out, /```text\nL1 /);
});

test("the header states tagged / malformed / untagged counts (GRILL F2's visibility half)", () => {
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

test("L10: the rendered index never carries a `rule_id:` + `problem:` pair (validate CHECK 5)", () => {
  const out = renderIndex(parseLessons("## L1 — t\n\nx"));
  assert.ok(!(/rule_id:/.test(out) && /problem:/.test(out)), "the index must never look like a finding template");
});

test("rendering is deterministic — two runs over the same canon are byte-identical", () => {
  const canon = "## L1 — a\n\nx\n\n## L2 — b\n\ntype: eval · concepts: [m]\n\ny";
  assert.equal(renderIndex(parseLessons(canon)), renderIndex(parseLessons(canon)));
});

// ── DRIFT GUARDS (these read live files on purpose) ────────────────────────────────────────────────

test("✧ P4: TYPE_ENUM here EQUALS the TYPE_ENUM in check-provenance.mjs (its single source of truth)", () => {
  // Both live on the product surface since 6.69.0 — the dev files are thin wrappers that declare neither.
  const src = readFileSync(new URL("../../pharn/floor/check-provenance.mjs", import.meta.url), "utf8");
  const m = src.match(/const TYPE_ENUM = \[([^\]]*)\];/);
  assert.ok(m, "check-provenance.mjs must declare `const TYPE_ENUM = [...]`");
  const theirs = m[1]
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
  assert.deepEqual(TYPE_ENUM, theirs, "the mirrored TYPE_ENUM drifted from check-provenance.mjs");
});

test("✧ L20: every LIVE canon entry carries a well-formed tag line — 0 untagged, 0 malformed", () => {
  // WHY this guard exists (L20 — a promoted lesson whose only remedy is discipline WILL recur): before the
  // L1–L17 retro-tag, the corpus was legitimately mixed and this assertion could not have been written. It
  // can now, and #114's named residual is exactly the kind L20 says to escalate: the tag gate MARKS a bad
  // value `?` instead of failing, so a malformed or missing tag line regenerates cleanly and `docs:check`
  // stays exit 0 — the only remedy on offer was "remember to grep the rendered header," which is discipline.
  // This turns it into a non-zero exit.
  //
  // SCOPE, stated (P0): this covers THIS repo's canon only. The product twin pharn/floor/lessons-index-core.mjs
  // has no equivalent pin and deliberately keeps the benign reading of `-`, because a user's memory-bank may
  // hold hand-written entries — so `lesson-tagline-render-check` remains a real follow-up for that surface.
  // And it proves the tag line is well-SHAPED, never that its values are APT ("typed `floor`" still never
  // means "about the floor" — aptness is human-ratified at the promote gate and checked by nothing).
  const entries = parseLessons(readFileSync(new URL("../memory-bank/lessons-learned.md", import.meta.url), "utf8"));
  assert.ok(entries.length > 0, "canon must parse to at least one entry — an empty parse would pass vacuously");
  const idsWhere = (marker) => entries.filter((e) => e.type === marker).map((e) => e.id);
  assert.deepEqual(idsWhere(ABSENT), [], "canon entries with NO tag line — add one, or promote via /pharn-dev-memory-promote");
  assert.deepEqual(idsWhere(MALFORMED), [], "canon entries whose tag line FAILED its gate — read them in canon and fix the tag line");
});

test("✧ GRILL F7: package.json WIRES both the generator and the checker into docs:generate / docs:check", () => {
  // Without this, the increment's entire floor claim ("the committed index matches canon, enforced by
  // npm run check") can be deleted by one package.json edit while every other test stays green.
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.match(pkg.scripts["docs:generate"], /gen-lessons-index\.mjs/, "docs:generate must run gen-lessons-index.mjs");
  assert.match(pkg.scripts["docs:check"], /check-lessons-index\.mjs/, "docs:check must run check-lessons-index.mjs");
  assert.match(pkg.scripts.check, /docs:check/, "npm run check must run docs:check");
});

test("✧ the generated index is exempt from BOTH style gates (L11 — else one stale byte blocks every later verify)", () => {
  const root = new URL("../../", import.meta.url);
  assert.match(readFileSync(new URL(".prettierignore", root), "utf8"), /^docs\/lessons-index\.md$/m);
  assert.match(readFileSync(new URL(".markdownlint-cli2.jsonc", root), "utf8"), /"docs\/lessons-index\.md"/);
});

test("✧ CI actually INVOKES the drift check, and its step is not disabled by an `if:` (L2)", () => {
  // WHY this guard exists (L2 — a doc may cite only a LIVE floor op): CLAUDE.md tells every future
  // session that the generated regions are "guarded by `npm run docs:check` … as its own CI step". That
  // sentence was FALSE for one commit — ci.yml invoked the catalog checker directly and nothing ran the
  // lessons checker on a PR. The wiring has since landed; this pins it so the claim cannot quietly become
  // false again.
  //
  // The `if:` assertion is deliberate (GRILL F3). Matching only the `run:` string would let an edit to
  // `if: false` leave the invocation present, this test green, and the guard dead — the same defect one
  // level down. The condition lives in the file under test, so it is in-repo and pinnable, NOT the
  // harness-layer residual below.
  const ci = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  const step = ci.match(/^ {6}- name: [^\n]*\n(?: {8}[^\n]*\n)*? {8}run: npm run docs:check[ \t]*$/m);
  assert.ok(step, "ci.yml must contain a step whose `run:` is `npm run docs:check`");
  assert.match(
    step[0],
    /^ {8}if: \$\{\{ always\(\) && steps\.install\.outcome == 'success' \}\}$/m,
    "the docs:check step must carry the same install-gated `if:` as its sibling steps — a disabled step is a dead guard"
  );

  // HONEST RESIDUAL (P0), stated so this guard is not oversold: what remains uncheckable from inside the
  // repo is that GitHub EXECUTED the job, that the workflow is enabled, and that branch protection
  // requires this check. Those are harness-layer facts — the same boundary LIMITS.md §1d draws for an
  // out-of-band approval signal. "The wiring is pinned" NEVER means "CI is guaranteed to run it".
});

// ── ✧ ONE IMPLEMENTATION (6.69.0, audit ARCH-6) — the three dev lessons-index files are thin wrappers ──
//
// Until 6.69.0 this file pinned a hand-kept second copy of pharn/floor/lessons-index-core.mjs to the product one:
// shared constants and shared function bodies byte-identical, four constants and two functions deliberately
// different. The copy is retired (lessons-learned L35); the dev files import the product modules and pass DEV_PROFILE.
// What replaces the text pins is a CLOSURE over what each wrapper may declare (L36 — closure, not per-member
// presence): a re-grown HEADING_RE, TAG_RE, parseLessons or byte comparison in a dev file fails here. Its
// non-vacuity is pinned by negative controls (L4). The dependency points `.dev/` -> `pharn/` only, so — as before —
// this guard lives on the dev side and protects THIS repo; the product suite pins its own default profile.
//
// HONEST SCOPE (P0): the closure reads SOURCE TEXT for top-level declarations. That the wrappers call the shared
// code correctly is shown by the rest of the dev suites, which run THROUGH them, and by `npm run docs:check`, which
// compares the committed docs/lessons-index.md with the shared renderer's output under DEV_PROFILE.

/** Each wrapper, the shared module it must import, and the only top-level names it may declare. */
const WRAPPERS = [
  {
    file: "lessons-index-core.mjs",
    imports: "../../pharn/floor/lessons-index-core.mjs",
    allowed: ["DEV_PROFILE", "CANON_PATH", "OUT_PATH", "renderIndex", "buildIndex"],
  },
  {
    file: "check-lessons-index.mjs",
    imports: "../../pharn/floor/check-lessons-index.mjs",
    allowed: ["FIX", "checkLessonsIndex", "main"],
  },
  { file: "gen-lessons-index.mjs", imports: "../../pharn/floor/gen-lessons-index.mjs", allowed: ["generate", "main"] },
];

/** Top-level declarations (const / let / var / function / class) in a module's source, by name. */
function topLevelDeclarations(src) {
  return [...src.matchAll(/^(?:export\s+)?(?:const|let|var|function\*?|async\s+function|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
}

/** Offenders for one wrapper's source: a declaration outside its allowlist, or a missing import of its module. */
function wrapperOffenders(w, src) {
  const out = topLevelDeclarations(src).filter((n) => !w.allowed.includes(n));
  if (!src.includes(`from "${w.imports}"`)) out.push(`<no import of ${w.imports}>`);
  return out;
}

for (const w of WRAPPERS) {
  test(`✧ .dev/floor/${w.file} is a THIN WRAPPER — no grammar, no comparison of its own`, () => {
    assert.deepEqual(wrapperOffenders(w, readFileSync(new URL(`./${w.file}`, import.meta.url), "utf8")), []);
  });
}

test("✧ the wrapper closure DISCRIMINATES — a re-grown grammar constant, parser or comparison is caught", () => {
  for (const w of WRAPPERS) {
    const src = readFileSync(new URL(`./${w.file}`, import.meta.url), "utf8");
    for (const grown of [
      "const HEADING_RE = /^## L(\\d+) (.*)$/;",
      "export function parseLessons(t) { return t; }",
      "const pad = (s) => s;",
    ]) {
      assert.notDeepEqual(wrapperOffenders(w, `${src}\n${grown}\n`), [], `${w.file}: the closure must flag ${grown}`);
    }
    assert.deepEqual(wrapperOffenders(w, src.replace(w.imports, "./elsewhere.mjs")), [`<no import of ${w.imports}>`]);
  }
  assert.equal(WRAPPERS.length, 3, "the three dev lessons-index files (L34: the domain must not silently shrink)");
});

test("✧ the two profiles DIFFER where they must, and hold their surface's values", () => {
  // A future "let's unify these" edit that pointed the product default at `.dev/memory-bank/` or `docs/` would
  // re-introduce the two rejections the product profile encodes — writing into the gated-canon zone, and claiming
  // a directory that belongs to the user. And a dev profile pointed at `.pharn/` would make `docs:check` compare a
  // gitignored cache.
  assert.equal(DEV_PROFILE.canonPath, ".dev/memory-bank/lessons-learned.md");
  assert.equal(DEV_PROFILE.outPath, "docs/lessons-index.md");
  assert.equal(DEV_PROFILE.gen, ".dev/floor/gen-lessons-index.mjs");
  assert.equal(DEV_PROFILE.regen, "npm run docs:generate");
  assert.equal(DEV_PROFILE.storageNote, "", "the committed dev index carries no cache paragraph");
  assert.equal(PRODUCT_PROFILE.canonPath, "memory-bank/lessons-learned.md");
  assert.equal(PRODUCT_PROFILE.outPath, ".pharn/lessons-index.md");
  // L2 — a doc may cite only a LIVE op: the product hint is a bare `node` invocation.
  assert.equal(PRODUCT_PROFILE.regen, "node pharn/floor/gen-lessons-index.mjs .");
  for (const k of ["canonPath", "outPath", "gen", "regen", "columnsNote"]) {
    assert.notEqual(DEV_PROFILE[k], PRODUCT_PROFILE[k], `${k} must differ between the surfaces`);
  }
});

test("✧ the dev render is the SHARED renderer under DEV_PROFILE — identical bytes, no private renderer", () => {
  const canon = "## L1 — a\n\nx\n\n## L2 — b\n\ntype: eval · concepts: [m]\n\ny";
  assert.equal(renderIndex(parseLessons(canon)), productRenderIndex(parseLessons(canon), DEV_PROFILE));
});

test("✧ CTX-8 dogfood: the PRODUCT checker runs on THIS repo's canon with --canon-root, and is never NO_CANON", () => {
  // Before 6.69.0 `node pharn/floor/check-lessons-index.mjs . --verdict` printed NO_CANON here — this repo's canon is
  // .dev/memory-bank/, so the product sweep could not be run on it at all. The flag reaches it. The token is COLD
  // or GREEN or STALE depending on this machine's gitignored cache; any of those proves canon was READ.
  const repo = fileURLToPath(new URL("../../", import.meta.url));
  const cli = fileURLToPath(new URL("../../pharn/floor/check-lessons-index.mjs", import.meta.url));
  const withFlag = spawnSync(process.execPath, [cli, "--canon-root", ".dev/memory-bank", repo, "--verdict"], { encoding: "utf8" });
  assert.ok(["COLD", "GREEN", "STALE"].includes(withFlag.stdout.trim()), `got ${JSON.stringify(withFlag.stdout)}`);
  // NON-VACUITY: without the flag the same call still reads memory-bank/ (absent here) — the default did not move.
  const without = spawnSync(process.execPath, [cli, repo, "--verdict"], { encoding: "utf8" });
  assert.equal(without.stdout, "NO_CANON\n");
});
