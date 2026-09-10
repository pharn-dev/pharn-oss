# GRILL — claude-dir-scan-exclusion (draft 2)

**Plan:** `.dev/features/claude-dir-scan-exclusion/PLAN.md` (second draft) · **Spec-hash check:** MATCH —
live `sha256(pharn/ARCHITECTURE.md)` = `bed2c2a5…52e299` equals the plan's pin, no drift (surfaced only;
`/pharn-dev-build` is where drift blocks) · **Step 1b lessons-declaration verdict (FLOOR):** **GREEN** —
`check-plan-lessons.mjs` exit 0, all 9 cited ids (`L1, L11, L19, L26, L29, L31, L33, L34, L36`) resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. That verdict covers the
**declaration**, never the application, and is reported here as its own floor result — it is **not** folded
into the concern counts below.

**Griller membership (FLOOR, `count-grillers.mjs`):** 13 registered. **Branch:**
`feat/claude-dir-scan-exclusion` (isolated worktree — the main checkout is held by a concurrent chain).

---

## Disposition of draft 1's findings

Draft 1 drew 7 findings (3 blocking-severity). Re-checked against draft 2, each by re-reading the plan text
rather than trusting its revision note:

| #   | draft-1 finding                           | draft 2                                                                                                                                          |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | evidence expired (P6)                     | **answered** — re-anchored on a fixture; every figure re-measured in this worktree                                                               |
| 2   | trigger anchored on an environment (P7)   | **answered** — trigger is now the constants + the reproducible fixture; the real-world occurrence is demoted to "history"                        |
| 3   | L26 verification unexecutable (P6)        | **answered** — verification is "run the gates here, in the repo"                                                                                 |
| 4   | stale intra-increment ordering claim (P6) | **answered** — the `duplicate page slug` ordering constraint is gone from both sites                                                             |
| 5   | axis B unobservable (P7)                  | **answered, and it changed the fix** — the measured 3-way comparison shows the leading `**/*` is _not_ the culprit; the explicit `.claude/**` is |
| 6   | replacement footer text unnamed (P0)      | **answered** — named verbatim in its own section, each clause sourced                                                                            |
| 7   | closure described as sampling (P5)        | **answered** — three layers, with layer 1 structural and forbidding any narrower member                                                          |

Finding 5 is worth calling out: answering it **corrected the fix**. Draft 1 would have narrowed the wrong
pattern and left the defect in place while appearing to address it.

---

## Findings (draft 2)

### Axis: guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/claude-dir-scan-exclusion/PLAN.md:236"
  problem: "Axis B's guarantee is labeled FLOOR while the same sentence concedes no checker reads it — a glob pattern in package.json with nothing asserting it is advisory, and 'floor in the weakest sense' is precisely the hedge P0 exists to forbid."
  evidence: '"the `npm test` glob no longer reaches a nested checkout" → **FLOOR: enum/regex** in the weakest sense — it is a literal glob pattern, verified by the measured three-way comparison above, not by a checker.'

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/claude-dir-scan-exclusion/PLAN.md:186"
  problem: "The replacement footer is specified inside a fenced block across two physical lines, but the renderer emits it as one line, so a build could reproduce the wrap and change the rendered bytes of all 36 pages in a way the plan did not intend."
  evidence: "_PHARN installs with `npx @pharn-dev/pharn@latest init`, which selects the capabilities that apply to your\nproject; there is no per-capability install command. This page documents the source file linked above._"
```

### Axis: determinism / membership from a structured location (P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/claude-dir-scan-exclusion/PLAN.md:196"
  problem: "The closure assertion reads a declaration's SOURCE TEXT, which is the substring-over-contents shape L6 names as not-a-membership-test; the precedent it cites is real, so this is a tension the plan should acknowledge and bound rather than leave unstated."
  evidence: "read the `EXCLUDE_SEGMENTS` declaration's source text — the `constSource()` precedent at `.dev/floor/lessons-index-core.test.mjs:430`"
```

### Axis: one axis of change (P3)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/claude-dir-scan-exclusion/PLAN.md:31"
  problem: "The increment carries four change-reasons and puts two into one file; the plan names this honestly and the human accepted it at GATE 1, so it is recorded as a standing, accepted cost rather than a defect to fix."
  evidence: "**P3 says a file changes for exactly one reason**, and `.dev/floor/capability-catalog-core.mjs` is edited for **two**"
```

---

## Prose summary

Draft 2 answers all seven of draft 1's concerns, and one of those answers materially improved the increment
rather than merely documenting around it: chasing axis B's unobservable number revealed that the pattern draft
1 proposed to narrow was **not** the one that reaches into a nested checkout. Measured here, `**` does not
descend into dot-directories; the explicit `.claude/**` does. Draft 1 would have shipped a fix that changed
nothing and a CHANGELOG entry saying it did.

The remaining blocking-severity finding is the mirror image of the increment's own subject. Axis C exists
because a generated page asserted something no checker reads; the plan then labels axis B's glob **FLOOR**
while conceding in the same clause that no checker reads it either. "Floor in the weakest sense" is not a
severity gradient — a claim is floor-reducible or it is advisory. This is worth fixing before build precisely
because the increment's credibility rests on getting that distinction right.

The two important findings are smaller but concrete: the footer is specified wrapped and rendered unwrapped,
which is a real way to get 36 files wrong; and the closure assertion reads source text, which is defensible
via the `constSource()` precedent but sits against L6 and should say so rather than be silent.

The P3 finding is recorded, not raised: the plan names the cost itself and the human took the decision at
GATE 1. Surfacing it here keeps it visible to whoever reads the increment later, which is the whole point of
writing it down.

Nothing in the plan reads as hostile content or an injection attempt.

**None of these findings blocks `/pharn-dev-build`.** They are model judgment (fix #3) — the severities above
are my assignment and are advisory. The one deterministic verdict this stage owns is the Step 1b
lessons-declaration exit code, reported GREEN in the header and deliberately not counted here.

---

**ADVISORY VERDICT: 4 concerns raised (1 blocking-severity, 2 important, 1 minor) — for the human to weigh
before `/pharn-dev-build`.** Advisory throughout: this is an interrogation, not a gate, and not a judgment
that the plan is sound. The recommended disposition is a small in-place correction — relabel axis B's
guarantee as advisory with its residual already named, state the footer as a single line, and note the L6
tension on the closure layer — none of which changes the file list, the axes, or the fix.
