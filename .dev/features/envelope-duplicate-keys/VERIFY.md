# VERIFY — envelope-duplicate-keys

**VERIFY: FAIL (`check-verify.mjs` exit 1). The one failing gate is `test`, red only because of seven
timing-sensitive tests outside this increment.** `verify-report.json` is the helper's verdict JSON, verbatim, with
the advisory `verifiers` block merged in.

| gate                                     | exit |
| ---------------------------------------- | ---- |
| `test` (`npm test`)                      | 1    |
| `validate`                               | 0    |
| `lint`                                   | 0    |
| `format:check`                           | 0    |
| `lint:md`                                | 0    |
| `structural:…expected-injection-comment` | 0    |
| `reconcile`                              | 0    |

## The `test` gate

7 of 5841 tests failed: 5833 passed, 1 skipped. Every one of them sits in a suite that spawns nested worktrees and
runs git under a time budget:

- `entry-base-evidence.test.mjs` × 5
- `stage-verify.test.mjs` × 1, the "budget clock" case with a 2 s window
- `stage-regress.test.mjs` × 1, "never recorded — a timed-out base gate"

Their durations run from 17 to 83 s, on a machine shared with at least three sibling sessions running the same
suites. The five `entry-base-evidence` cases also failed at the regress BASE (`dd69efd5`, before this increment's changes).
The other two are different budget and timeout cases from the same family: the BASE run failed a third one, "P2-C
(f2) — a timed-out base gate", which passed here. These are
the "known load-timing tests" the batch brief names. **None of them is in a suite this increment touches.** Its
seven changed suites pass in full (`BUILD.md`).

Under the delegated GATE 2 rule, a load-timing-only verify FAIL may proceed, and CI measures `npm test` on an
unloaded runner. That rule is a model decision made under the orchestrator's delegation. It is not a floor verdict,
and nothing here turns the FAIL into a PASS.

## The `reconcile` gate

The gate is `CLEAN` from the epoch anchored by `/pharn-dev-build`: 21 paths reconciled, no escapes. Three stage
artifacts are exempt. **Bound:** CLEAN means no escape was detected, never that none occurred. The writes made with
Bash inside the scope (`SKILLS_VERSION`, the README badge) are not escapes, because the guards would have allowed
them. `BUILD.md` says so.

## Advisory layer

`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`: no verifiers are registered, so this run used floor gates
only.

The gates ran from a scratch node runner, `.pharn/envelope-duplicate-keys/verify.mjs`, using argv arrays. The pinned
`; t=$?` and `printf` forms are refused in an isolated worktree.

## Re-run after the review fix (R1) and the `origin/main` merge

`verify-report.json` above is run 1, kept verbatim. Run 2 came after `cost-ledger.md` (R1) and after merging
`origin/main` at 6.71.2, and the branch is renumbered to 6.71.3. Run 2 also `check-verify.mjs` exit 1, FAIL:

| gate                                     | run 2 | why                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test`                                   | **0** | 5878 of 5879 passed, 1 skipped. With less load, the timing tests passed.                                                                                                                                                                                  |
| `validate`                               | 0     |                                                                                                                                                                                                                                                           |
| `lint`                                   | 1     | The only error was in this run's own gitignored scratch, `.pharn/envelope-duplicate-keys/renumber-check.mjs` (`no-useless-assignment`). After the scratch sources were deleted, `npm run lint` exits 0.                                                   |
| `lint:md`                                | 1     | The only error was in scratch, `.pharn/envelope-duplicate-keys/my-entry.md` (MD012). After deleting it, `npm run lint:md` exits 0.                                                                                                                        |
| `format:check`                           | 0     |                                                                                                                                                                                                                                                           |
| `structural:…expected-injection-comment` | 0     |                                                                                                                                                                                                                                                           |
| `reconcile`                              | 1     | `ESCAPE`, one path. `pharn/pharn-contracts/cost-ledger.md` is `plan-widened-after-anchor`, the R1 fix recorded in PLAN "Amendment 1" and accepted at the delegated GATE 2. The merge's 24 paths are classified `merged`, not escapes. CI has no baseline. |

The per-gate re-runs after the scratch cleanup (`lint` 0, `lint:md` 0, `format:check` 0) are single commands, not a
new `check-verify.mjs` verdict. The floor verdict of record stays FAIL. Proceeding past it is a model decision under
the delegated GATE 2.
