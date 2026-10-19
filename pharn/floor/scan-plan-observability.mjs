#!/usr/bin/env node
// pharn/floor/scan-plan-observability.mjs — deterministic observability-VOCABULARY presence scanner over a
// plan file (CONSTITUTION P0/P5).
//
// Answers ONE structural question for the observability griller's FLOOR sub-check: which lines of the plan
// TEXT contain an observability-vocabulary token — logging, metrics, tracing/spans, monitoring, telemetry,
// alerting, dashboards, instrumentation, "observability" itself, or SLO/SLI? Detection is a FIXED,
// word-boundary-anchored REGEX SET over the file's lines — non-LLM, no judgment. It reduces to
// ARCHITECTURE §2 primitive #3 (regex / enum check). MIRRORS the fail-closed contract + shape of
// pharn/floor/scan-plan-secrets.mjs (cite, don't restate — P4).
//
// HONEST BOUND (P0 — the crux; this is why the observability griller is a PARTIAL floor, not security's):
// this detects a vocabulary TOKEN's PRESENCE + line. It does NOT decide (a) that the plan NEEDS
// observability — "operationally significant" is judgment; (b) that a present token is REAL / ADEQUATE /
// for what the plan builds vs incidental, hollow, or injected; (c) that the plan "is observable". "Detected
// an observability-vocabulary token" is a real, deterministic datum; "the plan is observable" is not.
//
// POLARITY IS INVERTED vs scan-plan-secrets, AND THAT MATTERS (P0). A secret's PRESENCE is the concern, so
// scan-plan-secrets' hit FIRES a suppression-immune FLOOR finding. Here the concern is ABSENCE, so a hit is
// GOOD and *suppresses* a concern — which means a needle CAN flip `mentions:true` (an injected
// "metrics+tracing covered" comment genuinely contains those tokens). Therefore this scanner is NOT
// injection-immune in the direction that matters, and the observability griller treats its output as
// ADVISORY token-presence EVIDENCE (deterministic line numbers + a presence/absence datum) — NEVER a
// floor-gate or a suppressor. Dressing this launderable "present" verdict as floor would be the exact
// disease P0 forbids (the error-handling griller rejects precisely that). See observability.md's guarantee
// audit for the full reconciliation.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of pharn/floor/scan-plan-secrets.mjs:
// a missing / non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "no mentions".
//
// Usage:  node pharn/floor/scan-plan-observability.mjs <plan-file>
// Output: {"mentions":<bool>,"hits":[{"line":<int>,"term":"<term-kind>"},...]} on stdout; exit 0 on a
//         successful scan (whatever the result). `mentions` === (hits.length > 0); hits sorted by line, then
//         term. Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).

import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";

const TARGET = process.argv[2];

/** Report an error on stderr and return the exit code; `main` returns it, so nothing reaches stdout. */
function fail(msg) {
  process.stderr.write("scan-plan-observability: " + msg + "\n");
  return 1;
}

// The fixed observability-vocabulary set. Each entry is a deterministic, WORD-BOUNDARY-anchored regex + a
// stable `term` label. Adding or removing a term is the ONLY axis of change here (P3). Word boundaries keep
// high-signal: `\blog...\b` does not fire inside "changelog" / "login" / "blog" / "catalog" / "dialog", and
// `\btrac(e|es|ing)\b` does not fire inside "traceback" / "retrace" (proven by the ★ false-positive tests).
// This is a vocabulary PRESENCE detector, NOT an adequacy judge (see HONEST BOUND above).
const TERMS = [
  { term: "logging", re: /\blog(?:s|ging|ged|ger|line)?\b/i },
  { term: "metrics", re: /\bmetrics?\b/i },
  { term: "tracing", re: /\btrac(?:e|es|ing)\b/i },
  { term: "spans", re: /\bspans?\b/i },
  { term: "monitoring", re: /\bmonitor(?:s|ing|ed)?\b/i },
  { term: "telemetry", re: /\btelemetry\b/i },
  { term: "alerting", re: /\balert(?:s|ing|ed)?\b/i },
  { term: "dashboard", re: /\bdashboards?\b/i },
  { term: "instrumentation", re: /\binstrument(?:s|ing|ed|ation)?\b/i },
  { term: "observability", re: /\bobservab(?:ility|le)\b/i },
  { term: "slo-sli", re: /\bSL[OI]s?\b/ },
];

function main() {
  if (!TARGET) return fail("usage: scan-plan-observability.mjs <plan-file>");
  // Fail-closed (P5): a missing / non-file target is an ERROR, never a silent empty (= "no mentions") result.
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
    for (const { term, re } of TERMS) {
      if (re.test(lines[i])) hits.push({ line: i + 1, term });
    }
  }
  // Deterministic order: by line, then by term (a line matching >1 term yields >1 hit, stably ordered).
  hits.sort((a, b) => a.line - b.line || a.term.localeCompare(b.term));

  process.stdout.write(JSON.stringify({ mentions: hits.length > 0, hits }) + "\n");
  return 0;
}

// THE FLUSH RULE (6.20.4; this CLI since 6.67.1, TST-5): the exit code is SET and the process ends naturally, after
// Node has drained stdout — grill-scan.mjs JSON.parses this document through spawnSync, and an immediate exit
// dropped queued writes past a pipe's 64 KiB buffer on darwin. pharn/floor/cli-stdout-flush.test.mjs pins it.
process.exitCode = main();
