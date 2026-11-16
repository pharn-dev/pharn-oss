# PLAN — regress-per-test-product: a per-test comparison of `test` on /pharn-regress's stamp path

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L34, L35, L36, L41, L43, L58, L60, L62, L81, L84]
- increment: when `pharn.config.json` declares `testResults.test`, `check-regress.mjs verdict --base-stamp/--head-stamp`
  compares the `test` gate test by test from the per-test results files the runner already bound to each stamp by
  `results_sha256`, ignoring every test whose file is not one of the files the gate was given (the outside tests), and
  the entry-derived BASE stamp carries the entry run's results file so that comparison also works over entry evidence
  (Linear CORE-77).
- layer(s): product floor `pharn/floor/` (`check-regress.mjs`, `base-worktree.mjs`, `entry-base-evidence-core.mjs`,
  `entry-base-evidence.mjs`, `gate-run-core.mjs`, `render-regression.mjs`, `loop-fresh-core.mjs` comment, their
  tests); `pharn/pharn-contracts/` (`regression-report.md`, `gate-run-record.md`, `test-results-record.md`); the product
  command `.claude/commands/pharn-regress.md` (one paragraph); build apparatus (`.dev/guides/floor-gates.md`, this
  feature folder).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7) — the recorded evidence, and the start condition

- The masking is recorded: a load-red base hid 11 real head failures behind one exit code
  (`.dev/features/frontmatter-parser-parity/REGRESSION.md`), the trigger for 6.72.0's dev-only `--per-test`
  (`.dev/features/load-flake-regress/`). The product regress still reads `test` by its exit alone: `check-regress.mjs:702-712`
  refuses `--per-test` on the stamp path and names this follow-up.
- It is the named prerequisite of CORE-89 (one HEAD execution of `test` for regress and verify):
  `.dev/features/verify-test-reuse/PLAN.md` "What a sound version would need" and `gate-run-core.mjs:331-338`.
- The measured project opts in already: `~/Projects/pharn-app/pharn.config.json` declares
  `"testResults": {"test": "vitest-json"}` (read this run, `trust: untrusted` data), and vitest writes ABSOLUTE file
  paths (`per-test-results-formats.mjs` header, "FILE AND TITLE") — which decides the base-side design below.
- **The ticket's start condition is not settled by this plan** — see Q1. Baseline:
  `.dev/measurements/loop-baseline-2026-11-11.md` §12 rates CORE-77 `needs-evidence` ("Regress has a median of 16.1 min
  (n = 11), but `test`'s share of it is not recorded"), with `test` about 9 minutes per run in the measured project.

## Live state re-derived on 7.16.0 (the ticket's lines describe 7.7.1)

- `check-regress.mjs:73-74,702-712`: `--per-test` is positional-only; on the stamp path it is `usage-error` naming
  `regress-per-test-product`. `check-regress.test.mjs:1081` pins that refusal (its title and its `/regress-per-test-product/`
  match stay; see Evals).
- `run-gates.mjs:912-920`: regress/head sets the `test` entry's `files` to `scope.json`'s `outside_tests`;
  `run-gates.mjs:1308-1351`: an empty list is `ran: false, reason: "no-files"`. Base-init copies the head spec
  (`--spec-from`), so both sides' `test` runs carry the same `files`.
- `run-gates.mjs` already hands every gate `PHARN_TEST_RESULTS` = `<out>/resultsFileName(seq, id)` and records
  `results_sha256` on every run it spawns (`gate-run-record.md`, "Per-test results"). So the HEAD side and a fresh or
  retained BASE side already **carry** their results file beside their stamp, bound by sha256, and both run inside the
  7.15.0 detached stage runner (`stage-direct.mjs` → `stage-regress.mjs` → `run-gates.mjs`). **`run-gates.mjs` needs no
  change** (the ticket listed it); the one side that does not carry a results file is the entry-derived BASE stamp
  (6.49.0): `entry-base-evidence-core.mjs:330` writes `results_sha256: null`, and `gate-run-core.mjs:991` requires it.
- `per-test-results-core.mjs` `gateResults` already does the sha256 binding (re-hash vs `results_sha256`,
  `results-hash-mismatch`), the config read (`testResults`, `not-configured` / `config-invalid`) and the timed-out and
  null refusals. `loop-fresh-core.mjs` check J already stops on a results file whose bytes moved; check E re-runs
  `check-regress.mjs verdict` over the two stamps with no `--inside` (`loop-fresh-core.mjs:631-640`).
- The base checkout lives at `<realpath(tmpdir)>/pharn-regress-base-<tag>-<6>` (`base-worktree.mjs`), so a vitest/Jest
  report from the BASE side names `/…/pharn-regress-base-…/src/a.test.ts`, which `relativeFile` (roots = the project
  root) leaves absolute. Unhandled, every base test reads `absent` and every head failure a regression.
- `check-loop-fresh` check B STOPs on any reason code outside `LAPSE_CODES` and `UNMEASURED_CODES`; the two per-test
  codes are in neither (`gate-run-core.mjs:194-195,238`), so a per-test refusal in a loop would stop as S11 — the
  mislabel 6.59.0 removed for `base-timed-out` (see Q4).

## The design

### 1. `check-regress.mjs` — the stamp-path rule

After the two existing timed-out overrides (so their reports keep their bytes) and before the final verdict:

1. Applies only on the stamp path, only to gate `test`, and only when `test` is non-zero at BOTH sides (the only row a
   per-test view can change; base 0 / head ≠ 0 is a regression already, AC 1).
2. Reads `testResults` from `<cwd>/pharn.config.json` (`loadResultsConfig` + `formatFor`). `not-configured` → nothing
   changes: no read, no key, the plain table (**AC 3**). `config-invalid` → `inconclusive` `per-test-record-refused`.
3. Each side's record: `gateResults({stamp, outDir: dirname(stampPath), gateId: "test", root: cwd})` — the existing
   sha256 binding (**AC 5**: absent file, `null` digest, timed-out run, changed bytes are each a refusal) — then every
   entry `file` still absolute is passed through `baseCheckoutRelative(file, projectReal)` (new, `base-worktree.mjs`,
   below), then `buildRecord`. One parser, one binding, one id rule (L35).
4. **Domain by file membership (AC 2):** the HEAD stamp's `test` run `files` (a set; = `outside_tests`). A test whose
   `file` is not in it is ignored on both sides — never matched by name. Anomalies in a domain file refuse
   (`per-test-record-refused`); anomalies outside are ignored. The L34 refusal (`per-test-unaccounted-red`: a red side
   whose record holds no failed test and no suite error) is judged over the WHOLE record, as on the positional path.
5. `comparePerTest(base, head, domain)` — the existing export gains an optional third argument (positional callers
   pass none: unchanged). `test` moves from `pre_existing` to `regressions` when a domain test failed at head whose base
   status is not `failed` (passed, skipped, absent) or head has more suite errors (**AC 1**); otherwise it stays
   `pre_existing`. The report adds `per_test` (the 6.72.0 shape plus `ignored: {base, head}`, the counts left out by
   membership).
6. `--per-test` flags on the stamp path stay `usage-error` (they are the positional input form); the reason text
   changes to say the stamp path reads the stamps' own records when `testResults.test` is declared, still naming
   `regress-per-test-product`.

**AC 4:** nothing new is passed to the checker — config from the project root, records beside the stamps, the domain
from the HEAD stamp — so `loop-fresh-core.mjs` check E's existing re-run reproduces the verdict, and check J already
binds each results file. No code change in `loop-fresh-core.mjs` beyond a comment (Q4).

### 2. `base-worktree.mjs` — one owner for "is this a path in our base checkout"

`baseCheckoutRelative(p, projectReal, root = tempRoot())` (pure): if `p` is `<root>/<name>/<rest>` and
`isOurBaseDir(<root>/<name>, projectReal)`, return `<rest>`; else `p`. The naming rule stays in its one owner (L35).
Covers a fresh base, a retained base whose checkout is gone (the rule is on the string), and nothing else. Bound: a
`TMPDIR` changed between the base run and the verdict leaves base paths absolute → `absent` → a false RED, the stated
direction.

### 3. Entry-derived BASE: carry the results file (Q3)

- `entry-base-evidence-core.mjs`: the copy plan gains the mapped `test` slot's results file
  (`resultsFileName(src.seq, "base:test")` → `resultsFileName(seq, "test")`, sha256 = the entry run's
  `results_sha256`) when that digest is a string; `derivedBaseStamp` records the same digest on that run (else `null`,
  as today, so every existing fixture keeps its bytes).
- `entry-base-evidence.mjs` `materializeEntryBase`: copies it like a log (verified before and after the write), under
  `MAX_RESULTS_BYTES` (per-test-results-core), a failure is the existing `log-unverified` miss.
- `gate-run-core.mjs` `validateStamp`, the `regress/base ← entry` row: `results_sha256` is `null`, or — on the `test`
  slot only — a sha256 digest. Every other reused run (and every `verify ← regress/head` run) still requires `null`.

### 4. Routing and render

- `gate-run-core.mjs` `UNMEASURED_CODES` gains `per-test-record-refused` and `per-test-unaccounted-red` (Q4): a per-test
  refusal is an inconclusive verdict over accepted stamps, so check B passes it and `check-loop.mjs` stops
  `STOP_TERMINAL` / `unmeasured`, never S11. `loop-fresh-core.mjs`: the 6.59.0 comment names the two codes.
- `render-regression.mjs`: a "Per-test comparison" section when the report has `per_test` — counts, `still_failing`,
  `ignored`, and `new_failures` ids as FENCED data (`quote-core.mjs`), never inline.

### The recorded trade, stated (ticket constraint)

Under machine load a test red at head only reads as a regression where the gate exit read `pre_existing`: a false RED in
place of a false GREEN (PR #381's trade). Also: a head that timed out over a measured-red base, which read
`pre_existing`, is now `inconclusive` `per-test-record-refused` when the opt-in is declared (a killed run has no
record); and a base commit whose reporter config predates the opt-in gives an `inconclusive` only in the both-red row.
Stated in `regression-report.md`, `check-regress.mjs`'s header and the CHANGELOG entry.

### CORE-89 (not built here, P7) — what this leaves open on purpose

The comparison takes its domain as an argument; this increment supplies the HEAD run's `files`. CORE-89's
whole-suite HEAD run has `files: []`, so it must supply the inside complement instead (and the L34 refusal is already
judged over the whole record, so a head red owned only by inside tests is accounted for). Suite errors carry no file in
any supported format, so under a whole-suite run they stay whole-record — CORE-89's question.

## Files

- `pharn/floor/check-regress.mjs` — the stamp-path per-test rule, header section, the stamp-path `--per-test` reason —
  layer product floor
- `pharn/floor/check-regress.test.mjs` — new tests (AC 1, 2, 3, 5, refusals, ordering vs timed-out, L60 control) —
  apparatus test
- `pharn/floor/base-worktree.mjs` — `baseCheckoutRelative` (pure) — layer product floor
- `pharn/floor/base-worktree.test.mjs` — its tests — apparatus test
- `pharn/floor/entry-base-evidence-core.mjs` — the results-file copy in the plan and the derived stamp's digest — layer
  product floor
- `pharn/floor/entry-base-evidence-core.test.mjs` — tests — apparatus test
- `pharn/floor/entry-base-evidence.mjs` — the copy under the results cap — layer product floor
- `pharn/floor/entry-base-evidence.test.mjs` — tests — apparatus test
- `pharn/floor/gate-run-core.mjs` — the entry-derived `test` digest rule; `UNMEASURED_CODES` +2; the `NON_REUSABLE_IDS`
  comment — layer product floor
- `pharn/floor/gate-run-core.test.mjs` — tests (the exact-list pin updated to the new members) — apparatus test
- `pharn/floor/render-regression.mjs` — the per-test section — layer product floor
- `pharn/floor/render-regression.test.mjs` — tests — apparatus test
- `pharn/floor/loop-fresh-core.mjs` — comment only (the two codes under the 6.59.0 pass-through) — layer product floor
- `pharn/floor/check-loop-fresh.test.mjs` — AC 4 (E reproduces a per-test regression and a per-test pre_existing; one
  world per UNMEASURED member) — apparatus test
- `pharn/floor/stage-regress.mjs` — header only (where the per-test read happens) — layer product floor
- `pharn/floor/per-test-results-core.mjs` — only if an existing helper must be exported for reuse (L35); else untouched
  — layer product floor
- `.dev/floor/command-hygiene.test.mjs` — only if a pinned assertion over `pharn-regress.md` needs the new paragraph —
  apparatus test
- `pharn/floor/stage-regress.test.mjs` — end to end over a real repo: opted-in, both sides red, fresh BASE worktree with
  absolute report paths; an inside test ignored; no opt-in byte-identical — apparatus test
- `pharn/pharn-contracts/regression-report.md` — `per_test` on the product path, the rule, codes, trade — layer
  pharn-contracts
- `pharn/pharn-contracts/gate-run-record.md` — the reuse-matrix row (`results_sha256` on the entry-derived `test` slot),
  `UNMEASURED_CODES` — layer pharn-contracts
- `pharn/pharn-contracts/test-results-record.md` — regress is now a consumer; the "Regress records are partial, and
  unread" bullet corrected (L33-class) — layer pharn-contracts
- `.claude/commands/pharn-regress.md` — one paragraph: the opt-in per-test comparison — product command
- `.dev/guides/floor-gates.md` — the `--per-test` block, per-test results and entry-as-BASE lines — apparatus
- `SKILLS_VERSION` — 7.17.0 (minor: a new verdict capability on the product path) — repo meta
- `CHANGELOG.md` — `[7.17.0]` — repo meta
- `README.md` — version badge; the generated region if `docs:generate` moves it — repo meta
- `docs/capabilities/**` — regenerated by `npm run docs:generate` only — generated

### Not in scope (named)

- `pharn/floor/run-gates.mjs` — no change needed (above). CORE-89. E2E gates at regress (only `test` is compared).
- `pharn/LIMITS.md` — no sentence needed (Q6); the trade is stated in the contract.

## Contracts satisfied

- `regression-report.md` — `per_test` becomes a product-path block; `verdict` stays the only floor-read field (P4:
  the rule is cited from `check-regress.mjs`, not restated twice).
- `gate-run-record.md` — additive: `results_sha256` admitted on one reused slot; `SCHEMA` unchanged.
- `test-results-record.md` — no shape change; regress joins the consumer list.
- `stage-exit.md` — unchanged (an inconclusive regress is a `done` exit with `verdict: inconclusive`).

## Evals to write (P1)

No capability (`role:`) changes. Tests (none renamed or removed — pharn-ci test-integrity):

- AC 1 → both red, a domain test failed at head and passed at base → `regressions: ["test"]`, exit 1; the same set
  failing both sides → `pre_existing`, exit 0; base 0 / head ≠ 0 → regression without reading any record.
- AC 2 → a head failure in a file outside the HEAD run's `files`, with a name identical to a domain test's title, is
  ignored (`ignored.head` counts it; verdict `pre_existing`).
- AC 3 → the same both-red stamps without `testResults` (and with `testResults` naming only `e2e`): stdout
  byte-identical to the plain table; the EQUIVALENCE fixtures stay green unchanged.
- AC 4 → `check-loop-fresh.test.mjs`: a fixture with records and an opted-in config; E reproduces `regressions`; a
  hand-edited report verdict STOPs `report-verdict-mismatch`; the two new UNMEASURED codes pass B.
- AC 5 → each side: absent file, `null` digest, bytes changed after hashing, timed-out run → `inconclusive`
  `per-test-record-refused`, exit 2, never `pre_existing`; config-invalid → the same; unaccounted red → its code.
- Base paths: a vitest-json record with absolute paths under a `pharn-regress-base-<tag>-xxxxxx` root reads as the head
  ids (unit, and end to end through `stage-regress.mjs` with a real base worktree — L84's realistic-input test).
- Entry carriage: the plan copies the results file; the derived stamp carries the digest and validates; a digest on a
  non-`test` reused run is still `stamp-malformed` (the existing forgery test stays); a copy whose bytes do not hash is
  `log-unverified`.
- L60: a scratch-copy mutant without the per-test reclassification reads `no-regressions` where the real one reads
  `regressions` (the closure copy is derived from imports, L81).
- Render: `new_failures` ids appear only inside a fence; a hostile id (`{"toString":1}` never reaches it — the record
  builder types ids) and a backtick-laden id stay fenced.

## Guarantee audit (P0)

- "a per-test regression is reported when declared" → floor: enum-regex + content-hash (set membership over the record's
  ids, `results_sha256` re-hash); the records' truth is ADVISORY (the reporter's word, L43; project code a build can edit).
- "the results file is bound to its stamp" → floor: content-hash (`gateResults`), and check J at the loop. Bound (L58):
  the hash fixes the bytes the runner saw; a later write is a refusal, never folded in.
- "inside tests are ignored by file membership" → floor: set membership over the HEAD stamp's `files`. Bound: the
  reporter names the file (advisory, as for anomalies, `test-results-record.md`).
- "without `testResults` the report is byte-identical" → floor-tested equality of stdout (not a claim about every
  input; the fixtures named).
- "check-loop-fresh re-derives the verdict" → floor: E's re-run; agreement, never provenance (L43).
- "the entry-derived BASE carries the right file" → floor: content-hash before and after the copy; that entry evidence
  equals a fresh base is ADVISORY, unchanged from 6.49.0.
- Base path mapping → floor: string membership via `isOurBaseDir`; that the reporter used that root is ADVISORY.

## Trust audit (P2)

- The results files are untrusted project output: read under the byte cap, `O_NOFOLLOW`, parsed by the existing
  adapters. Test ids and files are opaque strings; they reach `per_test.new_failures` (untrusted DATA, read by no floor
  op) and `REGRESSION.md` only fenced. Refusal reasons quote through `shown()` (L62).
- `pharn.config.json` is agent-reachable (no hook): a build can switch the opt-in off or change the format. Stated, as
  in `test-results-record.md`.

## Determinism audit (P5)

Every branch is membership or integer comparison: config key presence, exit ≠ 0, set membership of files and ids,
status equality, count comparison. Every refusal is a closed reason code; no fallback guesses.

## Applied lessons

- L34 — the per-test view is read only where it can change a row, and a red side whose record accounts for nothing is
  refused (`per-test-unaccounted-red`), judged over the whole record; an empty domain with a red head is that refusal,
  never a vacuous `pre_existing`.
- L35 — one parser and one binding (`gateResults` + `buildRecord`), one id rule (`testIdOf`), and the base-checkout
  naming stays in `base-worktree.mjs` (a new pure export, not a copied prefix rule).
- L36 — the two per-test codes join `UNMEASURED_CODES`, whose exact-list and one-world-per-member tests are updated, so
  the routing set stays closed in both directions.
- L41 — the `root` default of `baseCheckoutRelative` (`tempRoot()`) is exercised by the end-to-end test, which passes
  nothing; unit tests that pass a root do not stand in for it.
- L43 — every check here certifies agreement (record ↔ stamp digest, report ↔ re-derivation), never what ran; stated in
  the contract and the header.
- L58 — the results file is a live referent; the check compares the bytes the runner hashed and refuses later writes,
  it never re-reads a growing file.
- L60 — the mutation control removes the per-test reclassification itself and asserts the verdict flips, per asserted
  property; the entry-carriage control removes the copy and asserts the derived stamp refuses.
- L62 — every quoted value in a new refusal goes through `shown()` (the record builder's reasons already do).
- L81 — the scratch-copy mutant test derives its file list from imports, so the new `base-worktree.mjs` import does
  not break it; no new hand-picked copy list is added.
- L84 — the feature is a branch off a safe default (`not-configured`); the end-to-end test takes the branch on
  realistic input (a real base worktree, absolute report paths), so a dead branch cannot read as "nothing to do".

## GATE 1 questions and decisions

All seven were resolved on 2026-11-16 by the batch orchestrator (a model) under the user's delegation ("You make all
decisions") — a delegated model decision, not a human approval: APPROVED as written, every recommendation taken.
Q1: GO — `test` at about 9 min per run is roughly 56% of the 16.1-min regress median (baseline §12); CORE-88's timing
pass was still running and the go did not wait for it.

- **Q1 — Start condition.** The ticket starts only if per-gate durations show `test` at regress is a material share;
  the baseline (§12) has regress at a median 16.1 min (n = 11) and `test` about 9 min per run, share not recorded.
  **Recommended: go** (the masking fix stands on its own recorded failure, and CORE-89 needs it); the orchestrator
  settles it from CORE-88's measurement.
- **Q2 — Where "inside" comes from.** (a) the HEAD stamp's `test` run `files` (= `outside_tests`): no new input, check
  E reproduces it unchanged. (b) the `--inside` complement: makes the advisory echo a decision input and needs check E
  to obtain `inside`. **Recommended: (a)**, with the domain an argument so CORE-89 can supply (b)'s set.
- **Q3 — Entry-derived BASE.** (a) carry the entry `base:test` results file into the derived stamp (as designed).
  (b) make entry evidence a MISS when `testResults.test` is declared (a fresh base run: ~9 min more per regress in the
  measured project). (c) leave it: every both-red regress over entry evidence is `inconclusive`. **Recommended: (a).**
- **Q4 — Routing of a per-test refusal in a loop.** (a) add both codes to `UNMEASURED_CODES` (check B passes it;
  `STOP_TERMINAL` / `unmeasured`). (b) leave them a check-B STOP (S11, the 6.59.0 mislabel class). **Recommended: (a).**
- **Q5 — When records are read.** (a) only when `test` is red at both sides. (b) whenever declared (a base without the
  reporter would make every regress `inconclusive`). **Recommended: (a).**
- **Q6 — `pharn/LIMITS.md`.** **Recommended: no sentence**; the trade lives in `regression-report.md` and the CHANGELOG.
  If wanted, the PR body proposes one for §2's regress residual.
- **Q7 — Version.** **Recommended: 7.17.0 (minor)**; no `MIN_CLI` bump (the config key already exists; the stamp change
  is additive and read by the same installed floor).
