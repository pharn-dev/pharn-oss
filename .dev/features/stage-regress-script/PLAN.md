# PLAN — stage-regress-script: `/pharn-regress` as one tested stage script + a shared stage-exit contract

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L5, L7, L17, L19, L21, L22, L23, L29, L30, L34, L35, L36, L37, L41, L43, L44, L45, L54, L58, L60, L62]
- increment: move every deterministic step of `/pharn-regress` into one tested script, `pharn/floor/stage-regress.mjs`, which also renders `REGRESSION.md` from the JSON by code and solves the 600 s Bash cap with a budget-and-resume protocol; add the shared stage-exit contract (`pharn/pharn-contracts/stage-exit.md`), whose structured question is how a stage asks instead of guessing; make `.claude/commands/pharn-regress.md` a thin caller of the script.
- layer(s): `pharn/floor/` (product floor), `pharn-contracts` (L-1, schemas only), the product command surface (`.claude/commands/pharn-*.md`)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- roadmap: Phase 1.1 of the token-reduction roadmap (maintainer-approved 2026-09-25)
- base: `main` at `767bf61` (SKILLS_VERSION 6.22.0). This increment bumps to **6.23.0** (minor: new checkers, a new contract, a rewritten product command). The sibling phase `writes-scope-run-only` also bumps; whichever merges second renumbers.
- model routing: model routed via Agent subagent; effort not routed (plan stage ran on opus per `pharn.config.json`).
- gate1: APPROVED WITH AMENDMENTS (A1, A2) on 2026-09-25. This is a MODEL decision by the orchestrator under the maintainer's 2026-09-25 delegation, NOT a human approval. Q1–Q4 were answered and are recorded under "Open questions (HALT)".

## Applied lessons

- **L5** — the partition's inputs (changed set, declared set, test universe, eval pairs) are captured by tested code from NUL-delimited git output and handed to `check-regress.mjs scope` as argv elements. No list passes through a shell, and none is assembled by the model.
- **L7** — `pharn-regress.md`'s `writes:` becomes `[".pharn/pharn-regress/stage.json"]`, the stage's own scratch record. It no longer names the two artifacts, which the command never writes through the Write tool (the script writes them, L19 below). The entry lies inside the always-writable `.pharn/**`, so the scope it yields allows no Write-tool write outside `.pharn/**` (amendment A1, measured below).
- **L17** — the script always passes `--feature <name>` to `scope`, so this feature's own pipeline artifacts stay escape-exempt, and are reported in `escape_exempt` as today.
- **L19** — the script writes `regression-report.json` and `REGRESSION.md` itself through `fs`, reached through Bash and outside fix #7. This is declared here and in the command. Both names are already `pipeline_artifacts` in `reconcile-ignore.json`, and any other path the script touched would surface at `/pharn-verify`'s `reconcile` gate.
- **L21** — every git list is read with `-z` and untracked files are listed per file (`git ls-files --others`, never `git status`). A path that `check-regress.mjs`'s comma/newline list grammar cannot represent is refused as `unrepresentable-path`, never mangled.
- **L22** — the command pins exactly two literal lines (the fresh invocation and the `--resume` line). No shell technique is described in prose.
- **L23** — `REGRESSION.md` is now machine-rendered and quotes untrusted text (paths, a checker's RED message), so `pharn/features/*/REGRESSION.md` joins `.prettierignore` and `.markdownlint-cli2.jsonc`, following the RUN-REPORT.md precedent.
- **L29** — the question vocabulary is ONE registry in `stage-exit-core.mjs`, and each rule iterates it: fixed text, option list, the loop's row mapping (a closure test over `pharn-loop.md`), and the validator.
- **L30** — the thin command asks the model to run no gate. Every gate, install and checker call the stage needs is made by the script, and the model only relays outcomes.
- **L34** — every new wiring set pins its member count. The stage-exit validator refuses an empty `options` array on a question, and `render-regression.mjs` renders an explicit "no gates ran" line, never an empty section.
- **L35** — one owner per fact. The regress stamp locations move into `stage-regress-core.mjs`, and `loop-fresh-core.mjs` imports them instead of keeping a second literal copy. `spawnGate` is exported from `run-gates.mjs` for the install step rather than copied. Quoting reuses `fenceFor` (`loop-record-core.mjs`), and `dataText`/`quoteData` MOVE out of `render-run-report.mjs` into `quote-core.mjs`, which both renderers import (GRILL G6), so the total-quoting rule keeps one owner. The allowlist prose copy in the command is kept, with its existing parity test.
- **L36** — the stage-exit object is closed in both directions (every key a member, every member's shape checked). A test collects every `reason_code` literal the script emits and requires each to be a registry member.
- **L37** — the script delegates to `run-gates.mjs`, `check-regress.mjs` and `check-plan-spec-agree.mjs` as CLIs and re-derives none of their rules. The new rules (test-file set, style-config set, install lockfile table, base resolution) move FROM command prose INTO one pure module. The A1 scope claim was PROBED rather than read off the hook: the setter and `enforce-writes-scope.cjs` were run over members expected to be denied (the exit codes are recorded in A1).
- **L41** — `--timeout-ms` is required and has no default. `--budget-ms` has no default either (absent = unbounded), and a test exercises that absent path. The pinned command values are exercised by the ★ WIRING test, which executes the committed line.
- **L43** — the stage output certifies agreement with its stamps, never provenance. The command's "What you may claim" section and the contract state this, and a self-consistent forged report still passes `check-loop-fresh` E as before.
- **L44** — the two pinned lines carry no shell state. `--resume` reads everything it needs from the progress record on disk.
- **L45** — a ★ WIRING test extracts the command's committed pinned line and EXECUTES it in a fixture repo. It replaces `run-gates.test.mjs`'s ★ test, whose pinned lines move from the command into code.
- **L54** — containment of `.pharn/pharn-regress/` and of the feature directory is proven with `lstat` walks, where an `lstat` ENOENT is the only proof of absence. A dangling-link case is in the tests.
- **L58** — the progress record is bound to a live tree, so the phase order keeps partition, head `init` and the first head gate inside ONE invocation (the first slow step always runs). The record therefore never describes a tree the head evidence did not see. Later edits are caught by `run-gates.mjs`'s between-gates rule, and in the loop by `check-loop-fresh` G.
- **L60** — each ★ test names the edit that must turn it red and runs it: the budget test (a step started past the window), the wiring test (an unsubstituted or dropped pinned flag), the closure test (a variant `reason_code` spelling), and anchors asserted found before slicing.
- **L62** — every child `reason`/`detail` quoted into a stage-exit `detail` or into `REGRESSION.md` goes through `dataText` (total). A `{"toString":1}` case is tested, with a control asserting that `String()` really throws on it.

## Why (P7 — the measured trigger)

A user's project kept `cost.json` ledgers from its `/pharn-ship` runs. They show:

- pharn's own stages took about 48% of relative cost on large features and about 81% on three small fixes;
- `/pharn-regress` alone took about 63% of the small fixes.

The weights were input 1, cache write 1.25/2, cache read 0.1, output 5. The data comes from an older installed version, with lower-bound coverage.

Cost is roughly turns times context. Today's `/pharn-regress` prescribes one Bash call per gate per side, plus about 20 setup and bookkeeping calls, and each call is a full model turn that re-reads a 36 KB command prompt. The same class of cost appears in `.dev/measurements/token-cost-2026-08-18.md`, where `pharn-dev-regress` reads cache at 168.8:1 against what it writes, a ratio only `pharn-dev-memory-promote` (192.1:1) exceeds; the other stages sit between 17.2:1 and 71.4:1.

## Design

### The script — `pharn/floor/stage-regress.mjs` (CLI, execution) + `pharn/floor/stage-regress-core.mjs` (pure)

```text
node pharn/floor/stage-regress.mjs --feature <name> --timeout-ms <N> [--budget-ms <B>] [--base <ref>]
     [--gates "<cmd>[::<id>],…"] [--install "<cmd>" | --no-install] [--tests "<pathspec>,…" | --no-tests]
node pharn/floor/stage-regress.mjs --resume [--budget-ms <B>]
```

**Exit codes (the stage-exit table, owned by `stage-exit-core.mjs`):**

| code                  | status     | what exists afterwards                                                                                                                                                          |
| --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0                     | `done`     | `regression-report.json` (the verdict checker's stdout, byte for byte) and `REGRESSION.md`; the verdict lives in the report, never in the exit code                             |
| 2                     | `unusable` | nothing new. Once argv validation and containment have passed, this feature's earlier outputs are already removed (GRILL G1); an argv refusal removes nothing                   |
| 3                     | `refused`  | `REGRESSION.md` naming the refusal; no report                                                                                                                                   |
| 4                     | `question` | nothing new; nothing slow has run                                                                                                                                               |
| 5                     | `continue` | the progress record; re-run with `--resume`                                                                                                                                     |
| any other, 1 included | crashed    | no guarantee of a JSON document. Node exits 1 on an uncaught throw or a failed module load, so exit 1 is deliberately never emitted (L62, and 6.21.1's crash-as-verdict lesson) |

Every deliberate exit prints exactly one `pharn-stage-exit/1` JSON object on stdout and ends by setting `process.exitCode` (the 6.20.4 flush rule).

**Phases, in order.** The progress record holds the NEXT phase. Every question is asked before the first slow step.

1. **fresh**, in this order (GRILL G1):
   1. Validate argv.
   2. Run the `lstat` containment walk over `.pharn`, `.pharn/pharn-regress` and `pharn/features/<name>`.
   3. FIRST remove THIS feature's earlier `regression-report.json` and `REGRESSION.md`, before any step that can fail. Every exit after this point leaves no earlier verdict on disk. An argv refusal happens before it, and says so.
   4. Remove a leftover registered base worktree, prune, and clear `.pharn/pharn-regress/`.

   One `/pharn-regress` run per worktree at a time, a named bound (GRILL G14): a second fresh start clears the first run's in-progress record, exactly as `run-gates.mjs init` already recreates its own `<out>`.
   - A missing feature directory is `unusable no-feature`.
   - A missing `PLAN.md` or `SPEC.md` is `refused missing-artifact`.

2. **chain**: shell `check-plan-spec-agree.mjs PLAN SPEC` and read it with `shelledVerdict`: green proceeds, red is `refused chain-red`, and crashed is `unusable child-crashed`.
3. **base**: `--base <ref>` → `git rev-parse --verify --quiet <ref>^{commit}` (argv, ref token-gated, no leading `-`). Without `--base`:
   - a non-empty `git status --porcelain` → `HEAD`;
   - else `git merge-base HEAD origin/main`;
   - else `question base-unresolved`.

   The resolved value is always 40-hex.

4. **partition**: build the four inputs to `check-regress.mjs scope`, which writes `scope.json`.
   - inside = `git diff --name-only --no-renames -z <base>` ∪ `git ls-files -z --others --exclude-standard`, minus every path under the state root.
     - `--no-renames` (GRILL G3): a rename then lists BOTH its source and its destination. With rename detection on (git's default), a build that renamed an undeclared `a.js` onto a declared `b.js` listed only `b.js`, and the escape went unseen. Today's prose has the same gap.
     - The state-root exclusion (GRILL G2) uses `worktree-fingerprint.mjs`'s `isExcluded(path, null)`, the one owner of that rule. In a project that does not git-ignore `.pharn/`, the setter's `.pharn/writes-scope.json` and this stage's own scratch would otherwise count as changed files and refuse every run as `scope-escaped`. A `.pharn/` path can never be a fix #7 escape, because the hook always allows `.pharn/**`. The same exclusion applies to BASE_RULE's `git status --porcelain` test.
   - declared = PLAN `## Files` ∪ AC-TESTS.md `## Files`, via `plan-files-core.mjs` `pathsFromPlanFiles` + `clean`, globs kept. A PLAN with no parseable `## Files` is `refused plan-files-unparseable`.
   - tests = the universe from TEST_FILE_RULE (below) or `--tests`.
   - eval pairs = tracked `**/evals/expected/*.json` whose `actualForExpected` is also tracked.

   `scope` stdout is written verbatim to `.pharn/pharn-regress/scope.json`. Its exit decides the branch:
   - exit 1 → `refused scope-escaped`;
   - exit 2 → `unusable child-refused`.

   The style rule (below) decides `--skip-style`.

5. **head-init**: `run-gates.mjs init --stage regress --side head --feature <name> --out .pharn/pharn-regress/head --scope-json .pharn/pharn-regress/scope.json`, plus `--discover package.json` (only when `package.json` exists and no `--gates` was given), `--gates` and `--skip-style` as decided.
   - exit 3 → `question no-gates`;
   - exit 2 → `unusable child-refused`;
   - `ids` and `e2e_excluded` are recorded.

   Then the TESTS check: if `test` is in `ids`, the universe is empty and `--no-tests` was not given → `question tests-unresolved`. That covers both an empty default rule and a `--tests` pathspec that matched no file (GRILL G16). A mistyped pathspec therefore asks again, and never silently runs no tests.
   Then the INSTALL decision, read at the base commit with `git ls-tree` (no worktree yet): the rule is below, and it can end in `question install-unresolved`.

6. **drain-head**: `run-gates.mjs run --next --out .pharn/pharn-regress/head --timeout-ms <N>` per slow step, until `remaining` is 0. The runner's exit 2 → `unusable child-refused`, carrying its closed `reason_code`.
7. **worktree**: `git worktree add --detach .pharn/pharn-regress/base <base>`.
8. **install** (slow): run the decided command in the base worktree through `run-gates.mjs`'s exported `spawnGate` (own process group, `--timeout-ms` kill). Logs go to `.pharn/pharn-regress/install.{out,err}`, and the exit and `timed_out` are recorded. A failed install continues, as today: its base gates go red and read `pre_existing`. `REGRESSION.md` names the failure on its first line. That line is the ONLY signal, and no machine consumer reads it: see the false-green follow-up `regress-failed-install-false-green` under Deferred.
9. **base-init**: `run-gates.mjs init --stage regress --side base --feature <name> --out .pharn/pharn-regress/base-gates --spec-from .pharn/pharn-regress/head --cwd .pharn/pharn-regress/base`.
10. **drain-base**: as step 6, with `--out .pharn/pharn-regress/base-gates`.
11. **verdict**:
    - run `check-regress.mjs verdict --base-stamp … --head-stamp … --base <40-hex> --inside <csv>`;
    - its stdout BYTES go to `pharn/features/<name>/regression-report.json`: tmp file under `.pharn/pharn-regress/`, then `rename`, so no stray tmp file lands in the feature directory;
    - exit 0/1/2 → continue to cleanup (the verdict is the report's `verdict`);
    - a crash or unparseable output → `unusable child-crashed`, and no report is written.
12. **cleanup** (GRILL G4): `git worktree remove --force .pharn/pharn-regress/base`, best-effort AFTER the report exists. A failure is recorded in the progress record and rendered, and it never voids a computed verdict: the next fresh start removes a leftover worktree anyway. Before this change the plan removed the worktree FIRST, so a locked file or a stray process could turn a finished measurement into `unusable`.
13. **render**: `render-regression.mjs` renders `REGRESSION.md` from the report JSON, `scope.json` and the progress record, including the install result and the cleanup result. The progress record is then removed and the stage exits `done`.

**The budget (`--budget-ms`) — the 600 s cap is the script's problem.** A slow step (the install, or one gate) starts only if it is the FIRST slow step of this invocation, or if `elapsed + N ≤ B`. Otherwise the script persists the progress and exits 5 `continue`.

- The first-always rule guarantees progress on every invocation, and it keeps partition → head `init` → the first head gate contiguous (L58).
- With no `--budget-ms` (a code caller, roadmap 2.1/2.2), nothing is budgeted and the script runs to completion.
- The pure decision `mayStartSlowStep({elapsedMs, timeoutMs, budgetMs, slowStepsThisInvocation})` lives in `stage-exit-core.mjs`, beside the `continue` status it drives (GRILL G5). Phase 1.2's verify runner then reuses it without importing the regress core or copying the rule. It is tested at its boundary: `elapsed + N === B` starts, and `elapsed + N === B + 1` does not.
- No clock or other test-only input reaches the CLI (GRILL G18). The end-to-end budget test uses `--budget-ms 1`: any second start would need `elapsed + N ≤ 1`, which is impossible for `N ≥ 100`, so every invocation must advance exactly one slow step. The negative controls are mutants of the pure function.
- The pinned command numbers are `--timeout-ms 540000 --budget-ms 570000`, with a Bash-tool timeout of 600000 (GATE 1 Q2: kept).
  - The per-gate limit stays 540 s, the value README.md already documents.
  - An invocation's wall time is at most max(the fast work before its first slow step + N, B), plus the two fingerprints `run --next` takes around a gate, plus the closing fast work. With the pinned numbers the unbudgeted parts must fit in the remaining 30 s of the 600 s cap (60 s, less the opening fast work, when the first slow step is the long one).
  - The fast work (git, fingerprints, verdict, render) is unbudgeted, a named bound.
- `--resume` accepts only `--budget-ms`. It reads the original argv from the progress record, so the resume line carries no state (L44).
  - With no progress record → `unusable no-progress`.
  - With a malformed one → `unusable progress-malformed`.
  - With any other flag → `unusable usage-error`.
  - A harness kill in the middle of a step leaves the record at that step. `--resume` re-runs it, and `run-gates.mjs`'s stale-lock recovery re-runs an in-progress gate. The orphaned group of a killed gate is `run-gates.mjs`'s existing named bound.

**The closed rules moved from command prose into `stage-regress-core.mjs` (one owner, pure, tested):**

- **TEST_FILE_RULE**: a path is a test file iff its basename matches `\.(test|spec)\.[cm]?[jt]sx?$`, or one of its segments is `__tests__` and it has a JS/TS extension.
  - Why this regex (GRILL G15): it is the union of vitest's and Jest's default test-file include conventions, and it also covers `node --test`'s `*.test.{js,mjs,cjs}` files, the runners behind the `npm run test` gate this stage discovers.
  - `--tests "<pathspec>,…"` replaces the rule with git pathspecs (`git ls-files -z … -- <pathspecs>`), and `--no-tests` sets the universe to empty explicitly.
  - Bound: other ecosystems (pytest, go) need `--tests`.
- **STYLE_CONFIG_RULE** (the config-touch skip): applies only to a DISCOVERED source.
  - It skips the style gates iff no `inside` path's basename is an eslint config (`eslint.config.*`, `.eslintrc*`, `.eslintignore`), a prettier config (`.prettierrc*`, `prettier.config.*`, `.prettierignore`) or a markdownlint config (`.markdownlint*`) — the three families today's prose names.
  - An explicit `--gates` string is run as written, the rule the e2e ids already follow.
  - Bound: a config outside the set (`package.json#eslintConfig`, `biome.json`, …) does not trigger the style gates at regress. `/pharn-verify`'s absolute gate still runs them at HEAD.
- **INSTALL_RULE**, read at the base commit (GATE 1 Q3: all four families included):
  - `--no-install` → none;
  - `--install "<cmd>"` → that shell command;
  - otherwise exactly one lockfile family decides the command:
    - `package-lock.json` or `npm-shrinkwrap.json` → `npm ci`;
    - `pnpm-lock.yaml` → `pnpm install --frozen-lockfile` (**unmeasured**);
    - `yarn.lock` → `yarn install --frozen-lockfile` (**unmeasured**);
    - `bun.lock` or `bun.lockb` → `bun install --frozen-lockfile` (**unmeasured**);
  - "Unmeasured" means nobody has run that command against that tool here. The label appears on each of the three lines in `stage-regress-core.mjs`'s header and in `stage-exit.md`. The npm line is the command today's prose already named.
  - no `package.json` at all → none (`no-manifest`);
  - `package.json` with no lockfile, or with two lockfile families → `question install-unresolved`.
- **BASE_RULE**: step 3 above, as a pure decision over the git results the CLI passes in.
- **REGRESS_PATHS**: `.pharn/pharn-regress/{head,base-gates,base,scope.json,stage.json}`. `loop-fresh-core.mjs`'s `DEFAULT_STAMPS.regressHead` and `regressBase` are derived from them (L35).
- **Load-graph constraint (GRILL G8):** `stage-regress-core.mjs` stays pure. It imports nothing but `gate-run-core.mjs`, which is already in `loop-fresh-core.mjs`'s graph, so importing REGRESS_PATHS adds exactly one small module to the freshness checker. Since 6.21.1, a module that cannot load there is `checker-crashed`, and every added import is one more way to reach it. A test pins the core's import list.
- **Named bounds of the partition (GRILL G13):**
  - The four lists travel to `check-regress.mjs scope` as argv elements, so an enormous tree can exceed the OS argument limit (about 1 MB on macOS). The spawn then fails with E2BIG → `unusable child-crashed`: fail-closed, never a wrong partition.
  - `check-regress.mjs`'s `parseList` de-duplicates with `Array.includes`, which is quadratic in the test-universe size.
  - Both bounds are inherited from today's prose flow, which passed the same lists through a shell. Neither is fixed here (P7: no observed failure).

### The shared contract — `pharn/pharn-contracts/stage-exit.md` + `pharn/floor/stage-exit-core.mjs`

One JSON object per exit:

```json
{
  "schema": "pharn-stage-exit/1",
  "status": "done | refused | question | continue | unusable",
  "stage": "regress",
  "feature": "<slug> | null"
}
```

Each status adds a closed key set:

- `done` adds `verdict`, `report`, `render`. `verdict` is a transient copy for the command's one-line relay (GRILL G17). The exit object is never stored, and every machine consumer reads `regression-report.json`, which the contract names as the only verdict source.
- `refused` adds `reason_code`, `render`.
- `question` adds `reason_code`, `question`, `options[]`, `resume.argv`.
- `continue` adds `phase`, `resume.argv`.
- `unusable` adds `reason_code`, `detail`.

The object is closed in both directions, and `validateStageExit(obj)` checks it.

**The question.** `question` and every option `label` are FIXED text per `reason_code`: nothing from a project file is interpolated, so the object carries no untrusted free text. An option is `{id, label, argv, value}`:

- `argv` is the flag delta to APPEND to `resume.argv` (the original fresh invocation), with `"<value>"` replaced by the answer;
- `argv: null` means stop, with no re-invocation;
- `value` is `null` or `{kind}`, with `kind` in a closed set: `git-commit`, `gates-spec`, `shell-command`, `pathspec-list`.
  - Every kind is shape-checked: control-char-free, bounded, no leading `-`.
  - `git-commit` and `pathspec-list` answers must also stay inside a closed character set with no quote and no shell metacharacter (GRILL G11).
  - `gates-spec` and `shell-command` answers are the user's own shell text, exactly as `--gates` is today.
  - The stage re-validates the answer on re-invocation.

That is the whole round trip for both callers:

- the thin command relays the question to the human and re-runs;
- a node orchestrator (roadmap 2.1 route B) validates the object, asks, and re-invokes `resume.argv` with the chosen `argv`, with no model in between.

**The closed `regress` vocabulary (the registry is keyed by stage, so Phase 1.2 adds `verify` without touching these):**

| status     | reason codes                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `question` | `base-unresolved`, `no-gates` (its fixed text names all three causes, GRILL G12: no allowlisted script, only e2e scripts, only style gates skipped by the config rule), `install-unresolved`, `tests-unresolved` |
| `refused`  | `missing-artifact`, `chain-red`, `plan-files-unparseable`, `scope-escaped`                                                                                                                                       |
| `unusable` | `usage-error`, `no-feature`, `path-containment`, `unrepresentable-path`, `git-failed`, `child-crashed`, `child-refused`, `no-progress`, `progress-malformed`                                                     |

**`/pharn-loop`'s mapping** (a new paragraph beside its stuck-point table; the table's rows and `blocked:` spellings are unchanged):

- `question no-gates` → S4;
- every other `question` → S10;
- `refused` and `unusable` → S9;
- a crash (an exit outside the table) → S9;
- `continue` is handled inside `/pharn-regress` (it re-runs the resume line) and never reaches the loop.

A closure test requires every `regress` question code to be named in that paragraph.

### The thin command — `.claude/commands/pharn-regress.md`

- **The writes-scope is still set, and set to the strictest scope the setter can express (amendment A1).**
  - Why a scope is needed at all: the sibling phase `writes-scope-run-only` (roadmap 0.2, at GATE 1) makes "no scope and no open run" PERMISSIVE in an INSTALLED project. It denies only `pharn/**` outside `pharn/features/**`, `.claude/**` and `pharn.config.json`. A product command that sets no scope would lose its fix #7 protection when run on its own, which is why `/pharn-review` needed a run marker.
  - What the setter can express, measured this run: `writes: []` makes `set-writes-scope.cjs --from-frontmatter` exit 1 ("no concrete `writes:` paths"), and it writes nothing. It refuses an empty scope by design, so `{"scope": []}` cannot be produced by a pinned line. That rules out the empty-list idea.
  - The chosen minimum: `writes: [".pharn/pharn-regress/stage.json"]`, set by the pinned Step 0 line below. That concrete entry lies inside the hook's always-writable `.pharn/**`, so the effective allow set is `.pharn/**` alone, the same as `{"scope": []}` would give.
  - Probed this run (a scratch probe command, then `--clear`): with that scope, `enforce-writes-scope.cjs` exited 2 for Writes to `pharn/features/x/REGRESSION.md`, `pharn/features/x/regression-report.json`, `src/app.js` and `.dev/features/x/PLAN.md`, and exited 0 for `.pharn/pharn-regress/other.json`.
  - A set scope is authoritative in every posture of the 0.2 design, so the scope holds in an install, in this dev repo, and unsignalled. The script's own `fs` writes are Bash and are unaffected (L19).
- Step 0 sets that scope, first:

  ```bash
  node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-regress.md --target .pharn/pharn-regress/stage.json
  ```

  The `--target` is inert for a concrete entry, but RULE A requires one on every `--from-frontmatter` line, and the ★ EXECUTED test then requires the resolved scope to equal it, which it does.

- The Final step releases it with the byte-identical `node .claude/hooks/set-writes-scope.cjs --clear`. The "Before ending your turn, run the release step" pointer sits above the last turn-end, so `writes-scope-release.test.cjs` and the release-reachability rule stay satisfied. Their enumerations are derived from the corpus, so neither test file needs an edit.
- **Reconciliation with 0.2, stated:** 0.2 rewords every product command's Final-step phrasing. Whichever phase merges second reconciles `pharn-regress.md`'s Final step with the other's wording.
- Step 0 also resolves `<name>`; an ambiguous one is asked, as today.
- Step 1 is the single pinned line (Bash timeout 600000). The invoker's `--base`, `--gates`, `--install`, `--no-install`, `--tests` and `--no-tests` are appended as given:

  ```bash
  node pharn/floor/stage-regress.mjs --feature <name> --timeout-ms 540000 --budget-ms 570000
  ```

- Step 2 branches on the exit code only:
  - 0 → report the `verdict` and point at `REGRESSION.md`;
  - 3 → present the refusal and its remedy;
  - 4 → relay the question verbatim, then re-run the fresh line with the chosen option's `argv` appended. Each appended value is single-quoted, with an embedded `'` written as `'\''` (GRILL G11), so a human's answer is never re-parsed by the shell. That rule is command prose, so it is advisory; a code caller passes an argv array and needs no quoting;
  - 5 → run the pinned resume line;
  - anything else → stop, unusable or crashed.

  The resume line:

  ```bash
  node pharn/floor/stage-regress.mjs --resume --budget-ms 570000
  ```

- The command keeps, condensed:
  - "What `/pharn-regress` adds over the build gate";
  - "What you may claim" (the guarantee split and the honest residual — unchanged in substance);
  - the trust audit and the determinism audit;
  - the gate-discovery allowlist enumeration and the e2e clause (the prose copies `gate-run-core.test.mjs` pins);
  - the named limits.
- Target size: under 12 KB, against today's 36 KB. It still reads `pharn/CONSTITUTION.md` (8 KB): the trust posture is unchanged here, and slimming is roadmap 4.1.

## Files

- `pharn/floor/stage-regress.mjs` — NEW. The stage CLI: argv, containment walks, git, the shelled checkers, the budget loop, atomic artifact writes, the stage-exit JSON — layer pharn/floor
- `pharn/floor/stage-regress-core.mjs` — NEW, pure, imports only `gate-run-core.mjs` (G8): REGRESS_PATHS, the phase enum, the progress-record schema and validator, TEST_FILE_RULE, STYLE_CONFIG_RULE, INSTALL_RULE (its header labels the pnpm, yarn and bun lines "unmeasured"), BASE_RULE — layer pharn/floor
- `pharn/floor/stage-exit-core.mjs` — NEW, pure: the exit table, statuses, the per-stage reason-code and question registry, builders, `validateStageExit`, and `mayStartSlowStep` (G5) — layer pharn/floor
- `pharn/floor/render-regression.mjs` — NEW, pure, no CLI: `REGRESSION.md` from the report, the scope and the progress record; imports `quoteData` and `dataText` from `quote-core.mjs`, never from `render-run-report.mjs` (G6) — layer pharn/floor
- `pharn/floor/quote-core.mjs` — NEW (G6): `dataText` and `quoteData`, MOVED byte-for-byte out of `render-run-report.mjs`; imports only `fenceFor` from `loop-record-core.mjs`, which has no imports — layer pharn/floor
- `pharn/floor/render-run-report.mjs` — EDIT (G6): imports `dataText` and `quoteData` from `quote-core.mjs` and re-exports them, so `render-run-report.test.mjs`'s existing tests keep exercising the one implementation — layer pharn/floor
- `pharn/floor/run-gates.mjs` — EDIT: export `spawnGate`, with a `null` results path meaning no `PHARN_TEST_RESULTS` variable; the header cite of the regress caller now names `stage-regress.mjs` — layer pharn/floor
- `pharn/floor/loop-fresh-core.mjs` — EDIT: `DEFAULT_STAMPS.regressHead` and `regressBase` derived from `stage-regress-core.mjs` REGRESS_PATHS; the comment cite updated — layer pharn/floor
- `pharn/floor/check-regress.mjs` — EDIT, comment only: the "(/pharn-regress Step 4b)" cite now names `stage-regress.mjs` — layer pharn/floor
- `pharn/floor/gate-run-core.mjs` — EDIT, comment only: the ALLOWLIST prose-copy cite names the thin command's section, not "Step 4a" — layer pharn/floor
- `pharn/floor/ship-outcome-core.mjs` — EDIT, comment only: the stale-report residual NARROWED for regress (the stage removes its own earlier report at a fresh start); still open for verify and for a stage that is skipped outright — layer pharn/floor
- `pharn/pharn-contracts/stage-exit.md` — NEW contract: envelope, exit table, question and answer protocol, the regress vocabulary (with the install table's "unmeasured" labels), bounds — layer pharn-contracts
- `pharn/pharn-contracts/regression-report.md` — EDIT: the writer is `stage-regress.mjs` (verbatim stdout written by code); the stale-report sentence; `REGRESSION.md` rendered by code — layer pharn-contracts
- `.claude/commands/pharn-regress.md` — REWRITE: the thin caller described above, with `writes: [".pharn/pharn-regress/stage.json"]`, the Step 0 setter line and the Final-step release (A1) — product command
- `.claude/commands/pharn-loop.md` — EDIT: the stage-exit mapping paragraph beside the stuck-point table — product command
- `.claude/commands/pharn-ship.md` — EDIT: the stale "`/pharn-regress`'s Step 4a" cite; one sentence that a regress stop leaves no report, so "missing report → STOP" holds — product command
- `SKILLS_VERSION` — 6.22.0 → 6.23.0
- `CHANGELOG.md` — a new `## [6.23.0]` section (`[Unreleased]` is empty at base) that states the weaker artifact-write claim and the unchanged `regress-failed-install-false-green` bound
- `README.md` — the shields badge to 6.23.0 and the regenerated CURRENT-STATE region (`npm run docs:generate`: contracts 14 → 15, floor checkers 81 → 86)
- `CLAUDE.md` — a "Commands" entry for `stage-regress.mjs` and the stage-exit contract; the "pinned lines are now EXECUTED by run-gates.test.mjs" cite moves to `stage-regress.test.mjs`
- `.prettierignore` — `pharn/features/*/REGRESSION.md` (L23)
- `.markdownlint-cli2.jsonc` — `pharn/features/*/REGRESSION.md` (L23)
- `pharn/floor/stage-regress.test.mjs` — NEW: end-to-end fixture repos, ★ WIRING, budget and resume, questions, refusals, containment, consumer invariants
- `pharn/floor/stage-regress-core.test.mjs` — NEW: every rule table, with members and non-members; the budget boundary
- `pharn/floor/stage-exit-core.test.mjs` — NEW: exit-table closure, validator closure in both directions, registry completeness
- `pharn/floor/render-regression.test.mjs` — NEW: the render per outcome, fencing of hostile text, the L62 case, no absolute path in any outcome (G10), the ★ REGRESSION.md enumeration (G9), and a style probe that self-skips without `node_modules`
- `pharn/floor/quote-core.test.mjs` — NEW: the L62 cases on the moved helpers, and one owner (the functions `render-run-report.mjs` exports ARE `quote-core.mjs`'s, by identity)
- `pharn/floor/run-gates.test.mjs` — EDIT: retire the ★ WIRING test whose pinned lines moved from `pharn-regress.md` into code (its successor is in `stage-regress.test.mjs`), and add a `spawnGate` export test
- `.dev/floor/command-hygiene.test.mjs` — EDIT: `pharn-regress.md` leaves GATE_RUN_WIRING (count 3 → 2); a new STAGE_SCRIPT_WIRING set pins the two stage lines, the numbers, the absence of direct runner and checker calls, and the A1 scope (the setter line executed, then the guard probed); the loop-mapping closure

### Explicitly not touched

- `.claude/commands/pharn-dev-regress.md` and the dev floor stay as they are. The dev twin is out of scope (named follow-up below).
- `pharn/ARCHITECTURE.md`, `LIMITS.md`, `THREAT-MODEL.md`, `pharn/CONSTITUTION.md`, `CODEOWNERS`, `.claude/settings*.json`, the four hook scripts and `pharn.spec-template.md` are human-only. The ARCHITECTURE §4 contract-list line goes to follow-up `architecture-contract-list-stage-exit` (GATE 1 Q1).
- `.claude/hooks/writes-scope-release.test.cjs` needs no edit: its setter and release sets are derived from the corpus, and `pharn-regress.md` stays a member of both (A1).
- `pharn/floor/render-run-report.test.mjs` needs no edit: it imports `dataText` and `quoteData` from `render-run-report.mjs`, which re-exports them (G6).
- `pharn/floor/check-loop-fresh.test.mjs` needs no edit: its FLOOR_MODULES closure is derived from imports, and it uses `DEFAULT_STAMPS` symbolically.
- `pharn/floor/gate-run-core.test.mjs` needs no edit: the thin command keeps the brace allowlist and both e2e clauses verbatim.
- RULE B's multi-artifact domain drops from 7 to 6 commands (measured), still at or above its pinned floor of 5, so that test needs no edit either.

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md`: the stamps are produced by `run-gates.mjs` exactly as before, at the same `--out` paths, and the base side still uses `--spec-from` and `--cwd`. Cited, not restated.
- `pharn/pharn-contracts/regression-report.md`: the report is still the `verdict` subcommand's stdout, verbatim. Only the writer changes, from the model to code.
- `pharn/pharn-contracts/reconciliation-record.md`: both artifacts are already `pipeline_artifacts`, `.pharn/` is git-ignored, and nothing new needs an exemption.
- `pharn/pharn-contracts/finding-shape.md`: `scope`'s escape findings are rendered with their enum-gated fields as-is and `problem` fenced as DATA.
- `pharn/pharn-contracts/stage-exit.md`: NEW, defined by this increment.

## Evals to write (P1)

No `role:`-bearing capability is added, so `validate.mjs`'s eval obligation does not arise. Every new floor module ships a `*.test.mjs`, and the ★ tests carry named negative controls (L60).

- ★ WIRING (L45): extract `pharn-regress.md`'s pinned fresh line, substitute `<name>` only, run it with `sh -c` in a fixture repo holding the floor closure. It must reach `done`, a report whose four compared fields equal a fresh `check-regress.mjs verdict` over the two stamps (check-loop-fresh E), `gate_run.<side>.stamp_sha256` equal to each stamp's hash (D), every log hash matching (J), base stamp `head` equal to the resolved base (H), and stamps at `DEFAULT_STAMPS`. Control: a mutant of the command line that drops `--timeout-ms` must fail.
- The ★ WIRING fixture runs the real `npm ci` INSTALL_RULE step on an empty lockfile. The test sets `npm_config_offline=true`, `npm_config_audit=false`, `npm_config_fund=false` and `npm_config_update_notifier=false` in the spawned environment, so the suite never touches the network (GRILL G7). The environment is a test input; the pinned command line is not changed. The build measures and records the step's duration (L24).
- A regression outside the feature (an inside change breaks an outside test) → `done` with verdict `regressions`. A base-red gate → `pre_existing`.
- Chain RED → exit 3 `chain-red`, a rendered `REGRESSION.md` and no report. Scope escape → exit 3 `scope-escaped`.
- A stale report from a previous run is gone after EVERY exit that follows argv validation: `chain-red`, `missing-artifact`, `scope-escaped` and a question (G1).
- A rename of an undeclared file onto a declared path → `scope-escaped` naming the source path (G3). A fixture that does NOT git-ignore `.pharn/` → the stage's own scratch never appears in `inside` (G2).
- A failing `git worktree remove` (a read-only directory inside the base worktree, restored in `finally`) → still `done`, with the report written and the cleanup failure rendered (G4).
- Each question: `no-gates` (including a style-only project whose style gates the config rule skipped, G12), `base-unresolved`, `install-unresolved` and `tests-unresolved` (including a `--tests` pathspec that matches nothing, G16) → exit 4. Its JSON validates, and re-invoking `resume.argv` plus an option's `argv` proceeds.
- Budget: a fixture with several gates and a tiny `--budget-ms` → exit 5 repeatedly. Every invocation advances exactly one slow step, and `--resume` reaches `done` with the same four compared fields as a no-budget run.
  - Control: a stubbed clock that permits a second step past the window must be caught.
  - `--resume` with no record → 2 `no-progress`; `--resume --gates x` → 2 `usage-error`.
- Containment: `.pharn/pharn-regress` as a live symlink and as a dangling one, and a symlinked feature directory → exit 2 `path-containment`, with nothing written through the link.
- Closure: every `reason_code` literal in `stage-regress.mjs` is a registry member. Control: an injected variant spelling fails.
- Exit table: the table holds exactly `{0, 2, 3, 4, 5}`, 1 is absent, and every deliberate emit goes through the table.
- Rules: TEST_FILE, STYLE_CONFIG, INSTALL and BASE, each over members and non-members; the budget boundary at `elapsed + N === B`.
- Render: one fixture per outcome, and a hostile path and message stay inside fences. L62: a `{"toString":1}` detail renders, and its control asserts that `String()` throws on it.
- No absolute path in any rendered outcome (G10).
- ★ ENUMERATION (L29/L31, G9): `REGRESSION.md` is named in every site that must know a code-rendered artifact: `PIPELINE_ARTIFACTS`, `reconcile-ignore.json` `pipeline_artifacts.names`, `worktree-fingerprint.mjs` `EXCLUDED_ARTIFACTS`, `/pharn-loop`'s Step-6c staging list, `.prettierignore` and `.markdownlint-cli2.jsonc`. This follows the RUN-REPORT.md precedent.
- `stage-regress-core.mjs`'s import list is exactly `gate-run-core.mjs` (G8), with a control that injects a second import.
- command-hygiene: the STAGE_SCRIPT_WIRING pins with `N < B ≤ 570000 < 600000`, no `run-gates.mjs` or `check-regress.mjs` invocation in `pharn-regress.md`, and the loop-mapping closure with a mutant control.
- ★ A1 scope, EXECUTED (L37/L45): run `pharn-regress.md`'s pinned setter line in a temp root, then pipe Writes into `enforce-writes-scope.cjs` with that root as `CLAUDE_PROJECT_DIR`. `pharn/features/demo/REGRESSION.md` and `src/x.js` must exit 2, and `.pharn/pharn-regress/x.json` must exit 0.
  - Control: the same probe with NO scope file must NOT deny `pharn/features/demo/REGRESSION.md`. That proves the deny comes from the set scope, not from a default.

## Guarantee audit (P0)

- "Regressions outside the feature that the project's suite covers are caught" → **floor**: enum-regex, the `check-regress.mjs verdict` exit-code comparison. Unchanged, and bounded by the suite.
- "The verdict rests on a current, approved plan" → **floor**: content-hash + enum, `check-plan-spec-agree.mjs`, read through `shelledVerdict` so a crash is never a RED.
- "The inside/outside partition is deterministic" → **floor**: path membership, `check-regress.mjs scope`, now over inputs captured by TESTED CODE instead of the model (narrows L5). Whether the closed test, style and install rules FIT a given project is **advisory**: a misfit asks, or runs fewer tests, and says so in `REGRESSION.md`.
- "The report is the checker's own output" → tested code writes the captured bytes, and in the loop `check-loop-fresh` D/E re-derives it (**floor** there). It is never provenance (L43).
- "`REGRESSION.md` is rendered from the JSON" → tested deterministic code. It gates nothing: **advisory** content.
- "The stage writes only its two artifacts and `.pharn/pharn-regress/**`" → **weaker than before, stated.** Before, fix #7's hook PREVENTED Write-tool writes outside the two declared artifacts. Now the script writes through `fs`, outside the hook (L19). The write targets are fixed literals plus a slug-gated name, pinned by tests. A write anywhere else is DETECTED, never prevented, by `/pharn-verify`'s `reconcile` gate.
- "While `/pharn-regress` runs, no Write-tool write lands outside `.pharn/**`" → **floor: hook** (fix #7, A1). This is STRONGER than before: the old scope permitted the two artifacts. It is probed by the ★ A1 test. The act of running the setter line is advisory command prose, exactly as for every other command.
- "The harness never kills a gate" → **conditional**, on the caller's numbers. The script guarantees only the start rule. `N < B < 600000` is pinned for the committed command by a test, and the fast work between steps is unbudgeted.
- "Nothing is guessed at a HALT point" → the script exits 4 with a closed code (**floor**: enum). Relaying the question and choosing the answer are command prose and human or loop policy (**advisory**).
- "Nothing broke" → **not a claim**. It stays struck.

## Trust audit (P2)

- **Inputs.** The `## Files` text of `PLAN.md` and `AC-TESTS.md` is untrusted. It becomes the declared glob patterns and nothing else, as today. `SPEC.md` is hashed by the shelled checker, never read. Git paths are attacker-nameable strings: they are argv elements (never shell text) and checker operands, and they appear only fenced in `REGRESSION.md`.
- **Child output.** Child stdout is parsed as JSON, and only enums and ints branch. Free text is quoted through `dataText` into `detail` or into a fence (L62).
- **No absolute path in `REGRESSION.md` (GRILL G10).** `/pharn-loop`'s Step 6c commits `REGRESSION.md`, and a child's refusal text can quote whatever path it was handed. So the script hands every child repo-relative paths, and the renderer writes only repo-relative paths. A render test asserts that no rendered outcome matches `ABS_PATH_RE`, imported from `render-cost-ledger.mjs` by the TEST only, so the product graph does not grow. That is a property of the committed output only: an `unusable` `detail` on stdout may still carry an absolute path, and it is never written to disk.
- **Executed commands.** Only the user's own suite, as today, and the install command: the lockfile table or the user's `--install`. The install runs the base commit's lifecycle scripts, as the model's `npm ci` did before. No command ever comes from PLAN or SPEC text.
- **The question object.** It carries only fixed text and the user's own argv, so no tainted field reaches a relayed question.
- **Residual.** A human or model reading `REGRESSION.md`'s quoted text is the accepted, bounded residual (`LIMITS.md §2`, `THREAT-MODEL.md §5`). Nothing gates on it.

## Determinism audit (P5)

- Every branch reads a membership test:
  - exit codes of the shelled checkers and of git;
  - the closed rule tables;
  - `mayStartSlowStep`.
- No branch reads prose, and the model classifies nothing.
- Every terminal fallback is a structured question (`base-unresolved`, `no-gates`, `install-unresolved`, `tests-unresolved`), never a guess. `/pharn-loop` maps each to a fixed row.

## Consumer compatibility — verified by reading each consumer this run

| consumer                                                                                                                                      | reads                                                                                                       | why it stays compatible                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `check-loop-fresh` A                                                                                                                          | `regression-report.json` parse                                                                              | written as the checker's stdout bytes                                                                           |
| `check-loop-fresh` C                                                                                                                          | the two stamps at `DEFAULT_STAMPS`                                                                          | same `--out` paths, now imported from one owner                                                                 |
| `check-loop-fresh` D                                                                                                                          | `gate_run.<side>.stamp_sha256`                                                                              | stamps are never touched after finalize                                                                         |
| `check-loop-fresh` J                                                                                                                          | log and results hashes                                                                                      | logs untouched; the worktree removal is outside `base-gates/`                                                   |
| `check-loop-fresh` E                                                                                                                          | re-runs `verdict` without `--inside` and compares `verdict`, `regressions`, `pre_existing`, `outside_gates` | `--inside` changes only the `inside` field                                                                      |
| `check-loop-fresh` H                                                                                                                          | base stamp `head` equals `--base`                                                                           | the loop's 40-hex `--base` resolves to itself                                                                   |
| `check-loop-fresh` G                                                                                                                          | head `final` equals verify `init`                                                                           | everything written after the head drain is in `.pharn/` or is an EXCLUDED artifact (`worktree-fingerprint.mjs`) |
| `check-loop.mjs`, `check-loop-decision.mjs`, `check-ship.mjs`, `render-ship-briefing.mjs`, `check-ship-briefing.mjs`, `render-run-report.mjs` | `.verdict` only                                                                                             | unchanged                                                                                                       |
| `/pharn-ship`                                                                                                                                 | `.verdict`; a missing report means STOP                                                                     | stronger: a stopped regress now leaves no stale report                                                          |
| `ship-outcome-core.mjs`                                                                                                                       | reports plus markers                                                                                        | unchanged logic; its residual narrows for regress                                                               |
| `/pharn-loop`                                                                                                                                 | the stage outcome                                                                                           | the mapping paragraph (above)                                                                                   |

## Success measure — turns in a `/pharn-regress` run

**Before (measured structurally on the command at `767bf61`, re-derivable by reading it).** A happy-path working-tree run prescribes 22 + 2·G tool calls for G gates after the style rule:

- 20 fixed calls: constitution read, setter, PLAN read, chain, `git status`, `git diff`, untracked list, AC-TESTS read, test list, scope, worktree add, install, head init, base init, verdict, report Write, re-scope, REGRESSION.md Write, worktree remove, clear;
- plus (G + 1) drain calls per side.

That is 12 fenced shell blocks, and 28 calls for G = 3.

**After.** 4 + k tool calls: the constitution read, the setter (A1), the pinned line, one resume call per `continue`, and the release. k = 0 when the whole suite fits the 30 s start window after the first slow step. At most k = 2G, when every slow step outlasts it. There are 4 fenced blocks. For G = 3 that is 28 calls before and 4 to 10 after. Each tool call is one model turn over a prompt about a third the size.

**Recorded-run measure (M1, outside this build).** Count the `requests[]` rows attributed to stage `pharn-regress` in `cost.json`'s `by_stage_iteration_model` view: the user's M0 ledgers (roadmap 0.3) against a run after `pharn update` to 6.23.0. The ★ WIRING fixture records the in-repo figure: one invocation with the pinned numbers.

## Deferred — named, not dropped

- `dev-regress-stage-script`: `/pharn-dev-regress` keeps its prose flow. Its gate set is `npm run check`'s chain over `.dev/features`, so sharing is not trivial.
- `stage-verify-script`: roadmap Phase 1.2, reusing `stage-exit`.
- `stage-exit-model-stages`: how a `claude -p` model stage emits the object (roadmap 2.1, route B).
- `regress-answers-config`: persisting an install or tests answer (for example in `pharn.config.json`) so `/pharn-loop` need not stop at S10. P7: until a loop user hits it.
- `regress-failed-install-false-green` (amendment A2; NOT built here). A failed base install turns every base gate red, so every head red reads `pre_existing`. The verdict JSON, which is ALL that `/pharn-ship` and `/pharn-loop` read, then says `no-regressions`: a false green on exactly the gates the install broke.
  - After this increment the only signal is the first line of `REGRESSION.md`, and no machine consumer reads that file.
  - The false green is unchanged from today, where the model-written `REGRESSION.md` was likewise the only place it could surface. This increment neither creates it nor closes it.
- `architecture-contract-list-stage-exit` (GATE 1 Q1): the `pharn/ARCHITECTURE.md` §4 line that enumerates the contracts omits `stage-exit`. The orchestrator folds it into a later human-applied patch. It is an omission in an enumeration, not a false claim, and the README's generated list is correct.
- Retiring the allowlist prose copy in the command (L35): kept, with its parity test.

## Open questions (HALT)

None open. All four were resolved at GATE 1 on 2026-09-25, by the orchestrator's MODEL decision under the maintainer's delegation (not a human approval):

- **Q1 → catch-up.** The ARCHITECTURE §4 contract list becomes follow-up `architecture-contract-list-stage-exit`, folded into a later human-applied patch. No `proposed/` patch in this increment.
- **Q2 → kept:** `--timeout-ms 540000 --budget-ms 570000`, with a Bash-tool timeout of 600000.
- **Q3 → included:** pnpm, yarn and bun, each labelled "unmeasured" in `stage-regress-core.mjs`'s header and in `stage-exit.md`.
- **Q4 → ask:** `question tests-unresolved`.
- **Amendments folded in:** A1 (the strictest expressible writes-scope, set and released) under "The thin command"; A2 (`regress-failed-install-false-green`) under "Deferred".
