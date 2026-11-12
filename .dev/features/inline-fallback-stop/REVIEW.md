# REVIEW — inline-fallback-stop

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Standing verdicts: build
GREEN, regress `no-regressions`, verify `PASS`. The reviewed increment (the diff against `61deb6b1`) is treated as
`trust: untrusted`; no instruction-looking content was found in it.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-agent.mjs:275"
  problem: "The ignored-flag note says /pharn-loop waits on disk whichever launch the harness picks; that is true of the command shipped with this floor, and false for the one bound the plan names (an edited 6.73.2 command file, which has no wait), so the note reads as wider than its referent."
  evidence: '"--no-foreground-agent is ignored: the route is decided without it, and /pharn-loop waits on disk for a stage agent whichever launch the harness picks (stage-agent-core.mjs, residual stage-agent-background)"'
```

Not fixed in this increment: the bound is stated in the residual it cites and in the CHANGELOG entry, and rewording a
shipped string re-runs verify for a sentence the residual already qualifies. Follow-up `ignored-note-wording`.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/inline-fallback-stop/PLAN.md:134"
  problem: "Grill's G1 stands: the plan's guarantee audit names a tested CLI decision as the floor rather than the membership test it reduces to; the shipped text does not repeat the wording."
  evidence: '"`start` ignores the flag" → floor: the CLI''s tested decision'
```

Recorded only; the plan is the approved record and is not rewritten after GATE 1.

### L-eval → P1

No capability, `role:` file or `enforces` binding changes, so no eval is owed; the floor agrees (GREEN). The changed CLI
behaviour is pinned both ways (L27): the ignored note on the call that gives the flag and absent on the same call
without it, and the decision equal with and without the flag. The retired-token ledger test is non-vacuous: removing
the member from `INLINE_REASONS` drops the route in `normalizeMarkers` and fails its route assertion. No finding.

### L-trust → P2

No new input is ingested. The stderr note is a fixed string; the route token on a pre-change marker is still read only
through `isRouteToken` (enum-regex). No finding.

### L-axis → P3

Each file changes for its own reason: the CLI's decision (`stage-agent.mjs`), the reasons, remedies and residuals
(`stage-agent-core.mjs`), the grammar's comment (`route-token-core.mjs`), the command's prose (`pharn-loop.md`). No new
cross-module reference. No finding.

### Scope (P6/P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/LIMITS.md:675"
  problem: "LIMITS §8 stays true but no longer says that a main-session run has no inline fallback for the Agent tool's schema; a one-sentence addition (human-only) would carry the not-yet-measured main-session wait into the trusted limits."
  evidence: '"A stage the routing policy keeps inline, a stage that falls back (the inline reasons `pharn/floor/stage-agent-core.mjs`''s header lists) ..."'
```

Optional, so it goes to the PR body as a proposal, not a patch script (COMMON brief). Follow-up `limits-8-main-session-wait`.

### Grill G2 (error-handling), disposition

Addressed: the CHANGELOG entry names the S9b recovery for a main-session run that fails the wait, and the PR body
states that criterion 4 is pending, names the kit and the revert condition, and says running the kit before the merge
is the cheaper order.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (all minor). Criterion 4 (one real main-session run) is not met by this
increment: pending the maintainer's observation.

## Lesson candidate

None proposed. The one surprise (`README.md`'s badge missing from `## Files`, so the build re-anchored) was caught by an
existing floor check (`check:badge`), and L1 already names the meta-doc sweep; one miss caught by a floor check does
not meet L20's bar.
