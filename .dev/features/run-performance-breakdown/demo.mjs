#!/usr/bin/env node
// .dev/features/run-performance-breakdown/demo.mjs — the CONTROLLED end-to-end fixture for 6.35.0 (apparatus, never
// shipped). It builds one two-iteration `/pharn-loop`-shaped run in a temp directory out of the REAL writers and
// readers — `mark-phase.mjs markPhase()` for the markers, `markerLine()` for the binding lines a real Bash call
// leaves in the transcript, `stage-work.mjs regressWork/verifyWork/appendWork` for the work records (over stamp
// `runs[]` of the real shape: `ran`, `reason: "no-files" | "reused"`), `render-cost-ledger.mjs` for `cost.json`,
// `check-cost-ledger.mjs` for its verdict, and `render-run-report.mjs` for the report — then answers the five
// questions from `cost.json` alone, and measures the added overhead.
//
// WHAT IS SYNTHETIC, stated: the transcript (one main-thread context, invented token counts), the timestamps, and the
// stamp contents. The real-script path — `stage-regress.mjs` / `stage-verify.mjs` writing these records from stamps
// they produced by spawning real gates — is exercised by the stage suites (`stage-regress.test.mjs` ★ HIT, the
// budgeted chain; `stage-verify.test.mjs` ★ EQUIVALENCE), which assert each record's counts against the processes
// their fixtures COUNTED spawning. This demo is not a live run and does not claim to be one.
//
// Usage: node .dev/features/run-performance-breakdown/demo.mjs   (prints DEMO.md's body on stdout)

import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { markPhase, markerLine } from "../../../pharn/floor/mark-phase.mjs";
import { regressWork, verifyWork, appendWork, readWork } from "../../../pharn/floor/stage-work.mjs";
import { renderLedger, serializeLedger, table } from "../../../pharn/floor/render-cost-ledger.mjs";
import { checkLedger } from "../../../pharn/floor/check-cost-ledger.mjs";
import { renderRunReport } from "../../../pharn/floor/render-run-report.mjs";
import { buildExecutions } from "../../../pharn/floor/stage-executions-core.mjs";

const SID = "00000000-0000-4000-8000-0000000d3e70";
const NAME = "demo-feature";
const T0 = Date.parse("2026-09-28T10:00:00.000Z");
const at = (sec) => new Date(T0 + sec * 1000);

// ── the run, stage by stage: [stage, iteration, start s, end s, requests, model, output per request] ─────────────
const STAGES = [
  ["pharn-spec", null, 5, 185, 9, "claude-opus-5-5", 900],
  ["pharn-plan", null, 190, 580, 22, "claude-opus-5-5", 1400],
  ["pharn-grill", null, 585, 720, 8, "claude-opus-5-5", 700],
  ["pharn-test", null, 725, 960, 14, "claude-sonnet-5", 1100],
  ["pharn-build", 1, 965, 1860, 41, "claude-sonnet-5", 1600],
  ["pharn-regress", 1, 1865, 2320, 4, "claude-opus-5-5", 300],
  ["pharn-verify", 1, 2325, 2460, 3, "claude-opus-5-5", 250],
  ["pharn-build", 2, 2465, 2820, 17, "claude-sonnet-5", 1300],
  ["pharn-regress", 2, 2825, 2950, 3, "claude-opus-5-5", 250],
  ["pharn-verify", 2, 2955, 3030, 3, "claude-opus-5-5", 250],
  ["pharn-verify", 2, 3035, 3100, 2, "claude-opus-5-5", 200], // the freshness re-run, run 2
];

// ── stamp runs[] of the real shape ───────────────────────────────────────────────────────────────────────────────
const ran = (id) => ({ id, ran: true, exit: 0 });
const noFiles = (id) => ({ id, ran: false, reason: "no-files", exit: 0 });
const reused = (id) => ({ id, ran: false, reason: "reused", exit: 0 });
const HEAD = { runs: [noFiles("test"), ran("lint"), ran("typecheck"), ran("build")] };
const BASE = { runs: [noFiles("test"), ran("lint"), ran("typecheck"), ran("build")] };
const VERIFY_REUSING = { runs: [ran("test"), ran("lint"), reused("typecheck"), reused("build"), ran("test:e2e"), ran("reconcile")] };
const VERIFY_FRESH = { runs: [ran("test"), ran("lint"), ran("typecheck"), ran("build"), ran("test:e2e"), ran("reconcile")] };

function reqLine(n, ts, model, output) {
  return JSON.stringify({
    type: "assistant",
    requestId: `req_demo_${String(n).padStart(4, "0")}`,
    timestamp: ts,
    sessionId: SID,
    isSidechain: false,
    version: "2.1.280",
    message: {
      model,
      usage: {
        input_tokens: 3,
        cache_creation_input_tokens: 2000,
        cache_read_input_tokens: 60000 + n * 50,
        output_tokens: output,
        cache_creation: { ephemeral_1h_input_tokens: 2000, ephemeral_5m_input_tokens: 0 },
      },
    },
  });
}
const printed = (ts, text, n) =>
  JSON.stringify({
    type: "user",
    sessionId: SID,
    timestamp: ts,
    isSidechain: false,
    message: { role: "user", content: [{ type: "tool_result", tool_use_id: `toolu_demo_${n}`, content: `${text}\nexit=0` }] },
  });

function build(root, { withWork = true } = {}) {
  const markersBase = join(root, ".pharn", "cost");
  const projectsDir = join(root, "projects");
  const transcript = join(projectsDir, "demo", `${SID}.jsonl`);
  mkdirSync(join(projectsDir, "demo"), { recursive: true });
  writeFileSync(transcript, "");
  let n = 0;
  const mark = (kind, sec, stage = null, iteration = null) => {
    const m = markPhase({ name: NAME, kind, stage, iteration, base: markersBase, sessionId: SID, now: at(sec) });
    appendFileSync(transcript, printed(m.ts, markerLine(m), m.seq) + "\n");
  };
  mark("run-start", 0);
  for (const [stage, iteration, s, e, requests, model, output] of STAGES) {
    mark("stage-start", s, stage, iteration);
    for (let i = 0; i < requests; i++) {
      const ts = at(s + 1 + Math.floor(((e - s - 2) * i) / Math.max(1, requests))).toISOString();
      appendFileSync(transcript, reqLine(++n, ts, model, output) + "\n");
    }
    if (withWork && stage === "pharn-regress") {
      const hit = iteration === 2;
      const rec = regressWork({
        headStamp: HEAD,
        baseStamp: BASE,
        baseReuse: hit ? { reused: true, miss: null } : { reused: false, miss: "no-record" },
        installResult: hit ? null : { ran: true, exit: 0, timedOut: false, ms: 94218 },
        ts: at(e - 1).toISOString(),
        sessionId: SID,
      });
      appendWork({ feature: NAME, record: rec, root, base: ".pharn/cost" });
    }
    if (withWork && stage === "pharn-verify") {
      const rerun = s === 3035;
      const rec = verifyWork({ stamp: rerun ? VERIFY_FRESH : VERIFY_REUSING, ts: at(e - 1).toISOString(), sessionId: SID });
      appendWork({ feature: NAME, record: rec, root, base: ".pharn/cost" });
    }
    mark("orchestrator", e);
  }
  mark("run-stop", 3120);
  return { markersBase, projectsDir };
}

function emit(root, paths) {
  const led = renderLedger({ name: NAME, command: "/pharn-loop", repo: root, sessionId: SID, ...paths });
  const dir = join(root, "pharn", "features", NAME);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cost.json"), serializeLedger(led));
  return led;
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
function timeIt(fn, reps = 21) {
  const xs = [];
  for (let i = 0; i < reps; i++) {
    const t = performance.now();
    fn();
    xs.push(performance.now() - t);
  }
  return median(xs);
}

const root = mkdtempSync(join(tmpdir(), "perf-demo-"));
const bare = mkdtempSync(join(tmpdir(), "perf-demo-bare-"));
try {
  const paths = build(root);
  const led = emit(root, paths);
  const { reds, warns } = checkLedger(led);
  const report = renderRunReport(NAME, { repo: root, markersBase: paths.markersBase });
  const perf = report.slice(report.indexOf("## Stage elapsed and deterministic work"), report.indexOf("## Files"));

  // ── the five questions, answered from cost.json alone ─────────────────────────────────────────────────────────
  const byStage = new Map();
  for (const r of led.by_stage_iteration_model) {
    const k = r.stage ?? "(unattributed)";
    const a = byStage.get(k) ?? { requests: 0, output: 0, cache_read: 0 };
    a.requests += r.requests;
    a.output += r.tokens.output;
    a.cache_read += r.tokens.cache_read;
    byStage.set(k, a);
  }
  const topReq = [...byStage.entries()].sort((a, b) => b[1].requests - a[1].requests)[0];
  const topOut = [...byStage.entries()].sort((a, b) => b[1].output - a[1].output)[0];
  const measured = led.executions.rows.filter((r) => r.elapsed_ms !== null);
  const longest = measured.sort((a, b) => b.elapsed_ms - a.elapsed_ms)[0];
  const elapsedByStage = new Map();
  for (const r of led.executions.rows)
    if (r.elapsed_ms !== null) elapsedByStage.set(r.stage, (elapsedByStage.get(r.stage) ?? 0) + r.elapsed_ms);
  const rowOf = (i) => led.executions.rows.find((r) => r.work.includes(i));
  const regress = led.work.map((w, i) => [w, rowOf(i)]).filter(([w]) => w.stage === "pharn-regress");
  const verify = led.work.map((w, i) => [w, rowOf(i)]).filter(([w]) => w.stage === "pharn-verify");
  const avoidedVerify = verify.reduce((s, [w]) => s + w.gates.reused, 0);
  const avoidedBase = regress.reduce((s, [w]) => s + w.base.reused, 0);
  const executed = led.work.map((w, i) => {
    const r = rowOf(i);
    const where = `${r.stage} iter ${r.iteration} run ${r.run}`;
    if (w.stage === "pharn-verify") return `${where}: ${w.gates.executed} gate process(es)`;
    return `${where}: ${w.head.executed} HEAD + ${w.base.executed} BASE gate process(es)${w.install ? `, install ${w.install.ms} ms` : ""}${w.base.evidence === "fresh" ? ", a BASE worktree" : ""}`;
  });

  // ── overhead ──────────────────────────────────────────────────────────────────────────────────────────────────
  const noWork = build(bare, { withWork: false });
  const renderWith = timeIt(() => renderLedger({ name: NAME, command: "/pharn-loop", repo: root, sessionId: SID, ...paths }));
  const renderWithout = timeIt(() => renderLedger({ name: NAME, command: "/pharn-loop", repo: bare, sessionId: SID, ...noWork }));
  const ledPre = structuredClone(led);
  delete ledPre.executions;
  delete ledPre.work;
  const checkWith = timeIt(() => checkLedger(led));
  const checkWithout = timeIt(() => checkLedger(ledPre));
  const bigMarkers = [{ seq: 1, kind: "run-start", stage: null, iteration: null, ts: at(0).toISOString(), session_id: SID }];
  const bigWork = [];
  for (let i = 0; i < 500; i++) {
    bigMarkers.push({
      seq: 2 + 2 * i,
      kind: "stage-start",
      stage: "pharn-verify",
      iteration: 1 + (i % 50),
      ts: at(10 + 4 * i).toISOString(),
      session_id: SID,
    });
    bigMarkers.push({
      seq: 3 + 2 * i,
      kind: "orchestrator",
      stage: null,
      iteration: null,
      ts: at(12 + 4 * i).toISOString(),
      session_id: SID,
    });
    bigWork.push(verifyWork({ stamp: VERIFY_REUSING, ts: at(11 + 4 * i).toISOString(), sessionId: SID }));
  }
  const bigView = timeIt(() => buildExecutions(bigMarkers, bigWork));
  const bigFile = join(bare, "big-work.jsonl");
  writeFileSync(bigFile, bigWork.map((w) => JSON.stringify(w)).join("\n") + "\n");
  const bigRead = timeIt(() => readWork(bigFile));
  const appendOne = timeIt(() => appendWork({ feature: "bench", record: bigWork[0], root: bare, base: ".pharn/cost" }), 201);
  const bytes = Buffer.byteLength(serializeLedger(led));
  const bytesPre = Buffer.byteLength(serializeLedger({ ...ledPre, dropped: led.dropped }));
  const linesAdded = serializeLedger(led).split("\n").length - serializeLedger(ledPre).split("\n").length;

  const ms = (x) => `${x.toFixed(2)} ms`;
  const out = [
    "# DEMO — run-performance-breakdown (6.35.0), a controlled end-to-end fixture",
    "",
    "Produced by `node .dev/features/run-performance-breakdown/demo.mjs` (apparatus). A two-iteration",
    "`/pharn-loop`-shaped run built from the REAL marker writer, work-record writer, ledger emitter, checker and run",
    "report. **Synthetic, stated:** the transcript (one main-thread context, invented token counts), the timestamps and",
    "the stamp contents. The real stage scripts writing these records from gates they actually spawned are exercised by",
    "`stage-regress.test.mjs` (★ HIT, the budgeted chain) and `stage-verify.test.mjs` (★ EQUIVALENCE, OBSERVATIONAL).",
    "",
    `check-cost-ledger: ${reds.length === 0 ? "GREEN" : `RED ${JSON.stringify(reds)}`} (${warns.length} warn(s))`,
    "",
    "## The stop's screen table (`table()`)",
    "",
    "```text",
    table(led),
    "```",
    "",
    "## The run report's new section (`RUN-REPORT.md`)",
    "",
    perf.trim(),
    "",
    "## The five questions, answered from `cost.json` alone",
    "",
    `1. **Most model usage:** by requests, \`${topReq[0]}\` (${topReq[1].requests} requests); by output tokens, \`${topOut[0]}\` (${topOut[1].output} output tokens, ${topOut[1].cache_read} cache-read). Source: \`by_stage_iteration_model\`, summed over iterations and models.`,
    `2. **Longest observed interval:** \`${longest.stage}\` iteration ${longest.iteration} run ${longest.run}, ${longest.elapsed_ms} ms. Summed over its executions, the stage with the most observed wall clock is \`${[...elapsedByStage.entries()].sort((a, b) => b[1] - a[1])[0][0]}\`. Source: \`executions.rows\` (wall clock between markers — not model, tool or CPU time).`,
    `3. **BASE regression work reused?** ${regress.map(([w, r]) => `iteration ${r.iteration}: ${w.base.evidence === "reused" ? "yes — no worktree, no install, 0 BASE gate processes" : `no (\`${w.base.miss}\`) — worktree created, install ran (${w.install.ms} ms), ${w.base.executed} BASE gate processes`}`).join("; ")}. Source: \`work[]\`, \`base.evidence\`.`,
    `4. **VERIFY gate processes avoided:** ${avoidedVerify} across ${verify.length} verify executions (${verify.map(([w, r]) => `iter ${r.iteration} run ${r.run}: ${w.gates.reused} of ${w.gates.required}`).join(", ")}); plus ${avoidedBase} BASE gate results taken from earlier evidence. Source: \`work[].gates.reused\`, \`work[].base.reused\`.`,
    `5. **Expensive deterministic work that still executed:** ${executed.join("; ")}.`,
    "",
    "## Added overhead (median of 21 runs; 201 for the append)",
    "",
    "| measured | value |",
    "| --- | --- |",
    `| \`renderLedger\` on this run, with vs without \`work.jsonl\` | ${ms(renderWith)} vs ${ms(renderWithout)} |`,
    `| \`checkLedger\` on this ledger, with vs without the two keys | ${ms(checkWith)} vs ${ms(checkWithout)} |`,
    `| \`buildExecutions\` over 1,001 markers and 500 work records | ${ms(bigView)} |`,
    `| \`readWork\` over 500 records | ${ms(bigRead)} |`,
    `| one \`appendWork\` (the stage scripts' only added I/O) | ${ms(appendOne)} |`,
    `| \`cost.json\` size, with vs without the two keys | ${bytes} vs ${bytesPre} bytes, +${linesAdded} lines |`,
    "",
    "Structural bound, independent of this machine: the emitter reads ONE extra small file per emission, makes no",
    "extra transcript pass, spawns no process and calls no model; the view is one pass over the current run's markers",
    "plus one latest-marker search per work record; each stage script adds one `JSON.stringify` + one append at `done`,",
    "and regress one `performance.now()` pair around its install.",
    "",
  ];
  process.stdout.write(out.join("\n"));
} finally {
  rmSync(root, { recursive: true, force: true });
  rmSync(bare, { recursive: true, force: true });
}
