#!/usr/bin/env node
// pharn/floor/check-ac-style.mjs — /pharn-test's style check (ac-tests-style-gate, issue #409): the EXECUTION half.
// The rules (the gate set, the record shape, the verdict, the printed lines) are ac-style-core.mjs; why the check
// exists and what it does not claim is that module's header (P4 — cited, not restated).
//
//   node pharn/floor/check-ac-style.mjs --before <name> --timeout-ms <N>   (/pharn-test Step 2c, before Step 3)
//   node pharn/floor/check-ac-style.mjs --after <name> --timeout-ms <N>    (/pharn-test Step 3b, after Step 3)
//
// WHAT IT DOES, in order:
//   1. argv: exactly one of `--before` / `--after`, each with a FEATURE_SLUG_RE `<name>`; `--timeout-ms` REQUIRED, per
//      gate, with no default (L41). Anything else is exit 2.
//   2. inputs: `pharn/features/<name>/AC-TESTS.md`'s mapping (ac-tests-core.mjs acRowsOf — the mapped test files),
//      `package.json`'s scripts and `pharn.config.json`'s `gates.exclude` in the invoking directory. Each unusable → 2.
//   3. containment: `pharn/.run/pharn-test/style/` is walked from the invoking directory first (lstat; a symlink at any
//      component refuses — L54).
//   4. `--before`: recreates that directory, records whether any mapped test file exists (lstat), runs each style
//      gate once, writes `before.json`, prints one RECORDED line. Exit 0, or 2.
//      `--after`: reads `before.json` (it must be this feature's, with the same gate set — checked before any gate
//      runs), runs each gate, writes `after.json`, prints the verdict lines. Exit 0 GREEN, 1 RED, 2 UNUSABLE.
//   5. each gate runs through run-gates.mjs `spawnGate` (its own process group, SIGTERM→SIGKILL at `--timeout-ms`,
//      stdout/stderr to `<phase>-<id>.out` / `.err` by fd, never read here), one after another, from the invoking
//      directory. No results variable is set; `CI=1` is never added (no style id is a test gate).
//
// EXIT: 0 recorded / GREEN · 1 RED · 2 UNUSABLE. A crash exits 2 too (a stack on stderr, no verdict line), so it can
// only stop the stage, never pass it; a RED is always printed with its `RED — ` lines.
//
// WRITES: only under `pharn/.run/pharn-test/style/` (git-ignored scratch), through `fs` in a Bash-run script, outside
// the PreToolUse guards (L19). The gates themselves run whatever the project's scripts do (ac-style-core.mjs, header).
//
// TRUST (P2): mapped paths reach only an lstat; package.json contributes only its script KEYS; gate output is never
// read. Values quoted into a reason go through `shown()`.

import "./runtime-floor.mjs";
import { lstatSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { acRowsOf } from "./ac-tests-core.mjs";
import { loadGateExclusion } from "./gate-exclusion-core.mjs";
import { spawnGate } from "./run-gates.mjs";
import { atomicWrite, containmentWalk, flag, has, parseTimeoutMs, scanFlags } from "./stage-runtime.mjs";
import { shown } from "./quote-core.mjs";
import { EXIT, STYLE_DIR, logStem, makeRecord, recordError, styleGates, styleVerdict, verdictLines } from "./ac-style-core.mjs";

const FEATURE_BASE = "pharn/features";
const KNOWN = new Set(["--before", "--after", "--timeout-ms"]);
const VALUE_FLAGS = new Set(["--before", "--after", "--timeout-ms"]);

const DONE = Symbol("check-ac-style-done");
/** End the run: print, set the exit code, unwind (never process.exit, which can drop stdout). */
function finish(code, lines) {
  const text = Array.isArray(lines) ? lines.join("\n") : lines;
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
  process.exitCode = code;
  throw DONE;
}
function unusable(detail) {
  finish(EXIT.unusable, `UNUSABLE — ${detail}\nThe style check gave no verdict: stop (pharn-test.md, \`style-check-unusable\`).`);
}

function parseArgs(args) {
  const scan = scanFlags(args, KNOWN, VALUE_FLAGS);
  if (!scan.ok) unusable(scan.detail);
  const modes = ["--before", "--after"].filter((m) => has(args, m));
  if (modes.length !== 1) unusable("exactly one of --before <name> or --after <name> is required");
  const phase = modes[0].slice(2);
  for (const m of KNOWN) if (args.filter((a) => a === m).length > 1) unusable(`${m} is given twice`);
  const name = flag(args, modes[0]);
  if (typeof name !== "string" || !FEATURE_SLUG_RE.test(name))
    unusable(`${modes[0]} needs a feature slug matching ${FEATURE_SLUG_RE}, got ${shown(name)}`);
  const t = parseTimeoutMs(args);
  if (!t.ok) unusable(t.detail);
  return { phase, name, timeoutMs: t.value };
}

function readText(rel) {
  try {
    return { ok: true, text: readFileSync(rel, "utf8") };
  } catch (e) {
    return { ok: false, reason: e && e.code ? e.code : "error" };
  }
}

function exists(rel) {
  try {
    lstatSync(rel);
    return true;
  } catch (e) {
    if (e && e.code === "ENOENT") return false;
    unusable(`cannot lstat the mapped test file ${shown(rel)}: ${e && e.code ? e.code : "error"}`);
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
  return { files, gates: styleGates(scripts, ex.exclude) };
}

function contain() {
  const root = resolve(".");
  const walk = containmentWalk(root, resolve(STYLE_DIR));
  if (!walk.ok) unusable(`${STYLE_DIR} ${walk.reason}`);
}

async function runAll(phase, gates, timeoutMs) {
  const runs = [];
  for (const g of gates) {
    const stem = join(STYLE_DIR, logStem(phase, g.id));
    const r = await spawnGate(g, ".", `${stem}.out`, `${stem}.err`, null, timeoutMs);
    if (r.spawnError) unusable(`the ${g.id} gate could not be run: ${shown(r.spawnError)}`);
    runs.push({ id: g.id, exit: r.exit, timed_out: r.timed_out === true });
  }
  return runs;
}

const logOf = (id) => `${join(STYLE_DIR, logStem("after", id))}.out (and .err)`;

async function main(argv) {
  const { phase, name, timeoutMs } = parseArgs(argv.slice(2));
  const { files, gates } = inputs(name);
  contain();
  const recPath = (p) => join(STYLE_DIR, `${p}.json`);

  if (phase === "before") {
    rmSync(STYLE_DIR, { recursive: true, force: true });
    mkdirSync(STYLE_DIR, { recursive: true });
    const testsExisted = files.some((f) => exists(f));
    const runs = await runAll("before", gates, timeoutMs);
    const rec = makeRecord({ phase: "before", feature: name, testsExisted, runs });
    atomicWrite(STYLE_DIR, recPath("before"), `${JSON.stringify(rec, null, 2)}\n`);
    const shownRuns = runs.length
      ? runs.map((r) => `${r.id} exit ${r.exit}${r.timed_out ? " (timed out)" : ""}`).join(", ")
      : "no style gate is discovered here";
    finish(
      EXIT.green,
      `RECORDED — before the AC tests are written: ${shownRuns}; mapped test files existed: ${testsExisted ? "yes" : "no"}`
    );
  }

  const raw = readText(recPath("before"));
  if (!raw.ok) unusable(`no ${recPath("before")} (${raw.reason}) — run --before ${name} before writing the tests`);
  let before;
  try {
    before = JSON.parse(raw.text);
  } catch (e) {
    unusable(`${recPath("before")} is not valid JSON (${e.message})`);
  }
  const bad = recordError(before, { phase: "before", feature: name });
  if (bad) unusable(`${recPath("before")} ${bad}`);
  const wantIds = gates.map((g) => g.id).join(",");
  const hadIds = before.gates.map((g) => g.id).join(",");
  if (wantIds !== hadIds) unusable(`the style gates differ from the --before run (before: ${hadIds || "none"}; now: ${wantIds || "none"})`);
  mkdirSync(STYLE_DIR, { recursive: true });
  const runs = await runAll("after", gates, timeoutMs);
  const after = makeRecord({ phase: "after", feature: name, testsExisted: files.some((f) => exists(f)), runs });
  atomicWrite(STYLE_DIR, recPath("after"), `${JSON.stringify(after, null, 2)}\n`);
  const v = styleVerdict(before, after);
  if (v.status === "unusable") unusable(v.reason);
  finish(v.status === "red" ? EXIT.red : EXIT.green, verdictLines(v, logOf));
}

if (import.meta.main) {
  main(process.argv).catch((e) => {
    if (e === DONE) return;
    console.error(`check-ac-style: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 2;
  });
}
