# REVIEW — head-test-single-run (CORE-89, 7.18.0)

Reviewed: `git diff 907da87d HEAD` minus this feature folder, at `3b7cac55`, by an independent read-only reviewer agent
applying `/pharn-dev-review`'s four lenses. Its findings are quoted below as DATA (the increment is `trust: untrusted`).
Floor first: `node pharn/floor/validate.mjs .` exit 0 (GREEN, 37 capabilities).

**Verdict: GREEN — 0 floor-gate findings, 6 advisory (all minor).**

## What the reviewer checked (summary)

- Every reader of a regress HEAD stamp's `test` `files` is guarded or sees only the BASE spec: `run-gates` `needsFiles`
  excludes the whole-suite run; `stampPerTest` routes whole-suite stamps to their own mode first; `baseSpecFrom` maps
  `compare_files`, so `regress-base-reuse-core`, `entry-base-evidence-core` and `derivedBaseStamp` keep their bytes;
  `build-gate-core`, `red-run-core` and the entry-gate cache never see a regress HEAD stamp.
- The `runVerdict` reclassification keeps 7.17.0 outputs byte-identical (it relies on `preExisting.sort()`, finding A1),
  and every whole-suite row matches the contract; both timed-out rules still run first.
- Stamp shape: `compare_files` only on a regress/head `test` run beside `files: []`; a digest required on a reused
  verify `test` only. A forged `compare_files` on that run can move a base-green/head-red row to "not a regression" —
  the same unauthenticated-stamp posture as 7.17.0's domain (L19, L43) — and cannot produce an overall green, because
  verify reuses that same red run and FAILs it.
- The reuse copy: `clearResultsPath` before `tryReuse`; the copy is last, verified before and after, removed on a failed
  check; no miss can follow a successful copy; a resume re-clears the path; the 64 MiB copy cap exceeds the 32 MiB
  results cap.
- P0: new floor claims reduce to content-hash (copy, J) or enum/regex (stamp shape); the rest are labelled bounds.
- Tests: L60 controls on the domain and on `isRegression`; in-process coverage of every new branch; children inherit
  `process.env`, so coverage reaches them. No test title changed.
- Trust (P2): new render text is fixed; gate ids stay fenced. Axis (P3): `gate-reuse-core` still imports only
  `node:crypto` and `gate-run-core`; `stage-regress` → `per-test-results-core` stays inside the floor.

## Floor-gate findings

None.

## Advisory findings and dispositions

```yaml
- type: FINDING # A1
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/check-regress.mjs:1158"
  problem: "The byte-identity of 7.17.0 pre_existing ordering rests on preExisting.sort(), and no test fails when that line is deleted (L60)."
  evidence: "Mutant without `preExisting.sort();` in a scratch copy: check-regress.test.mjs 86 pass / 3 fail, the same 3 environment-only failures the unmutated control shows."
- type: FINDING # A2
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/gate-run-core.test.mjs:1803"
  problem: "The test title claims more than it checks: shape validation stops a misplaced compare_files, but a forged compare_files on the regress/head test run itself still changes the verdict."
  evidence: "a forged field cannot widen a verdict"
- type: FINDING # A3
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/run-gates.mjs:804"
  problem: "The comment says the flag is never silently accepted when it would change nothing, but on regress/head with no `test` entry the flag is accepted and changes nothing."
  evidence: "so a flag that would change nothing is never silently accepted."
- type: FINDING # A4
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:39"
  problem: "The HEAD whole-suite command is `npm run test` only on the discover path; under an explicit --gates spec it is that gate's own shell or argv."
  evidence: "The HEAD `test` run is `npm run test` with no file arguments, the command verify runs"
- type: FINDING # A5
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/gate-reuse-core.test.mjs:480"
  problem: "The assertion cannot tell which rule refused the forged test:e2e source; only `.hit === false` is asserted."
  evidence: "assert.equal(findReusable(...).hit, false);"
- type: FINDING # A6
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/gate-run-core.test.mjs:1117"
  problem: "The title is kept, but is now false for `test`; the expected pattern changed for one member, which test-integrity may report as a changed assertion (also the LOAD GRAPH regex)."
  evidence: 'const rule = gate === "test" ? /records the source''s results_sha256 digest/ : /are never reused/;'
```

Dispositions (the building agent's, inside the plan's `## Files`, commit `232af72b`):

- A1 — fixed: a new test pins the sorted `pre_existing` (and `regressions`) with `test` beside a red `typecheck`, in the
  7.17.0 mode and the whole-suite mode.
- A2 — kept the title (renaming a test reads as a removed test to pharn-ci's test-integrity check); a comment above it
  states the bound: "cannot widen" holds for a misplaced field only.
- A3 — fixed: the comment now says the flag is accepted and changes nothing when the set holds no `test` gate.
- A4 — fixed: "the gate's own command with no file arguments (`npm run test` when discovered)".
- A5 — fixed: the forged source asserts `source-invalid`, and a plain `test:e2e` source asserts `not-reusable-id`.
- A6 — accepted: the title is kept on purpose; the changed assertion is the behaviour change itself (`test` is the one
  member that may be reused), stated in the test's comment and in the CHANGELOG.
- The reviewer's untabled note (the VERIFY.md line said the AC gate "read" the copied file even for a SPEC with no AC at
  the `test` level) — fixed: the line now says the AC gate reads its record "if any AC maps to `test`".

## Lesson

No lesson: the sort gap is a single instance, not a recurring mechanism (L20's bar).
