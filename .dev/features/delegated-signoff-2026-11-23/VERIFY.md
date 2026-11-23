# VERIFY — delegated-signoff-2026-11-23

Gates measured by `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`b9586c84…0239`), verdict by `pharn/floor/check-verify.mjs --stamp … --feature delegated-signoff-2026-11-23` (exit 0).

| gate                 | exit | duration (ms) |
| -------------------- | ---: | ------------: |
| `test`               |    0 |       565,193 |
| `validate`           |    0 |           125 |
| `lint`               |    0 |         4,801 |
| `format:check`       |    0 |        31,394 |
| `lint:md`            |    0 |        11,521 |
| `instruction-growth` |    0 |           224 |
| `reconcile`          |    0 |           220 |

**VERIFIED: floor gates PASS.**

- **Completeness:** both `## Files` paths exist (the verdict is not `INCOMPLETE`).
- **Reconcile:** `CLEAN`, epoch `2026-11-23T17:15:08.885Z` anchored by `pharn-dev-build`, `escapes: []`, `merged: []`;
  exempted as pipeline artifacts: this feature's `REGRESSION.md` and `regression-report.json`.
- **Verifiers:** no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

## Orchestration notes (advisory)

- **The epoch was re-anchored twice.** `origin/main` moved during the run (#468, then #469). Each time the branch merged
  `origin/main` (a merge, not a rebase) and the build's Step 0 was re-run: the setter `--from-plan`, then `--anchor`.
  The build's two files were committed before the last anchor, so this `reconcile` window (anchor → verify) holds no
  build write: `reconciled: 0`. What the window covers is regress and verify; the build's own writes were made with the
  Write/Edit tools under the plan's two-path scope, which the writes-scope hook judged at the time, and its two
  formatter runs named those paths only. Re-anchoring was not done to silence a RED: no reconcile had run before it.
- **The `run --next` calls ran one at a time from one background node process** (`spawnSync`, scratchpad), not as one
  Bash call each, because this isolated worktree's guard refuses the pinned compound forms. Each call's exit and
  `finalized` field were read before the next.
- **Devdependencies:** this worktree had no `node_modules`, so `npx` resolved the main checkout's stale prettier
  3.9.10. `npm ci` ran in the worktree before `init` (prettier 3.10.1 after it), and the increment's files were checked
  against 3.10.1 before the gates ran.
- **Heavy lock and load:** the stage ran under the batch's heavy lock (`owner` CORE-314), released right after the last
  gate. 1-minute load at start 3.73, after the last gate 3.17.
