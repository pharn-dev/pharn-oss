# REGRESSION — claude-md-bootstrap

- **Base:** `6ff4dd1ac064087660c03e20b48571868ab45863` (`HEAD`, since this is a working-tree build: `git status --porcelain`
  was non-empty).
- **Inside (22 paths):** the changed and untracked paths in `regression-report.json` `.inside`. `check-regress.mjs scope`
  exited 0: nothing escaped the PLAN's `## Files`, and `PLAN.md` and `GRILL.md` were exempt as this feature's own stage
  artifacts.
- **Outside gates:**
  - all 144 tracked `*.test.mjs` / `*.test.cjs` files (none is inside);
  - `validate`;
  - the one committed eval pair (trust-fence).
- **Style gates skipped:** `inside` touches no shared style config, so they are absent from both maps.
- **Base side:** ran in a detached worktree of the base, with `node_modules` symlinked.
- **Head side:** ran in the working tree, concurrently with the base side.

| gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests`                                                                                    | 0 → 0       |
| `validate`                                                                                 | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

`regressions[]`: none. `pre_existing[]`: none.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** That is the verdict of
`pharn/floor/check-regress.mjs` (exit 0). It catches what this suite catches and nothing more. It certifies the
base/head comparison, never that the increment is correct.

Run note: the first `scope` call was given an empty `--declared` by this stage's own extraction one-liner, which split
the PLAN on the first literal "## Files". That string also occurs inside an Applied-lessons line. The call exited 1,
listing every planned file as escaped. The call was re-run with a heading-anchored match (20 declared paths) and exited 0. The verdict above uses only the second call.
