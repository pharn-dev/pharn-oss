# PLAN — core-357-spec-constraints-measure

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L13, L37, L40, L47, L57, L64, L66, L85]
- increment: Run CORE-310's 1,003-byte intent v1 once through one `/pharn-loop` on a scratch pharn-app worktree whose installed PHARN is 7.25.0 (it carries CORE-344's spec-time rule, 7.23.1, and the precondition-guard rule, 7.23.4), and record under `.dev/measurements/` whether the "existing profile unit tests still pass unchanged" point was moved into `## Constraints`, whether the test stage reached a green red run, and whether any AC test used a precondition guard. n = 1.
- layer(s): apparatus (`.dev/**`) + repo-meta (`CHANGELOG.md`, `.prettierignore`, `.markdownlint-cli2.jsonc`); no product surface, no `SKILLS_VERSION` bump
- constitution_refs: [P0, P2, P5, P6, P7]

## Discovery (this run, 2026-11-24; read live)

- Branch `core-357-spec-constraints-measure` cut from `origin/main` `aa91a852` (SKILLS_VERSION 7.25.0) after a fetch;
  `npm ci` done. Spec hash above is the sha256 of `pharn/ARCHITECTURE.md`.
- Linear CORE-357 (no comments) asks for the three answers, the SPEC and AC-TESTS.md excerpts, n = 1 stated, and a
  next step if the rule did not fire. A full `/pharn-loop` is acceptable.
- **The rule under test** (read live at 7.25.0): `.claude/commands/pharn-spec.md` Step 2 raises a criterion whose
  Then already holds ("nothing changes", "existing tests still pass") and proposes moving it into `## Constraints`;
  Step 4a, under `--model-approve`, moves it with its id written plain and adds the `## Assumptions` line
  `AC-<n> holds before the build, so it is a constraint`. Owner: `pharn/pharn-contracts/spec-template.md`, "The
  acceptance-criteria grammar". `pharn/pharn-contracts/ac-tests.md`, "The red run", rules out a precondition guard
  (7.23.4) and names `ac-test-passes-before-build` as the stop when a matching test passes before the build.
- **Intent v1**: `.dev/features/core-310-real-loop-record/evidence/run1.json` `intent.text`, 1,003 bytes. Its
  acceptance (3) is "the existing profile unit tests still pass unchanged". CORE-310 run 1 (7.22.0) stopped S9 at the
  test stage on it. CORE-342 used v2 (1,377 B), which drops that point, so v1 is the one that tests this rule.
- **pharn-app** (`~/Projects/pharn-app`): `main` = `8c896454`, installed `skillsVersion` 7.22.0 (below CORE-344),
  install channel recorded `main`. Foreign dirty set 27 lines (`git status --porcelain -uall`, saved to
  `~/Projects/pharn-measure/core-357/pharn-app-status.txt`). No `pharn-entry-gate-cache.json` in its common git dir at
  discovery. One existing loop branch, `pharn-loop/profile-todo-cleanup` (`c698928c`, CORE-310); CORE-342's `-2` is
  gone. Other worktree: CORE-311's `pharn-app-run2`. Neither is touched.
- **Scratch tree created at discovery** (cheap, no heavy step): `git -C ~/Projects/pharn-app worktree add --detach
~/Projects/pharn-measure/core-357/wt 8c896454`.
- **Install dry-run** in that tree: `npx -y @pharn-dev/pharn@0.21.5 update --ref latest --dry-run --json --compact`
  (the published CLI is 0.21.5; the global one is 0.18.5, so the pinned npx is used; `MIN_CLI` is 0.14.0) → exit 0,
  source `release` tag `v7.25.0`, installed 7.22.0 → 7.25.0, 37 file writes (35 `updated`, 2 `restored`:
  `pharn/floor/ac-types-core.mjs`, `pharn/floor/check-ac-types.mjs`), none skipped or forced, channel `main` →
  `latest`. It covers `.claude/commands/pharn-spec.md`, `pharn-test.md`, `pharn/pharn-contracts/ac-tests.md` and
  `spec-template.md`. Saved to `~/Projects/pharn-measure/core-357/update-dryrun.json`.
- Kit and pitfalls read from `.dev/measurements/grill-effort-e1-2026-11-24.md` and
  `.dev/features/core-342-grill-effort-e1/SHIP.md`: headless `claude -p` launch line, `--allow-red-entry` (base red
  `format:check` on `docs/product/ACTION-APP-CONTRACT.md`), local-file copies, the per-repository entry-gate cache
  (CORE-358), scrub and pattern scan, checkout under `~/Projects` so pharn-app's instruction files load.
- Load at discovery: 1-minute 2.98.

## Applied lessons

- L13 — the build formats the record, the CHANGELOG and the two ignore files with `prettier --write` and
  `markdownlint-cli2 --no-globs --fix` scoped to those paths before the floor runs.
- L37 — each answer quotes the run's own artifact (SPEC line, AC-TESTS.md line, lock `red_run` field, stop code),
  never what the command text says should happen.
- L40 — "the rule fired because of CORE-344" is an attribution over one run; the record says the run also differs from
  CORE-310 run 1 in PHARN version (7.22.0 → 7.25.0, every change between them), window, load and sampling, and labels
  the causal reading advisory.
- L47 — counts ("every AC test") are tied to a listed set (the mapping's rows), never a bare closed count.
- L57 — the new evidence directory is added to `.prettierignore` and `.markdownlint-cli2.jsonc`, since a scoped argv
  does not scope a config-driven tool.
- L64 — the CHANGELOG entry restates n = 1 and the advisory attribution; the build checks each restatement against its
  primary sentence in the record.
- L66 — the run gets a new empty run directory; the watcher waits on that run's own `stop.txt`; evidence is copied only
  after the `claude` process exits.
- L85 — if `origin/main` moves mid-ship, merge it and keep the reconcile anchor; never re-run build Step 0.

## Run design (pre-registered before the run)

- **Install method: the pharn CLI in the scratch worktree only.** `npx -y @pharn-dev/pharn@0.21.5 update --ref latest
-y` with cwd `~/Projects/pharn-measure/core-357/wt`, then `pharn status --json` (same pinned CLI) and `skillsVersion`
  read from that tree's `pharn.config.json` must be 7.25.0; else stop and report. pharn-app's own checkout, `main` and
  installed PHARN are never written.
- **Tree prep** (as CORE-342): `npm ci` in the scratch tree; copy pharn-app's `.claude/settings.local.json`,
  `.env.local`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `.pharn/seam-config.json` where present; the foreign dirty set
  is not reproduced (the install itself dirties the tree; the loop's scope check reads the feature's own files). Before
  launch: common git dir checked for `pharn-entry-gate-cache.json` — if present, copied to the run directory as
  evidence and removed.
- **Stages: one full `/pharn-loop`** (spec `--model-approve` → plan → grill → triage → test → build → regress →
  verify). Why not the minimum `/pharn-spec` + `/pharn-test`: `/pharn-test` needs a PLAN and AC-TESTS.md, so plan and
  grill must run between them, and outside a loop each stage halts for a human. The loop is the only documented
  unattended route and runs `/pharn-spec --model-approve` itself. If the test stage stops (`ac-test-passes-before-build`),
  the loop ends there, which is itself answer 2. If it passes, the loop runs on to its own stop, recorded but not a rule
  input.
- **Launch** (CORE-342's line), typed into a Terminal tab (`mcp__terminal__run_in_terminal`), cwd the scratch tree,
  run directory `~/Projects/pharn-measure/core-357/run1/` created empty:
  `date > <run>/start.txt; claude -p --permission-mode auto --output-format json "/pharn-loop --allow-red-entry --accept-host-execution $(cat <intent>)" > <run>/final.json 2>&1; date > <run>/stop.txt`.
  Load sampled every 60 s into `<run>/load.txt`. Heavy slot held and 1-minute load < 20 at start.
- **Void and re-run.** A run that stops for a reason the spec/test stages cannot cause before the test stage reports
  (entry `test` timeout, reboot, harness error) is void; one re-run is allowed for a load-caused void; a second void
  is reported to the orchestrator. A run that has passed its test stage is never void for this question. Ceiling: a
  run still going 120 min after `start.txt` is killed; if its test stage already reported, it still answers. Any
  stop after the test stage (a build, regress or verify red, a gate timeout) is recorded and never voids the run for
  this question (GRILL, fourth concern). A stop before the test stage for a non-environmental reason (triage
  `replan`/`spec`, a spec block) answers question 1 and leaves 2 and 3 unanswered, stated as such.
- **Dirty tree (GRILL, third concern).** The install's 37 file writes stay uncommitted, as CORE-342's dirty set did;
  the loop snapshots them into `pre-run-status.txt`, which goes into the bundle, and the record says the tree was
  dirty with the install.
- **Secrets (GRILL, second concern).** No `.env*` or `settings.local.json` file is ever selected into the bundle; the
  copies go with the worktree's removal; the bundle is scrubbed (home → `~`, user → `<user>`, emails → `<email>`) and
  pattern-scanned (CORE-342's patterns), and the counts are recorded.
- **Cost estimate:** CORE-342's full runs cost USD 5.82–7.33 and 50–81 min; a loop that stops at test is about
  USD 2–4 and 15–25 min (CORE-310 run 1 stopped there). Budget: USD 8, one re-run only for a void.

## Decision rule (pre-registered; for answer 1)

Read from the approved `pharn/features/<name>/SPEC.md` (`approved_by: model`):

- **fired** — no item under `## Acceptance Criteria` asserts that the existing profile unit tests still pass (or any
  rephrasing that holds before the build), **and** `## Constraints` carries that point with its id written plain,
  **and** `## Assumptions` carries an `AC-<n> holds before the build, so it is a constraint` line naming that id.
- **fired, partly** — the point is out of the criteria and in `## Constraints`, but the Assumptions line is missing or
  names another id; or it was never written as a criterion (raised at Step 2 straight into Constraints, with a
  Step-2 Assumptions line).
- **did not fire** — the point stays an acceptance criterion in any wording.

Answers 2 and 3 are read, not judged: answer 2 is the test stage's own result (lock `red_run` present and the loop
not stopped with `ac-test-passes-before-build`, quoted from `LOOP.md` / the stage result; any other test-stage stop,
such as `ac-test-not-collected`, `ac-level-unavailable` or a type-error refusal, is quoted verbatim and answer 2 is
"no, for reason X" — GRILL, first concern); answer 3 is a hand reading
of every AC test file in AC-TESTS.md `## Files` for an assertion its criterion's Then does not state placed before the
criterion's own assertion (advisory, ac-tests.md says the floor cannot see a guard). If the rule did not fire, the
record proposes the next step (a deterministic check, or a wording change, per what the transcript shows the spec
agent did with Step 2's question).

## Files

- `.dev/measurements/spec-constraints-core-357-2026-11-24.md` — the measurement record — layer apparatus
- `.dev/features/core-357-spec-constraints-measure/evidence/run1.json` — the run's evidence bundle (feature
  artifacts, AC tests, lock, LOOP.md, stage results, cost/markers, install status, final.json, load, start/stop),
  scrubbed, Bash-written — layer apparatus
- `.prettierignore` — the evidence directory — layer repo-meta
- `.markdownlint-cli2.jsonc` — the same directory — layer repo-meta
- `CHANGELOG.md` — one dated `[Unreleased]` entry — layer repo-meta

### Not in `## Files`

- Transcripts, gate stdout/stderr, test-results JSON: stay in `~/Projects/pharn-measure/core-357/`.
- pharn-app's checkout, `main`, installed PHARN, `pharn/.run/`: never written. The scratch worktree is removed with
  `git -C ~/Projects/pharn-app worktree remove --force` after the evidence is copied, and a loop branch the run creates
  (the first absent `pharn-loop/<name>[-k]`) is recorded (name, SHA) and deleted; `pharn-loop/profile-todo-cleanup`
  is never touched.
- Trusted docs, hooks, settings, product surface: none.

## Contracts satisfied

- `pharn/pharn-contracts/spec-template.md`, `ac-tests.md`, `loop-record.md`, `cost-ledger.md`: read only, cited not
  restated (P4).

## Evals to write (P1)

No capability, rule or `rule_id` is added. Build checks (advisory unless a gate): every answer cites its artifact;
the record states n = 1; no `/Users/<name>` path, no email, no credential pattern in the bundle (CORE-342's scan);
the bundle parses and lists members with sha256; format/lint clean; `check:changelog-entry` GREEN; `check:surface-bump`
GREEN (no product path).

## Open questions (HALT)

None for the plan. GATE 1 (delegated to the orchestrator) approves the run design, the install method and the rule.

## Run log (recorded before build Step 0)

- GATE 1 approved by the batch orchestrator (a model decision under delegation, not a human approval). Its conditions:
  record the scratch tree's `pharn.config.json` and installed version before launch (done: `skillsVersion` 7.25.0,
  `pharn status --json` installed 7.25.0, drift none); hold one heavy slot for the whole loop (held 19:58–20:36 CET).
- Run 1, 19:59:58–20:35:56 CET, 1-minute load 3.2–129.9 (mean 54.5, 37 samples). Not void. Ended `STOP_TERMINAL`
  (`terminal_cause: reconcile`) after test, build, regress (`no-regressions`) and verify (`FAIL`: `format:check`,
  `reconcile`). The reconcile escapes are the 17 uncommitted install files, byte-equal to pharn-oss 7.25.0 and to the
  build anchor's baseline. That stop comes after the test stage, so it does not void the run for this question (plan
  rule). No re-run. USD 5.90.
- Answers: (1) fired — AC-3 moved to `## Constraints` with the exact Assumptions line; (2) yes — red run recorded, both
  ACs failed on their own assertions, the test stage returned `READY test-first`; (3) no guard.
- After GATE 1, the orchestrator flagged that the copied `.claude/settings.local.json` granted `Bash(python3 -)` and
  `Bash(gh pr merge:*)` to the unattended run. The run was allowed to finish. The file is not copied into any re-run
  (there is none). Transcript check: 0 Bash tool calls matching either pattern across 219 Bash calls (main plus 6
  stage agents); `gh pr merge` appears only in pharn-app's auto-memory text, loaded into context. The record and
  `SHIP.md` both state it.
- No loop branch created (nothing committed); pharn-app's common git dir holds no entry-gate cache after the run.
