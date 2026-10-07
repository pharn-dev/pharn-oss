// pharn/floor/reconcile-detail-core.mjs — WHY the verify `reconcile` gate failed, made visible (6.55.0).
//
// ================================ THE RECORDED FAILURE (P7) ================================
// Since 6.54.0 an escape carries a closed `reason` (`plan-widened-after-anchor`), and since 6.52.0 the checker lists
// `merged[]` paths. Neither reached a human: `VERIFY.md` and `RUN-REPORT.md` named the gate id `reconcile` and nothing
// else, so seeing WHICH paths escaped and WHY meant re-running `check-bash-reconcile.mjs --require-baseline` by hand —
// the contract (`reconciliation-record.md`) named rendering it as a follow-up. This module is that follow-up.
//
// ================================ WHAT IT DOES — two pure halves ================================
// 1. `reconcileDetail` turns the reconcile gate's RECORDED stdout (`<seq>-reconcile.out` under the verify gate dir,
//    which `stage-verify.mjs` reads and binds to the stamp's `stdout_sha256`) into the `reconcile_detail` block of
//    `verify-report.json`. It parses the checker's JSON DOCUMENT (contract §2) — never its prose `problem` text — and
//    classifies the log into a CLOSED state, so a missing, unreadable, digest-mismatched or non-checker log is a named
//    state with a line of its own, never an empty list that reads like "no escapes" (lessons-learned L34).
// 2. `reconcileDetailLines` renders that block as Markdown lines, ONE renderer for both reports (L35): `render-verify.mjs`
//    and `render-run-report.mjs` import it, so the two cannot disagree about how a reason or a path is shown.
//
// ================================ TRUST (P2) ================================
// A file name, `denied_by`, `scope_set_by` and the checker's `reason` sentence are UNTRUSTED text: a path may hold a
// newline, a back-tick, `#` or `|`. Every one is JSON-quoted (so a newline stays `\n` and each escape stays ONE row)
// INSIDE a fence `quote-core.mjs` computes longer than any back-tick run in it, so none can become document structure
// to a CommonMark parser. Inline, ONLY closed-set values appear, each after a membership test: the checker's verdict
// (RECONCILE_VERDICTS), an escape `reason` (ESCAPE_REASONS) and the log state (DETAIL_STATES); integers are rendered
// only after `Number.isInteger`. A value outside its set is fenced with a fixed "outside the closed set" marker. Not
// forgery-proofing: a reader who copies text out of a fence is outside anything this module reaches. `JSON.stringify`
// leaves U+2028 / U+2029 raw (quote-core.mjs's stated bound), which some viewers draw as a line break.
//
// ================================ WHAT IT IS NOT (P0) ================================
// ADVISORY presentation. No verdict reads the block: `check-verify.mjs` decides from the exit code alone, and
// `check-loop.mjs` from `failing_gates`. Reading a gate's stdout here does not change the runner's rule that no VERDICT
// reads gate content. The digest binding says the bytes are the ones the runner recorded for that run — not that the
// checker told the truth, and not that the log was not rewritten together with the stamp (both live under `.pharn/`,
// which Bash reaches: the LIMITS.md §6 class). RECONCILE_VERDICTS is a second copy of the checker's verdict enum
// (contract §2); drift fails LOUD, not silent — a verdict added upstream classifies the log `not-checker-json`.
//
// ONE COPY (L35): the closed escape-`reason` enum lives HERE; `check-bash-reconcile.mjs` imports it back.
//
// LOAD GRAPH: `quote-core.mjs` (→ `loop-record-core.mjs`) only. No filesystem, no child process, no network.

import { quoteData } from "./quote-core.mjs";

/** The runner's id for the reconcile gate (gate-run-core.mjs's `reconcileEntry`). */
export const RECONCILE_GATE_ID = "reconcile";

/** The closed `reason` enum an escape may carry (6.54.0). Absent on every other escape. */
export const WIDENED_REASON = "plan-widened-after-anchor";
export const ESCAPE_REASONS = Object.freeze([WIDENED_REASON]);

/** check-bash-reconcile.mjs's closed verdict enum (contract §2) — the parse guard. */
export const RECONCILE_VERDICTS = Object.freeze(["CLEAN", "ESCAPE", "NO_BASELINE", "INCONCLUSIVE"]);

/** The closed log states. `parsed` is the only one that carries rows. */
export const DETAIL_STATES = Object.freeze(["parsed", "log-missing", "log-unreadable", "log-digest-mismatch", "not-checker-json"]);

/** How many escape rows the block keeps (and so a report shows); the rest are counted, never dropped silently. */
export const ESCAPE_ROW_CAP = 20;

/** The command a human runs to see the full document — the runner's own reconcile argv. */
export const RERUN_COMMAND = "node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline";

const STATE_PHRASES = Object.freeze({
  "log-missing": "the reconcile gate's recorded output is missing",
  "log-unreadable": "the reconcile gate's recorded output could not be read",
  "log-digest-mismatch": "the reconcile gate's recorded output no longer matches the digest the gate runner recorded for it",
  "not-checker-json": "the reconcile gate's recorded output is not check-bash-reconcile.mjs's JSON document",
});

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** The reconcile run of a PARSED stamp (gate-run-record.md `runs[]`), or null when the stamp has none. */
export function reconcileRun(stamp) {
  if (!isObject(stamp) || !Array.isArray(stamp.runs)) return null;
  const run = stamp.runs.find((r) => isObject(r) && r.id === RECONCILE_GATE_ID);
  if (!run || !Number.isInteger(run.seq) || !Number.isInteger(run.exit)) return null;
  return { seq: run.seq, exit: run.exit, stdout_sha256: typeof run.stdout_sha256 === "string" ? run.stdout_sha256 : null };
}

/** One escape entry, or null when it is not the contract's shape `{ file, denied_by, scope_set_by?, reason? }`. */
function escapeEntry(e) {
  if (!isObject(e) || typeof e.file !== "string" || typeof e.denied_by !== "string") return null;
  if (Object.hasOwn(e, "scope_set_by") && typeof e.scope_set_by !== "string") return null;
  if (Object.hasOwn(e, "reason") && typeof e.reason !== "string") return null;
  const out = { file: e.file, denied_by: e.denied_by };
  if (Object.hasOwn(e, "reason")) out.reason = e.reason;
  if (Object.hasOwn(e, "scope_set_by")) out.scope_set_by = e.scope_set_by;
  return out;
}

/**
 * The `reconcile_detail` block. `exit` is the stamp's recorded exit for the reconcile run; `logState` is how the caller
 * fared reading the log: `"read"` (then `text` is its bytes as UTF-8 and the digest matched), or one of
 * `log-missing` / `log-unreadable` / `log-digest-mismatch`. TOTAL: it never throws.
 */
export function reconcileDetail({ exit, logState, text }) {
  const ex = Number.isInteger(exit) ? exit : null;
  if (logState !== "read") {
    return { state: DETAIL_STATES.includes(logState) && logState !== "parsed" ? logState : "log-unreadable", exit: ex };
  }
  const bad = { state: "not-checker-json", exit: ex };
  let doc;
  try {
    doc = JSON.parse(String(text));
  } catch {
    return bad;
  }
  if (!isObject(doc) || !RECONCILE_VERDICTS.includes(doc.verdict)) return bad;
  const rawEscapes = Object.hasOwn(doc, "escapes") ? doc.escapes : [];
  const rawMerged = Object.hasOwn(doc, "merged") ? doc.merged : [];
  if (!Array.isArray(rawEscapes) || !Array.isArray(rawMerged)) return bad;
  if (!rawMerged.every((m) => typeof m === "string")) return bad;
  const escapes = rawEscapes.map(escapeEntry);
  if (escapes.includes(null)) return bad;
  if (doc.verdict === "ESCAPE" && escapes.length === 0) return bad;
  const block = {
    state: "parsed",
    exit: ex,
    verdict: doc.verdict,
    escapes: escapes.slice(0, ESCAPE_ROW_CAP),
    escapes_total: escapes.length,
    merged_count: rawMerged.length,
  };
  if (typeof doc.reason === "string") block.reason = doc.reason;
  return block;
}

/** Does a report with this block (or none) warrant a reconcile section? Yes when the gate exited non-zero, when it
 *  merged a path, or when the report lists `reconcile` as failing but carries no block to explain it. */
export function wantsReconcileSection(block, failingGates) {
  const failing = Array.isArray(failingGates) && failingGates.includes(RECONCILE_GATE_ID);
  if (!isObject(block)) return failing;
  if (failing || (Number.isInteger(block.exit) && block.exit !== 0)) return true;
  return block.state === "parsed" && Number.isInteger(block.merged_count) && block.merged_count > 0;
}

function rerunLine(lead) {
  return `${lead} Re-run \`${RERUN_COMMAND}\` to see the escapes — before any new build re-anchors the baseline, which erases them.`;
}

function reasonText(r) {
  if (r === undefined) return "-";
  return ESCAPE_REASONS.includes(r) ? r : `(outside the closed set) ${q(r)}`;
}

/** Any value as ONE line of JSON text — never a throw. The renderer also reads a block from a `verify-report.json` a
 *  model could have edited, so a field may be any JSON value: too deep to stringify (RangeError) renders a fixed
 *  marker, and `undefined` (no JSON form) renders `-`. */
function q(v) {
  try {
    const t = JSON.stringify(v);
    return t === undefined ? "-" : t;
  } catch {
    return "(value nested too deeply to render)";
  }
}

/**
 * The Markdown lines for one block (no heading — each report places them under its own). A `null`/absent block renders
 * the "not recorded" line; a non-parsed state renders exactly one line naming it and the re-run command.
 */
export function reconcileDetailLines(block) {
  if (!isObject(block)) {
    return [
      rerunLine("reconcile detail: not recorded in this report (a report written before 6.55.0, or a run with no reconcile gate)."),
      "",
    ];
  }
  if (block.state !== "parsed") {
    const known = typeof block.state === "string" && Object.hasOwn(STATE_PHRASES, block.state);
    const phrase = known ? STATE_PHRASES[block.state] : "the reconcile detail is in a state this renderer does not recognize";
    return [rerunLine(`reconcile detail: not shown — ${phrase}; no row is invented.`), ""];
  }
  const out = [];
  const verdict = RECONCILE_VERDICTS.includes(block.verdict) ? `\`${block.verdict}\`` : "(a verdict outside the closed set)";
  const exit = Number.isInteger(block.exit) ? `exit ${block.exit}` : "exit not recorded";
  out.push(`reconcile: ${verdict} (${exit}) — read from check-bash-reconcile.mjs's own JSON document, as the gate recorded it.`, "");
  const escapes = Array.isArray(block.escapes) ? block.escapes.filter(isObject) : [];
  const total = Number.isInteger(block.escapes_total) ? block.escapes_total : escapes.length;
  if (total > 0) {
    const counts = new Map();
    let unreasoned = 0;
    for (const e of escapes) {
      if (e.reason === undefined) unreasoned++;
      else if (ESCAPE_REASONS.includes(e.reason)) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
    }
    const named = [...counts].map(([r, n]) => `\`${r}\` ×${n}`);
    if (unreasoned > 0) named.push(`no closed reason ×${unreasoned}`);
    out.push(
      `**${total} escape(s)** — a path changed since the anchor that the write guards would have denied. ` +
        `Closed reasons${total > escapes.length ? ` (over the ${escapes.length} shown)` : ""}: ${named.length ? named.join(", ") : "none"}.`,
      ""
    );
    const rows = escapes.map(
      (e) => `${q(e.file)}  denied_by=${q(e.denied_by)}  reason=${reasonText(e.reason)}  scope_set_by=${q(e.scope_set_by)}`
    );
    out.push(quoteData("each escape — file, denied_by, reason, scope_set_by — JSON-quoted as DATA:", rows.join("\n")), "");
    if (total > escapes.length) out.push(rerunLine(`… and ${total - escapes.length} more escape(s) not listed.`), "");
  }
  if (Number.isInteger(block.merged_count) && block.merged_count > 0) {
    out.push(
      `${block.merged_count} path(s) classified \`merged\` — bytes HEAD merged from upstream during the window ` +
        "(reconciliation-record.md §2a): listed by the checker, not counted as escapes.",
      ""
    );
  }
  if (typeof block.reason === "string") out.push(quoteData("the checker's reason, quoted as DATA:", block.reason), "");
  return out;
}
