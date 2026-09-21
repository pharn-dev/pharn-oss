# REVIEW — finding-backstop-class

**Step 1, floor FIRST (the only guaranteed part of this review):**
`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`, exit 0.
Everything below is **advisory** (P0).

> The increment under review is treated as `trust: untrusted`. Its prose is quoted below as DATA.
> Nothing instruction-looking in it altered this review's behaviour; the one simulated hostile string in
> the trigger fixtures (`req.params.id flows into the authorization branch…`) is inert evidence text.

## Floor-gate findings (blocking) — 2, BOTH FIXED IN THIS INCREMENT

```yaml
- type: FINDING
  rule_id: "P1"
  severity: blocking
  file: ".dev/features/finding-backstop-class/PLAN.md:196"
  problem: "The plan promised a render-side closure assertion and the build shipped only the emission-side one — a presence check where a closure was declared, which is L36's own shape recurring inside the increment that cites L36."
  evidence: "backstop enum closure → every value the deriver can emit, and every label string Step 6 renders, ∈ BACKSTOP_ENUM"

- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".claude/commands/pharn-review.md:295"
  problem: "The rendered text for `unknown` named ONE of that member's five causes, so in the other four it stated a specific falsehood dressed as a helpful detail."
  evidence: "| `unknown` | `no usable assignment record — nothing is claimed about what backs this lens` |"
```

**Finding 1 — measured, not suspected.** `grep -c 'rendered\|Step 6\|pharn-review.md'` over
`merge-findings.test.mjs` returned **0**: nothing read the render surface at all. The emission-side rule
collects values from the output, so a member could have shipped in the Step-6 table under a variant
spelling — or been dropped from it entirely — with every rule green. That is exactly the presence-vs-closure
gap **L36** exists to name, and it opened inside the increment whose `applied_lessons` cites L36. **Fixed:**
a bidirectional closure over the command's own bytes (no rendered key outside the enumeration, no
enumeration member missing from the render), reading the table **structurally** rather than grepping prose
for member names (**L6**). **Mutation-tested before being believed** (the standard L36's own provenance
sets): renaming `scanner-less` → `scanner-lesss` in the table made it **fail** with
`BACKSTOP_ENUM member(s) absent from /pharn-review Step 6's render table: scanner-less`, then the mutation
was reverted. A second rule pins the banned vocabulary over **both** surfaces.

**Finding 2 — fixed** by making the string cause-neutral (`nothing is claimed about what backs this lens`)
and recording _why_ in the command, so a later editor does not "helpfully" restore a cause. The cause
stays where it is knowable: stderr names an unusable artifact, and the record is on disk.

Both fixes land inside the approved `## Files`; all gates re-run green afterwards (`test` 47/0 in this
file, 2166/0 repo-wide; `lint`, `format:check`, `lint:md`, `validate`, `reconcile` all exit 0).

## Advisory findings — 3

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-review.md:269"
  problem: "The increment's axis is half floor and half discipline: the label's DERIVATION is deterministic, but 'REVIEW.md shows it' rests on command prose that no checker reads, so a run that renders nothing is indistinguishable from one that renders correctly."
  evidence: "ALSO render each contributor's `backstop`, and the placement is a REQUIREMENT, not a preference."

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/finding-backstop-class/VERIFY.md:56"
  problem: "The reconcile epoch's scope amendment is asymmetric: forgetting to amend yields a loud false ESCAPE, while a genuine Bash escape to a path a later amendment happens to cover is silently absorbed — and nothing detects that direction."
  evidence: "forgetting to amend yields a loud false ESCAPE (as here), while the reverse … would be silently absorbed"

- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/merge-findings.mjs:60"
  problem: "merge-findings.mjs now carries two change-reasons — assembling/deduping findings, and deriving an evidence-provenance label from two external artifacts — so its axis of change widened."
  evidence: "THE PER-CONTRIBUTOR `backstop` LABEL (added with the finding-backstop-class increment)."
```

**On the first:** the closure rule added above narrows this but does not close it — it proves the render
**table** agrees with the enumeration, never that a run **emitted** the table's strings into a `REVIEW.md`.
Nothing reads `REVIEW.md`. Named residual: **`review-backstop-render-check`**, deliberately unbuilt —
**L20**'s bar is a second occurrence and there has not been a first. Recording it so the gap is a decision
rather than an oversight.

**On the second:** this is the sharper of the three and it is **not** something this increment caused or
can fix; it belongs to the reconciliation mechanism. It is the Step-2b lesson candidate.

**On the third:** filed rather than acted on. `pharn/floor/` is not in the layer tree (ARCHITECTURE §4
governs capabilities; the floor sits beneath it, §2), so P3's leaf→leaf rule does not bite, and the
human approved deriving the label **at merge time** at the options halt — the alternative, a lens-declared
`evidence_source`, was rejected precisely because it would be model-declared. Worth noting that the
production file deliberately stayed **stdlib-only with no cross-checker import**; only the _test_ imports
`render-review-assignments.mjs`, and it does so to pin the two duplicated `basis` constants (**L31**). That
is the right side of the trade, but the file's change-reason set did grow and a reader should know it.

## Lens-by-lens

- **L-floor (P0) — the governing lens.** Every guarantee has a reduction or an `advisory` label. Three
  claims are **struck** in the shipped artifacts, not softened: "a regex matched this file", "the label
  says a finding is more or less likely true", and "the human will notice the label" (advisory). The
  `scanner-assigned` narrowing is written into **both** `merge-findings.mjs`'s header and the command's
  audit — not only into the ephemeral PLAN (**L2**). Finding 2 above was this lens's catch.
- **L-eval (P1).** No `role:`-bearing capability is touched, so capability eval bindings are unaffected
  and the floor agrees (GREEN). The checker's own obligations are the live surface — Finding 1 was this
  lens's catch, and it was a genuine declared-but-unbuilt binding.
- **L-trust (P2).** The new input (`assignments.json`) is consumed for **enum-gated fields only**; every
  scalar passes `isCleanScalar` before indexing, so a control char or newline laundered into a record
  field cannot become a label or a heading. The `scanner_errors` key is `lens + NUL + file`, and NUL is
  rejected by that same guard — so the key separator cannot collide, which is the same reasoning the
  dedup key already relies on. Taint separation at the render is **structural**: label on the plain
  attribution line, all free text inside `>` blocks. No guaranteed decision rests on a tainted field.
- **L-axis (P3).** One new cross-file dependency, in the **test** only, and justified as the ✧ pin.
  Finding 3 above records the production file's widened change-reason. No sibling reference in the layer
  tree sense.

## What this increment does NOT do (restated, because the label invites the misreading)

The degenerate dedup key, the max-severity escalation and the `sources[0]` representative text are
**untouched**. The label makes the _contributors_ legible; the merged scalar triple is still a chimera.
`finding-shape.md` is untouched and still never mentions `sources[]` — deferred follow-up
`finding-shape-sources-array`. The four scanner-less lenses still have no scanners.

ADVISORY VERDICT: 5 findings (2 blocking-severity, both fixed in-increment; 3 advisory, 1 of which is
the Step-2b lesson candidate) — for the human to weigh at the post-review gate. The floor verdicts from
`/pharn-dev-build`, `/pharn-dev-regress` and `/pharn-dev-verify` stand as recorded and are not restated
here as a review result.
