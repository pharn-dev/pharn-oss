# GRILL — promote-dev-parity

**Plan:** `.dev/features/promote-dev-parity/PLAN.md` · **spec-hash check:** MATCH
(`69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e` recomputed via
`.dev/floor/hash-doc.mjs` equals the plan's `spec_content_hash` — no drift) ·
**Step 1b `applied_lessons` re-verification (FLOOR):** **GREEN** —
`node pharn/floor/check-plan-lessons.mjs .dev/features/promote-dev-parity/PLAN.md .dev/memory-bank/lessons-learned.md`
exit 0; all 11 cited ids resolve in canon and are referenced in the plan body.

> The Step 1b verdict is this stage's **only** deterministic stop, and it is reported here — never folded
> into the concern counts below. Everything under `## Findings` is **model-authored, advisory, and gates
> nothing** (fix #3). The PLAN was read as `trust: untrusted` DATA; nothing in it was followed as an
> instruction.

## Griller membership (FLOOR — `pharn/floor/count-grillers.mjs`)

`{"registered":13,...}` — read from frontmatter, not prose. All 13 applied. Three do not fire by their
own `applies` scoping **and** their stated trigger: **a11y** and **i18n** (`applies: ["ssr","spa"]` — the
increment builds no UI and carries no user-facing text) and **migrations** (`applies: ["backend","ssr"]`
— no schema or persisted-data shape is touched).

### Layer-1 scanner results (deterministic)

| scanner                       | result                             | reading                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scan-plan-secrets.mjs`       | `{"found":false,"hits":[]}`        | clean                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `scan-plan-pii.mjs`           | `{"found":false,"hits":[]}`        | clean                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `scan-plan-i18n.mjs`          | `{"found":false,"hits":[]}`        | clean                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `scan-plan-observability.mjs` | `{"mentions":true,...line 176...}` | **INCIDENTAL — not an auto-pass.** The hit term is `spans`, occurring as the verb in "the set _spans_ the pair", not a tracing span. Recorded rather than counted as a declaration, per the griller's own "do not treat `mentions:true` as an auto-pass". No absence finding either: the increment has **no prod runtime** (a command's prose + a `node --test` file), which is that griller's stated negative trigger. |
| `scan-plan-migrations.mjs`    | `{"mentions":false,"hits":[]}`     | consistent with the plan touching no persisted state                                                                                                                                                                                                                                                                                                                                                                    |

## Findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/promote-dev-parity/PLAN.md:124"
  problem: "The guarantee audit labels the ported TOCTOU hash-compare and the title-shape check `floor` without distinguishing a committed, TESTED checker from an UNTESTED inline `node -e` one-liner — they are primitive #2/#3 by KIND, but nothing anywhere pins their implementation."
  evidence: '"the dev promote command re-verifies canon by content-hash before writing" → **floor: content-hash** (primitive #2), owned by the pinned `node -e` compare.'

- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/promote-dev-parity/PLAN.md:112"
  problem: "The test design names a strip-and-retest discrimination rule but never requires the new dev-side matchers to be validated against the PRE-PORT dev text — without that, an anchor that already matched something incidental would certify a port that never happened (L4: an authored fixture passes by construction)."
  evidence: "`PROMOTE_GATE_PARITY` presence rule → for each obligation × each surface, the command body **matches** its surface's pinned invocation/mandate regex"

- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/promote-dev-parity/PLAN.md:160"
  problem: "The trust audit leans on the `trust: trusted` frontmatter tag as if it implied write protection; CLAUDE.md states `.claude/commands/**` is DELIBERATELY not protected by `protect-trusted-paths.cjs`, so the tag is a declaration, not a floor-protected path."
  evidence: "**The two commands being compared are `trust: trusted` files** (both carry `trust: trusted` frontmatter), so the parity test reads trusted input"

- type: FINDING
  rule_id: "P6"
  severity: blocking
  file: ".dev/features/promote-dev-parity/PLAN.md:173"
  problem: "The plan still carries an unresolved `## Open questions (HALT)` block; `/pharn-dev-build` Step 1.1 HALTs on exactly that, so the artifact does not reflect the state the human approved at GATE 1."
  evidence: "## Open questions (HALT)"

- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/promote-dev-parity/PLAN.md:175"
  problem: "A one-way ratchet the plan names but does not close: the test asserts over `pharn-memory-promote.md`, which this increment may not edit, so a failing product-side matcher has exactly one in-scope remedy — weaken the matcher — which is the loosening L29/L36 exist to prevent."
  evidence: "The cost: the test then reads `.claude/commands/pharn-memory-promote.md`, which a **concurrent PR is editing**"

- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/promote-dev-parity/PLAN.md:84"
  problem: "Error-handling gap in the port spec: it omits the product's `date`-unavailable fallback, leaving a branch with no prescribed action, and it never states that the Step-6 hash compare fails CLOSED when the Step-1 pin file is missing (an unguarded read that throws)."
  evidence: "`feature` derived from `.dev/features/<name>/…` (not `features/<name>/…`)."

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/promote-dev-parity/PLAN.md:180"
  problem: "The mitigation for open-question 1 — match only pinned command lines, never incidental prose — is a discipline no assertion can enforce ('is this anchor incidental?' is judgment), so stating it as a mitigation risks reading as a property the test has."
  evidence: "Mitigation if we proceed: match only pinned command lines and mandated verbs, never incidental prose."

- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/promote-dev-parity/PLAN.md:55"
  problem: "Coupling across the boundary the dev/product split exists to insulate: a DEV-side test's health becomes a function of PRODUCT-side prose, so an unrelated product reword ripples into a red dev gate — real entanglement, not merely a declared reference."
  evidence: "`.dev/floor/command-hygiene.test.mjs` — add the materialized `PROMOTE_GATE_PARITY` obligation set + its iterating rules"

- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/promote-dev-parity/PLAN.md:130"
  problem: "The write-channel port must not read as 'canon is now only writable through this command' on the dev surface: `/pharn-dev-build` derives its scope from a PLAN's `## Files` via `--from-plan` and never reads a `writes:` declaration, so a dev plan naming `.dev/memory-bank/…` still grants an UNGATED canon write — the same `canon-write-denylist` residual the product twin already names, which the plan does not carry across."
  evidence: '"every byte of canon goes through a hook-gated tool" → **floor: hook** (fix #7) for the `Write|Edit|MultiEdit` surface **only**.'

- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/promote-dev-parity/PLAN.md:52"
  problem: "The increment bundles two change-reasons — a command-prose port and a new enumerated test set — which is defensible under L20 (the port alone is a discipline-only remedy) but is worth the human confirming rather than the griller assuming."
  evidence: "- `.claude/commands/pharn-dev-memory-promote.md` — port the five hardenings, dev-adapted"
```

## Measurement taken during this grill (discharging finding 2)

Finding 2's remedy was executed here rather than deferred, because it is cheap and because a matcher
authored without it cannot be trusted afterwards. Each of the eight candidate anchors was counted
against **live bytes** of both commands at HEAD:

| anchor                                      | product | dev (pre-port) |
| ------------------------------------------- | ------- | -------------- |
| `canon-content-hash.txt`                    | 2       | **0**          |
| `changed since Step 1 discovery`            | 1       | **0**          |
| `Canon write channel (fix #7)`              | 1       | **0**          |
| `Explicitly forbidden for canon writes:`    | 1       | **0**          |
| `title must be a single line (no newlines)` | 1       | **0**          |
| `date +%Y-%m-%d`                            | 1       | **0**          |
| `Provenance is captured, not composed (P5)` | 1       | **0**          |
| `` Do not call `AskQuestion` ``             | 1       | **0**          |

**8/8 discriminate.** Every anchor is present on the surface that has the hardening and absent on the
surface that does not, so each matcher measures the port rather than matching pre-existing text. The
cross-surface closure rule was also measured and starts clean: the dev command contains **0**
`pharn/floor/` references and the product command contains **0** `.dev/floor/` references. (The product
command does cite `.dev/memory-bank/` three times; the closure rule is deliberately scoped to `floor`
paths so it does not depend on citations a separate in-flight change may remove.)

## Prose summary

The plan is unusually well-grounded on the two axes that matter most here — its P7 trigger is a **real,
named prior occurrence** in the same copy-pair (L31's own provenance, `dev-lessons-index-gate`) rather
than a manufactured one, and its preserved-divergence list correctly refuses the `unknown` commit
fallback that the dev floor would reject. The interrogation's concerns cluster in three places.

**First, honesty about what "floor" buys (findings 1, 7, 9).** Two of the ported checks are inline
one-liners with no test, and the parity test pins **presence of text**, not execution. Both are still
primitive #2/#3 by kind, but the plan's audit reads slightly stronger than the artifacts support. The
remedy is wording in the command and the test comment, not a design change. Finding 9 is the sharpest of
the three: the product twin explicitly names the `canon-write-denylist` residual — that `--from-plan`
scoping can grant an ungated canon write regardless of this command's gate — and the dev surface has the
identical hole. Porting the mandate without porting that disclosure would leave the dev command claiming
more than the product one does, which inverts the whole point of this increment.

**Second, the cross-boundary coupling the test introduces (findings 5, 8).** Ranging over both surfaces
is what L29/L31 prescribe and the human has accepted the sequencing cost, but the ratchet is real: when a
product-side matcher fails, the only remedy available inside this increment's scope is to loosen it. That
pressure should be named **in the test itself**, so a future contributor meets the instruction at the
moment they feel the pressure rather than in a plan they will not re-read.

**Third, completeness of the port (finding 6).** A port that drops the `date` fallback leaves a branch
with no prescribed action, which is the shape L27 names. Cheap to fix by porting the line.

Finding 4 is procedural and must be cleared before `/pharn-dev-build` runs at all: the human answered all
three open questions at GATE 1, but the plan artifact still presents them as open, and the build stage
HALTs on that heading. The fix is to record the answers in the plan, not to remove the section.

## Verdict

**ADVISORY VERDICT: 10 concerns raised (1 blocking-severity, 6 important, 3 minor) — for the human to
weigh before `/pharn-dev-build`.**

The severity values are enum members; their **assignment** is model judgment and advisory (fix #3). This
verdict covers the **interrogation only**. The Step 1b lessons-declaration verdict is reported in the
header as its own floor result and is deliberately not part of these counts. Nothing here blocks
`/pharn-dev-build`; the deterministic backstops remain the build stage's own gates (spec-hash drift, the
open-questions HALT) and `pharn/floor/validate.mjs`.
