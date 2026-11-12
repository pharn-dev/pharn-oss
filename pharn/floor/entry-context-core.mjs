// pharn/floor/entry-context-core.mjs — the rule of /pharn-loop's ENTRY-CONTEXT GUARD (entry-context-guard): how large is
// the context that is running the command, and is it over the project's threshold. The CLI, `check-entry-context.mjs`,
// supplies argv, the environment, the markers and the config text and prints what this module decides.
//
// NOT PURE, and stated: `measureEntryContext` reads the session's transcript files through `transcript-core.mjs`
// (`findTranscriptDirs`, `sessionScan`), read-only. Everything else here is pure. The split is by reason to change
// (P3): this file changes when the RULE does (which context, which request, which threshold); the CLI when argv, the
// environment or the printing does.
//
// ==================================== WHY (P7) ====================================
// `.dev/measurements/loop-baseline-2026-11-11.md` §4: of 36 /pharn-loop runs (7.1.4 and 7.3.0, one user project), the 12
// started in a main session carried a median of 484k tokens on their FIRST orchestrator request (210k–905k), and every
// later request of the run re-sent that context (505k median); the 24 started inside an agent started at 163k–280k.
// Nothing checked it. Linear CORE-103.
//
// ==================================== THE RULE ====================================
// 1. The window: `runWindow(markers, session)` (run-window-core.mjs). An unknown window → `window-unknown`.
// 2. The binding lines: `bindingMarkers(markers, session).map(markerLine)` — the lines mark-phase.mjs printed for this
//    run, exactly the evidence the cost ledger binds a run with (`pharn/pharn-contracts/cost-ledger.md`, "Run
//    membership", rule 6 — cited, not restated).
// 3. The context: `sessionScan(dir, session, lines)` → the contexts whose TOOL RESULTS carry a binding line →
//    `bindRun`. None → `no-holder`; more than one → `several-holders`. So a /pharn-loop running inside an agent is
//    measured in THAT agent's context, never in its parent session's main thread — a subagent's Bash sees its parent's
//    session id (run-window-core.mjs header), so a read of the session file alone would measure the wrong context.
// 4. The request: the LAST request, in the reader's walk order, whose context is the bound one. One context is one
//    append-only file, so walk order is append order and no timestamp is parsed. None → `no-request`.
// 5. The size: `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` of that request's usage, each
//    admitted by `isTokenCount`, else `usage-unreadable` — the baseline's "context per request".
// 6. The decision: size > threshold → `over` (EXIT.over); otherwise `within` (EXIT.ok).
// UNKNOWN ALWAYS MEANS GO ON (the ticket's decision): every reason in REASONS exits EXIT.ok.
//
// THE THRESHOLD: `budget.entryContextTokens` in the project's pharn.config.json. No file, no own `budget` key or no own
// `entryContextTokens` key → DEFAULT_ENTRY_CONTEXT_TOKENS (the one copy, L41). Present → a safe integer in
// [MIN_ENTRY_CONTEXT_TOKENS, MAX_ENTRY_CONTEXT_TOKENS], else `threshold-malformed` (go on, and the printed line says
// so). Own-property reads only (L15). The default and its reasons (which of the 36 runs it stops and lets through):
// `.dev/guides/floor-gates.md`, "check-entry-context.mjs".
//
// ==================================== HONEST SCOPE (P0) ====================================
// • FLOOR: given the same markers, transcript bytes and config, the decision is deterministic — set sizes, string
//   equality, `isTokenCount`, one integer compare, a closed reason set. Tests pin each branch.
// • ADVISORY: that the size read IS this context's size. The transcript format is undocumented and machine-local, and
//   the transcript is writable by the agent (pharn/LIMITS.md §6): a forged line can trip the stop (the safe direction)
//   or lift it (no guard, as before this module). The binding rests on the run-start line's output reaching the calling
//   context's tool result BEFORE this check runs (probed once: on disk by the next Bash call), and the last request is
//   taken to be the one that issued the check.
// • ADVISORY: that a run obeys the exit code — the model runs the line (L19).
//
// TRUST (P2): no transcript free text leaves this module. Output is a closed reason code, a fixed sentence, integers
// and the context KIND (`main` / `agent`, never an agent or session id). A config value quoted into a reason goes
// through `shown()` (quote-core.mjs), which cannot throw (L62).

import { findTranscriptDirs, sessionScan } from "./transcript-core.mjs";
import { AGENT_CONTEXT_PREFIX, MAIN_CONTEXT, bindRun, bindingMarkers, runWindow } from "./run-window-core.mjs";
import { markerLine } from "./mark-phase.mjs";
import { isIdentityToken, isTokenCount } from "./cost-value-core.mjs";
import { shown } from "./quote-core.mjs";

/** The threshold when the project sets none. The one copy (L41). The maintainer's choice at GATE 1, from the baseline. */
export const DEFAULT_ENTRY_CONTEXT_TOKENS = 320000;
export const MIN_ENTRY_CONTEXT_TOKENS = 1;
/** No context window a model offers today is larger, so this value turns the stop off in practice. */
export const MAX_ENTRY_CONTEXT_TOKENS = 1000000;
export const BUDGET_KEY = "budget";
export const THRESHOLD_KEY = "entryContextTokens";

/** Exit codes. `ok` covers `within` AND every `unknown`; `/pharn-loop` stops on `over` alone. */
export const EXIT = Object.freeze({ ok: 0, usage: 2, over: 3 });

/** The verdict tokens of the printed line. */
export const VERDICTS = Object.freeze(["within", "over", "unknown"]);

/** The CLOSED set of reasons a measure is unknown, each with its fixed sentence. A reason outside it is a bug. */
export const REASONS = Object.freeze({
  "no-session": "no session id (CLAUDE_CODE_SESSION_ID unset or not an identity token)",
  "no-transcript": "no transcript was found for this session under the projects directory",
  "several-transcripts": "this session resolves to more than one transcript directory",
  "window-unknown": "the run's markers do not open a window for this session (no run-start for it)",
  "no-holder": "no tool result in this session's transcript carries this run's run-start line yet",
  "several-holders": "this run's marker lines appear in the tool results of more than one context",
  "no-request": "the context that ran this command has no request in the transcript",
  "usage-unreadable": "the latest request's usage holds no readable token counts",
  "threshold-malformed": "budget.entryContextTokens in pharn.config.json is not an integer in range",
  crashed: "the check failed unexpectedly",
});

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const unknown = (reason, detail = null) => ({ status: "unknown", reason, detail });

/**
 * The threshold from pharn.config.json's text (`null` when the file is absent). Returns
 * `{ ok: true, value, source: "default" | "config" }` or `{ ok: false, reason: "threshold-malformed", detail }`.
 * Own-property reads at both levels (L15): an inherited `toString` or a `__proto__` key reads as absent.
 */
export function parseEntryThreshold(text) {
  const dflt = { ok: true, value: DEFAULT_ENTRY_CONTEXT_TOKENS, source: "default" };
  const bad = (detail) => ({ ok: false, reason: "threshold-malformed", detail });
  if (text === null || text === undefined) return dflt;
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch {
    return bad("pharn.config.json is not valid JSON");
  }
  if (!isPlainObject(cfg)) return bad("pharn.config.json is not a JSON object");
  if (!Object.hasOwn(cfg, BUDGET_KEY)) return dflt;
  const budget = cfg[BUDGET_KEY];
  if (!isPlainObject(budget)) return bad(`\`${BUDGET_KEY}\` is not an object (got ${shown(budget)})`);
  if (!Object.hasOwn(budget, THRESHOLD_KEY)) return dflt;
  const v = budget[THRESHOLD_KEY];
  if (!Number.isSafeInteger(v) || v < MIN_ENTRY_CONTEXT_TOKENS || v > MAX_ENTRY_CONTEXT_TOKENS) {
    return bad(
      `\`${BUDGET_KEY}.${THRESHOLD_KEY}\` must be an integer from ${MIN_ENTRY_CONTEXT_TOKENS} to ${MAX_ENTRY_CONTEXT_TOKENS} (got ${shown(v)})`
    );
  }
  return { ok: true, value: v, source: "config" };
}

/** A request's context size (rule 5), or null when any of the three counts is not an admitted token count. */
export function contextSize(usage) {
  if (!isPlainObject(usage)) return null;
  const parts = [usage.input_tokens, usage.cache_creation_input_tokens, usage.cache_read_input_tokens];
  if (!parts.every(isTokenCount)) return null;
  return parts[0] + parts[1] + parts[2];
}

/** `main` or `agent` — the kind of a context key, never its id. */
export function contextKind(ctx) {
  if (ctx === MAIN_CONTEXT) return "main";
  return typeof ctx === "string" && ctx.startsWith(AGENT_CONTEXT_PREFIX) ? "agent" : null;
}

/**
 * Rules 1–5. `markers` are normalized markers (render-cost-ledger.mjs `readMarkers`). Returns
 * `{ status: "measured", size, kind }` or `{ status: "unknown", reason, detail }`.
 */
export function measureEntryContext({ markers, sessionId, projectsDir }) {
  if (!isIdentityToken(sessionId)) return unknown("no-session");
  const win = runWindow(markers, sessionId);
  if (win.status === "unknown") return unknown("window-unknown");
  const hits = findTranscriptDirs(projectsDir, sessionId);
  if (hits.length === 0) return unknown("no-transcript");
  if (hits.length > 1) return unknown("several-transcripts");
  const lines = bindingMarkers(markers, sessionId).map(markerLine);
  const { requests, holders } = sessionScan(hits[0], sessionId, lines);
  const held = [];
  for (const l of lines) for (const c of holders.get(l) ?? []) held.push(c);
  const bound = bindRun(held);
  if (bound.context === null) return unknown(new Set(held).size > 1 ? "several-holders" : "no-holder");
  let last = null;
  for (const r of requests) if (r.context === bound.context) last = r;
  if (last === null) return unknown("no-request");
  const size = contextSize(last.usage);
  if (size === null) return unknown("usage-unreadable");
  return { status: "measured", size, kind: contextKind(bound.context) };
}

/**
 * Rule 6. `measure` is `measureEntryContext`'s result, `threshold` `parseEntryThreshold`'s. Returns
 * `{ verdict, exit, line }`; `line` is the ONE printed line.
 */
export function decide(measure, threshold) {
  if (!threshold.ok) return unknownVerdict(threshold.reason, threshold.detail);
  if (measure.status !== "measured") return unknownVerdict(measure.reason, measure.detail);
  const tail = `(context ${measure.kind}, threshold ${threshold.source})`;
  if (measure.size > threshold.value) {
    return {
      verdict: "over",
      exit: EXIT.over,
      line:
        `entry-context: over ${measure.size} > ${threshold.value} tokens ${tail} — every later request of this run re-sends ` +
        `this context; start a fresh session (or run it inside an agent), or raise ${BUDGET_KEY}.${THRESHOLD_KEY} in pharn.config.json`,
    };
  }
  return { verdict: "within", exit: EXIT.ok, line: `entry-context: within ${measure.size} <= ${threshold.value} tokens ${tail}` };
}

/** An `unknown` verdict for a REASONS member: exit ok, the fixed sentence, and a config detail when there is one. */
export function unknownVerdict(reason, detail = null) {
  const code = Object.hasOwn(REASONS, reason) ? reason : "crashed";
  const why = detail === null ? REASONS[code] : `${REASONS[code]}: ${detail}`;
  return { verdict: "unknown", exit: EXIT.ok, line: `entry-context: unknown ${code} — ${why}; going on` };
}
