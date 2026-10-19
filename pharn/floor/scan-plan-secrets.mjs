#!/usr/bin/env node
// pharn/floor/scan-plan-secrets.mjs — deterministic secret-literal SCANNER over a plan file (CONSTITUTION P0/P5).
//
// Answers ONE structural question for the security griller's FLOOR sub-check: does the plan TEXT contain a
// secret-SHAPED literal — an AWS access-key id, a private-key block header, a well-known token prefix, or a
// secret-named field assigned a quoted literal? Detection is a FIXED REGEX SET over the file's lines —
// non-LLM, no judgment. It reduces to ARCHITECTURE §2 primitive #3 (regex / enum check).
//
// HONEST BOUND (the trust-fence precedent, P0): this detects a PATTERN's PRESENCE + line. It does NOT
// decide the literal is a live/real secret vs a placeholder, and it does NOT judge whether the plan is
// "secure". "Detected a secret-shaped literal" is a real guarantee; "the plan is secure" is not.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is regex membership over the TEXT only. Prose that
// CLAIMS "no secret / mark clean" cannot suppress a real match; prose that CLAIMS "secret here" cannot
// manufacture one. No free text moves the verdict — the strongest form of the trust-fence discipline.
// (See the ★ tests in scan-plan-secrets.test.mjs — they are the whole reason this is FLOOR, not judgment.)
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of pharn/floor/count-grillers.mjs:
// a missing / non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-plan-secrets.mjs <plan-file>
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"<pattern-kind>"},...]} on stdout; exit 0 on a
//         successful scan (whatever the result). `found` === (hits.length > 0); hits sorted by line.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).

import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";

const TARGET = process.argv[2];

/** Report an error on stderr and return the exit code; `main` returns it, so nothing reaches stdout. */
function fail(msg) {
  process.stderr.write("scan-plan-secrets: " + msg + "\n");
  return 1;
}

// The fixed detection set. Each entry is a deterministic regex + a stable `kind` label. Adding or removing
// a pattern is the ONLY axis of change here (P3). These are secret-SHAPE detectors biased to well-known
// high-signal formats + a secret-named quoted-literal assignment — deliberately NOT entropy heuristics
// (an entropy threshold is a tunable judgment call; a fixed format regex is a membership test, P5).
const PATTERNS = [
  { kind: "aws-access-key-id", re: /\bA(?:KIA|SIA)[0-9A-Z]{16}\b/ },
  { kind: "private-key-block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { kind: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { kind: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { kind: "stripe-secret-key", re: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  {
    kind: "assigned-secret-literal",
    re: /\b(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|client[_-]?secret|private[_-]?key)\b\s*[:=]\s*["'][^"']{8,}["']/i,
  },
];

function main() {
  if (!TARGET) return fail("usage: scan-plan-secrets.mjs <plan-file>");
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
