# GRILL — loop-honest-stop

Plan: `.dev/features/loop-honest-stop/PLAN.md` · spec-hash: `2c84959c…b12e` recomputed, **matches** the pin · Step 1b
lessons declaration: **GREEN** — `check-plan-lessons.mjs` exit 0 ("all 10 cited id(s) resolve … and are referenced in
the plan body"; its P0 note: the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings (advisory — each is model judgment; none gates `/pharn-dev-build`)

### Built-in axes — guarantee audit (P0) / honest scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-honest-stop/PLAN.md:52"
  problem: >-
    CAP_MISMATCH binds the recorded cap to the marker, but nothing binds the recorded iterations to that cap, so a run
    that kept iterating past its opened cap and recorded the true cap still re-derives GREEN on a green stop (iteration
    5 over cap 3 with PASS reports re-derives STOP_GREEN) and is committed.
  evidence: "its `cap` must be a positive safe integer; and it must equal the record's `cap` (`Number(cap)`)"
```

A compliant run's first stop is at `iter <= cap` (CONTINUE needs `iter < cap`; STOP_CAP fires at the first
`iter >= cap`), so `iterations > cap` is impossible in every decision class. Recommended: RED `ITER_OVER_CAP` beside
`CAP_MISMATCH` (same file, same tests). Bound: `iterations` is still model-typed, so an under-count passes.

### Architecture (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/loop-honest-stop/PLAN.md:92"
  problem: >-
    The shared reader of a report's `excluded` block is planned in gate-exclusion-core.mjs, whose one axis is how a
    project DECLARES an exclusion; the block it would read is the stamp's, built by gate-run-core.mjs `excludedBlock` and
    shape-checked by its validateStamp, so the reader belongs beside its writer.
  evidence: '`gate-exclusion-core.mjs` (the owner of "a project''s declaration of excluded gates") gains `excludedFacts(block)`'
```

Recommended: put `excludedFacts` in `pharn/floor/gate-run-core.mjs` and its test in `pharn/floor/gate-run-core.test.mjs`;
leave `gate-exclusion-core.mjs` unchanged. That changes `## Files`, which must happen before build Step 0 (a path added
after the anchor is a `plan-widened-after-anchor` escape).

### Determinism / error handling (P5, P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-honest-stop/PLAN.md:80"
  problem: >-
    Only exit 2 becomes reconcile-inconclusive; a reconcile checker that crashed (node's exit 1, no JSON) still reads
    as a detected escape, and the plan does not name that bound.
  evidence: "Any other value, a missing key, or a non-object `gates` keeps `reconcile` (the old cause — the conservative reading)."
```

Recommended: name it in the checker header and the contract sentence (exit 1 is the checker's ESCAPE code, so a crash
cannot be told apart by exit code; `reconcile_detail.state` `not-checker-json` shows it in the reports).

### Testability (P1)

Presence recognized: `## Files` names a test per changed module and the GATE 1 section lists tests (a)–(c) for the
condition. One placement gap:

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-honest-stop/PLAN.md:293"
  problem: >-
    Test (b), the command-family ordering of --open before every check-loop / closeout line and --close only in the
    Final step, names no file to live in.
  evidence: "(b) in the command family, the `--open` line sits in Step 1a, before the `## Step 2` heading"
```

Recommended: `pharn/floor/loop-closeout.test.mjs` (already declared; it already reads `commandFamilyText`).

### Other grillers

- coupling (P3): one hidden ordering exists — the decision check must run before the guard's `--close` — and the plan
  names it and pins it with test (a). Clean seams otherwise (agreement between two files, read-only).
- error-handling (P7): declared for every new read (absent, unreadable, symlink, malformed, wrong schema → RED or
  `n/a`); the `--report` redirect's failure renders `n/a`. Adequate.
- security (P2): scanner clean; the commit message carries only ALLOWLIST tokens and digits through an argv vector;
  no security concern warranted.
- comprehension / documentation (P7): the why of each choice (exit 2, fail-closed, minor bump) is captured; the
  guides and contracts are declared.
- performance (P7): bounded single-file reads; no scaling risk recognized.
- privacy, observability, migrations, a11y, i18n: not applicable to this change (no PII, no service, no schema, no
  UI); no finding.

## Summary

The plan is a coherent single increment over one theme (the loop's stop and records telling the truth). Two
concerns are worth acting on before the build: the cap check leaves `iterations > cap` unbound, which is the other
half of LOOP-2 and costs one comparison; and the exclusion reader is placed in the declaration module rather than
beside the stamp block it reads. Two minor items: name the crashed-reconcile bound, and place the ordering test.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons verdict (GREEN) is a separate floor verdict and is not counted here.
