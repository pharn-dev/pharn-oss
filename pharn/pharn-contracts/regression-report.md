---
name: regression-report
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the machine regression-report — the pharn/features/<name>/regression-report.json /pharn-regress and /pharn-dev-regress emit at the regress stage. Schema only, zero behavior. Defines the ONE floor-relevant field (`verdict`, enum-gated at four live consumer sites) versus the rest of the object, which is ADVISORY shape documentation no floor op reads (pharn/ARCHITECTURE.md §6; P0, P2)."
---

# Contract — regression-report

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). It is the SoT for the
> machine report the regress stage emits. Enforcers **cite** it and **conform** to it; they do not restate
> their own rules through it (P4). It elaborates `pharn/ARCHITECTURE.md §6` (the `regress` stage); the
> principles (P0, P2, P5) live in `pharn/CONSTITUTION.md`, and the enum-gated vs tainted-free-text split
> it inherits is defined once in `pharn/pharn-contracts/finding-shape.md` — cited here, never re-defined.
>
> **Read this before quoting anything below (P0).** Exactly **one** field in this artifact is
> floor-relevant: `verdict`, and only because four live checkers test it for **enum membership**. Every
> other field in this document is **ADVISORY shape documentation** — a description of what the emitter
> writes, **not** a constraint anything enforces. **Writing this contract did not make any report conform
> to it**, and no checker validates a report against this file. "There is a contract for the
> regression-report" therefore does **not** mean "the regression-report's shape is guaranteed" — that
> inference is the exact disease this repo exists to prevent.

The regression-report is `pharn/features/<name>/regression-report.json` (product) /
`.dev/features/<name>/regression-report.json` (dev) — the machine half of the regress stage, written
beside the human-facing `REGRESSION.md`. It is `pharn/floor/check-regress.mjs`'s **`verdict` subcommand**
stdout, plus — in the product report — three additive advisory blocks, `base_evidence` (6.33.0; its `source` and
`entry` keys 6.49.0),
`pre_run_snapshot` (6.37.0) and `head_install` (6.40.0), and, only when the run's entry gates recorded changes, a
fourth, `entry_gate_changes` (6.42.0), all below.

**Since `stage-regress-script` (6.23.0), the WRITER is `pharn/floor/stage-regress.mjs`, not the model.** The
product stage script shells `check-regress.mjs verdict` and writes its output atomically (a tmp file under
`.pharn/pharn-regress/`, then `rename`), so no stray tmp file lands in the feature directory. Since 6.33.0 it
appends `base_evidence`, since 6.37.0 `pre_run_snapshot` after it, since 6.40.0 `head_install`, and since 6.42.0, when
present, `entry_gate_changes` last, as the object's last keys and re-serializes with the same `JSON.stringify(…, null, 2)`
the checker prints with, so every key the checker printed keeps its bytes: the report minus those blocks is the
checker's stdout, byte for byte (`stage-regress.test.mjs` pins it). The dev
twin (`/pharn-dev-regress`) is unchanged: the model writes the checker's bytes by hand and adds no block.

## What this artifact IS and IS NOT (P0 — the honesty bar)

- **IS:** a machine-readable record of a **base→head exit-code comparison** over the gates that ran
  **outside** the feature's declared scope, plus the deterministic verdict computed from that comparison.
- **IS NOT** a claim that **nothing broke**. The regress stage catches exactly what the project's own
  deterministic suite catches — a regression with no covering test, rule or eval is **invisible** here.
  `verdict: "no-regressions"` means _"no gate that was green at base is red at head"_, nothing wider.
- **IS NOT** a report on the feature itself. Gates already red **at base** are classified `pre_existing`
  and deliberately **excluded** from the verdict — they are not the increment's fault, and blaming them
  on it would train an operator to wave through the one signal that must never be waved through.

## The object

```json
{
  "base": "HEAD",
  "inside": [".claude/commands/pharn-dev-ship.md", "CHANGELOG.md"],
  "outside_gates": { "tests": { "base": 0, "head": 0 }, "validate": { "base": 0, "head": 0 } },
  "regressions": [],
  "pre_existing": [],
  "verdict": "no-regressions"
}
```

## Field shape + trust classes

| field           | shape                                                        | class                                      |
| --------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `base`          | the git ref the baseline was captured at, or `null`          | ADVISORY — no floor op reads it            |
| `inside`        | array of repo-relative paths counted as inside the feature   | ADVISORY — no floor op reads it            |
| `outside_gates` | `{ "<gate-id>": { "base": <int>, "head": <int> } }`          | ADVISORY — no floor op reads it            |
| `regressions`   | array of gate-ids that were `0` at base and non-zero at head | ADVISORY — no floor op reads it            |
| `pre_existing`  | array of gate-ids already non-zero at base                   | ADVISORY — no floor op reads it            |
| `verdict`       | **enum** — `no-regressions` · `regressions` · `inconclusive` | **FLOOR-RELEVANT** — enum-gated by 4 sites |
| `reason`        | a diagnostic sentence, present only on `inconclusive`        | ADVISORY — no floor op reads it            |

**`regressions` being empty is not the guarantee — `verdict` is.** The two always agree in emitter
output, but only one of them is read, so a hand-edited report with `regressions: []` beside
`verdict: "regressions"` would stop the pipeline, and one with a populated `regressions[]` beside
`verdict: "no-regressions"` would not. Stated because the array is the field a human's eye goes to.

**Trust (P2).** Every field carries deterministic-tool output — gate-id strings, integer exit codes, and
file paths from `git diff` and path-set membership: the enum-gated / floor-verifiable class. **This
artifact contains no untrusted free text**, which is a genuine difference from the verify-report and is
why its residual section is narrower. The `scope` subcommand (below) _does_ emit `finding-shape` objects
with free-text `problem` fields, but those go to the command's own output and `REGRESSION.md` — **not**
into this file.

## What is NOT in this artifact: the `scope` subcommand's output

`pharn/floor/check-regress.mjs` has **two** subcommands, and only one produces this artifact:

- **`verdict`** — the base→head comparison. Its stdout **is** `regression-report.json`.
- **`scope`** — the pre-suite path-set partition (`inside` ⊆ declared `writes:`; the fix #7 escape check).
  Its output object is a **different shape** (`inside`, `declared`, `escaped`, `escape_exempt`,
  `findings`, `outside_tests`, `outside_eval_pairs`) and is **not** this contract's subject. A reader
  finding an `escaped` or `findings` key in a committed regression-report is looking at a hand-assembled
  file, not emitter output — see the drift classification below.

## The `verdict` field — the one floor-relevant part

`verdict` is the only field any floor checker reads from a committed report. Four checkers read it, and
here — unlike `pharn/pharn-contracts/verify-report.md`, where the sets diverge — **all four accept the
same set**, `{no-regressions, regressions, inconclusive}`:

| consumer                               | on a value outside the set             |
| -------------------------------------- | -------------------------------------- |
| `pharn/floor/check-ship.mjs`           | `INCONCLUSIVE`, exit 2 — fail-closed   |
| `pharn/floor/check-loop.mjs`           | `INCONCLUSIVE`, exit 2 — fail-closed   |
| `pharn/floor/render-ship-briefing.mjs` | the honest literal `n/a` in the render |
| `pharn/floor/check-ship-briefing.mjs`  | RED (shape)                            |

The agreement is worth stating rather than assuming: the verify-report's four sets are **not** identical,
so "the two spine reports behave the same way here" is a fact about this artifact, not a symmetry a
reader may take for granted.

**A value outside the set is REFUSED, never defaulted.** One committed report exercises this live —
`.dev/features/dev-product-boundary/regression-report.json` carries `verdict: "not-applicable"`, and both
stop cores return `INCONCLUSIVE` exit 2 naming the value and the allowed set. A missing or unparseable
report reaches the same fail-closed state. Nothing anywhere reads an absent verdict as "fine".

## Who reads this artifact — and the distinction that matters

- **FLOOR consumers — exactly the four above, and each reads `verdict` and nothing else.** This is a
  measurement, not a reading of their source: see the probe record in
  `pharn/pharn-contracts/verify-report.md` § "How the \"only `verdict`\" claim was verified", which was
  executed over **both** reports in one pass.
- **The EMITTER is not a consumer.** `pharn/floor/check-regress.mjs` **produces** this object; it never
  reads a committed report. Feeding one back to its `verdict` subcommand yields `inconclusive` exit 2
  (`gate "base" is not an integer exit code`), because its inputs are two `{ "<gate-id>": <int> }` maps,
  not reports.
- **ORCHESTRATOR reads are a different class, and are ADVISORY.** `/pharn-ship` and `/pharn-dev-ship`
  present `regressions[]` to a human at their gates, and `REGRESSION.md` renders `outside_gates`. These
  are **LLM-performed presentation reads**, not floor reads: they steer what a human is shown, never a
  deterministic branch. So "only `verdict` is read" is true **of the floor** and false as an unqualified
  sentence. **Since 6.23.0, the product `REGRESSION.md` itself is no longer model-written prose** — it is
  rendered by `pharn/floor/render-regression.mjs`, deterministic code the stage script calls before
  writing it (`pharn/pharn-contracts/stage-exit.md`). The dev twin's `REGRESSION.md` remains hand-written.

## Extra keys are IGNORED (deliberately not a closed-key object)

Additional keys are **ignored, not RED** — the `pharn/pharn-contracts/loop-record.md` posture, for the
same structural reason: **nothing downstream reads them**, so there is no privileged decision for a
smuggled field to reach. Real runs have annotated their reports with `feature`, `style_gates`,
`base_rationale`, `escape_exempt` and similar; a closed-key object would retroactively invalidate those
honest artifacts to buy a guarantee no consumer needs.

## Measured conformance — a dated measurement, NOT an invariant

Measured **2026-09-09 at commit `8bc6c0a`** over **121** committed `regression-report.json` files, by
parsing every one (never by grepping prose):

- **121/121 (100%)** carry `{regressions, verdict}`.
- **118/121 (97.5%)** carry the full core `{base, inside, outside_gates, pre_existing, regressions,
verdict}`; **113** carry **exactly** that core, which is the emitter's output unmodified.
- **120/121** carry a `verdict` inside the enum (`no-regressions` ×120). The `regressions` and
  `inconclusive` members are reachable per the emitter but appear in **no** committed report.

**The three non-conforming reports are hand-assembled, not emitter output**, and each is classified here
rather than averaged away:

| file                                                                | classification                                                                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.dev/features/dev-product-boundary/regression-report.json`         | **Excluded as a documented non-instance**, not drift. Its own `note` field states it "is NOT a check-regress.mjs base<->head verdict object". Its out-of-enum `verdict` is refused fail-closed (above). |
| `.dev/features/forward-looking-claims-sweep/regression-report.json` | **Legacy drift.** Hand-assembled with `baseline_commit` / `baseline_method` in place of `base` / `inside` / `outside_gates` / `pre_existing`. Its `verdict` is in-enum, so a consumer accepts it.       |
| `.dev/features/plan-cue-continuation/regression-report.json`        | **Legacy drift**, missing only `inside`.                                                                                                                                                                |

Legacy drift is recorded, **not** retro-fixed: rewriting a committed audit artifact to match a contract
written afterwards would falsify the record these files exist to preserve.

**This is a count over a growing corpus and it expires as runs accumulate** — the next pipeline run
commits a 122nd report this paragraph does not describe. It is recorded with its date and commit so a
reader can re-derive it, and it must **never** be read as an invariant the repo maintains.

## The rule of the contract (P0)

- **FLOOR (enum-regex, `pharn/ARCHITECTURE.md §2` primitive #3):** `verdict` is tested for membership at
  the four sites above, and a value outside the set is **refused fail-closed**, never guessed at. That
  guarantee belongs to **those checkers**, and it exists whether or not this document does.
- **ADVISORY (everything else, and it is most of the document):** that a report matches the object above,
  that `outside_gates` is complete, that `regressions[]` agrees with `verdict`, that `base` names the real
  baseline, that `inside` is the true partition. **No checker validates a report against this contract.**
  Three committed reports already diverge from it and every gate in this repo is green over them.
- **Consequently: this contract DOCUMENTS a shape; it does not ENFORCE one.** A shape-validating checker
  is deliberately not built (P7) — the review that prompted this document classed the drift as
  **structural, not an active defect**, and no dogfood run, eval, or user report has failed on report
  shape. Should a real failure surface, that is the trigger to give it a floor check, and this section is
  where the change would be recorded.

## Residual (named, not hidden — `LIMITS.md §2`)

Narrower than the verify-report's, and narrower for a structural reason rather than by luck: this
artifact carries **no untrusted free text**, so there is no injected-quote channel through it. The
residual that remains is the honest one about the verdict itself — a `no-regressions` verdict is only as
wide as the suite that produced it, and a reader who takes it as "the change is safe" has substituted a
guarantee about **gates** for a guarantee about **behavior**. The document says exactly what the gates
say; it cannot say more.

## The additive `gate_run` block (advisory shape)

Since the gate-run-stamp increment, `/pharn-regress` runs both sides' gates through
`pharn/floor/run-gates.mjs` and passes the two stamps to `check-regress.mjs verdict --base-stamp/--head-stamp`.
The verdict fields are **unchanged**; the report additionally carries a **per-side** block:

```json
{
  "gate_run": {
    "base": { "stamp_sha256": "<sha256>", "source": "explicit | discover", "fingerprint": { "algo": "<token>", "final": "<sha256>" } },
    "head": { "stamp_sha256": "<sha256>", "source": "explicit | discover", "fingerprint": { "algo": "<token>", "final": "<sha256>" } }
  },
  "reason_code": "<a closed reason_code, on a fail-closed exit only>"
}
```

- **ADDITIVE and ADVISORY**, on the same evidence as the verify report's: every live consumer reads named
  fields only, verified by reading each.
- Two refusals exist only on the stamp path, each with its own `reason_code`: the base stamp's recorded
  `head` must equal the `--base` SHA (`base-head-mismatch`), and the two sides' specs must agree
  (`spec-mismatch`) — which is what makes "the set is decided once and applied to both" checkable rather
  than merely intended.
- **`gate_run.head.excluded` (6.36.0, optional).** It is copied from the HEAD stamp when the project's `gates.exclude`
  removed a discovered gate (`gate-run-record.md`, "Excluding a discovered gate"), and is absent otherwise. The base
  side runs the head's set through `base-init`'s spec copy and names nothing itself. An excluded gate runs on neither
  side, so a regression in it cannot be seen. `REGRESSION.md` renders one line directly under the verdict line
  saying so. ADVISORY: no verdict and no `check-loop-fresh.mjs` comparison reads it.
- **The bound (L43):** internal consistency, never provenance — a self-consistent fabricated pair passes.
- **One machine consumer:** `check-loop-fresh.mjs` requires each side's `gate_run.<side>.stamp_sha256` to
  equal the sha256 of that side's stamp on disk, re-derives `verdict` / `regressions` / `pre_existing` /
  `outside_gates` from the two stamps, and requires the head stamp to have ended on the tree
  `/pharn-verify` started from. A `reason_code` in its `LAPSE_CODES` subset re-runs `/pharn-regress`.
  **Since 6.23.0, `stage-regress.mjs` removes THIS feature's earlier report in its very first phase
  ("fresh"), before any step that can fail** — so a run that starts and then refuses (a RED spec→plan
  chain, a scope escape, a missing artifact) leaves no earlier report on disk for a consumer to
  misread as current (`pharn/pharn-contracts/stage-exit.md`'s `refused` row: "no machine report"). The
  residual survives only for a malformed invocation refused before that removal step (`unusable`, whose
  own row states "an argv refusal removes nothing") and, unchanged, for `/pharn-dev-regress`'s prose flow,
  which is out of this increment's scope. The head-final-equals-verify-init check remains the backstop
  whenever the build moved the tree regardless.

Full shape: `pharn/pharn-contracts/gate-run-record.md` (cited, not restated — P4).

## The additive `base_evidence` block (6.33.0, advisory shape)

A later `/pharn-regress` of the same `/pharn-loop` or `/pharn-ship` run may REUSE the BASE-side evidence an earlier
one produced, instead of re-creating the base worktree, re-installing and re-running every base gate. The product
report says what happened, as its last key:

```json
{
  "base_evidence": {
    "reused": false,
    "miss": "no-record",
    "requirement_sha256": "<sha256>",
    "recorded": true
  }
}
```

- **`reused`** — `true`: this invocation created no base worktree, ran no install and ran no base gate; the base stamp
  it compared is the one `gate_run.base.stamp_sha256` names, and the run marker, reuse record, stamp and logs agree
  with this invocation's requirement (floor). That an earlier invocation of the same delivery run produced it is
  advisory: agreement, never provenance (L43). `false`: the base side ran here, exactly as before 6.33.0.
- **`miss`** — `null` on a reuse; otherwise why not: one member of the closed, ordered set `BASE_REUSE_MISSES`,
  the first that applied. The set and each member's meaning are owned by `pharn/floor/stage-regress-core.mjs` and
  `pharn/floor/regress-base-reuse-core.mjs`'s header (P4). An invocation with no open `/pharn-loop` or `/pharn-ship`
  run marker for the feature reads `no-delivery-run` and never reuses or records; a marker an interrupted run left
  (≤ 24 h, the write guard's age rule) makes a standalone invocation behave as part of that run, because the marker is
  read by presence and age, never parsed.
- **`requirement_sha256`** — the digest of the BASE requirement this invocation needed (`null` only with
  `requirement-unknown`). What the requirement contains, and what it deliberately leaves out, is
  `pharn/floor/regress-base-reuse-core.mjs`'s header.
- **`recorded`** — whether, when the invocation ended, a reuse record binds the base stamp on disk, so a later
  invocation of the same run can reuse it. `false` with no open delivery-run marker, for evidence that would never be reused, or
  when the record could not be written; `REGRESSION.md` names which.

**The rule, and its bounds (P0).** FLOOR: whether a reuse happens is decided by tested code over content hashes and
closed enums (`regress-base-reuse-core.mjs`); `check-regress.mjs` and `validateStamp` are unchanged, so a reused stamp
is read and validated exactly as a fresh one, and the verdict is always the checker's over the stamps on disk.
ADVISORY: that a reused base result equals what a fresh base run would give now — it assumes the suite is
deterministic for one requirement, and that nothing the requirement does not bind changed (ignored root content such
as `node_modules/`, the environment, the machine). The reuse record lives in the git dir, out of the write tools'
reach; a Bash writer can forge it with the evidence, and the base side's in-progress scratch is write-tool reachable
while a chain is paused (`pharn/floor/regress-base-reuse.mjs`, header). No floor op reads this block, and the four
verdict consumers above ignore it.

### Entry-derived BASE evidence — `source` and `entry` (6.49.0, additive)

When the retained evidence above is not reused, `/pharn-regress` asks whether THIS delivery run's validated entry
execution (`entry-gates.mjs`, offered through the git dir) is exactly the BASE evidence it needs. If it is, it writes
an **entry-derived** `regress/base` stamp (`gate-run-record.md`, "The closed reuse matrix, and the entry-derived BASE
stamp") and skips the BASE worktree, the install and every BASE gate. The four keys above keep their 6.33.0 meaning (the
retained-reuse decision); two keys follow them:

```json
{
  "base_evidence": {
    "reused": false,
    "miss": "no-record",
    "requirement_sha256": "<sha256>",
    "recorded": false,
    "source": "entry",
    "entry": {
      "used": true,
      "miss": null,
      "offer_sha256": "<sha256>",
      "entry_stamp_sha256": "<sha256>",
      "base": "<40-hex>",
      "run": { "command": "pharn-loop", "marker_sha256": "<sha256>" },
      "reused_ids": ["test", "typecheck", "build"],
      "no_files_ids": [],
      "ignored_ids": ["test"]
    }
  }
}
```

- **`source`** — where the BASE evidence came from: `"fresh"` (this invocation created the BASE worktree, ran its install
  decision and spawned the base gates), `"reused"` (a retained 6.33.0 HIT) or `"entry"` (this run's entry gates). For
  `reused` and `entry`: no worktree, no install, no base gate process. `recorded` is `false` with `entry`: no retained
  record ever binds entry-derived evidence (`REGRESSION.md`'s `entry-derived`).
- **`entry`** — `null` when a retained HIT left the entry rule unasked; else the decision. `used`; `miss` — `null` when
  used, otherwise one member of the closed, ordered set `ENTRY_BASE_MISSES`, the first that applied (owned, with each
  member's meaning, by `pharn/floor/stage-regress-core.mjs`; the rule is `pharn/floor/entry-base-evidence-core.mjs`'s
  header — cited, not restated, P4); the offer's and the entry stamp's digests, the BASE commit and the run binding when
  used; `reused_ids` (BASE slots taken from an entry run), `no_files_ids` (regress `no-files` slots, which take no
  evidence) and `ignored_ids` (entry runs that did not become evidence). No log, environment, prompt or timing.

**The rule, and its bounds (P0).** FLOOR: the decision (content hashes and closed enums over the offer, the pre-run
snapshot, the run marker, the entry stamp and its logs — agreement, never provenance, L43) and the derived stamp's
shape (`validateStamp`'s closed matrix); the verdict is `check-regress.mjs`'s over the stamps on disk, unchanged.
NOT CLAIMED: that entry-derived BASE equals what a fresh nested-worktree BASE would give — they may differ because the
environments differ (ignored files, `node_modules`, the inherited environment, the machine); the entry gates are the
real, unattested start environment, and a regression is still a gate green at BASE and red at HEAD. ADVISORY and
inherited: that a non-style entry gate did not read a front stage's concurrent write under `pharn/features/<name>/`
(6.42.0) — used as BASE evidence, a false red there can HIDE a HEAD regression as `pre_existing`. Not seen: ignored
state an earlier entry-only run left. Every reuse assumes per-sample determinism. A MISS is never a question, a refusal
or a stop: the BASE side then runs exactly as before.

## The additive `pre_run_snapshot` block (6.37.0, advisory shape)

`/pharn-loop` and `/pharn-ship` record a PRE-RUN SNAPSHOT at entry — every path changed since `HEAD`, each with a
content digest, kept in the git dir and bound to the run marker (`pharn/floor/pre-run-snapshot.mjs`). The partition
then reports, instead of counting as an escape, an undeclared path that still holds the bytes the snapshot recorded.
The product report says what happened, as its last key:

```json
{
  "pre_run_snapshot": {
    "status": "applied",
    "unchanged": ["shared/components/settings-layout/settings-layout.tsx"]
  }
}
```

- **`status`** — `applied` (the snapshot bound to this run and this base was used), or why not: one member of the
  closed, ordered `PRE_RUN_MISSES`, the first that applied. The set and each member's meaning are owned by
  `pharn/floor/pre-run-snapshot-core.mjs`'s header (P4). A standalone `/pharn-regress` reads `no-delivery-run` and
  behaves exactly as before 6.37.0 — unless an interrupted `/pharn-loop` or `/pharn-ship` of the same feature left its
  run marker (≤ 24 h, the write guard's age rule): the marker is read by presence and age, never parsed, so that
  standalone invocation applies the interrupted run's snapshot, as `base_evidence` above already does.
- **`unchanged`** — the undeclared, non-exempt changed paths NOT counted as escapes, in `inside`'s order; empty on
  every miss. It is never the whole of what the snapshot holds: a declared or exempt path is not listed here.

The same block is written to the stage's `scope.json` and, for the quick modes, printed in `check-quick-scope.mjs`'s
document; a `scope-escaped` refusal's `REGRESSION.md` names it beside the escapes.

**The rule, and its bounds (P0).** FLOOR: the subtraction is decided by tested code over content hashes, the marker's
bytes and closed enums, in the invocation that runs the partition. ADVISORY: the block a resumed chain renders (it is
re-read from `scope.json`, a `.pharn/` file the write tools reach while a chain is paused). Agreement, never
provenance (L43): a Bash writer can forge the git-dir record bound to the right marker. The subtraction never
attributes — a path an earlier run escaped with is pre-run state for the next run, so a re-run reports it rather than
refusing — and it touches the escape set only: `inside` is unchanged, so a pre-run change that breaks a gate still
reads as a regression and a pre-run-changed test file is not compared here (`pharn/floor/pre-run-snapshot-core.mjs`,
header). No floor op reads this block, and the four verdict consumers above ignore it.

## The additive `head_install` block (6.40.0, advisory shape)

The BASE side runs its gates over a fresh install (`stage-regress-core.mjs` INSTALL_RULE); the HEAD side runs them in
the working tree, over whatever `node_modules` it holds. So before any HEAD gate, the stage compares npm's own record
of the installed tree (`node_modules/.package-lock.json`) with the lockfile the project declares
(`pharn/floor/install-drift-core.mjs`, whose header owns the rule, its states and its bounds — cited, not restated,
P4). A tree that does not match — a package changed, missing or extraneous, or a lockfile listing packages with no
`node_modules` at all — is **refused** `head-install-drift` (`pharn/pharn-contracts/stage-exit.md`): `REGRESSION.md`
quotes the counts, the first 20 mismatched package paths and the remedy (`npm ci`) as DATA, and **no
`regression-report.json` is written**. `--no-install` and `--gates` do not change the check — it is about the tree the
HEAD gates run in. Every other state proceeds exactly as before, and the report says which, as its last key:

```json
{
  "head_install": {
    "state": "clean",
    "why": null,
    "family": "npm",
    "lockfile": "package-lock.json",
    "counts": { "changed": 0, "missing": 0, "extraneous": 0, "missing_unchecked": 271 }
  }
}
```

- **`state`** — `clean` or `not-checked` in a written report (the two refusing states, `drifted` and
  `not-installed`, never reach one). **`why`** — for `not-checked` only, one member of the closed, ordered
  `NOT_CHECKED_WHYS` (no `package.json`, no lockfile, two lockfile families, a pnpm / yarn / bun project — UNMEASURED,
  never guessed —, an unreadable or npm ≤ 6 lockfile, an unreadable `node_modules`, no npm record in it, an unreadable
  record). **`counts.missing_unchecked`** — absent packages npm may legitimately skip: `optional` ones (a platform's
  binaries), `devOptional` ones with a platform constraint, and `dev` / `peer` / `devOptional` ones of a class npm's
  record shows NO present member of (an install configured to omit that class leaves it absent after every `npm ci`).
  Counted, never drift. An absent member of a class that WAS installed is `missing`, i.e. drift.
- `null` — the stored block was absent or malformed when the report was written (it is re-read from
  `.pharn/pharn-regress/head-install.json`, a file the write tools reach while a chain is paused). A report written
  before 6.40.0 has no such key.
- `REGRESSION.md` renders it as ONE line beside the install lines: `clean` says what was compared, `not-checked` says
  a red gate may come from the install rather than from the change.

**The rule, and its bounds (P0).** FLOOR: the refusal is decided by tested code over the two files' parsed content and
closed enums, in the invocation that runs head-init. **NOT claimed:** that `node_modules` holds what the lockfile says
— the check certifies that two records npm writes agree (L43), so a `node_modules` changed outside npm, or by `npm
install --package-lock-only` (measured), reads `clean`; nor that a needed package of a class the install omitted is
present (it is `missing_unchecked`). A false `clean` leaves the pre-6.40.0 behaviour; it never causes a refusal. A known
refusal, named: a workspace-filtered install (`npm ci -w <ws>`, measured) reads `drifted`, and its remedy is a full
install. No bypass is offered — the only way past the refusal is an install that matches the lockfile. A resumed chain
does not re-check (its HEAD gates already ran). A build that edits the lockfile without installing is now refused here
— in `/pharn-loop`, an S9 stop with `npm ci` as the remedy instead of iterations over the old install. No verdict
consumer reads this block.

## The conditional `entry_gate_changes` block (6.42.0, advisory shape)

A delivery run's entry gates (`pharn/floor/entry-gates.mjs`) run AFTER the pre-run snapshot. A gate the entry stamp
marks `mutated` can rewrite a path itself, as `next build` does with `next-env.d.ts`. `entry-gates.mjs --wait`
records those paths, each with the digest the gate left, in a second git-dir record. That record has the snapshot's
shape, validator and decision (`pre-run-snapshot.mjs` `recordEntryChanges` / `entryChangesUnchanged`), and is bound to
the same run marker. The partition subtracts such a path by the same rule: only while it still holds the recorded
bytes. It reports the path in this block, in `scope.json` (after `pre_run_snapshot`), in the report (last, after
`head_install`) and in the quick check's document:

```json
{ "entry_gate_changes": { "status": "applied", "unchanged": ["next-env.d.ts"] } }
```

- **The block is present only when an entry record exists**, that is, any status but `no-delivery-run` or
  `no-snapshot` (`pre-run-snapshot-core.mjs` `entryBlocks`). A run without one writes exactly the bytes it wrote
  before. `status` and `unchanged` read as in `pre_run_snapshot` above. A path that both records hold is reported once,
  under `pre_run_snapshot`.
- **Bounds:** the snapshot's, plus one of its own. A non-gate write outside the feature directory that lands while a
  `mutated` gate runs is recorded with that gate's writes (`entry-gates.mjs`, header). The block is advisory: no floor
  op reads it.
