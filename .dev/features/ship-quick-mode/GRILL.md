# GRILL — ship-quick-mode

- plan: `.dev/features/ship-quick-mode/PLAN.md` as committed at `4dedae8`; amended in place by this stage. Every
  `file:` line below cites the AMENDED plan committed with this log, and every `evidence:` quotes the text as it was
  grilled.
- spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` →
  `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f` = the plan's `spec_content_hash` — no drift. A
  content-hash (floor-grade), surfaced here only: `/pharn-dev-build` is where drift blocks.
- lessons (Step 1b, FLOOR — the stage's one deterministic stop):
  `node pharn/floor/check-plan-lessons.mjs .dev/features/ship-quick-mode/PLAN.md .dev/memory-bank/lessons-learned.md`
  → **GREEN, exit 0** on the grilled plan (32 ids; each resolves in canon and is referenced in the plan body).
  Re-run on the amended plan: **GREEN, exit 0** (34 ids — G12 declares L31 and L38). This verifies the declaration,
  never that the lessons were applied (P0).
- GATE 1: APPROVED 2026-09-26 — **a model decision by the orchestrator under the maintainer's 2026-09-25
  delegation, not a human approval.** Q1 resolved (a); the plan's decisions for GATE 1 accepted as written. Recorded
  in the plan's header and in Q1.
- stage model: grill — model routed via Agent subagent; effort not routed.
- grillers: `node pharn/floor/count-grillers.mjs .` → 13 registered; each applied inline (below). Scanners over the
  plan: `scan-plan-secrets` `{"found":false}`, `scan-plan-pii` `{"found":false}`, `scan-plan-i18n`
  `{"found":false}`, `scan-plan-observability` and `scan-plan-migrations` vocabulary-only mentions (below).

## The orchestrator's question — is verify green WITHOUT the patch?

**Yes, probed rather than read off.** The plan said "no test reads `LIMITS.md` or `ARCHITECTURE.md` prose", which was
the right conclusion for the wrong reason (G1). The readers of those two files' bytes, found by searching
`pharn/floor/`, `.dev/floor/`, the hooks and the tests:

| reader                                   | what it reads                                                                    | unpatched tree                 | the patch                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `pharn/floor/validate.mjs` CHECK 5       | every product `.md`; fires on a file holding both `rule_id:` and `problem:`      | GREEN (run at grill)           | adds neither token, removes no split word — the generator asserts it        |
| `.dev/floor/check-specified-markers.mjs` | the manifest's registered marker/citation strings in the trusted docs            | GREEN (25 annotations, exit 0) | leaves every registered string byte-identical — the generator asserts it    |
| `.dev/floor/hash-doc.test.mjs`           | `pharn/ARCHITECTURE.md`'s LF identity                                            | GREEN                          | LF-only text — the generator asserts no CR                                  |
| the dev spec-hash compare                | `sha256(pharn/ARCHITECTURE.md)` at `/pharn-dev-build` (refuses) and here (warns) | equal to the pin               | moves the pin — harmless at a GATE-2 apply, since no build or grill follows |

`LIMITS.md` holds neither CHECK-5 token. `apply.sh` re-runs the first three on the applied bytes and restores both
files on any failure. Nothing in the chain reads the prose the patch changes.

## Findings (advisory — each rests on this stage's judgment; none is a floor-gate)

### Guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/ship-quick-mode/PLAN.md:590"
  problem: "The sequencing decision rested on a quantified claim nobody probed; three gates and a dev check read these files, so the claim was false while its conclusion held."
  evidence: "**No designed STOP:** no test reads `LIMITS.md` or `ARCHITECTURE.md` prose, so the chain runs green with the patch pending."
```

- **G1 — FIXED.** Chain sequencing now names the readers (the table above), and the generator asserts the three
  gate predicates on the edited text in memory: the registered marker strings, the CHECK-5 split words and no CR.
  It never writes a trusted-doc copy to do it.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/ship-quick-mode/PLAN.md:377"
  problem: "The plan said the conditional §4 line adapts to whatever merged, but a differently named contract only makes the generator fail."
  evidence: "So the line matches whatever merged, under whatever name."
```

- **G9 — FIXED.** Reworded: the patch never carries a §4 line that disagrees with what merged. A differently named
  (or any other missing) contract fails the generator loudly, naming the stem, and the fix is one edit to its list.

### Trust propagation (P2) — with the security griller's Layer 2

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/ship-quick-mode/PLAN.md:237"
  problem: "Recognizing --quick anywhere in the arguments lets the untrusted description text switch a run into the mode that skips the regression check."
  evidence: "`--quick` is a token in the invocation (P5: membership), removed before the description is passed on."
```

- **G3 — FIXED.** `--quick` counts only as the first argument token for `/pharn-ship` and `/pharn-spec`, and
  everywhere else it is description text passed on as DATA. The Trust and Determinism audits say so, and a hygiene
  pin holds it.

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/ship-quick-mode/PLAN.md:402"
  problem: "A shell script the human runs with their own privileges was described step by step but not pinned, so neither this stage nor review could read what will run."
  evidence: "`apply.sh`, the precedent's shape: It refuses `main`. ... The setter from this PLAN, then `reconcile-baseline.mjs --anchor`, in that order (L38)."
```

- **G4 — FIXED.** `apply.sh` is pinned verbatim in §7. The build writes it byte-for-byte and substitutes only
  `EXPECT_STAGE_EXIT`.

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/ship-quick-mode/PLAN.md:177"
  problem: "The contract's 'a template may carry the key' bound covers test-infra only, yet a project template carrying spec_kind: quick would start every Draft as quick."
  evidence: "`pharn/pharn-contracts/spec-template.md` — EDIT. `spec_kind: quick`, rule 9, the sections decision, `--spec-kind`"
```

- **G8 — FIXED.** §1 extends the bound to `quick`, and states what stands between a template-supplied kind and a
  skipped regression check: the human's GATE-1 approval (now told the trade, G5) and the `--quick` token, both
  advisory.

### Determinism / failure paths (P5) — with the error-handling griller's Layer 2

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/ship-quick-mode/PLAN.md:404"
  problem: "apply.sh kept the precedent's reconcile checkpoint and re-anchor, but at a GATE-2 apply the checkpoint judges the applying checkout's own stale baseline and can abort a correct apply, while the re-anchor serves no later epoch."
  evidence: "Then `check-bash-reconcile.mjs --base .`, without `--require-baseline` ... The setter from this PLAN, then `reconcile-baseline.mjs --anchor`, in that order (L38)."
```

- **G2 — FIXED.** Both are dropped from `apply.sh` for the GATE-2 apply that Q1 chose. `APPLY.md` carries the
  out-of-order case: applied before a verify, run the setter, then the anchor, then resume at `/pharn-dev-verify`.

### Honest scope and comprehension (P7) — with the documentation, comprehension and migrations grillers

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/ship-quick-mode/PLAN.md:202"
  problem: "The human approves a quick SPEC at GATE 1 without being told what quick mode skips; the list first appears in SHIP.md at GATE 2, after the fact."
  evidence: "Step 3 writes `spec_kind: quick` in the frontmatter ... The Draft validation lists the `quick` RED kind with the others."
```

- **G5 — FIXED.** `/pharn-spec`'s Step 4 puts one fixed sentence before the approval question: approving a quick SPEC
  means no regression outside the feature is looked for and the plan is not interrogated. A hygiene pin holds it.

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/ship-quick-mode/PLAN.md:551"
  problem: "The referent sweep missed README's paper-trail list, which promises GRILL.md interrogation and REGRESSION.md for every increment."
  evidence: "`README.md` — EDIT. Badge 6.23.0, the ledger bullet, the `--quick` usage, the commands row, the token-cost bullet"
```

- **G6 — FIXED.** The Discovery sweep names the paper-trail list (`README.md:62-76`) and records that its first pass
  missed it (L50). The README entry in `## Files` says what quick mode changes there: a quick run's `GRILL.md` holds
  no interrogation, and it writes no `REGRESSION.md` and no `RUN-REPORT.md`, while `cost.json` is kept. (This
  stage's first wording of that entry said a quick run produces none of the four files. That was wrong, and it was
  corrected before this commit.)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/ship-quick-mode/PLAN.md:162"
  problem: "Two bounds (three criteria, no e2e) would ship as bare constants with no recorded reason for the next maintainer."
  evidence: '`QUICK_KIND = "quick"`, `QUICK_MAX_ACS = 3`, `QUICK_LEVELS = ["unit", "integration"]`, exported once (L35).'
```

- **G7 — FIXED.** §1 now records the reason, and the contract's rule-9 row and the constants' comment will carry it:
  the maintainer's decision, a change whose evidence is a few fast tests, and `e2e` being the slowest gate.

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/ship-quick-mode/PLAN.md:444"
  problem: "The compatibility argument covers old readers of new data but not a rollback, under which an approved quick SPEC stops validating."
  evidence: "Nothing invalidates an install. A SPEC without `quick` validates as before; every existing marker and ledger reads as before"
```

- **G11 — FIXED.** §8 states the one direction that does not read back, and the CHANGELOG will say it too.

### Eval / test coverage (P1) — with the testability griller's Layer 2

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/ship-quick-mode/PLAN.md:341"
  problem: "New load-bearing command text had no pin: the SHIP.md not-checked list, the GATE-1 trade sentence and the first-token rule; and the committed patch generator had no refusal ever seen firing."
  evidence: "`pharn-grill.md` pins its `--spec-kind` line and the skip literal. `pharn-spec.md` pins the literal `spec_kind: quick`."
```

- **G10 — FIXED.** §6 and the Evals list add a pin for each item, each with a control that drops it. The generator's
  checks become pure exported functions, and `BUILD.md` records one refusal of each (L60).

### The lessons declaration (advisory — beside the Step 1b floor result, never folded into it)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/ship-quick-mode/PLAN.md:4"
  problem: "The body applies L31 and L38 but the header does not declare them, so the declaration disagrees with the plan's own text and a review of the declared lessons never reaches those two; check-plan-lessons cannot see a referenced-but-undeclared id."
  evidence: '- applied_lessons: [..., L29, L33, ..., L37, L41, ...] vs "a stated non-obligation, L31''s question asked and answered" and "in that order (L38)"'
```

- **G12 — FIXED.** The header declares L31 and L38, and `## Applied lessons` gives each its line. Step 1b re-run on
  the amended plan: GREEN, exit 0, 34 ids.

## Grillers (Step 2b — applied inline; advisory)

- **testability** — presence recognized: `## Evals and tests to write (P1)`, per member. Adequacy → G10.
- **architecture** — fit recognized; no P3 finding:
  - `TEST_FIRST_KINDS` sits beside `specVerdict`, which that module already names as the one AC-mode reading;
  - the mode vocabulary lives with its writer, `mark-phase.mjs`;
  - no sibling reference, and no new mechanism where one exists (the `origin` precedent for a run-start key).
- **comprehension** — the plan records most WHYs (the token, the mode's location, the skipped Step 2d, the
  generator). The two bounds did not → G7.
- **coupling** — no entanglement finding. The one shared mutable state is the markers file, the existing mechanism,
  written by `mark-phase` and read by `ship-outcome-core`. The `SPEC_KINDS` ripple is enumerated in Discovery.
- **documentation** — declaration present: contracts, command sections, README, CLAUDE.md, floor README, CHANGELOG
  and the patch. Adequacy → G6.
- **error-handling** — declaration present: refusal exits, `--spec-kind` exit 1, the generator's all-or-nothing
  refusals, `apply.sh`'s restore. Adequacy → G2.
- **security** — scanner clean. Layer 2 → G3, G4, G8.
- **privacy** — scanner clean; no personal data. No finding.
- **observability** — the hits (lines 162, 181, 197 and 210 of the grilled plan) are vocabulary: "Success Metrics",
  "observable only end-to-end" and "grill-log" twice. The run's telemetry is `cost.json`, which quick mode keeps, and
  the mode is recorded in `markers[]`. No finding.
- **migrations** — the hit (line 179 of the grilled plan, "migrating it is the human's choice") is vocabulary. The
  format-compatibility argument is declared (Discovery: no ledger schema bump); the rollback direction was not →
  G11.
- **performance** — no hot path. The increment is a cost reduction, measured structurally and by ledger. No finding.
- **i18n** — scanner clean; no user-facing UI strings. No finding.
- **a11y** — no user interface. No finding.

## Summary

The plan held up on its main design: the kind, rule 9, the marker `mode`, `gate2-quick`, and the carve-outs that keep
the full-mode pins intact. The findings cluster in two places, plus one bookkeeping gap.

- **The human-only patch path.** The reason given for "verify is green without the patch" was not probed (G1).
  `apply.sh` carried two steps that could abort a correct GATE-2 apply (G2) and was not pinned (G4). The §4 line
  overclaimed its tolerance (G9).
- **The quick trade's honesty at its edges.** Untrusted description text could switch the mode (G3). The human
  approved the trade without being told it (G5). The sweep, the bounds' reasons, the template bound and the rollback
  direction had gaps (G6, G7, G8, G11), and new command text had no pins (G10).
- **The declaration** left out two lessons the body applies (G12).

Every finding is folded into the plan in place, and its `## Amended after grill` indexes where.

ADVISORY VERDICT: 12 concerns raised (0 blocking-severity, 12 advisory: 4 important, 8 minor), all folded into the
amended PLAN.md — for the human (here, the orchestrator under delegation) to weigh before /pharn-dev-build. The Step 1b
lessons verdict above is a separate floor result and is not counted here.
