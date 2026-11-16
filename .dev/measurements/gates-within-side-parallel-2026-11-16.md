# Running one side's gates at once: stay closed (2026-11-16)

A decision record for Linear CORE-88, `gates-within-side-parallel`: whether to reopen running the independent gates of
ONE side (`/pharn-verify`'s, or one side of `/pharn-regress`) at the same time. The answer is **stay closed**. Nothing is
built.

- **Written by:** the `gates-within-side-parallel` increment, delivered directly as a decision record. It changes no
  product byte, so no `/pharn-dev-ship` run.
- **Dated** by its name. Every figure was read on **2026-11-16**, with this repository at `31f8b691` (7.16.0, the tip of
  `origin/main` after a fetch) and a scratch copy of the project's working tree at HEAD `605b29be`.
- **The project** is `~/Projects/pharn-app` (named `pharn-starter` until 2026-11), installed at PHARN 7.10.3. Nothing
  was written in it; the figures come from a copy in the session scratchpad.
- **Changes:** this file and one CHANGELOG entry. No product-surface byte, no `SKILLS_VERSION` bump.

## Labels (the 2026-10-05, 2026-10-25 and 2026-11-11 records' convention)

- **Source:** `R` — a run's own files, here the scratch gate passes' stamp and logs; `O` — an earlier record, cited by
  path; `S` — static, read in this repository or in the project's copy on 2026-11-16.
- **Precision:** `m` — measured; `e` — an estimate from measured numbers, with its formula.

## 1. The decision

**Stay closed.** The orchestrating model made this decision under the user's delegation for this batch ("You make all
decisions"). The maintainer did not sign it off in person. The ticket's acceptance criterion asks for the maintainer's
sign-off; this record holds a delegated decision in its place, and the maintainer may overturn it.

Why:

1. **The reopen trigger is not met.** The trigger set on 2026-10-06 (`.dev/features/gates-parallel-drain/PLAN.md`,
   "`gates-within-side-parallel`") is verify's wall-clock measured as a top bucket on a run that otherwise ends green.
   The one green run in the baseline spent its time in build (14.5 min), then regress (11.9), then verify (5.7)
   [O·m, `.dev/measurements/loop-baseline-2026-11-11.md` §12]. No green run has been recorded since.
2. **None of the three preconditions is met** (section 4), and the passes below add evidence against one of them.
3. **The saving is bounded by one gate.** `test` is 82.6% of the verify set's sequential time [R·e, 286.3 / 346.7].
   Running the other three beside it can save at most their sum, 60.4 s of 346.7 s. The concurrent pass saved 55.2 s
   (section 3): under a minute per verify invocation, against a trigger stated in stage minutes. Each of the other three
   gates ran 5 to 6 times slower beside `test`.
4. **The load history argues against it.** 17 of the baseline's 35 stops name `test` timed out, and two records blame
   machine load [O·m, §12]; PR #381 traced flaky gates to load. A gate slowed by a neighbour is likelier to reach its
   timeout and end unmeasured, which stops the run instead of shortening it.

## 2. Per-gate wall-clock, one sequential pass

Through the 7.16.0 runner (`pharn/floor/run-gates.mjs`), whose stamp records each spawned run's `duration_ms` (7.12.0,
CORE-75). The set is the one `init --stage verify --discover package.json` resolves for the project: the allowlist ∩ its
`package.json` scripts, minus its `pharn.config.json` `gates.exclude` (`build`, `e2e`), plus the two gates verify
injects. All `[R·m]`, except the shares `[R·e]`.

| seq | gate                 | duration (s) |  exit | share of the four project gates |
| --: | -------------------- | -----------: | ----: | ------------------------------: |
|   0 | `test`               |        286.3 |     1 |                           82.6% |
|   1 | `lint`               |         23.7 |     0 |                            6.8% |
|   2 | `format:check`       |         14.6 |     0 |                            4.2% |
|   3 | `typecheck`          |         22.2 |     0 |                            6.4% |
|     | **sum of the four**  |    **346.7** |       |                                 |
|   4 | `instruction-growth` |          0.9 |     0 |                               — |
|   5 | `reconcile`          |          0.1 | 2 (*) |                               — |

(*) `INCONCLUSIVE`: the copy has no reconcile baseline. The row is here because the runner ran it; it is not a project
gate and plays no part in the decision.

- **`test`'s one failure** is `scripts/__tests__/argparse.test.ts`, which resolves the module `depcheck`. The copy's
  `npm ci` did not install it (`Cannot find module 'depcheck'`). The test failed in 33 ms [R·m], so it does not move the
  duration. Of the rest, 1,111 of 1,112 files and 8,651 tests passed. Vitest reports `Duration 284.76s` (import 41%,
  tests 31%, setup 13%, environment 12%, transform 3%) [R·m].
- **`test` against the timeout:** 286.3 s is 53% of the pinned 540 s per-gate timeout [R·e, 286.3 / 540]. Each of the
  baseline's 11 unmeasured entry stops names `test` killed at 540 s [O·m, §1]. This pass did not reproduce that on the
  copy.
- **`typecheck` is a cold run:** the copy left out `tsconfig.tsbuildinfo` (the project's `incremental: true` cache) and
  `.next/`, whose `types/**` the project's `tsconfig.json` includes. A warm run in the project may be faster; one that
  also checks `.next/types` may be slower. Not measured.
- **The gate set uses no port, database or network service** [S·m]. `vitest.config.ts` excludes `**/__db_tests__/**`:
  the real-Postgres layer runs only as `test:db`, which is not an allowlisted gate. The one script that binds a port,
  `e2e` (Playwright's `webServer` on 127.0.0.1:3333 unless `PLAYWRIGHT_PORT` is set), is excluded by the project. So on
  this project as configured today, precondition 3's shared-port question does not arise at verify. It would return with
  `e2e` or a `test:db` gate.

### Load while it ran

Apple M2, 8 cores, 8 GB. `uptime` load averages (1 / 5 / 15 min) [R·m]:

| point                  | load average          |
| ---------------------- | --------------------- |
| before `test`          | 3.95 / 7.23 / 19.58   |
| during `test` (+4 min) | 33.17 / 21.98 / 22.63 |
| after `test`           | 32.11 / 21.94 / 22.61 |
| after `lint`           | 22.31 / 20.45 / 22.06 |
| after `typecheck`      | 14.98 / 18.71 / 21.34 |

During `test` the top CPU users were vitest's own worker processes. Other sessions' processes (a browser, the desktop
app) used under 1.5 cores between them at the one sample taken [R·m, `ps -r`]. A 3-second `npm ci` ran in this
repository during `test`. So most of the 33 is vitest saturating the 8 cores by itself, which matters for section 3.

### Reproduce

```bash
# a scratch copy, never the project itself
rsync -a --exclude=/node_modules --exclude=/.next --exclude=/.claude/worktrees --exclude=/coverage \
  --exclude=/output --exclude=/test-results --exclude=/.pharn --exclude=/.env.local --exclude=/.vercel \
  --exclude=/tsconfig.tsbuildinfo ~/Projects/pharn-app/ <scratch>/pharn-app/
cd <scratch>/pharn-app && npm ci --no-audit --no-fund   # then run under Node 24.15.0, the project's .nvmrc
node <pharn-oss>/pharn/floor/run-gates.mjs init --stage verify --feature core-88 \
  --out pharn/.run/core-88/seq --discover package.json
node <pharn-oss>/pharn/floor/run-gates.mjs run --next --out pharn/.run/core-88/seq --timeout-ms 1800000  # until exit 3
# per-gate figures: runs[].duration_ms in pharn/.run/core-88/seq/stamp.json
```

The pass used `--timeout-ms 1800000` (the 7.16.0 `gates.timeoutMs` ceiling), so a slow `test` would be measured rather
than killed. `--stage regress --side head` was tried first and refused (`--side head requires --scope-json <file>`), so
the verify set was used. It holds the same four project gates in the same order.

## 3. One concurrent pass

Right after the sequential pass, on the same copy, the four project gates were started at once, each as `npm run <id>` in
its own process group, with `CI=1` for `test` as the runner sets it. A plain `performance.now()` timer around each child
and around the whole pass; not the runner, which has no concurrent mode. `tsconfig.tsbuildinfo` was deleted first, so
`typecheck` was cold in both passes. All `[R·m]`, except the ratios and the saving `[R·e]`.

| gate           | sequential (s) | concurrent (s) | concurrent / sequential |
| -------------- | -------------: | -------------: | ----------------------: |
| `test`         |          286.3 |          291.5 |                   1.02× |
| `lint`         |           23.7 |          119.9 |                   5.06× |
| `format:check` |           14.6 |           87.0 |                   5.98× |
| `typecheck`    |           22.2 |          124.7 |                   5.63× |
| **sum**        |      **346.7** |      **623.2** |                   1.80× |
| **wall-clock** |      **346.7** |      **291.5** |                   0.84× |

- **Saved:** 55.2 s of wall-clock, 15.9% of the sequential sum [R·e, 346.7 − 291.5]. The ceiling was 60.4 s, the sum of
  the three short gates; the wall-clock is `test`'s own duration.
- **Slowdown:** `test` ran 5.2 s longer (1.8%), within what one sample can separate from noise. The three short gates
  each ran 5 to 6 times longer than alone, and the sum of the four durations grew by 80%. A likely reading, not
  measured: on 8 cores that vitest already saturates, the short gates mostly waited for CPU.
- **Same results:** every exit matched the sequential pass, and `test` failed on the same one test (1,111 of 1,112 files
  passed). Vitest reported `Duration 290.78s`.
- **Load:** 10.79 / 17.41 / 20.79 at the start, 31.60 / 28.87 / 25.06 at the end [R·m].
- **What it does not show:** whether `test` slows more when the neighbour is `next build` or a second vitest, the
  memory peak on an 8 GB machine (`typecheck` runs with `--max-old-space-size=8192`), or the effect on a run whose `test`
  is already near its 540 s timeout. It is one sample.

The script is `concurrent-pass.mjs` in the session scratchpad, not committed: it spawns the four `npm run` children
with `detached: true`, records `performance.now()` at each spawn and close, and prints the per-child and total
milliseconds with `os.loadavg()` before and after.

## 4. The three preconditions, restated with this pass's evidence

1. **A contract change for the fingerprint chain:** not made. The stamp's "one tree state" claim is the
   `fp_after[k-1] == fp_before[k]` chain. `gate-run-record.md`, `validateStamp`, `check-loop-fresh` J/E and the 6.34.0
   reuse identity's `fp_before` would each need a new rule for an overlapping group.
2. **A declared, closed set of gates that may overlap:** not declared. This pass adds a measured case of why only an
   advisory answer is available. `typecheck` wrote `tsconfig.tsbuildinfo` (1.3 MB, the project's incremental cache), and
   its stamp row still reads `fp_before == fp_after` [R·m]: the file is git-ignored, and the fingerprint takes its
   exclusions from git-ignore. A gate's write into ignored output is invisible to the floor, so "these gates do not read
   each other's output" cannot reduce to a floor primitive (P0). The 2026-10-06 case stands too: the project's
   `tsconfig.json` includes `.next/types/**/*.ts`, which `next build` writes [S·m].
3. **An answer for shared ports and databases:** not needed for this project's verify set today (section 2), and not
   given in general. A project with `e2e`, `test:db` or a fixed-port test would bring the question back.

The ticket names one more constraint. A new `pharn.config.json` key for an overlap set makes an older floor refuse the
config (7.16.0 refuses an unknown `gates` key), so even an opt-in would need a versioning step
(`.dev/guides/versioning.md`).

## 5. What the acceptance criteria asked, and what this record holds

- **"Per-gate durations from at least one run that ended green": NOT met.** No such run exists. The project is still on
  7.10.3, which predates per-gate durations (7.12.0), and no `/pharn-loop` run on 7.12.0 or later has been recorded.
  The figures above come from scratch gate passes on a copy, not from a loop run, and the sequential pass's `test`
  exited 1.
- **The smallest step that closes the gap:** update the project to 7.12.0 or later (`pharn update`; 7.16.0 for
  `gates.timeoutMs`) and run one `/pharn-loop` (or `/pharn-ship`) on it to a green stop. Its verify and regress stamps
  then carry `runs[].duration_ms` for every gate, and its ledger carries the stage minutes the trigger is stated in.
- **"Signed off by the maintainer": NOT met in person.** The sign-off here is the orchestrator's decision under the
  user's delegation (section 1).
- **"If it stays closed, the task is closed with that record and nothing is built":** met. Nothing is built.

## 6. The reopen trigger, restated

Reopen when **verify's wall-clock is measured as one of the top stage buckets on a `/pharn-loop` or `/pharn-ship` run
that otherwise ends green**, on 7.12.0 or later so the run's stamps carry per-gate durations. Any reopening starts with
the three preconditions in section 4, in that order. This pass's figures sharpen what to look for: while `test` stays
near 80% of verify, the lever is `test` itself (CORE-77, CORE-89), not overlap.

## Bounds of this record

- **One sequential and one concurrent pass, one machine, one copy of one project,** under a load the test gate itself
  produced. Nothing here is a loop run's figure, and nothing is claimed to reproduce.
- **The copy differs from the project** in what it left out: `node_modules` (reinstalled by `npm ci`, which did not
  install `depcheck`), `.next/`, `tsconfig.tsbuildinfo`, `.env.local`, `.claude/worktrees/`, `coverage/`, `output/`,
  `test-results/`, `.pharn/` and `.vercel/`. Of these the four gates read only `.next/types` (by `typecheck`) and the
  module tree. Whether the project's working tree held uncommitted changes was not checked; the copy took it as it was.
- **The runner was the 7.16.0 floor in this repository,** invoked against the copy. The project's own installed floor
  (7.10.3) was not used for the run, but the `instruction-growth` and `reconcile` rows ran the copy's 7.10.3 checkers,
  because the runner invokes them by a path relative to the project.
- **`--timeout-ms 1800000`, not the pinned 540000.** No gate came near either.

## What this record may claim (P0)

- **Floor.** Nothing this record concludes is a floor guarantee. The floor facts near it belong to the runner that
  produced the stamp and to the dev chain over this change, never to the decision. Each `duration_ms` is one
  `performance.now()` interval from spawn to settle, which 7.12.0 records as observational and no verdict reads. The dev
  chain is the writes-scope hook over the two files this change wrote, `reconcile`, and `check:surface-bump`, which finds
  no product path in it.
- **Measured** (`m`): the per-gate durations and exits in sections 2 and 3, the load averages, the test counts vitest
  printed, the `fp_before == fp_after` row for `typecheck`, the size of `tsconfig.tsbuildinfo`, and the project's config
  facts read from its files.
- **Estimated** (`e`, each with its formula): the shares, the share of the 540 s timeout, and the slowdown ratios in
  section 3.
- **Advisory:**
  - the decision itself, and that it is a delegated one;
  - any statement of what overlap would save or cost on a real run;
  - "the lever is `test` itself";
  - the reading that the short gates waited for CPU.
- **Struck.**
  - "per-gate durations from a green run" (none exists);
  - "overlap is safe for these gates" (the fingerprint cannot see ignored output, section 4);
  - "the maintainer signed off".
