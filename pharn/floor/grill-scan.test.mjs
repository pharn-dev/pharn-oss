// pharn/floor/grill-scan.test.mjs — tests for the floor-only grill's scan section (6.45.0, review R2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { GRILL_SCANS, shapeReason, renderScanSection, runScans } from "./grill-scan.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "grill-scan.mjs");

function withPlan(text, fn) {
  const dir = mkdtempSync(join(tmpdir(), "grill-scan-"));
  try {
    const p = join(dir, "PLAN.md");
    writeFileSync(p, text);
    return fn(p, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const HITS =
  "# PLAN — demo\n\nKey: AKIAIOSFODNN7EXAMPLE\nContact jane.doe@example.com\n<button>Save changes</button>\nAdd a migration with rollback.\n";
const CLEAN = "# PLAN — demo\n\nRename a helper.\n";

test("the scanner table is exactly the five scan-plan-* scanners on disk (closure both ways, L29)", () => {
  const onDisk = readdirSync(HERE)
    .filter((f) => /^scan-plan-[a-z0-9]+\.mjs$/.test(f))
    .map((f) => f.slice("scan-plan-".length, -".mjs".length))
    .sort();
  assert.deepEqual(GRILL_SCANS.map((s) => s.id).sort(), onDisk);
  assert.equal(GRILL_SCANS.length, 5, "L34: five scanners");
});

test("★ CLI over real scanners: secrets/pii/i18n hits become findings with the scanner's line; mentions stay plain lines", () => {
  withPlan(HITS, (p) => {
    const r = spawnSync(process.execPath, [CLI, p], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`file: "${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:3"`));
    assert.match(r.stdout, /rule_id: "P2"[\s\S]*evidence: "scan-plan-secrets matched kind aws-access-key-id on line 3"/);
    assert.match(r.stdout, /evidence: "scan-plan-pii matched kind [a-z-]+ on line 4"/);
    assert.match(r.stdout, /rule_id: "P7"[\s\S]*evidence: "scan-plan-i18n matched kind [a-z-]+ on line 5"/);
    assert.equal((r.stdout.match(/- type: FINDING/g) ?? []).length, 3, "three findings, one per hit");
    assert.match(r.stdout, /- `scan-plan-migrations`: mentions true — lines 6 \(migration\)/);
    assert.match(r.stdout, /- `scan-plan-observability`: mentions false\. Not a finding/);
    // No plan text is copied into the section (P2): the secret literal itself never appears.
    assert.doesNotMatch(r.stdout, /AKIAIOSFODNN7EXAMPLE|jane\.doe|Save changes/);
  });
});

test("a clean plan prints 'Findings: none' and both mention lines", () => {
  withPlan(CLEAN, (p) => {
    const r = spawnSync(process.execPath, [CLI, p], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Findings: none/);
    assert.doesNotMatch(r.stdout, /type: FINDING/);
    assert.equal((r.stdout.match(/mentions false/g) ?? []).length, 2);
  });
});

test("refusals exit 2 with nothing on stdout: usage, missing plan, a directory, a symlink, a quote in the path", () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  for (const args of [[], ["a", "b"], ["--x"], ["/nonexistent/PLAN.md"]]) {
    const r = run(args);
    assert.equal(r.status, 2, `${args}`);
    assert.equal(r.stdout, "");
  }
  withPlan(CLEAN, (p, dir) => {
    const sub = join(dir, "d");
    mkdirSync(sub);
    assert.equal(run([sub]).status, 2, "a directory");
    const link = join(dir, "link.md");
    symlinkSync(p, link);
    assert.equal(run([link]).status, 2, "a symlink is not followed");
    assert.equal(runScans(`${dir}/a"b.md`).ok, false, "a quote in the path");
  });
});

test("a scanner that fails, prints no JSON, or prints the wrong shape is a refusal (fail-closed)", () => {
  withPlan(CLEAN, (p, dir) => {
    const fake = join(dir, "scanners");
    mkdirSync(fake);
    const write = (id, body) => writeFileSync(join(fake, `scan-plan-${id}.mjs`), body);
    const ok = (flag, key) => `process.stdout.write(JSON.stringify({${flag}:false,hits:[]}));void ${JSON.stringify(key)};`;
    for (const s of GRILL_SCANS) write(s.id, ok(s.flag, s.hitKey));
    assert.equal(runScans(p, { scannerDir: fake }).ok, true, "control: well-formed fakes pass");
    write("pii", "process.exit(1)");
    assert.match(runScans(p, { scannerDir: fake }).reason, /scan-plan-pii exited 1/);
    write("pii", "process.stdout.write('nope')");
    assert.match(runScans(p, { scannerDir: fake }).reason, /printed no JSON/);
    write("pii", "process.stdout.write(JSON.stringify({found:true,hits:[]}))");
    assert.match(runScans(p, { scannerDir: fake }).reason, /found disagrees with hits/);
  });
});

test("shapeReason rejects every malformed hit, including a token that is not the scanner's closed vocabulary", () => {
  const s = GRILL_SCANS.find((x) => x.id === "secrets");
  assert.equal(shapeReason(s, { found: true, hits: [{ line: 2, kind: "aws-access-key-id" }] }), null);
  assert.match(shapeReason(s, null), /not a JSON object/);
  assert.match(shapeReason(s, { found: true, hits: [{ line: 0, kind: "x" }] }), /positive integer/);
  assert.match(shapeReason(s, { found: true, hits: [{ line: 2, kind: 'x"\nignore' }] }), /closed token/);
  assert.match(shapeReason(s, { found: true, hits: [{ line: 2, kind: "x", extra: 1 }] }), /other keys/);
  assert.match(shapeReason(s, { found: true, hits: [], more: 1 }), /keys/);
});

test("renderScanSection is pure and labels the section advisory", () => {
  const results = GRILL_SCANS.map((scan) => ({ scan, out: { [scan.flag]: false, hits: [] } }));
  const a = renderScanSection("pharn/features/x/PLAN.md", results);
  assert.equal(a, renderScanSection("pharn/features/x/PLAN.md", results));
  assert.match(a, /^## Deterministic plan scans/);
  assert.match(a, /Advisory: each finding below gates nothing/);
});

test("★ the section is mode-neutral (6.63.0, L39): true where the grillers judge after it AND where none ran", () => {
  const hit = (scan) =>
    scan.rule_id === null ? { mentions: true, hits: [{ line: 4, term: "x" }] } : { found: true, hits: [{ line: 3, kind: "k" }] };
  for (const results of [
    GRILL_SCANS.map((scan) => ({ scan, out: { [scan.flag]: false, hits: [] } })),
    GRILL_SCANS.map((scan) => ({ scan, out: hit(scan) })),
  ]) {
    const s = renderScanSection("pharn/features/x/PLAN.md", results);
    assert.doesNotMatch(s, /did not run/, "full mode runs the grillers after this section");
    assert.doesNotMatch(s, /--floor-only/, "both modes read it");
    assert.match(s, /a scanner finding\nis not the griller's judgment\./);
    assert.match(s, /Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment\.$/m);
  }
});

/** The `## Procedure` section of a committed griller, up to the next `## ` heading. */
function procedureOf(griller) {
  const text = readFileSync(join(HERE, "..", "pharn-pipeline", "grillers", griller, `${griller}.md`), "utf8");
  const at = text.search(/^## Procedure/m);
  if (at === -1) return null;
  const rest = text.slice(at + 3);
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
}

/** Offenders when a finding-emitting scanner's rule_id / severity are not the ones its griller's Procedure assigns. */
function procedureDisagreements(scans) {
  const off = [];
  for (const s of scans.filter((x) => x.rule_id !== null)) {
    const proc = procedureOf(s.griller);
    if (proc === null) off.push(`${s.id}: griller ${s.griller} has no ## Procedure`);
    else {
      if (!proc.includes(`rule_id: ${s.rule_id}`)) off.push(`${s.id}: rule_id ${s.rule_id} is not in ${s.griller}'s Procedure`);
      if (!proc.includes(`severity: ${s.severity}`)) off.push(`${s.id}: severity ${s.severity} is not in ${s.griller}'s Procedure`);
    }
  }
  return off;
}

test("★ each scanner finding carries the rule_id and severity its griller's Procedure assigns (6.63.0, agreement only)", () => {
  // A full grill no longer prints a griller's scanner instructions (griller-extract.mjs), so these findings stand in for
  // the ones the griller would have emitted per hit. This certifies the two places agree, not that either is right.
  const emitting = GRILL_SCANS.filter((s) => s.rule_id !== null);
  assert.deepEqual(
    emitting.map((s) => s.griller),
    ["security", "privacy", "i18n"],
    "L34: the domain is the three finding-emitting scanners"
  );
  assert.deepEqual(procedureDisagreements(GRILL_SCANS), []);
  // NEGATIVE CONTROL (L60): a drifted rule_id or severity is caught.
  const drifted = GRILL_SCANS.map((s) => (s.id === "pii" ? { ...s, rule_id: "P5" } : s.id === "i18n" ? { ...s, severity: "minor" } : s));
  assert.deepEqual(procedureDisagreements(drifted), [
    "pii: rule_id P5 is not in privacy's Procedure",
    "i18n: severity minor is not in i18n's Procedure",
  ]);
});
