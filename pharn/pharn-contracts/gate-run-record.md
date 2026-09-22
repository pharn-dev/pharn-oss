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
  "stage": "verify | regress",
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
      "stderr_sha256": "<sha256>"
    }
  ],
  "aux": { "completeness": 0 }
}
```

### Field notes

| field              | meaning                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `schema`           | Exact match required. Bumped only on a breaking shape change.                                  |
| `side`             | `base`/`head` for regress; **`null`** for verify. Enum-gated both ways.                        |
| `head`             | `git rev-parse HEAD` at `init`, or `null` when the tree is not a git repo / HEAD is unborn.    |
| `source`           | How the **source set** was resolved. `explicit` records the raw string in `source_raw`.        |
| `style_skipped`    | True iff `--skip-style` actually removed a member of `STYLE_SET`. Never silent.                |
| `required`         | The **source** ids coverage is checked against. Injected entries are not members.              |
| `runs[].ran`       | `false` only with `reason: "no-files"` — a file-addressable gate with an empty file list.      |
| `runs[].mutated`   | The gate changed the tree itself. **Recorded, never refused** — `reconcile` judges that write. |
| `aux.completeness` | `check-build-complete.mjs`'s exit. **A sibling of `runs[]`, never a member.** See below.       |

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
  then `reconcile` **last** so it judges any tree write an earlier gate made.
- **Coverage:** `runs` ⊇ `required`. For regress, `required` is the source set minus `STYLE_SET` when
  `--skip-style` was passed.
- **Reserved ids:** `reconcile` and `completeness`. The `structural:` prefix belongs to `--extra` only.
- **`<actual>` is derived, never supplied:** a `structural:<expected>` entry's argv resolves `<actual>` as
  the `findings.json` colocated with the capability directory that owns `<expected>`, per
  `finding-shape.md`'s emission contract. A supplied or mismatched `<actual>` is refused, so the one
  feature-specific gate does not keep a model-typed operand.

## The closed `reason_code` vocabulary

Every refusal — in `gate-run-core.mjs`, `run-gates.mjs` and both checkers' stamp paths — carries exactly
one member. It is an **enum and not prose** so a later increment can map the orchestration-lapse codes
(`stamp-missing`, `stamp-unfinalized`, `tree-changed-between-gates`) to "re-run the stage" rather than to a
terminal stop. The set is defined once in `gate-run-core.mjs` (`REASON_CODES`) and a closure test collects
every literal the modules emit and requires each to be a member (**L36** — a per-member presence set is not
a closed set).

## What a validating stamp PROVES

- the map's **values** are the exit codes the runner recorded from the listed argv;
- the map's **keys** cover the resolved source set, plus `reconcile` for verify;
- **no tree edit happened between consecutive gate runs** (`fp_after[k-1] === fp_before[k]`);
- `reconcile`, when present, ran **last**.

## What it does NOT prove (P0 — each stated, none discovered later)

- **Freshness.** `fingerprint.final` is **written** here and compared against nothing. Comparing it to the
  live tree at the moment a verdict is read is a **later increment**. Writing a field whose only consumer
  is the next increment is a P7 cost, accepted explicitly at this increment's plan gate.
- **That the stage ran at all**, or that the report on disk is the checker's own output.
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
  Measured on this repository: 1925 paths, ~463 ms cold and ~75–85 ms warm.
