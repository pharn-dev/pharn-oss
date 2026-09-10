---
file: "pharn/pharn-contracts/reconciliation-record.md"
kind: pharn-owned
trust: trusted
layer: pharn-contracts
coupling: agnostic
purpose: "The shape of the reconciliation baseline and the reconciliation verdict — the artifacts pharn/floor/reconcile-baseline.mjs writes and pharn/floor/check-bash-reconcile.mjs emits. Schema only, zero behavior."
reads: []
writes: []
---

# Contract — reconciliation record

`pharn-contracts` is the layer-tree root: schemas only, zero behavior (P3). This file defines two
shapes and one enum. It defines no procedure — the procedure lives in the two floor scripts, and their
honesty travels in their own headers (lessons-learned L2: the PLAN is ephemeral, the artifact is
durable).

## Why this exists

Both `PreToolUse` write guards match `Write|Edit|MultiEdit|NotebookEdit`. A write issued through
**`Bash`** reaches every path in the repository, is not denied, and — with no `PostToolUse` hook wired —
leaves no record. `LIMITS.md §6` states that bound; this contract is the shape of the mechanism that
makes such a write **detectable after the fact**.

## The claim these artifacts support — and the seven it does not

**Supported, literally:** _a **non-adversarial** write to a path the active writes-scope would have
DENIED is detected, and fails the stage._

**"Non-adversarial" is load-bearing.** The baseline is unauthenticated state inside the writable tree, so
a writer who edits a denied file **and** rewrites that file's baseline entry gets a silent `CLEAN`. This
is an **accounting tool against tooling that escapes its scope** — a formatter, a generator, a script, a
mistake, which is the entire population of the `L19`/`L20` failures it was built for — and it is **not a
control against an attacker**. Only the always-reconciled control surface resists that actor, because
only it is anchored in committed git objects rather than in the baseline.

**Struck (P0), each for a stated reason:**

| Struck claim                                  | Why                                                                                                                                                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Bash writes are prevented"                   | Detection is strictly weaker than prevention. The only true prevention is OS-level sandboxing of the `Bash` process, which PHARN does not implement and cannot — harness-layer, environment-dependent, not expressible in markdown methodology (`LIMITS.md §6`) |
| "all Bash writes are detected"                | Only those to **denied** paths, inside the reconciled set, between two anchors, in one worktree                                                                                                                                                                 |
| "a `CLEAN` verdict means no escape occurred"  | It means none was **detected**                                                                                                                                                                                                                                  |
| "the detector cannot be disabled"             | Its state is reachable by the channel it monitors. **Deleting** it is loud (`--require-baseline` ⇒ `INCONCLUSIVE`), and the control surface is anchored in committed blob ids — but **forging** an ordinary path's baseline entry is silent                     |
| "the detector cannot be disabled **quietly**" | True for the control surface **only**. For ordinary paths a forged baseline entry yields `CLEAN` with no warning. Closing this needs authenticated state outside the worktree — the same harness-layer category as the OS sandbox, and just as absent           |
| "the checker vouches for its own integrity"   | It cannot. `/pharn-*verify` runs the **worktree** copy through Bash. `pharn/floor/` is always-reconciled, so a modified checker is caught **by itself** — circular, and not a guarantee                                                                         |
| "skipping the anchor fails the run"           | Only in a tree that has **never** anchored. Otherwise `--require-baseline` is satisfied by whatever earlier epoch is on disk, and the reconciliation silently ranges over the wrong window. The anchor is a Bash call (`L19`), so nothing forces it             |

## 1. The baseline record — `.pharn/reconcile/baseline.json`

Written by `pharn/floor/reconcile-baseline.mjs --anchor`. Gitignored (it lives under `.pharn/`), and
**disposable**: absent means "no epoch has been opened", which is the honest normal state of a fresh
clone.

```json
{
  "version": 1,
  "epoch": "2026-09-10T11:33:19.704Z",
  "anchored_by": "pharn-build",
  "scope_snapshot": { "scope": ["src/app.ts"], "set_by": "features/x/PLAN.md", "set_at": "…" },
  "entry_count": 1759,
  "entries": { "<repo-relative path>": "<sha256 hex>" }
}
```

| Field            | Type             | Meaning                                                                                                                                   |
| ---------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `version`        | integer          | Schema version. A **newer** version than the reader is `INCONCLUSIVE`; an **older** one is tolerated at read and reported in `warnings[]` |
| `epoch`          | ISO-8601         | When this epoch opened                                                                                                                    |
| `anchored_by`    | string           | A label passed as `--by`. **Advisory** — it is argv, so it is a description, never an authorization                                       |
| `scope_snapshot` | object \| `null` | A verbatim copy of `.pharn/writes-scope.json` at anchor time, or `null` when none was set                                                 |
| `entry_count`    | integer          | `Object.keys(entries).length` at write time                                                                                               |
| `entries`        | object           | Repo-relative path → SHA-256 of its bytes                                                                                                 |

**Why the scope is snapshotted rather than read live.** By reconciliation time
`.pharn/writes-scope.json` holds a **later** stage's scope — it is one mutable record, global to the
worktree, that every stage's Step 0 overwrites (lessons-learned **L38**; `check-regress.mjs` documents
the same trap from the other side). Reading it live would judge the build's writes against verify's
scope.

**Why the baseline is not `git status`.** `git status` answers _changed since the base commit_, a
different question: it misses a `Bash` write that restores HEAD bytes, and it counts every legitimate
Write-tool edit as a change with no way to separate the two. `check-regress.mjs scope` already makes
exactly that conflation, and lessons-learned **L17** is the record of it. The baseline is therefore
_content-hash vs the last anchor_.

## 2. The verdict — `pharn/floor/check-bash-reconcile.mjs` stdout

```json
{
  "verdict": "CLEAN",
  "epoch": "…",
  "anchored_by": "pharn-build",
  "reconciled": 0,
  "escapes": [],
  "exempted": [],
  "warnings": []
}
```

`escapes[]` entries carry `{ file, denied_by, scope_set_by? }`. When non-empty the record additionally
carries `findings[]` in `finding-shape.md`'s enum-gated/free-text split — `type`, `rule_id`, `severity`,
`file` are floor-verifiable; `problem` is free text and MUST be rendered as quoted DATA downstream.

### The verdict enum — closed

| Verdict        | Exit | Meaning                                                                                                                                                                                                                                                          |
| -------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLEAN`        | 0    | Reconciled against a baseline; no candidate was one the guards would deny                                                                                                                                                                                        |
| `ESCAPE`       | 1    | ≥1 changed path the guards would have denied. `escapes[]` names each                                                                                                                                                                                             |
| `NO_BASELINE`  | 0    | No epoch has been opened. **GREEN by design** — a fresh clone or CI checkout has never anchored, and REDding there makes every first run a false alarm (the posture `check-lessons-index.mjs` takes for `COLD`). Only reachable **without** `--require-baseline` |
| `INCONCLUSIVE` | 2    | Fail-closed: a malformed or future-schema baseline, an absent guard, a failed enumeration, or `--require-baseline` with no baseline                                                                                                                              |

Callers branch on **set membership over this enum, or on the exit code** — never on prose (P5).

## 3. `WARN` vs `RED`

**RED** (`ESCAPE` / `INCONCLUSIVE`): a denied candidate; a control-surface path changed with no
authorizing scope; any statusless or unresolvable input. _Statusless = RED at write._

**WARN** (`warnings[]`, verdict unaffected): a path present at anchor and absent now — a deletion is not
a write; a path unreadable during reconcile; a baseline written by an **older** schema version —
_legacy records tolerated at read._

## 4. The ignore/exempt data — `pharn/floor/reconcile-ignore.json`

One file, iterated by the rules **and** by the tests (lessons-learned **L29**: when a remedy is
quantified over a set, the enumeration is the deliverable). Five keys:

| Key                  | What it holds                                                                                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `derived_ignore`     | git's own ignore rules — **never re-listed** here (**L35**: retire the second copy). The reconciled set is `tracked ∪ untracked-not-ignored`, so `node_modules/`, `.pharn/`, `runs/` cost nothing                                                                                              |
| `always_reconciled`  | Never exemptible; falls back to committed blob ids when no baseline exists. A **copy** of the guards' own control-surface sets, pinned set-equal by test                                                                                                                                       |
| `pipeline_artifacts` | A stage's **own** output (`features/<slug>/PLAN.md`, `VERIFY.md`, `lenses/<lens>/findings.json`, …) — **exact** enum membership, never a `**` glob, so a stray file under the same directory is still reported. A copy of `check-regress.mjs`'s `PIPELINE_ARTIFACTS`, pinned set-equal by test |
| `exempt`             | Tracked paths a **named** command legitimately rewrites through Bash. Deliberately tiny; each entry carries its `writer`                                                                                                                                                                       |
| `never_exempt`       | A refusal set — memory-bank canon, the four trusted docs, `CODEOWNERS`. Enforced at **run time**, not only under test                                                                                                                                                                          |

**Why `pipeline_artifacts` exists, and it is lessons-learned L17 verbatim.** A stage's own artifact
changes _after_ the build's anchor — `/pharn-verify` writes `VERIFY.md`, `/pharn-review` writes
`findings.json`, and the `PLAN.md` that **sourced** the scope is not a **member** of it. Without this
key, every one of those reads as an escape: a _changed-since-anchor_ fact reported as a
_wrote-outside-scope_ claim, producing a **blocking** finding on the correct, designed workflow — which
is precisely how an operator is trained to wave through the one finding that must never be waved
through. This defect was found by running the checker against its own increment, not by reasoning about
it.

## 5. Guarantee audit (P0)

- **"a denied path that changed is reported"** → **FLOOR**: content-hash (`ARCHITECTURE §2` primitive
  #2) composed with path/enum membership (primitive #3). No model judgment.
- **"denied is decided by the real guards"** → **FLOOR, by delegation**: the checker **executes**
  `protect-trusted-paths.cjs`, and for the no-scope default it executes `enforce-writes-scope.cjs` in a
  probe sandbox reproducing only the two runtime signals its `defaultSafeSet()` reads. The default set
  is never copied.
- **"the explicit-scope match agrees with the hook"** → **ADVISORY-BOUNDED**: that one matcher is a
  faithful copy, pinned by an example-based parity test — not a proof of equivalence. The two must be
  updated together.
- **"no Bash escape occurred"** → **STRUCK.** Four bounds: the reconciled set excludes git-ignored
  paths; the window is anchor→reconcile; the model is one worktree per session; no attribution.
- **"a shell command was analysed"** → **STRUCK, and structurally impossible here.** No Bash command
  string is ever read. Shell parsing is undecidable and a verb denylist is a heuristic, which P0 forbids
  labelling a guarantee.
