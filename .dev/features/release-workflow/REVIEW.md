# REVIEW — release-workflow

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities` (also gated by verify, PASS).
Everything below is advisory.

**Verdict: GREEN — 0 floor-gate findings; 5 advisory findings.**

## Floor-gate findings (blocking)

None. No capability is added, so no eval binding applies (L-eval); no sibling reference (L-axis); every guarantee
sentence in the diff is either bounded in place or names the workflow as its owner (L-floor, below).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/release-workflow/PLAN.md:193"
  problem: "The plan's human step 1 (run release.yml by hand once after merge) is probably unnecessary: the merge of this pull request is itself a push to main with the workflow present, so that push's own run should create v7.1.2 after its checks pass."
  evidence: "After merge, run `release.yml` once via `workflow_dispatch` on `main` → creates `v7.1.2`"
```

Remedy: the PR description says "watch the merge's own `release` run; dispatch only if it fails". Not verified on
GitHub — the first real run is the only test of the API calls and permissions.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CONTRIBUTING.md:89"
  problem: "'An [Unreleased] merge is not a release. Its version is already tagged' is false until the first release exists: this very PR is an [Unreleased] merge and its push run tags v7.1.2."
  evidence: "**An `[Unreleased]` merge is not a release.** Its version is already tagged, so the job finds the tag and stops."
```

Remedy (one clause, CONTRIBUTING only): "Once its version is tagged, an `[Unreleased]` merge finds the tag and stops."
The CHANGELOG entry's "releases nothing new" holds (v7.1.2's content shipped in #401).

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "README.md:119"
  problem: "The README recommends `--ref latest` in the install command, and until the first release exists that command exits 1 (it names `--ref main`); the window is from merge to the end of the first release run, about 12 minutes if nothing fails."
  evidence: "npx @pharn-dev/pharn@latest init --ref latest"
```

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/floor/release-workflow.test.mjs:1"
  problem: "One build edit to this in-scope test file was made through a Bash (python) replace rather than the Edit tool, which passes neither PreToolUse guard; reconcile reads CLEAN only because the path was in the plan's scope."
  evidence: "python3 - <<'EOF' … open(p,'w').write(s)"
```

Discipline note, no code change. Reconcile is the floor here and it held (the path is declared).

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/release-workflow/PLAN.md:124"
  problem: "`check-skills-version-recorded.mjs` is declared in ## Files but was left unchanged: its 'every merge to main is a release' sits in the dated 'WHY IT GREW — the changelog-per-pr trigger' record, which describes the reasoning at that time (L78 dated-record class)."
  evidence: "`.dev/floor/check-skills-version-recorded.mjs` — `:69` header comment only, per D4"
```

## Lens notes

- **L-floor (P0).** Restatements of the gate were grepped in the diff (L64): CLAUDE.md and README were narrowed
  during regress to "the required checks that run on a push"; CHANGELOG and CONTRIBUTING name the four checks and the
  excluded PR-only one in the same paragraph. The workflow header calls the gate a workflow property, not a floor
  primitive, and lists what it does not stop (owner bypass onto `main`, manual tags, ruleset drift, pending-run
  cancellation).
- **L-eval (P1).** No capability. `changelog-section.test.mjs` (11 tests) and `release-workflow.test.mjs` (37 tests)
  pin the YAML and execute every `run:` block against a stub `gh`, with negative controls (moved tag, failed check,
  wrong app, empty list, non-main ref, bad version). The `--jq` filters run through `jq` (skipped where jq is absent;
  CI has it). The stub's unmodelled surface is listed in the test header (L67).
- **L-trust (P2).** No reviewed file carried instruction-like text. The release body is CHANGELOG text passed as a
  file; `SKILLS_VERSION` is regex-checked before use; check names and conclusions are compared by string equality,
  now also on the app slug.
- **L-axis (P3).** `changelog-section.mjs` reuses `changelog-core.mjs` (L35); the workflow is one job with five steps,
  each with one job to do; the tag regex is one exported constant plus a pinned env literal.

## Lesson candidate

None proposed. The run's surprises are already canon: a git-ignored scratch file reddening `lint:md` is L61; editing
an artifact after its format step is L13's discipline. The `.pharn/ci.yml` slip (moving a directory that holds a
tracked file under an ignore exception) is a one-off, caught by reconcile as designed.
