// pharn/floor/render-review-assignments.test.mjs — behaviour pins for the assignment-record emitter.
//
// The two FAIL-CLOSED edges are the reason this file exists. Both were raised by this increment's own
// grill (G1, G4) against a plan that specified the happy path precisely and the edges not at all, and
// both are pinned here because an unexercised fail-closed path is the L41 blind spot: the only caller
// that ever reaches it is production.
//
// The `--base` default is exercised with the flag ABSENT (L41 again, and this time the measured one:
// the 5.0.0 relocation left render-ship-briefing.mjs's CLI default stale while a 1979-green suite saw
// nothing, because every test passed --base explicitly for hermeticity).
//
// ★ LISTING (stage-git-maxbuffer, 6.28.3): the merge-base diff that resolves a target when no --target is given, over a
// diff naming more than 1 MiB of paths — which, at node's default buffer, read as "yielded nothing" (L41 once more).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  cpSync,
  rmSync,
  readdirSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BASIS_ENUM,
  SKIP_REASON_ENUM,
  SCANNER_FAILURE_ENUM,
  MAX_TARGET_FILE_BYTES,
  BINARY_SNIFF_BYTES,
  SCANNER_TIMEOUT_BASE_MS,
  SCANNER_TIMEOUT_MS_PER_KIB,
  scannerTimeoutMs,
  lensNameFromPath,
  computeAssignments,
  unassignedScannerBound,
  resolveTarget,
  renderAssignments,
} from "./render-review-assignments.mjs";
import { checkRecord } from "./check-review-assignments.mjs";

// A minimal but REAL repo: the actual count-lenses.mjs and actual scanners, over a two-lens map. Real
// rather than stubbed, because the emitter's whole claim is that the slice comes from the scanner's own
// verdict — a stubbed scanner would test the test.
function fakeRepo({ mapOverride } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-emit-"));
  mkdirSync(join(dir, "pharn/floor"), { recursive: true });
  mkdirSync(join(dir, "pharn/pharn-review/secrets-in-code"), { recursive: true });
  mkdirSync(join(dir, "pharn/pharn-review/trust-fence"), { recursive: true });
  // The scanner's two imports travel with it: the runtime floor and the shared CLI front end (review-fanout).
  for (const f of ["count-lenses.mjs", "scan-code-secrets.mjs", "runtime-floor.mjs", "code-scanner-cli.mjs"]) {
    cpSync(join("pharn/floor", f), join(dir, "pharn/floor", f));
  }
  writeFileSync(
    join(dir, "pharn/floor/lens-scanner-map.json"),
    JSON.stringify(mapOverride ?? { scanners: { "secrets-in-code": "scan-code-secrets.mjs", "trust-fence": null } }, null, 2)
  );
  for (const lens of ["secrets-in-code", "trust-fence"]) {
    writeFileSync(join(dir, `pharn/pharn-review/${lens}/${lens}.md`), `---\nrole: lens\n---\n\n# ${lens}\n`);
  }
  // One file the secrets scanner HITS, one it does not.
  writeFileSync(join(dir, "hit.js"), 'const k = "AKIAIOSFODNN7EXAMPLE";\n');
  writeFileSync(join(dir, "miss.js"), "function add(a, b) {\n  return a + b;\n}\n");
  return dir;
}

test("lensNameFromPath derives the map key from the count-lenses path shape", () => {
  assert.equal(lensNameFromPath("pharn/pharn-review/trust-fence/trust-fence.md"), "trust-fence");
});

test("BASIS_ENUM is the closed, frozen set the checker also ranges over (L29)", () => {
  assert.deepEqual([...BASIS_ENUM].sort(), ["scanner-bound", "whole-target-fallback"]);
  assert.ok(Object.isFrozen(BASIS_ENUM));
});

// --- the slice comes from the scanner's real verdict ---------------------------------------------

test("a mapped lens's slice is exactly the files its scanner hits", () => {
  const dir = fakeRepo();
  try {
    const scanners = { "secrets-in-code": "scan-code-secrets.mjs", "trust-fence": null };
    const target = ["hit.js", "miss.js"];
    const a = computeAssignments(dir, target, ["secrets-in-code", "trust-fence"], scanners);
    const secrets = a.find((x) => x.lens === "secrets-in-code");
    assert.deepEqual(secrets.slice, ["hit.js"], "only the file with a real scanner hit");
    assert.equal(secrets.basis, "scanner-bound");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a scanner-less lens gets the WHOLE target, on the weakest basis, and is labeled so", () => {
  const dir = fakeRepo();
  try {
    const a = computeAssignments(dir, ["hit.js", "miss.js"], ["trust-fence"], { "trust-fence": null });
    assert.deepEqual(a[0], {
      lens: "trust-fence",
      basis: "whole-target-fallback",
      scanner: null,
      slice: ["hit.js", "miss.js"],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unassignedScannerBound ignores the whole-target fallback — the L34 discovery", () => {
  // If the fallback counted as coverage this would be [], forever, for every target — a field that
  // certifies nothing. miss.js is reached by NO scanner-bound lens and must survive.
  const assignments = [
    { lens: "secrets-in-code", basis: "scanner-bound", scanner: "s.mjs", slice: ["hit.js"] },
    { lens: "trust-fence", basis: "whole-target-fallback", scanner: null, slice: ["hit.js", "miss.js"] },
  ];
  assert.deepEqual(unassignedScannerBound(["hit.js", "miss.js"], assignments), ["miss.js"]);
});

// --- a failed scanner is RECORDED, not folded into a miss ------------------------------------------

test("a scanner that cannot run is reported in scanner_errors, never as a clean miss", () => {
  const dir = fakeRepo();
  try {
    // Point the map at a scanner file that does not exist, so every invocation fails. Before this was
    // recorded, the lens simply showed an empty slice and its files drifted into
    // unassigned_scanner_bound with nothing distinguishing "looked and found nothing" from "never ran".
    writeFileSync(
      join(dir, "pharn/floor/lens-scanner-map.json"),
      JSON.stringify({ scanners: { "secrets-in-code": "scan-code-does-not-exist.mjs", "trust-fence": null } }, null, 2)
    );
    const out = renderAssignments("t", { repo: dir, target: ["hit.js", "miss.js"] });
    assert.equal(out.ok, true, "one broken scanner must not deny the whole record");
    const secrets = out.record.assignments.find((a) => a.lens === "secrets-in-code");
    assert.deepEqual(secrets.slice, [], "no verdict was obtained, so nothing is claimed as a hit");
    assert.deepEqual(
      out.record.scanner_errors.map((e) => e.file).sort(),
      ["hit.js", "miss.js"],
      "both files must be reported as unverdicted"
    );
    // And the record it produces is still one the checker accepts.
    assert.equal(
      checkRecord(out.record, ["secrets-in-code", "trust-fence"], {
        "secrets-in-code": "scan-code-does-not-exist.mjs",
        "trust-fence": null,
      }).ok,
      true
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a healthy scanner records NO errors — the field is not decorative", () => {
  const dir = fakeRepo();
  try {
    const out = renderAssignments("t", { repo: dir, target: ["hit.js", "miss.js"] });
    assert.deepEqual(out.record.scanner_errors, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- FAIL-CLOSED EDGE 1 (grill G1): no resolvable target -------------------------------------------

test("g1: no resolvable target -> refuses, and NEVER emits an empty-target record", () => {
  const empty = mkdtempSync(join(tmpdir(), "pharn-empty-"));
  try {
    const out = renderAssignments("t", { repo: empty, target: [] });
    assert.equal(out.ok, false);
    assert.match(out.reason, /no resolvable review target/);
    // The refusal must name WHY a record is not the honest degradation.
    assert.match(out.reason, /ASK THE HUMAN/i);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test("g1: the CLI exits non-zero and writes NOTHING on an unresolvable target", () => {
  const empty = mkdtempSync(join(tmpdir(), "pharn-empty-"));
  try {
    let code = 0;
    try {
      execFileSync("node", ["pharn/floor/render-review-assignments.mjs", "t", "--repo", empty], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      code = e.status;
    }
    assert.notEqual(code, 0);
    assert.equal(existsSync(join(empty, "pharn/features")), false, "no directory, and no record, may be created");
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

// --- FAIL-CLOSED EDGE 2 (grill G4): a registered lens absent from the map ---------------------------

test("g4: a registered lens with no lens-scanner-map entry -> throws, never invents a basis", () => {
  const dir = fakeRepo();
  try {
    assert.throws(
      () => computeAssignments(dir, ["hit.js"], ["secrets-in-code", "ghost-lens"], { "secrets-in-code": "scan-code-secrets.mjs" }),
      /ghost-lens/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("g4: an own-property test, so a prototype member cannot masquerade as a map entry (L15)", () => {
  const dir = fakeRepo();
  try {
    // `constructor` is reachable via the prototype chain; a `||`/`??` lookup would find it and emit a
    // garbage `basis` instead of refusing.
    assert.throws(() => computeAssignments(dir, ["hit.js"], ["constructor"], {}), /constructor/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("g4: the CLI exits non-zero and writes NOTHING when the map is incomplete", () => {
  const dir = fakeRepo({ mapOverride: { scanners: { "secrets-in-code": "scan-code-secrets.mjs" } } });
  try {
    let code = 0;
    try {
      execFileSync("node", ["pharn/floor/render-review-assignments.mjs", "t", "--repo", dir, "--target", "hit.js"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      code = e.status;
    }
    assert.notEqual(code, 0, "trust-fence is registered but absent from the map");
    assert.equal(existsSync(join(dir, "pharn/features")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- L41: the --base default must be exercised with the flag ABSENT ---------------------------------

test("l41: invoked with NO --base, the record lands under the production default pharn/features", () => {
  const dir = fakeRepo();
  try {
    execFileSync("node", ["pharn/floor/render-review-assignments.mjs", "feat", "--repo", dir, "--target", "hit.js"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const p = join(dir, "pharn/features/feat/assignments.json");
    assert.ok(existsSync(p), "the no-flag path is the one /pharn-review actually invokes");
    const rec = JSON.parse(readFileSync(p, "utf8"));
    assert.equal(rec.feature, "feat");
    assert.deepEqual(rec.target, ["hit.js"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("l41: the default is defined in exactly ONE place in the source", () => {
  // The 5.0.0 defect was two copies of one default diverging. Counting the literal is crude but it is
  // the property that actually failed: a second occurrence is the thing to catch.
  const src = readFileSync("pharn/floor/render-review-assignments.mjs", "utf8");
  // Comments are STRIPPED before counting. The property that failed in 5.0.0 was two executable
  // defaults diverging; a header comment documenting the default is not a second definition, and a
  // rule that forbade it would push the documentation out of the file to satisfy the test.
  const code = src
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .join("\n");
  const occurrences = code.split('"pharn/features"').length - 1;
  assert.equal(occurrences, 1, "`pharn/features` must appear once in CODE — as DEFAULT_BASE — and be referenced by name");
  assert.match(code, /const DEFAULT_BASE = "pharn\/features";/);
});

// --- determinism + the emitted shape ---------------------------------------------------------------

test("output is deterministic and sorted, and the record round-trips through the checker", () => {
  const dir = fakeRepo();
  try {
    const a = renderAssignments("t", { repo: dir, target: ["hit.js", "miss.js"] });
    const b = renderAssignments("t", { repo: dir, target: ["miss.js", "hit.js"] });
    assert.equal(a.ok && b.ok, true);
    assert.equal(JSON.stringify(a.record), JSON.stringify(b.record), "argument order must not change the bytes");
    assert.deepEqual(a.record.target, ["hit.js", "miss.js"], "target is sorted");
    assert.deepEqual(
      a.record.assignments.map((x) => x.lens),
      ["secrets-in-code", "trust-fence"],
      "assignments are sorted by lens"
    );
    assert.deepEqual(a.record.unassigned_scanner_bound, ["miss.js"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a directory target expands to the files beneath it", () => {
  const dir = fakeRepo();
  try {
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src/one.js"), "const a = 1;\n");
    writeFileSync(join(dir, "src/two.js"), "const b = 2;\n");
    assert.deepEqual(resolveTarget(dir, ["src"]), { target: ["src/one.js", "src/two.js"], skipped: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the emitted record is exactly what check-review-assignments.mjs accepts", () => {
  const dir = fakeRepo();
  try {
    execFileSync(
      "node",
      ["pharn/floor/render-review-assignments.mjs", "feat", "--repo", dir, "--target", "hit.js", "--target", "miss.js"],
      {
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    const rec = join(dir, "pharn/features/feat/assignments.json");
    // The two helpers are pinned against each other rather than each against a hand-written fixture:
    // a shape change that updated only one of them is the failure this catches.
    execFileSync("node", ["pharn/floor/check-review-assignments.mjs", rec, "--repo", dir], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the emitter creates no stray files beside the record", () => {
  const dir = fakeRepo();
  try {
    execFileSync("node", ["pharn/floor/render-review-assignments.mjs", "feat", "--repo", dir, "--target", "hit.js"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.deepEqual(readdirSync(join(dir, "pharn/features/feat")), ["assignments.json"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- ★ A DIFF NAMING MORE THAN 1 MiB OF PATHS (stage-git-maxbuffer, 6.28.3) ----------------------------------------
// Before 6.28.3 gitDiffTarget ran its diff at node's 1 MiB default; past it the call failed ENOBUFS, the catch returned
// [], and the emitter refused with "the git merge-base diff yielded nothing" over a diff that yielded plenty.

/** Empty files three 250-byte directory levels deep — 766-byte paths, ~1,700 of them — whose name listing passes
 *  1.25 MiB while an absolute path stays under darwin's 1,024-byte PATH_MAX. */
function bigTree(root) {
  const dir = ["big", "a".repeat(250), "b".repeat(250), "c".repeat(250)].join("/");
  mkdirSync(join(root, dir), { recursive: true });
  const paths = [];
  let bytes = 0;
  for (let i = 0; bytes <= (1 << 20) + (1 << 18); i++) {
    const p = `${dir}/${String(i).padStart(5, "0")}.txt`;
    writeFileSync(join(root, p), "");
    paths.push(p);
    bytes += Buffer.byteLength(p) + 1;
  }
  return { paths, bytes };
}

test("★ LISTING — resolveTarget returns a merge-base diff naming more than 1 MiB of paths whole; the pre-fix call is ENOBUFS", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-emit-big-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  try {
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(join(dir, "seed.txt"), "seed\n");
    git("add", "-A");
    git("commit", "-q", "-m", "seed");
    const { paths, bytes } = bigTree(dir);
    git("add", "-A"); // staged adds: `git diff <HEAD>` names them; there is no origin, so the base is HEAD
    assert.ok(bytes > 1 << 20, `anchor (L60): the diff names ${bytes} bytes of paths, past node's 1 MiB default`);
    // THE ATTRIBUTION CONTROL (L40): gitDiffTarget's diff before 6.28.3 — its exact options, no ceiling.
    assert.throws(
      () =>
        execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", "HEAD"], {
          cwd: dir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }),
      (e) => e.code === "ENOBUFS",
      "at node's default buffer this diff fails ENOBUFS"
    );
    assert.deepEqual(resolveTarget(dir, []).target, [...paths].sort(), "every path the diff names, never an empty target");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ═══ review-fanout: ONE spawn per scanner, under a time limit; a target that skips what no lens should get ═══
//
// Review finding CTX-3: the emitter spawned `node <scanner> <file>` once per (lens × file). Each test below names the
// property it pins and carries the control that makes it able to fail (L60).

/** Write a fake scanner into a fakeRepo's pharn/floor. `body` runs before the shared CLI front end. */
function fakeScanner(dir, name, body) {
  writeFileSync(
    join(dir, "pharn/floor", name),
    `import { appendFileSync } from "node:fs";\n` +
      `import { runScannerCli } from "./code-scanner-cli.mjs";\n` +
      `appendFileSync(new URL("./spawns.log", import.meta.url), "${name}\\n");\n` +
      `${body}\n`
  );
}
const HIT_ON_MARKER = `const scanText = (t) => (t.includes("HIT") ? [{ line: 1, kind: "marker" }] : []);`;
const RUN_CLI = `process.exitCode = runScannerCli("fake", scanText, process.argv.slice(2));`;

function spawnLog(dir) {
  const p = join(dir, "pharn/floor/spawns.log");
  return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean) : [];
}

function fiveFiles(dir) {
  const files = ["f1.js", "f2.js", "f3.js", "f4.js", "f5.js"];
  files.forEach((f, i) => writeFileSync(join(dir, f), i % 2 === 0 ? "HIT\n" : "clean\n"));
  return files;
}

test("★ ONE spawn per scanner — five files cost one process, and the slice is the batch's own verdicts", () => {
  const dir = fakeRepo();
  try {
    fakeScanner(dir, "scan-code-log.mjs", `${HIT_ON_MARKER}\n${RUN_CLI}`);
    const target = fiveFiles(dir);
    const errors = [];
    const failures = [];
    const a = computeAssignments(dir, target, ["secrets-in-code"], { "secrets-in-code": "scan-code-log.mjs" }, errors, failures);
    assert.deepEqual(spawnLog(dir), ["scan-code-log.mjs"], "exactly one spawn for five files (was one per file)");
    assert.deepEqual(a[0].slice, ["f1.js", "f3.js", "f5.js"]);
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const SLEEP_THEN_RUN = `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);\n${HIT_ON_MARKER}\n${RUN_CLI}`;

test("★ TIMEOUT — a scanner past its limit is a `timeout` failure, every file errored, nothing in the slice", () => {
  const dir = fakeRepo();
  try {
    fakeScanner(dir, "scan-code-sleep.mjs", SLEEP_THEN_RUN);
    const target = fiveFiles(dir);
    const errors = [];
    const failures = [];
    const a = computeAssignments(dir, target, ["secrets-in-code"], { "secrets-in-code": "scan-code-sleep.mjs" }, errors, failures, {
      timeoutMs: 300,
    });
    assert.deepEqual(
      failures.map(({ lens, scanner, reason }) => ({ lens, scanner, reason })),
      [{ lens: "secrets-in-code", scanner: "scan-code-sleep.mjs", reason: "timeout" }]
    );
    assert.deepEqual(
      errors.map((e) => e.file),
      target,
      "a timed-out spawn leaves every file without a verdict — the lens reviews them all (fail toward reviewing)"
    );
    assert.deepEqual(a[0].slice, [], "no verdict, so no hit is claimed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ TIMEOUT control — the SAME sleeping scanner under a wide limit completes with its verdicts", () => {
  const dir = fakeRepo();
  try {
    fakeScanner(dir, "scan-code-sleep.mjs", SLEEP_THEN_RUN);
    const target = fiveFiles(dir);
    const errors = [];
    const failures = [];
    const a = computeAssignments(dir, target, ["secrets-in-code"], { "secrets-in-code": "scan-code-sleep.mjs" }, errors, failures, {
      timeoutMs: 30_000,
    });
    assert.deepEqual(failures, [], "only the limit differs from the timeout case, so the limit is what fired there");
    assert.deepEqual(a[0].slice, ["f1.js", "f3.js", "f5.js"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const BROKEN_SCANNERS = [
  ["exits non-zero", "process.exitCode = 1;"],
  ["prints something that is not JSON", `process.stdout.write("not json\\n");`],
  [
    "names another path in a result",
    `const n = require0().length; process.stdout.write(JSON.stringify({ results: Array.from({ length: n }, () => ({ file: "/elsewhere", found: false, hits: [] })) }) + "\\n");`,
  ],
  ["prints one result too few", `process.stdout.write(JSON.stringify({ results: [] }) + "\\n");`],
];

for (const [label, body] of BROKEN_SCANNERS) {
  test(`★ ERROR — a scanner that ${label} is an \`error\` failure, every file errored`, () => {
    const dir = fakeRepo();
    try {
      // require0(): the paths the emitter sent on stdin, so a mismatched result can have the right count.
      const reader = `import { readFileSync } from "node:fs";\nconst require0 = () => readFileSync(0, "utf8").split(String.fromCharCode(0)).filter(Boolean);`;
      fakeScanner(dir, "scan-code-broken.mjs", `${reader}\n${body}`);
      const target = fiveFiles(dir);
      const errors = [];
      const failures = [];
      const a = computeAssignments(dir, target, ["secrets-in-code"], { "secrets-in-code": "scan-code-broken.mjs" }, errors, failures);
      assert.deepEqual(
        failures.map((f) => f.reason),
        ["error"]
      );
      assert.deepEqual(
        errors.map((e) => e.file),
        target
      );
      assert.deepEqual(a[0].slice, []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("one unreadable entry is ONE errored file, never a failed spawn", () => {
  const dir = fakeRepo();
  try {
    const errors = [];
    const failures = [];
    const a = computeAssignments(
      dir,
      ["hit.js", "vanished.js"],
      ["secrets-in-code"],
      { "secrets-in-code": "scan-code-secrets.mjs" },
      errors,
      failures
    );
    assert.deepEqual(failures, [], "the batch itself worked");
    assert.deepEqual(errors, [{ lens: "secrets-in-code", file: "vanished.js" }]);
    assert.deepEqual(a[0].slice, ["hit.js"], "the readable file kept its real verdict");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a failed spawn reaches the record as scanner_failures, the checker accepts it, and the CLI names it on stderr", () => {
  const dir = fakeRepo({ mapOverride: { scanners: { "secrets-in-code": "scan-code-broken.mjs", "trust-fence": null } } });
  try {
    fakeScanner(dir, "scan-code-broken.mjs", "process.exitCode = 1;");
    const r = spawnSync(
      process.execPath,
      ["pharn/floor/render-review-assignments.mjs", "feat", "--repo", dir, "--target", "hit.js", "--target", "miss.js"],
      {
        encoding: "utf8",
      }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /scanner scan-code-broken\.mjs \(lens secrets-in-code\) — error: exit 1/);
    assert.deepEqual(JSON.parse(r.stdout), { lenses: 2, target: 2, skipped: 0, unassigned_scanner_bound: 2, scanner_failures: 1 });
    const rec = JSON.parse(readFileSync(join(dir, "pharn/features/feat/assignments.json"), "utf8"));
    assert.deepEqual(rec.scanner_failures, [{ lens: "secrets-in-code", scanner: "scan-code-broken.mjs", reason: "error" }]);
    assert.equal(
      checkRecord(rec, ["secrets-in-code", "trust-fence"], { "secrets-in-code": "scan-code-broken.mjs", "trust-fence": null }).ok,
      true
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the closed enums are the ones the checker ranges over", () => {
  assert.deepEqual([...SKIP_REASON_ENUM].sort(), ["binary", "excluded-name", "git-ignored", "not-a-regular-file", "over-size-cap"]);
  assert.deepEqual([...SCANNER_FAILURE_ENUM].sort(), ["error", "timeout"]);
  assert.ok(Object.isFrozen(SKIP_REASON_ENUM) && Object.isFrozen(SCANNER_FAILURE_ENUM));
});

// --- the four defaults this change adds (L41 / L52: the SET of them, each defined once) ------------------------------

test("l41/l52: each new default is defined ONCE in code, and the time limit is base + rate × KiB", () => {
  const code = readFileSync("pharn/floor/render-review-assignments.mjs", "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .join("\n");
  for (const literal of ["512 * 1024", "= 8000;", "30_000", "SCANNER_TIMEOUT_MS_PER_KIB = 5;"]) {
    assert.equal(code.split(literal).length - 1, 1, `${literal} must appear once in code`);
  }
  assert.equal(MAX_TARGET_FILE_BYTES, 524288);
  assert.equal(BINARY_SNIFF_BYTES, 8000);
  assert.equal(scannerTimeoutMs(0), SCANNER_TIMEOUT_BASE_MS);
  assert.equal(scannerTimeoutMs(2048), SCANNER_TIMEOUT_BASE_MS + 2 * SCANNER_TIMEOUT_MS_PER_KIB);
  assert.equal(scannerTimeoutMs(1), SCANNER_TIMEOUT_BASE_MS + SCANNER_TIMEOUT_MS_PER_KIB, "a started KiB counts whole");
});

test("l41: the no-option CLI path — the only one /pharn-review runs — writes both new fields under the defaults", () => {
  const dir = fakeRepo();
  try {
    execFileSync("node", ["pharn/floor/render-review-assignments.mjs", "feat", "--repo", dir, "--target", "hit.js"], { stdio: "pipe" });
    const rec = JSON.parse(readFileSync(join(dir, "pharn/features/feat/assignments.json"), "utf8"));
    assert.deepEqual(rec.skipped, []);
    assert.deepEqual(rec.scanner_failures, [], "the default limit let the real scanner finish");
    assert.deepEqual(rec.assignments.find((a) => a.lens === "secrets-in-code").slice, ["hit.js"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- target resolution: every input kind git and the filesystem can hand it (L67), judged on the path itself (L59) ---

/** A git repo holding one of every kind under src/, plus the expected verdicts. */
function kindsRepo() {
  const dir = mkdtempSync(join(tmpdir(), "pharn-emit-kinds-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(dir, "src/app/[id]"), { recursive: true });
  writeFileSync(join(dir, "src/tracked.js"), "a\n");
  writeFileSync(join(dir, "src/deleted.js"), "gone\n");
  writeFileSync(join(dir, "src/app/[id]/page.js"), "p\n");
  writeFileSync(join(dir, "src/with space.js"), "s\n");
  writeFileSync(join(dir, "src/bin.png"), Buffer.from([1, 0, 2]));
  writeFileSync(join(dir, "src/late-nul.txt"), "t".repeat(BINARY_SNIFF_BYTES) + "\0");
  writeFileSync(join(dir, "src/big.js"), "x".repeat(MAX_TARGET_FILE_BYTES + 1));
  writeFileSync(join(dir, "src/at-cap.js"), "x".repeat(MAX_TARGET_FILE_BYTES));
  writeFileSync(join(dir, ".gitignore"), "dist/\n*.log\n");
  git("add", "-A");
  git("commit", "-q", "-m", "seed");
  unlinkSync(join(dir, "src/deleted.js"));
  writeFileSync(join(dir, "src/untracked.js"), "u\n");
  writeFileSync(join(dir, "src/x.log"), "l\n");
  mkdirSync(join(dir, "src/dist/sub"), { recursive: true });
  writeFileSync(join(dir, "src/dist/sub/out.js"), "o\n");
  mkdirSync(join(dir, "src/node_modules/pkg"), { recursive: true });
  writeFileSync(join(dir, "src/node_modules/pkg/i.js"), "i\n");
  symlinkSync("tracked.js", join(dir, "src/link-file.js"));
  symlinkSync("app", join(dir, "src/link-dir"));
  symlinkSync("nowhere.js", join(dir, "src/dangling.js"));
  return dir;
}

test("★ L67 — a directory in a git work tree: every input kind lands in target or skipped, with its reason", () => {
  const dir = kindsRepo();
  try {
    const { target, skipped } = resolveTarget(dir, ["src"]);
    assert.deepEqual(target, [
      "src/app/[id]/page.js",
      "src/at-cap.js",
      "src/late-nul.txt",
      "src/tracked.js",
      "src/untracked.js",
      "src/with space.js",
    ]);
    assert.deepEqual(skipped, [
      { path: "src/big.js", reason: "over-size-cap" },
      { path: "src/bin.png", reason: "binary" },
      { path: "src/dangling.js", reason: "not-a-regular-file" },
      { path: "src/dist/", reason: "git-ignored" },
      { path: "src/link-dir", reason: "not-a-regular-file" },
      { path: "src/link-file.js", reason: "not-a-regular-file" },
      { path: "src/node_modules/", reason: "excluded-name" },
      { path: "src/x.log", reason: "git-ignored" },
    ]);
    // Every member of the closed reason set is reached by this one fixture (L29: the set, not one member).
    assert.deepEqual([...new Set(skipped.map((s) => s.reason))].sort(), [...SKIP_REASON_ENUM].sort());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ L67 — outside a git work tree the walk applies the same file rules, never follows a link, and knows no ignore file", () => {
  const dir = kindsRepo();
  try {
    rmSync(join(dir, ".git"), { recursive: true, force: true });
    const { target, skipped } = resolveTarget(dir, ["src"]);
    assert.deepEqual(target, [
      "src/app/[id]/page.js",
      "src/at-cap.js",
      "src/dist/sub/out.js",
      "src/late-nul.txt",
      "src/tracked.js",
      "src/untracked.js",
      "src/with space.js",
      "src/x.log",
    ]);
    assert.deepEqual(skipped, [
      { path: "src/big.js", reason: "over-size-cap" },
      { path: "src/bin.png", reason: "binary" },
      { path: "src/dangling.js", reason: "not-a-regular-file" },
      { path: "src/link-dir", reason: "not-a-regular-file" },
      { path: "src/link-file.js", reason: "not-a-regular-file" },
      { path: "src/node_modules/", reason: "excluded-name" },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a directory named with glob characters is a literal path, never a pathspec glob", () => {
  const dir = kindsRepo();
  try {
    // git matches a pathspec literally AND as a glob, so only a sibling the glob ALSO matches can tell the two apart.
    // A glob matches a whole path (no leading-directory match), so the discriminating sibling is a FILE named `d`:
    // `src/app/[id]` as a glob is `src/app/i` or `src/app/d`.
    writeFileSync(join(dir, "src/app/d"), "o\n");
    assert.deepEqual(resolveTarget(dir, ["src/app/[id]"]), { target: ["src/app/[id]/page.js"], skipped: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a path named as a FILE is kept as named, and wins over the same path skipped under a named directory", () => {
  const dir = kindsRepo();
  try {
    assert.deepEqual(resolveTarget(dir, ["src/bin.png"]), { target: ["src/bin.png"], skipped: [] });
    const both = resolveTarget(dir, ["src/bin.png", "src"]);
    assert.ok(both.target.includes("src/bin.png"));
    assert.ok(!both.skipped.some((s) => s.path === "src/bin.png"), "never both in target and skipped (I8)");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the merge-base diff branch applies the same file rules (binary, size, not a regular file)", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-emit-diff-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  try {
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(join(dir, "seed.txt"), "seed\n");
    git("add", "-A");
    git("commit", "-q", "-m", "seed");
    writeFileSync(join(dir, "code.js"), "const a = 1;\n");
    writeFileSync(join(dir, "img.png"), Buffer.from([0, 1, 2]));
    writeFileSync(join(dir, "bundle.js"), "x".repeat(MAX_TARGET_FILE_BYTES + 1));
    symlinkSync("code.js", join(dir, "alias.js"));
    git("add", "-A");
    assert.deepEqual(resolveTarget(dir, []), {
      target: ["code.js"],
      skipped: [
        { path: "alias.js", reason: "not-a-regular-file" },
        { path: "bundle.js", reason: "over-size-cap" },
        { path: "img.png", reason: "binary" },
      ],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a directory whose every file is skipped is REFUSED with the reasons and the override, never an empty record", () => {
  const dir = fakeRepo();
  try {
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets/a.png"), Buffer.from([0, 1]));
    writeFileSync(join(dir, "assets/b.png"), Buffer.from([0, 2]));
    const out = renderAssignments("t", { repo: dir, target: ["assets"] });
    assert.equal(out.ok, false);
    assert.match(out.reason, /every path found was skipped \(2 binary\)/);
    assert.match(out.reason, /Name a file with --target/);
    assert.match(out.reason, /no resolvable review target/, "the original refusal still stands");
    assert.match(out.reason, /ASK THE HUMAN/);
    assert.doesNotMatch(out.reason, /no --target paths/, "a --target WAS given, so the refusal must not say otherwise");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- review findings on the first build pass, each pinned with the case that exposed it --------------------------

test("a directory inside a NESTED repository lists that repository's files, under its own ignore rules", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-emit-nested-"));
  const git = (cwd, ...a) => execFileSync("git", a, { cwd, stdio: "pipe", encoding: "utf8" });
  try {
    git(dir, "init", "-q", ".");
    mkdirSync(join(dir, "inner/src"), { recursive: true });
    git(join(dir, "inner"), "init", "-q", ".");
    writeFileSync(join(dir, "inner/.gitignore"), "*.log\n");
    writeFileSync(join(dir, "inner/src/h.js"), "h\n");
    writeFileSync(join(dir, "inner/src/x.log"), "l\n");
    // Asked from the outer repository's root, git lists nothing for this path, and before the fix both sets were
    // empty: the files vanished from target AND skipped.
    assert.deepEqual(resolveTarget(dir, ["inner/src"]), {
      target: ["inner/src/h.js"],
      skipped: [{ path: "inner/src/x.log", reason: "git-ignored" }],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a directory the user NAMES is reviewed as named, even `node_modules/<pkg>`; exclusion applies only below it", () => {
  const dir = kindsRepo();
  try {
    mkdirSync(join(dir, "src/node_modules/pkg/node_modules/dep"), { recursive: true });
    writeFileSync(join(dir, "src/node_modules/pkg/node_modules/dep/d.js"), "d\n");
    assert.deepEqual(resolveTarget(dir, ["src/node_modules/pkg"]), {
      target: ["src/node_modules/pkg/i.js"],
      skipped: [{ path: "src/node_modules/pkg/node_modules/", reason: "excluded-name" }],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a NAMED symlinked directory is followed as named, the same way inside and outside a git work tree", () => {
  const dir = kindsRepo();
  try {
    const expected = { target: ["src/link-dir/[id]/page.js"], skipped: [] };
    assert.deepEqual(resolveTarget(dir, ["src/link-dir"]), expected, "git route");
    rmSync(join(dir, ".git"), { recursive: true, force: true });
    assert.deepEqual(resolveTarget(dir, ["src/link-dir"]), expected, "walk route");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
