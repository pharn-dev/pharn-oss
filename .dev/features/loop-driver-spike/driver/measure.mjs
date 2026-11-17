#!/usr/bin/env node
// .dev/features/loop-driver-spike/driver/measure.mjs — the CORE-113 spike's figures, read from the runs' own outputs.
// Dev apparatus, never shipped. It reads files only; it starts nothing and writes nothing.
//
//   node measure.mjs --driver <driver out dir> [--loop <comparison out dir>] [--loop-cost <cost.json>]
//                    [--driver-cost <cost.json>]
//
// Prints ONE JSON document:
//   driver.sessions[]  per `claude -p` session: stage, deduped requests, token classes, weighted units, the first
//                      request's processed context, the models served, the CLI's reported USD, deny lines seen,
//                      permission denials;
//   driver.stages      the sessions summed per stage (probes apart), and wall minutes per stage from steps.jsonl;
//   loop.ledger        from the comparison run's cost.json: weighted units per stage and role (orchestrator =
//                      rows whose context equals membership.context, the rule `audit.mjs` uses), the orchestrator's
//                      share, minutes per stage from `executions`, the run window;
//   loop.stream        the comparison session's own stream: deduped requests per context, the CLI's USD.
//
// Weighted units are the baseline's formula (`.dev/measurements/loop-baseline-2026-11-11.md` §2), in units of one
// input token: input + 1.25·cache_write_5m + 2·cache_write_1h + 0.1·cache_read + 5·output. No price is applied by
// this script; `total_cost_usd` is the CLI's own figure, copied and labelled as such. Every free-text field the
// streams hold is DATA; this script counts and sums, and quotes nothing but the fixed deny marker.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { sessionRequests } from "../../../../pharn/floor/transcript-core.mjs";

export const DENY_MARKER = "PHARN floor — write blocked";
const ZERO = () => ({ input: 0, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0, output: 0 });

export function weighted(t) {
  return t.input + 1.25 * t.cache_write_5m + 2 * t.cache_write_1h + 0.1 * t.cache_read + 5 * t.output;
}

export function processed(t) {
  return t.input + t.cache_write_5m + t.cache_write_1h + t.cache_read;
}

/** Token classes of one API `usage` object. Without a 5m/1h breakdown, every cache write counts as 5-minute and
 *  `split_unknown` says so. */
export function tokensOf(u = {}) {
  const cc = u.cache_creation;
  const has = cc && typeof cc === "object";
  return {
    input: u.input_tokens ?? 0,
    cache_write_5m: has ? (cc.ephemeral_5m_input_tokens ?? 0) : (u.cache_creation_input_tokens ?? 0),
    cache_write_1h: has ? (cc.ephemeral_1h_input_tokens ?? 0) : 0,
    cache_read: u.cache_read_input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    split_unknown: !has && (u.cache_creation_input_tokens ?? 0) > 0,
  };
}

export function add(a, b) {
  const r = ZERO();
  for (const k of Object.keys(r)) r[k] = (a[k] ?? 0) + (b[k] ?? 0);
  return r;
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => (c && typeof c.text === "string" ? c.text : "")).join("\n");
  return "";
}

/** Read one stream-json file's text. Requests are deduped by message id (a message is streamed once per content
 *  block, each carrying the same usage); the LAST usage seen for an id is kept. */
export function readStream(text) {
  const requests = new Map();
  let denies = 0;
  let result = null;
  let init = null;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (o.type === "system" && o.subtype === "init" && init === null) init = o;
    if (o.type === "assistant" && o.message && o.message.id && o.message.usage) {
      requests.set(o.message.id, { model: o.message.model, tokens: tokensOf(o.message.usage), parent: o.parent_tool_use_id ?? null });
    }
    if (o.type === "user" && o.message && Array.isArray(o.message.content)) {
      for (const c of o.message.content) if (c && c.type === "tool_result" && textOf(c.content).includes(DENY_MARKER)) denies += 1;
    }
    if (o.type === "result") result = o;
  }
  return { requests: [...requests.values()], denies, result, init };
}

export function summarizeRequests(reqs) {
  let tokens = ZERO();
  const models = {};
  let splitUnknown = 0;
  for (const r of reqs) {
    tokens = add(tokens, r.tokens);
    models[r.model] = (models[r.model] ?? 0) + 1;
    splitUnknown += r.tokens.split_unknown ? 1 : 0;
  }
  return {
    requests: reqs.length,
    tokens,
    weighted: Math.round(weighted(tokens)),
    first_request_context: reqs.length ? processed(reqs[0].tokens) : null,
    models,
    requests_without_cache_split: splitUnknown,
  };
}

const STAGE_OF_STEP = [
  [/^(spec-|peek-1)/, "spec"],
  [/^(plan-|peek-2)/, "plan"],
  [/^grill-/, "grill"],
  [/^entry-wait/, "entry-wait"],
  [/^test-/, "test"],
  [/^probe-/, "probes"],
  [/^build-/, "build"],
  [/^(scope|verify|verify-resume|fresh|fresh-rerun|fresh-reason)$/, "verify"],
  [/^(stop-read|stop-terminal)$/, "stop"],
  [/^[de]-/, "entry"],
  [/^c/, "close"],
];

export function stageOfStep(id) {
  for (const [re, s] of STAGE_OF_STEP) if (re.test(id)) return s;
  return "other";
}

/** One session's requests read from its TRANSCRIPT by the ledger's own reader (`transcript-core.mjs`
 *  `sessionRequests`: one row per request id, the usage line with the greatest output), so the driver's figures and
 *  the comparison run's `cost.json` count by one rule. The stream-json output under-reports `output_tokens` (it carries
 *  each message's usage as streamed, measured on driver-1: 278 against the session result's 14,006), so the stream is
 *  used for its result, init and deny lines only when a transcripts directory is given. */
export function transcriptRequests(projectDir, sessionId) {
  return sessionRequests(projectDir, sessionId).requests.map((r) => ({
    model: r.record.message.model,
    tokens: tokensOf(r.usage),
    parent: null,
  }));
}

export function driverFigures(dir, transcripts) {
  const sessions = JSON.parse(readFileSync(join(dir, "sessions.json"), "utf8"));
  const rows = sessions.map((s) => {
    const st = readStream(readFileSync(s.stream, "utf8"));
    const sum = summarizeRequests(transcripts ? transcriptRequests(transcripts, s.session_id) : st.requests);
    sum.token_source = transcripts ? "transcript (sessionRequests)" : "stream-json (output under-reported)";
    return {
      stage: s.stage,
      step: s.step,
      session_id: s.session_id,
      requested_model: s.model,
      agent_pharn_stage: s.agent,
      effort_flag: s.effort,
      resume: s.resume,
      wall_ms: s.ms,
      exit: s.status,
      ...sum,
      cli_total_cost_usd: st.result ? st.result.total_cost_usd : null,
      cli_duration_ms: st.result ? st.result.duration_ms : null,
      cli_num_turns: st.result ? st.result.num_turns : null,
      permission_denials: st.result && Array.isArray(st.result.permission_denials) ? st.result.permission_denials.length : null,
      deny_marker_lines: st.denies,
      init_model: st.init ? st.init.model : null,
      init_permission_mode: st.init ? st.init.permissionMode : null,
      init_tools: st.init && Array.isArray(st.init.tools) ? st.init.tools.length : null,
      result_session_id: st.result ? st.result.session_id : null,
    };
  });
  const byStage = {};
  for (const r of rows) {
    const k = r.stage.startsWith("probe") ? "probes" : r.stage;
    const b = (byStage[k] ??= { sessions: 0, requests: 0, tokens: ZERO(), weighted: 0, cli_total_cost_usd: 0, wall_ms: 0 });
    b.sessions += 1;
    b.requests += r.requests;
    b.tokens = add(b.tokens, r.tokens);
    b.weighted += r.weighted;
    b.cli_total_cost_usd += r.cli_total_cost_usd ?? 0;
    b.wall_ms += r.wall_ms;
  }
  const steps = readFileSync(join(dir, "steps.jsonl"), "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  const minutes = {};
  for (const s of steps) minutes[stageOfStep(s.id)] = (minutes[stageOfStep(s.id)] ?? 0) + (s.ms ?? 0) / 60000;
  let summary;
  try {
    summary = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
  } catch {
    summary = null;
  }
  const model = rows.filter((r) => !r.stage.startsWith("probe"));
  const total = model.reduce((a, r) => add(a, r.tokens), ZERO());
  return {
    sessions: rows,
    stages: byStage,
    minutes_by_stage: minutes,
    total_excluding_probes: {
      tokens: total,
      weighted: Math.round(weighted(total)),
      cli_total_cost_usd: model.reduce((a, r) => a + (r.cli_total_cost_usd ?? 0), 0),
    },
    wall_minutes: summary ? summary.wall_ms / 60000 : null,
    stop: summary ? summary.stop : null,
    decision: summary ? summary.decision : null,
    closeout: summary ? summary.closeout : null,
  };
}

export function ledgerFigures(cost) {
  const ctx = cost.membership && cost.membership.context;
  const groups = {};
  let orch = 0;
  let all = 0;
  let orchReq = 0;
  for (const r of cost.requests ?? []) {
    const rowCtx = r.sidechain ? `agent:${r.agent_id}` : "main";
    const role = rowCtx === ctx ? "orchestrator" : "stage-agent";
    const w = weighted(r.tokens);
    const k = `${r.stage ?? "between"}|${role}`;
    const g = (groups[k] ??= { stage: r.stage ?? "between", role, requests: 0, weighted: 0, context_sum: 0 });
    g.requests += 1;
    g.weighted += w;
    g.context_sum += processed(r.tokens);
    all += w;
    orch += role === "orchestrator" ? w : 0;
    orchReq += role === "orchestrator" ? 1 : 0;
  }
  const minutes = {};
  for (const row of (cost.executions && cost.executions.rows) ?? []) {
    const k = `${row.stage}${row.iteration ? `#${row.iteration}` : ""}`;
    minutes[k] = (minutes[k] ?? 0) + (typeof row.elapsed_ms === "number" ? row.elapsed_ms / 60000 : 0);
  }
  return {
    schema: cost.schema,
    skills_version: cost.skills_version,
    coverage: cost.coverage,
    membership: cost.membership,
    outcome: cost.outcome,
    requests: (cost.requests ?? []).length,
    orchestrator_requests: orchReq,
    weighted_total: Math.round(all),
    orchestrator_weighted: Math.round(orch),
    orchestrator_share: all > 0 ? orch / all : null,
    groups: Object.values(groups).map((g) => ({
      ...g,
      weighted: Math.round(g.weighted),
      mean_context: Math.round(g.context_sum / g.requests),
    })),
    minutes_by_stage: minutes,
    window_minutes: cost.window_start && cost.window_end ? (Date.parse(cost.window_end) - Date.parse(cost.window_start)) / 60000 : null,
  };
}

export function loopStream(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  return files.map((f) => {
    const st = readStream(readFileSync(join(dir, f), "utf8"));
    const main = st.requests.filter((r) => r.parent === null);
    const sub = st.requests.filter((r) => r.parent !== null);
    return {
      file: f,
      main_thread: summarizeRequests(main),
      subagents_in_stream: summarizeRequests(sub),
      cli_total_cost_usd: st.result ? st.result.total_cost_usd : null,
      cli_duration_ms: st.result ? st.result.duration_ms : null,
      permission_denials: st.result && Array.isArray(st.result.permission_denials) ? st.result.permission_denials.length : null,
      deny_marker_lines: st.denies,
      init_model: st.init ? st.init.model : null,
      model_usage: st.result ? st.result.modelUsage : null,
    };
  });
}

/** The whole document for `argv` (the CLI's arguments). */
export function measure(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      driver: { type: "string" },
      transcripts: { type: "string" },
      loop: { type: "string" },
      "loop-cost": { type: "string" },
      "driver-cost": { type: "string" },
    },
    strict: true,
  });
  const doc = { schema: "loop-driver-spike-measure/1", weights: "input + 1.25*cw5m + 2*cw1h + 0.1*cr + 5*out" };
  if (values.driver) doc.driver = driverFigures(values.driver, values.transcripts);
  if (values["driver-cost"]) doc.driver_ledger = ledgerFigures(JSON.parse(readFileSync(values["driver-cost"], "utf8")));
  if (values.loop) doc.loop = { stream: loopStream(values.loop) };
  if (values["loop-cost"]) (doc.loop ??= {}).ledger = ledgerFigures(JSON.parse(readFileSync(values["loop-cost"], "utf8")));
  return doc;
}

if (import.meta.main) process.stdout.write(JSON.stringify(measure(process.argv.slice(2)), null, 2) + "\n");
