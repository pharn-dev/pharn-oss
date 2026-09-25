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
// to LF (see bodyHash), with a `spec_kind:` line hashed in front when the frontmatter carries one (see pinHash).
// It does NOT — cannot — judge
// whether the INTENT is clear, complete, or wise: that is the human's advisory call, owned by the approval
// halt in /pharn-spec. "passed check-spec" must NEVER read as "the intent is sound" — that conflation is the
// P0 disease this repo exists to prevent.
//
// Trust (P2): the SPEC body is human-authored intent (free-text DATA). The verdict ranges ONLY over the
// enum-gated / floor-verifiable fields (section presence, state enum, spec_id presence, body-hash equality) —
// NEVER over the intent's meaning. No guaranteed decision rests on the free-text intent (mirrors fix #1).
//
// THE TEMPLATE CLI, a second axis this file hosts, stated rather than hidden (P3): besides §6's pin/state contract,
// this file is where a template is FOUND and READ — --template-ref, --resolve-template-ref and --template-path,
// including the project template's file checks (containment, an exact-name directory listing, lstat, an O_NOFOLLOW
// read). They live here because this is the file that already reads files; what a template's TEXT must contain is
// spec-template-core.mjs's validateTemplate(), which stays pure. A later split would move exactly those functions.
//
// THE SPEC-TEMPLATE RULES live in ./spec-template-core.mjs (P3: they change when the TEMPLATE changes; this file
// changes when §6's pin/state contract does), and pharn/pharn-contracts/spec-template.md defines them. This file
// only decides WHETHER they apply — isTemplated(): the frontmatter carries a `spec_template` line — and turns
// their findings into REDs. A SPEC without that line is LEGACY: none of those rules applies to it, so it gets no
// template-rule RED and the same GREEN line. The pin's layout rule (see pinHash) is §6's, not a template rule, and
// applies to every SPEC. Their bounds (opt-in, phrased-not-tested, which headings
// count, the line grammar, provenance only) are stated once, in the core's header, and in the contract.
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
//                                                      LF — see bodyHash; a `spec_kind:` line is hashed in
//                                                      front of the body — see pinHash) — the value /pharn-spec pins
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
//   node pharn/floor/check-spec.mjs --template-ref <id> print `<id>@sha256:<digest>` for a KNOWN template
//                                                      id — the value /pharn-spec writes into
//                                                      `spec_template`. The digest is bodyHash() over the
//                                                      whole template file (BOM stripped, line endings
//                                                      folded), so a CRLF checkout prints the same value.
//                                                      The INTENDED source of that value: /pharn-spec shells
//                                                      it rather than computing one (PHARN's own build-loop
//                                                      lesson L22). ADVISORY: rule 7 checks the value's
//                                                      shape, never that it came from this mode. There is no
//                                                      default id (L41). The template must pass
//                                                      validateTemplate() first, else it is REFUSED.
//   node pharn/floor/check-spec.mjs --resolve-template-ref
//                                                      print the reference /pharn-spec pins: `project@…` when
//                                                      the project's own template exists and validates, else
//                                                      `pharn-default@…`. "Exists" means a directory entry
//                                                      case-folds to its name; once one does, every failure is
//                                                      a REFUSAL (exit 1), NEVER a fallback to the default.
//   node pharn/floor/check-spec.mjs --template-path <id>
//                                                      print a known id's path, relative to the project root —
//                                                      the file /pharn-spec fills. Registry only: no file check.
//
// A REFUSED template prints nothing on stdout and one line per reason on stderr:
//   check-spec: template "<id>" refused (<code>): <detail>
// where <code> is a member of spec-template-core.mjs's TEMPLATE_REFUSALS.
//
// Bounds of the project template's file checks, each also in the contract: the O_NOFOLLOW / fstat branches are
// reachable only by a race between the listing and the read, so no deterministic test reaches them; /pharn-spec's
// later Read of the file is not tied to the digested bytes; and the hook's Windows trailing dot/space fold is not
// mirrored. A symlinked pharn/ or pharn/floor/ is a REFUSAL (symlinked-root), not a bound.
//
// Exit: 1 on any RED (validate) / on unreadable | no-frontmatter (--hash, --spec-id, --state) / on an unknown
// id, a missing id, or a refused template (--template-ref, --resolve-template-ref), and on an unknown or missing
// id (--template-path, which never reads a file); 0 otherwise. Every read-only mode REPORTS its refusal on stderr before exiting non-zero (L5). See emitState.

import { closeSync, constants, fstatSync, lstatSync, openSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { FIELD_LINE_RE, FM_RE, readValue, stripBom } from "./frontmatter-core.mjs";
import {
  H2_RE,
  isTemplated,
  checkTemplate,
  templatePath,
  knownTemplateIds,
  isShippedTemplate,
  projectRoot,
  foldName,
  validateTemplate,
  PROJECT_TEMPLATE_ID,
  specKindLines,
  kindLineOpensBody,
} from "./spec-template-core.mjs";

// Enums / shapes — every branch is a presence / enum / hash-equality membership test (P5); the terminal
// fallback on any non-member is a loud RED, never a guess. These are the enum-gated / floor-verifiable fields.
const REQUIRED_SECTIONS = ["intent", "scope", "acceptance criteria", "constraints"]; // §6 SPEC presence set
const STATE_ENUM = ["Draft", "Approved"]; // the spec lifecycle (ARCHITECTURE §6)
const HASH_RE = /^[0-9a-f]{64}$/; // a SHA-256 hex digest

const reds = [];
function red(kind, detail) {
  reds.push({ kind, detail });
}

// A frontmatter field VALUE is read by `readValue` in frontmatter-core.mjs — the quote resolved first, then an
// unquoted ` #` comment stripped — and a field LINE is matched by its `FIELD_LINE_RE`. Both lived here as private
// copies until 6.20.5 and were MOVED there byte-for-byte, so check-plan-spec-agree.mjs and ac-tests-lock.mjs read
// every field exactly as this checker does (L35).

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
    const kv = line.match(FIELD_LINE_RE);
    if (kv) fm[kv[1]] = readValue(kv[2]);
  }
  return { fm, raw: m[1], body: text.slice(m[0].length) };
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

// THE PIN (6.18.0): the body hash, EXCEPT that a SPEC whose frontmatter carries a line starting `spec_kind:` hashes
// that raw line (CR removed) plus "\n" in front of the body. The kind decides whether /pharn-test writes failing
// tests first (`feature`) or records a bootstrap lock (`test-infra`), so it is part of the approved intent: flipping
// an Approved feature SPEC to `test-infra` without re-approving is drift (grill G2). A SPEC with no such line hashes
// exactly as bodyHash — no pin written before 6.18.0 moves, which is what keeps this additive. The lines are read by
// spec-template-core.mjs specKindLines(), the SAME reading specKindOf() decides the kind from (G9), so what counts
// as the kind and what the pin covers cannot diverge. Every other frontmatter key stays outside the pin, as before.
// Bound, unchanged by this: a self-consistent rewrite of the SPEC and its pin passes — the pin detects drift, it
// does not authenticate an approver.
//
// WHY THE SPLIT IS UNIQUE (6.20.7), and the one layout it needs forbidden. The hashed string is K + B: K is the kind
// lines, and each is a `split("\n")` piece (so it holds no LF) that starts at column 0 with `spec_kind:` and is hashed
// with one trailing "\n"; B is the folded body. Read the string from its start. While it opens with `spec_kind:`, the
// text up to the next "\n" can only be a kind line, so the reading is forced. If B does not itself open with
// `spec_kind:`, the reading stops exactly where K ends, and the string gives one (K, B) and no other. A body whose first
// line DOES start `spec_kind:` breaks that: moving the line between the body and the frontmatter keeps the pin while
// changing the kind (feature ↔ test-infra, without re-approval). So validate() REDs that layout (`pin`) for every SPEC,
// and kindLineOpensBody() — the same regex specKindLines uses — is the one test for it. A body that opens with a
// blank line, or with ` spec_kind:` (a leading space), is not ambiguous: the reading stops at its first character.
// No pin moves: this function is unchanged, and no SPEC in the forbidden layout can pass validation.
function pinHash(raw, body) {
  const kind = specKindLines(raw)
    .map((l) => `${l}\n`)
    .join("");
  return createHash("sha256")
    .update(kind + body.replace(/\r\n/g, "\n"))
    .digest("hex");
}

// The lowercased text of each `## ` (exactly h2) heading in the body — the first-match parse mechanism from
// check-provenance.mjs's existingIds, re-implemented in-file (no sibling import, P3). `### foo` (h3) does not
// match (the `\s+` after `##` rejects a third `#`).
function headingsOf(body) {
  const out = [];
  for (const line of body.split(/\r?\n/)) {
    const hm = line.match(H2_RE);
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

// --- --hash mode: emit the pin (pinHash: sha256(body), a `spec_kind:` line in front when present), the value
// /pharn-spec writes into spec_content_hash on approval. ---
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
  process.stdout.write(pinHash(parsed.raw, parsed.body) + "\n");
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
// for all three modes reporting, not for one of them doing it. Those three read-only modes are now uniform;
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
  const { fm, raw, body } = parsed;

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

  // (3b) every SPEC, every state: the body may not open with a `spec_kind:` line — the one layout the pin cannot tell
  //      from the same line in the frontmatter (see pinHash). A Draft is caught before approval. The detail is fixed
  //      text: the line's value is never echoed (P2).
  if (kindLineOpensBody(body)) {
    red(
      "pin",
      "the body's first line starts `spec_kind:`, so the approval pin cannot tell it from the frontmatter key — " +
        "move the line into the frontmatter (a test-infra SPEC) or change the body's first line (a feature SPEC); " +
        "an Approved SPEC must then be re-approved"
    );
  }

  // (4) when Approved: spec_content_hash present, well-formed, AND equals pinHash (sha256(body), with a `spec_kind:`
  //     line in front when present) — the content-hash pin
  //     (fix #4). A Draft is not yet pinned, so its hash is not checked. A post-approval body edit that does
  //     not re-pin makes the recompute diverge → a deterministic RED (drift is loud, not silent).
  if (fm.state === "Approved") {
    const h = fm.spec_content_hash || "";
    if (!HASH_RE.test(h)) {
      red("pin", `an Approved spec needs spec_content_hash matching ${HASH_RE} (a sha256), got ${JSON.stringify(h)}`);
    } else if (h !== pinHash(raw, body)) {
      red("pin", "spec_content_hash does not equal the body hash — the approved intent drifted (re-approve to re-pin)");
    }
  }

  // (5) the spec-template rules (spec-template-core.mjs) — ONLY when the frontmatter carries a `spec_template`
  //     line (isTemplated: a raw line test, so a key line the field parser drops still opts in). A SPEC without
  //     one is legacy and never reaches this branch, so its verdict and output are unchanged.
  const templated = isTemplated(fm, raw);
  let tpl = null;
  if (templated) {
    const firstLine = (text.slice(0, text.length - body.length).match(/\n/g) || []).length + 1;
    tpl = checkTemplate({ fm, raw, body, firstLine, baseRequired: REQUIRED_SECTIONS });
    for (const f of tpl.findings) red(f.kind, f.detail);
  }

  if (reds.length) return fail();
  const pinned = fm.state === "Approved" ? "; intent pinned" : "";
  if (templated) {
    console.log(
      `GREEN — spec valid; state ${JSON.stringify(fm.state)}; ${tpl.required} required sections present; ` +
        `template ${JSON.stringify(tpl.id)}; ${tpl.acCount} AC item(s)${pinned}`
    );
    return 0;
  }
  console.log(`GREEN — spec valid; state ${JSON.stringify(fm.state)}; ${REQUIRED_SECTIONS.length} required sections present${pinned}`);
  return 0;
}

// --- the template CLI: find, read, validate, print ---------------------------------------------------------------
//
// A template id resolves to a path through spec-template-core.mjs's registry. The digest is bodyHash() over the
// whole template file — the same fold as the SPEC pin, so a CRLF checkout prints the same value — after the BOM
// strip. It computes a value; it detects nothing: no check ever compares a SPEC's recorded digest with the template
// file (see spec-template-core.mjs's PROVENANCE bound).

const rootRel = (p) => relative(projectRoot(), p).split(sep).join("/");
const refused = (code, detail) => ({ refused: [{ code, detail }] });

// Read a PROJECT (non-shipped) template: containment first (pure path arithmetic, before any filesystem call), then
// each path component from the root through its parent's directory LISTING — the only absence proof, because a
// listing names a dangling symlink where a link-following stat reports "absent" (L54) — then lstat, then the read
// itself through an O_NOFOLLOW | O_NONBLOCK descriptor checked with fstat. Returns { text } | { absent: true } |
// { refused }. A case-folded match that is not an exact match is a refusal on EVERY filesystem, so a case-insensitive
// volume and a case-sensitive one resolve the same checkout the same way.
// The project root as INVOKED: two levels above the path this script was run as (argv[1], which Node does not
// resolve), canonicalized. projectRoot() comes from the module's REAL path instead. The two differ exactly when the
// checker was reached through a symlinked pharn/ or pharn/floor/, and then the project template, the write guard
// and the checker would each mean a different directory — so the checker refuses rather than read the wrong one
// (REVIEW finding F1). A symlink ABOVE the project (macOS's /var -> /private/var) canonicalizes away on both sides.
function invokedRootMismatch() {
  let invoked, real;
  try {
    invoked = realpathSync(resolve(dirname(process.argv[1]), "..", ".."));
    real = realpathSync(projectRoot());
  } catch (e) {
    return `cannot resolve the project root: ${e.code || e.message}`;
  }
  return invoked === real
    ? null
    : "the checker was reached through a symbolic link (pharn/ or pharn/floor/), so the project root it would read is not the one it was run from — run it through the project's real path";
}

function readProjectTemplate(id) {
  const mismatch = invokedRootMismatch();
  if (mismatch) return refused("symlinked-root", mismatch);
  const target = templatePath(id);
  const rel = relative(projectRoot(), target);
  if (rel === "" || isAbsolute(rel) || rel === ".." || rel.startsWith(".." + sep)) {
    return refused("outside-root", `the registry path does not lie strictly inside the project root`);
  }
  let cur = projectRoot();
  const parts = rel.split(sep);
  for (let k = 0; k < parts.length; k++) {
    const name = parts[k];
    let entries;
    try {
      entries = readdirSync(cur);
    } catch (e) {
      return refused("unreadable", `cannot list ${rootRel(cur) || "."}: ${e.code || e.message}`);
    }
    if (entries.some((e) => e !== name && foldName(e) === foldName(name))) {
      return refused(
        "name-case",
        `an entry in ${rootRel(cur) || "."} matches ${JSON.stringify(name)} only when case is ignored — rename it to exactly that`
      );
    }
    if (!entries.includes(name)) return { absent: true };
    const p = join(cur, name);
    let st;
    try {
      st = lstatSync(p);
    } catch (e) {
      return refused("unreadable", `cannot stat ${rootRel(p)}: ${e.code || e.message}`);
    }
    if (st.isSymbolicLink()) return refused("symlink", `${rootRel(p)} is a symbolic link — the template must be a regular file`);
    const last = k === parts.length - 1;
    if (last ? !st.isFile() : !st.isDirectory()) {
      return refused("not-regular-file", `${rootRel(p)} is not a ${last ? "regular file" : "directory"}`);
    }
    cur = p;
  }
  let fd;
  try {
    fd = openSync(cur, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  } catch (e) {
    // Reachable only if the leaf was swapped for a symlink between the lstat above and this open (a race).
    if (e.code === "ELOOP") return refused("symlink", `${rootRel(cur)} became a symbolic link while being read`);
    return refused("unreadable", `cannot open ${rootRel(cur)}: ${e.code || e.message}`);
  }
  try {
    // Reachable only if the leaf was swapped for a FIFO or device between the lstat and the open (a race).
    if (!fstatSync(fd).isFile()) return refused("not-regular-file", `${rootRel(cur)} stopped being a regular file while being read`);
    return { text: stripBom(readFileSync(fd, "utf8")) };
  } catch (e) {
    return refused("unreadable", `cannot read ${rootRel(cur)}: ${e.code || e.message}`);
  } finally {
    closeSync(fd);
  }
}

// Read a SHIPPED template: its path is PHARN's own, so it keeps the plain read it always had.
function readShippedTemplate(id) {
  try {
    return { text: stripBom(readFileSync(templatePath(id), "utf8")) };
  } catch (e) {
    return refused("unreadable", `cannot read ${rootRel(templatePath(id))}: ${e.code || e.message}`);
  }
}

// Validate a template's text and compute its reference line. Returns { line } | { refused }.
function templateRef(id, text) {
  const parsed = parseSpec(text);
  if (!parsed) return refused("frontmatter", "no YAML frontmatter block (`---` … `---`)");
  const firstLine = (text.slice(0, text.length - parsed.body.length).match(/\n/g) || []).length + 1;
  const { refusals } = validateTemplate({ raw: parsed.raw, body: parsed.body, firstLine, baseRequired: REQUIRED_SECTIONS });
  if (refusals.length) return { refused: refusals };
  return { line: `${id}@sha256:${bodyHash(text)}` };
}

function printRef(id, got) {
  if (got.refused) {
    for (const r of got.refused) console.error(`check-spec: template ${JSON.stringify(id)} refused (${r.code}): ${r.detail}`);
    return 1;
  }
  const out = templateRef(id, got.text);
  if (out.refused) return printRef(id, out);
  process.stdout.write(out.line + "\n");
  return 0;
}

const unknownId = (id) => {
  console.error(`check-spec: unknown template id ${JSON.stringify(id)} — known: {${knownTemplateIds().join(", ")}}`);
  return 1;
};

// --- --template-ref <id>: the reference for ONE named template, validated first. ---
function emitTemplateRef(id) {
  if (templatePath(id) === null) return unknownId(id);
  if (isShippedTemplate(id)) return printRef(id, readShippedTemplate(id));
  const got = readProjectTemplate(id);
  if (got.absent) return printRef(id, refused("absent", `no ${rootRel(templatePath(id))} at the project root`));
  return printRef(id, got);
}

// --- --resolve-template-ref: the project's own template when it exists, else the shipped default. ---
function emitResolvedRef() {
  const got = readProjectTemplate(PROJECT_TEMPLATE_ID);
  if (!got.absent) return printRef(PROJECT_TEMPLATE_ID, got);
  return printRef("pharn-default", readShippedTemplate("pharn-default"));
}

// --- --template-path <id>: the file /pharn-spec fills, relative to the project root. Registry only. ---
function emitTemplatePath(id) {
  if (templatePath(id) === null) return unknownId(id);
  process.stdout.write(rootRel(templatePath(id)) + "\n");
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
  if (args[0] === "--template-ref") {
    if (!args[1]) {
      console.error("check-spec: usage: node pharn/floor/check-spec.mjs --template-ref <id>");
      return 1;
    }
    return emitTemplateRef(args[1]);
  }
  if (args[0] === "--resolve-template-ref") {
    if (args.length !== 1) {
      console.error("check-spec: usage: node pharn/floor/check-spec.mjs --resolve-template-ref  (it takes no argument)");
      return 1;
    }
    return emitResolvedRef();
  }
  if (args[0] === "--template-path") {
    if (!args[1]) {
      console.error("check-spec: usage: node pharn/floor/check-spec.mjs --template-path <id>");
      return 1;
    }
    return emitTemplatePath(args[1]);
  }
  if (!args[0]) {
    console.log(
      "RED — usage: node pharn/floor/check-spec.mjs <SPEC.md>  (or --hash <SPEC.md> | --spec-id <SPEC.md> | --state <SPEC.md> | " +
        "--template-ref <id> | --resolve-template-ref | --template-path <id>)"
    );
    return 1;
  }
  return validate(args[0]);
}

process.exit(main());
