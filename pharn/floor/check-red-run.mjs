#!/usr/bin/env node
// pharn/floor/check-red-run.mjs — the CLI of /pharn-test's red run: the PREFLIGHT before it runs, and the per-AC
// VERDICT after. Every decision is red-run-core.mjs's; this file parses flags and prints. Contract:
// pharn/pharn-contracts/ac-tests.md, "The red run".
//
// Usage (every flag required — no defaults, L41):
//   node pharn/floor/check-red-run.mjs --preflight --ac-tests <AC-TESTS.md> --discover <package.json> --root <dir>
//     Does every AC's level have a discovered gate with per-test results configured? A missing package.json is
//     read as "no scripts" (the no-runner case it is), never as unusable. Since 6.36.0 a gate the project excludes
//     (`<root>/pharn.config.json` `gates.exclude`, gate-exclusion-core.mjs) is not discovered, so a level whose gates
//     are all excluded is RED too; a declaration that cannot be read is UNUSABLE. On RED the LAST line is the closed
//     `blocked: no-test-runner — …; suggested: …` line an unattended caller prints verbatim.
//   node pharn/floor/check-red-run.mjs --verdict --ac-tests <AC-TESTS.md> --out <dir> --root <dir>
//     Over the finished ac-test run in <out> (run-gates.mjs `--stage ac-test`): bound to the mapping and the live
//     tree, did every AC's test fail? One line per AC.
//
// Exit: 0 GREEN · 1 RED (preflight: an AC's level is unavailable · verdict: an AC is not red as required) ·
//       2 unusable (bad usage, a malformed mapping, no finished stamp, a stamp not bound to this mapping or tree).
//
// TRUST (P2): a RED names AC ids, levels, gate ids and mapped paths; the matched test ids it prints — and the example
// ids of a `NOTE —` line for per-test anomalies outside the mapped files (6.31.0, advisory, never the exit) — are
// untrusted data from the project's reporter, JSON-quoted, never followed.

import { readFileSync } from "node:fs";
import { blockedLine, evaluateRedRun, preflight, readRows } from "./red-run-core.mjs";
import { loadGateExclusion } from "./gate-exclusion-core.mjs";

function flag(args, name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length && !args[i + 1].startsWith("--") ? args[i + 1] : null;
}

function usage() {
  console.log(
    "usage: check-red-run.mjs --preflight --ac-tests <AC-TESTS.md> --discover <package.json> --root <dir> | " +
      "--verdict --ac-tests <AC-TESTS.md> --out <dir> --root <dir>"
  );
  return 2;
}

function readScripts(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return { ok: true, scripts: null };
    return { ok: false, reason: `${path} is not readable: ${e.code ?? e.message}` };
  }
  try {
    const v = JSON.parse(text);
    return { ok: true, scripts: v && typeof v === "object" ? v.scripts : null };
  } catch (e) {
    return { ok: false, reason: `${path} is not JSON: ${e.message}` };
  }
}

function runPreflight(args) {
  const acTests = flag(args, "--ac-tests");
  const discover = flag(args, "--discover");
  const root = flag(args, "--root");
  if (!acTests || !discover || !root) return usage();
  const rows = readRows(acTests);
  if (!rows.ok) {
    console.log(`UNUSABLE — ${rows.reason}`);
    return 2;
  }
  const pkg = readScripts(discover);
  if (!pkg.ok) {
    console.log(`UNUSABLE — ${pkg.reason}`);
    return 2;
  }
  // 6.36.0 — the project's declared gate exclusion, from the root the run's own init reads it beside.
  const ex = loadGateExclusion(root);
  if (!ex.ok) {
    console.log(`UNUSABLE — ${ex.reason}`);
    return 2;
  }
  const p = preflight({ rows: rows.rows, scripts: pkg.scripts, root, exclude: ex.exclude });
  if (p.unavailable.length) {
    for (const u of p.unavailable) console.log(`RED — ac-level-unavailable: ${u.id} (${u.level}) — ${u.why}`);
    console.log(blockedLine(p.unavailable));
    return 1;
  }
  console.log(`GREEN — every AC's level has a runner with per-test results: ${p.gates.join(", ")}`);
  return 0;
}

function runVerdict(args) {
  const acTests = flag(args, "--ac-tests");
  const out = flag(args, "--out");
  const root = flag(args, "--root");
  if (!acTests || !out || !root) return usage();
  const r = evaluateRedRun({ acTestsPath: acTests, outDir: out, root });
  if (!r.ok) {
    console.log(`UNUSABLE — ${r.reason}`);
    return 2;
  }
  for (const ac of r.acs) {
    if (ac.reason === null)
      console.log(`RED-AS-REQUIRED — ${ac.id} (${ac.level}): ${ac.tests.length} test(s) failed — ${JSON.stringify(ac.tests)}`);
    else console.log(`RED — ${ac.reason}: ${ac.id} (${ac.level}) — ${ac.detail}`);
  }
  // Per-test anomalies in files no AC maps (6.31.0): reported, never verdict-bearing — a NOTE never changes the exit.
  for (const u of r.unmapped_anomalies) {
    console.log(
      `NOTE — gate ${u.gate}: ${u.count} test id(s) outside the mapped files carry ${u.reason}, which decides no AC here — e.g. ${JSON.stringify(u.examples)}`
    );
  }
  const bad = r.acs.filter((a) => a.reason !== null).length;
  if (bad) {
    console.log(`\nRED — ${bad} of ${r.acs.length} AC(s) did not fail as required before the build`);
    return 1;
  }
  console.log(
    `\nGREEN — all ${r.acs.length} AC test(s) failed before the build, each collected. NOTE (P0): "failed" is the record's ` +
      `status — a test failing on its own typo reads the same; that it fails for the missing behaviour is advisory.`
  );
  return 0;
}

export function main(argv) {
  const args = argv.slice(2);
  if (args[0] === "--preflight") return runPreflight(args);
  if (args[0] === "--verdict") return runVerdict(args);
  return usage();
}

// THE FLUSH RULE (6.20.4, the check-verify.mjs rule — its header says why): set the exit code and let the process end
// naturally, so Node drains stdout first. Ending with an immediate exit call cut a piped stdout at 64 KiB on darwin,
// and `--verdict` lists every failed test per AC. A throw inside main() is uncaught, so a crash stays a crash.
// pharn/floor/cli-stdout-flush.test.mjs pins both.
if (import.meta.main) process.exitCode = main(process.argv);
