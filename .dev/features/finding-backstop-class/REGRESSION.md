# REGRESSION — finding-backstop-class

**Verdict (FLOOR, `pharn/floor/check-regress.mjs verdict`, exit 0): `no-regressions`.**

| gate                                    | base | head | result  |
| --------------------------------------- | ---- | ---- | ------- |
| `tests` (79 outside test files)         | 0    | 0    | no flip |
| `validate` (whole-repo floor)           | 0    | 0    | no flip |
| `structural:expected-injection-comment` | 0    | 0    | no flip |

**Base:** `231e422a43aa12d8c0793267ae6221a2171cfd7d` — resolved by the deterministic state test, not
chosen: `git status --porcelain` was non-empty, so this is a working-tree dogfood and `base = HEAD`.

**Scope partition (FLOOR, `check-regress.mjs scope`, exit 0).** `escaped: []` — the build did not write
outside the plan's `## Files`. `escape_exempt` named exactly this feature's own `PLAN.md` and `GRILL.md`,
each written by its own stage under that stage's own Step-0 scope; the path count and the exempt list
were both read rather than assumed (L17/L28). `inside` holds 8 paths, `outside_tests` 79.

**Style gates were SKIPPED, deterministically and not as a shortcut.** `inside` touches no shared style
config (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`), so over
the outside files — byte-identical at base and head — a style result cannot flip. They are absent from
**both** maps, which is what keeps the gate sets identical; a mismatch would have been `inconclusive`,
never a silent pass.

## Deviation from the pinned command line, recorded rather than passed over

Step 2 pins `cat outside-tests.txt | xargs node --test` and says not to substitute an equivalent — the
pin exists because prose left a choice open and the choice kept being made wrong (**L5/L16**: unquoted
`$LIST` under zsh is not word-split; `xargs -a` is GNU-only. Each fabricates a red that is **equal at
base and head**, so `check-regress.mjs` files it as `pre_existing` and a real regression hides behind it.)

**In this session the pinned form is REFUSED by the harness's worktree isolation**, which cannot prove
that what `xargs` appends is not a git invocation. So the pin was unavailable, not declined. What ran
instead is `.pharn/pharn-dev-regress/run-gates.mjs` (gitignored per-command scratch), which passes the
paths as an **argv array** to `execFileSync`. That is strictly **stronger** against the two failure modes
the pin guards: with no shell line there is no word-splitting to get wrong and no `-`-prefixed operand
ambiguity, so both recorded bugs are structurally unreachable rather than merely avoided — and it is
portable, which `xargs -a` was not. The gate set is decided once in that script and applied to both
sides. The baseline came back green, which is the expected state; a red baseline would have been a
signal to investigate the harness rather than a number to record.

## Bounds (P0 — what this verdict does and does not say)

- It says **exactly** that no outside gate flipped pass→fail between base and head. It does **not** say
  the change is correct, nor that the repo is healthy.
- `validate` is **whole-repo**, so it is not strictly an outside-only gate — the named granularity limit
  the command declares, restated here only because this run relied on it.
- Coverage is whatever the project's deterministic suite catches, nothing more — but deterministically.
