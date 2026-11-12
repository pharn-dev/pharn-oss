# PLAN — gate-durations

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L35, L36, L60, L62, L63, L84]
- increment: record each gate process's monotonic wall time as `duration_ms` in the gate-run stamp, carry the per-gate
  durations into the cost ledger's work rows (a new `pharn-stage-work/2`, `/1` still admitted) and, for the entry
  gates, into a new `gate` entry observation, and retire the `gate-process-duration` residual.
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (`gate-run-record.md`, `cost-ledger.md`)
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## The failure (P7)

Linear CORE-75, rated **go** by `.dev/measurements/loop-baseline-2026-11-11.md` (sections 6, 7, 12, 13): 16 of 36
measured `/pharn-loop` runs stopped at the entry check and 6 more were `STOP_TERMINAL` on an unmeasured `test`; entry
runners lived a median 15.7 min (4.0–34.9). "Per-gate time: not in the ledgers. No record holds a single gate's
wall-clock" (section 6), and section 7 could not say whether 7.5.0's peek would have caught a red earlier "because no
per-gate time is recorded". CORE-77, CORE-86, CORE-87 and CORE-89 wait on these figures. The residual
`gate-process-duration` has been named in `pharn/pharn-contracts/cost-ledger.md` since 6.35.0 ("No gate process is
timed", "No per-gate duration is measured", "Per-gate durations are not measured"). The missing figure is itself the
measured gap; this increment does not depend on a new baseline.

## Live state read this run (P6)

`origin/main` = `61deb6b1`, `SKILLS_VERSION` 7.10.3, `MIN_CLI` 0.14.0. The ticket's line numbers (7.7.1) re-located:

- `pharn/floor/run-gates.mjs` `runNext` builds the run record at `:1274-1292` (`seq, id, exit, ran, timed_out, mutated,
reason, argv, shell, files, fp_before, fp_after, stdout_sha256, stderr_sha256, results_sha256` + `identity_sha256`).
  `spawnGate` (`:981-1127`) starts the kill timer with `setTimeout(…, timeoutMs)` at `:1110-1125`. `run --next` prints
  `{ok, ran, exit, timed_out, remaining, finalized, …}` (`:1338`, `:1342`); no test deep-equals that document.
- `pharn/floor/gate-run-core.mjs` `validateStamp` (`:1019-1150`) checks named fields only; `results_sha256` (6.15.0) and
  `identity_sha256` (6.34.0) are the two "OPTIONAL and additive" precedents, so the schema stays `gate-run-record/1`.
- Reused runs are built field by field, never spread from a source run: `gate-reuse-core.mjs reusedRunRecord`
  (`:197-216`) and `entry-base-evidence-core.mjs derivedBaseStamp` (`:312-350`). So neither can inherit a source's
  `duration_ms`.
- `executionIdentity` (`gate-reuse-core.mjs:125-148`) hashes inputs computed BEFORE the spawn. `evidenceRequirement`
  (`regress-base-reuse-core.mjs:159-176`) projects each run through `specPart` to `{id, shell, argv, files}` (`:127-135`).
  Neither can see a duration; both get a test anyway (AC-3).
- `pharn/floor/stage-work.mjs` owns `pharn-stage-work/1`: closed keys (`SIDE_KEYS`, `BASE_KEYS`, `REGRESS_KEYS`,
  `VERIFY_KEYS`), `countRuns` over the stamp the verdict used, `install.ms` the one timer today (`performance.now()`).
  Readers of the record all go through `validateWork`: `check-cost-ledger.mjs` RULE 9, `render-cost-ledger.mjs`,
  `render-run-report.mjs`, `stage-executions-core.mjs`. `stage-regress.mjs` / `stage-verify.mjs` call `regressWork` /
  `verifyWork` with the stamps, so they need no change.
- `pharn/floor/entry-observations.mjs` owns `pharn-entry-observation/1`: closed keys per event, `EVENT_KINDS` closed,
  identity `(nonce, event, segment|call)`, view `entry-observations/1` built by `buildEntryView`, recomputed by
  `check-cost-ledger.mjs` RULE 10. `entry-gates.mjs drainEntry` (`:597-627`) spawns one `run-gates.mjs run --next` per
  gate and parses its stdout; the runner and the takeover each own a segment id.
- `.dev/guides/versioning.md`: `MIN_CLI` moves only when an older CLI would install a broken tree. The CLI reads
  neither `work.jsonl` nor `entry.jsonl` nor stamps; the writer and every reader ship together. **No `MIN_CLI` change.**
- Trusted docs: `grep` over the four for `gate-process-duration`, `per-gate`, `duration`, `wall-clock`, `timed`,
  `stage-work`, `work.jsonl`, `entry.jsonl`, `elapsed` finds one hit, `LIMITS.md:251` (a bytes/4 token estimate of a
  measurement file), unrelated. **No trusted-doc sentence goes stale; none is edited.**
- Lessons index freshness gate: `check-lessons-index.mjs` exit 0 (GREEN); the two-step sweep ran.

## What is built

### 1. The stamp field — `run-gates.mjs`, `gate-run-core.mjs`

- `spawnGate` takes `t0 = performance.now()` immediately before `spawn()` and returns `duration_ms =
Math.floor(performance.now() - t0)` in every result it settles with (close, or a spawn `error` such as ENOENT 127).
  One monotonic interval in the runner process: spawn to the child's `close`.
- **Kill-timer guard (needed for AC-4).** Node's timers keep integer-millisecond loop time, so a `setTimeout(…, T)` can
  fire when less than T real milliseconds have passed since `t0` (truncation of the start time). When the kill timer
  fires with `performance.now() - t0 < timeoutMs`, it re-arms for the remaining `Math.ceil` milliseconds instead of
  killing. So SIGTERM is sent at or after `t0 + timeoutMs`, the child closes after that, and a timed-out run's
  `duration_ms >= timeoutMs` holds by construction. The kill moves later by at most about 1 ms, never earlier; nothing
  else about the timeout changes (the stale-lock budget, the grace kill, the identity's `timeout_ms`).
- `runNext` writes `duration_ms` on a run it spawned, and on no other: a `no-files` run and a reused run carry none.
  `run --next`'s stdout document gains `duration_ms` (the integer, or `null` when nothing was spawned), which the entry
  drain reads (section 3).
- `validateStamp`: `duration_ms` is OPTIONAL and additive (stamps from before still validate). When present it must be
  a safe integer `>= 0` on a run with `ran: true`; a `ran: false` run carrying the key — `no-files` or reused — is
  `stamp-malformed`. Fixed-text refusals; the value is never quoted (L62). Schema stays `gate-run-record/1`.
- The stamp is the record of truth for the value. The work row and the entry event below are copies taken at the
  moment of the act, because the stamp does not survive (L35 applied, see below).

### 2. Work rows — `stage-work.mjs` (`pharn-stage-work/2`)

- The emitter writes `/2` only. `/2` = `/1` plus one key on every side object (`head`, `base`, `gates`):
  `durations`, an array with exactly `executed` entries, in run order, each `{seq, id, duration_ms}` for a stamp run
  with `ran: true`. `seq` is the stamp's integer; `id` the stamp id when it is an identity token
  (`cost-value-core.mjs isIdentityToken`: no control character, at most 128 chars, no absolute path — the ledger's
  RULE 3 path walk would RED otherwise), else `null`; `duration_ms` the stamp's integer, else `null` (a stamp without
  the field — unknown is never zero).
- A BASE that was `reused` or `entry` has `executed: 0`, so `durations: []`: those processes ran in an earlier
  execution or in the entry check, and their time is not this execution's work.
- `validateWork` admits EXACTLY two shapes, by `schema`: `/1` with its current closed key sets, and `/2` with
  `durations` on every side, whose length equals `executed`, each entry exactly `{seq, id, duration_ms}` (seq a
  non-negative safe integer, unique and increasing; id an identity token or null; duration_ms a token count or null).
  `work.jsonl` is never pruned, so every reader keeps admitting `/1` lines. TOTAL over parsed JSON (L62).
- `cost.json`'s `work[]` therefore carries per-gate milliseconds for every regress and verify iteration that reached
  `done`. No reader of the record changes (they all call `validateWork`).

### 3. Entry gates — `entry-observations.mjs`, `entry-gates.mjs`

- A sixth event kind, `gate`, under the same `pharn-entry-observation/1` schema (no existing event's shape or meaning
  changes): keys exactly `schema, event, nonce, segment, id, ts, duration_ms, session_id`. `segment` is the runner's or
  takeover's 16-hex id, `id` an identity token, `ts` when it was written, `duration_ms` a token count
  `<= MAX_ELAPSED_MS`. Identity key `(nonce, gate, id)`: a gate id runs once per invocation (an interrupted gate
  records nothing and re-runs, so only the run that completed writes).
- `drainEntry` takes the segment id from its caller and, after each `run --next` that ran a gate and printed an
  integer `duration_ms`, writes one `gate` event through the existing best-effort `observe` (never throws, never
  writes to stdout). A runner killed mid-run still leaves the finished gates' durations: that is what separates a slow
  suite from a hung one.
- **The `entry` view is unchanged, method `entry-observations/1`.** `buildEntryView` drops `gate` events before it
  groups anything, so every existing ledger's view recomputes byte-identically and no view rule changes. The facts sit
  in `cost.json`'s `entry_events[]`, admitted by the window and checked by RULE 10 (shape, admission, no exact
  duplicate) exactly as every other event. (Open question Q2.)

### 4. Contracts

- `pharn/pharn-contracts/gate-run-record.md`: the `duration_ms` field (what it measures and does not, `ran: true` only,
  the refusal, outside the execution identity and the BASE requirement, read by no verdict, reuse decision or route).
- `pharn/pharn-contracts/cost-ledger.md`: `work[]` under `/2` with `/1` admitted; the `gate` entry event; the three
  sentences that name the residual are replaced, and `gate-process-duration` is recorded as retired. What the number
  is stays labelled: OBSERVED, monotonic within one runner process, includes process start-up and teardown, not CPU
  time, and under load it measures the machine as much as the suite.

### 5. Version and docs

`SKILLS_VERSION` 7.10.3 → **7.11.0** (minor: a newly shipped capability, a recorded measurement). `CHANGELOG.md` gets a
`## [7.11.0] - 2026-11-12` section; the README badge follows (`check:badge`). `MIN_CLI` unchanged. Two apparatus guide
sections that would go stale are updated (`floor-gates.md` run-gates block; `floor-orchestration.md` cost-ledger block,
"the install's exit and ms (the ONE new timer)"). `npm run docs:generate` is run; no generated region is expected to
change (no capability, command or checker file is added). Version strings stay out of code comments and test names.

## Applied lessons

- L35 — the duration is stored in the stamp and copied into the work row and the entry event. The second copy must
  exist (the stamp is cleared at each stage's fresh start and the entry scratch is wiped by the next `--start`), so it is
  a capture at the moment of the act, derived by the one owner from the stamp the verdict used, never a sync check.
- L36 — `validateWork` admits two CLOSED shapes by schema, each by exact key set, not a presence check; the
  "no reader" test is a CLOSURE over every non-test `pharn/floor/*.mjs` that mentions `duration_ms`, required to be a
  member of the five writer/validator files.
- L60 — the parity test carries a negative control per asserted property: the perturbed stamps really differ (bytes and
  sha256), and perturbing `exit` instead of `duration_ms` does change the verdict output, so each comparison can fail.
- L62 — every new check (`validateStamp`, `validateWork`, `validateEntryEvent`) is total over parsed JSON, type-tests
  before reading, and quotes no value; a test feeds `{"toString":1}` in each new field.
- L63 — the new field changes how a stamp's BYTES are derived, so every re-derivation over a run record is enumerated
  and pinned: `executionIdentity`, `evidenceRequirement`/`requirementSha256`, `findReusable`/`reusedRunRecord`,
  `derivedBaseStamp`/`decideEntryBase`, `entryVerdict`, `countRuns`, `check-verify --stamp`, `check-regress verdict`.
  Stamp sha256 bindings (reuse offers, loop freshness) bind the bytes recorded at init, so a new field changes no
  comparison.
- L84 — each new copy gets a test on realistic input that takes the branch: a real `run-gates.mjs` run whose stamp
  shows `duration_ms` on every spawned run, a real `stage-verify.mjs` run whose `work.jsonl` line carries `durations`,
  and a real entry runner whose `entry.jsonl` carries one `gate` event per gate.

## Files

- `pharn/floor/run-gates.mjs` — monotonic interval around the spawn, `duration_ms` on spawned runs and in `run --next`
  stdout, kill-timer guard — product floor
- `pharn/floor/gate-run-core.mjs` — `validateStamp` shape check for `duration_ms` — product floor
- `pharn/floor/stage-work.mjs` — `pharn-stage-work/2` with per-side `durations`; `/1` still admitted — product floor
- `pharn/floor/entry-observations.mjs` — the `gate` event kind; the view drops it — product floor
- `pharn/floor/entry-gates.mjs` — one `gate` event per gate the drain ran — product floor
- `pharn/pharn-contracts/gate-run-record.md` — the `duration_ms` field — pharn-contracts
- `pharn/pharn-contracts/cost-ledger.md` — work `/2`, the `gate` event, the residual retired — pharn-contracts
- `pharn/floor/gate-durations.test.mjs` — NEW: the no-reader parity test (verdicts, reuse, identity, requirement) and the
  closure scan — test
- `pharn/floor/run-gates.test.mjs` — AC-1 and AC-4 on real runs; stdout `duration_ms` — test
- `pharn/floor/gate-run-core.test.mjs` — AC-1 refusals, AC-2 over the existing fixtures — test
- `pharn/floor/gate-reuse-core.test.mjs` — a reused record never carries `duration_ms` — test
- `pharn/floor/stage-work.test.mjs` — `/2` derivation and validation, `/1` still admitted — test
- `pharn/floor/stage-verify.test.mjs` — a real verify run's work line carries `durations` — test
- `pharn/floor/stage-regress.test.mjs` — a real regress run's work line carries `durations` — test
- `pharn/floor/entry-base-evidence.test.mjs` — its work-record assertions, if they pin the `/1` shape — test
- `pharn/floor/entry-observations.test.mjs` — the `gate` event, its identity, the view unchanged — test
- `pharn/floor/entry-gates.test.mjs` — a real runner writes one `gate` event per gate — test
- `pharn/floor/check-cost-ledger.test.mjs` — RULE 9 admits `/1` and `/2` rows together; RULE 10 admits `gate` events — test
- `pharn/floor/render-cost-ledger.test.mjs` — the emitted ledger carries `/2` rows and `gate` facts — test
- `pharn/floor/render-run-report.test.mjs` — its work-record fixture, if it pins the `/1` shape — test
- `SKILLS_VERSION` — 7.11.0 — repo meta
- `CHANGELOG.md` — the 7.11.0 entry — repo meta
- `README.md` — the version badge — repo meta
- `.dev/guides/floor-gates.md` — the run-gates block names `duration_ms` — apparatus
- `.dev/guides/floor-orchestration.md` — the cost-ledger block names work `/2` and the `gate` event — apparatus

### Not written (named so the scope is explicit)

- `MIN_CLI`, the four trusted docs, `pharn-loop.md`, `command-hygiene.test.mjs`, `stage-regress.mjs`,
  `stage-verify.mjs`, every renderer (`render-cost-ledger.mjs`, `render-run-report.mjs`), `build-gate.mjs`.

## Acceptance criteria → how each is met and tested

1. **Every `ran: true` run carries an integer `duration_ms >= 0`; a `no-files` or reused run carries none; one that does
   is `stamp-malformed`.** Met by section 1. Tested: `run-gates.test.mjs` — a real verify and a real regress run (with a
   `no-files` `test` entry) and a real reuse HIT: every spawned run has a safe integer `>= 0`, the `no-files` and reused
   runs have no key; `gate-run-core.test.mjs` — `duration_ms` added to a `no-files` run, to a reused verify run and to an
   entry-derived BASE run is `stamp-malformed`; `-1`, `1.5`, `"5"`, `null`, `{"toString":1}` on a `ran: true` run are
   refused.
2. **A stamp written before this change still validates, over the existing fixture set.** Tested in
   `gate-run-core.test.mjs`: every fixture builder the suite already uses (`goodStamp`, `reusedStamp`, `excludedStamp`,
   the entry-derived BASE fixture) is asserted to carry no `duration_ms` and to validate; the existing suites of
   `check-verify`, `check-regress`, `gate-reuse-core`, `entry-base-evidence-core` and `loop-fresh-core` stay green
   unchanged.
3. **`identity_sha256` and `requirement_sha256` byte-identical with and without the field.** Tested in
   `gate-durations.test.mjs`: `requirementSha256(evidenceRequirement(stamp, record))` equal with the field absent, `0`
   and `9999999`; and over a REAL stamp from `run-gates.mjs`, `executionIdentity` recomputed from each run's recorded
   inputs equals its `identity_sha256` both before and after `duration_ms` is stripped.
4. **A gate killed at `--timeout-ms` records a duration of at least that timeout.** Met by the kill-timer guard. Tested
   in `run-gates.test.mjs`: a `--gates` shell gate that sleeps 30 s under `--timeout-ms 300` records `timed_out: true`
   and `duration_ms >= 300`.
5. **`cost.json` shows per-gate milliseconds for every iteration and for the entry gates; the checker admits old and new
   work rows.** Tested: `stage-work.test.mjs` (derivation per side, reused/entry BASE `[]`, a stamp without the field
   gives `null`); `stage-verify.test.mjs` / `stage-regress.test.mjs` (a real run's `work.jsonl` line);
   `entry-gates.test.mjs` (a real runner's `entry.jsonl` has one `gate` event per gate run, integer durations);
   `render-cost-ledger.test.mjs` (an emitted ledger carries both); `check-cost-ledger.test.mjs` (a ledger holding one
   `/1` and one `/2` work row plus `gate` events is GREEN, and an edited `durations` length is RED).
6. **No verdict, reuse decision or route reads the duration — a test pins this.** Structural, in
   `gate-durations.test.mjs`: for verify, regress head/base and entry fixture stamps, three variants (field absent, every
   spawned run `0`, every spawned run `9999999`) give byte-identical stdout and exit from the `check-verify.mjs --stamp`
   and `check-regress.mjs verdict` CLIs, identical `findReusable` decisions and `reusedRunRecord` output,
   `decideBaseReuse`, `decideEntryBase` and `derivedBaseStamp`, `entryVerdict`, and identical `identity_sha256` /
   `requirement_sha256`. Controls (L60): the three variants' bytes differ, and changing one `exit` changes the
   `check-verify` output. Complement: a closure scan over every non-test `pharn/floor/*.mjs` — only the five files of
   sections 1–3 may contain `duration_ms`; route modules (`stage-agent*.mjs`, `check-loop.mjs`) read no stamp.

## Contracts satisfied

- `gate-run-record.md` — an additive optional run field, as `results_sha256` and `identity_sha256` were; the record's
  floor claim (exits, coverage, order, tree continuity) is untouched.
- `cost-ledger.md` "record facts, derive views" — the durations are FACTS (`work[]`, `entry_events[]`); no new view, no
  view method change, no top-level key change, so the `/2` ledger key sets stay the three admitted today.

## Evals to write (P1)

No Capability is added or changed (no `role:` file), so no eval case is owed; the floor modules are covered by their
`*.test.mjs` suites as listed under Files.

## Guarantee audit (P0)

- "a stamp's `duration_ms` is a non-negative integer, present only on a `ran: true` run" → floor: enum-regex
  (`validateStamp`, integer and membership tests).
- "the duration is the gate's real wall time" → advisory: an OBSERVATION by the runner process (`performance.now()`),
  in unauthenticated `pharn/.run/` state a Bash write reaches (`pharn/LIMITS.md §6`); it includes process start-up and
  teardown and machine load. Labelled as such in both contracts.
- "a timed-out run's `duration_ms >= timeoutMs`" → floor by construction in the runner (a numeric compare re-arms the
  timer), pinned by a test; advisory as to what the clock measured.
- "no verdict, reuse decision or route reads the duration" → floor-tested parity over the named functions and CLIs, plus
  a closure scan of the source; it pins TODAY's readers, never a future one written without reading this (named bound).
- "a work row's `durations` has exactly `executed` well-shaped entries; `/1` and `/2` both admitted" → floor:
  enum-regex (`validateWork`, applied by the emitter and RULE 9).
- "a `gate` entry event is well-shaped and admitted by the window" → floor: enum-regex (`validateEntryEvent`,
  `isAdmitted`, RULE 10). That one was written for every gate is advisory (best-effort append).
- Retiring `gate-process-duration` claims only that a per-gate duration is now RECORDED — never that it is accurate,
  complete (a killed stage writes no work row; a killed entry process loses the event of the gate it was running) or
  authenticated.

## Trust audit (P2)

No new untrusted input. `duration_ms` is an integer the runner computes; gate output stays reduced to a sha256. The
gate `id` copied into the ledger is a stamp id (a discovered allowlist name, `base:test`, `reconcile`, a
`structural:<relative path>`, or an explicit `--gates` id), gated by `isIdentityToken` before it enters `cost.json`, so
no control character and no absolute path reaches the file; an id that fails is written as `null`.

## Determinism audit (P5)

No branch reads a duration. The only new branches: the kill-timer re-arm (a numeric compare of two monotonic readings)
and the validators' membership and integer tests.

## Resolved questions (GATE 1)

GATE 1 was decided on 2026-11-12 by the orchestrating model under the maintainer's delegation (not a human
approval): the plan is approved as written, and each question takes the recommended answer.

- **Q1 — work-row shape.** Resolved: the per-side `durations: [{seq, id, duration_ms}]` list, its length equal to
  `executed`, `null` for an unknown `id` or `duration_ms`. (Rejected: one top-level `gate_ms` map.)
- **Q2 — entry view.** Resolved: facts only. `gate` events go in `entry_events[]`, the view drops them and stays
  `entry-observations/1`. The on-screen / RUN-REPORT display is a named follow-up. The PR's criteria checklist states
  that AC-5's entry part is met through `entry_events[]` in `cost.json`.
- **Q3 — entry event schema.** Resolved: `gate` is added under `pharn-entry-observation/1`. The contract says in one
  sentence that an older reader drops such a line into `dropped[]`.
- **Q4 — the kill-timer guard.** Resolved: included; the criterion keeps its wording (`duration_ms >= timeoutMs`).
