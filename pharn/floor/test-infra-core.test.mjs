// pharn/floor/test-infra-core.test.mjs — the test-infrastructure pin's suite. Each kind of change is one mutation of a
// pinned world that the diff names, and only that one (L52); the shape is closed at every level (L36); a symlinked config
// is refused, never hashed through (L59).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONFIG_NAME_RE,
  PIN_KEYS,
  PIN_MANIFESTS,
  isRunnerConfigName,
  testInfraPathKind,
  RESULTS_VALUES,
  candidateGates,
  computeTestInfra,
  diffTestInfra,
  pinShapeError,
  sha256RegularFile,
  testInfraReds,
} from "./test-infra-core.mjs";

const SCRIPT_SECRET = "vitest run --secret-7f3a";

/** A project root with a package.json (`scripts`), a pharn.config.json (`testResults`) and root files. */
function world({
  scripts = { test: SCRIPT_SECRET, lint: "eslint ." },
  results = { test: "vitest-json" },
  files = { "vitest.config.ts": "export default {}\n" },
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "tic-"));
  if (scripts !== null) writeFileSync(join(root, "package.json"), JSON.stringify({ name: "p", scripts }));
  if (results !== null) writeFileSync(join(root, "pharn.config.json"), JSON.stringify({ testResults: results }));
  for (const [f, body] of Object.entries(files)) writeFileSync(join(root, f), body);
  return root;
}
const pinOf = (root, levels = ["unit"]) => {
  const r = computeTestInfra({ root, levels });
  assert.ok(r.ok, r.reason);
  return r.pin;
};
const withWorld = (opts, fn) => {
  const root = world(opts);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("the pin: the level gates' script values and results formats, the root runner configs — and NOT other scripts", () => {
  withWorld({}, (root) => {
    const pin = pinOf(root);
    assert.deepEqual(pin, {
      levels: ["unit"],
      gates: [{ id: "test", script: SCRIPT_SECRET, pre: null, post: null, results: "vitest-json" }],
      configs: [{ path: "vitest.config.ts", sha256: sha256RegularFile(join(root, "vitest.config.ts")) }],
    });
    assert.equal(pinShapeError(pin), null);
    assert.deepEqual(testInfraReds({ recorded: pin, root }), [], "a pin holds over the tree it was taken from");
  });
});

test("candidate gates follow the levels: unit/integration → test, e2e → the e2e set", () => {
  assert.deepEqual(candidateGates(["unit"]), ["test"]);
  assert.deepEqual(candidateGates(["integration", "unit"]), ["test"]);
  assert.deepEqual(candidateGates(["e2e"]), ["e2e", "test:e2e"]);
  withWorld(
    { scripts: { test: "vitest run", "test:e2e": "playwright test", e2e: "x" }, results: { "test:e2e": "playwright-json" } },
    (root) => {
      const pin = pinOf(root, ["e2e"]);
      assert.deepEqual(
        pin.gates.map((g) => [g.id, g.results]),
        [
          ["e2e", "not-configured"],
          ["test:e2e", "playwright-json"],
        ]
      );
    }
  );
});

test("each change is named by gate id or path, never by script text (P2), and each trips only itself (L52)", () => {
  const cases = [
    [
      "script changed",
      (root) =>
        writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run --passWithNoTests", lint: "eslint ." } })),
      /^gate test: its package\.json script changed$/,
    ],
    [
      "script removed",
      (root) => writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { lint: "eslint ." } })),
      /^gate test: its package\.json script is gone$/,
    ],
    [
      "results format changed",
      (root) => writeFileSync(join(root, "pharn.config.json"), JSON.stringify({ testResults: {} })),
      /^gate test: its testResults format changed \(vitest-json → not-configured\)$/,
    ],
    [
      "results config broken",
      (root) => writeFileSync(join(root, "pharn.config.json"), "{"),
      /^gate test: its testResults format changed \(vitest-json → config-invalid\)$/,
    ],
    [
      "config edited",
      (root) => writeFileSync(join(root, "vitest.config.ts"), "export default { test: { exclude: ['**'] } }\n"),
      /^vitest\.config\.ts: the runner config changed$/,
    ],
    ["config removed", (root) => rmSync(join(root, "vitest.config.ts")), /^vitest\.config\.ts: the runner config is gone$/],
    [
      "config added",
      (root) => writeFileSync(join(root, "vite.config.mjs"), "export default {}\n"),
      /^vite\.config\.mjs: a runner config was added$/,
    ],
    [
      "pretest added (grill G4)",
      (root) =>
        writeFileSync(
          join(root, "package.json"),
          JSON.stringify({ scripts: { test: SCRIPT_SECRET, pretest: "cp stub.js src/x.js", lint: "eslint ." } })
        ),
      /^gate test: its pretest script was added$/,
    ],
    [
      "posttest added",
      (root) =>
        writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: SCRIPT_SECRET, posttest: "true", lint: "eslint ." } })),
      /^gate test: its posttest script was added$/,
    ],
  ];
  for (const [why, mutate, re] of cases) {
    withWorld({}, (root) => {
      const pin = pinOf(root);
      mutate(root);
      const d = testInfraReds({ recorded: pin, root });
      assert.equal(d.length, 1, `${why}: ${JSON.stringify(d)}`);
      assert.match(d[0], re, why);
      assert.ok(!d[0].includes("secret-7f3a"), `${why}: the script text leaked`);
    });
  }
  // an added level-gate script (e2e pinned, a second e2e gate appears)
  withWorld({ scripts: { "test:e2e": "playwright test" }, results: { "test:e2e": "playwright-json" }, files: {} }, (root) => {
    const pin = pinOf(root, ["e2e"]);
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { "test:e2e": "playwright test", e2e: "playwright test" } }));
    assert.deepEqual(testInfraReds({ recorded: pin, root }), ["gate e2e: a package.json script was added"]);
  });
  // control: a non-level script and a dependency change are NOT test infrastructure
  withWorld({}, (root) => {
    const pin = pinOf(root);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ scripts: { test: SCRIPT_SECRET, lint: "eslint --fix ." }, dependencies: { x: "1" } })
    );
    writeFileSync(join(root, "README.md"), "changed\n");
    assert.deepEqual(testInfraReds({ recorded: pin, root }), []);
  });
});

test("the closed config-name set: the five runner bases × seven extensions at the root, nothing else — matched FOLDED (6.21.0)", () => {
  for (const base of ["vitest.config", "vitest.workspace", "vite.config", "playwright.config", "jest.config"]) {
    for (const ext of ["js", "mjs", "cjs", "ts", "mts", "cts", "json"]) {
      assert.ok(isRunnerConfigName(`${base}.${ext}`), `${base}.${ext}`);
      assert.ok(CONFIG_NAME_RE.test(`${base}.${ext}`), `the regex holds the folded (lowercase) spelling: ${base}.${ext}`);
    }
  }
  for (const n of ["vitest.config", "vitest.config.jsx", "my.vitest.config.ts", "vitest.setup.ts", "tsconfig.json", "jest.config.ts.bak"]) {
    assert.ok(!isRunnerConfigName(n), n);
  }
  // 6.21.0 REVERSES the old assertion that `VITEST.CONFIG.TS` is NOT a member, deliberately: vite/vitest look their
  // config up by the lowercase name, so on a case-insensitive volume a case variant IS the runner's config.
  for (const n of ["VITEST.CONFIG.TS", "Vitest.config.mjs", "vite.config.TS", "Playwright.Config.ts", "viteſt.config.ts"]) {
    assert.ok(isRunnerConfigName(n), n);
  }
  assert.ok(isRunnerConfigName("vite.config.ts".normalize("NFD")), "an NFD spelling (identical for ASCII) is a member");
  assert.equal(isRunnerConfigName(null), false);
  assert.equal(isRunnerConfigName(undefined), false);
});

// ── 6.21.0: a case-variant config is pinned (finding 2) — ONE spelling per directory, so APFS and CI's Linux agree ──

test("6.21.0: a case-variant runner config added after the pin is `a runner config was added` (the review's repro)", () => {
  withWorld({ files: {} }, (root) => {
    const pin = pinOf(root);
    assert.deepEqual(pin.configs, [], "precondition: no config when the pin was taken");
    writeFileSync(join(root, "Vitest.config.ts"), "export default { test: { passWithNoTests: true } }\n");
    assert.deepEqual(testInfraReds({ recorded: pin, root }), ["Vitest.config.ts: a runner config was added"]);
  });
  withWorld({ files: { "Vitest.config.mjs": "export default {}\n" } }, (root) => {
    const pin = pinOf(root);
    assert.deepEqual(
      pin.configs.map((c) => c.path),
      ["Vitest.config.mjs"],
      "a case-variant config present at pin time is pinned under its on-disk spelling"
    );
    assert.equal(pinShapeError(pin), null, "and a pin recording that spelling is shape-valid");
    writeFileSync(join(root, "Vitest.config.mjs"), "export default { test: { include: ['nomatch/**'] } }\n");
    assert.deepEqual(testInfraReds({ recorded: pin, root }), ["Vitest.config.mjs: the runner config changed"]);
  });
});

test("6.21.0: testInfraPathKind reads a PLAN `## Files` entry as the setter scopes it — root config, manifest, or nothing", () => {
  const cases = [
    ["vite.config.ts", "config"],
    ["Vite.config.ts", "config"],
    ["vite.config.ts (new alias)", "config"],
    ["jest.config.cjs", "config"],
    ["vitest.workspace.json", "config"],
    ["package.json", "manifest"],
    ["Package.json", "manifest"],
    ["pharn.config.json (testResults unchanged)", "manifest"],
    ["./vite.config.ts", null], // the write guard matches it literally: it does not open the root file to the build
    ["web/vite.config.ts", null], // not at the root — not pinned
    ["packages/a/package.json", null],
    ["*.config.ts", null], // a glob: the setter drops it
    ["<config>", null], // a placeholder: the setter drops it
    ["src/demo.js", null],
    ["tsconfig.json", null],
    ["", null],
  ];
  for (const [entry, kind] of cases) assert.equal(testInfraPathKind(entry), kind, JSON.stringify(entry));
  assert.equal(testInfraPathKind(null), null);
  assert.deepEqual(PIN_MANIFESTS, ["package.json", "pharn.config.json"]);
});

test("✧ L36 CLOSURE — every non-test floor module tests the config-name regex only through isRunnerConfigName (one copy)", () => {
  const floor = dirname(fileURLToPath(import.meta.url));
  const modules = readdirSync(floor).filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"));
  assert.ok(modules.length > 20, "precondition: the floor was enumerated");
  const hits = [];
  for (const f of modules) {
    const src = readFileSync(join(floor, f), "utf8");
    for (const m of src.matchAll(/CONFIG_NAME_RE\.test\(/g)) hits.push(`${f}@${m.index}`);
    if (f !== "test-infra-core.mjs" && /\/\^\(\?:vitest\\\.config/.test(src)) hits.push(`${f}: a second copy of the regex`);
  }
  assert.equal(hits.length, 1, JSON.stringify(hits));
  assert.match(hits[0], /^test-infra-core\.mjs@/);
  const core = readFileSync(join(floor, "test-infra-core.mjs"), "utf8");
  assert.match(core, /return typeof name === "string" && CONFIG_NAME_RE\.test\(foldName\(name\)\);/, "the one use folds first");
  assert.match(readFileSync(join(floor, "check-ac-tests.mjs"), "utf8"), /import \{ testInfraPathKind \} from "\.\/test-infra-core\.mjs";/);
});

test("REFUSED, never hashed through: a symlinked or non-regular config (L59); an unparseable or non-string manifest", () => {
  withWorld({ files: { "real.ts": "export default {}\n" } }, (root) => {
    symlinkSync(join(root, "real.ts"), join(root, "vitest.config.ts"));
    const r = computeTestInfra({ root, levels: ["unit"] });
    assert.equal(r.ok, false);
    assert.match(r.reason, /vitest\.config\.ts is a symlink/);
  });
  withWorld({ files: {} }, (root) => {
    mkdirSync(join(root, "jest.config.js"));
    const r = computeTestInfra({ root, levels: ["unit"] });
    assert.equal(r.ok, false);
    assert.match(r.reason, /jest\.config\.js is not a regular file/);
  });
  withWorld({}, (root) => {
    writeFileSync(join(root, "package.json"), "{ not json");
    const r = computeTestInfra({ root, levels: ["unit"] });
    assert.equal(r.ok, false);
    assert.match(r.reason, /package\.json is not valid JSON/);
  });
  withWorld({ scripts: { test: 5 } }, (root) => {
    assert.match(computeTestInfra({ root, levels: ["unit"] }).reason, /script "test" is not a string/);
  });
  withWorld({}, (root) => {
    const pin = pinOf(root);
    writeFileSync(join(root, "package.json"), "{ not json");
    const d = testInfraReds({ recorded: pin, root });
    assert.equal(d.length, 1);
    assert.match(d[0], /cannot be pinned now: package\.json is not valid JSON/);
  });
});

test("no package.json pins no gates (a scratch project); inputs are required (L41)", () => {
  withWorld({ scripts: null, results: null, files: {} }, (root) => {
    assert.deepEqual(pinOf(root), { levels: ["unit"], gates: [], configs: [] });
  });
  assert.throws(() => computeTestInfra({ levels: ["unit"] }), TypeError);
  assert.throws(() => computeTestInfra({ root: "/x", levels: [] }), TypeError);
  assert.throws(() => computeTestInfra({ root: "/x", levels: ["smoke"] }), TypeError);
});

test("pinShapeError closes every level (L36): keys, levels, gate entries, config entries, order", () => {
  const good = {
    levels: ["unit"],
    gates: [{ id: "test", script: "v", pre: null, post: "p", results: "vitest-json" }],
    configs: [{ path: "vitest.config.ts", sha256: "a".repeat(64) }],
  };
  assert.equal(pinShapeError(good), null);
  assert.deepEqual([...PIN_KEYS].sort(), ["configs", "gates", "levels"]);
  const bad = [
    ["null", null],
    ["extra key", { ...good, extra: 1 }],
    ["missing key", { levels: good.levels, gates: good.gates }],
    ["levels empty", { ...good, levels: [] }],
    ["level unknown", { ...good, levels: ["smoke"] }],
    ["levels unsorted", { ...good, levels: ["unit", "e2e"] }],
    ["gate extra key", { ...good, gates: [{ ...good.gates[0], x: 1 }] }],
    ["gate not a level gate", { ...good, gates: [{ ...good.gates[0], id: "lint" }] }],
    ["script not a string", { ...good, gates: [{ ...good.gates[0], script: 1 }] }],
    ["pre not a string or null", { ...good, gates: [{ ...good.gates[0], pre: 1 }] }],
    ["post missing", { ...good, gates: [{ id: "test", script: "v", pre: null, results: "vitest-json" }] }],
    ["results outside the set", { ...good, gates: [{ ...good.gates[0], results: "junit" }] }],
    ["gates duplicated", { ...good, gates: [good.gates[0], good.gates[0]] }],
    ["config name outside the set", { ...good, configs: [{ path: "tsconfig.json", sha256: "a".repeat(64) }] }],
    ["config sha not hex", { ...good, configs: [{ path: "vitest.config.ts", sha256: "x" }] }],
    [
      "configs unsorted",
      {
        ...good,
        configs: [
          { path: "vitest.config.ts", sha256: "a".repeat(64) },
          { path: "vite.config.ts", sha256: "a".repeat(64) },
        ],
      },
    ],
  ];
  for (const [why, pin] of bad) assert.notEqual(pinShapeError(pin), null, why);
  assert.deepEqual(RESULTS_VALUES, [...RESULTS_VALUES].sort());
  assert.ok(RESULTS_VALUES.includes("not-configured") && RESULTS_VALUES.includes("config-invalid"));
});

test("diffTestInfra is symmetric in what it names: an added gate and a removed one are different lines", () => {
  const a = { levels: ["e2e"], gates: [{ id: "e2e", script: "x", pre: null, post: null, results: "playwright-json" }], configs: [] };
  const b = { levels: ["e2e"], gates: [{ id: "test:e2e", script: "x", pre: null, post: null, results: "playwright-json" }], configs: [] };
  const c = { ...a, gates: [{ ...a.gates[0], pre: "x", post: null }] };
  const d = { ...a, gates: [{ ...a.gates[0], pre: "y", post: null }] };
  assert.deepEqual(diffTestInfra(c, d), ["gate e2e: its pree2e script changed"]);
  assert.deepEqual(diffTestInfra(c, a), ["gate e2e: its pree2e script is gone"]);
  assert.deepEqual(diffTestInfra(a, b), ["gate e2e: its package.json script is gone", "gate test:e2e: a package.json script was added"]);
  assert.deepEqual(diffTestInfra(a, a), []);
});
