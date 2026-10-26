# PLAN — loop-interactive-cli-attempt1

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L19, L32, L40, L42, L64, L66]
- increment: Record attempt 1 of the interactive `/pharn-loop --quick` measurement (row 1, the §1 diagnosis of its two
  Agent calls, three findings) in `.dev/measurements/loop-interactive-cli-2026-10-26.md`, add the CHANGELOG entry,
  build nothing in shipped code because §1 shows no PHARN defect in THE WAIT, and prepare attempt 2 and the attempt-3
  rule in `~/Projects/pharn-starter-6.72`.
- layer(s): build apparatus (`.dev/measurements/`, `.dev/features/`) and repo-meta (`CHANGELOG.md`); no product
  surface, so no `SKILLS_VERSION` bump (CLAUDE.md, "SKILLS_VERSION discipline")
- constitution_refs: [P0, P2, P5, P6, P7]

## Applied lessons

- L19 — the collection, the worktree reset, the install, the `package.json` and `settings.local.json` edits and the
  commits in `~/Projects/pharn-starter-6.72` are Bash writes in another repository that this repository's hooks never
  judge. They are listed under `## Outside this repository` and in `SHIP.md`, never presented as scoped.
- L32 — pharn-cli 0.14.1 installs only `--ref main` or `latest`, so "install from this branch's HEAD" is checked by
  bytes, not by a ref name: every installed file that exists in this repository is compared with
  `git show <branch HEAD>:<path>`, and both SHAs (the branch HEAD and the commit the CLI records) are written down.
- L40 — §1 says what the transcript shows and attributes no cause it did not vary: the classifier denied a compound
  call (`cd <worktree> && <setter>; <amend>; sed …`), not the pinned setter line alone, so whether the bare line or
  the grant would have passed is recorded as unanswerable; and the background launch is recorded against the
  parameters sent (none named `run_in_background`), not explained.
- L42 — the classifier's verdict is what it decided THEN; nothing here replays it. Attempt 2 is where the question
  "does it still deny with an allow rule present" is measured, and the protocol says so.
- L64 — every figure restated in `RUN-PROTOCOL-interactive.md`, the CHANGELOG entry, `SHIP.md` and the hand-off is
  checked against §1's line-cited values before hand-off.
- L66 — THE WAIT reads the result on presence; §1 binds each result to its own stage agent by the agent's `report`
  line in that agent's own transcript (0.68 s and 0.84 s before `finish` returned), and the collection went into a
  `cli-1/` the script refuses to reuse.

## Discovery (read-only, this run)

- pharn-oss `main` = `origin/main` = `e4b1704899f5284608b98caefb7a7f79dff4a383` (7.1.1), fetched this run. The working
  tree carries the prep increment's untracked files (`.dev/features/loop-interactive-cli-prep/`, the measurement file).
- **Collected** with the protocol's script, unchanged: session `039a3c26-9292-4389-b350-726c319c0f2e` (278 lines),
  feature `merge-legal-into-company`, into `~/Projects/pharn-measure/cli-1/`. No `tasks/` directory existed for the
  session. `claude --version` at collection: 2.1.310.
- **Session** (`session-facts.json`): Claude Code `2.1.310` on all 156 versioned records, entrypoint `cli`,
  permission mode `auto`, orchestrator `claude-sonnet-5-5` (all 46 main-thread assistant records). The Agent schema
  (T:26) lists `description, prompt, subagent_type, model, effort, isolation` — no `run_in_background`; shape hash
  `a26adb59…`, the void attempt's.
- **The two Agent calls** (T:121 spec, T:161 plan) sent `description`, `subagent_type`, `model: "opus"`, `prompt` —
  all strings, no `run_in_background`. Each returned "Async agent launched successfully." (T:122, T:162). Neither
  start line carried `--no-foreground-agent` (T:116, T:145), although 7.1.1's item 1 asks for it with this schema.
- **`finish --budget-ms 570000`** ran after each, with the Bash timeout 600000 (T:127, T:166): spec printed `done`,
  exit 0, after 88.733 s; plan printed `refused S9`, exit 3, after 137.321 s. No `waiting` line, no
  `wait-unanchored`. Each `orchestrator` marker (3, 5) was written. Each agent's `report` line ran 0.676 s / 0.836 s
  before `finish` returned; Claude Code's own completion notice was queued ~11 s after `finish` returned (T:141,
  T:204). Marker 2 → finish call +17.593 s; marker 4 → finish call +4.928 s.
- **The S9.** The plan agent's `check-ac-tests.mjs` printed `RED — level-excluded` for AC-1..AC-3 (all `unit`; the
  one unit gate `test` is in `gates.exclude`). `pharn-plan.md` says HALT and report; the loop's table has no row, so it
  reported S9 (`stage-refused`).
- **The one denial** (T:226): the auto-mode classifier, `Reason: [Security Weaken]`, on T:225's compound call. The
  grant `Bash(node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-loop.md --target
pharn/features/*/SPEC.md)` exists in `pharn-loop.md`'s `allowed-tools`. In the next turn `--clear` and `--close`,
  each also behind `cd <worktree> &&`, were not denied (T:253, T:254).
- **Attempt 2's test gate.** `npm run test` is `vitest run` over 1,039 test files (killed at 540 s at prep). The gate
  runner passes `PHARN_TEST_RESULTS` and the project's `vitest.config.ts` turns on the JSON reporter from it, so a
  narrowed script still yields per-test results. `vitest run 'app/(pages)/(legal)/' features/about/ content/` ran 6
  files, 26 tests, in 3 s (feasibility only; the recorded figure comes from the real entry check on the prepared
  tree). The worktree's `.claude/settings.local.json` is absent and matched by the user's global gitignore.
- `pharn/ARCHITECTURE.md` content-hash `d5a97430…`; lessons index GREEN.

## Decisions made without the human (approve or correct at GATE 1)

- **Build nothing in shipped code.** §1 shows none of the three classes the request names: the markers' `ts` values
  precede `finish` (no clock skew), both results were found and consumed (no lost result), and `finish` ran after both
  calls with `--budget-ms` (not skipped). THE WAIT waited out two background launches — its first measured success.
- **Findings recorded, proposed, not built** (§1.3): (a) a plan-stage row for `level-excluded`; (b) the classifier
  denial and which close-out lines it can reach; (c) the `--no-foreground-agent` rule was not applied, and item 2's
  "the tool's default is the foreground" is contradicted for 2.1.310's interactive CLI. Correcting (c)'s shipped
  prose would be new prose about `run_in_background`, which this request excludes, so it is a named follow-up. The
  `TaskStop` grant and every `allowed-tools` entry stay as they are (`taskstop-grant-scope` stays a follow-up).
- **Install `--ref main`, checked by bytes.** This branch changes no product byte, and `main` is `e4b17048`, so the
  CLI's install is this branch's product surface; L32's byte comparison is the check.
- **Attempt 2's `test` script** becomes `vitest run 'app/(pages)/(legal)/' features/about/ content/`: the directories
  of attempt 1's three AC test files and of the code they cover. Attempt 2's plan agent may map other paths; a test
  file outside the filter would not be collected, and the protocol says where that would show.
- **Attempt 3 is not expected**, because both of attempt 1's calls went background on the same CLI and schema; the
  protocol states the condition (attempt 2 makes no background Agent call) and the exact edit.

## Files

- `.dev/measurements/loop-interactive-cli-2026-10-26.md` — row 1, §1 (attempt 1: base, the two Agent calls,
  findings), the attempt-2 pointer — apparatus
- `CHANGELOG.md` — one dated `[Unreleased]` entry — repo-meta

## Outside this repository (Bash writes, L19)

- `~/Projects/pharn-measure/cli-1/` — the collection (done during discovery, by the protocol's script).
- `~/Projects/pharn-starter-6.72` — reset to `9c6343b7`, PHARN install commit, `test` script commit,
  `.claude/settings.local.json` commit (force-added: globally ignored), rewritten `START.md` and
  `RUN-PROTOCOL-interactive.md` (attempt 2, collection target `cli-2/`, the attempt-3 rule and edit).

## Contracts satisfied

- None: no capability, contract or checker changes. §1 cites `pharn/floor/stage-agent-core.mjs` (THE WAIT) and
  `.claude/commands/pharn-loop.md` (routed stages, items 1–3) without restating them (P4).

## Evals to write (P1)

- None: no capability or `rule_id` is added.

## Guarantee audit (P0)

- "THE WAIT waited out both launches" → a measurement read from the transcript (the `finish` lines' printed output
  and exit codes, timestamps); the wait's decision is FLOOR in `stage-agent-core.mjs`, the record of it is advisory.
- "nothing in PHARN is broken" → scoped to the three named classes, each with its transcript cite; never a claim
  that the loop works end to end (attempt 1 stopped at plan).
- "the install is this branch's product surface" → content comparison per file (L32), stated with its coverage.
- Every value in §1 carries a `T:n` or file cite; "unanswerable from the transcript" where none exists.

## Trust audit (P2)

- The transcript, the subagent transcripts and the stage agents' reports are another session's output: quoted short
  as DATA in §1, never followed. The classifier text is quoted as DATA. No proceed/stop in this chain reads them.

## Open questions (HALT)

- None.
