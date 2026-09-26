# BUILD — stage-verify-script

- stage: build — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent subagent; effort not routed
- plan: `.dev/features/stage-verify-script/PLAN.md` (GATE 1 is the orchestrator's MODEL decision under the maintainer's 2026-09-25 delegation, recorded in the PLAN's `gate1:` line; not a human approval)
- base: `557a513` (the PLAN, GRILL and grill amendments) on `main` `1524c6f` (6.23.0)
- result: `SKILLS_VERSION` 6.23.0 → 6.24.0; `MIN_CLI` unchanged at 0.5.0

**How to read this record (G18).** Every line below reports a command that already ran in this build, with the exit
code it printed. Nothing is recorded ahead of its run. This is a narrative record, so no test can hold that rule;
the review re-executes the probes (L37).

## Step 0 — writes-scope and reconcile anchor

- `node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/stage-verify-script/PLAN.md` → exit 0, 33 paths.
- `node pharn/floor/reconcile-baseline.mjs --anchor --by pharn-dev-build` → exit 0, 2327 paths, scope 33 entries.

## Step 1 — verify, then proceed

- `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` → `4950796f…c7f`, equal to the PLAN's `spec_content_hash`.
- `## Open questions (HALT)` reads "None open" (all six resolved at GATE 1).

## GATE 1 condition 1 — the unchanged regress suite, before and after the lift (G3)

- Before the lift: `node --test pharn/floor/stage-regress.test.mjs` → exit 0; tests 44, pass 44, fail 0.
- After the lift (every mechanic imported from `stage-runtime.mjs`, the local copies deleted): the same command →
  exit 0; tests 44, pass 44, fail 0.
- `git diff --exit-code 1524c6f -- pharn/floor/stage-regress.test.mjs` → exit 0 (the suite file is byte-identical).
- `stage-runtime.test.mjs`'s closure-parity test (★ G3) passes, and its mutant — a computed import path in
  `stage-regress.mjs` — drops `stage-runtime.mjs` from the regress fixture's closure (the test asserts it).

## Files written vs PLAN `## Files`

All 33 `## Files` entries were written, and no path outside them (`git status --porcelain -uall` before this file:
32 paths, each a scope member; `node pharn/floor/check-bash-reconcile.mjs --base .` → exit 0, `CLEAN`, 32 reconciled,
0 escapes). New: `stage-verify.mjs`, `stage-verify-core.mjs`, `render-verify.mjs`, `stage-runtime.mjs`, their four
`*.test.mjs`, and this file. The two Bash-reached writes, both to scoped paths: `npm run docs:generate` → exit 0
(README's CURRENT-STATE block updated: floor checkers 86 → 90; `docs/capabilities/` rewritten byte-identical;
`docs/lessons-index.md` reported already current) and Step 2b's formatter.

## Step 2b — format the scoped paths (ADVISORY)

- The pinned `xargs` block is refused in a worktree-isolated session, so a node runner under `.pharn/pharn-dev-build/`
  ran the same three tools, with the same flags, over the same `.pharn/writes-scope.json` list (argv arrays):
  `prettier --ignore-unknown --write` over the 32 present paths → exit 0; `markdownlint-cli2 --no-globs --fix` over
  the 10 `.md` paths → exit 0 (0 issues); `eslint` over the 20 JS paths → exit 1: `no-control-regex` at
  `render-verify.mjs:60`. Fixed by a char-code loop (this floor's `isCleanToken` pattern); `npx eslint` over the
  changed JS → exit 0.
- `node --test --test-name-pattern NAMED_LIMITS .dev/floor/command-hygiene.test.mjs` first failed: the anchor "never
  `--resume`" was split across a wrapped line in `pharn-verify.md`. Reworded onto one line; the three NAMED_LIMITS
  tests → pass 3, fail 0.

## Step 3 — the floor

- `node pharn/floor/validate.mjs .` → exit 0, `FLOOR: GREEN — 36 capabilities checked`.

## The suites

- `node --test pharn/floor/stage-verify.test.mjs` → first run exit 1: 26 of 28 passed. Both failures were fixture
  defects in the test: the build's own setter refuses a glob-only `## Files` (the INCONCLUSIVE fixture now narrows the
  PLAN after the anchor), and a symlink under an absent `.pharn` needs its parent. Re-run of the two → pass 2.
- `node --test pharn/floor/stage-verify-core.test.mjs pharn/floor/render-verify.test.mjs` → pass 42, fail 0 (after
  one test-side ordering fix: `pharn/evals/…` sorts before `pharn/pharn-review/…`).
- `node --test pharn/floor/stage-runtime.test.mjs` → pass 17, fail 0.
- `node --test pharn/floor/stage-exit-core.test.mjs` → pass 29, fail 0.
- `npm test` → exit 0; tests 3546, pass 3546, fail 0.
- `npm run check` (after this file was first written) → exit 0: `format:check` clean, `lint` clean, `lint:md` 1495
  files 0 issues, `docs:check` GREEN, `check:markers` GREEN, `check:badge` GREEN (6.24.0), `check:changelog` GREEN,
  `check:contributing` GREEN, `check:reconcile` CLEAN (32 reconciled, `BUILD.md` exempted as a pipeline artifact),
  `test` 3546 pass, 0 fail.
- `node .dev/floor/check-changelog-entry.mjs --merge-base origin/main .` → exit 0, GREEN: 2 new entries against
  `1524c6f`, this PR opens `## [6.24.0] - 2026-09-26`, no merged entry or released heading changed.

## Success measure — tool calls before vs after (measured on the shipped command)

- **Before** (`1524c6f`, `pharn-verify.md` 55,683 bytes, 8 fenced bash blocks): 14 + d + G + P tool calls — 13 fixed
  (the constitution read, the setter, the PLAN read, the SPEC read, the chain check, `init`, `count-verifiers`,
  `check-verify`, the `completeness.json` read, the report Write, the re-scope, the `VERIFY.md` Write, the release),
  d ∈ {0, 1} for the eval-pair discovery, and G + P + 1 `run --next` calls.
- **After** (this build, `pharn-verify.md` 17,276 bytes by `wc -c`, 5 fenced bash blocks): 4 + k — the constitution
  read, the setter, the pinned line, one resume line per `continue`, the release.
- **Measured instance:** the ★ WIRING test runs the committed pinned line over a fixture with one discovered project
  gate (G = 1, P = 0) plus the injected `reconcile`. It reached `done` in ONE invocation (k = 0): 4 calls after,
  against 15–16 before. Wall time through `t.diagnostic`: 952 ms in the isolated suite run, 2233 ms inside the full
  `npm test` run (L24).

## Guarantee-audit probes (L37)

- **"Every field the checker printed is in the report, verbatim"** — a fixture ran the real `stage-regress.mjs` then
  `stage-verify.mjs` (setter exit 0, anchor exit 0, regress exit 0, verify exit 0). `check-loop-fresh.mjs … --iter 1`
  over the untouched outputs → exit 0 `FRESH`, E pass; after editing `verify-report.json`'s `ac_gate.note` → exit 4
  `STOP`, `report-verdict-mismatch`, E fail.
- **"While the script runs, no Write-tool write lands outside `.pharn/**`"** — the real setter over
  `pharn-verify.md --target .pharn/pharn-verify/stage.json` → exit 0, scope `[".pharn/pharn-verify/stage.json"]`; the
  real `enforce-writes-scope.cjs` → exit 2 for `pharn/features/demo/VERIFY.md`, `pharn/features/demo/verify-report.json`,
  `src/app.js` and `.dev/features/x/PLAN.md`; exit 0 for `.pharn/pharn-verify/other.json` and
  `.pharn/pharn-verify/stage.json`. Control (L40), no scope file: `VERIFY.md` and `verify-report.json` → exit 0.
- **"A report on disk means `check-verify.mjs` ran for it"** (narrowed), **"containment holds for every write"**,
  **"a resume reproduces the report over an unchanged tree"** and **"a crash is never read as a verdict"** — each is
  a named test in `stage-verify.test.mjs` (the G16 stale-output tests, ★ G2, ★ G9 with its no-walk mutant, G8 with
  its moved-tree control, and the two crash tests), all passing in the `npm test` run above.

## Deviations from the PLAN, each named

1. **Step 2b ran through a node runner**, not the pinned `xargs` block, because the isolated worktree refuses that
   shell form. The tools, flags and path list are the block's own.
2. **`render-verify.mjs` also imports `stage-exit-core.mjs`** (for `isReasonCode`, the refusal code's membership
   test the PLAN asks for), beside `quote-core.mjs`. `stage-exit-core.mjs` imports nothing.
3. **`stage-runtime.mjs` also owns `scanFlags`**, the known-flag scan both scripts carried, beyond the PLAN's listed
   set; its detail texts are regress's own, verbatim.
4. **`stage-verify-core.mjs` also exports `isVerifierCount`**, the `count-verifiers.mjs` output shape, shared by the
   script's parse and `validateProgress`.
5. **The resume-argv composition differs by stage, and is named.** `parseResumeArgv` keeps regress's 6.23.0 behaviour
   (a value-less trailing `--budget-ms` is accepted); `stage-verify.mjs` also applies `parseBudgetMs`, so verify
   refuses it, as the PLAN's Evals require. Regress is unchanged because GATE 1 kept its CLI behaviour; the follow-up
   is `regress-resume-budget-value`.
6. **G8's control** adds an AC mapping file beside the legacy SPEC instead of editing a pinned AC test: a test-first
   fixture needs `/pharn-test`'s whole lock and red-run machinery. It shows the same bound — the verdict reads live
   AC files, so a resume over a moved tree composes a different report (there, `FAIL` with `ac-evidence`).
7. **`/pharn-ship` Step 2c's comparison sentence** now points at the dev twins, since both product stage commands are
   thin callers scoped to their own scratch record.

## Open issues

- The PLAN's named follow-ups stand: `dev-verify-stage-script`, `stage-exit-runner-lapse-rerun`,
  `run-gates-completeness-crash`, `count-verifiers-flush-rule`, `ship-regress-exit-binding`, plus
  `regress-resume-budget-value` (deviation 5). `regress-stale-unlink-swallow` is CLOSED by the GATE 2 fix below.
- RULE B's multi-artifact domain now sits exactly on its pinned floor of 5 (G19); the next sibling that removes a
  placeholder re-measures it.

## After GATE 2 fix (REVIEW.md at `14fd386`: GREEN, 0 floor findings; E1 important, F1–F5 minor)

The orchestrator directed a small fix round under the maintainer's delegation. Every line reports a command that ran.

- **Step 0.** `node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline` over the reviewed tree → exit 0,
  `CLEAN` (epoch `12:42:34Z`, 0 escapes), so the re-anchor erased nothing; then the plan-scope setter → exit 0, 33
  paths, and `reconcile-baseline.mjs --anchor --by pharn-dev-build` → exit 0.
- **E1 (important) — fixed.** `NAMED_LIMITS` now pins 18 anchors, each unique to the sentence it guards, and a
  shared predicate requires each to occur EXACTLY once. The delete-the-anchor mutant therefore deletes the sentence.
  A duplicated anchor fails too. The reviewer's three repros run as controls through the same predicate: dropping
  the `2` bullet's DATA label, the verifier-deferral sentence, or the `plan-files-unparseable` remedy each turns it
  red, while the pre-fix bare anchors still all match each mutant (asserted — the gap, demonstrated).
  `node --test --test-name-pattern "NAMED_LIMITS|STAGE_SCRIPT_WIRING|RULE B|EXECUTED" .dev/floor/command-hygiene.test.mjs`
  → pass 11, fail 0.
- **F1 — fixed** (`pharn-verify.md`): the `2` bullet names this run's own progress record from the drain on (a runner
  refusal leaves it at `drain`, a crashed verdict checker at `verdict`); the Bash-timeout bullet says a resume re-runs
  from the phase the record names, and that a kill during the render re-runs the verdict as well.
- **F2 — fixed** (`stage-verify.mjs` header): the containment walk is named as the one place the script resolves
  absolute paths, and a `path-containment` detail can carry one — relayed to the caller as quoted DATA, no file
  written.
- **F3 — stated as a bound, no code change** (`pharn-verify.md`, `CLAUDE.md`, `stage-verify-core.mjs`'s rule comment,
  CHANGELOG [6.24.0]): the pair must be committed, or untracked and not git-ignored; a git-ignored pair and a declared
  path differing from the tree only in letter case get no gate — both fail open.
- **F4 — fixed** (`CLAUDE.md`): the moved-tree resume bound and the stale-report residual are stated separately; a
  resume over a moved tree still ends `done`, and `/pharn-ship`'s `done`-exit binding answers only the stale-report
  one.
- **F5 — the code fix was chosen, not the narrowing.** `removeIfPresent` (only `ENOENT` is absence) moved into
  `stage-runtime.mjs`, its one owner, and `stage-regress.mjs`'s "fresh" phase now removes through it. Every existing
  regress detail text is unchanged. `stage-verify.mjs` imports the same helper, and the ONE OWNER pin grows to 14.
  - `node --test pharn/floor/stage-regress.test.mjs` → exit 0, tests 44, pass 44, fail 0.
    `git diff --exit-code 1524c6f -- pharn/floor/stage-regress.test.mjs` → exit 0, so the suite file is still
    byte-identical.
  - New: `stage-runtime.test.mjs` "★ F5". The regress CLI runs over an unremovable earlier `regression-report.json`
    (a non-empty directory) with a bad `--timeout-ms`, from a fixture copy of its floor:
    - exit 1, no document, report still present;
    - control with nothing planted: exit 2 `usage-error`;
    - the catch-all mutant in the fixture's `stage-runtime.mjs`: exit 2 `usage-error` with the earlier report on
      disk. That is the defect, so the test is red on it.
  - Plus a `removeIfPresent` unit test. `node --test pharn/floor/stage-runtime.test.mjs` → pass 19, fail 0.
  - `stage-verify.test.mjs`'s ★ G2 mutant now restores the catch-all in the fixture's `stage-runtime.mjs`.
    `node --test pharn/floor/stage-verify.test.mjs` → exit 0, pass 28, fail 0.
  - The reviewer's own probe, re-run: an earlier report under a read-only feature directory plus a bad `--timeout-ms`.
    `stage-regress.mjs` → exit 1, stdout empty, stderr `EACCES … unlink`; before the fix it exited 2 over the report.
    `stage-verify.mjs` → the same.
  - `stage-exit.md` gains the regress failed-removal bullet ("the one difference" is the clear order again, and the
    removal rule is shared). `pharn-ship.md` step 6 and `pharn-regress.md`'s `2` bullet say it too, and so do
    CHANGELOG [6.24.0] and `CLAUDE.md`.
- **The floor after GATE 2 fix.** `node pharn/floor/validate.mjs .` → exit 0, `FLOOR: GREEN — 36 capabilities checked`.
- **The command's size after the fix.** `wc -c .claude/commands/pharn-verify.md` → 17,986 bytes, under the 20,000
  target. It is still 5 fenced bash blocks and 4 + k calls.

## GATE 2 — the merge of 3.1 (`ship-quick-mode`, `eec6535`) and the renumber to 6.26.0

The orchestrator, under the maintainer's delegation, directed this merge; `PLAN.md`, "Amended at GATE 2 (merge of
3.1)", records the decisions. The lines above this section are history and keep 6.24.0. Every line below reports a
command that ran.

- **The merge.** `git merge --no-ff --no-commit ship-quick-mode` → exit 1 with four conflicts (`CHANGELOG.md`,
  `SKILLS_VERSION`, `README.md`, `.claude/commands/pharn-verify.md`), resolved by hand under the plan scope
  (`set-writes-scope.cjs --from-plan`, exit 0, 33 paths). The CHANGELOG was checked by a read-only script: the file
  minus the new `[6.26.0]` section equals `git show ship-quick-mode:CHANGELOG.md` byte for byte, and that section
  differs from `c9cd073`'s `[6.24.0]` in exactly four lines (the heading, the `SKILLS_VERSION` line, the byte count,
  the "behaviour changes in" line).
- **Renumbered by diff.** A read-only scan of `git diff ship-quick-mode`'s added lines found 83 naming 6.24; 58
  product, floor, test and meta lines were renumbered to 6.26.0. What was kept is listed in `PLAN.md`'s amendment.
  A re-scan afterwards leaves one outside the audit trail: main's own posture sentence in `pharn-verify.md`'s Final
  step.
- **`npm run docs:generate`** → exit 0 (floor checkers 91; `docs/capabilities/` unchanged).
- **Re-pin.** `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` → `d831d30d…` on the merged tree and `4950796f…`
  on `c9cd073`'s copy; the PLAN header now carries `d831d30d…`, edited under `/pharn-dev-plan`'s scope.
  `node pharn/floor/check-plan-lessons.mjs .dev/features/stage-verify-script/PLAN.md .dev/memory-bank/lessons-learned.md`
  → exit 0, GREEN, 34 ids.
- **The floor on the merged tree.** `node pharn/floor/validate.mjs .` → exit 0, `FLOOR: GREEN — 36 capabilities
checked`.
- **The suite on the merged tree, before the merge commit.** `npm test` → exit 0, tests 3759, pass 3759, fail 0.
- **Style over every file edited in the merge.** `npx prettier --check`, `npx markdownlint-cli2 --no-globs` and
  `npx eslint` over the explicit list → exit 0 each.
- **The command's size after the merge.** `wc -c .claude/commands/pharn-verify.md` → 18,418 bytes, under the
  20,000 target.
- That merge was committed as `c989084` (parents `c9cd073` and `eec6535`). The orchestrator then paused the round
  before any verify, because `main` was about to move again.

## GATE 2 — the final merge of `main` (`2e5c2e3`: 6.25.0, #280, on `b9b6a03`: 6.24.1, #279)

The orchestrator directed this merge under the maintainer's delegation once #280 had squash-merged; the branch held
3.1 only as of `eec6535`. At its instruction, the previous round's uncommitted stage records, which described the
pre-merge tree, were discarded first with `git checkout --`. Every line below reports a command that ran.

- **The merge.** `git fetch origin` → exit 0; `git merge --no-ff --no-commit origin/main` → exit 1, eleven conflicts.
  The merge base is `ec06f7b`, because the squash commit does not descend from `eec6535`. Resolved as directed:
  - six `.dev/features/ship-quick-mode/` records (add/add) and `pharn/floor/render-cost-ledger.mjs`: this branch
    never changed them since `eec6535` (`git diff --stat eec6535 c989084` over them → empty), so main's version was
    taken whole (`git checkout --theirs`);
  - `.claude/commands/pharn-verify.md`: main's copy equals `eec6535`'s (`git diff --stat eec6535 origin/main` →
    empty), and this branch's copy already carries that wording, so this branch's version was kept whole
    (`git checkout --ours`);
  - `CHANGELOG.md`: main's sections kept byte for byte, including `[6.25.0]` and the new `[6.24.1]`, with this
    branch's `[6.26.0]` above them;
  - `SKILLS_VERSION` and the README badge read 6.26.0; `npm run docs:generate` → exit 0 (floor checkers 92).
- **Checked by a read-only script.** The CHANGELOG minus `[6.26.0]` equals `git show origin/main:CHANGELOG.md` byte
  for byte, and `[6.26.0]` equals `c989084`'s. The merged tree differs from `origin/main` in exactly this branch's 40
  files. For the 36 that main left alone since `eec6535`, the changed lines against main equal this branch's changed
  lines against `eec6535`. The auto-merged `pharn-ship.md` and `CLAUDE.md` carry the same changed lines as before the
  merge (77 and 52), and the README differs from main only in the badge and the checker count.
- **The pin holds.** `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` → `d831d30d…`, equal to the PLAN header;
  `check-plan-lessons.mjs` → exit 0, GREEN, 34 ids. No re-pin and no renumber: main is at 6.25.0, and this branch
  stays 6.26.0.
- **The floor.** `node pharn/floor/validate.mjs .` → exit 0, `FLOOR: GREEN — 36 capabilities checked`.
- **The suite before the merge commit.** `npm test` → exit 0, tests 3782, pass 3782, fail 0.
- The merge is committed before the after-merge regress and verify; `VERIFY.md` records the re-opened epoch.
