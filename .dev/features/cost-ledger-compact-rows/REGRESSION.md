# REGRESSION — cost-ledger-compact-rows

- base: `b958a12d786297853f6dd6ec5007ce0046a3abae`. That is increment (a)'s commit, and the working tree is
  dirty, so `base = HEAD`. The baseline ran in a detached `git worktree` at that SHA.
- inside (7): the feature's `PLAN.md` and `GRILL.md`, `CHANGELOG.md`, `CLAUDE.md`,
  `pharn/floor/render-cost-ledger.mjs`, its test, and `pharn/pharn-contracts/cost-ledger.md`.
- `scope`: `escaped: []`. `escape_exempt` is the feature's `PLAN.md` and `GRILL.md`.
- outside: 94 test files and 1 committed eval pair (trust-fence). `check-cost-ledger.test.mjs` and
  `render-run-report.test.mjs` are OUTSIDE. They read what this emitter writes, so they are the consumer
  side of the layout change.
- style gates: skipped. `inside` touches no shared style config, so they appear in neither map.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (94 outside files)                                                                 | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- regressions: none
- pre_existing: none

Harness note: as in increment (a), the outside test list ran through the fixed `node --test <list>`
wrapper, because this session's sandbox refuses computed arguments to `node`. It was the same invocation
at base and at head.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The comparison
catches what the suite catches and nothing more. It certifies only the base-versus-head comparison, never
that the feature is correct.
