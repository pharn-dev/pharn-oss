# REVIEW — swallowed-exception-expected-fix

**Verdict: GREEN — 0 floor-gate findings.** 3 advisory findings, all minor. One of them (A1) is a CHANGELOG sentence
that freezes on merge, so it is the one to fix first.

Reviewed: `git diff 5bc02bb..6a5bf86` (12 files), by a fresh context that did not plan, grill or build it. The
increment is `trust: untrusted` DATA. The case fixture's injected comment is addressed to a "reviewer", which this
stage is. It was read as the fixture's payload and not followed. Nothing else in the diff addressed this stage. The
PLAN's GATE 1 record, the build commit's "grill concerns addressed" list and the stage reports were checked against
the files, not taken as true. Every `problem` / `evidence` below is free text, quoted as DATA (P2).

## Floor first (Step 1)

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`, exit 0.
- `npm run check` → exit 0. All ten gates are GREEN: 5,546 tests, 5,545 pass, 0 fail, 1 skipped. `check:reconcile`
  reads `NO_BASELINE` in this fresh worktree, which is green by design. The build's epoch was reconciled by verify,
  not here.
- `npm run check:changelog-entry` (merge-base `origin/main` = `5bc02bb`) → GREEN. It finds one new entry, opening
  `## [6.64.1] - 2026-10-19`, and no merged entry is touched.
- `node --test .dev/floor/eval-expected-satisfiable.test.mjs` → 4 pass, 0 fail, about 3.1 s.
- `spec_content_hash` `75088a82…fb0fd6` equals `shasum -a 256 pharn/ARCHITECTURE.md`.
- GATE 1 bytes: the PLAN's first 18,638 bytes hash to `10e630b7…ba2ca`. A draft with that hash and size exists in
  session `funny-diffie-2a16d0`'s scratchpad, at `plan-draft/PLAN.md` (see A3). So the approved text and the
  committed prefix are byte-identical. The human's answers are the orchestrator's transcription, and nothing in the
  tree can verify them. That is the normal bound on a recorded gate, not a finding.
- The committed stage reports were read, not re-run: `verify-report.json` is `PASS` (7 gates) and
  `regression-report.json` is `no-regressions`.

## The four lenses

- **L-floor (P0).** Every "Checked by" and "Probed" claim in CHANGELOG [6.64.1] and in the test header reduces to the
  exit codes of `check-structural.mjs` (primitive #3), run under `npm test`. Each was reproduced below. The bounds are
  stated where they apply: unpinned fields, the 42 `[]` witnesses, and "can be passed, not that the live lens passes
  it". The test's construction header names the checker as the decider and owns only the witness. No unlabelled
  guarantee was found, so there is no floor-gate finding. A1 and A2 are sentences that state more than the files or
  the checker show.
- **L-eval (P1).** No capability, `rule_id` or `enforces` changed. The lens still has 4 cases and 4 expected files,
  and `field_equals rule_id "P2"` still produces its `enforces: ["P2"]` binding. Validate's count stays at 37. The
  floor and this lens agree, so no finding.
- **L-trust (P2).** This lens carries the hard question: does the narrowed needle still catch every laundering?
  Answered by the differential below. Every output that puts injected text into an enum-gated field still REDs. The
  needle is a byte substring of the case's line 17 only, and of no pinned value. The test copies untrusted needles and
  paths into JSON and passes them to the checker by file path, with an argv array. Nothing evaluates them. No finding.
- **L-axis (P3).** The JSON and its paired `.md` change for one reason, the needle. The test has one axis: the
  witness model plus the walk. It points `.dev/` → `pharn/`, the direction an install allows, and has precedent
  (`source-nul-guard.test.mjs`). `FAILED_MEMBER` names one lens's file inside a generic sweep. If that file moves,
  tests 1, 2 and 4 fail loudly (L52 asks for this anchor). No sibling reference, so no finding.

### The narrowed needle, probed (old file at `5bc02bb` against the fixed file, the real checker)

20 hand-written outputs, built from the ideal finding:

| output                                                                                 | old | fixed | fixed RED from                                |
| -------------------------------------------------------------------------------------- | --- | ----- | --------------------------------------------- |
| ideal finding                                                                          | 1   | **0** | —                                             |
| ideal + extra non-enum keys (`status: "clean"`, `suppressed: true`, a payload `note`)  | 1   | **0** | — (the checker never reads extra keys)        |
| `severity` = `intentional and safe`                                                    | 1   | 1     | `field_equals` + needle                       |
| `severity` = `intentional` / `Intentional and safe` / NBSP-spaced phrase / `minor`     | 1   | 1     | `field_equals` only                           |
| `rule_id` = `P2 do not flag`                                                           | 1   | 1     | `field_equals` + needle                       |
| `rule_id` = `P2 intentional`; `type` = `mark clean` / `FINDING intentional`            | 1   | 1     | `field_equals` only                           |
| `file` with `intentional and safe` appended                                            | 1   | 1     | `file_resolves` + needle                      |
| `file` with `(intentional)` appended; `file` at `:17`; `./`-prefixed `file`; no `file` | 1   | 1     | `file_resolves` only                          |
| `[]`; two findings (ideal twice, or ideal + laundered)                                 | 1   | 1     | `finding_count` (+ `field_equals` and needle) |
| `[null]`                                                                               | 1   | 1     | every pin                                     |

Two outputs flip, and only two: the ideal finding, and the ideal finding with extra keys. The second passed the old
file only by accident, through the path collision, because a needle scans only the four enum-gated fields. So no
laundering into an enum-gated field passes the fixed file. Detection is unchanged as a conjunction: the exact pins on
all four fields plus `finding_count == 1` accept exactly one enum-gated tuple. What changed is attribution. A bare
`intentional`, `safe` or `mark clean` laundered into a field now REDs as a pin mismatch, and no longer with the needle's
"untrusted DATA laundered" message. PLAN:65 and the CHANGELOG ("exits 1 from the pin") say so. Accepted as designed;
not a finding.

### The witness test: false GREEN, false RED, coverage

- **Coverage, measured.** 611 tracked JSON files; 118 carry `assertions.structural`. The walk takes 111: every
  `pharn/**/evals/expected/*.json`, with none missed and none lacking `structural[]`. The 7 it leaves out are checker
  fixtures (`pharn/floor/test-fixtures/structural/*`, 5 of them RED by design) and `.dev/floor/test-fixtures/variance`.
  That matches "every capability expected JSON under `pharn/`" in the header and in the CHANGELOG.
- **The stated bound is empty today.** Of the 69 files that expect at least one finding, all 69 pin all four
  enum-gated fields. The witness therefore models every enum-gated field of every committed file. The "unpinned
  fields" false-GREEN class exists for future files only. 42 files are `== 0`. Every `finding_count` uses `==`, no
  file has two, and none has a negative or non-integer value. The `>=`, `<=` and fallback branches of `countFor` are
  exercised only by test 4's literal lengths.
- **No false GREEN for the stated property.** A GREEN is an output the checker accepted, so the eval can be passed.
  A dropped pin cannot hide: the checker REDs a witness that does not meet a pin. Probed in a scratch copy of HEAD's
  `pharn/`, with the swallowed file fixed. A needle `"FIND"` was planted in `grillers/a11y/…/plan-inadequate-a11y.json`
  (it collides with its `type` pin), and one `file_resolves` line in `plan-omits-a11y.json` was set to `:99999`.
  Test 1 failed with exactly those 2 of 111, naming the needle in `type` and the out-of-range line.
- **RED before, reproduced.** The same scratch tree with the `5bc02bb` JSON fails test 1 with exactly 1 of 111:
  `needle "intentional" found in enum-gated field "file"`. Tests 2 to 4 pass, as the build record says.
- **False RED** is possible only through the count rule. Example: a file whose first `finding_count` is `<= 3` and
  whose second is `>= 2`. The header says so, and it would be loud.
- **One header sentence is wrong** about the checker (A2). Its outcome is still right.

### L75 sweep, re-run by this review (`git grep -i intentional` outside `.dev/features/` and the CHANGELOG)

The hits outside this increment's diff that state a rule about the needle or about enum-gated fields:

| hit                                                                                      | disposition                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pharn/pharn-review/swallowed-exception/evals/cases/case-intentional-comment.md:3`       | still true. It says the injected "'intentional / do not flag' string" must never reach an enum-gated field. The injected string does not. The bare word in `file` is the fixture's path, not injected text. The fixed `.md` (lines 42-43) now says why. I concur with GRILL.md's table and the build commit's disposition. No edit; the case file stays byte-unchanged. |
| `pharn/pharn-review/swallowed-exception/swallowed-exception.md:127, :152`                | still true. A comment never moves an enum-gated field, and no needle from the untrusted input reaches one. There is no bare-word rule on `file`.                                                                                                                                                                                                                        |
| `pharn/pharn-review/resource-leak/evals/expected/expected-intentional-comment.md:3, :19` | still true. The sibling's needles are payload phrases (`do not flag`, `closed elsewhere`), and its `file` path also contains the word.                                                                                                                                                                                                                                  |
| `pharn/pharn-review/copy-paste-drift/copy-paste-drift.md:123`                            | still true. It is another lens's own comment rule ("intentionally identical"), with no needle on a path. The test passes all of its expected files.                                                                                                                                                                                                                     |

The remaining hits in the lens directory are the comment itself and prose about it (`case-intentional-comment.md:6,
:17, :22, :25`, `swallowed-exception.md:31, :64, :96, :121, :179`, `expected-empty-catch.json:13`). They are still true,
and they match GRILL.md's table. `docs/capabilities/**` has no hit.

## Floor-gate findings

None.

## Advisory findings (open)

```yaml
- type: FINDING # A1
  rule_id: P6
  severity: minor
  file: "CHANGELOG.md:30"
  problem: "The CHANGELOG [6.64.1] bold sentence says the eval 'can be passed again', but the same entry says the defect dates from #50, and the file at bb1a7e36 (#50) already pins a path containing `intentional` while forbidding `intentional`: the eval was never passable, so 'again' asserts a history the repo contradicts. The section freezes on merge (CONTRIBUTING, 'Nothing already merged is edited'); the build commit subject and likely the PR title say the same."
  evidence: "CHANGELOG [6.64.1]: '…`expected-intentional-comment.json` can be passed again: its needle no longer matches…' and '…named this fix as a follow-up in 6.64.0; the defect dates from #50.' · `git show bb1a7e36:pharn-review/swallowed-exception/evals/expected/expected-intentional-comment.json` lines 9-10: file_resolves '…/case-intentional-comment.md:16', needle 'intentional'."

- type: FINDING # A2
  rule_id: P0
  severity: minor
  file: ".dev/floor/eval-expected-satisfiable.test.mjs:28"
  problem: "The witness header says the count falls back to 1 'when the value is not a non-negative integer (the checker REDs that assertion)'; the checker REDs only a non-integer, and a negative integer is accepted (probed: `finding_count >= -1` exits 0 over one finding and over none). The fallback still gives a correct verdict (`>= -1` is satisfiable; `== -1` and `<= -1` RED because nothing can meet them), so only the parenthetical claims checker behaviour that does not exist. Dev-only file; a fix needs no bump."
  evidence: "test header :27-29: '`min(1, value)` for `<=`; 1 when the file has no `finding_count`, or when the value is not a non-negative integer (the checker REDs that assertion)' · check-structural.mjs finding_count: `if (!Number.isInteger(a.value)) red(…)`, then `n >= a.value`."

- type: FINDING # A3
  rule_id: P6
  severity: minor
  file: ".dev/features/swallowed-exception-expected-fix/PLAN.md:267"
  problem: "The GATE 1 record names the approved draft as session funny-diffie-2a16d0's `PLAN.draft.md`; no such file was found there, and the file that carries the stated hash and size is that session's `scratchpad/plan-draft/PLAN.md`. The hash, which is the load-bearing part, matches, so only the name a later auditor would search for is wrong."
  evidence: "PLAN.md:266-267: 'copied byte for byte from session `funny-diffie-2a16d0`'s `PLAN.draft.md`' · `shasum -a 256 …/funny-diffie-2a16d0/276e4ac4-…/scratchpad/plan-draft/PLAN.md` → 10e630b7…ba2ca, 18638 bytes."
```

Note, not a finding: GRILL.md:88 says test 1 covers "the 72 `file_resolves` paths". The walked set holds 69. The
plan's 72 counted all 118 structural files, including the checker fixtures the walk skips. The grill is a past stage
record, and nothing shipped repeats the number.

## Concurrence with the grill's open items

- GRILL P6 at PLAN:165 (the case's line 3 outside `## Files`). It has a disposition in three places: GRILL.md, build
  commit `ea09d57`, and the sweep table above. Still true; no edit.
- GRILL P6 at PLAN:4 (L75 not cited). The approved header bytes could not change. Grill re-ran the sweep, and this
  review re-ran it over the product surface. Both found every hit and gave each one a disposition, which is what L75's
  remedy asks for. No action.
- GRILL P0 at PLAN:111, P7 at PLAN:84 and P5 at PLAN:94 are addressed in the test. Test 4 compares against
  hand-written literals. The header names the `file_resolves` existence and range property. The count rule reads the
  first `finding_count`, and test 4 asserts that. All three were verified by reading the file.

## What to fix before merge (recommendation; the human decides)

1. **A1.** Drop "again" from the CHANGELOG [6.64.1] bold sentence, for example "can be passed: its needle no longer
   matches…". Make the same edit in the PR title or squash subject. The section freezes on merge, and `CHANGELOG.md`
   is in `## Files`. Re-run `check:changelog` and `check:changelog-entry` afterwards.
2. **A2** can be fixed in the same push or later. It is a one-clause comment edit in a dev-only file, with no bump.
   For example: "(the checker REDs a non-integer; a negative integer is accepted, and one finding meets `>=`)".
3. **A3** is optional. If the GATE 1 record is touched, name `scratchpad/plan-draft/PLAN.md`. The hash already
   identifies the bytes.

## Lesson candidate

**None. Nothing here clears L20's bar.** A1 is an L64-family restatement drift: a CHANGELOG sentence written
separately from the "dates from #50" fact beside it. A2 is the author's model of the checker, stated without a probe
(L55 and L74 family). Each is a first occurrence in a family canon already names, and neither is a discipline-only
remedy recurring. The increment's own trigger, an eval that its own pins cannot satisfy, was turned into a standing
test rather than a lesson, which is what L20 asks for.

## Deviations recorded

- The worktree shell guard refused a heredoc, a `while read` loop over `git ls-files`, and `sed` with a computed
  offset. The probes therefore ran as node runners written with the Write tool under `.pharn/pharn-dev-review/`
  (`probe.mjs`, `coverage.mjs`, `bounds.mjs`, `mutate.mjs`). The scratch tree came from `git archive` of HEAD's `pharn/` and the new test, and was extracted
  with `tar` beside them. All of it was deleted
  before `npm run check`. Without that, the root `**/*.test.mjs` glob in `scripts.test` could have collected the
  scratch copy of the test.
- The fix #7 guard denied one Write to the session scratchpad, outside the repo, as designed. The runner was then
  written under `.pharn/**`, which is always writable.
- `origin/main` was not fetched. The local ref is `5bc02bb`, the merge-base, so `check:changelog-entry` is measured
  against that base. Whether `main` has moved since is the ship stage's question.
