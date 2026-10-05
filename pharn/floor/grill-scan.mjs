#!/usr/bin/env node
// pharn/floor/grill-scan.mjs — run the five deterministic `scan-plan-*` scanners over ONE plan and print the scan
// section `/pharn-grill --floor-only` copies into GRILL.md (6.45.0, front-grill-concurrent, review R2).
//
// WHY (P7): /pharn-loop's grill became floor-only in 6.45.0 (pharn/floor/stage-agent-core.mjs, header). Dropping the
// grill AGENT dropped the model-driven grillers and the interrogation; the five `scan-plan-*` scanners those grillers
// run are deterministic and cost no model request, so the floor-only grill keeps them. The orchestrating model, under
// the maintainer's delegation, decided this at the review of `cfb7158`. Quick mode (`--quick`) does not call this.
//
// WHAT IT DOES. Spawns each scanner as its griller invokes it (`node pharn/floor/scan-plan-<x>.mjs <PLAN.md>`, no
// LLM), validates each output's closed shape, and prints ONE markdown section on stdout:
//   - secrets (security griller), pii (privacy griller), i18n (i18n griller): every hit becomes one finding-shape
//     object — `type: FINDING`, the griller's own `rule_id` and `severity`, `file` = `<plan>:<line>` from the
//     scanner, and a FIXED `problem` / `evidence` naming the scanner and its closed `kind`. No plan text is copied.
//   - migrations, observability: these scanners report MENTIONS, and a finding from them needs the griller's
//     judgment (is a migration / telemetry needed, is it adequate), which does not run here. So their result is
//     printed as a plain line (mentions true/false and the lines), never as a finding.
//
// FLOOR: each scanner's verdict (a fixed regex set — primitive #3) and this module's shape checks. ADVISORY: every
// finding (grillers never gate, fix #3), that the model copies stdout into GRILL.md verbatim, and that it ran at all.
// NOT A CLAIM: "the plan is secure / private / localized / reversible / observable". The scanners detect a pattern's
// presence on a line; the judgment half of each griller did not run.
//
// Exit: 0 the section on stdout · 2 refusal (usage, an unreadable plan, a scanner that failed or printed an
// unexpected shape) — the reason on stderr, NOTHING on stdout, so a partial section is never printed.

import { spawnSync } from "node:child_process";
import { lstatSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The closed scanner table, in the order the section prints them. */
export const GRILL_SCANS = Object.freeze([
  Object.freeze({
    id: "secrets",
    griller: "security",
    flag: "found",
    hitKey: "kind",
    rule_id: "P2",
    severity: "important",
    problem: "a secret-shaped literal appears in the plan",
  }),
  Object.freeze({
    id: "pii",
    griller: "privacy",
    flag: "found",
    hitKey: "kind",
    rule_id: "P2",
    severity: "important",
    problem: "a PII-shaped pattern appears in the plan",
  }),
  Object.freeze({
    id: "i18n",
    griller: "i18n",
    flag: "found",
    hitKey: "kind",
    rule_id: "P7",
    severity: "important",
    problem: "a hardcoded user-facing string appears in the plan",
  }),
  Object.freeze({
    id: "migrations",
    griller: "migrations",
    flag: "mentions",
    hitKey: "term",
    rule_id: null,
    severity: null,
    problem: null,
  }),
  Object.freeze({
    id: "observability",
    griller: "observability",
    flag: "mentions",
    hitKey: "term",
    rule_id: null,
    severity: null,
    problem: null,
  }),
]);

/** A scanner's closed token (`kind` / `term`): its own fixed vocabulary, never plan text. */
const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,39}$/;

/** Validate one scanner's parsed output against its closed shape. Returns null when well-formed, else a reason. */
export function shapeReason(scan, out) {
  if (out === null || typeof out !== "object" || Array.isArray(out)) return "not a JSON object";
  const keys = Object.keys(out).sort();
  if (JSON.stringify(keys) !== JSON.stringify([scan.flag, "hits"].sort())) return `keys ${keys.join(",")}`;
  if (typeof out[scan.flag] !== "boolean") return `${scan.flag} is not a boolean`;
  if (!Array.isArray(out.hits)) return "hits is not an array";
  for (const h of out.hits) {
    if (h === null || typeof h !== "object" || Array.isArray(h)) return "a hit is not an object";
    if (JSON.stringify(Object.keys(h).sort()) !== JSON.stringify([scan.hitKey, "line"].sort())) return "a hit has other keys";
    if (!Number.isInteger(h.line) || h.line < 1) return "a hit line is not a positive integer";
    if (typeof h[scan.hitKey] !== "string" || !TOKEN_RE.test(h[scan.hitKey])) return `a hit ${scan.hitKey} is not a closed token`;
  }
  if (out[scan.flag] !== out.hits.length > 0) return `${scan.flag} disagrees with hits`;
  return null;
}

/** Render the section from validated results (`[{scan, out}]`, GRILL_SCANS order). Pure. */
export function renderScanSection(planPath, results) {
  const lines = ["## Deterministic plan scans (`--floor-only`, `pharn/floor/grill-scan.mjs`)", ""];
  lines.push(
    "Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; the grillers'",
    "judgment and the plan interrogation did not run."
  );
  const findings = [];
  for (const { scan, out } of results) {
    if (scan.rule_id === null) continue;
    for (const h of out.hits) findings.push({ scan, h });
  }
  lines.push("");
  if (findings.length === 0) lines.push("Findings: none (no secrets, PII or i18n scanner hit).");
  else {
    lines.push("```yaml");
    for (const { scan, h } of findings) {
      lines.push(
        "- type: FINDING",
        `  rule_id: "${scan.rule_id}"`,
        `  severity: ${scan.severity}`,
        `  file: "${planPath}:${h.line}"`,
        `  problem: "${scan.problem} (scan-plan-${scan.id}, ${scan.griller} griller's deterministic half)"`,
        `  evidence: "scan-plan-${scan.id} matched kind ${h.kind} on line ${h.line}"`
      );
    }
    lines.push("```");
  }
  lines.push("");
  for (const { scan, out } of results) {
    if (scan.rule_id !== null) continue;
    const at = out.hits.map((h) => `${h.line} (${h.term})`).join(", ");
    lines.push(
      `- \`scan-plan-${scan.id}\`: mentions ${out.mentions}${at ? ` — lines ${at}` : ""}. Not a finding: whether the plan needs or adequately declares this is the ${scan.griller} griller's judgment, which did not run.`
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Spawn every scanner over `planPath`. Returns {ok:true, results} or {ok:false, reason}. */
export function runScans(planPath, { scannerDir = HERE } = {}) {
  // The path is printed inside a quoted YAML scalar, so a quote, a backslash or a control character is refused.
  const unsafe = typeof planPath !== "string" || [...planPath].some((c) => c === '"' || c === "\\" || c.charCodeAt(0) < 0x20);
  if (unsafe || planPath === "") {
    return { ok: false, reason: "plan path is empty or holds a quote, backslash or control character" };
  }
  let st;
  try {
    st = lstatSync(planPath);
  } catch {
    return { ok: false, reason: `plan not found: ${planPath}` };
  }
  if (!st.isFile()) return { ok: false, reason: `plan is not a regular file: ${planPath}` };
  const results = [];
  for (const scan of GRILL_SCANS) {
    const r = spawnSync(process.execPath, [join(scannerDir, `scan-plan-${scan.id}.mjs`), planPath], { encoding: "utf8" });
    if (r.status !== 0) return { ok: false, reason: `scan-plan-${scan.id} exited ${r.status}` };
    let out;
    try {
      out = JSON.parse(r.stdout);
    } catch {
      return { ok: false, reason: `scan-plan-${scan.id} printed no JSON` };
    }
    const why = shapeReason(scan, out);
    if (why) return { ok: false, reason: `scan-plan-${scan.id} output refused: ${why}` };
    results.push({ scan, out });
  }
  return { ok: true, results };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0].startsWith("-")) {
    process.stderr.write("usage: node pharn/floor/grill-scan.mjs <PLAN.md>\n");
    process.exitCode = 2;
  } else {
    const run = runScans(args[0]);
    if (!run.ok) {
      process.stderr.write(`grill-scan: ${run.reason}\n`);
      process.exitCode = 2;
    } else process.stdout.write(renderScanSection(args[0], run.results));
  }
}
