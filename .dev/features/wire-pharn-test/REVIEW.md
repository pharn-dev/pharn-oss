# REVIEW — wire-pharn-test

Floor first: `node pharn/floor/validate.mjs .` → **GREEN**. Method: the four inline lenses, an executed smoke test of
the Step 6c builder (which found the `check-ignore` defect below), and one independent read-only reviewer agent (it ran
289 tests across the touched suites and probed the new checker). The increment is `trust: untrusted`; no
instruction-looking content was found.

## Iteration 1

### Found by executing the Step 6c builder (before the agent reported)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-loop.md:628"
  problem: "The staging builder ran `git check-ignore` under GIT_LITERAL_PATHSPECS=1, which that command refuses (exit 128, 'pathspec magic not supported'), so its ignored-path filter NEVER fired — pre-existing since the builder shipped; an ignored plan path failed `git add` instead of being dropped, and the new pinned-test check could not see an ignored test."
  evidence: 'if (ok(["check-ignore", "-q", "--", p])) continue;'
```

### Advisory findings (the agent; 0 blocking)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/check-test-stage.mjs:130"
  problem: "Paths were built with join(cwd, p), which re-roots an ABSOLUTE --base under cwd: a legacy SPEC with a stray lock read NOT-APPLICABLE (reproduced), and the other branches read a false no-mapping / no-lock."
  evidence: "present(join(cwd, p))"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/check-loop-fresh.mjs:585"
  problem: "The loop's 'only READY test-first' policy lived in command prose; check I (and the build) accepted NOT-APPLICABLE and READY bootstrap, so a SPEC changed around the gate after Step 4 would build, pass every freshness read and commit without pinned tests — and the CHANGELOG said the loop re-reads rather than trusts the front."
  evidence: "if (t.status !== 0) {"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: "pharn/floor/check-loop-fresh.test.mjs:617"
  problem: "The plan promised check I tests over a templated feature; only a legacy world existed, and the sandbox module list could not run the lock script, so READY test-first through check I (cwd = --repo) was never exercised."
  evidence: "writeFront — a legacy SPEC"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-ship.md:371"
  problem: "Stale step numbers after the renumbering (steps 2–7, step-6 INCOMPLETE, step 6 FAIL, step 6/7 at GATE 2); stale pin-consumer counts in pharn-verify.md:142 and pharn-build.md:325; CLAUDE.md:350's 6.17.0 bound."
  evidence: 'Only reachable from a step-6 `.verdict == "INCOMPLETE"`'
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".claude/commands/pharn-loop.md:496"
  problem: "The Outcome `ac-tests:` line had no value for a stop AT the test stage (S12, or S9 from Step 4)."
  evidence: "`ac-tests:` — the Step-4 token (`test-first`, `bootstrap`), or `not reached`"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop.md:634"
  problem: "The builder's exit-4 check covered the pinned tests but not the lock itself: a symlinked or ignored lock was silently dropped while its tests were committed."
  evidence: "const pinned = fs.existsSync(lockPath) ? …"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/check-test-stage.mjs:106"
  problem: "The header said a child that could not run is exit 2, but a CRASHED child exits 1 and reads as its RED."
  evidence: "a child that could not run or returned an unknown code"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/check-loop-fresh.mjs:592"
  problem: "The STOP reason's quoted lock line was described as 'the PATH (never content)', but a lock path is an untrusted, agent-editable string."
  evidence: "which names the PATH (never content)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-ship-briefing.mjs:432"
  problem: "The briefing's `test` row sat under a `verdict` column, reading as a verdict the contract says it is not."
  evidence: "| test | ${acTestsMode} |"
```

**Verdict (iteration 1): 0 floor-gate findings; 4 important and 7 minor, all to fix.**

## Iteration 2 — the fixes, re-reviewed

| finding                | outcome                                                                                                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| builder `check-ignore` | **fixed** — run without `GIT_LITERAL_PATHSPECS`; the committed builder is EXECUTED by a test (a pinned test staged, an ignored plan path dropped, a missing / ignored pinned test and an ignored lock each exit 4).                                                     |
| 1 absolute `--base`    | **fixed** — `resolve(cwd, p)`; a test with an absolute base.                                                                                                                                                                                                            |
| 2 loop policy in prose | **fixed** — `check-test-stage.mjs --require-test-first` (new reason `mode-not-allowed`), passed by the loop's Step 4 and by check I; the Step-4 branch collapses to "exit 0, else the preflight decides S12 or S9". Tested both ways and executed from the pinned line. |
| 3 check I tests        | **fixed** — the loop-fresh fixture is now a TEMPLATED feature with a real lock carrying a red run; check I is exercised READY → FRESH, and a lock without a red run, a rewritten pinned test and a removed `spec_template` each STOP, from `--repo` and a subdirectory. |
| 4 / 5 stale numbers    | **fixed** — ship's step references, verify's and build's consumer counts, CLAUDE.md's bound.                                                                                                                                                                            |
| 6 Outcome value        | **fixed** — `refused` for a stop at the test stage.                                                                                                                                                                                                                     |
| 7 lock not checked     | **fixed** — the lock itself must be a regular, non-ignored file (exit 4); tested.                                                                                                                                                                                       |
| 8 crash wording        | **fixed** — the header says a crashed child reads as its RED (fail-closed).                                                                                                                                                                                             |
| 9 trust wording        | **fixed** — "a truncated, untrusted string from the lock".                                                                                                                                                                                                              |
| 10 briefing row        | **fixed** — `mode: <m> (recorded, not a verdict)`.                                                                                                                                                                                                                      |

Re-verified after the fixes: 3152/3152 tests, regress `no-regressions`, verify `PASS` (clean map), reconcile `CLEAN`.

**Verdict (iteration 2): GREEN — 0 floor-gate findings, 0 open advisory findings.**

## Proposed lesson candidate

None new. The builder defect recurs canon L45 (an invocation is covered only by executing it — the builder had never
run in a test), and finding 2 recurs L35/L22 (a policy restated in prose instead of held by the one checker).
