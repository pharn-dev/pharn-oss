# REVIEW — floor-test-glob-names (7.0.1)

Reviewer: an independent read-only subagent applying the four lenses over `git diff -M HEAD` at `bc63759f` plus the
untracked files, with the main session folding its findings in. All of it is advisory model work except the floor.

## Floor first (P0)

`node pharn/floor/validate.mjs .`: GREEN (37 capabilities). `regression-report.json`: `no-regressions`.
`verify-report.json` (first pass): `PASS`, reconcile `CLEAN` (43 paths, no escapes).

What the reviewer checked against the repo (advisory): the new suite passes 3/3; the two renamed suites and the
directly affected suites pass (272 + 171 tests), and so do the `check-loop-fresh` 6.21.1 set and the `check-test-stage`
crash set with the renamed fixture paths. The boundary-anchored grep leaves only the five `7.0.1`-labelled lines,
`pharn/LIMITS.md:632`, the new test's own narrative, released CHANGELOG sections, `.dev/features/**` and canon. No
old path is named in `docs/`, `.claude/commands`, `CLAUDE.md`, `CONTRIBUTING.md`, `.github`, pharn-cli or pharn-ci.
The lcov claim was measured (an `ac-foo.mjs` appears in `lcov.info`, a `test-foo.mjs` does not). The test's
restatement of pharn-cli's copy rule matches pharn-cli. The HUMAN-PATCH old text matches `LIMITS.md:632` exactly.

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/floor-test-glob-names/BUILD.md:16"
  problem: "The scripted hook calls are discipline, not floor; the only floor backing for 'wrote only ## Files' is verify's reconcile, which must be CLEAN on the bytes that merge."
  evidence: "Calling the hooks from a script is discipline, not floor"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-dev-build.md:125"
  problem: "Step 2b's pinned eslint line aborts at the first scope path that no longer exists, so a plan with (delete) entries skips the whole JS lint subset in that step."
  evidence: 'No files matching the pattern "pharn/floor/test-infra-core.mjs"'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:41"
  problem: "'a later shipped name that collides fails npm test' says more than the probe covers (floor and hook files, the restated copy rule, the Node running the suite)."
  evidence: "so a later shipped name that collides fails `npm test`"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:46"
  problem: "'every CLI' is broader than what was read (one pharn-cli commit)."
  evidence: "because every CLI copies the floor directory by walking it"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/ac-test-infra-core.mjs:8"
  problem: "'keeps shipped names out' reads as prevention; the test only detects (same line in per-test-results-core.mjs:8 and per-test-results-formats.mjs:9)."
  evidence: "(default-test-glob.test.mjs keeps shipped names out)"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "CHANGELOG.md:4963"
  problem: "Released sections link to the three removed paths; the links are now broken, and the sections are frozen."
  evidence: "[`pharn/floor/test-results-core.mjs`](./pharn/floor/test-results-core.mjs)"
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: "pharn/LIMITS.md:632"
  problem: "Unless the HUMAN-PATCH lands before merge, 7.0.1 ships a trusted doc citing a module that no longer exists."
  evidence: "(`pharn/floor/test-infra-core.mjs` states"
- type: FINDING
  rule_id: "style"
  severity: minor
  file: "pharn/floor/check-loop-fresh.mjs:8"
  problem: "The two labelled dated-record lines ran to 154 and 145 columns (this one and quote-core.mjs:9), over the 140-column printWidth that prettier does not enforce in comments."
  evidence: "a test-infra-core.mjs that throws — ac-test-infra-core.mjs since 7.0.1) ended the process"
```

## Dispositions (after this review, within `## Files`, hook-checked writes, then verify re-run)

- CHANGELOG `:41` and `:46` reworded to the probe's real coverage and to "pharn-cli copies … (read at `33d0ec9`), so a
  CLI the gate admits installs the new names"; the broken released links are now stated as a known cost in [7.0.1].
- The three header lines now say the test "fails if a shipped name matches".
- The two long dated-record lines are split in two; the `7.0.1` label stays on the line with the old name (L78).
- Not changed here: the `pharn-dev-build` Step 2b eslint line (an apparatus fix outside `## Files`; follow-up
  `dev-build-format-deleted-paths`), and `pharn/LIMITS.md` (human-only; HUMAN-PATCH.md, after verify, L68).

## Lesson candidate

None. The eslint-on-deleted-path failure is a first occurrence (L20's bar is a recurrence), so it is named as a
follow-up instead.

VERDICT: GREEN — 0 floor findings; 2 important and 6 minor advisory findings, 6 addressed in this increment.
