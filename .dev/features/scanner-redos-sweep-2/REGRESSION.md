# REGRESSION — scanner-redos-sweep-2

- Base: `dd69efd5c6a1a1d5f63c3a2fdb5bda7e7ccd6c0c` (6.71.0). The working tree was dirty, so base = HEAD.
- Inside (the changed scope): the two scanners, their two test files, the new differential test, `SKILLS_VERSION`,
  `CHANGELOG.md`, `README.md`, and this feature's PLAN / GRILL / MEASUREMENTS. `scope` reported no escape: every changed
  path is in the plan's `## Files`.
- Outside gates: 167 outside test files as one `tests` gate, `validate`, and the one committed eval pair. No shared
  style config was touched, so the style gates were skipped on both sides.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |
| `tests` (167 outside test files)                                                           |    1 |    1 |
| `validate`                                                                                 |    0 |    0 |

- `regressions[]`: none.
- `pre_existing[]`: `tests` — red at base and at head alike. Both runs were made with stdout discarded, under heavy
  load from two other sessions' full suites. The failing files are named by `/pharn-dev-verify`'s full `npm test`,
  whose TAP is kept (see VERIFY.md). An equal red at both sides is not a regression by this comparison, and it can
  also mask one inside that gate; the verify run is where it is read.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This stage catches what its
suite catches, nothing more; with `tests` red on both sides, a new failure inside that one gate would not show here.

## Orchestration deviations (advisory)

- The pinned `xargs` / `$VAR` shell forms are refused in this worktree-isolated session, so the gates ran through a
  scratch runner, `.pharn/pharn-dev-regress/capture.mjs` (`spawnSync` with argv arrays, exit codes only). The declared
  paths came from `plan-files-core.mjs`'s `pathsFromPlanFiles` + `clean`, the parser the pinned line names.
- The baseline checkout was a `git worktree` at `.pharn/regress-base` with `node_modules` symlinked from this tree
  (`package.json` is unchanged), removed afterwards.
- The first baseline run crashed in the runner after its tests finished (it read the eval pair as a string), losing
  that run's exit codes; it was fixed and re-run in full. Base and head then ran concurrently.
