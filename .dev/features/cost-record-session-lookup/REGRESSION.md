# REGRESSION — cost-record-session-lookup

**Base:** `fc03578713720b0a00159ac4b0af9e984a9d5571` (working-tree dogfood → `base = HEAD`, resolved by
the deterministic state test: `git status --porcelain` was non-empty).
**Machine report:** `.dev/features/cost-record-session-lookup/regression-report.json` — the helper's
`verdict` JSON verbatim.

---

## Partition (computed by `check-regress.mjs scope`, not by hand)

`scope` exited **0** — **no scope escape**. The build wrote nothing outside the plan's `## Files`.

**Inside (8):**

```text
.dev/features/cost-record-session-lookup/GRILL.md     (escape-exempt — stage artifact)
.dev/features/cost-record-session-lookup/PLAN.md      (escape-exempt — stage artifact)
.dev/measurements/cost-record-lookup-2026-09-21.md
CHANGELOG.md
README.md
SKILLS_VERSION
pharn/floor/render-cost-record.mjs
pharn/floor/render-cost-record.test.mjs
```

`escape_exempt` held exactly the two stage artifacts, each written by its own stage under that stage's
own Step-0 scope — read from the helper's returned field, not assumed. `escaped` was empty.

**Outside:** 79 test files (the full `*.test.mjs` / `*.test.cjs` universe minus this feature's own
`render-cost-record.test.mjs`, which the helper correctly classified inside) + 1 committed eval pair.

## Gate set and results

The gate set was decided **once** and applied identically at base and head — a mismatch would have made
the helper fail inconclusive rather than pass silently.

| gate                                    | base | head | result |
| --------------------------------------- | ---- | ---- | ------ |
| `tests` (79 outside test files)         | 0    | 0    | stable |
| `validate` (whole-repo floor)           | 0    | 0    | stable |
| `structural:expected-injection-comment` | 0    | 0    | stable |

The baseline ran in a detached `git worktree` at the base SHA (non-destructive, reproducible), removed
afterwards. The test list was expanded through the pinned `cat … | xargs node --test` form — not
`node --test $LIST` (zsh does not word-split, fabricating a red) and not `xargs -a` (GNU-only, rejected
by the BSD xargs macOS ships). The eval-pair paths were confirmed readable **before** their exit code
was recorded, so a setup error would have failed loudly as a setup error rather than quietly as a gate
verdict (L5 / L16 / L21).

**Style gates were SKIPPED, deterministically and not as a shortcut.** The skip rule fires only when
`inside` touches a shared style config (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
`.markdownlint-cli2.jsonc`); none of the 8 inside paths is one. Over the outside files — byte-identical
at base and head — a style result can flip _only_ if shared config changed, so the flip is provably
impossible here. This also avoided an `npm ci` in the baseline worktree.

## Verdict

```text
REGRESSIONS: none — no deterministically-detectable breakage outside the feature
```

`regressions[]` empty, `pre_existing[]` empty, `verdict: "no-regressions"`, helper exit **0**.

**The honest residual (P0/P7).** This catches **exactly what the suite catches — nothing more.** A
regression that no deterministic check covers is invisible to it. The guarantee is "deterministically-
detectable breakage outside the feature is caught", **never** "nothing broke". And this verdict
certifies **the comparison**, not the feature: it says the 81 outside gates stood still, not that the
increment is correct — that is `/pharn-dev-verify`'s and the human's question.

One granularity limit worth naming here rather than leaving implicit: `validate` is whole-repo (it has
no outside-only CLI scope), so a `validate` flip would be reported at repo granularity rather than
per-file. It was GREEN at both ends, and `/pharn-dev-build` halts on a RED `validate`, so the baseline
being green was expected rather than lucky.
