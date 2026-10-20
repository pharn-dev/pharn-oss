# REGRESSION — test-infra-pin-all-gates

- base: `5b468d6680808eb30bc03f6bcc8d1d2493c9730f` (working-tree dogfood, `git status` non-empty → `base = HEAD`)
- machine report: `regression-report.json` (the `check-regress.mjs verdict` JSON, verbatim)

## Partition (`check-regress.mjs scope`, exit 0)

- inside: the 17 changed tracked paths of the plan's `## Files` plus this feature's `PLAN.md`, `GRILL.md` and
  `HUMAN-PATCH.md` (see the report's `inside`).
- escaped: none. `escape_exempt`: this feature's `GRILL.md` and `PLAN.md`.
- outside: 158 test files, `validate`, and the one committed eval pair
  (`trust-fence/.../expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`).
- style gates skipped (deterministic rule): no shared style config is inside.

## Gates, base → head (exit codes)

| gate                                                                                     | base | head |
| ---------------------------------------------------------------------------------------- | ---- | ---- |
| tests (158 outside test files)                                                           | 1    | 1    |
| validate                                                                                 | 0    | 0    |
| structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json | 0    | 0    |

- regressions: none
- pre_existing: `tests`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

## The red `tests` gate at BOTH sides — investigated, not just recorded

A red baseline on a repo believed green is a signal to investigate the harness. Both runs went in parallel on a
machine shared with other agents (load average 130–150 during the run). The same window's full `npm test` at HEAD
failed 8 of 5,638 tests, all in two files outside this increment:

- `pharn/floor/entry-base-evidence.test.mjs` (6) — spawn-heavy, background-runner tests (`… never appeared`,
  a `null` result record);
- `pharn/floor/entry-gates.test.mjs` (2) — the background runner killed and taken over mid-gate.

No failing assertion is about the test-infrastructure pin (they count stage passes and exit codes under
`--budget-ms` / `--timeout-ms`), and a paired re-run of both files at base and HEAD, concurrently, failed the same
three tests on both sides (`VERIFY.md`). Because `tests` is one aggregate gate, its
pre-existing red at base would mask a NEW failure in another outside file; the per-test count above (5,629 pass,
failures only in those two files) is what rules that out for this run — advisory evidence, not the floor verdict.

The verdict certifies only the comparison: it catches what the outside suite catches, and nothing more.
