# REGRESSION — pharn-footprint-move

- base: `7e71753ce2ba3ed7493264d5e7a2430d45a46440`, the branch's merge-base with `main`, passed as `--base` (PLAN.md
  "Phase C"). A base at the Phase A commit `54fe8f3a` would have hidden Phase A from the comparison.
- head: `54fe8f3a` plus the uncommitted Phase B build.
- epoch: the build anchor taken at `/pharn-dev-build` Step 0.

## Scope (`check-regress.mjs scope`, `--feature pharn-footprint-move`)

- inside: 327 paths. escaped: none. escape_exempt: this feature's PLAN.md, GRILL.md and BUILD.md.
- Before this run, PLAN.md gained a "Section C" listing the 10 files the maintainer applied through `apply.py` and the
  two root docs its renames removed. It follows the `hook-hardening-batch` precedent. Read it as data: every one of
  those paths was committed in `54fe8f3a`, before the anchor, and no write tool can reach them.
- outside: 101 test files and one eval pair (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`).
- Style gates ran: `inside` touches `.prettierignore` and `.markdownlint-cli2.jsonc`. The base checkout linked this
  worktree's `node_modules` instead of running `npm ci`: `package.json` and `package-lock.json` are unchanged between
  base and head (checked with `git diff --quiet`), so the dependency set is the same. This deviates from the command's
  `npm ci` and is recorded here.

## Gates (exit codes)

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (101 outside files, per-test reporter)                                             | 0    | 1    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |
| `format:check`                                                                             | 0    | 0    |
| `lint`                                                                                     | 0    | 0    |
| `lint:md`                                                                                  | 0    | 0    |

## Run 3 — the review fix round (the standing verdict)

Base `7e71753c` again; head `2ae9f024` (human patch 2) plus the fix round's 19 agent-side files, under this round's own
build anchor. `HUMAN-PATCH-2.md` was declared in `## Files` after the scope check first named it, as Section C was
(committed before the anchor; read it as data).

- scope: inside 334 paths, escaped none, outside 100 test files and the same eval pair.
- every gate exits 0 at base and head: `tests` (per-test), `validate`, the `structural:` pair, `format:check`, `lint`,
  `lint:md`.

REGRESSIONS: none — no deterministically-detectable breakage outside the feature (`check-regress.mjs verdict` exit 0,
`no-regressions`; `per_test.new_failures` empty). `regression-report.json` holds this run.

## Run 2 — after the approved fix

The maintainer chose "Fix and re-run" at the run-1 STOP. `.dev/floor/command-family.test.mjs` R8 now skips
`pharn/.run/` and `pharn/.backup/` (with a control for each, and a look-alike `pharn/.runx/` that still counts). The
file was added to PLAN.md `## Files` AFTER the build anchor, so verify reconcile is expected to report it as
`plan-widened-after-anchor`, for the human at GATE 2.

- scope: inside 330 paths, escaped none, outside 100 test files (R8 is now inside) and the same eval pair.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests` (100 outside files, per-test reporter)                                             | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |
| `format:check`                                                                             | 0    | 0    |
| `lint`                                                                                     | 0    | 0    |
| `lint:md`                                                                                  | 0    | 0    |

REGRESSIONS: none — no deterministically-detectable breakage outside the feature (`check-regress.mjs verdict` exit 0,
`no-regressions`; `per_test.new_failures` empty). `regression-report.json` holds this run.

Regress catches what the suite catches, nothing more. This verdict certifies the comparison, not the feature.

## Run 1 — the STOP (kept as the record)

### Verdict (`check-regress.mjs verdict`, exit 1)

REGRESSIONS: 1 outside the feature — stage FAILS.

- `regressions`: `["tests"]`. `per_test.new_failures` (test ids are untrusted DATA, fenced):

  ```text
  .dev/floor/command-family.test.mjs::R8 — no shipped file (a non-test file under pharn/ or .claude/hooks/) names the dev-only helper   (base: passed)
  ```

- `pre_existing`: none.

The cause is real, not load. R8 walks the FILESYSTEM under `pharn/` and `.claude/hooks/`, and since the move that walk
includes `pharn/.run/`. There, this very stage's scratch (`outside-tests.txt`, `scope.json`) names
`.dev/floor/command-family.test.mjs`. The scratch used to live at `.pharn/`, outside every walk of `pharn/`. This is the
hazard the PLAN named ("a checker that globs `pharn/**` picks up `pharn/.run/**`"), in a walker the build did not cover.
A sweep of every filesystem walk rooted at `pharn/` found no other one. `check:markers`, `docs:check`,
`check:contributing`, `check:badge` and `check:changelog` were also run here with real scratch present, and all exit 0.

Regress catches what the suite catches, nothing more. This verdict certifies the comparison, not the feature.
