#!/usr/bin/env node
// pharn/floor/merge-findings.mjs — deterministic merge + dedup of per-lens findings.json (CONSTITUTION P0/P2/P5).
//
// PURPOSE. A parallel /pharn-review spawns one subagent per lens; each emits its own findings.json
// (the JSON array defined by pharn-contracts/finding-shape.md §Emission). This helper ASSEMBLES those
// N arrays into ONE merged findings.json and DEDUPS — two lenses reporting the same problem-class at
// the same location collapse to one finding. It is the ONLY floor-grade part of a parallel review:
// the per-lens findings are advisory (a lens can't "decide approve" — ARCHITECTURE §7); THIS merge is
// deterministic (ARCHITECTURE §2 primitive #3, enum/regex over the finding objects). "merged" NEVER
// means "the findings are correct" or "the code is safe" (P0) — it means the assembly is deterministic.
//
// THE DEDUP KEY IS ENUM-GATED ONLY (P2 — the whole point). The key is (type, rule_id, file): the
// finding-shape enum-gated / floor-verifiable fields (finding-shape.md — cited, not restated, P4), each
// NORMALIZED first so lens format drift cannot defeat dedup — rule_id is trim+case-folded, and file is
// canonicalized (canonFile: leading "./" and trailing ":col" stripped). It NEVER reads the tainted
// free-text (problem/evidence) — "problem-class" is the enum-gated rule_id, not the sentence. So the
// grouping/identity decision rests only on validated, normalized enum-gated fields; no guaranteed decision
// rests on a tainted field (ARCHITECTURE §8, fix #1).
//
// THE KEY DEGENERATES ON THE SHIPPED LENS SET, AND THAT MUST BE SAID PLAINLY (P0). The paragraph above
// describes the key's DESIGN. Its LIVE behaviour today is narrower: all 22 shipped lenses under
// pharn/pharn-review/ declare `enforces: ["P2"]` and emit `rule_id: P2` — ONE value, corpus-wide
// (`grep -ho 'rule_id: *[A-Za-z0-9._-]*' pharn/pharn-review/*/*.md | sort | uniq -c` -> `44 rule_id: P2`).
// The rule_id term is therefore CONSTANT, and the key collapses from (type, rule_id, file) to
// effectively (type, file). Every finding two lenses report at the same file:line merges, whatever the
// two were actually about.
//
// WHAT THAT COSTS, concretely, because the merge is lossy in TWO different directions at once:
//   - `severity` is MAX-ESCALATED across the group (rankToSeverity[g.sevRank]).
//   - `problem`/`evidence` are taken from sources[0] — the LEXICOGRAPHIC-MIN lens NAME.
// So a `blocking` hardcoded-secret finding and a `minor` duplicated-block finding at src/app.ts:10
// render as one finding reading "blocking — duplicated logic block": the severity from one contributor
// and the text from a DIFFERENT one. Nothing is fabricated and nothing is silently dropped — every
// contributor survives verbatim in `sources[]`, which is why /pharn-review renders it UNCONDITIONALLY —
// but the merged scalar triple is a chimera and must not be read as one lens's verdict.
//
// NOT REDESIGNED, deliberately. The structural fix is distinct file-qualified rule_ids (P4's
// "security.md SEC-1" shape) across 22 lenses and their eval fixtures — a large change that is not this
// increment's, and inventing per-lens ids here would be the speculative addition P7 forbids. Surfaced by
// an adversarial review (`dedup-key-degenerate-p2`, HIGH), whose own prescription was "label, don't
// redesign". `merge-findings.test.mjs` pins the degeneracy as a KNOWN state, so the day a second rule_id
// value ships, that test fails and this comment gets revisited.
//
// FAIL-CLOSED VALIDATION AT THE MERGE (fix #1 applied here). A lens subagent reads trust: untrusted
// code and could be injected into LAUNDERING a needle (e.g. a multi-line instruction) into an
// enum-gated field. Before grouping, every finding's enum-gated fields are structurally validated;
// one that fails — a control-char/newline in rule_id, a file without :line, a bad type/severity — is
// DROPPED and reported (never merged, never trusted). The validation admits the legitimate
// file-qualified rule_id form ("security.md SEC-1", which contains a SPACE) while rejecting the
// multi-line laundering vector (it forbids control chars, not spaces) — see hasControlChar / isCleanScalar.
//
// OUTPUT SHAPE. Each merged finding is finding-shape-CONFORMANT on the six required fields
// (type, rule_id, severity, file, problem, evidence — scalars), PLUS an ADDITIVE `sources[]` provenance
// array carrying every contributor's {source, severity, problem, evidence} as quoted DATA — the per-source
// severity so a group-level MAX escalation stays auditable against each lens's own value. The additive
// field is documented, not a redefinition of finding-shape (P4): finding-shape consumers (e.g.
// check-structural.mjs) read the six fields and ignore the extra; needle_absent_from_enum_gated still scans
// only the enum-gated fields, never sources[] (which legitimately quotes attacker payloads as evidence).
//
// THE PER-CONTRIBUTOR `backstop` LABEL (added with the finding-backstop-class increment). Each
// sources[] entry additionally carries `backstop` — a member of the closed BACKSTOP_ENUM below saying
// what deterministic detection stood behind THAT lens for THAT file. It exists because a merged group of
// N contributors otherwise reads as N independent flags: /pharn-review's own guarantee audit STRIKES "a
// skill cannot suppress a finding" for the four scanner-less lenses (hallucinated-api, input-validation,
// race-condition, trust-fence), and nothing in the rendered group let a reader see which contributors
// those were. Measured before building: two findings at one file:line — one from a scanner-bound lens,
// one from a scanner-less lens — render identically, and the scanner-less one had MAX-ESCALATED the
// group's severity.
//
// DERIVED, NEVER DECLARED (P5). The value is computed here from TWO structured artifacts — the
// committed, consistency-tested pharn/floor/lens-scanner-map.json and the per-run
// pharn/features/<name>/assignments.json (schema review-assignments/v1) — so no lens declares its own
// evidence class and no model picks a label. Enum-gated fields only: the map's scanners[<lens>], the
// record's `basis`, `target`, `slice` and `scanner_errors`. NO free text from either artifact
// participates, so a needle laundered into a record field cannot become a label.
//
// WHAT EACH MEMBER MEANS, AND THE ASYMMETRY IS DELIBERATE (P0):
//   - `scanner-assigned`  — the RECORD states this file was assigned to this lens on a scanner-bound
//                           basis, AND the committed map agrees that lens has a scanner. THAT IS ALL.
//                           It is NOT "a regex matched this file": the record is NOT bound to its
//                           producer (/pharn-review's audit records this as MEASURED — a hand-authored
//                           record exits 0 GREEN), and whether the lens REPORTS a match honestly,
//                           completely, or at all remains advisory. It adds NO credibility to a finding.
//   - `scanner-less`      — the map holds `null` for this lens: NOTHING deterministic ran. The finding
//                           is model judgment over the whole target with no structural floor beneath it.
//                           This is the one member that carries information a reader needs.
//   - `scanner-errored`   — the record's scanner_errors names {lens, file}: the scanner produced NO
//                           verdict here. A throw is not a miss (render-review-assignments.mjs keeps the
//                           two distinct on purpose), so this is not folded into `slice-miss`.
//   - `slice-miss`        — a recorded verdict did not place this file in the lens's slice.
//   - `unknown`           — nothing can be said. Reached when the record or map is absent, unreadable or
//                           malformed; the lens is absent from either; the map and record DISAGREE about
//                           whether the lens has a scanner; or the file is not in the record's `target`.
//
// THE LABEL IS A PROPERTY OF THE CONTRIBUTOR, NOT OF THE FINDING. It is a ONE-DIRECTIONAL warning about
// ABSENCE: a scanner-bound label adds nothing, while a scanner-less label subtracts a guarantee a reader
// may otherwise assume. A reader who ignores it entirely is still correct. The words "verified",
// "confirmed", "corroborated" and "confidence" appear in no member name and in no rendered string,
// because each would claim something about the FINDING.
//
// FAIL-CLOSED, AND `slice-miss` IS THE SHARP CASE. Every unusable input resolves to `unknown` — a
// missing map or record can never yield a label that LOOKS confident. `slice-miss` is additionally gated
// on the file appearing in the record's own `target` array, and that gate is load-bearing: without it a
// `file` in a base form canonFile does not normalize (absolute, "../", backslashes — bounds it declares
// itself) would fail the lookup and be labelled `slice-miss`, a confident NEGATIVE manufactured by a
// failed join and indistinguishable from a true miss. Surfaced by this increment's own GRILL.md as its
// one blocking-severity finding.
//
// A MAP/RECORD DISAGREEMENT IS REFUSED, NOT ARBITRATED (L43). A consistency check over two stores of one
// fact certifies their agreement, never the fact — they can be stale together. The useful direction here
// is the inverse: where the committed map and the per-run record contradict each other about whether a
// lens has a scanner, the label is `unknown`. This checker does not pick a winner.
//
// READ, NEVER RE-RUN (L42). The label reads the RECORDED scanner verdict; it never re-executes a
// scanner. Re-execution would answer "would this scanner hit NOW", not "what was assigned THEN" — the
// distinction /pharn-review Step 3 and the emitter's own header both already draw.
//
// DETERMINISM (P5). Output bytes are INVARIANT under input-file order and intra-array order: findings
// group into a keyed map keyed on the NORMALIZED enum-gated fields, groups sort by (file, rule_id, type),
// each group's sources sort by (source, problem, evidence, severity), the scalar problem/evidence are taken
// from sources[0] after sort, and the emitted rule_id is the lexicographic-min trimmed original in the
// group. Merged severity = MAX over {blocking>important>minor} (an ordered-enum reduce, not judgment).
//
// Usage:   node pharn/floor/merge-findings.mjs <out.json> [<in1.json> <in2.json> ...]
//                                              [--lens-map <path>] [--assignments <path>]
//   - The POSITIONAL signature is unchanged, deliberately: /pharn-review Step 5 passes <out> plus a
//     glob of per-lens findings, so a new positional would have silently become an input file. Both new
//     arguments are NAMED flags with defaults, so that call site needs no edit.
//   - --lens-map     defaults to lens-scanner-map.json beside THIS script (fileURLToPath, so a path
//                    holding a space or a non-ASCII byte resolves — L25's percent-encoding break).
//   - --assignments  defaults to assignments.json beside <out.json>, which is exactly where
//                    /pharn-review Step 1b writes it (pharn/features/<name>/).
//     Flags are defaults rather than hardcoded paths so the tests can reach every degradation branch
//     with a fixture; one test still exercises each DEFAULT, because a default every test overrides is
//     exercised by nothing (L41).
//   - <out.json> required; zero inputs is legal → writes the empty array [].
//   - Each input is read as a finding-shape findings.json (a JSON ARRAY). The input's SOURCE lens id is
//     derived deterministically from its path (parent dir name — the emission convention
//     pharn/features/<name>/lenses/<lens>/findings.json), used only as trusted provenance in sources[].
// Output:  writes <out.json> (2-space JSON + trailing newline, deterministic); prints
//          {"merged":<int>,"inputs":<int>,"dropped":<int>} to stdout; exit 0 on success.
// Fail-closed (P5): a missing <out>, or ANY input that is unreadable / not valid JSON / not an array,
//          → exit non-zero, writing NOTHING to <out> (all inputs are validated before any write).

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SEVERITY_RANK = { minor: 0, important: 1, blocking: 2 };
const SEVERITY_ENUM = new Set(Object.keys(SEVERITY_RANK));
// Key separator: the NUL byte. Built via fromCharCode so the SOURCE stays printable ASCII. A validated
// enum-gated field forbids all control chars (below), so NUL can never occur inside one → no key collision.
const NUL = String.fromCharCode(0);

function die(msg) {
  process.stderr.write("merge-findings: " + msg + "\n");
  process.exit(1);
}

// True iff s contains any C0 control char or DEL (charcode < 32 or === 127) — the newline/control-char
// laundering vector. Implemented by charcode scan (no control-char regex literal in the source).
function hasControlChar(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

// A scalar enum-gated value is CLEAN iff it is a non-empty, bounded, single-line string with no control
// characters. It admits spaces (so "security.md SEC-1" passes) but forbids the newline/control-char
// laundering vector. isCleanScalar is the FLOOR under every enum-gated check and MUST run BEFORE any shape
// regex: JS `$` matches before a trailing newline, so a shape regex alone would re-admit a "P2\n" trailing-
// control-char vector — isCleanScalar rejects it first (see RULE_ID_OK).
function isCleanScalar(v, max = 200) {
  return typeof v === "string" && v.length >= 1 && v.length <= max && !hasControlChar(v);
}

const TYPE_OK = (v) => isCleanScalar(v, 64) && /^[A-Z][A-Z0-9_]*$/.test(v); // FINDING | CONSTITUTION_VIOLATION | ...

// FIX 1 (harden-merge-keying, Option A — structural regex-tighten; approved at a human gate to REVERSE the
// prior "don't whitelist rule shapes" note). A rule_id is valid iff it is a clean scalar AND, after
// trimming, matches ONE of the two legitimate rule shapes: a principle P0..P7, or a file-qualified stack
// rule "<file>.md <ID>-<n>" (e.g. "security.md SEC-1"). A prose instruction (many tokens/spaces) matches
// neither → DROPPED before keying, so it can NEVER enter a TRUSTED-labeled field or become a REVIEW.md
// section header. This is a SHAPE guarantee (enum-regex, ARCHITECTURE §2), NOT roster membership — no
// roster artifact exists; the claim is precisely "shape-valid", labeled honestly (P0). Shapes are
// case-insensitive so "SEC-1"/"sec-1" both validate, then collapse via the case-folded key below.
const RULE_ID_PRINCIPLE = /^P[0-7]$/i;
const RULE_ID_QUALIFIED = /^[\w./-]+\.md [A-Za-z0-9]+-\d+$/;
const RULE_ID_OK = (v) => isCleanScalar(v, 120) && (RULE_ID_PRINCIPLE.test(v.trim()) || RULE_ID_QUALIFIED.test(v.trim()));

const FILE_OK = (v) => isCleanScalar(v, 400) && /:\d+$/.test(v) && v.indexOf(":") > 0; // path:line, a real anchor

// FIX 2 (harden-merge-keying): canonicalize a validated `file` so lens FORMAT DRIFT collapses to one key.
// Strip a single leading "./" and a trailing ":col" (a second :\d+ after the line), so "src/app.ts:10",
// "./src/app.ts:10", and "src/app.ts:10:5" all become "src/app.ts:10" → one dedup key. Deterministic string
// rewrite (P5); applied to BOTH the key and the emitted `file`. BOUNDED to these two drifts — NOT
// absolute-vs-relative base, "../", or backslashes: an honest partial canonicalization, not general
// location-identity.
function canonFile(v) {
  const s = v.startsWith("./") ? v.slice(2) : v;
  return s.replace(/^(.*:\d+):\d+$/, "$1");
}

// Coerce a free-text field to a carried-as-DATA string (never gates; never executed). Non-strings → "".
function asText(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

// The trusted source id for provenance: the emission convention is
// pharn/features/<name>/lenses/<lens>/findings.json (/pharn-review Step 4, re-derived live rather than
// carried across — L25), so the lens is the parent directory name either way. Deterministic; falls back
// to the raw path if there is no parent, which is why a source id is NOT guaranteed to be a map key.
function sourceIdOf(inputPath) {
  const parent = basename(dirname(inputPath));
  return parent && parent !== "." && parent !== "" ? parent : inputPath;
}

// ---------------------------------------------------------------------------
// The per-contributor backstop label (see the header block). A CLOSED set, exported so the tests range
// over THIS enumeration rather than asserting whichever member was in front of the author (L29), and so
// a closure assertion can require every emitted value AND every rendered string to be a member (L36).
// The `BASIS_ENUM` in render-review-assignments.mjs is the precedent this follows.
export const BACKSTOP_ENUM = Object.freeze(["scanner-assigned", "scanner-less", "scanner-errored", "slice-miss", "unknown"]);
const BACKSTOP_SET = new Set(BACKSTOP_ENUM);

// The record's `basis` values, as render-review-assignments.mjs writes them. Duplicated here rather than
// imported: merge-findings is the only floor-grade combine step and stays stdlib-only with no
// cross-checker import (the norm among these checkers). The ✧ test pins these two strings against the
// emitter's own exported BASIS_ENUM, so the copy cannot drift silently (L31 — a deliberate copy-pair
// owes a materialized obligation).
const BASIS_SCANNER_BOUND = "scanner-bound";
const BASIS_WHOLE_TARGET = "whole-target-fallback";

// A finding's `file` is `path:line`; the record's `target`/`slice` hold BARE repo-relative paths with
// forward slashes (render-review-assignments.mjs builds both via relative(repoDir, …).split(sep).join("/")).
// So the join is: canonFile first (strips one leading "./" and a trailing ":col"), then strip the trailing
// ":<line>" with one anchored replace. Deterministic string rewrite (P5). BOUNDED exactly as canonFile is
// — an absolute path, a "../" prefix or backslashes are NOT normalized, which is precisely why the caller
// gates on `target` membership and sends anything it cannot locate to `unknown` rather than `slice-miss`.
function barePath(v) {
  return canonFile(v).replace(/:\d+$/, "");
}

// Read the committed lens→scanner map. FAIL-SOFT by design: returns null on any unusable input, because
// an auxiliary label must never be able to kill the merge itself (the merge is legal with zero inputs).
// A null map forces every label to `unknown`.
function readLensMap(p) {
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    const s = parsed && parsed.scanners;
    if (!s || typeof s !== "object" || Array.isArray(s)) return null;
    return s;
  } catch {
    return null;
  }
}

// Read + INDEX the assignment record. Fail-soft, same reasoning. Every scalar taken from the record is
// passed through isCleanScalar before it is indexed, so a control char or newline laundered into a
// record field cannot reach a label or a rendered heading (P2, fix #1 applied to this new input).
function readAssignments(p) {
  let r;
  try {
    r = JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
  if (!r || typeof r !== "object" || Array.isArray(r)) return null;
  if (!Array.isArray(r.assignments) || !Array.isArray(r.target)) return null;

  const target = new Set(r.target.filter((f) => isCleanScalar(f, 400)));
  const byLens = new Map();
  for (const a of r.assignments) {
    if (!a || typeof a !== "object" || Array.isArray(a)) continue;
    if (!isCleanScalar(a.lens, 200)) continue;
    if (a.basis !== BASIS_SCANNER_BOUND && a.basis !== BASIS_WHOLE_TARGET) continue;
    const slice = new Set(Array.isArray(a.slice) ? a.slice.filter((f) => isCleanScalar(f, 400)) : []);
    byLens.set(a.lens, { basis: a.basis, slice });
  }
  const errored = new Set();
  if (Array.isArray(r.scanner_errors)) {
    for (const e of r.scanner_errors) {
      if (!e || typeof e !== "object" || Array.isArray(e)) continue;
      if (!isCleanScalar(e.lens, 200) || !isCleanScalar(e.file, 400)) continue;
      errored.add(e.lens + NUL + e.file);
    }
  }
  return { target, byLens, errored };
}

// Derive one contributor's label. Pure function of (lens, file, map, record) — no I/O, no judgment.
// Every branch returns a BACKSTOP_ENUM member; the order of the tests is the honesty order.
function deriveBackstop(lens, file, map, rec) {
  if (!map || !rec) return "unknown"; // an artifact was absent, unreadable or malformed
  // Own-property test, never `||`/`??` — an inherited prototype member would leak silently (L15).
  if (!Object.prototype.hasOwnProperty.call(map, lens)) return "unknown";
  const mapped = map[lens];
  const hasScanner = typeof mapped === "string" && mapped.length > 0;
  const isScannerless = mapped === null;
  if (!hasScanner && !isScannerless) return "unknown"; // a malformed map entry says nothing

  const a = rec.byLens.get(lens);
  if (!a) return "unknown"; // the record does not cover this lens

  // The committed map and the per-run record must AGREE about whether this lens has a scanner.
  // Disagreement is refused, not arbitrated (L43).
  if (hasScanner && a.basis !== BASIS_SCANNER_BOUND) return "unknown";
  if (isScannerless && a.basis !== BASIS_WHOLE_TARGET) return "unknown";
  if (isScannerless) return "scanner-less";

  // Scanner-bound from here. `target` membership gates every per-file claim: if the record does not
  // cover this file, nothing it says about the file is meaningful, so the honest answer is `unknown` —
  // NOT the confident-looking `slice-miss` (this increment's GRILL.md, blocking finding).
  const bare = barePath(file);
  if (!rec.target.has(bare)) return "unknown";
  if (rec.errored.has(lens + NUL + bare)) return "scanner-errored"; // a throw is not a miss
  return a.slice.has(bare) ? "scanner-assigned" : "slice-miss";
}

// ---------------------------------------------------------------------------
//
// Run as CLI only when invoked directly, so a test may import BACKSTOP_ENUM without executing the
// merge. `import.meta.main` — NOT a `file://` + argv[1] compare, which silently no-ops on spaced,
// non-ASCII or symlinked paths and once disarmed ten sibling checkers (L25).
if (import.meta.main) {
  const argv = process.argv.slice(2);

  // Extract the two NAMED flags, leaving the positional signature <out> [<in>...] intact. A single
  // left-to-right scan: a recognized flag consumes its VALUE, so an input file literally named
  // "--lens-map" cannot be silently eaten as a flag name without its value also being swallowed — and a
  // flag with no following value is a usage error, not a silent drop. Everything else stays positional in
  // order. Pinned by a test, because argv handling is exactly where a "reasonable" refactor breaks a glob.
  const FLAGS = { "--lens-map": null, "--assignments": null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (Object.prototype.hasOwnProperty.call(FLAGS, t)) {
      if (i + 1 >= argv.length) die(`flag ${t} requires a path`);
      FLAGS[t] = argv[++i];
      continue;
    }
    positional.push(t);
  }
  if (positional.length < 1) die("usage: merge-findings.mjs <out.json> [<in.json> ...] [--lens-map <path>] [--assignments <path>]");
  const outPath = positional[0];
  const inPaths = positional.slice(1);

  // Defaults (L41 — each is exercised by its own test, not only overridden).
  const lensMapPath = FLAGS["--lens-map"] ?? join(dirname(fileURLToPath(import.meta.url)), "lens-scanner-map.json");
  const assignmentsPath = FLAGS["--assignments"] ?? join(dirname(outPath), "assignments.json");

  // PHASE 1 — read + structurally validate EVERY input file before any write (fail-closed).
  const inputs = [];
  for (const p of inPaths) {
    let raw;
    try {
      raw = readFileSync(p, "utf8");
    } catch (e) {
      die(`cannot read input: ${p} (${e.code || e.message})`);
    }
    let arr;
    try {
      arr = JSON.parse(raw);
    } catch (e) {
      die(`input is not valid JSON: ${p} (${e.message})`);
    }
    if (!Array.isArray(arr)) die(`input is not a JSON array (findings.json must be an array): ${p}`);
    inputs.push({ source: sourceIdOf(p), findings: arr });
  }

  // PHASE 1b — read the two label artifacts. Fail-soft: a null here means every label becomes `unknown`,
  // never that the merge fails. Read ONCE, before grouping, so the derivation is a pure lookup.
  const lensMap = readLensMap(lensMapPath);
  const assignments = readAssignments(assignmentsPath);

  // PHASE 2 — validate each finding's enum-gated fields; DROP + report the malformed (never fatal).
  // Group the survivors by the enum-gated key (type, rule_id, file).
  const groups = new Map(); // key -> { type, rule_id, file, sevRank, sources: [{source, problem, evidence}] }
  let dropped = 0;
  const droppedReport = [];

  for (const { source, findings } of inputs) {
    for (const f of findings) {
      const ok =
        f &&
        typeof f === "object" &&
        !Array.isArray(f) &&
        TYPE_OK(f.type) &&
        RULE_ID_OK(f.rule_id) &&
        FILE_OK(f.file) &&
        SEVERITY_ENUM.has(f.severity);
      if (!ok) {
        dropped++;
        // Report only enum-gated shape info + the source; never echo the (possibly hostile) free-text as guidance.
        droppedReport.push({ source, type: f && typeof f === "object" ? f.type : typeof f, rule_id: f && f.rule_id, file: f && f.file });
        continue;
      }
      // Canonicalize `file` (FIX 2) and case-fold+trim `rule_id` for KEYING ONLY (secondary) so trivial
      // format variants collapse to one key. The EMITTED rule_id is a deterministic representative — the
      // lexicographic-min trimmed original across the group (order-invariant, P5), NOT the folded key — so
      // "security.md SEC-1" is preserved verbatim.
      const cfile = canonFile(f.file);
      const ridTrim = f.rule_id.trim();
      const key = f.type + NUL + ridTrim.toLowerCase() + NUL + cfile;
      let g = groups.get(key);
      if (!g) {
        g = { type: f.type, rule_id: ridTrim, file: cfile, sevRank: -1, sources: [] };
        groups.set(key, g);
      } else if (ridTrim < g.rule_id) {
        g.rule_id = ridTrim; // deterministic representative = lexicographic-min trimmed original
      }
      g.sevRank = Math.max(g.sevRank, SEVERITY_RANK[f.severity]);
      // Carry per-source severity (secondary): the group-level MAX (below) stays auditable against each
      // contributor's own severity, which a REVIEW.md reader can now see (one compromised lens escalating a
      // shared-key finding is visible, not silently folded).
      // `backstop` sits with the TRUSTED scalars, BEFORE the free-text pair — mirroring finding-shape's
      // own enum-gated-then-free-text ordering, and giving the renderer a trusted prefix it can place
      // outside the quoted block. Derived from `cfile` (already canonicalized) so the join sees the same
      // string the key does. It adds no new sort key: the label is a function of (source, file) and `file`
      // is constant within a group, so the sources[] sort below is byte-for-byte unchanged (P5).
      g.sources.push({
        source,
        severity: f.severity,
        backstop: deriveBackstop(source, cfile, lensMap, assignments),
        problem: asText(f.problem),
        evidence: asText(f.evidence),
      });
    }
  }

  // PHASE 3 — deterministic assembly. Sort sources within each group; take the representative scalar
  // problem/evidence from sources[0]; emit conformant six fields + additive sources[]. Sort groups.
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const rankToSeverity = ["minor", "important", "blocking"];

  const merged = [...groups.values()].map((g) => {
    g.sources.sort(
      (a, b) => cmp(a.source, b.source) || cmp(a.problem, b.problem) || cmp(a.evidence, b.evidence) || cmp(a.severity, b.severity)
    );
    const rep = g.sources[0];
    return {
      type: g.type,
      rule_id: g.rule_id,
      severity: rankToSeverity[g.sevRank],
      file: g.file,
      problem: rep.problem, // finding-shape-conformant scalar (DATA)
      evidence: rep.evidence, // finding-shape-conformant scalar (DATA)
      sources: g.sources, // ADDITIVE provenance (DATA) — every contributor, quoted; not part of the required set
    };
  });
  merged.sort((a, b) => cmp(a.file, b.file) || cmp(a.rule_id, b.rule_id) || cmp(a.type, b.type));

  // PHASE 4 — write (deterministic bytes) + report.
  try {
    writeFileSync(outPath, JSON.stringify(merged, null, 2) + "\n");
  } catch (e) {
    die(`cannot write output ${outPath}: ${e.message}`);
  }
  if (droppedReport.length) {
    process.stderr.write("merge-findings: dropped " + dropped + " malformed finding(s) (enum-gated validation failed):\n");
    for (const d of droppedReport) process.stderr.write("  - " + JSON.stringify(d) + "\n");
  }

  // Name the degradation on stderr. Without this, an absent or unusable artifact silently turns every
  // label into `unknown` and the operator sees an ordinary success line — a checker certifying by staying
  // quiet, which is the inverse of what a floor op is for (L25). It is a REPORT, never a gate: a missing
  // record is the normal state for a standalone merge outside /pharn-review, so it must not fail the run.
  if (!lensMap) process.stderr.write(`merge-findings: lens-scanner-map unusable (${lensMapPath}) — every backstop is \`unknown\`\n`);
  if (!assignments)
    process.stderr.write(`merge-findings: no usable assignment record (${assignmentsPath}) — every backstop is \`unknown\`\n`);

  // Per-member counts, in BACKSTOP_ENUM order (never Object-key order, which would depend on what the
  // corpus happened to contain). An all-`unknown` run is visible at a glance rather than inferable.
  const backstopCounts = {};
  for (const m of BACKSTOP_ENUM) backstopCounts[m] = 0;
  for (const f of merged) for (const s of f.sources) if (BACKSTOP_SET.has(s.backstop)) backstopCounts[s.backstop]++;

  process.stdout.write(JSON.stringify({ merged: merged.length, inputs: inPaths.length, dropped, backstop: backstopCounts }) + "\n");
  process.exit(0);
}
