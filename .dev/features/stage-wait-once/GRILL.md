# GRILL — stage-wait-once

Plan: `.dev/features/stage-wait-once/PLAN.md` · spec hash: MATCH (`d19c3ae5…7a8bcf` recomputed with
`.dev/floor/hash-doc.mjs`) · Step 1b lessons declaration: **GREEN** — `check-plan-lessons.mjs` exit 0, "all 10 cited
id(s) resolve … and are referenced in the plan body" (the declaration only, never the application — P0).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 106 (logging). Not a finding: whether the plan needs or adequately
  declares this is the observability griller's judgment.

## How the interrogation ran

The interrogation (Step 2 axes) and the 13 griller procedures were applied by an independent general-purpose agent
that did not author the plan, read-only, against the live code on this branch. Its findings are model output and
are quoted below as **DATA** (`trust: untrusted`, P2); `problem` / `evidence` are free text. The orchestrator
spot-checked the two blocking findings against the code (`stage-verify.mjs:360` `emitQuestion(…, cfg.originalArgv)`;
`stage-direct.test.mjs:568` slices after `--budget-ms`).

## Findings — design correctness

```yaml
- type: FINDING
  rule_id: "P6"
  severity: blocking
  file: ".dev/features/stage-wait-once/PLAN.md:62"
  problem: "Running the script WITHOUT --budget-ms changes what it prints: a question object's resume.argv is the script's own original argv, so it loses its --budget-ms pair; /pharn-ship's answer rule (tokens after resume.argv's --budget-ms value) then builds a line stage-direct refuses, and the existing answer-line test goes red."
  evidence: 'stage-regress.mjs:781 emitQuestion(…, stripFlagPair(cfg.originalArgv, "--tests")); stage-verify.mjs:360 emitQuestion(…, cfg.originalArgv); pharn-ship-stages.md:106-107; stage-direct.test.mjs:568 resumeArgv.slice(resumeArgv.indexOf("--budget-ms") + 2)'
- type: FINDING
  rule_id: "P5"
  severity: blocking
  file: ".dev/features/stage-wait-once/PLAN.md:61"
  problem: "Two processes read-modify-write runner.json with no serialising rule (the start call adds the runner pid, the runner adds its start-marker line and seq); either update can be lost, pid:null has no stated meaning, and a takeover can start beside a live runner."
  evidence: "plan:41-42 'runner.json with … pid: null BEFORE anything else'; plan:61-62; plan:75; entry-gates.mjs:567 rewrites runner.json only because its runner never writes it"
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:52"
  problem: "Group liveness covers a runner that dies while the script lives on, but nobody records that script's exit; when the group empties the takeover runs --resume over a finished script whose progress record is gone and gets unusable no-progress."
  evidence: 'stage-verify.mjs:485 removeIfPresent(VERIFY_PATHS.stageJson) before emit; stage-verify.mjs:538 emitUnusable(null, "no-progress", …)'
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:56"
  problem: "The takeover always runs --resume, even when the runner died before the script's first checkpoint (no-progress, or a stale stage.json of an earlier run); runner.json records the fresh argv but the plan never uses it to choose fresh vs resume."
  evidence: 'stage-exit.md:286-287 ''A kill before "drain" leaves no record of that run, and --resume answers no-progress'''
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:56"
  problem: "A takeover late in a call still gets the first-slow-step-always rule, so a resume call that waited ~570 s can run one more 540 s step past the 600 s Bash cap; 'what is left' can be 0 or negative."
  evidence: "stage-exit-core.mjs:559 first-always rule; entry-gates.mjs:917 'a call that already waited gets no free first step'"
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:39"
  problem: "The fresh call's in-flight test is pid liveness of the lock while the wait uses group liveness; a SIGKILLed runner whose script lives on leaves a stale lock, so a fresh call starts a second runner beside the orphan."
  evidence: "stage-direct.mjs:198 'if (pidAlive(held.pid))'; :205 'unlinkSync(file); // a dead holder: stale'"
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:43"
  problem: "The plan never says where the detached runner's stdio goes; inherited pipes keep the Bash call open until the runner ends, pipes to the start call EPIPE after it exits; entry-gates logs to a file."
  evidence: 'entry-gates.mjs:551-552 ''detached: true, stdio: ["ignore", fd, fd]'''
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:72"
  problem: "The exactly-once argument has gaps: no recorded seq if the runner dies before the start marker, and the script-exit record must carry stdout and exit code for a takeover to print them."
  evidence: "plan:75-77; plan:69-70"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/stage-wait-once/PLAN.md:44"
  problem: "'Compare-and-swap on the record bytes' is a read-compare-write, not atomic, and the handoff window (lock still names the start call's pid) is unstated."
  evidence: "plan:44-45"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/stage-wait-once/PLAN.md:102"
  problem: "The existing O_NOFOLLOW reader reads at most LOCK_READ_MAX = 4096 bytes; result.json carries stdout up to 16 MiB and would truncate and refuse."
  evidence: "stage-direct.mjs:148; stage-direct-core.mjs:204; stage-direct.mjs:110"
```

## Findings — P0, P1, P2, P5, P7

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:188"
  problem: "The byte-identity claim rests on 'the scripts are unchanged' though their argv changes (no --budget-ms) and stderr is dropped; byte identity and 'the wait decides nothing' are tested behaviour, not floor reductions."
  evidence: "plan:188-189; plan:194"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:163"
  problem: "C2's control (the script run directly unbudgeted) is what the runner does, so the test is near-tautological; the meaningful control is today's budgeted fresh+resume path."
  evidence: "plan:163-164"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:97"
  problem: "In-process scriptPathFor/setterPath injection cannot reach a detached --runner; C5's planted kill needs a fault-injection mechanism the plan does not name, and the script path must never travel through unauthenticated runner.json."
  evidence: "stage-direct.mjs:291"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:160"
  problem: "C1/C4 use real sleeps with ~1.5 s budgets, timing-flaky under a loaded npm test; negative controls missing (runner dead + script alive, kill before first checkpoint, pid:null, other stage in runner.json, two racing takeovers)."
  evidence: "plan:160-161; plan:168"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/stage-wait-once/PLAN.md:42"
  problem: "The runner takes the script argv from editable runner.json; it should re-validate it with parseDirectArgs' closed rules and take the script only from DIRECT_STAGES."
  evidence: "plan:41-42"
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:47"
  problem: "Branches without stated outcomes: pid:null; runner.json naming the other stage or name; the loser of two racing takeovers."
  evidence: "plan:49; plan:55"
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:53"
  problem: "A waiting exit 5 means no progress, unlike today's; a leaked gate process in a dead runner's group makes every resume exit 5 forever, and the orchestrators loop with no cap and no ask."
  evidence: "pharn-loop.md:1033 'until another exit'"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/stage-wait-once/PLAN.md:59"
  problem: "The 'no runner.json → today's resume' path is reachable only from pre-upgrade state; keep it only if that case is named."
  evidence: "plan:59"
```

## Findings — grillers

```yaml
# architecture
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/stage-wait-once/PLAN.md:87"
  problem: "A second detached-runner protocol copied from entry-gates' shape, dropping its pid-reuse defence (ps shows the nonce)."
  evidence: "entry-gates.mjs:907-908 psShowsNonce"
# comprehension
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/stage-wait-once/PLAN.md:79"
  problem: "The call-count bound's assumptions (s ≤ B, each call waits a full B) and the poll interval are unstated."
  evidence: "plan:79-80"
# coupling
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:94"
  problem: "A runner that outlives an orchestrator stop clears the shared writes-scope late, deleting a scope the stop procedure or a new run set meanwhile."
  evidence: "pharn-ship-close.md:25 BRIEFING setter"
# documentation
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:114"
  problem: "## Files omits .dev/guides/floor-orchestration.md, whose ## stage-direct.mjs section goes stale."
  evidence: ".dev/guides/floor-orchestration.md:553-555"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/stage-wait-once/PLAN.md:153"
  problem: "cost-ledger.md:555's parenthetical about a resume call closing the stage no longer describes the normal path."
  evidence: "cost-ledger.md:555"
# error-handling
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:43"
  problem: "No failure-mode list for the new modes (spawn failure, runner refusing its nonce, runner setter failure, result writes failing); without an unusable result the wait cannot tell never-started from killed."
  evidence: "entry-gates.mjs:555 spawn-failed result; stage-direct.mjs:48-65"
# observability
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/stage-wait-once/PLAN.md:65"
  problem: "result.json carries no stderr and the runner has no log, so crash stacks and stage-direct's own refusal line never reach the orchestrator."
  evidence: "stage-direct.mjs:294 stdio inherit; pharn-ship-stages.md:101"
```

a11y, i18n, migrations, performance, privacy, security (beyond the P2 entry), testability (beyond the P1 entries):
no findings.

## Summary

The direction is grounded, but two premises fail: running the script without `--budget-ms` changes the printed
question objects (and breaks `/pharn-ship`'s answer rule and an existing test), and `runner.json` has two writers with
no ordering. The takeover is under-specified (fresh vs resume, a finished script, the first-step overrun, an endless
exit-5 loop), "alive" means two things, the runner's stdio and stderr have no route, the tests' injection cannot reach
a detached runner, and the stage-direct guide is missing from `## Files`.

ADVISORY VERDICT: 24 concerns raised (2 blocking-severity, 15 important, 7 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this tally.
