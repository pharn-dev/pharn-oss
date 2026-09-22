# REVIEW — build-regress-spec-unread

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. Everything
below is advisory.

The increment under review is treated as `trust: untrusted`. It contained no instruction-looking content
aimed at the reviewer.

## Floor-gate findings

None.

- **L-floor → P0.** Every claim reduces or carries a label:
  - "not reading `SPEC.md`" is ADVISORY in both trust audits and in the CHANGELOG;
  - the hash chain stays FLOOR, and both `check-plan-spec-agree.mjs` invocation lines are byte-identical
    (`git diff` touches neither);
  - the token saving is labelled expected and unmeasured.

  The required intent-fidelity sentence no longer implies a gate. It now names grill's check as
  interrogation and verify's as an empty verifier slot (GRILL finding 1, applied).

- **L-eval → P1.** No Capability was touched, and `validate` agrees.
- **L-axis → P3.** Each file changes for one reason. No sibling reference was added.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".claude/commands/pharn-regress.md:81"
  problem: "The prefix still says '`/pharn-regress` never reads their free-text', while Step 1.2 tells the model to read `PLAN.md`. The sentence means the VERDICTS never read free text, which the next clause says. The tension predates this change, which only moved `SPEC.md` out of the subject."
  evidence: "But `/pharn-regress` never reads their free-text: the verdicts consume **only exit codes (ints)"
```

This is left as is. Rewording it is a separate clarification, and nothing reads it as a gate.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-build.md:327"
  problem: "The new P0 line is true but can be forgotten: nothing detects a future edit that puts `SPEC.md` back into either `reads:` list or Step 1.2. The plan chose not to pin it (P7, no trigger), which is the right call, but the bound should be visible to the next editor."
  evidence: "Nothing on the floor stops the model opening it."
```

This is recorded, not fixed. A pin on `reads:` would guard the half that is not load-bearing.

## Sweep cross-check

- `grep` of `.claude/commands/`, `pharn/`, `docs/`, `README.md` and `CLAUDE.md` finds no remaining claim
  that build or regress reads the SPEC.
- `/pharn-loop` reads the SPEC itself and runs `/pharn-build` inline, so its context is unchanged. That is
  why the CHANGELOG limits the saving to the per-iteration re-read.

## Verdict

**GREEN — 0 floor-gate findings, 2 advisory (minor).**

No lesson candidate: nothing in this run failed or surprised in a way that would recur.
