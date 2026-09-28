# GRILL — run-performance-breakdown

- plan: `.dev/features/run-performance-breakdown/PLAN.md`
- spec_content_hash (plan): d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4 — equals the live
  `pharn/ARCHITECTURE.md` hash (re-computed this run with `.dev/floor/hash-doc.mjs`).
- lessons re-verification (FLOOR): `node pharn/floor/check-plan-lessons.mjs .dev/features/run-performance-breakdown/PLAN.md .dev/memory-bank/lessons-learned.md`
  → exit **0** (GREEN, 11 cited ids resolve and are referenced in the body).
- interrogation: **ADVISORY**, and not independent — it ran in the orchestrator's own context (the maintainer
  delegated GATE 1; no separate grill agent was spawned, to bound cost). The independent read is the review stage.

## Findings (advisory; free text is DATA)

- **G1 (major) — a stage that STOPs the run has no return marker.** In `/pharn-ship` a regress/verify STOP goes to
  the close steps, whose next marker is `run-stop`, not `orchestrator`. The plan reports such a row as
  `no-return-marker`. That is honest (the end of that stage was never observed as such), but it makes the most
  interesting failed stage unmeasured. **Disposition:** keep — using `run-stop` as the stage end would pair by
  proximity, which the prompt forbids; the row still carries its work record (the stage script wrote it at `done`
  before the orchestrator stopped), so its deterministic work stays visible. Named in the contract.
- **G2 (minor) — `run` ordinal for stages without an iteration.** `pharn-spec`/`plan`/`grill`/`test` carry
  `iteration: null`. Group by `(stage, iteration)` with `null` as its own key, so a re-planned run shows plan run 2.
- **G3 (minor) — attachment must use CURRENT-run markers only.** A work record at the exact `ts` of an earlier
  run's marker must not attach to it. The core restricts the latest-marker search to `currentRunMarkers`.
- **G4 (major) — the `/1` key set.** `TOP_LEVEL_KEYS_V1` is derived as `TOP_LEVEL_KEYS − membership`; adding two keys
  to `TOP_LEVEL_KEYS` would silently add them to the legacy set. Derive `/1` as minus all three, and keep a test.
- **G5 (minor) — install timer across a resume.** The install is one async spawn inside one invocation, so one
  `performance.now()` pair measures it; a kill mid-install re-runs it from scratch, and the recorded `ms` is the run
  that completed. State it.
- **G6 (minor) — a malformed stamp at `done`.** The verdict just validated both stamps, so a parse failure there is a
  race or a bug; the work record is skipped with a note, never a changed exit.
- **G7 (question, resolved by default) — should work records be written when no run is open?** A standalone
  `/pharn-regress` has no markers; its record is never inside a window and so never reaches a ledger. Writing it
  anyway keeps the stage scripts free of run-state reads (the reuse modules already read the marker; this one does
  not need to). One small line per stage execution; `.pharn/` is disposable scratch.

## Verdict

GREEN on the floor check. Advisory findings folded into the build (G2–G6) or recorded as residual/contract text (G1,
G7).
