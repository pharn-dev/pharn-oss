// pharn/floor/entry-base-evidence-core.test.mjs — the pure rule deciding whether /pharn-regress takes its BASE evidence
// from this delivery run's ENTRY execution (6.49.0). Every ENTRY_BASE_MISSES row fires on its OWN one-input mutation of a
// world that otherwise HITs, with every binding re-computed after the mutation, so only that row can fire (L60). The
// inputs that must NOT flip a HIT are tested too, and the set of produced members is closed both ways (L36).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  decideEntryBase,
  derivedBaseStamp,
  buildOffer,
  validateOffer,
  mappedId,
  logPlan,
  entryEvidenceBlock,
  NO_FILES,
  EMPTY_SHA256,
} from "./entry-base-evidence-core.mjs";
import { ENTRY_BASE_MISSES } from "./stage-regress-core.mjs";
import { buildSnapshot } from "./pre-run-snapshot-core.mjs";
import { validateStamp, stampToMap, SCHEMA, ENTRY_BASE_TEST_ID } from "./gate-run-core.mjs";
import { ENTRY_ALGO, ALGO } from "./worktree-fingerprint.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
const FEATURE = "demo";
const BASE = "b".repeat(40);
const INIT = "1".repeat(64);
const NOW = 1_800_000_000_000;
const MARKER = Buffer.from('{"opened":"x"}\n');
const RUN = { command: "pharn-loop", markerSha256: sha(MARKER) };
const TESTS = ["src/a.test.js", "src/b.test.js"];
const npm = (id) => ["npm", "run", id];

function run(seq, id, extra = {}) {
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
    fp_before: INIT,
    fp_after: INIT,
    stdout_sha256: sha(`out ${id}`),
    stderr_sha256: sha(`err ${id}`),
    results_sha256: null,
    ...extra,
  };
}

/** A world that HITs: the head spec (test with outside files, typecheck, build; style skipped), the entry run (style
 *  first, the slot, verify's set, e2e last), an offer, an empty snapshot and one open loop marker. */
function world() {
  const headRuns = [run(0, "test", { files: [...TESTS] }), run(1, "typecheck"), run(2, "build")];
  return {
    feature: FEATURE,
    base: BASE,
    timeoutMs: 540000,
    installOverride: false,
    head: {
      schema: SCHEMA,
      stage: "regress",
      side: "head",
      feature: FEATURE,
      head: "c".repeat(40),
      source: "discover",
      source_raw: null,
      style_skipped: true,
      finalized: true,
      fingerprint: { algo: ALGO, init: "2".repeat(64), final: "2".repeat(64) },
      required: ["test", "typecheck", "build"],
      runs: headRuns,
      aux: { completeness: null },
    },
    entry: {
      schema: SCHEMA,
      stage: "entry",
      side: null,
      feature: FEATURE,
      head: BASE,
      source: "discover",
      source_raw: null,
      style_skipped: false,
      finalized: true,
      fingerprint: { algo: ENTRY_ALGO, init: INIT, final: INIT },
      required: ["lint", ENTRY_BASE_TEST_ID, "test", "typecheck", "build", "e2e"],
      runs: [
        run(0, "lint"),
        run(1, ENTRY_BASE_TEST_ID, { files: [...TESTS] }),
        run(2, "test"),
        run(3, "typecheck"),
        run(4, "build"),
        run(5, "e2e"),
      ],
      aux: { completeness: null },
    },
    offer: { timeoutMs: 540000, d0: "absent", feature: FEATURE, run: RUN, nonce: "a".repeat(32) },
    snapshot: { feature: FEATURE, run: RUN, base: BASE, paths: [] },
    markers: { "pharn-loop": { state: "ok", bytes: MARKER, mtimeMs: NOW }, "pharn-ship": { state: "absent" } },
    // overrides of the three reads (null = derive from the objects above)
    offerRead: null,
    snapshotRead: null,
    entryRead: null,
    bind: true, // the offer binds the entry bytes as serialized
  };
}

function inputs(w) {
  const entryBytes = Buffer.from(JSON.stringify(w.entry, null, 2));
  const offer = buildOffer({
    feature: w.offer.feature,
    run: w.offer.run,
    nonce: w.offer.nonce,
    base: w.entry.head ?? BASE,
    stampSha256: w.bind ? sha(entryBytes) : "e".repeat(64),
    timeoutMs: w.offer.timeoutMs,
    d0: w.offer.d0,
    featureDir: w.entry.runs.map((r) => ({ id: r.id, before: "absent", after: "absent" })),
  });
  if (w.offer.mutate) w.offer.mutate(offer);
  return {
    feature: w.feature,
    base: w.base,
    timeoutMs: w.timeoutMs,
    installOverride: w.installOverride,
    headRecord: w.head,
    markers: w.markers,
    now: NOW,
    offer: w.offerRead ?? { state: "ok", bytes: Buffer.from(JSON.stringify(offer)) },
    snapshot: w.snapshotRead ?? { state: "ok", bytes: Buffer.from(JSON.stringify(buildSnapshot(w.snapshot))) },
    entryStamp: w.entryRead ?? { state: "ok", bytes: entryBytes },
  };
}

function decide(mutate = () => {}) {
  const w = world();
  mutate(w);
  return decideEntryBase(inputs(w));
}

test("the control world HITs, and its decision has the closed progress shape", () => {
  const r = decide();
  assert.equal(r.decision.reused, true, JSON.stringify(r.decision));
  assert.equal(r.decision.miss, null);
  assert.match(r.decision.offerSha256, /^[0-9a-f]{64}$/);
  assert.match(r.decision.sourceStampSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(r.decision.run, RUN);
  assert.deepEqual(
    r.detail.mapping.map((m) => [m.id, m.kind, m.source ? m.source.id : null]),
    [
      ["test", "reused", ENTRY_BASE_TEST_ID],
      ["typecheck", "reused", "typecheck"],
      ["build", "reused", "build"],
    ]
  );
  assert.deepEqual(r.detail.ignored, ["lint", "test", "e2e"], "the verify-shaped test, the style gate and e2e are not evidence");
});

// ── every miss row, one mutation each (L60), in ENTRY_BASE_MISSES order ─────────────────────────────────────────
const SHIP_MARKER = Buffer.from("ship\n");
const CASES = [
  ["requirement-unknown", (w) => (w.head = null)],
  ["requirement-unknown", (w) => (w.head.side = "base")],
  ["no-delivery-run", (w) => (w.markers["pharn-loop"] = { state: "absent" })],
  ["no-delivery-run", (w) => (w.markers["pharn-ship"] = { state: "ok", bytes: SHIP_MARKER, mtimeMs: NOW })], // both open
  ["no-delivery-run", (w) => (w.markers["pharn-loop"].mtimeMs = NOW - 25 * 3600 * 1000)],
  ["install-override", (w) => (w.installOverride = true)],
  ["no-offer", (w) => (w.offerRead = { state: "absent" })],
  ["offer-malformed", (w) => (w.offerRead = { state: "unusable" })],
  ["offer-malformed", (w) => (w.offerRead = { state: "ok", bytes: Buffer.from("not json") })],
  ["offer-malformed", (w) => (w.offer.mutate = (o) => (o.extra = 1))],
  ["offer-malformed", (w) => (w.offer.mutate = (o) => (o.d0 = "maybe"))],
  ["other-run", (w) => (w.offer.feature = "other")],
  ["other-run", (w) => (w.offer.run = { command: "pharn-loop", markerSha256: sha("another run") })],
  ["other-run", (w) => (w.offer.run = { command: "pharn-ship", markerSha256: RUN.markerSha256 })],
  ["no-snapshot", (w) => (w.snapshotRead = { state: "absent" })],
  ["snapshot-malformed", (w) => (w.snapshotRead = { state: "unusable" })],
  ["snapshot-malformed", (w) => (w.snapshotRead = { state: "ok", bytes: Buffer.from("{}") })],
  ["snapshot-other-run", (w) => (w.snapshot.run = { command: "pharn-loop", markerSha256: sha("another run") })],
  ["snapshot-other-run", (w) => (w.snapshot.feature = "other")],
  ["start-not-base", (w) => (w.snapshot.base = "d".repeat(40))],
  ["start-not-base", (w) => (w.base = "d".repeat(40))],
  ["start-not-base", (w) => (w.offer.mutate = (o) => (o.base = "d".repeat(40)))],
  ["start-dirty", (w) => (w.snapshot.paths = [["src/user-edit.js", sha("x")]])],
  ["start-dirty", (w) => (w.snapshot.paths = [["pharn/features/other/SPEC.md", sha("x")]])],
  ["start-dirty", (w) => (w.snapshot.paths = [["pharn/features/demo-2/SPEC.md", sha("x")]])], // a prefix-sharing name
  ["source-missing", (w) => (w.entryRead = { state: "absent" })],
  ["source-unusable", (w) => (w.entryRead = { state: "unusable" })],
  [
    "source-unusable",
    (w) => {
      const junk = Buffer.from("not json");
      w.entryRead = { state: "ok", bytes: junk };
      w.offer.mutate = (o) => (o.stamp_sha256 = sha(junk));
    },
  ],
  ["source-unbound", (w) => (w.bind = false)],
  ["source-invalid", (w) => (w.entry.stage = "verify")],
  ["source-invalid", (w) => (w.entry.feature = "other")],
  ["source-invalid", (w) => (w.entry.finalized = false)],
  ["source-invalid", (w) => (w.entry.fingerprint.algo = ALGO)],
  [
    "source-invalid",
    (w) => {
      // the entry stamp's head is not the offer's base (the snapshot, the offer and regress all agree on BASE)
      w.entry.head = "d".repeat(40);
      w.offer.mutate = (o) => (o.base = BASE);
    },
  ],
  ["timeout-incompatible", (w) => (w.offer.timeoutMs = 600000)],
  [
    "structural-gate",
    (w) => {
      w.head.runs.push(run(3, "structural:cap/evals/expected/a.json", { argv: ["node", "x"] }));
      w.head.required = w.head.runs.map((r) => r.id);
    },
  ],
  ["gate-missing", (w) => dropEntryRun(w, "typecheck")], // e.g. excluded at entry, required now
  ["gate-missing", (w) => dropEntryRun(w, ENTRY_BASE_TEST_ID)], // a pre-6.49.0 entry stamp, or no slot was added
  ["shape-mismatch", (w) => (w.head.runs[1].argv = ["npm", "run", "typecheck", "--strict"])],
  ["shape-mismatch", (w) => Object.assign(w.head.runs[1], { argv: null, shell: "npm run typecheck" })],
  ["shape-mismatch", (w) => (w.head.runs[0].files = [...TESTS, "src/c.test.js"])],
  ["shape-mismatch", (w) => (w.head.runs[0].files = [...TESTS].reverse())],
  ["shape-mismatch", (w) => (w.head.source = "explicit")],
  ["not-completed", (w) => Object.assign(w.entry.runs[3], { timed_out: true, exit: 124 })],
  ["not-completed", (w) => (w.entry.runs[3].exit = 127)],
  ["not-completed", (w) => (w.entry.runs[3].exit = 137)],
  [
    "style-unattributed",
    (w) => {
      // regress requires lint (a style config was touched), and the start digest is not `absent` (a /pharn-ship SPEC).
      w.head.runs.splice(1, 0, run(1, "lint"));
      w.head.runs = reseq(w.head.runs);
      w.head.required = w.head.runs.map((r) => r.id);
      w.head.style_skipped = false;
      w.offer.d0 = `sha256:${"9".repeat(64)}`;
    },
  ],
  [
    "style-unattributed",
    (w) => {
      w.head.runs.splice(1, 0, run(1, "lint"));
      w.head.runs = reseq(w.head.runs);
      w.head.required = w.head.runs.map((r) => r.id);
      w.head.style_skipped = false;
      w.offer.mutate = (o) => (o.feature_dir = o.feature_dir.filter((x) => x.id !== "lint"));
    },
  ],
  ["mutated-prefix", (w) => mutateRun(w, 0)], // an entry-only style gate before the mapped runs
  ["mutated-prefix", (w) => mutateRun(w, 2)], // the verify-shaped test, between mapped runs
  ["mutated-prefix", (w) => mutateRun(w, 4)], // the LAST mapped run itself (grill G2: own write or concurrent?)
  [
    "mutated-prefix",
    // nothing is flagged mutated and the chain holds from init, but an unflagged run moved the tree, so the later mapped
    // runs did not judge the stamp's init
    (w) => {
      const MOVED = "7".repeat(64);
      w.entry.runs = w.entry.runs.map((r, k) =>
        k < 2 ? r : k === 2 ? { ...r, fp_after: MOVED } : { ...r, fp_before: MOVED, fp_after: MOVED }
      );
      w.entry.fingerprint.final = MOVED;
    },
  ],
  [
    "source-invalid",
    // nothing is flagged mutated and the chain holds, but no run judged the stamp's init: validateStamp refuses it
    // (tree-changed-between-gates, the init→first-gate link — grill G6's gap, closed there by audit P3-J)
    (w) => (w.entry.runs = w.entry.runs.map((r) => ({ ...r, fp_before: "7".repeat(64), fp_after: "7".repeat(64) }))),
  ],
  [
    "nothing-mapped",
    (w) => {
      w.head.runs = [run(0, "test", { files: [] })];
      w.head.required = ["test"];
    },
  ],
];

function dropEntryRun(w, id) {
  w.entry.runs = reseq(w.entry.runs.filter((r) => r.id !== id));
  w.entry.required = w.entry.required.filter((x) => x !== id);
}

function reseq(runs) {
  return runs.map((r, i) => ({ ...r, seq: i }));
}

/** Run `i` of the entry moved the tree, with the fingerprint chain kept consistent so validateStamp still accepts it. */
function mutateRun(w, i) {
  const MOVED = "8".repeat(64);
  w.entry.runs = w.entry.runs.map((r, k) => {
    if (k < i) return r;
    if (k === i) return { ...r, mutated: true, fp_after: MOVED };
    return { ...r, fp_before: MOVED, fp_after: MOVED };
  });
  w.entry.fingerprint.final = MOVED;
}

for (const [want, mutate] of CASES) {
  test(`MISS ${want} — ${mutate.toString().slice(0, 110)}`, () => {
    const r = decide(mutate);
    assert.equal(r.decision.reused, false);
    assert.equal(r.decision.miss, want, JSON.stringify(r.decision));
    assert.equal(r.detail, null);
    assert.equal(r.decision.offerSha256, null);
    assert.equal(r.decision.sourceStampSha256, null);
  });
}

test("closure, both ways (L36): every member but log-unverified is produced above, the core returns no other literal, and log-unverified is the I/O half's", () => {
  const produced = new Set(CASES.map(([m]) => m));
  for (const m of ENTRY_BASE_MISSES) {
    if (m === "log-unverified") continue; // returned by entry-base-evidence.mjs materializeEntryBase (its own suite)
    assert.ok(produced.has(m), `${m} has no case here`);
  }
  for (const m of produced) assert.ok(ENTRY_BASE_MISSES.includes(m), `${m} is not a member`);
  assert.ok(!produced.has("log-unverified"), "the pure core never decides on log bytes");
});

// ── what must NOT flip a HIT ───────────────────────────────────────────────────────────────────────────────────
const IRRELEVANT = [
  ["a mutating e2e after the last mapped run", (w) => mutateRun(w, 5)],
  ["a completed RED mapped run (exit 1)", (w) => (w.entry.runs[3].exit = 1)],
  ["a larger regress timeout than entry's", (w) => (w.timeoutMs = 600000)],
  [
    "the run's own feature directory in the snapshot (/pharn-ship's SPEC.md)",
    (w) => (w.snapshot.paths = [["pharn/features/demo/SPEC.md", sha("s")]]),
  ],
  [
    "a /pharn-ship run",
    (w) => {
      w.markers = { "pharn-loop": { state: "absent" }, "pharn-ship": { state: "ok", bytes: SHIP_MARKER, mtimeMs: NOW } };
      const ship = { command: "pharn-ship", markerSha256: sha(SHIP_MARKER) };
      w.offer.run = ship;
      w.snapshot.run = ship;
    },
  ],
  [
    "a red verify-shaped test and red base:test (still completed)",
    (w) => {
      w.entry.runs[1].exit = 1;
      w.entry.runs[2].exit = 1;
    },
  ],
  [
    "a required style gate whose feature directory stayed absent",
    (w) => {
      w.head.runs.splice(1, 0, run(1, "lint"));
      w.head.runs = reseq(w.head.runs);
      w.head.required = w.head.runs.map((r) => r.id);
      w.head.style_skipped = false;
    },
  ],
  ["a regress no-files test slot beside mapped gates", (w) => (w.head.runs[0].files = [])],
];
for (const [name, mutate] of IRRELEVANT) {
  test(`HIT despite ${name}`, () => {
    const r = decide(mutate);
    assert.equal(r.decision.reused, true, JSON.stringify(r.decision));
  });
}

test("the slot map: test with files → the base:test slot; test without → no-files; any other id → itself", () => {
  assert.equal(mappedId({ id: "test", files: ["a.test.js"] }), ENTRY_BASE_TEST_ID);
  assert.equal(mappedId({ id: "test", files: [] }), NO_FILES);
  assert.equal(mappedId({ id: "build", files: [] }), "build");
});

// ── the derived stamp ──────────────────────────────────────────────────────────────────────────────────────────
function hit(mutate = () => {}) {
  const w = world();
  mutate(w);
  const r = decideEntryBase(inputs(w));
  assert.equal(r.decision.reused, true, JSON.stringify(r.decision));
  return { r, stamp: derivedBaseStamp({ feature: FEATURE, base: BASE, detail: r.detail, entryStampSha256: r.decision.sourceStampSha256 }) };
}

test("derived stamp: a regress/base stamp that validates, keeps the RED exit, names the entry source per run, and spawned nothing", () => {
  const { r, stamp } = hit((w) => (w.entry.runs[3].exit = 1));
  assert.deepEqual(validateStamp(stamp, { stage: "regress", side: "base", feature: FEATURE }), { ok: true });
  assert.deepEqual(stampToMap(stamp), { test: 0, typecheck: 1, build: 0 }, "the completed RED stays RED");
  assert.equal(stamp.head, BASE);
  assert.equal(stamp.fingerprint.algo, ENTRY_ALGO, "the derivation is visible in the stamp itself");
  assert.deepEqual(stamp.required, ["test", "typecheck", "build"]);
  for (const x of stamp.runs) {
    assert.equal(x.ran, false, "this regress invocation spawned nothing");
    assert.equal(x.reason, "reused");
    assert.equal(x.reused.stage, "entry");
    assert.equal(x.reused.side, null);
    assert.equal(x.reused.stamp_sha256, r.decision.sourceStampSha256);
  }
  assert.deepEqual(
    stamp.runs.map((x) => x.reused.seq),
    [1, 3, 4],
    "each run names its entry sequence (the slot for test)"
  );
});

test("derived stamp: a no-files slot is exactly run-gates' no-files record — empty logs, init fingerprints (grill G4)", () => {
  const { r, stamp } = hit((w) => (w.head.runs[0].files = []));
  assert.deepEqual(validateStamp(stamp, { stage: "regress", side: "base", feature: FEATURE }), { ok: true });
  const t = stamp.runs[0];
  assert.deepEqual(
    [t.id, t.ran, t.reason, t.exit, t.stdout_sha256, t.stderr_sha256],
    ["test", false, "no-files", 0, EMPTY_SHA256, EMPTY_SHA256]
  );
  assert.equal(t.fp_before, INIT);
  const plan = logPlan(r.detail);
  assert.deepEqual(
    plan.filter((p) => p.from === null).map((p) => p.to),
    ["0-test.out", "0-test.err"],
    "the empty logs are written, so check J finds them"
  );
  assert.deepEqual(
    plan.find((p) => p.to === "1-typecheck.out"),
    { from: "3-typecheck.out", to: "1-typecheck.out", sha256: sha("out typecheck") }
  );
});

test("derived stamp: validateStamp refuses each forged derivation as stamp-malformed (L60: one mutation per rule)", () => {
  const forgeries = [
    [
      "a run this invocation spawned mixed in",
      (s) => Object.assign(s.runs[1], { ran: true, reason: null, reused: undefined }) && delete s.runs[1].reused,
    ],
    ["two source stamps", (s) => (s.runs[1].reused.stamp_sha256 = "f".repeat(64))],
    ["another source stage", (s) => (s.runs[1].reused.stage = "regress")],
    ["a source side", (s) => (s.runs[1].reused.side = "head")],
    ["an identity of its own", (s) => (s.runs[1].identity_sha256 = "a".repeat(64))],
    ["a results digest", (s) => (s.runs[1].results_sha256 = "a".repeat(64))],
    ["a mutated slot", (s) => (s.runs[1].mutated = true)],
    ["a non-allowlisted id", (s) => (s.runs[1].id = "structural:x")],
    ["a spawn-failure exit", (s) => (s.runs[1].exit = 127)],
  ];
  for (const [name, forge] of forgeries) {
    const { stamp } = hit();
    forge(stamp);
    assert.equal(validateStamp(stamp).reason_code, "stamp-malformed", name);
  }
  const { stamp } = hit();
  assert.equal(validateStamp({ ...stamp, side: "head" }).reason_code, "stamp-malformed", "regress/head is off the matrix");
  assert.equal(validateStamp({ ...stamp, stage: "entry", side: null }).reason_code, "stamp-malformed", "entry is off the matrix");
  assert.equal(validateStamp(stamp).ok, true, "control: the unforged stamp validates");
});

test("the report's entry block carries only booleans, enum members, digests and ids", () => {
  const { r } = hit((w) => (w.head.runs[0].files = []));
  const b = entryEvidenceBlock(r.decision, r.detail, BASE);
  assert.deepEqual(b, {
    used: true,
    miss: null,
    offer_sha256: r.decision.offerSha256,
    entry_stamp_sha256: r.decision.sourceStampSha256,
    base: BASE,
    run: { command: "pharn-loop", marker_sha256: RUN.markerSha256 },
    reused_ids: ["typecheck", "build"],
    no_files_ids: ["test"],
    ignored_ids: ["lint", ENTRY_BASE_TEST_ID, "test", "e2e"],
  });
  const miss = decide((w) => (w.installOverride = true)).decision;
  assert.deepEqual(entryEvidenceBlock(miss), {
    used: false,
    miss: "install-override",
    offer_sha256: null,
    entry_stamp_sha256: null,
    base: null,
    run: { command: "pharn-loop", marker_sha256: RUN.markerSha256 },
    reused_ids: [],
    no_files_ids: [],
    ignored_ids: [],
  });
});

test("validateOffer is closed both ways", () => {
  const good = buildOffer({
    feature: FEATURE,
    run: RUN,
    nonce: "a".repeat(32),
    base: BASE,
    stampSha256: "e".repeat(64),
    timeoutMs: 540000,
    d0: "absent",
    featureDir: [{ id: "lint", before: "absent", after: "absent" }],
  });
  assert.equal(validateOffer(good), true);
  const bad = [
    { ...good, extra: 1 },
    { ...good, schema: "pharn-entry-base-offer/2" },
    { ...good, run: { ...good.run, command: "pharn-review" } },
    { ...good, nonce: "x" },
    { ...good, base: "HEAD" },
    { ...good, timeout_ms: 5 },
    { ...good, feature_dir: [{ id: "lint", before: "absent" }] },
    { ...good, feature_dir: [good.feature_dir[0], good.feature_dir[0]] },
  ];
  for (const o of bad) assert.equal(validateOffer(o), false, JSON.stringify(o));
});

test("TOTAL (L62): hostile parsed JSON in every input never throws", () => {
  const hostile = { toString: 1 };
  assert.throws(() => String(hostile), "control: the value really makes String() throw");
  const muts = [
    (w) => (w.head.runs[0].files = hostile),
    (w) => (w.head.runs = [hostile]),
    (w) => (w.head.required = hostile),
    (w) => (w.entry.runs[3].argv = hostile),
    (w) => (w.offerRead = { state: "ok", bytes: Buffer.from(JSON.stringify({ ...hostile, schema: hostile })) }),
    (w) => (w.snapshotRead = { state: "ok", bytes: Buffer.from(JSON.stringify([hostile])) }),
    (w) => (w.entryRead = { state: "ok", bytes: Buffer.from(JSON.stringify({ runs: [hostile] })) }),
    (w) => (w.markers = hostile),
  ];
  for (const m of muts) {
    const r = decide(m);
    assert.equal(typeof r.decision.reused, "boolean");
  }
});
