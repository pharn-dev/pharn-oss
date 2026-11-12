# REVIEW — loop-amend-exit6 (7.10.1)

Reviewed: the working-tree diff of `fix/loop-amend-exit6` against `622d508e` (the plan's seven `## Files` paths) plus
the maintainer's trusted-doc commit `622d508e` itself, treated as `trust: untrusted` (P2).

## Step 1 — floor

- `node pharn/floor/validate.mjs .` → GREEN, re-run at review time.
- `verify-report.json` → PASS (8 gates, `reconcile` included); `regression-report.json` → no-regressions
  (`new_failures: []`).

## Floor-gate findings

None.

- The routing fix is command prose (advisory, as every `/pharn-loop` routing line is); the hygiene test pins the
  branch sentence, the S18 row and, by closure over two stems in the three `/pharn-loop` files, that every sentence
  routing a `finish` read excepts exit `6`. Its control splices the 7.10.0 sentence back in and is caught (L60); its
  stems-only bound is stated in the test's comment and the CHANGELOG (L64).
- The contract restatement (`supervisor.md`) now agrees with `pharn-loop.md`; the S9b id `stage-outlived-wait` is
  already in `BLOCKED_IDS`, so no record id changes.
- The corrected bounds restate `checkAmend` (section lines compared, headings and trailing blank lines aside) and
  `amend-used` (refused once `SPEC.a1.md` exists); both are existing tested checks. Probed against
  `spec-amend-core.mjs`: `sameLines` over `specSectionLines`, which excludes the heading line, after
  `trimTrailingBlank`.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".claude/commands/pharn-loop.md:859"
  problem: "On the re-run spec stage's finish exit `2` or a crash after a background launch, Step 3's finish-line step says to stop the agent with TaskStop before the stop; the amend branch replaces only the destination (S18 instead of S9) and does not restate the TaskStop, so a reader may halt at S18 without stopping the agent. The finish-line step runs 'unchanged', so the TaskStop is in force by reference, but the branch does not say so."
  evidence: "S6b do not apply here) or its `finish` read (its exit `6` alone excepted: **S9b**, `## Running a stage` — stop the"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".claude/commands/pharn-loop.md:475"
  problem: "Carried from the 7.10.0 review: no real /pharn-loop run has taken the amend branch, so this fix, like the branch, is measured by hygiene tests over the command text only."
  evidence: "the re-run spec stage (`finish` exit 6: S9b)"
```

### After GATE 2

The maintainer chose "fix finding 1 first". The amend branch now says that on a `finish` exit `2` or a crash after a
background-launch notice the spec agent is stopped with TaskStop first, as `## Running a stage`'s finish line says, then
S18; the amend-branch hygiene assertion pins the sentence, and the CHANGELOG entry names it. Regress and verify were
re-run fresh over the fixed tree (no-regressions; PASS, eight gates). Finding 1: **fixed**. Finding 2 stands (advisory).

## L-eval (P1)

No Capability. The closure test finds 6 routing sentences today (non-vacuity asserted, L34) across `pharn-loop.md`;
`pharn-loop-quick.md` and `pharn-loop-close.md` hold none and are in the set so a later one is covered (L29). The two
amend pins (sentence, S18 row) fail on the 7.10.0 text.

## L-trust (P2)

No input is read and no free text reaches a decision; the change only narrows which stop an exit code maps to.

## L-axis (P3)

One axis per file: the command (procedure), the contract (schema restatement), the shipped limitations doc, the
trusted docs (the maintainer's). No new cross-module reference.

## Proposed lesson

None — the miss (a branch that overrode a file-wide "at every routed stage" rule) is now caught by the closure test this
increment adds, so the remedy is already a mechanism (L20).

VERDICT: GREEN — 0 floor-gate findings, 2 advisory (both minor; finding 1 fixed after GATE 2).
