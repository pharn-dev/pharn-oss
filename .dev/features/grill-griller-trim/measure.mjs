// .dev/features/grill-griller-trim/measure.mjs — the measurement behind MEASUREMENTS.md (review finding CTX-1).
//
// Usage: node .dev/features/grill-griller-trim/measure.mjs [repoDir]     (default ".")
//
// Prints JSON with three parts:
//   1. `extract`: griller file bytes vs the bytes pharn/floor/griller-extract.mjs prints (griller text and whole stdout).
//   2. `scannerSelection`: the review's proposed prefilter — skip a scanner-backed griller when its scan-plan-* scanner
//      has no hit — run over every committed PLAN.md under pharn/features/ and .dev/features/.
//   3. `grillEvidence`: for each such plan with a sibling GRILL.md, a heading-heuristic count of griller findings
//      raised under an axis heading whose scanner had NO hit on that plan — the findings the prefilter would have
//      dropped. A LOWER bound: a finding not filed under a heading naming its axis is not counted.
// Read-only: writes nothing.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const repo = resolve(process.argv[2] ?? ".");
const floor = (f) => pathToFileURL(join(repo, "pharn/floor", f)).href;
const { runScans } = await import(floor("grill-scan.mjs"));
const { extractGrillers, renderExtract } = await import(floor("griller-extract.mjs"));

// 1. The extract.
const run = extractGrillers(repo);
if (!run.ok) throw new Error(run.reason);
const fileBytes = run.entries.reduce((a, e) => a + e.bytes, 0);
const textBytes = run.entries.reduce((a, e) => a + Buffer.byteLength(e.trimmed.text), 0);
const stdoutBytes = Buffer.byteLength(renderExtract(run.entries));
const bytesOf = Object.fromEntries(run.entries.map((e) => [e.path.split("/").at(-2), e.bytes]));

// 2 + 3. Every committed plan.
const plans = [];
for (const base of ["pharn/features", ".dev/features"]) {
  const d = join(repo, base);
  if (!existsSync(d)) continue;
  for (const n of readdirSync(d).sort()) if (existsSync(join(d, n, "PLAN.md"))) plans.push(join(d, n));
}
const AXIS = { security: /security/i, privacy: /privacy/i, i18n: /i18n/i, migrations: /migrations?/i, observability: /observability/i };
const noHit = Object.fromEntries(Object.keys(AXIS).map((g) => [g, 0]));
const evidence = Object.fromEntries(Object.keys(AXIS).map((g) => [g, 0]));
let scanned = 0;
let loaded = 0;
const cg = JSON.parse(spawnSync(process.execPath, [join(repo, "pharn/floor/count-grillers.mjs"), repo], { encoding: "utf8" }).stdout);
const allBytes = cg.grillers.reduce((a, p) => a + Buffer.byteLength(readFileSync(join(repo, p))), 0);
for (const dir of plans) {
  const r = runScans(join(dir, "PLAN.md"));
  if (!r.ok) continue;
  scanned++;
  let bytes = allBytes;
  const grillPath = join(dir, "GRILL.md");
  const grill = existsSync(grillPath) ? readFileSync(grillPath, "utf8") : null;
  const heads = grill ? grill.split("\n").filter((l) => /^#{2,4} /.test(l)) : [];
  for (const { scan, out } of r.results) {
    if (out.hits.length) continue;
    noHit[scan.griller]++;
    bytes -= bytesOf[scan.griller];
    const h = heads.find((l) => AXIS[scan.griller].test(l));
    if (!h) continue;
    const rest = grill.slice(grill.indexOf(h) + h.length);
    const next = rest.search(/\n#{2,4} /);
    if (/type: FINDING/.test(next === -1 ? rest : rest.slice(0, next))) evidence[scan.griller]++;
  }
  loaded += bytes;
}
console.log(
  JSON.stringify(
    {
      extract: { registered: run.entries.length, fileBytes, textBytes, stdoutBytes },
      scannerSelection: { plans: scanned, skippedOnNoHit: noHit, meanBytesLoaded: Math.round(loaded / scanned) },
      grillEvidence: { findingsOnNoHitPlans: evidence, total: Object.values(evidence).reduce((a, b) => a + b, 0) },
    },
    null,
    2
  )
);
