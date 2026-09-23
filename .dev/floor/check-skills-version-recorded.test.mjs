// .dev/floor/check-skills-version-recorded.test.mjs — apparatus tests for the CHANGELOG repo-state checker.
//
// L4: an authored fixture passes by construction. The ✧ cases are therefore MUTANTS — each asserts the
// checker FAILS when the thing it guards is broken, not merely that it passes when everything is fine.
//
// Disciplines this file follows deliberately, all from canon:
//   - L29 — the refusal-state set is ITERATED from the checker's own exported `REFUSAL_STATES`, with a
//     closure assertion against this file's case table in both directions.
//   - L27 — each state's remedy must be present in its own output AND absent from every other state's.
//   - L34 — every "for each X, assert P" is preceded by an assertion that X is non-empty.
//   - L41/L52 — the defaults in this checker are enumerated and each gets a test that reaches its
//     no-argument path: `now` (the live-repo CLI run injects none) and `targetDir` (a CLI run with no
//     argument, from the repo root).
//
// Fixture dates for CLI runs are in the PAST relative to any real clock this suite will run under
// (2026-09 and earlier) or unmistakably in the future (2099), so the real-clock `now` cannot flip a case.
// Tests that need a precise `now` call the pure core, or `main()` in-process, with an injected one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkSkillsVersionRecorded,
  checkChangelogText,
  findOccurrences,
  isRecordBoundary,
  isCleanScalar,
  renderContext,
  main,
  REFUSAL_STATES,
  VERSION_RE,
  MAX_LEN,
  MAX_NEAR_MISSES,
  MAX_FINDINGS_PER_STATE,
  FUTURE_ALLOWANCE_DAYS,
} from "./check-skills-version-recorded.mjs";
import { parseChangelog } from "./changelog-core.mjs";
import { isCleanScalar as badgeIsCleanScalar, VERSION_RE as BADGE_VERSION_RE, MAX_LEN as BADGE_MAX_LEN } from "./check-version-badge.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(HERE, "check-skills-version-recorded.mjs");
const REPO = join(HERE, "..", "..");
const NOW = new Date("2026-09-23T12:00:00Z");

/** Run the checker as a child process; never throws. Returns {code, out}. */
function run(args, opts = {}) {
  try {
    const out = execFileSync(process.execPath, [CHECKER, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/** Run `main()` in-process with an injected clock; returns {code, out}. */
function runIn(args, now = NOW) {
  let out = "";
  const code = main(args, { out: (s) => (out += s), now });
  return { code, out };
}

/**
 * A realistic, SECTIONED changelog. `unreleased` is an array of entry texts (or null for no section);
 * `sections` is newest first. Deliberately not a one-liner: the real file is ~480 KB of prose.
 */
function changelog({
  unreleased = ["- 2026-09-10: **A no-bump change.** It adds nothing to the product."],
  sections = SECTIONS,
  tail = "",
} = {}) {
  let s =
    `# Changelog\n\nAll notable changes are documented in this file.\n\n` +
    `The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project\n` +
    `adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n`;
  if (unreleased !== null) {
    s += `## [Unreleased]\n\n<!-- guidance comment\n- a hyphen line inside it is not an entry\n-->\n\n### Changed\n\n`;
    s += unreleased.map((e) => `${e}\n`).join("\n") + "\n";
  }
  for (const sec of sections) {
    s += `${sec.heading ?? `## [${sec.v}] - ${sec.d}`}\n\n### Fixed\n\n`;
    s += sec.entries.map((e) => `${e}\n`).join("\n") + "\n";
  }
  return s + tail;
}

const SECTIONS = [
  { v: "3.0.2", d: "2026-09-09", entries: ["- **Shipped the fix** (`SKILLS_VERSION` 3.0.1 → **3.0.2**)."] },
  { v: "3.0.1", d: "2026-09-08", entries: ["- **Shipped the earlier fix** (3.0.1)."] },
];

function fixture({ version = "3.0.2", text, omitVersionFile = false, omitChangelog = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-svrec-"));
  if (!omitVersionFile) writeFileSync(join(dir, "SKILLS_VERSION"), version);
  if (!omitChangelog) writeFileSync(join(dir, "CHANGELOG.md"), text ?? changelog());
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

// ── The happy paths ───────────────────────────────────────────────────────────────────────────────

test("GREEN: the no-bump shape — dated [Unreleased] entries above SKILLS_VERSION's section", () => {
  withFixture({}, (dir) => {
    const { code, out } = run([dir]);
    assert.equal(code, 0, out);
    assert.match(out, /SKILLS-VERSION-RECORDED: GREEN/);
    assert.match(out, /"## \[3\.0\.2\] - 2026-09-09"/);
  });
});

test("GREEN: [Unreleased] absent, or present with no entries (an emptied one may stay or go)", () => {
  withFixture({ text: changelog({ unreleased: null }) }, (dir) => assert.equal(run([dir]).code, 0));
  withFixture({ text: changelog({ unreleased: [] }) }, (dir) => assert.equal(run([dir]).code, 0));
});

test("GREEN survives a trailing newline in SKILLS_VERSION (the normal committed shape)", () => {
  withFixture({ version: "3.0.2\n" }, (dir) => assert.equal(run([dir]).code, 0));
});

test("✧ a version heading inside a FENCE, indented with its entry, is not a section (it cannot become the newest)", () => {
  const sections = [
    {
      v: "3.0.2",
      d: "2026-09-09",
      entries: ["- An entry quoting a heading:\n\n  ```markdown\n  ## [9.9.9] - 2026-01-01\n  ## Notes\n  ```"],
    },
  ];
  withFixture({ text: changelog({ sections }) }, (dir) => {
    const { code, out } = run([dir]);
    assert.equal(code, 0, `a fenced heading must be neither NOT_NEWEST nor UNKNOWN_HEADING: ${out}`);
  });
});

test("✧ a COLUMN-0 heading after an in-entry fence opener IS a section — GitHub renders it (review finding 1)", () => {
  // The premise the test above once asserted without indentation was wrong: a column-0 line ends the list
  // item and the fence with it. A no-bump PR that hid a "newest version" this way passed before the fix.
  const text = changelog({ unreleased: ["- 2026-09-10: an entry\n\n  ```\n## [9.9.9] - 2026-09-10"] });
  const types = checkChangelogText(text, "3.0.2", { now: NOW }).findings.map((f) => f.type);
  assert.ok(types.includes("NOT_NEWEST"), types.join());
});

test("✧ a backtick 'fence' whose info string holds a backtick is inline code, and hides nothing (review finding 5)", () => {
  const text = changelog({ unreleased: ["- 2026-09-10: see\n```x`y``` inline"] });
  assert.equal(checkChangelogText(text, "3.0.2", { now: NOW }).ok, true);
});

// ── ✧ The refusal-state ENUMERATION (L29) — iterated, never hand-listed ───────────────────────────

/**
 * One fixture per refusal state, each triggering exactly that state, plus the marker phrase its OWN
 * remedy carries. The per-branch remedy assertion below is L27's prescribed form: present in its own
 * case AND absent from the others.
 */
const BRANCH_CASES = {
  BAD_TARGET: { make: (dir) => join(dir, "no-such-subdir"), marker: /pass a path to a directory/ },
  MISSING_VERSION: { opts: { omitVersionFile: true }, marker: /restore SKILLS_VERSION/ },
  ENUM_ERROR: { opts: { version: "   \n" }, marker: /make SKILLS_VERSION a / },
  MISSING_CHANGELOG: { opts: { omitChangelog: true }, marker: /create CHANGELOG\.md/ },
  EMPTY_CHANGELOG: { opts: { text: "   \n\t\n" }, marker: /write the changelog's entries/ },
  UNRECORDED: { opts: { text: changelog({ sections: [SECTIONS[1]] }) }, marker: /open a section headed exactly/ },
  NOT_NEWEST: {
    opts: { text: changelog({ sections: [{ v: "3.0.3", d: "2026-09-10", entries: ["- A newer one."] }, ...SECTIONS] }) },
    marker: /the first version section must be SKILLS_VERSION's/,
  },
  UNKNOWN_HEADING: { opts: { text: changelog({ tail: "## Notes\n\nfree prose\n" }) }, marker: /a level-2 heading must be exactly/ },
  UNRELEASED_NOT_FIRST: {
    opts: {
      text: changelog({
        unreleased: null,
        sections: [SECTIONS[0], { heading: "## [Unreleased]", entries: ["- 2026-09-10: late"] }, SECTIONS[1]],
      }),
    },
    marker: /keep exactly one "## \[Unreleased\]" heading/,
  },
  OUT_OF_ORDER: {
    opts: {
      text: changelog({
        sections: [SECTIONS[0], { v: "3.0.1", d: "2026-09-09", entries: ["- x"] }, { v: "3.0.0", d: "2026-09-10", entries: ["- y"] }],
      }),
    },
    marker: /order version sections newest first/,
  },
  BAD_DATE: { opts: { text: changelog({ unreleased: ["- 2026-02-31: impossible"] }) }, marker: /write a real calendar date/ },
  FUTURE_DATE: {
    opts: { text: changelog({ unreleased: ["- 2099-01-01: from the future"] }) },
    marker: /use the date you are writing the entry on/,
  },
  UNDATED_ENTRY: {
    opts: { text: changelog({ unreleased: ["- **No date on this one.**"] }) },
    marker: /start every top-level \[Unreleased\] entry/,
  },
  STALE_UNRELEASED: {
    opts: { text: changelog({ unreleased: ["- 2026-09-01: written before the bump"] }) },
    marker: /a bump opened a newer section without moving this entry/,
  },
  DUPLICATE_ENTRY: {
    opts: { text: changelog({ sections: [SECTIONS[0], { v: "3.0.1", d: "2026-09-08", entries: [SECTIONS[0].entries[0]] }] }) },
    marker: /remove the copy that is not in its original place/,
  },
};

test("✧ NON-VACUITY + CLOSURE: every exported REFUSAL_STATE has a case, and there are no extras (L29/L34)", () => {
  assert.ok(REFUSAL_STATES.length >= 15, `the refusal set must be populated, got ${REFUSAL_STATES.length}`);
  assert.deepEqual(
    [...REFUSAL_STATES].sort(),
    Object.keys(BRANCH_CASES).sort(),
    "the checker's exported enumeration and this file's case table must be the SAME set — a member added to one and not the other is the L36 defect"
  );
});

function outputOf(state) {
  const c = BRANCH_CASES[state];
  const dir = fixture(c.opts ?? {});
  try {
    return run([c.make ? c.make(dir) : dir]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const OUTPUTS = Object.fromEntries(REFUSAL_STATES.map((s) => [s, outputOf(s)]));

for (const state of REFUSAL_STATES) {
  test(`✧ ${state} → exit 1, named, alone, and no stack trace`, () => {
    const { code, out } = OUTPUTS[state];
    assert.equal(code, 1, `${state} must be RED: ${out}`);
    assert.match(out, new RegExp(`\\[${state}\\]`));
    const others = REFUSAL_STATES.filter((s) => s !== state && new RegExp(`\\[${s}\\]`).test(out));
    assert.deepEqual(others, [], `${state}'s fixture must trigger that state alone`);
    assert.doesNotMatch(out, /at .*\.mjs:\d+/, `${state} must not surface as a thrown stack`);
  });

  test(`✧ ${state}'s remedy is REACHABLE for it and ABSENT from every other branch (L27)`, () => {
    assert.match(OUTPUTS[state].out, BRANCH_CASES[state].marker, `${state} must print its own remedy`);
    const others = REFUSAL_STATES.filter((s) => s !== state);
    assert.ok(others.length >= 14, "the 'other branches' set must be non-empty (L34)");
    for (const other of others) {
      assert.doesNotMatch(OUTPUTS[other].out, BRANCH_CASES[state].marker, `${other} must NOT print ${state}'s remedy`);
    }
  });
}

// ── ✧ Scenarios the plan names ────────────────────────────────────────────────────────────────────

test("✧ a bump that FORGOT to move [Unreleased] across days → STALE_UNRELEASED", () => {
  const text = changelog({
    unreleased: ["- 2026-09-10: merged before the bump, never moved"],
    sections: [{ v: "3.0.3", d: "2026-09-12", entries: ["- the bump's own entry"] }, ...SECTIONS],
  });
  const res = checkChangelogText(text, "3.0.3", { now: NOW });
  assert.deepEqual(
    res.findings.map((f) => f.type),
    ["STALE_UNRELEASED"]
  );
});

test("✧ the SAME-DAY leftover passes this check by design — the per-PR check's UNRELEASED_NOT_MOVED owns it", () => {
  // Stated as a test so the gap is a recorded fact rather than a surprise: STALE_UNRELEASED is a date
  // proxy, and a same-day bump that forgets to move an entry is invisible to it.
  const text = changelog({
    unreleased: ["- 2026-09-12: merged the same day as the bump"],
    sections: [{ v: "3.0.3", d: "2026-09-12", entries: ["- the bump"] }, ...SECTIONS],
  });
  assert.equal(checkChangelogText(text, "3.0.3", { now: NOW }).ok, true);
});

test("✧ re-dating a stale entry IN PLACE is the repair, and it turns the check GREEN", () => {
  const stale = changelog({ unreleased: ["- 2026-09-01: X"] });
  const repaired = changelog({ unreleased: ["- 2026-09-23: X"] });
  assert.deepEqual(
    checkChangelogText(stale, "3.0.2", { now: NOW }).findings.map((f) => f.type),
    ["STALE_UNRELEASED"]
  );
  assert.equal(checkChangelogText(repaired, "3.0.2", { now: NOW }).ok, true);
});

test("✧ the timezone allowance is exactly one day: now+1 is GREEN, now+2 is FUTURE_DATE", () => {
  assert.equal(FUTURE_ALLOWANCE_DAYS, 1);
  const at = (d) => checkChangelogText(changelog({ unreleased: [`- ${d}: x`] }), "3.0.2", { now: NOW });
  assert.equal(at("2026-09-24").ok, true, "an author at UTC+14 may write tomorrow's UTC date");
  assert.deepEqual(
    at("2026-09-25").findings.map((f) => f.type),
    ["FUTURE_DATE"]
  );
});

test("✧ a future or impossible HEADING date is refused too, not only an entry's", () => {
  const future = changelog({ sections: [{ v: "3.0.2", d: "2099-01-01", entries: ["- x"] }] });
  const bad = changelog({ sections: [{ v: "3.0.2", d: "2026-02-30", entries: ["- x"] }] });
  assert.ok(checkChangelogText(future, "3.0.2", { now: NOW }).findings.some((f) => f.type === "FUTURE_DATE"));
  assert.ok(checkChangelogText(bad, "3.0.2", { now: NOW }).findings.some((f) => f.type === "BAD_DATE"));
});

test("✧ a DUPLICATE is judged by BODY: a dated copy of a released entry is still a duplicate", () => {
  const text = changelog({ unreleased: [`- 2026-09-10: ${SECTIONS[0].entries[0].slice(2)}`] });
  assert.deepEqual(
    checkChangelogText(text, "3.0.2", { now: NOW }).findings.map((f) => f.type),
    ["DUPLICATE_ENTRY"]
  );
});

test("✧ a duplicate version heading is OUT_OF_ORDER (not strictly descending)", () => {
  const text = changelog({ sections: [SECTIONS[0], { v: "3.0.2", d: "2026-09-09", entries: ["- again"] }, SECTIONS[1]] });
  assert.ok(checkChangelogText(text, "3.0.2", { now: NOW }).findings.some((f) => f.type === "OUT_OF_ORDER"));
});

test("✧ structural findings are COLLECTED, so one run shows every defect", () => {
  const text = changelog({ unreleased: ["- undated", "- 2099-01-01: future"], tail: "## Notes\n" });
  const types = checkChangelogText(text, "3.0.2", { now: NOW }).findings.map((f) => f.type);
  assert.deepEqual([...types].sort(), ["FUTURE_DATE", "UNDATED_ENTRY", "UNKNOWN_HEADING"]);
});

test("✧ a flood of one state is CAPPED in the report, and the count of the rest is stated (P2)", () => {
  const flood = Array.from({ length: 60 }, (_, i) => `- undated ${i}`);
  withFixture({ text: changelog({ unreleased: flood }) }, (dir) => {
    const { code, out } = run([dir]);
    assert.equal(code, 1);
    assert.equal((out.match(/^- \[UNDATED_ENTRY\] CHANGELOG\.md:/gm) ?? []).length, MAX_FINDINGS_PER_STATE);
    assert.match(out, new RegExp(`\\[UNDATED_ENTRY\\] … and ${60 - MAX_FINDINGS_PER_STATE} more`));
  });
});

test("✧ an ESC inside a quoted heading or entry is escaped in stdout, never emitted raw (P2)", () => {
  const ESC = String.fromCharCode(27);
  withFixture({ text: changelog({ unreleased: [`- ${ESC}[31mPWNED${ESC}[0m`], tail: `## ${ESC}[2Jcleared\n` }) }, (dir) => {
    const { code, out } = run([dir]);
    assert.equal(code, 1);
    assert.ok(!out.includes(ESC), "the ESC must not reach stdout raw");
    assert.match(out, /\\u001b/);
  });
});

// ── ✧ UNRECORDED still names what the author can SEE (L27) ──────────────────────────────────────────

/** Renderings of the version inside ENTRY TEXT. None of them makes a section — and the message says so. */
const TEXT_RENDERINGS = [
  { name: "back-ticked", text: "bumped to `3.0.2` in this increment" },
  { name: "bold", text: "`SKILLS_VERSION` 3.0.1 -> **3.0.2**, patch" },
  { name: "bare in prose", text: "the 3.0.2 line carries the fix" },
  { name: "a heading-shaped string inside an entry", text: "## [3.0.2] - 2026-09-09" },
  { name: "inside a shields badge URL", text: "https://img.shields.io/badge/pharn-3.0.2-blue" },
];

test("✧ NON-VACUITY: the rendering table is non-empty before anything iterates it (L34)", () => {
  assert.ok(TEXT_RENDERINGS.length >= 5);
});

for (const r of TEXT_RENDERINGS) {
  test(`✧ a version named ${r.name} in entry text is NOT a record, and the message counts it`, () => {
    const text = changelog({ unreleased: [`- 2026-09-10: ${r.text}`], sections: [SECTIONS[1]] });
    withFixture({ text }, (dir) => {
      const { code, out } = run([dir]);
      assert.equal(code, 1, `${r.name} must not count as a section: ${out}`);
      assert.match(out, /\[UNRECORDED\]/);
      assert.match(out, /as a version token in entry text, which does not count/);
    });
  });
}

const NEAR_MISS_CASES = [
  { name: "inside a LONGER patch number", version: "3.0.2", text: "shipped in `3.0.20` and nothing else" },
  { name: "inside a LONGER major number", version: "3.0.2", text: "shipped in `13.0.2` and nothing else" },
  { name: "as the PREFIX of a four-part version", version: "3.0.2", text: "shipped in `3.0.2.1` and nothing else" },
  { name: "behind a `v` prefix", version: "3.0.2", text: "pinned at `v3.0.2` in a third-party action" },
  { name: "the live semver-URL look-alike", version: "2.0.0", text: "see https://semver.org/spec/v2.0.0.html for the scheme" },
];

test("✧ NON-VACUITY: the near-miss table is non-empty before anything iterates it (L34)", () => {
  assert.ok(NEAR_MISS_CASES.length >= 5);
});

for (const c of NEAR_MISS_CASES) {
  test(`✧ NEAR MISS — ${c.name} → UNRECORDED, and the message NAMES the near miss`, () => {
    const text = changelog({ unreleased: [`- 2026-09-10: ${c.text}`], sections: [{ v: "1.0.0", d: "2026-06-23", entries: ["- first"] }] });
    withFixture({ version: c.version, text }, (dir) => {
      const { code, out } = run([dir]);
      assert.equal(code, 1);
      assert.match(out, /\[UNRECORDED\]/);
      assert.match(out, /inside a longer version or after a letter/);
    });
  });
}

test("✧ DISCRIMINATION: two changelogs identical but for the newest heading's version give exit 1 and exit 0", () => {
  const other = changelog({ sections: [{ v: "3.0.3", d: "2026-09-09", entries: ["- x"] }, SECTIONS[1]] });
  const own = changelog({ sections: [{ v: "3.0.2", d: "2026-09-09", entries: ["- x"] }, SECTIONS[1]] });
  withFixture({ text: other }, (dir) => assert.equal(run([dir]).code, 1));
  withFixture({ text: own }, (dir) => assert.equal(run([dir]).code, 0));
});

test("✧ the near-miss quotes in an UNRECORDED message are capped (P2)", () => {
  const flood = Array.from({ length: 200 }, (_, i) => `- 2026-09-10: pinned at v3.0.2 in dep ${i}`);
  withFixture({ text: changelog({ unreleased: flood, sections: [SECTIONS[1]] }) }, (dir) => {
    const { code, out } = run([dir]);
    assert.equal(code, 1);
    assert.match(out, /occurs 200 time\(s\) inside a longer version/);
    const unrecorded = out.split("\n").find((l) => l.startsWith("    SKILLS_VERSION is"));
    assert.ok(unrecorded, "the UNRECORDED problem line must be present");
    assert.ok((unrecorded.match(/"(?:[^"\\]|\\.)*"/g) ?? []).length <= MAX_NEAR_MISSES + 2);
  });
});

// ── ✧ SKILLS_VERSION guard (L14: the clean-scalar guard PRECEDES the shape regex) ─────────────────

test("✧ SKILLS_VERSION multi-line → ENUM_ERROR (not a silent first-line read)", () => {
  withFixture({ version: "3.0.2\n9.9.9\n" }, (dir) => assert.match(run([dir]).out, /\[ENUM_ERROR\]/));
});

test("✧ SKILLS_VERSION bearing a control character → ENUM_ERROR", () => {
  withFixture({ version: `3.0.2${String.fromCharCode(7)}` }, (dir) => assert.match(run([dir]).out, /\[ENUM_ERROR\]/));
});

test("✧ SKILLS_VERSION not <major>.<minor>.<patch> → ENUM_ERROR", () => {
  withFixture({ version: "3.0" }, (dir) => assert.match(run([dir]).out, /\[ENUM_ERROR\]/));
});

test("✧ a pre-release SKILLS_VERSION is REFUSED, so both version gates RED on it (the deliberate divergence)", () => {
  withFixture({ version: "3.1.0-rc.1" }, (dir) => {
    const { code, out } = run([dir]);
    assert.equal(code, 1);
    assert.match(out, /\[ENUM_ERROR\]/);
    assert.doesNotMatch(out, /\[UNSUPPORTED\]/, "this checker deliberately has no UNSUPPORTED state");
  });
});

test("✧ when BOTH inputs are broken, the SKILLS_VERSION refusal wins deterministically", () => {
  withFixture({ version: "nonsense", omitChangelog: true }, (dir) => {
    const { out } = run([dir]);
    assert.match(out, /\[ENUM_ERROR\]/);
    assert.doesNotMatch(out, /\[MISSING_CHANGELOG\]/);
  });
});

// ── ✧ Unit-level guards ───────────────────────────────────────────────────────────────────────────

test("✧ FAIL-CLOSED: an empty needle can never be searched for", () => {
  assert.deepEqual(findOccurrences("anything at all", ""), { recorded: [], nearMisses: [] });
  assert.deepEqual(findOccurrences("anything at all", null), { recorded: [], nearMisses: [] });
  assert.deepEqual(findOccurrences(null, "3.0.2"), { recorded: [], nearMisses: [] });
});

test("✧ isRecordBoundary: the rule holds at both edges of the buffer and around punctuation", () => {
  assert.equal(isRecordBoundary("3.0.2", 0, 5), true);
  assert.equal(isRecordBoundary("`3.0.2`", 1, 5), true);
  assert.equal(isRecordBoundary("3.0.20", 0, 5), false);
  assert.equal(isRecordBoundary("13.0.2", 1, 5), false);
  assert.equal(isRecordBoundary("v3.0.2", 1, 5), false);
  assert.equal(isRecordBoundary("3.0.2.1", 0, 5), false);
  assert.equal(isRecordBoundary("ends at 3.0.2.", 8, 5), true);
  assert.equal(isRecordBoundary("x.3.0.2", 2, 5), false);
});

test("✧ renderContext bounds and escapes its output", () => {
  const long = `${"x".repeat(500)}3.0.2${"y".repeat(500)}`;
  const ctx = renderContext(long, 500, 5);
  assert.ok(ctx.length < 200);
  assert.equal(ctx.startsWith('"'), true);
});

test("✧ isCleanScalar's real contribution is a LENGTH BOUND the shape regex does not have", () => {
  assert.equal(VERSION_RE.test(`${"9".repeat(5000)}.0.0`), true);
  assert.equal(isCleanScalar(`${"9".repeat(5000)}.0.0`), false);
  assert.equal(isCleanScalar("3.0.2"), true);
  assert.equal(isCleanScalar(""), false);
  assert.equal(isCleanScalar("x".repeat(MAX_LEN + 1)), false);
  assert.equal(isCleanScalar(null), false);
});

test("✧ the token scan is linear enough — a large changelog with many hits does not blow up", () => {
  const started = process.hrtime.bigint();
  const { recorded } = findOccurrences("3.0.2 ".repeat(50000), "3.0.2");
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  assert.equal(recorded.length, 50000);
  assert.ok(ms < 2000, `scan took ${ms}ms`);
});

// ── ✧ COPY-PAIR PIN (L31/L35) — something must RANGE OVER the two copies ──────────────────────────

test("✧ the constants shared with check-version-badge.mjs AGREE (the deliberate copy-pair)", () => {
  assert.equal(VERSION_RE.source, BADGE_VERSION_RE.source);
  assert.equal(VERSION_RE.flags, BADGE_VERSION_RE.flags);
  assert.equal(MAX_LEN, BADGE_MAX_LEN);
  const probes = ["3.0.2", "", "x".repeat(65), "3.02", "  3.0.2  ", "3.1.0-rc.1"];
  assert.ok(probes.length >= 6);
  for (const p of probes) assert.equal(isCleanScalar(p), badgeIsCleanScalar(p), JSON.stringify(p));
});

test("✧ the DIVERGENCE is deliberate and stated: this checker has no UNSUPPORTED state", () => {
  assert.equal(REFUSAL_STATES.includes("UNSUPPORTED"), false);
  assert.equal(VERSION_RE.test("3.1.0-rc.1"), false);
  assert.match(readFileSync(join(HERE, "check-version-badge.mjs"), "utf8"), /UNSUPPORTED/);
});

// ── ✧ WIRING PINS — the checker guards nothing unless something invokes it ─────────────────────────

test("✧ package.json wires check:changelog to this checker, and `check` runs check:changelog", () => {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.match(pkg.scripts["check:changelog"] ?? "", /check-skills-version-recorded\.mjs/);
  assert.match(pkg.scripts.check, /check:changelog(?!-)/, "npm run check must run check:changelog itself");
});

test("✧ CI actually INVOKES the record check, and its step is not disabled by an `if:` (L2)", () => {
  // ci.yml runs each script as its own step, never `npm run check`, so a checker folded only into
  // `check` would never fire on a pull request. The `if:` half matters: an edit to `if: false` would
  // leave the invocation present and the guard dead. "The wiring is pinned" NEVER means "CI ran it".
  // NAMED RESIDUAL `ci-if-guard-enumeration`: several test files hard-code this guard string with
  // nothing ranging over them — not extracted, because the string has never drifted (P7).
  const ci = readFileSync(join(REPO, ".github", "workflows", "ci.yml"), "utf8");
  const step = ci.match(/^ {6}- name: [^\n]*\n(?: {8}[^\n]*\n)*? {8}run: npm run check:changelog[ \t]*$/m);
  assert.ok(step, "ci.yml must contain a step whose `run:` is `npm run check:changelog`");
  assert.match(step[0], /^ {8}if: \$\{\{ always\(\) && steps\.install\.outcome == 'success' \}\}$/m);
});

// ── The real repo, and the defaults (L41/L52) ─────────────────────────────────────────────────────

test("✧ DEFAULT `now`: the CLI against this repo injects no clock, and is GREEN on the real one", () => {
  const { code, out } = run([REPO]);
  assert.equal(code, 0, out);
});

test("✧ DEFAULT `targetDir`: run from the repo root with no argument, the CLI reads `.`", () => {
  const { code, out } = run([], { cwd: REPO });
  assert.equal(code, 0, out);
  assert.match(out, /SKILLS-VERSION-RECORDED: GREEN/);
});

test("✧ NON-VACUITY against the real repo: the GREEN rests on SKILLS_VERSION heading the newest section", () => {
  const version = readFileSync(join(REPO, "SKILLS_VERSION"), "utf8").trim();
  const { headings } = parseChangelog(readFileSync(join(REPO, "CHANGELOG.md"), "utf8"));
  const first = headings.find((h) => h.kind === "VERSION");
  assert.ok(first, "the live CHANGELOG must have a version section (L34)");
  assert.equal(first.version, version);
});

test("✧ THIS PR's recorded head excerpt is GREEN at 6.12.1 on the day it was written", () => {
  const head = readFileSync(join(HERE, "test-fixtures", "changelog-per-pr", "head.md"), "utf8");
  const res = checkChangelogText(head, "6.12.1", { now: new Date("2026-09-23T12:00:00Z") });
  assert.deepEqual(res.findings, []);
  assert.ok(res.unreleased >= 2, "the excerpt carries this PR's entry and #249's, both dated");
});

// ── The pure API and the in-process CLI ───────────────────────────────────────────────────────────

test("checkSkillsVersionRecorded is pure — it returns a verdict rather than exiting", () => {
  withFixture({ text: changelog({ sections: [SECTIONS[1]] }) }, (dir) => {
    const res = checkSkillsVersionRecorded(dir, { now: NOW });
    assert.equal(res.ok, false);
    assert.equal(res.findings[0].type, "UNRECORDED");
    assert.equal(res.version, "3.0.2");
  });
});

test("main() runs in-process: GREEN exit 0 and RED exit 1, through the injected writer", () => {
  withFixture({}, (dir) => {
    const green = runIn([dir]);
    assert.equal(green.code, 0);
    assert.match(green.out, /GREEN/);
  });
  withFixture({ text: changelog({ unreleased: ["- undated"] }) }, (dir) => {
    const red = runIn([dir]);
    assert.equal(red.code, 1);
    assert.match(red.out, /\[UNDATED_ENTRY\]/);
    assert.match(red.out, /never verifies that an entry is correct/);
  });
});

test("✧ a non-directory target is a NAMED refusal, never a crash and never a silent GREEN", () => {
  withFixture({}, (dir) => {
    const { code, out } = run([join(dir, "SKILLS_VERSION")]);
    assert.equal(code, 1);
    assert.match(out, /\[BAD_TARGET\]/);
  });
});

test("✧ a target that is an EMPTY directory refuses on the version file, in precedence order", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-svrec-empty-"));
  mkdirSync(join(dir, "sub"), { recursive: true });
  try {
    assert.match(run([dir]).out, /\[MISSING_VERSION\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ BAD_TARGET: an unreadable/invalid target RETURNS a verdict object, never throws", () => {
  for (const bad of [undefined, null, "", 42, {}, join(tmpdir(), "pharn-nope-" + Date.now()), "\0invalid"]) {
    let v;
    assert.doesNotThrow(() => {
      v = checkSkillsVersionRecorded(bad);
    });
    assert.equal(v.ok, false);
    assert.equal(v.findings[0].type, "BAD_TARGET");
  }
});
