#!/usr/bin/env node
// .dev/floor/check-version-badge.mjs — the README version-badge DRIFT CHECKER (build apparatus).
//
// The GUARANTEE (P0, ARCHITECTURE §2 primitive #3 — enum/regex): the value extracted from the README's
// shields version badge equals the trimmed, shape-validated SKILLS_VERSION scalar. Both sides are read live,
// the badge value is extracted by URL pattern, and the comparison is JavaScript string equality (`===`).
// ZERO LLM.
//
//   - MISSING_VERSION  : SKILLS_VERSION is absent or unreadable
//   - ENUM_ERROR       : SKILLS_VERSION or the badge value is not a clean `<major>.<minor>.<patch>` scalar
//   - UNSUPPORTED      : SKILLS_VERSION carries a `-` (see "the hyphen" below)
//   - MISSING_README   : README.md is absent or unreadable
//   - NO_BADGE         : no `img.shields.io/badge/pharn-<x>-` badge in README.md
//   - AMBIGUOUS        : MORE THAN ONE such badge — a set with 2 members is not a value
//   - DRIFT            : the badge value and SKILLS_VERSION disagree — the defect this file exists for
// Any of these → RED (exit 1). Clean → GREEN (exit 0). Fail-closed throughout: no input state returns
// GREEN by default, and ambiguity is a RED rather than a first-match guess (P5).
//
// WHY THIS EXISTS AT ALL (the trigger, P7 — not a hypothetical): the badge read `version-1.0.0` while
// SKILLS_VERSION had reached `2.5.1`. It sat in the README's UNGUARDED prose — outside the
// CURRENT-STATE markers that check-capability-catalog holds to byte-equality — so no gate could see it,
// and it survived the entire 1.x → 2.5.x run of bumps. Per lessons-learned L20, a defect whose only
// remedy is "remember to update it" has already demonstrated that discipline is the wrong kind of
// remedy; the second occurrence is the trigger to give it a floor check. This is that check.
//
// WHAT THIS DOES NOT GUARANTEE (P0 — say it, don't bury it):
//   - NOT that the README's version story is COHERENT. This compares two strings. Whether a reader can
//     tell the product-surface version from package.json's inert `0.0.0` is prose judgment, reviewed by
//     a human, gated by nothing. (That field read `1.0.0` as a "foundation tag" until it was made
//     deliberately inert — there is now one version of record, SKILLS_VERSION, and this checker pins the
//     badge to it.)
//   - NOT that SKILLS_VERSION is CORRECT. If a bump is wrong or missing, a badge matching it is still
//     GREEN. The guarantee is agreement, not truth.
//   - NOT read from a STRUCTURED location. Lessons-learned L6 says a membership fact is read from its
//     structured location, never grepped from free text. A README badge HAS no structured location —
//     it is prose, which is precisely why it drifted. This narrows rather than claims: the anchor is
//     the shields URL (a structured token WITHIN prose), never a line number and never a bare version
//     substring, and >1 match is RED instead of first-match-wins. Stated, not implied.
//   - NOT that this checker RUNS. It guards nothing unless something invokes it; the package.json and
//     ci.yml wiring is pinned separately by check-version-badge.test.mjs.
//
// THE HYPHEN, and why it is a refusal rather than a comparison. Shields encodes a literal `-` in a
// badge message as `--`, so a pre-release SKILLS_VERSION such as `2.6.0-rc.1` cannot round-trip through
// the badge URL this checker reads: the anchor would extract `2.6.0` and report a mismatch against
// `2.6.0-rc.1` — two values that look almost equal, which is the least legible possible red. The
// checker therefore REFUSES such a version by name. The direction was always fail-closed; this makes
// the reason readable. (Raised at /pharn-dev-grill; folded in before the first build.)
//
// PRECEDENCE is deterministic, not incidental: SKILLS_VERSION is read and validated FIRST, so when both
// inputs are broken its refusal is the one reported. Two REDs must not race.
//
// Usage:  node .dev/floor/check-version-badge.mjs [targetDir]     (default: cwd)
// Non-LLM, stdlib-only, fail-closed. Apparatus: never ships to a user install, so no SKILLS_VERSION bump.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** The file that owns the version. Single source of truth; the badge is a rendering of it. */
export const VERSION_PATH = "SKILLS_VERSION";
/** The document whose badge must agree with it. */
export const README_PATH = "README.md";
/** The badge's shields label — also the checker's anchor token. */
export const BADGE_LABEL = "pharn";
/**
 * The anchor: a shields BADGE url with the `pharn` label, capturing the message up to the next `-`.
 * Deliberately NOT global here — a shared /g regex carries `lastIndex` between calls; the global copy
 * is built per call in findBadgeValues().
 */
export const BADGE_RE = /img\.shields\.io\/badge\/pharn-([^-\s)]+)-/;
/** The accepted version shape. Strict three-part semver core; see "THE HYPHEN" above for pre-releases. */
export const VERSION_RE = /^\d+\.\d+\.\d+$/;
/** Upper bound on either scalar. Generous for a version; bounds a pathological single-line input. */
export const MAX_LEN = 64;

/**
 * True iff `v` is a non-empty, length-bounded string containing NO control characters.
 *
 * This is the PRECONDITION, never the replacement, for the anchored shape regexes below — the
 * compose-don't-replace discipline of lessons-learned L14, which this file follows.
 *
 * L14's REMEDY is right; its stated MECHANISM is not, and repeating it here would propagate a false
 * claim into a new file. L14 says "JavaScript `$` (without the `m` flag) matches at end-of-string OR
 * just before a single trailing newline, so `/^P[0-7]$/.test('P2\n') === true`". Verified live on Node
 * v24.13.1: that expression is **false**. `$` without `m` matches ONLY at end of input in JavaScript;
 * matching before a trailing newline is Perl/Python/PCRE behaviour, and in JS it needs the `m` flag.
 * The trailing-newline hole L14 describes does not exist here. Flagged for a human — canon is edited
 * only through a gated promotion, never by a build.
 *
 * So what this guard ACTUALLY buys, stated honestly rather than inherited:
 *   - a LENGTH BOUND. VERSION_RE has no upper bound, so a million-digit input matches its shape; this
 *     is the only thing that stops it. This is the load-bearing half.
 *   - a TYPE check, so a non-string can never reach `.test()`.
 *   - defence in depth on the BADGE value, whose extraction class `[^-\s)]+` excludes whitespace but
 *     NOT other control characters. VERSION_RE would also reject those, so the guarantee does not
 *     depend on this — but it also does not depend on VERSION_RE's exact character class staying as
 *     it is, which is the point of layering.
 * Char-code scanning rather than a regex keeps the guard readable and avoids a control-character class
 * in source.
 */
export function isCleanScalar(v, max = MAX_LEN) {
  if (typeof v !== "string" || v.length === 0 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

/** Every badge value in `readme`, in document order. A fresh /g regex per call — no shared lastIndex. */
export function findBadgeValues(readme) {
  return [...readme.matchAll(new RegExp(BADGE_RE.source, "g"))].map((m) => m[1]);
}

const finding = (type, file, problem) => ({ ok: false, findings: [{ type, file, problem }] });

/**
 * Compare the README badge against SKILLS_VERSION. Returns { ok, findings, version, badge }.
 * Pure — no process exit — so tests can call it directly.
 */
export function checkVersionBadge(targetDir) {
  // ── 1. SKILLS_VERSION first (deterministic precedence: its refusal wins over a README one) ──────
  let rawVersion;
  try {
    rawVersion = readFileSync(join(targetDir, VERSION_PATH), "utf8");
  } catch {
    return finding("MISSING_VERSION", VERSION_PATH, "the version file is absent or unreadable");
  }
  const version = rawVersion.trim();
  if (!isCleanScalar(version)) {
    return finding(
      "ENUM_ERROR",
      VERSION_PATH,
      `contents are not a clean single-line scalar (empty, over ${MAX_LEN} chars, multi-line, or control-character-bearing)`
    );
  }
  if (version.includes("-")) {
    return finding(
      "UNSUPPORTED",
      VERSION_PATH,
      `${JSON.stringify(version)} contains a hyphen; a shields badge message encodes a literal "-" as "--", so this version cannot round-trip through the badge URL — the badge would have to be built and read differently before a pre-release version is supported`
    );
  }
  if (!VERSION_RE.test(version)) {
    return finding("ENUM_ERROR", VERSION_PATH, `${JSON.stringify(version)} is not a <major>.<minor>.<patch> version`);
  }

  // ── 2. The README badge ─────────────────────────────────────────────────────────────────────────
  let readme;
  try {
    readme = readFileSync(join(targetDir, README_PATH), "utf8");
  } catch {
    return finding("MISSING_README", README_PATH, "the README is absent or unreadable");
  }
  const values = findBadgeValues(readme);
  if (values.length === 0) {
    return finding("NO_BADGE", README_PATH, `no "${BADGE_LABEL}" version badge found (expected a shields URL matching ${BADGE_RE.source})`);
  }
  if (values.length > 1) {
    return finding(
      "AMBIGUOUS",
      README_PATH,
      `${values.length} "${BADGE_LABEL}" version badges found (${values.map((v) => JSON.stringify(v)).join(", ")}); exactly one is required — a set with two members is not a value`
    );
  }
  const badge = values[0];
  if (!isCleanScalar(badge) || !VERSION_RE.test(badge)) {
    return finding("ENUM_ERROR", README_PATH, `badge value ${JSON.stringify(badge)} is not a <major>.<minor>.<patch> version`);
  }
  if (badge !== version) {
    return {
      ok: false,
      version,
      badge,
      findings: [
        {
          type: "DRIFT",
          file: README_PATH,
          problem: `the badge reads ${JSON.stringify(badge)} but ${VERSION_PATH} is ${JSON.stringify(version)}`,
        },
      ],
    };
  }
  return { ok: true, findings: [], version, badge };
}

function main() {
  const target = process.argv[2] || ".";
  // Fail-closed (P5): a missing / non-directory target is an error, never a silent GREEN.
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    process.stderr.write(`check-version-badge: target dir not found (or not a directory): ${target}\n`);
    process.exit(1);
  }
  const { ok, findings, version, badge } = checkVersionBadge(target);
  if (ok) {
    process.stdout.write(
      `VERSION-BADGE: GREEN — ${README_PATH} badge ${JSON.stringify(badge)} matches ${VERSION_PATH} ${JSON.stringify(version)}\n`
    );
    process.exit(0);
  }
  process.stdout.write(`VERSION-BADGE: RED — ${findings.length} finding(s)\n`);
  for (const f of findings) {
    process.stdout.write(`- [${f.type}] ${f.file}\n    ${f.problem}\n`);
  }
  process.stdout.write(`\nFIX: ${VERSION_PATH} is the single source — update the README badge to match it, not the other way round.\n`);
  process.exit(1);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare; see `.dev/floor/hash-doc.mjs` for the three failure modes it has.
if (import.meta.main) {
  main();
}
