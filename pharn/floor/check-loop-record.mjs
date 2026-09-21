#!/usr/bin/env node
// pharn/floor/check-loop-record.mjs — the deterministic SHAPE check over a loop-record
// (`pharn/features/<name>/LOOP.md`, the artifact the product `/pharn-loop` writes at every stop).
//
// Floor/eval infrastructure — NOT a Capability (no `role:`; it lives in this floor-ignored dir, exactly
// like check-loop.mjs / check-plan-lessons.mjs / check-attestation.mjs). It is the executable SoT for
// `pharn/pharn-contracts/loop-record.md` — cited, not restated (P4).
//
// WHY THIS FILE EXISTS (P7 — stated honestly): it was identified at DESIGN time, not forced by a dogfood
// or eval failure. The observation behind it is real and reproducible by inspection — a run's SYNTHESIS
// (what was investigated and ruled out without leaving an artifact, what was learned, what the next step
// is) dies with the session while every other artifact persists — but no recorded /pharn-loop run failed
// because of it. Same standing as lessons-learned.md L8 and PRs #114/#115, which say so rather than
// dressing a design-time addition as a failure-triggered one.
//
// IT IS NOT AN INPUT TO THE STOP DECISION (structural, not discipline): check-loop.mjs's input signature
// is exactly { verify-report.json, regression-report.json, iter, cap }. It has no record parameter, so
// this checker CANNOT feed it. The record is validated AFTER the stop decision already exists. Reading a
// record's `decision` back into the loop would be the fix#3 disease; here it is impossible because the
// input does not exist.
//
// NON-LLM. Node stdlib only (fs). No network, no eval, no deps, no child processes.
//
// ── NO CROSS-TREE IMPORT (P3) ────────────────────────────────────────────────────────────────────────
// The frontmatter regex, the shape regexes, and the control-char guard below are RE-IMPLEMENTED IN-FILE.
// `.dev/floor/check-provenance.mjs` carries near-identical COMMIT_RE / DATE_RE / cleanScalar, and this
// file deliberately does NOT import them: `.dev/` is the build apparatus, excluded wholesale at packaging
// ("ship root minus .dev/"), so a product-floor checker importing from it would be GREEN in this repo and
// BROKEN in every user's install — a failure `npm run check` cannot see. Same discipline as
// check-plan-lessons.mjs re-implementing FM_RE in-file.
//
// ── Honest scope (P0) — the split this file must never blur ───────────────────────────────────────────
// FLOOR (what the exit code guarantees, GIVEN a record handed to it): the envelope's four MANDATORY
//   fields, plus the optional fifth (`cap`, ADDITIVE since the loop-decision-integrity increment — see
//   below), are shape-valid (enum membership + anchored regexes over control-char-guarded values + an
//   integer compare), and the Handoff's STRUCTURE is exactly `## Handoff` containing `### investigated`,
//   `### learned`, `### next_steps` — in that order, as the ONLY `###` headings there, each with a
//   non-blank body. All of it is ARCHITECTURE §2 primitive #3.
// ADVISORY (what it can NEVER check): that the Handoff is ACCURATE, complete, or useful; that `decision`
//   AGREES with what check-loop.mjs actually emitted (membership is checked, agreement is not); that
//   `commit` names the real HEAD or `date` is the real date (both are captured by the command's Bash —
//   a corrupted capture yields a SHAPE-VALID LIE, lessons-learned.md L5); and that any future run reads
//   the record at all. "GREEN" means ONLY "this record is well-shaped", NEVER "continuity was achieved".
// Two clocks: this checker's VERDICT is floor; /pharn-loop's ACT of invoking it is ADVISORY orchestration
//   — so "the loop cannot leave a malformed record" is FALSE, while "a record the checker sees is
//   malformed-DETECTABLE" is true. Do not collapse the two.
//
// ── `cap` — OPTIONAL, additive (loop-decision-integrity) ────────────────────────────────────────────────
// A fifth envelope field, `cap` (the loop's `--max-iter` value): validated with the SAME shape rule as
// `iterations` WHEN PRESENT, but never MANDATORY. This is deliberately additive, not a fifth required
// field: making it mandatory would RED every LOOP.md this repository (or any install) had already
// committed before this field existed, which is exactly the breaking-shape-change this contract's own
// "extra keys are ignored" section exists to avoid inviting. `/pharn-loop` now WRITES it on every
// non-blocked record (the value is already known at Step 1 entry), and the companion checker
// `pharn/floor/check-loop-decision.mjs` — NOT this file — reads it to re-derive a `STOP_CAP` decision from
// a live re-run of `check-loop.mjs`; this file only validates its SHAPE when present, exactly as it does
// for every other scalar. A record with no `cap` stays GREEN here, same as before this field existed.
//
// ── Trust (P2) — why the heading test is EXACT-EQUALITY, and what that does NOT buy ───────────────────
// The record is untrusted DATA. The verdict ranges ONLY over four enum/regex-gated scalars and over
// heading-list equality; the Handoff BODIES are never read for meaning.
//
// The bodies are untrusted free text scanned by the SAME heading regex that establishes the structure —
// one namespace, two trust classes. State the consequence precisely, because the tempting overstatement
// is the disease: a LINE-INITIAL `### next_steps` inside a body IS the next_steps heading. Markdown has
// no notion of "intended as prose", and no checker can invent one — so this is NOT forgery-proofing, and
// claiming it would be false. (The inline, back-ticked form is not line-initial and is simply prose; the
// boundary is the line-initial `### `, not the presence of the words. Both cases are pinned by tests.)
//
// What exact list equality DOES buy is UNAMBIGUITY: any such collision necessarily produces an EXTRA,
// DUPLICATED, or REORDERED heading, and requiring the collected list to EQUAL
// [investigated, learned, next_steps] refuses that — where a set-membership or first-wins check would
// have passed a record whose section boundaries are not where a reader thinks they are. The record is
// REFUSED, never sanitized. Headings inside fenced blocks are skipped (lessons-learned.md L6), so a
// quoted example is DATA about the shape and never a declaration of it — which is also the escape hatch:
// a Handoff body that needs to show the record's own outline fences it.
//
// Usage:
//   node pharn/floor/check-loop-record.mjs <LOOP.md>
//
// Exit: 0 (GREEN) only when every check above holds; 1 (RED) on every refusal (fail-closed).

import { readFileSync } from "node:fs";
import { FM_RE, stripBom } from "./frontmatter-core.mjs";
import { HANDOFF_SECTIONS, handoffSections } from "./loop-record-core.mjs";

// The `decision` enum — exactly the values check-loop.mjs EMITS as `.decision` at a stop. `CONTINUE`
// (which check-loop.mjs also emits) is deliberately absent: a record is written only at a STOP, so a
// record claiming CONTINUE is malformed by construction. A Set, so membership is `.has()` and no
// arbitrary key is ever indexed into a plain object (lessons-learned.md L15 — an inherited prototype
// member such as `toString` would be both truthy and non-nullish and would leak past `||` / `??`).
const DECISION_ENUM = new Set(["STOP_GREEN", "STOP_CAP", "STOP_TERMINAL", "INCONCLUSIVE"]);

// HANDOFF_SECTIONS + the four structure regexes + the fence-pairing scan now live in
// ./loop-record-core.mjs, so render-run-report.mjs reads the SAME grammar instead of re-deriving it
// (L35: the second copy should not exist; L31: a copy-pair is where the obligation drops). The rule
// has been wrong twice, which is why it is shared rather than repeated. This file keeps the VERDICT.

// The value grammars (primitive #3). Each is applied ONLY after cleanScalar (see below).
const ITER_RE = /^\d+$/;
const CAP_RE = /^\d+$/; // shape-identical to ITER_RE; the OPTIONAL fifth field — see the header note
const COMMIT_RE = /^([0-9a-f]{7,40}|unknown)$/; // `unknown` = an honest absence, never a fabricated SHA
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function red(msg) {
  console.log(`RED — ${msg}`);
  return 1;
}

// A string with no control characters and a bounded length. This is the PRECONDITION that must run
// BEFORE any anchored shape regex, never as a replacement for one (lessons-learned.md L14 — cited, not
// restated, P4): JavaScript `$` without the `m` flag matches at end-of-string OR just before a single
// trailing newline, so `/^\d+$/.test("2\n")` is TRUE. Line-splitting happens to make that particular
// vector unreachable HERE, and the guard is kept anyway — deliberately. L14's discipline is to COMPOSE
// rather than to re-derive, per field, whether today's parser makes the hole reachable; a future refactor
// that stops splitting by lines must not silently reopen it. A char-code scan rather than a control-char
// regex, so the rejected bytes are unambiguous in a diff.
function cleanScalar(v, maxLen) {
  if (typeof v !== "string") return false;
  if (v.length < 1 || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false; // C0 controls (incl. \t \n \r) + DEL
  }
  return true;
}

// Read the envelope from the `---`-fenced frontmatter ONLY — never grepped from the file at large
// (lessons-learned.md L6). A `decision: STOP_GREEN` line in the body, in prose, or inside a fenced block
// is DATA ABOUT the record, not a DECLARATION of it. Returns a Map (L15: no plain-object key indexing).
// Surrounding quotes are stripped; a trailing ` # comment` is NOT — the envelope is machine-written and
// exact, and stripping would add a laundering surface for no benefit.
function envelope(text) {
  const m = text.match(FM_RE);
  if (!m) return null;
  const fields = new Map();
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (kv) fields.set(kv[1], kv[2].trim().replace(/^(["'])(.*)\1$/, "$2"));
  }
  return fields;
}

// The Handoff scan is DELEGATED to loop-record-core.mjs, never re-derived here. The core also returns
// each subsection's raw `bodies`; this checker ignores them by design — it judges STRUCTURE and never
// reads a body for meaning (P2).
function handoff(body) {
  const { count, subs, nonEmpty } = handoffSections(body);
  return { count, subs, nonEmpty };
}

function gate(recordPath) {
  let text;
  try {
    text = stripBom(readFileSync(recordPath, "utf8"));
  } catch (e) {
    return red(`loop-record is unreadable (${recordPath}): ${e.message}`);
  }

  // ── (A) The envelope — read from the structured location only (L6) ─────────────────────────────────
  const fields = envelope(text);
  if (fields === null) {
    return red(
      `loop-record has no \`---\`-fenced YAML frontmatter (${recordPath}) — the envelope ` +
        `(decision, iterations, commit, date) is read ONLY from frontmatter, never from the body. ` +
        `See pharn/pharn-contracts/loop-record.md.`
    );
  }

  for (const key of ["decision", "iterations", "commit", "date"]) {
    if (!fields.has(key)) {
      return red(`loop-record's frontmatter declares no \`${key}\` (${recordPath}) — all four envelope fields are MANDATORY.`);
    }
  }

  // (A1) decision — exact enum membership over the values check-loop.mjs EMITS. Guard first (L14).
  const decision = fields.get("decision");
  if (!cleanScalar(decision, 32) || !DECISION_ENUM.has(decision)) {
    return red(
      `loop-record's \`decision\` is ${JSON.stringify(decision)} (${recordPath}) — expected one of ` +
        `{${[...DECISION_ENUM].join(", ")}}. Note CONTINUE is deliberately EXCLUDED: a record is ` +
        `written only at a STOP. Copy the value verbatim from check-loop.mjs's emitted \`decision\`.`
    );
  }

  // (A2) iterations — a positive integer (regex after the guard, then the >= 1 compare).
  const iterations = fields.get("iterations");
  if (!cleanScalar(iterations, 16) || !ITER_RE.test(iterations) || Number(iterations) < 1) {
    return red(`loop-record's \`iterations\` is ${JSON.stringify(iterations)} (${recordPath}) — expected a positive integer (>= 1).`);
  }

  // (A2b) cap — OPTIONAL. Validated only when present; its absence is not a refusal (see the header note
  // on why this field is additive rather than mandatory).
  if (fields.has("cap")) {
    const cap = fields.get("cap");
    if (!cleanScalar(cap, 16) || !CAP_RE.test(cap) || Number(cap) < 1) {
      return red(`loop-record's \`cap\` is ${JSON.stringify(cap)} (${recordPath}) — when present, expected a positive integer (>= 1).`);
    }
  }

  // (A3) commit — a git SHA, or the literal `unknown` when `git rev-parse HEAD` could not resolve one.
  const commit = fields.get("commit");
  if (!cleanScalar(commit, 64) || !COMMIT_RE.test(commit)) {
    return red(
      `loop-record's \`commit\` is ${JSON.stringify(commit)} (${recordPath}) — expected a lowercase ` +
        `hex git SHA (7-40 chars) or the literal \`unknown\`. Write \`unknown\` when \`git rev-parse ` +
        `HEAD\` fails (no repo, unborn HEAD); NEVER an empty value and NEVER a fabricated SHA.`
    );
  }

  // (A4) date — an ISO calendar date. Shape only: that it is TODAY is advisory, never checked.
  const date = fields.get("date");
  if (!cleanScalar(date, 16) || !DATE_RE.test(date)) {
    return red(`loop-record's \`date\` is ${JSON.stringify(date)} (${recordPath}) — expected an ISO calendar date, YYYY-MM-DD.`);
  }

  // ── (B) The Handoff — structure only; the bodies are never read for meaning (P2) ────────────────────
  const body = text.slice(text.match(FM_RE)[0].length);
  const { count, subs, nonEmpty } = handoff(body);

  if (count === 0) {
    return red(
      `loop-record has no \`## Handoff\` section (${recordPath}) — it is MANDATORY on every stop path, ` +
        `including INCONCLUSIVE. See pharn/pharn-contracts/loop-record.md.`
    );
  }
  if (count > 1) {
    return red(
      `loop-record has ${count} \`## Handoff\` sections (${recordPath}) — exactly one is allowed; two make "the Handoff" ambiguous.`
    );
  }

  // EXACT LIST EQUALITY, in order — this buys UNAMBIGUITY, NOT forgery-proofing (see the header): a
  // line-initial `### <name>` in a body IS that heading, and no checker can rule otherwise. What the
  // equality refuses is the consequence — an extra, duplicated, or reordered heading, which a
  // set-membership or first-wins check would have passed.
  const ok = subs.length === HANDOFF_SECTIONS.length && subs.every((s, i) => s === HANDOFF_SECTIONS[i]);
  if (!ok) {
    return red(
      `loop-record's \`## Handoff\` contains the level-3 headings [${subs.join(", ")}] (${recordPath}) — ` +
        `expected EXACTLY [${HANDOFF_SECTIONS.join(", ")}], in that order, with no extras and no ` +
        `duplicates. A LINE-INITIAL \`### <name>\` in a body IS a heading (an inline, back-ticked ` +
        `mention is not), so quoting the record's own outline as an outline trips this; the record is ` +
        `REFUSED, never sanitized. Put such a quote inside a fenced block.`
    );
  }

  const empty = HANDOFF_SECTIONS.filter((_, i) => !nonEmpty[i]);
  if (empty.length > 0) {
    return red(
      `loop-record's Handoff subsection(s) [${empty.join(", ")}] have no non-blank body line ` +
        `(${recordPath}) — a heading with an empty body is presence without content. NOTE (P0): that a ` +
        `body says anything TRUE or USEFUL is advisory and unreachable by this checker.`
    );
  }

  console.log(
    `GREEN — loop-record is well-shaped (${recordPath}): decision ${decision}, iterations ${iterations}, ` +
      `commit ${commit}, date ${date}; Handoff carries ${HANDOFF_SECTIONS.join(", ")}. NOTE (P0): this is ` +
      `the verdict GIVEN this record — that a record was written at all, that its narrative is ACCURATE, ` +
      `that \`decision\` AGREES with check-loop.mjs's emitted value, and that \`commit\`/\`date\` are ` +
      `TRUE, are all ADVISORY. "Well-shaped" NEVER means "continuity was achieved".`
  );
  return 0;
}

function main() {
  const recordPath = process.argv[2];
  if (!recordPath || process.argv.length > 3) {
    console.log("RED — usage: node pharn/floor/check-loop-record.mjs <LOOP.md>");
    return 1;
  }
  return gate(recordPath);
}

process.exit(main());
