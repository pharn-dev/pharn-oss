# PLAN — loop-cost-6-73-2

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L19, L40, L64, L66]
- increment: Record the two `/pharn-loop` runs of pharn-starter's `merge-legal-into-company` feature on PHARN 6.73.2 (asked
  for: `billing-plan-catalog` on 6.72.0; see "Deviations from the request") in
  `.dev/measurements/loop-wall-clock-2026-10-25.md`, and add at most four sentences to the README's `/pharn-loop`
  section stating when to use the full loop, when `--quick`, and the measured cost, linked to that file.
- layer(s): build apparatus (`.dev/measurements/`, `.dev/features/`) + repo-meta (`README.md`, `CHANGELOG.md`); no
  product surface, so no `SKILLS_VERSION` bump (CLAUDE.md, "SKILLS_VERSION discipline": README and CHANGELOG are
  repo-meta and do not bump)
- constitution_refs: [P0, P2, P6, P7]

## Applied lessons

- L19 — the two loop runs, the worktree resets, the copy-outs into `~/Projects/pharn-measure/run{1,2}/` and every
  `measure.mjs` invocation are Bash writes the fix #7 hooks never judge. They land outside this repository and are
  listed under `## Outside this repository`, not presented as scoped. Inside the repo, every file is written with
  Write/Edit under the plan scope.
- L40 — the PR asks for "the one thing that most changed since 6.35.0". That is a causal attribution across two runs
  that differ in feature, base commit, Claude Code version and session type. The record states it as the largest
  measured difference and names every condition that also varied; it never says a PHARN change caused it unless a
  run varies only that condition, and none does.
- L64 — the README sentences and the CHANGELOG entry restate the measurement's figures. Before hand-off, each figure
  in those two restatements is checked against the measurement file's own table, and the README's quantifier stays
  "these two runs", never "a run" or "a loop".
- L66 — each run copies out into its own directory created empty for it (`run1/`, `run2/`), `measure.mjs` reads a run
  only after its session has exited (the `stop.txt` marker written after `claude -p` returns), and the reset between
  runs deletes the worktree's `.pharn/` and PHARN's git-dir records, so run 2 cannot read run 1's base evidence.

## Discovery (read-only, this run)

- **The runs the request names did not exist.** On 2026-10-25 `~/Projects/pharn-measure/` held only `run1-void`,
  `run1-void-cli` and `run1-void-overlap`: three attempts on 6.72.0 that stopped at the spec stage (`blocked:
stage-refused`, S9) on the residual `stage-agent-background`. Each wrote a ledger with `coverage: unavailable` or
  none.
- **The feature the protocol measures is `merge-legal-into-company`**, chosen in `.dev/measurements/loop-6.72-prep.md`
  §8 at pharn-starter base `9c6343b7`. `billing-plan-catalog` is the 2026-10-05 run's feature (base `42d419cd`),
  already built on pharn-starter `main`.
- **6.73.2 (#391) is on `main`**, and pharn-starter carries `measure/base-6.73.2` (`20c85c05`): `9c6343b7` plus a
  committed 6.73.2 install (`pharn.config.json` `skillsVersion` 6.73.2, commit `471a54bb`; the diff touches only
  PHARN's files, the config and the records).
- **A first 6.73.2 attempt in the interactive CLI (2.1.310) stopped S9 again**: the orchestrator passed
  `run_in_background` as the string `"false"`, and 6.73.2's `--no-foreground-agent` applies only to an Agent tool with
  no such parameter. Saved in `~/Projects/pharn-measure/run1-void-6.73.2-cli/`. A headless `claude -p` session passed
  the JSON boolean `false`, and its spec agent ran in the foreground (05:53:33Z), so both measured runs are headless.
- **The fast gates at `20c85c05`:** `lint`, `typecheck`, `format:check` exit 0; `npm ls` exit 0; tree clean; no PHARN
  records in the git dir; `intent.md` sha256 `6cd32ced…` unchanged. `test` is left to the loop's entry gates.
- **`measure.mjs` and the 6.72+ ledger:** both 6.35.0 and 6.72.0 ledgers are `pharn-cost-ledger/2` with the
  `run-window/2` membership the helper reads. 6.48.0 added `entry_events` and `entry` (the entry-gate observations,
  `pharn/pharn-contracts/cost-ledger.md`, "Entry gate observations"), which the helper does not read. Whether a
  branch is needed is decided on run 1's real ledger (build step).
- `pharn/ARCHITECTURE.md` content-hash `2c84959c…` (`node .dev/floor/hash-doc.mjs`); lessons index GREEN.

## Deviations from the request (decided under the user's delegation, 2026-10-25)

The user chose at the first halt that they would run the loops, then said "do what I said, if you need to run
something do it". The model therefore runs both loops itself and records:

- **PHARN 6.73.2, not 6.72.0.** 6.72.0 cannot finish a loop under Claude Code 2.1.308–2.1.310 (three void attempts).
  The file says so and labels every figure 6.73.2.
- **`merge-legal-into-company`, not `billing-plan-catalog`.** The protocol's feature; `measure.mjs` gets
  `--feature <the slug each run prints>`.
- **Headless `claude -p --permission-mode auto`, not an interactive session.** The only form that ran a stage agent
  in the foreground; recorded as a comparability input.
- **The 6.35.0 table is kept, and every row is marked not comparable** (the user's answer at the first halt): a
  different feature and base commit, plus the session type and Claude Code version. Figures are shown side by side
  for context; no delta is given where the definition is the same but the workload differs. The 19-minute human wait
  is still subtracted from the old wall-clock and said so, as asked.
- **The output file is `loop-wall-clock-2026-10-25.md`**, the request's pattern with today's date.

## Files

- `.dev/measurements/loop-wall-clock-2026-10-25.md` — the measurement record — apparatus
- `.dev/features/build-writes-through-tools/measure.mjs` — only if run 1's ledger needs a schema branch: an added
  branch that reads `entry_events` / `entry` when present, the existing branches untouched — apparatus
- `README.md` — at most four sentences in the `/pharn-loop` section — repo-meta
- `CHANGELOG.md` — one `[Unreleased]` entry, dated 2026-10-25 — repo-meta

## Outside this repository

Bash and tool writes the fix #7 hooks of this repository do not judge (L19):

- `~/Projects/pharn-starter-6.72/` — the worktree: each run's own writes, and the reset between runs
  (`git checkout --force --detach 20c85c05 && git clean -fdx -e node_modules && git worktree prune`);
- `/Users/pgalarowicz/Projects/pharn-starter/.git/worktrees/pharn-starter-6.72/pharn-*.json` — copied out, then deleted
  after each run;
- `~/Projects/pharn-measure/run1/`, `run2/` — each run's copy-out, `start.txt` / `stop.txt` / `exit.txt`, the session's
  final message, and `measure.json` (the helper's stdout);
- `~/Projects/pharn-measure/run1-void-6.73.2-cli/` — the void interactive attempt, already saved;
- `~/.claude/projects/-Users-pgalarowicz-Projects-pharn-starter-6-72/` — Claude Code writes each run's transcript.

## Contracts satisfied

- None changed. The record follows the 2026-10-05 file's labels (R/S source, m/e precision, token classes separate,
  nothing priced) and the ledger's own classes (`pharn/pharn-contracts/cost-ledger.md`).

## Evals to write (P1)

- None: no capability is added. `measure.mjs` is a read-only apparatus helper with no test file, as before.

## Guarantee audit (P0)

- "the token figures are the ledger's" → the helper copies `cost.json`'s token classes; the ledger itself is FLOOR
  recompute-checked by `check-cost-ledger` at emission. That a ledger is complete is bounded by its own `coverage`
  field, quoted.
- "the run ran on 6.73.2" → read from the worktree's committed `pharn.config.json` and the ledger's
  `skills_version`; advisory that every file matched (the install commit was not re-diffed against `471a54bb`).
- wall-clock, request counts, prefixes → measured from transcripts and ledgers; bytes-to-tokens is an estimate
  (`LIMITS.md §1c`), always with its formula.
- "nothing is reproducible beyond these two runs" → stated, not claimed otherwise.

## Trust audit (P2)

- Transcripts, ledgers, `LOOP.md` and stage output are another project's run output and model text: copied as DATA
  (counts, timestamps, enums, sizes); free text is quoted, never followed.

## Open questions (HALT)

- None. GATE 1 is delegated (above); the schema-branch decision is a build-step reading of run 1's ledger.
