# REGRESSION — p3-sibling-check-widen

**Base:** `8bc6c0a8f1b9e7df2e01ff0f98a73602dfa47422` — resolved by the deterministic state test, not chosen:
`git status --porcelain` was non-empty (a working-tree dogfood build), so `base = HEAD`.

## Inside / outside partition (computed by `check-regress.mjs scope`, not by hand)

**Inside (7 paths)** — the changed scope:

```text
.dev/features/p3-sibling-check-widen/GRILL.md
.dev/features/p3-sibling-check-widen/PLAN.md
CHANGELOG.md
README.md
SKILLS_VERSION
pharn/floor/validate.mjs
pharn/floor/validate.test.mjs
```

**`escaped: []`** — every changed path is authorized by the plan's `## Files`. Two of the seven are
`escape_exempt` (`PLAN.md`, `GRILL.md`), which is correct and not a waiver: each was written by its own
stage under that stage's own Step-0 writes-scope, and `--feature p3-sibling-check-widen` exempts exactly
that closed filename enum. The five source paths are genuinely declared. **The build did not escape its
scope.**

**Outside:** 69 test files (all committed `*.test.mjs` / `*.test.cjs` except `pharn/floor/validate.test.mjs`,
which is inside), plus the one committed eval pair.

**Style gates SKIPPED, deterministically.** `inside` touches none of `eslint.config.mjs`,
`.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`, so over the outside files — byte-identical
at base and head — a style result cannot flip. The gates are absent from **both** maps, and the baseline
`npm ci` was not incurred.

## Per-gate exit codes

| gate                                                                      | base | head | result |
| ------------------------------------------------------------------------- | ---- | ---- | ------ |
| `tests` (69 outside test files)                                           | 0    | 0    | stable |
| `validate` (whole-repo — a named granularity limit)                       | 0    | 0    | stable |
| `structural:…/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    | stable |

The gate set is identical on both sides, so the comparison is not inconclusive. Both eval-pair paths were
confirmed readable **before** their exit code was recorded, so an ENOENT could not be laundered into a
`pre_existing` red (L5 / L16 / L21). The baseline was captured in a clean detached worktree at the base
SHA, verified at `8bc6c0a` with an empty `git status --porcelain`.

- `regressions[]`: **none**
- `pre_existing[]`: **none** — the baseline was green on all three gates

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
(`check-regress.mjs verdict` exit 0, `"verdict": "no-regressions"`.)

**The honest residual (P0/P7):** this catches **exactly what the suite catches, nothing more.** A
regression no deterministic check covers is invisible to it. The claim is "deterministically-detectable
breakage outside the feature is caught," **never** "nothing broke" — and it certifies the **comparison**,
not the feature.

One thing worth naming for the human, because it is the shape most likely to be misread here: the
feature under test **is** `validate.mjs`, and `validate` is one of the outside gates. That is not
circular — the gate ran the BASE copy of `validate.mjs` in the base worktree and the HEAD copy in the
working tree, which is precisely the comparison wanted: the widened check still returns GREEN over the
same 36 capabilities the narrow one did. What it does **not** establish is that the widened branch
FIRES; that is the job of the new tests inside the feature, counted by the `tests` gate at HEAD and by
`/pharn-dev-verify`.
