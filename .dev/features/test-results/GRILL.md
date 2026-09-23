# GRILL — test-results

Plan: `.dev/features/test-results/PLAN.md` (approved at GATE 1 by the model under the user's overnight delegation,
2026-09-23 — recorded in SHIP.md as a delegated model decision, never a human approval). Spec-hash check: the
recomputed `pharn/ARCHITECTURE.md` digest `edc3d07d…ce091a5d2c` **equals** the plan's `spec_content_hash` (no
drift). **Step 1b lessons-declaration verdict (FLOOR): GREEN**: `check-plan-lessons.mjs` exit 0 (all 11 cited ids
resolve and are referenced in the body). That verdict covers the DECLARATION only, never whether the lessons were
applied.

Method: the inline Step-2 axes; the 13 registered grillers (`count-grillers.mjs` → `{"registered":13}`); and one
independent adversarial pass by a separate read-only agent that probed the plan against the live code (its
findings have their own section). Every finding is advisory (fix #3); the free text quotes the untrusted plan as
DATA.

## Findings — inline interrogation

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/test-results/PLAN.md:5"
  problem: "The plan names no triggering failure. Nothing reads the record in this increment, so its P7 trigger is the maintainer's queued direction plus a demonstrable gap (a suite exits 0 with it.skip), and that should be written down as such."
  evidence: "Additive only: no verify/regress verdict changes."
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/test-results/PLAN.md:111"
  problem: "test-results-core.mjs holds two reasons to change: the reporters' output formats (external releases) and the record's semantics (stamp binding, identity, cross-check). The adapters belong in their own module."
  evidence: "the caps, `readResultsConfig`, the two adapters, `parseResults`, and the exported `testRecord`"
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/test-results/PLAN.md:127"
  problem: "The runner hashes a project-written file with readFileSync: unbounded memory, and a FIFO or device blocks forever while the runner holds the lock. Hash in bounded chunks from a descriptor opened O_NOFOLLOW|O_NONBLOCK and fstat-checked as a regular file."
  evidence: "record `results_sha256` (regular file only, else `null`) on every `runs[]` entry"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/test-results/PLAN.md:136"
  problem: "results_sha256 is recorded on EVERY gate though only RESULTS_GATES members are configurable; the contract must say so, or a reader treats a lint gate's hash as meaningful."
  evidence: "pass `PHARN_TEST_RESULTS` to every spawned gate"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/test-results/PLAN.md:100"
  problem: "On the regress head side the test gate receives only the outside test files after `--`, so a regress record is partial by construction; the contract should state it."
  evidence: "Regress: head side only, by consumers."
```

## Grillers (13 registered)

Applied inline over the plan. `a11y`, `i18n`, `migrations`, `privacy`: no surface (no UI, no user-facing strings,
no data migration, no personal data — the fixtures' captured paths were rewritten to `/work/proj`, and the
sanitizer refuses to write a file still holding a home path). `performance`: the byte, count and id-length caps
are the bound; the fingerprint cost is unchanged because `.pharn/` is excluded. `observability`: a refusal
carries a closed `reason_code` plus a detail string. `security`: the results file is untrusted input (trust
audit); the symlink/FIFO read path is the security-relevant surface, raised above (P5). `testability`,
`error-handling`, `architecture`, `coupling`, `comprehension`, `documentation`: their concerns coincide with the
P3/P5/P0/P6 findings above and the adversarial ones below; no further distinct finding.

## Independent adversarial pass (separate read-only agent)

It confirmed the central claim: adding `results_sha256` breaks no current consumer (no closed key set; check J
re-hashes only `.out`/`.err`, `check-loop-fresh.mjs:426-433`), and writing into `<out>` cannot flip `mutated`
(`worktree-fingerprint.mjs:124`; the base side's `<out>` is outside the base worktree it fingerprints). Its
findings, severity as it assigned them:

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/test-results/PLAN.md:180"
  problem: "A stale results file can be bound to a re-run: stale-lock recovery re-runs an entry without wiping <out>, and the logs are truncated by openSync('w') but the results file is not, so a re-run that writes no file hashes the crashed attempt's file. Unlink the path before spawning."
  evidence: "the record describes THIS run's file"
- type: FINDING
  rule_id: "P4"
  severity: important
  file: ".dev/features/test-results/PLAN.md:149"
  problem: "pharn/ARCHITECTURE.md §4 (:131-135) enumerates every contract, so a new contract makes it stale; 04857b3 and d96ef03 edited that list. It is protected, so the edit belongs in PROTECTED-FOLLOWUPS.md, which the plan says is not needed."
  evidence: "No protected path needs an edit."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/test-results/PLAN.md:196"
  problem: "Suite-level failures vanish from the record: a vitest file that fails to import has no assertions, and Playwright's top-level errors[] is ignored, so a record can read all-green for a run that lost whole files."
  evidence: "Failure messages, durations and every other field are ignored."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/test-results/PLAN.md:187"
  problem: "'No verdict changes' is overstated: validateStamp runs on all three verdict paths, so the new shape check adds a stamp-malformed route for a stamp carrying a malformed results_sha256."
  evidence: "no verdict core reads it"
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/test-results/PLAN.md:197"
  problem: "pharn.config.json is not guarded (CHANGELOG notes no guard protects it), so the opt-in and the format are agent-reachable, not merely human-authored."
  evidence: "`pharn.config.json` is repo-local, human-authored config"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/test-results/PLAN.md:207"
  problem: "L58 is on point and not cited: the results file is a live referent a detached descendant can still write after the runner hashes it, and the plan never says which part may still change."
  evidence: "L43 — the contract states that the sha binding certifies the file is the one the runner hashed"
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/test-results/PLAN.md:120"
  problem: "jest-json is checked only against a hand-built fixture — the L55/L56 pattern for that format — with no live capture behind it."
  evidence: "The same tests in Jest's `--json` shape, built from the vitest capture"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/test-results/PLAN.md:181"
  problem: "'init's wipe' is labelled 'structural', which is not one of the three floor primitives."
  evidence: "plus `init`'s wipe of `<out>` (structural)"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/test-results/PLAN.md:94"
  problem: "Fail-closed applies to the whole record: one flaky test, one test.fail(), a duplicate title or Playwright repeatEach voids every test's result, and adding a test:e2e key before item 02 makes the test gate config-invalid; the contract should state both."
  evidence: "anything else → `unknown-status`"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/test-results/PLAN.md:176"
  problem: "A no-files entry and a pre-6.15 stamp without the key both surface as results-unavailable, indistinguishable from 'reporter not wired' except by the detail text."
  evidence: "results-unavailable (null hash, timed out, missing file, symlink)"
```

Two further minors were checked and are pre-existing, not introduced here: the fingerprint's `.pharn/` exclusion
matches only a leading `.pharn/` relative to `--cwd` (the logs and `state.json` share it), and "Recorded in
SHIP.md" cannot be checked until SHIP.md exists.

## Summary

The design holds where it matters most: the new field is additive to every live consumer and the results file
cannot move the fingerprint. The concerns cluster in three places: the runner's read of a project-written file
(unbounded, blocking, and stale after a lock recovery), the record's silence about suite-level failures, and
honesty of wording (the verdict route `validateStamp` adds, the unguarded config, the missing P7 trigger, L58,
the protected ARCHITECTURE contract list). One plan-shape change follows: the adapters split into their own
module, and the unverifiable `jest-json` member is worth dropping.

ADVISORY VERDICT: 17 concerns raised (0 blocking-severity, 11 important, 6 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this count.
