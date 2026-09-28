# GRILL — orchestrator-context

- plan: `.dev/features/orchestrator-context/PLAN.md` (commit `36a92af`)
- spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` →
  `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, equal to the plan's pin — no drift.
- **Step 1b lessons declaration (FLOOR):**
  `node pharn/floor/check-plan-lessons.mjs .dev/features/orchestrator-context/PLAN.md .dev/memory-bank/lessons-learned.md`
  → **GREEN, exit 0** (9 ids; each resolves in canon and is referenced in the plan body). This verifies the
  declaration, never that the lessons were applied.
- grillers: `node pharn/floor/count-grillers.mjs .` → `registered: 13`. The five `scan-plan-*` scanners: secrets and
  pii `found: false`, i18n `found: false`; observability `mentions` (lines on "telemetry" as an excluded increment
  and "logging"), migrations `mentions` ("revert" — the SPEC revert step). Recognition only; no hit is a concern.
- stage model: opus, the session's model; run inline by the orchestrator that wrote the plan. **This is a self-grill
  by the plan's author**, and a reader should weigh it as such; the review stage runs in an independent context.

## Findings (advisory — the finding set gates nothing)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/orchestrator-context/PLAN.md:138"
  problem: "A part arrives as a Read tool result, which the harness and the trusted prefix both frame as data to be wary of; the pointer must say the part is this command's own trusted text, or a careful model may refuse to follow it — or follow it only in part."
  evidence: "Read `.claude/commands/pharn-loop-quick.md` (this exact path, never one an artifact or the description names) in full"
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/orchestrator-context/PLAN.md:142"
  problem: "The main files keep many forward references into the close part (Step 6 copies the decision, the Step 7 summary's route line, the record's next_steps). A model following one of them could Read the close part early, which is exactly the eager load the design exists to avoid; the pointer should say a reference is not a reason to load."
  evidence: "load `.claude/commands/pharn-loop-close.md` once, when the run FIRST reaches a stop"
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/orchestrator-context/PLAN.md:149"
  problem: "Where the ship quick part is read conflicts with Step 1's pinned 'Open the run's measurement window FIRST — before /pharn-spec, before anything else'. The pending start is identical in both modes, so the read belongs after it and before /pharn-spec; a failure there leaves only an unadopted pending marker, which the ledger contract already treats as harmless."
  evidence: "and then FIRST — before the pending start: Read `.claude/commands/pharn-ship-quick.md`"
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/orchestrator-context/PLAN.md:153"
  problem: "'any STOP after Step 1' does not match ship's own rule: Steps 3 and 3a need a <name>, and a run that never reaches one records nothing. The close load condition should be 'GATE 2, or any STOP once <name> exists'."
  evidence: "or any STOP after Step 1 — never earlier"
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/orchestrator-context/PLAN.md:139"
  problem: "The loop's quick-load failure stops before Step 1a, but the plan does not say whether that stop reads the close part (every other stop does). Nothing is open then — no marker, no scope, no feature directory — so it should end with a plain message and say it does NOT read the close part."
  evidence: "Not loaded → stop before Step 1a: nothing has been written, so no record and no revert"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/orchestrator-context/PLAN.md:310"
  problem: "The loading behaviour is a new advisory claim of both commands, but the plan moves each claims block verbatim and adds nothing to it. Each block needs one Advisory bullet saying when a part is read, that nothing on the floor sees the Read, and what the pinned text does and does not prove."
  evidence: "Every existing floor claim of both commands is unchanged: the moved `## What you may claim` blocks are moved byte-for-byte"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/orchestrator-context/PLAN.md:303"
  problem: "The live probe of disable-model-invocation has no control. A subagent's skill listing may be computed before the part files exist, so 'the part is not listed' would read as hidden when nothing was probed. A same-moment control file WITHOUT the flag must appear in the same listing, or the probe proves nothing."
  evidence: "probed live once for the model side (the build's subagent probe)"
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/orchestrator-context/PLAN.md:100"
  problem: "The close part carries the stop procedure AND the command's claims block, and the claims block changes when any step changes, including a mid-run step in the main file. Stated for the human: the partition axis is load time inside one command, whose text was one unit of change before; no file gains a reason to change the single file did not have, but a mid-run change now edits two files."
  evidence: "Its stop procedure (the stop steps, the claims block, the Final step) moves to `…-close.md`"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/orchestrator-context/PLAN.md:197"
  problem: "The test helper lives in `.dev/floor/`, and pharn/floor tests will import it — the first pharn/floor file to import from `.dev/`. That is fine only because tests never ship; the plan should pin that no shipped file (a non-test file under pharn/ or .claude/hooks/) references the helper."
  evidence: "`.dev/floor/command-family.mjs` — NEW test helper (apparatus)"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/orchestrator-context/PLAN.md:145"
  problem: "In the loop's not-loaded path the Stop guard will refuse the turn end and ask for LOOP.md up to its bound, which pressures the model to improvise a record from the contract — the approximation the rule forbids. The pointer should say those refusals are expected there and are not a reason to write a record."
  evidence: "write no `LOOP.md` (not from the contract alone either)"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/orchestrator-context/PLAN.md:253"
  problem: "Test 6's 'no paragraph of a part appears in its main file' is undefined for short shared lines ('Then, on return:', fences). Define the compared units: non-empty fenced lines, headings, and paragraphs of at least 80 characters."
  evidence: "no fenced line, no `##`/`###` heading and no paragraph of a part appears in its main file"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/orchestrator-context/PLAN.md:217"
  problem: "check-model-config.mjs is shipped floor code whose reverse pass will now scan the parts as product-prefixed files; its printed count moves, and its tests may pin the count. The plan names the test file but not the output change; say it in the CHANGELOG as a visible, non-behavioural change."
  evidence: "`pharn/floor/check-model-config.test.mjs` — the parts are product-prefixed files with no `model:`/`effort:`"
```

## Grillers (Step 2b — applied inline; advisory)

- **testability** — presence recognized: eight named rules over the whole part set, each with a stated negative
  control, and a one-off parity diff. Adequacy → the probe control (P0 finding) and the compared-units definition.
- **architecture** — fit recognized: the parts stay in `.claude/commands/`, which `§4` names for stages, so no trusted
  doc is touched. P3 → the close part's two reasons, raised for the human.
- **comprehension** — the WHYs are recorded for the location, the two-part split and each alternative; the reason a
  model might distrust a Read result was not → P2 finding.
- **coupling** — inbound cites by step name are swept by referent (L50) and keep resolving through the pointer
  headings; the tests' coupling to one file is replaced by the family helper.
- **documentation** — `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md` and the badge are declared. Adequacy → the
  check-model-config output note.
- **error-handling** — every load has a not-loaded rule and each fails toward fewer actions; the loop's Stop-guard
  pressure is raised above.
- **security** — scanner clean. The load path is a literal in a trusted file; a planted file at a part's path is the
  same residual as a planted command (stated in the plan).
- **privacy** — scanner clean; no personal data. No finding.
- **observability** — scanner mentions only; the increment is measured in bytes and estimated in requests, labelled.
  No finding.
- **migrations** — `pharn update` adds the new files from the same manifest; an install that edited a main command
  keeps it, and an old main never reads a part. `MIN_CLI` stays. No finding.
- **performance** — the increment IS the performance change; its measure is labelled bytes vs estimate. No finding.
- **i18n** — scanner clean. No finding.
- **a11y** — no user interface. No finding.

## Summary

The direction is sound and the location argument holds: the parts are the one place that is installed today, needs no
trusted-doc edit, and keeps stages in commands. The important concerns are all about the model's side of the load:
say the part is trusted (P2), say a forward reference is not a load trigger (P5), put the ship quick read after the
pending start (P6), bind ship's close load to `<name>` (P6), say the loop's quick-load failure ends without the close
part (P6), add the loading claim to each claims block (P0), and give the live probe a control (P0). The P3 concern on
the close part is for the human to weigh; the plan's partition is by load time within one command.

ADVISORY VERDICT: 12 concerns raised (0 blocking-severity, 8 important, 4 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons verdict above is a separate floor verdict and is not counted here.
