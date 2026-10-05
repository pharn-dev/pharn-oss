# GRILL — regress-head-install-drift

Plan: `.dev/features/regress-head-install-drift/PLAN.md` · spec hash `d831d30d…f4f4` matches `pharn/ARCHITECTURE.md`
(recomputed with `.dev/floor/hash-doc.mjs`) · **Step 1b lessons-declaration verdict (FLOOR): GREEN** —
`check-plan-lessons.mjs` exit 0, `applied_lessons: L27, L35, L41, L43, L59, L62`, all resolve and are referenced in
the body.

Grillers: `count-grillers.mjs .` registered 13; each was applied inline. Scanners over the PLAN:
`scan-plan-i18n` `{"found":false}`, `scan-plan-migrations` `{"mentions":false}`, `scan-plan-pii` `{"found":false}`,
`scan-plan-secrets` `{"found":false}`, `scan-plan-observability` `{"mentions":true}` (lines 18 and 161, both the word
"labelling"/"logging" in prose — not observability). a11y, i18n and migrations do not apply (no UI, no locale, no
schema). privacy and security: no new data is collected or sent; the trust question is G3 below.

## Findings (advisory — the model's judgment; none gates `/pharn-dev-build`)

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/regress-head-install-drift/PLAN.md:69"
  problem: "The state name `clean` will be rendered to users; read alone it says 'the install is right', which the guarantee audit says is NOT claimed (L43)."
  evidence: "| `clean`         | npm; every compared entry agrees"
```

G1 — TAKEN: the rendered `REGRESSION.md` / `VERIFY.md` line for `clean` must say what was compared ("npm's record of
the installed tree agrees with `<lockfile>`"), never "the install is correct"; the contract states the L43 bound.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/regress-head-install-drift/PLAN.md:122"
  problem: "The plan does not say what the report carries when the recorded block cannot be read at render (a verify resumed from a record a pre-change script wrote, or a removed `.pharn/` file)."
  evidence: "Recorded at `.pharn/pharn-verify/head-install.json` (new `VERIFY_PATHS.headInstall`), read at `verdict`"
```

G2 — TAKEN: an absent or malformed record renders `head_install: null` and the line "HEAD install: not recorded" — the
block is advisory, so a missing one is never a refusal and never a fabricated state.

### Trust (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/regress-head-install-drift/PLAN.md:196"
  problem: "Package paths from the lockfile are attacker-nameable and reach the refusal detail; a path holding a newline or backtick must not break out of the DATA fence."
  evidence: "package paths and versions reach the refusal detail as JSON strings inside the existing DATA fence"
```

G3 — TAKEN (already the design, now a test): every path/version goes through `JSON.stringify` before the detail, and
the renderer's `quoteData` computes a fence longer than any backtick run; a test feeds a key with a newline and a
backtick run and asserts one fenced block.

### Coupling / architecture (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/regress-head-install-drift/PLAN.md:88"
  problem: "The verify stage now reaches the regress core (`resolveInstall`, `LOCKFILE_FAMILIES`) through install-drift-core.mjs; INSTALL_RULE becomes a shared fact living in a stage-specific module."
  evidence: "`remedy` = `resolveInstall(...)`'s command over the HEAD tree's lockfile families — `INSTALL_RULE`, the one owner"
```

G4 — NOT TAKEN, reason stated: moving INSTALL_RULE into a neutral module would change `stage-regress-core.mjs`'s pinned
import list and the contract cites ("the INSTALL_RULE table in stage-regress-core.mjs"), and `stage-verify.mjs`
already imports `regress-base-reuse*` (the regress side). One owner is kept; the move is named as a follow-up only if a
third stage needs the rule.

### Testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/regress-head-install-drift/PLAN.md:140"
  problem: "An integration fixture that writes `node_modules/` into an un-ignored fixture repo will be refused `scope-escaped` by the partition before the install check ever runs, so a 'refuses before any gate' test could pass for the wrong reason."
  evidence: "drifted / not-installed refuse before any gate (no `head/` stamp)"
```

G5 — TAKEN: the fixtures git-ignore `node_modules/` (as every real project does), and each refusal test asserts the
`reason_code` is `head-install-drift`, not merely exit 3, plus a control fixture (same tree, matching hidden lockfile)
that proceeds to `done`.

### Determinism / honest scope (P5, P7)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/regress-head-install-drift/PLAN.md:116"
  problem: "The plan does not say whether `--no-install` (the human's base-side choice) or an explicit `--gates` changes the HEAD check."
  evidence: "first thing in `head-init` (after the partition's `scope-escaped` refusal, before `run-gates.mjs init`)"
```

G6 — TAKEN: neither flag changes it — the check is about the tree the HEAD gates run in, whatever runs at base or
which gates run; the contract and the thin callers' remedy say so in one clause.

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/regress-head-install-drift/PLAN.md:106"
  problem: "The labelling (c) for `not-checked` states is the part with the weakest trigger: the evidence was a drifted npm tree, which the refusal handles."
  evidence: "kept as the report for the states that do not refuse"
```

G7 — NOT TAKEN: the orchestrator accepted (c) at GATE 1 and the brief asks for the state to be reported wherever the
verdict is shown; it adds an advisory block and one line, no decision.

## Summary

The plan's floor claim is narrow and honest (agreement of two npm records, refusing only on positive evidence); the
concerns are about how the `clean` state is worded to a user (G1), the absent-record case (G2), the fence test (G3) and
a fixture trap that would make the integration tests pass for the wrong reason (G5). G4 and G7 are declined with
reasons.

ADVISORY VERDICT: 7 concerns raised (0 blocking-severity, 2 important, 5 minor) — for the human to weigh before
/pharn-dev-build. 5 taken into the build, 2 declined with reasons.
