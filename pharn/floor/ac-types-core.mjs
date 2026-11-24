// pharn/floor/ac-types-core.mjs — the PURE rules of /pharn-test's typecheck check (CORE-347). No I/O, no spawning:
// check-ac-types.mjs reads the disk, runs the gates and reads their logs (P3 — this file changes when the RULE changes,
// that one when the storage or the process handling does).
//
// ============================== WHY THIS EXISTS (P7 — the recorded failure) ==============================
// CORE-311 run 2 (an installed project, 7.22.0): /pharn-test wrote and pinned an AC test file; vitest does not type-check,
// so the red run and the lock passed. After the build, /pharn-regress and /pharn-verify reported `typecheck` red —
// `TS2741 Property 'NODE_ENV' is missing in type '{}'` — located in that pinned file. The build may not edit it (outside
// PLAN.md `## Files`, pinned by AC-TESTS.lock.json), so every iteration failed the same way until the cap. The error was
// made at the test stage and was detectable there; this module decides, before Step 4 pins the tests, whether the
// project's typecheck gate reports an error the test stage must fix in its own files (lessons-learned L83: surface a
// later refusal at the earliest stage that pins the input it refuses).
//
// ============================== THE GATE SET (`typeGates`) ==============================
// TYPE_SET (`typecheck`, `type-check` — both gate-run-core.mjs ALLOWLIST members, a test pins it) ∩ the package.json
// scripts (`discoverGates`, own-property keys only), minus the project's `gates.exclude`, in TYPE_SET order. Each runs as
// `npm run <id>`. Membership only (P5): no script's command text is read.
//
// ============================== WHAT IS ATTRIBUTED (`parseTscLines`) ==============================
// A whole-project typecheck can be red for reasons outside the AC tests, and is LEGITIMATELY red before the build when
// a test imports a target the build has not written yet (L11). So the verdict is never "is typecheck red". Only a
// diagnostic LOCATED in a mapped AC test file can refuse, read from the gate's output by ONE anchored rule per form —
// the two forms `tsc` prints (measured on tsc 6.0.3, pharn/floor/test-fixtures/typecheck/):
//   plain  (a piped run, what `npm run` gives):  `<path>(<line>,<col>): error TS<code>: <message>`
//   pretty (`--pretty`, ANSI colours stripped):  `<path>:<line>:<col> - error TS<code>: <message>`
// at the START of a line. Pretty's related-information lines are indented and never match. Only (path, line, col, code)
// is taken; the message is never kept, printed or interpreted.
//
// ============================== THE VERDICT RULE (`typesVerdict`) ==============================
// Per gate, in TYPE_SET order:
//   • exit 0 → nothing;
//   • NOT MEASURED (`ac-style-core.mjs measured`: timed out, or 126/127) → a NOTE, never a refusal. The error this
//     check exists for may then still reach the post-build gates; the NOTE says so;
//   • measured non-zero → each parsed diagnostic is
//       – in a mapped file, code ∉ MISSING_TARGET_CODES → RED `ac-tests-typecheck`;
//       – in a mapped file, code ∈ MISSING_TARGET_CODES → a NOTE (expected before the build; not refused);
//       – anywhere else → counted into one NOTE, "not attributed to the AC tests";
//     and a measured non-zero gate with NO parsed diagnostic is a NOTE too — never GREEN by silence (L34).
// status `red` iff at least one RED. An empty gate set is `green` with `empty: true`, printed as its own line.
// "In a mapped file": the diagnostic's path (relative to the invoking directory, or absolute) resolves to a mapped
// test file, compared CASE-FOLDED — the fold check-ac-tests.mjs uses. On a case-sensitive filesystem that attributes an
// error in `A.test.ts` to a mapped `a.test.ts`: the fold errs toward refusing, never toward passing.
//
// ============================== MISSING_TARGET_CODES — the bound, both directions (P0) ==============================
// The set is a CLOSED LIST of diagnostics whose text says a name, module, export, member, argument count or object
// property does not exist (yet) — the shapes a red-first test produces against a target the build has not written or
// not extended yet. It is set membership, NOT a judgment of cause, and it is wrong in both directions:
//   • A legitimate test-first test IS refused when it raises a code outside the set — e.g. TS2322/TS2345 passing a
//     value only the built target will accept (a new union member). The stage's remedy is to rewrite its own test in
//     its one fix attempt (type the value through the target's parameter type, or a narrow cast); otherwise the stage
//     refuses `ac-tests-typecheck` and a person decides. Chosen deliberately (CORE-347 GATE 1): a false refusal lands
//     at the test stage, which can still edit its file; a miss lands after the build, where nothing may edit it.
//   • A test-own error whose code IS in the set passes unrefused — TS2339 in particular (a property read on a wrongly
//     typed mock) — and reaches the post-build gates exactly as before this check.
//
// ============================== WHAT IT DOES NOT CLAIM (P0) ==============================
//   • That /pharn-test ran it. The call is /pharn-test's Step 3c — advisory orchestration. check-test-stage.mjs READY
//     does not depend on it, so a run that skips the step is not caught later.
//   • That every type error is seen. Only the two tsc forms at line start are parsed (tsc, vue-tsc). A line a monorepo
//     runner prefixes (`web:typecheck: …` — the prefix becomes part of the path, which then names no mapped file),
//     another checker's format, or paths relative to another directory are "not attributed" NOTEs — this check then
//     changes nothing, and the post-build gates judge as before.
//   • That the tsconfig covers the tests. A typecheck that does not include the AC test files reports nothing about
//     them here — nor after the build.
//   • That the gate only reads. A typecheck script that emits files runs here before the reconcile anchor, unhooked and
//     unreconciled — the style check's exposure (ac-style-core.mjs).
//   • Provenance (L43). The logs live under `pharn/.run/`, which Bash reaches; a forged log passes.
//
// TRUST (P2): gate output is UNTRUSTED free text (it quotes source code). Only the anchored captures — a path, two
// integers and a `TS<digits>` code — leave the parser, and they reach only `resolve`, a string compare and set
// membership. A value quoted into a line goes through quote-core.mjs `shown()`, which cannot throw (L62).

import { isAbsolute, resolve } from "node:path";
import { discoverGates } from "./gate-run-core.mjs";
import { measured } from "./ac-style-core.mjs";
import { shown } from "./quote-core.mjs";

/** The typecheck gate ids, in run order (each an ALLOWLIST member — pinned by a test). */
export const TYPE_SET = Object.freeze(["typecheck", "type-check"]);
/** The exit table. */
export const EXIT = Object.freeze({ green: 0, red: 1, unusable: 2 });
/** The one scratch directory, relative to the invoking directory. Each run recreates it. */
export const TYPES_DIR = "pharn/.run/pharn-test/types";
/** How many RED diagnostics are printed one per line; the rest are counted. */
export const MAX_RED_LINES = 20;

/** The closed exempt set (see the header — set membership, never a judgment of cause). One entry per code. */
export const MISSING_TARGET_CODES = Object.freeze([
  "TS2304", // Cannot find name 'X'.
  "TS2305", // Module 'X' has no exported member 'Y'.
  "TS2306", // File 'X' is not a module.
  "TS2307", // Cannot find module 'X' or its corresponding type declarations.
  "TS2339", // Property 'X' does not exist on type 'Y'.
  "TS2353", // Object literal may only specify known properties, and 'X' does not exist in type 'Y'.
  "TS2459", // Module 'X' declares 'Y' locally, but it is not exported.
  "TS2460", // Module 'X' declares 'Y' locally, but it is exported as 'Z'.
  "TS2551", // Property 'X' does not exist on type 'Y'. Did you mean 'Z'?
  "TS2552", // Cannot find name 'X'. Did you mean 'Y'?
  "TS2554", // Expected N arguments, but got M.
  "TS2555", // Expected at least N arguments, but got M.
  "TS2561", // Object literal may only specify known properties, but 'X' does not exist in type 'Y'. Did you mean …?
  "TS2613", // Module 'X' has no default export.
  "TS2614", // Module 'X' has no exported member 'Y'. Did you mean to use 'import Y from …' instead?
  "TS2694", // Namespace 'X' has no exported member 'Y'.
  "TS2724", // 'X' has no exported member named 'Y'. Did you mean 'Z'?
]);

/** TYPE_SET ∩ package.json scripts − exclusion, in TYPE_SET order, as runner entries (`npm run <id>`). */
export function typeGates(scripts, exclude = []) {
  const ex = Array.isArray(exclude) ? exclude : [];
  return discoverGates(scripts).filter((e) => TYPE_SET.includes(e.id) && !ex.includes(e.id));
}

/** A log's file name stem for a gate: `type-check` (`:` is not kept in a file name). */
export function logStem(id) {
  return String(id).replace(/[^A-Za-z0-9-]/g, "-");
}

// ANSI CSI sequences (colours) — stripped before matching; pretty output colours the path and the code.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[0-9;]*[A-Za-z]/g;
// The two anchored forms. The path is lazy and may hold spaces; `\d+` bounds and anchors keep both linear.
const PLAIN_RE = /^(\S(?:.*?\S)?)\((\d+),(\d+)\): error (TS\d+): /;
const PRETTY_RE = /^(\S(?:.*?\S)?):(\d+):(\d+) - error (TS\d+): /;

/** Every tsc diagnostic in `text`, as `{path, line, col, code}` in output order. */
export function parseTscLines(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(ANSI_RE, "");
    const m = PLAIN_RE.exec(line) || PRETTY_RE.exec(line);
    if (m) out.push({ path: m[1], line: Number(m[2]), col: Number(m[3]), code: m[4] });
  }
  return out;
}

const fold = (p) => p.toLowerCase();

/** The mapped file a diagnostic path names, or null: resolved against `root` (absolute paths as they are), compared
 *  case-folded with the resolved mapped files. Returns the mapped path as AC-TESTS.md spells it. */
export function mappedFileOf(diagPath, mappedFiles, root) {
  const want = fold(isAbsolute(diagPath) ? resolve(diagPath) : resolve(root, diagPath));
  for (const f of mappedFiles) if (fold(resolve(root, f)) === want) return f;
  return null;
}

/** The verdict over the runs. `runs` is `[{id, exit, timed_out, diagnostics}]` (diagnostics from parseTscLines over
 *  the gate's .out + .err; ignored unless the gate is measured non-zero). */
export function typesVerdict(runs, mappedFiles, root) {
  const red = [];
  const notes = [];
  for (const r of runs) {
    if (!measured(r)) {
      notes.push({ id: r.id, kind: "not-measured", cause: r.timed_out ? "timed-out" : "not-started" });
      continue;
    }
    if (r.exit === 0) continue;
    const exempt = [];
    let elsewhere = 0;
    for (const d of r.diagnostics) {
      const file = mappedFileOf(d.path, mappedFiles, root);
      if (file === null) elsewhere++;
      else if (MISSING_TARGET_CODES.includes(d.code)) exempt.push({ ...d, file });
      else red.push({ id: r.id, ...d, file });
    }
    if (exempt.length) notes.push({ id: r.id, kind: "missing-target", diagnostics: exempt });
    if (elsewhere) notes.push({ id: r.id, kind: "elsewhere", count: elsewhere, exit: r.exit });
    if (r.diagnostics.length === 0) notes.push({ id: r.id, kind: "unparsed", exit: r.exit });
  }
  return { status: red.length ? "red" : "green", empty: runs.length === 0, red, notes };
}

/** The printed lines of a verdict. `logOf(id)` names the gate's log paths (untrusted DATA for the reader). */
export function verdictLines(v, logOf) {
  const out = [];
  const at = (d) => `${shown(d.file)}(${d.line},${d.col}) ${d.code}`;
  for (const d of v.red.slice(0, MAX_RED_LINES)) {
    out.push(`RED — ac-tests-typecheck: ${d.id} — ${at(d)} in a mapped AC test file; log: ${logOf(d.id)}`);
  }
  if (v.red.length > MAX_RED_LINES) out.push(`RED — ac-tests-typecheck: and ${v.red.length - MAX_RED_LINES} more; read the logs`);
  for (const n of v.notes) {
    if (n.kind === "not-measured") {
      out.push(
        `NOTE — ${n.id} was not measured (${n.cause}); not judged here — a type error in the AC tests may still reach the post-build gates`
      );
    } else if (n.kind === "missing-target") {
      out.push(
        `NOTE — ${n.id}: ${n.diagnostics.map(at).join(", ")} — missing-target codes, expected before the build; not refused here, the build must resolve them and /pharn-verify measures typecheck again`
      );
    } else if (n.kind === "elsewhere") {
      out.push(
        `NOTE — ${n.id} exit ${n.exit}: ${n.count} diagnostic(s) outside the AC test files; not attributed to them; log: ${logOf(n.id)}`
      );
    } else {
      out.push(`NOTE — ${n.id} exit ${n.exit} with no line in tsc's format; not attributed to the AC tests; log: ${logOf(n.id)}`);
    }
  }
  if (v.status === "red") out.push(`RED — ${v.red.length} type error(s) located in the AC test files: do not pin them`);
  else if (v.empty) out.push(`GREEN — no typecheck gate (${TYPE_SET.join(", ")}) is discovered here; nothing to check`);
  else out.push("GREEN — no type error outside the missing-target codes is located in the AC test files");
  return out;
}
