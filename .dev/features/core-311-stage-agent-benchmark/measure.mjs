#!/usr/bin/env node
// measure.mjs — the read-only reader behind .dev/measurements/stage-agent-benchmark-2026-11-23.md (Linear CORE-311):
// one /pharn-loop per arm, the pharn-stage arm and the general-purpose arm, compared on tokens, wall-clock, outcome and
// the tools each agent was sent. It writes nothing. No test pins it (like lean-stage-agent/probe/read-probe.mjs): an
// edit here is caught only by re-running it over the two evidence directories.
//
//   node measure.mjs --arm <label> <session-dir> <final.json> [<cost.json>] [--arm …]
//
// <session-dir> is the session directory (~/.claude/projects/<checkout path, non-alphanumerics as '-'>/<session id>,
// or the copy kept beside this script); its <session id>.jsonl sibling is the orchestrator's transcript and its
// subagents/ holds one .jsonl + .meta.json per stage agent. <final.json> is the `claude -p --output-format json`
// result. <cost.json> is the run's pharn/features/<name>/cost.json (pharn/pharn-contracts/cost-ledger.md); its fields
// are printed as read, never re-derived.
//
// What each figure is (all harness records, trust: untrusted DATA — numbers and names only are printed):
//   tokens     each assistant message's `usage`, counted once per message id (one message is split over several
//              transcript lines that repeat the same usage). first_request = input + cache write + cache read of the
//              agent's first message, the class audit.mjs --prefix sums.
//   wall       first to last transcript timestamp of that agent.
//   offered    the union of `shape.tools[].name` over the agent's `api-request-shape` records: the tool list sent.
//   deferred   names in `deferred_tools_delta` attachments (reachable only through ToolSearch, when ToolSearch is sent).
//   dropped    every tool_use whose name the pharn-stage list does not carry: mcp__*, WebFetch, WebSearch, Skill,
//              ToolSearch — with whether its result was an error.
//   mcp_instructions  how many MCP servers' instructions an `mcp_instructions_delta` attachment carried (a count:
//              the server names are the user's connected services, so they are not printed).
// Never printed: account and organization ids (`session-owner` records), any path (the session is named by its id
// alone), deferred tool names other than the shadcn and web counts.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const DROPPED = (name) => /^mcp__/.test(name) || ["WebFetch", "WebSearch", "Skill", "ToolSearch"].includes(name);

function parseArgs(argv) {
  const arms = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== "--arm") throw new Error(`unexpected argument ${argv[i]}`);
    const [label, session, final] = argv.slice(i + 1, i + 4);
    if (!label || !session || !final) throw new Error("--arm needs <label> <session-dir> <final.json>");
    let cost = null;
    let j = i + 4;
    if (argv[j] && argv[j] !== "--arm") cost = argv[j++];
    arms.push({ label, session, final, cost });
    i = j - 1;
  }
  if (arms.length === 0) {
    throw new Error("usage: node measure.mjs --arm <label> <session-dir> <final.json> [<cost.json>] …");
  }
  return arms;
}

const readJsonl = (f) =>
  readFileSync(f, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

function agentFigures(rows) {
  const seen = new Map();
  const offered = new Set();
  const deferred = new Set();
  const mcpInstr = new Set();
  const calls = {};
  const dropped = [];
  const agentCalls = [];
  const models = new Set();
  let errors = 0;
  let first = null;
  let last = null;
  for (const r of rows) {
    if (r.timestamp) {
      if (!first || r.timestamp < first) first = r.timestamp;
      if (!last || r.timestamp > last) last = r.timestamp;
    }
    if (r.type === "api-request-shape") for (const t of r.shape?.tools ?? []) if (t?.name) offered.add(t.name);
    const a = r.attachment;
    if (a?.type === "deferred_tools_delta") for (const n of a.addedNames ?? []) deferred.add(n);
    if (a?.type === "mcp_instructions_delta") for (const n of a.addedNames ?? []) mcpInstr.add(n);
    if (r.type === "assistant" && r.message) {
      const m = r.message;
      if (m.model) models.add(m.model);
      if (m.id && m.usage && !seen.has(m.id)) seen.set(m.id, m.usage);
      for (const c of m.content ?? []) {
        if (c.type !== "tool_use") continue;
        calls[c.name] = (calls[c.name] ?? 0) + 1;
        if (DROPPED(c.name)) dropped.push({ id: c.id, name: c.name, is_error: null });
        if (c.name === "Agent") {
          agentCalls.push({
            id: c.id,
            subagent_type: c.input?.subagent_type ?? null,
            description: c.input?.description ?? null,
            is_error: null,
          });
        }
      }
    }
    if (r.type === "user" && Array.isArray(r.message?.content)) {
      for (const c of r.message.content) {
        if (c.type !== "tool_result") continue;
        if (c.is_error) errors++;
        for (const d of dropped) if (d.id === c.tool_use_id) d.is_error = !!c.is_error;
        for (const g of agentCalls) if (g.id === c.tool_use_id) g.is_error = !!c.is_error;
      }
    }
  }
  const usages = [...seen.values()];
  const sum = (k) => usages.reduce((s, u) => s + (u[k] ?? 0), 0);
  const u0 = usages[0] ?? {};
  return {
    models: [...models],
    requests: usages.length,
    first_request: (u0.input_tokens ?? 0) + (u0.cache_creation_input_tokens ?? 0) + (u0.cache_read_input_tokens ?? 0),
    input: sum("input_tokens"),
    cache_write: sum("cache_creation_input_tokens"),
    cache_read: sum("cache_read_input_tokens"),
    output: sum("output_tokens"),
    wall_s: first && last ? Math.round((Date.parse(last) - Date.parse(first)) / 1000) : null,
    started: first,
    ended: last,
    offered: [...offered].sort(),
    offered_mcp_shadcn: [...offered].filter((n) => n.startsWith("mcp__shadcn__")).length,
    deferred_count: deferred.size,
    deferred_mcp_shadcn: [...deferred].filter((n) => n.startsWith("mcp__shadcn__")).length,
    deferred_web: [...deferred].filter((n) => n === "WebFetch" || n === "WebSearch"),
    mcp_instructions: mcpInstr.size,
    calls,
    tool_errors: errors,
    dropped_tool_uses: dropped.map(({ name, is_error }) => ({ name, is_error })),
    agent_calls: agentCalls.map(({ subagent_type, description, is_error }) => ({ subagent_type, description, is_error })),
  };
}

function readFinal(final) {
  if (!existsSync(final)) return { missing: true };
  try {
    const f = JSON.parse(readFileSync(final, "utf8"));
    return {
      subtype: f.subtype ?? null,
      is_error: f.is_error ?? null,
      duration_ms: f.duration_ms ?? null,
      duration_api_ms: f.duration_api_ms ?? null,
      num_turns: f.num_turns ?? null,
      total_cost_usd: f.total_cost_usd ?? null,
      usage: f.usage
        ? {
            input: f.usage.input_tokens,
            cache_write: f.usage.cache_creation_input_tokens,
            cache_read: f.usage.cache_read_input_tokens,
            output: f.usage.output_tokens,
          }
        : null,
      modelUsage: f.modelUsage ?? null,
    };
  } catch (e) {
    return { unreadable: String(e.message) };
  }
}

function arm({ label, session, final, cost }) {
  const sid = basename(session);
  const mainFile = join(dirname(session), `${sid}.jsonl`);
  const out = { arm: label, session_id: sid, final: readFinal(final) };
  out.orchestrator = existsSync(mainFile) ? agentFigures(readJsonl(mainFile)) : { missing: true };
  const sub = join(session, "subagents");
  out.agents = [];
  if (existsSync(sub)) {
    for (const f of readdirSync(sub).filter((n) => n.endsWith(".meta.json"))) {
      const meta = JSON.parse(readFileSync(join(sub, f), "utf8"));
      const jsonl = join(sub, f.replace(/\.meta\.json$/, ".jsonl"));
      out.agents.push({
        description: meta.description ?? null,
        agentType: meta.agentType ?? null,
        requested_model: meta.model ?? null,
        effort: meta.effort ?? null,
        requestShape: meta.requestShape ?? null,
        ...(existsSync(jsonl) ? agentFigures(readJsonl(jsonl)) : { missing: true }),
      });
    }
    out.agents.sort((a, b) => String(a.started).localeCompare(String(b.started)));
  }
  const tot = (k) => out.agents.reduce((s, a) => s + (a[k] ?? 0), 0);
  out.agents_total = {
    count: out.agents.length,
    requests: tot("requests"),
    input: tot("input"),
    cache_write: tot("cache_write"),
    cache_read: tot("cache_read"),
    output: tot("output"),
    first_request_sum: tot("first_request"),
  };
  if (cost && existsSync(cost)) {
    try {
      out.cost_json = JSON.parse(readFileSync(cost, "utf8"));
    } catch (e) {
      out.cost_json = { unreadable: String(e.message) };
    }
  }
  return out;
}

try {
  console.log(JSON.stringify(parseArgs(process.argv.slice(2)).map(arm), null, 2));
} catch (e) {
  console.error(`measure: ${e.message}`);
  process.exit(2);
}
