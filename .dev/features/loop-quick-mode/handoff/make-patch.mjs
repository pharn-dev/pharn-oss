#!/usr/bin/env node
// .dev/features/loop-quick-mode/handoff/make-patch.mjs — generate the HUMAN-ONLY patch for LIMITS.md §3a and §6 that
// this increment's build cannot write itself (fix #2: the trusted docs are Write/Edit/MultiEdit/NotebookEdit-denied).
// Committed under `handoff/`, as 3.1's generator is, so the orchestrator can RE-RUN it after a sibling phase merges and
// moves LIMITS.md (PLAN.md, "Chain sequencing", items 2 and 3): `stage-model-routing` patches LIMITS §8, and whichever
// LIMITS patch lands second is regenerated from the post-merge file.
//
// IT NEVER WRITES A TRUSTED-DOC PATH, not even a scratch copy under that name. It reads LIMITS.md, computes the edited
// text ENTIRELY IN MEMORY, and writes only: scratch under `.pharn/pharn-dev-build/loop-quick-mode-patch/` (named
// `limits.before` / `limits.after`, never `.md` — removed before exit, success or failure), and
// `../proposed/human-only.patch` + `../proposed/human-only.sha256` beside this script. The human applies the patch with
// `proposed/apply.sh` at GATE 2 (see APPLY.md), which is the only step that writes LIMITS.md.
//
// THE CHECKS ARE 3.1's, IMPORTED — never copied (L35): `applyOnce` (every edit's find matches exactly once),
// `markerPreservationReds` (a registered `.dev/floor/specified-primitives.json` marker string is present after the edit
// iff it was before), `checkFive` (validate.mjs CHECK 5's predicate, in memory), `hashDoc` and `FailedGeneration` all
// come from `.dev/features/ship-quick-mode/handoff/make-patch.mjs`, whose CLI is guarded by `import.meta.main`, so
// importing it runs nothing. They are re-exported below so BUILD.md's refusal probes call the very functions this
// generator uses. One check is this file's own: NO CR in the edited text, because `human-only.sha256` is checked by
// `shasum -c` over RAW bytes while `hashDoc` folds CRLF — on an LF file the two agree, and this makes that a check.
//
// ORDER (the 3.1 GATE-2 fix, kept): every in-memory check, then `git apply --check` on STDIN against the live working
// tree, and only then are the two proposed/ files written — so a refused patch leaves any previous pair untouched and a
// fresh patch never sits beside stale sums.
//
// Usage: node .dev/features/loop-quick-mode/handoff/make-patch.mjs   (run from the repo root)
// Exit: 0 — the patch and its sums were written; stdout prints the sums line.
//       1 — a `find` matched zero or more than once, a marker moved, CHECK 5 failed, a CR appeared, or `git apply
//           --check` refused the assembled patch. Nothing is written on the patch side; the scratch dir is removed.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { applyOnce, markerPreservationReds, checkFive, hashDoc, FailedGeneration } from "../../ship-quick-mode/handoff/make-patch.mjs";

export { applyOnce, markerPreservationReds, checkFive, hashDoc, FailedGeneration };

const REPO = process.cwd(); // run from the repo root, exactly as the build procedure pins it
const LIMITS_PATH = join(REPO, "LIMITS.md");
const MARKERS_JSON = join(REPO, ".dev", "floor", "specified-primitives.json");
const SCRATCH = join(REPO, ".pharn", "pharn-dev-build", "loop-quick-mode-patch");
const PROPOSED = join(REPO, ".dev", "features", "loop-quick-mode", "proposed");

// ── §3a: 3.1's paragraph names "the manual flag"; it becomes the GATED one, and the unattended one follows ──────────
export const S3A_FLAG_FIND =
  "> **The manual flag is `/pharn-ship --quick` (6.25.0), and it trades checks for cost.** A human chooses it for\n";
export const S3A_FLAG_REPLACE =
  "> **The gated manual flag is `/pharn-ship --quick` (6.25.0), and it trades checks for cost.** A human chooses it for\n";

export const S3A_TAIL_FIND =
  "> chose, and a quick SPEC run without the flag takes the full pipeline. There is still no AUTOMATIC\n> proportionality, and `/pharn-review`'s lens fan-out is unchanged.\n";
export const S3A_TAIL_REPLACE =
  S3A_TAIL_FIND +
  ">\n" +
  "> **The unattended one is `/pharn-loop --quick` (6.27.0), and nobody is told the trade before it runs.** The model\n" +
  "> writes and approves the `spec_kind: quick` SPEC itself (`approved_by: model`), and `check-loop.mjs` decides every\n" +
  "> stop over `/pharn-verify`'s verdict alone. The decision's mode is that SPEC's pinned kind, never a flag, so a full\n" +
  "> SPEC still needs a regression verdict. It keeps the grill's floor stops, the test-first evidence, the scope check\n" +
  "> (within the bounds §6 states for that check; it leaves no record, so nothing after its iteration re-checks it) and\n" +
  "> the freshness check (a quick run's verify evidence must still describe the live tree and reproduce from its\n" +
  "> stamp). It leaves out the regression check, the plan interrogation and `RUN-REPORT.md` (`cost.json` is still\n" +
  "> written). Its green stop is `STOP_GREEN_QUICK`, which is not `STOP_GREEN` and claims no regression check; the\n" +
  "> record, the commit message and the summary name the mode after the run. The person who typed `--quick` chose it,\n" +
  "> and the model's reading of that flag is advisory, as for `/pharn-ship`.\n";

// ── §6 (GATE 1, Q1 → (a)): the scope check's first bound gains every /pharn-loop --quick iteration ─────────────────
// GATE 2 (review F1): the quick modes no longer paste model-assembled lists into `check-regress.mjs scope`; the new
// `check-quick-scope.mjs` applies the same rule to inputs it builds by code, so the clause names that mechanism rather
// than "which run the same partition".
export const S6_FIND =
  "  `/pharn-regress` runs — or, since 6.25.0, `/pharn-ship --quick`'s item 7, which runs the same partition\n" +
  "  without the rest of that stage; it compares _changed since base_, not _written by the build_; it carries\n";
export const S6_REPLACE =
  "  `/pharn-regress` runs, or when `check-quick-scope.mjs` (6.27.0) applies that rule — for `/pharn-ship --quick`'s\n" +
  "  item 7 and for every `/pharn-loop --quick` iteration — to inputs it builds by code exactly as that stage's script\n" +
  "  does, without the rest of that stage; it compares _changed since base_, not _written by the build_; it carries\n";

/** The whole in-memory edit: every find must match exactly once (applyOnce throws FailedGeneration otherwise). Pure. */
export function editLimits(original) {
  let t = applyOnce(original, S3A_FLAG_FIND, S3A_FLAG_REPLACE, "LIMITS.md §3a (the gated manual flag)");
  t = applyOnce(t, S3A_TAIL_FIND, S3A_TAIL_REPLACE, "LIMITS.md §3a (the unattended flag)");
  t = applyOnce(t, S6_FIND, S6_REPLACE, "LIMITS.md §6 (the scope check's first bound)");
  return t;
}

/** Every registered marker site in the manifest, flattened the way 3.1's generator flattens it. */
export function markerSites(manifest) {
  const sites = [];
  for (const p of manifest.specified_primitives ?? []) for (const s of p.sites ?? []) sites.push(s);
  for (const a of manifest.named_artifacts ?? []) sites.push({ file: a.cited_in, marker: a.citation });
  for (const c of manifest.forward_claims ?? []) for (const s of c.sites ?? []) sites.push(s);
  return sites;
}

const fail = (msg) => {
  throw new FailedGeneration(msg);
};

function main() {
  let before;
  try {
    before = readFileSync(LIMITS_PATH, "utf8");
  } catch (e) {
    fail(`cannot read LIMITS.md: ${e.message}`);
  }
  const after = editLimits(before);

  // (a) marker preservation, against every site the manifest registers for LIMITS.md.
  const reds = markerPreservationReds({
    file: "LIMITS.md",
    before,
    after,
    sites: markerSites(JSON.parse(readFileSync(MARKERS_JSON, "utf8"))),
  });
  if (reds.length) fail(reds[0]);
  // (b) CHECK 5, on the edited text.
  const five = checkFive(after);
  if (!five.ok) fail(`CHECK 5: LIMITS.md's edited text ${five.reason}`);
  // (c) no CR — the sums are raw-byte sums.
  if (after.includes("\r")) fail("LIMITS.md's edited text contains a CR — shasum -c over the raw bytes would disagree with hashDoc");

  // Diff scratch copies whose names are never a trusted path, then rewrite git's headers to the real path.
  rmSync(SCRATCH, { recursive: true, force: true });
  mkdirSync(SCRATCH, { recursive: true });
  writeFileSync(join(SCRATCH, "limits.before"), before);
  writeFileSync(join(SCRATCH, "limits.after"), after);
  const d = spawnSync("git", ["diff", "--no-index", "--", "limits.before", "limits.after"], { cwd: SCRATCH, encoding: "utf8" });
  if (d.status === 0) fail("LIMITS.md: the edited text is byte-identical to the original — nothing to patch");
  if (d.status !== 1) fail(`LIMITS.md: git diff --no-index exited ${d.status} unexpectedly: ${d.stderr}`);
  const patchText = d.stdout.split("a/limits.before").join("a/LIMITS.md").split("b/limits.after").join("b/LIMITS.md");

  // git apply --check against the REAL working tree, on STDIN — BEFORE either proposed/ file is written.
  const check = spawnSync("git", ["apply", "--check", "-"], { cwd: REPO, input: patchText, encoding: "utf8" });
  if (check.status !== 0) fail(`git apply --check refused the assembled patch: ${check.stderr || check.stdout}`);

  mkdirSync(PROPOSED, { recursive: true });
  writeFileSync(join(PROPOSED, "human-only.patch"), patchText);
  const sums = `${hashDoc(after)}  LIMITS.md\n`;
  writeFileSync(join(PROPOSED, "human-only.sha256"), sums);
  process.stdout.write(sums);
}

// Run as a CLI only when invoked directly, so BUILD.md's probes can import the checks without generating anything.
if (import.meta.main) {
  try {
    main();
  } catch (e) {
    if (!(e instanceof FailedGeneration)) throw e; // an unexpected bug — surface the real stack
    console.error(`make-patch: ${e.message}`);
    process.exitCode = 1;
  } finally {
    rmSync(SCRATCH, { recursive: true, force: true }); // scratch is never the artifact
  }
}
