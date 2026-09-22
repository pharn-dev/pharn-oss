# REVIEW — run-gates-base-cwd

**Floor:** `validate` GREEN. The standing verdicts are verify `PASS` (`reconcile` CLEAN, 2511/2511 tests)
and regress `no-regressions`. Everything below is advisory. The increment was reviewed as
`trust: untrusted`, and nothing in it read as an instruction.

## Floor-gate findings (blocking)

None. Every claim reduces to a floor primitive or carries an advisory label:

- Where records land is a resolved-path containment comparison, primitive #3. The new tests exercise it
  with a non-`.` `--cwd`.
- "The committed base-side lines produce a stamp and a verdict" is executed, not asserted. The ★ WIRING
  test runs the lines extracted from `pharn-regress.md`. That a real run executes them stays advisory
  orchestration, and the plan says so.

No Capability was added, so no eval binding is owed.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/run-gates.test.mjs:3"
  problem: "The suite header claims every test exercises 'what a command's pinned Bash line produces'. That claim was false for the whole release line: the tests drove the real CLI with HAND-TYPED arguments, and the one pinned line that passes --cwd was never executed. That gap is exactly how the base-side defect survived. Driving the CLI is not executing the invocation."
  evidence: "Every test drives the REAL CLI as a subprocess, because the property under test is what a command's pinned Bash line produces"
```

Correction: narrow the header to what it tests. Say that driving the CLI covers the script, and that
only the ★ WIRING test executes committed lines, for `/pharn-regress`'s base side. `/pharn-verify`'s
pinned lines are still exercised only through equivalent hand-typed arguments. This is within the
planned files, so the decision is **fix** (below).

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/run-gates.mjs:624"
  problem: "`run --next` reads `<out>/state.json` before it asserts containment, so a mis-pointed --out is READ (never written) before the refusal. This ordering predates the increment and is unchanged by it. Every write and the lock still come after the check."
  evidence: "if (!existsSync(statePath)) {"
```

No change here. It is recorded so the header's "checked once per invocation, before anything is
created" is not read as "before anything is read".

## Lens notes

- **L-floor (P0).** The fix TIGHTENS containment rather than loosening it. Before, `--cwd X` made `X/.pharn/`
  the state root, so a caller could have the runner write into another tree's `.pharn/`. Now the root is
  the invoking directory's `.pharn/`, which is what the contract's "writes ONLY inside the state root"
  was read as meaning.
- **L-eval (P1).** Seven of the new tests fail against the pre-fix runner, and that was measured by
  swapping the file. The eighth is the counted-set guard, which passes by construction. The operand set
  is materialized and counted (L52/L34). The WIRING test copies exactly the five floor modules the lines
  import, so a new import fails loudly instead of silently narrowing the test.
- **L-trust (P2).** No new input is ingested. The command text the WIRING test reads is trusted repo
  content, used only as a shell string in a throwaway fixture.
- **L-axis (P3).** The runner still changes only when execution changes. The contract gains one bullet
  on which directory a path means. No sibling reference.

## Verdict

GREEN at the floor. There are 2 advisory findings (1 important, 1 minor), and the important one will be
fixed within the planned files.

## Proposed lesson candidate

None. This is a recurrence of **L45** (a fix inside a tool while the invoking file keeps the defect,
invisible to a suite that spawns by path) and **L41** (a default every test uses, so the non-default
value is untested). This increment applied L45's own remedy: it executes the committed invocation. A
new entry would restate L45 (P4). The generalization worth watching is that "drives the real CLI" was
read as satisfying L45 when it does not. If that recurs a second time, it will meet L20's bar.
