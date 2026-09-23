// pharn/floor/ac-tests-lock.test.mjs — the AC-tests lock's suite. Every digest is the script's (L22); `--check`
// REDs name a PATH, never content; each refusal is one mutation of a written, GREEN lock (L34).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCK_KEYS, SCHEMA, buildLock, lockShapeError, sha256RegularFile } from "./ac-tests-lock.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "ac-tests-lock.mjs");
const NAME = "demo";
const H = "a".repeat(64);
const FILES = ["tests/ac/one.test.js", "tests/ac/two.spec.js"];
const SECRET = "SECRET-TEST-CONTENT-7f3a";

function acTests(files = FILES, hash = H) {
  return [
    "---",
    `spec_id: ${NAME}`,
    `spec_content_hash: ${hash}`,
    "---",
    "",
    "## Files",
    "",
    ...files.map((f) => `- \`${f}\` — t`),
    "",
    "## Mapping",
    "",
    "- AC-1 | unit | `x` | y",
    "",
  ].join("\n");
}

function world(files = FILES) {
  const root = mkdtempSync(join(tmpdir(), "acl-"));
  mkdirSync(join(root, "pharn", "features", NAME), { recursive: true });
  writeFileSync(join(root, "pharn", "features", NAME, "AC-TESTS.md"), acTests(files));
  for (const f of files) {
    mkdirSync(join(root, dirname(f)), { recursive: true });
    writeFileSync(join(root, f), `test("${f}", () => {}); // ${SECRET}\n`);
  }
  return root;
}
const cli = (root, args) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });
  return { code: r.status, out: r.stdout };
};
const lockOf = (root) => JSON.parse(readFileSync(join(root, "pharn", "features", NAME, "AC-TESTS.lock.json"), "utf8"));

test("--write then --check is GREEN; the lock's shape is the closed key set, digests computed by the script", () => {
  const root = world();
  try {
    assert.equal(cli(root, ["--write", NAME]).code, 0);
    const lock = lockOf(root);
    assert.deepEqual(Object.keys(lock).sort(), [...LOCK_KEYS].sort());
    assert.equal(lock.schema, SCHEMA);
    assert.deepEqual(lock.spec, { spec_id: NAME, spec_content_hash: H });
    assert.deepEqual(
      lock.files.map((f) => f.path),
      [...FILES].sort()
    );
    for (const f of lock.files) assert.equal(f.sha256, sha256RegularFile(join(root, f.path)));
    assert.equal(lock.red_run, null);
    assert.equal(lock.test_infra, null);
    assert.equal(lockShapeError(lock, NAME), null);
    const r = cli(root, ["--check", NAME]); // the DEFAULT --base, exercised (L41)
    assert.equal(r.code, 0, r.out);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--check REDs an edited test file, naming its PATH and never its content", () => {
  const root = world();
  try {
    cli(root, ["--write", NAME]);
    writeFileSync(join(root, FILES[0]), `test("rewritten to pass", () => {}); // ${SECRET}\n`);
    const r = cli(root, ["--check", NAME]);
    assert.equal(r.code, 1);
    assert.match(r.out, new RegExp(`RED — ${FILES[0].replace(/[.]/g, "\\.")} changed since the lock was written`));
    assert.ok(!r.out.includes(SECRET), "the RED quoted file content");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--check REDs each other drift (L52): AC-TESTS.md edited, a file removed, a ## Files entry added, one dropped", () => {
  const cases = [
    [
      "AC-TESTS.md edited",
      (root) => writeFileSync(join(root, "pharn/features/demo/AC-TESTS.md"), acTests(FILES) + "\n<!-- edited -->\n"),
      /AC-TESTS\.md changed/,
    ],
    ["a test file removed", (root) => rmSync(join(root, FILES[1])), /two\.spec\.js is missing/],
    [
      "an entry added",
      (root) => writeFileSync(join(root, "pharn/features/demo/AC-TESTS.md"), acTests([...FILES, "tests/ac/three.test.js"])),
      /three\.test\.js is in AC-TESTS\.md `## Files` but not in the lock/,
    ],
    [
      "an entry dropped",
      (root) => writeFileSync(join(root, "pharn/features/demo/AC-TESTS.md"), acTests([FILES[0]])),
      /two\.spec\.js is in the lock but no longer/,
    ],
    [
      "the spec pin changed",
      (root) => writeFileSync(join(root, "pharn/features/demo/AC-TESTS.md"), acTests(FILES, "b".repeat(64))),
      /spec_content_hash changed since the lock/,
    ],
  ];
  for (const [why, mutate, re] of cases) {
    const root = world();
    try {
      cli(root, ["--write", NAME]);
      mutate(root);
      const r = cli(root, ["--check", NAME]);
      assert.equal(r.code, 1, `${why}: ${r.out}`);
      assert.match(r.out, re, why);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("--write REFUSES (exit 2): a listed file missing, a symlinked test file, no ## Files, no pin, a bad slug, bad usage", () => {
  const root = world();
  try {
    rmSync(join(root, FILES[1]));
    assert.equal(cli(root, ["--write", NAME]).code, 2, "a missing listed file");
    writeFileSync(join(root, "real.js"), "x");
    symlinkSync(join(root, "real.js"), join(root, FILES[1]));
    assert.equal(cli(root, ["--write", NAME]).code, 2, "a symlinked test file is not a regular file");
    writeFileSync(join(root, "pharn/features/demo/AC-TESTS.md"), "---\nspec_id: demo\nspec_content_hash: " + H + "\n---\n# no files\n");
    assert.equal(cli(root, ["--write", NAME]).code, 2, "no ## Files");
    writeFileSync(join(root, "pharn/features/demo/AC-TESTS.md"), "## Files\n\n- `tests/ac/one.test.js` — t\n");
    assert.equal(cli(root, ["--write", NAME]).code, 2, "no spec pin frontmatter");
    assert.equal(cli(root, ["--write", "Bad Name"]).code, 2, "a non-slug name");
    assert.equal(cli(root, ["--frobnicate", NAME]).code, 2, "bad usage");
    assert.equal(cli(root, ["--write", NAME, "--base"]).code, 2, "--base with no value");
    assert.equal(buildLock(NAME, join(root, "nowhere")).ok, false, "an absent AC-TESTS.md");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--check on an unusable lock is exit 2, never a verdict: missing, not JSON, and each shape violation", () => {
  const root = world();
  try {
    assert.equal(cli(root, ["--check", NAME]).code, 2, "no lock yet");
    cli(root, ["--write", NAME]);
    const path = join(root, "pharn/features/demo/AC-TESTS.lock.json");
    const good = lockOf(root);
    writeFileSync(path, "{not json");
    assert.equal(cli(root, ["--check", NAME]).code, 2);
    for (const [why, bad] of [
      ["extra key", { ...good, extra: 1 }],
      ["schema", { ...good, schema: "ac-tests-lock/0" }],
      ["feature", { ...good, feature: "other" }],
      ["spec", { ...good, spec: { spec_id: NAME } }],
      ["mapping", { ...good, mapping: { path: "x" } }],
      ["files empty", { ...good, files: [] }],
      ["files entry", { ...good, files: [{ path: "x" }] }],
      ["not an object", [good]],
      ["a nested extra key", { ...good, spec: { ...good.spec, extra: 1 } }],
      ["a mapping extra key", { ...good, mapping: { ...good.mapping, extra: 1 } }],
      ["a files extra key", { ...good, files: good.files.map((f) => ({ ...f, extra: 1 })) }],
      ["a duplicate file", { ...good, files: [good.files[0], good.files[0]] }],
      ["unsorted files", { ...good, files: [...good.files].reverse() }],
      ["a forged red_run", { ...good, red_run: { "AC-1": ["t"] } }],
      ["a forged test_infra", { ...good, test_infra: {} }],
    ]) {
      writeFileSync(path, JSON.stringify(bad));
      assert.equal(cli(root, ["--check", NAME]).code, 2, why);
      assert.notEqual(lockShapeError(bad, NAME), null, why);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--write REFUSES a symlinked AC-TESTS.md (never records a null mapping digest); --check compares the mapping path RESOLVED", () => {
  const root = world();
  try {
    const real = join(root, "real-ac-tests.md");
    writeFileSync(real, readFileSync(join(root, "pharn/features/demo/AC-TESTS.md"), "utf8"));
    rmSync(join(root, "pharn/features/demo/AC-TESTS.md"));
    symlinkSync(real, join(root, "pharn/features/demo/AC-TESTS.md"));
    assert.equal(cli(root, ["--write", NAME]).code, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const r2 = world();
  try {
    assert.equal(cli(r2, ["--write", NAME]).code, 0);
    const abs = join(r2, "pharn", "features");
    assert.equal(cli(r2, ["--check", NAME, "--base", abs]).code, 0, "the same file spelled absolutely must not RED");
  } finally {
    rmSync(r2, { recursive: true, force: true });
  }
});

test("--write resets red_run / test_infra to null: a rewrite means the tests changed, so old evidence is stale", () => {
  const root = world();
  try {
    cli(root, ["--write", NAME]);
    const path = join(root, "pharn/features/demo/AC-TESTS.lock.json");
    writeFileSync(path, JSON.stringify({ ...lockOf(root), red_run: { stale: true } }));
    cli(root, ["--write", NAME]);
    assert.equal(lockOf(root).red_run, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
