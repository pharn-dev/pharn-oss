#!/usr/bin/env node
// pharn/floor/check-loop-fresh.mjs — the CLI of the FRESHNESS check /pharn-loop reads before its stop decision and
// again at its commit gate. The checker — the checks A–J, what they certify, and every bound — is
// loop-fresh-core.mjs, whose header is its spec. This file loads that module, runs it and prints the verdict.
//
// WHY A SEPARATE ENTRY (6.21.1 — the follow-up 6.20.6 named `loop-fresh-load-crash`): node exits 1 when a module
// cannot load or a throw goes uncaught, and 1 is this checker's RERUN. While the checker imported its siblings
// statically, a module that failed to load (a partial update, a test-infra-core.mjs that throws) ended the process
// with exit 1 and an EMPTY stdout, so /pharn-loop's exit-1 branch had no `stage_to_rerun` to read. An uncaught throw
// while checking did the same: a `.pharn` that is a regular file makes the budget ledger's mkdir throw
// (.dev/features/crash-routing/PLAN.md records both, reproduced). This file has NO static import, so nothing can fail
// before the `try` below. It loads the checker with import(), runs it, and maps a failure of either to INCONCLUSIVE —
// `reason_code` `checker-crashed`, exit 2 — which is fail-closed (/pharn-loop S11) and never a re-run. A result
// outside the checker's contract is mapped the same way, judged on the SERIALIZED document this file prints (JSON drops
// an undefined key): an exit code outside EXIT_CODES, a document without exactly the checker's keys, a verdict that is
// not its exit code's, or a RERUN naming no stage. So a mismatched module can never exit 0 (read as FRESH), and never
// exit 1 without a document naming the stage to re-run. A throw a module schedules asynchronously is caught by
// process-level handlers: before the document is printed it becomes the crash document; after, the exit becomes 2 and
// the printed document stands (the two then disagree, fail-closed). The crash `reason` shortens machine paths (the
// working directory → `.`, the home directory → `~`, any other absolute path → `…/<basename>`), because /pharn-loop
// copies this document into a committed record; the full stack goes to stderr.
//
// Three facts are written HERE as well as in loop-fresh-core.mjs, because this file must not load that module to read
// them: the exit codes (its EXIT), the verdict token of each, and the document's keys (its `result()`). A test pins
// all three against the core (L35: the second copy exists because it must, and the pin is its price).
//
// NOT CAUGHT, stated: THIS file missing, unreadable or not parseable (node's exit 1 — /pharn-loop's exit-1 branch reads
// an exit 1 without a document as S11); a module that ends the process itself (none does); a top-level await in the
// graph that never settles (node exits 13); a kill by signal; a stdout that cannot be written; and, in the crash
// `reason`, a machine path outside the working and home directories that contains a space or a quote.
//
// Usage:
//   node pharn/floor/check-loop-fresh.mjs --feature <name> --base <40-hex> (--iter <N> | --commit-gate) [--front]
//        [--repo <dir>] [--verify-stamp <p>] [--regress-head-stamp <p>] [--regress-base-stamp <p>] [--max-reruns <R>]
//   Every relative path resolves against --repo (default `.`, the project root the loop runs from).
//
// Exit: 0 FRESH · 1 RERUN the named stage · 2 INCONCLUSIVE (unusable input, or — since 6.21.1 — the checker could not
//       load, threw, or returned no verdict; FAIL-CLOSED) · 4 STOP (not re-runnable: a non-lapse cause, the budget is
//       spent, or --commit-gate). stdout is ONE JSON document: {verdict, stage_to_rerun, reason_code, reason, checks,
//       reruns_used}; `checks` is null when the checker did not run to a verdict.

/** loop-fresh-core.mjs EXIT, restated as exit code → verdict token because that module cannot be imported here.
 *  Pinned by a test, with DOC_KEYS. */
const VERDICT_OF = Object.freeze({ 0: "FRESH", 1: "RERUN", 2: "INCONCLUSIVE", 4: "STOP" });
const EXIT_CODES = Object.freeze(Object.keys(VERDICT_OF).map(Number));
const INCONCLUSIVE = 2;
/** loop-fresh-core.mjs `result()`'s document keys, in order. */
const DOC_KEYS = Object.freeze(["verdict", "stage_to_rerun", "reason_code", "reason", "checks", "reruns_used"]);

/** Shorten machine paths in text copied into a committed record: the working directory → `.`, the home directory →
 *  `~`, and any other absolute path (or file:// URL) that starts at a word boundary → `…/<basename>`. A path outside
 *  both directories that contains a space or a quote keeps its segments (stated in the header). */
function shortPaths(s) {
  let out = s;
  for (const [dir, to] of [
    [process.cwd(), "."],
    [process.env.HOME, "~"],
  ]) {
    if (typeof dir === "string" && dir.length > 1) out = out.split(dir).join(to);
  }
  return out.replace(/(?<![\w.~…-])(?:file:\/\/)?(?:\/[^\s'"`()/]+)+\/([^\s'"`()/]+)/g, "…/$1");
}

/** A thrown value's first line, total: `throw Object.create(null)` has no string form, and this path must not throw. */
function firstLineOf(e) {
  try {
    return String(e?.message ?? e).split("\n")[0];
  } catch {
    return "a thrown value with no string form";
  }
}

/** The INCONCLUSIVE result for a checker that could not load, threw, or returned no verdict: DOC_KEYS in order, every
 *  value a string or null, so serializing it cannot throw. The error's first line is bounded and path-shortened. */
function crashed(what, e) {
  const first = shortPaths(firstLineOf(e));
  const doc = {
    verdict: "INCONCLUSIVE",
    stage_to_rerun: null,
    reason_code: "checker-crashed",
    reason: `${what}: ${first.length > 300 ? `${first.slice(0, 300)}…` : first} — fail-closed, this is no verdict about the evidence`,
    checks: null,
    reruns_used: null,
  };
  return { code: INCONCLUSIVE, text: JSON.stringify(doc, null, 2), error: e };
}

/** Is the SERIALIZED document the one this code needs? Checked on the parsed-back text, never on the object: JSON drops
 *  an undefined key, so an object that looks complete can print as a RERUN with no `stage_to_rerun`. */
function outsideContract(code, text) {
  if (!EXIT_CODES.includes(code)) return `exit code ${JSON.stringify(code)}`;
  const doc = JSON.parse(text);
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return "a document that is not an object";
  if (Object.keys(doc).join(",") !== DOC_KEYS.join(",")) return `document keys {${Object.keys(doc).join(", ")}}`;
  if (doc.verdict !== VERDICT_OF[code]) return `verdict ${JSON.stringify(doc.verdict)} under exit ${code}`;
  if (code === 1 && (typeof doc.stage_to_rerun !== "string" || doc.stage_to_rerun === "")) return "a RERUN naming no stage";
  return null;
}

async function run(argv) {
  let core;
  try {
    core = await import("./loop-fresh-core.mjs");
  } catch (e) {
    return crashed("the freshness checker could not load (loop-fresh-core.mjs or a module it imports)", e);
  }
  let r;
  let text;
  try {
    r = core.evaluate(argv);
    text = JSON.stringify(r?.doc, null, 2);
  } catch (e) {
    return crashed("the freshness checker threw while checking", e);
  }
  const why = typeof text === "string" ? outsideContract(r?.code, text) : "no document";
  if (why) return crashed("the freshness checker returned no verdict", new Error(`a result outside its contract: ${why}`));
  return { code: r.code, text, error: null };
}

if (import.meta.main) {
  let printed = false;
  const print = ({ code, text, error }) => {
    printed = true;
    process.exitCode = code;
    console.log(text);
    try {
      if (error) console.error(error?.stack ?? firstLineOf(error));
      else if (code !== INCONCLUSIVE) {
        // The bound, on stderr as well as in the header, so a reader of a run's output sees it (L43).
        console.error(
          "NOTE (P0): freshness certifies AGREEMENT between the artifacts and the live tree, never provenance, and tree identity, never run recency."
        );
      }
    } catch {
      /* diagnosis only — the document and the exit code are already set */
    }
  };
  // A throw a loaded module schedules asynchronously lands outside run()'s `try`. Before the document is printed it is
  // the crash document; after, the printed verdict stands on stdout and the exit is still INCONCLUSIVE (fail-closed).
  const late = (e) => {
    if (!printed) print(crashed("the freshness checker threw asynchronously", e));
    else process.exitCode = INCONCLUSIVE;
  };
  process.on("uncaughtException", late);
  process.on("unhandledRejection", late);
  const result = await run(process.argv.slice(2));
  if (!printed) print(result);
}
