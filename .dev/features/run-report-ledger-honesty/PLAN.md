# PLAN — run-report-ledger-honesty

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L6, L34, L41, L42, L43]
- increment: Make `RUN-REPORT.md` honest about two ledger states the integration review found it misreports. When the transcript is unavailable, the tokens section says UNAVAILABLE and does not show a measured-but-empty window (F1). When the `cost.json` on disk describes an EARLIER run because this run's emission failed, the report says STALE and does not present that ledger as the current run's (F2).
- layer(s): product floor (`pharn/floor/render-run-report.mjs`), product commands (`pharn-ship.md`, `pharn-loop.md`)
- constitution_refs: [P0, P5, P6, P7]

## Trigger (P7 — real failures, reproduced)

The trigger is `.dev/features/cost-ship-integration-review/INTEGRATION-REVIEW.md`, whose probe was
committed locally as `ca272bf` on `review/cost-ship-integration`. Both failures were reproduced at
`760c5de` through the production CLIs.

- **F1.** Markers are present and the transcript is absent, so the ledger is `coverage: unavailable` with
  `membership.status: bounded`. `## Tokens` then renders "**Measured population: the RUN WINDOW** … A
  floor on this run's spend", followed by `excluded requests 0` and "_n/a — … nothing was recorded against
  a stage_". `measurementLabel()` never reads `cost.coverage`.
- **F2.** Run 2's `render-cost-ledger.mjs` exits 2 (bad usage), which leaves run 1's `cost.json` on disk.
  `check-cost-ledger.mjs` is GREEN on it, and `render-run-report.mjs` renders run 1's `gate2` as the
  report.

## Design

### D1 (F1) — tokens section branches on `coverage` too

When `cost.coverage === "unavailable"` and membership is not `unknown`, the tokens section renders:

- "**Run usage: UNAVAILABLE — not measured, and not a zero.**"
- the window facts, fenced;
- the `coverage_note`, quoted as DATA in a fence (it is path-free since 6.8.2, and it is ledger text).

The "Measured population" label is used ONLY for `partial`. The `unknown` branch also quotes the
`coverage_note`.

### D2 (F2) — a deterministic staleness test against the LIVE markers file

`renderRunReport` reads the live `markers.jsonl` for `<name>`, using `readMarkers` imported from the
emitter and `mark-phase.mjs`'s single `DEFAULT_BASE` under `repo`. A new `markersBase` option / CLI flag
`--markers-base` defaults to that single definition (L41).

The ledger is **STALE** iff the live file's greatest `run-start` `seq` > the greatest `run-start` `seq`
recorded in `cost.markers` (0 when there is none). That means a later run started and wrote no ledger
of its own.

When the ledger is STALE:

- A banner goes at the top.
- `## Outcome`, `## Tokens` and `## Files` render `n/a` with the STALE reason. They never show the old
  ledger's values as current.
- `## Verdicts` renders as today, but prefixed "no current ledger". The reports are this directory's
  current files, and the ledger is what is stale.

If there is no live markers file, the test cannot be made. The report states "staleness not checked (no
markers file)" only when a ledger exists. It is never silently treated as current-proven. Note this is
wording in the banner area, rendered only in that case.

### D3 — command prose (advisory) ties the render to a successful emission

Both commands' emit step:

- If `render-cost-ledger.mjs` exits non-zero, do NOT run the check or the render as if a ledger were
  emitted. Say "no ledger was emitted this run" in the presentation.
- The render still runs, because it is what surfaces STALE for a human.

This is **ADVISORY** (Bash command prose). D2 is the code-level backstop that holds even when D3 is
skipped.

### Not changed

- `cost.json` schema and the checker. The checker validates a file and does not decide currency. Stated
  as a bound: `check-cost-ledger.mjs` GREEN on a stale file remains true.
- No gating: the report annotates only.

## Applied lessons

- L6 — staleness is read from structured marker `seq`/`kind` in two structured stores (the ledger's
  `markers[]` and the live `markers.jsonl`). It is never inferred from prose or from file mtime.
- L34 — "no live markers file" is an explicit rendered state, never a vacuous pass.
- L41 — `--markers-base` falls through to `mark-phase.mjs`'s single `DEFAULT_BASE`, and one test goes
  through the no-flag path.
- L42 — the render judges currency against the state recorded at the time: the markers each run wrote
  when it started. It does not use the file's mtime.
- L43 — the checker's GREEN (internal consistency) on a stale file is exactly the store-agreement
  blindness that lesson names. The report binds the ledger to its referent (the live run sequence).

## Files

- `pharn/floor/render-run-report.mjs` — D1 + D2 (+ `--markers-base`) — layer product floor
- `pharn/floor/render-run-report.test.mjs` — F1 label (bounded + open); F2 stale via the real failed-emission path, the not-stale control, no-markers-file wording, the default markers-base path — test
- `.claude/commands/pharn-ship.md` — Step 3a: emitter exit handling + STALE mention — product command
- `.claude/commands/pharn-loop.md` — Step 6b: the same — product command
- `CLAUDE.md` — the RUN-REPORT paragraph: the two new states — meta-doc
- `CHANGELOG.md` — `[Unreleased]` entry — repo meta
- `SKILLS_VERSION` — 6.9.1 → 6.9.2 (patch) — repo meta
- `README.md` — badge — repo meta

## Evals to write (P1)

No Capability is added. The tests assert literal strings and section content:

- F1 bounded + unavailable → "Run usage: UNAVAILABLE"; no "Measured population"; `coverage_note`
  quoted.
- F1 open + unavailable → the same.
- Control: partial → "Measured population" unchanged.
- F2: run 1 emits, run 2 appends `run-start`, run 2's emit exits 2, then render → STALE banner, the
  Outcome does not contain `gate2`, and Tokens/Files are `n/a` STALE.
- Control: after a successful run-2 emission → no STALE.
- No markers file → "staleness not checked".
- Default markers base: render with no flag, where `repo/.pharn/cost/<name>` exists → detects STALE.

## Guarantee audit (P0)

- "An un-emitted run's report never shows the previous ledger as current" → **floor: integer compare**
  over recorded marker `seq`s. It is exact relative to the markers, which are advisory. It is blind when
  the run wrote no `run-start` either.
- "The commands skip presenting a failed emission" → **ADVISORY** (command prose).
- "Unavailable usage is labelled unavailable" → **floor-by-construction** of the renderer (a `coverage`
  enum branch). The report still gates nothing.

## Open questions (HALT)

- None. The user delegated approval.
