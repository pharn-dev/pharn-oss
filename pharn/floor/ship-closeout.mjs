// pharn/floor/ship-closeout.mjs — /pharn-ship's Step 3a as ONE line (6.44.0, loop-closeout-script): the run-stop
// marker, the write-guard run marker's close, the base SHA, the cost ledger, its check and the run report, in the
// order the six pinned lines ran them.
//
//   node pharn/floor/ship-closeout.mjs --feature '<name>'
//
// WHY (P7): each of Step 3a's six lines was its own Bash call and model request at the run's largest context; the
// trigger and its arithmetic are .dev/features/loop-closeout-script/PLAN.md's ("Why", "Saving"). The steps it shares
// with /pharn-loop's close live in closeout-core.mjs (L35).
//
// THE SEQUENCE, each as the line it replaced:
//  0. argv: --feature, a FEATURE_SLUG_RE member (gate-run-core.mjs), nothing else → exit 2 otherwise, nothing run.
//  1. mark-phase.mjs --name <name> --kind run-stop (its marker line printed whole — the ledger's run membership reads
//     it back from the transcript), then run-marker.mjs --close pharn-ship <name> (idempotent: a STOP before the
//     GATE-1 backstop closes a marker never opened).
//  2. The base SHA: `git rev-parse HEAD` (stage-runtime.mjs gitSync), or the literal `unknown`.
//  3. render-cost-ledger.mjs <name> --command /pharn-ship --base-sha <sha>; check-cost-ledger.mjs on the result only
//     when the emitter exited 0 (otherwise no ledger was emitted THIS run, and a cost.json on disk is an earlier run's).
//  4. render-run-report.mjs <name> --base pharn/features — SKIPPED when the run is quick. The mode is read from the
//     run's own run-start marker (ship-outcome-core.mjs runMode() over render-cost-ledger.mjs readMarkers()), the same
//     record the ledger's `outcome` reads, never from the SPEC's kind (a quick SPEC may run the full pipeline).
//
// OUTPUT: each step under a `── <step> (exit N)` header, child output indented (closeout-core.mjs `echo`); the LAST
// line is one JSON document whose keys are exactly DOC_KEYS. EXIT: 0 every item attempted (none gates — Step 3a gated
// nothing before either; each item's own result is in the document) · 2 refused, nothing run · ANY OTHER (1
// included) a crash, no closing line.
//
// BOUNDS (P0): agreement with the six lines is pinned by tests (each step's full argv, in order); that the run
// invokes this line, and its position before Step 3b, are command prose — advisory. NO GIT WRITE: the one git call
// here is `rev-parse HEAD` and closeout-core.mjs holds none (ship-closeout.test.mjs scans both sources), so
// /pharn-ship's "every git call here is a read" holds by construction of these bytes — a later edit could break it,
// and the scan sees only the spellings it knows. A skipped or wrong quick run-start marker reads `full`, and the
// report is then rendered in a quick run — the same marker the ledger's outcome already trusts
// (ship-outcome-core.mjs, header). NON-LLM. TRUST (P2): child output is echoed as DATA; no branch reads it.

import "./runtime-floor.mjs";
import { join } from "node:path";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { DEFAULT_BASE as MARKERS_BASE } from "./mark-phase.mjs";
import { readMarkers } from "./render-cost-ledger.mjs";
import { runMode } from "./ship-outcome-core.mjs";
import { gitSync } from "./stage-runtime.mjs";
import { closingLine, echo, floorScript, ledgerSteps, runLedgerTail, runStep, runStop, step } from "./closeout-core.mjs";

export const SCHEMA = "pharn-ship-closeout/1";
export const EXIT = Object.freeze({ DONE: 0, UNUSABLE: 2 });
export const DOC_KEYS = Object.freeze([
  "schema",
  "feature",
  "exit",
  "refusal",
  "mode",
  "run_stop",
  "run_marker_close",
  "base_sha",
  "ledger",
  "ledger_check",
  "report",
]);

const SHA_LIKE = /^[0-9a-f]{40}$/;

/** The run-stop marker and the run-marker close, with the argv the two pinned lines carried. */
export function shipSteps(feature, baseSha) {
  return Object.freeze({
    ...ledgerSteps({ feature, command: "/pharn-ship", baseSha }),
    markerClose: step("run-marker.mjs --close pharn-ship", floorScript("run-marker.mjs"), ["--close", "pharn-ship", feature]),
  });
}

/** `git rev-parse HEAD`, or `unknown` — the read the Step 3a capture line made. */
export function baseShaNow(git = gitSync) {
  const r = git(["rev-parse", "HEAD"]);
  const sha = r.ok ? r.stdout.trim() : "";
  return SHA_LIKE.test(sha) ? sha : "unknown";
}

/** The run's own mode, from its run-start marker. */
export function shipMode(feature) {
  return runMode(readMarkers(join(MARKERS_BASE, feature, "markers.jsonl")));
}

/** The whole Step 3a. Returns the closing document. `run`, `git`, `mode` and `log` are parameters for the tests. */
export function closeShip({ feature, run = runStep, git = gitSync, mode = shipMode, log = () => {} }) {
  const doc = {};
  for (const k of DOC_KEYS) doc[k] = null;
  doc.schema = SCHEMA;
  doc.feature = feature;
  // Item 1: run-stop, then the run marker's close. The base SHA is not known yet, and the run-stop step does not take
  // it, so the steps are built once the SHA is read (item 2) — the run-stop argv is the same either way.
  const pre = shipSteps(feature, "unknown");
  doc.run_stop = runStop({ steps: pre, run, log });
  const mc = run(pre.markerClose);
  echo(log, pre.markerClose, mc);
  doc.run_marker_close = mc.status === 0 ? "ok" : "failed";
  // Item 2.
  doc.base_sha = baseShaNow(git);
  log(`── git rev-parse HEAD\n  ${doc.base_sha}\n`);
  // Items 3–4.
  doc.mode = mode(feature) === "quick" ? "quick" : "full";
  const steps = shipSteps(feature, doc.base_sha);
  Object.assign(doc, runLedgerTail({ steps, quick: doc.mode === "quick", run, log }));
  doc.exit = EXIT.DONE;
  return doc;
}

/** `{ok: true, feature}` or `{ok: false, detail}`. */
export function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--feature") return { ok: false, detail: "expected exactly --feature <name>" };
  if (!FEATURE_SLUG_RE.test(argv[1])) return { ok: false, detail: `--feature must match ${FEATURE_SLUG_RE}` };
  return { ok: true, feature: argv[1] };
}

function main(argv) {
  const log = (s) => process.stdout.write(s);
  const p = parseArgs(argv);
  if (!p.ok) {
    process.stderr.write(`ship-closeout: ${p.detail}\nusage: node pharn/floor/ship-closeout.mjs --feature <name>\n`);
    const doc = {};
    for (const k of DOC_KEYS) doc[k] = null;
    Object.assign(doc, { schema: SCHEMA, exit: EXIT.UNUSABLE, refusal: "usage" });
    log(closingLine(doc));
    process.exitCode = EXIT.UNUSABLE;
    return;
  }
  try {
    const doc = closeShip({ feature: p.feature, log });
    log(closingLine(doc));
    process.exitCode = doc.exit;
  } catch (e) {
    process.stderr.write(`ship-closeout: crashed: ${e && typeof e.message === "string" ? e.message : "unknown error"}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.main) main(process.argv.slice(2));
