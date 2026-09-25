// pharn/floor/ac-tests-lock.test.mjs — the AC-tests lock's suite. Every digest is the script's (L22); `--check`
// REDs name a PATH, never content; each refusal is one mutation of a written, GREEN lock (L34).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCK_KEYS, SCHEMA, buildLock, filesDigest, lockShapeError, sha256RegularFile } from "./ac-tests-lock.mjs";

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
    // no package.json and no runner config in this world: the pin records the level and nothing else
    assert.deepEqual(lock.test_infra, { levels: ["unit"], gates: [], configs: [] });
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
    assert.ok(r.out.includes(`RED — ${FILES[0]} changed since the lock was written`), r.out);
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
    assert.equal(buildLock(NAME, join(root, "nowhere"), root).ok, false, "an absent AC-TESTS.md");
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

// ── 6.18.0: schema /2, the red_run section, --require-red-run, /1 still read, and the bootstrap mode ────────────

const lockPathOf = (root) => join(root, "pharn", "features", NAME, "AC-TESTS.lock.json");
const writeLockJson = (root, lock) => writeFileSync(lockPathOf(root), JSON.stringify(lock));
/** A well-formed red_run for the world's lock, bound to its files. */
const redRunFor = (lock) => ({
  stamp_sha256: H,
  files_sha256: filesDigest(lock.files),
  gates: [{ gate: "test", results_sha256: H }],
  acs: [{ id: "AC-1", tests: ["tests/ac/one.test.js::AC-1: t"] }],
});

test("/3: --write writes mode test-first with bootstrap null; a well-formed red_run bound to the files checks GREEN", () => {
  const root = world();
  try {
    cli(root, ["--write", NAME]);
    const lock = lockOf(root);
    assert.equal(lock.schema, "ac-tests-lock/3");
    assert.equal(lock.mode, "test-first");
    assert.equal(lock.bootstrap, null);
    writeLockJson(root, { ...lock, red_run: redRunFor(lock) });
    const r = cli(root, ["--check", NAME, "--require-red-run"]);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /red_run recorded for 1 AC/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--check REDs a red_run no longer bound to the files, or naming other ACs than the mapping (grill G8)", () => {
  const root = world();
  try {
    cli(root, ["--write", NAME]);
    const lock = lockOf(root);
    writeLockJson(root, { ...lock, red_run: { ...redRunFor(lock), files_sha256: "b".repeat(64) } });
    let r = cli(root, ["--check", NAME]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /red_run is not bound to the lock's files/);
    writeLockJson(root, { ...lock, red_run: { ...redRunFor(lock), acs: [{ id: "AC-2", tests: ["t"] }] } });
    r = cli(root, ["--check", NAME]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /red_run's ACs are not AC-TESTS\.md's mapped ACs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("/1 locks are still read and checked GREEN, and never pass --require-red-run", () => {
  const root = world();
  try {
    cli(root, ["--write", NAME]);
    const { mode, bootstrap, ...rest } = lockOf(root);
    assert.equal(mode, "test-first");
    assert.equal(bootstrap, null);
    rest.test_infra = null; // a 6.17.0 lock never carried the pin
    writeLockJson(root, { ...rest, schema: "ac-tests-lock/1" });
    assert.equal(cli(root, ["--check", NAME]).code, 0, "a 6.17.0 lock still checks");
    const r = cli(root, ["--check", NAME, "--require-red-run"]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /ac-tests-lock\/1, which has no red run/);
    assert.equal(cli(root, ["--record-red-run", NAME, "--out", ".pharn/x"]).code, 2, "a red run is recorded on a /3 lock only");
    writeLockJson(root, { ...rest, schema: "ac-tests-lock/1", mode: "test-first" });
    assert.equal(cli(root, ["--check", NAME]).code, 2, "a /1 lock with /2's keys is not the /1 shape");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("/2 shape: each red_run / mode / bootstrap violation is unusable (exit 2), never a verdict (L52)", () => {
  const root = world();
  try {
    cli(root, ["--write", NAME]);
    const good = lockOf(root);
    const rr = redRunFor(good);
    for (const [why, red_run, extra = {}] of [
      ["red_run extra key", { ...rr, extra: 1 }],
      ["red_run stamp not hex", { ...rr, stamp_sha256: "x" }],
      ["red_run files not hex", { ...rr, files_sha256: "x" }],
      ["gates empty", { ...rr, gates: [] }],
      ["a gate outside the results gates", { ...rr, gates: [{ gate: "lint", results_sha256: H }] }],
      ["a gate entry extra key", { ...rr, gates: [{ gate: "test", results_sha256: H, x: 1 }] }],
      [
        "gates unsorted",
        {
          ...rr,
          gates: [
            { gate: "test", results_sha256: H },
            { gate: "e2e", results_sha256: H },
          ],
        },
      ],
      ["acs empty", { ...rr, acs: [] }],
      ["an ac id outside AC-<n>", { ...rr, acs: [{ id: "AC-0", tests: ["t"] }] }],
      ["an ac with no tests", { ...rr, acs: [{ id: "AC-1", tests: [] }] }],
      ["a test id with a control char", { ...rr, acs: [{ id: "AC-1", tests: ["a\u0007b"] }] }],
      ["tests unsorted", { ...rr, acs: [{ id: "AC-1", tests: ["b", "a"] }] }],
      [
        "acs out of AC-number order",
        {
          ...rr,
          acs: [
            { id: "AC-10", tests: ["t"] },
            { id: "AC-2", tests: ["t"] },
          ],
        },
      ],
      ["mode outside the set", null, { mode: "fast" }],
      ["test-first with a bootstrap section", null, { bootstrap: { spec_kind: "test-infra", levels: ["unit"] } }],
    ]) {
      const bad = { ...good, red_run, ...extra };
      writeLockJson(root, bad);
      assert.equal(cli(root, ["--check", NAME]).code, 2, why);
      assert.notEqual(lockShapeError(bad, NAME), null, why);
    }
    const sorted = {
      ...good,
      red_run: {
        ...rr,
        acs: [
          { id: "AC-2", tests: ["t"] },
          { id: "AC-10", tests: ["t"] },
        ],
      },
    };
    assert.equal(lockShapeError(sorted, NAME), null, "control: AC-2 before AC-10 is AC-number order");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("usage: --require-red-run only with --check; --record-red-run needs --out; a flag in place of <name>", () => {
  const root = world();
  try {
    assert.equal(cli(root, ["--write", NAME, "--require-red-run"]).code, 2);
    assert.equal(cli(root, ["--record-red-run", NAME]).code, 2);
    assert.equal(cli(root, ["--check", "--require-red-run"]).code, 2);
    assert.equal(cli(root, ["--record-red-run", NAME, "--out", ".pharn/none"]).code, 2, "no lock yet");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── bootstrap ─────────────────────────────────────────────────────────────────────────────────────────────

// A bootstrap lock is written and checked only over an Approved, un-drifted SPEC (check-spec-approved.mjs, shelled —
// REVIEW finding 3), so these SPECs are REAL: the shipped template filled, the pin computed by check-spec --hash.
const CHECK_SPEC = join(HERE, "check-spec.mjs");
const TEMPLATE = readFileSync(join(HERE, "..", "pharn-contracts", "templates", "spec-template.md"), "utf8");
const TEMPLATE_REF = spawnSync(process.execPath, [CHECK_SPEC, "--template-ref", "pharn-default"], { encoding: "utf8" }).stdout.trim();
/** A templated SPEC whose criteria are at `levels`; `kind` null writes no spec_kind line; `approve` pins it. */
function specOf({ kind = "test-infra", levels = ["unit", "e2e"], legacy = false, approve = true, salt = "" } = {}) {
  let t = TEMPLATE.replace(/<!--\s*pharn:guidance[\s\S]*?-->\n?/g, "")
    .replace("spec_id: <name>", `spec_id: ${NAME}`)
    .replace("<the line check-spec.mjs --resolve-template-ref prints>", TEMPLATE_REF)
    .replace("<unit | integration | e2e>", levels[0])
    .replace(/<[^>\n]+>/g, `filled${salt}`);
  const extra = levels
    .slice(1)
    .map((l, i) => `- **AC-${i + 2}** Given a project When its tests run Then results are written\n  - verify: ${l}\n`)
    .join("");
  t = t.replace(`  - verify: ${levels[0]}\n`, `  - verify: ${levels[0]}\n${extra}`);
  if (legacy) t = t.replace(/^spec_template:.*\n/m, "");
  if (kind !== null) t = t.replace(/^(spec_id: .*\n)/m, `$1spec_kind: ${kind}\n`);
  if (!approve) return t;
  const tmp = mkdtempSync(join(tmpdir(), "acl-spec-"));
  try {
    writeFileSync(join(tmp, "SPEC.md"), t);
    const hash = spawnSync(process.execPath, [CHECK_SPEC, "--hash", join(tmp, "SPEC.md")], { encoding: "utf8" }).stdout.trim();
    return t.replace("state: Draft", "state: Approved").replace('spec_content_hash: ""', `spec_content_hash: ${hash}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
const pinOf = (spec) => spec.match(/^spec_content_hash: ([0-9a-f]{64})$/m)[1];
function bootWorld(spec = specOf()) {
  const root = mkdtempSync(join(tmpdir(), "aclb-"));
  mkdirSync(join(root, "pharn", "features", NAME), { recursive: true });
  writeFileSync(join(root, "pharn", "features", NAME, "SPEC.md"), spec);
  return root;
}
const setSpec = (root, text) => writeFileSync(join(root, "pharn", "features", NAME, "SPEC.md"), text);

test("bootstrap: --write-bootstrap records mode bootstrap, no mapping, no files, the SPEC's levels; --check GREEN", () => {
  const spec = specOf();
  const root = bootWorld(spec);
  try {
    const w = cli(root, ["--write-bootstrap", NAME]);
    assert.equal(w.code, 0, w.out);
    assert.match(w.out, /BOOTSTRAP .* WEAKER than test-first/);
    const lock = lockOf(root);
    assert.deepEqual(lock, {
      schema: "ac-tests-lock/3",
      feature: NAME,
      mode: "bootstrap",
      spec: { spec_id: NAME, spec_content_hash: pinOf(spec) },
      mapping: null,
      files: [],
      bootstrap: { spec_kind: "test-infra", levels: ["e2e", "unit"] },
      red_run: null,
      test_infra: null,
    });
    const c = cli(root, ["--check", NAME]);
    assert.equal(c.code, 0, c.out);
    assert.match(c.out, /BOOTSTRAP .* no AC test ran before the build/);
    // REVIEW finding 2: a bootstrap lock has no red run, so --require-red-run REDs it unless the caller accepts it
    const strict = cli(root, ["--check", NAME, "--require-red-run"]);
    assert.equal(strict.code, 1, strict.out);
    assert.match(strict.out, /BOOTSTRAP lock: no red run exists/);
    assert.equal(cli(root, ["--check", NAME, "--require-red-run", "--allow-bootstrap"]).code, 0);
    assert.equal(cli(root, ["--check", NAME, "--allow-bootstrap"]).code, 2, "--allow-bootstrap only qualifies --require-red-run");
    assert.equal(cli(root, ["--record-red-run", NAME, "--out", ".pharn/x"]).code, 2, "a bootstrap lock has no red run to record");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bootstrap --check REDs: the kind flipped, the pin changed, the levels changed, an AC-TESTS.md appeared (L52)", () => {
  for (const [why, mutate, re] of [
    ["kind removed", (root) => setSpec(root, specOf({ kind: null })), /no longer `spec_kind: test-infra`/],
    ["pin changed (re-approved over another body)", (root) => setSpec(root, specOf({ salt: "-v2" })), /spec_content_hash changed/],
    [
      "the SPEC drifted (body edited, not re-pinned)",
      (root) => setSpec(root, specOf().replace("## Intent\n", "## Intent\n\nAn edit after approval.\n")),
      /not an Approved, un-drifted SPEC/,
    ],
    ["levels changed", (root) => setSpec(root, specOf({ levels: ["unit"] })), /criteria levels changed/],
    [
      "a mapping appeared",
      (root) => writeFileSync(join(root, "pharn", "features", NAME, "AC-TESTS.md"), acTests()),
      /exists, but a bootstrap/,
    ],
  ]) {
    const root = bootWorld();
    try {
      assert.equal(cli(root, ["--write-bootstrap", NAME]).code, 0);
      mutate(root);
      const r = cli(root, ["--check", NAME]);
      assert.equal(r.code, 1, `${why}: ${r.out}`);
      assert.match(r.out, re, why);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  const root = bootWorld();
  try {
    assert.equal(cli(root, ["--write-bootstrap", NAME]).code, 0);
    rmSync(join(root, "pharn", "features", NAME, "SPEC.md"));
    const r = cli(root, ["--check", NAME]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /SPEC\.md is not readable/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--write-bootstrap REFUSES: a feature SPEC, a legacy one, an AC-TESTS.md present, no pin, a malformed level, no SPEC", () => {
  for (const [why, spec, extra] of [
    ["a feature SPEC", specOf({ kind: null })],
    ["an explicit feature", specOf({ kind: "feature" })],
    ["a legacy SPEC", specOf({ legacy: true })],
    ["an invalid kind", specOf({ kind: "library" })],
    ["a Draft (no pin)", specOf({ approve: false })],
    ["a Draft carrying an invented pin", specOf({ approve: false }).replace('spec_content_hash: ""', `spec_content_hash: ${H}`)],
    ["a malformed level", specOf({ levels: ["unit", "smoke"] })],
    ["an AC-TESTS.md present", specOf(), (root) => writeFileSync(join(root, "pharn", "features", NAME, "AC-TESTS.md"), acTests())],
  ]) {
    const root = bootWorld(spec);
    try {
      if (extra) extra(root);
      const r = cli(root, ["--write-bootstrap", NAME]);
      assert.equal(r.code, 2, `${why}: ${r.out}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  const root = mkdtempSync(join(tmpdir(), "aclb-"));
  try {
    assert.equal(cli(root, ["--write-bootstrap", NAME]).code, 2, "no SPEC.md");
    assert.equal(cli(root, ["--write-bootstrap", "Bad Name"]).code, 2, "a non-slug name");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bootstrap shape: mapping, files, red_run, bootstrap each closed (exit 2 on a violation)", () => {
  const root = bootWorld();
  try {
    cli(root, ["--write-bootstrap", NAME]);
    const good = lockOf(root);
    for (const [why, bad] of [
      ["a mapping", { ...good, mapping: { path: "x", sha256: H } }],
      ["files", { ...good, files: [{ path: "x", sha256: H }] }],
      ["a red_run", { ...good, red_run: {} }],
      ["bootstrap extra key", { ...good, bootstrap: { ...good.bootstrap, x: 1 } }],
      ["bootstrap kind", { ...good, bootstrap: { ...good.bootstrap, spec_kind: "feature" } }],
      ["levels empty", { ...good, bootstrap: { ...good.bootstrap, levels: [] } }],
      ["a level outside the set", { ...good, bootstrap: { ...good.bootstrap, levels: ["smoke"] } }],
      ["levels unsorted", { ...good, bootstrap: { ...good.bootstrap, levels: ["unit", "e2e"] } }],
    ]) {
      writeLockJson(root, bad);
      assert.equal(cli(root, ["--check", NAME]).code, 2, why);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the test-infrastructure pin (6.20.0, schema /3) ──────────────────────────────────────────────────────────

/** A world with a package.json `test` script, a vitest-json results config and a root vitest config. */
function infraWorld() {
  const root = world();
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run", lint: "eslint ." } }));
  writeFileSync(join(root, "pharn.config.json"), JSON.stringify({ testResults: { test: "vitest-json" } }));
  writeFileSync(join(root, "vitest.config.ts"), "export default {}\n");
  return root;
}

test("/3 --write pins the test infrastructure; --check REDs a changed script, config or results format, naming it", () => {
  const cases = [
    [
      "the test script",
      (root) => writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run --passWithNoTests" } })),
      /test infrastructure changed — gate test: its package\.json script changed/,
    ],
    [
      "the runner config",
      (root) => writeFileSync(join(root, "vitest.config.ts"), "export default { test: {} }\n"),
      /test infrastructure changed — vitest\.config\.ts: the runner config changed/,
    ],
    [
      "the results format",
      (root) => writeFileSync(join(root, "pharn.config.json"), JSON.stringify({ testResults: {} })),
      /test infrastructure changed — gate test: its testResults format changed/,
    ],
  ];
  for (const [why, mutate, re] of cases) {
    const root = infraWorld();
    try {
      const w = cli(root, ["--write", NAME]);
      assert.equal(w.code, 0, w.out);
      assert.match(w.out, /the test infrastructure: 1 gate\(s\), 1 runner config\(s\)/);
      const lock = lockOf(root);
      assert.deepEqual(lock.test_infra.gates, [{ id: "test", script: "vitest run", pre: null, post: null, results: "vitest-json" }]);
      const g = cli(root, ["--check", NAME]);
      assert.equal(g.code, 0, g.out);
      assert.match(g.out, /the test-infrastructure pin holds/);
      mutate(root);
      const r = cli(root, ["--check", NAME]);
      assert.equal(r.code, 1, `${why}: ${r.out}`);
      assert.match(r.out, re, why);
      assert.ok(!r.out.includes("passWithNoTests"), `${why}: the script text leaked`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("/3 --write REFUSES a test infrastructure it cannot pin: a symlinked runner config, an unparseable package.json, no mapping", () => {
  const root = infraWorld();
  try {
    rmSync(join(root, "vitest.config.ts"));
    writeFileSync(join(root, "real.ts"), "x");
    symlinkSync(join(root, "real.ts"), join(root, "vitest.config.ts"));
    let w = cli(root, ["--write", NAME]);
    assert.equal(w.code, 2, w.out);
    assert.match(w.out, /cannot be pinned: vitest\.config\.ts is a symlink/);
    rmSync(join(root, "vitest.config.ts"));
    writeFileSync(join(root, "package.json"), "{");
    w = cli(root, ["--write", NAME]);
    assert.equal(w.code, 2, w.out);
    assert.match(w.out, /package\.json is not valid JSON/);
    writeFileSync(join(root, "package.json"), "{}");
    writeFileSync(join(root, "pharn/features/demo/AC-TESTS.md"), acTests().replace(/## Mapping[\s\S]*$/, ""));
    w = cli(root, ["--write", NAME]);
    assert.equal(w.code, 2, w.out);
    assert.match(w.out, /no usable `## Mapping`/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("/2 is still read: GREEN with --require-red-run, saying it has no pin; a red run is never recorded on it; /3 test-first requires the pin", () => {
  const root = infraWorld();
  try {
    cli(root, ["--write", NAME]);
    const lock = lockOf(root);
    writeLockJson(root, { ...lock, schema: "ac-tests-lock/2", test_infra: null, red_run: redRunFor(lock) });
    const r = cli(root, ["--check", NAME, "--require-red-run"]);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /no test-infrastructure pin \(ac-tests-lock\/2\)/);
    writeLockJson(root, { ...lock, schema: "ac-tests-lock/2", test_infra: null });
    const rec = cli(root, ["--record-red-run", NAME, "--out", ".pharn/x"]);
    assert.equal(rec.code, 2, rec.out);
    assert.match(rec.out, /ac-tests-lock\/2 test-first; a red run is recorded on an ac-tests-lock\/3 test-first lock/);
    writeLockJson(root, { ...lock, test_infra: null });
    const u = cli(root, ["--check", NAME]);
    assert.equal(u.code, 2, u.out);
    assert.match(u.out, /test_infra is not exactly/);
    writeLockJson(root, { ...lock, schema: "ac-tests-lock/2" });
    assert.match(cli(root, ["--check", NAME]).out, /test_infra must be null under ac-tests-lock\/2 test-first/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── 6.20.5: the lock reads a frontmatter field and a `## Files` path the way the rest of the floor does ──────────
// Each case is a review repro turned into a suite test (the repros imported the MAIN checkout, so they could not
// exercise a fix). L52: both paths of the reader finding (bootstrap and test-first) and both path findings.

/** Insert `line` directly above the frontmatter's current `spec_content_hash:` line. */
const pinLineAbove = (spec, line) => spec.replace(/^spec_content_hash: /m, `${line}\nspec_content_hash: `);

test("6.20.5 bootstrap: a SPEC re-approved by APPENDING a new pin under the old one is a --check RED (was GREEN)", () => {
  const first = specOf();
  const root = bootWorld(first);
  try {
    assert.equal(cli(root, ["--write-bootstrap", NAME]).code, 0);
    // The body changes and is re-approved, but the OLD pin line is left above the new one. check-spec reads the LAST
    // copy, so the SPEC is Approved and un-drifted — and the lock must read that same copy.
    const changed = pinLineAbove(specOf({ salt: "-2" }), `spec_content_hash: ${pinOf(first)}`);
    setSpec(root, changed);
    const approved = spawnSync(
      process.execPath,
      [join(HERE, "check-spec-approved.mjs"), join(root, "pharn", "features", NAME, "SPEC.md")],
      {
        encoding: "utf8",
      }
    );
    assert.equal(approved.status, 0, `precondition: check-spec-approved reads the appended pin: ${approved.stdout}`);
    const r = cli(root, ["--check", NAME, "--require-red-run", "--allow-bootstrap"]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /spec_id \/ spec_content_hash changed since the lock was written/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('6.20.5 bootstrap: a Draft\'s leftover `spec_content_hash: ""` line above the real pin no longer refuses the write', () => {
  const spec = specOf();
  const root = bootWorld(pinLineAbove(spec, 'spec_content_hash: ""'));
  try {
    const w = cli(root, ["--write-bootstrap", NAME]);
    assert.equal(w.code, 0, w.out);
    assert.equal(lockOf(root).spec.spec_content_hash, pinOf(spec), "the lock records the pin check-spec approved");
    assert.equal(cli(root, ["--check", NAME, "--require-red-run", "--allow-bootstrap"]).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("6.20.5 test-first: AC-TESTS.md with stale-then-current pins locks the CURRENT one (the one the chain check reads)", () => {
  const root = world();
  const stale = "b".repeat(64);
  try {
    const p = join(root, "pharn", "features", NAME, "AC-TESTS.md");
    writeFileSync(p, acTests().replace(`spec_content_hash: ${H}`, `spec_content_hash: ${stale}\nspec_content_hash: ${H}`));
    assert.equal(cli(root, ["--write", NAME]).code, 0);
    assert.equal(lockOf(root).spec.spec_content_hash, H);
    assert.equal(cli(root, ["--check", NAME]).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("6.20.5 test-first: a `## Files` entry with a ` (…)` annotation is locked as the path the setter scopes", () => {
  const root = world();
  try {
    const p = join(root, "pharn", "features", NAME, "AC-TESTS.md");
    writeFileSync(p, acTests().replace("`tests/ac/one.test.js`", "`tests/ac/one.test.js (new)`"));
    const w = cli(root, ["--write", NAME]);
    assert.equal(w.code, 0, `the setter scopes the bare path, so --write must too: ${w.out}`);
    assert.deepEqual(
      lockOf(root).files.map((f) => f.path),
      FILES
    );
    assert.equal(cli(root, ["--check", NAME]).code, 0, "and --check compares the ## Files set in the same spelling");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("6.20.5: a `## Files` entry the setter would drop (placeholder or glob) refuses --write by name", () => {
  const root = world();
  try {
    const p = join(root, "pharn", "features", NAME, "AC-TESTS.md");
    writeFileSync(p, acTests().replace("`tests/ac/two.spec.js`", "`tests/ac/<name>.spec.js`"));
    const w = cli(root, ["--write", NAME]);
    assert.equal(w.code, 2, w.out);
    assert.match(w.out, /placeholder or glob — run check-ac-tests\.mjs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── 6.21.1 — the lock script reads its approval check as a VERDICT (the `nested-child-crash` follow-up) ─────────────
// Appended as one block. A crash of check-spec-approved.mjs is no verdict on the approval, never a RED; the L40 control
// is the same checker exiting 1 WITH its line (a drifted SPEC), which must still be the RED.
import { cpSync, existsSync, unlinkSync } from "node:fs";

function floorCopy() {
  const dir = mkdtempSync(join(tmpdir(), "acl-floor-"));
  cpSync(HERE, join(dir, "pharn", "floor"), {
    recursive: true,
    filter: (src) => !src.endsWith(".test.mjs") && !src.includes("test-fixtures"),
  });
  cpSync(join(HERE, "..", "pharn-contracts"), join(dir, "pharn", "pharn-contracts"), { recursive: true });
  return dir;
}
const APPROVED = (copy) => join(copy, "pharn", "floor", "check-spec-approved.mjs");
/** L29: the ways the shelled approval check can crash. */
const APPROVAL_CRASHES = [
  ["throws at load", (copy) => writeFileSync(APPROVED(copy), 'throw new Error("simulated module-load failure");\n')],
  ["is missing", (copy) => unlinkSync(APPROVED(copy))],
  ["exits 1 with no output", (copy) => writeFileSync(APPROVED(copy), "process.exit(1);\n")],
];
const copyCli = (copy, root, args) => {
  const r = spawnSync(process.execPath, [join(copy, "pharn", "floor", "ac-tests-lock.mjs"), ...args], { cwd: root, encoding: "utf8" });
  return { code: r.status, out: r.stdout };
};
function withBroken(breakIt, fn) {
  const copy = floorCopy();
  try {
    breakIt(copy);
    return fn(copy);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}
const CHECK_ARGS = ["--check", NAME, "--require-red-run", "--allow-bootstrap"];

test("6.21.1 bootstrap --check: a crashed approval check with no RED is exit 2, `UNUSABLE child-crashed` FIRST — never a RED", () => {
  const root = bootWorld();
  try {
    assert.equal(cli(root, ["--write-bootstrap", NAME]).code, 0, "fixture: the real floor writes the bootstrap lock");
    assert.equal(cli(root, CHECK_ARGS).code, 0, "control: the intact floor checks it GREEN");
    for (const [label, breakIt] of APPROVAL_CRASHES) {
      withBroken(breakIt, (copy) => {
        const r = copyCli(copy, root, CHECK_ARGS);
        assert.equal(r.code, 2, `${label}: ${r.out}`);
        assert.match(
          r.out.split("\n")[0],
          /^UNUSABLE child-crashed — check-spec-approved\.mjs .* the SPEC's approval was not checked$/,
          label
        );
        assert.doesNotMatch(r.out, /^RED — /m, label);
      });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("6.21.1 bootstrap --check: beside a definite RED the exit stays 1, the crash named before the closing line", () => {
  const root = bootWorld();
  try {
    assert.equal(cli(root, ["--write-bootstrap", NAME]).code, 0);
    setSpec(root, specOf({ kind: null }));
    withBroken(APPROVAL_CRASHES[0][1], (copy) => {
      const r = copyCli(copy, root, CHECK_ARGS);
      assert.equal(r.code, 1, r.out);
      const lines = r.out.trimEnd().split("\n");
      assert.match(lines[0], /^RED — .*no longer `spec_kind: test-infra`/);
      assert.ok(
        lines.some((l) => l.startsWith("UNUSABLE child-crashed — check-spec-approved.mjs")),
        r.out
      );
      assert.doesNotMatch(r.out, /is not an Approved, un-drifted SPEC/, "the crash is never counted as the approval RED");
      const reds = lines.filter((l) => l.startsWith("RED — ")).length - 1;
      assert.ok(reds >= 1, "at least the kind RED");
      assert.equal(lines.at(-1), `RED — ${reds} AC-tests lock check(s) failed`, "the closing line counts the REDs only");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("6.21.1 --write-bootstrap: a crashed approval check refuses with `UNUSABLE child-crashed`, and writes no lock", () => {
  const root = bootWorld();
  try {
    for (const [label, breakIt] of APPROVAL_CRASHES) {
      withBroken(breakIt, (copy) => {
        const r = copyCli(copy, root, ["--write-bootstrap", NAME]);
        assert.equal(r.code, 2, `${label}: ${r.out}`);
        assert.match(r.out, /^UNUSABLE child-crashed — check-spec-approved\.mjs /, label);
        assert.doesNotMatch(r.out, /is not an Approved, un-drifted SPEC/, `${label}: the SPEC is not blamed`);
        assert.equal(existsSync(join(root, "pharn", "features", NAME, "AC-TESTS.lock.json")), false, label);
      });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("6.21.1 control (L40): the approval check exiting 1 WITH its line (a drifted SPEC) is still the RED, at --check and --write-bootstrap", () => {
  const spec = specOf();
  const root = bootWorld(spec);
  try {
    assert.equal(cli(root, ["--write-bootstrap", NAME]).code, 0);
    setSpec(root, `${spec}\nedited after approval\n`);
    const c = cli(root, CHECK_ARGS);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /^RED — pharn\/features\/demo\/SPEC\.md is not an Approved, un-drifted SPEC \(check-spec-approved\.mjs exit 1\)$/m);
    assert.doesNotMatch(c.out, /child-crashed/);
    unlinkSync(join(root, "pharn", "features", NAME, "AC-TESTS.lock.json"));
    const w = cli(root, ["--write-bootstrap", NAME]);
    assert.equal(w.code, 2, w.out);
    assert.match(w.out, /^UNUSABLE — .*is not an Approved, un-drifted SPEC/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("6.21.1: --record-red-run over a lock that checks RED exits 1 and records nothing (checkLock's return is {reds, crash})", () => {
  const root = world();
  try {
    assert.equal(cli(root, ["--write", NAME]).code, 0);
    writeFileSync(join(root, FILES[0]), "edited after the lock\n");
    const r = cli(root, ["--record-red-run", NAME, "--out", ".pharn/pharn-test/gates"]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^RED — tests\/ac\/one\.test\.js changed since the lock was written$/m);
    assert.equal(lockOf(root).red_run, null, "nothing recorded");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
