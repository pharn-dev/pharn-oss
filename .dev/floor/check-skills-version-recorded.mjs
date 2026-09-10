#!/usr/bin/env node
// .dev/floor/check-skills-version-recorded.mjs — the CHANGELOG version-record checker (build apparatus).
//
// The GUARANTEE (P0, ARCHITECTURE §2 primitive #3 — enum/regex): the trimmed, shape-validated
// SKILLS_VERSION scalar appears in CHANGELOG.md as a COMPLETE VERSION TOKEN. Both sides are read live,
// the needle comes from its own file, and the test is `indexOf` plus a character-class boundary check.
// ZERO LLM.
//
// The six refusal states — the CLOSED set, exported as REFUSAL_STATES so the tests iterate it rather
// than asserting whichever member was in front of the author (lessons-learned L29):
//
//   - BAD_TARGET        : the target argument is absent, missing, or not a directory
//   - MISSING_VERSION   : SKILLS_VERSION is absent or unreadable
//   - ENUM_ERROR        : SKILLS_VERSION is not a clean, single-line `<major>.<minor>.<patch>` scalar
//   - MISSING_CHANGELOG : CHANGELOG.md is absent or unreadable
//   - EMPTY_CHANGELOG   : CHANGELOG.md holds no non-whitespace bytes — a file with no content cannot
//                         record anything, and its remedy differs from UNRECORDED's
//   - UNRECORDED        : the version appears nowhere as a complete version token — the defect this
//                         file exists for
// Any of these → RED (exit 1). Clean → GREEN (exit 0). Fail-closed throughout: no input state returns
// GREEN by default (P5), and BAD_TARGET is a named member rather than an ad-hoc stderr write, so the
// enumeration genuinely covers every non-GREEN exit this file can take.
//
// WHY THIS EXISTS AT ALL (the trigger, P7 — measured, not inflated). Two commits shipped
// product-surface bytes with no SKILLS_VERSION bump and no CHANGELOG entry (`6c5ae8e`, touching
// `pharn/ARCHITECTURE.md` alone; `e4e8529`, changing `pharn/floor/check-plan-lessons.mjs` and two
// `pharn-*` commands). Then `f71f501` (PR #188) bumped `3.0.1 → 3.0.2`, edited CHANGELOG.md in the same
// diff, and recorded the string `3.0.2` NOWHERE — verified against that commit's own bytes:
// `git show f71f501:CHANGELOG.md | grep -c '3\.0\.2'` → `0`. That is the SECOND occurrence of one
// shape, which is exactly the bar lessons-learned L20 sets: a defect whose only remedy is "remember to
// update it" has demonstrated that discipline is the wrong kind of remedy. `check-version-badge.mjs`
// disclaims this class in its own header ("NOT that SKILLS_VERSION is CORRECT ... a badge matching a
// wrong bump stays GREEN"), so nothing in the chain could see it. This is that check.
//
// L35 IS ANSWERED BEFORE L20 IS APPLIED, and the order matters. L35 says a sync check is the right
// remedy only once the second copy is established as one that MUST exist — reach for a checker first
// and you have made a deletable redundancy permanent by maintaining it. It is answered YES here, and
// for a reason that does not generalise to `package.json`'s drained `version`: the CHANGELOG's version
// string is not a second copy of "what version is this", it is the JOIN KEY binding a version number to
// the description of what changed in it. Draining is unavailable — a changelog with no version keys is
// not a changelog — and CLAUDE.md's own discipline mandates the entry. Only then does L20 apply.
//
// WHAT THIS DOES NOT GUARANTEE (P0 — say it, don't bury it):
//   - NOT that the CHANGELOG ENTRY IS CORRECT, complete, or describes the right change. This proves a
//     string APPEARS. **A version recorded against a wrong bump stays GREEN**; so does a version pasted
//     into an unrelated sentence, or recorded with a description of some other increment. This is the
//     headline bound and it is stated first on purpose.
//   - NOT that SKILLS_VERSION is CORRECT, or that a bump that should have happened did. Inherited
//     unchanged from `check-version-badge.mjs`: nothing here can tell a right bump from a wrong one,
//     and a product-surface change that never bumped at all leaves this checker GREEN.
//   - NOT that a matched token IS a PHARN version record. The boundary rule below excludes the two
//     look-alikes this file actually contains (`v2.0.0` in the semver URL, `v7.0.1` in an action pin),
//     but a future third-party version equal to SKILLS_VERSION and rendered without a letter prefix
//     would satisfy the check. Named residual `changelog-record-position`, deliberately unbuilt (P7 —
//     no occurrence yet, and pinning a POSITION would re-pin a rendering, which is the L36 defect).
//   - NOT read from a STRUCTURED location on the CHANGELOG side. L6 says a membership fact is read from
//     its structured location, never grepped from free text. The needle IS structured (the
//     SKILLS_VERSION file); the haystack is not — a changelog entry has no machine-readable version
//     field, which is precisely why the string went unrecorded. Stated as a narrowing, exactly as
//     `check-version-badge.mjs` states it for the README badge, not as a claim against L6.
//   - NOT that this checker RUNS. It guards nothing unless something invokes it; the package.json and
//     ci.yml wiring is pinned separately by check-skills-version-recorded.test.mjs — and "the wiring is
//     pinned" never means "CI executed it".
//
// THE BOUNDARY RULE, and why it is neither a bare substring nor required markup. A bare
// `changelog.includes(version)` is not falsifiable enough: `3.0.2` occurs inside `3.0.20`, `13.0.2` and
// `3.0.2.1`, so a CHANGELOG recording only a NEIGHBOURING version would pass. Requiring back-ticks —
// the move `check-contributing-gates.mjs` makes, and makes correctly — would be wrong here, for a
// reason worth stating rather than inheriting: there the token was `test`, an ordinary English word, so
// markup was the only thing separating a declaration from prose; here the token is a dotted numeric
// triple that does not occur in prose, and the collision risk is NUMERIC, not lexical. Pinning one
// rendering would also RED correct entries — this CHANGELOG renders versions at least five ways
// (`` `2.6.2` ``, `**2.5.1**`, bare `2.3.4`, `## [1.0.0]`, and inside a badge URL as `pharn-2.5.1`,
// all measured in the live file) — and would train authors to satisfy markup instead of recording a
// version (L27's failure mode; L36's variant-spelling mechanism). So the anchor is a boundary:
//
//   an occurrence counts iff the character BEFORE is not [0-9A-Za-z.]
//                        and the character AFTER  is not a digit, not a letter,
//                            and not a `.` that is itself followed by a digit.
//
// Sentence-final `3.0.2.` therefore counts; `3.0.2.1` does not. Excluding a LETTER-prefixed occurrence
// is a measured requirement, not a preference: `2.0.0` is a real past SKILLS_VERSION and this file's
// permanent header links `https://semver.org/spec/v2.0.0.html`, so a bare-boundary rule would have
// GREENed a `2.0.0` release vacuously (L37 — the unlisted exception is where the drift lands).
//
// PRECEDENCE is deterministic, not incidental: the target is checked first, then SKILLS_VERSION is read
// and validated, and only then is the CHANGELOG opened. Two simultaneously broken inputs must not race.
//
// A NEAR MISS IS NAMED IN THE MESSAGE. Without it an author stares at a CHANGELOG that visibly contains
// "3.0.2", concludes the checker is broken, and reaches for a bypass — L27's exact failure mode. The
// context is emitted through `JSON.stringify` and bounded on both length and count: CHANGELOG.md is
// repo-authored, but on a fork or an outside contributor's PR it is attacker-influenced text, so it is
// treated as DATA on the way OUT as well as on the way in (P2).
//
// Usage:  node .dev/floor/check-skills-version-recorded.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only, fail-closed. Apparatus: never ships to a user install, so no SKILLS_VERSION bump.

import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

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

/**
 * The CLOSED set of non-GREEN outcomes. Exported so the test file can ITERATE it — L29: when a remedy
 * is quantified over a set, the enumeration is the deliverable, not an assertion written for whichever
 * member the author happened to be looking at. Every `finding()` type below is a member, and
 * `BAD_TARGET` is included rather than left as an ad-hoc stderr write, so the set genuinely covers
 * every way this file can exit non-zero.
 */
export const REFUSAL_STATES = ["BAD_TARGET", "MISSING_VERSION", "ENUM_ERROR", "MISSING_CHANGELOG", "EMPTY_CHANGELOG", "UNRECORDED"];

/**
 * True iff `v` is a non-empty, length-bounded string containing NO control characters.
 *
 * This is the PRECONDITION, never the replacement, for the anchored shape regex — the
 * compose-don't-replace discipline of lessons-learned L14. It is MORE load-bearing here than in the
 * sibling badge checker, and the reason is worth stating: that checker COMPARES the version, so a
 * degenerate value yields a mismatch (a RED). This one SEARCHES FOR it, and an empty needle is a
 * substring of every file — a degenerate value would yield a false GREEN. The guard is what makes the
 * fail-closed direction structural rather than incidental.
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
 * version token. See THE BOUNDARY RULE in the header for the reasoning and the measurement behind it.
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
 * `nearMisses` (present as a substring but NOT at a boundary). Pure; no I/O.
 *
 * FAIL-CLOSED on a degenerate needle (L34's direction): an empty or non-string version can never be
 * searched for, so it yields the empty result rather than matching at every offset. The caller has
 * already rejected such a value; this is the second layer, not the first.
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

/**
 * A bounded, ESCAPED quote of the text around index `i`. CHANGELOG.md is untrusted on the way OUT (a
 * fork or an outside PR authors it), so it is length-capped and rendered through `JSON.stringify`,
 * which escapes control characters and ESC rather than emitting them raw into a terminal (P2).
 */
export function renderContext(text, i, len) {
  const start = Math.max(0, i - CONTEXT_RADIUS);
  const end = Math.min(text.length, i + len + CONTEXT_RADIUS);
  return JSON.stringify(text.slice(start, end));
}

/**
 * One finding. `fix` is PER FINDING, never a shared trailer — lessons-learned L27: a remedy composed
 * once for every branch is printed by branches it cannot possibly help, and a guard that prints an
 * impossible remedy trains the exact bypass it exists to prevent.
 */
const finding = (type, file, problem, fix) => ({ ok: false, findings: [{ type, file, problem, fix }] });

/**
 * Check that SKILLS_VERSION is recorded in CHANGELOG.md. Returns { ok, findings, version, occurrences }.
 * Pure — no process exit — so tests can call it directly.
 */
export function checkSkillsVersionRecorded(targetDir) {
  // ── 0. The target itself (fail-closed: a missing target is a named refusal, never a silent GREEN) ──
  if (typeof targetDir !== "string" || targetDir === "" || !existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
    return finding(
      "BAD_TARGET",
      String(targetDir),
      `target dir not found (or not a directory): ${JSON.stringify(String(targetDir))}`,
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
      `make ${VERSION_PATH} a single <major>.<minor>.<patch> line. A degenerate version is refused rather than searched for: an empty needle is a substring of every file and would pass vacuously.`
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

  // ── 3. The record itself ────────────────────────────────────────────────────────────────────────
  const { recorded, nearMisses } = findOccurrences(changelog, version);
  if (recorded.length === 0) {
    const shown = nearMisses.slice(0, MAX_NEAR_MISSES).map((i) => renderContext(changelog, i, version.length));
    const nearNote =
      nearMisses.length === 0
        ? ""
        : ` The string does occur ${nearMisses.length} time(s), but never as a complete version token — it sits inside a longer version or after a letter, e.g. ${shown.join(", ")}.`;
    return {
      ok: false,
      version,
      occurrences: { recorded, nearMisses },
      findings: [
        {
          type: "UNRECORDED",
          file: CHANGELOG_PATH,
          problem: `${VERSION_PATH} is ${JSON.stringify(version)} but that version appears nowhere in ${CHANGELOG_PATH} as a complete version token.${nearNote}`,
          fix: `name ${JSON.stringify(version)} in the CHANGELOG entry that describes what shipped in it — the file's own convention, e.g. "\`${version}\`" or "(SKILLS_VERSION x.y.z -> **${version}**)". Any rendering works; the version must simply not be glued to a letter or run into a longer number.`,
        },
      ],
    };
  }
  return { ok: true, findings: [], version, occurrences: { recorded, nearMisses } };
}

function main() {
  const target = process.argv[2] || ".";
  const { ok, findings, version, occurrences } = checkSkillsVersionRecorded(target);
  if (ok) {
    process.stdout.write(
      `SKILLS-VERSION-RECORDED: GREEN — ${CHANGELOG_PATH} records ${VERSION_PATH} ${JSON.stringify(version)} ` +
        `(${occurrences.recorded.length} occurrence(s) at a version-token boundary)\n`
    );
    process.exit(0);
  }
  process.stdout.write(`SKILLS-VERSION-RECORDED: RED — ${findings.length} finding(s)\n`);
  for (const f of findings) {
    process.stdout.write(`- [${f.type}] ${f.file}\n    ${f.problem}\n    FIX: ${f.fix}\n`);
  }
  process.stdout.write(
    `\nNOTE (P0): this checks that the version STRING appears. It never verifies that the entry is correct,\n` +
      `complete, or describes the right change — a version recorded against a wrong bump stays GREEN.\n`
  );
  process.exit(1);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare; see `.dev/floor/entry-point-guard.test.mjs` for the four failure modes.
if (import.meta.main) {
  main();
}

// ── COPY-PAIR (L31/L35): why VERSION_RE / MAX_LEN / isCleanScalar are declared here, not imported ────
//
// L35's question is asked BEFORE the remedy, not after: must the second copy exist? Strictly, no — the
// three could be shared. Both alternatives are worse HERE, and the reasoning is recorded so a later
// reader can overturn it on evidence rather than re-derive it:
//
//   (a) importing them from `check-version-badge.mjs` is a LEAF -> LEAF import, the shape
//       ARCHITECTURE §4 forbids, and one with ZERO precedent in this repo: every floor import — six
//       into `frontmatter-core.mjs`, four into `lessons-index-core.mjs` — points at a `*-core.mjs`
//       BOTTOM, never at another checker. It would also give a live gate a second reason to change.
//   (b) extracting a `version-core.mjs` means editing a WORKING guard for a second axis of change with
//       no triggering failure (P7). `frontmatter-core.mjs` was extracted at SIX copies and a reproduced
//       BOM defect — not at two copies and none.
//
// So: copy, and make something RANGE OVER the pair (L31). `check-skills-version-recorded.test.mjs`
// imports BOTH modules and pins both halves, the `check-provenance.mjs` precedent: every shared
// constant must AGREE, and the one deliberate DIVERGENCE is asserted as deliberate — this file has no
// `UNSUPPORTED` state, because a hyphen-bearing version is already rejected by the shared `VERSION_RE`.
// Both checkers therefore RED on a pre-release; only the refusal's NAME differs, and that is stated so
// a reader does not infer the case is unhandled.
