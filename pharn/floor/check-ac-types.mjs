#!/usr/bin/env node
// pharn/floor/check-ac-types.mjs — /pharn-test's typecheck check (CORE-347): the EXECUTION half. The rules (the gate
// set, the line parser, the exempt codes, the verdict, the printed lines) are ac-types-core.mjs; why the check exists
// and what it does not claim is that module's header (P4 — cited, not restated).
//
//   node pharn/floor/check-ac-types.mjs <name> --timeout-ms <N>   (/pharn-test Step 3c, after Step 3b, before Step 4)
//
// WHAT IT DOES, in order:
//   1. argv: one FEATURE_SLUG_RE `<name>` first; `--timeout-ms` REQUIRED, per gate, with no default (L41). Anything else is
//      exit 2.
//   2. inputs: `pharn/features/<name>/AC-TESTS.md`'s mapping (ac-tests-core.mjs acRowsOf — the mapped test files),
//      `package.json`'s scripts and `pharn.config.json`'s `gates.exclude` in the invoking directory. Each unusable → 2.
//   3. containment: `pharn/.run/pharn-test/types/` is walked from the invoking directory first (lstat; a symlink at any
//      component refuses — L54), then recreated.
//   4. each typecheck gate runs once through run-gates.mjs `spawnGate` (its own process group, SIGTERM→SIGKILL at
//      `--timeout-ms`, stdout/stderr to `<id>.out` / `.err` by fd), one after another, from the invoking directory. No
//      results variable is set; `CI=1` is never added (no typecheck id is a test gate).
//   5. for a gate MEASURED non-zero, both logs are read and parsed (ac-types-core.mjs parseTscLines); a log that cannot
//      be read is exit 2 — never a GREEN with nothing attributed. Then the verdict lines are printed.
//
// EXIT: 0 GREEN · 1 RED · 2 UNUSABLE. A crash exits 2 too (a stack on stderr, no verdict line), so it can only stop the
// stage, never pass it; a RED is always printed with its `RED — ` lines.
//
// WRITES: only under `pharn/.run/pharn-test/types/` (git-ignored scratch), through `fs` and the spawned gates' log fds,
// outside the PreToolUse guards (L19). The gates themselves run whatever the project's scripts do.
//
// TRUST (P2): mapped paths reach only `resolve` and a string compare; package.json contributes only its script KEYS;
// gate output is untrusted and only the parser's anchored captures leave it. Values quoted into a reason go through
// `shown()`.

import "./runtime-floor.mjs";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { acRowsOf } from "./ac-tests-core.mjs";
import { loadGateExclusion } from "./gate-exclusion-core.mjs";
import { spawnGate } from "./run-gates.mjs";
import { measured } from "./ac-style-core.mjs";
import { containmentWalk, parseTimeoutMs, scanFlags } from "./stage-runtime.mjs";
import { shown } from "./quote-core.mjs";
import { EXIT, TYPES_DIR, logStem, parseTscLines, typeGates, typesVerdict, verdictLines } from "./ac-types-core.mjs";

const FEATURE_BASE = "pharn/features";
const KNOWN = new Set(["--timeout-ms"]);
const VALUE_FLAGS = new Set(["--timeout-ms"]);

const DONE = Symbol("check-ac-types-done");
/** End the run: print, set the exit code, unwind (never process.exit, which can drop stdout). */
function finish(code, lines) {
  const text = Array.isArray(lines) ? lines.join("\n") : lines;
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
  process.exitCode = code;
  throw DONE;
}
function unusable(detail) {
  finish(EXIT.unusable, `UNUSABLE — ${detail}\nThe typecheck check gave no verdict: stop (pharn-test.md, \`typecheck-check-unusable\`).`);
}

/** `<name>` first, then the flags. */
function parseArgs(args) {
  const name = args[0];
  if (typeof name !== "string" || name.startsWith("--")) unusable("the feature <name> is required as the first argument");
  if (!FEATURE_SLUG_RE.test(name)) unusable(`<name> must be a feature slug matching ${FEATURE_SLUG_RE}, got ${shown(name)}`);
  const rest = args.slice(1);
  const scan = scanFlags(rest, KNOWN, VALUE_FLAGS);
  if (!scan.ok) unusable(scan.detail);
  if (rest.filter((a) => a === "--timeout-ms").length > 1) unusable("--timeout-ms is given twice");
  const t = parseTimeoutMs(rest);
  if (!t.ok) unusable(t.detail);
  return { name, timeoutMs: t.value };
}

function readText(rel) {
  try {
    return { ok: true, text: readFileSync(rel, "utf8") };
  } catch (e) {
    return { ok: false, reason: e && e.code ? e.code : "error" };
  }
}

function inputs(name) {
  const acPath = `${FEATURE_BASE}/${name}/AC-TESTS.md`;
  const ac = readText(acPath);
  if (!ac.ok) unusable(`cannot read ${acPath} (${ac.reason})`);
  const rows = acRowsOf(ac.text);
  if (!rows.ok) unusable(`${acPath}: ${rows.reason}`);
  const files = [...new Set(rows.rows.map((r) => r.file))];
  const pkg = readText("package.json");
  if (!pkg.ok) unusable(`cannot read package.json (${pkg.reason})`);
  let manifest;
  try {
    manifest = JSON.parse(pkg.text);
  } catch (e) {
    unusable(`package.json is not valid JSON (${e.message})`);
  }
  const scripts = manifest !== null && typeof manifest === "object" && !Array.isArray(manifest) ? manifest.scripts : null;
  const ex = loadGateExclusion(".");
  if (!ex.ok) unusable(ex.reason);
  return { files, gates: typeGates(scripts, ex.exclude) };
}

const logOf = (id) => `${join(TYPES_DIR, logStem(id))}.out (and .err)`;

async function main(argv) {
  const { name, timeoutMs } = parseArgs(argv.slice(2));
  const { files, gates } = inputs(name);
  const walk = containmentWalk(resolve("."), resolve(TYPES_DIR));
  if (!walk.ok) unusable(`${TYPES_DIR} ${walk.reason}`);
  rmSync(TYPES_DIR, { recursive: true, force: true });
  mkdirSync(TYPES_DIR, { recursive: true });

  const runs = [];
  for (const g of gates) {
    const stem = join(TYPES_DIR, logStem(g.id));
    const r = await spawnGate(g, ".", `${stem}.out`, `${stem}.err`, null, timeoutMs);
    if (r.spawnError) unusable(`the ${g.id} gate could not be run: ${shown(r.spawnError)}`);
    const run = { id: g.id, exit: r.exit, timed_out: r.timed_out === true, diagnostics: [] };
    if (measured(run) && run.exit !== 0) {
      for (const ext of [".out", ".err"]) {
        const log = readText(`${stem}${ext}`);
        if (!log.ok) unusable(`cannot read the ${g.id} log ${shown(`${stem}${ext}`)} (${log.reason}) after a red exit`);
        run.diagnostics.push(...parseTscLines(log.text));
      }
    }
    runs.push(run);
  }
  const v = typesVerdict(runs, files, resolve("."));
  finish(v.status === "red" ? EXIT.red : EXIT.green, verdictLines(v, logOf));
}

if (import.meta.main) {
  main(process.argv).catch((e) => {
    if (e === DONE) return;
    console.error(`check-ac-types: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 2;
  });
}
