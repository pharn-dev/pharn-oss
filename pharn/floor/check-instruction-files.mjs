#!/usr/bin/env node
// pharn/floor/check-instruction-files.mjs — the CLI of the instruction-files checker (6.38.0). What it computes, the
// recorded failure it answers and its bounds are pharn/floor/instruction-files-core.mjs's header; the base and the
// threshold are pharn/floor/instruction-files.mjs's. This file loads that module, runs it and prints the document.
//
//   --report                         ADVISORY. The always-loaded instruction set of the project at the working
//                                    directory: per-file bytes, the total, an estimated token count (bytes/4, an
//                                    estimate — LIMITS.md §1c), every note, the path-scoped rules left out, and
//                                    CLAUDE.local.md listed as personal (never counted by --growth). Exit 0, or 2 when
//                                    the input is unusable.
//   --growth --base <ref>            FLOOR. The bytes ADDED to that set since <ref> (removals never offset), against
//   --growth --base-rule             `budget.instructionGrowthBytes` in pharn.config.json AT THE BASE (default 2048).
//                                    `--base-rule` is /pharn-verify's form: the gate `instruction-growth` runs it
//                                    (gate-run-core.mjs). Exit 0 within · 1 over · 2 inconclusive.
//
// Run it from the project root (the directory whose instruction files are measured; it may sit below the git top
// level, as a monorepo package does). JSON on stdout: `{schema, mode, verdict, …}`; an inconclusive document carries a
// closed `reason_code` (usage-error | git-failed | enumeration-failed | base-unresolved | base-not-commit | unreadable |
// threshold-malformed | submodule-changed | crashed).
//
// WHY A SEPARATE ENTRY — check-quick-scope.mjs's pattern (its header has the full reasoning; 6.21.1's check-loop-fresh.mjs
// before it): node exits 1 when a module cannot load or a throw goes uncaught, and 1 is this checker's OVER. This file
// has NO static import, loads the checker with import(), and maps a module that cannot load, a throw while checking, or a
// result outside the checker's contract to exit 2 `crashed` — inconclusive, never 1 and never 0. The contract is judged
// on the SERIALIZED document: exit 0 needs verdict `reported` or `within`, exit 1 `over`, exit 2 `inconclusive`.
// NOT CAUGHT: this file itself missing or unparseable (node's exit 1, no document) — /pharn-verify reads any non-zero
// exit as a failing gate, so that case is a FAIL too, never a pass.

/** instruction-files-core.mjs EXIT, restated because that module cannot be imported here. Pinned by a test. */
const EXIT = Object.freeze({ ok: 0, over: 1, inconclusive: 2 });
/** The crash `reason_code`, a member of instruction-files-core.mjs REASON_CODES. Pinned by a test. */
const CRASHED = "crashed";

export function firstLineOf(e) {
  try {
    return String(e?.message ?? e).split("\n")[0];
  } catch {
    return "a thrown value with no string form";
  }
}

export function crashed(what, e) {
  const first = firstLineOf(e);
  const doc = {
    verdict: "inconclusive",
    reason_code: CRASHED,
    reason: `${what}: ${first.length > 300 ? `${first.slice(0, 300)}…` : first} — fail-closed, this is no verdict about the instruction files`,
  };
  return { code: EXIT.inconclusive, text: JSON.stringify(doc, null, 2), error: e };
}

export function outsideContract(code, text) {
  if (code !== EXIT.ok && code !== EXIT.over && code !== EXIT.inconclusive) return `exit code ${JSON.stringify(code)}`;
  const doc = JSON.parse(text);
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return "a document that is not an object";
  const want = { [EXIT.ok]: ["reported", "within"], [EXIT.over]: ["over"], [EXIT.inconclusive]: ["inconclusive"] }[code];
  if (!want.includes(doc.verdict)) return `exit ${code} with verdict ${JSON.stringify(doc.verdict)}`;
  return null;
}

/** `load` exists so a test can hand in a module that fails each way in-process; the CLI below never passes it. */
export async function run(args, load = () => import("./instruction-files.mjs")) {
  let mod;
  try {
    await import("./runtime-floor.mjs");
    mod = await load();
  } catch (e) {
    return crashed("the instruction-files checker could not load (instruction-files.mjs or a module it imports)", e);
  }
  let r;
  let text;
  try {
    r = mod.evaluate(args);
    text = JSON.stringify(r?.doc, null, 2);
  } catch (e) {
    return crashed("the instruction-files checker threw while checking", e);
  }
  const why = typeof text === "string" ? outsideContract(r?.code, text) : "no document";
  if (why) return crashed("the instruction-files checker returned no verdict", new Error(`a result outside its contract: ${why}`));
  return { code: r.code, text, error: null };
}

// Runtime floor (6.50.0), inline because this file takes no static import (see the header): without `import.meta.main`
// the block below never runs and the process would exit 0 having checked nothing. The version half is runtime-floor.mjs,
// loaded inside run()'s `try`. The sentence is runtime-floor.mjs REFUSAL_TAIL, pinned by .dev/floor/entry-point-guard.test.mjs.
if (typeof import.meta.main !== "boolean") {
  process.stderr.write(
    `PHARN floor: refusing to run on Node ${process.versions.node}. The PHARN floor checkers need Node >= 24.2.0: each gates its CLI on import.meta.main, and on an older Node a checker exits 0 having checked nothing. Upgrade Node, then re-run.\n`
  );
  process.exit(2);
}
if (import.meta.main) {
  let printed = false;
  const print = ({ code, text, error }) => {
    printed = true;
    process.exitCode = code;
    console.log(text);
    if (error) {
      try {
        console.error(error?.stack ?? firstLineOf(error));
      } catch {
        /* diagnosis only */
      }
    }
  };
  const late = (e) => {
    if (!printed) print(crashed("the instruction-files checker threw asynchronously", e));
    else process.exitCode = EXIT.inconclusive;
  };
  process.on("uncaughtException", late);
  process.on("unhandledRejection", late);
  const result = await run(process.argv.slice(2));
  if (!printed) print(result);
}
