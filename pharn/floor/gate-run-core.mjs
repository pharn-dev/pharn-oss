#!/usr/bin/env node
// pharn/floor/gate-run-core.mjs — the PURE grammar + set-resolution + stamp-validation core for the
// gate runner. No `child_process`, no spawning, no network. The CLI half lives in run-gates.mjs and the
// hashing half in worktree-fingerprint.mjs (P3, one axis per file).
//
// ============================== WHY THIS EXISTS (P7 — a recorded failure) ==============================
//
// /pharn-verify and /pharn-regress compute a FLOOR verdict from a `{gate-id: exit-int}` map — and until
// now the model TYPED that map. verify's Step 3c captured five exit codes in Bash (`=$?`) and then wrote
// the JSON by hand; regress's Step 4b instructed the model to "record `0`" for an empty test set and to
// "assemble each side into a flat map". So both the KEYS (which gates are in the set) and the VALUES
// (their exit codes) were model-authored, and the checkers judged whatever map they were handed — which
// their own usage blocks say plainly (check-verify.mjs:60-65, check-regress.mjs:40-49).
//
// The failure is recorded, not hypothetical. CHANGELOG [6.3.0]: a dogfooded, unattended /pharn-loop
// run "skipped /pharn-grill, /pharn-regress and /pharn-verify entirely, hand-executed the equivalent work
// by judgment, and still wrote a LOOP.md whose decision read as a genuine floor-grade stop". #222's fix
// (check-loop-decision.mjs) re-derives a decision from the reports it cites, and by its own statement
// cannot see a report that was never honestly produced. lessons-learned L5 names the class ("a floor
// verdict is only as trustworthy as the orchestration that captures its inputs"), L30 names why the
// asked-for gate is the skipped one, and L20/L46 say a discipline-only remedy recurs and the recurrence
// is the trigger for a floor check. This module is the grammar half of that check.
//
// ================================ HONEST SCOPE — WHAT A STAMP PROVES ================================
//
// GIVEN a stamp that validates here, these hold and nothing more:
//   • the map's VALUES are the exit codes the runner recorded from the listed argv;
//   • the map's KEYS cover the resolved source set (plus `reconcile` for verify);
//   • no tree edit happened between consecutive gate runs (fp_after[k-1] === fp_before[k]);
//   • `reconcile`, when present, ran LAST.
//
// NOT PROVEN BY A STAMP ALONE, and each is stated because the gap is where the disease lives (P0):
//   • FRESHNESS — that the tree still matches `fingerprint.final` at the moment a verdict is read. The
//     field is WRITTEN here and COMPARED by check-loop-fresh.mjs (6.10.0), at /pharn-loop's decision and
//     commit gate; nothing in THIS file compares it.
//   • that the stage ran at all, or that the report on disk is the checker's own output — check-loop-fresh
//     narrows both (report↔stamp hash binding, a live verdict re-derivation), never proves provenance.
//   • WHO wrote an explicit `--gates` string. Only `source` ("explicit" | "discover") is recorded.
//   • FORGERY. **This certifies INTERNAL CONSISTENCY, never provenance — a self-consistent fabricated
//     stamp passes, and a test builds one to prove it rather than leaving the bound as prose**
//     (lessons-learned L43; the phrasing is check-cost-ledger.mjs's, cited not restated — P4). The stamp
//     and its logs live in the writable tree, which `Bash` reaches unhooked: the LIMITS.md §6 class.
//
// BUILD-COMPLETENESS IS NOT A GATE, and the separation is load-bearing (GRILL R1). The runner captures
// check-build-complete.mjs's exit so it is not model-typed, and records it under `aux.completeness` — a
// SIBLING of `runs[]`, never a member. check-verify.mjs reads it onto its EXISTING `--complete` path.
// Folding it into the gates map would make an incomplete build a red GATE, so the verdict would be FAIL
// (exit 1) and INCOMPLETE (exit 3) would become UNREACHABLE — which silently disables /pharn-ship Step
// 2b's single bounded rebuild (pharn-ship.md:315-321, reachable only from INCOMPLETE) and collapses
// check-loop.mjs's `v ∈ {FAIL, INCOMPLETE}` distinction (check-loop.mjs:43,79). `reconcile` is the
// opposite case and IS a gate — it already is one today (pharn-verify.md:234-235).
//
// TRUST (P2): every operand here is a string or an integer from deterministic tooling — gate ids, exit
// codes, hex digests, paths. Gate stdout/stderr are UNTRUSTED free text and this module never reads
// their content; only their sha256 appears in a stamp, and no verdict rests on either. Inputs are
// JSON.parsed and used ONLY as string/int operands and set members — never eval'd, executed, spawned,
// imported, or sent anywhere. A `--gates` token is an untrusted CLI operand and is never compiled into
// a RegExp (no regex-injection / ReDoS sink).

/** ------------------------------------------------------------------------------------------------
 *  THE CLOSED SETS. Materialized ONCE, here, with every rule iterating them (lessons-learned L29: when a
 *  remedy is quantified over a set, the ENUMERATION is the deliverable). Nothing below hardcodes a member.
 *  ---------------------------------------------------------------------------------------------- */

/** The project-gate allowlist, IN RUN ORDER. A deliberate single copy of the set both commands' Step
 *  3a/4a enumerate in prose (pharn-verify.md:184-186, pharn-regress.md:219-221); those prose copies are
 *  retired to a citation of this constant, and a closure parity test pins that neither drifts (L35: when
 *  one fact is stored twice, retire the second copy — a sync check is a third thing to keep in sync). */
export const ALLOWLIST = Object.freeze(["test", "lint", "format:check", "lint:md", "typecheck", "type-check", "build"]);

/** The style/format subset eligible for /pharn-regress's config-touch skip. NOT eligible: every other
 *  allowlist member, because a typecheck/build flip over outside files is possible with no config change
 *  (inside -> outside import edges), so skipping one would hide a real regression. */
export const STYLE_SET = Object.freeze(["lint", "format:check", "lint:md"]);

/** Ids the runner owns. A source set may not contain one, and `--extra` may not introduce one. */
export const RESERVED_IDS = Object.freeze(["reconcile", "completeness"]);

/** The `structural:` prefix belongs to `--extra` entries alone. */
export const STRUCTURAL_PREFIX = "structural:";

/** The CLOSED reason_code vocabulary. Every refusal in this module, in run-gates.mjs, in both checkers'
 *  stamp paths and in check-loop-fresh.mjs carries exactly one member. It is an ENUM and not prose so
 *  check-loop-fresh.mjs can map the orchestration-lapse subset (LAPSE_CODES, below) to "re-run the stage"
 *  rather than to a terminal stop. The closure is tested BOTH ways (L36): every literal the modules emit
 *  is a member, AND every member has an emitter or an entry in RESERVED_REASON_CODES — the second
 *  direction is what let `output-hash-mismatch` sit here with no emitter for a whole release line. */
export const REASON_CODES = Object.freeze([
  "bad-extra",
  "bad-gates",
  "bad-scope-json",
  "base-head-mismatch",
  "base-not-sha",
  "coverage-violation",
  "empty-source-set",
  "entry-not-run",
  "feature-mismatch",
  "front-stage-red",
  "ledger-malformed",
  "lock-busy",
  "output-hash-mismatch",
  "path-containment",
  "reconcile-not-last",
  "regress-verify-tree-mismatch",
  "report-malformed",
  "report-missing",
  "report-stamp-unbound",
  "report-verdict-mismatch",
  "rerun-budget-exhausted",
  "side-mismatch",
  "spec-mismatch",
  "stage-mismatch",
  "stamp-malformed",
  "stamp-missing",
  "stamp-unfinalized",
  "tree-changed-between-gates",
  "tree-moved-since-verify",
  "usage-error",
]);

/** The ORCHESTRATION-LAPSE subset: a report or stamp carrying one of these means the runner never produced
 *  one finished stamp for the current state, so the answer is "re-run the stage", never a terminal stop.
 *  The contract named the first three; `entry-not-run` joins them because validateStamp names it
 *  separately from the malformed class for exactly this routing (a runner that stopped mid-drain), and
 *  `lock-busy` because two runner invocations contending is orchestration, not input. Deliberately NOT
 *  here: `usage-error` (it also covers a hand-passed `--complete` disagreeing with the stamp), every
 *  `*-mismatch` / `stamp-malformed` / `coverage-violation` / `reconcile-not-last` (a stamp that exists and
 *  is WRONG is evidence to stop on), and `path-containment` / `bad-*` (configuration a re-run reproduces). */
export const LAPSE_CODES = Object.freeze([
  "entry-not-run",
  "lock-busy",
  "stamp-missing",
  "stamp-unfinalized",
  "tree-changed-between-gates",
]);

/** Members kept in the vocabulary with NO emitter, each with its reason. The reverse closure test requires
 *  every member to have an emitter or an entry here, so an orphan cannot sit unnoticed (the shape
 *  `output-hash-mismatch` had until check-loop-fresh.mjs's check J). Empty today, and that is asserted. */
export const RESERVED_REASON_CODES = Object.freeze({});

const REASON_SET = new Set(REASON_CODES);

/** The basename (no extension) of a gate's log files under `<out>/`: `<seq>-<id>` with every byte outside
 *  `[A-Za-z0-9._-]` mapped to `_`. ONE copy (L35): run-gates.mjs WRITES `<basename>.out` / `.err` from it,
 *  and check-loop-fresh.mjs re-hashes the same names, so the two cannot disagree about which file a
 *  recorded `stdout_sha256` describes. Pure string work — no filesystem. */
export function logBasename(seq, id) {
  return `${seq}-${String(id).replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

/** Is `code` a member of the closed vocabulary? Used by the CLI and both checkers before emitting. */
export function isReasonCode(code) {
  return REASON_SET.has(code);
}

/** The two stages and the two regress sides — enum-gated, fail-closed on anything else. */
export const STAGES = Object.freeze(["verify", "regress"]);
export const SIDES = Object.freeze(["base", "head"]);

/** The stamp schema id. Bumped only on a breaking shape change (pharn-contracts/gate-run-record.md). */
export const SCHEMA = "gate-run-record/1";

/** A feature slug: one path segment, no traversal, no separators.
 *  A THIRD copy of a grammar already at mark-phase.mjs:60 and render-run-report.mjs:97 — neither exports
 *  it, so it cannot be imported today, and inventing a shared home for it is a different increment.
 *  gate-run-core.test.mjs carries a ✧ parity test reading all three module sources and requiring the
 *  three literals to agree; FOLLOW-UP, named rather than implied: fold the copy-set into one export. */
export const FEATURE_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** A 40-hex git object id. */
export const SHA_RE = /^[0-9a-f]{40}$/;

/** A sha256 digest as this repo writes them. */
const HEX64_RE = /^[0-9a-f]{64}$/;

/** ------------------------------------------------------------------------------------------------
 *  Small helpers.
 *  ---------------------------------------------------------------------------------------------- */

function err(reason_code, reason) {
  // Fail-closed by construction: every refusal path in this module returns through here, so a new
  // refusal cannot be added without choosing a member of the closed vocabulary.
  if (!REASON_SET.has(reason_code)) {
    throw new Error(`internal: '${reason_code}' is not a member of REASON_CODES`);
  }
  return { ok: false, reason_code, reason };
}

/** Control-char-free and bounded — the PRECONDITION that runs BEFORE any anchored shape regex, never as
 *  a replacement for one (lessons-learned L14: a shape tightening must COMPOSE with the control-char
 *  guard, never replace it). */
function isCleanToken(v, max = 256) {
  if (typeof v !== "string" || v.length === 0 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

function isInt(v) {
  return Number.isInteger(v);
}

/** ------------------------------------------------------------------------------------------------
 *  `--gates "<cmd>[::<id>],…"` — the grammar, moved out of command prose with identical semantics.
 *  Each token is `command::gate-id`; the id defaults to the command. A shell token runs through
 *  /bin/sh (run-gates.mjs appends files as POSITIONAL args, never interpolated).
 *  ---------------------------------------------------------------------------------------------- */
export function parseGatesSpec(raw) {
  if (!isCleanToken(raw, 8192)) {
    return err("bad-gates", "--gates must be a non-empty, control-char-free string");
  }
  const tokens = raw.split(",");
  const entries = [];
  const seen = new Set();
  for (const tokRaw of tokens) {
    const tok = tokRaw.trim();
    // An EMPTY token is refused rather than skipped: silently dropping it shrinks the gate set, which is
    // exactly the silent coverage loss this module exists to prevent (check-regress.mjs takes the same
    // posture on a malformed --eval-pairs token).
    if (tok === "") return err("bad-gates", `--gates contains an empty token in ${JSON.stringify(raw)}`);
    const cut = tok.indexOf("::");
    const cmd = (cut === -1 ? tok : tok.slice(0, cut)).trim();
    const id = (cut === -1 ? tok : tok.slice(cut + 2)).trim();
    if (cmd === "") return err("bad-gates", `--gates token ${JSON.stringify(tok)} has an empty command`);
    if (cut !== -1 && id === "") return err("bad-gates", `--gates token ${JSON.stringify(tok)} has an empty id after '::'`);
    if (!isCleanToken(id, 256)) return err("bad-gates", `--gates id ${JSON.stringify(id)} is not a clean token`);
    if (RESERVED_IDS.includes(id)) {
      return err("bad-gates", `--gates id ${JSON.stringify(id)} is RESERVED (the runner owns ${RESERVED_IDS.join(", ")})`);
    }
    if (id.startsWith(STRUCTURAL_PREFIX)) {
      return err(
        "bad-gates",
        `--gates id ${JSON.stringify(id)} uses the '${STRUCTURAL_PREFIX}' prefix, which belongs to --extra entries only`
      );
    }
    if (seen.has(id)) return err("bad-gates", `--gates declares duplicate id ${JSON.stringify(id)}`);
    seen.add(id);
    entries.push({ id, shell: cmd, argv: null, files: [] });
  }
  if (entries.length === 0) return err("bad-gates", "--gates resolved to zero tokens");
  return { ok: true, entries };
}

/** ------------------------------------------------------------------------------------------------
 *  Discovery — ALLOWLIST ∩ package.json `scripts`, in ALLOWLIST order. Pure set membership over a
 *  structured location (lessons-learned L6), never a judgment about "what counts as a check".
 *  ---------------------------------------------------------------------------------------------- */
export function discoverGates(scripts) {
  if (scripts === null || typeof scripts !== "object" || Array.isArray(scripts)) return [];
  // `Object.hasOwn`, never `k in obj` (L15): `in` walks the prototype chain, so a script name colliding
  // with an Object.prototype member reads as PRESENT in a manifest that does not have it.
  return ALLOWLIST.filter((id) => Object.hasOwn(scripts, id)).map((id) => ({
    id,
    shell: null,
    argv: ["npm", "run", id],
    files: [],
  }));
}

/** ------------------------------------------------------------------------------------------------
 *  `--extra` — model-supplied structural gates, narrowly shaped. The ONLY extra form is
 *  `structural:<expected>`, and its argv is DERIVED here, never supplied (GRILL R5): `<actual>` is the
 *  `findings.json` colocated with the capability directory that owns `<expected>`, per
 *  pharn-contracts/finding-shape.md's emission contract and matching pharn-verify.md:199-215 today.
 *  Leaving `<actual>` to the caller would keep a model-typed operand inside the one feature-specific
 *  gate — the exact thing this module exists to remove.
 *  ---------------------------------------------------------------------------------------------- */
export function actualForExpected(expected) {
  // `<capDir>/evals/expected/<name>.json` -> `<capDir>/findings.json`. The marker is the LAST
  // `/evals/expected/` segment pair, so a capability directory containing the word "evals" is safe.
  const marker = "/evals/expected/";
  const at = expected.lastIndexOf(marker);
  if (at <= 0) return null;
  return `${expected.slice(0, at)}/findings.json`;
}

export function parseExtras(raw) {
  if (raw === undefined || raw === null || raw === "") return { ok: true, entries: [] };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return err("bad-extra", `--extra is not valid JSON: ${e.message}`);
  }
  if (!Array.isArray(parsed)) return err("bad-extra", "--extra must be a JSON array of expected-file paths");
  const entries = [];
  const seen = new Set();
  for (const expected of parsed) {
    if (!isCleanToken(expected, 1024)) return err("bad-extra", `--extra entry ${JSON.stringify(expected)} is not a clean path token`);
    if (expected.includes("*")) return err("bad-extra", `--extra entry ${JSON.stringify(expected)} is a glob; expand it first`);
    const actual = actualForExpected(expected);
    if (actual === null) {
      return err(
        "bad-extra",
        `--extra entry ${JSON.stringify(expected)} is not a '<capDir>/evals/expected/<name>.json' path, so its <actual> cannot be derived`
      );
    }
    const id = `${STRUCTURAL_PREFIX}${expected}`;
    if (seen.has(id)) return err("bad-extra", `--extra declares duplicate entry ${JSON.stringify(expected)}`);
    seen.add(id);
    entries.push({ id, shell: null, argv: ["node", "pharn/floor/check-structural.mjs", expected, actual, "."], files: [] });
  }
  return { ok: true, entries };
}

/** ------------------------------------------------------------------------------------------------
 *  The reconcile entry — injected by the runner, always LAST, with a fixed argv, so it judges any tree
 *  write an earlier gate made.
 *
 *  BOUND (lessons-learned L42), stated because delegating to the real guard carries a trap: re-executing
 *  check-bash-reconcile.mjs answers "would the guards deny this NOW", not "did they deny it THEN". That
 *  is the same posture /pharn-verify already has today; running it last narrows the window to this
 *  stage's own gates, it does not change the question.
 *  ---------------------------------------------------------------------------------------------- */
export function reconcileEntry() {
  return {
    id: "reconcile",
    shell: null,
    argv: ["node", "pharn/floor/check-bash-reconcile.mjs", "--base", ".", "--require-baseline"],
    files: [],
  };
}

/** The completeness AUX entry — captured by the runner, recorded OUTSIDE `runs[]`. See the header. */
export function completenessArgv(feature, base) {
  return ["node", "pharn/floor/check-build-complete.mjs", `${base}/${feature}/PLAN.md`, "."];
}

/** ------------------------------------------------------------------------------------------------
 *  Ordering. ALLOWLIST order (or the explicit token order), then `structural:*` sorted, then
 *  `reconcile` last. Deterministic and filesystem-independent.
 *  ---------------------------------------------------------------------------------------------- */
export function orderEntries(sourceEntries, extraEntries, withReconcile) {
  const structural = [...extraEntries].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out = [...sourceEntries, ...structural];
  if (withReconcile) out.push(reconcileEntry());
  return out.map((e, i) => ({ ...e, seq: i }));
}

/** ------------------------------------------------------------------------------------------------
 *  Set resolution + the COVERAGE rule. This is the half that makes the map's KEYS floor-grade: the model
 *  never names a gate, so there is nothing to mistype or omit (L30 — the gate a step ASKS for is the one
 *  that gets skipped; here the step asks for nothing).
 *
 *  verify  : set ⊇ source
 *  regress : set ⊇ source ∖ STYLE_SET (style gates are droppable via --skip-style; the config-touch rule
 *            itself stays ADVISORY and `style_skipped` is recorded so the drop is never silent)
 *  ---------------------------------------------------------------------------------------------- */
export function resolveSet({ stage, side = null, gates = null, scripts = null, extras = null, skipStyle = false, feature }) {
  if (!STAGES.includes(stage)) return err("usage-error", `--stage must be one of ${STAGES.join(" | ")}`);
  if (stage === "regress") {
    if (!SIDES.includes(side)) return err("usage-error", `--side must be one of ${SIDES.join(" | ")} for --stage regress`);
  } else if (side !== null) {
    return err("usage-error", "--side applies to --stage regress only");
  }
  if (!isCleanToken(feature, 64) || !FEATURE_SLUG_RE.test(feature)) {
    return err("usage-error", `--feature must be a plain slug matching ${FEATURE_SLUG_RE}`);
  }

  let source;
  let sourceKind;
  let sourceRaw = null;
  if (gates !== null && gates !== undefined) {
    const p = parseGatesSpec(gates);
    if (!p.ok) return p;
    source = p.entries;
    sourceKind = "explicit";
    sourceRaw = gates;
  } else {
    source = discoverGates(scripts);
    sourceKind = "discover";
  }

  // The EMPTY-SOURCE refusal, and it is deliberately computed on `source` BEFORE any injection (L34).
  // The injected entries always exist, so a membership test written against the FINAL set would be true
  // for free and this refusal would be unreachable — the vacuous pass aimed at the one condition that
  // must route to the existing no-gates stop.
  if (source.length === 0) {
    return err("empty-source-set", "no gates: --gates was not supplied and the allowlist ∩ package.json scripts is empty");
  }

  const ex = parseExtras(extras);
  if (!ex.ok) return ex;

  // A source id may not collide with a reserved id or claim the structural prefix. Discovery cannot
  // produce either (ALLOWLIST contains neither), so this is reachable from --gates — and parseGatesSpec
  // already refuses both. Kept as a belt-and-braces membership test over the FINAL source set so a future
  // source path inherits it rather than re-deriving it.
  for (const e of source) {
    if (RESERVED_IDS.includes(e.id)) return err("coverage-violation", `source set contains the reserved id ${JSON.stringify(e.id)}`);
    if (e.id.startsWith(STRUCTURAL_PREFIX))
      return err("coverage-violation", `source set contains a '${STRUCTURAL_PREFIX}' id ${JSON.stringify(e.id)}`);
  }

  let kept = source;
  let styleSkipped = false;
  if (stage === "regress" && skipStyle) {
    kept = source.filter((e) => !STYLE_SET.includes(e.id));
    styleSkipped = kept.length !== source.length;
    if (kept.length === 0) {
      return err("empty-source-set", "--skip-style removed every discovered gate, leaving nothing to run");
    }
  }

  const entries = orderEntries(kept, ex.entries, stage === "verify");
  return {
    ok: true,
    spec: {
      stage,
      side,
      feature,
      source: sourceKind,
      source_raw: sourceRaw,
      style_skipped: styleSkipped,
      required: kept.map((e) => e.id),
      entries,
    },
  };
}

/** The coverage predicate, re-checked by the CHECKERS from the stamp — never trusted from the writer.
 *  Returns the missing ids, so the caller can name them. */
export function coverageGap(stamp) {
  const have = new Set((stamp.runs ?? []).map((r) => r.id));
  const required = stamp.required ?? [];
  return required.filter((id) => !have.has(id));
}

/** ------------------------------------------------------------------------------------------------
 *  Stamp validation — the shape half of the floor claim. Every refusal carries a closed reason_code.
 *  ---------------------------------------------------------------------------------------------- */
export function validateStamp(stamp, expect = {}) {
  if (stamp === null || typeof stamp !== "object" || Array.isArray(stamp)) {
    return err("stamp-malformed", "stamp must be a JSON object");
  }
  if (stamp.schema !== SCHEMA)
    return err("stamp-malformed", `stamp.schema must be ${JSON.stringify(SCHEMA)}, got ${JSON.stringify(stamp.schema)}`);
  if (!STAGES.includes(stamp.stage)) return err("stamp-malformed", `stamp.stage must be one of ${STAGES.join(" | ")}`);
  if (stamp.stage === "regress" ? !SIDES.includes(stamp.side) : stamp.side !== null) {
    return err("stamp-malformed", "stamp.side must be base|head for regress and null for verify");
  }
  if (!isCleanToken(stamp.feature, 64) || !FEATURE_SLUG_RE.test(stamp.feature)) {
    return err("stamp-malformed", "stamp.feature must be a plain slug");
  }
  if (stamp.source !== "explicit" && stamp.source !== "discover") {
    return err("stamp-malformed", "stamp.source must be 'explicit' or 'discover'");
  }
  if (stamp.head !== null && !(isCleanToken(stamp.head, 40) && SHA_RE.test(stamp.head))) {
    return err("stamp-malformed", "stamp.head must be a 40-hex SHA or null");
  }
  if (stamp.finalized !== true) return err("stamp-unfinalized", "stamp is not finalized — the runner did not reach its last entry");
  if (!Array.isArray(stamp.required)) return err("stamp-malformed", "stamp.required must be an array");
  if (!Array.isArray(stamp.runs) || stamp.runs.length === 0) {
    return err("stamp-malformed", "stamp.runs must be a non-empty array");
  }

  const fp = stamp.fingerprint;
  if (fp === null || typeof fp !== "object" || Array.isArray(fp)) return err("stamp-malformed", "stamp.fingerprint must be an object");
  if (!isCleanToken(fp.algo, 64)) return err("stamp-malformed", "stamp.fingerprint.algo must be a token");
  for (const k of ["init", "final"]) {
    if (!isCleanToken(fp[k], 64) || !HEX64_RE.test(fp[k]))
      return err("stamp-malformed", `stamp.fingerprint.${k} must be a sha256 hex digest`);
  }

  // Per-entry shape, then the two ORDER invariants. Iterated over EVERY entry, never a sampled one (L52).
  const ids = new Set();
  for (let i = 0; i < stamp.runs.length; i++) {
    const r = stamp.runs[i];
    if (r === null || typeof r !== "object" || Array.isArray(r)) return err("stamp-malformed", `stamp.runs[${i}] must be an object`);
    if (r.seq !== i) return err("stamp-malformed", `stamp.runs[${i}].seq must equal ${i}`);
    if (!isCleanToken(r.id, 1024)) return err("stamp-malformed", `stamp.runs[${i}].id must be a clean token`);
    if (ids.has(r.id)) return err("stamp-malformed", `stamp.runs declares duplicate id ${JSON.stringify(r.id)}`);
    ids.add(r.id);
    if (!isInt(r.exit)) return err("stamp-malformed", `stamp.runs[${i}].exit must be an integer`);
    if (typeof r.ran !== "boolean") return err("stamp-malformed", `stamp.runs[${i}].ran must be a boolean`);
    if (typeof r.timed_out !== "boolean") return err("stamp-malformed", `stamp.runs[${i}].timed_out must be a boolean`);
    if (typeof r.mutated !== "boolean") return err("stamp-malformed", `stamp.runs[${i}].mutated must be a boolean`);
    for (const k of ["fp_before", "fp_after"]) {
      if (!isCleanToken(r[k], 64) || !HEX64_RE.test(r[k]))
        return err("stamp-malformed", `stamp.runs[${i}].${k} must be a sha256 hex digest`);
    }
    // An entry that never ran is a stamp that must not have been finalized. Named separately from the
    // malformed class so check-loop-fresh.mjs routes it to "re-run the stage" (it is in LAPSE_CODES).
    if (r.ran === false && r.reason !== "no-files") {
      return err("entry-not-run", `stamp.runs[${i}] (${r.id}) never ran and carries no 'no-files' reason`);
    }
  }

  // No edit between gates: entry k's fp_before must equal entry k-1's fp_after.
  for (let i = 1; i < stamp.runs.length; i++) {
    if (stamp.runs[i].fp_before !== stamp.runs[i - 1].fp_after) {
      return err(
        "tree-changed-between-gates",
        `the worktree changed between ${JSON.stringify(stamp.runs[i - 1].id)} and ${JSON.stringify(stamp.runs[i].id)} — the gates did not judge one tree state`
      );
    }
  }

  // `reconcile`, when present, ran LAST — so it judges any write an earlier gate made.
  const rec = stamp.runs.findIndex((r) => r.id === "reconcile");
  if (rec !== -1 && rec !== stamp.runs.length - 1) {
    return err("reconcile-not-last", `'reconcile' is at seq ${rec} of ${stamp.runs.length} — it must run last`);
  }

  const gap = coverageGap(stamp);
  if (gap.length) return err("coverage-violation", `stamp.runs is missing required gate(s): ${gap.join(", ")}`);

  // Expectations the CALLER asserts (the stage/feature/side it believes it is reading).
  if (expect.stage !== undefined && stamp.stage !== expect.stage) {
    return err("stage-mismatch", `stamp.stage is ${JSON.stringify(stamp.stage)}, expected ${JSON.stringify(expect.stage)}`);
  }
  if (expect.feature !== undefined && stamp.feature !== expect.feature) {
    return err("feature-mismatch", `stamp.feature is ${JSON.stringify(stamp.feature)}, expected ${JSON.stringify(expect.feature)}`);
  }
  if (expect.side !== undefined && stamp.side !== expect.side) {
    return err("side-mismatch", `stamp.side is ${JSON.stringify(stamp.side)}, expected ${JSON.stringify(expect.side)}`);
  }
  return { ok: true };
}

/** The `{gate-id: exit-int}` map, derived from a VALIDATED stamp. This is the object both checkers'
 *  existing verdict cores already consume, so neither core's decision table changes — only where the map
 *  comes from (P3: the axis of change here is the map's PROVENANCE, not the verdict). */
export function stampToMap(stamp) {
  const map = {};
  for (const r of stamp.runs) map[r.id] = r.exit;
  return map;
}

/** verify only: the `--complete` integer, read from `aux`, NEVER from `runs[]` (GRILL R1). */
export function completenessFromStamp(stamp) {
  const aux = stamp.aux;
  if (aux === null || typeof aux !== "object" || Array.isArray(aux)) return null;
  return isInt(aux.completeness) ? aux.completeness : null;
}

/** The advisory `gate_run` block both reports carry. Additive: every live consumer of those reports
 *  reads named fields only (verified by reading each: check-loop.mjs:133, check-ship.mjs:139-140,
 *  check-loop-decision.mjs:171-172, check-ship-briefing.mjs:323,330, render-ship-briefing.mjs:357-358,
 *  render-run-report.mjs:571-572, ship-outcome-core.mjs:117,182-183 — none validates a closed key set). */
export function gateRunBlock(stamp, stampSha256) {
  return {
    stamp_sha256: stampSha256,
    source: stamp.source,
    fingerprint: { algo: stamp.fingerprint.algo, final: stamp.fingerprint.final },
  };
}
