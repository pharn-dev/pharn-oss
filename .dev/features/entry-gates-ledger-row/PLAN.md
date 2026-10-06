# PLAN — entry-gates-ledger-row

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L35, L36, L42, L43, L54, L58, L62, L63, L66]
- increment: record the background entry-gate work as observational facts (`.pharn/cost/<name>/entry.jsonl`, written at
  the existing `--start` / runner / `--wait` / `--abort` boundaries) and carry them into `cost.json` as a closed
  `entry_events[]` fact array plus an `entry` view the checker recomputes, rendered apart from the sequential stage
  elapsed. Measurement only: no verdict, exit, route, reuse or commit reads any of it.
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (cost-ledger.md), dev apparatus (guides, measurement report)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- base: `origin/main` 6aa4f59492a7ad4108abd91e65e426b768081afc (SKILLS_VERSION 6.47.0). The prompt's "last reviewed main"
  `c441b09` (6.46.1) is one commit behind; `6aa4f59` (#320, installed-skill selection) touches none of the files below.

## Discovery — the gap, confirmed on live state

- `entry-gates.mjs` writes `runner.json`, `progress.json`, `result.json`, `gates/stamp.json` and `runner.log` under
  `.pharn/pharn-entry/`. **None carries a timestamp of when the runner started or finished, or how long a `--wait` call
  took.** The stamp has per-gate run data but no wall placement of the runner process, and the next `--start` in the tree
  `rmSync`s the whole root (`entry-gates.mjs:363`). The `--wait` document (`DOC_SCHEMA`) has no timing.
- No marker is written for the entry runner (by design, it overlaps spec/plan/grill). `stage-executions-core.mjs` pairs
  only `stage-start` → next `orchestrator`, so the entry work is in no row, and the foreground `--wait` call lies in the
  gap between `/pharn-grill`'s return and `/pharn-test`'s start, in no row either.
- `cost.json` (`render-cost-ledger.mjs`) has no entry key. `check-cost-ledger.mjs` RULE 1 admits exactly two `/2` key
  sets (pre-6.35.0 and current). `render-run-report.mjs` copies `elapsedLines` / `workLines` only.
- **Run binding is available and precise:** in both orchestrators the `run-start` marker is written before
  `entry-gates --start` (`pharn-loop.md` Step 1a item 5, then item 6; `pharn-ship.md` Step 1, then Step 2 item 1). So
  `--start` can read the feature's `markers.jsonl` and record the current run-start's `(seq, ts)`. That is the ledger's
  own definition of the current run (`run-window-core.mjs currentRunMarkers`) and is fixed when entry starts. The nonce
  already identifies one logical entry invocation through runner, takeover, wait and abort.
- **The precedent to follow, not rebuild:** 6.35.0 added `work[]` (facts appended by the stage at the act,
  `stage-work.mjs`) + `executions` (a view, `stage-executions-core.mjs`) as two closed `/2` keys, recomputed by RULE 9.
  This increment takes the same shape one step further. It adds no marker, no marker field and no change to the line
  `mark-phase.mjs` prints.
- Not already addressed: `git grep entry-gates-ledger-row` finds only the follow-up's naming
  (`.dev/features/loop-entry-preflight/PLAN.md:202`, `CHANGELOG [6.42.0]`).

## Measurement definitions (the quantities are kept apart, and none is derived from another)

| Quantity                      | Source (fact)                                                  | Clock                                              | Recorded as                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `--start` call duration       | `start` event                                                  | monotonic, one process                             | `start_elapsed_ms`                                                                                                            |
| Entry invocation lifetime     | `start.ts` → the producer-recorded terminal event's `ts`       | wall clock, two processes (placement)              | `lifetime {status, end_by, end_ts, elapsed_ms}`; `elapsed_ms` null unless measured                                            |
| Entry execution segment       | `segment-begin` + `segment-end` of ONE runner/takeover process | duration monotonic in that process; placement wall | `segments[] {kind, begin_ts, end_ts, elapsed_ms, status, end, gates}`                                                         |
| Foreground wait-call duration | one `wait` event per `--wait` call                             | monotonic, one process                             | `waits[] {ts, end_ts, elapsed_ms, status, takeover}`. A takeover's segment lies INSIDE its wait call and is never added to it |
| Ledger window                 | existing `run-start` → `run-stop` markers                      | wall clock                                         | already in `cost.json`; the table labels it "run-stop is written before the ledger, the report and the closeout"              |
| Whole command duration        | not recorded by PHARN                                          | needs an external boundary                         | procedure only (measurement report)                                                                                           |

- **Terminal event (the lifetime's end), producer-recorded only:** a `segment-end` whose `end` ∈ {`done`, `refused`,
  `crashed`} (that process wrote `result.json` just before); an `abort` with `wrote_result: true`; a `start` whose
  `outcome` ≠ `started` (no runner ever existed). A `wait` event is an **observation**, never a terminal: its `end_ts` is
  when the call noticed a result, not when the runner finished.
- **Lifetime status:** `measured` (exactly one terminal at or before the cutoff, end ≥ start); `incomplete` (no terminal at
  or before the cutoff, so `elapsed_ms` null, never the time "so far"); `unmeasured` with a closed reason
  (`clock-went-back`, `multiple-terminal-events`, `conflicting-records`).
- **Segment status:** `complete` (begin + end); `incomplete` (begin, no end at or before the cutoff: killed, interrupted,
  or still running); `end-only` (an end with no begin: its monotonic `elapsed_ms` is reported, it has no placement and is
  left out of every union); `conflicting`. A missing begin never means no work ran; a missing end never says when work
  ended.
- **Aggregates, all wall-clock interval UNIONS, never sums:** `segments_union_ms` (the invocation's complete segments);
  `waits_union_ms` (its wait calls); `segments_overlap_marked_stages_ms` = |union(complete segments) ∩ union(measured
  `executions` rows)|, both named in the field. It says where the runner's observed execution fell on the wall clock
  relative to PHARN's marked stages. It is **not** proof that both were active at once, not model time and not a saving.
  No field subtracts one quantity from another.
- **Known zero vs unknown vs absent:** a `no-gates` start is a measured lifetime with `segments: []` (known zero). An
  invocation whose end is past the cutoff is `incomplete` (unknown). An unknown run window gives `status: "unknown"` (no
  rows, "not a zero"). A ledger with no entry keys (written before this release) renders "not recorded". A run whose
  current-run facts hold no `start` renders "no entry invocation recorded in this run": it skipped `--start`, or its
  start record was not written, and nothing tells the two apart.

## Identity, binding, duplicates, cutoff

- **Invocation** = the `nonce` (`--start` already creates 32 hex). **Segment** = a fresh 16-hex id per runner/takeover
  process, shared by its begin and end. **Wait call** = a fresh 16-hex id per `--wait` invocation. Each event's identity
  key is `(nonce, event, segment|call|-)`.
- **Run binding:** only the `start` event carries `run: {seq, ts}` (the latest run-start in `markers.jsonl` read at
  `--start`, or `null` when none). Every other event binds through its nonce. An invocation is in a ledger only when its
  `start.run` equals the ledger's current run-start `(seq, ts)` from the ledger's own `markers[]`. An event whose nonce
  has no such start is **unbound** and is counted (`unbound_events`), never attached. No feature-name-only, PID, session
  or proximity binding is used.
- **Duplicates:** an exact duplicate line (same canonical JSON) is dropped at emission, and the checker REDs any left in
  the file. Two events with one identity key but different content are kept as facts. The view marks that
  item `conflicting` and its invocation's lifetime `unmeasured conflicting-records`. It is counted (`conflicting_events`)
  and never resolved by picking one.
- **Cutoff (admission):** an event is a fact only when it is a run-window member, `run-window-core.mjs isMember`, the
  same test `requests[]` and `work[]` pass. So under a **bounded** window (the closeouts emit after `run-stop`) the
  cutoff is the `run-stop` marker. An event written later stays out, and a segment whose end lands after it stays
  `incomplete` (L58: the source keeps growing after emission; the fixed part is what the window admits). An open window
  admits what exists at emission. An unknown window admits nothing. Emission never waits for the runner. Re-emission
  follows the window exactly as `work[]` does.
- **Persistence:** `.pharn/cost/<name>/entry.jsonl`, beside `markers.jsonl` and `work.jsonl`. It is never wiped by
  `--start` (which wipes only `.pharn/pharn-entry/`), so consecutive invocations for one feature keep their history and
  bind apart by run-start. One `O_APPEND` write per line, each line one `write(2)`. Concurrent runner/`--wait`/`--abort`
  appends do not lock and never wait on each other. A torn or invalid line is skipped on read and listed in `dropped[]` as
  `entry.jsonl[<n>]`. `.pharn/` is already outside the fingerprint and the reconciled set: no new exclusion, no write
  scope change.

## Write path (best-effort, at existing boundaries only)

- `--start`: one `start` line at its end, for outcome `started` | `no-gates` | `init-refused` | `spawn-failed`. A refusal
  before the nonce exists (`usage-error`, `path-containment`, `runner-unverifiable`) creates no invocation and writes
  nothing. That is stated, not counted.
- `--runner`: `segment-begin` first, `segment-end` after `result.json` is written (result first: the control record never
  waits on telemetry). A runner killed between them leaves an `incomplete` segment, which is reported honestly.
- `--wait`: one `wait` line after the document is printed, with status from the existing exit code. A takeover writes
  its own `segment-begin`/`segment-end` around `drainEntry` (end `budget` when the budget stops it). A `--wait` that never
  read a valid runner record has no nonce and writes nothing.
- `--abort`: one `abort` line when a runner record for this feature was read (`stopped`, `wrote_result`).
- Every write goes through one total function that never throws, never touches stdout, and on failure prints one
  `note —` line on stderr (the runner's stderr is `runner.log`). No retry, no extra subprocess, no poll, no lock. Exit
  codes and stdout documents are unchanged byte for byte (tested).

## Files

- `pharn/floor/entry-observations.mjs` — NEW. The ONE owner of `pharn-entry-observation/1`: event kinds (closed),
  `validateEntryEvent`, `recordEntryEvent` (best-effort append), `readEntryEvents`, `currentRunStart` (reads
  `markers.jsonl`), and the pure view `buildEntryView(markers, events, executions)` + `ENTRY_VIEW_METHOD`
  (`entry-observations/1`) — imported by the emitter, the checker and the renderers, never copied (L35). — layer product
  floor
- `pharn/floor/entry-observations.test.mjs` — NEW. Validation closure, every view status and reason, arithmetic under
  fixed timestamps, unions/overlap, duplicates/conflicts/unbound/late, torn lines, symlink/FIFO refusal. — test
- `pharn/floor/stage-work.mjs` — extract its lstat-walk + `O_NOFOLLOW|O_NONBLOCK` append and bounded line reader into
  exported `appendJsonLine` / `readJsonLines` so the entry file reuses the same safe I/O; `appendWork`/`readWork` behave
  identically. — layer product floor
- `pharn/floor/entry-gates.mjs` — the write calls at the four boundaries; `--start` reads the current run-start. No
  change to discovery, ordering, timeout, budget, verdict, takeover, abort or signalling logic. — layer product floor
- `pharn/floor/entry-gates.test.mjs` — real-process lifecycle: finish-before-wait, still-running wait, continue + second
  wait, takeover, red, no-gates, init refusal, abort, supersession (consecutive invocations), unbound (no run-start),
  telemetry write failure (planted directory/symlink at `entry.jsonl`) leaves exits and stdout unchanged. — test
- `pharn/floor/render-cost-ledger.mjs` — emit `entry_events` + `entry` (new `ENTRY_KEYS`, `TOP_LEVEL_KEYS_PRE_ENTRY`
  derived), `entry_events` a ROW_ARRAY, `entry.invocations` a nested row array, `entryLines` + a ledger-window line in
  `table()`. — layer product floor
- `pharn/floor/render-cost-ledger.test.mjs` — the emitter writes the keys; the same request fixtures keep identical
  `requests`, `totals`, `by_model`, `by_stage_iteration_model`, `unattributed`, `membership`, `markers`, `executions`
  and `work` with and without an entry file (regression); table renders measured / incomplete / unknown / none /
  not-recorded distinctly. — test
- `pharn/floor/check-cost-ledger.mjs` — RULE 1 admits exactly three `/2` key sets (pre-6.35.0, 6.35.0–6.47.x, current);
  RULE 10: each `entry_events[]` row valid + window member, no exact duplicates, `entry` == recompute. RULE 9 and
  `--verify-transcript` unchanged. — layer product floor
- `pharn/floor/check-cost-ledger.test.mjs` — the three key sets GREEN, one entry key without the other RED, an edited
  view/elapsed/union RED, a non-member/invalid/duplicate fact RED, historical fixtures still GREEN. — test
- `pharn/floor/render-run-report.mjs` — an entry block beside the elapsed/work blocks, copied from the stored view,
  shape-checked, "not recorded" for an older ledger. — layer product floor
- `pharn/floor/render-run-report.test.mjs` — the block, and the older-ledger line. — test
- `pharn/pharn-contracts/cost-ledger.md` — new section "Entry gate observations (6.48.0)"; the object listing and the
  compatibility lines for the third key set. — layer pharn-contracts
- `.dev/guides/floor-gates.md` — the `entry-gates.mjs` section names the observation file. — apparatus
- `.dev/guides/floor-orchestration.md` — the cost-ledger section names the two keys and RULE 10. — apparatus
- `.dev/measurements/entry-gates-ledger-row-2026-10-06.md` — NEW. The compact evidence report: sources labelled
  (controlled fixture / static estimate / observed real run as diagnostic history only), measured append overhead,
  limitations, and the matched-comparison procedure for later PR 1 / PR 2 runs. — apparatus
- `SKILLS_VERSION` — 6.47.0 → 6.48.0 (minor: a newly shipped ledger capability). — repo meta
- `README.md` — the version badge. — repo meta
- `CHANGELOG.md` — `## [6.48.0]` section. — repo meta
- `docs/capabilities/**` — regenerated by `npm run docs:generate` if the catalog lists floor modules. — generated
- `.dev/features/entry-gates-ledger-row/PLAN.md`, `GRILL.md`, `BUILD.md`, `REGRESSION.md`, `regression-report.json`,
  `VERIFY.md`, `verify-report.json`, `REVIEW.md`, `SHIP.md` — this increment's stage artifacts. — apparatus

### Not touched (and why)

- No `.claude/commands/*` file: no pinned line is added or changed, so the command budget and the closeouts' order are
  unchanged. `MIN_CLI` stays: no installed path moves and no frontmatter changes.
- `mark-phase.mjs`, `run-window-core.mjs`, `stage-executions-core.mjs`, `transcript-core.mjs`, `closeout-core.mjs`:
  unchanged. Marker bytes, membership, attribution and execution pairing cannot move.
- The four trusted docs. If `LIMITS.md` turns out to state something this makes stale, the text goes to a
  `PROTECTED-FOLLOWUPS.md` for a human, not edited.

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md`: "record facts, derive views" (facts `entry_events[]`, view `entry`), the closed
  key set rule, the compatibility section's precedent of admitting exactly the listed `/2` key sets (6.35.0). Cited, not
  restated.

## Evals to write (P1)

- No `role:` capability is added; the floor modules carry `node --test` suites (above), which is this repo's eval form for
  floor code. `validate.mjs` must stay GREEN.

## Guarantee audit (P0)

- "An event line in `cost.json` is well-formed, a run-window member, and not an exact duplicate" → floor: enum-regex (RULE
  10, closed keys + `isMember`).
- "`entry` is the function of the file's own `markers[]`, `work[]` and `entry_events[]`" → floor: enum-regex + arithmetic
  recompute (RULE 10).
- "An invocation is attributed to this run only by its recorded run-start `(seq, ts)`" → floor (view code, tested).
- "The events describe what really ran / were not edited" → **advisory**. `.pharn/` is Bash-reachable, and a
  self-consistent fabricated file passes (L43, stated in the contract).
- "Instrumentation never changes a verdict, exit or stdout" → floor for the tested paths (byte-equal stdout + exit tests
  with the write forced to fail); not a proof over every input.
- "Monotonic durations": `performance.now()` within one process → floor that the code does it; what the interval contains
  (scheduling, I/O, a takeover inside a wait) is advisory and stated.
- "Overhead is small" → measured, reported with its machine and method; never "zero".

## Trust audit (P2)

- `entry.jsonl` is untrusted runtime state. Every line goes through `validateEntryEvent` (closed keys, enums, bounded
  identity tokens, ISO timestamps, integer ranges) before use. It is read with `O_NOFOLLOW|O_NONBLOCK`, a size cap and an
  lstat walk (L54/L59), and a refusal reason never quotes a raw value (L62). No gate output, argv, env or prompt is
  written into an event. The only strings are enums, hex ids, ISO timestamps and an identity-token session id.
- Rendered text is fixed prose around enum tokens, integers and timestamps, so there is no free text to fence.

## Determinism audit (P5)

- Every branch is a membership test (event kind, status enums, identity-key equality, `isMember`) or an integer compare.
  There is no inference: an ambiguous case gets a named `unmeasured` / `conflicting` / `incomplete` status, never a
  guessed value.

## Applied lessons

- L35 — one owner: schema, validation, append, read and view live in `entry-observations.mjs`; the emitter, checker and
  report import it. The safe append is extracted from `stage-work.mjs` rather than copied.
- L36 — closure, not presence: RULE 1 admits exactly three `/2` key sets and a half-present pair is held to the current
  set; event kinds, statuses and reasons are closed enums with closure tests over every emitter.
- L42 — capture at the moment of the act: each process appends its own event when it starts/ends. Nothing is
  reconstructed from `.pharn/pharn-entry/` at emission, which the next `--start` wipes.
- L43 — the checker certifies agreement of the file's facts and view, never that the events are true; the contract and
  the report say so.
- L54 — the append and the read use lstat + `O_NOFOLLOW|O_NONBLOCK` (reused from `stage-work.mjs`); a planted symlink or
  FIFO at `entry.jsonl` is refused and tested.
- L58 — the source keeps growing after emission. Admission is fixed by the recorded window (`run-stop`), a late end stays
  out, and the checker recomputes only from the ledger's own facts, never the live file.
- L62 — every refusal reason is built from fixed text and counts, never a quoted value. The `shown()` already in use stays
  total.
- L63 — the derivation of existing values is untouched. The plan enumerates the existing re-derivations (`RULE 9`,
  `--verify-transcript`, `render-run-report`) and leaves each one's inputs unchanged; regression tests pin it.
- L66 — binding is by nonce + recorded run-start, never by a file's presence or the feature name; a stale file from an
  earlier invocation binds to that invocation's run, not this one.

## Follow-ups (named, not built — P7)

- `entry-observation-whole-command`: an external command-boundary timer (harness-level), if a matched comparison needs it.
- Anything about using the timing to change behaviour (entry-to-BASE reuse is already `entry-run-as-base-evidence`).

## Open questions (HALT)

- None blocking. Design choices to confirm at GATE 1: (a) one new module rather than a separate pure core (the
  `stage-work.mjs` precedent); (b) `segments_overlap_marked_stages_ms` is included as the one overlap figure, against
  measured `executions` rows only.
