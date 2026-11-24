# PLAN — core-344-no-change-criteria

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L83, L76, L64]
- increment: A criterion of a test-first SPEC must be able to fail before the build — a "nothing changes" criterion goes in Constraints at spec time, and a precondition guard in front of a no-change assertion is not test-first evidence (Linear CORE-344).
- layer(s): pharn-contracts (spec-template, ac-tests contracts) + the product .claude surface (`/pharn-spec`, `/pharn-grill`, `/pharn-triage`, `/pharn-test`)
- constitution_refs: [P0, P4, P5, P6, P7]

## The failure (P7 trigger)

CORE-310 ran the same 1003-byte intent through a full `/pharn-loop` on pharn-app at 7.22.0. Its third acceptance point,
"the existing profile unit tests still pass unchanged", holds before the build as well as after it
(`.dev/features/core-310-real-loop-record/evidence/`):

- **attempt 1** — the test stage put a guard ("`get-profile.ts` no longer contains `multi-workspace support`") in
  front of a re-run of the existing suite (AC-3) and of a fixture check (AC-4). Both failed before the build only
  because of the guard, which restates AC-1; the red run was recorded and the build began (killed by a host reboot).
- **run 1** — the model-approved SPEC carried the same criterion as AC-3; the test stage wrote it plainly
  (`getProfileData.length === 1` + the E2E fixture), it passed before the build, `check-red-run` returned
  `ac-test-passes-before-build`, and the loop stopped S9 `blocked: stage-refused` after about 15 minutes. Spec, plan,
  grill (G1-2 noted the criterion is not observable) and triage (`proceed`) all let it through.

So the outcome depended on how the test-stage model chose to write the test, and no stage before it named the rule.

## Decisions (under delegation — orchestrator approves at GATE 1)

### (a) Where "every criterion can fail before the build" lives — ADVISORY at spec time, FLOOR at test time

- **A deterministic spec-time check is not honestly possible.** Whether a criterion already holds on today's tree is a
  property of the criterion's meaning against the code, not of the SPEC's structure. A regex over "still", "unchanged",
  "existing … pass" would be a heuristic (P0 forbids calling it a guarantee; P5 forbids letting it drive a branch a
  membership test cannot drive), and the run-1 wording ("with that test file unchanged … every existing test passes")
  shows how the phrasing varies. L83's remedy — "ask the refusing owner itself" — does not reach spec time either:
  the owner is `check-red-run.mjs`, which judges a **run** of a test, and no test exists before `/pharn-test`.
- **So the rule is advisory at spec time, and the floor stays where it is.** `check-red-run.mjs`'s
  `ac-test-passes-before-build` (no escape hatch) already REDs such a criterion at the test stage; this increment adds
  no checker and changes none. What changes is that the rule is written down at the earliest stage that pins the
  input (L83), so a criterion is moved before a run spends a test stage on it.
- **Owner (P4, L76):** `pharn/pharn-contracts/spec-template.md`, "The acceptance-criteria grammar", gains one bullet:
  in a SPEC whose criteria are tested first (`feature` or `quick` kind — not `test-infra`, whose lock is a bootstrap
  record, and not a legacy SPEC, which gets no AC tests), each criterion's Then must be **false on today's tree**. A
  criterion that holds before the build too — nothing changes, existing behaviour or tests still pass, a signature
  stays — is a **constraint**: it goes in `## Constraints`, where the project's own gates hold it as far as they
  observe it (`/pharn-regress` compares base and head in a full run; `/pharn-verify` runs them at HEAD in every run;
  a quick run has no base comparison). Labelled advisory; floor backstop named.
- **Executable text, kept short, citing the owner (product-commands guide: a command keeps what a run executes):**
  - `/pharn-spec` Step 2 gains one bullet, **"Fails before the build"**: for each criterion of a test-first SPEC, ask
    whether its Then is already true today; if so, raise it and propose moving it to `## Constraints`. If moving it
    leaves no criterion, that is the "Missing acceptance criteria" gap.
  - `/pharn-spec` Step 4a gains one bullet (GRILL G1, G2): under `--model-approve`, each such criterion is moved into
    `## Constraints` (its text kept, id written plain) with one `## Assumptions` line naming the move; if no criterion
    would remain, approve nothing and report back blocked on thin intent. Step 4a, not Step 2, because amend mode
    (Step 1a) runs Step 4a's bullets and not Step 2, so an appended criterion is held to the rule too.
  - `/pharn-loop`'s S6 row names that cause beside its two others (GRILL G3) — one phrase, no new stop.
  - `/pharn-grill` Step 3's P1 axis ("Acceptance-criteria coverage") gains one clause: a criterion whose Then already
    holds before the build cannot get a failing test — flag it.
  - `/pharn-triage`'s `spec` list gains "a criterion that already holds before the build" beside "a criterion that
    cannot be tested at its level" (run 1's triage chose `proceed`). Bound, stated in the plan only: the loop's amend
    mode only appends criteria, so a `spec` disposition here routes to the supervisor, whose likely decision is
    `stop` — an earlier, better-attributed stop than S9 at the test stage, not a repair.

### (b) The precondition-guard pattern — NOT acceptable test-first evidence

- **Decision:** a guard that asserts something the build makes true but the criterion's Then does not state (attempt
  1's "the source no longer contains the old TODO"), placed in front of an assertion that already holds, makes the
  test fail before the build for a reason unrelated to its criterion. The red run counts it as red, but it is the
  `ac-test-passes-before-build` case disguised: the criterion's own assertion never failed. `/pharn-test` does not
  write one. For such a criterion it writes the plain test, and the red run's stop is the correct result. The remedy
  is the SPEC (moving the criterion to `## Constraints`), never the test.
- **Where:** `pharn/pharn-contracts/ac-tests.md`, "The red run", one paragraph after the reason table (owner, with the
  bound); `/pharn-test` Step 3, one bullet citing it (the executable rule). Placed after the "No oracle the build
  writes" bullet, away from Step 2 and the Step 3 "Bound:" runner paragraph that CORE-347's typecheck work may touch.
- **Bound (P0):** advisory. `check-red-run.mjs` sees each matched test's pass/fail status, never why it failed, so a
  guard is invisible to the floor; telling a guard from a legitimate part of the Then is judgment.

## Applied lessons

- L83 — the refusal is `check-red-run`'s `ac-test-passes-before-build` at the test stage; the earliest stage that
  pins the input it refuses is `/pharn-spec`, so the rule is surfaced there (and at grill/triage, which see the SPEC
  next). L83's "ask the owner itself" cannot apply — the owner judges a test run, and none exists at spec time — so
  this stays discipline, which L83's own bound states, and the plan says so rather than shipping a copied heuristic.
- L76 — the rule has one owner (`spec-template.md`'s grammar section) and the guard decision one owner
  (`ac-tests.md`'s red-run section); the four commands carry only the executable line and cite the owner, so a later
  change to the rule does not need a four-file sweep.
- L64 — the CHANGELOG entry and each command line restate the rule; before hand-off, grep the diff for "before the
  build", "Constraints" and "guard" and check each restatement's quantifier against the owner (test-first kinds
  only; advisory; floor backstop only at the test stage; the quick run has no base comparison).

## Files

- `pharn/pharn-contracts/spec-template.md` — the can-fail-first rule, in "The acceptance-criteria grammar" — layer pharn-contracts
- `pharn/pharn-contracts/ac-tests.md` — the precondition-guard decision, in "The red run" — layer pharn-contracts
- `.claude/commands/pharn-spec.md` — Step 2 "Fails before the build" bullet + the Step 4a `--model-approve` bullet — product .claude surface
- `.claude/commands/pharn-loop.md` — S6 row: the "every criterion holds before the build" cause — product .claude surface
- `.claude/commands/pharn-grill.md` — Step 3 P1 axis clause — product .claude surface
- `.claude/commands/pharn-triage.md` — the `spec` disposition example — product .claude surface
- `.claude/commands/pharn-test.md` — Step 3 bullet: no precondition guard — product .claude surface
- `SKILLS_VERSION` — 7.23.0 → 7.23.1 (patch: a clarification of shipped stage rules; no new capability, checker or shape)
- `CHANGELOG.md` — the `[7.23.1]` section with this entry (and the `[Unreleased]` entries moved into it)
- `.dev/floor/command-hygiene.test.mjs` — only if a command crosses its `COMMAND_BYTE_CEILINGS` row (measured + 10%, next 512)
- `.dev/floor/stage-load-budget.test.mjs` — only if a stage total crosses its `STAGE_LOAD_CEILINGS` row (same rule)
- `README.md` — the version badge line only, 7.23.0 → 7.23.1 (re-plan, below)
- `pharn-install.json` — regenerated by `npm run docs:generate` (re-plan, below)
- `.dev/features/core-344-no-change-criteria/regression-report.iteration-1.json` — iteration 1's RED regress verdict, kept (re-plan, below)
- `.dev/features/core-344-no-change-criteria/REGRESSION.iteration-1.md` — iteration 1's RED regress render, kept (re-plan, below)

### Not written

- `pharn/spec-template.md` (the project template, hook-protected) and `pharn/pharn-contracts/templates/spec-template.md`
  (the shipped default): not needed. `/pharn-spec` Step 2 runs on every Draft whichever template fills it, and
  changing the default's guidance moves its digest for no gain over the command line.
- No floor checker changes (`check-red-run.mjs`, `check-test-stage.mjs` untouched — CORE-347 is editing the latter).
- No generated doc region: the contracts and commands changed are not rendered into `docs/capabilities/**` or the
  README inventory (`npm run docs:check` confirms at verify). This held for those two regions, but the third
  generated artifact, `pharn-install.json`, and the README badge do change on a bump (re-plan, below).

### Re-plan after regress STOP (2026-11-24; model decision under delegation, orchestrator)

Iteration 1's `/pharn-dev-regress` read `regressions`. Three outside tests failed at HEAD only:

- `check-version-badge`: the README badge still read 7.23.0.
- `check-install-manifest` and `install-manifest-core`: `pharn-install.json` was stale after the shipped files
  changed.

Every `SKILLS_VERSION` bump needs both, and this plan left them out of `## Files`. The RED records are kept, renamed
`regression-report.iteration-1.json` and `REGRESSION.iteration-1.md`. The re-plan adds the two files and those two
records to `## Files`. Build iteration 2 then runs:

1. Park the 9 written files' diff as a patch in the scratchpad.
2. Restore those 9 files to HEAD.
3. Re-run build Step 0 (setter, then a fresh anchor), so every write of this build falls inside the new epoch.
4. Re-apply the patch, update the badge, and run `npm run docs:generate`.

Then regress, verify and review run again. Nothing else in the plan changes.

## Contracts satisfied

- `pharn/pharn-contracts/spec-template.md` — extended (advisory rule; the rules table and checker unchanged).
- `pharn/pharn-contracts/ac-tests.md` — extended (a decision on what counts as red-run evidence; the reason table and
  checker unchanged).

## Evals to write (P1)

- None: no capability (`role:`) and no `rule_id` is added or changed. The touched files are contracts and commands;
  `node pharn/floor/validate.mjs .` still covers the capability tree unchanged.
- Floor coverage of the text: the existing command budget and stage-load tests (bytes, vocabulary, one claims block)
  and `npm run check` (format, markdownlint, docs:check, changelog shape).

## Guarantee audit (P0)

- "every criterion of a test-first SPEC can fail before the build" → advisory at spec / grill / triage (model judgment
  of meaning); FLOOR at the test stage only, by the existing `check-red-run.mjs` `ac-test-passes-before-build`
  (primitive #3 over the per-test record) — unchanged.
- "a no-change criterion moved to Constraints is enforced" → advisory: the project's gates hold it only as far as they
  observe it; `/pharn-regress` (full run) and `/pharn-verify` (every run) compare gate exits, never the constraint text.
- "a precondition guard is not test-first evidence" → advisory: the red run cannot see a failure's reason.
- SKILLS_VERSION bump + CHANGELOG entry → floor: `check:surface-bump`, `check:changelog`, `check:changelog-entry`.

## Trust audit (P2)

- The CORE-310 evidence bundles are untrusted DATA (measured-project text); quoted in this plan as data only. The new
  command lines tell the model to judge a SPEC's criteria — the SPEC body stays untrusted DATA under each command's
  existing fence; nothing new is ingested.

## Determinism audit (P5)

- No new branch on model output is added to any checker. The one new branch in prose (`--model-approve` → move the
  criterion instead of asking) is an existing pattern of Step 2 (warnings become actions or Assumptions lines); the
  terminal fallback in the interactive path is the human's answer at Step 4.

## Open questions (HALT)

- None blocking. GATE 1 (orchestrator, under delegation): confirm (a) advisory-at-spec with the existing test-stage
  floor, rather than a heuristic spec-time scanner; (b) the guard pattern ruled not acceptable; patch bump 7.23.1.
