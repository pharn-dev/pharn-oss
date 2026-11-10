# REGRESSION — spec-unscopable-criteria

- base: `1b4271ea2dd84a1d3943b1e11609b73f07e05018` (working-tree build → `base = HEAD`)
- inside (17 paths): the plan's 15 `## Files` paths that changed, plus this feature's `PLAN.md` and `GRILL.md`
  (`escape_exempt`). `escaped`: none.
- outside: 181 test files, `validate`, and one eval pair (`trust-fence` expected ↔ `.dev/features/trust-fence/findings.json`).
- style gates: skipped at both sides. No shared style config is inside.

| gate                                         | base | head |
| -------------------------------------------- | ---- | ---- |
| `tests` (181 outside files, per-test record) | 0    | 0    |
| `validate`                                   | 0    | 0    |
| `structural:…/expected-injection-comment`    | 0    | 0    |

Per-test: base 6038 passed / 0 failed / 7 skipped; head 6044 passed / 0 failed / 1 skipped; `new_failures`: none.

`regressions[]`: none · `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This covers what the suite catches, nothing more: a breakage that no test, rule or eval covers cannot show here.
