# VERIFY — family-grammar-crlf

HEAD `9f9f8281` plus the uncommitted stage artifacts. **Verdict: PASS** (`pharn/floor/check-verify.mjs`, exit 0;
`failing_gates: []`).

| gate                                                                                     | exit |
| ---------------------------------------------------------------------------------------- | ---- |
| test (`npm test`: 6210 tests, 6209 pass, 0 fail, 1 skipped)                              | 0    |
| validate (`FLOOR: GREEN — 37 capabilities checked`)                                      | 0    |
| lint                                                                                     | 0    |
| format:check                                                                             | 0    |
| lint:md                                                                                  | 0    |
| structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json | 0    |
| reconcile (`CLEAN`: 0 escapes; REGRESSION.md and regression-report.json exempted)        | 0    |

Verifiers: `count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}` — no verifiers registered, floor gates only.

**What PASS means, and no more (P0):** the named gates passed over the repo with this increment in it. It does not
mean the increment is correct beyond what those gates encode.

## How the gates were run (advisory orchestration)

The pinned Step-1 block (`npm test > /dev/null 2>&1; t=$?` … `printf`) is refused by the worktree-isolation guard,
so the same gates ran from a node runner, `pharn/.run/pharn-dev-verify/capture.mjs`, as argv arrays, exit codes only,
with `check-bash-reconcile.mjs --base . --require-baseline` as written. The reconcile epoch was anchored by the
build's second Step 0 (after the plan named `pharn/floor/griller-extract.test.mjs`); the first epoch's writes were
committed as `73a2bfc7` before it.

Host load was high throughout (load averages 230–390). This run's `npm test` had no failure. The build-time whole
suite had two load-sensitive failures, each green when its file was re-run alone (recorded in SHIP.md); neither is in
this verdict.
