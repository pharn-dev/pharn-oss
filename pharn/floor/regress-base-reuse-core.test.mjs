// pharn/floor/regress-base-reuse-core.test.mjs — the pure BASE-reuse rules (regress-base-reuse-core.mjs), unit-level:
// one valid HIT scenario, then ONE input mutated at a time — each must flip the HIT to exactly its own miss row (L60),
// and each input the requirement deliberately leaves out must NOT. The end-to-end proof that a real second invocation
// takes the HIT path lives in stage-regress.test.mjs (L45); this file pins the predicate's rows and their order.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  REQUIREMENT_SCHEMA,
  RECORD_SCHEMA,
  RECORD_BASENAME,
  MARKER_AGE_CEILING_MS,
  isRootLevel,
  baseRequirement,
  requirementSha256,
  evidenceRequirement,
  deliveryRunIdentity,
  buildRecord,
  validateRecord,
  evidenceFiles,
  decideBaseReuse,
  sha256Hex,
} from "./regress-base-reuse-core.mjs";
import { BASE_REUSE_MISSES, DELIVERY_COMMANDS } from "./stage-regress-core.mjs";
import { SCHEMA as GATE_RUN_SCHEMA, logBasename, resultsFileName } from "./gate-run-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FEATURE = "demo";
const BASE = "b".repeat(40);
const ALGO = "worktree-fingerprint/2+sha256";
const NOW = Date.parse("2026-09-28T12:00:00.000Z");
const hex = (s) => createHash("sha256").update(s).digest("hex");
const clone = (v) => JSON.parse(JSON.stringify(v));

/** The spec both sides share: a discovered `test` gate with its outside files, a `build` gate, one structural pair. */
function specEntries() {
  return [
    { id: "test", shell: null, argv: ["npm", "run", "test"], files: ["src/other.test.js"] },
    { id: "build", shell: null, argv: ["npm", "run", "build"], files: [] },
    {
      id: "structural:cap/evals/expected/x.json",
      shell: null,
      argv: ["node", "pharn/floor/check-structural.mjs", "cap/evals/expected/x.json", "cap/findings.json", "."],
      files: [],
    },
  ];
}

/** A finalized HEAD stamp — the record base-init copies its spec from. */
function headStamp(overrides = {}) {
  const fp = hex("head-tree");
  return {
    schema: GATE_RUN_SCHEMA,
    stage: "regress",
    side: "head",
    feature: FEATURE,
    head: "c".repeat(40),
    source: "discover",
    source_raw: null,
    style_skipped: true,
    finalized: true,
    fingerprint: { algo: ALGO, init: fp, final: fp },
    required: ["test", "build"],
    runs: specEntries().map((e, i) => ({
      seq: i,
      ...e,
      exit: i === 0 ? 1 : 0,
      ran: true,
      timed_out: false,
      mutated: false,
      reason: null,
      fp_before: fp,
      fp_after: fp,
      stdout_sha256: hex(`h-out-${i}`),
      stderr_sha256: hex(`h-err-${i}`),
      results_sha256: null,
    })),
    aux: { completeness: null },
    ...overrides,
  };
}

/** The base side's log files on disk, keyed by file name. */
function baseLogs() {
  const files = {};
  specEntries().forEach((e, i) => {
    const b = logBasename(i, e.id);
    files[`${b}.out`] = `base out ${i}`;
    files[`${b}.err`] = `base err ${i}`;
  });
  files[resultsFileName(0, "test")] = "results 0";
  return files;
}

/** A finalized BASE stamp produced for the shared spec at BASE. */
function baseStamp(logs = baseLogs()) {
  const fp = hex("base-tree");
  return {
    schema: GATE_RUN_SCHEMA,
    stage: "regress",
    side: "base",
    feature: FEATURE,
    head: BASE,
    source: "discover",
    source_raw: null,
    style_skipped: true,
    finalized: true,
    fingerprint: { algo: ALGO, init: fp, final: fp },
    required: ["test", "build"],
    runs: specEntries().map((e, i) => {
      const b = logBasename(i, e.id);
      return {
        seq: i,
        ...e,
        exit: i === 2 ? 1 : 0,
        ran: true,
        timed_out: false,
        mutated: false,
        reason: null,
        fp_before: fp,
        fp_after: fp,
        stdout_sha256: hex(logs[`${b}.out`]),
        stderr_sha256: hex(logs[`${b}.err`]),
        results_sha256: i === 0 ? hex(logs[resultsFileName(0, "test")]) : null,
      };
    }),
    aux: { completeness: null },
  };
}

const INSTALL = { kind: "cmd", cmd: "npm ci", unmeasured: false, family: "npm" };
const INSTALL_RESULT = { ran: true, exit: 0, timedOut: false };
const HEAD_ROOT = [
  ["package.json", hex("pkg v2")],
  ["tsconfig.json", hex("tsconfig")],
];

/** Marker bytes are opaque to the predicate — hashed, never parsed — so any bytes stand for a run. */
const LOOP_MARKER = Buffer.from(
  '{"schema":"pharn-loop-active/1","name":"demo","session_id":"s1","started_at":"2026-09-28T11:00:00.000Z","cap":3}\n'
);
const SHIP_MARKER = Buffer.from(
  '{"schema":"pharn-run-active/1","command":"pharn-ship","name":"demo","session_id":"s1","started_at":"x"}\n'
);

function marker(bytes = LOOP_MARKER, mtimeMs = NOW - 60_000) {
  return { state: "ok", bytes, mtimeMs };
}

/** A complete, valid HIT scenario. Each test mutates exactly one part of it. */
function scenario() {
  const logs = baseLogs();
  const stamp = baseStamp(logs);
  const stampBytes = Buffer.from(JSON.stringify(stamp, null, 2));
  const record = buildRecord({
    feature: FEATURE,
    run: { command: "pharn-loop", markerSha256: sha256Hex(LOOP_MARKER) },
    stampSha256: sha256Hex(stampBytes),
    install: INSTALL,
    installResult: INSTALL_RESULT,
    timeoutMs: 540000,
    headRoot: HEAD_ROOT,
  });
  return {
    logs,
    record,
    stamp,
    input: {
      feature: FEATURE,
      base: BASE,
      install: { ...INSTALL },
      timeoutMs: 540000,
      gateRunSchema: GATE_RUN_SCHEMA,
      fingerprintAlgo: ALGO,
      headRecord: headStamp(),
      headRoot: clone(HEAD_ROOT),
      markers: { "pharn-loop": marker(), "pharn-ship": { state: "absent" } },
      now: NOW,
      record: { state: "ok", bytes: Buffer.from(JSON.stringify(record, null, 2)) },
      stamp: { state: "ok", bytes: stampBytes },
      hashEvidence: (file) => (Object.hasOwn(logs, file) ? hex(logs[file]) : null),
    },
  };
}

/** Mutate the stamp AND re-bind the record to its new bytes — so only the targeted row can fire, never
 *  `evidence-unbound` (L60). */
function withStamp(s, mutate) {
  const stamp = clone(s.stamp);
  mutate(stamp);
  const bytes = Buffer.from(JSON.stringify(stamp, null, 2));
  const record = { ...clone(s.record), stamp_sha256: sha256Hex(bytes) };
  return { ...s.input, stamp: { state: "ok", bytes }, record: { state: "ok", bytes: Buffer.from(JSON.stringify(record)) } };
}

function withRecord(s, mutate) {
  const record = clone(s.record);
  mutate(record);
  return { ...s.input, record: { state: "ok", bytes: Buffer.from(JSON.stringify(record)) } };
}

// ── THE HIT ──────────────────────────────────────────────────────────────────────────────────────────
test("HIT — every row passes: the decision names the evidence, the requirement and the run it saw", () => {
  const s = scenario();
  const d = decideBaseReuse(s.input);
  assert.equal(d.reused, true, JSON.stringify(d));
  assert.equal(d.miss, null);
  assert.equal(d.stampSha256, sha256Hex(s.input.stamp.bytes));
  assert.match(d.requirementSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(d.run, { command: "pharn-loop", markerSha256: sha256Hex(LOOP_MARKER) });
  // The digest is the evidence's OWN requirement: re-derived from the stamp + record, it is the same object.
  assert.equal(requirementSha256(evidenceRequirement(s.stamp, s.record)), d.requirementSha256);
});

// ── EVERY MISS ROW, one input at a time (L60: each asserts its OWN category) ────────────────────────
const MUTATIONS = [
  ["requirement-unknown", "the head record is unreadable", (s) => ({ ...s.input, headRecord: null })],
  ["requirement-unknown", "the head record is a base-side record", (s) => ({ ...s.input, headRecord: headStamp({ side: "base" }) })],
  ["requirement-unknown", "the head record carries no entries", (s) => ({ ...s.input, headRecord: headStamp({ runs: [] }) })],
  [
    "no-delivery-run",
    "no run marker is open (a standalone /pharn-regress)",
    (s) => ({ ...s.input, markers: { "pharn-loop": { state: "absent" }, "pharn-ship": { state: "absent" } } }),
  ],
  [
    "no-delivery-run",
    "both delivery commands have a marker for this feature",
    (s) => ({ ...s.input, markers: { "pharn-loop": marker(), "pharn-ship": marker(SHIP_MARKER) } }),
  ],
  [
    "no-delivery-run",
    "the second marker is unreadable — still ambiguity, as the write guard counts it",
    (s) => ({ ...s.input, markers: { ...s.input.markers, "pharn-ship": { state: "unusable" } } }),
  ],
  [
    "no-delivery-run",
    "the only marker is a link, a directory or unreadable",
    (s) => ({ ...s.input, markers: { "pharn-loop": { state: "unusable" }, "pharn-ship": { state: "absent" } } }),
  ],
  [
    "no-delivery-run",
    "the marker is older than the write guard's 24 h",
    (s) => ({ ...s.input, markers: { ...s.input.markers, "pharn-loop": marker(LOOP_MARKER, NOW - MARKER_AGE_CEILING_MS - 1) } }),
  ],
  [
    "no-delivery-run",
    "the marker is dated more than 24 h in the future",
    (s) => ({ ...s.input, markers: { ...s.input.markers, "pharn-loop": marker(LOOP_MARKER, NOW + MARKER_AGE_CEILING_MS + 1) } }),
  ],
  ["no-record", "no record was published", (s) => ({ ...s.input, record: { state: "absent" } })],
  ["record-malformed", "the record is a link or not a regular file", (s) => ({ ...s.input, record: { state: "unusable" } })],
  ["record-malformed", "the record is not JSON", (s) => ({ ...s.input, record: { state: "ok", bytes: Buffer.from("{not json") } })],
  ["record-malformed", "the record carries an extra key", (s) => withRecord(s, (r) => (r.extra = 1))],
  ["record-malformed", "the record is another schema version", (s) => withRecord(s, (r) => (r.schema = "pharn-regress-base-reuse/0"))],
  ["record-malformed", "the record's head_root is not sorted", (s) => withRecord(s, (r) => r.head_root.reverse())],
  [
    "other-run",
    "the record was published under another run's marker (a new run re-opened it)",
    (s) => ({ ...s.input, markers: { ...s.input.markers, "pharn-loop": marker(Buffer.from('{"started_at":"a later run"}\n')) } }),
  ],
  ["other-run", "the record was published by the other delivery command", (s) => withRecord(s, (r) => (r.run.command = "pharn-ship"))],
  ["other-run", "the record names another feature", (s) => withRecord(s, (r) => (r.feature = "other"))],
  ["evidence-missing", "the retained base stamp is gone", (s) => ({ ...s.input, stamp: { state: "absent" } })],
  ["evidence-invalid", "the retained base stamp is a link or unreadable", (s) => ({ ...s.input, stamp: { state: "unusable" } })],
  [
    "evidence-unbound",
    "the retained stamp's bytes are not the ones the record bound",
    (s) => ({ ...s.input, stamp: { state: "ok", bytes: Buffer.concat([s.input.stamp.bytes, Buffer.from(" ")]) } }),
  ],
  ["evidence-invalid", "an UNFINALIZED stamp, even when the record binds its bytes", (s) => withStamp(s, (t) => (t.finalized = false))],
  ["evidence-invalid", "a head-side stamp in the base slot", (s) => withStamp(s, (t) => (t.side = "head"))],
  ["evidence-invalid", "another feature's stamp", (s) => withStamp(s, (t) => (t.feature = "other"))],
  ["evidence-invalid", "a gate-run schema the validator does not know", (s) => withStamp(s, (t) => (t.schema = "gate-run-record/0"))],
  [
    "evidence-invalid",
    "a stamp whose fingerprint chain breaks between gates",
    (s) => withStamp(s, (t) => (t.runs[1].fp_before = hex("elsewhere"))),
  ],
  [
    "evidence-invalid",
    "a recorded stdout log was edited",
    (s) => ({ ...s.input, hashEvidence: (f) => (f === `${logBasename(0, "test")}.out` ? hex("edited") : s.input.hashEvidence(f)) }),
  ],
  [
    "evidence-invalid",
    "a recorded per-test results file was removed",
    (s) => ({ ...s.input, hashEvidence: (f) => (f === resultsFileName(0, "test") ? null : s.input.hashEvidence(f)) }),
  ],
  [
    "version-changed",
    "the stamp was fingerprinted with another algorithm",
    (s) => withStamp(s, (t) => (t.fingerprint.algo = "worktree-fingerprint/1+sha256")),
  ],
  ["version-changed", "the current fingerprint algorithm moved", (s) => ({ ...s.input, fingerprintAlgo: "worktree-fingerprint/3+sha256" })],
  ["base-changed", "a different base commit", (s) => ({ ...s.input, base: "d".repeat(40) })],
  [
    "gates-changed",
    "a gate was added at HEAD",
    (s) => {
      const h = headStamp({ required: ["test", "build", "typecheck"] });
      h.runs.push({ ...h.runs[1], seq: 3, id: "typecheck", argv: ["npm", "run", "typecheck"] });
      return { ...s.input, headRecord: h };
    },
  ],
  [
    "gates-changed",
    "a gate's command changed",
    (s) => {
      const h = headStamp();
      h.runs[1].argv = ["npm", "run", "build:ci"];
      return { ...s.input, headRecord: h };
    },
  ],
  [
    "gates-changed",
    "an explicit --gates string changed",
    (s) => {
      const t = withStamp(s, (x) => {
        x.source = "explicit";
        x.source_raw = "make a";
      });
      return { ...t, headRecord: headStamp({ source: "explicit", source_raw: "make b" }) };
    },
  ],
  [
    "gates-changed",
    "the outside test list changed",
    (s) => {
      const h = headStamp();
      h.runs[0].files = [];
      return { ...s.input, headRecord: h };
    },
  ],
  [
    "gates-changed",
    "an outside eval pair is no longer outside",
    (s) => {
      const h = headStamp();
      h.runs = h.runs.slice(0, 2);
      return { ...s.input, headRecord: h };
    },
  ],
  ["gates-changed", "the style skip flipped", (s) => ({ ...s.input, headRecord: headStamp({ style_skipped: false }) })],
  [
    "gates-changed",
    "the gate order changed",
    (s) => {
      const h = headStamp();
      h.runs = [h.runs[1], h.runs[0], h.runs[2]].map((r, i) => ({ ...r, seq: i }));
      return { ...s.input, headRecord: h };
    },
  ],
  [
    "execution-changed",
    "--no-install replaced the install",
    (s) => ({ ...s.input, install: { kind: "none", cmd: null, unmeasured: false } }),
  ],
  [
    "execution-changed",
    "an explicit --install command changed",
    (s) => ({ ...s.input, install: { kind: "cmd", cmd: "npm ci --ignore-scripts", unmeasured: false } }),
  ],
  ["execution-changed", "a different --timeout-ms", (s) => ({ ...s.input, timeoutMs: 600 })],
  [
    "execution-changed",
    "a root-level HEAD file changed (a parent-directory search from the nested base worktree reaches it)",
    (s) => ({ ...s.input, headRoot: [["package.json", hex("pkg v3")], HEAD_ROOT[1]] }),
  ],
  [
    "execution-changed",
    "a root-level HEAD file was added",
    (s) => ({ ...s.input, headRoot: [...clone(HEAD_ROOT), ["vitest.config.mjs", hex("v")]] }),
  ],
  ["execution-changed", "the partition could not be read (no head_root)", (s) => ({ ...s.input, headRoot: null })],
  [
    "evidence-unreliable",
    "the base side ran with NO install (dependency resolution may walk up into the HEAD tree)",
    (s) => {
      const t = withRecord(s, (r) => {
        r.install = { kind: "none", cmd: null };
        r.install_result = null;
      });
      return { ...t, install: { kind: "none", cmd: null, unmeasured: false, reason: "no-manifest" } };
    },
  ],
  [
    "evidence-unreliable",
    "the base install failed",
    (s) => withRecord(s, (r) => (r.install_result = { ran: true, exit: 1, timedOut: false })),
  ],
  [
    "evidence-unreliable",
    "the base install timed out",
    (s) => withRecord(s, (r) => (r.install_result = { ran: true, exit: 124, timedOut: true })),
  ],
  [
    "evidence-unreliable",
    "a base gate timed out",
    (s) =>
      withStamp(s, (t) => {
        t.runs[1].timed_out = true;
        t.runs[1].exit = 124;
      }),
  ],
];

for (const [category, why, build] of MUTATIONS) {
  test(`MISS ${category} — ${why}`, () => {
    const d = decideBaseReuse(build(scenario()));
    assert.equal(d.reused, false, `must not reuse: ${JSON.stringify(d)}`);
    assert.equal(d.miss, category);
    assert.equal(d.stampSha256, null, "a miss names no evidence");
  });
}

test("★ CLOSURE — every BASE_REUSE_MISSES member is reached by some mutation, and every mutation names a member (L29/L36)", () => {
  const reached = new Set(MUTATIONS.map(([c]) => c));
  assert.deepEqual([...reached].sort(), [...BASE_REUSE_MISSES].sort());
});

test("★ CLOSURE — every literal the core passes to miss() is a member, and every member has a call site (source scan)", () => {
  const src = readFileSync(join(HERE, "regress-base-reuse-core.mjs"), "utf8");
  const lits = new Set([...src.matchAll(/\bmiss\(\s*"([a-z-]+)"/g)].map((m) => m[1]));
  assert.ok(lits.size > 0, "non-vacuity: the scan finds the call sites");
  assert.deepEqual([...lits].sort(), [...BASE_REUSE_MISSES].sort());
});

test("★ ORDER — the first failing row decides, in BASE_REUSE_MISSES order", () => {
  const s = scenario();
  // Unbound AND another base: evidence-unbound comes first.
  assert.equal(
    decideBaseReuse({
      ...s.input,
      base: "d".repeat(40),
      stamp: { state: "ok", bytes: Buffer.concat([s.input.stamp.bytes, Buffer.from(" ")]) },
    }).miss,
    "evidence-unbound"
  );
  // Another base AND another gate set: base-changed comes first.
  assert.equal(decideBaseReuse({ ...s.input, base: "d".repeat(40), headRecord: headStamp({ style_skipped: false }) }).miss, "base-changed");
  // Another gate set AND another timeout: gates-changed comes first.
  assert.equal(decideBaseReuse({ ...s.input, timeoutMs: 600, headRecord: headStamp({ style_skipped: false }) }).miss, "gates-changed");
  // A changed requirement AND an unreliable install: the requirement row comes first.
  const t = withRecord(s, (r) => (r.install_result = { ran: true, exit: 1, timedOut: false }));
  assert.equal(decideBaseReuse({ ...t, timeoutMs: 600 }).miss, "execution-changed");
});

test("the decision carries the run it saw on every miss past the identity, and null before it", () => {
  const s = scenario();
  assert.equal(decideBaseReuse({ ...s.input, headRecord: null }).run, null);
  assert.equal(decideBaseReuse({ ...s.input, markers: { "pharn-loop": { state: "absent" } } }).run, null);
  assert.deepEqual(decideBaseReuse({ ...s.input, record: { state: "absent" } }).run, {
    command: "pharn-loop",
    markerSha256: sha256Hex(LOOP_MARKER),
  });
});

// ── WHAT THE REQUIREMENT DELIBERATELY LEAVES OUT — each must still HIT ────────────────────────────────
const IRRELEVANT = [
  [
    "the HEAD tree moved (head fingerprints, head exits and head commit all differ)",
    (s) => {
      const h = headStamp({ head: "e".repeat(40), fingerprint: { algo: ALGO, init: hex("x"), final: hex("y") } });
      for (const r of h.runs) {
        r.exit = 0;
        r.fp_before = hex("y");
        r.fp_after = hex("y");
      }
      return { ...s.input, headRecord: h };
    },
  ],
  [
    "the install decision's labels differ (unmeasured, family, reason)",
    (s) => ({ ...s.input, install: { kind: "cmd", cmd: "npm ci", unmeasured: true, family: "other", reason: "x" } }),
  ],
  [
    "the head record is still in progress (its spec in `entries`)",
    (s) => {
      const h = headStamp({ finalized: false });
      h.entries = h.runs.map((r) => ({ id: r.id, shell: r.shell, argv: r.argv, files: r.files, seq: r.seq }));
      h.runs = [];
      return { ...s.input, headRecord: h };
    },
  ],
  [
    "the delivery run is a /pharn-ship run",
    (s) => {
      const t = withRecord(s, (r) => (r.run = { command: "pharn-ship", marker_sha256: sha256Hex(SHIP_MARKER) }));
      return { ...t, markers: { "pharn-loop": { state: "absent" }, "pharn-ship": marker(SHIP_MARKER) } };
    },
  ],
  [
    "the marker is exactly 24 h old (the write guard's inclusive ceiling)",
    (s) => ({ ...s.input, markers: { ...s.input.markers, "pharn-loop": marker(LOOP_MARKER, NOW - MARKER_AGE_CEILING_MS) } }),
  ],
  ["a pre-existing red base gate is ordinary evidence", (s) => withStamp(s, (t) => (t.runs[0].exit = 1))],
  [
    "a `no-files` base entry is ordinary evidence",
    (s) =>
      withStamp(s, (t) => {
        t.runs[0].ran = false;
        t.runs[0].reason = "no-files";
      }),
  ],
  [
    "a base gate that MUTATED its own worktree (recorded, not refused)",
    (s) =>
      withStamp(s, (t) => {
        t.runs[1].mutated = true;
      }),
  ],
  [
    "no root-level path changed (an empty head_root on both sides)",
    (s) => {
      const t = withRecord(s, (r) => (r.head_root = []));
      return { ...t, headRoot: [] };
    },
  ],
];

for (const [why, build] of IRRELEVANT) {
  test(`still HIT — ${why}`, () => {
    const d = decideBaseReuse(build(scenario()));
    assert.equal(d.reused, true, JSON.stringify(d));
  });
}

test("the requirement object's key set is exactly the keys the rows compare (a new key needs a row)", () => {
  const s = scenario();
  const req = evidenceRequirement(s.stamp, s.record);
  assert.deepEqual(Object.keys(req), [
    "schema",
    "feature",
    "base",
    "gate_run_schema",
    "fingerprint_algo",
    "spec",
    "install",
    "timeout_ms",
    "head_root",
  ]);
  assert.equal(req.schema, REQUIREMENT_SCHEMA);
  assert.deepEqual(Object.keys(req.spec), ["source", "source_raw", "style_skipped", "required", "entries"]);
  assert.deepEqual(Object.keys(req.spec.entries[0]), ["id", "shell", "argv", "files"]);
  assert.deepEqual(Object.keys(req.install), ["kind", "cmd"]);
});

test("baseRequirement is canonical: equal inputs give one digest; a label does not move it; a file list does", () => {
  const args = (install, entries) => ({
    feature: FEATURE,
    base: BASE,
    gateRunSchema: GATE_RUN_SCHEMA,
    fingerprintAlgo: ALGO,
    spec: { source: "discover", source_raw: null, style_skipped: false, required: ["test"], entries },
    install,
    timeoutMs: 1000,
    headRoot: [],
  });
  const a = requirementSha256(baseRequirement(args(INSTALL, specEntries())));
  assert.equal(a, requirementSha256(baseRequirement(args({ ...INSTALL, unmeasured: true }, specEntries()))));
  const e = specEntries();
  e[0].files = ["src/x.test.js"];
  assert.notEqual(a, requirementSha256(baseRequirement(args(INSTALL, e))));
});

test("isRootLevel: a root file or a nested repository's `dir/` entry; never a path below the root", () => {
  assert.equal(isRootLevel("package.json"), true);
  assert.equal(isRootLevel("vendor/"), true);
  assert.equal(isRootLevel("src/index.js"), false);
  assert.equal(isRootLevel("a/b/"), false);
  assert.equal(isRootLevel(""), false);
  assert.equal(isRootLevel(null), false);
});

// ── TOTAL (L62): no parsed-JSON shape makes the predicate throw ─────────────────────────────────────────
test("TOTAL — hostile values at every record key path, and hostile marker shapes, decide a miss, never a throw", () => {
  const s = scenario();
  const hostile = [null, 1, "x", [], {}, { toString: 1 }];
  const paths = [];
  const walk = (o, p) => {
    for (const k of Object.keys(o)) {
      paths.push([...p, k]);
      if (o[k] !== null && typeof o[k] === "object" && !Array.isArray(o[k])) walk(o[k], [...p, k]);
    }
  };
  walk(s.record, []);
  let n = 0;
  for (const p of paths) {
    for (const h of hostile) {
      const input = withRecord(s, (r) => {
        let o = r;
        for (const k of p.slice(0, -1)) o = o[k];
        o[p[p.length - 1]] = h;
      });
      assert.equal(typeof decideBaseReuse(input).reused, "boolean");
      n++;
    }
  }
  for (const h of hostile) {
    assert.equal(decideBaseReuse({ ...s.input, markers: h }).reused, false);
    assert.equal(decideBaseReuse({ ...s.input, markers: { "pharn-loop": h } }).reused, false);
    assert.equal(decideBaseReuse({ ...s.input, markers: { "pharn-loop": { state: "ok", bytes: h, mtimeMs: NOW } } }).reused, false);
    assert.equal(decideBaseReuse({ ...s.input, markers: { "pharn-loop": { state: "ok", bytes: LOOP_MARKER, mtimeMs: h } } }).reused, false);
    assert.equal(typeof decideBaseReuse({ ...s.input, headRecord: h }).reused, "boolean");
    assert.equal(typeof decideBaseReuse({ ...s.input, headRoot: h }).reused, "boolean");
    n += 6;
  }
  assert.ok(n > 60, "non-vacuity: the walk reached the record's key paths");
});

// ── THE RECORD ───────────────────────────────────────────────────────────────────────────────────────
test("validateRecord: the built record is valid; its key set is closed in both directions", () => {
  const s = scenario();
  assert.deepEqual(validateRecord(s.record), { ok: true });
  for (const k of Object.keys(s.record)) {
    const r = clone(s.record);
    delete r[k];
    assert.equal(validateRecord(r).ok, false, `missing ${k} must be refused`);
  }
  assert.equal(validateRecord({ ...clone(s.record), extra: true }).ok, false);
  assert.equal(validateRecord(null).ok, false);
  assert.equal(validateRecord([]).ok, false);
});

test("validateRecord: every field's shape is held (fail-closed)", () => {
  const s = scenario();
  const bad = [
    (r) => (r.feature = "Not_A_Slug"),
    (r) => (r.run.command = "pharn-review"),
    (r) => (r.run.marker_sha256 = "short"),
    (r) => (r.run.extra = 1),
    (r) => (r.stamp_sha256 = "x".repeat(64)),
    (r) => (r.install = { kind: "cmd", cmd: "" }),
    (r) => (r.install = { kind: "cmd", cmd: "-rf" }),
    (r) => (r.install = { kind: "none", cmd: "npm ci" }),
    (r) => (r.install = { kind: "none", cmd: null }), // a `none` install cannot carry the `cmd` result above
    (r) => (r.install = { kind: "bogus", cmd: null }),
    (r) => (r.install_result = { ran: true, exit: "0", timedOut: false }),
    (r) => (r.install_result = null), // a `cmd` install always carries its result
    (r) => (r.timeout_ms = 0),
    (r) => (r.timeout_ms = 1.5),
    (r) => (r.head_root = null),
    (r) => (r.head_root = [["src/a.js", null]]), // not root-level
    (r) => (r.head_root = [["a", "nothex"]]),
    (r) =>
      (r.head_root = [
        ["a", null],
        ["a", null],
      ]), // not unique
    (r) => (r.head_root = [["a"]]),
  ];
  for (const mutate of bad) {
    const r = clone(s.record);
    mutate(r);
    assert.equal(validateRecord(r).ok, false, JSON.stringify(r));
  }
});

// ── THE DELIVERY RUN ─────────────────────────────────────────────────────────────────────────────────
test("deliveryRunIdentity: one open marker is the identity — sha256 over its exact bytes; a re-opened run differs", () => {
  const id = deliveryRunIdentity({ markers: { "pharn-loop": marker(), "pharn-ship": { state: "absent" } }, now: NOW });
  assert.deepEqual(id, { ok: true, command: "pharn-loop", markerSha256: sha256Hex(LOOP_MARKER) });
  const reopened = deliveryRunIdentity({ markers: { "pharn-loop": marker(Buffer.from("{later}\n")) }, now: NOW });
  assert.equal(reopened.ok, true);
  assert.notEqual(reopened.markerSha256, id.markerSha256);
});

test("deliveryRunIdentity: a marker is never parsed — bytes that are not JSON still identify a run", () => {
  assert.equal(deliveryRunIdentity({ markers: { "pharn-ship": marker(Buffer.from("not json at all")) }, now: NOW }).ok, true);
});

test("✧ PARITY — the marker age ceiling is the write guard's and the Stop guard's; the marker paths are the writers'", async () => {
  const guard = readFileSync(join(HERE, "..", "..", ".claude", "hooks", "enforce-writes-scope.cjs"), "utf8");
  assert.match(guard, /const RUN_AGE_CEILING_MS = 24 \* 60 \* 60 \* 1000;/);
  assert.match(guard, /Math\.abs\(Date\.now\(\) - mst\.mtimeMs\)/, "the write guard ages a marker by its mtime, in either direction");
  const require = createRequire(import.meta.url);
  assert.equal(require("../../.claude/hooks/require-loop-record.cjs").AGE_CEILING_MS, MARKER_AGE_CEILING_MS);
  const { markerPath } = await import("./run-marker.mjs");
  assert.equal(markerPath("/r", "pharn-ship", FEATURE), "/r/.pharn/pharn-ship/demo/active.json");
  assert.deepEqual([...DELIVERY_COMMANDS], ["pharn-loop", "pharn-ship"]);
  assert.equal(RECORD_BASENAME, "pharn-regress-base-reuse.json");
  assert.equal(RECORD_SCHEMA, "pharn-regress-base-reuse/1");
});

// ── THE EVIDENCE FILES — check-loop-fresh J's own rule ───────────────────────────────────────────────
test("evidenceFiles: stdout/stderr for every run (a null digest included), results only when recorded as a string", () => {
  const s = scenario();
  const t = clone(s.stamp);
  t.runs[1].stdout_sha256 = null;
  const files = evidenceFiles(t);
  assert.equal(files.length, t.runs.length * 2 + 1);
  assert.deepEqual(
    files.find((f) => f.file === `${logBasename(1, "build")}.out`),
    { file: `${logBasename(1, "build")}.out`, expected: null }
  );
  assert.ok(files.some((f) => f.file === resultsFileName(0, "test")));
  assert.ok(!files.some((f) => f.file === resultsFileName(1, "build")));
});

test("✧ PARITY — evidenceFiles follows check-loop-fresh.mjs check J's rule (its source)", () => {
  const src = readFileSync(join(HERE, "loop-fresh-core.mjs"), "utf8");
  assert.match(src, /\["out", "stdout_sha256"\]/);
  assert.match(src, /\["err", "stderr_sha256"\]/);
  assert.match(src, /onDisk !== \(run\[field\] \?\? null\)/);
  assert.match(src, /typeof run\.results_sha256 === "string"/);
});
