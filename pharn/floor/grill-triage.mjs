#!/usr/bin/env node
// pharn/floor/grill-triage.mjs — the triage stage's skeleton and the loop's triage verdict (7.7.0, loop-grill-triage).
// The CLI half of `pharn/floor/grill-triage-core.mjs`, whose header holds the rules and their bounds; contract:
// `pharn/pharn-contracts/grill-triage.md` (cited, not restated — P4).
//
//   node pharn/floor/grill-triage.mjs skeleton <grill-findings.json>
//        0 → the triage skeleton on stdout: round, findings_sha256, one element per finding with empty strings
//        1 → `RED — grill-findings.json invalid: <codes>` then one fixed hint per code (grill-findings-core.mjs)
//        2 → usage, or a file that cannot be read (reason on stderr, nothing on stdout)
//
//   node pharn/floor/grill-triage.mjs check <grill-triage.json> --findings <grill-findings.json>
//        0 → proceed   3 → replan   4 → spec — each with one verdict JSON line on stdout (ids only, never a reason)
//        1 → `RED — <codes>` as the FIRST stdout line (the triage file, or the findings file it is checked against,
//            breaks its contract), then one fixed hint line per distinct code
//        2 → usage, or a file that cannot be read (stderr)
//
// Exit 1 is ALWAYS printed WITH its `RED — ` line first (shelled-verdict-core.mjs's contract), so a caller can tell this
// checker's RED from node's own exit 1 on a crash.
//
// READING: each input is read through regular-file.mjs — one O_NOFOLLOW descriptor, a regular file of at most
// INPUT_MAX bytes, never a final-component link (L54). The digest is the sha256 of the findings file's BYTES, the same
// bytes the text is decoded from. Output names codes, indexes and ids — never a reason or
// any other free-text value from either file (P2).
//
// FLOOR: the verdict (see the core's header). ADVISORY: that a stage writes the file, that each disposition is right,
// and that the caller acts on the exit code (/pharn-loop Step 4).

import "./runtime-floor.mjs";
import { createHash } from "node:crypto";
import { defectHints as findingsHints, formatDefects as findingsDefects, validate } from "./grill-findings-core.mjs";
import { checkTriage, defectHints, formatDefects, skeleton, VERDICT_EXIT } from "./grill-triage-core.mjs";
import { readRegularFile } from "./regular-file.mjs";

const INPUT_MAX = 4 * 1024 * 1024;
const USAGE =
  "usage: node pharn/floor/grill-triage.mjs skeleton <grill-findings.json>\n" +
  "       node pharn/floor/grill-triage.mjs check <grill-triage.json> --findings <grill-findings.json>\n";

/** Read one input's bytes: `{ok, bytes}` or `{ok: false, reason}` (regular-file.mjs; the reason never holds content). */
function readInput(path, label) {
  return readRegularFile(path, label, INPUT_MAX);
}

function fail(io, reason) {
  io.stderr.write(`grill-triage: ${reason}\n`);
  return 2;
}

/** Read and validate the findings file: `{ok, doc, sha}`, or `{ok: false, code}` with the exit code already written. */
function loadFindings(path, io) {
  const r = readInput(path, "findings file");
  if (!r.ok) return { ok: false, code: fail(io, r.reason) };
  const v = validate(r.bytes.toString("utf8"));
  if (!v.ok) {
    const lines = [`RED — grill-findings.json invalid: ${findingsDefects(v.defects)}`, ...findingsHints(v.defects)];
    io.stdout.write(`${lines.join("\n")}\n`);
    return { ok: false, code: 1 };
  }
  return { ok: true, doc: v.doc, sha: createHash("sha256").update(r.bytes).digest("hex") };
}

function doSkeleton(rest, io) {
  if (rest.length !== 1 || rest[0].startsWith("-")) {
    io.stderr.write(USAGE);
    return 2;
  }
  const f = loadFindings(rest[0], io);
  if (!f.ok) return f.code;
  io.stdout.write(`${JSON.stringify(skeleton(f.doc, f.sha), null, 2)}\n`);
  return 0;
}

/** `check`'s argv after the subcommand: one positional and `--findings` once. */
function parseCheckArgs(rest) {
  let findings = null;
  const pos = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--findings") {
      if (findings !== null) return null;
      const v = rest[i + 1];
      if (v === undefined || v.startsWith("-")) return null;
      findings = v;
      i++;
    } else if (a.startsWith("-")) return null;
    else pos.push(a);
  }
  if (pos.length !== 1 || findings === null) return null;
  return { triage: pos[0], findings };
}

function doCheck(rest, io) {
  const a = parseCheckArgs(rest);
  if (!a) {
    io.stderr.write(USAGE);
    return 2;
  }
  const t = readInput(a.triage, "triage file");
  if (!t.ok) return fail(io, t.reason);
  const f = loadFindings(a.findings, io);
  if (!f.ok) return f.code;
  const r = checkTriage(t.bytes.toString("utf8"), f.doc, f.sha);
  if (!r.ok) {
    io.stdout.write(`${[`RED — ${formatDefects(r.defects)}`, ...defectHints(r.defects)].join("\n")}\n`);
    return 1;
  }
  io.stdout.write(`${JSON.stringify(r.verdict)}\n`);
  return VERDICT_EXIT[r.verdict.verdict];
}

/** Entry point; returns the exit code (never calls process.exit — the flush rule). */
export function main(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const [cmd, ...rest] = argv.slice(2);
  if (cmd === "skeleton") return doSkeleton(rest, io);
  if (cmd === "check") return doCheck(rest, io);
  io.stderr.write(USAGE);
  return 2;
}

if (import.meta.main) process.exitCode = main(process.argv);
