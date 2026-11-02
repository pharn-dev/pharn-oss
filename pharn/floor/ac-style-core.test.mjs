// pharn/floor/ac-style-core.test.mjs — the pure rules of /pharn-test's style check: the gate set, the record shape and
// every row of the verdict table (ac-style-core.mjs, header). Each verdict row has one case that reaches it, and the
// closing test asserts every row was reached (L52 — a remedy quantified over a set owes the set).

import { test } from "node:test";
import assert from "node:assert/strict";
import { STYLE_SET } from "./gate-run-core.mjs";
import { EXIT, SCHEMA, logStem, makeRecord, measured, recordError, styleGates, styleVerdict, verdictLines } from "./ac-style-core.mjs";

const rec = (phase, gates, testsExisted = false, feature = "demo") =>
  makeRecord({ phase, feature, testsExisted, runs: gates.map(([id, exit, timed_out = false]) => ({ id, exit, timed_out })) });
const logOf = (id) => `LOG(${id})`;
const REACHED = new Set();

test("styleGates — STYLE_SET ∩ scripts minus the exclusion, in STYLE_SET order; nothing else, never a prototype key", () => {
  const scripts = { "lint:md": "x", test: "x", build: "x", "format:check": "x", lint: "x" };
  assert.deepEqual(
    styleGates(scripts).map((e) => e.id),
    ["lint", "format:check", "lint:md"]
  );
  assert.deepEqual(
    styleGates(scripts, ["format:check"]).map((e) => e.id),
    ["lint", "lint:md"]
  );
  assert.deepEqual(styleGates(scripts)[0].argv, ["npm", "run", "lint"]);
  assert.deepEqual(styleGates({ test: "x" }), []);
  assert.deepEqual(styleGates(null), []);
  assert.deepEqual(styleGates(Object.create({ lint: "inherited" })), [], "an inherited key is not a script (L15)");
  assert.deepEqual(STYLE_SET, ["lint", "format:check", "lint:md"], "the set this module ranges over");
});

test("logStem — a file-name-safe stem per phase and gate, distinct for every style gate", () => {
  assert.equal(logStem("after", "format:check"), "after-format-check");
  const stems = STYLE_SET.flatMap((id) => ["before", "after"].map((p) => logStem(p, id)));
  assert.equal(new Set(stems).size, stems.length);
});

test("measured — timed out or could-not-start (126/127) is not measured; a signal exit is", () => {
  assert.equal(measured({ exit: 0, timed_out: false }), true);
  assert.equal(measured({ exit: 1, timed_out: false }), true);
  assert.equal(measured({ exit: 143, timed_out: false }), true);
  assert.equal(measured({ exit: 124, timed_out: true }), false);
  assert.equal(measured({ exit: 127, timed_out: false }), false);
  assert.equal(measured({ exit: 126, timed_out: false }), false);
});

test("recordError — accepts its own records and refuses every malformed shape", () => {
  const ok = rec("before", [
    ["lint", 0],
    ["format:check", 0],
  ]);
  assert.equal(recordError(ok, { phase: "before", feature: "demo" }), null);
  assert.equal(recordError(JSON.parse(JSON.stringify(ok)), { phase: "before", feature: "demo" }), null);
  const bad = [
    [null, /not a JSON object/],
    [[], /not a JSON object/],
    [{ ...ok, extra: 1 }, /unknown key "extra"/],
    [Object.fromEntries(Object.entries(ok).filter(([k]) => k !== "gates")), /has no `gates`/],
    [{ ...ok, schema: "ac-style/0" }, /schema/],
    [{ ...ok, phase: "after" }, /"after" record/],
    [{ ...ok, feature: "other" }, /feature "other"/],
    [{ ...ok, tests_existed: "no" }, /tests_existed/],
    [{ ...ok, gates: {} }, /non-array/],
    [{ ...ok, gates: [1] }, /not an object/],
    [{ ...ok, gates: [{ id: "lint", exit: 0, timed_out: false, x: 1 }] }, /unknown key "x"/],
    [{ ...ok, gates: [{ id: "test", exit: 0, timed_out: false }] }, /not a style gate/],
    [
      {
        ...ok,
        gates: [
          { id: "format:check", exit: 0, timed_out: false },
          { id: "lint", exit: 0, timed_out: false },
        ],
      },
      /order/,
    ],
    [
      {
        ...ok,
        gates: [
          { id: "lint", exit: 0, timed_out: false },
          { id: "lint", exit: 0, timed_out: false },
        ],
      },
      /twice/,
    ],
    [{ ...ok, gates: [{ id: "lint", exit: "0", timed_out: false }] }, /non-integer exit/],
    [{ ...ok, gates: [{ id: "lint", exit: 0, timed_out: 0 }] }, /timed_out/],
  ];
  for (const [r, re] of bad) assert.match(recordError(r, { phase: "before", feature: "demo" }) ?? "null", re, JSON.stringify(r));
  assert.equal(SCHEMA, "ac-style/1");
});

test("L62 — a hostile value quoted into a refusal never throws", () => {
  const hostile = { toString: 1 };
  const r = { schema: SCHEMA, phase: "before", feature: hostile, tests_existed: false, gates: [] };
  assert.match(recordError(r, { phase: "before", feature: "demo" }), /\[object Object\]/);
  assert.match(
    recordError({ ...r, feature: "demo", gates: [{ id: hostile, exit: 0, timed_out: false }] }, { phase: "before", feature: "demo" }),
    /not a style gate/
  );
});

test("row 1 — after exit 0 everywhere → GREEN, no lines but the GREEN line", () => {
  const v = styleVerdict(rec("before", [["format:check", 0]]), rec("after", [["format:check", 0]]));
  assert.equal(v.status, "green");
  assert.deepEqual(verdictLines(v, logOf), ["GREEN — no style gate went from passing to failing while the AC tests were written"]);
  REACHED.add("clean");
});

test("row 2 — before 0, after non-zero → RED flipped, naming the gate and its log", () => {
  const v = styleVerdict(
    rec("before", [
      ["lint", 0],
      ["format:check", 0],
    ]),
    rec("after", [
      ["lint", 0],
      ["format:check", 1],
    ])
  );
  assert.equal(v.status, "red");
  assert.deepEqual(v.red, [{ id: "format:check", cause: "flipped", before: 0, after: 1 }]);
  const lines = verdictLines(v, logOf);
  assert.match(
    lines[0],
    /^RED — ac-tests-unformatted: format:check — exit 0 before the tests were written, exit 1 after; log: LOG\(format:check\)$/
  );
  assert.match(lines.at(-1), /^RED — 1 style gate\(s\) newly failing/);
  REACHED.add("flipped");
});

test("row 3 — red before, red after, no mapped test file before → NOTE, GREEN (not attributed)", () => {
  const v = styleVerdict(rec("before", [["lint:md", 1]], false), rec("after", [["lint:md", 1]], true));
  assert.equal(v.status, "green");
  assert.equal(v.notes[0].kind, "red-before");
  const lines = verdictLines(v, logOf);
  assert.match(lines[0], /^NOTE — lint:md was already red before the tests were written \(exit 1, exit 1 after\)/);
  assert.match(lines.at(-1), /^GREEN — /);
  REACHED.add("red-before");
});

test("row 3b — NOT MEASURED before, red after, no tests before → NOTE naming 'not measured'", () => {
  const v = styleVerdict(rec("before", [["lint", 124, true]], false), rec("after", [["lint", 1]]));
  assert.equal(v.status, "green");
  assert.match(verdictLines(v, logOf)[0], /already red before the tests were written \(not measured, exit 1 after\)/);
});

test("row 4 — red before, red after, a mapped test file ALREADY existed → RED tests-existed (fail-closed, #409's re-run)", () => {
  const v = styleVerdict(rec("before", [["format:check", 1]], true), rec("after", [["format:check", 1]], true));
  assert.equal(v.status, "red");
  assert.equal(v.red[0].cause, "tests-existed");
  assert.match(
    verdictLines(v, logOf)[0],
    /^RED — ac-tests-unformatted: format:check — exit 1 before and 1 after, and a mapped test file already existed/
  );
  REACHED.add("tests-existed");
});

test("row 4b — NOT MEASURED before, red after, tests existed → RED tests-existed", () => {
  const v = styleVerdict(rec("before", [["lint", 127]], true), rec("after", [["lint", 2]], true));
  assert.equal(v.red[0].cause, "tests-existed");
});

test("row 5 — after NOT MEASURED (timed out or could not start) → NOTE, never RED, whatever before was", () => {
  for (const [exit, timed, cause] of [
    [124, true, "timed-out"],
    [127, false, "not-started"],
    [126, false, "not-started"],
  ]) {
    const v = styleVerdict(rec("before", [["lint", 0]], true), rec("after", [["lint", exit, timed]]));
    assert.equal(v.status, "green");
    assert.deepEqual(v.notes[0], { id: "lint", kind: "not-measured", cause, after: exit });
    assert.match(verdictLines(v, logOf)[0], new RegExp(`^NOTE — lint was not measured after the tests were written \\(${cause}\\)`));
  }
  REACHED.add("not-measured");
});

test("row 6 — the EMPTY set is GREEN on its own explicit line, never a silent pass (L34)", () => {
  const v = styleVerdict(rec("before", []), rec("after", []));
  assert.equal(v.status, "green");
  assert.equal(v.empty, true);
  assert.deepEqual(verdictLines(v, logOf), ["GREEN — no style gate (lint, format:check, lint:md) is discovered here; nothing to compare"]);
  REACHED.add("empty");
});

test("row 7 — a different gate set between the runs is UNUSABLE, never a verdict", () => {
  const v = styleVerdict(rec("before", [["lint", 0]]), rec("after", [["format:check", 1]]));
  assert.equal(v.status, "unusable");
  assert.match(v.reason, /before: lint; after: format:check/);
  REACHED.add("set-mismatch");
});

test("a signal exit the runner did not time out is a MEASURED red (a flip when before was 0)", () => {
  const v = styleVerdict(rec("before", [["lint", 0]]), rec("after", [["lint", 137]]));
  assert.equal(v.red[0].cause, "flipped");
});

test("several gates: each judged on its own row; any RED makes the status red", () => {
  const v = styleVerdict(
    rec("before", [
      ["lint", 0],
      ["format:check", 1],
      ["lint:md", 0],
    ]),
    rec("after", [
      ["lint", 124, true],
      ["format:check", 1],
      ["lint:md", 1],
    ])
  );
  assert.equal(v.status, "red");
  assert.deepEqual(
    v.red.map((r) => r.id),
    ["lint:md"]
  );
  assert.deepEqual(
    v.notes.map((n) => [n.id, n.kind]),
    [
      ["lint", "not-measured"],
      ["format:check", "red-before"],
    ]
  );
});

test("EXIT — the exit table both modes share", () => {
  assert.deepEqual(EXIT, { green: 0, red: 1, unusable: 2 });
});

test("closure (L52) — every verdict row above was reached", () => {
  assert.deepEqual([...REACHED].sort(), ["clean", "empty", "flipped", "not-measured", "red-before", "set-mismatch", "tests-existed"]);
});
