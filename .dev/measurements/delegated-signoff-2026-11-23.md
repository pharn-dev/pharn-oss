# Delegated decisions on CORE-88, CORE-89, CORE-109 and CORE-113 (2026-11-23)

A decision record for Linear CORE-314, "Maintainer sign-off on decisions the agent made for CORE-88, CORE-89, CORE-109
and CORE-113". Four tickets reserved a decision for the maintainer; in each, an agent decided and the ticket was closed.
This record re-decides each one from evidence read on 2026-11-23. **It is not the sign-off CORE-314 asks for.**

- **Who decided:** every decision below was **decided by the agent under the maintainer's explicit delegation
  (2026-11-23), not a maintainer sign-off**. The maintainer delegated every decision in the CORE-293 batch ("You make
  all decisions, do not ask me"). That delegation lets the agent decide; it does not make the decision the maintainer's.
  The maintainer can overturn any row by reopening its ticket.
- **Written by:** the `delegated-signoff-2026-11-23` increment, run through `/pharn-dev-ship`. GATE 1 (approved with
  changes) was the batch orchestrator's model decision under the same delegation; GATE 2 was this agent's
  (`.dev/features/delegated-signoff-2026-11-23/SHIP.md`).
- **Dated** by its name. This repository was at `e8f0527e` (7.23.0, equal to `origin/main` after a fetch) when the
  evidence was read; `origin/main` then moved to `ead56ead` (#468, CORE-312's record) and to `2ec930d7` (#469, CORE-311's
  record), neither with a product byte, and each was merged in before the build was re-anchored.
- **Changes:** this file and one CHANGELOG entry. No product-surface byte, no `SKILLS_VERSION` bump.

## Labels (the 2026-10-05, 2026-10-25, 2026-11-11 and 2026-11-16 records' convention)

- **Source:** `R` — a run's own files, here CORE-310's run 2; `O` — an earlier record, cited by path; `S` — static, read
  in this repository on 2026-11-23.
- **Precision:** `m` — measured; `e` — an estimate from measured numbers, with its formula.

## 1. The rows

| ticket   | what the agent recorded before                                  | decision on 2026-11-23                                                 | what would overturn it (besides the maintainer reopening) |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| CORE-88  | stay closed, without green-run durations (PR #446)              | **stay closed**, now from green-run durations                          | the 2026-11-16 reopen trigger, unchanged (§3.4)           |
| CORE-89  | LOOP-8 reopened and built, 7.18.0 (PR #448)                     | **accept**: keep the reuse                                             | a reused-`test` PASS later shown to hide a flake (§4.3)   |
| CORE-109 | only the padding removed, 7.18.1 (PR #449)                      | **the outcome stands**                                                 | the deferral's bound reaching 3% of a run (§5.3)          |
| CORE-113 | no-go, which its own record says means "not measured" (PR #457) | **no-go stands**; condition 1 still unmeasured in its comparable shape | either reopen condition of its RECORD §7 (§6.3)           |

No row reverses or reopens a ticket, so this record names no follow-up task.

## 2. The evidence: CORE-310's run 2

A real full `/pharn-loop` on the measured project, `~/Projects/pharn-app`, installed at PHARN 7.22.0, base `8c896454`,
feature `profile-todo-cleanup`. It ended `STOP_GREEN` after one iteration [R·m]. Its window was 13:26:59 to 14:07:50
CET on 2026-11-23, **2,451 s** (`start.txt`, `stop.txt`) [R·m].

CORE-310's own record (`.dev/measurements/loop-real-run-7.22.0-2026-11-23.md`) was not merged when this was written.
The figures below come from the run's store, `~/Projects/pharn-measure/core-310/run2/`, outside this repository. Every
file read is bound by its sha256, so a later reader can check that the same bytes are meant. The store is project
output, `trust: untrusted`: this record reads ints, enum strings, hashes and paths from it and quotes no free text.

| file (under the store)                                       | sha256                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `run-state/pharn-entry/gates/stamp.json`                     | `f9bbbe489542899fc44137156af8bd86f6c9b8c903c4fce354662295534ed587` |
| `run-state/pharn-build/profile-todo-cleanup/full/stamp.json` | `37d4b320200c44df6d57310ce52e4c68bc2ad5b9fea0834a2bb62d01666b6093` |
| `run-state/pharn-regress/base-gates/stamp.json`              | `5a27cc246c49ee602db1af6cb7fc9e5bad659b160635e63adf666aa0e1ba8d7e` |
| `run-state/pharn-regress/head/stamp.json`                    | `7d0fb37170b811b227e7939d6fef29b76217389726376fcd3497c6705b4bc3d2` |
| `run-state/pharn-verify/gates/stamp.json`                    | `8b4347db908ed1660bfaacec6abda04e7ada10593487fb2575dd6adca5bd97b1` |
| `worktree/feature/cost.json`                                 | `361b61f83f8e38710f1adf253209aa888273fa5e1b1e20a1d97be2e7dd06d049` |

Each stamp names feature `profile-todo-cleanup` and head `8c896454` [R·m].

### Per-gate durations (`runs[].duration_ms`, ms)

| gate run     | `test`                          |  `lint` |  `format:check` | `typecheck`                     | other                                     |
| ------------ | ------------------------------- | ------: | --------------: | ------------------------------- | ----------------------------------------- |
| entry        | 451,316                         | 181,383 | 57,620 (exit 1) | 9,825                           | —                                         |
| build full   | 327,740                         |  22,299 |          14,757 | 5,037                           | —                                         |
| regress base | 410,037                         |       — |               — | 25,386                          | —                                         |
| regress HEAD | 383,287                         |       — |               — | 4,042                           | —                                         |
| verify       | reused from regress HEAD, seq 0 |  22,893 |          13,552 | reused from regress HEAD, seq 1 | `instruction-growth` 513, `reconcile` 393 |

All `[R·m]`. Every exit is 0 except entry's `format:check`. The brief handed to this agent carried the same table; each
figure was re-read from the stamps and matches. Each `duration_ms` is one `performance.now()` interval from spawn to
settle, which 7.12.0 records as observational; no verdict reads it.

### Stage elapsed, entry, timeout and load

- **Stage elapsed** (`RUN-REPORT.md`, wall clock between PHARN's stage markers, not CPU time) [R·m]: spec 106.0 s, plan
  121.7, grill 331.4, triage 33.8, test 247.0, build 450.0, **regress 856.6** (the largest), **verify 42.6** (the
  second smallest).
- **Entry gates** ran in a background process: lifetime 714.5 s, of it 592.8 s placed inside stage rows, and one
  foreground wait call of 71.3 s [R·m].
- **Timeout:** the entry runner applied `timeout_ms 540000` (`run-state/pharn-entry/runner.json`), and the project's
  `pharn.config.json` sets no `gates.timeoutMs` [R·m]. Entry `test` took 83.6% of it [R·e, 451,316 / 540,000].
- **Load:** `load.txt` holds one `uptime` sample a minute. The 1-minute load average ranged **13.63 to 80.30** over the
  window [R·m] on an Apple M2 with 8 cores and 8 GB. The batch brief attributes most of it to other projects' sessions on
  the same machine; this record did not measure that. No run was made at a controlled load, so this record does not say
  how much load moved any duration (L40).

## 3. CORE-88: running one side's gates at the same time

### 3.1 What was decided before

`.dev/measurements/gates-within-side-parallel-2026-11-16.md` [O]: stay closed. Its reopen trigger is **verify's
wall-clock as one of the top stage buckets on a run that otherwise ends green, on 7.12.0 or later**. Its three
preconditions (a contract change for the fingerprint chain, a declared closed set of gates that may overlap, an answer
for shared ports and databases) were unmet. One concurrent pass on a project copy saved 55.2 s of a 60.4 s ceiling, and
each short gate ran 5 to 6 times slower beside `test` [O·m, one sample]. The acceptance criterion it could not meet was
"per-gate durations from at least one run that ended green". Run 2 is that run.

### 3.2 The best case, from run 2

A concurrent side's wall-clock can at best be its longest gate instead of the sum of its gates, so the most it can save
is the sum minus the maximum. The ticket's own acceptance criteria say `reconcile`, e2e and the style gates at entry
never overlap, so those are left out. All `[R·e]` from the table in §2.

| gate run     | gates that may overlap                       | sum (ms) | max (ms) | best case saved (ms) |
| ------------ | -------------------------------------------- | -------: | -------: | -------------------: |
| entry        | `test`, `typecheck` (style gates never)      |  461,141 |  451,316 |                9,825 |
| build full   | `test`, `lint`, `format:check`, `typecheck`  |  369,833 |  327,740 |               42,093 |
| regress base | `test`, `typecheck`                          |  435,423 |  410,037 |               25,386 |
| regress HEAD | `test`, `typecheck`                          |  387,329 |  383,287 |                4,042 |
| verify       | `lint`, `format:check`, `instruction-growth` |   36,958 |   22,893 |               14,065 |

- **Per iteration** (build, both regress sides, verify): **85,586 ms**, 3.5% of the run's 2,451 s [R·e]. Verify and
  regress alone, the ticket's literal "one side": 43,493 ms. The build stage is included because it runs the same gate
  set; that choice favours reopening.
- **Range per iteration: 43.5 s (regress and verify only) to 85.6 s (with build), 1.8% to 3.5% of the run** [R·e].
- **Entry:** 9.8 s under the ticket's rule. Without the rule it would be 248.8 s, but entry runs in the background and
  only its 71.3 s foreground wait sits on the run's critical path, so no entry saving can exceed 71.3 s.
- **Verify's ceiling is small because of CORE-89:** verify reused `test` and `typecheck` (§4), so only `lint`,
  `format:check` and `instruction-growth` remain to overlap.
- **The best case is a ceiling, not a forecast.** The 2026-11-16 pass reached 91% of its ceiling once [O·e, 55.2 /
  60.4].

### 3.3 The cost side

- Under concurrency the machine runs more heavy processes at once. On 2026-11-23 this 8-core, 8 GB machine rebooted at a
  load average near 65 while a loop ran vitest (the batch brief's account of 10:14 CET; not measured by this record).
- Every run-2 duration was taken at a 1-minute load of 14 to 80. What concurrency would add on top of that is not
  measured, and one uncontrolled run cannot separate it (L40).
- `test` already used 83.6% of its 540 s timeout at entry. A `test` slowed by its neighbours is likelier to reach the
  timeout, which ends the gate unmeasured and stops the run instead of shortening it. How much likelier is not measured.
- The three preconditions of §3.1 are still unmet. Five commits since 2026-11-16 touched the gate runner or its contract
  (#447, #448, #467, #466, #465, by `git log 0da70efa..HEAD` over `gate-run-record.md`, `gate-run-core.mjs`,
  `run-gates.mjs` and `loop-fresh-core.mjs`); by their titles none adds concurrency. `gate-run-record.md` names no
  overlap set, and its one "never overlap" sentence is about two copies of the same gate [S·m].

### 3.4 Decision: stay closed

**Decided by the agent under the maintainer's explicit delegation (2026-11-23), not a maintainer sign-off.**

1. **The reopen trigger is not met on the first green run that carries per-gate durations.** Verify took 42.6 s, the
   second-smallest stage; regress took 856.6 s, the largest.
2. **The ceiling is 43.5 to 85.6 s per iteration (1.8% to 3.5% of the run)**, and the realised saving would be lower.
3. **The cost is measured only as a risk:** heavier concurrent load on a machine that rebooted under load the same day,
   and a `test` gate already near its timeout.

The reopen trigger stays as written on 2026-11-16. This record adds one reading of run 2: the largest bucket was
regress, whose time is two `test` executions (base and HEAD). Running those two sides at the same time is a different
idea (two full suites at once, the heaviest case), outside this ticket, and no run has failed for want of it (P7).

## 4. CORE-89: one HEAD `test` execution serves regress and verify

### 4.1 What was decided before

The ticket asked the maintainer to reopen LOOP-8 in writing, "with per-gate durations showing what one execution saves",
before anything was built. The agent reopened it and built it in PR #448 (7.18.0) without that written reopen and
without green-run durations.

### 4.2 Evidence from run 2

- **It fired.** Verify's stamp holds `test` as `reused` from `regress`/`head` seq 0, with no `duration_ms`, so verify ran
  no `test` [R·m]. The reused row's `stamp_sha256` equals the sha256 of the regress HEAD stamp file in §2 [R·m]. That
  HEAD execution took 383,287 ms.
- **The verdicts held.** `verify-report.json`: `verdict PASS`; `ac_gate.verdict PASS`, with AC-1, AC-2 and AC-3
  `passed` from the results file copied from the regress HEAD run [R·m].
- **The loss is disclosed.** `VERIFY.md` says verify has no independent second sample of the suite, so a flaky test that
  passed once reads as passed, and points at `pharn/LIMITS.md §9` [R·m], which states the same bound [S·m].
- **What it saved, as CORE-312 measured it.** CORE-312's record, `.dev/measurements/reuse-and-effort-2026-11-23.md`
  (merged in #468), measured three 7.22.0 iterations of the project, run 2 included [O·m]:
  - verify spawned no `test` in any of them (0 s, reused), against regress HEAD whole-suite runs of 184.1 s, 188.8 s and
    383.3 s;
  - by its accounting, what 7.18.0 removed from each iteration is the HEAD outside-subset run, whose stand-in, the base
    subset run, took 211.8 s, 209.2 s and 410.0 s. That is about 3.5 minutes per iteration on a quiet host and about
    6.8 minutes in run 2, under load.

  In run 2's terms, the 410.0 s stand-in is 16.7% of the 2,451 s window [O·e, 410,037 / 2,451,000]. What a fresh
  verify `test` would have taken in run 2 itself is not measured. CORE-312's own decision leaves keep or revert to the
  maintainer; this record decides it under delegation (§4.3).

### 4.3 Decision: accept

**Decided by the agent under the maintainer's explicit delegation (2026-11-23), not a maintainer sign-off.** Keep the
7.18.0 reuse. It did what the ticket set out to do in every measured iteration (three, run 2 the green one), saving
about one outside-subset `test` run each; the acceptance gate's verdict held on run 2; and the cost (no second sample)
is stated where a reader of the report sees it.

**What would overturn it:** a run whose verify PASS over a reused `test` is followed by a red `test` on the same tree
with no code change in between, which is a flake the second sample could have caught. That is a revert task under the
then-current epic, not a reopening of this record. Nothing in a normal loop runs a fresh `test` after a reused PASS, so
this trigger has no collector: it fires only if a later run or a person happens to look.

## 5. CORE-109: deferring the per-iteration parts of `pharn-loop.md`

### 5.1 What was decided before

The ticket allowed a new part file only "if the baseline rates it go". PR #449 (7.18.1) reflowed the stuck-point table
and built no part: `pharn-loop.md` went from 86,865 to 84,084 B [O·m].

### 5.2 Evidence, measured live

- `pharn-loop.md` is **84,935 B** today [S·m, `wc -c`], 851 B more than after #449, from #450, #453 and #465
  (`git log 1f14889c..HEAD -- .claude/commands/pharn-loop.md`). Its ceiling is 91,136 (`COMMAND_BYTE_CEILINGS`,
  `.dev/floor/command-hygiene.test.mjs`). The ticket's 81,024 B and 82,944 ceiling were the 7.7.1 state (L33).
- **What could be deferred:** Step 4, "the front" (plan, grill, triage, test), 14,340 B, is needed from the plan stage
  on. Step 5, "the loop body", 8,701 B, is needed from the first build [S·m; bytes per `##` section].
- **What a deferral would buy on run 2:** a part saves its bytes on every orchestrator request made before it is read.
  Run 2's orchestrator made 36 requests: 25 before the plan stage and 33 before the build [R·m]. At bytes / 4 tokens
  (`pharn/LIMITS.md §1c`, an estimate) and the baseline's weight of 0.1 for a cache read [S·e]:
  - Step 5 alone: 2,175 × 33 ≈ 71.8k cache-read tokens ≈ 7.2k weighted units, **0.32%** of the run's 2,276,796;
  - Steps 4 and 5 as two parts: 3,585 × 25 + 2,175 × 33 ≈ 161.4k ≈ 16.1k units, **0.71%**.

  Both are upper bounds: a part, once read, is written to the cache, which costs more per token than a cache read. They
  hold for this main-session run's request count. A run started inside an agent makes more orchestrator requests (the
  2026-11-11 baseline counted a median of 18 in regress alone [O·m]), so its bound would be larger.

### 5.3 Decision: the outcome stands

**Decided by the agent under the maintainer's explicit delegation (2026-11-23), not a maintainer sign-off.** Below 1%
of one run's weighted units is not worth a new part, its family-test rows and its pointer, and no run has failed for
want of it (P7). The ticket's own constraint still holds: a part that has been read stays in context, so true
per-phase loading needs a fresh context per phase, which is CORE-113's driver.

**What would overturn it:** the same bound, computed from a measured run's `cost.json`, reaching 3% of that run's
weighted units. **The 3% is the agent's chosen threshold, not one the ticket set.**

## 6. CORE-113: a script-driven loop

### 6.1 What was decided before

`.dev/features/loop-driver-spike/RECORD.md` §7 [O]: no-go, because the epic's start condition (the orchestrator's
share after Epics 1 and 2, on a whole post-change run) was not measured. Its reopen conditions:

1. a whole `/pharn-loop` run on 7.19.0 or later, on a benchmark that can reach a green stop, whose `cost.json` puts the
   orchestrator's share at or above the baseline's 27.7% pooled;
2. a ledger that attributes several sessions to one run.

### 6.2 Evidence from run 2

- **Condition 1.** Run 2 is a whole run on 7.22.0 that reached `STOP_GREEN`. Under the baseline's weights
  (`input + 1.25·cache_write_5m + 2·cache_write_1h + 0.1·cache_read + 5·output`,
  `.dev/measurements/loop-baseline-2026-11-11.md`), its 138 requests total 2,276,796 weighted units. Here the
  orchestrator is the run context the ledger names, `main`: every request with no agent id. It carries 613,664 of the
  units: **26.95%** [R·e]. The baseline's 27.7% counted the agent context that ran each loop, so the two are the same
  role measured in different session shapes. The ledger's coverage is `partial`: the request that opened the window is
  not in it, and that request is the orchestrator's. One more request at the orchestrator's median processed context
  (123,530 tokens, as cache reads) would add about 12.4k units, giving about 27.4% [R·e]. Both are below 27.7%.
- **Condition 2.** `pharn/pharn-contracts/cost-ledger.md` still reads "The selected session only" [S·m].
- **Why the comparison is loose:** run 2 is one main-session run; the 27.7% is pooled over 24 runs started inside an
  agent on 7.1.4 and 7.3.0; `profile-todo-cleanup` is not one of the spike's benchmark features. The orchestrator's
  median processed context per request was 123,530 tokens, against the baseline's 231k [R·m; O·m].

### 6.3 Decision: no-go stands

**Decided by the agent under the maintainer's explicit delegation (2026-11-23), not a maintainer sign-off.** The wording
was set at GATE 1 by the batch orchestrator, under the same delegation:

> no-go stands; RECORD §7 condition 1 is still unmeasured in its comparable shape; run 2 is one non-comparable data
> point (main-session, non-benchmark feature, a single run) at 26.95%, just below 27.7%, and is not evidence either way

A gap of 0.75 points from one run that is not comparable settles nothing, so the outcome is not "measured". Condition 2
is unmet. The reopen trigger is RECORD §7's, as it states it: "A whole post-change run. A `/pharn-loop` run (quick or
full) on 7.19.0 or later, on a benchmark that can reach a green stop, whose `cost.json` puts the orchestrator's share at
or above the baseline's 27.7% pooled", or "A ledger that can see a driven run. A ledger that attributes several
sessions to one run, so that a driven run and a `/pharn-loop` run can be compared whole."

## 7. What CORE-314 asked, and what this record holds

- **AC1, "for each row, the maintainer accepts the outcome or reopens the ticket, and the answer is written on the
  ticket": NOT met.** Each row's decision is written down here and on its ticket, labelled as the agent's under
  delegation. Only the maintainer can meet AC1, by accepting each row or reopening its ticket.
- **AC2, "CORE-88 is re-decided after the real loop run gives green-run per-gate durations": met by the agent's
  re-decision in §3**, with the same label. Whether a delegated re-decision satisfies an Owner-labelled ticket is the
  maintainer's call.

## Reproduce

```bash
# per-gate durations, best cases, stamp hashes and the orchestrator's share
node <scratch>/figures.mjs ~/Projects/pharn-measure/core-310/run2
# figures.mjs: for each of the five stamps in §2, sha256 the file, list runs[] as id=duration_ms|reused (exit),
# and print sum − max over the executed rows minus reconcile (and minus lint/format:check at entry);
# then over worktree/feature/cost.json: sum the weighted units of requests[] and of those with agent_id === null.
wc -c .claude/commands/pharn-loop.md
git log --oneline 0da70efa..HEAD -- pharn/pharn-contracts/gate-run-record.md pharn/floor/gate-run-core.mjs \
  pharn/floor/run-gates.mjs pharn/floor/loop-fresh-core.mjs
```

## Bounds of this record

- **One run.** Every run-2 figure is one sample, on one machine, under an uncontrolled load of 14 to 80, on one feature
  of one project. Nothing here is claimed to reproduce.
- **The store is outside this repository** and was copied by another agent after the run. The sha256 table fixes which
  bytes were read, not that they are the run's original bytes, and not that the files stay available to a later reader.
- **The best cases in §3 and the bounds in §5 are ceilings** computed from durations and byte counts. No concurrent run
  and no deferred part was measured.
- **Token figures from bytes** are estimates (`pharn/LIMITS.md §1c`).

## What this record may claim (P0)

- **Floor.** Nothing this record concludes is a floor guarantee. The floor facts near it are the runner's stamps and
  checks that produced run 2's verdicts, and the dev chain over this change: the writes-scope hook over the two files it
  wrote, and `check:surface-bump`, which finds no product path in it. `reconcile` ran too, but `main` moved twice during
  the run and each merge was followed by a re-anchor, so its window held only the later fixes to this file, not the
  first writes (`.dev/features/delegated-signoff-2026-11-23/VERIFY.md`).
- **Measured** (`m`): the per-gate durations and exits, the reuse rows and the stamp hash they carry, the stage elapsed
  times, the entry timings, the load samples, the byte counts, the request counts and the file hashes.
- **Estimated** (`e`, each with its formula): the best cases, the shares, the percentages and the token conversions.
- **Advisory:**
  - the four decisions, and that each is the agent's under delegation;
  - each reading of a reopen trigger or condition, and each threshold the agent chose;
  - any statement of what concurrency, a deferred part or a driver would save or cost on another run.
- **Struck.**
  - "the maintainer signed off" or "the maintainer accepted" any row;
  - "CORE-314 AC1 is met";
  - "load caused" any duration in run 2.
