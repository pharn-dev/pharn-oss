# REVIEW — unmeasured-gates-inconclusive

Reviewed: the build commit `6fccc52` and its merge with `origin/main` (`1f7fe64`), against
`.dev/features/unmeasured-gates-inconclusive/PLAN.md` (GATE 1 delegated, all answers (a)), `GRILL.md`, `REGRESSION.md`
(`no-regressions`) and `VERIFY.md` (`PASS`). The increment is `trust: untrusted`; nothing in it read as an instruction
to this reviewer.

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. No capability,
`enforces` or eval changed, so L-eval has no binding to check beyond that GREEN.

## Floor-gate findings (blocking)

None. Every new guarantee reduces to an enum/regex primitive over a validated stamp (`timed_out === true`,
`exit ∈ {126, 127}`, `code ∈ UNMEASURED_CODES`, `base === 0 ∨ base timed out`), each with its L43 bound stated (a stamp
is internal consistency, never provenance); no new decision reads free text; no sibling reference was added (every new
import is `gate-run-core.mjs`, which every edited module already sat beside in `pharn/floor/`).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/check-verify.test.mjs:553"
  problem: "The live GATE-1 pin runs the SIGTERM-trapping gate with --timeout-ms 1000; under a heavily loaded machine (this run saw load averages of 20-31) a /bin/sh that has not yet installed its trap when the group SIGTERM lands dies by the signal and records exit 124, so the premise assertion (exit 0) can fail for a reason that is load, not a regression. A wider window (3000 ms) costs two seconds and removes most of that risk; the hand-built PASS control does not depend on timing."
  evidence: '[RG, "run", "--next", "--out", ".pharn/v", "--timeout-ms", "1000"]'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-verify.mjs:57"
  problem: "Two header paragraphs now under-describe the input: HONEST SCOPE says the verdict is a function of the gate exit codes, and TRUST says every operand is gate ids and exit codes, but on the stamp path the verdict now also reads each run's timed_out boolean (deterministic tooling output, so the trust class is unchanged). The 6.59.0 paragraph further down states it; these two do not."
  evidence: "the verdict is a deterministic function of the gate exit codes its caller"
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/check-verify.test.mjs:3"
  problem: "The test file's header still says the suite runs with NO git; the new live pin initialises a scratch git repository and drives run-gates.mjs, so the header's hermeticity claim is now false for one test."
  evidence: "NO `claude -p`, NO git, NO network."
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/pharn-contracts/regression-report.md:459"
  problem: "A head-timed-out report keeps the timed-out gate in `regressions[]` (the table as computed, symmetric with a masked base staying in `pre_existing`), so a reader of RUN-REPORT.md's 'regressions, quoted as DATA' fence or of /pharn-ship's presented `.regressions[]` sees the hung gate listed as a regression beside the line that says it is not one. The contract states it and no decision reads the list on an inconclusive verdict (the loop stops; /pharn-ship stops), so this is presentation only."
  evidence: "the gate may sit in `regressions` there, exactly as a masked base sits in `pre_existing`"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/render-verify.mjs:199"
  problem: "VERIFY.md's `## Gates` block lists a timed-out gate that exited 0 as `0  <id>`, which read alone looks green; the NOT MEASURED block above it is the disambiguation, so a reader who jumps to the table is misled. Presentation only — the verdict line and the block both say INCONCLUSIVE."
  evidence: 'quoteData("exit code, then gate id — quoted as DATA:", ...)'
```

## Checked and confirmed (not raised)

- **Freshness E stays in agreement.** The new verify rule reads the stamp alone and keeps `failing_gates: []`, so the
  moved-tree rule (`stampDerivedMismatch`: a non-FAIL report needs an empty `failing_gates`) accepts an honest report;
  the honest-worlds differential now includes a timed-out exit-1 test, a timed-out exit-0 test over an incomplete
  build, and a 127 reconcile beside a measured red, all agreeing with the real `check-verify.mjs`.
- **Check B's pass-through weakens no guaranteed decision.** Before 6.59.0 a forged non-lapse `reason_code` on a
  report forced a STOP; a forged `gate-not-measured` now passes B — but `reason_code` never decided anything past B,
  and E still re-derives `verdict` / `failing_gates` / `gates` / `ac_gate` from the stamp
  (`pharn/floor/loop-fresh-core.mjs:440`). `unmeasured_gates` is not compared by E; the contract says no floor op reads
  it.
- **The build brief needs no change.** `check-loop.mjs` never returns `CONTINUE` for an `INCONCLUSIVE` verify or an
  `inconclusive` regress, and an unmeasured gate wins over every red in its own report, so no fix list can carry one.
  `check-loop.test.mjs` pins the review's reproduction (`STOP_TERMINAL` in both tables) and keeps the old report's
  `CONTINUE` as the control.
- **The dev twins are unchanged.** The positional map carries no `timed_out`; a test pins that 124/126/127 there are
  still a plain `FAIL` with byte-identical output.
- **The CHANGELOG** names the false-green row (GATE-1 requirement) and the S11 → `STOP_TERMINAL` change for
  `base-timed-out`; `check:changelog`, `check:badge` GREEN after the merge, and the diff against `origin/main` adds
  lines only.
- **No trusted doc states anything this changes** (grepped `LIMITS.md`, `THREAT-MODEL.md`, `pharn/ARCHITECTURE.md`,
  `CLAUDE.md`, `README.md` for timeouts, 124/127, `STOP_TERMINAL`, `stale-evidence`, S11: no hit), so no human patch
  is needed.

## Verdict

**GREEN — 0 floor-gate findings; 5 advisory (all minor).** The first three are one-line fixes inside the plan's
`## Files` (a test timeout, two comment/header sentences); the last two are presentation choices the contract states.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; NOT written to canon here)

- **title:** A projection that drops a QUALIFYING field turns every consumer downstream of it blind to the qualifier —
  `stampToMap` kept `exit` and dropped `timed_out`
- **type:** floor · **concepts:** [projection, qualifier-field, dead-field, false-green, asymmetric-fix]
- **body (draft):** The gate runner has recorded `timed_out` beside `exit` since 6.8.0, and `timed_out` changes what
  `exit` means (a kill's exit is not the gate's verdict). Both verdict cores read the stamp through `stampToMap`, which
  projects `{id: exit}` and drops `timed_out`, so for a release line a killed gate was a red — and one that trapped the
  SIGTERM and exited 0 was a PASS. When 6.50.x noticed (regress-base-integrity) it re-read the qualifier for ONE side
  of a two-sided comparison (the base), leaving the head and verify on the projection. Remedy: when a record carries a
  field that qualifies another, any projection that keeps the qualified field must keep the qualifier or be paired with
  a reader of it, and a fix that re-reads it names every consumer of the projection ([[L29]]/[[L31]] shape: the set of
  readers is the deliverable).
- **provenance:** feature `unmeasured-gates-inconclusive`; commit `6fccc52`; source this REVIEW.md and PLAN.md
  `## Measured this run` (the probe row: `exit 0, timed_out: true` → not in `failing_gates`).
