# REVIEW — stale-lint-ignores

**Step 1 — floor first (P0).** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities
checked in "."`, exit 0. The increment reached review with a green floor. Everything below the floor line
is **advisory**.

**Under review (`trust: untrusted`):** the single-file diff to `.markdownlint-cli2.jsonc` (10 insertions,
15 deletions) plus this increment's own pipeline artifacts.

## Floor-gate findings (blocking)

**None.** No guarantee in this increment lacks a floor reduction or an `advisory` label; no eval binding
is missing (none is introduced); no guaranteed decision rests on a tainted field; no sibling reference is
introduced.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".markdownlint-cli2.jsonc:43"
  problem: "The retained note's closing sentence is a live claim about the repo's checkers, so it is true today and would become false the moment the named residual is built — the same expiry class this increment exists to remove, with its polarity reversed to an UNDERCLAIM."
  evidence: "`ADVISORY: no checker reads this note, and none tests whether an entry here still matches anything (named residual `lint-ignore-reachability-check`).` — verified true at this commit (no test pins these entries; the only `ignores`-content pin is `docs/lessons-index.md` at .dev/floor/lessons-index-core.test.mjs:204), and nothing would detect its becoming false."

- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/stale-lint-ignores/VERIFY.md:1"
  problem: "The only change-sensitive evidence that the edit did what it claims is a hand-run Bash probe recorded in VERIFY.md; it is outside the gate map and outside fix #7, so it is a measurement a future reader must trust rather than re-run."
  evidence: "`/pharn-dev-grill` finding `rule_id: P1` — `the plan's own Evidence B measures lint:md and npm run check as exit 0 both before and after`; the probe answering it is labeled `This probe is ADVISORY and deliberately outside the gate map (P0)`."
```

Both are **advisory-gate**: each rests on judgment about prose and about what a gate map ought to cover,
not on content the floor can check. Neither blocks.

## The four lenses

**L-floor → P0.** The increment makes no new guarantee. It removes two config entries and adds prose that
labels itself `ADVISORY` and names its own residual — the correct posture for an unguarded config comment.
The pipeline artifacts each state their bound: the regress verdict says "no deterministically-detectable
breakage", not "nothing broke"; the verify verdict says "the named gates passed", not "the feature is
correct". One residual claim is worth watching (finding 1 above): an honest underclaim expires exactly
like an overclaim, and L33 records that the underclaiming direction is the one nobody re-reads because it
sounds careful.

**L-eval → P1.** No Capability, no `rule_id`, no `enforces`, so P1's binding requirement is vacuous here —
and the floor agrees: `validate` reports the same 36 capabilities before and after, so lens and floor do
not disagree. The honest gap is the one the grill named and VERIFY records: the deterministic gate map is
**insensitive to this change**, so PASS is "the repo is green with this in it", never "the edit is right".
Recorded rather than closed, because closing it would need a test file the approved `## Files` does not
authorize — and writing one anyway is precisely what fix #7 exists to deny.

**L-trust → P2.** The increment's untrusted input is the external adversarial review's finding text. It
was handled as DATA in both directions, and this is the lens's most interesting observation:

- Its **evidence** claims were re-derived from the filesystem rather than believed, which is what surfaced
  a fact the review did not have — all **three** `.pharn/` entries are absent, not two.
- Its **proposed remedy** was evaluated and **half-declined**. The review offered "remove the two entries,
  **or** scope to `.pharn/` with a comment"; the second option reverses a decision recorded twice in
  writing, and the increment refused it on the repo's own reasoning. An untrusted input's suggested fix is
  a proposal to weigh, never a directive to execute — the fence behaving as designed on a benign input,
  which is the only condition under which it can be observed at all.

No guaranteed decision rests on a tainted field: the deletion rests on a filesystem existence test, and
the free-text finding reached only prose a human reads.

**L-axis → P3.** One file, one reason to change. The `## Files` bullet names two operations, but both
follow from a single fact (the `.pharn/` scratch corpus is gone, so the exclusion set and the reasoning
recorded beside it move together). No `reads:`, no module path, no sibling reference, no layer.

## On the review's own framing — recorded because the asymmetry is the finding

The external review's impact line reads: _"Config entries for paths that exist only on one machine —
permanently unfalsifiable by any checker, which is precisely the class this repo normally catches."_

**That is correct as diagnosis and its implied remedy is structurally unavailable here.** The entries are
unfalsifiable, and this repo does normally answer that with a floor check (`check-version-badge`,
`check-contributing-gates`, both on L20). It cannot here: `.pharn/` is gitignored, so **every** entry
under it names a path that is absent on a clean machine — including `.pharn/lessons-index.md`, which is
doing real work (demonstrated live: with badly-formatted probes at all three paths, `lint:md` flagged the
two deleted names and did **not** flag the cache). A path-existence test over `ignores` cannot tell a dead
entry from a preventive one, and the obvious repair — exempt gitignored roots — deletes exactly the
entries the check exists to examine. The correct remedy for an unfalsifiable entry is therefore to
**retire it** (L35), not to bind it with a checker that cannot be written correctly.

## Proposed lesson candidate

**None.** The discriminability argument above is the increment's most valuable output, but it does not
meet the bar: nothing **failed**. No checker was built and had to be removed; no run was misled; the two
entries cost exactly zero (`lint:md` and `npm run check` measured identical with and without them). L20's
trigger is a second occurrence of a real failure, and there is not a first — only a review's tidiness
observation and a design argument that resolved before any code existed. Manufacturing a trigger to
justify canon is the disease P0 names, and this repo has the precedent for refusing to
(`check-plan-lessons` sub-check D records its own honest trigger rather than inventing one).

**Carried as a deferred candidate rather than dropped**, for the next time this shape appears:

> _A proposed floor check owes a discriminability test before a necessity test: can it separate its true
> positives from the cases it must NOT flag, using only the signal available to it? L35 asks whether the
> second copy must exist; this asks whether the check could be correct even if it should. Reopen if a
> second instance appears — e.g. a proposed checker over a gitignored or generated zone where absence is
> the normal state._

Provenance if it is ever promoted: feature `stale-lint-ignores`, this `REVIEW.md`, the argument recorded
verbatim in `.dev/features/stale-lint-ignores/PLAN.md` § "The floor-check question (P7/L20)".

## Verdict

**GREEN — 0 floor-gate findings, 2 advisory.** The increment is done as scoped. This verdict covers the
floor (`validate` GREEN) and the four lenses' advisory read; it is **not** a judgment that the change is
wise or that the repo is better for it — that is the human's call at the post-review gate.
