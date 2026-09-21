# REGRESSION — drift-audit-6-4-1

**Base:** `d9f21337a5343d95f686b92e3c84631cee149105` (`HEAD`; the working tree was dirty, so the base is `HEAD`, not a merge-base). The machine report is `regression-report.json`, the helper's verdict JSON verbatim (byte-compared).

## Partition (from `check-regress.mjs scope`, not from judgment)

- **Inside (12 paths)** — the ten declared in `PLAN.md`'s `## Files` (`CLAUDE.md`, `README.md`, `pharn/pharn-contracts/finding-shape.md`, `.claude/commands/pharn-review.md`, `SKILLS_VERSION`, `CHANGELOG.md`, and the three `proposed/*.patch` plus `proposed/APPLY.md`), plus this feature's own `PLAN.md` and `GRILL.md`.
- **`escaped: []`** — no changed path fell outside the declared writes, so there is no fix #7 scope breach.
- **`escape_exempt`** — exactly `.dev/features/drift-audit-6-4-1/GRILL.md` and `.dev/features/drift-audit-6-4-1/PLAN.md`. Both were read. They are this feature's own stage artifacts, written under their own stages' scopes, which is what `--feature` exists to exempt.
- **Outside:** 80 test files and 1 committed eval pair. The style gates (`lint`, `format:check`, `lint:md`) were **skipped by the deterministic rule**: `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` or `.markdownlint-cli2.jsonc`, so a style flip outside the feature is provably impossible. They are absent from both maps, and `/pharn-dev-verify` runs them repo-wide regardless.

## Gates, base → head (exit codes only)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` — `node --test` over the 80 outside test files                                     | 0    | 0    |
| `validate` — `node pharn/floor/validate.mjs .`                                             | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Both eval-pair paths were confirmed readable before their exit codes were trusted (`test -r`), per the command's L5/L16/L21 rule. The baseline was a detached worktree at the base SHA and was removed afterwards (`git worktree list` shows only the main checkout). The base run was green, so there was no red baseline to investigate as a harness fault.

`regressions[]` — none. `pre_existing[]` — none.

## Deterministic verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

## The honest residual

This catches exactly what its suite catches, nothing more. A regression that no test, rule or eval covers is invisible to it, and that includes every sentence this increment edited: no checker reads them for truth. The comparison is the guarantee; the orchestration around it (choosing the base, running the suite, capturing the codes) is advisory. "Regress passed" is not a claim that the feature is whole, and this file does not make it.

Two further bounds, so they are not read as gaps in the run. `validate` is whole-repo, so a flip there would be reported at repo granularity. And the `tests` gate compares exit codes, which means a test that quietly skips still reads as a pass (`lessons-learned` L37); the full-suite count was recorded separately, at the real path, in `proposed/APPLY.md` (2169 tests, 0 skipped).
