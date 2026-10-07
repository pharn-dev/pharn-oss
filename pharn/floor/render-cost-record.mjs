#!/usr/bin/env node
// pharn/floor/render-cost-record.mjs — the deterministic RENDERER for the measured token-cost block on
// `pharn/features/<name>/ship-record.json`, on the PRODUCT surface.
//
// Non-LLM, dependency-free (Node stdlib only). It reads the CURRENT run's Claude Code session transcript,
// counts each API request once, and sums the usage fields the platform recorded. It is the floor reduction
// of `LIMITS.md §1c`'s true statement — "the real number is the MEASURED runtime cost" — replacing a static
// `est_tokens` guess with what the run actually consumed.
//
// WHAT THIS FILE DOES NOT DO: it does not write `ship-record.json` — it prints the cost block to stdout, so
// the CALLING COMMAND performs the Write (fix #7 gates that write, not this render). It is the same
// renderer/caller split `render-ship-briefing.mjs` uses. Nor does it read a transcript itself: locating a
// session's transcript, walking its files and turning its lines into requests all live in
// `transcript-core.mjs`, imported and never re-stated ([[L35]]). This file changes for ONE reason (P3):
// the shape of the `pharn-cost-record/1` block. Until 6.24.1 it also carried that transcript axis.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// FLOOR (deterministic, primitive #3 + arithmetic): each request `sessionRequests()` returns is folded
//   ONCE, at the usage that function selects. See `transcript-core.mjs`'s header for why a request's usage
//   is its line with the most output tokens, and for the one ADVISORY assumption that rule rests on. Until
//   6.24.1 this renderer kept each request's FIRST line, which under-counted `output` and `thinking`. Given
//   the same transcript bytes the output is byte-identical: no clock read, no randomness.
//   window_start/window_end come from the records' OWN timestamps (each request's first line), never from
//   Date.now(). So it is pinnable by test.
// FLOOR (primitive #3, an integer compare — the `check-ship.mjs` `iter >= cap` precedent): a session id
//   resolving to 2+ transcript directories is REFUSED, never resolved first-match-wins. Bounded, and
//   stated: that is a property of THIS LOOKUP, not a proof the platform never reuses a session id.
// FLOOR (primitive #3), the values this block reads (6.28.1). Which lines are requests at all is the reader's rule
//   (`sessionRequests()`, cited, not restated). Of each request's first line and selected usage:
//   * the model is a `by_model` key only when `isIdentityToken` (cost-value-core.mjs) admits it, else the
//     request counts under `unknown`; `attributionSkill` likewise, else `(untagged)`;
//   * a usage count is added only when `isTokenCount` admits it, else that class adds 0 for that request, so every
//     total is a sum of non-negative safe integers;
//   * a timestamp joins the window only when `tsMs` (run-window-core.mjs) parses it. The window is still ordered by
//     the timestamp string, which is how the ledger orders its own window.
//   No value is coerced before its test. SILENT, and stated: this block has no `dropped` list, so a refused value
//   leaves no trace here. `cost.json` records only some, because it covers only the requests inside its run window
//   while this block reads the whole session: a refused model, `attributionSkill` or count on a request inside a
//   known window lands in its `dropped[]`, while a refusal outside that window (or under an unknown one), a line that
//   is not a request, and a timestamp that does not parse are listed nowhere (`pharn/pharn-contracts/cost-ledger.md`).
// ADVISORY / NARROWED, and stated:
//   * THE REPORTED RUN IS THE ONE `CLAUDE_CODE_SESSION_ID` NAMES, and nothing here verifies that is this
//     run. This is WEAKER than the cwd refusal it replaced (`transcript-core.mjs` says why that went),
//     stated as a downgrade, not hidden. The refusal was not a working backstop either: it read one
//     arbitrary `cwd` of the several a session records, so it produced false refusals rather than true
//     catches.
//   * COVERAGE IS NEVER COMPLETE. The `coverage` enum has no `complete` member by design: the ship stage's
//     own turns are still being written when this runs, so a run can never fully account for itself. The
//     number is a floor on spend, never the total.
//   * It measures TOKENS, never DOLLARS. No price table is embedded, deliberately: published prices change,
//     a baked-in table would rot silently, and nothing here could floor-check it. Converting to currency is
//     the reader's job, against current published prices.
//   * "The record shows N tokens" NEVER means "the spend was worthwhile". It annotates; it gates nothing
//     (fix #3) and can never flip a verdict or block GATE 2.
//   * Coverage is MACHINE-LOCAL. The transcript lives outside the repo and is never committed, so a fresh
//     clone can reproduce nothing — the `product-lessons-index` precedent's weakness, not the dev floor's
//     byte-equality guarantee.
//   * `by_stage` keys come from the platform's own `attributionSkill` field. Records without it are grouped
//     under `(untagged)` — an honest bucket, not an error.
//   * NAMED RESIDUAL, deliberately unbuilt — `cost-record-unsplit-cache-write`. `fold()` reads the
//     `cache_creation` SPLIT, so a record carrying `cache_creation_input_tokens` with no split would count
//     cache writes as 0 with no signal. Measured 2026-09-21: 8068/8068 deduped requests carried the split,
//     equal to the total, 0 remainder — so P7's bar (a real failure) is unmet and no bucket is added; the
//     output shape has nowhere to put an unsplit total, and inventing one would be the speculative
//     addition. Recorded as a pending remedy, not a solved problem.
//
// Usage:
//   node pharn/floor/render-cost-record.mjs [--session <id>] [--projects-dir <dir>]
// Exit codes: 0 = a valid block was printed (including an honest `unavailable` one); 2 = bad usage.

import "./runtime-floor.mjs";
import { join } from "node:path";
import { homedir } from "node:os";
import { findTranscriptDirs, sessionRequests } from "./transcript-core.mjs";
import { isIdentityToken, isTokenCount } from "./cost-value-core.mjs";
import { tsMs } from "./run-window-core.mjs";

export const SCHEMA = "pharn-cost-record/1";
export const COVERAGE = Object.freeze(["partial", "unavailable"]);
const UNTAGGED = "(untagged)";

const zero = () => ({
  requests: 0,
  input_uncached: 0,
  cache_write_1h: 0,
  cache_write_5m: 0,
  cache_read: 0,
  output: 0,
  thinking: 0,
});

/** A count as `fold()` adds it: the value when `isTokenCount` admits it, else 0 — never coerced (see the header). */
const count = (v) => (isTokenCount(v) ? v : 0);

function fold(acc, u) {
  acc.requests += 1;
  acc.input_uncached += count(u.input_tokens);
  acc.cache_write_1h += count(u.cache_creation?.ephemeral_1h_input_tokens);
  acc.cache_write_5m += count(u.cache_creation?.ephemeral_5m_input_tokens);
  acc.cache_read += count(u.cache_read_input_tokens);
  acc.output += count(u.output_tokens);
  acc.thinking += count(u.output_tokens_details?.thinking_tokens);
  return acc;
}

/**
 * Aggregate one session's usage: one entry per request from `sessionRequests()`, each at the usage it
 * selects. `sessionId` selects the top-level transcript AND its nested subagent files; every other session
 * in the directory is ignored, so no unrelated run is read.
 */
export function aggregate(projectDir, sessionId) {
  const { files, requests } = sessionRequests(projectDir, sessionId);
  const total = zero();
  const byStage = new Map();
  const byModel = new Map();
  let start = null;
  let end = null;

  for (const { record: r, usage: u } of requests) {
    // Each key is tested before it is used as one: a refused model or skill takes the fixed fallback bucket.
    const model = isIdentityToken(r.message.model) ? r.message.model : "unknown";
    fold(total, u);
    const stage = isIdentityToken(r.attributionSkill) ? r.attributionSkill : UNTAGGED;
    if (!byStage.has(stage)) byStage.set(stage, zero());
    fold(byStage.get(stage), u);
    if (!byModel.has(model)) byModel.set(model, zero());
    fold(byModel.get(model), u);

    // Only a timestamp that parses joins the window; it is compared as the string, as the ledger's window is.
    const ts = r.timestamp;
    if (tsMs(ts) !== null) {
      if (start === null || ts < start) start = ts;
      if (end === null || ts > end) end = ts;
    }
  }
  const sorted = (m) => Object.fromEntries([...m.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return { files: files.length, total, byStage: sorted(byStage), byModel: sorted(byModel), start, end };
}

function unavailable(note, sessionId) {
  return {
    schema: SCHEMA,
    coverage: "unavailable",
    coverage_note: note,
    session_id: sessionId ?? null,
    dedup_key: "requestId",
    requests: 0,
    tokens: zero(),
    by_stage: {},
    by_model: {},
  };
}

export function render({ sessionId, projectsDir }) {
  if (!sessionId) return unavailable("no session id available (CLAUDE_CODE_SESSION_ID unset)", null);
  const hits = findTranscriptDirs(projectsDir, sessionId);
  if (hits.length === 0) {
    return unavailable(`no transcript found for session ${sessionId} under ${projectsDir}`, sessionId);
  }
  if (hits.length > 1) {
    // A UUID id colliding across directories is the case this was written for, and that case is
    // unreachable on a sane tree — but the BRANCH is not dead: a malformed `--session` (one holding a
    // path separator) also lands here, and refusing is the correct answer for both. Do not delete it.
    return unavailable(
      `session ${sessionId} resolves to ${hits.length} transcript directories (${hits.join(", ")}) — refusing to guess which run to report`,
      sessionId
    );
  }
  const a = aggregate(hits[0], sessionId);
  // A hit means `<dir>/<sessionId>.jsonl` STATTED, not that `aggregate` could read a transcript out of
  // `<dir>`: the two matchers do not agree on every input (a `..` in the id satisfies the stat and
  // escapes the walk), and the file can be unlinked between the two. Without this, such a run renders
  // `coverage: "partial"` with zeros — a measurement that never happened, reported as a cheap one.
  if (a.files === 0) {
    return unavailable(`no transcript found for session ${sessionId} under ${hits[0]}`, sessionId);
  }
  const { requests, ...tokens } = a.total;
  const strip = (o) =>
    Object.fromEntries(
      Object.entries(o).map(([k, v]) => {
        const { requests: n, ...t } = v;
        return [k, { requests: n, tokens: t }];
      })
    );
  return {
    schema: SCHEMA,
    coverage: "partial",
    coverage_note:
      "measured from this run’s session transcript; never complete — the ship stage’s own turns are still being written. Tokens only: no price table is embedded (published prices change and nothing here could floor-check one). Annotation only — gates nothing.",
    session_id: sessionId,
    window_start: a.start,
    window_end: a.end,
    dedup_key: "requestId",
    transcript_files: a.files,
    requests,
    tokens,
    by_stage: strip(a.byStage),
    by_model: strip(a.byModel),
  };
}

function main(argv) {
  const opts = { sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? null, projectsDir: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--session") opts.sessionId = argv[++i];
    else if (k === "--projects-dir") opts.projectsDir = argv[++i];
    else {
      process.stderr.write(`render-cost-record: unknown argument ${k}\n`);
      return 2;
    }
  }
  opts.projectsDir ??= process.env.CLAUDE_CONFIG_DIR
    ? join(process.env.CLAUDE_CONFIG_DIR, "projects")
    : join(homedir(), ".claude", "projects");
  process.stdout.write(JSON.stringify(render(opts), null, 2) + "\n");
  return 0;
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare, which silently no-ops on spaced/non-ASCII/symlinked paths.
if (import.meta.main) process.exit(main(process.argv.slice(2)));
