# REGRESSION — core-313-p4-rescore

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature** (run 2,
`check-regress.mjs verdict` exit 0; `regression-report.json` is its JSON verbatim). This catches what the suite
catches, nothing more; it certifies the comparison, never the feature.

## Run 2 (the standing verdict)

- **Base:** `2ec930d7cb34` (`git merge-base HEAD origin/main`; the tree was clean, after the two merges of
  `origin/main`, ead56ead and 2ec930d7).
- **Inside (5):** `.dev/features/core-313-p4-rescore/{GRILL,PLAN}.md` (exempt, this feature's own stage artifacts),
  `.dev/measurements/stage-model-tuning-2026-11-17.md`, `.dev/probes/defect-probes/README.md`, `CHANGELOG.md`.
  `scope` exit 0, `escaped: []`.
- **Outside:** all 204 test files, `validate`, and one eval pair (trust-fence). No shared style config is inside, so the
  style gates were skipped on both sides.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (per test: base 7081 pass / 0 fail / 9 skip; head 7089 pass / 0 fail / 1 skip)     | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

`regressions: []`, `pre_existing: []`, `per_test.new_failures: []`.

Load: base 19:36 (1-min load 25.5 at start, heavy.lock2 taken at 17.8) → 19:53 (5.9); head 19:53 (5.5) → 20:07 (4.3).

## Run 1 (STOP, recorded verbatim; superseded by run 2)

- **Base:** `e8f0527e` (the tree was dirty, so base = HEAD), before the two merges of `origin/main`.
- **Verdict:** `regressions`, exit 1. `tests` base 0 → head 1. Per test: base 7081 pass / 0 fail / 9 skip; head
  7081 pass / 1 fail / 8 skip. `per_test.new_failures` (a test title, untrusted DATA):

  ```text
  pharn/floor/stage-direct.test.mjs::C4(a) — the runner's group killed BEFORE the first checkpoint: the waiting call defers (exit 5), the resume line takes over and RE-RUNS the fresh argv; C5: one marker pair
  ```

- **Load:** base 10:21 (25.3) → 10:45 (132 at the end); the head run started at 11:10 (17.1) and ended at 11:28
  (35.3), after the 5-minute load passed 60.
- **Why it was treated as environmental, and re-run rather than waved through:** the increment changes markdown under
  `.dev/` and `CHANGELOG.md` only, which no test reads. The one failing test is a process-group kill timing test. Run
  alone at 11:28 (`node --test --test-name-pattern="C4\(a\)" pharn/floor/stage-direct.test.mjs`) it passed in 16 s.
  Per `/pharn-dev-ship`'s "A STOP is a STOP", the stage was re-run in full (both sides, a fresh base checkout) once the
  load was below 20, which wrote run 2's verdict. Both runs are recorded here.

## How the gates ran (advisory orchestration)

The session is worktree-isolated, which refuses the pinned `xargs` form. The gates ran through a runner,
`pharn/.run/pharn-dev-regress/capture.mjs`. It spawns, with argv arrays, the same three gates the command names: `node
--test` over `scope.outside_tests` with the absolute per-test reporter and destination, `validate.mjs .`, and
`check-structural.mjs` after both pair files were read. It records each exit code into `<side>-results.json`, and
removes the per-test record before each run (L66). The base side ran in a detached `git worktree` at the base SHA.
