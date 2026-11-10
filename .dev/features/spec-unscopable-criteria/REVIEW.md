# REVIEW — spec-unscopable-criteria

Floor: `node pharn/floor/validate.mjs .` → **GREEN** (37 capabilities). Verify PASS (7 gates), regress no-regressions.
Everything below is advisory.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-spec-unscopable.mjs:13"
  problem: "In an installed project whose git config the setter cannot read, the setter refuses every plan, so every candidate token is reported as a hit — including a plain source path — and the MENTIONS list then names criteria that mention no unscopable path at all."
  evidence: "So the verdict is the setter's own in THIS project's posture"
```

The header's claim stays literally true (the setter would refuse each token from a plan), and the plan stage would stop
too, but the line printed per hit suggests a path problem. A one-line bound in the header would make it visible.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-spec-unscopable.mjs:99"
  problem: "The setter exits 1 for usage errors and refusals alike, so 'non-zero = refused' rests on the throwaway plan being well-formed by construction (a closed token alphabet inside back-ticks, one contiguous list); no test feeds a token that would make the plan itself unparseable."
  evidence: 'return r.status === 0 ? "ok" : "refused";'
```

The alphabet excludes every character the setter's `## Files` reader treats specially (`<`, `>`, `*`, back-tick, space),
so no such token is reachable today. Recorded as the assumption it is.

### L-eval → P1

No Capability added; the checker ships 28 tests. Both requested directions are pinned (edit and cite both hit), each with
a control that flips it (dev posture; reworded path). The refused-class enumeration covers ten members and six exempt
ones. No finding.

### L-trust → P2

No instruction-looking content in the reviewed files changed this review. The CLI prints AC ids, line numbers and tokens
from a closed alphabet, and a test pins that a hostile criterion's prose does not reach stdout. The run report copies the
model-written `## Needs a person` section inside a computed fence. No guaranteed decision reads either: `/pharn-spec`'s
move step is advisory, and the plan stage's setter refusal stays the floor backstop. No finding.

### L-axis → P3

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/spec-template-core.mjs:7"
  problem: "The header still says check-spec.mjs is the only importer ('nothing else imports it'), which was already untrue (ac-gate-core.mjs) and is now further contradicted by the new paragraph naming two more readers."
  evidence: "check-spec.mjs imports it and turns its findings and refusals into REDs and exits; nothing else imports it."
```

The CLI reaching `.claude/hooks/set-writes-scope.cjs` by a cwd-relative path follows `loop-closeout.mjs`; no sibling
capability reference. `render-run-report.mjs` gains a source (the SPEC) for a section of the same kind it already
renders (copied run artifacts), so its one axis holds.

## Reported for a human, never agent-edited

- `pharn/LIMITS.md §1d` lists what backstops a model-approved SPEC; it could name the unscopable-criteria move and its
  bound (a mention, not a required write). Trusted doc — human edit only.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (all minor).

## Proposed lesson candidate (not written to canon)

- **A refusal added at a later stage must be surfaced at the earliest stage that pins the input it refuses.** 7.3.0
  taught the setter to refuse instruction files from a plan, and `/pharn-plan` documented it, but `/pharn-spec`, which
  pins the criteria that decide what a plan must write, was not updated, so a pinned SPEC carried a criterion no plan
  could serve and the run spent ~17 minutes finding out (S10). Provenance: feature `spec-unscopable-criteria`, source
  this REVIEW.md § Proposed lesson candidate and PLAN.md § The failure.
