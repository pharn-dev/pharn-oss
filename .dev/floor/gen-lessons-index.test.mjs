// .dev/floor/gen-lessons-index.test.mjs — hermetic tests for the lessons-index generator.
//
// Every test runs against a THROWAWAY target dir under os.tmpdir(), never the live repo — the generator
// writes, so a test that pointed at the repo would mutate committed bytes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, openSync, readSync, fstatSync, closeSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { generate } from "./gen-lessons-index.mjs";
import { CANON_PATH, OUT_PATH } from "./lessons-index-core.mjs";

/** Build a throwaway repo whose canon holds `canonText`. Returns its path. */
function fixture(canonText) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-lessons-index-"));
  const canonAbs = join(dir, CANON_PATH);
  mkdirSync(dirname(canonAbs), { recursive: true });
  writeFileSync(canonAbs, canonText);
  return dir;
}

const CANON = [
  "# Lessons learned",
  "",
  "## L1 — first",
  "",
  "type: floor · concepts: [enum-gate]",
  "",
  "**Lesson.** x",
  "",
  "## L2 — second",
  "",
  "**Lesson.** y",
].join("\n");

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

test("writes the index to docs/lessons-index.md and reports the lesson count", () => {
  const dir = fixture(CANON);
  try {
    const { entries, updated } = generate(dir);
    assert.equal(entries.length, 2);
    assert.equal(updated, true);
    const out = readFileSync(join(dir, OUT_PATH), "utf8");
    assert.match(out, /# Lessons index/);
    assert.match(out, /2 lessons · 1 tagged · 0 malformed · 1 untagged/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a second run is a true filesystem NO-OP (idempotence, not merely byte-equality)", () => {
  const dir = fixture(CANON);
  try {
    generate(dir);
    const abs = join(dir, OUT_PATH);
    const before = readSnapshot(abs);
    const { updated } = generate(dir);
    assert.equal(updated, false, "the second run must not report an update");
    const after = readSnapshot(abs);
    assert.equal(after.mtimeMs, before.mtimeMs, "the file must not be rewritten when unchanged");
    assert.equal(after.content, before.content);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a canon edit is picked up on regeneration", () => {
  const dir = fixture(CANON);
  try {
    generate(dir);
    writeFileSync(join(dir, CANON_PATH), `${CANON}\n\n## L3 — third\n\n**Lesson.** z`);
    const { entries, updated } = generate(dir);
    assert.equal(updated, true);
    assert.equal(entries.length, 3);
    assert.match(readFileSync(join(dir, OUT_PATH), "utf8"), /3 lessons/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MISSING canon is a hard THROW — never a plausible-looking empty index (fail-closed, P5)", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-lessons-index-empty-"));
  try {
    assert.throws(() => generate(dir), /canon is missing or unreadable/);
    assert.equal(existsSync(join(dir, OUT_PATH)), false, "nothing may be written when canon is unreadable");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a canon with NO `## L<n> ` headings is a hard THROW, not an empty index", () => {
  const dir = fixture("# Lessons learned\n\nNothing promoted yet.\n");
  try {
    assert.throws(() => generate(dir), /refusing to render an empty index as fact/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a duplicate id in canon aborts the generator and writes nothing", () => {
  const dir = fixture("## L1 — a\n\nx\n\n## L1 — b\n\ny");
  try {
    assert.throws(() => generate(dir), /duplicate lesson id/);
    assert.equal(existsSync(join(dir, OUT_PATH)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 7.3.0: the CLI prints one `RED —` line on an invalid canon, never node's stack trace; the exit code stays 1.
test("CLI: an invalid canon prints one `RED —` line, exits 1, and prints no stack trace", () => {
  const dir = fixture("## L1 — a\n\nx\n\n## L1 — b\n\ny");
  try {
    const cli = new URL("./gen-lessons-index.mjs", import.meta.url).pathname;
    const r = spawnSync(process.execPath, [cli, dir], { encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /^RED — lessons-index: duplicate lesson id "L1"/);
    assert.doesNotMatch(r.stdout + r.stderr, /\n\s+at |Node\.js v/);
    assert.equal(existsSync(join(dir, OUT_PATH)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: a valid canon writes the index, prints one summary line and exits 0; a re-run reports `already current`", () => {
  const dir = fixture(CANON);
  try {
    const cli = new URL("./gen-lessons-index.mjs", import.meta.url).pathname;
    const first = spawnSync(process.execPath, [cli, dir], { encoding: "utf8" });
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.equal(first.stdout, `lessons-index: 2 lesson(s) from ${CANON_PATH}; ${OUT_PATH} updated\n`);
    assert.match(readFileSync(join(dir, OUT_PATH), "utf8"), /2 lessons/);
    const again = spawnSync(process.execPath, [cli, dir], { encoding: "utf8" });
    assert.equal(again.status, 0);
    assert.equal(again.stdout, `lessons-index: 2 lesson(s) from ${CANON_PATH}; ${OUT_PATH} already current\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
