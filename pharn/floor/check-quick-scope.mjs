#!/usr/bin/env node
// pharn/floor/check-quick-scope.mjs — the CLI of the SCOPE CHECK the two quick modes keep (6.28.0, loop-quick-mode GATE 2,
// review F1): `/pharn-ship --quick`'s item 7 and every `/pharn-loop --quick` iteration. The checker — what it asks, the
// recorded failure it answers, what it computes by code and what it does not do — is pharn/floor/quick-scope-core.mjs,
// whose header is its spec. This file loads that module, runs it and prints the verdict.
//
// WHY A SEPARATE ENTRY (the round-2 re-review, R2): node exits 1 when a module cannot load or a throw goes uncaught, and
// 1 is this checker's ESCAPED. While the checker imported its siblings statically, a module that failed to load — a
// scope-inputs.mjs with a syntax error, a missing one, a partial update — ended the process with exit 1 and no document,
// so both callers read a crash as a scope escape. They stopped either way, but on a false reason, and the checker's own
// claim ("a crash is caught as 2, never 1") was false. This file has NO static import, so nothing can fail before the
// `try` below. It loads the checker with import(), runs it, and maps a module that cannot load, a throw while checking,
// or a result outside the checker's contract to exit 2, `reason_code` `crashed` — inconclusive, fail-closed, never 1.
// The contract is judged on the SERIALIZED document: an exit code other than 0, 1 or 2; a document that is not an
// object; exit 0 without an empty `escaped` array; exit 1 without a non-empty one; exit 2 without `verdict`
// `"inconclusive"`. So a mismatched module can never exit 0 (read as clean), and never exit 1 without naming what
// escaped. A throw a loaded module schedules asynchronously is caught by process-level handlers: before the document is
// printed it becomes the crash document; after, the exit becomes 2 and the printed document stands (fail-closed). The
// pattern is check-loop-fresh.mjs's (6.21.1), trimmed to this checker's contract.
//
// Two facts are written HERE as well as in quick-scope-core.mjs, because this file must not load that module to read
// them: the exit codes (its EXIT) and the crash `reason_code` (a member of its REASON_CODES). A test pins both.
//
// NOT CAUGHT, stated: THIS file missing, unreadable or not parseable — node's exit 1 with no document, which both callers
// read as a stop. The pinned line names this file by a path relative to the project root, so a run from any other
// directory is exactly this case (a test pins it). Also not caught: a module that ends the process itself (none does),
// a top-level await in the graph that never settles (node exits 13), a kill by signal, and a stdout that cannot be
// written.
//
// Usage: node pharn/floor/check-quick-scope.mjs --feature <name> --base <40-hex>   (from the repo root)
// Exit: 0 clean · 1 escaped (a blocking P0 fix #7 finding per path) · 2 inconclusive, `reason_code` one of
//       usage-error | base-not-commit | path-containment | plan-unreadable | plan-files-unparseable | git-failed | crashed.

/** quick-scope-core.mjs EXIT, restated because that module cannot be imported here. Pinned by a test. */
const EXIT = Object.freeze({ clean: 0, escaped: 1, inconclusive: 2 });
/** The crash `reason_code`, a member of quick-scope-core.mjs REASON_CODES. Pinned by a test. */
const CRASHED = "crashed";

/** A thrown value's first line, total: `throw Object.create(null)` has no string form, and this path must not throw. */
function firstLineOf(e) {
  try {
    return String(e?.message ?? e).split("\n")[0];
  } catch {
    return "a thrown value with no string form";
  }
}

/** The inconclusive result for a checker that could not load, threw, or returned no verdict. Every value is a string,
 *  so serializing it cannot throw; the error's first line is bounded. The full stack goes to stderr. */
function crashed(what, e) {
  const first = firstLineOf(e);
  const doc = {
    verdict: "inconclusive",
    reason_code: CRASHED,
    reason: `${what}: ${first.length > 300 ? `${first.slice(0, 300)}…` : first} — fail-closed, this is no verdict about the scope`,
  };
  return { code: EXIT.inconclusive, text: JSON.stringify(doc, null, 2), error: e };
}

/** Is the SERIALIZED document the one this exit code needs? Checked on the parsed-back text, never on the object. */
function outsideContract(code, text) {
  if (code !== EXIT.clean && code !== EXIT.escaped && code !== EXIT.inconclusive) return `exit code ${JSON.stringify(code)}`;
  const doc = JSON.parse(text);
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return "a document that is not an object";
  const escaped = Array.isArray(doc.escaped) ? doc.escaped : null;
  if (code === EXIT.clean && (escaped === null || escaped.length !== 0)) return "exit 0 without an empty `escaped` array";
  if (code === EXIT.escaped && (escaped === null || escaped.length === 0)) return "exit 1 without a non-empty `escaped` array";
  if (code === EXIT.inconclusive && doc.verdict !== "inconclusive") return 'exit 2 without verdict "inconclusive"';
  return null;
}

async function run(args) {
  let core;
  try {
    core = await import("./quick-scope-core.mjs");
  } catch (e) {
    return crashed("the quick scope checker could not load (quick-scope-core.mjs or a module it imports)", e);
  }
  let r;
  let text;
  try {
    r = core.evaluate(args);
    text = JSON.stringify(r?.doc, null, 2);
  } catch (e) {
    return crashed("the quick scope checker threw while checking", e);
  }
  const why = typeof text === "string" ? outsideContract(r?.code, text) : "no document";
  if (why) return crashed("the quick scope checker returned no verdict", new Error(`a result outside its contract: ${why}`));
  return { code: r.code, text, error: null };
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
        /* diagnosis only — the document and the exit code are already set */
      }
    }
  };
  // A throw a loaded module schedules asynchronously lands outside run()'s `try`. Before the document is printed it is
  // the crash document; after, the printed document stands on stdout and the exit is still inconclusive (fail-closed).
  const late = (e) => {
    if (!printed) print(crashed("the quick scope checker threw asynchronously", e));
    else process.exitCode = EXIT.inconclusive;
  };
  process.on("uncaughtException", late);
  process.on("unhandledRejection", late);
  const result = await run(process.argv.slice(2));
  if (!printed) print(result);
}
