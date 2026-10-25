# REVIEW — stage-agent-background-wait

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`. Everything below is
advisory. The increment under review was read as `trust: untrusted`; no instruction-looking content in it changed this
review.

## Floor-gate findings (blocking)

None. Every guarantee the increment claims reduces to a floor primitive or is labeled advisory (L-floor below), no
capability or `enforces` binding was added (L-eval), and no sibling reference was introduced (L-axis).

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-agent-core.mjs:741"
  problem: >-
    A stage-start marker whose `ts` is later than the clock at finish time (a clock stepped back between `start` and
    `finish`) reads `unanchored`, so a background-launched stage then stops S9 with no wait. The safe direction (never
    a longer wait), but not named in the residual.
  evidence: 'if (!finite(anchorMs) || !finite(nowMs) || anchorMs > nowMs) return { decision: "unanchored", sleepMs: 0 };'
```

### L-trust → P2

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".claude/commands/pharn-loop.md:61"
  problem: >-
    The `TaskStop` grant is unscoped — it pre-approves stopping any background task of the session, not only the stage
    agent — and the operand is an id read from the Agent tool's free-text result. The command bounds the use to that
    one agent and labels it ADVISORY; nothing structural narrows it.
  evidence: '"TaskStop",'
```

### L-axis → P3

No finding: the pure decision (`waitDecision`) is in the core and the I/O (the poll, the lstat walk, the anchor read)
in the CLI; the wait reuses `walkStateDirs`, `resultKind` and `latestMarker` rather than copying them.

### Style (fixed in this review)

- `.claude/commands/pharn-loop.md` item 3 had one prose line over the repo's 120-column wrap (prettier and markdownlint
  do not wrap prose here). **Fixed:** re-wrapped; whitespace only, no word changed. Re-checked after the fix: prettier,
  markdownlint, and the command hygiene, family, stage-load and command-section suites (335/335).

## Checked and holding

- `/pharn-ship` is untouched: no ship file is in the diff, and a closure test pins that no ship-family finish line
  carries `--budget-ms` while every loop-family one carries exactly `--budget-ms 570000` (L27/L36).
- The no-flag path (`finish` without `--budget-ms`) is exercised by its own test, with today's defect code (L41).
- No trusted doc states the changed residual; `THREAT-MODEL.md §5` channel 4 stays true.
- The sweep in `PLAN.md` Design §6 was re-run: every hit is edited or still true as dispositioned;
  `pharn-loop-close.md:221` ("A stage agent that may still be running (a backgrounded call, S9)") stays true for the cap
  and crash cases.

## Verdict

GREEN — 0 floor findings; 2 advisory findings (1 important, 1 minor), not fixed: both are bounds of the approved design,
for the human at GATE 2; 1 style fix applied.

## Proposed lesson candidate

None. The one build-time surprise — `set-writes-scope.cjs --from-plan` taking only literal one-path bullets, so a glob
or multi-path `## Files` bullet is dropped — is already canon (L71's under-grant), and was caught here by reading the
setter's path count, which is the remedy L71 names.
