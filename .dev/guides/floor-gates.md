# Floor CLI reference — the gate runner and the regress/verify/build stage scripts

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before planning a change to, running, or citing one of the CLIs below.

Read only the section for the CLI you are touching. Positional words inside an entry (`above`, `below`, `further up`)
come from the single code block this text was moved from, so the entry they name may now sit in another
`.dev/guides/floor-*.md` file: search for it by file name.

## `run-gates.mjs` / `worktree-fingerprint.mjs` — the gate runner

```bash
# PRODUCE the verify/regress floor input map with TESTED CODE instead of model-typed prose (added 6.8.0).
# THE RECORDED FAILURE (P7, not a hypothetical): both stages compute a FLOOR verdict from a
# `{gate-id: exit-int}` map, and the MODEL typed it — verify's Step 3c captured five exit codes in Bash
# (`=$?`) and wrote the JSON by hand; regress's 4b said "record `0`" for an empty test set and "assemble
# each side into a flat map". So the KEYS (which gates are in the set) and the VALUES were both
# model-authored, and each checker judged whatever map it was handed. CHANGELOG 6.3.0 records a dogfooded
# /pharn-loop run that "skipped /pharn-grill, /pharn-regress and /pharn-verify entirely, hand-executed the
# equivalent work by judgment" and still wrote a floor-grade-looking decision; #222's fix re-derives a
# decision from the reports it cites and BY ITS OWN STATEMENT cannot see a report never honestly produced.
# L5 names the class, L30 why the ASKED-FOR gate is the skipped one, L20/L46 make the recurrence the
# trigger. THREE FILES, three reasons to change (P3): gate-run-core.mjs is PURE (grammar, coverage, the
# closed reason_code set, stamp validation — no child_process, so both checkers' "no child process"
# headers stay true); worktree-fingerprint.mjs is git+hashing; run-gates.mjs is execution.
# FLOOR, given the stamp: the map's values ARE the exit codes the runner recorded from the listed argv (for a REUSED
# verify entry, 6.34.0, the exit recorded for the SOURCE execution its `reused` block names — see HEAD→VERIFY REUSE);
# the keys COVER the resolved source set (+ `reconcile` for verify); NO tree edit happened between
# consecutive gates (fp_after[k-1] == fp_before[k]); and `reconcile` ran LAST so it judges any write an
# earlier gate made. NOT COVERED BY THE STAMP ALONE, each stated: FRESHNESS (`fingerprint.final` is WRITTEN
# here; since 6.10.0 check-loop-fresh.mjs, below, is the consumer that compares it to the live tree);
# whether the stage ran AT ALL and whether the report on disk is the checker's output (both NARROWED by
# check-loop-fresh.mjs, never proven); WHO wrote an explicit --gates (only `source` is recorded); and FORGERY — it certifies
# INTERNAL CONSISTENCY, never provenance, a self-consistent FABRICATED stamp passes and a test BUILDS one
# to prove it (L43, in check-cost-ledger.mjs's words).
# BUILD-COMPLETENESS IS NOT A GATE, and that separation is load-bearing: the runner CAPTURES
# check-build-complete.mjs's exit (so it is not model-typed) into `aux.completeness`, a SIBLING of runs[],
# and check-verify.mjs reads it onto its EXISTING --complete path. Folding it into the gates map would make
# an incomplete build a RED GATE, so the verdict would be FAIL (exit 1) and INCOMPLETE (exit 3) UNREACHABLE
# — silently disabling /pharn-ship Step 2b's single bounded rebuild (reachable only from INCOMPLETE) and
# collapsing check-loop.mjs's `v in {FAIL, INCOMPLETE}` distinction. Surfaced as GRILL finding R1 BEFORE the
# build, not at review. `reconcile` is the opposite case and IS a gate, exactly as it is today.
# THE FINGERPRINT'S TWO EXCLUSIONS answer a DIFFERENT question from reconcile-ignore.json's (L39): reconcile
# asks "may this change after the build anchor?", this asks "does a change here alter what the gates
# judged?". They diverge on SPEC/PLAN/GRILL/BUILD.md, which reconcile exempts and this INCLUDES (and, since
# 6.17.0, AC-TESTS.md / AC-TESTS.lock.json, which this INCLUDES and reconcile does NOT exempt either — they are
# `pre_anchor_artifacts`, written before the build's anchor). A partition test pins EXCLUDED u INCLUDED ==
# reconcile-ignore.json pipeline_artifacts.names u pre_anchor_artifacts.names, so a new pipeline artifact
# fails CI until someone classifies it for both consumers — and its bound is L43's: it certifies the three
# stores AGREE, never that the set is correct. `.pharn/` is excluded EXPLICITLY and that is load-bearing in
# THIS increment, not only the next: enumerate() derives exclusion from git-ignore, so in an install that
# does NOT ignore `.pharn/` the runner's own logs would move the fingerprint between EVERY pair of gates and
# refuse every run. MEASURED, never inherited (L24): 1925 paths, ~463 ms cold / ~75-85 ms warm on this repo.
# BOUNDS: POSIX only; gates assumed order-independent; a `setsid` descendant escapes the group kill; a
# harness SIGTERM/SIGINT/SIGHUP before --timeout-ms is FORWARDED to the gate's group and the runner dies by it,
# recording nothing (6.50.1); a harness SIGKILL orphans the group until the next `run --next` recovers the stale
# lock, which first stops the group <out>/lock.child names (audit P3-P), so the Bash-tool timeout must still
# EXCEED it; test-level gates (CI_GATE_IDS) get CI=1 unless CI is already defined, so vitest/Jest refuse a new
# snapshot (audit P2-F); validateStamp and finalize also refuse fingerprint.init != runs[0].fp_before as
# tree-changed-between-gates (audit P3-J); --timeout-ms is REQUIRED (floor code carries no harness-specific default, so there is no default for a
# test to leave unexercised — L41); `--gates` splits on commas, so a command containing one needs a wrapper;
# gate stdout/stderr are UNTRUSTED free text, written by fd and reduced to a sha256, and NO verdict reads
# their content; logs are bounded per stage by init's recreate of <out> and are otherwise unbounded across
# /pharn-loop iterations. The runner writes ONLY inside the state root (containment-checked, no symlink
# component), so it needs NO reconcile-ignore.json exemption. EVERY path operand (--out, --spec-from,
# --discover, --scope-json, --ac-tests) resolves against the INVOKING directory, whose `.pharn/` is that state root;
# --cwd moves only where gates RUN and which tree is fingerprinted (6.9.3 — before it, init resolved --out
# and --spec-from against --cwd while `run --next` did not, so /pharn-regress's base side, the one --cwd
# caller, failed at init with spec-mismatch; its pinned lines are now EXECUTED by stage-regress.test.mjs, since
# 6.23.0 moved them from pharn-regress.md's own prose into pharn/floor/stage-regress.mjs; /pharn-verify's runner lines
# moved the same way in 6.26.0, into pharn/floor/stage-verify.mjs, whose ★ WIRING test executes pharn-verify.md's
# pinned line). Contract:
# pharn/pharn-contracts/gate-run-record.md. Ships: bumps SKILLS_VERSION.
# Exit: init 0 ok | 2 runner error (closed reason_code) | 3 EMPTY SOURCE SET (nothing written; routes to the
# existing no-gates HALT, and to /pharn-loop's unattended S4 `blocked: no-gates`) ·
# run 0 an entry ran (a FAILING GATE IS DATA, not a runner error) | 2 runner error | 3 nothing left.
node pharn/floor/run-gates.mjs init --stage verify|regress|entry [--side base|head] --feature <name> --out <dir> [--cwd <dir>] [--discover <package.json>] [--gates "<cmd>[::<id>],…"] [--extra <json>] [--scope-json <f>] [--skip-style] [--spec-from <dir>] [--reuse-stamp <f> --reuse-sha256 <hex>] [--base-tests <json-array-file>]   # --base-tests: entry only (6.49.0)
node pharn/floor/run-gates.mjs init --stage ac-test --feature <name> --out <dir> --discover <package.json> --ac-tests <AC-TESTS.md> [--cwd <dir>]   # 6.18.0, /pharn-test's red run
node pharn/floor/run-gates.mjs run --next --out <dir> --timeout-ms <N>
node pharn/floor/worktree-fingerprint.mjs [--base <dir>] [--feature <name>]
```

## Gate exclusion (`gates.exclude`)

```bash
# GATE EXCLUSION (added 6.36.0, gate-exclusion-config) — a project may declare in pharn.config.json
# `{"gates": {"exclude": [<ALLOWLIST ids>]}}` (pharn/floor/gate-exclusion-core.mjs, closed both ways; a bad one is
# `bad-gate-exclusion`, and an unparseable pharn.config.json now refuses discovery). `init --discover <m>` (no --gates)
# reads it beside <m> and resolveSet drops those ids from DISCOVERY at verify, at regress (after the e2e rule) and at the
# ac-test red run; an explicit --gates is never filtered. The stamp carries an optional `excluded` {declared_in, ids}
# only when discovery removed one (validateStamp shape-checks it), gateRunBlock copies it into both reports, and
# VERIFY.md / REGRESSION.md show a line under the verdict. /pharn-test pins the whole list (lock /5, below), and the red
# run's preflight REDs an AC whose level gates are all excluded. THE RECORDED FAILURE (P7): a user's e2e gate could not
# run on their machine and --gates makes the AC gate read test-infra-changed — two of three real loops stopped on it.
# BOUND: FLOOR when init resolves the set, never re-derived later (only the red run's bindStamp re-resolves); legacy and
# bootstrap SPECs pin nothing; /pharn-test runs before the reconcile anchor. Contract: gate-run-record.md.
```

## Per-test results (`PHARN_TEST_RESULTS`)

```bash
# PER-TEST RESULTS (added 6.15.0) — the runner hands EVERY gate one env var, PHARN_TEST_RESULTS, valued with
# that gate's OWN absolute path under <out> (gate-run-core's resultsFileName, one copy); a project's reporter
# config writes a machine-readable report there. The runner unlinks the path before the gate (a stale-lock
# re-run is not covered by init's wipe) and records runs[].results_sha256 — sha256 of a REGULAR file, else
# null — read through O_NOFOLLOW|O_NONBLOCK + fstat in chunks, so a symlink/FIFO/device is never followed or
# blocked on. The field is OPTIONAL: SCHEMA is unchanged and a pre-6.15 stamp still validates; a malformed
# value is stamp-malformed. `testRecord({stamp, outDir, gateId, root})` in pharn/floor/test-results-core.mjs
# (NO CLI, no defaults — L41) derives {id, file, title, status ∈ passed|failed|skipped} from that file, opted
# in by pharn.config.json `testResults: {"test" | "test:e2e" | "e2e": "jest-json" | "pharn-json" | "playwright-json" |
# "vitest-json"}` (jest-json and pharn-json since 6.22.0: Jest's built-in `--json` report, checked on Jest 29.7.0 and
# 30.5.2, and PHARN's own neutral schema `pharn-test-results/1`, closed in both directions, for any other runner; JUnit
# and CTRF were measured and not chosen, in test-results-formats.mjs's header; a Jest report still PARSES under
# vitest-json, which skips Jest's retry/failing markers — follow-up vitest-json-refuses-jest-shape) (the e2e
# gates, E2E_SET, since 6.16.0: discovered from a test:e2e/e2e script, run after build at /pharn-verify — resolveSet
# drops them from a DISCOVERED regress source (an explicit --gates string is not filtered), so an e2e-only manifest
# is empty-source-set there); the adapters live in
# test-results-formats.mjs (a reporter's format is its own axis, P3). Closed reasons (RECORD_REASONS), fail-closed
# PER RECORD for its integrity (a refusal voids it); since 6.31.0 PER TEST for its anomalies (ANOMALY_REASONS): one
# flaky test or expected failure the report MARKS (Playwright flaky/test.fail(), Jest's invocations > 1 and Jest 30's
# failing: true) is an `unknown-status` entry in the record's `anomalies[]`, and every id two tests share is ONE
# `duplicate-test-id` entry — never a test, never counted, the record still ok; the CONSUMER decides (below). Before
# 6.31.0 one such test ANYWHERE voided the record. An UNMARKED one reads as its raw status — vitest test.fails and pass on
# retry, Jest 29's test.failing, each measured and pinned. FLOOR: derived from the exact bytes the runner hashed
# (a later write is results-hash-mismatch — L58). NOT provenance (L43): "passed" means the reporter said so,
# and the test script, reporter config and pharn.config.json are all agent-editable; results-exit-contradiction
# (a failed test or suite error under exit 0) narrows a forgery, never closes it. No stage read the record in
# 6.15.0 (verify/regress verdicts are unchanged for every stamp the runner writes, but a malformed results_sha256
# is stamp-malformed and a results path the runner cannot clear is refused); since 6.18.0 /pharn-test's red run
# reads it, and since 6.20.0 /pharn-verify's AC gate does (check-verify.mjs --ac-gate — with that flag the verify
# verdict DEPENDS on the record; both below). Contract: pharn/pharn-contracts/test-results-record.md.
```

## `check-verify.mjs --stamp` / `check-regress.mjs verdict` — the stamp surface

```bash
# The two verdict cores gain an OPT-IN stamp surface; FLAG-LESS BEHAVIOR IS BYTE-IDENTICAL (regression-
# guarded by every pre-existing fixture, asserted as EQUIVALENCE over the whole fixture set, not one case).
# It is a PROVENANCE change, not a semantics change — neither decision table moved. `--stamp` is mutually
# exclusive with the positional map and requires --feature; an explicit --complete may accompany it and must
# then AGREE with aux.completeness. On regress, --base must be a RESOLVED 40-hex SHA, never a symbolic ref
# (a ref is re-resolvable, a stamp is not), and two checks exist only on that path: the base stamp's recorded
# `head` == --base, and the two sides' SPECS agree. Both reports gain an ADDITIVE, ADVISORY `gate_run` block
# and a `reason_code` on fail-closed exits — verified safe by READING all seven consumers, none of which
# validates a closed top-level key set.
# THE FLUSH RULE (6.20.4): check-verify, check-regress, check-loop and check-red-run END by setting
# process.exitCode (the first three unwind with a module-private sentinel only their top-level catch swallows) —
# never by an immediate exit, which dropped queued stdout: on darwin a piped verdict was cut at 64 KiB, and
# check-loop-fresh.mjs check E JSON.parses check-verify's through spawnSync. A crash still exits non-zero.
# pharn/floor/cli-stdout-flush.test.mjs pins the set statically (the platform-independent guard) and round-trips
# >64 KiB through a pipe (which discriminates only where piped stdout is asynchronous — not on CI's Linux).
node pharn/floor/check-verify.mjs --stamp <stamp.json> --feature <name>
node pharn/floor/check-regress.mjs verdict --base-stamp <p> --head-stamp <p> --base <40-hex> [--inside <list>]
```

## `stage-regress.mjs` — the /pharn-regress stage script

```bash
# THE /pharn-regress STAGE SCRIPT (added 6.23.0, stage-regress-script) — every deterministic step of the regress
# stage in ONE tested script, so `.claude/commands/pharn-regress.md` becomes a THIN CALLER: it pins one line and
# branches on the script's EXIT CODE. THE RECORDED TRIGGER (P7): a user's own /pharn-ship cost.json ledgers showed
# pharn's own stages at ~48% of relative cost on large features and ~81% on three small fixes, with /pharn-regress
# alone ~63% of the small fixes — today's command prescribed one Bash call per gate per side plus ~20 setup calls,
# each a full model turn re-reading a 36 KB prompt.
# THE PROTOCOL is `pharn/pharn-contracts/stage-exit.md` + `pharn/floor/stage-exit-core.mjs`: ONE `pharn-stage-exit/1`
# JSON object per exit — `{schema, status, stage, feature}` plus a status-specific closed key set (`done` adds
# verdict/report/render; `refused` adds reason_code/render; `question` adds reason_code/question/options/resume;
# `continue` adds phase/resume; `unusable` adds reason_code/detail) — CLOSED in both directions
# (`validateStageExit`). EXIT CODES: 0 done · 2 unusable · 3 refused · 4 question · 5 continue · anything else (1
# included) = CRASHED, deliberately never chosen by an emission (mirrors 6.21.1's "a crash is not read as a
# verdict"). A `question`'s text and every option's `label` are FIXED, registry-held strings per
# `(stage, reason_code)` — nothing untrusted is ever interpolated. `mayStartSlowStep` (the shared budget decision:
# a slow step starts on the invocation's first attempt, or while elapsed+timeout <= budget) lives here too, so every
# stage script reuses it without importing a sibling stage's core. The registry is keyed by stage; each stage script
# adds its own entry.
# THE SCRIPT, `pharn/floor/stage-regress.mjs` (execution) + `pharn/floor/stage-regress-core.mjs` (pure rules):
# 13 named phases in order (`fresh` -> `chain` -> `base` -> `partition` -> `head-init` -> `drain-head` ->
# `worktree` -> `install` -> `base-init` -> `drain-base` -> `verdict` -> `cleanup` -> `render`). "fresh" removes
# THIS feature's earlier regression-report.json/REGRESSION.md BEFORE any step that can fail, so a stop before the
# verdict leaves no earlier verdict on disk; an argv refusal (before that point) removes nothing, and since 6.26.0 a
# removal that FAILS for any reason but ENOENT is a crash (stage-runtime.mjs's removeIfPresent). The four CLOSED
# rules moved out of command prose: TEST_FILE_RULE (vitest/Jest/`node --test` conventions), STYLE_CONFIG_RULE (the
# config-touch skip for style/format gates), INSTALL_RULE (exactly one lockfile family at the BASE commit resolves
# the install command — npm MEASURED, pnpm/yarn/bun UNMEASURED, labelled as such), BASE_RULE (`--base` / a dirty
# tree / origin/main's merge-base / ask). `REGRESS_PATHS` is the ONE owner of the stage's `.pharn/pharn-regress/`
# scratch layout; `loop-fresh-core.mjs`'s `DEFAULT_STAMPS.regressHead`/`regressBase` derive from it.
# THE BUDGET (`--budget-ms`) solves the 600 s Bash-tool cap: a slow step (the base-commit install, or one gate)
# starts only if it is the FIRST slow step of THIS invocation, or `elapsed + timeoutMs <= budgetMs`; otherwise the
# script persists `.pharn/pharn-regress/stage.json` (schema `pharn-stage-regress-progress/4` since regress-base-integrity — `/2` (6.33.0) added the BASE-reuse decision, `/3` (6.49.0) the entry decision and `installOverride`, `/4` `baseSource`, `baseWorktree` and `installNeeded`) and exits 5
# `continue`. `--resume` accepts ONLY `--budget-ms` and reads everything else from that record, so the resume line
# carries no state (L44). With no `--budget-ms` (a code caller, never a Bash-tool caller), nothing is budgeted.
# `pharn/floor/render-regression.mjs` (pure, no CLI) renders `REGRESSION.md` from the verdict JSON, the scope
# partition and the stage's progress; a CHECKER'S MESSAGE (a chain-red/scope-escaped detail, a cleanup error, an
# inconclusive reason) is quoted as FENCED DATA; a GATE ID is quoted INLINE, via `dataText` alone — never fenced,
# and NARROWED here (M1, GATE 2 review — a prior version of this line overclaimed "as fenced DATA" for both): it
# is always preceded by fixed prose on the same line so it can never sit at column 0 and be read as a heading, but
# an inline link or raw HTML in an attacker-nameable id (a `structural:<path>` id, say) is NOT fenced away, only
# kept off a line of its own. (`pharn/floor/quote-core.mjs`'s `dataText`/`quoteData`, moved byte-for-byte out of
# `render-run-report.mjs` so a second renderer does not drag in the cost-ledger load graph.) Every path the SCRIPT
# itself supplies is repo-relative, so `/pharn-loop`'s later commit of the file can never carry an absolute path
# THAT SCRIPT SUPPLIED (M2, GATE 2: narrowed — a human's own `--install`/`--gates` text renders verbatim, and a
# `--gates` id defaults to its own command string, so the render is not proof that NO absolute path can appear at
# all, only that the script never introduces one).
# THE WEAKER CLAIM, stated plainly: before 6.23.0, fix #7's hook PREVENTED a Write-tool write outside the two
# declared regress artifacts. Now the script writes them through `fs`, reached via Bash and outside that hook
# (L19, declared) — a write anywhere else is DETECTED, never PREVENTED, by `/pharn-verify`'s `reconcile` gate.
# Offsetting it, STRONGER since 6.23.0: the command's writes-scope is set to the strictest one the setter can
# express, `.pharn/pharn-regress/stage.json` (which resolves to `.pharn/**` alone, since `writes: []` is refused
# by the setter), so no Write-tool write may land outside `.pharn/**` at all while the script runs — a real,
# probed guarantee (`.dev/floor/command-hygiene.test.mjs`'s STAGE_SCRIPT_WIRING).
# BASE-EVIDENCE INTEGRITY (regress-base-integrity, the 2026-10-07 audit's P1-B/P2-C/P2-D/P2-E). (1) The report records
# `base_source` (stage-regress-core.mjs BASE_SOURCES: explicit | dirty-head | merge-base); /pharn-ship now captures
# `git rev-parse --verify HEAD` right after its GATE-1 backstop and passes `--base`, as /pharn-loop does from S3. (2) The
# partition refuses `no-change-under-test` when nothing but this feature's artifacts or a trusted doc changed since the
# base (check-regress.mjs changedUnderTest) — a committed build under either implicit rule. (3) check-regress.mjs verdict
# reads a timed-out BASE run (gate-run-core.mjs timedOutRunIds, also the reuse rule's) as `inconclusive`/`base-timed-out`
# when its head is red, and lists `base_timed_out`; stamp-only, so check-loop-fresh E agrees. (4) The BASE checkout is a
# temp-root mkdtemp directory OUTSIDE the project (pharn/floor/base-worktree.mjs: name bound to the project's realpath,
# prefix clear that unlinks links and skips foreign entries, resume validation, path redaction in REGRESSION.md;
# `base-worktree-unplaceable` when TMPDIR points into the project) — so base gates no longer resolve HEAD's
# node_modules/.bin; and because a skipped-over-something or failed install then leaves the base without dependencies,
# a `no-regressions` with a gate red on both sides over such a base is refused `base-install-unreliable`
# (unreliableInstallMasking + baseInstallNeeded). That closes the former `regress-failed-install-false-green`
# residual for an install that exits non-zero or times out; it stays open for an `--install` that exits 0 without
# preparing anything and for dependencies the base neither locks nor declares. (5) A total-glob `## Files` entry (only `*` and `/`, or `.`) is refused `plan-files-total-glob`
# (check-regress.mjs declaredClasses; quick scope: `total-glob-declared`), and hook-dropped globs are reported as
# `unenforced_globs`. Refusals, not verdicts, wherever a stamp alone cannot decide — so check E never re-derives one.
# NAMED RESIDUAL: a partially committed build with another uncommitted change still compares against a base holding
# the committed part — only `--base` closes it.
# Ships: bumps SKILLS_VERSION. Exit: 0 done · 2 unusable · 3 refused · 4 question · 5 continue · anything else
# (1 included) = crashed.
node pharn/floor/stage-regress.mjs --feature <name> --timeout-ms <N> [--budget-ms <B>] [--base <ref>] [--gates "<cmd>[::<id>],…"] [--install "<cmd>" | --no-install] [--tests "<pathspec>,…" | --no-tests]
node pharn/floor/stage-regress.mjs --resume [--budget-ms <B>]
```

## Base-evidence reuse (regress)

```bash
# BASE-EVIDENCE REUSE (6.33.0, regress-base-reuse) — inside ONE /pharn-loop or /pharn-ship run, a later regress reuses the
# BASE side an earlier one produced (no base worktree, no install, no base gate) when tested code proves it was produced
# for exactly the current BASE requirement; the HEAD side always runs. pharn/floor/regress-base-reuse-core.mjs is the
# rule (the requirement: base SHA, the spec base-init copies — gate-run-core.mjs baseSpecFrom, one owner —, the install
# decision, the timeout, the stamp/fingerprint versions, and the content of every root-level HEAD path in `inside`,
# because the base worktree was nested in the HEAD tree until regress-base-integrity moved it to the temp root — kept,
# since binding more than is reachable can only cause a miss; no-install, failed-install and timed-out evidence is never
# reused); pharn/floor/regress-base-reuse.mjs is the storage. The evidence stays in .pharn/pharn-regress/base-gates/
# (the fresh start now keeps that one directory); the binding record is <git rev-parse --absolute-git-dir>/
# pharn-regress-base-reuse.json, out of the write tools' reach (the composed guards deny it: protect-trusted-paths in a main checkout, enforce-writes-scope in a linked worktree), bound to the run marker's bytes and
# mtime (the write guard's own 24 h rule; markers are hashed, never parsed). A persisted HIT is re-decided in full at
# "verdict"; a record is published only if the predicate accepts it, for the run and requirement the decision saw. check-regress.mjs and
# validateStamp are UNCHANGED. regression-report.json gains the additive, advisory `base_evidence` block
# {reused, miss, requirement_sha256, recorded}. FLOOR: the reuse decision (content hashes + closed enums). ADVISORY:
# that a reused result equals a fresh base run (determinism; ignored root content, env, machine). BOUNDS, named: a Bash
# writer can forge record + evidence together; the base side's in-progress scratch is write-tool reachable while a chain
# is paused at `continue` (follow-up regress-paused-chain-integrity); a stale marker (≤ 24 h) binds a later standalone
# regress. /pharn-dev-regress (prose) is unchanged. Contract: pharn/pharn-contracts/regression-report.md.
```

## Entry evidence as BASE (regress)

```bash
# ENTRY-DERIVED BASE EVIDENCE (6.49.0, entry-run-as-base-evidence) — when 6.33.0's retained BASE evidence is not reused, a
# /pharn-regress of an open /pharn-loop or /pharn-ship run takes its BASE from THAT run's validated entry execution when
# tested code shows it is exactly the BASE evidence needed; no base worktree, no install, no base gate. The rule (and every
# bound): pharn/floor/entry-base-evidence-core.mjs; storage + the materialization: entry-base-evidence.mjs; the closed misses:
# stage-regress-core.mjs ENTRY_BASE_MISSES (first failure decides, a MISS runs the BASE side exactly as before, never a
# question or a stop). Pieces:
#   • the entry `base:test` slot — entry-gates.mjs --start hands run-gates `--base-tests` = scope-inputs.mjs
#     defaultTestUniverse (regress's own default test rule, moved there, ONE owner) minus changedPaths(HEAD); reserved id,
#     right after the style gates, never an entry red; any problem with the list = no slot (never unusable);
#   • the OFFER — <git dir>/pharn-entry-base-offer.json, published by --wait only after its own checks pass on a green or
#     red verdict, bound to the run marker + the entry stamp's sha256; --start discards it; ★ HOOK-probed;
#   • the decision — after drain-head and after decideFromDisk; re-decided in full at "verdict" before anything is written;
#     needs the pre-run snapshot at this BASE listing only this run's feature dir, byte-equal shapes per mapped slot (`test`
#     with files → base:test), completed runs, style gates with the feature dir absent, no tree movement through the last
#     mapped run, entry timeout <= regress timeout, no explicit --install/--no-install;
#   • the DERIVED regress/base stamp — runs ran:false, reason "reused", reused {stage: "entry", side: null, seq,
#     stamp_sha256}; logs copied + verified; algo ENTRY_ALGO; gate-run-core.mjs REUSE_PAIRS is the closed matrix
#     (verify ← regress/head, regress/base ← entry).
# check-regress.mjs and check-loop-fresh.mjs unchanged. Report: base_evidence.source (fresh|reused|entry) + .entry; work
# record evidence "entry". NOT CLAIMED: equality with a nested-worktree BASE (different environments). ADVISORY,
# inherited and now pointing the other way: a non-style entry gate reading the front stages' feature-dir writes can hide
# a regression as pre_existing. Contracts: gate-run-record.md (matrix), regression-report.md (block), cost-ledger.md.
```

## Head→verify gate reuse

```bash
# HEAD→VERIFY GATE REUSE (6.34.0, verify-head-gate-reuse) — inside ONE /pharn-loop or /pharn-ship run, /pharn-verify records a
# gate's result from a COMPLETED execution of that run's /pharn-regress HEAD side instead of spawning the gate again, when
# tested code proves every input it binds is equal (agreement, never that the executions are the same):
# pharn/floor/gate-reuse-core.mjs (pure) is the rule — the EXECUTION
# IDENTITY (command, ordered files, cwd realpath, --timeout-ms, git HEAD, the PHARN_TEST_RESULTS variable's name, the
# tree fingerprint algo + fp_before; `run-gates.mjs` records it on every run as `runs[].identity_sha256`) and the
# eligibility (a completed process exit 0..125 — a completed RED is reused like a green —, not timed out, not mutated,
# no regular results file, never an id in gate-run-core.mjs NON_REUSABLE_IDS = every AC level gate, every STYLE_SET gate
# (a whole-tree style run reads the fingerprint-excluded REGRESSION.md/VERIFY.md, grill B1) and reconcile). The source is
# offered only through pharn/floor/head-reuse-offer.mjs's record in the GIT DIR (`pharn-regress-head-offer.json`; the
# module also holds the acceptance rule) — denied to the write tools in a main checkout and a linked worktree (★ HOOK),
# NOT for a separate git dir under a temp root in an installed project with no run open (GATE-2 review, the BASE record's
# bound too); a stamp planted under `.pharn/` by a --quick build is never offered (grill B2): stage-regress
# discards it at its fresh start and publishes it once the HEAD stamp is final, bound to the stamp's bytes and the open
# run marker; stage-verify passes `--reuse-stamp`/`--reuse-sha256` only when that offer names THIS run and these bytes.
# A HIT is recorded as `ran: false, reason: "reused"` + `reused: {stage, side, seq, stamp_sha256}` with the source's
# exit and log digests (its logs copied, verified, under verify's own names) — nothing spawned; every MISS runs the gate
# exactly as before, never an error. verify-report.json gains the additive, advisory `gate_reuse: {reused: [...]}` and
# VERIFY.md says "reused, not re-executed". UNCHANGED: resolveSet, the AC gate, completeness, check-verify.mjs,
# check-regress.mjs, check-loop-fresh.mjs (J/E pass over the copied logs), the drain/budget/resume. FLOOR: the decision
# (content hashes + equality) at the moment it is made. ADVISORY: that a reused result equals a fresh run (determinism;
# the inherited env, the git index and ignored files are unbound), and verify loses its second sample of a flaky gate.
# NAMED residuals: verify-reuse-rederive (nothing re-derives the decision later), verify-paused-chain-integrity (the
# in-progress `reuse` binding is write-tool reachable while a verify chain is paused), verify-reuse-inherited-env,
# verify-reuse-excluded-artifacts, a Bash writer can forge offer + stamp together (L19). LIMITS.md's "/pharn-verify re-runs
# the project's own gates" is human-only and now partly stale — flagged, not edited. Contracts: gate-run-record.md
# "Reused entries", verify-report.md "The additive gate_reuse block".
```

## `stage-verify.mjs` — the /pharn-verify stage script

```bash
# THE /pharn-verify STAGE SCRIPT (added 6.26.0, stage-verify-script) — the same move for verify: every deterministic
# step of the stage in ONE tested script, so `.claude/commands/pharn-verify.md` is a THIN CALLER that pins one line
# and branches on the script's EXIT CODE (the shared stage-exit.md protocol; verify's own registry entry — question
# `no-gates`; refused `missing-artifact`/`chain-red`/`plan-files-unparseable`; unusable `usage-error`/`no-feature`/
# `path-containment`/`git-failed`/`child-crashed`/`child-refused`/`no-progress`/`progress-malformed`). THE TRIGGER
# (P7) is Phase 1.1's: the command prescribed 14 + d + G + P tool calls over a 55,683-byte prompt. PHASES
# (stage-verify-core.mjs, the one owner): fresh -> chain -> pairs -> verifiers -> init -> drain -> verdict -> render.
# "fresh" removes THIS feature's earlier verify-report.json/VERIFY.md and clears `.pharn/pharn-verify/` (the progress
# record first) right after the slug and the lstat containment walk, BEFORE the rest of argv is validated; ONLY
# ENOENT counts as absence, so a removal that fails is a crash, never a verdict. The verdict is
# `check-verify.mjs --stamp … --ac-gate`, read only when its exit AGREES with its printed verdict (classifyVerdict —
# a crash exits 1, FAIL's own code). The report is the checker's object verbatim plus the runner's `completeness`
# capture (shape-checked: a crashed check-build-complete.mjs is `child-crashed` before any gate runs, never
# INCOMPLETE — a disclosed behaviour change) and a `verifiers` block (counted, none run). A refusal writes NO
# verify-report.json. EVAL_PAIR_RULE: one `structural:` gate per `<capDir>/evals/expected/<x>.json` whose colocated
# findings.json exists, for a capability directory the PLAN declares — committed, or untracked and NOT git-ignored
# (disclosed). BOUND (GATE 2 review F3): a git-ignored pair gets no gate, and neither does a declared path that differs
# from the tree only in letter case (the rule compares exactly, while on a case-insensitive volume the completeness
# check counts that path present) — both fail open, fewer gates. Every write
# into the feature directory walks containment first. THE SHARED MECHANICS live once in pharn/floor/stage-runtime.mjs
# (the argv rules, the containment walk, the stale-output removal, the atomic write, git helpers, the budget tracker,
# the drain) for both stage scripts; regress's CLI behaviour is unchanged except that a stale-report removal that
# FAILS (anything but ENOENT) is now a crash there too, never swallowed (GATE 2 F5; follow-up
# regress-stale-unlink-swallow closed). THE WEAKER CLAIM, stated: the two artifacts are `fs` writes through
# Bash (L19) AFTER this stage's own reconcile gate, so a stray write by the script is neither prevented nor
# detected; the command's writes-scope is `.pharn/pharn-verify/stage.json` (it resolves to `.pharn/**` alone). BOUNDS:
# a resume re-derives the verdict from the same stamp, but the AC gate reads live files, so a resume over a moved
# tree may differ — check-loop-fresh F catches that in the loop; /pharn-ship has no such check, and a resume over a
# moved tree still ends `done` (GATE 2 review F4). A SEPARATE residual: a stop before the slug and containment point,
# or a crash, can leave an EARLIER run's report on disk; /pharn-ship answers that one by reading `.verdict` only after a
# `done` exit in the same run. Contracts: pharn/pharn-contracts/stage-exit.md, verify-report.md.
# Ships: bumps SKILLS_VERSION. Exit: 0 done · 2 unusable · 3 refused · 4 question · 5 continue · anything else
# (1 included) = crashed.
node pharn/floor/stage-verify.mjs --feature <name> --timeout-ms <N> [--budget-ms <B>] [--gates "<cmd>[::<id>],…"]
node pharn/floor/stage-verify.mjs --resume [--budget-ms <B>]
```

## `install-drift.mjs` — the head install check

```bash
# THE HEAD INSTALL CHECK (6.40.0, regress-head-install-drift) — no CLI: pharn/floor/install-drift.mjs (reads the tree)
# + install-drift-core.mjs (the pure rule; its header IS the spec). First thing in stage-regress.mjs's head-init and
# stage-verify.mjs's init, before any gate, it compares npm's record of the installed tree (node_modules/.package-lock.json)
# with the lockfile (npm-shrinkwrap.json first, npm's own order). THE RECORDED FAILURE (P7): a user's 92-min /pharn-loop
# reported a false `typecheck` regression — HEAD gates over a stale node_modules, BASE over a fresh `npm ci`. A changed,
# missing or extraneous package (`drifted`) or a lockfile with packages and no node_modules (`not-installed`) is
# `refused head-install-drift` (remedy `npm ci`, the command INSTALL_RULE resolves — measured to clear all three kinds);
# in /pharn-loop an S9 stop by the existing status rule. GATE 1 + review R1 (orchestrator, delegated): an absent
# `optional` package (or `devOptional` with os/cpu/libc) is `missing_unchecked`, never drift; an absent dev/peer/
# devOptional package is drift only when npm's record holds a present entry of that class (an omit=dev install would
# otherwise be refused forever); pnpm/yarn/bun and every unreadable state are `not-checked` with a closed `why` and
# proceed as before. A workspace-filtered install (`npm ci -w`) refuses (remedy: a full install); no bypass. Every
# non-refusing state is the additive, advisory `head_install` block in both reports. LOCKFILE_FAMILIES
# (stage-regress-core.mjs) is the one owner of the lockfile names, BASE and HEAD alike. BOUND (L43): agreement of two npm
# records, never "node_modules is right" — a tree changed outside npm, or by `npm install --package-lock-only`
# (measured), reads clean; a false clean leaves the pre-6.40.0 behaviour and never causes a refusal. `readInstallCheck(root)` + `refuses` are
# exported for the follow-up `entry-preflight-install-drift`. Contracts: regression-report.md / verify-report.md "The
# additive `head_install` block", stage-exit.md.
```

```bash
# WHY RECONCILE FAILED (6.55.0, reconcile-reasons-in-reports) — no CLI: pharn/floor/reconcile-detail-core.mjs (pure;
# imports quote-core.mjs only). At "verdict", stage-verify.mjs finds the reconcile run in the stamp bytes the verdict
# read, reads `<seq>-reconcile.out` under .pharn/pharn-verify/gates/ (one O_NOFOLLOW fd, fstat regular file, <= 8 MiB) only when its
# sha256 equals the run's stdout_sha256, and `reconcileDetail` parses check-bash-reconcile.mjs's JSON document into
# verify-report.json's `reconcile_detail` (last merged key; null with no reconcile run). Closed states: parsed |
# log-missing | log-unreadable | log-digest-mismatch | not-checker-json — a non-parsed state renders ONE line plus the
# re-run command (the runner's own reconcile argv), never a row (L34). `reconcileDetailLines` is the ONE renderer for
# VERIFY.md's `## Reconcile` (shown on a non-zero exit, a merged path, or a failing reconcile with no block) and for
# RUN-REPORT.md on a reconcile stop (L35). Rows capped at 20 + "and N more"; file/denied_by/scope_set_by JSON-quoted in
# a fence; a reason and the checker verdict inline only after membership. The core owns ESCAPE_REASONS (the checker
# re-exports it). ADVISORY: no verdict reads the block, and reading this one gate log does not change the runner's
# "no verdict reads gate content" rule. The dev twin /pharn-dev-verify writes VERIFY.md by prose — not covered.
# Contract: verify-report.md "The additive `reconcile_detail` block".
```

## `build-gate.mjs` — /pharn-build's project gate

```bash
# /pharn-build's PROJECT GATE (6.39.0, build-gate-bounded) — Step 4 runs the project's gates ONLY through this helper.
# THE RECORDED FAILURE (P7): in a user's 92-minute /pharn-loop run the routed build agent chose its own set (a full
# `vitest run` twice, a `test:db` script /pharn-verify never runs twice, `typecheck | grep -v` hiding pre-existing errors,
# never `build`) — 7.8 min blocked on suites (.dev/measurements/loop-wall-clock-2026-10-05.md §4). Correction recorded in
# the PLAN: its gate output was ~18 KB of 484 KB of Bash results, so the context growth was NOT gate output.
# `targeted`: the `test` gate over this feature's declared test files (PLAN ∪ AC-TESTS `## Files`, through badPath +
# isTestFile + a regular-file lstat, e2e-mapped files left out); `full`: the set /pharn-verify discovers minus E2E_SET (the
# project's gate exclusion applies), whose exit is the build's gate. Both through run-gates.mjs's new `build` stage,
# stage-runtime.mjs's drain and budget (unchanged), logs under .pharn/pharn-build/<name>/<mode>/. The summary is bounded
# (per gate exit + runner-call wall time; failing tests' ids with a fenced excerpt of their first message — the adapters
# now carry `messages` on parsed entries, NO record does — or a fenced log tail; at most 16,384 bytes, enforced). The same
# line starts and continues a run (only while the tree fingerprint and --gates spec are unchanged). No gate to run (no
# package.json, none allowlisted) → exit 4; a HUMAN may then name the gates with --gates, as at /pharn-verify (appended
# verbatim, never model-typed, never filtered); /pharn-loop maps 4 to S4. FLOOR: the set (resolveSet), the exit
# codes (the stamp). ADVISORY: that the agent runs nothing else, that an excerpt holds the diagnostic, that a targeted
# GREEN predicts a full one. Follow-up `build-gate-execution-reuse`. Exit: 0 GREEN · 3 RED · 4 NO-GATES · 5 CONTINUE ·
# 2 UNUSABLE · anything else (1 included) = crashed. Ships: bumps SKILLS_VERSION.
node pharn/floor/build-gate.mjs --feature <name> --mode targeted|full --timeout-ms <N> [--budget-ms <B>] [--gates "<cmd>[::<id>],…"]
```

## `check-quick-scope.mjs` — the quick scope check

```bash
# THE QUICK SCOPE CHECK (6.28.0, loop-quick-mode GATE 2, review F1) — the partition check `/pharn-ship --quick`'s item 7
# and every `/pharn-loop --quick` iteration keep when they skip /pharn-regress. THE RECORDED FAILURE (P7): 6.25.0's
# pinned line had the MODEL paste the changed and declared lists into DOUBLE-QUOTED shell arguments of
# `check-regress.mjs scope`, so a file named `src/$(touch X).js` ran in the orchestrator's shell and a `$Q` or comma
# name passed falsely (REVIEW.md F1, reproduced). Now the pinned line carries ONLY the slug and a resolved 40-hex base,
# both validated (FEATURE_SLUG_RE; SHA_RE + `git rev-parse --verify <base>^{commit}`), and the code builds both sets:
# pharn/floor/scope-inputs.mjs — the ONE owner stage-regress.mjs's partition phase also calls (L35) — lists the changed
# paths (`git diff --name-only --no-renames -z <base>` ∪ `git ls-files -z --others --exclude-standard`, minus `.pharn/`)
# and the declared writes (PLAN.md ∪ AC-TESTS.md `## Files`), and check-regress.mjs's exported `partitionScope` decides
# with its closed exemptions. Paths travel as ARRAYS: no shell, no comma list, no trim, no flag scan reads one
# (check-quick-scope.test.mjs EXECUTES both commands' committed lines on hostile names, 6.25.0's line as the control).
# check-regress.mjs now runs its CLI only under `import.meta.main`. `regress-scope-list-grammar`, found by this fix, is
# CLOSED in the same release: /pharn-regress's partition phase calls partitionScope in-process over the same arrays, so a
# name with surrounding spaces or a lone changed path spelled `--declared` can no longer pass falsely there
# (stage-regress.test.mjs runs both through the real script, the comma-list CLI as the control). One ordinary-looking name
# moved there (round-2 re-review R3): git lists an untracked nested repository as `vendor/lib/`, a trailing slash the
# CLI stripped, so a bare `vendor/lib` declaration now reads scope-escaped (stricter; `vendor/**` covers it), as it
# always did here. NAMED RESIDUAL,
# `regress-inside-echo-list`: the verdict call's `inside` echo (ADVISORY, read by no floor op) is still a comma list, so a
# comma or newline changed path is still refused (`unrepresentable-path`, fail-closed). BOUNDS: changed-since-base, not written-by-the-build
# (L17); a plan that rewrites its own `## Files` defeats it; a git-ignored path is outside it; it LEAVES NO RECORD (in
# /pharn-loop nothing downstream re-checks it). THE ENTRY (round-2 re-review R2): check-quick-scope.mjs has NO static
# import and loads the checker, pharn/floor/quick-scope-core.mjs, through import() — check-loop-fresh.mjs's 6.21.1
# pattern — so a module that cannot load, a throw while checking, or a result outside the checker's contract exits 2
# `crashed`, never 1. NOT CAUGHT, and stated: the entry file itself unloadable (a run from outside the project root, where
# the pinned relative path names no file) is node's own exit 1 with no document; both callers stop on 1.
# regress-base-integrity: a total-glob `## Files` entry exits 2 `total-glob-declared` (the same refusal the regress
# partition makes); hook-dropped globs are listed as `unenforced_globs`. /pharn-ship --quick's base is the one Step 2
# item 1 captured after GATE 1, never re-derived.
# Exit: 0 clean · 1 escaped · 2 inconclusive (closed reason_code, `crashed` included).
node pharn/floor/check-quick-scope.mjs --feature <name> --base <40-hex>
```

## `check-instruction-files.mjs` — the instruction-growth gate

```bash
# THE INSTRUCTION-GROWTH GATE (6.38.0). A user's CLAUDE.md + 14 rules (634,379 B) rode in every stage agent's prefix.
# `--report` (ADVISORY): the always-loaded set — root CLAUDE.md files, their `@` imports, rules without `paths:` —
# per-file bytes, a bytes/4 estimate, notes (`globs-not-read`, …). `--growth` (FLOOR over this MODEL of the loader, never
# the loader itself): bytes ADDED since the base (removals never offset) vs `budget.instructionGrowthBytes` in
# pharn.config.json AT THE BASE (default 2048). Under-count routes are listed as known-so-far (L67).
# /pharn-verify injects it before `reconcile` as `instruction-growth` (`--base-rule`: dirty → HEAD, else merge-base
# origin/main, else INCONCLUSIVE); never reused. Spec/bounds: instruction-files-core.mjs. This repo's dev loop never runs it.
# Exit: 0 within/reported · 1 over · 2 inconclusive (closed reason_code).
node pharn/floor/check-instruction-files.mjs --report
node pharn/floor/check-instruction-files.mjs --growth (--base <ref> | --base-rule)
```

## `pre-run-snapshot.mjs` — the pre-run snapshot

```bash
# THE PRE-RUN SNAPSHOT (6.37.0, regress-pre-run-snapshot) — a path already changed when a /pharn-loop or /pharn-ship run
# began is not that run's scope escape. THE RECORDED FAILURE (P7): two of three post-6.35.0 /pharn-loop runs in a user's
# project stopped at /pharn-regress `scope-escaped` on paths the run never wrote — an abandoned run's untracked
# `pharn/features/<other>/` folder (a 19-minute human wait) and the user's own uncommitted edit — both listed in the
# loop's own pre-run-status.txt, which the partition never read. `--capture` runs right after the run marker opens
# (/pharn-loop Step 1a; /pharn-ship Step 2 item 1; both STOP on non-zero) and writes `<git dir>/pharn-pre-run-snapshot.json`:
# every `changedPaths(HEAD)` path (scope-inputs.mjs, the partition's own listing) with ONE digest rule (`pathDigest`:
# content, a link's own text, `absent`, or `unhashable` — never subtracted), bound to the marker's bytes (6.33.0's
# deliveryRunIdentity, reused), the base and the feature; write-once per run (`already-captured`). The partition
# (stage-regress.mjs, quick-scope-core.mjs → check-regress.mjs partitionScope's optional `preRunUnchanged`) subtracts an
# undeclared, non-exempt path only when the snapshot applies (closed PRE_RUN_STATUSES, first miss decides) and its live
# digest is EQUAL, and REPORTS it: `pre_run_snapshot: {status, unchanged}` in scope.json, regression-report.json (after
# base_evidence), the quick check's document and REGRESSION.md. No run / no snapshot → exactly today's partition, where
# "a run" is a marker's presence and age (≤ 24 h), so an interrupted run's leftover marker makes a later standalone regress
# apply that run's snapshot; the `check-regress.mjs scope` CLI is byte-identical. FLOOR: the subtraction (content hashes + closed enums). BOUNDS, in
# pre-run-snapshot-core.mjs's header: agreement, never provenance (a Bash writer can forge the git-dir record; the write
# tools cannot — ★ HOOK); never attributed (an earlier run's escape is pre-run state for a re-run); escape set ONLY —
# `inside` is unchanged, so a pre-run change that breaks a gate still reads as a regression (follow-up
# `regress-base-pre-run-overlay`) and a pre-run-changed test file is not compared at regress; a green loop never commits
# a subtracted path. LIMITS.md §3a/§6 understate it: .dev/features/regress-pre-run-snapshot/PROTECTED-FOLLOWUPS.md.
# Exit: 0 recorded · 2 refused (closed REASON_CODES, `crashed` a caught throw); a module that cannot load is node's 1.
node pharn/floor/pre-run-snapshot.mjs --capture <name>
```

## `entry-gates.mjs` — the entry gates

```bash
# THE ENTRY GATES (6.42.0, loop-entry-preflight) — /pharn-loop and /pharn-ship run /pharn-verify's discovered gates once
# on the starting tree, in a detached background runner, during spec/plan/grill; the verdict is read before /pharn-test.
# A red gate is /pharn-loop S14 (`--allow-red-entry` opts out); /pharn-ship asks. A gate's own writes are recorded beside
# the pre-run snapshot (regression-report.md `entry_gate_changes`). Rules, bounds and the P7 trigger:
# pharn/floor/entry-gates.mjs and entry-gates-core.mjs headers; gate-run-record.md's `entry` bullet.
# Since 6.48.0 each mode also appends observations for the cost ledger to `.pharn/cost/<name>/entry.jsonl`
# (entry-observations.mjs; cost-ledger.md "Entry gate observations") — after its control record, best-effort, read by
# nothing here; exits and stdout documents are unchanged (a test runs every append failing and compares them).
# Exit (--wait): 0 green · 4 red · 3 no-gates · 5 continue (run again) · 2 unusable; --start 0 · 3 · 2; --abort 0.
node pharn/floor/entry-gates.mjs --start --feature <name> --timeout-ms <N>
node pharn/floor/entry-gates.mjs --wait --feature <name> --budget-ms <B>
node pharn/floor/entry-gates.mjs --abort --feature <name>
```
