# MEASUREMENTS — review-fanout

What `/pharn-review`'s prefilter (`pharn/floor/render-review-assignments.mjs`) cost before and after this increment.
These are wall-clock times on one shared machine: other agents' test suites ran beside every timing, so the load average
is recorded with each number. Read a ratio taken back to back as the comparison, and read an absolute number as a
reading under that load, never as a benchmark.

## The harness

Scratch scripts under the gitignored `.pharn/review-fanout/measure/`. They were deleted before `npm run lint`; their
shape is recorded here.

- **`time-assign.mjs <module-repo> <scan-repo> [--target t]… [--lenses …] [--limit N] [--dump file]`** imports
  `resolveTarget` and `computeAssignments` from `<module-repo>`'s `render-review-assignments.mjs`. It times target
  resolution and slice computation separately over `<scan-repo>` and writes no record.
  - **BEFORE** is a `git archive` snapshot of main `791d205` (6.58.1), at `<scratchpad>/fanout/base-snap`.
  - **AFTER** is this worktree.
- **`spawn-rate.mjs`** times N sequential single-file spawns of one scanner.
- **`scan-cost.mjs`** times one single-file spawn of each old scanner over one large file.
- **`build-big-tree.mjs`** builds the synthetic tree below.
- **`compare-dumps.mjs`** compares the per-lens slices of an old and a new run, over the files that have the same
  bytes in both trees.

**The ~26k-file tree** (`<scratchpad>/fanout/big`) is modelled on the 2026-10-12 review's 22,007-file tree:

- this repo copied 8 times (the root plus `part0`–`part6`), 23,287 tracked files;
- an ignored `dist/` and an ignored `node_modules/` of 2,690 files each;
- three 5 MB text files and twenty 4 KB binaries, tracked.

The harness passes the 22 lens names with `--lenses`, because `count-lenses.mjs` counts every copy of a lens in the
tree (176 here). That is a property of the synthetic tree, reported as a follow-up.

## Before (main 791d205)

| Measurement                                   | Result                                                                             | Load  |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | ----- |
| This repo, `--target .`, target resolution    | 2,908 files in 0.1–0.2 s                                                           | 38–47 |
| 100-file sample, all 22 lenses (1,800 spawns) | 121.6 s = 67.5 ms per spawn                                                        | 38–47 |
| 300-file sample, all 22 lenses (5,400 spawns) | 330.6 s = 61.2 ms per spawn                                                        | 40–62 |
| 40 sequential spawns of one scanner, control  | 82.8 ms per spawn                                                                  | 72    |
| This repo, whole `--target .` (52,344 spawns) | not completed — see below                                                          | —     |
| ~26k-file tree, target resolution             | 25,946 files in 0.7 s (the ignored `dist/` and every big file and binary included) | —     |
| ~26k-file tree, slices (467,028 spawns)       | projected 3.5–8.8 h (27–67.5 ms per spawn)                                         | —     |
| The review's own run, for scale               | one scanner over 22,007 files: 723 s (32.9 ms per spawn)                           | —     |

**Why there is no full before-run of this repo.** Two were started.

- The first was stopped at 12 minutes, at load 72, before the plan was written.
- The second ran beside the after-runs. The wall clock then moved from 03:15 to 09:12 while it was still running, a
  pause whose cause was not established, so its elapsed time means nothing. It was stopped.

Neither produced a number, so the comparison here is the 300-file sample run back to back. The whole-repo before
figure stays a projection: 52,344 spawns at the sampled 61–68 ms per spawn is ≈53–59 min.

**Per-KB scan cost**, used to derive the time limit. Each old scanner was spawned once over the 836 KB `CHANGELOG.md`
at load 36, and startup (about 70 ms under that load) was subtracted.

- The slowest is `scan-code-n-plus-one`, ≈865 ms, which is ≈1.0 ms per KB.
- Next come `null-deref` ≈480 ms, `missing-timeout` and `swallowed-exception` ≈420 ms, and `resource-leak` ≈410 ms.
- The fastest is `deserialization`, ≈11 ms.
- All 18 together take ≈4.7 s per 836 KB, which is ≈5.6 ms per KB.

## After (this increment)

| Measurement                                                       | Result                                              | Load   |
| ----------------------------------------------------------------- | --------------------------------------------------- | ------ |
| Same 300-file sample, back to back with the row above (18 spawns) | 7.0 s (47× faster)                                  | 62–63  |
| This repo, whole `--target .` (2,911 files, 18 spawns)            | 44.0 s, then 35.0 s on a second run (resolve 0.9 s) | 40–56  |
| ~26k-file tree, target resolution                                 | 23,257 files and 33 skips in 5.9–6.4 s              | 26–46  |
| ~26k-file tree, whole `--target .`                                | not completed — see below                           | 16–204 |

**Why the ~26k-file tree has no whole-run time.** Two full runs were started.

- The first was caught in the same six-hour clock jump as the before-run.
- The second ran while the machine's load average climbed from 16 to 204 under other agents' work. After 20 minutes
  it had reached the 5th scanner of 18, and it was stopped.

What it is measured by instead:

- **Target resolution** — the row above.
- **Its 33 skips:** the ignored `dist/`, `node_modules/`, the three 5 MB files, the twenty binaries and the eight
  `CHANGELOG.md` copies. The old walk had handed `dist/` and every one of these to every lens.
- **Three scanners' single spawns timed alone,** below.
- **A projection:** on this repo the 18 batches together take 48.6 s for 23.7 MB, so the big tree's 189.2 MB is
  ≈6.5 min at that load, against 3.5–8.8 h before.

**Each scanner's one spawn, timed alone** (`time-batches.mjs`).

- **This repo** (2,911 files, 23.7 MB, load 43): the 18 batches take 0.5–5.8 s each, 48.6 s in all.
  - Slowest: `n-plus-one` 5.8 s, `missing-error-handling` 4.5 s, `duplicated-logic` 4.3 s.
  - Fastest: `path-traversal` 0.5 s.
- **The ~26k-file tree** (23,257 files after skips, 189.2 MB, load 26):
  - `n-plus-one` 43.5 s;
  - `missing-error-handling` 27.5 s;
  - `secrets` 10.8 s.

**The scaled time limit** (30 s + 5 ms per KiB of target) against those runs, which are the confirmation the plan asked
for (L24):

- **This repo:** 152 s per scanner against 5.8 s for the slowest, 26× headroom.
- **The big tree:** 999 s per scanner against 43.5 s for the slowest, 23× headroom.

Both pass the plan's criterion (at least 3× the slowest scanner's measured cost), so the constants stand as derived.
The plan's estimate (≈1.0 ms per KB for the slowest scanner) was conservative. The measured rate is ≈0.24 ms per KB
on this repo and ≈0.22 ms per KB on the big tree: the estimate came from one prose file, the 836 KB `CHANGELOG.md`.

## Equivalence of the slices, old against new

The check of record is the ★ test in `pharn/floor/code-scanner-cli.test.mjs`, which runs in `npm test`. For each of the
18 scanners it compares the batch document over 113 files with real single-file runs of the same scanner, and its
negative control shows it catches carried state. A whole-repo comparison of the old and new emitters' slices was
planned through `compare-dumps.mjs`; it needed the full before-run, which did not complete (above). The two 300-file
sample runs printed matching slice counts for the lenses shown (for example `copy-paste-drift` 11 and
`duplicated-logic` 59 in both), but their full slices were not saved. That is a spot check, not evidence.

## What these numbers do not show

- **No lens subagent ran.** The fan-out half of CTX-3 — up to 22 fresh subagents, each paying a 68k–130k-token prefix
  — is untouched and unmeasured here (PLAN Design §6, follow-up `review-lens-grouping`).
- **The 18 spawns run one after another.** Running them in parallel would cut the wall clock to the slowest scanner,
  but it needs an async emitter API, and it is not in this increment.
- **Every number above comes from a machine shared with other agents' test suites.** A quiet machine is faster in
  both columns; the back-to-back ratio is the comparison.
