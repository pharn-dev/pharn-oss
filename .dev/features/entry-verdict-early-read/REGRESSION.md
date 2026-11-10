# REGRESSION — entry-verdict-early-read

- base: `b751399cc636a93a7be0b1223500fdea1a71eafa` (working-tree build → `base = HEAD`; HEAD is the L84 promotion
  commit, made on this branch after the first run)
- verdict source: `pharn/floor/check-regress.mjs verdict` (exit 0), copied verbatim into `regression-report.json`

## Runs

- **Run 1** (base `ba7b5bb2`, before the GATE-2 fixes): `no-regressions`, the same per-test counts as below.
- **Run 2** (this one, after the four review fixes): the first scope call exited **1**, listing
  `.dev/memory-bank/lessons-learned.md` and `docs/lessons-index.md` as escaped — the L84 promotion's canon write and
  its index regeneration, neither in `## Files`. They were not hand-excluded: at the human's choice they were committed
  alone (`b751399c`), and the scope call was re-run against that base (exit 0).

## Partition

- **inside** (18): the 10 changed paths of the build plus this feature's stage artifacts.
- **escaped**: none. `escape_exempt`: this feature's `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `REVIEW.md`, `SHIP.md`,
  `VERIFY.md`, `regression-report.json`, `verify-report.json` (each written under its own stage's scope).
- **outside**: 182 test files, `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`).
- Style gates skipped at both sides: no shared style config is inside.

## Gates (base → head exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (182 outside files, per-test records)                                              | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test: base 6123 passed, 0 failed, 7 skipped · head 6129 passed, 0 failed, 1 skipped · `new_failures`: none ·
`still_failing`: 0.

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This certifies the comparison only: `/pharn-dev-regress` catches what its deterministic suite catches, nothing more.
