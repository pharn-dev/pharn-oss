#!/usr/bin/env node
// pharn/floor/check-spec.mjs — the deterministic SPEC.md SHAPE + STATE + APPROVED-PIN checker for /pharn-spec.
//
// Floor primitives (ARCHITECTURE §2): #3 (enum / presence) for required-section presence, the state enum, and
// spec_id presence; #2 (content-hash) for the approved-intent pin. It is the floor reduction of ARCHITECTURE
// §6's spec stage — "SPEC.md | intent (Draft → Approved)", the root artifact carrying spec_id, with
// spec_content_hash pinning content so drift under a stable id is detectable (fix #4) — cited, not restated
// (P4). /pharn-spec runs it after emitting a Draft, and again after the human-approved pin; a SPEC that fails
// is REJECTED. This is domknięcie — tightening §6's existing contract to its floor — exactly as
// check-provenance.mjs did for §5's promotion contract, NOT a new spec claim.
//
// NON-LLM, dependency-free (Node stdlib only). No network, no child_process, no eval, no dynamic import.
//
// Honest scope (P0): it guarantees a SPEC.md carries the REQUIRED SECTIONS, a VALID state enum, a present
// spec_id, and — when Approved — a spec_content_hash that EQUALS sha256(body), taken with line endings folded
// to LF (see bodyHash). It does NOT — cannot — judge
// whether the INTENT is clear, complete, or wise: that is the human's advisory call, owned by the approval
// halt in /pharn-spec. "passed check-spec" must NEVER read as "the intent is sound" — that conflation is the
// P0 disease this repo exists to prevent.
//
// Trust (P2): the SPEC body is human-authored intent (free-text DATA). The verdict ranges ONLY over the
// enum-gated / floor-verifiable fields (section presence, state enum, spec_id presence, body-hash equality) —
// NEVER over the intent's meaning. No guaranteed decision rests on the free-text intent (mirrors fix #1).
//
// Usage:
//   node pharn/floor/check-spec.mjs <SPEC.md>           validate → exit 1 on any RED (prints each), else 0 + GREEN
//   node pharn/floor/check-spec.mjs --spec-id <SPEC.md> print the frontmatter spec_id to stdout — the §6 root
//                                                      identity a PLAN carries forward, read by
//                                                      check-plan-spec-agree.mjs for its identity assertion.
//                                                      SINGLE source of SPEC parsing, exactly as --hash is the
//                                                      single source of body-extraction (P4). A frontmatter
//                                                      with no spec_id prints an EMPTY line at exit 0; the
//                                                      caller REDs on the empty value.
//   node pharn/floor/check-spec.mjs --hash <SPEC.md>    print sha256(body) to stdout (line endings folded to
//                                                      LF — see bodyHash) — the value /pharn-spec pins
//                                                      into spec_content_hash on approval. SINGLE source of
//                                                      body-extraction AND of the fold, so the pin and the
//                                                      validate-time recompute can never disagree.
//   node pharn/floor/check-spec.mjs --state <SPEC.md>  print the frontmatter `state` to stdout — the §6
//                                                      lifecycle value the Approved gate branches on.
//                                                      SINGLE source of the state read, exactly as --hash is
//                                                      the single body-extraction: check-spec-approved.mjs
//                                                      shells this mode INSTEAD of parsing frontmatter
//                                                      itself, so the gate cannot disagree with validate
//                                                      about what `state` IS (see emitState).
//
// Exit: 1 on any RED (validate) / on unreadable | no-frontmatter (--hash, --spec-id, --state); 0 otherwise.
// All three read-only modes REPORT that refusal on stderr before exiting non-zero (L5). See emitState.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { FM_RE, stripBom } from "./frontmatter-core.mjs";

// Enums / shapes — every branch is a presence / enum / hash-equality membership test (P5); the terminal
// fallback on any non-member is a loud RED, never a guess. These are the enum-gated / floor-verifiable fields.
const REQUIRED_SECTIONS = ["intent", "scope", "acceptance criteria", "constraints"]; // §6 SPEC presence set
const STATE_ENUM = ["Draft", "Approved"]; // the spec lifecycle (ARCHITECTURE §6)
const HASH_RE = /^[0-9a-f]{64}$/; // a SHA-256 hex digest

const reds = [];
function red(kind, detail) {
  reds.push({ kind, detail });
}

function stripQuotes(v) {
  return v.replace(/^["']|["']$/g, "");
}

// Strip a YAML inline comment from an UNQUOTED scalar: a `#` at the value's start, or preceded by
// whitespace, opens a comment running to end of line. A `#` with NO preceding whitespace (`feat#3`) is NOT
// a comment and survives byte-exact — what YAML says, and what keeps an id containing a hash character
// intact. Deterministic; no LLM. WHY this exists: the command templates document their machine fields with a
// trailing `# …` note, so a field written exactly as documented was being read WITH the note glued on, and a
// 64-hex pin then failed its own enum-gate — a false RED on a correct file.
function stripComment(v) {
  return v.replace(/(^|\s)#.*$/, "").trim();
}

// Read one frontmatter field VALUE. THE QUOTE COMES FIRST, and that order is the part to get right: a
// QUOTED scalar's interior is taken verbatim up to its closing quote, and whatever follows that quote (a
// real trailing comment) is discarded. Doing it the other way — strip ` #…`, then the quotes — eats the
// closing quote of a value that legitimately contains ` #` (`"a # b"` → `a`, corrupted). Resolving the
// quote first gets BOTH shapes right: `"a # b"` keeps its hash, and `"FEAT-1" # note` drops the note.
// parseSpec stores EVERY field, not just the three this checker gates, so an unrelated quoted field must
// survive intact.
//
// Honestly bounded (P0): a pragmatic frontmatter reader, NOT a YAML library. The closing quote is found by
// a plain scan, so a value containing an ESCAPED quote (`"a\"b"`) ends at the escape rather than at the
// real terminator, and an UNTERMINATED quote falls through to the unquoted path rather than guess at an
// interior. No template here emits either shape, and both fail toward a visibly wrong value that the
// id/hash gates reject — never toward a silent pass.
function readValue(raw) {
  const v = raw.trim();
  const q = v[0];
  if (q === '"' || q === "'") {
    const end = v.indexOf(q, 1);
    if (end > 0) return v.slice(1, end);
  }
  return stripQuotes(stripComment(v));
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Split a SPEC file into { fm: {key:value}, body }. `body` is everything AFTER the frontmatter block — the
// SINGLE definition of "the SPEC body", reused by both validate and --hash, so the approved-pin and its
// recompute never disagree. Returns null when there is no frontmatter block at all (fail-closed). The body is
// frontmatter-independent, so flipping `state` / writing `spec_content_hash` on approval does NOT move its hash.
function parseSpec(text) {
  const m = text.match(FM_RE);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (kv) fm[kv[1]] = readValue(kv[2]);
  }
  return { fm, body: text.slice(m[0].length) };
}

// The body's SHA-256, with line endings FOLDED (`\r\n` → `\n`) before hashing. LF vs CRLF is the same
// intent, not a content change: a Windows clone (`core.autocrlf=true`), or a Windows editor rewriting the
// working tree between git operations, would otherwise make this recompute diverge from an LF-authored pin
// and RED as "the approved intent drifted" on a repo where nothing drifted. Folding HERE — the single
// body-hash implementation, which check-spec-approved.mjs and check-plan-spec-agree.mjs both delegate to
// (neither computes a hash of its own) — makes the pin line-ending-agnostic for the whole chain.
//
// Honest bounds (P0). The COMPARISON is floor (content-hash, ARCHITECTURE §2 primitive #2). That no second
// hash implementation is ever added is DISCIPLINE, not a floor op — the chain tests DETECT a divergent
// re-implementation, they do not PREVENT one. The fold is the identity map on an LF body, so an LF-authored
// pin is byte-unchanged and no LF-authored stored hash moves. Only line endings are folded — no trailing- or
// interior-whitespace normalization — so two bodies can share a pin only by differing in CR bytes
// immediately before an LF; a lone `\r` is left byte-exact. The cost, stated: a pure CRLF-for-LF rewrite
// of the body is no longer DETECTED as drift. Nothing downstream is line-ending-sensitive today (FM_RE
// and headingsOf both split on /\r?\n/), but a future consumer that is would need its own check.
// The converse cost, also stated: a pin COMPUTED FROM a CRLF working tree (--hash run against the file as
// it sits on disk) was self-consistent before and REDs now until re-approved — the remedy the RED prints.
function bodyHash(body) {
  return createHash("sha256").update(body.replace(/\r\n/g, "\n")).digest("hex");
}

// The lowercased text of each `## ` (exactly h2) heading in the body — the first-match parse mechanism from
// check-provenance.mjs's existingIds, re-implemented in-file (no sibling import, P3). `### foo` (h3) does not
// match (the `\s+` after `##` rejects a third `#`).
function headingsOf(body) {
  const out = [];
  for (const line of body.split(/\r?\n/)) {
    const hm = line.match(/^##\s+(.+?)\s*$/);
    if (hm) out.push(hm[1].toLowerCase());
  }
  return out;
}

function readText(path, label) {
  try {
    return stripBom(readFileSync(path, "utf8"));
  } catch (e) {
    red("input", `${label} is unreadable (${path}): ${e.message}`);
    return undefined;
  }
}

function fail() {
  for (const r of reds) console.log(`RED — ${r.kind} failed: ${r.detail}`);
  console.log(`\nRED — ${reds.length} spec check(s) failed`);
  return 1;
}

// --- --hash mode: emit sha256(body), the value /pharn-spec writes into spec_content_hash on approval. ---
function emitHash(specPath) {
  const text = readText(specPath, "SPEC.md");
  if (text === undefined) {
    for (const r of reds) console.error(`check-spec: ${r.kind} failed: ${r.detail}`);
    return 1;
  }
  const parsed = parseSpec(text);
  if (!parsed) {
    console.error(`check-spec: no YAML frontmatter in ${specPath} — cannot locate the body to hash`);
    return 1;
  }
  process.stdout.write(bodyHash(parsed.body) + "\n");
  return 0;
}

// --- --spec-id mode: emit the frontmatter spec_id, the §6 root identity a PLAN carries forward. ---
// Mirrors emitHash EXACTLY (unreadable → 1, no frontmatter → 1), so the two read-only modes fail closed the
// same way. A frontmatter that parses but carries no spec_id prints an EMPTY line at exit 0: the absence is
// reported as data rather than crashing, and the caller REDs on the empty value. That branch is reachable
// only for a file the Approved gate has not already rejected — validate() REDs a spec_id-less spec — so it
// is a fail-closed courtesy, never the load-bearing check.
function emitSpecId(specPath) {
  const text = readText(specPath, "SPEC.md");
  if (text === undefined) {
    for (const r of reds) console.error(`check-spec: ${r.kind} failed: ${r.detail}`);
    return 1;
  }
  const parsed = parseSpec(text);
  if (!parsed) {
    console.error(`check-spec: no YAML frontmatter in ${specPath} — cannot locate spec_id`);
    return 1;
  }
  process.stdout.write((parsed.fm.spec_id || "") + "\n");
  return 0;
}

// --- --state mode: emit the frontmatter `state`, the §6 lifecycle value the Approved gate branches on. ---
// The SINGLE canonical read of `state`, exactly as --hash is the single body-extraction and --spec-id the
// single identity read (P4). check-spec-approved.mjs shells this mode INSTEAD of parsing the frontmatter
// itself. Before it did, that gate carried a private first-wins, comment-blind `readState()` and the two
// checkers DISAGREED on the same bytes in BOTH directions: a duplicate `state:` key read `Approved` where
// validate read `Draft` — a FAIL-OPEN on the one gate whose job is to admit only approved intent — and a
// template-faithful `state: Approved # ratified …` read as a non-member, a false RED. Both are reproduced as
// tests in check-spec-approved.test.mjs. Resolution order is parseSpec's, not a second opinion about it:
// LAST-wins across duplicate keys, with the quote resolved before the comment (see readValue).
//
// WHY a print-mode and not "read the state out of validate's GREEN line", which is the cheaper-looking
// alternative a future reader will propose: that line is PROSE, and a membership fact read by pattern-matching
// free text is exactly the defect PHARN's own build-loop lesson L6 names. The extra child process is the
// price of reading the structured location; it is paid once per gate invocation and is the correct trade.
//
// Mirrors emitHash / emitSpecId in exit codes (unreadable → 1, no frontmatter → 1), in reporting an ABSENT
// field as an EMPTY LINE at exit 0, and — since the L5 fix — in printing the collected RED to STDERR on the
// unreadable path. That last one USED to be a deliberate divergence documented here: only --state reported,
// while --hash and --spec-id exited 1 silently. A silent exit hands a shelling caller an exit code and
// nothing to surface (the input-capture boundary L5 names), and check-spec-approved.mjs echoes this child's
// output verbatim, so the message is what tells a user WHICH file could not be read — which is an argument
// for all three modes reporting, not for one of them doing it. The three read-only modes are now uniform;
// this note records that the divergence was removed rather than leaving a stale claim that it persists.
function emitState(specPath) {
  const text = readText(specPath, "SPEC.md");
  if (text === undefined) {
    for (const r of reds) console.error(`check-spec: ${r.kind} failed: ${r.detail}`);
    return 1;
  }
  const parsed = parseSpec(text);
  if (!parsed) {
    console.error(`check-spec: no YAML frontmatter in ${specPath} — cannot locate state`);
    return 1;
  }
  process.stdout.write((parsed.fm.state || "") + "\n");
  return 0;
}

// --- default mode: validate the SPEC's shape, state, identity, and (if Approved) its pin. ---
function validate(specPath) {
  const text = readText(specPath, "SPEC.md");
  if (reds.length) return fail();

  const parsed = parseSpec(text);
  if (!parsed) {
    red("frontmatter", `no YAML frontmatter block (\`---\` … \`---\`) in ${specPath}`);
    return fail();
  }
  const { fm, body } = parsed;

  // (1) state present + ∈ enum (P5).
  if (!("state" in fm) || fm.state.length === 0) {
    red("state", `missing \`state\` (must be one of {${STATE_ENUM.join(", ")}})`);
  } else if (!STATE_ENUM.includes(fm.state)) {
    red("state", `state ${JSON.stringify(fm.state)} not in {${STATE_ENUM.join(", ")}}`);
  }

  // (2) spec_id present + non-empty — the §6 root identity every downstream artifact carries.
  if (!("spec_id" in fm) || fm.spec_id.length === 0) {
    red("spec_id", "missing or empty `spec_id` (the root identity downstream artifacts carry)");
  }

  // (3) required sections present as `##` headings — set membership (P5). Presence only; the intent's
  //     CONTENT/quality is advisory and is never judged here.
  const headings = headingsOf(body);
  for (const want of REQUIRED_SECTIONS) {
    if (!headings.includes(want)) red("section", `missing required \`## ${titleCase(want)}\` section`);
  }

  // (4) when Approved: spec_content_hash present, well-formed, AND equals sha256(body) — the content-hash pin
  //     (fix #4). A Draft is not yet pinned, so its hash is not checked. A post-approval body edit that does
  //     not re-pin makes the recompute diverge → a deterministic RED (drift is loud, not silent).
  if (fm.state === "Approved") {
    const h = fm.spec_content_hash || "";
    if (!HASH_RE.test(h)) {
      red("pin", `an Approved spec needs spec_content_hash matching ${HASH_RE} (a sha256), got ${JSON.stringify(h)}`);
    } else if (h !== bodyHash(body)) {
      red("pin", "spec_content_hash does not equal the body hash — the approved intent drifted (re-approve to re-pin)");
    }
  }

  if (reds.length) return fail();
  const pinned = fm.state === "Approved" ? "; intent pinned" : "";
  console.log(`GREEN — spec valid; state ${JSON.stringify(fm.state)}; ${REQUIRED_SECTIONS.length} required sections present${pinned}`);
  return 0;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--hash") {
    if (!args[1]) {
      console.error("check-spec: usage: node pharn/floor/check-spec.mjs --hash <SPEC.md>");
      return 1;
    }
    return emitHash(args[1]);
  }
  if (args[0] === "--spec-id") {
    if (!args[1]) {
      console.error("check-spec: usage: node pharn/floor/check-spec.mjs --spec-id <SPEC.md>");
      return 1;
    }
    return emitSpecId(args[1]);
  }
  if (args[0] === "--state") {
    if (!args[1]) {
      console.error("check-spec: usage: node pharn/floor/check-spec.mjs --state <SPEC.md>");
      return 1;
    }
    return emitState(args[1]);
  }
  if (!args[0]) {
    console.log("RED — usage: node pharn/floor/check-spec.mjs <SPEC.md>  (or --hash <SPEC.md> | --spec-id <SPEC.md> | --state <SPEC.md>)");
    return 1;
  }
  return validate(args[0]);
}

process.exit(main());
