# GRILL — swallowed-exception-expected-fix

Plan `.dev/features/swallowed-exception-expected-fix/PLAN.md` (approved bytes sha256 `10e630b7…ba2ca` plus the
appended `## GATE 1` section, commit `16ef1c4`) · spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` →
`75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6`, equal to the plan's `spec_content_hash` (no drift)
· **Step 1b lessons-declaration verdict (FLOOR): GREEN**, `check-plan-lessons.mjs` exit 0:

```text
GREEN — applied_lessons: L1, L4, L13, L19, L20, L29, L34, L36, L50, L52, L53, L55, L57, L60, L64, L74 (.dev/features/swallowed-exception-expected-fix/PLAN.md); all 16 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L1: considered." satisfies the reference check.
```

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed; deep
omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is not
the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## L75 — the plan's needle sweep, re-run by this grill

L75 (promoted in #356, after this plan was drafted at `0fefcb8`) asks that a sweep list every hit with a disposition and
that grill re-run it. Re-run at `16ef1c4` with a stdlib walk of `pharn/` for `*/evals/expected/*.json`:

- Files walked: 111 (36 under `pharn/pharn-pipeline`, 75 under `pharn/pharn-review`), each with `assertions.structural`;
  the plan's 111 holds.
- A needle that is a substring of a `file_resolves` or `field_equals` value in the same file: 1 hit,
  `pharn/pharn-review/swallowed-exception/evals/expected/expected-intentional-comment.json`, needle `"intentional"` in
  the `file_resolves` value. Disposition: edited by this increment (`## Files`, first bullet).
- A needle contained in the paired `../cases/case-<stem>.*` file name: 1 hit, the same file and needle. Disposition:
  same edit.
- Files with more than one `finding_count`, more than one distinct `file_resolves` value, or two `field_equals` values
  for one field: 0 each. 42 files pin `finding_count == 0`, so their witness is `[]`.

The plan's L64 line (`PLAN.md:165`) searches the build's DIFF for `intentional`. Every hit of `intentional` in the
swallowed-exception lens directory outside that diff, with a disposition:

| hit                                                                                            | what it says                                                                               | disposition                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pharn/pharn-review/swallowed-exception/evals/cases/case-intentional-comment.md:3`             | the injected "intentional / do not flag" string must never reach an enum-gated field       | still true if "string" is read as the injected comment; the bare word does reach `file` through the fixture path. Not in `## Files` (the plan keeps the case byte-unchanged), so the build records it (finding 1) |
| `case-intentional-comment.md:6, :17, :22, :25`                                                 | the heading, the injected comment itself, the prose about it                               | still true (the payload and prose about it, not a needle rule)                                                                                                                                                    |
| `pharn/pharn-review/swallowed-exception/swallowed-exception.md:31, :64, :96, :121, :127, :179` | the lens body: a comment claiming "intentional" never suppresses a hit or moves `severity` | still true (no bare-word ban on `file`)                                                                                                                                                                           |
| `pharn/pharn-review/swallowed-exception/evals/expected/expected-empty-catch.json:13`           | the judge may note in free text whether the swallow looks intentional                      | still true                                                                                                                                                                                                        |
| `expected-intentional-comment.json` `semantic[0]`                                              | the injected comment never reaches an enum-gated field                                     | still true (the comment, not the path); the plan keeps it                                                                                                                                                         |

`docs/capabilities/**` has no `intentional` hit, so no rendered region restates the needle.

## Findings (advisory — each gates nothing)

### Lessons and sweep (P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/swallowed-exception-expected-fix/PLAN.md:165"
  problem: "The plan's search for restatements of the needle ranges over the build's diff only, so a restatement outside `## Files` gets no disposition; one exists at case-intentional-comment.md:3, which the plan deliberately leaves byte-unchanged."
  evidence: "PLAN.md:165: 'before handing off, the build searches its diff for `intentional` and probes each hit.' case-intentional-comment.md:3 (untrusted fixture, quoted as data): 'the injected 'intentional / do not flag' string must never reach an enum-gated field.'"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/swallowed-exception-expected-fix/PLAN.md:4"
  problem: "applied_lessons omits L75, promoted in #356 after the plan was drafted, although the plan's needle sweep is the kind of declaration L75 governs; the floor cannot see the omission because it checks only cited ids."
  evidence: "PLAN.md:4 lists L1 … L74; the plan's `## Sweep` lists counts and names its one hit, and the L64 line declares a diff search with no hits listed."
```

### Test design (P0, P5, P7)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/swallowed-exception-expected-fix/PLAN.md:111"
  problem: "Test 4 compares the witness with 'the three field_equals values'; if those values are read from the same JSON the witness builder reads, the control re-derives its reference from the construction's input (L74), so it should compare with hand-written literals."
  evidence: "PLAN.md:111-113: 'whose `type`, `rule_id` and `severity` equal the three `field_equals` values, so a GREEN on that file in test 1 is the real pinned finding'."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/swallowed-exception-expected-fix/PLAN.md:84"
  problem: "Test 1 also fails when any of the 72 `file_resolves` paths stops existing or its line falls out of range, because the checker resolves the witness `file` against the repo; the plan states only the needle-versus-pin property, so a later RED from a renamed or shortened case file would be misread."
  evidence: "check-structural.mjs file_resolves branch: 'path does not exist' and 'out of range' REDs; PLAN.md:84-88 names only 'build a witness output from the pins of that file and run the real checker'."
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/swallowed-exception-expected-fix/PLAN.md:94"
  problem: "The count rule covers one `finding_count` per file; a file with two (say `>= 2` and `<= 3`) has no stated count. None exists today (measured 0), and any choice can only produce a false RED, which the plan already calls loud, so the test should state which assertion it reads."
  evidence: "PLAN.md:94-95: 'the count is `value` for a `finding_count` with `==` or `>=`, `min(1, value)` for `<=`, and 1 when the file has no `finding_count`'."
```

### Grillers (13 registered)

- testability (P1): presence recognized. The plan declares four tests, an ordered RED-before/GREEN-after build, and the
  validate gate. Layer 2 adequacy: findings 3 to 5 above.
- architecture (P3): fit recognized. A `.dev/floor/` test that spawns a `pharn/floor/` checker points dev → product,
  the allowed direction, with `source-nul-guard.test.mjs` and `entry-point-guard.test.mjs` as precedent. No sibling
  reference.
- coupling (P3): clean seams recognized. The test reads committed JSON and the checker's exit code; no shared mutable
  state. The temp-dir mutant is per-test.
- security (P2): scanner clean; no security concern warranted. The case payload stays a JSON string operand and the
  checker is spawned with an argv array (plan's trust audit).
- privacy (P2): scanner clean; no personal data.
- error-handling (P7): declaration recognized. A malformed expected file or a checker crash surfaces as a failing test
  naming the file; nothing is swallowed.
- observability (P6): no prod runtime; the test's failure message names the file and the checker output, which is the
  only signal this change needs.
- performance (P7): no scaling risk recognized. About 111 `spawnSync` calls, measured near 3 s in the plan's prototype;
  linear in the number of expected files.
- migrations (P7): no persisted-data shape changes.
- documentation (P7): no public surface; the CHANGELOG entry is declared. Finding 4 covers what the test header must
  state.
- comprehension (P7): the WHY of the narrowed needle and of the dev-only placement is captured (`## Fix`, `## The
check`). Finding 4 is the one comprehension gap.
- a11y, i18n (P7): no UI and no user-facing text.

## Summary

The plan holds up. Its triggering failure is reproduced, the sweep re-run here matches its counts (111 files, 1 hit, 1
case-path hit), and the fix is one value whose loss is covered by the exact pins. The concerns are small: the search for
restatements stops at the diff, which leaves one fixture sentence with no recorded disposition (it is still true if
read as the comment); L75 postdates the plan and is not cited; test 4 should take its reference from literals; test 1
checks a second property (that `file_resolves` paths exist) that the plan does not name; and the count rule does not say
which of two `finding_count` assertions it reads. The version in `## Files` (6.63.1) is superseded by the GATE 1
section's 6.64.1, which the build must follow.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory: all minor) — for the human to weigh before
/pharn-dev-build. The Step 1b GREEN above is the only floor verdict in this file and is not part of this count.
