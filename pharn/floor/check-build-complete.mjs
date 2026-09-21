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
// Usage:
//   node pharn/floor/check-build-complete.mjs <PLAN.md> [repoDir]
//     PLAN.md : the feature plan whose `## Files` declares the paths the build must have produced.
//     repoDir : root the declared (repo-relative) paths resolve against (default ".").
//
// Exit: 0 complete · 1 incomplete (missing[] non-empty) · 2 inconclusive / bad input — FAIL-CLOSED (P5).

import { readFileSync, existsSync } from "node:fs";
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
  const cleaned = parsed.value.map(clean);
  const declared = cleaned.filter(isConcrete);
  const skipped = cleaned.filter((e) => !isConcrete(e));

  if (declared.length === 0) {
    // A `## Files` with zero CONCRETE paths — nothing whose existence we can assert. Fail-closed (P5):
    // we cannot claim "complete" over an empty concrete set. INCONCLUSIVE, not a silent complete.
    emit(
      {
        plan: planPath,
        repoDir,
        declared: [],
        skipped,
        missing: [],
        complete: false,
        verdict: "inconclusive",
        reason: `no concrete back-tick paths under \`## Files\` in ${planPath}`,
      },
      2
    );
  }

  // The completeness test: every concrete declared path must resolve to an existing filesystem entry.
  const missing = declared.filter((p) => {
    const abs = isAbsolute(p) ? p : resolve(repoDir, p);
    return !existsSync(abs);
  });

  const complete = missing.length === 0;
  emit({ plan: planPath, repoDir, declared, skipped, missing, complete, verdict: complete ? "complete" : "incomplete" }, complete ? 0 : 1);
}

// Entry guard. It arrived with the loop-run-report increment because `pathsFromPlanFiles` was EXPORTED
// from here and an unconditional `main()` would have run the whole CLI on every `import`. That export has
// since moved to plan-files-core.mjs, so this file exports nothing and the guard is no longer LOAD-BEARING
// — it is kept as ordinary CLI hygiene, and the comment is corrected rather than left asserting a reason
// that no longer holds. `import.meta.main` is the form .dev/floor/entry-point-guard.test.mjs pins; the two
// `file://`-template spellings it BANS are measured silent no-ops on spaced, non-ASCII and symlinked paths
// (L25). Invoked as a CLI this is unchanged.
if (import.meta.main) main();
