// pharn/floor/gen-lessons-index.test.mjs — hermetic tests for the PRODUCT lessons-index generator.
//
// Every case runs against a temp directory. Nothing here reads or writes the real repo.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  statSync,
  rmSync,
  openSync,
  readSync,
  fstatSync,
  closeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generate } from "./gen-lessons-index.mjs";
import { CANON_PATH, OUT_PATH, STATUS_OK, STATUS_NO_CANON } from "./lessons-index-core.mjs";

/** Make a temp repo. `canon === null` means "no canon file at all". */
function tmpRepo(canon) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-gen-lessons-index-"));
  if (canon !== null) {
    const abs = join(dir, CANON_PATH);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, canon);
  }
  return dir;
}

const CANON_ONE = "## L1 — a title\n\ntype: floor · concepts: [x]\n\nbody\n";

/** Read content + mtime from one open fd — avoids path-based TOCTOU between stat and read. */
function readSnapshot(abs) {
  const fd = openSync(abs, "r");
  try {
    const { mtimeMs, size } = fstatSync(fd);
    const buf = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const n = readSync(fd, buf, offset, size - offset, offset);
      if (n === 0) {
        throw new Error(`readSync returned 0 before filling ${size} bytes (got ${offset})`);
      }
      offset += n;
    }
    return { mtimeMs, content: buf.toString("utf8") };
  } finally {
    closeSync(fd);
  }
}

test("first run writes the cache and reports updated", () => {
  const dir = tmpRepo(CANON_ONE);
  try {
    const r = generate(dir);
    assert.equal(r.status, STATUS_OK);
    assert.equal(r.updated, true);
    assert.equal(r.entries.length, 1);
    assert.ok(existsSync(join(dir, OUT_PATH)), "the cache must exist after the first run");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the generator creates the pharn/.run/ directory when it does not exist", () => {
  const dir = tmpRepo(CANON_ONE);
  try {
    assert.equal(existsSync(join(dir, "pharn", ".run")), false, "precondition: no pharn/.run/ yet");
    generate(dir);
    assert.ok(statSync(join(dir, "pharn", ".run")).isDirectory());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a SECOND run is a true filesystem no-op — byte-identical AND mtime-unchanged (idempotence)", () => {
  const dir = tmpRepo(CANON_ONE);
  try {
    generate(dir);
    const abs = join(dir, OUT_PATH);
    const before = readSnapshot(abs);

    const r2 = generate(dir);
    assert.equal(r2.updated, false, "a second run must report no update");
    const after = readSnapshot(abs);
    assert.equal(after.content, before.content, "the bytes must be identical");
    assert.equal(after.mtimeMs, before.mtimeMs, "the file must not be rewritten at all — a no-op, not a rewrite");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a change to canon IS picked up on the next run", () => {
  const dir = tmpRepo(CANON_ONE);
  try {
    generate(dir);
    writeFileSync(join(dir, CANON_PATH), CANON_ONE + "\n## L2 — a second\n\nbody\n");
    const r = generate(dir);
    assert.equal(r.updated, true);
    assert.equal(r.entries.length, 2);
    assert.match(readFileSync(join(dir, OUT_PATH), "utf8"), /2 lessons/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PRODUCT DIVERGENCE: no canon -> exit-0-equivalent no-op; NOTHING is written", () => {
  const dir = tmpRepo(null);
  try {
    const r = generate(dir);
    assert.equal(r.status, STATUS_NO_CANON);
    assert.equal(r.updated, false);
    assert.equal(existsSync(join(dir, OUT_PATH)), false, "no canon must mean no cache file — never an empty index rendered as fact");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PRODUCT DIVERGENCE: a canon with zero lessons -> no-op; NOTHING is written", () => {
  const dir = tmpRepo("# Lessons learned\n\nNothing promoted yet.\n");
  try {
    const r = generate(dir);
    assert.equal(r.status, STATUS_NO_CANON);
    assert.equal(existsSync(join(dir, OUT_PATH)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a present-but-INVALID canon still throws, and leaves no partial cache behind", () => {
  const dir = tmpRepo("## L1 — a\n\nx\n\n## L1 — b\n\ny\n");
  try {
    assert.throws(() => generate(dir), /duplicate lesson id "L1"/);
    assert.equal(existsSync(join(dir, OUT_PATH)), false, "a refusal must never leave a half-written cache");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the emitted cache carries the generator's own regenerate hint, and it names a LIVE op (L2)", () => {
  const dir = tmpRepo(CANON_ONE);
  try {
    generate(dir);
    const out = readFileSync(join(dir, OUT_PATH), "utf8");
    assert.match(out, /node pharn\/floor\/gen-lessons-index\.mjs \./, "the hint must be a bare node invocation");
    assert.ok(!/npm run docs:generate/.test(out), "a user's repo has no npm script — citing one would be a dead op (L2)");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── 6.69.0: `--canon-root` ─────────────────────────────────────────────────────────────────────────────

const GEN_CLI = fileURLToPath(new URL("./gen-lessons-index.mjs", import.meta.url));

test("CLI --canon-root: reads canon under that root, writes the same pharn/.run/ cache, and the hint carries the flag", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-gen-lessons-root-"));
  try {
    mkdirSync(join(dir, "team", "canon"), { recursive: true });
    writeFileSync(join(dir, "team", "canon", "lessons-learned.md"), CANON_ONE);
    const r = spawnSync(process.execPath, [GEN_CLI, "--canon-root", "team/canon", dir], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /1 lesson\(s\) from team\/canon\/lessons-learned\.md; pharn\/\.run\/lessons-index\.md updated/);
    const out = readFileSync(join(dir, OUT_PATH), "utf8");
    assert.match(out, /^<!-- GENERATED by pharn\/floor\/gen-lessons-index\.mjs from team\/canon\/lessons-learned\.md /);
    assert.match(out, /Regenerate: node pharn\/floor\/gen-lessons-index\.mjs --canon-root team\/canon \. -->/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI with NO flag reads pharn/memory-bank/ (L41 — the default is the production path)", () => {
  const dir = tmpRepo(CANON_ONE);
  try {
    const r = spawnSync(process.execPath, [GEN_CLI, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /from pharn\/memory-bank\/lessons-learned\.md/);
    assert.match(readFileSync(join(dir, OUT_PATH), "utf8"), /Regenerate: node pharn\/floor\/gen-lessons-index\.mjs \. -->/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: an invalid --canon-root exits 2 and writes nothing", () => {
  const dir = tmpRepo(CANON_ONE);
  try {
    const r = spawnSync(process.execPath, [GEN_CLI, "--canon-root", "/etc", dir], { encoding: "utf8" });
    assert.equal(r.status, 2);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /^gen-lessons-index: --canon-root must be repo-relative/);
    assert.equal(existsSync(join(dir, OUT_PATH)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
