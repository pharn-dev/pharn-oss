# REGRESSION — coverage-record

**Base:** `a2d73ebe104bd4fd0a46531fb46784a671145434` (working-tree dogfood → `base = HEAD`, resolved by
the deterministic state test: `git status --porcelain` was non-empty) · **Verdict source:**
`pharn/floor/check-regress.mjs verdict`, exit **0**.

## Scope partition (floor — `check-regress.mjs scope`, exit 0)

`escaped: []` — **the build did not write outside the plan's `## Files`.**

- **inside:** 12 paths (the 10 declared `## Files` entries plus this feature's own `PLAN.md` and
  `GRILL.md`)
- **`escape_exempt`:** `.dev/features/coverage-record/PLAN.md`, `.dev/features/coverage-record/GRILL.md`
  — each written by its own stage under that stage's own Step-0 scope, so their presence in the diff is
  evidence the pipeline ran, not that the build escaped. Read rather than assumed (L17/L20).
- **outside:** 77 tracked test files + 1 committed eval pair.

## Gates — base → head

| gate                                    | base | head | flipped? |
| --------------------------------------- | ---- | ---- | -------- |
| `tests`                                 | 0    | 0    | no       |
| `validate`                              | 0    | 0    | no       |
| `structural:expected-injection-comment` | 0    | 0    | no       |

`regressions: []` · `pre_existing: []`

Baseline ran in a detached worktree at the base SHA (removed afterwards); HEAD ran in the working tree.
Counts for context, not as the verdict: the baseline suite reported 2066 tests / 0 fail, HEAD 2110 / 0
fail.

**Style gates (`lint`, `format:check`, `lint:md`) were SKIPPED, deterministically and not by choice.**
The skip rule fires when `inside` touches no shared style config — and it touches none of
`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`. Over the outside
files, which are byte-identical at base and head, a style result can flip **only** if shared config
changed, so the flip is provably impossible rather than merely unlikely. The gate is absent from **both**
maps, which is what keeps the gate sets identical.

## One named deviation, stated rather than buried

The `tests` gate was invoked by literal directory globs (`.claude/hooks/*.test.cjs`,
`.dev/floor/*.test.mjs`, `pharn/floor/*.test.mjs`) rather than by feeding the 77-path list through
`xargs`, because this session's worktree isolation refused every list-piping form. At base those globs
expand to exactly the 77 outside tests; at HEAD they additionally pick up this increment's **two new**
test files, so the head side ran a strict **superset** (79 files).

**The direction of that error is the point:** a superset can only ever turn the gate RED that should
have been GREEN — it errs toward _reporting_ a regression, never toward _masking_ one. Both new files
were also run in isolation and pass (16/16 and 28/28), so they contributed no failure here. Recording
this because a gate whose two sides are not byte-identical is exactly the kind of quiet asymmetry that
makes a later reader trust a number more than it deserves.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

**The honest residual (P0/P7):** `/pharn-dev-regress` catches **exactly what its suite catches, nothing
more.** A regression no deterministic check covers — a behavior change with no test, rule or eval behind
it — is invisible here. This certifies the **comparison**, never the feature: it does **not** say the
increment is correct, and it is not a substitute for `/pharn-dev-verify` or human review.
