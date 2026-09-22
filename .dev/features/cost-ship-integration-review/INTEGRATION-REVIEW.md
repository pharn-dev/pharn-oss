# INTEGRATION REVIEW — cost.json privacy, run-scoped accounting, ship outcome applicability

## Conclusion: **Non-blocking findings remain.**

All three updates are implemented and behave as their accepted designs state on every probed path, with
one exception. When the transcript is **unavailable** but the run window is known, the human-readable
`RUN-REPORT.md` tokens section presents an unmeasured run as a measured window: it shows "excluded
requests 0" and "nothing was recorded against a stage". The machine ledger itself is correct
(`coverage: unavailable`, and the checker is GREEN), so no downstream decision is affected: `cost.json`
gates nothing, and `RUN-REPORT.md` gates nothing. That is why this is non-blocking. It does, however,
contradict the stated purpose of #233 ("distinguish unknown run usage from an observed zero") at the
report layer, so it should be fixed before anyone relies on `RUN-REPORT.md` token figures from runs whose
transcript was unreachable. A second item (F2) is an unresolved, instruction-dependent risk. It is not a
confirmed defect.

## 1. Reviewed scope

| item                      | value                                                                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| branch / HEAD             | `review/cost-ship-integration` at `760c5de` (= `main`); working tree clean before the review                                                                                           |
| update A — privacy        | `81b5124` (#232, 6.8.2): 13 files                                                                                                                                                      |
| update B — run accounting | `9d866ed` (#233, 6.9.0): 26 files, including its own post-review fixes (opt-in `--adopt-pending`, a verify WARN on `unknown`, numeric `attribute()`)                                   |
| update C — applicability  | `760c5de` (#234, 6.9.1): 22 files, including its post-review fix (a label for a historical stored `gate2`)                                                                             |
| governing contract        | `pharn/pharn-contracts/cost-ledger.md` (`/2` object, "Run membership", "Compatibility with `/1`", the `outcome` table), plus the three `.dev/features/*/PLAN.md` / `REVIEW.md` records |
| uncommitted scope         | none; code references are pinned to `760c5de`                                                                                                                                          |
| update C's investigation  | it did produce a code change. Reachability was established through supported lifecycle (`/pharn-spec` resume of an existing `<name>`), not only through a pure-function probe          |

## 2. Findings (by severity)

### F1 — MEDIUM (confirmed): with an unavailable transcript, `RUN-REPORT.md` presents unknown usage as a measured, empty window

- **Triggering scenario (supported).** A `/pharn-ship` or `/pharn-loop` stop on a machine whose
  transcript lookup misses. This is the exact path #232 exists for: the note is honest, and the report
  is not. Markers are present, so `membership.status` is `bounded` or `open`.
- **Expected.** Per #233's accepted purpose ("distinguish unknown run usage from an observed zero"), the
  tokens section should say that usage is unavailable or unknown.
- **Observed** (probe I1b):
  - `## Tokens` renders "**Measured population: the RUN WINDOW** … A floor on this run's spend", then a
    fenced block with `excluded requests  0`, then `_n/a — cost.json carries no attributed rows — nothing
was recorded against a stage_`.
  - The only signal is one row in `## Outcome` (`ledger coverage  unavailable`).
  - `coverage_note`, which says why, is not shown anywhere.
- **Location.** `pharn/floor/render-run-report.mjs` (`760c5de`):
  - `measurementLabel()` branches only on `membership.status` and never reads `cost.coverage`.
  - `tokensSection()`'s empty-rows branch picks the "no attributed rows" wording whenever `coverage !==
"partial"`.
- **Why the emitter/checker pair did not catch it.** The ledger is correct. The defect is in the view,
  and the report's label tests cover `unknown` (window unknown) and the observed zero (`partial`), but
  not "window known, transcript unavailable".
- **Reproduction.** `node .dev/features/cost-ship-integration-review/integration-probe.mjs` → `FAIL I1b`.
  The fixture is markers `run-start`/`stage-start pharn-grill`/`run-stop`, an empty projects dir, and
  `--command /pharn-ship`.
- **Correction direction.** In `tokensSection`, test `cost.coverage === "unavailable"` before the window
  label. Render "**Run usage: UNAVAILABLE — not measured, not a zero**" and quote `coverage_note` as
  DATA. Add a report test for the known-window + unavailable combination.

### F2 — LOW / unresolved risk (instruction-dependent): a failed emission leaves the previous `cost.json`, which is then checked and rendered as the current run's

- **Scenario.** On a reused feature directory, the new run's `render-cost-ledger.mjs` exits non-zero.
  Probe I5 uses a mistyped flag (exit 2). An uncaught write error would also exit non-zero. The previous
  run's `cost.json` stays on disk. `check-cost-ledger.mjs` on the unchanged file is GREEN, and
  `render-run-report.mjs` renders it, including the **previous run's `gate2`**, as this run's report.
- **Controls.** No code binds `cost.json` to the current run. The command prose runs the checker and the
  renderer after the emitter but does not branch on the emitter's exit code. Prevention therefore rests
  entirely on the agent noticing the failure.
- **Why not "confirmed defect".** The trigger is an orchestration error (a bad invocation or an
  environment write failure), not a supported lifecycle producing wrong output by itself. What is
  confirmed is only that **nothing detects it**.
- **Correction direction (smallest).** Have the commands treat a non-zero emitter exit as "no ledger
  emitted this run" and skip the check and render. Alternatively, have `render-run-report.mjs` compare
  the ledger's latest `run-start` `seq` against the live `markers.jsonl` and label a mismatch as stale.

### Documented limitations (accurately described in the shipped docs)

- **The initial-request gap.** The request that issues a boundary call falls before the window. This is
  stated in the contract, `run-window-core.mjs`, and both commands.
- **The unwritten tail.** The emission's own turns and the post-`run-stop` work are out of the window.
- **Marker execution is advisory.** This covers skipped, stale or mistimed markers, and a stale pending
  start adopted after a skipped `--pending-start`. Adoption is opt-in and ship-only, so it cannot widen a
  `/pharn-loop` window (pinned by `mark-phase.test.mjs`; B6 probes the adoption itself).
- **Selected session only.** Probe I2 checks that the report says so beside the numbers. It does not
  imply multi-session aggregation.
- **The refused-stage residual (#234).** A stage that starts and then refuses leaves the old report,
  which is accepted. The contract, the module header, the ship command and `CLAUDE.md` state it, and a
  test pins it.
- **`pharn-cost-record/1`** in `ship-record.json` stays session-scoped. This is stated as attested
  content.

### Unimplemented requested work

None. All three updates are present, and each one's scoped exclusions (multi-session aggregation,
pricing, attestation changes) are documented as out of scope rather than implied.

## 3. Per-update and interaction table

| #   | probe                                                                                               | result                                                                          |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A1  | no-dir CLI write: exit 0, `unavailable`, path-free, checker GREEN                                   | PASS                                                                            |
| A2  | `--stdout` is a single valid JSON document                                                          | PASS                                                                            |
| A3  | an absolute path deliberately inserted into `coverage_note` is still RED (validation not weakened)  | PASS                                                                            |
| A4  | the new `unknown`-membership note (#233) is path-free and GREEN                                     | PASS                                                                            |
| B1  | 100 input before / 10 during → **10**, `excluded_requests` 1, checker GREEN                         | PASS                                                                            |
| B2  | an in-run unmarked request counts and is `unattributed`                                             | PASS                                                                            |
| B3  | a closed run plus later unrelated activity → still 10 on re-render                                  | PASS                                                                            |
| B4  | a re-render over identical bytes is byte-identical (no double count)                                | PASS                                                                            |
| B5  | `--verify-transcript` GREEN when faithful, RED on a dropped row the internal check accepts          | PASS                                                                            |
| B6  | spec boundary via the real `mark-phase` CLI: pending ts adopted, spec counted (20), issuer excluded | PASS                                                                            |
| B7  | resume in a new session: that session's pre-resume work is excluded, other session not collected    | PASS                                                                            |
| B8  | dedup (8 counted once) + subagent (4) in the window = **12**                                        | PASS                                                                            |
| C1  | new invocation + grill stop + old green reports → `stop:pharn-grill`, verdicts NOT FROM THIS RUN    | PASS                                                                            |
| C2  | a ship ledger ignores a stale `LOOP.md` (`gate2`); a loop ledger still copies it (`STOP_CAP`)       | PASS                                                                            |
| I1  | early stop + unavailable transcript + old greens → `stop:pharn-grill`, ledger GREEN                 | PASS                                                                            |
| I1b | …and `RUN-REPORT.md` says the usage is unavailable                                                  | **FAIL → F1**                                                                   |
| I2  | a resumed run spanning sessions: `gate2` from both sessions' markers, tokens from one, labelled     | PASS (different scopes, labelled — not misleading)                              |
| I3  | a new invocation reusing a directory holding old markers / `LOOP.md` / reports / `cost.json`        | PASS via C1 + C2; the old `cost.json` is overwritten on a successful emission   |
| I4  | re-render after unrelated activity                                                                  | PASS (B3)                                                                       |
| I5  | a failed emission while an older `cost.json` exists                                                 | old file checked GREEN and rendered as current → **F2** (instruction-dependent) |

Every result also names the run it describes, the request population, and the evidence status:

- The outcome names the run: `outcome` plus the Verdicts applicability label.
- The token figures name their population: the membership block, the selected session, and the window.
- Evidence status is shown as current (unlabelled), historical (`NOT FROM THIS RUN`) or uncertain
  (`CANNOT BE BOUND` / `undetermined`).
- The unavailable case is the one gap (F1).

## 4. Tests and checks actually run

- **Probe.** `node .dev/features/cost-ship-integration-review/integration-probe.mjs` → 18 probes, 1 FAIL
  (I1b, F1).
- **Focused suites.** `node --test` over `run-window-core`, `mark-phase`, `render-cost-ledger`,
  `check-cost-ledger`, `render-run-report`, `ship-outcome-core` and `render-cost-record` → **246/246**.
- **Full check.** `npm run check` at `760c5de` → exit 0, **2498/2498**. This is not attributed as
  evidence for or against F1/F2: the suite does not cover either path.
- **Skipped or not exercised:**
  - no live `/pharn-ship` or `/pharn-loop` agent run, so command-prose execution is unverified. The
    `command-hygiene` pins prove only presence and order.
  - the #232 empty-selection branch was not re-probed; the existing suite's `../decoy` staging covers it.
  - no permission-based failure injection. F2 used a bad-usage exit instead, by design.

## 5. Limits of this review

The probe's green results prove only its own fixtures. They do not show the updates are correct in
general, and they do not show that an agent executes the marker, emission or render steps the commands
prescribe. The shipped documentation describes every limitation above accurately. The one place where
documentation and behaviour diverge is F1, where the contract's promise is right and the report layer
does not keep it.
