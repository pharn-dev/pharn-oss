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
  `run-gates-completeness-crash`, `count-verifiers-flush-rule`, `regress-stale-unlink-swallow`,
  `ship-regress-exit-binding`, plus `regress-resume-budget-value` (deviation 5).
- RULE B's multi-artifact domain now sits exactly on its pinned floor of 5 (G19); the next sibling that removes a
  placeholder re-measures it.
