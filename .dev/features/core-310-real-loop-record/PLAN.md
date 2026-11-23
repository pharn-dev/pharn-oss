# PLAN — core-310-real-loop-record

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L13, L19, L37, L40, L43, L47, L57, L61, L64, L66]
- increment: Commit the record of the first real full `/pharn-loop` on pharn-app at 7.22.0 (Linear CORE-310): three runs (one killed by a host reboot, one stopped S9, one STOP_GREEN), with per-stage wall-clock, tokens, model, effort and agent type, per-gate `duration_ms`, which 7.11–7.22 mechanisms fired, and the stop reasons, plus the raw evidence bundles, with no product-surface byte.
- layer(s): none — build apparatus only (`.dev/measurements/`, `.dev/features/`) plus repo-meta (CHANGELOG, two ignore files)
- constitution_refs: [P0, P2, P5, P6, P7]

## Discovery (this run, 2026-11-23; read live)

- Branch `measure/core-310-real-loop-record` cut from `origin/main` `e8f0527e` (SKILLS_VERSION 7.23.0) after a fetch;
  tree clean; `check-lessons-index` GREEN; spec hash above from `hash-doc.mjs`.
- pharn-app: `skillsVersion` 7.22.0, pharn CLI 0.21.1, `gates.exclude: ["build","e2e"]`,
  `testResults: {"test":"vitest-json"}`, every stage `high` effort, spec/plan/grill/test/review opus, the rest sonnet.
  Foreign uncommitted files there (`skills-lock.json`, `.agents/`, `.codex/`, `.claude/skills/security-audit`) are
  not ours and were never touched. Claude Code 2.1.328.
- The three runs, all launched by typing one line into a Terminal tab (`claude -p --permission-mode auto
--output-format json "/pharn-loop --accept-host-execution $(cat <intent>)"`, cwd `~/Projects/pharn-app`), so every
  one is a main-session run with no `--no-foreground-agent`:
  - **attempt 1**, base `be523aa8`, intent v1 (sha256 `e1f51cdf…`), 09:23 to 10:14 CET. Killed by the host reboot
    during build (load about 65, mostly other projects' vitest/tsc). Someone else fast-forwarded pharn-app `main` to
    `8c896454` at 09:25, during this run's entry `test` gate.
  - **run 1**, base `8c896454`, intent v1, 11:39:33 to 11:56:28. `INCONCLUSIVE`, `blocked: stage-refused` (S9) at
    the test stage, because criterion 3 ("existing tests still pass") passed before the build (CORE-344).
  - **run 2**, base `8c896454`, intent v2 (sha256 `86b70f4c…`: criterion 3 moved into the constraints, and the
    `format:check` red that `8c896454` carries on `docs/product/ACTION-APP-CONTRACT.md` fixed as the new criterion 3),
    13:26:59 to 14:07:50. **`STOP_GREEN`**, one iteration, committed to the local branch
    `pharn-loop/profile-todo-cleanup` (`c698928c`), left there unmerged.
- Raw evidence: `~/Projects/pharn-measure/core-310/{attempt1,run1,run2}/` (transcripts, `pharn/.run/` state, the
  PHARN records in the git dir, feature artifacts, `final.json`, `load.txt`, `tokens.json`). Scratch helpers
  (`tokens.mjs`, `gates.mjs`, `collect.sh`) live in the session scratchpad.
- Headline numbers already read (run 2): session 40 min 51 s; stage starts to next marker: spec 106 s, plan 122 s,
  grill 331 s, triage 34 s, test 247 s, build 450 s, regress 856 s, verify 43 s. Verify reused regress HEAD's `test`
  and `typecheck` (`reason: reused`). The entry cache printed `miss no-record`, and regress did not take entry's base
  evidence (`start-dirty`). Every routed Agent call carried `subagent_type: pharn-stage` with the configured
  `model`/`effort`. No MCP, WebFetch, WebSearch or Skill tool_use in any context. Total processed tokens 13.30 M,
  output 55.0 k, `total_cost_usd` 5.86 (list price, from `final.json`).
- Defects already filed under CORE-293: CORE-343 (a crashed loop's open marker fails the next loop only at its build
  anchor; read from code), CORE-344 (a no-change criterion passes or stops by chance), CORE-345 (regress HEAD re-runs
  the `test` the build's full gates just ran: 383 s).
- Precedents: `loop-wall-clock-2026-10-25.md` (labels R/O/S and m/e; it names session ids), the baseline record (no
  session ids), and CORE-112's `.dev/features/stage-model-tuning/runs/` (raw files committed, with `.prettierignore` and
  `.markdownlint-cli2.jsonc` entries, and no session JSON).

## Applied lessons

- L13 — the build formats the record, CHANGELOG and both ignore files with `prettier --write` and `markdownlint-cli2
--no-globs --fix` scoped to those paths before the floor runs.
- L19 — the bundles are written by a scratchpad script through Bash, so each bundle path is declared in `## Files`
  (a declared Bash write, not an escape); the script reads `~/Projects/pharn-measure` read-only and writes nothing else.
- L57 — the markdownlint step uses `--no-globs`, and the evidence directory is added to both tools' ignore lists,
  because a scoped argv does not scope a config-driven tool.
- L61 — the bundles are JSON, which `lint:md` does not read; the evidence is never written as loose `.md` files, so the
  pharn-app SPEC/PLAN/GRILL text inside them cannot redden `lint:md`.
- L37 — every "fired / did not fire" sentence is written from the field that shows it (a stamp's `reason: reused`, the
  printed `miss` token, an Agent call's input), quoted next to it, never from reading the mechanism's code.
- L40 — attributions are the risky sentences here ("load inflated the durations", "the reboot killed attempt 1",
  "start-dirty came from the foreign files"). Each is labelled advisory unless a negated-condition comparison exists in
  the data; where none exists (load), the record says so instead of quantifying the effect.
- L43 — `LOOP.md`, `RUN-REPORT.md`, `cost.json` and the transcripts can agree and still be wrong. Each figure names its
  store, and the token figures come from the transcripts, not from the ledger's views.
- L47 — run counts and "every routed stage" claims are written in open form or as counts tied to a listed set (the six
  routed stages of run 2), never as a bare new closed count copied from elsewhere.
- L64 — the bounds are restated in the CHANGELOG entry; the build checks each restatement against its primary sentence
  in the record before halting.
- L66 — every run was watched by a script waiting on that run's own new `stop.txt` in a directory created empty for it,
  and evidence was copied only after the `claude` process exited; the record states this method.

## Scope (one increment, nothing speculative — P7)

The trigger is the ticket itself: none of the 7.11–7.22 loop changes had run inside a real loop. The runs are done.
This increment only records them, so no `SKILLS_VERSION` bump. No checker, test or capability is added. The analysis
scripts stay in the scratchpad (CORE-112 and baseline precedent). The record's "How the figures were made" section
describes each derivation well enough to redo it.

Record outline (`.dev/measurements/loop-real-run-7.22.0-2026-11-23.md`):

1. Answer: one paragraph.
2. Setup: feature, both intents, bases, launch line, client, cwd, the method caveats (external load with samples;
   `main` moved mid-attempt 1; foreign dirty files).
3. The three runs: one table (base, intent, window, stages reached, stop).
4. Run 2 per stage: wall-clock, requests, processed/output tokens, served model, requested model/effort, agent type,
   route token, and machine load in that window.
5. Run 2 per gate: `duration_ms` for entry, ac-test, build targeted/full, regress base/head and verify.
6. Fired or not, each with its evidence field: the entry gate cache, HEAD `test` reuse (CORE-89), effort routing
   (CORE-111; every configured value is `high`, so the routing is observable but not distinguishable from a default),
   entry-as-base evidence, `pharn-stage` agent type, CORE-105 AC4.
7. Tool use outside the stage tool list (none), for CORE-311.
8. Run 1 and attempt 1: the same tables, shorter.
9. Defects and observations: links to CORE-343/344/345, plus the pharn-app `main` format red as a project fact.
10. CORE-311 and CORE-312 hand-off figures: verify `test` 0 ms (reused) against regress HEAD `test` 383 287 ms, and
    the reproduction line.
11. What this record may claim (P0).

## Files

- `.dev/measurements/loop-real-run-7.22.0-2026-11-23.md` — the record — layer apparatus
- `.dev/features/core-310-real-loop-record/evidence/attempt1.json` — attempt 1's evidence bundle (feature artifacts, AC tests, the source diff, run state, PHARN git-dir records, per-context tokens) — layer apparatus
- `.dev/features/core-310-real-loop-record/evidence/run1.json` — run 1's bundle (the same members) — layer apparatus
- `.dev/features/core-310-real-loop-record/evidence/run2.json` — run 2's bundle (the same members, plus the regress/verify/build stamps and the loop commit's diff) — layer apparatus
- `.prettierignore` — the evidence directory (raw bytes; a formatter must not rewrite the run's own records) — layer repo-meta
- `.markdownlint-cli2.jsonc` — the same directory, as a second layer (no `.md` lands there) — layer repo-meta
- `CHANGELOG.md` — one dated `[Unreleased]` entry; no `SKILLS_VERSION` bump — layer repo-meta

### Not in `## Files`

- Transcripts, gate stdout/stderr, `*.test-results.json`, the reconcile baseline: too large or redundant. They stay in
  `~/Projects/pharn-measure/core-310/` (machine-local, named in the record).
- Anything under `pharn/`, `.claude/`, `docs/`, `.dev/floor/`; `SKILLS_VERSION`, `MIN_CLI`.
- pharn-app: no file write. Its loop branch `pharn-loop/profile-todo-cleanup` keeps `c698928c`, unmerged. After the
  gates, the checkout is switched back to `main` (`git -C ~/Projects/pharn-app switch main`) only if `git status`
  shows the foreign files carry over unchanged; otherwise it is left and reported. CORE-311 runs from its own worktree.
- This feature's `GRILL.md`, `REGRESSION.md`, `regression-report.json`, `VERIFY.md`, `verify-report.json`,
  `REVIEW.md` and `SHIP.md`: later stages' own artifacts.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md`, `cost-ledger.md` and `gate-run-record.md`: read only. The record cites
  their fields (`decision`, `blocked`, stop rows S9 and STOP_GREEN; `markers`, `route`; `runs[].duration_ms`,
  `reason: reused`) and does not restate them (P4).

## Evals to write (P1)

No capability, rule or `rule_id` is added, so P1 asks for no eval. The build runs these checks over the record (all
advisory, except the gates `/pharn-dev-verify` runs):

- every figure carries a source (`R`, the run's store or transcript; `O`, an earlier record) and a precision (`m`/`e`);
- every "fired / did not" line quotes its evidence field;
- the record has no `/Users/<name>` path (home is `~`);
- each bundle parses as JSON, and its file list matches the source directory's selected members (count and names);
- `npm run format:check` and `npm run lint:md` are clean (in a clean copy if sibling worktrees pollute them);
- `npm run check:changelog-entry` is GREEN against `origin/main`.

## Guarantee audit (P0)

- "these are the run's figures" → **advisory**. They are read from the run's own stores (stamps, markers, transcripts,
  `final.json`), never verified against an independent clock. `check-loop-record.mjs` GREEN on the `LOOP.md` files
  is shape, not truth.
- "verify reused regress HEAD's `test`" → **advisory reading of a floor record**: the stamp's `reason: reused` and
  `stamp_sha256` are written by `run-gates`, and this record quotes them; it does not re-verify the binding.
- "the run stopped STOP_GREEN by `check-loop.mjs`" → **advisory restatement** of the loop's own record. The
  `check-loop.mjs` exit is quoted from the transcript.
- "no stage used an MCP/WebFetch/WebSearch/Skill tool" → **advisory**: a scan of `tool_use` names in the retained
  transcripts. It cannot see a tool the harness refused before a `tool_use` was written.
- "load inflated the durations" → **advisory, not quantified**: there is no low-load control run.
- The `.prettierignore` / markdownlint entries → **floor by kind** (the tools' own ignore matching). They only stop
  those tools from rewriting or judging the bundles.

## Trust audit (P2)

- The bundles and the record quote pharn-app's model-written artifacts (SPEC, PLAN, GRILL, LOOP, handoffs) and
  transcript-derived counts. All of it is `trust: untrusted` DATA. The record quotes it fenced or as counts, never as
  an instruction. Nothing in this repo reads the bundles to decide anything.
- Session ids, agent ids and the run marker's `session_id` appear in the bundles (open question 1).

## Determinism audit (P5)

- No branch. The one judgment, whether the run counts as the ticket's "checker-decided stop", is put to the
  orchestrator as open question 2.

## Open questions (resolved at GATE 1; see the decision below)

1. **Session ids in committed evidence.** The bundles carry Claude Code session and agent ids (in `markers.jsonl`,
   `active.json`, `cost.json`, `final.json`, `tokens.json`). Precedents differ: `loop-wall-clock-2026-10-25.md`
   names them, while the baseline and CORE-112 kept them out. Options: (a) commit as is (recommended: they are not
   secrets, and CORE-311 needs the pairing); (b) replace each id with a stable alias (`session-A`) in the bundles and
   the record.
2. **Which run satisfies CORE-310 AC1.** Run 2 is the green, checker-decided stop, but its intent is v2, edited after
   run 1's S9. Run 1 also stopped on a checker (S9, `check-test-stage.mjs`) and is recorded beside it. Options:
   (a) run 2 is the ticket's run, with runs 1 and attempt 1 as recorded context (recommended); (b) record all three
   and leave AC1 for the maintainer.

## GATE 1 decision (recorded, 2026-11-23)

Approved by the batch orchestrator as a model decision under the maintainer's delegation, not a human approval.

- Q1: (a), commit session and agent ids as they are. First scrub every bundle: no `/Users/<name>` path (use `~`), no
  email address, no key/token/credential pattern, and no git author email from the PHARN git-dir records (dropped or
  aliased). The record states each bundle's size; a bundle over about 1 MB is trimmed, and the record says what was
  dropped.
- Q2: (a), run 2 satisfies AC1, with run 1 and attempt 1 as context. The Answer paragraph says plainly that intent v2
  was written after run 1's S9 stop, and why (CORE-344 plus the pharn-app format red), so run 2 is never read as a
  first-attempt green.
- Plan change: after the gates, switch the pharn-app checkout back to `main` when the foreign files carry over
  unchanged (see "Not in `## Files`").
