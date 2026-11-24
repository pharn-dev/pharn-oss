# REVIEW — test-stage-typecheck

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify PASS (all seven
gates), regress `no-regressions` (re-run after the first run's stale `pharn-install.json`, recorded in
`REGRESSION.md`).

Reviewed: `pharn/floor/ac-types-core.mjs`, `pharn/floor/check-ac-types.mjs` and their tests, the two tsc fixtures,
`.claude/commands/pharn-test.md` (Step 3c, refusals, claims bullet), `.claude/commands/pharn-loop.md` (one grant),
`.dev/floor/stage-load-budget.test.mjs`, `.dev/guides/floor-ac-tests.md`, `CHANGELOG.md`, `SKILLS_VERSION`, README badge,
`pharn-install.json`.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-ac-types.mjs:121"
  problem: "The UNUSABLE branch for a log that cannot be read after a red exit has no test; the header and the guide state it, so the claim rests on reading the code, not on an executed case."
  evidence: "if (!log.ok) unusable(`cannot read the ${g.id} log ... after a red exit`);"
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/ac-types-core.mjs:142"
  problem: "An ABSOLUTE diagnostic path is compared with `resolve(root, f)` without realpath, so a checkout reached through a symlink (macOS `/tmp` → `/private/tmp`) can read an error in a mapped file as 'not attributed' — the passing direction, not the refusing one the header names for the case fold. tsc prints paths relative to the invoking directory by default (measured), so this needs an absolute-printing setup; the header's 'paths relative to another directory are not attributed' bound covers it only loosely."
  evidence: "const want = fold(isAbsolute(diagPath) ? resolve(diagPath) : resolve(root, diagPath));"
```

The P0 split otherwise holds: the RED is regex + set membership over the gate output (floor primitive #3), the step's
place in `/pharn-test` is labelled advisory with `check-test-stage.mjs` named as not re-checking it, and both
directions of the exempt list's error are stated in the module header, the claims bullet, the guide and the CHANGELOG
(GATE 1 conditions 1–3).

### L-eval → P1

No capability added. Every verdict row is executed (`ac-types-core.test.mjs`, 14 tests; `check-ac-types.test.mjs`, 10
tests at review, 11 after the coverage test SHIP.md records), each MISSING_TARGET_CODES member individually (L29), the measured CORE-311 shape on real tsc output in both
forms, and a ★ WIRING test that runs the committed Step 3c line. No finding beyond the untested branch above.

### L-trust → P2

Gate output is read only through two anchored regexes; the message text is never kept or printed, and the printed
path is the mapping's own spelling (from AC-TESTS.md), quoted through `shown()`. The command tells the model to read the
log as untrusted data. Nothing in the reviewed files tried to direct this review. No finding.

### L-axis → P3

Core (rules) / CLI (process + I/O) split mirrors `check-ac-style`; `TYPE_SET` lives in the core and is pinned to
`gate-run-core.mjs ALLOWLIST` by a test rather than added there (keeps the diff local). `measured` is imported from
`ac-style-core.mjs` (one copy, L35) — a sibling floor module, which is the floor's flat layout, not a layer crossing.
No finding.

## Verdict

GREEN — 0 floor-gate findings, 2 advisory (minor). Neither is a blocker under the delegated GATE 2; both are carried as
follow-ups in the PR body.

## Proposed lesson candidate

`pharn-install.json` hashes every installed file, so `npm run docs:generate` run before a build's own format pass
leaves a stale manifest that only the full suite catches (here at regress, costing a full re-run). Candidate: "run
`docs:generate` after the build's Step 2b formatting, never before". Recurrence not yet shown (first observed here; L20's
bar asks for a second) — recorded, not proposed for promotion now. Source: `REGRESSION.md` § The first run of this stage.
