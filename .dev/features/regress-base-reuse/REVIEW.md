# REVIEW — regress-base-reuse

- increment: within one `/pharn-loop` or `/pharn-ship` run, a later `/pharn-regress` reuses the BASE-side evidence
  an earlier one left when tested code shows it agrees with the current BASE requirement; the HEAD side always runs
  (6.33.0).
- diff under review: the working tree against base `a2b5f6b` (6.32.1), branch `regress-base-reuse`, uncommitted.
- reviewer: an independent context (opus), not the plan's author, run read-only. Every probe ran under the OS temp
  dir, and no repo file was written by the reviewer. This file is written by the orchestrator, with the writes-scope
  set to this file only.
- trust: the increment was read as `trust: untrusted`. Nothing in it tried to steer the review.

## Step 1 — floor (P0)

- `node pharn/floor/validate.mjs .` → **GREEN — 36 capabilities checked**.
- The feature's suites (`regress-base-reuse-core`, `regress-base-reuse`, `stage-regress-core`, `gate-run-core`,
  `render-regression`) → 175 / 175 pass. `stage-regress.test.mjs` → 85 / 85 pass. The COMMAND BUDGET subset of
  `.dev/floor/command-hygiene.test.mjs` → 5 / 5 pass.
- `check-changelog-entry.mjs --base-ref main`, `check-skills-version-recorded.mjs` and `check-version-badge.mjs` →
  GREEN. `MIN_CLI` stays `0.5.0`: no installed path moves.

**VERDICT (as reviewed): blocked-with-2-floor-findings.** Both were claim sentences in shipped text, not code
defects. No false-HIT sequence was found that needs no writer the PLAN already names, except A2 (below). All five
findings were fixed in the build before GATE 2 (see "Disposition").

## Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: P0
  severity: blocking
  file: ".claude/commands/pharn-regress.md:64"
  problem: "The claims block labels as 'a floor decision' a PROVENANCE claim — that a reused base side is evidence 'an earlier /pharn-regress of the same run produced' — which the floor cannot establish and the module's own header disclaims."
  evidence: "evidence an earlier `/pharn-regress` of the same run produced for the identical requirement — a floor decision."
- type: FINDING
  rule_id: P0
  severity: blocking
  file: "pharn/pharn-contracts/regression-report.md:256"
  problem: "The contract (and CHANGELOG [6.33.0]) states that a standalone /pharn-regress never reuses; deliveryRunIdentity() tests only marker presence and mtime, so a marker an interrupted run left (≤ 24 h) makes a hand-run regress reuse or record."
  evidence: "a standalone `/pharn-regress` never reuses"
```

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CLAUDE.md:723"
  problem: "'(both hooks deny it)' and the CHANGELOG's 'which neither write guard lets the write tools touch' overstate: only the COMPOSED guard denies the record path — protect-trusted-paths in a main checkout, enforce-writes-scope in a linked worktree (probed with the real hooks)."
  evidence: "(both hooks deny it)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/regress-base-reuse.mjs:195"
  problem: "head_root is hashed at publication and compared with a requirement built at the same instant, so a root-level HEAD file edited while a budgeted MISS chain is paused on the base side gets its new content bound to base evidence produced under the old content; the next invocation would HIT."
  evidence: "const headRoot = headRootNow();"
- type: FINDING
  rule_id: P4
  severity: minor
  file: "pharn/pharn-contracts/regression-report.md:253"
  problem: "The contract restates all 13 BASE_REUSE_MISSES members with glosses and no test pins that list to the enum."
  evidence: "one member of the closed set `BASE_REUSE_MISSES`"
```

## Lenses

- **Trust (P2):** markers are hashed, never parsed; the record is validated against a closed schema; the render quotes
  only booleans, enum members, hex digests and fixed `why` tokens.
- **Axis (P3):** the pure core and the I/O module are split along the rule and storage axes. `run-gates.mjs` and
  `reconcile-baseline.mjs` are imported safely: both guard their CLI with `import.meta.main`.
- **Evals (P1):** no capability added, so no eval is owed.
- **Floor claims (P0):** the two blocking findings and A1 above. The checklist otherwise passed: the requirement is
  not keyed by the base SHA alone; stale outside-test, structural and gate membership all MISS; independent runs are
  separated by the marker digest; unfinalized evidence is refused by `validateStamp`; the HEAD side always runs;
  `check-regress.mjs` is untouched and `validateStamp` untouched; the retained evidence survives scratch clears;
  resume semantics change only as documented (progress `/2`); check-loop-fresh reads a HIT run FRESH; the reads are
  lstat-first and no-follow; the MISS controls are non-vacuous; and the equivalence test compares a real regression,
  a pre-existing red gate and a structural pair.

## Disposition (fixed in the build, before GATE 2; every file inside PLAN.md `## Files`)

- **B1** — the claims line, the render line and the contract's `reused` gloss now claim AGREEMENT (marker, record,
  stamp and logs agree with this invocation's requirement: floor) and label "an earlier `/pharn-regress` of this run
  produced it" advisory (L43). The core module's first line is worded the same way.
- **B2** — the contract and CHANGELOG now say: an invocation with no open delivery-run marker never reuses or
  records; a marker an interrupted run left (≤ 24 h) makes a standalone invocation part of that run.
- **A1** — CLAUDE.md and CHANGELOG name which guard denies the record in which checkout.
- **A2** — `publishRecord` takes `decisionRequirementSha256` and refuses with `requirement-moved` unless the
  requirement at publication equals the one the decision saw. New tests: a unit case in `regress-base-reuse.test.mjs`
  and the end-to-end control "A2 — a root-level HEAD file edited while a budgeted MISS chain is paused…" in
  `stage-regress.test.mjs` (edits `tsconfig.json` during a base-side pause: `recorded: false`, no record, and the
  next run misses `no-record` and recomputes). Mutation: with the new line deleted, both tests fail (1 / 1 and 1 / 8);
  restored, both pass.
- **A3** — the contract no longer restates the members. Their glosses live once, above `BASE_REUSE_MISSES` in
  `stage-regress-core.mjs`, and a new test pins those glosses to the enum, in order, both ways.

## Lesson

None: B1 and B2 are another occurrence of L43 (agreement, never provenance), plus an absolute that dropped a bound
the same CHANGELOG entry already names. L43 covers the class.
