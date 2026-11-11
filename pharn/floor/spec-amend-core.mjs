// pharn/floor/spec-amend-core.mjs — the supervisor's `amend-spec` decision, carried out once per full /pharn-loop run
// (7.10.0, loop-amend-spec): which files an amend moves aside, how its state reads, and the rule that keeps it
// append-only. The PURE half: no file, process or network I/O; the CLI half is `pharn/floor/spec-amend.mjs` (P3).
//
// CONTRACT: `pharn/pharn-contracts/supervisor.md`, "Amend-spec (7.10.0)" — cited, not restated (P4).
//
// WHY (P7): a triage verdict of `spec` says no plan can fix the finding without changing the SPEC, and until 7.10.0 the
// supervisor could only carry it (`proceed-at-risk`) or stop. `amend-spec` lets the run append acceptance criteria and
// re-run its front, bounded by what this file checks.
//
// THE NAMES (L29): an amend copies SPEC.md to SPEC.a1.md and renames the round's files — grill-round-core.mjs
// LIVE_NAMES and ARCHIVE_NAMES — and SUPERVISOR.json to their `.a1` names, so the re-plan count restarts at 0 and the
// closeout does not read the pre-amend decision. AMEND_NAMES is derived from those lists and frozen; every artifact list
// that must know it is bound to it by a test (spec-amend.test.mjs).
//
// ONCE (L35): "amended" is SPEC.a1.md on disk, never a counter file. supervisor-core.mjs refuses a second `amend-spec`
// (`amend-used`) and `begin` refuses an existing archive.
//
// APPEND-ONLY (L36): the amended SPEC's `## Intent` and `## Scope` are identical, line for line, to the archive's (both
// absent counts as identical); the archive's `## Acceptance Criteria` lines, trailing blank lines dropped, are a prefix of
// the new section's lines; every archived criterion keeps its id, position, text and verify level; and at least one
// criterion is added (L34: a re-pin of the same criteria is not an amend).
//
// REFUSALS NAME CODES AND AC IDS, NEVER TEXT (P2, L62): criterion lines are untrusted SPEC text a model wrote from
// untrusted findings. A defect carries a code and at most an AC id; the commit line carries ids that match AC_ID_RE.
//
// FLOOR (primitive #3, with #2's kind for the pin the CLI re-checks): the archive set, the state token, the
// append-only rule, the one-amend rule. ADVISORY: whether the added criteria answer the findings (the next grill's and
// triage's judgment, L43 — agreement with the run's own archive, never truth).

import { ARCHIVE_NAMES, LIVE_NAMES } from "./grill-round-core.mjs";
import { specAcceptanceCriteria, specAcceptanceCriteriaText, specSectionLines } from "./spec-template-core.mjs";
import { ARTIFACT as SUPERVISOR } from "./supervisor-core.mjs";

export const STATUS_SCHEMA = "pharn-spec-amend-status/1";
export const BEGIN_SCHEMA = "pharn-spec-amend-begin/1";
export const CHECK_SCHEMA = "pharn-spec-amend-check/1";
export const SPEC = "SPEC.md";
export const STATES = Object.freeze(["none", "pending", "applied"]);

/** `X.ext` → `X.a1.ext` (the extension is the text after the last dot). */
export function amendName(name) {
  const i = name.lastIndexOf(".");
  return `${name.slice(0, i)}.a1${name.slice(i)}`;
}

export const SPEC_ARCHIVE = amendName(SPEC);
export const SUPERVISOR_ARCHIVE = amendName(SUPERVISOR);
/** The files `begin` renames (each only when present), in this order. */
export const MOVED_NAMES = Object.freeze([...LIVE_NAMES, ...ARCHIVE_NAMES, SUPERVISOR]);
/** Every name an amend can leave in the feature directory: 14, SPEC.a1.md first. Frozen. */
export const AMEND_NAMES = Object.freeze([SPEC_ARCHIVE, ...MOVED_NAMES.map(amendName)]);

/** An AC id as the template writes it. */
export const AC_ID_RE = /^AC-[1-9][0-9]*$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Exit codes, shared by the three subcommands. */
export const EXIT = Object.freeze({ ok: 0, red: 1, usage: 2 });

export const DEFECT_CODES = Object.freeze([
  "not-regular",
  "partial-archive",
  "amend-used",
  "not-amend-spec",
  "supervisor-invalid",
  "not-pending",
  "criteria-unreadable",
  "intent-changed",
  "scope-changed",
  "criterion-removed",
  "criterion-changed",
  "no-criterion-added",
  "not-approved",
  "rename-failed",
  "rename-partial",
]);

/** One fixed repair hint per defect code. Keys are exactly DEFECT_CODES (a test holds the two equal). */
export const DEFECT_HINTS = Object.freeze({
  "not-regular": "SPEC.md or an amend name is a link, a directory or another non-regular file",
  "partial-archive": `the amend archive is incomplete: ${SPEC_ARCHIVE} and ${SUPERVISOR_ARCHIVE} exist together or not at all`,
  "amend-used": `this run already amended its SPEC (${SPEC_ARCHIVE} exists); an amend runs once`,
  "not-amend-spec": "SUPERVISOR.json's checked decision is not amend-spec; only that decision begins an amend",
  "supervisor-invalid": "SUPERVISOR.json is absent or does not check; run supervisor.mjs check for the codes",
  "not-pending": `no amend has begun (${SPEC_ARCHIVE} is absent); run spec-amend.mjs begin first`,
  "criteria-unreadable": "both SPECs must be templated with exactly one ## Acceptance Criteria section",
  "intent-changed": `## Intent must stay identical to ${SPEC_ARCHIVE}'s; an amend appends criteria only`,
  "scope-changed": `## Scope must stay identical to ${SPEC_ARCHIVE}'s; an amend appends criteria only`,
  "criterion-removed": "every archived criterion must stay, with its id, in its place; restore it",
  "criterion-changed": "every archived criterion keeps its exact lines and verify level; append a new criterion instead",
  "no-criterion-added": "an amend adds at least one acceptance criterion after the archived ones",
  "not-approved": "the amended SPEC.md must be Approved and pinned; run check-spec-approved.mjs for the reason",
  "rename-failed": "a rename failed and every move was undone; nothing changed, so begin may be run again",
  "rename-partial": "a rename failed and a move could not be undone; the feature directory needs a person",
});

function defect(code, id = null) {
  return id === null ? { code } : { code, id };
}

/**
 * The amend state from what is on disk. `present` is a Set of the AMEND_NAMES that exist as regular files; `texts`,
 * read only when the archive is present, is `{spec, archive}` — the two files' text. `pending` means no criterion has
 * been appended yet: the two `## Acceptance Criteria` sections still hold the same lines (trailing blank lines
 * dropped); a frontmatter edit (the re-open to Draft) leaves it pending. Returns `{ok: true, state}` or
 * `{ok: false, defects}`.
 */
export function amendState(present, texts = null) {
  const hasSpec = present.has(SPEC_ARCHIVE);
  if (!hasSpec) return present.size === 0 ? { ok: true, state: "none" } : { ok: false, defects: [defect("partial-archive")] };
  if (!present.has(SUPERVISOR_ARCHIVE)) return { ok: false, defects: [defect("partial-archive")] };
  return { ok: true, state: texts !== null && sameCriteria(texts.spec, texts.archive) ? "pending" : "applied" };
}

/** Do two SPECs hold the same `## Acceptance Criteria` lines (trailing blank lines dropped)? False when either has none. */
function sameCriteria(a, b) {
  const x = specSectionLines(a, "acceptance criteria");
  const y = specSectionLines(b, "acceptance criteria");
  return x !== null && y !== null && sameLines(trimTrailingBlank(x), trimTrailingBlank(y));
}

function sameLines(a, b) {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((l, i) => l === b[i]);
}

function trimTrailingBlank(lines) {
  let n = lines.length;
  while (n > 0 && lines[n - 1].trim() === "") n--;
  return lines.slice(0, n);
}

/** Each criterion: id, its non-verify lines and its verify level. `null` when the SPEC is not readable as templated. */
function criteriaOf(text) {
  const t = specAcceptanceCriteriaText(text);
  const l = specAcceptanceCriteria(text);
  // One section parse each (the same parseAcItems over the same section), so the two item lists align by index.
  if (!t.templated || t.sections !== 1) return null;
  // Trailing blank lines are dropped: the last criterion's block runs to the next heading, so an append would move them.
  return t.items.map((it, i) => ({ id: it.id, lines: trimTrailingBlank(it.lines), level: l.items[i].level }));
}

/**
 * Is `specText` an append-only amend of `archiveText`? Returns `{ok: true, added: [AC ids], kept: <n>}` or
 * `{ok: false, defects}`. Every rule is checked; a defect names a code and, for a criterion, its archived AC id.
 * Approval and the pin are the CLI's (check-spec-approved.mjs, reused).
 */
export function checkAmend(archiveText, specText) {
  const defects = [];
  if (!sameLines(specSectionLines(archiveText, "intent"), specSectionLines(specText, "intent"))) defects.push(defect("intent-changed"));
  if (!sameLines(specSectionLines(archiveText, "scope"), specSectionLines(specText, "scope"))) defects.push(defect("scope-changed"));
  const before = criteriaOf(archiveText);
  const after = criteriaOf(specText);
  const beforeLines = specSectionLines(archiveText, "acceptance criteria");
  const afterLines = specSectionLines(specText, "acceptance criteria");
  if (before === null || after === null || beforeLines === null || afterLines === null) {
    return { ok: false, defects: [...defects, defect("criteria-unreadable")] };
  }
  const itemDefects = [];
  before.forEach((b, i) => {
    const a = after[i];
    if (!after.some((x) => x.id === b.id)) itemDefects.push(defect("criterion-removed", b.id));
    else if (a === undefined || a.id !== b.id || a.level !== b.level || !sameLines(a.lines, b.lines)) {
      itemDefects.push(defect("criterion-changed", b.id));
    }
  });
  const kept = trimTrailingBlank(beforeLines);
  const prefix = kept.every((l, i) => afterLines[i] === l);
  if (!prefix && itemDefects.length === 0) itemDefects.push(defect("criterion-changed"));
  defects.push(...itemDefects);
  const added = after.slice(before.length).map((x) => x.id);
  if (itemDefects.length === 0 && added.length === 0) defects.push(defect("no-criterion-added"));
  if (defects.length > 0) return { ok: false, defects };
  return { ok: true, added, kept: before.length };
}

/** The added criteria's lines (untrusted SPEC text: a caller fences them as DATA, never prints them in a refusal). */
export function addedCriteriaLines(specText, added) {
  const sec = specAcceptanceCriteriaText(specText);
  return sec.items.filter((it) => added.includes(it.id)).map((it) => ({ id: it.id, lines: trimTrailingBlank(it.lines) }));
}

/**
 * The commit message's amend paragraph, or null when an input is outside its grammar (the caller then refuses to
 * commit). Only ids matching AC_ID_RE and the slug reach it (P2).
 */
export function amendLine(feature, added) {
  if (typeof feature !== "string" || !SLUG_RE.test(feature)) return null;
  if (!Array.isArray(added) || added.length === 0) return null;
  if (!added.every((id) => typeof id === "string" && AC_ID_RE.test(id))) return null;
  return `spec amended once on the supervisor's decision: added ${added.join(", ")} — see pharn/features/${feature}/${SPEC_ARCHIVE}`;
}

/** A defect list as one line of codes, `code` or `code@<AC id>`, at most 20 then a count. Text never appears. */
export function formatDefects(defects) {
  const shown = defects.slice(0, 20).map((d) => (d.id === undefined ? d.code : `${d.code}@${d.id}`));
  const more = defects.length > 20 ? ` and ${defects.length - 20} more` : "";
  return `${shown.join(", ")}${more}`;
}

/** The hint lines for a defect list: one per distinct code, in first-seen order, each `  <code>: <hint>`. */
export function defectHints(defects) {
  const seen = [];
  for (const d of defects) if (!seen.includes(d.code)) seen.push(d.code);
  return seen.map((c) => `  ${c}: ${Object.hasOwn(DEFECT_HINTS, c) ? DEFECT_HINTS[c] : "unknown code"}`);
}
