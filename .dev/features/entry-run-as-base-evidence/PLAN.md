# PLAN — entry-run-as-base-evidence: /pharn-regress takes its BASE evidence from the run's own entry gates when tested code shows they are that BASE

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L24, L29, L34, L35, L36, L42, L43, L45, L54, L58, L59, L60, L62, L65, L66]
- increment: the entry check also runs regress's own BASE `test` execution (an evidence-only slot), and when 6.33.0's BASE-reuse predicate misses, `/pharn-regress` checks whether this delivery run's validated entry execution holds exactly the BASE evidence it needs. If it does, regress writes an explicitly entry-derived `regress/base` stamp and skips the BASE worktree, the install and every BASE gate. Otherwise the BASE side runs exactly as today.
- layer(s): pharn-floor (product), pharn-contracts (three contracts), product `.claude/commands` (one claims bullet)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Base

- `origin/main` = `0e38b861f7839a7c19f8bb29756888d84e152568` (SKILLS_VERSION 6.48.0), fetched this run. This is the reviewed
  SHA. The branch `feat/entry-run-as-base-evidence` is cut from it.
- Current main does **not** implement the capability. The named follow-up `entry-run-as-base-evidence`
  (`.dev/features/loop-entry-preflight/PLAN.md`, "Follow-ups") is unbuilt. Nothing reads an entry stamp except
  `entry-gates.mjs`. `gate-run-core.mjs` admits a reused run only in a `verify` stamp, sourced from `regress/head`.

## GATE 1 record

The maintainer answered in chat (2026-10-06): Q2 as written, Q3 "feature dir only", Q4 "entry ≤ regress". **Q1
("stop: rethink scope")** came with the instruction "propose a proper solution". The maintainer then chose the
proposal below, the evidence-only `base:test` slot (§1), and to **always run it**: no `--base-test` flag, so no
command control-flow edit, and quick runs, which skip regress, pay it as background work. The original Q1 framing
(exact shape, with `test` always missing) is superseded. This revised plan is re-presented for the final approval.

## Why (P7)

The trigger is the maintainer's explicit direction ("PR 4"). It implements the follow-up named in 6.42.0, whose reason
was measured in a real run (`.dev/measurements/loop-wall-clock-2026-10-05.md` §5): the 92-minute `billing-plan-catalog`
run's regress needed two script calls for the BASE side (146.2 s: worktree + 17.1 s `npm ci` + base `test`; 192.1 s:
base `typecheck` + `build`), and the nested worktree lacked the ignored `.env.local` that the entry tree had, so BASE
read differently for an environment reason (`.dev/features/loop-entry-preflight/PLAN.md`, fidelity row). **That run's
BASE `test` carried an explicit outside-test list, which entry's full-suite `test` can never match exactly.** That is
why the slot exists (Q1). The benefit claimed is the one this plan measures: process counts and wall-clock on a
controlled fixture. No real-project saving is claimed.

## Confirmed current behavior (read this run, at `0e38b86`)

- **Entry** (`entry-gates.mjs`): `--start` records `runner.json` `{nonce, timeout_ms, d0}` and runs `run-gates.mjs init
--stage entry`. The set is verify's discovered set, `STYLE_SET` first, e2e kept, no `reconcile`. Its fingerprint is
  `ENTRY_ALGO`, which excludes `pharn/features/<name>/`. The detached runner runs one `run --next` per gate, records the
  feature-dir digest and the changed-path listing before and after each gate, and writes `result.json` last. `--wait`
  checks the nonce and feature binding, `resultRecordDefect`, sha256(stamp) == `result.stamp_sha256`,
  `validateStamp(…, {stage: "entry", feature})` and `ENTRY_ALGO`, then builds `entryVerdict`. Nothing protects these
  files afterwards: `.pharn/pharn-entry/` is write-tool reachable.
- **Pre-run snapshot**: `/pharn-loop` Step 1a runs marker → snapshot → run-start → entry `--start`, before the feature
  directory exists. `/pharn-ship` Step 2 item 1 runs marker → snapshot → entry `--start` after GATE 1, so **a ship
  snapshot always lists `pharn/features/<name>/SPEC.md`**.
- **Regress phases**: `drain-head` → HEAD offer → `decideFromDisk` (6.33.0) → HIT: `verdict`, MISS:
  `worktree → install → base-init → drain-base → verdict`. At `verdict` a persisted HIT is re-decided in full.
  `check-regress.mjs verdict` validates both stamps (regress/base, regress/head), `base.head == --base`, equal ids
  and `required`. `phaseHeadInstall` runs in `head-init`, before all of this.
- **Regress's `test` shape**: `computeTests` lists `git ls-files -z --cached --others --exclude-standard` filtered by
  `isTestFile` (TEST_FILE_RULE). `partitionScope` keeps those not in `inside` (changed since base), in git's order. The
  head spec gives `test` `files = outside_tests`, and base-init copies it. With `files: []` the slot is not run
  (`ran: false, reason: "no-files"`). Entry's `test` is `npm run test` with `files: []` and runs the whole suite.
- **Every BASE-stamp consumer** (grep, this run): `check-regress.mjs` (`validateStamp`, `stampToMap`, `gateRunBlock`);
  `loop-fresh-core.mjs` C (validateStamp regress/base), D (`gate_run.base.stamp_sha256`), J (`.out`/`.err` digests in
  the stamp's directory; `results_sha256` when it is a string), E (re-runs check-regress over the stamps), H
  (`head == --base`); `decideBaseReuse`; `stage-work.mjs`; `render-regression.mjs`. `check-loop`, `check-ship`, the
  briefing, the run report and `ship-outcome-core` read the report's named verdict fields only.

## The design

### 1. The entry `base:test` slot — the exact BASE `test` execution, produced by regress's own rules

`entry-gates.mjs --start` computes, **before** `run-gates init`, the list regress's default rule would hand its `test`
gate if nothing had changed since now: `defaultTestUniverse()` (the `computeTests` default branch, moved to
`scope-inputs.mjs` so stage-regress and entry share ONE owner, L35) minus `changedPaths(HEAD)` (the partition's own
listing). It writes that list to `.pharn/pharn-entry/base-tests.json` and passes `--base-tests <file>` to
`run-gates init --stage entry` (read like `--targets`: a file, every path checked by `ac-tests-core.mjs badPath`).
`resolveSet` (stage `entry` only) then inserts one entry right after the `STYLE_SET` part:

```text
{id: "base:test", shell: <discovered test's shell>, argv: <discovered test's argv>, files: <the list>}
```

It is inserted only when the discovered set has `test` and the list is non-empty. `ENTRY_BASE_TEST_ID = "base:test"`
joins `RESERVED_IDS`, so no `--gates` token can claim it. The slot:

- is **evidence only**: `entryVerdict` never counts it red or unattributed, so it never causes S14. It is listed in
  the document's `gates` (and `mutated` when it moved the tree), truthfully;
- runs in the same stamp, the same fingerprint chain and under the same timeout. It costs one more test-suite run of
  background entry work. It runs in quick mode too (the maintainer's choice; quick skips regress, so there it is
  unused);
- matches regress's BASE `test` exactly when **the build modified or deleted no pre-existing test file** (new test
  files are changed paths, hence inside, at regress). Then `universe(HEAD) − inside(HEAD) = universe(start) −
inside(start)` as the same git command and the same filter compute it. Any other case is a `shape-mismatch` MISS
  and fresh BASE. **No inference**: equality of the ordered byte lists is the test.

### 2. The offer — a protected binding, published by `--wait`

`entry-gates.mjs --wait`, at the end of `decideDone`, calls `publishEntryOffer` **after** every existing check has
passed (nonce/feature binding, result shape, stamp sha256, `validateStamp` entry, `ENTRY_ALGO`, `entryVerdict`) and
only for `status ∈ {green, red}`. `continue`, `no-gates`, `unusable` and `aborted` never reach `decideDone`.
Best-effort: a failure is one `entry-gates: note —` stderr line, and the stdout document, the exit code and the R1
changes record are unchanged (a test runs publication failing and compares them). `--start` discards an earlier
offer, as it clears the entry-changes record.

Storage: `<git rev-parse --absolute-git-dir>/pharn-entry-base-offer.json` through `regress-base-reuse.mjs`
`gitDirFile`, the resolver of 6.33.0, 6.34.0 and 6.37.0, so the write tools are denied as for those records (★ HOOK:
main checkout and linked worktree). Closed schema `pharn-entry-base-offer/1`:

```json
{
  "schema": "pharn-entry-base-offer/1",
  "feature": "<slug>",
  "run": { "command": "pharn-loop | pharn-ship", "marker_sha256": "<64 hex>" },
  "nonce": "<32 hex>",
  "base": "<40 hex: the entry stamp's head>",
  "stamp_sha256": "<64 hex>",
  "timeout_ms": 540000,
  "d0": "absent | unhashable | sha256:<hex>",
  "feature_dir": [{ "id": "lint", "before": "absent", "after": "absent" }]
}
```

The offer copies only the small facts it needs from `runner.json`/`result.json`, because a later `--start` may
rewrite those. Exits, argv, files, logs and timings stay in the entry stamp, bound by sha256. Each log is bound by the
stamp's own digests. No log, gate body or `entry_events` telemetry enters the offer.

### 3. Placement in the regress phase machine

```text
… head-init (phaseHeadInstall, tests-unresolved, install-unresolved: UNCHANGED) → drain-head (UNCHANGED, HEAD offer)
  → baseReuse  = decideFromDisk(…)                                   6.33.0, UNCHANGED
  → entryReuse = baseReuse.reused ? null : decideEntryFromDisk(…)
  → phase      = baseReuse.reused || entryReuse.reused ? "verdict" : "worktree"
verdict:
  baseReuse.reused  → 6.33.0's full re-decision, UNCHANGED
  entryReuse.reused → re-decide IN FULL from disk (stage.json is never trusted); a HIT with the same offer and source
                      sha256 → discardRetained(), then materialize (§6); any change, or a materialization failure →
                      a MISS with its own code → phase "worktree" → the normal BASE side
  → check-regress.mjs verdict (UNCHANGED) → no retained-record publication when entry-derived (`why: entry-derived`)
cleanup: no `git worktree remove` when baseReuse.reused || entryReuse.reused
```

A resume at `drain-head` re-decides both (the drain repeat is idempotent). A persisted entry HIT can sit only at
`verdict`, and materialization happens only after the re-decision. So a forged `stage.json` `entryReuse`, or edited
derived bytes in `base-gates/`, cannot produce a reuse.

### 4. The eligibility predicate (`decideEntryBase`, pure, first failure decides)

Inputs, all read in THIS invocation: the finalized HEAD stamp, through `baseSpecFrom` (the ONE owner of "what
base-init would build"); `base`, `timeoutMs` and `installOverride` from the stage; the markers, offer, snapshot and
entry stamp; `now`. **The slot map**: a required BASE entry maps to the entry run with the same id, EXCEPT a
`test` entry with non-empty `files`, which maps to `base:test`. A `test` entry with `files: []` is a regress `no-files`
slot: it needs no evidence and takes none.

| miss                   | when                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requirement-unknown`  | `baseSpecFrom(headStamp)` refuses                                                                                                                                                   |
| `no-delivery-run`      | `deliveryRunIdentity` (6.33.0, reused) finds no single open run                                                                                                                     |
| `install-override`     | the invocation passed `--install` or `--no-install`                                                                                                                                 |
| `no-offer`             | no offer in the git dir                                                                                                                                                             |
| `offer-malformed`      | not a regular file, oversize, or not the closed `/1` shape                                                                                                                          |
| `other-run`            | the offer names another feature or marker digest                                                                                                                                    |
| `no-snapshot`          | no pre-run snapshot                                                                                                                                                                 |
| `snapshot-malformed`   | `parseRecord` refuses it                                                                                                                                                            |
| `snapshot-other-run`   | `boundToRun` is false for this run and feature                                                                                                                                      |
| `start-not-base`       | the snapshot's `base`, or the offer's `base`, is not this invocation's BASE SHA                                                                                                     |
| `start-dirty`          | the snapshot lists a path outside this run's own `pharn/features/<name>/`                                                                                                           |
| `source-missing`       | no entry stamp                                                                                                                                                                      |
| `source-unusable`      | a link, FIFO, directory, oversize, unreadable or non-JSON stamp (`readInProject`, no-follow)                                                                                        |
| `source-unbound`       | sha256(stamp) ≠ `offer.stamp_sha256`                                                                                                                                                |
| `source-invalid`       | `validateStamp(…, {stage: "entry", feature})` refuses, the algo is not `ENTRY_ALGO`, or `stamp.head` ≠ `offer.base`                                                                 |
| `timeout-incompatible` | `offer.timeout_ms > timeoutMs`                                                                                                                                                      |
| `structural-gate`      | a required BASE entry is `structural:*` (entry never runs one)                                                                                                                      |
| `gate-missing`         | a required non-`no-files` BASE entry has no entry run under its mapped id                                                                                                           |
| `shape-mismatch`       | the head spec's `source` ≠ the entry stamp's, or a mapped pair differs in `shell`, `argv` or the ordered `files`                                                                    |
| `not-completed`        | a mapped entry run is `ran: false`, `timed_out`, or its exit is outside `0..MAX_REUSABLE_EXIT`                                                                                      |
| `style-unattributed`   | a mapped `STYLE_SET` run has no `feature_dir` entry, or its `before`/`after`/`d0` is not `absent`                                                                                   |
| `mutated-prefix`       | any entry run up to and including the last mapped run (in entry order) moved the tree, or a mapped run's `fp_before`/`fp_after` is not the stamp's `fingerprint.init` (grill G2/G6) |
| `log-unverified`       | at materialization only: a mapped run's `.out`/`.err` is absent, a link, oversize, or not the stamp's digest, before the copy or (for the written copy) after it                    |

A HIT means every row passed. A MISS is diagnostic data. It never asks, never refuses, never stops, and the BASE side
runs exactly as today. Malformed **final** regression evidence remains the checker's failure.

**The mutation rule (§4 row; narrowed by grill G2).** No entry run up to and including the last mapped one moved the
tree, and every mapped run's fingerprints equal `fingerprint.init`. So every mapped run judged the start tree, and
under the existing determinism assumption none of them moves it when run in regress's order either. The order
difference (entry: style, `base:test`, the rest; regress: the head spec's order) therefore cannot change a mapped
result through the fingerprinted tree. Entry-only runs after the last mapped one (`e2e`) are ignored even if they
mutated. A mapped run that moved the tree is a MISS (cost: a project whose `build` rewrites a tracked file every run).
Ignored state an earlier entry-only run left is NOT seen (G1, a named bound).

**Why it differs from 6.33.0's `decideBaseReuse`** (untouched). That predicate reuses an earlier **normal** BASE
execution, so its requirement binds that execution's own inputs: the nested worktree's install decision, `ALGO`,
`head_root` (HEAD root files a parent-directory search from the nested worktree reaches), and never a run without an
install. Entry evidence ran in the real starting tree. No nested worktree and no install exist, so none of those
bind. This predicate binds what makes entry evidence the BASE instead: the same delivery run, a snapshot saying the
run started clean at this BASE commit, the exact mapped execution shapes, completion, attribution, no relevant
mutation and timeout compatibility. The default inferred install is deliberately not an input: skipping it is the
point. The two predicates are separate rules over two evidence sources, sharing `deliveryRunIdentity`, `baseSpecFrom`,
`validateStamp`, the no-follow readers, `gitDirFile` and the snapshot's `parseRecord`/`boundToRun` (L35).

### 5. The closed reuse matrix (`gate-run-core.mjs`)

`validateStamp` admits a `reason: "reused"` run only for one of two closed (target ← source) pairs:

| target stamp   | source         | rule                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify`       | `regress/head` | **6.34.0, unchanged** (`NON_REUSABLE_IDS`, `identity_sha256` required, …)                                                                                                                                                                                                                                                                                                                    |
| `regress/base` | `entry`        | NEW: `ran: false`, `reason: "reused"`; id ∈ `ALLOWLIST`; exit `0..125`; `timed_out: false`, `mutated: false`, `fp_before == fp_after`; `results_sha256: null`; no `identity_sha256`; `reused` = exactly `{stage: "entry", side: null, seq, stamp_sha256}`. Stamp-level: a `regress/base` stamp carrying a reused run has no `ran: true` run, and all its reused runs name ONE `stamp_sha256` |

`REUSE_SOURCE` / `REUSE_TARGET_STAGE` keep their values for the verify path. The matrix is materialized once
(`REUSE_PAIRS`) and the tests iterate it both ways, every off-matrix pair included (L29, L36).

### 6. The derived evidence — an explicit `regress/base` stamp, never a relabelled entry stamp

At `verdict`, after the re-decision HITs, `materializeEntryBase` rebuilds `.pharn/pharn-regress/base-gates/` from
scratch:

- **Logs**: each mapped entry `.out`/`.err` is read no-follow, checked against the entry stamp's digests, written
  under the regress name `logBasename(<regress seq>, <regress id>)`, and re-hashed after the write (the `tryReuse`
  discipline). A copy is verified, never trusted because it succeeded.
- **The stamp**, built by the pure `derivedBaseStamp`: `stage: "regress"`, `side: "base"`, `feature`,
  `head: <base>`; `source` / `source_raw` / `style_skipped` / `required` from `baseSpecFrom` (what base-init would
  have copied); `finalized: true`; `fingerprint: {algo: ENTRY_ALGO, init, final}` = the entry stamp's `init` (every
  mapped run judged it, by rule (a)); `aux: {completeness: null}`; `runs` in the head spec's order. A reused run
  carries the mapped entry run's `exit`, `stdout_sha256` and `stderr_sha256`, plus `ran: false, reason: "reused"`,
  `reused: {stage: "entry", side: null, seq: <entry seq>, stamp_sha256}` and the regress slot's own `argv`/`shell`/
  `files` (equal to the source's by `shape-mismatch`). A `no-files` run is as `run-gates.mjs` writes it.

The record says what happened: this invocation spawned nothing for the slot, and the exit and log are entry sequence N
of the named entry stamp. `gate_run.base.fingerprint.algo = ENTRY_ALGO` shows it again in the report.
`check-regress.mjs` is **unchanged**. The derived stamp validates through the new matrix row. `check-loop-fresh.mjs`
C/D/E/H/J are unchanged and pass over it (★ test). 6.33.0's predicate never HITs on it: nothing is published, and
`ENTRY_ALGO` reads `version-changed`.

### 7. Reporting (additive; every existing key keeps its bytes and meaning)

`regression-report.json` `base_evidence` keeps `{reused, miss, requirement_sha256, recorded}` with their 6.33.0
meanings and gains two keys at its end:

- `source`: `"fresh"` (this invocation made the BASE worktree, ran its install decision and spawned the base gates) |
  `"reused"` (6.33.0 HIT — the work record's own word, grill G10) | `"entry"` (this PR). For `reused` and `entry`: no worktree, no install, no base gate
  process.
- `entry`: `null` when not evaluated (a retained HIT), else
  `{used, miss, offer_sha256, entry_stamp_sha256, base, run, reused_ids, no_files_ids, ignored_ids}`. `miss` is an
  `ENTRY_BASE_MISSES` member or null. `ignored_ids` are the entry runs that did not become evidence. Values are
  booleans, enum members, hex digests and ids only: no logs, environment, prompts or `entry_events`.

`REGRESSION.md` gets one fixed-prose line per source, and the install line "none run by this invocation — the BASE
evidence came from this run's entry gates". `recorded: false` with the new `why` `entry-derived`. The contract cites
`ENTRY_BASE_MISSES` and does not restate it: the glosses live once, above the enum in `stage-regress-core.mjs`, pinned
by a test (the 6.33.0 A3 precedent).

**Cost ledger** (`stage-work.mjs`, `cost-ledger.md`): `base.evidence` gains `"entry"`: executed 0, reused = required −
no_files, install null, `miss` = the retained miss. `render-cost-ledger.mjs` `workSummary` says "BASE from the entry
gates (no worktree, no install, 0 base gate processes)". **No BASE duration is synthesized, and no entry work is
counted twice.** `entry_events[]` and the `entry` view are untouched and read by nothing here. The entry runner's
segment `gates` count includes the slot, because it is a real execution.

### 8. Progress record `/3`

`PROGRESS_SCHEMA` → `pharn-stage-regress-progress/3`. It adds `installOverride: bool` and `entryReuse` (`null` at
`drain-head` and after a retained HIT, else the closed `{reused, miss, offerSha256, sourceStampSha256, run}`; a HIT
only at `verdict`). A `/2` record on `--resume` is `progress-malformed` (the 6.33.0 precedent).

### 9. What does not change

`decideBaseReuse`, `publishRecord`, `check-regress.mjs`, `check-loop-fresh.mjs`, the HEAD side, `phaseHeadInstall` /
`head-install-drift`, every question (`tests-unresolved`, `install-unresolved`, `no-gates`, `base-unresolved`),
`scope-escaped`, the HEAD→verify offer and `gate-reuse-core.mjs`, `ENTRY_ALGO` and the fingerprint, entry's S14
verdict for every verify-shaped gate, standalone regress (no marker → `no-delivery-run` → fresh, plus the two additive
keys), and every command's control flow, stuck points and pinned lines. `/pharn-dev-regress` (prose) is unchanged.

## Files

- `pharn/floor/entry-base-evidence-core.mjs` — NEW. Pure: the offer schema, `buildOffer` / `validateOffer`, the slot
  map, `decideEntryBase`, `derivedBaseStamp`, the log copy list. — layer pharn-floor
- `pharn/floor/entry-base-evidence.mjs` — NEW. I/O: offer path / publish / discard / read, `decideEntryFromDisk`,
  `materializeEntryBase` (verified copies plus atomic stamp write). No CLI. — layer pharn-floor
- `pharn/floor/entry-base-evidence-core.test.mjs` — NEW. Every miss row with its own re-bound negative control; the
  irrelevant inputs that must not flip a HIT; closure both ways; derived-stamp validation; totality. — layer
  pharn-floor (test)
- `pharn/floor/entry-base-evidence.test.mjs` — NEW. I/O path kinds, ★ HOOK, and the end-to-end integration through
  the real `entry-gates.mjs` and `stage-regress.mjs` CLIs (below). — layer pharn-floor (test)
- `pharn/floor/entry-gates.mjs` — compute and pass `--base-tests`; publish the offer at the end of a green/red
  `decideDone`; discard it at `--start`. — layer pharn-floor
- `pharn/floor/entry-gates-core.mjs` — `entryVerdict` never counts `base:test` red or unattributed. — layer
  pharn-floor
- `pharn/floor/entry-gates.test.mjs` — slot present / absent, never S14, offered for green and red only, publication
  failure leaves the document and exit identical, the ✧ parity test updated (verify's set + the slot). — layer
  pharn-floor (test)
- `pharn/floor/gate-run-core.mjs` — `ENTRY_BASE_TEST_ID` (reserved), the entry `baseTests` insertion in
  `resolveSet`, `REUSE_PAIRS`, the entry→regress/base run rule, the stamp-level rule. — layer pharn-floor
- `pharn/floor/gate-run-core.test.mjs` — the slot's placement and reservation; the matrix both ways; the verify pair
  unchanged; each new rule with a violating control. — layer pharn-floor (test)
- `pharn/floor/run-gates.mjs` — `init --stage entry --base-tests <file>` (the `--targets` reader). — layer pharn-floor
- `pharn/floor/run-gates.test.mjs` — `--base-tests` accepted for entry only and refused elsewhere; bad paths
  refused. — layer pharn-floor (test)
- `pharn/floor/worktree-fingerprint.mjs` — header comments only (grill G3): the `ENTRY_ALGO` exclusion's justification no longer says an entry stamp is never reuse evidence. No code change. — layer pharn-floor
- `pharn/floor/scope-inputs.mjs` — `defaultTestUniverse()`, moved out of `stage-regress.mjs` `computeTests`. — layer
  pharn-floor
- `pharn/floor/stage-regress-core.mjs` — `ENTRY_BASE_MISSES` (with glosses), progress `/3`. — layer pharn-floor
- `pharn/floor/stage-regress-core.test.mjs` — `/3` cases, `/2` refused, the gloss↔enum pin. — layer pharn-floor
  (test)
- `pharn/floor/stage-regress.mjs` — `computeTests` uses `defaultTestUniverse`; the decision placement; the verdict
  re-decision and materialization; the cleanup skip; `base_evidence.source`/`entry`; render and work inputs. — layer
  pharn-floor
- `pharn/floor/stage-regress.test.mjs` — the existing suite kept green; report-minus-blocks == checker stdout over the
  extended block; retained precedence. — layer pharn-floor (test)
- `pharn/floor/render-regression.mjs` — the entry evidence line and the install line. — layer pharn-floor
- `pharn/floor/render-regression.test.mjs` — fresh / retained / entry cases; a mutant id never becomes a heading. —
  layer pharn-floor (test)
- `pharn/floor/stage-work.mjs` — `base.evidence: "entry"`. — layer pharn-floor
- `pharn/floor/stage-work.test.mjs` — the entry record, its invariants and its refusals. — layer pharn-floor (test)
- `pharn/floor/render-cost-ledger.mjs` — `workSummary`'s entry branch. — layer pharn-floor
- `pharn/floor/render-cost-ledger.test.mjs` — the entry summary line. — layer pharn-floor (test)
- `pharn/pharn-contracts/gate-run-record.md` — the entry bullet names the `base:test` slot; "Reused entries" gets the
  closed matrix and the entry→regress/base form. — layer pharn-contracts
- `pharn/pharn-contracts/regression-report.md` — `base_evidence.source` and `.entry`, the miss vocabulary (cited), the
  bounds. — layer pharn-contracts
- `pharn/pharn-contracts/cost-ledger.md` — `evidence: entry`. — layer pharn-contracts
- `.claude/commands/pharn-regress.md` — the reused-BASE claims bullet now covers both sources (one bullet, cited). —
  product command
- `.dev/floor/command-hygiene.test.mjs` — `COMMAND_BYTE_CEILINGS["pharn-regress.md"]` raised by the documented rule
  (24 bytes of headroom today), a visible diff. — dev floor (test)
- `.dev/guides/floor-gates.md` — an "Entry evidence as BASE (regress)" section; the progress schema id; the entry
  section's slot sentence; the run-gates usage line's `--base-tests`. — apparatus
- `.dev/guides/floor-orchestration.md` — the work record's `evidence` values. — apparatus
- `CHANGELOG.md` — `## [6.49.0]`. — repo meta
- `SKILLS_VERSION` — `6.49.0` (minor: a new shipped capability). — repo meta
- `README.md` — the badge, plus the CURRENT-STATE region `npm run docs:generate` regenerates. — repo meta
- `docs/capabilities/**` — only what `npm run docs:generate` regenerates. — generated
- `.dev/features/entry-run-as-base-evidence/measure.mjs` — the measurement harness (named explicitly: the scope setter drops
  glob entries). — apparatus
- `.dev/features/entry-run-as-base-evidence/MEASUREMENT.md` — the measured counts and timings. — apparatus
- `.dev/features/entry-run-as-base-evidence/**` — this increment's pipeline artifacts, `MEASUREMENT.md`, `measure.mjs`
  and, if a human-only doc goes stale, `PROTECTED-FOLLOWUPS.md`. — apparatus

`MIN_CLI` stays `0.5.0`: no installed path moves, and new floor files are copied by `pharn update`. The command prose
saying the entry check runs "the gates `/pharn-verify` will discover" stays true, though no longer complete. The
`entry-gates.mjs` header and `gate-run-record.md` name the extra slot (P4: the command cites its owner).

## Contracts satisfied

- `gate-run-record.md` — the derived stamp is a `gate-run-record/1` `regress/base` stamp through the new closed matrix
  row. An entry stamp may carry the reserved `base:test` id. No historical stamp changes validity (the matrix and the
  slot are additive; a test re-validates existing fixture stamps).
- `regression-report.md` — the verdict fields are `check-regress.mjs`'s, unchanged. `base_evidence` gains two
  appended keys.
- `stage-exit.md` — exits, statuses and the regress registry are unchanged, and there is no new reason_code. Its
  `base-gates/` retention sentence stays true.
- `cost-ledger.md` — one additive `evidence` member.

## Tests (the build must deliver each; executed paths, not prose presence)

**Unit (core):** every `ENTRY_BASE_MISSES` row fires on its own one-input mutation with every other input re-bound
(L60). Irrelevant inputs must not flip a HIT: the default inferred install (`npm ci`, `none`/no-manifest), a
`head_root` change, an extra entry `e2e` after the last mapped run (even mutating), the verify-shaped entry `test`
after the last mapped run, an unmutating entry-only gate before it, a `--budget-ms`. GREEN → candidate. A completed RED
(exit 1) → candidate, and its exit stays 1 in the derived stamp. Exits 126/127/≥128 → `not-completed`. Same id with
different argv / shell / files → `shape-mismatch`. A regress `test` with files ↔ `base:test` with the same list →
candidate. One path more, one less, or reordered → `shape-mismatch`. A regress `test` with files and no slot (a
pre-slot entry stamp) → `gate-missing`. A regress `test` with `files: []` → a `no-files` slot that takes no entry
evidence. `structural:*` → `structural-gate`. A gate excluded at entry but required now → `gate-missing`. A style gate
skipped by regress needs no evidence, but its mutation still counts under (a). A required STYLE gate with
`d0`/before/after all `absent` → candidate; `sha256:…` or missing → `style-unattributed`. Timed-out → `not-completed`.
Mutation before a mapped run, or by a mapped run (even the last one) → `mutated-prefix`; a mutating `e2e` after the last
mapped run → candidate. Timeout: entry 540000 vs regress 540000 or 600000 → compatible; entry 600000 vs
regress 540000 → `timeout-incompatible`. Snapshot empty or feature-dir-only → eligible; any other path → `start-dirty`;
base mismatch → `start-not-base`; missing / malformed / foreign → their rows. Closure both ways (L36). Totality over
`{"toString":1}` in every input (L62).

**Slot:** `resolveSet({stage: "entry", baseTests})` puts `base:test` after the style part with the discovered `test`
argv. No `test` script or an empty list → no slot. `base:test` is refused as a `--gates` id. `entryVerdict` with a red
slot → status green, and the slot is not in `red`/`unattributed`. `--start` writes the list `defaultTestUniverse` minus
`changedPaths` computes, and a ✧ parity test runs regress's `computeTests` + `partitionScope` over the same unchanged
tree and gets the identical array.

**I/O:** a link, dangling link, directory, FIFO and oversize file at the offer, the snapshot, the entry stamp and each
entry log → the right miss, never followed (L54, L59). Source edited after the offer → `source-unbound`. A log edited
after the stamp → `log-unverified`, then the BASE side runs. Publication failure → no offer, and `--wait`'s stdout and
exit are unchanged. ★ HOOK: both real hooks deny a Write to the offer path in a main checkout and a linked worktree, and
allow it under `.pharn/` (L65).

**End-to-end (real CLIs, a git sandbox, counters per cwd; the fresh run's counters asserted non-zero first, L34):**

- **Entry HIT:** marker → snapshot → `entry-gates --start` → `--wait` (offer) → a build edit that adds an inside test
  and changes source → `stage-regress.mjs` with the pinned argv (L41). Asserts zero `post-checkout` worktree
  checkouts, zero installs, zero base gate processes, a HEAD gate count equal to a fresh run's,
  `base_evidence.source: "entry"`, and a verdict that `check-regress.mjs` reproduces over the stamps.
- **Equivalent-environment parity:** the same fixture with A = no offer (fresh BASE) and B = entry HIT. It has a real
  regression in an outside test, a completed RED BASE gate that stays `pre_existing`, and a green gate. A and B agree
  on `verdict`, `regressions`, `pre_existing` and `outside_gates`.
- **Environment-divergence:** the start tree holds an ignored `.env.local` a gate reads. Entry is green and B uses it
  (`source: entry`). The test asserts B's BASE exit is the entry exit and that the nested-worktree path (no offer)
  observes a different exit. It **does not** assert equal verdicts.
- **A modified pre-existing test** → `shape-mismatch` → worktree → install → base-init → drain-base, with counters
  equal to a no-offer run (the exact fall-through).
- **Precedence:** a run with a published retained record HITs 6.33.0, leaves `entry: null`, and keeps the retained
  path's counters and `base_evidence` unchanged. A retained `no-record` MISS falls through to entry.
- **Resume:** with `--budget-ms 1`, the pause comes after the entry decision. (a) `--resume` re-decides and HITs.
  (b) The source stamp is edited during the pause → `source-unbound` → BASE side. (c) `stage.json` `entryReuse` forged
  to a HIT with no offer → BASE side.
- **Unchanged paths:** HEAD install drift still refuses `head-install-drift` with an offer present.
  `tests-unresolved` and `install-unresolved` are still questions. Standalone → `no-delivery-run`, fresh.
  `--install` / `--no-install` → `install-override`, fresh. The existing HEAD→verify reuse tests stay green unchanged.
- **★ freshness:** `check-loop-fresh.mjs --iter 1` reads FRESH over an entry-HIT run (C, D, E, H, J each `pass`). A
  derived stamp with a forged reused block (another source stage, a `ran: true` mixed in, two source digests) →
  `stamp-malformed` at C.
- **Cost:** an entry HIT's work record is `evidence: "entry"`, executed 0, install null. `entry.jsonl` and the
  ledger's `entry` view are byte-identical with and without the HIT. No BASE duration appears.
- **Historical:** every existing `regress/base` and `entry` stamp fixture still validates, and a pre-PR report
  fixture still renders.

## Measurement (`.dev/features/entry-run-as-base-evidence/measure.mjs` → `MEASUREMENT.md`)

Two floors on one fixture builder: **A** = `origin/main`'s `pharn/floor` at `0e38b86` (`git archive` into a scratch
dir), **B** = this branch. Three repetitions each:

- **F-hit:** an npm lockfile whose `postinstall` sleeps and counts; `test`, `typecheck` and `build` gates that sleep and
  count per cwd; outside test files; a build that adds an inside test and edits source; a `post-checkout` counter. The
  marker, snapshot and entry `--start`/`--wait` run on both floors. B's entry also runs the slot (its extra entry
  cost is reported).
- **F-miss:** the build also edits a pre-existing test, so B MISSes `shape-mismatch`. This measures the selector's
  cost on the miss path.

Reported per invocation: entry gate executions (verify-shaped and slot), HEAD gate executions, BASE worktree
checkouts, installs, BASE gate processes, log copies, the decision's own time (`performance.now()` around
`decideEntryFromDisk` and around `materializeEntryBase`, imported by the harness), regress wall-clock, the verdict and
`base_evidence.source`. Expected on F-hit: checkouts 1 → 0, installs 1 → 0, BASE gate processes N → 0, HEAD unchanged,
entry gate executions +1. No percentage is targeted. The 92-minute run and 6.33.0's ~56 % are background only (L24).

## Guarantee audit (P0)

- "Whether entry evidence becomes BASE evidence is decided by tested code" → floor: enum-regex + content-hash (sha256
  equality of marker, offer, stamp and logs; closed-enum membership; equality of ordered shapes).
- "A derived BASE stamp validates only in its entry-derived form" (the file itself is `.pharn/` state the write tools and Bash reach — grill G7) → floor: enum-regex (the closed
  matrix in `validateStamp`; `ran: false` plus the `reused` block; `ENTRY_ALGO`).
- "The regression verdict is check-regress.mjs's" → floor (unchanged checker over the stamps on disk).
- "The slot's file list is what regress's default rule computes" → floor where the ✧ parity test runs both owners over
  one tree. At regress only byte equality decides, so a wrong list can only MISS.
- "The write tools cannot forge an offer" → floor: hooks (the git dir, ★ HOOK, the layouts and the named
  separate-git-dir bound of 6.33.0 / 6.34.0). **A Bash writer can forge the offer, snapshot, marker and entry evidence
  together; agreement is never provenance (L19, L43).**
- "The run started clean at this BASE commit" → floor **relative to the snapshot record** (agreement), with two named
  windows: snapshot capture → entry `--start`'s `init` (two consecutive pinned lines), and ignored content, which no
  fingerprint sees.
- "Entry BASE equals what a fresh nested-worktree BASE would give" → **NOT CLAIMED.** They may differ because the
  environments differ (ignored files, `node_modules`, inherited env, machine). Entry evidence is the real sampled start
  environment, unattested. The definition of a regression is unchanged.
- "Non-style entry results were not influenced by the front stages' writes under `pharn/features/<name>/`" →
  **advisory**, inherited from 6.42.0 (`entry-gates-nonstyle-overlap`, not implemented). On /pharn-ship the approved
  SPEC.md is in that directory at entry.
- Every reuse assumes per-sample determinism, as 6.33.0 and 6.34.0 do → advisory.
- The report blocks and the cost line → advisory, read by no floor decision.

## Trust audit (P2)

- The offer, snapshot and stamps are deterministic-tool JSON from the git dir and `.pharn/`, parsed only as strings,
  integers, hex digests and enum members, closed both ways, never executed. Markers are hashed, never parsed.
- Test-file paths are attacker-nameable git paths: they travel as argv elements (as at regress), are compared as
  strings and are JSON-encoded. Every one passes `badPath`.
- Gate logs are untrusted free text: hashed, copied as bytes, never read for content.
- Rendered values are booleans, enum members, hex digests and ids, through the existing inline quoting.

## Determinism audit (P5)

Every branch is a membership or equality test. There is no new question: a MISS is the fully defined default (the
BASE side runs exactly as today), and every existing question is unchanged. Nothing is classified by a model.

## Applied lessons

- L24 — the measurement uses fixtures built to exercise the new path (F-hit) and the realistic miss (F-miss), on
  `main`'s floor as control; no inherited percentage.
- L29 — `ENTRY_BASE_MISSES` and `REUSE_PAIRS` are each materialized once, and every rule and test iterates them.
- L34 — the e2e counters are asserted non-zero on the fresh run before zero is asserted on the HIT. A HIT needs at
  least one mapped slot, so an all-`no-files` spec never reads as entry evidence (pinned).
- L35 — one owner each: `defaultTestUniverse` (moved, not copied), `baseSpecFrom`, `deliveryRunIdentity`,
  `gitDirFile`, the snapshot's `parseRecord`/`boundToRun`, `validateStamp`, `badPath`. The offer copies only facts
  whose source a later `--start` may rewrite.
- L36 — closure both ways for the miss set and the reuse matrix; every off-matrix pair is refused.
- L42 — the decision answers "is this the evidence for this requirement", read from the records of THEN (offer,
  snapshot, stamp), never "would the gate pass now".
- L43 — every claim is agreement between offer, snapshot, marker, stamp and logs; provenance is disclaimed in headers,
  the contract and the claims bullet.
- L45 — the HIT is proven through the real `entry-gates.mjs` and `stage-regress.mjs` CLIs with the pinned argv.
- L54 — every read of the offer, snapshot, stamp and logs is lstat-first and no-follow (the shared readers).
- L58 — the referent is split: the entry stamp and logs are finalized (fixed), and `.pharn/pharn-entry/` may still be
  rewritten by a later `--start`, so the verdict re-decision re-reads it and materialization re-verifies each log.
- L59 — the I/O suite enumerates the path kinds (regular, link to file, link to dir, dangling, FIFO, directory,
  oversize) at every read site.
- L60 — each miss row and each new validator rule has its own negative control with every other input re-bound. Every
  anchor a wiring test slices on is asserted found.
- L62 — every value the core quotes or compares from parsed JSON goes through total functions, tested with
  `{"toString":1}`.
- L65 — the offer, the record a later regress compares against, is kept where the write tools cannot write, proven by
  the ★ HOOK test with both real guards.
- L66 — regress reads only a source bound by an offer that `--wait` published after validating THIS run's nonce and
  result, never whatever files remain in `.pharn/pharn-entry/`.

## Named residuals (not closed here)

- A Bash writer can forge the offer, snapshot, marker and evidence together (L19).
- The snapshot → entry-init window, and ignored or environment content at entry, are unattested.
- `entry-gates-nonstyle-overlap` (inherited). On /pharn-ship the approved SPEC.md sits in the feature directory at
  entry.
- `regress-paused-chain-integrity` (inherited): the progress record's `base`, `timeoutMs` and `installOverride` are
  write-tool reachable while a chain is paused. An entry HIT is still re-decided from the protected records.
- A build that modifies or deletes a pre-existing test file MISSes `shape-mismatch`: no subset inference.
- The slot costs one extra background test-suite run in every delivery run, quick included (the maintainer's
  choice). It adds wall time only when the entry work outlasts the front stages.
- A kill between the offer's tmp write and its rename leaves a `*.tmp-<pid>` file in the git dir (the 6.33.0 bound).

## Grill amendments (orchestrator decisions, after GATE 1; each one only adds a MISS or a stated bound)

`GRILL.md` holds 11 advisory findings (0 blocking). Dispositions:

- **G1 (accepted as a named bound):** an entry-only gate that runs before a mapped gate (the verify-shaped full `test`,
  a style gate regress skips) can leave git-ignored state (caches, `*.tsbuildinfo`, `.next/`, `dist/`) that the
  fingerprint never sees and a fresh BASE never had. It belongs to the "real start environment, unattested" class and
  is named in the contract and the module header. It is not claimed away.
- **G2 (accepted, design narrowed):** rule (b) is DROPPED. `mutated` cannot tell a gate's own write from a concurrent
  one, so a mapped run that moved the tree is now a MISS, like any earlier run that did. The rule is the simple
  prefix: no entry run up to and including the last mapped one moved the tree. Cost, stated: a project whose `build`
  rewrites a tracked file at every run MISSes.
- **G3 (accepted):** the "an entry stamp is never reuse evidence" justification is corrected in
  `worktree-fingerprint.mjs` (comments only, now in `## Files`), `gate-run-core.mjs` and `gate-run-record.md`. The
  inherited front-stage overlap bound now points the OTHER way: a front-stage write a non-style gate read can make a
  BASE red that HIDES a HEAD regression as `pre_existing`, where before it could only cause an S14 stop. This is
  stated in the contract and the claims bullet (`entry-gates-nonstyle-overlap` stays unbuilt).
- **G4 (accepted):** a `no-files` slot in the derived stamp gets empty `.out`/`.err` files (check J) and
  `fp_before = fp_after = init`. The ★ freshness test includes one.
- **G5 (accepted):** a slot input that is unusable (a `badPath` path, a failed listing, a list over a byte cap of
  64 KiB of argv) means NO slot, never an `unusable` entry check. Regress then MISSes `gate-missing`.
- **G6 (accepted):** every mapped run's `fp_before` and `fp_after` are compared to `fingerprint.init` directly.
- **G7 (accepted):** the claim is reworded (Guarantee audit).
- **G8 (accepted as a named bound):** the finalized HEAD stamp is `.pharn/` state too. A write between a kill and a
  resume can change the requirement `baseSpecFrom` reads. This is the inherited `regress-paused-chain-integrity`
  class, and it is named.
- **G9 (accepted, stated in MEASUREMENT.md and the CHANGELOG):** the recorded trigger run and 2 of 3 real runs
  started dirty, so they would read `start-dirty` and never HIT. On /pharn-ship a REQUIRED style gate always reads
  `style-unattributed`.
- **G10 (accepted):** `base_evidence.source` uses `reused` for the 6.33.0 HIT, the work record's word.
- **G11 (accepted, conservative):** `--start` adds no slot while a regress BASE checkout
  (`.pharn/pharn-regress/base`) exists, because a runner's path filters could match its copies of the tests.

## Open questions (HALT)

- None left open. Q1–Q4 were answered by the maintainer (GATE 1 record above). The final approval of this revised
  plan is asked at the halt.
