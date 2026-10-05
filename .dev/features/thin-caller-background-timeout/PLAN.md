# PLAN — thin-caller-background-timeout: the thin callers stop resuming a call the Bash tool moved to the background

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L31, L37, L50, L60, L64]
- increment: `/pharn-regress` and `/pharn-verify` no longer tell the model to run the resume line "when the Bash tool
  itself timed out" — a call the tool reports as moved to the background is still running, so the model waits for its
  completion notice and branches on the exit code it reports; only a call that is actually gone is resumed, once. The
  one contract sentence that restates "a harness timeout" as a kill is corrected, and the thin callers join the
  orchestrators' rule-7 pin.
- layer(s): the product `.claude/commands/` surface (`pharn-regress.md`, `pharn-verify.md`),
  `pharn/pharn-contracts/stage-exit.md` (one sentence), build apparatus (`.dev/floor/command-hygiene.test.mjs`, this
  folder), release meta (`SKILLS_VERSION`, README badge, CHANGELOG).
- constitution_refs: [P0, P4, P6, P7]

## Why (P7) — the recorded failure

- The independent GATE-2 review of PR #314 (6.43.0, `orchestrator-direct-stage-calls`, R1) reproduced that when a Bash
  tool call reaches its timeout, this harness MOVES THE CALL TO THE BACKGROUND rather than killing it. #314 added the
  in-flight lock to `pharn/floor/stage-direct.mjs` (header, "FAILURE MODES") and the "STILL RUNNING" paragraph to
  `/pharn-loop` and `/pharn-ship`, pinned by `DIRECT_STAGE_WIRING` rule 7 in `.dev/floor/command-hygiene.test.mjs`.
- Re-probed this run (L37, P6): `node -e 'setTimeout(()=>{…; process.exit(5)}, 8000)'` under a 3000 ms Bash timeout →
  "Command did not complete within its 3s timeout and was moved to the background (ID: …) … You will be notified when
  it completes. If it is still running after 30m in the background, it will be stopped". The process ran on, printed
  its line, and the output file ended `[exited with code 5]`; the completion notice said `status: failed` — "failed
  with exit code 5". So: (a) the call is not killed; (b) the exit code IS reported later; (c) a `continue` (5) is
  labelled "failed" by the notice, so the model must branch on the code, never on the word; (d) the tool stops a call
  still running after 30 min — a real kill, the one case where the call is gone.
- The thin callers still prescribe the opposite: `pharn-regress.md` "**The Bash tool itself timed out** (no exit code
  at all: the harness killed the script mid-run) — run the pinned resume line once", and `pharn-verify.md` "**The Bash
  tool itself timed out** — run the resume line once". Under (a) that starts a SECOND stage script on the same
  `.pharn/pharn-<stage>/` progress record while the first still runs. Called directly, neither script has an in-flight
  guard (the lock is stage-direct's; its header's own bound: "A person running a thin caller, or the stage script
  directly, beside a call is not seen"). Two scripts on one record race the drain's checkpoint and the "fresh"/cleanup
  removals: at best a wasted duplicate run, at worst a verdict composed from a record the other process rewrote.
- L31: the thin caller and the orchestrator's direct call are a deliberate copy-pair of one invocation; #314 fixed and
  pinned the orchestrator half only. This increment is the second half of that obligation.

## Design

1. **`pharn-regress.md`** — replace the "Bash tool itself timed out" bullet with a "**A call the Bash tool reports as
   moved to the background is STILL RUNNING**" bullet: wait for its completion notice (ending the turn to wait is
   fine) and branch on the exit code it reports, never on the notice's wording ("failed" covers every non-zero code,
   `5` included); never run `--resume` or another fresh line while it runs — nothing refuses the second. Only a call
   that is GONE without an exit code (interrupted, or stopped by the tool after its background limit) is resumed,
   once; the existing checkpoint / `no-progress` / N1 text is kept for that case, compressed. The `unusable` bullet's
   "or after a Bash-tool timeout (below)" becomes "or after a call that is gone (below)". The file is at 20,448 of its
   20,480-byte ceiling, so the new bullet is written to fit; if it cannot without losing a stated bound, the ceiling
   is raised by the rule (measured + 10%, next multiple of 512) as a visible diff.
2. **`pharn-verify.md`** — the same replacement for its bullet (18,519 of 20,480 bytes; fits).
3. **`stage-exit.md`** — "A hard kill (a harness timeout, say)" restates the retracted premise (L64). Replace it with
   an interrupt or the tool's background stop as the example, plus one sentence: a Bash-tool timeout does not kill the
   script, so its caller waits for the backgrounded call rather than resuming it; and name the residual
   `stage-script-in-flight-guard` (below).
4. **The guard for direct script calls — NOT built here; named follow-up `stage-script-in-flight-guard`.** Reusing
   stage-direct's lock is not local: stage-direct already HOLDS the lock while it spawns the script, so the script
   would need a parent pass-through (lock pid == `process.ppid`); a refusal must be a `pharn-stage-exit/1` object, so
   both stages' closed `unusable` reason sets in `stage-exit-core.mjs` and the contract's registry table gain a code;
   and the edit lands in `stage-regress.mjs` / `stage-verify.mjs` / `stage-runtime.mjs`, which three other builders in
   this batch are changing. The text fix removes the only prescribed path to a concurrent second run; the guard would
   make it a floor refusal. Recorded in the contract and the CHANGELOG.
5. **Pin (L31, L60)** — `command-hygiene.test.mjs` gains `THIN_CALLER_BACKGROUND`: for each `STAGE_SCRIPT_WIRING`
   file, the bold paragraph is present with "Never run `--resume`, or another fresh line, while it runs" within it,
   and `TIMEOUT_RESUME` (rule 7's existing regex, reused) does not match. A mutant test removes the paragraph and
   restores the old clause, each asserted to fail by its own reason. Presence over committed prose — never that a run
   waited (P0).

Sweep (L50): the referent that broke is "a Bash-tool timeout kills the call". `git grep` for its spellings ("harness
timeout", "tool itself timed out", "harness kill", "timeout … resume") outside `.dev/features/` and the CHANGELOG
finds the two command bullets, `stage-exit.md:246`, and five "harness kill" sites (`pharn-regress.md`'s "Bash-tool
timeout must exceed `--timeout-ms`" bound, `run-gates.mjs:50`, `gate-run-record.md:320`, CLAUDE.md's run-gates block,
test comments). Those five say what a kill does WHEN one happens (orphaned process group), which stays true — the
30-minute background stop and an interrupt are kills — so they are left unchanged. No trusted doc carries the claim
(`git grep` over `LIMITS.md`, `THREAT-MODEL.md`, `pharn/ARCHITECTURE.md`, `pharn/CONSTITUTION.md`: no match).

## Applied lessons

- L31 — the thin caller / direct call copy-pair: #314 pinned only the orchestrator half; the thin callers join the
  rule-7 obligation, iterated over `STAGE_SCRIPT_WIRING` rather than per file.
- L37 — the background behaviour is re-probed this run (a 3 s timeout over an 8 s process), not copied from #314's
  review; the "failed" label on a `5` exit and the 30-minute stop came from that probe.
- L50 — the sweep enumerates cites of the broken referent (a timeout kills), not only the bullets' wording; the five
  "harness kill" sites are examined and kept, with the reason stated above.
- L60 — each new assertion (paragraph present; old clause absent) gets its own mutant, matched by its own reason.
- L64 — `stage-exit.md`'s "a harness timeout, say" is a restatement of the retracted premise and is corrected in the
  same increment; the CHANGELOG entry is written from the probe, naming the unbuilt guard as a follow-up.

## Files

- `.claude/commands/pharn-regress.md` — the backgrounded-call bullet replaces the timeout-resume bullet; the
  `unusable` cross-reference — product
- `.claude/commands/pharn-verify.md` — the backgrounded-call bullet replaces the timeout-resume bullet — product
- `pharn/pharn-contracts/stage-exit.md` — the kill example corrected; the backgrounded call and the
  `stage-script-in-flight-guard` residual named — layer pharn-contracts
- `.dev/floor/command-hygiene.test.mjs` — `THIN_CALLER_BACKGROUND` pin + mutants; a ceiling raise only if item 1
  needs it — apparatus
- `SKILLS_VERSION` — 6.46.0 — release meta
- `README.md` — the version badge — release meta
- `CHANGELOG.md` — a `[6.46.0]` section — release meta
- `.dev/features/thin-caller-background-timeout/PLAN.md`, `GRILL.md`, `BUILD.md`, `REGRESSION.md`,
  `regression-report.json`, `VERIFY.md`, `verify-report.json`, `REVIEW.md`, `SHIP.md` — this increment's audit trail
  — apparatus

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — the protocol is unchanged (codes, objects, registry); only the kill example
  and the caller's behaviour around a backgrounded call are corrected.

## Evals to write (P1)

- No capability changes; the pin above is the eval: thin caller without the paragraph → RED; with the old
  "Bash tool itself timed out" clause → RED; committed text → GREEN.

## Guarantee audit (P0)

- "The thin callers say a backgrounded call is still running and is never resumed meanwhile" → floor: enum/regex
  (the hygiene pin) over committed prose — presence only.
- "A run waits for the call and does not start a second script" → advisory (command prose; nothing refuses a second
  direct script call until `stage-script-in-flight-guard`).
- "A Bash-tool timeout moves the call to the background" → advisory: an observed harness behaviour (probed at 3 s,
  assumed the same at 600 s, as stage-direct's header already says), not a floor fact.

## Trust audit (P2)

- No new input is ingested. The completion notice's text is harness output; the command branches on the exit code it
  carries, never on its wording.

## Expected time saving

- None on the 92-minute run's wall clock directly — the orchestrators already call stage-direct (6.43.0). This is a
  correctness fix for a person running `/pharn-regress` / `/pharn-verify`: it removes a prescribed concurrent second
  run (up to ~570 s of duplicated gate work per occurrence, plus a possibly corrupt progress record).

## Open questions (HALT)

- Accept the guard as a named follow-up (`stage-script-in-flight-guard`) rather than building it here? (Design item 4
  gives the reason: not local — a stage-exit registry change plus a parent pass-through, in files three other builders
  are changing.)
- Version: 6.46.0 as assigned (patch-sized correction).
