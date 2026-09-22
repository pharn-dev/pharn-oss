# PLAN — ship-outcome-evidence-applicability

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L6, L29, L35, L36, L42, L43]
- increment: Make `/pharn-ship`'s derived `outcome` (and `RUN-REPORT.md`'s verdict section) use only verdict evidence that applies to the CURRENT run, and select the outcome source by the emitting command instead of by whether a `LOOP.md` happens to exist.
- layer(s): product floor (`pharn/floor/`), pharn-contracts (`cost-ledger.md`), product command (`.claude/commands/pharn-ship.md`)
- constitution_refs: [P0, P2, P5, P6, P7]

## Phase 1 — reachability (read live at `9d866ed`, 6.9.0)

**What the code does.** `readShipOutcome(featureDir, markers)` reads `verify-report.json` and
`regression-report.json` from the feature directory. `deriveShipOutcome` returns `gate2` iff markers
exist ∧ verify `PASS` ∧ regress `no-regressions`. Nothing binds either report to the run that is being
reported. The emitter selects the source by artifact **existence**:
`readOutcome(LOOP.md) ?? readShipOutcome(...)` (`render-cost-ledger.mjs:507`).

**What lifecycle SUPPORTS reuse of a feature directory (command prose, i.e. instructions):**

- `/pharn-spec` Step 1.1: "does a `SPEC.md` already exist (**resume / revise**) or is this new?" A second
  `/pharn-ship` invocation on an existing `<name>` is therefore supported. It writes a NEW `run-start`,
  because each invocation runs Step 1 and markers append with a continuing `seq`. The previous run's
  `verify-report.json` / `regression-report.json` stay on disk until **this** run's `/pharn-regress` /
  `/pharn-verify` overwrite them, and nothing deletes them. **Stated as instruction-only:** no code
  invalidates them.
- A `/pharn-loop` feature directory (it holds `LOOP.md`) can be resumed by `/pharn-ship` through the same
  `/pharn-spec` resume path.
- The Step 2b retry re-runs `/pharn-regress` + `/pharn-verify` at iteration 2. The ship prose already says
  to STOP on a "missing-or-stale post-retry verdict". That STOP is instruction-only, and no code tells a
  stale report from a fresh one.

**Smallest supported reproductions (to be committed as tests, and run against the pre-fix module in BUILD):**

- **R1 — new invocation, early STOP.**
  - Run 1 markers: `run-start … stage-start pharn-verify(1) … run-stop`. Its reports read `PASS` /
    `no-regressions`.
  - Run 2 (the same `<name>`, resumed through `/pharn-spec`): `run-start`, `stage-start pharn-plan`,
    `stage-start pharn-grill`, then STOP (for example a RED lessons declaration), then `run-stop`.
  - Pre-fix `readShipOutcome` → **`gate2`**. The run stopped at grill, so this is old evidence reported
    as current.
- **R2 — source selection.** A feature directory holding a loop's `LOOP.md` (`decision: STOP_CAP`) plus a
  current `/pharn-ship` run with fresh green reports. Pre-fix `cost.json` → `outcome: {decision:
STOP_CAP, source: LOOP.md}` with `command: /pharn-ship`. The old loop decision overrides the current
  ship run.

**Not an execution-gate bypass.** `/pharn-ship`'s own proceed/stop reads the reports at the moment each
stage returns (instructions). The defect is in the **reported** `outcome` and in `RUN-REPORT.md`'s
verdict section.

## Design (Phase 2)

### D1 — applicability from the EXISTING run identity (markers + `run-window-core`), no new identity

- `run-window-core.mjs` gains `currentRunMarkers(markers)`, the markers from the latest `run-start`. The
  "current run" rule then keeps one definition (L35). `runWindow` is refactored to use it, with unchanged
  behaviour.
- `ship-outcome-core.mjs` gains `verdictApplicability(markers)` → `{status: "current" | "not-in-run" |
"unknown", reason}`:
  - `unknown` when `runWindow(markers, null).status === "unknown"`. That covers no `run-start`, a
    malformed timestamp, and a marker after a stop, which are the existing closed reasons.
  - `current` iff the current run carries a `stage-start pharn-regress` **and** a `stage-start pharn-verify`
    at the run's **latest** recorded iteration. A null iteration counts as the same attempt when the run
    has no iterations. This makes an iteration-1 pair inapplicable once iteration 2 has started.
  - `not-in-run` otherwise.
- `deriveShipOutcome`:
  - no markers → `null`. This is unchanged.
  - applicability `unknown` → **`undetermined`**, a new vocabulary member. It means the evidence could not
    be bound to this run. It is neither a failed check nor a stop stage.
  - applicability `current` ∧ PASS ∧ no-regressions → `gate2`.
  - otherwise → `stop:<last stage-start of the CURRENT run>`, or `stop:unknown`.
  - `iterations` is computed from current-run markers.
- `SHIP_DECISION_FORMS` gains `undetermined`, and `SHIP_DECISION_RE` closure is updated (L36).

### D2 — source selected by the emitting command, not by artifact existence

`renderLedger`:

- `command === "/pharn-ship"` → derived only. `LOOP.md` is never read.
- Any other command keeps today's precedence, `LOOP.md ?? derived`, so `/pharn-loop`'s semantics are
  unchanged.

### D3 — `RUN-REPORT.md` labels the verdicts with the SAME applicability

- For a `/pharn-ship` ledger, `verdictsSection` calls `verdictApplicability(cost.markers)`. On
  `not-in-run` / `unknown` it prints **"NOT from this run — excluded from the outcome"** (or **"cannot be
  bound to this run"**) before the verdicts, and they stay visible as labelled diagnostics.
- The `## Outcome` preamble lists the `undetermined` form.
- `/pharn-loop` reports are unchanged. The loop writes a new slug per invocation, and its decision is
  re-derivable (`check-loop-decision.mjs`).

### D4 — compatibility

- No `cost.json` key or schema change: `outcome.decision` is already a bounded token (checker rule 7).
  `undetermined` is simply a new member of ship's documented vocabulary.
- Historical `cost.json` files are not re-derived, and their stored `outcome` stands.
- A re-rendered `RUN-REPORT.md` computes applicability from the ledger's own recorded `markers[]`.
- No change to execution gates, retry count, PASS / no-regressions meaning, attestation or token
  accounting.
- SKILLS_VERSION 6.9.0 → **6.9.1** (patch: a correction to shipped derivation bytes). `MIN_CLI` is
  untouched.

## Applied lessons

- L6 — applicability is read from the structured markers (kind / stage / iteration / seq) and from report
  `.verdict` enums, never from `SHIP.md` prose or report free text.
- L29 — the applicability states and the decision forms are each enumerated once. The tests iterate every
  member (current / not-in-run / unknown × green / not-green).
- L35 — "the current run" keeps ONE definition, in `run-window-core.mjs`, reused by both membership and
  applicability.
- L36 — `undetermined` joins `SHIP_DECISION_FORMS`, and the closure regex is updated in the same diff, so
  a variant spelling fails.
- L42 — the derivation is re-run later over the files on disk NOW. A report can only be judged by evidence
  recorded at the time (the markers). The file's existence today is never used, and mtime is never used.
- L43 — the green verdict files agreeing with each other is not evidence that they belong to this run.
  Applicability binds them to the run's own recorded stage starts (the referent), not to each other.

## Files

- `pharn/floor/run-window-core.mjs` — export `currentRunMarkers`; `runWindow` uses it (no behaviour change) — layer product floor
- `pharn/floor/run-window-core.test.mjs` — `currentRunMarkers` edges — test
- `pharn/floor/ship-outcome-core.mjs` — `verdictApplicability`, `undetermined` form, current-run-scoped stop stage + iterations — layer product floor
- `pharn/floor/ship-outcome-core.test.mjs` — stale run, applicable, mixed, retry (iteration 2 started), resume, missing/malformed reports, unknown window, vocabulary closure — test
- `pharn/floor/render-cost-ledger.mjs` — command-based outcome source selection — layer product floor
- `pharn/floor/render-cost-ledger.test.mjs` — old LOOP.md + current ship run; loop precedence unchanged — test
- `pharn/floor/render-run-report.mjs` — verdict applicability label; `undetermined` in the outcome preamble — layer product floor
- `pharn/floor/render-run-report.test.mjs` — labels for current / not-in-run / unknown; CLI emit → check → render integration for applicable and inapplicable evidence — test
- `pharn/pharn-contracts/cost-ledger.md` — outcome table: `undetermined`, the applicability rule and its strength, the command-based source rule — layer pharn-contracts
- `.claude/commands/pharn-ship.md` — Step 3a's description of the derived outcome states the applicability rule — product command
- `CLAUDE.md` — the ship-outcome paragraph's vocabulary line — meta-doc
- `CHANGELOG.md` — `[Unreleased]` entry — repo meta
- `SKILLS_VERSION` — 6.9.0 → 6.9.1 — repo meta
- `README.md` — badge (+ generated CURRENT-STATE if it moves) — repo meta

## Contracts satisfied

- `pharn-contracts/cost-ledger.md` — `outcome` keeps its closed shape. The derived form gains one
  vocabulary member and an applicability rule.

## Evals to write (P1)

No `role:` Capability is added. The floor tests are the specification, and every expectation is a literal
decision string:

1. R1 stale run → `stop:pharn-grill` (pre-fix `gate2`).
2. Fresh current-run green → `gate2`.
3. Mixed:
   - verify `stage-start` in the current run but regress only in a previous run → not `gate2`;
   - one report missing → not `gate2`.
4. Retry: iteration 2 build started but no iteration-2 verify/regress → the iteration-1 green pair is
   `not-in-run` → `stop:pharn-build`. Positive control: iteration-2 regress+verify started + green →
   `gate2`.
5. Resume after GATE 1 (no new `run-start`, stages later in the same run) → `gate2`. A new invocation
   (new `run-start`) → the old pair is inapplicable.
6. Missing/malformed:
   - a missing report file → `null` verdict → `stop:<stage>`;
   - malformed JSON → the same;
   - no `run-start` / a malformed ts → `undetermined`, never `stop:` and never `gate2`.
7. R2 source selection: a `/pharn-ship` ledger ignores `LOOP.md`; a `/pharn-loop` ledger still copies it.
8. Integration: CLI-emitted `cost.json` → `check-cost-ledger` GREEN → `RUN-REPORT.md` outcome and verdict
   sections agree on applicability (inapplicable → labelled, outcome not `gate2`).

## Guarantee audit (P0)

- "A `gate2` is reported only when both green reports' stages started in the current run's latest attempt"
  → **floor: enum/ordering over the recorded markers**. It is exact relative to the markers, which are
  **ADVISORY** (Bash-written command prose, L19).
- "A report that exists is the one that stage wrote in this attempt" → **NOT guaranteed, stated**. A retry
  sub-stage that starts (marker written) and then refuses before rewriting its report leaves the previous
  attempt's file, and markers cannot see that. This is named as a residual; it is not fixed by deleting
  reports, which would be an orchestration change outside this scope.
- "The outcome source is the emitting command's own" → **floor: enum** on `cost.command`.
- "The check actually ran honestly" / "the feature is correct" → **not claimed**.

## Trust audit (P2)

`markers.jsonl` is `.pharn/` state that Bash reaches. The grammar is re-tested at read time, as it is
today. Report `.verdict` is an enum. No free text is read into the decision.

## Open questions (HALT)

- None. The user delegated plan approval for this run.
