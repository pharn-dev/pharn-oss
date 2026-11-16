# GRILL — loop-driver-spike

Plan: `.dev/features/loop-driver-spike/PLAN.md` · spec-hash: `f058fca3…6775d` recomputed with
`.dev/floor/hash-doc.mjs`, **equal** to the pin · Step 1b lessons declaration (`check-plan-lessons.mjs`): **GREEN** —
`applied_lessons: L4, L6, L36, L43, L44, L66`, all six resolve and are referenced in the body (exit 0).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 44 (revert), 46 (revert), 103 (revert). Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 217 (observability), 219 (logging), 229 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

(Line numbers are the scan's, over the plan as it stood before its `## Files` bullets were back-ticked; no line
moved by more than the bullets themselves.)

## Findings

### Error handling

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-driver-spike/PLAN.md:1"
  problem: "The plan does not say what the driver does when it throws itself mid-run; the run marker would stay open and no LOOP.md would be written, and the Stop guard cannot catch it because it is inert for a marker with no session."
  evidence: "'the driver's own control flow is the only thing that reaches the record step' — and no failure path for the driver's own crash is declared"
```

### Determinism / efficiency of the wait

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/loop-driver-spike/PLAN.md:51"
  problem: "The driver runs each claude -p synchronously, so by the time it runs `finish` the session has exited; `finish --budget-ms` would then poll for up to the wait's one-hour cap on a session that never reported, instead of reading no-result at once."
  evidence: "'`finish --budget-ms` waits on disk' — the plan inherits the loop's background-launch wait for a caller that has no background launch"
```

### Security / grant surface

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/loop-driver-spike/PLAN.md:114"
  problem: "The plan does not state that the driver's own writes (the slug candidate, the SPEC revert, LOOP.md) are node fs writes that no PreToolUse hook judges, where the loop makes the SPEC revert and LOOP.md through the Edit/Write tools under a set scope."
  evidence: "'the driver writes the slug candidate itself … and the `LOOP.md` from captured values' — no word on which guard sees those writes"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/loop-driver-spike/PLAN.md:105"
  problem: "`--accept-host-execution` lifts the isolation check for a run that executes the project's tests on the host with the operator's credentials; the plan should say the driver forwards it only from its own argv and the README should say what it accepts."
  evidence: "'[--accept-host-execution]' in the CLI line, with no statement of where the flag may come from"
```

### Comparability of the share

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/loop-driver-spike/PLAN.md:17"
  problem: "The comparison run is a headless main-session run, while the baseline's 27.7% / 30.2% is the group started inside an agent; the plan should say which baseline group the post-change share is set beside, and why."
  evidence: "'in the 24 runs started inside an agent the orchestrator was … 27.7% pooled / 30.2% per-run median' beside 'the spike's comparison run … **is** that measurement'"
```

### Testability of AC2

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-driver-spike/PLAN.md:137"
  problem: "The static scan for conditional tokens must strip comments, strings and regex literals first, or it will count prose such as 'if' in a comment and either fail falsely or be relaxed until it proves nothing."
  evidence: "'a static scan that no conditional token appears in the driver files outside the interpreter region'"
```

## Griller notes (no finding)

- **testability** — presence recognized: the plan declares a test file with named cases and the live runs as the
  evidence; Layer 2 concern raised above (AC2 scan).
- **security / privacy** — scanners clean; the two P2 findings above are the judgment layer. The measure script reads
  only the runs' own output directories and the ledger; it reads no transcript of any other session.
- **architecture / coupling** — the driver sits wholly under `.dev/features/`, imports nothing from `pharn/` at
  runtime (it spawns the project's own floor CLIs), and the test spawns `pharn/floor/check-loop-record.mjs` — the
  allowed `.dev/` → `pharn/` direction.
- **documentation / comprehension** — the kit README and the record carry the why; no finding.
- **observability** — every step's argv, exit, output and wall time go to `steps.jsonl`; adequate for a spike.
- **migrations** — the scanner's "revert" hits are the SPEC revert, not a schema change; not applicable.
- **performance** — each run is long (several ~9-minute `test` executions); the README states it. No finding.
- **a11y / i18n** — no user interface or user-facing text; not applicable.

## Summary

The plan is a measured spike with a real trigger and a clear stop. The concerns are about the driver's own failure
path (a crash must still close the run and write a blocked record), the wait it inherits from a background-launch
protocol it does not need, naming which writes no hook judges, and stating which baseline group the share is compared
with. None needs a re-plan; each can be answered in the build as stated in the plan's scope.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 4 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
