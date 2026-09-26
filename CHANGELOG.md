# Changelog

All notable changes to PHARN-OSS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**There is one version number here that means anything.** The entries below are keyed to [`SKILLS_VERSION`](./SKILLS_VERSION) — the version of PHARN's **product surface**: the bytes an install receives (the `pharn/` tree, the product-floor checkers, the four trusted docs, and the `pharn-*` commands). It moves whenever those bytes change, including for prose-only corrections, and it is what the `pharn` badge at the top of the README shows. `package.json`'s `version` is **deliberately inert** (`0.0.0`) and is not a second version to read: this package is `private: true` and never published, so npm's field addresses nothing. It previously read `1.0.0` as a "foundation tag", which made a third identity to keep in sync with `SKILLS_VERSION` and the README badge while nothing stopped a well-meaning bump of it — so a `0.0.0` beside a `2.x` entry is not a contradiction, it is the point.

## [Unreleased]

<!-- Keep a Changelog groups by TYPE within a release, and markdownlint MD024 is `siblings_only`, so
     this section carries exactly ONE heading per type. A new entry joins its existing group at that
     group's top — it does not open a second `### Added`.

     Every PR adds at least one new top-level entry and edits nothing already merged — a released
     section is frozen whole: a correction is a new entry, and a revert keeps the reverted entry and adds
     one saying so. A PR that does not bump
     SKILLS_VERSION writes its entry in this section, starting with its authored date: a hyphen, a space,
     the date as YYYY-MM-DD, a colon and a space. A PR that bumps SKILLS_VERSION opens a section headed
     "## [X.Y.Z] - YYYY-MM-DD" directly above the previous version's, and MOVES every entry in this
     section into it, its own included (a date prefix may stay or go); an emptied [Unreleased] heading
     may stay or be removed.
     `npm run check:changelog` holds this file's shape; the CI step "CHANGELOG per-PR entry check" holds
     each PR's diff. Details and known costs: CONTRIBUTING.md, "CHANGELOG entries". -->

## [6.24.0] - 2026-09-26

### Added

- 2026-09-26: **`/pharn-verify` becomes a THIN CALLER of one tested stage script, `pharn/floor/stage-verify.mjs`, on
  6.23.0's shared stage-exit contract; the stage-script mechanics move into one shared owner,
  `pharn/floor/stage-runtime.mjs`.** `SKILLS_VERSION` 6.23.0 → 6.24.0. `MIN_CLI` stays 0.5.0: no installed path
  relocates and no existing frontmatter or contract shape breaks.
  ([`.dev/features/stage-verify-script/`](./.dev/features/stage-verify-script/))
  - **Why (P7, Phase 1.1's measured trigger).** A user's own `/pharn-ship` `cost.json` ledgers put PHARN's own stages
    at ~48% of relative cost on large features and ~81% on small fixes. 6.23.0 removed regress's share;
    `/pharn-verify` was the other stage whose deterministic work ran as one model turn per step: 14 + d + G + P tool
    calls (G project gates, P eval-pair gates, d the eval-pair discovery) over a 55,683-byte prompt. The thin command
    is 4 + k calls (the constitution read, the setter, the pinned line, one resume per `continue`, the release) over
    17,986 bytes.
  - **`pharn/floor/stage-verify.mjs`** (new) runs every deterministic step through eight named phases (`fresh` →
    `chain` → `pairs` → `verifiers` → `init` → `drain` → `verdict` → `render`): the `lstat` containment walk; the
    removal of THIS feature's earlier `verify-report.json`/`VERIFY.md` and the stage's scratch right after the slug
    and the walk (only `ENOENT` counts as absence — a removal that fails is a crash, never a verdict); the chain check
    (`check-plan-spec-agree.mjs`, read so a crash is never a RED); the eval pairs; the verifier count
    (`count-verifiers.mjs`); the gates through `run-gates.mjs`; the verdict (`check-verify.mjs --stamp … --ac-gate`,
    read only when its exit AGREES with its printed verdict — a crash exits 1, FAIL's own code); the report
    composition; and the atomic writes, each preceded by a containment walk, so a feature directory swapped for a
    symlink during the drain is refused instead of written through. It reuses 6.23.0's budget-and-resume protocol
    (`--budget-ms`, exit 5 `continue`, `--resume`), checkpointing the top of `drain` and `verdict`.
  - **`pharn/floor/stage-verify-core.mjs`** (new, pure; imports only `gate-run-core.mjs`) holds the closed rules:
    `VERIFY_PATHS` (the one owner of `.pharn/pharn-verify/`, from which `loop-fresh-core.mjs`'s
    `DEFAULT_STAMPS.verify` is now derived), `PHASES`/`RESUMABLE_PHASES`, the progress record
    `pharn-stage-verify-progress/1` (closed in both directions), `EVAL_PAIR_RULE`, `VERDICT_EXIT`/`classifyVerdict`,
    `checkCompleteness`, and `composeReport` (the checker's object verbatim, key order kept, then the `completeness`
    and `verifiers` blocks — a colliding checker key is refused, never overwritten).
  - **`pharn/floor/render-verify.mjs`** (new, pure) renders `VERIFY.md` from the report JSON alone: every untrusted
    value (a gate id, a PLAN-derived path, a checker's reason) inside a computed fence, closed-set values inline
    only after a membership test, and a fixed preamble naming the enum-gated / untrusted split, so a quoted
    `rule_id:`/`problem:` pair cannot turn `validate.mjs` CHECK 5 RED. `pharn/features/*/VERIFY.md` joins
    `.prettierignore` and `.markdownlint-cli2.jsonc` beside `REGRESSION.md`.
  - **`pharn/floor/stage-runtime.mjs`** (new) is the ONE owner of the mechanics both stage scripts need: the argv
    rules 6.23.0's review repaired (`--timeout-ms`'s 3-9 digits, a value-less `--budget-ms`, the by-index
    `--resume` scan), the containment walk, the stale-output removal (`removeIfPresent`: only `ENOENT` is absence),
    the atomic write, the git helpers, the budget tracker and the drain loop — each RETURNING a result or throwing,
    so every script keeps its own emit wrappers, reason codes and detail wording. `stage-regress.mjs` imports them
    and deletes its copies; the unchanged `stage-regress.test.mjs` passes 44/44 before and after the lift, and every
    existing detail text is kept. Its CLI behaviour changes in exactly one case, below under Changed: a stale-report
    removal that fails is now a crash there too.
  - **`stage-exit-core.mjs`** gains the `verify` registry key — question `no-gates` (its fixed text carries the AC
    gate's `--gates` caveat); refused `missing-artifact`, `chain-red`, `plan-files-unparseable`; unusable
    `usage-error`, `no-feature`, `path-containment`, `git-failed`, `child-crashed`, `child-refused`, `no-progress`,
    `progress-malformed` — and `pharn-contracts/stage-exit.md` documents it, verify's `unusable` timing, its
    checkpoints and clock, and names verify in the `done.verdict` residual.
  - **The weaker claim, stated plainly.** Before, fix #7's hook PREVENTED a Write-tool write outside the two verify
    artifacts. Now the script writes them through `fs`, reached via Bash (L19), and AFTER this stage's own
    `reconcile` gate — so, unlike regress, a stray write by the script is neither prevented nor detected. The
    mitigation is the small, literal write set and its tests; it is tested code, not a floor claim.
  - **The stronger claim.** While the script runs, the command's writes-scope is `.pharn/pharn-verify/stage.json`,
    which resolves to `.pharn/**` alone, so no Write-tool write may land outside `.pharn/**` — probed with the real
    setter and guard (`command-hygiene.test.mjs`'s `STAGE_SCRIPT_WIRING`, now a two-member set).

### Changed

- 2026-09-26: **`/pharn-verify`'s behaviour changes in 6.24.0, each disclosed** (`stage-verify-script`):
  - **A crashed `check-build-complete.mjs` stops the stage before any gate runs** (`unusable child-crashed`). Before,
    the runner's `aux.completeness` read node's exit 1 as "incomplete", the verdict read `INCOMPLETE`, `/pharn-ship`
    Step 2b answered it with its one bounded rebuild, and `/pharn-loop` CONTINUEd (a rebuild iteration, up to the
    cap). Now it is `/pharn-ship`'s step-7 STOP and `/pharn-loop`'s S9. `run-gates.mjs` is unchanged, so
    `/pharn-dev-verify` and any direct `check-verify.mjs` caller keep the old reading (follow-up
    `run-gates-completeness-crash`).
  - **A refusal writes no `verify-report.json`** (a RED chain, a missing artifact, an unparseable `## Files`). Before,
    the command wrote a fail-closed `INCONCLUSIVE` report on a RED chain.
  - **A runner refusal inside the stage — a lapse such as `lock-busy` included — is `unusable child-refused`**, so
    `/pharn-loop` stops at S9. Before, a fail-closed report carried the runner's `reason_code`, and
    `check-loop-fresh.mjs` B could route a lapse to one re-run (follow-up `stage-exit-runner-lapse-rerun`).
  - **An unparseable PLAN `## Files` is refused at verify** (`plan-files-unparseable`). Before, the gates ran and the
    verdict read `INCONCLUSIVE` through completeness.
  - **New `/pharn-loop` S9 stops**, the three above; `pharn-loop.md`'s new verify mapping paragraph says so.
  - **`/pharn-ship` reads the verify verdict only after `/pharn-verify` ended `done` in the same run** (step 7 and
    Step 2b's re-read). Stricter: an earlier run's report left by a pre-slug, containment or crash stop no longer
    reaches GATE 2. The regress half is the follow-up `ship-regress-exit-binding`.
  - **A stale-report removal that fails for any reason other than absence is a crash** (exit 1, no document), never a
    swallowed error — in `/pharn-verify` from the start and, since this increment's GATE 2 fix, in `/pharn-regress`
    too, through the shared `removeIfPresent`. Before, `stage-regress.mjs` swallowed every unlink error, so an
    unremovable earlier `regression-report.json` survived beside a later `unusable` (a bad `--timeout-ms` exited 2
    over it), which falsified "every stop after the slug leaves no report" in `stage-exit.md` and `/pharn-ship`
    step 6. This closes the follow-up `regress-stale-unlink-swallow`; `stage-runtime.test.mjs` runs the regress CLI
    over such a report, with a catch-all mutant.
  - **Registered verifiers are counted, and none is run**; the live verifier runner stays deferred.
  - **The eval-pair discovery is a rule, not a judgment**, so a PLAN that names no file under a capability directory
    gets no `structural:` gate for it — and the rule admits an UNTRACKED, NOT git-ignored `(expected, findings.json)`
    pair under a declared capability directory. The old text said "committed", which, read literally, gave a
    just-built capability none. Regress's own pair discovery stays tracked-only. Two bounds, both fail-open: a
    git-ignored pair gets no gate, and neither does a declared path that differs from the tree only in letter case
    (the rule compares exactly, while on a case-insensitive volume the completeness check counts that path present).
  - Also named, not built: `dev-verify-stage-script` (`/pharn-dev-verify` keeps its prose flow),
    `count-verifiers-flush-rule`, and `regress-resume-budget-value` (`stage-regress.mjs`'s `--resume` still accepts a
    value-less trailing `--budget-ms`, as in 6.23.0; `stage-verify.mjs` refuses it).

## [6.23.0] - 2026-09-26

### Added

- 2026-09-26: **`/pharn-regress` becomes a THIN CALLER of one tested stage script, `pharn/floor/stage-regress.mjs`,
  and gains a shared stage-exit contract every future stage script reuses.** `SKILLS_VERSION` 6.22.0 → 6.23.0.
  `MIN_CLI` stays 0.5.0: no installed path relocates and no existing frontmatter/contract shape breaks.
  ([`.dev/features/stage-regress-script/`](./.dev/features/stage-regress-script/))
  - **Why (P7, a measured trigger, not a hypothetical).** A user's own `/pharn-ship` `cost.json` ledgers
    showed PHARN's own stages taking ~48% of relative cost on large features and ~81% on three small
    fixes, with `/pharn-regress` alone ~63% of the small fixes. Today's command prescribed one Bash call
    per gate per side plus ~20 setup/bookkeeping calls, each a full model turn re-reading a 36 KB prompt.
  - **`pharn/floor/stage-regress.mjs`** (new) runs every deterministic step — argv, `lstat` containment,
    git, the shelled checkers (`check-plan-spec-agree.mjs`, `check-regress.mjs`), the base-commit install,
    and the atomic artifact writes — through 13 named phases (`fresh` → … → `render`), and solves the
    600 s Bash-tool cap with a budget-and-resume protocol: a slow step (the install, or one gate) starts
    only if it is the first of the invocation or the elapsed time plus its timeout still fits the budget;
    otherwise the script persists its progress and exits `5` (`continue`) for the pinned `--resume` line to
    pick up. `pharn/floor/stage-regress-core.mjs` (new, pure) holds the closed rules the old command's prose
    described: which paths are test files, when the style/format gates are skippable (a shared-config
    touch), which base-commit lockfile resolves the install command (npm measured; pnpm/yarn/bun labelled
    UNMEASURED), and how the base ref resolves (`--base` / a dirty tree / `origin/main`'s merge-base /ask).
  - **`pharn/pharn-contracts/stage-exit.md` + `pharn/floor/stage-exit-core.mjs`** (new): the ONE JSON
    envelope every stage script emits — `{schema, status, stage, feature}` plus a closed per-status key
    set (`done`/`refused`/`question`/`continue`/`unusable`) — and the exit-code table (`{0,2,3,4,5}`; `1`
    included is always a crash, never a verdict). A `question`'s text and every option's label are FIXED,
    registry-held strings per `(stage, reason_code)`; nothing untrusted is ever interpolated into one. The
    registry is keyed by stage so a future `stage-verify.mjs` (roadmap Phase 1.2) adds an entry rather than
    a new file.
  - **`pharn/floor/render-regression.mjs`** (new, pure) renders `REGRESSION.md` from the verdict JSON, the
    scope partition and the stage's progress — deterministic code, no longer model-typed prose. It quotes
    every checker message as fenced DATA; a gate id is quoted inline (never fenced — always preceded by
    fixed prose on the same line, so it can never sit at column 0 and be read as a heading). Every path
    the script itself supplies is repo-relative, so `/pharn-loop`'s later commit of the file can never
    carry an absolute path THAT SCRIPT SUPPLIED (GATE 2 review, M1/M2: narrowed from an earlier draft of
    this entry, which overclaimed "as fenced DATA" for the gate id and "can never carry an absolute path"
    without that qualifier — a human's own `--install`/`--gates` text still renders verbatim).
  - **`pharn/floor/quote-core.mjs`** (new): `dataText`/`quoteData` moved byte-for-byte out of
    `render-run-report.mjs`, which now re-exports them, so a second renderer can quote untrusted text
    without pulling in the cost-ledger load graph.
  - **`.claude/commands/pharn-regress.md`** (rewritten): pins one fresh line
    (`--feature <name> --timeout-ms 540000 --budget-ms 570000`) and one resume line
    (`--resume --budget-ms 570000`), and branches on the script's exit code only. Its writes-scope is set
    to the strictest one the setter can express — `.pharn/pharn-regress/stage.json`, which resolves to
    `.pharn/**` alone — so no Write-tool write may land outside it while the script runs; the script's own
    artifact writes happen through `fs`, reached via Bash and stated as such (a **weaker** claim than
    before for that one property, offset by the **stronger** always-`.pharn/**` scope guarantee).
  - **`pharn/floor/run-gates.mjs`**: exports `spawnGate` (a `null` results path means no
    `PHARN_TEST_RESULTS` variable) so the stage script's install step reuses the same
    process-group/timeout/kill discipline instead of a second implementation.
  - **`pharn/floor/loop-fresh-core.mjs`**: `DEFAULT_STAMPS.regressHead`/`regressBase` now derive from
    `stage-regress-core.mjs`'s `REGRESS_PATHS`, the one owner of the stage's scratch layout.
  - **`.claude/commands/pharn-loop.md`**: a new paragraph beside the stuck-point table maps a regress
    stage-exit object onto it (`question no-gates` → S4; every other `question` → S10; `refused`/`unusable`
    → S9; a crash → S9; `continue` stays inside `/pharn-regress`). **Disclosed here (GATE 2 review, A7):**
    two of those `question` codes are NEW unattended-loop S10 stops that did not exist before this
    increment, because the old command prose proceeded by model judgment in both cases: `install-unresolved`
    (a `package.json` with no committed lockfile — common on small projects and libraries that never run
    `npm ci` from CI) and `tests-unresolved` (a feature whose test universe is genuinely empty). A loop run
    over either project shape now stops at S10 on its first iteration where it previously completed.
  - **`.claude/commands/pharn-ship.md`**: the stale "`/pharn-regress`'s Step 4a" citation is corrected (its
    gate discovery is tested code now, not command prose). **Narrowed here (GATE 2 review, F2 — an earlier
    draft of this entry overclaimed this):** a sentence states that every `/pharn-regress` `refused` stop,
    and every `unusable` stop raised at or after the feature slug parses and the containment walk passes,
    leaves no `regression-report.json`; the residual — a stop before that point (a bad/missing `--feature`,
    or `path-containment` itself), or a genuine crash — may leave an earlier run's report in place, which is
    exactly why the existing missing-report → STOP check is a MEMBERSHIP test and not merely "no file was
    written this run".
  - **The weaker artifact-write claim, stated plainly:** before this change, fix #7's hook PREVENTED a
    Write-tool write outside the two declared regress artifacts. Now the script writes them through `fs`,
    outside that hook (an intentional, declared L19 pattern). A write anywhere else is DETECTED, never
    PREVENTED, by `/pharn-verify`'s `reconcile` gate — unchanged from how every other Bash-write stage
    script in this repo already works.
  - **The unchanged bound, carried forward rather than closed:** `regress-failed-install-false-green`. A
    failed base-commit install can turn a base gate red, so a gate that does is classified `pre_existing`
    below rather than blamed on the feature, and the verdict JSON `/pharn-ship`/`/pharn-loop` read still says
    `no-regressions` — a possible false green on exactly the gates the install broke. **Narrowed here (GATE
    2 review, A6 — an earlier draft of this entry overclaimed "every base gate" and "first line"):** the
    warning is rendered above `REGRESSION.md`'s verdict line (not literally its first line — the title and
    base still precede it), and it names the actual count of gates classified `pre_existing`, never an
    unconditional "every base gate went red". Read by no machine consumer either way. This increment
    neither creates nor closes it (amendment A2).
  - **Resuming after a kill, and the budget clock (GATE-2 review rounds 1–2).**
    - The script persists its progress at the top of every phase from `drain-head` through `verdict`, not
      only at a budget stop. So a hard kill (a Bash-tool timeout, say) leaves a checkpoint, and `--resume`
      re-runs only the interrupted phase. The command now routes a Bash-tool timeout to that one resume.
    - That includes a kill during the base worktree's `git worktree add`. git leaves the new worktree
      locked and half-populated, and the script now removes it with a double `--force` before re-adding;
      a test kills a real `add` mid-checkout and resumes it to `done`.
    - The same clearing lets the next fresh start remove a base worktree someone locked, which it
      previously failed on with `git-failed`.
    - A resumed run no longer reports a worktree-removal failure that did not happen.
    - The budget's `elapsed` now starts at the top of the invocation, so its opening fast work counts
      against `--budget-ms`. Node's startup, and the fast work after the last permitted slow step, stay
      uncounted — a named bound in `stage-exit.md`.

## [6.22.0] - 2026-09-25

### Added

- 2026-09-25: **Two new per-test results formats: `jest-json` (Jest's built-in `--json` report) and `pharn-json` (a
  framework-neutral schema PHARN owns).** Before this, `RESULTS_FORMATS` held only `vitest-json` and
  `playwright-json`, and nothing named a format for Jest, the usual React/Next.js setup. Jest's report is the shape
  vitest copies, so `vitest-json` did parse it (and still does), but without Jest's retry and `test.failing`
  markers: under `vitest-json` both read as passes. A Jest project now names `jest-json`. Refusing a Jest report
  under `vitest-json` would change existing installs' verdicts, so it is the named follow-up
  `vitest-json-refuses-jest-shape`. Built at the maintainer's direction, not after a dogfood failure.
  `SKILLS_VERSION` 6.21.2 → 6.22.0. `MIN_CLI` stays 0.5.0: no installed path moves.
  ([`.dev/features/neutral-test-results/`](./.dev/features/neutral-test-results/))
  - **`jest-json`** reads Jest's `--json --outputFile` report, the shape vitest's `json` reporter copies. It shares
    one walker and one status map with `vitest-json`. Jest adds two fields the adapter checks, fail-closed:
    - `invocations` is required, so a report without it is `results-malformed`. A pass with more than one
      invocation passed only on a retry, and is `unknown-status`, like Playwright's `flaky`.
    - `failing: true` on a pass is an expected failure (`test.failing`), and is `unknown-status`, like Playwright's
      `test.fail()`.

    The adapter was checked against reports captured from Jest 30.5.2 and 29.7.0, and no other version is claimed.
    Jest 29 writes no `failing` field, so there a `test.failing` reads as its raw status. A test over the Jest 29
    capture pins that.

  - **`pharn-json`** (schema `pharn-test-results/1`) is the route for any other runner, through a reporter the
    project writes. Its keys are closed in both directions (an extra key, including `__proto__`, and a missing key
    are both refused). `suite_errors` is required, `status` is exactly the record's own set, and `file` must be
    absolute or a clean relative POSIX path, so a `./tests/a.test.js` is refused by name instead of never matching a
    mapped path. The schema and an example are in `test-results-record.md`, "The neutral format", and a test parses
    that example.
  - **Why not JUnit XML or CTRF**, both measured this run. JUnit is not one format: `jest-junit` 17.0.0 drops a file
    that fails to load (unless its `reportTestSuiteErrors` option is set) and reports `test.todo` as a pass, and producers disagree on where the file and the test's
    own title go. It would also need an XML parser in the floor. CTRF is still pre-1.0 (`ctrf` 0.3.0, 0.0.x
    reporters).
  - **The AC-test convention now names the in-body import form per module mode** (`/pharn-test`, `ac-tests.md`,
    README). Measured: under plain Jest in its default CommonJS mode, an in-body `await import()` fails with "A
    dynamic import callback was invoked without --experimental-vm-modules" before the build AND after it. The red
    run cannot tell that from the right failure, so such a test would pass the red run and fail verify for ever, and
    `/pharn-loop` would iterate to its cap. The rule is now:
    - `require()` under CommonJS Jest (measured plain, with babel-jest + `@babel/preset-env`, and with `next/jest`
      from Next.js 16.3.6);
    - `await import()` under vitest and Jest's ESM mode, where `require` is not defined.
  - **README** gains a Jest recipe (a script that adds `--json --outputFile` only while `PHARN_TEST_RESULTS` is
    set), with its bounds: it needs a POSIX shell; Jest reads file arguments as path patterns (`--runTestsByPath`
    makes them exact); and a `jest` key in `package.json` is outside the test-infrastructure pin, so
    `jest.config.*` is the place to configure Jest.
  - New captured fixtures: `jest.json`, `jest-edge.json`, `jest29-edge.json`, `jest-red.json`, `jest-after.json`,
    `vitest-fails.json`.

### Fixed

- 2026-09-25: **A crafted results document or config crashed a checker instead of being refused.** `shown()`, which
  quotes an untrusted value into a refusal reason, called `String(v)`, and that throws on parsed JSON such as
  `{"toString":1}`. So a `pharn-json` document with such a `schema`, or a `pharn.config.json` whose `testResults`
  format is such a value (the latter since 6.15.0), threw. `check-red-run.mjs` and `check-verify.mjs` then died with
  node's exit 1, which is their RED/FAIL code, and printed no verdict. `shown()` is now total, and each crash site
  has a test. Found by this increment's independent review.
- 2026-09-25: **"One flaky test or `test.fail()` voids the record" was an overclaim at seven sites; it now says which
  reports mark the case.**
  - The sites: `test-results-core.mjs`, `ac-gate-core.mjs`, `ac-tests.md`, README (twice) and CLAUDE.md (twice).
  - Measured on vitest 5.0.1: `test.fails` and a pass on retry are both reported plain `passed`, with no marker, so
    the record reads them as passes. Jest 29's `test.failing` is the same.
  - Each case is pinned by a test over its capture (`vitest-fails.json`, `jest29-edge.json`).
  - Detecting vitest's retry (its only trace is a non-empty `failureMessages`) is left as the named follow-up
    `vitest-retry-pass-detect`, because it changes the verdict for existing vitest installs.
- 2026-09-25: **`test-results-record.md` said "Pinning the test-infra files is a named follow-up".** That pin shipped in
  6.20.0. The bullet now cites it, and names what it does not cover: a `jest` key inside `package.json`. The named
  follow-up for that gap is `test-infra-pin-package-jest-key`.
- 2026-09-25: **A bare `npm run lint:md` no longer reads Codex's gitignored `.agents/` import**
  ([`.markdownlint-cli2.jsonc`](./.markdownlint-cli2.jsonc),
  [`.dev/floor/command-hygiene.test.mjs`](./.dev/floor/command-hygiene.test.mjs),
  [`.dev/features/markdownlint-ignore-agents/`](./.dev/features/markdownlint-ignore-agents/)). Repo-meta and
  apparatus only, so `SKILLS_VERSION` does not move.
  - **The failure.** Codex's "import from Claude Code" writes `.agents/skills/*/SKILL.md`. `.gitignore` excludes
    it (`/.agents/`), so CI never has it. markdownlint-cli2 does not read `.gitignore`, and `**/*.md` descends
    into dot-directories. Each SKILL.md nests a whole command, H1 included, under the importer's own H1. So in a
    checkout holding the import, `lint:md` reported MD025 once per file and exited 1: measured 19 errors over
    19 files. Every local `/pharn-dev-verify` there went RED on `lint:md` and had to measure in a clean copy.
    This is the 6.13.1 `.claude/worktrees` problem, for a second untracked directory.
  - **Fix.** `".agents"` joins `ignores`, the same shape as `.claude/worktrees`. The directory is untracked
    (`git ls-files .agents` is empty), so no repo file loses lint coverage. Measured in a worktree holding
    all 19 files: `lint:md` exit 0, 0 issues.
  - **Test.** A premise test in `command-hygiene.test.mjs` runs the installed binary in a scratch tree that holds
    this config's bytes and a nested SKILL.md with the MD025 shape. A bare run lints 1 file. With the `".agents"`
    line removed it lints 2. Under the previous config the same scratch tree linted 2 files and exited 1 on
    MD025.
  - **Not changed, and why.** `.prettierignore` gets no twin entry. Prettier 3 reads `.gitignore` by default,
    `prettier --file-info` reports these files ignored, and they are prettier-clean anyway. `/AGENTS.md` lints
    clean and `/.codex/` holds no markdown, so neither is listed.
  - **Bound.** The entry matches only at the root, and it is tied to where the importer writes today.
    markdownlint-cli2's `gitignore` option would cover the whole class. It would also exclude all of `.pharn/`,
    which the config's zone note rejects, so it was not taken. The next untracked directory an importer writes
    needs its own entry.

## [6.21.2] - 2026-09-25

### Fixed

- 2026-09-25: **Six verified leftovers from the 2026-09-24 review of `7e9ed52..b31e540`, fixed as one patch, each
  re-verified against live code first.** `SKILLS_VERSION` 6.21.1 → 6.21.2 (PATCH: corrections to shipped bytes; no
  contract shape, installed path or lock moves). `MIN_CLI` stays 0.5.0.
  ([`.dev/features/review-leftovers-0924/`](./.dev/features/review-leftovers-0924/))
  - **`render-run-report.mjs` no longer crashes on a malformed value in a report.** A `null` entry in
    `ac_gate.acs` or `ac_gate.evidence` threw a TypeError. That exited 1, outside the documented exits 0/2, and no
    `RUN-REPORT.md` was written. The same crash was measured at other sites too: `String()` throws on a parsed
    `{"toString": 1}` (in `verdict`, `failing_gates`, `outcome.iterations`, the run-window values and the token
    cells), and a `null` token row threw. A value the renderer reads from `cost.json`, `verify-report.json` or
    `regression-report.json` is now either type- or membership-checked first, or stringified by one helper,
    `dataText`. `dataText` is byte-identical to `String()` for every JSON primitive, `Infinity` included, and prints
    JSON text for an object or array. An entry that is not an object renders as a marker row, never dropped. A value
    nested too deep to stringify renders a fixed marker. The width loop no longer spreads one argument per row, which
    threw near 200,000 rows. A suite test walks every node of a fixture that populates every section, and replaces
    each with `null`, with `{"toString": 1}` and with a newline-bearing string. Each mutant must render and must add
    no heading. A field no fixture carries is not mutated, and the module header says so.
  - **A report's `verdict` is inline only when it is an enum member.** Any other value renders `unknown`, with the
    value quoted as DATA. Before, a verdict string carrying a newline rendered as a duplicate `## Briefing` or a
    forged `# RUN REPORT` title (found by the grill, probed).
  - **`base_sha` reaches `git` only as a commit id** (7 to 64 hex digits, either case: full, abbreviated or
    uppercase). Before, any string went into `git diff --name-only <base>` as an argument, and `--output=<file>` made
    git write that file (probed). A newline in it also went into an inline span. Found while checking the header's own
    inline-span claim. **Narrowed, stated:** a symbolic ref (`HEAD`, a branch name) used to produce a diff and now
    renders "not a commit id". `/pharn-loop` and `/pharn-ship` record `git rev-parse HEAD` or `unknown`, so neither
    is affected.
  - **`pharn/pharn-contracts/ac-tests.md` stops claiming more than the test-infrastructure pin does.** "A pinned test
    cannot pass because its runner changed" contradicted the same section's "does NOT catch" list and `LIMITS.md`.
    Now the contract says a change to one of the PINNED parts is a `--check` RED (the test-stage gate's `lock-red`)
    and reads `test-infra-changed` at the AC gate. It also says the pin is not the whole runner.
  - **The full-mode `check-ac-tests.mjs` table no longer says `legacy-spec` exits 3.** Every full-mode kind exits 1.
    Exit 3 is `--spec` mode's. Its `KINDS` comment is corrected the same way.
  - **`/pharn-ship`'s §6 note no longer says §6 "does not list `test` yet".** It has listed `test` since 6.20.2.
  - **`gate-run-core.mjs` cites by name, not by line number.** All fifteen of its line cites had drifted but one,
    `pharn-ship.md:315-321` among them. They now name the step, block or const they mean. The consumer list that
    backed "additive" is dated to 6.8.0, and names `check-loop-fresh.mjs`. `check-plan-spec-agree.mjs` had one more
    stale cite, fixed the same way.
  - **Apparatus, no bump: lesson L60 promoted** to `.dev/memory-bank/lessons-learned.md` through the gated
    `/pharn-dev-memory-promote`, human-approved: a non-vacuity proof is per asserted PROPERTY, not per loop. It comes
    from this increment's own review, which found two new ★ tests that still passed with their defect put back. Both
    are fixed, and each fix was measured to fail on its drift. `docs/lessons-index.md` is regenerated.

### Changed

- 2026-09-25: **`check-spec.mjs` reports a SPEC body that opens with a `spec_kind:` line under its own RED kind,
  `kind-in-body`.** From 6.20.7 it shared `pin` with a hash mismatch, so `/pharn-spec`'s re-validate step told the two
  apart by the detail text. Now `pin` means only a malformed or drifted hash, and the step branches on kind membership:
  it recomputes the hash when every RED is `pin`, and returns the SPEC to Draft when any other kind appears. The new
  name shares no prefix with `pin`, so no loose match can take one for the other. Which SPECs are RED is unchanged.
  The only reader of the kind token is `/pharn-spec`, which ships in this release. A test runs the checker and
  requires the command to name the kinds it emits.

## [6.21.1] - 2026-09-25

### Fixed

- 2026-09-25: **A checker that crashed is no longer read as a verdict: not `/pharn-loop`'s freshness checker, and not a
  checker one level below the test-stage gate.** Two follow-ups 6.20.6 named (`loop-fresh-load-crash`,
  `nested-child-crash`), plus a straddle test 6.20.8's review asked for. Each was reproduced before the fix, and each
  reproduction is now a suite test. `SKILLS_VERSION` 6.21.0 → 6.21.1 (PATCH: corrections to shipped checkers' crash
  routing; no contract, finding or frontmatter shape changes). `MIN_CLI` stays 0.5.0: no installed path moves, and the
  installer copies `pharn/floor/` whole minus tests, so both new modules reach every install. The build was planned,
  grilled by an inline pass and an independent read-only agent, and built in one `/pharn-dev-ship` increment.
  ([`.dev/features/crash-routing/`](./.dev/features/crash-routing/))
  - **`check-loop-fresh.mjs` is now a CLI entry with no static import.** Before, it imported three sibling modules
    statically. A module that failed to load (a partial update, a `test-infra-core.mjs` that throws or is missing)
    ended the process with node's exit 1, which is this checker's RERUN, and an EMPTY stdout. So `/pharn-loop`'s exit-1
    branch was told to re-run a stage and given none to re-run. An uncaught throw did the same, and it is reachable
    from input alone: a `.pharn` that is a regular file makes the budget ledger's `mkdir` throw `ENOTDIR`. The checker
    moved unchanged into **`pharn/floor/loop-fresh-core.mjs`**. The entry, at the same path, so no pinned command
    line changes, loads it with `import()` and runs it. It maps a failure to load it, a throw while it runs, and a
    result outside its contract to **`INCONCLUSIVE`, `reason_code` `checker-crashed`, exit 2**. That is `/pharn-loop`
    S11, fail-closed. The contract is judged on the SERIALIZED document the entry prints, because JSON drops an
    undefined key: an exit code outside `{0, 1, 2, 4}`, a document without exactly the checker's keys, a verdict that is
    not its code's, or a RERUN naming no stage. A throw a module schedules asynchronously is caught by process-level
    handlers. Before the document is printed it becomes the crash document; after, the printed document stands and the
    exit is still 2. The crash path cannot itself throw (a thrown value with no string form, a document JSON cannot
    serialize). The document's `checks` is `null` then, the stack goes to stderr, and machine paths in `reason` are
    shortened (the working directory → `.`, the home directory → `~`, any other absolute path → `…/<basename>`)
    because the loop copies this JSON into a committed record. `checker-crashed` joins `gate-run-core.mjs`'s closed
    `REASON_CODES`, outside `LAPSE_CODES`. The core run directly exits 2 rather than 0, which a caller could read as
    FRESH. **Consequence:** `check-loop-fresh.mjs` exports nothing now; an importer of `evaluate` and its constants
    uses `loop-fresh-core.mjs` (only this repo's test did).
  - **What the entry cannot catch, stated in its header:** the entry file itself missing or unparseable (node's
    exit 1), a module that ends the process, a top-level await that never settles (exit 13), a signal, and, in the
    `reason`, a machine path outside the working and home directories that contains a space. For the first,
    `/pharn-loop`'s exit-1 branch gains one sentence: an exit 1 without ONE JSON document naming `stage_to_rerun`
    `verify` or `regress` is S11. That is command prose, so advisory. At the commit gate a `checker-crashed` is still
    `not committed: evidence stale`, with its `reason` quoted.
  - **The test-stage gate's children now read the checker THEY shell as a verdict.** `check-ac-tests.mjs` turned ANY
    non-zero exit of `check-plan-spec-agree.mjs` into a `pin` RED, and `ac-tests-lock.mjs` did the same with
    `check-spec-approved.mjs` for a bootstrap lock. A crash that happened only while reading AC-TESTS.md therefore read
    as `RED mapping-red` at `check-test-stage.mjs`, which check-loop-fresh check I routes to `ac-evidence-invalid`
    (S13: "set the build aside and re-run /pharn-test") for a fault that says nothing about the tests. The rule is now
    in one place, **`pharn/floor/shelled-verdict-core.mjs`**: a shelled checker whose contract is exit 0 or exit 1
    with a `RED —` line gave a verdict only in those two shapes, and anything else is a crash. That covers exit 1
    without the line, another code, a signal and a spawn error. With no RED of its own, the child exits 2 with
    **`UNUSABLE child-crashed — …`** as its FIRST line, and `check-test-stage.mjs` reads that as UNUSABLE (exit 2,
    S11 in the loop). Every other exit 2 keeps its RED. A child WITH a definite RED still exits 1 and names the crash
    on a line before its closing summary: a RED is a verdict whatever the crashed check would have said.
    `--write-bootstrap` no longer blames the SPEC for a crashed approval check. `check-test-stage.mjs`'s 6.20.6
    `^RED —` rule moved into the same module, its one sibling import. `ac-tests-lock.mjs`'s `checkLock` returns
    `{reds, crash}` now; its two callers are in that file, and a test runs `--record-red-run` over a RED lock.
  - **The bound, one level further, is stated rather than closed.** A crash below THOSE checkers is read by its parent
    as its own RED. `check-plan-spec-agree.mjs` reads a crashed `check-spec-approved.mjs` or `check-spec.mjs` that
    way, and `check-spec-approved.mjs` reads `check-spec.mjs` the same way. In the loop, check I runs those checkers
    over the same SPEC.md first, so only a crash that does not reproduce there still arrives as a RED. Outside the loop
    it is a refusal with the wrong remedy named. A `RED —` line lost to a darwin pipe cut or to `spawnSync`'s
    `maxBuffer` reads as a crash: no verdict, never a pass.
  - **The fingerprint-upgrade straddle is now tested for a report that FAILED on the AC gate** (6.20.8's review
    finding). Three worlds, each produced by the real `check-verify.mjs --ac-gate`: delivery only, delivery with a red
    gate, and evidence. Each is also run as an older checker could have worded its AC block. At the iteration each
    passes E and re-runs verify at F, and at the commit gate each stops `tree-moved-since-verify`, never
    `report-verdict-mismatch`. Removing E's `algo` clause (a scratch mutation, measured and recorded in the feature's
    BUILD.md) turns every world into a false forgery STOP.
  - **Docs moved with the code:** `ac-tests.md` (the `pin` row, the checker's and the bootstrap exits, the test-stage
    gate's bound), `gate-run-record.md` (`checker-crashed`), `/pharn-loop` (the INCONCLUSIVE and exit-1 lines, S9's
    quote, `reads:`), `/pharn-test`, `/pharn-plan` and `/pharn-ship` (what an exit 2 or a STOP presents), and
    `CLAUDE.md`.

## [6.21.0] - 2026-09-25

### Added

- 2026-09-25: **`/pharn-plan` now refuses a plan whose build would change the test infrastructure `/pharn-test` pins.**
  This fixes three review findings on the 6.20.0 test-infrastructure pin, each reproduced by a script and each script
  now a suite test. `SKILLS_VERSION` 6.20.8 → 6.21.0. `MIN_CLI` stays 0.5.0: no installed path moves.
  ([`.dev/features/test-infra-plan-scope/`](./.dev/features/test-infra-plan-scope/))
  - **A new `check-ac-tests.mjs` RED kind, `test-infra-in-plan`.** It fires when PLAN.md's `## Files` names a ROOT
    runner config the lock pins (`vite.config.ts`, `vitest.config.mjs`, …), read as the writes-scope setter scopes the
    entry. Before it, such a plan was GREEN, `/pharn-test` pinned the config, and the build's in-scope edit read
    `lock-red` at the test-stage gate and `test-infra-changed` at `/pharn-verify`. `/pharn-loop` then stopped at S13,
    and the prescribed remedy looped: re-running `/pharn-test` re-pinned the old config and the rebuild edited it again.
    The remedy is now named where the plan is written: put the runner change in a `spec_kind: test-infra` increment
    first, through `/pharn-ship`. The name test is `test-infra-core.mjs`'s own `isRunnerConfigName`, imported, not a
    second regex. A closure test checks that no other floor module tests the regex. A test runs six PLAN spellings
    through the real setter and write guard: the kind fires for exactly the ones that let the build write a root
    config (`vite.config.ts`, `vite.config.ts (new alias)`, `Vite.config.ts`), and not for `./vite.config.ts`,
    `*.config.ts` or `web/vite.config.ts`. That is the probed set, not every possible spelling.
  - **`package.json` and `pharn.config.json` in PLAN.md print an advisory `NOTE —` line, never a RED.** The exit code
    is unchanged. The checker can see that the plan names the file, not which part the build will change, and adding
    a dependency is an ordinary build change. The pinned script values and `testResults` formats are still compared at
    `/pharn-verify`, late. On the RED path the NOTE lines print before the closing `RED —` line, which is the line
    6.20.6's `check-test-stage.mjs` tells a verdict from a crash by. Because `check-ac-tests.mjs` now loads
    `test-infra-core.mjs` too, a load failure there surfaces as `UNUSABLE — check-ac-tests.mjs --spec exited 1`
    instead of naming `ac-tests-lock.mjs`: still exit 2, never a RED. 6.20.6's crashed-child test gains that case, and
    its lock cases now break `red-run-core.mjs`, a module only the lock child loads.
  - **Why MINOR, when `[3.0.0]` and `[4.0.0]` went MAJOR for a new check.** Those two were versioned MAJOR against the
    letter of CLAUDE.md's rule because each "can RED a previously-green run". That reading does not apply here, for
    three reasons. First, every plan the new kind catches could already never reach green: the build's edit reads
    `test-infra-changed`, an evidence red that no rebuild clears. Second, the one previously-passable case, a plan
    naming a config its build never touches, is fixed by deleting that line. Third, nothing changes shape: the lock
    stays `ac-tests-lock/3`, AC-TESTS.md's grammar and every exit code are unchanged, and nothing reads the kind name
    (`check-test-stage.mjs` maps any exit 1 that carries a `RED —` line to `mapping-red`). This is the classification
    `[6.19.0]` and `[6.20.0]` used in the same pipeline.
  - **What changes for a feature in flight.** A feature whose PLAN.md already names a root runner config is now
    `RED mapping-red` at `/pharn-build` Step 0 (the test-stage gate re-runs the mapping check). Re-plan: delete the
    line, or split the change out as above.

### Fixed

- 2026-09-25: **The pin now catches a runner config whose name differs only in case, and two shipped sentences no
  longer say a rebuild cannot reach the pin.**
  - **Config names are matched folded** (NFC + full case folding, the fold `scopeKey` and the write guard already use).
    vite and vitest find their config by an existence check of the lowercase name, so on a case-insensitive volume
    `Vitest.config.mjs` IS the runner's config. The review measured real vitest 5.0.1 loading one with
    `include: ["nomatch/**"]`: it ran no tests and exited 0. Before this fix that file was never pinned, so no
    `test-infra-changed` was reported. The listing, the lock's shape check and the new plan check share the one
    predicate. **Consequences, stated:** a `/3` lock written while such a config already sat at the root now reads
    `<path>: a runner config was added` (`lock-red`, `test-infra-changed`). That is fail-closed, and the remedy is
    re-running `/pharn-test` with the build set aside. On a case-SENSITIVE filesystem a case-variant name the runner
    does not load is pinned anyway, also fail-closed. A 6.21 lock recording such a path is `lock-unusable` to a 6.20.x
    floor.
  - **`pharn/pharn-contracts/ac-tests.md` and `/pharn-build`'s "the lock pins only the AC tests" were false since
    6.20.0.** Both now say that a rebuild passes the test-stage gate when it leaves what the lock pins alone, and they
    point to the pin section for the list. `/pharn-build` is told never to change the level gates' scripts, their
    pre/post scripts or `testResults`, even when the plan names the file. The contract also names a verify-time gate
    that rewrites a pinned runner config. The contract and `test-infra-core.mjs` now split the remedy: set the build
    aside for an accidental change, re-plan for an intended one.
  - **`/pharn-test`'s interactive no-runner question offers only `/pharn-ship`.** It used to offer `/pharn-loop` too,
    which cannot run that setup increment: `/pharn-spec --model-approve` never approves a `spec_kind: test-infra`
    SPEC, and `--require-test-first` turns its bootstrap lock into `RED mode-not-allowed`. A test pins that this
    question and the unattended `blocked:` line suggest the same single command.

## [6.20.8] - 2026-09-25

### Fixed

- 2026-09-25: **The Bash-write reconciler no longer reports a false `ESCAPE` on a symlink whose target the build was
  allowed to edit. Every symlink is now hashed by its link text, and nothing follows a link.** This fixes a verified
  review finding, reproduced before the fix and now a suite test. `SKILLS_VERSION` 6.20.7 → 6.20.8 (PATCH: a correction
  to shipped checkers; the baseline record's keys and `version` are unchanged). `MIN_CLI` stays 0.5.0.
  ([`.dev/features/reconcile-symlink-target/`](./.dev/features/reconcile-symlink-target/))
  - **The defect.** `pharn/floor/reconcile-baseline.mjs` `hashFile` opened a link to a regular file with a plain
    `openSync`, which FOLLOWS it, and recorded the TARGET's bytes under the LINK's path. `check-bash-reconcile.mjs`
    judges an explicit writes-scope against that path as text, while the live guard `enforce-writes-scope.cjs`
    `realpath`s a Write's target first. Take a tracked `CLAUDE.md -> AGENTS.md`, a PLAN `## Files` of `[AGENTS.md]`,
    and a build that edits `AGENTS.md`. The guard allows a Write to both names, yet `--require-baseline` reported
    `ESCAPE` on `CLAUDE.md`, "writes-scope (snapshot)", with a finding saying the guards "would have DENIED a write to
    it". `/pharn-verify` then failed and `/pharn-loop` stopped `STOP_TERMINAL` on a correct build.
  - **The fix.** `hashFile` opens with `O_RDONLY | O_NOFOLLOW | O_NONBLOCK` first, the repo's no-follow read idiom, so
    a regular file is hashed through one descriptor. Only when that open fails does it ask `readlinkSync`, the call
    that answers for the name itself. Every symlink is hashed as `sha256("symlink\0" + raw link text)`, whatever it
    points at: a file, a directory, a FIFO, an unreadable file, or nothing. A link's entry now changes only when the
    link changes. A write THROUGH it changes the target's own entry, judged under the target's own path, which is the
    path the guard judges. The same fix newly catches a re-point between two files with identical bytes. It also stops
    reporting a change to a file OUTSIDE the repo, reached through a tracked link, as a change to a repo path. A link to
    a FIFO, a hazard 6.17.1 recorded as not handled, is never opened.
  - **Removed:** the exported `LINK_TEXT_ERRNOS` (`["ENOENT", "ENOTDIR", "ELOOP"]`). It named which FOLLOW failures
    fell back to link text, and nothing follows a link now. Its `EACCES` exclusion ("make the target unreadable to hide
    a change") now lives on the TARGET's own entry: an unreadable target hashes as absent, so it is still a candidate.
    A test pins this.
  - **Residual, stated:** a RE-POINTED link that no recorded scope names still gets the finding's uniform "would have
    DENIED" sentence. The guards cannot see a re-point at all, because a Write writes through a link. For a link
    re-pointed to an in-scope target, that sentence therefore describes the scope match, not a decision a guard made.
    Where the platform lacks `O_NOFOLLOW` (Windows), the open still follows a link, and a link to a regular file keeps
    the pre-6.20.8 rule. `O_NOFOLLOW` governs the final path component only.
  - **Upgrading, the one-time cost (fail-closed in both stores).** A reconcile baseline anchored before 6.20.8 holds a
    link to a regular file under its TARGET's digest. The first reconcile of that epoch therefore reports the link as
    changed: a candidate, and an `ESCAPE` when no recorded scope names it. The next `/pharn-*build` anchor records the
    text. The worktree fingerprint's `ALGO` moves from `worktree-fingerprint/1+sha256` to `/2+sha256`, because 6.17.1
    changed what is hashed without a bump and this change is the second one. `ALGO` is not part of the digest, so a
    stamp written before the upgrade is refused by the `algo` comparison even where the digest is unchanged.
    `check-loop-fresh.mjs` F answers `RERUN tree-moved-since-verify`, G answers `RERUN regress-verify-tree-mismatch`,
    and `red-run-core.mjs` `bindStamp` refuses. G's and `bindStamp`'s reasons now name both algos instead of claiming
    the tree changed. The cost is one re-run for evidence in flight across the upgrade. A stamp that straddles it
    MID-stage is refused `tree-changed-between-gates` on a link-bearing tree, and otherwise by the comparisons above.
  - **Pinned:** a `PATH_KINDS` closure (a row is hashed by link text if and only if `lstat` says it is a link); the
    same-content re-point; an edit through a link moving only the target's entry, in the tree and out of it; the
    `CWE-367` source pin, now also requiring `O_NOFOLLOW` and forbidding a branch on the open's errno. End-to-end, the
    `CLAUDE.md -> AGENTS.md` fixture EXECUTES its own copy of `enforce-writes-scope.cjs`, which allows `CLAUDE.md` and
    `AGENTS.md` and denies the `OTHER.md` control, and the reconciler agrees with it. The same fixture pins its three
    `ESCAPE` mirrors, the out-of-repo link, the unreadable target, and the upgrade being flagged, never passed. A
    GOLDEN fingerprint digest, keyed by `ALGO` and cross-checked by hand, now fails any change to what is hashed that
    does not bump `ALGO`. The fingerprint was re-measured: 2230 paths, ~442 ms first call, ~73–75 ms warm.

## [6.20.7] - 2026-09-25

### Fixed

- 2026-09-25: **A SPEC can no longer switch between `feature` and `test-infra` without its approval pin moving.**
  Before this release, moving the `spec_kind:` line from the frontmatter to the body's first line, or back, kept the
  same pin. This fixes one review finding (CONFIRMED, low severity), and its reproduction is now a suite test.
  `SKILLS_VERSION` 6.20.6 → 6.20.7 (PATCH: a correction to a shipped checker; no pin moves, and no contract shape,
  finding shape or frontmatter key changes). `MIN_CLI` stays 0.5.0.
  ([`.dev/features/spec-pin-kind-ambiguity/`](./.dev/features/spec-pin-kind-ambiguity/))
  - **The collision.** `check-spec.mjs` `pinHash` (6.18.0) hashes each frontmatter `spec_kind:` line plus a line
    break, then the body, with no separator. So an Approved feature SPEC whose body opened with
    `spec_kind: test-infra` had exactly the pin of the same SPEC with that line in the frontmatter. `check-spec.mjs` and
    `check-spec-approved.mjs` stayed GREEN across the move, while `check-ac-tests.mjs --spec` went from TEMPLATED (0) to
    BOOTSTRAP (4). The reverse move collided too. Nothing re-asked for approval, which is the flip the 6.18.0 pin
    change was added to catch.
  - **The fix moves no pin.** `check-spec.mjs` now REDs, with kind `pin`, any SPEC whose body's first line starts
    `spec_kind:`. It does so for every SPEC, templated or legacy, and in every state, so a Draft is caught before it can
    be approved. `pinHash` and `--hash` are unchanged. With that one layout forbidden, the hashed text splits into kind
    lines and body in exactly one way, because a kind line always starts at column 0 with `spec_kind:`. The argument
    is written once, in the `pinHash` comment and in `pharn-contracts/spec-template.md` under "`spec_kind`". A body
    whose first line is blank, or starts with a space, is not ambiguous and still validates.
  - **Every AC-mode reading agrees.** `spec-template-core.mjs` gains `kindLineOpensBody()`, the one test for the
    layout. `specAcceptanceCriteria()` gains `kindInBody`, and reports the kind of a templated SPEC in that layout as
    `null`. So `check-ac-tests.mjs --spec` (and the AC gate, which reads the same verdict) exits 2 UNUSABLE with its own
    message, `checkMapping` REDs `spec-kind` naming the layout, and `check-test-stage.mjs` reads `spec-unusable`. A
    legacy SPEC still reads LEGACY 3, because its kind is never read. `ac-tests-lock.mjs` is unchanged: its bootstrap
    paths already refuse a `null` kind, and its test-first paths never read the kind.
  - **Docs.** `pharn-contracts/spec-template.md` states the rule. Its legacy paragraph no longer says "No rule here can
    RED it". `pharn-contracts/ac-tests.md` names the new unusable cause. `/pharn-spec` now says the key goes in the
    frontmatter, lists `pin` and `spec-kind` among the Draft's RED kinds, and no longer tells the approval step to
    recompute the hash for a layout `pin` RED, which no hash can fix. Five sentences promising that a legacy SPEC is
    "validated exactly as before" were narrowed to the template rules: in the contract, `check-spec.mjs`'s header,
    `/pharn-spec` twice, and `pharn/floor/README.md`.
  - **Bound, stated:** a SPEC approved in that layout before 6.20.7 REDs after `pharn update`. The remedy, moving the
    line or changing the body's first line, leaves the pin unchanged in the move case, because that is the collision
    itself. So the re-approval the RED asks for is advisory: the floor makes the layout unusable, but it cannot make a
    person re-approve. As before, a self-consistent rewrite of a SPEC and its pin passes.

## [6.20.6] - 2026-09-25

### Fixed

- 2026-09-25: **`/pharn-loop`'s freshness checker stops a forged verify report after the tree moves, and a crashed
  test-stage child no longer reads as stale AC evidence.** Two verified review findings. `SKILLS_VERSION` 6.20.5 →
  6.20.6 (PATCH: both restore behaviour the shipped headers and CHANGELOG [6.20.0] already promised; no contract shape,
  frontmatter or command step changes). `MIN_CLI` stays 0.5.0.
  ([`.dev/features/loop-fresh-integrity/`](./.dev/features/loop-fresh-integrity/))
  - `pharn/floor/check-loop-fresh.mjs`, check E: since 6.20.0, once the live tree differed from the verify stamp, E
    compared only `gates`. So a `verify-report.json` forged to `PASS` with `failing_gates: []` over a stamp with a red
    gate, followed by any edit, read `RERUN tree-moved-since-verify`. The re-run then overwrote the forgery, so it was
    never named. At the commit gate it read `STOP tree-moved-since-verify`. Over a moved tree E now re-derives WITHOUT
    `--ac-gate`, a pure function of the stamp, and compares what the stamp alone decides (`stampDerivedMismatch`):
    `gates`, `failing_gates` without the two AC ids, and the verdict (`FAIL` whenever any id fails, else the
    stamp-only verdict or `INCONCLUSIVE`). A forgery there is `STOP report-verdict-mismatch` in both modes. Only the AC
    part (the one part that reads the live tree) still defers to check F. A forgery confined to it is re-run, never
    trusted, and the commit gate stops on it; that bound is stated in the header and in
    `pharn-contracts/verify-report.md`. The relation accepts both check-verify `--ac-gate` precedences, 6.20.0's and
    6.20.4's (INCOMPLETE outranks a delivery-only or unmeasurable AC gate). A differential test runs the real
    check-verify both ways over an enumerated set of honest worlds, so a later precedence change is re-checked
    against it.
  - `pharn/floor/gate-run-core.mjs` names the AC half of `RESERVED_IDS` as `AC_RESERVED_IDS` (value unchanged). E
    takes the AC ids from there rather than importing `ac-gate-core.mjs`, which would have added five modules to the
    checker's own load graph. A test pins `AC_RESERVED_IDS` to the AC gate's `FAILING_IDS`.
  - `pharn/floor/check-test-stage.mjs`: a child checker that crashed (an uncaught throw or a module that failed to
    load, which is node's exit 1, the same code as the child's RED) was reported as `RED lock-red` or
    `RED mapping-red`. check-loop-fresh check I then routed it to `ac-evidence-invalid` (/pharn-loop S13: "set the
    build aside and re-run /pharn-test"). It now reads exit 1 as a RED only when the child printed its closing
    `RED —` line on stdout, which a test pins for every exit-1 return in both children. Otherwise it reports
    `UNUSABLE`, exit 2, which check I keeps as `front-stage-red` (S11) and /pharn-build, /pharn-ship and /pharn-loop
    already refuse on. Stated bound: a crash one level further down (a checker a child itself shells) is still read by
    that child as its own RED; only an input-dependent crash of `check-plan-spec-agree.mjs` over AC-TESTS.md escapes
    check I's own earlier runs.
  - Prose that described check E as always re-deriving with `--ac-gate`, or a crash as a RED, now matches:
    `pharn-contracts/verify-report.md`, `pharn-contracts/ac-tests.md`, `pharn-loop.md`, `pharn-verify.md` and
    `CLAUDE.md`.
  - **Not here, named follow-ups:** `loop-fresh-load-crash`: check-loop-fresh's own load failure exits node's 1,
    which is its RERUN code, with no JSON. That is also where the review's cited trigger (an unloadable
    `test-infra-core.mjs`) actually lands. `nested-child-crash` is the grandchild case above.

## [6.20.5] - 2026-09-25

### Fixed

- 2026-09-25: **`/pharn-test`'s lock and mapping checker now read a path and a frontmatter value the way the rest of
  the floor does.** This fixes five review findings, each reproduced by a script, and each script is now a suite test.
  `SKILLS_VERSION` 6.20.4 → 6.20.5 (PATCH: corrections to shipped checkers; the lock schema and the finding kinds are
  unchanged). `MIN_CLI` stays 0.5.0. ([`.dev/features/ac-tests-agreement/`](./.dev/features/ac-tests-agreement/))
  - **One frontmatter value reader.** `ac-tests-lock.mjs`'s private `scalar()` read the FIRST copy of a duplicated key
    and stripped a whitespace-preceded `#` comment before resolving a quote. `check-spec.mjs` and `check-plan-spec-agree.mjs` read the
    LAST copy, quote first. Fail-open: a `spec_kind: test-infra` SPEC re-approved by APPENDING a new
    `spec_content_hash:` line under the old one kept its bootstrap lock GREEN, `check-test-stage` READY and the AC gate
    PASS. Fail-closed: an AC-TESTS.md with stale-then-current pins locked the stale one, and `/pharn-verify` then
    reported `ac-tests-modified` (→ `/pharn-loop` S13) forever. `frontmatter-core.mjs` now exports `readValue` and
    `readField` (last-wins). The two private copies in `check-spec.mjs` and `check-plan-spec-agree.mjs` were MOVED
    there byte-for-byte (L35: retire a second copy rather than bind it). **This refactor preserves their behaviour:**
    every existing test of both passes unchanged, and a new parity test EXECUTES both CLIs over duplicated, quoted and
    commented keys against `readField`. Nothing refuses a duplicated key itself; every reader now takes the same copy.
  - **The AC gate no longer skips an unreadable SPEC pin.** When `readSpecFacts` could not read the pin, the
    comparison was skipped and the gate could PASS. It is now `ac-tests-modified`, an evidence reason: verify FAIL and
    `/pharn-loop` S13. Bound, stated in the module header and the contract: the gate reads the pin, never `state`, so
    a Draft that still carries the locked pin passes here, and `/pharn-verify`'s chain check refuses it.
  - **The lock pins the path the setter scopes.** `--write` hashed the RAW `## Files` entry, so
    `` `tests/ac/a.test.js (new)` `` (GREEN at `check-ac-tests`, scoped by the setter as the bare path) refused the
    write. `ac-tests-core.mjs` gains `scopedPath` (`clean` + `isConcrete`, imported, never re-derived), and the lock
    pins and checks through it.
  - **Mapping cells are byte-identical to their `## Files` entry.** The check matched a cell after folding, while the
    runner, the red run and the AC gate use it verbatim. So a cell differing only by case, or ending in a space inside
    the back-ticks, passed and was never collected. `MAPPING_RE` now refuses edge whitespace (a `malformed-line`, and
    a refusal in `acRowsOf` for every consumer), and a fold-only match is `unlisted-file`, naming the entry to copy.
  - **The path fold is the write guard's.** `scopeKey` only lowercased, so an NFD spelling of an AC test file, or `ſ`
    for `s`, passed `in-plan-files` / `claimed-elsewhere`, and on APFS the build could overwrite the pinned test. It now
    folds with `spec-template-core.mjs`'s `foldName`: NFC plus full case folding. `/pharn-test`'s "the build cannot
    write an AC test file" says it holds only up to this fold, and that the fold was never measured against APFS
    (ADVISORY).
  - **`AC-TESTS.lock.json` is prettier-exempt, and so is every other machine-written JSON pipeline artifact.**
    `.prettierignore` gains the lock, `assignments.json` and `findings.json`. A test-first dogfood run here had failed
    its own `format:check`. A new ★ test in `check-regress.test.mjs` classifies every `.json` member of
    `PIPELINE_ARTIFACTS` as machine- or model-written, and requires each machine-written one to be listed. Bound:
    `.prettierignore` does not ship, so a user's own formatter gate over `pharn/features/` is not covered.
  - `run-gates.test.mjs`'s copied-floor list is now the import closure of its roots. It had been a hand list, and the
    new `spec-template-core` import crashed the pinned head init.
  - Planned as 6.20.4. The parallel `verify-ac-gate-fixes` increment merged first as 6.20.4, so this rebased onto it
    and took the next PATCH. The two touch `ac-gate-core.mjs` and `ac-tests.md` in different places, and git merged
    both without a conflict.
  - **What an existing install sees change:** (a) a lock written by ≤6.20.4 over an AC-TESTS.md with duplicated pin
    lines recorded the first value and now REDs; re-run `/pharn-test` to re-lock. (b) A bootstrap lock over a SPEC
    re-approved by appending a pin now REDs, which is the fix; re-run `/pharn-test`. (c) A mapping cell that differs
    from its `## Files` entry by case, Unicode form or edge whitespace was GREEN and now REDs at `check-ac-tests`, so
    `check-test-stage` refuses the build. Such a cell was never collected; spell it as listed.

## [6.20.4] - 2026-09-25

### Fixed

- 2026-09-25: **`/pharn-verify` under the 6.20.0 AC gate: INCOMPLETE is reachable again, a large verdict survives a
  pipe, and Step 3a stops recommending the `--gates` form the AC gate reads as changed test infrastructure.** Three
  verified review findings, one increment (`.dev/features/verify-ac-gate-fixes/`).
  - **INCOMPLETE was unreachable under `--ac-gate`** (`pharn/floor/check-verify.mjs`). The AC gate's failing ids and
    its INCONCLUSIVE were consulted before build-completeness, and `/pharn-verify` Step 5 always passes `--ac-gate`.
    So a partly built `spec_kind: test-infra` feature (`lint` green, the `test` script not written yet) read
    `FAIL ["ac-delivery"]`, and `/pharn-ship` Step 2b's single bounded rebuild, reachable only from `INCOMPLETE`,
    could not fire. The new order: a red real gate → FAIL; an AC evidence reason → FAIL (a rebuild cannot restore
    evidence taken before it); an incomplete build → **INCOMPLETE**, even when the AC gate is red for delivery reasons
    only or could not measure; then the delivery FAIL, the unmeasured INCONCLUSIVE, completeness-inconclusive and
    PASS, as before. The `ac_gate` block stays in the INCOMPLETE report. **Decided at GATE 1 (option A):** INCOMPLETE
    also outranks an unmeasurable AC gate, because INCOMPLETE is never green, it spends at most one bounded rebuild
    or loop iteration before the re-measured verdict stands, and it removes the bootstrap dead end (a configured
    `testResults` whose reporter config is still missing reads `results-unavailable`, not delivery). **Without
    `--ac-gate` the output is byte-identical** — the existing EQUIVALENCE and flag-less tests are unchanged and green.
    Updated with it: the precedence comments, `verify-report.md` ("Over an incomplete build"), `ac-tests.md`,
    `pharn-verify.md` (Step 3d, Step 5, the guarantee audit) and `pharn-ship.md` (the step-7 read, Step 2b).
  - **A verdict past 64 KiB was cut short through a pipe** (`check-verify.mjs`, `check-regress.mjs`,
    `check-loop.mjs`, `check-red-run.mjs`). Each printed and then exited at once, dropping queued stdout; on darwin a
    piped stdout is asynchronous, so everything past the pipe buffer was lost (measured: 65,536 of 75,785 bytes for
    12 ACs × 40 parametrized tests). `check-loop-fresh.mjs` check E re-runs `check-verify --ac-gate` through
    `spawnSync` and `JSON.parse`s it, so such a feature read INCONCLUSIVE — `/pharn-loop` S11 — on every iteration
    and at the commit gate. The three `emit`-style CLIs now set `process.exitCode` and unwind with a module-private
    sentinel their top-level catch swallows (any other throw still escapes: a crash stays a crash, exit 1 with its
    stack); `check-red-run.mjs` sets `process.exitCode = main(argv)`. **Bounded, and stated:** the set is the four
    CLIs whose stdout a floor caller parses, plus the one the review named — a presence set (L36), so a future caller
    that starts parsing another CLI's output owes it the same change; the platform-independent guard is a static pin
    (no code line calls `process.exit(`), while the >64 KiB pipe round-trips discriminate only where piped stdout is
    asynchronous (CI's Linux may not truncate at all, so each round-trip reports its measured negative control);
    `spawnSync`'s 1 MiB default `maxBuffer` is not raised — past it the child is killed and `check-loop-fresh.mjs`
    reads INCONCLUSIVE naming the checker (fail-closed; ~6,600 AC tests in one feature at the measured size).
  - **Step 3a recommended an explicit `--gates`, which the AC gate reads as changed test infrastructure**
    (`.claude/commands/pharn-verify.md`). Since 6.20.0 a level gate counts only when it ran as the discovered
    `npm run <id>`, so `--gates` made a test-first feature `test-infra-changed` (FAIL `ac-evidence`, `/pharn-loop`'s
    terminal S13) and every AC of a bootstrap feature `ac-untested`, and the Step 5 remedy (set the build aside,
    re-run `/pharn-test`) could not help. The checker is right and unchanged in its reasons; the command now says not
    to pass `--gates` for a feature with AC evidence, drops the PHARN-dogfood instruction to pass it, and gives this
    branch its own remedy (re-run `/pharn-verify` without `--gates`). `pharn/floor/ac-gate-core.mjs` changes only the
    free-text `detail`: it names the stamp's explicit gate source when that is the cause (test-first and bootstrap),
    and a bootstrap level gate that ran but not as discovered no longer reads "the runner is not delivered yet".
  - **One-time upgrade cost:** a `/pharn-loop` run that straddles this release — a verify report written by 6.20.3,
    re-derived by 6.20.4 at `check-loop-fresh.mjs` check E — can stop with `report-verdict-mismatch` (S11) where the
    verdict or an `ac_gate` detail moved; re-running `/pharn-verify` clears it. SKILLS_VERSION 6.20.3 → 6.20.4
    (patch: corrections to shipped bytes); `MIN_CLI` unchanged.

## [6.20.3] - 2026-09-24

### Fixed

- 2026-09-24: **The hand-written docs catch up with 6.17.0–6.20.2 in the places no generated-region check covers.**
  A docs audit of the last ~30 commits found these sentences stale. `docs:check`, `check:badge`, `check:contributing`
  and `check:markers` were all green, because none of them reads this prose. `SKILLS_VERSION` 6.20.2 → 6.20.3 (PATCH:
  `pharn/floor/README.md` ships; no behaviour, contract shape or frontmatter changes). `MIN_CLI` stays 0.5.0.
  ([`.dev/features/docs-catchup-6-20-3/`](./.dev/features/docs-catchup-6-20-3/))
  - `README.md`: "How the workflow works" gains the Test stage, and its Verify line now names the acceptance-criteria
    check. The Commands intro names the two standalone commands instead of the stale "Six of the other eight". The
    spec-pin row of the Guaranteed table lists `test` among the re-verifiers, matching "The pipeline" in the same
    file. "Design docs" no longer says only two trusted docs are copied into an install; all four have been copied
    since `@pharn-dev/pharn` 0.4.0. The artifact lists name `AC-TESTS.md` and `AC-TESTS.lock.json`. "The pipeline"
    says what `/pharn-verify` reads for the acceptance-criteria check. The Guaranteed table gains two rows, each
    with its bound: the test-stage gate (6.19.0) and the AC gate (6.20.0).
  - `SECURITY.md`: the security surface names the scope setter and the `/pharn-loop` `Stop` guard, besides the two
    write guards. The write-guard-bypass scope covers every path `protect-trusted-paths.cjs` protects and the
    writes-scope guard, and it says that a Bash write on its own is outside both hooks by design.
  - `pharn/floor/README.md`: the hooks' bound names `NotebookEdit` and says a Bash write is detected at verify
    (since 4.0.0), not prevented.
  - `pharn-dev-grill`, `pharn-dev-regress` and `pharn-dev-verify` quoted a spine without `test` and cited
    `pharn/ARCHITECTURE.md §6` for it. They now name the dev loop they run in, which has no test stage.
  - **Not here, deliberately:** `CLAUDE.md` (current through 6.20.2) and the open `stop-guard-live-probe` follow-up,
    which `CLAUDE.md` already describes as open.

## [6.20.2] - 2026-09-24

### Fixed

- 2026-09-24: **The four trusted docs catch up with 6.14.0–6.20.1: the spine names `test`, verify's AC gate and the
  project SPEC template are described, and statements that had gone false are corrected.** `SKILLS_VERSION` 6.20.1 →
  6.20.2 (PATCH: corrections and clarifications to shipped bytes; no new capability). `MIN_CLI` stays 0.5.0. The
  trusted-doc edits were applied by a human (the files are hook-protected against the agent) from
  `.dev/features/protected-docs-6-20-2/proposed/`, which consolidates the `PROTECTED-FOLLOWUPS.md` files of
  test-results, pharn-test-stage, pharn-test-red, wire-pharn-test and verify-ac-gate, and the #251/#253 plans.
  ([`.dev/features/protected-docs-6-20-2/`](./.dev/features/protected-docs-6-20-2/))
  - **`pharn/ARCHITECTURE.md`.**
    - §4 lists `test-results-record` and `ac-tests` among the contracts, and `review` among the commands.
    - §5 restores the seam-record line #186 dropped, which had left a code span unclosed.
    - §6's spine and table add `test`, and the verify row describes the AC gate.
    - Two §6 Keystone sentences are corrected: "four downstream stages re-verify" (false since `/pharn-test`
      joined them) and the literal-`spec_id` sentence.
    - The content hash moves from `edc3d07d…ce091a5d2c` to
      `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`; no dev plan was open.
  - **`LIMITS.md`.**
    - §8's "ten" product stages (false since 6.17.0) takes an open form.
    - §1d limits the AC-grammar sentence to `check-spec.mjs` and states the project template's Bash limits.
    - §5, §6 and §8 correct three stale asides.
    - A new §9 states the limits of the AC evidence.
  - **`THREAT-MODEL.md`.** The project SPEC template becomes surface 9 (§2, §3). §4 item 2 no longer says a Bash write
    to a trusted path goes undetected (false since 4.0.0).
  - **`pharn/CONSTITUTION.md`.** "The agent cannot write to" the four docs now says through which tools. The
    unqualified form was the claim `LIMITS.md §6` strikes.
  - **Also updated:** `/pharn-build`, `/pharn-ship` and CLAUDE.md drop the sentences that deferred to this pending
    edit.

## [6.20.1] - 2026-09-24

### Fixed

- 2026-09-24: **The docs that 6.20.0 left stale now say what it does: `/pharn-verify` reads the per-test record,
  the lock is schema `/3` with a real test-infrastructure pin, and `/pharn-loop` stops on changed AC evidence.**
  `SKILLS_VERSION` 6.20.0 → 6.20.1 (PATCH: corrections to shipped bytes; no behaviour, contract shape or frontmatter
  changes). `MIN_CLI` stays 0.5.0.
  ([`.dev/features/docs-catchup-6-20-1/`](./.dev/features/docs-catchup-6-20-1/))
  - **Now false, corrected:**
    - `pharn/pharn-contracts/test-results-record.md` and the header of `pharn/floor/test-results-core.mjs` said the
      verify verdict is unchanged by the per-test record. Since 6.20.0 it depends on the record whenever
      `check-verify.mjs` runs with `--ac-gate`, which `/pharn-verify` always passes. The regress verdict, and a verify
      verdict computed without the flag, are still unchanged.
    - `README.md` said verify does not yet read the record.
    - `CLAUDE.md` described lock schema `/2` with `test_infra` "reserved for a later stage".
  - **Incomplete, completed:** `README.md`'s list of reds `/pharn-loop` never retries now names the AC-evidence stop
    (`blocked: ac-evidence-invalid`). `pharn/features/README.md`'s AC-tests entry now covers the 6.19.0 build
    precondition, the 6.20.0 pin and the verify report's `ac_gate` table.
  - **Not here, deliberately:** the four trusted docs (human-only; queue item 07's text covers them), and the four
    sentences in `pharn-build.md`, `pharn-ship.md` and `CLAUDE.md` that defer to that pending protected edit. They
    stay true until a human applies it.

## [6.20.0] - 2026-09-24

### Added

- 2026-09-24: **`/pharn-verify` now checks every Acceptance Criterion, not only whole gates: an AC gate in its FLOOR
  verdict, the test-infrastructure pin it needs, and `/pharn-loop` behaviour that iterates on an undelivered AC and
  stops when the AC evidence itself changed.** `SKILLS_VERSION` 6.19.0 → 6.20.0 (MINOR: a new checker, a new lock
  section and new loop behaviour). `MIN_CLI` stays 0.5.0: no installed path moves, and pharn-cli copies
  `pharn/floor/` whole.
  ([`pharn/floor/ac-gate-core.mjs`](./pharn/floor/ac-gate-core.mjs),
  [`pharn/floor/test-infra-core.mjs`](./pharn/floor/test-infra-core.mjs),
  [`pharn/pharn-contracts/ac-tests.md`](./pharn/pharn-contracts/ac-tests.md),
  [`.dev/features/verify-ac-gate/`](./.dev/features/verify-ac-gate/))
  - **Why.** Until now verify's verdict came from whole-gate exit codes, and nothing there knew an AC existed, so a
    loop could end GREEN with a criterion's test deleted, skipped or never collected. Honest trigger (P7): item 6 of
    the maintainer's AC-delivery queue — the requirement the queue exists for.
  - **The gate.** `check-verify.mjs --stamp … --ac-gate` (the pinned `/pharn-verify` Step 5 line) runs
    `ac-gate-core.mjs` over the head run's per-test records. An AC is delivered = a locked, once-red test titled
    `AC-<n>:`, in a file mapped to AC-n, passed on the head run. PHARN does not judge whether that test captures the
    AC's intent. Matching is file-scoped through red-run-core's `observeAc`, now the one copy both stages call, so
    another feature's `AC-1:` never counts.
  - **Three reason classes, closure-tested as a partition.** Delivery (`ac-untested`, `ac-not-passed`, `ac-skipped`)
    adds `ac-delivery` to `failing_gates`, and the loop iterates. Evidence (`ac-tests-modified`, `ac-never-red`,
    `test-infra-changed`, `test-infra-unpinned`) adds `ac-evidence`, and `check-loop.mjs` stops. Item 01's record
    reasons make an otherwise-green verify INCONCLUSIVE, never a PASS; a red gate beats that. Both ids are reserved
    gate ids and never enter `gates`. A legacy SPEC reads `not-applicable (legacy spec)` in the report — unless AC
    evidence sits beside it, which is `ac-tests-modified`. A `spec_kind: test-infra` SPEC gets BOOTSTRAP evidence,
    labelled weaker.
  - **The test-infrastructure pin.** `ac-tests-lock.mjs --write` now writes schema `ac-tests-lock/3` with a
    `test_infra` section, taken before the red run. It holds the level gates' `package.json` script values with their
    `pre`/`post` scripts, their `testResults` formats, and root `vitest`/`vite`/`playwright`/`jest` configs in a closed
    name set. `--check` and the gate recompute it, and the gate also requires each level gate to have run as the pinned
    `npm run <id>`. Not caught, stated in full once in `test-infra-core.mjs` and restated in the contract: among others,
    a setup file a config imports, env-driven config, script chaining, `.npmrc`, `tsconfig`, the runner's version. A `/2` test-first
    lock is refused by the test-stage gate BEFORE the build, where re-running `/pharn-test` is still cheap. The lock's check is split into pure named parts, so `check-verify.mjs` still spawns nothing.
    `specVerdict` moves into `spec-template-core.mjs` so `check-ac-tests.mjs --spec` and the gate read one function.
  - **The loop.** `check-loop.mjs` stops terminally on `ac-evidence` and names the predicate in a new closed
    `terminal_cause` (`unmeasured` | `ac-evidence` | `reconcile`). The AC reading wins over `reconcile` when a Bash
    edit of a pinned test trips both. `check-loop-fresh.mjs` changes three ways: check E re-derives verify WITH
    `--ac-gate` and compares `ac_gate` (deferring to F when the tree moved, since the gate reads the live tree); J
    re-hashes the per-test results files (without following a link); and a test-stage RED at check I gets its own code, `ac-evidence-invalid` (a crash or exit 2 stays `front-stage-red`).
    Both routes map to the new stuck point **S13, `blocked: ac-evidence-invalid`**, recorded as an ordinary blocked
    stop. The grill found that without check I's own code the brief's main case ended at S11 instead. The rebuild now
    receives `ac_gate.acs[]` as quoted data.
  - **Reports.** `verify-report.json` carries an `ac_gate` block with the per-AC table (`verify-report.md`).
    `RUN-REPORT.md`'s `## Verdicts` renders it as a fenced DATA block. `VERIFY.md` fences it too, and `SHIP.md` carries
    the gate's verdict line and cites the code-rendered table rather than retyping it.
  - **Migration and cost, stated.** A feature whose lock is `/2` (6.18/6.19) has no pin, so verify reports
    `test-infra-unpinned` until it goes back through `/pharn-test`. Once the build exists, that means setting the
    build aside first, because the red run would now pass. One flaky test, `test.fail()` or duplicate id anywhere in
    the suite voids the per-test record and makes verify INCONCLUSIVE.
  - **Protected docs.** `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md` and `LIMITS.md` need edits only a human can make;
    they are listed in `.dev/features/verify-ac-gate/PROTECTED-FOLLOWUPS.md`.

## [6.19.0] - 2026-09-24

### Added

- 2026-09-24: **`/pharn-test` is wired into both chains between `/pharn-grill` and `/pharn-build`, and the order is
  enforced: `/pharn-build` refuses until one new checker, `check-test-stage.mjs`, reads the test stage's evidence as
  complete.** `SKILLS_VERSION` 6.18.0 → 6.19.0 (MINOR: a new checker and new orchestration). `MIN_CLI` stays 0.5.0: no
  installed path moves, and pharn-cli copies `pharn/floor/` whole.
  ([`pharn/floor/check-test-stage.mjs`](./pharn/floor/check-test-stage.mjs),
  [`pharn/pharn-contracts/ac-tests.md`](./pharn/pharn-contracts/ac-tests.md),
  [`.dev/features/wire-pharn-test/`](./.dev/features/wire-pharn-test/))
  - **Why.** 6.17.0–6.18.0's `/pharn-test` was standalone, and an order that only a command narrates is the gate that
    gets skipped (PHARN's own lessons L5/L30). Honest trigger (P7): item 5 of the maintainer's AC-delivery queue.
  - **The gate.** `check-test-stage.mjs <name>` shells the existing checkers and owns only the branch on the SPEC's
    mode: templated → the full mapping check against the CURRENT SPEC and PLAN plus a test-first lock that records a
    red run → `READY test-first`; `spec_kind: test-infra` → a bootstrap lock → `READY bootstrap`; legacy with no
    mapping and no lock → `NOT-APPLICABLE legacy-spec`. Otherwise `RED <reason>` from a closed set, including
    `lock-mode-mismatch` (a test-first lock's own check never reads SPEC.md, so a SPEC re-approved as test-infra beside
    an old test-first lock used to pass). `--require-test-first` puts a caller's policy in the checker: any other pass
    becomes `RED mode-not-allowed`.
  - **`/pharn-build` (0.2.0)** runs it FIRST, before its scope set and reconciliation anchor, and refuses on a RED. It
    passes on a rebuild: the lock pins only the tests. It closes 6.17.0's stated bound: a PLAN edited after
    `/pharn-test` to scope the build to a test file is now refused before any write.
  - **`/pharn-ship` (0.7.0)** runs `/pharn-test` and reads the gate; the chain stops on a RED, and a missing runner is
    `/pharn-test`'s own question, relayed. `SHIP.md` records `ac-tests: …`.
  - **`/pharn-loop` (0.9.0)**: the front is plan → grill → test (`--unattended`). New stuck point **S12**
    `blocked: no-test-runner`, decided by its own pinned `check-red-run.mjs --preflight` (never by relayed text), with
    the suggested setup command copied into `### next_steps`. Every other test-stage failure, and `NOT-APPLICABLE`
    (the loop never writes a legacy SPEC), is S9 — the loop reads the gate with `--require-test-first`, and
    `check-loop-fresh.mjs` check I re-reads it the same way after every build and at the commit gate: stale test evidence is a STOP, never a re-run. Step 6c now stages the lock and every
    pinned test, and refuses to commit (`stage failed`) when the lock or a test it pins is not a regular, non-ignored file. The record's
    `## Outcome` gains `ac-tests:`. **Also fixed there:** the builder's ignored-path filter never fired — it ran
    `git check-ignore` under `GIT_LITERAL_PATHSPECS=1`, which that command refuses (exit 128) — so an ignored plan path
    failed `git add` instead of being dropped. It now runs without that variable; the builder is executed by a test.
  - **The GATE-2 briefing (contract 0.2.0)** gains `ac_tests_mode`, copied from the lock's `mode` and cross-verified;
    a 0.1.x briefing without it still checks.
  - **The spine** is `spec → plan → grill → test → build → regress → verify → ship` in every product command, the
    README and CLAUDE.md, and the stage ordinals and pin-consumer counts are renumbered.
    `pharn/ARCHITECTURE.md` §6 is protected; its edit waits for a human (`PROTECTED-FOLLOWUPS.md`).
  - **Why MINOR, and what changes for a feature in flight.** No contract, finding shape or frontmatter changes shape,
    and no install breaks. What changes is a precondition. A templated feature planned before 6.17.0 (no mapping), or
    tested under 6.17.0 (its lock records no red run), is now refused by `/pharn-build` until it goes back through
    `/pharn-plan` and `/pharn-test`. One already partly built without them must first revert that implementation:
    a red run over existing behaviour reads `ac-test-passes-before-build`, and there is no override.
  - **Bounds, stated.** Obeying the gate is command discipline; the loop re-reads it rather than trusting the front.
    `NOT-APPLICABLE` is decided by `spec_template`, which the approval pin does not cover. The gate checks tree
    identity, not recency. An abandoned loop run leaves its mapping and tests behind, so a retry REDs
    `claimed-elsewhere` at `/pharn-plan` until a person removes them.

## [6.18.0] - 2026-09-24

### Added

- 2026-09-24: **`/pharn-test` runs the AC tests it wrote BEFORE the build and requires each to fail, recording that
  red run in the lock; a level with no runner stops it; a `spec_kind: test-infra` SPEC gets a bootstrap lock.**
  `SKILLS_VERSION` 6.17.1 → 6.18.0 (MINOR: a new checker, a new runner stage and a new lock schema). `MIN_CLI` stays
  0.5.0: no installed path moves, and pharn-cli copies `pharn/floor/` whole (test files and fixtures excepted), so
  the three new modules ship on `pharn update`.
  ([`pharn/floor/check-red-run.mjs`](./pharn/floor/check-red-run.mjs),
  [`pharn/floor/red-run-core.mjs`](./pharn/floor/red-run-core.mjs),
  [`pharn/floor/ac-tests-core.mjs`](./pharn/floor/ac-tests-core.mjs),
  [`pharn/pharn-contracts/ac-tests.md`](./pharn/pharn-contracts/ac-tests.md),
  [`.dev/features/pharn-test-red/`](./.dev/features/pharn-test-red/))
  - **Why.** 6.17.0's `/pharn-test` wrote and locked the tests but never ran them, so a test that cannot fail, is
    never collected, or is skipped passed unnoticed. Honest trigger (P7): item 4 of the maintainer's AC-delivery
    queue.
  - **The red run.** `run-gates.mjs init --stage ac-test --ac-tests <AC-TESTS.md>` (`STAGES` gains `ac-test`)
    selects the gates BY ID from the mapping's levels (`LEVEL_GATES` in `gate-run-core.mjs`: `unit`/`integration` →
    `test`, `e2e` → `test:e2e`/`e2e`) and hands each gate exactly its mapped files after `--`; `--gates`, `--extra`,
    `--skip-style`, `--scope-json`, `--spec-from` and `--side` are refused, and a level with no discovered gate is
    `coverage-violation`. An argv gate carrying files now appends them whatever its id (only `test` ever carried
    any, so verify and regress are unchanged).
  - **The verdict** (`check-red-run.mjs --verdict`, logic in `red-run-core.mjs`): per AC, over the per-test record
    of every gate its level maps to, entries whose `file` EQUALS the mapped file and whose LEAF title starts
    `AC-<n>:` — `ac-test-not-collected`, `ac-test-passes-before-build` (no escape hatch), `ac-test-skipped`,
    `ac-level-unavailable`, and 6.15.0's record refusals by their own names. It is bound to the run: the stamp
    validates as `ac-test` for the feature, each run's files equal the mapping's, and the live worktree fingerprint
    equals the stamp's final one. Its model of "not collected" was measured on a real vitest 5.0.1 run
    (`pharn/floor/test-fixtures/test-results/vitest-red.json`): a test that `await import()`s its missing target is
    collected and failed; the same test with a top-level import is a file-level failure with nothing collected. So
    `/pharn-test` (0.2.0) writes unit/integration AC tests with the import inside the test body.
  - **No runner.** `check-red-run.mjs --preflight` requires every AC's level to have a discovered gate with per-test
    results configured for each of its gates, else `ac-level-unavailable: AC-<n> (<level>)` and a closed last line,
    `blocked: no-test-runner — …; suggested: /pharn-ship "…(spec_kind: test-infra)"`. `/pharn-test` asks
    interactively and prints that line under its new `--unattended` flag; it never starts a nested run.
  - **The lock, `ac-tests-lock/2`.** Adds `mode` (`test-first` | `bootstrap`) and `bootstrap`; `/1` is still read.
    `--record-red-run <name> --out <dir>` re-derives the verdict and writes `red_run` (`stamp_sha256`,
    `files_sha256` — bound to the lock's `files`, re-checked by `--check` —, each gate's results digest, the matched
    test ids per AC). `--check --require-red-run` asks "did a red run happen"; plain `--check` never meant that, and a
    bootstrap lock fails it unless `--allow-bootstrap` is passed too.
  - **Bootstrap.** An optional SPEC frontmatter key, `spec_kind` ∈ {`feature` (absent), `test-infra`}: rule 8
    (`spec-kind`) of the spec template, read from the raw frontmatter lines. `check-ac-tests.mjs --spec` exits 4 for
    it, `/pharn-plan` (0.5.0) writes no mapping, and `ac-tests-lock.mjs --write-bootstrap` records the SPEC's pin and
    levels, over a SPEC it re-checks as Approved and un-drifted (`check-spec-approved.mjs`, shelled) — weaker than
    test-first, and the lock says so. **The approval pin now covers a `spec_kind:` line** (`check-spec.mjs` hashes
    it in front of the body when present), so an Approved feature SPEC cannot become a bootstrap one without the pin
    moving — drift at every chain check; a self-consistent re-pin still passes. A SPEC without the line pins exactly
    as before, so no existing pin moves.
    `/pharn-spec` (0.5.0) offers the setup increment when it warns of a missing runner and never writes
    `test-infra` under `--model-approve`.
  - **Also:** the mapping grammar moved from `check-ac-tests.mjs` into `ac-tests-core.mjs` (re-exported), because
    no floor module imports a `check-*.mjs` CLI; `badPath` refuses a file led by `-`, which a runner would read as
    a flag; a mapping for a `test-infra` SPEC is a new `spec-kind` RED.
  - **Bounds, stated.** "Failed" is the runner's status: a test failing on its own typo reads the same as one
    failing for the missing behaviour. Agreement, not provenance: a self-consistent forged results file and stamp
    over the live tree pass. The stamp and results digests are recorded, not re-checkable once the next run wipes
    `.pharn/pharn-test/gates`. The red run does not run `build`. Still standalone: `/pharn-ship` and `/pharn-loop`
    do not call `/pharn-test`.
- 2026-09-24: **Lesson L59 promoted to `.dev/memory-bank/lessons-learned.md`: a call that follows a symlink answers
  for the target, never for the link.** It is L54's mechanism at a third floor site. `hashFile` opened each
  enumerated path with `openSync`, so a tracked directory symlink hashed as `null` and every reconcile reported it
  as an escape. No fixture in either reconciler suite held a link. The fix itself shipped in 6.17.1
  (`reconcile-symlink-hash`, PR #259); this entry records only the lesson, which stays a pending remedy: only
  `reconcile-baseline.test.mjs` carries a `PATH_KINDS` enumeration. `docs/lessons-index.md` was regenerated with
  the narrow generator. Apparatus only, so there is no `SKILLS_VERSION` bump.

## [6.17.1] - 2026-09-24

### Fixed

- 2026-09-24: **The Bash-write reconciler no longer reports an unchanged tracked directory symlink as an
  escape.** A repo that tracks a symlink to a directory, or a dangling one, got a `reconcile` `ESCAPE` on every
  `/pharn-verify` with zero writes. The verdict was `FAIL`, so `/pharn-loop` stopped `STOP_TERMINAL` and made no
  commit. `hashFile` now hashes such a link by its link text, which is what git stores for it. An unchanged
  link reconciles `CLEAN`, and a re-pointed one is still an `ESCAPE`. `SKILLS_VERSION` 6.17.0 → 6.17.1 is a patch:
  shipped floor bytes changed, and the baseline's keys and `version` did not.
  ([`pharn/floor/reconcile-baseline.mjs`](./pharn/floor/reconcile-baseline.mjs),
  [`pharn/pharn-contracts/reconciliation-record.md`](./pharn/pharn-contracts/reconciliation-record.md),
  [`.dev/features/reconcile-symlink-hash/`](./.dev/features/reconcile-symlink-hash/))
  - **The failure, from a downstream project.** `pharn-starter` tracks 20 `.claude/skills/*` symlinks to
    directories. At least eight of its `/pharn-loop` runs ended `STOP_TERMINAL` on those links. `openSync`
    follows a link, so `hashFile` saw a directory and returned `null`. The anchor then never recorded the link,
    and the reconcile read it as "unreadable, treated as changed". This has been the behavior since the
    reconciler shipped in 4.0.0. The project patched its installed copy, and its next `pharn update` overwrote
    the patch with this repo's unfixed file, so the fix belongs here.
  - **Which links, exactly.** The new rule applies to a link whose open succeeds on something that is not a
    regular file (a directory, a device), and to a link whose open fails with `ENOENT`, `ENOTDIR` or `ELOOP`
    (the target resolves to nothing). The set is closed, and `EACCES` is deliberately not in it. A link to an
    unreadable file stays unhashable, so it is still treated as changed, and making a target unreadable cannot
    hide a change to it. A link to a regular file keeps its content hash, as before.
  - **Compatible with the downstream patch.** For any valid-UTF-8 target the digest is
    `sha256("symlink\0" + text)`, the formula that patch used, so its own tests pass again after
    `pharn update`. The text is hashed as raw bytes, so two targets that differ only in invalid UTF-8 stay
    distinct. A string read would have merged them.
  - **After updating, the first run can still fail once.** An epoch anchored by older code has no entry for
    such a link, so its first reconcile under 6.17.1 still reports the link. The next `/pharn-*build` anchors
    again and records it. The worktree fingerprint also moves on a tree that holds such a link, so a
    `/pharn-loop` freshness stamp written before the update reads as tree-moved and re-runs verify. It never
    reads as fresh.
  - **Also corrected in the contract.** `reconciliation-record.md` §3 listed "a path unreadable during
    reconcile" under WARN ("verdict unaffected"). The checker has treated such a path as changed since that
    rule's review fix. The row now says so.

## [6.17.0] - 2026-09-24

### Added

- 2026-09-24: **`/pharn-test`: each Acceptance Criterion's test is written BEFORE the build, into files the build may
  not touch, and pinned.** `SKILLS_VERSION` 6.16.0 → 6.17.0 (MINOR: a new product command, checker and script).
  `MIN_CLI` stays 0.5.0: the installer copies every `pharn-*.md`, so the new command ships on `pharn update`.
  ([`.claude/commands/pharn-test.md`](./.claude/commands/pharn-test.md),
  [`pharn/floor/check-ac-tests.mjs`](./pharn/floor/check-ac-tests.mjs),
  [`pharn/floor/ac-tests-lock.mjs`](./pharn/floor/ac-tests-lock.mjs),
  [`pharn/pharn-contracts/ac-tests.md`](./pharn/pharn-contracts/ac-tests.md),
  [`.dev/features/pharn-test-stage/`](./.dev/features/pharn-test-stage/))
  - **Why.** Acceptance Criteria were phrased testably, but if the build writes their tests it can write tests that
    fit its own implementation. Honest trigger (P7): item 3 of the maintainer's AC-delivery queue.
  - **The mapping.** For a templated SPEC, `/pharn-plan` (0.4.0) now also writes `AC-TESTS.md`: the SPEC pin, a
    `## Files` list of exactly the test files, and one `- AC-<n> | <level> |`<file>`| <public target>` line per
    criterion. `check-ac-tests.mjs` REDs on a closed set of kinds, among them a missing, duplicate or unknown AC, a
    level that differs from the SPEC, a test file that is also in PLAN.md `## Files` (the build would be scoped to
    it), and one another feature already owns. The SPEC pin is checked by the shelled `check-plan-spec-agree.mjs`.
    A new `--spec` mode decides legacy (exit 3) before any mapping exists. AC ids come from a new `specAcceptanceCriteria()` in
    `spec-template-core.mjs`, through the same item parser `check-spec.mjs` checks with.
  - **The stage.** `/pharn-test` is scoped by `--from-plan AC-TESTS.md`, so it can write only the mapped files, and
    the build's `--from-plan PLAN.md` scope excludes them (a test runs the real setter and guard over a fixture and
    shows both). The checker compares paths as the setter scopes them — a trailing `(…)` annotation stripped,
    case-folded — so a PLAN entry `tests/ac/a.test.js (gated)` cannot slip a test into the build's scope. Every
    test's own title starts `AC-<n>:`. `ac-tests-lock.mjs --write` records every file's sha256 in
    `AC-TESTS.lock.json`, with two sections reserved for later stages; the lock's keys are closed at every level, and
    `--check` REDs naming the changed path.
    It runs standalone: `/pharn-ship` and `/pharn-loop` do not call it yet, and nothing runs the tests it writes.
  - **What had to move with it.** `AC-TESTS.md` and the lock are pipeline artifacts (`PIPELINE_ARTIFACTS`), and
    `/pharn-regress` (0.4.0) declares AC-TESTS.md's `## Files` beside the PLAN's; otherwise every regress would
    report the AC tests as build escapes. For reconcile, AC-TESTS.md is exempt like PLAN.md (a re-plan rewrites
    it), but the lock is not: a new `pre_anchor_artifacts` list in `reconcile-ignore.json` keeps a build-window
    change to it visible. The fingerprint includes both. `/pharn-loop` commits AC-TESTS.md with its other artifacts. `check-model-config.mjs` gains the stage as `ac-test` (its file is `pharn-test.md`) and now tests the
    map's file names in its reverse pass.
  - **Two parser divergences fixed on the way.** `plan-files-core.mjs` lacked the writes-scope setter's
    wrapped-continuation rule, though its header claimed parity, and its `clean` stripped `src/a(b)` to `src/a` where
    the setter keeps it. A wrapped `## Files` description containing "out
    of scope" ended the core's list while the setter kept going. That could have let `in-plan-files` pass while the
    build's scope still named a test. Both are ported, each with a parity case that runs the real setter. A new
    hygiene test also EXECUTES every pinned `--from-frontmatter … --target …` line: a formatter had split
    `/pharn-test`'s `writes:` onto several lines, which the setter cannot read.
  - **Bounds.** The build exclusion holds for the PLAN.md that was checked; `/pharn-build` does not re-check it yet.
    A mapped test file is assumed new: an existing test mapped here leaves the regression comparison.
    `/pharn-test` runs before the reconcile anchor, so its own Bash writes are not reconciled. Whether the tests
    are right is model work.
  - **Docs.** `/pharn-spec` (0.4.0) no longer says PHARN writes no acceptance tests, and no longer says the gate
    allowlist has no e2e member — the second claim went stale in 6.16.0 and is corrected here. The protected
    `pharn/ARCHITECTURE.md` (§4, §6) and `LIMITS.md` edits are in `.dev/features/pharn-test-stage/PROTECTED-FOLLOWUPS.md`.

## [6.16.0] - 2026-09-23

### Added

- 2026-09-23: **An e2e gate: `/pharn-verify` now discovers a project's `test:e2e` or `e2e` script, runs it after
  `build`, and can read its per-test results.** `SKILLS_VERSION` 6.15.0 → 6.16.0 (MINOR: a new gate the product discovers). `MIN_CLI`
  stays 0.5.0. ([`pharn/floor/gate-run-core.mjs`](./pharn/floor/gate-run-core.mjs),
  [`.claude/commands/pharn-verify.md`](./.claude/commands/pharn-verify.md),
  [`.dev/features/e2e-gate/`](./.dev/features/e2e-gate/))
  - **The gap.** Gate discovery was `ALLOWLIST ∩ package.json scripts`, and the allowlist stopped at `build`, so
    a project's e2e suite never ran. Honest trigger (P7): item 2 of the maintainer's AC-delivery queue, not a
    dogfood failure. **Not closed here:** nothing yet links an acceptance criterion's `verify: e2e` level to this
    gate, and a project with no e2e script still has nothing to run such a criterion.
  - **The rule.** `E2E_SET = ["test:e2e", "e2e"]` joins the end of `ALLOWLIST`. An e2e gate is discovered only
    when the script exists, runs after `build` (last among the project gates; eval-pair gates and `reconcile`
    still follow), and a red one fails verify like a red `test` gate. If a project
    defines both scripts, both run (the `typecheck` / `type-check` precedent). `/pharn-regress` never discovers
    them: `resolveSet` drops them from a discovered regress source, so a regression only an e2e test catches is
    a verify FAIL, not a regress finding, and an e2e-only manifest is `empty-source-set` at regress (its refusal
    says so). An explicit `--gates` string is not filtered. The drop is reported, not silent: the regress head
    side's `run-gates.mjs init` prints `e2e_excluded`, which `REGRESSION.md` names; the stamp shape is unchanged.
  - **Per-test results.** `RESULTS_GATES` is now `test` plus `E2E_SET`, so `pharn.config.json` can name
    `"test:e2e": "playwright-json"`; each gate writes its own results file.
  - **Costs, stated.** An e2e suite gets the same per-gate 540 s limit as every gate; under `/pharn-loop` it runs
    every iteration. With no e2e script, the resolved gate set (ids, argv, order, `required`) is unchanged from
    6.15.0; the stamps themselves are not byte-identical (their fingerprints hash the installed floor files).
  - **Commands.** `/pharn-verify` 0.3.0 and `/pharn-regress` 0.3.0 name the e2e ids and the exclusion.
    `/pharn-ship`'s third literal copy of the allowlist is replaced by a citation of `ALLOWLIST`, and
    `/pharn-loop`'s S4 row now covers an e2e-only project at regress.

## [6.15.0] - 2026-09-23

### Added

- 2026-09-23: **A per-test record for the `test` gate: which named tests passed, failed or were skipped,
  derived by tested code from a JSON report the project's own test run writes.** `SKILLS_VERSION` 6.14.1 →
  6.15.0 (MINOR: a new floor module and a new contract). `MIN_CLI` stays 0.5.0: no installed path moves.
  ([`pharn/floor/test-results-core.mjs`](./pharn/floor/test-results-core.mjs),
  [`pharn/floor/test-results-formats.mjs`](./pharn/floor/test-results-formats.mjs),
  [`pharn/pharn-contracts/test-results-record.md`](./pharn/pharn-contracts/test-results-record.md),
  [`.dev/features/test-results/`](./.dev/features/test-results/))
  - **The gap.** The floor sees only whole-gate exit codes, so it cannot tell that one named test ran: a suite
    exits 0 with `it.skip("AC-1: …")`. Honest trigger (P7): no dogfood run failed on this; it is the first item
    of the maintainer's AC-delivery queue, and **no stage reads the record yet**. For every stamp the runner
    writes, the verify and regress verdicts are unchanged; a stamp carrying a malformed `results_sha256` is now
    refused, and the runner refuses a gate whose results path it cannot clear.
  - **The runner.** `run-gates.mjs` now spawns every gate with `PHARN_TEST_RESULTS` set to that gate's own path
    under `<out>` (a different file per gate), removes the path before the gate runs, and records
    `runs[].results_sha256`: the sha256 of a regular file there, else `null`. The file is read through
    `O_NOFOLLOW | O_NONBLOCK` and `fstat`, in chunks, so a symlink, FIFO or device is never followed or blocked
    on. The field is optional: the stamp `SCHEMA` is unchanged and every existing stamp still validates; a
    stamp carrying a malformed value is refused as `stamp-malformed`.
  - **The record.** `testRecord({ stamp, outDir, gateId, root })` re-hashes the file against the stamp and
    returns `{id, file, title, status}` per test, `counts`, and `suite_errors` (failures no test owns), or one of
    eleven closed reasons. A project opts in with `pharn.config.json` `testResults: {"test": "vitest-json" |
"playwright-json"}`. Both formats are built into their runner, and each adapter was checked against reports
    captured from the real reporter (vitest 5.0.1, Playwright 1.63.0). CTRF (still pre-1.0) and Jest (no live
    capture available) are recorded as not chosen.
  - **Bounds.** "passed" means the reporter said so. The test script, the reporter config and
    `pharn.config.json` are all editable by a build, so a forged report is possible; `results-exit-contradiction`
    (a failed test or a suite error under exit 0) narrows that and does not close it. A flaky test or a
    `test.fail()` voids the whole record rather than being read as a pass.
  - **Protected edit left for a human:** `pharn/ARCHITECTURE.md` §4's contract list, in
    `.dev/features/test-results/PROTECTED-FOLLOWUPS.md`.

## [6.14.1] - 2026-09-23

### Added

- 2026-09-23: **Lesson L58 promoted to `.dev/memory-bank/lessons-learned.md`: a record bound to a live referent
  must ask which part of that referent may still change.** It is L42's class recurring after L42 was canon, this
  time through L43's remedy: `check-cost-ledger.mjs --verify-transcript` compared `excluded_requests` by equality
  with a transcript that keeps growing after the ledger is written, so every ledger whose session continued went
  RED. The fix itself ships in `cost-ledger-verify-tail` (PR #252); this entry records only the lesson.
  `docs/lessons-index.md` was regenerated with the narrow generator. Apparatus only, so there is no
  `SKILLS_VERSION` bump.

### Changed

- 2026-09-23: **`cost.json` writes each request and each marker on one line.** A downstream ledger drops from
  33,051 lines to 823, and the parsed JSON is unchanged. This PR's `SKILLS_VERSION` 6.14.0 → 6.14.1 patch
  covers it: shipped emitter bytes changed, and no ledger content did.
  ([`pharn/floor/render-cost-ledger.mjs`](./pharn/floor/render-cost-ledger.mjs),
  [`pharn/pharn-contracts/cost-ledger.md`](./pharn/pharn-contracts/cost-ledger.md),
  [`.dev/features/cost-ledger-compact-rows/`](./.dev/features/cost-ledger-compact-rows/))
  - **The failure, from a downstream project.** `pharn-starter`'s PR #104 added 38,927 lines, and 33,051
    of them were one file, a 630-row `/pharn-loop` ledger. The emitter wrote
    `JSON.stringify(ledger, null, 2)`, which expands every row's nested `usage` object, about 52 lines per
    request. The contract's Size section had disclosed the cost in KiB. The cost that hurt was lines in a
    diff, and nobody had measured it.
  - **Change.** A new `serializeLedger()` is used by both the file write and `--stdout`. It writes the two
    fact arrays, `markers[]` and `requests[]`, one element per `\n`-delimited line, and pretty-prints the
    rest. The derived views stay readable. The schema, keys, values, key order and determinism are
    unchanged. Every consumer in this repo reads the file through `JSON.parse` or names it by path, and the
    sweep is recorded in the increment's `PLAN.md`.
  - **Measured on 2026-09-23**, by re-serializing the 14 ledgers committed in that project (each parses
    deep-equal):
    - the 630-row ledger: 33,051 → 823 lines and 960,206 → 629,344 bytes;
    - all 14: 231,615 → 6,922 lines and 6,704,361 → 4,402,399 bytes.

    The contract's "Size" section now carries these figures, and the emitter header and `CLAUDE.md` point
    there instead of restating an older number.

  - **Tests.** Parse-equality is checked over six emitter shapes. A closure-style layout check requires
    every element to be one whole JSON value on its own line, and the old layout fails it as a mutation
    control. The file write and `--stdout` are checked byte-for-byte against `serializeLedger`, and two
    emissions are compared for byte-identity. The checker and the run-report reader both accept the
    written file.
  - **Bounds and deferrals.**
    - A ledger committed before 6.14.1 keeps its old layout until its feature is emitted again. That one
      re-emission rewrites the whole file once.
    - `JSON.stringify` leaves U+2028, U+2029 and U+0085 raw. "One line" means one `\n`-delimited line.
    - The verbatim `usage` copy is still 60.7% of that ledger's bytes, and `usage.iterations[]` alone is
      22.0%. Dropping either is a fidelity and schema decision. It was considered and deferred.

### Fixed

- 2026-09-23: **`check-cost-ledger.mjs --verify-transcript` no longer REDs a genuine ledger whose session
  continued after the run** (`SKILLS_VERSION` 6.14.0 → **6.14.1**, patch: a correction to a shipped floor
  checker and its contract)
  ([`pharn/floor/check-cost-ledger.mjs`](./pharn/floor/check-cost-ledger.mjs),
  [`pharn/pharn-contracts/cost-ledger.md`](./pharn/pharn-contracts/cost-ledger.md),
  [`.dev/features/cost-ledger-verify-tail/`](./.dev/features/cost-ledger-verify-tail/)).
  - **The failure, from a downstream project.** A `/pharn-loop` ledger committed in `pharn-starter`
    (`pharn-cost-ledger/2`, 630 rows, `excluded_requests: 423`) went RED with
    `excluded_requests does not match the transcript (423 recorded, 508 re-derived)`. The rows and totals
    re-derived exactly, and the re-derived count kept rising between runs. Re-run with 6.13.0's checker
    here it read 550, then 640. `excluded_requests` is counted at emission. It covers two parts:
    - the requests before the window (422 here), which stay fixed because the transcript is append-only;
    - the requests after the window's end. That part was 1 at emission, the emission's own turn, and it
      keeps growing while the session continues (the stop's commit, the conversation after it).

    The equality check therefore failed every real stop.

  - **Fix.** The emitter counts, without writing it, how many excluded requests lie after the window's end
    (`isAfterWindow` in `run-window-core.mjs`; `deriveLedger` returns it next to the unchanged ledger). The
    checker accepts `excluded_requests` in `[before, before + after]` and REDs outside that range. The rows
    and totals are still compared exactly. **Nothing in `cost.json` changes:** the same schema, key set and
    bytes. A ledger written by an earlier version needs no re-emission. The downstream ledger now verifies
    GREEN with one WARN.
  - **Bound, stated in the contract and in a WARN.** The range is exact for the before-window part and
    only an upper bound for the tail, so an inflated value up to the live total passes, and a test pins
    that. Pinning the tail exactly would need the emission's moment in the file, which is a schema change,
    deferred. An OPEN window (no `run-stop`) still REDs a continued session on its rows. Both emitters
    write `run-stop` first, so that residual is named, not fixed.
  - **Tests.** A committed tail fixture (`fixtures/cost-ledger/session-continued.jsonl`) is appended after
    emission. The continued-session case was RED on the unfixed checker (`7 recorded, 10 re-derived`)
    before the fix. One table executes both edges of the range and one value past each. `deriveLedger` is
    pinned byte-for-byte to `renderLedger` over six fixture shapes.
  - Only 1 of the 14 ledgers that `pharn-starter` has committed is `/2`. The other 13 are legacy `/1`
    files, and `--verify-transcript` still declines those with a WARN, as before.
  - First opened as 6.13.1 in #252; #254 took 6.13.1 and #253 took 6.14.0 on `main` before it merged,
    so it was rebased and re-bumped to 6.14.1.

## [6.14.0] - 2026-09-23

### Added

- 2026-09-23: **A project can replace PHARN's default SPEC template with its own, at one fixed and
  write-protected path, `pharn.spec-template.md` at the project root. `/pharn-spec` fills whichever template
  `check-spec.mjs --resolve-template-ref` selects: the project's when it exists and validates, else the
  shipped default. `SKILLS_VERSION` 6.13.0 → 6.14.0** (minor: a new capability). `MIN_CLI` stays 0.5.0: no
  installed path moves, and the project template is created by the user, never installed.
  - **Why the path is fixed, not configurable.** A template's guidance comments are instructions `/pharn-spec`
    follows. A path read from `pharn.config.json`, which no guard protects, would let a build agent point every
    future `/pharn-spec` at a file it wrote. So the path is a constant, and
    `.claude/hooks/protect-trusted-paths.cjs` denies Write/Edit/MultiEdit/NotebookEdit to it by path, whether
    or not the file exists. A human edits the file directly. The hook change is a human-applied patch
    (`.dev/features/spec-template-override/proposed/`), because the hook protects itself. Bash still reaches
    the file; `check-bash-reconcile.mjs` detects a non-adversarial Bash write only between a build's anchor and
    its verify, which is after `/pharn-spec` ran.
  - **Resolution never falls back silently.** Once an entry in the project root case-folds to
    `pharn.spec-template.md`, every failure is a refusal (exit 1, nothing printed). A case variant is itself a
    refusal (`name-case`), so case-insensitive and case-sensitive filesystems resolve a checkout the same way.
    Absence is read from the directory listing, never from a link-following stat, so a dangling symlink is
    `symlink`, not "absent" (L54). The file is read through an `O_NOFOLLOW` descriptor. A checker reached
    through a symlinked `pharn/` refuses (`symlinked-root`): before that fix, found at review, it silently
    skipped the project's template for the default.
  - **Every template is validated before its reference is printed**, the shipped default included, by a new
    pure `validateTemplate()` in `spec-template-core.mjs`, with twelve closed refusal codes. A validated
    template has a MINIMUM shape; it does not prove a SPEC filled from it will be GREEN.
  - **Provenance is unchanged.** `project` is a static registry id, so rule 7 knows it whether or not the file
    exists, and deleting the template never REDs a SPEC already pinned to it. The `pharn-` id prefix is
    reserved for shipped templates.
  - **New modes:** `check-spec.mjs --resolve-template-ref` and `--template-path <id>`. `--template-ref <id>`
    keeps its contract and now validates first.
  - **The shipped default template is now id-agnostic** (its placeholder and top comment no longer say
    `pharn-default`), so a project's copy inherits no claim about its own id. Its digest changes once, which
    is provenance only.
  - **Correcting the record.** `pharn/pharn-contracts/spec-template.md` and `/pharn-spec` said the shipped
    template sits where the fail-closed write guard's default lets an agent write. In an install that default
    denies it (probed: `enforce-writes-scope.cjs` exit 2). The real weakness is different: a set scope that
    names it admits it, and no hook protects it. Both sentences are corrected.
  - **Human follow-ups (trusted docs, not agent-written):** `LIMITS.md` §1d, `THREAT-MODEL.md` §2 and
    `pharn/ARCHITECTURE.md` §4 could name the project template. See
    `.dev/features/spec-template-override/PLAN.md`.

## [6.13.1] - 2026-09-23

### Fixed

- 2026-09-23: **Every `markdownlint-cli2` run a command prescribes now lints only the files it names
  (`--no-globs`)** (`SKILLS_VERSION` 6.13.0 → **6.13.1**, patch: a correction to two shipped product
  commands) ([`.claude/commands/pharn-ship.md`](./.claude/commands/pharn-ship.md),
  [`.claude/commands/pharn-memory-promote.md`](./.claude/commands/pharn-memory-promote.md), eight
  `pharn-dev-*` commands, [`.dev/floor/command-hygiene.test.mjs`](./.dev/floor/command-hygiene.test.mjs),
  [`.markdownlint-cli2.jsonc`](./.markdownlint-cli2.jsonc),
  [`.dev/features/markdownlint-no-globs/`](./.dev/features/markdownlint-no-globs/)).
  - **The failure.** markdownlint-cli2 ADDS its config's `globs` to the paths it is given. It does not
    replace them. This repo's config declares `**/*.md`, so `npx markdownlint-cli2 --fix <one file>`
    linted and fixed every markdown file those globs reach. Measured: `Linting: 1340 files` for one named
    file. That was the form every per-stage format step prescribed as "scoped to this stage's own
    artifact" (`lessons-learned` L13). On 2026-09-23 a `/pharn-dev-build` Step 2b run rewrote 124 files
    inside another Claude session's worktree under `.claude/worktrees/`, two of them tracked test
    fixtures. The config's `ignores` did not stop it, because every entry there matches only at the
    root. This is `lessons-learned` L19's class recurring inside the remedy that L19 and L16 prescribed.
  - **Fix.** Ten invocations gain `--no-globs`. Eight run `--fix`: the seven dev format steps (plan,
    grill, build Step 2b, regress, verify, review, ship) and `/pharn-ship`'s `BRIEFING.md` step. Two are
    the read-only memory-promote checks, dev and product, which reported on every globbed file. Measured with the flag: `Linting: 1 file`. Every `ignores` entry
    still applies, so the trusted docs stay out of reach (`--no-globs LIMITS.md` lints 0 files).
    `.markdownlint-cli2.jsonc` also ignores `.claude/worktrees` (git-excluded, so no tracked file loses
    coverage). A bare `npm run lint:md` in a main checkout therefore no longer reads other sessions'
    worktrees.
  - **Tests.**
    - A closure test in `command-hygiene.test.mjs` requires `--no-globs` on every invocation in every
      command. The flag must follow the tool name and come before any shell comment.
    - The commands that invoke the tool must equal `MARKDOWNLINT_SITES`: ten files spanning both
      surfaces.
    - A discrimination test covers the incident's exact lines, and a mutation control strips the flag
      from each real site in turn. Replayed against the pre-fix commands, the rule flags exactly the ten
      old lines.
    - A premise test runs the installed binary read-only. At the real path it checks 1 file and 0 files.
      In a scratch tree holding this config's bytes, the negative control lints 2 without the flag and 1
      with it, and a bare run skips `.claude/worktrees` (4 files once that entry is removed).
    - The existing ACCEPTED list had asserted the flagless form was "a scoped path". It is re-stated
      with the flag.
  - **Also fixed, found by the sweep.** `capability-catalog-core.test.mjs`'s style test wrote a config
    without globs and spawned `--config cfg file`. The cwd config's globs were still added, so it linted
    ~1341 files (that spawn shape measured at 14.6 s; 0.45 s with the flag), and any lint issue anywhere in the tree failed it as "markdownlint flagged the
    spliced README". It now passes `--no-globs` and asserts `Linting: 1 file`.
  - **Not claimed, and named:**
    - `--no-globs` narrows a tool's REACH and gates nothing. A Bash-run tool still passes neither write
      guard, an explicit path into another worktree is still written, and L19 stays true.
    - The test pins a vocabulary. An invocation through a shell variable, `node node_modules/…`, or a name
      split across lines is not recognized.
    - `--no-globs` first shipped in markdownlint-cli2 0.12.0. How an older binary in a user's project
      treats it has NOT been measured, and both product commands say so.
    - The premise test is skipped where the dev toolchain is absent, and a skip exits 0.
    - The ignore is tied to where Claude Code places worktrees today.
    - `prettier --check .` also descends into a nested `.claude/worktrees/` (measured). That is deferred
      to a separate increment.

## [6.13.0] - 2026-09-23

### Added

- 2026-09-23: **`/pharn-spec` now fills a shipped SPEC template, and `check-spec.mjs` enforces that template's
  shape on any SPEC declaring `spec_template` — above all an ID'd, testable acceptance-criteria grammar that later
  stages can key on. `SKILLS_VERSION` 6.12.1 → 6.13.0** (minor: a newly shipped template, contract and checker
  rules). `MIN_CLI` stays 0.5.0: pharn-cli has copied `pharn/pharn-contracts/` whole and recursively since that
  version, for both install and update.
  - **The template and its contract.** [`pharn/pharn-contracts/templates/spec-template.md`](./pharn/pharn-contracts/templates/spec-template.md)
    (id `pharn-default`) has nine sections: Intent, Scope, Scenarios, Acceptance Criteria, Constraints, Data,
    Assumptions, Open Questions and Success Metrics. Five of them are required. Each carries a
    `<!-- pharn:guidance … -->` comment that `/pharn-spec` removes. [`pharn/pharn-contracts/spec-template.md`](./pharn/pharn-contracts/spec-template.md)
    defines the sections, the grammar, the clarification marker and the rules. The template sits under
    `pharn-contracts/` rather than the brief's `pharn/pharn-pipeline/templates/`, because pharn-cli copies only the selected griller directories from `pharn-pipeline/` (lenses live under `pharn-review/`), so a template there would never reach an install.
  - **Seven opt-in rules, one RED kind each,** in a new pure module,
    [`pharn/floor/spec-template-core.mjs`](./pharn/floor/spec-template-core.mjs), which
    [`pharn/floor/check-spec.mjs`](./pharn/floor/check-spec.mjs) imports. The split keeps the §6 pin and state
    logic apart from the template rules, which the planned template-override increment will change.
    - `section`: Assumptions is required, each template section appears at most once, and no template heading
      may sit inside a fenced block, an HTML comment or a `<pre>`-style block opened at column 0, where a
      renderer would not show it;
    - `ac`: every criterion is `- **AC-<n>** Given … When … Then …` with exactly one indented
      `- verify: unit | integration | e2e` line, where a verify level spelled `**verify:**`, `1. verify:` or
      bare `verify:` also counts toward the one, and every other line in the section is blank or an indented
      continuation;
    - `clarification`: at most three `[NEEDS CLARIFICATION: …]` markers, and none once Approved;
    - `out-of-scope`: at least one non-goal under `## Scope`;
    - `optional-section`: an optional section that is present is not empty;
    - `guidance`: no guidance comment remains;
    - `template`: `spec_template` is `<id>@sha256:<64-hex>` and names a known id.

    A new mode, `--template-ref <id>`, prints that value, and `/pharn-spec` copies its output rather than
    computing a hash.

  - **Legacy SPECs are untouched.** The rules apply only when the frontmatter has a line starting
    `spec_template:`, tested on the raw frontmatter text, so a key line the field parser cannot read still
    opts in (and REDs). All 48
    pre-existing `check-spec` tests pass unchanged. A differential run of `main`'s checker against this one gave
    byte-identical stdout, stderr and exit codes on all 80 runs: 20 inputs (both committed SPECs and 18 legacy
    fixture shapes) under 4 modes each.
  - **`/pharn-spec`** fills the template, and its inline skeleton is gone. Its interrogation also checks that
    each Then is observable on the public surface, warns when PHARN's gate discovery finds no `test` script
    (a project using another runner names it through `--gates`), and asks whether an e2e criterion has a
    runner. A marker left in the Draft blocks approval. An existing legacy SPEC is revised in
    place and migrated only when its owner chooses. **`/pharn-loop`** gains stop S6b,
    `blocked: needs-clarification`, and its record's `spec:` line gains `not approved`.
  - **Bounds, each stated in the contract and in `spec-template-core.mjs`'s header.**
    - A valid grammar means the criteria are **phrased** testably, never that any test exists, runs, or passes.
      PHARN writes and runs no acceptance tests today.
    - The rules are opt-in, so deleting the key bypasses them.
    - The criteria are read line by line, not by a markdown parser, and which headings exist comes from a small
      model of the blocks that can hide one. A block opened 1–3 columns in at the top level, or an HTML block
      that ends at a blank line, can still hide a heading unnoticed (named residual
      `spec-ac-grammar-differential`: no reference-parser test pins the model).
    - Unfilled `<placeholders>` are not detected.
    - `spec_template` is provenance only: nothing compares it with the template file.
  - **Also fixed here:** `pharn/floor/gate-run-core.mjs:15` now cites `CHANGELOG [6.3.0]` in place of the stale
    `CHANGELOG.md:1817-1818`, the deferral recorded in the `changelog-per-pr` entry below.
  - **Lesson L56 promoted** to `.dev/memory-bank/lessons-learned.md` through `/pharn-dev-memory-promote`, with the
    human's accept, and `docs/lessons-index.md` regenerated (apparatus only). L55 recurred in this increment:
    the grammar's stated limit was itself wrong, and the fix's model diverged from the renderer twice more
    before three review rounds came back clean.
  - **Trusted docs, edited by the human outside the agent loop** (they are hook-protected):
    - `LIMITS.md` §1d now says that a valid AC grammar means the criterion is phrased testably, not that any
      test exists, runs, or passes, and that the template rules are opt-in by the `spec_template` key;
    - `pharn/ARCHITECTURE.md` §4 lists the `spec-template` contract, and its §6 spec row names
      `spec_template` as provenance. This moves the `pharn/ARCHITECTURE.md` content hash that dev plans pin.

- 2026-09-23: **Every PR now adds a dated CHANGELOG entry, every `SKILLS_VERSION` bump opens its own dated section, and merged
  entries are append-only — held by two checks over one shared grammar** (no `SKILLS_VERSION` bump: only `.dev/**`, a
  `pharn-dev-*` command, CI and repo meta change) ([`.dev/floor/changelog-core.mjs`](./.dev/floor/changelog-core.mjs),
  [`.dev/floor/check-skills-version-recorded.mjs`](./.dev/floor/check-skills-version-recorded.mjs),
  [`.dev/floor/check-changelog-entry.mjs`](./.dev/floor/check-changelog-entry.mjs),
  [`.dev/features/changelog-per-pr/`](./.dev/features/changelog-per-pr/)). This is the `changelog-per-pr` follow-up the entry
  below names.
  - **The repo-state check, `npm run check:changelog` (extended, still in `npm run check`).** It used to prove only that the
    `SKILLS_VERSION` string appeared somewhere. Now:
    - the first `## [X.Y.Z] - YYYY-MM-DD` section must be `SKILLS_VERSION`'s;
    - sections run strictly newest first, and no date increases downward;
    - every level-2 heading is exactly `[Unreleased]` or that version form;
    - every `[Unreleased]` entry carries a real, non-future authored date, and none is older than the newest section;
    - no entry appears twice.
  - **The per-PR check, `.dev/floor/check-changelog-entry.mjs` (new).** It runs in CI on pull requests, against the merge
    commit's own base (`HEAD^1`). Locally it runs as `npm run check:changelog-entry`, against the merge-base with `origin/main`. It
    refuses a PR that:
    - adds no entry;
    - edits or deletes a merged one;
    - moves or copies an entry into a released section;
    - changes a released section in any other way — its heading, its entries' order or grouping, or a line that belongs to
      no entry (an asterisk bullet, stray prose, a merge-conflict marker);
    - inserts a version section below the newest;
    - bumps and leaves any entry, its own included, under `[Unreleased]`.

    The one permitted edit to a merged entry is re-dating one that stays in `[Unreleased]`, which is how a stale one is
    repaired. It is not in `npm run check`, because it needs a base.

  - **Its grammar follows CommonMark's block rules for the constructs that decide whether a heading renders at all** — list-item boundaries, fence
    opener and closer indentation, and the raw HTML blocks that run to their own closer — so an unclosed block that makes
    GitHub stop rendering the rest of the file hides the base's headings from the diff check too, and it fails closed. Stated
    exceptions: setext headings, asterisk/plus items, headings inside nested items or blockquotes, and HTML blocks that end
    at a blank line — one of those placed directly above a released heading can hide that heading on GitHub.
    Two rounds of the increment's own review demonstrated six holes in earlier versions (a heading hidden behind an in-entry
    fence, text outside any entry, a bump leaving its own entry under `[Unreleased]`, a 4-space fence "closer", an unclosed
    `<pre>`, and regrouped or reordered released entries), and a third review found a one-line HTML opener such as `<!-->`
    read as unclosed; all were fixed before merge.

  - **What neither check proves.** That an entry describes its change, that a date is when anything merged, or that a bump was
    needed or the right size (`lessons-learned` L43; the check that would bind a bump to the product bytes it covers is still
    unbuilt). Direct pushes to `main` are unchecked by the per-PR step, an admin merge bypasses required checks, the verdict is
    for the merge commit as of the PR's last CI run, and a PR runs its own copy of the checker.
  - **Known costs, measured over the last 100 first-parent commits on `main` and documented in `CONTRIBUTING.md`.** 26 of 94
    non-dependabot commits changed no CHANGELOG line and would now need an entry. A released entry corrected in place (#199)
    becomes a new entry. A revert rolls forward, and so does a reverted bump. A no-bump PR rebased over a later bump re-dates its
    entry. A Prettier upgrade that reformats released text needs a maintainer decision.
  - **Deferred.** `pharn/floor/gate-run-core.mjs:15` still cites `CHANGELOG.md:1817-1818`, which now points into `[3.0.2]`. The
    fix is the version-anchored cite `CHANGELOG [6.3.0]`, but the file is product surface, so it waits for the next increment that
    bumps.

### Changed

- 2026-09-23: **`CHANGELOG.md` is cut into one section per `SKILLS_VERSION` that existed on `main`, built from git history** (no `SKILLS_VERSION` bump: only this file and `.dev/**` change). pharn-cli installs the tip of `main` and `pharn update` links here, so every bump on `main` is a release, and one `[Unreleased]` block could not say what changed in a given version. The 142 entries that sat under `[Unreleased]` and `[5.0.0]` were moved byte-for-byte into 84 version sections by `.dev/features/changelog-sectioning/sectionize.mjs`, which files each entry under the version whose bump window introduced it (`git log --first-parent -S`, last introduction wins); 6 needed a reviewed override, and each is listed with its evidence in `.dev/features/changelog-sectioning/MIGRATION.md`. **No entry text was edited, so some entries still name a version they are not filed under:** entries naming 2.2.0, 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7 (filed under 2.2.8); 2.3.1, 2.3.2 (filed under 2.3.3); 2.4.3, 2.4.4, 2.4.5 (filed under 2.4.6); 2.5.3 (filed under 2.5.4); 2.7.7 (filed under 2.7.8); 3.1.3 (filed under 3.2.1); 5.0.0, 5.0.1, 5.1.0, 5.1.1 (filed under 5.1.2); 6.5.1 (filed under 6.5.2) — none of which existed on `main` — and an entry naming 6.5.0 is filed under 6.5.2. For the same reason, 34 entries still say "above" or "below"; where that points at another entry it was written for the old layout, and at least 6 now point the wrong way (all are listed in `MIGRATION.md`). 2 entries that reach `main` in `8753940`, the first-parent commit where `SKILLS_VERSION` 1.0.0 first appears, are filed under `[1.1.0]` by a reviewed override, because `[1.0.0]` is kept byte-for-byte (the evidence is in `MIGRATION.md`). The `## [5.0.0] - 2026-09-10` heading is gone: that version never existed on `main`. `[6.5.0]` keeps a section with a one-line placeholder, because it was on `main` and therefore installable. One line was dropped: a committed merge-conflict marker (`> > > > > > > 940eb16 …`) that sat between two entries. `[1.0.0]` is unchanged. Its heading date (2026-06-23) is the date `126e2b3` first set `SKILLS_VERSION` to 1.0.0, on a branch that reached `main` at `8753940` (2026-06-24). No git tag or GitHub release was cut. Every `CHANGELOG.md:<line>` cite past line 14 elsewhere in the repo now points at moved text; the one outside `.dev/features/` (`pharn/floor/gate-run-core.mjs:15`) was already stale and is deferred to the next product-surface change. The `[Unreleased]` intro comment and `CLAUDE.md` still route a new entry into `[Unreleased]`; giving each bump its own section is the follow-up `changelog-per-pr`.

### Fixed

- 2026-09-23: **A time-bombed hook test no longer fails every branch.** `.claude/hooks/require-loop-record.test.cjs`'s "CLI:
  blocks from a SUBDIRECTORY" test (from #243) dated its `/pharn-loop` marker from a fixed clock (2026-09-22T12:00Z). But the
  CLI subprocess it spawns judges the marker against the real clock under the hook's 24-hour age ceiling, so from
  2026-09-23T12:00Z the test failed on `main` and on every PR. The marker is now dated from the real clock. It is a test-only
  fix, so there is no `SKILLS_VERSION` bump. It was found while shipping `changelog-per-pr`, whose own CI it would have
  turned RED. No other CLI test in that file shares the defect: they open their run with `--open`, which writes the real time.

## [6.12.1] - 2026-09-23

### Fixed

- **`run-gates.mjs` refuses a dangling symlink or a file component in `--out` with a document instead of
  crashing** (`SKILLS_VERSION` 6.12.0 → **6.12.1**, patch: a correction to a shipped floor checker)
  ([`pharn/floor/run-gates.mjs`](./pharn/floor/run-gates.mjs),
  [`.dev/features/run-gates-dangling-link-containment/`](./.dev/features/run-gates-dangling-link-containment/)).
  - **The failure, reproduced at `daaa999`.** `assertContained` used `existsSync` as its absence test.
    `existsSync` stats, and a stat follows a link, so each of these read as absent and the walk stopped
    before `lstat` saw it:
    - a dangling symlink component (`.pharn/linked` → missing);
    - a regular file as a component (`.pharn/afile/gates`);
    - a dangling symlink as the state root itself.

    `init` then crashed in `mkdirSync` with a stack trace, exit 2, and **no JSON document and no closed
    `reason_code`**. Nothing was written outside the state root. `run --next` never reached the walk: it
    reads `state.json` first and exits `stamp-missing`. This is instance (1) of `lessons-learned` L54,
    first recorded in `loop-freshness`'s REVIEW.

  - **Fix.** Absence is now proven only by `lstat`'s own ENOENT. A dangling link is lstat'ed as a symlink
    and refused. Any other `lstat` error is refused under `path-containment` because the walk cannot
    prove the path safe, not because it found an escape. The closed `reason_code` vocabulary is
    unchanged.
  - **Test.** One CONTAINMENT test iterates all three shapes (L52), with the ordinary `--out` as the
    non-vacuity control (L34). Each case was confirmed to crash on the unfixed code before the fix (L4).
  - **Not changed, and named:**
    - `run --next` still reads `state.json` before its containment check. That is a read, and there is no
      observed failure.
    - A general check banning `existsSync` in containment code stays unbuilt; L54 records why.

## [6.12.0] - 2026-09-23

### Added

- **The `/pharn-loop` Stop guard is wired in the shipped `settings.json`, and `require-loop-record.cjs`
  joins the write-guard control surface** (`SKILLS_VERSION` 6.11.1 → **6.12.0**, minor: a newly shipped
  product `.claude/` capability — the Stop entry plus protecting the fourth hook. `MIN_CLI` is untouched)
  ([`.claude/settings.json`](./.claude/settings.json),
  [`.claude/hooks/protect-trusted-paths.cjs`](./.claude/hooks/protect-trusted-paths.cjs),
  [`.claude/hooks/set-writes-scope.cjs`](./.claude/hooks/set-writes-scope.cjs),
  [`.dev/features/loop-stop-guard/`](./.dev/features/loop-stop-guard/)).
  - **Wiring.** One matcher-less `Stop` hook in exec form (`command` + `args`, `timeout: 10`), anchored on
    `${CLAUDE_PROJECT_DIR}` — the exact entry `hook-wiring.test.cjs` already bound. A new Claude Code
    session loads it; an existing install whose `settings.json` the installer preserved still needs the
    entry by hand (`pharn update` never edits that file).
  - **Control surface.** `DEFAULT_PROTECTED` / `CONTROL_SURFACE` / `reconcile-ignore.json`
    `always_reconciled.exact` now include `require-loop-record.cjs` (six exact entries), so a Write/Edit
    to the Stop guard is denied the same way as the three write hooks. Applied by a human outside the
    agent loop (fix #2), then verified live: Edit → exit 2.
  - **Trusted docs.** `LIMITS.md` §7 names the fail-open Stop bound; `CONSTITUTION.md` names the wired
    `Stop` guard beside the two `PreToolUse` write-guards.
  - **Docs.** README's "as of `6.11.1` … lands inert" clause is retired; `CLAUDE.md` and
    `pharn/floor/README.md` say four hook scripts.

### Fixed

- **The hand-written docs now match the last 20 commits (6.4.3 → 6.11.1), and one expired install claim is
  gone.** Repo meta only, so no `SKILLS_VERSION` bump. The sweep read every commit's files against
  README, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/**` and the trusted docs. Generated regions
  were already current (`docs:check` GREEN), and five sentences were not
  ([`.dev/features/docs-sync-6-11/`](./.dev/features/docs-sync-6-11/)).
  - **README, the Stop guard (6.11.0).** The installer copies every `.claude/hooks/*.cjs`, so
    `require-loop-record.cjs` lands in every install, while the shipped `settings.json` wires only
    `PreToolUse`. README called the hooks "write-gating" and "the write guards". It now says the Stop
    guard is not a write guard, does nothing unless registered under `Stop`, and "as of `6.11.1`" lands
    inert. That last clause will expire, so `loop-stop-guard/settings-patch/APPLY.md` gains the step to
    revise it when the wiring ships.
  - **README, the gate runner (6.8.0).** The guarantees table gains a row: the verify and regress
    verdicts come from a map the runner wrote, not one a model typed. Its bound is taken from
    `gate-run-record.md`: internal consistency, not provenance; nothing about whether the stage ran; and
    `check-loop-fresh.mjs` as the narrowing, which gives tree identity, not recency.
  - **README, the install tree.** The artifact comment listed seven files, predating `cost.json` and
    `RUN-REPORT.md`. It now also names `BRIEFING.md` and `LOOP.md`, and it sits under `pharn/`, where the
    directory actually is.
  - **README and `CLAUDE.md`: "the installer copies `CONSTITUTION.md` and `ARCHITECTURE.md` only" had
    expired** (`lessons-learned` L33). pharn-cli `7c54820` (first tagged `v0.4.0`) installs all four
    trusted docs, and `MIN_CLI` 0.5.0 refuses every older CLI that honors it.
    - README's limitation bullet is removed, and the install list names all four docs.
    - `CLAUDE.md` keeps its point that the versioning unit is not "files an install contains", now for
      the reason that still holds: only the selected capabilities are copied. It also names the one CLI
      the gate cannot reach, pre-0.4.0, because `minCliGate` itself first shipped in 0.4.0.
  - **`SECURITY.md`.** "the `.cjs` hook or the `.mjs` validator" becomes hooks and checkers, plural;
    there are four hook scripts now.

## [6.11.1] - 2026-09-22

### Changed

- **`/pharn-build` and `/pharn-regress` no longer read `SPEC.md`'s body** (`SKILLS_VERSION` 6.11.0 → **6.11.1**,
  patch: a clarification to shipped command bytes. The spec→plan hash chain is byte-identical, and `MIN_CLI`
  is untouched) ([`.claude/commands/pharn-build.md`](./.claude/commands/pharn-build.md),
  [`.claude/commands/pharn-regress.md`](./.claude/commands/pharn-regress.md),
  [`.dev/features/build-regress-spec-unread/`](./.dev/features/build-regress-spec-unread/)).
  - **The mismatch.** Both said "Read both." but consumed nothing from the SPEC body. Build builds from
    `PLAN.md`, and regress takes `## Files` and the carried `spec_content_hash` from `PLAN.md`. `SPEC.md` is
    needed only to EXIST and as an argument to `check-plan-spec-agree.mjs`, which reads and hashes it
    itself.
  - **The change.**
    - `SPEC.md` leaves both `reads:` lists.
    - Step 1.2 reads the PLAN only, and says the SPEC is hashed by the checker.
    - The prefix and the trust audit say the same.
    - Build's `BUILD.md` quotes from the plan only.
    - Each trust audit gains a P0 line: not reading `SPEC.md` is **ADVISORY**, because `reads:` is not
      enforced on the read side (`pharn/ARCHITECTURE.md` §3.1).
    - The required "intent fidelity is grill's job before build and verify's after" sentence is qualified
      in place. Both checks are advisory: grill's is its AC-coverage interrogation, and verify's is its
      verifier slot, which has zero verifiers today. So no gate moved.
  - **Rationale, exactly:**
    - P2: one fewer untrusted free-text body in the build and regress model context.
    - The declared inputs now match the actual inputs.
    - **Token saving is expected and unmeasured.** Standalone runs skip one SPEC read per stage. Inside
      `/pharn-loop`, which runs `/pharn-build` inline and reads the SPEC itself, the saving is only the
      per-iteration re-read. No number is claimed.
  - **Sweep.**
    - A full `grep -n -i spec` of both files classified 36 and 34 hits. That found one line the request
      had not listed, build's "quotes anything from the plan / SPEC".
    - The (a)/(b) lists after the build are in `VERIFY.md`.
    - `CLAUDE.md`, the README, `docs/**` and the four trusted docs contain no claim that these stages
      read the SPEC.
    - Both commands' `version:` go up a patch (0.1.1, 0.2.1).

## [6.11.0] - 2026-09-22

### Added

- **A `Stop` hook refuses to end a turn while an unattended `/pharn-loop` run in this session has no record**
  (`SKILLS_VERSION` 6.10.0 → **6.11.0**, minor: a newly shipped product hook and a new `/pharn-loop`
  capability. `MIN_CLI` is untouched, and **the hook ships INERT until a human wires it**)
  ([`.claude/hooks/require-loop-record.cjs`](./.claude/hooks/require-loop-record.cjs),
  [`.dev/features/loop-stop-guard/`](./.dev/features/loop-stop-guard/)).
  - **The gap.** #230 and #242 made the gate map tested code and made a stale stage re-run. Nothing
    stopped the model from ending the turn anyway. The §6.3.0 incident was exactly that: a run that
    finished early with a summary naming the gates it skipped.
  - **The guard.** `/pharn-loop` Step 1a runs `require-loop-record.cjs --open <name> --cap <M>`, which
    writes `.pharn/pharn-loop/<name>/active.json` bound to `CLAUDE_CODE_SESSION_ID`. The Final step runs
    `--close`. One file owns the marker schema (L35). While the marker names this session, the run has a
    feature directory, and `LOOP.md` is absent or empty, the Stop hook refuses the turn end. It does this
    **3 times per run in total** (`PHARN_STOP_GUARD_MAX`, 1–7, kept under the platform's documented
    8-consecutive-block override). After that it allows the end with a `systemMessage` saying the run
    ended without a record. A blocked record is a valid record.
  - **It is inert** for another session, a null session, plan mode, a marker older than 24 h, and a run
    with **no feature directory**. That last case was grill finding 1: a stop there writes no record by
    the loop's own rule, and the guard must not push the model to break it. It **never judges record
    quality**, and never checks freshness.
  - **Channel: exit 0 with JSON `decision: "block"`, not exit 2.** The guard fails OPEN, the opposite of
    the write guards. Only a complete, parsed document can block, so a crash, a partial write or any
    non-zero exit lets the turn end. The refusal renders as a "Stop hook error", which is cosmetic.
  - **What it cannot do** (verbatim in its header):
    - make a model do work;
    - judge a record;
    - tell a real record from a fabricated one;
    - act when Claude Code does not start it;
    - reach an existing install except by hand.
  - **Correcting the prompt's record.** `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` appears nowhere in the hooks
    reference. It was read from the raw page because a model summary of it invented a default twice (L37).
    The reference also documents a third channel the prompt did not name,
    `hookSpecificOutput.additionalContext`.
  - **Wiring is staged, not applied.** `.claude/settings.json` is protected (fix #2). The exact
    exec-form, matcher-less entry (`timeout: 10`) and its patch are in `settings-patch/APPLY.md`. They were
    generated and verified in a throwaway worktree: 315/315 hook tests pass with the entry applied.
    `hook-wiring.test.cjs` binds the committed file to that entry once it lands, executes it from a
    subdirectory, and has a negative control (L40/L45).
  - `workTreeRoot()` is now a three-way copy, and its ✧ pin covers all three.
  - The inert-path cost is ~0.03 ms in-process; a spawn costs node's own startup.
  - **Tests.**
    - 40 guard tests, at 96.5% line coverage of the hook: an inert set, each case paired with a blocking
      control; a fail-open set; the budget; `stop_hook_active`; containment; the Stop mode writing nothing
      but its counter; the marker modes; and a ★ test that executes `/pharn-loop`'s pinned
      `--open`/`--close` lines.
    - Hygiene pins for the two lines' positions, with mutants.
  - `pharn-loop.md` is now `version: 0.8.0`.

## [6.10.0] - 2026-09-22

### Added

- **`/pharn-loop` reads a stop only from evidence that belongs to THIS tree, and re-runs a stale or skipped
  stage instead of reporting it** (`SKILLS_VERSION` 6.9.3 → **6.10.0**, minor: a newly shipped product-floor
  checker and a new `/pharn-loop` capability. There is no stamp or report schema change and `MIN_CLI` is
  untouched) ([`pharn/floor/check-loop-fresh.mjs`](./pharn/floor/check-loop-fresh.mjs),
  [`.dev/features/loop-freshness/`](./.dev/features/loop-freshness/)).
  - **The failure.** §6.3.0's unattended run skipped `/pharn-grill`, `/pharn-regress` and `/pharn-verify` and
    still wrote a floor-grade-looking decision. #222 re-derives a decision from the reports it cites. #230
    made the gate map tested code and wrote `fingerprint.final` for "a later increment". An iteration that
    skipped a stage therefore still found the previous iteration's report and stamp on disk, and nothing
    noticed.
  - **The checker** is read at Step 5, before `check-loop.mjs`, and again as the first line of Step 6c. It
    runs ten checks, first failure decides:
    - reports exist;
    - a lapse `reason_code` re-runs the stage;
    - the three stamps validate;
    - each report is bound to its stamp by `sha256`;
    - the gate logs are the recorded bytes;
    - a live `spawnSync` re-run of `check-verify.mjs` / `check-regress.mjs` reproduces each report's floor
      fields;
    - the base stamp is the loop's base;
    - the verify stamp's final fingerprint is the live tree;
    - the regress head stamp ended on the tree verify started from;
    - with `--front`, the SPEC/chain/lessons checkers pass and `GRILL.md` exists.

    Fabrication checks run before staleness checks, so a forged report stops the run instead of being
    "refreshed". `check-loop.mjs` and `check-loop-decision.mjs` are byte-identical.

  - **A re-run is a counter, not prose.** `.pharn/pharn-loop/<name>/freshness.jsonl` holds one row per
    authorized re-run, one per stage per iteration by default (`--max-reruns`), then
    `rerun-budget-exhausted`. A re-run consumes no iteration. A persistent lapse, a forged verdict or a spent
    budget is the new stuck point **S11** (`blocked: stale-evidence`), and `empty-source-set` still routes to
    S4. A stale commit gate is the new outcome `not committed: evidence stale`.
  - **Vocabulary.** `gate-run-core.mjs` gains nine `REASON_CODES` members, the `LAPSE_CODES` subset
    (`entry-not-run`, `lock-busy`, `stamp-missing`, `stamp-unfinalized`, `tree-changed-between-gates`),
    `RESERVED_REASON_CODES` (empty), and `logBasename()`. `logBasename()` is the one copy of the runner's
    log naming, now imported by `run-gates.mjs` (L35). The closure test runs **both ways** now. Every
    member must have an emitter or a reserved entry, which is how `output-hash-mismatch` went unnoticed
    with no emitter. Check J is now its emitter.
  - **Correcting the record.** A gate that mutates a tracked file does **not** trip freshness: F compares
    verify's FINAL fingerprint, taken after its own gates. This repo's #230 dogfood stamp has no mutating
    gate.
  - **Bounds, stated in the header, the contract and the PR:**
    - **tree identity, not recency** — an iteration whose build changed nothing reuses old evidence. A test
      pins this, and transcript binding is a pending follow-up.
    - **agreement, never provenance** — every suite fixture is a self-consistent fabrication the checker
      certifies (L43).
    - it runs from the worktree and cannot vouch for itself.
    - the ledger is unauthenticated `.pharn/` state.
  - **Found by its own test:** the first ledger containment check used `existsSync`, which follows a link,
    so a DANGLING symlink read as absent and the append would have written through it. It is now
    `lstat`-based.
  - **Tests:**
    - every check fails alone with its own code and passes once repaired;
    - every `LAPSE_CODES` member;
    - lapse versus fabrication, both ways;
    - the incident (a skipped verify, then a skipped regress);
    - the recency bound, proven;
    - the budget and the commit gate;
    - defaults with no flags;
    - a git-subdirectory root;
    - hygiene pins for S11, the outcome and the call order, with mutants;
    - a **★ WIRING** test that executes both pinned `pharn-loop.md` lines.

    Line coverage of the new file is 99.74%. `pharn-loop.md` `version:` is 0.7.0.

## [6.9.3] - 2026-09-22

### Fixed

- **`/pharn-regress`'s base side can initialize again: the gate runner resolves every path operand against the directory it is invoked from** (`SKILLS_VERSION` 6.9.2 → **6.9.3**, patch: a correction to shipped floor bytes. No stamp schema change, no command edit, and `MIN_CLI` is untouched) ([`pharn/floor/run-gates.mjs`](./pharn/floor/run-gates.mjs), [`.dev/features/run-gates-base-cwd/`](./.dev/features/run-gates-base-cwd/)).
  - **The failure, reproduced before the fix.** `/pharn-regress` Step 4b pins the base-side `init` with `--cwd .pharn/pharn-regress/base`. Executed verbatim in a scratch repo after the pinned worktree and head lines, it exited **2 `spec-mismatch`**: it looked for the head record at `.pharn/pharn-regress/base/.pharn/pharn-regress/head/state.json`, inside the base worktree. `init` resolved `--out` and `--spec-from` against `--cwd`, while `run --next`, which takes no `--cwd`, resolved `--out` against the invoking directory. Even past `init`, the base stamp would have landed inside the worktree that Step 6 deletes. So the base side of the runner had been unreachable from its only caller since 6.8.0 (#230).
  - **Why no test saw it.** Every runner test used the default `--cwd .`, and the one base-side test passed no `--cwd` and no worktree (`lessons-learned` L41). The fix lived in the runner and the defect in its invocation, which is L45's shape.
  - **Fix.** `--out`, `--spec-from`, `--discover` and `--scope-json` all resolve against the invoking directory, and containment is checked against that directory's `.pharn/`. `--cwd` sets only where gates execute and which tree is fingerprinted. For `--discover` and `--scope-json` the change is a **no-op for every pinned caller**, since none of them passes `--cwd`. It is made so there is one rule, not two. The corollary is stated in the runner header and the contract: `init` and `run --next` for one `<out>` are issued from the same directory, as every pinned caller already does.
  - **Tests.** Each of the four path operands is checked with a non-`.` `--cwd`, from a counted set. A test pins that `--cwd` still decides where gates run. The regress pair runs end to end through a real `git worktree`. A **★ WIRING** test extracts the committed `pharn-regress.md` lines and executes them one block per shell: the worktree add, both inits, both drains, the verdict and the worktree removal. It then re-runs the verdict after the removal. `scope.json` is fixture-supplied, and the test header says so. Seven of the new tests fail against the pre-fix runner.

## [6.9.2] - 2026-09-22

### Fixed

- **`RUN-REPORT.md` no longer shows unmeasured usage as a measured window, or a previous run's ledger as the current one** (`SKILLS_VERSION` 6.9.1 → **6.9.2**, patch: corrections to shipped renderer and command bytes; no `cost.json` schema change) ([`pharn/floor/render-run-report.mjs`](./pharn/floor/render-run-report.mjs), [`.dev/features/run-report-ledger-honesty/`](./.dev/features/run-report-ledger-honesty/)). Both problems were found by the independent integration review of #232/#233/#234.
  - **F1.** Take a transcript that could not be read inside a KNOWN run window (`coverage: unavailable`, `membership: bounded|open`). `## Tokens` rendered "Measured population: the RUN WINDOW", then "excluded requests 0", then "nothing was recorded against a stage". A reader takes that for a zero. It now renders **"Run usage: UNAVAILABLE — not measured, and NOT a zero"** and quotes the ledger's `coverage_note` as DATA. The branch reads the `coverage` enum. `unknown` also quotes its note.
  - **F2.** A failed `render-cost-ledger.mjs` (for example exit 2 on bad usage) left the PREVIOUS run's `cost.json` in place. `check-cost-ledger.mjs` was GREEN on it, and the report rendered that run's `gate2` as the current run's. The renderer now binds the ledger to its referent. It compares the live `markers.jsonl`'s latest `run-start` with the one the ledger recorded, by `seq` AND `ts`. It compares identity, not "greater `seq`", so a reset `.pharn/` cannot make an old ledger read as current. When the two differ, the report renders a **STALE LEDGER** banner and `n/a` Outcome/Tokens/Files, and it no longer applies the old ledger's applicability label to the verdicts. With no live markers file it prints "ledger currency not checked" and never presents the ledger as proven current. `--markers-base` falls through to `mark-phase.mjs`'s single `DEFAULT_BASE`.
  - **Command prose (advisory).** Both `/pharn-ship` and `/pharn-loop` now say that a non-zero emitter exit means no ledger was emitted this run, so the checker's GREEN on an older file is not this run's.
  - **Bounds.** Staleness is blind when the failed run wrote no `run-start` either, and when the renderer is pointed away from the live markers. `check-cost-ledger.mjs` stays GREEN on a stale file, because it certifies consistency only.
  - **Tests.** They cover:
    - F1 through the real emitter CLI, for bounded and open windows, with a measured control;
    - F2 through a real failed-emission sequence rendered with NO `--markers-base` (the default path), with before and after controls;
    - a reset-`seq` identity case;
    - the no-markers-file line.

    The review's own probe now passes 18/18 when pointed at this tree.

## [6.9.1] - 2026-09-22

### Fixed

- **`/pharn-ship`'s reported `outcome` now uses only verdict evidence that belongs to the CURRENT run, and never a stale `LOOP.md`** (`SKILLS_VERSION` 6.9.0 → **6.9.1**, patch: a correction to shipped derivation bytes. There is no `cost.json` key or schema change, and `MIN_CLI` is untouched) ([`pharn/floor/ship-outcome-core.mjs`](./pharn/floor/ship-outcome-core.mjs), [`.dev/features/ship-outcome-evidence-applicability/`](./.dev/features/ship-outcome-evidence-applicability/)).
  - **Reachability (supported use, not a pure-function probe).**
    - `/pharn-spec` Step 1.1 resumes an existing `<name>`, so a second `/pharn-ship` on a feature appends a new `run-start`. The previous run's `verify-report.json` / `regression-report.json` stay on disk until overwritten, and no code invalidates them. That invalidation was instruction-only.
    - Against the pre-fix module (`9d866ed`), a run that stopped at grill derived **`gate2`** from the previous run's green reports. Now it derives `stop:pharn-grill`.
    - The emitter also chose the outcome source by artifact existence (`LOOP.md ?? derived`). A `/pharn-ship` run over a `/pharn-loop` feature directory therefore reported the old loop's `STOP_CAP` as its own outcome.
    - This concerns reporting integrity. `/pharn-ship`'s execution gates are unchanged.
  - **Fix.**
    - `verdictApplicability()` counts the two reports only when the CURRENT run carries `stage-start` markers for both `pharn-regress` and `pharn-verify` at its latest iteration. The current run is the one definition, `run-window-core.mjs`'s new `currentRunMarkers`. So an earlier run's pair, or an iteration-1 pair superseded by a started iteration 2, no longer establishes `gate2`.
    - `stop:<stage>` and `iterations` are read from the current run only.
    - An unknown run boundary yields the new vocabulary member **`undetermined`**, which is neither a failed check nor an invented stop stage. `SHIP_DECISION_FORMS` and its closure regex move together.
    - A `/pharn-ship` ledger never reads `LOOP.md`. `/pharn-loop`'s declared path is unchanged.
    - `RUN-REPORT.md` labels excluded reports **NOT FROM THIS RUN** or **CANNOT BE BOUND** with the same function, so the Outcome and Verdicts sections cannot disagree.
  - **Strength (P0).** The rule is exact relative to the recorded markers, which are advisory. It never uses mtime or file existence.
  - **Residual, pinned by a test and not fixed.** A stage that writes its stage-start and then refuses before emitting leaves the earlier report in place, and that report is accepted. This holds for every attempt. Closing it needs a report-side run identity or a lifecycle invalidation in `/pharn-ship`, and both are outside this increment by design.
  - **Tests.**
    - The stale run and applicable-run cases each have a positive control.
    - Mixed evidence, a retry (iteration 2 started, half done and done), resume vs new invocation, and missing, malformed and array reports.
    - Three unknown-boundary causes.
    - The pinned residual.
    - Source selection for ship and loop.
    - End-to-end CLI emit → `check-cost-ledger` → `RUN-REPORT.md` for applicable, stale and unknown evidence.

## [6.9.0] - 2026-09-22

### Fixed

- **A run's `cost.json` now measures the RUN, not the whole Claude Code session** (`SKILLS_VERSION` 6.8.2 → **6.9.0**, minor: a new membership rule, a new `mark-phase.mjs --pending-start` capability and ledger schema `pharn-cost-ledger/2`. Existing `/1` ledgers stay valid, so no install is invalidated and `MIN_CLI` is untouched) ([`pharn/floor/run-window-core.mjs`](./pharn/floor/run-window-core.mjs), [`pharn/pharn-contracts/cost-ledger.md`](./pharn/pharn-contracts/cost-ledger.md), [`.dev/features/run-scoped-token-accounting/`](./.dev/features/run-scoped-token-accounting/)).
  - **Root cause.** `render-cost-ledger.mjs` emitted every deduped usage-bearing request of the selected session. Phase markers fed only the stage VIEW (`attribute()`), never the population, so `totals` summed everything. **Reproduced against the pre-fix module (`81b5124`):** 100 input tokens of unrelated work at 09:00, then `run-start` at 10:00 and 10 input tokens at 10:05. The ledger reported `totals.input=110 requests=2 unattributed=2`, and the checker was GREEN. **After:** `totals.input=10 requests=1`, with `membership.excluded_requests=1`.
  - **The rule, `run-window/1`, has ONE implementation in `run-window-core.mjs`**, imported by the emitter and the checker. The current run starts at the LAST `run-start` by `seq`, so a new invocation gets a new window and a resume keeps its own. It closes at the LAST `run-stop` after that, so a re-emission extends the window and never truncates it. Each session opens at its first current-run marker, so a run resumed in a new session does not absorb that session's pre-resume work. Both bounds are inclusive, and timestamps are compared as NUMBERS, because `…:00Z` sorts after `…:00.000Z` as a string.
  - **Membership and attribution stay separate.** An in-run request with no stage marker is `unattributed` AND counts in `totals`. Every view uses the same member population.
  - **Unknown fails CLOSED.** These make membership `unknown`: no markers, no `run-start`, a malformed timestamp, a stop before the start, a stage marker after a `run-stop` with no new `run-start` (the markers may span two invocations), or no marker bound to the selected session. The ledger then is `coverage: unavailable` with no rows and `excluded_requests: null`, never whole-session usage and never a zero. A KNOWN window with no requests is an OBSERVED zero (`partial`, empty rows), admitted only under a known window.
  - **Spec work is inside the run.** `/pharn-ship` now calls `mark-phase.mjs --pending-start` before `/pharn-spec`, keyed by session id. The named `run-start --adopt-pending` then adopts that moment, marked `origin: "pending"`. Adoption is OPT-IN and only `/pharn-ship` uses it, so a pending file an abandoned ship leaves behind cannot widen a later `/pharn-loop` window. Review found that widening by probe while adoption was still unconditional. It also found that `--verify-transcript` passed silently on an `unknown` ledger (it now WARNs that nothing was bound), and that stage `attribute()` still compared timestamps as strings (now numeric, like membership). `/pharn-loop` needed no change, because its `run-start` already precedes spec.
  - **Consumers moved together.**
    - The emitter writes a closed `membership` block.
    - The checker's new RULE 8 recomputes the window from the file's own `markers[]` and REDs any row outside it.
    - `--verify-transcript` re-derives rows and `excluded_requests` under the RECORDED markers, never the live file.
    - `RUN-REPORT.md` labels the measured population (run window, UNKNOWN — not a zero, or legacy SESSION-scoped).
  - **Compatibility.** A `/1` file is validated under its own closed key set and WARNed as SESSION-scoped, never rewritten or retroactively REDed. `--verify-transcript` declines `/1` with a WARN.
  - **Tests.** Every critical expectation is a hand-computed literal, not a value read back from `buildViews`. The new cases cover:
    - 100 before / 10 during;
    - the spec boundary through a real pending adoption, including the documented initial-request gap;
    - membership vs attribution;
    - inclusive-edge ms tests;
    - a closed run with later activity;
    - byte-identical re-render;
    - a new invocation and a resume in a new session;
    - four unknown causes and an observed zero;
    - dedup and subagents within the window;
    - the 6.8.2 path-free notes;
    - a CLI emit → CLI check → report chain;
    - `/1` compatibility;
    - `--verify-transcript` on recorded markers and on a tampered `excluded_requests`.

    `command-hygiene` pins ship's `--pending-start` and its order before `/pharn-spec`. That proves the prose carries the call, never that an agent runs it.

  - **Bounds (P0).**
    - Membership is exact relative to the RECORDED markers. Markers are Bash-written command prose, so a skipped or stale one mis-bounds the window, including a stale pending start adopted after a skipped `--pending-start`.
    - The request that issues a boundary call precedes it.
    - The emission's own tail is outside the window.
    - Only the selected session's transcript is read. Another session's markers prove nothing was collected there.
    - `pharn-cost-record/1` inside `ship-record.json` stays SESSION-scoped. It is attested content, and the contract names the difference.

## [6.8.2] - 2026-09-22

### Fixed

- **An ordinary transcript miss no longer writes a local path into `cost.json`** (`SKILLS_VERSION` 6.8.1 → **6.8.2**, patch: a correction to bytes that already shipped — no new capability, command or checker) ([`pharn/floor/render-cost-ledger.mjs`](./pharn/floor/render-cost-ledger.mjs), [`.dev/features/cost-ledger-path-free-notes/`](./.dev/features/cost-ledger-path-free-notes/)) — two of the emitter's five `unavailable` branches built `coverage_note` by interpolating a directory: **no-dir** (no transcript directory matched the session) ended `under ${projectsDir}`, and **empty-selection** (a directory matched, but the transcript-file walk under it selected nothing, L51's guard) ended `under ${projectDir}`. The emitter wrote that string into `cost.json` and exited 0, and `check-cost-ledger.mjs` rule 3 then refused the artifact (`RED — absolute-path-shaped string(s) present: coverage_note = …`). Reproduced live before the fix through the real CLI write path. **So the expected "transcript not reachable" case produced a ledger the shipped checker rejects.** Both notes now say what happened without saying where, and the two cases stay distinguishable. No path-derived identifier replaces the path. **Unchanged:** the ledger shape (`coverage: "unavailable"`, `requests: []`, zero totals, every other field), the schema, `ABS_PATH_RE`, the checker, attribution, outcome derivation and `--stdout`. **Tests, and they failed first:** 5 of 49 cases failed on the pre-fix emitter, each for the expected reason (`serialized ledger contains the local path …` / `cost.json must not carry …`), and all pass after it. They cover the no-dir branch (A), the empty-selection branch through the existing `../decoy` boundary staging with no race and no test-only seam (B), the real CLI write path checked by the checker CLI (C), a second CLI case that omits `--projects-dir` and derives it from a scratch `CLAUDE_CONFIG_DIR` so the production default is exercised without reading real transcripts (L41), and a negative control proving the checker still REDs a synthetic absolute path in `coverage_note` (D). Following L29, the five `unavailable` branches are **enumerated in one list** that every rule iterates, and each entry proves which branch it reached through the lookup functions rather than through the note wording. **Bound (P0):** the fix covers paths the emitter itself discovered. `sessionId` is still interpolated, so a caller who passes an absolute-path-shaped `--session` still gets a note the checker rejects. That is hostile caller input, and this fix does not audit it. The sibling emitter `render-cost-record.mjs` keeps the same `under ${…}` pattern in its own `unavailable` notes. It is a different artifact, left out of this increment.

## [6.8.1] - 2026-09-22

### Fixed

- **The gate runner claims its lock through ONE exclusive-create call site, and the false quantifier the previous fix left behind is retracted** (`SKILLS_VERSION` 6.8.0 → **6.8.1**, patch: a correction to bytes that already shipped — no new capability, command or checker) ([`pharn/floor/run-gates.mjs`](./pharn/floor/run-gates.mjs), [`.dev/features/run-gates-lock-claim-site/`](./.dev/features/run-gates-lock-claim-site/)) — CodeQL alert **7** (`js/file-system-race`, CWE-367, security-severity **high**) is open against `main` at `run-gates.mjs:237`, pairing it with the check at `:220`, and its review thread is the one comment PR #230 left unresolved. **It is not a repeat of the alert before it — it is the first fix's own output.** Alert 6 paired `existsSync(lp)` with `openSync(lp, "wx")`; commit `81cb673` removed the `existsSync` and wrote "Exclusive create IS the claim — no existsSync first (that is a TOCTOU / CodeQL js/file-system-race)", which is right about `existsSync` and incomplete about the rule. The query was **fetched and read this run** rather than reasoned about ([[L37]]): `FileSystemRace.ql`'s `FileCheck` class lists `open`/`openSync` beside `existsSync`/`statSync`/`accessSync`, so replacing one member of the pair with a **second** `wx` leaves the pair standing — and its `useAfterCheck` predicate requires the check's basic block to **strictly** dominate the use's, which no node satisfies against itself. Hence the fix: `claimLock(lp, timeoutMs)` holds the file's only `openSync(lp, …)` and returns `{held, busy}`; `takeLock()` calls it, and on `busy` reads the incumbent, stale-checks it, unlinks it and calls **the same helper** again. **Nothing about the lock protocol moves** — same refusals, same two messages, same `lock-busy` reason code, same recorded payload — which is what makes the three pre-existing lock tests the regression control. **The deliverable is the ENUMERATION, not an assertion for the member in front of the author** ([[L29]], the lesson this alert is a textbook instance of): the new pin collects every `openSync(lp…)` in the source and `deepEqual`s the list to one element, a **closure** rather than a presence test, matching any flags because the flag string is exactly the parameterized fragment a variant spelling lands on ([[L36]]). Both mutations were run before the entry was written — a second `wx`, and a variant `openSync(lp, "r")` — and the pin fails on each. **One sentence is retracted and no count replaces it** ([[L47]]): `81cb673` also claimed "Two concurrent recoveries still cannot both win: the second `wx` decides", and that is false — A unlinks and creates, then B unlinks **A's fresh lock** and creates its own, because POSIX has no conditional unlink and the exclusive create decides only a race to CREATE on an unheld name. The comment now states what the lock does hold against (two runners contending for a LIVE lock, the case an end-to-end run produces) and names the rest as the residual `run-gates-lock-recovery-race`, unbuilt because closing it needs a second protocol and no observed run has produced the race (P7). **What is NOT claimed:** that alert 7 is resolved. No CodeQL CLI is installed on this machine, so nothing here executed the analyzer — the structural property its rule tests is what changed, and whether the analyzer agrees is settled by the next analysis on push. A new branch coverage case ships with it: an **unreadable** lock record is recovered (`readJson` fails → `isStaleLock(null)` is `true`), with the LIVE-lock test as its non-vacuity control ([[L34]]).

## [6.8.0] - 2026-09-22

### Added

- **`/pharn-verify` and `/pharn-regress` no longer TYPE their own floor input — a tested runner produces
  it** (`SKILLS_VERSION` 6.7.1 → **6.8.0**, minor: three newly shipped product-floor modules, a new
  contract, and an additive opt-in surface on two existing checkers — no existing install is invalidated;
  `MIN_CLI` untouched, because the CLI copies all of `pharn/floor` except tests and no installed path
  moved) — `pharn/floor/gate-run-core.mjs`, `pharn/floor/worktree-fingerprint.mjs`,
  `pharn/floor/run-gates.mjs`, and `pharn/pharn-contracts/gate-run-record.md`.

  **The failure, recorded not hypothetical.** Both stages compute a **floor** verdict from a
  `{gate-id: exit-int}` map, and until now the **model typed that map**. Verify's Step 3c captured five
  exit codes in Bash (`=$?`) and wrote the JSON by hand; regress's Step 4b instructed the model to
  "record `0`" for an empty test set and to "assemble each side into a flat map". So both the **keys**
  (which gates are in the set) and the **values** were model-authored, and each checker judged whatever
  map it was handed — which their own usage blocks said plainly. The 6.3.0 entry below records a
  dogfooded, unattended `/pharn-loop` run that "skipped `/pharn-grill`, `/pharn-regress` and
  `/pharn-verify` entirely, hand-executed the equivalent work by judgment, and still wrote a `LOOP.md`
  whose `decision` read as a genuine floor-grade stop"; that increment's remedy re-derives a decision
  from the reports it cites and, **by its own statement, cannot see a report that was never honestly
  produced**. `lessons-learned` **L5** names the class, **L30** names why the asked-for gate is the
  skipped one, and **L20**/**L46** make the recurrence the trigger for a floor check rather than another
  reminder.

  **What is FLOOR now, given the stamp:** the map's values are the exit codes the runner recorded from
  the listed argv; the keys cover the resolved source set (plus `reconcile` for verify); no tree edit
  happened between consecutive gates; and `reconcile` ran **last**, so it judges any write an earlier
  gate made. **What is NOT, each stated rather than left to be discovered:** freshness against the tree
  at decision time (`fingerprint.final` is written here and compared against nothing — a later
  increment's job); whether the stage ran at all; whether the report on disk is the checker's output;
  who wrote an explicit `--gates`; and **forgery** — this certifies **internal consistency, never
  provenance**, a self-consistent fabricated stamp passes, and a test **builds one** to prove it
  (**L43**).

  **Build-completeness is deliberately NOT a gate, and getting that wrong would have been silent.** The
  runner captures `check-build-complete.mjs`'s exit — so it is no longer model-typed — into the stamp's
  `aux.completeness`, a **sibling of `runs[]`**, and `check-verify.mjs` reads it onto its existing
  `--complete` path. Folding it into the gate map would make an incomplete build a **red gate**, so the
  verdict would be `FAIL` and **`INCOMPLETE` would become unreachable** — silently disabling
  `/pharn-ship` Step 2b's single bounded rebuild, which fires only on `INCOMPLETE`, and collapsing
  `check-loop.mjs`'s `v ∈ {FAIL, INCOMPLETE}` distinction. Surfaced as `/pharn-dev-grill` finding **R1**
  against the plan, **before any code was written**.

  **Consequences, stated plainly because they change behaviour:**
  - **Gates can no longer be skipped.** A project with a gate already red at base now gets an honest
    `FAIL` every iteration and reaches `STOP_CAP` rather than a green — the **L11** situation, no longer
    resolvable by quietly dropping the gate.
  - **A gate that writes a tracked, non-ignored file now always runs, and `reconcile` judges that
    write.** A build step that rewrites a generated file in the worktree is an escape and will red the
    stage; declare it in the plan's `## Files` or record it in `pharn/floor/reconcile-ignore.json`.
  - **A model that stops calling `run --next` gets `INCONCLUSIVE stamp-unfinalized`, not a silent skip**
    — a named stop where there used to be nothing.
  - **A project whose suite runs longer than ~9 minutes cannot be gated by this runner**, because the
    pinned `--timeout-ms` must sit under Claude Code's 600 s Bash-tool maximum. A real bound, named.

  **Narrowed, and named:** gate discovery from a manifest other than `package.json` now requires an
  explicit `--gates`; the previous "or the project's equivalent manifest" was prose no code implemented.

  **Doc drift this increment CREATES and cannot repair:** `pharn/ARCHITECTURE.md §4` enumerates the
  contracts by name and is human-only, so an eleventh contract makes it stale.
  `.dev/features/gate-run-stamp/architecture-patch/APPLY.md` carries the verified one-hunk patch for a
  human. Raised as `/pharn-dev-grill` finding **R2**; the plan's own sweep had reached the README and
  missed the trusted doc, which is **L50** exactly.

## [6.7.1] - 2026-09-22

### Fixed

- **`pharn/ARCHITECTURE.md` §5 and the README now name the two artifacts the 6.5.0→6.7.0 line shipped** (`SKILLS_VERSION` 6.7.0 → **6.7.1**, patch: a correction to bytes that already shipped — no new capability, command or checker) ([`pharn/ARCHITECTURE.md`](./pharn/ARCHITECTURE.md) §5, [`.dev/features/docs-drift-6-7-0/`](./.dev/features/docs-drift-6-7-0/)) — `cost.json` (6.5.0) and `RUN-REPORT.md` (6.6.0) are durable per-feature artifacts written by `/pharn-loop` at every stop and, since 6.7.0, by `/pharn-ship` at every exit that ends a run. **Every surface a checker reads was updated; every surface none reads was not.** §5's durable-files sentence named `findings.json`, `ship-record.json` and `cost.json` and omitted `RUN-REPORT.md`, which earns its place by the same criterion that sentence already uses — **dereferenced, not assumed**: `.claude/commands/pharn-loop.md:492` stages it for the green-stop commit. 6.5.2 patched that exact sentence for `cost.json` and the next release did not repeat it. On the README, the `## What PHARN is` paper-trail list — the first substantive thing a user reads — ended at `SHIP.md`; the `## Guaranteed vs advisory` table carried no `check-cost-ledger.mjs` row; and the `## Current limitations` token-hungry bullet still ended on "Budget for it" while the repo had been measuring the bill for three releases. **This is `lessons-learned` [[L1]] observed one release line later, and the mechanism is recorded rather than the symptom:** 6.6.0's plan scoped `README.md` to its GENERATED `## Current state` region only, so the meta-doc sweep L1 prescribes — _"which meta-docs state a fact this increment changes?"_ — never ran against the hand-written prose beside it. **Nothing detected it, and that is [[L43]] exactly:** `check:badge`, `check:changelog` and `docs:check` compare version copies **to each other**, never to what changed, so all ten gates and 2326 tests were GREEN with both the trusted doc and the prose stale. **No eleventh gate is added** — L43's own finding is that a third mutual-consistency check would have been green too, so its named detector (bind `SKILLS_VERSION` to the product-surface paths changed since it last moved) stays deferred with its two recorded design problems, and [[L50]]'s removed-referent registry likewise; naming a missing check does not build it (P7). **The sweep ran on two axes and both are declared** ([[L50]]): first by REFERENT — every cite of `cost.json` and `RUN-REPORT.md` on every surface — then by CLAIM, with the enumeration re-derived from the shortest invariant substring rather than from the sentences already read ([[L33]]: the first grep is a lower bound to beat, `VERIFY.md` for the artifact list and `cost` for the cost claims). Both axes converged on the same four sites, which is evidence of coverage, not proof of it. **The disclosure that lands on the README is the one a user could not previously reach:** `check-cost-ledger.mjs` certifies a ledger's **internal consistency** and never binds the recorded requests to the session that produced them — a self-consistent fabricated ledger passes, and a test in the repository proves it by building one. That bound existed in `CLAUDE.md`, in the contract and on the checker's stdout, i.e. **nowhere a user looks**, which is the `canon-write-denylist` precedent for putting it in `## Current limitations`. **`pharn/ARCHITECTURE.md` is hook-denied to the agent** (probed live: `Edit` on that path → **exit 2**; the control, `Edit` on `README.md` → **exit 0**; and the guards' composition re-probed after the writes-scope was set from this plan — declaring the trusted doc in `## Files` does **not** unlock it, fix #2 still denies at exit 2), **so the maintainer applied it outside the agent loop BEFORE this commit**, which is the ordering 6.5.2 already set. **Recorded because the first attempt got it wrong and the record should carry the correction, not hide it:** that attempt pushed the change as an **unapplied** `.patch` under a `proposed/` directory and left it on `main` as a pending TODO; it was reverted. **The defect was the ORDERING, not the file** — stated precisely because this repo carries 22 committed `.patch` files under `.dev/features/*/proposed/`, so "a patch does not belong in the repository" would be a false claim about its own convention; what those 22 share is that the trusted-doc edit was applied before or with the commit carrying them, making the patch a build record of a human-applied change rather than an instruction still waiting to be run. Not committing one here is the maintainer's explicit instruction for this increment (P5), and it costs nothing — the diff is the record. Applying first also removes the [[L43]] hazard the first attempt had to work around, since the correction is on disk before the bump asserts it. `spec_content_hash` moves `aada03c9…` → `31450bf5…`, which is fix #4 behaving correctly: every committed PLAN pinning the old value has already been built, and a plan written-but-unbuilt would now correctly refuse as drifted.

## [6.7.0] - 2026-09-22

### Added

- **`/pharn-ship` now emits a cost ledger and a run report at every exit that ends the run**
  (`SKILLS_VERSION` 6.6.0 → **6.7.0**, minor: a newly shipped capability on the product surface)
  ([`.claude/commands/pharn-ship.md`](./.claude/commands/pharn-ship.md) Step 3a,
  [`pharn/floor/ship-outcome-core.mjs`](./pharn/floor/ship-outcome-core.mjs),
  [`.dev/features/ship-cost-ledger/`](./.dev/features/ship-cost-ledger/)) — the second and last product
  entry point gets the phase markers, `cost.json` and `RUN-REPORT.md` that `/pharn-loop` has carried
  since 6.5.0/6.6.0. **Nothing is implemented twice:** `mark-phase.mjs` was already command-neutral by
  construction, and both emitters are invoked unchanged. Before this, `/pharn-ship` rendered cost only
  inside its attestation step and only into `ship-record.json`.

  **Emitted at GATE 2 and at every STOP, and the POSITION is what makes that true** rather than a
  promise. Step 3a sits after Step 3's `SHIP.md` write and **before** Step 3b, because Step 3b can
  itself STOP on a `stale`/`malformed` attestation verdict and can halt indefinitely when
  `ship.requireAttestation` is `true` — an emission placed after it would be skipped on exactly the
  paths it exists to cover. A related ambiguity is **named rather than inherited**: Step 3 declares its
  both-paths reachability explicitly and Step 3b declares none, so the live command does not say whether
  a stopped run reaches attestation. Step 3a does not depend on the answer.

  **`outcome` is DERIVED here, not declared, and the halves are not equally strong (P0).** `/pharn-ship`
  writes no `LOOP.md`, so the ledger falls through to the new `ship-outcome-core.mjs`, which reads the
  run's own verdict reports and phase markers — **never `SHIP.md` prose**, which is a roll-up ABOUT a run
  and not a declaration of one (**L6**). `gate2` is **FLOOR**: `verify-report.json` `PASS` ∧
  `regression-report.json` `no-regressions`, two enums from tested non-LLM checkers. `stop:<stage>` is
  **ADVISORY in its stage name** — the last `stage-start` marker, Bash-written command prose (**L19**) —
  and `stop:unknown` is the terminal fallback, with the stage token re-tested at READ time because the
  markers file is ordinary `.pharn/` state a Bash write reaches. **The label travels with the value:**
  `RUN-REPORT.md`'s `## Outcome` prints the split, so a reader meets it without opening the contract.
  **Unlike `/pharn-loop`, whose decision `check-loop-decision.mjs` re-derives from its own cited reports,
  there is no re-derivation here and none is claimed** — a ship stop is a human gate or an orchestrator
  STOP, and no checker computes either.

  **A pre-existing unbacked FLOOR label was closed rather than deepened.** `cost-ledger.md` advertised
  `outcome` as `FLOOR (shape)` from the day the contract shipped while `check-cost-ledger.mjs` validated
  **nothing** inside it beyond the closed top-level key set. Adding a second producer and a second
  `source` member to an unchecked field would have made an existing overclaim worse, so the rule was
  built: `decision` a bounded token, `iterations` an integer or `null`, `source` in the closed
  **imported** two-member enum, optional `blocked` bounded, and the key set **closed in both directions**
  (**L36** — a `decisions` beside `decision` fails). The trigger is that unbacked claim, recorded plainly
  rather than manufactured (P7); `git ls-files '*cost.json'` returned **0**, so no committed artifact is
  retroactively reddened. The contract heading that read "the four FLOOR rules" now carries **no count**
  at all — per **L47**, substituting a new number rebuilds the defect at the new value.

  **Two cost figures now sit in a ship feature directory, and the question L35 asks was answered at a
  human gate rather than silently.** They are **not one fact stored twice**: different granularity
  (aggregates vs per-request rows), different attribution METHOD (the platform's `attributionSkill`,
  which names the orchestrator and never the sub-stage, vs phase markers), different render moments —
  and the embedded block sits **inside attested content**, so retiring it would change what a named human
  attested to. **`cost.json` is authoritative for analysis**; both `cost-ledger.md` and `ship-record.md`
  now say so and say **why they may legitimately disagree**. **No consistency check binds them and none
  will be added** — per **L43** it would certify that two stores agree, never that either is right, and
  per **L35** it would become a third thing to keep in sync. The `cost-ledger.md` paragraph that deferred
  this question to "the named `/pharn-ship` wiring follow-up" was a forward-looking claim that expired
  with this increment (**L33**) and is now a settled answer.

  **Two bounds are stated rather than discovered later.** (1) **The ledger is SINGLE-SESSION.**
  `render-cost-ledger.mjs` resolves one session's transcript, so a ship run whose GATE-1 approval arrives
  in a **new session** records only the final session's requests. Markers carry `session_id` per marker,
  but that is used to avoid cross-session mis-attribution, **not** to union sessions — the premise that
  they union was checked against live code and found false. Honest under-reporting (`coverage` has no
  `complete` member), and it reopens on the first measured multi-session run. (2) `/pharn-spec`'s own
  requests precede the `run-start` marker — `<name>` IS the marker file's directory, so no marker can
  exist before that stage has run — and are `unattributed`, an honest bucket never folded into a
  neighbour.

  **`RUN-REPORT.md` serves a second emitter without a second renderer.** Its section prose is now driven
  by `cost.json`'s own `command` and `outcome.source` fields (the structured location — **L6**), never by
  inferring the command from which artifacts happen to exist. A new `## Briefing` section **links**
  `BRIEFING.md` when Step 2c rendered one and states an honest `n/a` otherwise — linked, never quoted, so
  the contract is cited once (P4) and no untrusted prose is widened. A ship run has **no `## Handoff`**,
  and the report says so **by design** rather than reporting a missing file. The command token is
  membership-tested before it reaches prose, with a generic phrase as the terminal fallback: the ledger
  bounds `command` only to ≤128 control-char-free chars, so a back-tick or pipe can reach the renderer.

  **Also retired: two more duplicated defaults in the module `L52` was written about.**
  `render-cost-ledger.mjs` carried **two copies each** of the `command` and `baseSha` defaults —
  `renderLedger`'s destructuring defaults and `main()`'s `opts` literal — and because `main()` always
  passed its copy, the destructuring defaults were dead to every CLI test. That is **L41**'s blind spot
  one constant over from where L52 recorded it, and `/pharn-ship` is the first caller to pass
  `--command`, which is exactly when a stale copy bites. L52's rule is that a set-quantified remedy must
  **name the set in the same sentence**, so: **one no-argument test per default retired in this change**
  — two defaults, two tests, plus a closure assertion per literal.

  **`/pharn-ship` now makes exactly one git call, and the claim it falsified was corrected in the same
  diff (L33/L50).** Step 3a runs `git rev-parse HEAD` to capture the run report's base SHA — correct
  precisely because the command never commits, so HEAD cannot move during the run and `## Files` can diff
  against it. Passing `unknown` instead is honest but costs that whole section. The command previously
  claimed it "contains no `git`/`gh` invocation"; **all four sites carrying that claim were swept
  together**, not just the one that was easiest to find, and each now says **no git WRITE** — no branch,
  add, commit, push or PR, and `gh` is never invoked.

  **What gates nothing, said plainly (fix #3).** `check-cost-ledger.mjs`'s exit code is not a
  proceed/stop input; a RED ledger reaches GATE 2 exactly as a GREEN one does. Every line of Step 3a is a
  Bash call outside the `PreToolUse` gate (**L19**); both emitters write their own files and are already
  exempt by name under `pipeline_artifacts` in `reconcile-ignore.json` — **nothing was re-added there**.
  Neither artifact is declared in the command's `writes:`, deliberately: declaring a path the Write tool
  never touches would be a false claim (**L7**) and would oblige a setter call authorizing nothing.

  **Obligations are enumerated, not asserted per-file (L29/L31).** The run-report suite's `★ WIRING` pin
  was written for **one** invoking command; it is now an enumeration over invoking commands, **closed
  over the corpus** so a third caller fails until it is listed. `.dev/floor/command-hygiene.test.mjs`
  gains a matching `PHASE_MARKER_WIRING` set pinning that each emitting command brackets its run and
  every stage it runs, pairs an `orchestrator` return to every `stage-start`, and passes its **own**
  `--command` value. The iteration FORM is pinned per command because the two genuinely differ — the
  loop's is a runtime `<N>` under `--max-iter`, ship's is a literal `1` or `2` (its single Step-2b retry)
  — so neither can drift into the other. Ship deliberately marks **no** `pharn-spec` stage, and the test
  encodes that as a declared asymmetry rather than a gap.

## [6.6.0] - 2026-09-21

### Added

- **Every `/pharn-loop` stop now also writes a human-readable run report**
  (`SKILLS_VERSION` 6.5.2 → **6.6.0**, minor: a newly shipped product-floor capability)
  ([`pharn/features/<name>/RUN-REPORT.md`](./pharn/floor/render-run-report.mjs),
  [`.dev/features/loop-run-report/`](./.dev/features/loop-run-report/)) — a deterministic VIEW over
  `cost.json` and the artifacts the run already wrote: the outcome, a per-stage×iteration×model token
  table over all six classes, the changed-and-untracked files each carrying its `PLAN.md` `## Files`
  line quoted verbatim, the standing verify/regress verdicts, and the `LOOP.md` `## Handoff`.
  **Every line is derived by code; none is authored by a model.** **Trigger (P5):** maintainer
  direction — at a stop a person should see which model worked on which phase and for how many tokens,
  which files moved and roughly what each is, and what the run ran into — recorded as such rather than
  dressed in a manufactured dogfood failure.
  **It ANNOTATES and gates NOTHING** (fix #3): no proceed/stop reads it, and the Step-6c commit stays
  gated on `STOP_GREEN` ∧ the decision re-derivation alone. Three bounds travel **inside the artifact**,
  not only here: the file list is **changed-since-`base_sha`**, which is _not_ "what the build wrote"
  (**L17** is the record of that conflation producing a blocking finding on the correct workflow); the
  token numbers are **copied** from `cost.json`'s stored views, never recomputed, so the report cannot
  disagree with the file `check-cost-ledger.mjs` just certified (**L43**); and the verdicts are the
  **final iteration only**, because `/pharn-loop` overwrites both report files in place every iteration
  — the report says so rather than inventing a history that was never recorded.
  **NO SECTION USES A MARKDOWN TABLE, and that is a measurement rather than a preference:** probed live
  against the shipped sanitiser (**L37**), `sanitizeIdentity("opus|5", …)` returns it **unchanged** —
  the ledger's rule 3 bounds length, control characters and absolute paths, and a pipe is none of the
  three. One pipe in a table cell shifts every column right of it, so every region carrying untrusted
  text is a fenced block whose delimiter is computed longer than any back-tick run inside it. That makes
  it inert **to a CommonMark parser**; it is **not** forgery-proofing, and the header says so.
  **The Handoff grammar is now SHARED, not copied** — `pharn/floor/loop-record-core.mjs` is imported by
  both `check-loop-record.mjs` and the renderer (**L35**: the second copy should not exist; the rule had
  already been wrong twice). **The PLAN `## Files` grammar is shared the same way** —
  `pharn/floor/plan-files-core.mjs` is imported by both `check-build-complete.mjs` and the renderer, and
  gained an additive `entries` (each item's raw line). The renderer first imported that parser FROM the
  checker, which gave the checker a **second reason to change** — its completeness axis plus a shared
  parser, with the `import.meta.main` guard the export forced as the visible symptom. That was **REVIEW
  finding F3**, and it is **fixed by extraction rather than deferred**: the checker now exports nothing,
  and its guard is kept as ordinary CLI hygiene with its comment corrected rather than left asserting a
  reason that no longer holds. The **canonical** `## Files` parser is still `set-writes-scope.cjs` — the
  core carries that parity obligation, and the ★ parity test that already ranged over the behaviour is
  what covers the move. **The extraction also SURFACED a real gap it did not create:** giving the parser
  its own file made visible that the **Boundary-2 exclusion-cue `break`** — the rule already repaired
  **twice** (`setter-cue-fix`, `plan-cue-continuation`) — was reached by **no product-floor test**, its
  only coverage living in the setter's own `.cjs` suite (**L31**: the second copy is where the obligation
  drops). Closed here by a parity case that holds **both** parsers to the same answer and pins the cue's
  two exemptions (a blockquote, an authorized item's own description) as non-vacuity controls, with a
  **mutation control** run to prove it fails when the branch is disabled.
  **`RUN-REPORT.md` joined FIVE enumerations, listed in one place and iterated by a test** (**L29/L31**):
  `PIPELINE_ARTIFACTS`, `reconcile-ignore.json`'s `pipeline_artifacts.names` (the two already pinned
  set-equal by a ✧ test, and forced by the ★ recurrence guard), the Step-6c staging list,
  `.prettierignore` and `.markdownlint-cli2.jsonc`. The last two follow the `cost.json` precedent
  (**L23**) and are listed **on reasoning rather than after the first FAIL**, with a sharper reason here:
  the report quotes untrusted text it does not control, so gate-clean output is not achievable by
  construction. **Coverage, stated exactly rather than rounded up:** 46 tests in the renderer's
  suite and **100% line and function** over all three new modules (`render-run-report.mjs`,
  `loop-record-core.mjs`, `plan-files-core.mjs`). **Branch** coverage is **100%** on the two shared cores
  and **85.96%** on the renderer — named rather than omitted, since "fully covered" would not be true of
  that third column. The suites carry
  non-vacuity controls (**L34**) and negative controls proving the porcelain parse (**L21**), the
  `validate` CHECK-5 preamble (**L10**) and the section-closure assertion (**L36**) can each actually
  fail. The write is a **Bash** write outside the `PreToolUse` gate (**L19**), declared in the plan and
  covered by name under `pipeline_artifacts` — never described as gate-covered.

## [6.5.2] - 2026-09-21

### Added

- **`pharn/ARCHITECTURE.md` now names every contract in `pharn/pharn-contracts/`, closing a pre-existing drift the cost-ledger increment surfaced** (`SKILLS_VERSION` 6.5.1 → **6.5.2**, patch: a correction to bytes that already shipped) ([`pharn/ARCHITECTURE.md`](./pharn/ARCHITECTURE.md) §4 and §5, [`.dev/features/loop-cost-ledger/architecture-patch/`](./.dev/features/loop-cost-ledger/architecture-patch/)) — §4's layer tree named **6** contracts while **9** existed on disk: `reconciliation-record`, `regression-report` and `verify-report` had been omitted **before** this increment touched anything, so adding `cost-ledger` alone would have made it 10 named 6. All ten are now named, verified by comparing the block against `readdirSync("pharn/pharn-contracts")` rather than by reading it. §5's durable-files sentence gains `cost.json` beside `findings.json` and `ship-record.json`, which it earns by the same definition that sentence already uses (committed on a green `/pharn-loop` stop, left in the working tree otherwise). **Why this shipped as a staged patch rather than an edit:** `pharn/ARCHITECTURE.md` is human-only and `protect-trusted-paths.cjs` denies the agent's write tools on it (exit 2), so the patch was **generated by editing a throwaway `git worktree` and diffing**, verified with `git apply --check` at the real path ([[L26]] — a patch verified against a copy OUTSIDE the repo is verified under different rules than the repo enforces), and **applied by the maintainer** outside the agent loop, with `APPLY.md` recording the pre-existing-drift decision as theirs rather than folding it in silently. **`spec_content_hash` moves** `b91d773c…` → `aada03c9…`, which is fix #4 behaving correctly: every committed PLAN pinning the old value has already been built, and a plan written-but-unbuilt would now correctly refuse as drifted. **Nothing in the floor catches a missing bump here, and that is why it is recorded rather than assumed:** the four trusted docs are `.prettierignore`d and markdownlint-excluded, `validate.mjs` does not walk root docs, and `check:badge` / `check:changelog` compare the version copies **to each other**, never to what changed — [[L43]] exactly, whose own instance was a product-surface byte moving while all three copies agreed at the stale value.

- **The cost ledger's identity fields are now BOUNDED, closing a contract that asserted a bound the code did not provide** (`SKILLS_VERSION` 6.5.0 → **6.5.1**, patch: a correction to bytes that already shipped) ([`pharn/pharn-contracts/cost-ledger.md`](./pharn/pharn-contracts/cost-ledger.md), [`.dev/features/loop-cost-ledger/REVIEW.md`](./.dev/features/loop-cost-ledger/REVIEW.md)) — `/pharn-dev-review` found `cost-ledger.md` claiming _"the leaf-shape rule bounds what can land in them"_ of `model`, `attribution_skill` and `agent_id`. **It did not:** that rule reaches `usage` only, and those three were copied from an untrusted transcript into a **committed** artifact behind a bare `typeof === "string"` test. **Probed with a control rather than reasoned about:** a 200,000-character `attribution_skill`, one carrying `\u0007`/`\u0000`, one carrying a newline plus a forged `RED — …` line, a 200,000-character `model`, and a control-char `agent_id` were each accepted **GREEN**, while the control — a `usage` leaf containing spaces, the field the rule really covers — REDded. This is the P0 disease in its canonical form and [[L2]] recurring: a contract may cite only a floor op that is live **for the thing it claims to cover**. **The gap is closed rather than the sentence weakened** — a new rule 3 bounds all three (≤128 chars, no control character, no absolute path), a refusal is **dropped with its key path listed** (`model` → the literal `unknown`, the others → `null`) and **never truncated**, which would invent a value that was never in the transcript. The re-probe shows all five vectors RED with the ordinary-values control still GREEN, so the fix is not over-tightened. **Two further review findings fixed in the same pass.** (1) [[L41]] **recurred inside the increment that cited it**: the `pharn/features` default existed in **two** places while the PLAN asserted exactly one, and the no-`--base` **write** path was exercised by nothing because every CLI test passes the flag — `render-ship-briefing.mjs:438` reproduced. It is now one exported `FEATURE_BASE`, referenced twice, with a test that goes through the no-flag branch and a **closure** assertion (L36) counting the literal's occurrences in the source so a re-introduced duplicate fails. (2) [[L31]]: the `usage` leaf rule was encoded **twice** and the two had **already diverged** — the checker's copy omitted the `ABS_PATH_RE` term, masked only by the whole-document path sweep — and `cleanScalar` existed in **three** copies; there is now one `isTokenLeaf` and one `cleanScalar`, exported and imported. Suite 2240 → 2244.

- **Every `/pharn-loop` run that reaches a stop now emits a machine-readable cost ledger** (`SKILLS_VERSION` 6.4.3 → **6.5.0**, minor: a newly shipped capability — one contract and three floor scripts on the product surface) (new [`pharn/pharn-contracts/cost-ledger.md`](./pharn/pharn-contracts/cost-ledger.md), [`pharn/floor/mark-phase.mjs`](./pharn/floor/mark-phase.mjs), [`pharn/floor/render-cost-ledger.mjs`](./pharn/floor/render-cost-ledger.mjs), [`pharn/floor/check-cost-ledger.mjs`](./pharn/floor/check-cost-ledger.mjs), [`.dev/features/loop-cost-ledger/`](./.dev/features/loop-cost-ledger/)) — `pharn/features/<name>/cost.json`, written at **every** stop that has a feature directory, green or not, so a company can compute what a feature cost **in money, against its own price list**, from a file in the repository. **The triggering gap is on record and is irreversible:** `/pharn-loop` recorded no cost at all, and Claude Code prunes session transcripts on its own schedule (`cleanupPeriodDays`), so cost not captured **at the stop** is gone — the 2026-08-18 measurement lost **three features** to exactly that (§9). **The governing principle is record facts, derive views.** Two things are irrecoverable later — per-request usage and phase boundaries — so both are stored as facts (`requests[]`, `markers[]`) and **every** aggregate is a pure function of `requests[]`, which is what lets `check-cost-ledger.mjs` recompute all four views and compare. **Phase markers exist because the platform cannot answer the question, and that was measured rather than assumed:** on this repo's own `loop-decision-integrity` transcript `attributionSkill` tagged 213 of 275 deduped requests and tagged **every one of them `pharn-loop`**, naming no sub-stage anywhere — so `pharn/floor/mark-phase.mjs` appends `{seq, kind, stage, iteration, ts, session_id}` to `.pharn/cost/<name>/markers.jsonl` at each boundary (command-neutral, so `/pharn-ship` reuses it unchanged), and attribution is a **named, versioned VIEW** (`latest-marker-at-or-before-ts-same-session/1`) over recorded values, with `attribution_skill` kept raw so nothing depends on it. **What is FLOOR, stated precisely:** a **closed** top-level key set asserted in both directions (a per-member presence set would admit a variant spelling of any member — `lessons-learned` **L36**); every `usage` leaf `number | bool | null | short token`, anything else **dropped with its key path listed**; no string anywhere matching the absolute-path regex; unique `request_id`s; strictly increasing `markers[].seq`; and every view equal to a recompute from `requests[]`. **"No message content, no home paths" is a CONSEQUENCE of those rules, not a detector — and the claim "no usernames" is STRUCK and appears nowhere, because no regex proves it (P0).** **The checker's bound is stated in its own header and in its stdout (`lessons-learned` **L43**):** it certifies the file's **internal consistency**, never that `requests[]` matches the transcript — a self-consistent fabricated ledger passes, and a test proves it by fabricating one. `--verify-transcript` binds the rows to their referent by re-deriving them live, and is **usable only while the transcript exists**, therefore machine-local, perishable, and deliberately not a gate. **Tokens only; there is no price table and there never will be** — `cost = Σ tokens[class] × price(model, class, date, tier)` against the reader's own list, **list-price equivalent** (a subscription is not billed per token), with `output_thinking` a **subset** of `output` rather than a seventh class. **The emitter WRITES `cost.json` itself** (the `render-review-assignments.mjs` precedent: a model never retypes hundreds of numbers) — a **Bash** write outside the fix #7 `PreToolUse` gate, declared as such in the plan's `## Files` and exempted by name in `pharn/floor/reconcile-ignore.json` rather than described as gate-covered (**L19**). Transcript location and the file walk are **imported** from `render-cost-record.mjs`, never copied (**L35**), and a ✧ parity test asserts the two agree on totals over the same bytes **with the class-name mapping made explicit**, so the deliberate overlap cannot drift silently while both exist. **It ANNOTATES and gates NOTHING (fix #3):** `check-cost-ledger.mjs`'s exit code is not a proceed/stop input, the Step 6c commit remains gated on `STOP_GREEN` ∧ the decision re-derivation, and a RED ledger is reported verbatim while the run continues. **Size is disclosed rather than discovered:** a 65-minute, one-iteration `STOP_GREEN` run emits **~393 KiB** (275 rows, 402,567 bytes measured), of which the verbatim `usage` copy is ~263 KiB — weighed at the plan gate and accepted for fidelity, and recorded in the contract, the emitter header and `CLAUDE.md` so a reader meets it before a diff does. **Two committed fixtures with deliberately different provenance:** `single-session.jsonl` is derived from this repo's own run, stripped to `usage` + ids; `with-subagents/` is **hand-authored** from the observed record shape, because the real transcript has **zero** sidechain records and structurally cannot exercise the subagent path (the **L41/L34** blind spot, closed rather than named) — and it pins **both** observed agent-id spellings, `agentId` and `attributionAgent` (**L36**). **A guard the grill's blocking finding forced:** the absolute-path regex is asserted over the bytes of **every** committed fixture, discovered by walking the directory so a fixture added later inherits it (**L29**), with a non-vacuity mutation control (**L34**) — because "usage + ids only" was a description of how the file was built, and in this repo an intent is not a check. 60 hermetic tests; line coverage 100% / 98.33% / 96.43%.

## [6.5.0] - 2026-09-21

- No entry in this file is filed under this version (bump commit 8dacaa9); CHANGELOG.md changed in its window at 8dacaa9. Reverted by b8940d3 on 2026-09-21. An entry added at 8dacaa9 was re-landed in 6d2ed46 and is filed under [6.5.2].

## [6.4.3] - 2026-09-21

### Fixed

- **The measured-cost renderer now finds the transcript it is measuring — located by SESSION ID, not by a directory name derived from `cwd`** (`SKILLS_VERSION` 6.4.2 → **6.4.3**, patch: a correction to bytes that already shipped — no new capability, command or checker) ([`.dev/features/cost-record-session-lookup/`](./.dev/features/cost-record-session-lookup/), [`.dev/measurements/cost-record-lookup-2026-09-21.md`](./.dev/measurements/cost-record-lookup-2026-09-21.md)) — `pharn/floor/render-cost-record.mjs` derived its transcript directory by replacing every `/` in `cwd` with `-`, and `render-cost-record.test.mjs` pinned that rule, so **the test certified the bug**. **Stated plainly, because the trigger's framing was the opposite and the record should not repeat it: the renderer was NOT dead code.** `CLAUDE_CODE_SESSION_ID` is set in the Bash tool environment, and invoking the renderer with no arguments in an ordinary session returns a real `coverage: "partial"` block — what was missing was any committed artifact proving it, not the capability. `LIMITS.md §1c`'s "the system already observes it" was therefore **true as written** and got no patch. **What actually broke, and it is two things, the second decisive** (measured, not reasoned — the directory survey is in the measurement record): (1) the platform replaces `.` as well as `/`, so a Claude Code worktree at `…/repo/.claude/worktrees/wt` is filed under `-…-repo--claude-worktrees-wt` while the derivation produced `-…-repo-.claude-worktrees-wt` — and `_` is **not** replaced, so the tempting generalisation "every character outside `[A-Za-z0-9/-]`" is wider than the evidence and was not adopted; (2) **the directory is not a function of the session's `cwd` at all** — three of four `pharn-oss` worktree directories record the **main repo** as their first `cwd`, and `cwd` is not stable within a session (2–3 distinct values observed in single transcripts, of which only the first was ever read). So a dot-corrected rule **still** resolves the wrong directory: the derivation is **retired**, not repaired (`lessons-learned` **L35** — when one fact is stored twice, ask whether the second copy should exist before asking how to sync it; a platform rule this repo cannot pin is exactly such a copy). The replacement is a filename test — the single directory under `<projectsDir>/` holding `<sessionId>.jsonl` — with the directory name opaque to the module. **The cwd-mismatch refusal is gone with it, and the consequence is stated as a downgrade rather than hidden (P0):** its premise was the lossy `a/b` vs `a-b` dirname collision, unreachable once the key is a UUID, while finding (2) made it fire on **legitimate** worktree runs; "the reported run is this run" now rests on `CLAUDE_CODE_SESSION_ID` alone, which nothing verifies. That is weaker than what it replaced **on paper only** — the refusal read one arbitrary `cwd` of the several a session records, so it produced false refusals, not true catches. A session id resolving to 2+ directories is **REFUSED**, never first-match-wins (an integer compare, the `check-ship.mjs` `iter >= cap` precedent under primitive #3); measured 0 collisions across 129 transcripts, though the code is written so that count need not hold. **Non-vacuity was measured, not asserted** (`lessons-learned` **L34**): the new suite was run against the **unmodified** module first, where the worktree fixture returns `unavailable` / `output: 0` against a fixture recording 42. The test helper now takes its directory name **literally** instead of building it with the function under test — the fixture convention that made the defect invisible (**L41**), and the same lesson caught a second site the plan had missed: the `projectsDir` default (`CLAUDE_CONFIG_DIR` / `homedir()`) was reached by **no test at all**, since all seven call sites passed it explicitly; both arms now have a CLI case. A missing or unreadable projects directory returns an honest block instead of throwing. `--cwd` is retired and now exits 2 rather than silently no-op'ing. **One regression this increment introduced and its own review caught, recorded rather than quietly repaired:** the rewrite dropped the pre-existing `files === 0 → unavailable` guard as "now unreachable", and it is not — a locating stat and the aggregate's walk do not agree on every input (an id holding a path separator satisfies the first and escapes the second), so a located-but-empty run rendered `coverage: "partial"` with **zero** requests, an absence dressed as a cheap run and embedded verbatim into `ship-record.json`. The guard is restored with the boundary test that was missing; the probe that found it is in `REVIEW.md` F1. **No field was added, and that is a P7 decision with evidence:** `fold()` reads only the `cache_creation` split, so a record carrying `cache_creation_input_tokens` without it would count cache writes as 0 silently — measured across 8112 deduped requests, the split was present and exactly equal to the total in **every** case, 0 remainder out of 44.4M tokens. The output shape has no bucket for an unsplit total and inventing one would be the speculative addition, so the exposure is recorded as the named, deliberately-unbuilt residual `cost-record-unsplit-cache-write` (a pending remedy per **L46**) and the **invariant** is pinned by test rather than the count, which would only set a new expiry date (**L47**). **First measured `/pharn-loop` cost recorded anywhere in this repo:** the `loop-decision-integrity` run — the fixture that failed both ways before — renders 275 deduped requests, 91.5M cache-read and 171k output tokens. Read with the renderer's own bounds: tokens never dollars, a floor on spend never a total, annotation that gates nothing. `pharn/pharn-contracts/ship-record.md` is **unchanged** (no key added or removed) and `/pharn-ship`'s no-argument invocation still works.

## [6.4.2] - 2026-09-21

### Fixed

- **A retraction that missed its siblings is finished, and the dead cites it left behind are repaired** (`SKILLS_VERSION` 6.4.1 → **6.4.2**, patch: corrections to bytes that already shipped — no new capability, command or checker) ([`.dev/features/drift-audit-6-4-1/`](./.dev/features/drift-audit-6-4-1/)) — #221 retracted _"the one residual"_ in `THREAT-MODEL.md §5` and `LIMITS.md §2`, and the same claim kept shipping elsewhere: `pharn/pharn-contracts/finding-shape.md` said _"the single place"_, `pharn/ARCHITECTURE.md` said _"the one place"_, and `CLAUDE.md` said _"the one residual"_. Each now uses the **open** form `LIMITS.md §2` already carries — not the only such place, with `THREAT-MODEL.md §5` naming the known ones — and never a replacement count, which `lessons-learned` **L47** records rebuilds the defect at the new value. **Two more defects of the same kind were found by the grill, not by the plan's own sweep**, which was scoped to one phrasing (`lessons-learned` **L33**'s shape, inside the increment that cites it) — cites into `README.md` text that no longer exists, orphaned at different times: #166 removed the README's attempt-0 mention, which left the cites in `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md` and `CLAUDE.md` pointing at nothing; `LIMITS.md:146` cites a README "experiment agenda" that the June reframe removed the day after it was written; and the shipped `/pharn-review` command's Step 3b cite was **dead on arrival** — written in #197, eighteen days after #166, with a cite to a README that already had no attempt-0 text — where it also asserted _"the one capability this repo's experiment agenda exists to measure"_. They now cite the owner or the probe (`pharn/pharn-review/trust-fence/`), or drop the dead parenthetical where the only candidate target is an agent-editable file. The stale `LIMITS.md §8` marker also now reads the version §8 actually shipped under (6.4.1; comment-only). **Documented, repo-meta, no bump:** `CLAUDE.md` now describes `check-loop-decision.mjs` (6.3.0) and the optional `cap` field, and scopes "never checked" to the one checker it is true of; `README.md` says the `/pharn-loop` commit also needs the decision to re-derive, with the bound stated (re-derivable, not honest), and points at the user-installed-skill channel without restating it. **`pharn/ARCHITECTURE.md`, `THREAT-MODEL.md` and `LIMITS.md` are human-only (hook-denied), so those edits ship as staged patches** under `.dev/features/drift-audit-6-4-1/proposed/`, verified at the real path in a clone carrying the working-tree edits (`lessons-learned` **L26**), with the apply order and a constraint nothing detects: this bump and entry assert that the trusted-doc corrections exist, so apply every patch **before** committing (`lessons-learned` **L43**). **Deferred, and recorded rather than dropped:** a floor check for retracted-claim spellings. `lessons-learned` L20's second-occurrence bar is arguably met and the maintainer chose to defer it — pending, with no trigger invented (L46).

## [6.4.1] - 2026-09-21

### Added

- **`LIMITS.md` now records that the declared per-stage model configuration is NOT the executed one** (`SKILLS_VERSION` 6.4.0 → **6.4.1**, patch: a clarification to bytes that already shipped — no new capability, command or checker) (new [`LIMITS.md`](./LIMITS.md) § 8, [`.dev/features/model-routing-limit/`](./.dev/features/model-routing-limit/)) — `pharn.config.json` ships at the repo root declaring `opus` for spec, plan, grill, review and memory-promote, and `pharn/floor/check-model-config.mjs` holds that block in EQUALITY with the ten product commands' static `model:` / `effort:` frontmatter. **That check is real and it is floor; what it certifies is narrower than the config's presence suggests**, and the bound was stated in exactly two places that cannot carry it: the checker's own comment header, which by `lessons-learned` **L25** reaches only the file it sits in, and `README.md`'s `## Current limitations`, which sits OUTSIDE the generated `CURRENT-STATE` markers and is therefore unguarded prose no checker reads. The file whose frontmatter purpose line is _"What PHARN does NOT guarantee"_, and whose own §1 note claims precedence over contradicting claims elsewhere, was silent. **The trigger was demonstrated rather than asserted (P7):** a whole-file search of all 295 lines of `LIMITS.md` returned zero statements of the limit, and §5 — the one section touching `pharn.config.json` — was read in full and found to lean the other way, framing model/stage settings as the real thing the config carries in contrast to the telemetry sink it does not. **The Layer-1 / Layer-2 split is the increment's craft and is held in the text:** what this repository can settle is asserted in LIMITS' own voice (the equality bound; and, MOVED to Layer 1 by probe, the fresh-install posture — a config with no `models.stages` and an absent config file each exit **0 GREEN by design**, so deleting the block LOSES the check rather than failing it), while what only the platform can settle is CITED to the checker's header and never adopted — turn scope (a stage invoked inside `/pharn-ship` or `/pharn-loop` runs in the orchestrator's turn) and the `availableModels` / auto-mode veto. **A false universal quantifier already shipped was found by probing and is corrected here (`lessons-learned` L37):** `check-model-config.mjs:10-11` read _"nothing in this repo reads `pharn.config.json` at run time"_, which is **false** — a two-arm probe differing only in the config file's presence flipped `enforce-writes-scope.cjs` from exit 0 to a deny, via `defaultSafeSet()` → `isPharnInstalledProject()` → `readFileSync(pharn.config.json)`; `pharn/floor/check-bash-reconcile.mjs` is a second functional reader. The true claim is BLOCK-scoped — nothing reads **`models.stages`** to select a model — and the header now says that, in the same line count so its own `:32-38` self-citation stays valid. **Per `lessons-learned` L35 the fact is given ONE owner rather than a fifth copy and a sync check:** `LIMITS.md § 8` owns the full statement, `README.md`'s bullet is DRAINED to a pointer, the `README.md` guaranteed-vs-advisory row keeps the bound in its own text, and `pharn.config.json` gains one additive `_models_stages_note` key putting the reason at the slot that creates the false impression — probed GREEN on BOTH checkers in `agreement` mode, the mode their ★live★ tests run. **No control is added and none is implied:** PHARN does not attempt to apply a model and fall short, it does not attempt it at all, and the stages may well run on the declared model — the claim is that nothing proves it either way. Making the executed model observable is platform-level and invisible to all three floor primitives; a PHARN-side "fix" would be the fabricated guarantee P0 exists to prevent. **`LIMITS.md` is human-only (hook-denied — probed: exit 2, control exit 0), so all four edits ship as staged patches** under `.dev/features/model-routing-limit/proposed/`, each verified to apply cleanly in a real worktree of this repo (`lessons-learned` **L26** — at the real path, under the repo's own config resolution), with apply instructions and the ordering requirement in `proposed/APPLY.md`.

## [6.4.0] - 2026-09-21

### Added

- **A merged finding now states, per contributor, what deterministic detection stood behind that lens —
  and `REVIEW.md` shows it** (`SKILLS_VERSION` 6.3.1 → **6.4.0**, minor: a newly shipped capability on
  the product surface — `pharn/floor/merge-findings.mjs` gains a derived field and the `/pharn-review`
  command bytes change) ([`.dev/features/finding-backstop-class/`](./.dev/features/finding-backstop-class/))
  — each `sources[]` entry carries a `backstop` value from the closed, exported `BACKSTOP_ENUM`
  (`scanner-assigned` · `scanner-less` · `scanner-errored` · `slice-miss` · `unknown`), derived at merge
  time from the committed `pharn/floor/lens-scanner-map.json` **and** the per-run
  `assignments.json`. **The trigger was demonstrated before the plan was written, not asserted (P7):**
  two hand-written findings at one `file:line` — one from the scanner-bound `injection`, one from the
  scanner-less `trust-fence` — merge into a single group (the shipped corpus emits `44 rule_id: P2`, one
  value, so the dedup key degenerates to `(type, file)` and a multi-source group is the norm), and
  rendered per Step 6 the two contributors are **structurally indistinguishable** — while the
  scanner-less one had **max-escalated the group to `blocking`**. `/pharn-review`'s own audit already
  **struck** "a skill cannot suppress a finding" for exactly those four lenses; nothing in the render let
  a reader see which contributors they were. **The nearest existing signal structurally cannot carry
  it:** `unassigned_scanner_bound[]` is **file-level**, so in that very case the file is _absent_ from it
  while the group still rests partly on nothing structural. **The asymmetry is deliberate and the label
  is a property of the CONTRIBUTOR, never the finding:** `scanner-assigned` adds **no** credibility —
  the floor claim is only that _the record assigned this file to this lens on a scanner-bound basis and
  the committed map agrees that lens has a scanner_, since the record is **not bound to its producer**
  (measured: a hand-authored record exits 0 GREEN) — while `scanner-less` **subtracts** an assumption a
  reader may otherwise make. "A regex matched this file" is **struck**, and "verified" / "confirmed" /
  "corroborated" / "confidence" are banned from the field names and every rendered string. **Fail-closed
  in every direction:** an absent, unreadable or malformed record or map, a lens the record does not
  cover, and a **map↔record disagreement** (refused, never arbitrated — a consistency check certifies
  agreement, never the fact, **L43**) all resolve to `unknown`; stderr names the degradation and stdout
  reports per-member counts in enumeration order, so an all-`unknown` run is visible instead of looking
  like an ordinary success (**L25**). **This increment's own `/pharn-dev-grill` earned its keep:** its one
  blocking-severity finding showed `slice-miss` was **not** fail-closed — a `file` in a base form
  `canonFile` declines to normalize (absolute, `../`, backslashes) would fail the lookup and be labelled
  `slice-miss`, a **confident negative manufactured by a failed join** and indistinguishable from a true
  miss. The remedy, folded in inside the approved scope: `slice-miss` is gated on the file appearing in
  the record's own `target`, so anything the record cannot locate goes to `unknown`. `scanner-errored`
  stays distinct from `slice-miss` because a throw is not a miss. The label **reads** the recorded verdict
  and never re-runs a scanner, which is the side of **L42** that answers "what was assigned **then**"
  rather than "would this hit **now**". The positional `<out> <glob>` CLI signature is **unchanged** —
  both new inputs are named flags with defaults, each exercised by its own test rather than always
  overridden (**L41**) — and `merge-findings.mjs`'s CLI now sits behind `if (import.meta.main)` so the
  enumeration can be imported without executing the merge (**L25**'s guard spelling, not a `file://`
  compare). Tests range over the exported enumeration rather than per-member assertions (**L29/L36**),
  require a **positive** `scanner-assigned` and ≥2 distinct members so a broken join cannot pass green
  (**L34**), and pin the two duplicated `basis` strings against the emitter's exported `BASIS_ENUM`
  (**L31**). **Deliberately NOT done:** `pharn/pharn-contracts/finding-shape.md` is untouched — it never
  mentions `sources[]` at all, so a label line there would either restate `merge-findings.mjs`'s header
  (P4) or force documenting the array itself, a second axis; recorded as the deferred follow-up
  `finding-shape-sources-array`. The degenerate dedup key, the max-severity escalation and the
  `sources[0]` representative text are also untouched, and **this label must not be read as mitigating
  them**.

## [6.3.1] - 2026-09-21

### Added

- **`THREAT-MODEL.md` now models the user-installed Claude Code skill surface** (`SKILLS_VERSION` 6.3.0 → **6.3.1**, patch: a clarification to bytes that already shipped — no new capability, no shape change) ([`THREAT-MODEL.md`](./THREAT-MODEL.md) `§2` item 8 / `§3` / `§5`, [`LIMITS.md`](./LIMITS.md) `§2`, [`.dev/features/skills-threat-surface/`](./.dev/features/skills-threat-surface/)) — `§2` enumerated the attack surface as **seven** items and none of them was the one channel three product stages already feed to models: a user-dropped `.claude/skills/<name>/SKILL.md`. **Established by reading, not asserted (P7):** a case-insensitive **whole-file** search of all 134 lines of `THREAT-MODEL.md` for `skill` returned **zero matches**, as did one for `.claude`, and none of the other three trusted docs or the `README` mentions `claude/skills` either — while `pharn/floor/scan-installed-skills.mjs:4` names `/pharn-build`, `/pharn-grill` and `/pharn-review`, whose calls sit at `pharn-build.md:164`, `pharn-grill.md:224` and `pharn-review.md:148`, and `pharn-review.md:187-190` hands the `SKILL.md` bodies to each lens subagent as untrusted context. The sharpest risk in the channel — the **suppression asymmetry**, where a hostile skill talks a lens _out of_ reporting a real finding and the human therefore never sees it, with **no structural backstop at all** for the four scanner-less lenses — was already written down at `pharn-review.md:156-179`, i.e. inside a command file, and absent from the document whose entire job is to enumerate exactly that. This is `lessons-learned` **L25** at range: a rationale reaches only the file it sits in. **The new row is deliberately the weakest in `§3`, and that is the point (P0):** its Floor cell reads **"ENUMERATION ONLY … GATES NOTHING … No primitive is specified or planned for this row"** and omits the `_(specified; ships with the guarded surface)_` marker that four of the seven existing Floor cells carry, because that marker asserts a protection that _will_ ship and **nothing is coming here**. **This change adds no protection whatsoever** — it makes an unmodeled surface modeled, and claims nothing more. **`§5` and `LIMITS.md` were corrected together, and the second file was found by measurement:** `§5` asserted "the one residual", which the increment's own grill measured to be **mirrored in `LIMITS.md` twice** (`:95` "the one place", `:141` "The one residual") — four spellings across two files, and `LIMITS.md:11` states that when claims conflict **the limit wins**, so patching only `THREAT-MODEL.md` would have left the _winning_ document contradicting it. Both were opened to a **non-counting** form ("this is not the only such place", "the known ones are named here") rather than re-counted to "two", because a count is simply a fresh expiry date — promoted as **`L46`**. Also registered `scan-installed-skills.mjs` in [`.dev/floor/specified-primitives.json`](./.dev/floor/specified-primitives.json)'s `named_artifacts` so the new citation cannot drift; **no `forward_claims` entry was added**, and the omission is reasoned rather than forgotten — every such record requires a mandatory `probe` naming a real path (`isLive()` throws → exit 2, fail-closed) and "a gate that reads the skills roster" has none, which is exactly the shape that manifest already deferred for the live-griller-runner and verifier-runner classes: _"a probe would have to invent one. Deferred rather than guessed (P6)."_ **Structurally human-only:** `protect-trusted-paths.cjs` denies the agent every write to `THREAT-MODEL.md` and `LIMITS.md` (probed live, **exit 2**), so the increment shipped three `git apply`-able patches plus an `APPLY.md` and the maintainer applied them, exactly as the `bash-write-claim-wording` precedent prescribes; the Bash route around the guard was **not taken**. Applying them was itself detected by `check-bash-reconcile.mjs` as an escape on `.dev/floor/specified-primitives.json` (`.dev/floor/` is `always_reconciled` against its committed blob) — the checker working as designed, resolved by committing the change rather than by touching the baseline.

## [6.3.0] - 2026-09-21

### Added

- **`/pharn-loop`'s `LOOP.md` now re-derives its own recorded `decision` before an unattended `STOP_GREEN`
  commits** (`SKILLS_VERSION` 6.2.0 → **6.3.0**, minor: a newly shipped product-floor checker, an
  additive optional loop-record field, and changed product-command bytes — no existing install is
  invalidated) — `pharn/floor/check-loop-decision.mjs`, with
  `pharn/floor/check-loop-decision.test.mjs` as its invoker. A dogfooded, unattended `/pharn-loop` run
  skipped `/pharn-grill`, `/pharn-regress` and `/pharn-verify` entirely, hand-executed the equivalent work
  by judgment, and still wrote a `LOOP.md` whose `decision` read as a genuine floor-grade stop.
  `pharn/floor/check-loop-record.mjs` — the only checker that self-validates a loop-record — passed it,
  because its own header is explicit that it verifies SHAPE only: "that `decision` AGREES with what
  `check-loop.mjs` actually emitted (membership is checked, agreement is not)". Nothing in the pipeline
  ever re-derived a recorded decision from the reports it summarizes, so a hand-authored or corrupted
  `LOOP.md` was indistinguishable on disk from a genuinely floor-computed one — and on `STOP_GREEN`
  specifically, that record is committed to a new branch **unattended**, with no human between the record
  and the commit.

  **The fix, and why it adds no new decision logic (P3/P4).** The new checker shells `check-loop.mjs` as a
  CLI via `spawnSync` — the SAME `check-plan-spec-agree.mjs` reuse idiom, never a sibling import of its
  internals — and compares a LIVE re-derived `decision` token to the one recorded, for every non-blocked
  stop. `check-loop.mjs`'s own input signature stays exactly `{verify-report.json, regression-report.json,
iter, cap}`, unchanged, so "no advisory stage can gate the loop's stop decision" remains structurally
  true: this checker consumes the stop's output, after the fact, from a fresh invocation, and gates only
  the downstream `/pharn-loop` Step 6c commit. `cap` — the loop's `--max-iter` value — is added to the
  loop-record envelope as an **optional** field (`pharn/pharn-contracts/loop-record.md`), so every
  existing `LOOP.md` in any install's history stays shape-valid with nothing to backfill; the updated
  `/pharn-loop` writes it on every non-blocked stop going forward, letting the checker fully re-derive
  `STOP_CAP` too, not only the cap-independent decisions.

  **Deliberate asymmetry with `check-ship-briefing.mjs` (stated, not accidental).** That checker's
  cross-file re-verification is annotation-only, because a human `GATE 2` decision already follows it.
  `/pharn-loop`'s `STOP_GREEN → commit` has no human between the record and the branch, so this checker
  **gates** that one step — `not committed: decision unverifiable` joins the closed commit-outcome set.

  **Named, not hidden: the residual this does NOT close (P0).** This proves a recorded decision is
  **re-derivable** from the reports it cites — it does not prove those reports are themselves honest. A
  self-consistent forgery (a hand-written `LOOP.md` paired with hand-written reports that genuinely reduce
  to the claimed decision) still passes. Closing that would mean authenticating the reports' provenance,
  out of this increment's scope. The specific incident's `check-bash-reconcile.mjs` gap is also unclosed
  by this fix — that window closed when the run's worktree was discarded, and is a separate,
  already-designed `STOP_TERMINAL` mechanism this increment does not touch.

  Built via `/pharn-loop` itself (`pharn/features/loop-decision-integrity/`), in an isolated git worktree,
  as an increment fixing the very command that built it — a genuine, not staged, dogfood. It landed
  **after** the `/pharn-review` assignments entry above took 6.2.0, so this increment is **6.3.0** — the
  two are independent and neither reads the other.

## [6.2.0] - 2026-09-21

### Added

- **`/pharn-review` now emits a machine-readable record of what was ASSIGNED to which lens, and a floor
  checker validates it** (`SKILLS_VERSION` 6.1.0 → **6.2.0**, minor: two newly shipped product-floor
  helpers plus changed product-command bytes) — `pharn/floor/render-review-assignments.mjs` (the
  deterministic emitter) and `pharn/floor/check-review-assignments.mjs` (seven invariants), each with its
  own `*.test.mjs`. **The triggering failure was measured, not hypothesised (P7):** `/pharn-review`'s
  Step 1 instructed "record the resolved target file list in the review artifact" and **nothing carried
  it out** — no artifact held it, no emitter wrote it, no checker read it. Dogfooded over a 6-file
  target where all 18 mapped scanners came back empty: a run that spawned **22 lenses over 6 files** and
  one that spawned **1 lens over 1 file** produced byte-identical merged `findings.json`
  (`4dcba3c0…f9b17`), and so did a 6-file versus a 1-file target with an **identical `lenses/` tree** —
  so the directory tree does not carry coverage either. The absence was confirmed by enumerating all
  **154** files under `pharn/floor/`, `pharn/pharn-contracts/` and `.claude/commands/`, not a windowed
  grep. **What the record claims is bounded deliberately and the bound is the whole increment:** each
  entry says **"this slice was ASSIGNED to this lens"** — never that a lens **read**, reviewed, covered
  or examined it, which no floor primitive can reach because spawning and honoring a slice stay
  advisory. The artifact is named `assignments.json`, **not** `coverage.json`, because "coverage" reads
  as "examined" in the one place every future reader meets it first. **`unassigned_scanner_bound[]`
  rather than `unassigned[]`, and that correction is the increment's sharpest catch:** the four
  scanner-less lenses take the whole target, so a plain "assigned to no lens" set is empty **by
  construction for every run forever** — a field that certifies nothing (**L34**). It instead names the
  files no deterministic prefilter reached: the widest nominal assignment on the weakest basis.
  **The emitter, not the model, writes it** — every field is mechanically derivable (a deterministic
  target resolution, `count-lenses.mjs` membership, each scanner's own regex verdict), so routing it
  through prose would have left the checker certifying only that the record agrees with itself
  (**L43**). **The checker deliberately does NOT re-run the scanners** (**L42**): re-execution answers
  "would this hit **now**", not "was it assigned **then**". Two fail-closed edges, both raised by this
  increment's own grill and both pinned by tests because an unexercised fail-closed path is the L41
  blind spot: **no resolvable target** → refuse and write nothing (Step 1's third branch is _ask the
  human_, which a deterministic emitter cannot do, and an empty-target record is not the honest
  degradation); **a registered lens absent from `lens-scanner-map.json`** → refuse rather than invent a
  `basis`. The two mandated failure cases — a registered lens missing from the record, and a slice
  holding a path outside the target — were **mutation-tested**: against checkers with I1 and I2 disabled
  both fixtures pass, so the tests fail on a broken checker rather than passing for unrelated reasons.
  **Wired to no downstream gate, deliberately (P7):** `/pharn-review` self-checks at Step 6b and nothing
  consumes the exit code; a `/pharn-verify` gate would be speculative (no malformed record has ever
  occurred, because none existed) and would put a stage in the **L23** position of owning a gate over
  its own artifact. Named residual: `review-assignments-gate`. **Honest about its own value:** over an
  unmodified deterministic emitter the checker is near-vacuous on the happy path — it earns its place by
  making the record falsifiable by a consumer who did not run the emitter, and by detecting a
  hand-edited record or emitter drift. **No `pharn-contracts/` schema**, recorded rather than omitted:
  no checker in this repo reads a record contract as an input (probed — `check-loop-record.mjs`
  hardcodes its own enum and merely cites `loop-record.md`), so a contract would be a third store of one
  shape (**L35**); reopens on the first second consumer. `assignments.json` was added to **both**
  `PIPELINE_ARTIFACTS` (`check-regress.mjs`) and `reconcile-ignore.json`'s `pipeline_artifacts.names`,
  which tests pin set-equal — without it every `/pharn-regress` run emitting the record would RED.
  **Three findings from the increment's own review were then fixed rather than filed**, each a place
  where a claim was wider than the mechanism under it: **I5** now checks that a `scanner-bound` entry
  names a scanner the map actually **binds** (it had tested only "non-empty string", so a record citing
  a nonexistent scanner passed — weaker than the invariant the approved plan declared, and the map is
  now a **required** argument so the check cannot silently no-op); the emitter **records
  `scanner_errors[]`** instead of folding a scanner that failed to run into a clean miss (which had made
  a wholly broken scanner indistinguishable from a clean target), with **I7** pinning those entries
  inside the target and **disjoint from the slice** — a failed scanner produced no verdict to hit with;
  and the command's audit line no longer reads a bare "FLOOR at emission", because **nothing binds a
  record to its producer** — `generated_by` is self-declared and unread, and a consistently fabricated
  record passes every invariant (measured). What defends the values is that the emitter is deterministic
  and is what the command runs, not anything the checker detects.
  Lens membership, the merge key, the finding shape, the degenerate `rule_id` key, and
  `/pharn-dev-review` are all **untouched** (one axis).

## [6.1.0] - 2026-09-18

### Fixed

- **Both write guards could silently fail to START, and neither could judge the worktree Claude was
  actually in** (`SKILLS_VERSION` 6.0.0 → **6.1.0**, minor: the wiring and jurisdiction halves are
  corrections, but the increment also ships a **new** guard — fix #2 now denies tool writes to git
  metadata) ([`.dev/features/hook-cwd-anchoring/`](./.dev/features/hook-cwd-anchoring/)) — Claude Code runs
  a `PreToolUse` hook in Claude's **current** directory, and the shipped wiring was a relative
  `node .claude/hooks/…`. **Measured, not reasoned about:** with a session's Bash cwd persisted at
  `pharn/pharn-core`, a `Write` the guards deny from the repo root **succeeded**, and the two wired commands
  run from that directory each returned `exit=1  Error: Cannot find module …` — for `Edit LIMITS.md` too.
  Claude Code treats any exit code other than 0 or 2 as a **non-blocking error**, so both guards were off
  with nothing to see. The guard's own header had recorded the same failure shape one layer down ("anchoring
  to cwd silently disabled the whole guard whenever the agent ran from a subdirectory") and its in-script fix
  never reached the wiring; per **L20** the second occurrence earns an executing check, so
  `.claude/hooks/hook-wiring.test.cjs` now runs the committed command strings themselves, with a negative
  control that proves it can tell the fix from the defect (**L40**). The suites that already covered "cwd is
  a SUBDIRECTORY" could not: they spawn the hook by absolute path, so the production path was exercised by
  nothing (**L41**).

  **The jurisdiction half.** `ROOT` is no longer the hook process's cwd: it is the first directory, walking
  up from it, that holds a `.git` entry or is `$CLAUDE_PROJECT_DIR`. A session in a subdirectory therefore
  reads its repo's scope record, and a session inside a worktree is judged — and, now, **protected** — as
  that worktree. `protect-trusted-paths.cjs` ADDS that tree to its guarded roots (never substitutes: the
  hook's own location stays the anchor) when it shares a hook root's git common directory, so a different
  repository around a subpath install is still not guarded. Until now a launch-checkout session could not
  write a sibling worktree at all, and — measured in a real user project — agents answered that denial by
  writing the same files through `python3` heredocs in **Bash**: 11 paths denied, 7 of them written that way
  anyway. The out-of-root deny message gained a third branch for exactly that case, which names the reachable
  remedy (work from a session inside the project that owns the file) and offers no Bash route (**L27**).

  **Why a new guard was required, and why it is a minor bump.** With jurisdiction resolved from `.git`
  entries, a plan that declared a worktree's `.git` could have re-pointed it and removed fix #2 from that
  worktree — worse than today. fix #2 therefore denies any tool write whose root-relative key carries a
  `.git` **segment** (never `.github/…` or `.gitignore`); `.git/hooks` and `.git/config` run code on the next
  git command, so the over-block is deliberate. **Bounded (P0):** this is the `Write`/`Edit`/`MultiEdit`/
  `NotebookEdit` surface only — a `Bash` write still reaches `.git`, exactly as `LIMITS.md §6` says, and
  re-pointing a worktree's `.git` that way still removes its trusted-file guard.

  **Upgrading an existing install is ORDERED.** `pharn update` never touches `.claude/settings.json`, so the
  two commands are a manual step: run `pharn update` first, then change them — the anchored wiring over
  pre-`6.1.0` hooks regresses both guards (probed) — and roll back in the reverse order. New installs get the
  anchored form, since `init` copies `settings.json` when absent. The guards, the wiring and `LIMITS.md` are
  hook-protected, so the change was delivered as a patch and applied by the maintainer through
  `.dev/features/hook-cwd-anchoring/proposed/apply.sh`, which re-runs the three hook suites against the
  applied bytes and restores them from `HEAD` on any failure. `LIMITS.md §7` records what remains: a hook that
  cannot start or times out still does not block; a project path containing `"`, `` ` ``, `$` or `\` is
  unsupported by the substituted command form; and a subpath install entered through a worktree reads a
  different scope record than its setter wrote, and falls back to the fail-closed default.

## [6.0.0] - 2026-09-14

### Changed — BREAKING

- **`/pharn-loop` now runs unattended and commits a green result to a local branch. `SKILLS_VERSION` `5.1.2` → `6.0.0`** ([`.claude/commands/pharn-loop.md`](./.claude/commands/pharn-loop.md), [`pharn/floor/check-loop.mjs`](./pharn/floor/check-loop.mjs), [`.dev/features/loop-autonomous/`](./.dev/features/loop-autonomous/)).

  **Why major.** A shipped command's safety behavior reverses: `/pharn-loop` no longer stops for a human at either gate, and it now writes to git. No installed path moves and no frontmatter shape changes, so `MIN_CLI` is unchanged — an older CLI installs a working tree. The trigger is the maintainer's explicit direction ("it should be fully autonomic… just say that it finished and what was done at the end"), not an observed failure, and is recorded as such (P7).

  **Four behavior changes, listed separately so a regression can be traced to one:**
  1. **The model approves its own SPEC.** `/pharn-loop` invokes `/pharn-spec --model-approve` (a new Step 4a in [`.claude/commands/pharn-spec.md`](./.claude/commands/pharn-spec.md)), which pins the SPEC and records `approved_by: model`. The marker gates nothing and is never presented as a human's approval. On every stop except a committed `STOP_GREEN`, the run reverts the SPEC to `Draft` — an agent-performed step, so an aborted run can skip it.
  2. **Any measurable red is retried up to the cap (Design C).** `check-loop.mjs` now returns `CONTINUE` on a verify `FAIL` or a regression, where Design B stopped. It stays terminal (`STOP_TERMINAL`) on an inconclusive verdict — nothing was measured — and on a **reconcile red**: a retry re-enters `/pharn-build`, whose anchor resets the reconciliation baseline, so retrying would erase a detected Bash escape and let the run commit it. To see that, the checker now reads `verify-report.json`'s `failing_gates` — only when `verdict` is `FAIL`, by exact membership of `reconcile`, and fail-closed on a malformed array. [`pharn/pharn-contracts/verify-report.md`](./pharn/pharn-contracts/verify-report.md) is corrected: it had stated that every floor consumer reads `verdict` and nothing else.
  3. **Questions become an enumerated stuck-point table (S1–S10).** Mechanical cases (the slug, a directory collision, the git base) resolve by a fixed rule; judgment cases stop with a `blocked: <id>` and the summary says what the run needs. Nothing is guessed (P5).
  4. **A `STOP_GREEN` result is committed to a new local branch.** The list is re-derived from the plan at commit time, filtered to regular files and tracked deletions, stripped of git-ignored paths, plus the feature's artifacts by name, and committed with `--pathspec-from-file` under `GIT_LITERAL_PATHSPECS=1`, so content the user had already staged is not swept in and a listed `app/[id]/page.tsx` cannot pull in `app/i/page.tsx`. Hooks run; never `--no-verify`, never pushed or merged. A failed branch, stage or commit unstages the run's list, returns to the original checkout and deletes the branch. The run ends with a summary, not a question.

  **Contract prose corrected, shape unchanged.** [`pharn/pharn-contracts/loop-record.md`](./pharn/pharn-contracts/loop-record.md) now states that `/pharn-loop` also writes `SPEC.md` (the revert), that `commit` names `HEAD` from before the loop's own commit, that a blocked stop writes `decision: INCONCLUSIVE` plus an ignored `blocked:` key, and that **`STOP_TERMINAL` changed meaning** — records written before 6.0.0 used it for a `FAIL` or a regression. The envelope, the enum and the template are byte-identical, so `check-loop-record.mjs` is untouched.

  **Honest scope (P0).** The stop decision and the record shape are floor; the self-approval, the stuck-point mapping and every git step are advisory command prose, pinned for presence and closure by new `.dev/floor/command-hygiene.test.mjs` pins, never for execution. The residual grows and is stated in the command: untrusted intent now reaches an approved pin, a build, executed project gates and a commit with no person reading it first. **Needs a human edit:** `LIMITS.md §1d` still describes a self-stamped `Approved` only as a forgery, and is human-only.

## [5.1.2] - 2026-09-10

### Changed — BREAKING

- **Relocated the product pipeline artifact root from `features/` to `pharn/features/`. `SKILLS_VERSION` `4.0.0` → `5.0.0`.** Requires `@pharn-dev/pharn` **0.5.0** or later (`MIN_CLI` at repo root). **Publish pharn-cli 0.5.0 and this release together** — merging OSS alone leaves fresh installs incompatible until the CLI that writes `pharn/features/` ships. Product commands, capabilities, floor checkers, contracts, and the fail-closed writes-scope default now target `pharn/features/<name>/`; root `features/` is no longer in the install safe-set (your own application `features/` trees are unaffected — PHARN simply no longer uses the root as its artifact root). `.dev/features/` (the build loop) is unchanged. **`pharn update` (0.5.0+)** warns when a root `features/README.md` copy is left behind; move pipeline artifacts to `pharn/features/<name>/` and delete obsolete root copies — reconcile/regress no longer exempt legacy root pipeline paths. See [`pharn/features/README.md`](./pharn/features/README.md).

### Fixed

- **`amendScope()` now WRITES the baseline through the same descriptor it read, closing the half of the
  CWE-367 pair the entry below left standing.** `SKILLS_VERSION` **5.1.1 → 5.1.2** (patch: a correction
  to bytes 5.1.0 already put on the product surface; no capability is added and every success path is
  byte-for-byte what it was — one error message moves, recorded below).
  ([`pharn/floor/reconcile-baseline.mjs`](./pharn/floor/reconcile-baseline.mjs),
  [`.dev/features/amendscope-write-fd/`](./.dev/features/amendscope-write-fd/)) — the entry below
  replaced an `existsSync` + `readFileSync(path)` probe with a descriptor read, and stopped there. The
  amended record was still written back with `writeFileSync(abs, …)`, which **re-resolves the name**: the
  file receiving the amendment need not be the file whose bytes were amended. CodeQL reported exactly
  that on the next analysis of this branch (`js/file-system-race`, security-severity **high**, at the
  write with the paired open cited as its check). `amendScope()` now opens **`r+` once**, reads that
  descriptor, and replaces its contents in place — `ftruncateSync(fd, 0)` then a `writeSync` loop at
  offset 0 — with the descriptor released in a `finally` spanning both. `r+` does not create, so the
  `"no baseline at … — run --anchor first"` ENOENT message and every fail-closed return are unchanged.

  **Why the first fix read as complete, because that is the transferable part.** The TOCTOU pair has two
  members and the pin written for it asserted one — a per-member assertion standing in for a per-set
  rule, which is `.dev/memory-bank/lessons-learned.md` **L29** exactly, one increment later and in the
  same function. The replacement pin is an **enumeration**: it matches every `\w+Sync(abs` occurrence in
  the region and requires the list to equal `["openSync(abs"]`, so a path-addressed call of **any** name
  added later fails without anyone having to remember this class (which also closes the variant-spelling
  hole **L36** names). Both new assertions were **mutation-tested** rather than read: dropping
  `ftruncateSync` fails the padded-record test, and restoring the path write fails the enumeration.

  **`ftruncateSync` is load-bearing, not ceremony.** A write through an existing descriptor neither
  truncates nor seeks, so a record that got **shorter** would keep the previous tail as trailing garbage;
  the path write it replaces truncated implicitly (`O_TRUNC`). Pinned by `★ --amend-scope REPLACES the
record — a longer prior file leaves no trailing bytes`, which pads the record with 4 KiB of JSON-legal
  whitespace and requires the result to be byte-exactly its own canonical serialization.

  **One error path moves.** Opening `r+` requires write permission, so an unwritable record now fails at
  **open** — `cannot open .pharn/reconcile/baseline.json: <message>` — where it previously reached the
  write and reported `cannot write …`. Both are exit **2** with nothing written, so the fail-closed
  behaviour is identical and only the string a caller reads changes.

  **Two things are NOT claimed (P0).** The write is **not atomic**: truncate-then-write has a window in
  which a crash leaves a partial record, the same window `O_TRUNC` had — downstream that is not a silent
  pass, since `check-bash-reconcile.mjs` reports an unparseable baseline as `INCONCLUSIVE` at exit 2.
  And **"the alert is resolved" is settled by the next analysis, not by this repo**: no CodeQL CLI is
  installed in the build environment, so what was verified here is the structural property the rule tests
  — treating a correct reading as a verification is the failure this entry exists to correct (**L37**).

- **`reconcile-baseline.mjs` now reads the baseline record through ONE descriptor, closing a
  check-then-read race (CWE-367).** `SKILLS_VERSION` **5.1.0 → 5.1.1** (patch: a correction to bytes that
  the 5.1.0 entry below already put on the product surface; no capability is added and every success
  path is byte-for-byte what it was — but one error path does move, recorded below rather than smoothed
  over).
  ([`pharn/floor/reconcile-baseline.mjs`](./pharn/floor/reconcile-baseline.mjs), commit `c338b9d`,
  [`.dev/features/record-amendscope-hardening/`](./.dev/features/record-amendscope-hardening/)) —
  `amendScope()` and the `--show` CLI mode each probed the record with `existsSync()` and then opened it
  again with a separate `readFileSync(path)`. Between those two syscalls the path can change: the file
  can be replaced, removed, or swapped for a symlink, so the bytes parsed are not necessarily the bytes
  the existence test approved. Both now `openSync()` once and read **the descriptor**, distinguish
  `ENOENT` inside the `catch` to preserve the exact _"no baseline at … — run `--anchor` first"_ message
  that callers and tests depend on, and release the descriptor in a `finally` so a parse failure cannot
  leak it. Pinned by `★ amendScope reads the baseline through ONE descriptor — no
exists-then-read/write (CWE-367)`.

  **One error path DID move, and naming it is what a patch entry is for.** `--show`'s `readFileSync`
  previously sat outside any `try`, so a **non-`ENOENT`** read failure (`EACCES`, `EISDIR`, a mid-read
  I/O error) threw **uncaught** — Node exit **1** with a stack trace. It is now caught and reported as
  `cannot read .pharn/reconcile/baseline.json: <message>` at exit **2**, joining that mode's existing
  refusal code. Strictly better behaviour, and still a change to what a caller branching on `--show`'s
  exit code observes. `amendScope()` has no counterpart change: its `readFileSync` was already inside
  the `try`, so both its failure modes return the strings they returned before.

  **The bound is unchanged and must not be read as tightened (P0).** The reconciliation record is
  unauthenticated state in the writable tree, and `LIMITS.md §6` plus
  [`pharn/pharn-contracts/reconciliation-record.md`](./pharn/pharn-contracts/reconciliation-record.md)
  both already say a writer holding Bash can rewrite it outright. Closing a TOCTOU window does not
  make the detector adversarial — it removes a way for the checker to act on bytes it never validated,
  which is **correctness under concurrency**, not strength against an attacker. The detector stays
  **non-adversarial** accounting against tooling that escapes its scope.

  **Recorded separately from the change itself, and that is the finding worth keeping.** `c338b9d`
  landed the fix without bumping `SKILLS_VERSION` or adding an entry here, and **both version gates
  stayed exit 0** — `check:changelog` asks only whether the CURRENT value appears in this file, and
  `check:badge` disclaims the class in its own header (_"a badge matching a wrong bump stays GREEN"_).
  Nothing verifies that a bump TRACKS the product bytes that changed. That gap is now measured (at
  `26ab408..HEAD`: one commit, one product-surface file, no bump) and carried as a deferred detector,
  not closed — see [`.dev/features/record-amendscope-hardening/SHIP.md`](./.dev/features/record-amendscope-hardening/SHIP.md).

- **A reconciliation epoch may now hold MORE THAN ONE authorized scope, so a hook-approved write by a
  LATER stage stops being reported as a Bash escape.** `SKILLS_VERSION` **5.0.1 → 5.1.0** (minor: a newly
  shipped mode on a shipped checker; no existing install is invalidated — a baseline with no
  `scope_amendments` key reads as `[]`). ([`pharn/floor/reconcile-baseline.mjs`](./pharn/floor/reconcile-baseline.mjs),
  [`pharn/floor/check-bash-reconcile.mjs`](./pharn/floor/check-bash-reconcile.mjs),
  [`pharn/pharn-contracts/reconciliation-record.md`](./pharn/pharn-contracts/reconciliation-record.md),
  [`.dev/features/reconcile-scope-amendments/`](./.dev/features/reconcile-scope-amendments/)).

  **The defect, measured rather than reasoned about.** An epoch is anchored once at `/pharn-*build`
  Step 0 and carries **one** `scope_snapshot`, but a run legitimately writes under **several** scopes
  inside it. `/pharn-dev-ship`'s Step 2b invokes `/pharn-dev-memory-promote` **after** that anchor, so a
  canon write that went through the **`Edit` tool**, passed **both** live `PreToolUse` guards, and cleared
  an explicit human accept at the promote gate was reported by `check-bash-reconcile.mjs` as _"a write
  reached it outside the guarded tool surface"_ — **false for that write; nothing Bash-written touched
  canon.** Reproduced live while promoting `L41`, and recorded as
  [`.dev/features/product-features-relocation/REVIEW.md`](./.dev/features/product-features-relocation/REVIEW.md)
  **F3**.

  **Probed in BOTH directions, per [[L40]].** With the scope released,
  `protect-trusted-paths.cjs` denies (exit 2); with the promote-origin scope restored it **permits**
  (exit 0) — and the escape **survived anyway**, because the checker then consults
  `baseline.scope_snapshot`, which holds the build's scope. So the live-hook half was a red herring and
  the snapshot half was the cause. **Structural, not incidental:** canon is `never_exempt` by deliberate
  design, and per [[L7]] a build or ship scope may never **name** canon — that is precisely what the
  promote gate exists to withhold — so no `## Files` declaration could fix it from the plan side. Left
  alone, **every** `/pharn-dev-ship` run that promoted a lesson ended `npm run check` RED: [[L17]]'s
  failure mode exactly — a changed-since-anchor test reported as a wrote-outside-scope test, blocking on
  the **correct, designed** workflow, which is what trains an operator to wave through the one finding
  that must never be waved through.

  **The fix.** `reconcile-baseline.mjs --amend-scope` appends the live scope to a new `scope_amendments[]`
  on the open baseline; `check-bash-reconcile.mjs` judges a candidate against the **union** of the opening
  snapshot and every amendment. Additive: `scope_snapshot` keeps its shape and meaning, and an absent
  `scope_amendments` (a pre-5.1.0 record) coerces to `[]`. Wired into both `*-memory-promote` commands
  immediately after their Step-0 setter — **ordering load-bearing, exactly as `--anchor`'s is ([[L38]])**:
  amend _after_ the setter, or it records the previous stage's scope. Fails closed on every unusable
  input (no baseline, unreadable record, no live scope) and deliberately does **not** record an empty
  amendment, since `{"scope": []}` reads as "authorized to write nothing" — a different claim from "no
  amendment was made".

  **`activeFeatureSlug()` still reads the opening snapshot ONLY.** A promote amendment's `set_by` is a
  command path, not a feature; unioning it in would let a promote silently repoint the pipeline-artifact
  exemption at another slug. Pinned by a test.

  **What did NOT change, and the distinction is the whole guarantee.** An amendment makes a write
  **accounted for**, never **exempt** — `never_exempt` is untouched, canon stays in the candidate set every
  epoch, and an _unaccounted_ canon write is still `ESCAPE` (pinned by a non-vacuity control, [[L34]]).
  Nor can an amendment override a guard: a path clears only if the guard **itself**, re-executed with that
  scope materialized in a probe sandbox, permits it — so an amendment whose `set_by` is a `PLAN.md`
  **cannot** launder a canon write past the origin check (also pinned). Delegated, never re-derived
  ([[L37]]). **The detector's non-adversarial bound is unchanged and is not claimed to be tightened:**
  `--amend-scope` is a Bash call, so anything holding Bash can append a scope authorizing anything — but
  the same actor could already rewrite the baseline outright. Still an accounting tool against tooling
  that escapes its scope, still not a control against an attacker.

  **The ship-command wiring carries a DIFFERENT, weaker trigger, and says so (P7).** The same line was
  added after each setter in `/pharn-ship` and `/pharn-dev-ship` **at the maintainer's explicit direction,
  answering no observed failure** — recorded plainly rather than given a manufactured trigger (the
  `check-plan-lessons` sub-check D precedent). Measured: every scope those commands set targets
  `BRIEFING.md` / `SHIP.md` / `ship-record.json`, each already exempt under `pipeline_artifacts`, so it
  **changes no verdict today**; the value is prospective.

- **Post-review hardening for the relocation (`SKILLS_VERSION` `5.0.0` → `5.0.1`).** Floor tests pin install-posture denial of legacy root `features/` and reconcile non-exemption of root pipeline paths; `render-ship-briefing.mjs` CLI default matches `pharn/features/`; migration prose added to `pharn/features/README.md`.

## [4.0.0] - 2026-09-10

### Changed — BREAKING

- **A Bash write outside the declared writes-scope is now DETECTED, and fails `/pharn-verify`. `SKILLS_VERSION` `3.2.1` → `4.0.0`** ([`pharn/floor/check-bash-reconcile.mjs`](./pharn/floor/check-bash-reconcile.mjs), [`pharn/floor/reconcile-baseline.mjs`](./pharn/floor/reconcile-baseline.mjs), [`pharn/pharn-contracts/reconciliation-record.md`](./pharn/pharn-contracts/reconciliation-record.md), [`.dev/features/bash-write-reconciler/`](./.dev/features/bash-write-reconciler/)).

  **The gap.** Both `PreToolUse` guards match `Write|Edit|MultiEdit|NotebookEdit`, so a write issued through **`Bash`** reaches every path in the repo, is not denied, and — no `PostToolUse` hook being wired — leaves no record. `LIMITS.md §6` states that bound. `lessons-learned` **L19** named it on 2026-08-05 with a **discipline-only** remedy; **L20**'s rule is that such a remedy WILL recur and the **second** occurrence earns a floor check. It recurred at least three times (L19's own repo-wide-formatter case, **L38**'s writes-scope contention, and `/pharn-*memory-promote`'s `docs/lessons-index.md` generator write), so the trigger is met and is **not** manufactured.

  **Why DETECTION and not prevention — the finding that shaped the design, verified against the live documentation rather than assumed.** A `PostToolUse` hook **cannot block**: its exit 2 is documented as _"Shows stderr to Claude"_ — the tool has already run — and the event carries no `permissionDecision` field. The strongest thing a hook there can do is put text in front of the model, which the model may ignore: **advisory by construction**, and calling that a guarantee would be the exact P0 disease. Enforcement therefore lives in a checker whose exit code `check-verify.mjs` already folds into a verdict `/pharn-ship` and `/pharn-loop` branch on. **`check-verify.mjs` needed no edit** — it is generic over gate keys, so the verify commands add a `reconcile` entry to the map they already assemble. **No new floor primitive, no new proceed/stop wiring.**

  **How it works.** `/pharn-*build` Step 0 anchors an epoch **after** the scope-setter (order load-bearing: the anchor snapshots the live scope **into** the baseline, because by verify time `.pharn/writes-scope.json` holds a **later** stage's scope — **L38**, and the trap `check-regress.mjs` documents from the other side). `/pharn-*verify` then re-hashes and asks, for each changed path, **would the guards have denied a write here?** Denied ⇒ escape. A path written through the guarded surface was permitted by those same guards **by construction**, so ordinary `Edit`s can never be flagged — which is why no record of guarded writes is needed and the increment carries **no `.claude/settings.json` change**.

  **`git status` is deliberately not the primitive.** It answers _changed since the base commit_, a different question: it misses a Bash write that restores HEAD bytes, and it counts every legitimate Write-tool edit as a change with no way to separate the two. `check-regress.mjs scope` already makes exactly that conflation and **L17** is the record of it. The baseline is _content-hash vs the last anchor_.

  **"Denied" is DELEGATED, never re-derived** (**L37** — execute the op, do not re-read it): trusted-path/canon/control-surface denial **executes** `protect-trusted-paths.cjs`; the fail-closed **default** **executes** `enforce-writes-scope.cjs` in a probe sandbox reproducing only the two runtime signals its `defaultSafeSet()` reads, so that set is never copied and a future change to it is inherited. Exactly **one** matcher is duplicated (the explicit-scope glob, which cannot be delegated because the hook reads the scope from disk) and it is pinned by a parity test that **runs the real hook** over shared cases — the `check-build-complete.mjs` precedent. Measured: **1738 files, 10.3 MiB, 349 ms** per pass, twice per stage and **zero per Bash call**.

  **Why MAJOR.** By the letter of CLAUDE.md's rule this is a minor — a newly shipped checker that changes no existing contract, finding-shape, or frontmatter. It is versioned major on **this repo's own precedent**: sub-check D (`2.8.0` → `3.0.0`, filed under this same heading) was a strictly-additive blocking sub-check that changed no shape either, and it was treated as breaking because it **can RED a previously-green run**. This is strictly more so — D reds a plan missing a body line, fixable in one line by its author, while this reds a **repo state** and can fire on writes a user's own toolchain makes.

  **The bounds, and they are the point (P0).** _Detected_, not prevented — the only true prevention is OS-level sandboxing of the `Bash` process, which PHARN does not implement and cannot (harness-layer; `LIMITS.md §6`). **Struck:** "Bash writes are prevented"; "all Bash writes are detected" (only DENIED paths, inside the reconciled set, between two anchors, in one worktree); "a `CLEAN` verdict means no escape occurred" (it means none was **detected**); "the detector cannot be disabled" — its state is reachable by the channel it monitors, and what holds is that disabling it is **loud**: `--require-baseline` makes an absent baseline `INCONCLUSIVE`, and the always-reconciled control surface (`.claude/hooks/*`, `.claude/settings*.json`, `pharn/floor/*`, `.dev/floor/*`) falls back to **committed blob ids**, so that half stays covered with no baseline at all. **No shell command string is ever read** — shell parsing is undecidable and a verb denylist is a heuristic, which P0 forbids labelling a guarantee; the reconciler compares hashes and paths, so `sed -i`, a here-doc, `node -e` and a compiled binary are equally visible. `NO_BASELINE` is **green by design** (a fresh clone has never anchored — the posture `check-lessons-index.mjs` takes for `COLD`).

  **One real defect surfaced by the inventory that produced this**: `gitleaks.yml` unpacked its binary and archive into the **checkout root** — untracked and not gitignored. Fixed by extracting into `$RUNNER_TEMP`; adding them to `.gitignore` would have hidden the signal rather than removed the cause.

## [3.2.1] - 2026-09-10

### Fixed

- **Two docs stating the writes-scope guard's fail-closed default were wrong about its width and its
  source; both are corrected against a probe rather than a reading.** `SKILLS_VERSION` **3.2.0 → 3.2.1**
  (patch — a correction to product-surface bytes that already shipped; no new capability, command or
  checker lands) ([`README.md`](./README.md) `## Current limitations`,
  [`.claude/commands/pharn-review.md`](./.claude/commands/pharn-review.md),
  [`.dev/features/readme-writes-scope-default/`](./.dev/features/readme-writes-scope-default/)) —
  `.pharn/**` is **not** a member of `DEFAULT_SAFE_SET`. It is `ALWAYS` (`enforce-writes-scope.cjs:120`),
  composed into the allow-list **unconditionally** (`allow = [...ALWAYS, ...(scope || defaultSafeSet())]`),
  so it stays writable **with a set scope too**. Both sites filed it under the fail-closed default, which
  gets its source and its consequence wrong. **Measured in a throwaway installed-project fixture, not
  reasoned about:** with no scope file `features/x/PLAN.md` and `.pharn/scratch.json` exit **0** while
  `.pharn/writes-scope.json` exits **2** (denied by name at `:314`, before the allow-list is consulted);
  with a scope set from a `## Files` list of `["src/app.ts", "package.json"]`, `.pharn/scratch.json`
  **still** exits 0 while `features/demo/PLAN.md` exits **2**. **The README bullet was wrong in four
  ways** — it attributed `.pharn/**` to the default, made a universal claim false for the guard's own
  input, called `.pharn/` a "product pipeline artifact director[y]" when `CLAUDE.md` defines it as
  gitignored runtime state, and presented "set a scope that names those paths" as additive when a set scope
  **replaces** the default, so a user following it to reach `src/app.ts` silently loses `features/**`.
  **The sharper defect was on the shipped surface and no reading of the README would have reached it:**
  `.claude/commands/pharn-review.md` claimed the no-scope default is "**exactly** `features/**` — the same
  set this command's `writes:` declares", in a passage whose stated purpose is being "written at its real
  width", for the one command that sets **no scope of its own** — so that default _is_ its live enforcement
  boundary. It was found by sweeping the **stem** `safe[- ]set` rather than the sentence (**L33**/**L36**:
  a claim class does not ship in one spelling, and the first grep is a lower bound to beat); two further
  hits were checked and left alone as correct (`README.md` `:289`, `pharn/floor/README.md:108` quantify
  nothing). **This is `L37`'s own defect recurring, which is why the remedy is L37's remedy:** L37 was
  promoted _from these very sentences_, and its repair replaced the quantifier `only` with `restricted to`
  while leaving the unlisted exception unstated — a new spelling of the same quantifier. Every corrected
  sentence here is therefore backed by an executed probe over a member expected to be **excluded**, with
  the exit code recorded beside the claim. **No new floor primitive, and the refusal is argued rather than
  assumed** (the increment's own grill caught the first draft claiming impossibility): a
  stem-scan-inverted enum-regex check _is_ constructible, and is declined on **value** — it would pin one
  exception's spelling while leaving the ALWAYS-vs-default attribution and the replaces-vs-adds trade
  unguarded, reporting GREEN over a bullet wrong in three of its four claims. The named residual
  `default-safe-set-doc-pin` stays deliberately unbuilt. **Bound (P0):** nothing reads either file's
  prose — `validate.mjs` ignores root docs and `.claude/`, `check-capability-catalog` guards only the
  `CURRENT-STATE` markers, `check-version-badge` reads only the shields badge — so these sentences are
  correct today by evidence, not by enforcement. An earlier entry's identical false "exactly `features/**`"
  is deliberately **not** rewritten: it is historical, and this entry carries the correction forward
  instead. Promotes **L40** (probing a claim's members confirms membership, never its stated **cause** — to
  test an attribution, vary the attributed condition, not the member), the sharpening of L37 this run
  produced.

- **Two trusted docs stated write-guard guarantees without naming the tool surface they cover** (`SKILLS_VERSION` 3.1.2 → **3.1.3**, patch: corrections to bytes that already shipped) ([`.dev/features/bash-write-claim-wording/`](./.dev/features/bash-write-claim-wording/)). `LIMITS.md §1d` read that the pre-write / writes-scope hooks re-gate **every downstream write** — false for a `Bash` write, which the wired `PreToolUse` matcher (`Write|Edit|MultiEdit|NotebookEdit`, re-tested in both hooks) never sees. `THREAT-MODEL.md §3`'s memory-poisoning row and `§4` items 2 and 7 carried bare `pre-write hook` / _Closed for writes_ without that bound — including for the row that answers §2's _worst persistence vector_. Applied the human-hand patches from `proposed/LIMITS.md.patch` and `proposed/THREAT-MODEL.md.patch`: `LIMITS.md §1d`'s quantifier is now scoped to the four-tool surface and points at new **`§6`**, which records the matcher, a probe table with exit codes, the struck unqualified claims, that a `Bash` write is **neither denied nor detected at write time** (no `PostToolUse` hook is wired), the one partial advisory detector (`check-regress.mjs scope`) with its four bounds, and OS-level sandboxing of the `Bash` process as the only true prevention — named unimplemented and harness-layer, like §1d's out-of-band approval signal. `THREAT-MODEL.md` now names the four tools on the memory-poisoning row, completes item 2's surface list with `NotebookEdit`, and bounds item 7's _Closed for writes_ to that surface with the `§6` residual. **Wording only** — no checker, hook, or contract behavior changed. The `README.md` scope landed in #208; these two trusted docs are hook-denied to the agent and were applied with `git apply` outside the Write-tool surface, exactly as `proposed/APPLY.md` prescribed.

## [3.2.0] - 2026-09-10

### Added

- **`pharn.config.json`'s `models.stages` is now the floor-checked source of truth for the ten PRODUCT
  commands' model/effort** (`SKILLS_VERSION` 3.1.2 → **3.2.0**, minor: a newly shipped product-floor
  checker plus changed product-command bytes) — `pharn/floor/check-model-config.mjs`, with
  `pharn/floor/check-model-config.test.mjs` as its invoker, so `npm test` → `npm run check` → CI all
  fail on drift. Until now the block governed only the three wired `pharn-dev-*` commands, and the
  README said so: _"no product command reads it — the pipeline runs on whatever model your Claude Code
  session is using. Treat the block as reserved, not as a control."_ That sentence is replaced, not
  deleted (`lessons-learned` **L33** — a "not yet wired" claim expires the moment the work lands).

  **The mechanism was READ LIVE, and it decides the whole design (P6).** Claude Code selects a
  command's model through **static frontmatter and nothing else**: `model:` and `effort:` are real,
  platform-honored command-frontmatter fields. There is **no runtime routing hook** — no command can
  read a JSON file and switch its own model, and nothing in this repo reads `pharn.config.json` at run
  time. So `models.stages` cannot _be_ the runtime control; it can only be the **source of truth the
  static frontmatter is held to**. The ten product commands (`/pharn-spec`, `-plan`, `-grill`, `-build`,
  `-regress`, `-verify`, `-ship`, `-loop`, `-review`, `-memory-promote`) now each carry `model:` /
  `effort:` equal to their config-resolved value, and the checker REDs on any disagreement.
  Simulating routing — a command "consulting" the config in prose — was refused: written in the config
  mistaken for guaranteed is the P0 disease.

  **What GREEN buys, and the three things it does not (P0).** FLOOR: the config is shape/enum-valid; a
  stage resolves deterministically through the own-property pick with a `default` fallback
  (**L15** — `Object.hasOwn`, never `||`/`??`, so `resolve toString` cannot print `{}` at exit 0); and
  each of the ten commands' frontmatter EQUALS its resolved value, **bidirectionally** (no mapped
  command missing, no unmapped product command carrying `model:`/`effort:`). NOT guaranteed:
  (1) **the stage is never proven to have RUN under that model** — the platform applies model/effort,
  invisible to any hook, hash or enum; (2) **turn scope** — the platform states the override "applies
  for the rest of the current turn", so it takes effect when a human invokes a stage command
  **directly**, and a stage invoked as a step **inside** `/pharn-ship` or `/pharn-loop` runs in the
  orchestrator's turn and gets no per-stage routing; (3) **platform veto** — a value excluded by an
  organization's `availableModels` allowlist, or unsupported in auto mode, is silently not used. All
  three are stated in the checker header, in the `agreement` GREEN line itself, and in the README.

  **Fresh-install posture, and its cost, stated rather than hidden.** A target with no
  `pharn.config.json`, or a config with no `models.stages`, is **GREEN by design** — the
  `check-lessons-index` `NO_CANON` / `COLD` precedent: the honest normal state of an install that does
  not use the block, and REDding there would make every such install a false alarm. The consequence is
  that a user who **deletes** the block loses the check rather than failing it. Conversely a config
  stage key that is not a product stage (a `bulid` typo) **is** a RED: on the product surface it
  governs nothing, so it must not sit there looking like a control.

  **Why a sync check at all — `lessons-learned` L35's question was asked first.** L20 says a
  discipline-only invariant earns a floor check on its second occurrence; L35 is the qualifier that
  stops that from firing every time: _must the second copy exist?_ Here it must, in both directions.
  The frontmatter copy is the **only** copy the platform reads. The config copy is the one place a user
  tunes all ten stages, and the installer already validates and prints it. Neither can be drained the
  way `package.json`'s `version` was, which puts this in **L31**'s regime (copies that must both exist
  → build the thing that ranges over them), not L35's. A **generator** that rendered the ten
  frontmatters from config would be the stronger answer still — a generated copy is a rendering, not a
  maintained identity — and it is recorded as considered-and-not-taken in
  `.dev/features/product-model-config/PLAN.md`, not silently dropped.

  **The enumeration is the deliverable (L29 / L36 / L34).** `PRODUCT_STAGES` is a materialized, closed
  stage→command map that every pass iterates; the agreement RED test walks **all ten** stages one at a
  time rather than asserting over the one its author had in front of them; the reverse pass **closes**
  the set instead of merely asserting presence over its members; and a walk that discovers **zero**
  product commands is a loud RED, never a vacuous GREEN. `model_tier:` is deliberately untouched and
  cannot be confused for `model:` — it is PHARN's own capability frontmatter (`ARCHITECTURE §3.1`),
  inert to the platform, and the parser matches keys exactly (**L6**: read the structured location,
  never grep).

  **Apparatus change, and why it was needed.** `.dev/floor/check-config.mjs`'s agreement pass is now
  scoped to a closed `DEV_WIRED` set (`plan`, `build`, `review`) instead of "every non-`default` config
  stage". Without it, the shared `models.stages` — which now legitimately carries product-only stages
  like `spec` and `loop` — would make the dev checker look for a `pharn-dev-spec.md` that does not
  exist and RED on a correct repo. The narrowing is to a **materialized set**, not to "whichever stages
  happen to have a file", because a file-existence test would silently stop checking a **renamed** dev
  command. Its **reverse** pass was re-keyed onto `DEV_WIRED` for the same reason and is now strictly
  stronger: before, it asked "does a config stage exist?", so the moment `grill` existed for the
  product surface `pharn-dev-grill.md` could have gained a `model:` unnoticed. No `pharn-dev-*` command
  gained or lost `model:`/`effort:`; the three that carry them still do, with the same values.

## [3.1.2] - 2026-09-10

### Fixed

- **Every capability walker excluded `.claude/commands/` but not `.claude/`, so a nested checkout under `.claude/` was walked as this repo's product surface** (`SKILLS_VERSION` 3.1.1 → **3.1.2**, patch: corrections to bytes that already shipped) ([`.dev/features/claude-dir-scan-exclusion/`](./.dev/features/claude-dir-scan-exclusion/)). `EXCLUDE_SEGMENTS` named **one member** of the `.claude/` subtree in all five walkers — `pharn/floor/validate.mjs`, `count-lenses.mjs`, `count-grillers.mjs`, `count-verifiers.mjs` and `.dev/floor/capability-catalog-core.mjs`. Claude Code's own worktree feature materializes a full nested checkout at `.claude/worktrees/<name>/`, git-ignored via `.git/info/exclude` so `git status` stays clean, and with one present this repo measured: **`validate.mjs` reported 72 capabilities instead of 36 AND STILL EXITED 0**, `count-lenses` 44 instead of 22, `count-grillers` 26 instead of 13, `npm run docs:check` RED with `duplicate page slug "seam-resolver"`, and `npm test` 2 failures out of 3055 (against 1886 clean). The doubling is **silent on the one checker whose exit code gates a build** — the catalog's throw was loud only by accident of two capabilities sharing a directory name. **The repair is CLOSURE, not a second member (`lessons-learned` L36):** adding `.claude/worktrees/` would re-certify only the spelling its author was looking at, and this was **demonstrated rather than argued** — mutation-testing the new probe against that exact second-member form passes the `.claude/worktrees/wt1/` case and **fails** the `.claude/zzz-arbitrary/` one. **The widening has a real cost and it is stated rather than waved off** — caught by this increment's own review (R1) and measured, not reasoned about. In PHARN's own tree nothing under `.claude/` is a capability (commands were already excluded, hooks are `.cjs`, settings are JSON), so the widening costs **this repo** nothing. That reasoning does **not** transfer to a user: these walkers **ship**, `.claude/` is the **user's** directory, and a capability authored under e.g. `.claude/my-caps/` **was counted before this change and is not counted after** — on a fixture user-repo, 2 capabilities became **1**, with `validate` **exiting 0 both times**. The trade is accepted deliberately (it is the same one `.claude/commands/` already made, no such user is known, and the alternative is walking a nested checkout as product surface) and it is **pinned by a test**, so a future change that intends to start counting them fails rather than drifts. A control test likewise pins that a real `role: lens` under `.claude/commands/` — the `/pharn-dev-review` case — is still excluded. The first draft of this entry, and the comment in `validate.mjs`, both read "widening loses nothing"; that is struck, because it loses exactly that. **The evidence was re-derived once (`L26`):** the first plan draft anchored on the live worktree, that worktree was removed by its own session mid-run, and every number inverted; `/pharn-dev-grill` caught it, and the trigger now rests on a **reproducible fixture** measured at the real path, with the real-world occurrence demoted to history. Ships `.dev/floor/walker-exclusion.test.mjs`: a single `WALKERS` enumeration every rule iterates (**L29** — the set is the deliverable), asserting closure **structurally** (the declaration names `${sep}.claude${sep}` and nothing narrower, so the per-member repair fails the suite), **behaviourally** over two structurally different nested paths, and with a **non-vacuity control** (**L34**) — the fixture ships a `role: verifier` capability for that reason alone, since `count-verifiers` reads 0 against the real repo and "0 before, 0 after" is exactly the vacuous pass. **Also narrowed `package.json`'s test glob**, which reached past the same boundary by a **different mechanism**: `**` does not descend into dot-directories, so the leading `**/*.test.mjs` was never the culprit — the **explicit** `.claude/**/*.test.{mjs,cjs}` was, and it is now `.claude/hooks/*.test.{mjs,cjs}`. Measured in a fixture holding a nested duplicate: `**/*` alone → 1 test, `+ .claude/**` → 2 (the duplicate runs), `+ .claude/hooks/*` → 2 (a real hook test runs, the duplicate does not); the narrowing loses nothing, since every test file under `.claude/` is a hook test. **ADVISORY, and stated (P0):** no checker reads that glob — nothing stops it widening again; the named residual is `test-glob-check`, unbuilt because **L20**'s bar is a second occurrence and this is the first. **NOT claimed:** that a nested checkout **anywhere else** is excluded — a clone at `tmp/` still doubles every count, and only `.claude/` produced an observed failure (P7). **NOT claimed:** that `validate` reporting 36 means the count is _correct_ — this fixes **what it walks**, never establishes the number, and the catalog's agreement with `validate` stays a second implementation and stays advisory.

- **The 36 generated capability pages claimed PHARN had no installer, ~13 months after `@pharn-dev/pharn` was published** (same `3.1.2`) ([`docs/capabilities/`](./docs/capabilities/)). Every page ended `_No install command yet — this repo has no PHARN CLI or install-token. Copy the source file above._`, rendered from a hardcoded string at `.dev/floor/capability-catalog-core.mjs` since #101 (2026-07-23). This is **`lessons-learned` L33 exactly** — a "not yet" claim that expires in a file nobody is editing — and it is the sharper half of that lesson: the 2026-08-23 rewrite (`f7c3caa`, #166) whose **entire purpose** was correcting this claim class across `README` / `SECURITY` / `CONTRIBUTING` / `CLAUDE` **missed the generated surface**, and a test at `capability-catalog-core.test.mjs:151` **pinned the false sentence**, so the stale claim actively resisted its own correction. Nothing could catch it: `check-capability-catalog.mjs` guarantees byte-equality only, and `check-specified-markers.mjs` reads a hand-maintained manifest naming five files, none of them generated. The enumeration was re-derived per L33's remedy — from the shortest invariant substrings (`install command`, `install-token`, `no PHARN CLI`, `no installer`, `no versioned release`, `no CLI`), treating the first grep as a **lower bound to beat**: 36 files became 43. The extra seven are **frozen audit trail** (this file's own #101 entry, three `.dev/features/*/PLAN.md`, one `GRILL.md`) which were **true when written** and are deliberately left alone — correcting them would falsify the record. Exactly **two** live source sites existed and both changed: the renderer, and the test pin, which is now two independent assertions (positive **and** an absence check, since the positive one alone would pass if the old sentence were merely appended) plus a single-line assertion, because the plan specified the replacement wrapped and the renderer emits one line. **STILL ADVISORY (P0):** no floor op reads a rendered sentence for its truth. Repairing this does **not** close that gap — `expired-claim-check` is the named residual, unbuilt on the same L20 first-occurrence reasoning.

- **`-` meant three different things in the lessons index and the legend explained one of them** (same `3.1.2`) ([`docs/lessons-index.md`](./docs/lessons-index.md)). `ABSENT = "-"` is rendered into the `type`, `concepts` **and** `promoted` columns, while each legend defined it for the tag columns only — so canon `L10`, which has no `- promoted:` line, renders `-` on a page whose own header reads `0 untagged`, and the dev legend instructed the reader that "BOTH absence markers are unexpected", which is the wrong instruction for that column. Present in **both** copies of the deliberate dev/product copy-pair — `.dev/floor/lessons-index-core.mjs` and `pharn/floor/lessons-index-core.mjs` — which is **`lessons-learned` L31**'s shape: the second copy is where the obligation is dropped. Both are fixed, and their **deliberate divergence is preserved** rather than collapsed (the dev half keeps "unexpected" for the tag columns, the product half keeps its benign reading, because a user's `memory-bank/` may legitimately hold hand-written entries); `renderIndex` is already in `DIVERGENT_FUNCTIONS`, so collapsing them would correctly trip that ✧ pin. **ADVISORY:** that the legend now reads unambiguously is prose nothing checks; what is floor is unchanged — `docs:check` byte-equality over the regenerated index.

- **Canon `L10`'s provenance block was displaced into `L11`; the repair shipped as a human-apply patch and was APPLIED after GATE 2 at the maintainer's instruction** ([`.dev/features/claude-dir-scan-exclusion/proposed/APPLY.md`](./.dev/features/claude-dir-scan-exclusion/proposed/APPLY.md)). Measured over all 37 entries at the time, exactly two were anomalous: `L10` carries **zero** `**Provenance.**` blocks and `L11` carries **two**. The second names `feature: product-pipeline-probe` — `L10`'s own subject — and `promoted: 2026-06-30`, which **predates** `L11`'s own `2026-07-01`; `git log -S` places it in `0888102` (#25, "product-pipeline-probe … L10"). So it is a **move, not a reconstruction**: no SHA, date or feature name is invented. **The build could not apply it, and that is the guard working as designed** — probed rather than assumed (**L37**): with a build-origin writes-scope, an `Edit` to `.dev/memory-bank/lessons-learned.md` exits **2** at both `protect-trusted-paths.cjs` and `enforce-writes-scope.cjs`, and the deny message names this exact case ("Re-scoping a build from a PLAN's `## Files` CANNOT authorize this write"); with a promote-origin scope the same payload exits 0. `/pharn-dev-memory-promote` is not a route either — it appends a **new** entry, it does not move a misplaced block. The three ways past the guard were each **refused rather than taken** by the build. **Applied after GATE 2**, on the maintainer's explicit instruction, through the `Edit` tool under a promote-origin writes-scope — and the route is recorded rather than glossed, because that origin **misdescribes** the operation: `/pharn-dev-memory-promote` appends a **new** entry and cannot move a misplaced block, so the scope record reads "promote" for what was a **repair**. That mismatch is the guard's own documented hole (`set_by` is written from argv), not a defect found here; what the guard buys is that a canon write costs a separate, explicit, auditable act **a build plan cannot cause**, and that act was the instruction. **No Bash write to canon was used** — the route CLAUDE.md forbids was not taken. Verified after the move: **0 anomalies across all 39 entries**, the relocated block **byte-identical** (326 bytes), `L10`'s index row now `2026-06-30`, and **no** entry rendering `-` in the `promoted` column. The three frozen stage records (`PLAN.md`, `REVIEW.md`, `VERIFY.md`) still say unapplied and were **deliberately left alone** — each was true when that stage ran, and correcting them would falsify the record (the same L33 distinction applied to this increment's install-footer sweep). **NOT claimed:** that anything prevents a recurrence — no checker asserts "exactly one provenance block per entry", and the live-canon guard pins tag lines only; `provenance-block-count-check` is the named residual, unbuilt (L20, first occurrence).

## [3.1.1] - 2026-09-10

### Deferred

- **The memory-bank canon denylist is now LIVE on the write-tool surface** (`SKILLS_VERSION` 3.1.0 → **3.1.1**, minor: a newly shipped guard on the product `.claude/` surface) ([`README.md`](./README.md) `## Current limitations`, [`.dev/features/canon-write-denylist/`](./.dev/features/canon-write-denylist/)) — `THREAT-MODEL.md §2 #3` calls memory-bank poisoning the **"worst persistence vector"** (write-once-influence-forever, silent and cumulative, no rollback signal) and `§3` maps it to the floor primitive **"pre-write hook"**, with no `(specified; …)` marker — i.e. asserted as live. **That mapping does not hold, and it was measured rather than reasoned about:** `.claude/hooks/protect-trusted-paths.cjs` contains **zero** `memory-bank` references, so a `Write` payload naming `memory-bank/lessons-learned.md` exits **0** there. The composed verdict therefore rests entirely on `enforce-writes-scope.cjs`, whose scope for `/pharn-build` and `/pharn-dev-build` is parsed from an **untrusted `PLAN.md`'s `## Files`** via `set-writes-scope.cjs --from-plan`, and whose `CONTROL_SURFACE` refusal covers only the four `.claude/` control paths — **never canon**. So a `## Files` entry naming a canon file grants a direct write that never passes `check-provenance.mjs` or `/pharn-memory-promote`'s human accept/deny gate, and **no human approves a product `PLAN.md`**; the poisoned lesson is then read by every later `/pharn-plan` run's `applied_lessons` sweep. **Not hypothetical (P7) — it has happened twice and both are already in canon:** `lessons-learned` **L7** (a `writes:` over-declaration handed `/review` "a direct, ungated canon write") and **L20** (`product-capability-catalog`'s `## Files` over-grant resolved **6 paths against the human-approved 2**, and the over-grant reached `.dev/memory-bank/lessons-learned.md` itself — through `--from-plan`, this exact vector). L20's own rule is that a discipline-only remedy's **second occurrence** earns a floor check, so this is that trigger fired, not a manufactured one. The gap was previously recorded **only** in a command file, a test comment and a CHANGELOG entry under the slug `canon-write-denylist` — never anywhere a user looks — which is why the disclosure lands in the README's `## Current limitations` here. **Why this needed a human to land, recorded because it shaped the increment:** the denylist must compose with an existing case-fold + segment-wise-symlink-resolution + fail-closed decision path, so it can only live in one of the three hook scripts — and **all three are protected by the very hook being changed** (probed live: `protect-trusted-paths.cjs`, `enforce-writes-scope.cjs`, `set-writes-scope.cjs` → **exit 2**; `*.test.cjs` → exit 0). The increment is therefore **structurally human-only**, and the three routes past it were each refused rather than taken: a **Bash** write (`CLAUDE.md`: routing an _in-repo_ write through Bash to dodge the guard "is still the thing you must not do"), unwiring the hook in `settings.json` (itself protected — the exact self-escalation the guard exists to stop), and `PHARN_PROTECTED` (which only **extends** the set; there is no reducing knob, by design). **What SHIPPED, verified by EXECUTION rather than review (`lessons-learned` L37):** the complete replacement hook plus a standalone probe that stages it into a throwaway fixture repo and asserts **59/59** checks — the six canon paths denied fail-closed, a **non-vacuity control** so the suite cannot pass by denying everything (**L34**), every existing `DEFAULT_PROTECTED` entry still denied, case variants + Unicode full-fold (`ſ`) + Windows trailing dot/space, file/directory/**dangling** symlink and hard-link aliases, **the finding's exact vector** (a `set_by` of `features/foo/PLAN.md` does **not** authorize), the escape allowing both real promote origins, **13 near-misses** each refused, all four write tools, and the deny message's two branches each carrying its own remedy and **absent from the other** (**L27/L29**). **The escape's honesty is the load-bearing part and is deliberately narrow:** authorization is the writes-scope record's **ORIGIN** (`set_by`, which `set-writes-scope.cjs` writes from its **argv**), so **no `writes:` declaration and no `## Files` entry can set it for itself** — the same property that file claims for `--allow-claude-dir`. It is **NOT** non-self-grantable against an agent holding **Bash**, which can run the setter with promote-shaped argv or forge the record outright; **no mechanism without that hole was found, and none is claimed**. It grants nothing new (the same actor could already `cat >>` canon), and what changes is that on the guarded tool surface a canon write costs a **separate, explicit, auditable act a build plan cannot cause**. **"Canon cannot be written" stays struck (P0)** — Bash bypasses `PreToolUse` entirely, and the denylist narrows the gap, never closes it. **The probe earned its keep:** it caught a real defect in the first draft — `!aliased` in the decision branch denied the **legitimate** canon path whenever that file happened to carry a second hard link, i.e. `/pharn-memory-promote` would have broken on a hard-linked canon file — which reading the code had not surfaced. **`SKILLS_VERSION` IS bumped, 3.1.0 → 3.1.1:** the applied hook is a product-surface byte, so `CLAUDE.md`'s rule requires it. The patch was applied by the maintainer with `cp` outside the agent loop, exactly as `APPLY.md` prescribed, and verified live afterwards: the three canon paths exit 2, a control `features/**` path exits 0, and the probe passes 59/59. Apply instructions, the expiring-prose enumeration (seven sites, found by sweeping **two** invariant substrings because the first was a lower bound the second beat — **L33**), and a suggested `THREAT-MODEL.md` sharpening for a human to weigh are in `.dev/features/canon-write-denylist/proposed/APPLY.md`.

## [3.1.0] - 2026-09-10

### Added

- **The two pipeline-spine artifacts that had no contract now have one — `pharn/pharn-contracts/verify-report.md`
  and `pharn/pharn-contracts/regression-report.md` (`SKILLS_VERSION` 3.0.12 → 3.1.0, **minor**, matching this repo's own
  precedent for every prior contract addition — `ship-record.md` 1.0.0 → 1.1.0, `loop-record.md`
  2.0.0 → 2.1.0, `ship-briefing.md` 2.5.5 → 2.6.0 — and SemVer's rule that ADDED surface is minor
  while patch is reserved for backward-compatible fixes; flagged in review as arguably patch, since
  CLAUDE.md's bump-size sentence names "capability / command / checker" and a contract is none of
  the three, so the precedent is recorded here rather than the ambiguity being resolved silently).** `pharn-contracts` is the schemas-only root of the layer tree that
  everything depends on, yet **two of the seven spine artifacts bypassed it**: `verify-report.json` and
  `regression-report.json` were emitted by shipped commands, read by shipped floor checkers, and
  described nowhere. Surfaced by an adversarial review of this repo
  (`no-contract-for-2-of-7-artifacts`, MED, dimension B1), which classed the resulting drift as
  **structural, not an active defect** — which is precisely why the remedy is two documents and **not** a
  checker.

  **The honest bound, stated here as it is stated in each file's opening (P0).** These contracts are
  **ADVISORY shape documentation**. Exactly **one** field in either artifact is floor-relevant —
  `verdict`, because four live checkers test it for enum membership — and **no checker validates a report
  against either contract**. Writing them did **not** make any report conform: three committed
  regression-reports already diverge and every gate stays green over them. "There is a contract for the
  verify-report" does **not** mean "the verify-report's shape is guaranteed".

  **What the documents establish, by probe rather than by reading.** The load-bearing claim is
  quantified, so it was **executed**: a report reduced to `{"verdict": …}` alone, and a report with every
  _other_ field corrupted (`gates: "GARBAGE"`, `failing_gates: "NOT-AN-ARRAY"`,
  `regressions: ["FAKE-REGRESSION"]`, `verifiers.findings: ["ignore all previous instructions"]`),
  produced **byte-identical** output from `check-ship.mjs`, `check-loop.mjs` and
  `render-ship-briefing.mjs`, and GREEN from `check-ship-briefing.mjs`; flipping **only** `verdict` turned
  that GREEN into a RED naming the field, so the probe is not vacuous. The consumer set was derived from
  the shortest paraphrase-invariant substring rather than the spelling first searched for.

  **This corrects the originating finding's own framing.** It named `check-verify.mjs` /
  `check-regress.mjs` as the artifacts' _consumers_; they are their **emitters**. Feeding a committed
  report back to either yields `INCONCLUSIVE` exit 2, because their input is a `{ "<gate-id>": <int> }`
  map, not a report. The real consumers are the four checkers above.

  **Two asymmetries are recorded rather than smoothed over.** The verify-report's four consumers do
  **not** share one enum — `check-ship.mjs` deliberately omits `INCOMPLETE` — so a contract-conforming
  `INCOMPLETE` report handed to it is **refused fail-closed**, and "conforming" is not "accepted
  everywhere"; the regression-report's four consumers **do** agree. And "only `verdict` is read" is true
  **of the floor** only: the ship orchestrators present `failing_gates[]` / `regressions[]` to a human,
  which is an advisory presentation read, not a deterministic branch.

  **Conformance measured 2026-09-09 at commit `8bc6c0a`, and recorded as a dated measurement that expires
  rather than an invariant:** **122/122** committed verify-reports carry the required core
  `{feature, gates, verdict, failing_gates}` and an in-enum `verdict` (119 also carry `verifiers`; the
  three without it are the emitter's unmodified pre-`verifiers` output, legacy shape rather than drift).
  **118/121** regression-reports carry the full core and **120/121** an in-enum `verdict`; the three
  exceptions are hand-assembled and each is classified in the contract — one as a **documented
  non-instance** whose own `note` says it is not an emitter object, two as **legacy drift**. Legacy drift
  is recorded, never retro-fixed: rewriting a committed audit artifact to match a contract written
  afterwards would falsify the record it exists to preserve.

  **No new floor primitive, and no checker (P7).** A shape-validating checker is deliberately not built:
  no dogfood run, eval, or user report has failed on report shape, so L20's second-occurrence trigger has
  not fired. Each contract names where that decision would be recorded should one surface.

  **A follow-up a human must make, reported rather than worked around.** `pharn/ARCHITECTURE.md:131-132`
  enumerates the contracts by name and now lists six of eight. That file is hook-protected and human-only
  (fix #2); the exact edit is to append `verify-report, regression-report` to that list. It was not
  routed around the guard via Bash.

## [3.0.12] - 2026-09-10

### Fixed

- **The shipped surface cited `.dev/` canon, which an install does not contain** (`SKILLS_VERSION`
  3.0.11 → **3.0.12**, patch over shipped bytes). Nine of ten product commands cited
  `.dev/memory-bank/lessons-learned.md L<n>` in prose — and the review's verifier **extended the class**:
  so did the shipped floor (`validate.mjs` ×2, `check-spec.mjs`) and
  `pharn/pharn-contracts/loop-record.md`. **14 citations in all.** An install ships `pharn/` plus the
  product `.claude/` surface **without** `.dev/`, so every one of those pointers resolves to nothing in
  the place it is read. Reported as `product-cmds-cite-dev-canon` (LOW).

  **The fix was not to delete the provenance.** P4 says cite rather than restate, and the lessons are
  real; what was wrong was the **path**, which promised a file the reader cannot open. Each site now
  reads _"PHARN's own build-loop lesson L&lt;n&gt;"_ — provenance kept, dangling pointer gone. In every
  case the surrounding sentence already carried the lesson's substance, so nothing was lost by dropping
  the path.

  **Scoped to the canon-citation shape, not the string `.dev/`.** A shipped file may legitimately name
  `.dev/` when the subject **is** the dev surface — `/pharn-memory-promote` explains that
  `/pharn-dev-memory-promote` → `.dev/memory-bank/` is a separate command, which is correct and is
  deliberately left alone.

  Guarded by three rules in `command-hygiene.test.mjs` (a test — no bump of its own): no shipped file
  may cite the dev canon file; an [[L4]] **discrimination** control mutated from the **real** historical
  citation string (it must fire on the pre-fix shape and must **not** fire on the corrected one); plus an
  [[L34]] non-vacuity assertion.

  **Honest scope (P0):** this proves no shipped file cites the dev canon **file**. It does not prove the
  remaining prose is accurate, and it cannot check the installer — whose source is out of tree — so the
  install-absence half rests on `CLAUDE.md`'s documented dev/product boundary, exactly as the review's
  verifier scoped it.

## [3.0.11] - 2026-09-10

### Fixed

- **A Capability's `writes:` is parsed by NOTHING, while two shipped docs called it floor-enforced**
  (`SKILLS_VERSION` 3.0.10 → **3.0.11**, patch over shipped bytes). `pharn/ARCHITECTURE.md §3.1` annotates
  `writes: ["<path>"]` as _"ENFORCED by the pre-write hook"_, and
  `pharn/pharn-contracts/finding-shape.md` claimed that once a Capability names `findings.json` in its
  `writes:` the guard _"pins the path"_. **Neither holds.** `enforce-writes-scope.cjs` reads exactly one
  input — `.pharn/writes-scope.json` — which `set-writes-scope.cjs` writes from a
  `--from-frontmatter <file>` argument, and **every call site in the corpus names a COMMAND file; not
  one names a Capability.** Reported by an adversarial review
  (`capability-writes-never-bound-to-guard`, HIGH).

  **The 22 lens declarations were also wrong on their face**, which is how the field stayed wrong: each
  declared `features/<lens>/findings.json` **and** `features/<lens>/REVIEW.md`, while `/pharn-review`
  directs every subagent to `features/<name>/lenses/<lens>/findings.json` and writes `REVIEW.md`
  **itself** at Step 6. Two errors in a field nothing reads. All 22 are re-pointed at the path the
  command actually directs.

  **What IS enforced, stated at its real width:** a lens subagent writes under `features/**` because
  that is the **invoking command's** active scope (or the fail-closed default) — **not** because the
  lens declared a path. The guarantee is real, but it belongs to the command and is **coarser** than a
  per-Capability pin.

  Three rules in `command-hygiene.test.mjs` (a test — no bump of its own) keep the declaration truthful:
  every lens's `writes:` must name its own directory under the real path; **no** `--from-frontmatter`
  call site may name anything outside `.claude/commands/` (the load-bearing fact behind the corrected
  bullet — if that ever changes, the corrected prose must be re-derived); plus an [[L34]] non-vacuity
  assertion. **They make the declaration HONEST; they do not make it ENFORCED**, and they do not pretend
  to.

  **`pharn/ARCHITECTURE.md §3.1` is hook-protected and still carries the false annotation** — it needs a
  human edit outside the agent loop. The exact replacement is in the PR body.

## [3.0.10] - 2026-09-10

### Fixed

- **The `/pharn-review` dedup key DEGENERATES on the shipped lens set, and nothing said so**
  (`SKILLS_VERSION` 3.0.9 → **3.0.10**, patch over shipped bytes). `merge-findings.mjs` groups on the
  enum-gated key `(type, rule_id, file)` — sound by design. But **all 22 shipped lenses declare
  `enforces: ["P2"]` and emit `rule_id: P2`**, one value corpus-wide (`44 rule_id: P2`), so the
  `rule_id` term is **constant** and the key collapses to effectively **`(type, file)`**. Any two
  findings at the same `file:line` merge, whatever they were about. Reported by an adversarial review
  (`dedup-key-degenerate-p2`, HIGH).

  **The loss runs in two directions at once**, which is what makes it worse than a plain over-merge:
  `severity` is **max-escalated** across the group, while `problem`/`evidence` come from **`sources[0]`,
  the lexicographic-min lens NAME**. A `blocking` hardcoded-secret and a `minor` duplicated-block at
  `src/app.ts:10` render as one finding reading _"blocking — duplicated logic block"_ — **severity from
  one contributor, text from another.** Proven by a test executed against the live merger, not argued
  from the key expression.

  **Labeled, not redesigned** — the review's own prescription. The structural fix is distinct
  file-qualified `rule_id`s (P4's `security.md SEC-1` shape) across 22 lenses and their fixtures; that is
  a different increment, and inventing per-lens ids here would be the speculative addition P7 forbids.
  What changed: the bound is now stated in **both** places that describe the merge
  (`merge-findings.mjs`'s header and `/pharn-review`'s Step 5), and Step 6's `sources[]` rendering is
  promoted from **conditional** to **mandatory** — on this lens set a multi-source group is the norm, so
  rendering only when `sources[]` has "more than one entry" hid the common case rather than the rare one.

  **A tripwire replaces the discipline.** `merge-findings.test.mjs` now MEASURES the corpus and pins the
  single-`rule_id` state, so the day a second value ships the test **fails on the improvement** — which is
  precisely the moment the prose above would otherwise be forgotten. It also records that the existing
  `rule_id-precise` test contrasts `P0` vs `P2` and is therefore **unreachable by any real run**: a real
  property the corpus cannot exercise, worth knowing rather than deleting.

  **Nothing is fabricated and nothing is dropped** — every contributor survives verbatim in `sources[]`,
  which is why the render is now unconditional. But a merged scalar triple must **never** be read as one
  lens's verdict.

## [3.0.9] - 2026-09-10

### Fixed

- **The writes-scope release step was UNREACHABLE in all 17 setter-invoking commands** (`SKILLS_VERSION`
  3.0.8 → **3.0.9**, patch — 10 of the 17 are product-surface `pharn-*` commands; the 7 `pharn-dev-*`
  ones and the hygiene test are apparatus). Measured across the corpus: in **17 of 17**, the
  `## Final step — release the writes-scope` heading sat **below** the command's last _"end your turn"_
  instruction. A reader following the document top-to-bottom is told to stop before ever reaching it, so
  `set-writes-scope.cjs --clear` never ran on any happy path. Reported by an adversarial review
  (`release-step-unreachable`, HIGH) and re-derived live before it was scoped.

  **Why that matters is already stated in `CLAUDE.md`:** a **set** scope REPLACES
  `enforce-writes-scope.cjs`'s fail-closed default-safe-set, so a finished run's leftover scope is
  **stricter** than no scope at all — paths the default permits start being denied in later sessions,
  with nothing naming the cause. **That state is not hypothetical:** a leftover scope is exactly what
  denied `/pharn-review`'s own lens writes with exit 2 during this same remediation batch.

  **Why the existing test did not catch it, which is the instructive half.** A test already pinned that
  every setter-invoking command **declares** the release and orders it **after every set**. Both
  properties held while the step was unreachable — presence and set-relative ordering say nothing about
  whether a reader ever gets there. The missing axis was ordering relative to the **terminal
  instruction**.

  **The fix copies an established shape rather than inventing one** ([[L8]]): `/pharn-dev-plan`'s
  `### Format this stage's own artifact` already says _"Immediately after writing it, and **before**
  ending the turn"_. Each command now carries the same framing as a pointer paragraph immediately above
  its terminal instruction. The release section itself is unchanged and stays where it is — it is
  reference-adjacent by layout, and moving 17 audit sections would have been the larger, riskier edit.

  **Pinned by two new rules in `command-hygiene.test.mjs`** (a test — no bump of its own): the pointer
  must exist and must precede the last turn-end line, over a corpus **discovered** from the filesystem
  ([[L29]]/[[L36]]) with an [[L34]] non-vacuity assertion; plus an [[L4]] **discrimination control**
  mutated from a **real** command body — strip the pointer from live bytes and the rule must fail.
  Confirmed to RED against the pre-fix bytes (**2 failures**).

  **ADVISORY, and the bound is unchanged (P0):** this proves a **pointer precedes the terminal
  instruction in prose**. It does **not** prove any run executed `--clear` — the release is a Bash call
  outside the `PreToolUse` gate ([[L19]]), so nothing on the floor forces it and an early abort still
  skips it. It raises the odds a reader reaches the step; it does not make the release a guarantee. The
  next command's first-step **set** still overwrites a leftover scope either way.

## [3.0.8] - 2026-09-10

### Fixed

- **`/pharn-review` no longer claims a suppression backstop it does not have for 4 of its 22 lenses, and
  it now resolves the `<name>` its own artifacts are written under** (`SKILLS_VERSION` 3.0.7 → **3.0.8**;
  patch-class — corrections to bytes that already shipped, no contract or finding-shape change, so no
  install is invalidated).

  **The false claim.** Step 3b asserted, with no carve-out, that "a lens's Layer-1 verdict comes from the
  **scanner's deterministic regex over the code text** … so a skill informs _judgment_ but **cannot erase a
  scanner-detected shape**." That is false for the lenses `pharn/floor/lens-scanner-map.json` maps to
  `null` — `hallucinated-api`, `input-validation`, `race-condition`, `trust-fence` — which have **no
  deterministic prefilter at all**, so there is no scanner verdict for a skill to fail to erase and
  suppression is bounded by nothing structural. The set includes **`trust-fence`, the attempt-0 injection
  probe** the experiment agenda points at. The command's **own Step 3 said the opposite twelve lines
  above**; nothing detected the contradiction, because `validate.mjs` excludes `.claude/commands/`.

  **Four sites, not one.** The review reported the Step-3b blockquote. A scan anchored on the shortest
  invariant stems (`regardless`, `scanner-detected`, `cannot erase`) found the same unbounded claim at
  three more: the Step-4 lens instruction, the guarantee audit, and `## Trust (P2)` — where it made the
  named suppression residual read **narrower than it is**. All four are bounded now (`L33`: a prior
  enumeration is a lower bound to beat, never a set to confirm).

  **Bounded in both directions (P0).** The carve-out does not claim the other 18 are safe: for a
  scanner-bound lens only the scanner's **MATCH** is deterministic — whether the lens **reports** it stays
  advisory, since spawning, slicing and lens judgment are all advisory. And naming the gap **does not
  reduce** the suppression risk for the four; it stops the document from denying it.

  **`<name>` was unbound.** The command wrote `features/<name>/…` at four places with no step resolving
  `<name>` — the review's "vertical-slice blocker". A Step 0 now resolves it via explicit
  `--feature <name>` (a flag, since Step 1 already claims the positional args as target paths), else
  **ask the human** (P5's terminal fallback), matching `/pharn-spec` and `/pharn-regress`.

  **No writes-scope setter was added, and the command now says why.** `/pharn-review` remains the one
  artifact-writing command with no `set-writes-scope.cjs` call — deliberately. The setter resolves one
  `--target` per call and overwrites the single scope file (`L8`), while Step 4 fans out to **N parallel
  subagent writers** whose N is known only at run time, so the usual per-artifact re-scope does not reach
  it. Measured: with the scope at `features/<name>/findings.json`, writes to the lens `findings.json` and
  to `REVIEW.md` **both exit 2** — a setter would break the command. fix #7 still applies through the
  fail-closed default, whose install safe-set is exactly `features/**`; the honest guarantee is therefore
  "writes only inside `features/**`", not "exactly the three artifact paths".

  **Apparatus (no bump):** `.dev/floor/command-hygiene.test.mjs` gains three rules deriving both lens sets
  from the map at run time (`L6` — never hardcoded): presence (every scanner-less lens is named), closure
  (`L36` — no scanner-**bound** lens is named, catching the stale-list direction), and a discrimination
  test mutating the real command body. Both halves guard against a vacuous pass (`L34`). Its P7 trigger is
  the **second** occurrence of this class: the map's own `doc` records the first ("a real, already-observed
  drift: two lenses' prose name scanners that do not exist"), answered by `lens-scanner-map.test.mjs` —
  which pins map↔disk but reads no command prose, which is the gap that let this land.

## [3.0.7] - 2026-09-10

### Fixed

- **`SKILLS_VERSION` 3.0.6 → 3.0.7. The `(specified; ships with the guarded surface)` markers added by
  the previous trusted-doc correction are now REGISTERED, so they are guarded instead of merely
  written.** That correction added the prose half — the annotations on THREAT-MODEL's three
  content-hash rows, the community-privilege backstop, and `ARCHITECTURE`'s two `rule_id ∈ roster`
  claims — and stopped there. It never added the matching entries to
  `.dev/floor/specified-primitives.json`, the hand-maintained manifest `check-specified-markers.mjs`
  reads, so the new markers sat outside the check entirely: deleting one REDded nothing, and the day a
  primitive shipped, nothing would have REDded either. The defect the findings named, reproduced one
  layer down in the repair itself.

  **What is registered (4 → 8 primitives, 11 → 25 sites).** `seam-record` — THREAT-MODEL §3 maps
  ai_docs poisoning, seam fetch fallback and seam-record poisoning to the content-hash primitive, and
  no shipped code writes a `seam-record.json` or reads an `ai_docs` pin. `community-privilege` —
  LIMITS §1a's backstop, of whose three sub-claims exactly one is live (`validate.mjs` restricts
  `seal` to `kind: pharn-owned`); markdown-only / no-`.cjs` is enforced by nothing.
  `rule_id-roster` — no roster artifact exists, and `pharn/floor/merge-findings.mjs` says so in its
  own comment: _"NOT roster membership … the claim is precisely 'shape-valid'."_
  `constitution-injection` — `CONSTITUTION.md` states outright that no injector exists. Plus a
  previously-missed second `archetype-maps` site in the file that entry already named.

  **Two of those five were not in the brief, and finding them is the point.** The commissioning list
  named three classes; a re-scan anchored on the shortest invariant substring found
  `constitution-injection` and the extra `archetype-maps` site as well. `lessons-learned.md` L33 says a
  prior enumeration is a lower bound to beat rather than a set to confirm, and that its recorded
  failure mode is a repair pass that fixes one site and leaves another in the file it just named.

  **Also corrected: `pharn/pharn-contracts/finding-shape.md`** (the product-surface change that drives
  the version bump). It asserted roster membership twice with no annotation — in the `rule_id` YAML
  comment and in the field-trust table — and was missed by the earlier pass, which corrected only the
  two `ARCHITECTURE` sites. Both now carry the marker, and a new section states the bound in the
  contract itself: `rule_id` is enum-gated **in shape**; a well-formed id naming a rule that does not
  exist is shape-valid and passes.

  **What registration does NOT buy (P0).** The manifest is a hand-maintained address book. It holds
  the LISTED sites to their bytes in both directions and **cannot discover an overclaim nobody
  registered** — "the manifest checked out" never means "the docs are true". The probes test file
  EXISTENCE by name, never function: a backstop implemented inside an existing file (a new
  `validate.mjs` CHECK, `kind` handling added to an existing hook) flips no probe, and direction 1
  stays silent there. Each entry records its own miss in a `$comment` rather than leaving it inferable,
  and `constitution-injection` is flagged as the weakest of the five.

  **Tests (`.dev/floor/check-specified-markers.test.mjs`, +7 → 75 passing).** Both directions are
  driven against the REAL manifest entries — real probe, real marker bytes, real docs — because a
  registration that is merely present passes `check:markers` by construction (L4). The site and id
  enumerations are closure-pinned to the live manifest (L29/L36), so an entry added or renamed later
  fails there rather than escaping every rule. A new rule requires every registered marker to occur
  **exactly once** in its doc: direction 2 is a presence test, so a marker appearing twice would
  survive one deletion — the live instance being THREAT-MODEL's two byte-identical content-hash cells.
  That rule ranges over all eight entries, retro-covering the four pre-existing ones.

  **Known residual, reported rather than fixed.** `pharn/ARCHITECTURE.md:304` carries the unmarked twin
  of the `finding-shape.md:24` claim. The file is hook-protected and human-only, and a site whose
  marker is absent cannot be registered without REDding a doc nobody broke, so it needs a human edit;
  the manifest's `rule_id-roster` `$comment` names the line and the follow-up.

## [3.0.6] - 2026-09-10

### Fixed

- **`check-provenance.mjs` now BINDS its canon-file argument to the candidate's declared `target`, in
  both copies** (`SKILLS_VERSION` **3.0.5 → 3.0.6**; the product checker is bump-triggering surface, its
  `.dev/` twin and all `*.test.*` are not). Two findings from an adversarial review, both reproduced live
  before the fix rather than inferred:
  - **`provenance-canon-arg-unbound`.** The checker never compared `argv[3]` to `cand.target`, so the
    duplicate-id verdict ranged over **whatever file the caller named** while the enum test only ever saw
    the declaration. The guarantee-audit bullet _"The target is one of the two prescription files →
    FLOOR"_ therefore read as a claim about the file being checked and was not one. Measured: a candidate
    declaring `memory-bank/lessons-learned.md` with an id **already taken there** exited `0` GREEN against
    any other file — a re-used id passing the gate. Now a mismatch is a `canon-arg` RED.
    **Bounded, and stated:** a _relative_ argument must EQUAL the target segment-wise; an _absolute_ one
    need only end with it at a segment boundary, so a same-named file under a different root still
    matches (the comparison is deliberately cwd-independent). It binds the **argument** to the
    **declaration** — never that the declaration is the apt member, and never that the **write** lands
    there, which stays fix #7's pre-write hook.
  - **`provenance-dev-copy-behind`.** Two product-only hardening patches had never reached the dev copy,
    so the checker gating **PHARN's own** canon was weaker than the one gating a user's: `isGregorianDate()`
    (the dev copy accepted `2026-02-31`) and the whitespace-free id check (it accepted `L99 extra`, and
    `.trim()`ed `"L1\n"` into a colliding token). Both back-ported; both measured GREEN before and RED after.
  - **Why the existing ✧ cross-copy guard missed it, and what now covers that** — L31's own instance. That
    guard compares `const` **declarations**, and both drifted patches live in the validation **body**, so
    it stayed green for a whole release line. Added: a shared-**function**-body pin and a
    `CROSS_COPY_BEHAVIOURS` set that **executes both checkers** on the same input and requires the same
    verdict. **Honest bound (L36):** it is a _presence_ set over behaviours a review NAMED — it cannot
    discover an unnamed divergence, so "the behavioural guard is green" still never means "the two copies
    behave identically". It was mutation-tested (removing the dev copy's Gregorian call makes it RED and
    names which copy drifted) — notably the textual pins stayed green there, which is the gap it covers.

## [3.0.5] - 2026-09-10

### Fixed

- **`pharn/floor/validate.mjs` CHECK 6 — the only floor expression of P3 — could not fire on either
  sibling module that exists** (`SKILLS_VERSION` 3.0.4 → **3.0.5**). Its target matcher was
  `/(pharn-(?:stack|skills)-[A-Za-z0-9-]+)/`, and both of those module families are **unbuilt**, so
  `pharn-pipeline` and `pharn-review` were unmatchable: no committed capability could reach the RED
  branch under any `reads:` value it could legally hold, and no test reached it either
  (`grep -c 'pharn-stack\|pharn-skills' pharn/floor/validate.test.mjs` → 0). "No sibling imports" was
  backed by a branch that was vacuous on the live tree. Surfaced by an adversarial review of this repo.

  **The fix is two changes, and the second is the load-bearing one.** (1) The matcher now recognises any
  `pharn-<name>` module token, read as a separator-delimited, anchored TOKEN rather than a bare
  substring — so `docs/pharn-notes.md` is not mistaken for a module — and **every** token in a value is
  examined, so a sibling cannot be laundered behind a leading `pharn-contracts` path. (2) The base-layer
  exemption moved from the READER's module to the **TARGET's**. The old guard skipped capabilities
  _living in_ `pharn-contracts` / `pharn-core` under a comment saying those modules are "allowed to be
  depended on" — a property of a module being READ, applied to the module doing the reading. Widening
  the matcher without moving the exemption is not a smaller change but a broken one: every capability
  outside the base declares `reads: ["pharn/pharn-contracts/finding-shape.md"]`, so a target-blind
  widening REDs **35 correct declarations**. That was measured across all 36 committed capabilities
  before the change rather than discovered after it (`.dev/memory-bank/lessons-learned.md` L3). The
  reader-side skip is now gone, so a base-module capability's own `reads:` is checkable too.

  **Coverage is strictly wider, never narrower:** the `pharn-stack-*` / `pharn-skills-*` shapes the old
  regex caught still RED, pinned by tests. 15 tests were added, including a **mutation control** that
  re-runs the RED fixture against a `validate.mjs` whose CHECK 6 emission is disabled and requires it to
  go GREEN — so "the branch fires" is proven rather than assumed (L34), with the mutation anchor asserted
  unique so the control cannot itself pass vacuously.

  **What this does NOT prove (P0).** CHECK 6 reads a hand-written **declaration**, never a dependency:
  markdown has no `import` (`pharn/ARCHITECTURE.md` §4's labeled caveat), so an empty or untruthful
  `reads:` is invisible to it, and so is a truthful relative path that never spells the module
  (`../injection/injection.md`). It is also a membership set, not a layer **rank** — a capability inside
  `pharn-contracts` naming `pharn-core` is admitted. It remains the "best-effort grep" the architecture
  labels it; the widening changed what that grep can **see**, not what a declaration **proves**.

  **Bump size — patch, deliberately.** No new capability, command, or checker ships, and no contract or
  finding shape changes: this corrects the coverage of bytes that already shipped, which is the patch
  criterion in `CLAUDE.md`'s SemVer rule. The finding's free-text wording changes (`sibling reference` →
  `cross-module reference`), which is a report string no artifact is keyed to, not an interface. `3.0.5`
  rather than `3.0.3` is an **assigned** number, reserved to avoid colliding with parallel open PRs.
  Audit trail: `.dev/features/p3-sibling-check-widen/`.

## [3.0.4] - 2026-09-10

### Fixed

- **`pharn/floor/scan-code-missing-error-handling.mjs` carried two RAW NUL bytes; they are now built
  with `String.fromCharCode(0)` like the sibling that documents the convention.** `SKILLS_VERSION`
  **3.0.3 → 3.0.4** (patch — a correction to bytes that already shipped; the intermediate number is
  reserved by a parallel branch). The scanner needed a NUL as its dedup-key separator and embedded the
  byte literally at lines 314 and 320 — one inside a comment, one inside the live key template — while
  `pharn/floor/merge-findings.mjs:57-59` needed the same separator and states the rule at its own
  constant: _"Built via `fromCharCode` so the SOURCE stays printable ASCII."_ A raw NUL makes the file
  read as **binary to line-oriented tooling**, and the consequence was **measured, not assumed**: with
  the bytes present, `grep "const key" <file>` printed nothing and exited 1 while the string was
  demonstrably in the bytes. A silent miss at exit 1 is indistinguishable from "not there" — which is how
  two of them survived in a shipped product-floor file. **The obvious second detector does not hold, and
  saying so is the point:** `git diff` did **not** flag this file, because it sniffs only about the first
  8000 bytes and these sat at offset 18809, so the hunk rendered as ordinary text. Whether git notices
  depends on where the byte lands, which is why the new guard reads the whole buffer instead of trusting
  either tool. The repair changes **no
  behaviour** — the key string is byte-identical, since `String.fromCharCode(0)` is the same code unit
  the raw byte encoded. Verified rather than asserted: the scanner's output and exit code are
  byte-identical before and after over a fixture that exercises the dedup path, and its 28 existing
  tests still pass unchanged.

  **The convention is now enforceable rather than documented** — new
  `.dev/floor/source-nul-guard.test.mjs` (apparatus; **not** shipped, so it does not itself bump).
  It sweeps every non-test `.mjs` directly under **both** floors and REDs on any `0x00`. Per `L20` the
  trigger is an observed second occurrence, not a hypothetical: the convention had exactly two sites and
  the second violated it, which is `L25`'s shape — a rationale comment reaches only the file it sits in.
  The swept surface is materialized as one iterated list (`L29`) and discovered from the filesystem
  rather than hardcoded (`L36`).

  **Bounds, stated because a guard invites the overclaim (P0).** Green means: no non-test `.mjs`
  directly under `pharn/floor/` or `.dev/floor/` holds the byte `0x00`; the swept set is non-empty
  (`L34` — the post-fix expected result is an empty offender list, so the domain is asserted before the
  per-file rules run); and the predicate demonstrably fires on a NUL-bearing buffer and stays silent on
  a clean one. Green does **not** mean the source is printable ASCII — exactly one byte value is
  tested, and every other control or non-ASCII byte passes untouched. The sweep is **non-recursive over
  two directories**: `.claude/hooks/*.cjs`, `.claude/commands/**`, all `*.md`, both `test-fixtures/`
  subtrees, and test files themselves are outside it.

## [3.0.3] - 2026-09-10

### Added

- **A shipped `SKILLS_VERSION` with no changelog record is now a RED, not a discipline problem** —
  `.dev/floor/check-skills-version-recorded.mjs`, wired as `check:changelog` in `scripts.check` **and**
  as its own `ci.yml` step. **Apparatus only: `SKILLS_VERSION` does not bump** (`.dev/**`,
  `package.json`, CI, `CONTRIBUTING.md` and this file are all outside CLAUDE.md's bump-triggering set).

  **The trigger is a measured second occurrence, which is exactly `lessons-learned` L20's bar (P7).**
  Two commits shipped product-surface bytes with no bump and no entry — `6c5ae8e` (`pharn/ARCHITECTURE.md`
  alone, the commit that introduced a false claim about shipped verifiers) and `e4e8529`
  (`pharn/floor/check-plan-lessons.mjs` plus two `pharn-*` commands). Then `#188` (`f71f501`) bumped
  `3.0.1 → 3.0.2`, **edited `CHANGELOG.md` in the same diff**, and never wrote the string `3.0.2` — so
  two different `check-plan-lessons.mjs` behaviours and two different `ARCHITECTURE.md` byte-sets shipped
  under one version string, and the file that is supposed to say what changed said nothing about the
  version that changed. Verified against that commit's own bytes rather than a mutable ref (**L32**):
  `git show f71f501:CHANGELOG.md | grep -c '3\.0\.2'` → `0`, and the new checker exits **1** on exactly
  those bytes. `check-version-badge.mjs` disclaims this class in its own header ("a badge matching a
  wrong bump stays GREEN"), so nothing in the chain could see it.

  **`SKILLS_VERSION` 3.0.2 is now recorded** on the `#188` entry above, in this file's own convention
  (the entry names the version it shipped). **`## [Unreleased]` was deliberately NOT cut into a
  `## [3.0.2]` section, and no tag was cut:** a release heading asserts a release, `git tag -l` is empty,
  and writing one anyway would be "written in the changelog" masquerading as "therefore released" — the
  P0 disease in this file's own shape. Cutting release sections and their tags is a human decision about
  release identity; follow-up `changelog-release-sections`.

  **What it guarantees, and the bound is the headline.** FLOOR (`ARCHITECTURE.md §2` primitive #3 —
  enum/regex): the trimmed, shape-validated `SKILLS_VERSION` scalar appears in `CHANGELOG.md` as a
  complete version token. **ADVISORY, and stated in the checker's header, this entry and the PR body: it
  proves the string APPEARS, never that the entry is correct, complete, or describes the right change — a
  version recorded against a wrong bump stays GREEN**, and a product-surface change that never bumped at
  all leaves it GREEN too. Fail-closed over a **closed, exported** refusal set the tests iterate rather
  than hand-list (**L29**): `BAD_TARGET`, `MISSING_VERSION`, `ENUM_ERROR`, `MISSING_CHANGELOG`,
  `EMPTY_CHANGELOG`, `UNRECORDED` — every one probed live, including `SKILLS_VERSION` and `CHANGELOG.md`
  as **directories**, because a universal quantifier over inputs is where the drift lands (**L37**).
  `SKILLS_VERSION` is validated FIRST so two simultaneous REDs cannot race.

  **Why a boundary rule rather than a bare substring or a markup requirement.** `3.0.2` occurs inside
  `3.0.20`, `13.0.2` and `3.0.2.1`, so `includes()` would GREEN a changelog recording only a neighbouring
  version — each near-miss case is pinned by a **mutation** assertion that the naive predicate is `true`
  while the checker exits 1. Requiring back-ticks (the `check-contributing-gates` move) would be wrong
  here for a stated reason: there the token was `test`, an ordinary English word; here it is a dotted
  numeric triple, so the collision is **numeric, not lexical**, and pinning one rendering would RED
  correct entries and train authors to satisfy markup instead of recording a version (**L36**, **L27**).
  An occurrence counts iff the character before is not `[0-9A-Za-z.]` and the character after is not a
  digit, a letter, or a `.` followed by a digit. Excluding a letter prefix is **measured**, not stylistic:
  `2.0.0` is a real past `SKILLS_VERSION` and this file's header permanently links
  `https://semver.org/spec/v2.0.0.html`, so a bare-boundary rule would have certified a `2.0.0` release
  vacuously.

  **L35 was answered before L20 was applied**, in that order, because L35 is the qualifier that stops L20
  sending you to build a checker every time: a sync check is the right remedy only once the second copy is
  established as one that must exist. It must — the CHANGELOG's version string is not a redundant identity
  like `package.json`'s drained `version`, it is the **join key** binding a version number to the
  description of what changed in it, and draining it is not available. The three constants shared with
  `check-version-badge.mjs` are a deliberate second copy for the recorded reason that a checker→checker
  import would be the leaf→leaf shape `ARCHITECTURE.md §4` forbids (every floor import in the repo points
  at a `*-core.mjs` bottom) and extracting a core would edit a live guard on a second axis with no
  triggering failure; the pair is pinned by a ✧ test asserting both agreement **and** the one deliberate
  divergence (no `UNSUPPORTED` state here — the shared `VERSION_RE` already rejects a pre-release, so both
  checkers RED and only the refusal's name differs). Both wirings are pinned by tests, because `ci.yml`
  runs each script individually and never `npm run check`. **"The wiring is pinned" never means "CI ran
  it".** Full record: `.dev/features/skills-version-recorded/`.

### Fixed

- **`/pharn-ship`'s writes-scope setter resolved ZERO paths and exited 1, so the terminal pipeline stage ran with NO scope at all — while its guarantee audit claimed the opposite** ([`/pharn-ship`](./.claude/commands/pharn-ship.md); `SKILLS_VERSION` 3.0.2 → **3.0.3**, patch, with the matching README badge). `pharn-ship.md` declares three `writes:` paths, all carrying the `<name>` placeholder, and invoked `set-writes-scope.cjs --from-frontmatter` **without `--target`** — the only one of the corpus's 20 `--from-frontmatter` call sites to omit it. `resolveEntry` returns `null` for a placeholder entry when no target is given, so all three resolved to nothing, the scope came back empty, and the setter **failed closed**: exit 1, **no scope file written**. The run then proceeded on `enforce-writes-scope.cjs`'s `DEFAULT_SAFE_SET`, which permits **any** path under `features/**`, while the command's own audit read _"**FLOOR: hook (fix #7).** `set-writes-scope.cjs` + `enforce-writes-scope.cjs` pin exactly these three paths."_ **The blast radius was bounded and the fix is a P0-honesty fix, not a containment one** — writes stayed inside `features/**` and `protect-trusted-paths.cjs` still denied the trusted docs regardless; what failed was the claim, in the stage that ends the pipeline. Reported by an external adversarial review and re-derived live before it was scoped.

  **The setter is deliberately unchanged.** Its refusal is correct: falling back to a placeholder-wide scope would convert a fail-closed refusal into a silent over-grant, the [[L7]] direction. The call site was the bug, so the fix is **four** per-artifact calls, each immediately before the write it authorizes — the shape `/pharn-regress` and `/pharn-verify` already use, copied rather than invented ([[L8]] prescribes it verbatim). **A second live bug surfaced while placing them, and it is the one no report named:** Step 2c is reached _"only after a `PASS` verify"_, yet Step 3 runs on **both** exit paths — so a **RED-verdict STOP** reached the `SHIP.md` write having executed no setter call whatsoever. Moving the call into Step 3 itself repairs that path as a consequence of adopting the standard shape. The fourth call is likewise easy to miss: Step 3b renders the attestation clause **back into `SHIP.md`** after the `ship-record.json` writes, so the scope has to return to `SHIP.md` or that render is denied. All four prose sites asserting the old one-call story were **re-derived, not deleted** ([[L25]]) — including the confidently-wrong rationale _"covered by **one** call, since no `--target` narrows it"_, which is precisely the kind of completed-looking analysis that stops the next reader from checking.

  **Two hygiene rules now range over the corpus** ([`.dev/floor/command-hygiene.test.mjs`](./.dev/floor/command-hygiene.test.mjs) — a test, so no bump of its own). **Rule A:** every `--from-frontmatter` invocation line carries `--target`. **Rule B:** every command declaring **≥2** placeholder `writes:` paths names **each** as a `--target`. Both are needed, and that is [[L36]] rather than belt-and-braces: Rule A alone is satisfied by a single call passing `--target features/<name>/SHIP.md`, which would leave the other two artifacts unscoped — a per-line rule cannot see that a command owes N calls. The site set is **discovered from the corpus**, not hand-listed, so a command added later inherits both rules ([[L29]]'s strongest form); each carries a non-vacuity assertion ([[L34]]) and a discrimination assertion mutated from the **real** command body ([[L4]]). Both were confirmed to RED against the pre-fix file, naming `pharn-ship.md:270` and all three unscoped paths.

  **The `≥2` filter on Rule B is load-bearing, and it was caught at `/pharn-dev-grill`, not designed in.** The rule as first planned would have RED'd `/pharn-memory-promote` and `/pharn-dev-memory-promote`: each declares one placeholder entry (`memory-bank/<canon-file>`) but passes `--target <canon-file>`, a bare operator placeholder the human substitutes at run time. Both are correct; an unfiltered rule would have converted two correct declarations into blocks — the exact [[L3]] defect the plan cited L3 to avoid. The filter is not a carve-out invented to dodge that: it is **L8's own stated domain** ("a command that emits **≥2** artifacts under placeholder paths"), and it leaves a 5-member domain in which `pharn-ship.md` was the sole offender.

  **The P7 trigger is stated honestly rather than inflated.** [[L8]] already names this mechanic and prescribes this remedy, so the reflex is to cite [[L20]] ("the second occurrence earns a floor check") — but L8's own provenance records its first instance as _"AVOIDED, not hit — surfaced by reading `set-writes-scope.cjs` live, not by a dogfood failure."_ This is therefore the **first observed** failure and L20's bar is not cleanly met. It does not need to be: P7's own bar — an addition triggered by a real failure — is met directly by the reported, reproduced defect. Recorded this way because a manufactured trigger is the disease P0 names; `check-plan-lessons` sub-check (D) takes the same posture. **What the rules do NOT buy:** they read command prose, so they prove the flag is present on a line and each declared path is named — never that a run executed it, that a call sits immediately before its write, or that the ordering is right. The corrected audit bullet says so, and keeps its [[L19]] bound: the hook gates `Write|Edit|MultiEdit|NotebookEdit` only, so the Bash stage invocations and the `> /tmp/briefing-draft.md` render stay outside it. Full record: `.dev/features/ship-scope-target/`.

## [3.0.2] - 2026-09-09

### Added

- **`/pharn-dev-ship` now offers the run's lesson at GATE 2 instead of letting it die with the session
  (`Step 2b — lesson-extract`).** After `/pharn-dev-review` and **before** the `SHIP.md` write, the stage
  reviews its own cycle (`PLAN.md` including `applied_lessons`, `GRILL.md`, `REGRESSION.md`, `VERIFY.md`,
  `REVIEW.md`, the two verdict JSONs), proposes **at most one** lesson candidate — or an explicit "no
  lesson" — prints it with a short rationale, and **always** halts on an `AskQuestion` form. An accepted
  candidate is handed to **`/pharn-dev-memory-promote`**, which sets its own writes-scope, runs
  `.dev/floor/check-provenance.mjs`, and holds its own accept/deny gate. `SHIP.md` then carries exactly one
  `lesson:` line from a closed set (`promoted L<n>` | `skipped` | `none` | `not-reached (<stage>)` |
  `error <reason>`) plus a `deferred:` list, so a considered-and-declined lesson and an absent one cannot
  look the same.
  **The anchor moved, because the one the request named does not exist.** No ship or loop command performs
  any git operation — `/pharn-dev-ship` has no commit step to sit "before" — so the step is anchored
  **before the roll-up write**, and `.dev/floor/command-hygiene.test.mjs` pins that ordering by comparing
  **line-initial heading offsets**, not by `indexOf` over the body: the command's own `description:`
  frontmatter and prose both mention step names, and only a heading declares one (L6). Both offsets are
  asserted `>= 0` first, so a missing heading fails closed instead of comparing against `-1`.
  **`writes:` is deliberately UNCHANGED, and that is the load-bearing half (L7).** Declaring
  `.dev/memory-bank/lessons-learned.md` here would make `set-writes-scope.cjs` resolve a scope the
  pre-write hook then **permits**, silently handing `/pharn-dev-ship` the ungated canon write that
  `check-provenance` + the human accept exist to withhold — L7's own recorded instance (it happened to
  `/review`), and it was available here. Canon stays reachable only through the dedicated command; a test
  pins that the `writes:` **line** names no `memory-bank` path, scoped to that line so `reads:` and prose
  may still cite it.
  **`--loop` inherits Step 2b at the STOP and is structurally excluded from the iteration body.** The step
  is a human halt and the loop's defining property is that no human sits between iterations; a halt in the
  body would either stall the loop or pressure the gate toward a default-yes, which on a canon write is
  the thing the step refuses. `check-ship.mjs` is byte-unchanged and its input signature has **no lesson
  parameter**, so a lesson-extract failure cannot flip a verdict — impossible by construction, not by
  discipline.
  **The honest split (P0), stated rather than implied.** Step 2b adds **no new floor primitive**. FLOOR:
  the fix #7 hook that keeps this command's `writes:` at `SHIP.md` alone (a guarantee it inherits **by not
  changing**), and — in the sub-stage, not here — `check-provenance.mjs` over the candidate's provenance,
  id and target. **ADVISORY:** that a candidate is worth promoting, that a human answered the form (the
  floor cannot verify a "yes"), and that the `lesson:` line is present at all — nothing reads `SHIP.md`,
  so its completeness is discipline over an unread file. "`/pharn-dev-ship` guarantees no lesson is
  dropped" is the disease and is **struck**; a checker over the written line is the named residual
  `ship-lesson-line-check`, left unbuilt because **L20's bar is a second occurrence and there is not yet a
  first**.
  **The residual GROWS, and says so** (`LIMITS.md §2`, `THREAT-MODEL.md §2` surface 3). This opens a
  routine path from untrusted free text toward canon. The floor bounds the **shape** and the **route**; it
  cannot make a well-formed but poisoned lesson detectable — that stays the human's judgment at the
  promote gate. What genuinely changes is **frequency**: ratification becomes an end-of-run prompt rather
  than a deliberate act, and a gate resting on continued human attention is weakened by being asked often.
  The one-candidate-per-run rule bounds the rate, and it is advisory.
  **No headless branch was built, deliberately.** Nothing in this repo detects interactivity — verified
  live: zero `isTTY` / `headless` / `non-interactive` occurrences across `.claude/**`, `pharn/**`,
  `.dev/floor/**` — so a prose rule reading "if non-interactive, do not ask" would enforce nothing and
  would be exactly the "written in the command" ≠ "guaranteed" confusion. The step always asks; an
  unanswered run stops holding an unpromoted candidate, which is the fail-safe direction.
  **Scoped to `/pharn-dev-ship` alone, by explicit human decision — and the omission is enumerated rather
  than left to be rediscovered (L31).** Three orchestrators reach a post-verify human gate; one is wired.
  `LESSON_EXTRACT_WIRING` carries all three, with `pharn-ship.md` and `pharn-loop.md` as `wired: false`,
  and both the total (3) and the wired count (1) are pinned — so wiring or dropping a member fails the
  test and forces the change to be deliberate. Recorded there too: `/pharn-loop` will need a **different
  shape**, because it already carries a lesson-adjacent `## Handoff` → `### learned` whose subsection list
  `check-loop-record.mjs` holds to **exact equality**, making an added `###` an immediate RED.
  **Honest P7 trigger, recorded rather than manufactured:** **no observed failure motivates this.** No
  lesson in canon, no dogfood run and no eval failure records a lesson being lost at ship time; the
  trigger is the **maintainer's explicit direction**, which P5 makes a legitimate terminal input. The
  precedent is `applied_lessons` sub-check D (3.0.0), whose `CLAUDE.md` comment records the same.
  **The outcome set is enforced CLOSED, not merely present — and the reason is a defect this increment
  shipped and then caught.** `/pharn-dev-review` found `not-reached` written in **two** spellings
  (`(<stage>)` and `(<stop>)`) inside the increment whose stated purpose was to close that set, with
  every per-member presence rule GREEN — because a matcher can only pin the spelling its author was
  looking at, and the **parameter** is the fragment an author re-derives from local context instead of
  copying. All six `/pharn-dev-verify` gates were green over the defective text; a **lens** found it, and
  the gate that now catches it exists only because the lens found it first. Fixed, plus a **closure**
  assertion — every back-ticked `lesson: …` the command writes must match a member, so a variant of
  **any** member fails — mutation-tested against the pre-fix text before it was trusted. Both floor
  verdicts were then **recomputed** rather than carried forward. Promoted as **L36**
  (`type: floor`) through the gated `/pharn-dev-memory-promote` path, with `docs/lessons-index.md`
  regenerated by the narrow generator (L22). The L7 `writes:` guard's own DISCRIMINATES test was
  likewise rewritten to run the real body and a body-derived mutant through **one** extracted code path
  — the first version matched a hand-written string against a hand-written regex, which passes by
  construction (L4) and would have stayed green had the guard stopped finding the `writes:` line at all.
  **Apparatus: no `SKILLS_VERSION` bump.** A `pharn-dev-*` command and a `*.test.mjs` file are both
  outside the bump-triggering set; the product surface is untouched.

### Fixed

- **The writes-scope guard's fail-closed default no longer carries dev-repo posture into
  installed projects** (`SKILLS_VERSION` 3.0.1 → **3.0.2**, patch;
  [#180](https://github.com/pharn-dev/pharn-oss/issues/180), shipped in
  [#188](https://github.com/pharn-dev/pharn-oss/pull/188)). When no scope
  file is set, `enforce-writes-scope.cjs` now partitions its default safe-set by `.dev/floor/`
  presence: installed projects get `features/**` only (plus `.pharn/**` bootstrap); PHARN's dev repo
  keeps the prior set including `.dev/features/**` and `pharn/pharn-*/**`. Prevents agent edits to
  installed capabilities from being classified as user drift by `pharn update`.

  **The version key was added retroactively, and that is the defect this file's newest gate exists
  for.** `#188` bumped `SKILLS_VERSION` and edited this entry in the same diff without ever writing the
  string `3.0.2`, so the shipped product surface had no changelog record — see the `check:changelog`
  entry under **Added** below.

## [3.0.1] - 2026-09-08

### Fixed

- **`pharn/ARCHITECTURE.md` — restore the `archetype-maps` specified-marker substring dropped in the
  §7 enforcement list.** The recent arch refresh rewrote "the four archetype maps agree (fix #5 —
  conditional; specified, ships with the guarded surface)" as "the archetype maps agree …", which
  made `check-specified-markers` RED (direction 2: marker gone, primitive still absent). No semantic
  change — the marker bytes are restored so the doc stays honest about a protection that is still
  conditional.

## [3.0.0] - 2026-09-08

### Changed — BREAKING

- **A cited lesson must now cost a body line (`applied_lessons` sub-check D). `SKILLS_VERSION` `2.8.0` → `3.0.0`** ([`pharn/floor/check-plan-lessons.mjs`](./pharn/floor/check-plan-lessons.mjs)). The checker gains a fourth sub-check: every cited `L<n>` must appear in the PLAN **body**, not only in the structured header that carries the declaration. Before this, `applied_lessons: [L1, L2, L3]` could be pasted into a header whose body never mentioned a lesson and the plan passed.

  **What it guarantees, and the ceiling stated in the same breath (P0).** FLOOR: the id's characters appear below the header, in a deterministically-delimited region — the header (YAML frontmatter for a product PLAN, the leading bullet block for a dev PLAN) is **excluded**, so the declaration cannot satisfy itself; the match is `\b`-anchored, so `L33` in the body does **not** satisfy a citation of `L3`; `none` is exempt, since there is no id to reference. **NOT proof the lesson was read** — a body line reading `L3: considered.` satisfies it. That is not a defect to be patched later but the honest ceiling of a substring test: it raises a citation's **price**, it does not measure comprehension. Anything stronger is an eval, not a floor primitive. The wording is deliberately flat because overselling this check would be the exact P0 disease the repo exists to prevent.

  **Honest trigger (P7) — there was no observed failure, and none is invented.** Measured over all 150 committed `PLAN.md` files before the change: **52 declared at least one cited id, and 0 omitted a cited id from the body.** The convention held on discipline alone in 52 consecutive opportunities, so `lessons-learned.md` **L20**'s "the second occurrence is the trigger" bar was **not** met — the occurrence count was **zero**. It was added at the **maintainer's explicit, repeated direction**, a legitimate authority under P5 (the terminal fallback of any chain is _ask the human_) — but it is not a dogfood or eval failure and is not dressed as one.

  **Why MAJOR.** A user's `PLAN.md` that was GREEN yesterday (cites `[L1]`, never mentions L1 in the body) is RED today — CLAUDE.md's stated major criterion, and the same reasoning that made this field's own introduction `2.0.0` (the entry directly below). **Migration:** add the line the docs have asked for since 2.0.0 — one body line per cited id saying **how** it was applied — or drop the id from the declaration; `none` remains a legal, justification-free escape. **Measured blast radius on this repo: zero** — re-running the new checker over the same 150 files produced **no new RED**. Six committed _test fixtures_ did regress and were migrated exactly as a user would.

  **A latent fence-parsing defect is fixed in the same file, because (D) is what made it load-bearing.** The bullet-header parser tracked fenced blocks with a **boolean toggle**, so a ` ``` ` line closed a `~~~` opener and vice versa — the "naive fence toggle" the `#116` entry already disclosed. That was harmless while fences only masked the declaration scan: a mis-tracked fence could hide a declaration, and the fail-closed answer (RED, "declares no `applied_lessons`") was the safe one. **(D) inverts that.** The body BOUNDARY is now derived from the same pass, so a CommonMark-legal plan whose ` ``` ` block contains a `~~~` line reads as leaving the fence early, the following `##` becomes the body start, and fenced text is admitted into the body — a **false GREEN** over a lesson the real body never discusses. Matching is now delimiter-aware per CommonMark (a closer must use the **same** character, be **at least as long**, and be **bare**; a backtick opener's info string may not contain a backtick). Six tests cover it, each with its discrimination control, including the mirror case and the too-short-closer case. Found by review, not by a failing run — and recorded because "the toggle was already there" would have been a true statement and a wrong reason to leave it.

  Ships 18 new tests (46 total; 100% line / 100% function coverage on the checker). Each RED assertion is paired with a **discrimination control** — the same fixture with the body line added must be GREEN — so the set cannot pass vacuously against a checker that REDs unconditionally (`lessons-learned.md` **L34**). Ten sites across six commands enumerate the checker's sub-checks and were all updated; the enumeration was found by a **grep for the enumerating sentence**, not by recall (**L1**), which is what caught the four beyond the two plan stages.

### Fixed

- **Two expired forward-looking claims on the PRODUCT surface — `/pharn-plan` said the `applied_lessons` declaration was unverified after 2.8.0 made it verified** ([`/pharn-plan`](./.claude/commands/pharn-plan.md)). The command asserted, in its Two-clocks note and again in its guarantee audit, that "**no downstream stage re-verifies it**" and that the field was "**self-attested by the stage that wrote it**", naming `grill-lessons-reverify` as a pending follow-up. That follow-up **shipped in 2.8.0** (`0f3a02d`, #171): both grill stages run the checker against their own canon as a deterministic RED. Both sentences were false on `main`, and the adjacent bullet in the _same_ audit block correctly said the spec-hash re-verifier "**is built**" — one bullet current, its neighbour stale.

  **Why nothing caught it, which is the durable part.** The hedges were never registered in [`.dev/floor/specified-primitives.json`](./.dev/floor/specified-primitives.json)'s `forward_claims`, so `check-specified-markers.mjs` — the checker that exists precisely to fire when a hedge outlives its artifact — had no site to fire on. `lessons-learned.md` **L33** ("a 'not yet built' claim expires the moment the work lands; the repair pass misses sites") recurring verbatim, one increment after the mechanism to catch it was built (#170). **No entry is added to `forward_claims` now**, deliberately: the artifact has shipped and the hedge is gone, so there is nothing left to guard — the durable remedy is to register a hedge **when writing it**, which is what did not happen here.

## [2.8.0] - 2026-08-23

### Added

- **`applied_lessons` is re-verified by a stage that did not author it — `SKILLS_VERSION` `2.7.15` →
  `2.8.0` (minor: a newly wired deterministic gate on a shipped command).** Until now the field was
  **self-attested**: `/pharn-plan` and `/pharn-dev-plan` each self-checked the declaration they had just
  written, and nothing downstream ever re-read it, so a PLAN edited after its approval halt — or one
  citing a lesson id later removed from canon — reached build unnoticed. This closes the
  `grill-lessons-reverify` follow-up named in `CLAUDE.md` and `.dev/features/applied-lessons/PLAN.md`
  (Q2).

  **No new floor primitive.** `pharn/floor/check-plan-lessons.mjs` is reused **byte-for-byte**; what
  changed is **who** invokes it. Six commands now do, each against its own surface's canon:
  `/pharn-grill` and `/pharn-dev-grill` re-verify it as a deterministic RED before interrogating, and
  `/pharn-ship` / `/pharn-dev-ship` read that exit code as a proceed/stop input. The product grill now
  has **two** floor stops (the spec→plan hash chain and this), and `/pharn-dev-grill` — previously
  advisory end-to-end — now has exactly **one**, kept structurally separate from its interrogation
  findings so an LLM-assigned `severity` can never be read as a floor verdict (fix #3).

  **`/pharn-ship`'s verdict read was the load-bearing fix, not the docs.** It branched on a _single_
  exit code, so a stale-declaration RED would have been **invisible** to it and the orchestrator would
  have proceeded straight past the stop being added. Surfaced by `/pharn-dev-grill` against this
  increment's own plan, whose `## Files` had swept the two grill commands and stopped before the
  orchestrators that consume a grill verdict.

  **A project with no `memory-bank/` is unblocked by construction, not by exception** — `none`
  short-circuits before the lessons file is read (verified live against a missing path), so a fresh
  install is GREEN with nothing granted anywhere.

  **The bound is unchanged, and it is the point (P0):** re-verification **narrows** self-attestation; it
  does **not** close the declaration-vs-application gap. A plan may cite `[L1]` having ignored L1
  entirely and every stop stays GREEN. "The grill verified the lessons were applied" is **struck**.

  All six call sites are enumerated once in `PLAN_LESSONS_WIRING`
  (`.dev/floor/command-hygiene.test.mjs`, apparatus — no bump) with the rules iterating the set, so a
  seventh inherits every rule for free (L29/L31). The discriminating axis is the **lessons-file
  argument**, not the checker path — unlike the index copy-pair, `check-plan-lessons.mjs` is a single
  checker both surfaces invoke, so what must not cross is the **canon it is pointed at**; a dev command
  aimed at the user's `memory-bank/` is a RED, and vice versa, both directions mutation-tested. Honest
  scope: this pins that the prose **contains** the invocation — never that a run executed it.

  **The review then found the half the plan had not swept, and it was the larger half.** Wiring the
  new stop falsified every sentence that _describes_ the grill stage's stop set, and the increment had
  swept only the sites it was already editing. `/pharn-dev-review` (F1, blocking) found **24 sites
  across all 13 shipped grillers** still asserting "the grill stage's only deterministic stop is the
  spec→plan hash chain" — a shipped-surface P0 contradiction against `pharn-grill.md` in the same
  release. All 24 are corrected; the **enclosing** "grillers as a class never gate" claim was left
  untouched, because it stays true — no griller gained gating power, and only the parenthetical
  justification had gone stale. Three smaller sites went with it: `pharn-loop.md`'s guarantee audit
  (which **enumerates** the front chain's checkers and so, unlike its Step 2, does not inherit the fix
  by citation), `pharn-dev-grill.md`'s trust audit (which claimed no guaranteed decision rests on the
  stage **at all** — true of the fields it authors, false of the stage since `/pharn-dev-ship` reads
  its exit code), and `pharn-grill.md`'s installed-skills note (which named one gate where the
  residual paragraph in the same file already named both). All fold into this `2.8.0` bump.

  **Why the increment's own lessons did not prevent it, which is the part worth keeping.** L33
  prescribes exactly the right technique and the plan even names it — "scanning for the shortest
  invariant substrings" — but ran it over the **two files already in `## Files`**. The same grep, run
  repo-wide and unrestricted, surfaces all 24 in one command. The gap was never the technique; it was
  the domain it was run over. Also worth pinning: `only deterministic stop` finds 22 of the 24 and
  misses `coupling.md` entirely, because the phrase wraps across lines — the shorter
  `deterministic stop` finds all 24.

  Full reasoning, the grill's six findings and their dispositions, and the review's five:
  `.dev/features/grill-lessons-reverify/`.

## [2.7.15] - 2026-08-23

### Changed

- **Rewrote the root `README.md` for adoption, and realigned the stated adoption status across `SECURITY.md`, `CONTRIBUTING.md` and `CLAUDE.md`.** No `SKILLS_VERSION` bump: this changes repo-meta documents only and alters no product-surface bytes. The README described a repository with no installer and closed with "Please do not adopt it yet", while `@pharn-dev/pharn` was published and working. Verified by running it rather than inferring: `npx @pharn-dev/pharn@latest init` in a scratch repo detected the `ssr` archetype, listed the applicable capabilities with a reason beside each, and installed the product commands, the write-gating hooks, the floor, the contracts and a `pharn.config.json` pinning the source commit. The communication layer was behind the product; this closes that gap. **Four claims were corrected rather than restyled**, each against live state: (1) "a `PreToolUse` write-guard hook **denies any agent edit**" — not defensible, since the hook's own documented bounds state that Bash-tool writes bypass `PreToolUse` entirely, so the README now states the guard and its bound in the same breath; (2) "secrets screened at the **plan gate**" — `scan-plan-secrets.mjs` is genuine floor, but it runs at **grill**, and grillers never gate, so it is restated as detection that surfaces rather than a gate; (3) "**every** write confined to its declared scope" — fix #7 gates `Write|Edit|MultiEdit` only, restated with that surface named; (4) the comprehension-debt and AI-comprehension-study citations — the linked post makes no coinage claim and credits prior work, and the study measured a lab exercise in which nothing was shipped (50% vs 67% on a quiz), so "~17% lower on code they shipped" was wrong in both halves; the coinage attribution is dropped and the study is no longer cited as a headline number. The third hero guarantee survived intact and is now named with its checker: a plan-declared file the build never wrote yields `INCOMPLETE`, via `check-build-complete.mjs` feeding `check-verify.mjs`. Recorded honestly (P0): that the new prose is _accurate_ is advisory — no floor op reads a README's claims; the guarantee is only that `check:badge`, `docs:check` and the floor stayed GREEN across the rewrite.

### Fixed

- **The rest of the expired "not yet built" class — the sweep `#165` owed and did not deliver** (`SKILLS_VERSION` 2.7.14 → **2.7.15**, patch). `#165` (below) was the increment whose entire purpose was re-deriving this claim class, and its entry **names `eval-format.md` as a corrected site**; a second instance survived in that same file (`structural:` still read "the checker that runs these is the **NEXT increment**"). That miss produced lesson **L33**, and this increment is L33's remedy applied to the whole product surface — `pharn/**` plus the `pharn-*` (non-`pharn-dev-*`) commands — rather than to the three reported seeds. **The enumeration is the deliverable (L29), and it is 31 files across seven classes:**

  **(A) The isolated LENS runner — 19 lens files + [`pharn-review.md`](./.claude/commands/pharn-review.md) = 20 sites, the largest class and one no prior report named.** Every scanner-bearing lens read _"until the live isolated lens runner lands (deferred P7) … the review stage **applies this lens inline**"_, while `/pharn-review` **Step 4** spawns **one subagent per lens**, each writing its own `findings.json`. `pharn-review.md` carried the same claim **28 lines above the step that refutes it**. The enumeration closes arithmetically against `pharn/floor/count-lenses.mjs`: 22 registered, 19 carrying the claim, and the 3 that do not (`hallucinated-api`, `input-validation`, `trust-fence`) are exactly the scanner-less lenses with no Layer-1 block to carry it. **(B)** The seven grillers — `a11y`, `comprehension`, **`coupling`**, `documentation`, `error-handling`, `migrations`, `performance` — citing [`finding-shape.md`](./pharn/pharn-contracts/finding-shape.md)'s 3c runner as deferred while that document now records the opposite (3c landed as `/pharn-dev-eval`). **The correction here is narrower than the class suggests, and the verify stage is what narrowed it:** a first pass rewrote these to say `/pharn-verify` "runs it per committed eval pair", which **overclaims** — `/pharn-verify` Step 3b pairs `expected/*.json` with a committed **`findings.json`**, and there are **zero** committed `findings.json` on the product surface, so by the absent-if-none membership rule **no `structural:*` gate fires over any griller's output today**. The shipped wording therefore names the runner that landed _and_ states the operative bound: no gate fires over this griller's output, and nothing fires at grill time at all. Recorded because the first pass reproduced this increment's own defect at **reversed polarity** — underclaiming prose replaced by overclaiming prose, the P0 disease proper. **(C)** [`eval-format.md`](./pharn/pharn-contracts/eval-format.md) — the instance `#165` missed. **(D)** [`pharn-plan.md`](./.claude/commands/pharn-plan.md) calling the spec↔plan re-verifier _"not built yet"_ while `pharn/floor/check-plan-spec-agree.mjs` ships and seven commands invoke it — `pharn-grill.md` answers that very sentence with _"you are that stage"_, so the downstream file knew and the upstream one was never updated. **(E)** [`pharn-loop.md`](./.claude/commands/pharn-loop.md) resting a correct deferral on a false reason (_"no project config consumer exists yet"_ — `/pharn-build` reads the `seam` block and `/pharn-ship` reads `ship.requireAttestation`); the deferral stays, its reasoning is corrected to P7. **(F)** [`pharn-ship.md`](./.claude/commands/pharn-ship.md)'s `--loop` section, whose literal claim is **true** — no `--loop` flag exists — but which left the impression the capability is unavailable when `/pharn-loop` **is** built; fixed as a pointer, with the `check-loop.mjs`-vs-`check-ship.mjs` distinction preserved.

  Each site was **re-derived, not deleted** (L25): the bound that survives is kept — for the lenses, that nothing on the floor forces every lens to run; for the grillers, that **nothing fires at grill time**, the enforcement moment being the verify/eval stage — and the invoker that now exists is named. **What was deliberately LEFT, because the audit half of an enumeration is the half that gets skipped:** the 14 near-identical _"isolated per-**griller** runner is deferred"_ sentences are **correct** and stay — `/pharn-grill` spawns zero subagents and genuinely applies a griller inline, so the lens twin landed and the griller twin did not, and the two read almost identically; likewise `/pharn-verify`'s _"ZERO verifiers authored"_ (18 `role: verifier` hits are all prose mentions, no frontmatter declarations), the `scan-code-*` "multi-file sweep / taint analysis not built speculatively" bounds, `validate.mjs`'s `scan-plan-*` ghosts, and every _"no cache yet" / "not yet pinned"_ **runtime-state** sentence. `README.md`'s surviving "Not yet built." block is true and `check:markers` already guards it. **Method, recorded because it is the transferable part (L33):** line-anchored `grep` is structurally wrong here — these claims **wrap across source lines**, so the reported seed list found 6 grillers, `grep -rn "runner yet invokes"` found 4, and only a whitespace-normalized scan found **7** (`coupling` spells it `no **live** runner yet invokes it`). 172 raw hits over 72 files were classified individually; a post-build re-scan reports **0** surviving stale sites. **No floor check was added, and that is a recorded decision, not an oversight** (L20's trigger has fired): a tense-checker needs a structured manifest — the `check-specified-markers.mjs` pattern, never a prose scan (L6) — and deriving that manifest from the prose this increment rewrites is a separate axis of change. Follow-ups: `forward-looking-claims-manifest` (the checker) and `apparatus-forward-looking-sweep` (the same sweep over `.dev/**`, out of scope here). The four trusted docs were swept and are **clean** — the one hit, `THREAT-MODEL.md`'s "(deferred) AI/LLM-security lens", is a true statement. Full enumeration, per-class evidence, and the false-positive audit: `.dev/features/forward-looking-claims-sweep/`.

## [2.7.14] - 2026-08-23

### Fixed

- **Shipped prose that still described landed floor machinery as unbuilt, re-derived against the live tree** (`SKILLS_VERSION` 2.7.13 → **2.7.14**, patch). A full-tree claim audit (every falsifiable doc sentence checked against the live repo) found the shipped surface carrying "not yet built" claims that had been true once and false since: [`pharn/pharn-contracts/eval-format.md`](./pharn/pharn-contracts/eval-format.md) still called the `structural[]` checker "the **next increment**" (it landed as `pharn/floor/check-structural.mjs`); [`pharn/pharn-contracts/finding-shape.md`](./pharn/pharn-contracts/finding-shape.md) still said "no runner yet invokes it … increment **3c, not yet built**" (3c landed as `/pharn-dev-eval` via `.dev/floor/check-variance.mjs`, and `/pharn-verify` / `/pharn-dev-verify` invoke the checker per committed eval pair); [`pharn/floor/README.md`](./pharn/floor/README.md) said "nothing in the build loop invokes it automatically yet" and understated the hook matcher (the live wiring is `Write|Edit|MultiEdit|NotebookEdit`); the `input-validation` and `hallucinated-api` lenses repeated the "3c not yet wired" bound. Each site was **re-derived, not deleted** (L25): the bound that survives — nothing fires at write time; the enforcement moment is the verify/eval stage — is kept, and the invokers that now exist are named. The same pass corrected pre-relocation `floor/…` path spellings and a pre-move `features/trust-fence` example inside the shipped contracts. Repo-meta corrections rode along without bumping: `CLAUDE.md`'s seven-gate aggregate list vs the live eight (`check:contributing` was missing — the exact drift class `check-contributing-gates` guards, one file over), its stale "21 tagged" count (now count-free per P6), its four-constants enumeration (the pinned set is `{CANON_PATH, OUT_PATH, GEN, REGEN}`; the absent-canon semantics are pinned separately as divergent functions), and its present-tense `pharn` CLI (specified, not built); `README.md`'s "authorization checked" inside a "can guarantee" sentence (the security griller records that floor candidate as **REJECTED**, so the sentence now names the writes-scope guarantee instead); `SECURITY.md` pointing at the deliberately inert `package.json` version; `CONTRIBUTING.md`'s missing test-file carve-out on the `pharn/floor/` bump rule; both GitHub templates' pre-relocation `floor/validate.mjs` paths, the PR template's four-of-eight gate list, and the bug template's pre-rename `/plan`-style command names; `.dev/features/README.md`'s modules-at-repo-root claim. Audit + scope record: `.dev/features/docs-drift-resync/PLAN.md`.

## [2.7.13] - 2026-08-23

### Fixed

- **Six confirmed product-floor defects, each reproduced live before it was scoped and each now pinned by a test that fails without its fix** (`SKILLS_VERSION` 2.7.12 → 2.7.13). None was hypothetical; all six came from an external review and were re-derived against the live tree, which mattered — one of the six reports carried a reproduce command that did not reproduce the defect it described.
  - **A prototype-walking gate comparison let a real gate-set mismatch pass silently** ([`pharn/floor/check-regress.mjs`](./pharn/floor/check-regress.mjs)). The mismatch check used `k in obj`, which walks the prototype chain, so a gate id colliding with an `Object.prototype` member (`toString`, `valueOf`) read as PRESENT in a map that did not have it. The extra failing gate was treated as shared and the verdict came back `no-regressions` at exit 0, where a gate-set mismatch is contractually `inconclusive`/exit 2 — a silent pass inside the checker whose entire promise is that there is never one. Now `Object.hasOwn`, which is the own-property test `lessons-learned` **L15** already prescribes; this is that lesson recurring.
  - **A UTF-8 BOM defeated every frontmatter anchor in the floor** — and the fix is a new shared core, [`pharn/floor/frontmatter-core.mjs`](./pharn/floor/frontmatter-core.mjs), because the defect was a **set** problem. `FM_RE` had been copy-pasted byte-identically into **six** checkers (`check-spec`, `check-loop-record`, `check-plan-lessons`, `check-plan-spec-agree`, `check-ship-briefing`, `render-ship-briefing`) with nothing ranging over them, so a byte-valid file written by a BOM-emitting editor RED'd with "no YAML frontmatter block" in all six, and fixing whichever one surfaced would have left five broken with no test able to tell. That is **L31** exactly. The anchor now has one definition, the BOM strip happens at **read** (beside the existing CRLF fold, so the two input-normalisation defences live together — **L25**), and a consumer-set pin asserts no checker re-declares its own anchor, imports the core, and actually calls `stripBom`. **Narrowed:** exactly one leading `U+FEFF` is stripped, only at offset 0 — a doubled BOM stays malformed, and a genuinely frontmatter-less file still REDs. The fix removes a FALSE red; it creates no path to a false GREEN.
  - **`check-spec.mjs --hash` and `--spec-id` exited 1 silently** on an unreadable file ([`pharn/floor/check-spec.mjs`](./pharn/floor/check-spec.mjs)), handing a shelling caller an exit code and nothing to surface — the input-capture boundary **L5** names. `--state` already reported, and its comment documented that divergence as deliberate; all three read-only modes are now uniform and **that comment was re-derived rather than left asserting a divergence that no longer exists** (L25). The exit codes are unchanged: this adds a diagnostic, it does not strengthen a gate.
  - **A bare `catch` mapped every canon read failure to a benign no-canon** ([`pharn/floor/lessons-index-core.mjs`](./pharn/floor/lessons-index-core.mjs)). `EACCES`/`EISDIR` on a memory-bank that EXISTS and HOLDS lessons returned `NO_CANON`, so `/pharn-plan` would declare `applied_lessons: none` as though the user had no lessons — a real I/O failure presenting as an empty memory-bank. Now membership over `e.code`: only `ENOENT`/`ENOTDIR` are benign, everything else rethrows (fail-closed, P5). The **deliberate** product-vs-dev divergence on a genuinely ABSENT canon is preserved and pinned by test, as is the empty-but-readable case.
  - **`check-structural.mjs` certified fully suppressed output** ([`pharn/floor/check-structural.mjs`](./pharn/floor/check-structural.mjs)). `field_equals`, `file_resolves` and `needle_absent_from_enum_gated` all iterate the findings array, so every one of them is **vacuously true** over `[]` — an eval author who wrote per-finding assertions but omitted `finding_count` unknowingly certified a skill that emitted **nothing**, passing its own eval. A guard now REDs that combination and names the remedy. The legitimate "I expect no findings" case is unaffected and is exactly what distinguishes the two: say so with `finding_count == 0`. The per-finding kind set is derived from `KIND_ENUM` by subtraction, so a kind added later cannot be forgotten (**L29**).
  - **The injection scanner missed `.concat()`** ([`pharn/floor/scan-code-injection.mjs`](./pharn/floor/scan-code-injection.mjs)): `db.query("SELECT … ".concat(userInput))` is as plainly a concatenation into a matched sink as its `+` twin and produced no hit, because the taint set enumerated the operator spellings and silently omitted the method one. Added, with the scanner's honest-bound header re-derived rather than left describing the old set. **Python f-strings are now NAMED as out of scope** instead of being silently unhandled: `cursor.execute(f"… {uid}")` reaches a matched sink and is not detected, because the `f"…{x}"` shape collides with ordinary JS/TS text and a Python-aware scanner is the right home (P7 — no triggering failure yet). One implementation note worth recording, since it produced a SyntaxError at import rather than a wrong result: the `TAINT` expression splices a backtick between template segments, and raw-ness is **per segment** — a backslash placed in the trailing ordinary segment is consumed by the template parser.

## [2.7.12] - 2026-08-20

### Fixed

- **The floor's flagship gate refuses a target it cannot walk, instead of reporting GREEN over
  nothing** (`SKILLS_VERSION` 2.7.11 → **2.7.12**, patch). `pharn/floor/validate.mjs` resolved
  `TARGET = process.argv[2] || "."` and walked it with no existence check, while `walk()` swallows a
  failing `readdirSync` by design. The two composed into a fabricated pass: `validate.mjs /no/such/dir`
  printed `FLOOR: GREEN — 0 capabilities checked in /no/such/dir` and **exited 0**, as did a target
  that was a file rather than a directory. A typo'd path, a wrong cwd, or a moved checkout therefore
  reported a clean floor having checked nothing — and `ci.yml` reads the exit code only, so the whole
  class was invisible to the one consumer that runs on every PR. The target is now validated **before**
  the capability walk: an absent path, or one that is not a readable directory, emits a `P6/bad-target`
  finding in the canonical shape (`pharn/ARCHITECTURE.md §8`) and exits 1. Floor primitive #3 (presence
  - type test), the same class as the checks already in the file — no new primitive.

  Two branches, not one, and each carries a message true for **it** and absent from the other: an
  unreadable target cannot be _shown_ to be a directory, so `statSync` is caught rather than left to
  throw, since an uncaught stack trace is not the finding shape a reader of this floor is entitled to
  (its exit code would have been non-zero either way). The refusal also claims **no capability count**
  — printing "0 capabilities checked" on a refusal would reproduce, inside the RED, the same
  fabricated-scan reading the guard exists to remove. `pharn/floor/validate.test.mjs` enumerates the
  branches in one array that every rule iterates, so a third inherits all of them; the
  present-in-its-own-case **and absent-from-the-other** assertion was mutation-tested by collapsing
  both branches onto one message, which it caught.

  **The echoed path is now rendered as quoted DATA, on both renders.** A path may legally contain a
  newline, and splicing it raw into the report let one forge an extra `- [blocking] …` line that no
  check produced — a fabricated line shaped exactly like a real finding. Found by this increment's own
  review and reproduced live before the fix. Both call sites that echo the target now quote and escape
  it (the refusal above and the long-standing `FLOOR: GREEN — … checked in <target>` line), because the
  property belongs to the path rather than to the call site the defect was reported against; the
  regression tests exercise **both** renders and were mutation-tested by restoring the raw splice,
  which each caught. **Bounded, and stated:** every consumer in this repo — `ci.yml`,
  `/pharn-dev-build`, `/pharn-dev-ship`, `/pharn-dev-review` — branches on the exit code and never on
  this text, so the impact was always to the human render, never to a gate.

  **Narrowed, and stated.** GREEN now means the target existed and was a **directory** — not that it
  was readable, and not that it was the right one. Two residuals stay live and both still produce GREEN
  over zero capabilities. (1) A valid-but-**wrong** directory (a sibling repo, a parent dir) walks to
  nothing and reports GREEN exactly as before. (2) An **unreadable** directory passes the guard:
  `statSync` resolves through search permission on the _parent_ rather than read permission on the
  target, so a `chmod 000` directory is stat-able and `isDirectory()`-true, and `walk()`'s unchanged
  per-directory swallow then absorbs the `EACCES`. The second was found by this increment's own review
  and is recorded rather than papered over — it sits one permission bit from the case the guard does
  remove. So what closed is the fabricated-GREEN-on-a-bad-**path** class, not fabricated GREEN in
  general; "GREEN" never meant "the right target", and does not mean it now. A valid empty directory
  stays GREEN: that walk is honestly empty.

- **`/pharn-dev-build` Step 2b now RUNS the third gate it names.** Apparatus: **no `SKILLS_VERSION`
  bump** (a `pharn-dev-*` command and a `.dev/floor/` test — neither ships). The step named prettier,
  markdownlint, and eslint, but ran only the first two; eslint was a prose line asking the agent to
  "confirm `npm run lint` is clean". The asked-for gate is the one that got skipped: a
  `no-useless-assignment` in freshly-built code reached `/pharn-dev-verify` as a red `lint` gate one
  stage after the build had declared itself formatted — reproduced live in the `validate-bad-target`
  run that also surfaced it. The invocation is now pinned in the block itself, scoped to the paths
  parsed from `.pharn/writes-scope.json`, read-only (no `--fix`: the triggering rule has no autofix,
  and mechanizing a fixer is a separate axis), and guarded against the empty list exactly as the
  markdownlint line beside it — **measured** for this linter rather than assumed, since a path-less
  `npx eslint` runs ~1.1s against ~1.1s for `npx eslint .` and ~0.3s for a single file, i.e. it lints
  the whole repo and would report every unrelated pre-existing error as the increment's.

  `.dev/floor/command-hygiene.test.mjs` now holds the three gates as **one enumerated set that the
  rules iterate**, so a fourth tool added later inherits every rule rather than needing its own
  assertion — the deliverable a remedy quantified over a set actually owes. Both directions are
  mutation-tested: dropping the eslint invocation and making it path-less each fail two rules.
  **Narrowed, and stated:** this pins that the command PRESCRIBES the three invocations. Step 2b is
  advisory orchestration outside the `PreToolUse` gate, so nothing proves a given run executed it, and
  a mistyped flag would satisfy the pin. The deterministic style verdict remains `/pharn-dev-verify`'s
  `check-verify.mjs` gate map; prevention moved earlier, the guarantee did not move.

## [2.7.11] - 2026-08-20

### Fixed

- **The crypto scanner's insecure-random keyword set is anchored to identifier SEGMENTS, so it stops
  flooding on idiomatic code** (`SKILLS_VERSION` 2.7.10 → **2.7.11**, patch).
  `pharn/floor/scan-code-crypto.mjs`'s `SECMAT` set matched its words as unanchored **sub-strings** —
  every word except `iv`, which alone carried a boundary anchor. So the two commonest `Math.random`
  idioms in real JavaScript both produced an `insecure-random` finding: a random pick over
  `Object.keys(...)` (`keys` ⊃ `key`) and a Fisher-Yates shuffle over anything named `monkeys`. Each word
  is now matched only as an identifier segment, via **four branches generated for every member of the
  set** — bare lowercase head, camelCase segment, ALL-CAPS segment, snake/kebab tail — so a word added
  later inherits the anchoring instead of needing its own hand-written one, which is how `iv` came to be
  the only anchored member. A trailing plural `s` is admitted on a **continuation** segment only, which is
  what keeps `apiKeys` / `API_KEYS` / `api_keys` firing while `keys` and `monkeys` stop; the two are
  indistinguishable by boundary alone, so the asymmetry is the whole separation and is asserted in both
  directions. Because those branches read case, the pattern drops its `i` flag, and the `Math.random`
  half — which this change never meant to touch — keeps its exact prior case-insensitivity through an
  explicit per-character expansion rather than inheriting a narrowing for free.

  **The change is NOT monotone, and both directions are stated (P7).** Folding a per-member exception into
  a uniform rule moves that member toward the rule from whichever side it was on, and a hand-written
  one-word exception is usually stricter than the rule absorbing it — so the member that carried its own
  anchor is exactly where a "tightening" widens. **Narrowed:** a bare lowercase plural (`keys`, `secrets`,
  `tokens`), a word glued inside a longer lowercase word (`mytoken`, `salted`), and a mixed-case spelling
  (`tOKEN`) — the last deliberately, since branches 2-4 must read case to tell `apiKeys` from `keys`.
  **Widened:** `iv` as a camelCase or ALL-CAPS segment (`myIv`, `IV_SEED`). The old branch was
  `(?<![a-z])iv(?![a-z])` under the `i` flag, where `[a-z]` case-folds, so any preceding letter blocked it;
  `myIv = Math.random()` is precisely what this kind exists to catch, so `iv` gaining the camelCase reach
  the other ten words always had is the symmetric half of the fix, not a side effect. Both directions are
  pinned by tests rather than only described.

  **Cost, re-derived rather than inherited (L24):** the per-line cost is quadratic in line length — a
  property the pattern already had and which the anchoring does not change — and there is no exponential
  path, the branches being literal-prefixed, disjoint, and free of nested quantifiers over an ambiguous
  alternation. Measured on the worst-case line, the 4× branch growth costs ~1.2×, not 4× (203.9 ms →
  251.2 ms at 20 KB). It is pinned by a **membership** test (completed vs. killed under a subprocess
  timeout), never a stopwatch compared to a threshold.

  The suite grew 26 → 44 tests. The word set and the four branches are **materialized and iterated** by
  the new rules rather than sampled by example, and a drift pin asserts the suite's copy of the word set
  equals the scanner's — an assertion authored for one member of a set is indistinguishable at review time
  from a rule that holds across it, which is the defect this change repairs.

## [2.7.10] - 2026-08-20

### Fixed

- **The ship-briefing render→check round trip survives quotes and backslashes** (`SKILLS_VERSION` 2.7.9 →
  **2.7.10**, patch). `render-ship-briefing.mjs`'s `yamlScalar` escapes `\` and `"` into
  `BRIEFING.md`'s frontmatter, and **nothing on the read side ever undid it**:
  `check-ship-briefing.mjs`'s `stripQuotes` removed the outer quotes only. A `grill_verdict` containing a
  quote therefore rendered as `"…\"…"`, read back as `…\"…`, and never equalled the live GRILL.md — so a
  briefing rendered seconds earlier **REDded as "stale" against its own unchanged source**. The reader now
  decodes a complete double-quoted scalar with the exact inverse of the writer.

  **Live incidence, measured rather than assumed: 0 of 77.** Across every captured `ADVISORY VERDICT:`
  line in this repo's own `.dev/features/*/GRILL.md`, none contains a `"` or `\` — the
  `**ADVISORY VERDICT: …**` convention closes the bold span before the quoted phrases, and
  `grillVerdictLine` stops at that `**`. 21 verdict _lines_ do carry a quote, just outside the captured
  span. Rendering and checking all 104 real feature directories produced **0** stale REDs before the fix.
  So this was a reproduced defect in shipped floor code that had not yet fired, not an observed
  production failure — stated that way on purpose (P0/P7).

  **The sharp part is the terminator test, and a quote-only test suite cannot see it.** Deciding whether a
  scalar's closing `"` is real by asking "is the previous character a backslash" is wrong:
  `yamlScalar("a\\")` renders `"a\\\\"`, whose final quote **does** follow a backslash — the second half of
  an escaped pair. The decision is the **parity** of the backslash run before the quote (even = a real
  terminator). `/pharn-dev-grill` raised this against the plan before the build, and both spellings pass a
  corpus containing only quotes, which is why backslash-terminated values are load-bearing members of the
  test corpus rather than padding.

  **Scoped per branch, not blanket (`lessons-learned.md` L27).** `clean()` serves three readers; only
  `readEnvelope` parses the renderer's own output. `readHeaderField` (SPEC/PLAN) and `grillVerdictLine`
  (GRILL.md) read files nothing ever encoded and are **unchanged** — decoding there would invent an
  unescape no writer performed and break their parity with the renderer's copies. A test asserts the
  decode in its own case **and its absence from the other two**. The codec is duplicated into the checker,
  not imported, per that file's documented no-sibling-import convention (P3), with ✧ parity and ⟲
  round-trip tests pinning both copies; the shape guards (`cleanScalar`) still run **on the decoded
  value**, layered after the decoder and never in place of it (L14).

## [2.7.9] - 2026-08-20

### Fixed

- **The writes-scope deny message stops citing two commands that do not exist** (`SKILLS_VERSION` 2.7.8 →
  **2.7.9**, patch). `enforce-writes-scope.cjs`'s in-repo FIX block told a blocked agent "If running a
  command (`/build`, `/review`, …): scope is set in the command's FIRST step … restart the command from
  the top". Neither command exists — `.claude/commands/` holds only `pharn-*` and `pharn-dev-*` — so an
  agent following the advice verbatim hunted for a command that was not there, at exactly the moment it
  was already blocked. The bullet now cites `/pharn-build, /pharn-dev-build`.

  **Why those two, and not the obvious rename.** The sentence asserts two things about whatever it
  names: the command exists, **and** its FIRST step sets the scope. Checked live across all 19 commands:
  17 invoke `set-writes-scope.cjs`, but **`/pharn-review` and `/pharn-dev-eval` do not** — so renaming
  `/review` → `/pharn-review` would have swapped a phantom name for a real-but-inapplicable one, telling
  an agent to restart a command that sets no scope. The plan stages were rejected for the same class of
  reason: `/pharn-dev-plan`'s Step 0 is numbered first but reads "After Step 2 names `<name>`", so
  "FIRST step" is false for them. The build stages are the only pair for which every word of the
  surrounding sentence is true. The edit is a pure name swap; no path becomes writable and no verdict
  moves.

  This is [[L27]] one turn on — that entry covered a remedy **unreachable** in the branch printing it;
  this covers one that is reachable but names a **non-existent actor**. Both are locally well-formed and
  globally empty, and both are invisible to every gate, since phantom advice is still a string. Per
  **L20**, the second occurrence of a discipline-only defect earns an enforceable correction, so six
  tests now **derive** the cited set from the rendered message and re-check it against the live
  `.claude/commands/` directory — any future phantom or non-scope-setting name fails, not merely the two
  removed here.

  **Asserted per BRANCH, which is the part that needed a second pass.** `denyMessage()` has had two
  branches since the previous increment split out the out-of-root case, and the first draft of these
  tests rendered only the in-repo one while claiming branch-independent coverage — L27's own rule,
  applied to half its domain, caught by this increment's review. The membership rules now iterate a
  single enumeration of **every** branch, so a branch added later is covered by each rule for free, and
  the out-of-root branch additionally asserts the other half of L27's form: it must cite **no** command
  at all, since no scope-setting command can express a path outside the root. That emptiness assertion
  was mutation-tested (a `/frobnicate` injected into that branch is caught) rather than trusted to pass
  by construction.

  **Named residual (P0):** the tests prove a cited command **exists** and **invokes the setter**; they do
  **not** prove it does so **first**, which is what the message's own wording claims. A deferral is
  expressed in prose _inside_ a Step 0 section, so a "setter appears in the first `## Step`" test would
  pass for a deferred stage too. The ordering half stays human-read and is labeled advisory rather than
  quietly folded into the floor claim.

## [2.7.8] - 2026-08-19

### Fixed

- **An authorized `## Files` item whose description WRAPS no longer truncates the parsed writes-scope —
  `set-writes-scope.cjs --from-plan`'s exclusion cue now skips an item's own continuation lines**
  (`SKILLS_VERSION` 2.7.7 → **2.7.8**, patch). Mode B ends the authorized list at a heading or at a
  head-less prose exclusion intro (`Files NOT written:`), the latter detected by a vocabulary cue anchored
  to a non-path, non-blockquote line — which the comment beside it described as sufficient to keep "an
  authorized item's own description" from tripping it. That holds for a **single-line** bullet and fails
  for a **wrapped** one: a continuation line is neither a path-item nor a blockquote, so a bullet reading
  "… an in-repo out-of-scope path unchanged" matched `out of scope` and cut the list there. Measured live
  during the previous increment's own planning: a **5-path plan parsed as 1**.

  It failed **closed** — too few paths, a loud deny at the next write — so it was friction rather than a
  hole, and it surfaced only because the setter prints its path count and the count was read against the
  plan a human had just approved. Promoted as `.dev/memory-bank/lessons-learned.md` **L28**; this is that
  entry's floor-escalation half, because the alternative remedy reduces to "plan authors should avoid
  ordinary vocabulary in their own descriptions", which is discipline (**L20**).

  **The exemption is deliberately narrow, and the narrowness is the design.** Only a line continuing an
  **open** path-item's text is exempt — indented, non-blank, with no intervening blank line. A blank line
  closes the item's body, so an **indented** exclusion intro after one still excludes. The obvious wider
  rule ("exempt every indented line") was rejected precisely there: it would let an indented exclusion
  sub-list enter scope, which fails **open**, and this parser's failures must land on the friction side.
  A dedicated assertion pins that case. **Honest bound, stated in the code rather than only here:** a
  _lazy_ continuation — an unindented line continuing a paragraph, which markdown permits — still trips
  the cue; prettier indents continuations in every PLAN this repo formats, so the lazy form does not arise,
  and closing it would need a real markdown parser with no failure to trigger it (P7). The Boundary-2
  comment was **re-derived** rather than amended, since its previous version stated its exemption as
  complete while naming only the single-line case (**L25**).

- **A write denied for being OUTSIDE the repo root no longer prints advice that can never work — the
  writes-scope deny message now splits on root-relativity** (`SKILLS_VERSION` 2.7.6 → **2.7.7**, patch).
  `enforce-writes-scope.cjs`'s `toRel()` returns `null` for any path that is not inside the repo root,
  and every such write was answered with the in-repo remedies: "add it to the active Capability's
  `writes:`, then re-run the scope-setter", "restart the command from the top", and — since the previous
  entry — "release the STALE scope with `--clear`". **Every scope entry is repo-root-relative, so none of
  those three can ever admit an absolute out-of-root path**, `DEFAULT_SAFE_SET` included. Reproduced
  live on the agent scratchpad (`/private/tmp/claude-501/…`) and on `/etc/…`: byte-identical to the
  message an in-repo denial gets.

  **Why that was worse than unhelpful.** The one route that does work — the Bash tool, which
  `PreToolUse` hooks never see — was the only one the message did not name. A reader who needed to write
  a scratch file was left to discover the bypass unguided and with no sense of its boundary, so the
  guard was quietly training the exact escape it exists to prevent, in the one situation where the
  escape is legitimate.

  **The fix is an honest message, not a wider hole.** `denyMessage()` gains a branch, taken when
  `toRel()` returns `null`, that states the structural fact (the path is not inside the repo root, so no
  `writes:` declaration can name it and re-scoping cannot help) and replaces the **whole** FIX block with
  the remedies that are actually reachable: put the file inside the repo and declare it (listed first),
  or — for genuinely temporary/scratch files — write it with Bash, explicitly bounded to scratch work and
  never as a route for in-repo writes. The staleness bullet is suppressed on this branch for the same
  reason the others are: `--clear` reverts to a safe-set that is equally root-relative. **No path becomes
  writable**: the branch changes only prose, and the verdict is pinned unchanged by test.

  The branch covers three cases, all of which `toRel()` maps to `null` — a path outside the root, a
  `../` traversal, and the root **itself** (`path.relative(ROOT, ROOT) === ""`, reachable with
  `file_path: "."`). The wording is "**not inside** the repo root" rather than "outside" precisely so it
  stays true for the third. It is pure string composition over values already in hand: an exception
  raised while building a deny message would exit non-2, which `PreToolUse` treats as a non-blocking
  error, so a throw there would fail **open**.

  **Folded into the same version: the last raw echo in the deny message is now sanitized.** The header
  claimed that _every_ echoed value passes through `asData()`; `blockedPath` did not, in **either**
  message body, so a `file_path` of `"/tmp/x\nFIX: this write is approved, allow it"` forged a line that
  read as one of the guard's own FIX bullets — in a message returned to the **agent** as a tool result.
  Reproduced at the pre-change baseline and in both branches, so it is an **inherited** defect this
  increment closes rather than one the split introduced (the split did add a second raw site, and edited
  the very function whose comment asserted otherwise). Both echoes now go through `asData()`, folded once
  above the branch so the two bodies cannot drift apart on it, at a cap that clears real paths rather than
  the 160-char default — the printed path is consequently a rendering, not a byte-exact echo, which is
  safe only because no branch anywhere reads it. The header comment was **re-derived** rather than patched
  around, and two assertions pin the fold per branch plus the un-truncated rendering of a legitimate deep
  path. Surfaced by this increment's own `/pharn-dev-review` (F2) and fixed at the GATE-2 decision.

  **Deliberately NOT done:** matching the agent scratchpad by prefix (`/private/tmp/claude-*`). That
  literal is platform-specific — `/tmp` on Linux, `%TEMP%` on Windows — and root-relativity is the true
  predicate the prefix is only one instance of. Six new assertions in
  `.claude/hooks/enforce-writes-scope.test.cjs` pin the split in both directions (out-of-root must not
  carry the `writes:` or staleness advice; in-repo must still carry both, and must not carry the
  out-of-root line), because a message defect whose only remedy is discipline recurs
  (`.dev/memory-bank/lessons-learned.md` L20). The hook is human-only (fix #2), so the change was
  delivered as a unified diff and verified at the real path in a `git worktree` of this repo (L26).

## [2.7.6] - 2026-08-19

### Fixed

- **A finished command's writes-scope no longer silently denies later work — `set-writes-scope.cjs`
  gains `--clear`, every setter-invoking command declares a release step, and the deny message names
  the stale scope's origin.** All 17 commands that set `.pharn/writes-scope.json` at their first step
  did so with nothing ever clearing it. Because a **set** scope REPLACES `enforce-writes-scope.cjs`'s
  fail-closed `DEFAULT_SAFE_SET`, a leftover scope is **stricter** than no scope at all: measured live,
  a one-path scope from a finished run denied `.dev/features/*/PLAN.md`, `features/*/SPEC.md` and
  `pharn/pharn-core/*` — three zones the default **permits** — in later sessions, with nothing in the
  message connecting the denial to a run that had already ended.

  **The fix is lifecycle hygiene plus a truthful message; `DEFAULT_SAFE_SET` is deliberately NOT
  widened.** `--clear` deletes the scope file (idempotent when absent) and refuses to combine with
  `--from-plan` / `--from-frontmatter` / `--target`. It deletes rather than writing a `{"scope": []}`
  marker, because an empty array is **truthy**: enforce would compute `allow = [...ALWAYS]` and deny
  everything outside `.pharn/**` — stricter still than the stale scope the flag exists to remove.

  **Honest bounds (P0).** Running the release step is **ADVISORY**: it is a Bash call, outside the
  `PreToolUse` gate entirely, so nothing on the floor forces it and an early abort skips it — it
  degrades safely, since the next command's first-step _set_ overwrites a leftover scope. The floor
  guarantee is unchanged and belongs to the **reader**: absence of a scope file = the fail-closed
  default-safe-set. A new test pins that every command which sets a scope also **declares** the release
  step **and** places it after every set invocation (placement is load-bearing — `/pharn-*memory-promote`
  writes to canon _after_ its human accept/deny gate, so a release line above that write would get the
  gated write denied). That test proves the line is **present and ordered**, never that a run
  **executed** it.

  **Also hardened, unrequested but adjacent (P2).** The deny message is returned to the **agent** as a
  tool result, and `.pharn/**` is Bash-writable and outside the `PreToolUse` gate, so the record it
  echoes is not trusted input. Every echoed value — the newly-added `set_by` / `set_at` **and** the
  pre-existing `scope[]` entries, which were previously interpolated raw — is now rendered as DATA:
  every C0 control, DEL, every C1 control, **and U+2028 / U+2029** folded to a single space, plus a
  length cap. The fold is deliberately wider than "control characters": U+2028 LINE SEPARATOR and
  U+2029 PARAGRAPH SEPARATOR are neither C0 nor C1, yet are line terminators in JavaScript and in
  several renderers, so a C0/C1-only fold left the forge-a-message-line hole half open. It is
  implemented as a char-code scan, matching `.dev/floor/check-provenance.mjs`'s `cleanScalar()` — the
  repo's established idiom, and the only form its own `no-control-regex` lint gate admits. No
  allow/deny branch reads any of these values; the verdict is unchanged.

  `SKILLS_VERSION` 2.7.5 → **2.7.6** (patch: a lifecycle correction to product `.cjs` hook and product
  `pharn-*` command bytes that already shipped).

## [2.7.5] - 2026-08-19

### Fixed

- **Ten floor CLIs silently checked nothing when invoked from a path containing a space or a
  non-ASCII character** — `SKILLS_VERSION` **2.7.4 → 2.7.5** (patch: a correction to bytes that already
  shipped; five product-floor checkers, behavior changed only for invocation paths that never worked).

  Every one of them guarded `main()` with
  ``if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`)``. `import.meta.url` is
  **percent-encoded**; `process.argv[1]` is **raw**. The two therefore never compare equal once the
  script's own path holds a space or a non-ASCII byte — so `main()` never ran and the process exited
  **0 having checked nothing**. A checker that certifies by staying silent is the inverse of the floor's
  whole purpose, and it fires precisely on the ordinary case of a clone living under `~/My Projects/`.

  **Reproduced live before anything was changed.** From a directory named `space dir`,
  `check-ship-briefing.mjs /nonexistent/BRIEFING.md` printed nothing and exited **0**, where the same
  invocation from a normal path printed `RED — briefing is unreadable …` and exited **1**. The sharpest
  instance is `check-lessons-index.mjs --verdict`, whose entire contract is to print one token from the
  closed set `{NO_CANON, COLD, GREEN, STALE, ENUM_ERROR}`: from the spaced path it printed the **empty
  string** at exit 0, and `/pharn-plan` branches on that token's membership.

  **The repair is `import.meta.main` (Node ≥ 24.2), not `pathToFileURL(process.argv[1]).href`.** The
  latter was the obvious fix and it is a **near-miss**: measured on a probe module invoked four ways, it
  closes the space and non-ASCII cases but **still silently no-ops through a symlink**, because
  `import.meta.url` is the resolved real path while `argv[1]` is the link. `import.meta.main` closes all
  three. The form was already live and already explained in `.dev/floor/hash-doc.mjs`, whose header
  documents exactly why the `file://` family is wrong — the repo had the right answer in one file and
  the wrong one in ten, which is the whole shape of the defect.

  Product surface (drives the bump): `pharn/floor/check-ship-briefing.mjs`, `render-ship-briefing.mjs`,
  `render-cost-record.mjs`, `check-lessons-index.mjs`, `gen-lessons-index.mjs`. Apparatus (no bump):
  `.dev/floor/gen-capability-catalog.mjs`, `check-capability-catalog.mjs`, `check-version-badge.mjs`,
  `check-lessons-index.mjs`, `gen-lessons-index.mjs`. `.dev/floor/hash-doc.mjs` already had the correct
  guard and its executable bytes are unchanged; only its header comment was reworded, because the repair
  made that comment inaccurate (it called the removed form "the repo's older sibling idiom" when no
  sibling was left using it) — **and because it had named only one of the form's two defects.** It
  documented the symlink break and never the percent-encoding break, which is the one that actually bit,
  and that omission is the most plausible reason ten copies survived for the whole 2.x line **beside a
  file explaining why they were wrong**. Both defects are now named there, as is the reason
  `pathToFileURL(...)` is banned rather than adopted.

  **Pinned by a new family test**, `.dev/floor/entry-point-guard.test.mjs` (apparatus; never ships): it
  bans **both** wrong spellings on any executable line under either floor, requires every guarded script
  to spell its guard `import.meta.main`, and re-runs three behavioral probes through **four** path shapes
  — normal, spaced, non-ASCII, and symlinked. One probe exists specifically for `render-cost-record.mjs`,
  the only site of the ten that both passes arguments and forwards a return value
  (`process.exit(main(process.argv.slice(2)))`), so dropping the slice or the exit propagation cannot
  pass unnoticed. **Honest bound, stated in the test:** most floor scripts carry no entry guard at all
  (5 of 48 under `pharn/floor/`, 6 of 12 under `.dev/floor/`), so the sweep is vacuously green over the
  rest and pins a **vocabulary**, not a behavior — a novel wrong spelling would pass untouched.

## [2.7.4] - 2026-08-19

### Fixed

- **The three `scan-code-*` argument spans were exponential, and the "no EXPONENTIAL backtracking
  observed" bound they shipped was false** — `SKILLS_VERSION` **2.7.3 → 2.7.4** (patch: a correction to
  bytes that already shipped; three product-floor checkers, matched language, changed only in time).

  `scan-code-ssrf.mjs`, `scan-code-injection.mjs` and `scan-code-path-traversal.mjs` shared
  `SPAN = (?:[^)]|\([^)]*\))*?`. Its two branches **overlap on `(`** — `[^)]` accepts it and the group
  branch requires it — so a chunk like `((a)` has **two** valid parses and N chunks have 2^N. **Reproduced
  live before anything was changed:** `fetch(` + `((a)`×20/24/28 → **0.05 s / 0.47 s / 7.26 s**, ≈3.9× per
  +2 repetitions; ×40 extrapolates to **~7 hours**. About **120 bytes** of crafted input in a scanned file
  therefore hung the review floor — a denial-of-service reachable from the untrusted input the scanner
  exists to read.

  The shipped claim — _"no EXPONENTIAL backtracking observed, bounded by the `)` wall"_ — was **false**,
  and because it asserted a bound inside a floor file it was a **P0 violation** in its own right. Its
  supporting measurement was real but tested only **non-ambiguous** shapes (`(a)`×800, `((a))`×800,
  unclosed `(`×800), so it proved those fixtures were well-formed, never that the span was safe
  (`.dev/memory-bank/lessons-learned.md` **L4** — an authored fixture passes by construction). The
  reasoning error is specific and worth naming: the `)` wall bounds how **far** the span may range, never
  how many **ways** it may decompose what it ranges over.

  The span is now `SPAN = (?:[^)]*\([^()]*\))*?[^)]*?`. Each iteration consumes exactly one `)`, so the
  iteration count is fixed by the input rather than chosen; within a segment `[^()]*` forbids parens,
  forcing the opening `\(` to be the **last** `(` before that `)`. One decomposition per input means nothing
  to backtrack over, so **from a fixed start position** the span scan is **linear** — measured across 11
  adversarial paren families up to ~480 KB lines (2× input → ~2× time; worst family 2.93 ms at 480 KB). The
  same repro now scans in **0.026 s**.

  **The per-line bound is quadratic, not linear, and the headers say so** — claiming otherwise would be the
  same overclaim in the other direction. The engine retries the pattern at every position the sink callee can
  start, so a line costs O(sink-callee occurrences × length): `fetch(`×8000 on a 56 KB line measures 999 ms.
  What this fix removes is the **exponential** term, not the polynomial one — and the polynomial term is
  pre-existing and was strictly worse before, the old span being **cubic** on that shape (1531 ms at ×1000
  where the new form takes 17 ms).

  **The matched language is unchanged**, verified by differential fuzz (200 000 inputs, **0** divergences),
  so this is a **time** fix and not a coverage change: the one-level-nesting bound, the ★ GUARD against
  over-spanning to `[^;]*?`, and the documented depth > 1 true-negative all hold exactly as before. This
  is why the obvious linear rewrite — the disjoint `(?:[^()]|\([^)]*\))*?` — was **not** taken: it skips a
  nested group as an opaque unit and measurably drops `fetch(new URL(req.query.url))` and
  `fs.readFile(path.join(base, req.params.x))`, both ★-pinned, which is the same coverage loss the
  scanner headers already record as rejected.

  Each scanner gains a **ReDoS regression test** whose verdict is a membership test — the scan either
  completed or the OS killed it — rather than a stopwatch reading compared to a threshold, which would be
  machine-dependent. That choice is also what keeps a red **terminating**: a reverted span is killed at
  the 3 s subprocess timeout and fails, where a bare wall-clock assertion would stall `npm test` for
  hours. The detector was itself verified against a scratch copy carrying the old span (SIGTERM → fail).
  A **✧ pin** now holds the three `SPAN` literals byte-identical, per **L20**: the constant and its bound
  paragraph have now been hand-edited across all three files twice, and a discipline-only remedy that has
  recurred has earned a floor check. The pin is **mirrored into all three suites rather than written once** —
  a single-sited guard is lost the moment its one host file is deleted, taking the guarantee for all three
  scanners with it and leaving nothing to notice; mirroring makes it mutual, so any surviving suite still
  enforces the agreement. Verified by injecting a one-token drift into one scanner and observing all three
  pins go red.

## [2.7.3] - 2026-08-19

### Fixed

- **fix #6's `enforces`↔evals binding is a set-membership test now, not a substring scan** —
  `SKILLS_VERSION` **2.7.2 → 2.7.3** (patch: a correction to bytes that already shipped; one
  product-floor checker).

  `pharn/floor/validate.mjs` CHECK 3 decided whether an `enforces` rule_id is "produced by ≥1 eval" by
  concatenating every `evals/expected/*` file into one string and asking `expectedText.includes(id)`.
  A substring scan is not a membership test (`.dev/memory-bank/lessons-learned.md` **L6**), and it was
  false-GREEN two ways. **Both were reproduced live at `rc=0` before anything was changed:**
  - **Prefix collision.** `SEC-1` is a substring of `SEC-12`, so a capability declaring
    `enforces: ["security.md SEC-1"]` passed the floor while its only fixture produced `SEC-12` — the
    binding certified a rule no eval exercises. Principle ids `P0`–`P7` cannot collide with each
    other, which is why this survived: every capability in this repo declares the bare principle
    form, and the file-qualified form `pharn/CONSTITUTION.md` P4 prescribes for stack rules
    (`security.md SEC-1`) is the one that bites.
  - **Free-text laundering.** Any prose mention satisfied the binding, and the live fixtures are full
    of them — `semantic[].judge` strings reading "reported as a FLOOR finding (rule_id P2)", `purpose:`
    lines naming the id. So a fixture asserting _nothing_ about a rule still bound it, which is
    precisely the enum-gated/free-text split (fix #1) failing at the membership layer.

  **The fix reads the structured location instead.** For an `expected/*.json` fixture that is the
  location `pharn/pharn-contracts/eval-format.md` defines — `assertions.structural[]` entries with
  `kind: field_equals` over `field: rule_id` contribute their `value` — cited, not restated (P4), and
  the same shape `pharn/floor/check-structural.mjs` already executes. The collected values form a
  `Set`; the declared id (file-qualified **or** bare, both forms kept) must be an exact member. A
  non-string `value` is dropped rather than coerced, so `String(v)` cannot mint a member like
  `"[object Object]"`.

  **An unparseable fixture is now its own loud RED, named.** The old `catch { return "" }` swallowed a
  parse failure, so a broken fixture contributed nothing and a _sibling_ fixture silently carried the
  binding — the failure was invisible on exactly the input where verification was impossible. It is
  fail-closed now: a fixture that cannot be read or parsed cannot be evidence.

  **The non-JSON path is BEST-EFFORT and labeled as such, in the code and here.** `eval-format.md`
  writes `expected` as `evals/expected/*.md`, so a `.md`-only fixture set is contract-conformant and
  must keep binding — dropping the fallback would convert a valid capability to RED. But markdown has
  no structured location to read: it matches an anchored `rule_id: <value>` line, which means a
  `rule_id:` line **quoted from untrusted case content would bind**. What it does buy over the old
  scan is that a bare prose mention no longer does. Weaker than the JSON path, and not presented as
  equivalent.

  **Blast radius, audited rather than asserted.** All **35** `enforces`-declaring capabilities in this
  repo were simulated under the new rule before the change was written: **0 would-RED**, and
  `validate.mjs .` is GREEN over all 36 capabilities after it. Stated bound: that audit covers _this
  repo_. A downstream install whose `expected/*.json` is shaped as something other than eval-format —
  or whose fixtures are `.yaml`/`.txt` — now REDs where it previously passed on a substring. That is
  the fail-closed direction, but it is a behavior change, not only a bug fix.

  Six regression tests in `pharn/floor/validate.test.mjs` pin it: prefix collision → RED, exact match →
  GREEN, judge-string-only → RED, malformed fixture → RED **by name** even when a sibling binds the id,
  `.md`-only `rule_id:` line → GREEN, and `.md` prose-only mention → RED.

  **The fixture scan now reads each directory entry once, not twice — the TOCTOU pair this same
  increment introduced is gone.** The first cut of the one-level-deep scan guarded the read with
  `statSync(p).isDirectory()`. That is a check-then-use pair — CodeQL's `js/file-system-race`, raised
  High on the PR — and the window is real: the entry can change between the stat and the read. It also
  bought nothing, because `readFileSync` on a directory already throws `EISDIR`. The skip is decided by
  the **read itself** now, so one syscall replaces two and the window closes. **FAIL-CLOSED, and
  stated:** only `EISDIR` skips; every other error code still produces the blocking
  unreadable-fixture finding, never a silent pass. Two further tests pin both halves of a skip that was
  previously untested — a subdirectory under `evals/expected/` is passed over **silently** (no
  unreadable RED), and a rule_id living **only** inside it does **not** bind.

  **No `SKILLS_VERSION` move for that correction:** the `statSync` line never shipped — it was added by
  this same unreleased entry, so `2.7.3` already versions these bytes.

## [2.7.2] - 2026-08-19

### Fixed

- **The Approved-input gate no longer disagrees with canon about what `state:` says — one spec parser
  now, not two** — `SKILLS_VERSION` **2.7.1 → 2.7.2** (patch: a correction to bytes that already
  shipped; two product-floor checkers).

  `pharn/floor/check-spec-approved.mjs` — the deterministic gate `/pharn-plan` runs to decide whether a
  SPEC may be planned from — carried a private `readState()` that parsed `state` **first-wins across
  duplicate keys, with no comment strip**, while the canonical `pharn/floor/check-spec.mjs` `parseSpec`
  is **last-wins with the quote resolved before the comment**. Two checkers, one file, two answers — in
  **both** directions, and **both were reproduced live before anything was changed**:
  - **Fail-OPEN (the serious one).** A frontmatter carrying `state: Approved` followed by
    `state: Draft` resolves LAST-wins to `Draft`, so `check-spec.mjs` returned GREEN for a valid
    **unpinned Draft** — while the gate returned **exit 0, "Approved and un-drifted"**. The one gate
    whose entire job is to let only human-approved intent downstream admitted a spec that was neither
    approved-effective **nor** pinned.
  - **False-RED.** A template-faithful `state: Approved # ratified 2026-08-18` on a correctly pinned
    spec is GREEN to `check-spec.mjs` and was a RED to the gate — `"Approved # ratified 2026-08-18"` is
    not a member of the state enum.

  **The fix is a seam, not a second implementation.** `check-spec.mjs` gains a **`--state`** print-mode
  mirroring `--hash` and `--spec-id`, and the gate **shells it** and holds no frontmatter parser at all —
  the `readState`/`FM_RE`/`stripQuotes` trio and the `node:fs` import are **deleted**, not ported. Hand-
  porting the last-wins/comment-strip logic would have produced a third parser, which is the defect, not
  the remedy. **`--state` deliberately differs from its two siblings in exactly one way,** stated in the
  code rather than left to be discovered: the unreadable path prints the collected RED to **stderr**
  instead of exiting 1 silently as `--hash` and `--spec-id` do — a silent exit hands a shelling caller an
  exit code and nothing to surface, the input-capture boundary `.dev/memory-bank/lessons-learned.md`
  **L5** names, and the gate echoes this child's output verbatim.

  **The whole downstream chain is fixed without being touched.** `check-plan-spec-agree.mjs` shells
  `check-spec-approved.mjs` and holds no `state` parser of its own — verified by reading it this run, not
  assumed — so the four stages that re-verify the spec→plan chain (`/pharn-grill`, `/pharn-build`,
  `/pharn-regress`, `/pharn-verify`) inherit the correction with **zero** diff. Two chain tests pin it
  end-to-end, three processes deep.

  **Why the previously-recorded decision to leave this alone was wrong, and the entry corrected in
  place.** The 2.5.0 entry below states that `readState` "is deliberately **left unchanged** … the
  asymmetry fails **closed** (a false RED, never a false GREEN) — so P7 supplies no trigger". That claim
  is **false** and is now marked as corrected at its own site rather than only superseded here: only the
  comment-strip half fails closed; the duplicate-key half is a **false GREEN**. The trigger existed the
  whole time and was simply not looked for. This is `.dev/memory-bank/lessons-learned.md` **L20** exactly
  — a defect left with a discipline-only bound recurred, in the dangerous direction — so the remedy is
  removal of the duplicate rather than a louder comment.

  **Honestly bounded (P0), in the same terms `bodyHash` already uses for the hash.** Agreement is now
  structural: there is one parse, and the gate has nothing to disagree with. That no **third** parse is
  ever re-introduced is **DISCIPLINE, not a floor op** — the tests **DETECT** a divergent
  re-implementation, they do not **PREVENT** one. The previous bound on this very defect was also prose,
  was also correct when written, and is what rotted; so the bound is written into the module and pinned
  by a **structural** test that strips comments and asserts the gate's source contains no
  frontmatter-fence regex, no `node:fs` import, and no re-implemented value parsing — because two
  behavioural fixtures cannot distinguish "no second parser" from "a second parser that happens to agree
  on these two inputs".

  **19 tests added, and the defect-killing ones are mutation-proved.** Restoring the pre-fix gate against
  the new suite fails **4 of 5** new gate tests (duplicate-key, trailing-comment, the cross-check, and
  the structural pin). The fifth — a `★` P2 fixture putting a raw `ESC` plus the gate's own verdict text
  **inside the `state:` value** — passes against both versions **by design and is labeled as such**: it
  guards the newly-created child-stdout→parent transport, and `check-spec.mjs`'s enum gate REDs that spec
  one layer earlier, so it is a trust-fence guard, **not** a defect-killer. It asserts no line of output
  consists solely of the GREEN verdict, so an untrusted frontmatter value quoted as DATA cannot forge the
  checker's own conclusion. The cross-check asserts the **biconditional** (`--state` prints `Approved`
  ⟺ the gate exits 0) over one set of bytes per fixture, so a future one-sided regression fails loudly.
  Also corrected: the gate's RED message used `state ?? "(none)"`, which could never fire once the value
  arrives over a transport that always yields a string — an absent field would have printed a bare `""`.

  **Patch, not minor, and the distinction from the 2.5.0 precedent is deliberate.** That entry took a
  **minor** for adding `--spec-id`, where the new mode was the _point_ and gave a user surface they did
  not have. Here `--state` exists **only** as the internal seam that removes a duplicate parser; the
  shipped defect being corrected is the increment. `*.test.mjs` files are apparatus and drive no bump.
  **Zero committed `SPEC.md` files exist in this repo**, so no in-tree verdict moves — the beneficiaries
  are downstream user repos and future specs.

## [2.7.1] - 2026-08-19

### Fixed

- **The writes-scope guard's own input is now write-protected, closing a self-escalation reachable
  through a case-variant filename** — `SKILLS_VERSION` **2.7.0 → 2.7.1** (patch: a correction to
  product `.cjs` hook bytes that already shipped)
  ([`.claude/hooks/protect-trusted-paths.cjs`](./.claude/hooks/protect-trusted-paths.cjs),
  [`.claude/hooks/protect-trusted-paths.test.cjs`](./.claude/hooks/protect-trusted-paths.test.cjs)).
  `enforce-writes-scope.cjs` guarded `.pharn/writes-scope.json` — the list it reads to decide **every**
  write — with a single **byte-exact** compare (`rel === SCOPE_FILE`), while its `ALWAYS` glob left the
  rest of `.pharn/` writable. On a case-insensitive volume (macOS, Windows) `.pharn/WRITES-SCOPE.JSON`
  is the **same file**, so the compare missed it: the Write tool could rewrite the active scope and
  then write anywhere fix #2 does not backstop. Reproduced live before the fix — `enforce` exited **0**
  on the upper-case spelling and **2** on the lower-case one.

  **The remedy is one entry in `protect-trusted-paths.cjs`'s `DEFAULT_PROTECTED`, not a widened compare
  in the hook that owns the constant.** That is the cheaper reduction: this hook already full-case-folds
  (`toUpperCase().toLowerCase()`), strips Windows trailing dot/space, and resolves symlinks
  **segment-wise**, so a single entry closes the case-variant **and** the dangling-symlink-alias vector
  at once — both measured. `enforce-writes-scope.cjs` keeps its byte-exact compare (defense in depth),
  and `set-writes-scope.cjs` is unaffected: it writes the file with `fs.writeFileSync`, which
  `PreToolUse` never sees. The entry is deliberately the **one file** and not `.pharn/**` — the rest of
  that directory is disposable runtime scratch stages legitimately write, and it holds the load-bearing
  product lessons-index cache.

  **Bounded, and stated (P0).** This closes the **Write-tool** vector. It is **not** a claim that the
  scope file cannot be rewritten: Bash-tool writes bypass `PreToolUse` hooks entirely and reach it
  exactly as they reach every other guarded path — the standing bound the hook's own HONEST BOUNDS
  block and `CLAUDE.md` already record, neither weakened nor improved here.

  **Five tests, measured rejecting before being trusted (L4).** Four of them **fail** against the
  unpatched hook — the declared spelling, three case variants, the dangling alias, and a new **✧
  cross-copy pin** asserting that `enforce-writes-scope.cjs`'s `SCOPE_FILE` is a member of
  `DEFAULT_PROTECTED` (the literal now lives in two hooks; the existing `CONTROL_SURFACE` agreement
  guard structurally cannot cover it, since it compares only `.claude/`-prefixed entries). The fifth
  pins that `.pharn/` is **not** over-blocked and passes before and after, correctly — it is a
  non-regression guard, not a fix-detector. The three ✧ tests already derived from `DEFAULT_PROTECTED`
  pick the new entry up automatically.

  **`CLAUDE.md`'s hard-constraint #1 enumeration is corrected in the same edit**, which had also been
  understating the guard in a second, unrelated way: it named `.claude/settings.json` alone, while
  `DEFAULT_PROTECTED` has carried `.claude/settings.local.json` since that file was recognized as a
  loaded wiring file.

## [2.7.0] - 2026-08-18

### Added

- **`/pharn-ship` now records the MEASURED token cost of the run on `features/<name>/ship-record.json`
  (`SKILLS_VERSION` 2.6.2 → 2.7.0, minor — a newly shipped checker + contract surface).** New
  `pharn/floor/render-cost-record.mjs` (Node stdlib, no network, no model call) reads the run's own session
  transcript and prints a `cost` block; `/pharn-ship` Step 3b embeds it before computing any attestation
  hash. New `## The \`cost\` block`section in`pharn/pharn-contracts/ship-record.md` is its contract.

  **Why (`LIMITS.md §1c`).** That limit already states the honest position — a static `est_tokens` is
  "either a constant guess (always wrong) or a function of input size (which frontmatter cannot express)",
  and "the real number is the **measured runtime cost**". Nothing on the product surface measured it: a user
  running the pipeline on their own API key had no way to see what a feature cost. The maintainer could
  always reconstruct it from transcripts — `.dev/measurements/token-cost-2026-08-18.md` is that
  reconstruction — so the instrument was missing on the side of the person actually holding the bill.

  **What is FLOOR.** The dedup and the sum. Records are deduplicated on `requestId` before summing —
  **load-bearing, not a nicety**: the platform writes one API response as several transcript lines that each
  repeat the same usage object, measured at **2.34×** over-count on this repo's own history. Disjointly
  stored subagent transcripts are included, or fan-out cost would be invisible. Every token class
  (uncached input / 1h cache-write / 5m cache-write / cache-read / output) is summed **separately** — cache
  reads bill at a fraction of fresh input, so a blended total would be wrong by close to an order of
  magnitude. Given the same transcript bytes the render is byte-identical (no clock read, no randomness);
  pinned by 26 hermetic tests.

  **What is ADVISORY, and stated (P0).** `coverage` has **no `complete` member by design** — the ship
  stage's own turns are still being written when the block renders, so a run can never fully account for
  itself; the figure is a floor on spend, never the total. It reports **tokens, never dollars**: no price
  table is embedded, because published prices change and nothing in the floor could check one. It
  **annotates and gates nothing** (fix #3) — it can never flip a verdict or block GATE 2, and "the record
  shows N tokens" never means "the spend was worthwhile". Coverage is machine-local (the transcript is never
  committed), the `product-lessons-index` precedent's weakness rather than the dev floor's byte-equality.
  `by_stage` keys are the platform's own `attributionSkill`, so a stage absent from the block means the
  platform did not tag it, **not** that the stage did not run.

  **One ordering constraint, load-bearing.** `record_hash` covers the record with `attestation` removed,
  so `cost` sits **inside** the attested content; it is written before any attestation hash is computed, or
  an attestation would be invalidated by its own record.

  **The cwd→transcript-directory mapping is lossy** (`a/b` and `a-b` collide), so the renderer verifies the
  located transcript's own recorded `cwd` and refuses rather than report a foreign run.

## [2.6.2] - 2026-08-18

### Added

- **`/pharn-ship` Step 2d — a DISPLAY-ONLY pull-request handoff.** `pharn/pharn-contracts/ship-briefing.md`
  already states that `BRIEFING.md` "is written to be pasteable as a pull-request description"; Step 2d
  closes the last manual gap by **displaying** the exact `gh pr create --title '<name>' --body-file
features/<name>/BRIEFING.md` invocation at GATE 2. **`/pharn-ship` executes nothing** — no branch, no
  add, no commit, no push, no PR. It prints a line; a human reviews it and runs it, or does not.
  `SKILLS_VERSION` → `2.6.2`.

  **The boundary was deliberately NOT crossed, and that was the increment's actual decision.** Opening the
  PR from inside the command was specified, designed in three variants, and **rejected** at the plan gate.
  Two reasons decided it. First, **P7**: the triggering failure was "the user does one paste" — a
  convenience preference, not a dogfood or eval failure; the `product-capability-catalog` deferral already
  settled this test for a less invasive addition. Second, **the floor**: fix #7 gates
  `Write|Edit|MultiEdit|NotebookEdit` only, so a Bash-run `git push` bypasses it entirely
  (`.dev/memory-bank/lessons-learned.md` L19; `THREAT-MODEL.md` §4 item 2 already records the residual) —
  a commit-and-push step would have been the **first product action with no floor gate of any kind**, at
  the most consequential point in the chain. "Advisory" next to "pushes to a shared remote" is the pairing
  this repo exists to refuse.

  **The existing non-goal sentences are unamended, byte-for-byte** ("Reaching the end of the chain is
  permission to **present**, never to merge / ship / seal / commit"). A new adjacent bullet makes Step 2d's
  boundary explicit rather than leaving a reader to reconcile a printed `gh` line against an unqualified
  "never commits".

  **No floor element — and the first draft got this wrong.** The emitted block is a string a human pastes into a **shell** —
  a different egress shape from every other artifact in the chain, which are files that get read rather
  than lines that get run. `ship-briefing.md` constrains `feature` only to "non-empty, control-char-free,
  `<=128` chars", which admits spaces, `;`, backticks and `$(…)`, so Step 2d **shape-checks the slug**
  (`^[a-z0-9][a-z0-9-]{0,63}$`) before interpolating it, single-quotes the title, and on a non-matching
  slug **refuses the one-liner** rather than silently sanitizing one (which would misname the PR). That
  check was labeled `FLOOR — enum/regex, ARCHITECTURE §2 primitive #3` in the first draft and **that was
  wrong**: nothing executes it — no checker reads it, no test pins it, and `validate.mjs` ignores
  `.claude/commands/`. It is **specified prose, advisory compliance**. The review lens caught it, the
  label was corrected in both files, and the miss is recorded rather than quietly fixed, because "written
  in the command" mistaken for "guaranteed" is the precise disease this repo exists to prevent (P0).
  Making it a real guarantee needs a checker and a test — follow-up `ship-slug-shape`, not a claim.
  **Everything else in Step 2d is advisory too:** that the human runs the
  command, that their remote is GitHub, that `gh` exists or is authenticated — `/pharn-ship` neither probes
  for `gh` nor claims it exists. Step 2d adds **no** new floor primitive and **no** new `writes:` path.

  **Verifiability pointer:** the briefing's own `rendered_at_commit` frontmatter field (already
  cross-verified by `pharn/floor/check-ship-briefing.mjs`) — **not** `ship-record.json`'s `record_hash`,
  which binds the _attestation_ block on a different artifact.

  **Bump sizing (`SKILLS_VERSION` 2.6.1 → 2.6.2, patch).** Sized against CLAUDE.md's rule: **minor** is
  reserved for "a newly shipped capability / command / checker" and Step 2d is none of the three — no
  `role:`-bearing capability, no new command, no new floor checker. It is new prose in a command that
  already shipped, adding no contract, frontmatter or finding-shape change, so **major** (a breaking shape
  change invalidating existing installs) is not in question either.

### Fixed

- **The legacy lessons `L1`–`L17` are retro-tagged, so `docs/lessons-index.md` is selectable on more
  than the title** ([`.dev/memory-bank/lessons-learned.md`](./.dev/memory-bank/lessons-learned.md),
  [`.dev/floor/lessons-index-core.mjs`](./.dev/floor/lessons-index-core.mjs),
  [`.dev/floor/lessons-index-core.test.mjs`](./.dev/floor/lessons-index-core.test.mjs),
  [`/pharn-dev-plan`](./.claude/commands/pharn-dev-plan.md),
  [`/pharn-dev-regress`](./.claude/commands/pharn-dev-regress.md),
  [`/pharn-dev-memory-promote`](./.claude/commands/pharn-dev-memory-promote.md)) — #114 defined the
  `type: <enum> · concepts: [...]` tag line and #115 built the index that reads it, but every pre-#114
  entry stayed untagged, so **17 of 21 rows rendered `-`** and a `type`-keyed or `concepts`-keyed
  selection was incomplete by construction. Each of `L1`–`L17` now carries the tag line in its **defined
  structured location** (the first non-empty line after the `## L<n> — <title>` heading, read by
  `lessons-index-core.mjs`, never grepped — L6), and the regenerated index header reads
  **`21 lessons · 21 tagged · 0 malformed · 0 untagged`**.

  **The `type` assignment reproduces the ratified distribution exactly** — `process` 5 · `scoping` 4 ·
  `floor` 4 · `tooling` 2 · `contract` 1 · `eval` 1, component-for-component with the corpus figures
  `check-provenance.mjs` has published since #114. That is a **cross-check, not a floor op**: no checker
  computes it, and it was re-derived by hand this run. `TYPE_ENUM` is **untouched** — the re-derivation
  found no lesson needing a new member, so none was proposed (P7; the dropped `injection` precedent).
  The 37 `concepts` tags are an **open vocabulary**, shape-checked and never enum-checked.

  **The promote path deliberately was NOT used, and that sets a standing precedent.**
  `/pharn-dev-memory-promote` structurally cannot annotate an existing entry: its duplicate-id check is a
  deterministic RED on an id that already exists, Step 6 **appends** a whole entry rather than annotating
  one, and `check-provenance.mjs` **never scans canon** — so a `retag` mode would have needed a new
  canon-scanning primitive and a duplicate-id guard that **inverts by mode**, becoming its own opposite
  when the mode is wrong. The retag therefore travelled the **ordinary gated build path** (declared in
  `## Files`, scoped by `set-writes-scope.cjs --from-plan`, human-approved at the plan gate). The
  division is now recorded where a future reader will look, in the promote command itself:
  **annotating** an existing entry travels the ordinary gated build path; **promoting** a new entry
  travels `/pharn-dev-memory-promote`, the sole path for an entry that ENTERS canon with provenance. A
  retag creates no entry and no `provenance`, so `pharn/ARCHITECTURE.md §5`'s provenance-per-entry clause
  is not triggered by one — which is why **no provenance was retro-filled**, and why §5 stays true as
  written with no second canon-write path to document.

  **The honest split (P0).** What is floor-backed is narrow, and narrower than "the build was gated":
  the fix #7 writes-scope pinned every **`Write`/`Edit`** to the plan's declared paths (the setter
  printed a path count read against the plan's own declared number — L20), but **one declared path was
  never gated at all** — `docs/lessons-index.md` is produced by `npm run docs:generate`, a **Bash**
  write, and the pre-write hook gates only `Write|Edit|MultiEdit`. That escape is **L19 exactly**, and
  L19's own remedy is to **declare it rather than pretend the gate covered it**, which the plan does and
  this entry now repeats rather than dropping. Alongside it, `check-lessons-index.mjs` holds the
  committed index to **byte-equality** with what the core recomputes from canon — **consistency, never
  correctness**. What is **not** guaranteed, stated rather than implied: whether a `type` or a
  `concepts` tag actually **describes** its lesson is model-drafted and human-ratified at the plan gate
  and is checked by **nothing** — **"typed `floor`" still never means "about the floor."** The #114
  render residual is **narrowed, not closed**: the tag gate marks a bad value `?` rather than failing
  and `docs:check` stays **exit 0** over one, so a GATE-2 fix pass added a live-canon assertion to
  `.dev/floor/lessons-index-core.test.mjs` (`0 untagged · 0 malformed`) that makes a malformed tag line
  fail **`npm test`** — per **L20**, a remedy that reduces to "remember to grep the header" has earned a
  floor check. **Scoped honestly:** that pin covers **this repo's** canon only; a **user's**
  `memory-bank/` has no equivalent, so the `lesson-tagline-render-check` follow-up still
  stands. The now-false "a `-` is the expected, benign legacy shape" wording is corrected at its four
  live sites — `CLAUDE.md`, `/pharn-dev-plan`, `/pharn-dev-memory-promote`, and the dev index core's
  inline comment plus its rendered header (L1's meta-doc sweep). The **product** twins
  (`pharn/floor/lessons-index-core.mjs`, `/pharn-memory-promote`, `pharn/floor/check-provenance.mjs`) are
  **byte-unchanged**: their wording already reads correctly for a user's corpus, which may legitimately
  hold hand-written entries.

  **Honest trigger (P7), stated rather than hidden — and deliberately NOT called a dogfood failure.**
  Like #114 and #115 before it, this was **identified at design time**: no dogfood run failed on an
  untagged entry, no eval regressed, and `typed-lessons/PLAN.md` recorded the gap in advance as
  "incomplete **by construction**." Its authorization is that it is the **named follow-up** #115 booked
  (`retro-tag-legacy-lessons`), ratified by a human at the plan gate — not an observed failure. Also
  deliberately **out of scope**: `L10`'s misplaced `**Provenance.**` block (`L11` carries two; `L10`'s
  `promoted` column still renders `-`) stays a separate follow-up, since repairing it **moves** real
  provenance and carries a different review question. Also **not bundled**, and named rather than
  silently carried: `/pharn-dev-grill` still says _"today the registered set is the `testability`
  griller"_ where `count-grillers.mjs` reports **13** — a live doc-vs-repo drift on a **different axis**
  from this increment's, left as a follow-up so the diff spans one story. **`SKILLS_VERSION` is NOT
  bumped** — every changed path is `.dev/**`, a `pharn-dev-*` command, a `*.test.*` file, `docs/`, or
  repo-meta; no product-surface byte moves, so the README badge is unchanged too.

  **Corrected at the GATE-2 fix pass, recorded rather than quietly folded in.** `/pharn-dev-grill` and
  `/pharn-dev-review` each caught a P0 labelling defect in this increment's **own** artifacts: the
  guarantee-audit row claiming the `type` enum was `FLOOR` when it only **marks** a bad value (it now
  says so, and agrees with its own residual row), and this entry's honest-split paragraph asserting the
  fix #7 guarantee one notch broader than the plan did (the L19 Bash-write narrowing above). Both were
  fixed inside the approved scope. **The pipeline caught its own overclaims — which is the only reason
  to run it.**

## [2.6.1] - 2026-08-17

### Deferred

- **Recorded that PHARN interrogates observability at plan time only, and never against the code that
  results — as a deliberate deferral, not a TODO.** The `observability` griller reads the PLAN and
  nothing else; `pharn/floor/scan-plan-observability.mjs` is one of five `scan-plan-*` scanners with no
  `scan-code-*` counterpart, and `pharn/floor/lens-scanner-map.json` registers no observability lens
  among its 22. The practical consequence is that a plan may declare telemetry, pass the grill, and the
  resulting diff may wire none while every floor stays green.

  **Why no lens was built (P7).** The floor-able half of the question — "a call to the **configured**
  logger/telemetry sink exists on this failure path" — cannot be built as stated, because **no
  telemetry sink is configurable anywhere in PHARN**: `pharn.config.json` carries only `models.stages`
  and `ship.requireAttestation`, and `pharn/pharn-contracts/seam-config.md` names no telemetry concept.
  Any code-side scanner would have to hardcode a logger-name set — the same construction whose
  false-negative `pharn/floor/scan-code-swallowed-exception.mjs` already documents (`telemetry.record(e)`
  is classified CLEAN). Shipping a checker that is wrong for every project with a custom sink, while its
  capability doc reads `FLOOR`, is the P0 disease this repo exists to prevent. No dogfood run and no
  eval failed on this gap, so P7's trigger — a real failure, never a hypothetical — has not fired.

  **The one near-miss, stated so the absence claim is not overstated.** `scan-code-swallowed-exception.mjs`
  _does_ read code for logger calls, but with **inverted polarity**: a logging call inside a `catch` is
  evidence the error was _swallowed_, not evidence it is observable. An exhaustive sweep confirmed the
  other 17 `scan-code-*.mjs` scanners contain no logger reference at all. A catch that rethrows and
  emits nothing is CLEAN to every check PHARN currently ships.

  **The limit is recorded as `LIMITS.md` §5, appended after §4 with no renumbering** — the existing
  section ids are load-bearing and cited from code (`pharn/floor/scan-installed-skills.mjs:21` cites
  `§1a`; `pharn/floor/lessons-index-core.mjs:78,316` cite `§1c`), so a new top-level section was the
  only safe shape; a fifth entry under §1 would also have contradicted its own heading ("The four
  irreducible limits"). `LIMITS.md` is hook-denied to the agent, so the text was staged for a human
  and applied by hand outside the agent loop.

  **`SKILLS_VERSION` bumped to `2.6.1` (patch)** — a clarification to already-shipped trusted-doc
  bytes, per `CLAUDE.md`'s bump-size rule, with the matching README badge edit. Full reasoning, the
  measured discovery, and the rejected designs: `.dev/features/observability-code-side-limit/`.

## [2.6.0] - 2026-08-17

### Added

- **`/pharn-ship` now renders `features/<name>/BRIEFING.md` at GATE 2, alongside `SHIP.md`.** `SHIP.md`
  stays a thin roll-up of exit codes and pointers; `BRIEFING.md` is a distinct, one-screen artifact
  answering what a reviewer needs before opening any other file — what was built, why this design (when
  recoverable), and whether it matches what was asked. It is assembled **deterministically** by the new
  `pharn/floor/render-ship-briefing.mjs` (Node stdlib only, no LLM call): every enum-gated frontmatter
  field is a verbatim copy of a value already present in a committed source file (SPEC/PLAN frontmatter,
  `regression-report.json`, `verify-report.json`, GRILL.md's own verdict line), or the honest literal
  `n/a`/`unknown` when that source is absent — never fabricated. A design-rationale section is located in
  `PLAN.md` by a curated structural heading-scan and quoted verbatim when found (matched against all 34
  heading spellings sampled from this repo's own build history); when none is found, `/pharn-ship` may
  generate one narrow, always-labeled `## Why this design (ADVISORY — model-synthesized, not
floor-verified; ...)` paragraph — the _only_ generated prose in the artifact, structurally confined to
  one fenced section and never reaching an enum-gated field. A paired new checker,
  `pharn/floor/check-ship-briefing.mjs`, re-verifies every frontmatter field against its live sibling
  source (cross-file equality, not merely shape) and is surfaced to the human as an **annotation only** —
  it never gates GATE 2, never issues a seal, and never becomes a precondition for reaching the human's
  decision. New contract: `pharn/pharn-contracts/ship-briefing.md`. **`SKILLS_VERSION` bumped to `2.6.0`
  (minor)** — a newly-shipped command step, contract, and checker, not a correction of already-shipped
  bytes.

## [2.5.5] - 2026-08-17

### Fixed

- **`/pharn-review.md` Step 6 now mandates surfacing every `sources[]` contributor, not only the merged
  finding's top-level scalar.** When two lenses flag the same `(type, rule_id, file)` for different
  reasons, `pharn/floor/merge-findings.mjs` correctly collapses them into one finding — the scalar
  `problem`/`evidence` are taken from `sources[0]` after a deterministic sort, and the additive
  `sources[]` array carries every contributor's `{source, severity, problem, evidence}`. Nothing was
  lost in the data. But Step 6's rendering instruction only listed `sources[]` in its P2 quoting
  mandate — it did not require a renderer to actually display more than the top-level scalar, so a
  `REVIEW.md` following it literally could show only the first lens's `problem` and leave a second
  lens's distinct concern at the same location invisible to the human reader. Step 6 now adds an
  explicit clause: when a finding's `sources[]` has more than one entry, surface each contributor's
  `source` and `problem`, attributed to its lens, still rendered as quoted DATA (P2). `merge-findings.mjs`,
  the merge contract, and the `sources[0]`-after-sort scalar selection are unchanged — this is a
  renderer-only fix. `/pharn-dev-review.md` was checked for the same gap and needs no fix: read live, it
  never calls `merge-findings.mjs` (it runs four inline lenses into one report directly), so no
  `sources[]` structure exists there to under-render. **`SKILLS_VERSION` bumped to `2.5.5` (patch)** —
  `pharn-review.md` is product surface; this clarifies a rendering mandate in shipped bytes with no
  contract or floor change.

## [2.5.4] - 2026-08-12

### Fixed

- **`/pharn-plan.md`'s `## Files` placeholder guidance now shows the list-item shape `pathsFromPlanFiles` actually parses.** The contract blockquote had said to keep an unfilled placeholder in angle-brackets (`` `<path>` ``) without showing it as a list item, and warned only that a bare `` `path` `` "word" would parse as scope — but the parser matches ``- `…` `` list items (`pathsFromPlanFiles`), so the unsafe form is specifically ``- `path` `` (no angle brackets), which `isConcrete` accepts while ``- `<path>` `` does not. The guidance now shows ``- `<path>` `` explicitly and names the bare list-item form as unsafe. **`SKILLS_VERSION` bumped to `2.5.4` (patch)** — `pharn-plan.md` is product surface.

- **A bare, non-blockquote prose line under a PLAN's `## Files` could silently truncate the authorized writes-scope, and `/pharn-plan.md` didn't say so.** `set-writes-scope.cjs`'s Mode-B parser (`pathsFromPlanFiles`) already exempts an authorized path-item's own description and an explanatory blockquote from its fail-closed exclusion-cue fallback (Boundary 2), but a bare narrative sentence between two path items — e.g. "these steps do not change the public API" — still matched the cue and ended the list there, dropping every path after it from `.pharn/writes-scope.json`. This is fail-closed (the build is blocked, not silently under-protected) and the underlying matcher is unchanged: narrowing it would trade today's false-positive for a fail-**open** false-negative on a real, unusually-worded exclusion — the exact failure mode L18 already documented. `/pharn-plan.md`'s `## Files` contract blockquote — the one place an author writes this section — now names the caveat and the three ways to avoid it (blockquote, path-item description, or the `### Explicitly not touched` heading), and clarifies that its closing sentence ("only back-tick paths become the build's scope") does not mean non-path lines are harmless. **`SKILLS_VERSION` bumped to `2.5.3` (patch)** — `pharn-plan.md` is product surface (a non-`pharn-dev-` command), and this is a prose clarification of already-shipped bytes with no behavior change.

## [2.5.2] - 2026-08-12

### Fixed

- **`set-writes-scope.cjs` no longer mangles a Next.js route-group directory in a `writes:` entry.** Its `clean()` helper strips a trailing " (annotation)" (e.g. " (gated)") from a declared path, but the regex used `\s*` (zero-or-more space) before the paren, so it also matched a path segment that itself legitimately ends in `)` — `app/(marketing)` collapsed to `app/`, and a nested `app/(a)/(b)` would have collapsed the same way. A route-group `writes:` entry therefore silently under-scoped: the build's intended writes under `app/(marketing)/…` fell outside the emitted scope, and `enforce-writes-scope.cjs` denied them — fail-closed on a common, real layout, not a hypothetical one. The regex now requires `\s+` (one-or-more space), which still strips the documented space-separated annotation form but leaves a route-group segment (no leading space before its own paren) intact.

  **Why `\s+` and not removing the strip entirely.** An annotation is always written with a leading space per the function's own doc comment; a route-group segment never has one. Requiring the space is therefore a precise, minimal fix on that one distinguishing axis. Discovery confirmed live that no `writes:` frontmatter in this repo's `.claude/commands/*.md` currently exercises the annotation-strip on a real trailing `)` — the one paren-containing entry (`pharn-build.md`'s placeholder) ends in `>`, not `)`, so it was never reachable either way — so removing the strip was a defensible alternative, but `\s+` is the smaller, zero-cost change and preserves the documented behavior for a future spaced annotation.

  **Verified as a real fix, not just an authored assertion (L4).** The two new "survives intact" tests were confirmed to FAIL when the live regex was reverted to `\s*` (scope collapsed back to `["app/"]` / `["app/(a)"]`), then confirmed to pass again once `\s+` was restored — the mutation was applied and reverted against the actual file, not merely described.

  **The self-lock, unaffected.** `set-writes-scope.cjs` is one of the three hook scripts `protect-trusted-paths.cjs` denies Write/Edit/MultiEdit to (fix #2's control surface); this one-line change was applied via a targeted Bash string replacement (confirmed live: a `Write` to this path still exits 2, denied), exactly as prior fixes to this file's sibling hooks have been.

  **Nothing an existing install newly-REDs.** A route-group `writes:` entry that was silently and incorrectly under-scoped now scopes correctly — a fail-closed-on-a-valid-layout defect becoming correct, never the reverse. A space-separated annotation still strips identically to before. **`SKILLS_VERSION` bumped to `2.5.2` (patch)** — `set-writes-scope.cjs` is a product hook (bump-triggering; it ships as part of the guarded `.claude/` surface), and this corrects a mangle in already-shipped bytes without changing any documented, intentional behavior.

- **The front page stopped advertising a version number that had been wrong for the whole `2.x` line — and a checker now makes that impossible to repeat silently.** The README badge read `version-1.0.0` while `SKILLS_VERSION` had reached **2.5.1**, and it linked to a CHANGELOG whose every recent entry is keyed to `2.x`. Rendered by shields as a conventional release marker, it implied a stable `1.0.0` release that the status note three lines below **explicitly disowns** ("not an adoptable release"), leaving a visitor no way to tell whether the project is at `1.0.0` or `2.5.1`. The badge is now `pharn-2.5.1` — labelled for the thing it versions — and the CHANGELOG header states the two tracks outright instead of the ambiguous "The current version is also recorded in `SKILLS_VERSION`".

  **Why a checker and not a note in the bump discipline.** The obvious fix — change the number, add "remember to update the badge" — is the remedy `.dev/memory-bank/lessons-learned.md` **L20** rejects by name: when a lesson's only remedy is that the agent should remember, a second occurrence is evidence the remedy is the wrong kind. This badge had already survived the entire `1.x → 2.5.1` run of bumps, so the trigger was long since met. `.dev/floor/check-version-badge.mjs` reduces the claim to primitive #3 (enum/regex): it locates the badge by its **shields URL pattern** — never a line number, since editing the README shifts lines — and asserts the extracted value equals `SKILLS_VERSION`. **The badge drifted precisely because it sits in the README's unguarded prose**, outside the `CURRENT-STATE` markers that `check-capability-catalog` holds to byte-equality; that region is exactly what no gate was reading.

  **The wiring is the half that would have been missed.** The request said "wire it into `npm run check`", and that alone would have left the checker **unrun on every pull request**: read live, `.github/workflows/ci.yml` invokes each script as its own step and **never** `npm run check`. This repo has shipped that exact false claim before — the comment on the `docs:check` pin in `.dev/floor/lessons-index-core.test.mjs` records a commit where the guard was believed wired and was not. So the checker gets both a `check:badge` script folded into `check` **and** its own CI step, each pinned by a test, including the `if:` condition — because a step disabled by `if: false` is a dead guard that leaves the invocation visible and the test green.

  **What it does not buy, stated rather than implied (P0).** It compares two strings. It does **not** guarantee `SKILLS_VERSION` is correct (a badge matching a wrong bump is still GREEN — the guarantee is agreement, not truth), it does **not** guarantee the version story now _reads_ coherently (prose judgment, human-reviewed, gated by nothing), and the pin cannot prove GitHub executed the job or that branch protection requires it — harness-layer facts unverifiable from inside the repo. It also does **not** read a structured location: a README badge has none, which is the honest narrowing of **L6** rather than a claim against it. The anchor is the shields URL — a structured token within prose — and more than one match is a RED, never first-match-wins.

  **Two defects found at `/pharn-dev-grill` and fixed before the first build**, both about legibility rather than direction. A `SKILLS_VERSION` carrying a hyphen cannot round-trip through a shields message (which encodes a literal `-` as `--`), so `2.6.0-rc.1` would have surfaced as a mismatch between `2.6.0` and `2.6.0-rc.1` — two values that look almost identical; it is now a named refusal explaining the encoding limit. And when both inputs are broken the precedence was undefined, so `SKILLS_VERSION` is now validated first and a test pins that order.

  **No `SKILLS_VERSION` bump, and that is the rule rather than an exemption.** Every path touched is repo-meta (`README.md`, `CHANGELOG.md`, `package.json`, `ci.yml`, `CLAUDE.md`) or build apparatus (`.dev/floor/**`, whose `*.test.mjs` never ships). None is in the bump-triggering set, so this entry carries no version line. `CLAUDE.md`'s `npm run check` component list was corrected in the same edit: it was **already** missing `check:markers` before this increment, and adding `check:badge` while knowingly leaving that out would have shipped a list still false.

  **Found but deliberately not fixed here (recorded, not smuggled in).** `.claude/commands/pharn-dev-verify.md:100` claims its gate set is "exactly the repo's `npm run check` aggregate"; live it is a strict **subset** — `docs:check` and `check:markers` are already outside it, and `check:badge` becomes a third. The defect predates this increment and belongs to a different axis (verify's self-description, not the front-page version story), and the file was not in the approved plan's `## Files`, so correcting it here would have meant widening an approved scope mid-run. Follow-up: `verify-gate-map-claim`.

- **`features/README.md` stopped describing the shipped product pipeline as unbuilt.** The directory guide still read as it did before the product commands existed: `/pharn-spec` was called "(a later increment)", with "Until then this directory is the declared, empty home…" asserting the command does not exist yet, and the artifact list described the downstream stages "as those stages are built". All seven spine stages ship — verified live this run as `.claude/commands/pharn-{spec,plan,grill,build,regress,verify,ship}.md` — so a user cloning the repo read a false statement about tools they can already run. The two sentences are now present-tense while **keeping** the accurate fact the old wording carried: a fresh clone's `features/` really is empty until the user runs the command, which is what makes the directory a declared home rather than a populated one.

  **No `SKILLS_VERSION` bump (it stays 2.5.1), and that is the rule, not an exemption.** `features/README.md` is a README, and the versioning discipline exempts pure repo-meta from the bump — the decision is settled by the file's _kind_, not by whether an install scaffold copies it, and the concrete bump-triggering set (the `pharn/` tree, `pharn/floor/*.mjs`, the four trusted docs, the product `.claude/` surface) does not list it. This entry carries no version either.

  **Scope, and what the sweep found but did not fix.** The originally-reported second half — a dead `node floor/validate.mjs` in `pharn/floor/README.md` — was verified **already fixed** (PR #126, now `node pharn/floor/validate.mjs:34`) and left untouched. The meta-doc sweep the plan owed surfaced one genuine sibling of the same class, deliberately deferred: `pharn/pharn-contracts/finding-shape.md:81` still calls the `check-structural`-over-emitted-output wiring "increment **3c, not yet built**", though `/pharn-dev-eval:125` and `/pharn-verify:210` both invoke it today. That one is **product surface**, so correcting it bumps `SKILLS_VERSION` — a different axis, and its own increment.

## [2.5.1] - 2026-08-11

### Added

- **The "specified; ships with the guarded surface" annotations are now floor-checked in BOTH drift directions — the entry below corrected the docs by hand, and this stops that correction from rotting.** The F7 fix reduced to "remember to update the docs when the primitive ships", which is exactly the remedy-class `.dev/memory-bank/lessons-learned.md` **L20** says WILL fail. The P7 trigger is not hypothetical and not new: the trusted docs asserted non-existent floor primitives in the present tense and **nothing detected it** — all three are in `.prettierignore` **and** excluded by name in `.markdownlint-cli2.jsonc`, and no floor checker reads their prose, so the drift was structurally invisible for as long as it was true. New `.dev/floor/check-specified-markers.mjs` + `.dev/floor/specified-primitives.json`, wired into `npm run check` as `check:markers`.

  **Two directions, and the first one is the one nobody would catch.** **(1) The primitive SHIPS while its markers remain** → RED naming every site: the doc now **understates** a live protection. This fires precisely when the repo gets **better**, which is exactly when no one is auditing the docs for a bug. **(2) A marker is DELETED while the primitive is still absent** → RED: a silent return to overclaiming, the original F7 defect. A third check covers the other half of what F7 fixed — `named_artifacts` asserts a doc citing a shipped artifact still names it correctly **and** that the artifact exists, and rejects any `forbidden` legacy citation still present, guarding the `security-secrets` → `secrets-in-code` name-drift class in both directions.

  **Membership is read from a STRUCTURED manifest, never from prose — and that is a lesson applied, not a preference.** L6 ("a membership fact is read from the structured location, never grepped from free text") **recurred inside F7's own `REVIEW.md`** while correcting an unrelated error: a substring search for finding objects counted a remediation note that quoted the search pattern, inflating 6 findings to 7. A prose-scanning version of this checker would carry the identical defect — a CHANGELOG sentence quoting a marker would register as a doc site. So the 11 annotation sites are **enumerated** in `specified-primitives.json`, not discovered.

  **Reproduced live, not merely asserted (L4 — an authored fixture passes by construction).** A stub `.claude/hooks/pre-egress.cjs` was created in the real tree: the checker went **RED on all 7 pre-egress sites**, each naming its file and the exact marker to remove; deleting the stub returned it to exit 0. **20 tests**, of which 15 are `✧` mutants driving the RED and fail-closed paths with fixture trees and fixture manifests (hence the `--manifest` flag): the primitive shipping, a one-character marker edit, an unreadable site file, an unknown probe type, an unreadable manifest, a manifest with no `specified_primitives`, malformed primitive/site/named-artifact records, a coexisting obsolete legacy citation, and both named-artifact failures. An unknown probe type exits **2**, never a silent GREEN — a checker that cannot read its own membership set has no verdict to give.

  **Honestly bounded (P0), in the checker's own header as well as here.** It **cannot discover a new overclaim**: the manifest is a hand-maintained address book, so a doc that starts asserting some _other_ non-existent primitive tomorrow is invisible until a human adds the entry — **"the manifest checked out" NEVER means "the docs are true"**, the same bound the lessons index carries and the reason this is not called `check-doc-accuracy`. The probe tests **file existence**, never that a hook is **wired** in `.claude/settings.json` or that it works, so a stub flips it to "live" — deliberately, since a loud early signal beats a silent one and the remedy is the right next action either way. Substring presence is not sentence coherence. And nothing on the floor forces `npm run check` to invoke it; that wiring is a convention this file cannot enforce about itself.

  **No `SKILLS_VERSION` bump.** Every path is apparatus (`.dev/**`) or repo-meta (`package.json`, `CLAUDE.md`, `CHANGELOG.md`); the product surface is byte-unchanged. It lives in `.dev/floor/` rather than `pharn/floor/` because it guards **PHARN's own** governing docs — a user's install has no reason to check PHARN's annotations, and the dependency may only point `.dev/` → `pharn/`.

### Fixed

- **Three trusted docs stopped describing floor primitives that do not exist as running checks — and a shipped lens was named by a name it has never had.** The governing text asserted, in the present tense, protections the repo does not have. Each site was verified absent **this run** rather than accepted from the request: **no `.claude/hooks/*egress*` file exists** (three hooks, none of them egress); **no archetype-maps manifest exists** at the path `pharn/floor/validate.mjs:233` looks for, and validate's own header (`:15`) already calls CHECK 7 **"conditional — if an archetype-maps manifest exists"**, so the check has never fired; **no `/pharn-estimate` command exists** and `est_tokens` is named only in prose, emitted by no `.mjs`/`.cjs`/`.json`; **no `pharn/pharn-audits/` module exists**; and `pharn/pharn-review/` ships **22 lenses**, among them `secrets-in-code` — there is no `security-secrets`. Ten sites are now annotated `(specified; ships with the guarded surface)`, and one is a **name correction**, not a marker: a lens that ships under a different name is not a deferred primitive.

  **The rule applied, and its one exception.** Where a doc names a floor primitive that is designed but not running, its present-tense phrasing claims a protection that does not exist — the P0 disease ("written in the contract" mistaken for "therefore guaranteed") reproduced in the documents that **define** that disease. The marker preserves the design intent without asserting the protection. `THREAT-MODEL.md:91`'s `_Closed._` on fix #5 was the sharpest case: a closure status is a stronger claim than a description, and CHECK 7's own **conditional** wording contradicted it, so it now reads _"Specified; the check is conditional and no manifest exists, so it never fires."_ — stating the mechanism, not merely withdrawing the claim.

  **Sites (11 edits, 4 files).** `pharn/ARCHITECTURE.md` — the `pre-egress` primitive entry (`:41`), the §7 pre-egress-allowlist clause (`:239`, folded into the existing parenthetical rather than jammed mid-clause at `:237` where the request placed it), and the validate-contract list's fix #5 item (`:258`, matching validate's "conditional"). `THREAT-MODEL.md` — both mechanism cells naming a `pre-egress hook` (`:70`, `:71`) and the fix #5 closure status (`:91`). `LIMITS.md` — the §1a backstop citation (`:29`), `/pharn-estimate` (`:52`), the §1d re-gate claim (`:75`, where pre-write / writes-scope stay **live** and only pre-egress is marked), and §3b's `security-secrets` → **`secrets-in-code`** plus a marker on `security-review auditors` (`:108`). The `security` **griller** on that same line **does** ship (`pharn/pharn-pipeline/grillers/security/`) and was left alone. **`CLAUDE.md:256` is corrected too, and it was not in the request:** an L1 meta-doc sweep found it listing `pre-egress` as one of the three live primitives, identically to `ARCHITECTURE.md:41` — leaving it would have shipped the exact stale canon the change exists to remove.

  **This corrects documentation accuracy. It closes no threat, ships no new check, and adds no capability.** Building the `pre-egress` hook, the archetype-maps manifest, or `/pharn-estimate` is trigger-gated (P7) and explicitly out of scope.

  **A larger defect was found in the same sweep and is deliberately NOT fixed here (P7 — recorded, not smuggled in).** `LIMITS.md:28-29` and `THREAT-MODEL.md:102` are not descriptions but **backstop** claims: each strikes a claim as a limit, then points at the floor as what bounds the residual ("**Backstop (floor):** `kind: community` cannot declare trusted-write or off-allowlist egress"). Live, **both halves are empty** — the egress hook does not exist, **and** `KIND_ENUM` is read at exactly one place (`pharn/floor/validate.mjs:155`) to check that `kind`'s _value_ is an enum member; **nothing conditions any privilege on `kind: community`**. So the marker applied here leaves `:29` less wrong while it still claims a live `pre-write` backstop for a restriction no check enforces. Stating that plainly is the honest cost of scoping this change to doc-marking: **after this lands, a trusted doc still points at a backstop that does not exist on either half.** Follow-up: `community-privilege-backstop`. The P7 trigger is already satisfied — this is a verified defect, not a hypothetical.

  **The marker's own honest bound (P0).** `(specified; ships with the guarded surface)` names no artifact, no condition, and no owner, so it is **not falsifiable** — it warns a reader the primitive is not live, and in exchange asserts a schedule nothing enforces. It is an improvement on a false present-tense claim, not a guarantee, and it is not a substitute for a stated reopen trigger. Recorded because a marker that reads as a promise is the same disease one step removed.

  **Mechanism, stated rather than disguised (L19).** The three trusted docs are hook-protected: `protect-trusted-paths.cjs` denies every `Write|Edit|MultiEdit` to them (fix #2), which is why the ten edits were applied through **Bash** — a path that passes **neither** fix #2 **nor** fix #7, because `PreToolUse` hooks are not consulted at all there. They were therefore **not** declared in the plan's `## Files`: naming them would have granted Write-tool scope to three hook-protected docs, the over-declaration **L7** forbids and the exact over-grant **L18** reproduced live. The scope setter resolved **3 path(s)** — `SKILLS_VERSION`, `CHANGELOG.md`, `CLAUDE.md` — matching the approved list, checked rather than assumed (**L20**). What replaces the gate is a human wording approval, CODEOWNERS review on `main`, and a **per-edit assertion**: every substitution was required to match **exactly once** across all ten before any file was written (fail-closed), then re-verified after writing that the old string is gone and the new string present exactly once. That check exists because the grill stage raised it as a blocking-severity P6 concern — `sed` no-ops silently on a non-matching pattern, and the trusted docs are excluded from **both** formatters, so a partially-applied patch set would have been invisible at every downstream gate.

  **No formatter can touch the three trusted docs, verified rather than assumed:** they are listed in `.prettierignore` and excluded by name in `.markdownlint-cli2.jsonc`, so the two table-cell edits in `THREAT-MODEL.md` cannot trip `format:check` on realignment. `CLAUDE.md` **is** formatter-governed, but prettier's markdown `proseWrap` defaults to `preserve` and MD013 is off.

  **`SKILLS_VERSION` → `2.5.1`** — **patch**. The three trusted docs are in the bump-triggering set and prose-only edits to shipped bytes bump by the rule in `CLAUDE.md`; this is a correction/clarification to bytes that already shipped, with no contract, finding-shape, frontmatter, or command change, and nothing an install emits changes. `CLAUDE.md` is repo-meta and drives no bump on its own.

## [2.5.0] - 2026-08-11

### Fixed

- **The spec→plan chain now pins WHICH spec a plan implements, not only what that spec said — and it can finally read the field format the plan stage documents emitting.** `check-plan-spec-agree.mjs` asserted `planHash === specHash` and nothing else (its own header advertised "exactly ONE new assertion"), so a `PLAN.md` carrying the **wrong** `spec_id` with the **right** `spec_content_hash` passed the entire pipeline GREEN. The body pin proves a plan was made against _some_ current Approved spec; it never proved it was made against _the_ one the plan names, so the record was **mislabeled** and every downstream stage inherited the wrong identity. Reproduced on the live tree before anything changed: a PLAN declaring `spec_id: SOME-OTHER-SPEC` against a matching spec exits **0**. Underneath it sat a second, worse defect: the carried-field parse did **not** strip YAML inline comments, and `.claude/commands/pharn-plan.md` documents emitting `spec_content_hash: <hash> # fix #4 — carried forward; …`. A PLAN written **exactly the way the command says to write it** therefore **false-RED'd** — `spec_content_hash is not a sha256: "fdc516…385b # fix #4 — …"` — because the documented note was read as part of the 64-hex value and failed its own enum-gate. The comment defect had to be fixed **first**: a naive identity equality would have inherited it, since `<name> # carried from the Approved SPEC` never equals `<name>`. Both were reproduced before the change and re-verified after.

  **Two parts.** `stripComment()` + `readValue()` — in `check-spec.mjs`'s `parseSpec` and in `check-plan-spec-agree.mjs`'s carried-field read — treat a value-initial or whitespace-preceded `#` as a YAML comment. **The order is load-bearing:** the _quote_ is resolved **first** — a quoted scalar's interior is taken up to its closing quote and a real comment after that quote is discarded — because stripping a whitespace-preceded `#` and everything after it first would eat the closing quote of a value that legitimately contains one. Resolving the quote first is what gets **both** shapes right: a quoted value containing a hash keeps it, and a quoted value _followed_ by a note drops the note. `parseSpec` stores **every** field, not only the three this checker gates, so an unrelated quoted field must survive. `feat#3` has no preceding whitespace, is not a comment, and survives byte-exact. Second, `check-spec.mjs` gains a **`--spec-id`** mode mirroring `--hash` exactly (unreadable → 1, no frontmatter → 1, no `spec_id` → an empty line at exit 0), and the chain checker shells it for the SPEC's identity while reading the PLAN's locally — the same deliberate asymmetry the hash already uses (SPEC fields through the `check-spec` CLI, PLAN fields through the P3-local parse), so SPEC parsing stays in exactly one place (P4).

  **Two-directional, stated plainly.** The comment strip turns a template-faithful PLAN from a **false RED into GREEN** (a rescue); the identity assertion turns a PLAN whose `spec_id` genuinely disagrees with its SPEC from a **false GREEN into a correct RED**. A well-formed PLAN carries the SPEC's own id, so nothing correct newly-REDs — only a genuinely mislabeled plan does, which is the point. The strip is also a **tightening nobody asked for and everybody wanted**: `spec_id: # todo` previously parsed to the non-empty string `"# todo"` and **passed** the presence check — a spec with no real identity going GREEN — and now correctly REDs.

  **Honestly bounded (P0).** The identity check is floor — `pharn/ARCHITECTURE.md §2` primitive #3, a byte equality asking whether the PLAN's declared id is the single member of the set the SPEC defines — and it is **never** a comparison of what either name _means_: no similarity, no case-folding, no Unicode normalization, so two ids a human would call "the same feature" that differ by one byte are a RED, deliberately. The parse is a pragmatic frontmatter reader, **not** a YAML library: the closing quote is found by a plain scan, so a value containing an **escaped** quote ends at the escape rather than the real terminator, and an **unterminated** quote falls through to the unquoted path rather than fabricate an interior. No template emits either shape, and both fail toward a visibly wrong value the id/hash gates reject — never toward a silent pass. `check-spec-approved.mjs`'s `readState` is a **third** copy of the same field parse and is deliberately **left unchanged** — no template puts a comment on `state:`, and the asymmetry fails **closed** (a false RED, never a false GREEN) — so P7 supplies no trigger to widen the change; the bound is written into the module rather than quietly fixed. **[CORRECTED in 2.7.2 — the claim in this sentence was FALSE.]** The asymmetry did **not** fail closed. `readState` was **first-wins** where `parseSpec` is **last-wins**, so a frontmatter carrying `state: Approved` followed by `state: Draft` made the Approved GATE read `Approved` while validate read `Draft` — a **false GREEN**, i.e. a fail-OPEN, on the one gate whose job is to admit only human-approved intent. Only the comment-strip half failed closed; the duplicate-key half was never examined. The P7 trigger this sentence said was absent existed the whole time and was simply not looked for. See the 2.7.2 entry. A defensive empty-`specSpecId` branch was written and then **deleted rather than shipped**: mutation testing proved nothing could kill it, and analysis showed it redundant — an empty SPEC id can only equal an empty PLAN id, which the plan-side guard REDs one branch earlier. Unreachable code no test through the public surface can pin is not a safety net, and the comment now says so.

  **An adversarial pass over the fix found two defects in the fix itself, both of which its own comments had claimed were impossible.** Neither was reachable by reading the diff; both came from attacking it. **(a) The identity equality was ASYMMETRIC.** The SPEC's id crosses a stdout boundary, so the reader must `.trim()` it to drop the newline `emitSpecId` appends — but the PLAN's id was not trimmed, so a quoted `spec_id` whose value carries deliberate edge spaces kept them on the PLAN side and lost them in transport, and two **byte-identical** files REDs as an identity mismatch: a false RED of exactly the class this change exists to remove. Both sides are now trimmed, which is symmetric and cannot merge two distinct ids — pinned by a matching pair going GREEN and by `FEAT-1` vs `FEAT-2` still REDing however padded. **(b) `readCarried` was FIRST-wins while `parseSpec` and YAML are LAST-wins.** A PLAN could declare `spec_id:` twice — the right spec on line one, a different one on line two — and this checker compared the first while every other reader sees the second, so the assertion passed on an id that was not the plan's effective one. It now reads the last match, which is what makes the module's "the two never disagree on what a field is" sentence **true** rather than merely intended. **The same read governs the carried hash, and there it closes a fail-open that exists on `main` today** — reproduced both ways: a PLAN whose first `spec_content_hash` line is current and whose second, effective one is stale goes **GREEN** on `main` and REDs after this change, because the checker now compares the pin every other reader sees. That half was pre-existing rather than introduced here; it is fixed as a consequence of making the two parsers agree, and it is pinned by its own test. A third report — that the deliberate "identity before content" ordering was pinned by no test — was **exit-code-invariant** and therefore not a defect, but it was a real gap in the fixture set: a both-wrong PLAN now asserts the reader is sent to the identity mismatch and **not** to `chain BROKEN`, because telling someone their hash is stale sends them to re-plan against the wrong spec.

  **Automated review then caught a third defect, and it was in the half this change called "the one place to get right".** `readValue` skipped the comment strip entirely for a quoted scalar, so `spec_id: "FEAT-1" # note` — valid YAML meaning `FEAT-1` — parsed to `FEAT-1" # note`, keeping the closing quote and the comment. The module had **stated** that as an accepted bound rather than fixed it; stating a bound honestly is not the same as the bound being acceptable, and this one produces a false RED whenever a quoted id is annotated on one side only. Resolving the **quote first** and discarding whatever follows the closing quote gets both shapes right at once, and the remaining bounds (an escaped quote, an unterminated quote) are narrower, unreachable from any template, and fail toward a rejected value rather than a silent pass. The same pass also flagged that this file's header claimed the SPEC-side and PLAN-side parses "can never drift" — **false of the PLAN side**, which is a deliberate duplicate. The header now separates the two: shelled on the SPEC half (cannot drift), duplicated on the PLAN half (a convention tests **detect**, never a floor op that **prevents**). That conflation is the P0 disease in miniature, written by the very change that exists to remove it.

  **33 tests added, and the change is mutation-proved, not merely covered.** Sixteen mutants were applied one at a time — dropping the identity assertion, dropping the unpinned-id guard, dropping quote-awareness in each copy, dropping the comment strip in each copy, widening the comment regex two ways, failing `--spec-id` open on a missing frontmatter, removing its empty-value fallback, reverting the duplicate-key read to first-wins, removing the plan-side trim, moving the identity check after the hash compare, reversing the quote-before-comment order in each copy, and letting an unterminated quote fabricate an interior — and **all sixteen were killed**. An earlier round left one survivor: a defensive branch that proved redundant and was removed rather than papered over with a test. Line coverage rises to **96.08%** (`check-spec.mjs`) and holds at **92.44%** (`check-plan-spec-agree.mjs`), with branch coverage up from 72.0% to 80.7% and 50.0% to 59.3%. **Zero existing assertions were modified** — the GREEN line was extended after its pinned prefix rather than reworded. Two fixtures earn their own note: the `★` case uses `String.fromCharCode(27)` rather than a literal escape, because a raw control byte in a source file survives tooling badly — which is exactly how that fixture was first written wrong — and its companion pins that a `\r` inside a frontmatter value makes the **line** unparseable (JS `.` excludes `\r`), so the field reads as **absent** and REDs rather than comparing a half-read id.

  **`SKILLS_VERSION` → `2.5.0`** — **minor**, not patch. Both files are product-floor checkers in the bump-triggering set, and the defect-fixing half would be a patch on its own; but `check-spec.mjs --spec-id` is a **new invocation form documented in the checker's own usage block**, so a user's install gains surface it did not have. The bump rule's patch clause is "a correction/clarification to bytes that already shipped", and a new mode is an addition rather than a correction — under-bumping would file new functionality as a bugfix and make the version story misleading. **Non-breaking is a claim about the invocation forms, NOT about behavior, and conflating the two would be this entry's own disease.** Every existing call site keeps working unaltered — `--hash` and the bare `<SPEC.md>` validate path are the same two commands, and no contract, frontmatter, or finding shape moves, which is exactly what the bump rule's "breaking" clause covers. But "the parse is unchanged" would be **false**. `--hash` reads only `parsed.body` and the change touches frontmatter **values**, so its digest for any given file is byte-identical — pinned alongside `--spec-id` by a test running both read-only modes on one file. `validate` reads all three gated fields **through** the changed reader, so its verdict genuinely moves, in **both** directions, on any input carrying a `#` or a quote: a template-faithful trailing note goes false-RED → GREEN, and `spec_id: # todo` goes false-GREEN → correct RED. Both directions are intended and are described above; neither is a shape change, and an existing spec is affected only if it carries one of those two spellings.

## [2.4.6] - 2026-08-10

### Fixed

- **An adversarial pass over the three preceding fixes reproduced eight defects in them — one of which would have RED'd `/pharn-regress` on every product run.** The escape-exempt enum shipped in the entry below was written from the **dev** loop's artifacts alone and omitted `BUILD.md`, `SPEC.md`, `findings.json`, and the nested `lenses/<lens>/findings.json`. `BUILD.md` is the sharp case: `/pharn-build` writes it under a **separate** re-scope, and `--declared` is the plan's `## Files`, so it is **structurally never declared** — the artifact the build itself had just written was reported as "the build escaped its scope", the exact false positive that enum exists to remove, on 100% of product runs. The enum is now **derived, not recalled**: it is justified against `grep -hoE 'features/<name>/[A-Za-z0-9._-]+' .claude/commands/*.md`, and a ★ test reads that enumeration from the command files at run time and fails if any declared artifact is uncovered — so the next new artifact breaks a **test** instead of a user's pipeline. Also fixed, each with a test and each reproduced before and after: **(a)** `parseList` split `--changed` on **whitespace**, and `git diff --name-only` does not quote a space, so one real file named `THREAT-MODEL.md LIMITS.md` split into two separately-exempt tokens and `scope` exited **0** where the parent commit exited 1 — a laundered escape created _by_ the exemption (L5's input-capture boundary, reached through L16's "the remedy is itself a surface"); the separator is now comma/newline only. **(b)** `--feature` is now shape-gated to a plain slug and **refused at exit 2** otherwise; the previous comment claimed a crafted value "matches no path" while `--feature ..` in fact built `.dev/features/../` and exempted a path outside every feature directory — and the first attempt at the gate, `^[A-Za-z0-9._-]+$`, still admitted `..` because `.` is inside the character class, caught only by re-running the reproduction against the fix. **(c)** `hash-doc.mjs`'s CLI guard was a **suffix** match, so a differently-cased or symlinked `argv[1]` made it print **nothing at exit 0** — a silent empty digest its own contract forbids, and one a caller would have recorded as the pin; it now uses `import.meta.main`, the only form that also stops an importer named `*hash-doc.mjs` from being hijacked. **The honest cost of the exemption, now written into the module and both commands (P0):** a build that rewrites its own `PLAN.md` `## Files` to retroactively authorize a path it wrote is **no longer detected** — `check-plan-spec-agree.mjs` reads only `spec_content_hash`, which a `## Files` edit does not move — so this trades a false positive for a real blind spot; the deterministic remedy (diff the base and HEAD `## Files`) is named as a follow-up rather than smuggled in. Plus five documentation defects in `pharn/floor/README.md` and one in `.github/workflows/gitleaks.yml`: a check list that named **6 of validate.mjs's 8** live checks (omitting the `applies` enum and the relocated-cite gate), an ignore list missing `pharn/floor/` — mutation-proved load-bearing, since removing that exclusion turns the repo's own floor RED — and **five `../`-relative paths that resolved to nothing**, one of them _introduced_ by the resync commit that claimed every claim had been checked against live state. **`SKILLS_VERSION` → `2.4.6`** — patch.

- **`pharn/floor/README.md` — a shipped doc that had drifted six ways, resynced, with the drift-prone claim deleted rather than corrected.** It opened with "The floor is three files" against **46** non-test checkers; asserted that the content-hash primitive is "used inline by `/plan` and `/build` … **rather than as a file**", which `check-spec.mjs` had already falsified and this branch falsified again with `.dev/floor/hash-doc.mjs`; printed the pre-rename command names `/plan` `/build` `/review`; and gave `node floor/validate.mjs` / `node floor/check-structural.mjs` invocation paths that have not existed since the floor moved under `pharn/`. Every claim was checked against live state this run rather than corrected from memory. **The count is now deleted, not fixed** — the table is labeled a _reading guide, not an inventory_, and the file cites the root `README.md`'s generated `## Current state` block, which `npm run docs:check` holds to byte-equality. Correcting `3` → `46` would only have reset the clock; removing the second copy is what stops the recurrence, and it is `.dev/memory-bank/lessons-learned.md` **L20**'s reasoning (a remedy that reduces to "remember to update it" WILL fail again) applied to a document instead of a lesson. The table gains a `check-spec.mjs` row so all three `ARCHITECTURE.md §2` primitives are visibly file-backed. Every existing P0 bound in the file — checks 4 and 5 are best-effort, GREEN means "the shape is sound" and never "the architecture is right" — is preserved verbatim. **`SKILLS_VERSION` → `2.4.5`** — patch (a shipped `pharn/` doc; per the bump rule a corrected shipped-doc sentence bumps, prose-only included).

- **The DEV pipeline's spec pin was still byte-exact — the same false-drift bug, one pipeline over — and now routes through one folded hasher.** `/pharn-dev-plan` and `/pharn-dev-grill` each carried their own inline `node -e "…createHash('sha256').update(readFileSync('pharn/ARCHITECTURE.md'))…"`, and `/pharn-dev-build` described the recompute in prose. All three are byte-exact over line endings, so a `core.autocrlf=true` clone — or a Windows editor rewriting the working tree between git operations, which `.gitattributes` cannot govern — makes `/pharn-dev-build` **refuse** with "the spec drifted" on a repo where nothing drifted. Measured live: `a1c243ea…621753` (LF) versus `4cd9746d…0ec082` (CRLF) for the same file. This was found only because a completeness pass asked which surfaces the accuracy sweep had _not_ opened; the fix for the product pin had shipped while its twin defect stayed live, and the 2.4.3 entry below had scoped it away as an unbuilt follow-up (that entry is corrected in place). New `.dev/floor/hash-doc.mjs` folds `\r\n` → `\n` and prints the digest; all three stages now shell it. **Why a separate tool rather than reusing `check-spec.mjs --hash`:** that hashes a SPEC's post-frontmatter **body**, whereas the dev "spec" is the trusted doc pinned as a **whole file** — two artifacts, two tools — and the dependency may only point `.dev/` → `pharn/`, never the reverse, since a user's install ships `pharn/floor/` **without** `.dev/`. **No pin moves:** a ★ test asserts that the folded digest of the real `pharn/ARCHITECTURE.md` equals its byte-exact digest, which is exactly why every committed `PLAN.md`'s `spec_content_hash` stays valid; if that ever fails, the fold has invalidated every stored pin. **Deliberately not folded:** the `/pharn-memory-promote` canon TOCTOU hashes, where the question is "did these exact bytes change under me" and byte-exactness is _correct_. **Honestly bounded (P0):** the hash comparison is floor; that all three stages share one implementation is a **convention** — nothing prevents a future command from re-introducing an inline one-liner, and no checker detects that. **No `SKILLS_VERSION` bump** — every path is apparatus (`.dev/**` plus `pharn-dev-*` commands), which the bump rule exempts; the product surface is unchanged.

- **The regress scope check stops reporting the pipeline's own artifacts as "the build escaped its scope" — a false BLOCKING finding that fired 11 times and was hand-waved 11 times.** `check-regress.mjs scope` computes `escaped` from `git diff <base>`, which answers "what **changed** since base" — but it is reported as "what the **build** wrote". With `base = HEAD` on a working-tree dogfood those questions diverge, so every sibling stage's own artifact (`PLAN.md` written by `/pharn-dev-plan` under its own Step-0 scope, `GRILL.md` by `/pharn-dev-grill`, …) landed in `escaped` as a blocking `P0` fix#7 finding on the **correct, designed** workflow. Counted rather than estimated: `grep -rl 'L17' .dev/features/*/REGRESSION.md` returns **12** files, one of which records the class _not_ firing — **11 runs** applied the exclusion by hand. `scope` now takes `--feature <name>` and subtracts two **closed enums** (`pharn/ARCHITECTURE.md §2` primitive #3): this feature's own pipeline artifacts by **exact filename** under `.dev/features/<name>/` or `features/<name>/`, and the four hook-protected trusted docs, which `protect-trusted-paths.cjs` denies every `Write|Edit|MultiEdit` to — so the build provably did not write them. **Deliberately narrow, and mutation-tested:** exact filenames rather than a `**` glob, so a **stray** file in the feature dir is still an escape; per-`--feature`, so another feature's `PLAN.md` is still an escape; **fail-closed**, so with no `--feature` nothing is exempt on that axis; and a crafted `--feature` (`*`, `..`) widens nothing, because matching is literal `startsWith` plus exact membership, never a glob. **No silent suppression:** every exempted path is emitted in a new `escape_exempt` field, on the clean path too, so absence is never ambiguous. **L17's other suggested remedy was rejected as unimplementable, not as inferior** — deriving "written by the build" from `.pharn/writes-scope.json` cannot work, because that file is a single mutable record every stage's Step 0 overwrites, so by the time regress runs it holds the _regress_ stage's scope (verified live); it would need a durable per-build record that does not exist. This is `.dev/memory-bank/lessons-learned.md` **L20** applied to **L17**: a lesson whose only remedy is discipline WILL recur, and the _second_ occurrence is the trigger to give it a floor check — this one was 9 occurrences past due. **`SKILLS_VERSION` → `2.4.4`** — patch (`check-regress.mjs` and `/pharn-regress` are product surface; this corrects a defect in shipped bytes, adding no checker, capability, or command). The `--feature` flag is optional and the prior behavior is exactly what omitting it produces, so no existing caller changes meaning.

- **The spec content-hash no longer depends on the body's line endings, so a Windows clone stops reading as "the approved intent drifted".** `check-spec.mjs`'s `bodyHash()` hashed the SPEC body byte-exactly, line endings included, and the repo carried no `.gitattributes` — so a clone with `core.autocrlf=true` checks the body out as CRLF, the recompute diverges from the LF-authored `spec_content_hash`, and the **whole chain** REDs with "the approved intent drifted" on a repo where nothing drifted. Reproduced before the change: the same intent hashes `6808ec0e…` as LF and `989364de…` as CRLF. `bodyHash()` now folds `\r\n` → `\n` before hashing. **The fix is one function, and the chain inherits it:** `check-spec-approved.mjs` and `check-plan-spec-agree.mjs` hold **zero** `createHash` calls (verified by grep, not assumed) — they shell `check-spec.mjs` and `check-spec.mjs --hash` — so folding in the single implementation propagates without touching either wrapper, and re-implementing it in three places would have re-created the duplication the P4 centralization exists to avoid. **Honestly bounded (P0):** the hash _comparison_ is floor (content-hash, `pharn/ARCHITECTURE.md §2` primitive #2), but that no second hash implementation is ever added is **discipline** — the two new chain tests DETECT a divergent re-implementation, they do not PREVENT one. Only line endings are folded (no trailing- or interior-whitespace normalization, and a lone `\r` stays byte-exact), so two bodies can share a pin only by differing in CR bytes immediately before an LF; the stated cost is that a pure CRLF-for-LF body rewrite moves from _detected_ to _undetected_, which nothing downstream is sensitive to today (`FM_RE` and `headingsOf` already split on `/\r?\n/`). **Migration — none for this repo:** it has **zero** committed `SPEC.md`, and the fold is the identity map on an LF body, so no LF-authored pin moves and nothing in **this** repo newly REDs. **One case DOES newly RED, and it is the converse:** a spec whose `spec_content_hash` was itself computed from a CRLF working tree (`--hash` run on Windows against the file as it sits on disk, which is what `/pharn-spec` Step 5 does) was internally consistent and GREEN before, and REDs now until it is re-approved to re-pin — the remedy the RED already prints. Both directions were reproduced; the one the fix rescues is the common one — a CRLF spec carrying an LF-authored pin that was _falsely_ REDing now correctly GREENs. A new `.gitattributes` (`* text=auto eol=lf`) reinforces this at the git layer and is labeled **advisory** in the file itself: it governs only what git stores and checks out, never what an editor writes into the working tree between git operations, which is precisely why the fold — not the config — is the load-bearing half. It is inert on the current tree (git's own binary test: **1348 text / 0 binary**, zero `\r` bytes). Seven tests added: the two spellings of one body hashing identically via `--hash`, a complete Approved CRLF spec with an LF-computed pin going GREEN, a **mixed** CRLF/LF body (the half-renormalized working tree) matching the LF pin, a real **text** change still REDing as drifted, a lone `\r` still REDing, and one chain case in each of the two wrapper suites proving the delegation carries the fold. The lone-`\r` case carries two fixtures on purpose — each places the `\r` where a _wider_ fold would reconstruct the pinned body, so the pair kills both `/\r\n?/g` and `/\r/g → ""`; a single fixture that merely swapped some other character for the `\r` would RED under every fold width and pin nothing. **Scoped to the product spec pin.** At the time this landed, the dev pipeline's own `spec_content_hash` — a byte-exact, whole-file `sha256(pharn/ARCHITECTURE.md)` computed inline by `/pharn-dev-plan` — was **not** folded and still false-RED'd on a CRLF checkout. That was recorded here as a follow-up and has since been **built**: see the `hash-doc.mjs` entry above, which routes all three dev stages through one folded hasher. **`SKILLS_VERSION` → `2.4.3`** — patch (`check-spec.mjs` is a product-floor checker; this corrects shipped bytes without changing any contract or shape). `.gitattributes` is repo-meta and drives no bump; the test files are apparatus.

## [2.4.2] - 2026-08-09

### Fixed

- **Notebook edits now invoke both pre-write guards.** The shared PreToolUse matcher in `.claude/settings.json` and `enforce-writes-scope.cjs` now include `NotebookEdit` alongside `Write|Edit|MultiEdit`, matching the coverage `protect-trusted-paths.cjs` already had (including `notebook_path` extraction). **`SKILLS_VERSION` → `2.4.2`** — patch (shipped `.claude/` hook wiring).

- **Every crash in a write-guard is a bypass, so the trusted-doc guard was hardened until it fails CLOSED — eight more routes, found by attacking the FIXED version.** A second adversarial pass ran against the corrected matcher above, not the original, and raised **41 distinct findings**; after independent skeptic verification (14 rejected as inflated or pre-existing-elsewhere) the following survived and are closed here. **The governing insight is about exit codes, not paths:** an unhandled throw exits **1**, which Claude Code treats as a **non-blocking** error — the write proceeds. So a guard that crashes is a guard that allows, and three inputs made this one crash. **(1) A deleted or unreadable working directory.** `process.cwd()` throws, and it was being evaluated as an ARGUMENT — outside the `try` that appeared to protect it. Confirmed identical on the pre-change version (`7bf82bd`), so it long predates this work: **exit 1 on both**. Now exit **2**. **(2) A literal `null` (or scalar) stdin payload.** `JSON.parse("null")` returns `null` WITHOUT throwing, so the existing `try` never fired and the next property access exited 1. **(3) A pathological path.** `path.join(cur, ...missing)` spread past the argument limit throws `RangeError`; worse, resolving hundreds of thousands of segments took **minutes**, and a guard that HANGS stalls the agent as effectively as one that allows. The walk is now bounded (a protected path is three segments deep at most, so nothing reachable is given up), the join is one operation rather than a quadratic reduce, and the decision is wrapped so ANY unexpected error **denies**. A 200 000-segment path now resolves in ~220 ms, and a trusted path later in the SAME payload is still caught. **(4) A hook installed as a SYMLINK left the real project unguarded.** Node resolves a module's `__dirname` **through** symlinks, so a dotfiles/stow-style install anchored to the dotfiles checkout. Both the symlink-resolved location and the **as-invoked** path (`process.argv[1]`) are now guarded roots — deliberately NOT cwd, which would re-introduce the over-block this whole change exists to remove. **(5) A DANGLING symlink could CREATE a protected file.** The header claimed a broken link "can only create a new file at a missing path — it cannot reach an existing trusted doc"; true, and beside the point, because `docs/CODEOWNERS` **not existing yet** is exactly when creating it with attacker-chosen content matters. A dangling link's target is now pushed back onto the resolution queue **segment-wise** rather than adopted whole — adopting it whole left the prefix un-canonicalized (`/var/…` vs `/private/var/…`) and the match silently missed, which is how the first attempt at this fix passed review and failed the test. Hops are bounded, so a self-referential link terminates. **(6) A HARD LINK reached a trusted doc's bytes.** A hard link has no link to resolve, so realpath returns the alias unchanged. Protected files carrying a second link (`nlink > 1`) now contribute their `dev:ino` to a set the target is checked against; in the normal case that set is empty and costs nothing. **(7) `.claude/settings.local.json` was not in the control surface** — a real, loaded settings file that can wire or override the very hooks being guarded, present in this repo at 15 KB. Added to the hook, to `CONTROL_SURFACE` in `set-writes-scope.cjs`, and to the third copy in its test, so the ✧ cross-copy agreement guard still pins all three. **(8) Trailing-dot/space spellings.** Windows strips them, so `LIMITS.md.` opens `LIMITS.md` there; they are now folded away. On POSIX those are distinct names, so this is another deliberate over-block in the safe direction. **Two corrections in the other direction, because a guard that over-blocks is also broken.** `PHARN_PROTECTED` now keeps its **full** original contract — a bare name matches that basename at any depth AND a slashed entry matches as a path fragment at a boundary — rather than the half-restoration above; narrowing it silently stripped protection from an operator's existing config, failing **open** with no error. And a relative payload path is now resolved against **cwd** for the literal check as well, which is what a relative path means; resolving it against the guarded root denied a user's own `features/pharn/CONSTITUTION.md` when the agent ran from `features/`. **Honest bounds, unchanged or newly stated (P0).** Bash-tool writes still bypass `PreToolUse` entirely — the largest hole by far, and untouched by any of this. PHARN **vendored at a subpath** of a larger project is still unguarded, because Claude Code loads `.claude/` from the project root, so the outer hook runs and the inner copy is just files to it. A symlink inside a guarded root pointing OUT of it is allowed, deliberately. The Unicode fold is close to, but not provably identical with, the filesystem's own equivalence: it covers the spellings **demonstrated** to open a trusted file here, and demonstration is not proof. The case fold and the dot/space strip both over-block on filesystems where those spellings name distinct files — reproduced on a real case-sensitive APFS image with distinct inodes, not argued from a table.

## [2.4.1] - 2026-08-09

### Fixed

- **The trusted-doc guard now matches by repo-relative path, anchored to its own location — and four ways that could have gone wrong were found by attacking it, not by reading it.** `protect-trusted-paths.cjs` matched a bare basename or a path fragment, so it enforced **trust-by-location using a name**. Both halves were reproduced on the live tree before a byte changed: `app/user-docs/ARCHITECTURE.md` → **exit 2 (over-block)** — in a user's install PHARN denied the user's own docs while its real docs live at `pharn/ARCHITECTURE.md` — and `pharn/constitution.md` → **exit 0 (under-block)**, a case variant that opens the very same bytes on the macOS/Windows default filesystem. **The premise the build request started from was checked and found already fixed:** `isProtected()` no longer used `includes()` (**1.1.x**, below, replaced it with `matchesFragment()`), so the `.mdx`/`.bak` substring rows were green and the remaining defect was elsewhere. **Measurement also refuted the request's scoping of that defect:** it attributed the over-block to the basename branch alone, but `docs/THREAT-MODEL.md` was measured at **exit 2** today — the _fragment_ branch over-blocks at depth on its own, which is why the fix removes **both** branches rather than qualifying the entries. **The matcher is now exact membership over the target's repo-relative path** (`pharn/ARCHITECTURE.md §2` primitive #3), with the entries anchored to their real locations (`pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md`) and `CODEOWNERS` carried at **all three GitHub-recognized locations** (root, `.github/`, `docs/`) — the one entry whose protection is location-**class** rather than path-specific, since GitHub honors whichever exists. **Four defects in that design were caught by a six-lens adversarial sweep that ran the candidate rather than reading it, and each is recorded because the first draft shipped none of these guards.** **(1) CRITICAL — a case-varied root prefix unprotected every entry.** `path.relative()` compares case-**sensitively**, so `/users/…` where the root is `/Users/…` relativized to a `../` escape and read as "outside the repo" — while naming the same file. Measured: **candidate 0 / `main` 2 on all 11 protected paths.** The prefix strip is now a folded comparison. **(2) CRITICAL — anchoring to cwd disabled the guard entirely from any subdirectory,** and left PHARN unprotected when installed at a subpath of a larger project. The header's claim that repo-relative matching "introduces no assumption this hook did not already make" was simply **false**, and is struck: resolving a relative write path against cwd and relativizing the _protected set_ against cwd are not the same operation. `ROOT` is now derived from the hook's **own location** (`<root>/.claude/hooks/<this file>`), which cannot drift from the files it guards; cwd is used only where the payload actually means it. **(3) CRITICAL — a bare `toLowerCase()` is simple case mapping, while the filesystem compares with full case folding.** `ſ` (U+017F) lowercases to itself, yet `pharn/CONſTITUTION.md` was confirmed to **read the real `pharn/CONSTITUTION.md`**. The fold is now `toUpperCase().toLowerCase()` plus NFC, which maps `ſ`→`S`, `ß`→`SS`, `ﬅ`→`ST`. This one was **pre-existing on `main`**, so it is a hardening rather than a regression fix — but leaving it while the header advertised "case-folded" would have been the exact overclaim P0 forbids. **(4) HIGH — `..` after a symlinked directory escaped the exact match.** `path.resolve()` collapses `..` **lexically**, which is not what the kernel does: with `a -> pharn/sub`, `a/../ARCHITECTURE.md` collapses to an unprotected path while `open()` reaches `pharn/ARCHITECTURE.md`. Demonstrated by **performing the write and reading `PWNED` back out of the trusted doc** — and note `fs.realpathSync()` cannot expose this, because it resolves `..` lexically too. `resolveWriteTarget()` now canonicalizes **one segment at a time**, taking `..` from the real parent of the resolved prefix. `main` blocked this vector incidentally via the basename branch, so removing that branch is what exposed it — a genuine regression, caught before it shipped. **`PHARN_PROTECTED` keeps its original meaning for a bare name** (basename at any depth); only a slashed entry is an exact path. Narrowing it uniformly would have silently stripped protection from an operator's existing setting — a guard failing **open** on a config it used to honor — and unlike the default set there is no over-block victim, because an env entry is an explicit opt-in. **`pharn/floor/README.md` is corrected in the same commit**, because this change **inverts** its copy-pasteable self-test: it documented `file_path: "CONSTITUTION.md"` → "exit 2, denied", which is now exit 0. All three lines of that block, and CLAUDE.md's two, were re-run and confirmed to match their stated exits. **Tests: 24 → 106** (line coverage on the hook **94.9%**, branch **82%**, functions **100%**), restructured around a **sandbox-install harness** — the hook installed at `<sandbox>/.claude/hooks/` — since the guarded root is now the hook's own location and no cwd trick can simulate a different one. The install is a **symlink** rather than a copy, for two reasons: a copy is a different file, so every sandbox assertion would exercise and report coverage for a duplicate instead of the script that ships; and the symlink is the more faithful fixture, being exactly the dotfiles-install shape. Mutant sandboxes are still copies, and the helper asserts it is editing a plain file before writing — writing modified source through the symlink would overwrite the real hook. **Measured against ten rejecting mutants before being trusted (L4 — an authored assertion passes by construction):** re-introducing the basename branch, dropping the fold, reverting to a bare `toLowerCase()`, anchoring the roots to cwd, restoring the lexical `path.resolve`, dropping the as-invoked root, refusing to resolve a dangling symlink, dropping the inode test, dropping the non-object payload guard, and dropping the trailing dot/space strip. Each flips exactly the case it is paired with; all green when reverted. **Four committed tests were re-anchored, and that is a real behavior change, not bookkeeping:** root-level `CONSTITUTION.md`/`ARCHITECTURE.md` are no longer protected, which is correct here (neither exists; both live under `pharn/`) but means a future root-level copy must be declared explicitly. **Honest bounds (P0), stated rather than hidden.** The fold is **fail-safe, not free**: on a case-**sensitive** volume `pharn/constitution.md` is a genuinely different file that this guard will nonetheless deny — the one place this change **widens** rather than narrows, accepted because under-blocking the real doc on the two commonest platforms is worse. The fold is close to, but not provably identical with, the filesystem's full case folding; it covers the spellings demonstrated to open a trusted file here, and is not a proof that no exotic equivalence remains. **The residuals this first pass left standing were then closed — see the hardening entry below; the one that remains is the largest:** Bash-tool writes bypass `PreToolUse` hooks entirely, and no amount of path matching narrows it. The ✧ cross-copy agreement guard in `set-writes-scope.test.cjs` still holds, now over **five** `.claude/` entries — and three new ✧ **derived** tests read `DEFAULT_PROTECTED` from source so a later entry is exercised the day it lands, one of them pinning the F4 invariant itself (no declared entry may over-block its own basename at depth). **`SKILLS_VERSION` → `2.4.1`** — a **patch** bump: `.claude/` hook bytes and `pharn/floor/README.md` are product surface, but the change corrects bytes that already shipped. Every real trusted doc still denies, direct or through a symlink; a user gains the ability to edit their own `docs/ARCHITECTURE.md`, and nine routes onto PHARN's trusted docs close. **One path IS newly denied, and saying otherwise would be the overclaim this repo exists to prevent:** `.claude/settings.local.json` (below). An install whose workflow had the agent edit that file will now be blocked — deliberately, since it wires the very hooks being guarded, and the remedy is the same as for any control file: a human edits it outside the agent loop. The hook edit went through **Bash**, because the live guard protects this very file — the declared residual (**L19**), replaced not by a gate but by the reviewed diff, the reproduction ordering, and the 106 tests.

## [2.4.0] - 2026-08-09

### Fixed

- **The five plan-side grill-scanners now ship where the grillers can reach them, and CHECK 8 is what forced it.** `scan-plan-{secrets,pii,migrations,observability,i18n}.mjs` lived **only** in `.dev/floor/`, but the security, privacy, migrations, observability and i18n grillers under `pharn/pharn-pipeline/grillers/` invoke them as their Layer-1 deterministic sub-check — and a user install ships `pharn/` **without** `.dev/`. Reproduced before any byte moved: all five present under `.dev/floor/`, none under `pharn/floor/`, while `pharn/pharn-pipeline/grillers/security/security.md:107` instructs running `.dev/floor/scan-plan-secrets.mjs` over the PLAN. In every install that command ENOENTs, so each of those five grillers had its strongest deterministic sub-check silently degrade to Layer-2 judgment — the same defect **2.3.4** closed for the `scan-code-*` lenses, on the half its existence gate deliberately could not see. **The fix is to make the twin exist,** mirroring the `scan-code-*` precedent (confirmed live as a pure move: those files are in `pharn/floor` only, never duplicated in `.dev`). **(A)** `git mv` of all ten files — the five scanners **and** their five `.test.mjs` — from `.dev/floor/` to `pharn/floor/`, every one recorded `R100` (100% similarity, history preserved), leaving `.dev/floor/` with zero `scan-plan-*`. **(B)** The **existence-gated** cite rewrite, byte-identical in rule to 2.3.4's, re-run over the discovered `pharn/pharn-*` canon across `.md` and `.json`: **44 references across 24 files** became `pharn/floor/…`. **This is exactly the composition 2.3.4's boundary test predicted, and both halves were captured as an ordering.** With the files moved but the cites untouched, `node pharn/floor/validate.mjs .` → **exit 1, `FLOOR: RED — 29 finding(s)`, all 29 `P6/floor-path` across 24 files and no finding of any other rule_id**, so the RED is fully attributable; after the rewrite → **exit 0, `FLOOR: GREEN — 36 capabilities checked`**. The RED count was **predicted deterministically before the move** (29, not 44 — CHECK 8 records one finding per stale checker **per file**, not one per occurrence) and checked against the observed value, because recording a number that was never expected cannot distinguish a complete move from a partial one (`.dev/memory-bank/lessons-learned.md` **L16**). The transform is a Node script rather than `sed -i`, for the BSD-vs-GNU reason **L16** names. **The existence gate again did the discriminating work, and its ghost half is untouched:** `scan-plan-{a11y,comprehension,docs,error-handling,performance}.mjs` are named in griller prose as scanners that are **not built** and are resident nowhere, so their **5** canon cites were left exactly as written — no name list, no exception, just the absent file. **`pharn/floor` is CHECK 8's blind spot, so its cross-references were fixed by hand and the bound is stated.** That directory is excluded because an intentional dev-reference and a stale one are byte-indistinguishable there, so nothing would have flagged a miss. Every `.dev/` occurrence in the eleven affected files was first proven to target a file now resident at `pharn/floor/`, then repointed: **26 references** — the ten relocated files' own line-2 self-headers, `Usage:` strings and sibling cites (including `scan-plan-secrets.mjs`'s cite of `count-grillers.mjs`, which already lived only at `pharn/floor/`), plus the **2** in `scan-code-secrets.mjs`'s header naming its plan-side twin. The diff there is comment-only and was audited line by line. Note the build request's count of four for `scan-code-secrets.mjs` was two on the live tree, and `scan-code-secrets.test.mjs:4` names `scan-plan-secrets.test.mjs` as a **bare filename, not a path**, so it stayed true and was left alone. **The 2.3.4 boundary test inverts, which is the point.** It asserted a `.dev/floor/scan-plan-secrets.mjs` cite was GREEN _because there was no twin_; that premise is now gone, so it becomes the positive proof the loop closed — a griller cite of the old path is **RED**, naming both paths and the `now lives at pharn/floor/scan-plan-secrets.mjs` message — and it is the regression guard against re-introducing a dead scan-plan cite. The **ghost** test keeps its assertion untouched (a scanner resident nowhere is still not flagged); only its trailing comment, which described F2 as pending, was corrected to record the one gate with two outcomes. The CHECK 8 **integration** assertion that the real tree is GREEN is the net that would have caught an incomplete rewrite. **`.dev/features/**` was deliberately left alone** — **188** trail references across 64 files record where each scanner lived **when its griller was built**; rewriting them would falsify the record, and the precedent is the `scan-code-*` move, which left **253** such refs standing in `.dev/` against 126 pointing at `pharn/floor/`. Verified byte-unmodified. **Honest bounds (P0).** The floor proves the cited file **exists** and that each scanner runs at its new home; it never proves a griller body invokes it correctly, nor that any griller ran — "the scanner ships" is not "the sub-check fired". The `pharn/floor` hand-fixes are advisory: a future stale ref landing there stays silent, unchanged from 2.3.4. `git mv` and the two Node scripts run through Bash and therefore **escape the fix #7 writes-scope entirely** — the same declared residual (**L19**), replaced not by a gate but by the RED→GREEN ordering, the audited diffs, and the tests. **Also corrected, because the move falsifies them:** `CLAUDE.md`'s dev/product boundary sentence listing `scan-plan-*` among the dev-only checkers and its CHECK 8 note claiming the check "structurally CANNOT flag the five `scan-plan-*` scanners resident only in `.dev/floor/`"; `pharn/floor/validate.mjs`'s own CHECK 8 header, which made the same claim (a **comment-only** edit — the executable body is untouched, so the check's behavior and coverage are provably unchanged); and the griller inventory line below, whose `.dev/floor/scan-plan-*.mjs` cite sat beside a `count-grillers.mjs` that already lived only at `pharn/floor/`. **`SKILLS_VERSION` → `2.4.0`** — a **minor** bump, where 2.3.4 took a patch. That change corrected already-shipped bytes; this one **ships five checkers that were never in an install**, so `pharn/floor/*.mjs` gains five files and the grillers' Layer-1 works for a user for the first time — a newly shipped capability by the rule in `CLAUDE.md`. **Nothing an existing install newly-REDs:** installs strictly _gain_ working sub-checks and the rewritten cites resolve. The five `*.test.mjs` moved with their scanners and stay in the gate (`npm test` globs both `.dev/**` and `pharn/**`, so the move is gate-neutral); they are apparatus and drive no bump. **Adjacent and deliberately not taken:** a griller→scanner map analogous to `lens-scanner-map.json` (grillers cite the scanner in-body and continue to); `pharn/floor/README.md`'s `node floor/…` examples; and the `.dev/floor/validate.mjs` comment in `.github/workflows/gitleaks.yml` — each its own axis.

## [2.3.4] - 2026-08-08

### Fixed

- **The capability canon now names the floor at its real location, and a deterministic path check keeps it there.** When the checkers moved `.dev/floor/` → `pharn/floor/`, **1.1.2** (below) rewrote their own line-2 self-headers but **not the capability bodies that invoke them**, so a lens's or griller's Layer-1 sub-check still named the old directory. Reproduced before any byte changed: `node .dev/floor/scan-code-injection.mjs pharn/pharn-review/injection/injection.md` → `Error: Cannot find module`, while the same command under `pharn/floor/` runs and returns `{"found":false,"hits":[]}`. This is **not** a standalone-only defect: `/pharn-review` resolves its slice through `pharn/floor/lens-scanner-map.json` (correct path) but hands the subagent the **lens body** as the procedure to apply, so the strongest deterministic sub-check silently degraded to Layer-2 judgment **inside** the review, and the audit record cited a command that had errored. The 36 semantic-judge `evals/expected/*.json` fixtures cited the scanners by the same dead path. **One axis, two parts.** **(A)** An **existence-gated** rewrite, the exact 1.1.2 rule, scoped strictly to the capability canon — `pharn/pharn-{contracts,core,pipeline,review}` — over `.md` **and** `.json`: a literal `.dev/floor/<B>` becomes `pharn/floor/<B>` **iff** `pharn/floor/<B>` exists as a real file. **322 references across 134 files** (contracts 1, core 2, pipeline 13, review 118); the transform is a Node script rather than `sed -i`, because a BSD-vs-GNU split in the remedy would silently corrupt 134 files (`.dev/memory-bank/lessons-learned.md` **L16**). **(B)** **CHECK 8** in [`pharn/floor/validate.mjs`](./pharn/floor/validate.mjs): scanning that same canon, RED any `.dev/floor/<name>.{mjs,cjs}` occurrence for which `pharn/floor/<name>` exists — a deterministic path check (`pharn/ARCHITECTURE.md §2` primitive #3: an anchored basename regex whose verdict is gated by a filesystem `existsSync`), no model judgment, one finding per stale checker per file. **The canon scope is DISCOVERED, not hardcoded:** `CANON_DIRS` is computed at run time as every `pharn/pharn-*` directory under the target, sorted. A fixed `["pharn-contracts", "pharn-core", "pharn-pipeline", "pharn-review"]` would have covered today's tree exactly — and structurally missed the next module: the roadmap's `pharn-audits` / `pharn-stack-<fw>` / `pharn-skills-*` were never arguments to the walk, so a dead `.dev/floor/<twin>` cite landing in one would be invisible to the very check whose purpose is to stop silent floor-rot, and no rewrite would have run over it either. The `pharn-` prefix is what excludes `pharn/floor` and the trusted `pharn/*.md` — the **same predicate** `.claude/hooks/enforce-writes-scope.cjs`'s `DEFAULT_SAFE_SET` already partitions the product surface on, not a second rule invented here. Two guards mirror `walkExts`'s own, because the enumeration now reads `<target>/pharn` one level ABOVE it: a missing `pharn/` and a per-entry `statSync` failure each degrade to a **skip**, never a crash — a validator that throws converts a RED-or-GREEN verdict into no verdict at all, which is strictly worse than either. `.sort()` is load-bearing rather than cosmetic: findings are emitted in loop order and `readdirSync`'s order is filesystem-dependent, so an unsorted scope would make one tree report in different orders on different machines — a determinism regression in a floor primitive (`pharn/ARCHITECTURE.md §2` #3). Sorted, the discovered scope is **behaviorally identical** to the four-name list on the current tree, verified rather than asserted: a fixture carrying a stale twinned cite in each of the four modules produces **byte-identical reports, in the same finding order**, from the old and new checkers. **Why both, rather than the rewrite alone:** 1.1.2's hand-fix was a discipline-only remedy and the canon rotted anyway, which is exactly the second occurrence **L20** names as the trigger to give a class a floor check instead of another reminder. **Reproduced as an ordering, both captured:** with CHECK 8 added but the rewrite not yet applied, `node pharn/floor/validate.mjs .` → **exit 1, `FLOOR: RED — 210 finding(s)`, every one of them `P6/floor-path` and no finding of any other rule_id**, so the RED is fully attributable; after the rewrite → **exit 0, `FLOOR: GREEN — 36 capabilities checked`**. **The existence gate is what makes a bulk transform safe here, and its two deliberate blind spots are load-bearing:** the five `scan-plan-{secrets,pii,migrations,observability,i18n}.mjs` grill-scanners resident **only** in `.dev/floor/` have no twin, so neither the rewrite nor CHECK 8 touches their 44 canon cites — that is a **separate defect** (they are dead in every install, which ships `pharn/` without `.dev/`), fixed by **relocating** the file rather than rewriting the cite, and deliberately isolated here as the only remaining `.dev/floor/` cites in canon; and the five `scan-plan-{a11y,comprehension,docs,error-handling,performance}.mjs` named in griller prose as scanners that are **not built** are resident nowhere, so they are untouched too. A test pins the no-twin case as a decision, not an oversight — and composes forward: the day a `scan-plan-*` gains a `pharn/floor/` twin, CHECK 8 immediately flags its now-stale canon cites and forces the same rewrite. **CHECK 8's scope is positive (the capability canon), not "target minus `EXCLUDE_SEGMENTS`", and that was settled on measurement rather than preference.** Four checkers — `check-provenance`, `check-lessons-index`, `gen-lessons-index`, `lessons-index-core` — exist in **both** floors as deliberate copies, and the root meta-docs correctly document the **dev** one; a target-wide walk would therefore have reported **31 correct sentences as drift** (9 cites in `CLAUDE.md`, 21 in `CHANGELOG.md`, 1 in `docs/lessons-index.md`). Canon cites **zero** copy-pair files, which is precisely what makes both the rewrite and the check safe there. `EXCLUDE_SEGMENTS` is applied on top as defence-in-depth. **`pharn/floor` itself is excluded and was left entirely untouched by part A** — it holds the **intentional** dev-references (`check-loop-record.mjs:26`'s "deliberately does **NOT** import them: `.dev/` is … excluded wholesale at packaging", and five in `lessons-index-core.mjs`/`.test.mjs` recording that this copy is "A DELIBERATE SECOND COPY of `.dev/floor/lessons-index-core.mjs`" and that the cross-copy agreement pin lives on the dev side) plus the deliberately-RED fixtures; rewriting any of them would make a file cite itself or convert a true statement into a false one. Verified: `git diff` under `pharn/floor/` shows **only** `validate.mjs` and `validate.test.mjs`, and all six dev-refs are byte-intact. **Honest bounds (P0), stated in the check's own header.** A genuinely stale ref that later appears **inside** `pharn/floor` is **not** caught — an intentional dev-ref and a stale ref are byte-indistinguishable there (both are `.dev/floor/<twin>`), so that surface stays a manual concern exactly as after 1.1.2. CHECK 8 proves the cited file **exists**; it never runs it, checks its arguments, or knows the body invokes it correctly. And it is **GREEN when the target has no `pharn/floor` at all** — correct (no floor → no twin → nothing is stale-by-relocation) but a fail-open path, named rather than left under the word "un-repeatable". **Audit of the bulk transform.** Rather than rely on reading 322 diff lines, the substitution was **inverted** on every rewritten file and compared against the original: **134/134 files' only delta is the path substitution; zero files carry any other change.** The transform is idempotent (a second run rewrites 0 references in 0 files, proving the gate did not over-reach) and every rewritten `.json` re-parses. The script runs through Bash and therefore **escapes the fix #7 writes-scope entirely** — the same declared residual 1.1.2 relied on (**L19**); it is declared in the plan's `## Files` rather than pretended gated, and what replaces the gate is the inversion proof, the tests, and the RED→GREEN ordering above. **Sixteen tests** added to [`pharn/floor/validate.test.mjs`](./pharn/floor/validate.test.mjs) (6 → 22; line coverage on `validate.mjs` **92.62%**, branch **90.24%**): the relocated-twin RED naming both paths, the no-twin boundary, the ghost case, an intentional dev-ref inside `pharn/floor`, a root meta-doc citing a copy-pair's dev copy, a `.json` eval judge (validate's capability walk is `.md`-only, so CHECK 8 does its own `.md`+`.json` collection), the live-path GREEN, per-file finding dedup, and an integration assertion that the real rewritten tree is GREEN — plus **seven** pinning the discovered scope: a module outside the old four (`pharn-audits`) **is** scanned, a target with **no `pharn/` at all** does not throw, the `pharn-` prefix excludes `pharn/floor`, a **non-module sibling directory** under `pharn/` is not scanned, a `pharn-*`-named **file** is not treated as a module root, and a broken symlink at **each** enumeration level degrades to a skip while the rest of the scope still reports. The non-module-sibling case is the one that carries the prefix filter's weight — the `pharn/floor` case cannot, because `EXCLUDE_SEGMENTS` catches that one on its own, so a prefix-filter mutant survives it. Coverage **rose** (91.36% → 92.62%) although the change made one previously-covered branch cold: `walkExts`'s `readdirSync` `try`/`catch` was reached incidentally by fixtures lacking one of the four hardcoded dirs, and a discovered scope only ever hands it directories that exist; the two symlink tests more than repay it by reaching three `statSync` guards no fixture had exercised. **Measured against ten mutants before being trusted (L4 — an authored fixture passes by construction), every count re-run against the final 22-test suite rather than carried over:** inverting the existence gate (10 failures), dropping `.json` from the collection (1 — exactly the judge test), suppressing the finding emission (7), injecting a twinned stale cite into real canon (1 — exactly the real-tree assertion), reverting the enumeration to the hardcoded four (1 — exactly the `pharn-audits` test, which is **why** that test asserts on the finding **message** and not merely on a non-zero exit: a scope that never visits the module emits no finding at all), removing the enumeration's `try`/`catch` (7), removing the `pharn-` prefix filter (1), and removing the per-entry `statSync` guard (1); green when reverted. **Two mutants deliberately survive, recorded rather than papered over.** Removing `.sort()` changes nothing any test can see, because the filesystems in play here already enumerate in name order — its effect was demonstrated **out of band** by forcing a reversed enumeration (sort present → alphabetical findings; sort removed → reversed), so it is a portability guard whose value no test on this machine can express, and claiming a test "pins" it would be exactly the advisory-dressed-as-deterministic move P0 forbids. Removing the `isDirectory()` guard is likewise invisible, because `walkExts`'s own `readdirSync` `try`/`catch` produces the same silence when handed a file path; the guard is kept for explicitness — the scope should be directories by construction, not by an exception downstream — and the test says plainly that it pins the observable **behavior**, not the guard. **`docs/capabilities/**` and `docs/lessons-index.md` are byte-identical** and `npm run docs:check` is GREEN — regenerated anyway to prove it rather than infer it. The catalog renders frontmatter plus the H1 tagline, never capability bodies, and canon carries no `.dev/floor` cite in either; the 37 `.dev/floor/gen-capability-catalog.mjs` cites in `docs/capabilities/` are that generator's own GENERATED header, correctly dev-resident and twinless. **`SKILLS_VERSION` → `2.3.4`** — a **patch** bump: the canon bodies, the eval fixtures and `validate.mjs` are all product surface, but the dominant change corrects bytes that already shipped (dead path → live path) and part (B) adds a check to the **existing** `validate.mjs` rather than shipping a new standalone checker. Decisively, **nothing an existing install newly-REDs**: CHECK 8 scans PHARN's own shipped canon, which this makes clean, and a user does not author `pharn/**`. `validate.test.mjs` is apparatus and drives no bump. **Adjacent and deliberately not taken here:** relocating the five `scan-plan-*` scanners to `pharn/floor/`; `pharn/floor/README.md`'s `node floor/…` examples; and the `.dev/floor/validate.mjs` comment in `.github/workflows/gitleaks.yml` — the same relocation-staleness class, the latter two outside `pharn/**`, each its own axis.

## [2.3.3] - 2026-08-07

### Changed

- **Deferred `product-capability-catalog` — the capability catalog stays dev-apparatus, and the decision is now on record** ([`CLAUDE.md`](./CLAUDE.md), and in full in [`.dev/features/product-capability-catalog/PLAN.md`](./.dev/features/product-capability-catalog/PLAN.md)). The third and last of the three dev→product ports — after `product-memory-promote` (#117) and `product-lessons-index` (#118) — was **planned and declined at its P7 gate**, so nothing was ported: `capability-catalog-core.mjs` and its generator + drift checker remain under `.dev/floor/`, and no equivalent ships under `pharn/floor/`. **This entry IS the increment** — a deliberate, reasoned "no" recorded durably, rather than a silent non-decision that the next contributor would have to re-derive. The gate question was _"do PHARN users author their own `role:`-bearing capabilities?"_, it was put to the human explicitly at the plan halt, and the answer was **defer**. **Five pieces of live evidence, each read this run (P6):** (1) the population is **zero, not small** — `README.md` states there is _"no installer, no versioned release you can drop into your own repo"_ and _"Please do not adopt it yet"_, so no installed user exists who could author a capability; (2) the product surface **already takes this exact posture for the adjacent case** — `/pharn-verify` ships _"The verifier plug-in slot (defined here; ZERO verifiers authored — P7)"_ and defers its live runner until _"the first verifier lands"_, so shipping a **catalog** of user-authored capabilities while deliberately deferring the **runner** for those same capabilities would be internally inconsistent; (3) **nothing promises it** — `product-capability-catalog` was named as a follow-up nowhere in the repo, and unlike `product-memory-promote` (which closed a real `ARCHITECTURE §5` gap) no trusted doc claims a product catalog; (4) the **`product-lessons-index` precedent removes the catalog's only reader** — that port fixed product-derived output at the **gitignored, disposable `.pharn/` cache**, which is justified there because `/pharn-plan` **machine-reads** the index, whereas a capability catalog is human-readable prose with **no machine consumer**, so the consistent answer gives it no reader at all and the inconsistent answer (`docs/`) claims a directory PHARN does not own; (5) **the drift guard would have no invoker** — a user repo has no `npm run docs:check`, and an unreachable guarantee is an argument for deferring rather than a detail to settle later. **Reopens when** the first `role:`-bearing capability is authored outside PHARN's own shipped surface — a real event, the same trigger `/pharn-verify` already names, which is what P7 requires before this is planned again. **Honest scope (P0):** that the deferral is recorded is **advisory** — no floor op checks that a decision was written down, or that the written reasoning is the real reasoning; these are bytes a human reads. This increment adds **no** floor primitive, no capability, no `rule_id`, and no eval — P1 binds Capabilities, and none was created. **`SKILLS_VERSION` is NOT bumped:** no product-surface byte changed (the bump-triggering set is the `pharn/` tree, `pharn/floor/*.mjs`, the four trusted docs, and the `pharn-*` `.claude/` surface — all untouched); `CLAUDE.md` and `CHANGELOG.md` are repo-meta. Note that "no bump is required" is itself **advisory** — verified live, **no checker reads `SKILLS_VERSION`**; the bump rule is documented human discipline, not a floor primitive.

### Fixed

- **Closed F4 suffix over-match in `protect-trusted-paths.cjs`.** `isProtected()`'s fragment branch used bare `includes("/" + fragment)`, so resolved paths like `.claude/settings.json.bak` falsely matched `.claude/settings.json` (and likewise `features/CONSTITUTION.md.bak` for trusted docs). Replaced with `matchesFragment()`, which requires the character after a fragment hit to be end-of-string or `/`; four regression tests pin suffixed `.bak` paths stay allowed while the control surface and trusted-doc denies are unchanged. **Residual (P0):** matching is still case-sensitive. **`SKILLS_VERSION` → `2.3.3`** — patch (shipped hook).

- **`pharn/floor/README.md` names the fix #7 runtime hook and separates it from the setter.** The guard-inventory table and "Wire the write-guard hooks" section now list `enforce-writes-scope.cjs` alongside `protect-trusted-paths.cjs`, with confirm-it-works examples for scope denial; the setter's authorization refusal (`set-writes-scope.cjs`) is distinguished from the hook's per-write enforcement. **`SKILLS_VERSION` → `2.3.2`** — patch (shipped product doc).

- **The pre-write guards now protect their own control surface.** `.claude/settings.json` (which wires both `PreToolUse` hooks) and the three hook scripts were writable by the Write/Edit/MultiEdit tool. Reproduced before any code changed: a `## Files` entry in an untrusted `PLAN.md` made [`set-writes-scope.cjs`](./.claude/hooks/set-writes-scope.cjs) emit a scope containing them (exit 0), [`enforce-writes-scope.cjs`](./.claude/hooks/enforce-writes-scope.cjs) then permitted the write under that scope (exit 0), and [`protect-trusted-paths.cjs`](./.claude/hooks/protect-trusted-paths.cjs) permitted it too (exit 0 — the paths were not in `DEFAULT_PROTECTED`). Because each hook is invoked as `node .claude/hooks/<file>` and re-read fresh on every tool call, overwriting one disarmed that guard on the **next write of the same session** — the "guarding the guard" control already applied to `CODEOWNERS`, stopped one file short. Closed at **both** deterministic pre-write path checks, one axis: **(A)** `protect-trusted-paths.cjs`'s `DEFAULT_PROTECTED` gains the four control paths as `.claude/`-qualified **path fragments** — never bare basenames, which `isProtected()`'s last-segment branch would have widened onto a user's own `settings.json`, `.vscode/settings.json`, or `src/enforce-writes-scope.cjs` (pinned by negative tests); and **(B)** `set-writes-scope.cjs` **refuses** (exit non-zero, writes nothing) to emit a scope naming any of those same four paths unless the operator passes the new `--allow-claude-dir` argv flag — which no declared file can set for itself. The refusal is layered **after** the existing empty-scope fail rather than replacing it, and normalizes each entry lexically (`./`, `a/../`, backslashes) so a re-spelling cannot walk past exact membership. **The refusal set was narrowed on measurement, not on preference:** refusing every `.claude/` path — the literal reading of the reported defect — would have rejected **46 of 104** setter-parseable historical `.dev/features/*/PLAN.md` files, because `.claude/commands/*.md` is where the methodology itself is authored; the four-file control surface rejects **6**, each an increment that genuinely edits a guard. `.claude/commands/**` and the hooks' own `*.test.cjs` are therefore deliberately **outside both** the denylist and the refusal set, and tests pin that they stay writable. **Honest bounds (P0), stated in both file headers:** Bash-tool writes bypass `PreToolUse` hooks entirely, so `cat > .claude/settings.json` still works — identical in kind to the standing residual for the trusted docs, and **not** closed here; and the setter's check is **lexical**, so a symlink declared in `## Files` that resolves onto a control file is not caught there — `enforce-writes-scope.cjs` realpaths the write target and denies it as out of scope, and `protect-trusted-paths.cjs` realpaths and denies these four outright, so the setter is the loud **early** failure, not the last line. The two guards stay independent: neutering the setter's refusal still does not make a control file writable, because the denylist holds regardless of any scope. **`SKILLS_VERSION` → `2.3.1`** — a **patch** bump: `.cjs` hooks and `settings.json` are named product surface, and this corrects bytes that already shipped without changing any contract, finding shape, or frontmatter. The two `*.test.cjs` files (50 new tests, 13 → 63; line coverage 97.53% and 98.91% on the two touched checkers) are apparatus and drive no bump. **The four control paths are a deliberate duplicate** — `CONTROL_SURFACE` in the setter and the `.claude/` entries of `DEFAULT_PROTECTED` in the hook — chosen over a shared module for the reason the `check-provenance.mjs` split records: each hook must stay a standalone, stdlib-only script invoked as `node <file>`, and routing the membership set through an import makes the gate's set reachable. Per this repo's own deliberate-copy discipline that duplication ships **with its pin**: ✧ cross-copy agreement tests derive the paths from each source file and assert all **three** copies (including the test file's own literal) are the same set, plus a hook-side ✧ test that drives the guard with the entries read from `DEFAULT_PROTECTED` so a future fifth entry cannot ship untested. Measured rejecting three mutants before being trusted (L4): a fifth path in one copy only (1 failure), an entry removed from the other (7), and a command path smuggled in (4); green when reverted. **Narrowed and stated:** the guard pins that the declared **sets** are equal, not that the two guards **behave** identically on them — the hook matches path fragments, the setter does exact membership over a normalized entry. Also corrected [`pharn/floor/README.md`](./pharn/floor/README.md)'s "Wire the write-guard hook" section, which enumerated the protected set as the four trusted docs — **already stale before this change** (it omitted `CODEOWNERS`) and product surface, so shipping it knowingly wrong under this version was not an option; it now names the control surface, the setter's refusal, and the Bash bound. **Flagged for a human, not taken here:** `THREAT-MODEL.md` §4 (fix #2) and a `LIMITS.md` note should record that the guard now protects itself — both are trusted, human-only and hook-denied, so the agent cannot write them. F4 — `isProtected()`'s path-fragment **suffix** over-match (e.g. `.claude/settings.json.bak` matching `.claude/settings.json`) — closed in **`2.3.3`**: `matchesFragment()` now requires a path boundary after each fragment match; **residual:** matching remains case-sensitive.

## [2.3.0] - 2026-08-07

### Added

- **Ported the lessons-index READ side to the product surface (`product-lessons-index`)** — the follow-up reserved when PR #115 (`59def15`) shipped the index dev-only. Three new stdlib-only checkers under `pharn/floor/` — [`lessons-index-core.mjs`](./pharn/floor/lessons-index-core.mjs), [`gen-lessons-index.mjs`](./pharn/floor/gen-lessons-index.mjs), [`check-lessons-index.mjs`](./pharn/floor/check-lessons-index.mjs) — render a one-line-per-lesson address book (`id | type | concepts | title | promoted | ~tokens`) over a **user's** `memory-bank/lessons-learned.md`, and `/pharn-plan`'s mandatory lessons sweep becomes the **two-step** form: **select** candidates from the index, then **read each candidate's full `## L<n>` entry from canon** before declaring `applied_lessons`. **`SKILLS_VERSION` → `2.3.0`** — **minor**, not major, and the reason matters: nothing an existing install already emits becomes RED. `pharn/floor/check-plan-lessons.mjs` is **byte-identical** (it still verifies the declaration against **canon**, never the index — which is why a stale or poisoned index cannot corrupt the floor gate), and every degraded index state resolves to _read canon in full and say so_, never to a block. A repo with no memory-bank and no index plans exactly as it did before.
  - **The location decision, and its cost, stated rather than buried.** The index is written to **`.pharn/lessons-index.md`** — gitignored runtime scratch — so the shipped guarantee is **narrower than the dev original's**: it is a **staleness** comparison over a **disposable cache**, _not_ `docs/lessons-index.md`'s "committed == recomputed" byte-equality, and its coverage is **machine-local and ephemeral** (a fresh clone has no cache, which is GREEN by design). `memory-bank/lessons-index.md` was rejected because a Bash-run generator writing into the fail-closed gated-canon zone would **normalize a fix #7 bypass**; `docs/lessons-index.md` was rejected because in a user's repo `docs/` is **the user's directory**, and writing there is a scope claim on ground PHARN does not own. There was no free option, and the trade-off was put to the human at the plan gate.
  - **`NO_CANON` and `COLD` are GREEN on purpose — the one behavioral divergence from the dev core.** The dev core _throws_ on absent or empty canon ("refusing to render an empty index as fact"), which is correct where canon always exists and hostile where it usually does not: a user's repo commonly has **no** memory-bank, and a fresh clone never has a cache. Both are the honest normal state of a new install, so both are benign no-ops. **`STALE` is the only drift RED**, because it is the only state in which the cache could actively _mislead_ a selection; `ENUM_ERROR` (duplicate id, unsafe title, CHECK-5 hazard) blames **canon** and deliberately does **not** prescribe a regenerate that cannot succeed.
  - **The checker exposes `--verdict`**, printing one bare token from the closed set `{NO_CANON, COLD, GREEN, STALE, ENUM_ERROR}` and nothing else, so `/pharn-plan` branches on **set membership** (primitive #3) rather than parsing prose. The exit code alone is deliberately **not** the discriminator — three tokens share exit 0 and each prescribes a different sweep. This gap was caught by `/pharn-dev-grill` (finding F2) against the approved plan's own design section and closed before the build.
  - **`/pharn-memory-promote` gains Step 6b**, refreshing the index after an accepted promotion. It is **advisory twice over** and says so: running a generator is orchestration, and the write goes through **Bash**, therefore **outside** the fix #7 writes-scope entirely (`.dev/memory-bank/lessons-learned.md` **L19** — declared, never pretended). Skipping or failing it just leaves a `STALE` the next `/pharn-plan` degrades on, which is the safe direction; "the promotion refreshed the index" is never a precondition of anything.
  - **The CHECK-5 refusal was RE-DERIVED for the new path, not copied.** `pharn/floor/validate.mjs`'s `EXCLUDE_SEGMENTS` holds only `.claude/commands`, `.dev`, `pharn/floor`, `node_modules` and `.git` — **`.pharn/` is not among them**, so being gitignored does **not** exempt the cache from validate's walk, and a pair of canon titles yielding both `rule_id:` and `problem:` would trip CHECK 5 on a user's floor for a reason unrelated to their code. The core refuses to emit such an index (`.dev/memory-bank/lessons-learned.md` **L10**). Separately, and also verified live rather than assumed: `markdownlint-cli2` **does** descend into `.pharn/`, so the path is added to `.markdownlint-cli2.jsonc`'s `ignores` (**L11** — one stale generated byte otherwise blocks every later feature's verify); `prettier --check .` does **not** traverse it, so no `.prettierignore` entry was added (P7 — no speculative additions).
  - **Two deliberate copies, pinned by ✧ tests** — the precedent `product-memory-promote` set for `check-provenance.mjs`. `CANON_PATH`, `OUT_PATH`, `REGEN` and the absent-canon semantics diverge on purpose; every other shared constant (the heading/tag-line/date regexes, `TYPE_ENUM`, the concept bounds, the L14 control-char guard) must **agree**. `.dev/floor/lessons-index-core.test.mjs` asserts **both halves**, so neither an accidental drift nor an over-eager "unification" passes unnoticed. The pin lives on the dev side because a user's install ships `pharn/floor/` **without** `.dev/` — the dependency may only point `.dev/` → `pharn/` — with the honest consequence that it guards the two copies **in this repo** and does not travel with the shipped code.
  - **Honest trigger (P7), recorded rather than reframed.** Like #114 and #115, this was identified at **design time** — no dogfood failure forced it — and the planner's recommendation at the gate was a **reasoned deferral** (dev's `~L30` threshold is on record, dev canon holds 19 lessons, and a user's repo starts at **zero**). The human **declined the deferral and chose the full port**. That is the human's call at the plan gate, and it is written down as what happened. Any framing that says the dev apparatus "hit a scaling wall" would be false — nothing failed.
  - **What this never means (P0).** **"The index was consulted" NEVER means "the relevant lessons were read"** — that conflation is the whole disease the two-step sweep exists to prevent. **"Typed `floor`" never means "about the floor"**: `type` / `concepts` are model-drafted values a human ratified at the promote gate, so selecting on them is **advisory context selection**. `~tokens` is `ceil(chars/4)`, an estimate with a confidence band (`LIMITS.md §1c`), never a measurement. And byte-equality guarantees **consistency, not correctness** — a wrong parser regenerates cleanly and stays GREEN.

## [2.2.8] - 2026-08-06

### Added

- **`/pharn-memory-promote` — the memory-bank WRITE side, shipped to the product surface** ([`/pharn-memory-promote`](./.claude/commands/pharn-memory-promote.md), [`pharn/floor/check-provenance.mjs`](./pharn/floor/check-provenance.mjs)) — a PHARN user can now promote one lesson/pattern to their own `memory-bank/` through the same gated, provenance-carrying path the build apparatus has had since `/pharn-dev-memory-promote`. **The gap this closes, stated precisely.** `pharn/ARCHITECTURE.md §5` specifies promotion to canon as "a **gated** action with provenance per entry" — a claim about PHARN, not about the apparatus — and since #113 the product `/pharn-plan` has **read** `memory-bank/lessons-learned.md` and floor-gated an `applied_lessons` declaration against it. The product surface therefore shipped the **consumer** of a memory-bank and none of the gate: no provenance capture, no duplicate-id check, no target enum, no `type`/`concepts` shape gate, no human accept/deny halt. The tempting overclaim — "`applied_lessons` could only ever be `none` in a user repo" — is **false** and is not made here: `check-plan-lessons.mjs` resolves ids against `## L<n>` headings in a plain markdown file, so a user could always hand-write canon and cite it. What was missing is the **discipline behind the contents**, not the contents. **The port's four de-dev-ification decisions**, each put to the human at the plan gate rather than assumed: (1) `TARGET_ENUM` is `memory-bank/lessons-learned.md` + `memory-bank/pattern-library.md` — the **two prescription files**, deliberately **not** §5's four state files (`architecture-context` and `feature-catalog` RECORD; only a prescription can steer a future build), with a test pinning that it was not widened and that no `.dev/` path survives; (2) `commit` admits the literal **`unknown`**, following `check-loop-record.mjs`'s "state is always shown" rule, because a user's project need not be a git repo — **and the guarantee is relabeled accordingly**: "well-shaped provenance" no longer implies a diff pointer, only that an absence is honest rather than a fabricated SHA; (3) **bootstrap-on-accept** — the command creates `memory-bank/<canon-file>` with its header on a first promotion, because the checker already treats a not-yet-created canon as the legitimate empty case and hand-authoring an unseen format invites the malformed canon this command exists to prevent; (4) the checker is a **second independent copy** rather than a shared core, because the alternative would make the gate's own membership set a **caller-supplied CLI argument** — a weaker floor primitive than a literal array. That duplication's cost is paid down by a **cross-copy agreement guard** on the dev side (never ships) asserting the two copies agree on `TYPE_ENUM`, the concept bounds, `CONCEPT_RE`, `DATE_RE` and `REQUIRED_PROVENANCE` while asserting the two `TARGET_ENUM`s and `COMMIT_RE`s differ **deliberately** — **measured rejecting two mutants before being trusted** (a seventh `TYPE_ENUM` member; a `TARGET_ENUM` widened to `.dev/`), per `lessons-learned.md` L4. Honest bound: it compares **declarations, not behavior**. **A false technical claim was NOT carried across (P0).** The repo asserts in six places that JavaScript `$` without the `m` flag "matches at end-of-string or just before a single trailing newline" — that is Python/Perl behavior; in JS `$` without `m` matches **only** at end of input, and `m` is precisely what makes it match before a newline. Measured on this tree: `/^[a-z0-9-]+$/.test("enum-gate\n")`, `/^P[0-7]$/.test("P2\n")` and `/^\d+$/.test("2\n")` are all **`false`**. The conclusion those sites reach is right everywhere and the stated reason is wrong everywhere, so the **real, site-specific** reason is stated instead: on the `concepts` path nothing trims, so the control-char guard is **redundant today** and its independent contribution is the **length bound** and **string-type** check — it is kept anyway, per L14's compose-don't-re-derive discipline and `check-loop-record.mjs`'s already-honest framing, and is never claimed to be what catches the case. The ✦ witness tests still discriminate because they assert **the guard's own message**, not a bare RED. **Correcting the pre-existing instances is deliberately a SEPARATE increment** (`regex-newline-claim-correction`): two of them (`pharn/floor/merge-findings.mjs`, `pharn/floor/check-loop-record.mjs`) are **product-surface bytes**, so it is a patch bump with its own entry, and canon `L14`'s cited witness is a **gated** artifact requiring a promotion, not a casual edit — while the `.dev/features/*` audit trails and the #114 entry below are **never** rewritten, because an audit trail that gets edited is not one. Note for whoever takes it: in `merge-findings.mjs` the guard is genuinely **load-bearing**, for a reason its comment never states — `RULE_ID_OK` **trims** before the shape regex, and `/^P[0-7]$/i.test("P2\n".trim())` is `true`. **Two findings the grill surfaced and this increment could not close, recorded rather than buried.** (a) The next-id rule was ported assuming house-style canon, which the apparatus guarantees by construction and a **user's repo does not**; the command now branches three ways over live canon — no `##` headings → `L1`; ≥1 `## L<n>` → max+1; **non-empty with no `## L<n>` at all → HALT and ask** — because the checker's duplicate test keys on the first token after `##` and therefore cannot collide with a foreign scheme (it degrades, it does not protect). (b) **fix #7 does not make canon unreachable, and the command says so in its own guarantee audit:** `/pharn-build` derives its scope from a PLAN's `## Files` via `--from-plan` and never reads a `writes:` declaration, and no human approves a product PLAN — so a `## Files` entry naming a canon path would grant an **ungated** canon write. Pre-existing on `main` and inert only because canon meant nothing on the product surface; **this increment is what makes it live**. Follow-up: `canon-write-denylist` (a deny that does not depend on any declaration being honest). L7's own remedy was applied as far as it reaches — all 18 commands enumerated live (**none** but the two `*memory-promote` ones declares a `memory-bank` path) and pinned by a guard — with the honest bound stated in the guard itself: it pins a **declaration**, not a behavior, and `--from-plan` bypasses it entirely. **Verified live rather than reasoned about (L2/L4):** a staged copy of the product surface (`pharn/floor/check-provenance.mjs` + `check-plan-lessons.mjs`, both hooks, the command) in a temp dir with **no** `memory-bank/` showed the full chain — write denied at exit 2 with no scope; Step 0 resolving `1 path(s)` so the **sibling** canon file stays denied; a candidate carrying `commit: unknown` **and** an instruction-looking needle in its body passing GREEN (the verdict never reads the body — P2); deny writing nothing; accept bootstrapping the file; and a PLAN citing `[L1]` resolving GREEN through `check-plan-lessons.mjs`, with `[L2]` RED as the negative control. That seam is also pinned as a committed test, so the demonstration outlives the session that ran it. **`pharn/floor/check-plan-lessons.mjs` is byte-unchanged** — this increment gives it something trustworthy to resolve against; it does not change how it resolves. Known adjacent defect, disclosed rather than implied clean: that file carries the same naive fence toggle noted in the `#116` entry below. **Honest trigger (P7), stated rather than hidden:** no dogfood run failed and no eval failed. This is **domknięcie** — tightening an existing §5 spec claim to its floor, the same move `check-provenance.mjs` originally made for §5's provenance half — not a capability invented from a hypothetical. **`SKILLS_VERSION` → `2.2.0`** — minor: a newly shipped command + checker, and nothing already installed is invalidated (a project with no `memory-bank/` keeps `applied_lessons: none` and stays GREEN; a hand-written canon is never retro-invalidated, since the checker keys on `candidate.json` and never scans canon — L3).

### Fixed

- **`/pharn-memory-promote` honest claim matches the two-clocks split** — provenance validation and write confinement are stated as conditional floor claims (_when the checker runs_ / _when the hook sees the write_), Step 5 blocks `AskQuestion` until Step 3 GREEN, and the prose no longer unconditionally guarantees either op ran. **`SKILLS_VERSION` → `2.2.8`** — patch.

- **`/pharn-memory-promote` captures provenance from live state** — Step 1 now derives `feature` and `source` from the surfacing artifact (halt if untraceable), captures `date` from runtime (`date +%Y-%m-%d`), and preserves deterministic `commit` capture (`git rev-parse HEAD` or `unknown`); Step 2 forbids model-composed provenance fields. **`SKILLS_VERSION` → `2.2.7`** — patch.

- **`/pharn-memory-promote` validates `title` before Markdown render** — Step 3 now rejects non-string, empty, multi-line, or control-character titles before Step 5/6 render the `## <id> — <title>` heading; only the validated `candidate.title` may appear in canon. **`SKILLS_VERSION` → `2.2.6`** — patch.

- **`/pharn-memory-promote` requires hook-gated canon writes** — Step 6 now mandates `Write`/`Edit`/`MultiEdit` for every byte to `<canon-file>`, forbids shell redirection, Node fs writes, and formatter auto-fixes, and states the fix for blocked writes (re-declare scope via Step 0 — never bypass). **`SKILLS_VERSION` → `2.2.5`** — patch.

- **`/pharn-memory-promote` re-verifies canon before write** — Step 6 now re-reads `<canon-file>`, compares its SHA-256 to the Step-1 discovery pin, and re-runs `check-provenance.mjs` before any accept-path write; abort on drift or RED. **`SKILLS_VERSION` → `2.2.4`** — patch.

- **`/pharn-memory-promote` uses local vendor formatters for its advisory check** — the stage's check-only prettier/markdownlint step now invokes `vendor/bin/prettier` and `vendor/bin/markdownlint-cli2` with `NODE_ENV=production`, skipping each check when the binary is absent, instead of unqualified `npx`. **`SKILLS_VERSION` → `2.2.3`** — patch.

- **`pharn/floor/check-provenance.mjs` rejects impossible Gregorian dates** — regex-shaped values such as `2026-02-30` no longer pass the provenance gate; dates must round-trip as real calendar dates. **`SKILLS_VERSION` → `2.2.2`** — patch.

- **`pharn/floor/check-provenance.mjs` rejects ids containing whitespace** — a candidate id with spaces or newlines no longer normalizes via `.trim()` and slips through duplicate lookup; the checker now RED-fails any non-empty id containing whitespace before duplicate lookup or the GREEN render line. **`SKILLS_VERSION` → `2.2.1`** — patch.

## [2.1.0] - 2026-08-06

### Added

- **A narrative `## Handoff` in the loop-record, so a run's SYNTHESIS survives to the next run** ([`pharn/pharn-contracts/loop-record.md`](./pharn/pharn-contracts/loop-record.md), [`pharn/floor/check-loop-record.mjs`](./pharn/floor/check-loop-record.mjs), [`/pharn-loop`](./.claude/commands/pharn-loop.md)) — artifacts, verdict reports and `LOOP.md` already persist; what died with the session was the synthesis: what was investigated and **ruled out without leaving an artifact**, what was learned, and what the next concrete step was. `features/<name>/LOOP.md` — `/pharn-loop`'s existing, **only**, already-scoped write — now carries a `## Handoff` section with exactly `### investigated`, `### learned`, `### next_steps`, plus a deterministic frontmatter envelope (`decision`, `iterations`, `commit`, `date`). It is written on **every** stop path including `INCONCLUSIVE` (a run that ended badly is exactly the one whose synthesis is worth carrying), and `/pharn-loop` gains `features/<name>/LOOP.md` in `reads:` so a later run quotes a prior Handoff **as untrusted DATA** (P2) — informing planning, gating nothing. **No new file, no `.pharn/` side channel:** the narrative goes inside the existing single output, so the "`/pharn-loop` may write only `LOOP.md`" fix #7 guarantee survives **verbatim** (`lessons-learned.md` L8 — a multi-artifact output could not be scoped in one setter call anyway). **The honest split (P0):** `check-loop-record.mjs` guarantees that a record **handed to it** is well-shaped — enum membership, anchored regexes over control-char-guarded values, and heading-list equality. That a record is written at all, or ever handed to the checker, is **advisory orchestration**, so "the loop cannot leave a malformed record" is **false** while "a record the checker sees is malformed-**detectable**" is true. Everything about the narrative is advisory: that it is **accurate**, that `decision` **agrees** with what `check-loop.mjs` emitted (membership is gated, agreement is not — the verbatim copy-through **narrows** that gap and does not close it), that `commit`/`date` are true (both are captured by the command's Bash; a corrupted capture yields a **shape-valid lie**, L5), and that any future run reads it. **"A record was written" NEVER means "continuity was achieved."** **The stop is untouched, structurally:** `check-loop.mjs` is byte-unchanged and its input signature has no record parameter, so the record **cannot** feed the loop's stop — impossible by construction, not by discipline. **Two claims were corrected during the build rather than shipped (P0).** `/pharn-dev-grill` flagged that heading-membership over a section whose bodies are untrusted free text is reachable **from that free text**; the fix (exact list equality — fixed order, the only `###` headings, duplicates RED) is real, but the **rationale** was overstated and is now stated precisely: a **line-initial** `### next_steps` in a body **is** the `next_steps` heading, markdown has no notion of "intended as prose", and no checker can invent one — so this is **not** forgery-proofing, it is **unambiguity** (the collision necessarily yields an extra/duplicate/reordered heading, which a set-membership or first-wins check would have passed). Both the line-initial and the inline back-ticked forms are pinned by tests, and a fenced quote is the escape hatch (L6). Likewise the L14 control-char guard is composed before every shape regex and the tests say honestly that it is **redundant today** — kept so a future parser change cannot silently reopen the hole, not claimed as what catches these cases. Also from the grill: `git rev-parse HEAD` failing (no repo, unborn `HEAD`) now writes the literal **`unknown`** — an honest absence following `ship-record.md`'s `· unattested` rule that **state is always shown** — never an empty field and never a fabricated SHA; the Step-4b repair loop is bounded at **one** re-run before handing to the human, labeled advisory (`LIMITS.md §1d`) since the checker keeps no counter; and the checker **re-implements** its regexes and guard **in-file** rather than importing `.dev/floor/check-provenance.mjs`, which is stripped at packaging and would be green here and broken in every install. `/pharn-loop` **cites** the contract's canonical template rather than restating the shape (P4), and a ✧ test extracts that template and runs the checker on it — binding **the contract and the checker**, two-way. Scoped honestly (P0): no test reads `.claude/commands/pharn-loop.md`, so the command's agreement rests on that citation, which is **discipline, not a floor guarantee**; "all three cannot drift" would be the disease. **The structure scan agrees with real Markdown, because a naive one did not (measured, not assumed).** Checked against micromark and markdown-it as oracles, an earlier scan disagreed with both in **both** directions, and each disagreement was a live defect rather than a nicety. It **fail-OPENED**: a `~~~` block "closed" by ``` left two subsections inside a code block while the checker still reported all three present — falsifying the very structure claim it exists to make; and a 3-space-indented `### smuggled` (a heading to every CommonMark parser) was invisible, so the record returned GREEN while asserting the three were the ONLY level-3 headings. It also **fail-CLOSED on its own prescribed remedy**: the RED message tells the author to fence a quoted outline, which needs a nested fence, and the standard four-backtick idiom broke the naive toggle. Fence pairing now follows **CommonMark 4.5** (a block closes only on the **same** delimiter character with a run **at least as long** as the opener's, nothing but whitespace after it) and all three structure regexes allow the **0–3 leading spaces** an ATX heading may carry — `{0,3}`, not `\s*`, so a 4-space-indented line stays an indented code block. Both fixes are pinned by tests **verified against mutants**: restoring the blind toggle fails exactly the three fence tests, restoring the column-0 anchors fails exactly the two indent tests. **The record's structure must mean the same thing to the checker and to whoever reads the record**, or the section-shape guarantee is about a document nobody sees. (Noted for a human, out of scope here: `pharn/floor/check-plan-lessons.mjs` carries the same naive toggle.) **The residual grows, and says so** (`LIMITS.md §2`): this is a deliberate **session-to-session channel made of free text** — bounded (nothing gates on it, the checker never reads the bodies, it is feature-scoped and quoted) but not zeroed. It is deliberately **not** memory-bank canon — never promoted, no promotion gate — so it opens no poisoning path (`THREAT-MODEL.md §2`, surface 3). **Honest trigger (P7), stated rather than hidden:** identified at **design time**; no dogfood or eval failure forced it. **`SKILLS_VERSION` → `2.1.0`** — minor, not major: unlike `#113` (which made `check-plan-lessons.mjs` read pre-existing user-authored `PLAN.md` files and turned every install's plans RED), `/pharn-loop` Step 4b is the only place that invokes the checker — on the record just written — while `check-loop-record.mjs` itself validates **any** supplied `LOOP.md` (shape only; no same-run provenance). Step 1b reads a legacy record **tolerantly** — an old `LOOP.md` with no Handoff is noted and continued past, never RED. No existing install is invalidated (L3).

- **Each pipeline stage now formats exactly its own outputs — the repo-wide formatter is gone** ([`/pharn-dev-build`](./.claude/commands/pharn-dev-build.md) Step 2b, the seven other artifact-writing stages, [`.dev/floor/command-hygiene.test.mjs`](./.dev/floor/command-hygiene.test.mjs)) — Step 2b prescribed `npm run format`, which is `prettier --write .` over the **whole repo**, while its own prose said "the just-written files". Every build therefore rewrote files no plan had declared, escaping the fix #7 writes-scope entirely because the pre-write hook gates `Write|Edit|MultiEdit` and a formatter runs through **Bash**. Observed live (it reformatted an unrelated checker during another increment) and promoted as `lessons-learned.md` **L19**. Step 2b now formats **exactly** the paths in `.pharn/writes-scope.json` — the list the Step-0 setter already parsed deterministically (P5), not a fresh reading of the plan — and states its behavior when that file is absent (skip with a note; the step is advisory and never blocks). **The same change lands L13's remedy, which had been canon-but-unimplemented since 2026-07-07:** `plan`, `grill`, `regress`, `verify`, `review`, `ship` and `memory-promote` each now format their own artifact before halting. L13 named four stages; **`plan` and `grill` are added**, because they write markdown too and had been formatted only as collateral of the repo-wide sweep — so fixing Step 2b alone would have _regressed_ the pipeline. The machine reports `regression-report.json` / `verify-report.json` are deliberately **excluded**: their commands require them to stay the checker's output **verbatim**, and a formatter that rewrites bytes makes that false. **Verified live rather than assumed (L2):** `--ignore-unknown` is **required** — without it prettier exits **1** on an extension-less path such as `SKILLS_VERSION`; `.prettierignore` **is** honored for explicitly-named paths, so generated artifacts stay protected. **An L16 trap inside the remedy, closed:** with an empty `.md` list, **GNU** `xargs` runs its command once **with no arguments** — and a bare `markdownlint-cli2 --fix` then lints and fixes the whole repo, re-creating the defect through its own fix — while **BSD** `xargs` does not run it at all (both confirmed on this platform / documented for GNU). An explicit POSIX non-empty test now depends on neither dialect. A new guard test pins the class: no `.claude/commands/*.md` may prescribe a repo-wide formatter write, with an HTML-comment `COMMAND-HYGIENE:SKIP` region (the `TYPE-ENUM` precedent) so the rejected form can still be quoted for the record. It **discriminates** — a companion test asserts it flags `npm run format` / `prettier --write .` / bare `markdownlint-cli2 --fix` while passing `npm run format:check` and both scoped `xargs` forms — and it caught a real self-collision during this build. **Honest scope (P0):** this removes the known **instance**, not the **class**; any Bash-invoked tool still escapes the writes-scope, so **L19 remains true after this lands**, and the guard pins a _vocabulary_, never proving absence. `SKILLS_VERSION` is NOT bumped — every changed path is a `pharn-dev-*` command, a `*.test.*` file, or repo-meta; no product command prescribed a formatter write (verified).

- **The lessons-index drift guard now runs in CI, and the wiring is pinned** ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml), [`.dev/floor/lessons-index-core.test.mjs`](./.dev/floor/lessons-index-core.test.mjs), [`.dev/floor/check-lessons-index.mjs`](./.dev/floor/check-lessons-index.mjs)) — the `ci.yml` step that previously invoked `node .dev/floor/check-capability-catalog.mjs .` **directly** now runs **`npm run docs:check`**, so it covers **both** drift checkers and any future generated region without a further CI edit. **Why it mattered (`lessons-learned.md` L2 — a doc may cite only a LIVE floor op):** for one commit `CLAUDE.md` told every future session that all three generated regions were guarded "as its own CI step" while **no workflow ran the lessons checker at all** — a PR promoting a lesson without regenerating would have passed CI. The claim was true locally (`npm run check`) and false at the merge gate; `/pharn-dev-review` caught it as a blocking P0 finding. A **✧ guard test** now pins the wiring: it asserts `ci.yml` contains a step whose `run:` is `npm run docs:check` **and** that the step carries the same install-gated `if:` as its siblings — because matching only the `run:` string would let an edit to `if: false` leave the invocation present, the test green, and the guard dead. Both halves were **measured rejecting** a mutated workflow before being trusted (L4). **Honest residual (P0):** what stays uncheckable from inside the repo is that GitHub _executed_ the job, that the workflow is enabled, and that branch protection _requires_ the check — harness-layer facts, the same boundary `LIMITS.md §1d` draws. **"The wiring is pinned" never means "CI is guaranteed to run it."** Also in this entry, and previously shipped without one: `check-lessons-index.mjs` now distinguishes an **`ENUM_ERROR`** (duplicate lesson id, unsafe title, unreadable canon) from **`DRIFT`/`MISSING`** in both its headline and its `FIX:` line. The old message prescribed `npm run docs:generate` for _every_ red — advice that **cannot succeed** on invalid canon, since the generator refuses on the same input; it now names the canon file instead. Four CLI tests cover the branches, including the negative that the regenerate remedy is **not** offered for an `ENUM_ERROR`. `SKILLS_VERSION` is NOT bumped — every changed path is `.dev/**`, a `pharn-dev-*` command, a `*.test.*` file, or repo-meta/CI.

- **Generated lessons index (`docs/lessons-index.md`) with a drift guard, and a two-step `/pharn-dev-plan` lessons sweep** ([`.dev/floor/lessons-index-core.mjs`](./.dev/floor/lessons-index-core.mjs), [`.dev/floor/gen-lessons-index.mjs`](./.dev/floor/gen-lessons-index.mjs), [`.dev/floor/check-lessons-index.mjs`](./.dev/floor/check-lessons-index.mjs), [`/pharn-dev-plan`](./.claude/commands/pharn-dev-plan.md)) — a derived one-line-per-lesson address book over `.dev/memory-bank/lessons-learned.md`, rendered as `id | type | concepts | title | promoted | ~tokens` and generated by the same shared-core/generator/checker pattern as the capability catalog, so "recompute" is byte-identical to "generate" by construction (P3). It **consumes** the `type` / `concepts` tag line #114 defined, reading it from its **defined structured location** — the first non-empty line after the `## L<n> — <title>` heading — never grepping it from prose (`lessons-learned.md` L6). `/pharn-dev-plan`'s mandatory lessons sweep becomes two steps: **select** candidates from the index, then **read each candidate's FULL `## L<n>` entry from canon** before declaring `applied_lessons` (the one-line-per-cited-id requirement demands full text; a lesson you did not read in full is one you may not cite); `reads:` gains the index and **keeps** canon. **The honest split (P0):** the floor is **byte-equality** — the committed index equals what the core recomputes from canon (`check-lessons-index.mjs`, wired into `docs:check` → `npm run check`) — which is **consistency, not correctness**: a wrong parser would regenerate cleanly and stay GREEN. `pharn/floor/check-plan-lessons.mjs` is **byte-unchanged** and still verifies the declaration against **canon**, never against this derived file. Everything else is advisory: **"the index was consulted" NEVER means "the relevant lessons were read"**, and since `type` / `concepts` are model-drafted values ratified by a human at the promote gate, **"typed `floor`" never means "about the floor"** — selection keyed on them is advisory context selection. `~tokens` is `ceil(chars/4)` over the full section and is an **estimate with a confidence band, never a measurement** (`LIMITS.md §1c`), so it renders with a leading `~`. **Legacy entries degrade gracefully (L3):** no pre-#114 entry carries a tag line, so all 17 rows currently render `-`, and `-` (absent — expected, benign) is deliberately **distinct** from `?` (a tag line present but failed its gate — unexpected), so a poisoned or typo'd tag cannot hide as a legacy one; the header carries live `tagged / malformed / untagged` counts. **Trust (P2):** canon is untrusted DATA — titles are reproduced **verbatim** inside a `text` fence (several live titles carry back-ticks and `||`, e.g. L15) and no decision reads them, while `type` / `concepts` / `date` are enum/regex-gated before use with the control-char guard **composed before** the shape regex (L14); a title carrying a fence-closing sequence or a control char is **refused, not sanitized**. Because `docs/` sits on `pharn/floor/validate.mjs`'s scanned surface (L10), the core also refuses to emit an index containing both `rule_id:` and `problem:`, which would trip CHECK 5. Excluded from prettier + markdownlint like the catalog — sharpened by L11, since those gates are whole-repo and one stale byte would block every later feature's verify. **`SKILLS_VERSION` is NOT bumped** — every changed path is `.dev/**`, a `pharn-dev-*` command, a `*.test.*` file, `docs/`, or repo-meta; the product `/pharn-plan` is deliberately **untouched** (a user's repo has no index generator), leaving the product surface unchanged — follow-up `product-lessons-index`. Also follow-ups: `lessons-index-downstream-reads` (let build/verify/regress/review consult the index instead of hardwired `L<n>` citations in prose) and `retro-tag-legacy-lessons`. **Honest trigger (P7), stated rather than hidden:** like L8 and #114, this was identified at design time — no dogfood failure forced it, and the defer-until-~L30 option was put to the human at the plan gate and declined.

- **Typed memory-bank lesson entries — a closed `type` enum + a `concepts[]` tag list** ([`.dev/floor/check-provenance.mjs`](./.dev/floor/check-provenance.mjs), [`/pharn-dev-memory-promote`](./.claude/commands/pharn-dev-memory-promote.md)) — a promotion candidate must now declare `type` (one of `process | contract | floor | scoping | tooling | eval`) and `concepts` (1–6 unique tags, each control-char-free lowercase letters/digits/hyphens, ≤32 chars), and the rendered canon entry carries them as a **tag line** — `type: <member> · concepts: [<a>, <b>]` — as the first non-empty line below the `## L<n> — <title>` heading. The position and grammar are a **defined structured location**, specified in the promote command as part of the entry contract, so a future lessons-index generator reads a declaration rather than grepping prose (`lessons-learned.md` L6). **The enum was ratified against the real corpus, not proposed:** every member maps to ≥1 of the live L1–L17 lessons (`process` 5 · `scoping` 4 · `floor` 4 · `tooling` 2 · `contract` 1 · `eval` 1), and a proposed `injection` member was **dropped at zero instances** — P7 forbids exactly that speculative addition. `TYPE_ENUM` in the checker is the single source of truth; the command doc restates the member list once for humans inside a marked region, and a test asserts the two are equal, so the restatement cannot drift (P4). **The honest split (P0):** the floor guarantees the CANDIDATE's field SHAPE — exact array membership for `type`, and for each concept a control-char guard **composed with** (never replaced by) an anchored shape regex, since `/^[a-z0-9-]+$/.test("enum-gate\n")` is `true` in JS and a shape-regex-only check would re-admit the trailing-newline vector (L14, with a dedicated witness test). It guarantees **nothing** about whether the values are apt: they are model-drafted and human-ratified at the Step-5 accept/deny gate, so **"the entry is typed `floor`" never means "the entry is about the floor"**, and any downstream selection keyed on `type` is advisory-grade context selection. Also named rather than hidden: the floor validates the candidate at Step 3 while the entry is rendered at Step 6, so that the **rendered** line conforms is advisory (Step 6 substitutes the already-validated fields into a fixed template) — follow-up `lesson-tagline-render-check`. **Honest trigger (P7):** like L8, the cost was identified at design time rather than hit as a dogfood failure — since #113 both plan stages' mandatory lessons sweep reads all 17 lesson bodies in full with `L<n>` + title as the only handle. This increment ships the **address only**; no consumer reads it yet, and the sweeps are unchanged. **Legacy L1–L17 stay untagged** — the checker keys on `candidate.json` and never scans canon, so the fields bind new candidates only and no existing entry is retro-invalidated (L3); any consumer must tolerate untagged entries. **Breaking for the apparatus, not the product:** a `candidate.json` written against the old shape now fails the checker (migration: add the two fields). **`SKILLS_VERSION` is NOT bumped** — every changed path is `.dev/**`, a `pharn-dev-*` command, a `*.test.*` file, or repo-meta, none of which is the product surface per CLAUDE.md's SKILLS_VERSION discipline; `pharn/floor/check-plan-lessons.mjs` itself is byte-unchanged, gaining only regression tests proving the tag line cannot disturb `applied_lessons` id resolution.

## [2.0.0] - 2026-08-05

### Changed — BREAKING

- **`applied_lessons` is now a REQUIRED field in the product `PLAN.md` frontmatter.** Any existing
  `features/<name>/PLAN.md` written before this release lacks the field and is therefore **RED** under
  `pharn/floor/check-plan-lessons.mjs` — a breaking change to the shipped plan-artifact shape, and the
  reason this release is **major** (`SKILLS_VERSION` 1.1.4 → **2.0.0**) rather than minor. **Migration:**
  add one line to each existing PLAN's frontmatter — `applied_lessons: none` (plus a one-line note in the
  body saying why no promoted lesson bears on that feature), or `applied_lessons: [L1, L2]` citing the
  lessons that were applied. `none` is GREEN even in a project with no memory-bank at all, so a project
  that has never promoted a lesson migrates with that single line. Full behavior below.

### Added

- **`applied_lessons` — promoted lessons become a floor-checked plan input** ([`pharn/floor/check-plan-lessons.mjs`](./pharn/floor/check-plan-lessons.mjs), [`/pharn-plan`](./.claude/commands/pharn-plan.md), [`/pharn-dev-plan`](./.claude/commands/pharn-dev-plan.md)) — both plan stages now read the memory-bank's `lessons-learned.md` and MUST declare, in the PLAN's structured header, which promoted lessons the increment applied: either `none` or a list of `L<n>` ids, with one body line per cited id saying HOW it was applied. `check-plan-lessons.mjs` reduces that to the floor (primitive #3): the field must be **present** (omission is not the escape — the VALUE `none` is), **well-formed** (`none` | `[L<n>…]`; `[]` and lowercase `[l1]` fail closed), and every cited id must **resolve** to a real `## L<n>` heading. The field is read only from the **structured** header — YAML frontmatter (product PLAN) or the leading bullet block (dev PLAN), fenced blocks skipped — never grepped from prose, per `lessons-learned.md` L6. **Trigger (P7 — observed, not hypothetical):** L1 ("add a meta-doc sweep to the `/plan` discovery step") sat unapplied in canon while neither plan stage so much as _read_ the lessons file; lessons were promoted with full provenance and nothing downstream was forced to consume them. **The honest split (P0):** the floor guarantees the DECLARATION is present, well-formed, and cites real lessons — **never** that the lessons were genuinely applied or that a `none` is justified (advisory; grill/review territory). "The plan cited L1" never means "the plan applied L1". Also honest: no downstream stage re-verifies the field yet, so it is currently **self-attested by the authoring stage** — the named follow-up is `grill-lessons-reverify`. Stdlib-only; ships a `node --test` suite at 100% line coverage. `ARCHITECTURE.md §6`'s plan-artifact row gains the field (human-authored — the file is hook-denied to agents). **`SKILLS_VERSION` → `2.0.0`** — major, not minor: making the field mandatory in the shipped product PLAN shape invalidates existing installs' plans, which is precisely CLAUDE.md's stated major criterion. (The approved PLAN scoped this as a 1.2.0 minor; `/pharn-dev-grill` and `/pharn-dev-review` both flagged the major criterion as met, and the human resolved it to major at the post-review gate — see the BREAKING entry above for migration.)

## [1.1.4] - 2026-08-05

### Fixed

- **Closed a paren-bounded false-NEGATIVE in the three injection-family lens scanners** ([`pharn/floor/scan-code-injection.mjs`](./pharn/floor/scan-code-injection.mjs), [`pharn/floor/scan-code-path-traversal.mjs`](./pharn/floor/scan-code-path-traversal.mjs), [`pharn/floor/scan-code-ssrf.mjs`](./pharn/floor/scan-code-ssrf.mjs)). Each sink pattern bounded the span between the sink callee and the taint token / request source with `[^)]*?` — a negated class that stops at the **first inner `)`**. A nested call closed that paren before the span ever reached the taint, so a single-line concat/interp (or source) sitting **after** a nested call was **silently missed**. Reproduced across all eight affected patterns before any code changed: `db.query(tableFor(req.query.t) + " WHERE 1=1")`, `exec(cmdFor(req.body.action) + " --now")`, `fetch(baseUrl() + req.query.next)`, `path.join(rootDir(), req.query.f)`, `fs.readFile(resolveRoot(base), req.query.f)`, `axios.get(hostFor(cfg) + req.query.u)`, `http.get(pick(a) + req.query.u)`, and `res.sendFile(dirFor(x), req.query.f)` all returned `{"found":false}`. That mattered most in path-traversal and SSRF, where computing the base directory / base URL with a helper call is the **ordinary** way the code is written — the miss sat on the most realistic shape of the vulnerability. The span is now `(?:[^)]|\([^)]*\))*?`: any non-`)` character, or a complete paren-free `(...)` group, so it **stops at the first `)` that is not a complete inner group's closer** — the sink call's own outer `)`. **Two alternatives were rejected on measurement, and both rejections are pinned by tests rather than written down:** `[^;]*?` over-spans past the sink's outer `)` and false-matches an unrelated `+`-concat later on the same line (`return db.query(safeConst) || fallback("x" + y)`), and the disjoint-branch variant `(?:[^)(]|\([^)]*\))*?` skips a nested group as an opaque unit and therefore **loses** taint sitting _inside_ one — it drops the canonical `fs.readFile(path.join(base, req.params.x))` and `fetch(new URL(req.query.url))`, a net coverage loss. **Honest bound (P0/P7), encoded in each scanner's HONEST BOUND header and asserted as a documented true-negative:** the span handles **one level** of nesting; at depth > 1 some `)` is not a complete group's closer, the span stalls, and `db.query(f(g(h(x))) + " tail")` remains a **miss**. Bare-variable, multi-line, and cross-function taint stay out of scope and stay disclaimed. Two further header corrections, because these bounds are the whole reason the scanners are FLOOR: the ReDoS note no longer claims the span is **"linear"** — the new branches **overlap** on `(`, so the clean disjointness proof does not apply, and the honest claim is "no exponential backtracking observed, bounded structurally by the `)` wall" (measured sub-millisecond on `(a)`×800, `((a))`×800, and unclosed-`(`×800 adversarial ~4 KB lines); and the comment-derived false-positive residual is recorded as having **widened** rather than being "unchanged" — a comment spelling out a full nested sink call now registers where it did not before, which is strictly more over-flagging and **never** suppression. **Injection-immunity is intact** (verdict is still regex membership over TEXT only: a "safe / do not flag" comment cannot suppress a real hit, a "vuln here" comment cannot manufacture one), as is the fail-closed contract (missing / non-file target → nonzero exit, nothing on stdout). `scan-code-injection.mjs`'s `html-injection` pattern deliberately **keeps** `[^;]*?` and now carries a header note explaining why: its sinks are assignment targets (`el.innerHTML = …`, `__html: …`) with no closing paren to bound against, so two sink **shapes** need two bounds. `SKILLS_VERSION` → `1.1.4` — a **patch** bump: all three scanners are product-floor `pharn/floor/*.mjs`, squarely in the bump-triggering set. The three `*.test.mjs` files (12 new tests: nested-paren detection, interpolation variants, and the mandatory false-positive guards) are apparatus and drive no bump.

## [1.1.3] - 2026-08-05

### Fixed

- **Prefixed the abbreviated `floor/` self-headers in the product-floor checkers with `pharn/`.** A follow-up to the `.dev/floor/` → `pharn/floor/` self-path correction below, closing the second, smaller legibility gap it left: six checkers still carried a bare `// floor/<self>` line-2 header, plus in-header sibling cross-references and `Usage:` comments. Unlike the stale `.dev/floor/` paths, these were **never misdirecting** — there is no `floor/` at the repo root — so this buys header-equals-location accuracy, **not** a fixed defect. Rewritten by a **four-condition** rule, all required: `pharn/floor/<B>` must exist as a real file (existence-gate), the occurrence must sit in a `//` comment or a `console.log`/`console.error` usage string, the `floor/` must be **bare** (preceding char not `/`, `.`, or a letter — which alone shields `pharn/floor/`, `.dev/floor/`, and `floor-ignored`), and it must be a **location/invocation** reference rather than a historical mention. 23 rewrites across [`check-ship.mjs`](./pharn/floor/check-ship.mjs), [`check-loop.mjs`](./pharn/floor/check-loop.mjs), [`check-regress.mjs`](./pharn/floor/check-regress.mjs), [`check-build-complete.mjs`](./pharn/floor/check-build-complete.mjs), [`check-structural.mjs`](./pharn/floor/check-structural.mjs), and [`check-verify.mjs`](./pharn/floor/check-verify.mjs), plus the line-1 header of each of their six `*.test.mjs` files. **One site is operative** — `check-structural.mjs`'s no-args `console.log`, so **program output text changes**; no control flow, and no path, because these strings occur only in comments and printed usage text, never in an `fs` call. **Existence-gating alone would have been unsafe here**, which is the point of the extra conditions: bare `floor/` also appears as **mock-path DATA** inside the test files (`check-regress.test.mjs`, `check-loop.test.mjs`, `check-ship.test.mjs`), and `floor/validate.test.mjs` / `floor/check-regress.mjs` / `floor/*.test.mjs` **do** resolve to real files — only the comment-only condition protects them from a rewrite that would invert the assertions. `floor/check-variance.mjs` cross-references are existence-gate skips (that file lives at `.dev/floor/`) and are left as dangling refs, a separate concern. **Honest floor backstop (P0), stated precisely because the obvious claim overstates it:** `npm test` guards the mock-path data only **partly** — the lines that are _assertions_ (e.g. `assert.deepEqual(o.outside_tests, ["floor/validate.test.mjs"])`) fail immediately on a wrong rewrite, but the lines that are merely `run()` _inputs_ to tests asserting an exit code (`check-regress.test.mjs:87/96/98`) and the never-asserted `REGR` fixture arrays (`check-ship.test.mjs:51`, `check-loop.test.mjs:63`) would pass a consistent rewrite silently; and `check-structural.test.mjs` has **zero** tests on the no-args path, so the one operative edit is unguarded. For those sites the protection is the comment-only rule — agent discipline, not a floor primitive. `pharn/floor/README.md` is deliberately **out of scope**: its `node floor/…` examples cannot be fixed by a prefix rewrite alone (its exclusion prose also omits `.dev/` and must be reconciled with `validate.mjs:21`, which itself omits `pharn/floor/`), so the README lands as one coherent accuracy pass in a follow-up rather than as an incoherent half here. `SKILLS_VERSION` → `1.1.3` — a **patch** bump: the six non-test checkers are product-floor `pharn/floor/*.mjs`, squarely in the bump-triggering set, and per CLAUDE.md § _SKILLS_VERSION discipline_ prose-only edits to shipped bytes bump too. The six `*.test.mjs` header fixes are apparatus and drive no bump.

## [1.1.2] - 2026-08-05

### Added

- **Generated capability catalog (`docs/capabilities/`) with a drift guard** ([`.dev/floor/capability-catalog-core.mjs`](./.dev/floor/capability-catalog-core.mjs), [`.dev/floor/gen-capability-catalog.mjs`](./.dev/floor/gen-capability-catalog.mjs), [`.dev/floor/check-capability-catalog.mjs`](./.dev/floor/check-capability-catalog.mjs)) — one docs page per role-bearing capability, generated from the SAME source `.md` files `pharn/floor/validate.mjs` treats as capabilities (enumerated by the same `role:` frontmatter membership test), plus a grouped `README.md` index. A shared core renders the bytes for BOTH the generator and the checker, so "recompute" is byte-identical to "generate" by construction (P3). The guarantee (P0) is narrow and honest: `check-capability-catalog.mjs` reduces to **byte-equality** (committed pages == freshly recomputed pages, the content-hash primitive) + **page-set membership** (missing / orphan) — RED on any drift, so adding a capability without regenerating fails the gate; it guarantees **only** committed == recomputed, never that the prose reads well (advisory). No install command is rendered — this repo has no CLI/install-token, so pages link to their source instead of fabricating one. Wired as a CI step (`ci.yml`) + `npm run docs:check` (folded into `npm run check`); `npm run docs:generate` regenerates. **Build apparatus** (`.dev/floor/`, no `role:`, tests-only) with output under `docs/` — not methodology a user runs — so **`SKILLS_VERSION` is NOT bumped**; the product surface is unchanged. Generated pages are excluded from prettier + markdownlint so a formatter can never induce false drift.

### Changed

- **The root `README.md` `## Current state` inventory is now GENERATED and drift-guarded, not hand-written** ([`.dev/floor/capability-catalog-core.mjs`](./.dev/floor/capability-catalog-core.mjs), [`.dev/floor/gen-capability-catalog.mjs`](./.dev/floor/gen-capability-catalog.mjs), [`.dev/floor/check-capability-catalog.mjs`](./.dev/floor/check-capability-catalog.mjs)). The hand-written section had drifted into stating two falsehoods: it listed `pharn-core` as "still **planned**" while `pharn/pharn-core/seam-resolver/` was built and cited two bullets earlier in the same section, and it said "three contracts" while `pharn/pharn-contracts/` held four — the disease of lesson L1 at README scale. The factual core now renders between one `<!-- CURRENT-STATE:BEGIN -->` / `<!-- CURRENT-STATE:END -->` marker pair from the live repository: capabilities per role (via the **same** `enumerateCapabilities()` the capability catalog uses, mirroring `pharn/floor/validate.mjs`'s `role:` frontmatter test), contracts, product vs `pharn-dev-` commands, hook scripts, and floor checkers — so both falsehoods disappear as a **consequence of generation**, not as separate edits. Roles with zero instances render as `0` rather than vanishing (the honest read is "the enum exists, instances don't"). One renderer serves both the generator and the checker, so recompute is byte-identical to generate by construction (P3); both marker lines sit **inside** the guarded region, so hand-editing a marker is itself drift. The generator splices strictly between an existing pair and **hard-errors** on a missing, duplicated, or inverted pair — it never invents a marker or guesses a boundary — and enumeration fails closed on a missing directory or a non-inert basename rather than rendering a plausible `0`. Wired into the existing `npm run docs:generate` / `npm run docs:check` pair with **no new npm script and no CI change** (the existing docs step covers it). The guarantee (P0) is narrow and stated in the checker's own header: **byte-equality** (committed block == recomputed block) plus marker-occurrence counting — it is **not** a guarantee that the content is true (a wrong enumerator would regenerate cleanly and stay GREEN), the capability count's agreement with `validate.mjs` is **advisory** (a mirrored implementation, not a shared one), and README prose **outside** the markers stays hand-written, advisory, and **unguarded**. **`SKILLS_VERSION` is NOT bumped**, by rule rather than precedent: everything touched is build apparatus (`.dev/floor/**`, `*.test.*`) or pure repo-meta (`README.md`, `CLAUDE.md`, `CHANGELOG.md`) — per CLAUDE.md § _SKILLS_VERSION discipline_, "Pure repo-meta … does not bump either — it is not methodology a user runs" — and no path in the increment is in the bump-triggering set. Known accepted cost, recorded rather than hidden: `capability-catalog-core.mjs` now renders **two** artifacts and its filename names only one (P3); the alternative split was put to the human at the plan gate and this shape was chosen deliberately.

### Fixed

- **Corrected the relocated floor checkers' stale `.dev/floor/` self-paths.** When the checkers moved `.dev/floor/` → `pharn/floor/`, their line-2 headers, cross-reference comments, and `console.log` usage strings kept naming the OLD directory, so 58 files under `pharn/floor/` misdescribed their own location. Rewritten by an **existence-gated** rule — a literal `.dev/floor/<B>` becomes `pharn/floor/<B>` **iff** `pharn/floor/<B>` exists as a real file — which structurally cannot touch the paths that must stay: files still resident in `.dev/floor/` (the `scan-plan-*` grill-scanners, referenced from `scan-code-secrets.mjs`), the `fake*.md` mock-fs fixture keys whose whole purpose is asserting floor-dir EXCLUSION, and the `.dev/floor/`-as-excluded-segment / P3-boundary mentions. 57 files / 129 lines by the token rule, plus 6 hand-corrections in `lens-scanner-map.test.mjs` and `check-structural.test.mjs` where the stale text is a bare directory, a glob, or a no-trailing-slash form the token rule cannot match. **Not purely cosmetic, stated precisely:** five of the rewritten sites are operative code — the `console.log`/`console.error` usage strings in `check-seam-config.mjs`, `check-spec.mjs` (×2), `check-spec-approved.mjs`, and `check-plan-spec-agree.mjs` — so **program output text changes**; no control flow, and no path is affected, because **no** checker derives a path from these strings — they occur only in comments and in printed usage text, never in an `fs` call; the two that need their own location at all (`check-plan-spec-agree.mjs`, `check-spec-approved.mjs`) resolve it through `dirname(fileURLToPath(import.meta.url))`, and the other 33 never resolve self-location. The floor backstop is honest about its reach (P0): `npm test` catches a mutated fixture key (those keys are asserted exactly) but **not** a botched usage-string rewrite (`check-plan-spec-agree.test.mjs` and `check-spec-approved.test.mjs` assert only `/usage/`, which matches either spelling). `SKILLS_VERSION` → `1.1.2` — a **patch** bump: 28 of the touched files are product-floor checkers (`pharn/floor/*.mjs`), squarely in the bump-triggering set, and per CLAUDE.md § _SKILLS_VERSION discipline_ prose-only edits to shipped bytes bump too.

- **SHA-pinned the two remaining bare-tag actions in `.github/workflows/floor.yml`**, bringing it in line with the already-pinned `ci.yml` / `codeql.yml` / `gitleaks.yml`: `actions/checkout@v7.0.1` → `@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` and `actions/setup-node@v7` → `@820762786026740c76f36085b0efc47a31fe5020 # v6`, both digests **copied verbatim from `ci.yml`** rather than resolved over the network (inventing or fetching a digest would be the injectable move). Honest scope (P0/P7): this is **defense-in-depth consistency, not the closing of an exploitable hole** — `floor.yml` already runs `pull_request` (not `pull_request_target`) with `contents: read` and no secrets, so its blast radius was minimal either way; and the immutability benefit is a **GitHub-platform property**, not a PHARN floor reduction — no checker enforces action-pin shape. Note the setup-node move is also a **major-version downgrade v7 → v6**, adopted deliberately to remove the skew against the rest of the repo; both workflows pass `node-version: lts/*`, so no resolution change is expected. **`SKILLS_VERSION` is NOT bumped by this item** — CI config is repo-meta, not methodology a user runs.

## [1.1.1] - 2026-07-23

### Changed

- **Corrected the ship-attestation entry's overstated `/pharn-loop` relationship, and documented the feature in the architecture (docs-only).** The `Added` entry above frames `ship.requireAttestation: true` as an opt-in that "halts-and-asks" in the `/pharn-loop` flow — that overstates it. `/pharn-loop` ends at **GATE 2** (writes `LOOP.md`) and **never runs attestation**; attestation is a **human-run `/pharn-ship`** concern ([`pharn/ARCHITECTURE.md §6`](./pharn/ARCHITECTURE.md), [`pharn/pharn-contracts/ship-record.md`](./pharn/pharn-contracts/ship-record.md)), so `requireAttestation` gates only that stage and **cannot stall the loop**. Also added the ship-record/attestation description to `ARCHITECTURE.md §6` and clarified the `/pharn-ship` Step 3b (attestation) prose — its gate-read sub-step (2, "Read the gate") and verdict-render sub-step (4, "Verify + render the clause"). No behavior change. `SKILLS_VERSION` → `1.1.1` — a **patch** bump: these are shipped-surface edits (the `/pharn-ship` and `/pharn-loop` command prose plus `pharn/ARCHITECTURE.md`), so a `pharn init` install now carries changed bytes.

## [1.1.0] - 2026-07-22

### Added

- **Named-human "read the record" attestation at `/pharn-ship`** ([`pharn/pharn-contracts/ship-record.md`](./pharn/pharn-contracts/ship-record.md), [`pharn/floor/check-attestation.mjs`](./pharn/floor/check-attestation.mjs)) — the terminal ship stage may now carry an OPTIONAL attestation block `{ by, at, record_hash }` in which a **named human** attests to having **READ** the ship-record, **content-bound** by a hash. The floor is narrow and honest (P0): `check-attestation.mjs` verifies the block's **shape** (enum/regex) and **recomputes `record_hash`** (content-hash) — a record edited after attestation reads `stale`, detectable not silent, the same mechanism as `spec_content_hash`. Everything else is ADVISORY: that a real human (not the agent) supplied `by` (the command **forbids agent self-fill** and elicits it interactively; git authorship is corroborating only), and — stated explicitly — **attestation ≠ comprehension**. The seal renders `· attested by <name>` (present ∧ hash-valid) or `· unattested` (absent); `/pharn-ship` still never self-issues the `PHARN ✓ reviewed` seal or the merge decision (the human's GATE-2 call). A new config key `ship.requireAttestation` (default `false`) keeps `/pharn-loop` fully autonomous by default — absent attestation → ship proceeds unattested, never waiting; `true` is an explicit opt-in that halts-and-asks. `SKILLS_VERSION` → `1.1.0`.

- **The product pipeline, as runnable commands** — the full `spec → plan → grill → build → regress → verify → ship` spine (`ARCHITECTURE.md §6`) shipped as [`/pharn-spec`](./.claude/commands/pharn-spec.md), [`/pharn-plan`](./.claude/commands/pharn-plan.md), [`/pharn-grill`](./.claude/commands/pharn-grill.md), [`/pharn-build`](./.claude/commands/pharn-build.md), [`/pharn-regress`](./.claude/commands/pharn-regress.md), [`/pharn-verify`](./.claude/commands/pharn-verify.md), and [`/pharn-ship`](./.claude/commands/pharn-ship.md) — the last a gated meta-orchestrator over stages 1–6, with at most one bounded build-completion retry on an INCOMPLETE verify. Each downstream stage re-verifies the spec→plan content-hash chain (`.dev/floor/check-plan-spec-agree.mjs`) and reuses the existing floor checkers; no stage self-approves, and the two human gates (SPEC approval, post-verify decision) are non-negotiable.

- **`/pharn-review` — parallel code-review lenses, deterministically merged** ([`.claude/commands/pharn-review.md`](./.claude/commands/pharn-review.md)) — runs the `pharn-review/*` lenses as parallel subagents, then merges and de-duplicates their findings into one `findings.json` keyed only on enum-gated fields (`.dev/floor/merge-findings.mjs`); lens membership is floor-derived from frontmatter (`.dev/floor/count-lenses.mjs`), not prose. The parallel spawn and per-lens judgment are advisory; the merge is the floor.

- **22 code-review lenses** (`pharn-review/*`, `role: lens`, each enforcing P2 with committed evals) — `trust-fence`, `secrets-in-code`, `injection`, `input-validation`, `unsafe-deserialization`, `path-traversal`, `insecure-crypto`, `ssrf`, `hallucinated-api`, `swallowed-exception`, `placeholder-as-done`, `duplicated-logic`, `copy-paste-drift`, `null-deref`, `resource-leak`, `off-by-one`, `missing-await`, `magic-values`, `race-condition`, `missing-timeout`, `n-plus-one`, and `missing-error-handling`. Most ship a companion deterministic scanner (`.dev/floor/scan-code-*.mjs`).

- **13 grillers** (`pharn-pipeline/grillers/*`, `role: griller`, advisory PLAN interrogators enforcing P7/P3) — `testability`, `architecture`, `security`, `error-handling`, `performance`, `migrations`, `documentation`, `a11y`, `i18n`, `observability`, `privacy`, `comprehension`, and `coupling`. Several ship a partial presence-check floor (`pharn/floor/scan-plan-*.mjs`, `count-grillers.mjs`).

- **The seam-config contract + validator** (`pharn-contracts/seam-config.md`, `.dev/floor/check-seam-config.mjs`) — a deterministic seam-resolution config contract enforcing P0/P5.

- **The writes-scope guard, fix #7** (`.claude/hooks/enforce-writes-scope.cjs` + `.claude/hooks/set-writes-scope.cjs`) — a second `PreToolUse` hook, wired in `.claude/settings.json`, that confines every command's writes to its declared `writes:` scope (parsed deterministically by the setter), fail-closed to a default-safe-set when no scope is set.

- **The memory-promote command + provenance checker** (`.claude/commands/pharn-dev-memory-promote.md`, `.dev/floor/check-provenance.mjs`) — a P2-gated mechanism for promoting one lesson/pattern to the canonical memory-bank. It automates the _mechanics_ (assemble the entry, capture provenance deterministically, validate shape, detect duplicate ids, set the fix #7 writes-scope to the one target canon file) and **HALTS for explicit human accept/deny before any write** — it never self-promotes. `check-provenance.mjs` is the deterministic floor reduction of `ARCHITECTURE.md §5`'s "provenance per entry": it rejects a candidate with missing/malformed provenance, a duplicate id, or a target outside the two prescription files (`lessons-learned.md` / `pattern-library.md`). Stdlib-only; ships a `node --test` suite. The honest split (P0): the floor guarantees valid provenance + a unique id + a write confined to the declared canon file — **not** that the lesson is correct or wise (that is the human's advisory accept/deny).

- **The eval-format contract** (`pharn-contracts/eval-format.md`) — the structural-vs-semantic split for eval assertions: `structural[]` (floor-reducible) versus `semantic[]` (advisory llm-judge), keyed by a `skill_kind` discriminator.

- **The structural checker** (`.dev/floor/check-structural.mjs`) — a deterministic, dependency-free floor piece that executes an eval's `structural[]` assertions against a skill's already-produced finding output (`finding_count`, `field_equals`, `file_resolves`, `needle_absent_from_enum_gated`, plus the `skill_kind` rule) and exits non-zero on any RED. Ships with a `node --test` suite; reviewed in `.dev/features/structural-checker/REVIEW.md`.

- Repository governance files: `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, and `SKILLS_VERSION`.

### Changed

- **Split the repo into a dev/product boundary** — moved the build apparatus under `.dev/` (`.dev/floor/` checkers + tests, `.dev/features/` audit trails, `.dev/memory-bank/`), excluded wholesale by `.dev/floor/validate.mjs`; the product surface stays at the root (`pharn-review/`, `pharn-pipeline/`, `pharn-contracts/`). Commands split by name prefix — `pharn-dev-*` (apparatus) vs `pharn-*` (product) — since `.claude/commands/` cannot move.

- Reframed the repository from "PHARN bootstrap" to **PHARN-OSS** — the product/methodology itself, self-hosting and early-stage — across all docs and metadata; renamed the package `pharn` → `pharn-oss`. No change to the released surface (the floor, the write-guard hook, the build/review commands, or capabilities).

## [1.0.0] - 2026-06-23

### Added

- **The spec** — the four trusted, human-only documents: `CONSTITUTION.md` (the eight principles, P0–P7), `ARCHITECTURE.md`, `THREAT-MODEL.md`, and `LIMITS.md`.
- **The floor** — `floor/validate.mjs`, the deterministic, dependency-free validator (frontmatter and required fields, evals, the `rule_id`↔eval binding, enums, and the finding shape).
- **The write-guard hook** — `.claude/hooks/protect-trusted-paths.cjs`, a `PreToolUse` hook that denies agent writes to the four trusted docs.
- **The commands** — `/plan`, `/build`, and `/review` (`.claude/commands/`).
- **Dev tooling** — ESLint, Prettier, and markdownlint configuration; the `npm run check` aggregate gate; and a `node --test` suite covering the write-guard hook and the floor.
