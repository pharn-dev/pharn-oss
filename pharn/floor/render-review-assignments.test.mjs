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

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, cpSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BASIS_ENUM,
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
  for (const f of ["count-lenses.mjs", "scan-code-secrets.mjs"]) {
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
    assert.deepEqual(resolveTarget(dir, ["src"]), ["src/one.js", "src/two.js"]);
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
