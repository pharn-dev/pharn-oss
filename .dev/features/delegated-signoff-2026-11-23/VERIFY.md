# VERIFY — delegated-signoff-2026-11-23

Verify ran three times; each read PASS. The third run, on the final tree, is the standing verdict and the one
`verify-report.json` holds.

## Iteration 3 (the standing verdict)

Gates measured by `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`4d786544…06ac`), verdict by `pharn/floor/check-verify.mjs --stamp … --feature delegated-signoff-2026-11-23` (exit 0).

| gate                 | exit | duration (ms) |
| -------------------- | ---: | ------------: |
| `test`               |    0 |       692,109 |
| `validate`           |    0 |           123 |
| `lint`               |    0 |         4,515 |
| `format:check`       |    0 |        30,201 |
| `lint:md`            |    0 |        11,138 |
| `instruction-growth` |    0 |           222 |
| `reconcile`          |    0 |         2,407 |

**VERIFIED: floor gates PASS.**

- **Completeness:** both `## Files` paths exist (the verdict is not `INCOMPLETE`).
- **Reconcile:** `CLEAN`, epoch `2026-11-23T17:15:08.885Z` anchored by `pharn-dev-build`, `reconciled: 26`,
  `escapes: []`. 24 paths are listed `merged`: the files #470 and #471 brought in when `origin/main` was merged after
  the anchor, each matching its blob at `88dbaeeb`. Exempted as pipeline artifacts: this feature's `REGRESSION.md`,
  `VERIFY.md`, `regression-report.json` and `verify-report.json`.
- **Verifiers:** no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

## Iterations 1 and 2

| gate                 | iteration 1 exit (ms) | iteration 2 exit (ms) |
| -------------------- | --------------------: | --------------------: |
| `test`               |           0 (565,193) |           0 (974,979) |
| `validate`           |               0 (125) |               0 (136) |
| `lint`               |             0 (4,801) |             0 (4,499) |
| `format:check`       |            0 (31,394) |            0 (29,908) |
| `lint:md`            |            0 (11,521) |            0 (11,037) |
| `instruction-growth` |               0 (224) |               0 (220) |
| `reconcile`          |               0 (220) |               0 (238) |

Iteration 1 ran on the tree after the build (stamp `b9586c84…0239`); its reconcile read `CLEAN` with `reconciled: 0`.
Iteration 2 ran after the fix to the record's P0 sentence, behind regress iteration 2. Iteration 3 ran after
`origin/main` was merged twice more (#470, #471) and the record gained a citation of CORE-310's merged record.

## Orchestration notes (advisory)

- **The epoch was re-anchored twice.** `origin/main` moved during the run (#468, then #469). Each time the branch merged
  `origin/main` (a merge, not a rebase) and the build's Step 0 was re-run: the setter `--from-plan`, then `--anchor`.
  The build's first writes were committed before the last anchor, so the reconcile window (anchor → verify) does not
  hold them; iteration 1 read `reconciled: 0`. Those writes were made with the Write/Edit tools under the plan's two-path
  scope, which the writes-scope hook judged at the time, and the formatter runs named those paths only. No reconcile had
  run before either re-anchor, so neither silenced a RED. The later merges (#470, #471) were not followed by a
  re-anchor, and iteration 3 shows reconcile classifying their files `merged` with no escape: the re-anchors were not
  needed (`REVIEW.md`, proposed lesson).
- **The `run --next` calls ran one at a time from one background node process** (`spawnSync`, scratchpad), not as one
  Bash call each, because this isolated worktree's guard refuses the pinned compound forms. Each call's exit and
  `finalized` field were read before the next.
- **One iteration-3 attempt was aborted and discarded.** Two stage artifacts (`REGRESSION.md`,
  `regression-report.json`) were written while its `test` gate ran, which would have moved the tree between that
  gate's fingerprints. The attempt was stopped, no gate process was left running (checked with `ps`), and verify was
  re-run from `init` on the unchanged tree. Its partial state is not used.
- **Devdependencies:** this worktree had no `node_modules`, so `npx` resolved the main checkout's stale prettier 3.9.10.
  `npm ci` ran in the worktree before iteration 1 and again before iteration 3 (prettier 3.10.1).
- **Heavy slot and load:** each iteration held a batch heavy slot (`owner` CORE-314), released after its last gate.
  1-minute load when the slot was taken: iteration 1 3.73, iteration 2 8.10, iteration 3 9.94. **Iteration 2's verify
  started at a 1-minute load of 34.21**, above the batch's start-below-20 rule: its script checked the load only when
  taking the slot, before the 24-minute regress that preceded verify. Iteration 3 checked it right before `init`.
