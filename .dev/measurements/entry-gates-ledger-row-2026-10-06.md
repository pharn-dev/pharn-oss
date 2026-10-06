# Entry-gate timing in the cost ledger — evidence and a comparison procedure (2026-10-06)

- **Increment:** `entry-gates-ledger-row` (SKILLS_VERSION 6.48.0), built on `origin/main`
  `6aa4f59492a7ad4108abd91e65e426b768081afc` (6.47.0). Plan and stage records: `.dev/features/entry-gates-ledger-row/`.
- **What it adds:** observations of the background entry check (`.pharn/cost/<name>/entry.jsonl`) carried into
  `cost.json` as `entry_events[]` facts and an `entry` view. The definitions, the binding, the cutoff and the bounds
  live in `pharn/pharn-contracts/cost-ledger.md`, "Entry gate observations". This file does not restate them.
- **What it does not do:** it is a measurement increment. It changes no gate, verdict, route, wait point, takeover,
  abort or commit decision, and it establishes **no speedup**.

## Sources, labelled

| Label              | What                                                                             | Where                          |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------ |
| controlled fixture | a sandbox git project with three timed gates, real processes, the real CLIs      | below, "Controlled fixture"    |
| static estimate    | appends per run, bytes per run, added calls                                      | below, "Overhead"              |
| measured overhead  | micro-benchmarks of each new piece on one machine                                | below, "Overhead"              |
| observed real run  | **none with this instrumentation**. The 92-minute run is diagnostic history only | below, "What is not available" |

## Controlled fixture (real processes; not a project, not a model run)

Setup: three gates (`lint` sleeps 0.2 s, `test` 2 s, `build` 1 s; 3.2 s of sleep in total). The steps are a
`run-start` marker, `entry-gates --start`, a marked `pharn-spec` stage that sleeps 1.5 s, a marked `pharn-plan`
stage that sleeps 1 s, `entry-gates --wait`, then `run-stop`. After that the real `render-cost-ledger.mjs` and
`check-cost-ledger.mjs` run. Three runs on an Apple M2 (8 cores), Node v24.13.1, an otherwise idle desktop session, on the
code as shipped (after the GATE-2 review fixes; three earlier runs before the fixes gave the same shape, within 60 ms):

| Run | checker | `--start` call (monotonic, inside) | `--start` call (outside, incl. node start) | lifetime (wall, cross-process) | runner segment (monotonic) | inside marked stage rows (placement) | `--wait` call (monotonic) | ledger window |
| --- | ------- | ---------------------------------- | ------------------------------------------ | ------------------------------ | -------------------------- | ------------------------------------ | ------------------------- | ------------- |
| 1   | GREEN   | 81 ms                              | 127 ms                                     | 4189 ms                        | 4058 ms, 3 gates           | 2595 ms                              | 1553 ms, green            | 4761 ms       |
| 2   | GREEN   | 82 ms                              | 122 ms                                     | 4132 ms                        | 4014 ms, 3 gates           | 2591 ms                              | 1568 ms, green            | 4771 ms       |
| 3   | GREEN   | 88 ms                              | 126 ms                                     | 4119 ms                        | 3994 ms, 3 gates           | 2612 ms                              | 1561 ms, green            | 4774 ms       |

What the fixture shows, and no more:

- The four quantities are kept apart. The ~0.8 s by which the runner segment exceeds the 3.2 s of gate sleep is
  PHARN's own per-gate work (spawning `run-gates.mjs`, fingerprints and digests). The fixture shows it exists; it does
  not decompose it.
- The runner's execution overlapped the two marked stages for ~2.6 s of placement. That is a statement about wall
  intervals. It is **not** a saving: the `--wait` call still spent 1.3–1.6 s in the foreground waiting for the rest.
- "outside" vs "inside" for `--start` shows why the monotonic figure is the call's own work and not the whole Bash
  call. Node start-up (~35–40 ms here) is outside every recorded number.
- The ledger window (run-start → run-stop) is a separate quantity. In a real run the run-stop is written before the
  ledger, the report and the closeout, so the window is not the whole command.

The lifecycle shapes the fixture does not exercise (still running at the wait, budget continuations, takeover,
no-gates, init refusal, abort, supersession, a missing run-start, a failing write) are covered by
`pharn/floor/entry-gates.test.mjs` (`OBSERVED:` tests, real processes) and `pharn/floor/entry-observations.test.mjs`
(fixed timestamps).

## Overhead (measured on one machine; a static estimate for a run)

Micro-benchmarks, median, Apple M2, Node v24.13.1:

| Piece                                                                                                                                           | Median   |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| loading `entry-observations.mjs` in each entry-gates process (after the modules it imported at the base; 7 fresh processes, range 1.34–2.43 ms) | 1.42 ms  |
| one append (`recordEntryEvent`: validate + lstat walk + open + write)                                                                           | 0.037 ms |
| `currentRunStart` over a 200-line `markers.jsonl` (once per `--start`)                                                                          | 0.133 ms |
| `buildEntryView`, one invocation, 3 segments, 4 waits, 200 markers                                                                              | 0.102 ms |
| `readEntryEvents` over 10,000 lines (the file is never pruned)                                                                                  | 12.8 ms  |

Static estimate per run: one `start`, two lines per runner or takeover process, one per `--wait` call and one per
`--abort`. A typical full run writes 5–6 lines (start, runner begin and end, one wait, one abort at the stop) of about
260 bytes each, so ~1.5 KB. The appends themselves cost under 1 ms across the processes involved. The larger cost is
loading the new module once in every entry-gates process: about 1.4 ms each, so about 6 ms across a typical run's four
processes (`--start`, the runner, one `--wait`, one `--abort`). The independent review found that figure missing from
the first version of this report. **Added calls: none.** No
subprocess, no model request, no poll and no extra pinned line were added. The one added read is `markers.jsonl` at
`--start`.

This is not zero overhead. Each append is a synchronous file write inside the runner, between gates, and inside
`--wait` after its document. On a loaded machine or a slow file system it takes longer, and nothing here claims timing
near a deadline is identical. The writes never wait on a lock and never retry.

## What is not available, and why

- **No observed real run carries these observations yet.** The instrumentation ships with this increment.
- **The 92-minute `billing-plan-catalog` run** (`.dev/measurements/loop-wall-clock-2026-10-05.md`) ran PHARN
  **6.35.0**, before entry gates existed (6.42.0), and ended `INCONCLUSIVE`. It is diagnostic history (it motivated
  the batch, entry gates included) and **is not a baseline** for any before/after claim. A run that stopped earlier or
  skipped a stage is not a faster successful delivery.
- **Whole-command time** needs a boundary outside PHARN (the harness, or a person with a clock) and is not recorded.
- **Human waiting and closeout overhead** are not derived as remainders of anything here. They need their own evidence.

## Procedure for a later matched comparison (PR 1 vs PR 2, or any two revisions)

The prompt that started this increment names "PR 1" and "PR 2". Neither maps to a pull request visible in this
repository when this was written, so their commit references are fields to fill in, not facts recorded here.

1. **Fix everything except the revision.** Record for each side:
   - the feature description;
   - the starting project state (a commit SHA, with a clean tree);
   - the acceptance criteria (the approved SPEC's `spec_content_hash`);
   - the PHARN revision (`SKILLS_VERSION` and the pharn-oss commit);
   - the mode (full `/pharn-loop`, `/pharn-loop --quick`, or `/pharn-ship`, never mixed);
   - the `models.stages` block and the served models (from `cost.json` `requests[].model`);
   - the dependency state (`npm ci` from the same lockfile);
   - the gate set and `gates.exclude`;
   - cache conditions (a cold or warm `node_modules` and build cache, the same on both sides);
   - human waiting (none, or recorded per gate with a clock);
   - machine contention (no other heavy process; note what else ran).
2. **Run each side at least three times.** Keep full loop, quick loop and ship separate.
3. **Take, from each `cost.json`:**
   - the ledger window (`membership.start` → `.end`), labelled as such;
   - `executions` rows (sequential stage elapsed);
   - `entry.invocations[]`: lifetime, segments with their `segment_coverage`, wait calls, unions and overlap;
   - `work[]`;
   - the token views.
     Quote every unmeasured value as its status, never as 0.
4. **Whole-command time only from an independent boundary**, for example the harness transcript's first and last
   timestamps for the command's turn, or an external `time`. State the boundary.
5. **Report the exact measured window and its omissions.** The run-stop precedes the ledger, report and closeout, and
   node start-up is outside every PHARN-recorded call. A run that ended early or skipped a stage is reported as such,
   not as a faster delivery.
6. **Keep raw traces private.** Commit only derived numbers and sanitized fixtures; transcripts stay machine-local.

## Follow-ups (evidence-backed, not built)

- `entry-observation-whole-command`: a harness-level command boundary, only if a matched comparison needs whole-command
  time. Not available today, and nothing here derives it.
- `entry-runner-per-gate-overhead`: the fixture's ~0.8 s of runner time beyond the gates' own sleep is PHARN work
  between gates. It is measurable per gate only by timing `run-gates.mjs` calls, which this increment deliberately
  does not do (per-gate tracing is out of scope).
