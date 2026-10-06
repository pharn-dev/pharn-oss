// pharn/floor/stage-work.test.mjs — the deterministic-work record (`pharn-stage-work/1`): derivation from gate-run
// stamp shapes, the invariants, hostile lines, and the best-effort append's refusals. Expectations are independent
// literals (L43).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  countRuns,
  regressWork,
  verifyWork,
  validateWork,
  appendWork,
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
    head: { required: 3, executed: 2, reused: 0, no_files: 1 },
    base: { evidence: "fresh", miss: "no-record", required: 3, executed: 2, reused: 0, no_files: 1 },
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
  assert.deepEqual(rec.base, { evidence: "reused", miss: null, required: 2, executed: 0, reused: 2, no_files: 0 });
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
  assert.deepEqual(fresh.gates, { required: 4, executed: 4, reused: 0, no_files: 0 });
  const partial = verifyWork({ stamp: stamp([ran("test"), reusedRun("lint"), reusedRun("build"), ran("reconcile")]), ts: TS });
  assert.deepEqual(partial.gates, { required: 4, executed: 2, reused: 2, no_files: 0 });
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
      c.base = { evidence: "reused", miss: null, required: 1, executed: 1, reused: 0, no_files: 0 };
    }),
    false,
    "a reused BASE executes nothing"
  );
  assert.equal(
    mut((c) => {
      c.base = { evidence: "reused", miss: null, required: 1, executed: 0, reused: 1, no_files: 0 };
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

test("appendWork: writes one line under <root>/<.pharn/cost>/<feature>/, beside the markers (the one DEFAULT_BASE)", () => {
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
    // 1. `.pharn` itself is a link.
    symlinkSync(elsewhere, join(root, ".pharn"));
    const a = appendWork({ feature: "feat", record: rec, root });
    assert.equal(a.ok, false);
    assert.equal(existsSync(join(elsewhere, "cost")), false, "nothing was written through the link");
    rmSync(join(root, ".pharn"));
    // 2. A DANGLING link at the file.
    mkdirSync(join(root, ".pharn", "cost", "feat"), { recursive: true });
    symlinkSync(join(elsewhere, "target.jsonl"), join(root, ".pharn", "cost", "feat", WORK_FILE));
    const b = appendWork({ feature: "feat", record: rec, root });
    assert.equal(b.ok, false);
    assert.equal(existsSync(join(elsewhere, "target.jsonl")), false, "O_NOFOLLOW: the dangling link was not followed");
    // 3. A file where a directory must be.
    rmSync(join(root, ".pharn"), { recursive: true });
    mkdirSync(join(root, ".pharn"));
    writeFileSync(join(root, ".pharn", "cost"), "x");
    assert.equal(appendWork({ feature: "feat", record: rec, root }).ok, false);
    // 4. Bad slug / invalid record.
    assert.equal(appendWork({ feature: "../x", record: rec, root }).ok, false);
    assert.equal(appendWork({ feature: "feat", record: { schema: WORK_SCHEMA }, root }).ok, false);
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
    readFileSync(new URL("./stage-work.mjs", import.meta.url), "utf8").includes('".pharn/cost"'),
    false,
    "L41: no second literal"
  );
});

test("GATE-2 — a FIFO planted at work.jsonl never blocks: the append refuses and the read lists it, both promptly", () => {
  const root = mkdtempSync(join(tmpdir(), "stage-work-fifo-"));
  try {
    const dir = join(root, ".pharn", "cost", "feat");
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
  assert.deepEqual(rec.base, { evidence: "entry", miss: "no-record", required: 3, executed: 0, reused: 2, no_files: 1 });
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
