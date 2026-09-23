#!/usr/bin/env node
// pharn/floor/worktree-fingerprint.mjs — a content-hash over the worktree state the gates judged.
//
// One axis: "what tree did this gate see?" (P3). The grammar/coverage half is gate-run-core.mjs and the
// execution half is run-gates.mjs. This file is separate from both because it is the ONLY one that
// touches git, and because the freshness checker (check-loop-fresh.mjs) imports it too.
//
// ============================== WHAT IT IS FOR, AND WHAT IT IS NOT ==============================
//
// USED HERE (increment 1): the runner records `fp_before`/`fp_after` around every gate, and
// gate-run-core.validateStamp() refuses a stamp where entry k's `fp_before` differs from entry k-1's
// `fp_after`. That is the claim "the gates judged ONE tree state" — a content-hash comparison
// (pharn/ARCHITECTURE.md §2 primitive #2).
//
// USED BY check-loop-fresh.mjs (6.10.0): `fingerprint.final` is compared to the LIVE tree when /pharn-loop
// reads a stop and again at its commit gate (FRESHNESS), and a regress head stamp's `final` to the verify
// stamp's `init`. Both are comparisons of this function's digest, so any change to what is hashed must
// bump ALGO — a silently changed digest would read as a moved tree and re-run a stage.
//
// ===================================== THE TWO EXCLUSIONS =====================================
//
// (1) `.pharn/` — LOAD-BEARING IN THIS INCREMENT, not merely a convenience for the next one.
//     `enumerate()` derives its set from `git ls-files --cached --others --exclude-standard`, so a
//     git-IGNORED path is already absent. In THIS repo `.pharn/` is ignored (.gitignore:3) and the
//     exclusion is inert. In an install that does NOT ignore it, the runner's own logs and state — which
//     live under the state root — would land in the set, `fp_after(k)` would differ from `fp_before(k+1)`
//     for EVERY gate, and every run would refuse `tree-changed-between-gates`. The exclusion is
//     therefore a correctness requirement of the runner, and it is stated that way rather than deferred.
//     This is NOT a second copy of `.gitignore` (lessons-learned L35): it names ONE scratch namespace the
//     runner itself writes, not a mirror of the ignore file.
//
// (2) The active feature's POST-BUILD pipeline artifacts — a set of its OWN, deliberately NOT
//     reconcile-ignore.json's. The two answer DIFFERENT QUESTIONS (lessons-learned L39: one declaration
//     read by two consumers asking different questions is right for one and silently wrong for the
//     other):
//       reconcile asks — "may this path change after the build anchor without being a Bash escape?"
//       this asks    — "does a change here alter what the gates judged?"
//     They diverge on exactly four names. `SPEC.md`, `PLAN.md`, `GRILL.md` and `BUILD.md` are EXEMPT to
//     reconcile and INCLUDED here, because a `PLAN.md` edit changes build-completeness and the spec->plan
//     chain gate — it changes what a gate would decide. The other thirteen are written AT or AFTER
//     regress, never before the gates they would be bound to, so a change to one cannot alter a gate's
//     verdict.
//
//     A PARTITION TEST pins `EXCLUDED_ARTIFACTS ∪ INCLUDED_ARTIFACTS === reconcile-ignore.json
//     pipeline_artifacts.names`, so a NEW pipeline artifact fails CI until someone classifies it for both
//     consumers (L29 — the enumeration is the deliverable; L36 — closure, not per-member presence).
//     BOUND, and it is L43's exactly: that test certifies the three stores AGREE, never that the set is
//     CORRECT. All three can be stale together the day a new artifact lands and nobody classifies it.
//
// ================================== BOUNDS, NAMED NOT DISCOVERED ==================================
//   • CONTENT ONLY — a chmod-only change is invisible (inherited from hashFile, which hashes bytes).
//   • A submodule gitlink is not descended (git reports the gitlink path; hashFile returns null for a
//     directory, recorded as absent).
//   • A symlink whose target is not an openable regular file (a directory, a dangling or looping link) is
//     hashed by its LINK TEXT, inherited from hashFile since 6.16.1, so re-pointing one moves the digest.
//     Before 6.16.1 such a link hashed as absent, so on a tree that holds one, a fingerprint written by an
//     older install differs from a fresh one. A stamp straddling that upgrade reads as tree-moved, never as
//     fresh: the fail-closed direction.
//   • An excluded artifact can still be READ by a whole-repo style gate in a project that lints
//     `pharn/features/**` (lessons-learned L23), so a later change to it is invisible to this hash while
//     remaining visible to that gate. Stated, not solved.
//   • MEASURED on this repo rather than asserted (lessons-learned L24 — a bound inherited from a
//     superseded implementation is an unbacked claim): 1925 paths, ~463 ms cold and ~75-85 ms warm over
//     three consecutive runs with an identical digest. Two fingerprints per gate across ~10 gates is
//     roughly 1.5-9 s added to a verify run. Re-measure if the enumeration changes.
//   • NOT a `git status` dirty-set. That would need `assume-unchanged` and `skip-worktree` handling, and
//     it answers "changed since HEAD" rather than "changed since the previous gate".
//
// TRUST (P2): operands are paths and hex digests from deterministic tooling. File CONTENT is hashed,
// never parsed, never interpreted, never executed.
//
// Exit (CLI): 0 digest printed · 2 unusable input — FAIL-CLOSED (P5).

import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { enumerate, hashFile } from "./reconcile-baseline.mjs";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";

/** The algorithm identity, recorded in every stamp. Bump on ANY change to what is hashed or how the
 *  digest is composed — check-loop-fresh.mjs compares digests across runs (and refuses a stamp whose
 *  algo differs from the live one), so an unversioned change would read as a tree mutation. */
export const ALGO = "worktree-fingerprint/1+sha256";

/** The scratch namespace the runner itself writes. See exclusion (1) in the header. */
export const STATE_ROOT_SEGMENT = ".pharn/";

/** POST-BUILD artifacts: written at or after regress, so a change cannot alter what a gate judged. */
export const EXCLUDED_ARTIFACTS = Object.freeze([
  "REGRESSION.md",
  "regression-report.json",
  "VERIFY.md",
  "verify-report.json",
  "REVIEW.md",
  "findings.json",
  "assignments.json",
  "SHIP.md",
  "ship-record.json",
  "BRIEFING.md",
  "LOOP.md",
  "cost.json",
  "RUN-REPORT.md",
]);

/** PRE-GATE artifacts: reconcile exempts these, this INCLUDES them. The divergence is the point (L39). */
export const INCLUDED_ARTIFACTS = Object.freeze(["SPEC.md", "PLAN.md", "GRILL.md", "BUILD.md"]);

/** /pharn-review writes one findings.json per lens, NESTED. An exact-filename set cannot express that,
 *  so it gets its own narrow shape: exactly one segment for the lens name, filename still findings.json.
 *  Anything deeper, or any other filename under lenses/, is NOT excluded — it stays in the fingerprint. */
const LENS_FINDINGS_RE = /^lenses\/[A-Za-z0-9._-]+\/findings\.json$/;

const EXCLUDED_SET = new Set(EXCLUDED_ARTIFACTS);

/** The two feature roots, in the order check-regress.mjs and reconcile-ignore.json use. */
export function featureRoots(feature) {
  return [`.dev/features/${feature}/`, `pharn/features/${feature}/`];
}

/**
 * Is `file` excluded from the fingerprint?
 *
 * The feature-artifact half requires an explicit, SHAPE-GATED `feature`: with no feature named, nothing
 * is excluded on that axis (fail-closed — the exclusion is opt-in, never inferred). The slug is gated
 * before use so a crafted value cannot build a traversing prefix; matching is then literal `startsWith`
 * plus exact membership, never a glob.
 */
export function isExcluded(file, feature) {
  if (typeof file !== "string" || file.length === 0) return false;
  if (file === ".pharn" || file.startsWith(STATE_ROOT_SEGMENT)) return true;
  if (!feature || !FEATURE_SLUG_RE.test(feature)) return false;
  for (const root of featureRoots(feature)) {
    if (!file.startsWith(root)) continue;
    const rest = file.slice(root.length);
    if (EXCLUDED_SET.has(rest) || LENS_FINDINGS_RE.test(rest)) return true;
  }
  return false;
}

/**
 * The fingerprint: sha256 over the sorted `(path, content-sha256 | DELETED)` pairs of the reconciled set,
 * minus the two exclusions.
 *
 * HEAD is deliberately NOT part of the digest. It is recorded separately on the stamp, so committing
 * identical content does not read as a tree change.
 *
 * Returns `{ok: true, digest, algo, paths}` or `{ok: false, reason}`; the caller maps the failure onto a
 * closed reason_code. Fail-closed: an enumeration this module cannot trust is never hashed partially.
 */
export function fingerprint(baseDir, { feature = null } = {}) {
  const e = enumerate(baseDir);
  if (!e.ok) return { ok: false, reason: e.reason };
  const kept = e.paths.filter((p) => !isExcluded(p, feature)).sort();
  const h = createHash("sha256");
  for (const rel of kept) {
    // The length-prefixed field separator is load-bearing: without it the pairs
    // ("a", "bc") and ("ab", "c") would produce the same stream, so two different trees could share a
    // digest. A path may legally contain any byte but NUL and "/", so a plain delimiter is not enough.
    h.update(String(rel.length));
    h.update("\0");
    h.update(rel);
    h.update("\0");
    h.update(hashFile(resolve(baseDir, rel)) ?? "DELETED");
    h.update("\0");
  }
  return { ok: true, digest: h.digest("hex"), algo: ALGO, paths: kept.length };
}

function main(argv) {
  const args = argv.slice(2);
  const i = args.indexOf("--feature");
  const feature = i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  const b = args.indexOf("--base");
  const base = b !== -1 && b + 1 < args.length ? args[b + 1] : ".";
  const r = fingerprint(base, { feature });
  if (!r.ok) {
    console.error(`worktree-fingerprint: ${r.reason}`);
    process.exit(2);
  }
  console.log(JSON.stringify({ algo: r.algo, digest: r.digest, paths: r.paths }, null, 2));
}

if (import.meta.main) main(process.argv);
