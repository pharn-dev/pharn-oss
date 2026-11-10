# PLAN — entry-verdict-early-read

- spec_content_hash: ab4dbd928b96b51bdb54ee12b91e87a95d1ba144013a26b8f20ffa9b4122c7fd
- applied_lessons: [L22, L31, L35, L36, L44, L66, L72, L83]
- increment: a new non-blocking `entry-gates.mjs --peek` read, run by `/pharn-loop` after its spec and plan stages and by `/pharn-ship` after its plan stage, stops (loop) or asks (ship) as soon as a gate has already finished red — from the finished result, or from the gates the runner has finished so far — instead of only at the `--wait` before `/pharn-test`.
- layer(s): product floor (`pharn/floor/`), product commands (`.claude/commands/pharn-*`)
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## The failure (P7)

Measured 2026-11-10 on 7.3.1 in a user's project. `entry-gates.mjs --start` ran 7 gates from 06:00:46Z. Its only
reader, `--wait`, runs between the grill and the test stage (`pharn-loop.md` Step 4; `pharn-ship-stages.md` Step 2.3).
It was first called at 06:35:41Z and returned red (`format:check`, `e2e`) 26 s later; the run stopped S14 after spec,
plan (both `agent:opus`) and grill: about 39 minutes, 102 requests, about 19.6M cache-read tokens. An earlier run the
same morning stopped S10 at plan and never read the entry verdict.

**Discovery finding that changed the design (asked and answered at the start of this plan).** The runner writes
`result.json` only after its LAST gate (`drainEntry` → `finalizeResult`), and run-gates finalizes the stamp at the last
gate too. In the measured run the result landed about 06:36:07Z, after spec, plan and grill. A read that decides only
a finished result would most likely have printed `continue` at both boundaries and saved nothing, although
`format:check` — a `STYLE_SET` gate, which the entry set runs first — was red within minutes. The human chose: **the
early read also decides a red from the gates finished so far.** `/pharn-ship` starts its entry gates only after GATE 1
(after its spec stage), so the human chose: **`/pharn-ship` reads once, after plan.**

## What is built

### 1. `entry-gates.mjs --peek --feature <name>` — a fourth mode

One pinned line, `node pharn/floor/entry-gates.mjs --peek --feature '<name>'`. It never waits (no `--budget-ms`), never
takes over a dead runner, and writes nothing: no `recordEntryChanges`, no `publishEntryOffer`, no observation line, no
`result.json`, no `progress.json`. Every write `--wait` performs stays in `--wait`, so it still happens once per run, at
the final read.

Decision order — every branch a membership/equality test (P5):

1. Root containment and the runner record exactly as `--wait` reads them (`rootContained`, `runnerRecordDefect`,
   feature equality); a failure is the same `unusable` document `--wait` prints (exit 2).
2. **A finished result.** `result.json` present → the same checks `--wait` runs (`resultRecordDefect`, nonce + feature
   binding, `no-gates` / `aborted` / `unusable` statuses, the stamp's sha256, `validateStamp(…, {stage: "entry",
feature})`, `ENTRY_ALGO`) and the same `entryVerdict`. **One decision path (L35):** `decideDone` is split into a
   side-effect-free `decideResult` (every check + `entryVerdict`, returns the document fields) and the two effects;
   `--wait` calls `decideResult` then the effects, `--peek` calls `decideResult` only. The document is the one `--wait`
   would print, except `changes_record: "deferred"`.
3. **No result → the gates finished so far.** Read the in-progress `pharn/.run/pharn-entry/gates/state.json` (run-gates
   writes it atomically per gate and removes it at finalize) and the runner's `progress.json` bound to the record's
   nonce and feature (`readProgress`, reused). Turn it into a stamp view with a new pure
   `inProgressStampView(state)` in `entry-gates-core.mjs` — `finalized: true`, `fingerprint.final` = the last run's
   `fp_after`, the in-progress-only keys (`entries`, `cwd`, `reuse`) dropped, `null` when `runs` is empty or the
   record is not an object — and validate it with the SAME `validateStamp(…, {stage: "entry", feature})` + `ENTRY_ALGO`
   (one owner, L35: the per-run shape, `runs[0].fp_before === init` and the between-gates chain are checked over the
   runs so far). Then the SAME `entryVerdict` with the progress digests and the record's `d0`.
   - verdict `red` (at least one attributable red so far) → print the red document with `changes_record: "deferred"`
     and `detail: "decided over <k> of <n> gates; the rest are still running"`, exit **4**.
   - anything else — no view, a refusal of the view, no red yet, only an unmeasured gate, only a `base:test` red, a
     style red whose digests are missing or moved (`unattributed`) — → `continue`, exit **5**.

   Red is the only partial verdict, because it is the only status that cannot change as more gates finish:
   `entryVerdict` ranks red first, and a run already in `runs[]` is final. An unmeasured gate so far could still be
   joined by a later red (S14b → S14), so it waits for the finished result.

4. No result, no in-progress record (not started yet, or finalized between the two reads) → `continue`, exit 5.

`CHANGES_RECORD` gains one member, `"deferred"`: a `--peek` document records nothing; the final `--wait` does. `EXIT`,
`STATUSES`, `REASON_CODES`, `DOC_SCHEMA` and the document's keys are unchanged.

### 2. `/pharn-loop` — two early reads

- **Step 3**, after `check-spec-approved.mjs` exits 0 (a `--quick` run: after its kind read prints `quick`, `## Quick
mode` item 2), before Step 4: the peek line.
- **Step 4**, after `/pharn-plan`'s `finish` line (or the inline return line), before the grill's `stage-start`
  marker: the peek line again.
- Branch on the exit only (P5): `4` → **S14**, `6` → **S14b** (both: unless `--allow-red-entry`, then go on), with
  the same `### next_steps` copying as the final read; **every other exit → go on** (the final `--wait` decides). Never
  re-run the peek line on `5`.
- The S14 / S14b rows read "an entry read (Step 3's or Step 4's early read, or Step 4's final read) exits …"; S4 is
  not reachable from a peek (a no-gates start already stopped the run at Step 1a).
- `allowed-tools` gains exactly one grant, `Bash(node pharn/floor/entry-gates.mjs --peek --feature *)`, derived from
  the pinned line (the closure test requires it).
- The final `--wait` before `/pharn-test` stays, unchanged.

### 3. `/pharn-ship` — one early read (Step 2.2, after the plan's verdict block, before the grill's start line)

The peek line, which a `--quick` run also runs (the quick part skips only the pre-grill verdict block). `4` or `6` →
present the document's `red` ids / `unmeasured` entries as DATA and ask the same **Stop** / **Continue** form; every
other exit → proceed. A **Continue** answer here carries to Step 2.3's final read: its exit `4` or `6` then proceeds
without asking again (the ids still go to `SHIP.md`); its exit `2` still asks. `/pharn-ship` has no `allowed-tools`
list (a test pins that only the loop has one), so the new line is pinned in its body and in the wiring test.

## Applied lessons

- L83 — the red is surfaced at the earliest boundary that can see it (after spec, after plan), and the early read asks
  the owner itself — the same `validateStamp` and `entryVerdict` — never a copy of the rule.
- L35 — one decision path: `decideDone` splits into `decideResult` (pure checks + verdict) and its two effects, and the
  partial path reuses `validateStamp` / `entryVerdict` / `readProgress` instead of a second validator.
- L36 — `CHANGES_RECORD` gains `"deferred"`; the existing reason-code closure test is mirrored for `CHANGES_RECORD`
  (every member has an emitter in the CLI, every emitted literal is a member), and the S14/S14b rows' exit numbers stay
  built from `EXIT`.
- L72 — adding a member to a shared enum: grep every reader of `CHANGES_RECORD` / `changes_record` (found only
  `entry-gates-core.mjs`, `entry-gates.mjs`, `pharn-loop.md` prose and the tests) and keep each one's branch right.
- L31 — loop and ship are a copy-pair of the early read: the wiring test's `WIRING` table gains the peek line's
  positions and rows for BOTH commands, so neither copy can drop it.
- L22 — the read is a pinned line in both commands, never a described technique.
- L44 — each peek block is its own shell and carries the literal `'<name>'`; nothing flows between blocks.
- L66 — the partial read takes `state.json` only from the directory `--start` created empty, and the progress digests
  only when bound to the runner record's nonce and feature; a stale or foreign record yields `continue`.

## Files

- `pharn/floor/entry-gates.mjs` — the `--peek` mode, `decideResult` split out of `decideDone`, header + usage — layer product floor
- `pharn/floor/entry-gates-core.mjs` — `inProgressStampView`, `CHANGES_RECORD` gains `"deferred"`, header — layer product floor
- `pharn/floor/entry-gates.test.mjs` — the evals below, and the `WIRING` table gains the peek line — layer test (not shipped)
- `.claude/commands/pharn-loop.md` — the two peek blocks and their branches, the S14/S14b rows, one grant — layer product command
- `.claude/commands/pharn-ship-stages.md` — the peek block in Step 2.2, its branch, and Step 2.3's carried answer — layer product command
- `.dev/floor/command-hygiene.test.mjs` — the byte ceilings the new text needs, by the measured + 10% rule — layer dev floor
- `.dev/floor/stage-load-budget.test.mjs` — the loop/ship load ceilings, only if the measured totals cross them — layer dev floor
- `.dev/guides/floor-gates.md` — the `entry-gates.mjs` section names the fourth pinned line — layer dev guide
- `SKILLS_VERSION` — 7.4.0 → 7.5.0 (minor: a new floor CLI mode and a new orchestration step) — layer repo meta
- `README.md` — the badge, and the entry-gate sentence says the run stops at the next stage boundary — layer repo meta
- `CHANGELOG.md` — the `[7.5.0]` section with its entry — layer repo meta

### Not changed

- `MIN_CLI` stays `0.14.0`: no installed path moves and no contract or frontmatter shape an older CLI reads changes;
  an older CLI installs these bytes whole.
- The four trusted docs: none states where the entry verdict is read (grepped: `pharn/LIMITS.md`, `pharn/ARCHITECTURE.md`,
  `pharn/THREAT-MODEL.md`).
- `pharn-loop-quick.md` / `pharn-ship-quick.md`: their deltas do not touch the peek points; the loop's Step 3 and the
  ship's Step 2.2 text say where a `--quick` run reads.
- `pharn/pharn-contracts/cost-ledger.md`, `regression-report.md`, `gate-run-record.md`: every sentence about
  `--wait`'s observations, recorded changes and offer stays true; `--peek` writes none (stated in the module header,
  the owner).

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` (`entry` bullet) — the stamp `--peek` validates is the one it describes;
  the in-progress view is checked by the same `validateStamp`, so nothing new is admitted.
- `pharn/pharn-contracts/loop-record.md` — S14 / S14b keep their `blocked:` values; only the step that reaches them widens.

## Evals to write (P1)

All in `pharn/floor/entry-gates.test.mjs` (hermetic temp trees, the existing fixture helpers):

- `inProgressStampView` → empty `runs` → null; non-object → null; a 2-of-5 state → `finalized: true`,
  `fingerprint.final` = `runs[1].fp_after`, no `entries` / `cwd` / `reuse`.
- peek, no runner record → exit 2, `reason_code: no-runner`.
- peek, runner alive, no result, no state → exit 5; the entry root's files are byte-identical before and after.
- peek, runner GONE, no result, an in-progress state with no red → exit 5 and NO takeover (no run-gates spawned:
  `state.json` and `progress.json` unchanged, no `result.json`).
- peek, in progress, a non-style gate red → exit 4, `red` names it, `changes_record: "deferred"`, `detail` says
  `decided over 1 of N gates`.
- peek, in progress, a style gate red with progress digests equal to `d0` → exit 4; with a moved digest → exit 5
  (`unattributed`); with no progress entry for it → exit 5.
- peek, in progress, only an unmeasured gate (timed out) → exit 5; only a `base:test` red → exit 5.
- peek, in progress, a chain break between two runs / a state naming another feature / a malformed state → exit 5.
- peek over a finished bound result (red, and green) → the same `status` / `red` / `unmeasured` / `gates` as `--wait`
  over the same result, `changes_record: "deferred"`, and no changes record, no offer and no observation line written;
  a `--wait` afterwards records them once.
- ✧ CLOSURE — every `CHANGES_RECORD` member has an emitter, every emitted changes-record literal is a member (L36).
- ★ WIRING — `pharn-loop.md`: the peek line exactly twice — the first after the `check-spec-approved.mjs` line and
  before the plan's start line, the second after the plan's `finish` line and before the grill's `stage-start` marker
  — each followed by its rows (`4` → S14, `6` → S14b, `--allow-red-entry`, every other exit goes on).
  `pharn-ship-stages.md` (through the family text): exactly once, after the `check-plan-lessons.mjs` line and before
  the grill's start line, with **Stop** / **Continue**. Every existing start/wait/abort assertion unchanged.
- The loop grant closure (`command-hygiene.test.mjs`, existing) covers the new pinned line with exactly one new grant.

## Guarantee audit (P0)

- "`--peek` never takes over, never waits and writes nothing" → **floor: enum-regex** over the CLI's behaviour, pinned
  by the byte-identical-tree and no-spawn tests above (agreement on the fixtures, not on every tree).
- "a peek red is the verdict `entryVerdict` gives over the runs finished so far, validated by `validateStamp`" →
  **floor: enum-regex** (the same pure functions, tested).
- "a partial red is the final verdict too" → **advisory, and false in one stated case:** a later gate run can break the
  tree chain (`tree-changed-between-gates`) or the finalize can fail, making the final result `unusable`, which the
  loop's final read lets go on. The early read stops anyway. Stated in the module header and the claims bullet.
- "the loop / ship run the early read at both boundaries and obey its exit" → **advisory** orchestration; the wiring
  test pins the text and order, never a run.
- "`--wait`'s effects happen once per run" → **advisory** for a run (nothing stops a model calling `--wait` twice);
  floor only in that `--peek` itself performs none (tested).
- "the early read saves time" → **advisory**: it saves time only when a red gate has finished by a boundary; a red
  later gate (the measured `e2e`) is still read at the final `--wait`.

## Trust audit (P2)

- `state.json`, `progress.json`, `result.json`, the stamp → ordinary `pharn/.run/` state a Bash writer reaches; read
  lstat-first through `readInProject`, agreement checked, never provenance (L43, as for `--wait`). Gate output is never
  read. Every value quoted into `detail` goes through `shown` (L62). Ids reach the commands' records as DATA.

## Determinism audit (P5)

- Every branch is a membership test over exit codes, enum statuses and record shapes; the terminal fallback of every
  undecidable partial case is `continue` (the final `--wait` decides), never a guess.

## Open questions (HALT)

- None open: the two design questions (partial red; ship reads once, after plan) were asked and answered in this run.
- Noted for GATE 1: the request said the new line "must be pinned in both commands' allowed-tools lists"; only
  `/pharn-loop` has one (a test pins that `/pharn-ship` has none), so the ship line is pinned in its body and in the
  wiring test.
