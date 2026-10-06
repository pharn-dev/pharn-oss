# Floor CLI reference — /pharn-loop and /pharn-ship stops, records, ledgers and routing

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before planning a change to, running, or citing one of the CLIs below.

Read only the section for the CLI you are touching. Positional words inside an entry (`above`, `below`, `further up`)
come from the single code block this text was moved from, so the entry they name may now sit in another
`.dev/guides/floor-*.md` file: search for it by file name.

## `check-loop.mjs` — the /pharn-loop stop core

```bash
# THE /pharn-loop STOP CORE — Design C over the FLOOR verdicts, in a table chosen by the SPEC's kind (6.28.0).
# Decides every stop: INCONCLUSIVE (exit 2, bad input) · STOP_TERMINAL (4: unmeasured, an ac-evidence red, a reconcile
# red — `terminal_cause` names which) · the green (0) · CONTINUE (3, a measurable red under the cap) · STOP_CAP (1).
# THE STRUCTURAL CLAIM, restated exactly: its inputs are the two verdict reports, --iter / --cap, and ONE token of the
# feature's own SPEC — its spec_kind, read by pharn/floor/loop-mode-core.mjs (the one kind reading check-spec.mjs
# --spec-kind prints) from the SPEC.md beside the verify report — which chooses the table: verify-only for `quick`
# (/pharn-loop --quick), where the regression report is NEVER opened and the green is STOP_GREEN_QUICK, which is NOT
# STOP_GREEN; the full table for every other SPEC, byte-identical to 6.25.0. No review, finding, severity, record or
# fingerprint input, so no advisory stage can gate the stop. No argv selects a table (every flag but --iter/--cap is
# refused); the reader is loaded with import() and a failure to load reads FULL, the stricter table (D3) — though a
# /pharn-loop run meets check-loop-fresh.mjs first, which imports it statically and stops at S11 (checker-crashed).
# The token is bound to the kind at the floor, both ways (tested). Output gains `mode` (null only on an argv refusal).
node pharn/floor/check-loop.mjs <verify-report.json> <regression-report.json> --iter <N> --cap <M>
```

## `check-loop-fresh.mjs` — freshness

```bash
# FRESHNESS — /pharn-loop reads a stop only from evidence that belongs to THIS tree (added 6.10.0).
# THE RECORDED FAILURE (P7): CHANGELOG 6.3.0's unattended /pharn-loop run skipped /pharn-grill, /pharn-regress
# and /pharn-verify and still wrote a floor-grade-looking decision. #222 re-derives a decision from the reports
# it cites; #230 made the gate map tested code and wrote `fingerprint.final` "for a later increment". So an
# iteration that skipped a stage still found the PREVIOUS iteration's report and stamp, and nothing noticed.
# This is that later increment — a SEPARATE checker read BEFORE check-loop.mjs, because check-loop.mjs's inputs
# (the two verdict reports, iter/cap and ONE token of the SPEC — its spec_kind — since 6.28.0) are a load-bearing
# structural claim a filesystem input would break. QUICK COLUMN (6.28.0): the checker reads the same kind; for a
# `quick` SPEC checks A, B, C, D, J and E read the verify evidence ALONE, G and H read `skipped` (QUICK_SKIPPED), F and
# I run as in full mode, and stale regress evidence on disk is never opened; the document gains `mode` (last key; null
# on a usage error or checker-crashed). THE CHECKS, first failure decides, fabrication (J/E/H) before staleness (F/G):
#   A reports exist + parse (RERUN report-missing|report-malformed) · B a report reason_code in LAPSE_CODES
#   (RERUN; empty-source-set → STOP, the command maps it to S4; any other member → STOP) · C each of the three
#   stamps validates (missing/lapse RERUN, else STOP) · D report.gate_run.stamp_sha256 == sha256(stamp bytes)
#   (RERUN report-stamp-unbound) · J every recorded stdout/stderr sha256 == its log on disk (STOP
#   output-hash-mismatch — that member's FIRST emitter) · E a LIVE spawnSync re-run of check-verify.mjs
#   --stamp / check-regress.mjs verdict reproduces the report's FLOOR fields (STOP report-verdict-mismatch) ·
#   H base stamp head == --base (STOP) · F verify stamp {algo, final} == the live fingerprint (RERUN verify
#   tree-moved-since-verify) · G regress head final == verify init (RERUN regress) · I (--front) the three
#   front checkers exit 0, GRILL.md exists and check-test-stage exits 0 (6.19.0) (STOP front-stage-red; since
#   6.20.0 a check-test-stage RED is STOP ac-evidence-invalid, which /pharn-loop maps to S13).
# THE BUDGET IS A COUNTER, NOT PROSE: .pharn/pharn-loop/<name>/freshness.jsonl, one row per authorized re-run,
# --max-reruns (default 1) per (iter, stage), then STOP rerun-budget-exhausted; --commit-gate never re-runs and
# never writes a row (a RERUN-class cause becomes STOP with its own code). The ledger path is lstat-checked
# for symlinks INCLUDING a dangling one (existsSync follows a link, so a dangling one read as absent and the
# append wrote through it — caught by its own test). Wiring: Step 5 sub-step 3 (`--iter <N> --front`) and the
# FIRST line of Step 6c (`--commit-gate --front`); a RERUN re-invokes that stage inside the same iteration;
# a STOP / INCONCLUSIVE is S11 `blocked: stale-evidence` (S4 for empty-source-set); a stale commit gate is
# `not committed: evidence stale`. The pinned lines are EXECUTED by the suite (★ WIRING, L45).
# BOUNDS, each stated in the header and the contract: TREE IDENTITY, NOT RECENCY (an iteration whose build
# changed nothing reuses old evidence — a test PINS it; closing it needs transcript binding, a PENDING
# follow-up); AGREEMENT, NEVER PROVENANCE (a self-consistent fabricated stamp/log/report set over the live
# tree passes — every fixture in the suite IS one, L43); it runs from the worktree and cannot vouch for
# itself; the ledger is unauthenticated `.pharn/` state Bash reaches (LIMITS.md §6); GRILL.md presence is
# membership only; markers are not consulted. A gate whose DETACHED descendant keeps writing its log after
# exit trips J — named, not a mystery. Mutating gates do NOT trip F: F compares verify's FINAL fingerprint.
# Exit: 0 FRESH · 1 RERUN `stage_to_rerun` · 2 INCONCLUSIVE (unusable input, fail-closed) · 4 STOP. Since 6.21.1
# check-loop-fresh.mjs is a CLI entry with NO static import that loads the checker (pharn/floor/loop-fresh-core.mjs) with
# import(): a module that cannot load, a throw while checking, or a result outside the checker's contract is
# INCONCLUSIVE `checker-crashed` (S11), not node's exit 1 — which is the RERUN code — with no JSON. The result check
# reads the SERIALIZED document (JSON drops an undefined key). Residuals (the entry file itself unloadable, a forced
# process exit, an unsettled top-level await, a signal) are in check-loop-fresh.mjs's header.
node pharn/floor/check-loop-fresh.mjs --feature <name> --base <40-hex> (--iter <N> | --commit-gate) [--front] [--repo <dir>] [--verify-stamp <p>] [--regress-head-stamp <p>] [--regress-base-stamp <p>] [--max-reruns <R>]
```

## `require-loop-record.cjs` — the /pharn-loop stop guard

```bash
# The /pharn-loop STOP GUARD (added 6.11.0) — a turn end during an open unattended run requires a record.
# THE GAP (P7): after #230 (gate map is tested code) and #242 (a stale stage is re-run), nothing stopped the
# model from ENDING THE TURN anyway — the §6.3.0 incident was a run that finished early with a summary naming
# the gates it skipped. `.claude/hooks/require-loop-record.cjs` is a Stop hook: while `.pharn/pharn-loop/<name>/
# active.json` (written by `--open` at /pharn-loop Step 1a, removed by `--close` in its Final step — ONE file owns
# the schema, L35) names THIS session, the run has a feature directory, and `pharn/features/<name>/LOOP.md` is
# absent or empty, it refuses the turn end — K = 3 per (session, run) in TOTAL (PHARN_STOP_GUARD_MAX 1..7, kept
# under the platform's documented "ends the turn after 8 consecutive blocks"), then ALLOWS with a
# `systemMessage` saying the run ended without a record. INERT for another session, a null session (the env
# var was unset at --open), plan mode, a marker older than 24 h, and a run with NO feature directory (a stop
# there writes no record by the command's own rule — GRILL finding 1). It NEVER judges record quality (a
# LOOP.md check-loop-record.mjs would RED still ends the turn) and never checks freshness.
# CHANNEL: exit 0 with `{"decision":"block","reason":…}` — NOT exit 2 — because the guard FAILS OPEN (the
# opposite of the write guards): only a complete, parsed JSON document blocks, so a crash, a partial write or
# any non-zero exit is non-blocking by the platform's own rules. The refusal renders as a "Stop hook error"
# (cosmetic, anthropics/claude-code#34600; `additionalContext` is the documented non-error alternative).
# WHAT IT CANNOT DO (verbatim from its header): make a model do work; judge a record; tell a real record from
# a fabricated one (`touch LOOP.md` satisfies it); act when Claude Code does not start it (LIMITS.md §7);
# reach an existing install except by hand (`pharn update` never edits settings.json). As of 6.12.0 the
# shipped `.claude/settings.json` WIRES it (matcher-less, exec form, timeout 10); hook-wiring.test.cjs
# binds the committed file to that entry. SESSION BINDING IS OBSERVED, NOT PROBED: CLAUDE_CODE_SESSION_ID
# in a Bash call equals the session's id, but no live Stop event was fired until wiring landed — if the
# payload's id ever differs, the guard is INERT (fail-open, silently useless), and follow-up
# `stop-guard-live-probe` checks it once wired. Inert-path cost: ~0.03 ms in-process; a spawn is node's
# own startup (~70 ms). Exits for a person: `--close <name>`, interrupt, or unwire — a model reaches the
# first and third through Bash too (LIMITS.md §6).
node .claude/hooks/require-loop-record.cjs --open <name> --cap <M>   # /pharn-loop Step 1a
node .claude/hooks/require-loop-record.cjs --close <name>           # /pharn-loop Final step
```

## `check-loop-record.mjs` — loop-record shape

```bash
# Check the SHAPE of a loop-record — the pharn/features/<name>/LOOP.md that /pharn-loop writes at every stop.
# Floor: the frontmatter envelope (`decision` in {STOP_GREEN, STOP_GREEN_QUICK, STOP_CAP, STOP_TERMINAL, INCONCLUSIVE};
# `iterations` a positive integer; `commit` a git SHA or the literal `unknown`; `date` ISO YYYY-MM-DD; and,
# when present, `cap` — the loop's --max-iter — a positive integer, and (6.28.0) `mode` in {full, quick} — absent
# means full; it records the run's INVOCATION, never a copy of check-loop.mjs's JSON — with ONE cross-field rule:
# STOP_GREEN_QUICK requires mode: quick, STOP_GREEN forbids it) plus an unambiguous `## Handoff` —
# exactly `### investigated`, `### learned`, `### next_steps`, in that order, no extras/duplicates, each with
# a non-blank body. ADVISORY (never checked BY THIS CHECKER): whether the Handoff is TRUE, whether `decision`
# AGREES with what check-loop.mjs emitted (check-loop-decision.mjs, below, is the one that asks), or whether
# any run reads it. NOT an input to check-loop.mjs — the record can never influence the stop. Exits non-zero
# on RED.
node pharn/floor/check-loop-record.mjs <LOOP.md>
```

## `check-loop-decision.mjs` — re-derive a loop decision

```bash
# RE-DERIVE a loop-record's `decision` (added 6.3.0): does it reduce, via a LIVE re-run of check-loop.mjs against the
# reports the record cites, to the token it recorded? Floor (primitive #3): shells check-loop.mjs as a CLI (spawnSync,
# never a sibling import) with the record's own `iterations` and `cap` and compares tokens. A mismatch, a missing or
# malformed report, or a NON-BLOCKED record with no `cap` (optional to check-loop-record.mjs, required here) is RED,
# fail-closed. A blocked stop (INCONCLUSIVE + a `blocked` key) never consulted check-loop.mjs and is SKIPPED, GREEN.
# Since 6.28.0 the record's optional `mode` (absent = full) must ALSO equal the mode the live re-run reports — the table
# the SPEC's kind selects, read in any state (Step 6a's Draft revert never touches the kind line) — else RED
# MODE_MISMATCH: a run invoked without --quick over a quick SPEC ends there, uncommitted. Agreement between files,
# never provenance (L43); a quick line cites verify-report.json alone.
# Runs strictly AFTER a stop exists and gates only /pharn-loop's Step 6c commit, never the stop: a green stop whose
# re-derivation is RED is not committed ("not committed: decision unverifiable"). BOUND, and the point: it proves the
# decision is RE-DERIVABLE from the cited reports, NOT that the reports are honest — a self-consistent forged pair
# still passes — and the ACT of running it is command prose (advisory); only its verdict is floor. Exit: 0 GREEN or
# SKIPPED · 1 RED.
node pharn/floor/check-loop-decision.mjs <LOOP.md>
```

## `loop-closeout.mjs` / `ship-closeout.mjs` — the closeouts

```bash
# THE CLOSEOUTS (6.44.0, loop-closeout-script) — /pharn-loop's close after the model writes LOOP.md, and /pharn-ship's
# Step 3a, each as ONE tested line instead of 16 / 6 pinned blocks (each block was a model request at the run's largest
# context). loop-closeout runs, in the close part's former order: check-loop-record (RED → exit 5, nothing else ran;
# repair, re-run with --after-repair), check-loop-decision (blocked → N/A), run-stop, ledger + check + report (report
# skipped for a quick record), then on a green token agreeing with the record's mode: check-loop-fresh --commit-gate
# --front, the --from-plan setter + --amend-scope, the staging list (the former inline builder, lstat-based — L54),
# branch, add, commit (or the former undo), the freshness ledger, and on exit 0/3 the Final step's two releases. Exit:
# 0 committed · 3 not committed, final · 4 not committed with a model write owed (Step 6d; also a non-green record over a
# still-Approved SPEC) · 5 record RED · 2 refused, nothing ran · else a crash, never a commit decision. ship-closeout
# runs run-stop, run-marker --close, rev-parse HEAD (or `unknown`), ledger + check + report (quick read from the
# run-start marker); exit 0 always (nothing gates) · 2 refused; it holds NO git write (a source scan). The shared steps
# live once in closeout-core.mjs. Last stdout line: one JSON document, closed keys. FLOOR: tested code over floor
# verdicts (the green-token enum, the two checkers' exits); ADVISORY: that a run invokes the line and runs no git of its
# own. C2's audit bar was met by 1 of 3 real runs; adopted at the user's request (CHANGELOG [6.44.0]).
node pharn/floor/loop-closeout.mjs --feature <name> --base <40-hex> [--after-repair]
node pharn/floor/ship-closeout.mjs --feature <name>
```

## `mark-phase.mjs` / `render-cost-ledger.mjs` / `check-cost-ledger.mjs` — the cost ledger

```bash
# The COST LEDGER trio (added 6.5.0) — `pharn/features/<name>/cost.json`. TWO commands emit one, and the
# set is named here so a third is a deliberate addition: /pharn-loop at EVERY stop that has a feature dir,
# green or not; /pharn-ship (6.7.0) at EVERY exit that ends the run — GATE 2 and every STOP — from its
# Step 3a, positioned BEFORE its attestation step, because Step 3b can itself STOP on a stale/malformed
# verdict and can halt on ship.requireAttestation, so an emission after it would be skipped on exactly
# the paths it exists to cover. Contract: pharn/pharn-contracts/cost-ledger.md.
# WHY MARKERS EXIST, measured not assumed: the platform's `attributionSkill` names the ORCHESTRATOR and
# never the sub-stage — on this repo's loop-decision-integrity run it tagged 213/275 deduped requests and
# tagged EVERY one of them `pharn-loop`. So "which stage" is a fact about a MOMENT; mark-phase records it
# then. It is command-neutral, and since 6.7.0 /pharn-ship DOES reuse it unchanged — no second copy, no
# fork, no parameterised variant. `ts` from Node toISOString() because BSD
# `date` has no %N. RECORD FACTS, DERIVE VIEWS: `requests[]` + `markers[]` are the facts, and all four views
# are pure functions of requests[] — which is what lets the checker recompute and compare.
# FLOOR: a CLOSED top-level key set (both directions — a presence set would admit a variant spelling, L36);
# every `usage` leaf number|bool|null|short-token, anything else DROPPED with its key path listed (arrays are
# WALKED, so `usage.iterations[]` survives and "verbatim" stays true); NO string anywhere matching the
# absolute-path regex; unique request ids; strictly increasing marker seq; every view == a recompute.
# "No message content, no home paths" is a CONSEQUENCE of those rules, NOT a detector — and "no usernames"
# is STRUCK and written nowhere, because no regex proves it (P0).
# THE CHECKER'S BOUND (L43), in its header AND its stdout: it certifies INTERNAL CONSISTENCY, never that
# requests[] matches the transcript — a self-consistent FABRICATED ledger passes, and a test proves it by
# building one. `--verify-transcript` re-derives the rows live and is usable ONLY while the transcript
# exists (machine-local, perishable), which is exactly why it is not a gate.
# TOKENS ONLY, no price table ever: cost = Σ tokens[class] × price(model, class, date, tier) from the
# READER's own list, list-price equivalent (a subscription is not billed per token); output_thinking is a
# SUBSET of output, not a seventh class. ANNOTATES, gates NOTHING (fix #3) — a RED ledger never blocks the
# Step 6c commit, which stays gated on a green stop (STOP_GREEN, or STOP_GREEN_QUICK under --quick) ∧ the decision
# re-derivation.
# The EMITTER WRITES cost.json ITSELF (render-review-assignments precedent — a model never retypes hundreds
# of numbers), so it is a BASH write outside fix #7 (L19), declared in the plan and exempted by name in
# reconcile-ignore.json. Transcript location, the walk and the per-request reader `sessionRequests()` live in
# pharn/floor/transcript-core.mjs (6.24.1), which BOTH renderers import, never copy (L35). The reader owns the
# counting rule, defined in cost-ledger.md "One row per request": one entry per request, identity and timestamp
# from its FIRST transcript line, usage from its line with the most output tokens, because one request's lines
# need not carry the same usage (until 6.24.1 both renderers kept the first line and under-counted output). A
# request can still be growing when a ledger is emitted, so --verify-transcript compares ROWS, with output and
# output_thinking bounded as recorded <= re-derived (L58, L63). A ✧ parity test pins the two renderers to agree on
# totals with the class-name mapping asserted explicitly. That is agreement only (L43): it stayed green while both
# under-counted.
# SIZE, disclosed rather than discovered — in LINES as well as bytes since 6.14.1. Lines in a PR diff were
# the cost that hurt: the old fully pretty-printed layout spent about 52 lines per request row. The emitter's
# `serializeLedger` now writes the two FACT arrays (markers[], requests[]) one element per `\n`-delimited
# line and pretty-prints the rest, and the parse is unchanged. The dated before/after measurements (lines and
# bytes) live only in the contract's "Size" section (L35), so read them there rather than restating them. The
# verbatim `usage` copy is still most of the BYTES, weighed and accepted for fidelity.
# A stop BEFORE S2 has no feature dir and records nothing; that bound is named in the command.
# RUN-SCOPED since pharn-cost-ledger/2 (6.9.0): rows and every view count only requests INSIDE the run
# window (`run-window/1`, ONE implementation in pharn/floor/run-window-core.mjs, imported by emitter AND
# checker). Before it, markers decided only the stage VIEW, so 100 unrelated input tokens earlier in the
# session + 10 in the run reported 110, GREEN. Window = last run-start → last run-stop, each session
# opening at its first current-run marker; a skipped/malformed/ambiguous boundary is `unknown` →
# `unavailable` with NO rows (never whole-session usage, never a fake zero). /pharn-ship calls
# `mark-phase.mjs --pending-start` BEFORE /pharn-spec (which is what names <name>), and ONLY its named run-start
# adopts it (`--adopt-pending`, opt-in; `origin: "pending"`), so an abandoned ship cannot widen a loop. /1 ledgers are validated under their own rules and WARNed SESSION-scoped,
# never rewritten. Membership is exact relative to the RECORDED markers only (marker execution is advisory).
# CONTEXT-SCOPED since 6.29.0 (membership `run-window/2`, same module). THE RECORDED FAILURE (P7): a subagent's
# Bash sees its PARENT's session id, so three concurrent /pharn-loop agents of one session counted each other's
# rows and the main thread's (.dev/measurements/cost-ledger-run-scope-2026-09-27.md). Now a window member counts
# only when its CONTEXT — the session's own thread or one agent, read from `isSidechain`/`agentId` and required to
# agree with the file it sits in — is in the run's set: the ONE context whose TOOL RESULTS carry, as a whole line,
# a line mark-phase printed for this run, plus the agents that context tree spawned inside the window (meta
# `toolUseId` → the one other holder of that tool_use). No holder, two holders, or a window member that cannot be
# placed → `unknown` (no rows), never a guessed row. `markerLine()` in mark-phase.mjs is the ONE encoding the CLI
# prints and the emitter rebuilds; changing it changes membership for every later ledger (a golden pins the bytes).
# `run-window/1` ledgers keep their seven keys and a not-context-scoped WARN; --verify-transcript REDs one holding
# other contexts' rows. ADVISORY: the transcript layout (undocumented, machine-local) and that the marker output
# reached the calling context's own tool result — the contract's "Run membership" carries the bounds.
# STAGE ELAPSED AND DETERMINISTIC WORK (6.35.0, run-performance-breakdown) — two additive `/2` keys, no schema bump.
# `executions` is a VIEW over markers[] (pharn/floor/stage-executions-core.mjs, method `stage-start-to-return/1`): each
# current-run stage-start is one row, ended ONLY by the next marker when it is the orchestrator return; a re-run is
# `run 2`, never merged; anything else is unmeasured with a closed reason and `elapsed_ms: null` (never 0, never a
# guessed end). OBSERVED WALL CLOCK between two processes' toISOString() reads — not CPU/model/tool time, not
# monotonic, never decomposed. mark-phase.mjs and its printed binding line are UNCHANGED. `work[]` is FACTS: at `done`
# stage-regress.mjs / stage-verify.mjs append one `pharn-stage-work/1` line to `.pharn/cost/<feature>/work.jsonl`
# (pharn/floor/stage-work.mjs, the one owner), counted from the stamp the verdict used — executed / reused / no_files /
# required, BASE `fresh|reused`, the install's exit and ms (the ONE new timer). Best-effort and OBSERVATIONAL (no
# exit, verdict, reuse, route or commit reads it); only a `done` exit writes one. check-cost-ledger rule 9 validates
# the rows and recomputes `executions`; /2 admits exactly the current key set or the pre-6.35.0 one. Contract:
# cost-ledger.md "Stage executions and deterministic work".
# Exit: mark-phase 0 ok · 2 bad usage (nothing written) | render 0 (incl. an honest `unavailable`) · 2 bad
# usage | check 0 GREEN (WARNs possible) · 1 RED · 2 unusable input.
node pharn/floor/mark-phase.mjs --name <slug> --kind <run-start|stage-start|orchestrator|run-stop> [--stage <s>] [--iteration <n>] [--base <dir>] [--mode <m>] [--route <token>]
node pharn/floor/mark-phase.mjs --pending-start [--base <dir>]   # ship only; its run-start adds --adopt-pending
# `--mode` (6.25.0): run-start only, m in MARKER_MODES ({"quick"}) — /pharn-ship --quick's one caller. Absent
# writes no `mode` key at all (byte-identical to pre-6.25.0). Read by ship-outcome-core.mjs's runMode(), never
# re-derived from the SPEC's spec_kind (a quick SPEC may still run the full pipeline).
# `--route` (6.27.0): stage-start only, a route-token-core.mjs token (`agent:<alias>` | `inline:<reason>`) — the
# route /pharn-ship or /pharn-loop REQUESTED for that stage (stage-agent.mjs, above). Absent writes no `route` key
# (byte-identical to pre-6.27.0); normalizeMarkers keeps it only as a valid token, so cost.json carries it beside
# each request's SERVED model, and no other re-derivation of markers[] reads it (a test pins that, L63).
node pharn/floor/render-cost-ledger.mjs <name> [--base <dir>] [--repo <dir>] [--session <id>] [--stdout]
node pharn/floor/check-cost-ledger.mjs <cost.json> [--verify-transcript]
```

## `ship-outcome-core.mjs` — a /pharn-ship run's ledger outcome

```bash
# DERIVE a /pharn-ship run's ledger `outcome` (added 6.7.0). ITS OWN MODULE, not a second function in the
# emitter: render-cost-ledger.mjs changes when the ledger SCHEMA changes, this changes when /pharn-ship's
# CONTROL FLOW changes — two reasons, two files (P3), the plan-files-core.mjs precedent, raised at grill
# BEFORE the build rather than at review. /pharn-loop DECLARES its decision in LOOP.md and the emitter
# merely COPIES it; ship has no such record, so this DERIVES from the run's own verdict reports and phase
# markers — NEVER SHIP.md prose, which is a roll-up ABOUT a run, not a declaration of one (L6).
# TWO HALVES, never averaged (P0): `gate2` is FLOOR (verify PASS ∧ regress no-regressions — two enums from
# tested non-LLM checkers); `gate2-quick` (6.25.0, /pharn-ship --quick) is FLOOR TOO, over a SMALLER stage
# set — verify PASS on the run's own pharn-verify stage ALONE, the regression verdict never consulted,
# because a quick run starts no /pharn-regress at all; NOT `gate2` — every consumer compares `decision` by
# equality, never by prefix. `stop:<stage>` is ADVISORY IN ITS STAGE NAME (the last stage-start marker,
# Bash-written command prose — L19), though that the run MISSED the gate2/gate2-quick test is a membership
# fact; `stop:unknown` is the terminal fallback; `undetermined` (6.9.1) = markers exist but the run window is
# unknown, so no verdict can be bound to the run. APPLICABILITY (6.9.1; forked by MODE in 6.25.0): the stage
# set a gate2-family test needs is the run's OWN mode (runMode(), read from the run-start marker, never the
# SPEC's spec_kind — a quick SPEC may still run the full pipeline) — a FULL run needs BOTH pharn-regress and
# pharn-verify stage-starts in the CURRENT run (latest run-start, run-window-core's one definition) at its
# latest iteration; a QUICK run needs pharn-verify ALONE, because it never starts pharn-regress. Either way
# each counts only AFTER that iteration's latest pharn-build stage-start, and a non-verdict stage started
# twice at one iteration (what a SKIPPED run-start can leave when two invocations' markers run together) is
# `undetermined` — both added at 6.25.0's GATE 2 (review F1: a quick run whose run-start was skipped, after
# an unclosed earlier run, derived gate2 from that run's regress@1, since iterations restart at 1). An
# earlier run's green reports left on disk no longer count, and a /pharn-ship ledger never copies a
# LOOP.md (source chosen by --command). Residual, pinned by a test: a stage that starts then refuses leaves
# the old report, which is accepted. The stage token is re-tested at READ time, never trusted from
# the writer, because markers.jsonl is ordinary .pharn/ state a Bash write reaches (LIMITS.md §6).
# A SKIPPED OR WRONG MODE MARKER NEVER YIELDS gate2: a quick run-start written without --mode quick reads as
# full and has no regress stage-start (stop:pharn-verify); a skipped quick run-start joins the previous
# run's window, which reads `undetermined` when its stage markers follow that run's run-stop or repeat one
# of its stage-starts, and stop:<stage> otherwise (an unclosed /pharn-loop that started only pharn-spec,
# which /pharn-ship never marks, reads as full with no regress after the build: stop:pharn-verify); a full
# run wrongly marked quick yields gate2-quick at most. BOUNDS (the module header):
# relative to the markers the command prescribes, and an earlier run that left only its run-start is read
# as that run resumed, so its mode decides (stop:pharn-verify or gate2-quick, never gate2).
# `outcome` is null when there are no markers — no evidence a run happened, which is a real state.
# NOT RE-DERIVABLE, stated rather than glossed: /pharn-loop has check-loop-decision.mjs; ship has no
# equivalent and none is claimed, because a ship stop is a human gate or an orchestrator STOP and no
# checker computes either. The closed vocabulary lives in SHIP_DECISION_FORMS with a CLOSURE regex over
# the stem (L36 — a parameterized value is where a variant spelling lands). No CLI: it is imported by
# render-cost-ledger.mjs, which falls through to it only when no LOOP.md exists, so the loop's bytes do
# not move. NO CLI and no checker of its own, deliberately (P7): nothing invokes it directly and nothing
# machine-reads its output but the emitter, so both would be additions with no trigger. The module header
# is the spec and ship-outcome-core.test.mjs enforces it. Ships: bumps SKILLS_VERSION.
```

## `render-run-report.mjs` — RUN-REPORT.md

```bash
# Render `pharn/features/<name>/RUN-REPORT.md` (added 6.6.0) — the human-readable run report, written by
# the SAME two commands that emit the ledger, always right after the cost-ledger checks: /pharn-loop at
# every stop with a feature directory (before its Step 6c commit), /pharn-ship at every exit that ends the
# run (before its Step 3b attestation). Its section prose is driven by cost.json's OWN `command` and
# `outcome.source` fields (L6), never by inferring the command from which sibling artifacts happen to
# exist — which is what lets ONE renderer serve both. A ship run has NO `## Handoff`, and the report says
# so BY DESIGN rather than reporting a missing file; a `## Briefing` section LINKS BRIEFING.md when one
# exists and never quotes it.
# A deterministic VIEW over cost.json + the artifacts the run already wrote: outcome; a token table
# stage x iteration x model over all six classes plus totals and `unattributed`; the changed-and-untracked
# files, each marked if already dirty before the run and each carrying its PLAN `## Files` line VERBATIM;
# the standing verify/regress verdicts; and LOOP.md's `## Handoff`. EVERY LINE IS DERIVED BY CODE.
# ANNOTATES, gates NOTHING (fix #3) — no proceed/stop reads it, and Step 6c stays gated on a green stop and
# the decision re-derivation (a /pharn-loop --quick run renders no report at all, 6.28.0). There is deliberately NO contract and NO checker (P7: nothing machine-reads
# it, so both would be additions with no trigger); the module header is the spec and the suite enforces it.
# THREE BOUNDS, carried INSIDE the artifact, not only here: (1) the file list is CHANGED-SINCE-base_sha
# plus untracked — NOT "what the build wrote"; a `not named in PLAN ## Files` marker is an observation,
# never a scope verdict (L17 is that conflation producing a blocking finding on the correct workflow);
# (2) token numbers are COPIED from cost.json's stored views, never recomputed, so this cannot disagree
# with the file check-cost-ledger.mjs certifies (L43); (3) verdicts are the FINAL ITERATION ONLY, because
# /pharn-loop overwrites both report files in place each iteration — earlier ones are not on disk and are
# not invented. Per-iteration COST is genuine and comes from by_stage_iteration_model.
# NO MARKDOWN TABLE ANYWHERE, and it is a measurement not a taste (L37): sanitizeIdentity("opus|5", …)
# returns it UNCHANGED — rule 3 bounds length, control chars and paths, not a pipe — and one pipe shifts
# every column right of it. So every untrusted region is a fence computed longer than any back-tick run
# inside it. Inert TO A COMMONMARK PARSER; NOT forgery-proofing, and never described as such.
# The Handoff grammar is IMPORTED from pharn/floor/loop-record-core.mjs, shared with check-loop-record.mjs
# (L35) — the fence-pairing rule had already been wrong twice, so it is not re-derived. The PLAN `## Files`
# grammar is IMPORTED the same way from pharn/floor/plan-files-core.mjs, shared with check-build-complete.mjs:
# the renderer first imported it FROM that checker, which gave the checker a SECOND reason to change (its
# completeness axis plus a shared parser) — REVIEW finding F3, fixed by the extraction rather than deferred.
# The canonical `## Files` parser remains set-writes-scope.cjs, and the core carries that parity obligation;
# the extraction also SURFACED that the Boundary-2 exclusion-cue break — the rule already repaired twice —
# was reached by no product-floor test, now closed by a parity case with a mutation control. FEATURE_BASE is
# imported too: this module introduces ZERO new defaults, pinned by a closure assertion (L41/L52).
# The `★ WIRING` pin is no longer authored for ONE command: it is an ENUMERATION over invoking commands,
# CLOSED OVER THE CORPUS, so a third caller FAILS until it is listed rather than shipping uncovered — the
# exact L31 gap. .dev/floor/command-hygiene.test.mjs carries the matching PHASE_MARKER_WIRING set (run
# boundaries, an orchestrator return per stage-start, each command's OWN --command value, and the
# iteration FORM pinned per command: the loop's runtime `<N>` vs ship's literal 1|2).
# `RUN-REPORT.md` is a member of FIVE enumerations (L29/L31), iterated by one test: PIPELINE_ARTIFACTS,
# reconcile-ignore.json pipeline_artifacts.names, the Step-6c staging list, .prettierignore and
# .markdownlint-cli2.jsonc — the last two on the cost.json reasoning (L23), because the report quotes
# untrusted text it does not control and gate-clean output is not achievable by construction.
# The write is a BASH write outside fix #7 (L19), declared in the plan and exempt under pipeline_artifacts.
# Ships: bumps SKILLS_VERSION. Exit: 0 rendered (an honest `n/a` section is still success) · 2 unusable
# input (no/!slug <name>, or no feature directory) — fail-closed, nothing written.
# 6.9.2: two more ledger states are rendered HONESTLY. (1) coverage `unavailable` under a KNOWN window →
# "Run usage: UNAVAILABLE — not measured, and NOT a zero" + the coverage_note quoted, never a measured
# empty window. (2) a STALE ledger — the live markers' latest run-start (seq AND ts; identity, so a reset
# .pharn/ cannot fool it) is not the one cost.json recorded — means a later run's emission failed; the
# report renders STALE LEDGER and never shows that file's outcome/tokens/base as this run's. With no live
# markers file it says "currency not checked". check-cost-ledger stays GREEN on a stale file (consistency only).
node pharn/floor/render-run-report.mjs <name> [--base <dir>] [--repo <dir>] [--markers-base <dir>] [--stdout]
```

## `render-ship-briefing.mjs` / `check-ship-briefing.mjs` — the GATE-2 briefing

```bash
# Render / cross-verify the GATE-2 briefing artifact (pharn/features/<name>/BRIEFING.md) /pharn-ship writes
# alongside SHIP.md. render-ship-briefing.mjs is Node stdlib only, no LLM call: every enum-gated
# frontmatter field is a verbatim copy of a value already in a committed source file (SPEC/PLAN
# frontmatter, regression-report.json, verify-report.json, GRILL.md's own verdict line), or the literal
# `n/a`/`unknown` when that source is absent — never fabricated. A design-rationale section is located in
# PLAN.md by a curated structural heading-scan (matched against 34 sampled heading spellings from this
# repo's own build history) and quoted verbatim; a miss degrades to an honest sentinel line, never a
# guess. check-ship-briefing.mjs then re-verifies every frontmatter field against its LIVE sibling source
# (cross-file equality, not merely shape) — a genuinely new floor primitive, surfaced by /pharn-ship as an
# ANNOTATION only: it never gates GATE 2, never issues a seal. ADVISORY (never checked): that the quoted
# or (bounded, always-labeled) model-synthesized `## Why this design` section is accurate or sufficient.
# See pharn/pharn-contracts/ship-briefing.md. Exits non-zero on RED.
node pharn/floor/render-ship-briefing.mjs <name> [--base <dir>]
node pharn/floor/check-ship-briefing.mjs <BRIEFING.md>
```

## `stage-agent.mjs` — stage-model routing

```bash
# STAGE-MODEL ROUTING (added 6.27.0, stage-model-routing) — /pharn-ship and /pharn-loop run each stage the closed
# ROUTE_POLICY table routes (pharn/floor/stage-agent-core.mjs — its header IS the protocol's spec; no new contract,
# P7) as a Claude Code SUBAGENT, REQUESTED on the model models.stages resolves for it (only cost.json's served-model
# rows are evidence of what it ran on). THE RECORDED FAILURE (P7): a command's
# model: frontmatter lasts the invoking turn, so every stage run inside an orchestrator ran on the ORCHESTRATOR's
# model — build, configured sonnet, ran opus on 79% of its requests (.dev/measurements/token-cost-2026-08-18.md §2).
# Routed: plan, grill, test and build in /pharn-ship (the quick grill excepted); spec, plan, test and build in
# /pharn-loop, whose grill is floor-only in BOTH columns since 6.45.0 (front-grill-concurrent: inline
# `/pharn-grill <name> --floor-only`: its two checkers plus the five scan-plan-* scanners via pharn/floor/grill-scan.mjs,
# no interrogation and no model-driven griller — unattended, no stage reads the findings before the build since
# routing split the contexts, and the 92-min run's grill cost 361 s and 43 opus requests; /pharn-ship also reads the grill's two stops BEFORE spawning its grill agent);
# ship's spec (it IS GATE 1) and every regress/verify (floor-only thin callers) are inline BY POLICY. THE LOOP'S QUICK
# COLUMN (6.28.0, loop-quick-mode — the second of the two to merge added it): /pharn-loop --quick routes the loop's
# stages, never runs regress, briefs its spec agent with `/pharn-spec --quick
# --model-approve`, gains the stuck-point row S6c in LOOP_ROWS, and names only verify-report.json's three fix-list
# fields in its build's rule 7 (fixListFields, derived from the policy). `route` prints ONE
# token — `agent:<alias>` (exit 0) or `inline:<reason>` (exit 3, its remedy on stderr), the grammar owned by
# pharn/floor/route-token-core.mjs (zero imports, so the ledger readers never load the policy or the brief) — from a
# FOLLOWED config stat (a dangling link reads no-config, exactly as the checker reads it), then check-model-config.mjs
# resolve (shelled by absolute path, argv arrays, CHECKER_TIMEOUT_MS = 10 s from a measured spawn), then validate
# only after a resolve RED. Both spawns are read through shelled-verdict-core.mjs's shelledVerdict: a RED is exit 1
# WITH its `RED — ` line, so a crashed or missing checker (node's own exit 1) is `resolve-failed`, never
# `config-red` (GATE-2 review A4); `inherit` and a claude-* id route INLINE, each with its own reason (L32/L39). `brief`
# prints the stage agent's rules, rendered by code: the orchestrator's Agent prompt is ONE pinned line, so no model
# transcribes them (L5). `report` writes the closed pharn-stage-agent-result/1 to .pharn/<command>/<name>/
# stage-result.json — a Bash write outside fix #7 (L19), contained by a per-component lstat walk that refuses a
# symlink or a non-directory (L54/L59); `read` validates it BOTH ways, REMOVES it and exits with the stage-exit
# numbers, and names a refused result on stderr by ONE fixed code (READ_DEFECTS), never by a byte the file carries
# (GATE-2 review A7). The Agent tool still returns the stage agent's final text into the orchestrator's context:
# THREAT-MODEL §5's free-text residual in a new place — that no proceed/stop reads it is ADVISORY (review A6).
# The orchestrators record the token on the stage-start marker (since 6.43.0 via `start`, below), so cost.json carries
# the REQUESTED route beside the SERVED requests[].model. MODEL ROUTED, EFFORT NOT — the Agent tool takes none.
# BOUNDS: a route is a request, the served model is evidence from an undocumented transcript format, NEVER proof;
# ship's routed build proceeds on its agent's advisory `done gate:pass`, re-confirmed by /pharn-verify's floor
# verdict; named residuals stage-agent-hang, stage-agent-background, agent-model-set-drift, stage-agent-effort;
# the live success measure (M2) is pending. Wiring: .dev/floor/command-hygiene.test.mjs STAGE_AGENT_WIRING (the
# lines, their order, policy parity, EXECUTED). Ships: bumps SKILLS_VERSION. Exit: route 0 agent · 3 inline ·
# 2 refused | brief 0 · 2 | report 0 · 2 | read 0 done · 3 refused · 4 question · 2 unusable — anything else, 1
# included, is a crash and no verdict.
node pharn/floor/stage-agent.mjs route --command <pharn-ship|pharn-loop> --stage <stage> --name '<name>' [--iteration <N>] [--mode quick] [--config <path>]
node pharn/floor/stage-agent.mjs brief --command <c> --stage <stage> --name '<name>' [--iteration <N>] [--mode quick]
node pharn/floor/stage-agent.mjs report --command <c> --name '<name>' --stage <stage> [--iteration <N>] --status <done|refused|question> [--row S<n>] [--gate pass|fail]
node pharn/floor/stage-agent.mjs read --command <c> --name '<name>' --stage <stage> [--iteration <N>]
# START / FINISH (6.43.0, orchestrator-direct-stage-calls — audit C1): the orchestrators pin these two instead of the
# four lines above. `start` = `route`'s decision + the stage-start marker carrying its token (written by code through
# mark-phase.mjs's tryMarkPhase — the model types no token; `<route>` left every shell line); `--no-agent-tool` records
# inline:no-agent-tool (ADVISORY: the model's reading of its tools); an uncleared leftover result is
# inline:route-unavailable; a stage still OPEN (the run's latest marker is its own stage-start) gets no second one, which
# keeps ship's question relay from tripping ship-outcome-core (b). `finish` = `read` + the orchestrator marker, deferred
# after a `question`. Each prints its closed line, then the marker line (or `marker: not written` — a marker never fails
# a run). C1's own pre-registered bar (orchestrator-role requests >= 20%) was met in 1 of 3 real runs; adopted at the
# user's request and to take the route token out of shell lines. Exit: start = route's 0/3 (2 refused, nothing written);
# finish = read's 0/2/3/4. An inline-run stage closes with `mark-phase.mjs --kind orchestrator` (the inline return line).
node pharn/floor/stage-agent.mjs start --command <c> --stage <stage> --name '<name>' [--iteration <N>] [--mode quick] [--no-agent-tool]
node pharn/floor/stage-agent.mjs finish --command <c> --name '<name>' --stage <stage> [--iteration <N>]
```

## `stage-direct.mjs` — the direct stage call

```bash
# THE DIRECT STAGE CALL (6.43.0, orchestrator-direct-stage-calls — audit C3) — /pharn-loop and /pharn-ship run
# /pharn-regress and /pharn-verify as ONE call each instead of invoking the thin callers (which a model invoked through
# the Skill tool, injecting 19,301 + 17,339 B of command text per iteration in the measured 92-minute run). The call
# sets the thin caller's own writes-scope (its pinned setter line), writes the stage-start marker (fresh), runs the stage
# script beside it, releases the scope, writes the return marker (not after a `5`), and passes the script's object and
# exit code through unchanged (a signal or spawn failure → 1). Rules: pharn/floor/stage-direct-core.mjs; execution and
# failure modes: pharn/floor/stage-direct.mjs's header (no new contract). The thin callers stay, unchanged, for a person.
# Wiring: .dev/floor/command-hygiene.test.mjs DIRECT_STAGE_WIRING (the copy-pair's obligation set, closure, EXECUTED).
# A Bash call that reaches the tool's timeout is MOVED TO THE BACKGROUND, not killed (GATE-2 review R1), so the call
# first takes an IN-FLIGHT LOCK, .pharn/stage-direct/in-flight.json (O_EXCL; pid + start time; stale only when that pid
# is dead; released only while it holds the call's own record): a second call refuses `in-flight`, and the orchestrators
# wait for a backgrounded call instead of resuming it. One lock for both stages, beside their roots (each script's fresh
# start deletes its own root; the two share one scope file). BOUNDS: its own writes (scope file, markers, lock) are
# Bash writes under .pharn/ (L19); the lock sees only stage-direct calls, and a reused pid reads as alive (refuses); no
# stage scope between two calls around a `continue`; its node start-up and setter spawns are outside the script's
# budget clock. Ships: bumps SKILLS_VERSION. Exit: the script's 0/2/3/4/5; 2 also for its own refusal (bad argv, a scope
# it could not set, `in-flight` / `lock-unusable`); 1 crash.
node pharn/floor/stage-direct.mjs --stage <pharn-regress|pharn-verify> --name '<name>' --iteration <N> --timeout-ms <T> --budget-ms <B> [stage flags]
node pharn/floor/stage-direct.mjs --stage <pharn-regress|pharn-verify> --name '<name>' --resume --budget-ms <B>
```
