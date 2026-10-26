# PLAN — loop-interactive-cli-prep

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L19, L40, L42, L64, L66]
- increment: Prepare attempt 1 of an interactive `/pharn-loop --quick` measurement on PHARN 7.1.1 in
  `~/Projects/pharn-starter-6.72` (residual `stage-agent-background`), and record in pharn-oss a §0 read from the void
  6.73.2 interactive transcript plus an empty results table, in `.dev/measurements/loop-interactive-cli-2026-10-26.md`.
- layer(s): build apparatus only (`.dev/measurements/`, `.dev/features/`); no product surface, so no `SKILLS_VERSION`
  bump (CLAUDE.md, "SKILLS_VERSION discipline")
- constitution_refs: [P0, P2, P6, P7]

## Applied lessons

- L19 — the worktree reset, the `pharn update`, the gate probe, the commits and `START.md` / `RUN-PROTOCOL-interactive.md`
  are Bash writes in another repository that this repository's fix #7 hooks never judge. They are listed under
  `## Outside this repository`, never presented as scoped. Inside pharn-oss the one file is written with Write/Edit
  under the plan scope.
- L40 — §0 states what the transcript shows (the schema offered, the parameters sent, the return, the timestamps) and
  attributes no cause. It does not say the string `"false"` made the launch background: the session never varied that
  parameter, and the tool's own description said subagents run in the background.
- L42 — §0 reads the Agent schema recorded in the 2026-10-25 transcript (its `api-request-shape` and `prompt_snapshot`
  records), never today's CLI: an answer about the tool as offered NOW says nothing about what it was THEN. The run
  protocol tells the collecting session to read attempt 1's schema from attempt 1's own transcript the same way.
- L64 — §0 corrects a restatement: the void run's `NOTE.txt` says "the tool schema has the parameter", and the recorded
  schema has none. Every figure restated in `RUN-PROTOCOL-interactive.md`, `SHIP.md` and the hand-off is checked against
  §0's line-cited values before hand-off.
- L66 — the collection commands copy into `~/Projects/pharn-measure/cli-1/`, created empty and refused if it already
  holds anything, and run only after the interactive session has exited; the transcript is chosen by session id (found
  by the command line it holds), never as "the newest file".

## Discovery (read-only, this run)

- pharn-oss `main` = `origin/main` = `e4b1704899f5284608b98caefb7a7f79dff4a383` (7.1.1), fetched this run.
- **pharn-cli has no SHA option.** 0.14.1's `--ref` takes `main` or `latest` only (`REF_CHOICES`), and it reads no
  local source. Because `origin/main` is exactly `e4b17048`, the install ran `pharn update --ref main --yes --force` and
  the CLI recorded `commit: e4b1704899f5284608b98caefb7a7f79dff4a383`, `skillsVersion: 7.1.1` in `pharn.config.json`.
  An install keeps no `pharn/SKILLS_VERSION` file; the version is the config's `skillsVersion`.
- **Install commit `505e70ab`** on `9c6343b7` (detached): updated 200, restored 7, forced 2 (the project's edited
  `regression-report.md` / `verify-report.md`, as in the 6.73.2 base `20c85c05`), root `THREAT-MODEL.md` / `LIMITS.md`
  moved under `pharn/`; the 16 files upstream no longer ships removed (they import only each other) and
  `pharn/.run/` + `pharn/.backup/` added to `.gitignore`, both as the CLI advised. `.claude/settings.json` left as
  committed: the CLI lists three upstream hooks it does not wire (two absolute-path PreToolUse guards, the `Stop`
  record guard).
- **Claude Code here is 2.1.310**, the same build as the void attempt.
- **The entry gate set** (7.1.1 `run-gates.mjs init --stage entry --discover package.json`, `gates.exclude`
  `["build","e2e"]`): `lint`, `format:check`, `base:test` (evidence only, never an S14/S14b stop), `test`,
  `typecheck`, sequential, 540 s each. Timed by running the real `entry-gates.mjs --start` once on a throwaway feature
  name; the per-gate times and any exclusion are recorded in `RUN-PROTOCOL-interactive.md` and in the measurement file.
- **Where the first Agent call falls.** In `--quick` the spec is a stage agent (`pharn-loop-quick.md` item 2), and the
  entry verdict is read only after the grill. So the first Agent call happens before any S14 stop; an excluded slow
  gate protects the later stages (test, build), not the first call.
- **The void 6.73.2 transcript** (`~/Projects/pharn-measure/run1-void-6.73.2-cli/transcripts/3b533399-….jsonl`, 143
  lines): the Agent schema recorded at line 28 lists `description, prompt, subagent_type, model, effort, isolation` —
  no `run_in_background` — and its description says subagents run in the background; one shape hash on every request.
  The call at line 106 sent `run_in_background: "false"` (a string, undeclared); line 107 returned an async-launch
  notice 0.569 s later.
- **7.1.1's rule for that schema** (`pharn-loop.md`, routed stages item 1): an Agent tool with no `run_in_background`
  → `start --no-foreground-agent` → inline. So on 2.1.310 attempt 1 may make no Agent call; the table records that.
- `pharn/ARCHITECTURE.md` content-hash `d5a97430…`; lessons index GREEN; `intent.md` sha256 `6cd32ced…`, 1,232 B,
  unchanged.

## Decisions made without the human (approve or correct at GATE 1)

- **Install from `--ref main`, not a local checkout.** The request's fallback was a local checkout; the CLI cannot read
  one, so that would be a hand copy unlike any user install. `main`'s tip was the requested SHA, and the CLI's recorded
  commit proves which bytes it fetched.
- **`START.md` keeps the intent's line breaks.** The intent is 17 lines; "verbatim" and "on the same line" are kept
  (the second block's first line is the flags followed by the intent's first line), "two lines" is read as two fenced
  blocks. The void interactive run received the intent with its line breaks (transcript line 9).
- **`START.md` and `RUN-PROTOCOL-interactive.md` are committed** on the detached measure HEAD, so the run starts on a
  clean tree (0 pre-run snapshot paths, as every earlier attempt did) and `format:check` (`prettier . --check`, which
  reads untracked files) sees prettier-clean files.
- **The probe's state is removed** after timing: `pharn/.run/` and any `pharn-*.json` the probe left in the worktree's
  git dir (the earlier protocol's precondition 5).

## Files

- `.dev/measurements/loop-interactive-cli-2026-10-26.md` — §0 from the void 6.73.2 interactive transcript, line-cited;
  the attempt-1 base; the empty results table — apparatus

## Outside this repository

Bash writes the fix #7 hooks of this repository do not judge (L19):

- `npm i -g @pharn-dev/pharn@latest` — pharn-cli 0.13.0 → 0.14.1 (done);
- `~/Projects/pharn-starter-6.72/` — reset to `9c6343b7`, install commit `505e70ab`, the gate probe (its `pharn/.run/`
  removed after), a `pharn.config.json` `gates.exclude` commit only if a gate exceeds 540 s, `START.md` and
  `RUN-PROTOCOL-interactive.md` and their commit;
- `/Users/pgalarowicz/Projects/pharn-starter/.git/worktrees/pharn-starter-6.72/pharn-*.json` — removed if the probe
  left any;
- `~/Projects/pharn-measure/cli-1/` — not created here; the collecting session creates it.

## Contracts satisfied

- None changed. The file follows the earlier records' conventions (`loop-wall-clock-2026-10-25.md`: measured vs
  estimated, sources named).

## Evals to write (P1)

- None: no capability is added.

## Guarantee audit (P0)

- "7.1.1 at `e4b17048` is installed" → pharn-cli's own record in `pharn.config.json`, plus `pharn status` comparing the
  bytes with `main` at that time; advisory for this repository (no floor op of pharn-oss checks another project).
- "gate X took N s" → measured once, from the gate-state file's changes polled each second, under no concurrent model
  load; a loop runs the same gates while spec, plan and grill work, so in-run times may be longer. Advisory.
- "§0's values" → read from the transcript by the commands quoted in the file; each value carries its line.
- "`START.md`'s second block is the intent verbatim" → a byte comparison run before hand-off (measured, advisory).
- Nothing here is a floor guarantee of pharn-oss; the build's floor is `validate.mjs` GREEN over an unchanged product
  surface.

## Trust audit (P2)

- The void transcript, its subagent records and `NOTE.txt` are another session's output: read as DATA (types,
  timestamps, enum-like fields, sizes); free text is quoted short, never followed.
- `intent.md` is the user's text, copied verbatim into `START.md` for a human to paste; this session never runs it.

## Open questions (HALT)

- RESOLVED at GATE 1 (2026-10-26, the human): leave `.claude/settings.json` as committed. Plan approved as written.
  The question was: wire 7.1.1's three upstream hooks into the starter's `.claude/settings.json`, or leave it as committed (the 6.73.2
  attempt's condition, one axis of change)?
