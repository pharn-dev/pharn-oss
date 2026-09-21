#!/usr/bin/env node
// pharn/floor/check-review-assignments.mjs — the deterministic SHAPE + INTERNAL-CONSISTENCY check over a
// /pharn-review assignment record (CONSTITUTION P0/P5).
//
// INPUT: the assignments.json pharn/floor/render-review-assignments.mjs emits (contract documented in
// that file's header and here — deliberately NOT a pharn-contracts/ schema; see THE DEFERRED CONTRACT
// below). Six invariants, all primitive #3 (enum / regex / set membership, ARCHITECTURE §2):
//
//   I1 registered-lens CLOSURE  — the record's lens set EQUALS count-lenses.mjs's registered set, BOTH
//                                 directions. A closure assertion, not a per-member presence set: a
//                                 presence set is satisfied by a record missing a lens added later
//                                 (lessons-learned L36).
//   I2 slice ⊆ target           — every path in every slice is a member of `target`.
//   I3 unassigned set-equality  — `unassigned_scanner_bound` EQUALS target \ ⋃(scanner-bound slices),
//                                 recomputed here rather than trusted.
//   I4 NON-VACUITY              — an empty `target` is RED. Without this, I1–I3 are all true for free
//                                 over an empty domain and a suppressed emission is indistinguishable
//                                 from a clean run (L34). This is the fail-CLOSED direction and it is
//                                 the reason the other five are worth anything.
//   I5 basis enum               — each `basis` ∈ BASIS_ENUM; a `scanner-bound` entry names a scanner the
//                                 lens-scanner-map actually BINDS (membership, not merely a non-empty
//                                 string — the weaker form let a record cite a nonexistent scanner and
//                                 still pass); a `whole-target-fallback` entry names `null`.
//   I6 well-formedness          — required fields present and correctly typed, no duplicate lens
//                                 entries, every path control-char-free.
//   I7 scanner errors           — `scanner_errors` present and well-shaped, every entry inside the target,
//                                 naming a lens that has an assignment, and DISJOINT from that lens's
//                                 slice: a scanner that failed produced no verdict to hit with.
//
// WHAT THIS CHECKER DELIBERATELY DOES NOT DO — and each omission is a decision, not a gap:
//
//   * IT DOES NOT RE-RUN THE SCANNERS (lessons-learned L42). Re-executing a policy engine after the fact
//     answers "would this scanner hit NOW", not "was this slice assigned THEN". On a target whose files
//     changed between the review and this check — the normal case in any iterating pipeline — a re-run
//     produces a confident answer to a question nobody asked. Slice truth is captured at EMISSION by the
//     emitter; this checker does set algebra over what was recorded.
//   * IT DOES NOT CLAIM THE TARGET WAS APT (lessons-learned L43). Validating the record against its own
//     fields certifies that the stores AGREE; it can never certify the fact. A record that faithfully
//     describes a review of 1 file out of 40 passes every invariant here, and SO DOES a record whose
//     slices and `unassigned_scanner_bound` were fabricated CONSISTENTLY. What defends against that is
//     the emitter being deterministic, not this checker.
//   * IT DOES NOT CLAIM A LENS READ ANYTHING. The record's claim is "this slice was ASSIGNED"; spawning
//     and honoring a slice are advisory orchestration. Nothing here upgrades that, and the error strings
//     below deliberately never use "reviewed", "covered" or "examined".
//
// HONEST BOUND ON ITS OWN VALUE (P0). Over an unmodified deterministic emitter this checker passes on
// every happy path — it is near-vacuous there, and saying so is the point. It earns its place three
// ways: (1) it makes the record FALSIFIABLE BY A CONSUMER who did not run the emitter and has no reason
// to trust it; (2) it detects a hand-edited or stale record; (3) it is a regression detector if the
// emitter drifts. It is NOT evidence that any review was adequate.
//
// THE DEFERRED CONTRACT (P7), recorded rather than silently omitted. There is no
// pharn-contracts/review-assignments.md. The shape would then live in three places — emitter, checker,
// contract — and NO checker in this repo reads a record contract as an INPUT (probed live:
// check-loop-record.mjs hardcodes its own DECISION_ENUM and merely cites loop-record.md; verify-report.md's
// own preamble records that writing a contract made nothing conform to it). A third store of one fact is
// exactly what L35 says to avoid. REOPENS on the first SECOND consumer of assignments.json.
//
// WIRED NOWHERE, deliberately (P7). /pharn-review self-checks its own record with this; no downstream
// gate reads the exit code. A /pharn-verify gate would be the speculative half — no malformed record has
// ever occurred, because none existed — and it would put a stage in the L23 position of owning a gate
// over its own artifact. Named residual: `review-assignments-gate`.
//
// Usage:  node pharn/floor/check-review-assignments.mjs <assignments.json> [--repo <dir>]
// Output: a GREEN line on stdout, or a RED line on stderr naming the FIRST failing invariant.
// Exit:   0 GREEN · 1 RED · 2 the record is unreadable / not JSON / not an object (fail-closed).

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { BASIS_ENUM, lensNameFromPath, readScannerMap } from "./render-review-assignments.mjs";

const BASIS = new Set(BASIS_ENUM);

// eslint-disable-next-line no-control-regex
const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;

function red(msg) {
  process.stderr.write(`RED — ${msg}\n`);
  process.exit(1);
}

function unusable(msg) {
  process.stderr.write(`INCONCLUSIVE — ${msg}\n`);
  process.exit(2);
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function diff(a, b) {
  return [...a].filter((v) => !b.has(v)).sort();
}

// `scanners` is the lens-scanner-map's `scanners` object. It is REQUIRED, not optional-with-a-skip: an
// optional membership check that silently no-ops when its input is absent is the fail-OPEN direction, and
// a caller that forgot to pass it would get a GREEN weaker than the one it thinks it got (L34's shape).
export function checkRecord(record, registeredLenses, scanners) {
  if (!scanners || typeof scanners !== "object") {
    return {
      ok: false,
      code: 2,
      reason:
        "INCONCLUSIVE — no lens-scanner map supplied, so I5's scanner-membership half cannot run. " +
        "Refusing rather than checking a weaker invariant silently.",
    };
  }
  const knownScanners = new Set(Object.values(scanners).filter((s) => typeof s === "string" && s !== ""));
  // --- I6 (shape first: every later invariant reads these fields) ---
  for (const [field, kind] of [
    ["target", "array"],
    ["lenses_registered", "array"],
    ["assignments", "array"],
    ["unassigned_scanner_bound", "array"],
  ]) {
    if (!Array.isArray(record[field])) {
      return { ok: false, code: 1, reason: `I6 well-formedness: \`${field}\` is missing or not an ${kind}.` };
    }
  }

  const allPaths = [...record.target, ...record.unassigned_scanner_bound];
  for (const a of record.assignments) {
    if (!a || typeof a !== "object") {
      return { ok: false, code: 1, reason: "I6 well-formedness: an `assignments` entry is not an object." };
    }
    if (typeof a.lens !== "string" || a.lens === "") {
      return { ok: false, code: 1, reason: "I6 well-formedness: an `assignments` entry has no `lens` string." };
    }
    if (!Array.isArray(a.slice)) {
      return { ok: false, code: 1, reason: `I6 well-formedness: lens \`${a.lens}\` has no \`slice\` array.` };
    }
    allPaths.push(...a.slice);
  }
  for (const p of allPaths) {
    if (typeof p !== "string" || p === "" || CONTROL_CHAR.test(p)) {
      return {
        ok: false,
        code: 1,
        reason: `I6 well-formedness: a recorded path is empty, non-string, or contains a control character (${JSON.stringify(p)}).`,
      };
    }
  }
  const lensNames = record.assignments.map((a) => a.lens);
  const dupes = lensNames.filter((l, i) => lensNames.indexOf(l) !== i);
  if (dupes.length) {
    return {
      ok: false,
      code: 1,
      reason: `I6 well-formedness: duplicate \`assignments\` entries for lens(es): ${[...new Set(dupes)].sort().join(", ")}.`,
    };
  }

  // --- I4 NON-VACUITY, before the quantified invariants it protects (L34) ---
  if (record.target.length === 0) {
    return {
      ok: false,
      code: 1,
      reason:
        "I4 non-vacuity: `target` is empty. I1-I3 are universally quantified over it and would all pass " +
        "for free, making a suppressed emission indistinguishable from a clean review. The emitter " +
        "refuses to write an empty-target record; a record carrying one was not produced by it.",
    };
  }

  // --- I1 registered-lens CLOSURE, both directions (L36: closure, not presence) ---
  const recorded = new Set(lensNames);
  const registered = new Set(registeredLenses);
  if (!setsEqual(recorded, registered)) {
    const missing = diff(registered, recorded);
    const extra = diff(recorded, registered);
    const parts = [];
    if (missing.length) parts.push(`registered but ABSENT from the record: ${missing.join(", ")}`);
    if (extra.length) parts.push(`in the record but NOT registered: ${extra.join(", ")}`);
    return {
      ok: false,
      code: 1,
      reason: `I1 registered-lens closure: the record's lens set does not equal count-lenses.mjs's. ${parts.join("; ")}.`,
    };
  }
  // The record's own `lenses_registered` must agree too — otherwise it could narrate a set it did not use.
  if (!setsEqual(new Set(record.lenses_registered), registered)) {
    return {
      ok: false,
      code: 1,
      reason: "I1 registered-lens closure: the record's `lenses_registered` does not equal count-lenses.mjs's set.",
    };
  }

  // --- I5 basis enum ---
  for (const a of record.assignments) {
    if (!BASIS.has(a.basis)) {
      return {
        ok: false,
        code: 1,
        reason: `I5 basis enum: lens \`${a.lens}\` has basis ${JSON.stringify(a.basis)} — expected one of {${[...BASIS].join(", ")}}.`,
      };
    }
    if (a.basis === "scanner-bound" && (typeof a.scanner !== "string" || a.scanner === "")) {
      return {
        ok: false,
        code: 1,
        reason: `I5 basis enum: lens \`${a.lens}\` is \`scanner-bound\` but names no scanner.`,
      };
    }
    // The membership half. Without it the field was only "a non-empty string", so a record naming a
    // scanner that does not exist passed GREEN — measured, and the gap between this checker and the
    // invariant its own plan declared.
    if (a.basis === "scanner-bound" && !knownScanners.has(a.scanner)) {
      return {
        ok: false,
        code: 1,
        reason:
          `I5 basis enum: lens \`${a.lens}\` names scanner ${JSON.stringify(a.scanner)}, which is not a ` +
          `value in pharn/floor/lens-scanner-map.json — a basis may only cite a scanner the map actually binds.`,
      };
    }
    if (a.basis === "whole-target-fallback" && a.scanner !== null) {
      return {
        ok: false,
        code: 1,
        reason: `I5 basis enum: lens \`${a.lens}\` is \`whole-target-fallback\` but names a scanner — the fallback exists precisely because no deterministic prefilter applies.`,
      };
    }
  }

  // --- I2 slice ⊆ target ---
  const targetSet = new Set(record.target);
  for (const a of record.assignments) {
    const outside = a.slice.filter((f) => !targetSet.has(f));
    if (outside.length) {
      return {
        ok: false,
        code: 1,
        reason: `I2 slice-subset: lens \`${a.lens}\` was assigned path(s) outside the resolved target: ${outside.sort().join(", ")}.`,
      };
    }
  }

  // --- I3 unassigned set-equality (recomputed, never trusted) ---
  const covered = new Set();
  for (const a of record.assignments) {
    if (a.basis === "scanner-bound") for (const f of a.slice) covered.add(f);
  }
  const expected = new Set(record.target.filter((f) => !covered.has(f)));
  const declared = new Set(record.unassigned_scanner_bound);
  if (!setsEqual(expected, declared)) {
    const missing = diff(expected, declared);
    const extra = diff(declared, expected);
    const parts = [];
    if (missing.length) parts.push(`reached by no scanner-bound lens but NOT declared: ${missing.join(", ")}`);
    if (extra.length) parts.push(`declared but actually in a scanner-bound slice: ${extra.join(", ")}`);
    return {
      ok: false,
      code: 1,
      reason: `I3 unassigned set-equality: \`unassigned_scanner_bound\` does not equal target \\ ⋃(scanner-bound slices). ${parts.join("; ")}.`,
    };
  }

  // --- I7 scanner_errors: present, well-shaped, inside the target, and disjoint from the slices ---
  // A file whose scanner ERRORED cannot also be a file whose scanner matched it; allowing both would let
  // a record claim a verdict it never obtained.
  if (!Array.isArray(record.scanner_errors)) {
    return {
      ok: false,
      code: 1,
      reason: "I7 scanner-errors: `scanner_errors` is missing or not an array (an empty array is the normal state, not an absent field).",
    };
  }
  for (const e of record.scanner_errors) {
    if (!e || typeof e !== "object" || typeof e.lens !== "string" || typeof e.file !== "string") {
      return { ok: false, code: 1, reason: "I7 scanner-errors: an entry is not a {lens, file} object of strings." };
    }
    if (!recorded.has(e.lens)) {
      return { ok: false, code: 1, reason: `I7 scanner-errors: entry names lens \`${e.lens}\`, which has no assignment entry.` };
    }
    if (!targetSet.has(e.file)) {
      return { ok: false, code: 1, reason: `I7 scanner-errors: entry names file \`${e.file}\`, which is outside the resolved target.` };
    }
    const a = record.assignments.find((x) => x.lens === e.lens);
    if (a && a.slice.includes(e.file)) {
      return {
        ok: false,
        code: 1,
        reason: `I7 scanner-errors: lens \`${e.lens}\` reports file \`${e.file}\` as BOTH a scanner error and a slice hit — a failed scanner produced no verdict to hit with.`,
      };
    }
  }

  return { ok: true };
}

function main() {
  const argv = process.argv.slice(2);
  const recordPath = argv[0];
  if (!recordPath || recordPath.startsWith("--")) {
    process.stderr.write("usage: node pharn/floor/check-review-assignments.mjs <assignments.json> [--repo <dir>]\n");
    process.exit(2);
  }
  const ri = argv.indexOf("--repo");
  const repoDir = ri !== -1 && ri + 1 < argv.length ? argv[ri + 1] : ".";

  let record;
  try {
    record = JSON.parse(readFileSync(recordPath, "utf8"));
  } catch (e) {
    unusable(`assignment record unreadable or not valid JSON (${recordPath}): ${e.message}`);
  }
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    unusable(`assignment record is not a JSON object (${recordPath}).`);
  }

  let registered;
  try {
    const out = execFileSync("node", [join(repoDir, "pharn/floor/count-lenses.mjs"), repoDir], { encoding: "utf8" });
    registered = JSON.parse(out).lenses.map(lensNameFromPath);
  } catch (e) {
    unusable(`could not read lens membership from count-lenses.mjs: ${e.message}`);
  }

  let scanners;
  try {
    scanners = readScannerMap(repoDir);
  } catch (e) {
    unusable(`could not read pharn/floor/lens-scanner-map.json: ${e.message}`);
  }

  const result = checkRecord(record, registered, scanners);
  if (!result.ok) {
    if (result.code === 2) unusable(result.reason);
    red(result.reason);
  }

  process.stdout.write(
    `GREEN — assignment record shape + internal consistency hold (${recordPath}): ` +
      `${record.lenses_registered.length} registered lens(es) all present, ${record.target.length} target file(s), ` +
      `${record.unassigned_scanner_bound.length} reached by no scanner-bound lens. ` +
      `NOTE (P0): this certifies what was ASSIGNED, never that any lens READ its slice, and never that ` +
      `the resolved target was the right one (L43).\n`
  );
  process.exit(0);
}

if (import.meta.main) {
  main();
}
