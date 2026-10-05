# REVIEW — gate-exclusion-config

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`.

**How this review was run (advisory).** An independent, read-only Opus agent applied the four review lenses to the
pushed commit `de8bc3a`. It had a fresh context, was spawned by the orchestrator, and was not the builder. It reproduced
two of its findings in temp repos (R1, R4) and a third against the AC gate (R6). The orchestrator relayed its findings
and decisions. The reviewer's free text below inherits the increment's untrusted tag and is quoted as DATA, attributed
to the reviewer (P2). It reported **0 floor-gate findings**.

It confirmed the following, as relayed:

- no quiet PASS for a test-first or quick SPEC;
- the `testInfraReds` `/4`/`/3` composition;
- `excludedDefect` closed both ways;
- the `pharn-loop.md` S4/S12 cells;
- the reconcile window: every committed path declared, 0 escaped.

## Floor-gate findings

None.

## Advisory findings (quoted from the independent reviewer)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/pharn-contracts/ac-tests.md ('Two windows'); CHANGELOG.md [6.36.0] 'Not pinned'"
  problem: 'An uncommitted exclusion reads scope-escaped (reproduced: check-quick-scope on a temp repo → exit 1, escaped ["pharn.config.json"]); the docs never told the user to commit the declaration, and the ''backstop'' sentence was unconditional though it does not hold when PLAN ## Files names pharn.config.json (check-ac-tests prints only a NOTE), when git ignores the file, and under --quick the backstop is check-quick-scope, not regress.'
  evidence: "R1"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "PLAN.md 'Named residuals'; CHANGELOG.md [6.36.0]"
  problem: "The legacy/bootstrap hatch was presented as unclosable; regress has the base commit and could compare readGateExclusion at base vs HEAD. BRIEFING.md does not carry the disclosure."
  evidence: "R2"
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: "CLAUDE.md (S12 line template); pharn/pharn-contracts/ac-tests.md:168; README.md (pin list, no user-facing gates.exclude subsection); red-run-core.mjs blockedLine"
  problem: "Stale restatements: the closed-line template still read as a /pharn-ship command only, the README listed what /pharn-test pins without gates.exclude and had no user-facing description beside testResults, and blockedLine's wording was awkward."
  evidence: "R3"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/floor/run-gates.mjs:634"
  problem: 'init keyed the declaration on has(args, "--gates") while resolveSet received flag(...) ?? null, so a bare trailing --gates skipped the declaration (and its malformed-config refusal) yet still discovered — the excluded gate ran (reproduced).'
  evidence: "R4"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/floor/check-ac-tests.mjs"
  problem: "An e2e-level AC with e2e excluded is caught only at /pharn-test's preflight, about 20 minutes into a run; /pharn-plan's mapping check could refuse it."
  evidence: "R5"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/ac-gate-core.test.mjs"
  problem: 'The reproduced case — gates.exclude:["typecheck"] added after the lock reads FAIL test-infra-changed, control PASS — is not a test in the suite.'
  evidence: "R6"
```

## Disposition (orchestrator decisions under the user's delegation, applied by the builder)

Every finding was taken within the plan's `## Files`. One file was added to `## Files` by amendment: `pharn-plan.md`,
for R5's HALT line. The scope was then re-set and the reconcile baseline re-anchored. Then `npm run check` and the
`/pharn-dev-verify` gate set were re-run (VERIFY.md).

- **R1.**
  - `pharn-verify.md`, `gate-run-record.md`, `ac-tests.md` and the README now say "declare it and commit it before the
    run".
  - The backstop sentence in `ac-tests.md` and the CHANGELOG is conditional. It names the three cases where it does
    not hold, and `check-quick-scope.mjs` as the `--quick` backstop.
- **R2.**
  - Decision: no base/HEAD comparison is added here, because `stage-regress.mjs` is being changed by another builder in
    the batch.
  - "Unclosable" became "not closed here". The residual is renamed to the follow-up `gate-exclusion-base-compare`:
    regress compares the declaration at base and HEAD and reports a widened exclusion as a closed finding.
  - The docs now state that `BRIEFING.md` does not carry the disclosure (`gate-exclusion-summary-disclosure` kept).
- **R3.**
  - CLAUDE.md's S12 template now names `<remedy>`.
  - `ac-tests.md`'s closed template is `<remedy>`, with its two forms.
  - The README pin list names `gates.exclude`, and a new README subsection, "Excluding a gate", sits beside "Per-test
    results".
  - `blockedLine` now reads "at a level whose gate is not excluded"; its tests are updated.
- **R4.** `run-gates.mjs init` keys the declaration on the PARSED `--gates` value and refuses a valueless `--gates`
  (`usage-error`). The test has a control.
- **R5.**
  - New closed kind `level-excluded` in `check-ac-tests.mjs`. A mapping row whose level's gates are all excluded is RED
    at `/pharn-plan`.
  - One rule, `gate-run-core.mjs` `levelExcludedGates`, read against the root's `package.json`, or every gate of the
    level when there is none. The red-run preflight now calls the same helper (L35).
  - An unreadable declaration is a NOTE.
  - `pharn-plan.md` says a `level-excluded` RED is a HALT, not an AC-TESTS.md fix.
  - Tests:
    - the pure check;
    - the CLI against the user's project shape;
    - the no-manifest rule;
    - three GREEN controls;
    - the NOTE;
    - the required-input `TypeError`;
    - the helper's own cases, prototype keys included (L15).
- **R6.** The reproduced case is now in `ac-gate-core.test.mjs`, with its control PASS.

**Verdict: GREEN — 0 floor-gate findings** (0 found). All 6 advisory findings were fixed.

**Proposed lesson candidate: none.** R4 is one instance of a known shape: a guard keyed on a different reading than its
consumer (L35's one-reader rule). R1 is L64 restatement drift. Neither is a second occurrence of a new mechanism.
