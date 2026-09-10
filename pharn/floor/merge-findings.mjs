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
// DETERMINISM (P5). Output bytes are INVARIANT under input-file order and intra-array order: findings
// group into a keyed map keyed on the NORMALIZED enum-gated fields, groups sort by (file, rule_id, type),
// each group's sources sort by (source, problem, evidence, severity), the scalar problem/evidence are taken
// from sources[0] after sort, and the emitted rule_id is the lexicographic-min trimmed original in the
// group. Merged severity = MAX over {blocking>important>minor} (an ordered-enum reduce, not judgment).
//
// Usage:   node pharn/floor/merge-findings.mjs <out.json> [<in1.json> <in2.json> ...]
//   - <out.json> required; zero inputs is legal → writes the empty array [].
//   - Each input is read as a finding-shape findings.json (a JSON ARRAY). The input's SOURCE lens id is
//     derived deterministically from its path (parent dir name — the emission convention
//     pharn/features/<lens>/findings.json), used only as trusted provenance in sources[].
// Output:  writes <out.json> (2-space JSON + trailing newline, deterministic); prints
//          {"merged":<int>,"inputs":<int>,"dropped":<int>} to stdout; exit 0 on success.
// Fail-closed (P5): a missing <out>, or ANY input that is unreadable / not valid JSON / not an array,
//          → exit non-zero, writing NOTHING to <out> (all inputs are validated before any write).

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";

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

// The trusted source id for provenance: the emission convention is pharn/features/<lens>/findings.json, so the
// lens is the parent directory name. Deterministic; falls back to the raw path if there is no parent.
function sourceIdOf(inputPath) {
  const parent = basename(dirname(inputPath));
  return parent && parent !== "." && parent !== "" ? parent : inputPath;
}

// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.length < 1) die("usage: merge-findings.mjs <out.json> [<in.json> ...]");
const outPath = argv[0];
const inPaths = argv.slice(1);

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
    g.sources.push({ source, severity: f.severity, problem: asText(f.problem), evidence: asText(f.evidence) });
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
process.stdout.write(JSON.stringify({ merged: merged.length, inputs: inPaths.length, dropped }) + "\n");
process.exit(0);
