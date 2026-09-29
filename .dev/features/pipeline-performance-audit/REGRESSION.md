# REGRESSION — pipeline-performance-audit

This is the second run, after the GATE-2 fix build (the maintainer chose "Fix, then PR"). The first run was also
`no-regressions`.

- **Base:** `c9737b4486bc47759bd36f43f3430cf86bc068b4` (`HEAD`; a working-tree build, so `git status --porcelain` was
  non-empty and the base auto-resolved to `HEAD`).
- **Inside (changed since base, plus untracked):** 11 paths.
  - The four files the plan declares: `PLAN.md` and `audit.mjs` in `.dev/features/pipeline-performance-audit/`,
    `.dev/measurements/pipeline-performance-audit-2026-09-29.md`, and `CHANGELOG.md`.
  - This feature's stage artifacts, which `scope` exempts (7 in `escape_exempt`).

  `scope` found no escape (`escaped: []`).

- **Outside gates:**
  - `tests`: all 130 tracked `*.test.mjs` / `*.test.cjs` files, the same set as the first run, run with the pinned
    `xargs node --test` form;
  - `validate`;
  - `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`.

  The style gates were skipped: no shared style config is inside.

- **Baseline: REUSED from the first run, not re-executed.**
  - The base map comes from this feature's first regress run. That run used a detached worktree at the same base SHA,
    removed after it.
  - The base commit, the outside gate set and the install decision (none) are all unchanged, so the base side's input
    is identical. This is the BASE-reuse rule 6.33.0 applies in the product pipeline, applied here by hand and stated.
  - Only the HEAD side re-ran: 130 test files, `validate` and the structural pair, on the fixed tree.

| gate                                                                                       | base (reused) | head |
| ------------------------------------------------------------------------------------------ | ------------: | ---: |
| `tests`                                                                                    |             0 |    0 |
| `validate`                                                                                 |             0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |             0 |    0 |

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`,
exit 0, `"verdict": "no-regressions"`).

This catches exactly what the suite catches, nothing more: a regression that no test, eval or rule covers is invisible
here.
