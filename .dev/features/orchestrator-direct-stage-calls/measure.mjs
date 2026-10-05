#!/usr/bin/env node
// .dev/features/orchestrator-direct-stage-calls/measure.mjs — the READ-ONLY helper behind every figure in this
// increment's PLAN.md "Why" (apparatus; never shipped). It prints ONE JSON document and writes nothing.
//
//   node .dev/features/orchestrator-direct-stage-calls/measure.mjs \
//     --transcript ~/.claude/projects/<project key>/<session>.jsonl \
//     --from <ISO run-start> --to <ISO run-stop> \
//     [--ledger <cost.json>]…
//
// WHAT IT READS — machine-local, perishable inputs (the batch's measurement record says so for all of them):
//   * the orchestrator's transcript, MAIN context only (records with `isSidechain` false). A request is the set of
//     assistant lines sharing one `requestId`; its served model is its first line's `message.model`.
//   * zero or more cost ledgers (`pharn-cost-ledger/2`): `requests[]` rows, `sidechain` false = the orchestrator.
// WHAT IT PRINTS:
//   * `models` — served model per main-context request, with the first and last timestamp of each;
//   * `slash` — every user record carrying `<command-name>` (a person's slash invocation);
//   * `skills` — every Skill tool use in the main context (a model's invocation), with its timestamp;
//   * `injected` — every `isMeta` user record: its timestamp, its UTF-8 bytes, its first line, and how many main-context
//     requests in [--from, --to] came after it (the requests that carried it);
//   * `window` — main-context requests in [--from, --to]; and `route_marker_pairs`: requests whose ONLY Bash command runs
//     `stage-agent.mjs route`, each followed by a request whose Bash command runs a `mark-phase.mjs … --kind
//     stage-start … --route` — the data dependency C1 removes;
//   * `ledgers` — per ledger: orchestrator rows, all rows, and the orchestrator share (the audit's C1 bar is >= 20%).
// FAILURE MODES, stated: an absent or unreadable input is reported as `null` with its reason, never as a zero; a torn
// JSONL line is skipped and counted. The home directory is printed as `~`.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";

function args(argv) {
  const o = { ledgers: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--transcript") o.transcript = v;
    else if (k === "--from") o.from = v;
    else if (k === "--to") o.to = v;
    else if (k === "--ledger") o.ledgers.push(v);
    else throw new Error(`unknown argument ${JSON.stringify(k)}`);
    i++;
  }
  return o;
}

const home = (p) => (typeof p === "string" ? p.replace(homedir(), "~") : p);
const textOf = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b && b.type === "text" ? b.text : "")).join("") : "");

function readJsonl(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    return { records: null, reason: e.code ?? "unreadable", torn: 0 };
  }
  const records = [];
  let torn = 0;
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      torn++;
    }
  }
  return { records, reason: null, torn };
}

function transcript(o) {
  const t = readJsonl(o.transcript);
  if (t.records === null) return { path: home(o.transcript), unavailable: t.reason };
  const main = t.records.filter((r) => !r.isSidechain);
  const req = new Map();
  for (const r of main) {
    if (r.type !== "assistant" || !r.message) continue;
    const id = r.requestId ?? r.message.id;
    if (!req.has(id)) req.set(id, { ts: r.timestamp, model: r.message.model, tools: [] });
    for (const c of r.message.content ?? []) if (c.type === "tool_use") req.get(id).tools.push({ name: c.name, input: c.input });
  }
  const rows = [...req.values()].sort((a, b) => (a.ts < b.ts ? -1 : 1));
  const inWindow = (ts) => (!o.from || ts > o.from) && (!o.to || ts <= o.to);
  const models = {};
  for (const x of rows) {
    models[x.model] ??= { requests: 0, first: x.ts, last: x.ts };
    models[x.model].requests++;
    models[x.model].last = x.ts;
  }
  const slash = main
    .filter((r) => r.type === "user" && r.message && /<command-name>/.test(textOf(r.message.content)))
    .map((r) => ({ ts: r.timestamp, command: textOf(r.message.content).match(/<command-name>([^<]*)</)?.[1] ?? null }));
  const skills = rows.flatMap((x) =>
    x.tools.filter((t) => t.name === "Skill").map((t) => ({ ts: x.ts, model: x.model, skill: t.input?.skill ?? null }))
  );
  const injected = main
    .filter((r) => r.type === "user" && r.isMeta && r.message)
    .map((r) => {
      const text = textOf(r.message.content);
      return {
        ts: r.timestamp,
        bytes: Buffer.byteLength(text, "utf8"),
        head: text.split("\n")[0].slice(0, 100),
        carried_by_window_requests: rows.filter((x) => x.ts > r.timestamp && inWindow(x.ts)).length,
      };
    });
  const windowRows = rows.filter((x) => inWindow(x.ts));
  const bashOf = (x) => x.tools.filter((t) => t.name === "Bash").map((t) => String(t.input?.command ?? ""));
  const pairs = [];
  for (let i = 0; i + 1 < windowRows.length; i++) {
    const a = bashOf(windowRows[i]);
    const b = bashOf(windowRows[i + 1]);
    if (
      a.length &&
      a.every((c) => /stage-agent\.mjs route\b/.test(c)) &&
      b.some((c) => /mark-phase\.mjs[^\n]*--kind stage-start[^\n]*--route/.test(c))
    ) {
      pairs.push({ route_at: windowRows[i].ts, marker_at: windowRows[i + 1].ts });
    }
  }
  return {
    path: home(o.transcript),
    torn_lines: t.torn,
    models,
    slash,
    skills,
    injected,
    window: { from: o.from ?? null, to: o.to ?? null, requests: windowRows.length },
    route_marker_pairs: pairs,
  };
}

function ledger(path) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return { path: home(path), unavailable: e.code ?? "unparseable" };
  }
  const rows = Array.isArray(doc.requests) ? doc.requests : null;
  if (rows === null) return { path: home(path), unavailable: "no requests[]" };
  const orchestrator = rows.filter((r) => r.sidechain === false).length;
  return {
    path: home(path),
    orchestrator_rows: orchestrator,
    all_rows: rows.length,
    orchestrator_share: rows.length ? Math.round((orchestrator / rows.length) * 1000) / 10 : null,
  };
}

const o = args(process.argv.slice(2));
const out = {
  transcript: o.transcript ? transcript(o) : null,
  ledgers: o.ledgers.map(ledger),
};
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
