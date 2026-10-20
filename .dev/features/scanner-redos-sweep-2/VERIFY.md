# VERIFY — scanner-redos-sweep-2

Run on the merged tree (this branch plus `origin/main` at `db261205`, 6.71.1), 2026-10-20, under heavy load from other
sessions' full suites.

| gate                                                                                                     | exit |
| -------------------------------------------------------------------------------------------------------- | ---: |
| `test` (`npm test`: 5,864 tests, 5,860 pass, 3 fail)                                                     |    1 |
| `validate`                                                                                               |    0 |
| `lint`                                                                                                   |    0 |
| `format:check`                                                                                           |    0 |
| `lint:md`                                                                                                |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`               |    0 |
| `reconcile` (`--require-baseline`: `CLEAN`, 0 escapes; the upstream merge's files listed under `merged`) |    0 |

**VERIFY FAILS: gate(s) [test] red — stage FAILS** (`check-verify.mjs` exit 1).

The three failing tests are all in `pharn/floor/entry-base-evidence.test.mjs` (the "★ equivalent environment",
"environment divergence" and "edits a pre-existing test" cases, which ran 52–86 s each). That file is one of the four
known load-timing suites the batch brief names (entry-base-evidence, entry-gates, stage-regress, stage-verify); this
increment touches none of its inputs, and the same `tests` gate was red at both base and head in REGRESSION.md. Every
test in this increment's three files passed inside the same run. Under the orchestrator's delegation ("a local verify
FAIL that is only the known load-timing tests may proceed — CI measures"), the run proceeds to GATE 2. That is a model
decision under delegation; the verdict above stands as computed.

Also run on the merged tree, outside this gate map: `docs:check`, `check:markers`, `check:badge`, `check:changelog`,
`check:contributing`, `check:changelog-entry` and `check:surface-bump` — each exit 0.

Verifiers: no verifiers registered — floor gates only.

Gates ran through `.pharn/pharn-dev-verify/capture.mjs` (`spawnSync` with argv arrays). The pinned `t=$?` / `printf`
forms are refused in this worktree-isolated session. This is an advisory orchestration deviation.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
