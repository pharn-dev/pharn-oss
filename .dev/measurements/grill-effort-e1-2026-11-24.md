# Grill effort high against medium: one E1 loop pair on pharn-app (2026-11-24)

**Status: measured, incomplete pair. Decision: keep `high` (agent-under-delegation).** Linear CORE-342 asks whether the
shipped `/pharn-grill` effort should go from `high` to `medium`, using E1 loop pairs in the measured project. One pair
was attempted on pharn-app at PHARN 7.22.0, with the same intent and base in both arms. The arms differed only in the
project's `models.stages.grill.effort`.

- **Arm B (medium) ended `STOP_GREEN`** after one iteration on its fourth attempt: regress `no-regressions`, verify
  `PASS`. Its first three attempts are void (§3).
- **Arm A (high, the shipped value) produced no non-void run in two attempts.** Both ended `STOP_TERMINAL`
  (`terminal_cause: unmeasured`) because the project's `test` gate timed out under machine load (§3).
- **The served effort could be established as far as the client records it.** In every run, every request of the
  grill stage agent sent `"output_config":{"effort":"<arm's level>"}`, and every other context sent `high` (§4). That
  is what Claude Code sent with each API request. It is not a server-side record of what was honoured.
- **The catch comparison is uninformative.** No grill finding in any run, either arm, was triaged other than `proceed`
  (§5), so there was no catch for medium to lose or keep.
- **By the pre-registered rule, the decision is keep `high`:** rule 2 fires, because the pair is incomplete (§6). n is
  one attempted pair, and no non-void control. This record supports no claim about medium's quality, for or against.

**Who decided.** This decision was **decided by the agent under the maintainer's delegation** (the CORE-293 batch
delegation; the 2026-11-23 convention in `.dev/measurements/delegated-signoff-2026-11-23.md`). It is **not a maintainer
decision**. The batch orchestrator approved the run design, the decision rule and two mid-run changes (§2) as model
decisions under the same delegation. The maintainer can overturn it by reopening CORE-342.

## Labels

Source: `R` means a run's own files (its `pharn/.run/` state, feature artifacts, `final.json` and transcripts, kept in
`~/Projects/pharn-measure/core-342/<run>/`); `O` means an earlier record, cited by path. Precision: `m` means measured.
Nothing here is an estimate.

## 1. Setup

| Item         | Value                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project      | `~/Projects/pharn-app`, `main` = `8c896454`, installed `skillsVersion` 7.22.0, pharn CLI 0.21.1                                                                                            |
| Trees        | two detached worktrees at `8c896454`: `~/Projects/pharn-measure/core-342/arm-a` and `arm-b`                                                                                                |
| Arm A        | `models.stages` as installed: grill `opus` / `high` (every stage `high`)                                                                                                                   |
| Arm B        | the same, except `models.stages.grill.effort: "medium"` in that worktree's `pharn.config.json`                                                                                             |
| Intent       | CORE-310's intent v2, 1,377 B, sha256 `86b70f4c…3bc1b`, re-hashed before use                                                                                                               |
| Client       | Claude Code 2.1.328, headless `claude -p` (`entrypoint` `sdk-cli` in the transcripts)                                                                                                      |
| Launch       | one line typed into a Terminal tab, cwd the arm's worktree; each run in a new, empty run directory                                                                                         |
| Order        | one recorded draw before any run: `B-first` (`order-draw.txt`)                                                                                                                             |
| Machine load | sampled every 60 s into each run's `load.txt`; each run's heavy slot was taken at 1-minute load < 20, and every run but B1 also started below 20 (B1's first sample: 36.6, after `npm ci`) |

- **Why the config and not the frontmatter.** In a loop the routed grill's effort comes from the project's
  `models.stages`: `stage-agent.mjs start` prints `effort:<level>`, and the orchestrator passes it on the Agent call
  (`.claude/commands/pharn-loop.md`, "Running a stage"). The routed grill never reads `.claude/commands/pharn-grill.md`.
  So arm B is exactly the project setting the ticket names. `git diff` in arm B showed that one line changed [R·m].
- **Made equal.** Both worktrees got `npm ci`, the same copied local files as CORE-311
  (`.claude/settings.local.json`, `.env.local`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `.pharn/seam-config.json`),
  and pharn-app's foreign dirty set. Arm A's `git status --porcelain -uall` equalled pharn-app's own. Arm B's equalled
  A's plus `M pharn.config.json` [R·m]. pharn-app's own checkout and its `pharn/.run/` were never written.
- **Why a checkout under `~/Projects`.** A checkout under `/private/tmp` loads none of pharn-app's project
  instruction files (`.dev/measurements/stage-agent-benchmark-2026-11-23.md` §3) [O].
- **Intent v1 or v2.** The brief named a "1003-byte" intent. 1,003 B is v1, which stopped S9 at the test stage in
  CORE-310 (a no-change criterion cannot fail first, CORE-344). v2 is the one that reached `STOP_GREEN` there
  (`.dev/measurements/loop-real-run-7.22.0-2026-11-23.md`) [O], so v2 was used.

## 2. Pre-registration, and what changed during the runs

The run design and the decision rule were written into `.dev/features/core-342-grill-effort-e1/PLAN.md` and approved
at GATE 1 before any loop ran. The rule is applied in §6, first match wins:

1. served effort not established (B's grill requests not all `medium`, or A's not all `high`) → keep;
2. pair incomplete (a void run not replaced by a non-void one) → keep;
3. medium lost a catch (an A finding triaged other than `proceed` that no B finding names, or that B triages
   `proceed`) → keep;
4. medium worse on stop code, iterations, verify or regress; or A not `STOP_GREEN` for a non-void reason → keep;
5. otherwise → change the grill to `medium` (patch bump).

Cost and duration are recorded but are not rule inputs. A run that stops for a reason no grill could cause is void.

**Two changes after GATE 1, both orchestrator-approved under the delegation, both applied to the two arms alike:**

- **The launch line gained `--allow-red-entry`** before runs B4, A1 and A2:
  `claude -p --permission-mode auto --output-format json "/pharn-loop --allow-red-entry --accept-host-execution $(cat <intent>)"`.
  The base `8c896454` fails `format:check` on `docs/product/ACTION-APP-CONTRACT.md`, the file intent v2's third
  criterion formats. CORE-310 run 2 got past that red only because the feature directory changed while that gate
  ran, so the red was read as `unattributed` (its record's words). In B3 the red was attributed, and the loop stopped
  S14 before plan [R·m]. Getting past entry was therefore a timing race. The flag removes it for both arms; it is the
  remedy the loop's own stop text names.
- **Reset before each arm** (from B3 on): the arm's `pharn/.run/`, its feature directory and its worktree git-dir
  `pharn-*` records were removed (each copied into the run directory first), and pharn-app's common git dir was checked
  for an entry-gate cache record (§7).

## 3. The runs

| run | arm | window (CET)  | load min–max (mean)   | ended                                                     | cost USD | void? |
| --- | --- | ------------- | --------------------- | --------------------------------------------------------- | -------- | ----- |
| B1  | B   | 08:56 – 09:09 | 36.6–142.4 (86.6)     | `INCONCLUSIVE`, S14 `gates-red-at-entry` (`test`)         | 4.34     | yes   |
| B2  | B   | 10:48 – 10:49 | 17.4–18.8 (2 samples) | blocked S14c `gates-red-cached`, no stage ran             | 0.63     | yes   |
| B3  | B   | 10:52 – 10:57 | 16.7–57.6 (35.0)      | `INCONCLUSIVE`, S14 `gates-red-at-entry` (`format:check`) | 1.54     | yes   |
| B4  | B   | 11:01 – 11:51 | 7.0–144.3 (49.4)      | **`STOP_GREEN`**, 1 iteration                             | 5.82     | no    |
| A1  | A   | 11:53 – 13:01 | 4.1–171.0 (61.0)      | `STOP_TERMINAL` (`unmeasured`), 1 iteration               | 6.34     | yes   |
| A2  | A   | 13:20 – 14:41 | 3.8–161.5 (63.8)      | `STOP_TERMINAL` (`unmeasured`), 1 iteration               | 7.33     | yes   |

Source: each run's `start.txt` / `stop.txt`, `load.txt`, `LOOP.md` and `final.json` `total_cost_usd` [R·m].

- **B1 (void, environmental).** One entry `test` case timed out at its 10 s limit
  (`features/landing/components/__tests__/feature-gate-pages.test.tsx`; 1 failed of 9,127), at load around 120. Spec,
  plan, grill and triage had run. Its grill is reported in §5 as an extra sample.
- **B2 (void, setup).** It stopped on B1's red, which the entry gates had cached in pharn-app's common git dir, a file
  B1's reset did not cover (§7). No stage ran.
- **B3 (void, the timing race in §2).** Only spec ran.
- **B4.** Entry `test` 0, `format:check` 1 (allowed by the flag). Regress base `test` exit 1, regress HEAD `test` 0, so
  `no-regressions`. Verify `PASS`, with `test` and `typecheck` reused from regress HEAD. It committed to the local
  branch `pharn-loop/profile-todo-cleanup-2` (`df74f916`) [R·m]. Its base `test` red is itself a load flake, read the
  same way regress reads it.
- **A1 (void, environmental).** Regress `inconclusive` (`base-timed-out`): `test` hit the 540,000 ms per-gate timeout at
  base and at HEAD. Verify was `PASS` [R·m].
- **A2 (void, environmental).** Entry `test` timed out (540,426 ms). Regress `inconclusive`
  (`per-test-record-refused`; HEAD `test` timed out). Verify `FAIL` on `test` exit 1. The build agent reported a 10 s
  test timeout outside the plan's files at load 38–70; that is the agent's report, not checked [R·m].
- **Neither A run failed on anything the grill produces.** Both stopped on the `test` gate's timing under load, after
  the build had passed its own gates. That attribution is advisory: no A run was made at low load (L40).

## 4. Served effort

Counted over each run's own session (main transcript plus its `subagents/`), from the transcripts' request records
[R·m]:

| run | grill stage agent: `output_config` effort | every other context (main + other stages) | Agent call `effort` / `meta.json` `effort` for the grill |
| --- | ----------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| B1  | `medium` × 18                             | `high` only                               | `medium` / `medium`                                      |
| B4  | `medium` × 20                             | `high` only                               | `medium` / `medium`                                      |
| A1  | `high` × 22                               | `high` only                               | `high` / `high`                                          |
| A2  | `high` × 30                               | `high` only                               | `high` / `high`                                          |

Every grill agent was a `pharn-stage` agent served `claude-opus-5-5`. So the ticket's "served effort is recorded
nowhere" is narrower now. The requested level (the Agent call), the agent's recorded level (`meta.json`) and the level
each request was sent with (`output_config`) agree in every run. All three are client records in a format the platform
does not document (`.dev/features/stage-effort-routing/EFFORT-PROBE.md`). Their agreement is agreement, not proof of
what the server applied (L43).

## 5. Grill findings and their triage

| run | findings | severities           | triage          |
| --- | -------- | -------------------- | --------------- |
| B1  | 5        | 1 important, 4 minor | all 5 `proceed` |
| B4  | 2        | 2 minor              | all 2 `proceed` |
| A1  | 5        | 5 minor              | all 5 `proceed` |
| A2  | 3        | 3 minor              | all 3 `proceed` |

Source: each run's `grill-findings.json` and `grill-triage.json` [R·m].

- **Overlap, read by hand (advisory: it reads finding free text, P2).** Every A1 and A2 finding has a counterpart in
  at least one B run, except two:
  - A1's G1-3: AC tests under `shared/` reading `features/` paths;
  - A2's G1-2: AC tests pinning exact prose.
    The recurring themes across the arms:
  - the pharn-ci `TESTS_NOT_EXERCISING_CHANGES` warning (B1, B4, A1, A2);
  - the AC-3 Prettier subprocess duplicating `format:check` (B1, B4, A1, A2);
  - backslash-escaped backticks in the plan (B1, A1).
    All of them were triaged `proceed`, so none was a catch the loop acted on.
- **Rule 3 is uninformative here.** No run, either arm, raised a finding triaged `replan` or `spec`. A one-line doc
  change gives a grill little to catch. The probe chain is where catches were measured
  (`.dev/measurements/stage-model-tuning-2026-11-17.md`) [O].
- **The medium grill raised fewer findings in B4 (2) than either high run (5, 3), but more in B1 (5).** Two medium and
  two high samples on one plan-shaped task support no reading of finding volume.

## 6. Applying the rule

1. **Served effort established?** Yes, as far as §4's client records go: B's grill requests all `medium`, A's all
   `high`. Rule 1 does not fire.
2. **Pair complete?** No. Arm A has no non-void run. **Rule 2 fires: keep `high`.**

Rules 3 to 5 are not reached. For the record, rule 3 would be uninformative (§5). Rule 4 would hinge on an arm A run
that never measured its `test` gate.

**What would reopen it.**

- A non-void arm A run of the same pair: same base, intent and flag, on a machine quiet enough that `test` finishes
  inside its 540,000 ms gate timeout. Alternatively, a committed `gates.timeoutMs` raise applied to both arms.
- If that A run is `STOP_GREEN` with one iteration, `PASS` and `no-regressions`, the pre-registered rule reaches
  rule 5 (change), still with an uninformative catch leg.
- A task whose grill raises a `replan` or `spec` finding at `high` would make the catch leg informative.

## 7. Defect found: the entry-gate cache is per repository (Linear CORE-358)

B1's red `test` was cached by the entry gates (CORE-86) in `pharn-app/.git/pharn-entry-gate-cache.json`. That is the
repository's common git dir, which the main checkout and every worktree share. The same run's worktree-scoped records
went to `.git/worktrees/arm-b/`. Removing arm B's `pharn/.run/` and its worktree git-dir records left the cache in
place, and B2 stopped on it (`blocked: gates-red-cached`, quoting B1's `measured_at` 07:57:23Z) [R·m].

The record was copied to `b-run1/gitdir/common-pharn-entry-gate-cache.json` and deleted. No later run left one
(checked after B3, B4, A1 and A2). Filed as CORE-358 (related to CORE-342): one slot per repository, read and
overwritten by every worktree, and not reset by clearing a worktree's state. Whether two worktrees with different
trees can match one record was not tested.

## 8. Cost and time (recorded, not rule inputs)

| run | session      | turns | processed tokens | output tokens | opus USD / sonnet USD | grill agent: requests, processed, output, stage wall-clock |
| --- | ------------ | ----- | ---------------- | ------------- | --------------------- | ---------------------------------------------------------- |
| B4  | 3,009,412 ms | 55    | 13,689,940       | 55,559        | 3.60 / 2.22           | 19, 1,951,080, 9,883, 145 s                                |
| A1  | 4,112,953 ms | 58    | 15,401,680       | 63,837        | 3.60 / 2.73           | 21, 2,098,672, 13,886, 209 s                               |
| A2  | 4,855,180 ms | 65    | 16,222,230       | 68,292        | 4.36 / 2.98           | 29, 2,607,504, 13,556, 565 s                               |
| B1  | 753,871 ms   | 43    | 9,170,666        | 45,786        | 2.94 / 1.41           | 17, 1,789,415, 12,537, 150 s                               |

Sources: `final.json` (`duration_ms`, `num_turns`, `modelUsage`), the transcripts (tokens summed per context, one
count per message id; processed = input + cache write + cache read + output), and `markers.jsonl` (stage-start to the
next marker) [R·m].

- The A runs are dearer than B4 mostly in build, regress and verify, which ran longer under load. Verify also re-ran
  `test` in both A runs, where B4 reused regress HEAD's. Those stages are not the varied one.
- The grill stage alone: medium sent 17–19 requests and 9.9 k–12.5 k output tokens; high sent 21–29 requests and
  13.6 k–13.9 k output tokens. Two samples each, under different loads. It points the same way as the probe chain's
  −14% chain USD, and it proves nothing alone.

## 9. Evidence

Two bundles under `.dev/features/core-342-grill-effort-e1/evidence/`, built by one selection rule. Each holds, per run:

- its figures (the analysis output: per-context tokens, effort counts, Agent call inputs, markers, verdicts);
- its feature directory;
- its AC tests or source diff;
- its git-dir `pharn-*` records;
- its run-state cost, markers and loop state;
- its gate stamps, `final.json`, `load.txt` and start/stop times.

| bundle       | bytes     | runs (members)                     | sha256                                                             |
| ------------ | --------- | ---------------------------------- | ------------------------------------------------------------------ |
| `arm-a.json` | 1,214,739 | A1 (44), A2 (41)                   | `4a85db712b4601189a5b31e64aafbc9ac93776711ba8593425ccd5dd5910f2c5` |
| `arm-b.json` | 914,937   | B1 (27), B2 (12), B3 (19), B4 (44) | `2eba00ad3189cdef6c698e4e0ee43092647fb11454511947b7d0615bae7857ef` |

- **Left out:**
  - transcripts, gate stdout/stderr and `*.test-results.json` (large; kept machine-local in
    `~/Projects/pharn-measure/core-342/`);
  - every `.env*` and `settings.local.json` file (never selected);
  - B4's commit diff of the reformatted contract doc and the feature directory (both already in the bundle as files;
    the diff carries the stat and the source and test hunks).
- **Scrub, applied to every member:** the home directory became `~`, the user name `<user>`, every email address
  `<email>`. The commit diff has no author line.
- **Pattern scan of both written bundles:** 0 matches each for:
  - `/Users/<name>` paths, email addresses and the user name;
  - key shapes: Anthropic, OpenAI-style, GitHub, AWS, Slack;
  - `PRIVATE KEY` headers and bearer tokens;
  - password/secret/token JSON assignments.
    The scan reports only its own patterns; CI's gitleaks runs its own.
- **What remains:** session, agent and message ids, as in CORE-310. The isolation witness lists which credential
  locations exist on the host (names, not values).

## 10. What this record may claim (P0)

- The verdicts, stop codes and gate exits are the runs' own floor records (`check-loop.mjs`, `check-regress.mjs`,
  `check-verify.mjs`, the gate stamps), quoted, not re-verified.
- "Void" is a classification by the pre-registered rule. That the A runs' `test` timeouts were caused by external load
  is advisory: no low-load A run exists (L40).
- The served effort is client-sent evidence (§4), never proof of server behaviour.
- The catch reading (§5) is hand-scored and advisory. It found nothing to compare.
- One attempted pair, with no non-void control, on a one-line task, supports no claim that `medium` is as good as,
  better than or worse than `high`. The decision to keep `high` follows from the rule's incompleteness clause, not from
  evidence against `medium`.
