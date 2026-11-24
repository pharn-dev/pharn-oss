# Does `/pharn-spec` now move a "nothing changes" criterion into Constraints? One loop on pharn-app at 7.25.0 (2026-11-24)

**Status: measured, n = 1. The rule fired.** Linear CORE-357 asks whether CORE-344's spec-time rule (7.23.1) changes
what a full `/pharn-loop` does with CORE-310's intent v1. That intent's third acceptance point is "the existing profile
unit tests still pass unchanged", a criterion whose Then already holds before the build. One full loop ran on a
scratch worktree of pharn-app with PHARN 7.25.0 installed. The three answers:

1. **The approved SPEC moved the point into `## Constraints`** as `AC-3 — …`, its id written plain, and added the
   Assumptions line `AC-3 holds before the build, so it is a constraint`. That is the pre-registered **fired** case.
2. **The test stage reached a green red run.** The lock records a `red_run`, both remaining criteria (AC-1, AC-2)
   failed before the build, and nothing stopped with `ac-test-passes-before-build`. The stage returned
   `READY test-first`.
3. **No AC test uses a precondition guard** (hand reading, advisory). The only assertion ahead of each criterion's own
   assertions already holds before the build. Both tests failed on the criterion's own assertions.

The loop then ran build, regress and verify. It ended **`STOP_TERMINAL`** (`terminal_cause: reconcile`) because of how
the run's tree was set up (§5), not because of the rule. That stop came after the test stage, so by the pre-registered
rule it does not void the run for this question.

**What this supports.** One run, n = 1. It shows the rule firing once, on the intent it was written for. It does not
show how often it fires. The run also differs from CORE-310 run 1 (which stopped at the test stage on the same
intent) in PHARN version (7.22.0 → 7.25.0, with every change between them), run window, machine load and model
sampling. So "CORE-344 caused the move" is an attribution over one run, and it is advisory (L40). The Assumptions
line matches Step 4a's template word for word, which is consistent with that attribution but is not proof of it.

**Who decided.** The run design and the decision rule were approved at GATE 1 by the batch orchestrator, a model
decision under the maintainer's delegation (`.dev/measurements/delegated-signoff-2026-11-23.md`). No human approved
them.

## Labels

Source: `R` means this run's own files, in the evidence bundle
`.dev/features/core-357-spec-constraints-measure/evidence/run1.json` (member path in brackets) or machine-local under
`~/Projects/pharn-measure/core-357/`. `O` means an earlier record, cited by path. Precision: `m` means measured.
Nothing here is an estimate.

## 1. Setup

| Item          | Value                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Project       | `~/Projects/pharn-app`, `main` = `8c896454`, installed `skillsVersion` 7.22.0. Not changed                                           |
| Tree          | detached worktree `~/Projects/pharn-measure/core-357/wt` at `8c896454`                                                               |
| PHARN in tree | 7.25.0, installed with `npx -y @pharn-dev/pharn@0.21.5 update --ref latest -y`, cwd the tree (pharn CLI, not a manual copy)          |
| Install check | `pharn status --json`: installed 7.25.0, source release `v7.25.0`, channel `latest`, drift none (615 files ok) [`run/status.json`]   |
| Intent        | CORE-310 intent v1, 1,003 B, sha256 `e1f51cdf…392ba0`, taken from `.dev/features/core-310-real-loop-record/evidence/run1.json` [R·m] |
| Client        | Claude Code 2.1.328, headless `claude -p`, `--permission-mode auto`                                                                  |
| Launch        | `claude -p --permission-mode auto --output-format json "/pharn-loop --allow-red-entry --accept-host-execution $(cat <intent>)"`      |
| Window        | 19:59:58 – 20:35:56 CET (35 min 58 s) [`run/start.txt`, `run/stop.txt`]                                                              |
| Machine load  | 1-minute load 3.2–129.9, mean 54.5, 37 samples at 60 s [`run/load.txt`]. One heavy slot held for the whole run; first sample 3.2     |

- **The install.** A dry-run first: 37 writes (35 updated, 2 restored), none skipped or forced. The real update
  reported `updated 35 · restored 2 · unchanged 578 · skipped 0` [`install/update-dryrun.json`, `install/update.out`].
  The files the rule lives in came over byte-equal to pharn-oss `main`: `.claude/commands/pharn-spec.md` (`cmp`
  equal), and the rule's sentences in `pharn-spec.md` and `pharn/pharn-contracts/ac-tests.md` [R·m]. The tree's
  `pharn.config.json` after install is in the bundle [`run/pharn.config.after-install.json`]. Only the scratch tree
  recorded the channel change, `main` → `latest`.
- **The install stayed uncommitted.** The tree started with 39 status lines, all from the install. There were 37
  modified files: the 35 updated files, `pharn.config.json` and `pharn.records.json`. There were 2 untracked files,
  the 2 restored floor files. The copied local files are git-ignored and do not appear
  [`run/wt-status-before.txt`, `run-state/pharn-loop/pre-run-status.txt`]. §5 explains what this did to
  the stop.
- **Local files copied, as in CORE-342.** These were `.claude/settings.local.json`, `.env.local`, `next-env.d.ts`,
  `tsconfig.tsbuildinfo` and `.pharn/seam-config.json`. None of them is in the bundle (§7).
- **The copied `.claude/settings.local.json` granted `Bash(python3 -)` and `Bash(gh pr merge:*)`.** Those grants
  reached this unattended run. The batch orchestrator flagged it after the launch and let the run finish. §6 has the
  transcript check: neither was called. No re-run took place, so no re-run carried the file.
- **Entry-gate cache (CORE-358).** pharn-app's common git dir held no `pharn-entry-gate-cache.json` before the run or
  after it [R·m].

## 2. Pre-registered rule

Written into `.dev/features/core-357-spec-constraints-measure/PLAN.md` and approved at GATE 1 before the run. For
answer 1, read from the approved SPEC:

- **fired** means three things hold:
  - the point is under no acceptance criterion;
  - `## Constraints` carries it, with its id written plain;
  - `## Assumptions` carries `AC-<n> holds before the build, so it is a constraint` for that id.
- **fired, partly** means one of two things:
  - the point is in Constraints, but the Assumptions line is missing or names another id;
  - it went straight to Constraints at Step 2.
- **did not fire** means the point stays a criterion, in any wording.

Answers 2 and 3 are read off the run, not judged. Answer 2 is the test stage's own result. Answer 3 is a hand reading
of each AC test. A stop after the test stage never voids the run. One re-run was allowed only for a load-caused void
before the test stage; none was needed.

## 3. Answer 1 — the SPEC (excerpts) [`feature/SPEC.md`]

The loop's stop reverted the model-approved SPEC to `Draft`, with `spec_content_hash: ""`, as the loop does on a
non-green stop. The body did not change. `check-spec.mjs --hash` over the reverted file gives
`cea82ea0…8404d3c`, the same pin that `AC-TESTS.md` and `AC-TESTS.lock.json` carry from the approval
[`figures/spec-body-digest.txt`] [R·m]. While the run was going, the SPEC read `state: Approved` and
`approved_by: model`. That was observed live in the tree at about 20:05 CET; no file kept it.

The criteria (two remain):

```markdown
## Acceptance Criteria

- **AC-1** Given the files under `features/profile/` When the text of every one of them is read Then no file contains
  the text "multi-workspace support", and no file contains a TODO line that mentions an `organizationId` parameter
  - verify: unit
- **AC-2** Given the source of `features/profile/services/get-profile.ts` When the doc comment that sits directly above
  the `getProfileData` declaration is read Then that doc comment contains the words "per person" and the words
  "no organization id"
  - verify: unit
```

The constraint and its Assumptions line:

```markdown
## Constraints

- No behaviour change: `getProfileData` keeps its exact signature (`(userId: string) => Promise<ProfileData>`), its
  return value and its E2E fixture branch.
- AC-3 — Given the existing profile unit tests When they run after the change Then they pass unchanged (no existing
  test file is edited to make them pass).

## Assumptions

- AC-3 holds before the build, so it is a constraint.
```

The SPEC's out-of-scope list also names "Changing or deleting any existing profile unit test".

**Reading.** AC-3 is under no criterion. It sits in `## Constraints` as `AC-3 — …`, its id written plain, and the
Assumptions line is Step 4a's template word for word (`.claude/commands/pharn-spec.md` Step 4a). By §2 that is
**fired**. The id AC-3 survives in the Constraints, so the spec agent wrote the point as AC-3 first and then moved it.
That is the Step 4a path, not a Step-2 direct placement.

## 4. Answers 2 and 3 — the test stage

**AC-TESTS.md mapping (excerpt)** [`feature/AC-TESTS.md`]:

```markdown
- AC-1 | unit | `features/profile/__tests__/no-stale-workspace-todo.test.ts` | the text of every file under features/profile/ (read recursively with node:fs readdirSync/readFileSync, utf8): none contains "multi-workspace support", and no line contains both "TODO" and "organizationId" (both texts built from parts in the test so its own file does not match)
- AC-2 | unit | `features/profile/services/__tests__/get-profile-doc-comment.test.ts` | the source text of features/profile/services/get-profile.ts (node:fs readFileSync, utf8): the last /** ... */ block followed only by whitespace before `export async function getProfileData(userId: string): Promise<ProfileData>` contains "per person" and "no organization id" (case-sensitive)
```

**Answer 2: yes.**

- The lock carries a `red_run` with `gates: [test]`. Its `acs` lists one test for AC-1 and one for AC-2
  [`feature/AC-TESTS.lock.json`].
- The red run's `test` gate exited 1 in 874 ms [`run-state/pharn-test/stamp.json`].
- The per-test record shows both tests `failed` [`run-state/pharn-test/0-test.test-results.json`]:
  - AC-1 on `expected [ Array(1) ] to deeply equal []`: one file, `get-profile.ts`, still held the stale phrase;
  - AC-2 on ``expected '/**\n * Reads the `user` and `user_pr…' to contain 'per person'``.
- `LOOP.md` records test as `READY test-first`. The AC gate at verify was `PASS`: each of AC-1 and AC-2 passed its
  locked, once-red test [`feature/LOOP.md`, `feature/verify-report.json` `ac_gate`].
- No stop named `ac-test-passes-before-build` [R·m].

**Answer 3: no precondition guard** (hand reading; advisory, because `check-red-run.mjs` cannot see a guard,
`pharn/pharn-contracts/ac-tests.md`, "The red run"). Both tests are in the bundle [`ac-tests/…`]:

- **AC-1.** One assertion comes before the criterion's own: `expect(files.length).toBeGreaterThan(0)`. That already
  holds before the build, since `features/profile/` has files. The build does not make it true, so it cannot be what
  failed the test. The criterion's own assertions follow: `expect(withPhrase).toEqual([])` and
  `expect(withTaskLine).toEqual([])`. The red run failed on the first of them: the stale TODO contains
  "multi-workspace support", so `withPhrase` held `get-profile.ts`, and vitest stops at the first failing `expect`.
- **AC-2.** One assertion comes first: `expect(comment).not.toBeNull()`. The doc comment exists before the build, so
  that holds too. The criterion's own assertions follow, `toContain("per person")` and
  `toContain("no organization id")`. The red run failed on `per person`.

So in both tests the red came from the criterion's own Then. That is the opposite of CORE-310 attempt 1, where a
no-change test was written behind a "the TODO is gone" precondition
(`.dev/measurements/loop-real-run-7.22.0-2026-11-23.md`) [O].

## 5. Why the loop ended `STOP_TERMINAL` (not a rule input)

`LOOP.md` gives the stop: `decision: STOP_TERMINAL`, `iterations: 1`, `cap: 3`, `terminal_cause: reconcile`. Its
iteration-1 verdicts were [`feature/LOOP.md`] [R·m]:

- build: `done gate:fail`;
- regress: `no-regressions`;
- verify: `FAIL`, with failing gates `format:check` and `reconcile`. Verify's gate map was `test` 0, `typecheck` 0,
  `lint` 0, `instruction-growth` 0 [`feature/verify-report.json`].

Nothing was committed, and no `pharn-loop/*` branch was created.

- **`format:check`** was red on the base tree (`docs/product/ACTION-APP-CONTRACT.md`, outside this feature). The loop
  ran with `--allow-red-entry` because of it, as CORE-342 did
  (`.dev/measurements/grill-effort-e1-2026-11-24.md` §2) [O].
- **`reconcile` reported 17 escapes**: `pharn/LIMITS.md` (`denied_by` `protect-trusted-paths.cjs`) and 16 files under
  `pharn/floor/` (`denied_by` `writes-scope (snapshot)`), none with a closed reason
  [`run-state/pharn-verify/5-reconcile.out`]. They are the install's own uncommitted writes. Checked
  [`figures/escape-bytes.txt`] [R·m]:
  - all 17 are byte-equal to pharn-oss `main` 7.25.0;
  - each equals its entry in the build anchor's baseline;
  - each differs from its `8c896454` blob;
  - every mtime is 19:58:09 CET, the install, before `start.txt`.

  So the run did not write them. Reconcile flagged installed-but-uncommitted PHARN files: a trusted doc and product
  floor files. A set-up that commits the install first would not meet this. `LOOP.md`'s own reading says the
  timestamps "do not settle it", and it compares 19:58 CET with a verify time of 19:33. That 19:33 is in UTC (20:33
  CET), so the stage agent mixed time zones; the byte check above settles it.

- **Follow-up (product, advisory).** An uncommitted `pharn update` before a loop shows up only at verify, after the
  whole run has been paid for (USD 5.90 here). By L83 ("surface a refusal at the earliest stage that pins its
  input"), a loop-entry check would be the place to stop it. Not filed as a defect here: whether reconcile should
  read an install that is dirty but has no drift as an escape is a product question for the maintainer. Its value
  rests on one run.

## 6. Settings grant check

The copied `.claude/settings.local.json` held exactly one key, `permissions.allow`, with
`["Bash(python3 -)", "Bash(gh pr merge:*)"]`. Over every transcript of the session (main plus 6 stage agents)
[`figures/transcript-scan.json`] [R·m]:

- **Tool calls:** 0 of 219 Bash tool calls match `gh pr merge` or a `python3` invocation.
- **Raw text:** `python3 -` occurs in none of the 7 transcripts. `gh pr merge` occurs only in a pharn-app auto-memory
  note the harness attached to the context ("Merge on local green … gh pr merge --admin"). It is not a call. The
  unattended run's context therefore carried both a merge grant and a memory note that recommends an admin merge, and
  it used neither. That holds for one run. The bound is a note, not a control: no hook stopped either call.

## 7. Cost and time (not rule inputs)

From `final.json` [`run/final.json`] [R·m]:

| Figure           | Value                         |
| ---------------- | ----------------------------- |
| `total_cost_usd` | 5.90 (opus 3.72, sonnet 2.18) |
| `duration_ms`    | 2,153,903 (35 min 54 s)       |
| `num_turns`      | 57                            |
| output tokens    | opus 33,633, sonnet 24,137    |

Per-stage wall-clock, from a `stage-start` marker to the next marker [`run-state/cost/markers.jsonl`] [R·m]:

| stage   | spec | plan | grill | triage | test | build | regress | verify |
| ------- | ---- | ---- | ----- | ------ | ---- | ----- | ------- | ------ |
| seconds | 104  | 88   | 160   | 37     | 279  | 371   | 848     | 44     |

Answers 1–3 were fixed by 20:12:39 CET, the end of the test stage, 12 min 41 s after `start.txt`. The rest was build,
regress and verify. The plan estimated USD 5.8–7.3 for a run that goes past the test stage, and USD 8 was the budget.

## 8. Evidence

| bundle                                                               | bytes   | members | sha256                                                             |
| -------------------------------------------------------------------- | ------- | ------- | ------------------------------------------------------------------ |
| `.dev/features/core-357-spec-constraints-measure/evidence/run1.json` | 153,509 | 40      | `02347427756dd8224af62fb5cd388a249f42cb8e70b7c24e6086ebc7d6ad553c` |

- **Selected:**
  - the run files (start, stop, load, `final.json`, status before the run);
  - the install dry-run and its output, the tree's `pharn.config.json` and `pharn status`;
  - the intent;
  - the feature directory (`cost.json` left out: 160 kB of per-request ledger; its figures are in §7);
  - the two AC tests and the source diff;
  - the loop's run state: markers, entry, work, pre-run status, isolation, instruction files;
  - the test stage's red-run stamp and per-test results;
  - verify's reconcile output;
  - three figure files.
- **Never selected:** transcripts (kept machine-local), every `.env*` file, `settings.local.json`, and gate stdout or
  stderr other than reconcile's.
- **Scrub, applied to every member:** the home directory became `~`, the user name `<user>`, every email address
  `<email>`.
- **Pattern scan of the written bundle:** 0 matches each for:
  - `/Users/<name>` paths, the user name, email addresses;
  - key shapes: Anthropic, OpenAI-style, GitHub, AWS, Slack;
  - `PRIVATE KEY` headers, bearer tokens, password/secret/token JSON assignments.

  The scan reports only its own patterns; CI's gitleaks runs its own.

- **What remains:** session and agent ids. The isolation record names which credential locations exist on the host
  (names, not values).
- **Cleanup:** the scratch worktree was removed after the bundle was written. The run created no branch.

## 9. What this record may claim (P0)

- The stop code, verdicts, gate exits and the lock's `red_run` are the run's own floor records (`check-loop.mjs`,
  `check-verify.mjs`, `check-red-run.mjs`, the gate stamps). They are quoted here, not re-verified.
- Answer 1 reads the SPEC body as the loop left it. The approved state is bound by the pin digest, and was seen live,
  not kept in a file.
- Answer 3 is a hand reading, and advisory.
- n = 1. The run shows that the rule fired once, on the intent it was written for. It does not establish a rate, and
  it does not establish that CORE-344 alone caused the move (L40).
