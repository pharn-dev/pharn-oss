// pharn/floor/code-scanner-cli.test.mjs — the shared front end of the 18 code scanners, and the ★ check that its
// batch mode says exactly what N single-file runs say (review-fanout, review finding CTX-3).
//
// THE LOAD-BEARING TEST is "★ BATCH ≡ SINGLE". It is a DIFFERENTIAL test (L55): the single-file mode is the reference
// implementation the batch mode must agree with, so each scanner's batch document over a corpus is compared, entry by
// entry, with real single-file runs of the same scanner over the same files. Three things keep it honest:
//   • THE SET (L29, L36): the scanners come from lens-scanner-map.json and are asserted set-equal to the
//     `scan-code-*.mjs` files on disk, so a 19th scanner is compared or the suite REDs.
//   • NON-VACUITY (L34): every scanner must hit at least one corpus file and miss at least one, or "batch equals
//     single" would hold over all-miss output and prove nothing about carried state.
//   • ITS OWN NEGATIVE CONTROL (L60): a mutant scanner that keeps its hit list at module level — the exact shape
//     scan-code-placeholder.mjs had before this change — goes through the same harness and must be caught.
// Each batch lists the files the scanner HITS first, so state carried from a hit into a later file would show.
//
// BOUND (P0): equality over THIS corpus — the 75 lens eval cases, every scanner's source and test file, and a path
// that does not exist. Carried state that no corpus file triggers is not excluded by it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { availableParallelism, tmpdir } from "node:os";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const NUL = String.fromCharCode(0);

/** THE SET: every mapped scanner, read from the map. */
const MAP = JSON.parse(readFileSync(join(HERE, "lens-scanner-map.json"), "utf8")).scanners;
const SCANNERS = [...new Set(Object.values(MAP).filter((s) => typeof s === "string"))].sort();

/** THE CORPUS: absolute paths. */
function corpus() {
  const files = [];
  const lensRoot = join(REPO, "pharn/pharn-review");
  for (const lens of readdirSync(lensRoot).sort()) {
    const cases = join(lensRoot, lens, "evals/cases");
    if (!existsSync(cases)) continue;
    for (const n of readdirSync(cases).sort()) files.push(join(cases, n));
  }
  for (const s of SCANNERS) files.push(join(HERE, s), join(HERE, s.replace(/\.mjs$/, ".test.mjs")));
  files.push(join(HERE, "code-scanner-cli.mjs"));
  files.push(join(tmpdir(), "pharn-code-scanner-cli-does-not-exist.js")); // a refusal must be equivalent too
  return files;
}

/** One single-file run, async, so a pool can run several at once. */
function runOne(script, file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, file], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function pool(items, width, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, worker));
  return out;
}

/** One batch run over `files` (stdin list). */
function runBatch(script, files) {
  const r = spawnSync(process.execPath, [script, "--files", "-"], {
    input: files.join(NUL),
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  assert.equal(r.status, 0, `${script} --files: ${r.stderr}`);
  return JSON.parse(r.stdout).results;
}

/**
 * The harness: compare one scanner's batch document with its single-file runs. Returns the disagreements (empty when
 * equivalent) and the hit / miss counts the non-vacuity rule reads.
 */
async function compareScanner(script, name, files) {
  const singles = await pool(files, Math.max(2, Math.min(8, availableParallelism())), (f) => runOne(script, f));
  const verdictOf = new Map(files.map((f, i) => [f, singles[i]]));
  const hitFirst = (f) => {
    const s = verdictOf.get(f);
    return s.code === 0 && JSON.parse(s.stdout).found === true ? 0 : 1;
  };
  const ordered = [...files].sort((a, b) => hitFirst(a) - hitFirst(b));
  const batch = runBatch(script, ordered);
  const problems = [];
  let hits = 0;
  let misses = 0;
  assert.equal(batch.length, ordered.length, `${name}: one batch entry per listed path`);
  ordered.forEach((file, i) => {
    const entry = batch[i];
    const single = verdictOf.get(file);
    if (entry.file !== file) problems.push(`${name}: entry ${i} names ${entry.file}, not ${file}`);
    const rest = { ...entry };
    delete rest.file;
    if (single.code === 0) {
      const expected = JSON.parse(single.stdout);
      if (JSON.stringify(rest) !== JSON.stringify(expected))
        problems.push(`${name}: ${file} — batch ${JSON.stringify(rest)} ≠ single ${single.stdout.trim()}`);
      if (expected.found) hits++;
      else misses++;
    } else {
      // A refusal: single-file prints `<name>: <message>` and nothing on stdout; batch carries the same message.
      if (single.stdout !== "") problems.push(`${name}: ${file} — a refusing single run printed on stdout`);
      if (`${name}: ${rest.error}\n` !== single.stderr)
        problems.push(`${name}: ${file} — batch error ${JSON.stringify(rest)} ≠ single stderr ${JSON.stringify(single.stderr)}`);
    }
  });
  return { problems, hits, misses };
}

test("✧ THE SET — the mapped scanners are exactly the scan-code-*.mjs files on disk (L36)", () => {
  const onDisk = readdirSync(HERE)
    .filter((f) => f.startsWith("scan-code-") && f.endsWith(".mjs") && !f.endsWith(".test.mjs"))
    .sort();
  assert.ok(SCANNERS.length >= 18, `the set is not silently small (${SCANNERS.length})`);
  assert.deepEqual(SCANNERS, onDisk);
});

for (const scanner of SCANNERS) {
  const name = scanner.replace(/\.mjs$/, "");
  test(`★ BATCH ≡ SINGLE — ${name}: every batch entry equals that file's single-file run, refusals included`, async () => {
    const files = corpus();
    assert.ok(files.length >= 100, `the corpus is not silently small (${files.length})`);
    const { problems, hits, misses } = await compareScanner(join(HERE, scanner), name, files);
    assert.deepEqual(problems, []);
    assert.ok(hits >= 1, `${name}: no corpus file hits — the comparison would hold over all-miss output (L34)`);
    assert.ok(misses >= 1, `${name}: no corpus file misses — nothing could carry a hit into a clean file`);
  });
}

test("★ NEGATIVE CONTROL — a scanner that keeps its hits at module level is CAUGHT by the same harness (L60)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-scanner-mutant-"));
  try {
    mkdirSync(join(dir, "floor"));
    for (const f of ["runtime-floor.mjs", "code-scanner-cli.mjs"]) cpSync(join(HERE, f), join(dir, "floor", f));
    const src = readFileSync(join(HERE, "scan-code-secrets.mjs"), "utf8");
    const anchor = "export function scanText(text) {\n  const hits = [];";
    assert.ok(src.includes(anchor), "the mutation anchor is present — a missing anchor would leave the control unmutated");
    // The shape scan-code-placeholder.mjs had while it ran once per process: the hit list outlives one file.
    const mutant = src.replace(anchor, "const hits = [];\nexport function scanText(text) {");
    writeFileSync(join(dir, "floor/scan-code-secrets.mjs"), mutant);
    const { problems, hits } = await compareScanner(join(dir, "floor/scan-code-secrets.mjs"), "scan-code-secrets", corpus());
    assert.ok(hits >= 1, "the mutant hit something, so it had a hit to carry");
    assert.ok(problems.length >= 1, "carried state must show up as a disagreement — else the ★ tests above prove nothing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- the batch flag's own contract -------------------------------------------------------------------------------

const SECRETS = join(HERE, "scan-code-secrets.mjs");

test("--files reads a list FILE and stdin (`-`) alike; empty entries and a trailing NUL are dropped", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-scanner-list-"));
  try {
    const a = join(dir, "with space.js");
    const b = join(dir, "with\nnewline.js");
    writeFileSync(a, 'const k = "AKIAIOSFODNN7EXAMPLE";\n');
    writeFileSync(b, "const x = 1;\n");
    const list = `${a}${NUL}${NUL}${b}${NUL}`;
    writeFileSync(join(dir, "list"), list);
    const viaFile = spawnSync(process.execPath, [SECRETS, "--files", join(dir, "list")], { encoding: "utf8" });
    const viaStdin = spawnSync(process.execPath, [SECRETS, "--files", "-"], { input: list, encoding: "utf8" });
    assert.equal(viaFile.status, 0);
    assert.equal(viaFile.stdout, viaStdin.stdout);
    assert.deepEqual(JSON.parse(viaFile.stdout), {
      results: [
        { file: a, found: true, hits: [{ line: 1, kind: "aws-access-key-id" }] },
        { file: b, found: false, hits: [] },
      ],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an empty list is an empty result document, exit 0", () => {
  const r = spawnSync(process.execPath, [SECRETS, "--files", "-"], { input: "", encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '{"results":[]}\n');
});

test("every usage refusal exits 1 with NOTHING on stdout (fail-closed, P5)", () => {
  const cases = [
    ["no argument", [], ""],
    ["--files with no value", ["--files"], ""],
    ["--files with an extra argument", ["--files", "-", "extra"], ""],
    ["--files naming a list that does not exist", ["--files", join(tmpdir(), "pharn-no-such-list")], ""],
  ];
  for (const [label, args, input] of cases) {
    const r = spawnSync(process.execPath, [SECRETS, ...args], { input, encoding: "utf8" });
    assert.equal(r.status, 1, label);
    assert.equal(r.stdout, "", label);
    assert.match(r.stderr, /^scan-code-secrets: /, label);
  }
});
