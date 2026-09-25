# GRILL — verify-ac-gate-fixes

Plan: `.dev/features/verify-ac-gate-fixes/PLAN.md` · spec-hash check: MATCH (`4950796f…c1c7f` recomputed with
`.dev/floor/hash-doc.mjs` equals the plan's pin) · **Step 1b lessons-declaration verdict (FLOOR): GREEN** —
`check-plan-lessons.mjs` exit 0, "applied_lessons: L27, L29, L41, L50, L52 … all 5 cited id(s) resolve … and are
referenced in the plan body" (the declaration only — never that the lessons were applied).

The plan under interrogation is `trust: untrusted`; every `problem` / `evidence` below quotes it as DATA. No
instruction-looking content was found in it.

## Findings (advisory — no finding gates `/pharn-dev-build`)

### Inline axes (Step 2)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/verify-ac-gate-fixes/PLAN.md:211"
  problem: "The >64 KiB pipe round-trip discriminates only where a piped stdout is asynchronous; CI runs ubuntu-latest, where Node documents pipes as synchronous, so the behavioural test would stay green on CI with the defect restored — the static no-process.exit pin is the only platform-independent regression guard, and the plan does not say so."
  evidence: "D2 (`cli-stdout-flush.test.mjs`) → the set's sources contain no `process.exit(`; `check-verify` positional map and `check-regress verdict` with thousands of gates → > 64 KiB parsed through a pipe; a negative control proves the recipe does exceed 64 KiB."
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/verify-ac-gate-fixes/PLAN.md:218"
  problem: "The guarantee line claims floor for 'verdict JSON reaches a piped consumer whole' over all four CLIs, but for check-loop and check-red-run the only evidence is a static proxy (no process.exit call in the source), and the set itself is a presence set a future parsing caller is not detected by (L36); the floor claim should be the pin's property, with the behaviour stated as tested for two CLIs on async-pipe platforms."
  evidence: '"Verdict JSON reaches a piped consumer whole" → floor for the four enumerated CLIs, bounded: the sentinel/exitCode change is tested by a >64 KiB pipe round-trip (check-verify, check-regress) and a static no-`process.exit(` pin (all four).'
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/verify-ac-gate-fixes/PLAN.md:244"
  problem: "GATE-1 condition 1 requires a test that a non-sentinel throw still exits non-zero, but no CLI in the set has a natural input that throws inside main() (every read is try/caught into an INCONCLUSIVE emit), and the plan does not say how the crash is induced."
  evidence: "1. The sentinel exit swallows ONLY the module-private sentinel. Any other throw still propagates and exits non-zero — … A test proves it (`cli-stdout-flush.test.mjs`: a real throw inside `main()` still exits non-zero with its stack)."
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/verify-ac-gate-fixes/PLAN.md:181"
  problem: "A static pin that greps for the literal `process.exit(` will RED on the fix's own rationale comments, which naturally name the call they replace; the pin must skip comment lines, or authors will be pushed to leave the WHY unwritten."
  evidence: "`pharn/floor/cli-stdout-flush.test.mjs` — NEW: the D2 enumeration — no `process.exit(` in the set's sources"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/verify-ac-gate-fixes/PLAN.md:188"
  problem: "The CHANGELOG section date is stale: the GATE-1 addendum requires the actual date 2026-09-25, while the plan's Files line still fixes 2026-09-24."
  evidence: "`CHANGELOG.md` — new `## [6.20.4] - 2026-09-24` section above `[6.20.3]` — repo-meta"
```

### Grillers (Step 2b — 13 registered by `count-grillers.mjs`, each applied inline)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/verify-ac-gate-fixes/PLAN.md:52"
  problem: "(migrations/error-handling axis) The precedence change and the new ac-gate detail text alter what check-verify computes for an existing stamp, so a /pharn-loop run that straddles the upgrade (report written by 6.20.3, re-derived by 6.20.4 at check-loop-fresh check E) stops with report-verdict-mismatch (S11); the plan does not name this one-time upgrade cost."
  evidence: 'SPEC). Rationale: over a partial tree, "not delivered yet" and "could not measure" are the expected readings of'
```

Per griller, in `count-grillers.mjs` order:

- **a11y** — no user interface in the increment; no finding.
- **architecture** — fit recognized: no sibling reference; the only new module is a test file; shared grammar stays
  imported (`ac-gate-core.mjs` reason sets). The sentinel exit will exist as three per-file copies (each CLI
  already owned its own `emit`), held together only by the static pin — a stylistic trade-off, advisory prose, not
  a P3 finding.
- **comprehension** — rationale recognized for every non-obvious choice (D1 step 3's position and the rejected
  option B, the sentinel over `return emit(…)`, the `maxBuffer` decision, the set's membership rule).
- **coupling** — clean seams recognized: the verdict reaches `/pharn-ship` and `check-loop.mjs` only through the
  report's `verdict` enum; `process.exitCode` is process-global state set once, immediately before the unwind.
- **documentation** — presence recognized: contracts (`verify-report.md`, `ac-tests.md`), both commands, the
  check-verify header, CLAUDE.md and the CHANGELOG are declared.
- **error-handling** — presence recognized (condition 1: a crash stays a crash). Measured this run, not assumed:
  `.pharn/pharn-dev-grill/epipe-probe.mjs` (scratch) spawned a child writing 300,001 bytes then ending with
  `process.exitCode = 3`, and destroyed the read end after the first chunk — exit **3**, empty stderr, three runs
  out of three, the same as `process.exit(3)`; so a reader that closes early does not turn a verdict exit into a
  crash exit on darwin/Node 24.13.1 (not measured on Linux). The same probe measured the defect: `process.exit(3)`
  delivered **65,536** of 300,001 bytes through a pipe, `process.exitCode = 3` delivered all **300,001**.
- **i18n** — `scan-plan-i18n.mjs` `{"found":false}`; no locale-bearing strings; no finding.
- **migrations** — `scan-plan-migrations.mjs` `{"mentions":false}`; no data migration; the one-time upgrade cost is
  the minor finding above.
- **observability** — `scan-plan-observability.mjs` reports one incidental mention (line 21, "logging"); the
  increment's observable IS its CLI output; no operational surface; no finding.
- **performance** — no scaling risk: one emit per process; the test fixtures are bounded (12 × 40 tests, a few
  thousand gates); no finding.
- **privacy** — `scan-plan-pii.mjs` `{"found":false}`; no finding.
- **security** — `scan-plan-secrets.mjs` `{"found":false}`; D3 adds only `stamp.source` (an enum `validateStamp`
  already checked) and a fixed sentence to `detail`, never an argv string; no finding.
- **testability** — presence recognized: "Evals to write (P1)" names a case per decision (the matrix, the bootstrap
  repro, the big `--ac-gate` pipe, the enumeration pin, the detail present/absent pair); the platform limit of the
  pipe test is the first inline finding.

## Summary

The plan is specific about all three fixes and records its one design choice (D1 option A) with its cost. The
concerns are about how much the flush fix can be PROVEN rather than whether it is right: its behavioural test
cannot discriminate on the CI platform, its guarantee line reads stronger than the static proxy that backs two of
the four CLIs, and the crash-propagation test the GATE-1 conditions require has no stated way to induce a crash.
Two small build hazards: the static pin must not match comment prose, and the CHANGELOG date must follow the GATE-1
addendum. The upgrade-straddling loop stop is a one-time cost worth one sentence.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 6 advisory — 3 important, 3 minor) — for the human to weigh
before /pharn-dev-build. The Step 1b lessons-declaration verdict above is a separate FLOOR result and is not counted
here.
