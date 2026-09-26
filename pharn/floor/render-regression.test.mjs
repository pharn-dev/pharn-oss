// pharn/floor/render-regression.test.mjs — render-regression.mjs's suite: the render per outcome
// (no-regressions / regressions / inconclusive / a refusal), fencing of hostile text, the L62 case, no
// absolute path in any rendered outcome (GRILL G10), the ★ REGRESSION.md enumeration (GRILL G9), and a
// style probe (prettier + markdownlint-cli2) that self-skips when `node_modules` is not installed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDone, renderRefused } from "./render-regression.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

// Absolute-path detection is imported by the TEST ONLY (GRILL G10/G6 — the renderer's own load graph must
// never grow to carry it).
import { ABS_PATH_RE } from "./render-cost-ledger.mjs";

function baseReport(overrides = {}) {
  return {
    base: "a".repeat(40),
    inside: ["src/a.js"],
    outside_gates: { test: { base: 0, head: 0 }, lint: { base: 0, head: 0 } },
    regressions: [],
    pre_existing: [],
    verdict: "no-regressions",
    ...overrides,
  };
}

function baseScope(overrides = {}) {
  return {
    inside: ["src/a.js"],
    declared: ["src/a.js"],
    escaped: [],
    escape_exempt: [],
    outside_tests: [],
    outside_eval_pairs: [],
    ...overrides,
  };
}

function baseProgress(overrides = {}) {
  return {
    install: { kind: "cmd", cmd: "npm ci", unmeasured: false },
    installResult: { ran: true, exit: 0, timedOut: false },
    cleanupResult: { ok: true },
    e2eExcluded: [],
    styleSkipped: false,
    ...overrides,
  };
}

// ── ONE PER OUTCOME ──────────────────────────────────────────────────────────────────────────────────
test("renderDone: no-regressions — the headline verdict line and the install command are present", () => {
  const md = renderDone({ feature: "demo", base: "a".repeat(40), report: baseReport(), scope: baseScope(), progress: baseProgress() });
  assert.match(md, /^# REGRESSION — demo/);
  assert.match(md, /NO REGRESSIONS/);
  assert.match(md, /npm ci/);
});

test("renderDone: regressions — the count is stated, and the flipped gate is visible", () => {
  const report = baseReport({ verdict: "regressions", regressions: ["lint"], outside_gates: { lint: { base: 0, head: 1 } } });
  const md = renderDone({ feature: "demo", base: "a".repeat(40), report, scope: baseScope(), progress: baseProgress() });
  assert.match(md, /1 REGRESSION\(S\) OUTSIDE THE FEATURE — STAGE FAILS/);
  assert.match(md, /REGRESSION/);
});

test("renderDone: inconclusive — the reason is quoted as DATA, and the headline never claims a pass or fail", () => {
  const report = baseReport({ verdict: "inconclusive", reason: "gate set mismatch between base and head" });
  const md = renderDone({ feature: "demo", base: "a".repeat(40), report, scope: baseScope(), progress: baseProgress() });
  assert.match(md, /INCONCLUSIVE/);
  assert.match(md, /gate set mismatch between base and head/);
  assert.doesNotMatch(md, /NO REGRESSIONS/);
});

test("renderDone: a failed base install is named on ITS OWN line, and pre-existing gates are labeled accordingly", () => {
  const report = baseReport({ pre_existing: ["test", "lint"] });
  const progress = baseProgress({ installResult: { ran: true, exit: 1, timedOut: false } });
  const md = renderDone({ feature: "demo", base: "a".repeat(40), report, scope: baseScope(), progress });
  assert.match(md, /THE BASE-COMMIT INSTALL FAILED/);
  assert.match(md, /regress-failed-install-false-green/);
});

test("renderDone: install none (no-manifest), and an UNMEASURED lockfile family is labeled honestly", () => {
  const noManifest = renderDone({
    feature: "demo",
    base: "a".repeat(40),
    report: baseReport(),
    scope: baseScope(),
    progress: baseProgress({ install: { kind: "none", reason: "no-manifest" }, installResult: null }),
  });
  assert.match(noManifest, /install: none \(no-manifest\)/);

  const unmeasured = renderDone({
    feature: "demo",
    base: "a".repeat(40),
    report: baseReport(),
    scope: baseScope(),
    progress: baseProgress({ install: { kind: "cmd", cmd: "pnpm install --frozen-lockfile", unmeasured: true } }),
  });
  assert.match(unmeasured, /UNMEASURED/);
  assert.match(unmeasured, /pnpm install --frozen-lockfile/);
});

test("renderDone: e2e_excluded is rendered as 'not run at regress (verify-only)', and styleSkipped is stated", () => {
  const md = renderDone({
    feature: "demo",
    base: "a".repeat(40),
    report: baseReport(),
    scope: baseScope(),
    progress: baseProgress({ e2eExcluded: ["e2e", "test:e2e"], styleSkipped: true }),
  });
  assert.match(md, /not run at regress \(verify-only\): e2e, test:e2e/);
  assert.match(md, /style gates were SKIPPED/);
});

test("renderDone: a cleanup failure is reported, and never voids the already-written verdict", () => {
  const md = renderDone({
    feature: "demo",
    base: "a".repeat(40),
    report: baseReport(),
    scope: baseScope(),
    progress: baseProgress({ cleanupResult: { ok: false, error: "ENOTEMPTY" } }),
  });
  assert.match(md, /removing the base worktree FAILED/);
  assert.match(md, /ENOTEMPTY/);
  assert.match(md, /NO REGRESSIONS/, "the verdict headline is unaffected by a cleanup failure");
});

test("renderRefused: chain-red / missing-artifact / plan-files-unparseable / scope-escaped all render 'NOT measured' plus a quoted detail", () => {
  for (const reasonCode of ["chain-red", "missing-artifact", "plan-files-unparseable", "scope-escaped"]) {
    const md = renderRefused({ feature: "demo", reasonCode, detail: `synthetic detail for ${reasonCode}` });
    assert.match(md, /refused: `/);
    assert.match(md, new RegExp(reasonCode));
    assert.match(md, /regression NOT measured/);
    assert.match(md, new RegExp(`synthetic detail for ${reasonCode}`));
  }
});

// ── FENCING OF HOSTILE TEXT / L62 ───────────────────────────────────────────────────────────────────
test("a gate id containing a fake heading or a fence run never becomes document structure", () => {
  const report = baseReport({
    outside_gates: { "# fake heading\n```\nmalicious": { base: 0, head: 1 } },
    verdict: "regressions",
    regressions: ["x"],
  });
  const md = renderDone({ feature: "demo", base: "a".repeat(40), report, scope: baseScope(), progress: baseProgress() });
  // The id is JSON-quoted via dataText and always preceded by fixed prose on the same line, so it can
  // never sit at column 0.
  assert.doesNotMatch(md, /^# fake heading$/m);
  assert.match(md, /gate: base exit/);
});

test("L62 — a non-string 'reason'/'error'/'detail' whose own toString is not callable renders via dataText, never throws", () => {
  const needlesToString = JSON.parse('{"toString":1}');
  assert.doesNotThrow(() =>
    renderDone({
      feature: "demo",
      base: "a".repeat(40),
      report: baseReport({ verdict: "inconclusive", reason: needlesToString }),
      scope: baseScope(),
      progress: baseProgress(),
    })
  );
  assert.doesNotThrow(() =>
    renderDone({
      feature: "demo",
      base: "a".repeat(40),
      report: baseReport(),
      scope: baseScope(),
      progress: baseProgress({ cleanupResult: { ok: false, error: needlesToString } }),
    })
  );
  assert.doesNotThrow(() => renderRefused({ feature: "demo", reasonCode: "chain-red", detail: needlesToString }));
  // The control: a bare String() really does throw on it.
  assert.throws(() => String(needlesToString), /Cannot convert object to primitive value/);
});

// ── NO ABSOLUTE PATH ANYWHERE (GRILL G10) ───────────────────────────────────────────────────────────
test("★ G10 — every outcome, built from the REPO-RELATIVE inputs stage-regress.mjs is responsible for supplying, renders no absolute-path-shaped string", () => {
  // This is a property of the COMMITTED OUTPUT under CORRECT use, exactly as the plan states: the renderer
  // does not scrub a path it is handed (it only quotes what it receives), so the guarantee lives in
  // `stage-regress.mjs` handing every child repo-relative paths. This test therefore exercises every
  // render shape with the kind of input the CLI actually produces, never a deliberately hostile one.
  const outcomes = [
    renderDone({ feature: "demo", base: "a".repeat(40), report: baseReport(), scope: baseScope(), progress: baseProgress() }),
    renderDone({
      feature: "demo",
      base: "a".repeat(40),
      report: baseReport({ verdict: "regressions", regressions: ["lint"], outside_gates: { lint: { base: 0, head: 1 } } }),
      scope: baseScope({ escape_exempt: ["pharn/features/demo/PLAN.md"] }),
      progress: baseProgress(),
    }),
    renderDone({
      feature: "demo",
      base: "a".repeat(40),
      report: baseReport({ verdict: "inconclusive", reason: "gate set mismatch between base and head" }),
      scope: baseScope(),
      progress: baseProgress(),
    }),
    renderDone({
      feature: "demo",
      base: "a".repeat(40),
      report: baseReport(),
      scope: baseScope(),
      progress: baseProgress({ cleanupResult: { ok: false, error: "EBUSY: resource busy or locked, rmdir '.pharn/pharn-regress/base'" } }),
    }),
    renderRefused({
      feature: "demo",
      reasonCode: "chain-red",
      detail: "RED — spec->plan chain BROKEN: PLAN's carried spec_content_hash (…) != the SPEC's current body hash (…)",
    }),
  ];
  for (const md of outcomes) {
    assert.ok(!ABS_PATH_RE.test(md), `a repo-relative-only render must contain no absolute-path-shaped string:\n${md}`);
  }
  const hostileAbs = "/Users/someone/Projects/x/leaked.js";
  assert.ok(ABS_PATH_RE.test(`{"cwd":"${hostileAbs}"}`), "the control: the pattern really does match a real absolute path");
});

// ── ★ REGRESSION.md ENUMERATION (GRILL G9, the RUN-REPORT.md precedent) ─────────────────────────────
test("★ ENUMERATION (G9) — every site that must know REGRESSION.md names it", () => {
  const SITES = [
    ["pharn/floor/check-regress.mjs", /PIPELINE_ARTIFACTS[\s\S]*?"REGRESSION\.md"[\s\S]*?\];/],
    ["pharn/floor/reconcile-ignore.json", /"names":[\s\S]*?"REGRESSION\.md"/],
    ["pharn/floor/worktree-fingerprint.mjs", /EXCLUDED_ARTIFACTS[\s\S]*?"REGRESSION\.md"[\s\S]*?\]\);/],
    [".claude/commands/pharn-loop.md", /"REGRESSION\.md"/],
    [".prettierignore", /^pharn\/features\/\*\/REGRESSION\.md$/m],
    [".markdownlint-cli2.jsonc", /"pharn\/features\/\*\/REGRESSION\.md"/],
  ];
  assert.equal(SITES.length, 6, "non-vacuity: the site set must be counted");
  for (const [rel, re] of SITES) {
    const text = readFileSync(join(REPO, rel), "utf8");
    assert.match(text, re, `${rel} must name REGRESSION.md`);
  }
});

// ── STYLE PROBE — self-skips when node_modules is not installed ────────────────────────────────────
//
// A rendered REGRESSION.md is deliberately unformattable (it quotes untrusted text verbatim), so the
// commitment this repo makes is that the two style gates IGNORE it rather than flag it. This probe writes
// a deliberately malformed fixture (a heading missing its space, ragged inline spacing — real prettier and
// markdownlint findings) at the ignored glob's own path and asserts both tools pass it silently. If the
// ignore entries above were ever dropped, this is the test that would turn red instead of the next real
// pipeline run's `npm run check`.
test("style probe: a REGRESSION.md fixture under pharn/features/ is correctly ignored by prettier and markdownlint-cli2", (t) => {
  const prettierBin = join(REPO, "node_modules", ".bin", "prettier");
  const mdlintBin = join(REPO, "node_modules", ".bin", "markdownlint-cli2");
  if (!existsSync(prettierBin) || !existsSync(mdlintBin)) {
    t.skip("node_modules is not installed — this probe needs the dev toolchain, not the floor gate");
    return;
  }
  const rel = "pharn/features/render-regression-style-probe-tmp/REGRESSION.md";
  const abs = join(REPO, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, "#REGRESSION\nunformatted   text   here\n");
  try {
    assert.doesNotThrow(
      () => execFileSync(prettierBin, ["--check", rel], { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] }),
      "prettier must treat the fixture as ignored (a real finding would exit non-zero)"
    );
    assert.doesNotThrow(
      // --no-globs is LOAD-BEARING (CLAUDE.md, Step 2b): without it markdownlint-cli2 ADDS its config's
      // own `globs` (**/*.md) to this argv path rather than replacing it, so the run also lints every
      // OTHER markdown file in the repo — exactly the gotcha that section documents.
      () => execFileSync(mdlintBin, ["--no-globs", rel], { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] }),
      "markdownlint-cli2 must treat the fixture as ignored (a real finding — missing heading space — would exit non-zero)"
    );
  } finally {
    rmSync(dirname(abs), { recursive: true, force: true });
  }
});
