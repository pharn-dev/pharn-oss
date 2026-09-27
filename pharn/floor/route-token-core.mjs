// pharn/floor/route-token-core.mjs — the ROUTE TOKEN grammar, and nothing else (added 6.27.0,
// stage-model-routing). Pure: no filesystem, no child_process, no network, no clock, and ZERO imports.
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

/**
 * Every reason a stage with a route line can run inline. The first two are POLICY (`ROUTE_POLICY` in
 * `stage-agent-core.mjs`); the next six are decided by `stage-agent.mjs route` from the config and the
 * checker's exit codes; the last two are decided by the orchestrating model (advisory), and it records
 * them on the marker itself. `stage-agent-core.mjs`'s header carries the table with each reason's remedy.
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
