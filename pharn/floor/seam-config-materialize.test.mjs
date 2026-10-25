// pharn/floor/seam-config-materialize.test.mjs — black-box tests for /pharn-build Step 2c's seam-config extractor.
//
// Run as a subprocess in a fresh temp project per case (the script reads `pharn.config.json` and writes
// `pharn/.run/seam-config.json` relative to its cwd), asserting only on its public surface: exit code, the one stdout or
// stderr line, and the bytes it wrote (or did not write). Every written file is also fed to check-seam-config.mjs,
// the validator the next pinned line runs, so the two lines are tested as the command runs them.
//
// ★ PARITY: the inline one-liner this script replaced (6.67.0, audit LOOP-5) is kept below, byte for byte as
// /pharn-build shipped it through 6.66.0, and run over the same inputs. Where the script keeps the line's behavior the
// two must agree on exit code and bytes; the one declared change (a non-object top level HALTs) is asserted on both
// sides, so the divergence is measured rather than described.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, "seam-config-materialize.mjs");
const CHECK = join(here, "check-seam-config.mjs");

const DEFAULT_BYTES = JSON.stringify({ resolutionOrder: ["official-skill", "pinned-docs", "model", "fetch", "ask"] }, null, 2);
const SENTINEL = "SENTINEL — written before the run";

// The replaced line, verbatim (the `node -e` argument from .claude/commands/pharn-build.md Step 2c through 6.66.0).
const ONE_LINER =
  "const fs=require('fs');const DEF={resolutionOrder:['official-skill','pinned-docs','model','fetch','ask']};let c={},raw;try{raw=fs.readFileSync('pharn.config.json','utf8')}catch(e){if(e.code!=='ENOENT'){console.error('HALT: pharn.config.json unreadable: '+e.message);process.exit(1)}}if(raw!==undefined){try{c=JSON.parse(raw)}catch(e){console.error('HALT: pharn.config.json is present but not valid JSON ('+e.message+') — refusing to substitute the permissive default for your seam policy; fix the file.');process.exit(1)}}const seam=c.seam??DEF;fs.mkdirSync('pharn/.run',{recursive:true});fs.writeFileSync('pharn/.run/seam-config.json',JSON.stringify(seam,null,2))";

/**
 * Run `argv` in a fresh project. `config` is the `pharn.config.json` text (undefined = absent; a `{ dir: true }`
 * marker makes it a directory, so reading it fails with EISDIR). `prep(dir)` may plant anything else first.
 * Returns the spawn result plus the bytes of `pharn/.run/seam-config.json` (null when absent).
 */
function runIn(argv, config, prep) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-seam-mat-"));
  try {
    if (config && typeof config === "object" && config.dir) mkdirSync(join(dir, "pharn.config.json"));
    else if (config !== undefined) writeFileSync(join(dir, "pharn.config.json"), config);
    if (prep) prep(dir);
    const r = spawnSync(process.execPath, argv, { cwd: dir, encoding: "utf8" });
    const out = join(dir, "pharn", ".run", "seam-config.json");
    let written = null;
    try {
      written = readFileSync(out, "utf8");
    } catch {
      written = null;
    }
    let check = null;
    if (written !== null && written !== SENTINEL) check = spawnSync(process.execPath, [CHECK, out], { encoding: "utf8" });
    return { ...r, written, check };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const run = (config, prep) => runIn([SCRIPT], config, prep);
const runOld = (config, prep) => runIn(["-e", ONE_LINER], config, prep);
const plantSentinel = (dir) => {
  mkdirSync(join(dir, "pharn", ".run"), { recursive: true });
  writeFileSync(join(dir, "pharn", ".run", "seam-config.json"), SENTINEL);
};
const lines = (s) => s.split("\n").filter(Boolean);

test("(a) an absent pharn.config.json writes the default order, which the validator accepts", () => {
  const r = run(undefined);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.written, DEFAULT_BYTES);
  assert.deepEqual(lines(r.stdout), ["seam-config: wrote pharn/.run/seam-config.json from default (pharn.config.json absent)"]);
  assert.equal(r.stderr, "");
  assert.equal(r.check.status, 0, r.check.stdout);
});

test("(b) a config with no seam block, or a null one, writes the default", () => {
  for (const config of ["{}", '{"skillsVersion":"6.65.0"}', '{"seam":null}']) {
    const r = run(config);
    assert.equal(r.status, 0, `${config}: ${r.stderr}`);
    assert.equal(r.written, DEFAULT_BYTES, config);
    assert.match(r.stdout, /from default \(pharn\.config\.json has no seam block\)\n$/, config);
    assert.equal(r.check.status, 0, config);
  }
});

test("(c) a seam block is copied as given, 2-space JSON, no trailing newline — validating it is the next line's job", () => {
  const seam = { resolutionOrder: ["model", "ask"], modelConfidenceThreshold: "high", haltOnUnknown: true };
  const r = run(JSON.stringify({ skillsVersion: "6.65.0", seam }));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.written, JSON.stringify(seam, null, 2));
  assert.match(r.stdout, /from pharn\.config\.json seam block\n$/);
  assert.equal(r.check.status, 0, r.check.stdout);

  // An unsafe policy (no terminal `ask`) is still written — and the validator REDs it, so the build halts there.
  const unsafe = run(JSON.stringify({ seam: { resolutionOrder: ["model"] } }));
  assert.equal(unsafe.status, 0, unsafe.stderr);
  assert.equal(unsafe.written, JSON.stringify({ resolutionOrder: ["model"] }, null, 2));
  assert.notEqual(unsafe.check.status, 0, "control: check-seam-config refuses a policy with no ask");
});

test("(d) malformed JSON HALTs with exit 1, writes nothing, and leaves an older file as it was", () => {
  const r = run("{ not json");
  assert.equal(r.status, 1);
  assert.equal(r.written, null);
  assert.equal(r.stdout, "");
  assert.equal(lines(r.stderr).length, 1);
  assert.match(r.stderr, /^HALT: pharn\.config\.json is present but not valid JSON \(.+\) — refusing to substitute/);

  const kept = run("{ not json", plantSentinel);
  assert.equal(kept.status, 1);
  assert.equal(kept.written, SENTINEL, "an existing pharn/.run/seam-config.json is untouched on HALT");
});

test("(d) a top level that is not a JSON object HALTs (null, array, string, number) — the 6.67.0 change", () => {
  for (const config of ["null", "[]", '[{"seam":{"resolutionOrder":["ask"]}}]', '"seam"', "3", "true"]) {
    const r = run(config, plantSentinel);
    assert.equal(r.status, 1, config);
    assert.equal(r.written, SENTINEL, `${config}: nothing written`);
    assert.equal(lines(r.stderr).length, 1, `${config}: one line, no stack`);
    assert.match(r.stderr, /^HALT: pharn\.config\.json is present but its top level is not a JSON object/, config);
  }
});

test("(d) an unreadable pharn.config.json (a directory) HALTs with Node's reason", () => {
  const r = run({ dir: true });
  assert.equal(r.status, 1);
  assert.equal(r.written, null);
  assert.match(r.stderr, /^HALT: pharn\.config\.json unreadable: /);
  assert.equal(lines(r.stderr).length, 1);
});

test("a failed scratch write HALTs with one line instead of a stack (pharn/.run is a file)", () => {
  const r = run(undefined, (dir) => {
    mkdirSync(join(dir, "pharn"), { recursive: true });
    writeFileSync(join(dir, "pharn", ".run"), "not a directory");
  });
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "");
  assert.equal(lines(r.stderr).length, 1, r.stderr);
  assert.match(r.stderr, /^HALT: could not write pharn\/\.run\/seam-config\.json: /);
});

test('L62: a hostile value never reaches a message — `{"toString":1}` anywhere is copied or ignored, never thrown on', () => {
  // Control: the value really does make String() throw, so the cases below are not vacuous.
  assert.throws(() => String(JSON.parse('{"toString":1}')), TypeError);

  const top = run('{"toString":1}');
  assert.equal(top.status, 0, top.stderr);
  assert.equal(top.written, DEFAULT_BYTES, "an object top level with no seam takes the default");

  const inSeam = run('{"seam":{"toString":1,"resolutionOrder":["ask"]}}');
  assert.equal(inSeam.status, 0, inSeam.stderr);
  assert.equal(inSeam.written, JSON.stringify({ toString: 1, resolutionOrder: ["ask"] }, null, 2));

  const asSeam = run('{"seam":{"toString":1}}');
  assert.equal(asSeam.status, 0, asSeam.stderr);
  assert.notEqual(asSeam.check.status, 0, "copied, then refused by the validator (no resolutionOrder)");
});

test("an inherited `seam` is not read — only the config's own property counts (L15)", () => {
  // JSON.parse makes "__proto__" an own data property, so a nested seam under it is not the config's own `seam`.
  const r = run('{"__proto__":{"seam":{"resolutionOrder":["model"]}}}');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.written, DEFAULT_BYTES);
});

test("★ PARITY with the replaced one-liner: same exit and bytes wherever behavior is kept", () => {
  const kept = [
    undefined,
    "{}",
    '{"seam":null}',
    JSON.stringify({ seam: { resolutionOrder: ["pinned-docs", "ask"], haltOnUnknown: false } }),
    JSON.stringify({ seam: { resolutionOrder: ["model"] } }),
    "{ not json",
  ];
  for (const config of kept) {
    const now = run(config);
    const old = runOld(config);
    assert.equal(now.status, old.status, `exit for ${config}`);
    assert.equal(now.written, old.written, `bytes for ${config}`);
  }
  // Non-vacuity: the reference really runs (it wrote the default for an absent config).
  assert.equal(runOld(undefined).written, DEFAULT_BYTES);
});

test("★ PARITY, the declared divergence: a non-object top level — the one-liner defaulted or crashed, the script HALTs", () => {
  for (const config of ["[]", '"seam"', "3"]) {
    const old = runOld(config);
    assert.equal(old.status, 0, `the one-liner took the default for ${config}`);
    assert.equal(old.written, DEFAULT_BYTES);
    assert.equal(run(config).status, 1);
  }
  const oldNull = runOld("null");
  assert.equal(oldNull.status, 1, "the one-liner crashed on null");
  assert.match(oldNull.stderr, /TypeError/, "with a stack, not a HALT line");
  assert.match(run("null").stderr, /^HALT: /);
});
