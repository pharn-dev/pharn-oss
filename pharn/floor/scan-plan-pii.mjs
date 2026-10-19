#!/usr/bin/env node
// pharn/floor/scan-plan-pii.mjs — deterministic PII-pattern SCANNER over a plan file (CONSTITUTION P0/P5).
//
// Answers ONE structural question for the privacy griller's FLOOR sub-check: does the plan TEXT contain a
// PII-SHAPED pattern — an email-address literal, a US-SSN literal, or a PII-typed field/column NAME in a
// declaration context (a name like email/ssn/phone/dob followed by a type annotation or a SQL type
// keyword)? Detection is a FIXED REGEX SET over the file's lines — non-LLM, no judgment. It reduces to
// ARCHITECTURE §2 primitive #3 (regex / enum check). It is the closest analog of pharn/floor/scan-plan-secrets.mjs
// and MIRRORS it byte-for-byte in structure (patterns, scan loop, output shape, fail-closed contract).
//
// HONEST BOUND (the secret-scanner precedent, P0): this detects a PATTERN's PRESENCE + line. It does NOT
// decide the value is real PII vs a placeholder/example, and it does NOT judge whether the plan handles
// personal data responsibly (consent / minimization / retention). "Detected a PII-shaped pattern" is a
// real guarantee; "the plan is privacy-compliant" is not. It is biased to well-known high-signal shapes +
// snake_case/SQL-style field declarations — NOT camelCase variants, NOT phone/date LITERALS (those are
// false-positive-prone), NOT entropy heuristics; phone/dob/name/address are covered as field NAMES only.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is regex membership over the TEXT only. Prose that
// CLAIMS "no PII / mark clean" cannot suppress a real match; prose that CLAIMS "PII here" cannot
// manufacture one. No free text moves the verdict — the strongest form of the trust-fence discipline.
// (See the ★ tests in scan-plan-pii.test.mjs — they are the whole reason this is FLOOR, not judgment.)
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of pharn/floor/scan-plan-secrets.mjs:
// a missing / non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-plan-pii.mjs <plan-file>
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"<pattern-kind>"},...]} on stdout; exit 0 on a
//         successful scan (whatever the result). `found` === (hits.length > 0); hits sorted by line.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).

import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";

const TARGET = process.argv[2];

/** Report an error on stderr and return the exit code; `main` returns it, so nothing reaches stdout. */
function fail(msg) {
  process.stderr.write("scan-plan-pii: " + msg + "\n");
  return 1;
}

// The fixed detection set. Each entry is a deterministic regex + a stable `kind` label. Adding or removing
// a pattern is the ONLY axis of change here (P3). These are PII-SHAPE detectors biased to well-known
// high-signal formats (email / US-SSN literals) + a PII-typed field DECLARATION (a name in a type/column
// context, not a bare prose mention) — the analog of scan-plan-secrets.mjs's "well-known literal formats +
// named-field-with-value". The type-keyword requirement on `pii-typed-field` is the "this is a schema
// column, not prose" discipline that keeps false positives low: "send an email" never fires; "email TEXT"
// and "email: string" do. Deliberately NOT phone/date literals (false-positive-prone) — those PII kinds
// are covered as field NAMES below (a membership test, P5), never as loose numeric literals.
const PATTERNS = [
  { kind: "email-literal", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
  { kind: "us-ssn", re: /\b\d{3}-\d{2}-\d{4}\b/ },
  {
    kind: "pii-typed-field",
    re: /\b(?:email|ssn|social_security(?:_number)?|phone(?:_number)?|dob|date_of_birth|birth_date|first_name|last_name|full_name|home_address|street_address|ip_address|passport_number|credit_card(?:_number)?|card_number|medical_record|diagnosis)\b\s*:?\s*\b(?:text|varchar|char|string|str|int|integer|bigint|smallint|numeric|decimal|float|double|real|date|datetime|timestamp|time|boolean|bool|uuid|serial|json|jsonb|blob|bytea)\b/i,
  },
];

function main() {
  if (!TARGET) return fail("usage: scan-plan-pii.mjs <plan-file>");
  // Fail-closed (P5): a missing / non-file target is an ERROR, never a silent empty (= "clean") result.
  // ONE descriptor (the griller-extract.mjs 6.60.1 form, CodeQL js/file-system-race): the type check and the read see
  // the same file, so the path cannot be swapped between them. O_NOFOLLOW refuses a symlink at the final component
  // (ELOOP; since 6.67.1 a symlinked plan is refused, as grill-scan.mjs already refuses one); O_NONBLOCK keeps a FIFO
  // from blocking the open, and fstat then refuses it as not a regular file.
  const notFile = () => fail(`target file not found (or not a regular file): ${TARGET}`);
  let fd;
  try {
    fd = openSync(TARGET, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (e) {
    if (e && ["ENOENT", "ENOTDIR", "ELOOP"].includes(e.code)) return notFile();
    return fail(`could not read target: ${e.message}`);
  }
  let text;
  try {
    if (!fstatSync(fd).isFile()) return notFile();
    text = readFileSync(fd, "utf8");
  } catch (e) {
    return fail(`could not read target: ${e.message}`);
  } finally {
    closeSync(fd);
  }

  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const { kind, re } of PATTERNS) {
      if (re.test(lines[i])) hits.push({ line: i + 1, kind });
    }
  }
  // Deterministic order: by line, then by kind (a line matching >1 pattern yields >1 hit, stably ordered).
  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));

  process.stdout.write(JSON.stringify({ found: hits.length > 0, hits }) + "\n");
  return 0;
}

// THE FLUSH RULE (6.20.4; this CLI since 6.67.1, TST-5): the exit code is SET and the process ends naturally, after
// Node has drained stdout — grill-scan.mjs JSON.parses this document through spawnSync, and an immediate exit
// dropped queued writes past a pipe's 64 KiB buffer on darwin. pharn/floor/cli-stdout-flush.test.mjs pins it.
process.exitCode = main();
