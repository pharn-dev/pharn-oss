# REVIEW — loop-grant-seam-skill

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (exit 0). The increment
adds no capability (no `role:` file), so the floor's capability checks are unchanged by it; everything below is
**advisory**. The increment under review is `trust: untrusted`; no instruction-looking content in it was found or
followed.

Reviewer bound, stated: this review was written by the same agent that planned and built the increment, so it is a
self-review, not an independent one.

## Floor-gate findings (blocking)

None. No guarantee is claimed without a floor reduction or an `advisory` label (L-floor); no eval binding is owed
(L-eval: no capability, no `enforces`); no free text steers a decision (L-trust); no sibling reference (L-axis — the
dev test imports `pharn/floor/stage-agent-core.mjs`, the permitted `.dev/` → `pharn/` direction).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".claude/commands/pharn-loop.md:194"
  problem: "The probe found that a skill declaring no allowed-tools is invocable through the Skill tool with no grant and no prompt, which reaches THREAT-MODEL.md §2 surface 8 (a user's .claude/skills/ drop loading as instructions) independently of any PHARN grant; the loop's grant bullet and the CHANGELOG now say so, but the trusted threat model does not."
  evidence: "One that declares none needed no grant at all in the one probe made (Claude Code 2.1.303), so a skill of that shape — a user's `.claude/skills/` drop included — can load without any grant"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:5633"
  problem: 'INVOKE_RE reads any "invoke `/pharn-…`" phrase in the loop family as an inline invocation, so a negated sentence ("never invoke `/pharn-review`") would demand a grant; the failure is loud (a red test naming the missing grant), never a silent widening.'
  evidence: "const INVOKE_RE = /\\binvoke `\\/(pharn-[a-z-]+)/gi;"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-grant-seam-skill/PROBE.md:1"
  problem: "The scoped-grant evidence is one run per cell, on one Claude Code version, in -p mode, with command-file targets; interactive prompting and .claude/skills/ targets were not probed. The command and CHANGELOG label it advisory and name these bounds."
  evidence: "NOT shown: interactive-mode prompting (a `-p` denial stands in for a prompt); a `.claude/skills/<name>/SKILL.md` target"
```

## Stage verdicts this review read (not re-decided here)

- `/pharn-dev-regress`: `no-regressions` — with the whole-suite `tests` gate red at both base and head under machine
  load, so blind for that gate (REGRESSION.md says so).
- `/pharn-dev-verify`: **FAIL** (`test` red in both runs; every failing test is in a wall-clock-bound suite outside
  the increment, and the failing files pass when rerun alone — VERIFY.md). That is a floor verdict this review does
  not override.

## Verdict

GREEN on the review lenses (0 floor-gate findings; 3 advisory: 1 important, 2 minor). The increment is not "done"
by the chain's own rule while verify stands at FAIL; that decision is GATE 2's.

## Proposed lesson candidate (not written to canon — `/pharn-dev-review`'s scope is this file)

- Candidate: **"A permission control's effect must be measured against a no-grant control before it is scoped —
  the harness may not require the permission at all for the members you care about."** The plan assumed the loop's
  Skill grant was what kept `/pharn-grill`'s inline invocation prompt-free; the probe's no-grant control showed those
  targets need no grant, and that the bare grant's only effect was on skills declaring `allowed-tools`. Provenance:
  feature `loop-grant-seam-skill`, source `.dev/features/loop-grant-seam-skill/PROBE.md` (results table, rows 1-5).
  Bar check (L20): a first occurrence — record as deferred.
