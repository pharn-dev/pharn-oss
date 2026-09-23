# GRILL — pharn-test-stage

Plan: `.dev/features/pharn-test-stage/PLAN.md` (approved at GATE 1 by the model under the user's overnight delegation,
2026-09-24 — a delegated model decision, never a human approval). Spec-hash check: `pharn/ARCHITECTURE.md` digest
`edc3d07d…ce091a5d2c` **equals** the pin. **Step 1b lessons-declaration verdict (FLOOR): GREEN**
(`check-plan-lessons.mjs` exit 0). That covers the DECLARATION only.

Method: the inline Step-2 axes, the 13 registered grillers applied inline, and one independent read-only agent that
probed the plan against the live code (it ran only read-only `## Files` parser calls). Its findings are below as it
reported them; the plan's "Amended after grill" section records what was adopted and what was declined.

## Findings (independent agent, confirmed)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: blocking
  file: "pharn/floor/check-model-config.mjs:351"
  problem: "The reverse pass derives a stage from the command FILE NAME (`pharn-test.md` → `test`), so a map key `ac-test` pointing at `pharn-test.md` is reported as unmapped drift and the live test at check-model-config.test.mjs:425-437 fails."
  evidence: "if (Object.hasOwn(PRODUCT_STAGES, m[1])) continue;"
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/floor/plan-files-core.mjs:109"
  problem: "The core lacks the setter's wrapped-continuation exemption (set-writes-scope.cjs:267-273) that its header claims, so a wrapped `## Files` line containing 'out-of-scope' truncates the core's list while the setter keeps going — `in-plan-files` could pass while the build's scope still names the AC test."
  evidence: "// Boundary 2 — CUE fallback, with the path-item and blockquote exemptions."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/pharn-test-stage/PLAN.md:83"
  problem: "Adding the two names to reconcile-ignore's exempt list (forced by the parity test) exempts a build-window Bash write to AC-TESTS.md or the lock, though both are written before the anchor and have no reason to change after it; with the --declared union, a build could remap an AC to its own file and re-lock unseen."
  evidence: "`pharn/floor/reconcile-ignore.json` — the same two names in `pipeline_artifacts.names` (pinned copy)"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/pharn-test-stage/PLAN.md:147"
  problem: "'the build cannot write an AC test file' holds only while PLAN.md is unchanged after the check; /pharn-build does not re-run it, and the plan labels the claim floor without that bound."
  evidence: '"the build cannot write an AC test file" → floor: hook (fix #7)'
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/pharn-test-stage/PLAN.md:62"
  problem: "AC-TESTS.md frontmatter is unspecified; check-plan-spec-agree.mjs requires both spec_id and spec_content_hash, prints RED text naming PLAN.md, and exits 1 (not 2) on an unreadable file."
  evidence: "`pin`: `check-plan-spec-agree.mjs <AC-TESTS.md> <SPEC.md>` exits non-zero"
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/pharn-test-stage/PLAN.md:85"
  problem: "The brief's piece 4 is unspecified in the plan: the Step-0 scope and --clear, a separate PLAN↔SPEC chain check, the AC-<n>: leaf-title rule items 04/06 depend on, the lock re-scope (a Bash write), and model/effort frontmatter."
  evidence: "`.claude/commands/pharn-test.md` — NEW product command — product command"
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".claude/commands/pharn-spec.md:114"
  problem: "Docs that go stale are unlisted: pharn-spec.md says PHARN does not yet write acceptance tests; LIMITS.md, pharn.config.json, README and CLAUDE.md count 'ten' product commands; the fingerprint says 'exactly four' INCLUDED names."
  evidence: "PHARN itself does not yet write … acceptance tests"
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/pharn-test-stage/PLAN.md:75"
  problem: "The runbook asks for existing tests unchanged; the plan edits check-model-config.test.mjs without recording the deviation, and names no coverage method."
  evidence: "`pharn/floor/check-model-config.test.mjs` — its mirror of the set"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/pharn-test-stage/PLAN.md:121"
  problem: "`unmapped-file` plus the hook mean /pharn-test can write only mapped test files — no shared helper or fixture — a bound worth stating."
  evidence: "`unmapped-file`   | a `## Files` entry is mapped by no line"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/pharn-test-stage/PLAN.md:119"
  problem: "The checker should refuse `## Files` entries the setter silently drops (placeholders, globs), non-normalized paths, and paths under always-writable `.pharn/` or `pharn/features/`."
  evidence: "`unlisted-file`   | a mapped test file is not in AC-TESTS.md `## Files`"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/pharn-test-stage/PLAN.md:70"
  problem: "The hook-deny test is a second reason for check-ac-tests.test.mjs to change; the red_run/test_infra placeholders reserve structure for undesigned items."
  evidence: "One fixture per rule, the AC export, and the hook-deny test"
```

The agent also listed the command-hygiene rules a new product command must satisfy (forbidden repo-wide
formatters, `--no-globs` on markdownlint, `--target` on every `--from-frontmatter`, the release-step pointer and the
exact `--clear` line, no dev-canon citation, no mark-phase/run-gates call, artifact names in `PIPELINE_ARTIFACTS`,
model/effort equal to the config). They are build requirements, not findings.

Grillers (13): `security` and `privacy` coincide with the pre-anchor and path findings; the others raise nothing
beyond the findings above for a stage that writes tests and a lock.

## Summary

Two real defects the plan would have shipped: a checker that REDs its own new stage, and a parser divergence that
makes the build-exclusion check fail open. The rest tighten honesty (bounds, frontmatter, stale docs) and harden
the path rules. All but two minors were adopted (see PLAN.md, "Amended after grill").

ADVISORY VERDICT: 11 concerns raised (2 blocking-severity, 6 important, 3 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this count.
