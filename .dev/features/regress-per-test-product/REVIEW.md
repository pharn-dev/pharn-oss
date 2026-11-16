# REVIEW — regress-per-test-product

Floor first: `node pharn/floor/validate.mjs .` GREEN (37 capabilities), before and after the fix round.

The four lenses (L-floor P0, L-eval P1, L-trust P2, L-axis P3) were applied by an independent, read-only reviewer agent
over `git diff 0da70efa..HEAD`. It ran no tests. It also re-reviewed the fix round. Its findings are quoted here as
DATA (P2): free text from a model's read of an untrusted increment. Each finding has a disposition. Severities are the
reviewer's advisory calls (fix #3).

**Verdict: GREEN — 0 floor-gate findings outstanding.** Round 1 raised one floor-gate finding (a likely CI coverage RED)
and 7 advisory ones. All but one were fixed; the PLAN deviation is recorded in `SHIP.md`. The re-review confirmed every
fix and raised 1 minor, also fixed.

## Round 1 — floor-gate

```yaml
- type: FINDING
  rule_id: P1
  severity: blocking
  file: pharn/floor/check-regress.mjs:743
  problem: "The `!record.ok` return in `stampTestsRecord` looks unreachable by every added test, which would break CI's 100% coverage on added lines."
  evidence: "if (!record.ok)\n    return { ok: false, reason_code: \"per-test-record-refused\","
```

**Fixed.** New test: "stamp per-test: a record the builder refuses (an id over the cap) is per-test-record-refused".

## Round 1 — advisory

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: pharn/floor/check-regress.mjs:777
  problem: "When nothing is compared at head (an empty domain, or reporter paths that never match the stamp's `files`), the result still reads as a per-test comparison and silently stays `pre_existing` — L34's vacuous-pass shape."
  evidence: "const domain = new Set(headRun && Array.isArray(headRun.files) ? headRun.files : []);"
```

**Fixed.** The L34 refusal now counts only failed tests in compared files. A red side owned by no compared failure is
`per-test-unaccounted-red`. The test was changed to assert this, with a control.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: pharn/pharn-contracts/regression-report.md:209
  problem: 'The "Re-derivable" claim leaves out the process''s TMPDIR, which baseCheckoutRelative reads.'
  evidence: "The checker reads nothing the stamps do not bind except the config"
```

**Fixed.** The bullet now names the temp root, and says what check E does under a different `TMPDIR`.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: CHANGELOG.md:50
  problem: '"Nothing is read" is not true on the entry-derived path: the entry results file is carried whatever the opt-in says.'
  evidence: "**Unchanged without the opt-in.** Nothing is read and the report keeps its bytes (tested)."
```

**Fixed.** The entry now says that `check-regress.mjs` reads no record without the opt-in. It also states the one
change that does not wait for the opt-in: the carriage, and the `log-unverified` miss it can cause.

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: pharn/floor/check-regress.mjs:757
  problem: "The L34 refusal counted record.counts.failed, which excludes anomalies, contradicting the header's 'whole record' wording."
  evidence: "if (record.exit !== 0 && record.counts.failed === 0 && record.suite_errors === 0)"
```

**Fixed** by the same change: the rule and the header now both say "failed test in a compared file".

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: pharn/floor/check-regress.mjs:150
  problem: "The verdict core imports base-worktree.mjs (and so stage-runtime.mjs / node:child_process) for one pure function; the grill asked the build to record the choice."
  evidence: 'import { baseCheckoutRelative } from "./base-worktree.mjs";'
```

**Fixed.** The `check-regress.mjs` header now gives the reason: one owner of the naming rule (L35), and importing is not
spawning.

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: pharn/floor/render-regression.mjs:80
  problem: "The ignored label says 'inside the feature', but an unmapped absolute BASE path is also ignored."
  evidence: "ignored by file membership (a file the gate was not given — inside the feature)"
```

**Fixed.** The label now reads "inside the feature, or a path not mapped to one".

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: .dev/features/regress-per-test-product/PLAN.md:130
  problem: "The plan names stage-regress.test.mjs for the end-to-end tests; they landed in entry-base-evidence.test.mjs, and the no-opt-in e2e case asserts absence of per_test rather than byte-identity."
  evidence: "`pharn/floor/stage-regress.test.mjs` — end to end over a real repo"
```

**Recorded, not changed.** That file's fixture harness drives both a fresh BASE and an entry-derived BASE in one
project, which this feature needed. `stage-regress.test.mjs` was left untouched. Byte-identity (AC 3) is pinned at the
CLI level in `check-regress.test.mjs`. The deviation is in `SHIP.md`.

## Re-review (fix round) — advisory

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: pharn/pharn-contracts/regression-report.md:221
  problem: "Fix (2) made the Bounds bullet stale: under a changed TMPDIR the base side is now per-test-unaccounted-red (inconclusive), not a false RED."
  evidence: "leaves BASE paths absolute, so every head failure reads as new — the false-RED direction."
```

**Fixed.** The bullet now states the fail-closed refusal, and that an entry-derived BASE is unaffected.

## Checked and clean (the reviewer's summary, as data)

- No false GREEN found. The per-test step runs after both timed-out rules; the splice and sort are sound. The
  `results_sha256` binding, the head-timed-out refusal, the entry-derived carriage and the render fencing hold.
- No existing test title was renamed or removed.
- L-trust: the refusal reasons carry closed codes and `shown()`-bounded values, and no absolute paths. New-failure ids
  render only JSON-escaped inside a fence. No floor op reads `per_test`.

## Lesson candidate

None proposed. Every finding is a first occurrence in this run.
