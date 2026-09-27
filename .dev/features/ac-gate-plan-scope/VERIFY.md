# VERIFY — ac-gate-plan-scope

`/pharn-dev-verify` over the repository with this increment in it: each deterministic gate run and its exit code
recorded, the map handed to `pharn/floor/check-verify.mjs` (the FLOOR verdict — `PASS` iff every gate exits 0). The
machine report is `verify-report.json`: the helper's output verbatim, plus the advisory `verifiers` block.

This is the run **after merging `origin/main`** (`c1bf663`) and renumbering to 6.30.0. The pre-merge run read `PASS`
with every gate at 0 (reconcile `CLEAN`, 32 paths); its record is in this file's git history.

## Gates (exit codes)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 4170 tests, 4170 pass)                                                | 0    |
| `validate` (`FLOOR: GREEN — 36 capabilities checked`)                                      | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`)                                | 1    |

**VERIFY: FAIL — failing gate: `reconcile`.** That is the floor verdict, recorded as it was printed. It is not
overridden here.

## Why `reconcile` is red, and what was checked

The reconcile epoch is the one the build anchored at 15:58:50Z, before the merge, under this plan's scope
(`--by pharn-dev-build`). The merge of `origin/main` then brought in three pull requests' files (#286, #287 and #290,
`70cb51c..c1bf663`). They changed after the anchor and are outside this plan's scope, so the checker lists each one as
an escape, `denied_by: writes-scope (snapshot)`. The orchestrator said to expect this and to confirm it by set
difference:

- `reconcile` reconciled 83 paths and reported **50 escapes**.
- `git diff --name-only 70cb51c c1bf663` lists 56 paths.
- **Escapes minus that list = the empty set.** Every escape is a file main changed, and no path this increment wrote
  escaped. The other six paths main changed are all in this plan's `## Files` too (`CHANGELOG.md`, `CLAUDE.md`,
  `README.md`, `SKILLS_VERSION`, `pharn/floor/render-run-report.mjs` and its test), so the scope admits them. The escapes group as `.dev/features/cost-ledger-run-scope/` (9), `.dev/features/stage-git-maxbuffer/` (9),
  `pharn/floor/` sources, tests and fixtures, `pharn/pharn-contracts/cost-ledger.md`, `CONTRIBUTING.md`, `SECURITY.md`
  and one `.dev/measurements/` file.
- `exempted` holds this feature's own pipeline artifacts and `docs/lessons-index.md`, which
  `/pharn-dev-memory-promote` regenerated when it promoted L65. There are no `warnings`.

The baseline was **not** re-anchored, deleted or edited to turn this green (CLAUDE.md, "Writes-scope"). A set
difference is the orchestrator's own check. It is not a floor verdict, and it means only that every escape named was
a file main changed. It never means no escape occurred (`pharn/pharn-contracts/reconciliation-record.md`).

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

## How this stage ran (advisory orchestration)

The pinned `$?`-capture lines are refused in this isolated worktree, so a scratch node runner (kept outside the
repository, so `lint` never read it) ran each gate as an argv array, recorded each exit code into
`.pharn/pharn-dev-verify/results.json`, and called `check-verify.mjs` over it. The map was written by the runner, never
typed. The set difference was computed by a `node -e` over `reconcile.json` and the `git diff` list. The machine's load
average fell from about 100 to about 24 during the run. No timing test failed.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
