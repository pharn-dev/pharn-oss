// .dev/floor/install-manifest-core.test.mjs — the install declaration and the manifest builder (7.21.0, CORE-193).
//
// Two halves. (1) A complete scratch fixture, so every rule of the ONE declaration is exercised per member (L29), each
// with a negative control, and every refusal is taken on its own (L34, L59). (2) The REAL tree (L41): the rules are
// bound to two referents — every bump-triggering PRODUCT_SURFACE path is declared (closure, L36), and the installable
// paths outside that set are a named set — and the model rules are the checker's own bindings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertPlainRelative,
  buildInstallManifest,
  CAPABILITY_SUBTREES,
  classify,
  computeInstallManifest,
  declaredRoots,
  FALLBACK_STAGE,
  GLOBAL_EXCLUDE,
  INSTALL_SURFACES,
  InstallManifestError,
  installRoots,
  LEGACY_INSTALL_ROOTS,
  listCandidates,
  MANIFEST_PATH,
  modelRules,
  normalizeApplies,
  OWNED_SEGMENT_RE,
  PATH_SEGMENT_RE,
  POLICIES,
  renderInstallManifest,
} from "./install-manifest-core.mjs";
import { isProductSurface, matchesGlob } from "./check-surface-bump.mjs";
import { gitListing } from "../../pharn/floor/capability-files-core.mjs";
import * as modelChecker from "../../pharn/floor/check-model-config.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CHECKER = join(REPO, "pharn", "floor", "check-model-config.mjs");

const sha = (s) => createHash("sha256").update(s).digest("hex");

function put(root, rel, body = `# ${rel}\n`) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
}

function cap(root, rel, role, applies = '["universal"]') {
  put(root, rel, `---\nname: x\nrole: ${role}\napplies: ${applies}\n---\n\n# x — y\n`);
}

/** One file per member of INSTALL_SURFACES, a griller and a lens, plus one negative control per rule. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "pharn-install-manifest-"));
  put(root, "SKILLS_VERSION", "7.20.0\n");
  put(root, "pharn.config.json", JSON.stringify({ models: { stages: { default: { model: "sonnet", effort: "high" } } } }));
  cap(root, "pharn/pharn-pipeline/grillers/gg/gg.md", "griller");
  put(root, "pharn/pharn-pipeline/grillers/gg/evals/cases/c1.md");
  cap(root, "pharn/pharn-review/ll/ll.md", "lens", '["backend", "ssr"]');
  put(root, "pharn/pharn-review/ll/evals/expected/e1.json", "{}\n");
  put(root, ".claude/commands/pharn-spec.md");
  put(root, ".claude/agents/pharn-stage.md");
  put(root, ".claude/hooks/protect-trusted-paths.cjs", "// hook\n");
  put(root, ".claude/settings.json", "{}\n");
  for (const d of ["CONSTITUTION", "ARCHITECTURE", "THREAT-MODEL", "LIMITS"]) put(root, `pharn/${d}.md`);
  put(root, "LICENSE", "Apache\n");
  put(root, "pharn/features/README.md");
  put(root, "pharn/pharn-contracts/finding-shape.md");
  put(root, "pharn/pharn-contracts/templates/t.md");
  cap(root, "pharn/pharn-core/seam-resolver/seam-resolver.md", "skill");
  put(root, "pharn/floor/validate.mjs", "// floor\n");
  put(root, "pharn/floor/README.md");
  // negative controls, one per rule
  put(root, ".claude/commands/pharn-dev-plan.md");
  put(root, ".claude/agents/pharn-dev-x.md");
  put(root, ".claude/hooks/protect-trusted-paths.test.cjs", "// test\n");
  put(root, "pharn/floor/validate.test.mjs", "// test\n");
  put(root, "pharn/floor/test-fixtures/red/x.md");
  put(root, "pharn/pharn-review/ll/evals/x.test.mjs", "// test inside a capability\n");
  put(root, "README.md");
  put(root, ".dev/floor/check-x.mjs", "// apparatus\n");
  put(root, "pharn/features/demo/PLAN.md");
  put(root, "docs/guarantees.md");
  return root;
}

const pathsOf = (m) => m.files.map((f) => f.path);

test("every INSTALL_SURFACES member and both capability roles contribute, and every negative control is left out", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const m = buildInstallManifest(root);
  for (const { surface } of INSTALL_SURFACES)
    assert.ok(
      m.files.some((f) => f.surface === surface),
      `${surface} contributes`
    );
  assert.deepEqual(
    m.capabilities.map((c) => [c.role, c.name]),
    CAPABILITY_SUBTREES.map((s) => [s.role, s.role === "griller" ? "gg" : "ll"])
  );
  for (const no of [
    ".claude/commands/pharn-dev-plan.md",
    ".claude/agents/pharn-dev-x.md",
    ".claude/hooks/protect-trusted-paths.test.cjs",
    "pharn/floor/validate.test.mjs",
    "pharn/floor/test-fixtures/red/x.md",
    "pharn/pharn-review/ll/evals/x.test.mjs",
    "README.md",
    ".dev/floor/check-x.mjs",
    "pharn/features/demo/PLAN.md",
    "docs/guarantees.md",
    "SKILLS_VERSION",
    "pharn.config.json",
  ]) {
    assert.ok(!pathsOf(m).includes(no), `${no} is not installable`);
  }
  assert.deepEqual(pathsOf(m), [...pathsOf(m)].sort(), "files are sorted by path");
});

test("capability files carry their owner; fixed surfaces carry none; pharn-core skills are surface core", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const m = buildInstallManifest(root);
  const by = Object.fromEntries(m.files.map((f) => [f.path, f]));
  assert.equal(by["pharn/pharn-pipeline/grillers/gg/evals/cases/c1.md"].capability, "gg");
  assert.equal(by["pharn/pharn-review/ll/evals/expected/e1.json"].surface, "capability");
  assert.equal(by["pharn/pharn-core/seam-resolver/seam-resolver.md"].surface, "core");
  assert.equal("capability" in by["pharn/pharn-core/seam-resolver/seam-resolver.md"], false);
  assert.equal(by["pharn/pharn-contracts/templates/t.md"].surface, "contracts");
  assert.equal(by["pharn/floor/README.md"].surface, "floor");
});

test("LICENSE maps to pharn/LICENSE; settings is if-absent; every other file is managed with dest == path", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const m = buildInstallManifest(root);
  for (const f of m.files) {
    assert.ok(POLICIES.includes(f.policy));
    if (f.path === "LICENSE") assert.equal(f.dest, "pharn/LICENSE");
    else assert.equal(f.dest, f.path);
    assert.equal(f.policy, f.surface === "settings" ? "if-absent" : "managed");
  }
});

test("sha256 is over RAW bytes: a CRLF file hashes unfolded, lowercase hex of 64", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  put(root, "pharn/pharn-contracts/crlf.md", "a\r\nb\r\n");
  const f = buildInstallManifest(root).files.find((x) => x.path === "pharn/pharn-contracts/crlf.md");
  assert.equal(f.sha256, sha("a\r\nb\r\n"));
  assert.notEqual(f.sha256, sha("a\nb\n"));
  assert.match(f.sha256, /^[0-9a-f]{64}$/);
});

test("applies takes the CLI's shape: 'universal' as a string, archetypes as an array", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const m = buildInstallManifest(root);
  assert.equal(m.capabilities.find((c) => c.name === "gg").applies, "universal");
  assert.deepEqual(m.capabilities.find((c) => c.name === "ll").applies, ["backend", "ssr"]);
  assert.equal(normalizeApplies("universal", "w"), "universal");
  assert.deepEqual(normalizeApplies("lib", "w"), ["lib"]);
  for (const bad of [[], undefined, "", ["universal", "ssr"], [1], [""]]) {
    assert.throws(() => normalizeApplies(bad, "w"), InstallManifestError, JSON.stringify(bad));
  }
});

test("rendering is deterministic, one files/capabilities entry per line, and parses back to the object", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const a = computeInstallManifest(root);
  assert.equal(computeInstallManifest(root), a);
  assert.ok(a.endsWith("}\n"));
  assert.deepEqual(JSON.parse(a), buildInstallManifest(root));
  const m = JSON.parse(a);
  for (const f of m.files) assert.ok(a.includes(`\n    ${JSON.stringify(f)}`), "one line per file");
  assert.equal(renderInstallManifest({ files: [], capabilities: [] }), '{\n  "files": [],\n  "capabilities": []\n}\n');
});

// ── refusals (fail-closed) — each taken on its own ──────────────────────────────────────────────────────────

const REFUSALS = [
  ["SKILLS_VERSION missing", (r) => rmSync(join(r, "SKILLS_VERSION")), /SKILLS_VERSION is missing/],
  ["SKILLS_VERSION malformed", (r) => put(r, "SKILLS_VERSION", "7.20\n"), /not X\.Y\.Z/],
  ["no pharn.config.json", (r) => rmSync(join(r, "pharn.config.json")), /missing, unreadable or not JSON/],
  ["no models.stages", (r) => put(r, "pharn.config.json", '{"models":{}}'), /no `models.stages`/],
  ["a surface with no file", (r) => rmSync(join(r, ".claude/agents"), { recursive: true }), /agents surface contributes no file/],
  ["no lens", (r) => rmSync(join(r, "pharn/pharn-review"), { recursive: true }), /no lens capability/],
  [
    "a lens under the griller subtree",
    (r) => cap(r, "pharn/pharn-pipeline/grillers/zz/zz.md", "lens"),
    /declares role "lens" but lives under/,
  ],
  ["a griller outside its subtree", (r) => cap(r, "pharn/pharn-core/gx/gx.md", "griller"), /a griller outside/],
  ["a nested capability dir", (r) => cap(r, "pharn/pharn-review/a/b/b.md", "lens"), /one level below/],
  ["a bad applies", (r) => cap(r, "pharn/pharn-review/ll/ll.md", "lens", '["universal", "spa"]'), /beside another token/],
  ["a symlink to a file", (r) => symlinkSync("finding-shape.md", join(r, "pharn/pharn-contracts/link.md")), /not a regular file/],
  ["a symlink to a directory", (r) => symlinkSync("templates", join(r, "pharn/pharn-contracts/linkdir")), /not a regular file/],
  ["a dangling symlink", (r) => symlinkSync("nowhere.md", join(r, "pharn/pharn-contracts/dangling.md")), /not a regular file/],
  ["a backslash in a path", (r) => put(r, "pharn/pharn-contracts/a\\b.md"), /not a plain relative path/],
];

for (const [name, mutate, re] of REFUSALS) {
  test(`refuses: ${name}`, (t) => {
    const root = fixture();
    t.after(() => rmSync(root, { recursive: true, force: true }));
    buildInstallManifest(root); // the control: the fixture alone builds
    mutate(root);
    assert.throws(
      () => buildInstallManifest(root),
      (e) => e instanceof InstallManifestError && re.test(e.message)
    );
  });
}

test("refuses two files with one dest", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // A declaration that sends pharn/floor/README.md to the floor checker's own destination.
  const surfaces = [
    { surface: "x", include: ["pharn/floor/README.md"], exclude: [], dest: "pharn/floor/validate.mjs" },
    ...INSTALL_SURFACES,
  ];
  assert.throws(
    () => buildInstallManifest(root, { surfaces }),
    (e) => e instanceof InstallManifestError && /share the destination "pharn\/floor\/validate\.mjs"/.test(e.message)
  );
  assert.equal(classify("LICENSE", []).dest, "pharn/LICENSE");
  assert.equal(classify("pharn/LICENSE", []), null, "pharn/LICENSE itself is not installable, so the real tree has no clash");
});

test("the no-git walk skips a missing root and an unreadable directory without throwing", (t) => {
  const root = fixture();
  t.after(() => {
    spawnSync("chmod", ["755", join(root, "pharn/pharn-contracts/templates")]);
    rmSync(root, { recursive: true, force: true });
  });
  rmSync(join(root, "LICENSE"));
  assert.ok(!listCandidates(root).includes("LICENSE"));
  spawnSync("chmod", ["000", join(root, "pharn/pharn-contracts/templates")]);
  const listed = listCandidates(root);
  assert.ok(!listed.some((p) => p.startsWith("pharn/pharn-contracts/templates")), "an unreadable directory contributes nothing");
  assert.ok(listed.includes("pharn/pharn-contracts/finding-shape.md"), "its siblings are still listed");
});

test("a path git lists but the work tree lost is skipped, not refused", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  if (git("init", "-q").status !== 0) return t.skip("git unavailable");
  git("add", "-A");
  rmSync(join(root, "pharn/pharn-contracts/templates/t.md"));
  assert.ok(!pathsOf(buildInstallManifest(root)).includes("pharn/pharn-contracts/templates/t.md"));
});

test("the candidate list is git's (an ignored file stays out) and, without git, a walk of the declared roots only", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  put(root, "node_modules/pkg/pharn/floor/x.mjs");
  const walked = listCandidates(root);
  assert.ok(
    walked.every((p) => declaredRoots().includes(p.split("/")[0])),
    "the walk visits the declared roots only"
  );
  assert.deepEqual(declaredRoots(), [".claude", "LICENSE", "pharn"]);
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  if (git("init", "-q").status !== 0) return t.skip("git unavailable");
  put(root, ".gitignore", "pharn/pharn-contracts/ignored.md\n");
  put(root, "pharn/pharn-contracts/ignored.md");
  assert.ok(gitListing(root).length > 0);
  assert.ok(!listCandidates(root).includes("pharn/pharn-contracts/ignored.md"));
  assert.ok(!pathsOf(buildInstallManifest(root)).includes("pharn/pharn-contracts/ignored.md"));
});

test("installRoots: include/exclude derive from the declaration; every fixture dest is inside and none is legacy", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const roots = installRoots();
  assert.deepEqual(roots.legacy, [...LEGACY_INSTALL_ROOTS]);
  for (const g of GLOBAL_EXCLUDE) assert.ok(roots.exclude.includes(g));
  for (const f of buildInstallManifest(root).files) {
    assert.ok(
      roots.include.some((g) => matchesGlob(g, f.dest)),
      `${f.dest} inside include`
    );
    assert.ok(!roots.legacy.some((g) => matchesGlob(g, f.dest)), `${f.dest} not legacy`);
  }
});

// ── the REAL tree (L41) ─────────────────────────────────────────────────────────────────────────────────────

const REAL = buildInstallManifest(REPO);
const TRACKED = spawnSync("git", ["ls-files", "-z"], { cwd: REPO, encoding: "utf8" }).stdout.split("\0").filter(Boolean);

test("✧ CLOSURE (L36): every bump-triggering PRODUCT_SURFACE path in the tree is declared in the manifest", () => {
  const declared = new Set(pathsOf(REAL));
  const surface = TRACKED.filter((p) => isProductSurface(p));
  assert.ok(surface.length > 100, `the product surface is not empty (${surface.length})`);
  assert.deepEqual(
    surface.filter((p) => !declared.has(p)),
    []
  );
});

test("✧ the installable paths outside PRODUCT_SURFACE are exactly LICENSE and the two READMEs", () => {
  assert.deepEqual(
    pathsOf(REAL).filter((p) => !isProductSurface(p)),
    ["LICENSE", "pharn/features/README.md", "pharn/floor/README.md"]
  );
});

test("✧ every real dest lies inside installRoots.include, outside exclude and legacy; dests are unique", () => {
  const roots = installRoots();
  const dests = REAL.files.map((f) => f.dest);
  assert.equal(new Set(dests).size, dests.length);
  for (const d of dests) {
    assert.ok(
      roots.include.some((g) => matchesGlob(g, d)),
      d
    );
    assert.ok(!roots.exclude.some((g) => matchesGlob(g, d)), d);
    assert.ok(!roots.legacy.some((g) => matchesGlob(g, d)), d);
  }
});

test("✧ the work tree's pharn-install.json is the real tree's manifest (the docs:check verdict, inside npm test too)", () => {
  assert.equal(readFileSync(join(REPO, MANIFEST_PATH), "utf8"), computeInstallManifest(REPO));
});

test("✧ models.rules are check-model-config.mjs's own exported bindings", () => {
  assert.deepEqual(modelRules(), {
    fallbackStage: "default",
    stages: Object.keys(modelChecker.PRODUCT_STAGES),
    aliases: [...modelChecker.MODEL_ALIASES],
    modelIdPattern: modelChecker.MODEL_ID_RE.source,
    effortLevels: [...modelChecker.EFFORT_ENUM],
  });
  assert.deepEqual(REAL.models.rules, modelRules());
  assert.ok(REAL.models.defaults.stages.default, "the defaults carry the fallback entry");
});

test("✧ the fallback key is the checker's: a block without it REDs on `default`", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-model-default-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cfg = join(dir, "c.json");
  writeFileSync(cfg, JSON.stringify({ models: { stages: { plan: { model: "opus", effort: "high" } } } }));
  const r = spawnSync(process.execPath, [CHECKER, "validate", "--config", cfg], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, new RegExp(`missing required \`${FALLBACK_STAGE}\` stage entry`));
});

test("✧ importing check-model-config.mjs runs nothing: no output, exit code unset; run directly it still answers", () => {
  const probe = `const m = await import(${JSON.stringify(CHECKER)}); process.stdout.write(JSON.stringify([Object.keys(m).sort(), process.exitCode ?? null]));`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", probe], { encoding: "utf8", cwd: tmpdir() });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), [["EFFORT_ENUM", "MODEL_ALIASES", "MODEL_ID_RE", "PRODUCT_STAGES"], null]);
  const direct = spawnSync(process.execPath, [CHECKER, "frobnicate"], { encoding: "utf8", cwd: tmpdir() });
  assert.equal(direct.status, 1);
  assert.match(direct.stdout, /unknown mode "frobnicate"/);
});

// CORE-302: the generator holds every `path` and `dest` to pharn-cli's segment rules, so a tree it accepts is one every
// CLI installs. The tables are pharn-cli's own: the accept rows are tests/orphans.test.ts `NEW_SURFACE_KEYS` plus the
// layout paths its "holds every path of the pharn layout" test names; the refuse rows are the segment-rule rows of
// `NEVER_OWNED` (tests/orphans.test.ts) and of the "not a safe relative path" table (tests/upstream-manifest.test.ts).
// `NEVER_OWNED`'s other rows (`pharn/notes.md`, `.claude/skills/my-skill/...`, `.git/hooks/pre-commit`, ...) fail the
// CLI's root and `pharn-*` name rules, which this module does not mirror.
const CLI_ACCEPTED_DESTS = [
  ".claude/skills/pharn-x/SKILL.md",
  ".claude/skills/pharn-x/references/deep/notes.md",
  ".claude/commands/pharn-x/part.md",
  ".claude/output-styles/pharn-terse.md",
  "pharn/pharn-new/x.md",
  "pharn/pharn-core/new/x.md",
  "pharn/floor/lib/x.mjs",
  "pharn/pharn-pipeline/other/x.md",
  "pharn/CONSTITUTION.md",
  "pharn/LICENSE",
  "pharn/features/README.md",
  "pharn/pharn-contracts/finding-shape.md",
  "pharn/pharn-review/n-plus-one/n-plus-one.md",
  ".claude/commands/pharn-plan.md",
  ".claude/agents/pharn-review-lens.md",
  ".claude/hooks/guard.cjs",
  ".claude/settings.json",
];
const CLI_REFUSED = [
  // NEVER_OWNED's segment rows: a dot-led name below the root (dest only)
  [".claude/skills/pharn-x/.hidden", { dest: true }],
  ["pharn/.backup/20260101-000000/x.md", { dest: true }],
  ["pharn/.lock", { dest: true }],
  ["pharn/.git/config", { dest: true }],
  [".claude/.git/pharn-x/y", { dest: true }],
  ["pharn/floor/.eslintrc.json", { dest: true }],
  // upstream-manifest.test.ts "not a safe relative path" rows (path and dest)
  ["pharn/../x", { path: true, dest: true }],
  ["../x", { path: true, dest: true }],
  ["/etc/passwd", { path: true, dest: true }],
  ["pharn\\x", { path: true, dest: true }],
  ["pharn//x", { path: true, dest: true }],
  ["pharn/\u0007x", { path: true, dest: true }],
  ["", { path: true, dest: true }],
  // characters outside the portable filename set
  ["evals/cases/app/[id]/page.tsx", { path: true, dest: true }],
  ["pharn/floor/a]b.mjs", { path: true, dest: true }],
  ["pharn/floor/a b.mjs", { path: true, dest: true }],
  ["pharn/floor/caf\u00e9.mjs", { path: true, dest: true }],
];

test("assertPlainRelative accepts every dest pharn-cli accepts, as a path and as a dest", () => {
  for (const rel of CLI_ACCEPTED_DESTS) {
    assert.doesNotThrow(() => assertPlainRelative(rel), rel);
    assert.doesNotThrow(() => assertPlainRelative(rel, { isDest: true }), rel);
  }
  // A source path may hold a dot-led segment below its root (MANIFEST_PATH_RE allows it); only a dest may not.
  assert.doesNotThrow(() => assertPlainRelative("pharn/floor/.eslintrc.json"));
});

for (const [rel, { path = false, dest = false }] of CLI_REFUSED) {
  test(`assertPlainRelative refuses ${JSON.stringify(rel)}${path ? "" : " as a dest"}`, () => {
    const refused = (opts) => {
      assert.throws(
        () => assertPlainRelative(rel, opts),
        (e) => e instanceof InstallManifestError && e.message.startsWith(JSON.stringify(rel))
      );
    };
    if (path) refused({});
    if (dest) refused({ isDest: true });
  });
}

test("the segment regexes are pharn-cli's, byte for byte", () => {
  // pharn-cli src/lib/install-surfaces.ts OWNED_SEGMENT_RE, and the segment class of src/lib/upstream-manifest.ts
  // MANIFEST_PATH_RE (`[A-Za-z0-9._-]+`, whose `.`/`..` look-ahead assertPlainRelative states as its own check).
  assert.equal(OWNED_SEGMENT_RE.source, "^[A-Za-z0-9_-][A-Za-z0-9._-]*$");
  assert.equal(PATH_SEGMENT_RE.source, "^[A-Za-z0-9._-]+$");
});

const GENERATOR_REFUSALS = [
  ["a dot-led floor file", "pharn/floor/.eslintrc.json"],
  ["a [ and ] segment", "pharn/pharn-review/ll/evals/cases/app/[id]/page.tsx"],
  ["a space", "pharn/floor/a b.mjs"],
  ["a non-ASCII character", "pharn/pharn-contracts/caf\u00e9.md"],
];

for (const [name, rel] of GENERATOR_REFUSALS) {
  test(`the generator refuses ${name}, naming the path (CORE-302)`, (t) => {
    const root = fixture();
    t.after(() => rmSync(root, { recursive: true, force: true }));
    buildInstallManifest(root); // the control: the fixture alone builds
    put(root, rel);
    assert.throws(
      () => buildInstallManifest(root),
      (e) => e instanceof InstallManifestError && e.message.includes(JSON.stringify(rel)) && /pharn-cli's path rule/.test(e.message)
    );
  });
}
