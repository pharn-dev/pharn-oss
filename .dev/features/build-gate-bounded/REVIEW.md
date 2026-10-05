# REVIEW — build-gate-bounded

- **Reviewed commit:** `fb33d07` (PR #309), by an INDEPENDENT reviewer: a separate opus agent the batch orchestrator
  ran. Its findings below are quoted as DATA, attributed to it, and paraphrased only where marked.
- **Decisions:** the orchestrator, under the user's delegation (never a human approval): fix all seven.
- **Fixes:** `1c10537`; merged with `origin/main` 6.38.1 and renumbered to 6.39.0 in `4fa9dd7`.

## Floor gate (blocking)

None. The reviewer reported **0 floor-gate findings** and no flaky test (the build-gate suites 6×, the results and
gate-run suites 4×, the full `npm test` under load 4,627/4,627).

## Advisory findings (the reviewer's, quoted as DATA) and their disposition

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: "pharn/floor/build-gate.mjs"
  problem: "No package.json makes `init` refuse, so both modes exit 2 'treat the gate as fail'; a manifest with only non-allowlisted scripts exits 4 with no way to pass, because --gates was removed. /pharn-verify asks `no-gates` there and lets the human name --gates."
  evidence: "reproduced (R1)"
- type: FINDING
  rule_id: P5
  severity: important
  file: ".claude/commands/pharn-build.md (Step 4)"
  problem: "The exit mapping leaves targeted 2/other unmapped and a targeted red that cannot be fixed in scope (e.g. vitest 'No test files found' when the runner's config excludes every target) as a loop; 'repeat' is unspecified; Step 5's 'floor status (GREEN)' and the claims line do not cover the stop path."
  evidence: "R2"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/build-gate-core.mjs"
  problem: "The '≤16 KiB per call' claim is not true: pointer lines and the head are outside the cap."
  evidence: "reproduced at 17,129 B (R3)"
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/floor/build-gate-core.mjs"
  problem: "A green gate whose record was refused (results-exit-contradiction) says 'the log tail follows' but prints none."
  evidence: "reproduced (R4)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-ship.md"
  problem: "'this prose build gate does not read that list' becomes false with this PR."
  evidence: "R5"
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/floor/build-gate.mjs"
  problem: "CONTINUE (exit 5) does not show the gates already finished, so a red `test` is invisible until the remaining gates run."
  evidence: "R6"
- type: FINDING
  rule_id: P4
  severity: minor
  file: "pharn/floor/build-gate-core.mjs"
  problem: "Record anomalies whose raw status is failed are only counted; the PLAN says 20/50 where the code says 15/40."
  evidence: "reproduced (R7)"
```

| id  | taken | fix                                                                                                                                                                                                                                                                                                         |
| --- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | yes   | No `package.json` (and no `--gates`) → exit 4 in both modes. The helper takes a human's `--gates` exactly as `/pharn-verify` does: one argv string, never filtered; targeted keeps only its `test` id; the continue rule also requires the same spec. `run-gates.mjs init --stage build` accepts `--gates`. |
| R2  | yes   | Step 4 maps every exit of both lines; an unfixable targeted red goes to the full line; "repeat" is targeted rounds then one full run; Step 5 runs on every stop and records the gate as failed; the Step 5 record line and the claims line say so.                                                          |
| R3  | yes   | The cap is enforced: a bounded table (ids cut to 80 chars, ≤ 40 rows plus a count), one closing pointer line reserved up front; tests assert ≤ 16,384 B, including an adversarial 200-gate case.                                                                                                            |
| R4  | yes   | A refused record's gate reads and prints its log tail, green or red.                                                                                                                                                                                                                                        |
| R5  | yes   | `pharn-ship.md`'s sentence now says the build gate leaves e2e out and the exclusion applies to both. With R1 the bullet's `--gates` clause is true, so the residual `ship-build-gate-cite` is closed.                                                                                                       |
| R6  | yes   | CONTINUE prints every finished gate's id, exit and runner-call time, red ones marked.                                                                                                                                                                                                                       |
| R7  | yes   | A duplicated-id test with a `failed` raw status is listed (marked `duplicate-test-id`) with its excerpt; the code's 15/40 kept and the PLAN aligned to it. The hygiene ceiling comment refreshed (22,722 B now).                                                                                            |

The reviewer also confirmed, as fine: continue-or-start and the wrapped budget; untrusted text fenced; targets
checked twice; no `messages` leak; the `resolveSet` build-branch order; the ceiling raise follows the rule.

## Re-verification

`/pharn-dev-verify` PASS on `4fa9dd7` (test 4,688/4,688; reconcile CLEAN over an empty window — see VERIFY.md);
`check-changelog-entry --merge-base origin/main` GREEN.

## Lesson candidate

None clears L20's bar: R3 (a size claim stated beside a cap that did not count all of the output) is a first occurrence
here.

**Verdict: GREEN** — 0 floor-gate findings; 7 advisory findings, all fixed.
