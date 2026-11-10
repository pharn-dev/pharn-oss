# GRILL — spec-unscopable-criteria

Plan: `.dev/features/spec-unscopable-criteria/PLAN.md` · spec-hash: match (`ab4dbd92…c7fd`) · Step 1b lessons
declaration: **GREEN** — `applied_lessons: L6, L29, L34, L35, L60, L67, L74, L80, L81`; all 9 cited ids resolve and
are referenced in the plan body (the checker verifies the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — each gates nothing)

### coupling / determinism

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/spec-unscopable-criteria/PLAN.md:29"
  problem: "In a dev or unsignalled tree the setter refuses instruction files and PHARN's surface only while a product run marker is open, and /pharn-ship opens its marker in pharn-ship-stages.md, after GATE 1 approves the SPEC; so at /pharn-ship's spec stage the CLI reports CLEAR for a criterion the plan stage will then refuse. /pharn-loop opens its marker at Step 1a, before the spec stage, so it is consistent."
  evidence: "in a dev or unsignalled tree it refuses those two only while a product run is open, and the CLI then reports nothing — which is exactly what the plan stage would meet."
```

The plan's sentence is true for `/pharn-loop` and false for `/pharn-ship` outside an installed project. The measured
case (an installed project) is posture-independent. Suggested handling at build: state the gap as a named bound in the
CLI header and the `/pharn-spec` claims block, not a code change (making the setter see a run that is not open would
need a marker write).

### error-handling / P0

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/spec-unscopable-criteria/PLAN.md:57"
  problem: "Under --model-approve an exit 2 (check did not run) only gets 'say the check did not run'; with no reader the model then approves unchecked, which is the measured failure's path, silently."
  evidence: "Step 3, after the Draft validates GREEN: run the CLI (pinned line). Exit 2 → say the check did not run and why; it never blocks."
```

Suggested handling: under `--model-approve`, an exit 2 becomes one `## Assumptions` line ("not checked: …") so the
SPEC itself carries it, matching how Step 2 turns every other unanswerable warning into an Assumptions line.

### performance

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/spec-unscopable-criteria/PLAN.md:42"
  problem: "The per-token attribution spawns once per unique token with no cap; a long SPEC whose batch is refused could spawn dozens of Node processes, each re-reading git config."
  evidence: "Non-zero → one spawn per token to attribute"
```

Bounded by SPEC size and only taken on a refusal; acceptable as stated, or cap the token count and report UNUSABLE
over it.

### comprehension

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/spec-unscopable-criteria/PLAN.md:37"
  problem: "Why leading `./` and `../` are stripped (not only `/`) is not stated; stripping `../` makes a criterion's `../CLAUDE.md` read as the project's own CLAUDE.md."
  evidence: "strip leading `-`, `/`, `./`, `../` (repeated)"
```

The reason (the setter refuses any `..`-escaping entry in every posture, so unstripped it would flag every relative
path for a reason unrelated to this check) belongs in the CLI header.

## Grillers with no finding

- architecture — fit recognized: a floor CLI spawning the setter by its cwd-relative path follows `loop-closeout.mjs`;
  the new exports sit beside the AC parser they reuse; no sibling capability reference.
- coupling (other than the ordering above) — the CLI reads the setter's exit code only; the renderer copies a SPEC
  section through the core export, never through the CLI.
- documentation — present: a floor-guide section, a `pharn/floor/README.md` row, the run-report guide note, CHANGELOG.
- error-handling (other than the finding) — exit 2 paths enumerated, spawn timeout declared.
- security — scanner clean; tokens come from a closed alphabet, reach the setter as an argv-vector child and a temp
  file under `mkdtemp`, never a shell; the setter's stderr is discarded. No concern warranted.
- testability — presence recognized: both directions, the class enumeration, posture controls, UNUSABLE paths, P2
  output, the L81 import guard.
- a11y, i18n, privacy — no UI, no user-facing localized text, no personal data.
- migrations — no persisted-data shape changes.
- observability — a deterministic CLI and a rendered report; its output is the observation.

## Summary

The design reuses the setter as the one owner, which the human accepted at GATE 1. The one substantive gap is the
`/pharn-ship` ordering in non-installed trees (the CLI is consistent with the plan stage for `/pharn-loop` and for any
installed project, not for `/pharn-ship` in a dev or unsignalled tree), which should be stated as a bound. The second
is making an unrun check visible in the SPEC under `--model-approve`.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
