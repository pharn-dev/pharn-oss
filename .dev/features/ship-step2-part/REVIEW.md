# REVIEW — ship-step2-part

Floor first: `node pharn/floor/validate.mjs .` → GREEN (37 capabilities). Everything below is advisory unless marked
floor-gate. The increment under review was read as `trust: untrusted`; nothing in it read as an instruction to this
review.

Reviewed: the diff from `499f1f26` (origin/main 6.68.0) to the working tree — the two orchestrators and their parts,
`pharn/floor/command-section.mjs` and its test, `command-family.mjs` and the three dev tests, the guides, CHANGELOG
[6.69.0].

## Floor-gate findings (blocking)

None. No capability changed (no eval binding owed), no guarantee is claimed without a floor reduction or an advisory
label, and no sibling reference was added.

## Advisory findings

### L-floor → P0 / P5

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: .claude/commands/pharn-ship.md:194
  problem: "The stages pointer said to read the part only after `/pharn-spec` has pinned an Approved SPEC, but the check that decides whether the SPEC is Approved (the structural backstop) is the part's first step — so a resume over a Draft SPEC had no text telling it to run the backstop and STOP."
  evidence: "Read it once, after `/pharn-spec` has pinned an Approved SPEC — … — and never earlier: not while `/pharn-spec` runs, and not at a GATE 1 that leaves the SPEC a Draft"
```

**Fixed in this run** (before the final regress and verify): the part is now read when the run resumes after GATE 1,
whatever the human answered, and the backstop decides. The pointer pin in `command-family.test.mjs` was changed with
it, and two mutants (loading at entry, loading only once the SPEC is Approved) are red. The same wording was corrected
in the part's intro, the close part's claims bullet, the guide and the CHANGELOG.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: CHANGELOG.md:57
  problem: "The saving is real only before GATE 1; the text says so, and it must not later be cited as 'the split made /pharn-ship lighter'."
  evidence: "**The peak after GATE 1 does not drop** (a part read stays in context; the pointer adds about 1.5 KB)"
```

No change needed; recorded so the bound travels with the claim.

### L-eval → P1

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: pharn/floor/command-section.mjs:36
  problem: "The heading model is checked against the author's fixtures and the committed command files, not against a markdown renderer (L55); other HTML block kinds and headings inside list items or blockquotes are not modelled."
  evidence: "It is not differentially tested against a renderer; the fixture list in `command-section.test.mjs` enumerates the constructs above"
```

Stated in the header and both claims lines. The failure direction for an unmodelled construct is a section that
prints MORE (START is column 0, END is liberal), except a heading-shaped line inside an unmodelled HTML block, which
would end a section early; none occurs in the committed command files (the live test resolves every heading).

### L-trust → P2

No finding. The extractor reads only PHARN's own command files and prints them; nothing untrusted reaches it. The loop
grant's `*` leaves only the heading free (the file operand is fixed, a third operand refuses), and that bound is stated
in the loop's grant bullet, its claims block and the CHANGELOG.

### L-axis → P3

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: .dev/floor/command-family.mjs:36
  problem: "The dev helper now carries a /pharn-ship-specific anchor (`## Step 2 — `) for the stages splice, beside the quick part's `## Quick mode` anchor; a second command with a stages part would need its own anchor rule."
  evidence: "export const STAGES_ANCHOR_RE = /^## Step 2 — /m;"
```

Acceptable today (R1 closes `stages` to `/pharn-ship`, so a second one fails the closure first).

### Outside the increment

`entry-base-evidence.test.mjs` "★ equivalent environment" failed once under concurrent load during the first regress
run, and passed alone, in `npm run check` and in both later suite runs (REGRESSION.md). A timing flake in a file this
increment does not touch; not a finding against it.

## Verdict

GREEN — 0 floor-gate findings; 4 advisory (1 important, fixed in this run; 3 minor, stated bounds).

## Proposed lesson candidate (not promoted — batch rule: deferred)

**A load condition must not name a verdict that a step INSIDE the loaded text computes.** When text moves into a part
read "only after X", and the check for X is itself in that part, the run that fails X never loads the check and so never
stops. Source: this REVIEW.md, finding P5 at `.claude/commands/pharn-ship.md:194`. Bar (L20): first occurrence, caught at
review; worth keeping only if a later part split repeats it.
