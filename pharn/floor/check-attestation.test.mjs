// pharn/floor/check-attestation.test.mjs — hermetic tests for the deterministic attestation verdict.
//
// NO claude -p, NO git, NO network. Each test writes a ship-record JSON into an os.tmpdir() scratch file
// and asserts the public surface (exit code + stdout) by subprocess — mirroring count-grillers.test.mjs.
//
// The load-bearing invariants (why attestation is FLOOR, not a claim):
//   • absent block            → unattested (exit 0)         — a valid, honest default state;
//   • present + shaped + bound → attested   (exit 0);
//   • record edited afterward  → stale      (exit 3)         — content-hash catches the drift, NOT silent;
//   • any shape violation      → malformed  (exit 2)         — enum/regex gate, incl. extra/missing keys;
//   • --compute is the ONE hasher (fix F1): emitter & verifier hash identical bytes → no spurious stale;
//   • canonicalization is key-order-independent (sorted) and covers nested objects/arrays;
//   • missing / unparseable / non-object input → fail-closed (exit 1), never a silent pass.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const CA = join(here, "check-attestation.mjs");

// Run check-attestation with raw args (verify: [file]; compute: ["--compute", file]).
function runArgs(args) {
  return spawnSync(process.execPath, [CA, ...args], { encoding: "utf8" });
}
// Write `body` (string or object) to a scratch file and run the helper over it; clean up.
function withRecord(body, args = (f) => [f], fn) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-attest-"));
  const f = join(dir, "ship-record.json");
  try {
    writeFileSync(f, typeof body === "string" ? body : JSON.stringify(body));
    return fn(runArgs(args(f)), f);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const json = (r) => JSON.parse(r.stdout);

// The reference canonicalization (independent re-derivation — must agree with the script, fix F1).
function refHash(record) {
  const { attestation, ...rest } = record;
  void attestation;
  const canon = (v) =>
    Array.isArray(v)
      ? "[" + v.map(canon).join(",") + "]"
      : v && typeof v === "object"
        ? "{" +
          Object.keys(v)
            .sort()
            .map((k) => JSON.stringify(k) + ":" + canon(v[k]))
            .join(",") +
          "}"
        : JSON.stringify(v);
  return createHash("sha256").update(canon(rest), "utf8").digest("hex");
}
// A record with a VALID attestation over its own content.
function attested(base, by = "jdoe", at = "2026-07-22T20:00:00Z") {
  return { ...base, attestation: { by, at, record_hash: refHash(base) } };
}

const BASE = { feature: "ship-attestation", stages: ["build", "regress", "verify"], verdicts: { verify: "PASS" } };

// --- verify: unattested ---------------------------------------------------------------------------
test("absent attestation → unattested, exit 0", () => {
  withRecord(BASE, undefined, (r) => {
    assert.equal(r.status, 0);
    assert.equal(json(r).verdict, "unattested");
  });
});

// --- verify: attested -----------------------------------------------------------------------------
test("valid attestation → attested, exit 0, echoes by", () => {
  withRecord(attested(BASE), undefined, (r) => {
    assert.equal(r.status, 0);
    assert.equal(json(r).verdict, "attested");
    assert.equal(json(r).by, "jdoe");
  });
});

test("attested is order-insensitive: record_hash from --compute over a reordered record still validates", () => {
  // record_hash is over sorted keys, so a differently-key-ordered record with identical content matches.
  const reordered = { verdicts: { verify: "PASS" }, stages: ["build", "regress", "verify"], feature: "ship-attestation" };
  const rec = { ...reordered, attestation: { by: "a-b_c.d@e", at: "2026-01-02T03:04:05.678Z", record_hash: refHash(BASE) } };
  withRecord(rec, undefined, (r) => {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(json(r).verdict, "attested");
  });
});

// --- verify: stale --------------------------------------------------------------------------------
test("record edited after attestation → stale, exit 3", () => {
  const rec = attested(BASE);
  rec.verdicts.verify = "TAMPERED"; // mutate the body AFTER the hash was pinned
  withRecord(rec, undefined, (r) => {
    assert.equal(r.status, 3);
    assert.equal(json(r).verdict, "stale");
    assert.match(json(r).expected, /^[0-9a-f]{64}$/);
  });
});

// --- verify: malformed (each shape branch) --------------------------------------------------------
const badBlocks = {
  "empty by": { by: "", at: "2026-07-22T20:00:00Z", record_hash: "a".repeat(64) },
  "by with newline": { by: "j\ndoe", at: "2026-07-22T20:00:00Z", record_hash: "a".repeat(64) },
  "by too long": { by: "x".repeat(65), at: "2026-07-22T20:00:00Z", record_hash: "a".repeat(64) },
  "by with markup": { by: "<b>x</b>", at: "2026-07-22T20:00:00Z", record_hash: "a".repeat(64) },
  "at not ISO": { by: "jdoe", at: "yesterday", record_hash: "a".repeat(64) },
  "hash not 64hex": { by: "jdoe", at: "2026-07-22T20:00:00Z", record_hash: "deadbeef" },
  "hash uppercase": { by: "jdoe", at: "2026-07-22T20:00:00Z", record_hash: "A".repeat(64) },
  "by not a string": { by: 42, at: "2026-07-22T20:00:00Z", record_hash: "a".repeat(64) },
  "extra key": { by: "jdoe", at: "2026-07-22T20:00:00Z", record_hash: "a".repeat(64), note: "x" },
  "missing record_hash": { by: "jdoe", at: "2026-07-22T20:00:00Z" },
};
for (const [name, block] of Object.entries(badBlocks)) {
  test(`malformed attestation (${name}) → malformed, exit 2`, () => {
    withRecord({ ...BASE, attestation: block }, undefined, (r) => {
      assert.equal(r.status, 2, `${name}: ${r.stdout}${r.stderr}`);
      assert.equal(json(r).verdict, "malformed");
    });
  });
}
for (const [name, block] of Object.entries({ "attestation is array": [], "attestation is string": "x", "attestation is null": null })) {
  test(`malformed attestation (${name}) → malformed, exit 2`, () => {
    withRecord({ ...BASE, attestation: block }, undefined, (r) => {
      assert.equal(r.status, 2);
      assert.equal(json(r).verdict, "malformed");
    });
  });
}

// --- 7.3.0 (loop-record-honesty): a placeholder `by`, an impossible `at` --------------------------------------
//
// Review finding: `by: agent`, `at: 2026-13-45T99:99:99Z` read `attested` with a recomputed hash. Each case below is
// BOUND to its record's hash (attested() pins refHash), so the only thing that can refuse it is the shape gate.

const RESERVED_SRC = readFileSync(CA, "utf8").match(/const RESERVED_BY = Object\.freeze\(\[([^\]]*)\]\)/);

test("RESERVED_BY is exactly the 15-name placeholder deny-list (the set the next test iterates)", () => {
  assert.ok(RESERVED_SRC, "the RESERVED_BY literal is present");
  const names = JSON.parse(`[${RESERVED_SRC[1].replace(/,\s*$/, "")}]`);
  assert.deepEqual(names, [
    "agent",
    "ai",
    "anonymous",
    "assistant",
    "bot",
    "claude",
    "human",
    "llm",
    "model",
    "none",
    "null",
    "pharn",
    "system",
    "unknown",
    "user",
  ]);
});

test("every RESERVED_BY member, and an upper-cased and a capitalised spelling of it, is malformed (exit 2) — L52", () => {
  const names = JSON.parse(`[${RESERVED_SRC[1].replace(/,\s*$/, "")}]`);
  for (const n of names) {
    for (const by of [n, n.toUpperCase(), n[0].toUpperCase() + n.slice(1)]) {
      withRecord(attested(BASE, by), undefined, (r) => {
        assert.equal(r.status, 2, `${by}: ${r.stdout}`);
        assert.equal(json(r).verdict, "malformed", by);
      });
    }
  }
});

test("a name that only CONTAINS a reserved word, or a real-looking name, still attests (deny-list, not identity)", () => {
  for (const by of ["agentsmith", "claude.dev@example", "jdoe", "model-t"]) {
    withRecord(attested(BASE, by), undefined, (r) => {
      assert.equal(r.status, 0, `${by}: ${r.stdout}`);
      assert.equal(json(r).verdict, "attested", by);
    });
  }
});

test("an `at` that matches the ISO shape but names no real instant is malformed (exit 2)", () => {
  for (const at of [
    "2026-13-45T99:99:99Z", // the review's probe
    "2026-00-10T10:00:00Z", // month 0
    "2026-02-30T10:00:00Z", // no 30 February
    "2025-02-29T10:00:00Z", // not a leap year
    "1900-02-29T10:00:00Z", // century, not a leap year
    "2026-04-31T10:00:00Z", // April has 30 days
    "2026-01-00T10:00:00Z", // day 0
    "2026-01-10T24:00:00Z", // hour 24
    "2026-01-10T10:60:00Z", // minute 60
    "2026-12-31T23:59:60Z", // a leap second: refused on purpose
    "2026-01-10T10:00:00+24:00", // offset hour 24
    "2026-01-10T10:00:00+05:60", // offset minute 60
  ]) {
    withRecord(attested(BASE, "jdoe", at), undefined, (r) => {
      assert.equal(r.status, 2, `${at}: ${r.stdout}`);
      assert.equal(json(r).verdict, "malformed", at);
    });
  }
});

test("controls: real instants attest — leap days, a 400-year leap day, month ends, an offset, fractional seconds", () => {
  for (const at of [
    "2024-02-29T10:00:00Z",
    "2000-02-29T00:00:00Z",
    "2026-12-31T23:59:59Z",
    "2026-04-30T00:00:00-05:30",
    "2026-01-02T03:04:05.678+23:59",
  ]) {
    withRecord(attested(BASE, "jdoe", at), undefined, (r) => {
      assert.equal(r.status, 0, `${at}: ${r.stdout}`);
      assert.equal(json(r).verdict, "attested", at);
    });
  }
});

// --- --compute ------------------------------------------------------------------------------------
test("--compute prints the canonical 64-hex hash, ignoring any existing attestation", () => {
  withRecord(
    attested(BASE),
    (f) => ["--compute", f],
    (r) => {
      assert.equal(r.status, 0, r.stderr);
      const out = r.stdout.trim();
      assert.match(out, /^[0-9a-f]{64}$/);
      assert.equal(out, refHash(BASE)); // computed over the record MINUS attestation
    }
  );
});

test("--compute is deterministic and key-order-independent (nested objects + arrays)", () => {
  const a = { z: [1, 2, { p: 1, q: 2 }], a: { n: 1, m: 2 } };
  const b = { a: { m: 2, n: 1 }, z: [1, 2, { q: 2, p: 1 }] };
  const ha = withRecord(
    a,
    (f) => ["--compute", f],
    (r) => r.stdout.trim()
  );
  const hb = withRecord(
    b,
    (f) => ["--compute", f],
    (r) => r.stdout.trim()
  );
  assert.equal(ha, hb);
  assert.match(ha, /^[0-9a-f]{64}$/);
});

test("round-trip: a record attested with a --compute hash verifies as attested", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-attest-rt-"));
  const f = join(dir, "ship-record.json");
  try {
    writeFileSync(f, JSON.stringify(BASE));
    const hash = spawnSync(process.execPath, [CA, "--compute", f], { encoding: "utf8" }).stdout.trim();
    writeFileSync(f, JSON.stringify({ ...BASE, attestation: { by: "reviewer", at: "2026-07-22T21:00:00Z", record_hash: hash } }));
    const v = spawnSync(process.execPath, [CA, f], { encoding: "utf8" });
    assert.equal(v.status, 0, v.stderr);
    assert.equal(JSON.parse(v.stdout).verdict, "attested");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- fail-closed errors (exit 1) ------------------------------------------------------------------
test("missing path arg → exit 1", () => {
  const r = runArgs([]);
  assert.equal(r.status, 1);
});
test("missing file → exit 1", () => {
  const r = runArgs([join(tmpdir(), "does-not-exist-" + Date.now() + ".json")]);
  assert.equal(r.status, 1);
});
test("unparseable JSON → exit 1", () => {
  withRecord("{ not json", undefined, (r) => assert.equal(r.status, 1));
});
test("JSON that is not an object (array) → exit 1", () => {
  withRecord("[1,2,3]", undefined, (r) => assert.equal(r.status, 1));
});
test("JSON that is not an object (number) → exit 1", () => {
  withRecord("42", undefined, (r) => assert.equal(r.status, 1));
});
test("--compute on a missing file → exit 1", () => {
  const r = runArgs(["--compute", join(tmpdir(), "nope-" + Date.now() + ".json")]);
  assert.equal(r.status, 1);
});
