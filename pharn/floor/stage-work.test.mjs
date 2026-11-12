// pharn/floor/stage-work.test.mjs — the deterministic-work record (`pharn-stage-work/2`, `/1` still read): derivation
// from gate-run stamp shapes, the per-gate durations, the invariants, hostile lines, and the best-effort append's
// refusals. Expectations are independent literals (L43).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  countRuns,
  regressWork,
  verifyWork,
  validateWork,
  appendWork,
  appendJsonLine,
  readWork,
  recordWork,
  WORK_SCHEMA,
  WORK_FILE,
  WORK_STAGES,
} from "./stage-work.mjs";
import { DEFAULT_BASE } from "./mark-phase.mjs";
import { ITERATED_STAGES } from "./stage-agent-core.mjs";

const TS = "2026-09-28T10:00:00.000Z";
const S = "00000000-0000-4000-8000-00000000aaaa";
const ran = (id) => ({ id, ran: true, exit: 0 });
const noFiles = (id) => ({ id, ran: false, reason: "no-files", exit: 0 });
const reusedRun = (id) => ({
  id,
  ran: false,
  reason: "reused",
  exit: 0,
  reused: { stage: "regress", side: "head", seq: 0, stamp_sha256: "a".repeat(64) },
});
const stamp = (runs) => ({ schema: "pharn-gate-run/1", runs });

test("countRuns: executed / reused / no-files / required from runs[] — and refuses what it cannot classify", () => {
  assert.deepEqual(countRuns(stamp([ran("a"), noFiles("test"), reusedRun("b"), reusedRun("c"), ran("reconcile")])), {
    required: 5,
    executed: 2,
    reused: 2,
    no_files: 1,
  });
  assert.deepEqual(countRuns(stamp([])), { required: 0, executed: 0, reused: 0, no_files: 0 });
  assert.equal(countRuns(stamp([{ id: "x", ran: false, reason: "mystery" }])), null);
  assert.equal(countRuns(null), null);
  assert.equal(countRuns({ runs: "no" }), null);
  assert.equal(countRuns(stamp([null])), null);
});

test("regress, FRESH BASE: the base stamp's own counts, the miss code, and the install with its measured ms", () => {
  const rec = regressWork({
    headStamp: stamp([ran("lint"), noFiles("test"), ran("build")]),
    baseStamp: stamp([ran("lint"), noFiles("test"), ran("build")]),
    baseReuse: { reused: false, miss: "no-record" },
    installResult: { ran: true, exit: 0, timedOut: false, ms: 41234 },
    ts: TS,
    sessionId: S,
  });
  assert.deepEqual(rec, {
    schema: WORK_SCHEMA,
    stage: "pharn-regress",
    ts: TS,
    session_id: S,
    head: {
      required: 3,
      executed: 2,
      reused: 0,
      no_files: 1,
      durations: [
        { seq: 0, id: "lint", duration_ms: null },
        { seq: 2, id: "build", duration_ms: null },
      ],
    },
    base: {
      evidence: "fresh",
      miss: "no-record",
      required: 3,
      executed: 2,
      reused: 0,
      no_files: 1,
      durations: [
        { seq: 0, id: "lint", duration_ms: null },
        { seq: 2, id: "build", duration_ms: null },
      ],
    },
    install: { exit: 0, timed_out: false, ms: 41234 },
  });
});

test("regress, REUSED BASE: 0 base processes, every result from earlier evidence, no install — even if the old stamp says ran", () => {
  const rec = regressWork({
    headStamp: stamp([ran("lint"), ran("build")]),
    baseStamp: stamp([ran("lint"), ran("build")]), // the EARLIER execution's stamp: its ran:true did not run here
    baseReuse: { reused: true, miss: null },
    installResult: null,
    ts: TS,
  });
  assert.deepEqual(rec.base, { evidence: "reused", miss: null, required: 2, executed: 0, reused: 2, no_files: 0, durations: [] });
  assert.equal(rec.install, null);
  assert.equal(rec.session_id, null);
});

test("regress: an install with no measured interval (a record persisted before 6.35.0) is ms null, never 0", () => {
  const rec = regressWork({
    headStamp: stamp([ran("a")]),
    baseStamp: stamp([ran("a")]),
    baseReuse: { reused: false, miss: "no-delivery-run" },
    installResult: { ran: true, exit: 1, timedOut: true },
    ts: TS,
  });
  assert.deepEqual(rec.install, { exit: 1, timed_out: true, ms: null });
});

test("verify: fresh gates vs partially reused gates", () => {
  const fresh = verifyWork({ stamp: stamp([ran("test"), ran("lint"), ran("build"), ran("reconcile")]), ts: TS, sessionId: S });
  assert.deepEqual(fresh.gates, {
    required: 4,
    executed: 4,
    reused: 0,
    no_files: 0,
    durations: ["test", "lint", "build", "reconcile"].map((id, seq) => ({ seq, id, duration_ms: null })),
  });
  const partial = verifyWork({ stamp: stamp([ran("test"), reusedRun("lint"), reusedRun("build"), ran("reconcile")]), ts: TS });
  assert.deepEqual(partial.gates, {
    required: 4,
    executed: 2,
    reused: 2,
    no_files: 0,
    durations: [
      { seq: 0, id: "test", duration_ms: null },
      { seq: 3, id: "reconcile", duration_ms: null },
    ],
  });
  assert.equal(verifyWork({ stamp: null, ts: TS }), null, "an uncountable stamp yields no record, never a zero record");
});

test("the derivations are TOTAL: no input makes them throw (a stage evaluates them before its done exit)", () => {
  for (const bad of [undefined, null, 5, "x", {}, { baseReuse: null }, { headStamp: { runs: [{ ran: true }] }, baseStamp: { runs: [] } }]) {
    assert.equal(regressWork(bad), null);
    assert.equal(verifyWork(bad), null);
  }
});

test("a malformed session id in the environment becomes null — the record is kept, the value is not", () => {
  const rec = verifyWork({ stamp: stamp([ran("a")]), ts: TS, sessionId: "/Users/x/evil\n" });
  assert.equal(rec.session_id, null);
});

test("validateWork: closed keys, enums and the count invariant — each broken one is refused", () => {
  const good = regressWork({
    headStamp: stamp([ran("a")]),
    baseStamp: stamp([ran("a")]),
    baseReuse: { reused: false, miss: null },
    installResult: null,
    ts: TS,
  });
  assert.deepEqual(validateWork(good), { ok: true });
  const mut = (f) => {
    const c = structuredClone(good);
    f(c);
    return validateWork(c).ok;
  };
  assert.equal(
    mut((c) => (c.extra = 1)),
    false,
    "extra key"
  );
  assert.equal(
    mut((c) => delete c.install),
    false,
    "missing key"
  );
  assert.equal(
    mut((c) => (c.head.executed = 5)),
    false,
    "executed + reused + no_files !== required"
  );
  assert.equal(
    mut((c) => (c.base.evidence = "maybe")),
    false,
    "evidence enum"
  );
  assert.equal(
    mut((c) => (c.base.miss = "because")),
    false,
    "miss enum"
  );
  assert.equal(
    mut((c) => (c.base.reused = 1)),
    false,
    "a fresh BASE reuses nothing"
  );
  assert.equal(
    mut((c) => {
      c.base = {
        evidence: "reused",
        miss: null,
        required: 1,
        executed: 1,
        reused: 0,
        no_files: 0,
        durations: [{ seq: 0, id: null, duration_ms: 1 }],
      };
    }),
    false,
    "a reused BASE executes nothing"
  );
  assert.equal(
    mut((c) => {
      c.base = { evidence: "reused", miss: null, required: 1, executed: 0, reused: 1, no_files: 0, durations: [] };
      c.install = { exit: 0, timed_out: false, ms: 1 };
    }),
    false,
    "a reused BASE ran no install"
  );
  assert.equal(
    mut((c) => (c.ts = "2026-09-28")),
    false,
    "ts"
  );
  assert.equal(
    mut((c) => (c.head.required = 1e9)),
    false,
    "an implausible gate count"
  );
  assert.equal(
    mut((c) => (c.stage = "pharn-build")),
    false,
    "stage enum"
  );
});

test("hostile lines are dropped by index, never crash, and never copy their value (L62)", () => {
  const dir = mkdtempSync(join(tmpdir(), "stage-work-"));
  try {
    const good = verifyWork({ stamp: stamp([ran("a")]), ts: TS });
    const lines = [
      JSON.stringify(good),
      '{"toString":1}',
      '{"__proto__":{"polluted":1},"schema":"pharn-stage-work/1"}',
      JSON.stringify({ ...good, gates: { required: "1", executed: 1, reused: 0, no_files: 0 } }),
      JSON.stringify({ ...good, gates: { required: 2 ** 60, executed: 2 ** 60, reused: 0, no_files: 0 } }),
      "[1,2,3]",
      "null",
      JSON.stringify(good).slice(0, 20), // a torn final line
    ];
    const f = join(dir, WORK_FILE);
    writeFileSync(f, lines.join("\n"));
    const { records, dropped } = readWork(f);
    assert.deepEqual(records, [good]);
    assert.deepEqual(
      dropped,
      [1, 2, 3, 4, 5, 6, 7].map((n) => `work.jsonl[${n}]`)
    );
    assert.equal({}.polluted, undefined);
    assert.deepEqual(readWork(join(dir, "absent.jsonl")), { records: [], dropped: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendWork: writes one line under <root>/<pharn/.run/cost>/<feature>/, beside the markers (the one DEFAULT_BASE)", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-work-"));
  try {
    const rec = verifyWork({ stamp: stamp([ran("a")]), ts: TS });
    assert.deepEqual(appendWork({ feature: "feat", record: rec, root }), { ok: true });
    assert.deepEqual(appendWork({ feature: "feat", record: rec, root }), { ok: true });
    const f = join(root, DEFAULT_BASE, "feat", WORK_FILE);
    assert.deepEqual(readWork(f).records, [rec, rec]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("appendWork REFUSES — writes nothing, never throws — on a symlinked component, a link at the file, a bad slug (L54/L59)", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-work-"));
  const elsewhere = mkdtempSync(join(tmpdir(), "stage-work-target-"));
  try {
    const rec = verifyWork({ stamp: stamp([ran("a")]), ts: TS });
    // 1. `pharn/.run` itself is a link.
    mkdirSync(join(root, "pharn"), { recursive: true });
    symlinkSync(elsewhere, join(root, "pharn", ".run"));
    const a = appendWork({ feature: "feat", record: rec, root });
    assert.equal(a.ok, false);
    assert.equal(existsSync(join(elsewhere, "cost")), false, "nothing was written through the link");
    rmSync(join(root, "pharn", ".run"));
    // 2. A DANGLING link at the file.
    mkdirSync(join(root, "pharn", ".run", "cost", "feat"), { recursive: true });
    symlinkSync(join(elsewhere, "target.jsonl"), join(root, "pharn", ".run", "cost", "feat", WORK_FILE));
    const b = appendWork({ feature: "feat", record: rec, root });
    assert.equal(b.ok, false);
    assert.equal(existsSync(join(elsewhere, "target.jsonl")), false, "O_NOFOLLOW: the dangling link was not followed");
    // 3. A file where a directory must be.
    rmSync(join(root, "pharn", ".run"), { recursive: true });
    mkdirSync(join(root, "pharn", ".run"), { recursive: true });
    writeFileSync(join(root, "pharn", ".run", "cost"), "x");
    assert.equal(appendWork({ feature: "feat", record: rec, root }).ok, false);
    // 4. Bad slug / invalid record.
    assert.equal(appendWork({ feature: "../x", record: rec, root }).ok, false);
    assert.equal(appendWork({ feature: "feat", record: { schema: WORK_SCHEMA }, root }).ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test("CONCURRENT FIRST APPENDS — a directory another appender makes between the lstat and the mkdir is USED, never a dropped line", () => {
  // The CI flake on #328 (entry-observations' CONCURRENT WRITERS: 199 of 200), made deterministic through the test seam:
  // the component is created in exactly the window two real appenders race in. Every component of the chain is raced.
  const root = mkdtempSync(join(tmpdir(), "stage-work-race-"));
  try {
    const raced = [];
    const r = appendJsonLine({
      feature: "feat",
      fileName: WORK_FILE,
      value: { n: 1 },
      root,
      onMissing: (dir) => {
        mkdirSync(dir); // the other appender wins the mkdir
        raced.push(dir);
      },
    });
    assert.deepEqual(r, { ok: true }, JSON.stringify(r));
    assert.deepEqual(raced, [
      join(root, "pharn"), // 7.0.0: the state root's parent is a component of the chain too
      join(root, "pharn", ".run"),
      join(root, "pharn", ".run", "cost"),
      join(root, "pharn", ".run", "cost", "feat"),
    ]);
    assert.equal(readFileSync(join(root, DEFAULT_BASE, "feat", WORK_FILE), "utf8"), '{"n":1}\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CONCURRENT FIRST APPENDS — a SYMLINK or a FILE planted in that window is still refused (re-lstat, never followed)", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-work-race-"));
  const elsewhere = mkdtempSync(join(tmpdir(), "stage-work-target-"));
  try {
    for (const [what, plant] of [
      ["symlink", (dir) => symlinkSync(elsewhere, dir)],
      ["file", (dir) => writeFileSync(dir, "x")],
    ]) {
      rmSync(join(root, "pharn", ".run"), { recursive: true, force: true });
      const r = appendJsonLine({ feature: "feat", fileName: WORK_FILE, value: { n: 1 }, root, onMissing: plant });
      assert.equal(r.ok, false, `${what}: a component planted in the race window was accepted`);
      assert.match(r.why, /symlink or not a directory/, what);
      assert.deepEqual(readdirSync(elsewhere), [], `${what}: something was written through the planted component`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test("recordWork: a null record or a failed append is ONE note, and returns — the caller's exit never depends on it", () => {
  const notes = [];
  assert.equal(recordWork("feat", null, (m) => notes.push(m)).ok, false);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /no deterministic-work record was written/);
});

test("the two stage labels are the orchestrators' own iterated stage labels (parity with stage-agent-core, not an import)", () => {
  for (const s of WORK_STAGES) assert.ok(ITERATED_STAGES.includes(s), s);
  assert.deepEqual([...WORK_STAGES], ["pharn-regress", "pharn-verify"]);
  assert.equal(
    readFileSync(new URL("./stage-work.mjs", import.meta.url), "utf8").includes('"pharn/.run/cost"'),
    false,
    "L41: no second literal"
  );
});

test("GATE-2 — a FIFO planted at work.jsonl never blocks: the append refuses and the read lists it, both promptly", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-work-fifo-"));
  try {
    const dir = join(root, "pharn", ".run", "cost", "feat");
    mkdirSync(dir, { recursive: true });
    execFileSync("mkfifo", [join(dir, WORK_FILE)]);
    const rec = verifyWork({ stamp: stamp([ran("a")]), ts: TS });
    // Run in a child with a timeout: a blocking open would hang THIS process, which is the defect under test.
    const probe = `import { appendWork, readWork } from ${JSON.stringify(new URL("./stage-work.mjs", import.meta.url).href)};
      const a = appendWork({ feature: "feat", record: ${JSON.stringify(rec)}, root: ${JSON.stringify(root)} });
      const r = readWork(${JSON.stringify(join(dir, WORK_FILE))});
      process.stdout.write(JSON.stringify({ a, r }));`;
    const out = spawnSync(process.execPath, ["--input-type=module", "-e", probe], { encoding: "utf8", timeout: 10000 });
    assert.equal(out.signal, null, "the probe was killed by the timeout: the FIFO blocked");
    const { a, r } = JSON.parse(out.stdout);
    assert.equal(a.ok, false);
    assert.deepEqual(r, { records: [], dropped: ["work.jsonl"] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readWork: a symlink at the file is not followed — listed, nothing read through it", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-work-link-"));
  try {
    const good = verifyWork({ stamp: stamp([ran("a")]), ts: TS });
    writeFileSync(join(root, "real.jsonl"), JSON.stringify(good) + "\n");
    symlinkSync(join(root, "real.jsonl"), join(root, WORK_FILE));
    assert.deepEqual(readWork(join(root, WORK_FILE)), { records: [], dropped: ["work.jsonl"] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── 6.49.0 (entry-run-as-base-evidence): a BASE taken from this run's entry gates ─────────────────────────────────────
import { validateWork as validateWorkEntry, BASE_EVIDENCE as BASE_EVIDENCE_ENTRY } from "./stage-work.mjs";

test("regress, ENTRY-derived BASE (6.49.0): evidence entry, the retained miss, 0 base processes, no install — and its refusals", () => {
  assert.deepEqual([...BASE_EVIDENCE_ENTRY], ["fresh", "reused", "entry"]);
  const fromEntry = (id) => ({ ...reusedRun(id), reused: { stage: "entry", side: null, seq: 3, stamp_sha256: "b".repeat(64) } });
  const rec = regressWork({
    headStamp: stamp([ran("test"), ran("typecheck"), ran("build")]),
    baseStamp: stamp([noFiles("test"), fromEntry("typecheck"), fromEntry("build")]),
    baseReuse: { reused: false, miss: "no-record" },
    entryUsed: true,
    installResult: null,
    ts: TS,
  });
  assert.deepEqual(rec.base, { evidence: "entry", miss: "no-record", required: 3, executed: 0, reused: 2, no_files: 1, durations: [] });
  assert.equal(rec.install, null, "no BASE install ran, and no duration is synthesized");
  assert.deepEqual(validateWorkEntry(rec), { ok: true });
  const bad = [
    { ...rec, base: { ...rec.base, executed: 1, reused: 1 } },
    { ...rec, base: { ...rec.base, miss: null } },
    { ...rec, base: { ...rec.base, miss: "shape-mismatch" } }, // an ENTRY miss is not the retained miss
    { ...rec, install: { exit: 0, timed_out: false, ms: 5 } },
    { ...rec, base: { ...rec.base, evidence: "entry-ish" } },
  ];
  for (const b of bad) assert.equal(validateWorkEntry(b).ok, false, JSON.stringify(b.base));
  // control: without entryUsed the same stamps read as a fresh BASE, which reuses nothing — refused, never mislabelled
  assert.equal(
    regressWork({
      headStamp: stamp([ran("a")]),
      baseStamp: stamp([fromEntry("a")]),
      baseReuse: { reused: false, miss: "no-record" },
      installResult: null,
      ts: TS,
    }),
    null
  );
});

// ── gate-durations: per-gate durations (`pharn-stage-work/2`), `/1` still read ─────────────────────────────────────────
import { gateDurations, ledgerGateId, WORK_SCHEMA_V1, WORK_SCHEMAS } from "./stage-work.mjs";

const timed = (id, ms) => ({ ...ran(id), duration_ms: ms });

test("gate-durations — the schema the emitter writes is /2, and exactly /1 and /2 are read", () => {
  assert.equal(WORK_SCHEMA, "pharn-stage-work/2");
  assert.equal(WORK_SCHEMA_V1, "pharn-stage-work/1");
  assert.deepEqual([...WORK_SCHEMAS], ["pharn-stage-work/1", "pharn-stage-work/2"]);
});

test("gate-durations — gateDurations: one entry per ran:true run, in run order, the stamp's milliseconds or null", () => {
  const s = stamp([timed("lint", 1200), noFiles("test"), reusedRun("build"), timed("reconcile", 0), ran("typecheck")]);
  assert.deepEqual(gateDurations(s), [
    { seq: 0, id: "lint", duration_ms: 1200 },
    { seq: 3, id: "reconcile", duration_ms: 0 },
    { seq: 4, id: "typecheck", duration_ms: null },
  ]);
  for (const ms of [-1, 1.5, "5", null, { toString: 1 }]) {
    assert.deepEqual(gateDurations(stamp([timed("lint", ms)])), [{ seq: 0, id: "lint", duration_ms: null }], typeof ms);
  }
});

test("gate-durations — ledgerGateId is a MEMBERSHIP test: a --gates command line (its default id) never reaches the ledger", () => {
  for (const id of ["test", "lint", "format:check", "e2e", "reconcile", "base:test", "instruction-growth"])
    assert.equal(ledgerGateId(id), id);
  assert.equal(ledgerGateId("structural:pharn/x/evals/expected/a.json"), "structural:pharn/x/evals/expected/a.json");
  const refused = [
    "curl -H 'Authorization: Bearer s3cret' https://example.test", // a command line a --gates token defaults to
    "my-gate",
    "structural:",
    "structural:/Users/someone/a.json", // an absolute path
    `structural:${"a".repeat(200)}`, // longer than an identity token
    "structural:a\nb",
    null,
    5,
    { toString: 1 },
  ];
  refused.forEach((id, i) => assert.equal(ledgerGateId(id), null, `refused[${i}]`));
  const rec = verifyWork({ stamp: stamp([timed("npm run my-script", 7), timed("test", 9)]), ts: TS });
  assert.deepEqual(rec.gates.durations, [
    { seq: 0, id: null, duration_ms: 7 },
    { seq: 1, id: "test", duration_ms: 9 },
  ]);
});

test("gate-durations — a REUSED or ENTRY BASE lists no durations even when its stamp's runs carry them (they ran elsewhere)", () => {
  const head = stamp([timed("lint", 10), timed("build", 20)]);
  const base = stamp([timed("lint", 30), timed("build", 40)]);
  const reused = regressWork({ headStamp: head, baseStamp: base, baseReuse: { reused: true, miss: null }, installResult: null, ts: TS });
  assert.deepEqual(reused.base.durations, []);
  assert.deepEqual(reused.head.durations, [
    { seq: 0, id: "lint", duration_ms: 10 },
    { seq: 1, id: "build", duration_ms: 20 },
  ]);
  const fresh = regressWork({ headStamp: head, baseStamp: base, baseReuse: { reused: false, miss: null }, installResult: null, ts: TS });
  assert.deepEqual(fresh.base.durations, [
    { seq: 0, id: "lint", duration_ms: 30 },
    { seq: 1, id: "build", duration_ms: 40 },
  ]);
  assert.deepEqual(validateWork(fresh), { ok: true });
});

test("gate-durations — validateWork admits a /1 line exactly as before (work.jsonl is never pruned)", () => {
  const v1Verify = {
    schema: WORK_SCHEMA_V1,
    stage: "pharn-verify",
    ts: TS,
    session_id: null,
    gates: { required: 2, executed: 2, reused: 0, no_files: 0 },
  };
  const v1Regress = {
    schema: WORK_SCHEMA_V1,
    stage: "pharn-regress",
    ts: TS,
    session_id: S,
    head: { required: 1, executed: 1, reused: 0, no_files: 0 },
    base: { evidence: "fresh", miss: null, required: 1, executed: 1, reused: 0, no_files: 0 },
    install: null,
  };
  assert.deepEqual(validateWork(v1Verify), { ok: true });
  assert.deepEqual(validateWork(v1Regress), { ok: true });
  // a /1 line carrying the /2 key is neither shape — on any side (every side's key set is closed)
  assert.equal(validateWork({ ...v1Regress, base: { ...v1Regress.base, durations: [] } }).ok, false);
  assert.equal(validateWork({ ...v1Regress, head: { ...v1Regress.head, durations: [] } }).ok, false);
  assert.equal(validateWork({ ...v1Verify, gates: { ...v1Verify.gates, durations: [] } }).ok, false);
  // a /2 line without it is refused on every side
  assert.equal(validateWork({ ...v1Verify, schema: WORK_SCHEMA }).ok, false);
  assert.equal(validateWork({ ...v1Regress, schema: WORK_SCHEMA }).ok, false);
  assert.equal(validateWork({ ...v1Verify, schema: "pharn-stage-work/3" }).ok, false);
});

test("gate-durations — validateWork refuses every malformed durations list, quoting no value (L62)", () => {
  const good = verifyWork({ stamp: stamp([timed("test", 5), timed("lint", 6)]), ts: TS });
  assert.deepEqual(validateWork(good), { ok: true });
  const [d0, d1] = good.gates.durations;
  const withDurations = (d) => ({ ...good, gates: { ...good.gates, durations: d } });
  const cases = {
    "not an array": { toString: 1 },
    "too short": [d0],
    "too long": [d0, d1, { seq: 1, id: "lint", duration_ms: 6 }],
    "extra key": [{ ...d0, x: 1 }, d1],
    "missing key": [{ seq: 0, id: "test" }, d1],
    "seq out of order": [d1, d0],
    "seq repeated": [d0, { ...d1, seq: 0 }],
    "seq beyond required": [d0, { ...d1, seq: 2 }],
    "seq not a count": [{ ...d0, seq: "0" }, d1],
    "id a ledger may not carry": [{ ...d0, id: "npm run x" }, d1],
    "id hostile": [{ ...d0, id: { toString: 1 } }, d1],
    "negative ms": [{ ...d0, duration_ms: -1 }, d1],
    "fractional ms": [{ ...d0, duration_ms: 1.5 }, d1],
    "hostile ms": [{ ...d0, duration_ms: { toString: 1 } }, d1],
    "entry not an object": [null, d1],
  };
  for (const [why, d] of Object.entries(cases)) {
    const r = validateWork(withDurations(d));
    assert.equal(r.ok, false, why);
    assert.doesNotMatch(r.reason, /npm run x|toString/, `${why}: the refusal quotes no value`);
  }
  // control: a null id and a null duration are the honest unknowns, admitted
  assert.deepEqual(validateWork(withDurations([d0, d1].map((e) => ({ ...e, id: null, duration_ms: null })))), { ok: true });
  // the /2 key sets are closed on every side
  const reg = regressWork({
    headStamp: stamp([timed("lint", 1)]),
    baseStamp: stamp([timed("lint", 1)]),
    baseReuse: { reused: false, miss: null },
    installResult: null,
    ts: TS,
  });
  assert.deepEqual(validateWork(reg), { ok: true });
  assert.equal(validateWork({ ...reg, head: { ...reg.head, x: 1 } }).ok, false);
  assert.equal(validateWork({ ...reg, head: "x" }).ok, false);
  assert.equal(validateWork({ ...reg, base: { ...reg.base, durations: [] } }).ok, false, "a fresh BASE lists one entry per executed run");
});
