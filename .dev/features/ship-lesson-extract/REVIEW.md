# REVIEW — ship-lesson-extract

**Step 1 — floor first (P0):** `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities, exit 0.
The increment was eligible for review. Everything below the floor line is **advisory**.

**Under review:** 3 files, **+353 / −2** as of this review — `.claude/commands/pharn-dev-ship.md`
(+145 / −2), `.dev/floor/command-hygiene.test.mjs` (+145), `CHANGELOG.md` (+63). Treated as
`trust: untrusted` throughout.

> An earlier draft of this line reported the first file as `(+147)`, which is git's **combined ±bar**
> (145 insertions + 2 deletions), not its insertion count — so the per-file figures appeared not to sum
> to the aggregate. Corrected to insertions/deletions throughout; the aggregate `+353` was right all
> along. The counts describe the tree **at review time**; the post-review remediation below and the two
> follow-up commits add to them.

## Floor-gate findings (blocking — the verdict comes from checkable content)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: blocking
  file: ".claude/commands/pharn-dev-ship.md:374"
  problem: "The enumerated outcome `not-reached` ships in TWO spellings — `not-reached (<stage>)` at :159, :210 and :280, but `not-reached (<stop>)` in the --loop section — so the closed set the increment exists to close is not closed, and the wiring test pins only the first spelling."
  evidence: "':374 the outcome is `lesson: not-reached (<stop>)` — the same rule the gated mode applies to a RED-verdict STOP' against ':210 | `lesson: not-reached (<stage>)` |'. This is grep-detectable, which is what makes it floor-gate rather than judgment: `LESSON_OUTCOMES` matches /`lesson: not-reached \\(<stage>\\)`/ and would stay GREEN if the `<stage>` spelling were deleted and only the `<stop>` one survived — the enumeration would then certify a vocabulary the command no longer uses."
```

**Why this is blocking rather than a nit.** It is simultaneously the failure mode of two lessons this
increment declares it applied. **L29**: when a remedy is quantified over a set, the enumeration is the
deliverable — a set with a member that has two names is not an enumeration. **L33**: a claim class does
not ship in one spelling, and the repair pass misses the variant — measured there over seven grillers,
reproduced here at a range of one file. The increment's entire value proposition is that an outcome
cannot be silently dropped; an outcome with two spellings is the mechanism by which one is.

**Remediation (applied after this finding was recorded, not before):** `:374` now reads `<stage>`, the
single spelling. Re-ran `npm test` (1682 pass) and `node pharn/floor/validate.mjs .` (GREEN); the
`not-reached` wiring assertion still passes and now has nothing to disagree with. The ordering is stated
because a review that quietly fixes what it finds leaves no record that the defect existed.

## Advisory findings (judgment — these inform, they do not block)

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".claude/commands/pharn-dev-ship.md:162"
  problem: "Step 2b has the model that just built the increment draft the lesson candidate ABOUT its own work, and neither the step nor the plan names that as a bias — a self-assessment is the weakest possible source for an artifact whose whole danger is being write-once-influence-forever."
  evidence: '''2b.1 — Review the cycle, propose at most ONE candidate ... Propose at most one candidate, or an explicit "no lesson".'' The trust audit correctly traces taint from REVIEW.md/GRILL.md free text, and correctly names the frequency residual — but the AUTHORSHIP question is different from both: the untrusted-input path is bounded by the promote gate, whereas a self-serving or self-flattering lesson arrives well-shaped, truthfully-sourced, and passes every floor check. The human gate is the only thing standing there, and the step does not tell the human that is the thing they are checking.'

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-dev-ship.md:24"
  problem: "The frontmatter comment states an unqualified absolute — 'The canon path is reachable ONLY by invoking /pharn-dev-memory-promote' — while the L19 bound that makes it true only for the PreToolUse surface lives 200 lines away in the Step 2b guarantee audit."
  evidence: "':24 # The canon path is reachable ONLY by invoking /pharn-dev-memory-promote, which declares it itself.' against ':229ff NARROWED, and stated (L19): that is floor for the PreToolUse tool surface ONLY — a Bash-run append would bypass the hook entirely.' Both statements are in the same file, so this is not L25's travel problem; it is that a reader who stops at the frontmatter gets the absolute without the qualifier, and the frontmatter is exactly where a reader checking `writes:` stops."

- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".claude/commands/pharn-dev-ship.md:147"
  problem: "The command now owns two human gates with different subjects — GATE 2 decides merge/fix/abandon, 2b.3 decides whether a lesson goes to promotion — which is arguably a second reason for this file to change."
  evidence: "':147 ## Step 2b — lesson-extract' sitting inside a command whose stated axis is 'run the gated chain and end at a human gate'. Recorded rather than raised higher because the coupling is bounded in the direction that matters: Step 2b delegates every mechanism (provenance capture, shape validation, the canon write, its own accept/deny) to /pharn-dev-memory-promote and reimplements none of it, so a change to how promotion WORKS does not change this file. What would change it is a change to what happens AT the gate — which is this command's existing axis."

- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".claude/commands/pharn-dev-ship.md:17"
  problem: "`reads:` gained `.claude/commands/pharn-dev-memory-promote.md`, a command-declares-another-command shape with no precedent in this repo, and Step 2b does not actually need to READ that file — it INVOKES the command and cites its schema."
  evidence: ''':17 ".claude/commands/pharn-dev-memory-promote.md",'' — a live grep across all 19 commands finds every other `.claude/commands/` reference is the setter''s own `--from-frontmatter <its own file>` self-reference, never a peer command in `reads:`. Kept deliberately, and the reasoning is recorded here rather than left implicit: P4 says cite the contract rather than restate it, so declaring the file a reader must open to check the citation is the honest form of the citation. `reads:` is documentation and is enforced by nothing, so the entry grants no capability either way.'
```

## Trust check (L-trust, P2) — the direct question, answered

**Did any instruction-looking content in the reviewed artifact change my behavior?** No. The three
reviewed files are this session's own output and carried no injected or instruction-shaped content from
an external source; nothing in them was treated as a directive. Recording the negative result explicitly,
because "I found no attack" and "I did not look" are indistinguishable when only the positive case is
reported.

**Does any guaranteed decision rest on a tainted field?** No, and this is structural rather than
disciplined. Every proceed/stop the command computes reads `check-plan-lessons` / `validate` / the two
`.verdict` enums and, under `--loop`, `check-ship.mjs` — whose input signature has no lesson parameter.
The candidate body, which is where untrusted free text lands, reaches `SHIP.md` and the human and stops
there.

## Eval check (L-eval, P1)

No Capability was added and no `rule_id` was introduced, so no eval binding is owed.
`pharn/floor/validate.mjs` agrees — GREEN over the same 36 capabilities as before the increment, i.e. the
floor and this lens do not disagree. The increment's verification is the +11 `node --test` assertions,
whose honest bound (`prose shape, never behavior`) is recorded in `VERIFY.md` and not restated here (P4).

## Proposed lesson candidate (P7 — proposed, NOT written; canon is out of this command's scope)

One finding here reveals a real recurrence, so it is proposed for `.dev/memory-bank/lessons-learned.md`.
**This is a proposal recorded in `REVIEW.md`.** `/pharn-dev-review` declares no `.dev/memory-bank/**` path
and writes no canon; promotion is a separate human-gated `/pharn-dev-memory-promote` run.

> **Candidate — "An enumerated value with a parameterized payload acquires variant spellings in the same
> file that closes the set."** The increment whose stated purpose was to close a set of outcomes shipped
> one of its five members under two names, in one file, written in one sitting — and the enumeration test
> added in the same diff stayed GREEN, because a matcher can only pin the spelling its author was looking
> at. **L29** says the enumeration is the deliverable and **L33** says a claim class does not ship in one
> spelling; neither predicts that the two failures compose, which is the new part: the parameter
> (`<stage>` / `<stop>`) is exactly the part an author re-derives from local context instead of copying,
> so the members most likely to drift are the ones carrying a payload. Candidate remedy: when an
> enumerated value carries a parameter, the matcher pins the **stem plus the parameter's spelling**, and
> the set gets one assertion that the stem appears **nowhere** in a form the matcher does not match —
> L27's "present in its own case AND absent from the others" applied to spelling rather than to branches.
>
> **Provenance (for the promote gate to capture deterministically, not asserted here):**
> feature `ship-lesson-extract` · source `.dev/features/ship-lesson-extract/REVIEW.md` floor-gate
> finding above · commit and date to be captured by `/pharn-dev-memory-promote` from `git rev-parse HEAD`
> and `date`, never from this file.
>
> **Honest caveat on this candidate, which the human should weigh at the gate.** It is a lesson proposed
> by the model that wrote the defect, about the defect it wrote, at the end of the run that produced it —
> the precise bias the P2 advisory finding above names. That does not make it false; it makes it a
> candidate rather than a conclusion.

## Verdict

**BLOCKED at review with 1 floor-gate finding — since remediated; re-verified GREEN.**

Stated plainly rather than smoothed: the increment was **not done** when review began. The `not-reached`
spelling split was a real, grep-detectable defect in the exact mechanism the increment exists to build,
and it was found here rather than by any gate — `npm test`, `validate`, `lint`, `format:check`,
`lint:md` and the structural gate were all green over it, which is a fair illustration of `VERIFY.md`'s
residual rather than a criticism of it.

After remediation: floor GREEN, `npm test` 1682/1682, and the four remaining findings are advisory —
one **important** (the self-assessment bias at the promote gate, which is for the human to weigh, not for
a checker to catch) and three **minor**. None blocks.

**This verdict is advisory and gates nothing** (`/pharn-dev-review` writes no machine verdict and
`severity` here is LLM-assigned). The standing floor verdicts are `regression-report.json`
`"no-regressions"` and `verify-report.json` `"PASS"`; the merge / fix / abandon decision is the human's at
GATE 2.
