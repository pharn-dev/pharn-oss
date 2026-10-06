# Floor CLI reference — acceptance-criteria tests

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before planning a change to, running, or citing one of the CLIs below.

Read only the section for the CLI you are touching. Positional words inside an entry (`above`, `below`, `further up`)
come from the single code block this text was moved from, so the entry they name may now sit in another
`.dev/guides/floor-*.md` file: search for it by file name.

## `check-ac-tests.mjs` / `ac-tests-lock.mjs` / `check-red-run.mjs` — AC tests and the red run

```bash
# AC TESTS BEFORE THE BUILD (added 6.17.0) — /pharn-test writes each Acceptance Criterion's test BEFORE /pharn-build,
# from the Approved SPEC, the PLAN and pharn/features/<name>/AC-TESTS.md, which /pharn-plan writes (Step 4c, templated
# SPEC only): frontmatter spec_id + spec_content_hash, `## Files` = exactly the test files (it is /pharn-test's
# --from-plan scope), `## Mapping` = one `- AC-<n> | <level> | `<file>` | <public target>` line per AC. check-ac-tests.mjs
# REDs on a closed kind set (missing/duplicate/unknown AC, level-mismatch, unlisted/unmapped file, in-plan-files — the
# build's scope would cover it —, claimed-elsewhere, bad-path, no-files, malformed-line, pin via the SHELLED
# check-plan-spec-agree.mjs, since 6.18.0 spec-kind, since 6.21.0 test-infra-in-plan — a ROOT runner config the lock's
# test-infra pin covers named in PLAN.md `## Files`, matched through test-infra-core.mjs's own isRunnerConfigName, and
# since 6.31.0 also a root package-manager config (.npmrc/.yarnrc/.yarnrc.yml) or a file a level gate's script NAMES
# (test-infra-core scriptNamedFiles over the tree — the review's H2 wB: a PLAN-scoped build wrote the pharn-json
# reporter) —, and since 6.31.0 ac-artifact-in-plan — THIS feature's AC-TESTS.md or AC-TESTS.lock.json in PLAN.md (the
# review's H2: a build scoped to the lock re-pinned its own change with every check green; LOCK_NAME is a literal,
# parity-tested against ac-tests-lock.mjs, never imported); package.json / pharn.config.json there print an ADVISORY
# `NOTE —` line and never change the exit code — every part of package.json the pin READS is still compared at verify
# and cannot be re-pinned through the build's scope, a composition a ★ HOOK test executes; the parts it does not read
# stay changeable, as the NOT-caught list states); exit 0/1/2. ac-tests-lock.mjs --write/--check pins the tests
# in AC-TESTS.lock.json (schema ac-tests-lock/5 since 6.36.0 — /4, /3, /2 and /1 still read; closed keys per mode; test_infra
# is the test-infrastructure pin, see THE AC GATE below); --check names a PATH, never content. The mapping grammar lives in ac-tests-core.mjs. AC-TESTS.md and the lock are PIPELINE_ARTIFACTS (regress-exempt); for reconcile
# AC-TESTS.md is exempt like PLAN.md (a re-plan rewrites it) but the LOCK is `pre_anchor_artifacts` (NOT exempt).
# Paths are compared as the setter SCOPES them (clean + isConcrete, case-folded). `--spec <SPEC.md>` decides
# templated (0) / legacy (3) / bootstrap (4, 6.18.0) before any mapping exists; in full mode a legacy or test-infra
# SPEC with a mapping is RED. A `spec_kind: quick` SPEC (6.25.0, /pharn-ship --quick) is TEMPLATED (0) and reaches
# full mode exactly like `feature` — both are TEST_FIRST_KINDS members (spec-template-core.mjs), so the full-mode
# gate REDs `spec-kind` on membership in that set, never a literal `=== "feature"` test.
# /pharn-regress's --declared is PLAN `## Files` u AC-TESTS.md `## Files`. BOUNDS: the build exclusion holds for the
# PLAN.md checked (a later PLAN edit reopens it until /pharn-build re-checks it first thing — since 6.19.0, via check-test-stage); /pharn-test runs before the
# reconcile anchor, so its own Bash writes are not reconciled; the tests' quality and "read only SPEC/PLAN" are
# advisory. Since 6.19.0 /pharn-ship and /pharn-loop run it (below). Contract: pharn/pharn-contracts/ac-tests.md.
#
# THE RED RUN (added 6.18.0) — /pharn-test RUNS the AC tests before the build and requires each to FAIL, so a test
# that cannot fail, is never collected or is skipped cannot pass unnoticed. check-red-run.mjs --preflight: every AC's
# level has a DISCOVERED gate (gate-run-core LEVEL_GATES: unit/integration → test, e2e → E2E_SET) with per-test
# results configured for EVERY such gate (6.36.0: a gate the project's gates.exclude lists is not discovered), else
# `ac-level-unavailable: AC-<n> (<level>)` and a closed last line `blocked: no-test-runner — …; suggested: <remedy>` —
# the `/pharn-ship "…(spec_kind: test-infra)"` command, or for an exclusion-caused AC the ids to remove from
# gates.exclude (since 6.36.0 check-ac-tests.mjs REDs that mapping row earlier, `level-excluded`) (/pharn-test --unattended prints it;
# interactive asks; never a nested run). run-gates --stage ac-test selects the gates BY ID from the levels and hands
# each its mapped files after `--` (--gates/--extra/--skip-style/--scope-json/--spec-from/--side refused; no
# reconcile, no build). check-red-run.mjs --verdict (red-run-core.mjs): per AC, over the record of every gate its level
# maps to, entries whose `file` EQUALS the mapped file (not case-folded) and whose LEAF title starts `AC-<n>:` —
# ≥1 (else ac-test-not-collected), none passed (ac-test-passes-before-build — NO escape hatch), none skipped
# (ac-test-skipped); item 01's record refusals are REDs by name, and (6.31.0) so is a per-test anomaly in a file mapped
# to that AC — one in any other file is `unmapped_anomalies`, printed as `NOTE —` lines, never the exit (the review's M6:
# a parametrized duplicate elsewhere had refused every AC). BOUND to the run: validateStamp as ac-test for the
# feature, each run's files == the mapping's, LIVE fingerprint == stamp.fingerprint.final (the lock and the tests are
# in it). The convention it rests on: unit/integration AC tests import their target INSIDE the test body —
# a top-level import of a not-yet-built module is a file load failure, i.e. not collected (measured on real vitest
# 5.0.1: pharn/floor/test-fixtures/test-results/vitest-red.json, and Jest 30.5.2: jest-red.json). The in-body FORM must
# be one the runner's module mode can run, or it fails before AND after the build and the red run cannot tell (6.22.0,
# measured): `await import()` under vitest, Jest ESM mode, babel-jest+preset-env and next/jest; `require()` under plain
# CommonJS Jest, where `await import()` stays red forever (jest-after.json). ac-tests-lock.mjs --record-red-run re-derives the
# verdict and writes `red_run` {stamp_sha256, files_sha256, gates, acs}; `--check --require-red-run` is the question
# "did a red run happen" (plain --check GREEN never means that) — a bootstrap lock FAILS it unless the caller also passes
# --allow-bootstrap (only /pharn-test's Step B does), and a bootstrap lock is written/checked only over an Approved,
# un-drifted SPEC (check-spec-approved.mjs, shelled). BOOTSTRAP: SPEC frontmatter `spec_kind: test-infra`
# (spec-template rule 8; the PIN covers a spec_kind line — check-spec pinHash — so flipping it after approval is
# drift) → no mapping, no tests, no run; --write-bootstrap records mode bootstrap + the SPEC's levels — WEAKER, and
# the lock says so. BOUNDS: "failed" is the record's status (a test failing on its own typo reads the same —
# advisory); agreement, not provenance (a self-consistent forged results file + stamp over the live tree passes);
# stamp/results digests are recorded, not re-checkable after the next init wipes <out>.
node pharn/floor/check-ac-tests.mjs <AC-TESTS.md> <SPEC.md> <PLAN.md> [--features-dir <dir>]
node pharn/floor/check-ac-tests.mjs --spec <SPEC.md>
node pharn/floor/ac-tests-lock.mjs (--write | --write-bootstrap) <name> [--base <features-dir>]
node pharn/floor/ac-tests-lock.mjs --record-red-run <name> --out <dir> [--base <features-dir>]
node pharn/floor/ac-tests-lock.mjs --check <name> [--require-red-run [--allow-bootstrap]] [--base <features-dir>]
node pharn/floor/check-red-run.mjs --preflight --ac-tests <AC-TESTS.md> --discover <package.json> --root <dir>
node pharn/floor/check-red-run.mjs --verdict --ac-tests <AC-TESTS.md> --out <dir> --root <dir>
```

## `check-test-stage.mjs` — the test-stage gate

```bash
# THE TEST-STAGE GATE (added 6.19.0) — did the test stage complete for this feature's CURRENT SPEC and PLAN? ONE checker,
# read by /pharn-build (Step 0, BEFORE its scope set and anchor, so a refusal leaves neither), /pharn-ship and
# /pharn-loop (after /pharn-test, between grill and build), and check-loop-fresh.mjs check I (after every build and at
# the commit gate). It SHELLS the checkers above and owns only the branch: `--spec` 0 → the full mapping check + a
# test-first lock with `--check --require-red-run` AND (6.20.0) the test-infra pin → READY test-first; 4 → a bootstrap lock with
# `--allow-bootstrap` → READY bootstrap; 3 → no AC-TESTS.md and no lock → NOT-APPLICABLE legacy-spec. Else
# `RED <reason>` ∈ {spec-unusable, no-mapping, mapping-red, no-lock, lock-red, lock-unusable, lock-mode-mismatch,
# legacy-with-mapping, mode-not-allowed}; `--require-test-first` (passed by /pharn-loop and check-loop-fresh) turns any
# other pass into mode-not-allowed — the loop's policy in the checker; lock-mode-mismatch exists because a test-first lock's own --check never reads SPEC.md. Children
# run in the caller's cwd (test paths resolve there). BOUNDS: NOT-APPLICABLE is decided by spec_template, which the pin
# does not cover — /pharn-loop (which never writes a legacy SPEC) refuses it as S9; tree identity, not recency; a
# pinned test rewritten by a mutating gate after the red run is a STOP in the loop, never a re-run (/pharn-test cannot
# re-run after the build). /pharn-loop's S12 `blocked: no-test-runner` is decided by its own pinned
# check-red-run --preflight exit, never by relayed text, and its Step 6c commit stages the lock and every pinned test
# (exit 4, `not committed: stage failed`, if one is not a regular, non-ignored file). Exit: 0 READY/NOT-APPLICABLE ·
# 1 RED · 2 unusable — including (6.20.6) a child that CRASHED: exit 1 without its closing `RED — ` stdout line, which
# before read as that child's RED (S13 in the loop); and (6.21.1) a child reporting that a checker IT shells crashed —
# exit 2 with `UNUSABLE child-crashed — …` first (check-plan-spec-agree under check-ac-tests, check-spec-approved under
# ac-tests-lock; one rule, pharn/floor/shelled-verdict-core.mjs). A crash one level further down is still read by its
# parent as its own RED (bound in the contract). Contract: pharn/pharn-contracts/ac-tests.md, "The test-stage gate".
node pharn/floor/check-test-stage.mjs <name> [--base <features-dir>] [--require-test-first]
```

## `check-verify.mjs --ac-gate` — the AC gate

```bash
# THE AC GATE (added 6.20.0) — was every Acceptance Criterion DELIVERED on the head verify run? pharn/floor/ac-gate-core.mjs,
# folded into /pharn-verify's FLOOR verdict by check-verify.mjs --stamp … --ac-gate (stage-verify.mjs's verdict call; the flag
# requires --stamp, the root is the invoking directory, the per-test files sit beside the stamp). An AC is delivered =
# a locked, once-red test titled AC-<n>:, in a file mapped to AC-n, passed on the head run — matched FILE-SCOPED by
# red-run-core.mjs observeAc (the one copy), so another feature's AC-1: never counts; PHARN does not judge whether the
# test captures the AC's intent. The SPEC's ACs are the set (an unmapped AC is ac-never-red). Reasons, a closed
# partition: DELIVERY {ac-untested, ac-not-passed, ac-skipped} → failing_gates += ac-delivery (FAIL; /pharn-loop
# iterates); EVIDENCE {ac-tests-modified, ac-never-red, test-infra-changed, test-infra-unpinned} → += ac-evidence (FAIL;
# check-loop.mjs STOP_TERMINAL with terminal_cause ac-evidence → S13 blocked: ac-evidence-invalid); item 01's record
# reasons → INCONCLUSIVE over green gates (a red gate beats it; no reason_code). OVER AN INCOMPLETE BUILD (6.20.4):
# only a red real gate or an EVIDENCE reason beats INCOMPLETE — delivery and unmeasured readings yield to it (the
# ac_gate block stays in the report), because before 6.20.4 the AC gate came first and INCOMPLETE was unreachable
# under --ac-gate, which /pharn-verify always passes, so /pharn-ship Step 2b's rebuild could not fire. A level gate run
# through an explicit --gates is test-infra-changed (test-first) / ac-untested (bootstrap) BY DESIGN; its detail names
# the explicit source and /pharn-verify's reference section says not to pass --gates for such a feature. Both ids are
# RESERVED_IDS and never enter `gates`. Legacy SPEC → NOT-APPLICABLE, stated (with AC evidence beside it → ac-tests-modified); spec_kind:
# test-infra → BOOTSTRAP, weaker, labelled. THE TEST-INFRA PIN (lock schema ac-tests-lock/5 since 6.36.0, /4 since 6.31.0,
# test-infra-core.mjs, written by --write BEFORE the red run): the level gates' package.json script VALUES + pre/post
# scripts + testResults formats, root vitest/vite/playwright/jest config files in a CLOSED name set (matched FOLDED since
# 6.21.0 — on APFS a `Vitest.config.mjs` is the runner's config), and since 6.31.0 (the review's H2 + the GATE-1
# amendment) every script a pinned value CHAINS to (transitively, own-property only, REFUSED past MAX_CHAIN_HOPS = 8),
# every regular file a pinned value NAMES (script_files — a pharn-json reporter), package.json's `jest` key (a canonical
# JSON digest, null when absent) and the root .npmrc/.yarnrc/.yarnrc.yml (hash only) — all through ONE closed literal
# token pass (scriptTokens/scriptPathCandidates/chainedIds; never a shell parse; outputs after `>`, -o or an
# --out… flag skipped); the gate also requires each level gate to have run as the pinned `npm run <id>`. NOT caught,
# stated ONCE in test-infra-core.mjs's header (restated in the contract), FIRST the in-process bound: code the build
# writes runs INSIDE the test process and can switch off the assertions or the reporter there (`assert.equal = () =>
# {}` → verify PASS, measured) — so a green pin NEVER means the build could not forge the AC gate; then imports of a
# pinned file, env-driven config and user/global npmrc, other package.json keys (mocha, ava, dependencies), chains the
# rule does not read (npm-run-all, --prefix, bun), tsconfig, and more. STATED COSTS: a source file a test-reachable
# script names literally (a bundler entry) is pinned too, and a committed .npmrc digest lets a low-entropy credential
# in it be guessed offline. /2 and /1 locks are still read (mode, never schema, decides bootstrap) and read
# test-infra-unpinned at verify, and (6.31.0) a /3 lock is judged by what it pinned, while what only /4 pins in the live
# tree reads `unpinned` (--check RED, AC gate test-infra-unpinned) — the remedy sets the build aside and re-runs
# /pharn-test (its red run cannot pass over a built tree). A /4 lock is lock-unusable to a pre-6.31.0 floor, never
# GREEN (rolling back means re-running /pharn-test there). 6.36.0 (/5): the pin adds `exclude`, the project's whole
# declared `pharn.config.json` `gates.exclude` list (GATE EXCLUSION, further up); a /4 lock reads `unpinned` only when a
# non-empty declaration exists, and every --write now writes /5, so a pre-6.36.0 floor reads it lock-unusable. IN THE LOOP: check-loop-fresh E re-derives WITH --ac-gate and compares ac_gate (when the tree moved,
# 6.20.6: it re-derives WITHOUT the flag and compares what the stamp alone decides — gates, the non-AC failing ids and
# the verdict rule — so only the AC part defers to F; the AC ids come from gate-run-core AC_RESERVED_IDS, not from
# ac-gate-core, so the checker's own load graph does not grow); J re-hashes per-test results files;
# check I's test-stage RED (exit 1, a RED token) is its own code, ac-evidence-invalid → S13 (the other front checks,
# and a test-stage exit 2 or crash, keep front-stage-red).
# BOUNDS: "passed" is the reporter's word; agreement, never provenance (L43); since 6.31.0 a flaky test or expected
# failure the report MARKS, or a duplicate id, makes UNMEASURED only an AC whose mapped file holds it (the anomaly's own
# reason, INCONCLUSIVE) and is otherwise reported in ac_gate.unmapped_anomalies, read by no verdict — before, one
# ANYWHERE voided the record; an unmarked one reads as its raw status (test-results-record.md); the file an anomaly
# names is the reporter's word. check-verify.mjs still spawns nothing. Contract: pharn/pharn-contracts/
# ac-tests.md "The AC gate" + verify-report.md "The additive ac_gate block".
node pharn/floor/check-verify.mjs --stamp <stamp.json> --feature <name> --ac-gate
```
