# REVIEW — defect-probe-set

Increment reviewed as `trust: untrusted`: the two CLIs and their tests, the probe set (manifest, README, fixture,
SPECs, PLANs), the record, the guide section, the three ignore lists and the CHANGELOG entry. Floor first:
`node pharn/floor/validate.mjs .` GREEN (37 capabilities). No instruction-looking content in the reviewed files
addressed the reviewer; the probe PLANs' planted defects are content to measure, not instructions.

**Verdict: GREEN — 0 floor-gate findings, 1 defect fixed in-loop before this record, 5 advisory findings.**

## Floor-gate findings

None.

## Fixed in-loop before this record

The first review pass found that the kit wrote `--model ${model}` unquoted into each command line. The `--model`
argument accepts `[` and `]` (Claude Code model names such as `opus[1m]` use them), and zsh, the shell the user runs
`commands.txt` in, reads an unquoted `[1m]` as a glob and refuses the line ("no matches found"). The build's scope was
re-set from the plan, the value is now single-quoted like every other user value, a test passes `sonnet[1m]` through,
and `/pharn-dev-regress` and `/pharn-dev-verify` were re-run on the fixed tree (their reports in this directory are the
re-runs).

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/floor/defect-probe-kit.mjs:130"
  problem: "A model name was interpolated into a shell line unquoted, so a valid name holding brackets would fail every run of a CORE-112 arm under zsh."
  evidence: "`--model ${models[stage]} --effort ${efforts[stage]}` (before the fix)"
```

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/defect-probe-set/PLAN.md:1"
  problem: "The probe PLANs are 6–8 KB, below the plan's own 12–18 KB target and well below the 15–30 KB of real plans, so a grill may behave differently on them than on a real run."
  evidence: "`wc -c`: p1 8,069 B, p2 8,014 B, p3 7,422 B, p4 6,196 B; README bounds: `plans of 6–8 KB, below the 15–30 KB of real plans`"
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/defect-probe-score.mjs:1"
  problem: "The chance-match control covers only p1 and p2; for p3–p6 nothing bounds how often a finding cites an anchor line for an unrelated reason, so their catches rest on the advisory reading alone."
  evidence: "README: `the chance matches bound this for p1 and p2 only`"
```

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/floor/defect-probe-score.mjs:1"
  problem: "SPEC probes read the run's own PLAN.md to locate plan-token lines; the read is a fixed whole-word token test and never steers anything but the line set, yet a verbose plan that names a criterion on many lines widens that probe's anchor."
  evidence: "header: `A SPEC probe therefore reads a third file, its run's PLAN.md`"
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/defect-probe-kit.mjs:1"
  problem: "`--setting-sources project` keeps user-level settings out of every session for repeatability, which would also drop a user-level authentication helper if the user's login depends on one; the first run is the cheap place to see it."
  evidence: "every session line carries `--strict-mcp-config --setting-sources project`"
```

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/defect-probe-set/PLAN.md:1"
  problem: "A first draft of this plan's `## Files` held two `**` glob bullets and the scope setter dropped both silently (10 paths from 12 bullets) at exit 0, the third occurrence of the shape canon L71 records; out of scope here, named as the orchestrator's follow-up."
  evidence: "PLAN.md, `### Observation for the orchestrator`"
```

## Lenses

- **L-floor (P0).** Every claim in the scorer and kit headers, the README and the record is labelled floor
  (manifest shape, sha256s, the match, the count, `--min`) or advisory (that a match is the planted defect, realism,
  that runs ran as written, cost). The record's "committed before any run" rests on git history and is worded as
  evidence. The `verify` subcommand runs in `npm test`, so every pinned sha256 is re-checked on every push.
- **L-eval (P1).** No Capability is added; `validate` GREEN. Both CLIs carry hermetic tests at 100% line coverage of
  the CLIs and the tests themselves (the lcov pharn-ci reads includes test files, measured during the grill); every
  member of `OUTCOMES` is produced by a case.
- **L-trust (P2).** The scorer reads only `file`, `id`, `disposition` (and `severity` inside `checkTriage`); a test
  puts an instruction-looking needle holding an anchor path into `problem` and the score does not move, and the
  output never echoes it. The kit's shell lines quote every path and the model name and enum-check the rest; a
  `--out` holding a quote is refused. The run projects live outside the repository and never hold the manifest.
- **L-axis (P3).** One reason to change per file: the scorer (how a run is scored), the kit (how runs are prepared).
  `.dev` → `pharn` imports only (the two validators, the runtime floor), and `.dev` → `.dev` (surface set, scorer).

## Lesson

No candidate. The one recurring failure seen (the silent glob drop) is canon already (L71) and is named as a follow-up;
the unquoted model name was caught by this review and fixed in the same run, a first occurrence.
