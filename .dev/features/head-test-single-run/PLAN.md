# PLAN — head-test-single-run: one HEAD execution of `test` serves /pharn-regress and /pharn-verify

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L25, L34, L35, L36, L40, L41, L43, L58, L60, L62, L68, L84]
- increment: when `pharn.config.json` declares `testResults.test`, /pharn-regress's HEAD side runs the project's whole
  `test` suite once (recording the outside test files it compares as `compare_files`), judges the outside tests per test
  from that run's results file, and inside one /pharn-loop or /pharn-ship run /pharn-verify records that execution as
  reused — its results file copied and bound by sha256 — instead of running `test` again (Linear CORE-89; reopens
  LOOP-8).
- layer(s): product floor `pharn/floor/` (`run-gates.mjs`, `gate-run-core.mjs`, `gate-reuse-core.mjs`,
  `check-regress.mjs`, `stage-regress.mjs`, `render-regression.mjs`, `render-verify.mjs`, `loop-fresh-core.mjs` comment,
  their tests); `pharn/pharn-contracts/` (`gate-run-record.md`, `regression-report.md`, `verify-report.md`,
  `test-results-record.md`); product commands `.claude/commands/pharn-regress.md`, `.claude/commands/pharn-verify.md`
  (one paragraph each); a trusted doc `pharn/LIMITS.md` §9 (human-applied, patch script); build apparatus
  (`.dev/guides/floor-gates.md`, this feature folder).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7) — LOOP-8 reopened, with per-gate durations

LOOP-8 (audit 2026-10-12: "reuse regress-HEAD `test` in verify") was closed won't-fix at 6.72.2
(`.dev/features/verify-test-reuse/PLAN.md`). That close was a model decision under delegation, and it named its own
reopening condition: "its P7 trigger would be a measured loop cost, which the audit estimated … but did not measure (L24)".
The measurement now exists:

- `.dev/measurements/gates-within-side-parallel-2026-11-16.md` (CORE-88, merged in #446): one pass of the measured
  project's verify set through the 7.16.0 runner, `test` 286.3 s of a 346.7 s sum (82.6%); `lint` 23.7 s,
  `format:check` 14.6 s, `typecheck` 22.2 s. `test` is 53% of the pinned 540 s per-gate timeout.
- `.dev/measurements/loop-baseline-2026-11-11.md`: regress median 16.1 min (n = 11), `test` about 9 min per run (§12, as
  CORE-77's plan read it); 6 of the 9 `STOP_TERMINAL` stops were `test` killed at the 540 s per-gate timeout at regress or
  verify.

**Decision (AC 1): LOOP-8 is reopened.** Made by the batch orchestrator (a model) under the user's delegation ("You make
all decisions"), recorded here and in `SHIP.md` — not a human approval. What one execution saves: one full `test` run per
loop iteration (regress HEAD + verify become one execution), about 286 s per iteration on the measured project, and one
of the two chances per iteration to hit the 540 s timeout.

The two reasons 6.72.2 gave for never reusing `test` are both answered here, and only under the opt-in:

1. "regress HEAD runs a subset (`outside_tests`), so the identity misses" → the HEAD side runs the whole suite (identity
   equal to verify's `npm run test`), and the outside subset becomes the comparison domain instead of the run's input.
2. "the AC gate reads per-test records from verify's own `<out>`" → the reuse copies the source's results file into
   verify's `<out>` under verify's own name, verified against the source's `results_sha256` before and after the write,
   and the reused entry records that digest, so `gateResults` binds it exactly as for a fresh run.

## Live state re-derived on this branch (CORE-77 tip `907da87d`, 7.17.0)

- `run-gates.mjs:912-918`: regress/head sets `test`'s `files = scope.outside_tests`. `run-gates.mjs:1307,1347-1352`: a
  regress `test` entry whose `files` is an empty array is recorded `ran: false, reason: "no-files"` without a process.
  Discovered entries carry `files: []` (`gate-run-core.mjs:439,457`), so "whole suite at regress" needs a marker the
  no-files rule can read.
- `gate-run-core.mjs:900-922` `baseSpecFrom`: base-init copies each HEAD entry's id/shell/argv/files. It is the one owner
  of the BASE spec for base-init, the 6.33.0 retained-BASE requirement (`regress-base-reuse-core.mjs:134,303`) and the
  6.49.0 entry-derived BASE mapping (`entry-base-evidence-core.mjs:172,204` — `test` with non-empty `files` maps to the
  entry `base:test` slot).
- `gate-run-core.mjs:343-358` `NON_REUSABLE_IDS` = every LEVEL_GATES id (`test`, `test:e2e`, `e2e`), every STYLE_SET id,
  `reconcile`, `instruction-growth`. `verifyReusedRunDefect` (`:1027-1046`) refuses a reused member and requires
  `results_sha256: null` on every reused verify run.
- `gate-reuse-core.mjs` `findReusable`: `not-reusable-id` before the candidate lookup; `results-written` when the
  candidate recorded a results file; `reusedRunRecord` writes `results_sha256: null`. `run-gates.mjs:426-457` `tryReuse`
  copies the two logs only.
- `per-test-results-core.mjs:286-330` `gateResults` reads `<out>/resultsFileName(run.seq, run.id)` and requires its
  sha256 to equal `run.results_sha256`; it does not look at `ran` when a digest is present. `ac-gate-core.mjs:142`
  `ranAsPinned` reads `source`, `shell`, `argv` only. So a reused verify `test` entry carrying a digest, with the file
  copied to verify's own results name, is read by the AC gate exactly as a fresh one.
- `check-regress.mjs:734-793` (CORE-77): the stamp-path per-test step runs only when `test` is red at BOTH sides; its
  domain is the HEAD stamp's `test` run `files`; its L34 refusal is judged over the compared files.
- `loop-fresh-core.mjs:569-580` check J re-hashes every recorded `results_sha256` against `<out>/resultsFileName(seq,
id)` — any stamp, any run, a reused one included. Check E re-runs `check-verify.mjs` and `check-regress.mjs verdict`
  over the stamps with no extra input.
- `render-regression.mjs:349-357`: a gate with base 0 / head != 0 always renders "REGRESSION" (impossible otherwise
  today). `render-verify.mjs:205-220` renders the reused ids.

## The design

### 1. The whole-suite HEAD run (`run-gates.mjs`, `stage-regress.mjs`, `gate-run-core.mjs`)

- `stage-regress.mjs` head-init passes a new `run-gates.mjs init` flag, `--test-whole-suite`, when
  `formatFor(loadResultsConfig("."), "test").ok` and `--no-tests` was not given. Not declared, unreadable or
  `--no-tests` → no flag → today's argv, today's stamp bytes (**AC 5**).
- `run-gates.mjs init --stage regress --side head --test-whole-suite` sets the `test` entry to `files: []` plus
  `compare_files: <outside_tests>` (a new optional entry/run field). The flag is refused (`usage-error`) on any other
  stage/side. The no-files rule skips an entry that carries `compare_files`, so the gate runs as `npm run test` with no
  file arguments — the argv verify runs. The spawned run records `compare_files` beside `files: []`.
- `baseSpecFrom` copies `compare_files` (when an array) into the BASE entry's `files`, so the BASE side runs `test` over
  the outside tests exactly as today: the BASE spec, the retained-BASE requirement and the entry-derived mapping keep
  today's bytes, and both keep hitting (**Q1**).
- `validateStamp` admits `compare_files` only on the `test` run of a `regress`/`head` stamp, as an array of clean
  strings, with `files: []`; anywhere else, or malformed, is `stamp-malformed` (closed: a forged field cannot widen a
  verdict).

### 2. The regress verdict over a whole-suite HEAD run (`check-regress.mjs`)

When the HEAD stamp's `test` run carries `compare_files` (the "whole-suite mode"; the stamp alone decides it, so check E
re-derives it), the per-test step changes in three places; without it, CORE-77's step is byte-identical:

1. **Trigger:** HEAD `test` non-zero (any base exit), not "both red". HEAD `test` exit 0 reads no record (base 0 → ok,
   base != 0 → `pre_existing`, as today).
2. **Domain:** `compare_files` (the outside tests — the complement of the inside tests within the test universe). A test
   whose file is not a member is ignored by file membership: inside tests, and files outside the universe the subset run
   never executed either (the same coverage as today).
3. **L34 on the HEAD side:** judged over the WHOLE record — a failed test in any file, or a suite error, accounts for the
   red, because this run was given every file. A HEAD red owned only by inside tests is therefore accounted for, and is
   **not a regression** (**Q3**): the `test` row reads ok-outside, `per_test.ignored.head` counts what was left out, and
   `/pharn-verify` judges the inside failures (its `test` gate and the AC gate). A red with no failed test anywhere and no
   suite error is still `per-test-unaccounted-red`. The BASE side keeps CORE-77's rule (it ran the compared files only).

Both records are read whenever HEAD `test` is red (**Q2**): base 0 / head red compares against the BASE record too, so a
base commit with no record is `per-test-record-refused` (inconclusive) where CORE-77 read only the both-red row. The
block gains `head_run: "whole-suite"`. Classification: `regressions` gets `test` iff a compared test failed at head whose
base status is not `failed`, or head has more suite errors (unchanged rule, `comparePerTest`); otherwise a base-red row
stays `pre_existing` and a base-green row is removed from `regressions` (**AC 4**). Suite errors carry no file in any
supported format, so a suite error in an inside file can still read as a regression — a false RED, stated.

### 3. The verify reuse of `test` (`gate-reuse-core.mjs`, `gate-run-core.mjs`, `run-gates.mjs`)

- `gate-run-core.mjs` gains one predicate, `wholeSuiteTestRun(run)` (id `test`, `compare_files` an array, `files` empty),
  the one owner of "this run is a whole-suite HEAD execution", read by `findReusable`, `validateStamp` and
  `check-regress.mjs`. `NON_REUSABLE_IDS` keeps its members; its comment and the contract say `test` has exactly one
  exception, a whole-suite source.
- `findReusable`: an entry in `NON_REUSABLE_IDS` is `not-reusable-id` unless its id is `test` and the candidate is a
  whole-suite run. For that candidate the results rule flips: it must have recorded a results digest (new closed miss
  `results-absent` when it is `null`), never "no results file". Every other rule (completed, not mutated, identity,
  logs) is unchanged — so a timed-out or tree-moving HEAD `test` is never reused.
- `run-gates.mjs` `tryReuse` copies the source's results file to verify's own `resultsFileName(seq, "test")` under the
  existing 64 MiB copy cap, verified against the digest before and after the write; a failure is the existing
  `log-unverified` miss (the gate then runs).
- `reusedRunRecord` writes the source's digest for a whole-suite `test`, `null` for every other id.
  `verifyReusedRunDefect` admits a digest on a reused `test` only, and requires one there.
- Verify's report: `gate_reuse.reused` already lists `test` (**AC 2**: "reused, not re-executed"). `render-verify.mjs`
  adds one fixed line when `test` is among them: the AC gate read the results file copied from the regress HEAD run, and
  verify has no independent second sample of `test` (ticket constraint).

### 4. Freshness (`loop-fresh-core.mjs`, comment only — **AC 6**)

No new checker input: check E's `check-regress.mjs verdict` reads the mode and domain from the HEAD stamp, and its
`check-verify.mjs` re-run reads the copied results file through the reused entry's digest; check J already re-hashes that
file. The comment above check J names the copied file.

### Recorded trades and bounds (stated in the contracts, the CHANGELOG and LIMITS §9)

- Verify loses its independent second sample of `test` for a reused run (already advisory; stated in VERIFY.md and in
  `pharn/LIMITS.md` §9, the human-applied sentence below).
- Under the opt-in, HEAD `test` red over a base with no results file is now inconclusive in the base-green row too.
- A HEAD that times out runs `test` again at verify (`not-completed`), as before.
- A suite error in an inside file reads as a regression (no file to attribute it to).
- The whole-suite HEAD run executes inside test files at regress; a regress `test` red owned by inside tests no longer
  shows as a regression, so it surfaces at verify instead.
- Reusing the build stage's own gate run is not in scope: `BUILD.md` is written after it and is fingerprinted.

## LIMITS.md §9 — the human-applied sentence (L68)

A Python patch script inserts one bullet into `pharn/LIMITS.md` §9, after the "Agreement, never provenance." bullet:

> - **One run of `test` can serve both stages (7.18.0).** When `pharn.config.json` declares `testResults.test`,
>   `/pharn-regress` runs the whole `test` suite once at HEAD, and inside one `/pharn-loop` or `/pharn-ship` run
>   `/pharn-verify` can record that run as reused instead of running `test` again. The AC gate then reads the per-test
>   results file copied from the regress run and bound to its `results_sha256`. Verify has no independent second sample
>   of `test` in that case: a flaky test that passed once reads as passed. `VERIFY.md` says when it happened.

Ordering (L68): the edit must not sit uncommitted in this worktree during the build's anchor→verify window. Two clean
routes, the orchestrator picks: (a) the user runs the script before `/pharn-dev-build` Step 0, this run commits it, then
anchors; (b) the user runs it after this run reports verify `PASS`, this run commits it, then re-runs `npm run check`.
The PR is not opened before the commit.

## Files

- `pharn/floor/run-gates.mjs` — `--test-whole-suite` (regress/head init), the no-files exception, `compare_files` on the
  run, the results-file copy in `tryReuse` — layer product floor
- `pharn/floor/run-gates.test.mjs` — tests — apparatus test
- `pharn/floor/gate-run-core.mjs` — `wholeSuiteTestRun`, `baseSpecFrom`, `compare_files` shape, reused-`test` digest
  rule, `NON_REUSABLE_IDS` comment — layer product floor
- `pharn/floor/gate-run-core.test.mjs` — tests — apparatus test
- `pharn/floor/gate-reuse-core.mjs` — the `test` exception, `results-absent`, the digest in `reusedRunRecord` — layer
  product floor
- `pharn/floor/gate-reuse-core.test.mjs` — tests — apparatus test
- `pharn/floor/check-regress.mjs` — the whole-suite mode of the stamp-path per-test step, header — layer product floor
- `pharn/floor/check-regress.test.mjs` — tests (AC 4, AC 5, refusals, L60 control) — apparatus test
- `pharn/floor/stage-regress.mjs` — pass `--test-whole-suite` when declared; header — layer product floor
- `pharn/floor/stage-regress.test.mjs` — end to end: declared → one whole-suite HEAD run with `compare_files`; not
  declared → today's stamp — apparatus test
- `pharn/floor/render-regression.mjs` — the ok-outside row and the whole-suite heading — layer product floor
- `pharn/floor/render-regression.test.mjs` — tests — apparatus test
- `pharn/floor/render-verify.mjs` — the lost-second-sample line when `test` is reused — layer product floor
- `pharn/floor/render-verify.test.mjs` — tests — apparatus test
- `pharn/floor/loop-fresh-core.mjs` — comment only (check J covers the copied results file) — layer product floor
- `pharn/floor/check-loop-fresh.test.mjs` — AC 6 (E and J agree over a reused `test` and a whole-suite regress) —
  apparatus test
- `pharn/floor/stage-verify.test.mjs` — end to end through the real stage scripts (AC 2, AC 3, AC 5): `test` spawned
  once across regress and verify; the verdict, AC gate included, equals a fresh verify, also with a red AC test — apparatus
  test
- `pharn/floor/check-verify.test.mjs` — only if the AC-gate equivalence is cheaper to pin at the checker — apparatus test
- `pharn/floor/head-reuse-offer.mjs` — only if its header's reuse summary needs the `test` exception; else untouched —
  layer product floor
- `pharn/floor/stage-verify.mjs` — header only, only if it restates the never-reused set — layer product floor
- `pharn/pharn-contracts/gate-run-record.md` — `compare_files`, the reused-`test` row, LOOP-8 reopened — layer
  pharn-contracts
- `pharn/pharn-contracts/regression-report.md` — the whole-suite mode of `per_test`, `head_run`, trades — layer
  pharn-contracts
- `pharn/pharn-contracts/verify-report.md` — `gate_reuse` may list `test`; the lost second sample — layer pharn-contracts
- `pharn/pharn-contracts/test-results-record.md` — regress reads the HEAD record whenever `test` is red under the
  whole-suite mode; verify may read a copied record — layer pharn-contracts
- `.claude/commands/pharn-regress.md` — the per-test paragraph: the whole-suite HEAD run — product command
- `.claude/commands/pharn-verify.md` — one sentence: `test` may be reused under the opt-in — product command
- `.dev/floor/command-hygiene.test.mjs` — only if a pinned assertion over those two commands needs the new text —
  apparatus test
- `.dev/guides/floor-gates.md` — the per-test block, the head→verify reuse block (LOOP-8 reopened), run-gates usage —
  apparatus
- `SKILLS_VERSION` — 7.18.0 (minor: a new capability on the product path) — repo meta
- `CHANGELOG.md` — `[7.18.0]` above `[7.17.0]` — repo meta
- `README.md` — version badge; the generated region if `docs:generate` moves it — repo meta
- `docs/capabilities/**` — regenerated by `npm run docs:generate` only — generated

### Not in scope (named)

- `pharn/LIMITS.md` — the §9 bullet above is a human edit through the patch script, committed by this run when the
  orchestrator says it ran; it is deliberately not a `## Files` path (the write tools are denied there).
- `pharn/floor/entry-base-evidence-core.mjs`, `regress-base-reuse-core.mjs` — unchanged: both read `baseSpecFrom`, which
  keeps the BASE spec's bytes.
- `pharn/floor/ac-gate-core.mjs`, `per-test-results-core.mjs`, `check-verify.mjs` — unchanged (above).
- Reusing the build gate's run; the e2e gates; a whole-suite BASE run.

## Contracts satisfied

- `gate-run-record.md` — additive: `compare_files` (one stamp kind, one run), a digest on a reused verify `test`;
  `SCHEMA` unchanged. A floor older than 7.18.0 reads a reused `test` as `stamp-malformed` (`NON_REUSABLE_IDS`) — the
  fail-closed direction; `stage-verify` and the stamps are written and read by the same installed floor.
- `regression-report.md` — `per_test` gains `head_run`; `verdict` stays the only floor-read field.
- `verify-report.md` — no shape change; `gate_reuse.reused` may hold `test`.
- `test-results-record.md` — no shape change; consumers updated.
- `stage-exit.md` — unchanged.

## Evals to write (P1)

No capability (`role:`) changes. Tests only, none renamed or removed (pharn-ci test-integrity):

- AC 2 → `stage-verify.test.mjs`, a delivery run with `testResults.test: "pharn-json"` and a counting `test` script:
  `test` is spawned once at head and never at verify; `gate_reuse.reused` holds `test`; VERIFY.md says "REUSED, NOT
  RE-EXECUTED" and the second-sample line; the verify stamp's `test` entry carries the source digest and validates.
- AC 3 → the same fixture with and without a delivery run (fresh vs reuse): `verdict`, `failing_gates`, `gates` and
  `ac_gate` deep-equal; a second pair where one AC test fails (FAIL with the same `ac_gate`). If the fixture's SPEC
  cannot carry the AC gate end to end, the equivalence is pinned at `check-verify.mjs --stamp --ac-gate` over a fresh
  stamp and a reused stamp with the same copied results file (`check-verify.test.mjs`).
- AC 4 → `check-regress.test.mjs`: whole-suite head red with an outside test failed (base passed) → `regressions`; the
  same id failed at base → `pre_existing`; head red owned only by an inside test, base green → `no-regressions` with
  `ignored.head`; a head-only test whose name equals an inside test's title in an outside file → regression by file, not
  name; head red with no failed test anywhere → `per-test-unaccounted-red`; base record absent with head red →
  `per-test-record-refused`.
- AC 5 → without `testResults`: `stage-regress` head stamp carries `files = outside_tests` and no `compare_files`; the
  verify `test` entry runs (`not-reusable-id` stays); check-regress output byte-identical over CORE-77's existing
  fixtures (unchanged tests).
- AC 6 → `check-loop-fresh.test.mjs`: over a delivery with a reused `test` and a whole-suite regress, E reproduces both
  verdicts and J passes; editing the copied results file STOPs `output-hash-mismatch`.
- Unit: `findReusable` (whole-suite candidate HITs; subset candidate `not-reusable-id`; `results-absent`; timed-out
  `not-completed`), `reusedRunRecord` digest, `validateStamp` (`compare_files` placements, reused-`test` digest
  required/forbidden), `baseSpecFrom` maps `compare_files`, `run-gates` (`--test-whole-suite` refused off regress/head;
  the whole-suite entry runs with no file args; the copy refused when the source results file is edited →
  `log-unverified`), `REUSE_MISSES` exact list updated (L36).
- Render: the ok-outside row and the whole-suite heading; the second-sample line only when `test` is reused.
- L60: a scratch-copy mutant of `check-regress.mjs` with the whole-suite domain replaced by the run's `files` reads a
  different verdict on the AC 4 fixture; a mutant of `findReusable` without the exception does not reuse `test`.

## Guarantee audit (P0)

- "`test` executes once at HEAD across regress and verify" → floor: content-hash + equality (the execution identity and
  the reuse decision, as for 6.34.0); that the reused result equals a fresh run is ADVISORY (determinism, flakiness —
  the lost second sample, stated).
- "the AC gate reads the same record" → floor: content-hash (the copy verified against the source's `results_sha256`,
  re-checked by `gateResults` and check J). The record's truth stays ADVISORY (the reporter's word, LIMITS §9).
- "inside tests are ignored by file membership" → floor: set membership over `compare_files`; that the reporter names
  the right file is ADVISORY.
- "without `testResults` behaviour is byte-identical" → floor-tested equality on the fixtures named, not a claim over
  every input.
- "check-loop-fresh re-derives the same verdict" → floor: E's re-runs and J's re-hash; agreement, never provenance (L43).
- "the whole-suite mode is read from the stamp" → floor: enum/shape check in `validateStamp`; a Bash writer can forge a
  stamp (L19), unchanged.

## Trust audit (P2)

- Results files are untrusted project output: copied as bytes under the cap, never parsed by the copy; parsed later by
  the existing adapters. Test ids reach `per_test.new_failures` (untrusted DATA) and render fenced only.
- `compare_files` comes from `check-regress.mjs scope`'s JSON (the existing `--scope-json` read: expanded real paths, no
  globs); it is repository paths, compared as strings.
- `pharn.config.json` is agent-reachable: a build can switch the opt-in off or on, changing which mode regress runs in;
  stated, as in `test-results-record.md`.

## Determinism audit (P5)

Every branch is membership or integer comparison: config `ok`, flag presence, `Array.isArray(compare_files)`, exit != 0,
set membership of files and ids, digest equality. Every refusal is a closed reason code; no fallback guesses.

## Applied lessons

- L25 — the 6.72.2 rationale on `NON_REUSABLE_IDS` named two reasons; both are re-derived at the sites a reader consults
  (the constant's comment, `gate-run-record.md`, the guide) rather than carried across, and each now states its exception.
- L34 — the HEAD L34 refusal is re-scoped deliberately: over the whole record for a whole-suite run (every file ran), so
  an inside-only red is accounted for, while a red with no failure anywhere still refuses; an empty `compare_files` is a
  domain with no compared test, never a vacuous pass over a red with nothing in it.
- L35 — one predicate (`wholeSuiteTestRun`) owns "whole-suite HEAD run" for every reader; `baseSpecFrom` stays the one
  owner of the BASE spec, so the retained-BASE and entry-derived readers need no change.
- L36 — `REUSE_MISSES` gains `results-absent`; its exact-list test is updated so the closed set stays closed both ways.
- L40 — LOOP-8's attributed causes are tested under negation: with the AC gate's need met (copied file) but a subset
  source, `test` still misses; with a whole-suite source but no results file, it still misses (`results-absent`).
- L41 — the end-to-end tests run `stage-regress.mjs` without passing the flag themselves, so the default decision (config
  read from the project root) is the path exercised.
- L43 — the copy, `gateResults` and check J certify agreement between the copy and the source digest, never that the
  record holds what ran; stated in the contracts.
- L58 — the copy compares the bytes the source run hashed and refuses a file edited since; it never re-reads a file
  still being written (the source run is finalized).
- L60 — each asserted property gets its own mutant: the domain source, the reuse exception, and the copied digest.
- L62 — new refusal reasons quote no untrusted value except through the existing `shown()`.
- L68 — the LIMITS §9 edit is human-only and is sequenced outside the anchor→verify window (route (a) or (b) above),
  committed before the PR.
- L84 — the feature is a branch off a safe default (not declared → today's subset run); the end-to-end test takes the
  branch on realistic input (a real project with the opt-in and a reporter that writes the file).

## GATE 1 questions (recommendations)

- **Q1 — The BASE side.** (a) BASE keeps running `test` over the outside tests (`baseSpecFrom` maps `compare_files`), so
  retained and entry-derived BASE evidence keep today's bytes and hit. (b) BASE runs the whole suite too (another full
  suite per regress unless the entry `test` run maps; the entry mapping and retained requirement change).
  **Recommended: (a).**
- **Q2 — Reading the BASE record when base `test` is green.** (a) read both records whenever HEAD `test` is red (one
  rule; a base with no record is inconclusive in that row too). (b) skip the BASE record when base is green (every
  compared HEAD failure is new; one more branch and a "not read" status in `new_failures`). **Recommended: (a).**
- **Q3 — A HEAD red owned only by inside tests.** (a) not a regression; L34 over the whole HEAD record; verify judges
  the inside failures. (b) keep CORE-77's compared-files L34, which would refuse every inside-only red as
  `per-test-unaccounted-red` (an inconclusive terminal stop in a loop for a red the next iteration could fix).
  **Recommended: (a).**
- **Q4 — Who decides whole-suite.** (a) `stage-regress.mjs`, from `testResults.test` (and not `--no-tests`), through a
  `run-gates.mjs` flag; recorded on the stamp as `compare_files`. (b) `run-gates.mjs` reads the config itself (a second
  reader of the opt-in beside the discovered manifest). **Recommended: (a).**
- **Q5 — LIMITS §9 ordering (L68).** (a) the user applies the patch before the build anchors (this run waits for the
  message); (b) after verify `PASS`. **Recommended: (a)** if the user is available now, else (b).
- **Q6 — Version.** **7.18.0 (minor)**, no `MIN_CLI` bump (no installed path moves; the stamps are written and read by
  one floor). Stacked on #447 (7.17.0); renumber if `main` passes 7.17.0 first.
