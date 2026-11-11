# Triage-check measurement — loop-grill-triage (grill P1 follow-up)

**Result: 0 of 5 RED. Every run's `grill-triage.json` passed `grill-triage.mjs check` on its first call, with no repair
round. All five verdicts escalated (3 `replan`, 2 `spec`), so all five full loops would stop at S16 for a person.**

Measured 2026-11-10, after 7.7.0 merged (pharn-oss `89c8b13b`), closing the post-build grill's P1 concern
(`GRILL.md`): the grill side was measured before the build (`GRILL-CHECK-MEASUREMENT.md`), the triage side was not.
Advisory: five runs on one project, one model, one Claude Code version. It is evidence before part 2b gates more
rounds on this check, not a rate.

## Method

- **The same five grills.** The grill measurement's scratch worktrees were gone, so each run's `grill-findings.json`
  and `GRILL.md` were rebuilt from that run's transcript: each was written by one `Write` call and never edited. The
  rebuild is exact: `grill-findings.mjs check` over each rebuilt pair prints the same GREEN line as the original run
  (the same finding count, round 1, and "GRILL.md's section equals the render").
- Five scratch worktrees of pharn-starter `main` (`75316707`, the grill measurement's commit), each overlaid with the
  7.7.0 product surface from pharn-oss (`pharn/floor/` without tests, contracts, grillers, `pharn-core`, the four
  trusted docs, the product commands and the hooks), the feature's `SPEC.md` and `PLAN.md` from the same agent
  worktrees as before, and the rebuilt grill outputs.
- Each triage ran headless on the model the loop routes it to (pharn-starter's `models.stages.default`):
  `claude -p "/pharn-triage <name>" --model sonnet --effort high --permission-mode acceptEdits`, with `--allowedTools`
  for `node pharn/floor/*` and the scope setter. Claude Code 2.1.322. One run at a time.
- Afterwards, outside the run: `node pharn/floor/grill-triage.mjs check <triage> --findings <findings>`, plus a trace of
  every `skeleton` / `check` call the triage made and its first output line.

## Results

| run | feature                | findings (b / i / m) | triage's calls          | final check    | verdict  | proceed / replan / spec | time | cost  |
| --- | ---------------------- | -------------------- | ----------------------- | -------------- | -------- | ----------------------- | ---- | ----- |
| g1  | `reauth-binding`       | 10 (1 / 4 / 5)       | skeleton → check exit 3 | exit 3 (valid) | `replan` | 5 / 5 / 0               | 44 s | $0.42 |
| g2  | `reauth-per-session`   | 8 (0 / 2 / 6)        | skeleton → check exit 3 | exit 3 (valid) | `replan` | 6 / 2 / 0               | 49 s | $0.46 |
| g3  | `erasure-closes-teams` | 7 (1 / 3 / 3)        | skeleton → check exit 4 | exit 4 (valid) | `spec`   | 4 / 2 / 1               | 36 s | $0.43 |
| g4  | `actions-oidc-policy`  | 8 (0 / 3 / 5)        | skeleton → check exit 3 | exit 3 (valid) | `replan` | 5 / 3 / 0               | 34 s | $0.38 |
| g5  | `billing-plan-roles`   | 8 (1 / 4 / 3)        | skeleton → check exit 4 | exit 4 (valid) | `spec`   | 4 / 2 / 2               | 35 s | $0.52 |

Time is wall-clock for the whole headless session; cost is the session's reported total.

**Severity against disposition, all 41 findings:**

| severity  | proceed | replan | spec |
| --------- | ------- | ------ | ---- |
| blocking  | 0       | 1      | 2    |
| important | 5       | 10     | 1    |
| minor     | 19      | 3      | 0    |

- Each run called `check` exactly once and it passed; no run used its one repair round.
- Every `blocking` finding was escalated, as the checker requires. 11 of 16 `important` findings were escalated too.
- No `reason` copies its finding's `problem` text (a 60-character prefix match); reasons ran 140–355 characters, well
  under the 2,000 limit.
- A read of the escalated reasons in g2 and g4 (the two runs with no `blocking` finding): each names a concrete plan
  change (a missing database-failure code, a test the plan adds but never runs, an undefined cache rule, an untested
  production store) or, for g2's `G1-8`, a question the grill raised for a person, which the command's "when unsure,
  `replan`" rule sends to a person. Judgment of whether each escalation was right is advisory and was not made here.
- Every run had one to two refused tool calls: a compound shell command (`node …; echo "exit $?"`) that headless mode
  would not approve. Each run retried the command alone and went on; none affected the output. A check exit of 3 or
  4 is also reported as a tool error by Claude Code, though it is a valid verdict.

## Notes for part 2b and the loop

- **The producer is reliable on these inputs:** 5 of 5 first-call valid, so a RED triage check (S9) is not the likely
  stop. The likely stop is S16.
- **Every one of these five full loops would stop for a person.** Before 7.7.0 the full loop ran its grill floor-only
  and both floor stops were GREEN on all five plans, so all five would have gone on to the build. The `blocking` rule
  alone accounts for three of the five (g1, g3, g5, as the grill measurement predicted); the triage's own judgment on
  `important` findings adds g2 and g4. Part 2b's automatic re-plan rounds would act on these `replan` verdicts; the
  two `spec` verdicts would still stop for a person.
- **Cost of the stage:** 34–49 s and $0.38–$0.52 per triage, against 229–284 s and $2.51–$3.11 for the routed grill it
  follows. The 7.7.0 CHANGELOG states the triage time as not measured; this is that measurement.

## Bounds

- Five runs; a first-call RED rate below 1 in 5 is not established, only that none of these five was RED.
- The triage ran as a headless `/pharn-triage <name>` session, not as the loop's routed stage agent with its brief; the
  command and model are the same.
- The findings are one grill run per plan; another grill of the same plan raises other findings and so other
  dispositions.
- Model, effort and project are fixed; another project's plans may produce other shapes.
