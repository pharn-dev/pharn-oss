# REVIEW — amend-wording-7102 (7.10.2)

Reviewed: the working-tree diff of `fix/amend-wording-7102` against `f1a7a84e` (the plan's six `## Files` paths) plus the
maintainer's trusted-doc commit `f1a7a84e` itself, treated as `trust: untrusted` (P2).

## Step 1 — floor

- `node pharn/floor/validate.mjs .` → GREEN, re-run at review time.
- `verify-report.json` → PASS (8 gates, `reconcile` included); `regression-report.json` → no-regressions
  (`new_failures: []`).

## Floor-gate findings

None.

- The loosening is bounded by the code: `sameSection` drops only a trailing run of lines whose `trim()` is empty, and
  keeps `sameLines`' null rule before trimming (both absent equal, one absent unequal), so a duplicated `## Intent`
  still refuses rather than throws. The new test passes a trailing blank line added on either side, in either section,
  and refuses a blank line inside Scope, a leading blank line in Intent and trailing text; with the trim removed it fails
  (mutation run at build: 0 pass / 1 fail), so it is not vacuous (L60).
- The contract's new `Bounded` sentence was probed against `spec-amend.mjs`: `doStatus` (via `amendState`), `doBegin`
  and `doCheck` each return `partial-archive` when `SPEC.a1.md` is absent and another amend name is present, and
  `SUPERVISOR.a1.json` always exists after a `begin` (the supervisor file is moved by it). So removing `SPEC.a1.md`
  alone is detected at all three; only removing every `.a1` file is not. LIMITS §1d (the maintainer's patch) says the
  same.
- The other restatements hold after the change (L64): THREAT-MODEL §5's "line for line … trailing blank lines aside" is
  now true for all three parts; `docs/limitations.md`'s "refused once the run's `SPEC.a1.md` exists" is true;
  `supervisor-core.mjs`'s "neither prevented nor detected here" is scoped to that module, which reads only the archive's
  presence.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P4
  severity: minor
  file: "pharn/floor/spec-amend-core.mjs:21"
  problem: "The edited header comment's third line runs to about 160 characters, past the file's ~120-column comment width; prettier does not wrap comments and no lint rule catches it. Cosmetic."
  evidence: "next heading, and LIMITS.md §1d already set them aside); the archive's `## Acceptance Criteria` lines"
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/spec-amend-core.mjs:160"
  problem: "Carried from 7.10.0/7.10.1: no real /pharn-loop run has taken the amend path, so this check, like the branch, is measured by unit tests over fixtures only."
  evidence: 'if (!sameSection(archiveText, specText, "intent")) defects.push(defect("intent-changed"));'
```

## L-eval (P1)

No Capability. `spec-amend.test.mjs` gains one ✧ test (above); the existing per-code refusal test still refuses an
Intent and a Scope edit.

## L-trust (P2)

No new input. Intent/Scope lines are untrusted SPEC text as before; refusals still carry codes only.

## L-axis (P3)

One axis per file: the checker (one private helper beside the check it serves), its test, the contract, repo meta. No
new cross-module reference.

## Proposed lesson

None — both points are a recurrence of L64 (a bound's restatement re-derives its quantifier), already canon; this run
applied it by re-reading every restatement against the code rather than only the two quoted sentences.

VERDICT: GREEN — 0 floor-gate findings, 2 advisory (both minor).
