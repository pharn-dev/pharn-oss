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
// Usage:
//   node pharn/floor/mark-phase.mjs --name <slug> --kind <kind> [--stage <s>] [--iteration <n>] [--base <dir>]
// Exit codes: 0 = a marker was appended; 2 = bad usage (nothing written).

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The marker vocabulary. A Set, so membership is `.has()` and no arbitrary key indexes a plain
 *  object (L15 — an inherited `toString` would be both truthy and non-nullish). */
export const MARKER_KINDS = new Set(["run-start", "stage-start", "orchestrator", "run-stop"]);

/** The ONE definition of where markers live. Duplicating it at the CLI entry point is exactly the
 *  defect L41 records in `render-ship-briefing.mjs` — two copies of a default, one updated, the stale
 *  one on the production path and invisible to a suite whose every test passes the flag. */
export const DEFAULT_BASE = ".pharn/cost";

/** A feature slug: one path segment, no traversal, no separators. */
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** A stage label, e.g. `pharn-build`. Same shape as a slug — it is one. */
const STAGE_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ITER_RE = /^\d{1,6}$/;

/** Control-char-free and bounded. The PRECONDITION that runs BEFORE any anchored shape regex, never as
 *  a replacement for one (L14): JS `$` without `m` matches before a single trailing newline, so
 *  `/^\d+$/.test("2\n")` is true. Composed, not substituted. */
function cleanScalar(v, maxLen) {
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

/**
 * Append one marker. Returns the written object.
 * `seq` is derived from what is already on disk, so two calls never collide within one run and a
 * resumed run continues the sequence rather than restarting it.
 */
export function markPhase({ name, kind, stage = null, iteration = null, base = DEFAULT_BASE, sessionId = null, now }) {
  const dir = join(base, name);
  const file = join(dir, "markers.jsonl");
  mkdirSync(dir, { recursive: true });
  const marker = {
    seq: countMarkers(file) + 1,
    kind,
    stage,
    iteration,
    ts: (now ?? new Date()).toISOString(),
    session_id: sessionId,
  };
  appendFileSync(file, JSON.stringify(marker) + "\n");
  return marker;
}

function usage(msg) {
  process.stderr.write(`mark-phase: ${msg}\n`);
  process.stderr.write(
    "usage: node pharn/floor/mark-phase.mjs --name <slug> --kind <run-start|stage-start|orchestrator|run-stop>\n" +
      "                                      [--stage <s>] [--iteration <n>] [--base <dir>]\n"
  );
  return 2;
}

function main(argv) {
  const opts = { name: null, kind: null, stage: null, iteration: null, base: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--name") opts.name = argv[++i];
    else if (k === "--kind") opts.kind = argv[++i];
    else if (k === "--stage") opts.stage = argv[++i];
    else if (k === "--iteration") opts.iteration = argv[++i];
    else if (k === "--base") opts.base = argv[++i];
    else return usage(`unknown argument ${k}`);
  }

  // Every branch below is a membership or grammar test (P5). The terminal fallback is refuse.
  if (!cleanScalar(opts.name, 64) || !NAME_RE.test(opts.name)) return usage(`--name must match ${NAME_RE}`);
  if (typeof opts.kind !== "string" || !MARKER_KINDS.has(opts.kind)) {
    return usage(`--kind must be one of ${[...MARKER_KINDS].join(", ")}`);
  }
  if (opts.stage !== null && (!cleanScalar(opts.stage, 64) || !STAGE_RE.test(opts.stage))) {
    return usage(`--stage must match ${STAGE_RE}`);
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
    sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? null,
  });
  process.stdout.write(`marker ${m.seq}: ${m.kind}${m.stage ? ` ${m.stage}` : ""}${m.iteration ? ` iter=${m.iteration}` : ""} ${m.ts}\n`);
  return 0;
}

// Run as CLI only when invoked directly. `import.meta.main` — NOT a `file://` + argv[1] compare, which
// silently no-ops on spaced/non-ASCII/symlinked paths (L25).
if (import.meta.main) process.exit(main(process.argv.slice(2)));
