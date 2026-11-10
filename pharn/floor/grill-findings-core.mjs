// pharn/floor/grill-findings-core.mjs — the shape of a grill's findings file, `pharn/features/<name>/grill-findings.json`,
// its rendering into `GRILL.md`, and the comparisons `grill-findings.mjs check` makes (7.6.0, grill-finding-ids). The
// PURE half: no file, process or network I/O. The CLI half is `pharn/floor/grill-findings.mjs` (P3).
//
// CONTRACT: `pharn/pharn-contracts/finding-shape.md`, "Emission — grill-findings.json" — cited, not restated (P4). In
// short: `{schema, round, findings: [{id, type, rule_id, severity, file, problem, evidence}, …]}`, each element the
// finding object plus an `id` that must be exactly `G<round>-<i+1>` for element i.
//
// WHY (P7): /pharn-loop's grill went floor-only in 6.45.0 because no stage read its findings before the build
// (stage-agent-core.mjs, header). Making a later stage act on a finding needs two things nothing provided: a NAME for
// each finding, and a set of findings code can ENUMERATE. Before this file, findings existed only as model-written YAML
// inside GRILL.md prose, which no floor code parsed (the repo has no YAML parser). Part 1 of restore-loop-grill; part 2
// (triage) is the consumer. In this increment nothing gates on the file.
//
// ONE SOURCE (L35): the JSON is the findings' source; GRILL.md's findings section is DERIVED from it by `render` and
// byte-compared by `sectionDefects`, the CURRENT-STATE / docs:check pattern. The scanner findings a check expects come
// from `grill-scan.mjs`'s `scanFindings`, the builder that prints them; this module receives them as data.
//
// GUARD FIRST (L14, corrected by L82): every enum-gated value passes the control-character guard before any anchored
// regex or set test. JavaScript's `$` does not match before a trailing newline (measured); the guard stays first because
// RULE_ID_OK trims before its regex, and a trim before an anchored test would re-admit a newline.
//
// REFUSALS NAME CODES, NEVER VALUES (P2, L62): a defect is a closed code plus, for an element, its index. No value read
// from the file is quoted into a defect, so no crafted value can throw while being reported or forge a line of output.
//
// FLOOR (primitive #3): `validate` — closed keys at both levels, a repeated key at any depth refused, the schema token,
// the round's range, the positional ids, the enum fields (TYPE_ENUM, SEVERITY_ENUM and RULE_ID_OK, imported from
// merge-findings.mjs so no enum is copied), the `path:line` shape, the free-text bounds. Content equality (primitive #2's
// kind, by byte compare): `sectionDefects`. Equality on the six finding fields: `missingScannerFindings`.
// ADVISORY: that a grill writes the file, lists every finding it formed (a finding never written is invisible here),
// renders it, or runs the check. NOT A CLAIM: that a finding is right, that its id names the same concern in another
// round, or that `file` resolves (a shape only — finding-shape.md, "What `type` and `file` buy today").

import { RULE_ID_OK, SEVERITY_ENUM, TYPE_ENUM } from "./merge-findings.mjs";

export const SCHEMA = "pharn-grill-findings/1";
export const TOP_KEYS = Object.freeze(["schema", "round", "findings"]);
export const FINDING_KEYS = Object.freeze(["id", "type", "rule_id", "severity", "file", "problem", "evidence"]);
export const ROUND_MAX = 99;
export const FINDINGS_MAX = 500;
export const TEXT_MAX = 2000;
export const FILE_MAX = 400;

export const BEGIN_MARKER =
  "<!-- GRILL-FINDINGS:BEGIN — rendered by pharn/floor/grill-findings.mjs from grill-findings.json; do not edit -->";
export const END_MARKER = "<!-- GRILL-FINDINGS:END -->";
export const EMPTY_LINE = "Findings: none.";

/** Every defect code `validate`, `sectionDefects` and `missingScannerFindings` can report — closed (L36). */
export const DEFECT_CODES = Object.freeze([
  "not-json",
  "repeated-key",
  "not-an-object",
  "top-keys",
  "schema",
  "round",
  "findings-not-array",
  "too-many-findings",
  "finding-not-an-object",
  "finding-keys",
  "id",
  "type",
  "rule_id",
  "severity",
  "file",
  "problem",
  "evidence",
  "grill-markers",
  "grill-section-differs",
  "scanner-finding-missing",
]);

/** True iff `s` holds a C0 control character or DEL. A charcode scan, so the source holds no control-char literal. */
function hasControlChar(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

/** A clean single-line string of 1..max characters. The precondition of every enum-gated check (L14). */
function isClean(v, max) {
  return typeof v === "string" && v.length >= 1 && v.length <= max && !hasControlChar(v);
}

/** Free text: clean, and not blank. */
function isText(v) {
  return isClean(v, TEXT_MAX) && v.trim() !== "";
}

/** `path:line` by SHAPE: no leading space or colon, no colon in the path, a positive line. Never resolved. */
const FILE_RE = /^[^\s:][^:]*:[1-9]\d*$/;
function isFile(v) {
  return isClean(v, FILE_MAX) && FILE_RE.test(v);
}

/** A plain JSON object (not null, not an array). */
function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Exactly these own keys, no more, no fewer. */
function hasExactKeys(o, keys) {
  const got = Object.keys(o);
  return got.length === keys.length && keys.every((k) => Object.hasOwn(o, k));
}

/**
 * How many times any object in a JSON text repeats a key, at ANY depth. JSON.parse keeps the last copy of a repeated
 * key, so `{"severity":"blocking",…,"severity":"minor"}` reads as minor while a reader of the file may see blocking.
 * Called only on a text JSON.parse accepted, so it is a plain string / bracket walk. Each key is decoded with
 * JSON.parse, so a `\u`-escaped spelling is the same key. Total (L62): a decode that throws falls back to the raw token.
 * check-loop.mjs refuses a repeat at the top level only; this file holds objects inside an array, so every depth counts.
 */
export function repeatedKeyCount(text) {
  const stack = [];
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      const top = stack[stack.length - 1];
      if (top && top.keys && top.expectKey) {
        let key;
        try {
          key = JSON.parse(text.slice(i, j + 1));
        } catch {
          key = text.slice(i + 1, j);
        }
        if (top.keys.has(key)) n++;
        else top.keys.add(key);
        top.expectKey = false;
      }
      i = j;
    } else if (c === "{") stack.push({ keys: new Set(), expectKey: true });
    else if (c === "[") stack.push({ keys: null, expectKey: false });
    else if (c === "}" || c === "]") stack.pop();
    else if (c === ",") {
      const top = stack[stack.length - 1];
      if (top && top.keys) top.expectKey = true;
    }
  }
  return n;
}

/** One defect: a closed code, and the element index when it concerns one finding. */
function defect(code, index = null) {
  return index === null ? { code } : { code, index };
}

/**
 * Validate a findings file's TEXT. Returns `{ok: true, doc}` or `{ok: false, defects}`, each defect `{code[, index]}`.
 * Every element is checked, so one run names every defect it can see.
 */
export function validate(text) {
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
  const roundOk = Number.isInteger(doc.round) && doc.round >= 1 && doc.round <= ROUND_MAX;
  if (!roundOk) defects.push(defect("round"));
  if (!Array.isArray(doc.findings)) return { ok: false, defects: [...defects, defect("findings-not-array")] };
  if (doc.findings.length > FINDINGS_MAX) return { ok: false, defects: [...defects, defect("too-many-findings")] };
  doc.findings.forEach((f, i) => {
    if (!isObject(f)) {
      defects.push(defect("finding-not-an-object", i));
      return;
    }
    if (!hasExactKeys(f, FINDING_KEYS)) defects.push(defect("finding-keys", i));
    // The id is positional: element i carries exactly G<round>-<i+1>, so ids are unique, contiguous and in file order.
    // With an invalid round there is nothing to compare against; `round` is already reported.
    if (roundOk && f.id !== `G${doc.round}-${i + 1}`) defects.push(defect("id", i));
    if (!(isClean(f.type, 64) && TYPE_ENUM.includes(f.type))) defects.push(defect("type", i));
    if (!(isClean(f.severity, 64) && SEVERITY_ENUM.has(f.severity))) defects.push(defect("severity", i));
    if (!RULE_ID_OK(f.rule_id)) defects.push(defect("rule_id", i));
    if (!isFile(f.file)) defects.push(defect("file", i));
    if (!isText(f.problem)) defects.push(defect("problem", i));
    if (!isText(f.evidence)) defects.push(defect("evidence", i));
  });
  return defects.length === 0 ? { ok: true, doc } : { ok: false, defects };
}

/** One free-text value as one quoted line: JSON escaping (a valid YAML double-quoted scalar), plus U+2028 / U+2029,
 *  which JSON.stringify leaves raw and some renderers break a line on. Called only on validated strings. */
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
function quoted(s) {
  return JSON.stringify(s).split(LS).join("\\u2028").split(PS).join("\\u2029");
}

/**
 * The GRILL.md findings section for a VALIDATED doc, markers included, ending in a newline. Every free-text value is
 * one quoted line, so no rendered line can open or close a fence or match a marker line.
 */
export function render(doc) {
  const lines = [BEGIN_MARKER];
  if (doc.findings.length === 0) lines.push(EMPTY_LINE);
  else {
    lines.push("```yaml");
    for (const f of doc.findings) {
      lines.push(
        `- id: ${f.id}`,
        `  type: ${f.type}`,
        `  rule_id: ${quoted(f.rule_id)}`,
        `  severity: ${f.severity}`,
        `  file: ${quoted(f.file)}`,
        `  problem: ${quoted(f.problem)}`,
        `  evidence: ${quoted(f.evidence)}`
      );
    }
    lines.push("```");
  }
  lines.push(END_MARKER);
  return `${lines.join("\n")}\n`;
}

/**
 * Compare GRILL.md's findings section with `render(doc)`. GRILL.md must hold exactly one BEGIN and one END marker line,
 * BEGIN first; CRLF line ends are folded to LF first (a `core.autocrlf` checkout). Returns a defect list, empty when
 * the section is byte-identical. A marker quoted elsewhere in GRILL.md makes two marker lines: refused (fail-closed).
 */
export function sectionDefects(grillText, doc) {
  const lines = String(grillText).split("\r\n").join("\n").split("\n");
  const begins = [];
  const ends = [];
  lines.forEach((l, i) => {
    if (l === BEGIN_MARKER) begins.push(i);
    if (l === END_MARKER) ends.push(i);
  });
  if (begins.length !== 1 || ends.length !== 1 || begins[0] >= ends[0]) return [defect("grill-markers")];
  const section = `${lines.slice(begins[0], ends[0] + 1).join("\n")}\n`;
  return section === render(doc) ? [] : [defect("grill-section-differs")];
}

/**
 * The scanner findings (`grill-scan.mjs` `scanFindings` output) with no element equal to them on all six finding fields.
 * A multiset match: each element answers for at most one expected finding. Returns `[{code, index}]`, `index` being the
 * position in `expected` — the caller names it from the expected object, which holds no plan text.
 */
export function missingScannerFindings(doc, expected) {
  const used = new Set();
  const out = [];
  expected.forEach((e, k) => {
    const at = doc.findings.findIndex(
      (f, i) =>
        !used.has(i) &&
        f.type === e.type &&
        f.rule_id === e.rule_id &&
        f.severity === e.severity &&
        f.file === e.file &&
        f.problem === e.problem &&
        f.evidence === e.evidence
    );
    if (at === -1) out.push(defect("scanner-finding-missing", k));
    else used.add(at);
  });
  return out;
}

/** A defect list as one line of codes, `code` or `code@<index>`, at most 20 then a count. Values never appear. */
export function formatDefects(defects) {
  const shown = defects.slice(0, 20).map((d) => (d.index === undefined ? d.code : `${d.code}@${d.index}`));
  const more = defects.length > 20 ? ` and ${defects.length - 20} more` : "";
  return `${shown.join(", ")}${more}`;
}

/**
 * One fixed repair hint per defect code: what the field must hold (7.6.0, review A1). A code alone names the field, not
 * the accepted shape. Measured on 161 real GRILL.md files from pharn-starter (714 findings), 27 held at least one value
 * this check refuses — 57 rule_ids, mostly a bare griller name such as `testability`, and 50 files such as
 * `PLAN.md:91-98` or `PLAN.md:step 8` — so the grill's one repair round needs the shape, not only the code. Fixed
 * strings: no value from the file ever reaches a hint (P2). Keys are exactly DEFECT_CODES (a test holds the two equal).
 */
export const DEFECT_HINTS = Object.freeze({
  "not-json": "the file must be one JSON document",
  "repeated-key": "no object may repeat a key; keep one copy of each",
  "not-an-object": `the document must be an object: {"schema", "round", "findings"}`,
  "top-keys": `the top level holds exactly "schema", "round" and "findings"`,
  schema: `"schema" must be "${SCHEMA}"`,
  round: `"round" must be an integer from 1 to ${ROUND_MAX}`,
  "findings-not-array": `"findings" must be an array ([] when there are none)`,
  "too-many-findings": `"findings" holds at most ${FINDINGS_MAX} elements`,
  "finding-not-an-object": "each finding must be an object",
  "finding-keys": `each finding holds exactly ${FINDING_KEYS.join(", ")}`,
  id: "element i (from 0) must carry id G<round>-<i+1>: G1-1, G1-2, … in file order, no gaps",
  type: `type must be one of ${TYPE_ENUM.join(", ")}`,
  severity: `severity must be one of ${[...SEVERITY_ENUM].join(", ")}`,
  rule_id: "rule_id must be a principle P0..P7 or a file-qualified rule `<file>.md <ID>-<n>`; never a bare griller name",
  file: "file must be <path>:<line>, one positive line number; for a range, a step or a whole-plan concern, cite its first line",
  problem: `problem must be one non-blank line of at most ${TEXT_MAX} characters`,
  evidence: `evidence must be one non-blank line of at most ${TEXT_MAX} characters; quote a multi-line passage on one line`,
  "grill-markers": "GRILL.md must hold the rendered section exactly once, between one BEGIN and one END marker line",
  "grill-section-differs": "paste `grill-findings.mjs render`'s output into GRILL.md unchanged; never edit between the markers",
  "scanner-finding-missing": "copy every finding grill-scan.mjs printed into the file with its six fields unchanged",
});

/** The hint lines for a defect list: one per distinct code, in first-seen order, each `  <code>: <hint>`. */
export function defectHints(defects) {
  const seen = [];
  for (const d of defects) if (!seen.includes(d.code)) seen.push(d.code);
  return seen.map((c) => `  ${c}: ${Object.hasOwn(DEFECT_HINTS, c) ? DEFECT_HINTS[c] : "unknown code"}`);
}
