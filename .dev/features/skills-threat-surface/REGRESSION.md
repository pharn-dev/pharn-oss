# REGRESSION — skills-threat-surface

**Base:** `a2d73ebe104bd4fd0a46531fb46784a671145434` (auto-resolved: `git status --porcelain` was
non-empty — a working-tree dogfood build — so `base = HEAD`, per the Step-1 state test).
**Worktree:** `worktree-skills-threat-surface` (the run was performed in an isolated git worktree).

## Inside / outside partition (computed by `check-regress.mjs scope`, not by hand)

**Inside — 6 paths, all NEW and UNTRACKED.** `git diff --name-only HEAD` was **empty**: this increment
changed **no existing tracked file**. The six are the increment's own artifacts.

**`escaped`: `[]`** — no path fell outside the plan's declared `## Files`. The build wrote exactly the
four paths it was pinned to.

**`escape_exempt`** (read, not assumed — the count-reading discipline):

- `.dev/features/skills-threat-surface/PLAN.md`
- `.dev/features/skills-threat-surface/GRILL.md`

Both are written by their **own** stage under that stage's own Step-0 scope, which is precisely the
`--feature` exemption's purpose. No stray file, no other feature's artifact, no source path appeared.

**Outside:** 77 test files · 1 committed eval pair
(`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
`.dev/features/trust-fence/findings.json` — **path confirmed to resolve before its exit code was
recorded**, per the L5/L16/L21 input-capture rule; a guessed path would have ENOENT'd equally at both
sides and been silently classified `pre_existing`).

## Per-gate comparison

| gate                                           | base | head | result |
| ---------------------------------------------- | ---- | ---- | ------ |
| `tests`                                        | 0    | 0    | stable |
| `validate`                                     | 0    | 0    | stable |
| `structural:…/expected-injection-comment.json` | 0    | 0    | stable |

HEAD's suite reported **2066 pass / 0 fail**.

**Style gates (`lint`, `format:check`, `lint:md`) were SKIPPED — deterministically, not for
convenience.** The skip rule fires only when `inside` touches a shared style config
(`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.markdownlint-cli2.jsonc`); `inside`
touches none of the four, so over the **byte-identical** outside files a style flip is provably
impossible. They are absent from **both** maps, so the gate sets match and the verdict is not
`inconclusive`.

## Two deviations from the pinned procedure, recorded rather than smoothed over

1. **The pinned `cat outside-tests.txt | xargs node --test` form could not be run.** This session is
   worktree-isolated and the harness **refused** that command shape (it cannot verify which operand is
   the program when `xargs` appends runtime-computed words). The gate was run instead as the repo's own
   `npm test`, after establishing the two cover the same set: `package.json`'s globs match
   `**/*.test.mjs` + `**/*.test.cjs`, which is exactly the 77-file `git ls-files` universe, and the
   feature adds **no** test file. This is a deviation from a line the command pins **deliberately**
   (L5/L16/L22 — the improvised variants fabricate a red), so it is named here rather than left to be
   inferred from the numbers.
2. **`node_modules` was verified not to enter the glob.** The baseline worktree had no `node_modules`
   while HEAD's had one (installed so the style gates would be real rather than skipped at
   `/pharn-dev-verify`). A glob picking up vendored test files would have made HEAD's `tests` gate
   cover a different set than base's. Measured: `find node_modules -name '*.test.*'` → **0 files**, so
   both sides ran the same 77.

## Verdict

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**
(`check-regress.mjs verdict` → `"verdict": "no-regressions"`, **exit 0**.)

`regressions[]`: empty. `pre_existing[]`: empty — the baseline was clean on all three gates, so no red
is being carried.

**The honest residual (P0/P7):** this catches **exactly what the suite catches, and nothing more**. The
claim is "deterministically-detectable breakage outside the feature is caught", **never** "nothing
broke". It is also structurally easy to satisfy here: the increment adds only new untracked files under
`.dev/features/`, so a regression outside it was close to impossible by construction — the run confirms
that rather than assuming it. And the **verdict** is the floor part; choosing the base, partitioning,
and running the suite were **orchestration, and advisory**.
