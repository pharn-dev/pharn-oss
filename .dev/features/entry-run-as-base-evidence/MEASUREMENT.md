# MEASUREMENT — entry-run-as-base-evidence (6.49.0)

- **What:** a controlled fixture measurement of `/pharn-regress`'s BASE side with and without entry-derived BASE
  evidence. Real processes and the real CLIs, no model run.
- **Harness:** `.dev/features/entry-run-as-base-evidence/measure.mjs`, run as `--reps 3`.
- **Machine:** Apple M2, 8 cores, Node v24.13.1, an otherwise idle desktop session, 2026-10-06.
- **Floors:**
  - **A** = `origin/main`'s `pharn/floor` at `0e38b861f7839a7c19f8bb29756888d84e152568` (6.48.0, extracted with
    `git archive`);
  - **B** = this branch's `pharn/floor`.
- **Same fixture and inputs for A and B:** a git repo at its BASE commit with an npm lockfile and no dependencies, so the
  inferred install is a real `npm ci` whose `postinstall` sleeps 500 ms. The `test` gate sleeps 400 ms then runs
  `node --test` over two outside tests; `typecheck` sleeps 300 ms and `build` 600 ms. Each gate and the postinstall
  append `<what> <side>` to a counter outside the repo, side-tagged entry / head / base by where they ran, and a
  `post-checkout` hook counts BASE worktree checkouts.
- **The steps, as `/pharn-loop` runs them:**
  1. `require-loop-record.cjs --open`, `pre-run-snapshot.mjs --capture`;
  2. `entry-gates.mjs --start --timeout-ms 540000`, then `--wait --budget-ms 570000`;
  3. the build;
  4. `stage-regress.mjs --feature demo --timeout-ms 540000 --budget-ms 570000`, the pinned line (no `--base`, so
     BASE_RULE picks HEAD on the dirty tree).
- **Two fixtures:**
  - **F-hit:** the build edits source and ADDS an inside test, so B is eligible;
  - **F-miss:** the build also EDITS a pre-existing test, so B MISSes `shape-mismatch`. This is the common case for a
    feature that touches tests.

## Process counts (identical in every repetition)

| fixture | floor | entry gate processes | HEAD gate processes | BASE worktrees | BASE installs | BASE gate processes | log copies | verdict        | BASE source                   |
| ------- | ----- | -------------------: | ------------------: | -------------: | ------------: | ------------------: | ---------: | -------------- | ----------------------------- |
| F-hit   | A     |                    3 |                   3 |              1 |             1 |                   3 |          0 | no-regressions | fresh                         |
| F-hit   | B     |                    4 |                   3 |          **0** |         **0** |               **0** |          6 | no-regressions | **entry**                     |
| F-miss  | A     |                    3 |                   3 |              1 |             1 |                   3 |          0 | no-regressions | fresh                         |
| F-miss  | B     |                    4 |                   3 |              1 |             1 |                   3 |          0 | no-regressions | fresh (miss `shape-mismatch`) |

- On an eligible HIT the expected structural result holds: BASE worktrees 1 → 0, installs 1 → 0, BASE gate processes
  3 → 0, and HEAD is unchanged (3 → 3).
- The verdict and its source are recorded per run. On F-miss, B runs exactly A's BASE path.
- B's entry check runs ONE more process than A's: the evidence-only `base:test` slot. That is the slot's cost, paid in
  the background during spec, plan and grill, in every delivery run, quick mode included.
- "Log copies" are the derived stamp's verified `.out`/`.err` copies: 2 per reused slot (3 slots).

## Wall-clock (ms, per repetition)

| fixture | floor | regress            | regress median | entry (`--start` + `--wait` calls) | entry median |
| ------- | ----- | ------------------ | -------------: | ---------------------------------- | -----------: |
| F-hit   | A     | 5907 / 5828 / 5829 |           5829 | 2528 / 2519 / 2536                 |         2528 |
| F-hit   | B     | 2701 / 2752 / 3003 |           2752 | 3401 / 3421 / 3379                 |         3401 |
| F-miss  | A     | 5799 / 5683 / 5644 |           5683 | 2527 / 2523 / 2558                 |         2527 |
| F-miss  | B     | 5747 / 5679 / 5674 |           5679 | 3370 / 3394 / 3388                 |         3388 |

- **F-hit:** regress went from ~5.8 s to ~2.75 s on this fixture. That is the fixture's worktree, `npm ci` and three
  sleeping BASE gates, nothing more.
- **F-miss:** regress is unchanged within noise (5683 vs 5679 ms median).
- **The entry column is foreground time the fixture spends waiting.** Here nothing else runs while it waits. In a real
  run the entry check overlaps the front stages, and adds wall time only when it outlasts them. B's ~870 ms more is
  the slot: its 400 ms sleep, a `node --test` start, and the runner's per-gate fingerprints and digests.

## The selector's own cost (B, in-process, `performance.now()`, median of 10 per run)

| fixture | `decideEntryFromDisk` (ms) | `materializeEntryBase` (ms) |
| ------- | -------------------------- | --------------------------- |
| F-hit   | 25.95 / 24.66 / 24.49      | 1.79 / 1.76 / 1.65          |
| F-miss  | 24.51 / 25.69 / 24.87      | — (no HIT)                  |

- The decision runs twice per HIT invocation: once after the HEAD side and once at the verdict. A MISS invocation
  pays it once.
- Most of the decision is spawning `git rev-parse --absolute-git-dir` for the offer and the snapshot paths. This was
  read off the code, not profiled.
- Materialization copies 6 small logs and writes one stamp. A real project's logs are larger, and the copy is linear
  in their size (each is read, hashed, written and re-hashed).

## What this does NOT show

- **No real-project saving is claimed.** The 92-minute run's 146.2 s + 192.1 s BASE work, and 6.33.0's ~56 % on a
  repeated regress, are background only.
- **That run would not have HIT.** It started on a dirty tree (grill G9), so it would read `start-dirty`, and so would
  2 of 3 recorded real runs. A real project HITs only when:
  - the run starts clean;
  - the build modifies or deletes no pre-existing test file;
  - no mapped gate moves the tree;
  - no explicit install flag is passed.
- **The fixture's environments are equal by construction** (no ignored inputs). Where they are not, entry-derived and
  nested-worktree BASE can differ. That is pinned by the environment-divergence test in
  `pharn/floor/entry-base-evidence.test.mjs` and is not a measurement.
- **Only one machine, with sleeping gates.** Absolute times are not portable. The process counts are.
