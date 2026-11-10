# REVIEW — grill-finding-ids

**Verdict: GREEN — 0 floor-gate findings, 4 advisory findings (A1 fixed in this increment; A2–A4 open).**

- **Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. `/pharn-dev-verify`
  PASS (all 7 gates exit 0, build complete); `/pharn-dev-regress` `no-regressions` — both re-run after the A1 fix,
  same verdicts.
- The increment is `trust: untrusted`. Nothing in the reviewed files read as an instruction to the reviewer.
- Everything below the floor line is ADVISORY (fix #3): model judgment, for the human at GATE 2.

## Floor-gate findings (blocking)

None. No guarantee without a floor reduction or an `advisory` label was found (L-floor); no capability or `enforces`
rule_id was added, so the eval binding is untouched and `validate` agrees (L-eval); no guaranteed decision reads a
free-text field (L-trust); no sibling reference between capability modules (L-axis).

## Advisory findings

### A1 — the check's shapes refuse about one real grill in six on the first pass (measured)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/grill-findings-core.mjs:185"
  problem: "Measured against 161 real GRILL.md files (714 findings) from pharn-starter loop and ship runs, 27 files (17%) hold at least one value the check refuses: 57 rule_ids (8%, mostly a bare griller name such as `testability`) and 50 file values (7%: ranges, step labels, no line). Each already broke /pharn-grill's own finding instruction, so the check enforces what the command prescribes, but the one repair round is guided only by codes such as `rule_id@3`, which name the field and not the accepted shape."
  evidence: "rule_id failing RULE_ID_OK: testability 8, migrations 6, security 5, privacy 5 …; file failing shape: PLAN.md:91-98, PLAN.md:step 8, PLAN.md (no line) …"
```

Why it matters: nothing gates on the check in 7.6.0, so a RED here costs only a `findings-check: RED` header line. In
part 2 the loop branches on it, so a 17% first-pass RED rate becomes a repair round in roughly one grill in six, or a
stop. **Recommendation:** before part 2 gates on it, make the RED message print the accepted shape per field (a fixed
hint per defect code — `rule_id`: `P0..P7` or `<file>.md <ID>-<n>`; `file`: `<path>:<line>`), and state in
`pharn-grill.md`'s finding output that a whole-plan or multi-line concern cites its first line. Measure the first-pass
rate on one real full grill. This is L67's mechanism (a checker models an external producer from the inputs its author
pictured): the plan did not cite L67, and the corpus was measured at review rather than at plan.

**Status: FIXED in this increment (the maintainer chose "fix now" at the review halt).** `grill-findings-core.mjs` gains
`DEFECT_HINTS` — one fixed hint per defect code, keys held equal to `DEFECT_CODES` by a test — and `defectHints`; both
CLI modes print one hint line per distinct code after the `RED —` line, never a value from the file. `pharn-grill.md`'s
finding output now states the two measured shapes (`rule_id` a principle or `<file>.md <ID>-<n>`, never a bare griller
name; `file` one line number, a range or step citing its first line). Tests: the hint table's closure, the hint lines'
order and value-freedom, and a CLI run over the two measured drifts (22 tests, all pass). **Still open from the
recommendation:** the first-pass RED rate on a real full grill under the new wording is not measured; part 2 should
measure it before gating on the check.

### A2 — the core's "pure" header is true of its own code, not of its imports

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/grill-findings-core.mjs:3"
  problem: "The header says the module does no file, process or network I/O, but it imports merge-findings.mjs, which imports runtime-floor.mjs (a load-time Node version check) and node:fs; the module's own functions do no I/O, but loading it is not side-effect free."
  evidence: "The PURE half: no file, process or network I/O."
```

Recommendation: "its functions do no I/O" or name the import. No behaviour changes.

### A3 — the GRILL.md findings list loses its grouping by axis

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".claude/commands/pharn-grill.md:314"
  problem: "Before 7.6.0 a full grill listed findings grouped by axis; the rendered section is one flat list in file order, so a reader of GRILL.md sees the interrogation's, the grillers' and the scanners' findings interleaved unless the model orders the file by axis."
  evidence: "the **findings section** rendered from `grill-findings.json`, verbatim"
```

Recommendation: either tell the grill to write the file grouped by axis (ids stay positional), or accept the flat list
and let the prose summary group. A grouping key in the file would be a shape change; not proposed.

### A4 — the P7 trigger is still the maintainer's direction plus run paths

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/grill-finding-ids/PLAN.md:18"
  problem: "Part 1 has no consumer and its trigger is recorded as the maintainer's direction plus four pharn-starter run paths whose GRILL.md files all report 0 blocking-severity findings; the brief's specific failures (a reauth flow that could never work, a GDPR erasure that never finishes) are not yet tied to a finding line."
  evidence: "Q3 → proceed; cite lines later"
```

As resolved at the plan halt: name the lines before part 2's plan. Recorded here so GATE 2 sees it.

## Checked and found sound (advisory notes, no finding)

- **Guarantee labels (L-floor):** the contract section, the grill's claims block, the CLI header and the CHANGELOG each
  say "floor when it runs" and name the check's blind spot (a finding never written into the file). The `reconcile`
  gate was `CLEAN`; VERIFY.md records the four Bash-path writes, all inside `## Files`.
- **One source (L35):** the JSON is the source, the GRILL.md section is derived and byte-compared, and the scanner
  findings come from one builder; the golden test shows `renderScanSection`'s bytes did not move.
- **Trust (L-trust):** the checker's output names codes, indexes and the scanner findings' fixed fields — never a value
  from the file or GRILL.md; free text is rendered through `JSON.stringify` inside a YAML fence, and a test shows a
  value cannot forge a marker or a fence line. `{"toString":1}` in every field is refused without a throw (L62).
- **Enums (L36):** `TYPE_ENUM`, the severity set and `RULE_ID_OK` are imported from `merge-findings.mjs`, not copied,
  so no parity test is owed; the defect-code set is closed and test-enumerated both ways.
- **Axis (L-axis):** core (shape + render + comparisons) and CLI (I/O + argv) are separate files. The core importing
  `merge-findings.mjs` couples the grill's validator to the review merge's enum rules on purpose — both implement the
  one finding-shape contract.
- **Scope:** `loop-closeout.mjs` `STAGE_ARTIFACTS` is unchanged, correctly — the loop's grill is still `--floor-only`
  and writes no file; part 2 must add it.

## Proposed lesson candidate

None new. A1 is a recurrence of **L67** (a checker modelling an external producer states its bounds from the inputs
its author pictured), caught at review by measuring the corpus. If part 2 hits it again, that second occurrence is the
trigger L20 names for a floor remedy.
