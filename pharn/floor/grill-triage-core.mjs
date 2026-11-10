// pharn/floor/grill-triage-core.mjs — the shape of a triage file, `pharn/features/<name>/grill-triage.json`, and the
// verdict `grill-triage.mjs check` derives from it (7.7.0, loop-grill-triage). The PURE half: no file, process or
// network I/O; the caller hashes the findings file and passes the digest in. The CLI half is
// `pharn/floor/grill-triage.mjs` (P3).
//
// CONTRACT: `pharn/pharn-contracts/grill-triage.md` — cited, not restated (P4). In short:
// `{schema, round, findings_sha256, dispositions: [{id, disposition, reason}, …]}`, element i's id equal to the
// findings file's element i id, each disposition one of proceed | replan | spec.
//
// WHY (P7): four /pharn-loop runs wrote 26 grill findings no stage read, all 0 blocking-severity, three ending green
// (the contract's "Why it exists"). A stage that reads every finding needs an output code can check for coverage, and
// the loop needs a verdict computed by code, not read from the stage's prose.
//
// ONE COPY (L35): the triage file restates no finding field. It carries ids, aligned by index, and the findings file's
// sha256; `severity` is read from the findings document the caller validated with grill-findings-core.mjs `validate`.
//
// CLOSED BOTH WAYS (L36): equal lengths and `dispositions[i].id === findings[i].id` for every i, so a missing, extra,
// reordered or duplicated id is refused. NOT VACUOUS (L34): non-empty findings with `[]` is a refusal; zero findings
// with `[]` is an explicit `proceed`.
//
// REFUSALS NAME CODES, NEVER VALUES (P2, L62): a defect is a closed code plus, for an element, its index. Ids in the
// verdict are copied from the findings document, whose ids grill-findings-core.mjs already matched to `G<round>-<n>`.
//
// FLOOR (primitive #3): `checkTriage` — closed keys, repeated keys at any depth refused, the schema token, the round,
// the digest's shape and equality (primitive #2's kind: the caller's sha256 of the findings bytes), index-aligned ids,
// the disposition enum, the reason's bounds, `blocking` never `proceed`, and the verdict function.
// AGREEMENT, NEVER TRUTH (L43): two run-written files agreeing says nothing about whether a disposition is right.
// ADVISORY: every disposition and reason (a model's judgment); the severity the `blocking` rule reads (the grill
// model's assignment); that any stage acts on the verdict.

import { repeatedKeyCount } from "./grill-findings-core.mjs";

export const SCHEMA = "pharn-grill-triage/1";
export const VERDICT_SCHEMA = "pharn-grill-triage-verdict/1";
export const TOP_KEYS = Object.freeze(["schema", "round", "findings_sha256", "dispositions"]);
export const DISPOSITION_KEYS = Object.freeze(["id", "disposition", "reason"]);
export const DISPOSITIONS = Object.freeze(["proceed", "replan", "spec"]);
export const REASON_MAX = 2000;

/** Verdict → exit code. RED is 1 and usage is 2, so the three verdicts take 0, 3 and 4. */
export const VERDICT_EXIT = Object.freeze({ proceed: 0, replan: 3, spec: 4 });

export const DEFECT_CODES = Object.freeze([
  "not-json",
  "repeated-key",
  "not-an-object",
  "top-keys",
  "schema",
  "round",
  "findings-sha256",
  "dispositions-not-array",
  "dispositions-length",
  "disposition-not-an-object",
  "disposition-keys",
  "id",
  "disposition",
  "reason",
  "blocking-proceed",
]);

const SHA256_RE = /^[0-9a-f]{64}$/;

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
 * Check a triage file's TEXT against a findings document already validated by grill-findings-core.mjs `validate`, and
 * the sha256 (hex) of that findings file's bytes. Returns `{ok: true, verdict}` with
 * `verdict = {schema, verdict, counts, escalated}`, or `{ok: false, defects}`. Every element is checked, so one run
 * names every defect it can see.
 */
export function checkTriage(text, findingsDoc, findingsSha256) {
  if (typeof text !== "string") return { ok: false, defects: [defect("not-json")] };
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, defects: [defect("not-json")] };
  }
  if (!isObject(doc)) return { ok: false, defects: [defect("not-an-object")] };
  if (repeatedKeyCount(text) > 0) return { ok: false, defects: [defect("repeated-key")] };

  const findings = findingsDoc.findings;
  const defects = [];
  if (!hasExactKeys(doc, TOP_KEYS)) defects.push(defect("top-keys"));
  if (doc.schema !== SCHEMA) defects.push(defect("schema"));
  if (doc.round !== findingsDoc.round) defects.push(defect("round"));
  const shaOk = typeof doc.findings_sha256 === "string" && SHA256_RE.test(doc.findings_sha256);
  if (!shaOk || doc.findings_sha256 !== findingsSha256) defects.push(defect("findings-sha256"));
  if (!Array.isArray(doc.dispositions)) return { ok: false, defects: [...defects, defect("dispositions-not-array")] };
  if (doc.dispositions.length !== findings.length) defects.push(defect("dispositions-length"));

  const n = Math.min(doc.dispositions.length, findings.length);
  for (let i = 0; i < n; i++) {
    const d = doc.dispositions[i];
    if (!isObject(d)) {
      defects.push(defect("disposition-not-an-object", i));
      continue;
    }
    if (!hasExactKeys(d, DISPOSITION_KEYS)) defects.push(defect("disposition-keys", i));
    if (d.id !== findings[i].id) defects.push(defect("id", i));
    const dispOk = typeof d.disposition === "string" && DISPOSITIONS.includes(d.disposition);
    if (!dispOk) defects.push(defect("disposition", i));
    if (!isReason(d.reason)) defects.push(defect("reason", i));
    if (dispOk && d.disposition === "proceed" && findings[i].severity === "blocking") defects.push(defect("blocking-proceed", i));
  }
  if (defects.length > 0) return { ok: false, defects };

  const counts = { proceed: 0, replan: 0, spec: 0 };
  const escalated = [];
  doc.dispositions.forEach((d, i) => {
    counts[d.disposition]++;
    if (d.disposition !== "proceed") escalated.push(findings[i].id);
  });
  const verdict = counts.spec > 0 ? "spec" : counts.replan > 0 ? "replan" : "proceed";
  return { ok: true, verdict: { schema: VERDICT_SCHEMA, verdict, counts, escalated } };
}

/**
 * The skeleton a triage stage fills: the findings' round, the digest, and one element per finding with its id and two
 * empty strings. Not a valid triage until every disposition and reason is filled.
 */
export function skeleton(findingsDoc, findingsSha256) {
  return {
    schema: SCHEMA,
    round: findingsDoc.round,
    findings_sha256: findingsSha256,
    dispositions: findingsDoc.findings.map((f) => ({ id: f.id, disposition: "", reason: "" })),
  };
}

/** A defect list as one line of codes, `code` or `code@<index>`, at most 20 then a count. Values never appear. */
export function formatDefects(defects) {
  const shown = defects.slice(0, 20).map((d) => (d.index === undefined ? d.code : `${d.code}@${d.index}`));
  const more = defects.length > 20 ? ` and ${defects.length - 20} more` : "";
  return `${shown.join(", ")}${more}`;
}

/** One fixed repair hint per defect code. Keys are exactly DEFECT_CODES (a test holds the two equal). */
export const DEFECT_HINTS = Object.freeze({
  "not-json": "the file must be one JSON document",
  "repeated-key": "no object may repeat a key; keep one copy of each",
  "not-an-object": `the document must be an object: {"schema", "round", "findings_sha256", "dispositions"}`,
  "top-keys": `the top level holds exactly ${TOP_KEYS.join(", ")}`,
  schema: `"schema" must be "${SCHEMA}"`,
  round: `"round" must equal grill-findings.json's round`,
  "findings-sha256": "findings_sha256 must be the sha256 of grill-findings.json's bytes; re-run `grill-triage.mjs skeleton`",
  "dispositions-not-array": `"dispositions" must be an array ([] when there are no findings)`,
  "dispositions-length": "dispositions must hold one element per finding, in the findings file's order",
  "disposition-not-an-object": "each disposition must be an object",
  "disposition-keys": `each disposition holds exactly ${DISPOSITION_KEYS.join(", ")}`,
  id: "element i must carry finding i's id, in the findings file's order; never reorder or skip one",
  disposition: `disposition must be one of ${DISPOSITIONS.join(", ")}`,
  reason: `reason must be one non-blank line of at most ${REASON_MAX} characters`,
  "blocking-proceed": "a finding the grill rated blocking may not be proceed; use replan or spec",
});

/** The hint lines for a defect list: one per distinct code, in first-seen order, each `  <code>: <hint>`. */
export function defectHints(defects) {
  const seen = [];
  for (const d of defects) if (!seen.includes(d.code)) seen.push(d.code);
  return seen.map((c) => `  ${c}: ${Object.hasOwn(DEFECT_HINTS, c) ? DEFECT_HINTS[c] : "unknown code"}`);
}
