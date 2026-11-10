#!/usr/bin/env node
// pharn/floor/grill-findings.mjs — render and check a grill's findings file (7.6.0, grill-finding-ids). The CLI half of
// `pharn/floor/grill-findings-core.mjs`, whose header holds the rules and their bounds; contract:
// `pharn/pharn-contracts/finding-shape.md`, "Emission — grill-findings.json" (cited, not restated — P4).
//
//   node pharn/floor/grill-findings.mjs render <grill-findings.json>
//        0 → the GRILL.md findings section on stdout (markers included)
//        1 → `RED — grill-findings.json invalid: <codes>` (the file breaks the contract), then one fixed hint line
//            per distinct code naming the accepted shape (`  <code>: <hint>`)
//        2 → usage, or a file that cannot be read (reason on stderr, nothing on stdout)
//
//   node pharn/floor/grill-findings.mjs check <grill-findings.json> --grill <GRILL.md> --plan <PLAN.md>
//        0 → `GREEN — …`: the file is valid, GRILL.md's section equals its render, and every scanner finding
//            `grill-scan.mjs` produces for that plan is in the file
//        1 → `RED — <codes>` as the FIRST stdout line, then one line per missing scanner finding, then one fixed
//            hint line per distinct code
//        2 → usage, an unreadable file, or scanners that could not run while nothing else was RED (stderr). A definite
//            RED stays exit 1 when the scanners also fail, and says so on a later line.
//   `--plan` must be spelled exactly as the grill ran `grill-scan.mjs` (the pinned lines in pharn-grill.md use the same
//   path), because a scanner finding's `file` is `<plan path>:<line>`.
//
// Exit 1 is ALWAYS printed WITH its `RED — ` line first (shelled-verdict-core.mjs's contract), so a caller can tell this
// checker's RED from node's own exit 1 on a crash.
//
// READING: each input must be a regular file by lstat (a symlink is refused, as grill-scan.mjs refuses one) of at most
// INPUT_MAX bytes. Output names codes, indexes and the scanner findings' own fixed fields — never a value read from the
// findings file or GRILL.md (P2).
//
// FLOOR: the verdict (enum/regex, byte equality, field equality — see the core's header). ADVISORY: that the grill runs
// this, repairs on RED, or lists every finding it formed. This increment gates nothing on it; /pharn-grill records a
// still-RED check as a line in GRILL.md.

import "./runtime-floor.mjs";
import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";
import { defectHints, formatDefects, missingScannerFindings, render, sectionDefects, validate } from "./grill-findings-core.mjs";
import { runScans, scanFindings } from "./grill-scan.mjs";

export const INPUT_MAX = 4 * 1024 * 1024;

const USAGE =
  "usage: node pharn/floor/grill-findings.mjs render <grill-findings.json>\n" +
  "       node pharn/floor/grill-findings.mjs check <grill-findings.json> --grill <GRILL.md> --plan <PLAN.md>\n";

/**
 * Read one input: `{ok, text}` or `{ok: false, reason}`. The reason names the path the caller passed, never content.
 * Opened once with O_NOFOLLOW and checked and read through that descriptor, so a final-component link is refused and
 * the file cannot be swapped between the check and the read (L54).
 */
function readInput(path, label) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const st = fstatSync(fd);
    if (!st.isFile()) return { ok: false, reason: `${label} is not a regular file: ${path}` };
    if (st.size > INPUT_MAX) return { ok: false, reason: `${label} is larger than ${INPUT_MAX} bytes: ${path}` };
    return { ok: true, text: readFileSync(fd, "utf8") };
  } catch (e) {
    if (e?.code === "ENOENT") return { ok: false, reason: `${label} not found: ${path}` };
    if (e?.code === "ELOOP") return { ok: false, reason: `${label} is not a regular file: ${path}` };
    return { ok: false, reason: `${label} could not be read: ${path}` };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** Parse `check`'s argv after the subcommand: one positional, `--grill` and `--plan` once each. */
function parseCheckArgs(rest) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--grill" || a === "--plan") {
      if (Object.hasOwn(flags, a)) return null;
      const v = rest[i + 1];
      if (v === undefined || v.startsWith("-")) return null;
      flags[a] = v;
      i++;
    } else if (a.startsWith("-")) return null;
    else pos.push(a);
  }
  if (pos.length !== 1 || !flags["--grill"] || !flags["--plan"]) return null;
  return { json: pos[0], grill: flags["--grill"], plan: flags["--plan"] };
}

function out(io, s) {
  io.stdout.write(s);
}

function fail(io, reason) {
  io.stderr.write(`grill-findings: ${reason}\n`);
  return 2;
}

function doRender(rest, io) {
  if (rest.length !== 1 || rest[0].startsWith("-")) {
    io.stderr.write(USAGE);
    return 2;
  }
  const r = readInput(rest[0], "findings file");
  if (!r.ok) return fail(io, r.reason);
  const v = validate(r.text);
  if (!v.ok) {
    out(io, `${[`RED — grill-findings.json invalid: ${formatDefects(v.defects)}`, ...defectHints(v.defects)].join("\n")}\n`);
    return 1;
  }
  out(io, render(v.doc));
  return 0;
}

function doCheck(rest, io) {
  const a = parseCheckArgs(rest);
  if (!a) {
    io.stderr.write(USAGE);
    return 2;
  }
  const j = readInput(a.json, "findings file");
  if (!j.ok) return fail(io, j.reason);
  const g = readInput(a.grill, "GRILL.md");
  if (!g.ok) return fail(io, g.reason);

  const v = validate(j.text);
  const defects = v.ok ? sectionDefects(g.text, v.doc) : [...v.defects];

  // The scanners run whatever the file said, so a RED names every defect it can; a scanner failure alone is no verdict.
  const scans = runScans(a.plan);
  let missing = [];
  let expected = [];
  if (scans.ok && v.ok) {
    expected = scanFindings(a.plan, scans.results);
    missing = missingScannerFindings(v.doc, expected);
  }
  const all = [...defects, ...missing];

  if (all.length > 0) {
    const lines = [`RED — ${formatDefects(all)}`];
    for (const m of missing) {
      const e = expected[m.index];
      lines.push(`  missing scanner finding: ${e.file} (rule_id ${e.rule_id}, ${e.evidence})`);
    }
    if (!scans.ok) lines.push(`  scanners NOT run: ${scans.reason}`);
    lines.push(...defectHints(all));
    out(io, `${lines.join("\n")}\n`);
    return 1;
  }
  if (!scans.ok) return fail(io, `scanners could not run, so scanner coverage is unchecked: ${scans.reason}`);
  out(
    io,
    `GREEN — ${v.doc.findings.length} finding(s), round ${v.doc.round}; GRILL.md's section equals the render; ` +
      `${expected.length} scanner finding(s) present\n`
  );
  return 0;
}

/** Entry point; returns the exit code (never calls process.exit — the flush rule). */
export function main(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const [cmd, ...rest] = argv.slice(2);
  if (cmd === "render") return doRender(rest, io);
  if (cmd === "check") return doCheck(rest, io);
  io.stderr.write(USAGE);
  return 2;
}

if (import.meta.main) process.exitCode = main(process.argv);
