# GRILL — ac-tests-style-gate

Plan: `.dev/features/ac-tests-style-gate/PLAN.md` · spec-hash: MATCH
(`d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5`) · **Step 1b lessons declaration: GREEN** (exit 0 —
`applied_lessons: L11, L19, L23, L30, L34, L41, L45, L62`, all 8 resolve and are referenced in the body; the checker
verifies the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 36 (logging), 58 (logging), 69 (logging), 108 (logging), 115 (logging), 132 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — grouped by axis)

### Inline: guarantee audit (P0) / error handling

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/ac-tests-style-gate/PLAN.md:36"
  problem: "The plan does not say what happens when a project's style script WRITES (an `eslint --fix` or `prettier --write` wired as `lint`/`format:check`): the new step runs it twice before the build's reconcile anchor, so its writes outside the test files are neither hook-gated nor reconciled."
  evidence: "each run as `npm run <id>` through `run-gates.mjs`'s exported `spawnGate` (process group, SIGTERM→SIGKILL, logs by fd;"
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/ac-tests-style-gate/PLAN.md:51"
  problem: "The NOTE branch for a gate red before (no tests existed) lets test files that ALSO fail that gate be pinned; the plan names the attribution as advisory but should say in the claims bullet that this case still pins unformatted files."
  evidence: "after measured non-zero, before red or not measured, and no mapped test file existed before → `NOTE — <id> was already red before the tests were written; not attributed to them`"
```

### Griller: performance (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/ac-tests-style-gate/PLAN.md:143"
  problem: "Two whole-tree style runs per /pharn-test (about 4 minutes on this repo, format:check 111 s each) is declared and accepted at GATE 1, but the loop's wall-clock budget is not revisited; worth one line in the CHANGELOG entry so users are not surprised."
  evidence: "`format:check` 111 s, `lint` 5 s, `lint:md` 12 s (all exit 0) — so on this repo the step adds about 4 minutes to every `/pharn-test`"
```

### Griller: comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/ac-tests-style-gate/PLAN.md:47"
  problem: "Why exits 126/127 (and not a signal exit >= 128 other than the runner's own timeout) count as not measured should be one line in the module header, citing gate-run-core's NOT_STARTED_EXITS owner rather than re-deriving it."
  evidence: "after not measured (timed out, or exit 126/127 — `gate-run-core.mjs NOT_STARTED_EXITS`)"
```

## Grillers with no finding (reason)

- a11y, i18n: no UI and no user-facing translated text (CLI output lines are machine/agent-facing DATA).
- migrations: no schema or persisted user data; the records are disposable scratch under `pharn/.run/`.
- privacy, security: scanners clean; untrusted inputs (mapping paths, gate logs) are routed through `acRowsOf`/`badPath`
  and quoted as DATA; argv never touches a shell (P2 trust audit present).
- architecture, coupling: fit recognized — pure core + I/O CLI split (P3), reuse of `discoverGates`, `STYLE_SET`,
  `loadGateExclusion`, `spawnGate` instead of a new mechanism; importing `spawnGate` from `run-gates.mjs` follows
  `stage-regress.mjs`'s existing precedent. The before→after ordering is explicit in the command, not hidden.
- documentation: the guide section, module header and command claims bullets are declared.
- error-handling: exit table (0/1/2) and unusable cases are declared; the one gap is the mutating-script case above.
- observability: the CLI prints per-gate verdict lines and log paths; the scanner's "logging" hits are prose, but the
  declared output is adequate for a stage-local check.
- testability: presence recognized — unit rows for every verdict branch, CLI end-to-end cases, ★ WIRING over the
  committed lines.

## Summary

The plan is a tight, smallest-coherent increment: it measures before/after per gate (L11), never runs a write form
(L19), and is honest that "never pins" is command discipline over a floor verdict. The concerns are bounds to state in
the build (a mutating style script runs unreconciled before the anchor; the NOTE branch can still pin unformatted
files when the gate was already red; the cost line) and one header sentence on what "not measured" means.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 1 important, 3 minor) — for the human to weigh before
/pharn-dev-build. This is model judgment and gates nothing.
