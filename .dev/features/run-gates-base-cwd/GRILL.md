# GRILL — run-gates-base-cwd

Plan: `.dev/features/run-gates-base-cwd/PLAN.md` · spec-hash: **match** (`2f8b9264…e838`) · Step 1b
lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0).

Grillers: 13 registered. The five deterministic plan scanners (`i18n`, `migrations`, `observability`,
`pii`, `secrets`) all reported no hits. The a11y, i18n, privacy, migrations, observability and
performance axes do not apply to a path-resolution fix in a CLI. Testability, error-handling, security
(containment) and documentation were applied inline below.

## Findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/run-gates-base-cwd/PLAN.md:75"
  problem: "The plan says the test executes 'the committed pharn-regress.md pinned lines', but the Step-3 scope line cannot be run verbatim: its operands are placeholder lists (`<inside, comma-separated>`, `<the project's test files …>`). Unless the plan says which lines run verbatim and which input the fixture supplies, the test's claim is wider than what it executes."
  evidence: "(2) the committed `pharn-regress.md` pinned lines, extracted and executed one block per shell, through `check-regress.mjs verdict`"
```

Recommendation: execute verbatim, with only `<name>` / `<base SHA>` / `<the resolved 40-hex base SHA>`
substituted, these lines: the worktree `add`, the head `init`, the base `init`, both `run --next`
drains, the Step-5 `verdict` block, and the Step-6 worktree `remove`. Have the fixture write
`scope.json` itself, and name that input as fixture-supplied in the test header. The `scope`
partition is not the defect under repair.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/run-gates-base-cwd/PLAN.md:71"
  problem: "The rule 'every path operand resolves against the invoking directory' is not complete without the corollary that `run --next` must be issued from the same directory as `init`. The in-progress record stores `--cwd` as given (relative), and `--out` is resolved per call, so a drain from another directory reads a different record."
  evidence: "resolve `--out`, `--spec-from`, `--discover` and `--scope-json` against the invoking directory, in both `init` and `run --next`"
```

Recommendation: state it in the runner header and the contract bullet. No code is needed: every pinned
caller issues both subcommands from the repo root.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/run-gates-base-cwd/PLAN.md:138"
  problem: "Moving `--discover` and `--scope-json` to the invoking directory changes behaviour for no current caller. The plan's argument (one rule, not two) is sound, but the CHANGELOG must say it is a no-op for every pinned caller, so a reader does not look for a second defect."
  evidence: "`--discover` and `--scope-json` are behaviour-identical for every current caller (none passes `--cwd`)"
```

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/run-gates-base-cwd/PLAN.md:109"
  problem: "The 'survives git worktree remove --force' claim is only worth something if the stamp is RE-READ after the removal. Checking that the file exists after the removal proves the location, not that `check-regress.mjs verdict` still accepts it."
  evidence: "which survives `git worktree remove --force`"
```

Recommendation: after the pinned removal line, re-run the verdict block and assert exit 0.

## Summary

The diagnosis is right, and it is reproduced rather than reasoned: the pinned base `init` fails on
`--spec-from` before `--out` is even reached. The fix belongs in the runner, not the command. Both
subcommands must agree on where records live, and only `init` takes `--cwd`, so "the invoking
directory" is the only root both can share. Containment stays as strict as before, just against the
root the drain actually uses. The main risk is the test over-claiming what it executes, which finding 1
addresses.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 1 important, 3 minor) — for the human to weigh
before `/pharn-dev-build`. The Step 1b floor verdict is GREEN and is reported above, separately.
