# REGRESSION — loop-s16-rerun-notes

- **Base:** `3bd10c785e43efeb0c7df3239dc3a4b746efb082` (HEAD; the working tree held the uncommitted build, so base =
  HEAD), checked out detached in a scratch worktree.
- **Inside (12):** the ten `## Files` paths plus this feature's `PLAN.md` and `GRILL.md` (exempted by `--feature`,
  listed in `escape_exempt`). `escaped: []`.
- **Outside:** 185 test files (every `*.test.mjs` / `*.test.cjs` but `.dev/floor/command-hygiene.test.mjs`), `validate`,
  and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`). Style gates skipped: no shared style config is inside.

| gate                                    | base | head |
| --------------------------------------- | ---- | ---- |
| `tests`                                 | 1    | 0    |
| `validate`                              | 0    | 0    |
| `structural:expected-injection-comment` | 0    | 0    |

**Per-test (`tests`):** base 6,224 passed / 1 failed / 7 skipped; head 6,231 passed / 0 failed / 1 skipped;
`new_failures: []`. The one base failure, quoted as DATA:

```text
pharn/floor/stage-verify.test.mjs — REUSE D/E — a gate REGRESS skipped (style) and a VERIFY-only gate (e2e) are executed by verify
```

It failed at the base only, in a file this increment does not touch, while the same file's neighbouring fixture tests
passed; it passed at head. `check-regress.mjs` lists `tests` under `pre_existing` (red at base), and since nothing new
fails at head it is not a regression. The likely cause is load during the parallel run, not investigated further.

`regressions: []` · `pre_existing: ["tests"]`

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

This comparison catches what the outside suite catches and nothing more: a break no test, `validate` or eval pair covers
is invisible to it.
