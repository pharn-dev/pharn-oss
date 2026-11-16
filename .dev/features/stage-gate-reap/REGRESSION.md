# REGRESSION — stage-gate-reap

- Base: `e11a8ac6f519c0fdbd2b45e0c8846776bb0a7764` (the working tree was dirty, so base = HEAD, per Step 1.1). That
  commit is `origin/main` (edd15ea4, 7.15.0) plus this feature's PLAN.md and GRILL.md.
- Machine report: `regression-report.json` (the `check-regress.mjs verdict` JSON, verbatim). Verdict exit: `0`.

## Partition

Inside (the changed scope, 11 paths): `.dev/features/stage-gate-reap/PLAN.md`, `.dev/guides/floor-gates.md`,
`CHANGELOG.md`, `README.md`, `SKILLS_VERSION`, `pharn/floor/run-gates.mjs`, `pharn/floor/stage-direct.mjs`,
`pharn/floor/stage-direct.test.mjs`, `pharn/floor/stage-regress.mjs`, `pharn/floor/stage-verify.mjs`,
`pharn/floor/stage-gate-reap.test.mjs`.

`check-regress.mjs scope` exit 0: no escape. `escape_exempt`: `.dev/features/stage-gate-reap/PLAN.md` (this feature's
own artifact; its one post-commit edit is the GATE 1 record line, made before the build's anchor).

Outside: 193 test files, plus the one committed eval pair
(`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`).
Style gates skipped: `inside` touches no shared style config.

## Gates (base → head exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (193 outside files, per-test reporter)                                             | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test: base 6721 passed / 0 failed / 9 skipped; head 6729 passed / 0 failed / 1 skipped. `new_failures`: none.

`regressions[]`: none. `pre_existing[]`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This catches exactly what the suite catches, nothing more: a regression no deterministic check covers is invisible
here.
