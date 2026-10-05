# REVIEW — plan-instruction-file-rule

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. The increment is
reviewed as `trust: untrusted`. No instruction-looking content in the reviewed files changed this review's
behaviour.

**Verdict: GREEN — 0 floor-gate findings.** 4 advisory findings follow.

## Floor-gate findings (blocking)

None. The increment makes one floor claim: the anchor is present in every PLAN author's Step 3 and in no other
product command file. That reduces to string presence plus set membership over `writes:` frontmatter, enforced by
`INSTRUCTION_FILE_RULE`. The live mutation run in BUILD.md and the six in-suite controls show it can fail. Every
other claim (that a plan obeys the rule; that the rule saves bytes) is labelled advisory in the command, the
CHANGELOG and the PLAN.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: "CHANGELOG.md:47"
  problem: "The 6.35.3 entry says LIMITS.md §3e 'was applied by a human', but the working tree's LIMITS.md has no §3e: the human's edit was reverted before verify so the reconcile gate stayed clean, and it is to be re-added after GATE 2."
  evidence: "`LIMITS.md §3e` states that bound; it was applied by a human, since the agent's write tools cannot"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/plan-instruction-file-rule/BUILD.md:28"
  problem: "BUILD.md and PLAN.md name `.pharn/plan-instruction-file-rule/limits_3e_patch.py` as the route for §3e, but the human had the script deleted; the §3e text survives only in the PLAN."
  evidence: "`.pharn/plan-instruction-file-rule/limits_3e_patch.py` after `/pharn-dev-verify`."
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-plan.md:136"
  problem: "The rule attributes the loading behaviour to Claude Code, but only the converse half was measured here (no file had `paths:`, and none was left out); that a `paths:` rule file is NOT loaded into every agent is documented platform behaviour, unprobed."
  evidence: "frontmatter into every agent of every stage, so each byte there is paid on every run"
- type: FINDING
  rule_id: P7
  severity: minor
  file: "CHANGELOG.md:48"
  problem: "The entry (and the §3e draft) calls a context-budget floor check 'a separate, unbuilt increment', while a parallel session's worktree `instruction-growth-gate`, on the same base `d40667d`, is building an instruction-growth floor gate for `/pharn-verify`; whichever merges second must update this wording and renumber its version."
  evidence: "A context-budget floor check is a separate, unbuilt increment."
```

## By lens

- **L-floor (P0).** The rule opens with "ADVISORY — nothing checks a plan for it". The pin's header says "PRESENCE
  only: it never proves a plan obeys the rule". No sentence claims the rule reduces instruction-file size. The
  `MIN_CLI` argument (an older CLI installs the tree intact) is correct under CLAUDE.md's bar. Finding 3 is a
  wording bound, not a guarantee claim.
- **L-eval (P1).** No `role:` capability is added or changed, so no eval is owed. That no behavioural eval covers
  `/pharn-plan` is stated rather than faked, backed by the full eval census in the PLAN (347 files, 37 directories).
- **L-trust (P2).** The rule is trusted command text, and it changes neither how a PLAN's `## Files` is parsed nor how
  it is trusted. The example item ``- `CLAUDE.md` — convention: …`` is a concrete path the setter would scope. That
  is intended: naming an instruction file stays possible for a real convention. No guaranteed decision reads a
  free-text field.
- **L-axis (P3).** One reason to change per file. The pin lives beside `WRITE_TOOL_RULE` and reuses that section's
  `writeToolStep3` slicer, a same-file helper, not a sibling reference. `frontmatterWrites` refuses a multi-line
  `writes:`; it does not guess. Today every product command writes `writes:` on one line, and the control pins the
  refusal.

## Proposed lesson candidate (for `/pharn-dev-ship` Step 2b; not canon)

- **Candidate:** a human-only edit that an increment needs, to a trusted doc or any path the write guards deny, must
  land outside the build's anchor→verify window. `check-bash-reconcile.mjs` has no attribution, so a human's own
  correct edit reads as an escape and turns verify FAIL. The only clean routes are re-anchoring, which the repo
  forbids as a way to silence a RED, or reverting.
- **Source:** this REVIEW, plus VERIFY.md "Orchestration notes" (the reconcile preview's
  `escapes: [{file: "LIMITS.md", denied_by: "protect-trusted-paths.cjs"}]`).
- **Feature:** `plan-instruction-file-rule`.
