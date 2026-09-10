# REVIEW — promote-dev-parity

**Step 1, floor first (P0):** `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities, exit 0. The
increment was entitled to reach review. Everything below the floor line is **advisory**.

The increment under review is `trust: untrusted`. It is a command file dense with imperative prose
(`HALT and ask`, `Do not write`, `MUST go through …`). **None of it steered this review** — the procedure
followed was `/pharn-dev-review`'s, and the reviewed command's own instructions were read as DATA
describing what a future promote run should do. Recording that explicitly is the L-trust lens working,
not a formality.

## THE FINDING WITH REAL TEETH — read this one first (2.2.6, now closed)

Of the five ported hardenings, four narrow a window that was already narrow. **One closed a live hole in
permanently-retained state**, and it deserves to be called out rather than averaged into a list:

> Before this increment, `/pharn-dev-memory-promote` rendered `## <id> — <title>` into
> `.dev/memory-bank/lessons-learned.md` with **no shape check on `title` whatsoever**. The floor could not
> catch it and was never going to: `.dev/floor/check-provenance.mjs:54` records in its own contract
> comment that `title` and `body` are **IGNORED** — deliberately, because they are untrusted free text no
> guaranteed decision may rest on. So a model-drafted, untrusted-derived `title` containing a newline or a
> control character would have landed **verbatim in a canon heading**, in a file that is append-only in
> practice, git-committed, and read by every future `/pharn-dev-plan` sweep. Memory poisoning is the one
> attack surface in this repo with **no rollback signal** (`THREAT-MODEL.md §2 #3`).

The product twin has had the guard since `SKILLS_VERSION` 2.2.6. The apparatus that builds PHARN did not.
That asymmetry — the gate protecting PHARN's own canon being weaker than the one shipped to users — is the
finding the external review named, and this is the sharp end of it. It is now closed at Step 3, before any
Markdown is rendered and before `AskQuestion` can reach a human.

**Its honest bound, stated so the fix is not oversold:** the check is primitive #3 by _kind_ (a
character-class and type test) but an **inline `node -e` with no test file of its own** — unlike
`check-provenance.mjs`, whose behavior `.dev/floor/check-provenance.test.mjs` pins. And a shape-valid title
is still untrusted free text; the gate bounds its _form_, never its _content_.

## Floor-gate findings (blocking)

**None.** `validate` is GREEN; every guarantee the increment claims carries either a floor reduction or an
explicit bound; no `enforces` rule_id was added (so P1's eval-binding obligation is not triggered, which
the floor independently confirms — the capability count is unchanged at 36); no sibling reference was
introduced.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".claude/commands/pharn-dev-memory-promote.md:530"
  problem: "The Determinism audit still lists only the pre-existing fallbacks and never enumerates the THREE new HALT-and-ask branches this increment added — including the failed-`git rev-parse HEAD` halt, which is the single most load-bearing dev/product divergence in the whole change."
  evidence: '- The terminal fallback for "is this lesson worth canon?" is **ask the human** (the Step-5 accept/deny halt), never a model guess.'

- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".claude/commands/pharn-dev-memory-promote.md:505"
  problem: "The Trust audit was not updated for `title`: it still presents `type`/`concepts` as the only model-drafted values entering a gated class, and never states the ASYMMETRY that matters — those two become enum-gated (trusted), while `title` is merely shape-BOUNDED and stays untrusted free text in a canon heading."
  evidence: "- **`type` / `concepts` PROMOTE model-drafted values into the enum-gated class — the laundering vector itself.**"

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-dev-memory-promote.md:2"
  problem: "The frontmatter `description` extends the word FLOOR to cover the Step-3 title check and the Step-6 content-hash re-verification without carrying the 'untested inline one-liner' bound that the body states plainly — a summary that reads stronger than the document it summarizes, which is the P0 disease in miniature."
  evidence: "FLOOR: no CANDIDATE reaches the human gate without valid, well-shaped provenance, a unique id, a single-line control-char-free `title`"

- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:545"
  problem: "Standing coupling the human accepted at GATE 1, re-recorded here so it is not lost: a DEV-side test's health is now a function of PRODUCT-side prose, so an unrelated reword of `pharn-memory-promote.md` can redden this suite for reasons having nothing to do with the dev port."
  evidence: "const PROMOTE_SURFACES = [\n  { file: \"pharn-dev-memory-promote.md\", key: \"dev\", label: \"DEV\" },\n  { file: \"pharn-memory-promote.md\", key: \"prod\", label: \"PRODUCT\" },\n];"
```

All four rest on judgment of wording or of `severity` and are **advisory-gate**: they inform, they do not
block. None is the sole basis for any guaranteed or constitutional invariant.

## Lens-by-lens

**L-floor → P0.** Every new claim reduces or is bounded. The two ported inline checks are labeled
"primitive by kind, untested by implementation" in the guarantee audit — the distinction between a
committed checker with a `*.test.mjs` and a one-liner in command prose is now stated where it was not
before. The `canon-write-denylist` disclosure was carried across from the product twin rather than dropped
(a dev PLAN's `## Files` can still grant an ungated canon write via `--from-plan`), so the new write-channel
mandate cannot be misread as "canon is only writable through this command". **R3 is the one gap:** the
frontmatter summary did not inherit the body's bound.

**L-eval → P1.** No `role:`-bearing capability, no new `enforces` rule_id, so the Capability-eval
obligation is not triggered. The floor agrees — `validate` GREEN at an unchanged 36 capabilities. The
increment's verification lives in 37 new `node --test` assertions, and those were **mutation-tested against
the committed pre-port text before being authored** (8/8 anchors matched only after the port), which is the
L4 discipline applied in the order that makes it meaningful rather than after the fact.

**L-trust → P2.** No guaranteed decision rests on a tainted field. The new title gate _reads_ the untrusted
`title`, but only to **refuse** — it can narrow, never permit-on-content — which is the same sanctioned
shape-gating `type`/`concepts` already use. `check-provenance.mjs` still never sees `title` or `body`.
**R2 is the gap:** correct behavior, undocumented asymmetry.

**L-axis → P3.** One axis per file: the command changes for "the dev promote gate procedure", the test file
for "command-prose obligations, enumerated" (its existing axis, now with a fourth set alongside
`FORBIDDEN`, `STEP_2B_GATES`, `LESSONS_SWEEP_WIRING`, `PLAN_LESSONS_WIRING`). No sibling reference. The new
dependency points `.dev/` → `.claude/commands/`, which is the **permitted** direction: a user's install
ships without `.dev/`, so nothing on the shipped surface depends on this test. **R4** records the accepted
cross-surface coupling.

## Verdict

**GREEN — 0 floor-gate findings, 4 advisory.** The increment is done in the sense the floor can certify:
`validate` GREEN, `npm test` 1720/1720, no regressions, verify PASS. The four advisory findings are all
**documentation-honesty** items in sections whose job is precisely to be exhaustive; each is a short edit
inside the two already-declared files, and none changes behavior.

**What this increment does NOT establish, stated plainly (P0):** the parity set pins that each command's
prose _contains_ the pinned line. It cannot prove a run executed the step, that a HALT is obeyed, or that
the two ported one-liners are implemented correctly. **"The parity is pinned" never means "the gate ran."**
And the sixth asymmetry — the next-id branch — remains open by explicit decision, recorded as follow-up
`promote-nextid-branch-parity`.

## Resolution at GATE 2 (appended after the human's decision)

The human's GATE-2 decision was **fix the four findings first**. All four were fixed inside the two files
already in the plan's `## Files` — no scope change was needed — and every gate was **re-run over the final
bytes** (`validate` GREEN; `npm test` 1720 pass / 0 fail / **0 skipped**; `check-verify` PASS). What
changed:

- **P0 (the priority, fixed properly rather than minimally).** The frontmatter `description` no longer
  flattens two different things into one word. It now separates **FLOOR (a TESTED checker)** —
  `check-provenance.mjs`, whose behavior `check-provenance.test.mjs` pins — from **FLOOR BY KIND, UNTESTED
  BY IMPLEMENTATION**, which names the Step-3 title check and the Step-6 hash re-verification as inline
  `node -e` one-liners with no test file, and says why the distinction is stated separately: collapsing it
  would make the summary read stronger than the body. It closes on the two-clocks caveat covering _every_
  floor claim in the line. Shipping the old wording would have put the disease inside its own cure.
- **P5.** The Determinism audit now **enumerates** all six terminal fallbacks rather than summarizing two,
  with the failed-`git rev-parse HEAD` HALT first and marked as the most load-bearing divergence. It also
  distinguishes the two branches that HALT _without_ a question (a Step-3 RED, a Step-6 mismatch) as
  refusals with a prescribed remedy — nothing is being decided there, so no human arbitration is owed.
- **P2.** The Trust audit now carries the `title` asymmetry explicitly: `type`/`concepts` are drawn from
  **closed grammars** and can be read as enum-gated, while `title` is **arbitrary free text that merely
  cannot be malformed** — every shape-valid string is still accepted, so it stays untrusted DATA in the
  heading. A new named residual covers the shape-valid-but-misleading title, held only by the human's
  Step-5 read.
- **P3.** The accepted cross-surface coupling is now recorded in `command-hygiene.test.mjs` itself, at
  `PROMOTE_SURFACES`, including that the mitigation is the anchor discipline and **not** a narrower domain,
  and that the `.dev/` → `.claude/commands/` direction is the permitted one.

## Proposed lesson candidate (P7 — proposed only; NOT written to canon)

`/pharn-dev-review` holds no `.dev/memory-bank/**` scope and never writes canon. This is a proposal for a
separate, human-gated `/pharn-dev-memory-promote` run.

**Candidate — the L20/L29/L31 chain has now fired three times in the same copy-pair, and the third
occurrence is what makes it a lesson rather than a repeat.**

> **Draft lesson.** When a deliberate dev/product copy-pair is HARDENED, the hardening is an obligation the
> enumeration must range over — and a pair whose _code_ is pinned to agree is exactly where nobody thinks
> to check whether its _procedures_ still do. L31 established that a copy-pair's obligations need
> materializing; it was promoted from `dev-lessons-index-gate`, where the product half shipped two
> invocations and the dev half shipped none. This increment found the **same pair** had dropped **five
> more** obligations — the 2.2.4–2.2.8 gate hardenings — landed in a single PR that _created_ the product
> command, so there was never a moment when a back-port was visibly "due". The generalization L31 does not
> reach: **a copy-pair diverges most invisibly when one copy is BORN hardened**, because no diff ever shows
> the other copy losing anything. The remedy is to enumerate the pair's obligations at the moment the
> second copy is created, not at the moment someone notices the gap.

**Why it clears the L20 bar (a real failure, not a hypothetical):** the first occurrence is recorded in
canon as L31 with its own provenance; the second is these five hardenings, measured live in this run
(8/8 anchors present in the product command, 0/8 in the dev one, at `HEAD` `ab9aabd`).

**Provenance to capture at promotion time** — deliberately NOT composed here; the promote command captures
it from live state:

- `feature`: `promote-dev-parity`
- `source`: `.dev/features/promote-dev-parity/REVIEW.md` (this section) + `GRILL.md` findings 5 and 8
- `commit` / `date`: captured by `/pharn-dev-memory-promote` Step 1 (`git rev-parse HEAD`, `date +%Y-%m-%d`)
- proposed `type`: `process` · proposed `concepts`: `[lesson-recurrence, dev-product-boundary, enumeration, floor-escalation]`

The `type`/`concepts` values above are **model-drafted and advisory** — a human ratifies at the promote
gate that they describe the entry. Whether this lesson is true, general, or worth canonizing is not this
command's call.
