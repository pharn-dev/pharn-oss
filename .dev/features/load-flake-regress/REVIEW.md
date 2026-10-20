# REVIEW — load-flake-regress

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (exit 0). No Capability is
added or changed, so L-eval has no `enforces` binding to check. Free text quoted below is DATA.

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "CHANGELOG.md:39"
  problem: "The entry first said the timing tests 'no longer fail because the machine is loaded' — a guarantee the change cannot make; it rests on one stress profile."
  evidence: "**The floor's timing tests no longer fail because the machine is loaded.**"
  status: FIXED before verify — reworded to 'made independent of machine load where a test can be', with the before/after numbers and 'a measurement, not a guarantee'.
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/entry-gates.test.mjs:289"
  problem: "Comments cited load levels (~190) and overruns ('stretched past 700 ms', '20 s was outrun') that were not measured for those tests in this run."
  evidence: "but at load ~190 a 60 s gate timeout and a 60 s --wait budget were both outrun"
  status: FIXED — each now names what the batch recorded or says 'can'; the 20 s hung-gate constant is called an estimate.
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/floor/node-test-results-reporter.mjs:42"
  problem: "recordFile treated any relative path starting with '..' as outside the cwd, so a file under the cwd named '..x' kept its absolute path and its ids would differ between the base worktree and the working tree (a false 'absent' at base)."
  evidence: 'rel.startsWith("..")'
  status: FIXED — '..' or '../' only, with a test. The regress captures ran before this fix; no outside test path starts with '..', so they are unaffected.
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/load-flake-regress/PLAN.md:1"
  problem: "Two axes in one increment (test-fixture load independence; a regress verdict rule), kept as one PR at the task's request; they touch disjoint files except the CHANGELOG, so each is revertible on its own."
  evidence: "increment: (a) Make the floor tests … (b) give `check-regress.mjs verdict` an opt-in PER-TEST comparison"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/pharn-contracts/regression-report.md:85"
  problem: "The report was described as carrying no untrusted free text; `per_test.new_failures[].id` is test-title text. The contract, guide and command now say so and the command fences it; no floor op reads it."
  evidence: "**This artifact contains no untrusted free text — with one exception since 6.72.0:**"
```

## Lenses

- **L-floor (P0):** the per-test rule reduces to set membership over two records the existing builder parses (enum /
  integer comparison), fail-closed on every unusable input; the claims that are not floor (the records are the run's,
  the reporter sees every test, the tests are load-proof) are labelled advisory in the contract, guide and CHANGELOG.
- **L-eval (P1):** the new checker paths have tests with a negative control (the masked case reads `no-regressions` with
  the rule removed); each load fix keeps its mutant/control (the budget-clock mutants still flip under the injected
  clock). The per-test path caught a real regression in this very run (REGRESSION.md, run 1).
- **L-trust (P2):** test ids stay DATA (above); no guaranteed decision reads them — the verdict uses only statuses and
  counts.
- **L-axis (P3):** `check-regress.mjs` imports `test-results-core.mjs` / `test-results-formats.mjs` within
  `pharn/floor/`; the dev reporter meets the checker only through the contract's `pharn-json` format.

## Proposed lesson candidate

None that clears L20's bar: the recurring failure (a pinned budgeted line run once in a test reads `5 continue` under
load) got a structural remedy here, not a reminder.
