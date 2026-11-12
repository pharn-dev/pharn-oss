# REGRESSION — loop-amend-exit6

Base: `622d508e` (HEAD — a working-tree build; the maintainer's trusted-doc commit). Verdict by
`pharn/floor/check-regress.mjs verdict --per-test tests` (exit 0).

## Scope

- Inside (9): the plan's seven `## Files` paths plus this feature's `PLAN.md` and `GRILL.md` (`escape_exempt`, written
  under their own stages' scopes). Escaped: none.
- Outside gates, identical on both sides: `tests` (188 outside test files, per-test records), `validate`,
  `structural:expected-injection-comment` (the trust-fence pair, both paths confirmed readable before running). No
  shared style config changed, so the style gates are skipped on both sides.

## Results

| gate                                    | base | head |
| --------------------------------------- | ---- | ---- |
| `tests`                                 | 0    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

Per-test: base 6,297 passed / 0 failed / 7 skipped; head 6,303 passed / 0 failed / 1 skipped. `new_failures: []`. The
six tests skipped at base and passing at head are the same outside files run from the detached base checkout, which has
no `node_modules`; none failed on either side.

**Verdict: `no-regressions`.**

## Second run (after the GATE 2 fix)

The maintainer chose "fix finding 1 first" at GATE 2; the amend branch gained the TaskStop sentence and its pin
(declared files, plan scope). The directory was cleared and the stage re-run against the same base: inside 15 (the six
later stage artifacts added, all `escape_exempt`), escaped none, the same 188 outside test files. Every gate exit 0 on
both sides; base 6,297 / head 6,303 passed, 0 failed, `new_failures: []`. **Verdict: `no-regressions`.**
`regression-report.json` is this run's.

Residual: the comparison covers the outside gates named above — a defect no outside test exercises is not seen.
