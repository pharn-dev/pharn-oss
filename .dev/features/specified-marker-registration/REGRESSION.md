# REGRESSION — specified-marker-registration

Base: `8bc6c0a8f1b9e7df2e01ff0f98a73602dfa47422` (working-tree dogfood, so `git status --porcelain` is
non-empty → `base = HEAD`, resolved by the deterministic state test, not chosen).

## Partition

**Inside (6 changed paths, all declared in the plan's `## Files`):**

- `.dev/floor/specified-primitives.json`
- `.dev/floor/check-specified-markers.test.mjs`
- `pharn/pharn-contracts/finding-shape.md`
- `SKILLS_VERSION`
- `README.md`
- `CHANGELOG.md`

**`escaped: []`** — the build wrote nothing outside its declared `## Files`.
**`escape_exempt`** (read, not assumed): `.dev/features/specified-marker-registration/PLAN.md` and
`GRILL.md` — this feature's own stage artifacts, each written by its own stage under that stage's
Step-0 scope.

**Outside:** 69 test files (the 70th, `check-specified-markers.test.mjs`, is correctly inside) and the
one committed eval pair
`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
`.dev/features/trust-fence/findings.json`. Both paths were confirmed readable **before** their exit
code was recorded, so a setup error would fail loudly as a setup error rather than quietly as a
`pre_existing` gate result (L5 / L16 / L21).

## Gate table

| gate                                    | base | head | result |
| --------------------------------------- | ---- | ---- | ------ |
| `tests` (69 outside files)              | 0    | 0    | stable |
| `validate` (whole-repo)                 | 0    | 0    | stable |
| `structural:expected-injection-comment` | 0    | 0    | stable |

`regressions[]`: none. `pre_existing[]`: none.

**Style gates skipped, deterministically.** The config-touch rule: `inside` touches none of
`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`, so over the
outside files — byte-identical at base and head — a style result cannot flip. Skipped on both sides,
so the gate sets match and the comparison stays conclusive.

## One orchestration deviation, recorded rather than silently substituted

The command pins the outside-test invocation as `cat outside-tests.txt | xargs node --test`, pinned
precisely because the two improvised alternatives (`node --test $LIST` under zsh; GNU-only
`xargs -a`) each fabricate a false red that then classifies as `pre_existing`. **This sandbox refused
that exact command line**, so the list was instead passed to `node --test` as an **argv array** by
`.pharn/pharn-dev-regress/run-outside-tests.mjs` (scratch, deleted after the run). That is not a loose
equivalent: with no shell in the path, zsh word-splitting and the `xargs` dialect question are both
structurally impossible — the two failures the pinned line exists to prevent. The runner also prints
its path **count** (`count=69` at both base and head), so a silently-emptied list is visible instead
of being recorded as a green gate (L34). Recorded here because a substitution nobody writes down is
indistinguishable from the improvisation the pin forbids.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
`pharn/floor/check-regress.mjs verdict` exit 0, `"verdict": "no-regressions"`. The verdict is the
helper's exit-code comparison, not a judgment made here.

**The honest residual (P0):** this catches exactly what the suite catches, nothing more. A breakage
outside the feature that no deterministic check covers is invisible to it. "No regressions" means the
named gates did not flip — it does **not** mean nothing broke, and it certifies nothing about the
feature itself.
