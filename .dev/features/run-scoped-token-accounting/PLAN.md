# PLAN — run-scoped-token-accounting

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L1, L34, L35, L41, L43, L44, L52]
- increment: Give the cost ledger an explicit RUN measurement boundary, so that requests from the same Claude Code session that fall outside the current PHARN run stop counting toward the run's totals. Missing boundary evidence becomes an explicit "unknown", never whole-session usage and never a manufactured zero.
- layer(s): pharn-contracts (`cost-ledger.md`), product floor (`pharn/floor/`), product commands (`.claude/commands/pharn-ship.md`, `pharn-loop.md`)
- constitution_refs: [P0, P1, P3, P4, P5, P6, P7]

## The defect (reproduced by reading live code at `81b5124`, 6.8.2)

`renderLedger()` (`pharn/floor/render-cost-ledger.mjs:476-531`) pushes **every** deduped usage-bearing
assistant record of the selected session into `requests[]`. Markers only feed `attribute()`
(`:331`), the stage VIEW. They never limit the population. `buildViews()` (`:572`) sums every row into
`totals`, so a request made before `run-start` lands in `totals` **and** in `unattributed`.
`check-cost-ledger.mjs` recomputes the views from the same rows and is GREEN.

Fixture shape (to be reproduced in a test and against the pre-fix module at build time):
1 request at 09:00 with 100 input tokens (unrelated). Then `run-start` at 10:00. Then 1 request at
10:05 with 10 input tokens. The ledger reports `totals.tokens.input = 110`, `unattributed.requests = 1`, and the checker returns GREEN.

**P7 trigger:** a real failure. The ledger's `coverage_note` calls the number "a floor on spend", but
that is false once unrelated earlier session usage is included. A long session that runs `/pharn-ship`
late reports the whole session's cost as the feature's.

## Answers to the six investigation questions (from live code this run)

1. **Where can a start boundary be recorded before spec work?** `/pharn-loop` already resolves `<name>`
   at S2 and marks `run-start` before `stage-start pharn-spec` (`pharn-loop.md:140`, `:195`), so the loop
   covers spec today. `/pharn-ship` cannot: `<name>` **is** the marker directory, and `/pharn-spec`
   resolves it (`pharn-ship.md:109-124`). The earliest point with a known identity is **ship's Step 1
   entry, keyed by session id**. That is where this plan records a _pending_ start (Design D1).
2. **Resume vs new invocation.** Resuming writes no marker. Both ship's post-GATE-1 continuation and the
   Step 3b continuation simply continue the chain. A **new invocation** always writes a fresh
   `run-start`. The loop's S2 gives it a new slug. A second `/pharn-ship` on the same name appends a second
   `run-start` to the same `markers.jsonl`, because `seq` continues (`mark-phase.mjs:120-133`). So "the
   latest `run-start` by `seq`" is the evidence that separates one invocation from the next. No new
   run identity is needed.
3. **Missing/malformed/ambiguous start** → run membership is **unknown**. The ledger then carries
   `coverage: unavailable` with an explicit `membership.status: unknown`. It never presents
   whole-session usage, and never a zero that reads as observed (D3).
4. **Is an end boundary necessary?** Yes. Both commands write `run-stop` before rendering
   (`pharn-loop.md:417`, `pharn-ship.md:611`), so without an end, a later re-render would absorb later
   unrelated session activity. `run-stop` is **not** assumed terminal. The window closes at the
   **latest** `run-stop` after the current `run-start`, so a re-emission within the same invocation
   extends the window instead of truncating it. A new invocation's `run-start` supersedes the old window
   entirely.
5. **Subagents.** Nested transcripts live under `<session>/subagents/*.jsonl`. Their records carry the
   **parent** `sessionId` (`fixtures/cost-ledger/with-subagents/…`, `isSidechain: true`). So the parent's
   window, keyed on the same session id and the record's own `timestamp`, applies to them unchanged.
6. **What does the contract promise?** `cost-ledger.md` promises that every aggregate is a pure function
   of `requests[]` (kept), a CLOSED top-level key set (so a new field forces a schema change), and
   `coverage ∈ {partial, unavailable}`. The checker REDs an empty `requests[]` unless coverage is
   `unavailable`. Downstream readers of the file: `check-cost-ledger.mjs`, `render-run-report.mjs`,
   `ship-outcome-core.mjs` (reads markers only, not totals), and the two commands' presentation steps.
   `git ls-files '*cost.json'` returns **0** here, but users' repos hold committed `/1` ledgers
   (`/pharn-loop` commits `cost.json` on STOP_GREEN).

## Design

### D1 — the early start boundary: a session-keyed PENDING run-start (ship only)

- `mark-phase.mjs --pending-start` (no `--name`) writes `.pharn/cost/.pending/<session>.json` =
  `{ts, session_id}`, keyed by `CLAUDE_CODE_SESSION_ID`, or by the literal `no-session` when it is unset.
  Later calls overwrite it.
- `mark-phase.mjs --name <n> --kind run-start` **adopts** a pending file for the SAME session if one
  exists. The written marker carries the pending `ts`, and the pending file is deleted. If no pending file
  exists, behaviour is byte-identical to today (`ts` = now).
- `/pharn-ship` Step 1 calls `--pending-start` as its **first** action, before `/pharn-spec`. The
  existing named `run-start` call stays where it is, so the wiring test's "exactly one run-start
  invocation" rule still holds.
- `/pharn-loop` is unchanged: its `run-start` already precedes spec.
- Spec requests after the pending ts are therefore **run members**. They have no stage marker, so they
  stay `unattributed`, which is an honest stage VIEW and no longer an out-of-run bucket.
- **Rejected alternatives:**
  - Filtering at today's named `run-start` would exclude spec work.
  - Having the agent copy a printed timestamp into a later flag would be model-transcribed, which is what
    the intent forbids.
  - Reconstructing the start from prose.
- **Bound:** a stale pending file from an abandoned invocation in the SAME session is adopted if the new
  invocation skips its own `--pending-start`. That widens the window. This is advisory marker discipline
  (L19), stated in the contract, the same class as every marker.

### D2 — the membership rule (`run-window/1`), ONE implementation shared by emitter and checker

A new pure module, `pharn/floor/run-window-core.mjs`. It is imported by the emitter and the checker, and
never copied (L35).

- **Current run** = the markers with `seq ≥` the LAST valid `run-start` (valid means kind `run-start` with
  an ISO `ts`).
- **End** = `ts` of the LAST `run-stop` in the current run, or `null`, which means the run is **open**.
- **Per-session opening:** a session's window opens at the EARLIEST current-run marker bound to that
  session. A marker with `session_id: null` binds every session, which matches `attribute()`'s existing
  wildcard.
  - This handles a GATE-1 resume in a NEW session: that session's unrelated pre-resume requests stay out.
    Its window opens at its first marker, `stage-start pharn-plan`.
- A request is a **member** iff `ts` is non-null, `opening(session) ≤ ts`, and (`end === null` or
  `ts ≤ end`). Both bounds are inclusive, the same at-or-before convention as `attribute()`.
- Everything else is **excluded**, including a `ts: null` row. Those rows used to be kept as unattributed.
- **Membership and attribution are separate calls.** `attribute()` is unchanged and runs only on members.
  A member with no preceding stage marker stays `unattributed` **and** counts in `totals`.
- `status ∈ {bounded, open, unknown}`:
  - `unknown`: no valid `run-start`, no markers file, or the selected session has no opening.
  - `open`: a start but no `run-stop`.
  - `bounded`: both.

### D3 — representation: `pharn-cost-ledger/2`, one new top-level key

- A new top-level key, `membership: {method: "run-window/1", status, start, end, excluded_requests}`.
  - `start` and `end` are the run-level `run-start` and `run-stop` ts.
  - `excluded_requests` is an INTEGER count of deduped session requests outside the window.
  - There are **no** excluded-token aggregates and no session ledger. The count is the minimum that
    explains an exclusion.
- `requests[]`, `totals` and all views are computed over **members only**, so one population is used
  everywhere. `window_start` and `window_end` keep their meaning (the records' own min/max ts) over members.
- `status: unknown` → `coverage: unavailable`, `requests: []`. The `coverage_note` names the missing
  evidence and never a path. `excluded_requests` = the number of session requests seen (not measured).
- `status: bounded|open` with zero member requests → `coverage: partial`, `requests: []`. This is an
  OBSERVED zero. The checker admits it **only** under those two statuses, which is the L34 split between
  asserted silence and silence.
- **Why a schema bump and not a correction within `/1`:** the closed key set forces it, and the MEANING of
  `totals` changes. A `/1` file's totals are session-scoped. Reading it as run-scoped would silently
  reinterpret historical data.
- **Compatibility:**
  - `check-cost-ledger.mjs` keeps validating `/1` files under the `/1` rules. It adds one WARN: `legacy
pharn-cost-ledger/1 — totals are SESSION-scoped and may include activity outside the run`.
  - `render-run-report.mjs` labels a `/1` ledger the same way.
  - No `/1` file is rewritten or retroactively REDed.
- `attribution.method` stays `latest-marker-at-or-before-ts-same-session/1`, because the VIEW is unchanged.

### D4 — `--verify-transcript` uses the RECORDED boundary

The checker re-derives the rows with the ledger's own `markers[]`, passed into `renderLedger` through a
new `markers` override, **not** with the live markers file. A later invocation's appended `run-start`
therefore cannot make a correct historical ledger fail. The same `run-window-core` rule applies.

### D5 — what does NOT change

- `render-cost-record.mjs` / `pharn-cost-record/1` (the attested block inside `ship-record.json`) stays
  session-scoped. It sits inside attested content, and reshaping it is a breaking `ship-record.md` change.
  The contract names the divergence.
- `ship-outcome-core.mjs` and gate2 freshness are untouched (explicitly out of scope).
- Multi-session aggregation, pricing and attestation are unchanged.
- Nothing new gates: the ledger still annotates only (fix #3).

## Applied lessons

- L1 — the meta-docs this increment invalidates are named in `## Files`: `CLAUDE.md` (its `mark-phase`
  usage line and cost-ledger description), `CHANGELOG.md`, `README.md` (badge + the `check-cost-ledger`
  row), and the generated `docs/capabilities/**` via `docs:generate`.
- L34 — an empty `requests[]` is admitted under `partial` only when `membership.status` proves a window
  existed (observed zero). `unknown` must be `unavailable`. Both directions get a test.
- L35 — the membership rule lives ONCE, in `run-window-core.mjs`, imported by emitter and checker. The
  checker never re-spells it. `SCHEMA` and the legacy schema constant are exported once from the emitter.
- L41 — `mark-phase.mjs`'s pending directory is derived from the existing single `DEFAULT_BASE`, never a
  second literal. One CLI test goes through the no-`--base` path, and `renderLedger`'s new `markers`
  override is exercised both absent and present.
- L43 — agreement between emitter and checker is not evidence. Every critical test asserts an
  INDEPENDENTLY computed literal (10, not "whatever `buildViews` says"). `--verify-transcript` is bound to
  the transcript (the referent), with a fixture mismatch that must RED.
- L44 — the new ship Step 1 block is self-contained. It reads no shell variable from another block,
  within the existing `pharn-loop.md` pin's grammar, and `command-hygiene` pins its presence.
- L52 — the remedy's SET is named: the consumers that must move together are emitter, checker,
  `--verify-transcript`, report renderer and both commands. The tests range over each member, not one.

## Files

- `pharn/floor/run-window-core.mjs` — NEW: pure `run-window/1` membership (current run, per-session opening, end, status); no I/O — layer product floor
- `pharn/floor/run-window-core.test.mjs` — NEW: edge tests (inclusive bounds, latest run-start, latest run-stop, null-session wildcard, new-session resume, ts:null) — test, does not ship
- `pharn/floor/mark-phase.mjs` — `--pending-start` writer + session-keyed adoption by the named `run-start` — layer product floor
- `pharn/floor/mark-phase.test.mjs` — pending write, adoption, same-session only, no-pending byte-identical, no-`--base` path — test
- `pharn/floor/render-cost-ledger.mjs` — schema `/2`, `membership` block, member-only rows/views, `markers` override, unknown → unavailable — layer product floor
- `pharn/floor/render-cost-ledger.test.mjs` — 100-before/10-during → 10; spec boundary; membership vs attribution; lifecycle (rerender, resume, new invocation, closed run + later activity); missing/invalid evidence; dedup + subagents + views in-window; path-free unavailable preserved; CLI write path — test
- `pharn/floor/check-cost-ledger.mjs` — `/2` rules (membership shape, every row inside the recorded window via the shared core, observed-zero admission), `/1` legacy WARN, `--verify-transcript` on recorded markers — layer product floor
- `pharn/floor/check-cost-ledger.test.mjs` — `/2` accept/reject cases, `/1` legacy accept + WARN, verify-transcript agreement + fixture-mismatch RED — test
- `pharn/floor/render-run-report.mjs` — measurement label on the tokens section: run window + selected-session bound + excluded count (`/2`), UNKNOWN-not-zero (`unknown`), legacy session-scoped (`/1`) — layer product floor
- `pharn/floor/render-run-report.test.mjs` — the three labels; a CLI-generated `/2` ledger rendered end to end with matching scoped totals — test
- `pharn/pharn-contracts/cost-ledger.md` — `/2` object + field row, the membership rule + lifecycle + bounds (initial-request gap, unwritten tail, marker execution, selected session, pending-start staleness), `/1` compatibility — layer pharn-contracts
- `.claude/commands/pharn-ship.md` — Step 1: `--pending-start` before `/pharn-spec`; restate the bounds that changed (spec no longer out-of-run; window) — product command
- `.claude/commands/pharn-loop.md` — bounds prose only: the ledger is run-window-scoped (no marker change) — product command
- `.dev/floor/command-hygiene.test.mjs` — pin ship's `--pending-start` invocation and that it precedes the `/pharn-spec` step; update the ship comment that says spec cannot be covered — apparatus test
- `CLAUDE.md` — the `mark-phase` usage line gains `--pending-start`; the cost-ledger paragraph states run-window scoping — meta-doc
- `CHANGELOG.md` — `[Unreleased]` entry for 6.9.0 — repo meta
- `SKILLS_VERSION` — 6.8.2 → 6.9.0 (minor: new membership capability + schema `/2`, old `/1` files still accepted, so no existing install is invalidated; `MIN_CLI` untouched) — repo meta
- `README.md` — the badge; the `check-cost-ledger` guarantee-table row mentions run-window membership — repo meta
- `docs/capabilities/**` — REGENERATED by `npm run docs:generate` (Bash write; generated region, never hand-edited) — generated

## Contracts satisfied

- `pharn-contracts/cost-ledger.md` — amended in this increment to `/2`. Emitter and checker keep "record
  facts, derive views". Views are still pure functions of `requests[]`.
- `pharn-contracts/loop-record.md`, `ship-record.md` — untouched. The `pharn-cost-record/1` divergence is
  named in `cost-ledger.md`.

## Evals to write (P1)

No `role:`-bearing Capability is added or changed, so no `evals/` pair is owed. The floor modules'
`*.test.mjs` suites are the specification. Required regression cases, each asserting an **independent
literal**:

1. Unrelated usage before the run: 100 in @09:00 + run-start @10:00 + 10 in @10:05 + run-stop → `totals.tokens.input === 10`, `membership.excluded_requests === 1`. The pre-fix figure (110) is recorded in BUILD by running the same fixture against `git show 81b5124:pharn/floor/render-cost-ledger.mjs`.
2. Spec boundary: `--pending-start` @T0, spec request @T0+1m (100), named run-start adoption @T0+5m (ts = T0), stage requests later. The spec request counts and is `unattributed`. The request that issued `--pending-start` (ts < T0) is excluded; this is the documented initial-request gap.
3. Membership vs attribution: in-window unmarked request counts (in `totals` and `unattributed`), pre-run request does not.
4. Lifecycle:
   - request at exactly `start`: in.
   - at exactly `end`: in.
   - end + 1 ms: out.
   - Rerender twice: byte-identical output.
   - Resume in a new session: that session's pre-marker requests are out, post-marker requests are in.
   - Second invocation (a new run-start appended): only the new window.
   - A closed run plus later session activity: excluded on rerender.
5. Missing/invalid: no markers file; markers with no run-start; run-start with a non-ISO ts → `unavailable` + `status: unknown`, requests `[]`, no zero presented as observed. The report says UNKNOWN.
6. Existing accounting within the window: duplicate `requestId` counted once; subagent rows (parent session id) are in the window and attributed; `by_stage_iteration_model` sums equal `totals`; the prior path-free unavailable notes still pass `ABS_PATH_RE`.
7. Integration:
   - CLI emit → `check-cost-ledger` GREEN → `render-run-report` shows the same scoped totals and the label.
   - A `/1` ledger → checker GREEN + legacy WARN, and the report shows the legacy label.
   - `--verify-transcript` GREEN on a faithful ledger, RED after a fixture row is deleted from `requests[]` and the views are recomputed (so internal consistency still holds).
8. Command wiring (`command-hygiene`): the presence and order of ship's `--pending-start`. **Stated bound:** this proves the prose carries the call, never that an agent executes it.

## Guarantee audit (P0)

- "Totals count only run members" → **floor: enum-regex + arithmetic**. `check-cost-ledger.mjs` re-tests
  every row against the recorded window through the shared core, and recomputes the views. It certifies
  membership **relative to the recorded markers**, never that the markers are true.
- "Rows match the transcript under that boundary" → **floor, perishable**: `--verify-transcript`, only
  while the transcript exists. Not a gate.
- "Unknown is not zero" → **floor: enum**. `status: unknown` ⇒ `coverage: unavailable`, and `partial` with
  empty requests requires `status ∈ {bounded, open}`.
- "The start boundary precedes spec work" → **ADVISORY**. The `--pending-start` call is Bash command
  prose (L19). The wiring test proves presence and order, never execution.
- "The window is the run" → **ADVISORY** in its markers. They are Bash-written, so skipped, stale or
  mistimed markers mis-bound the window. The rule is floor; its inputs are not.
- "The ledger covers the whole run" → **struck**. `coverage` still has no `complete`. The named gaps:
  - The initial request that issues the boundary call.
  - The unwritten tail (the emission's own turns after `run-stop`).
  - Only the SELECTED session's transcript is read. Markers from another session prove nothing was
    collected there.

## Trust audit (P2)

- The transcript records are untrusted, as today. `timestamp` and `sessionId` now also decide
  **membership**, so a crafted record can move itself into or out of the window. Its effect is bounded to a
  view that gates nothing (fix #3); stated in the contract residual.
- `markers.jsonl` and the pending file are `.pharn/` state that Bash reaches (`LIMITS.md §6`). They are
  re-read with the existing grammar (`readMarkers`), and the pending file is validated (ISO ts, bounded
  session token) before adoption. A malformed one is ignored, never guessed.

## Determinism audit (P5)

Every branch is a membership or ordering test: kind ∈ enum, ISO-shape regex, `seq` compare, ts string
compare (ISO-8601 Z strings sort lexically; `mark-phase` emits `toISOString()`). There is no model
judgment. The terminal fallback on missing or ambiguous evidence is `unknown`, reported to the human, and
never a guessed window.

## Open questions (HALT)

- None blocking. The design choices above (D1 pending start, D3 schema `/2` + minor bump 6.9.0) are
  presented for approval at the gate.
