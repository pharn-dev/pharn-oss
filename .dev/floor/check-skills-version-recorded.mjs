#!/usr/bin/env node
// .dev/floor/check-skills-version-recorded.mjs — the CHANGELOG repo-state checker (build apparatus).
//
// WHAT THIS FILE OWNS NOW, and why it keeps its name. It began as "is SKILLS_VERSION recorded somewhere in
// CHANGELOG.md" and, since `changelog-per-pr`, it owns the whole CHANGELOG REPO-STATE convention: one
// dated section per version, in order, the newest one being SKILLS_VERSION's, and a dated, unique
// `[Unreleased]`. That is still ONE axis of change (P3) — "the shape the committed CHANGELOG must have" —
// and the name is kept because its package.json script (`check:changelog`), its CI step and their wiring
// pins all key on it; renaming would churn three invokers for no behaviour. Its sibling
// `check-changelog-entry.mjs` owns the OTHER axis: what one PR may change between a base and a head.
//
// The GUARANTEE (P0, ARCHITECTURE §2 primitive #3 — enum/regex), read through the shared grammar in
// `changelog-core.mjs`:
//   - the FIRST `## [X.Y.Z] - YYYY-MM-DD` heading is SKILLS_VERSION's;
//   - version headings are strictly descending, and their dates never increase downward;
//   - every level-2 ATX heading is exactly `## [Unreleased]` or that version form — a CLOSED set, so a
//     variant spelling is RED rather than silently not-a-section (lessons-learned L36);
//   - `## [Unreleased]`, when present, is the first level-2 heading, and there is only one;
//   - every heading date, and every `[Unreleased]` entry's date prefix, is a real calendar date no later
//     than the checker's UTC date plus one day (the timezone allowance — an author at UTC+14 writes
//     tomorrow's UTC date);
//   - every top-level `[Unreleased]` entry carries that date prefix (the date, a colon and a space), and
//     none is dated earlier than the newest version heading — which is what a bump that FORGOT to move
//     `[Unreleased]` into its new section leaves behind;
//   - no two top-level entries anywhere in the file have the same body (the text after any date prefix).
// Headings and entries are recognized only outside fences and HTML comments. ZERO LLM.
//
// TIME-MONOTONE BY CONSTRUCTION: every date is compared either with `now` (which only moves forward) or
// with another date in the same file. A GREEN tree cannot turn RED by waiting, which matters because CI
// runs this with the runner's clock. A MERGE can still turn `main` RED — see the known costs in
// CONTRIBUTING.md — and the repair is to re-date the stale `[Unreleased]` entry in place.
//
// The refusal states — the CLOSED set, exported as REFUSAL_STATES so the tests iterate it rather than
// asserting whichever member was in front of the author (lessons-learned L29). Input refusals first, in
// precedence order; then the structural states, which are COLLECTED so one run shows every defect:
//
//   - BAD_TARGET           : the target argument is absent, missing, or not a directory
//   - MISSING_VERSION      : SKILLS_VERSION is absent or unreadable
//   - ENUM_ERROR           : SKILLS_VERSION is not a clean, single-line `<major>.<minor>.<patch>` scalar
//   - MISSING_CHANGELOG    : CHANGELOG.md is absent or unreadable
//   - EMPTY_CHANGELOG      : CHANGELOG.md holds no non-whitespace bytes
//   - UNRECORDED           : no version heading names SKILLS_VERSION (the message still counts how often
//                            the string occurs as a token in entry text, so an author who can SEE it is
//                            told why that does not count — L27)
//   - NOT_NEWEST           : SKILLS_VERSION's heading exists but is not the first version heading
//   - UNKNOWN_HEADING      : a level-2 heading is neither `[Unreleased]` nor the version form
//   - UNRELEASED_NOT_FIRST : an `[Unreleased]` heading is not the first level-2 heading (a second one too)
//   - OUT_OF_ORDER         : version headings not strictly descending (a duplicate lands here), or a date
//                            increases downward
//   - BAD_DATE             : a heading date or an `[Unreleased]` date prefix is not a real calendar date
//   - FUTURE_DATE          : such a date is later than today (UTC) plus one day
//   - UNDATED_ENTRY        : a top-level `[Unreleased]` entry has no date prefix
//   - STALE_UNRELEASED     : an `[Unreleased]` entry is dated earlier than the newest version heading
//   - DUPLICATE_ENTRY      : two top-level entries share a body
// Any of these → RED (exit 1). Clean → GREEN (exit 0). Fail-closed throughout (P5): no version heading at
// all is UNRECORDED, never a vacuous GREEN (lessons-learned L34).
//
// WHY THIS EXISTS AT ALL — the ORIGINAL trigger (P7, measured, not inflated; kept as the record it is).
// Two commits shipped product-surface bytes with no SKILLS_VERSION bump and no CHANGELOG entry (`6c5ae8e`,
// touching `pharn/ARCHITECTURE.md` alone; `e4e8529`, changing `pharn/floor/check-plan-lessons.mjs` and two
// `pharn-*` commands). Then `f71f501` (PR #188) bumped `3.0.1 → 3.0.2`, edited CHANGELOG.md in the same
// diff, and recorded the string `3.0.2` NOWHERE — verified against that commit's own bytes:
// `git show f71f501:CHANGELOG.md | grep -c '3\.0\.2'` → `0`. That is the SECOND occurrence of one shape,
// the bar lessons-learned L20 sets. (`6c5ae8e` and `e4e8529` landed through PR #178, which DID add a
// CHANGELOG entry, and `f71f501` is exactly the UNRECORDED shape — neither is evidence for the per-PR
// check in `check-changelog-entry.mjs`, and neither is cited as such.)
//
// WHY IT GREW — the `changelog-per-pr` trigger (P7, stated at its true weight). pharn-cli installs the tip
// of `main`, and `pharn update` points users at CHANGELOG.md, so every merge to `main` is a release. Under
// the old rule a bump entry "may sit under `[Unreleased]`", and 140 entries across ~80 SKILLS_VERSION
// values accumulated in one block that could not say what shipped in which version. #249
// (`changelog-sectioning`) cut the file into one section per version once, and its own review predicted
// that "the first bump after this merge re-creates the old shape" because nothing held it. HONEST WEIGHT:
// the old rule ALLOWED that shape and the file followed it, so this is a rule change triggered by a measured
// deficiency and a predicted recurrence — not an L20 second failure of a discipline. DUPLICATE_ENTRY is
// weaker still: it answers no recorded escape. It closes a bypass that the plan's adversarial review found
// in the append-only rule the sibling checker introduces (a copy of an entry into a released section), and
// it is here, not only there, because only a repo-state check sees the duplicate after a direct push.
//
// L35 IS ANSWERED BEFORE L20 IS APPLIED, and the order matters. L35 says a sync check is the right remedy
// only once the second copy is established as one that MUST exist. It is answered YES here: the
// CHANGELOG's version heading is not a second copy of "what version is this", it is the JOIN KEY binding a
// version number to the description of what changed in it. Draining is unavailable — a changelog with no
// version keys is not a changelog. And the grammar is shared with the per-PR checker through
// `changelog-core.mjs` rather than copied, for the same reason.
//
// WHAT THIS DOES NOT GUARANTEE (P0 — say it, don't bury it):
//   - NOT that the bump was NEEDED, was the RIGHT SIZE, or covers the product bytes that changed. A newest
//     heading that agrees with SKILLS_VERSION certifies that the two stores AGREE, never that either is
//     right — they can be stale together (lessons-learned L43). L43's referent check (compare the product
//     paths changed since the last bump) is still UNBUILT, and this is not it.
//   - NOT that any entry is CORRECT, complete, or describes the right change.
//   - NOT that a date is TRUE. Dates are authored claims, never checked against git; a date is the day an
//     author wrote, not the day a merge happened.
//   - NOT that entries in version sections are dated — only `[Unreleased]` entries must be (the pre-#249
//     entries carry no prefix).
//   - NOT setext headings: a line underlined with `---` or `===` renders as a heading this grammar does not
//     see. There are none today; that is a narrowing, not a claim.
//   - NOT that this checker RUNS. The package.json and ci.yml wiring is pinned by
//     check-skills-version-recorded.test.mjs, and "the wiring is pinned" never means "CI executed it".
//
// NAMED RESIDUAL `changelog-record-position` — CLOSED here. It was deferred because pinning the version's
// POSITION "would re-pin a rendering, which is the L36 defect". What answers that is UNKNOWN_HEADING: the
// heading set is a CLOSURE over every level-2 heading, so a variant spelling of a version heading is a loud
// RED instead of a silent non-record. The position is now pinned (the first version heading), and the
// earlier "token anywhere" narrowing against lessons-learned L6 is gone: the version is read from its
// structured location, the heading.
//
// THE BOUNDARY RULE survives in one role: the UNRECORDED message. `findOccurrences` still counts complete
// version tokens in entry text (a character BEFORE that is not [0-9A-Za-z.], a character AFTER that is not
// a digit, a letter, or a `.` followed by a digit), and reports near misses, so a RED names what the author
// can see. It no longer decides the verdict.
//
// PRECEDENCE is deterministic: target, then SKILLS_VERSION, then CHANGELOG, then the structural states.
// Every quote of CHANGELOG text is length-capped and rendered through JSON.stringify: on a fork or an
// outside contributor's PR the file is attacker-influenced, so it is DATA on the way out too (P2).
//
// Usage:  node .dev/floor/check-skills-version-recorded.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only, fail-closed. Apparatus: never ships to a user install, so no SKILLS_VERSION bump.

import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseChangelog, isCalendarDate, compareVersions, utcDay, quote } from "./changelog-core.mjs";

/** The file that owns the version. Single source of truth; the CHANGELOG records it. */
export const VERSION_PATH = "SKILLS_VERSION";
/** The document that must record it. */
export const CHANGELOG_PATH = "CHANGELOG.md";

/**
 * The accepted version shape. Deliberately IDENTICAL to `check-version-badge.mjs`'s, and the two are a
 * deliberate second copy rather than a shared core or a sibling import — see COPY-PAIR below.
 */
export const VERSION_RE = /^\d+\.\d+\.\d+$/;
/** Upper bound on the version scalar. Generous for a version; bounds a pathological single-line input. */
export const MAX_LEN = 64;

/** Characters that, immediately BEFORE an occurrence, disqualify it as a complete version token. */
export const BEFORE_BAD_RE = /[0-9A-Za-z.]/;
/** Characters that, immediately AFTER an occurrence, disqualify it outright. */
export const AFTER_BAD_RE = /[0-9A-Za-z]/;

/** How much surrounding text a near-miss report quotes on each side. Bounded on purpose (P2). */
export const CONTEXT_RADIUS = 24;
/** How many near misses one report names. Bounded so a crafted CHANGELOG cannot flood a terminal (P2). */
export const MAX_NEAR_MISSES = 3;
/** How many findings of ONE state a report lists before summarising the rest (P2 — bounded output). */
export const MAX_FINDINGS_PER_STATE = 10;
/** The timezone allowance: a date may be at most this many days after the checker's UTC date. */
export const FUTURE_ALLOWANCE_DAYS = 1;

/**
 * The CLOSED set of non-GREEN outcomes. Exported so the test file can ITERATE it — L29: when a remedy
 * is quantified over a set, the enumeration is the deliverable, not an assertion written for whichever
 * member the author happened to be looking at.
 */
export const REFUSAL_STATES = [
  "BAD_TARGET",
  "MISSING_VERSION",
  "ENUM_ERROR",
  "MISSING_CHANGELOG",
  "EMPTY_CHANGELOG",
  "UNRECORDED",
  "NOT_NEWEST",
  "UNKNOWN_HEADING",
  "UNRELEASED_NOT_FIRST",
  "OUT_OF_ORDER",
  "BAD_DATE",
  "FUTURE_DATE",
  "UNDATED_ENTRY",
  "STALE_UNRELEASED",
  "DUPLICATE_ENTRY",
];

/**
 * One remedy per structural state — per finding, never a shared trailer (lessons-learned L27: a remedy
 * composed once for every branch is printed by branches it cannot help, and trains a bypass).
 */
const FIX = {
  UNRECORDED: (v) =>
    `open a section headed exactly "## [${v}] - YYYY-MM-DD" above the previous version's section, and move every [Unreleased] entry into it. A version named only inside entry text is not a section.`,
  NOT_NEWEST: (v) =>
    `the first version section must be SKILLS_VERSION's. Either SKILLS_VERSION ${JSON.stringify(v)} is behind a newer section above it, or a section was placed out of order — a reverted bump rolls FORWARD to a new version, it never restores an older number.`,
  UNKNOWN_HEADING: () =>
    `a level-2 heading must be exactly "## [Unreleased]" or "## [X.Y.Z] - YYYY-MM-DD" at column 0 with single spaces. Rename it, or make it a level-3 group heading (### Added, ### Fixed, ...).`,
  UNRELEASED_NOT_FIRST: () =>
    `keep exactly one "## [Unreleased]" heading, and put it above every version section (Keep a Changelog order).`,
  OUT_OF_ORDER: () =>
    `order version sections newest first: each version strictly lower than the one above it, each date no later than the one above it. Two sections for one version is a duplicate — merge them.`,
  BAD_DATE: () => `write a real calendar date as YYYY-MM-DD (the month and day must exist).`,
  FUTURE_DATE: () =>
    `use the date you are writing the entry on. A date more than one day after the checker's UTC date is refused; one day is the timezone allowance.`,
  UNDATED_ENTRY: () =>
    `start every top-level [Unreleased] entry with its authored date: "- YYYY-MM-DD: " (the date, a colon, then one space) before the text.`,
  STALE_UNRELEASED: () =>
    `a bump opened a newer section without moving this entry into it. If this PR is the bump, move the entry into the new section; if it is not, re-date the entry in place to today (an [Unreleased] entry may change its date and nothing else) — this is also what a PR rebased over a later bump must do.`,
  DUPLICATE_ENTRY: () =>
    `remove the copy that is not in its original place. An entry already released stays where it was released; a correction is a NEW entry, never a second copy of the old one.`,
};

/**
 * True iff `v` is a non-empty, length-bounded string containing NO control characters.
 *
 * This is the PRECONDITION, never the replacement, for the anchored shape regex — the
 * compose-don't-replace discipline of lessons-learned L14.
 *
 * (L14's stated MECHANISM is wrong and `check-version-badge.test.mjs` pins the correction: JavaScript
 * `$` without the `m` flag matches ONLY at end of input, so the trailing-newline hole L14 describes
 * does not exist. Its REMEDY — guard first, shape second — is right, and is what this follows.)
 */
export function isCleanScalar(v, max = MAX_LEN) {
  if (typeof v !== "string" || v.length === 0 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

/**
 * True iff the occurrence of a `len`-character version at index `i` in `text` stands as a COMPLETE
 * version token. See THE BOUNDARY RULE in the header.
 */
export function isRecordBoundary(text, i, len) {
  if (i > 0 && BEFORE_BAD_RE.test(text[i - 1])) return false;
  const after = text[i + len];
  if (after === undefined) return true; // end of input is a boundary
  if (AFTER_BAD_RE.test(after)) return false;
  if (after === "." && /[0-9]/.test(text[i + len + 1] ?? "")) return false;
  return true;
}

/**
 * Every occurrence of `version` in `text`, split into `recorded` (at a version-token boundary) and
 * `nearMisses` (present as a substring but NOT at a boundary). Pure; no I/O. FAIL-CLOSED on a degenerate
 * needle: an empty needle is a substring of every file, so it yields the empty result.
 */
export function findOccurrences(text, version) {
  const empty = { recorded: [], nearMisses: [] };
  if (typeof text !== "string" || typeof version !== "string" || version.length === 0) return empty;
  const recorded = [];
  const nearMisses = [];
  for (let i = text.indexOf(version); i !== -1; i = text.indexOf(version, i + 1)) {
    (isRecordBoundary(text, i, version.length) ? recorded : nearMisses).push(i);
  }
  return { recorded, nearMisses };
}

/** A bounded, ESCAPED quote of the text around index `i` (P2). */
export function renderContext(text, i, len) {
  const start = Math.max(0, i - CONTEXT_RADIUS);
  const end = Math.min(text.length, i + len + CONTEXT_RADIUS);
  return JSON.stringify(text.slice(start, end));
}

const finding = (type, file, problem, fix) => ({ ok: false, findings: [{ type, file, problem, fix }] });

/**
 * The pure core: check CHANGELOG text against an already-validated SKILLS_VERSION. `now` is injectable
 * for tests; its default is the real clock, and the CLI never overrides it.
 * Returns { ok, findings, version, newest, sections, unreleased, occurrences }.
 */
export function checkChangelogText(changelog, version, { now = new Date() } = {}) {
  const { headings, entries } = parseChangelog(changelog);
  const findings = [];
  const add = (type, line, problem, fix) =>
    findings.push({ type, file: line ? `${CHANGELOG_PATH}:${line}` : CHANGELOG_PATH, problem, fix });
  const maxDate = utcDay(now, FUTURE_ALLOWANCE_DAYS);
  const checkDate = (date, line, what) => {
    if (!isCalendarDate(date)) {
      add("BAD_DATE", line, `${what} is dated ${JSON.stringify(date)}, which is not a real calendar date.`, FIX.BAD_DATE());
      return false;
    }
    if (date > maxDate) {
      add(
        "FUTURE_DATE",
        line,
        `${what} is dated ${date}, later than ${maxDate} (the checker's UTC date plus ${FUTURE_ALLOWANCE_DAYS} day).`,
        FIX.FUTURE_DATE()
      );
      return false;
    }
    return true;
  };

  // ── headings: the closed set, [Unreleased] first, versions in order ──────────────────────────────
  const versions = headings.filter((h) => h.kind === "VERSION");
  headings.forEach((h, idx) => {
    if (h.kind === "UNKNOWN") {
      add(
        "UNKNOWN_HEADING",
        h.line,
        `the level-2 heading ${quote(h.text)} is neither [Unreleased] nor a version section.`,
        FIX.UNKNOWN_HEADING()
      );
    } else if (h.kind === "UNRELEASED" && idx > 0) {
      add("UNRELEASED_NOT_FIRST", h.line, `an [Unreleased] heading sits below ${quote(headings[0].text)}.`, FIX.UNRELEASED_NOT_FIRST());
    }
  });
  const dateOk = new Map(versions.map((h) => [h, checkDate(h.date, h.line, `the section ${quote(h.text)}`)]));
  for (let i = 1; i < versions.length; i++) {
    const [prev, cur] = [versions[i - 1], versions[i]];
    if (compareVersions(prev.version, cur.version) <= 0) {
      add(
        "OUT_OF_ORDER",
        cur.line,
        `version ${cur.version} sits below ${prev.version}; versions must be strictly descending.`,
        FIX.OUT_OF_ORDER()
      );
    } else if (dateOk.get(prev) && dateOk.get(cur) && cur.date > prev.date) {
      add(
        "OUT_OF_ORDER",
        cur.line,
        `${cur.version} is dated ${cur.date}, later than ${prev.version} above it (${prev.date}); dates must not increase downward.`,
        FIX.OUT_OF_ORDER()
      );
    }
  }

  // ── [Unreleased] entries: dated, real, not future, not stale ────────────────────────────────────
  const newest = versions[0] ?? null;
  const newestDate = newest && dateOk.get(newest) ? newest.date : null;
  let unreleased = 0;
  for (const e of entries) {
    if (e.sectionKind !== "UNRELEASED") continue;
    unreleased++;
    if (e.date === null) {
      add("UNDATED_ENTRY", e.line, `the [Unreleased] entry ${quote(e.text)} has no date prefix.`, FIX.UNDATED_ENTRY());
      continue;
    }
    if (!checkDate(e.date, e.line, `the [Unreleased] entry ${quote(e.text, 60)}`)) continue;
    if (newestDate && e.date < newestDate) {
      add(
        "STALE_UNRELEASED",
        e.line,
        `the [Unreleased] entry ${quote(e.text, 60)} is dated ${e.date}, earlier than the newest section ${quote(newest.text)}.`,
        FIX.STALE_UNRELEASED()
      );
    }
  }

  // ── uniqueness over entry bodies ────────────────────────────────────────────────────────────────
  const seen = new Map();
  for (const e of entries) {
    if (seen.has(e.body)) {
      add("DUPLICATE_ENTRY", e.line, `the entry ${quote(e.body, 60)} also appears at line ${seen.get(e.body)}.`, FIX.DUPLICATE_ENTRY());
    } else {
      seen.set(e.body, e.line);
    }
  }

  // ── the version record itself ───────────────────────────────────────────────────────────────────
  const occurrences = findOccurrences(changelog, version);
  const own = versions.find((h) => h.version === version);
  if (!own) {
    const { recorded, nearMisses } = occurrences;
    const shown = nearMisses.slice(0, MAX_NEAR_MISSES).map((i) => renderContext(changelog, i, version.length));
    const tokenNote =
      recorded.length === 0
        ? " It does not occur anywhere as a complete version token either."
        : ` The string does occur ${recorded.length} time(s) as a version token in entry text, which does not count: the version must head its own section.`;
    const nearNote =
      nearMisses.length === 0
        ? ""
        : ` It also occurs ${nearMisses.length} time(s) inside a longer version or after a letter, e.g. ${shown.join(", ")}.`;
    add(
      "UNRECORDED",
      null,
      `${VERSION_PATH} is ${JSON.stringify(version)} but no "## [${version}] - YYYY-MM-DD" section exists.${tokenNote}${nearNote}`,
      FIX.UNRECORDED(version)
    );
  } else if (newest !== own) {
    add(
      "NOT_NEWEST",
      own.line,
      `${VERSION_PATH} is ${JSON.stringify(version)}, but the first version section is ${quote(newest.text)}.`,
      FIX.NOT_NEWEST(version)
    );
  }

  return {
    ok: findings.length === 0,
    findings,
    version,
    newest: newest ? newest.text : null,
    sections: versions.length,
    unreleased,
    occurrences,
  };
}

/**
 * Check the target directory's SKILLS_VERSION against its CHANGELOG.md. Pure — no process exit.
 * Returns { ok, findings, version?, newest?, sections?, unreleased?, occurrences? }.
 */
export function checkSkillsVersionRecorded(targetDir, { now = new Date() } = {}) {
  // ── 0. The target itself (fail-closed). statSync INSIDE the try, never an existsSync/statSync pair: the
  // pair was a TOCTOU window, and statSync also throws on a metadata/permission error — either path threw
  // a stack trace past this named refusal. One atomic call, every failure mode lands on BAD_TARGET.
  let isDir;
  try {
    isDir = typeof targetDir === "string" && targetDir !== "" && statSync(targetDir).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    return finding(
      "BAD_TARGET",
      String(targetDir),
      `target dir not found, unreadable, or not a directory: ${JSON.stringify(String(targetDir))}`,
      `pass a path to a directory holding ${VERSION_PATH} and ${CHANGELOG_PATH} (default: the current directory).`
    );
  }

  // ── 1. SKILLS_VERSION first (deterministic precedence: its refusal wins over a CHANGELOG one) ──────
  let rawVersion;
  try {
    rawVersion = readFileSync(join(targetDir, VERSION_PATH), "utf8");
  } catch {
    return finding(
      "MISSING_VERSION",
      VERSION_PATH,
      "the version file is absent or unreadable",
      `restore ${VERSION_PATH}. There is no version to record until it exists, so adding a CHANGELOG entry cannot help here.`
    );
  }
  const version = rawVersion.trim();
  if (!isCleanScalar(version)) {
    return finding(
      "ENUM_ERROR",
      VERSION_PATH,
      `contents are not a clean single-line scalar (empty, over ${MAX_LEN} chars, multi-line, or control-character-bearing)`,
      `make ${VERSION_PATH} a single <major>.<minor>.<patch> line. A degenerate version is refused rather than searched for.`
    );
  }
  if (!VERSION_RE.test(version)) {
    return finding(
      "ENUM_ERROR",
      VERSION_PATH,
      `${JSON.stringify(version)} is not a <major>.<minor>.<patch> version`,
      `make ${VERSION_PATH} a <major>.<minor>.<patch> version. A pre-release (hyphen-bearing) value is refused here too — the sibling check-version-badge.mjs refuses it by name, because a shields badge cannot round-trip a literal "-".`
    );
  }

  // ── 2. The CHANGELOG ────────────────────────────────────────────────────────────────────────────
  let changelog;
  try {
    changelog = readFileSync(join(targetDir, CHANGELOG_PATH), "utf8");
  } catch {
    return finding(
      "MISSING_CHANGELOG",
      CHANGELOG_PATH,
      "the changelog is absent or unreadable",
      `create ${CHANGELOG_PATH}. There is no file to record ${JSON.stringify(version)} in until it exists.`
    );
  }
  if (changelog.trim() === "") {
    return finding(
      "EMPTY_CHANGELOG",
      CHANGELOG_PATH,
      "the changelog holds no non-whitespace bytes",
      `write the changelog's entries. A file with no content records nothing, so this is reported apart from UNRECORDED: the remedy is the whole document, not one version string.`
    );
  }

  // ── 3. The shape ────────────────────────────────────────────────────────────────────────────────
  return checkChangelogText(changelog, version, { now });
}

/** Render a verdict for a terminal. Findings are grouped by state and capped per state (P2). */
export function renderReport(res) {
  if (res.ok) {
    return (
      `SKILLS-VERSION-RECORDED: GREEN — ${CHANGELOG_PATH}'s newest section is ${JSON.stringify(res.newest)}, ` +
      `matching ${VERSION_PATH} ${JSON.stringify(res.version)}; ${res.sections} version section(s) in order; ` +
      `${res.unreleased} dated [Unreleased] entr(ies)\n`
    );
  }
  let out = `SKILLS-VERSION-RECORDED: RED — ${res.findings.length} finding(s)\n`;
  const perState = new Map();
  for (const f of res.findings) {
    const n = (perState.get(f.type) ?? 0) + 1;
    perState.set(f.type, n);
    if (n <= MAX_FINDINGS_PER_STATE) out += `- [${f.type}] ${f.file}\n    ${f.problem}\n    FIX: ${f.fix}\n`;
  }
  for (const [type, n] of perState) {
    if (n > MAX_FINDINGS_PER_STATE) out += `- [${type}] … and ${n - MAX_FINDINGS_PER_STATE} more\n`;
  }
  out +=
    `\nNOTE (P0): this checks the CHANGELOG's SHAPE and that its newest section agrees with ${VERSION_PATH}.\n` +
    `It never verifies that an entry is correct, or that a bump was needed or the right size.\n`;
  return out;
}

/** CLI entry. Returns the exit code; writes through `io.out` so tests can run it in-process. */
export function main(argv = process.argv.slice(2), io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(s));
  const target = argv[0] || ".";
  const res = checkSkillsVersionRecorded(target, io.now ? { now: io.now } : {});
  out(renderReport(res));
  return res.ok ? 0 : 1;
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare; see `.dev/floor/entry-point-guard.test.mjs` for the four failure modes.
if (import.meta.main) {
  process.exitCode = main();
}

// ── COPY-PAIR (L31/L35): why VERSION_RE / MAX_LEN / isCleanScalar are declared here, not imported ────
//
// L35's question is asked BEFORE the remedy, not after: must the second copy exist? Strictly, no — the
// three could be shared. Both alternatives are worse HERE, and the reasoning is recorded so a later
// reader can overturn it on evidence rather than re-derive it:
//
//   (a) importing them from `check-version-badge.mjs` is a LEAF -> LEAF import, the shape
//       ARCHITECTURE §4 forbids, and one with ZERO precedent in this repo: every floor import points at a
//       `*-core.mjs` BOTTOM, never at another checker. (`changelog-core.mjs` is such a bottom; the version
//       SHAPE is not a CHANGELOG-grammar fact, so it does not belong there either.)
//   (b) extracting a `version-core.mjs` means editing a WORKING guard for a second axis of change with
//       no triggering failure (P7).
//
// So: copy, and make something RANGE OVER the pair (L31). `check-skills-version-recorded.test.mjs`
// imports BOTH modules and pins both halves: every shared constant must AGREE, and the one deliberate
// DIVERGENCE is asserted as deliberate — this file has no `UNSUPPORTED` state, because a hyphen-bearing
// version is already rejected by the shared `VERSION_RE`.
