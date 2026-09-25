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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PIPE_BUFFER = 65536;

/** THE SET. `form` is how the CLI ends; `crashArgs` reach a print on the first code path (bad usage). */
const FLUSH_CLIS = [
  { file: "check-verify.mjs", form: "sentinel", crashArgs: [] },
  { file: "check-regress.mjs", form: "sentinel", crashArgs: [] },
  { file: "check-loop.mjs", form: "sentinel", crashArgs: [] },
  { file: "check-red-run.mjs", form: "exitCode", crashArgs: [] },
];

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
    } else {
      assert.match(src, /process\.exitCode = main\(process\.argv\);/, `${file}: the exit code is set, never forced`);
    }
  }
});

test("★ a crash stays a crash — a non-sentinel throw exits non-zero with its stack and prints no verdict (GATE-1 condition 1)", () => {
  // No CLI in the set has a natural input that throws inside main() (every read is caught into a verdict), so a
  // preload makes console.log itself throw — the first thing each CLI does on its bad-usage path.
  const preload = 'data:text/javascript,console.log=()=>{throw new Error("pharn-test-crash")}';
  for (const { file, crashArgs } of FLUSH_CLIS) {
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
