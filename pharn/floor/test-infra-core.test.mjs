// pharn/floor/test-infra-core.test.mjs — the test-infrastructure pin's suite. Each kind of change is one mutation of a
// pinned world that the diff names, and only that one (L52); the shape is closed at every level (L36); a symlinked config
// or script-named file is refused, never hashed through (L59). 6.30.0: every member of the token pass's closed sets is
// reached, each rule clause with a control (L60), and the bounds the header states are PROBED, so a later widening of
// the rule fails here until the header's NOT-caught list moves with it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHAINED_KEYS,
  CONFIG_NAME_RE,
  EXECUTED_EXTENSIONS,
  LIFECYCLE_WORDS,
  MAX_CHAIN_HOPS,
  PACKAGE_MANAGERS,
  PACKAGE_MANAGER_CONFIGS,
  PIN_KEYS,
  PIN_KEYS_V3,
  PIN_MANIFESTS,
  RUN_WORDS,
  SCRIPT_FILE_KEYS,
  SHORTHAND_MANAGERS,
  TEST_WORDS,
  chainedIds,
  isPackageManagerConfigName,
  isPinnedConfigName,
  isRunnerConfigName,
  scriptNamedFiles,
  scriptPathCandidates,
  scriptTokens,
  scriptWalk,
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
const HERE = dirname(fileURLToPath(import.meta.url));

/** A project root with a package.json (`scripts` plus any other `pkg` keys), a pharn.config.json (`testResults`) and
 *  files (nested paths create their directories). */
function world({
  scripts = { test: SCRIPT_SECRET, lint: "eslint ." },
  results = { test: "vitest-json" },
  files = { "vitest.config.ts": "export default {}\n" },
  pkg = {},
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "tic-"));
  if (scripts !== null) writeFileSync(join(root, "package.json"), JSON.stringify({ name: "p", ...pkg, scripts }));
  if (results !== null) writeFileSync(join(root, "pharn.config.json"), JSON.stringify({ testResults: results }));
  for (const [f, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), body);
  }
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
const rewritePkg = (root, edit) => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  edit(pkg);
  writeFileSync(join(root, "package.json"), JSON.stringify(pkg));
};
const HOLDS = { changed: [], unpinned: [] };

test("the pin: the level gates' script values and results formats, the root runner configs — and NOT other scripts", () => {
  withWorld({}, (root) => {
    const pin = pinOf(root);
    assert.deepEqual(pin, {
      levels: ["unit"],
      gates: [{ id: "test", script: SCRIPT_SECRET, pre: null, post: null, results: "vitest-json" }],
      chained: [],
      configs: [{ path: "vitest.config.ts", sha256: sha256RegularFile(join(root, "vitest.config.ts")) }],
      script_files: [],
      jest: null,
    });
    assert.equal(pinShapeError(pin, { version: 4 }), null);
    assert.deepEqual(testInfraReds({ recorded: pin, root }), HOLDS, "a pin holds over the tree it was taken from");
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
      assert.equal(d.changed.length, 1, `${why}: ${JSON.stringify(d)}`);
      assert.match(d.changed[0], re, why);
      assert.deepEqual(d.unpinned, [], `${why}: a /4 pin has nothing unpinned`);
      assert.ok(!d.changed[0].includes("secret-7f3a"), `${why}: the script text leaked`);
    });
  }
  // an added level-gate script (e2e pinned, a second e2e gate appears)
  withWorld({ scripts: { "test:e2e": "playwright test" }, results: { "test:e2e": "playwright-json" }, files: {} }, (root) => {
    const pin = pinOf(root, ["e2e"]);
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { "test:e2e": "playwright test", e2e: "playwright test" } }));
    assert.deepEqual(testInfraReds({ recorded: pin, root }).changed, ["gate e2e: a package.json script was added"]);
  });
  // control: a non-level script and a dependency change are NOT test infrastructure
  withWorld({}, (root) => {
    const pin = pinOf(root);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ scripts: { test: SCRIPT_SECRET, lint: "eslint --fix ." }, dependencies: { x: "1" } })
    );
    writeFileSync(join(root, "README.md"), "changed\n");
    assert.deepEqual(testInfraReds({ recorded: pin, root }), HOLDS);
  });
});

// ── 6.30.0: what a level gate RUNS — the scripts it chains to, the files its scripts name, the jest key, the package
// manager's config (the review's H2 and the GATE-1 amendment) ────────────────────────────────────────────────────────

const RICH = {
  scripts: {
    test: "npm run test:unit -- --reporter=./tools/reporter.mjs",
    pretest: "node scripts/prepare.mjs",
    "test:unit": "vitest run --secret-7f3a --globalSetup=./tools/setup.mjs && npm run later",
    lint: "eslint .",
  },
  results: { test: "pharn-json" },
  files: {
    "tools/reporter.mjs": "export default class Reporter {}\n",
    "scripts/prepare.mjs": "// prepare\n",
    ".npmrc": "fund=false\n",
    "src/demo.js": "export const f = () => 1;\n",
  },
  pkg: { jest: { testEnvironment: "node", reporters: ["default"] } },
};

test("6.30.0: the /4 pin — a chained script, the files the scripts name, the jest key and .npmrc, each recorded", () => {
  withWorld(RICH, (root) => {
    const pin = pinOf(root);
    assert.deepEqual(pin.gates, [
      {
        id: "test",
        script: RICH.scripts.test,
        pre: RICH.scripts.pretest,
        post: null,
        results: "pharn-json",
      },
    ]);
    assert.deepEqual(pin.chained, [{ id: "test:unit", script: RICH.scripts["test:unit"], pre: null, post: null }]);
    assert.deepEqual(
      pin.configs.map((c) => c.path),
      [".npmrc"]
    );
    // `tools/setup.mjs` is named but absent, so nothing is recorded for it (its later creation is `was added`, below)
    assert.deepEqual(pin.script_files, [
      { path: "scripts/prepare.mjs", sha256: sha256RegularFile(join(root, "scripts/prepare.mjs")) },
      { path: "tools/reporter.mjs", sha256: sha256RegularFile(join(root, "tools/reporter.mjs")) },
    ]);
    assert.match(pin.jest, /^[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(pin).includes("testEnvironment"), false, "the jest key is a digest, never its value");
    assert.equal(pinShapeError(pin, { version: 4 }), null);
    assert.deepEqual(testInfraReds({ recorded: pin, root }), HOLDS);
  });
});

test("6.30.0: each /4 change is named and trips only itself (L52) — never a script's text or a file's content (P2)", () => {
  const cases = [
    [
      "chained value changed",
      (r) => rewritePkg(r, (p) => (p.scripts["test:unit"] = "vitest run")),
      ['chained script "test:unit": its value changed'],
    ],
    [
      "chained pre added",
      (r) => rewritePkg(r, (p) => (p.scripts["pretest:unit"] = "echo")),
      ['chained script "test:unit": its pre-script was added'],
    ],
    [
      "chained post added",
      (r) => rewritePkg(r, (p) => (p.scripts["posttest:unit"] = "echo")),
      ['chained script "test:unit": its post-script was added'],
    ],
    [
      "chained script removed",
      (r) => rewritePkg(r, (p) => delete p.scripts["test:unit"]),
      ['chained script "test:unit": the level gates no longer reach it, or it is gone'],
    ],
    [
      "an id that named no script becomes one (own-property, L15)",
      (r) => rewritePkg(r, (p) => (p.scripts.later = "echo")),
      ['chained script "later": a level gate now reaches it'],
    ],
    [
      "the chain is dropped from the gate",
      (r) => rewritePkg(r, (p) => (p.scripts.test = "vitest run --reporter=./tools/reporter.mjs")),
      ["gate test: its package.json script changed", 'chained script "test:unit": the level gates no longer reach it, or it is gone'],
    ],
    [
      "script-named file changed",
      (r) => writeFileSync(join(r, "tools/reporter.mjs"), "export default class R { onTestEnd() {} }\n"),
      ["tools/reporter.mjs: a file a level gate's script names changed"],
    ],
    [
      "script-named file removed",
      (r) => rmSync(join(r, "scripts/prepare.mjs")),
      ["scripts/prepare.mjs: a file a level gate's script names is gone"],
    ],
    [
      "script-named file created (named but absent at pin time)",
      (r) => writeFileSync(join(r, "tools/setup.mjs"), "export default () => {}\n"),
      ["tools/setup.mjs: a file a level gate's script names was added"],
    ],
    [
      "jest key changed",
      (r) => rewritePkg(r, (p) => (p.jest.testResultsProcessor = "./tools/forge.cjs")),
      ["package.json's jest key changed"],
    ],
    ["jest key removed", (r) => rewritePkg(r, (p) => delete p.jest), ["package.json's jest key is gone"]],
    [
      ".npmrc changed",
      (r) => writeFileSync(join(r, ".npmrc"), "script-shell=./tools/forge-shell.sh\n"),
      [".npmrc: the package-manager config changed"],
    ],
    [".npmrc removed", (r) => rmSync(join(r, ".npmrc")), [".npmrc: the package-manager config is gone"]],
    [
      ".yarnrc.yml added",
      (r) => writeFileSync(join(r, ".yarnrc.yml"), "yarnPath: ./x.cjs\n"),
      [".yarnrc.yml: a package-manager config was added"],
    ],
  ];
  for (const [why, mutate, want] of cases) {
    withWorld(RICH, (root) => {
      const pin = pinOf(root);
      mutate(root);
      const d = testInfraReds({ recorded: pin, root });
      assert.deepEqual(d, { changed: want, unpinned: [] }, why);
      for (const line of d.changed) assert.ok(!/secret-7f3a|forge|testEnvironment|fund=/.test(line), `${why}: content leaked: ${line}`);
    });
  }
  // the jest key ADDED to a tree that had none
  withWorld({}, (root) => {
    const pin = pinOf(root);
    rewritePkg(root, (p) => (p.jest = { testResultsProcessor: "./x.cjs" }));
    assert.deepEqual(testInfraReds({ recorded: pin, root }), { changed: ["package.json's jest key was added"], unpinned: [] });
  });
  // CONTROLS — none of these is test infrastructure the pin reads (each one alone)
  const controls = [
    ["an unreached script", (r) => rewritePkg(r, (p) => (p.scripts.lint = "eslint --fix ."))],
    ["a dependency", (r) => rewritePkg(r, (p) => (p.dependencies = { x: "1" }))],
    ["a source file no script names", (r) => writeFileSync(join(r, "src/demo.js"), "export const f = () => 2;\n")],
    [
      "the jest key's keys reordered (canonical form)",
      (r) => rewritePkg(r, (p) => (p.jest = { reporters: ["default"], testEnvironment: "node" })),
    ],
    ["a package-manager config outside the closed set", (r) => writeFileSync(join(r, ".pnpmfile.cjs"), "module.exports = {}\n")],
    ["tsconfig", (r) => writeFileSync(join(r, "tsconfig.json"), "{}\n")],
  ];
  for (const [why, mutate] of controls) {
    withWorld(RICH, (root) => {
      const pin = pinOf(root);
      mutate(root);
      assert.deepEqual(testInfraReds({ recorded: pin, root }), HOLDS, why);
    });
  }
});

test("6.30.0: the jest digest is canonical — object keys sorted at every level, array order kept, a __proto__ key a key", () => {
  const digest = (jestText) =>
    withWorld({ files: {} }, (root) => {
      writeFileSync(join(root, "package.json"), `{"scripts":{"test":"vitest run"},"jest":${jestText}}`);
      return pinOf(root).jest;
    });
  assert.equal(digest('{"b":1,"a":{"d":1,"c":2}}'), digest('{"a":{"c":2,"d":1},"b":1}'), "nested key order is not a change");
  assert.notEqual(digest('{"a":[1,2]}'), digest('{"a":[2,1]}'), "array order IS a change");
  assert.notEqual(digest('{"a":1}'), digest('{"a":1,"__proto__":{"x":1}}'), "an own __proto__ key is pinned, never dropped");
  assert.notEqual(digest("null"), null, "a present `jest: null` is pinned, unlike an absent key");
  // a key nested past what the engine can serialize is REFUSED — never a digest of part of it
  withWorld({ files: {} }, (root) => {
    const depth = 200000;
    writeFileSync(join(root, "package.json"), `{"scripts":{"test":"vitest run"},"jest":${"[".repeat(depth)}${"]".repeat(depth)}}`);
    const r = computeTestInfra({ root, levels: ["unit"] });
    assert.equal(r.ok, false);
    assert.match(r.reason, /jest` key cannot be written in canonical form/);
  });
});

test("6.30.0 THE TOKEN PASS — scriptTokens splits on whitespace and ; & | ( ), and strips one pair of matching quotes", () => {
  assert.deepEqual(scriptTokens("a  b\tc\nd"), ["a", "b", "c", "d"]);
  assert.deepEqual(scriptTokens("a;b&&c||d|e&f"), ["a", "b", "c", "d", "e", "f"]);
  assert.deepEqual(scriptTokens("(a) (b)"), ["a", "b"]);
  assert.deepEqual(scriptTokens(`"x.js" 'y.js' "z.js' "`), ["x.js", "y.js", `"z.js'`, `"`]);
  assert.deepEqual(scriptTokens(""), []);
  for (const v of [null, undefined, 1, {}, []]) assert.deepEqual(scriptTokens(v), [], JSON.stringify(v));
});

test("6.30.0 THE TOKEN PASS — scriptPathCandidates: every clause of the closed rule, each with a control (L60)", () => {
  const is = (value, want, why) => assert.deepEqual(scriptPathCandidates(value), want, `${why}: ${JSON.stringify(value)}`);
  is("node tools/a.mjs", ["tools/a.mjs"], "a relative path with an executed extension");
  is("node ./tools/a.mjs", ["tools/a.mjs"], "a leading ./ is stripped");
  is("node ././tools/a.mjs", ["tools/a.mjs"], "every leading ./ is stripped");
  is("vitest --reporter=./tools/a.mjs", ["tools/a.mjs"], "a --flag=path yields the path");
  is("A=tools/a.mjs node x", ["tools/a.mjs"], "a VAR=path yields the path");
  is("node TOOLS/A.MJS", ["TOOLS/A.MJS"], "the extension is matched lowercased; the path is kept as spelled");
  for (const ext of EXECUTED_EXTENSIONS) is(`run a${ext}`, [`a${ext}`], `the executed extension ${ext}`);
  for (const other of ["a.json", "a.md", "a.yml", "a", "a.mjs.bak", "a.d", ".mjs"]) is(`run ${other}`, [], "an extension outside the set");
  is("run -a.js", [], "led by -");
  is("run /abs/a.js", [], "absolute");
  is("run ../a.js", [], "a .. segment");
  is("run a/../b.js", [], "a .. segment inside");
  is("run a/./b.js", [], "a . segment inside");
  is("run a//b.js", [], "an empty segment");
  is("run a/b.js/", [], "a trailing slash (an empty last segment)");
  for (const ch of ["$", "`", "\\", "'", "*", "?", "[", "]", "{", "}", "<", ">", "!", "#", "~"]) {
    is(`run a${ch}b.js`, [], `the character ${ch}`);
  }
  is("run a\u0001b.js", [], "a control character");
  is("run a\u007fb.js", [], "DEL");
  is("run node_modules/x/cli.js", [], "a dependency (node_modules first)");
  is("run lib/node_modules/x.js", ["lib/node_modules/x.js"], "node_modules deeper is not a dependency root");
  is("run .pharn/x.mjs", [], "runtime scratch (.pharn first)");
  is(`run ${"a/".repeat(600)}x.js`, [], "over the length bound");
  // outputs are never pinned: the token after an OUTPUT redirect, after -o, after or inside an --out… flag
  for (const op of [">", ">>", "2>", "2>>", "&>", "&>>", ">|"]) {
    is(`node a.js ${op} out.js`, ["a.js"], `the output redirect ${op}`);
  }
  // an INPUT redirect's target IS a candidate: `node < tools/x.mjs` executes it (control for the rule above)
  for (const op of ["<", "0<", "<<", "<<<"]) {
    is(`node a.js ${op} in.js`, ["a.js", "in.js"], `the input redirect ${op}`);
  }
  is("node < tools/x.mjs", ["tools/x.mjs"], "a script fed to node on stdin");
  is("tsup src/i.ts -o dist/i.js", ["src/i.ts"], "-o");
  is("esbuild src/i.ts --outfile=dist/i.js", ["src/i.ts"], "--outfile=");
  is("tsc --outDir build/x.js", [], "--outDir <path>");
  is("vitest --outputFile=res.js", [], "--outputFile=");
  is("vitest --outputFile res.js", [], "--outputFile <path>");
  is("x --OUTPUT y.js", [], "matched case-insensitively");
  is("x --o y.js", ["y.js"], "control: --o is not an --out… flag");
  is("x -O y.js", ["y.js"], "control: -O is not -o");
  // a quoted path with a space is split by the tokenizer and read by no clause
  is(`node "tools/my reporter.mjs"`, [], "a path with whitespace");
  is("node 'tools/a.mjs'", ["tools/a.mjs"], "one pair of quotes is stripped");
  // sorted and unique
  is("node b.js a.js b.js", ["a.js", "b.js"], "sorted, unique");
});

test("6.30.0 THE TOKEN PASS — chainedIds: each package manager × each word of the closed sets (L60)", () => {
  assert.deepEqual(PACKAGE_MANAGERS, ["npm", "pnpm", "yarn"]);
  assert.deepEqual(RUN_WORDS, ["rum", "run", "run-script", "urn"]);
  assert.deepEqual(TEST_WORDS, ["t", "test", "tst"]);
  assert.deepEqual(LIFECYCLE_WORDS, ["restart", "start", "stop"]);
  assert.deepEqual(SHORTHAND_MANAGERS, ["pnpm", "yarn"]);
  for (const pm of PACKAGE_MANAGERS) {
    for (const w of RUN_WORDS) {
      assert.deepEqual(chainedIds(`${pm} ${w} x:y`), ["x:y"], `${pm} ${w}`);
      assert.deepEqual(chainedIds(`${pm} --silent ${w} --if-present x:y -- --z`), ["x:y"], `${pm} ${w}, flags skipped`);
      assert.deepEqual(chainedIds(`${pm} ${w}`), [], `${pm} ${w} with no id`);
    }
    for (const w of TEST_WORDS) {
      const want = SHORTHAND_MANAGERS.includes(pm) && w !== "test" ? ["test", w] : ["test"];
      assert.deepEqual(chainedIds(`${pm} ${w}`), want, `${pm} ${w}`);
    }
    assert.deepEqual(chainedIds(`${pm} restart`), ["restart", "stop", "start"], `${pm} restart`);
    assert.deepEqual(chainedIds(`${pm} start`), ["start"], `${pm} start`);
    assert.deepEqual(chainedIds(`${pm} stop`), ["stop"], `${pm} stop`);
    assert.deepEqual(chainedIds(`${pm} build`), SHORTHAND_MANAGERS.includes(pm) ? ["build"] : [], `${pm} <script> shorthand`);
    assert.deepEqual(chainedIds(`${pm} -r build`), SHORTHAND_MANAGERS.includes(pm) ? ["build"] : [], `${pm} -r <script>`);
    assert.deepEqual(chainedIds(pm), [], `${pm} alone`);
  }
  assert.deepEqual(chainedIds("node --run gen"), ["gen"], "node --run <id>");
  assert.deepEqual(chainedIds("node --run=gen"), ["gen"], "node --run=<id>");
  assert.deepEqual(chainedIds("node --inspect --run gen"), ["gen"], "among node's leading flags");
  assert.deepEqual(chainedIds("node x.js --run gen"), [], "control: --run after a script operand is the script's own flag");
  assert.deepEqual(chainedIds("npm run a && pnpm run b ; yarn c"), ["a", "b", "c"], "every chain in one value");
  assert.deepEqual(chainedIds("npm run a && npm run a"), ["a"], "unique");
  for (const v of ["npx a", "bun run a", "run a", "vitest run a", "npm-run-all a", "run-s a", "npm exec a"]) {
    assert.deepEqual(chainedIds(v), [], `not in the closed rule: ${v}`);
  }
});

test("6.30.0 scriptWalk: transitive, own-property only (L15), cycles stop, pre/post walked, the hop bound REFUSES", () => {
  const walk = (scripts) =>
    scriptWalk({
      scripts,
      gates: [{ id: "test", script: scripts.test, pre: scripts.pretest ?? null, post: scripts.posttest ?? null }],
    });
  // own-property: an inherited name pins nothing; an own `__proto__` key (JSON.parse makes one) is a script
  const inherited = walk({ test: "npm run toString && npm run constructor && npm run hasOwnProperty && npm run __proto__" });
  assert.deepEqual(inherited, { ok: true, chained: [], candidates: [] });
  const own = JSON.parse('{"test":"npm run __proto__ && npm run toString","__proto__":"node a.js","toString":"echo"}');
  assert.deepEqual(
    walk(own).chained.map((c) => c.id),
    ["__proto__", "toString"]
  );
  assert.deepEqual(walk(own).candidates, ["a.js"]);
  // cycles and self-reference stop; the gate's own pre/post are not repeated as chains
  assert.deepEqual(
    walk({ test: "npm run a", a: "npm run b", b: "npm run a && npm run test && npm run pretest", pretest: "echo" }).chained.map(
      (c) => c.id
    ),
    ["a", "b"]
  );
  // a chained script's pre/post are pinned with it, and walked
  const pp = walk({ test: "npm run a", a: "echo", prea: "npm run b", posta: "node p.js", b: "node q.js" });
  assert.deepEqual(pp.chained, [
    { id: "a", script: "echo", pre: "npm run b", post: "node p.js" },
    { id: "b", script: "node q.js", pre: null, post: null },
  ]);
  assert.deepEqual(pp.candidates, ["p.js", "q.js"]);
  // the hop bound: a chain of exactly MAX_CHAIN_HOPS hops is read; one more is refused, never read in part
  assert.equal(MAX_CHAIN_HOPS, 8);
  const chain = (n) => {
    const s = { test: "npm run c1" };
    for (let i = 1; i <= n; i++) s[`c${i}`] = i < n ? `npm run c${i + 1}` : "node last.js";
    return s;
  };
  const ok = walk(chain(MAX_CHAIN_HOPS));
  assert.equal(ok.ok, true);
  assert.equal(ok.chained.length, MAX_CHAIN_HOPS);
  assert.deepEqual(ok.candidates, ["last.js"]);
  const deep = walk(chain(MAX_CHAIN_HOPS + 1));
  assert.equal(deep.ok, false);
  assert.match(deep.reason, /chain deeper than 8 hops \(at "c9"\)/);
  // a chained value that is not a string, or is oversized, REFUSES — never read as "no script" (grill 4)
  assert.match(walk({ test: "npm run a", a: 5 }).reason, /script "a" is not a string/);
  assert.match(walk({ test: "npm run a", a: "echo", prea: ["x"] }).reason, /script "prea" is not a string/);
  assert.match(walk({ test: "npm run a", a: "x".repeat(65537) }).reason, /script "a" is over 65536 characters/);
  // a chain to a script whose NAME is over 1024 characters refuses; one that names no script pins nothing (control)
  const longId = "x".repeat(1025);
  assert.match(walk({ test: `npm run ${longId}`, [longId]: "echo" }).reason, /whose name is over 1024 characters/);
  assert.deepEqual(walk({ test: `npm run ${longId}` }), { ok: true, chained: [], candidates: [] });
  // no scripts object: nothing to walk
  assert.deepEqual(scriptWalk({ scripts: null, gates: [] }), { ok: true, chained: [], candidates: [] });
  assert.deepEqual(scriptWalk({ scripts: ["x"], gates: [] }), { ok: true, chained: [], candidates: [] });
});

test("6.30.0: a script-named file is pinned only as a readable regular file — every other kind refuses or is skipped (L59)", () => {
  const base = { scripts: { test: "vitest run --reporter=./tools/r.mjs" }, results: { test: "pharn-json" }, files: { "real.mjs": "x\n" } };
  const rows = [
    ["a regular file", (r) => writeFileSync(join(r, "tools/r.mjs"), "x\n"), { pinned: true }],
    ["absent", () => {}, { pinned: false }],
    ["a directory", (r) => mkdirSync(join(r, "tools/r.mjs")), { pinned: false }],
    [
      "a path whose parent is a file (ENOTDIR)",
      (r) => (rmSync(join(r, "tools"), { recursive: true }), writeFileSync(join(r, "tools"), "")),
      { pinned: false },
    ],
    ["a symlink to a file", (r) => symlinkSync(join(r, "real.mjs"), join(r, "tools/r.mjs")), { refused: /tools\/r\.mjs .* is a symlink/ }],
    ["a symlink to a directory", (r) => symlinkSync(r, join(r, "tools/r.mjs")), { refused: /is a symlink/ }],
    ["a dangling symlink", (r) => symlinkSync(join(r, "nowhere.mjs"), join(r, "tools/r.mjs")), { refused: /is a symlink/ }],
  ];
  // Skipped as root, where chmod 000 does not stop a read (stated, not silently passed).
  if (process.getuid?.() !== 0) {
    rows.push([
      "an unreadable file (chmod 000)",
      (r) => {
        writeFileSync(join(r, "tools/r.mjs"), "x\n");
        chmodSync(join(r, "tools/r.mjs"), 0o000);
      },
      { refused: /tools\/r\.mjs .* is unreadable/, after: (r) => chmodSync(join(r, "tools/r.mjs"), 0o600) },
    ]);
  }
  for (const [why, make, want] of rows) {
    withWorld(base, (root) => {
      mkdirSync(join(root, "tools"), { recursive: true });
      make(root);
      try {
        const r = computeTestInfra({ root, levels: ["unit"] });
        if (want.refused) {
          assert.equal(r.ok, false, why);
          assert.match(r.reason, want.refused, why);
        } else {
          assert.equal(r.ok, true, `${why}: ${r.reason}`);
          assert.deepEqual(
            r.pin.script_files.map((f) => f.path),
            want.pinned ? ["tools/r.mjs"] : [],
            why
          );
        }
      } finally {
        want.after?.(root);
      }
    });
  }
});

test("6.30.0: output-named and dependency files stay out; a SOURCE file a chain names literally IS pinned (the stated cost)", () => {
  withWorld(
    {
      scripts: {
        test: "vitest run",
        pretest: "npm run build",
        build: "tsup src/index.ts -o dist/index.js && node node_modules/x/cli.js > dist/log.js",
      },
      files: { "src/index.ts": "export {}\n", "dist/index.js": "", "dist/log.js": "" },
    },
    (root) => {
      const pin = pinOf(root);
      assert.deepEqual(
        pin.script_files.map((f) => f.path),
        ["src/index.ts"],
        "the bundler entry is pinned; its -o output, a redirect target and node_modules are not"
      );
      writeFileSync(join(root, "src/index.ts"), "export const x = 1;\n");
      assert.deepEqual(testInfraReds({ recorded: pin, root }).changed, ["src/index.ts: a file a level gate's script names changed"]);
    }
  );
});

test("6.30.0 STATED BOUNDS, probed — each is outside the pin today, so widening the rule fails here until the header moves", () => {
  const probes = [
    [
      "an import of a pinned file is not followed",
      { scripts: { test: "node tools/r.mjs" }, files: { "tools/r.mjs": "import './h.mjs'\n", "tools/h.mjs": "1\n" } },
      (r) => writeFileSync(join(r, "tools/h.mjs"), "2\n"),
    ],
    [
      "a chain through another runner (run-s)",
      { scripts: { test: "run-s test:unit", "test:unit": "vitest run" }, files: {} },
      (r) => rewritePkg(r, (p) => (p.scripts["test:unit"] = "vitest run --passWithNoTests")),
    ],
    [
      "a chain through bun",
      { scripts: { test: "bun run test:unit", "test:unit": "vitest run" }, files: {} },
      (r) => rewritePkg(r, (p) => (p.scripts["test:unit"] = "true")),
    ],
    [
      "a chain after a flag whose value is a separate token",
      { scripts: { test: "npm --prefix sub run x", x: "vitest run" }, files: {} },
      (r) => rewritePkg(r, (p) => (p.scripts.x = "true")),
    ],
    [
      "another package.json key a runner reads (mocha)",
      { scripts: { test: "mocha" }, files: {}, pkg: { mocha: { spec: "a" } } },
      (r) => rewritePkg(r, (p) => (p.mocha = { spec: "b" })),
    ],
    [
      "a JSON config a script names",
      { scripts: { test: "vitest run -c conf/v.json" }, files: { "conf/v.json": "{}\n" } },
      (r) => writeFileSync(join(r, "conf/v.json"), '{"a":1}\n'),
    ],
    [
      "a root config under a name outside the closed sets",
      { scripts: { test: "vitest run" }, files: { "vitest.ci.config.ts": "export default {}\n" } },
      (r) => writeFileSync(join(r, "vitest.ci.config.ts"), "export default { a: 1 }\n"),
    ],
  ];
  for (const [why, opts, mutate] of probes) {
    withWorld(opts, (root) => {
      const pin = pinOf(root);
      mutate(root);
      assert.deepEqual(testInfraReds({ recorded: pin, root }), HOLDS, why);
    });
  }
  // and the header states each one, in the one copy of the list
  const header = readFileSync(join(HERE, "test-infra-core.mjs"), "utf8").split("\nimport ")[0];
  for (const needle of [
    "THE IN-PROCESS BOUND",
    "assert.equal = () => {}",
    "imports are never followed",
    "`npm-run-all`, `run-s`",
    "or through `bun`",
    "a `mocha` or",
    "a JSON or YAML config",
    "under another name than the closed sets",
    "LOW-ENTROPY credential",
  ]) {
    assert.ok(header.includes(needle), `the header's NOT-caught list states: ${needle}`);
  }
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

test("6.30.0: the package-manager configs — .npmrc, .yarnrc, .yarnrc.yml, folded — are pinned configs, not runner configs", () => {
  assert.deepEqual(PACKAGE_MANAGER_CONFIGS, [".npmrc", ".yarnrc", ".yarnrc.yml"]);
  for (const n of [...PACKAGE_MANAGER_CONFIGS, ".NPMRC", ".Yarnrc.yml"]) {
    assert.ok(isPackageManagerConfigName(n), n);
    assert.ok(isPinnedConfigName(n), n);
    assert.ok(!isRunnerConfigName(n), n);
  }
  for (const n of ["npmrc", ".npmrc.bak", ".yarnrc.yaml", ".pnpmfile.cjs", "bunfig.toml", ".npmrc/", null]) {
    assert.ok(!isPackageManagerConfigName(n), String(n));
  }
  for (const n of ["vitest.config.ts", "Jest.config.js"]) assert.ok(isPinnedConfigName(n) && !isPackageManagerConfigName(n), n);
  // pinned at the root under its on-disk spelling, hashed, never read into the lock
  withWorld({ files: { ".NPMRC": "//registry.npmjs.org/:_authToken=secret-token-1\n" } }, (root) => {
    const pin = pinOf(root);
    assert.deepEqual(
      pin.configs.map((c) => c.path),
      [".NPMRC"]
    );
    assert.ok(!JSON.stringify(pin).includes("secret-token-1"), "a digest, never the content");
  });
  // a symlinked one refuses, as a runner config does (L59)
  withWorld({ files: { "real.npmrc": "x\n" } }, (root) => {
    symlinkSync(join(root, "real.npmrc"), join(root, ".npmrc"));
    const r = computeTestInfra({ root, levels: ["unit"] });
    assert.equal(r.ok, false);
    assert.match(r.reason, /^\.npmrc is a symlink — a package-manager config is pinned only as a regular file$/);
  });
});

// ── 6.21.0: a case-variant config is pinned (finding 2) — ONE spelling per directory, so APFS and CI's Linux agree ──

test("6.21.0: a case-variant runner config added after the pin is `a runner config was added` (the review's repro)", () => {
  withWorld({ files: {} }, (root) => {
    const pin = pinOf(root);
    assert.deepEqual(pin.configs, [], "precondition: no config when the pin was taken");
    writeFileSync(join(root, "Vitest.config.ts"), "export default { test: { passWithNoTests: true } }\n");
    assert.deepEqual(testInfraReds({ recorded: pin, root }).changed, ["Vitest.config.ts: a runner config was added"]);
  });
  withWorld({ files: { "Vitest.config.mjs": "export default {}\n" } }, (root) => {
    const pin = pinOf(root);
    assert.deepEqual(
      pin.configs.map((c) => c.path),
      ["Vitest.config.mjs"],
      "a case-variant config present at pin time is pinned under its on-disk spelling"
    );
    assert.equal(pinShapeError(pin, { version: 4 }), null, "and a pin recording that spelling is shape-valid");
    writeFileSync(join(root, "Vitest.config.mjs"), "export default { test: { include: ['nomatch/**'] } }\n");
    assert.deepEqual(testInfraReds({ recorded: pin, root }).changed, ["Vitest.config.mjs: the runner config changed"]);
  });
});

test("6.21.0: testInfraPathKind reads a PLAN `## Files` entry as the setter scopes it — root config, manifest, or nothing", () => {
  const cases = [
    ["vite.config.ts", "config"],
    ["Vite.config.ts", "config"],
    ["vite.config.ts (new alias)", "config"],
    ["jest.config.cjs", "config"],
    ["vitest.workspace.json", "config"],
    [".npmrc", "config"], // 6.30.0
    [".NPMRC", "config"],
    [".yarnrc", "config"],
    [".yarnrc.yml (registry)", "config"],
    ["package.json", "manifest"],
    ["Package.json", "manifest"],
    ["pharn.config.json (testResults unchanged)", "manifest"],
    ["./vite.config.ts", null], // the write guard matches it literally: it does not open the root file to the build
    ["./.npmrc", null],
    ["web/vite.config.ts", null], // not at the root — not pinned
    ["web/.npmrc", null],
    ["packages/a/package.json", null],
    ["*.config.ts", null], // a glob: the setter drops it
    ["<config>", null], // a placeholder: the setter drops it
    ["src/demo.js", null],
    ["tsconfig.json", null],
    [".pnpmfile.cjs", null],
    ["", null],
  ];
  for (const [entry, kind] of cases) assert.equal(testInfraPathKind(entry), kind, JSON.stringify(entry));
  assert.equal(testInfraPathKind(null), null);
  assert.deepEqual(PIN_MANIFESTS, ["package.json", "pharn.config.json"]);
});

test("6.30.0: scriptNamedFiles — the PLAN-TIME reading: every named file that is not an existing directory, absent included", () => {
  withWorld(
    {
      scripts: {
        test: "node tools/a.mjs tools/b.mjs tools/d.mjs tools/l.mjs vitest.config.ts && npm run more",
        more: "node scripts/m.mjs",
      },
      files: { "tools/a.mjs": "a\n", "vitest.config.ts": "export default {}\n", "scripts/m.mjs": "m\n" },
    },
    (root) => {
      mkdirSync(join(root, "tools/d.mjs"));
      symlinkSync(join(root, "tools/a.mjs"), join(root, "tools/l.mjs"));
      assert.deepEqual(scriptNamedFiles({ root, levels: ["unit"] }), {
        ok: true,
        paths: ["scripts/m.mjs", "tools/a.mjs", "tools/b.mjs", "tools/l.mjs"],
      });
      // the lock's own pin refuses that symlink, so no build starts over this tree either way
      assert.equal(computeTestInfra({ root, levels: ["unit"] }).ok, false);
    }
  );
  withWorld({}, (root) => {
    writeFileSync(join(root, "package.json"), "{ not json");
    assert.match(scriptNamedFiles({ root, levels: ["unit"] }).reason, /package\.json is not valid JSON/);
  });
  assert.throws(() => scriptNamedFiles({ levels: ["unit"] }), TypeError);
  assert.throws(() => scriptNamedFiles({ root: "/x", levels: [] }), TypeError);
});

test("✧ L36 CLOSURE — every non-test floor module tests the config-name regex only through isRunnerConfigName (one copy)", () => {
  const modules = readdirSync(HERE).filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"));
  assert.ok(modules.length > 20, "precondition: the floor was enumerated");
  const hits = [];
  const pmHits = [];
  for (const f of modules) {
    const src = readFileSync(join(HERE, f), "utf8");
    for (const m of src.matchAll(/CONFIG_NAME_RE\.test\(/g)) hits.push(`${f}@${m.index}`);
    if (f !== "test-infra-core.mjs" && /\/\^\(\?:vitest\\\.config/.test(src)) hits.push(`${f}: a second copy of the regex`);
    // 6.30.0: the package-manager config names live in ONE constant, too
    if (/["']\.npmrc["']|["']\.yarnrc(?:\.yml)?["']/.test(src)) pmHits.push(f);
  }
  assert.equal(hits.length, 1, JSON.stringify(hits));
  assert.match(hits[0], /^test-infra-core\.mjs@/);
  assert.deepEqual(pmHits, ["test-infra-core.mjs"]);
  const core = readFileSync(join(HERE, "test-infra-core.mjs"), "utf8");
  assert.match(core, /return typeof name === "string" && CONFIG_NAME_RE\.test\(foldName\(name\)\);/, "the one use folds first");
  assert.match(
    readFileSync(join(HERE, "check-ac-tests.mjs"), "utf8"),
    /import \{ isPackageManagerConfigName, scriptNamedFiles, testInfraPathKind \} from "\.\/test-infra-core\.mjs";/
  );
});

test("REFUSED, never hashed through: a symlinked or non-regular config (L59); an unparseable or non-string manifest", () => {
  withWorld({ files: { "real.ts": "export default {}\n" } }, (root) => {
    symlinkSync(join(root, "real.ts"), join(root, "vitest.config.ts"));
    const r = computeTestInfra({ root, levels: ["unit"] });
    assert.equal(r.ok, false);
    assert.match(r.reason, /vitest\.config\.ts is a symlink — a runner config is pinned only as a regular file/);
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
    assert.equal(d.changed.length, 1);
    assert.match(d.changed[0], /cannot be pinned now: package\.json is not valid JSON/);
    assert.deepEqual(d.unpinned, []);
  });
});

test("no package.json pins no gates (a scratch project); inputs are required (L41)", () => {
  withWorld({ scripts: null, results: null, files: {} }, (root) => {
    assert.deepEqual(pinOf(root), { levels: ["unit"], gates: [], chained: [], configs: [], script_files: [], jest: null });
  });
  assert.throws(() => computeTestInfra({ levels: ["unit"] }), TypeError);
  assert.throws(() => computeTestInfra({ root: "/x", levels: [] }), TypeError);
  assert.throws(() => computeTestInfra({ root: "/x", levels: ["smoke"] }), TypeError);
  assert.throws(() => pinShapeError({}), TypeError, "the schema version is required");
  assert.throws(() => pinShapeError({}, { version: 5 }), TypeError);
});

const GOOD_V3 = {
  levels: ["unit"],
  gates: [{ id: "test", script: "v", pre: null, post: "p", results: "vitest-json" }],
  configs: [{ path: "vitest.config.ts", sha256: "a".repeat(64) }],
};
const GOOD_V4 = {
  ...GOOD_V3,
  chained: [{ id: "test:unit", script: "vitest run", pre: null, post: "echo" }],
  configs: [
    { path: ".npmrc", sha256: "b".repeat(64) },
    { path: "vitest.config.ts", sha256: "a".repeat(64) },
  ],
  script_files: [{ path: "tools/r.mjs", sha256: "c".repeat(64) }],
  jest: "d".repeat(64),
};

test("pinShapeError closes every level (L36), per schema: /4 keys, levels, gates, chained, configs, script files, jest, order", () => {
  assert.equal(pinShapeError(GOOD_V4, { version: 4 }), null);
  assert.equal(pinShapeError({ ...GOOD_V4, jest: null, chained: [], script_files: [] }, { version: 4 }), null);
  assert.deepEqual([...PIN_KEYS].sort(), ["chained", "configs", "gates", "jest", "levels", "script_files"]);
  assert.deepEqual([...CHAINED_KEYS].sort(), ["id", "post", "pre", "script"]);
  assert.deepEqual([...SCRIPT_FILE_KEYS].sort(), ["path", "sha256"]);
  const good = GOOD_V4;
  const bad = [
    ["null", null],
    ["extra key", { ...good, extra: 1 }],
    ["missing key", { levels: good.levels, gates: good.gates }],
    ["a /3-shaped pin under /4", GOOD_V3],
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
    ["chained not an array", { ...good, chained: {} }],
    ["chained extra key", { ...good, chained: [{ ...good.chained[0], x: 1 }] }],
    ["chained id empty", { ...good, chained: [{ ...good.chained[0], id: "" }] }],
    ["chained id with a control character", { ...good, chained: [{ ...good.chained[0], id: "a\nb" }] }],
    ["chained id oversized", { ...good, chained: [{ ...good.chained[0], id: "a".repeat(1025) }] }],
    ["chained script not a string", { ...good, chained: [{ ...good.chained[0], script: null }] }],
    ["chained pre not a string or null", { ...good, chained: [{ ...good.chained[0], pre: 2 }] }],
    [
      "chained unsorted",
      {
        ...good,
        chained: [
          { id: "b", script: "x", pre: null, post: null },
          { id: "a", script: "x", pre: null, post: null },
        ],
      },
    ],
    ["chained duplicated", { ...good, chained: [good.chained[0], good.chained[0]] }],
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
    ["script_files not an array", { ...good, script_files: null }],
    ["script file extra key", { ...good, script_files: [{ ...good.script_files[0], x: 1 }] }],
    ["script file a dependency", { ...good, script_files: [{ path: "node_modules/x.js", sha256: "c".repeat(64) }] }],
    ["script file outside the root", { ...good, script_files: [{ path: "../x.js", sha256: "c".repeat(64) }] }],
    ["script file an extension outside the set", { ...good, script_files: [{ path: "x.json", sha256: "c".repeat(64) }] }],
    ["script file a pinned root config", { ...good, script_files: [{ path: "vitest.config.ts", sha256: "c".repeat(64) }] }],
    ["script file sha not hex", { ...good, script_files: [{ path: "tools/r.mjs", sha256: "C".repeat(64) }] }],
    [
      "script files unsorted",
      {
        ...good,
        script_files: [
          { path: "b.js", sha256: "c".repeat(64) },
          { path: "a.js", sha256: "c".repeat(64) },
        ],
      },
    ],
    ["jest neither a sha256 nor null", { ...good, jest: "x" }],
    ["jest absent-as-undefined", { ...good, jest: undefined }],
  ];
  for (const [why, pin] of bad) assert.notEqual(pinShapeError(pin, { version: 4 }), null, why);
  assert.deepEqual(RESULTS_VALUES, [...RESULTS_VALUES].sort());
  assert.ok(RESULTS_VALUES.includes("not-configured") && RESULTS_VALUES.includes("config-invalid"));
});

test("pinShapeError under /3 (6.20.0–6.29.x, still read): its own closed shape, runner configs only", () => {
  assert.equal(pinShapeError(GOOD_V3, { version: 3 }), null);
  assert.deepEqual([...PIN_KEYS_V3].sort(), ["configs", "gates", "levels"]);
  assert.notEqual(pinShapeError(GOOD_V4, { version: 3 }), null, "a /4-shaped pin under /3");
  assert.notEqual(
    pinShapeError({ ...GOOD_V3, configs: [{ path: ".npmrc", sha256: "a".repeat(64) }] }, { version: 3 }),
    null,
    "a /3 pin never recorded a package-manager config"
  );
});

test("6.30.0 MIGRATION — a /3 pin is judged by what it pinned; what only /4 pins is UNPINNED, never CHANGED (L6: two fields)", () => {
  // a tree with nothing only /4 pins: a /3 pin holds exactly as before
  withWorld({}, (root) => {
    const { levels, gates, configs } = pinOf(root);
    assert.deepEqual(testInfraReds({ recorded: { levels, gates, configs }, root }), HOLDS);
  });
  withWorld(RICH, (root) => {
    const full = pinOf(root);
    const v3 = { levels: full.levels, gates: full.gates, configs: full.configs.filter((c) => isRunnerConfigName(c.path)) };
    assert.equal(pinShapeError(v3, { version: 3 }), null);
    assert.deepEqual(testInfraReds({ recorded: v3, root }), {
      changed: [],
      unpinned: [
        'chained script "test:unit": a level gate runs it, and an ac-tests-lock/3 pin does not cover it',
        "scripts/prepare.mjs: a level gate's script names it, and an ac-tests-lock/3 pin does not cover it",
        "tools/reporter.mjs: a level gate's script names it, and an ac-tests-lock/3 pin does not cover it",
        ".npmrc: a package-manager config, which an ac-tests-lock/3 pin does not cover",
        "package.json's jest key: an ac-tests-lock/3 pin does not cover it",
      ],
    });
    // a /3 change is still CHANGED beside it
    writeFileSync(join(root, "vite.config.mjs"), "export default {}\n");
    const d = testInfraReds({ recorded: v3, root });
    assert.deepEqual(d.changed, ["vite.config.mjs: a runner config was added"]);
    assert.equal(d.unpinned.length, 5);
  });
  // STATED EDGE (GATE-2 review): a /3 pin over a tree the /4 pin cannot be taken on at all reads CHANGED, never
  // `unpinned` — the refusal cannot tell a /3-covered change from a /4-only one, so the stricter reading stands.
  withWorld({ files: { "real.npmrc": "x\n" } }, (root) => {
    const { levels, gates, configs } = pinOf(root);
    symlinkSync(join(root, "real.npmrc"), join(root, ".npmrc"));
    const d = testInfraReds({ recorded: { levels, gates, configs }, root });
    assert.deepEqual(d.unpinned, []);
    assert.equal(d.changed.length, 1);
    assert.match(d.changed[0], /^the test infrastructure cannot be pinned now: \.npmrc is a symlink/);
  });
});

test("GATE 2: .bash and .zsh are executed extensions — a script-named shell file of either kind is pinned", () => {
  assert.deepEqual(EXECUTED_EXTENSIONS, [".bash", ".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".sh", ".ts", ".tsx", ".zsh"]);
  assert.deepEqual([...EXECUTED_EXTENSIONS].sort(), [...EXECUTED_EXTENSIONS], "sorted");
  withWorld(
    { scripts: { test: "bash tools/run.bash && zsh tools/run.zsh" }, files: { "tools/run.bash": "a\n", "tools/run.zsh": "b\n" } },
    (root) => {
      assert.deepEqual(
        pinOf(root).script_files.map((f) => f.path),
        ["tools/run.bash", "tools/run.zsh"]
      );
    }
  );
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
  // /4 members, compared only when the RECORDED pin carries them
  const e = { ...a, chained: [], script_files: [], jest: null };
  const f = { ...e, chained: [{ id: "x", script: "y", pre: null, post: null }], jest: "a".repeat(64) };
  assert.deepEqual(diffTestInfra(e, f), ['chained script "x": a level gate now reaches it', "package.json's jest key was added"]);
  assert.deepEqual(diffTestInfra(f, e), [
    'chained script "x": the level gates no longer reach it, or it is gone',
    "package.json's jest key is gone",
  ]);
  assert.deepEqual(diffTestInfra(a, f), [], "a recorded pin without the /4 keys is not judged on them");
});
