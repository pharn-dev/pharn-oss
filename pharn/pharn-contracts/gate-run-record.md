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
  "stage": "verify | regress | ac-test",
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

| field                   | meaning                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `schema`                | Exact match required. Bumped only on a breaking shape change.                                  |
| `side`                  | `base`/`head` for regress; **`null`** for verify. Enum-gated both ways.                        |
| `head`                  | `git rev-parse HEAD` at `init`, or `null` when the tree is not a git repo / HEAD is unborn.    |
| `source`                | How the **source set** was resolved. `explicit` records the raw string in `source_raw`.        |
| `style_skipped`         | True iff `--skip-style` actually removed a member of `STYLE_SET`. Never silent.                |
| `required`              | The **source** ids coverage is checked against. Injected entries are not members.              |
| `runs[].ran`            | `false` only with `reason: "no-files"` — a file-addressable gate with an empty file list.      |
| `runs[].mutated`        | The gate changed the tree itself. **Recorded, never refused** — `reconcile` judges that write. |
| `aux.completeness`      | `check-build-complete.mjs`'s exit. **A sibling of `runs[]`, never a member.** See below.       |
| `runs[].results_sha256` | Optional (6.15.0). The sha256 of the gate's results file, or `null`. See below.                |

## Per-test results (`results_sha256`, 6.15.0)

Every gate is spawned with one extra environment variable, `PHARN_TEST_RESULTS`, valued with that gate's own
absolute path under `<out>` (`resultsFileName(seq, id)` in `gate-run-core.mjs`, the one copy of the rule). A
project's reporter config may write a machine-readable results file there. The runner removes that path
before the gate runs and afterwards records `results_sha256`: the sha256 of the path if it is a regular file,
else `null`. It is recorded on **every** run, but only the gates `test-results-record.md` lets a project
configure are ever read; on any other gate the hash means nothing.

The field is **optional and additive**. `SCHEMA` is unchanged: `validateStamp` checks it only when present
(`null` or a sha256 digest), so every stamp written before it still validates. A stamp carrying a
**malformed** value is refused as `stamp-malformed` by all three `validateStamp` callers — a route reachable
only by a forged or corrupted stamp, never by one the runner wrote. What the file means, and when it can be
read, is `test-results-record.md`'s contract, not this one.

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
  then `reconcile` **last** so it judges any tree write an earlier gate made. The e2e ids (`E2E_SET`:
  `test:e2e`, `e2e`, 6.16.0) are the last ALLOWLIST members, so a discovered e2e gate runs after `build`.
- **Coverage:** `runs` ⊇ `required`. For regress, `required` is the source set minus `STYLE_SET` when
  `--skip-style` was passed, and a **discovered** regress source never contains an `E2E_SET` member (a fixed
  rule, not a flag; an explicit `--gates` string is not filtered). An e2e-only manifest is therefore
  `empty-source-set` at regress.
- **`ac-test` (6.18.0), `/pharn-test`'s red run:** `--ac-tests <AC-TESTS.md>` and `--discover` are required, and
  `--gates`, `--extra`, `--skip-style`, `--scope-json`, `--spec-from` and `--side` are refused. The set is the
  discovered ids the mapping's levels need (`LEVEL_GATES`: `unit`/`integration` → `test`, `e2e` → `E2E_SET`), in
  ALLOWLIST order; a level with no discovered gate is `coverage-violation`. Each entry carries the mapped files of
  its levels (`acFilesFor`), appended after `--`, and an entry with none is refused rather than run. No
  `reconcile`, no `aux.completeness`. Every other stamp reader asserts its own stage, so an `ac-test` stamp is
  `stage-mismatch` there. What the stamp's per-test records decide is `ac-tests.md`'s contract.
- **Reserved ids:** `reconcile` and `completeness` (the runner's), and `ac-delivery` and `ac-evidence` (6.20.0 — the ids
  `check-verify.mjs --ac-gate` adds to a verify report's `failing_gates`, which `check-loop.mjs` reads by exact
  membership; a real gate carrying one would be read as the AC gate). The `structural:` prefix belongs to `--extra` only.
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

- the map's **values** are the exit codes the runner recorded from the listed argv;
- the map's **keys** cover the resolved source set, plus `reconcile` for verify;
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

## Bounds

- **POSIX only** — process groups, `SIGTERM`→`SIGKILL` escalation and `/bin/sh` are assumed.
- Gates are assumed **order-independent**; a gate needing another's output must build it itself.
- A descendant calling `setsid` escapes the group kill; a harness kill before `--timeout-ms` orphans the
  group, which is why the invoking command's Bash timeout must exceed it.
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
