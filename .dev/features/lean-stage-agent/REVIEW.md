# REVIEW — lean-stage-agent (CORE-107)

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The increment adds no
capability. It changes product `.claude` surface: one new agent definition, two Agent-call items, two close parts.
The rest is dev apparatus and repo meta. Reviewed as `trust: untrusted`. No instruction-looking content was found in
the changed files.

## Floor-gate findings

None.

## Advisory findings (each gates nothing)

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-agent-core.mjs:231"
  problem: "The header's residual still reads as if no `.claude/agents/` definition existed for stage agents; one now does, though installs still lack it, so the line is true but no longer the whole picture."
  evidence: "stage-agent-effort      — routing effort needs `.claude/agents/` definitions `pharn update` would install."
```

The line stays accurate: effort is still not routed, and installs still get no definition. A reword belongs to
CORE-111 (stage-effort-routing), which owns that residual. Not changed here: the module is outside this plan's
`## Files`.

Every other claim checks out. The type's tool list, its system prompt and the fallback are labelled advisory in item 2
("Claude Code applies it") and in both close parts' container bullet. The struck claim is named. The SHA and closure
pins are enum/content-hash over committed text, and the test header says so. The AC2 saving is never claimed from the
bytes estimate: CHANGELOG, LIMITS §3g and VERIFY.md all say it is unmeasured.

### L-eval → P1

No capability, so no eval pair is owed. Each pin in `stage-agent-type.test.mjs` has its own in-memory control (L60),
and every slicing anchor is asserted found.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/floor/stage-agent-type.test.mjs:239"
  problem: "closeOffenders slices from the claims heading before testing that the heading exists; the result is still correct (the -1 case returns the anchor offender), but the order reads as if the slice could run on a missing anchor."
  evidence: 'const claims = text.slice(text.indexOf("## What you may claim"));'
```

### L-trust → P2

No new ingested input. The definition's body is trusted product text, and it adds and drops no fence: the brief's
rule 5 and each stage command's trust rules still govern a stage's reads. The stage agent's final text still returns
into the orchestrator's context. That is the existing `THREAT-MODEL.md §5` residual, unchanged, and both close parts
already name it. The probe kit reads transcripts outside the repo and writes nothing.

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".claude/agents/pharn-stage.md:4"
  problem: "The tool list names MultiEdit, which not every current Claude Code session offers; whether an unknown entry is ignored or rejects the definition is not observed until the probe runs (the kit prints the tool names it was served)."
  evidence: "tools: Read, Glob, Grep, Bash, Write, Edit, MultiEdit, NotebookEdit"
```

### L-axis → P3

Each file has one reason to change. The new test owns the stage type, and `review-lens-agent.test.mjs` keeps the lens
type, now filtering the other name out of its closure. No sibling reference.

## Grill findings, followed up

- **P5, the fallback condition** (GRILL error-handling). Addressed. Both item 2 texts make the fallback depend on the
  type being absent from the Agent tool, or on the call returning an error without starting an agent. A started agent
  is never followed by a second call. The loop adds that a call that started no agent is not one its item 3 follows.
  All of this is pinned by ★ WIRING and its controls.
- **P2, the replaced system prompt** (GRILL security). Addressed in both container bullets: "tool list and system
  prompt (the definition's body, in place of `general-purpose`'s)".
- **P1, `MultiEdit`** (GRILL testability). Carried as the advisory finding above. The kit's reader prints the
  served tool names.

## Process notes (advisory)

- The plan missed `README.md`, whose version badge is bound by `check:badge`. It was added during the build after a
  `CLEAN` reconcile preview, followed by a second build anchor. Recorded in `PLAN.md` ("Build deviation").
- `/pharn-dev-regress` and `/pharn-dev-verify` ran their pinned steps through a scratch node runner and background
  `run --next` calls, because the worktree-isolation guard refuses the pinned shell forms. Recorded in
  `REGRESSION.md`.

**Verdict: GREEN — 0 floor-gate findings, 3 advisory (all minor).**

Lesson candidate: none. The README miss is an instance of L1 (meta-docs a change invalidates), and a deterministic
gate (`check:badge`) caught it during the build, before verify. No new mechanism failed.
