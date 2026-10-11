#!/usr/bin/env node
// pharn/floor/check-build-complete.mjs — the deterministic BUILD-COMPLETENESS checker for the /verify stage.
//
// Floor/eval infrastructure — NOT a Capability (no `role:`; the floor capability count stays 1, exactly
// like pharn/floor/check-verify.mjs / pharn/floor/check-regress.mjs, which live in this floor-ignored dir). It owns
// ONE cohesive axis — "did the build produce every path the plan DECLARED?" — separate from
// check-verify's "are all gates green?" axis, hence a separate file (P3).
//
// WHY THIS FILE EXISTS — the gap it closes (ship-completion-retry increment, P7-triggered by a REAL
// hole): /verify's gates are the project's whole-repo gates + one `structural:*` gate per eval pair that
// EXISTS. A path the plan's `## Files` DECLARED but the build never wrote yields NO gate at all — so an
// incomplete build could PASS /verify (verify green over a half-built plan), or FAIL for a coincidental
// whole-repo reason INDISTINGUISHABLE from a real bug. This checker gives /verify a deterministic
// completeness signal: every CONCRETE `## Files` path must exist after build.
//
// FLOOR REDUCTION (ARCHITECTURE §2 primitive #3): path-set membership + filesystem existence — set
// membership and path resolution, no LLM classification. `complete` iff every concrete declared path
// resolves to an existing filesystem entry.
//
// THE `## Files` PARSER LIVES IN pharn/floor/plan-files-core.mjs, not here (REVIEW finding F3). This
// file owns the COMPLETENESS axis; the grammar of `## Files` is a separate reason to change, and it
// acquired a second consumer (render-run-report.mjs) in the loop-run-report increment. The core carries
// the parity obligation against set-writes-scope.cjs — the CANONICAL parser — and the residual about
// inline-marked items; both are cited here rather than restated (P4).
//
// The parity is still held against THIS file: check-build-complete.test.mjs's ★ PARITY case runs this
// checker and the setter over a shared fixture and requires the same path set, so the extraction is
// covered by the test that already ranged over the behaviour. That test is example-based, not a proof of
// equivalence.
//
// TRUST (P2): the PLAN's `## Files` paths are `trust: untrusted` DATA. They are used ONLY as
// path-membership operands and as `existsSync` arguments (a filesystem READ) — never eval'd, executed,
// spawned, imported, or sent anywhere. No child process, no network. A crafted `## Files` entry can at
// most change WHICH paths are existence-checked (a coverage question the /verify command surfaces as
// DATA), never inject a command or flip a guaranteed decision beyond the deterministic existence fact.
// The `missing[]` values ORIGINATE in the untrusted PLAN, so a downstream renderer (VERIFY.md) MUST quote
// them as DATA.
//
// HONEST SCOPE (P0/P7): "complete" means EXACTLY "every concrete declared path exists" — a deterministic
// PROXY for "the build finished," NOT a semantic claim that the code does what the plan intended (that
// stays advisory/verifier + human). A placeholder/glob `## Files` entry (`<capDir>/…`, `a/*.md`) is not
// existence-checkable and is SKIPPED (recorded in `skipped[]`), never counted missing — mirroring the
// setter's isConcrete filter.
//
// PLAN-DECLARED DELETIONS (6.56.0, plan-declared-deletions). An item carrying plan-files-core.mjs's deletion marker
// (``- `path` (delete)``) declares the OPPOSITE end state: that path must be ABSENT after the build. Absence is an
// `lstat` ENOENT and nothing else (L54) — a dangling symlink left at the path is PRESENT, and an `lstat` error other
// than ENOENT is inconclusive. Such paths are listed in `deletions[]`; the ones still present in `undeleted[]`.
// `complete` iff `missing[]` AND `undeleted[]` are empty. The domain the empty-set refusal guards is
// `declared ∪ deletions` (L34), so a plan that only deletes files can be complete. Also inconclusive, fail-closed:
// a near-miss spelling of the marker (refused, never read as an ordinary item — L36) and a path marked in one item
// and unmarked in another (its two end states cannot both hold). EVERY output keeps `complete` a boolean and
// `missing[]` / `skipped[]` string arrays, the shape stage-verify-core.mjs's `checkCompleteness` requires; an output
// without them reads `child-crashed` there. BOUND: absent is not "deleted by this build" — a marked path that never
// existed reads complete, and a mistyped one leaves the intended file in place with this check green.
//
// Usage:
//   node pharn/floor/check-build-complete.mjs <PLAN.md> [repoDir]
//     PLAN.md : the feature plan whose `## Files` declares the paths the build must have produced.
//     repoDir : root the declared (repo-relative) paths resolve against (default ".").
//
// Exit: 0 complete · 1 incomplete (missing[] or undeleted[] non-empty) · 2 inconclusive / bad input — FAIL-CLOSED (P5).

import "./runtime-floor.mjs";
import { readFileSync, existsSync, lstatSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
import { pathsFromPlanFiles, clean, isConcrete } from "./plan-files-core.mjs";

// --- emit one JSON document to stdout, then exit. The /verify command captures this verbatim. ---
function emit(obj, code) {
  console.log(JSON.stringify(obj, null, 2));
  process.exit(code);
}

function main() {
  const argv = process.argv.slice(2);
  // Leading positionals = args before the first `--flag` (defensive: no flags are defined, but a stray
  // `--x` never leaks in as the PLAN path or repoDir).
  const positional = [];
  for (const a of argv) {
    if (a.startsWith("--")) break;
    positional.push(a);
  }
  const planPath = positional[0];
  const repoDir = positional[1] ?? ".";

  // Fail-closed input handling (P5): a missing/unreadable PLAN or a PLAN with no parseable `## Files`
  // is INCONCLUSIVE (exit 2), NEVER a silent "complete".
  if (!planPath) {
    emit(
      {
        plan: null,
        repoDir,
        declared: [],
        skipped: [],
        missing: [],
        complete: false,
        verdict: "inconclusive",
        reason: "no PLAN.md path provided",
      },
      2
    );
  }
  if (!existsSync(planPath)) {
    emit(
      {
        plan: planPath,
        repoDir,
        declared: [],
        skipped: [],
        missing: [],
        complete: false,
        verdict: "inconclusive",
        reason: `PLAN.md not found: ${planPath}`,
      },
      2
    );
  }
  let text;
  try {
    text = readFileSync(planPath, "utf8");
  } catch (e) {
    emit(
      {
        plan: planPath,
        repoDir,
        declared: [],
        skipped: [],
        missing: [],
        complete: false,
        verdict: "inconclusive",
        reason: `cannot read ${planPath}: ${e.message}`,
      },
      2
    );
  }

  const parsed = pathsFromPlanFiles(text);
  if (!parsed.ok) {
    emit(
      {
        plan: planPath,
        repoDir,
        declared: [],
        skipped: [],
        missing: [],
        complete: false,
        verdict: "inconclusive",
        reason: `${parsed.reason} in ${planPath}`,
      },
      2
    );
  }

  // Concrete declared paths only (placeholders/globs are not existence-checkable — SKIPPED, mirroring the
  // setter's isConcrete filter; recorded in `skipped[]` for transparency).
  // A PLAN path is untrusted text (P2): every reason that names one JSON-quotes it.
  const inconclusive = (fields, reason) =>
    emit(
      { plan: planPath, repoDir, declared: [], skipped: [], missing: [], ...fields, complete: false, verdict: "inconclusive", reason },
      2
    );

  // A near-miss spelling of the deletion marker is refused, never read as an ordinary item (L36): read that way, a
  // build that left the file in place would pass.
  const nearMiss = parsed.entries.find((e) => e.deleteNearMiss);
  if (nearMiss) {
    inconclusive(
      {},
      `the \`## Files\` item for ${JSON.stringify(clean(nearMiss.path))} in ${planPath} spells the deletion marker another way — write exactly \`(delete)\`, lower-case, one space after the closing back-tick`
    );
  }

  const cleanedOf = (entries) => entries.map((e) => clean(e.path));
  const unmarked = cleanedOf(parsed.entries.filter((e) => !e.delete));
  const marked = cleanedOf(parsed.entries.filter((e) => e.delete));
  const conflict = marked.find((p) => unmarked.includes(p));
  if (conflict !== undefined) {
    inconclusive(
      {},
      `${JSON.stringify(conflict)} is declared both for deletion and as an ordinary path in ${planPath} — both end states cannot hold`
    );
  }

  // Concrete paths only (placeholders/globs are not existence-checkable — SKIPPED, mirroring the setter's
  // isConcrete filter; recorded in `skipped[]` for transparency). A marked non-concrete item is skipped too.
  const declared = unmarked.filter(isConcrete);
  const deletions = [...new Set(marked.filter(isConcrete))];
  const skipped = unmarked.concat(marked).filter((e) => !isConcrete(e));

  if (declared.length === 0 && deletions.length === 0) {
    // A `## Files` with zero CONCRETE paths — nothing whose state we can assert. Fail-closed (P5): we cannot
    // claim "complete" over an empty concrete set (L34). INCONCLUSIVE, not a silent complete. The domain is
    // `declared ∪ deletions`, so a plan that only deletes files is NOT refused here.
    inconclusive({ skipped, deletions: [], undeleted: [] }, `no concrete back-tick paths under \`## Files\` in ${planPath}`);
  }

  const absOf = (p) => (isAbsolute(p) ? p : resolve(repoDir, p));

  // The completeness test: every concrete declared path must resolve to an existing filesystem entry.
  const missing = declared.filter((p) => !existsSync(absOf(p)));

  // The deletion test: every concrete marked path must be ABSENT — lstat ENOENT, the only proof of absence (L54).
  const undeleted = [];
  for (const p of deletions) {
    try {
      lstatSync(absOf(p));
      undeleted.push(p); // anything at the path, a dangling link included, is present
    } catch (e) {
      if (!e || e.code !== "ENOENT") {
        inconclusive(
          { declared, skipped, missing, deletions, undeleted: [] },
          `cannot lstat ${JSON.stringify(p)}: ${e && typeof e.code === "string" ? e.code : "unknown error"}`
        );
      }
    }
  }

  const complete = missing.length === 0 && undeleted.length === 0;
  emit(
    { plan: planPath, repoDir, declared, skipped, missing, deletions, undeleted, complete, verdict: complete ? "complete" : "incomplete" },
    complete ? 0 : 1
  );
}

// Entry guard. It arrived with the loop-run-report increment because `pathsFromPlanFiles` was EXPORTED
// from here and an unconditional `main()` would have run the whole CLI on every `import`. That export has
// since moved to plan-files-core.mjs, so this file exports nothing and the guard is no longer LOAD-BEARING
// — it is kept as ordinary CLI hygiene, and the comment is corrected rather than left asserting a reason
// that no longer holds. `import.meta.main` is the form .dev/floor/entry-point-guard.test.mjs pins; the two
// `file://`-template spellings it BANS are measured silent no-ops on spaced, non-ASCII and symlinked paths
// (L25). Invoked as a CLI this is unchanged.
if (import.meta.main) main();
