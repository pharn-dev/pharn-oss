// pharn/floor/stage-verify-core.mjs — the PURE rules for the /pharn-verify stage script (stage-verify-script,
// 6.26.0). No `child_process`, no filesystem, no network, no clock. The execution half lives in
// pharn/floor/stage-verify.mjs (P3, one axis per file: this module changes when a RULE changes, not when an
// execution detail does).
//
// ================================ LOAD-GRAPH CONSTRAINT (6.23.0 GRILL G8) ================================
// This module imports NOTHING but `gate-run-core.mjs`, which is already in `loop-fresh-core.mjs`'s import graph,
// so importing `VERIFY_PATHS` from here there adds exactly one small module to the freshness checker's graph.
// Since 6.21.1 a module that cannot load there is `checker-crashed`; every added import is one more way to reach
// it. `stage-verify-core.test.mjs` pins this module's import list, with an injected-import control.
//
// ==================================== THE CLOSED RULES ====================================
// • VERIFY_PATHS — the ONE owner of the stage's `.pharn/pharn-verify/` scratch layout; `loop-fresh-core.mjs`'s
//   `DEFAULT_STAMPS.verify` is derived from it (L35).
// • PHASES / RESUMABLE_PHASES — the order `stage-verify.mjs` runs, and the only two phases it ever persists. The
//   phase literals the script passes to its checkpoint writer are pinned EQUAL to RESUMABLE_PHASES by a test
//   (6.23.0's M9: a resumable phase the script never persisted crashed a resume).
// • EVAL_PAIR_RULE (`featureEvalPairs`) — which committed-or-untracked eval pairs become `structural:` gates. Before
//   6.26.0 this was command prose the model applied by judgment; see the function's own comment for the one
//   disclosed semantic difference (untracked pairs count).
// • VERDICT_EXIT / classifyVerdict — `check-verify.mjs`'s closed verdict→exit table. The script reads a verdict
//   only when the exit AGREES with the printed verdict: node exits 1 on a crash, which is also FAIL's code, so the
//   exit alone is never read as a verdict (6.21.1's "a crash is not read as a verdict").
// • checkCompleteness — the SHAPE of the runner's `completeness.json` capture. A crashed `check-build-complete.mjs`
//   leaves it empty (probed at plan time), which is a refusal here, never an INCOMPLETE.
// • composeReport — the report is the checker's object, every key kept in order, then two advisory blocks.
//
// TRUST (P2): nothing here reads a file or runs anything. `featureEvalPairs`' `declared` strings come from the
// untrusted PLAN and are used ONLY as prefix operands of a membership test over git's own listing, so a PLAN can
// select a pair the tree holds but never introduce a path. A child's parsed JSON is shape-checked with `typeof`
// before any value is used as a key or quoted into a reason (L62: `{"toString":1}` is a legal JSON value).

import { FEATURE_SLUG_RE, actualForExpected } from "./gate-run-core.mjs";

/** ------------------------------------------------------------------------------------------------
 *  VERIFY_PATHS — the stage's scratch layout. The stamp is `<gates>/stamp.json` and the completeness capture
 *  `<gates>/completeness.json`: both file names are `run-gates.mjs`'s, which writes them under `--out`.
 *  ---------------------------------------------------------------------------------------------- */
export const VERIFY_PATHS = Object.freeze({
  root: ".pharn/pharn-verify",
  gates: ".pharn/pharn-verify/gates",
  stageJson: ".pharn/pharn-verify/stage.json",
});

/** THE PHASE ENUM, in EXECUTION ORDER. Every refusal and the one question are raised before "drain", the first
 *  phase with a slow step, so a progress record exists only from "drain" on. "render" is never persisted: the
 *  record stays parked at "verdict" until the render finishes and the record is removed. */
export const PHASES = Object.freeze(["fresh", "chain", "pairs", "verifiers", "init", "drain", "verdict", "render"]);

export const RESUMABLE_PHASES = Object.freeze(["drain", "verdict"]);

/** ------------------------------------------------------------------------------------------------
 *  THE PROGRESS RECORD — `.pharn/pharn-verify/stage.json`, schema `pharn-stage-verify-progress/1`. It carries
 *  EXACTLY what a resumed invocation needs: the feature, the two budget numbers, the NEXT phase, and the verifier
 *  count (taken before the slow steps, so a resume does not re-walk the tree for it). Everything else a resume
 *  needs — the gate set, the stamp, the completeness capture — is already durable under `<gates>/`, written by
 *  `run-gates.mjs` (one owner of each fact, L35). CLOSED in both directions (L36): every key required, none extra.
 *  ---------------------------------------------------------------------------------------------- */
export const PROGRESS_SCHEMA = "pharn-stage-verify-progress/1";

const PROGRESS_KEYS = Object.freeze(["schema", "feature", "timeoutMs", "budgetMs", "phase", "verifiers"]);
const VERIFIER_KEYS = Object.freeze(["registered", "verifiers"]);

function isStringArray(v) {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

function hasExactKeys(obj, keys) {
  const own = Object.keys(obj);
  return own.length === keys.length && keys.every((k) => Object.hasOwn(obj, k));
}

/** `count-verifiers.mjs`'s output shape: `{registered: int >= 0, verifiers: string[]}`, the count equal to the list's
 *  length, and nothing else. Shared by the script's parse of the child's stdout and by `validateProgress`. */
export function isVerifierCount(v) {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  if (!hasExactKeys(v, VERIFIER_KEYS)) return false;
  if (!Number.isInteger(v.registered) || v.registered < 0) return false;
  return isStringArray(v.verifiers) && v.verifiers.length === v.registered;
}

export function validateProgress(rec) {
  if (rec === null || typeof rec !== "object" || Array.isArray(rec)) return { ok: false, reason: "progress record must be a JSON object" };
  if (!hasExactKeys(rec, PROGRESS_KEYS)) {
    return { ok: false, reason: `progress record must carry exactly the keys ${PROGRESS_KEYS.join(", ")}` };
  }
  if (rec.schema !== PROGRESS_SCHEMA) return { ok: false, reason: `progress.schema must be ${JSON.stringify(PROGRESS_SCHEMA)}` };
  if (typeof rec.feature !== "string" || !FEATURE_SLUG_RE.test(rec.feature))
    return { ok: false, reason: "progress.feature must be a plain slug" };
  if (!Number.isInteger(rec.timeoutMs) || rec.timeoutMs <= 0) return { ok: false, reason: "progress.timeoutMs must be a positive integer" };
  if (rec.budgetMs !== null && !(Number.isInteger(rec.budgetMs) && rec.budgetMs >= 0)) {
    return { ok: false, reason: "progress.budgetMs must be null or a non-negative integer" };
  }
  if (typeof rec.phase !== "string" || !RESUMABLE_PHASES.includes(rec.phase)) {
    return { ok: false, reason: `progress.phase must be one of ${RESUMABLE_PHASES.join(" | ")}` };
  }
  if (!isVerifierCount(rec.verifiers)) return { ok: false, reason: "progress.verifiers must be exactly {registered, verifiers}" };
  return { ok: true };
}

/** ------------------------------------------------------------------------------------------------
 *  EVAL_PAIR_RULE — the eval pairs the feature ships, as `structural:` gates for the runner's `--extra`.
 *
 *  A pair is an expected file `E` in `listing` matching `/evals/expected/<file>.json` (the pattern
 *  `stage-regress.mjs` already uses), whose `actualForExpected(E)` — `gate-run-core.mjs`, the one owner of the
 *  pairing, which the runner also applies — is in `listing` too, and whose CAPABILITY DIRECTORY the PLAN declares:
 *  some cleaned `## Files` entry equals `<capDir>` or begins with `<capDir>/`. Sorted, unique.
 *
 *  Named bounds:
 *   • `listing` is TRACKED plus UNTRACKED-NOT-IGNORED (`git ls-files -z --cached --others --exclude-standard`). A
 *     DISCLOSED semantic change (GRILL G4): the prose this replaces said "the committed expected finding arrays",
 *     and a capability the build just wrote is untracked at verify time, so the literal reading gave it no gate.
 *     Regress's own pair discovery stays tracked-only; the two differ on purpose.
 *   • a declared glob ABOVE the capability directory (`src/**`) does not select it — declare the directory or a
 *     file inside it.
 *   • a git-IGNORED pair is not in the listing, so it gets no gate; and the comparison is EXACT, so a declared path
 *     that differs from the tree only in letter case selects nothing — while on a case-insensitive volume
 *     `check-build-complete.mjs` counts that path present (GATE 2 review F3). Both fail open (fewer gates).
 *   • a listed path holding `*` is refused by the runner's `parseExtras` (`bad-extra`), never mangled here.
 *  ---------------------------------------------------------------------------------------------- */
export const EXPECTED_RE = /\/evals\/expected\/[^/]+\.json$/;

const FINDINGS_SUFFIX = "/findings.json";

export function featureEvalPairs({ declared, listing }) {
  if (!isStringArray(declared) || !isStringArray(listing))
    throw new TypeError("featureEvalPairs: declared and listing must be string arrays");
  const listed = new Set(listing);
  const out = new Set();
  for (const expected of listing) {
    if (!EXPECTED_RE.test(expected)) continue;
    const actual = actualForExpected(expected);
    if (actual === null || !listed.has(actual)) continue;
    const capDir = actual.slice(0, -FINDINGS_SUFFIX.length);
    if (!declared.some((d) => d === capDir || d.startsWith(`${capDir}/`))) continue;
    out.add(expected);
  }
  return [...out].sort();
}

/** ------------------------------------------------------------------------------------------------
 *  THE VERDICT READING — `check-verify.mjs`'s closed table (its header: 0 PASS · 1 FAIL · 2 INCONCLUSIVE ·
 *  3 INCOMPLETE). A result is a verdict ONLY when stdout is one JSON object whose `verdict` is a member AND the
 *  exit equals that member's code. Everything else — a spawn error, no JSON, an array, a verdict outside the set,
 *  or an exit that disagrees (a crash exits 1, FAIL's own code) — is `{ok: false}`, which the script reports as
 *  `child-crashed`.
 *  ---------------------------------------------------------------------------------------------- */
export const VERDICT_EXIT = Object.freeze({ PASS: 0, FAIL: 1, INCONCLUSIVE: 2, INCOMPLETE: 3 });

export function classifyVerdict({ status, stdout, error = null }) {
  if (error)
    return { ok: false, reason: "check-verify.mjs could not be run to completion (a spawn error, or its output exceeded the buffer)" };
  let doc;
  try {
    doc = JSON.parse(typeof stdout === "string" ? stdout : "");
  } catch {
    return { ok: false, reason: `check-verify.mjs printed no JSON document (exit ${String(status)})` };
  }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    return { ok: false, reason: `check-verify.mjs printed JSON that is not an object (exit ${String(status)})` };
  }
  if (typeof doc.verdict !== "string" || !Object.hasOwn(VERDICT_EXIT, doc.verdict)) {
    return {
      ok: false,
      reason: `check-verify.mjs printed a verdict outside {${Object.keys(VERDICT_EXIT).join(", ")}} (exit ${String(status)})`,
    };
  }
  if (status !== VERDICT_EXIT[doc.verdict]) {
    return {
      ok: false,
      reason: `check-verify.mjs exited ${String(status)} beside the verdict ${doc.verdict}, whose code is ${VERDICT_EXIT[doc.verdict]} — a crash is never read as a verdict`,
    };
  }
  return { ok: true, report: doc };
}

/** ------------------------------------------------------------------------------------------------
 *  THE COMPLETENESS CAPTURE — `check-build-complete.mjs`'s stdout, which `run-gates.mjs init` wrote to
 *  `<gates>/completeness.json`. Every one of that checker's outputs (complete, incomplete, each inconclusive
 *  branch) is one JSON object with `complete` a boolean and `missing`/`skipped` string arrays; anything else —
 *  the EMPTY file a crashed checker leaves included — is `{ok: false}`, `child-crashed` to the script.
 *
 *  BOUND, stated: a SHAPE check, not an agreement check. A capture that is well-shaped but disagrees with the exit
 *  the stamp recorded (`aux.completeness`) is not detected. `check-build-complete.mjs` prints its one document and
 *  then exits, so no crash mode is known to produce one (P7: no check without a failure).
 *  ---------------------------------------------------------------------------------------------- */
export function checkCompleteness(text) {
  if (typeof text !== "string" || text.trim() === "") return { ok: false, reason: "the completeness capture is empty or absent" };
  let v;
  try {
    v = JSON.parse(text);
  } catch {
    return { ok: false, reason: "the completeness capture is not JSON" };
  }
  if (v === null || typeof v !== "object" || Array.isArray(v))
    return { ok: false, reason: "the completeness capture is not a JSON object" };
  if (typeof v.complete !== "boolean") return { ok: false, reason: "the completeness capture's `complete` is not a boolean" };
  if (!isStringArray(v.missing)) return { ok: false, reason: "the completeness capture's `missing` is not an array of strings" };
  if (!isStringArray(v.skipped)) return { ok: false, reason: "the completeness capture's `skipped` is not an array of strings" };
  return { ok: true, value: v };
}

/** ------------------------------------------------------------------------------------------------
 *  THE REPORT — `check-verify.mjs`'s object with every key kept, value and order, then two ADVISORY blocks the
 *  command used to merge by hand: `completeness` (the runner's capture, verbatim, after `checkCompleteness`) and
 *  `verifiers` (`{registered, findings: []}`, plus a fixed `note` when `registered > 0`). A checker key named
 *  `completeness` or `verifiers` is REFUSED rather than overwritten (GATE 1 Q2) — `check-verify.mjs` prints
 *  neither today, so the refusal guards a future change to it.
 *  ---------------------------------------------------------------------------------------------- */
export const MERGED_KEYS = Object.freeze(["completeness", "verifiers"]);

export const VERIFIER_DEFERRED_NOTE =
  "verifiers are registered, but the live verifier runner is deferred (P7): none was run, and a verifier finding never flips the verdict (fix #3)";

export function composeReport({ checker, completeness, verifiers }) {
  if (checker === null || typeof checker !== "object" || Array.isArray(checker)) {
    return { ok: false, reason: "the verdict checker's output is not a JSON object" };
  }
  for (const k of MERGED_KEYS) {
    if (Object.hasOwn(checker, k)) {
      return {
        ok: false,
        reason: `check-verify.mjs printed a \`${k}\` key, which this stage merges itself — refused rather than overwritten`,
      };
    }
  }
  if (completeness === null || typeof completeness !== "object" || Array.isArray(completeness)) {
    return { ok: false, reason: "the completeness block is not a JSON object" };
  }
  if (!isVerifierCount(verifiers)) return { ok: false, reason: "the verifier count is not {registered, verifiers}" };
  const block = { registered: verifiers.registered, findings: [] };
  if (verifiers.registered > 0) block.note = VERIFIER_DEFERRED_NOTE;
  return { ok: true, report: { ...checker, completeness, verifiers: block } };
}
