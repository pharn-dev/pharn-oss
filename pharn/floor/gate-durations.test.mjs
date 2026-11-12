// pharn/floor/gate-durations.test.mjs — a gate run's `duration_ms` (run-gates.mjs, GATE DURATION) is an OBSERVATION:
// it stays out of the execution identity and the BASE requirement, and no verdict, reuse decision or route reads it.
//
// HOW (structural, not a grep alone): every decision that reads a gate-run stamp is fed three variants of the same
// stamp — the field ABSENT, every spawned run at 0 ms, every spawned run at 9,999,999 ms — and must answer identically:
// the `check-verify.mjs --stamp` and `check-regress.mjs verdict` CLIs (exit and stdout, with the stamp's own sha256
// normalized, since the bytes do differ), `findReusable` + `reusedRunRecord`, `decideBaseReuse`, `decideEntryBase` +
// `derivedBaseStamp`, `entryVerdict`, `evidenceRequirement`/`requirementSha256` and `executionIdentity` over a REAL
// stamp. Controls (L60): the three variants' bytes really differ, and changing one `exit` instead does change the
// verdict, so each comparison can fail. A closure scan (L36) then pins which product floor modules may name the field at
// all: the five that write or validate it. BOUND: this pins the readers that exist today, never one written later.
// Fixtures are condensed from the owners' suites (regress-base-reuse-core, entry-base-evidence-core); the decision
// tables themselves stay pinned there.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA, ENTRY_BASE_TEST_ID, logBasename, validateStamp } from "./gate-run-core.mjs";
import { executionIdentity, findReusable, reusedRunRecord } from "./gate-reuse-core.mjs";
import { buildRecord, decideBaseReuse, evidenceRequirement, requirementSha256 } from "./regress-base-reuse-core.mjs";
import { buildOffer, decideEntryBase, derivedBaseStamp } from "./entry-base-evidence-core.mjs";
import { buildSnapshot } from "./pre-run-snapshot-core.mjs";
import { entryVerdict } from "./entry-gates-core.mjs";
import { ENTRY_ALGO, ALGO } from "./worktree-fingerprint.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const clone = (v) => JSON.parse(JSON.stringify(v));
const FEATURE = "demo";
const BASE = "b".repeat(40);
const NOW = 1_800_000_000_000;
const MARKER = Buffer.from('{"opened":"x"}\n');
const MARKERS = { "pharn-loop": { state: "ok", bytes: MARKER, mtimeMs: NOW - 1000 }, "pharn-ship": { state: "absent" } };
const RUN = { command: "pharn-loop", markerSha256: sha(MARKER) };
const npm = (id) => ["npm", "run", id];

/** The three variants of a stamp: the field absent, and set on every `ran: true` run to 0 and to 9,999,999. */
const MODES = Object.freeze(["absent", "zero", "large"]);
function variant(stamp, mode) {
  const s = clone(stamp);
  for (const r of s.runs) {
    delete r.duration_ms;
    if (r.ran === true && mode !== "absent") r.duration_ms = mode === "zero" ? 0 : 9_999_999;
  }
  return s;
}
const bytesOf = (s) => Buffer.from(JSON.stringify(s, null, 2));

/** Asserts the three variants are three different inputs (L60) and every one is a valid stamp. */
function assertRealVariants(stamp, expect = {}) {
  const shas = MODES.map((m) => sha(bytesOf(variant(stamp, m))));
  assert.equal(new Set(shas).size, 3, "control: the variants' bytes differ");
  for (const m of MODES) assert.deepEqual(validateStamp(variant(stamp, m), expect), { ok: true }, m);
}

function run(seq, id, extra = {}) {
  const fp = extra.fp ?? "1".repeat(64);
  delete extra.fp;
  return {
    seq,
    id,
    exit: 0,
    ran: true,
    timed_out: false,
    mutated: false,
    reason: null,
    argv: npm(id === ENTRY_BASE_TEST_ID ? "test" : id),
    shell: null,
    files: [],
    fp_before: fp,
    fp_after: fp,
    stdout_sha256: sha(`out ${id}`),
    stderr_sha256: sha(`err ${id}`),
    results_sha256: null,
    ...extra,
  };
}

function stampOf(stage, side, runs, over = {}) {
  return {
    schema: SCHEMA,
    stage,
    side,
    feature: FEATURE,
    head: stage === "regress" && side === "base" ? BASE : "c".repeat(40),
    source: "discover",
    source_raw: null,
    style_skipped: stage === "regress",
    finalized: true,
    fingerprint: { algo: ALGO, init: runs[0].fp_before, final: runs[runs.length - 1].fp_after },
    required: runs.map((r) => r.id).filter((id) => id !== "reconcile"),
    runs,
    aux: { completeness: stage === "verify" ? 0 : null },
    ...over,
  };
}

// ── the verdict CLIs ──────────────────────────────────────────────────────────────────────────────────────────────

function cli(script, args) {
  const r = spawnSync(process.execPath, [join(HERE, script), ...args], { encoding: "utf8" });
  return { status: r.status, doc: JSON.parse(r.stdout) };
}
/** The output with the stamp sha256s the stamp path reports set aside (the bytes DO differ by construction). */
function normalized(doc) {
  const d = clone(doc);
  for (const side of Object.values(d.gate_run ?? {})) if (side && typeof side === "object") side.stamp_sha256 = "<stamp>";
  if (d.gate_run && typeof d.gate_run.stamp_sha256 === "string") d.gate_run.stamp_sha256 = "<stamp>";
  return d;
}
function withFiles(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), "gate-durations-"));
  try {
    const paths = files.map((s, i) => {
      const p = join(dir, `s${i}.json`);
      writeFileSync(p, JSON.stringify(s, null, 2));
      return p;
    });
    return fn(...paths);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const verifyStamp = (exitOf = {}) =>
  stampOf("verify", null, [
    run(0, "test", { exit: exitOf.test ?? 0 }),
    run(1, "typecheck", { exit: exitOf.typecheck ?? 1 }),
    run(2, "reconcile", { argv: ["node", "pharn/floor/check-bash-reconcile.mjs"] }),
  ]);

test("AC-6 — check-verify --stamp: exit and stdout are the same whatever the durations, and an exit change is seen (L60)", () => {
  assertRealVariants(verifyStamp(), { stage: "verify" });
  const verdicts = MODES.map((m) =>
    withFiles([variant(verifyStamp(), m)], (p) => cli("check-verify.mjs", ["--stamp", p, "--feature", FEATURE]))
  );
  assert.equal(verdicts[0].doc.verdict, "FAIL", "control: the fixture is not a trivially green map");
  for (const v of verdicts.slice(1)) {
    assert.equal(v.status, verdicts[0].status);
    assert.deepEqual(normalized(v.doc), normalized(verdicts[0].doc));
  }
  const flipped = withFiles([variant(verifyStamp({ typecheck: 0 }), "large")], (p) =>
    cli("check-verify.mjs", ["--stamp", p, "--feature", FEATURE])
  );
  assert.notDeepEqual(normalized(flipped.doc), normalized(verdicts[0].doc), "control: the comparison can fail");
});

const regressStamp = (side, exitOf = {}) =>
  stampOf("regress", side, [run(0, "test", { exit: exitOf.test ?? 0 }), run(1, "build", { exit: exitOf.build ?? 0 })]);

test("AC-6 — check-regress verdict: exit and stdout are the same whatever the durations, and an exit change is seen (L60)", () => {
  assertRealVariants(regressStamp("base"), { stage: "regress", side: "base" });
  const head = regressStamp("head", { build: 1 });
  const verdicts = MODES.map((m) =>
    withFiles([variant(regressStamp("base"), m), variant(head, m)], (b, h) =>
      cli("check-regress.mjs", ["verdict", "--base-stamp", b, "--head-stamp", h, "--base", BASE])
    )
  );
  assert.equal(verdicts[0].doc.verdict, "regressions", "control: the fixture is a regression, not a clean pass");
  for (const v of verdicts.slice(1)) {
    assert.equal(v.status, verdicts[0].status);
    assert.deepEqual(normalized(v.doc), normalized(verdicts[0].doc));
  }
  const flipped = withFiles([variant(regressStamp("base"), "zero"), variant(regressStamp("head"), "zero")], (b, h) =>
    cli("check-regress.mjs", ["verdict", "--base-stamp", b, "--head-stamp", h, "--base", BASE])
  );
  assert.notEqual(flipped.doc.verdict, verdicts[0].doc.verdict, "control: the comparison can fail");
});

// ── the reuse decisions ───────────────────────────────────────────────────────────────────────────────────────────

test("AC-6 — HEAD→VERIFY reuse: findReusable decides the same and reusedRunRecord writes the same record, durations or not", () => {
  const identity = "d".repeat(64);
  const head = stampOf("regress", "head", [
    run(0, "typecheck", { identity_sha256: identity }),
    run(1, "build", { identity_sha256: identity }),
  ]);
  assertRealVariants(head, { stage: "regress", side: "head" });
  const entry = { id: "build", shell: null, argv: npm("build"), files: [] };
  const outcomes = MODES.map((m) => {
    const found = findReusable({ source: variant(head, m), feature: FEATURE, entry, liveIdentity: identity });
    assert.equal(found.hit, true, m);
    return reusedRunRecord({
      entry: { ...entry, seq: 3 },
      candidate: found.run,
      sourceSha256: "e".repeat(64),
      liveFp: "f".repeat(64),
      liveIdentity: identity,
    });
  });
  for (const o of outcomes) assert.deepEqual(o, outcomes[0]);
  assert.equal(Object.hasOwn(outcomes[0], "duration_ms"), false);
  // control: a different identity misses — the comparison can fail
  assert.equal(findReusable({ source: variant(head, "large"), feature: FEATURE, entry, liveIdentity: "0".repeat(64) }).hit, false);
});

/** A HIT world for decideBaseReuse (condensed from regress-base-reuse-core.test.mjs `scenario`). */
function baseReuseInput(baseStamp, headRecord) {
  const bytes = bytesOf(baseStamp);
  const logs = {};
  baseStamp.runs.forEach((r) => {
    logs[`${logBasename(r.seq, r.id)}.out`] = r.stdout_sha256;
    logs[`${logBasename(r.seq, r.id)}.err`] = r.stderr_sha256;
  });
  const record = buildRecord({
    feature: FEATURE,
    run: RUN,
    stampSha256: sha(bytes),
    install: { kind: "cmd", cmd: "npm ci", unmeasured: false, family: "npm" },
    installResult: { ran: true, exit: 0, timedOut: false },
    timeoutMs: 540000,
    headRoot: [["package.json", sha("pkg")]],
  });
  return {
    record,
    input: {
      feature: FEATURE,
      base: BASE,
      install: { kind: "cmd", cmd: "npm ci", unmeasured: false, family: "npm" },
      timeoutMs: 540000,
      gateRunSchema: SCHEMA,
      fingerprintAlgo: ALGO,
      headRecord,
      headRoot: [["package.json", sha("pkg")]],
      markers: MARKERS,
      now: NOW,
      record: { state: "ok", bytes: Buffer.from(JSON.stringify(record)) },
      stamp: { state: "ok", bytes },
      hashEvidence: (file) => (Object.hasOwn(logs, file) ? logs[file] : null),
    },
  };
}

test("AC-3 + AC-6 — BASE reuse: requirement_sha256 and the decision are the same with the field absent, 0 or large", () => {
  const base = regressStamp("base");
  const head = regressStamp("head");
  assertRealVariants(base, { stage: "regress", side: "base" });
  const decisions = MODES.map((m) => {
    const { input, record } = baseReuseInput(variant(base, m), variant(head, m));
    const d = decideBaseReuse(input);
    assert.equal(d.reused, true, `${m}: ${JSON.stringify(d)}`);
    assert.equal(requirementSha256(evidenceRequirement(variant(base, m), record)), d.requirementSha256, m);
    return d;
  });
  for (const d of decisions.slice(1)) {
    assert.equal(d.requirementSha256, decisions[0].requirementSha256, "requirement_sha256 is byte-identical");
    assert.deepEqual({ ...d, stampSha256: null }, { ...decisions[0], stampSha256: null });
  }
  assert.notEqual(decisions[1].stampSha256, decisions[0].stampSha256, "control: the decision names different stamp bytes");
  // control: a gate the head spec no longer has changes the requirement — the comparison can fail
  const narrower = baseReuseInput(variant(base, "zero"), stampOf("regress", "head", [run(0, "test")]));
  assert.equal(decideBaseReuse(narrower.input).miss, "gates-changed");
});

/** A HIT world for decideEntryBase (condensed from entry-base-evidence-core.test.mjs `world` + `inputs`). */
function entryWorld() {
  const tests = ["src/a.test.js"];
  const head = stampOf("regress", "head", [
    run(0, "test", { files: [...tests], fp: "2".repeat(64) }),
    run(1, "build", { fp: "2".repeat(64) }),
  ]);
  const entry = stampOf(
    "entry",
    null,
    [run(0, "lint"), run(1, ENTRY_BASE_TEST_ID, { files: [...tests] }), run(2, "test"), run(3, "build")],
    {
      head: BASE,
      style_skipped: false,
      fingerprint: { algo: ENTRY_ALGO, init: "1".repeat(64), final: "1".repeat(64) },
      aux: { completeness: null },
    }
  );
  entry.required = entry.runs.map((r) => r.id);
  return { head, entry };
}
function entryInputs(head, entry) {
  const entryBytes = bytesOf(entry);
  const offer = buildOffer({
    feature: FEATURE,
    run: RUN,
    nonce: "a".repeat(32),
    base: BASE,
    stampSha256: sha(entryBytes),
    timeoutMs: 540000,
    d0: "absent",
    featureDir: entry.runs.map((r) => ({ id: r.id, before: "absent", after: "absent" })),
  });
  return {
    feature: FEATURE,
    base: BASE,
    timeoutMs: 540000,
    installOverride: false,
    headRecord: head,
    markers: MARKERS,
    now: NOW,
    offer: { state: "ok", bytes: Buffer.from(JSON.stringify(offer)) },
    snapshot: { state: "ok", bytes: Buffer.from(JSON.stringify(buildSnapshot({ feature: FEATURE, run: RUN, base: BASE, paths: [] }))) },
    entryStamp: { state: "ok", bytes: entryBytes },
  };
}

test("AC-6 — ENTRY→BASE evidence: decideEntryBase and the derived BASE stamp are the same whatever the entry durations", () => {
  const { head, entry } = entryWorld();
  assertRealVariants(entry, { stage: "entry" });
  const out = MODES.map((m) => {
    const r = decideEntryBase(entryInputs(head, variant(entry, m)));
    assert.equal(r.decision.reused, true, `${m}: ${JSON.stringify(r.decision)}`);
    const derived = derivedBaseStamp({ feature: FEATURE, base: BASE, detail: r.detail, entryStampSha256: r.decision.sourceStampSha256 });
    assert.equal(
      derived.runs.some((x) => Object.hasOwn(x, "duration_ms")),
      false,
      `${m}: the derived BASE stamp ran nothing, so it carries no duration`
    );
    assert.deepEqual(validateStamp(derived, { stage: "regress", side: "base" }), { ok: true }, m);
    return { r, derived };
  });
  for (const o of out.slice(1)) {
    assert.deepEqual(
      o.r.detail.mapping.map((x) => [x.id, x.kind]),
      out[0].r.detail.mapping.map((x) => [x.id, x.kind])
    );
    assert.deepEqual(o.r.detail.ignored, out[0].r.detail.ignored);
    const strip = (s) => ({
      ...s,
      runs: s.runs.map((x) => ({ ...x, reused: x.reused ? { ...x.reused, stamp_sha256: "<entry>" } : undefined })),
    });
    assert.deepEqual(strip(o.derived), strip(out[0].derived));
  }
  // control: a timed-out entry run is not completed evidence — the comparison can fail
  const killed = clone(entry);
  killed.runs[3].timed_out = true;
  assert.equal(decideEntryBase(entryInputs(head, variant(killed, "large"))).decision.miss, "not-completed");
});

test("AC-6 — the entry verdict is the same whatever the durations, and an exit change is seen (L60)", () => {
  const { entry } = entryWorld();
  entry.runs[3].exit = 2;
  const featureDir = entry.runs.map((r) => ({ id: r.id, before: "absent", after: "absent" }));
  const verdicts = MODES.map((m) => entryVerdict({ stamp: variant(entry, m), featureDir, d0: "absent" }));
  assert.equal(verdicts[0].status, "red");
  for (const v of verdicts.slice(1)) assert.deepEqual(v, verdicts[0]);
  const green = clone(entry);
  green.runs[3].exit = 0;
  assert.equal(entryVerdict({ stamp: variant(green, "large"), featureDir, d0: "absent" }).status, "green", "control");
});

// ── the execution identity over a REAL stamp ───────────────────────────────────────────────────────────────────────

test("AC-3 — over a real run-gates stamp, identity_sha256 recomputes from each run's inputs with duration_ms present or stripped", () => {
  const dir = mkdtempSync(join(tmpdir(), "gate-durations-real-"));
  try {
    const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
    git("init", "-q", ".");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(join(dir, ".gitignore"), "pharn/.run/\n");
    mkdirSync(join(dir, `pharn/features/${FEATURE}`), { recursive: true });
    writeFileSync(join(dir, `pharn/features/${FEATURE}/PLAN.md`), "# PLAN\n\n## Files\n\n- `a.txt` — a\n");
    writeFileSync(join(dir, "a.txt"), "a\n");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", scripts: { test: "true", lint: "true" } }));
    git("add", "-A");
    git("commit", "-qm", "init");
    const out = "pharn/.run/gates";
    const rg = (...a) => spawnSync(process.execPath, [join(HERE, "run-gates.mjs"), ...a], { cwd: dir, encoding: "utf8" });
    assert.equal(rg("init", "--stage", "verify", "--feature", FEATURE, "--out", out, "--discover", "package.json").status, 0);
    for (let i = 0; i < 10 && rg("run", "--next", "--out", out, "--timeout-ms", "30000").status === 0; i++);
    const stamp = JSON.parse(readFileSync(join(dir, out, "stamp.json"), "utf8"));
    assert.ok(stamp.runs.length >= 2);
    const cwdAbs = execFileSync("pwd", ["-P"], { cwd: dir, encoding: "utf8" }).trim();
    const recompute = (r) =>
      executionIdentity({
        shell: r.shell ?? null,
        argv: r.argv ?? null,
        files: r.files ?? [],
        cwdAbs,
        timeoutMs: 30000,
        head: stamp.head,
        fingerprintAlgo: stamp.fingerprint.algo,
        fpBefore: r.fp_before,
      }).value;
    for (const r of stamp.runs) {
      assert.ok(Number.isSafeInteger(r.duration_ms), `${r.id}: the real run recorded a duration`);
      assert.equal(recompute(r), r.identity_sha256, `${r.id}: with the field present`);
      const stripped = { ...r };
      delete stripped.duration_ms;
      assert.equal(recompute(stripped), r.identity_sha256, `${r.id}: with the field stripped`);
      assert.equal(recompute({ ...r, duration_ms: 1 }), r.identity_sha256, `${r.id}: with the field perturbed`);
    }
    // control: an input the identity DOES bind moves it
    assert.notEqual(recompute({ ...stamp.runs[0], files: ["x"] }), stamp.runs[0].identity_sha256);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── the closure (L36): which product floor modules may name the field at all ──────────────────────────────────────

test("AC-6 closure — only the five modules that write or validate duration_ms name it; no verdict, reuse or route module does", () => {
  const ALLOWED = ["entry-gates.mjs", "entry-observations.mjs", "gate-run-core.mjs", "run-gates.mjs", "stage-work.mjs"];
  const modules = readdirSync(HERE).filter((f) => /\.(mjs|cjs)$/.test(f) && !/\.test\.(mjs|cjs)$/.test(f));
  const naming = modules.filter((f) => readFileSync(join(HERE, f), "utf8").includes("duration_ms")).sort();
  assert.deepEqual(naming, ALLOWED);
  for (const f of ["check-verify.mjs", "check-regress.mjs", "gate-reuse-core.mjs", "regress-base-reuse-core.mjs", "check-loop.mjs"]) {
    assert.ok(modules.includes(f), `control: the scan reaches ${f}`);
  }
  assert.ok(
    modules.some((f) => f.startsWith("stage-agent")),
    "control: the scan reaches the stage-model routing modules"
  );
});
