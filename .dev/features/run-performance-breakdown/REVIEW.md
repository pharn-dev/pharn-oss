# REVIEW — run-performance-breakdown

- floor: `node pharn/floor/validate.mjs .` → **GREEN** (36 capabilities). This is the only floor-grade content here;
  every finding below is ADVISORY (LLM-assigned severity, fix #3) and its free text is DATA (P2).
- reviewer: an independent `general-purpose` agent on opus, read-only, given the diff and a checklist (the prompt's
  twelve items plus totality, symlink safety, key-set derivation and claim honesty). It ran in a context separate
  from the build's. The build ran inline in the orchestrator's context, so this review is the one independent read.
- disposition: every finding was fixed before `/pharn-dev-verify` ran (its verify is over the fixed tree), or
  recorded as a stated bound.

## Findings (P-cited), with disposition

| #   | severity | principle | finding (summary, DATA)                                                                                                                                                                           | disposition                                                                                                                                                                                                   |
| --- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | major    | P0        | `appendWork` opened `work.jsonl` without `O_NONBLOCK`: a planted FIFO blocked the open, so `/pharn-regress`/`/pharn-verify` hung before `done` (reproduced) — contradicting "observational only". | FIXED: `O_NONBLOCK` on the append; `readWork` opens `O_NOFOLLOW \| O_NONBLOCK` + `fstat` regular-file test, size-capped. Test runs both against a real FIFO in a child with a timeout.                        |
| R2  | major    | P0        | An UNKNOWN run window admits no work record, and the screen/report printed "no … execution recorded one" — an unknown read as nothing.                                                            | FIXED: `workLines` prints `UNKNOWN — … Not a zero.` when the window (not the context half) is unknown. Test.                                                                                                  |
| R3  | minor    | P2        | `render-run-report.mjs` did not type-test `executions.reason`; an object with a throwing `toString` crashed the renderer.                                                                         | FIXED: `method`/`reason` type-tested, and `elapsed_ms === null ⇔ unmeasured !== null`. Test over four hostile shapes.                                                                                         |
| R4  | minor    | P0        | A skipped return AND a skipped next start pair a stage with the LATER stage's return — a measured, wrong interval; "never by proximity" overclaimed.                                              | FIXED where evidence exists: another stage's work record inside the interval → `foreign-work-inside`. The remaining case (stages that write no work record) is a BOUND stated in the header and the contract. |
| R5  | minor    | P5        | Rows keyed by `seq`: a duplicate `seq` re-homed a work record.                                                                                                                                    | FIXED: keyed by the marker object. Test.                                                                                                                                                                      |
| R6  | minor    | P4        | `dropped[]`'s `work[<n>]` read as an index into `work[]`, but it is a line of the whole multi-run file.                                                                                           | FIXED: token `work.jsonl[<n>]`, documented as a file line index across runs.                                                                                                                                  |
| R7  | minor    | P5        | `session-changed` treated a null session as different, while attribution treats null as binding any.                                                                                              | FIXED: aligned (null binds any). Test.                                                                                                                                                                        |
| R8  | nit      | P0        | "never stored twice" loose for a reused BASE's counts; CHANGELOG said "byte for byte" where the test compares parsed documents.                                                                   | FIXED wording in the contract and CHANGELOG.                                                                                                                                                                  |
| R9  | nit      | P7        | `work.jsonl` is never pruned; standalone runs write it too.                                                                                                                                       | STATED in the contract's bounds (one line per execution, disposable `.pharn/`).                                                                                                                               |
| R10 | minor    | P5        | (orchestrator, own read) `regressWork`/`verifyWork` are evaluated before `done`; a throw there would crash the stage.                                                                             | FIXED before review: both total (try/catch → null). Test over hostile inputs.                                                                                                                                 |
| R11 | minor    | P6        | (orchestrator, own read) The attachment and foreign-work checks re-parsed timestamps per pair (99 ms on 1,001 markers × 500 records, measured).                                                   | FIXED: each timestamp parsed once (9–17 ms, machine noise; `DEMO.md`).                                                                                                                                        |

## The twelve prompt checks (the reviewer's "verified correct", re-read by the orchestrator)

1. No second telemetry system: one extra fact file beside `markers.jsonl`, read by the same emitter.
2. `markerLine` and `mark-phase.mjs` are unchanged.
3. No guessed duration; R4 above names the one case the markers cannot tell apart.
4. Unknown is `null` / `UNKNOWN`, never 0 (R2 fixed the one place it was not).
5. Re-runs are `run 2`, never merged.
6. A skipped quick stage has no row.
7. Elapsed is labelled wall clock, never model, tool or CPU time.
8. No extra transcript pass; `--verify-transcript` reads no live work file.
9. Nothing on a decision path reads the new data, and the append cannot change an exit (R1, R10).
10. Membership, context binding, dedup and stage attribution are untouched (✧ equality test over every view).
11. Reuse facts are counted from the stamps once, at `done`; worktree and install are derived from `evidence`.
12. No schema bump: two additive keys, and a closed pre-6.35.0 alternative.

## Proposed lesson candidate (for Step 2b)

A wait on a result file in SHARED scratch (`until [ -f .pharn/<cmd>/x.json ]`) is satisfied by another session's
stale file: this run's first regress verdict read two maps an earlier session had written, and its base worktree was
removed while its own base side still ran (`REGRESSION.md`, "A void first run"). The same happened at verify with
`results.json`, caught before it was used. L5/L21 bound what is captured; this is WHOSE capture is read.
