# GRILL — loop-quick-mode

- plan: `.dev/features/loop-quick-mode/PLAN.md` as committed at `faaf32e` (GATE-1 amendments), grilled at `62b108b`,
  whose tree is byte-identical to `faaf32e`'s; amended in place by this stage. Every `file:` line below cites the
  AMENDED plan committed with this log, and every `evidence:` quotes the text as it was grilled.
- spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` →
  `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` = the plan's `spec_content_hash` — no drift. A
  content-hash (floor-grade), surfaced here only: `/pharn-dev-build` is where drift blocks.
- lessons (Step 1b, FLOOR — the stage's one deterministic stop):
  `node pharn/floor/check-plan-lessons.mjs .dev/features/loop-quick-mode/PLAN.md .dev/memory-bank/lessons-learned.md`
  → **GREEN, exit 0** on the grilled plan (47 ids; each resolves in canon and is referenced in the plan body). Re-run
  on the amended plan: **GREEN, exit 0** (47 ids — the fold cites no new lesson). This verifies the declaration, never
  that the lessons were applied (P0).
- GATE 1: APPROVED 2026-09-26 — **a model decision by the orchestrator under the maintainer's 2026-09-25
  delegation, not a human approval.** Q1 resolved (a); D1–D15 accepted as written. Recorded in the plan's header.
- stage model: grill — opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed.
- the run: Step 0 and Step 1b ran, then the API's weekly limit stopped the stage. It resumed after
  `git merge --ff-only loop-quick-mode` (to `62b108b`) and re-ran Step 1b, with the same result. To fold the
  findings, the grill's single-file scope was released (`--clear`), the plan was edited under the dev checkout's
  fail-closed default (`.dev/features/**` is in it), and Step 0's setter was re-run before this log was written. No
  write went through Bash.
- grillers: `node pharn/floor/count-grillers.mjs .` → 13 registered; each applied inline (below). Scanners over the
  grilled plan: `scan-plan-secrets` `{"found":false}`, `scan-plan-pii` `{"found":false}`, `scan-plan-i18n`
  `{"found":false}`, `scan-plan-observability` and `scan-plan-migrations` vocabulary-only mentions (below).

## Findings (advisory — each rests on this stage's judgment; none is a floor-gate)

### Guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-quick-mode/PLAN.md:153"
  problem: "The record's mode field had no stated source, and D8's MODE_MISMATCH RED exists only if mode records the invocation; copied from check-loop.mjs's JSON — the natural parallel to decision's capture rule — the agreement compares a value with its own source and can never fire, and Step 6b's repair loop invites writing mode: quick to clear check-loop-record's RED."
  evidence: "a quick run writes `mode: quick` on every record, blocked ones included; a full run may omit it ... and `check-loop-decision.mjs` REDs the record's full mode against the re-derived quick one."
```

- **G1 — FIXED.** One meaning for every record class: `mode` records the run's invocation (`quick` iff `--quick` was
  read as the first argument token), never a copy of the checker's JSON. Step 6b gains that capture bullet beside
  `decision`'s (`pharn-loop.md:539`), and its ≤1 repair gains one exclusion (`:572`): a decision↔mode RED is never
  repaired by editing `mode`. D8's paragraph now names what its RED rests on and the laundering path it closes (a
  "repair" to `mode: quick` would have left only Step 6c's advisory reading between a full run over a quick SPEC and a
  commit over a regression report the quick table never read). A hygiene rule pins both sentences, and a ★ test runs
  D8's own record (`STOP_GREEN_QUICK`, no `mode`, over a quick SPEC) through both checkers. It completes D5 and D8 as
  accepted; no decision changed.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-quick-mode/PLAN.md:26"
  problem: "The quick scope check was claimed to have exactly the full partition's false-positive profile, but the pinned git listing runs without -z, so a path git C-quotes reaches --changed quoted and reads as escaped where the script's partition, which reads -z, does not."
  evidence: "so its false-positive profile is exactly the full loop's regress partition's."
```

- **G2 — FIXED.** "Exactly" is struck. The L17 line and `## Quick mode` item 5 state the divergence (a non-ASCII byte,
  a quote, a backslash or a control character in a name → a false S9, never a false pass) and the comma case both
  modes stop on (quick: split and escaped; the script: `unrepresentable-path`, `unusable`). The pinned lines stay as
  they are, for parity with `/pharn-ship --quick`'s prose; `quick-scope-inputs-by-code` would read `-z` and close it
  for both.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-quick-mode/PLAN.md:155"
  problem: "check-loop-decision.mjs's GREEN and DECISION_MISMATCH lines say the re-run was against both reports, which for a quick record names a regression report that does not exist and was never read; the plan re-derives the header but not these output lines."
  evidence: "after the live re-run, the re-derived `mode` (absent in the JSON → `full`) must equal the record's, else RED `MODE_MISMATCH`, reported beside any decision mismatch."
```

- **G3 — FIXED.** Design §4 and the `## Files` entry: the output lines name the re-derived mode and, in quick mode,
  cite `verify-report.json` alone. A ★ test pins that a quick GREEN line contains no `regression-report.json` and that
  the full one still names both.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-quick-mode/PLAN.md:515"
  problem: "The claim quantified over every ledger, but the ledger is emitted at every stop and gates nothing, so a working-tree cost.json copies a mis-stated record decision even while check-loop-decision.mjs is RED; only a committed ledger is bound, through the commit's GREEN decision check."
  evidence: '**"The ledger never claims a regress check for a quick green"** → **FLOOR relative to the record**: the copied decision is `STOP_GREEN_QUICK`, re-derivable; no marker is involved.'
```

- **G4 — FIXED.** Narrowed to "a COMMITTED ledger never claims a regress check for a quick green", with the chain
  labelled link by link (the copy FLOOR, the re-derivation verdict FLOOR, the gating ADVISORY) and the working-tree
  bound stated. The same bound holds for a full run today; this plan inherits it and now says so.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-quick-mode/PLAN.md:115"
  problem: "D3's benefit (a full run still decides exactly as today when the mode reader cannot load) holds for check-loop.mjs and its re-derivation, not for a /pharn-loop run, which meets check-loop-fresh.mjs first, and that checker loads the same module statically and stops every loop at S11."
  evidence: "So the quick machinery can fail only toward full: a full run still decides exactly as today, and a quick run then finds no regression report and stops INCONCLUSIVE."
```

- **G8 — FIXED.** Design §2 states where the benefit holds and names the loop-level behaviour: `checker-crashed` →
  INCONCLUSIVE → S11 in both modes, before any stop is read. Fail-closed; D3 unchanged.

### Trust propagation (P2) — with the security griller's Layer 2

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/loop-quick-mode/PLAN.md:522"
  problem: "The trust audit names the description as the only path to a quick SPEC in a run without --quick; the project template carrying spec_kind: quick is the same path, persistent, and spec-template.md's own bound names a human approval the unattended loop does not have."
  evidence: "The injection-shaped path — a description that asks for `spec_kind: quick` in a full run — is refused at Step 4a"
```

- **G5 — FIXED.** The trust audit gains the template path and its three stops (Step 4a's refusal, advisory;
  `check-spec-approved.mjs` → S9, floor; D8's uncommitted `STOP_GREEN_QUICK`). Design §6 and the `## Files` entry add
  the unattended case to `spec-template.md`'s "A template may carry the key" bound. `THREAT-MODEL.md`'s surface 9
  stays true and is not touched.

### Honest scope (P7) — with the documentation griller

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-quick-mode/PLAN.md:247"
  problem: "pharn-loop.md enumerates the judgment-triggered rows as a closed list twice (the Step 2 preamble and the determinism audit), and S6c's fit-check trigger joins that set, but neither line is among the named edits."
  evidence: "`:235` (after the S6b row) — the S6c row; `:238` S9's rule cell gains the quick scope check."
```

- **G6 — FIXED.** `:224` and `:971` join the named edits; S6c's kind-read trigger is a floor read, and the sentences
  say which.

### Eval / test coverage (P1) — with the testability griller's Layer 2

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-quick-mode/PLAN.md:90"
  problem: "## Quick mode sits before Steps 3–7, and pins outside the hygiene suite search the whole file for the first occurrence or the count of their literal; the plan names only the freshness-line count, so a skipped line quoted in the section would redden the render-run-report ordering pin or satisfy a presence pin with prose."
  evidence: "the freshness wiring (EXACTLY ONE decision-time line, ONE commit-gate line and ONE `check-loop.mjs` line in `pharn-loop.md`, so the quick section must not repeat them)"
```

- **G7 — FIXED.** Discovery lists the other whole-file pins (read this run: `render-run-report.test.mjs`'s ★ WIRING,
  `check-loop-fresh.test.mjs`'s line count, `check-test-stage.test.mjs`'s fenced line, `run-marker.test.mjs` and
  `require-loop-record.test.cjs`). The named-edits preamble forbids quoting another step's pinned literal inside the
  section, and `LOOP_QUICK_WIRING` gains a closure rule with its control (paste the render invocation → RED).

## Grillers (Step 2b — applied inline; advisory)

- **testability** — presence recognized: `## Evals and tests to write (P1)`, per member, each with its control.
  Adequacy → G1 and G3 (★ tests), G7 (a closure rule).
- **architecture** — fit recognized; no P3 finding:
  - one reader of the loop's mode, `loop-mode-core.mjs`, imported by both checkers that need it; the kind reading
    stays `spec-template-core.mjs`'s;
  - no new mechanism where one exists: the decision vocabulary, the record envelope and the stuck-point table are
    extended, not forked;
  - the dev generator imports 3.1's exported pure checks from `.dev/features/ship-quick-mode/handoff/make-patch.mjs`.
    A cross-record reference, deliberate (L35); read this run: the source guards its CLI with `import.meta.main`, so
    importing it runs nothing, and both records are frozen once merged.
- **comprehension** — the WHYs are recorded for D1–D15 (the token, the any-state read, the fail-toward-full import,
  no mode marker, the sub-row). The record's `mode` source was not → G1.
- **coupling** — the one shared input is the SPEC's kind line, read by two modules through one reader; the ordering
  it depends on (Step 6a's revert before the re-derivation) is declared (D2). The invocation, the record and the
  SPEC's kind are three places the mode lives, and the plan did not say which one the record copies → G1.
- **documentation** — declaration present: three contracts, four commands, `CLAUDE.md`, both READMEs, the CHANGELOG
  and the LIMITS patch. Adequacy → G5 (a contract bound), G6 (two closed enumerations).
- **error-handling** — declaration present: the fail-toward-full import, every new row's trigger and remedy (S6c, the
  scope check's non-zero exits, a quick RERUN of regress), the generator's all-or-nothing refusals, `apply.sh`'s
  restore. Adequacy → G8 (the fallback's reach).
- **security** — scanner clean. Layer 2 → G5. The first-token rule and D10's refusal are labelled advisory, each with
  its floor backstop.
- **privacy** — scanner clean; no personal data is read or written. No finding.
- **observability** — the hits (lines 81, 90, 137, 198, 211 and 475 of the grilled plan) are vocabulary: gate "logs"
  and "observable only end-to-end". The run's telemetry is `cost.json`, which quick mode keeps, and `LOOP.md` carries
  the mode; that a non-green quick stop's ledger carries no mode is stated in Design §8. No finding.
- **migrations** — the hits are vocabulary: "revert" is Step 6a's SPEC revert, "rollback" the version section. The
  record-format change (an optional `mode`, a new token) is backward-readable (absent `mode` = full), and the
  directions that do not read back are declared (§11). No finding.
- **performance** — no hot path: `check-loop.mjs` reads one more small file, and a quick freshness run spawns one
  checker fewer. The increment is a cost reduction, counted structurally. No finding.
- **i18n** — scanner clean; no user-facing interface strings. No finding.
- **a11y** — no user interface. No finding.

## Summary

The plan held up on its main design: the mode is the SPEC's pinned kind, read by one reader; the verify-only table
and its distinct green token; the freshness column; the S6c sub-row; the scope check kept; the LIMITS patch
sequenced. The findings cluster in two places.

- **The record's `mode`, and what the checks around it rest on.** The plan never said where the value comes from.
  Copied from the checker's own output, it would have made D8's floor RED unable to fire, and the record-repair loop
  would have invited exactly that copy (G1). One output line of the re-derivation cites evidence it never read (G3).
- **Claims a step wider than their floor.** The scope check's "exactly" (G2), the ledger's "never" (G4), D3's "a full
  run still decides exactly as today" (G8), a contract bound written for a gate the loop does not have (G5), two
  closed enumerations (G6), and whole-file pins a quoted line would trip (G7).

Every finding is folded into the plan in place, and its `## Amended after grill` indexes where. No decision for
GATE 1 changed, `## Files` still holds 32 paths, and no open question was added.

ADVISORY VERDICT: 8 concerns raised (0 blocking-severity, 8 advisory: 1 important, 7 minor), all folded into the
amended PLAN.md — for the human (here, the orchestrator under delegation) to weigh before /pharn-dev-build. The Step 1b
lessons verdict above is a separate floor result and is not counted here.
