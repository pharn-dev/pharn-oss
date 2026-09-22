# REGRESSION — cost-ledger-path-free-notes

- base: `cd764cc10e1d3cace163950f19cc7d75ac92f6cb` (working-tree dogfood → `base = HEAD`)
- inside (7): the feature's `PLAN.md` / `GRILL.md`, `CHANGELOG.md`, `README.md`, `SKILLS_VERSION`, `pharn/floor/render-cost-ledger.mjs`, `pharn/floor/render-cost-ledger.test.mjs`
- `scope`: `escaped: []`; `escape_exempt`: the feature's `PLAN.md`, `GRILL.md`
- outside: 87 test files, 1 committed eval pair (trust-fence)
- style gates: skipped. `inside` touches no shared style config, so they appear in neither map.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (87 outside files)                                                                 | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

- regressions: none
- pre_existing: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** The check catches what the suite catches and nothing more. It certifies only the base-vs-head comparison, never that the feature is correct.
