// pharn/floor/cli-stdout-flush.test.mjs — THE FLUSH RULE (6.20.4), over the one set it applies to.
//
// THE RECORDED FAILURE: check-verify.mjs printed its verdict with console.log and then ended the process at once, so
// on a platform whose piped stdout is asynchronous (darwin) everything past the pipe's 64 KiB buffer was dropped at
// exit. The 6.20.0 `ac_gate` block is unbounded, and check-loop-fresh.mjs check E re-runs check-verify through
// spawnSync (a pipe) and JSON.parses the output — so a feature with many AC tests read "unusable" there on every
// iteration (the review measured 75,785 bytes to a file, 65,536 through a pipe).
//
// THE SET (L29 — the enumeration is the deliverable): the floor CLIs whose stdout a FLOOR spawnSync caller PARSES —
// check-verify and check-regress (check-loop-fresh.mjs check E), check-loop (check-loop-decision.mjs) — plus
// check-red-run, which the review named (its `--verdict` lists every failed test per AC). Every other floor CLI's
// spawner reads only its exit status or first line, which a 64 KiB cut cannot reach.
// Since review-fanout the set also holds EVERY code scanner (`scan-code-*.mjs`): render-review-assignments.mjs
// JSON-parses each one's `--files` batch document, which over a large target is far past 64 KiB, and a cut document
// would turn every file of that lens into a scanner error. Their rows are DERIVED from lens-scanner-map.json and
// asserted set-equal to the scanners on disk (L36), never hand-listed. A scanner ends `process.exitCode =
// runScannerCli(…)` (form "scanner"), and its crash preload replaces `process.stdout.write`, the call it prints with.
//
// WHAT THIS FILE CAN AND CANNOT PROVE, stated because it is not obvious:
//   * The STATIC pin (no code line calls `process.exit(`) is the platform-independent guard — and a PROXY.
//   * The pipe round-trips discriminate only where piped stdout is asynchronous. CI runs Linux, where Node documents
//     pipes as synchronous, so there the old pattern may not truncate at all; each round-trip therefore MEASURES its
//     own negative control (a `process.exit` child through the same pipe) and reports it, never asserts it.
//   * The set is a PRESENCE set (L36): a future floor caller that starts parsing another CLI's stdout is not detected
//     here. Converting that CLI is the caller's obligation.
//   * spawnSync's default maxBuffer (1 MiB) is not raised: past it the child is killed and `r.error` is set, which
//     check-loop-fresh.mjs maps to INCONCLUSIVE with the checker named — fail-closed, never a silent pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PIPE_BUFFER = 65536;

/** The code scanners, from the map (THE SET's derived half). */
const SCANNERS = [
  ...new Set(
    Object.values(JSON.parse(readFileSync(join(HERE, "lens-scanner-map.json"), "utf8")).scanners).filter((s) => typeof s === "string")
  ),
].sort();

/** A real file every scanner can read — the scanners' print is the verdict of a successful scan, not bad usage. */
const SCAN_FIXTURE_DIR = mkdtempSync(join(tmpdir(), "flush-scan-"));
const SCAN_FIXTURE = join(SCAN_FIXTURE_DIR, "fixture.js");
writeFileSync(SCAN_FIXTURE, 'const k = "AKIAIOSFODNN7EXAMPLE";\n');
process.on("exit", () => rmSync(SCAN_FIXTURE_DIR, { recursive: true, force: true }));

/** THE SET. `form` is how the CLI ends; `crashArgs` reach a print on the first code path (bad usage, or a scan). */
const FLUSH_CLIS = [
  { file: "check-verify.mjs", form: "sentinel", crashArgs: [] },
  { file: "check-regress.mjs", form: "sentinel", crashArgs: [] },
  { file: "check-loop.mjs", form: "sentinel", crashArgs: [] },
  { file: "check-red-run.mjs", form: "exitCode", crashArgs: [] },
  ...SCANNERS.map((file) => ({ file, form: "scanner", crashArgs: [SCAN_FIXTURE] })),
];

test("✧ THE SET's scanner rows are exactly the scan-code-*.mjs files on disk (L36 — derived, never hand-listed)", () => {
  const onDisk = readdirSync(HERE)
    .filter((f) => f.startsWith("scan-code-") && f.endsWith(".mjs") && !f.endsWith(".test.mjs"))
    .sort();
  assert.ok(SCANNERS.length >= 18, `${SCANNERS.length} scanner row(s)`);
  assert.deepEqual(SCANNERS, onDisk);
});

/** Code lines only: a line whose first non-blank characters open a comment is prose, and the fix's own rationale
 *  names the call it replaced. */
const codeLines = (src) => src.split("\n").filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l));

test("✧ STATIC PIN — no code line of a CLI in the set ends the process with `process.exit(`", () => {
  for (const { file, form } of FLUSH_CLIS) {
    const src = readFileSync(join(HERE, file), "utf8");
    const hits = codeLines(src).filter((l) => /\bprocess\.exit\s*\(/.test(l));
    assert.deepEqual(hits, [], `${file} ends through an immediate exit, which drops queued stdout`);
    if (form === "sentinel") {
      assert.match(src, /process\.exitCode = code;\n\s*throw EMITTED;/, `${file}: emit sets exitCode, then unwinds`);
      assert.match(src, /catch \(e\) \{\n\s*if \(e !== EMITTED\) throw e;\n\s*\}/, `${file}: the catch swallows ONLY the sentinel`);
    } else if (form === "scanner") {
      assert.match(src, /process\.exitCode = runScannerCli\(/, `${file}: the exit code is set from the shared front end, never forced`);
    } else {
      assert.match(src, /process\.exitCode = main\(process\.argv\);/, `${file}: the exit code is set, never forced`);
    }
  }
  // The scanners' shared front end prints for all of them, so it carries the same pin.
  const core = codeLines(readFileSync(join(HERE, "code-scanner-cli.mjs"), "utf8")).filter((l) => /\bprocess\.exit\s*\(/.test(l));
  assert.deepEqual(core, [], "code-scanner-cli.mjs ends nothing through an immediate exit");
});

test("★ a crash stays a crash — a non-sentinel throw exits non-zero with its stack and prints no verdict (GATE-1 condition 1)", () => {
  // No CLI in the set has a natural input that throws inside main() (every read is caught into a verdict), so a
  // preload makes the CLI's print call itself throw — console.log for the checkers (the first thing each does on its
  // bad-usage path), process.stdout.write for the scanners (console.log would swallow a throwing write, and the
  // scanners never call it).
  const preloads = {
    console: 'data:text/javascript,console.log=()=>{throw new Error("pharn-test-crash")}',
    write: 'data:text/javascript,process.stdout.write=()=>{throw new Error("pharn-test-crash")}',
  };
  for (const { file, form, crashArgs } of FLUSH_CLIS) {
    const preload = form === "scanner" ? preloads.write : preloads.console;
    const script = join(HERE, file);
    const normal = spawnSync(process.execPath, [script, ...crashArgs], { encoding: "utf8" });
    assert.notEqual(normal.status, 1, `${file}: the control's own exit must differ from a crash's, or this proves nothing`);
    assert.notEqual(normal.stdout, "", `${file}: the control prints its usage verdict`);
    const crashed = spawnSync(process.execPath, ["--import", preload, script, ...crashArgs], { encoding: "utf8" });
    assert.equal(crashed.status, 1, `${file}: exit ${crashed.status} — the crash was swallowed`);
    assert.match(crashed.stderr, /Error: pharn-test-crash/, `${file}: the stack reaches stderr`);
    assert.equal(crashed.stdout, "", `${file}: no verdict printed`);
  }
});

/** The measured negative control: a child printing `bytes` then ending immediately, through the same kind of pipe. */
function oldPatternDelivers(bytes) {
  const r = spawnSync(process.execPath, ["-e", `console.log("x".repeat(${bytes}));process.exit(0)`], { encoding: "utf8" });
  return Buffer.byteLength(r.stdout);
}

test("★ check-verify — a >64 KiB verdict (positional map) reaches a pipe whole", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "flush-cv-"));
  try {
    const map = Object.fromEntries(Array.from({ length: 6000 }, (_, i) => [`gate-${String(i).padStart(5, "0")}`, 0]));
    writeFileSync(join(dir, "results.json"), JSON.stringify(map));
    const r = spawnSync(process.execPath, [join(HERE, "check-verify.mjs"), join(dir, "results.json"), "--feature", "f"], {
      encoding: "utf8",
    });
    const bytes = Buffer.byteLength(r.stdout);
    assert.ok(bytes > PIPE_BUFFER, `the recipe must exceed the pipe buffer to test anything (${bytes} bytes)`);
    const doc = JSON.parse(r.stdout);
    assert.equal(r.status, 0);
    assert.equal(doc.verdict, "PASS");
    assert.equal(Object.keys(doc.gates).length, 6000);
    t.diagnostic(`negative control on ${process.platform}: the old pattern delivered ${oldPatternDelivers(bytes)} of ${bytes + 1} bytes`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ check-regress — a >64 KiB `verdict` reaches a pipe whole", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "flush-cr-"));
  try {
    const map = Object.fromEntries(Array.from({ length: 6000 }, (_, i) => [`gate-${String(i).padStart(5, "0")}`, 0]));
    writeFileSync(join(dir, "base.json"), JSON.stringify(map));
    writeFileSync(join(dir, "head.json"), JSON.stringify(map));
    const r = spawnSync(process.execPath, [join(HERE, "check-regress.mjs"), "verdict", join(dir, "base.json"), join(dir, "head.json")], {
      encoding: "utf8",
    });
    const bytes = Buffer.byteLength(r.stdout);
    assert.ok(bytes > PIPE_BUFFER, `the recipe must exceed the pipe buffer to test anything (${bytes} bytes)`);
    const doc = JSON.parse(r.stdout);
    assert.equal(r.status, 0, JSON.stringify(doc).slice(0, 300));
    assert.equal(doc.verdict, "no-regressions");
    t.diagnostic(`negative control on ${process.platform}: the old pattern delivered ${oldPatternDelivers(bytes)} of ${bytes + 1} bytes`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const scanner of SCANNERS) {
  test(`★ ${scanner} — a >64 KiB --files batch document reaches a pipe whole`, (t) => {
    // One hit-bearing file listed 600 times under a long name: each result names the path and its hit, so the
    // document passes the pipe buffer whatever the scanner detects.
    const dir = mkdtempSync(join(tmpdir(), "flush-batch-"));
    try {
      const file = join(dir, `${"long-name-".repeat(12)}.js`);
      writeFileSync(file, 'const k = "AKIAIOSFODNN7EXAMPLE";\n');
      const list = Array.from({ length: 600 }, () => file).join(String.fromCharCode(0));
      const r = spawnSync(process.execPath, [join(HERE, scanner), "--files", "-"], { input: list, encoding: "utf8" });
      const bytes = Buffer.byteLength(r.stdout);
      assert.ok(bytes > PIPE_BUFFER, `the recipe must exceed the pipe buffer to test anything (${bytes} bytes)`);
      assert.equal(r.status, 0, r.stderr);
      const doc = JSON.parse(r.stdout);
      assert.equal(doc.results.length, 600, "every listed path has its entry");
      assert.ok(doc.results.every((e) => e.file === file && Array.isArray(e.hits)));
      t.diagnostic(`negative control on ${process.platform}: the old pattern delivered ${oldPatternDelivers(bytes)} of ${bytes + 1} bytes`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
