# GRILL — verify-head-gate-reuse

Plan: `.dev/features/verify-head-gate-reuse/PLAN.md`. Spec-hash check: `node .dev/floor/hash-doc.mjs
pharn/ARCHITECTURE.md` → `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, equal to the plan's
`spec_content_hash` (no drift). **Step 1b (FLOOR):** `node pharn/floor/check-plan-lessons.mjs
.dev/features/verify-head-gate-reuse/PLAN.md .dev/memory-bank/lessons-learned.md` → exit **0** (`GREEN — applied_lessons:
L24, L29, L34, L35, L41, L43, L45, L54, L59, L60, L62, L65 … all 12 cited id(s) resolve … and are referenced in the plan
body`).

**How this grill was run (recorded, advisory).** An independent, read-only Opus agent with a fresh context interrogated
the plan against the live code (it wrote nothing and ran no setter). It noted that the build had already started in the
worktree and spot-checked the in-progress diff where a finding bore on it. The orchestrator wrote this file from its
report. The agent's free text below inherits the plan's untrusted tag and is quoted as DATA (P2). The 13 registered
grillers (`node pharn/floor/count-grillers.mjs .`) were applied by axis; a11y, i18n, privacy and migrations do not apply
(no UI, no user-facing strings beyond fixed render lines, no personal data, no data migration).

## Findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/verify-head-gate-reuse/PLAN.md:35"
  problem: "Style gates are planned reusable, but a whole-tree style gate reads files the fingerprint excludes, and those files differ between the regress HEAD run and verify: REGRESSION.md/regression-report.json are written after the head drain, and a previous iteration's VERIFY.md/verify-report.json exist at regress time and are removed by verify's fresh start."
  evidence: "worktree-fingerprint.mjs EXCLUDED_ARTIFACTS — 'POST-BUILD artifacts: written at or after regress, so a change cannot alter what a gate judged'; stage-regress.mjs renders REGRESSION.md after drain-head."
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/verify-head-gate-reuse/PLAN.md:238"
  problem: "Under /pharn-ship --quick and /pharn-loop --quick no regress runs but the run marker is open, so the build agent can Write .pharn/pharn-regress/head/stamp.json and its logs (ALWAYS .pharn/**) after the marker; marker + mtime acceptance then offers a planted source, and verify would record gate exits nobody ran."
  evidence: "enforce-writes-scope.cjs: const ALWAYS = ['.pharn/**']; the plan's L65 line claims regress clears head/ first, which quick mode never runs."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/verify-head-gate-reuse/PLAN.md:104"
  problem: "validateStamp would admit ANY id as reused, including reconcile and the AC level gates."
  evidence: "the in-progress reusedRunDefect checks stage/shape but no id."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/verify-head-gate-reuse/PLAN.md:200"
  problem: "'Recorded only when its identity equals the live one' is floor at decision time only; nothing reading the verify stamp later re-derives it, and existing text says the map's values are exit codes the runner recorded from the listed argv."
  evidence: "gate-run-core.mjs header lines 27-31; CLAUDE.md run-gates paragraph; gate-run-record.md 'What a validating stamp PROVES'."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-verify.md:56"
  problem: "The command's claims, and LIMITS.md ('/pharn-verify re-runs the project's own gates'), overstate a reused gate; the new residual (no independent second sample of a flaky gate) is unstated; the command's byte ceiling leaves 916 bytes."
  evidence: "pharn-verify.md 17,516 bytes vs COMMAND_BYTE_CEILINGS 18,432; LIMITS.md is human-only."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/verify-head-gate-reuse/PLAN.md:61"
  problem: "Git HEAD (and the index) are outside the identity; a gate that reads git state is unbound."
  evidence: "worktree-fingerprint.mjs: HEAD is deliberately NOT part of the digest."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/verify-head-gate-reuse/PLAN.md:215"
  problem: "The budget check runs before run --next knows an entry is a HIT, so reuse saves processes and wall-clock, not Bash calls or model turns; the measurement must use the pinned --budget-ms."
  evidence: "stage-runtime.mjs drainGates: budget.may() precedes the spawn; 540000/570000 allow a second slow step only within 30 s."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/verify-head-gate-reuse/PLAN.md:98"
  problem: "results_sha256 === null means 'no REGULAR results file', not 'wrote nothing' (a directory, link or FIFO there also hashes null); e2e reads build output, so a reused build leaves e2e reading the head run's git-ignored output; the usage strings and CLAUDE.md lines need the new flag."
  evidence: "run-gates.mjs sha256RegularFile returns null for a non-regular file; gate-run-core.mjs E2E_SET comment."
```

## Checked, no issue (the agent's own list)

cwd is the invoking directory on both sides, so its realpath is stable; leaving the value of `PHARN_TEST_RESULTS`, `seq`
and `<out>` out of the identity is correct; `timeout_ms` in the identity does not cause misses (both pinned 540000); a
crash between the log copy and the state write re-decides the entry (spawnGate truncates the logs, `clearResultsPath`
runs first); a freshness RERUN of verify misses by fingerprint and a `/pharn-ship` Step 2b retry re-runs regress, which
clears `head/`; the BASE-reuse increment is unaffected (`baseSpecFrom`/`specPart` project only `{id, shell, argv,
files}`); `check-verify`, `check-loop-fresh` C/E/F/G/J and `ac-gate-core`'s `ranAsPinned` do not branch on `ran` for a
non-level gate, and J re-hashes the copied logs under verify's own names; the stage-verify fixture closure is
regex-derived, so new literal `./x.mjs` imports are covered.

## Verdict (ADVISORY)

**NOT READY as planned — 2 blocking, 3 important, 3 minor.** The orchestrator accepts every finding and amends the plan
before the build continues (`PLAN.md`, "Grill amendments"): style gates join the never-reused set; the source is bound
by a record in the git dir that `/pharn-regress` publishes for the current run and verify requires; validateStamp
refuses a reused non-reusable id; git HEAD joins the identity; the wording and the residuals are corrected. The Step 1b
floor verdict above is GREEN and is not folded into these counts.
