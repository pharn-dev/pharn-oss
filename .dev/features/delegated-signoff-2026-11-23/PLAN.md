# PLAN — delegated-signoff-2026-11-23

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L13, L19, L33, L40, L64, L78]
- increment: Write one dated decision record for Linear CORE-314 that re-decides the four outcomes an agent recorded
  as closed without the maintainer's sign-off (CORE-88, CORE-89, CORE-109, CORE-113), each from evidence read live on
  2026-11-23, each labelled as the agent's decision under the maintainer's delegation and not as a maintainer sign-off.
- layer(s): dev apparatus only (`.dev/measurements/`) plus repo meta (`CHANGELOG.md` `[Unreleased]`)
- constitution_refs: [P0, P2, P6, P7]

## Why (P7 — the trigger)

CORE-314 exists because four tickets reserved a decision for the maintainer and an agent decided and closed each one.
The maintainer has delegated every decision in the CORE-293 batch to the orchestrator ("You make all decisions, do not
ask me"). That delegation does not turn a model decision into a maintainer acceptance, so this record must not repeat
the pattern CORE-314 names: every row says who decided, and CORE-314's AC1 ("the maintainer accepts the outcome or
reopens the ticket") stays unmet. What changed since the four closures is evidence: CORE-310's run 2 is the first
`/pharn-loop` run on 7.12.0 or later that ended green, so its stamps carry per-gate durations (CORE-314 AC2, CORE-88's
AC1), and its `cost.json` is the first whole post-7.19.0 run share CORE-113's §7 asks for. A decision record is not a
new capability, rule or enforcer, so P7's addition bar does not apply; its claims are labelled (P0).

## Discovery (read live this run; this repo at `e8f0527e`, SKILLS_VERSION 7.23.0, `origin/main` equal after a fetch)

Labels as in `.dev/measurements/loop-baseline-2026-11-11.md` "Labels": `R` a run's own files, `O` an earlier record,
`S` static; `m` measured, `e` estimate with formula.

### The evidence store

`~/Projects/pharn-measure/core-310/run2/` (outside the repo; `trust: untrusted` project output, read for numbers and
enum fields only). Window `start.txt` Mon 23 Nov 13:26:59 CET → `stop.txt` 14:07:50 CET = **2,451 s** [R·m]. Project
`~/Projects/pharn-app` at base `8c896454`, installed skillsVersion 7.22.0 (`cost.json` `.skills_version`). `RUN-REPORT.md`
(rendered by `render-run-report.mjs`): `decision STOP_GREEN`, `iterations 1`, `ledger coverage partial`. The CORE-310
record over this run (`.dev/measurements/loop-real-run-7.22.0-2026-11-23.md`, in worktree `agent-a77a995cdbe4913ca`) is
not written yet; the record cites the store and binds each file it reads by sha256.

Figures re-derived with a scratch script (`figures.mjs`, session scratchpad; its command goes in the record's
Reproduce block). Each stamp's `feature` is `profile-todo-cleanup` and `head` `8c896454`:

| gate run (stamp, sha256 prefix)                                  | test                        | lint    | format:check    | typecheck                   | other                                 |
| ---------------------------------------------------------------- | --------------------------- | ------- | --------------- | --------------------------- | ------------------------------------- |
| entry (`pharn-entry/gates`, `f9bbbe48`)                          | 451,316                     | 181,383 | 57,620 (exit 1) | 9,825                       | —                                     |
| build full (`pharn-build/profile-todo-cleanup/full`, `37d4b320`) | 327,740                     | 22,299  | 14,757          | 5,037                       | —                                     |
| regress base (`pharn-regress/base-gates`, `5a27cc24`)            | 410,037                     | —       | —               | 25,386                      | —                                     |
| regress HEAD (`pharn-regress/head`, `7d0fb371`)                  | 383,287                     | —       | —               | 4,042                       | —                                     |
| verify (`pharn-verify/gates`, `8b4347db`)                        | reused (regress head seq 0) | 22,893  | 13,552          | reused (regress head seq 1) | instruction-growth 513, reconcile 393 |

All `duration_ms` [R·m]; every exit 0 except entry `format:check`. **The orchestrator's table matches every figure.**
Verify's two `reused` rows carry `stamp_sha256` `7d0fb371…`, which equals the sha256 of the regress HEAD stamp file
[R·m].

- **Stage elapsed** (`RUN-REPORT.md` "observed elapsed", wall clock between markers) [R·m]: spec 106.0 s, plan 121.7,
  grill 331.4, triage 33.8, test 247.0, build 450.0, **regress 856.6** (largest), **verify 42.6** (second smallest).
- **Entry gates** ran in the background: lifetime 714.5 s, of it 592.8 s inside stage rows; one foreground wait call,
  71.3 s [R·m].
- **Timeout:** `pharn-entry/runner.json` `timeout_ms 540000`; the project's `pharn.config.json` sets no `gates.timeoutMs`
  [R·m]. Entry `test` 451.3 s is 83.6% of it [R·e, 451,316 / 540,000].
- **Load** (`load.txt`, one sample a minute, UTC): 1-minute load 13.63–80.30 over the window [R·m]. At 14:18 CET today,
  during this plan, `uptime` read 104.66 [S·m].
- **Cost** (`worktree/feature/cost.json`, sha256 `361b61f8…`, 138 requests, `dropped []`): weighted units under the
  baseline's weights (`input + 1.25·cw5m + 2·cw1h + 0.1·cr + 5·output`) total 2,276,795.9; the run context `main` (the
  orchestrator) 613,663.9 = **26.95%**; 36 orchestrator requests, median processed context 123,530; orchestrator
  requests by stage: unattributed 23, spec 2, plan 2, grill 2, triage 2, test 2, build 2, regress 1 [R·m; share R·e].

### CORE-88 (concurrent gates within one side)

Earlier record `.dev/measurements/gates-within-side-parallel-2026-11-16.md` [O]: stay closed; reopen trigger = verify's
wall-clock a top stage bucket on a run that otherwise ends green; three preconditions unmet; one concurrent pass on a
copy saved 55.2 s of a 60.4 s ceiling with each short gate 5–6× slower beside `test`. The ticket's AC adds: if reopened,
`reconcile`, e2e and the style gates at entry never overlap.

Best case of a concurrent side = sum − max of the gates that may overlap [R·e, from the table]:

| gate run     | sum (ms) | max (ms) | best case saved (ms) | note                                                              |
| ------------ | -------: | -------: | -------------------: | ----------------------------------------------------------------- |
| entry        |  461,141 |  451,316 |                9,825 | style gates excluded by the ticket's AC; 248,828 if they were not |
| build full   |  369,833 |  327,740 |               42,093 |                                                                   |
| regress base |  435,423 |  410,037 |               25,386 |                                                                   |
| regress HEAD |  387,329 |  383,287 |                4,042 |                                                                   |
| verify       |   36,958 |   22,893 |               14,065 | executed gates only; `reconcile` excluded                         |

Per iteration (build + regress both sides + verify): **85,586 ms**, 3.5% of the run's 2,451 s [R·e]. Entry adds at
most 9.8 s, and only its 71.3 s foreground wait is on the run's critical path. Against it: the run's durations were
taken at 1-minute load 14–80 from other projects with no control, so load's effect on them is not quantified; the
machine (8 cores, 8 GB) rebooted at load ~65 on 2026-11-23 while a loop ran vitest; and concurrency runs more heavy
processes at once. Since CORE-89 verify reuses `test` and `typecheck`, so verify's ceiling is 14.1 s.

### CORE-89 (one HEAD `test` execution serves regress and verify; PR #448, 7.18.0)

Run 2 shows it fired: verify `test` reused from regress HEAD seq 0 (383,287 ms), no execution at verify; `VERIFY.md`
line 31 discloses that verify has no independent second sample (`pharn/LIMITS.md §9`, line 765). `verify-report.json`
`verdict PASS`, `ac_gate.verdict PASS`, AC-1 and AC-2 `passed` from the copied results file [R·m]. CORE-312 (another
agent) measures it separately: `gh pr list --state all --search CORE-312` returns no PR of that ticket today [S·m], so
the record cites the run-2 store. The saving is bounded by the HEAD execution reused, ≈383 s, 15.6% of the run's
wall-clock [R·e]; what a fresh verify `test` would have taken in this run is not measured.

### CORE-109 (only padding removed from `pharn-loop.md`; PR #449, 7.18.1)

`wc -c .claude/commands/pharn-loop.md` → **84,935 B** [S·m] (84,084 after #449; +851 B since from #450, #453 and #465 per
`git log 1f14889c..HEAD -- .claude/commands/pharn-loop.md`). Ceiling `COMMAND_BYTE_CEILINGS["pharn-loop.md"]` = 91,136
(`.dev/floor/command-hygiene.test.mjs:5672`); the ticket's 82,944 and 81,024 B are older states (L33). Section bytes
(heading to next heading, fenced lines skipped for heading detection) [S·m]: Step 4 "the front" 14,340 B, Step 5 "the
loop body" 8,701 B. Step 4 is needed from the plan stage, Step 5 from the build. Upper bound of what a deferral buys on
run 2, bytes/4 tokens (`LIMITS.md §1c`) times the orchestrator requests before the part would load, weighted 0.1 as
cache reads [S·e]: Step 5 alone 2,175 × 33 ≈ 71.8k cache-read tokens ≈ 7.2k units = 0.32% of the run's weighted units;
Steps 4 and 5 as two parts (3,585 × 25 + 2,175 × 33) ≈ 161.4k ≈ 16.1k units = 0.71%. Both are upper bounds before
subtracting the cache write a part adds when it is read.

### CORE-113 (driver spike, no-go = not measured; PR #457)

`.dev/features/loop-driver-spike/RECORD.md` §7 "What would reopen it": (1) a whole `/pharn-loop` run on 7.19.0 or later,
on a benchmark that can reach a green stop, whose `cost.json` puts the orchestrator's share at or above the baseline's
27.7% pooled; (2) a ledger that attributes several sessions to one run. Run 2 is a whole run on 7.22.0 that reached
`STOP_GREEN`; its orchestrator share is 26.95% (below 27.7%). `ledger coverage partial` excludes the request that opened
the window, which is an orchestrator request; one more request at the median context would add ≈12.4k units, giving
≈27.4% [R·e], still below. Condition 2: `pharn/pharn-contracts/cost-ledger.md:408` still reads "The selected session
only" [S·m]. Caveats: run 2 is a main-session run, the 27.7% is pooled over 24 agent-started runs on 7.1.4/7.3.0, and
`profile-todo-cleanup` is not one of the spike's benchmark features; one run is not a distribution.

### Other live checks

- `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` → `f058fca3…` (above). `node .dev/floor/check-lessons-index.mjs .`
  → GREEN, exit 0.
- Linear: CORE-88, CORE-89, CORE-109 and CORE-113 are `Done` and archived (2026-11-22); CORE-314 is `Todo`, label
  `Owner`, parent CORE-293.

## Applied lessons

- L13 — `PLAN.md`, the record and every later stage artifact are formatted with prettier and markdownlint scoped to
  their own paths before each stage ends.
- L19 — no repo-wide formatter; every `--write` / `--fix` call names the written paths only.
- L33 — every figure a ticket or the orchestrator's brief states (86,865 → 84,084 B, the 82,944 ceiling, the per-gate
  table) is treated as expired and re-derived live; the record states the live value beside the cited one and says
  which state the cited one was true of.
- L40 — the record does not attribute any duration to load, nor the 2026-11-16 slowdown to CPU contention, as a cause:
  no run varied the attributed condition. Load is reported beside the durations as a condition, not a cause.
- L64 — the CHANGELOG entry restates the record's figures and its delegation label; before hand-off each restated
  figure and the phrase "not a maintainer sign-off" are grepped in the diff and checked against the record.
- L78 — figures keep the version and state they were true of: run 2 at 7.22.0 on base `8c896454`, the 2026-11-16 passes
  through the 7.16.0 runner on a 7.10.3 project copy, the baseline at 7.1.4/7.3.0.

## Files

- `.dev/measurements/delegated-signoff-2026-11-23.md` — the decision record: who decided and why it is not a sign-off;
  the evidence store and the sha256 of each file read; one section per ticket (what was decided before, evidence read
  live, the decision, what would overturn it); CORE-314's AC status; Reproduce; Bounds; "What this record may claim (P0)"
  — layer: dev apparatus
- `CHANGELOG.md` — one dated `[Unreleased]` entry under a new `### Changed` heading, no `SKILLS_VERSION` bump — layer:
  repo meta

### Not written (named so nobody adds them)

- No product-surface path, no `SKILLS_VERSION`, no `MIN_CLI`, no trusted doc, no test.
- No change to any of the four tickets' code or records: a decision that reverses or reopens names a new follow-up task
  under CORE-293 instead. The proposed decisions below reverse nothing, so no follow-up task is planned.
- The evidence files stay in the CORE-310 store; the measuring script stays in the session scratchpad and the record
  carries its logic in a Reproduce block.

## Contracts satisfied

- None: no capability, no contract. The record follows the label convention of
  `.dev/measurements/loop-baseline-2026-11-11.md` and the section shape of
  `.dev/measurements/gates-within-side-parallel-2026-11-16.md` (cite, do not restate — P4).

## Evals to write (P1)

- None: no Capability or `rule_id` is added. `node pharn/floor/validate.mjs .` stays GREEN over an unchanged product
  surface.

## Guarantee audit (P0)

- Each per-gate duration, exit, reuse row, stage elapsed, load sample, byte count and token count → measured `[R·m]` /
  `[S·m]` from a named file or command; observational, read by no verdict; never a floor guarantee.
- Each best-case saving, share, percentage and token estimate → `[R·e]` / `[S·e]` with its formula.
- Each sha256 in the record → binds the record's figures to the exact evidence bytes a later reader can re-hash; it is a
  content-hash a reader may run, not a check anything in this repo runs (advisory).
- The four decisions, the reading of each reopen condition, and "the agent decided under delegation" → advisory.
- "The maintainer signed off" → struck; AC1 of CORE-314 stays unmet.
- "Nothing in this change touches the product surface" → floor at PR time: `check:surface-bump` and `check:ship-record`
  over the diff; the writes-scope hook over the build's two declared paths.

## Trust audit (P2)

- Run 2's stamps, `cost.json`, `RUN-REPORT.md`, `VERIFY.md` and `load.txt` are project output, `trust: untrusted`. The
  record reads ints, enum strings, hashes and paths from them, and quotes no free text beyond file-relative line
  references.
- Linear ticket text reached this run through the Linear MCP and the orchestrator's prompt; acceptance criteria are
  quoted as DATA.

## Determinism audit (P5)

- No branch in the deliverable. Each decision's overturn condition is stated as a measurable threshold over a named
  record; where a threshold is a choice, the record says who chose it.

## Proposed decisions (for GATE 1)

1. **CORE-88: stay closed.** The trigger is not met on the first green run with per-gate durations (verify 42.6 s, the
   second-smallest stage; regress 856.6 s the largest), and the best case per iteration is 85.6 s (3.5% of the run)
   against heavier concurrent load on a machine that rebooted under load today. Reopen trigger unchanged.
2. **CORE-89: accept (keep the 7.18.0 reuse).** It fired on run 2 and removed one ≈383 s `test` execution at verify,
   with the lost second sample disclosed in `VERIFY.md` and `LIMITS.md §9`. Revert trigger: a run whose verify PASS
   over a reused `test` is followed by a red `test` on the same tree with no code change (a flake the second sample
   would have caught).
3. **CORE-109: the padding-only outcome stands.** A deferral buys at most ≈0.3–0.7% of run 2's weighted units, under
   the cache write the part adds back; no run failed for want of it (P7). Reopen trigger: the same bound, computed
   from a measured run's `cost.json`, reaching 3% of that run's weighted units (the 3% is the agent's choice).
4. **CORE-113: "no-go, not measured" stands, now measured once.** Run 2's orchestrator share is 26.95% (≈27.4% with
   the excluded opening request), below the 27.7% condition; the multi-session ledger condition is unmet. Reopen
   conditions unchanged.

## Questions resolved at GATE 1 (no open question remains)

The questions as put, then the answers.

1. **CORE-113 condition 1 and run 2.** Run 2 is a main-session run on a non-benchmark feature, while the 27.7% is
   pooled over agent-started runs. Recommended: count run 2 as one test of the condition's shape (whole, post-7.19.0,
   green), record 26.95% < 27.7% with the non-comparability stated, and keep the no-go. Alternative: say run 2 does not
   test the condition and the outcome remains "not measured".
2. **CORE-88 scope of the bound.** Recommended: include the build stage's full gate run in the best case (generous to
   reopening), and apply the ticket's own rule that entry style gates never overlap, with the unconstrained entry figure
   shown beside it. Alternative: verify and regress only (the ticket's literal "one side"), 43.5 s per iteration.
3. **Evidence citation.** Recommended: cite the run-2 store by path with each file's sha256, and name the CORE-310
   record as forthcoming. Alternative: wait for CORE-310's record to merge and cite it instead.
4. **Linear.** The four tickets are archived. Recommended: comment on each (commenting needs no unarchive) and change no
   state, since no row reopens. CORE-314 → In Review with the PR link and a comment that AC1 needs the maintainer.

Resolved 2026-11-23 at GATE 1 by the batch orchestrator, approved with changes. This is a model decision under the
maintainer's delegation ("You make all decisions, do not ask me"), not a maintainer sign-off:

- **Q1:** keep the no-go, but not as "now measured once". The record words it as: "no-go stands; RECORD §7 condition 1
  is still unmeasured in its comparable shape; run 2 is one non-comparable data point (main-session, non-benchmark
  feature, a single run) at 26.95%, just below 27.7%, and is not evidence either way". The reopen trigger is stated as
  §7 states it. Proposed decision 4 above is superseded by this wording.
- **Q2:** as recommended. Include build's full-gate run, apply the entry style-gate rule, show the unconstrained
  248.8 s entry figure beside it, and give the 43.5 s regress+verify-only figure in one line so the range is visible.
- **Q3:** cite the run-2 store by path plus sha256. Before the PR, `git fetch`. If CORE-310's record has merged to main
  by then, cite it by path instead of calling it forthcoming. Same for a CORE-312 PR if one exists.
- **Q4:** as recommended. Comment only on the four archived tickets, no state change; CORE-314 → In Review.
- **CORE-109's 3% trigger:** kept, labelled in the record as the agent's chosen threshold, not one the ticket set.
