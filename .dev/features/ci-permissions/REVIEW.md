# REVIEW — ci-permissions

**Step 1, floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`,
exit 0. The floor is the only guaranteed part of this review; everything below is **advisory**.

**Increment under review (`trust: untrusted`):** a three-line addition to `.github/workflows/ci.yml` —
a workflow-level `permissions:` key with `contents: read` — plus this feature's own pipeline artifacts.

## Floor-gate findings (blocking)

**None.** No guarantee is claimed without a floor reduction, no eval binding is missing, no sibling
reference exists, and no guaranteed decision rests on a tainted field.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/ci-permissions/REGRESSION.md:50"
  problem: "A prose cardinality word drifted from the list it counts TWICE in this one run — first in PLAN.md, then again in REGRESSION.md after the grill had already reported the first instance."
  evidence: 'an earlier draft of this very section read "Two honest consequences, neither hidden" above three bullets'

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/ci-permissions/PLAN.md:154"
  problem: "The plan's trust audit asserts a property over an empty domain — this increment emits no findings and has no enum-gated fields, so 'no untrusted text reaches an enum-gated field' is vacuously true rather than earned."
  evidence: "No untrusted text reaches any enum-gated or floor-verifiable field; nothing in this increment is executed from the review's prose."

- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/ci-permissions/PLAN.md:179"
  problem: "The PLAN retained an `## Open questions (HALT)` section whose three answers existed only outside the document, so the artifact read as unresolved to anyone opening it later; repaired on human instruction at GATE 2, before the plan's first commit, and declared in SHIP.md."
  evidence: "## Open questions (HALT)"
```

## The four lenses

**L-floor → P0.** Clean, and deliberately so. The built artifact makes **no claim at all**: the key was
added bare, with no rationale comment, on L25's reasoning. Every claim about it lives in the audit
artifacts, and each carries its reduction — `PLAN.md`'s guarantee audit places GitHub's token scoping
**outside** `pharn/ARCHITECTURE.md §2`'s three primitives and files it under the `gitleaks.yml` "repo
hygiene" framing that already exists in this repo, rather than inventing a category. `VERIFY.md` states the
sharper half plainly: not one of the five green gates evaluates a workflow file, so they are green because
the change is inert to them. That is the correct direction for a P0 lens to find — a claim that
**under**-states — and it is stated, not buried.

**L-eval → P1.** No capability, no `role:` frontmatter, no `enforces` entry, therefore no eval obligation.
The floor agrees: `validate.mjs` reports the same 36 capabilities as before the change, so nothing entered
the capability tree. Review and floor concur; there is no disagreement to report. `VERIFY.md` correctly
carries **no** `structural:*` gate and says why, rather than borrowing `trust-fence`'s eval pair to look
better covered than it is.

**L-trust → P2.** The increment's trigger was an external adversarial review — another model's output,
`THREAT-MODEL.md §2` surface #7, `trust: untrusted`. The posture held in the way that matters: the review
**proposed**, and every load-bearing fact was re-derived from live files this run, which is how the run
caught that `codeql.yml` is a **job-level** grant of `security-events: write` and therefore not a precedent
for what `ci.yml` should declare. The review's conclusion survived; its supporting evidence needed
narrowing.

Did instruction-looking content change behavior? **Yes, in the honest sense — and that is worth recording
rather than waving away.** The review's "Minimal fix" sentence is the reason this increment exists and is
almost exactly what shipped. What kept that from being the attack succeeding is that the fix was
**independently re-derived** and one of its premises **corrected** — not that anything structural stopped
it. Finding R2 sharpens the point: the plan's trust audit concludes "no untrusted text reaches any
enum-gated field," which is true and **vacuous** — this increment has no enum-gated fields for taint to
reach. It is `L34`'s shape ("for each X, assert P" over an empty domain) appearing in a plan's audit
section rather than in a checker. The honest statement is not "the trust fence held" but "there was no
fence to test, and the defense was discipline."

**L-axis → P3.** One axis of change. `permissions:` is workflow-scope configuration living in the workflow
file that owns it; no second reason to change is introduced, no sibling reference exists, and nothing routes
around `pharn-contracts` because nothing in this increment touches the layer tree.

## The finding worth the most attention (R1)

`GRILL.md` raised, against `PLAN.md:69`, that the plan said "**Two** tests parse `ci.yml`" while the same
bullet enumerated **three** files and closed with "All three". One stage later, writing `REGRESSION.md`, the
**same author** wrote "**Two** honest consequences, neither hidden" above **three** bullets — after the
grill finding had been written and read.

Two properties make this worth canon rather than a correction:

- **The recurrence is at range zero.** Not two increments apart, not two files by two authors: the same run,
  one stage apart, with the first instance already reported in an artifact sitting in context. `L20` sets the
  second occurrence as the bar for concluding a discipline-only remedy is the wrong **kind**; that bar is met
  here about as sharply as it can be.
- **Nothing could have caught it.** `npm test`, `validate`, `lint`, `format:check` and `lint:md` were all
  green over both defective texts — prose cardinality is invisible to every gate this repo owns. Both
  instances were found by reading, and the second only because a formatter run happened to redisplay the
  section.

`L36` is adjacent but does not cover it. L36 governs a **per-member presence set** that is not closed over
variant spellings; this is a **scalar count word duplicating the length of a list in the same document** —
one fact stored twice, four lines apart. That framing is `L35`'s, and `L35` supplies the remedy shape:
_must the second copy exist?_ It must not. The list already states its own length; the count word is a
redundant identity that can only drift. So the remedy is to **drain** it — write "the honest consequences,
each stated" and let the enumeration speak — not to build a checker that counts bullets and compares them to
a spelled-out numeral, which would be a third thing to keep in sync and would have to parse English
number words to work at all.

## Proposed lesson candidate (proposed only — canon is written by `/pharn-dev-memory-promote`)

- **Target:** `.dev/memory-bank/lessons-learned.md`
- **Proposed title:** _A prose cardinality word is a second copy of a list's length — drain it, because no
  gate reads prose and the count drifts the moment a member is added_
- **Type:** `process` · **Concepts:** `[redundant-identity, enumeration, lesson-recurrence, doc-drift, remedy-design]`
- **Why it clears `L20`'s bar:** two occurrences, same run, one stage apart, the second written after the
  first had been reported — `.dev/features/ci-permissions/PLAN.md:69` and
  `.dev/features/ci-permissions/REGRESSION.md:50`, both reproduced live. **Both are now fixed, but not by
  the same route, and the difference is the point.** The `REGRESSION.md` instance was repaired by the stage
  that owns that artifact. The `PLAN.md` instance was **not** repairable by any stage after
  `/pharn-dev-plan` — `PLAN.md` lies outside every later stage's writes-scope, correctly, since a build
  that edits its own plan is the defect `check-regress.mjs` documents giving up on — so it was carried to
  the human at GATE 2 and repaired only on that instruction, before the plan's first commit, and declared
  in `SHIP.md`. An earlier draft of this very bullet asserted both were fixed while `PLAN.md` was still
  wrong; that claim was false when written and is itself the **third** instance of the document-local drift
  this finding is about.
- **Why it is not `L35`, `L36` or `L29` restated:** `L35` establishes _drain the redundant copy rather than
  bind it_ over **stored identities across files** (`package.json` version vs `SKILLS_VERSION` vs a badge);
  this applies that prescription to a **within-document, natural-language** duplicate, where no structured
  location exists to bind and `L6`'s "read it from the structured place" has nothing to point at. `L36`
  concerns closure over variant spellings of a member; `L29` concerns an assertion set authored for one
  member of a set. Neither predicts a scalar count word four lines above the list it counts.
- **The bound, stated so the entry cannot be oversold:** the remedy is **discipline plus a shape** ("do not
  write the count; let the list carry it"), and by `L20`'s own logic a discipline remedy will recur. It is
  offered as the **correct** remedy rather than a strong one, because the alternative — a checker matching
  English numerals against adjacent list lengths — is the "third thing to keep in sync" `L35` warns against,
  and the false-positive surface (a paragraph legitimately saying "two" near an unrelated list) is larger
  than the defect.
- **Provenance:** feature `ci-permissions`; source: this `REVIEW.md` finding R1 +
  `.dev/features/ci-permissions/GRILL.md` G1. The human decides at the promote gate; nothing here writes
  canon.

## Verdict

**GREEN — 0 floor-gate findings, 3 advisory.** The increment is done in the sense the floor can certify:
`validate` GREEN, no scope escape, no missing eval binding, no sibling reference, no guaranteed decision on
a tainted field.

**Read that as narrowly as it is written (P0).** GREEN here means the structural invariants hold and the
named gates passed. It does **not** mean `contents: read` is the right permission set for `ci.yml` — that
rests on the twelve-step audit in `PLAN.md`, the agreement with `floor.yml` and `gitleaks.yml`, and the
human's GATE-1 approval, all of which are **advisory**. The three advisory findings above are flags for the
human, never blocks.
