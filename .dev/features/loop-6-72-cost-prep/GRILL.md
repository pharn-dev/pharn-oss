# GRILL — loop-6-72-cost-prep

Plan: `.dev/features/loop-6-72-cost-prep/PLAN.md` · spec-hash: match (`2c84959c…12e`) · **Step 1b lessons
declaration: GREEN** (`check-plan-lessons.mjs` exit 0 — L11, L19, L66 resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194020 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 34 (revert). Not a finding: whether the plan needs or adequately
  declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is
  the observability griller's judgment.

## Findings

### Inline interrogation

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/loop-6-72-cost-prep/PLAN.md:94"
  problem: "The run-2 reset the prompt prescribes (`git checkout <SHA> && git clean -fdx -e node_modules`) would delete every file `pharn update` ADDED (untracked, new since 6.35) and would carry over the run's uncommitted edits to tracked files (a non-green stop commits nothing), so run 2 would start from a broken or contaminated install."
  evidence: "`~/Projects/pharn-starter-6.72/RUN-PROTOCOL.md` — the human's run protocol."
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/loop-6-72-cost-prep/PLAN.md:130"
  problem: "Under Q2 the slug is the run's own choice and the branch `pharn-loop/<name>` exists only after a green commit, so the prompt's fixed copy-out paths and `git branch -m pharn-loop/billing-plan-catalog …` may name nothing."
  evidence: "Each run is `/pharn-loop` followed by the SPEC's `## Intent` text"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/loop-6-72-cost-prep/PLAN.md:88"
  problem: "A new worktree carries none of the original checkout's gitignored local files (e.g. `.env*`), which the 2026-10-05 run had; gates that read them may behave differently, and `git clean -fdx` removes any added later."
  evidence: "`~/Projects/pharn-starter-6.72/` — `git -C ~/Projects/pharn-starter worktree add` at the baseline SHA (detached)"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/loop-6-72-cost-prep/PLAN.md:1"
  problem: "The plan does not name the toolchain inputs a comparison needs recorded: Claude Code version (2.1.286 on 2026-10-05), node and npm versions, and the stage-model routing the installed config gives."
  evidence: "no `claude --version`, node version or routing line among the readiness items"
```

### error-handling griller

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-6-72-cost-prep/PLAN.md:1"
  problem: "The plan names stop conditions for gate and SPEC failures but not for the install step's own failure modes: `pharn update` exits 1 off a TTY without `--yes`, keeps project-changed files unless `--force`, and a mid-way failure leaves a half-built worktree."
  evidence: "update keeps files the project changed unless `--force`, and never edits `.claude/settings.json`"
```

### Other grillers — no finding (reason)

- a11y, i18n: no user interface is built.
- architecture, coupling: no product structure changes; the record lives in `.dev/measurements/`, beside its
  predecessor.
- comprehension, documentation: the plan's Discovery section states the why of each choice; the prep record is
  itself the documentation.
- migrations: the scanner's line-34 hit (`revert`) is the SPEC's state revert, incidental; no persisted schema is
  touched.
- observability, performance: nothing is deployed or run at scale.
- privacy: no personal data is read or copied; `.env*` is NOT copied (finding 3).
- security: `npm i -g` installs the maintainer's own published CLI; `npm ci` at the base lockfile reinstalls the
  dependencies the 2026-10-05 run used, locally only. Noted, no finding.
- testability: present — the guarantee audit names each check (sha256 compare, `SKILLS_VERSION` read, `pharn status`).

## Summary

The main risk is finding 1: as written, run 2 would not start from the tree run 1 started from. The faithful analog
of the 6.35 run, whose base commit already contained PHARN 6.35, is a local commit of the 6.73.1 install on top of the
baseline, with the reset going back to that commit. That changes the protocol's wording, so it goes to the human with
evidence from the actual install. Findings 2–5 are handled in the build by recording, not by changing the project.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 5 advisory: 2 important, 3 minor) — for the human to weigh
before /pharn-dev-build.
