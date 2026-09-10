// .dev/floor/check-skills-version-recorded.test.mjs — apparatus tests for the CHANGELOG version-record checker.
//
// L4: an authored fixture passes by construction. The ✧ cases are therefore MUTANTS — each asserts the
// checker FAILS when the thing it guards is broken, not merely that it passes when everything is fine.
// The UNRECORDED case is the whole point of the checker and is asserted against the SHAPE of the real
// defect (`f71f501`: SKILLS_VERSION 3.0.2, a full changelog that never names it).
//
// Two disciplines this file follows deliberately, both from canon:
//   - L29 — the refusal-state set is ITERATED from the checker's own exported `REFUSAL_STATES`, so a
//     member added later is covered by every rule for free rather than by an assertion an author wrote
//     for whichever member was in front of them.
//   - L34 — every "for each X, assert P" is preceded by an assertion that X is NON-EMPTY. A per-item
//     rule over an empty domain is true for free, and a vacuous pass is indistinguishable from a real one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkSkillsVersionRecorded,
  findOccurrences,
  isRecordBoundary,
  isCleanScalar,
  renderContext,
  REFUSAL_STATES,
  VERSION_RE,
  MAX_LEN,
  MAX_NEAR_MISSES,
} from "./check-skills-version-recorded.mjs";
import { isCleanScalar as badgeIsCleanScalar, VERSION_RE as BADGE_VERSION_RE, MAX_LEN as BADGE_MAX_LEN } from "./check-version-badge.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(HERE, "check-skills-version-recorded.mjs");
const REPO = join(HERE, "..", "..");

/** Run the checker as a child process; never throws. Returns {code, out}. */
function run(target) {
  try {
    const out = execFileSync(process.execPath, [CHECKER, target], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/**
 * A realistic changelog body. Deliberately NOT a one-liner: the real file is 270KB of prose in which a
 * version string is one token among thousands, and a fixture that does not resemble it would test a
 * problem the checker does not have.
 */
function changelogBody(entries) {
  return (
    `# Changelog\n\nAll notable changes are documented in this file.\n\n` +
    `The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project\n` +
    `adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n` +
    `## [Unreleased]\n\n### Fixed\n\n${entries}\n\n## [1.0.0] - 2026-06-23\n\n- The first cut.\n`
  );
}

function fixture({ version = "3.0.2", changelog = undefined, omitVersionFile = false, omitChangelog = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-svrec-"));
  if (!omitVersionFile) writeFileSync(join(dir, "SKILLS_VERSION"), version);
  if (!omitChangelog)
    writeFileSync(join(dir, "CHANGELOG.md"), changelog ?? changelogBody("- Recorded in `3.0.2`, which is this version.\n"));
  return dir;
}

function withFixture(opts, fn) {
  const dir = fixture(opts);
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── The happy path ────────────────────────────────────────────────────────────────────────────────

test("GREEN when the version is recorded in the changelog", () => {
  withFixture({}, (dir) => {
    const { code, out } = run(dir);
    assert.equal(code, 0, out);
    assert.match(out, /SKILLS-VERSION-RECORDED: GREEN/);
    assert.match(out, /"3\.0\.2"/);
  });
});

test("GREEN survives a trailing newline in SKILLS_VERSION (the normal committed shape)", () => {
  withFixture({ version: "3.0.2\n" }, (dir) => {
    assert.equal(run(dir).code, 0);
  });
});

// ── ✧ THE MUTANT THIS CHECKER EXISTS FOR ──────────────────────────────────────────────────────────

test("✧ UNRECORDED: a full changelog that never names the shipped version → exit 1 (the f71f501 defect)", () => {
  // The shape of the real defect: `f71f501` bumped 3.0.1 -> 3.0.2, EDITED CHANGELOG.md in the same diff,
  // and never wrote the string `3.0.2`. Verified against that commit's own bytes at build time:
  // `git show f71f501:CHANGELOG.md | grep -c '3\.0\.2'` -> 0, and this checker exits 1 on them.
  const changelog = changelogBody(
    "- **The writes-scope guard's fail-closed default no longer carries dev-repo posture into\n" +
      "  installed projects** ([#180](https://example.invalid/180)). Prevents agent edits from being\n" +
      "  classified as user drift.\n"
  );
  withFixture({ version: "3.0.2", changelog }, (dir) => {
    const { code, out } = run(dir);
    assert.equal(code, 1, "an unrecorded shipped version MUST be RED");
    assert.match(out, /\[UNRECORDED\]/);
    assert.match(out, /SKILLS_VERSION is "3\.0\.2"/);
    assert.match(out, /appears nowhere in CHANGELOG\.md as a complete version token/);
  });
});

test("✧ the RED trailer states the bound: appearing is not being correct", () => {
  withFixture({ version: "3.0.2", changelog: changelogBody("- Nothing named here.\n") }, (dir) => {
    assert.match(run(dir).out, /never verifies that the entry is correct/);
  });
});

// ── ✧ THE BOUNDARY RULE, and the MUTATION that proves it is load-bearing ──────────────────────────

/**
 * Each row is a changelog in which the LITERAL substring IS present but is NOT a complete version
 * token. The `naive` assertion below is the point of the table: it shows that the obvious
 * implementation — `changelog.includes(version)` — would call every one of these GREEN. Without it the
 * boundary rule (the single design decision this increment turns on) would have no test that fails if
 * it were removed.
 */
const NEAR_MISS_CASES = [
  { name: "inside a LONGER patch number", version: "3.0.2", text: "shipped in `3.0.20` and nothing else" },
  { name: "inside a LONGER major number", version: "3.0.2", text: "shipped in `13.0.2` and nothing else" },
  { name: "as the PREFIX of a four-part version", version: "3.0.2", text: "shipped in `3.0.2.1` and nothing else" },
  { name: "behind a `v` prefix", version: "3.0.2", text: "pinned at `v3.0.2` in a third-party action" },
  { name: "the live semver-URL look-alike", version: "2.0.0", text: "see https://semver.org/spec/v2.0.0.html for the scheme" },
  { name: "a third-party action pin", version: "7.0.1", text: "uses: actions/checkout@v7.0.1 # pinned" },
];

test("✧ NON-VACUITY: the near-miss table is non-empty before anything iterates it (L34)", () => {
  assert.ok(NEAR_MISS_CASES.length >= 6, `expected a populated near-miss table, got ${NEAR_MISS_CASES.length}`);
});

for (const c of NEAR_MISS_CASES) {
  test(`✧ NEAR MISS — ${c.name} → exit 1, and a bare substring test would have passed it`, () => {
    const changelog = changelogBody(`- ${c.text}\n`);
    // THE MUTATION (L4 applied to a design decision, not a fixture): the naive predicate is TRUE here.
    assert.equal(changelog.includes(c.version), true, "the fixture must contain the literal substring, or it tests nothing");
    withFixture({ version: c.version, changelog }, (dir) => {
      const { code, out } = run(dir);
      assert.equal(code, 1, `a substring that is not a version token must be RED (${c.name})`);
      assert.match(out, /\[UNRECORDED\]/);
      assert.match(out, /never as a complete version token/, "the message must NAME the near miss (L27)");
    });
  });
}

/**
 * Every rendering the live CHANGELOG.md actually uses, measured at build time rather than imagined.
 * L36: a parameterized value acquires variant spellings, and pinning one — the way a back-tick
 * requirement would — makes every other correct rendering a false RED.
 */
const ACCEPTED_RENDERINGS = [
  { name: "back-ticked", text: "bumped to `3.0.2` in this increment" },
  { name: "bold", text: "`SKILLS_VERSION` 3.0.1 -> **3.0.2**, patch" },
  { name: "bare in prose", text: "the 3.0.2 line carries the fix" },
  { name: "a Keep-a-Changelog heading", text: "## [3.0.2] - 2026-09-09" },
  { name: "inside a shields badge URL", text: "https://img.shields.io/badge/pharn-3.0.2-blue" },
  { name: "sentence-final, before a period", text: "the version that shipped it is 3.0.2." },
  { name: "parenthesised", text: "(3.0.2) closes the gap" },
];

test("✧ NON-VACUITY: the rendering table is non-empty before anything iterates it (L34)", () => {
  assert.ok(ACCEPTED_RENDERINGS.length >= 7, `expected a populated rendering table, got ${ACCEPTED_RENDERINGS.length}`);
});

for (const r of ACCEPTED_RENDERINGS) {
  test(`✧ CLOSURE — the ${r.name} rendering is accepted, so no markup convention is pinned (L36)`, () => {
    withFixture({ version: "3.0.2", changelog: changelogBody(`- ${r.text}\n`) }, (dir) => {
      const { code, out } = run(dir);
      assert.equal(code, 0, `${r.name} must count as a record: ${out}`);
    });
  });
}

test("✧ DISCRIMINATION: two changelogs identical but for the version token give exit 1 and exit 0", () => {
  const without = changelogBody("- A fix that shipped, described but not keyed.\n");
  const with_ = changelogBody("- A fix that shipped, described but not keyed. (`3.0.2`)\n");
  withFixture({ version: "3.0.2", changelog: without }, (dir) => assert.equal(run(dir).code, 1));
  withFixture({ version: "3.0.2", changelog: with_ }, (dir) => assert.equal(run(dir).code, 0));
});

// ── ✧ The refusal-state ENUMERATION (L29) — iterated, never hand-listed ───────────────────────────

/**
 * One fixture per refusal state, plus the marker phrase that state's OWN remedy carries. The
 * per-branch remedy assertion below is L27's prescribed form — "present in its own case AND absent from
 * the others" — not merely "present": a remedy composed once for every branch is printed by branches it
 * cannot possibly help, and a guard that prints an impossible remedy trains the exact bypass it exists
 * to prevent.
 */
const BRANCH_CASES = {
  BAD_TARGET: { make: (dir) => join(dir, "no-such-subdir"), marker: /pass a path to a directory/ },
  MISSING_VERSION: { opts: { omitVersionFile: true }, marker: /restore SKILLS_VERSION/ },
  ENUM_ERROR: { opts: { version: "   \n" }, marker: /make SKILLS_VERSION a / },
  MISSING_CHANGELOG: { opts: { omitChangelog: true }, marker: /create CHANGELOG\.md/ },
  EMPTY_CHANGELOG: { opts: { changelog: "   \n\t\n" }, marker: /write the changelog's entries/ },
  UNRECORDED: {
    opts: { changelog: changelogBody("- Nothing keyed here.\n") },
    marker: /in the CHANGELOG entry that describes what shipped/,
  },
};

test("✧ NON-VACUITY + CLOSURE: every exported REFUSAL_STATE has a case, and there are no extras (L29/L34)", () => {
  assert.ok(REFUSAL_STATES.length >= 6, `the refusal set must be populated, got ${REFUSAL_STATES.length}`);
  assert.deepEqual(
    [...REFUSAL_STATES].sort(),
    Object.keys(BRANCH_CASES).sort(),
    "the checker's exported enumeration and this file's case table must be the SAME set — a member added to one and not the other is the L36 defect"
  );
});

for (const state of REFUSAL_STATES) {
  test(`✧ ${state} → exit 1, named, and no stack trace`, () => {
    const c = BRANCH_CASES[state];
    const dir = fixture(c.opts ?? {});
    try {
      const { code, out } = run(c.make ? c.make(dir) : dir);
      assert.equal(code, 1, `${state} must be RED`);
      assert.match(out, new RegExp(`\\[${state}\\]`));
      assert.doesNotMatch(out, /at .*\.mjs:\d+/, `${state} must not surface as a thrown stack`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`✧ ${state}'s remedy is REACHABLE for it and ABSENT from every other branch (L27)`, () => {
    const own = BRANCH_CASES[state];
    const dir = fixture(own.opts ?? {});
    let ownOut;
    try {
      ownOut = run(own.make ? own.make(dir) : dir).out;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    assert.match(ownOut, own.marker, `${state} must print its own remedy`);

    const others = REFUSAL_STATES.filter((s) => s !== state);
    assert.ok(others.length >= 5, "the 'other branches' set must be non-empty (L34)");
    for (const other of others) {
      const o = BRANCH_CASES[other];
      const d = fixture(o.opts ?? {});
      let otherOut;
      try {
        otherOut = run(o.make ? o.make(d) : d).out;
      } finally {
        rmSync(d, { recursive: true, force: true });
      }
      assert.doesNotMatch(otherOut, own.marker, `${other} must NOT print ${state}'s remedy — an unreachable remedy trains a bypass`);
    }
  });
}

// ── ✧ SKILLS_VERSION guard (L14: the clean-scalar guard PRECEDES the shape regex) ─────────────────

test("✧ SKILLS_VERSION multi-line → exit 1 ENUM_ERROR (not a silent first-line read)", () => {
  withFixture({ version: "3.0.2\n9.9.9\n" }, (dir) => {
    const { code, out } = run(dir);
    assert.equal(code, 1, "a two-line version file must NOT quietly match on its first line");
    assert.match(out, /\[ENUM_ERROR\]/);
  });
});

test("✧ SKILLS_VERSION bearing a control character → exit 1 ENUM_ERROR", () => {
  // The literal below carries a U+0001 between "3.0" and "2" — invisible in a diff, so it is called out
  // here. `.trim()` does not strip an EMBEDDED control character, which is why isCleanScalar is composed
  // BEFORE the shape regex rather than replaced by it (L14).
  withFixture({ version: `3.0${String.fromCharCode(1)}2` }, (dir) => {
    assert.equal(run(dir).code, 1);
  });
});

test("✧ SKILLS_VERSION not <major>.<minor>.<patch> → exit 1 ENUM_ERROR", () => {
  withFixture({ version: "v3.0" }, (dir) => {
    const { code, out } = run(dir);
    assert.equal(code, 1);
    assert.match(out, /\[ENUM_ERROR\]/);
  });
});

test("✧ a pre-release SKILLS_VERSION is REFUSED, so both version gates RED on it (the deliberate divergence)", () => {
  // check-version-badge.mjs names this UNSUPPORTED because a shields badge cannot round-trip a literal
  // "-". This checker has no such state and needs none: the SHARED VERSION_RE already rejects it. The
  // outcome agrees (both RED); only the refusal's NAME differs, and that is asserted so a reader does
  // not infer the case is unhandled here.
  withFixture({ version: "3.1.0-rc.1", changelog: changelogBody("- shipped in `3.1.0-rc.1`\n") }, (dir) => {
    const { code, out } = run(dir);
    assert.equal(code, 1, "a pre-release must not slip through the record check");
    assert.match(out, /\[ENUM_ERROR\]/);
    assert.doesNotMatch(out, /\[UNSUPPORTED\]/, "this checker deliberately has no UNSUPPORTED state");
  });
});

// ── ✧ Precedence: two simultaneous failures must not race ─────────────────────────────────────────

test("✧ when BOTH inputs are broken, the SKILLS_VERSION refusal wins deterministically", () => {
  withFixture({ version: "nonsense", omitChangelog: true }, (dir) => {
    const { code, out } = run(dir);
    assert.equal(code, 1);
    assert.match(out, /\[ENUM_ERROR\]/);
    assert.doesNotMatch(out, /\[MISSING_CHANGELOG\]/, "precedence is defined: the version file is validated first");
  });
});

// ── ✧ The CHANGELOG is untrusted on the way OUT too (P2) ──────────────────────────────────────────

test("✧ an ESC in a near-miss context is escaped in stdout, never emitted raw (P2)", () => {
  // ESC is built with fromCharCode, never written as a literal escape or a raw byte: a raw control byte
  // in a source file survives copy/paste and tooling badly. On a fork or an outside contributor's PR
  // CHANGELOG.md is attacker-influenced, so its bytes are DATA on the way out as well as in.
  const ESC = String.fromCharCode(27);
  const changelog = changelogBody(`- pinned at v3.0.2${ESC}[31mPWNED${ESC}[0m in a dependency\n`);
  withFixture({ version: "3.0.2", changelog }, (dir) => {
    const { code, out } = run(dir);
    assert.equal(code, 1);
    assert.match(out, /\[UNRECORDED\]/);
    assert.ok(!out.includes(ESC), "the ESC must not reach stdout raw");
    assert.match(out, /\\u001b/, "it must appear escaped, as JSON.stringify renders it");
  });
});

test("✧ a flood of near misses is CAPPED, so a crafted changelog cannot fill a terminal (P2)", () => {
  const flood = Array.from({ length: 200 }, (_, i) => `- pinned at v3.0.2 in dep ${i}\n`).join("");
  withFixture({ version: "3.0.2", changelog: changelogBody(flood) }, (dir) => {
    const { code, out } = run(dir);
    assert.equal(code, 1);
    assert.match(out, /does occur 200 time\(s\)/, "the COUNT is reported in full — only the quoting is capped");
    const quoted = out.match(/"(?:[^"\\]|\\.)*"/g) ?? [];
    assert.ok(
      quoted.length <= MAX_NEAR_MISSES + 4,
      `expected at most ${MAX_NEAR_MISSES} quoted contexts, saw ${quoted.length} quoted spans`
    );
    assert.ok(out.length < 4000, `the RED report must stay bounded, got ${out.length} chars`);
  });
});

// ── ✧ Unit-level guards ───────────────────────────────────────────────────────────────────────────

test("✧ FAIL-CLOSED: an empty needle can never be searched for (the false-GREEN vector)", () => {
  // This is the direction that matters and the one that distinguishes this checker from its sibling:
  // check-version-badge COMPARES the version (a degenerate value is a mismatch, i.e. RED), this one
  // SEARCHES FOR it, and an empty string is a substring of every file.
  assert.deepEqual(findOccurrences("anything at all", ""), { recorded: [], nearMisses: [] });
  assert.deepEqual(findOccurrences("anything at all", null), { recorded: [], nearMisses: [] });
  assert.deepEqual(findOccurrences(null, "3.0.2"), { recorded: [], nearMisses: [] });
});

test("✧ isRecordBoundary: the rule holds at both edges of the buffer and around punctuation", () => {
  assert.equal(isRecordBoundary("3.0.2", 0, 5), true, "a whole-buffer match is a boundary on both sides");
  assert.equal(isRecordBoundary("`3.0.2`", 1, 5), true);
  assert.equal(isRecordBoundary("3.0.20", 0, 5), false, "a trailing digit disqualifies");
  assert.equal(isRecordBoundary("13.0.2", 1, 5), false, "a leading digit disqualifies");
  assert.equal(isRecordBoundary("v3.0.2", 1, 5), false, "a leading letter disqualifies");
  assert.equal(isRecordBoundary("3.0.2.1", 0, 5), false, "a dot followed by a digit disqualifies");
  assert.equal(isRecordBoundary("ends at 3.0.2.", 8, 5), true, "sentence-final punctuation is a boundary");
  assert.equal(isRecordBoundary("x.3.0.2", 2, 5), false, "a leading dot disqualifies");
});

test("✧ renderContext bounds and escapes its output", () => {
  const long = `${"x".repeat(500)}3.0.2${"y".repeat(500)}`;
  const ctx = renderContext(long, 500, 5);
  assert.ok(ctx.length < 200, `context must be bounded, got ${ctx.length} chars`);
  assert.equal(ctx.startsWith('"'), true, "it is JSON-quoted, so control characters are escaped");
});

test("✧ isCleanScalar's real contribution is a LENGTH BOUND the shape regex does not have", () => {
  assert.equal(VERSION_RE.test(`${"9".repeat(5000)}.0.0`), true, "the shape regex admits an unbounded run");
  assert.equal(isCleanScalar(`${"9".repeat(5000)}.0.0`), false, "the guard is what bounds it");
  assert.equal(isCleanScalar("3.0.2"), true);
  assert.equal(isCleanScalar(""), false);
  assert.equal(isCleanScalar("x".repeat(MAX_LEN + 1)), false);
  assert.equal(isCleanScalar(null), false);
});

test("✧ the scan is linear enough — a large changelog with many hits does not blow up", () => {
  const hostile = `${"3.0.2 ".repeat(50000)}`;
  const started = process.hrtime.bigint();
  const { recorded } = findOccurrences(hostile, "3.0.2");
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  assert.equal(recorded.length, 50000);
  assert.ok(ms < 2000, `scan took ${ms}ms over 50k hits — expected roughly linear behaviour`);
});

// ── ✧ COPY-PAIR PIN (L31/L35) — something must RANGE OVER the two copies ──────────────────────────

test("✧ the constants shared with check-version-badge.mjs AGREE (the deliberate copy-pair)", () => {
  // The `check-provenance.mjs` precedent: two deliberate copies are pinned to agree on every SHARED
  // constant. What this proves is exactly textual/behavioural agreement of those three symbols — NOT
  // that the two checkers treat a version identically end to end. The one deliberate divergence is
  // asserted separately, below.
  assert.equal(VERSION_RE.source, BADGE_VERSION_RE.source, "the two version shapes must not drift apart");
  assert.equal(VERSION_RE.flags, BADGE_VERSION_RE.flags);
  assert.equal(MAX_LEN, BADGE_MAX_LEN, "the two length bounds must not drift apart");
  const probes = ["3.0.2", "", "x".repeat(65), "3.02", "  3.0.2  ", "3.1.0-rc.1"];
  assert.ok(probes.length >= 6, "the agreement probe table must be non-empty (L34)");
  for (const p of probes) {
    assert.equal(isCleanScalar(p), badgeIsCleanScalar(p), `isCleanScalar must agree on ${JSON.stringify(p)}`);
  }
});

test("✧ the DIVERGENCE is deliberate and stated: this checker has no UNSUPPORTED state", () => {
  // Asserted rather than assumed, because the check-provenance precedent pins BOTH halves — agreement
  // AND deliberate difference — and citing only the first would let a reader infer the hyphen case is
  // unhandled here. It is handled: the shared VERSION_RE rejects it, so both checkers RED.
  assert.equal(REFUSAL_STATES.includes("UNSUPPORTED"), false);
  assert.equal(VERSION_RE.test("3.1.0-rc.1"), false, "the shared shape already rejects a pre-release, so no extra state is owed");
  const badge = readFileSync(join(HERE, "check-version-badge.mjs"), "utf8");
  assert.match(badge, /UNSUPPORTED/, "the sibling DOES carry that state — the difference is real, not imagined");
});

// ── ✧ WIRING PINS — the checker guards nothing unless something invokes it ─────────────────────────

test("✧ package.json wires check:changelog to this checker, and `check` runs check:changelog", () => {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.match(
    pkg.scripts["check:changelog"] ?? "",
    /check-skills-version-recorded\.mjs/,
    "check:changelog must run check-skills-version-recorded.mjs"
  );
  assert.match(pkg.scripts.check, /check:changelog/, "npm run check must run check:changelog");
});

test("✧ CI actually INVOKES the record check, and its step is not disabled by an `if:` (L2)", () => {
  // The wiring precedent and its reason: ci.yml does NOT run `npm run check` — it runs each script as
  // its own step. A checker folded only into `check` would therefore never fire on a pull request while
  // the plan claimed it was gated. The `if:` half is deliberate: matching only the `run:` string would
  // let an edit to `if: false` leave the invocation present, this test green, and the guard dead.
  const ci = readFileSync(join(REPO, ".github", "workflows", "ci.yml"), "utf8");
  const step = ci.match(/^ {6}- name: [^\n]*\n(?: {8}[^\n]*\n)*? {8}run: npm run check:changelog[ \t]*$/m);
  assert.ok(step, "ci.yml must contain a step whose `run:` is `npm run check:changelog`");
  assert.match(
    step[0],
    /^ {8}if: \$\{\{ always\(\) && steps\.install\.outcome == 'success' \}\}$/m,
    "the record-check step must carry the same install-gated `if:` as its sibling steps — a disabled step is a dead guard"
  );

  // HONEST RESIDUAL (P0), stated so this pin is not oversold: what remains uncheckable from inside the
  // repo is that GitHub EXECUTED the job, that the workflow is enabled, and that branch protection
  // requires this check. Those are harness-layer facts. "The wiring is pinned" NEVER means "CI ran it".
  //
  // NAMED RESIDUAL `ci-if-guard-enumeration` (raised at grill as G5, deliberately not fixed): this is
  // now the THIRD test file hard-coding that same `if:` string with nothing ranging over the three —
  // the L31/L36 shape. Not extracted here because the guard string has never drifted, so P7's trigger
  // has not fired; it is named so the first drift has somewhere to land.
});

// ── The real repo ─────────────────────────────────────────────────────────────────────────────────

test("the checker is GREEN against this repo", () => {
  const { code, out } = run(REPO);
  assert.equal(code, 0, out);
});

test("✧ NON-VACUITY against the real repo: the GREEN rests on a real occurrence, not an empty scan", () => {
  // L34's direction applied to the live case: "no near misses and no crash" would also describe a scan
  // that found nothing at all. The verdict must rest on at least one accepted occurrence.
  const version = readFileSync(join(REPO, "SKILLS_VERSION"), "utf8").trim();
  const changelog = readFileSync(join(REPO, "CHANGELOG.md"), "utf8");
  const { recorded } = findOccurrences(changelog, version);
  assert.ok(recorded.length >= 1, `the live CHANGELOG must record ${version} at a version-token boundary`);
});

test("checkSkillsVersionRecorded is pure — it returns a verdict rather than exiting", () => {
  withFixture({ version: "3.0.2", changelog: changelogBody("- nothing keyed\n") }, (dir) => {
    const res = checkSkillsVersionRecorded(dir);
    assert.equal(res.ok, false);
    assert.equal(res.findings[0].type, "UNRECORDED");
    assert.equal(res.version, "3.0.2");
    assert.deepEqual(res.occurrences.recorded, []);
  });
});

test("✧ a non-directory target is a NAMED refusal, never a crash and never a silent GREEN", () => {
  const dir = fixture({});
  try {
    const { code, out } = run(join(dir, "SKILLS_VERSION")); // a FILE, not a directory
    assert.equal(code, 1);
    assert.match(out, /\[BAD_TARGET\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ a target that is an EMPTY directory refuses on the version file, in precedence order", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-svrec-empty-"));
  mkdirSync(join(dir, "sub"), { recursive: true });
  try {
    const { code, out } = run(dir);
    assert.equal(code, 1);
    assert.match(out, /\[MISSING_VERSION\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
