# REVIEW — core-349-slow-sh-leak

Floor: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The verify gate map is PASS
(`verify-report.json`).

Reviewed: the `pharn/floor/stage-verify.test.mjs` diff (the reap helpers, `killMidDrain`, four new assertions) and the
`CHANGELOG.md` `[Unreleased]` entry. Both are treated as untrusted. Nothing in them reads as an instruction to the
reviewer.

## Floor-gate findings

None.

## Advisory findings

### L-floor (P0)

The increment makes one claim, in the test and the CHANGELOG: "the Kill test leaves no `slow.sh` it started running".
It reduces to a deterministic assertion inside the suite (`deepEqual(orphans, [])` over `ps` liveness after a
SIGKILL). The PLAN's guarantee audit states its bounds: only recorded pids count, and earlier orphans are not covered.
The negative control was run once at build. With the pre-release reap replaced by a plain liveness read, the test went
red (`actual: [ 8436 ]`), and the `finally` reap still cleaned up, leaving no orphan.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-verify.test.mjs:1198"
  problem: "If `ps` is missing or prints a different format, `isSlowGate` reads false for every pid: the reap signals nothing and `orphans` is `[]`, so the leak could return with the test still green."
  evidence: 'return r.status === 0 && r.stdout.trim() === "sh slow.sh";'
```

Weighed: CI's `ubuntu-latest` and macOS both ship `ps` with `-o command=`. A cheap hardening for a later change: assert
that the first reap found at least one live gate. Release is not yet written at that point, so the gate is
deterministically alive, and a degraded `ps` would then go red loudly. It is not done here, because it would re-run the
15-minute verify for a hypothetical environment (P7). Recorded as a follow-up.

### L-eval (P1)

No capability or `rule_id` changed, so there is no eval binding to check. The test's existing real/mutant assertions
are unchanged.

### L-trust (P2)

No untrusted input and no finding emission. No finding.

### L-axis (P3)

One file, one axis: test-fixture hygiene inside the Kill test. The helpers are test-local, with no new import and no
sibling reference. No finding.

## Verdict

GREEN — 0 floor-gate findings, 1 advisory (minor).

## Lesson candidate

None proposed. The leak was a one-off race in one fixture (a release write followed too closely by `rmSync`), and the
sweep found no second member. Its remedy is a fix, not a "remember next time" rule (L20's bar is not met).
