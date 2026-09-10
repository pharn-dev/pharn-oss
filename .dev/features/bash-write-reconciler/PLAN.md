# PLAN — bash-write-reconciler

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299
- applied_lessons: [L1, L2, L6, L7, L13, L17, L19, L20, L26, L29, L33, L34, L37, L38]
- increment: Make a `Bash` write to a path the active writes-scope would have denied **deterministically
  detectable**, and make that detection fail a stage whose verdict is already read as a proceed/stop.
  Detection reduces to path comparison + content hashing; no shell parsing, no verb list, no model
  judgment in the verdict.
- layer(s): `pharn-contracts` (the record shape) + `pharn/floor` (the checker; floor is outside the layer tree)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- status: **AWAITING HUMAN APPROVAL AT THE SKILLS_VERSION GATE — nothing implemented**

## Applied lessons

- **L1** — Meta-doc sweep: this increment invalidates `README.md` (the Phase-1 wording becomes a
  detection claim), `CLAUDE.md` (Commands block + the writes-scope section), `CHANGELOG.md`,
  `SKILLS_VERSION`, and the two trusted docs (human-applied). All are in `## Files`.
- **L2** — Every "enforced by `<floor op>`" phrase in the new contract cites an op verified **live this
  run**; the guarantee audit travels **in the checker header and the contract**, not only here.
- **L6** — Membership facts are read from structured locations: the scope from
  `.pharn/writes-scope.json`, the ignore set from a JSON data file, the permit/deny verdict from the
  hooks' **exit codes** — never grepped from prose.
- **L7** — `## Files` names exactly what this increment writes. The two trusted docs are **excluded** and
  handed over as patches; no scope is held to them.
- **L13** — Each written artifact is formatted by this stage before it halts, scoped to those paths.
- **L17** — **This lesson names the exact trap this design must avoid.** `check-regress scope` is a
  _changed-since-base_ test reported as a _written-by-the-build_ test. The reconciler must not repeat it:
  its baseline is **content-hash vs the last reconciliation**, never `git diff HEAD`, which is why item 2
  below rejects `git status` as the primitive.
- **L19** — The lesson whose gap this increment closes. Every site it named (repo-wide formatters,
  generator writes) is classified in item 8 rather than left implicit.
- **L20** — **This lesson authorises the increment under P7.** The Bash-escape remedy has been
  discipline-only since L19 (2026-08-05) and has recurred: L19's own formatter case, L38's contention
  case, and the `docs/lessons-index.md` generator write. Second occurrence long passed → a floor check is
  earned, not manufactured.
- **L26** — The `LIMITS.md` / `THREAT-MODEL.md` patches are verified against the **repo copy in place**;
  both are `.prettierignore`d and markdownlint-excluded, so no config-driven gate resolves differently.
- **L29** — Two remedies here are quantified over sets, so the **enumeration is the deliverable**: the
  ignore/exempt set is one exported data structure the tests iterate, and the Phase-2 site classification
  (item 8) is a materialised table the tests range over — not assertions written for whichever site was
  in front of the author.
- **L33** — The new prose asserts negatives ("cannot block", "not implemented"). Each names the
  enforcement point that would have to change for it to expire, so a later increment can find them.
- **L34** — **Load-bearing here.** The reconciler is a per-item assertion over a candidate set; over an
  empty candidate set it passes vacuously and a vacuous pass is indistinguishable from a real one.
  Item 9 therefore makes the _absence of a usable baseline_ a RED, not a silent GREEN, and the test suite
  carries a non-vacuity control.
- **L37** — Every quantified claim below was **executed**, not read: the PostToolUse semantics were
  fetched from the live docs, the hash cost was measured (349 ms / 1738 files / 10.3 MiB), the hooks were
  probed with synthetic payloads, and the control-surface refusal was evaluated against the real bytes.
- **L38** — Run from an isolated worktree (`feat/bash-write-reconciler`, based on `d851a08`). Item 7's
  concurrency answer is L38's structural remedy, not a hand-filter.

## Discovery — verified live this run, before any design

| Fact                                   | Verified how                                              | Result                                                                                                              |
| -------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Wired matchers                         | read `.claude/settings.json`                              | one `PreToolUse` block, `Write\|Edit\|MultiEdit\|NotebookEdit`, two commands                                        |
| `settings.local.json`                  | parsed live                                               | wires **no** hooks (only `permissions`)                                                                             |
| Bash reaches both guards?              | synthetic payloads                                        | `enforce-writes-scope.cjs` **exit 0**, `protect-trusted-paths.cjs` **exit 0**                                       |
| `PostToolUse` wired?                   | `grep -c`                                                 | **0**                                                                                                               |
| Scope record shape                     | read `.pharn/writes-scope.json`                           | `{ scope: string[], set_by: string, set_at: ISO }`                                                                  |
| Default-safe-set                       | read `enforce-writes-scope.cjs:106-140`                   | computed at runtime by `defaultSafeSet()`; **not exported**                                                         |
| `pharn/floor/*` protected?             | probe                                                     | **exit 0 — not protected** by either guard                                                                          |
| Control-surface refusal                | evaluated the real `normalizeForTest` + `CONTROL_SURFACE` | lexical only; **case variants pass** (`.CLAUDE/hooks/…` accepted)                                                   |
| Snapshot cost                          | measured                                                  | **1738 files, 10.3 MiB, 349 ms** full SHA-256                                                                       |
| `check-build-complete.mjs` conventions | read `:1-55`                                              | JSON to stdout, exit `0/1/2` fail-closed, explicit TRUST + HONEST-SCOPE headers, **parity test** against the setter |

### The finding that reshapes the design: `PostToolUse` cannot block

Fetched from the live documentation, not assumed:

|                 | `PreToolUse`                      | `PostToolUse`                                       |
| --------------- | --------------------------------- | --------------------------------------------------- |
| exit 2          | **blocks the tool call**          | **"Shows stderr to Claude"** — the tool already ran |
| decision fields | `permissionDecision: allow\|deny` | **none**                                            |
| purpose         | gate-keeper                       | post-execution validator (inform/warn)              |

`PostToolUse` also carries `tool_use_id` and `tool_response`, which `PreToolUse` does not.

**Consequence, stated because it changes where enforcement can live (the task asked for exactly this):**
a `PostToolUse` hook on `Bash` **cannot feed a decision back**. The strongest thing it can do is put text
in front of the model, which the model may ignore — that is **advisory by construction**, and calling it
a guarantee would be the P0 disease. **Enforcement therefore cannot live in a hook at all.** It must live
in a **floor checker whose exit code an existing stage already reads as a proceed/stop** — which is
`/pharn-verify` via `check-verify.mjs`.

## The nine decisions

### 1. Enforcement point — a floor checker at verify; the Bash hook is **rejected**

- **`PostToolUse` on `Bash`: REJECTED.** Not "deferred" — it cannot enforce (above), and it would pay the
  snapshot cost on the highest-frequency tool in the session. Both halves fail.
- **`PostToolUse` on `Write|Edit|MultiEdit|NotebookEdit`: ACCEPTED, as a RECORDER only.** It hashes the
  single path just written and appends a baseline entry. Cost: one file hash (~0.2 ms), on the tool class
  that is _already_ the low-frequency one. It issues no verdict, ever.
- **Floor checker at verify: THE enforcement point.** `pharn/floor/check-bash-reconcile.mjs`, folded into
  `check-verify.mjs`'s gate map, so a RED becomes `verdict: FAIL` — a value `/pharn-ship` and
  `/pharn-loop` already branch on. **No new proceed/stop wiring is invented.**
- **Justified against snapshot cost per Bash call:** the per-Bash cost is **zero**, because no snapshot is
  taken there. The full pass costs 349 ms and runs **twice per stage** (anchor + reconcile), not
  per call.

### 2. Baseline — content-hash vs the last reconciliation, anchored at scope-set

`.pharn/reconcile/baseline.json` = `{ epoch, anchored_by, anchored_at, entries: { <path>: <sha256> } }`.

- **Anchored** (full recompute) by `node pharn/floor/reconcile-baseline.mjs --anchor`, run as each
  command's Step 0 **beside** `set-writes-scope.cjs`. A scope change _is_ a new reconciliation epoch, so
  the epoch boundary coincides with an event every stage already has.
- **Refreshed per path** by the write-tool recorder (item 1), so an ordinary in-scope `Edit` never
  surfaces as a Bash escape. This is the requirement the task called out explicitly.
- **Why not `git status`** (the task is right, and L17 is why): git compares to **HEAD**, which answers
  _changed since base_ — a different question from _written since the last reconciliation_. It misses a
  Bash write that restores HEAD bytes, counts every legitimate Write-tool edit as a change, and cannot
  separate the two. `check-regress.mjs scope` already makes exactly this conflation; repeating it would
  re-ship L17.
- **Why a sibling script, not a change to `set-writes-scope.cjs`:** that file is control surface,
  hook-protected (`Edit` → exit 2). Editing it would make this a human-only increment (the
  `canon-write-denylist` precedent). A new sibling avoids that entirely.

### 3. Snapshot cost — measured, and bounded to two passes per stage

Enumeration is `git ls-files --cached --others --exclude-standard`, so **ignored trees are never walked**
(`node_modules/`, `.pharn/`, `runs/` cost nothing). Measured at `d851a08`: **1738 paths, 10.3 MiB,
349 ms**. Two passes per stage ≈ 0.7 s against a `/pharn-verify` that already runs the full test suite.
The plan commits to **re-measuring at build** and recording the number in the checker header — never
inheriting this figure (L24's rule about bounds carried over from a superseded implementation).

### 4. Control surface — reconciled ALWAYS, and anchored in **git objects**, not in `.pharn/`

`.claude/hooks/*`, `.claude/settings.json`, `.claude/settings.local.json`, `pharn/floor/*`,
`.dev/floor/*` are reconciled on **every** run regardless of the active scope **and regardless of whether
`.pharn/reconcile/baseline.json` exists, is empty, or is forged**.

Their baseline is the **committed blob id at the base ref** (`git ls-tree`), not the reconciler's own
state file. **This is the crux of the task's item 4**: the reconciler's state lives under `.pharn/`, which
`Bash` can reach — so if the control surface were anchored there, the detector could be silently disabled
through the very channel it monitors. Anchoring it in git objects makes control-surface detection
independent of anything the monitored channel can touch.

**Named residual (P0):** a `Bash` write that _commits_ the change moves the base ref too. That is out of
reach of any worktree-state comparison and is stated, not papered over — the backstop there is code
review, which is where `CODEOWNERS` already sits.

### 5. Ignored paths — one exported data structure, iterated by the tests (L29)

`pharn/floor/reconcile-ignore.json`, two disjoint keys:

- `derived`: `"git-ignore"` — the git-ignored set is **derived at run time** from
  `--exclude-standard`, never re-listed. `node_modules/`, `.pharn/`, `runs/`, `.env` come for free and
  stay correct if `.gitignore` changes.
- `exempt`: the **tracked** exemptions, each with a `writer` field naming the command that legitimately
  writes it — today exactly `docs/lessons-index.md` (`/pharn-dev-memory-promote` Step 6b) and
  `.pharn/lessons-index.md` (already git-ignored; listed for documentation). Plus `.git/**`.

Every rule iterates this file. A path added later is covered by every rule for free — L29's deliverable
is the enumeration, not an assertion per member.

### 6. No active scope — delegate by EXECUTION; never duplicate the set

For each candidate path the checker asks the **live guards** whether that write would have been permitted,
by running them with a synthetic `Write` payload and reading the exit codes:

```text
{"tool_name":"Write","tool_input":{"file_path":"<candidate>"}} → protect-trusted-paths.cjs ; enforce-writes-scope.cjs
```

Denied by **either** → escape. This satisfies the task's _"cite that file; do not duplicate the set"_ in
the strongest available form: the checker never learns `defaultSafeSet()` at all, so it inherits the
no-scope default, the dev-vs-install posture, the control-surface refusal, the canon denylist, and every
future change to them, **by construction**. It is also L37's rule applied to the design itself — execute
the op, do not re-read it.

**Fail-closed:** if either hook is absent or unwired, the writes-scope guarantee does not exist in that
tree, so the reconciler's premise is void → **`INCONCLUSIVE`, exit 2**, never a silent GREEN.

**Cost:** two child processes per _candidate_ (changed paths only), not per tracked file.

### 7. Concurrency — per-`tool_use_id` records, and the residual named in `LIMITS.md`

The recorder writes `.pharn/reconcile/pending/<tool_use_id>.json` — one file per write, so N parallel
subagents never read-modify-write one file. `tool_use_id` is present in the `PostToolUse` payload
(verified above). The reconciler merges the directory at run time.

**This scopes the write, not the tree.** Two agent _sessions_ sharing one worktree still share `.pharn/`,
which is exactly **L38**: one mutable record, global to the tree, every stage assuming it owns it. The
reconciler inherits that hazard and **cannot** fix it — so it is stated as a bound in `LIMITS.md`, with
L38's structural remedy (one worktree per session) named as the fix. **Not hand-waved: written down as a
limit, in the file where a limit wins.**

### 8. The Phase-2 sites — every one classified (L29: the enumeration is the deliverable)

| Site                                                                                   | Disposition                                                                                                                                   |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `set-writes-scope.cjs` → `.pharn/writes-scope.json` (67 call sites)                    | **Exempt — git-ignored**, and its write _is_ the epoch boundary (item 2)                                                                      |
| 7 artifact formatters (`plan`/`grill`/`regress`/`verify`/`review`/`ship`/`pharn-ship`) | **In scope → clean.** Each formats its own declared `writes:` path                                                                            |
| `pharn-dev-build.md:91,97` formatter over the scope array                              | **In scope by construction → clean**                                                                                                          |
| `pharn-dev-memory-promote.md:417` → `docs/lessons-index.md`                            | **Exempt as data** (item 5, `writer` recorded) — the only _tracked_ exemption                                                                 |
| `pharn-memory-promote.md:406` → `.pharn/lessons-index.md`                              | **Exempt — git-ignored**                                                                                                                      |
| `.pharn/<command>/**` machine reports (regress ×2, verify ×2)                          | **Exempt — git-ignored**                                                                                                                      |
| `pharn-dev-eval.md` → `runs/**`                                                        | **Exempt — git-ignored**                                                                                                                      |
| `pharn-dev-regress.md:143,150` `git worktree add/remove` at `mktemp -d`                | **Out of jurisdiction** — outside repo root; `.git/**` exempt                                                                                 |
| `pharn-review.md:195` → `features/<name>/findings.json`                                | **Clean** — permitted by the fail-closed default, which item 6 delegates to                                                                   |
| `pharn-ship.md:289` → `/tmp/briefing-draft.md`                                         | **Out of jurisdiction** — outside repo root                                                                                                   |
| `ci.yml:24` `npm ci` → `node_modules/`                                                 | **Exempt — git-ignored**                                                                                                                      |
| `gitleaks.yml:35-45` → `gitleaks` binary + tarball at checkout root                    | **Would RED — and correctly.** Untracked _and not git-ignored_. Fix belongs in that workflow (extract to `$RUNNER_TEMP`); it is in `## Files` |

**Net: zero RED on a normal pipeline run.** The one real RED is a genuine CI hygiene defect this
inventory surfaced.

### 9. WARN vs RED — explicit

| State                                           | Verdict                          | Reason                                                                                    |
| ----------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| Candidate path the guards would deny            | **RED (exit 1)**                 | The defect this file exists for                                                           |
| Control-surface path changed vs its git blob    | **RED (exit 1)**                 | Item 4; independent of any baseline                                                       |
| Baseline absent / unparseable / epoch missing   | **RED (exit 2, `INCONCLUSIVE`)** | _Statusless / unresolvable = RED at write._ L34: an absent domain must not pass vacuously |
| A hook absent or unwired                        | **RED (exit 2)**                 | Item 6 fail-closed                                                                        |
| Baseline entry present but path unreadable      | **WARN**                         | Reported in `warnings[]`; a deleted file is not an escape                                 |
| A record written by an **older** schema version | **WARN — tolerated at read**     | _Legacy records tolerated at read_, per the task                                          |

## Files

- `pharn/pharn-contracts/reconciliation-record.md` — NEW. The record shape + the verdict enum. — layer: `pharn-contracts`
- `pharn/floor/reconcile-baseline.mjs` — NEW. `--anchor` / `--record <path>`; stdlib only. — layer: none (floor)
- `pharn/floor/reconcile-baseline.test.mjs` — NEW. — layer: none (test, never ships)
- `pharn/floor/check-bash-reconcile.mjs` — NEW. The verdict. Exit `0` clean · `1` escape · `2` inconclusive. — layer: none (floor)
- `pharn/floor/check-bash-reconcile.test.mjs` — NEW. Escape detected · in-scope Bash write clean · no-scope fail-closed · ignored-path exemption · control-surface always-reconciled · **non-vacuity control (L34)** · **parity test** for every set delegated to or copied from another file · `ci.yml` + `package.json` pin test. — layer: none (test)
- `pharn/floor/reconcile-ignore.json` — NEW. Item 5's data. — layer: none (floor data)
- `pharn/floor/check-verify.mjs` — EDIT: add the gate to the map. — layer: none (floor)
- `.claude/commands/pharn-build.md` — EDIT: Step-0 `--anchor` beside the setter. — layer: none (command)
- `.claude/commands/pharn-dev-build.md` — EDIT: same. — layer: none (command)
- `.claude/commands/pharn-verify.md` — EDIT: run the checker; read its exit. — layer: none (command)
- `.claude/commands/pharn-dev-verify.md` — EDIT: same. — layer: none (command)
- `.github/workflows/ci.yml` — EDIT: add the checker as its own step (ci.yml never runs `npm run check`). — layer: none (CI)
- `.github/workflows/gitleaks.yml` — EDIT: extract to `$RUNNER_TEMP` (item 8's one real RED). — layer: none (CI)
- `package.json` — EDIT: `check:reconcile` in the `check` chain. — layer: none (repo-meta)
- `README.md` — EDIT: Phase-1 wording → the detection claim. — layer: none (repo-meta)
- `CLAUDE.md` — EDIT: Commands block + writes-scope section. — layer: none (repo-meta)
- `CHANGELOG.md` — EDIT: the `4.0.0` entry. — layer: none (repo-meta)
- `SKILLS_VERSION` — EDIT: `3.1.2` → `4.0.0`. — layer: none (repo-meta)
- `.dev/features/bash-write-reconciler/proposed/APPLY.md` — NEW. Human-applied hand-off. — layer: none (apparatus)
- `.dev/features/bash-write-reconciler/proposed/LIMITS.md.patch` — NEW. — layer: none (apparatus)
- `.dev/features/bash-write-reconciler/proposed/THREAT-MODEL.md.patch` — NEW. — layer: none (apparatus)

### Two design corrections the scope-setting run forced (recorded, not silently applied)

Running `set-writes-scope.cjs --from-plan` against the first draft of this list resolved **16 of 27**
paths: the setter takes **one back-ticked path per bullet**, so every multi-path bullet silently dropped
its tail — the L37 failure mode (a correct reading, a wrong quantifier) reproduced inside this very plan.
One path per bullet now. Two design changes followed from re-reading what the dropped paths were for:

1. **Anchor at BUILD only — not at plan/grill/regress too.** More anchors is *worse*, not better: each
   anchor resets the baseline, so anchoring at grill or regress would **erase** an escape that happened
   during build. The reconciled window is deliberately **build → verify**. Command edits drop 10 → 4.
   **Bound, stated:** a Bash escape during plan or grill is outside the window and is not detected.
2. **The `PostToolUse` recorder is DROPPED — it turned out to be unnecessary, not merely costly.** The
   verdict asks *"would the guards have denied this path?"* A path written through the guarded surface
   was, by construction, permitted by those same guards — so it can never be flagged, and no record of
   guarded writes is needed to keep ordinary edits clean. This removes the increment's only
   control-surface dependency: **no `.claude/settings.json` edit, therefore no human-applied hook patch**
   (the `canon-write-denylist` cost) and no `--allow-claude-dir`. Item 1's recorder half is withdrawn;
   its enforcement half stands.

**Consequence for item 6 — the scope is snapshotted, and the duplication is bounded and parity-tested.**
At verify time `.pharn/writes-scope.json` holds *verify's* scope, not the build's — the exact trap
`check-regress.mjs` documents ("by the time /pharn-dev-regress runs it holds the regress stage's own
scope"). So `--anchor` snapshots the live scope record **into** the baseline, and the checker matches
candidates against that snapshot. The **fail-closed default** is still delegated by executing the live
hook (a snapshot of *absence* is absence), and trusted-path denial is delegated to
`protect-trusted-paths.cjs`, which is scope-independent. Only the explicit-scope glob match is the
checker's own code — the `check-build-complete.mjs` precedent exactly, and it carries the same kind of
parity test.

### Deliberately NOT in scope

- `LIMITS.md`, `THREAT-MODEL.md` — hook-denied; patches handed over, no write attempted.
- A `PostToolUse` hook on `Bash` — rejected on the merits (item 1), not deferred.
- `set-writes-scope.cjs`'s lexical case-fold gap (Phase-2 Q4 #3) — **real, and a separate increment.**
  It is a control-surface edit, therefore human-only, and folding a second axis in would break
  one-axis-per-attempt.
- `check-regress.mjs`'s own named FOLLOW-UP (`## Files` base-vs-HEAD comparison) — a different hole.

## Guarantee audit (P0)

- **"a Bash write to a denied path is detected and fails `/pharn-verify`"** → **FLOOR**: content-hash
  (primitive #2) + path membership via the live guards' exit codes (primitive #3), and `check-verify.mjs`
  already owns a verdict stages read. **No new primitive class.**
- **"the control surface is reconciled always"** → **FLOOR**, anchored in git objects, independent of the
  reconciler's own state.
- **"all Bash writes are detected"** → **STRUCK.** Only those to paths the guards would deny, within the
  tracked non-ignored set, between two anchors, in one worktree.
- **"a green verify means no Bash escape occurred"** → **STRUCK.** It means none was detected.
- **"this prevents Bash writes"** → **STRUCK.** Detection is strictly weaker than prevention; OS-level
  sandboxing is the only true prevention and is not implemented (`SPEC.md`, out-of-scope #1).
- **"the reconciler cannot be disabled"** → **STRUCK.** `Bash` can delete `.pharn/reconcile/`; that state
  is RED-on-absent (item 9), so disabling it is **loud, not silent** — which is the honest claim, and the
  most this design can support.
