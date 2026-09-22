# REGRESSION — ship-cost-ledger

**Base:** `HEAD` — auto-detected by the deterministic state test (`git status --porcelain` non-empty →
a working-tree dogfood build, so the baseline is the committed tree and HEAD is the working tree).

## Partition (computed by `check-regress.mjs scope`, not by hand)

`scope` exited **0**: **no path escaped the plan's `## Files`**.

- **inside** — 18 paths: the plan's 16 declared paths plus this feature's own `PLAN.md` and `GRILL.md`.
- **`escape_exempt`** — 2 entries, both this feature's own artifacts. Each is written by its own stage
  under that stage's own Step-0 writes-scope, so reporting them as the build escaping its scope would be
  the changed-since-base / wrote-outside-scope conflation `lessons-learned` **L17** records. `--feature
ship-cost-ledger` exempts exactly them, from a closed filename enum — a stray file in the feature dir
  would still be an escape.
- **outside** — 80 test files + 1 committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`; both confirmed readable before their exit code was recorded,
  per **L5** / **L21**).

**Style gates SKIPPED, and the skip is provable rather than an optimization guess (P5).** `lint`,
`format:check` and `lint:md` run only when `inside` touches a shared style config — `eslint.config.mjs`,
`.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`. None is in the diff, so over the
**outside** files (byte-identical at base and head) a style result cannot flip. The gates are absent from
**both** maps, which is what keeps the gate sets identical.

## Per-gate exit codes

| gate                                    | base | head | flip |
| --------------------------------------- | ---- | ---- | ---- |
| `tests` (80 outside test files)         | 0    | 0    | none |
| `validate` (whole-repo)                 | 0    | 0    | none |
| `structural:expected-injection-comment` | 0    | 0    | none |

- `regressions[]`: **empty**
- `pre_existing[]`: **empty**

The baseline was captured in a detached `git worktree` at the base SHA and removed afterwards, so the
comparison is reproducible and non-destructive. The test list was expanded through the pinned
`cat outside-tests.txt | xargs node --test` form — not `node --test $LIST` (zsh does not word-split) and
not `xargs -a` (GNU-only, and the flag **L16** names by name).

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
`check-regress.mjs verdict` exited **0** with `"verdict": "no-regressions"`.

**The honest residual (P0/P7).** This catches **exactly what its suite catches, and nothing more.** The
claim is "deterministically-detectable breakage outside the feature is caught", **never** "nothing
broke": a regression no check covers — a behaviour with no test, rule or eval — is invisible here. The
verdict certifies the **comparison**, not the feature. `/pharn-dev-regress` is exactly as good as the
deterministic suite it ran.

**Two clocks.** The verdict is FLOOR — two exit-code maps compared by a non-LLM helper. Everything
around it (choosing the base, partitioning, running the suite, obtaining the baseline) is **advisory
orchestration**, and a flipped gate would be a regression because the helper says so, not because a
model judged it one.
