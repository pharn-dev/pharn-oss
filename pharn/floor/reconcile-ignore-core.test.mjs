// pharn/floor/reconcile-ignore-core.test.mjs — the always-reconciled set has ONE owner (6.57.0, deletion-follow-ups).
//
// What this pins, and only this (the set's CONTENT and its parity with the hook are pinned in
// check-bash-reconcile.test.mjs, whose assertions run unedited against the re-exports):
//   ★ IDENTITY — check-bash-reconcile.mjs re-exports the core's own function objects, never a copy (L35, L72);
//   ★ LOAD GRAPH — the core imports node: built-ins only; apply-plan-deletions.mjs imports the core and never the
//     reconcile CLI module (the 6.56.0 review's P3 finding); each scan has a mutant that must fail it (L60);
//   IGNORE_DATA_PATH names the committed reconcile-ignore.json beside the core, and it loads `ok`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "./reconcile-ignore-core.mjs";
import * as checker from "./check-bash-reconcile.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const IMPORT_RE = /^import\s+(?:[\s\S]*?from\s+)?["']([^"']+)["'];?\s*$/gm;
const importsOf = (src) => [...src.matchAll(IMPORT_RE)].map((m) => m[1]);
const MOVED = ["IGNORE_DATA_PATH", "loadIgnoreData", "isHumanOnly", "isAlwaysReconciled"];

test("★ IDENTITY — the reconcile CLI re-exports the core's own objects for every moved name", () => {
  for (const name of MOVED) {
    assert.ok(Object.hasOwn(core, name), `the core exports ${name}`);
    assert.ok(Object.hasOwn(checker, name), `the CLI still exports ${name} (no importer changes, L72)`);
    assert.equal(checker[name], core[name], `${name} is the same object in both modules, not a copy`);
  }
  assert.deepEqual(Object.keys(core).sort(), [...MOVED].sort(), "the core exports exactly the moved names");
});

test("★ LOAD GRAPH — the core imports node: built-ins only", () => {
  const src = readFileSync(join(HERE, "reconcile-ignore-core.mjs"), "utf8");
  const imports = importsOf(src);
  assert.ok(imports.length > 0, "the scan found the core's imports (non-vacuous)");
  for (const spec of imports) assert.match(spec, /^node:/, `unexpected import ${spec}`);
  const mutant = src.replace(
    'import { readFileSync } from "node:fs";',
    (m) => `${m}\nimport { enumerate } from "./reconcile-baseline.mjs";`
  );
  assert.notEqual(mutant, src, "the mutation must land — the fs import line is the anchor");
  assert.ok(
    importsOf(mutant).some((s) => !s.startsWith("node:")),
    "an injected floor import fails the same scan"
  );
});

test("★ LOAD GRAPH — apply-plan-deletions.mjs imports the core and never the reconcile CLI", () => {
  const src = readFileSync(join(HERE, "apply-plan-deletions.mjs"), "utf8");
  const imports = importsOf(src);
  assert.ok(imports.includes("./reconcile-ignore-core.mjs"), "the helper imports the core");
  assert.ok(!imports.includes("./check-bash-reconcile.mjs"), "the helper does not import the reconcile CLI");
  const anchor = 'from "./reconcile-ignore-core.mjs";';
  assert.ok(src.includes(anchor), "the import line is the anchor (non-vacuous)");
  const mutant = src.replace(anchor, 'from "./check-bash-reconcile.mjs";');
  assert.ok(importsOf(mutant).includes("./check-bash-reconcile.mjs"), "the reverted import fails the same scan");
});

test("IGNORE_DATA_PATH is the committed reconcile-ignore.json beside the core, and it loads ok", () => {
  assert.equal(core.IGNORE_DATA_PATH, join(HERE, "reconcile-ignore.json"));
  assert.ok(existsSync(core.IGNORE_DATA_PATH));
  const data = core.loadIgnoreData();
  assert.equal(data.ok, true, data.reason);
  assert.ok(core.isAlwaysReconciled("LIMITS.md", data), "a human-only member");
  assert.ok(core.isAlwaysReconciled("pharn/floor/x.mjs", data), "a prefix member");
  assert.ok(!core.isAlwaysReconciled("src/x.ts", data), "a non-member (control)");
});
