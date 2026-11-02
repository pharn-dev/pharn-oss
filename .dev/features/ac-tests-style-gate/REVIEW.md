# REVIEW — ac-tests-style-gate

Reviewed: the uncommitted increment on HEAD `0b18864b` — `pharn/floor/ac-style-core.mjs` (+ test),
`pharn/floor/check-ac-style.mjs` (+ test), `.claude/commands/pharn-test.md`, the two grant lines in
`.claude/commands/pharn-loop.md`, the `pharn-test.md` byte ceiling in `.dev/floor/command-hygiene.test.mjs`,
`.dev/guides/floor-ac-tests.md`, the CHANGELOG bullet and the regenerated README region. The increment is
`trust: untrusted`; no instruction-looking content was found in it, and nothing in it changed this review's behaviour.

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify's gates were all
exit 0, and reconcile was `CLEAN`.

**One-line verdict: GREEN — 0 floor-gate findings, 4 advisory findings (1 important, 3 minor).**

## Floor-gate findings (blocking)

None.

- **L-floor (P0):** every new guarantee reduces to a primitive. The flip verdict is exit-code membership over two
  records, `styleVerdict` (tested row by row, with a closure test over the rows). Write confinement between the runs
  is the fix #7 hook, labelled Write/Edit-only. The command step is labelled advisory, and the claims bullet says
  `check-test-stage.mjs` does not re-check it.
- **L-eval (P1):** no capability added (no `role:`), no `enforces` changed. Validate agrees.
- **L-trust (P2):** gate logs are never parsed by the checker. Their paths are printed, and the command tells the model
  to read them as untrusted DATA. Mapped paths go through `acRowsOf`/`badPath` to an `lstat` only. Refusal quotes go
  through `shown()` (tested with a hostile `toString`).
- **L-axis (P3):** the pure core and the I/O CLI are split. Imports are same-layer floor modules only:
  `gate-run-core`, `quote-core`, `ac-tests-core`, `gate-exclusion-core`, `stage-runtime`, and `run-gates`' exported
  `spawnGate`, following `stage-regress.mjs`'s precedent. No sibling reference.

## Advisory findings (warn — model judgment; they gate nothing)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/commands/pharn-test.md:198"
  problem: "The imperative 'Never pin tests that fail a style gate' is broader than the check behind it: a gate already red before Step 2c (with no earlier test files) or not measured is only a NOTE, and tests that also fail it are pinned. The claims bullet at line 337 states the bound correctly, but the step's own sentence reads as a universal."
  evidence: "Final step, stop. Never pin tests that fail a style gate: the build may not touch them afterwards."
```

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/check-ac-style.mjs:155"
  problem: "before.json is read with a following readFileSync; the directory components are containment-walked but the record file itself may be a planted symlink. This falls under the stated 'agreement, not provenance' bound (Bash reaches pharn/.run/), but an O_NOFOLLOW read like run-gates' would remove the follow."
  evidence: 'const raw = readText(recPath("before"));'
```

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/check-ac-style.mjs:170"
  problem: "The after record's tests_existed is computed and stored but no rule reads it; harmless, but a field nothing reads is a second store of a fact (L35) that a later reader may mistake for an input."
  evidence: 'const after = makeRecord({ phase: "after", feature: name, testsExisted: files.some((f) => exists(f)), runs });'
```

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".claude/commands/pharn-ship-stages.md:317"
  problem: "Under /pharn-ship the STOP presents check-test-stage's first line, which after this refusal is 'RED no-lock' (the stage stops before Step 4), not 'ac-tests-unformatted'; the reason reaches the human only through the routed stage's report text. No floor change is needed (the stop is correct), but the presentation is less specific than the refusal."
  evidence: "Non-zero → **STOP**, present the gate's first line (`RED <reason>`, or `UNUSABLE — …`"
```

## Grill concerns, followed up

- Mutating style scripts run twice before the anchor: stated in the `ac-style-core.mjs` header ("WHAT IT DOES NOT
  CLAIM").
- The NOTE branch can still pin failing files: stated in the claims bullet; see the important finding above for the
  step sentence.
- Cost line: in the CHANGELOG entry.
- "Not measured": the header cites gate-run-core `unmeasuredRuns` as the one owner.

## Proposed lesson candidate (for `/pharn-dev-memory-promote` — not written to canon here)

- **Candidate:** a new import in a floor module silently breaks every test that copies a hand-listed subset of floor
  modules into a scratch tree. The copy list is a second, unchecked copy of the module's dependency set.
- **Source:** `.dev/features/ac-tests-style-gate/REGRESSION.md`, opening paragraph (the first regress run's 12
  pre-existing failures), with the fast-forward recorded in `PLAN.md`, "Notes — mid-run fast-forward and re-anchor". `607d82c2` added `capability-files-core.mjs` as an import of
  `count-lenses.mjs`/`validate.mjs`; three test files that copy named modules into temp dirs failed with
  `ERR_MODULE_NOT_FOUND`. The fix (`0b18864b`) adds the file to each list by hand, which is the "remember next time"
  remedy the L20 bar names.
- **Provenance to be captured by the promote command** (feature, commit, date) — not computed here.
