# PLAN — core-312-reuse-and-effort-measure

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L40, L43]
- increment: Record two measurements their tickets asked for and never got — the minutes CORE-89's HEAD `test` reuse
  saves per iteration, read from real loop gate stamps, and the catches CORE-111's routed-stage effort changed,
  decided first by what effort a routed stage was served before and after 7.20.0 — in one new `.dev/measurements/`
  file, plus its CHANGELOG `[Unreleased]` entry.
- layer(s): build apparatus (`.dev/measurements/`) + repo-meta (`CHANGELOG.md`). No product surface, no
  `SKILLS_VERSION` bump.
- constitution_refs: [P0, P6, P7]
- linear: CORE-312 (epic CORE-293)

## Applied lessons

- L40 — CORE-111's claim is causal ("the configured effort now reaches a routed stage, so it thinks differently"). The
  probe for an attribution varies the attributed condition: I read what effort a routed stage was SERVED with the
  condition false (pre-7.20.0, no `effort` on the Agent call) as well as true (post-7.20.0). Both read `high`, so the
  condition is not a cause of any difference on this machine, and the A/B probe run would compare two identical arms.
- L43 — "requested `high`" (the Agent call, `meta.json`) and "served `high`" (the transcript's request records) are two
  stores that agree; agreement is not proof of what the model ran at. The record states served effort as transcript
  evidence, never as a floor fact, and names that the platform does not document the field.

## Why (P7)

CORE-312's ACs, verbatim intent: CORE-89 (7.18.0, #448) and CORE-111 (7.20.0, #453) both merged without the
measurement their tickets asked for. This is measurement only; no capability, rule or checker is added. The epic rule
"measure, do not assume" applies to both halves.

## Discovery (read this run)

### Part A — CORE-89, HEAD `test` reuse (AC1)

- The mechanism (`pharn/pharn-contracts/gate-run-record.md`, "One execution of `test` for regress and verify"): with
  `testResults.test` declared, regress HEAD runs the whole suite once (`files: []`, `compare_files` = the outside
  tests), and verify records `test` as `ran: false`, `reason: "reused"`, so verify spawns no `test`. Before 7.18.0,
  regress HEAD ran the OUTSIDE SUBSET and verify ran the whole suite. The contract's own estimate: the saving per
  iteration is "the outside-subset run that HEAD no longer makes".
- pharn-app declares `testResults.test: vitest-json` (its `pharn.config.json`). Its `pharn/.run/` still holds the last
  delivery run's stamps (feature `core63-data-retention`, 2026-11-18), already snapshotted to scratch before CORE-310's
  run overwrites them (sha256 below). Read:

  | stamp                   | sha256 (prefix) | `test` entry                                               |
  | ----------------------- | --------------- | ---------------------------------------------------------- |
  | `regress/base` (subset) | `cb886488`      | ran, 1190 outside files, **209.2 s**                       |
  | `regress/head` (whole)  | `7b8feebd`      | ran, `files: []`, `compare_files` 1190, **188.8 s**        |
  | `verify`                | `c104fef4`      | `ran: false`, `reused` from `regress/head` seq 0, no spawn |

  The two stamp digests equal `regression-report.json` `gate_run.base/head.stamp_sha256`, so the stamps are the run's
  own.

- Pre-7.18.0 reference figure (`.dev/features/head-test-single-run/PLAN.md`): verify's whole-suite `test` 286.3 s of a
  346.7 s gate sum on the same project, 7.16.0 runner.
- The real loop run on 7.22.0+ is CORE-310's, not yet started at planning time (`$SCRATCH/core-310/` absent). This
  increment does NOT run a loop.

### Part B — CORE-111, routed-stage effort (AC2)

- What CORE-111 changed (`dde008dc`, `.dev/features/stage-effort-routing/EFFORT-PROBE.md`, `pharn/LIMITS.md` §8): for a
  stage `/pharn-loop` or `/pharn-ship` ROUTES to a `pharn-stage` subagent, the Agent call now carries the configured
  `effort`. It changed nothing for a directly invoked stage (that runs on its command frontmatter, as before). Every
  stage in the shipped config, and in pharn-app's, is `effort: high`. So the stages CORE-111 changed are **every routed
  stage** (spec, plan, grill, triage, supervise, test, build, and any other the routing policy routes), and for every
  one of them the configured level is `high`.
- "Old effort" = the level a routed stage INHERITED when the Agent call named none. Measured this run from this
  machine's Claude Code transcripts (`~/.claude/projects/*/<session>/subagents/agent-*.{meta.json,jsonl}`, every
  `agentType: pharn-stage` subagent, tabulated by a scratch script; ids not recorded):
  - **Before 7.20.0** (no `effort` in `meta.json`): 4 routed stage agents in 3 sessions (2026-11-16 CORE-107 probe tree,
    2 on `claude-opus-5-5`; 2026-11-17 03:35 and 03:39 CORE-113 loop trees, `pharn-spec` on `claude-fable-5-2`,
    headless `sdk-cli` 2.1.323). Every request record: `output_config {"effort":"high"}`; every `perTurnEffort`:
    `high`. The two CORE-113 parent sessions (sonnet) also requested `high`.
  - **After 7.20.0** (`meta.json` `effort: high`): 57 routed stage agents across 5 sessions (2026-11-17/18 pharn-ci
    loops; spec, plan, grill, triage, supervise, test, build; opus and sonnet). Every request record `high`.
  - This machine's settings: global `effortLevel` `xhigh`, per-model `claude-opus-5-5` / `claude-sonnet-5-5` `high`.
    The fable-5-2 agent was served `high` although no per-model key names it, so how the inherited level is chosen is
    not documented and not derived here — only what was served.
- **Consequence:** old effort = configured effort = `high` for every stage CORE-111 changed, on this machine. A
  probe A/B "old vs configured" is two identical arms: whatever it measured would be run-to-run variance, not effort.
- Existing run data that IS this comparison: CORE-90's main kit (`.dev/measurements/defect-probes-main-7.19.0.md`),
  2 runs per probe, plan opus/high, grill opus/high, triage sonnet/high — i.e. both arms. Per stage: plan stage (p5–p6)
  1 caught-at-plan + 1 unanchored on p5, p6 passed to the grill; grill+triage p1 1/2 (r2 `triage-invalid`), p2–p4 2/2,
  p6 2/2. Total 10/12. The kit runs stages by direct invocation (frontmatter effort), not routed — a stated bound, but
  the served level is the same `high`.
- The only effort-VARIED data that exists is CORE-112's `grill-medium` arm (grill high → medium, direct invocation). It
  is not CORE-111's change (no stage was ever served medium by routing). Its p4/r2 "catch lost" is being corrected by
  CORE-313 (the hand check finds the AC-4 omission named at `PLAN.md:15`); the record cites CORE-313's hand-checked
  outcome, never the raw scorer's, and only as context.

## Proposed arms for AC2 (GATE 1 decides)

| option              | arms                                                   | runs | est. USD | what it measures                                     |
| ------------------- | ------------------------------------------------------ | ---- | -------- | ---------------------------------------------------- |
| **A (recommended)** | none new; CORE-90 main kit = both arms (served `high`) | 0    | 0        | the catch count at `high`, stated as both arms       |
| B                   | one replicate of CORE-90 main on p1–p4, grill+triage   | 8    | ~13      | run-to-run variance at `high` vs `high` — not effort |

Option B's estimate is CORE-90's measured spend for those 8 runs (USD 13.10, `stage-model-tuning` control). It would be
built with `defect-probe-kit.mjs build --arm <main checkout> --out $SCRATCH/core-312/kit/replicate --runs 2 --probe p1
--probe p2 --probe p3 --probe p4`, run through `mcp__terminal__run_in_terminal` under the heavy lock, a new output dir.
The plan does not recommend it: by L40 its outcome cannot attribute anything to CORE-111.

## How AC1 will be read

From each real loop record on 7.18.0+ with `testResults.test` declared — the 2026-11-18 `core63-data-retention` stamps
above, and CORE-310's run when its evidence lands (`$SCRATCH/core-310/run1/` and the pharn-app `pharn/.run/` stamps,
per iteration) — read with a `node -e` over the stamps (command recorded in the measurement file):

1. verify's `test`: `ran`, `reason`, and spawned time (0 s when `reused`);
2. regress HEAD's whole-suite `test` `duration_ms` — what verify would otherwise have spent (the execution verify
   reused);
3. regress BASE's subset `test` `duration_ms` — the stand-in for the pre-7.18.0 regress HEAD subset run, the run the
   contract says the change removes (same file list as the old HEAD subset when no outside test changed);
4. saving per iteration = the subset run no longer made at HEAD (item 3), and verify's test time with reuse vs
   without (0 s vs item 2), both reported; the pre-7.18.0 286.3 s figure (7.16.0 runner) as context.

If CORE-310's evidence has not landed when the build runs, the record states the one 2026-11-18 data point, names
CORE-310's as pending, and the PR waits for it (the orchestrator's call), rather than guessing.

## Files

- `.dev/measurements/reuse-and-effort-2026-11-23.md` — the record: Part A durations (per run, per iteration), Part B
  served-effort table, the AC2 catch counts per stage, the no-gain statements (AC3), bounds — layer apparatus
- `CHANGELOG.md` — one dated `[Unreleased]` entry — repo-meta

### Not written

- `.dev/features/head-test-single-run/**` and `.dev/features/stage-effort-routing/**` are dated records of merged
  increments; AC4 is met by the new file, linked from both tickets by a Linear comment with the PR link.
- No committed script: the reads are one `node -e` each over stamps and transcripts, recorded verbatim in the file
  (P7: no checker without a failure).
- No pharn-app paths or file lists are committed (private project): durations, counts and sha256s only.

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — read, not changed: `runs[].duration_ms`, `ran`, `reason`, `reused`,
  `compare_files` are the fields the record reads.
- `pharn/pharn-contracts/verify-report.md` "gate_reuse" — read, not changed.

## Evals to write (P1)

- None: no capability is added or changed. The record is apparatus prose.

## Guarantee audit (P0)

- The durations, `ran`/`reason`/`reused` values and stamp digests → floor-grade inputs (each stamp validated by the
  runner, digests equal to the regression report's) — but the record's arithmetic over them is **advisory**.
- "Saving per iteration ≈ BASE subset duration" → **advisory**: a stand-in for a run no longer made; load and cache
  differ between the two runs (the 2026-11-18 HEAD whole-suite run was faster than the BASE subset run).
- Served effort `high` before and after 7.20.0 → **advisory**: undocumented transcript fields, one machine, its
  settings; agreement of `meta.json` and request records is not proof (L43).
- "No gain from CORE-111 on this machine" → **advisory**, derived from the served-effort table; holds only where the
  inherited level equals the configured one.
- Probe catch counts → as CORE-90's record states them (scorer floor, match meaning advisory); p4 per CORE-313's hand
  check.

## Trust audit (P2)

- pharn-app stamps and transcripts are untrusted data: only enum/int/digest fields are read (durations, booleans,
  effort enum strings, model ids); no free text from them is copied into the record.

## Open questions (HALT)

- GATE 1: Option A ($0, reuse CORE-90's main kit as both arms, state "no change in served effort, so no gain by
  construction") or Option B (~USD 13 replicate that measures variance only)?
- Should the PR wait for CORE-310's run evidence before opening, or open with the 2026-11-18 data point and add
  CORE-310's figures by a follow-up commit on the same PR?
