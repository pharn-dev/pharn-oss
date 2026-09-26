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
// their own usage blocks say plainly (the `Usage:` blocks of check-verify.mjs and check-regress.mjs: `results.json`
// is "a flat … map written by the command").
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
// 2b's single bounded rebuild (/pharn-ship "Step 2b — The single build-completion retry", reachable only from
// INCOMPLETE) and collapses check-loop.mjs's `v ∈ {FAIL, INCOMPLETE}` distinction (its DECISION table and
// VERIFY_VERDICTS). `reconcile` is the opposite case and IS a gate — `orderEntries` below injects it itself, always
// LAST, for every verify run (since 6.26.0 through pharn/floor/stage-verify.mjs, which the thin /pharn-verify pins).
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

/** The project-gate allowlist, IN RUN ORDER. The commands keep prose copies because a user reads the command:
 *  the brace-delimited enumeration in the "Reference" sections of /pharn-verify and /pharn-regress (since
 *  6.23.0's stage-regress-script and 6.26.0's stage-verify-script moved the discovery LOGIC into tested code,
 *  both prose copies are informational only, not a branch either command takes), pinned member for
 *  member by a ✧ parity test (gate-run-core.test.mjs), which also pins regress's "minus the e2e ids" clause to
 *  E2E_SET. /pharn-ship's former third copy is retired to a citation (L35). */
export const ALLOWLIST = Object.freeze(["test", "lint", "format:check", "lint:md", "typecheck", "type-check", "build", "test:e2e", "e2e"]);

/** The END-TO-END subset (6.16.0), last in ALLOWLIST so an e2e gate runs after `build`. Discovered like every
 *  other member — only when the project has the script — and DISCOVERED at `/pharn-verify` only: resolveSet
 *  drops these from a DISCOVERED regress source (an explicit `--gates` string is never filtered) (a base-side e2e run doubles an expensive stage, and a red e2e gate already
 *  fails verify's absolute threshold). If a project defines BOTH, both run, exactly as `typecheck` and
 *  `type-check` do; a project whose `test:e2e` just calls `e2e` should drop one of the two scripts. Starting
 *  servers and installing browsers stay the project script's job. */
export const E2E_SET = Object.freeze(["test:e2e", "e2e"]);

/** ac-test: which DISCOVERED gate ids run an AC test of each verify level (pharn-contracts/ac-tests.md, "The red
 *  run"). A membership table, never a classification (P5): `unit` and `integration` tests run under the project's
 *  `test` script, `e2e` tests under whichever E2E_SET members exist. Its keys are the spec-template's closed level
 *  set, pinned equal to check-ac-tests.mjs LEVELS by a test (L29). */
export const LEVEL_GATES = Object.freeze({
  unit: Object.freeze(["test"]),
  integration: Object.freeze(["test"]),
  e2e: E2E_SET,
});

/** The style/format subset eligible for /pharn-regress's config-touch skip. NOT eligible: every other
 *  allowlist member, because a typecheck/build flip over outside files is possible with no config change
 *  (inside -> outside import edges), so skipping one would hide a real regression. */
export const STYLE_SET = Object.freeze(["lint", "format:check", "lint:md"]);

/** Ids no gate may carry: `reconcile` and `completeness` are the runner's; `ac-delivery` and `ac-evidence` (6.20.0) are
 *  the failing ids check-verify.mjs `--ac-gate` adds to `failing_gates` for the AC gate, and check-loop.mjs reads
 *  `ac-evidence` by exact membership — so a real gate named that would be read as the AC gate. A source set may not
 *  contain one, and `--extra` may not introduce one. */
/** The AC half of RESERVED_IDS, named (6.20.6): the ids the AC gate adds to verify's `failing_gates`. ac-gate-core.mjs
 *  FAILING_IDS names the same two (a test pins that they agree). Named HERE so check-loop-fresh.mjs can subtract them
 *  without loading the AC gate's module graph: a load failure there would stop the freshness check (grill R2) — since
 *  6.21.1 as INCONCLUSIVE `checker-crashed` rather than node's exit 1, and a smaller graph still fails less often. */
export const AC_RESERVED_IDS = Object.freeze(["ac-delivery", "ac-evidence"]);
export const RESERVED_IDS = Object.freeze(["reconcile", "completeness", ...AC_RESERVED_IDS]);

/** The `structural:` prefix belongs to `--extra` entries alone. */
export const STRUCTURAL_PREFIX = "structural:";

/** The CLOSED reason_code vocabulary. Every refusal in this module, in run-gates.mjs, in both checkers'
 *  stamp paths and in check-loop-fresh.mjs carries exactly one member. It is an ENUM and not prose so
 *  check-loop-fresh.mjs can map the orchestration-lapse subset (LAPSE_CODES, below) to "re-run the stage"
 *  rather than to a terminal stop. The closure is tested BOTH ways (L36): every literal the modules emit
 *  is a member, AND every member has an emitter or an entry in RESERVED_REASON_CODES — the second
 *  direction is what let `output-hash-mismatch` sit here with no emitter for a whole release line. */
export const REASON_CODES = Object.freeze([
  "ac-evidence-invalid",
  "bad-extra",
  "bad-gates",
  "bad-scope-json",
  "base-head-mismatch",
  "base-not-sha",
  "checker-crashed",
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
 *  here: `usage-error` (it also covers a hand-passed `--complete` disagreeing with the stamp), `checker-crashed`
 *  (6.21.1 — the freshness checker could not load or threw: no verdict, so fail-closed, never a re-run), every
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

/** The ONE environment variable the runner hands every gate: the absolute path where that gate's test
 *  reporter may write its machine-readable results (pharn-contracts/test-results-record.md). Same NAME for
 *  every gate, a DIFFERENT value per gate, so a later gate can never overwrite an earlier one's file. */
export const RESULTS_ENV = "PHARN_TEST_RESULTS";

/** The file name of a gate's results file under `<out>/`: the log basename plus `.test-results.json`. ONE
 *  copy (L35): run-gates.mjs passes it to the gate and hashes it; test-results-core.mjs reads it back.
 *  Deliberately NOT `results.json` — that name would read as a second store of the gate map. */
export function resultsFileName(seq, id) {
  return `${logBasename(seq, id)}.test-results.json`;
}

/** Is `code` a member of the closed vocabulary? Used by the CLI and both checkers before emitting. */
export function isReasonCode(code) {
  return REASON_SET.has(code);
}

/** The three stages and the two regress sides — enum-gated, fail-closed on anything else. `ac-test` (6.18.0) is
 *  /pharn-test's RED RUN: the AC tests, run before the build, whose per-test record check-red-run.mjs judges.
 *  Every stamp reader that is not that one asserts its own stage (`validateStamp`'s `expect.stage`), so an
 *  `ac-test` stamp handed to /pharn-verify or /pharn-regress is `stage-mismatch`, never a verdict. */
export const STAGES = Object.freeze(["verify", "regress", "ac-test"]);
export const SIDES = Object.freeze(["base", "head"]);

/** The stamp schema id. Bumped only on a breaking shape change (pharn-contracts/gate-run-record.md). */
export const SCHEMA = "gate-run-record/1";

/** A feature slug: one path segment, no traversal, no separators.
 *  A THIRD copy of a grammar already in mark-phase.mjs (NAME_RE) and render-run-report.mjs (SLUG_RE) — neither exports
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
      return err("bad-gates", `--gates id ${JSON.stringify(id)} is RESERVED (${RESERVED_IDS.join(", ")} are never gate ids)`);
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
 *  pharn-contracts/finding-shape.md's emission contract — the same pairing stage-verify-core.mjs's EVAL_PAIR_RULE
 *  applies when it chooses which expected paths to hand in (6.26.0).
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
 *            itself stays ADVISORY and `style_skipped` is recorded so the drop is never silent). A DISCOVERED
 *            regress source never contains an E2E_SET member (a fixed rule, not a flag); an explicit
 *            `--gates` string is the caller's choice and is never filtered.
 *  ---------------------------------------------------------------------------------------------- */
export function resolveSet({ stage, side = null, gates = null, scripts = null, extras = null, skipStyle = false, feature, acRows = null }) {
  if (!STAGES.includes(stage)) return err("usage-error", `--stage must be one of ${STAGES.join(" | ")}`);
  if (stage === "regress") {
    if (!SIDES.includes(side)) return err("usage-error", `--side must be one of ${SIDES.join(" | ")} for --stage regress`);
  } else if (side !== null) {
    return err("usage-error", "--side applies to --stage regress only");
  }
  if (!isCleanToken(feature, 64) || !FEATURE_SLUG_RE.test(feature)) {
    return err("usage-error", `--feature must be a plain slug matching ${FEATURE_SLUG_RE}`);
  }
  if (stage === "ac-test") return resolveAcTest({ gates, scripts, extras, skipStyle, feature, acRows });
  if (acRows !== null) return err("usage-error", "--ac-tests applies to --stage ac-test only");

  let source;
  let sourceKind;
  let sourceRaw = null;
  let e2eExcluded = [];
  if (gates !== null && gates !== undefined) {
    const p = parseGatesSpec(gates);
    if (!p.ok) return p;
    source = p.entries;
    sourceKind = "explicit";
    sourceRaw = gates;
  } else {
    source = discoverGates(scripts);
    sourceKind = "discover";
    // e2e runs at /pharn-verify only. Filtered HERE, before the emptiness test below, so an e2e-only manifest
    // is `empty-source-set` at regress (its no-gates stop) rather than a run with nothing in it (L34).
    if (stage === "regress") {
      e2eExcluded = source.filter((e) => E2E_SET.includes(e.id)).map((e) => e.id);
      source = source.filter((e) => !E2E_SET.includes(e.id));
    }
  }

  // The EMPTY-SOURCE refusal, and it is deliberately computed on `source` BEFORE any injection (L34).
  // The injected entries always exist, so a membership test written against the FINAL set would be true
  // for free and this refusal would be unreachable — the vacuous pass aimed at the one condition that
  // must route to the existing no-gates stop.
  if (source.length === 0) {
    return err(
      "empty-source-set",
      e2eExcluded.length
        ? `no gates: at regress the allowlist ∩ package.json scripts holds only the e2e gates (${e2eExcluded.join(", ")}), which regress never discovers`
        : "no gates: --gates was not supplied and the allowlist ∩ package.json scripts is empty"
    );
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
      return err(
        "empty-source-set",
        e2eExcluded.length
          ? `--skip-style removed every style gate and regress never discovers the e2e gates (${e2eExcluded.join(", ")}), leaving nothing to run`
          : "--skip-style removed every discovered gate, leaving nothing to run"
      );
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
      // The e2e ids the regress rule dropped — reported by `init`, never written into the stamp.
      e2e_excluded: e2eExcluded,
      required: kept.map((e) => e.id),
      entries,
    },
  };
}

/** ------------------------------------------------------------------------------------------------
 *  ac-test: the RED RUN's set, selected BY ID from the mapping (`acRows`, the parsed `## Mapping` rows of
 *  AC-TESTS.md: `{id, level, file}`). The model names nothing: the levels the mapping needs pick the DISCOVERED
 *  ids through LEVEL_GATES, and each gate is handed exactly the mapped files of its levels (acFilesFor) through
 *  the positional file append — so one unrelated flaky test elsewhere in an e2e suite cannot void the record
 *  (grill G6). Bounded (6.22.0 review): Jest and Playwright read those positional arguments as PATTERNS, not exact
 *  paths, so a similarly named test file can run too and its tests enter the record (test-results-record.md). No `reconcile` (the red run is not a verify), no `--gates` (a command string would put the model
 *  back in charge of the set), no `--extra`, no `--skip-style`. No `build` either: an e2e runner that needs a
 *  built or served app must build or serve it itself (Playwright's `webServer`) — a stated bound.
 *
 *  A level whose gates are all undiscovered is `coverage-violation`: the set cannot cover the mapping. The
 *  command runs check-red-run.mjs --preflight first, which says the same thing as the closed
 *  `ac-level-unavailable` line; this refusal is what stops a caller that skipped it.
 *  ---------------------------------------------------------------------------------------------- */
/** The mapped files an ac-test gate runs: every row whose level maps to `gateId`, sorted, unique. ONE copy — the
 *  runner hands these to the gate and red-run-core.mjs requires the stamp's `files` to equal them (grill G1). */
export function acFilesFor(acRows, gateId) {
  return [...new Set(acRows.filter((r) => LEVEL_GATES[r.level].includes(gateId)).map((r) => r.file))].sort();
}

function resolveAcTest({ gates, scripts, extras, skipStyle, feature, acRows }) {
  if (gates !== null && gates !== undefined)
    return err("usage-error", "--gates does not apply to --stage ac-test (the set is the mapping's)");
  if (extras !== null && extras !== undefined) return err("usage-error", "--extra does not apply to --stage ac-test");
  if (skipStyle) return err("usage-error", "--skip-style does not apply to --stage ac-test");
  if (!Array.isArray(acRows) || acRows.length === 0)
    return err("usage-error", "--stage ac-test requires --ac-tests <AC-TESTS.md> with mapping rows");
  for (const r of acRows) {
    if (
      r === null ||
      typeof r !== "object" ||
      !Object.hasOwn(LEVEL_GATES, r.level) ||
      !isCleanToken(r.file, 1024) ||
      !isCleanToken(r.id, 32)
    ) {
      return err("usage-error", "an --ac-tests mapping row is not {id, level ∈ unit|integration|e2e, file}");
    }
  }
  const discovered = discoverGates(scripts);
  const have = new Set(discovered.map((e) => e.id));
  const needed = new Set();
  const uncovered = [];
  for (const r of acRows) {
    const ids = LEVEL_GATES[r.level].filter((id) => have.has(id));
    if (ids.length === 0) uncovered.push(`${r.id} (${r.level})`);
    for (const id of ids) needed.add(id);
  }
  if (uncovered.length) {
    return err(
      "coverage-violation",
      `no discovered gate runs ${uncovered.join(", ")} — package.json has none of the level's scripts (run check-red-run.mjs --preflight)`
    );
  }
  const kept = discovered.filter((e) => needed.has(e.id)).map((e) => ({ ...e, files: acFilesFor(acRows, e.id) }));
  return {
    ok: true,
    spec: {
      stage: "ac-test",
      side: null,
      feature,
      source: "discover",
      source_raw: null,
      style_skipped: false,
      e2e_excluded: [],
      required: kept.map((e) => e.id),
      entries: orderEntries(kept, [], false),
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
    return err("stamp-malformed", "stamp.side must be base|head for regress and null for every other stage");
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
    // OPTIONAL and additive (6.15.0): checked only when present, so every stamp written before the field
    // existed still validates. Present means `null` (no results file) or a sha256 digest — nothing else.
    if (
      Object.hasOwn(r, "results_sha256") &&
      r.results_sha256 !== null &&
      !(isCleanToken(r.results_sha256, 64) && HEX64_RE.test(r.results_sha256))
    ) {
      return err("stamp-malformed", `stamp.runs[${i}].results_sha256 must be null or a sha256 hex digest`);
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

/** The advisory `gate_run` block both reports carry. It was additive: when 6.8.0 added it, every consumer of those
 *  reports then read named fields only (verified by reading each: check-loop.mjs, check-ship.mjs,
 *  check-loop-decision.mjs, check-ship-briefing.mjs, render-ship-briefing.mjs, render-run-report.mjs,
 *  ship-outcome-core.mjs — none validated a closed key set); check-loop-fresh.mjs (6.10.0) reads
 *  `gate_run.stamp_sha256` by name. A consumer added since is not covered by either reading. */
export function gateRunBlock(stamp, stampSha256) {
  return {
    stamp_sha256: stampSha256,
    source: stamp.source,
    fingerprint: { algo: stamp.fingerprint.algo, final: stamp.fingerprint.final },
  };
}
