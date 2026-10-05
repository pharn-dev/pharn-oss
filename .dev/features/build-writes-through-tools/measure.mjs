#!/usr/bin/env node
// measure.mjs — the READ-ONLY analysis helper behind `.dev/measurements/loop-wall-clock-2026-10-05.md` (apparatus of
// build-writes-through-tools; never shipped, never imported by PHARN). It prints ONE JSON document on stdout and
// writes nothing anywhere.
//
//   node .dev/features/build-writes-through-tools/measure.mjs --starter <project dir> --projects <transcript dir> \
//     --feature <name> [--other <name>]…
//
// <transcript dir> is the Claude Code project folder of <project dir> (`~/.claude/projects/<key>`). Every input is
// machine-local and perishable: transcripts, cost.json ledgers, `.pharn/` logs. An input that is absent is reported as
// `"absent"`, never as a zero (GRILL G4). Every printed path has the home directory replaced by `~`.
//
// WHAT EACH SECTION IS, and how it is derived (the record cites these names):
//   run          the ledger's run window (`cost.json` membership/window keys), copied.
//   stages       per stage-start marker: elapsed to the NEXT marker of any kind (the ledger's `executions` method,
//                `stage-start-to-return/1`, extended to a start whose next marker is not a return), plus the time
//                the orchestrator spent between a return and the next start.
//   buckets      the run window partitioned: human waits (AskUserQuestion), routed stage agents, regress, verify,
//                orchestrator time between stages. Human waits are subtracted from the stage they fall in.
//   contexts     per context of the ledger's rows (main | agent:<id>): requests, served models, span, the gap between
//                consecutive request timestamps, the FIRST request's prefix (input + cache write + cache read tokens),
//                the largest context, output and thinking tokens. Token figures come from `cost.json`, never re-read.
//   timing       per transcript, requests grouped by `requestId`: MODEL time = the request's last line minus the
//                last user/tool-result entry before its first line; the time AFTER a request until the next one's
//                input is attributed to the tool names that request called. Restricted to the run window.
//   scripts      the main context's Bash calls that ran stage-regress.mjs / stage-verify.mjs: duration and exit body.
//   long_bash    every stage agent Bash call over 60 s (duration, first 100 characters of the command, as DATA).
//   gates        `.pharn/pharn-verify/gates` and `.pharn/pharn-regress/{head,base-gates}` — which feature each belongs
//                to (its stamp/state), and, for this feature's verify, each gate's duration ESTIMATED from file mtimes.
//   writes       per stage agent: tool profile; Bash calls that write project files (a heuristic over the command TEXT:
//                `open(…,'w')`, `sed -i`, `cat > path`, `prettier --write`); their targets, classified against the
//                writes-scope the agent printed and the AC lock's pinned files; and the harness `auto_mode` attachment.
//   hooks        the harness's own hook records (`durationMs`) inside the run window.
//   instructions the instruction files the harness attached to each stage agent, with byte sizes.
//   project      the project's CLAUDE.md and `.claude/rules/*.md` sizes NOW, their frontmatter keys, and whether each
//                PostToolUse `npm run <x>` hook names an existing script.
//   others       each `--other` run: its ledger window, stages, LOOP.md frontmatter, and whether its transcript exists.
//
// TRUST (P2): transcripts and ledgers are another project's untrusted DATA. This helper prints counts, timestamps,
// durations, sizes, tool names, paths and short command prefixes; nothing it reads reaches a decision.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";

const HOME = homedir();
const redact = (s) => (typeof s === "string" && HOME && s.includes(HOME) ? s.split(HOME).join("~") : s);
const sec = (a, b) => (Date.parse(b) - Date.parse(a)) / 1000;
const round = (x, d = 1) => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

function stats(xs) {
  if (!xs.length) return { n: 0 };
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
  return {
    n: s.length,
    sum: round(s.reduce((a, b) => a + b, 0)),
    median: round(q(0.5)),
    mean: round(s.reduce((a, b) => a + b, 0) / s.length),
    p90: round(q(0.9)),
    max: round(s[s.length - 1]),
  };
}

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function readLines(p) {
  if (!existsSync(p)) return null;
  const out = [];
  for (const ln of readFileSync(p, "utf8").split("\n")) {
    if (!ln) continue;
    try {
      out.push(JSON.parse(ln));
    } catch {
      // a torn line is skipped, never fatal
    }
  }
  return out;
}

function args(argv) {
  const a = { other: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--other") a.other.push(argv[++i]);
    else if (k.startsWith("--")) a[k.slice(2)] = argv[++i];
  }
  for (const k of ["starter", "projects", "feature"]) if (typeof a[k] !== "string") throw new Error(`--${k} is required`);
  return a;
}

const textOf = (c) => (Array.isArray(c.content) ? c.content.map((x) => x.text || "").join("\n") : String(c.content || ""));

/** Parse one transcript into requests, tool uses and results, attachments — within [from, to]. */
function parseTranscript(entries, from, to) {
  const reqs = new Map();
  const order = [];
  const uses = new Map();
  const attachments = [];
  let lastInput = null;
  for (const e of entries) {
    const ts = e.timestamp || "";
    if (e.type === "attachment" && e.attachment) attachments.push({ ts, ...e.attachment });
    const m = e.message;
    if (e.type === "user" && m) {
      if (Array.isArray(m.content)) {
        for (const c of m.content) {
          if (c.type === "tool_result" && uses.has(c.tool_use_id)) {
            const u = uses.get(c.tool_use_id);
            u.resultTs = ts;
            u.result = textOf(c);
            u.isError = !!c.is_error;
          }
        }
      }
      lastInput = ts;
    }
    if (e.type === "assistant" && e.requestId && m) {
      if (!reqs.has(e.requestId)) {
        reqs.set(e.requestId, { id: e.requestId, input: lastInput, first: ts, last: ts, tools: [], model: m.model });
        order.push(e.requestId);
      }
      const r = reqs.get(e.requestId);
      r.last = ts;
      if (Array.isArray(m.content)) {
        for (const c of m.content) {
          if (c.type === "tool_use") {
            const u = { id: c.id, name: c.name, input: c.input || {}, ts, req: e.requestId };
            uses.set(c.id, u);
            r.tools.push(u);
          }
        }
      }
    }
  }
  const inWin = (ts) => ts >= from && ts <= to;
  const requests = order.map((id) => reqs.get(id)).filter((r) => inWin(r.first));
  return {
    requests,
    uses: [...uses.values()].filter((u) => inWin(u.ts)),
    attachments: attachments.filter((a) => inWin(a.ts)),
    allAttachments: attachments,
  };
}

function timing(parsed) {
  const model = [];
  const after = {};
  const rq = parsed.requests;
  for (let i = 0; i < rq.length; i++) {
    const r = rq[i];
    if (r.input) model.push(sec(r.input, r.last));
    const next = rq[i + 1];
    if (next && next.input) {
      const key = r.tools.length ? [...new Set(r.tools.map((t) => t.name))].sort().join("+") : "(no tool)";
      after[key] = (after[key] || 0) + sec(r.last, next.input);
    }
  }
  // A request that calls N tools writes N tool_use lines as each block finishes STREAMING; the tools run after the
  // request ends. So "tool_use line → tool_result" for its first tool measures the model writing the rest, never the
  // tool (the correction to batch finding 5). Every request with ≥ 3 tools is listed so that is visible.
  const multi = rq.filter((r) => r.tools.length > 1);
  const describe = (r) => {
    const results = r.tools
      .map((t) => t.resultTs)
      .filter(Boolean)
      .sort();
    return {
      request: `…${r.id.slice(-6)}`,
      tools: r.tools.length,
      names: [...new Set(r.tools.map((t) => t.name))],
      input: r.input,
      first_line: r.first,
      last_line: r.last,
      first_result: results[0] || null,
      last_result: results[results.length - 1] || null,
    };
  };
  const parallel = multi.length
    ? { requests_with_parallel_tools: multi.length, three_or_more: multi.filter((r) => r.tools.length >= 3).map(describe) }
    : null;
  return {
    requests: rq.length,
    model_s: stats(model),
    after_request_s: Object.fromEntries(Object.entries(after).map(([k, v]) => [k, round(v)])),
    parallel,
  };
}

/** Bash command → { kinds, targets } for a write; null when it writes no project file. */
const PATH = String.raw`[A-Za-z0-9_.\-/\[\]{}()]+\.(?:json|tsx|ts|mjs|cjs|js|md|sql|css)`;
function shellWrite(cmd, root) {
  const kinds = [];
  if (/open\([^)]*,\s*['"]w['"]\)/.test(cmd)) kinds.push("python3-open-w");
  if (/\bsed -i\b/.test(cmd)) kinds.push("sed-i");
  if (/\bcat > (?!\/tmp|\/private\/tmp)/.test(cmd)) kinds.push("cat-heredoc");
  if (/prettier --write/.test(cmd)) kinds.push("prettier-write");
  if (!kinds.length) return null;
  const cd = cmd.match(/^\s*cd ([^&;\s]+)\s*&&/);
  const cwd = cd ? cd[1] : root;
  const t = new Set();
  const add = (p) => {
    if (!p || /^\/(private\/)?tmp\//.test(p)) return;
    for (const v of p.includes("{loc}") ? ["en", "pl"].map((l) => p.replace("{loc}", l)) : [p]) t.add(relative(root, resolve(cwd, v)));
  };
  for (const m of cmd.matchAll(new RegExp(String.raw`\bp\s*=\s*f?['"](${PATH})['"]`, "g"))) add(m[1]);
  for (const m of cmd.matchAll(new RegExp(String.raw`\b(?:rep|edit)\(\s*f?['"](${PATH})['"]`, "g"))) add(m[1]);
  for (const m of cmd.matchAll(new RegExp(String.raw`cat > (${PATH})`, "g"))) add(m[1]);
  for (const m of cmd.matchAll(new RegExp(String.raw`sed -i(?: '')? (?:"[^"]*"|'[^']*') ((?:${PATH}\s*)+)`, "g")))
    for (const p of m[1].trim().split(/\s+/)) add(p);
  for (const m of cmd.matchAll(/prettier --write ((?:[^\s;&|>]+\s*)+)/g))
    for (const p of m[1].trim().split(/\s+/)) if (!p.startsWith("-") && p !== "2") add(p);
  for (const m of cmd.matchAll(/files\s*=\s*\[([^\]]*)\]/g))
    for (const q of m[1].matchAll(new RegExp(String.raw`['"](${PATH})['"]`, "g"))) add(q[1]);
  for (const m of cmd.matchAll(/files\s*=\s*"""([\s\S]*?)"""/g)) for (const p of m[1].split(/\s+/).filter(Boolean)) add(p);
  return { kinds, targets: [...t] };
}

function writesOf(parsed, root, lockPinned) {
  const tools = {};
  for (const u of parsed.uses) tools[u.name] = (tools[u.name] || 0) + 1;
  // The scope each write was judged under = the latest setter call before it: `--from-plan` (its list, as the agent
  // printed it with `cat .pharn/writes-scope.json`), `--target <path>` (that one path), `--clear` (none).
  const setters = [];
  for (const u of parsed.uses) {
    const cmd = String(u.input.command || "");
    if (u.name !== "Bash" || !cmd.includes("set-writes-scope.cjs")) continue;
    if (cmd.includes("--from-plan") && typeof u.result === "string" && u.result.includes('"scope"')) {
      try {
        setters.push({ ts: u.ts, scope: JSON.parse(u.result.slice(u.result.indexOf("{"))).scope, via: "--from-plan" });
      } catch {
        setters.push({ ts: u.ts, scope: null, via: "--from-plan (unparsed)" });
      }
    } else if (/--target (\S+)/.test(cmd)) setters.push({ ts: u.ts, scope: [cmd.match(/--target (\S+)/)[1]], via: "--target" });
    if (/--clear\b/.test(cmd)) setters.push({ ts: u.ts, scope: null, via: "--clear" });
  }
  const scopeAt = (ts) => [...setters].filter((s) => s.ts <= ts).pop() || null;
  const planScope = setters.find((s) => s.via === "--from-plan");
  const scope = planScope ? planScope.scope : null;
  const isDirOrGlob = (p) => /[*?[]/.test(p) || (existsSync(join(root, p)) && statSync(join(root, p)).isDirectory());
  const calls = [];
  const byKind = {};
  const byTarget = new Map();
  for (const u of parsed.uses) {
    let w = null;
    if (u.name === "Bash") w = shellWrite(String(u.input.command || ""), root);
    else if (["Write", "Edit", "MultiEdit"].includes(u.name))
      w = { kinds: [u.name], targets: [relative(root, String(u.input.file_path || ""))] };
    if (!w) continue;
    const key = w.kinds.join("+");
    byKind[key] = (byKind[key] || 0) + 1;
    if (u.name === "Bash")
      calls.push({ ts: u.ts, kinds: w.kinds, targets: w.targets, command: redact(String(u.input.command).slice(0, 100)) });
    for (const p of w.targets) {
      if (!byTarget.has(p)) byTarget.set(p, { via: new Set(), classes: new Set() });
      const t = byTarget.get(p);
      t.via.add(u.name === "Bash" ? w.kinds.join("+") : u.name);
      const s = scopeAt(u.ts);
      t.classes.add(
        p.startsWith("..") || p.startsWith("/")
          ? "outside-project"
          : isDirOrGlob(p)
            ? "directory-or-glob-arg"
            : !s || s.scope === null
              ? "no-scope-active"
              : s.scope.includes(p)
                ? "in-scope"
                : lockPinned.has(p)
                  ? "PINNED-AC-TEST"
                  : "out-of-scope"
      );
    }
  }
  const targets = [...byTarget.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([p, v]) => ({ path: redact(p), via: [...v.via], class: [...v.classes].sort().join("+") }));
  const shellTargets = targets.filter((t) => t.via.some((v) => !["Write", "Edit", "MultiEdit"].includes(v)));
  const count = (cls) => shellTargets.filter((t) => t.class === cls).length;
  const auto = parsed.allAttachments.find((a) => a.type === "auto_mode");
  const firstWriteTool = parsed.uses.find((u) => ["Write", "Edit", "MultiEdit"].includes(u.name));
  const firstShell = calls.find((c) => c.targets.some((p) => !(p.startsWith("..") || p.startsWith("/"))));
  return {
    tools,
    write_calls_by_mechanism: byKind,
    shell_write_calls: calls.length,
    scope_entries: scope === null ? "absent" : scope.length,
    scope_setters: setters.map((s) => ({ ts: s.ts, via: s.via, entries: s.scope === null ? null : s.scope.length })),
    shell_targets: Object.fromEntries([
      ["total", shellTargets.length],
      ...[...new Set(shellTargets.map((t) => t.class))].sort().map((c) => [c, count(c)]),
    ]),
    first_write_tool: firstWriteTool ? firstWriteTool.ts : null,
    first_project_shell_write: firstShell ? firstShell.ts : null,
    auto_mode: auto ? { ts: auto.ts, bashFirst: auto.bashFirst, bashFirstSteer: auto.bashFirstSteer, steerOnly: auto.steerOnly } : "absent",
    targets: targets.filter((t) => t.class !== "in-scope" || t.via.some((v) => ["Write", "Edit", "MultiEdit"].includes(v))),
    calls_without_literal_target: calls.filter((c) => c.targets.length === 0),
  };
}

function hooksOf(parsed) {
  const out = {};
  for (const a of parsed.attachments) {
    if (typeof a.hookEvent !== "string" || typeof a.durationMs !== "number") continue;
    const k = `${a.hookName || a.hookEvent} :: ${redact(a.command || "")} :: exit ${a.exitCode}`;
    out[k] = out[k] || [];
    out[k].push(a.durationMs);
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [
      k,
      { n: v.length, min_ms: Math.min(...v), max_ms: Math.max(...v), sum_ms: v.reduce((a, b) => a + b, 0) },
    ])
  );
}

function instructionsOf(parsed, root) {
  const a = parsed.allAttachments.find((x) => x.type === "instructions" && Array.isArray(x.files));
  if (!a) return "absent";
  const files = a.files.map((f) => ({
    path: redact(relative(root, f.path).startsWith("..") ? f.path : relative(root, f.path)),
    type: f.type,
    bytes: Buffer.byteLength(String(f.content || "")),
  }));
  return { ts: a.ts, files: files.length, bytes: files.reduce((s, f) => s + f.bytes, 0), list: files };
}

function frontmatterKeys(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m
    ? m[1]
        .split("\n")
        .map((l) => l.match(/^([A-Za-z_]+):/))
        .filter(Boolean)
        .map((x) => x[1])
    : [];
}

function ledger(starter, name) {
  const dir = join(starter, "pharn", "features", name);
  const j = readJson(join(dir, "cost.json"));
  if (!j) return null;
  return { dir, j };
}

function loopRecord(dir) {
  const p = join(dir, "LOOP.md");
  if (!existsSync(p)) return "absent";
  const fm = readFileSync(p, "utf8").match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return "no-frontmatter";
  return Object.fromEntries(
    fm[1]
      .split("\n")
      .map((l) => l.match(/^([a-z_]+):\s*(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]])
  );
}

function stagesOf(j) {
  const ms = [...j.markers].sort((a, b) => a.seq - b.seq);
  const rows = [];
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    const next = ms[i + 1];
    if (m.kind === "stage-start")
      rows.push({
        seq: m.seq,
        stage: m.stage,
        iteration: m.iteration ?? null,
        route: m.route ?? null,
        start: m.ts,
        end_kind: next ? next.kind : null,
        elapsed_s: next ? round(sec(m.ts, next.ts)) : null,
      });
    else if ((m.kind === "orchestrator" || m.kind === "run-start") && next)
      rows.push({
        seq: m.seq,
        stage: `(orchestrator after ${m.kind} #${m.seq})`,
        start: m.ts,
        end_kind: next.kind,
        elapsed_s: round(sec(m.ts, next.ts)),
      });
  }
  return rows;
}

function contextsOf(j) {
  const by = new Map();
  for (const r of [...j.requests].sort((a, b) => a.ts.localeCompare(b.ts))) {
    const k = r.agent_id ? `agent:${r.agent_id}` : "main";
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(r);
  }
  const ctx = (t) => (t.input || 0) + (t.cache_write_5m || 0) + (t.cache_write_1h || 0) + (t.cache_read || 0);
  const out = {};
  for (const [k, rs] of by) {
    const gaps = [];
    for (let i = 1; i < rs.length; i++) gaps.push(sec(rs[i - 1].ts, rs[i].ts));
    const models = {};
    const stagesN = {};
    for (const r of rs) {
      models[r.model] = (models[r.model] || 0) + 1;
      const s = r.stage || "(unattributed)";
      stagesN[s] = (stagesN[s] || 0) + 1;
    }
    const f = rs[0].tokens;
    out[k] = {
      requests: rs.length,
      models,
      stages: stagesN,
      first: rs[0].ts,
      last: rs[rs.length - 1].ts,
      span_s: round(sec(rs[0].ts, rs[rs.length - 1].ts)),
      gap_between_requests_s: stats(gaps),
      first_request: {
        input: f.input,
        cache_write: (f.cache_write_5m || 0) + (f.cache_write_1h || 0),
        cache_read: f.cache_read,
        prefix_total: ctx(f),
      },
      max_context: Math.max(...rs.map((r) => ctx(r.tokens))),
      output: rs.reduce((s, r) => s + (r.tokens.output || 0), 0),
      output_thinking: rs.reduce((s, r) => s + (r.tokens.output_thinking || 0), 0),
    };
  }
  return out;
}

function gatesOf(starter, feature) {
  const out = {};
  const vdir = join(starter, ".pharn", "pharn-verify", "gates");
  const state = readJson(join(vdir, "state.json"));
  if (!state) out.verify = "absent";
  else {
    const files = readdirSync(vdir).map((f) => ({ f, mtime: statSync(join(vdir, f)).mtime.toISOString() }));
    const g = {
      feature: state.feature,
      head: state.head,
      belongs_to_this_run: state.feature === feature,
      required: state.required,
      ran: state.runs.map((r) => ({ id: r.id, exit: r.exit, ran: r.ran })),
      aux: state.aux,
      files,
    };
    if (state.feature === feature) {
      const t0 =
        files
          .filter((x) => x.f.startsWith("completeness"))
          .map((x) => x.mtime)
          .sort()
          .pop() || null;
      let prev = t0;
      g.estimated_gate_s = state.runs.map((r) => {
        const end =
          files
            .filter((x) => x.f.startsWith(`${r.seq}-`))
            .map((x) => x.mtime)
            .sort()
            .pop() || null;
        const d = prev && end ? round(sec(prev, end)) : null;
        prev = end;
        return { id: r.id, from: "previous file mtime", to: end, seconds: d };
      });
    }
    out.verify = g;
  }
  for (const side of ["head", "base-gates"]) {
    const d = join(starter, ".pharn", "pharn-regress", side);
    const s = readJson(join(d, "stamp.json"));
    out[`regress_${side}`] = s
      ? {
          feature: s.feature,
          head: s.head,
          belongs_to_this_run: s.feature === feature,
          stamp_mtime: statSync(join(d, "stamp.json")).mtime.toISOString(),
        }
      : "absent";
  }
  return out;
}

function projectOf(starter) {
  const out = {};
  const cm = join(starter, "CLAUDE.md");
  out.claude_md_bytes_now = existsSync(cm) ? statSync(cm).size : "absent";
  const rd = join(starter, ".claude", "rules");
  if (existsSync(rd)) {
    const rules = readdirSync(rd).filter((f) => f.endsWith(".md"));
    const keys = {};
    let bytes = 0;
    for (const f of rules) {
      const t = readFileSync(join(rd, f), "utf8");
      bytes += Buffer.byteLength(t);
      for (const k of frontmatterKeys(t)) keys[k] = (keys[k] || 0) + 1;
    }
    out.rules_now = { files: rules.length, bytes, frontmatter_keys: keys };
  } else out.rules_now = "absent";
  const settings = readJson(join(starter, ".claude", "settings.json"));
  const pkg = readJson(join(starter, "package.json"));
  const post = settings && settings.hooks && settings.hooks.PostToolUse;
  out.post_tool_use = Array.isArray(post)
    ? post.flatMap((h) =>
        (h.hooks || []).map((x) => {
          const m = String(x.command || "").match(/^npm run (\S+)/);
          return {
            matcher: h.matcher,
            command: redact(x.command),
            npm_script_exists: m ? !!(pkg && pkg.scripts && Object.hasOwn(pkg.scripts, m[1])) : null,
          };
        })
      )
    : "absent";
  return out;
}

function main() {
  const a = args(process.argv.slice(2));
  const L = ledger(a.starter, a.feature);
  if (!L) throw new Error(`no readable cost.json for ${a.feature}`);
  const { j, dir } = L;
  const from = j.window_start < j.membership.start ? j.window_start : j.membership.start;
  const to = j.membership.end > j.window_end ? j.membership.end : j.window_end;
  const sessionFile = join(a.projects, `${j.membership.session}.jsonl`);
  const lock = readJson(join(dir, "AC-TESTS.lock.json"));
  const pinned = new Set(lock && Array.isArray(lock.files) ? lock.files.map((f) => f.path) : []);
  const out = {
    read_at: new Date().toISOString(),
    run: {
      feature: a.feature,
      session: j.membership.session,
      window: [j.membership.start, j.membership.end],
      minutes: round(sec(j.membership.start, j.membership.end) / 60, 2),
      skills_version: j.skills_version,
      claude_code_versions: j.claude_code_versions,
      requests: j.requests.length,
      excluded_requests: j.membership.excluded_requests,
      contexts: j.membership.contexts,
      outcome: j.outcome,
    },
    stages: stagesOf(j),
    executions: j.executions,
    work: j.work,
    contexts: contextsOf(j),
  };
  const transcripts = { main: readLines(sessionFile) };
  const meta = {};
  for (const c of j.membership.contexts.filter((x) => x.startsWith("agent:"))) {
    const id = c.slice(6);
    const base = join(a.projects, j.membership.session, "subagents", `agent-${id}`);
    transcripts[c] = readLines(`${base}.jsonl`);
    meta[c] = readJson(`${base}.meta.json`);
  }
  const parsed = Object.fromEntries(Object.entries(transcripts).map(([k, v]) => [k, v ? parseTranscript(v, from, to) : null]));
  out.timing = Object.fromEntries(
    Object.entries(parsed).map(([k, p]) => [
      k,
      p
        ? { description: meta[k] ? meta[k].description : "orchestrator", requested_model: meta[k] ? meta[k].model : null, ...timing(p) }
        : "absent",
    ])
  );
  const main = parsed.main;
  if (main) {
    const asks = main.uses
      .filter((u) => u.name === "AskUserQuestion" && u.resultTs)
      .map((u) => ({ ts: u.ts, seconds: round(sec(u.ts, u.resultTs)) }));
    out.human_waits = asks;
    out.scripts = main.uses
      .filter((u) => u.name === "Bash" && /\bnode pharn\/floor\/stage-(regress|verify)\.mjs\b/.test(String(u.input.command || "")))
      .map((u) => {
        let body;
        try {
          body = JSON.parse(String(u.result || "").slice(String(u.result || "").indexOf("{"), String(u.result || "").lastIndexOf("}") + 1));
        } catch {
          body = null;
        }
        return {
          ts: u.ts,
          seconds: u.resultTs ? round(sec(u.ts, u.resultTs)) : null,
          script: String(u.input.command).match(/stage-(regress|verify)\.mjs/)[0],
          resume: /--resume/.test(u.input.command),
          status: body && body.status,
          phase: body && (body.phase || null),
          verdict: body && (body.verdict || null),
          reason_code: body && (body.reason_code || null),
        };
      });
    // Buckets: the run window partitioned by the stage rows; human waits subtracted from the row they fall in.
    const win = sec(j.membership.start, j.membership.end);
    const b = { human_wait_s: 0, routed_stage_agents_s: 0, regress_s: 0, verify_s: 0, inline_other_stages_s: 0, orchestrator_between_s: 0 };
    const ms = [...j.markers].sort((x, y) => x.seq - y.seq);
    for (let i = 0; i < ms.length - 1; i++) {
      const m = ms[i];
      const d = sec(m.ts, ms[i + 1].ts);
      const wait = asks.filter((w) => w.ts >= m.ts && w.ts < ms[i + 1].ts).reduce((s, w) => s + w.seconds, 0);
      b.human_wait_s += wait;
      if (m.kind !== "stage-start") b.orchestrator_between_s += d - wait;
      else if (m.stage === "pharn-regress") b.regress_s += d - wait;
      else if (m.stage === "pharn-verify") b.verify_s += d - wait;
      else if (String(m.route || "").startsWith("agent:")) b.routed_stage_agents_s += d - wait;
      else b.inline_other_stages_s += d - wait;
    }
    out.buckets = { window_s: round(win), ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, round(v)])) };
  } else out.human_waits = out.scripts = out.buckets = "absent";
  out.long_bash = {};
  out.writes = {};
  out.hooks = {};
  out.instructions = {};
  for (const [k, p] of Object.entries(parsed)) {
    if (!p) {
      out.writes[k] = out.hooks[k] = out.instructions[k] = "absent";
      continue;
    }
    out.hooks[k] = hooksOf(p);
    // The session's first instructions attachment (for main, at session start — before the run window).
    out.instructions[k] = instructionsOf(p, a.starter);
    if (k === "main") continue;
    out.long_bash[k] = p.uses
      .filter((u) => u.name === "Bash" && u.resultTs && sec(u.ts, u.resultTs) > 60)
      .map((u) => ({
        ts: u.ts,
        seconds: round(sec(u.ts, u.resultTs)),
        command: redact(String(u.input.command).replace(/\s+/g, " ").slice(0, 100)),
      }));
    out.writes[k] = writesOf(p, a.starter, pinned);
  }
  out.gates = gatesOf(a.starter, a.feature);
  out.project = projectOf(a.starter);
  out.others = {};
  for (const name of a.other) {
    const o = ledger(a.starter, name);
    if (!o) {
      out.others[name] = "absent";
      continue;
    }
    const oj = o.j;
    out.others[name] = {
      window: [oj.membership.start, oj.membership.end],
      minutes: round(sec(oj.membership.start, oj.membership.end) / 60, 2),
      skills_version: oj.skills_version,
      requests: oj.requests.length,
      stages: stagesOf(oj),
      contexts: contextsOf(oj),
      work: oj.work,
      loop: loopRecord(o.dir),
      transcript: existsSync(join(a.projects, `${oj.membership.session}.jsonl`)) ? "present" : "absent",
      subagent_transcripts: existsSync(join(a.projects, oj.membership.session, "subagents")) ? "present" : "absent",
    };
  }
  out.run.loop = loopRecord(dir);
  process.stdout.write(`${JSON.stringify(out, (key, v) => (typeof v === "string" ? redact(v) : v), 2)}\n`);
}

main();
