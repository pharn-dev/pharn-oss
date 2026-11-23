# HEAD `test` reuse saving (CORE-89) and routed-stage effort catches (CORE-111) (2026-11-23)

**Status: measured, no new model runs.** Linear CORE-312 (epic CORE-293). Two merged changes shipped without the
measurement their tickets asked for: CORE-89 (7.18.0, #448: verify reuses regress HEAD's whole-suite `test` run) and
CORE-111 (7.20.0, #453: a routed stage agent is requested at its configured effort).

- **CORE-89, HEAD `test` reuse: a saving is shown.** In all three measured iterations verify spawned no `test`
  process: it recorded regress HEAD's whole-suite run as reused. Without the reuse it would have run that suite again,
  which took 184.1 s, 188.8 s and 383.3 s at regress HEAD. The run 7.18.0 removed from each iteration is the HEAD
  outside-subset run; its stand-in, the BASE subset run, took 211.8 s, 209.2 s and 410.0 s. So each iteration saved
  about 3.5 minutes of `test` on a quiet host, and about 6.8 minutes in this batch's real loop run (CORE-310 run 2),
  which ran under heavy external load.
- **CORE-111, routed-stage effort: no gain shown.** On this machine a routed stage was sent at `high` before 7.20.0
  (no effort on the Agent call, so the level was inherited) and at `high` after it (the configured level). The old
  effort equals the configured effort for every stage CORE-111 changed, so an A/B on the defect probe set would
  compare two identical arms. No new probe runs were paid for. **Keep or revert is the maintainer's call** (AC3).

## Part A — CORE-89: verify's `test` with reuse vs the regress HEAD run it replaced (AC1)

### What changed, and what is read

Before 7.18.0 each iteration ran `test` twice at HEAD: regress over the OUTSIDE subset (the tests not changed since
the base), and verify over the whole suite. Since 7.18.0, when the project declares `testResults.test`, regress HEAD
runs the whole suite once, and verify records that execution as reused (`ran: false`, `reason: "reused"`) and spawns
nothing (`pharn/pharn-contracts/gate-run-record.md`, "One execution of `test` for regress and verify"). The measured
project declares `testResults.test: vitest-json` and has skills 7.22.0 installed.

Three sources, read on 2026-11-23:

- **Each feature's `cost.json` `work[]`** in the measured project (`pharn-stage-work/2`). Every regress and verify
  execution records its per-gate `duration_ms` and how many gates it reused. These survive per iteration. Every
  `cost.json` in the project was read. Only the two 7.22.0 runs below carry per-gate durations; older work entries
  record none, so no pre-7.18.0 iteration can be read this way.
- **That project's last run's gate stamps before this batch** (`pharn/.run/pharn-regress/base-gates/stamp.json`,
  `.../head/stamp.json`, `pharn/.run/pharn-verify/gates/stamp.json`, for `core63-data-retention`). Each holds that
  run's `test` entry: `ran`, `reason`, `reused`, `duration_ms`, and the file counts. Stamps exist for the latest
  delivery run only.
- **CORE-310 run 2's gate stamps**, the real loop run of this batch (base `8c896454`, intent v2, 2026-11-23 13:26:59 to
  14:07:50 CET, `STOP_GREEN` after one iteration), as CORE-310 stored them (its `run-state/` copy of the project's
  `pharn/.run/`). CORE-310's record is `.dev/measurements/loop-real-run-7.22.0-2026-11-23.md`.

Read with:

```sh
node -e 'const fs=require("fs");for(const p of process.argv.slice(1)){const s=JSON.parse(fs.readFileSync(p));for(const r of s.runs)if(r.id==="test")console.log(p,s.stage,s.side,r.ran,r.reason||"",r.duration_ms,(r.files||[]).length,(r.compare_files||[]).length)}' <base-stamp> <head-stamp> <verify-stamp>
node -e 'const fs=require("fs"),path=require("path");const d=path.join(process.argv[1],"pharn/features");for(const f of fs.readdirSync(d)){const p=path.join(d,f,"cost.json");if(!fs.existsSync(p))continue;for(const w of JSON.parse(fs.readFileSync(p)).work||[]){const t=b=>((b?.durations||[]).find(x=>x.id==="test")||{}).duration_ms;if(w.stage==="pharn-regress")console.log(w.ts,f,"regress head",t(w.head),"base",t(w.base));if(w.stage==="pharn-verify")console.log(w.ts,f,"verify test",t(w.gates),"reused",w.gates?.reused)}}' <project>
```

No file list from the measured project is recorded here, because it is a private project: only durations, counts and
digests.

### Results

| run (feature, regress end, UTC)                     | regress HEAD `test` (whole suite)        | regress BASE `test` (outside subset) | verify `test`                                                               |
| --------------------------------------------------- | ---------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `pricing-competitor-column-2`, 2026-11-17 18:04     | 184.1 s                                  | 211.8 s                              | reused (`gate_reuse`: `test`, `typecheck` from `regress/head`), 0 s spawned |
| `core63-data-retention`, 2026-11-18 00:32           | 188.8 s, `files` 0, `compare_files` 1190 | 209.2 s, 1190 files                  | `ran: false`, `reused` from `regress/head` seq 0, 0 s spawned               |
| `profile-todo-cleanup` (CORE-310 run 2), 2026-11-23 | 383.3 s, `files` 0, `compare_files` 1240 | 410.0 s, 1240 files                  | `ran: false`, `reused` from `regress/head` seq 0, 0 s spawned               |

- **Verify's `test` time with reuse:** 0 s spawned in all three iterations. Verify's `typecheck` was reused too, as
  it has been since 6.34.0.
- **The regress HEAD duration it replaced:** 184.1 s, 188.8 s and 383.3 s. That is the whole-suite execution verify
  reused, and roughly what verify would have spent without the reuse.
- **What 7.18.0 removed from each iteration** is the HEAD outside-subset run: regress HEAD now runs the whole suite in
  its place, and verify runs nothing. Its stand-in is the BASE subset run (the same file list when no outside test
  changed during the build): 211.8 s, 209.2 s and 410.0 s. The saving per iteration is about 3.5 minutes of `test` on a
  quiet host and about 6.8 minutes under the load of CORE-310 run 2, plus one of the two chances per iteration to hit
  the per-gate timeout.
- **CORE-310 run 2's other `test` executions, for scale:** entry 451.3 s, build (full suite) 327.7 s. Every gate in
  that run ran under external load (1-minute load average 14 to 80, as CORE-310 recorded), which is why its figures are
  about twice the quiet runs'.
- **Context:** before 7.18.0, verify's whole-suite `test` took 286.3 s of a 346.7 s gate sum on the same project (7.16.0
  runner, `.dev/features/head-test-single-run/PLAN.md`).
- **CORE-310's earlier attempts added no data point.** Its first attempt (base `be523aa8`) was killed by a host reboot
  during the build. Run 1 (base `8c896454`, 11:39 to 11:56 CET) stopped at the test stage before any build:
  `blocked: stage-refused` at stuck point S9, `INCONCLUSIVE`, with no regress and no verify.

Evidence digests (sha256; the files are held outside the repository):

| file (measured project)                                             | sha256                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `pharn/.run/pharn-regress/base-gates/stamp.json`                    | `cb88648812cc75977013caae5095650ddded051ade6584f6274466f8d36b5f21` |
| `pharn/.run/pharn-regress/head/stamp.json`                          | `7b8feebd5da512089120d5c1694f5a1836b795089a0ad69c48754fa1f6d72210` |
| `pharn/.run/pharn-verify/gates/stamp.json`                          | `c104fef41181cad72ef6c6698544d3b1236649e44f0c634ecfbfd725f57bffc1` |
| `pharn/features/core63-data-retention/regression-report.json`       | `f21d315ae5ef2f1f8681c63a15c72dd37714ce5ccd4f75b0b9e6524606c2367b` |
| `pharn/features/core63-data-retention/verify-report.json`           | `72e3df835867bca4312d385e9009962ac37fad0a8d24c8f6a1c0ee8a2b030d4f` |
| `pharn/features/core63-data-retention/cost.json`                    | `20ed804d20cd8f4f23a0727fa142f87db30c0842d597e92b2c2343317dacfc29` |
| `pharn/features/pricing-competitor-column-2/regression-report.json` | `8f239b246552483943b6117586c920cbec924608f1d3b1942c97298093225ac3` |
| `pharn/features/pricing-competitor-column-2/verify-report.json`     | `7722f5d6948f44c7225113f5c83610c39db9578554b02162ab3643137116ff5b` |
| `pharn/features/pricing-competitor-column-2/cost.json`              | `18cde208a718b7a143a9a9c05437e5933b4b0d078f39b4d9569f278ca00a3ebc` |
| CORE-310 run 2: `pharn-regress/base-gates/stamp.json`               | `5a27cc246c49ee602db1af6cb7fc9e5bad659b160635e63adf666aa0e1ba8d7e` |
| CORE-310 run 2: `pharn-regress/head/stamp.json`                     | `7d0fb37170b811b227e7939d6fef29b76217389726376fcd3497c6705b4bc3d2` |
| CORE-310 run 2: `pharn-verify/gates/stamp.json`                     | `8b4347db908ed1660bfaacec6abda04e7ada10593487fb2575dd6adca5bd97b1` |
| CORE-310 run 2: the feature's `regression-report.json`              | `c659c115107cb58b1241d3d4710e0e34ec97913d0d58e02128da1da28039234b` |
| CORE-310 run 2: the feature's `verify-report.json`                  | `46164b8d0aab68b3ca79f6bf40fd49bf6617b4e6cabe894487b6dc588a20a1ca` |

In each of the two runs with stamps, the three stamp digests equal that run's `regression-report.json`
`gate_run.base` / `gate_run.head` `stamp_sha256` and its `verify-report.json` `gate_run.stamp_sha256`, so the stamps
are that run's own. All three runs' `verify-report.json` `gate_reuse` names `test` and `typecheck`, both from
`regress/head`. CORE-310 run 2's reports read `no-regressions` and `PASS`.

### Bounds (P0)

- The durations, the `ran` / `reason` / `reused` values and the stamp digests are the runner's own records. The
  arithmetic over them is advisory.
- The saving is read through a stand-in for a run that no longer happens. The two runs it compares ran at different
  moments under different load: in all three iterations the HEAD whole-suite run, which contains the subset, was faster
  than the BASE subset run.
- Three iterations on one project, one of them under heavy external load, are evidence about those iterations, not a
  distribution.
- Verify gave up its independent second sample of `test` (`pharn/LIMITS.md` §9). This record measures the time, not
  that loss.

## Part B — CORE-111: catches at the old effort vs the configured effort (AC2)

### Which stages CORE-111 changed, and what "old effort" was

CORE-111 changed only the stages that `/pharn-loop` and `/pharn-ship` ROUTE to a `pharn-stage` subagent: the Agent call
now carries the configured `effort` (`pharn/LIMITS.md` §8, `.dev/features/stage-effort-routing/EFFORT-PROBE.md`). A
directly invoked stage runs on its command frontmatter, as before. Every stage in the shipped config, and in the
measured project's, declares `effort: high`. So the changed stages are every routed stage (spec, plan, grill, triage,
supervise, test, build, and any other the routing policy routes), each configured `high`.

"Old effort" is the level a routed stage inherited when the Agent call named none. It was read on 2026-11-23 from this
machine's Claude Code transcripts: every subagent whose `meta.json` has `agentType: pharn-stage`. For each one the
record reads the requested level (`meta.json` `effort`) and the level its requests were sent with (each request
record's `output_config.effort`, and `perTurnEffort`). Session ids are not recorded.

| period                        | routed agents | sessions | requested (`meta.json`) | sent (`output_config`, `perTurnEffort`) | stages and served models                                                                                                   |
| ----------------------------- | ------------- | -------- | ----------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| before 7.20.0 (2026-11-16/17) | 4             | 3        | none                    | `high` in every record                  | 2 probe agents (stage not recorded) on `claude-opus-5-5`; 2 `pharn-spec` on `claude-fable-5-2`, headless `sdk-cli` 2.1.323 |
| after 7.20.0 (2026-11-17/23)  | 73            | 7        | `high`                  | `high` in every record                  | plan 15, grill 15, triage 15, build 10, spec 8, test 7, supervise 3; `claude-opus-5-5` and `claude-sonnet-5-5`             |

The "after" rows include CORE-310's three 2026-11-23 sessions (headless `sdk-cli` 2.1.328): spec, plan, grill,
triage, test and build were all requested and sent at `high`. CORE-310 run 2's own report lists every routed Agent call
with its configured model and `effort:high`, so the routing fired. Because every configured effort is `high`, the
routed request cannot be told apart from the inherited default.

- **What the "before" side covers.** It is small, and it holds opus and fable routes only. No sonnet-routed stage
  (triage, build) was observed before 7.20.0. For sonnet routes, "inherited `high`" is an inference from the two
  pre-7.20.0 loop sessions' own sonnet parent sessions, which also sent `high`.
- **This machine's settings:** global `effortLevel: xhigh`, per-model `high` for `claude-opus-5-5` and
  `claude-sonnet-5-5`. The fable agents were sent at `high` although no per-model key names that model. How Claude Code
  picks an inherited level is not documented and is not derived here; only what was sent is recorded.

### The comparison, and why no new runs were paid for

On this machine old effort = configured effort = `high` for every stage CORE-111 changed. An A/B on the probe set,
"old vs configured", would run two identical arms. Any difference it showed would be run-to-run variation, not effort:
to test an attribution, vary the attributed condition, and here the condition does not vary (L40). So no new kit ran
(GATE 1, Option A, a model decision under the maintainer's delegation). CORE-90's main kit
(`.dev/measurements/defect-probes-main-7.19.0.md`: plan opus/high, grill opus/high, triage sonnet/high, 2 runs per
probe, `main` 7.19.0) is the catch count for both arms:

| stage (probes)             | old effort (`high`)                                               | configured effort (`high`) |
| -------------------------- | ----------------------------------------------------------------- | -------------------------- |
| plan (p5, p6)              | p5: 1 caught at plan, 1 stopped at plan unanchored; p6: passed on | the same runs              |
| grill + triage (p1–p4, p6) | p1 1/2 (r2 `triage-invalid`), p2 2/2, p3 2/2, p4 2/2, p6 2/2      | the same runs              |
| chain total                | 10 of 12                                                          | 10 of 12                   |

**No gain shown.** The kit invokes each stage directly (frontmatter effort), not through routing; the level sent is
the same `high` either way.

### Where CORE-111 could matter, and the closest proxy

CORE-111 changes what a stage runs at only where the inherited level differs from the configured one: another
machine's settings, a parent session at another level, or a `CLAUDE_CODE_EFFORT_LEVEL` environment. None of that was
measured here.

The closest existing evidence is a **proxy, not the CORE-111 comparison**: CORE-112's `grill-medium` arm
(`.dev/measurements/stage-model-tuning-2026-11-17.md`), a directly invoked grill at medium vs high, 8 pairs on p1–p4.
That record reads one catch lost on p4/r2. CORE-313 corrects it: the medium grill's finding `G1-1` names the planted
AC-4 omission at `PLAN.md:15`, triaged `replan`
(`.dev/features/stage-model-tuning/runs/grill-medium/p4/r2/grill-findings.json`), but outside the manifest's anchors,
so the scorer missed a real catch. Hand-scored, medium lost no catch in 8 pairs, and chain USD went 13.10 → 11.20
(−14%). **What high bought over medium on the grill in the probe set: nothing measurable.** This is advisory: 8 pairs,
authored probes, a hand score, and an effort that nothing records as served.

### Bounds (P0)

- Requested and sent effort are transcript fields the platform does not document. `meta.json` and the request records
  agreeing is not proof of what the model ran at (L43). One machine, its settings, 77 routed agents.
- The probe counts are CORE-90's, with its bounds (authored probes, two runs per probe).
- "No gain" holds only where the inherited level equals the configured one.

## Decision (AC3)

- **CORE-89:** in every measured iteration the reuse removed verify's `test` execution, saving about one outside-subset
  run per iteration (about 3.5 minutes quiet, 6.8 minutes under load; Part A). Keep or revert is the maintainer's call.
- **CORE-111:** no gain shown on this machine, by construction (Part B). Keep or revert is the maintainer's call. The
  change is a request, and it matters only where an inherited level would differ from the configured one.

## What this record may claim (P0)

- **Floor-grade inputs:** each stamp's and work entry's `duration_ms`, `ran`, `reason`, `reused` and digest, as the
  gate runner wrote them; CORE-90's scorer outcomes.
- **Advisory:** the saving arithmetic and its stand-in; the transcript effort fields; CORE-313's hand score; anything
  beyond the three iterations and 77 agents counted here.
