# PLAN — loop-honest-stop

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L6, L15, L19, L34, L35, L36, L43, L54, L62, L72]
- increment: Make `/pharn-loop`'s stop and its records say what actually happened, for four audit findings of
  2026-10-12: the recorded `cap` is checked against the cap the run opened with (LOOP-2); an inconclusive reconcile
  gate stops under its own terminal cause instead of being called a detected escape (LOOP-3); the gates a project's
  `gates.exclude` removed are named in `RUN-REPORT.md`, the closeout's commit message and its document (so the Step 7
  summary) (LOOP-4); and the always-loaded instruction set's token estimate is recorded at Step 1a and shown in
  `RUN-REPORT.md`'s `## Tokens` (CTX-14).
- layer(s): product floor (`pharn/floor/`), product commands (`.claude/commands/pharn-loop*.md`), contracts
  (`pharn/pharn-contracts/`), build apparatus (`.dev/floor/` tests, `.dev/guides/`), repo meta
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## The triggering failures (P7), re-read live at `d5453a17` (SKILLS_VERSION 6.64.2)

All four are findings of the 2026-10-12 audit; the orchestrator's triage confirmed them open at `d5453a17`, and each
was re-read in the live code this run.

- **LOOP-2.** `/pharn-loop` types `--iter` / `--cap` into every `check-loop.mjs` call, and the record's `cap` is copied
  from that typing. `.claude/hooks/require-loop-record.cjs` `markerMode` writes the cap the run opened with into
  `.pharn/pharn-loop/<name>/active.json` (`cap: Number(argv[3])`), and nothing reads it: `check-loop-decision.mjs`
  re-runs `check-loop.mjs` with the record's own `cap`, so a record `cap: 7` over a marker `cap: 3` (a run that kept
  iterating past its cap and recorded the cap it used) re-derives GREEN and is committed. The marker is closed only
  by the closeout's final release (`loop-closeout.mjs` step 15, after the decision check), so it is readable when the
  check runs.
- **LOOP-3.** `check-bash-reconcile.mjs` exits `2` (INCONCLUSIVE — no baseline under `--require-baseline`, a refused
  probe marker, …). The gate runner records `"reconcile": 2` in `verify-report.json` `gates`, `check-verify.mjs` lists
  it in `failing_gates`, and `check-loop.mjs` stops `STOP_TERMINAL` with `terminal_cause: reconcile` and the reason
  "a retry would re-anchor and erase the detected escape". Nothing was detected. 6.59.0's `unmeasured` covers only a
  runner timeout and exit 126/127.
- **LOOP-4.** `gates.exclude` (agent-editable `pharn.config.json`) is disclosed in `VERIFY.md` / `REGRESSION.md`
  (`render-verify.mjs` / `render-regression.mjs` `exclusionLines`) and nowhere a loop's reader looks last:
  `render-run-report.mjs` renders no excluded id, the closeout's commit message is
  `pharn-loop(<name>): STOP_GREEN after N iteration(s)`, and the Step 7 summary names none. A `STOP_GREEN` over a
  suite minus `e2e` reads as a full green.
- **CTX-14.** `node pharn/floor/check-instruction-files.mjs --report` (its `estimated_tokens`) is run by no command,
  and `RUN-REPORT.md`'s `## Tokens` has no instruction-set figure.

## Design

### LOOP-2 — `CAP_MISMATCH` in `check-loop-decision.mjs`

After the live re-run, beside `DECISION_MISMATCH` and `MODE_MISMATCH` (collected, never an early return, so every
mismatch prints and the existing tests that match `STOP_TERMINAL` in the RED text still see it):

- **Where the marker is.** Derived from the record path, never an argument: the record must sit at
  `<root>/pharn/features/<name>/LOOP.md` (two literal parent segments, compared exactly); the marker is
  `<root>/.pharn/pharn-loop/<name>/active.json`. Read with `lstat` first (a regular file only, never through a
  symlink — L54), then `JSON.parse`.
- **What is compared.** The marker's `schema` must equal `pharn-loop-active/1` and its `name` the record's `<name>`;
  its `cap` must be a positive safe integer; and it must equal the record's `cap` (`Number(cap)`). Unequal → RED
  `CAP_MISMATCH`, naming both values (integers only; no marker text is quoted — L62).
- **Absent or unusable marker → RED `CAP_UNWITNESSED`, fail-closed.** Recommended answer to the finding's
  question, justified: (1) the only caller is the closeout, which runs it before the Final step's `--close`, and
  every run writes the marker at Step 1a (a non-zero `--open` is S9) — so a missing marker means Step 1a's open was
  skipped, which also left the Stop guard unarmed; (2) the check gates an unattended commit with nobody between the
  record and the branch, and this checker is fail-closed throughout; (3) advisory-on-absence would let the
  easiest evasion (skip `--open`) restore exactly the gap LOOP-2 names. Cost, stated: re-running the checker by hand
  after the Final step closed the marker REDs `CAP_UNWITNESSED`, and the message says so (the cap the run opened with
  is no longer on disk); a blocked record is still SKIPPED before any of this. A record not at the
  `pharn/features/<name>/` layout is the same RED (the marker cannot be located).
- **The schema has one owner (L35).** `require-loop-record.cjs` writes the marker and is a human-only control file;
  this checker restates the one literal `pharn-loop-active/1` and a test pins it equal to the hook's exported
  `SCHEMA` and reads a marker the real `--open` wrote. No cross-tree import (the floor never imports `.claude/hooks/`).
- **Bound (L43).** Agreement between two files under the writable tree, never provenance: a model that rewrites the
  marker through Bash and the record together passes. It closes the typed-cap divergence, not a forgery.
- **Not done (named):** the optional cross-check of `iterations` against `markers.jsonl` stage-start entries. The
  ledger markers are model-invoked too, so the check would be agreement between two model-driven stores; left as a
  named follow-up `loop-iterations-markers`.

### LOOP-3 — `terminal_cause: reconcile-inconclusive` in `check-loop.mjs`

- The decision table does not change: a verify `FAIL` whose `failing_gates` holds `reconcile` is still
  `STOP_TERMINAL`, exit 4, after `ac-evidence`. Only the cause and the reason change, and only when the report's
  `gates` is a plain object with an OWN `reconcile` key (L15) whose value is exactly the number `2` (the
  checker's INCONCLUSIVE exit, read from its structured location — L6): `terminal_cause: reconcile-inconclusive`,
  reason "the reconcile gate could not decide (check-bash-reconcile.mjs exit 2, INCONCLUSIVE — for example no baseline
  was anchored): no escape was detected and none was ruled out; a retry would re-anchor over a window nobody
  reconciled; stop". Any other value, a missing key, or a non-object `gates` keeps `reconcile` (the old cause — the
  conservative reading).
- `TERMINAL_CAUSES` becomes `[unmeasured, ac-evidence, reconcile, reconcile-inconclusive]`. L72: grepped the whole
  tree for consumers of the cause tokens — `check-loop.test.mjs` (closure assertion, updated), `check-loop-fresh.test.mjs`
  (asserts `ac-evidence` / `null` only, unchanged), `pharn-loop.md` Step 5 (`4` bullet, updated), and four contract
  sentences (updated below). No floor code branches on a cause token besides `check-loop.mjs` itself.
- `render-run-report.mjs` `reconcileLines`: when the reconcile gate's recorded exit is `2`, its heading reads
  "reconcile — INCONCLUSIVE (exit 2): the checker could not decide; no escape was detected and none was ruled out"
  instead of "why the gate failed". The block below it is unchanged (the 6.55.0 `reconcile_detail` renderer).

### LOOP-4 — the excluded gates in RUN-REPORT, the commit message and the closeout document

- **One reader (L35).** `gate-exclusion-core.mjs` (the owner of "a project's declaration of excluded gates") gains
  `excludedFacts(block)`: `null` when the block is absent or not a plain object, else
  `{ count, ids, unlisted, declaredHere }` — `ids` are the ALLOWLIST members in ALLOWLIST order, `unlisted` counts
  the rest, `declaredHere` is `declared_in === EXCLUSION_DECLARED_IN`. Total over parsed JSON (no `String()` on a
  value — L62). `render-verify.mjs` / `render-regression.mjs` keep their own `exclusionLines` (not refactored here; a
  follow-up `exclusion-lines-one-renderer` could move them onto it).
- **RUN-REPORT `## Verdicts`.** Directly under the verify verdict line, one line from `verify.gate_run.excluded`;
  under the regress line, one from `regress.gate_run.head.excluded`. Ids inline only after the ALLOWLIST test, as in
  VERIFY.md; the text says the verdict covers only the gates that ran. No block → no line (byte-identical otherwise).
- **The closeout.** `loop-closeout.mjs` reads `verify-report.json` and, in full mode only, `regression-report.json`
  (lstat-regular, `JSON.parse`, via `excludedFacts`) once, after the decision check, into a new closed document key
  `excluded_gates`: `null` when neither report was readable, else `{ ids, unlisted }` (the union, ALLOWLIST order).
  On a green commit with a non-empty union, the commit message gets a third `-m` paragraph:
  `Gates excluded by the project's pharn.config.json gates.exclude, NOT run by the final verify or regress: e2e. The
green covers only the gates that ran.` (`+N id(s) outside the allowlist` when `unlisted > 0`). Only ALLOWLIST tokens
  and digits reach argv (P2). An empty union leaves the message byte-identical.
- **Step 7 (`pharn-loop-close.md`).** One bullet: name the document's `excluded_gates` ids as excluded and not run,
  and say the stop covers only the gates that ran; `null` → no verdict report was read.

### CTX-14 — the instruction-set estimate

- **Step 1a item 5 (`pharn-loop.md`)**, after the `run-start` marker, one pinned line:
  `node pharn/floor/check-instruction-files.mjs --report > .pharn/pharn-loop/<name>/instruction-files.json`. Its exit
  never stops the run (advisory; a failed write renders `n/a`). The redirect is a Bash write into gitignored `.pharn/`
  (L19 — declared here, outside both guards, and outside the reconciled set because `.pharn/` is ignored). The grant
  line `Bash(node pharn/floor/check-instruction-files.mjs --report > .pharn/pharn-loop/*/instruction-files.json)` is
  added to `allowed-tools` (the loop-no-prompts test derives the grant set from the pinned lines, both ways), and
  `pharn/floor/check-instruction-files.mjs` to `reads:`.
- **RUN-REPORT `## Tokens`.** After the token table (or its `n/a`), a block read from
  `.pharn/pharn-loop/<name>/instruction-files.json` (the `pre-run-status.txt` precedent): rendered only when `schema`
  is `pharn-instruction-files/1`, `mode` `report`, `verdict` `reported`, and `estimated_tokens` / `total_bytes` are
  non-negative safe integers and `files` an array — numbers inline after those tests. It says the figure is an
  ESTIMATE (bytes / 4, `LIMITS.md §1c`), taken once at the run's start, that the files ride in each context's prefix
  so they are already inside the input/cache counts above (never added to them), and that it is the checker's model
  of the loader (`LIMITS.md §3e`). Anything else → one `n/a — …` line (absent file: "`/pharn-loop` records it at Step
  1a; `/pharn-ship` does not").
- **`/pharn-ship` is not wired** (the finding's "if cheap"): it has no per-run directory the renderer reads, and group
  K edits `pharn-ship.md` in a later wave. Its RUN-REPORT shows the `n/a` line. Named follow-up `ship-instruction-set`.

## Applied lessons

- L6 — the reconcile gate's INCONCLUSIVE is read from the report's structured `gates.reconcile` exit, never from the
  `reconcile_detail` prose or a reason string; the marker's cap from its JSON key.
- L15 — `gates.reconcile` and every report/marker key are read through `Object.hasOwn` on a plain-object check.
- L19 — the Step 1a `--report` redirect is a Bash write; it is declared in this plan and lands in gitignored
  `.pharn/`, and the docs regeneration is the declared generator write.
- L34 — every new renderer test asserts the line is PRESENT for a populated input and ABSENT for an absent block, so
  an empty emission cannot pass as "no exclusion".
- L35 — one reader of an `excluded` block (`excludedFacts`) for the two new consumers; the marker schema keeps its one
  owner (the hook) and the checker's restated literal is pinned to it by a test.
- L36 — `TERMINAL_CAUSES`' closure test is widened to the new member and still asserts closure both ways (every
  emitted cause a member, every member emitted by some fixture); `DOC_KEYS` stays closed.
- L43 — `CAP_MISMATCH` certifies agreement between the record and the marker, never provenance; the bound is written in
  the checker header, the contract and the claims bullet.
- L54 — the marker is read with `lstat` first; a symlink or a dangling link at that path is `CAP_UNWITNESSED`, tested.
- L62 — no marker or report value is quoted through `String()`; the RED messages carry only integers the checker
  validated, and the renderers quote through `dataText`.
- L72 — adding a member to `TERMINAL_CAUSES`: every consumer of the cause tokens was grepped and is declared below.

## Files

- `pharn/floor/check-loop-decision.mjs` — `CAP_MISMATCH` / `CAP_UNWITNESSED` after the re-run; header updated. —
  layer: product floor
- `pharn/floor/check-loop-decision.test.mjs` — the fixture helper builds the `pharn/features/<name>/` layout plus a
  marker (cap from the record unless overridden); new tests: equal cap GREEN, unequal RED naming both, marker absent /
  symlink / bad schema / wrong name / bad cap RED, record off-layout RED, blocked record still SKIPPED with no marker,
  the restated schema equals the hook's `SCHEMA`, and a marker written by the real `--open` reads. — layer: test
- `pharn/floor/check-loop.mjs` — `reconcile-inconclusive`; header and table comment. — layer: product floor
- `pharn/floor/check-loop.test.mjs` — exit-2 reconcile → the new cause; any other exit, missing key, non-object `gates`
  → `reconcile`; ac-evidence still wins; closure widened. — layer: test
- `pharn/floor/check-loop-fresh.test.mjs` — touched only if the END-TO-END record test needs a marker or a message
  pattern (declared so the build may adjust it). — layer: test
- `pharn/floor/gate-exclusion-core.mjs` — header only: its disclosure list names RUN-REPORT.md and the loop commit
  (amended after the grill: the reader moved to `gate-run-core.mjs`). — layer: product floor
- `pharn/floor/gate-run-core.mjs` — `excludedFacts`, beside `excludedBlock` / `EXCLUDED_KEYS` (amended after the grill,
  finding P3). — layer: product floor
- `pharn/floor/gate-run-core.test.mjs` — `excludedFacts` over absent, malformed, `{"toString":1}`, mixed ids. — layer:
  test
- `pharn/floor/render-run-report.mjs` — the two exclusion lines, the INCONCLUSIVE reconcile heading, the instruction-set
  block. — layer: product floor
- `pharn/floor/render-run-report.test.mjs` — present/absent tests for all three. — layer: test
- `pharn/floor/loop-closeout.mjs` — `excluded_gates` document key, the commit message's third paragraph. — layer:
  product floor
- `pharn/floor/loop-closeout.test.mjs` — `DOC_KEYS`, `commitArgs` with and without exclusions, a document carrying the
  ids. — layer: test
- `.claude/commands/pharn-loop.md` — the Step 1a item 5 line, its grant and `reads:` entry; Step 5's `4` bullet names
  `reconcile-inconclusive`. — layer: product command
- `.claude/commands/pharn-loop-close.md` — Step 7's excluded-gates bullet; the claims bullet on terminal stops and on
  the cap check. — layer: product command
- `pharn/pharn-contracts/verify-report.md` — the `gates` row and the floor-consumer bullet (`check-loop.mjs` reads the
  reconcile exit for its cause only); the `gate_run.excluded` bullet names RUN-REPORT.md and the commit. — layer:
  contracts
- `pharn/pharn-contracts/loop-record.md` — the `cap` paragraph (compared with the run marker; `CAP_UNWITNESSED`), and
  the `STOP_TERMINAL` paragraph (6.65.0: `reconcile-inconclusive`). — layer: contracts
- `pharn/pharn-contracts/reconciliation-record.md` — the two sentences naming the cause `reconcile`. — layer: contracts
- `.dev/floor/command-hygiene.test.mjs` — only a `COMMAND_BYTE_CEILINGS` row, if a command crosses it (by the rule). —
  layer: build apparatus
- `.dev/floor/stage-load-budget.test.mjs` — only a `STAGE_LOAD_CEILINGS` row, if crossed (by the rule). — layer: build
  apparatus
- `.dev/guides/floor-orchestration.md` — the `check-loop.mjs`, `check-loop-decision.mjs` and closeouts entries. —
  layer: build apparatus
- `.dev/guides/floor-gates.md` — the gate-exclusion and instruction-files entries. — layer: build apparatus
- `SKILLS_VERSION` — 6.64.2 → 6.65.0 (minor, below). — layer: repo meta
- `README.md` — the version badge and the generated `## Current state` region (regenerated). — layer: repo meta
- `CHANGELOG.md` — one new `## [6.65.0] - 2026-10-19` section. — layer: repo meta
- `docs/capabilities/README.md` — regenerated by `npm run docs:generate` if its input changed (a declared generator
  write, L19). — layer: generated
- `.dev/features/loop-honest-stop/PLAN.md`, `GRILL.md`, `REGRESSION.md`, `regression-report.json`, `VERIFY.md`,
  `verify-report.json`, `REVIEW.md`, `SHIP.md` — this increment's trail. — layer: build apparatus

### Not changed

- The four trusted docs, `CODEOWNERS`, `.claude/settings*.json`, every `.claude/hooks/*.cjs` (the marker writer stays
  as it is; it already records `cap`), `pharn.spec-template.md`, `MIN_CLI`.
- `check-loop-record.mjs` (`cap` stays optional to the shape checker; the decision checker is where it is compared).
- `render-verify.mjs`, `render-regression.mjs` (their exclusion lines already exist), `check-verify.mjs`,
  `check-bash-reconcile.mjs`, the `--report` CLI itself.
- `.claude/commands/pharn-ship*.md` and `ship-closeout.mjs`.
- The frontmatter reader code in `check-loop-decision.mjs` / `loop-closeout.mjs` (`envelope`, `readEnvelope`), which
  group B is replacing — new code sits beside it and calls it unchanged.
- No HUMAN-PATCH.md: `LIMITS.md §3e`'s "`--report` is advisory" stays true, and no trusted-doc sentence becomes false.

## Version and CHANGELOG

**Minor, 6.64.2 → 6.65.0** (subject to renumbering after `git merge origin/main`, by diff). Justification: the
increment adds a member to `check-loop.mjs`'s closed `terminal_cause` output vocabulary, a new RED class
(`CAP_MISMATCH` / `CAP_UNWITNESSED`) to a checker that gates a commit, a new key to the closeout's closed document,
and a new pinned Step-1a line — new shipped behaviour, not only a correction of shipped bytes. Not major: no record,
report or frontmatter shape an existing install reads becomes invalid (the record shape is unchanged; a new cause
token reaches only `pharn-loop.md`'s own Step 5, updated in the same release). `MIN_CLI` unchanged (no installed path
moves). CHANGELOG: one `### Changed` (the stop and its records) and one `### Fixed` entry, each naming the audit ids.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — `cap`'s meaning is unchanged; its re-derivation gains the marker comparison.
- `pharn/pharn-contracts/verify-report.md` — the report shape is unchanged; one more floor read of `gates` is declared.
- `pharn/pharn-contracts/gate-run-record.md` — `excluded`'s shape is read, never changed.
- `pharn/pharn-contracts/reconciliation-record.md` — the checker's exit 2 meaning is cited, not restated.

## Evals to write (P1)

No Capability (`role:`) is added or changed, so no eval is owed; the floor tests listed under `## Files` are the
specification of each new behaviour.

## Guarantee audit (P0)

- "a committed loop record's `cap` equals the cap the run opened with" → floor: enum-regex (integer equality of two
  parsed fields, plus `lstat`/schema membership), in `check-loop-decision.mjs`, which gates the commit. Bound:
  agreement of two writable files, never provenance (L43); that the run opened the marker with the user's
  `--max-iter` is advisory (the model types it once, at Step 1a).
- "an inconclusive reconcile gate stops as `reconcile-inconclusive`, not as a detected escape" → floor: enum-regex
  (own-key integer equality over `gates.reconcile`). The stop itself was already floor and does not change.
- "RUN-REPORT, the commit message and the closeout document name the excluded gates" → floor-tested code over the
  reports (membership + present/absent tests); that the reports' `excluded` block is truthful is the stamp's own
  bound (`gate-run-record.md`); that the Step 7 summary repeats it is advisory.
- "RUN-REPORT shows the instruction-set estimate" → advisory: the figure is bytes / 4 over the checker's model of the
  loader (`LIMITS.md §1c`, §3e); that Step 1a ran the line is advisory; the renderer's shape tests are floor-tested
  code that ANNOTATES and gates nothing.

## Trust audit (P2)

- The marker, `verify-report.json`, `regression-report.json` and `instruction-files.json` are files under the writable
  tree: values reach output only as validated integers or ALLOWLIST tokens; anything else is a fixed phrase or
  `dataText`. Nothing from them reaches a shell (the commit's `-m` carries ALLOWLIST tokens and digits only, through an
  argv vector).

## Determinism audit (P5)

- Every new branch is an equality or membership test (`=== 2`, ALLOWLIST membership, schema string equality, integer
  equality, `lstat` file type). The fallbacks are fail-closed RED (`CAP_UNWITNESSED`) or the old conservative cause
  (`reconcile`) or an `n/a` line — never a guess.

## Open questions (HALT)

- **Q1 — marker absent: fail-closed or advisory?** Recommended: fail-closed `CAP_UNWITNESSED` (reasons in the LOOP-2
  design). Alternative: GREEN with a WARN line, which leaves a run that skipped `--open` able to record any cap.
- **Q2 — bump size.** Recommended: minor (6.65.0), for the reasons under `## Version and CHANGELOG`. Alternative:
  patch, reading every item as an honesty correction of shipped behaviour.
- **Q3 — `/pharn-ship` instruction-set estimate.** Recommended: not in this increment (no per-run directory the
  renderer reads; group K owns `pharn-ship.md` next). Alternative: add a `--report` line to `/pharn-ship` writing
  under `.pharn/pharn-ship/<name>/` and teach the renderer that path.

## GATE 1 — decided under delegation (2026-10-19; appended below the planned text, not part of it)

Decided by the batch orchestrator under the maintainer's delegation (COMMON.md), a model decision, not a human
approval: **APPROVED.**

- Q1: fail-closed `CAP_UNWITNESSED`, **on condition** that every path reaching `check-loop-decision.mjs` is verified
  (and tested) to have opened the marker — full and `--quick` loops, and any blocked or terminal closeout path that
  calls it; a legitimate path with no marker is exempted explicitly rather than RED.
- Q2: minor (6.65.0), renumbered at PR time.
- Q3: `/pharn-ship` left out; follow-up `ship-instruction-set`.

**The condition, verified at planning time (to be pinned by tests at build).** `check-loop-decision.mjs` has one
caller, `loop-closeout.mjs` (`git grep`), which runs it on every non-blocked record and before its own final
`require-loop-record.cjs --close` (closeout step 15). A closeout runs only when `pharn/features/<name>/` exists; that
directory is first written by `/pharn-spec` (Step 3), after Step 1a item 4's `--open`, and a non-zero `--open` stops S9
before any feature directory, with no record. `--quick` runs Step 1a unchanged (`pharn-loop-quick.md` item 1). A
blocked record (`INCONCLUSIVE` + `blocked`) is skipped before the marker is read, so the one path that may lack a
marker — a blocked stop — is already exempt. A closeout exit 5 (repair, re-run with `--after-repair`) and exit 2
(refused, re-run) both stop before the release step, so the marker is still open on the re-run. The model's own
Final-step `--close` follows only exit 4 / 2 / a crash, after which the decision check does not run again (Step 6d
re-runs only `check-loop-record.mjs`). Tests to add: (a) in `loop-closeout.test.mjs`, `closeLoop` runs the decision
check before the guard's `--close` on every path that runs both (a recording fake `run`); (b) in the command family,
the `--open` line sits in Step 1a, before the `## Step 2` heading and before every `check-loop.mjs` and
`loop-closeout.mjs` pinned line, and `--close` appears only in the close part's Final step; (c) a blocked record with
no marker stays GREEN SKIPPED.

## Post-grill amendments (2026-10-19; a model decision under the same delegation, made before build Step 0)

`GRILL.md` raised four advisory concerns; all four are adopted, and `## Files` above is amended accordingly:

1. **`ITER_OVER_CAP` (GRILL, P7 important).** `check-loop-decision.mjs` also REDs a non-blocked record whose
   `iterations` exceeds its `cap`: a compliant run's stop is always at `iter <= cap` (CONTINUE needs `iter < cap`,
   STOP_CAP fires at the first `iter >= cap`), so a green at iteration 5 over cap 3 is no longer committed. Bound:
   `iterations` is still typed, so an under-count passes. Same file and tests.
2. **`excludedFacts` lives in `gate-run-core.mjs` (GRILL, P3 important)**, beside the `excludedBlock` writer and the
   `EXCLUDED_KEYS` shape it reads; `gate-exclusion-core.mjs` changes only its header's disclosure list.
3. **The crashed-reconcile bound is named (GRILL, P7 minor)** in `check-loop.mjs`'s header and the
   `reconciliation-record.md` sentence: a checker that crashed exits 1, its ESCAPE code, so it still reads as
   `reconcile`; `reconcile_detail.state` `not-checker-json` shows it in the reports.
4. **Test (b) lives in `pharn/floor/loop-closeout.test.mjs` (GRILL, P1 minor).**
