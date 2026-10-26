# PLAN — loop-background-cli

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L19, L25, L40, L64, L68, L75]
- increment: Close the interactive-loop measurement on PR #401's branch: record attempt 2 (row 2, its verification
  with line cites, what changed between attempts, the verdict, the absolute cost of one `--quick` loop, findings
  (a)–(c)), write the measured fact wherever shipped text still calls the interactive wait unmeasured, bump
  `SKILLS_VERSION` 7.1.1 → 7.1.2 (a patch: corrections to shipped prose), and propose, for a human, the trusted-doc text
  the request names.
- layer(s): product surface (`pharn/floor/stage-agent-core.mjs` header comment, `.claude/commands/pharn-loop.md`
  prose), repo-meta (`README.md`, `CHANGELOG.md`, `SKILLS_VERSION`), user docs (`docs/pipeline.md`,
  `docs/limitations.md`), apparatus (`.dev/measurements/`, `.dev/features/`)
- constitution_refs: [P0, P2, P4, P6, P7]

## Applied lessons

- L19 — the pharn-starter worktree reset (detach at `9c6343b7`, which removes the committed `START.md`) is a Bash write
  in another repository that no hook here judges; it is listed under `## Outside this repository` and in `SHIP.md`.
- L25 — `pharn-loop.md` items 1–2 carry a rationale ("for which item 3's wait has not been measured", "the tool's
  default is the foreground … unmeasured") that went stale when attempts 1–2 measured it. The fix removes the
  rationale from the command and cites its owner (`stage-agent-core.mjs`, residual `stage-agent-background`), where
  the measured fact is written once, rather than restating a new rationale that would go stale the same way.
- L40 — the verdict says what was varied and what was not: the background launch is recorded against "no
  `run_in_background` sent" on one Claude Code version, never explained; finding (b)'s "no denial with the allow rules
  present" is recorded as consistent with the rules deciding first, not as proof, because no call ran without them in
  attempt 2 and attempt 1's denied call had another shape.
- L64 — every figure and the verdict sentence are restated in the CHANGELOG, `README.md`, `docs/pipeline.md`, the
  module header, the trusted-doc proposals and the PR body. Before hand-off, each restatement is grepped and checked
  against the measurement file's line-cited values (one run, 2.1.310, 7.1.1, the four Agent calls, 1,098 s, 104
  requests, 11.19 M processed context tokens).
- L68 — `pharn/LIMITS.md` and `pharn/THREAT-MODEL.md` are human-only. This plan proposes their text in a file and says
  WHEN the human applies it: after `/pharn-dev-verify`, committed, so reconcile never reads the human's edit as an
  escape (GATE 1 question 3).
- L75 — the sweep below lists each phrase, every hit on the shipped surface and the docs, and one disposition per hit;
  grill re-runs the greps.

## Discovery (read-only, this run)

- Branch `measure/loop-interactive-cli-attempt1`, HEAD `e9ba9806`, draft PR #401, CI green. `origin/main` =
  `e4b17048` (7.1.1), fetched this run. `pharn/ARCHITECTURE.md` content-hash `d5a97430…`; lessons index GREEN.
- **Attempt 2's collection** `~/Projects/pharn-measure/cli-2/`: orchestrator transcript `50eead02-…jsonl` (412 lines,
  called `B` below), four subagent transcripts and `.meta.json` files, `session-facts.json` (`F`), `feature/cost.json`,
  `feature/LOOP.md`, `pharn-run/`. `branches-after.txt` = `pharn-loop/merge-legal-into-company`, `head-after.txt` =
  `f87dd005a08b099df0dc02b606911072b02ebcfb`, `claude-version-at-collection.txt` = 2.1.310.
- **Session:** Claude Code `2.1.310` on all 226 versioned records (F:4–6), entrypoint `cli` (F:7–9), mode `auto`
  (F:10–99), orchestrator `claude-sonnet-5-5` 72/72 (F:100–102). Agent schema (B:26, F:103–120): `description, prompt,
subagent_type, model, effort, isolation`, no `run_in_background`, shape hash `a26adb59…` — attempt 1's and the void
  attempt's.
- **The four Agent calls** (F:121–242; re-read from `B` itself): spec B:125, plan B:152, test B:249, build B:277. Each
  input holds exactly `description, subagent_type, model, prompt` (opus, opus, opus, sonnet) — no
  `run_in_background` key, checked on the raw `tool_use` input. Each returned "Async agent launched successfully."
  (B:126, B:153, B:250, B:278), 0.666–0.731 s after the call. Each agent's `.meta.json`: `requestShape:
"background"`, `finished: true`.
- **The four `finish` calls**, each `--budget-ms 570000`, Bash timeout 600000 (F:286–425): B:131 → `done` exit 0
  (B:137), B:159 → `done` 0 (B:165), B:254 → `done` 0 (B:255), B:293 → `done gate:pass` 0 (B:294). Waited 92.281 s,
  126.141 s, 249.944 s, 114.737 s; each returned 0.802–1.463 s after its agent's `report` call (spec agent line 131,
  plan 141, test 237, build 150 of their own transcripts) and 7.374–14.419 s before Claude Code queued its completion
  notice (B:157, B:180, B:275, B:305). Marker → `finish` call: +8.697, +6.528, +7.221, +6.718 s. No `waiting`, no
  `wait-unanchored`. No `TaskStop` call (the tool is only in the offered list, B:28/B:37).
- **None of the four start lines carried `--no-foreground-agent`** (B:119, B:147, B:244, B:270), as in attempt 1.
- **The stop:** `check-loop.mjs` → `STOP_GREEN_QUICK`, iter 1, cap 3, verify `PASS` (B:339–340); closeout GREEN on
  record and decision checks, marker 14 `run-stop` (B:395–396); final report names the branch and `f87dd005` (B:406).
  `LOOP.md` `decision: STOP_GREEN_QUICK`. Verify ran six gates, all 0 (`format:check`, `instruction-growth`, `lint`,
  `reconcile`, `test`, `typecheck`); `build`, `e2e` excluded.
- **Entry gates** (B:237–238): `status: green`, `unmeasured: []`, exit 0, but `base:test` `exit 143, timed_out: true`.
  The runner ran the gates in sequence (lint, format:check, base:test, test, typecheck); `test` started 11:30:28.302Z
  and took 1.85 s (`pharn-run/pharn-entry/gates/3-test.*`), so `base:test` ran ≈540 s of the runner's 582.7 s. The
  `--wait` call lasted 298.463 s (cost.json `entry_events`).
- **6.75.0's rule** (CHANGELOG [6.75.0]; `entry-gates-core.mjs` header and `entryVerdict`): "The `base:test` slot is
  never listed" — `unmeasuredRuns(stamp).filter((u) => u.id !== ENTRY_BASE_TEST_ID)`. So a timed-out base slot is by
  design neither red nor unmeasured. A `--quick` run skips regress's base comparison, the slot's only reader, yet
  `entry-gates.mjs --start` (no mode argument) schedules it in every run.
- **Denials:** `F:482` `"denials": []`; a grep of all five transcripts for the classifier's denial text finds none. 14
  Bash calls ran the setter or `reconcile-baseline.mjs` (orchestrator 3, stage agents 11, including the build's
  `--from-plan` + `--anchor` and the orchestrator's record setter + `--amend-scope` in one compound call, B:366). The
  worktree held the two wildcard allow rules (`7b26eded`).
- **Cost** (`feature/cost.json`, 104 requests, dedup on `requestId`, coverage `partial`): processed context
  11,190,436 tokens (input 208, cache-write 5m 411,635, cache-write 1h 60,478, cache-read 10,718,115), output 49,873
  (thinking 9,081 within it); run window 1,098.056 s (membership start marker 1 → run-stop marker 14). Per stage
  (stage-start → return marker): spec 100.5 s, plan 132.5 s, grill 27.3 s, test 257.1 s, build 121.4 s, verify 48.7 s.
  Served: spec, plan and test agents opus (17, 17, 27 requests), build agent sonnet (15), orchestrator sonnet (28).
- **Headless runs (2026-10-25 record §9):** both 6.73.2 headless runs stopped `INCONCLUSIVE · gates-red-at-entry`; their
  stage agents ran in the foreground (the JSON boolean `false` was sent). No headless loop has completed.
- **Trusted docs:** `pharn/LIMITS.md` does not name the residual at all; `pharn/THREAT-MODEL.md` §4 has nothing on
  routed stages (§5 item (4) says the Agent tool "returns that agent's final text into the orchestrator's context");
  `pharn/ARCHITECTURE.md` does not describe routed stages. All three are hook-denied to the agent.
- **pharn-starter** `~/Projects/pharn-starter-6.72`: on branch `pharn-loop/merge-legal-into-company` at `f87dd005`,
  clean; the prep commits `ee1458c3`…`18c6e5ec` sit under it, so detaching at `9c6343b7` loses nothing.

## The sweep (L75) — phrase → hit → disposition

Over `README.md`, `CONTRIBUTING.md`, `docs/{pipeline,limitations,guarantees}.md`, `pharn/*.md`, `pharn/floor/*.mjs`,
`pharn/pharn-contracts/`, `.claude/commands/pharn-*.md` (not `pharn-dev-*`), `.claude/hooks/*.cjs`, tests excluded.

- `unmeasured in a real loop` — `pharn/floor/stage-agent-core.mjs:166` → edited (measured fact);
  `.claude/commands/pharn-loop.md:522` → edited (rationale removed, owner cited).
- `default is the foreground` — `pharn-loop.md:522` → edited (same line).
- `desktop app` — `stage-agent-core.mjs:148`, `:153` → still true (dated history of the 2026-10-25 observation);
  `pharn-loop.md:517` → edited (item 1's rationale, owner cited); `pharn/LIMITS.md:513` → still true (unrelated: temp
  paths).
- `stage-agent-background` — `stage-agent.mjs:52`, `:74`, `stage-agent-core.mjs:66`, `:118`, `:148`, `:164` → still
  true (they cite the residual by name; its text changes in one place).
- `run_in_background` — `stage-agent-core.mjs:64`, `:66` (the `no-foreground-agent` reason row), `:332` (its printed
  remedy, pinned by `stage-agent-core.test.mjs:191`), `stage-agent.mjs:51`, `:256` → follow-up
  `loop-foreground-default-prose` (whether the flag and its remedy stay; behaviour, not prose); `:149`, `:165`,
  `stage-agent.mjs:72` → still true (dated history); `pharn-loop.md:515` → still true (the rule, pinned by
  `command-hygiene.test.mjs:4545`); `pharn-loop.md:521` → edited (same item); `pharn-ship-stages.md:53` → still true
  (`/pharn-ship` sends the boolean; not measured here).
- `foreground` (beyond the hits above) — `entry-gates.mjs:32`, `:761`, `entry-observations.mjs:11`,
  `render-cost-ledger.mjs:1163`, `render-run-report.mjs:708`, `cost-ledger.md:1029` → still true (an entry `--wait`
  call, not a stage agent); `route-token-core.mjs:47`, `:61`, `stage-agent.mjs:17`, `:50`, `:258`, `:604`,
  `stage-agent-core.mjs:155`, `:331` → still true (the flag's name); `stage-agent-core.mjs:147` (`stage-agent-hang`)
  → still true; `cost-ledger.md:526` ("as long as the stages run in the foreground one at a time") → still true as a
  condition, and attempt 2 ran its background agents one at a time (each `finish` returned before the next start);
  `scan-code-*.mjs:30/32` → unrelated.
- `TaskStop reaches` — `pharn-loop.md:536` → still true (no `TaskStop` call in either attempt).
- `complete loop` — `README.md:174` → edited (replaced by the measured `--quick` sentence).
- `headless` — no hit on the shipped surface or the docs.
- `header's named residuals` — `pharn-loop.md:572` → edited (adds "a background launch" to the list it names).

## Files

- `.dev/measurements/loop-interactive-cli-2026-10-26.md` — row 2; §4 attempt 2 with line cites; what changed between
  attempts; §5 the verdict with the PHARN and Claude Code versions; §6 "Absolute cost of one --quick loop" in the
  2026-10-05/25 labels; §7 findings (a)–(c) for attempt 2 — apparatus
- `pharn/floor/stage-agent-core.mjs` — RESIDUALS `stage-agent-background`: a dated MEASURED 2026-10-26 paragraph
  carrying the verdict, and the 6.74.0 paragraph's "that the tool's default is the foreground is unmeasured in a real
  loop" replaced by the measured fact; header comment only, no code — product (`pharn/floor/*.mjs`)
- `.claude/commands/pharn-loop.md` — item 1's last sentence and item 2's parenthesis lose their stale rationale and
  cite the residual; the Bounds paragraph's list of named residuals gains "a background launch"; the pinned rule
  sentence (`command-hygiene.test.mjs:4545`) unchanged — product command
- `README.md` — the loop-cost paragraph (~171–175): the complete-loop sentence replaced by the measured `--quick`
  loop; one sentence in the `/pharn-loop` intro on the two measured session forms; the badge 7.1.1 → 7.1.2 — repo-meta
- `docs/pipeline.md` — one sentence in the `/pharn-loop` paragraph and one in "Running /pharn-loop in a container"
  (interactive auto or headless `claude -p --permission-mode auto`, with what each measured run showed) — user docs
- `docs/limitations.md` — one bullet: a routed stage may run in the background; `finish --budget-ms` waits it out,
  measured once; the cap and `TaskStop` unmeasured; owner `stage-agent-core.mjs` (only if GATE 1 question 2 keeps
  it) — user docs
- `.dev/features/loop-background-cli/TRUSTED-DOC-PROPOSALS.md` — the exact text proposed for `pharn/LIMITS.md` (§8, a
  bullet) and `pharn/THREAT-MODEL.md` (§5 item (4), one clause), with where each goes; no proposal for §4 or
  `pharn/ARCHITECTURE.md` (nothing there describes routed stages) — apparatus
- `SKILLS_VERSION` — 7.1.1 → 7.1.2 — repo-meta (the bump the product changes require)
- `CHANGELOG.md` — `## [7.1.2] - 2026-10-26` above `[7.1.1]`, holding the moved `[Unreleased]` entry (this branch's,
  unmerged) and this increment's entry — repo-meta

The pipeline artifacts (`GRILL.md`, `REGRESSION.md`, the two reports, `VERIFY.md`, `REVIEW.md`, `SHIP.md`) are written
by their own stages under their own scopes. `npm run docs:generate` runs at build; no generated region is expected to
change (none renders `stage-agent-core.mjs` or `pharn-loop.md`'s body), and `docs:check` confirms it.

## Outside this repository (Bash writes, L19)

- `~/Projects/pharn-starter-6.72`: `git checkout --detach 9c6343b7` (removes `START.md`, `RUN-PROTOCOL-interactive.md`
  and the force-added `.claude/settings.local.json`, all committed after `9c6343b7`); branch
  `pharn-loop/merge-legal-into-company` kept at `f87dd005`, never merged. Its ignored `pharn/.run/` is left as is.
  Done after GATE 2.

## Decisions made without the human (approve or correct at GATE 1)

- **Verdict wording.** As requested, scoped to what was measured: "On Claude Code 2.1.310 the interactive CLI launched
  every stage agent in the background with no `run_in_background` sent (six Agent calls in two attempts), and
  `finish --budget-ms` waited each one out; one run completed (attempt 2, PHARN 7.1.1, `--quick`, four stage agents).
  The residual is HANDLED by THE WAIT, not gone. A harness that changes the default again changes nothing in PHARN:
  `finish` runs after every Agent call either way. Headless `claude -p --permission-mode auto` is the other measured
  path: its stage agents ran in the foreground (6.73.2), and neither of its two runs completed a loop."
- **Follow-ups of `stage-agent-background-wait` (its SHIP.md stays as written):** `loop-background-wait-measure` —
  closed by measurement, except its "does TaskStop reach it", which neither attempt exercised and which joins
  `taskstop-grant-scope`; `taskstop-grant-scope` — remains; `anchor-clock-skew` — remains, unobserved: all six
  markers preceded their `finish` call by 4.9–17.6 s on one host, which shows the skew did not occur, not that it
  cannot (P7: no trigger, nothing built).
- **Attempt 1's follow-up `loop-foreground-default-prose`:** the prose half is done here (items 1–2 and the residual
  entry). Whether `--no-foreground-agent` and its printed remedy stay is behaviour, so it stays a named follow-up,
  now with its evidence: 0 of 6 routed start lines carried the flag, and the wait handled every launch.
- **Finding (a): not a gap in the verdict.** 6.75.0 lists only attributable gates as unmeasured and never the
  evidence slot, so the loop going on was correct. What attempt 2 does show: a `--quick` run schedules a `base:test`
  slot nobody reads, sequenced before `test` and `typecheck`, and its 540 s timeout set the `--wait` call's
  298.5 s — 27% of the run window. Proposed, not built: `/pharn-loop --quick` (and `/pharn-ship --quick`) start the
  entry runner without the slot, and the slot runs after the attributable gates in a full run.
- **Finding (b):** no pinned line was denied with the allow rules present (0 of 14 setter/reconcile calls, one of them
  the setter + `--amend-scope` compound). For the grant-list finding from attempt 1, that settles only its "still
  denied → remedy outside PHARN" branch: it did not happen. It does not show that the commands' own exact
  `allowed-tools` grants suffice, because the rules present were operator-side wildcards. Proposed, not built: name
  the two operator allow rules, with their breadth, as an option in the `/pharn-loop` docs; and measure the exact
  grants alone before rewording anything.
- **Finding (c):** already recorded as attempt 1's §1.4(a) (proposed S12b `blocked: ac-level-excluded`); attempt 2
  did not reach it (`test` in the entry set). The record points to it, no new text.
- **Bump size: patch (7.1.2).** Every product byte changed is a correction to shipped prose; no behaviour changes.
- **GATE 2 un-draft.** The request asks to un-draft PR #401 once check and test are green; this run does that at GATE
  2 only if verify is `PASS` and the review has no floor finding, and records it as the brief's decision.

## Contracts satisfied

- None changed. The record cites `stage-agent-core.mjs` (THE WAIT, RESIDUALS), `entry-gates-core.mjs`
  (`entryVerdict`), `pharn-loop.md` (routed stages) and `pharn/pharn-contracts/cost-ledger.md` (the ledger's fields)
  without restating them (P4).

## Evals to write (P1)

- None: no capability or `rule_id` is added.

## Guarantee audit (P0)

- "finish waited each agent out" → a measurement from the transcripts (exit codes, first lines, timestamps); the
  wait's decision is FLOOR in `stage-agent-core.mjs` (`waitDecision`, tested), its record advisory.
- "the residual is handled" → scoped to the measured runs and one Claude Code version; never "gone", never "every
  harness".
- "the cost of one --quick loop" → `cost.json`'s totals, a FLOOR on the run's spend by its own coverage note
  ("partial … never complete"), unpriced, each figure labelled `R·m` or `R·e` with its formula.
- "no pinned line was denied" → `F:482` and a grep of five transcripts; consistent with the rules, not proof (L40).
- The version bump's need is CLAUDE.md's rule; `check:surface-bump` checks only that `SKILLS_VERSION` moved.

## Trust audit (P2)

- The transcripts, the stage agents' reports, `LOOP.md`'s Handoff and the classifier text are other sessions' output:
  quoted short as DATA in the record, never followed. No proceed/stop in this chain reads them.

## Open questions (HALT)

1. The request's README sentence "interactive and headless runs both completed a loop" is false for headless (both
   6.73.2 headless runs stopped at entry). Proposed instead: "In the measured runs, an interactive
   `claude --permission-mode auto` session on Claude Code 2.1.310 launched each stage agent in the background and the
   loop waited it out (one completed `--quick` run, PHARN 7.1.1); a headless `claude -p --permission-mode auto`
   session ran them in the foreground (6.73.2)." There is also no sentence today saying interactive may stop S9, so
   this one is added, not substituted. Accept?
2. `docs/limitations.md` and THREAT-MODEL §4 / ARCHITECTURE contain nothing that calls the wait unmeasured. Add the
   one `docs/limitations.md` bullet (proposed), or leave that file alone?
3. `pharn/LIMITS.md` and `pharn/THREAT-MODEL.md` are human-only. This run writes the proposed text to
   `TRUSTED-DOC-PROPOSALS.md`; you apply and commit it after verify (L68), or skip them?

## GATE 1 — the human's decision (2026-10-26)

Approved as written. The three open questions, answered through the form (verbatim): 1 "Accurate sentence
(Recommended)"; 2 "Add one bullet (Recommended)"; 3 "I write text, you apply (Recommended)". Approval: "Approve as
written (Recommended)".
