// pharn/floor/route-token-core.mjs — what a routed stage is REQUESTED with: the ROUTE TOKEN grammar (added 6.27.0,
// stage-model-routing) and, beside it, the EFFORT line's (7.20.0, stage-effort-routing). One reason to change: the
// Agent tool's parameter sets, or the token's shape. Pure: no filesystem, no child_process, no network, no clock, and
// ZERO imports.
//
// ── What a route token is ────────────────────────────────────────────────────────────────────────────
// `/pharn-ship` and `/pharn-loop` decide, per pipeline stage, whether that stage runs as a Claude Code
// subagent, REQUESTED on the model `pharn.config.json`'s `models.stages` resolves for it, or inline in the
// orchestrator's own turn. The decision is printed by `pharn/floor/stage-agent.mjs route` as ONE token, and
// the orchestrator records the same token on the stage's `stage-start` marker (`mark-phase.mjs --route`):
//   agent:<alias>     — the stage was REQUESTED as a subagent on <alias>, a member of AGENT_MODELS;
//   inline:<reason>   — the stage ran inline, and <reason>, a member of INLINE_REASONS, says why.
// `stage-agent-core.mjs`'s header is the routing protocol's spec; this module owns only the token.
//
// ── Why this is its own module (GRILL G-P3, the ledger's load graph) ─────────────────────────────────
// The marker writer (`mark-phase.mjs`) and the ledger readers that import it (`render-cost-ledger.mjs`,
// and through them `check-cost-ledger.mjs`, `ship-outcome-core.mjs`, `render-run-report.mjs`) need the
// token's GRAMMAR, never the routing policy or the stage agent's brief. Importing the grammar from
// `stage-agent-core.mjs` would have put the policy table and the brief template into every ledger reader's
// load graph, so an edit to the brief could break the cost ledger. One owner for the grammar, here; every
// consumer imports it, none re-spells it (L35).
//
// ── Floor / advisory (P0) ────────────────────────────────────────────────────────────────────────────
// FLOOR (primitive #3): `isRouteToken` is a closed membership test — a clean-scalar guard (no control
//   character, bounded length — L14, composed BEFORE the anchored regex, never instead of it) then an
//   exact alternation built from the two closed sets below. A variant spelling (`Agent:opus`,
//   `agent:gpt`, `inline:other`, a trailing space or newline) is refused.
// ADVISORY, and the bound that matters: a token on a marker records what was REQUESTED at the moment the
//   stage started (L42). `agent:<alias>` never proves the stage ran on that model — the platform applies
//   the model, and `cost.json`'s `requests[].model` is what a transcript says was served (L43: agreement
//   between two records, never proof).
//
// ── AGENT_MODELS is a copy of a platform fact, pinned (L31) ──────────────────────────────────────────
// The Agent tool's `model` parameter, as read in Claude Code 2.1.281, takes `sonnet`, `opus`, `haiku` and
// `fable`. `check-model-config.mjs`'s `MODEL_ALIASES` is those four plus `inherit`. A parity test
// (`route-token-core.test.mjs`) reads the checker's SOURCE and requires AGENT_MODELS to equal
// MODEL_ALIASES minus `inherit`, so a new config alias cannot ship without a routing decision. `inherit`
// and a full `claude-*` id are valid CONFIG values that are NOT agent models: they route inline, each with
// its own reason (`stage-agent-core.mjs`, "The model value"). A harness whose Agent tool takes a different
// set is a named residual (`agent-model-set-drift`): a value the tool refuses fails the spawn, which the
// orchestrator reads as an unusable result and STOPs on — never a silent swap.

/** The Agent tool's model aliases a stage can be routed to. Frozen; a membership test is `.includes()`. */
export const AGENT_MODELS = Object.freeze(["sonnet", "opus", "haiku", "fable"]);

// ── AGENT_EFFORTS is a copy of a platform fact too, pinned the same way (7.20.0, stage-effort-routing) ───────────
// The Agent tool's optional `effort` parameter, as read on 2026-11-16 (`.dev/features/stage-effort-routing/
// EFFORT-PROBE.md`): the desktop app's Agent tool schema and the terminal CLI 2.1.323's embedded schema both take
// `low`, `medium`, `high`, `xhigh` and `max`. `check-model-config.mjs`'s `EFFORT_ENUM` is the same five; a parity test
// (`route-token-core.test.mjs`) reads the checker's SOURCE and requires the two to be equal, so a config effort cannot
// ship without a routing decision. `stage-agent.mjs start` prints the resolved effort as ONE line, `effort:<level>`
// (`effortLine`), after the token and the marker line; the orchestrator passes the level as the Agent call's `effort`.
// ADVISORY, and the bound that matters: the line records what is REQUESTED. Whether the Agent call carried it is the
// orchestrating model's act, and the effort a request was SENT with is visible, at most, in a transcript format the
// platform does not document — never proof. Named residuals (`stage-agent-core.mjs`): a harness whose tool takes a
// different set (`agent-effort-set-drift`), and one whose tool lists no `effort` at all (`agent-effort-param-absent`).

/** The Agent tool's effort levels a routed stage can be requested at. Frozen; a membership test is `.includes()`. */
export const AGENT_EFFORTS = Object.freeze(["low", "medium", "high", "xhigh", "max"]);

/** The effort line's prefix. */
export const EFFORT_PREFIX = "effort:";

/**
 * Every reason a stage with a route line can run inline. The first two are POLICY (`ROUTE_POLICY` in
 * `stage-agent-core.mjs`); the next six are decided by `stage-agent.mjs route` from the config and the
 * checker's exit codes; `no-agent-tool` records the orchestrating model's reading of its own tools (advisory),
 * passed to `stage-agent.mjs start` as a flag; `no-foreground-agent` (6.73.2) is RETIRED — no `start` records it
 * now, and it stays a member so the markers and ledgers written before still validate; `route-unavailable`
 * is `start`'s own fallback, and the orchestrators record it themselves when the start line crashes. `stage-agent-core.mjs`'s header carries the table with each reason's remedy.
 */
export const INLINE_REASONS = Object.freeze([
  "interactive",
  "floor-only",
  "no-config",
  "no-stages",
  "config-red",
  "inherit",
  "model-id",
  "resolve-failed",
  "no-agent-tool",
  "no-foreground-agent",
  "route-unavailable",
]);

/** The two token prefixes. */
export const AGENT_PREFIX = "agent:";
export const INLINE_PREFIX = "inline:";

/** The longest token the grammar can produce, plus headroom — the clean-scalar bound. */
export const ROUTE_TOKEN_MAX = 64;

// Every member above is `[a-z-]` only, so it needs no escaping inside an alternation; a test pins that,
// so a member added later with a metacharacter fails there rather than widening the regex silently.
/** The token grammar, built FROM the two closed sets above, never re-typed (L35). Anchored both ends. */
export const ROUTE_TOKEN_RE = new RegExp(`^(?:agent:(?:${AGENT_MODELS.join("|")})|inline:(?:${INLINE_REASONS.join("|")}))$`);

/** No C0 control character (tab, newline and carriage return included), no DEL, 1..max characters. */
function cleanScalar(v, max) {
  if (typeof v !== "string" || v.length < 1 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

/** True iff `v` is exactly one route token. Total: any value, of any type, returns a boolean. */
export function isRouteToken(v) {
  return cleanScalar(v, ROUTE_TOKEN_MAX) && ROUTE_TOKEN_RE.test(v);
}

/** The token for a routed stage, or null when `alias` is not an agent model. */
export function agentToken(alias) {
  return typeof alias === "string" && AGENT_MODELS.includes(alias) ? `${AGENT_PREFIX}${alias}` : null;
}

/** The token for an inline stage, or null when `reason` is not an inline reason. */
export function inlineToken(reason) {
  return typeof reason === "string" && INLINE_REASONS.includes(reason) ? `${INLINE_PREFIX}${reason}` : null;
}

/** The effort line `start` prints for a routed stage, or null when `level` is not an agent effort. */
export function effortLine(level) {
  return typeof level === "string" && AGENT_EFFORTS.includes(level) ? `${EFFORT_PREFIX}${level}` : null;
}
