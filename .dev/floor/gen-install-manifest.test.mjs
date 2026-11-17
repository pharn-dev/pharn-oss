// .dev/floor/gen-install-manifest.test.mjs — the install-manifest generator (7.21.0, CORE-193). Running it is
// orchestration (P0); these tests pin that it writes exactly the core's bytes, converges in one pass, and writes nothing
// when the core refuses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, main } from "./gen-install-manifest.mjs";
import { computeInstallManifest, MANIFEST_PATH } from "./install-manifest-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function put(root, rel, body = `# ${rel}\n`) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
}

/** The smallest tree every surface and both roles contribute to. */
function minimalTree() {
  const root = mkdtempSync(join(tmpdir(), "pharn-install-gen-"));
  put(root, "SKILLS_VERSION", "1.2.3\n");
  put(root, "pharn.config.json", '{"models":{"stages":{"default":{"model":"sonnet","effort":"high"}}}}\n');
  put(root, "pharn/pharn-pipeline/grillers/gg/gg.md", '---\nrole: griller\napplies: ["universal"]\n---\n# gg\n');
  put(root, "pharn/pharn-review/ll/ll.md", '---\nrole: lens\napplies: ["lib"]\n---\n# ll\n');
  for (const rel of [
    ".claude/commands/pharn-spec.md",
    ".claude/agents/pharn-stage.md",
    ".claude/hooks/h.cjs",
    ".claude/settings.json",
    "pharn/CONSTITUTION.md",
    "pharn/ARCHITECTURE.md",
    "pharn/THREAT-MODEL.md",
    "pharn/LIMITS.md",
    "LICENSE",
    "pharn/features/README.md",
    "pharn/pharn-contracts/c.md",
    "pharn/pharn-core/k.md",
    "pharn/floor/f.mjs",
  ]) {
    put(root, rel);
  }
  return root;
}

test("generate writes the core's bytes, then a second run writes nothing", (t) => {
  const root = minimalTree();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(generate(root), { updated: true });
  const abs = join(root, MANIFEST_PATH);
  assert.equal(readFileSync(abs, "utf8"), computeInstallManifest(root));
  const mtime = statSync(abs).mtimeMs;
  assert.deepEqual(generate(root), { updated: false });
  assert.equal(statSync(abs).mtimeMs, mtime, "an unchanged manifest is not rewritten");
  put(root, "pharn/pharn-contracts/c.md", "# changed\n");
  assert.deepEqual(generate(root), { updated: true }, "a changed installed byte rewrites it");
});

test("main reports and exits 0; a refusal writes nothing and exits 1 with the reason on stderr", (t) => {
  const root = minimalTree();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const out = [];
  const err = [];
  const io = { out: (s) => out.push(s), err: (s) => err.push(s) };
  assert.equal(main([root], io), 0);
  assert.match(out.join(""), /pharn-install\.json written/);
  assert.equal(main([root], io), 0);
  assert.match(out.join(""), /already current/);
  rmSync(join(root, MANIFEST_PATH));
  put(root, "SKILLS_VERSION", "nope\n");
  assert.equal(main([root], io), 1);
  assert.match(err.join(""), /NOT written — SKILLS_VERSION is not X\.Y\.Z/);
  assert.equal(existsSync(join(root, MANIFEST_PATH)), false);
});

test("the CLI runs as a script (exit 0 on a tree, 1 on a refusal)", (t) => {
  const root = minimalTree();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cli = join(HERE, "gen-install-manifest.mjs");
  assert.equal(spawnSync(process.execPath, [cli, root], { encoding: "utf8" }).status, 0);
  rmSync(join(root, "pharn/pharn-review"), { recursive: true });
  const r = spawnSync(process.execPath, [cli, root], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no lens capability/);
});
