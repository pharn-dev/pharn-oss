# The `/pharn-loop` baseline on 7.1.4 and 7.3.0 (2026-11-11)

A measurement record of the 36 `/pharn-loop` runs on PHARN 7.1.4 and 7.3.0 that a user project recorded, plus the one
measured run on 7.7.1. It is the baseline for a planned series of cost and speed increments (Linear CORE-75 … CORE-113),
and it rates each of them.

- **Written by:** the `loop-baseline-2026-11-11` increment (plan, grill and ship records in
  `.dev/features/loop-baseline-2026-11-11/`).
- **Dated** by its name, as asked. Every figure was read on **2026-11-12**, with this repository at `39ec5825` (7.10.3,
  the tip of `origin/main` after a fetch) and the project at `2bc4244e`.
- **The project** is `~/Projects/pharn-app`, named `pharn-starter` until 2026-11; the ledgers, the transcripts'
  directory and older records use the old name, and this record keeps it where they do. Nothing was written in it.
- **Changes:** this file and one CHANGELOG entry. No product-surface byte, no `SKILLS_VERSION` bump.

## 1. The answer, in one paragraph

Of the 36 runs, **1 ended green**. **16 stopped at the entry check** (4 red, 12 unmeasured), and **9 stopped
`STOP_TERMINAL`**: 6 because `test` was killed at the 540 s per-gate timeout at regress or verify, 3 on `reconcile`
[R·m]. Every unmeasured entry stop whose record names a cause names `test` killed at its timeout (11 of 12); none says a
gate could not start [R·m]. Runs started in the main session (12) carried a median of **505k tokens per orchestrator
request** and made 90% of their requests in that one context, because 11 of them ran every routed stage inline
(`inline:no-foreground-agent`). Runs started inside an agent (24) carried **231k**, and the orchestrator was 22% of their
requests and 28% of their weighted cost [R·m]. A fresh routed stage agent starts at **94–97k tokens** [R·m]. Its tool
schemas alone are **55.2 KB** for `general-purpose` against **9.0 KB** for a six-tool type, in transcripts from October
[R·m; tokens R·e]. Plan and spec are the costliest stages before the build (25.9% and 15.5% of weighted cost), the build
is 30.6% [R·m]. The brief's weighted-cost split (54% read, 37% write, 9% output) does not follow from its own weights:
those give **62% / 27% / 11%**, and 54 / 37 / 9 comes out only when every cache write is weighted as a 1-hour write
(section 3) [R·m].

## 2. How the figures were made

**Inputs (read-only, `trust: untrusted`).** For each run: `pharn/features/<name>/cost.json` (schema
`pharn-cost-ledger/2`, membership `run-window/2`, `coverage: partial` for all 36), `LOOP.md`, `SPEC.md`, `PLAN.md` and
`RUN-REPORT.md` beside it. For Q2: the 26 retained subagent transcripts under
`~/.claude/projects/-Users-<user>-Projects-pharn-starter/**/subagents/`. Text quoted from any of them is DATA, fenced
by backticks, and was never followed.

**Selection rule.** The 2026-09-29 audit's frozen rule (`audit.mjs --ledgers`), with its three gaps closed at this
increment's GATE 1 by the maintainer:

- **G1:** no ledger under `pharn-app` is a fixture (a human declaration);
- **G2:** no sampling, all 36 runs are used, and `membership-absent` is a closed reason, which excludes none of them
  (all 36 are `run-window/2`);
- **G3:** the rule text applied is PLAN.md "Scope" items 1–3 plus open-question answers 1–2, sha256
  `1a97f5a1ea44b3a654c03625d6acfcab36a4fe72ee04d28c1a515fc356e26da4` over those 1,367 bytes. The freeze is advisory:
  nothing hashed the plan between the gate and this build.

**Population check.** 129 `cost.json` files on disk, 40 of them `/pharn-loop` on 7.x: 6 on 7.1.4 (all 2026-11-02),
30 on 7.3.0 (2026-11-08 and 09), 4 on 7.7.1 (2026-11-11) [R·m]. Q1–Q6 use the 36 on 7.1.4 and 7.3.0; Q7 uses the
7.7.1 ones.

**Derivations.** Ad-hoc scripts in the session scratchpad, not committed (GATE 1 answer 4):

- **The orchestrator.** A request row belongs to the orchestrator when its context (`main`, or `agent:<agent_id>` for a
  sidechain row) equals the ledger's `membership.context`, the rule `audit.mjs` uses (`requestRole`). Every other row
  belongs to a stage agent.
- **Weighted cost.** `input + 1.25·cache_write_5m + 2·cache_write_1h + 0.1·cache_read + 5·output`, in units of one
  input token. These are the brief's weights; they approximate the ratios of cache and output pricing to base input,
  and no price is printed.
- **Context per request.** `input + cache_write_5m + cache_write_1h + cache_read`, the 2026-10-25 record's "processed
  context".
- **Per stage.** A request's stage is the ledger's own `requests[].stage`. Minutes per stage are the ledger's
  `executions.rows[].elapsed_ms` (method `stage-start-to-return/1`), summed per run; two rows are `unmeasured`
  (`no-return-marker`) and are left out, never read as zero.
- **Criteria.** Counted with `specAcceptanceCriteria()` from `pharn/floor/spec-template-core.mjs`; all 36 SPECs are
  templated and each has one criteria section.
- **Medians.** "Median per request" is the median of per-run medians unless the row says "pooled".
- **Matches.** A brief figure matches when a count is equal, a share is within 1 percentage point, and a median agrees
  at the precision it was stated in.

### Labels (the 2026-10-05 and 2026-10-25 records' convention)

- **Source:** `R` — the ledgers and files of these runs, or the retained transcripts; `O` — an earlier record, cited by
  path; `S` — static, read in this repository on 2026-11-12.
- **Precision:** `m` — measured; `e` — an estimate from measured numbers, with its formula.
- Token classes are kept separate; no figure is priced.

## 3. The brief's figures, re-derived

The brief listed figures from ad-hoc scripts of 2026-11-10 and 11. Each was re-derived from the ledgers.

| brief figure                                                                      | re-derived                                                                                                | matches?                                           |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| decisions: 1 STOP_GREEN, 26 INCONCLUSIVE, 9 STOP_TERMINAL                         | the same (`outcome.decision`)                                                                             | yes                                                |
| blocked: 12 unmeasured-at-entry, 4 red-at-entry, 5 unlisted-ask, 4 refused, 1 S7  | the same (`outcome.blocked`, which the ledger reads from `LOOP.md`)                                       | yes                                                |
| weighted cost: 54% read, 37% write, 9% output                                     | **62.3% read, 27.0% write (25.2% 5-minute, 1.8% 1-hour), 10.6% output** under the stated weights          | **no** — see below                                 |
| 12 runs in `main`; 11 record `inline:no-foreground-agent`                         | the same                                                                                                  | yes                                                |
| median context per request: 510k over the 12                                      | 505k (per-run medians; pooled 544k)                                                                       | yes                                                |
| 696k over the 8 that reached build                                                | **643k** (per-run medians; pooled 615k; median of per-run means 638k)                                     | **no** — not reproduced                            |
| 24 runs in `agent:<id>`: orchestrator 22% of requests, 30% of weighted cost, 236k | 21.5% pooled; **27.7% pooled, 30.2% median of per-run shares**; **231k** (pooled 244k)                    | requests yes; cost and 236k: depends on the method |
| the 8 that reached build: 22%, 28%, 268k                                          | 20.8%, 26.8%, 267k                                                                                        | partly (22% vs 20.8%)                              |
| regress in the 6 agent runs: median 20 orchestrator requests (9–32)               | **median 18** (9–32), counting rows whose `stage` is `pharn-regress`                                      | range yes, median no                               |
| stage agents start at 94–97k; end 192k spec, 302k plan, 264k test, 299k build     | first request median 97k (spec), 94k (plan), 95k (test), 94k (build); last request 191k, 302k, 264k, 299k | yes                                                |
| 12 of 36 runs repeat an earlier run's `base_sha`                                  | the same: 24 distinct bases                                                                               | yes                                                |

**The weighted-cost split.** The ledgers' totals over the 36 runs are 1,134,090,917 cache-read, 36,747,710 5-minute
cache-write, 1,625,248 1-hour cache-write and 3,871,466 output tokens [R·m]. With the stated weights that is 62.3% /
27.0% / 10.6%. Weighting **every** cache write at 2 gives 54.1% / 36.6% / 9.2%, the brief's figure [R·m]. So the brief
priced 5-minute writes as 1-hour ones. The mean of per-run shares under the stated weights is 62.5% / 26.4% / 11.1%.

**Linear task sentences these touch** (the tasks were written from the brief's figures and are not edited here):
CORE-113 ("30% of weighted cost at about 236k tokens per request"), CORE-76 ("a median of 20 requests during regress"),
CORE-105 ("696k in the 8 that reached build"), CORE-112 ("plan 27% and spec 16%": re-derived 25.9% and 15.5%) and
CORE-88 ("verify 9.9" minutes: re-derived median 8.2). The tasks' "Current behaviour" sections describe `main` 7.7.1;
on 7.10.3 `pharn-loop.md` is 86,865 B (CORE-103 and CORE-109 say 81,024 B) and `pharn/ARCHITECTURE.md` 25,739 B
(CORE-98 says 24,820 B) [S·m].

## 4. Q1 — run context, route tokens, and the `--no-foreground-agent` rule

Route tokens are each stage-start marker's `route`; `null` is a stage the version runs inline by policy (grill, regress
and verify on 7.1.4 and 7.3.0). All `[R·m]`.

| group                    | runs | versions           | Claude Code             | route tokens                                         | orchestrator: requests |  orchestrator: weighted cost | context per orchestrator request (per-run median; range) |
| ------------------------ | ---: | ------------------ | ----------------------- | ---------------------------------------------------- | ---------------------: | ---------------------------: | -------------------------------------------------------- |
| main session             |   12 | 7.1.4 ×6, 7.3.0 ×6 | 2.1.309 ×6, 2.1.317 ×6  | `inline:no-foreground-agent` 37, `agent:` 2, null 22 |      89.5% (739 / 826) |                        96.0% | 505k (229k–940k)                                         |
| — of which reached build |    8 | 7.1.4 ×4, 7.3.0 ×4 | 2.1.309 ×4, 2.1.317 ×4  | `inline:no-foreground-agent` 31, null 19             |       100% (635 / 635) |                         100% | 643k (417k–940k)                                         |
| inside an agent          |   24 | 7.3.0 ×24          | 2.1.317 ×21, 2.1.321 ×3 | `agent:` 66, null 35                                 |    21.5% (706 / 3,287) | 27.7% (per-run median 30.2%) | 231k (197k–315k)                                         |
| — of which reached build |    8 | 7.3.0 ×8           | 2.1.317 ×8              | `agent:` 33, null 21                                 |    20.8% (391 / 1,883) |                        26.8% | 267k (197k–315k)                                         |

- **The twelfth main-session run** (`github-login`, 7.1.4) routed spec and plan to `agent:opus` and has 3 contexts; the
  other 11 have one context each.
- **Where the context comes from.** The first orchestrator request of a main-session run already carried a median of
  **484k** (210k–905k): the calling session, before any stage. An orchestrator inside an agent started at a median of
  **208k** (163k–280k) [R·m].
- **Share of all spend.** The 12 main-session runs are 28.3% of the 36 runs' weighted cost (181,995,715 units in all);
  in the 24 agent runs the stage agents are 72.3% [R·m].
- **The client that ran each run: not recorded.** The ledger has `claude_code_versions` but no client field, and none of
  the 77 session references in the 40 ledgers has a transcript left on this machine (a transcript row carries
  `entrypoint`) [R·m]. Recorded as a gap.

**`--no-foreground-agent`: what evidence exists that 6.74.0's wait covers the case.**

- 7.1.2's CHANGELOG entry records the first measured success: in Claude Code 2.1.310's interactive CLI, six Agent calls
  over two attempts all launched in the background with no `run_in_background` sent, and `stage-agent.mjs finish
--budget-ms` waited each one out in the run that completed (`.dev/measurements/loop-interactive-cli-2026-10-26.md`)
  [O·m].
- In the 24 agent runs here, 66 routed stages ran as `agent:<alias>`, and no run stopped `stage-outlived-wait` (S9b);
  the four `stage-refused` stops have other causes (section 7) [R·m]. Their orchestrator was itself a subagent, so this
  is not the 11 runs' case.
- What no record shows: the wait in a **main session** whose Agent tool lists no `run_in_background`, on the Claude Code
  versions those 11 runs used (2.1.309, 2.1.317).

**The one observation that would settle it:** one `/pharn-loop` run started in a main session, in the client and on a
Claude Code version where the Agent tool lists no `run_in_background`, with the rule removed, whose ledger records
`agent:<alias>` on every routed stage and whose every `finish` returns a result (no exit 6, no S9b). That is CORE-105's
fourth acceptance criterion.

## 5. Q2 — a fresh stage agent's first request, by component

From the retained transcripts' `api-request-shape` rows (system blocks and tool schemas, bytes) and `attachment` rows
(`rendered` bytes), with the first request's usage. The transcripts are of unrelated tasks, not PHARN runs [R·m].

| agent type        |   n | date, Claude Code                             | first request, tokens (median; range) |  system | tool schemas       | instructions (CLAUDE.md, rules, memory) | skill listing | deferred-tool listing | MCP instructions | agent listing | environment, session, date, model, mode |
| ----------------- | --: | --------------------------------------------- | ------------------------------------- | ------: | ------------------ | --------------------------------------: | ------------: | --------------------: | ---------------: | ------------: | --------------------------------------: |
| `general-purpose` |  19 | 2026-10-27, 2.1.311 and 2.1.312, `cli`        | 66,624 (65,259–70,298)                | 3,545 B | 11 tools, 55,193 B |                                61,802 B |      30,497 B |              17,691 B |         10,645 B |       3,730 B |                            about 4.6 KB |
| `Explore`         |   5 | 2026-10-19 and 27, 2.1.303 and 2.1.311, `cli` | 27,377 (27,275–29,464)                | 4,100 B | 6 tools, 8,977 B   |              none (the type omits them) |      30,497 B |              17,040 B |         10,645 B |             — |                            about 4.1 KB |

Two transcripts of 2026-10-19 carry no request-shape row and are left out.

- **The runs are later and larger.** The 36 runs are of 2026-11-02 to 09 on Claude Code 2.1.309, 2.1.317 and 2.1.321,
  and their routed stage agents' first requests were 89k–99k tokens (section 6), against 66.6k here [R·m]. What grew
  between is not in the ledgers: the instruction files, the installed skills, the MCP servers and the harness all could
  have, and no November transcript survives to say which.
- **The command body and the brief are not in the first request.** A routed stage agent's prompt is one line; it reads
  the brief from `stage-agent.mjs brief` and the command file with the Read tool after its first request. Their sizes
  at 7.3.0 [S·m, `git cat-file -s v7.3.0:<path>`]: `pharn-spec.md` 26,731 B, `pharn-plan.md` 25,556 B, `pharn-test.md`
  22,542 B, `pharn-build.md` 24,431 B. On 7.10.3 `pharn-spec.md` is 31,112 B and `pharn-plan.md` 26,749 B; the two
  others are unchanged.
- **What a restricted agent type saves (CORE-107).** `Explore` keeps the skill, deferred-tool and MCP listings, so the
  listings survive a short tool list. The difference that a six-tool type keeping the instruction files would make is the
  tool schemas: 55,193 − 8,977 = **46,216 B per request**, about **11.6k tokens** [R·e, bytes / 4; `LIMITS.md §1c`]. A
  stage agent makes a median of 25 (spec) to 60 (build) requests (section 6), and its context grows from about 95k to
  190k–300k, so the saving is roughly 4–12% of each request's context [R·e]. No probe was run: the rows size the
  difference in bytes, which is what the brief asked a probe for only if they could not. A probe would turn the token
  figure into a measurement; CORE-107's second criterion asks for one.
- **The probe that was not run, and how it would differ.** It would have been a one-line agent of each type in a
  scratch copy of the project's instruction files, in a fresh session. Against a real run it would differ in the prompt
  (one line, not a stage brief), in the listings (the session's skills and MCP servers on the probe day) and in the
  Claude Code version.

## 6. Q3 — entry-gate time, and repeated bases

From each ledger's `entry` record (method `entry-observations/1`); every run has exactly one entry invocation. All
`[R·m]`.

| group                | runner lifetime, min: median (range) | orchestrator `--wait` union, min: median (range) | runner overlap with marked stages, min: median |
| -------------------- | ------------------------------------ | ------------------------------------------------ | ---------------------------------------------: |
| all 36               | 15.7 (4.0–34.9)                      | —                                                |                                              — |
| main session (12)    | 11.2                                 | 6.7 (0.0–19.7)                                   |                                            2.2 |
| inside an agent (24) | 16.6                                 | 0.0 (0.0–5.3)                                    |                                           13.5 |

- In a main-session run the stages ran inline and quickly, so the orchestrator waited for the gates; inside an agent
  the gates ran while the stage agents worked, and the wait was mostly already over.
- **Per-gate time: not in the ledgers.** No record holds a single gate's wall-clock. At GATE 1 the maintainer chose to
  record this as the gap `gate-durations` (CORE-75) closes, rather than time each gate once in a scratch copy.
- **Repeated bases: 12 of 36 runs** used a `base_sha` an earlier run had used (24 distinct bases). That is an **upper
  bound** on cross-run cache hits: a stopped run leaves its `pharn/features/<name>/` uncommitted, so an equal base is not
  an equal tree, and no ledger records the tree fingerprint. Of the 16 entry stops, 5 repeat an earlier run's base.

## 7. Q4 — every stop

Stage = the last stage-start marker before the stop. Cause = one line from the run's `LOOP.md`, quoted as DATA.
"Earlier now?" is the author's judgment, **advisory**: 7.3.2 changed only the S14/S14b stop text, so it stops nothing
earlier; 7.4.0 adds a spec-time check for criteria that **mention** a path no plan may scope; 7.5.0 peeks at the entry
gates after the spec and after the plan, stopping on a finished result or a red among the gates finished so far. For
7.5.0 the answer compares the entry runner's end with the spec and plan stages' ends in the ledger [R·m]; a red that a
gate reached before its runner ended is invisible, because no per-gate time is recorded.

| run                       | ver   | ctx   | decision      | blocked                   | stage   | cause (DATA)                                                               | earlier now? (advisory)                         |
| ------------------------- | ----- | ----- | ------------- | ------------------------- | ------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| `github-login`            | 7.1.4 | main  | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `test` killed: `exit 143`                                                  | no (runner ended 6 min after the plan)          |
| `pricing-plan-catalog`    | 7.1.4 | main  | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `test` killed: `exit 143`                                                  | no (ended after the plan)                       |
| `pricing-plan-catalog-2`  | 7.1.4 | main  | STOP_TERMINAL | —                         | verify  | `terminal_cause: unmeasured` — `timed out at 540 s`                        | no                                              |
| `remove-agent-credits`    | 7.1.4 | main  | STOP_TERMINAL | —                         | verify  | `terminal_cause: reconcile` — `add pharn/.run/ to .gitignore`              | no                                              |
| `workspace-billing`       | 7.1.4 | main  | STOP_TERMINAL | —                         | verify  | `terminal_cause: reconcile` — the same remedy                              | no                                              |
| `pricing-plan-buttons`    | 7.1.4 | main  | STOP_TERMINAL | —                         | verify  | `terminal_cause: reconcile` — the same remedy                              | no                                              |
| `github-app-foundation`   | 7.3.0 | main  | INCONCLUSIVE  | unlisted-ask              | plan    | `Re-run /pharn-loop with the same intent and AC-8 corrected`               | no (a wrong fact in a criterion, not a path)    |
| `github-app-foundation-2` | 7.3.0 | main  | INCONCLUSIVE  | gates-red-at-entry        | grill   | `red: test`                                                                | unknown (runner ended after the plan)           |
| `github-app-foundation-3` | 7.3.0 | main  | INCONCLUSIVE  | unlisted-ask              | build   | `npm run typecheck reported a type error`                                  | no                                              |
| `github-app-foundation-4` | 7.3.0 | main  | INCONCLUSIVE  | unlisted-ask              | build   | `the first fix is a write to .claude/**, which agents may not make`        | no (the fix was for tests outside the plan)     |
| `github-webhook`          | 7.3.0 | main  | INCONCLUSIVE  | stage-refused             | regress | `/pharn-regress refused with head-install-drift`                           | no                                              |
| `actions-oidc-policy`     | 7.3.0 | main  | STOP_GREEN    | —                         | verify  | —                                                                          | —                                               |
| `gh3-connect-github`      | 7.3.0 | agent | INCONCLUSIVE  | stage-refused             | test    | `Make AC-3 observe something the shell lacks`                              | no                                              |
| `in4-check-runs-findings` | 7.3.0 | agent | STOP_TERMINAL | —                         | verify  | `timed out at 540 s — not measured`                                        | no                                              |
| `in3-run-upload-url`      | 7.3.0 | agent | STOP_TERMINAL | —                         | verify  | `timed out under machine load (another task's suite was running)`          | no                                              |
| `gh4-repository-toggle`   | 7.3.0 | agent | INCONCLUSIVE  | stage-refused             | regress | `asked for it to be finished by hand`                                      | no                                              |
| `gh5-home-checklist`      | 7.3.0 | agent | STOP_TERMINAL | —                         | verify  | `timed out at the 540 s per-gate timeout`                                  | no                                              |
| `in5-post-runs`           | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `test gate unmeasured at entry` (no cause stated)                          | no (ended after the plan)                       |
| `in8-repositories-data`   | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `test (cause: timed-out)`                                                  | yes, at the plan peek                           |
| `in6-pr-comment`          | 7.3.0 | agent | INCONCLUSIVE  | stage-refused             | build   | `place the golden fixture under a name the harness does not refuse`        | no                                              |
| `in9-home-dashboard-data` | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `test (cause: timed-out)`                                                  | yes, at the plan peek                           |
| `in7-bundle-purge`        | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `test (cause timed-out)`                                                   | no (ended after the plan)                       |
| `ln1-dogfood`             | 7.3.0 | agent | INCONCLUSIVE  | unlisted-ask              | plan    | `.github/workflows/ci.yml, which set-writes-scope.cjs --from-plan refuses` | likely, at spec, if a criterion names the file  |
| `po1-policy-store`        | 7.3.0 | agent | INCONCLUSIVE  | plan-ambiguity            | build   | `to be named in .claude/rules/database.md, which this task may not edit`   | only if a criterion names the file; not checked |
| `fd1-findings-data`       | 7.3.0 | agent | STOP_TERMINAL | —                         | verify  | `Unmeasured at verify: test (cause: timed-out)`                            | no                                              |
| `fd2-agents-pulls-data`   | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `test (cause: timed-out)`                                                  | yes, at the plan peek                           |
| `po3a-policy-editor`      | 7.3.0 | agent | STOP_TERMINAL | —                         | verify  | `timed out under machine load` (2 iterations)                              | no                                              |
| `fd3-run-retention`       | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `test (cause timed-out)`                                                   | yes, at the plan peek                           |
| `bl2-plan-limits`         | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `killed at the 540 s per-gate timeout (exit 124, timed_out: true)`         | no (ended seconds after the plan)               |
| `po3b-policy-overrides`   | 7.3.0 | agent | INCONCLUSIVE  | gates-red-at-entry        | grill   | `typecheck` out of heap (`--max-old-space-size=8192` is the remedy named)  | yes, at the plan peek                           |
| `po4-p12-check-run`       | 7.3.0 | agent | INCONCLUSIVE  | gates-red-at-entry        | grill   | `running typecheck with a larger heap`                                     | yes, at the plan peek                           |
| `ln2-launch-alerts`       | 7.3.0 | agent | INCONCLUSIVE  | gates-red-at-entry        | grill   | `Red at entry (DATA): typecheck (exit 134)`                                | yes, at the plan peek                           |
| `fl1-test-results`        | 7.3.0 | agent | INCONCLUSIVE  | unlisted-ask              | plan    | `Fix the rule so a test is newly flagged when this run makes it flaky`     | no (7.4.0 checks paths, not consistency)        |
| `bl3-drop-user-billing`   | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `The test gate was not measured at entry (cause: timed-out)`               | yes, at the plan peek                           |
| `fl2-flaky-page`          | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `{ "id": "test", "cause": "timed-out" }`                                   | yes, at the **spec** peek                       |
| `lg3-remove-files`        | 7.3.0 | agent | INCONCLUSIVE  | gates-unmeasured-at-entry | grill   | `Unmeasured at entry (DATA): test (cause timed-out)`                       | yes, at the plan peek                           |

- **Gates unmeasured at entry (12): killed or could not start?** 11 records name `test` killed at the per-gate timeout
  (`timed-out`, `exit 143` or `exit 124` with `timed_out: true`); `in5-post-runs` says only that `test` was unmeasured.
  None says a gate could not start [R·m].
- **STOP_TERMINAL (9):** 6 `terminal_cause: unmeasured`, each naming `test` timed out at regress or verify; 3
  `terminal_cause: reconcile`, all on 7.1.4, each naming run state under `pharn/.run/` as the escape [R·m].
- **What 7.5.0 would buy here (advisory).** 10 of the 16 entry stops would stop earlier: 9 at the plan peek, which on
  7.3.0 saves only the floor-only grill (at most 0.6 min), and 1 (`fl2-flaky-page`) at the spec peek, which saves its
  plan stage (16.1 min) [R·m for the minutes]. The runs that stopped at entry spent 26.6% of the 36 runs' weighted cost
  [R·m].
- **What 7.4.0 would buy here (advisory).** At most `ln1-dogfood`, and only if a criterion names the CI workflow; the
  check reports a criterion that mentions such a path, never one that needs it.
- **Spend by stop.** The 9 STOP_TERMINAL runs are 45.4% of the weighted cost; the one green run is 35 of 4,113
  requests [R·m].

## 8. Q5 — the orchestrator's own requests per stage

Stages the orchestrator runs in its own context on 7.1.4 and 7.3.0: grill, regress and verify, inline by policy. In a
main-session run every inline stage is in that context too, so its rows are shown for completeness. Counted from rows
whose context is the orchestrator's and whose `stage` is the one named. All `[R·m]`.

| group           | stage          | runs with such rows | requests per run: median (range) | median context per request |
| --------------- | -------------- | ------------------: | -------------------------------- | -------------------------: |
| inside an agent | grill          |                  22 | 4 (2–5)                          |                       229k |
| inside an agent | regress        |                   6 | 18 (9–32)                        |                       271k |
| inside an agent | verify         |                   5 | 6 (4–10)                         |                       281k |
| inside an agent | between stages |                  24 | 13 (6–28)                        |                       247k |
| main session    | grill          |                   8 | 1.5 (1–4)                        |                       485k |
| main session    | regress        |                   5 | 1 (1–3)                          |                       548k |
| main session    | verify         |                   3 | 2 (1–3)                          |                       547k |
| main session    | between stages |                  12 | 8.5 (5–22)                       |                       545k |

- **Resume and wait round trips cannot be told apart.** `cost.json` rows carry token classes, a model, a stage and a
  context, never the tool that produced them, so a request that resumed a `stage-direct.mjs` call or re-ran `finish`
  looks like any other in that stage.
- **Their weight is small.** Regress and verify rows of every role are 2.4% and 0.9% of the 36 runs' weighted cost
  (121 and 40 requests) [R·m].

## 9. Q6 — artifact sizes, output tokens and minutes per stage

All `[R·m]` over the 36 runs; two runs have no `PLAN.md` (they stopped in the plan stage).

| figure                               | median | range        |   n |
| ------------------------------------ | ------ | ------------ | --: |
| `SPEC.md` bytes                      | 15,103 | 5,081–43,764 |  36 |
| `PLAN.md` bytes                      | 28,955 | 5,963–55,844 |  34 |
| criteria per SPEC                    | 14.5   | 3–39         |  36 |
| spec-stage output tokens (all roles) | 21,451 | 1,268–70,706 |  36 |
| plan-stage output tokens (all roles) | 42,440 | 1,634–96,900 |  34 |
| spec minutes                         | 5.6    | 0.3–22.2     |  36 |
| plan minutes                         | 10.2   | 0.3–27.7     |  35 |
| grill minutes (floor only)           | 0.4    | 0.0–0.6      |  33 |
| test minutes                         | 8.9    | 1.3–26.6     |  17 |
| build minutes                        | 21.4   | 3.8–45.6     |  15 |
| regress minutes                      | 16.1   | 0.0–25.5     |  11 |
| verify minutes                       | 8.2    | 5.3–22.1     |  10 |
| run window minutes                   | 30.6   | 4.7–143.2    |  36 |

- **Three or fewer criteria: 4 of 36 full runs** (`ln1-dogfood`, `ln2-launch-alerts`, `bl3-drop-user-billing`,
  `lg3-remove-files`, 3 criteria each). None reached test: one stopped S10 in the plan stage, three at the entry check.
- **Weighted cost by stage (all roles):** build 30.6%, plan 25.9%, spec 15.5%, test 13.5%, between stages 9.4%,
  regress 2.4%, grill 1.8%, verify 0.9%.
- **Plan size against plan time** (33 runs with both): the correlation of plan minutes with plan-stage requests is 0.76,
  with `PLAN.md` bytes 0.43 [R·e, Pearson's r over the ledger figures]. Plan time follows request count more than plan
  size.

## 10. Q7 — what `main` adds before the build since 7.3.0

**One measured run: `pricing-starter-plan-3` (7.7.1, n = 1).** Run context `main`, Claude Code 2.1.321, every routed
stage `inline:no-foreground-agent`, 10 criteria; `STOP_TERMINAL` after one iteration (`terminal_cause: unmeasured`,
`test` timed out at verify); 119 requests, 8,649,298 weighted units, 58.8 minutes of run window [R·m].

| stage        | orchestrator requests | weighted units | share of the run | minutes |
| ------------ | --------------------: | -------------: | ---------------: | ------: |
| grill (full) |                    17 |      1,069,852 |            12.4% |     2.8 |
| triage       |                     2 |        131,488 |             1.5% |     0.5 |

Both ran inline in a main-session context, so neither figure is a routed agent's. Beside them, the routed figures of
`.dev/features/loop-grill-triage/` [O·m]: a routed full grill took **229–284 s and $2.51–3.11** over five real plans
(`GRILL-CHECK-MEASUREMENT.md`), and a headless triage **34–49 s and $0.38–0.52** (`TRIAGE-CHECK-MEASUREMENT.md`). The
units differ (weighted tokens here, dollars there), so the two are not compared.

- **No ledger covers re-plan rounds (7.8.0), the supervisor (7.9.0) or amend-spec (7.10.0).** No run here is on those
  versions.
- **Why three 7.7.1 ledgers have no coverage.** Each records `coverage: unavailable` with the note that its session
  "resolves to 2 transcript directories — refusing to guess which run to report" [R·m]. The code is
  `pharn/floor/render-cost-ledger.mjs:785-791`: `findTranscriptDirs()` (`pharn/floor/transcript-core.mjs:134`) looks
  for `<session>.jsonl` in every project directory, and more than one hit is refused [S·m]. The three runs share one
  session. Which two directories held it cannot be read now (the transcript is gone); the project's rename from
  `pharn-starter` to `pharn-app` in 2026-11 is the likely reason two project keys held the same session [advisory].
- **The smallest follow-up that would measure such a run:** when more than one directory holds the session, keep the
  one whose transcript contains this run's marker lines (the binding evidence `bindingMarkers()` already builds for
  `run-window/2`) and refuse only when none or several do. A suggested name: `cost-ledger-multi-dir-binding`.

## 11. Three benchmark features

Chosen from the 36 runs by rules frozen before the analysis read any per-run figure. Discovery had already seen ledger
counts by version, the green run's request count and a rough criteria count. The rules are written out in this
increment's ship record; nothing hashes them, so the freeze is advisory.

| role                             | feature               | base sha                                   | SPEC                                                              | how it ended (7.3.0)                             |
| -------------------------------- | --------------------- | ------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------ |
| the STOP_GREEN run with requests | `actions-oidc-policy` | `82f5e3179334cd458e21b063695ac2e284f4b646` | `~/Projects/pharn-app/pharn/features/actions-oidc-policy/SPEC.md` | STOP_GREEN, 1 iteration, 35 requests, 64.7 min   |
| three or fewer criteria          | `lg3-remove-files`    | `7e48564d71c510b223a2d56459e938c3d45f66d9` | `~/Projects/pharn-app/pharn/features/lg3-remove-files/SPEC.md`    | S14b at entry, 143 requests, 26.1 min            |
| large                            | `in6-pr-comment`      | `51a634becbd847c1ae82e40704e0f1ded17f0112` | `~/Projects/pharn-app/pharn/features/in6-pr-comment/SPEC.md`      | S9 in build, 35 criteria, 174 requests, 52.5 min |

- **The rules.** Three or fewer criteria: the run that reached the furthest stage, ties broken by most requests, then
  the earliest window (`ln2`, `bl3` and `lg3` all reached the grill; `lg3` has the most requests). Large: of the 16 runs
  that reached build, the one with the most criteria (35).
- **A caution about the large one.** `in6-pr-comment` stopped because the harness refused a fixture's file name, which a
  re-run may not repeat. The largest run that reached verify is `po3a-policy-editor` (25 criteria, base
  `f56fe957a34bdd985f0ccc3bebaaa55b76b0693f`, STOP_TERMINAL after 2 iterations); it is named as the alternative, not
  substituted.
- **The comparison rule.** A later run of a benchmark feature starts from the same base sha with the same SPEC, in the
  same project. Before and after are comparable only when both reach **the same verdicts and the same gate maps**
  (`regression-report.json` and `verify-report.json` `.verdict`, and each gate's id and exit). Cost (weighted units by
  the formula in section 2, per token class) and minutes are then compared **per stage**, never as a run total, and a
  stage reached on one side only is reported, never compared.

## 12. The candidates

Each is rated as its Linear task is written. Ratings are advisory: a recommendation to the maintainer.

| task                                | rating             | the figure behind it                                                                                                                                                                                                                                       |
| ----------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CORE-103 entry-context-guard        | **go**             | Main-session runs entered at a median 484k (210k–905k) on their first orchestrator request, and every later request carried it (505k median). Orchestrators inside an agent started at 163k–280k, so a threshold has room between the two.                 |
| CORE-105 inline-fallback-stop       | **go**             | Inline main-session runs that reached build: 643k per orchestrator request against 267k for routed ones (section 4). The wait is measured in a background launch (7.1.2) but not in the 11 runs' setting: the task's fourth criterion is that observation. |
| CORE-75 gate-durations              | **go**             | 16 of 36 runs stopped at the entry check and 6 more were `STOP_TERMINAL` on an unmeasured `test`. No record holds one gate's time, and four other tasks wait on it.                                                                                        |
| CORE-86 gate-evidence-cache         | **needs-evidence** | An upper bound of 12 repeated bases, 5 of them among the 16 entry stops, with tree equality unverifiable. 7.5.0's peeks already stop 10 of the 16 earlier (section 7).                                                                                     |
| CORE-87 gate-timeout-above-bash-cap | **go**             | 11 of the 12 unmeasured entry stops name `test` killed at 540 s, none an unstartable gate, and 6 of 9 `STOP_TERMINAL` stops are the same gate timed out later. Entry first; regress and verify wait on CORE-76.                                            |
| CORE-76 stage-wait-once             | **go**             | As the enabler CORE-87 needs at regress and verify. Its direct saving is small: a median of 18 orchestrator requests per regress at 271k, but regress and verify are 3.3% of weighted cost.                                                                |
| CORE-107 lean-stage-agent           | **go**             | Tool schemas 55.2 KB for 11 tools against 9.0 KB for 6, about 11.6k tokens per stage-agent request [e], on agents that are 72% of the cost of runs started inside an agent. Its effect in a project waits on the installer copying `.claude/agents/`.      |
| CORE-109 loop-command-sections      | **no-go**          | On 7.10.3, Steps 4 and 5 of `pharn-loop.md` are 14,297 + 8,040 B [S·m], about 5.6k tokens [e]: 2.4% of a 231k orchestrator request, in a context that is 28% of the cost of runs started inside an agent.                                                  |
| CORE-88 gates-within-side-parallel  | **no-go**          | Its reopen trigger is not met: in the one green run the top stage was build (14.5 min), then regress (11.9), then verify (5.7). 17 of the 35 stops name `test` timed out, and two records blame machine load.                                              |
| CORE-77 regress-per-test-product    | **needs-evidence** | Regress has a median of 16.1 min (n = 11), but `test`'s share of it is not recorded. Its own start condition is CORE-75's figures.                                                                                                                         |
| CORE-89 head-test-single-run        | **needs-evidence** | Blocked by CORE-77 and CORE-75. 6 of 9 `STOP_TERMINAL` stops are `test` timeouts at regress or verify, but how much one fewer execution would change is unmeasured.                                                                                        |
| CORE-90 defect-probe-set            | **go**             | No ledger measures quality, and CORE-96, -98, -99, -111 and -112 each make "not lower on the probe set" a criterion. Apparatus only.                                                                                                                       |
| CORE-96 plan-decisions-budget       | **no-go**          | Its own close condition holds: plan minutes correlate 0.76 with plan requests and 0.43 with `PLAN.md` bytes (33 runs). Plans have a median of 29.0 KB.                                                                                                     |
| CORE-97 auto-size-quick             | **no-go**          | 4 of 36 full runs had three or fewer criteria, and all 4 stopped where quick mode runs the same step (the entry check, or S10 in the plan stage).                                                                                                          |
| CORE-98 stage-read-trim             | **no-go**          | `pharn/ARCHITECTURE.md` outside §6 is 19,392 B on 7.10.3 [S·m], about 4.8k tokens [e], against a stage agent that starts at 94–97k and ends at 190–300k.                                                                                                   |
| CORE-99 spec-self-review            | **no-go**          | Its P7 bar is more than one read case. Here one stop is a contradiction between criteria (`fl1-test-results`). Two more are criterion defects of other kinds (a wrong fact, an unobservable criterion) that a consistency pass does not target.            |
| CORE-111 stage-effort-routing       | **go**             | Spec and plan are 41.4% of weighted cost, and no ledger records a served effort: the setting is not applied, so nothing can tune it. The task starts with the harness probe.                                                                               |
| CORE-112 stage-model-tuning         | **needs-evidence** | Plan 25.9% and spec 15.5% of weighted cost make it worth measuring. But it needs CORE-90's probe set, and effort pairs need CORE-111.                                                                                                                      |
| CORE-113 loop-driver                | **needs-evidence** | The orchestrator is 27.7% (pooled) to 30.2% (per-run median) of weighted cost in runs started inside an agent. Its own condition is that share after CORE-105 and the gate tasks land.                                                                     |

## 13. Gaps

- **The client that ran each run:** not recorded, and no transcript survives (section 4).
- **Per-gate durations:** not recorded (CORE-75; section 6).
- **Served effort:** not observable in any ledger.
- **The brief's 696k:** not reproduced by any of three methods (section 3).
- **Resume and wait round trips:** indistinguishable in `cost.json` (section 8).
- **Re-plan rounds, the supervisor, amend-spec:** no ledger; and three of four 7.7.1 ledgers have no coverage (section 10).
- **The cost of one complete loop on 7.10.3:** not measured. It needs a `/pharn-loop` run, which this increment does not
  make.
- **Why a stage agent's first request grew from 66.6k (October) to about 95k (November):** unknown (section 5).

## Bounds of this record

- **36 runs, one project, one machine, 2026-11-02 to 09,** of which one ended green. Nothing here is the cost of a loop
  on 7.10.3, and nothing is claimed to reproduce.
- **Every ledger is `coverage: partial`:** each window leaves out the request that opened it and the run's own closing
  turns, so token figures are a floor on spend, not the total.
- **The ledger checker was not re-run** for this record; each ledger's figures are read as written, and a GREEN would
  certify their internal consistency only (L43).
- **Stage attribution is the ledger's.** A request's `stage` comes from the markers; requests between markers are
  "between stages".
- **Bytes-to-tokens is an estimate** (`LIMITS.md §1c`), used only where the record says `e`.
- **The Q2 transcripts are of unrelated tasks** on other days and versions than the runs.

## What this record may claim (P0)

- **Floor.** Nothing this record concludes is a floor guarantee. The floor facts near it belong to the dev chain that
  wrote it (the writes-scope hook over the two files it changed, `reconcile`, and `check:surface-bump`, which finds no
  product path in the change), never to the figures.
- **Measured** (`m`, read from the ledgers, the runs' files, the retained transcripts or this checkout): counts,
  decisions, blocked ids, route tokens, token classes and their weighted sums under the stated weights, minutes from the
  ledgers' `executions` and `entry` records, byte counts, and the criteria count by the SPEC template's reader.
- **Estimated** (`e`, each with its formula): every token figure derived from bytes (11.6k, 5.6k, 4.8k), and the
  correlation coefficients.
- **Advisory:**
  - every "earlier now?" answer in section 7;
  - every rating in section 12;
  - the benchmark choice beyond its frozen rule;
  - the reason given for the two transcript directories;
  - any statement of what a change would save.
- **Struck.**
  - "the loop costs N per run" (no complete run on a current version);
  - "the wait works in a main session" (not observed);
  - "a lean agent type saves N tokens" (bytes, not tokens, were measured);
  - "timeouts, not reds, cause most entry stops" beyond the 16 runs counted here.
