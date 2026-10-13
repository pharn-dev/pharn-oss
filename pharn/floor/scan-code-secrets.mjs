#!/usr/bin/env node
// pharn/floor/scan-code-secrets.mjs — deterministic secret-literal SCANNER over a CODE file (CONSTITUTION P0/P5).
//
// The CODE-side twin of pharn/floor/scan-plan-secrets.mjs. Where that scanner backs the security GRILLER's
// FLOOR sub-check over a PLAN, this one backs the `secrets-in-code` LENS's FLOOR sub-check over CODE under
// review (pharn-review/secrets-in-code/). Same question, different target: does the CODE TEXT contain a
// secret-SHAPED literal — an AWS access-key id, a private-key block header, a well-known token prefix, or a
// secret-named field assigned a quoted literal? Detection is a FIXED REGEX SET over the file's lines —
// non-LLM, no judgment. It reduces to ARCHITECTURE §2 primitive #3 (regex / enum check).
//
// HONEST BOUND (the trust-fence precedent, P0): this detects a PATTERN's PRESENCE + line. It does NOT
// decide the literal is a live/real secret vs a placeholder, and it does NOT judge whether the code is
// "secret-free". "Detected a secret-shaped literal" is a real guarantee; "the code has no secrets" is not.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2): the verdict is regex membership over the TEXT only. A code comment
// that CLAIMS "not a secret / ignore / mark clean" cannot suppress a real match; a comment that CLAIMS
// "secret here" cannot manufacture one. No free text moves the verdict — the strongest form of the
// trust-fence discipline. (See the ★ tests in scan-code-secrets.test.mjs — they are the whole reason this
// is FLOOR, not judgment.)
//
// Per-file by contract: every verdict is about ONE file's text, mirroring scan-plan-secrets.mjs's <plan-file>
// arg. The scanner takes one `<code-file>`, or many through `--files` (review-fanout) — the batch mode
// `/pharn-review`'s prefilter spawns once per review — and the verdict for each file is the same either way
// (pharn/floor/code-scanner-cli.mjs owns both modes). A cross-file / directory sweep is a FUTURE increment.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of pharn/floor/scan-plan-secrets.mjs:
// a missing / non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-code-secrets.mjs <code-file>
//         node pharn/floor/scan-code-secrets.mjs --files <nul-separated-list | ->
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"<pattern-kind>"},...]} on stdout; exit 0 on a
//         successful scan (whatever the result). `found` === (hits.length > 0); hits sorted by line.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).
//         With --files: one {"results":[…]} document, one entry per listed path (code-scanner-cli.mjs).

import "./runtime-floor.mjs";
import { runScannerCli } from "./code-scanner-cli.mjs";

// The fixed detection set — secret-SHAPE detectors biased to well-known high-signal formats + a
// secret-named quoted-literal assignment, deliberately NOT entropy heuristics (an entropy threshold is a
// tunable judgment call; a fixed format regex is a membership test, P5). Adding or removing a pattern is
// the ONLY axis of change here (P3).
//
// NOTE (accepted duplication, ratified at GATE-1, deferred P7): this PATTERNS set is identical to
// scan-plan-secrets.mjs's. Consolidating both into one shared scanner would touch the existing security
// griller's citations + tests (a separate axis) — deferred, not done speculatively here.
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

/** The hits for one file's text. Keeps nothing between calls: no PATTERNS regex carries a `g`/`y` flag. */
export function scanText(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const { kind, re } of PATTERNS) {
      if (re.test(lines[i])) hits.push({ line: i + 1, kind });
    }
  }
  // Deterministic order: by line, then by kind (a line matching >1 pattern yields >1 hit, stably ordered).
  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

if (import.meta.main) process.exitCode = runScannerCli("scan-code-secrets", scanText, process.argv.slice(2));
