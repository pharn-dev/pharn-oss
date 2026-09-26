# BUILD — stage-regress-script

**Model routed via Agent subagent; effort not routed** (build stage ran on sonnet per `pharn.config.json`).

## What landed

Every deterministic step of `/pharn-regress` moved out of `.claude/commands/pharn-regress.md`'s Bash
prose and into one tested stage script, `pharn/floor/stage-regress.mjs` (execution) +
`pharn/floor/stage-regress-core.mjs` (pure rules: `TEST_FILE_RULE`, `STYLE_CONFIG_RULE`, `INSTALL_RULE`,
`BASE_RULE`, `REGRESS_PATHS`, the progress-record schema/validator). A new shared protocol,
`pharn/pharn-contracts/stage-exit.md` + `pharn/floor/stage-exit-core.mjs`, defines the ONE JSON envelope
every stage script emits (`{schema, status, stage, feature}` plus a closed per-status key set; the exit
table `{0,2,3,4,5}`, with `1` reserved for a genuine crash; the fixed question/answer round trip; and the
shared `mayStartSlowStep` budget decision so a future `stage-verify.mjs` reuses it). `REGRESSION.md` is
now rendered by deterministic code, `pharn/floor/render-regression.mjs`, using untrusted-text quoting
helpers (`dataText`/`quoteData`) moved byte-for-byte into a new zero-dependency `pharn/floor/quote-core.mjs`
(re-exported from `render-run-report.mjs` so its own suite keeps exercising the one implementation).
`pharn/floor/run-gates.mjs` now exports `spawnGate` (a `null` results path means no `PHARN_TEST_RESULTS`
variable) so the stage script's base-commit install step reuses the same process-group/timeout/kill
discipline. `.claude/commands/pharn-regress.md` was rewritten as a thin caller (one pinned fresh line, one
pinned resume line, branch on exit code only), with its writes-scope narrowed to the strictest concrete
target the setter can express (`.pharn/pharn-regress/stage.json`, which resolves to `.pharn/**` alone).
`.claude/commands/pharn-loop.md` gained the stage-exit-to-stuck-point mapping paragraph; `.claude/commands/
pharn-ship.md` had its stale "Step 4a" citation corrected and a sentence added confirming every regress
stop (not only chain-red) leaves no `regression-report.json`. Comment-only cites in `run-gates.mjs`,
`loop-fresh-core.mjs`, `check-regress.mjs`, `gate-run-core.mjs` and `ship-outcome-core.mjs` were updated to
name the new script instead of the retired command-prose step numbers; `ship-outcome-core.mjs`'s residual
comment was narrowed to state that a regress stop can no longer leave a stale report behind (the stage
removes it in its own "fresh" phase, before any step that can fail), except for a malformed-invocation
`unusable` refused before that point. `run-gates.test.mjs`'s old command-extraction ★ WIRING test was
retired in favor of `stage-regress.test.mjs`'s own (which now executes `pharn-regress.md`'s ONE pinned
line against a real `npm ci`, offline). `.dev/floor/command-hygiene.test.mjs` gained a `STAGE_SCRIPT_WIRING`
set (the two pinned lines and their numbers, the absence of a direct runner/checker call, and the A1
writes-scope claim executed against the live guard) and a closure test binding every `regress` `question`
reason_code to `pharn-loop.md`'s new mapping paragraph. `SKILLS_VERSION` 6.22.0 → 6.23.0 (`MIN_CLI`
unchanged at 0.5.0); `CHANGELOG.md` gained the `## [6.23.0]` section; `README.md`'s badge and generated
CURRENT-STATE block were updated (contracts 14 → 15, floor checkers 81 → 86); `CLAUDE.md` gained a Commands
entry for the new script/contract and had one stale cross-file citation corrected. `.prettierignore` and
`.markdownlint-cli2.jsonc` gained `pharn/features/*/REGRESSION.md` entries.

## Floor status

**GREEN.** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`.
`npm run check` (the full aggregate gate: format:check, lint, lint:md, docs:check, check:markers,
check:badge, check:changelog, check:contributing, check:reconcile, test) exits 0, with all 3428 tests
in `npm test` passing. `node pharn/floor/check-bash-reconcile.mjs --base .` reports `"verdict": "CLEAN"`
against the Step-0 anchor, so no Bash-tool write in this build landed anywhere the live write-guards
would have denied.

## Decisions made during the build (within the PLAN's scope)

- **Discovered during a real end-to-end smoke test:** `NODE_TEST_CONTEXT`, an internal Node environment
  variable `node --test` sets on itself, leaks into a fixture whose OWN `test` script is also
  `node --test` (through `spawnSync` → `spawnGate`'s inherited environment), which makes the NESTED
  `node --test` run report over an internal coordination channel instead of exiting normally — a
  genuinely failing assertion inside such a fixture then read back as gate exit 0. This is an artifact of
  testing the script FROM INSIDE `node --test` while the script itself launches `node --test`; it never
  occurs for a real `/pharn-regress` run (invoked from a Bash tool, never from inside a test-runner
  process). The fix lives entirely in `stage-regress.test.mjs`'s own test harness (`CLEAN_ENV` strips the
  variable before every spawn of the CLI under test) — `stage-regress.mjs` itself needed no change and
  carries no special-case for it.
- `resolveInstall`'s `kind: "none"` result was normalized to always carry `cmd: null, unmeasured: false`
  (instead of omitting those keys), so the progress-record validator's shape rule did not need a
  per-branch exception — found by the same end-to-end smoke test before it was written up as a formal
  case.
- The two widest markdown tables in `pharn/pharn-contracts/stage-exit.md` (the per-status key-set table
  and the `VALUE_KINDS` table) were rendered as bulleted definition lists instead of pipe tables: their
  cell content is long prose, and `markdownlint-cli2`'s MD060 "aligned" table-column-style could not be
  satisfied by its own `--fix` after two passes. This is a formatting choice, not a content change.
- `pharn/floor/run-gates.test.mjs`'s retired ★ WIRING test's supporting helpers (`FLOOR_MODULES`,
  `fencedBlocks`, `pinned`, the `REGRESS_CMD` constant) were removed along with it, since nothing else in
  that file used them; the now-unused `copyFileSync` import was dropped for the same reason.

## Re-runs

**One correction after the first `npm run check` GREEN, before the regress/verify stages ran.** The build
step comment-fixing `pharn/floor/gate-run-core.mjs`'s stale "/pharn-regress's Step 4a" citation (planned as
"EDIT, comment only") was deferred during the build ("I'll come back to it after writing pharn-regress.md")
and then never completed — a genuine omission in this build, caught only while assembling the commit's
explicit file list and finding the file absent from `git status`. Re-set the PLAN's writes-scope, applied
the comment fix, and re-ran `node --check`, `node pharn/floor/validate.mjs .`, `node --test
pharn/floor/gate-run-core.test.mjs`, and the full `npm run check` (3428/3428 tests) — all GREEN, confirming
the comment-only change altered no behavior. Because this file joins `inside` only from this point (it was
byte-identical to base throughout the original build), `/pharn-dev-regress` and `/pharn-dev-verify` were
each re-run once, in full, over the corrected tree (see `REGRESSION.md` / `VERIFY.md` for both runs' own
"re-run" notes). No other stage needed a second pass.

## GATE 2 — review fixes (2026-09-26)

`.dev/features/stage-regress-script/REVIEW.md` returned `blocked-with-2-floor-findings` (plus 1
blocking-severity, 6 important and 12 minor advisory findings). GATE 2 was decided **FIX** by the
orchestrator under the maintainer's delegation (not a human decision). Every F/A finding was fixed, per
that instruction; every minor finding was fixed unless noted DEFERRED below with its reason.

### Floor-gate

- **F1** (`validateStageExit` did not deep-compare `options[]` against the registry) — **FIXED**.
  `stage-exit-core.mjs`'s `isValidOption` now closes over exactly `{id, label, argv, value}` (an extra key
  fails), and a new `optionsMatchRegistry` positional comparison requires every candidate option to
  byte-equal the registry's own entry at the same index — closing a forged label, a forged `argv`, an
  added option and a removed option. `stage-exit.md:133`'s guarantee-audit line now matches the code.
  Tests: 5 new `★ F1` cases in `stage-exit-core.test.mjs` (forged label, forged argv, extra key, added
  option, removed option) plus a positive control over every registered question.
- **F2** (`/pharn-ship`/`stage-exit.md`/`pharn-regress.md` told a caller every regress stop leaves no
  report; an argv refusal after "fresh" did) — **FIXED**. `stage-regress.mjs`'s argv parsing is split into
  `extractFeature` (validates only `--feature`) and `parseRestOfArgv` (everything else); stale-report
  removal (`phaseFreshEarly`) now runs immediately after the slug parses and the containment walk passes,
  BEFORE any other argv flag is validated. The residual is narrowed to exactly two cases: a stop before
  the slug+containment (a bad/missing `--feature`, or `path-containment` itself), or a crash. Narrowed the
  claim in `pharn-ship.md`, `CHANGELOG.md [6.23.0]`, `stage-exit.md` (the `unusable` envelope bullet, M5)
  and `pharn-regress.md`'s own `2 unusable` bullet. `stage-regress.test.mjs:384`'s test is now two tests:
  the narrowed residual (a bad `--feature` still leaves a report) and the fix (a bad `--timeout-ms`, which
  used to leave one, no longer does). Also fixed while in this code: M7(a) `--timeout-ms` now requires
  3-9 digits (matching `run-gates.mjs run --next`'s own rule, catching a value it would refuse later
  instead of after the worktree/install/some gates already ran); M7(b) a trailing `--budget-ms` with no
  value is a `usage-error`, not silently unbudgeted; M7(c) `--resume`'s stray-token scan now iterates by
  index, closing a bug where a duplicate numeric token could pass by matching an earlier occurrence's
  position via `indexOf`.

### Advisory — all fixed

- **A1** (the `question` branch's pinned `--resume` block dead-ends: `--resume` is for a `continue` exit
  only) — **FIXED**. `pharn-regress.md`'s `4 question` bullet now documents the correct re-invocation
  (`node pharn/floor/stage-regress.mjs <resume.argv…> <chosen option's argv…>`, never `--resume`); the
  `--resume` block moved to live only under `5 continue`. Pinned by 4 new `★ round trip` tests (one per
  regress `reason_code`) that execute exactly this corrected form end to end to `done`.
- **A2** (`tests-unresolved` fired on `scope.outside_tests.length === 0`, not on the true test-universe
  being empty, and its round trip could not be answered) — **FIXED**. `phaseHeadInit` now receives the
  full `tests` array from `phasePartition` and asks only when `tests.length === 0`; an empty OUTSIDE set
  with every test legitimately INSIDE the feature now proceeds silently. The question's `resume.argv` now
  strips any stale `--tests` pair (`stripFlagPair`) so both the "supply a pathspec" and "confirm no tests"
  answers apply cleanly. Two new tests (the legitimate-empty-outside case; the genuinely-empty-universe
  case) plus the `tests-unresolved` round-trip test (a typo corrected on the second try, A2's own G16
  case).
- **A3** (the progress record was persisted only at a budget-exhausted `continue`, so a harness kill
  anywhere else lost the whole run) — **FIXED**. `runPhases` now calls `persistProgress(state)` at the top
  of every phase from `drain-head` through `verdict` (not `cleanup`/`render` — see M9). Pinned by a new
  test that SIGKILLs the real CLI mid-run under a budget far larger than anything the fixture could
  exhaust (so the pre-fix code would never have persisted anything at all) and confirms `--resume` reaches
  `done`. The test retries `--resume` through a transient run-gates lock-contention window (an artifact of
  a SIGKILL not necessarily reaping an already-spawned `run --next` grandchild, not a defect in the fix).
- **A4** (`--resume` never re-ran the containment walk, so a feature directory swapped for a symlink
  between invocations was written through) — **FIXED**. Extracted `containmentGuard(feature)` from the
  fresh path and call it at the top of `runResume`, before any write. New test: force a `continue`, swap
  the feature directory for a symlink, then `--resume` and assert `path-containment`, nothing written
  through the link.
- **A5** (the ★ tests asserted less than their titles promised) — **FIXED**, all four parts: (1) a new
  `★ A5` test runs a real multi-invocation BUDGETED regress run, fabricates a checker-validated verify
  stamp/report over the same live tree (the `check-loop-fresh.test.mjs` `writeStamp` idiom), and asserts
  `check-loop-fresh.mjs --iter 1` returns FRESH with checks D/E/H/J each individually asserted `pass`; (2)
  the ★ WIRING test gained the promised dropped-`--timeout-ms` mutant control; (3) a new test runs an
  unbudgeted and a `--budget-ms 1` regress over 3 NON-STYLE gates (`test`/`typecheck`/`build` — the old
  fixture's `lint`/`format:check` were both dropped by the config-touch skip, leaving only one gate) and
  asserts the same four compared fields, with an explicit mid-`drain-head` continue observed; (4) one
  end-to-end question round-trip test per `reason_code` (shared with A1/A2 above).
- **A6** (the failed-install warning was not `REGRESSION.md`'s first line, and claimed EVERY base gate
  reads red unconditionally) — **FIXED**. `render-regression.mjs` now renders the warning ABOVE the
  verdict line (title and base still precede it — the "first line" claims in `pharn-regress.md`,
  `CHANGELOG.md` and `CLAUDE.md` are narrowed to say so), and the "reads red" clause is conditioned on the
  report's own `pre_existing` (naming the actual count, or stating none did). New `★ A6` test asserts the
  ordering and the absence of an unconditional "every base gate" claim, plus the empty-`pre_existing` case.
- **A7** (two new unattended-`/pharn-loop` S10 stops were not disclosed) — **FIXED**. `CHANGELOG.md
[6.23.0]` and `pharn-loop.md` now name `install-unresolved` (a `package.json` with no committed
  lockfile) and `tests-unresolved` (a genuinely empty test universe) as new stops a pre-6.23.0 run would
  have proceeded past. The "better" alternative the review offered — routing a zero-dependency manifest to
  a fixed rule instead of a question — is **DEFERRED**: it is a real behavior change with its own edge
  cases (what counts as "zero-dependency"?) and P7 names no observed failure beyond the disclosure gap
  this fix already closes; a future increment can pick it up if a real project actually hits it.

### Minor — 11 fixed, 1 deferred

- **M1** (a gate id was said to be quoted "as fenced DATA"; it is quoted inline via `dataText` alone) —
  **FIXED**: narrowed in `CLAUDE.md` and `CHANGELOG.md` to distinguish a checker message (fenced) from a
  gate id (inline, never fenced, always preceded by fixed prose so it cannot open a heading).
- **M2** ("can never carry an absolute path" did not account for a human's own `--install`/`--gates`
  text) — **FIXED**: narrowed to "no path the script itself supplies" in the same two places.
- **M3** (three parts) — **FIXED** (two of three; the third is a documentation-location observation, not
  a wrong claim):
  - the per-refusal remedy text PLAN.md promised is restored in `pharn-regress.md`'s `3 refused` bullet,
    one line per `reason_code`;
  - `pharn-regress.md:191`'s "never read by you" now carries the `(ADVISORY)` label the rest of the
    command uses for a claim about model behavior;
  - the install-unresolved sentence now states the omitted no-`package.json` case explicitly;
  - **not restored:** the old "one detection this exemption gives up" paragraph now lives only in
    `check-regress.mjs:156`'s comment. The finding is an observation (the content moved, it did not
    become wrong), and duplicating the same sentence in a second file re-creates exactly the sync-drift
    risk this repo's own `check-specified-markers.mjs`/L6 precedent warns about — a comment-vs-comment
    duplicate that nothing detects if one drifts. Left as is.
- **M4** (`detail` was relayed without saying it is DATA) — **FIXED**: `pharn-regress.md`'s `2 unusable`
  bullet now says so explicitly.
- **M5** (the `unusable` envelope claimed "nothing new"/"only this feature's stale report" for every
  member) — **FIXED**, folded into the F2 fix: `stage-exit.md` and `pharn-regress.md` now state what
  already happened depends on WHEN the exit fires, including the from-"worktree"-onward case (new state
  may already exist) and "fresh" clearing another run's scratch too (G14).
- **M6** (`validateStageExit` accepts any string for `done.verdict`/`continue.phase`) — **DEFERRED**,
  named in `stage-exit.md`'s Residual section. Closing it needs either a per-stage verdict/phase enum
  threaded into the shared, stage-generic `stage-exit-core.mjs` (the exact per-stage-knowledge split
  `REGISTRY` exists to avoid), or hard-coding one stage's vocabulary into a module every future stage
  script shares. No `Fix:` was offered for this finding and no real failure motivates the scope increase
  now (P7); recorded so the silence reads as a decision, not an oversight.
- **M7** — **FIXED**, folded into F2 above (all three parts: 3-9 digit `--timeout-ms`, a required
  `--budget-ms` value, and `--resume`'s index-based stray-token scan).
- **M8** (`FEATURE_SLUG_RE` is redeclared with no parity pin against `gate-run-core.mjs`'s) — **FIXED**:
  exported it from `stage-exit-core.mjs` and added a parity test comparing `.source`/`.flags` against
  `gate-run-core.mjs`'s own export.
- **M9** (`RESUMABLE_PHASES` admitted `cleanup`/`render`, which the script never persisted, crashing
  instead of `progress-malformed`) — **FIXED**: narrowed `RESUMABLE_PHASES` to exclude both (the script
  never advances the persisted phase past `verdict` — cleanup and render are idempotent to redo from
  there). New tests in both `stage-regress-core.test.mjs` (the narrowed set; `validateProgress` rejects
  both phases).
- **M10** (GATE 1 Q3's pnpm/yarn/bun UNMEASURED labels never reached `stage-exit.md`) — **FIXED**: added
  an install-command table to the contract, citing `stage-regress-core.mjs`'s own header rather than
  re-deriving it.
- **M11** (the style probe writes into the live repo's `pharn/features/`, and a killed run leaves an
  untracked directory) — **FIXED** to the extent code can: the probe must use a real
  `pharn/features/*/REGRESSION.md` path for the ignore-glob it exercises to mean anything (unlike
  `render-run-report.test.mjs`'s own standalone-fixture-repo tests, which test something else), so a hard
  kill mid-test can never be fully prevented by any try/finally. Added defensive pre-cleanup of a stale
  leftover at test start, plus a `t.after()` cleanup as a second path that does not depend on reaching the
  existing `finally` block.
- **M12** (the loop-mapping closure's "discriminates" control re-implemented the predicate on a literal
  instead of running the real one) — **FIXED**: extracted `mappingNamesCode`/`loopMapping` and made both
  the positive and the discriminator test call the SAME function, so a bug in the real predicate cannot
  hide behind a separately-hand-rolled check.

### Re-verification after the fixes

`node pharn/floor/validate.mjs .` → GREEN (36 capabilities). `npm run check` → exit 0 (see `REGRESSION.md`
/ `VERIFY.md` for the GATE-2 re-run notes and the live test count). `/pharn-dev-regress` and
`/pharn-dev-verify` were each re-run in full over the fixed tree.

**N4 (recorded at the re-review, 2026-09-26; the paragraph above is left as written).** At `6feee30` the
last sentence above was not yet true for `/pharn-dev-verify`: the fix round handed off before running it,
as the orchestrator itself reported. The verify re-run happened afterwards, in the opus review agent's
worktree (VERIFY.md, "Re-run after GATE 2 fix (6feee30)"), which is what makes the sentence true after the
fact. It is kept rather than rewritten, because the history is the record.

## GATE 2 round 2 — the last review fixes (2026-09-26)

- **Who and how.** The **reviewer** made these fixes, in its own worktree, at the orchestrator's GATE-2
  direction: round 2 was decided FIX-then-SHIP by the orchestrator under the maintainer's delegation, a
  MODEL decision and not a human one.
- **Model.** opus, set by the maintainer's instruction and overriding `pharn.config.json`'s sonnet for
  build. Model routed via Agent subagent; effort not routed.
- **Anchor.** A fresh reconcile epoch was anchored after the PLAN's setter, before the first edit
  (`--by stage-regress-script-gate2-round2`).
- **Method.** Each item below was first reproduced on the unchanged code, and each new test was then
  proven to turn red under its named mutant, reverted afterwards.

### Dispositions

- **A3 (kill during `git worktree add`) — CODE FIX, chosen over narrowing.**
  - `stage-regress.mjs` gains `clearBaseWorktree()`: `git worktree remove --force --force`, then `rm -rf`
    the path, then `git worktree prune`. It is run by the fresh start and by the "worktree" phase before
    every `add`.
  - Measured first: a real hard kill mid-checkout leaves the worktree LOCKED "initializing" by git
    itself. A single `--force` refuses it, and a plain re-`add` fails.
  - New test: a smudge filter slows the checkout, the whole process group is SIGKILLed mid-`add`, and
    `--resume` must reach `done` (mutant: drop the call in the "worktree" phase → `git-failed`).
- **A3 (the budget clock) — CODE FIX.**
  - `invocationStart` is now taken first in `runFresh`/`runResume` and passed to `makeBudget`, so the
    opening fast work is charged. The old clock started after head init, so PLAN.md:134's bound did not
    hold.
  - New test: a PATH shim makes only `git status --porcelain` sleep 3 s; under a 2 s window the fresh
    invocation must `continue` at "drain-head"; control: a 60 s window runs to `done` (mutant: restore
    the old clock → red).
  - The remaining uncounted work (node startup, the post-slow-step fast work) is stated in `stage-exit.md`
    and `pharn-regress.md`.
- **N7 (new at round 2) — CODE FIX, same helper.**
  - GRILL G4's render promises "the next fresh start removes the leftover worktree". For a LOCKED leftover
    — G4's own scenario — that next start failed `git-failed` (measured): its single `--force` failed, then
    its `rm -rf` left a locked registration that `prune` does not clear.
  - The G4 test now runs that next fresh start and requires `done`. Either call site alone clears it, so
    the red-turning edit is dropping both (measured with each mutant).
- **N2 (cleanup/render re-run) — CODE FIX.** "cleanup" now reports success when its `worktree remove`
  fails AND no directory is left, pruning the stale registration.
  - A deliberately locked worktree (present) is still reported, and never force-unlocked at the end of a
    run.
  - New test: a render crash into a read-only feature directory, then `--resume` must render no cleanup
    failure (mutant: the old condition → red). It is skipped under root, where the permission cannot bite.
- **N1 — DOC FIX** (`stage-exit.md` `unusable` bullet, `pharn-regress.md` `2` bullet). A `usage-error`
  from any flag but `--feature` removes the stale report but not an earlier run's scratch or progress
  record. An out-of-flow `--resume` revives that run, and the command now restricts `--resume` to `5` or a
  Bash-tool timeout.
- **N3 — DOC FIX** (`stage-exit.md`, `pharn-regress.md`). A question's `resume.argv` is the original argv
  MINUS the flags that question replaces (`--tests` for `tests-unresolved`).
  - Probed: an explicit `--gates` never reaches `no-gates` (an empty token → `child-refused`).
- **M3 — DOC FIX.** The rebuilt-`## Files` blind spot now sits beside the `scope-escaped` remedy in both
  the command and the contract, and no longer only in the `check-regress.mjs` comment.
- **M6 — DOC FIX (still deferred, reason corrected).** `REGISTRY` already holds per-stage vocabularies. The
  real cost of closing it is two more second copies, each needing a parity pin; the deferral rests on P7
  alone.
- **Command routing added:** a Bash-tool timeout now routes to one `--resume`, and the budget-clock bound
  is a named limit.
- **A test timing flake, found by this round's verify re-run and fixed.**
  - The first full `npm test` failed 1 of 3453. The failure was round 1's "A3 — a hard SIGKILL mid-run"
    test: it killed the CLI after a FIXED 800 ms and assumed the run had reached "drain-head" by then.
  - Under that loaded run (141 s wall, against 83 s earlier) it had not, so no checkpoint existed yet.
  - The test now polls until the install step has started (`install.out` exists), which is the state its
    own comment describes, with a 60 s cap.
  - This is a test-only change: the script's path before the first checkpoint is untouched this round.
    `/pharn-dev-verify` was then re-run in full on the final tree.
- **Two last prose edits to `pharn-regress.md`, then one more full verify.**
  - M3's second half, from the re-review: the `missing-artifact` remedy now names `/pharn-plan` and
    `/pharn-spec`.
  - The new Bash-timeout branch's "a kill before drain-head → `no-progress`" is narrowed. It excepts a kill
    inside "fresh" itself, before the scratch clear, where an earlier run's record survives (the N1
    residual), and it states why a Bash-tool timeout does not land there.
  - The standing verify is the attempt after these edits (VERIFY.md). Regress was not re-run for them:
    prose only, no code.
- **CHANGELOG [6.23.0]:** one sub-bullet on resume-after-kill and the clock. `SKILLS_VERSION` stays 6.23.0.
