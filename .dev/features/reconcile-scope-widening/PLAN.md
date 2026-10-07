# PLAN — reconcile-scope-widening

- feature: reconcile-scope-widening
- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L1, L17, L27, L34, L42, L48, L64]
- increment: an amendment recorded from a PLAN (not a stage command) after the anchor can no longer authorize a path the anchored scope did not; such a path is an ESCAPE with the closed reason `plan-widened-after-anchor`.
- layer(s): product floor (`pharn/floor/`), pharn-contracts (`reconciliation-record.md`), product commands (`/pharn-build`, `/pharn-dev-build` remedy text)
- constitution_refs: [P0, P2, P5, P6, P7]

## The defect (P7 — reproduced by the audit, P2-I)

The plan is model-authored, so its `## Files` is the model's own claim. The audit reproduced the bypass:

1. Bash-edit `PLAN.md` to add `src/other.js`.
2. Re-run `set-writes-scope.cjs --from-plan`.
3. Call `reconcile-baseline.mjs --amend-scope`, as every later stage does.

`check-bash-reconcile` then reads `CLEAN`, because `authorizingScope()` takes the union of the snapshot and every
amendment. `check-regress scope` is clean too, since PLAN.md is exempt. Read live on main this run (6.53.0):
`recordedScopes = [scopeSnapshot, ...amendments]`, and the first match authorizes, with no regard to where the
amendment came from. lessons-learned L48 named this exact silent direction: "a genuine Bash escape to a path that a
later legitimate amendment happens to cover is absorbed into CLEAN".

## Approach

- **Which amendments are suspect.** An amendment whose `set_by` is **not** a stage command file
  (`.claude/commands/*.md`, the only `--from-frontmatter` origins) is a plan-origin re-derivation. This covers a
  re-plan, the loop close's "plan's scope, re-derived", and a Bash-written scope file with a plan-shaped origin.
  `set_by` is compared after `/` normalization and leading-`./` stripping.
- **What it may authorize.** A plan-origin amendment authorizes a path **only if the opening `scope_snapshot` also
  covers it**. A path that only a plan-origin amendment covers is an escape:
  `{ file, denied_by: "writes-scope (snapshot)", reason: "plan-widened-after-anchor", scope_set_by: <amendment set_by> }`.
  The reason values form a closed enum: `plan-widened-after-anchor`, or absent.
  - The brief said "strict superset with an equal `set_by`"; this rule is wider on purpose.
  - Equal `set_by` alone misses a plan copied to a new path before re-deriving.
  - Strict superset alone misses an "add one, drop one" re-plan.
  - Both are the same widening, so neither form is a gap left open.
- **Command-origin amendments are unchanged.** The memory-promote canon write (L42's F3) and each stage's own
  artifact still clear as today.
- **C1's `merged` class still runs afterwards.** A widened path whose bytes are upstream's merged bytes stays
  `merged`.
- **The finding names the reason and the remedy in one line**, reachable for this branch only (L27): "a path added
  to `## Files` after the build anchored is not authorized by the anchored plan; if the human approves the widened
  plan, accept this at the post-review gate, or re-plan before the build's Step 0".
- **Command text (L27, product surface).** `/pharn-build` Step 0 and `/pharn-dev-build` Step 0 currently say that
  a later block means "declare the path in the plan's `## Files` and re-run this setter". That remedy still clears
  the Write-tool hook, but it now produces a verify `reconcile` RED. Both commands gain one sentence saying so and
  naming the human decision at the post-review gate, so the advice is not silently half-true.

### Decision for GATE 1 — the workflow cost, and the options

Legitimate mid-build re-plans are common, and in this repo they are the sanctioned remedy for a write block. L48's
own case was one. C1 and C2 each widened `## Files` three times through the Edit tool and amended. Under rule A every
such run ends with a verify `reconcile` RED, and the reconciler cannot tell an Edit-tool PLAN edit from a Bash one.
That is the brief's own "legit re-plans then show up (they should)", but it re-opens L48's loud false RED.

- **A (the brief; recommended):** escape with reason `plan-widened-after-anchor`. In `/pharn-*ship` that RED stops
  the chain at verify, and the human decides at the stop. In `/pharn-loop` a reconcile red is `STOP_TERMINAL`.
  Honest, loud, and it closes the silent direction.
- **B:** report-only. Widened paths go into a new `widened[]` list with a warning, and the verdict stays CLEAN.
  Visible, never blocking, but a Bash self-widening still passes the gate.
- **C:** A for paths the Write tool could not have reached anyway (none distinguishable today), otherwise B. Not
  implementable without attribution; listed only to rule it out.

The plan assumes **A** unless the reviewer chooses otherwise.

## GATE 1

Option A was approved together with the wider rule. This is a **delegated model decision by the orchestrator, not
a human approval**. Its reason: in `/pharn-loop` nobody reads a warning, so a stop for a human is the honest
direction, and a false RED is preferred over a false GREEN. Three additions came with the approval:

1. The remedy line also names the cheap path: declare every path in `## Files` BEFORE build Step 0. That is the only
   widening that stays CLEAN.
2. The contract states that routine mid-build re-plans now go red at verify, and that `/pharn-loop` reaches
   `STOP_TERMINAL` on it.
   - Checked at build: `check-loop.mjs`'s closed `TERMINAL_CAUSES` (`unmeasured`, `ac-evidence`, `reconcile`) names
     the CAUSE only. No closed list carries reconcile REASONS, so no new code is pinned there.
   - The reason reaches the human only through the reconcile output itself, which `VERIFY.md` and `RUN-REPORT.md`
     do not render. The contract says so, and names the command to re-run.
   - Surfacing the reason in those reports is a named follow-up, not this increment.
3. The version is 6.54.0, kept above 6.53.1 (#334) at merge time.

## Applied lessons

- L1 — every surface that restates how amendments authorize is in `## Files`:
  - the contract's `scope_amendments` section;
  - the checker header;
  - the floor-checks guide;
  - the two build commands' block-remedy line;
  - CHANGELOG and SKILLS_VERSION.
- L17 — the rule targets a written-by-the-build question (did the build's own plan grow?), not a changed-since-base
  one. Command-origin amendments stay authorized.
- L27 — the remedy line is attached to this reason only, and the build commands' existing remedy gets the
  consequence named. A test asserts the remedy is present on a widened-path finding and absent from other escapes.
- L34 — non-vacuity:
  - a promote canon write via a command-origin amendment is still CLEAN;
  - an amendment equal to the snapshot is still CLEAN;
  - a widened path that is also in the snapshot is CLEAN;
  - the existing F3 tests stay green.
- L42 — the opening snapshot stays the authority for what the build's plan allowed. Amendments remain the record of
  what later stages were allowed. This does not replay the live scope.
- L48 — this closes L48's silent direction, a Bash escape absorbed by a later plan-origin amendment. It deliberately
  accepts L48's loud direction for legit re-plans (option A), and says so in the contract.
- L64 — each restatement of "an amendment makes a write accounted for" is updated: contract §1, the header,
  CHANGELOG, the guide.

## Files

- `pharn/floor/check-bash-reconcile.mjs` — **EDIT.** plan-origin amendments authorize only what the snapshot covers;
  the closed `reason`; the one-line remedy; header text.
- `pharn/floor/check-bash-reconcile.test.mjs` — **EDIT.** the widening fixture and the non-vacuity cases.
- `pharn/pharn-contracts/reconciliation-record.md` — **EDIT.** §1 `scope_amendments` and §2 `escapes[]` (`reason`
  enum).
- `.dev/guides/floor-checks.md` — **EDIT.** the reconcile section.
- `.claude/commands/pharn-build.md` — **EDIT.** Step 0's block-remedy line names the verify consequence.
- `.claude/commands/pharn-dev-build.md` — **EDIT.** the same line, dev twin.
- `CLAUDE.md` — **EDIT.** (added at build, L27/L64) the "When a write is blocked" remedy names the verify consequence
  for a plan-sourced scope.
- `.dev/guides/writes-scope.md` — **EDIT.** (added at build) the same restatement in the writes-scope guide.
- `CHANGELOG.md` — **EDIT.** the 6.54.0 entry.
- `SKILLS_VERSION` — **EDIT.** 6.53.0 → 6.54.0 (minor: verdict semantics change).
- `README.md` — **EDIT.** version badge.

## Evals to write (P1) — `node --test`

- ★ the audit's widening fixture:
  - anchor with scope [keep.md];
  - Bash-edit PLAN.md to add `src/other.js`;
  - setter, then `--amend-scope`;
  - write `src/other.js`.

  Expected: ESCAPE with `reason: plan-widened-after-anchor`. This fails today (CLEAN).

- ★ the same, with the plan copied to a new path before re-deriving → ESCAPE.
- ★ add one path, drop one → ESCAPE.
- non-vacuity:
  - a command-origin amendment (promote) clearing a canon write → CLEAN;
  - an amendment equal to the snapshot → CLEAN;
  - a path in both snapshot and amendment → CLEAN.
- ✧ the remedy appears only on `plan-widened-after-anchor` findings.
- ✧ the two build commands state the consequence (string membership, the command-hygiene precedent).

## Guarantee audit (P0)

- "a path added to the plan after the anchor is reported" → floor: set membership over recorded scopes plus string
  equality on `set_by` (primitive #3). Bounded:
  - it holds only while the opening snapshot is honest. The baseline is still Bash-writable, so a writer who also
    rewrites `scope_snapshot` defeats it (the non-adversarial claim, unchanged);
  - a Bash-written scope record claiming a command `set_by` is outside the claim.
- "the reconciler knows the human approved the widening" → **struck**. No such signal exists; the human decides at
  the post-review gate.

## Trust audit (P2)

- `set_by` is untrusted data read from the baseline. It is compared, never executed. The `reason` is a closed enum;
  the remedy is free text in `problem`.

## Open questions (HALT)

None blocking; the A/B decision above has a stated default for the GATE-1 reviewer to confirm or override.
