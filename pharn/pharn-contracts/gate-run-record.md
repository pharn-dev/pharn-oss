---
name: gate-run-record
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the gate-run stamp: the record pharn/floor/run-gates.mjs writes and both verdict cores read, so the floor's input map is produced by tested code rather than typed by a model. Schema only, zero behavior (P3, pharn/ARCHITECTURE.md §4)."
---

# Contract — gate-run-record

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). Enforcers **cite** it
> and **conform** to it; they do not restate its semantics (P4). The principles (P0, P5, P7) live in
> `pharn/CONSTITUTION.md`; the floor primitives in `pharn/ARCHITECTURE.md §2`.

## Why it exists (P7 — a recorded failure, not a hypothetical)

`/pharn-verify` and `/pharn-regress` compute a **floor** verdict from a `{gate-id: exit-int}` map — and
until this contract the **model typed that map**. Verify's Step 3c captured exit codes in Bash (`=$?`)
and wrote the JSON by hand; regress's Step 4b told the model to "record `0`" for an empty test set and to
"assemble each side into a flat map". Both the **keys** (which gates are in the set) and the **values**
(their exit codes) were model-authored, and each checker judged whatever map it was handed — which their
own usage blocks say plainly.

The failure is recorded. `CHANGELOG.md` §6.3.0 documents a dogfooded, unattended `/pharn-loop` run that
"skipped `/pharn-grill`, `/pharn-regress` and `/pharn-verify` entirely, hand-executed the equivalent work
by judgment, and still wrote a `LOOP.md` whose `decision` read as a genuine floor-grade stop". That
increment's remedy re-derives a decision from the reports it cites and, by its own statement, cannot see
a report that was never honestly produced. `lessons-learned` **L5** names the class, **L30** names why the
asked-for gate is the skipped one, and **L20**/**L46** make the recurrence the trigger for a floor check.

## The record

Written to `<out>/stamp.json`. `<out>` must resolve **strictly inside** the state root `.pharn/` and may
not be the state root itself.

**Which directory, exactly.** Every path operand (`--out`, `--spec-from`, `--discover`, `--scope-json`)
resolves against the directory the runner is **invoked** from, and the state root is that directory's
`.pharn/`. `--cwd` sets only where the gates execute and which tree is fingerprinted (and whose `HEAD` is
recorded), never where the record lives. So `init` and every `run --next` for one `<out>` are issued from
the same directory. Before 6.9.3, `init` resolved `--out` and `--spec-from` against `--cwd` while
`run --next` did not, and `/pharn-regress`'s base side, the one caller that passes `--cwd`, could not
initialize at all.

```json
{
  "schema": "gate-run-record/1",
  "stage": "verify | regress | ac-test | build | entry",
  "side": "base | head | null",
  "feature": "<slug>",
  "head": "<40-hex> | null",
  "source": "explicit | discover",
  "source_raw": "<the --gates string> | null",
  "style_skipped": false,
  "finalized": true,
  "fingerprint": { "algo": "<token>", "init": "<sha256>", "final": "<sha256>" },
  "required": ["<gate-id>", "…"],
  "runs": [
    {
      "seq": 0,
      "id": "<gate-id>",
      "exit": 0,
      "ran": true,
      "timed_out": false,
      "mutated": false,
      "reason": null,
      "argv": ["…"],
      "shell": null,
      "files": [],
      "fp_before": "<sha256>",
      "fp_after": "<sha256>",
      "stdout_sha256": "<sha256>",
      "stderr_sha256": "<sha256>",
      "results_sha256": "<sha256> | null"
    }
  ],
  "aux": { "completeness": 0 }
}
```

### Field notes

| field                    | meaning                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `schema`                 | Exact match required. Bumped only on a breaking shape change.                                                                     |
| `side`                   | `base`/`head` for regress; **`null`** for verify. Enum-gated both ways.                                                           |
| `head`                   | `git rev-parse HEAD` at `init`, or `null` when the tree is not a git repo / HEAD is unborn.                                       |
| `source`                 | How the **source set** was resolved. `explicit` records the raw string in `source_raw`.                                           |
| `style_skipped`          | True iff `--skip-style` actually removed a member of `STYLE_SET`. Never silent.                                                   |
| `required`               | The **source** ids coverage is checked against. Injected entries are not members.                                                 |
| `runs[].ran`             | `false` only with `reason: "no-files"` — a file-addressable gate with an empty file list — or `reason: "reused"` (6.34.0, below). |
| `runs[].mutated`         | The gate changed the tree itself. **Recorded, never refused** — `reconcile` judges that write.                                    |
| `aux.completeness`       | `check-build-complete.mjs`'s exit. **A sibling of `runs[]`, never a member.** See below.                                          |
| `runs[].results_sha256`  | Optional (6.15.0). The sha256 of the gate's results file, or `null`. See below.                                                   |
| `runs[].identity_sha256` | Optional (6.34.0). The entry's execution identity (`gate-reuse-core.mjs`). See "Reused entries".                                  |
| `runs[].reused`          | Only on a reused entry (6.34.0): `{stage, side, seq, stamp_sha256}` naming the source execution.                                  |
| `excluded`               | Optional (6.36.0): `{declared_in, ids}` — the discovered gates the project's `gates.exclude` removed. See below.                  |

## Per-test results (`results_sha256`, 6.15.0)

Every gate is spawned with one extra environment variable, `PHARN_TEST_RESULTS`, valued with that gate's own
absolute path under `<out>` (`resultsFileName(seq, id)` in `gate-run-core.mjs`, the one copy of the rule). A
project's reporter config may write a machine-readable results file there. The runner removes that path
before the gate runs and afterwards records `results_sha256`: the sha256 of the path if it is a regular file,
else `null`. It is recorded on **every** run, but only the gates `test-results-record.md` lets a project
configure are ever read; on any other gate the hash means nothing.

**`CI=1` for the test-level gates (6.50.1).** The runner also sets `CI=1` in the environment of every AC level gate
(`test`, `test:e2e`, `e2e`) and of the entry check's `base:test` slot (`run-gates.mjs` `CI_GATE_IDS`), unless the
inherited environment already defines `CI`, whatever its value. vitest and Jest write a missing snapshot on a run
where `CI` is unset, so an AC test whose oracle is a snapshot failed before the build and passed after it for any
implementation; under `CI` both refuse to write one. Bounded: a project's own `CI=false` restores snapshot writing,
an oracle file the build writes by other means is not caught (`/pharn-test`'s rule against such oracles is advisory),
and an explicit `--gates` token gets the variable only when its id is one of those ids. Style gates are untouched.

The field is **optional and additive**. `SCHEMA` is unchanged: `validateStamp` checks it only when present
(`null` or a sha256 digest), so every stamp written before it still validates. A stamp carrying a
**malformed** value is refused as `stamp-malformed` by all three `validateStamp` callers — a route reachable
only by a forged or corrupted stamp, never by one the runner wrote. What the file means, and when it can be
read, is `test-results-record.md`'s contract, not this one.

## Reused entries (`identity_sha256`, `reused`, 6.34.0)

`run-gates.mjs` records on every run it executes `identity_sha256`: a sha256 over the entry's execution inputs — the
command (`shell` or `argv`), the ordered files, the realpath of its working directory, the `--timeout-ms`, the stamp's
`head`, the PHARN-added environment variable's NAME, and the tree fingerprint (`algo` + `fp_before`). The rule and its
bounds are `pharn/floor/gate-reuse-core.mjs`'s header (cited, not restated — P4).

A **verify** stamp may carry a **reused** entry: `/pharn-verify` offered this delivery run's regress/head stamp
(`--reuse-stamp` + `--reuse-sha256`, only through the git-dir offer `/pharn-regress` published —
`pharn/floor/head-reuse-offer.mjs`, which holds the offer's record and its acceptance rule), and a completed, eligible source run had the same identity at the live tree, so
the runner recorded its result and spawned nothing. The entry is:

- `ran: false`, `reason: "reused"` — this stage did not run the process;
- `exit`, `stdout_sha256`, `stderr_sha256` — the source execution's; its two logs are copied into `<out>` under this
  stage's own log names, byte for byte, only after each hashes to the digest the source recorded;
- `timed_out: false`, `mutated: false`, `fp_before === fp_after` (nothing ran in the slot; a concurrent tree change
  is caught at the next entry's boundary, as for any entry), `results_sha256: null`, `identity_sha256` present;
- `reused: {stage: "regress", side: "head", seq, stamp_sha256}` — the source execution, by its stamp's sha256.

`validateStamp` admits exactly that shape — with an `exit` in 0..125, a completed process exit — only in a `verify`
stamp, and never for an id in `NON_REUSABLE_IDS` (every
AC level gate, every style gate, `reconcile`). Both fields are **optional and additive**: `SCHEMA` is unchanged, a stamp
without them validates as before, and a floor older than 6.34.0 reads a reused entry as `entry-not-run` (a LAPSE code,
so a re-run — the fail-closed direction). The in-progress record's `reuse` binding (the offered path and digest) is
dropped at finalize. While a verify chain is paused at `continue`, that in-progress binding is ordinary `.pharn/` state
the write tools reach, as the in-progress `runs` already are — the named residual `verify-paused-chain-integrity`.

### The closed reuse matrix, and the entry-derived BASE stamp (6.49.0)

A reused run validates only in one of the two (target ← source) pairs `REUSE_PAIRS` holds; any other pair is
`stamp-malformed`:

| target stamp   | source         | shape                                                                                                   |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| `verify`       | `regress/head` | the 6.34.0 entry above, unchanged                                                                       |
| `regress/base` | `entry`        | `ran: false`, `reason: "reused"`, an ALLOWLIST id, exit 0..125, `timed_out: false`, `mutated: false`,   |
|                |                | `fp_before === fp_after`, `results_sha256: null`, NO `identity_sha256`, `reused: {stage: "entry", side: |
|                |                | null, seq, stamp_sha256}`                                                                               |

A `regress/base` stamp that carries a reused run is an **entry-derived BASE stamp**: `/pharn-regress` wrote it from
this delivery run's entry execution instead of running its BASE side (`pharn/floor/entry-base-evidence-core.mjs` holds
when, and every bound; `regression-report.md`, "The additive `base_evidence` block", the report's side). Every run is
`ran: false` — reused or `no-files`, never a run this invocation spawned — and every reused run names ONE entry stamp;
its `fingerprint.algo` is the entry stamp's `ENTRY_ALGO`, so the derivation is visible in the stamp itself. It is new
evidence with explicit provenance, never an entry stamp relabelled: each run carries the entry run's exit and log
digests, and its logs are copied under the regress slot's own names, each verified before and after the write.
`check-regress.mjs` and `check-loop-fresh.mjs` read it unchanged. A historical `regress/base` stamp (no reused run)
validates exactly as before.

## Excluding a discovered gate (`gates.exclude`, `excluded`, 6.36.0)

**Why (P7).** In a user's project the discovered `e2e` gate could not run on the user's machine, discovery offered no
way to leave it out, and an explicit `--gates` list makes `/pharn-verify`'s AC gate read `test-infra-changed` by design.
Two of three real `/pharn-loop` runs stopped on exactly that.

**The declaration** is an optional, closed block in the project root's `pharn.config.json`:

```json
{ "gates": { "exclude": ["e2e"] } }
```

**Declare it and commit it before the run.** `/pharn-test` pins it. An uncommitted declaration is a change since base,
so regress's scope partition (and `--quick`'s scope check) reads it `scope-escaped` unless the PLAN declares
`pharn.config.json` (`ac-tests.md`, "The test-infrastructure pin", states that bound).

`pharn/floor/gate-exclusion-core.mjs` reads it; its header is the grammar (cited, not restated — P4). An absent file
or an absent `gates` key excludes nothing and changes nothing. `exclude` is a list of distinct `ALLOWLIST` members.
Anything else refuses: `run-gates.mjs init` exits 2 with `bad-gate-exclusion` and writes nothing. A `pharn.config.json`
that exists but is not valid JSON refuses too. Before 6.36.0 discovery never read that file, so this is a behaviour
change.

**Where it applies.** It applies to DISCOVERY only, at every stage that discovers. `init --discover <m>` without
`--gates` reads the declaration from `<m>`'s directory, which is the project root for every pinned caller.
`resolveSet` removes the declared ids that discovery found:

- at verify, from the whole discovered set;
- at regress, AFTER the fixed e2e rule;
- at the `ac-test` red run, from the level gates the mapping needs.

It does this before the empty-source test, so an exclusion that leaves nothing is `empty-source-set` (the existing
no-gates stop) with a reason that names it. An explicit `--gates` string is never filtered: `resolveSet` refuses an
exclusion passed with one, and `init` never reads the declaration when `--gates` is given.

**The stamp** carries the optional, additive `excluded` block only when discovery removed at least one id, so every
other stamp is byte-identical to before. It looks like this:

```json
"excluded": { "declared_in": "pharn.config.json#gates.exclude", "ids": ["e2e"] }
```

`validateStamp` admits the block only in exactly this shape:

- `declared_in` is that one value;
- `ids` is a non-empty list of distinct `ALLOWLIST` members, in ALLOWLIST order;
- the stamp's `source` is `discover`;
- no id is in `required` or `runs`.

Anything else is `stamp-malformed`. `SCHEMA` is unchanged. A floor older than 6.36.0 ignores the key, because
`validateStamp` has no closed top-level key set. `gateRunBlock` copies the block when present, so `verify-report.json`
(`gate_run.excluded`) and `regression-report.json` (`gate_run.head.excluded`) disclose it with no checker change. The
regress base side runs the head's set through `baseSpecFrom`, which does not copy the block, so a base stamp never
carries one.

**What it proves, and what it does not (P0).** That a declared id was not run is FLOOR at the moment `init` resolves
the set: a membership test in tested runner code. It is not re-derived later. `validateStamp` checks the block's shape
only, so a stamp missing a gate with no block validates as before. The red run's `bindStamp` is the one reader that
re-resolves the set. An excluded gate is not evidence either way: the map holds no exit for it. The declaration is
agent-editable project input. `/pharn-test` pins it in the AC lock (`ac-tests.md`, "The test-infrastructure pin"),
and that pin is agreement, never provenance (**L43**).

## Build-completeness is NOT a gate

The runner **captures** `check-build-complete.mjs`'s exit code — so it is not model-typed — and records it
under `aux.completeness`. `check-verify.mjs` reads it onto its **existing** `--complete` path.

Folding it into the gates map would make an incomplete build a **red gate**, so the verdict would be
`FAIL` (exit 1) and **`INCOMPLETE` (exit 3) would become unreachable**. That would silently disable
`/pharn-ship` Step 2b's single bounded rebuild, which fires only on `INCOMPLETE`, and collapse
`check-loop.mjs`'s `v ∈ {FAIL, INCOMPLETE}` distinction. `reconcile` is the opposite case and **is** a
gate — it already is one today.

## Ordering and coverage

- **Order:** the source ids (ALLOWLIST order, or the explicit token order), then `structural:*` sorted,
  then — verify only — `instruction-growth` (6.38.0), then `reconcile` **last** so it judges any tree write an earlier
  gate made. The e2e ids (`E2E_SET`:
  `test:e2e`, `e2e`, 6.16.0) are the last ALLOWLIST members, so a discovered e2e gate runs after `build`.
- **Coverage:** `runs` ⊇ `required`. For regress, `required` is the source set minus `STYLE_SET` when
  `--skip-style` was passed, and a **discovered** regress source never contains an `E2E_SET` member (a fixed
  rule, not a flag; an explicit `--gates` string is not filtered). An e2e-only manifest is therefore
  `empty-source-set` at regress. A discovered source never contains an id the project's `gates.exclude` names (6.36.0,
  above).
- **`ac-test` (6.18.0), `/pharn-test`'s red run:** `--ac-tests <AC-TESTS.md>` and `--discover` are required, and
  `--gates`, `--extra`, `--skip-style`, `--scope-json`, `--spec-from` and `--side` are refused. The set is the
  discovered ids the mapping's levels need (`LEVEL_GATES`: `unit`/`integration` → `test`, `e2e` → `E2E_SET`), in
  ALLOWLIST order; a level with no discovered gate is `coverage-violation`. Each entry carries the mapped files of
  its levels (`acFilesFor`), appended after `--`, and an entry with none is refused rather than run. No
  `reconcile`, no `aux.completeness`. Every other stamp reader asserts its own stage, so an `ac-test` stamp is
  `stage-mismatch` there. What the stamp's per-test records decide is `ac-tests.md`'s contract.
- **`entry` (6.42.0), a delivery run's entry check (`pharn/floor/entry-gates.mjs`):** the set `/pharn-verify` would
  discover — e2e kept, `gates.exclude` applied — with every `STYLE_SET` member first (each part in its own order), no
  `reconcile` and no `aux.completeness`. Its fingerprint also excludes the run's whole `pharn/features/<name>/`, because
  its gates run in the background while `/pharn-spec`, `/pharn-plan` and `/pharn-grill` write there, and it records its
  own algo (`worktree-fingerprint.mjs` `ENTRY_ALGO`). An `entry` stamp is never `/pharn-verify`'s reuse evidence
  (`gate-reuse-core.mjs` `findReusable` accepts only a regress/head stamp, and the execution identity carries the algo),
  and every other stamp reader asserts its own stage, so it is `stage-mismatch` there. Since 6.49.0 it may become
  `/pharn-regress`'s BASE evidence, only through the closed matrix row above and `entry-base-evidence-core.mjs`'s rule,
  which keeps the 6.42.0 advisory assumption about the excluded directory and states where it now points. With
  `--base-tests <file>` (a JSON array of test files, each through `badPath`) the set also holds the evidence-only slot
  `base:test` (`ENTRY_BASE_TEST_ID`, reserved): the discovered `test` command handed regress's own default test list,
  right after the style part; the entry verdict never counts it. Any other tree change between two gates still refuses (`tree-changed-between-gates`). What
  counts as red at entry, and why a style gate's red is weighed differently, is `entry-gates-core.mjs`'s header.
- **`build` (6.39.0), `/pharn-build`'s own gate, run by `pharn/floor/build-gate.mjs`:** `--discover` or a human's
  `--gates` is required, and `--extra`, `--skip-style`, `--scope-json`, `--spec-from`, `--side` and `--base` are
  refused. The set is the DISCOVERED ids minus `E2E_SET` (the regress rule — e2e runs at `/pharn-verify`), then the
  project's exclusion, in ALLOWLIST order — or the explicit `--gates` spec, never filtered; an empty set is
  `empty-source-set`. With `--targets <file>` — a JSON array of repo-relative test files, each accepted by
  `ac-tests-core.mjs` `badPath`, non-empty, unique — the set is the `test` gate alone, handed those files after `--`;
  an id a targeted run skips anyway is never named in `excluded`. No `reconcile`, no
  `aux.completeness`. No verdict reads a `build` stamp: the helper prints a summary from it, and every other stamp
  reader asserts its own stage, so a `build` stamp is `stage-mismatch` there.
- **Reserved ids:** `reconcile` and `completeness` (the runner's), and `ac-delivery` and `ac-evidence` (6.20.0 — the ids
  `check-verify.mjs --ac-gate` adds to a verify report's `failing_gates`, which `check-loop.mjs` reads by exact
  membership; a real gate carrying one would be read as the AC gate), and `instruction-growth` (6.38.0, the runner's).
  The `structural:` prefix belongs to `--extra` only.
- **`<actual>` is derived, never supplied:** a `structural:<expected>` entry's argv resolves `<actual>` as
  the `findings.json` colocated with the capability directory that owns `<expected>`, per
  `finding-shape.md`'s emission contract. A supplied or mismatched `<actual>` is refused, so the one
  feature-specific gate does not keep a model-typed operand.

## The closed `reason_code` vocabulary

Every refusal — in `gate-run-core.mjs`, `run-gates.mjs`, both checkers' stamp paths and
`check-loop-fresh.mjs` — carries exactly one member. It is an **enum and not prose**, so
`check-loop-fresh.mjs` (6.10.0) can map the orchestration-lapse subset to "re-run the stage" rather than to
a terminal stop. The set is defined once in `gate-run-core.mjs` (`REASON_CODES`), with two named subsets:

- **`LAPSE_CODES`** — `stamp-missing`, `stamp-unfinalized`, `tree-changed-between-gates` (the three this
  contract always named), plus `entry-not-run` (a runner that stopped mid-drain; `validateStamp` names it
  apart from the malformed class for this routing) and `lock-busy` (two runner invocations contended). A
  report or stamp carrying one of these is re-run, under `/pharn-loop`'s counted budget. Every other
  member is a stop: a stamp that exists and is **wrong** is evidence to stop on, never to paper over.
- **`RESERVED_REASON_CODES`** — members kept with no emitter, each with its reason. It is **empty** today.
- **`ac-evidence-invalid`** (6.20.0) is `check-loop-fresh.mjs` check I's code for a test stage whose gate returned a
  RED verdict (exit 1, a `RED` token) — so `/pharn-loop` maps it to stuck point S13, not S11. The three other front
  checks, and a test-stage gate that exits 2 or crashes, keep `front-stage-red`.
- **`checker-crashed`** (6.21.1) is `check-loop-fresh.mjs`'s code when the freshness checker itself could not load,
  threw, or returned a result outside its contract. Its CLI loads `loop-fresh-core.mjs` with a dynamic import, so each
  of these is `INCONCLUSIVE`, exit 2 (`/pharn-loop` S11), not node's exit 1, which is the checker's RERUN — outside
  the residuals the entry's header names (its own file unloadable, a forced process exit, a top-level await that
  never settles, a signal). It is not
  in `LAPSE_CODES`: a crash is no verdict, so a re-run is never offered on it.

The closure is tested **both ways** (**L36** — a per-member presence set is not a closed set): every literal
the modules emit is a member, **and** every member has an emitter or a reserved entry. The second direction
is new in 6.10.0. Its absence is how `output-hash-mismatch` sat in the vocabulary with no emitter for a
release line; `check-loop-fresh.mjs`'s log check is now its emitter.

## What a validating stamp PROVES

- the map's **values** are the exit codes the runner recorded from the listed argv — for a reused entry (6.34.0), the
  exit a runner recorded for the SOURCE execution its `reused` block names, which the runner of THIS stamp found
  eligible and identity-equal at the live tree when it recorded the entry;
- the map's **keys** cover the resolved source set, plus `instruction-growth` and `reconcile` for verify (the runner
  composes both; nothing re-checks that a stamp carries them);
- **no tree edit happened between init and the first gate** (`fingerprint.init === runs[0].fp_before`, since 6.50.1 —
  `aux.completeness` and the set were captured over the tree init fingerprinted), refused as
  `tree-changed-between-gates` like the next rule;
- **no tree edit happened between consecutive gate runs** (`fp_after[k-1] === fp_before[k]`);
- `reconcile`, when present, ran **last**.

## What it does NOT prove (P0 — each stated, none discovered later)

- **Freshness, by the stamp alone.** A stamp does not compare itself to anything. `check-loop-fresh.mjs`
  (6.10.0) is its consumer: it compares the verify stamp's `fingerprint.final` to the live tree, and a
  regress head stamp's `final` to the verify stamp's `init`, when `/pharn-loop` reads a stop and again at
  its commit gate. It re-hashes every recorded gate log. What that adds is **tree identity, never run
  recency**: evidence from an earlier iteration over an unchanged tree still matches.
- **That the stage ran at all**, or that the report on disk is the checker's own output. This is narrowed,
  not proven, by `check-loop-fresh.mjs`: it binds each report to its stamp by `sha256` and re-derives the
  report's verdict live from the stamp.
- **Who wrote an explicit `--gates` string.** Only `source` is recorded.
- **Forgery.** This certifies **internal consistency, never provenance** — a self-consistent **fabricated**
  stamp passes, and a test builds one to prove it rather than leaving the bound as prose (**L43**). The
  stamp and its logs live in the writable tree, which `Bash` reaches unhooked (`LIMITS.md §6`).
- **That a gate is the right gate.** The allowlist ∩ manifest is a membership test; that the allowlist is
  the _correct_ set is judgment, unchanged from today.
- **A reuse decision, after the fact** (6.34.0). The identity comparison and the eligibility rules ran as tested
  runner code when the entry was recorded; nothing later re-derives them from the verify stamp — the next
  `/pharn-regress` clears the source, and `check-loop-fresh.mjs` does not consult it (the named residual
  `verify-reuse-rederive`). Nor does a reused result prove what a fresh run would give NOW: that is advisory — the gate
  assumed deterministic for one identity, with the inherited environment, the git index and ignored files unbound.

## Bounds

- **POSIX only** — process groups, `SIGTERM`→`SIGKILL` escalation and `/bin/sh` are assumed.
- Gates are assumed **order-independent**; a gate needing another's output must build it itself.
- A descendant calling `setsid` escapes the group kill. A harness `SIGTERM`, `SIGINT` or `SIGHUP` before
  `--timeout-ms` is forwarded to the gate's group (6.50.1); the runner then dies by that signal and records nothing
  for the entry, which the next `run --next` runs again. A `SIGKILL` cannot be caught: it orphans the group until the
  next `run --next` recovers the stale lock, which first stops the group `<out>/lock.child` names (SIGTERM, then
  SIGKILL; still alive is `lock-busy`) so two copies of a gate never overlap. Bounded: a kill in the instant between
  the spawn and that record is not covered, and a group that had already exited may have had its id reused, which
  nothing can tell apart. The invoking command's Bash timeout must still exceed `--timeout-ms`.
- **`--timeout-ms` is required.** Floor code carries no harness-specific default, so there is no default
  for a test to leave unexercised (**L41**).
- Gate stdout/stderr are **untrusted free text** (P2): written by fd, only their sha256 reaches the
  record, and no verdict reads their content.
- **Log growth** is bounded _within_ a stage by `init`'s recreate of `<out>`; across `/pharn-loop`
  iterations the logs accumulate under the git-ignored state root and nothing prunes them.
- The fingerprint is **content-only** (a chmod-only change is invisible), does not descend a submodule
  gitlink, and excludes `.pharn/` plus the active feature's post-build artifacts — a set of its **own**,
  deliberately not `reconcile-ignore.json`'s, because the two answer different questions (**L39**).
  Measured on this repository (re-measured 2026-09-25 for 6.20.8): 2230 paths, ~442 ms for the first
  in-process call and ~73–75 ms warm.
- **Symlinks are hashed by their link text** (every link since 6.20.8; the fingerprint hashes through the
  reconciler's `hashFile`). Re-pointing a link moves the digest; a change to a link's target moves it only
  through the target's own entry, so a gate that reads **through** a link to a file outside the reconciled
  set (outside the repo, or git-ignored) is not re-run when that file changes.
- **`fingerprint.algo` moved to `worktree-fingerprint/2+sha256` in 6.20.8.** The algo is not part of the
  digest, so an unchanged tree can fingerprint equal under both: a stamp written before the upgrade is
  refused by every consumer's `algo` comparison (freshness F and G, the red-run binding), each naming both
  algos — one re-run for a stamp in flight, the fail-closed direction.
