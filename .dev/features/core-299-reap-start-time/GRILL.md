# GRILL — core-299-reap-start-time

Plan: `.dev/features/core-299-reap-start-time/PLAN.md` · spec-hash check: MATCH
(`f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d`) · Step 1b lessons-declaration verdict (FLOOR):
GREEN — `check-plan-lessons.mjs` exit 0, all 7 cited ids (L34, L37, L41, L64, L67, L75, L84) resolve and are
referenced in the plan body.

GATE 1: approved by the orchestrator. This is a model decision under delegation (orchestrator), not a human approval.
It confirmed the `etime` field, the 10 s tolerance, the stderr note and the new leader-exited limit. It asked that the
new limit be stated explicitly in the BOUNDS note, the contract sentence and the CHANGELOG entry, and that every
fixture group be killed by process group in cleanup using the ESRCH-tolerant form.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 60 (tracing). Not a finding: whether the plan needs or adequately
  declares this is the observability griller's judgment.

## Findings

### error-handling / testability

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/core-299-reap-start-time/PLAN.md:167"
  problem: "The mismatch test asserts the group is still live right after the call, but the reap's own SIGTERM->SIGKILL escalation would take up to 2 x KILL_GRACE_MS; a check made immediately could pass while a signal is in flight."
  evidence: "the group is still live after the call"
```

Resolution for build: `reapGroup` is synchronous and returns only after its waits, so a signalled group is already dead
(or refused) when it returns. The test should still re-check liveness after a short delay (≥ 500 ms) so that a stray
signal cannot slip past the assertion.

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/core-299-reap-start-time/PLAN.md:89"
  problem: "The plan computes the implied start from Date.now() after ps returns; under load ps latency adds to the estimate in one direction only, and the plan does not say which side of the tolerance it eats."
  evidence: "Implied start = `Date.now()` taken after `ps` returns, minus `seconds * 1000`."
```

Resolution for build: take `Date.now()` before spawning `ps`. `etime` is measured at ps time, which is ≥ that instant,
so the estimate errs toward an earlier start by at most the ps latency plus 1 s of resolution. Either choice fits
inside 10 s; the comment must state the chosen side.

### architecture / coupling

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/core-299-reap-start-time/PLAN.md:111"
  problem: "parseElapsedSeconds is a pure grammar function placed in run-gates.mjs, the execution file, while the guide keeps pure grammar in gate-run-core.mjs."
  evidence: "`parseElapsedSeconds` + `START_MATCH_TOLERANCE_MS` (exported for the test)"
```

Disposition: acceptable as planned. The parser serves only the reap and is not part of the gate-run record grammar
that gate-run-core owns. Moving it would add a cross-file edit for no reuse (P7). Named so review can overrule.

### security

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/core-299-reap-start-time/PLAN.md:87"
  problem: "ps is resolved from PATH; a PATH-planted ps could report a matching elapsed time and steer the reap onto a reused group."
  evidence: '`execFileSync("ps", ["-o", "etime=", "-p", String(pgid)]'
```

Disposition: no change. A writer who controls PATH already executes code as the user (the gates themselves run from
PATH, and so does `git`), so this adds no capability. The plan's guarantee audit already names the bare-name lookup.

### observability, documentation, comprehension, performance, privacy, i18n, a11y, migrations

No findings. The stderr note is the observability surface, and no pinned command line redirects the stage scripts'
stderr (grep over `.claude/commands/*.md` found no `2>` on a `stage-verify.mjs`, `stage-regress.mjs` or `run-gates.mjs`
line). The extra `ps` spawn happens only on the reap path. No UI, PII, user-facing strings or schema are involved.
The documentation sweep is the plan's L75 section.

## Summary

The plan's verification is present: a real live group for the mismatch path, plus the unreadable-start case and the
matched-start control. Its error handling is declared: `ps` failure, timeout and a missing `started_ms` all mean "not
signalled". The concerns are two timing details for the build to pin (a delayed liveness re-check, and which side of
the tolerance `ps` latency falls on) and two named, accepted dispositions (parser placement, PATH lookup).

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory) — for the human to weigh before /pharn-dev-build.
