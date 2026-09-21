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
// — and on `STOP_GREEN` specifically, that record is committed to a new branch UNATTENDED, with no human
// between the record and the commit. This file closes exactly that gap.
//
// WHY REUSE, NOT REIMPLEMENT (P3/P4 — the check-plan-spec-agree.mjs idiom, byte-for-byte). This file
// shells `check-loop.mjs` as a CLI via `spawnSync` — NOT a sibling import of its internals — the SAME
// separation `check-plan-spec-agree.mjs` uses to re-run `check-spec-approved.mjs` / `check-spec.mjs`.
// `check-loop.mjs`'s own decision table (the Design-C precedence: unmeasured → reconcile-red →
// floor-green → iter<cap → cap) lives in exactly ONE place and is never re-derived here. This file adds
// no new decision logic of its own — it only COMPARES the recorded token to the token a live run emits.
//
// STRUCTURAL, NOT A NEW GATE ON THE STOP ITSELF (the invariant this file must never blur): `check-loop.mjs`'s
// input signature stays EXACTLY `{verify-report.json, regression-report.json, iter, cap}` — this file is
// not one of its inputs and cannot become one. This checker runs strictly AFTER a stop already exists (it
// consumes `check-loop.mjs`'s OUTPUT, from a fresh invocation, never feeds its input) and gates only the
// downstream `/pharn-loop` Step 6c commit — never the stop decision itself. "No advisory stage can gate
// the loop's stop" remains true by construction.
//
// DELIBERATE ASYMMETRY WITH check-ship-briefing.mjs (stated, not accidental). That checker's cross-file
// re-verification is ANNOTATION ONLY — it never gates GATE 2 — because a human GATE-2 decision already
// follows it, and a wrong briefing is still caught there. `/pharn-loop`'s `STOP_GREEN` → commit has NO
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
// NON-LLM. Node stdlib only (fs, child_process, url, path). No network, no eval, no deps.
//
// ── NO CROSS-TREE IMPORT, NO SIBLING-INTERNALS IMPORT (P3) ──────────────────────────────────────────────
// `FM_RE` / `stripBom` come from the shared `frontmatter-core.mjs` (this file is added to its materialized
// `CONSUMERS` list). The small envelope-scalar helpers below are RE-IMPLEMENTED IN-FILE rather than
// imported from `check-loop-record.mjs` — the same discipline `check-plan-spec-agree.mjs` already applies
// to `check-spec.mjs`'s `readValue`: two files agreeing on a tiny parse is a CONVENTION tests can detect,
// not a coupling that would make one file's shape depend on another's internals.
//
// Usage:
//   node pharn/floor/check-loop-decision.mjs <LOOP.md>
//
// Exit: 0 (GREEN) — the record is a blocked stop (skipped), or its recorded decision was re-derived
//                    verbatim from a live run of check-loop.mjs against its cited reports.
//       1 (RED)   — every refusal: a malformed record/envelope, a missing/invalid `iterations` or `cap`
//                    on a non-blocked record, or a live re-derivation that does NOT match the recorded
//                    decision (reports missing/malformed, or a genuine mismatch). Fail-closed throughout.

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FM_RE, stripBom } from "./frontmatter-core.mjs";

// Resolve the sibling CLI RELATIVE TO THIS FILE (import.meta.url), never the cwd — so this check behaves
// identically no matter where /pharn-loop is invoked from (mirrors check-plan-spec-agree.mjs).
const here = dirname(fileURLToPath(import.meta.url));
const CHECK_LOOP = join(here, "check-loop.mjs");

const DECISION_ENUM = new Set(["STOP_GREEN", "STOP_CAP", "STOP_TERMINAL", "INCONCLUSIVE"]);
const ITER_RE = /^\d+$/;
const CAP_RE = /^\d+$/;

function red(msg) {
  console.log(`RED — ${msg}`);
  return 1;
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
// (lessons-learned L6). Returns a Map, mirroring check-loop-record.mjs (no plain-object key indexing —
// lessons-learned L15).
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

function gate(recordPath) {
  let text;
  try {
    text = stripBom(readFileSync(recordPath, "utf8"));
  } catch (e) {
    return red(`loop-record is unreadable (${recordPath}): ${e.message}`);
  }

  const fields = envelope(text);
  if (fields === null) {
    return red(`loop-record has no \`---\`-fenced YAML frontmatter (${recordPath}) — cannot read its envelope.`);
  }

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

  const featureDir = dirname(recordPath);
  const verifyPath = join(featureDir, "verify-report.json");
  const regressPath = join(featureDir, "regression-report.json");

  if (!existsSync(CHECK_LOOP)) {
    return red(`could not find check-loop.mjs at ${CHECK_LOOP} — cannot re-derive the recorded decision.`);
  }

  // Re-run the SAME decision core the original stop used. Its stdout is JSON regardless of its own exit
  // code (including its own exit-2 bad-input path) — the exit code is deliberately NOT branched on here;
  // only the printed `.decision` token is compared. This uniformly covers "the reports genuinely reduce
  // to the recorded decision" AND "the reports were bad/missing then, and still are, so both computed
  // INCONCLUSIVE" with no special-casing.
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

  if (redecision.decision !== decision) {
    return red(
      `loop-record's \`decision\` is ${JSON.stringify(decision)} (${recordPath}), but a LIVE re-run of ` +
        `check-loop.mjs against its cited reports (${verifyPath}, ${regressPath}) with --iter ${iterations} ` +
        `--cap ${cap} computes ${JSON.stringify(redecision.decision)} instead — DECISION_MISMATCH. ` +
        `check-loop.mjs's own reason: ${JSON.stringify(redecision.reason ?? null)}. This record's decision ` +
        `was NOT genuinely derived from the reports it cites; do not commit it.`
    );
  }

  console.log(
    `GREEN — loop-record's decision ${decision} (${recordPath}) is re-derivable: a live re-run of check-loop.mjs ` +
      `against ${verifyPath} + ${regressPath} with --iter ${iterations} --cap ${cap} reproduces it verbatim. ` +
      `NOTE (P0): this proves the decision is RE-DERIVABLE from the cited reports — it does NOT prove those ` +
      `reports are themselves honest. A self-consistent fabricated report pair still passes this check.`
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
