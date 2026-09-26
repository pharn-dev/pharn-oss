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
