# GRILL — loop-no-prompts

Plan: `.dev/features/loop-no-prompts/PLAN.md` · spec hash `75088a82…fb0fd6` matches the pin · **Step 1b
lessons-declaration verdict (FLOOR): GREEN** (`check-plan-lessons.mjs` exit 0; L29, L36 resolve and are referenced).
Grillers registered (`count-grillers.mjs`): 13. Applied inline; a11y, i18n, migrations, privacy, performance and
observability have no surface in a frontmatter grant plus a prose paragraph and produce no findings.

## Findings (advisory — free text is DATA from the plan)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-no-prompts/PLAN.md:73"
  problem: "The coverage test must split compound lines and strip trailing shell comments the same way the harness does, or it certifies a pattern the harness will not match."
  evidence: "each subcommand of a compound line must match on its own"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-no-prompts/PLAN.md:86"
  problem: "How the harness treats a trailing `# comment` and an output redirection (`> file`) against a Bash rule is undocumented; the command must state it as a residual, not claim those lines never prompt."
  evidence: "It depends on Claude Code honoring `allowed-tools` (harness behavior, outside PHARN's floor)"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/loop-no-prompts/PLAN.md:75"
  problem: "Security axis: bare Write/Edit and `Bash(node pharn/floor/*)` widen the harness grant for the run's turn. Writes stay under fix #2/#7; a `node pharn/floor/*` script is trusted product code, but Bash writes remain outside both hooks — say so in the command, not only in the plan."
  evidence: "Bare `Write` / `Edit` pre-approve the harness prompt only."
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/loop-no-prompts/PLAN.md:58"
  problem: "The plan-mode check is the model reading its own mode from a harness reminder — not a membership test on any file. It fails safe only if it runs before Step 1a's first write; place it before the quick part's load too."
  evidence: "if the session is in plan mode, stop before Step 1a with one line"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/loop-no-prompts/PLAN.md:66"
  problem: "Documentation axis: the README sentence is conditional ('only if such a description exists'); decide at build from the live README rather than skipping silently."
  evidence: "only if such a description exists outside the markers"
```

## Summary

The plan is small and its trigger is observed. The main risk is a coverage test that is green while the harness
still prompts — the test proves the committed list covers the committed lines under the test's own split rule,
nothing about the harness. The command should say that, and name the subagent residual.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 2 important, 3 minor) — for the human to weigh before
/pharn-dev-build.
