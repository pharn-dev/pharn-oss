# GRILL — scanner-redos-bounds

Plan: `.dev/features/scanner-redos-bounds/PLAN.md` · spec-hash: MATCH (`2c84959c…db12e` recomputed with
`.dev/floor/hash-doc.mjs`) · Step 1b lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0 — L24, L55, L60,
L74, L19 resolve and are referenced in the body; the declaration only, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 14 (spans), 19 (spans), 26 (spans), 34 (spans), 35 (spans), 80 (spans). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — none gates the build)

### Coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/scanner-redos-bounds/PLAN.md:26"
  problem: "The skip lemma holds only while every sink regex consumes no `)` (and html-injection's no `;`) and has one end per start; that precondition couples the shared driver to three scanners' sink sets, and the plan names no place where it is written down or checked."
  evidence: "Each pattern is still its 6.64.2 regex, run sticky at a sink start. When it fails at sink end `p`, every later sink whose end lies in `[p, R(p)]` fails too"
```

### Testability (P1) — presence recognized; adequacy

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/scanner-redos-bounds/PLAN.md:11"
  problem: "'Each ★ shape is shown to kill the 6.64.2 scanner' is not said to be a maintained check; if it is a one-time measurement it should be recorded as such, so the negative control for the timeout tests is not mistaken for a suite property."
  evidence: "each is shown to kill the 6.64.2 scanner"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/scanner-redos-bounds/PLAN.md:12"
  problem: "The differential's fuzz alphabet is not specified; a corpus whose alphabet lacks a sink family, a lone CR, nested parens of depth > 1, or `;` cannot falsify the corresponding skip edge (L60)."
  evidence: "a differential test compares each new `scanText` with a frozen copy of the 6.64.2 one over fuzzed adversarial lines plus every lens eval case"
```

### Comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/scanner-redos-bounds/PLAN.md:40"
  problem: "The ★ tests' timeout and line sizes are not chosen yet; the next maintainer needs the margin (new time vs timeout vs old time) written beside them, as the crypto suite does."
  evidence: "★ many-sinks ReDoS tests (CLI under timeout) + true-positive twins"
```

### Other axes

- architecture: fit recognized — a shared helper under `pharn/floor/` beside `code-scanner-cli.mjs`, same layer, no
  sibling module reference.
- performance: the change is itself the performance fix; the coverage array is O(file length) memory, acceptable.
- error-handling: pure functions over a string; the CLI's fail-closed contract is unchanged; no new failure path.
- security / privacy / i18n: scanners clean; the plan names the ReDoS fix as a P2 hardening. No concern.
- observability: the scanner's `spans` hits are the word "span" (the regex span), not production telemetry; no runtime
  service is built. No concern.
- migrations / documentation / a11y: no persisted state, no public surface change (output unchanged), no UI.

## Summary

The plan keeps every regex and argues the speed-up from a skip lemma, which is the right shape for "findings
unchanged". The main gap is that the lemma's precondition on the sink regexes is implicit. It should be stated in
the core module's header and pinned by the differential running every pattern of all three scanners. Two minor
testability points: say that the old-scanner kill check is a one-time measurement, and name the fuzz alphabet so
each skip edge can fail.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 1 important, 3 minor) — for the human to weigh before
/pharn-dev-build.
