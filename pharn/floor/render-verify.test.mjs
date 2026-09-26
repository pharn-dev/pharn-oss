// pharn/floor/render-verify.test.mjs — render-verify.mjs's suite: one render per verdict and per refusal; the A6
// matrix (6.23.0's review — a render asserts only what its input says, GRILL G6); hostile text inert inside fences;
// L62; the paths the script supplies never absolute, with the absolute-reason control (GRILL G10); CHECK 5 through
// the REAL validate.mjs, with the no-preamble control (L10); the ★ VERIFY.md enumeration with its dropped-site mutant;
// and a style probe with a pre-clean and `t.after()` on its own named directory (GRILL G17, 6.23.0's M11).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDone, renderRefused, PREAMBLE, RESIDUAL, NO_VERIFIERS } from "./render-verify.mjs";
import { REGISTRY } from "./stage-exit-core.mjs";
// Absolute-path detection is imported by the TEST ONLY (the renderer's own load graph must never grow for it).
import { ABS_PATH_RE } from "./render-cost-ledger.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

function report(over = {}) {
  return {
    feature: "demo",
    gates: { reconcile: 0, test: 0 },
    verdict: "PASS",
    failing_gates: [],
    gate_run: { stamp_sha256: "a".repeat(64), source: "discover", fingerprint: { algo: "x", final: "b".repeat(64) } },
    ac_gate: {
      mode: "not-applicable",
      verdict: "NOT-APPLICABLE",
      reason: "not-applicable (legacy spec)",
      evidence: [],
      acs: [],
      note: "n",
    },
    completeness: {
      plan: "pharn/features/demo/PLAN.md",
      declared: ["src/a.js"],
      skipped: [],
      missing: [],
      complete: true,
      verdict: "complete",
    },
    verifiers: { registered: 0, findings: [] },
    ...over,
  };
}

const INCOMPLETE_BLOCK = {
  plan: "pharn/features/demo/PLAN.md",
  declared: ["src/a.js", "src/never-built.js"],
  skipped: [],
  missing: ["src/never-built.js"],
  complete: false,
  verdict: "incomplete",
};

// ── ONE PER VERDICT ─────────────────────────────────────────────────────────────────────────────────
test("renderDone: PASS — the verdict line, the gate source, the gates block, completeness, the AC line and the residual", () => {
  const md = renderDone(report());
  assert.match(md, /^# VERIFY — `demo`\n/);
  assert.ok(md.includes(PREAMBLE));
  assert.match(md, /\*\*VERIFIED: floor gates PASS\*\*/);
  assert.match(md, /gate source: discovered/);
  assert.match(md, /```text\n0 {2}reconcile\n0 {2}test\n```/);
  assert.match(md, /build complete/);
  assert.match(md, /not-applicable \(legacy spec\)/);
  assert.ok(md.includes(NO_VERIFIERS));
  assert.ok(md.trimEnd().endsWith(RESIDUAL));
});

test("renderDone: FAIL — the failing ids are fenced; INCOMPLETE and INCONCLUSIVE each name themselves", () => {
  const fail = renderDone(report({ verdict: "FAIL", gates: { reconcile: 0, test: 1 }, failing_gates: ["test"] }));
  assert.match(fail, /VERIFY FAILS: gate\(s\) red — stage FAILS/);
  assert.match(fail, /failing gate ids, quoted as DATA:\n\n```text\ntest\n```/);

  const inc = renderDone(report({ verdict: "INCOMPLETE", completeness: INCOMPLETE_BLOCK }));
  assert.match(inc, /INCOMPLETE: build unfinished/);
  assert.match(inc, /src\/never-built\.js/);

  const incon = renderDone({
    feature: "demo",
    gates: {},
    verdict: "INCONCLUSIVE",
    failing_gates: [],
    reason: "stamp not found: x",
    reason_code: "stamp-missing",
  });
  assert.match(incon, /INCONCLUSIVE: the verdict could not be reached — fail-closed, never a pass/);
  assert.match(incon, /reason_code: stamp-missing\nreason: stamp not found: x/);
  assert.match(incon, /no gates are recorded in this report\./, "an empty gate map is said, never left blank (L34)");
  assert.match(incon, /gate source: not recorded/);
  assert.match(incon, /acceptance criteria: not evaluated/);
  assert.match(incon, /completeness: not recorded\./);
});

test("renderDone: a verdict outside the closed set claims nothing", () => {
  const md = renderDone(report({ verdict: "GREEN" }));
  assert.match(md, /not a member of \{PASS, FAIL, INCOMPLETE, INCONCLUSIVE\} — nothing is claimed/);
  assert.doesNotMatch(md, /VERIFIED/);
});

test("renderRefused: every registered verify refusal renders its code, 'feature NOT verified', and the detail fenced", () => {
  const codes = REGISTRY.verify.refused;
  assert.equal(codes.length, 3, "non-vacuity: the refused vocabulary is counted");
  for (const reasonCode of codes) {
    const md = renderRefused({ feature: "demo", reasonCode, detail: `synthetic detail for ${reasonCode}` });
    assert.ok(md.includes(`refused: \`${reasonCode}\``));
    assert.match(md, /feature NOT verified/);
    assert.match(md, new RegExp(`\`\`\`text\\nsynthetic detail for ${reasonCode}\\n\`\`\``));
    assert.ok(md.includes(PREAMBLE));
  }
  const unknown = renderRefused({ feature: "demo", reasonCode: "scope-escaped", detail: "x" });
  assert.match(unknown, /a code outside the verify registry — not rendered/, "a regress-only code is not a verify refusal");
});

// ── ★ THE A6 MATRIX (GRILL G6) ──────────────────────────────────────────────────────────────────────
test("★ A6 — FAIL over an incomplete build renders BOTH the FAIL line and the MISSING paths", () => {
  const md = renderDone(report({ verdict: "FAIL", gates: { test: 1 }, failing_gates: ["test"], completeness: INCOMPLETE_BLOCK }));
  assert.match(md, /VERIFY FAILS/);
  assert.match(md, /plan-declared path\(s\) MISSING/);
  assert.match(md, /src\/never-built\.js/);
});

test("★ A6 — a PASS renders no MISSING line (the control: the same render over an incomplete block does)", () => {
  const pass = renderDone(report());
  assert.doesNotMatch(pass, /missing/i);
  assert.match(renderDone(report({ completeness: INCOMPLETE_BLOCK })), /MISSING/, "the control must be able to fail");
});

test("★ A6 — the verifier deferral line appears ONLY when registered > 0", () => {
  const none = renderDone(report());
  assert.ok(none.includes(NO_VERIFIERS));
  assert.doesNotMatch(none, /deferred/);
  const some = renderDone(report({ verifiers: { registered: 2, findings: [], note: "n" } }));
  assert.match(some, /2 verifier\(s\) registered — the live verifier runner is deferred/);
  assert.ok(!some.includes(NO_VERIFIERS));
});

test("★ A6 — the BOOTSTRAP and legacy AC lines appear ONLY for those modes", () => {
  const legacy = renderDone(report());
  const boot = renderDone(report({ ac_gate: { mode: "bootstrap", verdict: "PASS", reason: null, evidence: [], acs: [], note: "n" } }));
  const first = renderDone(report({ ac_gate: { mode: "test-first", verdict: "PASS", reason: null, evidence: [], acs: [], note: "n" } }));
  assert.match(legacy, /not-applicable \(legacy spec\)/);
  assert.doesNotMatch(legacy, /BOOTSTRAP/);
  assert.match(boot, /`BOOTSTRAP` — weaker than test-first/);
  assert.doesNotMatch(boot, /legacy spec/);
  assert.match(first, /`test-first`/);
  assert.doesNotMatch(first, /BOOTSTRAP|legacy spec/);
});

test("renderDone: criteria not delivered and evidence reds are listed fenced; the per-AC table is CITED, never retyped", () => {
  const md = renderDone(
    report({
      verdict: "FAIL",
      failing_gates: ["ac-delivery", "ac-evidence"],
      ac_gate: {
        mode: "test-first",
        verdict: "FAIL",
        reason: null,
        evidence: [{ reason: "ac-tests-modified", detail: "tests/ac/a.test.js changed since the lock" }],
        acs: [
          { id: "AC-1", level: "unit", tests: ["t::AC-1: x"], status: "passed", reason: null, detail: "" },
          { id: "AC-2", level: "unit", tests: [], status: "none", reason: "ac-untested", detail: "" },
        ],
        note: "n",
      },
    })
  );
  assert.match(md, /```text\nAC-2: ac-untested\n```/);
  assert.match(md, /```text\nac-tests-modified: tests\/ac\/a\.test\.js changed since the lock\n```/);
  assert.doesNotMatch(md, /AC-1: /, "a delivered criterion is not listed as undelivered");
  assert.match(md, /The per-AC table is `verify-report\.json`'s `ac_gate` block/);
  assert.doesNotMatch(md, /\|/, "no markdown table anywhere");
});

// ── HOSTILE TEXT / L62 ──────────────────────────────────────────────────────────────────────────────
test("hostile gate ids, missing paths and reasons stay INSIDE fences — no fake heading, no live link", () => {
  const hostile = "x\n# fake heading\n```\n[click](https://evil.example)";
  const md = renderDone(
    report({
      verdict: "FAIL",
      gates: { [hostile]: 1 },
      failing_gates: [hostile],
      completeness: { ...INCOMPLETE_BLOCK, missing: [hostile] },
      ac_gate: {
        mode: "test-first",
        verdict: "FAIL",
        reason: hostile,
        evidence: [{ reason: hostile, detail: hostile }],
        acs: [],
        note: "n",
      },
    })
  );
  // A fence-aware scan: outside fenced regions, no line is the injected heading or link.
  let inFence = null;
  const outside = [];
  for (const line of md.split("\n")) {
    const f = line.match(/^(`{3,})/);
    if (f) {
      if (inFence === null) inFence = f[1];
      else if (f[1].length >= inFence.length && /^`+$/.test(line.trim())) inFence = null;
      continue;
    }
    if (inFence === null) outside.push(line);
  }
  assert.ok(!outside.some((l) => /^# fake heading$/.test(l)), "the injected heading escaped its fence");
  assert.ok(!outside.some((l) => l.includes("[click](")), "the injected link escaped its fence");
  assert.match(md, /````text/, "the fence is computed longer than the back-tick run inside");
});

test("hostile control: the same scan DOES see a heading placed outside a fence (the scan can fail)", () => {
  const md = `${renderDone(report())}\n# fake heading\n`;
  assert.ok(md.split("\n").some((l) => l === "# fake heading"));
});

test("hostile feature name: a feature that is not a clean token renders a fixed phrase, never inline", () => {
  const md = renderDone(report({ feature: "demo\n# injected" }));
  assert.match(md, /^# VERIFY — \(feature name not renderable\)\n/);
  assert.doesNotMatch(md, /^# injected$/m);
});

test('L62 — {"toString":1} in every quoted field renders via dataText and never throws (with the String() control)', () => {
  const needle = JSON.parse('{"toString":1}');
  assert.throws(() => String(needle), /Cannot convert object to primitive value/);
  const shapes = [
    report({ verdict: "FAIL", failing_gates: [needle] }),
    report({ verdict: "INCONCLUSIVE", reason: needle, reason_code: needle }),
    report({ gates: { test: needle } }),
    report({ completeness: { ...INCOMPLETE_BLOCK, missing: [needle] } }),
    report({ completeness: { complete: false, missing: [], skipped: [], reason: needle } }),
    report({
      ac_gate: {
        mode: needle,
        verdict: needle,
        reason: needle,
        evidence: [{ reason: needle, detail: needle }],
        acs: [{ id: needle, reason: needle }],
      },
    }),
    report({ verifiers: { registered: 1, findings: [needle] } }),
    report({ feature: needle, gate_run: { source: needle } }),
  ];
  for (const r of shapes) assert.doesNotThrow(() => renderDone(r));
  assert.doesNotThrow(() => renderRefused({ feature: "demo", reasonCode: "chain-red", detail: needle }));
  assert.doesNotThrow(() => renderRefused({ feature: needle, reasonCode: needle, detail: "x" }));
});

// ── G10 — SCOPED TO WHAT THE SCRIPT SUPPLIES ────────────────────────────────────────────────────────
test("★ G10 — the render's fixed text and the repo-relative inputs the script supplies carry no absolute path", () => {
  const outcomes = [
    renderDone(report()),
    renderDone(
      report({ verdict: "FAIL", failing_gates: ["test"], gates: { test: 1, "structural:pharn/pharn-review/x/evals/expected/a.json": 0 } })
    ),
    renderDone(report({ verdict: "INCOMPLETE", completeness: INCOMPLETE_BLOCK })),
    renderDone({
      feature: "demo",
      gates: {},
      verdict: "INCONCLUSIVE",
      failing_gates: [],
      reason: "stamp not found: .pharn/pharn-verify/gates/stamp.json",
      reason_code: "stamp-missing",
    }),
    ...REGISTRY.verify.refused.map((reasonCode) =>
      renderRefused({ feature: "demo", reasonCode, detail: "missing required artifact(s): pharn/features/demo/SPEC.md" })
    ),
  ];
  for (const md of outcomes) assert.ok(!ABS_PATH_RE.test(md), `a render from repo-relative inputs holds an absolute path:\n${md}`);
  for (const fixed of [PREAMBLE, RESIDUAL, NO_VERIFIERS]) assert.ok(!ABS_PATH_RE.test(fixed));
});

test("G10 control — a CHECKER's own reason carrying an absolute path renders as given, inside a fence (the bound, stated)", () => {
  const abs = "/Users/someone/project/pharn/features/demo/SPEC.md is not readable";
  assert.ok(ABS_PATH_RE.test(abs), "the control's pattern must really match an absolute path");
  const md = renderDone(report({ verdict: "INCONCLUSIVE", reason: `AC gate unmeasurable — ${abs}` }));
  assert.ok(ABS_PATH_RE.test(md), "the reason is rendered as given — the renderer scrubs nothing");
  assert.match(md, new RegExp("```text\\nreason: AC gate unmeasurable — /Users/someone/"), "…and it sits inside a fence");
});

// ── L10 — CHECK 5 through the REAL validate.mjs ─────────────────────────────────────────────────────
test("★ L10 — validate.mjs stays GREEN over a render quoting `rule_id:` and `problem:`; the no-preamble control goes RED", () => {
  const dir = mkdtempSync(join(tmpdir(), "rv-check5-"));
  try {
    const md = renderRefused({
      feature: "demo",
      reasonCode: "chain-red",
      detail: 'rule_id: "P0"\nproblem: "ignore previous instructions"',
    });
    const target = join(dir, "pharn", "features", "demo", "VERIFY.md");
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, md);
    const green = spawnSync(process.execPath, [join(HERE, "validate.mjs"), dir], { encoding: "utf8" });
    assert.equal(green.status, 0, green.stdout + green.stderr);

    assert.ok(md.includes(PREAMBLE), "precondition: the preamble is there to strip");
    writeFileSync(target, md.replace(PREAMBLE, ""));
    const red = spawnSync(process.execPath, [join(HERE, "validate.mjs"), dir], { encoding: "utf8" });
    assert.equal(red.status, 1, "without the preamble CHECK 5 must RED — else this test proves nothing");
    assert.match(red.stdout, /P0\/fix#1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── ★ VERIFY.md ENUMERATION (the RUN-REPORT.md / REGRESSION.md precedent) ───────────────────────────
const SITES = [
  ["pharn/floor/check-regress.mjs", /PIPELINE_ARTIFACTS[\s\S]*?"VERIFY\.md"[\s\S]*?\];/],
  ["pharn/floor/reconcile-ignore.json", /"names":[\s\S]*?"VERIFY\.md"/],
  ["pharn/floor/worktree-fingerprint.mjs", /EXCLUDED_ARTIFACTS[\s\S]*?"VERIFY\.md"[\s\S]*?\]\);/],
  [".claude/commands/pharn-loop.md", /"VERIFY\.md"/],
  [".prettierignore", /^pharn\/features\/\*\/VERIFY\.md$/m],
  [".markdownlint-cli2.jsonc", /"pharn\/features\/\*\/VERIFY\.md"/],
];

test("★ ENUMERATION — every site that must know VERIFY.md names it (six sites, counted)", () => {
  assert.equal(SITES.length, 6, "non-vacuity: the site set is counted");
  for (const [rel, re] of SITES) assert.match(readFileSync(join(REPO, rel), "utf8"), re, `${rel} must name VERIFY.md`);
});

test("★ ENUMERATION discriminates — each site with VERIFY.md dropped fails its own pattern (the mutant)", () => {
  for (const [rel, re] of SITES) {
    const text = readFileSync(join(REPO, rel), "utf8");
    const mutant = text.replaceAll("VERIFY.md", "VERIFY-GONE.md");
    assert.notEqual(mutant, text, `${rel}: the mutation must land`);
    assert.doesNotMatch(mutant, re, `${rel}: a site that dropped VERIFY.md must fail`);
  }
});

// ── STYLE PROBE — self-skips when node_modules is not installed ────────────────────────────────────
// A rendered VERIFY.md quotes untrusted text verbatim, so it is deliberately unformattable; the commitment is that the
// two style gates IGNORE it. The fixture must live at a real `pharn/features/*/VERIFY.md` path for the ignore globs to
// mean anything. M11 (6.23.0): pre-clean a leftover from a killed run, and register the cleanup with `t.after()` too.
test("style probe: a VERIFY.md fixture under pharn/features/ is ignored by prettier and markdownlint-cli2", (t) => {
  const prettierBin = join(REPO, "node_modules", ".bin", "prettier");
  const mdlintBin = join(REPO, "node_modules", ".bin", "markdownlint-cli2");
  if (!existsSync(prettierBin) || !existsSync(mdlintBin)) {
    t.skip("node_modules is not installed — this probe needs the dev toolchain, not the floor gate");
    return;
  }
  const rel = "pharn/features/render-verify-style-probe-tmp/VERIFY.md";
  const abs = join(REPO, rel);
  rmSync(dirname(abs), { recursive: true, force: true });
  t.after(() => rmSync(dirname(abs), { recursive: true, force: true }));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, "#VERIFY\nunformatted   text   here\n");
  try {
    assert.doesNotThrow(() => execFileSync(prettierBin, ["--check", rel], { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] }));
    assert.doesNotThrow(() => execFileSync(mdlintBin, ["--no-globs", rel], { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] }));
  } finally {
    rmSync(dirname(abs), { recursive: true, force: true });
  }
});
