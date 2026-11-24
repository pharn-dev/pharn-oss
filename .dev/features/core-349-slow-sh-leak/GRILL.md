# GRILL — core-349-slow-sh-leak

Plan: `.dev/features/core-349-slow-sh-leak/PLAN.md`. Spec hash: recomputed
`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`, equal to the pin. Step 1b lessons declaration
(`check-plan-lessons.mjs`, exit 0): GREEN — applied_lessons L13, L52, L60 resolve and are referenced in the body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### error-handling / safety (inline P0 axis + error-handling griller)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/core-349-slow-sh-leak/PLAN.md:35"
  problem: "Signalling a recorded pid after its process exited can hit an unrelated process that reused the pid; the resume's re-run of slow.sh exits at once, so its pid is stale by the time `finally` reaps it."
  evidence: 'for each recorded pid, `process.kill(-pid, "SIGKILL")` and `process.kill(pid, "SIGKILL")`, each ignoring `ESRCH`'
```

The same staleness makes the liveness probe `process.kill(pid, 0)` read a reused pid as a surviving gate (a false red).
Suggested remedy: treat a pid as this fixture's gate only while `ps -o command= -p <pid>` reads exactly `sh slow.sh`;
signal and count only those.

### testability (testability griller + inline P1 axis)

Presence recognized: the plan names its test change, the assertion, and a negative control (L60).

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/core-349-slow-sh-leak/PLAN.md:39"
  problem: "Reaping the orphan before `--resume` changes what the real call's resume meets: it always finds the recorded gate group dead, where before it could (racily) find it alive and reap it itself."
  evidence: "call `reapSlowGates` and return its survivors as `orphans`. The release write stays"
```

Weighed: before the change the release was written before the resume, so the orphan usually exited within its ~100 ms
poll before the resume read `lock.child` — the live-group reap was never deterministically exercised here. The test's
named property (drain checkpoint persisted, resume reaches `done`) is unchanged. Worth one sentence in the PLAN.

### Other axes

- architecture, coupling, comprehension, documentation: test-local helper, no cross-module import; no finding.
- a11y, i18n, migrations, observability, performance, privacy, security: not applicable to a test-fixture change (no
  UI, text, schema, runtime path, PII or new input surface); no finding.
- P7 scope: triggered by a recorded failure (CORE-349) reproduced this run; smallest increment. No finding.

## Summary

Two concerns. The pid-reuse one is real: a test that SIGKILLs a stale pid can kill another process of the same user,
which on this machine is the batch's other agents. Gating every signal and liveness probe on the pid still being
`sh slow.sh` closes it cheaply. The resume-path shift is minor and should be stated, not avoided.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 1 important, 1 minor) — for the human to weigh before
/pharn-dev-build.
