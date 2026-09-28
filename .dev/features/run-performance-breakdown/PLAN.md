# PLAN — run-performance-breakdown: stage elapsed time and deterministic work in the cost ledger

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L24, L34, L35, L36, L41, L42, L43, L58, L59, L62, L63]
- increment: extend the existing per-run cost ledger (`cost.json`) so one `/pharn-loop` or `/pharn-ship` run shows,
  beside its unchanged model usage, (a) the observed wall-clock interval of each stage execution, derived from the
  phase markers it already records, and (b) the deterministic gate work each `/pharn-regress` and `/pharn-verify`
  execution actually performed or avoided through reuse, captured by those stage scripts at the moment they finish.
- layer(s): pharn-floor (product), pharn-contracts (`cost-ledger.md`, additive)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7)

**The trigger is the maintainer's explicit direction** — this run's prompt ("PR 4: Run Performance Breakdown"),
recorded as such (P5), not a failure this plan re-derives. It follows 6.33.0 (BASE evidence reuse) and 6.34.0 (HEAD
→ VERIFY gate reuse): both optimizations are invisible after the run, because each iteration overwrites the reports
that say what was reused (below). No token or time saving is claimed for this increment; it observes.

## Confirmed current behavior (read this run, `main` at `1f6e2d6`, 6.34.0)

### What `cost.json` already records (facts) and derives (views)

- **Facts:** `requests[]` (one row per deduped request: `ts`, `model`, `sidechain`/`agent_id`, the six token
  classes, verbatim `usage`) and `markers[]` (every marker of the feature's `markers.jsonl`: `seq`, `kind`, `stage`,
  `iteration`, `ts`, `session_id`, optional `origin`/`mode`/`route`).
- **Views (recomputed by `check-cost-ledger.mjs` from `requests[]`):** `totals`, `by_model`,
  `by_stage_iteration_model`, `unattributed`; `membership` is recomputed from `markers[]` (window) and bound to the
  transcript (context, `run-window/2`).
- `requests[].stage/iteration` = the latest same-session marker at-or-before the request (`attribute()`).
- The top-level key set is CLOSED in both directions (`TOP_LEVEL_KEYS`); `/1` ledgers use `TOP_LEVEL_KEYS_V1`.

### What can already be derived, and was not

- **Stage elapsed.** Every stage the orchestrators mark is bracketed: `/pharn-loop` and `/pharn-ship` write
  `stage-start --stage <s> [--iteration <N>]` before the stage and `--kind orchestrator` right after it returns
  (pharn-loop.md 344–552, pharn-ship.md 271–566); a freshness re-run writes its own pair inside the same iteration
  (pharn-loop.md 567). So `stage-start → the NEXT marker, when that marker is the orchestrator return` identifies one
  execution deterministically, by `seq`, with no proximity guessing. Nothing computes it today.
- `/pharn-ship` writes **no** stage-start for `pharn-spec` (it is GATE 1, inline); `/pharn-loop` does. The ship spec
  interval is therefore not a stage execution and is not reported (named residual below). Quick runs write no
  `pharn-regress` stage-start, so a skipped stage has no execution row by construction.

### What cannot be recovered after the run (needs capture at the moment — L42)

- `regression-report.json` (`base_evidence {reused, miss, …}`) and `verify-report.json` (`gate_reuse {reused[]}`)
  are **overwritten in place every iteration** (the run report's own stated bound (3)); the gate-run stamps under
  `.pharn/pharn-regress/` and `.pharn/pharn-verify/` are cleared at every stage's fresh start. So for any iteration
  but the last, whether BASE was reused and how many VERIFY gates were reused is **gone** by the time the ledger is
  emitted. That is exactly the iteration where the 6.33.0/6.34.0 savings appear (iteration ≥ 2 / verify after regress).
- No gate or install duration is recorded anywhere (`run-gates.mjs` records exits and hashes only; the stage scripts
  time only their own budget).

### Where the counts live (the authoritative evidence)

- A gate-run stamp's `runs[]`: `ran: true` = a process executed; `ran: false, reason: "no-files"` = nothing to run;
  `ran: false, reason: "reused"` + `reused {…}` = a VERIFY result taken from the REGRESS/HEAD execution (6.34.0).
- `stage-regress.mjs`'s final `state.baseReuse.reused` (re-decided at "verdict") says whether BASE evidence was
  reused; on a HIT the worktree, install and base-gate phases do not run; `state.installResult` is `{ran, exit,
timedOut}` or null.

## The design

### 1. Stage executions — a VIEW over `markers[]` (no new instrumentation)

New pure module `pharn/floor/stage-executions-core.mjs`, method **`stage-start-to-return/1`**:

- Scope: `currentRunMarkers(markers)` (run-window-core's ONE definition of the current run). When
  `runWindow(markers, null)` is `unknown` (no run-start, bad run-start/run-stop ts, a marker after run-stop, stop
  before start), the view has `status: "unknown"` with that reason and no rows — never a guessed run.
- Each `stage-start` S yields one row `{stage, iteration, run, start_seq, end_seq, elapsed_ms, unmeasured, work}`.
  `run` = 1-based ordinal among rows with the same `(stage, iteration)`, in `seq` order — two executions are never
  merged. N = the next current-run marker by `seq`:
  - no N → `unmeasured: "no-end-marker"` (interrupted, or still running at emission), `end_seq: null`;
  - N not an `orchestrator` marker → `"no-return-marker"`, `end_seq: null` (the next stage-start/run-stop is NOT
    used as an end: that would be a guess);
  - `S.session_id !== N.session_id` → `"session-changed"` (the stage spanned a resume);
  - either `ts` unparseable (`tsMs`) → `"bad-timestamp"`;
  - `N.ts < S.ts` → `"clock-went-back"`;
  - else `elapsed_ms = tsMs(N.ts) − tsMs(S.ts)` (an integer; 0 only when measured equal).
    An unmeasured row carries `elapsed_ms: null`, never 0.
- `work` = indices into the ledger's `work[]` attached to this execution (§2), in ascending order.

### 2. Deterministic work — ONE record per stage execution, written by the stage script at `done`

New module `pharn/floor/stage-work.mjs` (schema `pharn-stage-work/1`), the one owner of the record:

- **Derivation (pure, from the stage's own authoritative evidence, never re-counted elsewhere):**
  `countRuns(stamp) → {required, executed, reused, no_files}` over `runs[]` (`ran:true`, `reason:"reused"`,
  `reason:"no-files"`); `required` = `runs.length`.
  - regress: `head` = countRuns(head stamp); `base` = `{evidence: "fresh"|"reused", miss, required, executed,
reused, no_files}` — on a HIT `executed: 0` and `reused = required − no_files` (every result came from the earlier
    evidence), `miss: null`; on a miss the base stamp's counts and `miss` = the decision's closed miss code;
    `install` = `null` (not performed) or `{exit, timed_out, ms}`.
  - verify: `gates` = countRuns(verify stamp) (includes `reconcile`).
  - Invariant (checked): `executed + reused + no_files === required` per side; a BASE HIT has `executed 0` and
    `install null`; a fresh BASE has `reused 0`.
- **Worktree creation is NOT a separate field** — it is performed iff `base.evidence === "fresh"` (derivable, so
  not stored twice — L35). Install "not configured" vs "skipped by reuse" is likewise derived from `base.evidence`.
- **Timing:** exactly ONE new timer — the BASE install, `performance.now()` around the one `spawnGate` that runs it,
  persisted as integer `ms` in `installResult` (so it survives a budget `continue`/`--resume`). No gate-level timer
  (named residual). `installResult.ms` is optional in `validateProgress` (non-negative safe integer when present);
  `regress-base-reuse-core.mjs buildRecord` copies only `{ran, exit, timedOut}`, so the reuse REQUIREMENT is unchanged.
- **Write:** appended as one JSON line to `<.pharn/cost>/<feature>/work.jsonl` (mark-phase's `DEFAULT_BASE`,
  imported — L41), beside `markers.jsonl`, after the stage's report/render are written and before its `done` emit.
  `ts` = `new Date().toISOString()` (the marker clock), `session_id` = `CLAUDE_CODE_SESSION_ID` or null.
  **Observational only:** the append is best-effort; any failure (a symlinked `.pharn`/`.pharn/cost`/feature dir or
  file — lstat walk + `O_NOFOLLOW`, L54/L59 —, EACCES, a malformed stamp) prints one stderr note and the stage still
  emits its unchanged `done`. Only `done` writes one; a refused/unusable/crashed/`continue` exit writes none (so an
  execution that ran gates then refused shows `work: []`, i.e. "not recorded", never zero).

### 3. The ledger (`render-cost-ledger.mjs` / `check-cost-ledger.mjs`)

- Two new top-level keys, emitted on every `/2` ledger from 6.35.0: `executions` (the view:
  `{method, status, reason, rows}`) and `work` (the facts: validated records inside the run window —
  `isMember(win, ts, session_id)`, the same membership test requests use). `TOP_LEVEL_KEYS` gains both; the checker
  accepts EXACTLY `TOP_LEVEL_KEYS` or `TOP_LEVEL_KEYS_PRE_WORK` (both keys absent — a pre-6.35.0 `/2` ledger), so
  closure holds in both directions and old ledgers stay GREEN. `/1` key set unchanged (derived minus all three).
  **No schema bump:** additive, no existing field changes meaning.
- The shells (`unavailable`, context-unknown) carry them too: timing needs only markers, so a run whose transcript
  is missing still reports elapsed time.
- Checker: `work[]` rows validated with `stage-work.mjs validateWork` (closed keys, invariants); each row a member
  of the recomputed window; `executions` deep-equal to `buildExecutions(markers, work)` (mutating any row → RED).
  `--verify-transcript` is unchanged: it compares requests/membership only (work/executions are not
  transcript-derived — L63's enumeration, below).
- A `work.jsonl` line that fails validation is not a row; its line index is listed in `dropped[]` as
  `work[<n>]` (no raw value reaches the file).
- `serializeLedger`: `work` joins `ROW_ARRAYS` (one record per line); `executions.rows` one row per line.
- `table()` (the stop's screen copy) gains an ELAPSED block and a WORK block.

### 4. The run report (`render-run-report.mjs`)

New section `## Stage elapsed and deterministic work` after `## Tokens …`: copies `cost.json`'s stored
`executions` and `work` (never recomputed — the report's bound (2)), labelled "observed wall-clock between PHARN's
markers — not CPU, model or tool time, not monotonic", `unmeasured — <reason>` for every unmeasured row, and one
line per work record. A ledger without the keys renders `n/a — cost.json predates 6.35.0`.

## Files

- `pharn/floor/stage-executions-core.mjs` — NEW: the executions view (pairing + work attachment), pure
- `pharn/floor/stage-executions-core.test.mjs` — NEW: pairing cases, reruns, quick, interrupted, ambiguity
- `pharn/floor/stage-work.mjs` — NEW: the work record (schema, derivation from stamps, validate, append, read)
- `pharn/floor/stage-work.test.mjs` — NEW: derivation, invariants, hostile lines, symlink refusal
- `pharn/floor/render-cost-ledger.mjs` — read `work.jsonl`, emit `work` + `executions`, key sets, serializer, table
- `pharn/floor/render-cost-ledger.test.mjs` — emission, byte-stability of existing views, shells
- `pharn/floor/check-cost-ledger.mjs` — the two accepted key sets, work validation + membership, executions recompute
- `pharn/floor/check-cost-ledger.test.mjs` — mutation controls, pre-6.35 ledger GREEN
- `pharn/floor/render-run-report.mjs` — the new section
- `pharn/floor/render-run-report.test.mjs` — the section, the closed SECTIONS set
- `pharn/floor/stage-regress.mjs` — install timer; append the work record at done
- `pharn/floor/stage-regress-core.mjs` — `installResult.ms` optional in `validateProgress`
- `pharn/floor/stage-regress.test.mjs` — work record: fresh BASE, reused BASE
- `pharn/floor/stage-verify.mjs` — append the work record at done
- `pharn/floor/stage-verify.test.mjs` — work record: fresh gates, partially reused gates
- `pharn/pharn-contracts/cost-ledger.md` — new section "Stage executions and deterministic work (6.35.0)"
- `.dev/features/run-performance-breakdown/demo.mjs` — NEW: the controlled end-to-end fixture
- `.dev/features/run-performance-breakdown/DEMO.md` — NEW: its output and the five answers
- `.dev/features/run-performance-breakdown/PLAN.md` — this plan
- `CHANGELOG.md` — `[6.35.0]`
- `SKILLS_VERSION` — 6.35.0 (minor: a newly shipped capability on the floor)
- `README.md` — the version badge; the CURRENT-STATE region regenerated
- `CLAUDE.md` — the cost-ledger paragraph gains the executions/work note
- `docs/capabilities/**` — regenerated by `npm run docs:generate`
- `.dev/floor/command-hygiene.test.mjs` — apparatus, only if a pinned expectation over the touched modules moves

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md` — extended additively (two keys, a closed pre-6.35 alternative).
- `regression-report.md`, `verify-report.md`, `gate-run-record.md`, `stage-exit.md` — unchanged: no report,
  stamp, exit or verdict field moves.

## Tests and negative controls (the build must deliver each)

- Timing: normal completed stage; three iterations; same-stage re-run in one iteration (`run` 1 and 2, not merged);
  missing end (last stage-start, no later marker); next marker a stage-start (no return); run-stop directly after a
  stage-start; session change; bad ts; clock going back; unknown current run (no run-start / marker after stop);
  quick (no regress rows); interrupted run (open window) keeps every completed row.
- Unknown ≠ zero: every unmeasured row has `elapsed_ms === null`; a measured equal-ts pair is `0`.
- Model accounting unchanged: over the existing fixtures, `requests`, `totals`, `by_*`, `unattributed` and
  `membership` of a ledger rendered with and without a `work.jsonl` are identical (✧), and `attribute()` agrees with
  the new core's latest-marker rule (✧ parity).
- Work facts: fresh BASE (executed = required − no_files, install recorded), reused BASE (executed 0, install
  null), fresh VERIFY (reused 0), partially reused VERIFY (reused > 0) — from the real stage scripts where the
  existing suites already build those scenarios.
- Checker mutations: an `executions` row edited (elapsed, run, work index), a work count broken (invariant), a work
  row outside the window, an extra/missing key (only one of the two new keys) → RED; a pre-6.35 `/2` ledger → GREEN.
- Hostile `work.jsonl`: torn line, prototype keys, huge ints, strings in counts, extra keys → not a row, listed.
- The stage exit is unchanged when the append fails (planted symlink at `.pharn/cost`).

## Measurement

`demo.mjs` builds a controlled run (markers + a synthetic transcript + work records from real stamp shapes) and
renders the ledger and report; it times `buildExecutions`/`readWork` over a 1,000-marker/1,000-record input and the
full render+check with and without work, and reports the added cost. Bounded structurally: one extra file read per
emission, O(markers + work) pairing, no transcript pass, no gate re-run, no model call.

## Guarantee audit (P0)

- **FLOOR:** the executions view is a pure, deterministic function of `markers[]`+`work[]` in the file, and the
  checker holds the stored view to a recompute (primitive #3 + integer compare). The work record's shape and
  invariants are enum/integer checks. The counts are derived by tested code from the stamp the stage just finished.
- **ADVISORY:** that the markers describe the run (L19 — Bash-written, as today); that `elapsed_ms` is the stage's
  real duration (two wall-clock reads by two processes; not monotonic, includes waits, orchestration, human
  answers); that a work record was written for every execution (a stage stopped before `done` writes none); that
  `work.jsonl` was not edited (`.pharn/` is Bash-reachable, LIMITS §6 — agreement, never provenance, L43).
- **Struck:** "stage time = model time + tool time"; any efficiency score; any price.

## Trust audit (P2)

`work.jsonl` is untrusted `.pharn/` state: every value is type- and domain-tested before use (`cost-value-core`
predicates, L62); a failing line is dropped by index. Nothing in it reaches any verdict, exit code, reuse decision,
route or commit gate: the only readers are the ledger emitter/checker and the run report.

## Determinism audit (P5)

Pairing is by `seq` order and exact kind membership; attachment uses the latest-marker-at-or-before rule already
used for requests. No proximity window, no clock read in the view.

## Applied lessons

- L24: the overhead claim is MEASURED on a constructed large input, not inherited.
- L34: every per-row assertion in the checker also asserts the empty case agrees (empty rows ↔ `status`).
- L35: worktree/install-skip are derived from `base.evidence`, not stored twice; the report copies the views.
- L36: the two accepted top-level key sets are exact sets, never "presence of".
- L41: `.pharn/cost` is imported from `mark-phase.mjs`, no second literal.
- L42: per-iteration reuse facts are captured at `done`, because the reports are overwritten afterwards.
- L43: the checker certifies agreement between `executions` and the file's own facts — never that the markers are true.
- L58: the recompute uses the ledger's RECORDED `markers[]`/`work[]`, never the still-growing live files.
- L59: the append refuses a symlinked component and opens with `O_NOFOLLOW`.
- L62: hostile `work.jsonl` values go through non-throwing predicates before any coercion.
- L63: enumerated re-derivations of the touched values — `requests[].stage` (untouched, parity test), `membership`
  (untouched), `--verify-transcript` (compares requests/membership only; `work`/`executions` are not transcript-derived).

## Named residuals (not closed here)

- `gate-process-duration` — no per-gate timer; VERIFY/HEAD/BASE gate time is inside the stage's elapsed only.
- `ship-spec-elapsed` — `/pharn-ship` marks no `pharn-spec` stage-start (GATE 1); adding one would change stage
  token attribution, which this increment must not do.
- `work-on-non-done-exit` — gates executed by a stage that then refused/crashed are not recorded.
- `work-record-provenance` — a Bash writer can forge `work.jsonl` (as `markers.jsonl` today).

## GATE 1

Plan acceptance was **delegated to the orchestrating model** by the maintainer's prompt ("Do not stop after writing a
PLAN. Complete implementation, validation and final diff review"). Recorded as a delegated decision, not a human
approval.

## Open questions (HALT)

- none — every choice above has a stated default the prompt allows; the maintainer reviews at GATE 2.
