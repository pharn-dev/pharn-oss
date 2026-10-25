# What two `/pharn-loop` runs cost on 6.73.2, in a user project (2026-10-25)

A measurement record of two identical `/pharn-loop` runs in the user project `pharn-starter`, on PHARN **6.73.2**, set
up by `.dev/measurements/loop-6.72-prep.md`. Both runs:

- built the same feature, `merge-legal-into-company` (delete `content/legal.ts`; three pages read `content/company.ts`
  instead), from the same description (`~/Projects/pharn-measure/reference/intent.md`, sha256 `6cd32ced…`);
- started from the same tree, `20c85c05` (pharn-starter `main` `9c6343b7` plus a committed 6.73.2 install);
- **ended `INCONCLUSIVE` · `gates-red-at-entry` (S14)**, after about 19 minutes, before any code was written.

Neither run is a full loop: spec, plan and the grill's floor stops ran; test, build, regress and verify did not.

- **Written by:** the `loop-cost-6-73-2` increment (plan, grill and ship records in `.dev/features/loop-cost-6-73-2/`).
- **Asked for:** two runs of `billing-plan-catalog` on 6.72.0. **Measured instead:** `merge-legal-into-company` on
  6.73.2, for the reasons in section 9.
- **Changes:** nothing in pharn-starter's own checkout. The runs wrote only in the worktree
  `~/Projects/pharn-starter-6.72`, which was reset after each.

## How the figures were made

Every figure comes from one read-only helper, run once per run while that run's tree was still in place:

```text
node .dev/features/build-writes-through-tools/measure.mjs \
  --starter ~/Projects/pharn-starter-6.72 \
  --projects ~/.claude/projects/-Users-pgalarowicz-Projects-pharn-starter-6-72 \
  --feature merge-legal-into-company
```

Its output is `~/Projects/pharn-measure/run1/measure.json` and `run2/measure.json`. The helper's header defines each
section, and each table below names the section it comes from. A figure taken by hand says where it was read.

**One change to the helper (2026-10-25).** It now has a branch for ledgers that carry the `entry` key (6.48.0 on,
`pharn/pharn-contracts/cost-ledger.md`, "Entry gate observations"): an `entry` section copied from the ledger, the
orchestrator's `entry-gates.mjs` calls (`entry_scripts`), and `buckets.entry_wait_s`, the time its `--wait` calls
took. That time falls between markers, so `orchestrator_between_s` still contains it; `entry_wait_s` is a subset of
that bucket, never added to it. A ledger without the key reads `entry: "absent (no entry key: ledger predates
6.48.0)"`, and every older section is computed as before: the 6.35.0 `billing-plan-catalog` ledger still reads, with
that `entry` line. Without the branch, about 12 of each run's 19 minutes would have been filed as orchestrator time.

**The inputs**, all machine-local and perishable, copied to `~/Projects/pharn-measure/run{1,2}/`:

- **Ledgers.** `feature/cost.json` (schema `pharn-cost-ledger/2`, membership `run-window/2`, `coverage: partial`).
  Each was checked with the installed `pharn/floor/check-cost-ledger.mjs --verify-transcript`: **GREEN**, with two
  WARNs each. One: no stage-start marker carries iteration 1. Two: `excluded_requests` (5) is exact only for the
  requests before the window, since the session went on after `run-stop`.
- **Claude Code transcripts.** `transcripts/<session>.jsonl` and `transcripts/<session>/subagents/agent-*.jsonl`.
  Sessions: run 1 `227987c0-ee5c-43a3-9cde-40e772e5a8a0`, run 2 `9647feda-3a43-4076-af46-e4c001943873`.
- **`.pharn/` state** (`pharn-state/`) and PHARN's git-dir records (`gitdir/`).
- **Session wall-clock:** `start.txt` / `stop.txt`, written by the shell line that started each run, just before
  `claude` and just after it exited.

These figures describe these two runs. None is claimed reproducible.

### Labels (the 2026-10-05 record's convention)

- **Source:** `R` — these two runs; `O` — the 2026-10-05 run, read from `.dev/measurements/loop-wall-clock-2026-10-05.md`
  or its surviving ledger `~/Projects/pharn-starter/pharn/features/billing-plan-catalog/cost.json`; `S` — static,
  read on 2026-10-25.
- **Precision:** `m` — measured; `e` — an estimate from measured numbers, with its formula.
- Token classes are kept separate, and no figure is priced. "Processed context" is the sum of a request's
  `input + cache_write_5m + cache_write_1h + cache_read`, the ledger's own classes added; `output` is separate, and
  `output_thinking` is a subset of `output`.

## 1. The answer, in one paragraph

Each run took about **19 minutes** and processed about **5.5–5.9 million context tokens**, 96% of them cache reads,
plus about 31 thousand output tokens [R·m]. It made **59–62 model requests** in three contexts: the orchestrator and
two fresh stage agents, spec and plan, both on opus [R·m]. **About 12 of the 19 minutes were spent waiting on the
project's own test suite** at the entry check (713.3 s and 773.3 s) [R·m]. That wait ended red both times: the `test`
gate was killed at the entry runner's 540 s per-gate timeout (exit 143, `timed_out: true`) [R·m]. So both runs
stopped `gates-red-at-entry` before `/pharn-test`. A fresh stage agent's first request carried about **53k tokens**,
of which the project's instruction files are about 28% [R·m; the share R·e, section 3]. No human was asked anything,
and in a headless session none could be (section 9).

## 2. The two runs, by bucket

Run window: run-start marker to run-stop marker. Helper section `buckets`. All `[R·m]`.

| bucket                                                        |     run 1 s |     run 2 s |      mean s |  mean min |
| ------------------------------------------------------------- | ----------: | ----------: | ----------: | --------: |
| human wait                                                    |           0 |           0 |           0 |         0 |
| routed stage agents (spec, plan)                              |       346.5 |       331.6 |      339.05 |      5.65 |
| inline stages (grill, `--floor-only`)                         |        19.1 |        18.8 |       18.95 |      0.32 |
| orchestrator between stages                                   |       761.9 |       814.1 |       788.0 |     13.13 |
| — of which waiting on the entry gates (`entry_wait_s`)        |       713.3 |       773.3 |       743.3 |     12.39 |
| — the rest                                                    |        48.6 |        40.8 |        44.7 |      0.75 |
| **run window**                                                | **1,127.5** | **1,164.5** | **1,146.0** | **19.10** |
| session wall-clock (`start.txt` → `stop.txt`, outside window) |       1,165 |       1,198 |     1,181.5 |     19.69 |

A mean is given because both runs ended in the same stop state. The session wall-clock adds the session's start-up
and the run's closing turn, which the window leaves out.

### By stage (helper `stages`: marker to next marker, the ledger's `stage-start-to-return/1` method)

| stage                 | route        | run 1 start (Z) | run 1 s | run 2 start (Z) | run 2 s |
| --------------------- | ------------ | --------------- | ------: | --------------- | ------: |
| orchestrator, entry   | —            | 05:53:25        |     4.0 | 06:21:17        |     4.3 |
| spec                  | `agent:opus` | 05:53:29        |   136.8 | 06:21:22        |   161.8 |
| orchestrator          | —            | 05:55:45        |     2.7 | 06:24:03        |     2.8 |
| plan                  | `agent:opus` | 05:55:48        |   209.7 | 06:24:06        |   169.8 |
| orchestrator          | —            | 05:59:18        |     0.6 | 06:26:56        |     2.0 |
| grill (floor only)    | inline       | 05:59:18        |    19.1 | 06:26:58        |    18.8 |
| orchestrator, to stop | —            | 05:59:38        |   754.5 | 06:27:17        |   805.0 |

The last row is the entry `--wait` (two calls each: 571.1 + 142.2 s and 571.8 + 201.5 s, helper `entry_scripts`),
the `--abort`, and the closing record. Test, build, regress and verify never started.

## 3. Requests, latency and prefix size, per context

Helper `contexts`, from `cost.json`'s rows. Token figures are the ledger's. All `[R·m]`.

| run, context        | served model (requests)  |  span s | gap median / mean s | first-request prefix (cache write + read) | largest context | output |
| ------------------- | ------------------------ | ------: | ------------------: | ----------------------------------------- | --------------: | -----: |
| 1, orchestrator     | `claude-sonnet-5-5` (20) | 1,123.8 |          3.9 / 59.1 | 90,546 (625 + 89,919)                     |         137,433 |  6,813 |
| 1, spec `aac34ab2…` | `claude-opus-5-5` (20)   |   122.0 |           4.8 / 6.4 | 53,225 (53,223 + 0)                       |          94,978 |  9,111 |
| 1, plan `a485ecfa…` | `claude-opus-5-5` (22)   |   199.4 |           6.1 / 9.5 | 52,738 (44,586 + 8,150)                   |         115,560 | 16,253 |
| 2, orchestrator     | `claude-sonnet-5-5` (19) | 1,160.7 |          4.5 / 64.5 | 89,935 (505 + 89,428)                     |         136,942 |  6,725 |
| 2, spec `a3256af6…` | `claude-opus-5-5` (22)   |   145.0 |           4.9 / 6.9 | 53,232 (53,230 + 0)                       |          97,959 | 10,361 |
| 2, plan `a25fdb92…` | `claude-opus-5-5` (18)   |   154.2 |           6.0 / 9.1 | 52,738 (44,586 + 8,150)                   |         103,230 | 13,103 |

**Tokens by class, per run** (`cost.json` `totals`) [R·m]:

| class                    |         run 1 |         run 2 |            mean |
| ------------------------ | ------------: | ------------: | --------------: |
| requests                 |            62 |            59 |            60.5 |
| input                    |           124 |           118 |             121 |
| cache_write_5m           |       202,384 |       193,035 |       197,709.5 |
| cache_write_1h           |        47,512 |        47,512 |          47,512 |
| cache_read               |     5,683,461 |     5,242,131 |     5,462,796.0 |
| **processed context**    | **5,933,481** | **5,482,796** | **5,708,138.5** |
| output                   |        32,177 |        30,189 |          31,183 |
| output_thinking (subset) |         7,232 |         6,220 |           6,726 |

**Processed context per context** (summed from `cost.json` `requests[]`) [R·m]:

- run 1: orchestrator 2,214,921 (37.3%); spec 1,652,145 (27.8%); plan 2,066,415 (34.8%);
- run 2: orchestrator 2,097,067 (38.2%); spec 1,856,376 (33.9%); plan 1,529,353 (27.9%).

**The instruction files attached to every context** (helper `instructions`) [R·m]: the same 5 files, 59,067 B, in
all six contexts:

- `CLAUDE.md`, 43,481 B;
- 3 `.claude/rules/*.md`: `product.md` 2,300 B, `code-review.md` 3,072 B, `feature-module-layers.md` 6,927 B;
- `MEMORY.md`, 3,287 B (the user's auto-memory, under pharn-starter's main project key).

At 4 bytes per token that is about 14,767 tokens [R·e, 59,067 / 4]: about **27.7%** of a spec agent's first-request
prefix (14,767 / 53,225 and / 53,232), **28.0%** of a plan agent's (/ 52,738), and **16.3–16.4%** of the
orchestrator's (/ 90,546 and / 89,935) [R·e]. The bytes-per-token ratio is an estimate (`LIMITS.md §1c`). The prefix's
total bytes are not in the transcripts, so only its token count and the instruction files' bytes are measured.

The project now has 15 rule files, 12 with a `paths:` key [S·m, helper `project`], so 12 were not attached.

## 4. Model time and tool time inside each context

Helper `timing`, from the transcripts; definitions as in the 2026-10-05 record §4. All `[R·m]`.

| run, context    | requests | model time: total s (median / mean / p90) | after-request time by tool, s        |
| --------------- | -------: | ----------------------------------------- | ------------------------------------ |
| 1, orchestrator |       20 | 60.8 (2.6 / 3.0 / 4.1)                    | Bash 723.7 · Agent 333.9 · other 7.0 |
| 1, spec         |       20 | 113.9 (4.5 / 5.7 / 10.5)                  | Bash 11.3 · other 2.1                |
| 1, plan         |       22 | 178.8 (4.1 / 8.1 / 16.1)                  | Bash 17.7 · other 6.5                |
| 2, orchestrator |       19 | 57.2 (2.6 / 3.0 / 4.2)                    | Bash 782.3 · Agent 320.0 · other 2.8 |
| 2, spec         |       22 | 136.9 (4.0 / 6.2 / 11.1)                  | Bash 12.3 · other 2.6                |
| 2, plan         |       18 | 146.3 (4.4 / 8.1 / 13.0)                  | Bash 13.8 · other 3.1                |

- Model time in the two stage agents: 292.7 s of 346.5 s (run 1), 283.2 s of 331.6 s (run 2).
- The orchestrator's Bash time is almost all the entry `--wait` (713.3 s and 773.3 s, section 5).
- **No stage agent made a Bash call over 60 s** (helper `long_bash`, empty for all four agents).

## 5. Gates: the entry check

Helper `entry`, copied from the ledger's `entry` record, and the runs' `.pharn/pharn-entry/`. All `[R·m]` unless
marked.

| figure                             |                                                        run 1 |         run 2 |
| ---------------------------------- | -----------------------------------------------------------: | ------------: |
| gates                              | 5 (`lint`, `format:check`, `base:test`, `test`, `typecheck`) |      the same |
| runner lifetime                    |                                                    1,088.6 s |     1,135.1 s |
| overlap with the marked stages     |                                                      365.6 s |       350.4 s |
| orchestrator `--wait` calls, union |                                                      711.1 s |       770.4 s |
| verdict                            |                      red: `test` exit 143, `timed_out: true` | red: the same |
| `base:test`                        |                                                        green |         green |

- **The gates run one after another.** `entry-gates.mjs`'s header: the runner makes "one `run-gates.mjs run --next`
  per gate" [S·m]. Run 1's own report suspected the timeout came from "five gates ran at once"; that is not how the
  runner works.
- **Per-gate times in run 2, from file mtimes** (`run2/entry-gates-mtimes.txt`, local time) [R·e, each gate's
  duration = its last output file's mtime minus the previous gate's]: `format:check` ended 07:21:50, `base:test`
  07:30:48 (about 538 s), `test` 07:39:50 (about 542 s, the 540 s timeout plus the kill), `typecheck` 07:39:52.
  Run 1's copy did not keep mtimes.
- **So the base-side run of the same suite finished about 2 s inside the 540 s limit, and the head-side run did not.**
  The prep measured the full suite at 503 s run alone (`loop-6.72-prep.md` §8) [S·m]. Why the head side was slower is
  not established here: both ran while the two stage agents worked.
- `build` and `e2e` are excluded by the project's `gates.exclude`.

## 6. Hooks

Helper `hooks`. All `[R·m]`. The project's PostToolUse `npm run tsc` (no such script; exit 1, non-blocking) ran 8 times
in each run: 4,062 ms in total in run 1, 3,623 ms in run 2.

## 7. How the stage agents wrote files

Helper `writes`. All `[R·m]`. Spec: Bash 16 · Read 5–7 · Write 2 · Edit 1. Plan: Bash 15–19 · Read 3–5 · Write 2.
**No Bash call wrote a project file** in either run. Build, the stage where the 2026-10-05 run wrote through the shell,
did not run.

## 8. 6.35.0 against 6.73.2

Every row is **not comparable**. The two sides differ in five ways at once, any of which can move any figure:

1. **the feature:** `billing-plan-catalog` (a multi-file billing change, 18 acceptance criteria in its SPEC) against
   `merge-legal-into-company` (15 `## Files` entries in each run's PLAN, 10 criteria);
2. **the base commit and the project's state:** `42d419cd` against `20c85c05`. The project's attached instruction set
   alone went from 634,379 B to 59,067 B;
3. **Claude Code:** 2.1.286 against 2.1.310;
4. **the session:** interactive against headless `claude -p` (section 9). The orchestrator was served opus then and
   sonnet now;
5. **how far the run got:** stopped in verify after one full iteration, against stopped at entry before test.

Where the definition of a figure also changed, the reason column says so. No delta is given: a difference between
two such runs would read as a comparison, and it is not one (the human's choice, recorded in the PLAN). Both 6.73.2
figures are the mean of the two runs.

**Wall-clock.** The 6.35.0 run's window was 91.75 min, including 19.1 min of human wait (two `AskUserQuestion`s); with
that wait subtracted, **72.65 min** [O·m, 91.75 − 19.1]. That is the figure in the table.

| figure                                  | 6.35.0 (`billing-plan-catalog`)                  |                                    6.73.2 (mean of 2) | not comparable because                                                                |
| --------------------------------------- | ------------------------------------------------ | ----------------------------------------------------: | ------------------------------------------------------------------------------------- |
| stop state                              | `INCONCLUSIVE` · `unlisted-ask` (S10), in verify | `INCONCLUSIVE` · `gates-red-at-entry` (S14), at entry | different stop; S14 is the entry check, added in 6.42.0                               |
| run window, human wait subtracted       | 72.65 min                                        |                                             19.10 min | different stages reached                                                              |
| human wait                              | 19.1 min                                         |                                                 0 min | headless: no question could be asked                                                  |
| routed stage agents                     | 55.2 min (5 agents)                              |                                   5.65 min (2 agents) | grill is inline since 6.45.0; test and build did not run                              |
| `/pharn-regress`                        | 11.9 min                                         |                                           not reached | —                                                                                     |
| `/pharn-verify`                         | 4.2 min                                          |                                           not reached | —                                                                                     |
| orchestrator between stages             | 1.4 min                                          |                                             13.13 min | now holds the entry wait (12.39 min); the entry check did not exist in 6.35.0         |
| spec stage                              | 211.1 s                                          |                                               149.3 s | different feature                                                                     |
| plan stage                              | 658.3 s                                          |                                              189.75 s | different feature                                                                     |
| grill stage                             | 361.0 s (agent, interrogating)                   |                          18.95 s (inline, floor only) | definition changed in 6.45.0: no interrogation in a loop                              |
| minutes blocked on the project's suites | 7.8 min (build agent's Bash)                     |                            12.39 min (entry `--wait`) | different place: the 6.35.0 figure is inside build, the 6.73.2 one is the entry check |
| model requests                          | 341                                              |                                                  60.5 | different stages reached                                                              |
| — orchestrator                          | 52 (opus)                                        |                                         19.5 (sonnet) | different session and model                                                           |
| — stage agents                          | 289                                              |                                                    41 | different stages reached                                                              |
| fresh agent contexts                    | 5                                                |                                                     2 | grill inline since 6.45.0; test and build did not run                                 |
| input tokens                            | 682                                              |                                                   121 | different work                                                                        |
| cache_write_5m                          | 2,240,034                                        |                                             197,709.5 | different work                                                                        |
| cache_write_1h                          | 67,260                                           |                                                47,512 | different work                                                                        |
| cache_read                              | 148,989,189                                      |                                           5,462,796.0 | different work                                                                        |
| processed context                       | 151,297,165                                      |                                           5,708,138.5 | different work                                                                        |
| output                                  | 88,024                                           |                                                31,183 | different work                                                                        |
| output_thinking (subset)                | 8,790                                            |                                                 6,726 | different work                                                                        |
| stage agent first-request prefix        | 302,207–304,974                                  |                                         52,738–53,232 | different project instruction set and Claude Code version                             |
| orchestrator first-request prefix       | 434,842                                          |                                              90,240.5 | different session type, model and instruction set                                     |
| instruction files attached per context  | 16 files, 634,379 B                              |                                     5 files, 59,067 B | the project's files changed                                                           |
| their ~token share of an agent's prefix | about half [O·e, 634,379 / 4]                    |                           about 28% [R·e, 59,067 / 4] | the project's files changed                                                           |
| stage-agent model time                  | 38.6 min                                         |                                              4.80 min | different stages reached                                                              |
| PostToolUse hook runs                   | 47, 4,957 ms                                     |                                         8, 3,842.5 ms | different stages reached                                                              |
| project files written through Bash      | 48 (build)                                       |                                                     0 | build did not run                                                                     |

The 6.35.0 token classes are its ledger's `totals` [O·m]; every other 6.35.0 figure is the 2026-10-05 record's.

## 9. Why each run stopped, and what else did not count

| attempt                  | where                        | result                                                                                     |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------ |
| **run 1**                | headless, 05:53:01–06:12:26Z | `INCONCLUSIVE` · `gates-red-at-entry` (S14), iteration 1 / 3                               |
| **run 2**                | headless, 06:20:56–06:40:54Z | `INCONCLUSIVE` · `gates-red-at-entry` (S14), iteration 1 / 3                               |
| void, 6.72.0 (three)     | 2026-10-25 01:11–01:21Z      | S9 at spec: stage agent backgrounded (`loop-6.72-prep.md` §8)                              |
| void, 6.73.2 interactive | CLI 2.1.310, 05:48:55–05:52Z | S9 at spec: stage agent backgrounded                                                       |
| void, run 2 first try    | headless, 06:14:49–06:15:48Z | S9 at Step 1a: Claude Code's auto-mode check gave "no verdict (error)" on three Bash calls |

All from each `LOOP.md` and session output, quoted as DATA [R·m]. Every void attempt's state, transcript and a note are
in `~/Projects/pharn-measure/run1-void*/` and `run2-void-classifier/`.

**Why 6.73.2, not 6.72.0.** 6.72.0 cannot finish a loop under Claude Code 2.1.308–2.1.310: in three attempts the
orchestrator passed `run_in_background` as the string `"false"`, and the stage agent ran in the background (S9).
6.73.2 (#391) handles an Agent tool with no such parameter, but in the interactive CLI the string form recurred
(`run1-void-6.73.2-cli/`).

**Why headless.** A headless `claude -p --permission-mode auto` session passed the JSON boolean `false`, and its stage
agents ran in the foreground (run 1's spec call at 05:53:33Z). Both measured runs use that form, the same command line
each time. A headless session has no `AskUserQuestion`, so "0 minutes waiting for a human" holds by construction, not
by measurement. Each session ran on its default model, which the ledger shows was sonnet for every orchestrator request;
the stage agents were routed to opus by the project's `pharn.config.json`.

**Why `merge-legal-into-company`.** It is the feature the run protocol fixes (`loop-6.72-prep.md` §8):
`billing-plan-catalog` is already built at pharn-starter `main`, and the base the 2026-10-05 run used fails its gates
on today's toolchain.

**Why both stopped.** The entry check's `test` gate hit the 540 s per-gate timeout (section 5). The tree was clean
(0 paths in each pre-run snapshot), and `lint`, `format:check`, `base:test` and `typecheck` were green.

## 10. Absolute cost of one full loop on 6.73.2

**Not measured.** Neither run got past the entry check, so neither ran test, build, regress or verify.

What was measured is the cost of a 6.73.2 full loop **up to the entry stop**, for this feature in this project (mean
of the two runs, sections 2 and 3) [R·m]:

- **about 19 minutes** of run window (19.10 min; 19.69 min session wall-clock);
- **about 5.7 million processed context tokens** (5,482,796–5,933,481), 96% cache reads, and **about 31 thousand
  output tokens** (30,189–32,177);
- **about 60 model requests** (59–62) in **3 contexts**, 2 of them fresh opus stage agents;
- of the 19 minutes, **about 12.4 were spent waiting on the project's test suite** at the entry check.

The number for the README is that one: "two runs both stopped at the entry check after about 19 minutes and 5.5–5.9
million processed context tokens each; the cost of a complete loop is not yet measured". It covers spec and plan for
one small feature, nothing after them.

## 11. Observations about pharn-starter only (not PHARN changes)

- **The project's test suite runs within seconds of PHARN's 540 s entry timeout.** The base side passed at about 538 s
  and the head side was killed at 540 s (section 5). So on this project a full `/pharn-loop` stops at entry whenever
  that suite runs past 540 s, as it did in both runs here. Whether `--quick` runs the same check, and whether the
  timeout is configurable, was not checked here.
- **The attached instruction set is 59,067 B now** (`CLAUDE.md` 43,481 B; 3 of 15 rule files, the other 12 scoped by
  `paths:`) [R·m, S·m].
- **The PostToolUse hook `npm run tsc` still names a missing script** [S·m]: 8 runs per run, about 0.5 s each.

## Bounds of this record

- **Two runs, one feature, one project, and both stopped at the same early point.** Nothing here is the cost of a
  complete loop, and no figure is claimed to reproduce.
- **Headless sessions.** The interactive CLI could not run a stage agent in the foreground on this Claude Code
  version; a headless session differs in more than that (no questions, no prompt suggestions).
- **Model time is latency, not generation**, as in the 2026-10-05 record.
- **Run 2's per-gate times are file-mtime estimates**; run 1's copy lost its mtimes.
- **The ledgers are `coverage: partial`:** the request that opened each window and the run's own closing turns are
  outside it. They are a floor on each run's spend, not the total.
