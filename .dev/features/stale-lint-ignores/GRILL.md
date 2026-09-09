# GRILL — stale-lint-ignores

**Plan:** `.dev/features/stale-lint-ignores/PLAN.md` (read live this run, treated as `trust: untrusted`).

**Spec-hash check (Step 1.2 — content-hash primitive, surfaced not blocking here):** recomputed
`sha256(pharn/ARCHITECTURE.md)` = `69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e`;
the plan's `spec_content_hash` is byte-identical. **No drift.** `/pharn-dev-build` re-checks and is where
drift would block.

**Step 1b — `applied_lessons` re-verification (FLOOR; the stage's ONE deterministic stop):**

```text
GREEN — applied_lessons: L11, L13, L18, L19, L20, L25, L26, L28, L29, L33, L35
(.dev/features/stale-lint-ignores/PLAN.md); all 11 cited id(s) resolve in
.dev/memory-bank/lessons-learned.md and are referenced in the plan body.
exit 0
```

This is the first stage that did not author the field. **The bound (P0):** the verdict covers the
**declaration** — present, well-formed, ids resolve, each referenced in the body. It says nothing about
whether the lessons were genuinely applied. "The grill verified the lessons were applied" is struck.

## GATE-1 resolutions (recorded here because `PLAN.md` is outside every later stage's scope)

The plan's `## Open questions (HALT)` are **resolved**; the human answered both at GATE 1. Recorded in
this artifact so `/pharn-dev-build` Step 1.1 reads them as resolved without any stage editing the plan.

1. **Extend the surviving `.pharn/lessons-index.md` comment** — **option (a)**, in the mechanism
   register. The human added a justification the plan did not have: the external review that prompted
   this increment _itself_ reached for the blanket `.pharn/` option that had already been rejected twice
   in writing, which is live evidence the reasoning must stay visible in the file rather than only in an
   audit trail.
2. **Do NOT build the floor check** — agreed. Record `lint-ignore-reachability-check` as a named unbuilt
   residual with its reopen trigger, preserving the structural-impossibility leg verbatim.

## Findings (ADVISORY — grillers and this interrogation gate nothing)

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/stale-lint-ignores/PLAN.md:215"
  problem: "The determinism audit attributes the dead/live branch to a membership test, but the existence test alone cannot make that split — the plan's own Evidence A shows all three `.pharn/` entries equally absent, so the branch actually rests on the recreatability enumeration the same plan labels ADVISORY."
  evidence: '`- Which entries are dead → the existence test in Evidence A (membership over the filesystem), never judgment about which entries "look" stale.` — against `ABSENT   .pharn/lessons-index.md` in Evidence A and `**`.pharn/fixes` / `.pharn/FABLE_REVIEW.md` will never be recreated by tooling** → **ADVISORY.**` in the guarantee audit.'

- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/stale-lint-ignores/PLAN.md:76"
  problem: "The declared verification is INSENSITIVE to the change it verifies: the plan's own Evidence B measures `lint:md` and `npm run check` as exit 0 both before and after, so those gates pass identically if the build deletes the wrong entry, deletes all three, or does nothing at all."
  evidence: "`## Evals to write (P1)` → `None — P1 binds **Capabilities**, and this increment authors none.`, with `## Guarantee audit (P0)` naming `**`lint:md` and `npm run check` stay exit 0 after the edit** → **FLOOR: exit code**` as the verification, and Evidence B recording `Linting: 1063 files · Summary: 0 issues in 0 files · exit 0` for BOTH arms."

- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/stale-lint-ignores/PLAN.md:238"
  problem: "The plan prescribes the retained comment's register but never states what it must NOT say, so nothing stops the replacement sentence from being state-register prose that expires the moment scratch reappears — reproducing L33 inside the fix for L33."
  evidence: "`roughly three lines, in the mechanism register so they cannot expire (L33), recording that a blanket `.pharn/` stays rejected and why.` — a positive constraint with no stated exclusion; e.g. `.pharn/fixes no longer exists` would satisfy the sentence as written and expire on the next scratch file."

- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/stale-lint-ignores/PLAN.md:102"
  problem: "Evidence C's conclusion is stated more broadly than the evidence that supports it — the grep covered three roots and three extensions with tests excluded, but the sentence drawn from it is an unqualified claim about the whole repo."
  evidence: "`Every `.pharn/` literal in `.claude/**`, `pharn/floor/**` and `.dev/floor/**` (tests excluded) resolves to …` (bounded) immediately followed by `Nothing writes `.pharn/fixes/**` or a `.pharn/` root `.md`` (unbounded), in the same paragraph."

- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/stale-lint-ignores/PLAN.md:225"
  problem: "The residual's acceptance argument conflates DETECTION with ATTRIBUTION: the red is loud, but by L11's own account it lands on a later, unrelated increment's verify, so the cost falls on someone who did not create the offending file."
  evidence: "`unlike the failures L20 targets, this one **announces itself** — it is a loud red with a documented remedy` — against L11's `a red whole-repo style gate silently blocks EVERY later feature's verify until someone fixes the unrelated file`."
```

## Griller pass (Step 2b — membership is FLOOR, running them is advisory)

`node pharn/floor/count-grillers.mjs .` → `{"registered":13,...}`. Membership read from frontmatter, not
prose.

- **testability (P1)** — Layer 1: a verification approach is **present** (`## Evidence` measurements +
  the guarantee audit naming `/pharn-dev-verify`'s exit codes), so **no absence finding**. Layer 2
  (advisory adequacy) produced the `rule_id: P1` finding above.
- **architecture (P3)** — **fit recognized, no finding.** One file, one change-reason; no layers, no
  `reads:`, no sibling reference, no contract. The `## Files` bullet names two operations, but they share
  a single reason to change (the `.pharn/` scratch corpus is gone, so the exclusion set and its recorded
  rationale move together), so this is not a P3 split.
- **documentation (P7)** — Layer 1: a documentation declaration is **present** (the retained comment is
  the declaration, and the human ratified option (a)), so **no absence finding**. Layer 2 (advisory
  adequacy) produced the `rule_id: P7` finding above.
- **The other ten grillers (a11y, comprehension, coupling, error-handling, i18n, migrations,
  observability, performance, privacy, security) produced no findings — and the honest bound is stated
  rather than implied (L30):** their capability files were **not individually read this run**; their axes
  were assessed as absent from an increment that changes only comment lines and two `ignores` entries in
  a lint config (no runtime, no code path, no data, no schema, no network, no user-facing surface, no
  error path). That is a **judgment about applicability, not an executed procedure** — recorded this way
  because a partial application presented as a complete one is the exact shape L30 names.

## Summary

The plan is unusually well-evidenced for a LOW-severity config change, and its central contribution —
the structural-impossibility argument against the floor check — survived interrogation intact and is
**strengthened** by finding G1 rather than weakened: the same fact that makes the checker unwritable
(all three `.pharn/` paths equally absent) is the fact the plan's determinism audit forgets one section
later. Two findings are worth acting on before the build: the verification is insensitive to its own
change (P1), and the retained comment's constraint is stated only positively (P7). Neither blocks.

## Verdict

**ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 3 important, 2 minor) — for the human to
weigh before `/pharn-dev-build`.** This tally covers the **interrogation only**. The Step 1b
lessons-declaration verdict (GREEN, exit 0) is its own floor result, reported in the header, and is
deliberately not folded into these counts — a deterministic stop and a model-authored concern do not
share a tally. Nothing here is a gate: `/pharn-dev-build`'s floor-gates (spec-hash drift, unresolved open
questions) and `pharn/floor/validate.mjs` remain the deterministic backstops.
