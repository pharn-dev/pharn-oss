# REGRESSION — spec-template

Three runs are recorded here: iteration 1 after the build, iteration 2 after the GATE-2 fix round ("fix
all 10"), and iteration 3 after the fixes to the re-review's findings. `regression-report.json` holds
iteration 3's verdict JSON, byte-for-byte as the helper printed it.

- **Base (all three):** `2bea57cb8ce0b536cb137208280b74760573f22f`. The working tree was dirty (an uncommitted
  build), so `base = HEAD`.
- **Style gates skipped (all three):** `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`,
  `.prettierignore` or `.markdownlint-cli2.jsonc`, so a style flip over the outside files is impossible.
- **The eval-pair paths were confirmed readable before every run.**

## Iteration 3 — after the re-review's fixes (current)

The same 22 inside paths, `escaped: []`, and the same 92 outside test files, validate and eval pair. Each
gate is 0 → 0: `tests`, `validate`, and
`structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`.
`regressions[]` and `pre_existing[]` are both empty.

**Verdict** (deterministic — `pharn/floor/check-regress.mjs verdict`, exit 0): **REGRESSIONS: none —
no deterministically-detectable breakage outside the feature.**

## Iteration 2 — after the fix round

- **Inside** (22 paths): the 15 `## Files` paths — iteration 1's 13, plus the new
  `pharn/floor/spec-template-core.mjs` and `pharn/floor/check-loop-fresh.test.mjs` — and this feature's
  seven stage artifacts.
- **Scope check:** `check-regress.mjs scope` exit 0 and `escaped: []`. `escape_exempt` is this feature's
  own `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `REVIEW.md`, `VERIFY.md` and two report JSONs.
- **Outside gates:** `tests` (92 test files; `check-loop-fresh.test.mjs` is now inside), `validate`, and
  `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none · `pre_existing[]`: none.

**Verdict** (deterministic — `pharn/floor/check-regress.mjs verdict`, exit 0): **REGRESSIONS: none —
no deterministically-detectable breakage outside the feature.**

## Iteration 1 — after the build

The inside set was 15 paths (13 `## Files` + `PLAN.md`, `GRILL.md`), with 93 outside test files. The same
three gates were 0 → 0, and the verdict was `no-regressions` (exit 0).

## Honest residual

This certifies the comparison and nothing more. The stage catches what the outside suite, validate and the
committed eval pair catch. It says nothing about the correctness of the changed files; that is
`/pharn-dev-verify`'s and `/pharn-dev-review`'s job.
