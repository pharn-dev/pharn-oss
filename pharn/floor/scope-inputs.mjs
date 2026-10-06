// pharn/floor/scope-inputs.mjs — the regress partition's TWO INPUT SETS, computed by code: the declared writes and the
// changed paths (6.28.0, loop-quick-mode GATE 2, review F1). ONE owner (L35): `stage-regress.mjs`'s partition phase and
// `quick-scope-core.mjs` (the checker behind `check-quick-scope.mjs`, the scope check `/pharn-ship --quick` and
// `/pharn-loop --quick` keep) both call these two functions, so the quick modes compare exactly the sets
// `/pharn-regress`'s script compares, and nobody re-types either.
//
// WHY IT EXISTS (the recorded failure, P7): 6.25.0's quick scope line had the MODEL list both sets and paste them into
// double-quoted shell arguments. In the review's reproductions a file named `src/$(touch INJECTED).js` ran in the
// orchestrator's shell, and an untracked `src/x$Q.js` or a name holding a comma read as a declared path — a false pass
// (`.dev/features/loop-quick-mode/REVIEW.md`, F1). Here both sets are built from files and git output and handed back
// as ARRAYS; nothing reaches a shell.
//
//   declaredWrites(planText, acTestsPath) — PLAN.md's `## Files` paths (the caller reads PLAN.md, so each keeps its
//       own refusal for an unreadable one) ∪ AC-TESTS.md's `## Files` paths when that file exists and parses, each
//       through plan-files-core.mjs's `clean`, de-duplicated in first-seen order. An unparseable PLAN is a refusal; an
//       unparseable AC-TESTS.md adds nothing — the direction that can only widen the escaped set. The grammar is
//       plan-files-core.mjs's; this module adds only the union.
//   changedPaths(base) — `git diff --name-only --no-renames -z <base>` ∪ `git ls-files -z --others --exclude-standard`,
//       NUL-split, de-duplicated, minus the state root (worktree-fingerprint.mjs's `isExcluded`). Each path is the name
//       git printed, decoded as UTF-8: never trimmed, never C-quoted, never split on anything but NUL.
//   defaultTestUniverse() (6.49.0, entry-run-as-base-evidence) — regress's DEFAULT test universe (no `--tests`):
//       `git ls-files -z --cached --others --exclude-standard` filtered by stage-regress-core.mjs `isTestFile`
//       (TEST_FILE_RULE), in git's order. Moved here from `stage-regress.mjs` `computeTests` so the entry check's
//       `base:test` slot (entry-gates.mjs) lists its files with the SAME call regress makes (L35); the partition then keeps
//       those not changed since base. Only byte equality of the two lists ever reuses anything, so a divergence here can
//       only make regress MISS.
//
// NO EMISSION, NO REASON CODES: each function RETURNS `{ok: true, value}` or `{ok: false, …}`, and its caller words the
// refusal — when this module was cut out of `stage-regress.mjs` (6.28.0), that script kept every detail string it
// printed before. A failed git listing carries `detail`, stage-runtime.mjs's `gitFailureDetail` text (6.28.3): git's
// stderr and node's error code, so the caller's refusal says why git failed. It replaced a raw `stderr` field, which an
// ENOBUFS left empty.
//
// BOUNDS, stated: a git-ignored path is never listed, so it is outside every caller's partition; a name that is not
// valid UTF-8 is compared in its U+FFFD-replaced form, so only a declared pattern containing U+FFFD could match it;
// `base` is passed to git as given — each caller validates it as a 40-hex commit first; a file named exactly like
// `base` makes git's revision argument ambiguous, and git then fails (a refusal, never a pass).
//
// LOAD GRAPH: node:fs, and four floor modules already in `stage-regress.mjs`'s graph — plan-files-core.mjs (zero
// imports), stage-runtime.mjs (`gitSync`, `nulList`), worktree-fingerprint.mjs (`isExcluded`) and, since 6.49.0,
// stage-regress-core.mjs (`isTestFile`; it imports gate-run-core.mjs alone). Imported as
// `"./scope-inputs.mjs"`, so stage-regress.test.mjs's fixture closure (string-literal module names) copies it.
//
// TRUST (P2): `## Files` text and git paths are untrusted, attacker-nameable strings. They are returned as data, never
// evaluated; git runs as an argument vector.

import { existsSync, readFileSync } from "node:fs";
import { pathsFromPlanFiles, clean } from "./plan-files-core.mjs";
import { gitSync, nulList } from "./stage-runtime.mjs";
import { isExcluded } from "./worktree-fingerprint.mjs";
import { isTestFile } from "./stage-regress-core.mjs";

/**
 * The declared writes: PLAN.md's `## Files` ∪ AC-TESTS.md's `## Files` (when present and parseable), cleaned, unique.
 * @param {string} planText     PLAN.md's full text (the caller reads the file)
 * @param {string} acTestsPath  the feature's AC-TESTS.md path, repo-relative
 * @returns {{ok: true, value: string[]} | {ok: false, reason: string}}
 */
export function declaredWrites(planText, acTestsPath) {
  const parsedPlan = pathsFromPlanFiles(planText);
  if (!parsedPlan.ok) return { ok: false, reason: parsedPlan.reason };
  let declared = parsedPlan.value.map(clean);
  if (existsSync(acTestsPath)) {
    const acParsed = pathsFromPlanFiles(readFileSync(acTestsPath, "utf8"));
    if (acParsed.ok) declared = declared.concat(acParsed.value.map(clean));
  }
  return { ok: true, value: [...new Set(declared)] };
}

/**
 * The changed paths since `base`: tracked changes (renames split into a deletion and an addition) plus untracked files,
 * NUL-separated, minus the state root.
 * @param {string} base  a commit the caller already validated
 * @returns {{ok: true, value: string[]} | {ok: false, which: "diff" | "untracked", detail: string}}
 */
export function changedPaths(base) {
  const diff = gitSync(["diff", "--name-only", "--no-renames", "-z", base]);
  if (!diff.ok) return { ok: false, which: "diff", detail: diff.detail };
  const untracked = gitSync(["ls-files", "-z", "--others", "--exclude-standard"]);
  if (!untracked.ok) return { ok: false, which: "untracked", detail: untracked.detail };
  const all = [...new Set([...nulList(diff.stdout), ...nulList(untracked.stdout)])];
  return { ok: true, value: all.filter((p) => !isExcluded(p, null)) }; // the state root is never an escape
}

/**
 * Regress's default test universe: every tracked or untracked-not-ignored path TEST_FILE_RULE names, in git's order.
 * @returns {{ok: true, value: string[]} | {ok: false, detail: string}}
 */
export function defaultTestUniverse() {
  const r = gitSync(["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  if (!r.ok) return { ok: false, detail: r.detail };
  return { ok: true, value: nulList(r.stdout).filter(isTestFile) };
}
