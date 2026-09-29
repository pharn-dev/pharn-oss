#!/usr/bin/env node
// audit.mjs — the READ-ONLY analysis helper of the pipeline-performance-audit (apparatus; never shipped, never
// imported by PHARN). It prints one JSON document on stdout and writes nothing in the repository: no file, no .pharn/
// state, no git write. ONE bounded exception, stated (REVIEW F8): `--static --project` runs `stage-agent.mjs route`,
// which removes a leftover `.pharn/<command>/<name>/stage-result.json` under ITS cwd on an `agent:` route, so the
// helper runs that probe with its cwd in an empty temp directory it creates and removes. The figures of
// `.dev/measurements/pipeline-performance-audit-2026-09-29.md` come from these modes, except those the report quotes
// from the two MEASUREMENT.md files and pharn-starter's install record.
//
//   node .dev/features/pipeline-performance-audit/audit.mjs --self-test
//   node .dev/features/pipeline-performance-audit/audit.mjs --ledgers <cost.json…> [--fixture <cost.json…>]
//   node .dev/features/pipeline-performance-audit/audit.mjs --static [--project <dir>]
//   node .dev/features/pipeline-performance-audit/audit.mjs --prefix <transcript.jsonl…> [--since <iso>] [--until <iso>]
//
// --ledgers applies the run-selection rule PLAN.md froze at GATE 1 (verbatim; the rule's own gaps are stated in the
// report, never repaired here). Versions compare NUMERICALLY (a string compare orders "6.7.0" after "6.35.0" — GRILL
// T1). `skills_version` is the configured version, which the cost-ledger contract labels advisory (GRILL G1), so the
// structural evidence (schema, membership method, the 6.35.0 keys) is printed beside it. Whether a ledger comes from a
// fixture is the CALLER's declaration (`--fixture`): nothing in a cost.json records it. The checker is shelled with an
// argv array and no shell (GRILL S1), and its exit is read through shelledVerdict, so a crash is never a RED (GRILL E1).
// Rule 3's per-metric exclusions of an ELIGIBLE ledger are listed per metric with why (REVIEW F10). Per-stage figures
// are READ from the views cost.json stores — never re-derived (GRILL G10). The orchestrator's own requests are the rows
// whose CONTEXT is the run's own, `membership.context` — never "the main thread", because a run started inside an
// agent has an `agent:<id>` orchestrator (cost-ledger.md "The context half"; REVIEW F6).
// --static measures bytes in THIS checkout (the commit is printed) and, with --project, that project's CLAUDE.md and
// the route its models block would get. --prefix reads each transcript's FIRST request usage per token class, grouped
// by the agent type its sibling `.meta.json` records: a harness observation, never a PHARN run (REVIEW F3, F4).
// Every printed path has the home directory replaced by `~` (GRILL PR1).
import { readFileSync, statSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join, resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { shelledVerdict } from "../../../pharn/floor/shelled-verdict-core.mjs";
import { ROUTE_POLICY } from "../../../pharn/floor/stage-agent-core.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const HOME = homedir();

/** Replace the home directory with `~` in any string. */
export function redact(s) {
  return typeof s === "string" && HOME && s.startsWith(HOME) ? `~${s.slice(HOME.length)}` : s;
}

/** Numeric SemVer compare over MAJOR.MINOR.PATCH; null when either side is not that shape. */
export function cmpVersion(a, b) {
  const re = /^(\d+)\.(\d+)\.(\d+)$/;
  const x = typeof a === "string" && a.match(re);
  const y = typeof b === "string" && b.match(re);
  if (!x || !y) return null;
  for (let i = 1; i <= 3; i++) {
    const d = Number(x[i]) - Number(y[i]);
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

/** A parsed ledger the rule can read: a plain object, never null, an array or a scalar. */
export function isLedgerObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// ---- the frozen rule (PLAN.md, "The run-selection rule") ----
export const COMMANDS = Object.freeze(["/pharn-ship", "/pharn-loop"]);
export const FULL_PROFILE_MIN = "6.35.0";
export const MODEL_USAGE_MIN = "6.32.0";
export const REASONS = Object.freeze([
  "pre-optimization-version",
  "wrong-command",
  "fixture-not-workload",
  "ledger-red",
  "membership-run-window-1",
  "coverage-unavailable",
  "unreadable",
]);

/**
 * Eligibility of one parsed ledger under the frozen rule. `checker` is "green" | "red" | "crashed" | "unusable".
 * Returns {tier, reasons[], metrics{tokens, elapsed, work}, metric_exclusions{tokens[], elapsed[], work[]}}. A version
 * that is not MAJOR.MINOR.PATCH is not ≥ anything, so it reads pre-optimization. `metric_exclusions` names, for an
 * ELIGIBLE ledger only, which of rule 3's conditions failed for each metric; these are the rule's own conditions
 * spelled out, not new reasons (the rule-level `reasons[]` stay the frozen set).
 */
export function classify(ledger, { fixture, checker }) {
  const reasons = [];
  if (!COMMANDS.includes(ledger.command)) reasons.push("wrong-command");
  const v = ledger.skills_version;
  const full = cmpVersion(v, FULL_PROFILE_MIN);
  const usage = cmpVersion(v, MODEL_USAGE_MIN);
  const tier = full !== null && full >= 0 ? "full" : usage !== null && usage >= 0 ? "model-usage" : null;
  if (tier === null) reasons.push("pre-optimization-version");
  if (fixture) reasons.push("fixture-not-workload");
  if (checker === "red") reasons.push("ledger-red");
  const method = ledger.membership?.method ?? null;
  if (method === "run-window/1") reasons.push("membership-run-window-1");
  if (ledger.coverage === "unavailable") reasons.push("coverage-unavailable");
  const eligible = tier !== null && !reasons.includes("wrong-command") && !fixture;
  const ex = { tokens: [], elapsed: [], work: [] };
  if (eligible) {
    if (checker !== "green") ex.tokens.push(`checker-${checker}`);
    if (method !== "run-window/2") ex.tokens.push(`membership-${method ?? "absent"}`);
    if (ledger.coverage === "unavailable") ex.tokens.push("coverage-unavailable");
    if (tier !== "full") {
      ex.elapsed.push("version-below-6.35.0");
      ex.work.push("version-below-6.35.0");
    } else {
      if (!Array.isArray(ledger.executions?.rows)) ex.elapsed.push("no-executions-rows");
      if (!Array.isArray(ledger.work)) ex.work.push("no-work-array");
    }
  }
  return {
    tier: eligible ? tier : null,
    reasons,
    metrics: {
      tokens: eligible && ex.tokens.length === 0,
      elapsed: eligible && ex.elapsed.length === 0,
      work: eligible && ex.work.length === 0,
    },
    metric_exclusions: ex,
  };
}

function runChecker(path) {
  const r = spawnSync(process.execPath, [join(ROOT, "pharn/floor/check-cost-ledger.mjs"), path], {
    encoding: "utf8",
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
  });
  const v = r.status === 2 ? "unusable" : shelledVerdict(r);
  const out = r.stdout ?? "";
  const warns = out.split("\n").filter((l) => l.startsWith("WARN")).length;
  const ctx = out.match(/rows come from (\d+) context/);
  return { verdict: v, exit: r.status, warns, contexts: ctx ? Number(ctx[1]) : null };
}

/**
 * The role of one stored request row in its run: `orchestrator` when the row's CONTEXT (`main`, or
 * `agent:<agent_id>` for a sidechain row — cost-ledger.md "Field shape") is the run's own `membership.context`;
 * `stage-agent` for any other context the run admitted; `unknown-context` when the ledger names no run context.
 */
export function requestRole(row, runContext) {
  if (typeof runContext !== "string") return "unknown-context";
  const ctx = row.sidechain === true ? `agent:${row.agent_id}` : "main";
  return ctx === runContext ? "orchestrator" : "stage-agent";
}

/** Per-stage figures read from the ledger's STORED views and rows (never recomputed as a view). */
export function storedProfile(ledger) {
  const byStage = {};
  for (const row of ledger.by_stage_iteration_model ?? []) {
    const s = (byStage[row.stage ?? "(unattributed)"] ??= { requests: 0, tokens: {} });
    s.requests += row.requests ?? 0;
    for (const [k, n] of Object.entries(row.tokens ?? {})) s.tokens[k] = (s.tokens[k] ?? 0) + n;
  }
  const runContext = ledger.membership?.context ?? null;
  const byStageRole = {};
  for (const r of ledger.requests ?? []) {
    const key = `${r.stage ?? "(unattributed)"} · ${requestRole(r, runContext)}`;
    const s = (byStageRole[key] ??= { requests: 0, tokens: {} });
    s.requests += 1;
    for (const [k, n] of Object.entries(r.tokens ?? {})) s.tokens[k] = (s.tokens[k] ?? 0) + n;
  }
  const routes = (ledger.markers ?? [])
    .filter((m) => m.kind === "stage-start")
    .map((m) => ({ stage: m.stage, iteration: m.iteration ?? null, route: m.route ?? null }));
  return {
    run_context: runContext,
    totals: ledger.totals ?? null,
    unattributed: ledger.unattributed ?? null,
    by_stage: byStage,
    by_stage_role: byStageRole,
    served_models: ledger.by_model ?? null,
    requested_routes: routes,
    executions: ledger.executions ?? null,
    work: ledger.work ?? null,
  };
}

function ledgersMode(paths, fixtures) {
  const rows = [];
  const all = [...paths.map((p) => [p, false]), ...fixtures.map((p) => [p, true])];
  for (const [p, fixture] of all) {
    const name = basename(dirname(p));
    let ledger;
    try {
      ledger = JSON.parse(readFileSync(p, "utf8"));
    } catch {
      ledger = undefined;
    }
    if (!isLedgerObject(ledger)) {
      rows.push({ name, path: redact(p), reasons: ["unreadable"], tier: null });
      continue;
    }
    const checker = runChecker(p);
    const c = classify(ledger, { fixture, checker: checker.verdict });
    rows.push({
      name,
      path: redact(p),
      command: ledger.command ?? null,
      skills_version: ledger.skills_version ?? null,
      schema: ledger.schema ?? null,
      membership_method: ledger.membership?.method ?? null,
      coverage: ledger.coverage ?? null,
      has_executions: Object.hasOwn(ledger, "executions"),
      has_work: Object.hasOwn(ledger, "work"),
      window_start: ledger.window_start ?? null,
      checker,
      tier: c.tier,
      reasons: c.reasons,
      metrics: c.metrics,
      metric_exclusions: c.tier ? c.metric_exclusions : undefined,
      profile: c.tier ? storedProfile(ledger) : undefined,
    });
  }
  const count = (f) => rows.reduce((m, r) => ((m[f(r)] = (m[f(r)] ?? 0) + 1), m), {});
  const byReason = {};
  for (const r of rows) for (const x of r.reasons) byReason[x] = (byReason[x] ?? 0) + 1;
  const byMetricExclusion = {};
  for (const r of rows)
    for (const [m, xs] of Object.entries(r.metric_exclusions ?? {}))
      for (const x of xs) byMetricExclusion[`${m}:${x}`] = (byMetricExclusion[`${m}:${x}`] ?? 0) + 1;
  const sharedWindow = Object.entries(count((r) => r.window_start ?? "(none)")).filter(([, n]) => n > 1);
  return {
    rule: { commands: COMMANDS, full_profile_min: FULL_PROFILE_MIN, model_usage_min: MODEL_USAGE_MIN, reasons: REASONS },
    universe: rows.length,
    included: { full: rows.filter((r) => r.tier === "full").length, model_usage_only: rows.filter((r) => r.tier === "model-usage").length },
    per_metric_denominators: {
      tokens: rows.filter((r) => r.metrics?.tokens).length,
      elapsed: rows.filter((r) => r.metrics?.elapsed).length,
      work: rows.filter((r) => r.metrics?.work).length,
    },
    excluded_by_reason: byReason,
    eligible_excluded_by_metric: byMetricExclusion,
    by_version: count((r) => r.skills_version ?? "(none)"),
    by_schema_and_membership: count((r) => `${r.schema} · ${r.membership_method ?? "no membership"}`),
    by_coverage: count((r) => r.coverage ?? "(none)"),
    with_executions_or_work: rows.filter((r) => r.has_executions || r.has_work).length,
    checker_verdicts: count((r) => r.checker?.verdict ?? "(not run)"),
    checker_rows_from_two_or_more_contexts: rows.filter((r) => (r.checker?.contexts ?? 0) > 1).length,
    shared_window_starts: sharedWindow,
    rows: rows.map((r) => ({ ...r, window_start: undefined })),
  };
}

// ---- --static ----
function bytes(p) {
  return statSync(join(ROOT, p)).size;
}

/** Fenced ```bash blocks per `##`/`###` section of one command file — a count of PINNED shell lines, not of calls. */
export function bashBlocksBySection(text) {
  let sec = "(top)";
  let inFence = false;
  const counts = {};
  for (const l of text.split("\n")) {
    const f = l.match(/^\s*```(\w*)/);
    if (f) {
      if (!inFence && f[1] === "bash") counts[sec] = (counts[sec] ?? 0) + 1;
      inFence = !inFence;
      continue;
    }
    const h = !inFence && l.match(/^#{2,3} (.*)/);
    if (h) sec = h[1].slice(0, 70);
  }
  return counts;
}

/** Bytes of one `## <n>.` section of a markdown file (heading through the line before the next `## `). */
export function sectionBytes(text, number) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`## ${number}. `));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end < 0) end = lines.length;
  return Buffer.byteLength(lines.slice(start, end).join("\n") + "\n");
}

function sumBlocks(text) {
  return Object.values(bashBlocksBySection(text)).reduce((a, b) => a + b, 0);
}

function brief(command, stage, mode, iteration) {
  const argv = [join(ROOT, "pharn/floor/stage-agent.mjs"), "brief", "--command", command, "--stage", stage, "--name", "demo-feature"];
  if (iteration !== null) argv.push("--iteration", String(iteration));
  if (mode === "quick") argv.push("--mode", "quick");
  const r = spawnSync(process.execPath, argv, { cwd: ROOT, encoding: "utf8", shell: false });
  return { exit: r.status, bytes: Buffer.byteLength(r.stdout ?? "") };
}

function staticMode(project) {
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const families = {};
  for (const cmd of ["pharn-loop", "pharn-ship"]) {
    const files = [`${cmd}.md`, `${cmd}-quick.md`, `${cmd}-close.md`];
    families[cmd] = files.map((f) => {
      const p = `.claude/commands/${f}`;
      const blocks = bashBlocksBySection(readFileSync(join(ROOT, p), "utf8"));
      return { file: p, bytes: bytes(p), bash_blocks: Object.values(blocks).reduce((a, b) => a + b, 0), bash_blocks_by_section: blocks };
    });
  }
  const stageCommands = {};
  for (const s of ["pharn-spec", "pharn-plan", "pharn-grill", "pharn-test", "pharn-build", "pharn-regress", "pharn-verify"]) {
    const p = `.claude/commands/${s}.md`;
    const text = readFileSync(join(ROOT, p), "utf8");
    stageCommands[s] = { bytes: bytes(p), bash_blocks: sumBlocks(text), cites_architecture_s6: text.includes("ARCHITECTURE.md §6") };
  }
  const probeDir = project ? mkdtempSync(join(tmpdir(), "audit-route-probe-")) : null;
  const cells = [];
  try {
    for (const [command, modes] of Object.entries(ROUTE_POLICY))
      for (const [mode, row] of Object.entries(modes))
        for (const [stage, cell] of Object.entries(row)) {
          const entry = { command, mode, stage, cell };
          if (cell === "agent") {
            const its = stage === "pharn-build" ? [1, 2] : [null];
            entry.briefs = its.map((it) => ({ iteration: it, ...brief(command, stage, mode, it) }));
            entry.command_bytes = stageCommands[stage].bytes;
            if (project) {
              const ra = [
                join(ROOT, "pharn/floor/stage-agent.mjs"),
                "route",
                "--command",
                command,
                "--stage",
                stage,
                "--name",
                "demo-feature",
              ];
              if (stage === "pharn-build") ra.push("--iteration", "1");
              if (mode === "quick") ra.push("--mode", "quick");
              ra.push("--config", join(project, "pharn.config.json"));
              const rr = spawnSync(process.execPath, ra, { cwd: probeDir, encoding: "utf8", shell: false });
              entry.project_route = { exit: rr.status, token: (rr.stdout ?? "").trim().split("\n").pop() };
            }
          }
          cells.push(entry);
        }
  } finally {
    if (probeDir) rmSync(probeDir, { recursive: true, force: true });
  }
  const trusted = Object.fromEntries(
    ["pharn/CONSTITUTION.md", "pharn/ARCHITECTURE.md", "THREAT-MODEL.md", "LIMITS.md"].map((p) => [p, bytes(p)])
  );
  const out = {
    commit,
    note: "bytes are measured in this checkout; any token figure derived from them is an ESTIMATE with no token class",
    orchestrator_families: families,
    stage_commands: stageCommands,
    route_cells: cells,
    trusted_docs: trusted,
    architecture_section_6_bytes: sectionBytes(readFileSync(join(ROOT, "pharn/ARCHITECTURE.md"), "utf8"), 6),
    this_repo_claude_md_bytes: bytes("CLAUDE.md"),
  };
  if (project) {
    const cm = join(project, "CLAUDE.md");
    let sv = null;
    try {
      sv = JSON.parse(readFileSync(join(project, "pharn.config.json"), "utf8")).skillsVersion ?? null;
    } catch {
      // an unreadable or malformed config leaves `sv` null
    }
    out.project = { path: redact(project), claude_md_bytes: existsSync(cm) ? statSync(cm).size : null, skills_version: sv };
  }
  return out;
}

// ---- --prefix ----
function firstRequest(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  for (const l of text.split("\n")) {
    if (!l) continue;
    let j;
    try {
      j = JSON.parse(l);
    } catch {
      continue;
    }
    if (j.type !== "assistant" || !j.message?.usage) continue;
    const u = j.message.usage;
    return {
      ts: typeof j.timestamp === "string" ? j.timestamp : null,
      model: j.message.model ?? null,
      input: u.input_tokens ?? 0,
      cache_write: u.cache_creation_input_tokens ?? 0,
      cache_read: u.cache_read_input_tokens ?? 0,
    };
  }
  return null;
}

function agentType(path) {
  try {
    const m = JSON.parse(readFileSync(path.replace(/\.jsonl$/, ".meta.json"), "utf8"));
    return typeof m.agentType === "string" ? m.agentType : "(no type)";
  } catch {
    return "(no meta)";
  }
}

/** min / median (lower middle) / max of a numeric list; nulls on an empty list. */
export function stats(values) {
  const v = [...values].sort((a, b) => a - b);
  if (v.length === 0) return { n: 0, min: null, median: null, max: null };
  return { n: v.length, min: v[0], median: v[Math.floor((v.length - 1) / 2)], max: v.at(-1) };
}

function prefixMode(paths, since, until) {
  const rows = paths
    .map((p) => ({ file: basename(p), agent_type: agentType(p), ...(firstRequest(p) ?? { none: true }) }))
    .filter((r) => !r.none && r.ts !== null && (!since || r.ts >= since) && (!until || r.ts < until));
  rows.sort((a, b) => a.ts.localeCompare(b.ts));
  const byType = {};
  for (const r of rows) (byType[r.agent_type] ??= []).push(r);
  const summarize = (rs) => ({
    uncached_input: stats(rs.map((r) => r.input)),
    cache_write: stats(rs.map((r) => r.cache_write)),
    cache_read: stats(rs.map((r) => r.cache_read)),
    first_request_total_all_classes: stats(rs.map((r) => r.input + r.cache_write + r.cache_read)),
    with_cache_read: rs.filter((r) => r.cache_read > 0).length,
    first_ts: rs[0]?.ts ?? null,
    last_ts: rs.at(-1)?.ts ?? null,
  });
  return {
    note: "harness observation: each transcript's FIRST request only (its fixed prefix), per token class, not a PHARN run; the all-classes total is shown for reference and is NOT a token class",
    window: { since: since ?? null, until: until ?? null },
    transcripts: rows.length,
    by_agent_type: Object.fromEntries(Object.entries(byType).map(([t, rs]) => [t, summarize(rs)])),
    rows: rows.map((r) => ({ ...r, ts: r.ts.slice(0, 16) })),
  };
}

// ---- --self-test ----
function selfTest() {
  const checks = [];
  const eq = (name, got, want) => checks.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want });
  eq("6.7.0 < 6.35.0 numerically", cmpVersion("6.7.0", "6.35.0"), -1);
  eq("6.12.1 < 6.32.0", cmpVersion("6.12.1", "6.32.0"), -1);
  eq("6.35.0 == 6.35.0", cmpVersion("6.35.0", "6.35.0"), 0);
  eq("7.0.0 > 6.35.0", cmpVersion("7.0.0", "6.35.0"), 1);
  eq("non-semver is null", cmpVersion("6.35", "6.35.0"), null);
  const base = { command: "/pharn-loop", membership: { method: "run-window/2" }, coverage: "partial", executions: { rows: [] }, work: [] };
  const ok = (l, checker = "green", fixture = false) => classify(l, { fixture, checker });
  eq("6.7.0 is pre-optimization", ok({ ...base, skills_version: "6.7.0" }).reasons, ["pre-optimization-version"]);
  eq("6.33.0 is model-usage tier, no elapsed/work", ok({ ...base, skills_version: "6.33.0" }), {
    tier: "model-usage",
    reasons: [],
    metrics: { tokens: true, elapsed: false, work: false },
    metric_exclusions: { tokens: [], elapsed: ["version-below-6.35.0"], work: ["version-below-6.35.0"] },
  });
  eq("6.35.0 green is full, all metrics", ok({ ...base, skills_version: "6.35.0" }).metrics, { tokens: true, elapsed: true, work: true });
  eq("a fixture is never included", ok({ ...base, skills_version: "6.35.0" }, "green", true).tier, null);
  eq("a crashed checker blocks tokens, is no RED, and is named", ok({ ...base, skills_version: "6.35.0" }, "crashed"), {
    tier: "full",
    reasons: [],
    metrics: { tokens: false, elapsed: true, work: true },
    metric_exclusions: { tokens: ["checker-crashed"], elapsed: [], work: [] },
  });
  eq("absent membership is named per metric", ok({ ...base, skills_version: "6.35.0", membership: undefined }).metric_exclusions.tokens, [
    "membership-absent",
  ]);
  eq("run-window/1 is a rule reason", ok({ ...base, skills_version: "6.35.0", membership: { method: "run-window/1" } }).reasons, [
    "membership-run-window-1",
  ]);
  eq("wrong command", ok({ ...base, command: "/pharn-review", skills_version: "6.35.0" }).tier, null);
  eq("null parses but is no ledger", isLedgerObject(null), false);
  eq("an array is no ledger", isLedgerObject([]), false);
  eq("orchestrator in the main thread", requestRole({ sidechain: false, agent_id: null }, "main"), "orchestrator");
  eq("orchestrator inside an agent (REVIEW F6)", requestRole({ sidechain: true, agent_id: "a1" }, "agent:a1"), "orchestrator");
  eq(
    "the main thread is NOT the orchestrator of a run started in an agent",
    requestRole({ sidechain: false, agent_id: null }, "agent:a1"),
    "stage-agent"
  );
  eq("a stage agent", requestRole({ sidechain: true, agent_id: "b2" }, "agent:a1"), "stage-agent");
  eq("no run context", requestRole({ sidechain: false }, null), "unknown-context");
  eq(
    "storedProfile splits by role",
    storedProfile({
      membership: { context: "agent:a1" },
      requests: [
        { stage: "pharn-build", sidechain: true, agent_id: "a1", tokens: { output: 1 } },
        { stage: "pharn-build", sidechain: true, agent_id: "b2", tokens: { output: 2 } },
      ],
    }).by_stage_role,
    {
      "pharn-build · orchestrator": { requests: 1, tokens: { output: 1 } },
      "pharn-build · stage-agent": { requests: 1, tokens: { output: 2 } },
    }
  );
  eq("bash blocks counted per section", bashBlocksBySection("## A\n```bash\nx\n```\n```text\ny\n```\n## B\n```bash\nz\n```\n"), {
    A: 1,
    B: 1,
  });
  eq("section bytes", sectionBytes("## 5. a\nx\n## 6. b\nyy\n## 7. c\n", 6), 11);
  eq("stats lower median", stats([3, 1, 2, 4]), { n: 4, min: 1, median: 2, max: 4 });
  eq("home is redacted", redact(`${HOME}/x`), "~/x");
  const failed = checks.filter((c) => !c.ok);
  return { ok: failed.length === 0, checks: checks.length, failed };
}

function main(argv) {
  const usage = () => {
    process.stderr.write(
      "usage: audit.mjs --self-test | --ledgers <p…> [--fixture <p…>] | --static [--project <dir>] | --prefix <p…> [--since <iso>] [--until <iso>]\n"
    );
    return 2;
  };
  const take = (flag) => {
    const i = argv.indexOf(flag);
    if (i < 0) return null;
    const out = [];
    for (let k = i + 1; k < argv.length && !argv[k].startsWith("--"); k++) out.push(argv[k]);
    return out;
  };
  const one = (flag) => {
    const v = take(flag);
    return v === null ? undefined : v.length === 1 ? v[0] : null;
  };
  let doc;
  if (argv.includes("--self-test")) doc = selfTest();
  else if (argv.includes("--ledgers"))
    doc = ledgersMode(
      (take("--ledgers") ?? []).map((p) => resolve(p)),
      (take("--fixture") ?? []).map((p) => resolve(p))
    );
  else if (argv.includes("--static")) {
    const project = one("--project");
    if (project === null) return usage();
    doc = staticMode(project === undefined ? undefined : resolve(project));
  } else if (argv.includes("--prefix")) {
    const since = one("--since");
    const until = one("--until");
    if (since === null || until === null) return usage();
    const files = (take("--prefix") ?? []).map((p) => resolve(p));
    doc = prefixMode(files, since, until);
  } else return usage();
  process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
  return doc.ok === false ? 1 : 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
