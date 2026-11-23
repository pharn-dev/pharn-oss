# REVIEW — core-298-gate-timeout

Reviewed: `ed2032e0..0bdf9c04` (the build `97d0b5f4` and the test fix `35e70821`; the two merges brought in
`origin/main` and #464 only). Floor first: `node pharn/floor/validate.mjs .` → GREEN (37 capabilities). The increment
is treated as `trust: untrusted`. No instruction-looking content in the reviewed files changed this review.

## Floor-gate findings

None. No increment claim lacks a floor reduction or an `advisory` label. No capability or `enforces` binding changed.
No sibling reference was added.

## Advisory findings

### L-floor (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/build-gate.mjs:248"
  problem: "The build gate re-reads gates.timeoutMs on every invocation, including a CONTINUE of an unfinished run, so a declaration edited between two invocations changes the timeout for the gates still to run. Nothing pins it, unlike the stage scripts (progress record) and stage-direct.mjs (timeout-changed). The contract states the stage-direct bound but not this one."
  evidence: 'const tm = resolveRunTimeout(loadGateExclusion("."), timeout.value);'
```

Disposition: follow-up `build-gate-timeout-pin`. It needs a real failure first (P7). The value only ever lengthens,
and the summary's per-gate exits come from the stamp either way.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-build.md:249"
  problem: "'Wait for its completion notice' rests on the harness moving a timed-out Bash call to the background. stage-exit.md records that as an observed harness behaviour (ADVISORY); the command cites it, and the CHANGELOG says so. A routed /pharn-loop build agent that cannot wait for a notice would see a failed call. That is unmeasured for a declared value above 600 s."
  evidence: "so a call can outlast the Bash timeout: it then moves to the background"
```

Disposition: stated as advisory in the CHANGELOG and `gate-run-record.md`; no change.

### L-eval (P1)

No capability changed, so there is no eval pair to bind. Each of the three CLIs has a test that takes the declared
branch on realistic input and a control without the declaration (L84). Below-pinned refusals are tested in all three.
The raised build-gate budget has a test that fails on either wrong implementation (unraised budget, or the
`budget > timeout` check made on resolved values). The registry change is pinned by `stage-exit-core.test.mjs` and the
two closure tests.

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: "pharn/floor/stage-verify.test.mjs:1286"
  problem: "The build ran only the new cases by name, so it missed two existing closure tests that pin each stage's unusable-set size, and a 500 ms budget slack that failed under load. Verify run 1's test gate caught all three, and they were fixed within ## Files before run 2. Recorded because the build's own check was narrower than the gate that decides."
  evidence: "assert.equal(REGISTRY.verify.unusable.length, 8);"
```

Disposition: fixed (`35e70821`); lesson candidate below.

### L-trust (P2)

`gates.timeoutMs` stays untrusted DATA, read by the existing block reader and used only as an integer after
`timeoutDeclarationError`'s range test. Each refusal quotes it through `effectiveTimeoutMs`'s reason, which uses the
total `shown()` (L62); the tests assert the quoted `"200"`. No decision rests on a free-text field. The new
`detail` on `unusable bad-gate-timeout` is that same reason, and the thin commands already present an exit-2 `detail`
as quoted DATA.

### L-axis (P3)

The three CLIs import `gate-exclusion-core.mjs` and `gate-timeout-core.mjs` from their own floor, as `entry-gates.mjs`
and `stage-direct.mjs` do. `gate-timeout-core.mjs` stays the one owner of the value rule (L35); its header and
`gate-exclusion-core.mjs`'s now name the five callers. No file gained a second reason to change.

### Sweep check (L75)

The plan's sweep hits were re-checked at HEAD. Every hit marked "edited" was edited, and every one marked "still true"
still is. The shortest invariant phrase, `keep their pinned`, no longer matches in `pharn/`, and "two runners" now
appears only in the contract's own sentence, which names both groups.

## Verdict

GREEN: 0 floor-gate findings, 3 advisory (2 minor, 1 important — fixed).

## Proposed lesson candidate (not written to canon)

When an increment adds a member to a closed registry, run every test file that imports that registry, not only the
new cases by name. Closure tests elsewhere pin the set's size and contents. This is close to L29 / L36 (the enumeration
is the deliverable; a presence set is not a closed set), so it may not clear L20's bar as a new lesson. Provenance:
feature `core-298-gate-timeout`, source `.dev/features/core-298-gate-timeout/VERIFY.md` (run 1),
`.dev/features/core-298-gate-timeout/REVIEW.md` (L-eval finding).
