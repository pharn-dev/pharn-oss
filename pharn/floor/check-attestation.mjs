#!/usr/bin/env node
// pharn/floor/check-attestation.mjs — the deterministic ship-record ATTESTATION verdict (CONSTITUTION P0/P2/P5).
//
// The floor primitive for the ship-attestation feature (pharn/pharn-contracts/ship-record.md — cite, don't
// restate, P4). It answers ONE structural question about a ship-record's OPTIONAL `attestation` block:
//
//   verify (default):  is the attestation ABSENT (unattested), or PRESENT and { well-shaped (enum/regex)
//                       AND content-bound (record_hash == recomputed) } (attested), or broken (malformed /
//                       stale)?  A named human's attestation, bound to record CONTENT by a hash.
//   --compute:         print the canonical record_hash over the record EXCLUDING `attestation`, so the
//                       /pharn-ship EMITTER obtains the hash from the SAME code the verifier uses (fix F1 —
//                       one implementation, emitter and verifier hash identical bytes by construction, so a
//                       genuine attestation can never spuriously read `stale`).
//
// This reduces to pharn/ARCHITECTURE.md §2 primitives: enum/regex (shape) + content-hash (record_hash).
// It is NON-floor about WHO supplied `by` (a real human vs the agent) and about COMPREHENSION — those are
// ADVISORY, stated in the contract; this script never claims them. Attestation != comprehension (P0).
//
// Non-LLM, stdlib-only, fail-closed. Node 24.
//
// Usage:
//   node pharn/floor/check-attestation.mjs <ship-record.json>              # verify
//   node pharn/floor/check-attestation.mjs --compute <ship-record.json>    # print canonical record_hash
//
// Output (verify): {"verdict":"<enum>", ...} on stdout.
//   verdict enum: attested | unattested | stale | malformed
//   exit: 0 = attested | unattested (valid, computed states)
//         2 = malformed (attestation present but shape-invalid)
//         3 = stale     (attestation present, hash mismatch — record edited after attestation)
//         1 = usage / file-missing / parse error (fail-closed — never a silent pass)
// Output (--compute): the 64-hex record_hash on stdout, exit 0; exit 1 on any error.

import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";

// --- shape constants (the enum/regex floor; mirror pharn/pharn-contracts/ship-record.md — P4) ---
const BY_RE = /^[A-Za-z0-9._@-]{1,64}$/; // single-line bounded handle (fix F2)
const AT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/; // ISO-8601

// 7.3.0 (loop-record-honesty — review finding "check-attestation accepts `by: agent` and an impossible date"). A
// PLACEHOLDER DENY-LIST, compared after lower-casing, exact match only: agent names and stand-in words an agent
// self-filling the field would type. It is NOT identity verification — any real-looking name a model types still
// passes, and that a real human supplied `by` stays advisory (pharn/pharn-contracts/ship-record.md). Wildcards
// (`*-bot`, `claude-*`) are deliberately absent: a pattern the floor cannot justify member by member would be a
// heuristic dressed as a check (P0).
const RESERVED_BY = Object.freeze([
  "agent",
  "ai",
  "anonymous",
  "assistant",
  "bot",
  "claude",
  "human",
  "llm",
  "model",
  "none",
  "null",
  "pharn",
  "system",
  "unknown",
  "user",
]);

/** Is `by` a reserved placeholder? Runs only after BY_RE accepted it (L14), so the string is a clean bounded line. */
function reservedHandle(by) {
  return RESERVED_BY.includes(by.toLowerCase());
}

/**
 * Does `at` (already matching AT_RE — L14: the shape test stays the precondition) name a real instant? Month 01–12,
 * day within that month (Gregorian leap years), hour 00–23, minute and second 00–59, offset hours 00–23 and minutes
 * 00–59. A leap second (`:60`) is refused on purpose: JavaScript's Date cannot represent it, and an attestation timed
 * to one is not worth an exception the rest of the toolchain could not read back. Pure arithmetic over the captured
 * digits; total over any string (L62).
 */
function realInstant(at) {
  const m = AT_RE.exec(at);
  if (m === null) return false;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59 || s > 59) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (d > days) return false;
  if (m[8] !== "Z" && (Number(m[9]) > 23 || Number(m[10]) > 59)) return false;
  return true;
}
const HASH_RE = /^[0-9a-f]{64}$/;
const ATTESTATION_KEYS = ["at", "by", "record_hash"]; // EXACTLY these three (sorted) — no smuggling

function fail(msg) {
  process.stderr.write("check-attestation: " + msg + "\n");
  process.exit(1);
}

// Canonical JSON (fix F1 — the ONE implementation): recursively key-sorted objects, arrays in order,
// compact separators, standard scalar encoding. Deterministic over the same value on any platform.
function canonicalJSON(v) {
  if (Array.isArray(v)) return "[" + v.map(canonicalJSON).join(",") + "]";
  if (v && typeof v === "object") {
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonicalJSON(v[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(v); // string | number | boolean | null
}

// record_hash = sha256(canonicalJSON(record without the `attestation` key)). Pure — the shared primitive.
function computeRecordHash(record) {
  const { attestation, ...rest } = record; // exclude the attestation block
  void attestation;
  return createHash("sha256").update(canonicalJSON(rest), "utf8").digest("hex");
}

// Read + JSON-parse a ship-record file; fail-closed (exit 1) on missing / non-file / unparseable / non-object.
function readRecord(path) {
  if (!path) fail("missing <ship-record.json> path");
  if (!existsSync(path) || !statSync(path).isFile()) fail(`ship-record not found (or not a file): ${path}`);
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    fail(`cannot read ${path}: ${e.message}`);
  }
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    fail(`invalid JSON in ${path}: ${e.message}`);
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) fail(`ship-record must be a JSON object: ${path}`);
  return obj;
}

// Shape-check the attestation block against the enum/regex table. Returns true iff well-shaped.
function attestationWellShaped(a) {
  if (!a || typeof a !== "object" || Array.isArray(a)) return false;
  const keys = Object.keys(a).sort();
  if (keys.length !== ATTESTATION_KEYS.length || !keys.every((k, i) => k === ATTESTATION_KEYS[i])) return false;
  return (
    typeof a.by === "string" &&
    BY_RE.test(a.by) &&
    !reservedHandle(a.by) &&
    typeof a.at === "string" &&
    AT_RE.test(a.at) &&
    realInstant(a.at) &&
    typeof a.record_hash === "string" &&
    HASH_RE.test(a.record_hash)
  );
}

function emit(verdict, extra) {
  process.stdout.write(JSON.stringify({ verdict, ...extra }) + "\n");
}

// --- entry ---
const args = process.argv.slice(2);
const computeMode = args[0] === "--compute";
const recordPath = computeMode ? args[1] : args[0];

const record = readRecord(recordPath);

if (computeMode) {
  process.stdout.write(computeRecordHash(record) + "\n");
  process.exit(0);
}

// verify mode
if (!Object.hasOwn(record, "attestation")) {
  emit("unattested", {});
  process.exit(0);
}

const a = record.attestation;
if (!attestationWellShaped(a)) {
  emit("malformed", {});
  process.exit(2);
}

const expected = computeRecordHash(record);
if (a.record_hash !== expected) {
  emit("stale", { expected });
  process.exit(3);
}

emit("attested", { by: a.by });
process.exit(0);
