#!/usr/bin/env node
// pharn/floor/mark-phase.mjs — the deterministic PHASE-MARKER writer for the cost ledger
// (`pharn/pharn-contracts/cost-ledger.md`). Node stdlib only, no network, no model call.
//
// PURPOSE. A cost ledger answers "what did this stage cost". The platform cannot answer it: Claude Code's
// own `attributionSkill` field tags the ORCHESTRATOR, not the stage running inside it. Measured on this
// repo's `loop-decision-integrity` run — 213 of 275 deduped requests tagged, and every one of them tagged
// `pharn-loop`, with NO sub-stage named anywhere. So "which stage was this request part of" is not
// recoverable from the transcript after the fact, and it is not recoverable later at all: it is a fact
// about a MOMENT, and the only place to record it is that moment.
//
// This writer records those moments. Each call appends ONE line to `<base>/<name>/markers.jsonl`:
//   {"seq":<int>,"kind":<enum>,"stage":<string|null>,"iteration":<int|null>,"ts":<ISO>,"session_id":<string|null>}
// `render-cost-ledger.mjs` then attributes each request to the LATEST marker at-or-before its own
// timestamp in the same session. Facts are recorded; every aggregate is a pure function of them (L42 —
// capture at the moment of the act, never re-derive from live state afterwards).
//
// COMMAND-NEUTRAL, deliberately. Nothing here knows about `/pharn-loop`. `--name`, `--kind`, `--stage`
// and `--iteration` are supplied by whatever orchestrator is running, so `/pharn-ship` reuses this file
// unchanged when its wiring lands — no second copy, no parameterised fork (L35).
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// FLOOR (primitive #3): `kind` is checked against a closed enum; `iteration` against an integer grammar;
//   `name` against a slug grammar that cannot traverse. A bad value is REFUSED (exit 2) and nothing is
//   written — the terminal fallback is refuse, never a guessed marker (P5).
// ADVISORY, and this is the bound that matters: **that a marker was written does NOT mean the stage ran**,
//   and **that a stage ran does NOT mean a marker was written**. This is invoked from command prose
//   through Bash, outside the `PreToolUse` gate (L19), so nothing on the floor forces a call and nothing
//   detects a skipped one at the time. `check-cost-ledger.mjs` compares the marker count against the
//   record's own `outcome.iterations` and emits a WARN with a count — never a silent merge into a
//   neighbouring stage, and never a RED, because a missing marker is an orchestration lapse, not a
//   malformed artifact.
// ADVISORY: `ts` is this process's wall clock. It is compared against the transcript's own timestamps,
//   which the platform wrote from a different process. Both are ordinary system time on one machine; no
//   monotonic guarantee is claimed and none is available.
//
// WHY `toISOString()` AND NOT `date`. BSD `date` (the macOS default) has no `%N`, so a shell-written
// timestamp is second-resolution there and millisecond-resolution on GNU — and requests inside one
// second would attribute differently by platform. Node's `toISOString()` is millisecond-resolution
// everywhere and is the same call `render-cost-ledger.mjs` compares against (L22: the invocation is
// pinned, not described, and the wrong form is named beside it).
//
// ── THE PENDING START (`--pending-start`, added with `run-window/1`) ─────────────────────────────────
// A ledger now counts only requests INSIDE the run window (`run-window-core.mjs`), so the window must open
// before the run's first real work. `/pharn-ship` cannot write its named `run-start` that early: `<name>`
// IS this file's directory, and `/pharn-spec` is what resolves it — so filtering at the named marker would
// silently exclude the spec stage. `--pending-start` records the boundary FIRST, keyed by session id
// (`<base>/.pending/<session>.json`, or `no-session.json` when `CLAUDE_CODE_SESSION_ID` is unset), and the
// later named `run-start --adopt-pending` in the SAME session ADOPTS it. ADOPTION IS OPT-IN, and only
// `/pharn-ship` opts in: when every `run-start` adopted, a pending file left by an abandoned ship was
// silently adopted by a later `/pharn-loop` in the same session, widening the loop's window back to the
// ship's moment (REVIEW finding 1, probed). On adoption the marker carries the pending `ts` plus
// `origin: "pending"`, so a reader can tell an adopted boundary from one written at that moment (GRILL
// finding 3). The pending file is then deleted. With no pending file, `run-start` is byte-identical to
// before.
// ADVISORY, and the bound is stated: a pending file left by an ABANDONED `/pharn-ship` in the same session
//   is adopted by a later `/pharn-ship` `run-start` whose own `--pending-start` call was skipped, which
//   WIDENS that run's window. Nothing here can tell the two apart; it is marker discipline, like every marker (L19).
//
// ── THE MODE (`--mode`, added 6.24.0 for `/pharn-ship --quick`) ─────────────────────────────────────────
// A run-start marker may carry `mode: "quick"`, recorded at the MOMENT THE RUN STARTS (L42 — capture at
// the moment of the act, never re-derive from live state afterwards): the mode is a fact about how the
// run WAS INVOKED, never re-derived later from the SPEC's `spec_kind` — a quick SPEC may still run the
// full pipeline (a human choice at GATE 1), so the two are different facts. `MARKER_MODES` is the closed
// vocabulary (today one member, `quick`); `--mode` is refused (exit 2, nothing written) for any other
// value and for any `--kind` but `run-start` — a stage-start, orchestrator or run-stop marker records no
// mode, because the mode is a property of the RUN, not of a stage inside it.
// WITH NO `--mode` FLAG the marker carries no `mode` key at all — byte-identical to every marker written
// before 6.24.0 (a closure test pins this). `ship-outcome-core.mjs`'s `runMode()` reads this field to
// decide `gate2` vs `gate2-quick`; `render-cost-ledger.mjs`'s `normalizeMarkers` keeps it only as a
// `MARKER_MODES` member, the same pattern `origin: "pending"` already uses.
//
// Usage:
//   node pharn/floor/mark-phase.mjs --name <slug> --kind <kind> [--stage <s>] [--iteration <n>] [--base <dir>]
//                                   [--adopt-pending]   (run-start only)
//                                   [--mode <m>]        (run-start only; m in MARKER_MODES)
//   node pharn/floor/mark-phase.mjs --pending-start [--base <dir>]
// Exit codes: 0 = a marker (or the pending start) was written; 2 = bad usage (nothing written).

import { appendFileSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tsMs } from "./run-window-core.mjs";

/** The marker vocabulary. A Set, so membership is `.has()` and no arbitrary key indexes a plain
 *  object (L15 — an inherited `toString` would be both truthy and non-nullish). */
export const MARKER_KINDS = new Set(["run-start", "stage-start", "orchestrator", "run-stop"]);

/** The `--mode` vocabulary (6.24.0), a Set for the same reason. One member today: `/pharn-ship --quick`'s
 *  run-start. Exported once (L35) — `render-cost-ledger.mjs`'s `normalizeMarkers` and
 *  `ship-outcome-core.mjs`'s `runMode` both read against this same set, never a re-spelled literal. */
export const MARKER_MODES = new Set(["quick"]);

/** The one `MARKER_MODES` member today. Referenced, never re-spelled (L41). */
export const QUICK_MODE = "quick";

/** The ONE definition of where markers live. Duplicating it at the CLI entry point is exactly the
 *  defect L41 records in `render-ship-briefing.mjs` — two copies of a default, one updated, the stale
 *  one on the production path and invisible to a suite whose every test passes the flag. */
export const DEFAULT_BASE = ".pharn/cost";

/** A feature slug: one path segment, no traversal, no separators. */
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** A stage label, e.g. `pharn-build`. Same shape as a slug — it is one. */
const STAGE_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ITER_RE = /^\d{1,6}$/;

/**
 * Control-char-free and bounded. The PRECONDITION that runs BEFORE any anchored shape regex, never as
 * a replacement for one (L14): JS `$` without `m` matches before a single trailing newline, so
 * `/^\d+$/.test("2\n")` is true. Composed, not substituted.
 *
 * THE ONE DEFINITION, exported. It previously existed as three byte-identical private copies — here,
 * in `render-cost-ledger.mjs` and in `check-cost-ledger.mjs` — which `/pharn-dev-review` found alongside
 * a leaf rule whose two encodings had ALREADY diverged. That is [[L31]] exactly: a copy-pair creates an
 * obligation set nothing ranges over, and the second copy is where the obligation is dropped. It lives
 * in THIS file because this module is the base of the import chain (`render-cost-ledger` already imports
 * it, and `check-cost-ledger` imports both), so a single definition here creates no cycle.
 */
export function cleanScalar(v, maxLen) {
  if (typeof v !== "string") return false;
  if (v.length < 1 || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false; // C0 controls (incl. \t \n \r) + DEL
  }
  return true;
}

/**
 * Count the markers already in `file`, tolerating a torn final line.
 *
 * An append-only file interrupted mid-write leaves a partial line, exactly as a live transcript does.
 * `render-cost-record.mjs` treats that as expected rather than an error, and so does this — a torn line
 * is not counted and not repaired. Returns 0 when the file does not exist yet, which is the ordinary
 * first-call case, not a failure.
 */
export function countMarkers(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return 0; // no markers file yet — the ordinary first-call state
  }
  let n = 0;
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      const r = JSON.parse(line);
      if (r && typeof r.seq === "number") n++;
    } catch {
      // a torn line from an interrupted append: not a marker, not an error
    }
  }
  return n;
}

/** A session id usable as a FILE NAME: one segment, no separators, no traversal. A platform session id
 *  is a UUID; anything else is refused rather than rewritten into a name it never had (P5). */
const SESSION_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
/** The key used when no session id is known — never a valid UUID, so it cannot collide with one. */
export const NO_SESSION_KEY = "no-session";
/** The pending-start directory's name under the ONE `DEFAULT_BASE` (never a second base literal — L41). */
export const PENDING_DIR = ".pending";

/** Where the pending start for `sessionId` lives, or `null` when the id cannot name a file. */
export function pendingFile(base, sessionId) {
  if (sessionId === null || sessionId === undefined) return join(base, PENDING_DIR, `${NO_SESSION_KEY}.json`);
  if (typeof sessionId !== "string" || !SESSION_KEY_RE.test(sessionId)) return null;
  return join(base, PENDING_DIR, `${sessionId}.json`);
}

/** Record a pending run-start for this session. Overwrites an earlier one. Returns the written object,
 *  or `null` when the session id cannot name a file (nothing written). */
export function writePendingStart({ base = DEFAULT_BASE, sessionId = null, now } = {}) {
  const file = pendingFile(base, sessionId);
  if (file === null) return null;
  mkdirSync(join(base, PENDING_DIR), { recursive: true });
  const pending = { ts: (now ?? new Date()).toISOString(), session_id: sessionId };
  writeFileSync(file, JSON.stringify(pending) + "\n");
  return pending;
}

/**
 * The pending start for `sessionId`, or `null`. Validated, never trusted: `.pharn/` is state a Bash write
 * reaches (LIMITS.md §6), so a torn, malformed, cross-session or FUTURE-dated file is ignored rather than
 * adopted — ignoring it degrades to today's behaviour (`ts` = now), the safe direction.
 */
export function readPendingStart(base, sessionId, nowMs) {
  const file = pendingFile(base, sessionId);
  if (file === null) return null;
  let p;
  try {
    p = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  if (!p || typeof p !== "object" || tsMs(p.ts) === null) return null;
  if ((p.session_id ?? null) !== (sessionId ?? null)) return null;
  if (tsMs(p.ts) > nowMs) return null;
  return { ts: p.ts, file };
}

/**
 * Append one marker. Returns the written object.
 * `seq` is derived from what is already on disk, so two calls never collide within one run and a
 * resumed run continues the sequence rather than restarting it.
 * A `run-start` with `adoptPending` ADOPTS this session's pending start when one exists (see the header).
 */
export function markPhase({
  name,
  kind,
  stage = null,
  iteration = null,
  base = DEFAULT_BASE,
  sessionId = null,
  now,
  adoptPending = false,
  mode = null,
}) {
  const dir = join(base, name);
  const file = join(dir, "markers.jsonl");
  mkdirSync(dir, { recursive: true });
  const at = now ?? new Date();
  const pending = kind === "run-start" && adoptPending === true ? readPendingStart(base, sessionId, at.getTime()) : null;
  const marker = {
    seq: countMarkers(file) + 1,
    kind,
    stage,
    iteration,
    ts: pending ? pending.ts : at.toISOString(),
    session_id: sessionId,
  };
  if (pending) marker.origin = "pending";
  // With NO `--mode` the marker carries no `mode` key at all (L41) — byte-identical to a pre-6.24.0 marker.
  if (mode !== null) marker.mode = mode;
  appendFileSync(file, JSON.stringify(marker) + "\n");
  if (pending) {
    try {
      unlinkSync(pending.file);
    } catch {
      // already gone — adoption is complete either way
    }
  }
  return marker;
}

function usage(msg) {
  process.stderr.write(`mark-phase: ${msg}\n`);
  process.stderr.write(
    "usage: node pharn/floor/mark-phase.mjs --name <slug> --kind <run-start|stage-start|orchestrator|run-stop>\n" +
      "                                      [--stage <s>] [--iteration <n>] [--base <dir>] [--adopt-pending]\n" +
      "                                      [--mode <m>]   (run-start only; m in {" +
      [...MARKER_MODES].join(", ") +
      "})\n" +
      "       node pharn/floor/mark-phase.mjs --pending-start [--base <dir>]\n"
  );
  return 2;
}

function main(argv) {
  const opts = { name: null, kind: null, stage: null, iteration: null, base: null, pending: false, adopt: false, mode: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--pending-start") opts.pending = true;
    else if (k === "--adopt-pending") opts.adopt = true;
    else if (k === "--name") opts.name = argv[++i];
    else if (k === "--kind") opts.kind = argv[++i];
    else if (k === "--stage") opts.stage = argv[++i];
    else if (k === "--iteration") opts.iteration = argv[++i];
    else if (k === "--base") opts.base = argv[++i];
    else if (k === "--mode") opts.mode = argv[++i];
    else return usage(`unknown argument ${k}`);
  }

  const sessionId = process.env.CLAUDE_CODE_SESSION_ID ?? null;
  if (opts.pending) {
    // The pending start carries no name, stage or iteration: it is ONLY a moment, keyed by session.
    if (opts.name !== null || opts.kind !== null || opts.stage !== null || opts.iteration !== null || opts.adopt || opts.mode !== null) {
      return usage("--pending-start takes no --name, --kind, --stage, --iteration, --adopt-pending or --mode");
    }
    const p = writePendingStart({ ...(opts.base === null ? {} : { base: opts.base }), sessionId });
    if (p === null) return usage("CLAUDE_CODE_SESSION_ID cannot name a pending-start file");
    process.stdout.write(`pending run-start: ${p.ts}\n`);
    return 0;
  }

  if (opts.adopt && opts.kind !== "run-start") return usage("--adopt-pending applies to --kind run-start only");
  // Fail-closed on the ARGV VALUE (P5, L62): the refusal names the vocabulary, never the untrusted argv string —
  // an operator who mistypes `--mode fast` sees what IS allowed, never their own typo echoed back.
  if (opts.mode !== null && opts.kind !== "run-start") return usage(`--mode applies to --kind run-start only`);

  // Every branch below is a membership or grammar test (P5). The terminal fallback is refuse.
  if (!cleanScalar(opts.name, 64) || !NAME_RE.test(opts.name)) return usage(`--name must match ${NAME_RE}`);
  if (typeof opts.kind !== "string" || !MARKER_KINDS.has(opts.kind)) {
    return usage(`--kind must be one of ${[...MARKER_KINDS].join(", ")}`);
  }
  if (opts.stage !== null && (!cleanScalar(opts.stage, 64) || !STAGE_RE.test(opts.stage))) {
    return usage(`--stage must match ${STAGE_RE}`);
  }
  if (opts.mode !== null && !MARKER_MODES.has(opts.mode)) {
    return usage(`--mode must be one of {${[...MARKER_MODES].join(", ")}}`);
  }
  let iteration = null;
  if (opts.iteration !== null) {
    if (!cleanScalar(opts.iteration, 6) || !ITER_RE.test(opts.iteration)) return usage("--iteration must be a positive integer");
    iteration = Number(opts.iteration);
    if (iteration < 1) return usage("--iteration must be a positive integer");
  }
  // `--base` falls through to markPhase's single default when absent — no second copy here (L41).
  const m = markPhase({
    name: opts.name,
    kind: opts.kind,
    stage: opts.stage,
    iteration,
    ...(opts.base === null ? {} : { base: opts.base }),
    sessionId,
    adoptPending: opts.adopt,
    mode: opts.mode,
  });
  process.stdout.write(
    `marker ${m.seq}: ${m.kind}${m.stage ? ` ${m.stage}` : ""}${m.iteration ? ` iter=${m.iteration}` : ""} ${m.ts}${m.origin ? ` (adopted ${m.origin} start)` : ""}${m.mode ? ` (mode ${m.mode})` : ""}\n`
  );
  return 0;
}

// Run as CLI only when invoked directly. `import.meta.main` — NOT a `file://` + argv[1] compare, which
// silently no-ops on spaced/non-ASCII/symlinked paths (L25).
if (import.meta.main) process.exit(main(process.argv.slice(2)));
