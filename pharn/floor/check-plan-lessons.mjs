#!/usr/bin/env node
// pharn/floor/check-plan-lessons.mjs — the deterministic check that a PLAN DECLARES which promoted
// lessons it applied.
//
// Floor primitive (ARCHITECTURE §2): #3 (enum / regex) — the `applied_lessons` field must be PRESENT in
// the plan's structured header, must match a fixed grammar (`none` | a list of `L<n>` ids), and every
// cited id must EXIST as a `## L<n> ` heading in the lessons file. It is the floor reduction of the §6
// plan-artifact row's `applied_lessons` key field: a plan either cites the lessons it applied or says
// `none` — silent omission becomes deterministically impossible. Cited, not restated (P4).
//
// WHY this exists (P7 — a real, observed failure, not a hypothetical): lessons are promoted to canon with
// full provenance, but nothing downstream was ever forced to CONSUME them. `lessons-learned.md` L1
// ("add a meta-doc sweep to the /plan discovery step") sat unapplied in canon while neither plan stage so
// much as READ the file. L1 is the proof that promoted lessons rot silently. This checker makes the
// consumption structural.
//
// NON-LLM. Node stdlib only (fs). No network, no eval, no deps, no child processes.
//
// ── Honest scope (P0) — the split this file must never blur ───────────────────────────────────────────
// FLOOR (what the exit code guarantees): the field is PRESENT, WELL-FORMED, every cited id RESOLVES
//   to a real lesson heading, and every cited id is REFERENCED in the plan BODY. All four are
//   enum/regex/membership tests.
// ADVISORY (what it can NEVER check): whether the lessons were GENUINELY applied, and whether a `none`
//   is JUSTIFIED. A plan may cite [L1] having ignored L1 completely and this checker will pass it — that
//   is grill/review territory, never this file's. "passed check-plan-lessons" means ONLY "the plan
//   declared its lesson application in a well-formed way", NEVER "the plan applied its lessons" — that
//   conflation is the P0 disease this repo exists to prevent.
//
// ── Sub-check (D), and its bound stated in the same breath (P0) ───────────────────────────────────────
// (D) requires each cited `L<n>` to appear in the plan BODY, not only in the structured header. It makes
// a citation COST something: before it, `applied_lessons: [L1, L2, L3]` could be pasted into a header
// whose body never mentions a lesson, and the plan passed. It is emphatically NOT proof the lesson was
// read — a body line reading `L3: considered.` satisfies it, and that is not a defect to be patched
// later but the honest ceiling of a substring test. It raises the floor's PRICE, it does not measure
// comprehension. Anything stronger is an eval, not a floor primitive.
//
// HONEST TRIGGER (P7), because this file's own header sets the standard: (D) was NOT added in response
// to an observed failure. Measured over the 150 committed PLAN.md files in this repo at the time it was
// written, 52 declared at least one cited id and ZERO omitted a cited id from the body — the convention
// held on discipline alone in 52 consecutive opportunities, so lessons-learned L20's "the second
// occurrence is the trigger" bar was NOT met (the occurrence count was zero). It was added at the
// explicit, repeated direction of the human maintainer, which is a legitimate authority under P5 (the
// terminal fallback of any chain is ASK THE HUMAN, and the human answered) — but it is not a dogfood or
// eval failure, and this comment says so rather than manufacturing a trigger after the fact.
// Two clocks: this checker's VERDICT is floor; a plan command's ACT of invoking it is ADVISORY
//   orchestration (exactly as /pharn-plan reads check-spec-approved).
//
// ── Trust (P2) ───────────────────────────────────────────────────────────────────────────────────────
// The PLAN and the lessons file are untrusted DATA. The verdict ranges ONLY over the enum-gated value of
// one field (regex-gated to `none` | `[L<n>…]` BEFORE any use) and over heading MEMBERSHIP — never over
// either file's prose meaning. An instruction-looking needle in the field is rejected as
// not-matching-the-grammar; a needle anywhere else is never read at all.
//
// ── Structured-location discipline (lessons-learned.md L6, cited not restated — P4) ──────────────────
// The field is read ONLY from a plan's STRUCTURED HEADER, never grepped from the file at large:
//   1. the `---`-fenced YAML frontmatter (the product PLAN shape), else
//   2. the leading bullet block — `- key: value` lines before the first `##` heading (the dev PLAN shape).
// Fenced code blocks inside that region are SKIPPED. A line reading `applied_lessons: [L1]` in prose, in
// a fenced example, or below the first heading is DATA ABOUT the field, not a DECLARATION of it — the
// same membership discipline count-verifiers.mjs applies to `role:`.
//
// Usage:
//   node pharn/floor/check-plan-lessons.mjs <PLAN.md> <lessons-learned.md>
//       exit 0 (GREEN) iff `applied_lessons` is present and well-formed AND (it is `none`, or every
//       cited `L<n>` both has a `## L<n> ` heading in the lessons file AND is referenced in the plan
//       body); exit 1 (RED) otherwise.
//
// Exit: 0 only when the declaration holds; 1 on every refusal (fail-closed).

import { readFileSync } from "node:fs";
import { FM_RE, stripBom } from "./frontmatter-core.mjs";

const FIELD = "applied_lessons";

// The value grammar — the enum-gate (primitive #3). `L` is CASE-SENSITIVE and at least one id is
// required, so `[l1]` and `[]` both fail closed. Inner whitespace is tolerated.
const NONE_RE = /^none$/;
const LIST_RE = /^\[\s*L\d+\s*(?:,\s*L\d+\s*)*\]$/;
const EMPTY_LIST_RE = /^\[\s*\]$/;

// A lesson heading: `## L<n> — <title>`. The trailing space is required so `## L1x` cannot match `L1`.
const HEADING_RE = /^## L(\d+) /;

function red(msg) {
  console.log(`RED — ${msg}`);
  return 1;
}

// Strip a trailing ` # comment` (the dev PLAN header carries them, e.g. `- spec_content_hash: <h> # fix #4`)
// and any surrounding quotes. Deterministic; no LLM.
function clean(v) {
  return v
    .replace(/\s+#.*$/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

// Both parsers return `{ raw, body }` — the declared VALUE plus the plan's BODY REGION, the two things
// the gate needs. `body` is deterministically delimited (never "the whole file"): the header region that
// carries the declaration is EXCLUDED, so the declaration line can never satisfy its own sub-check (D).
//
// (1) The product PLAN shape: the field as a frontmatter key. Body = everything after the frontmatter.
function fromFrontmatter(text) {
  const m = text.match(FM_RE);
  if (!m) return undefined;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (kv && kv[1] === FIELD) return { raw: clean(kv[2]), body: text.slice(m[0].length) };
  }
  return undefined;
}

// (2) The dev PLAN shape: the field as a `- key: value` bullet in the leading header block. The region
// ENDS at the first `##`+ heading, and fenced blocks within it are skipped — so only a real declaration
// in the structured header registers (L6).
// Body = from that first `##` heading onward, so the leading bullet block is excluded exactly as the
// frontmatter is above. The heading index is captured in the SAME pass that tracks fences — a `##`
// inside a fenced block ends nothing, so it can neither terminate the header nor start the body.
function fromBulletHeader(text) {
  const m = text.match(FM_RE);
  const after = m ? text.slice(m[0].length) : text;
  const lines = after.split(/\r?\n/);
  let inFence = false;
  let raw;
  let bodyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{2,}\s/.test(line)) {
      bodyStart = i; // the structured header region ends at the first `##` heading
      break;
    }
    const kv = line.match(/^-[ \t]+([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (kv && kv[1] === FIELD && raw === undefined) raw = clean(kv[2]);
  }
  if (raw === undefined) return undefined;
  return { raw, body: bodyStart === -1 ? "" : lines.slice(bodyStart).join("\n") };
}

// Collect the lesson ids that actually EXIST, as a membership set (P5 — a set test, not a substring scan).
function declaredLessonIds(text) {
  const ids = new Set();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(HEADING_RE);
    if (m) ids.add(`L${m[1]}`);
  }
  return ids;
}

function gate(planPath, lessonsPath) {
  let planText;
  try {
    planText = stripBom(readFileSync(planPath, "utf8"));
  } catch (e) {
    return red(`PLAN is unreadable (${planPath}): ${e.message}`);
  }

  // Frontmatter first, then the leading bullet block. Both are structured header regions, so this needs
  // no fragile "does this file have frontmatter" branch and handles BOTH plan shapes uniformly.
  const parsed = fromFrontmatter(planText) ?? fromBulletHeader(planText);
  const raw = parsed?.raw;
  const planBody = parsed?.body ?? "";

  // (A) PRESENCE — the field is mandatory. The VALUE `none` is the escape; OMISSION is not.
  if (raw === undefined) {
    return red(
      `PLAN declares no \`${FIELD}\` in its structured header (${planPath}) — the field is MANDATORY. ` +
        `Add it to the frontmatter (product PLAN) or the leading bullet block (dev PLAN), as either ` +
        `\`${FIELD}: none\` or \`${FIELD}: [L1, L2]\`. Omission is not the escape — \`none\` is.`
    );
  }

  // (B) SHAPE — the enum-gate, applied BEFORE the value is used for anything (P2).
  if (NONE_RE.test(raw)) {
    console.log(
      `GREEN — ${FIELD}: none (${planPath}); the declaration is well-formed. NOTE (P0): that \`none\` is ` +
        `JUSTIFIED is advisory — this checker cannot judge it.`
    );
    return 0;
  }
  if (EMPTY_LIST_RE.test(raw)) {
    return red(
      `PLAN's \`${FIELD}\` is the empty list \`[]\` (${planPath}) — use \`none\` instead. \`[]\` and ` +
        `\`none\` read alike, but only \`none\` is the deliberate declaration this field exists to force; ` +
        `admitting \`[]\` would reopen the silent omission as a quieter spelling.`
    );
  }
  if (!LIST_RE.test(raw)) {
    return red(
      `PLAN's \`${FIELD}\` is malformed (${planPath}): ${JSON.stringify(raw)} — expected \`none\` or a ` +
        `list of lesson ids like \`[L1]\` / \`[L1, L2]\` (uppercase \`L\` followed by digits).`
    );
  }

  // (C) EXISTENCE — every cited id must resolve to a real lesson heading. De-duplicated first.
  const ids = [...new Set(raw.match(/L\d+/g))];

  let lessonsText;
  try {
    lessonsText = stripBom(readFileSync(lessonsPath, "utf8"));
  } catch (e) {
    return red(
      `PLAN's \`${FIELD}\` cites ${ids.join(", ")} but the lessons file is unreadable (${lessonsPath}): ` +
        `${e.message} — cite only ids that exist, or declare \`none\` if this project has no memory-bank yet.`
    );
  }

  const present = declaredLessonIds(lessonsText);
  const missing = ids.filter((id) => !present.has(id));
  if (missing.length > 0) {
    return red(
      `PLAN's \`${FIELD}\` cites ${missing.join(", ")} — no matching \`## <id> \` heading in ` +
        `${lessonsPath} (it declares ${present.size} lesson(s)). Cite only promoted lessons.`
    );
  }

  // (D) BODY REFERENCE — a citation must COST a line. Every cited id must also appear in the plan BODY,
  // so a header list cannot be pasted over a body that never mentions a lesson.
  //
  // `\b` anchors both ends, which is load-bearing on a corpus that has passed L9: without the trailing
  // boundary `L3` would be satisfied by the text `L33`, silently GREENing a citation the plan never
  // discusses. Interpolating `id` into a RegExp is safe by CONSTRUCTION, not by trust (P2): every member
  // of `ids` was produced by `raw.match(/L\d+/g)` AFTER `raw` passed LIST_RE, so an id is always
  // `L` + digits — there is no metacharacter to escape and no path by which plan text reaches this
  // pattern unvalidated.
  const unreferenced = ids.filter((id) => !new RegExp(`\\b${id}\\b`).test(planBody));
  if (unreferenced.length > 0) {
    return red(
      `PLAN's \`${FIELD}\` cites ${unreferenced.join(", ")} but the plan BODY never mentions ` +
        `${unreferenced.length > 1 ? "them" : "it"} (${planPath}) — a cited lesson must cost a body line ` +
        `saying HOW it was applied. Add that line for each id above, or drop the id from the ` +
        `declaration. NOTE: the header region that carries the declaration is deliberately not the body, ` +
        `so the declaration cannot satisfy itself.`
    );
  }

  console.log(
    `GREEN — ${FIELD}: ${ids.join(", ")} (${planPath}); all ${ids.length} cited id(s) resolve in ` +
      `${lessonsPath} and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY ` +
      `applied is advisory — this checker verifies the DECLARATION, never the application; a body line ` +
      `reading "${ids[0]}: considered." satisfies the reference check.`
  );
  return 0;
}

function main() {
  const planPath = process.argv[2];
  const lessonsPath = process.argv[3];
  if (!planPath || !lessonsPath) {
    console.log("RED — usage: node pharn/floor/check-plan-lessons.mjs <PLAN.md> <lessons-learned.md>");
    return 1;
  }
  return gate(planPath, lessonsPath);
}

process.exit(main());
