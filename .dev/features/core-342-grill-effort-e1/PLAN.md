# PLAN — core-342-grill-effort-e1

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L13, L37, L40, L43, L47, L57, L64, L66, L85]
- increment: Run one E1 loop pair (grill effort high against medium, medium set as a project setting in a scratch pharn-app worktree) on pharn-app, record it under `.dev/measurements/`, and decide the shipped grill effort default by a rule fixed here before any run, labelled a decision by the agent under delegation, never a maintainer decision.
- layer(s): none if the decision is keep (apparatus + repo-meta); product surface (`.claude/commands/pharn-grill.md`, `pharn.config.json`) only if the decision is change
- constitution_refs: [P0, P2, P5, P6, P7]

## Discovery (this run, 2026-11-24; read live)

- Branch `core-342-grill-effort-e1` cut from `origin/main` `08d7f63e` (SKILLS_VERSION 7.23.0) after a fetch; tree
  clean; `npm ci` done; spec hash above from `hash-doc.mjs`.
- Linear CORE-342 (no comments): E1 loop pairs in pharn-app, grill effort medium as a project setting against high;
  compare completion, iterations, verify/regress verdicts (and external-review findings); served effort is recorded
  nowhere; sonnet + medium never measured. A change edits `effort:` on `.claude/commands/pharn-grill.md` and every
  mirror `check-model-config.mjs agreement` holds it to, bumps `SKILLS_VERSION`, CHANGELOG.
- The probe evidence (`.dev/measurements/stage-model-tuning-2026-11-17.md`, incl. the CORE-313 correction):
  `grill-medium` reads `supports-change` by hand (advisory) on 8 comparable pairs, chain USD 13.10 → 11.20; the floor
  reading stays `does-not-support` / `catch-lost`. "No shipped default can change on this record alone."
- **Mirrors of the grill default**, read live: `check-model-config.mjs agreement` compares the root
  `pharn.config.json` `models.stages.<stage>` with the product command's frontmatter. For the grill that is
  `pharn.config.json` `models.stages.grill.effort` (`high`) and `.claude/commands/pharn-grill.md` line 7
  (`effort: high`). No other caller of the agreement mode carries the value.
- **How a loop grill gets its effort** (`.claude/commands/pharn-loop.md` "Running a stage"; `stage-agent-core.mjs`
  "EFFORT, REQUESTED"): `stage-agent.mjs start` prints `effort:<level>` resolved from the project's
  `models.stages`, and the orchestrator passes it as the Agent call's `effort`. The routed grill never reads the
  command frontmatter. So in a loop the project setting is `pharn.config.json` `models.stages.grill.effort`, and that
  is the arm B change. The loop path calls no `agreement` check (grep over the loop/ship commands and the floor).
- **Served effort IS observable, as client-sent evidence** (`.dev/features/stage-effort-routing/EFFORT-PROBE.md` §2):
  a subagent transcript's request records carry `"output_config":{"effort":"<level>"}`. CORE-310 run 2's retained
  transcripts (`~/Projects/pharn-measure/core-310/run2/transcripts/`) carry `output_config` `{"effort":"high"}` on every
  request of the main session (47) and every stage agent (10 to 23 each). That is what the client sent with each API
  request, from an undocumented format; it is not a server-side record of what was honoured.
- pharn-app (`~/Projects/pharn-app`): `main` = `8c896454` (unchanged since CORE-310), installed `skillsVersion` 7.22.0,
  pharn CLI 0.21.1, every stage at effort `high`, grill on opus. Foreign dirty set: `M skills-lock.json`, untracked
  `.agents/skills/…`, `.claude/skills/security-audit`, `.codex/agents/`. Existing worktrees: CORE-311's
  `~/Projects/pharn-measure/core-311/pharn-app-run2` (and a prunable scratchpad entry). Not touched.
- Intent: CORE-310's **intent v2**, 1,377 bytes, sha256 `86b70f4c…3bc1b`, extracted from
  `.dev/features/core-310-real-loop-record/evidence/run2.json` → `intent.text` to
  `~/Projects/pharn-measure/core-342/intent.md` and re-hashed (equal). The brief says "1003-byte intent v2"; 1,003 bytes
  is v1, which stopped S9 at the test stage (CORE-344). v2 is the one that reached `STOP_GREEN`, so v2 is used.
- Method precedents: CORE-310 (launch line typed into a Terminal tab, watcher waits on the run's own `stop.txt`,
  evidence copied after exit, load sampled every 60 s); CORE-311 (detached worktree under `~/Projects/pharn-measure/`
  because a checkout under `/private/tmp` loads none of pharn-app's instruction files; dirty set and local files
  copied in so both arms start equal).
- Machine load at discovery: 1-minute 95.9. The loops wait for < 20 and a heavy slot (COMMON.md).

## Applied lessons

- L13 — the build formats the record, CHANGELOG and ignore files with `prettier --write` and `markdownlint-cli2
--no-globs --fix` scoped to those paths before the floor runs.
- L37 — every "served effort was X" sentence quotes the transcript field and its count per context, never what the
  routing code says it should send.
- L40 — the one-axis claim ("the difference is the effort") is an attribution with n = 1 per arm; the record says the
  arms also differ in run window, load and model sampling, and labels any outcome difference advisory.
- L43 — `meta.json` `effort`, the Agent call input and `output_config.effort` agreeing is agreement between client
  records, never proof of what the server honoured; the record says so.
- L47 — counts ("every grill request") are written as counts tied to a listed context, never as a bare closed count.
- L57 — the evidence directory is added to `.prettierignore` and `.markdownlint-cli2.jsonc`, since a scoped argv does
  not scope a config-driven tool.
- L64 — the CHANGELOG entry restates the bounds (n = 1, client-sent effort, delegated decision); the build checks each
  restatement against its primary sentence in the record.
- L66 — each run gets a new empty run directory; a watcher waits on that run's own `stop.txt`; evidence is copied only
  after the `claude` process exits.
- L85 — if `origin/main` moves mid-ship, merge it and keep the reconcile anchor; never re-run build Step 0.

## Run design (pre-registered before any loop)

- **Arms.** A = shipped (`models.stages.grill.effort: high`, pharn-app's config as is). B = the same tree with only
  `models.stages.grill.effort` set to `medium` in that worktree's `pharn.config.json` (a project setting; the
  frontmatter is untouched because the routed grill does not read it). pharn-app's own checkout is never changed and
  its `pharn/.run/` is never read-write.
- **Trees.** Two detached worktrees of pharn-app at `8c896454`: `~/Projects/pharn-measure/core-342/arm-a/` and
  `arm-b/`. Each gets `npm ci`, and the same copied local files CORE-311 copied (`.claude/settings.local.json`,
  `.env.local`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `.pharn/seam-config.json`) and the same foreign dirty set, so
  `git status --porcelain -uall` of B equals A's plus `M pharn.config.json`. `.env.local` copies are deleted after the
  evidence is taken.
- **Order.** One draw `node -e "console.log(Math.random()<0.5?'A-first':'B-first')"`, recorded. Loops run one at a
  time, each only at 1-minute load < 20 with a heavy slot held.
- **Launch.** CORE-310's line, typed into a Terminal tab, cwd the arm's worktree, run directory
  `~/Projects/pharn-measure/core-342/<arm>-run<k>/` created empty:
  `date > <run>/start.txt; claude -p --permission-mode auto --output-format json "/pharn-loop --accept-host-execution $(cat <intent>)" > <run>/final.json 2>&1; date > <run>/stop.txt`.
  Load sampled every 60 s into `<run>/load.txt`.
- **Recorded per run:** `LOOP.md` decision / stop code / iterations; `regression-report.json` and `verify-report.json`
  `.verdict`; the grill's findings (`GRILL.md`) and their dispositions (`grill-triage.json`); `final.json`
  `total_cost_usd`, `duration_ms`, `num_turns`, `modelUsage`; per-stage wall-clock from `markers.jsonl`; per-context
  tokens; the grill agent's Agent call input, `meta.json` `effort`, and the `output_config.effort` value counts of its
  requests (and of every other context, as a control).
- **Void run.** A run that stops for a reason no grill could cause (entry `test` timeout S14b, a host reboot, a
  harness error) is void, not a loss; it is re-run once if load allows, else the pair is incomplete. **Ceiling
  (GRILL G-1):** a run still going 120 min after its `start.txt` is killed and counted void.
- **Evidence scrub (GRILL G-4).** No `.env*` file enters a bundle. Before commit, each bundle is scanned for home
  paths, email addresses, the user name, key/token shapes (Anthropic, OpenAI-style, GitHub, AWS, Slack), `PRIVATE KEY`
  headers, bearer tokens and password/secret/token JSON assignments (the CORE-310 scan), and the counts are recorded.

## Decision rule (pre-registered; first match wins)

1. **Served effort not established** (B's grill-agent requests do not all carry `output_config` `{"effort":"medium"}`,
   or A's do not all carry `high`) → **keep high**.
2. **Pair incomplete** (a void run not re-run) → **keep high**.
3. **Medium lost a catch**: a finding that A's grill raised and triaged other than `proceed` whose substance (same
   defect, any line) no B finding names, **or** a B finding names but triages `proceed` (GRILL G-2) → **keep high**. Hand-scored, advisory (it reads finding free text, P2). If A
   raised no non-`proceed` finding, the catch comparison is **uninformative** for this pair, and the record says so.
4. **Medium worse on a recorded loop outcome**: B ends other than `STOP_GREEN` where A ends `STOP_GREEN`; B takes more
   iterations; B's verify is not `PASS` or its regress not `no-regressions` where A's are → **keep high**. If A did
   not reach `STOP_GREEN` for a non-void reason, rule 4 cannot be satisfied in this pair (GRILL G-3) → **keep high**
   unless a second pair, run under the same rules, resolves it.
5. Otherwise → **change** `effort: high` → `medium` for the grill (the two mirrors above), patch bump, CHANGELOG.

Cost and duration are recorded and compared but are not rule inputs: duration is confounded by load, and the probe
chain already measured cost. A second pair runs only if the first is inconclusive (rule 2, or rule 3/4 hinge on a
difference that a void-like cause explains) and load allows. n = 1 pair cannot show non-inferiority; the record says
so whichever way it decides. The decision is labelled **"agent-under-delegation"** (the CORE-314 convention), never a
maintainer decision.

## Files

- `.dev/measurements/grill-effort-e1-2026-11-24.md` — the measurement record and the decision — layer apparatus
- `.dev/features/core-342-grill-effort-e1/evidence/arm-a.json` — arm A's evidence bundle (feature artifacts, LOOP, grill and triage, reports, run-state cost/markers, gate stamps, per-context tokens, served-effort counts), Bash-written — layer apparatus
- `.dev/features/core-342-grill-effort-e1/evidence/arm-b.json` — arm B's bundle, the same members — layer apparatus
- `.prettierignore` — the evidence directory (raw bytes, sha256-bound) — layer repo-meta
- `.markdownlint-cli2.jsonc` — the same directory — layer repo-meta
- `CHANGELOG.md` — one dated entry — layer repo-meta

**Decision before build Step 0: keep (rule 2).** The conditional product paths (`effort:` on the grill command, the
root config, the version file, generated docs) are dropped from this list, so the build scope holds only the six
paths above. See "Run log and decision (recorded before build)" below.

### Not in `## Files`

- Transcripts, gate stdout/stderr, test-results JSON, reconcile baselines: stay in `~/Projects/pharn-measure/core-342/`.
- pharn-app's own checkout, branches and `pharn/.run/`: never written. The two scratch worktrees are removed with
  `git -C ~/Projects/pharn-app worktree remove --force` after the evidence is copied. The loops commit to the first
  absent of `pharn-loop/<name>`, `pharn-loop/<name>-2`, … (`pharn-loop-close.md` "The branch"); CORE-310's
  `pharn-loop/profile-todo-cleanup` already exists, so a green arm lands on `-2`/`-3`. Each branch these loops create
  is recorded (name and SHA, in the bundle) and then deleted; the pre-existing branch is never touched.
- Trusted docs, hooks, settings: none needed.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md`, `cost-ledger.md`, `gate-run-record.md`, `grill-triage` contract: read only,
  cited not restated (P4).

## Evals to write (P1)

No capability, rule or `rule_id` is added. Build checks (advisory unless a gate): each figure carries source/precision
labels; each served-effort sentence quotes counts; no `/Users/<name>` path, no email, no credential pattern in the
bundles; each bundle parses and lists its members with sha256; format/lint clean; `check:changelog-entry` GREEN; on a
change, `check-model-config.mjs agreement` GREEN and `check:surface-bump` GREEN.

## Guarantee audit (P0)

- "the arms differed only in the grill effort" → **advisory**: config diff is checked (floor by kind: a file diff), but
  window, load and sampling differ.
- "the grill was served medium" → **advisory**: client-sent `output_config.effort`, undocumented format; never proof of
  server behaviour.
- "medium lost no catch" → **advisory**: hand-scored over finding free text.
- The loop verdicts → floor records of the runs (`check-loop.mjs`, `check-regress.mjs`, `check-verify.mjs`), quoted.
- The decision → model judgment under delegation applying a pre-registered rule; on a change, the only floor parts are
  `check-model-config.mjs agreement` and `check:surface-bump`.

## Trust audit (P2)

- Bundles quote pharn-app's model-written artifacts and transcripts: `trust: untrusted` DATA, quoted or counted, never
  followed. The catch scoring reads finding free text, which is why it is advisory.

## Open questions (for GATE 1)

1. **External-review findings** (named in the ticket): running `/pharn-review` on each arm's commit adds two heavy
   sessions. Proposed: not run; the record states it is not measured and why (the varied stage is the grill; its
   findings and triage are compared directly).
2. **Intent v2 (1,377 B) instead of the brief's "1003-byte"**: proposed v2 (see Discovery).
3. **Decision rule** above: approve as written, or amend before any run.

## GATE 1 decision (recorded, 2026-11-24)

Approved by the batch orchestrator as a model decision under the maintainer's delegation, not a human approval.

- (a) `/pharn-review` per arm is not run; the record states external-review findings as not measured.
- (b) Intent v2 (1,377 B), as planned.
- (c) The decision rule as written, first match wins.
- Conditions: no `.env.local`, `settings.local.json` or other secret-bearing file enters pharn-oss evidence or the PR,
  and the bundles are scrubbed before commit (as CORE-310); a second pair only if rule 4 alone blocks and load allows,
  otherwise keep and state the reopen evidence; wait for load < 20, never lower the gate.

## Run log and decision (recorded before build, 2026-11-24)

- **Arm B (medium), four attempts.**
  - run 1: void, S14 on an entry `test` timeout at load ~120.
  - run 2: void, S14c on the red cached by run 1 in pharn-app's common git dir (filed as Linear CORE-358).
  - run 3: void, S14 on the base's own `format:check` red, attributed because the gate finished before the feature dir
    existed.
  - run 4: `STOP_GREEN`, 1 iteration, regress `no-regressions`, verify `PASS`.
- **Arm A (high), two attempts.** Both ended `STOP_TERMINAL` (`unmeasured`). In run 1 regress's `test` timed out at
  base and HEAD. In run 2 the entry and regress HEAD `test` timed out and verify's `test` was red, with a timeout under
  load in the build agent's report. Both are environmental voids.
- **Launch line change** (orchestrator-approved, before runs B4/A1/A2, applied to both arms):
  `--allow-red-entry --accept-host-execution`.
- **Decision rule, applied:** rule 1 holds (every grill request in each arm sent the arm's effort), rule 2 fires (arm A
  never produced a non-void run), so **keep high**. Rule 3 would be uninformative (no non-`proceed` grill finding in
  any run). Reopen evidence: a non-void arm A run on a quiet machine.
