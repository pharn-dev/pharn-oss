# REVIEW — delegated-signoff-2026-11-23

Reviewed: `.dev/measurements/delegated-signoff-2026-11-23.md` and its `CHANGELOG.md` `[Unreleased]` entry, both
`trust: untrusted` for this review, against run 2's store and the two merged records they cite. Floor first:
`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`.

**Verdict: GREEN — 0 floor-gate findings, 3 advisory findings (one fixed in iteration 2).**

## Floor-gate findings

None. The record claims no guarantee: "What this record may claim (P0)" says nothing it concludes is a floor
guarantee and puts every decision, threshold and reading under advisory, and every sha256 is offered for a reader to
re-run, not as a check (L-floor). It adds no Capability or `rule_id` (L-eval). It emits no finding object; the project
output it reads (stamps, `cost.json`, `RUN-REPORT.md`, `VERIFY.md`, `load.txt`) is tagged untrusted and only ints, enum
strings, hashes and paths are taken from it; the one quoted block is the GATE-1 wording, attributed. No
instruction-looking text in the reviewed files or the evidence changed this review (L-trust). Two files, each with one
reason to change, no reference across module roots (L-axis).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/measurements/delegated-signoff-2026-11-23.md:303"
  problem: "Before iteration 2 the P0 section named reconcile among the floor facts over this change, but main moved during the run and the first two merges were each followed by a re-anchor, so reconcile's window held none of the build's first writes (VERIFY.md: reconciled 0). Fixed in iteration 2; the pre-fix sentence listed 'the writes-scope hook over the two files it wrote, reconcile, and check:surface-bump', and the sentence now says what the window held."
  evidence: "`reconcile` ran too, but `main` moved during the"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/measurements/delegated-signoff-2026-11-23.md:135"
  problem: "'by their titles none adds concurrency' rests on five commit titles, not on their diffs; the gate-run-record.md half of the sentence was read, the commit half is a reading of titles and stays advisory."
  evidence: "by their titles none adds concurrency"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/delegated-signoff-2026-11-23/PLAN.md:147"
  problem: "The plan put the CHANGELOG entry under a new '### Changed' heading; after the first merge of origin/main the [Unreleased] section held headingless dated entries, so the entry joined them without a heading. A deviation from the plan's wording, not from the CHANGELOG convention (check:changelog is green in verify)."
  evidence: "one dated `[Unreleased]` entry under a new `### Changed` heading"
```

Checked and not a finding:

- Every per-gate figure, the stage elapsed times, the timeout share, the load range, the orchestrator share and the byte
  counts were re-derived from run 2's store and this tree by a scratch script and match the record. CORE-310's merged
  record carries the same per-gate table.
- The CHANGELOG entry's restated figures (2,451 s, 42.6 s, 43.5 to 85.6 s, 1.8% to 3.5%, 83.6%, 540 s, 14 to 80,
  383.3 s, 410.0 s, 84,935 B, 0.32%, 0.71%, 26.95%, 27.7%) each appear in the record with the same meaning (L64).
- Every decision carries "decided by the agent under the maintainer's explicit delegation (2026-11-23), not a
  maintainer sign-off", and §7 says CORE-314's AC1 is not met.
- The CORE-113 wording is the GATE-1 text, and the record does not call the outcome measured.

## Proposed lesson candidate

- **title:** Re-anchoring after merging `origin/main` mid-ship drops the build's own writes out of reconcile's window
- **type:** process · **concepts:** [reconciliation, merge, re-anchor, false-record]
- **body:** Since 6.52.0, `check-bash-reconcile.mjs` lists a path whose bytes equal the upstream bytes HEAD merged in
  during the window under `merged`, so a merge of `origin/main` is not an escape and needs no re-anchor. This run
  re-anchored after each of two merges, as the batch brief directed, and the build's two files were committed before
  the last anchor, so verify's reconcile read `CLEAN` with `reconciled: 0` and the record's P0 section claimed a
  reconcile it did not get. Iteration 3 then merged twice more without a re-anchor, and reconcile listed all 24
  upstream files under `merged` with no escape. Remedy: after merging `origin/main` into a branch with an open epoch,
  keep the anchor and let `merged` absorb the upstream bytes; re-anchor only when the epoch is genuinely broken, and
  then say in the record which writes the window no longer covers.
- **source:** this file, the first advisory finding, and `.dev/features/delegated-signoff-2026-11-23/VERIFY.md`
  "Orchestration notes".
- **why it would recur:** the batch brief's standing rule ("merge non-main branches BEFORE the build anchor or re-anchor
  after") applies to every parallel ship whose `main` moves, and nothing reads a record for which writes reconcile saw.

## Note on this file

Its first version was written by a `node` call through Bash by mistake (a scripted find-and-replace of line
references). It was rewritten in full with the Write tool under this stage's scope, so the writes-scope hook judged the
final bytes. It is a pipeline artifact that reconcile exempts, so the Bash write could not show as an escape either way.
