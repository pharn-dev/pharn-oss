# GRILL — ship-lesson-extract

**Plan:** `.dev/features/ship-lesson-extract/PLAN.md` · **Spec-hash check:** MATCH —
recomputed `sha256(pharn/ARCHITECTURE.md)` = `69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e`,
equal to the plan's `spec_content_hash` (no drift; `/pharn-dev-build` is where drift blocks) ·
**Step 1b lessons-declaration verdict (FLOOR):** **GREEN** —
`check-plan-lessons.mjs` exit 0, all 11 cited ids (L4, L6, L7, L8, L19, L20, L29, L30, L31, L33, L34)
resolve in `.dev/memory-bank/lessons-learned.md` and are referenced in the plan body ·
**Grillers registered (FLOOR membership, `count-grillers.mjs`):** 13.

> The Step 1b verdict is a deterministic stop and is **not** folded into the advisory concern counts
> below. Two clocks, kept apart.

## Griller applicability (recorded, not assumed)

All 13 registered grillers declare `applies: ["universal"]`, so none is excluded by archetype. The
increment's built surface is **markdown command prose plus one `node --test` file** — no runtime code, no
UI, no schema, no network, no user data, no i18n surface. The axes that produced findings are
**testability (P1)**, **documentation (P7)** and the inline P0/P2/P5/P6 lenses. `a11y`, `i18n`,
`migrations`, `observability`, `performance`, `privacy`, `security`, `error-handling` and `coupling` had
no purchase on this plan and are recorded as **no findings**, not as skipped.

## Findings

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/ship-lesson-extract/PLAN.md:108"
  problem: "Layer-1 presence is recognized (a verification approach IS declared), but every BEHAVIORAL property of the increment is unverifiable by anything this plan builds — the tests assert command prose, so the feature's whole value proposition ships with zero behavioral coverage of any kind."
  evidence: "'Evals to write (P1) — None' plus the honest bound at :135 'these pin that the command PROSE contains the invocation... They CANNOT prove a run executed Step 2b, that the human was actually asked, or that a candidate was not dropped.' The plan states the bound correctly; the concern is that approving it means accepting an increment whose only observable behavior is untested by construction, not that the statement is wrong."

- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/ship-lesson-extract/PLAN.md:125"
  problem: "The position assertion is specified as 'byte offset of the two headings' with no matching discipline named — an unanchored indexOf over the command body would match a heading NAME mentioned in prose or inside the command's own description frontmatter, which is exactly the substring-vs-structured-location conflation L6 names and this plan cites."
  evidence: '''names the lesson-extract step before the SHIP.md write step (position, by byte offset of the two headings — the "before the final commit" requirement, re-anchored)''. The build must match line-initial `^## ` headings, over the SKIP_RE-stripped body commandBody() already returns, and must fail closed when either heading is absent rather than comparing against -1.'

- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/ship-lesson-extract/PLAN.md:126"
  problem: "Three of the five LESSON_OUTCOMES carry a variable payload (`promoted L<n>`, `not-reached (<stage>)`, `error <reason>`), so a membership test written as string equality over the enumeration would fail on the very values it is meant to pin — the enumeration L29 asks for needs a matcher shape, and the plan names none."
  evidence: "'each of the five LESSON_OUTCOMES appears in the command's SHIP.md roll-up spec (L29's enumeration, iterated)' read against the values at :80 and the Step-2b outcome list. Each member needs to carry its own matcher (a prefix or an anchored pattern), not a bare literal."

- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/ship-lesson-extract/PLAN.md:187"
  problem: "The trust audit names the increased frequency of ratification requests but stops short of the consequence: a gate whose strength rests on a human's continued attention is weakened by being asked routinely, and the plan proposes no bound on how often Step 2b may propose — 'at most ONE candidate per run' bounds the width, never the rate."
  evidence: "'What this increment genuinely changes is frequency: promotion becomes a routine end-of-run prompt rather than a deliberate, separately invoked act, which raises the rate at which a human is asked to ratify untrusted-derived prose.' The mitigations named immediately after ('at most ONE candidate' and the L20 bar) are both advisory and both address WHAT is proposed, not HOW OFTEN — so the residual as written is understated."

- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/ship-lesson-extract/PLAN.md:41"
  problem: "The `<n>` in `lesson: promoted L<n>` has no named structured source, so the value most likely to be read back later is the one field of the outcome line whose provenance the plan leaves to the model."
  evidence: "The L6 body line commits to reading the OUTCOME from a structured location ('never from pattern-matching that command's printed prose'), but the id itself is not covered by that sentence. It should be read from the `## L<n>` headings in canon after the promote returns, the same membership read /pharn-dev-memory-promote's own duplicate-id check performs."

- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/ship-lesson-extract/PLAN.md:73"
  problem: "No meta-doc sweep is recorded. L1's remedy is to ASK which meta-docs assert a fact the increment changes and to name the answer; this plan names CHANGELOG.md but never says the question was put, so a reader cannot distinguish a sweep that found nothing from a sweep that never ran."
  evidence: "'## Files' lists three paths with no accompanying sweep statement, and L1 is absent from the 11-id applied_lessons declaration. (Interrogated live during this grill: CLAUDE.md's only `/pharn-dev-ship`-adjacent assertion is line 180, which concerns the PRODUCT /pharn-ship's BRIEFING.md and is untouched by this increment — so the sweep's ANSWER is 'CHANGELOG.md only'. The finding is the missing record, not a missing edit.)"
```

## Summary

The plan is unusually explicit about its own bounds — the guarantee audit refuses three claims outright
(the `lesson:` line's completeness, "ship exits 0", and any floor status for the human's answer), and the
P7 trigger is recorded as maintainer direction rather than a manufactured failure. Those are the parts
that would normally generate findings here, and they do not.

The concerns cluster in two places. **The build's mechanics are under-specified in exactly the ways this
plan's own cited lessons predict** — F2 is the L6 shape (a structural fact read by substring), F3 is the
L29 shape (an enumeration whose members cannot be matched as written), and F5 is a field left to the model
inside a sentence that otherwise commits to structured reads. All three are cheap to fix at build time and
none changes the design; they are named now because a plan that cites a lesson and then leaves the
mechanism it governs unstated is the declaration-vs-application gap the Step 1b checker explicitly cannot
see.

**F1 and F4 are the ones worth a human's judgment rather than a build-time correction.** F1 is structural
and has no fix inside this repo: commands are not `role:`-bearing capabilities, so nothing can execute a
behavioral case over one, and the increment therefore ships its only real behavior — propose, ask, route,
record — with prose-shape tests as the sole coverage. F4 is the sharper one, because it points at the
mechanism rather than the increment: the promote gate's strength is a function of the human's attention,
and this increment spends that attention more often. Neither is a reason to stop; both are reasons the
human should approve the _rate_ deliberately rather than inherit it.

No injected or instruction-looking content was found in the plan; all quoted free text above is reproduced
as DATA.

**ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 4 important, 2 minor) — for the human to
weigh before `/pharn-dev-build`.** This verdict covers the interrogation only. It is not a judgment that
the plan is sound, and it gates nothing.
