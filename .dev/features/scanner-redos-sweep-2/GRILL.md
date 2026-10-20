# GRILL — scanner-redos-sweep-2

Plan: `.dev/features/scanner-redos-sweep-2/PLAN.md` · spec-hash: MATCH (`2c84959c…db12e`, recomputed with
`.dev/floor/hash-doc.mjs`) · Step 1b lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0 — L24, L60, L74,
L19 resolve and are referenced in the body; the declaration, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — each gates nothing)

### Inline axes

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/scanner-redos-sweep-2/PLAN.md:13"
  problem: "The mutant harness imports a rewritten copy of each scanner from a temp dir, but the plan does not say how the copy's relative imports (./runtime-floor.mjs, ./code-scanner-cli.mjs) resolve there; a harness that fails to import would make every negative control vacuous or crash."
  evidence: "a source-level mutant of the NEW scanner (written to a temp dir and imported)"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/scanner-redos-sweep-2/PLAN.md:41"
  problem: "The oracle is the quadratic 6.71.0 code run over ~6.6 MB of floor sources; the plan does not bound the differential's own runtime, which lands in every npm test."
  evidence: "every `.mjs` under `pharn/floor/`"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/scanner-redos-sweep-2/PLAN.md:28"
  problem: "The indicator equivalence relies on `\\b` being ASCII-word (no `u` flag); the precomputed global regex must carry exactly the old flags plus `g`, which the plan implies but does not state."
  evidence: "The match starts are precomputed once with the same alternation run global"
```

### Griller axes

- **performance (P7)** — the plan's whole subject is a scaling defect; it names the measured growth, the new bound's
  argument and the ★ shapes. No unlabeled scaling limit recognized; the remaining cost (the regexes' own scan) is
  argued linear and measured. No finding.
- **testability (P1)** — presence recognized (`## Tests`, ★ rows, differential, controls). Adequacy concerns are the
  two P1 findings above.
- **architecture / coupling (P3)** — each scanner keeps its own copy of the pairing / binary-search helpers, the
  family's stated deferred-duplication stance (both headers say consolidation is a separate axis, P7). Fit recognized;
  no finding. The new test file imports only the two `scanText` exports.
- **comprehension / documentation (P7)** — the WHY of each equivalence step is in the plan and is planned into the
  cost header (L24); no public surface changes. No finding.
- **error-handling (P7)** — no new failure path: the CLI's fail-closed handling (`code-scanner-cli.mjs`) is untouched.
  No finding.
- **security (P2)** — the change reduces a crafted-input stall; the masks that carry injection immunity feed the
  same reads. No finding.
- **privacy, i18n, a11y, migrations, observability** — the change touches no personal data, UI text, UI, schema or
  runtime telemetry. Not applicable; no finding.

## Summary

The plan is a pure cost fix with an output-identity claim, labeled advisory and backed by a differential. The open
points are harness mechanics: how the mutated copies import their siblings, how long the oracle runs inside
`npm test`, and the regex flags of the precomputed indicator scan. Each is resolvable at build without a design
change: rewrite the two relative imports to absolute file URLs and assert each anchor is found; measure the
differential's runtime and shrink the fuzz if needed; state the flags in the code comment.

ADVISORY VERDICT: 3 concerns raised (0 blocking-severity, 1 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and not counted here.
