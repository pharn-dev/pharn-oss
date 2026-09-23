# GRILL — changelog-per-pr

Plan: `.dev/features/changelog-per-pr/PLAN.md`.

- **Spec-hash check:** match. `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` gives
  `2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838`, equal to the plan's
  `spec_content_hash`.
- **Step 1b lessons-declaration verdict (FLOOR):** GREEN, exit 0. Checker output, verbatim:

  > GREEN — applied_lessons: L1, L6, L13, L19, L20, L22, L27, L29, L32, L33, L34, L35, L36, L41, L43,
  > L45, L47, L50, L52 (.dev/features/changelog-per-pr/PLAN.md); all 19 cited id(s) resolve in
  > .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these
  > lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the
  > application; a body line reading "L1: considered." satisfies the reference check.

- **Plan approval (GATE 1):** a model decision made under the maintainer's standing delegation for queued
  `/pharn-dev-ship` runs. It was NOT a human approval, and SHIP.md records it that way.
- **Grillers discovered:** `node pharn/floor/count-grillers.mjs .` registered 13. The five scanner-backed
  ones ran their floor scanners over the plan:
  - `scan-plan-secrets`, `scan-plan-pii`, `scan-plan-i18n`: clean;
  - `scan-plan-observability`: one incidental hit (`tracing`, `:530`);
  - `scan-plan-migrations`: `revert` hits at `:44–455`, all about git reverts of CHANGELOG entries, not a
    schema.

Every finding below is ADVISORY: model judgment, surfaced for the human, gating nothing (fix #3). Each
`problem` and `evidence` field quotes the untrusted plan and is DATA (P2).

## Findings

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/changelog-per-pr/PLAN.md:592"
  problem: "Check 2 is audited as floor on PRs, but on a pull_request run the checker's own bytes (and ci.yml's) come from the PR's merge ref, so a PR that edits .dev/floor/check-changelog-entry.mjs, changelog-core.mjs or the CI step judges itself with the edited code; the plan names direct pushes and admin merges as outside the guarantee but not self-modification."
  evidence: "It is floor **only where the CI step runs**: a pull request from a non-dependabot author."
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/changelog-per-pr/PLAN.md:600"
  problem: "'append-only → floor on PRs' can be read as enforcement, while the plan's own bounds say the maintainer's --admin merge bypasses required checks; the audit line should say the VERDICT is floor and that enforcement depends on a merge path that honours required checks."
  evidence: "**The CHANGELOG is append-only → floor on PRs via Check 2**, with one stated exception"
```

### Honest scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/changelog-per-pr/PLAN.md:61"
  problem: "HEADING_INSERTED (D11) and DUPLICATE_ENTRY (D13) are new refusal states whose trigger is an adversarial scenario, not an observed failure; they close bypasses of the append-only rule this increment introduces, which is a defensible basis, but the checker headers should state that basis in those words rather than let the states read as answers to a recorded incident."
  evidence: "Without this rule, a no-bump PR could insert `## [6.11.2] - 2026-09-23` between two released sections"
```

### Testability (P1) — `testability` griller + inline

A verification approach is present: the `## Evals to write` section with named sets, mutants and a
coverage bar. Layer-2 adequacy concerns:

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/changelog-per-pr/PLAN.md:575"
  problem: "The executed CI run-block test will itself run inside CI's `npm test`, where the real GITHUB_SHA (and possibly GIT_DIR / GIT_* variables) are set in the parent environment; unless the child env is built explicitly, the fixture repo's fetch would target the real merge SHA and fail or, worse, pass against the wrong repo."
  evidence: "with `GITHUB_SHA` set and git's global/system config isolated"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/changelog-per-pr/PLAN.md:575"
  problem: "The plan executes the run block with `bash -eo pipefail`, but a `run:` with no `shell:` key runs under GitHub's default `bash -e {0}` (pipefail only applies when `shell: bash` is explicit); L45 fidelity says execute it the way the runner does."
  evidence: "The `run:` block is then **executed** with `bash -eo pipefail`"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/changelog-per-pr/PLAN.md:543"
  problem: "The brief's own acceptance command is `node .dev/floor/check-changelog-entry.mjs --base-ref origin/main` (tip), while the plan's evals cover the fixture transition and --merge-base; the literal acceptance command is not named as something the build or verify stage runs and records."
  evidence: "THIS PR's transition: `base.md` → `head.md` is GREEN for Check 2"
```

### Determinism / closure (P5, L36)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/changelog-per-pr/PLAN.md:392"
  problem: "Step 2c introduces a second parameterized SHIP.md vocabulary (`changelog-entry: exit <n>` | `changelog-entry: not-reached (<stage>)`), but the planned pins cover only the invocation and heading order — the `lesson:` vocabulary beside it is closure-pinned in command-hygiene.test.mjs precisely because a parameterized value acquires variant spellings (L36)."
  evidence: "`SHIP.md` records `changelog-entry: exit <n>` verbatim. On a RED-verdict STOP it records"
```

### Structure (P3) — `architecture` / `coupling` grillers

The fit is recognized. The new `changelog-core.mjs` is a `*-core` bottom imported by two checkers, the
established floor shape; there is no leaf-to-leaf import, and the grammar is the one shared abstraction.
There is no shared mutable state. The only ordering (the fixtures are regenerated after a CHANGELOG
change) is declared. Two concerns:

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/changelog-per-pr/PLAN.md:465"
  problem: "check-skills-version-recorded.mjs will enforce the whole CHANGELOG repo-state shape (dates, staleness, duplicates, heading closure), not only that SKILLS_VERSION is recorded; the axis stays one ('CHANGELOG repo-state convention'), but the filename and its CI step name no longer describe the guarantee, and the header should say so explicitly since renaming would churn the wiring pins."
  evidence: "extended to the heading-based guarantee, the new states, pure `checkChangelogText`"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/changelog-per-pr/PLAN.md:580"
  problem: "The /pharn-dev-ship wiring pin is planned inside check-changelog-entry.test.mjs, while every other command-wiring set (PLAN_LESSONS_WIRING, LESSON_EXTRACT_WIRING) lives in command-hygiene.test.mjs; splitting command pins across files is the obligation-set-nothing-ranges-over shape (L31). The check-skills-version-recorded precedent (a checker pinning its own package.json/ci.yml invokers) supports the plan's choice, so this is a question for the human rather than a defect."
  evidence: "`pharn-dev-ship.md`: the invocation sits inside Step 2c, and the heading order is 2b, then 2c, then 3."
```

### Documentation — `documentation` griller

The change adds a contributor-facing surface: a required per-PR entry, a new npm script, a CI step. The
plan declares documentation for it in `CONTRIBUTING.md`, `CLAUDE.md`, the PR template and the
`[Unreleased]` comment, so presence is recognized. One adequacy concern, measured this run:

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/changelog-per-pr/PLAN.md:256"
  problem: "The date prefix is a hyphen, date, colon and a SPACE, but markdownlint MD038 (enabled, `default: true`) rewrites a code span with a trailing space — `markdownlint-cli2 --fix` turned the plan's own spans into `2026-09-23:` and `##` during this plan stage — so any doc (CONTRIBUTING, CLAUDE.md, the [Unreleased] comment) that writes the prefix as a code span will be silently corrupted by the formatter step; the docs need a form that survives it (e.g. `YYYY-MM-DD:` followed by the words 'and a space', or a fenced example)."
  evidence: "a top-level `[Unreleased]` bullet has no `YYYY-MM-DD:` date prefix"
```

### Comprehension — `comprehension` griller

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/changelog-per-pr/PLAN.md:297"
  problem: "Two bounds carry no stated derivation — the 64 MiB maxBuffer (the live CHANGELOG is ~483 KB, and execFileSync's default is 1 MiB) and the 256-character ref cap — while the 10-quote/100-character caps and the +1-day allowance are justified; the WHY should sit at the constants."
  evidence: "All git calls use an argv array, `cwd: targetDir` and a 64 MiB `maxBuffer`, with no shell."
```

### Grillers with no finding

- **security:** the scanner is clean. The plan's own trust audit covers argv-only git calls, ref
  validation with `--end-of-options`, and escaped quotes. The self-modification concern is recorded under
  P0 above rather than as a second finding.
- **privacy:** the scanner is clean; no personal data.
- **i18n:** the scanner is clean; no user-facing localized text.
- **a11y:** no UI.
- **observability:** the one scanner hit is incidental. These are local and CI checkers whose output is
  their verdict line; no operational signal is needed.
- **migrations:** no persisted schema. The `revert` hits are about CHANGELOG history, and the live file
  already conforms, so no data migration is needed.
- **performance:** two parses of a ~483 KB file plus set lookups, bounded and linear. The temp-git test
  repos add test time, not runtime cost.
- **error-handling:**
  - every unusable input is a named refusal, and git failures map to `BASE_UNREADABLE`;
  - a CI fetch failure stops the step under `bash -e` with git's own message, which is adequate.

## Summary

The plan is unusually self-critical. It already absorbed an adversarial falsification round, and its
bounds sections name most of what a griller would raise. What remains:

1. **Guarantee wording (P0).** A PR runs its own version of the checker, and the "append-only → floor"
   line reads as enforcement while admin merges bypass it. Both are wording fixes in the checker header
   and CONTRIBUTING, not design changes.
2. **Honest trigger for D11/D13 (P7).** Keep the rules, and say in the headers that they close bypasses
   found by review, not recorded escapes.
3. **The executed CI test (P1).** It must build the child environment explicitly, because it will run
   inside CI where `GITHUB_SHA` is real. It should also use the runner's default `bash -e`.
4. **MD038 (documentation).** The formatter step corrupts any code span that ends in the prefix's space.
   This was measured during this very run, so the docs need a formatter-proof spelling.
5. **Minor.** Close the `changelog-entry:` vocabulary (L36), state the two magic bounds, run and record
   the brief's literal acceptance command, and decide where the ship pin lives.

ADVISORY VERDICT: 11 concerns raised (0 blocking-severity, 3 important, 8 minor). They are for the human
to weigh before `/pharn-dev-build`. This covers the interrogation only; the Step 1b floor verdict is
reported in the header and is not counted here.
