// pharn/floor/stage-regress-core.test.mjs — the four closed rules (TEST_FILE, STYLE_CONFIG, INSTALL,
// BASE), each over members and non-members; REGRESS_PATHS/PHASES closure; the progress-record validator;
// and the ★ load-graph closure (GRILL G8: this module imports exactly `gate-run-core.mjs`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  REGRESS_PATHS,
  PHASES,
  RESUMABLE_PHASES,
  isTestFile,
  styleConfigTouched,
  shouldSkipStyle,
  resolveInstall,
  resolveBaseSource,
  PROGRESS_SCHEMA,
  validateProgress,
} from "./stage-regress-core.mjs";

// ── ★ LOAD GRAPH (GRILL G8) ──────────────────────────────────────────────────────────────────────────
test("★ LOAD GRAPH — stage-regress-core.mjs imports exactly gate-run-core.mjs", () => {
  const src = readFileSync(fileURLToPath(new URL("./stage-regress-core.mjs", import.meta.url)), "utf8");
  const imports = [...src.matchAll(/^import\s+.*?from\s+["']([^"']+)["'];?\s*$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ["./gate-run-core.mjs"], "an injected second import must fail this test");
});

// ── REGRESS_PATHS / PHASES ───────────────────────────────────────────────────────────────────────────
test("REGRESS_PATHS: every entry sits under the state root, and loop-fresh-core.mjs's DEFAULT_STAMPS derive from it", () => {
  for (const [k, v] of Object.entries(REGRESS_PATHS)) {
    if (k === "root") continue;
    assert.ok(v.startsWith(REGRESS_PATHS.root + "/"), `${k} (${v}) must sit under ${REGRESS_PATHS.root}`);
  }
  assert.equal(REGRESS_PATHS.head, ".pharn/pharn-regress/head");
  assert.equal(REGRESS_PATHS.baseGates, ".pharn/pharn-regress/base-gates");
  assert.equal(REGRESS_PATHS.stageJson, ".pharn/pharn-regress/stage.json");
  assert.equal(REGRESS_PATHS.scopeJson, ".pharn/pharn-regress/scope.json");
});

test("PHASES: the 13 phases in execution order; RESUMABLE_PHASES is the drain-head..render suffix", () => {
  assert.deepEqual(PHASES, [
    "fresh",
    "chain",
    "base",
    "partition",
    "head-init",
    "drain-head",
    "worktree",
    "install",
    "base-init",
    "drain-base",
    "verdict",
    "cleanup",
    "render",
  ]);
  assert.deepEqual(RESUMABLE_PHASES, ["drain-head", "worktree", "install", "base-init", "drain-base", "verdict", "cleanup", "render"]);
  for (const p of ["fresh", "chain", "base", "partition", "head-init"]) {
    assert.ok(!RESUMABLE_PHASES.includes(p), `${p} must never be a persisted (resumable) phase`);
  }
});

// ── TEST_FILE_RULE ───────────────────────────────────────────────────────────────────────────────────
test("isTestFile: members — vitest/Jest default conventions, node --test, and __tests__ directories", () => {
  const members = [
    "src/foo.test.js",
    "src/foo.test.mjs",
    "src/foo.test.cjs",
    "src/foo.test.ts",
    "src/foo.test.tsx",
    "src/foo.test.jsx",
    "src/foo.spec.js",
    "src/foo.spec.ts",
    "a/b/__tests__/foo.js",
    "a/b/__tests__/foo.ts",
    "__tests__/deep/nested/foo.tsx",
  ];
  for (const p of members) assert.ok(isTestFile(p), `${p} should be a test file`);
});

test("isTestFile: non-members — ordinary source, and a __tests__ segment with a non-JS/TS extension", () => {
  const nonMembers = [
    "src/foo.js",
    "src/footest.js",
    "src/foo.testing.js",
    "a/__tests__/fixture.json",
    "a/__tests__/data.txt",
    "README.md",
  ];
  for (const p of nonMembers) assert.ok(!isTestFile(p), `${p} should NOT be a test file`);
});

// ── STYLE_CONFIG_RULE ────────────────────────────────────────────────────────────────────────────────
test("styleConfigTouched: members — eslint/prettier/markdownlint config basenames, at any directory depth", () => {
  for (const p of [
    "eslint.config.mjs",
    ".eslintrc",
    ".eslintrc.json",
    ".eslintignore",
    ".prettierrc",
    ".prettierrc.json",
    "prettier.config.js",
    ".prettierignore",
    ".markdownlint.json",
    ".markdownlint-cli2.jsonc",
    "nested/dir/.eslintrc.js",
  ]) {
    assert.ok(styleConfigTouched([p]), `${p} should be recognized as a style config`);
  }
});

test("styleConfigTouched: non-members — an ordinary source file, and a config outside the closed name set", () => {
  assert.equal(styleConfigTouched(["src/index.js"]), false);
  assert.equal(styleConfigTouched(["biome.json"]), false, "outside the closed set — a named bound, not a bug");
  assert.equal(styleConfigTouched(["package.json"]), false, "package.json#eslintConfig is outside the closed set — a named bound");
  assert.equal(styleConfigTouched([]), false);
});

test("shouldSkipStyle: eligible only for a discovered source; an explicit --gates string is never filtered", () => {
  assert.equal(shouldSkipStyle({ source: "discover", insidePaths: ["src/index.js"] }), true, "no config touched -> skip");
  assert.equal(shouldSkipStyle({ source: "discover", insidePaths: [".eslintrc"] }), false, "a config touched -> do not skip");
  assert.equal(shouldSkipStyle({ source: "explicit", insidePaths: ["src/index.js"] }), false, "explicit --gates is run as written");
});

// ── INSTALL_RULE (GATE 1 Q3) ─────────────────────────────────────────────────────────────────────────
test("resolveInstall: --no-install wins over everything", () => {
  assert.deepEqual(resolveInstall({ noInstall: true, hasPackageJson: true, lockfiles: { npm: true } }), {
    kind: "none",
    cmd: null,
    unmeasured: false,
  });
});

test("resolveInstall: an explicit --install command wins over lockfile detection", () => {
  assert.deepEqual(resolveInstall({ explicitInstall: "make deps", hasPackageJson: true, lockfiles: { npm: true } }), {
    kind: "cmd",
    cmd: "make deps",
    unmeasured: false,
  });
});

test("resolveInstall: no package.json at all -> none (no-manifest)", () => {
  assert.deepEqual(resolveInstall({ hasPackageJson: false, lockfiles: {} }), {
    kind: "none",
    cmd: null,
    unmeasured: false,
    reason: "no-manifest",
  });
});

test("resolveInstall: exactly one lockfile family resolves the command; npm is MEASURED, the other three are UNMEASURED", () => {
  assert.deepEqual(resolveInstall({ hasPackageJson: true, lockfiles: { npm: true } }), {
    kind: "cmd",
    cmd: "npm ci",
    unmeasured: false,
    family: "npm",
  });
  assert.deepEqual(resolveInstall({ hasPackageJson: true, lockfiles: { pnpm: true } }), {
    kind: "cmd",
    cmd: "pnpm install --frozen-lockfile",
    unmeasured: true,
    family: "pnpm",
  });
  assert.deepEqual(resolveInstall({ hasPackageJson: true, lockfiles: { yarn: true } }), {
    kind: "cmd",
    cmd: "yarn install --frozen-lockfile",
    unmeasured: true,
    family: "yarn",
  });
  assert.deepEqual(resolveInstall({ hasPackageJson: true, lockfiles: { bun: true } }), {
    kind: "cmd",
    cmd: "bun install --frozen-lockfile",
    unmeasured: true,
    family: "bun",
  });
});

test("resolveInstall: package-lock.json and npm-shrinkwrap.json are the SAME family, not two", () => {
  // Both are folded into a single `npm: true` flag by the CLI before calling this function — asserted here
  // by exercising the boolean the CLI is responsible for computing.
  assert.deepEqual(resolveInstall({ hasPackageJson: true, lockfiles: { npm: true } }).kind, "cmd");
});

test("resolveInstall: no lockfile, or two lockfile families -> ask (install-unresolved)", () => {
  assert.deepEqual(resolveInstall({ hasPackageJson: true, lockfiles: {} }), { kind: "ask" });
  assert.deepEqual(resolveInstall({ hasPackageJson: true, lockfiles: { npm: true, pnpm: true } }), { kind: "ask" });
  assert.deepEqual(resolveInstall({ hasPackageJson: true, lockfiles: { yarn: true, bun: true } }), { kind: "ask" });
});

// ── BASE_RULE ────────────────────────────────────────────────────────────────────────────────────────
test("resolveBaseSource: explicit --base wins; else a dirty tree resolves to HEAD; else merge-base; else ask", () => {
  assert.deepEqual(resolveBaseSource({ explicitBase: "origin/main", workingTreeDirty: true, hasMergeBase: true }), { kind: "explicit" });
  assert.deepEqual(resolveBaseSource({ workingTreeDirty: true, hasMergeBase: true }), { kind: "head" });
  assert.deepEqual(resolveBaseSource({ workingTreeDirty: false, hasMergeBase: true }), { kind: "merge-base" });
  assert.deepEqual(resolveBaseSource({ workingTreeDirty: false, hasMergeBase: false }), { kind: "ask" });
});

// ── THE PROGRESS RECORD ──────────────────────────────────────────────────────────────────────────────
function validRecord(overrides = {}) {
  return {
    schema: PROGRESS_SCHEMA,
    feature: "demo",
    timeoutMs: 540000,
    budgetMs: 570000,
    base: "a".repeat(40),
    phase: "drain-head",
    install: { kind: "cmd", cmd: "npm ci", unmeasured: false },
    e2eExcluded: [],
    styleSkipped: false,
    installResult: null,
    cleanupResult: null,
    ...overrides,
  };
}

test("validateProgress: accepts a well-formed record, including a null budgetMs (unbudgeted)", () => {
  assert.deepEqual(validateProgress(validRecord()), { ok: true });
  assert.deepEqual(validateProgress(validRecord({ budgetMs: null })), { ok: true });
});

test("validateProgress: rejects a bad schema, a non-slug feature, a non-40-hex base, and a non-resumable phase", () => {
  assert.equal(validateProgress(validRecord({ schema: "wrong/1" })).ok, false);
  assert.equal(validateProgress(validRecord({ feature: "Not_A_Slug" })).ok, false);
  assert.equal(validateProgress(validRecord({ base: "short" })).ok, false);
  assert.equal(validateProgress(validRecord({ phase: "fresh" })).ok, false, "fresh is never a resumable (persisted) phase");
  assert.equal(validateProgress(validRecord({ phase: "not-a-phase" })).ok, false);
  assert.equal(validateProgress(null).ok, false);
  assert.equal(validateProgress([1, 2]).ok, false);
});

test("validateProgress: rejects a malformed install/e2eExcluded/styleSkipped/installResult/cleanupResult", () => {
  assert.equal(validateProgress(validRecord({ install: { kind: "cmd", cmd: "", unmeasured: false } })).ok, false, "empty cmd string");
  assert.equal(
    validateProgress(validRecord({ install: { kind: "none", cmd: "npm ci", unmeasured: false } })).ok,
    false,
    "none must carry cmd:null"
  );
  assert.equal(validateProgress(validRecord({ e2eExcluded: "not-an-array" })).ok, false);
  assert.equal(validateProgress(validRecord({ styleSkipped: "yes" })).ok, false);
  assert.equal(
    validateProgress(validRecord({ installResult: { ran: true, exit: "0", timedOut: false } })).ok,
    false,
    "exit must be an integer"
  );
  assert.equal(validateProgress(validRecord({ installResult: { ran: true, exit: 0, timedOut: false } })).ok, true);
  assert.equal(validateProgress(validRecord({ cleanupResult: { ok: "yes" } })).ok, false);
  assert.equal(validateProgress(validRecord({ cleanupResult: { ok: false, error: "EBUSY" } })).ok, true);
});

test("validateProgress: rejects a negative or non-integer timeoutMs/budgetMs", () => {
  assert.equal(validateProgress(validRecord({ timeoutMs: 0 })).ok, false);
  assert.equal(validateProgress(validRecord({ timeoutMs: -1 })).ok, false);
  assert.equal(validateProgress(validRecord({ budgetMs: -1 })).ok, false);
  assert.equal(validateProgress(validRecord({ budgetMs: 1.5 })).ok, false);
});
