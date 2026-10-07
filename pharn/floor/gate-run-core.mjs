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
//   • the map's VALUES are the exit codes the runner recorded from the listed argv — for a REUSED verify entry
//     (6.34.0), the exit a runner recorded for the SOURCE execution its `reused` block names, which this stamp's
//     runner found eligible and identity-equal at the live tree when it recorded the entry (gate-reuse-core.mjs);
//     nothing re-derives that decision later (the named residual `verify-reuse-rederive`);
//   • the map's KEYS cover the resolved source set (plus `instruction-growth` and `reconcile` for verify);
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
//   • anything about a gate the project EXCLUDED from discovery (6.36.0): it did not run, so the map holds no exit for
//     it; the stamp's `excluded` block names it and where it was declared — a disclosure, not evidence either way.
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

/** ------------------------------------------------------------------------------------------------
 *  A PROJECT'S GATE EXCLUSION (6.36.0, gate-exclusion-config). THE RECORDED FAILURE (P7): in a user's project the
 *  discovered `e2e` gate could not run on the user's machine (not enough RAM), discovery offered no way to leave it
 *  out, and an explicit `--gates` list makes the AC gate read `test-infra-changed` by design — two of three real
 *  /pharn-loop runs stopped on exactly that. So a project may declare, in `pharn.config.json`, ALLOWLIST ids that
 *  DISCOVERY removes (gate-exclusion-core.mjs reads the declaration; this module applies it and validates its trace).
 *  An explicit `--gates` string is never filtered. What is removed is DISCLOSED, never silent: the stamp's optional
 *  `excluded` block names the ids and where they were declared, and both reports copy it (gateRunBlock).
 *  EXCLUSION_DECLARED_IN is the one source a stamp may name; it spells gate-exclusion-core.mjs's CONFIG_FILE + key
 *  path, which a ✧ test pins equal (this module imports nothing, so it cannot import them).
 *  ---------------------------------------------------------------------------------------------- */
export const EXCLUSION_DECLARED_IN = "pharn.config.json#gates.exclude";
/** The stamp's `excluded` block — its closed key set. */
export const EXCLUDED_KEYS = Object.freeze(["declared_in", "ids"]);

/** Why `ids` is not a usable exclusion list, or null: an array of DISTINCT ALLOWLIST members (any order — the reader
 *  normalizes it to ALLOWLIST order). The ONE membership rule (L35): gate-exclusion-core.mjs, resolveSet and the
 *  test-infrastructure pin all call it. TOTAL over parsed JSON (L62): it names a position, never a value. */
export function exclusionError(ids) {
  if (!Array.isArray(ids)) return "is not an array of gate ids";
  const seen = new Set();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (typeof id !== "string" || !ALLOWLIST.includes(id)) {
      return `entry ${i} is not one of the allowlisted gate ids {${ALLOWLIST.join(", ")}}`;
    }
    if (seen.has(id)) return `entry ${i} repeats an id already listed`;
    seen.add(id);
  }
  return null;
}

/** The level gates of `level` that the project's exclusion leaves nothing of, or [] (6.36.0, review R5): the gates of
 *  the level the manifest HAS (every one of the level's gates when `scripts` is not an object — the plan-time reading,
 *  which needs no package.json) when ALL of them are in `exclude`. A level whose manifest has none of its gates returns
 *  [] — that is "no runner", the red-run preflight's own reason, not the exclusion's. Own-property test (L15). */
export function levelExcludedGates({ level, scripts, exclude }) {
  const gates = Object.hasOwn(LEVEL_GATES, level) ? LEVEL_GATES[level] : [];
  const hasScripts = scripts !== null && typeof scripts === "object" && !Array.isArray(scripts);
  const present = hasScripts ? gates.filter((id) => Object.hasOwn(scripts, id)) : gates;
  return present.length > 0 && present.every((id) => exclude.includes(id)) ? [...present] : [];
}

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
/** The instruction-growth gate's id (6.38.0): the runner injects it for verify, before `reconcile`
 *  (`instructionGrowthEntry`, below). Reserved so no project gate can claim the name. */
export const INSTRUCTION_GROWTH_ID = "instruction-growth";
/** The entry check's evidence-only BASE test slot (6.49.0, entry-run-as-base-evidence): the `test` execution
 *  /pharn-regress's BASE side would run, built at entry by regress's own test-list rule (entry-gates.mjs). Reserved so no
 *  project gate can claim the name; never counted by the entry verdict (entry-gates-core.mjs `entryVerdict`). */
export const ENTRY_BASE_TEST_ID = "base:test";
export const RESERVED_IDS = Object.freeze(["reconcile", "completeness", ...AC_RESERVED_IDS, INSTRUCTION_GROWTH_ID, ENTRY_BASE_TEST_ID]);

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
  "bad-gate-exclusion",
  "bad-gates",
  "bad-scope-json",
  "base-head-mismatch",
  "base-not-sha",
  "base-timed-out",
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
  "total-glob-declared",
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
 *  `ac-test` stamp handed to /pharn-verify or /pharn-regress is `stage-mismatch`, never a verdict. `build` (6.39.0,
 *  build-gate-bounded) is /pharn-build's own project gate, run by build-gate.mjs: no verdict reads its stamp, and every
 *  stamp reader that asserts a stage refuses it the same way. `entry` (6.42.0) is a delivery run's ENTRY check
 *  (entry-gates.mjs): verify's discovered set, STYLE_SET first, run once in the background on the tree the run starts
 *  from, with its own fingerprint algo (worktree-fingerprint.mjs ENTRY_ALGO). Since 6.49.0 (entry-run-as-base-evidence)
 *  an entry stamp is ALSO the one sanctioned source of an entry-derived /pharn-regress BASE stamp — only through the
 *  closed REUSE_PAIRS row below, and only when entry-base-evidence-core.mjs's predicate HITs. It is still never reuse
 *  evidence for /pharn-verify (gate-reuse-core.mjs accepts REUSE_SOURCE alone). */
export const STAGES = Object.freeze(["verify", "regress", "ac-test", "build", "entry"]);
export const SIDES = Object.freeze(["base", "head"]);

/** The stamp schema id. Bumped only on a breaking shape change (pharn-contracts/gate-run-record.md). */
export const SCHEMA = "gate-run-record/1";

/** ------------------------------------------------------------------------------------------------
 *  A REUSED run (6.34.0, verify-head-gate-reuse). A verify stamp may record an entry whose result is a COMPLETED
 *  execution of this delivery run's /pharn-regress HEAD side over the same tree and the same execution identity
 *  (gate-reuse-core.mjs decides that; this module holds only the SHAPE). Such an entry is `ran: false` — VERIFY did
 *  not run the process — with `reason: REUSED_REASON` and a `reused` block naming the source execution. The shape is
 *  ADDITIVE, like `results_sha256` (6.15.0): SCHEMA is unchanged, and a floor older than 6.34.0 reads such an entry as
 *  `entry-not-run` (a LAPSE code — a re-run), the fail-closed direction.
 *  REUSE_SOURCE is the ONE sanctioned source of a VERIFY reuse, and REUSE_TARGET_STAGE its target.
 *
 *  6.49.0 (entry-run-as-base-evidence) adds a SECOND closed pair: a /pharn-regress BASE stamp may be DERIVED from this
 *  delivery run's ENTRY execution (entry-base-evidence-core.mjs decides when; this module holds only the SHAPE). Every
 *  run of such a stamp is `ran: false` — the regress invocation spawned nothing for that slot — either reused or
 *  `no-files`, and every reused run names ONE entry stamp. REUSE_PAIRS is the whole matrix: a reused run in any other
 *  (target, source) pair is `stamp-malformed`, so no other stamp kind starts accepting reused runs.
 *  ---------------------------------------------------------------------------------------------- */
export const REUSED_REASON = "reused";
export const REUSE_SOURCE = Object.freeze({ stage: "regress", side: "head" });
export const REUSE_TARGET_STAGE = "verify";
/** The entry → regress/base pair (6.49.0): its source and its target. */
export const ENTRY_REUSE_SOURCE = Object.freeze({ stage: "entry", side: null });
export const ENTRY_REUSE_TARGET = Object.freeze({ stage: "regress", side: "base" });
/** The CLOSED reuse matrix, materialized once (L29): each row is a (target stamp, source) pair a reused run may name. */
export const REUSE_PAIRS = Object.freeze([
  Object.freeze({ target: Object.freeze({ stage: REUSE_TARGET_STAGE, side: null }), source: REUSE_SOURCE }),
  Object.freeze({ target: ENTRY_REUSE_TARGET, source: ENTRY_REUSE_SOURCE }),
]);
export const REUSED_BLOCK_KEYS = Object.freeze(["stage", "side", "seq", "stamp_sha256"]);
/** The largest exit a COMPLETED process reports as itself: 126/127 are the runner's spawn-failure codes, >= 128 a signal
 *  (run-gates.mjs `signalExit`), and 124-by-timeout is excluded by `timed_out`. Only 0..this is ever reused. */
export const MAX_REUSABLE_EXIT = 125;
/** Never reused, whatever a source says — DERIVED from the sets below, never re-listed (L29/L35):
 *    • every AC level gate (LEVEL_GATES) — the AC gate reads their per-test records from VERIFY's OWN `<out>` and requires
 *      their pinned run;
 *    • every style gate (STYLE_SET) — a whole-tree style run reads the feature's fingerprint-EXCLUDED artifacts, which
 *      differ between the regress HEAD run and verify (REGRESSION.md is written after the head drain; an earlier
 *      iteration's VERIFY.md is removed by verify's fresh start), so an equal fingerprint is not an equal input (grill B1);
 *    • `reconcile` — it judges the verify window itself;
 *    • `instruction-growth` (6.38.0) — regress never runs it, and its input includes `origin/main`, which the execution
 *      identity does not bind. */
export const NON_REUSABLE_IDS = Object.freeze(
  [...new Set([...Object.values(LEVEL_GATES).flat(), ...STYLE_SET, "reconcile", INSTRUCTION_GROWTH_ID])].sort()
);

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

/** ------------------------------------------------------------------------------------------------
 *  The instruction-growth entry (6.38.0) — injected by the runner for verify, with a fixed argv, immediately BEFORE
 *  `reconcile` (which stays last). It fails when the project's always-loaded instruction files (CLAUDE.md, its
 *  imports, the rules without `paths`) gained more bytes since the base than the base commit's threshold allows;
 *  pharn/floor/instruction-files-core.mjs's header is the spec and states the bounds. The checker writes nothing, so it
 *  cannot move the tree between gates. As for `reconcile`, nothing re-checks that a stamp carries it: the runner
 *  composes it.
 *  ---------------------------------------------------------------------------------------------- */
export function instructionGrowthEntry() {
  return {
    id: INSTRUCTION_GROWTH_ID,
    shell: null,
    argv: ["node", "pharn/floor/check-instruction-files.mjs", "--growth", "--base-rule"],
    files: [],
  };
}

/** The completeness AUX entry — captured by the runner, recorded OUTSIDE `runs[]`. See the header. */
export function completenessArgv(feature, base) {
  return ["node", "pharn/floor/check-build-complete.mjs", `${base}/${feature}/PLAN.md`, "."];
}

/** ------------------------------------------------------------------------------------------------
 *  Ordering. ALLOWLIST order (or the explicit token order), then `structural:*` sorted, then — verify only —
 *  `instruction-growth`, then `reconcile` last. Deterministic and filesystem-independent.
 *  ---------------------------------------------------------------------------------------------- */
export function orderEntries(sourceEntries, extraEntries, withReconcile) {
  const structural = [...extraEntries].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out = [...sourceEntries, ...structural];
  if (withReconcile) out.push(instructionGrowthEntry(), reconcileEntry());
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
 *  `exclude` (6.36.0): the project's declared exclusion (gate-exclusion-core.mjs), applied to a DISCOVERED source
 *  only, AFTER the regress e2e rule and before the emptiness test — so an exclusion that leaves nothing is
 *  `empty-source-set` naming it, never a run with nothing in it (L34). Passing it with `--gates` is a usage error.
 *  build   : (6.39.0, /pharn-build's gate via build-gate.mjs) a DISCOVERED source minus E2E_SET (the regress rule:
 *            e2e runs at /pharn-verify), then the exclusion — or a human's explicit `--gates`, never filtered, as at
 *            verify; `--extra` and `--skip-style` are refused; no `reconcile`. With `targets` (a non-empty array of
 *            repo-relative test files), the set is the `test` gate alone, handed those files; an id that a targeted
 *            run skips anyway is never credited to the exclusion (the G9 rule above). `targets` applies to `build` only.
 *  ---------------------------------------------------------------------------------------------- */
export function resolveSet({
  stage,
  side = null,
  gates = null,
  scripts = null,
  extras = null,
  skipStyle = false,
  feature,
  acRows = null,
  exclude = [],
  targets = null,
  baseTests = null,
}) {
  if (!STAGES.includes(stage)) return err("usage-error", `--stage must be one of ${STAGES.join(" | ")}`);
  if (stage === "regress") {
    if (!SIDES.includes(side)) return err("usage-error", `--side must be one of ${SIDES.join(" | ")} for --stage regress`);
  } else if (side !== null) {
    return err("usage-error", "--side applies to --stage regress only");
  }
  if (!isCleanToken(feature, 64) || !FEATURE_SLUG_RE.test(feature)) {
    return err("usage-error", `--feature must be a plain slug matching ${FEATURE_SLUG_RE}`);
  }
  const exErr = exclusionError(exclude);
  if (exErr) return err("bad-gate-exclusion", `the gate exclusion ${exErr}`);
  if (exclude.length && gates !== null && gates !== undefined) {
    return err("usage-error", "a gate exclusion applies to DISCOVERY only — an explicit --gates string is never filtered");
  }
  if (stage === "ac-test") return resolveAcTest({ gates, scripts, extras, skipStyle, feature, acRows, exclude });
  if (acRows !== null) return err("usage-error", "--ac-tests applies to --stage ac-test only");
  if (stage === "build") {
    const bad = buildArgsError({ extras, skipStyle, targets });
    if (bad) return err("usage-error", bad);
  } else if (targets !== null) {
    return err("usage-error", "--targets applies to --stage build only");
  }
  if (baseTests !== null) {
    if (stage !== "entry") return err("usage-error", "--base-tests applies to --stage entry only");
    const bad = baseTestsError(baseTests);
    if (bad) return err("usage-error", bad);
  }

  let source;
  let sourceKind;
  let sourceRaw = null;
  let e2eExcluded = [];
  let excludedIds = [];
  if (gates !== null && gates !== undefined) {
    const p = parseGatesSpec(gates);
    if (!p.ok) return p;
    source = p.entries;
    sourceKind = "explicit";
    sourceRaw = gates;
    // build, targeted, over a human's explicit spec: its `test` id alone (6.39.0, review R1).
    if (stage === "build" && targets !== null) source = source.filter((e) => e.id === "test");
  } else {
    source = discoverGates(scripts);
    sourceKind = "discover";
    // e2e runs at /pharn-verify only. Filtered HERE, before the emptiness test below, so an e2e-only manifest
    // is `empty-source-set` at regress (its no-gates stop) rather than a run with nothing in it (L34).
    if (stage === "regress" || stage === "build") {
      e2eExcluded = source.filter((e) => E2E_SET.includes(e.id)).map((e) => e.id);
      source = source.filter((e) => !E2E_SET.includes(e.id));
    }
    // build, targeted (6.39.0): the `test` gate alone. Narrowed BEFORE the exclusion, so `excluded` never names a
    // gate a targeted run skips anyway (the G9 rule just below).
    if (stage === "build" && targets !== null) source = source.filter((e) => e.id === "test");
    // The project's exclusion AFTER the fixed e2e rule (grill G9): `excluded` names only what the declaration itself
    // removed from what this stage would otherwise run, never an e2e id regress drops anyway.
    excludedIds = source.filter((e) => exclude.includes(e.id)).map((e) => e.id);
    source = source.filter((e) => !exclude.includes(e.id));
  }

  // The EMPTY-SOURCE refusal, and it is deliberately computed on `source` BEFORE any injection (L34).
  // The injected entries always exist, so a membership test written against the FINAL set would be true
  // for free and this refusal would be unreachable — the vacuous pass aimed at the one condition that
  // must route to the existing no-gates stop.
  if (source.length === 0) {
    const byExclusion = excludedIds.length ? ` once the project's ${EXCLUSION_DECLARED_IN} removed ${excludedIds.join(", ")}` : "";
    if (stage === "build" && targets !== null) {
      return err("empty-source-set", `no gates: a targeted build run needs a \`test\` gate, and there is none${byExclusion}`);
    }
    return err(
      "empty-source-set",
      e2eExcluded.length
        ? `no gates: at ${stage} the allowlist ∩ package.json scripts holds only the e2e gates (${e2eExcluded.join(", ")})${byExclusion}, and ${stage} never discovers those`
        : `no gates: --gates was not supplied and the allowlist ∩ package.json scripts is empty${byExclusion}`
    );
  }
  // build, targeted: hand `test` exactly the target files (run-gates.mjs appends them after `--`).
  if (stage === "build" && targets !== null) source = source.map((e) => ({ ...e, files: [...targets] }));

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

  // entry (6.42.0): STYLE_SET first, each part in its own order — the style gates run before a front stage has
  // written any markdown they could read (entry-gates-core.mjs, "attributable").
  // 6.49.0 (entry-run-as-base-evidence): with `baseTests`, the evidence-only ENTRY_BASE_TEST_ID slot — the discovered
  // `test` command handed exactly those files — right after the style part, before the rest (and before every gate a
  // front-stage write could reach first). No discovered `test`, no slot. The entry verdict never counts it.
  if (stage === "entry") {
    const testEntry = kept.find((e) => e.id === "test");
    const slot =
      baseTests !== null && testEntry !== undefined
        ? [{ id: ENTRY_BASE_TEST_ID, shell: testEntry.shell, argv: testEntry.argv, files: [...baseTests] }]
        : [];
    kept = [...kept.filter((e) => STYLE_SET.includes(e.id)), ...slot, ...kept.filter((e) => !STYLE_SET.includes(e.id))];
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
      // The ids the project's declaration removed from discovery (6.36.0) — WRITTEN into the stamp when non-empty.
      excluded: excludedBlock(excludedIds),
      required: kept.map((e) => e.id),
      entries,
    },
  };
}

/** The stamp's `excluded` block for the ids discovery removed, or null when it removed none — so a project with no
 *  declaration (or one naming no discovered script) writes a stamp byte-identical to before 6.36.0. */
function excludedBlock(ids) {
  return ids.length ? { declared_in: EXCLUSION_DECLARED_IN, ids: [...ids] } : null;
}

/** The `--base-tests` list's shape (6.49.0), or null: a NON-EMPTY array (an empty list handed to a runner means "the
 *  whole suite", L16) of distinct clean tokens, none led by `-` and none glob-shaped, at most MAX_BASE_TESTS long. The
 *  path rule proper is ac-tests-core.mjs `badPath`, which run-gates.mjs applies when it reads the file. TOTAL (L62). */
export const MAX_BASE_TESTS = 100000;
export function baseTestsError(list) {
  if (!Array.isArray(list) || list.length === 0) return "--base-tests must be a non-empty array of test files";
  if (list.length > MAX_BASE_TESTS) return `--base-tests holds more than ${MAX_BASE_TESTS} files`;
  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (!isCleanToken(t, 1024) || t.startsWith("-") || /[*?]/.test(t))
      return `--base-tests entry ${i} is not a clean, non-flag, non-glob path`;
    if (seen.has(t)) return `--base-tests entry ${i} repeats an earlier entry`;
    seen.add(t);
  }
  return null;
}

/** The most target files one targeted build run takes. A cap, never a truncation: over it is a refusal. */
export const MAX_BUILD_TARGETS = 4096;

/** Why these are not usable `build` arguments, or null. No `--extra` and no `--skip-style` (a human's `--gates` is
 *  accepted, as at verify — review R1); `targets` is null (full) or a NON-EMPTY array (L34 — an empty list handed to
 *  a runner means "the whole suite", L16) of distinct clean tokens, none led by `-` (a runner would read it as a flag)
 *  and none glob-shaped. The PATH rule proper (normalized, repo-relative, outside `.pharn/`) is ac-tests-core.mjs
 *  `badPath`, which run-gates.mjs applies when it reads `--targets` — this module imports nothing. TOTAL (L62): names
 *  a position, never a value. */
function buildArgsError({ extras, skipStyle, targets }) {
  if (extras !== null && extras !== undefined) return "--extra does not apply to --stage build";
  if (skipStyle) return "--skip-style does not apply to --stage build";
  if (targets === null) return null;
  if (!Array.isArray(targets) || targets.length === 0) return "--targets must be a non-empty array of test files";
  if (targets.length > MAX_BUILD_TARGETS) return `--targets holds more than ${MAX_BUILD_TARGETS} files`;
  const seen = new Set();
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (!isCleanToken(t, 1024) || t.startsWith("-") || /[*?]/.test(t)) {
      return `--targets entry ${i} is not a clean, non-flag, non-glob path`;
    }
    if (seen.has(t)) return `--targets entry ${i} repeats an earlier entry`;
    seen.add(t);
  }
  return null;
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

function resolveAcTest({ gates, scripts, extras, skipStyle, feature, acRows, exclude }) {
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
  // The project's exclusion (6.36.0) removes ids from discovery here exactly as in resolveSet: a level whose gates are
  // ALL excluded is uncovered, so the red run refuses rather than running a smaller set (L34). `excluded` names only the
  // level gates the mapping would have run (grill G9's rule: never credit the declaration with what this stage skips
  // anyway).
  const all = discoverGates(scripts);
  const levelIds = new Set(acRows.flatMap((r) => LEVEL_GATES[r.level]));
  const excludedIds = all.filter((e) => exclude.includes(e.id) && levelIds.has(e.id)).map((e) => e.id);
  const discovered = all.filter((e) => !exclude.includes(e.id));
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
      `no discovered gate runs ${uncovered.join(", ")} — package.json has none of the level's scripts` +
        (excludedIds.length ? `, or the project's ${EXCLUSION_DECLARED_IN} removed them (${excludedIds.join(", ")})` : "") +
        " (run check-red-run.mjs --preflight)"
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
      excluded: excludedBlock(excludedIds),
      required: kept.map((e) => e.id),
      entries: orderEntries(kept, [], false),
    },
  };
}

/** ------------------------------------------------------------------------------------------------
 *  The BASE side's spec, copied from the HEAD record — `run-gates.mjs init --side base --spec-from <head-out>`'s own
 *  rule, extracted here (6.33.0, regress-base-reuse) so the /pharn-regress BASE-reuse predicate
 *  (regress-base-reuse-core.mjs) derives "what a fresh base-init would build now" from the ONE function base-init runs
 *  (L35). `head` is the parsed in-progress `state.json` (its spec in `entries`) or the finalized `stamp.json`, which
 *  drops `entries` — the spec is then reconstructible from `runs`. Refusals are `spec-mismatch`, as they were inside
 *  run-gates.mjs; TOTAL over parsed JSON (L62): a value quoted into a reason goes through JSON.stringify, and a
 *  non-object entry or a non-array `required` is a refusal, where run-gates.mjs used to throw a TypeError.
 *  ---------------------------------------------------------------------------------------------- */
export function baseSpecFrom(head, feature) {
  if (head === null || typeof head !== "object" || Array.isArray(head)) {
    return err("spec-mismatch", "the --spec-from record is not a JSON object");
  }
  if (head.stage !== "regress" || head.side !== "head" || head.feature !== feature) {
    return err(
      "spec-mismatch",
      `the --spec-from record is stage=${JSON.stringify(head.stage)} side=${JSON.stringify(head.side)} feature=${JSON.stringify(head.feature)}; expected regress/head/${JSON.stringify(feature)}`
    );
  }
  // The spec lives in `entries` on an IN-PROGRESS record and is reconstructible from `runs` on a FINALIZED stamp
  // (which drops `entries`). Reading `runs` unconditionally yielded an EMPTY set whenever the head side had not run
  // yet — the common case at base-init, since both sides are initialized before either runs.
  const source = Array.isArray(head.entries) && head.entries.length ? head.entries : head.runs;
  if (!Array.isArray(source) || source.length === 0) return err("spec-mismatch", "the --spec-from record carries no gate entries to copy");
  if (!source.every((r) => r !== null && typeof r === "object" && !Array.isArray(r))) {
    return err("spec-mismatch", "the --spec-from record has a gate entry that is not an object");
  }
  if (!Array.isArray(head.required)) return err("spec-mismatch", "the --spec-from record's `required` is not an array");
  return {
    ok: true,
    spec: {
      stage: "regress",
      side: "base",
      feature,
      source: head.source,
      source_raw: head.source_raw ?? null,
      style_skipped: head.style_skipped === true,
      required: [...head.required],
      entries: source.map((r, i) => ({ id: r.id, shell: r.shell ?? null, argv: r.argv ?? null, files: r.files ?? [], seq: i })),
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

/** Why run `r` of `stamp` is not a well-formed REUSED entry, or null. The runner writes exactly this shape
 *  (gate-reuse-core.mjs `reusedRunRecord`): VERIFY ran nothing (`ran: false`), nothing timed out or moved the tree in
 *  this slot (`fp_before === fp_after`), no per-test file exists at this stage's results path, the identity is
 *  recorded, and the block names the one sanctioned source. TOTAL over parsed JSON (L62): no value is interpolated.
 *  6.49.0: the dispatcher over REUSE_PAIRS — a verify stamp keeps its 6.34.0 rule unchanged, a regress/base stamp gets
 *  the entry rule, and every other stamp kind refuses a reused run. */
function reusedRunDefect(stamp, r) {
  if (stamp.stage === REUSE_TARGET_STAGE) return verifyReusedRunDefect(stamp, r);
  if (stamp.stage === ENTRY_REUSE_TARGET.stage && stamp.side === ENTRY_REUSE_TARGET.side) return entryReusedRunDefect(r);
  return `only a ${REUSE_PAIRS.map((p) => (p.target.side ? `${p.target.stage}/${p.target.side}` : p.target.stage)).join(" or a ")} stamp may carry a reused entry`;
}

/** The entry → regress/base row (6.49.0): the shape entry-base-evidence-core.mjs `derivedBaseStamp` writes. The regress
 *  invocation ran nothing in this slot (`ran: false`, nothing timed out or moved the tree, no results file, no execution
 *  identity of its own), the id is an ALLOWLIST gate (a `structural:` or reserved id is never entry evidence), the exit
 *  is a completed process exit, and the block names the entry source. Which entry run may stand in, and why, is that
 *  module's rule — this one holds the SHAPE. TOTAL (L62). */
function entryReusedRunDefect(r) {
  if (r.reason !== REUSED_REASON || r.ran !== false) return `a reused entry is ran:false with reason ${JSON.stringify(REUSED_REASON)}`;
  if (!ALLOWLIST.includes(r.id)) return "an entry-derived BASE run is an allowlisted gate id";
  if (!isInt(r.exit) || r.exit < 0 || r.exit > MAX_REUSABLE_EXIT)
    return `a reused exit is a completed process exit, 0..${MAX_REUSABLE_EXIT}`;
  const b = r.reused;
  if (b === null || typeof b !== "object" || Array.isArray(b)) return "the `reused` block is not an object";
  const keys = Object.keys(b);
  if (keys.length !== REUSED_BLOCK_KEYS.length || !REUSED_BLOCK_KEYS.every((k) => Object.hasOwn(b, k))) {
    return `the \`reused\` block's keys are not exactly ${REUSED_BLOCK_KEYS.join(", ")}`;
  }
  if (b.stage !== ENTRY_REUSE_SOURCE.stage || b.side !== ENTRY_REUSE_SOURCE.side)
    return "the `reused` block does not name the entry source";
  if (!isInt(b.seq) || b.seq < 0) return "reused.seq is not a non-negative integer";
  if (!isCleanToken(b.stamp_sha256, 64) || !HEX64_RE.test(b.stamp_sha256)) return "reused.stamp_sha256 is not a sha256 hex digest";
  if (Object.hasOwn(r, "identity_sha256")) return "an entry-derived BASE run records no identity_sha256 (nothing ran here)";
  if (r.timed_out !== false || r.mutated !== false || r.fp_before !== r.fp_after)
    return "a reused entry neither times out nor moves the tree";
  if (!Object.hasOwn(r, "results_sha256") || r.results_sha256 !== null) return "a reused entry records results_sha256: null";
  return null;
}

/** Why a regress/base stamp that carries a reused run is not ONE entry-derived stamp, or null (6.49.0): every run is
 *  `ran: false` (reused or `no-files` — a derived stamp never mixes in a run this invocation spawned, so it never mixes
 *  two environments), and every reused run names the same entry stamp. TOTAL (L62). */
function derivedBaseDefect(stamp) {
  if (!stamp.runs.some((r) => r.reason === REUSED_REASON)) return null;
  if (stamp.runs.some((r) => r.ran !== false || (r.reason !== REUSED_REASON && r.reason !== "no-files")))
    return "an entry-derived BASE stamp holds only reused and no-files runs";
  const sources = new Set(stamp.runs.filter((r) => r.reason === REUSED_REASON).map((r) => r.reused.stamp_sha256));
  if (sources.size !== 1) return "an entry-derived BASE stamp names ONE entry stamp";
  return null;
}

function verifyReusedRunDefect(stamp, r) {
  if (stamp.stage !== REUSE_TARGET_STAGE) return `only a ${REUSE_TARGET_STAGE} stamp may carry a reused entry`;
  if (r.reason !== REUSED_REASON || r.ran !== false) return `a reused entry is ran:false with reason ${JSON.stringify(REUSED_REASON)}`;
  if (NON_REUSABLE_IDS.includes(r.id)) return `${NON_REUSABLE_IDS.join(", ")} are never reused`;
  if (!isInt(r.exit) || r.exit < 0 || r.exit > MAX_REUSABLE_EXIT)
    return `a reused exit is a completed process exit, 0..${MAX_REUSABLE_EXIT}`;
  const b = r.reused;
  if (b === null || typeof b !== "object" || Array.isArray(b)) return "the `reused` block is not an object";
  const keys = Object.keys(b);
  if (keys.length !== REUSED_BLOCK_KEYS.length || !REUSED_BLOCK_KEYS.every((k) => Object.hasOwn(b, k))) {
    return `the \`reused\` block's keys are not exactly ${REUSED_BLOCK_KEYS.join(", ")}`;
  }
  if (b.stage !== REUSE_SOURCE.stage || b.side !== REUSE_SOURCE.side) return "the `reused` block does not name the regress/head source";
  if (!isInt(b.seq) || b.seq < 0) return "reused.seq is not a non-negative integer";
  if (!isCleanToken(b.stamp_sha256, 64) || !HEX64_RE.test(b.stamp_sha256)) return "reused.stamp_sha256 is not a sha256 hex digest";
  if (!Object.hasOwn(r, "identity_sha256")) return "a reused entry must record its identity_sha256";
  if (r.timed_out !== false || r.mutated !== false || r.fp_before !== r.fp_after)
    return "a reused entry neither times out nor moves the tree";
  if (!Object.hasOwn(r, "results_sha256") || r.results_sha256 !== null) return "a reused entry records results_sha256: null";
  return null;
}

/** Why `stamp.excluded` is not the block the runner writes, or null: exactly {declared_in, ids}; `declared_in` the one
 *  sanctioned source; `ids` a NON-EMPTY list of distinct ALLOWLIST members in ALLOWLIST order; only on a DISCOVERED
 *  stamp; and none of them in `required` or `runs` — an excluded gate is one that did not run. TOTAL (L62). */
function excludedDefect(stamp) {
  const x = stamp.excluded;
  if (x === null || typeof x !== "object" || Array.isArray(x)) return "is not an object";
  const keys = Object.keys(x);
  if (keys.length !== EXCLUDED_KEYS.length || !EXCLUDED_KEYS.every((k) => Object.hasOwn(x, k))) {
    return `is not exactly {${EXCLUDED_KEYS.join(", ")}}`;
  }
  if (x.declared_in !== EXCLUSION_DECLARED_IN) return `.declared_in is not ${JSON.stringify(EXCLUSION_DECLARED_IN)}`;
  const listErr = exclusionError(x.ids);
  if (listErr !== null) return `.ids ${listErr}`;
  if (x.ids.length === 0) return ".ids is empty — a stamp whose discovery removed nothing carries no block";
  if (x.ids.join("\n") !== ALLOWLIST.filter((id) => x.ids.includes(id)).join("\n")) return ".ids is not in ALLOWLIST order";
  if (stamp.source !== "discover") return "appears on a stamp whose source is not `discover` — an explicit --gates set is never filtered";
  const ran = new Set([...stamp.required, ...stamp.runs.map((r) => r.id)]);
  if (x.ids.some((id) => ran.has(id))) return "names a gate the stamp also requires or ran";
  return null;
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
    // OPTIONAL and additive (6.34.0): the execution identity the runner computed for this entry (gate-reuse-core.mjs).
    if (Object.hasOwn(r, "identity_sha256") && !(isCleanToken(r.identity_sha256, 64) && HEX64_RE.test(r.identity_sha256))) {
      return err("stamp-malformed", `stamp.runs[${i}].identity_sha256 must be a sha256 hex digest`);
    }
    // A REUSED entry (6.34.0) — its whole shape, before the not-run rule below admits it.
    if (r.reason === REUSED_REASON || Object.hasOwn(r, "reused")) {
      const bad = reusedRunDefect(stamp, r);
      if (bad !== null)
        return err("stamp-malformed", `stamp.runs[${i}] (${JSON.stringify(r.id)}) is not a well-formed reused entry: ${bad}`);
    }
    // An entry that never ran is a stamp that must not have been finalized. Named separately from the
    // malformed class so check-loop-fresh.mjs routes it to "re-run the stage" (it is in LAPSE_CODES).
    if (r.ran === false && r.reason !== "no-files" && r.reason !== REUSED_REASON) {
      return err("entry-not-run", `stamp.runs[${i}] (${r.id}) never ran and carries no 'no-files' reason`);
    }
  }

  // 6.49.0 — an entry-derived regress/base stamp is ONE derivation: no spawned run mixed in, one source stamp.
  if (stamp.stage === ENTRY_REUSE_TARGET.stage && stamp.side === ENTRY_REUSE_TARGET.side) {
    const bad = derivedBaseDefect(stamp);
    if (bad !== null) return err("stamp-malformed", `stamp is not a well-formed entry-derived BASE stamp: ${bad}`);
  }

  // No edit between init and the first gate: `aux.completeness` and the resolved set were captured over the tree init
  // fingerprinted, so a first gate that saw another tree judged a different state than the record describes. Same
  // code as the inter-gate break below (a re-run re-fingerprints at init, so it routes as a lapse).
  if (stamp.runs[0].fp_before !== fp.init) {
    return err(
      "tree-changed-between-gates",
      `the worktree changed between init and ${JSON.stringify(stamp.runs[0].id)} — fingerprint.init is not runs[0].fp_before`
    );
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

  // OPTIONAL and additive (6.36.0): the ids the project's declaration removed from discovery. Absent on every stamp
  // written before it, and on every stamp whose discovery removed nothing.
  if (Object.hasOwn(stamp, "excluded")) {
    const bad = excludedDefect(stamp);
    if (bad !== null) return err("stamp-malformed", `stamp.excluded ${bad}`);
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

/** The ids of a VALIDATED stamp's runs the runner recorded as timed out (`timed_out === true`), in run order. The ONE
 *  owner of "this run's exit is not the gate's own verdict" (regress-base-integrity, 6.50.x): regress-base-reuse-core.mjs
 *  refuses such a base stamp as reusable evidence, and check-regress.mjs refuses to read a timed-out base gate as
 *  `pre_existing` when its head is red. A timed-out exit is the runner's kill (or a runner's own exit on the group
 *  signal — node's test runner exits 1, measured), never a finished verdict of the gate. */
export function timedOutRunIds(stamp) {
  return stamp.runs.filter((r) => r.timed_out === true).map((r) => r.id);
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
 *  `gate_run.stamp_sha256` by name. A consumer added since is not covered by either reading.
 *  6.36.0: it copies the stamp's `excluded` block when the stamp carries one (and only then, so every report over a
 *  stamp without it is byte-identical) — the disclosure that this verdict ran over fewer gates than discovery found. */
export function gateRunBlock(stamp, stampSha256) {
  return {
    stamp_sha256: stampSha256,
    source: stamp.source,
    fingerprint: { algo: stamp.fingerprint.algo, final: stamp.fingerprint.final },
    ...(Object.hasOwn(stamp, "excluded") ? { excluded: { declared_in: stamp.excluded.declared_in, ids: [...stamp.excluded.ids] } } : {}),
  };
}
