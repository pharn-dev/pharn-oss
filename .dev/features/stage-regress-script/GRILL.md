# GRILL — stage-regress-script

**Header.** The plan grilled is `.dev/features/stage-regress-script/PLAN.md`: the GATE-1-amended text (A1 and A2 folded in first, then this grill's dispositions).

- **Spec-hash check:** match. `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` = `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`, equal to the plan's `spec_content_hash`.
- **Step 1b, the lessons declaration (FLOOR):** GREEN, exit 0. `check-plan-lessons.mjs` printed: "all 21 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body". It re-ran GREEN after every amendment below.
- **Grillers discovered:** 13, by `node pharn/floor/count-grillers.mjs .` (`{"registered":13,…}`).

- stage: grill (model routed via Agent subagent; effort not routed)
- gate1: APPROVED WITH AMENDMENTS by the orchestrator's MODEL decision under the maintainer's 2026-09-25 delegation, not a human approval. A1 and A2 were folded into the PLAN before this grill.

## Read this first — the bound on this grill (P0)

- **The griller is the plan's author.** The same agent wrote the PLAN and then grilled it, under the orchestrator's stage split: plan and grill both run on opus. That reduces the grill's value as an independent second look. The findings below are what a self-review surfaced by deliberately re-reading the plan as untrusted DATA and probing its claims. They are not what an independent reviewer would find, and a clean area here is weaker evidence than it looks.
- **Every finding is ADVISORY.** Only Step 1b's exit code is a floor stop. Findings that showed a real defect were fixed in the PLAN in place, as the orchestrator directed, and each disposition is recorded below. "Fixed in PLAN" means the plan now says the right thing. It does NOT mean the build will do it: that is the build's and the review's job.

## Findings — inline axes (Step 2)

### Guarantee-audit completeness (P0)

#### G1 — the "no earlier verdict survives" claim was false for early exits

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/stage-regress-script/PLAN.md:73"
  problem: "The plan claimed a stage that stops before its verdict leaves no earlier verdict on disk, but its own step order removed the old report AFTER steps that can fail (leftover-worktree removal, scratch clear), so an early unusable exit left the previous report for /pharn-ship to read."
  evidence: "1. **fresh**: validate argv. Run the `lstat` containment walk … Remove a leftover registered base worktree, prune, and clear `.pharn/pharn-regress/`. Remove THIS feature's stale `regression-report.json` and `REGRESSION.md`, so a stage that stops before its verdict leaves no earlier verdict on disk."
```

**Disposition — FIXED in PLAN (l. 73–79, 63, 331).** Stale-output removal is now the first step after argv validation and containment. The exit table's `unusable` row says an argv refusal removes nothing. A test asserts that the stale report is gone after every non-argv exit.

#### G17 — the `done` object copied the verdict without saying which copy is authoritative

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:186"
  problem: "The `done` exit object carries `verdict`, a second copy of the report's field, and the plan did not say which one a consumer may branch on."
  evidence: "`done` adds `verdict`, `report`, `render`."
```

**Disposition — CLARIFIED in PLAN (l. 186).** The copy is transient: it is never stored and exists only for the one-line relay. The report is named as the only verdict source.

### Trust propagation (P2)

#### G11 — a human's answer was appended to a shell line with no quoting rule

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:255"
  problem: "The thin command re-runs the pinned line with a human-supplied answer appended, but the plan named no quoting rule, so a value containing `$(…)` or a quote would be re-parsed by the shell."
  evidence: "4 → relay the question verbatim, then re-run the fresh line with the chosen option's `argv` appended;"
```

**Disposition — FIXED in PLAN (l. 255, 200).** Appended values are single-quoted, and that rule is advisory because it is command prose. `git-commit` and `pathspec-list` answers are held to a closed charset by `stage-exit-core`, so for those two kinds a quote or metacharacter never reaches the shell.

#### G10 — REGRESSION.md is committed and could carry an absolute home path

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:367"
  problem: "`/pharn-loop` commits REGRESSION.md, and a quoted child refusal can echo whatever path it was handed, so the machine username could reach a commit; the plan set no rule against it."
  evidence: "Trust audit (as first written): 'Free text is quoted through `dataText` into `detail` or into a fence (L62).'"
```

**Disposition — FIXED in PLAN (l. 367, 343).** Children get repo-relative paths. A render test asserts no match of `render-cost-ledger.mjs`'s `ABS_PATH_RE`, imported by the test only. The `unusable` `detail` is stdout-only, stated.

### One axis of change / no sibling imports (P3)

#### G5 — the budget rule sat in the regress core, which Phase 1.2 would have had to import or copy

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/stage-regress-script/PLAN.md:130"
  problem: "`mayStartSlowStep` drives the shared `continue` status, but the plan put it in the regress-specific core, so the verify runner (Phase 1.2) would import a sibling stage's core or copy the rule (L35)."
  evidence: "The pure decision `mayStartSlowStep(…)` lives in the core and is tested at its boundary"
```

**Disposition — FIXED in PLAN (l. 130, 277).** It now lives in `stage-exit-core.mjs`, beside the `continue` status it drives.

#### G6 — importing the quoting helpers from render-run-report.mjs would load the cost-ledger graph into every regress run

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/stage-regress-script/PLAN.md:279"
  problem: "Reusing `quoteData`/`dataText` from `render-run-report.mjs` would pull `render-cost-ledger.mjs`, `mark-phase.mjs` and `ship-outcome-core.mjs` into `/pharn-regress`'s load graph (measured by reading its imports), so a load failure in unrelated ledger code would crash the regress stage."
  evidence: "`pharn/floor/render-regression.mjs` — NEW, pure, no CLI: … reuses `fenceFor`, `quoteData` and `dataText`"
```

**Disposition — FIXED in PLAN (l. 279, 280, 278, 25).** The two helpers move byte-for-byte into the new `quote-core.mjs`, whose only import is `fenceFor` from `loop-record-core.mjs`, a module with no imports. `render-run-report.mjs` re-exports them, so its tests stay as they are. There is one owner, and it gets its own test. Files: 26 → 29; floor checkers 85 → 86.

#### G8 — the freshness checker would import a core whose import list nothing bounded

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:165"
  problem: "`loop-fresh-core.mjs` will import REGRESS_PATHS from `stage-regress-core.mjs`, so anything that core imports later becomes a new way for the freshness checker to hit `checker-crashed` (6.21.1)."
  evidence: "`loop-fresh-core.mjs`'s `DEFAULT_STAMPS.regressHead` and `regressBase` are derived from them (L35)."
```

**Disposition — FIXED in PLAN (l. 165, 276, 345).** The core is constrained to import only `gate-run-core.mjs`, which is already in the freshness checker's graph. A test pins the import list, with an injected-import control.

### Determinism (P5)

#### G12 — the no-gates question's fixed text would mislead when the style rule emptied the set

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:213"
  problem: "A project whose only scripts are style gates reaches `empty-source-set` BECAUSE the new config-touch rule skipped them, and a single fixed text about 'no gates' would not tell the human why, or that `--gates` (never style-filtered) is the answer."
  evidence: "| `question` | `base-unresolved`, `no-gates`, `install-unresolved`, `tests-unresolved` |"
```

**Disposition — FIXED in PLAN (l. 213, 334).** The fixed text names all three causes. A style-only fixture is added.

#### G16 — a `--tests` pathspec that matched nothing silently ran no tests

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:110"
  problem: "The question fired only when neither `--tests` nor `--no-tests` was given, so a mistyped `--tests` pathspec produced an empty universe and the test gate recorded no-files without anyone being asked."
  evidence: "if `test` is in `ids`, the universe is empty and neither `--tests` nor `--no-tests` was given → `question tests-unresolved`."
```

**Disposition — FIXED in PLAN (l. 110, 334).** Only `--no-tests` states an intended empty universe, and anything else that empties it asks.

### Honest scope / no speculation (P7)

#### G13 — two inherited bounds of the partition were not named

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:166"
  problem: "The four partition lists travel as argv to `check-regress.mjs scope` (the OS argument limit, E2BIG), and its `parseList` de-duplicates with `Array.includes` (quadratic); the plan named neither bound."
  evidence: "declared = PLAN `## Files` ∪ AC-TESTS.md `## Files` … tests = the universe from TEST_FILE_RULE (below) or `--tests`."
```

**Disposition — NAMED in PLAN (l. 166–169), not fixed (P7).** Both are inherited from today's shell-passed lists, and there is no observed failure. E2BIG fails closed as `unusable child-crashed`.

#### G14 — concurrent regress runs in one worktree were not bounded

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:79"
  problem: "The fresh start clears `.pharn/pharn-regress/`, so a second run started in the same worktree destroys the first run's in-progress record; the plan did not say so."
  evidence: "Remove a leftover registered base worktree, prune, and clear `.pharn/pharn-regress/`."
```

**Disposition — NAMED in PLAN (l. 79).** One run per worktree at a time, matching `run-gates.mjs init`'s own recreate of `<out>`. No lock is added (P7).

#### G15 — the test-file regex carried no WHY

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:145"
  problem: "TEST_FILE_RULE introduces a non-obvious regex without saying where it comes from, so a maintainer cannot tell whether widening it is a fix or a behaviour change."
  evidence: "a path is a test file iff its basename matches `\\.(test|spec)\\.[cm]?[jt]sx?$`, or one of its segments is `__tests__`"
```

**Disposition — FIXED in PLAN (l. 145).** It is the union of vitest's and Jest's default include conventions, and it also covers `node --test`'s `*.test.*` files.

## Findings — grillers (Step 2b, applied inline; each griller is ADVISORY)

| griller        | Layer 1 (deterministic, where one exists)                                                         | outcome                                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a11y           | membership only                                                                                   | no UI surface: no finding                                                                                                                                                                                                      |
| architecture   | membership only                                                                                   | G5, G6 (above); otherwise fit recognized: shared protocol in `stage-exit-core`, shared stamp paths imported from one owner                                                                                                     |
| comprehension  | membership only                                                                                   | G15 (above); the other non-obvious decisions (540000/570000, exit 1 unused, the first-always rule, the `.pharn` scope target) carry their WHY                                                                                  |
| coupling       | membership only                                                                                   | G14 (shared mutable `.pharn/pharn-regress/`, above) and G4 (below)                                                                                                                                                             |
| documentation  | membership only                                                                                   | the public surface (CLI, exit table, contract, new `/pharn-regress` flags) is declared: the contract, the CLAUDE.md Commands entry, the command prose, CHANGELOG. No finding                                                   |
| error-handling | membership only                                                                                   | G4 (below); the rest are declared: refusals, `unusable` codes, crash semantics, harness-kill resume, install failure (A2)                                                                                                      |
| i18n           | `scan-plan-i18n.mjs` → `{"found":false}`                                                          | scanner clean; developer-facing English artifacts only, so no localization concern                                                                                                                                             |
| migrations     | `scan-plan-migrations.mjs` → `{"mentions":false}`                                                 | no persisted user-data shape changes. `regression-report.json` is unchanged; the new `stage.json` and the stage-exit object are versioned (`/1`); leftovers of the 6.22 flow are removed by the fresh start. No finding        |
| observability  | `scan-plan-observability.mjs` → mentions at PLAN l. 115, 327, 388 (install logs, gate-log hashes) | the hits are REAL observability for what the plan builds: the per-gate logs hashed in the stamps, the install logs, one stage-exit object on every exit, and the progress record. Presence recognized and adequate; no finding |
| performance    | membership only                                                                                   | G13 (above); the budget's worst case is stated. No other scaling risk                                                                                                                                                          |
| privacy        | `scan-plan-pii.mjs` → `{"found":false}`                                                           | scanner clean; G10 (above) is the one privacy-shaped concern                                                                                                                                                                   |
| security       | `scan-plan-secrets.mjs` → `{"found":false}`                                                       | scanner clean; G11 (above). The install runs base-commit lifecycle scripts, as today, and that is stated in the trust audit                                                                                                    |
| testability    | membership only                                                                                   | verification present (many ★ tests with controls); G7 and G18 below are adequacy concerns                                                                                                                                      |

### Error-handling / coupling

#### G4 — the base worktree was removed BEFORE the verdict, so a cleanup failure voided a finished measurement

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/stage-regress-script/PLAN.md:123"
  problem: "The verdict phase removed the base worktree first, so a locked file or a stray process holding the directory turned a completed base/head comparison into `unusable git-failed` with no report."
  evidence: "11. **verdict**: - `git worktree remove --force .pharn/pharn-regress/base`; - run `check-regress.mjs verdict …`"
```

**Disposition — FIXED in PLAN (l. 118–124, 333).** Verdict and report come first, then a best-effort cleanup whose failure is recorded and rendered. The next fresh start removes a leftover. A test makes the removal fail.

### Architecture / fix #7 (P0) — found while probing the partition

#### G2 — in a project that does not git-ignore `.pharn/`, the stage would refuse every run as its own scope escape

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/stage-regress-script/PLAN.md:94"
  problem: "`inside` included untracked `.pharn/` files (the setter's `.pharn/writes-scope.json`, the stage's own scratch) whenever `.pharn/` is not git-ignored, a case `worktree-fingerprint.mjs` already treats as real, so `scope` would report a false blocking fix #7 escape on the correct workflow (L17's shape)."
  evidence: "inside = `git diff --name-only -z <base>` ∪ `git ls-files -z --others --exclude-standard`."
```

**Disposition — FIXED in PLAN (l. 94, 332).** Paths under the state root are removed through `worktree-fingerprint.mjs`'s `isExcluded(path, null)`, the rule's one owner. A `.pharn/` path is never an escape, because the hook always allows `.pharn/**`. The same applies to BASE_RULE's porcelain test.

#### G3 — git's default rename detection hid an escape

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/stage-regress-script/PLAN.md:93"
  problem: "With rename detection on (git's default), a build that renamed an undeclared file onto a declared path listed only the destination, so the deletion of the undeclared source never reached the escape check — a false green on fix #7 (inherited from today's prose, but now in code and cheap to close)."
  evidence: "inside = `git diff --name-only -z <base>` ∪ …"
```

**Disposition — FIXED in PLAN (l. 93, 332).** `--no-renames` lists both halves, and a rename fixture is added.

### Testability (P1)

#### G7 — the ★ WIRING fixture's `npm ci` could reach the network

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/stage-regress-script/PLAN.md:328"
  problem: "The ★ WIRING test executes the pinned line unmodified, so INSTALL_RULE runs a real `npm ci` in the fixture, and npm's audit/fund/update checks can reach the network — a slow, flaky test in CI."
  evidence: "★ WIRING (L45): extract `pharn-regress.md`'s pinned fresh line, substitute `<name>` only, run it with `sh -c` in a fixture repo"
```

**Disposition — FIXED in PLAN (l. 328).** The test sets `npm_config_offline`, `_audit`, `_fund` and `_update_notifier` in the spawned environment, and the pinned line is unchanged. The duration is measured at build (L24).

#### G18 — the budget test's "stubbed clock" would have been a test-only input to floor code

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:131"
  problem: "The plan's budget control named 'a stubbed clock', which needs a hidden test-only input to the CLI — a path no production caller exercises (L41's blind spot)."
  evidence: "Control: a stubbed clock that permits a second step past the window must be caught."
```

**Disposition — FIXED in PLAN (l. 131).** No clock input reaches the CLI. `--budget-ms 1` makes exactly one slow step per invocation deterministic, and the controls are mutants of the pure function.

#### G9 — REGRESSION.md's new enumeration sites had no pin

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/stage-regress-script/PLAN.md:344"
  problem: "REGRESSION.md becomes a code-rendered artifact added to .prettierignore and .markdownlint-cli2.jsonc, but no test ranged over every site that must name it (the RUN-REPORT.md precedent has one) — L29's enumeration left implicit."
  evidence: "`.prettierignore` — `pharn/features/*/REGRESSION.md` (L23)"
```

**Disposition — FIXED in PLAN (l. 344).** A ★ ENUMERATION test over six sites was added.

## Checked, no finding (recorded so the absence is visible)

- **A1 scope claim, probed rather than read (L37).** The setter with `writes: []` exits 1 and writes nothing. With `writes: [".pharn/pharn-regress/stage.json"]` it exits 0, and the hook then answers:
  - Writes to `pharn/features/x/REGRESSION.md`, `pharn/features/x/regression-report.json`, `src/app.js` and `.dev/features/x/PLAN.md` exit 2;
  - a Write to `.pharn/pharn-regress/other.json` exits 0.
  - The PLAN's A1 bullet quotes these exit codes.
- **The ★ EXECUTED setter test** requires the resolved scope to equal the `--target`, and it does for a concrete entry. Its site count drops from 27 to 26, and RULE A's floor is 15.
- **The consumer table (check-loop-fresh A/C/D/E/G/H/J, check-loop, ship):** re-read against the amended phase order. Draining head before the base worktree exists also keeps a base checkout out of the head gates' view. No finding.
- **P1, capability evals:** no `role:`-bearing capability is added, so no eval obligation arises. Every new module ships a test.

## Summary

The plan was re-read as untrusted DATA against its own claims. The largest defects were three ordering and partition errors, each the kind a happy-path fixture would not reveal:

- **G1:** the stale-report removal ran after steps that can fail, which falsified a stated property.
- **G4:** the worktree cleanup ran before the verdict, so a cleanup failure voided a finished measurement.
- **G2 and G3:** the partition would have counted the stage's own `.pharn/` scratch as an escape in non-ignoring installs, and let git's rename detection hide a real escape.

Two structural fixes keep the shared protocol reusable and the load graphs small:

- **G5:** the budget rule moved into `stage-exit-core`.
- **G6:** the quoting helpers moved into a zero-dependency `quote-core`, rather than dragging the cost-ledger graph into regress.

The rest are named bounds and test-adequacy fixes. All dispositions are in the PLAN, and `check-plan-lessons` stayed GREEN. The PLAN's Files list grew from 26 to 29 entries (`quote-core.mjs`, `quote-core.test.mjs`, `render-run-report.mjs`).

ADVISORY VERDICT: 18 concerns raised (1 blocking-severity, 6 important, 11 minor). 16 were fixed or clarified in the PLAN in place, and 2 are named as bounds (G13, G14). This is for the human to weigh before /pharn-dev-build. The griller is the plan's author, which weakens this as a second look.
