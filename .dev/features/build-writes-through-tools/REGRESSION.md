# REGRESSION — build-writes-through-tools

- **Base:** `ea0234b4f57fd9d525b99a2de769a411c542264f`. The build is committed (`115fee7`) and the working tree was
  clean of tracked changes, so the base auto-resolved to `git merge-base HEAD origin/main`.
- **Inside (changed since base, plus untracked):** 12 paths.
  - The 10 files the plan declares.
  - This feature's `PLAN.md` and `GRILL.md`, which `scope` exempts (`escape_exempt`).

  `scope` found no escape (`escaped: []`).

- **Outside gates:**
  - `tests`: the 128 tracked `*.test.mjs` / `*.test.cjs` files outside the feature (130 in all, minus the feature's
    own `stage-agent-core.test.mjs` and `command-hygiene.test.mjs`);
  - `validate`;
  - `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json`.

  The style gates were skipped: no shared style config is inside.

- **How the gates ran.** This worktree session refuses `xargs`, shell-variable capture and `git worktree add`. So a
  node runner at `.pharn/pharn-dev-regress/run.mjs` ran the gates and passed every list as an argv array. That
  satisfies the pinned form's purpose — no word-splitting and no `xargs -a` (L5/L16) — by a different mechanism.
  - The BASE side was a `git archive` export of the base commit into a temp directory, removed afterwards.
  - This worktree's `node_modules` was symlinked into that export. `package.json` and `package-lock.json` are
    unchanged since base, so the dependency tree is the one `npm ci` would install.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    0 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

- `regressions[]`: none
- `pre_existing[]`: none

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (`check-regress.mjs verdict`,
exit 0, `"verdict": "no-regressions"`).

This catches exactly what the suite catches, nothing more. A regression that no test, eval or rule covers is invisible
here.
