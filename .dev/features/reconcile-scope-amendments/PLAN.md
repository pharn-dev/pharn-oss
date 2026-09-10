# PLAN — reconcile-scope-amendments (an epoch may hold MORE THAN ONE authorized scope)

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487 # fix #4
- applied_lessons: [L7, L17, L34, L38, L41]
- increment: `reconcile-baseline.mjs` records exactly ONE `scope_snapshot` per epoch, but a
  `/pharn-*ship` run legitimately writes under SEVERAL scopes inside one epoch. Add an additive
  `scope_amendments[]` and a `--amend-scope` mode a stage calls after its own Step-0 setter, so a
  hook-approved write by a LATER stage stops being reported as a Bash escape.
- layer(s): `pharn/floor/` (product floor), `pharn/pharn-contracts/`, the two `*-memory-promote` commands
- constitution_refs: [P0, P5, P6, P7]

## The observed failure (P7 — a real failure, never a hypothetical)

Recorded live this session as `.dev/features/product-features-relocation/REVIEW.md` **F3**, on commit
`d0aaf6c`. `/pharn-dev-memory-promote` wrote lesson `L41` to `.dev/memory-bank/lessons-learned.md`
**through the `Edit` tool**, past **both** live `PreToolUse` guards, under a scope whose `set_by` origin
is the promote command, behind an explicit human accept. `check-bash-reconcile.mjs` then returned:

```json
{ "verdict": "ESCAPE", "escapes": [{ "file": ".dev/memory-bank/lessons-learned.md", "denied_by": "protect-trusted-paths.cjs" }] }
```

with the problem text _"a write reached it outside the guarded tool surface"_. **That sentence is false
for this write** — nothing Bash-written touched canon.

**Probed in BOTH directions rather than reasoned about** ([[L40]]'s rule: to test an attribution, vary
the attributed condition). With the scope released, `protect-trusted-paths.cjs` denies (`exit 2`,
reproduced). With the promote-origin scope restored it **permits** (`exit 0`, reproduced) — and the
escape **survives anyway**, because `check-bash-reconcile.mjs:398` then consults
`baseline.scope_snapshot`, which holds the **build** stage's scope. So the live-hook half is a red
herring; the snapshot half is the cause.

**It is structural, not incidental.** One epoch spans build→ship; canon is `never_exempt` by deliberate
design in `reconcile-ignore.json`; and `/pharn-dev-ship` Step 2b writes canon **after** the Step-3 build
anchor by construction. Per [[L7]] the build/ship scope may never name canon — that is exactly what the
promote gate exists to withhold — so no amount of `## Files` declaration can fix it from the plan side.
**Every `/pharn-dev-ship` run that promotes a lesson therefore ends with `npm run check` RED.**

This is [[L17]]'s failure mode reproduced in a new checker: a changed-since-anchor test reported as a
wrote-outside-scope test, producing a blocking finding on the **correct, designed** workflow — which
trains an operator to wave through the one finding that must never be waved through.

## Design

`scope_snapshot` stays **exactly as it is** — the anchor-time scope, unchanged in shape and meaning.
Two additions:

1. **`scope_amendments: []`** on the baseline record — an ordered list of further scopes that were
   legitimately in force during the epoch, each the same `{scope, set_by, set_at}` shape.
2. **`reconcile-baseline.mjs --amend-scope`** — appends the CURRENT `.pharn/writes-scope.json` to that
   list. A stage calls it **immediately after its own Step-0 setter**, the same ordering the anchor
   already requires ([[L38]]).

`check-bash-reconcile.mjs` then tests a candidate against the **union** of `scope_snapshot.scope` and
every `scope_amendments[].scope`.

**`activeFeatureSlug()` keeps reading `scope_snapshot` ONLY** (`check-bash-reconcile.mjs:192`). The
feature slug must come from the build's PLAN-derived scope; a promote amendment's `set_by` is a command
path, not a feature, and unioning it in would let a promote silently repoint the pipeline-artifact
exemption at another slug. Pinned by a test.

**Why additive rather than making `scope_snapshot` an array.** An existing baseline on disk stays
readable, and the contract's current field keeps its documented meaning ([[L35]] does not apply — this
is not one fact stored twice but two different facts: what was in force when the epoch OPENED versus
what was added later, and the escape record must be able to say WHICH one authorized a path).

## Files

- `pharn/floor/reconcile-baseline.mjs` — `--amend-scope` mode; `scope_amendments: []` in the built record
- `pharn/floor/reconcile-baseline.test.mjs` — amend mode, absent-baseline refusal, ordering, non-vacuity
- `pharn/floor/check-bash-reconcile.mjs` — union the amendments at the snapshot-scope branch; carry which
  scope authorized a path into the escape record
- `pharn/floor/check-bash-reconcile.test.mjs` — the F3 regression case, plus the `activeFeatureSlug` pin
- `pharn/pharn-contracts/reconciliation-record.md` — document `scope_amendments` + the amend ordering
- `.claude/commands/pharn-dev-memory-promote.md` — call `--amend-scope` after its Step-0 setter
- `.claude/commands/pharn-memory-promote.md` — same, product twin
- `.claude/commands/pharn-dev-ship.md` — same, after its Step-3 setter (see the trigger note below)
- `.claude/commands/pharn-ship.md` — same, after each of its four setters
- `SKILLS_VERSION` — 5.0.1 → 5.1.0
- `README.md` — the shields version badge, which `check:badge` holds EQUAL to `SKILLS_VERSION`
- `CHANGELOG.md` — the entry, naming F3 as the trigger

### The two wirings have DIFFERENT triggers, and the weaker one is labelled (P7)

- **The two `*-memory-promote` commands: an OBSERVED failure.** F3, reproduced live. Canon is
  `never_exempt`, so the write is always a candidate, and nothing but an amendment can account for it.
- **The two ship commands: the maintainer's EXPLICIT DIRECTION at GATE 1, with no observed failure.**
  Stated plainly because a manufactured trigger is the disease P0 names. Measured before writing it
  down: `/pharn-ship` has **no** lesson-extract step at all (its Step 2b is the build-completion retry;
  only `/pharn-dev-ship` promotes), and **every** scope those commands set targets `BRIEFING.md`,
  `SHIP.md` or `ship-record.json` — all already exempt under `pipeline_artifacts`. So this wiring
  **changes no verdict today**; its value is that a future ship-stage write to a NON-artifact path
  would be accounted for rather than reported as an escape. This follows the repo's own precedent for
  a human-directed addition (`check-plan-lessons` sub-check D, added the same way and recorded the
  same way — P5's terminal fallback is ask the human).

Explicitly **not** touched: `.pharn/reconcile/baseline.json` (runtime state, gitignored — a live baseline
is never hand-edited), `reconcile-ignore.json`'s `never_exempt` (canon stays non-exemptible; this
increment makes a legitimate canon write **accounted for**, never **exempt**).

## Guarantee audit (P0)

- "A hook-approved write by a later stage is no longer reported as a Bash escape" → **floor: enum-regex**
  — a membership test of the path against the union of recorded scopes, in `check-bash-reconcile.mjs`,
  pinned by the F3 regression test.
- "Canon writes are still VISIBLE" → **floor**, unchanged. `never_exempt` is untouched, so canon remains
  in the candidate set every epoch; what changes is the VERDICT on an authorized one, never its
  visibility. "Exempt" and "accounted for" are different words here and must stay different.
- "The amendment cannot be self-granted" → **ADVISORY, and weaker than the anchor's.** `--amend-scope`
  is a Bash call, so anything holding Bash can append a scope authorizing anything. **This grants no new
  power** — the same actor could already rewrite the baseline outright, which the contract already
  concedes ("an accounting tool against tooling that escapes its scope, **not** a control against an
  attacker"). Stated rather than glossed: the detector's non-adversarial bound is unchanged by this
  increment, and this increment must not be described as tightening it.
- "Every `/pharn-*ship` promoting run now ends CLEAN" → **advisory** (command orchestration). The floor
  guarantees the membership test; that a command actually CALLS `--amend-scope` is discipline, exactly
  as the anchor's own Step-0 call is ([[L19]]). A test pins that both promote commands **declare** the
  step and order it after their setter — presence + ordering, **never** proof a run executed it.

## Test obligations

- **[[L34]] non-vacuity:** the F3 regression must FAIL when the union logic is disabled — a mutation
  control, not just a green assertion.
- **[[L41]]:** `--amend-scope` with **no** baseline, and `check-bash-reconcile` with **no**
  `scope_amendments` key (a pre-existing baseline), must each be exercised explicitly. Both are
  no-argument/absent-field default paths, which is precisely the shape L41 says a hermetic suite skips.
- **Ordering:** an amendment appended BEFORE its setter ran must not silently authorize the wrong scope.

## Open questions for the human (GATE 1)

1. **Should `/pharn-dev-ship` Step 2b also amend**, or is wiring the two promote commands enough? The
   promote command owns the canon write, so wiring it there is the narrower fix — but `/pharn-dev-ship`
   is what makes the epoch span the write, so there is an argument for the amend living at the call site.
   Recommendation: **wire the promote commands only** — they own the scope, and a command that sets a
   scope amending its own epoch is the invariant worth having.
2. **Bump size.** Called **minor (5.1.0)** here: a newly shipped mode on a shipped checker, no existing
   install invalidated (an old baseline with no `scope_amendments` key reads as an empty list). Say if
   you read it as patch.
