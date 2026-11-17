#!/usr/bin/env node
// .dev/features/loop-driver-spike/driver/loop-driver.mjs — the CORE-113 spike driver's CLI: the IO around
// `driver-core.mjs`'s interpreter. Dev apparatus, never shipped; run from a terminal by the maintainer, never from
// inside a Claude Code session (the auto-mode classifier refuses a nested headless session, and this file starts one
// `claude -p` per model stage).
//
//   node loop-driver.mjs --project <tree> --out <new dir> --slug <kebab> --intent <file>
//                        [--cap 3] [--accept-host-execution] [--answer <word>] [--claude <bin>]
//
// Writes, under --out (which must not exist; L66):
//   steps.jsonl          one line per step: id, argv, exit, wall ms, the saved stdout's path, stderr's head
//   stdout/<seq>-<id>.txt every floor step's stdout (the token steps read these)
//   sessions/<seq>-<stage>.jsonl / .err   each `claude -p` session's stream-json and stderr
//   sessions.json        each session's id, stage, model, `--agent`, effort, wall ms, exit
//   notes.txt            the driver's own notes (a failed capture, a redirect that failed, its own error)
//   summary.json         where the run stopped, the decision, the record's outcome lines, the closeout's document
//
// This file holds NO conditional (AC2; `loop-driver.test.mjs` scans it): every decision is the interpreter's.
// `--accept-host-execution` reaches the isolation line only from this argv (GRILL concern 4); it accepts an
// unattended run that executes the project's tests on this host with this user's credentials present.

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { buildProgram, interpret, NODE_STEP_TIMEOUT_MS, SESSION_TIMEOUT_MS, validateArgs } from "./driver-core.mjs";

const { values } = parseArgs({
  options: {
    project: { type: "string" },
    out: { type: "string" },
    slug: { type: "string" },
    intent: { type: "string" },
    cap: { type: "string" },
    answer: { type: "string" },
    claude: { type: "string" },
    "accept-host-execution": { type: "boolean" },
  },
  strict: true,
  allowPositionals: false,
});

const ctx = validateArgs(values, {
  cwd: process.cwd(),
  exists: existsSync,
  readText: (p) => readFileSync(p, "utf8"),
  nodePath: process.execPath,
  driverDir: import.meta.dirname,
});

mkdirSync(dirname(ctx.out), { recursive: true });
mkdirSync(ctx.out); // not recursive: an existing directory throws (L66)
mkdirSync(join(ctx.out, "stdout"));
mkdirSync(join(ctx.out, "sessions"));

const t0 = Date.now();
let seq = 0;
const out = (f) => join(ctx.out, f);
const inProject = (rel) => join(ctx.project, rel);
const log = (entry) => {
  appendFileSync(out("steps.jsonl"), JSON.stringify({ seq, ts: new Date().toISOString(), ...entry }) + "\n");
  process.stderr.write(`[${new Date().toISOString()}] ${entry.id} -> exit ${entry.exit} (${entry.ms} ms)\n`);
  return entry.exit;
};

const io = {
  uuid: randomUUID,
  today: () => new Date().toLocaleDateString("sv-SE"),
  note: (msg) => appendFileSync(out("notes.txt"), `${new Date().toISOString()} ${msg}\n`),
  record: (entry) => log({ ...entry, seq: ++seq, ms: 0 }),
  spawn: (id, argv) => {
    seq += 1;
    const start = Date.now();
    const r = spawnSync(argv[0], argv.slice(1), {
      cwd: ctx.project,
      encoding: "utf8",
      timeout: NODE_STEP_TIMEOUT_MS,
      killSignal: "SIGKILL",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const ms = Date.now() - start;
    log({ id, kind: "cmd", argv, status: r.status, signal: r.signal, exit: r.status, ms, stderr: String(r.stderr).slice(0, 4000) });
    return r;
  },
  saveStdout: (id, text, c) => {
    const file = out(`stdout/${String(seq).padStart(4, "0")}-${id}.txt`);
    writeFileSync(file, text);
    c.lastStdout[id] = file;
  },
  session: (id, stage, argv, sessionId, c) => {
    seq += 1;
    const base = out(`sessions/${String(seq).padStart(4, "0")}-${stage}`);
    const fdOut = openSync(`${base}.jsonl`, "w");
    const fdErr = openSync(`${base}.err`, "w");
    const start = Date.now();
    const r = spawnSync(argv[0], argv.slice(1), {
      cwd: ctx.project,
      stdio: ["ignore", fdOut, fdErr],
      timeout: SESSION_TIMEOUT_MS,
      killSignal: "SIGKILL",
    });
    const ms = Date.now() - start;
    closeSync(fdOut);
    closeSync(fdErr);
    const meta = {
      seq,
      step: id,
      stage,
      session_id: sessionId,
      model: argv[argv.indexOf("--model") + 1],
      agent: argv.includes("--agent"),
      effort: argv.filter((_, i) => argv[i - 1] === "--effort").concat([null])[0],
      resume: argv.includes("--resume"),
      started: new Date(start).toISOString(),
      ms,
      status: r.status,
      signal: r.signal,
      stream: `${base}.jsonl`,
    };
    c.sessions.push(meta);
    writeFileSync(out("sessions.json"), JSON.stringify(c.sessions, null, 2) + "\n");
    log({
      id,
      kind: "session",
      argv: argv.slice(0, -1),
      prompt_chars: argv[argv.length - 1].length,
      exit: r.status,
      signal: r.signal,
      ms,
      session_id: sessionId,
    });
    return r;
  },
  writeProject: (rel, text) => {
    mkdirSync(dirname(inProject(rel)), { recursive: true });
    writeFileSync(inProject(rel), text);
  },
  mkdirProject: (rel) => mkdirSync(inProject(rel), { recursive: true }),
  editProject: (rel, fn) => writeFileSync(inProject(rel), fn(readFileSync(inProject(rel), "utf8"))),
  readProjectLine: (rel) => readFileSync(inProject(rel), "utf8").split("\n")[0],
};

const done = interpret(buildProgram(), ctx, io);

const summary = {
  schema: "loop-driver-spike-summary/1",
  driver_argv: process.argv.slice(2),
  project: done.project,
  name: done.name,
  base: done.base,
  original_branch: done.branch,
  cap: done.cap,
  iterations: done.iter,
  stop: done.stop,
  decision: done.decision,
  spec: done.spec,
  ac_tests: done.acTests,
  closeout: done.closeout,
  crash: done.crash,
  sessions: done.sessions,
  trail: done.trail,
  wall_ms: Date.now() - t0,
};
writeFileSync(out("summary.json"), JSON.stringify(summary, null, 2) + "\n");
process.stderr.write(`loop-driver: stopped at ${JSON.stringify(done.stop)}; summary in ${out("summary.json")}\n`);
