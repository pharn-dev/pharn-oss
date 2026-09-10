#!/usr/bin/env node
// pharn/floor/check-provenance.mjs — the deterministic PROVENANCE + DUPLICATE-ID + ENTRY-TAG checker for
// memory-bank promotion, on the PRODUCT surface (a user's own repo).
//
// Floor primitive #3 (enum / regex / presence; ARCHITECTURE §2), like validate.mjs and check-structural.mjs.
// It is the floor reduction of ARCHITECTURE §5's "Promotion of a lesson/pattern to canon is a gated action
// with provenance PER ENTRY (which run / feature / diff)" — the PROVENANCE half. `/pharn-memory-promote`
// runs it before any write; a candidate that fails is REJECTED before it can reach canon. This is
// domknięcie — tightening §5's existing contract to its floor, NOT a new spec claim.  The GATED-WRITE half
// of §5 is the fix #7 pre-write hook (enforce-writes-scope.cjs); the two compose (THREAT-MODEL §3,
// memory-poisoning row).
//
// NON-LLM, dependency-free (Node stdlib only). No network, no child_process, no eval, no dynamic import.
//
// ── Honest scope (P0) — the split this file must never blur ───────────────────────────────────────────
// FLOOR (what the exit code guarantees): a candidate carries VALID, well-shaped provenance, a NON-DUPLICATE
//   id, a target in the canon enum, an enum-member `type`, and a well-SHAPED `concepts` list. All are
//   enum / regex / presence / set-membership tests.
// FLOOR, and this one is newer than the rest — the canon-file ARGUMENT is BOUND to `cand.target`
//   (canonArgMatchesTarget, below). Before it, the uniqueness verdict ranged over whatever file the
//   CALLER named while the enum test only ever saw the DECLARATION, so the two could disagree and a
//   re-used id passed. Say what it buys precisely: the file this checker READ is the file the candidate
//   DECLARED. It does NOT prove the declaration is the RIGHT one of the two members (a candidate may
//   honestly declare either; which is apt stays the human's read at the accept/deny gate), and it does
//   NOT prove the WRITE lands there — that is the fix #7 pre-write hook, a different primitive.
// FLOOR, NARROWED — say it rather than letting the guarantee quietly shrink: `commit` admits the literal
//   `unknown` (see COMMIT_RE), because a user's project need not be a git repo at all. So "well-shaped
//   provenance" does NOT mean "carries a diff pointer": it means `feature` and `source` are non-empty and
//   `commit` is either a real SHA or an HONEST ABSENCE. §5's triple is "which run / feature / diff"; with
//   `unknown`, the diff third is declared missing rather than faked. A fabricated SHA would pass a
//   SHA-shaped regex and lie; `unknown` cannot.
// ADVISORY (what it can NEVER check): whether the lesson is TRUE, GENERAL, or WORTH canonizing — and
//   whether the `type` and `concepts` VALUES actually DESCRIBE the entry. A candidate typed `floor` about
//   something else entirely passes this checker. "The entry is typed `floor`" must NEVER read as "the
//   entry is about the floor", exactly as "passed check-provenance" must never read as "the lesson is
//   sound" — that conflation is the P0 disease this repo exists to prevent. The values are model-drafted
//   and human-ratified at `/pharn-memory-promote`'s accept/deny gate, so any downstream selection keyed on
//   `type` is ADVISORY-grade context selection, never a guarantee.
// TWO CLOCKS: this checker's VERDICT is floor. The command's ACT of invoking it is ADVISORY orchestration —
//   nothing on the floor forces the run. So the unconditional guarantee is the narrow one: *when this
//   checker runs*, a candidate with a non-member `type` or a misshapen `concepts` cannot pass it.
// NOT CHECKED HERE (a named residual, not a hidden one): that the entry RENDERED into canon actually
//   carries a conforming tag line. This checker validates the CANDIDATE, and the candidate is validated
//   BEFORE the human gate, while the entry is rendered AFTER it. The command substitutes these
//   already-validated fields into a fixed template, which narrows the gap without closing it; closing it
//   needs a checker that reads canon AFTER the write (follow-up: `lesson-tagline-render-check`).
// ALSO NOT CHECKED, and worth knowing in a USER's repo: this checker never scans canon for tag lines, so a
//   hand-written `memory-bank/lessons-learned.md` predating any promotion is NOT retro-invalidated. Any
//   consumer of the tag line must tolerate untagged entries.
//
// ── Trust (P2) ────────────────────────────────────────────────────────────────────────────────────────
// The candidate's free-text `title` / `body` originate in `trust: untrusted` input (a lesson is typically
// drawn from a REVIEW.md finding, whose free-text inherited the reviewed code's untrusted tag —
// finding-shape.md, fix #1). They are IGNORED here: the verdict ranges ONLY over the enum-gated /
// floor-verifiable fields (target enum, provenance shape, id set-membership, `type` enum, `concepts` shape).
// No guaranteed decision rests on a free-text field (mirrors check-structural.mjs).
//
// `type` / `concepts` are drafted from that same untrusted surface, so admitting them PROMOTES model-drafted
// values into the enum-gated class — which is the laundering vector fix #1 exists to stop. The closure is
// that neither is free text: `type` must be an EXACT member of a literal array, and every concept must
// survive a control-char guard AND an anchored shape regex. An instruction-looking needle satisfies neither
// grammar, so it lands as a loud RED rather than a trusted-looking value. What the shape check CANNOT catch
// is a well-shaped but MISLEADING tag (`concepts: [safe, approved, verified]`) — and because these land in
// canon, that window is permanent (THREAT-MODEL §2 #3, write-once-influence-forever). That residual is held
// by the human's read at the accept/deny gate plus the ADVISORY-only status of any `type`-keyed selection,
// never by this file.
//
// Usage:  node pharn/floor/check-provenance.mjs <candidate.json> <canon-file.md>
//   candidate.json : { target, id, type, concepts[], provenance: { feature, commit, source, date } }
//                    (+ title/body — IGNORED)
//   canon-file.md  : the target canon file to check id-uniqueness against
//                    (a not-yet-created file => empty canon, no duplicates — the first-promotion case,
//                     which is the NORMAL state in a project that has never promoted a lesson)
//
// Exit: 1 on any RED (prints each), 0 + "GREEN — ..." otherwise.

import { readFileSync, existsSync } from "node:fs";
import { isAbsolute } from "node:path";

// Enums / shapes — every branch is a membership / regex / presence test (P5); the terminal fallback on any
// non-member is a loud RED, never a guess. These are the enum-gated / floor-verifiable fields (never body).
//
// TARGET_ENUM is the TWO PRESCRIPTION FILES, deliberately NOT the four canonical state files ARCHITECTURE
// §5 names. `architecture-context` and `feature-catalog` RECORD; `lessons-learned` and `pattern-library`
// PRESCRIBE — and only a prescription can steer a future build, which is what makes a poisoned entry
// dangerous (THREAT-MODEL §2 #3). Widening this to §5's four would widen the gated write surface for no
// gain. A test pins that it was not widened.
const TARGET_ENUM = ["memory-bank/lessons-learned.md", "memory-bank/pattern-library.md"];
const REQUIRED_PROVENANCE = ["feature", "commit", "source", "date"]; // the mandatory per-entry schema

// A git SHA (short or full) OR the literal `unknown`. The command supplies the real value via
// `git rev-parse HEAD`; a user's project may not be a git repo at all, or may sit on an unborn HEAD. The
// `unknown` member follows check-loop-record.mjs's rule that STATE IS ALWAYS SHOWN: write an honest
// absence, never an empty field and never a fabricated SHA. Admitting it is what keeps the alternative —
// a made-up 7-hex string that satisfies the regex and lies forever in canon — off the table. Case-exact:
// `UNKNOWN` is NOT a member, so the escape stays a single deliberate spelling rather than a family.
const COMMIT_RE = /^([0-9a-f]{7,40}|unknown)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // ISO calendar date

// Shape match is necessary but not sufficient: DATE_RE admits 2026-02-30. Round-trip through the
// local-date constructor — no timezone offset — so an impossible month/day rolls forward and fails.
function isGregorianDate(s) {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const y = Number(s.slice(0, 4));
  const mo = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

// ── The canon-arg BINDING: argv[3] must NAME the file `cand.target` declares ─────────────────────────
// Without this, the duplicate-id check (3) below ranges over WHATEVER FILE THE CALLER NAMED, while the
// enum test (1) only ever sees `cand.target` — so "the target is one of the two prescription files" read
// as a claim about the file that gets CHECKED, and it was not one. MEASURED before the fix (never
// inferred): a candidate declaring `memory-bank/lessons-learned.md` with an id ALREADY taken there
// exited 0 GREEN when argv[3] named any other file. A real duplicate passed the gate.
//
// Purely lexical, primitive #3: split on either separator and drop "" and "." segments. A ".." segment is
// KEPT literally rather than resolved, and since no TARGET_ENUM member contains one it can never match
// inside the compared tail. No filesystem access, no symlink resolution, no cwd read — the comparison is
// over this one invocation's own two inputs (an argv string and an already-enum-gated JSON field), which
// is why it is the EXISTING enum/regex primitive and not the cross-FILE equality primitive
// check-ship-briefing.mjs introduced.
function pathSegments(p) {
  return String(p)
    .split(/[\\/]+/)
    .filter((s) => s !== "" && s !== ".");
}

// RELATIVE argv[3] → segment-wise EQUALITY with the declared target. That is the shape the promote
// command passes (run from the repo root), and the two strings are the same KIND of thing — both
// repo-root-relative — so equality is the honest test, and `foo/memory-bank/lessons-learned.md` is RED.
// ABSOLUTE argv[3] → the target must be a segment-aligned SUFFIX. An absolute path cannot EQUAL a
// repo-relative declaration, and resolving it against `process.cwd()` would silently make the verdict
// depend on the caller's working directory; the suffix is the strongest cwd-INDEPENDENT test available.
// NARROWED, and stated rather than left for a reader to discover: the suffix form therefore admits a
// same-named file under a DIFFERENT root. It binds the ARGUMENT to the DECLARATION; it does not prove
// the file sits under this repo, and it never proves the WRITE lands there — that is fix #7's hook.
function canonArgMatchesTarget(canonPath, target) {
  const want = pathSegments(target);
  const got = pathSegments(canonPath);
  if (want.length === 0) return false;
  if (!isAbsolute(canonPath)) return got.length === want.length && want.every((s, i) => got[i] === s);
  if (got.length < want.length) return false;
  const tail = got.slice(got.length - want.length);
  return want.every((s, i) => tail[i] === s);
}

// The entry TAXONOMY. This array is the SINGLE SOURCE OF TRUTH for the `type` enum (P4): the
// `/pharn-memory-promote` doc restates the member list once, for a human drafting a candidate, and
// check-provenance.test.mjs asserts the two agree — so the restatement cannot drift silently.
//
// RATIFIED AGAINST A REAL CORPUS, not proposed: every member maps to ≥1 real lesson in the corpus this
// taxonomy was derived from (the PHARN build loop's own lessons: process 5 · scoping 4 · floor 4 ·
// tooling 2 · contract 1 · eval 1), and a proposed `injection` member was DROPPED at 0 instances — a
// speculative addition is exactly what P7 forbids. Adding a member later means pointing at the entry that
// needs it. A user whose lessons do not fit any member should say so and ask, never force the nearest one.
const TYPE_ENUM = ["process", "contract", "floor", "scoping", "tooling", "eval"];

// `concepts` is an OPEN vocabulary — shape-checked, never enum-checked, so a new topic never needs a code
// change. The cap exists so the field stays an index key rather than a second body.
const CONCEPTS_MIN = 1;
const CONCEPTS_MAX = 6;
const CONCEPT_MAX_LEN = 32;
const CONCEPT_RE = /^[a-z0-9-]+$/;

const reds = [];
function red(kind, detail) {
  reds.push({ kind, detail });
}

function readJson(path, label) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    red("input", `${label} is unreadable (${path}): ${e.message}`);
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    red("input", `${label} is not valid JSON (${path}): ${e.message}`);
    return undefined;
  }
}

function nonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// A string with no control characters and a bounded length. It runs BEFORE the anchored shape regex, as a
// PRECONDITION composed with it — never as a replacement for it.
//
// Be precise about what this guard does and does not catch HERE, because the reason is site-specific.
// On the `concepts` path it is REDUNDANT TODAY for control characters: nothing on this path trims, and
// every C0 control character lies outside `[a-z0-9-]`, so CONCEPT_RE alone would already reject
// "enum-gate\n". (JavaScript's `$` without the `m` flag matches ONLY at end-of-input — the `m` flag is
// what makes it match before a newline — so there is no trailing-newline hole to plug here. A regex that
// DOES trim before matching, as merge-findings.mjs's RULE_ID_OK does, is a different story: there the
// same guard is genuinely load-bearing.) The guard's independent contribution on this path is therefore
// the LENGTH BOUND and the STRING-TYPE check, not the control-char scan.
//
// It is kept anyway, deliberately. The discipline is to COMPOSE rather than to re-derive, per field and
// per release, whether today's parser happens to make the hole unreachable; a future refactor that starts
// trimming, or that reads these values from a line-oriented format, must not silently reopen it. Stated
// this way the guard is never CLAIMED to be what catches a case it does not catch.
//
// Implemented as a char-code scan rather than a control-char REGEX on purpose: the guard's whole job is to
// be unambiguous about which bytes it rejects, and a regex holding literal control characters is neither
// readable in a diff nor safe against a copy-paste that silently drops them.
function cleanScalar(v, maxLen) {
  if (typeof v !== "string") return false;
  if (v.length < 1 || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false; // C0 controls (incl. \t \n \r) + DEL
  }
  return true;
}

// The set of existing `## <id>` heading ids in the canon file — the first whitespace-delimited token after
// "## " (so "## L1 — title" yields "L1"). A not-yet-created canon file is the legitimate first-promotion
// case (and the normal state of a project that has never promoted anything): treat it as the empty set,
// never an error.
function existingIds(canonPath) {
  if (!existsSync(canonPath)) return [];
  let text;
  try {
    text = readFileSync(canonPath, "utf8");
  } catch (e) {
    red("canon", `cannot read canon file (${canonPath}): ${e.message}`);
    return [];
  }
  const ids = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^##\s+(\S+)/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

function fail() {
  for (const r of reds) console.log(`RED — ${r.kind} failed: ${r.detail}`);
  console.log(`\nRED — ${reds.length} provenance check(s) failed`);
  return 1;
}

function main() {
  const candidatePath = process.argv[2];
  const canonPath = process.argv[3];

  if (!candidatePath || !canonPath) {
    console.log("RED — usage: node pharn/floor/check-provenance.mjs <candidate.json> <canon-file.md>");
    return 1;
  }

  const cand = readJson(candidatePath, "candidate.json");
  if (reds.length) return fail();
  if (!cand || typeof cand !== "object" || Array.isArray(cand)) {
    red("input", "candidate.json must be a JSON object");
    return fail();
  }

  // (1) target ∈ the canon enum — set membership (P5).
  if (!TARGET_ENUM.includes(cand.target)) {
    red("target", `target ${JSON.stringify(cand.target)} not in {${TARGET_ENUM.join(", ")}}`);
  }

  // (1b) the canon-file ARGUMENT names the DECLARED target — the binding that makes check (3) below a
  //      statement about `cand.target` rather than about whatever the caller happened to pass.
  //      GATED ON (1) PASSING, deliberately: a non-member target is already a loud RED carrying a true
  //      and sufficient reason, and emitting a second RED for the same root cause would misdirect whoever
  //      acts on it — the same "a false REASON for a true refusal" discipline the concepts branch keeps.
  if (TARGET_ENUM.includes(cand.target) && !canonArgMatchesTarget(canonPath, cand.target)) {
    red(
      "canon-arg",
      `the canon-file argument does not name the declared target: argv[3] is ${JSON.stringify(canonPath)} ` +
        `but target is ${JSON.stringify(cand.target)}. The duplicate-id check would otherwise range over a ` +
        `file this candidate never declared, so a re-used id could pass. Pass the declared target as the ` +
        `canon-file argument (repo-root-relative, or an absolute path ending in it), or correct the target.`
    );
  }

  // (2) provenance present + shape — the mandatory per-entry schema (ARCHITECTURE §5). A candidate
  //     missing or malforming any field is REJECTED deterministically, before any write.
  const p = cand.provenance;
  if (!p || typeof p !== "object" || Array.isArray(p)) {
    red("provenance", `provenance must be an object with {${REQUIRED_PROVENANCE.join(", ")}}, got ${JSON.stringify(p)}`);
  } else {
    for (const field of REQUIRED_PROVENANCE) {
      if (!(field in p)) red("provenance", `missing required provenance field: ${field}`);
    }
    if ("feature" in p && !nonEmptyString(p.feature)) {
      red("provenance", `feature must be a non-empty string, got ${JSON.stringify(p.feature)}`);
    }
    if ("source" in p && !nonEmptyString(p.source)) {
      red("provenance", `source must be a non-empty string, got ${JSON.stringify(p.source)}`);
    }
    if ("commit" in p && !(typeof p.commit === "string" && COMMIT_RE.test(p.commit))) {
      red(
        "provenance",
        `commit must match ${COMMIT_RE} (a git SHA, 7–40 hex, or the literal \`unknown\` when ` +
          `\`git rev-parse HEAD\` cannot resolve one — never an empty field and never a fabricated SHA), ` +
          `got ${JSON.stringify(p.commit)}`
      );
    }
    if ("date" in p) {
      if (!(typeof p.date === "string" && DATE_RE.test(p.date))) {
        red("provenance", `date must match ${DATE_RE} (YYYY-MM-DD), got ${JSON.stringify(p.date)}`);
      } else if (!isGregorianDate(p.date)) {
        red("provenance", `date ${JSON.stringify(p.date)} is not a valid Gregorian calendar date`);
      }
    }
  }

  // (3) id present + NON-duplicate — set membership over existing `## <id>` headings (P5). A re-used id
  //     would silently shadow or collide with canon, so it is RED.
  if (!nonEmptyString(cand.id)) {
    red("id", `id must be a non-empty string, got ${JSON.stringify(cand.id)}`);
  } else {
    const raw = String(cand.id);
    const id = raw.trim();
    if (/\s/.test(raw)) {
      red("id", `id must be a whitespace-free single token, got ${JSON.stringify(raw)}`);
    } else if (existingIds(canonPath).includes(id)) {
      red("id", `id ${JSON.stringify(id)} already exists as a "## ${id}" heading in ${canonPath} — duplicate`);
    }
  }

  // (4) type ∈ TYPE_ENUM — set membership over a literal array (P5). Exact `.includes` equality, with no
  //     regex anywhere on this path, so there is no anchoring question to get wrong: "floor\n" is simply
  //     not a member. That is why `type` needs no separate guard, unlike `concepts` below, which IS
  //     regex-shaped and therefore composes one.
  if (!TYPE_ENUM.includes(cand.type)) {
    red("type", `type ${JSON.stringify(cand.type)} not in {${TYPE_ENUM.join(", ")}} — the field is REQUIRED`);
  }

  // (5) concepts — an array of 1..6 unique, well-shaped tags. GUARD FIRST, THEN SHAPE.
  //     Duplicates are RED rather than de-duplicated: a repeated tag adds no addressability and would let
  //     one tag consume the CONCEPTS_MAX budget. (This DIVERGES deliberately from check-plan-lessons.mjs,
  //     which de-duplicates `[L1, L1]` — there the ids RESOLVE to the same lesson so a duplicate is
  //     harmless noise; here each slot is a distinct index key, so a duplicate is a silently degraded
  //     entry. Stated so the divergence is a decision, not an inferred house rule.)
  const c = cand.concepts;
  if (!Array.isArray(c)) {
    red("concepts", `concepts must be an array of ${CONCEPTS_MIN}–${CONCEPTS_MAX} tags, got ${JSON.stringify(c)} — the field is REQUIRED`);
  } else if (c.length < CONCEPTS_MIN || c.length > CONCEPTS_MAX) {
    red("concepts", `concepts must hold ${CONCEPTS_MIN}–${CONCEPTS_MAX} tags, got ${c.length}`);
  } else {
    for (const item of c) {
      if (!cleanScalar(item, CONCEPT_MAX_LEN)) {
        red("concepts", `concept ${JSON.stringify(item)} must be a control-char-free string of 1–${CONCEPT_MAX_LEN} chars`);
      } else if (!CONCEPT_RE.test(item)) {
        red("concepts", `concept ${JSON.stringify(item)} must match ${CONCEPT_RE} (lowercase letters, digits, hyphens)`);
      }
    }
    // Uniqueness is computed over the STRING items only, and compared against the count of STRING items —
    // never against `c.length`. Comparing a string-filtered set to the full array length makes every
    // non-string item look like a duplicate: `["a", 42]` holds no repeat, yet filtered-size 1 !== length 2
    // would fire "must be unique". The verdict would still be RED (the input is invalid either way), but a
    // floor tool that gives a FALSE REASON for a TRUE refusal misdirects whoever acts on it — precision at
    // the granularity the message claims is the whole point of a deterministic checker.
    const strings = c.filter((v) => typeof v === "string");
    if (new Set(strings).size !== strings.length) {
      red("concepts", `concepts must be unique, got ${JSON.stringify(c)} — a repeated tag adds no address`);
    }
  }

  if (reds.length) return fail();
  console.log(
    `GREEN — provenance valid; id ${JSON.stringify(String(cand.id).trim())} is unique in ${canonPath}, ` +
      `which is the declared target ${JSON.stringify(cand.target)}; ` +
      `type ${JSON.stringify(cand.type)}, ${cand.concepts.length} concept(s). NOTE (P0): that these VALUES ` +
      `describe the entry is ADVISORY — this checker verifies SHAPE, never aboutness.`
  );
  return 0;
}

process.exit(main());
