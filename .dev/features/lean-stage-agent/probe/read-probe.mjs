// read-probe.mjs — reads the CORE-107 probe session's three subagent transcripts and prints the AC2 fraction and the
// AC3 live observation. Read-only: it writes nothing. Committed at .dev/features/lean-stage-agent/probe/ beside the
// prompt it pairs with; the measurement it produced on 2026-11-16 is .dev/features/lean-stage-agent/MEASUREMENTS.md.
// No test pins it: an edit here, or to audit.mjs --prefix, is caught only by re-running it.
//
//   node read-probe.mjs <probe-tree> [--session-dir <dir>]
//
// <probe-tree> is the scratch worktree the probe ran in. Without --session-dir it picks the newest session directory
// under ~/.claude/projects/<probe-tree with every non-alphanumeric character turned into '-'> that has a subagents/
// directory. First-request usage comes from the repo's own reader, .dev/features/pipeline-performance-audit/audit.mjs
// --prefix (run from the probe tree), so the figure is the one the review-lens probe used: input + cache_write +
// cache_read of each transcript's first request. Its output names absolute paths (the session directory, the
// instruction files, the write target): generalize them before quoting it in a committed record.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const tree = args[0];
if (!tree) {
  console.error("usage: node read-probe.mjs <probe-tree> [--session-dir <dir>]");
  process.exit(2);
}
const sdIdx = args.indexOf("--session-dir");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const fail = (m) => {
  console.error(`read-probe: ${m}`);
  process.exit(2);
};

// ── the session ─────────────────────────────────────────────────────────────────────────────────────────────────────
let sessionDir = sdIdx >= 0 ? args[sdIdx + 1] : null;
if (!sessionDir) {
  const candidates = [...new Set([tree, realpathSync(tree)])].map((p) =>
    join(homedir(), ".claude", "projects", p.replace(/[^A-Za-z0-9]/g, "-"))
  );
  const dirs = [];
  for (const proj of candidates) {
    if (!existsSync(proj)) continue;
    for (const e of readdirSync(proj)) {
      const d = join(proj, e);
      if (existsSync(join(d, "subagents"))) dirs.push({ d, t: statSync(join(d, "subagents")).mtimeMs });
    }
  }
  if (dirs.length === 0) fail(`no session with a subagents/ directory under ${candidates.join(" or ")}`);
  dirs.sort((a, b) => b.t - a.t);
  sessionDir = dirs[0].d;
}
const sub = join(sessionDir, "subagents");
console.log(`session: ${sessionDir}`);

const metas = readdirSync(sub)
  .filter((f) => f.endsWith(".meta.json"))
  .map((f) => ({ f, meta: JSON.parse(readFileSync(join(sub, f), "utf8")) }));
const pick = (description) => {
  const m = metas.filter((x) => x.meta.description === description);
  if (m.length !== 1) fail(`${m.length} subagents described ${JSON.stringify(description)} (want exactly 1)`);
  return { ...m[0], jsonl: join(sub, m[0].f.replace(/\.meta\.json$/, ".jsonl")) };
};
const A = pick("probe pharn-stage");
const B = pick("probe general-purpose");
const C = pick("probe pharn-stage write");
for (const [x, want] of [
  [A, "pharn-stage"],
  [B, "general-purpose"],
  [C, "pharn-stage"],
]) {
  if (x.meta.agentType !== want)
    fail(`${x.f}: agentType ${JSON.stringify(x.meta.agentType)}, want ${want} (the type was not offered, or a fallback ran)`);
}

// ── first-request usage, by the repo's reader ───────────────────────────────────────────────────────────────────────
const audit = spawnSync(process.execPath, [".dev/features/pipeline-performance-audit/audit.mjs", "--prefix", A.jsonl, B.jsonl, C.jsonl], {
  cwd: tree,
  encoding: "utf8",
});
if (audit.status !== 0) fail(`audit.mjs --prefix exited ${audit.status}: ${audit.stderr}`);
const doc = JSON.parse(audit.stdout);
const rowOf = (x) => doc.rows.find((r) => r.file === x.jsonl.split("/").pop()) ?? fail(`no audit row for ${x.f}`);
const total = (r) => r.input + r.cache_write + r.cache_read;
const [ra, rb, rc] = [A, B, C].map(rowOf);

// ── what each first request carried ─────────────────────────────────────────────────────────────────────────────────
function carried(x) {
  const recs = readFileSync(x.jsonl, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const instr = recs.find((r) => r.attachment?.type === "instructions");
  const files = (instr?.attachment.files ?? []).map((f) => ({ path: f.path, type: f.type, sha256: sha(f.content ?? "") }));
  const shape = recs.find((r) => r.type === "api-request-shape");
  const tools = (shape?.shape?.tools ?? []).map((t) => t.name);
  const toolBytes = Buffer.byteLength(JSON.stringify(shape?.shape?.tools ?? []));
  const systemBytes = Buffer.byteLength(JSON.stringify(shape?.shape?.system ?? []));
  return { recs, files, tools, toolBytes, systemBytes, hasShape: Boolean(shape) };
}
const [ca, cb, cc] = [A, B, C].map(carried);

console.log(
  "\n| step | agent type | transcript | model | input | cache_write | cache_read | first request, all classes | tools | tool schemas | system |"
);
console.log("| --- | --- | --- | --- | --: | --: | --: | --: | --: | --: | --: |");
for (const [n, x, r, c] of [
  [1, A, ra, ca],
  [2, B, rb, cb],
  [3, C, rc, cc],
]) {
  console.log(
    `| ${n} | \`${x.meta.agentType}\` | \`${x.f.replace(/\.meta\.json$/, "")}\` | \`${r.model}\` | ${r.input} | ${r.cache_write} | ${r.cache_read} | ${total(r)} | ${c.tools.length} | ${c.toolBytes} B | ${c.systemBytes} B |`
  );
}
console.log(`\npharn-stage tools (step 1): ${ca.tools.join(", ") || "(no api-request-shape row)"}`);
console.log(`general-purpose tools (step 2): ${cb.tools.length} — ${cb.tools.join(", ") || "(no api-request-shape row)"}`);

// ── AC2: the fraction, and the same instruction files ───────────────────────────────────────────────────────────────
const sameInstr = JSON.stringify(ca.files) === JSON.stringify(cb.files);
console.log(
  `\ninstruction files, step 1: ${ca.files.map((f) => `${f.path} (${f.type}, ${f.sha256.slice(0, 12)})`).join("; ") || "(none)"}`
);
console.log(`instruction files, step 2: ${cb.files.map((f) => `${f.path} (${f.type}, ${f.sha256.slice(0, 12)})`).join("; ") || "(none)"}`);
console.log(`same instruction files in both: ${sameInstr ? "yes" : "NO"}`);
if (ra.cache_read > 0 || rb.cache_read > 0)
  console.log("NOTE: step 1 or 2 read cache; the totals still sum every class, as the review-lens probe did.");
if (ra.model !== rb.model)
  console.log(`NOTE: the two ran on different models (${ra.model} vs ${rb.model}); the fraction compares more than the type.`);
const fraction = total(ra) / total(rb);
console.log(`AC2 fraction: pharn-stage / general-purpose = ${total(ra)} / ${total(rb)} = ${(fraction * 100).toFixed(1)}%`);

// ── AC3 live: the write probe ───────────────────────────────────────────────────────────────────────────────────────
const writes = [];
const results = new Map();
for (const r of cc.recs) {
  for (const c of Array.isArray(r.message?.content) ? r.message.content : []) {
    if (c.type === "tool_use") writes.push({ id: c.id, name: c.name, input: c.input });
    if (c.type === "tool_result") results.set(c.tool_use_id, c);
  }
}
const uniq = [...new Map(writes.map((w) => [w.id, w])).values()];
console.log(
  `\nstep 3 tool calls (deduplicated by id): ${uniq.map((w) => `${w.name} ${JSON.stringify(w.input?.file_path ?? w.input?.command ?? "")}`).join("; ") || "none"}`
);
for (const w of uniq) {
  const res = results.get(w.id);
  const text = typeof res?.content === "string" ? res.content : JSON.stringify(res?.content ?? "");
  console.log(
    `  ${w.name} → is_error ${res?.is_error === true}; guard named: ${/writes-scope guard/.test(text)}; first line: ${JSON.stringify(text.split("\n")[0].slice(0, 200))}`
  );
}
const target = join(tree, "pharn/floor/stage-agent-probe/probe.json");
console.log(`target exists afterwards: ${existsSync(target)} (${target})`);
const denied = uniq.some(
  (w) => w.name === "Write" && results.get(w.id)?.is_error === true && /writes-scope guard/.test(JSON.stringify(results.get(w.id).content))
);
console.log(
  `AC3 live: ${denied && !existsSync(target) ? "the Write was denied by the writes-scope guard and nothing was written" : "NOT shown — read the lines above"}`
);

// ── AC1: the probed bytes are the pinned bytes ──────────────────────────────────────────────────────────────────────
const def = readFileSync(join(tree, ".claude/agents/pharn-stage.md"));
const pinned = readFileSync(join(tree, ".dev/floor/stage-agent-type.test.mjs"), "utf8").match(
  /const PINNED_SHA256 = "([0-9a-f]{64})"/
)?.[1];
console.log(`\nprobed .claude/agents/pharn-stage.md sha256: ${sha(def)}`);
console.log(`PINNED_SHA256 in stage-agent-type.test.mjs: ${pinned ?? "(not found)"}`);
console.log(`AC1 (probed file == pinned): ${pinned === sha(def) ? "yes" : "NO"}`);
