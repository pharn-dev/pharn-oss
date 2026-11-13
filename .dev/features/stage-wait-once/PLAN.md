# PLAN — stage-wait-once: run /pharn-regress and /pharn-verify through a detached stage runner with a bounded in-node wait

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L35, L36, L38, L41, L44, L54, L58, L62, L66, L81]
- increment: `pharn/floor/stage-direct.mjs` starts a detached runner that makes today's exact stage-script calls
  (the budgeted fresh run, then `--resume` on every exit 5) inside node and owns the in-flight lock, the writes-scope
  and both markers; the orchestrator's call waits for it inside node up to `--budget-ms`, so a stage of wall time W
  costs the orchestrator about ⌈W / 570 s⌉ calls instead of one per slow step, and a dead runner is taken over in the
  foreground (Linear CORE-76).
- layer(s): product floor `pharn/floor/` (`stage-direct.mjs`, `stage-direct-core.mjs` and their test), the product
  `.claude/commands/` surface (`pharn-loop.md`, `pharn-ship-stages.md` — prose only), `pharn/pharn-contracts/`
  (`stage-exit.md`, `cost-ledger.md` — a paragraph each), build apparatus (`.dev/floor/command-hygiene.test.mjs`,
  `.dev/guides/floor-orchestration.md`, this feature folder).
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- revision: v3. v2 came after `/pharn-dev-grill` (`GRILL.md`: 2 blocking, 15 important, 7 minor), when the human chose
  "amend and re-approve" on 2026-11-13. v3 adds `run-gates.mjs` and its test during PR #443's review, approved by the
  human on 2026-11-13 ("Amend plan, fix it"). v1 is kept in the session scratchpad only.

## Why (P7) — the recorded evidence

- `.dev/measurements/loop-baseline-2026-11-11.md` (CORE-20, Done) rates CORE-76 **go** (line 377): "a median of 18
  orchestrator requests per regress at 271k" in the 6 runs started inside an agent (range 9–32; line 92 corrects the
  ticket's median of 20 to 18). The same record rates CORE-87 **go** and says "regress and verify wait on CORE-76"
  (line 376): the 540 s per-gate timeout exists only because one script run must fit one 600 s Bash call.
- `.dev/measurements/loop-wall-clock-2026-10-05.md:205-213`: 4 orchestrator calls for one regress.
- Mechanism, read live this run: `stage-exit-core.mjs:552-563` `mayStartSlowStep` lets a budgeted invocation start
  its first slow step always and a later one only while `elapsed + timeoutMs <= budgetMs`; with the pinned
  `--timeout-ms 540000 --budget-ms 570000` a later slow step may start only in the first 30 s. So every gate or
  install longer than ~30 s ends one call with exit 5, and the orchestrator spends a request (with its whole
  context) on the resume line. The model decides nothing in those requests.
- The pattern exists and is tested: `entry-gates.mjs` (6.42.0) — a detached runner bound by a nonce record, an
  in-node `--wait --budget-ms`, a foreground takeover when the runner is gone; `stage-agent.mjs finish --budget-ms`
  (6.74.0) waits the same way.

The direct saving is small (regress + verify are 3.3% of weighted cost, baseline line 377); the increment is the
enabler CORE-87 needs. That is the ticket's own framing and the baseline's, recorded here so nobody sells it as more.

## The design

**Pinned lines stay byte-identical** (GATE 1, Q1). The fresh line, the `--resume` line and the four `allowed-tools`
grants in `pharn-loop.md:124-127` keep their bytes. **The stage scripts are unchanged and are called with today's
exact argv** (grill blocking #1): the runner does inside node what the orchestrator does today across calls.

### Records, one writer each (grill blocking #2)

All under `pharn/.run/stage-direct/`, created through the existing `realDir` lstat walk, read `O_NOFOLLOW` by a reader
whose byte bound is a parameter (the lock keeps 4096; the result gets `SCRIPT_STDOUT_MAX` plus the stderr tail).

| record           | writer                                             | holds                                                                                                                                                                               |
| ---------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `in-flight.json` | the lock holder (today's lock, plus a `nonce`)     | pid, started_at, stage, name, nonce                                                                                                                                                 |
| `runner.json`    | the fresh call, ONCE, never rewritten              | nonce, stage, name, iteration, the fresh call's argv                                                                                                                                |
| `state.json`     | the current lock holder only (runner or takeover)  | nonce, pid, invocations so far, the stage-start marker's printed line and `seq`, `phase` (`running` · `script-exited`), on exit the script's code, stdout and a bounded stderr tail |
| `result.json`    | the current lock holder, LAST (tmp + rename)       | nonce, exit, stdout, stderr tail, both printed marker lines (or `marker: deferred` text)                                                                                            |
| `runner.log`     | the runner's own stdio (`detached`, `stdio` to it) | everything the runner and the scripts print to stderr, appended                                                                                                                     |

Every record is parsed by a total parser with a closed schema (null, never a throw — L62). The runner re-validates
`runner.json`'s argv with `parseDirectArgs` and takes the script only from `DIRECT_STAGES`, never from a record.

### What each line does

1. **Fresh line = START + WAIT.** (a) **In flight?** — the lock holder is alive, or `state.json`'s runner is alive,
   where "alive" is ONE definition everywhere: `kill(pid, 0)` and, for a runner, `ps -ww -p <pid> -o args=` showing
   its nonce (the entry-gates pid-reuse defence, reused by import if exported there, else stated as a copy with the
   reason); yes → `refused (in-flight)`, exit 2, nothing touched (criterion 3). (b) Take the lock with its own pid
   and a fresh nonce; remove the earlier `runner.json` / `state.json` / `result.json` (L66). (c) Write `runner.json`.
   (d) Spawn `stage-direct.mjs --runner <nonce>` `detached`, stdio to `runner.log`; a spawn failure releases the lock,
   removes `runner.json` and refuses `spawn-failed`, exit 2. (e) Rewrite the lock to the child's pid (tmp + rename;
   only the start call does this, the runner never touches the lock until release). (f) WAIT as in 2 for what is left
   of `--budget-ms`, printing the start-marker line as soon as `state.json` holds it.
2. **`--resume` line = WAIT, with TAKEOVER.** `Atomics.wait` sleeps between reads, never a model poll. Reads only
   records carrying `runner.json`'s nonce, stage and name; a `runner.json` naming another stage or name than the line
   → `refused (mismatch)`, exit 2 (a person decides, P5). Then, in order:
   - a bound `result.json` → replay its stderr tail to stderr, print its stdout byte for byte and its return-marker
     line, exit with its code (criterion 6);
   - no result, holder alive (runner or a takeover) → keep waiting; budget spent → one
     `stage-direct: waiting (<who> pid <p> alive)` line on stderr, no object, exit 5 (the existing `5` → resume-line
     mapping; the runner progresses meanwhile, and every gate is bounded by `--timeout-ms`, so the wait ends);
   - no result, holder dead, but the runner's process group still has members (an orphaned script or gate) →
     `refused (orphaned)`, exit 2, naming the pgid and the remedy (stop that group, re-run the resume line) — never an
     endless exit-5 loop, never a second script beside the orphan (grill P5/P6);
   - no result, holder dead, group empty → TAKEOVER, but only at the start of a call: a call that has already waited
     past one poll exits 5 at once (`takeover deferred`), so the takeover gets the next call's whole budget and the
     scripts' first-slow-step rule cannot overrun the 600 s cap (the entry-gates "no free first step" concern). The
     takeover takes the lock (holder dead = stale, today's rule), becomes the `state.json` writer, and decides from the
     nonce-bound `state.json`:
     - `phase: script-exited` → run nothing; write the return marker only if `markers.jsonl` holds no `orchestrator`
       marker for this name after the recorded start `seq` (L58); write `result.json`;
     - no start marker recorded → write it now (iteration from `runner.json`), print it, then run the FRESH argv;
     - no `continue` seen yet (invocation 1) → re-run the FRESH argv (a kill before the script's first checkpoint
       leaves nothing to resume, `stage-exit.md` lines 286-291);
     - otherwise → the script's own `--resume --budget-ms <B>` (criterion 4);
       a `5` from the takeover's invocation → record it in `state.json`, release, exit 5 (the next call takes over
       again); any other exit → return marker, `result.json`, release, print as above.
   - no `runner.json` at all → `refused (no-run)`, exit 2: there is nothing to wait for (v1's "today's foreground
     resume" path is dropped — grill P7; a pre-upgrade `continue` is the only state that reached it, and an upgrade
     mid-stage is not a supported path).
3. **`--runner <nonce>` (internal; a hygiene test pins that no command names it).** Refuses unless `runner.json` names
   its nonce (it then exits, leaving its log line; the wait sees a dead holder and takes over). Sets the scope
   (today's step 1; a setter failure is recorded as `result.json` with exit 2, no object and the refusal line as the
   stderr tail — today's output, replayed), writes the stage-start marker into `state.json`, then loops today's calls:
   the fresh argv exactly as today (`--feature … --timeout-ms … --budget-ms <B> [stage flags]`), and on each exit 5
   `--resume --budget-ms <B>`, recording each invocation in `state.json`, until an exit other than 5. Then
   `phase: script-exited` with code, stdout and stderr tail; releases the scope **only if the scope file still holds
   the bytes it set** (a stop procedure or a new run may have set another meanwhile — grill coupling; the compare and
   the clear are two steps, a stated window); writes the return marker; writes `result.json`; releases the lock.
4. **What the orchestrator sees is today's bytes.** The start-marker line in the call that started the runner (rule 6
   of `run-window-core.mjs` reads printed lines from the orchestrator's own tool results), then — in whichever call
   reads the result — the final invocation's stdout byte for byte and the return-marker line, with the script's exit
   code. The intermediate `continue` objects stay in the runner (they are not verdicts). stderr reaches the
   orchestrator as a bounded tail replayed at the end, not live — stated.
5. **Return marker exactly once (criterion 5).** Only the lock holder that ends the script run writes it: the runner,
   or a takeover over a run whose script exited (checked against `markers.jsonl` after the recorded `seq`) or that it
   finished itself. A wait that reads a result never writes one.
6. **Call count (criterion 1).** With B = 570 s, a stage of wall time W costs ⌈(W + s) / B⌉ calls on the normal path
   (s = the start's own seconds, s ≪ B), within the ticket's 1 + ⌈W / B⌉. A takeover adds at most one deferred call
   per runner death. A 16-minute regress is 2 calls. The poll interval is 250 ms (entry-gates'), so a result is seen
   within 250 ms of its write.

## Applied lessons

- L35 — the lock acquire/release, the setter argv, the script argv and the marker writer are the existing
  `stage-direct-core.mjs` / `mark-phase.mjs` functions; the takeover calls the scripts' own `--resume` rather than a
  copy; the pid-reuse `ps` check is imported from `entry-gates.mjs` if it can be exported without a cycle, else the
  copy names its source and why.
- L36 — `command-hygiene.test.mjs`'s DIRECT_STAGE_WIRING closure still asserts the closed set of line shapes; no shape
  is added, and a new pin asserts no command names `--runner`.
- L38 — the runner owns the one writes-scope record for the stage, and releases it only when the file still holds its
  own bytes, so a runner that outlives an orchestrator stop cannot delete a scope a later step set.
- L41 — the production defaults (the scripts beside `stage-direct.mjs`, the project's setter) are what the tests run:
  the scratch tree holds a copy of the whole floor with the two stage scripts replaced by fakes, and the CLI is spawned
  with no injection.
- L44 — the pinned lines stay one self-contained line each; the nonce lives on disk, never in a shell variable.
- L54 — every record path goes through the `realDir` lstat walk and `O_NOFOLLOW` reads; a test plants a dangling
  symlink at each record and expects a refusal, never a write through it.
- L58 — the takeover's marker check compares only markers for this name after the recorded start `seq`, never a count
  of a log that keeps growing.
- L62 — every quoted value goes through the existing total `shown()`; each new parser gets a `{"toString":1}` case.
- L66 — the wait reads only records carrying `runner.json`'s nonce, in a directory the fresh call empties, with
  `result.json` written last by tmp + rename; a stale result with another nonce is a test case.
- L81 — the scratch tree copies the whole `pharn/floor/` directory and the whole `.claude/hooks/` directory, never a
  hand list of modules.

## Files

- `pharn/floor/stage-direct.mjs` — start, runner, wait and takeover behind the two existing line shapes; header,
  failure modes and bounds rewritten — layer product floor
- `pharn/floor/stage-direct-core.mjs` — pure: the record schemas and total parsers, the `--runner` argv rule, the wait
  decision table, the new refusal reasons (`spawn-failed`, `mismatch`, `orphaned`, `no-run`) — layer product floor
- `pharn/floor/stage-direct.test.mjs` — the six criteria, the refusals and the negative controls below — layer
  product floor (test, not shipped)
- `pharn/pharn-contracts/stage-exit.md` — the "A Bash-tool timeout is not a kill" paragraph and the budget section's
  600 s tie, restated for the runner — layer pharn-contracts
- `pharn/pharn-contracts/cost-ledger.md` — the line 554-555 sentence on when a stage's return marker is written —
  layer pharn-contracts
- `.claude/commands/pharn-loop.md` — Step 2's regress mapping (the new call refusals map to S9 like today's) and its
  background paragraph, Step 5 item 2's prose; pinned lines and grants unchanged — layer product commands
- `.claude/commands/pharn-ship-stages.md` — the same changes in its floor-only-stages paragraph — layer product
  commands
- `.dev/floor/command-hygiene.test.mjs` — the background-paragraph pin, the no-`--runner` pin, and the two commands'
  byte ceilings if the delta needs it (measured + 10%, the file's rule) — layer build apparatus
- `.dev/guides/floor-orchestration.md` — its `## stage-direct.mjs` section (the lock's meaning, the wait, the
  takeover) — layer build apparatus
- `SKILLS_VERSION` — 7.14.0 → 7.15.0 (minor: a new mode of a shipped checker) — layer repo meta
- `CHANGELOG.md` — one new 7.15.0 entry — layer repo meta
- `README.md` — the version badge only — layer repo meta
- `pharn/floor/run-gates.mjs` — (v3) `init` stops a gate group a crashed run left running (`lock.child`, the existing
  `reapOrphanGroup`) before it deletes `<out>`. A takeover after a runner killed during the first gate re-runs the
  fresh line, and that wipe used to delete `lock.child` with the gate still alive, so two gates could overlap (PR #443,
  CodeRabbit) — layer product floor
- `pharn/floor/run-gates.test.mjs` — (v3) the init reap: after a SIGKILLed runner, a fresh `init` stops the recorded
  group before the wipe, and under a live lock it leaves the gate alone. A group that survives SIGKILL is not
  reproducible, so the `lock-busy` refusal is the existing `reapOrphanGroup` path, untested here — layer product floor
  (test, not shipped)

### Not touched, on purpose

- `.claude/commands/pharn-regress.md`, `.claude/commands/pharn-verify.md` — GATE 1 Q2: unchanged.
- `MIN_CLI` — no installed path moves and no contract shape changes.
- The four trusted docs — no sentence about `stage-direct.mjs`, its lock or its call count (`LIMITS.md:696` is about
  stage agents).
- `stage-regress.mjs`, `stage-verify.mjs`, `stage-exit-core.mjs` — unchanged and called with today's argv; the
  per-gate `--timeout-ms 540000` stays (CORE-87 changes it, now free to, since no single script run has to fit a Bash
  call).

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — passed through unchanged: one `pharn-stage-exit/1` object per script
  invocation, its exit code, `continue`'s `["--resume"]` (cited, not restated — P4). The orchestrator now sees the
  final invocation's object only; a `continue` is consumed by the runner exactly as the orchestrator consumed it.
- `pharn/pharn-contracts/cost-ledger.md` — markers keep their kinds; the stage-start marker is written right before
  the first script invocation and the return marker right after the last, by the runner — the sentence is updated.

## Evals to write (P1)

No capability (`role:`) is added or changed, so no `evals/` fixture is owed. Tests in `stage-direct.test.mjs`, run
against a scratch copy of the floor with fake stage scripts driven by a fixture file (each invocation's steps, sleeps
and exit):

- C1 call count → fake slow steps totalling W; with B scaled to 2–3 s and steps sized well inside it (margins, not
  edges, against load), the CLI calls to reach a non-5 exit are ≤ 1 + ⌈W / B⌉ for several W; the control is today's
  path (the budgeted script called directly, one call per exit 5), which takes more calls for the same W.
- C2 byte identity → the same fixture through (a) the runner path and (b) today's path — the budgeted fresh call and
  `--resume` per exit 5, driven directly: the final stdout (including a `question` object's `resume.argv`, the grill's
  blocking case), every report and the gate stamp byte-equal with the clock-derived fields masked and named (GATE 1
  Q3); plus `/pharn-ship`'s answer-line rule applied to (a)'s question object yields a line `parseDirectArgs` accepts.
- C3 in-flight → a second fresh call while the runner lives, and while the start call is between spawn and lock
  handoff, exits 2 `refused (in-flight)`; every record hashed before and after.
- C4 takeover → SIGKILL the runner's group (a) before the first checkpoint → the takeover re-runs the fresh argv;
  (b) after a `continue` → `--resume`; (c) after the script exited, before the marker → no re-run; each reaches the
  same verdict object as an uninterrupted run.
- C5 return marker once → over the uninterrupted, multi-wait and three takeover paths, plus the on-disk state of a
  kill between the marker append and the `result.json` write (constructed as records, no fault hook in production):
  exactly one `orchestrator` marker per stage run.
- C6 nonce binding → a `result.json` / `state.json` with another nonce is never read, and the output carries none of
  its bytes.
- Negative controls → runner dead with its group alive → `orphaned`; `runner.json` for the other stage → `mismatch`;
  no `runner.json` → `no-run`; two waits racing to take over → one takes over, the other waits; a takeover late in a
  call → `takeover deferred`, exit 5; a setter failure in the runner → exit 2 with today's refusal line replayed;
  `--runner` with a wrong nonce; malformed and `{"toString":1}` records; a dangling symlink at each record (L54); a
  runner that finds another scope in the file at release leaves it.

## Guarantee audit (P0)

- "a second fresh call while a run is in flight is refused" → tested behaviour of an `O_EXCL` lock plus pid liveness
  and a `ps` nonce check, in unauthenticated `pharn/.run/` (L19); it excludes `stage-direct.mjs` calls from each other
  in one tree, nothing else; a reused pid without `ps` reads alive (fail-closed). Not a floor guarantee. The follow-up
  `stage-script-in-flight-guard` (same lock) stays open.
- "the wait reads only this start's result" → **agreement, never provenance**: nonce equality across files a Bash
  writer can rewrite.
- "the call count is ≤ 1 + ⌈W / 570 s⌉" → **advisory** (orchestration): holds when the orchestrator runs the pinned
  lines and the Bash tool honours its timeout; tested with fake scripts, not measured in a real run.
- "reports and stamps are byte-identical" → **tested** equality over the fixtures (C2), against today's path; the
  structural reason is that the scripts and their argv are unchanged. Not a floor reduction.
- "the return marker is written once" → tested over the named paths; markers stay advisory (`mark-phase.mjs` header).
- "the runner survives the Bash call" → **advisory**, a harness behaviour (entry-gates' measurement); a harness that
  kills it lands in the takeover path.
- "the wait decides nothing" → **tested**: it prints recorded bytes and exits with the recorded code; it never builds
  a `pharn-stage-exit/1` object.

## Trust audit (P2)

- `runner.json`, `state.json`, `result.json`, `in-flight.json`, `markers.jsonl` → unauthenticated `pharn/.run/` state;
  total parsers, closed schemas, `O_NOFOLLOW`, bounded reads; the runner re-validates its argv and never takes a path
  from a record; quoted values go through `shown()` (L62).
- The scripts' stdout → passed through byte for byte; stderr → a bounded tail, replayed. The orchestrators branch on
  the exit code and the object's enum fields only (unchanged).

## Determinism audit (P5)

Every branch is a membership or integer test: nonce equality, schema token, stage/name equality, pid liveness plus a
`ps` nonce match, process-group membership, elapsed-versus-poll, budget arithmetic, the script's exit code. Every state
the plan cannot resolve refuses with a named reason (`mismatch`, `orphaned`, `no-run`, `spawn-failed`, an unreadable
record) for a person — never a guess.

## Bounds, named

- An orchestrator that stops while a runner lives leaves it to finish the stage (each gate bounded by
  `--timeout-ms`); the next fresh call refuses `in-flight` until it ends. No `--abort` is added (P7: no observed
  failure needs one).
- A process a gate double-forks out of the runner's group escapes both the liveness and the orphan check — the same
  class as entry-gates' named bound.
- The scope release compares then clears, two steps; a setter run between them is cleared.
- stderr reaches the orchestrator only at the end, as a bounded tail; the full text is in `runner.log`.
- With no `ps` on PATH the nonce check is unavailable and a live pid reads alive (fail-closed: refuse or wait).

## Resolved at GATE 1 (2026-11-13, the human's selections)

- Q1 — CLI shape: **keep the two pinned line shapes** (fresh = start + wait, `--resume` = wait/takeover).
- Q2 — the thin callers `pharn-regress.md` / `pharn-verify.md`: **leave unchanged**.
- Q3 — criterion 2's byte identity: **compare with the clock-derived fields masked**, each named in the test.
- Re-plan after the grill: **amend and re-approve** (v2) — v2 **approved** by the human, 2026-11-13.
- PR #443 review, the gate overlap after a first-gate runner death: **"Amend plan, fix it"** (this v3) — the human,
  2026-11-13.

## Open questions (HALT)

- none — Q1–Q3 resolved at GATE 1; v2 approved; v3 approved.
