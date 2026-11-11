// pharn/floor/supervisor-core.mjs — the supervisor's decision on an escalated full /pharn-loop run (7.9.0,
// loop-supervisor): the shape of `pharn/features/<name>/SUPERVISOR.json`, when a decision may be made at all, and the
// KNOWN RISK line the green commit carries. The PURE half: no file, process or network I/O; the CLI half, which reads the
// feature directory, is `pharn/floor/supervisor.mjs` (P3).
//
// CONTRACT: `pharn/pharn-contracts/supervisor.md` — cited, not restated (P4). In short:
// `{schema, round, triage_sha256, decision, reason, risks: [{id, reason}, …]}`, `decision` one of proceed-at-risk | stop,
// `risks[i].id` equal to the i-th escalated id `grill-triage-core.mjs checkTriage` derives.
//
// WHY (P7): every measured full loop escalated (.dev/features/loop-grill-triage/TRIAGE-CHECK-MEASUREMENT.md), and until
// 7.9.0 a `spec` verdict, or a `replan` with no re-plan round left, stopped the run for a person (S16). The supervisor
// gives that escalation a recorded decision, so an unattended run can go on with every escalated finding named.
//
// ONE COPY (L35): the decision restates no finding field and no disposition. It carries ids, aligned by index with the
// escalated list, and the sha256 of the triage file's bytes; the CLI re-derives the escalated list from the triage and
// findings files every time.
//
// CLOSED BOTH WAYS (L36): equal lengths and `risks[i].id === escalated[i]` for every i. NOT VACUOUS (L34): an escalation
// always has at least one escalated id, so `risks: []` is refused (`risks-length`).
//
// ONLY ON AN ESCALATION: `escalation()` admits a decision when the triage verdict is `spec`, or `replan` with the archived
// round count equal to grill-round-core.mjs REPLAN_CAP. AGREEMENT, NEVER TRUTH (L43): the count is read from archives the
// run wrote; the check says the verdict and the count agree, never that two re-plan rounds really ran.
//
// REFUSALS NAME CODES, NEVER VALUES (P2, L62): a defect is a closed code plus, for an element, its index. The KNOWN RISK
// line is built from ids that match ID_RE, a count and the slug — no reason or finding text can reach it.
//
// FLOOR (primitive #3, with #2's kind for the digest): the shape, the decision enum, the binding to the triage bytes,
// the index-aligned coverage of every escalated id, the reason bounds, and the escalation precondition.
// ADVISORY: the decision and every reason (a model's judgment over untrusted text); that a caller acts on the exit code.

import { repeatedKeyCount } from "./grill-findings-core.mjs";
import { REPLAN_CAP } from "./grill-round-core.mjs";

export const SCHEMA = "pharn-supervisor/1";
export const VERDICT_SCHEMA = "pharn-supervisor-verdict/1";
export const ARTIFACT = "SUPERVISOR.json";
export const TOP_KEYS = Object.freeze(["schema", "round", "triage_sha256", "decision", "reason", "risks"]);
export const RISK_KEYS = Object.freeze(["id", "reason"]);
export const DECISIONS = Object.freeze(["proceed-at-risk", "stop"]);
export const REASON_MAX = 2000;

/** Decision → exit code. RED is 1 and usage is 2, so the two decisions take 0 and 3. */
export const DECISION_EXIT = Object.freeze({ "proceed-at-risk": 0, stop: 3 });

/** A grill finding id, as grill-findings-core.mjs writes it: `G<round>-<n>`, both positive, no leading zero. */
export const ID_RE = /^G[1-9][0-9]*-[1-9][0-9]*$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

export const DEFECT_CODES = Object.freeze([
  "not-regular",
  "findings-invalid",
  "triage-invalid",
  "archives-invalid",
  "not-escalated",
  "not-json",
  "repeated-key",
  "not-an-object",
  "top-keys",
  "schema",
  "round",
  "triage-sha256",
  "decision",
  "reason",
  "risks-not-array",
  "risks-length",
  "risk-not-an-object",
  "risk-keys",
  "id",
  "risk-reason",
]);

/** One fixed repair hint per defect code. Keys are exactly DEFECT_CODES (a test holds the two equal). */
export const DEFECT_HINTS = Object.freeze({
  "not-regular": "an input or SUPERVISOR.json is a link, a directory or another non-regular file",
  "findings-invalid": "grill-findings.json breaks its contract; run grill-findings.mjs check for the codes",
  "triage-invalid": "grill-triage.json breaks its contract or does not bind to grill-findings.json; run grill-triage.mjs check",
  "archives-invalid": "the round archives have a gap or a partial round; run grill-round.mjs current for the codes",
  "not-escalated": "a decision is made only on an escalation: a `spec` triage verdict, or `replan` with no re-plan round left",
  "not-json": "SUPERVISOR.json must be one JSON document",
  "repeated-key": "no object may repeat a key; keep one copy of each",
  "not-an-object": `the document must be an object: ${TOP_KEYS.join(", ")}`,
  "top-keys": `the top level holds exactly ${TOP_KEYS.join(", ")}`,
  schema: `"schema" must be "${SCHEMA}"`,
  round: `"round" must equal grill-findings.json's round`,
  "triage-sha256": "triage_sha256 must be the sha256 of grill-triage.json's bytes; re-run `supervisor.mjs skeleton`",
  decision: `decision must be one of ${DECISIONS.join(", ")}`,
  reason: `reason must be one non-blank line of at most ${REASON_MAX} characters`,
  "risks-not-array": `"risks" must be an array with one element per escalated finding`,
  "risks-length": "risks must hold one element per escalated finding id, in the triage's order",
  "risk-not-an-object": "each risk must be an object",
  "risk-keys": `each risk holds exactly ${RISK_KEYS.join(", ")}`,
  id: "risk i must carry the i-th escalated id, in the triage's order; never reorder or skip one",
  "risk-reason": `each risk's reason must be one non-blank line of at most ${REASON_MAX} characters`,
});

/** True iff `s` holds a C0 control character or DEL (charcode scan; the source holds no control-char literal). */
function hasControlChar(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function hasExactKeys(o, keys) {
  const got = Object.keys(o);
  return got.length === keys.length && keys.every((k) => Object.hasOwn(o, k));
}

function defect(code, index = null) {
  return index === null ? { code } : { code, index };
}

/** A reason: a non-blank single line of 1..REASON_MAX characters (the guard before any other test, L14). */
function isReason(v) {
  return typeof v === "string" && v.length >= 1 && v.length <= REASON_MAX && !hasControlChar(v) && v.trim() !== "";
}

/**
 * May a decision be made? `triageVerdict` is grill-triage-core.mjs's verdict token, `archived` the complete archived
 * round count (grill-round-core.mjs `archivedRounds`). True for `spec`, and for `replan` once no re-plan round is left.
 */
export function escalation(triageVerdict, archived) {
  if (triageVerdict === "spec") return true;
  return triageVerdict === "replan" && archived === REPLAN_CAP;
}

/**
 * Check a decision file's TEXT against what the CLI derived: `{round, triageSha256, escalated}`, the escalated ids in
 * findings order (non-empty: the caller has already required an escalation). Returns `{ok: true, verdict}` with
 * `verdict = {schema, decision, round, known_risk}`, or `{ok: false, defects}`. Every element is checked.
 */
export function checkSupervisor(text, { round, triageSha256, escalated }) {
  if (typeof text !== "string") return { ok: false, defects: [defect("not-json")] };
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, defects: [defect("not-json")] };
  }
  if (!isObject(doc)) return { ok: false, defects: [defect("not-an-object")] };
  if (repeatedKeyCount(text) > 0) return { ok: false, defects: [defect("repeated-key")] };

  const defects = [];
  if (!hasExactKeys(doc, TOP_KEYS)) defects.push(defect("top-keys"));
  if (doc.schema !== SCHEMA) defects.push(defect("schema"));
  if (doc.round !== round) defects.push(defect("round"));
  const shaOk = typeof doc.triage_sha256 === "string" && SHA256_RE.test(doc.triage_sha256);
  if (!shaOk || doc.triage_sha256 !== triageSha256) defects.push(defect("triage-sha256"));
  const decisionOk = typeof doc.decision === "string" && DECISIONS.includes(doc.decision);
  if (!decisionOk) defects.push(defect("decision"));
  if (!isReason(doc.reason)) defects.push(defect("reason"));
  if (!Array.isArray(doc.risks)) return { ok: false, defects: [...defects, defect("risks-not-array")] };
  if (doc.risks.length !== escalated.length) defects.push(defect("risks-length"));

  const n = Math.min(doc.risks.length, escalated.length);
  for (let i = 0; i < n; i++) {
    const r = doc.risks[i];
    if (!isObject(r)) {
      defects.push(defect("risk-not-an-object", i));
      continue;
    }
    if (!hasExactKeys(r, RISK_KEYS)) defects.push(defect("risk-keys", i));
    if (r.id !== escalated[i]) defects.push(defect("id", i));
    if (!isReason(r.reason)) defects.push(defect("risk-reason", i));
  }
  if (defects.length > 0) return { ok: false, defects };

  const knownRisk = doc.decision === "proceed-at-risk" ? [...escalated] : [];
  return { ok: true, verdict: { schema: VERDICT_SCHEMA, decision: doc.decision, round, known_risk: knownRisk } };
}

/** The skeleton a supervisor fills: the round, the digest, empty decision and reason, one risk per escalated id. */
export function skeleton({ round, triageSha256, escalated }) {
  return {
    schema: SCHEMA,
    round,
    triage_sha256: triageSha256,
    decision: "",
    reason: "",
    risks: escalated.map((id) => ({ id, reason: "" })),
  };
}

/**
 * The commit message's KNOWN RISK paragraph for a `proceed-at-risk` decision, or null when there is nothing to carry or
 * an input is outside its grammar (the caller then refuses to commit). Only ids matching ID_RE, a count and the slug
 * reach it (P2).
 */
export function knownRiskLine(feature, ids) {
  if (typeof feature !== "string" || !SLUG_RE.test(feature)) return null;
  if (!Array.isArray(ids) || ids.length === 0) return null;
  if (!ids.every((id) => typeof id === "string" && ID_RE.test(id))) return null;
  return (
    `known risk: ${ids.length} grill finding(s) carried by the supervisor (proceed-at-risk): ${ids.join(", ")}` +
    ` — see pharn/features/${feature}/${ARTIFACT}`
  );
}

/** A defect list as one line of codes, `code` or `code@<index>`, at most 20 then a count. Values never appear. */
export function formatDefects(defects) {
  const shown = defects.slice(0, 20).map((d) => (d.index === undefined ? d.code : `${d.code}@${d.index}`));
  const more = defects.length > 20 ? ` and ${defects.length - 20} more` : "";
  return `${shown.join(", ")}${more}`;
}

/** The hint lines for a defect list: one per distinct code, in first-seen order, each `  <code>: <hint>`. */
export function defectHints(defects) {
  const seen = [];
  for (const d of defects) if (!seen.includes(d.code)) seen.push(d.code);
  return seen.map((c) => `  ${c}: ${Object.hasOwn(DEFECT_HINTS, c) ? DEFECT_HINTS[c] : "unknown code"}`);
}
