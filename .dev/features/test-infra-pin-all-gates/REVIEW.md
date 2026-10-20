# REVIEW — test-infra-pin-all-gates

The increment under review is `trust: untrusted` DATA. No instruction-looking content was found in it.

## Step 1 — floor

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The increment adds no capability, no
eval and no `enforces` entry. The pin's behaviour is checked by the floor's own `node --test` suites, and the six
touched suites pass in isolation (`VERIFY.md`).

## Floor-gate (blocking) findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/pharn-contracts/ac-tests.md:387"
  problem: "The closure claim is quantified wider than what it binds. It says the pinned set IS the set discovery runs, but an excluded gate stays pinned, so pinned ⊇ run whenever gates.exclude is non-empty. The closure test calls discoverGates(), which applies no exclusion, so the test holds while the sentence is false in that case."
  evidence: "`gates` ∪ `other_gates` is exactly the set discovery runs (a closure test pins it)."
```

- Probe (L37): a project with `test`, `lint` and `build`, declaring `gates.exclude: ["build"]`, computes
  `other_gates: [build, lint]` and `exclude: [build]`. `build` is pinned but is not run.
- The same sentence is restated in four places (L64): `test-infra-core.mjs:57`, `ac-tests.md:387`,
  `CHANGELOG.md` (the 6.66.0 entry, "exactly the gates discovery runs") and `.dev/guides/floor-ac-tests.md:155`.
- Remedy: reword each to "every gate discovery finds, an excluded one included". This is cheap and clearly right;
  fixed after this review.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/test-infra-pin-all-gates/HUMAN-PATCH.md:49"
  problem: "The patch says each new LIMITS sentence is bound to a test. The detection-only sentence is bound only by a needle test over the module header, which checks the claim is written, not that it is true."
  evidence: "Each new sentence is bound to a test in `pharn/floor/test-infra-core.test.mjs`"
```

- Remedy: say which sentences are probed and which are header-pinned. Cheap; fixed.

### L-eval → P1

- No capability and no `rule_id`, so there is no eval binding to check.
- Each member of each new set has its own test:
  - every ALLOWLIST id, through the closure test;
  - every change kind in `other_gates` and `other_chained`;
  - each old schema (`/5`, `/4`, `/3`), in `test-infra-core` and through the `ac-tests-lock` CLI;
  - the AC gate's `test-infra-changed` and `test-infra-unpinned`;
  - the refusal path.
- The stated bound on files that non-level gates name is probed in both directions: not pinned in general, and
  pinned when a level gate reaches the file.
- No finding.

### L-trust → P2

- A diff line names a gate id, which is an ALLOWLIST member, from discovery or the shape check, so it is safe
  inline. A chained id goes through `shown()`.
- No script text reaches a message. Tests assert this with secret markers and with `curl`/`true`/`prettier`
  probes.
- Old-lock readings never decide from free text: the branch is `Object.hasOwn(recorded, "other_gates")`.
- No finding.

### L-axis → P3

- The pin's definition stays in `test-infra-core.mjs`. `ac-tests-lock.mjs` changes only for the schema;
  `check-ac-tests.mjs` and `ac-gate-core.mjs` change only in prose.
- No sibling reference is added. The test file imports `gate-run-core.mjs`, which is already a dependency of the
  module.
- No finding.

### Other notes (no finding)

- The `pharn-build.md` hunk is one sentence in Step 2. Main has since changed Step 2c of that file (#366), so the
  merge is expected to be clean, but it must be checked.
- `pharn-test.md` is 20,290 bytes against a 20,480 ceiling. A later sentence there will need a ceiling raise.

## Verdict

GREEN — 0 floor-gate findings, 2 advisory findings (1 important, 1 minor), both fixed after this review.

## Proposed lesson candidate

None beyond `SHIP.md`'s deferred candidate, which is that regress's aggregate `tests` gate hides a load-induced red
at base. The quantifier finding above is a recurrence of L37/L64 (a bound restated and over-quantified), already in
canon. Its remedy is the existing one, so it is not a new lesson.
