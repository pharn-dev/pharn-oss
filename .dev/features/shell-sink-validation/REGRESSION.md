# REGRESSION — shell-sink-validation

- stage: `/pharn-dev-regress`, **re-run from its start** after the first run's STOP, by the orchestrator's decision
  (the remedy was a re-run under lower load, not a waiver). The first run's verdict and investigation are summarized
  under "Earlier run" below; this file's verdict is the re-run's.
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).
- load: the re-run started only once a scratch runner polling `uptime` every 60 s read a 1-minute load average below 25
  (23.17 at 2026-09-27T20:24:55Z, after ~54 min of waiting at 40–122). It rose to ~39 while the base side ran and
  read 18.26 as the verdict was written.
- base: `f255f0c0369c5c7d27bf7d1ff7be2392b4b7afaf` — the command's own auto rule: `git status --porcelain` was
  non-empty (a working-tree build), so `base = HEAD`.
- machine report: `regression-report.json` (the `check-regress.mjs verdict` stdout, byte-identical — `cmp` exit 0).

## Scope partition (`check-regress.mjs scope --feature shell-sink-validation` → exit 0)

- **inside** (24): `git diff --name-only <base>` plus the untracked files — the ten product commands,
  `feature-name.mjs` and its test, `stage-runtime.mjs`, `command-hygiene.test.mjs`, `CHANGELOG.md`, `CLAUDE.md`,
  `README.md`, `SKILLS_VERSION`, and this feature's `PLAN.md`, `GRILL.md`, `BUILD.md`, `SHIP.md` and the first run's
  `REGRESSION.md` / `regression-report.json`.
- **declared** (19): PLAN.md `## Files`.
- **escaped:** none. **escape_exempt:** this feature's own `GRILL.md`, `PLAN.md`, `REGRESSION.md`, `SHIP.md`,
  `regression-report.json` (`BUILD.md` is declared).
- **outside gates:** 121 test files (every committed `*.test.mjs` / `*.test.cjs` but the inside ones), `validate`, and
  the one committed eval pair (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`, both
  confirmed readable before its exit was recorded).
- **style gates skipped:** `inside` touches none of `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`,
  `.markdownlint-cli2.jsonc`.

## Per-gate exit codes

| Gate                                                                                       | base → head |
| ------------------------------------------------------------------------------------------ | ----------- |
| `tests` (121 outside files, `node --test` with the paths on argv)                          | 0 → 0       |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0 → 0       |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0 → 0       |

The base side ran in a detached `git worktree` of the base commit (removed afterwards): 3,810 tests, 3,807 passing, 3
self-skipped (the base worktree has no `node_modules`). The head side ran the same 3,810 in the working tree: 3,810
passing. Both sides ran from one runner under `.pharn/pharn-dev-regress/` that passes the outside-test paths to
`node --test` as an argv array — the isolated worktree refuses the pinned `xargs` shell form, and neither recorded wrong
form (`$LIST`, `xargs -a`) was used.

- `regressions`: none. `pre_existing`: none.

## Verdict

**NO REGRESSIONS outside the feature** (`check-regress.mjs verdict`, exit 0, `no-regressions`).

## Earlier run (superseded; kept so the STOP is not hidden)

The first run, at load 78–123, read `tests` 0 → 1 (2 of 3,810 failing at head): `scan-code-crypto.test.mjs:369` (its
scanner child killed at its 10 s subprocess timeout) and `stage-verify.test.mjs:850` (a budget-window mutant exited `5`
instead of `0`; the test took 58 s). Both are wall-clock tests in files this diff does not touch; each passed when run
alone at head at load ~46 (L40: the attributed condition was varied). That run's verdict was `regressions` and the
chain stopped there. Between the runs, two in-scope fixes the orchestrator asked for landed (claims narrowed in
`pharn-spec.md`/`pharn-loop.md`; the directory-at-the-candidate-path rule), recorded in `BUILD.md`; neither test was
edited.

This certifies the comparison only: `/pharn-dev-regress` catches exactly what its suite catches, nothing more. A
regression no deterministic check covers is invisible here.
