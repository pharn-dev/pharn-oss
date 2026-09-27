# REGRESSION — ac-gate-plan-scope

`/pharn-dev-regress` over this increment: the outside-scope gates at the base and at HEAD, their exit codes compared by
`pharn/floor/check-regress.mjs verdict` (the FLOOR verdict — no judgment of a flip). The machine report is
`regression-report.json`, the helper's `verdict` JSON verbatim.

This is the run **after merging `origin/main`** (`c1bf663`, #290, 6.29.0) and renumbering the increment to 6.30.0. It
replaces the pre-merge run (base `70cb51c`, `no-regressions`, its base `tests` side red from one timing flake under
load), whose record is in this file's git history.

- **Base:** `c1bf663ca09e2a36d9095c88226c99fd655e5265` — the tree is clean (the increment, the merge and the renumber are
  committed), so the base is the merge-base with `origin/main`, per Step 1.
- **Inside (the changed scope):** 42 paths — the plan's 34 `## Files`, the two files `/pharn-dev-memory-promote` wrote
  under its own scope when it promoted L65 (`.dev/memory-bank/lessons-learned.md`, `docs/lessons-index.md`, added to the
  declared set as the `cost-transcript-hostile-values` regress run did), and six of this feature's own artifacts, which
  `scope` exempts (`escape_exempt`). `scope` exited 0: no path escaped.
- **Outside:** 113 test files (of 122 tracked `*.test.mjs` / `*.test.cjs`; the other 9 are this increment's own), the
  whole-repo `validate`, and the one committed eval pair
  (`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`).
- **Style gates:** skipped at both sides — no shared style config (`eslint.config.mjs`, `.prettierrc.json`,
  `.prettierignore`, `.markdownlint-cli2.jsonc`) is inside (the command's deterministic skip rule).

## Gates, base → head (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (the 113 outside files)                                                            | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions[]`: none. `pre_existing[]`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

At the base, 3772 tests ran, 3768 passed and none failed; the other four are the style probes that skip in a worktree
with no `node_modules`. At HEAD, 3772 of 3772 passed.

## How this stage ran (advisory orchestration)

The pinned Step 1–3 shell forms are refused in this isolated worktree (xargs pipelines, `$?` capture), so a scratch node
runner under `.pharn/pharn-dev-regress/` ran the same steps as argv arrays: `check-regress.mjs scope` with the inside,
declared, test and eval-pair lists; the gate set in a throwaway `git worktree add --detach` at the base (removed after)
and then at HEAD; `check-regress.mjs verdict` over the two maps. The maps and the verdict were written by the runner,
never typed. The runner is deleted with the stage's scratch.

This stage catches exactly what its deterministic suite catches, nothing more — a broken behaviour no test, rule or eval
covers is invisible to it. "No regressions" is a claim about the comparison, never a certification of the feature.
