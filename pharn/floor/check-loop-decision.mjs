#!/usr/bin/env node
// pharn/floor/check-loop-decision.mjs — the deterministic CROSS-FILE RE-DERIVATION check over a
// loop-record (`pharn/features/<name>/LOOP.md`): does its recorded `decision` actually reduce, via a
// LIVE re-run of `pharn/floor/check-loop.mjs`, from the reports it cites?
//
// Floor/eval infrastructure — NOT a Capability (no `role:`; it lives in this floor-ignored dir, exactly
// like check-loop.mjs / check-loop-record.mjs / check-plan-spec-agree.mjs).
//
// WHY THIS FILE EXISTS (P7 — a real dogfood failure, not a design-time hypothetical). An unattended
// `/pharn-loop` run skipped `/pharn-grill`, `/pharn-regress` and `/pharn-verify` entirely, hand-executed
// the equivalent work by judgment, and still wrote a `LOOP.md` whose `decision` read as a genuine
// floor-grade stop. `check-loop-record.mjs` — the only checker that self-validates a loop-record — passed
// it, because that checker's own header is explicit that it verifies SHAPE only: "that `decision` AGREES
// with what `check-loop.mjs` actually emitted (membership is checked, agreement is not)". Nothing in the
// pipeline ever re-derived a recorded decision from the reports it claims to summarize, so a
// hand-authored or corrupted `LOOP.md` was indistinguishable on disk from a genuinely floor-computed one
// — and on a green stop specifically (`STOP_GREEN`, or `STOP_GREEN_QUICK` under `/pharn-loop --quick`, 6.28.0), that
// record is committed to a new branch UNATTENDED, with no human between the record and the commit. This file closes
// exactly that gap.
//
// WHY REUSE, NOT REIMPLEMENT (P3/P4 — the check-plan-spec-agree.mjs idiom, byte-for-byte). This file
// shells `check-loop.mjs` as a CLI via `spawnSync` — NOT a sibling import of its internals — the SAME
// separation `check-plan-spec-agree.mjs` uses to re-run `check-spec-approved.mjs` / `check-spec.mjs`.
// `check-loop.mjs`'s own decision table (the Design-C precedence: unmeasured → reconcile-red →
// floor-green → iter<cap → cap) lives in exactly ONE place and is never re-derived here. This file adds
// no new decision logic of its own — it only COMPARES the recorded token to the token a live run emits.
//
// STRUCTURAL, NOT A NEW GATE ON THE STOP ITSELF (the invariant this file must never blur): `check-loop.mjs`'s
// inputs are the two verdict reports, `--iter` / `--cap`, and ONE token of the feature's own SPEC — its `spec_kind`,
// read from the `SPEC.md` beside the verify report, which chooses the table (6.28.0) — and this file is not one of
// them and cannot become one. This checker runs strictly AFTER a stop already exists (it consumes `check-loop.mjs`'s
// OUTPUT, from a fresh invocation, never feeds its input) and gates only the downstream `/pharn-loop` Step 6c commit —
// never the stop decision itself. "No advisory stage can gate the loop's stop" remains true by construction.
//
// THE MODE (6.28.0, `/pharn-loop --quick`). The re-run reads the SPEC beside the record — the record's own directory
// is the verify report's — so the table it re-derives with is the SPEC's kind, read in ANY state: /pharn-loop's Step
// 6a reverts a non-green stop's SPEC to Draft before this check runs, and the revert never touches the kind line (L42,
// L58). The record's OPTIONAL `mode` (absent → `full`) records the run's INVOCATION; after the live re-run it must
// equal the re-derived mode (check-loop.mjs's JSON `mode`, absent → `full`), else RED `MODE_MISMATCH`, reported beside
// any decision mismatch. That is what makes a run invoked without `--quick` over a quick SPEC (D8) fail here: its
// record says full, the SPEC's kind says quick. It certifies AGREEMENT between the record and the SPEC, never who
// chose either (L43). The output lines name the re-derived mode and, in quick mode, cite `verify-report.json` alone —
// the quick table never opens the regression report, so this file never says it did (grill G3).
//
// DELIBERATE ASYMMETRY WITH check-ship-briefing.mjs (stated, not accidental). That checker's cross-file
// re-verification is ANNOTATION ONLY — it never gates GATE 2 — because a human GATE-2 decision already
// follows it, and a wrong briefing is still caught there. `/pharn-loop`'s green stop → commit has NO
// human between the record and the branch, so this checker GATES that one step. The precedent does not
// transfer because the surrounding human-gate context differs, not because the pattern itself changed.
//
// HONEST BOUND (P0 — the residual this file names rather than hides): this proves the recorded `decision`
// is RE-DERIVABLE from the reports it cites — it does NOT prove those reports are themselves honest. A
// self-consistent FORGERY (a hand-written `LOOP.md` paired with hand-written `verify-report.json` /
// `regression-report.json` that genuinely reduce to the claimed decision) still passes. Closing that would
// mean authenticating the reports' provenance, which is out of this file's scope — named, not solved.
//
// THE BLOCKED-STOP EXEMPTION (per `pharn/pharn-contracts/loop-record.md`, "the one exception"): a record
// with `decision: INCONCLUSIVE` and a `blocked` frontmatter key never consulted `check-loop.mjs` in the
// first place (a stuck-point stop, not a malformed-report stop) — there is nothing to re-derive, so this
// checker SKIPS it (GREEN, distinct message) rather than attempting a re-run that was never meant to
// happen.
//
// `cap` — the loop's `--max-iter` value — is read from the record's OWN (optional) `cap` field, added
// alongside this file so `/pharn-loop` can capture it (it already knows the value at Step 1 entry). A
// non-blocked record with no `cap` is MALFORMED for this checker's purposes (fail-closed RED): every
// record the UPDATED `/pharn-loop` writes carries it, so this path fires only on a record that predates
// this feature or is otherwise malformed — nothing currently re-runs this checker against pre-existing
// records automatically, so no legacy record is broken by this rule.
//
// THE CAP THE RUN OPENED WITH (6.65.0, audit LOOP-2). `/pharn-loop` types `--iter` / `--cap` into every check-loop.mjs
// call and copies `cap` into the record, so re-deriving with the record's own `cap` only proves the record agrees with
// itself: a run that kept iterating past the cap it was given, and recorded the cap it used, re-derived GREEN. The cap
// the run opened with has a second home, written once at Step 1a: `require-loop-record.cjs --open <name> --cap <M>`
// writes `pharn/.run/pharn-loop/<name>/active.json` (`pharn-loop-active/1`, that hook the one owner of the schema — L35 —
// whose restated literal below a test pins equal to the hook's exported SCHEMA). After the live re-run, beside the
// decision and mode comparisons (collected, never an early return, so every mismatch prints):
//   • the marker is located from the record's own path, never an argument: the record must sit at
//     `<root>/pharn/features/<name>/LOOP.md` (two literal parent segments), the marker at
//     `<root>/pharn/.run/pharn-loop/<name>/active.json`. It is opened once with O_NOFOLLOW and checked and read
//     through that one descriptor — a regular file only, never through a symlink (L54), with no window between the
//     type check and the read (CodeQL js/file-system-race) — then JSON.parsed; its `schema` must be `pharn-loop-active/1`, its `name` the record's `<name>`,
//     and its `cap` a positive safe integer (own-property reads — L15). A record off that layout, or a marker that is
//     absent or fails any of those tests, is RED `CAP_UNWITNESSED` — FAIL-CLOSED. The one caller (loop-closeout.mjs)
//     runs this check before its own `--close`; every run opens the marker at Step 1a before its feature directory can
//     exist (a non-zero `--open` stops S9 with no record); and a blocked record — the one stop that may lack one — is
//     SKIPPED above, before any of this. COST, stated: re-running this checker by hand after a run's Final step closed
//     the marker is RED `CAP_UNWITNESSED`; the cap the run opened with is no longer on disk.
//   • the marker's `cap` must equal the record's `cap`, else RED `CAP_MISMATCH` (both integers named; no marker text is
//     ever quoted — L62);
//   • and the record's `iterations` must not exceed its `cap`, else RED `ITER_OVER_CAP`: a compliant run stops at
//     `iter <= cap` in every decision class (CONTINUE needs `iter < cap`; STOP_CAP fires at the first `iter >= cap`).
// BOUND (L43): agreement between two files in the writable tree, never provenance — a run that rewrites the marker
// through Bash together with the record passes, and `iterations` is still model-typed, so an under-count passes.
//
// NON-LLM. Node stdlib only (fs, child_process, url, path). No network, no eval, no deps.
//
// ── NO CROSS-TREE IMPORT, NO SIBLING-INTERNALS IMPORT (P3) ──────────────────────────────────────────────
// `FM_RE` / `stripBom` come from the shared `frontmatter-core.mjs` (this file is added to its materialized
// `CONSUMERS` list), and `LOOP_MODES` from `loop-mode-core.mjs` — both cores, never a CLI's internals (6.28.0: the mode
// vocabulary has one owner, L35). The small envelope-scalar helpers below are RE-IMPLEMENTED IN-FILE rather than
// imported from `check-loop-record.mjs` — the same discipline `check-plan-spec-agree.mjs` already applies
// to `check-spec.mjs`'s `readValue`: two files agreeing on a tiny parse is a CONVENTION tests can detect,
// not a coupling that would make one file's shape depend on another's internals.
//
// Usage:
//   node pharn/floor/check-loop-decision.mjs <LOOP.md>
//
// Exit: 0 (GREEN) — the record is a blocked stop (skipped), or its recorded decision AND mode were re-derived
//                    verbatim from a live run of check-loop.mjs against its cited reports.
//       1 (RED)   — every refusal: a malformed record/envelope, a missing/invalid `iterations` or `cap`
//                    on a non-blocked record, a malformed `mode`, or a live re-derivation that does NOT match the
//                    recorded decision (reports missing/malformed, or a genuine mismatch — DECISION_MISMATCH) or the
//                    recorded mode (MODE_MISMATCH), a cap the run's marker does not witness (CAP_UNWITNESSED) or
//                    contradicts (CAP_MISMATCH), or `iterations` over `cap` (ITER_OVER_CAP). Fail-closed throughout.

import { readFileSync, existsSync, openSync, fstatSync, closeSync, constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, resolve } from "node:path";
import { describeRepeats, frontmatterEntries, stripBom } from "./frontmatter-core.mjs";
import { LOOP_MODES } from "./loop-mode-core.mjs";

// Resolve the sibling CLI RELATIVE TO THIS FILE (import.meta.url), never the cwd — so this check behaves
// identically no matter where /pharn-loop is invoked from (mirrors check-plan-spec-agree.mjs).
const here = dirname(fileURLToPath(import.meta.url));
const CHECK_LOOP = join(here, "check-loop.mjs");

// check-loop-record.mjs carries the same enum; a behavioural test runs each token through both (6.28.0).
const DECISION_ENUM = new Set(["STOP_GREEN", "STOP_GREEN_QUICK", "STOP_CAP", "STOP_TERMINAL", "INCONCLUSIVE"]);
// The optional `mode`'s vocabulary — loop-mode-core.mjs's LOOP_MODES, never restated (L35).
const MODE_ENUM = new Set(LOOP_MODES);
const ITER_RE = /^\d+$/;
const CAP_RE = /^\d+$/;

function red(msg) {
  console.log(`RED — ${msg}`);
  return 1;
}

// The run marker's schema — require-loop-record.cjs's SCHEMA, restated because the floor never imports a hook; a test
// pins the two equal by reading this line (L35) — this file is a CLI with no import guard, so nothing imports it.
const MARKER_SCHEMA = "pharn-loop-active/1";

/**
 * The cap the run opened with, from its Stop-guard marker beside the record's project root.
 * @returns {{ok: true, cap: number} | {ok: false, why: string}} — `why` is a fixed phrase, never marker text (L62).
 */
function markerCap(recordPath) {
  const featureDir = dirname(resolve(recordPath));
  const name = basename(featureDir);
  const featuresDir = dirname(featureDir);
  const pharnDir = dirname(featuresDir);
  if (basename(featuresDir) !== "features" || basename(pharnDir) !== "pharn") {
    return { ok: false, why: "the record is not at pharn/features/<name>/LOOP.md, so its run marker cannot be located" };
  }
  const marker = join(dirname(pharnDir), "pharn", ".run", "pharn-loop", name, "active.json");
  // ONE descriptor (the griller-extract.mjs 6.60.1 form, CodeQL js/file-system-race): the type check and the read see
  // the same file, so the path cannot be swapped between them. O_NOFOLLOW refuses a symlink at the final component
  // (ELOOP); O_NONBLOCK keeps a FIFO from blocking the open, and fstat then refuses it as not a regular file.
  let fd;
  try {
    fd = openSync(marker, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (e) {
    if (e && e.code === "ELOOP") return { ok: false, why: "the run marker is not a regular file (a symlink is never followed)" };
    if (e && e.code === "ENOENT") return { ok: false, why: `no run marker at pharn/.run/pharn-loop/${name}/active.json` };
    return { ok: false, why: "the run marker cannot be opened" };
  }
  let text;
  try {
    if (!fstatSync(fd).isFile()) return { ok: false, why: "the run marker is not a regular file (a symlink is never followed)" };
    text = readFileSync(fd, "utf8");
  } catch {
    return { ok: false, why: "the run marker is unreadable" };
  } finally {
    closeSync(fd);
  }
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, why: "the run marker is not valid JSON" };
  }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return { ok: false, why: "the run marker is not a JSON object" };
  if (!Object.hasOwn(doc, "schema") || doc.schema !== MARKER_SCHEMA)
    return { ok: false, why: `the run marker's schema is not ${MARKER_SCHEMA}` };
  if (!Object.hasOwn(doc, "name") || doc.name !== name) return { ok: false, why: "the run marker names another run" };
  const cap = Object.hasOwn(doc, "cap") ? doc.cap : undefined;
  if (!Number.isSafeInteger(cap) || cap < 1) return { ok: false, why: "the run marker carries no positive integer cap" };
  return { ok: true, cap };
}

// A string with no control characters and a bounded length — the SAME precondition
// check-loop-record.mjs applies before any anchored regex (lessons-learned L14, cited not restated —
// P4): composed with the regex, never a substitute for it.
function cleanScalar(v, maxLen) {
  if (typeof v !== "string") return false;
  if (v.length < 1 || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

// Read the envelope from the `---`-fenced frontmatter ONLY — never grepped from the file at large
// (lessons-learned L6), through frontmatter-core.mjs's `frontmatterEntries` (6.71.3), which also reports every
// repeated key. Returns `{ fields, repeated }` (a Map, mirroring check-loop-record.mjs — no plain-object key
// indexing, lessons-learned L15), or null with no frontmatter.
function envelope(text) {
  const fm = frontmatterEntries(text);
  if (fm === null) return null;
  const fields = new Map();
  for (const { key, raw } of fm.entries) {
    fields.set(key, raw.trim().replace(/^(["'])(.*)\1$/, "$2"));
  }
  return { fields, repeated: fm.repeated };
}

function gate(recordPath) {
  let text;
  try {
    text = stripBom(readFileSync(recordPath, "utf8"));
  } catch (e) {
    return red(`loop-record is unreadable (${recordPath}): ${e.message}`);
  }

  const env = envelope(text);
  if (env === null) {
    return red(`loop-record has no \`---\`-fenced YAML frontmatter (${recordPath}) — cannot read its envelope.`);
  }
  // A repeated envelope key (6.71.3) is refused BEFORE the blocked-stop skip below: either copy could be the one a
  // re-derivation reads, and a repeated `blocked` must not reach SKIPPED GREEN. Keys and counts only, never a value.
  if (env.repeated.length > 0) {
    return red(
      `loop-record's frontmatter repeats ${describeRepeats(env.repeated)} (${recordPath}) — an envelope with a repeated ` +
        `key is not re-derivable; every key appears at most once (pharn/pharn-contracts/loop-record.md).`
    );
  }
  const fields = env.fields;

  const decision = fields.get("decision");
  if (!cleanScalar(decision, 32) || !DECISION_ENUM.has(decision)) {
    return red(
      `loop-record's \`decision\` is ${JSON.stringify(decision)} (${recordPath}) — expected one of {${[...DECISION_ENUM].join(", ")}}.`
    );
  }

  // ── The blocked-stop exemption — never attempt re-derivation (the contract's stated exception) ────────
  if (decision === "INCONCLUSIVE" && fields.has("blocked")) {
    console.log(
      `GREEN — loop-record is a blocked stop (${recordPath}, blocked: ${fields.get("blocked")}) — it never consulted check-loop.mjs; nothing to re-derive. SKIPPED.`
    );
    return 0;
  }

  // ── Every other non-blocked decision must be RE-DERIVABLE — `iterations` and `cap` are mandatory here ──
  const iterations = fields.get("iterations");
  if (iterations === undefined || !cleanScalar(iterations, 16) || !ITER_RE.test(iterations) || Number(iterations) < 1) {
    return red(
      `loop-record's \`iterations\` is ${JSON.stringify(iterations)} (${recordPath}) — expected a positive integer (>= 1). ` +
        `A non-blocked record must carry a valid \`iterations\` to be re-derivable.`
    );
  }

  const cap = fields.get("cap");
  if (cap === undefined || !cleanScalar(cap, 16) || !CAP_RE.test(cap) || Number(cap) < 1) {
    return red(
      `loop-record has no valid \`cap\` (${recordPath}) — a non-blocked record must carry it to be re-derivable ` +
        `(needed to distinguish CONTINUE-shaped from STOP_CAP-shaped reds). A record written before this ` +
        `field existed, or one that is otherwise malformed, cannot be re-derived by this checker.`
    );
  }

  // `mode` — OPTIONAL (6.28.0); absent means `full` (every pre-6.28.0 record). Guard first (L14), then exact
  // membership (L15). It records the run's invocation, and is compared with the re-derived mode below.
  let mode = "full";
  if (fields.has("mode")) {
    const m = fields.get("mode");
    if (!cleanScalar(m, 16) || !MODE_ENUM.has(m)) {
      return red(
        `loop-record's \`mode\` is ${JSON.stringify(m)} (${recordPath}) — when present, expected one of {${[...MODE_ENUM].join(", ")}} ` +
          `(absent means full).`
      );
    }
    mode = m;
  }

  const featureDir = dirname(recordPath);
  const verifyPath = join(featureDir, "verify-report.json");
  const regressPath = join(featureDir, "regression-report.json");

  if (!existsSync(CHECK_LOOP)) {
    return red(`could not find check-loop.mjs at ${CHECK_LOOP} — cannot re-derive the recorded decision.`);
  }

  // Re-run the SAME decision core the original stop used. Its stdout is JSON regardless of its own exit
  // code (including its own exit-2 bad-input path) — the exit code is deliberately NOT branched on here;
  // only the printed `.decision` and `.mode` tokens are compared. This uniformly covers "the reports genuinely
  // reduce to the recorded decision" AND "the reports were bad/missing then, and still are, so both computed
  // INCONCLUSIVE" with no special-casing. The regression report's path is passed because check-loop.mjs's argv
  // requires two positionals; its quick table never opens it.
  const r = spawnSync(process.execPath, [CHECK_LOOP, verifyPath, regressPath, "--iter", iterations, "--cap", cap], { encoding: "utf8" });
  if (r.error) {
    return red(`could not run check-loop.mjs (${CHECK_LOOP}): ${r.error.message}`);
  }

  let redecision;
  try {
    redecision = JSON.parse(r.stdout || "");
  } catch (e) {
    return red(`check-loop.mjs produced unparseable output while re-deriving ${recordPath}: ${e.message}`);
  }
  if (redecision === null || typeof redecision !== "object" || typeof redecision.decision !== "string") {
    return red(`check-loop.mjs's re-derivation output for ${recordPath} has no \`.decision\` string.`);
  }
  // The re-derived mode: check-loop.mjs's JSON `mode`, absent → `full` (a pre-6.28.0 check-loop.mjs has no such key).
  // Anything else outside the vocabulary — null included, which only an argv refusal emits — is unusable: fail-closed.
  const rederivedMode = redecision.mode === undefined ? "full" : redecision.mode;
  if (typeof rederivedMode !== "string" || !MODE_ENUM.has(rederivedMode)) {
    return red(
      `check-loop.mjs's re-derivation output for ${recordPath} carries a \`mode\` outside {${[...MODE_ENUM].join(", ")}} — ` +
        `cannot compare the record's mode with it.`
    );
  }

  // What the re-run read, named by the mode it re-derived: the quick table never opens the regression report, so a
  // quick line cites verify-report.json alone (grill G3).
  const quick = rederivedMode === "quick";
  const cited = quick ? `${verifyPath} (quick table — the regression report is not read)` : `${verifyPath} + ${regressPath}`;

  const mismatches = [];
  if (redecision.decision !== decision) {
    mismatches.push(
      `loop-record's \`decision\` is ${JSON.stringify(decision)} (${recordPath}), but a LIVE re-run of ` +
        `check-loop.mjs against its cited reports (${cited}) with --iter ${iterations} ` +
        `--cap ${cap} computes ${JSON.stringify(redecision.decision)} in mode ${rederivedMode} instead — DECISION_MISMATCH. ` +
        `check-loop.mjs's own reason: ${JSON.stringify(redecision.reason ?? null)}. This record's decision ` +
        `was NOT genuinely derived from the reports it cites; do not commit it.`
    );
  }
  if (rederivedMode !== mode) {
    mismatches.push(
      `loop-record's \`mode\` is ${mode}${fields.has("mode") ? "" : " (absent — read as full)"} (${recordPath}), but the ` +
        `table check-loop.mjs re-derives with is ${rederivedMode} — the feature SPEC's spec_kind ` +
        `${quick ? "reads quick" : "does not read quick"} — MODE_MISMATCH. The record's mode is the run's invocation, so ` +
        `the invocation and the SPEC's kind disagree (a run without --quick over a quick SPEC, or the reverse); do not ` +
        `commit it, and never repair this by editing \`mode\`.`
    );
  }
  // The cap the run opened with (6.65.0, LOOP-2) — after the re-run, so a decision or mode mismatch still prints.
  const witnessed = markerCap(recordPath);
  if (!witnessed.ok) {
    mismatches.push(
      `loop-record's \`cap\` ${cap} (${recordPath}) is not witnessed by the run's Stop-guard marker — ${witnessed.why} — ` +
        `CAP_UNWITNESSED. /pharn-loop opens that marker at Step 1a with the cap it was given and closes it only after this ` +
        `check, so a non-blocked record with none cannot show that its cap is the one the run started with; do not commit ` +
        `it. (Re-running this check after the run's Final step closed the marker is RED here too.)`
    );
  } else if (witnessed.cap !== Number(cap)) {
    mismatches.push(
      `loop-record's \`cap\` is ${Number(cap)} (${recordPath}), but the run opened with --cap ${witnessed.cap} ` +
        `(pharn/.run/pharn-loop/<name>/active.json) — CAP_MISMATCH. The record's stop was computed against a cap the run was ` +
        `not given; do not commit it, and never repair this by editing \`cap\`.`
    );
  }
  if (Number(iterations) > Number(cap)) {
    mismatches.push(
      `loop-record's \`iterations\` ${Number(iterations)} exceeds its \`cap\` ${Number(cap)} (${recordPath}) — ITER_OVER_CAP. ` +
        `A run that obeys check-loop.mjs stops at an iteration <= its cap (CONTINUE needs iter < cap; STOP_CAP fires at the ` +
        `first iter >= cap), so this run iterated past its cap; do not commit it.`
    );
  }
  if (mismatches.length > 0) {
    for (const m of mismatches) console.log(`RED — ${m}`);
    return 1;
  }

  console.log(
    `GREEN — loop-record's decision ${decision} (${recordPath}) is re-derivable in mode ${rederivedMode}: a live re-run of ` +
      `check-loop.mjs against ${cited} with --iter ${iterations} --cap ${cap} reproduces it verbatim, the ` +
      `record's mode agrees, and its cap is the one the run's marker recorded at Step 1a. NOTE (P0): this proves the decision is RE-DERIVABLE from the cited ` +
      `report${quick ? "" : "s"} — it does NOT prove ${quick ? "that report is" : "those reports are"} honest. A ` +
      `self-consistent fabricated ${quick ? "report" : "report pair"} still passes this check.`
  );
  return 0;
}

function main() {
  const recordPath = process.argv[2];
  if (!recordPath || process.argv.length > 3) {
    console.log("RED — usage: node pharn/floor/check-loop-decision.mjs <LOOP.md>");
    return 1;
  }
  return gate(recordPath);
}

process.exit(main());
