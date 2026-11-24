// pharn/floor/ac-types-core.test.mjs — the pure rules of /pharn-test's typecheck check: the gate set, the tsc line parser
// over the MEASURED fixtures (tsc 6.0.3, pharn/floor/test-fixtures/typecheck/), every exempt code (L29), the verdict rows
// and the printed lines.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOWLIST } from "./gate-run-core.mjs";
import {
  EXIT,
  MAX_RED_LINES,
  MISSING_TARGET_CODES,
  TYPE_SET,
  logStem,
  mappedFileOf,
  parseTscLines,
  typeGates,
  typesVerdict,
  verdictLines,
} from "./ac-types-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = (n) => readFileSync(join(HERE, "test-fixtures", "typecheck", n), "utf8");
const ROOT = "/project";
const MAPPED = ["src/__tests__/a.test.ts"];
const MEASURED = [
  { path: "src/__tests__/a.test.ts", line: 2, col: 42, code: "TS2307" },
  { path: "src/__tests__/a.test.ts", line: 4, col: 18, code: "TS2554" },
  { path: "src/__tests__/a.test.ts", line: 5, col: 9, code: "TS2741" },
  { path: "src/__tests__/a.test.ts", line: 6, col: 7, code: "TS2339" },
  { path: "src/__tests__/a.test.ts", line: 7, col: 11, code: "TS2339" },
  { path: "src/lib.ts", line: 3, col: 14, code: "TS2322" },
];
const logOf = (id) => `LOG(${id})`;
const red = (diagnostics, exit = 2) => [{ id: "typecheck", exit, timed_out: false, diagnostics }];

test("TYPE_SET members are gate-run-core ALLOWLIST members, in ALLOWLIST order", () => {
  for (const id of TYPE_SET) assert.ok(ALLOWLIST.includes(id), id);
  assert.deepEqual(
    TYPE_SET,
    ALLOWLIST.filter((id) => TYPE_SET.includes(id))
  );
});

test("typeGates — TYPE_SET ∩ scripts − exclude, as `npm run <id>` entries; nothing for a non-object", () => {
  const ids = (s, ex) => typeGates(s, ex).map((g) => g.id);
  assert.deepEqual(ids({ "type-check": "x", typecheck: "y", lint: "z" }), ["typecheck", "type-check"]);
  assert.deepEqual(ids({ typecheck: "y" }, ["typecheck"]), []);
  assert.deepEqual(ids(null), []);
  assert.deepEqual(ids({ lint: "z" }), []);
  assert.equal(logStem("type-check"), "type-check");
  assert.equal(logStem("a:b"), "a-b");
});

test("parseTscLines — the measured plain output yields exactly the six diagnostics", () => {
  assert.deepEqual(parseTscLines(FIX("tsc-plain.out")), MEASURED);
});

test("parseTscLines — the measured pretty output (ANSI, related-information lines, summary) yields the same six", () => {
  assert.deepEqual(parseTscLines(FIX("tsc-pretty.out")), MEASURED);
});

test("a runner-prefixed line parses with the prefix in its path, so it never resolves to a mapped file (not attributed)", () => {
  const d = parseTscLines("web:typecheck: src/__tests__/a.test.ts(5,9): error TS2741: x\n");
  assert.equal(d.length, 1);
  assert.equal(mappedFileOf(d[0].path, MAPPED, ROOT), null);
});

test("parseTscLines — only line-start forms; indented, warning-shaped and malformed lines are not diagnostics", () => {
  const text = [
    "  src/lib.ts:2:21", // pretty related information
    "src/a.ts(1,2): warning TS6133: x",
    "src/a.ts(x,2): error TS2741: x",
    "Found 6 errors in 2 files.",
    "src/my dir/a b.ts(3,4): error TS1005: ';' expected.\r",
    "/abs/x.ts:9:1 - error TS2741: x",
  ].join("\n");
  assert.deepEqual(parseTscLines(text), [
    { path: "src/my dir/a b.ts", line: 3, col: 4, code: "TS1005" },
    { path: "/abs/x.ts", line: 9, col: 1, code: "TS2741" },
  ]);
});

test("parseTscLines — linear on a long hostile line (no catastrophic backtracking)", () => {
  const t0 = Date.now();
  parseTscLines(`a${" (1,".repeat(50000)}`);
  parseTscLines(`a${":1:1 -".repeat(50000)}`);
  assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0} ms`);
});

test("mappedFileOf — relative, ./-prefixed, absolute and case-different paths resolve to the mapped spelling; others null", () => {
  assert.equal(mappedFileOf("src/__tests__/a.test.ts", MAPPED, ROOT), MAPPED[0]);
  assert.equal(mappedFileOf("./src/__tests__/a.test.ts", MAPPED, ROOT), MAPPED[0]);
  assert.equal(mappedFileOf("/project/src/__tests__/a.test.ts", MAPPED, ROOT), MAPPED[0]);
  assert.equal(mappedFileOf("SRC/__tests__/A.test.ts", MAPPED, ROOT), MAPPED[0], "folded: errs toward refusing");
  assert.equal(mappedFileOf("src/lib.ts", MAPPED, ROOT), null);
  assert.equal(mappedFileOf("/elsewhere/src/__tests__/a.test.ts", MAPPED, ROOT), null);
});

test("typesVerdict — the measured shape: RED on exactly TS2741; the four exempt ones and the outside file are NOTEs", () => {
  const v = typesVerdict(red(MEASURED), MAPPED, ROOT);
  assert.equal(v.status, "red");
  assert.deepEqual(
    v.red.map((d) => `${d.file}(${d.line},${d.col}) ${d.code}`),
    ["src/__tests__/a.test.ts(5,9) TS2741"]
  );
  assert.deepEqual(
    v.notes.map((n) => n.kind),
    ["missing-target", "elsewhere"]
  );
  assert.equal(v.notes[0].diagnostics.length, 4);
  assert.equal(v.notes[1].count, 1);
});

test("L29 — EVERY MISSING_TARGET_CODES member located in a mapped file is a NOTE, never a RED", () => {
  assert.equal(new Set(MISSING_TARGET_CODES).size, MISSING_TARGET_CODES.length, "no duplicates");
  for (const code of MISSING_TARGET_CODES) {
    assert.match(code, /^TS\d+$/);
    const v = typesVerdict(red([{ path: MAPPED[0], line: 1, col: 1, code }]), MAPPED, ROOT);
    assert.equal(v.status, "green", code);
    assert.equal(v.notes[0].kind, "missing-target", code);
  }
});

test("assignability codes are OUTSIDE the set — a legitimate test that passes a value only the built target accepts IS refused (the stated bound)", () => {
  for (const code of ["TS2322", "TS2345", "TS2741", "TS2739", "TS1005"]) {
    assert.equal(MISSING_TARGET_CODES.includes(code), false, code);
    assert.equal(typesVerdict(red([{ path: MAPPED[0], line: 1, col: 1, code }]), MAPPED, ROOT).status, "red", code);
  }
});

test("typesVerdict — exit 0 is nothing (diagnostics ignored); not measured is a NOTE; a red gate with no diagnostic is a NOTE", () => {
  assert.deepEqual(typesVerdict(red(MEASURED, 0), MAPPED, ROOT), { status: "green", empty: false, red: [], notes: [] });
  for (const [exit, timed_out, cause] of [
    [143, true, "timed-out"],
    [127, false, "not-started"],
    [126, false, "not-started"],
  ]) {
    const v = typesVerdict([{ id: "typecheck", exit, timed_out, diagnostics: MEASURED }], MAPPED, ROOT);
    assert.equal(v.status, "green");
    assert.deepEqual(v.notes, [{ id: "typecheck", kind: "not-measured", cause }]);
  }
  const u = typesVerdict(red([]), MAPPED, ROOT);
  assert.equal(u.status, "green");
  assert.deepEqual(u.notes, [{ id: "typecheck", kind: "unparsed", exit: 2 }]);
  assert.deepEqual(typesVerdict([], MAPPED, ROOT), { status: "green", empty: true, red: [], notes: [] });
});

test("verdictLines — every row's line, the empty-set line, and the cap", () => {
  const lines = verdictLines(typesVerdict(red(MEASURED), MAPPED, ROOT), logOf);
  assert.deepEqual(lines, [
    'RED — ac-tests-typecheck: typecheck — "src/__tests__/a.test.ts"(5,9) TS2741 in a mapped AC test file; log: LOG(typecheck)',
    'NOTE — typecheck: "src/__tests__/a.test.ts"(2,42) TS2307, "src/__tests__/a.test.ts"(4,18) TS2554, "src/__tests__/a.test.ts"(6,7) TS2339, "src/__tests__/a.test.ts"(7,11) TS2339 — missing-target codes, expected before the build; not refused here, the build must resolve them and /pharn-verify measures typecheck again',
    "NOTE — typecheck exit 2: 1 diagnostic(s) outside the AC test files; not attributed to them; log: LOG(typecheck)",
    "RED — 1 type error(s) located in the AC test files: do not pin them",
  ]);
  assert.deepEqual(verdictLines(typesVerdict([], MAPPED, ROOT), logOf), [
    "GREEN — no typecheck gate (typecheck, type-check) is discovered here; nothing to check",
  ]);
  assert.match(
    verdictLines(typesVerdict([{ id: "typecheck", exit: 143, timed_out: true, diagnostics: [] }], MAPPED, ROOT), logOf)[0],
    /^NOTE — typecheck was not measured \(timed-out\); not judged here — a type error in the AC tests may still reach the post-build gates$/
  );
  assert.match(verdictLines(typesVerdict(red([]), MAPPED, ROOT), logOf)[0], /^NOTE — typecheck exit 2 with no line in tsc's format/);
  const many = Array.from({ length: MAX_RED_LINES + 3 }, (_, i) => ({ path: MAPPED[0], line: i + 1, col: 1, code: "TS2741" }));
  const capped = verdictLines(typesVerdict(red(many), MAPPED, ROOT), logOf);
  assert.equal(capped.filter((l) => /^RED — ac-tests-typecheck: typecheck — /.test(l)).length, MAX_RED_LINES);
  assert.ok(capped.includes("RED — ac-tests-typecheck: and 3 more; read the logs"));
  assert.deepEqual(EXIT, { green: 0, red: 1, unusable: 2 });
});

test("L62 — a hostile mapped path is quoted through shown(), never raw", () => {
  const evil = 'x"\nRED — forged';
  const v = typesVerdict(red([{ path: evil, line: 1, col: 1, code: "TS2741" }]), [evil], ROOT);
  const line = verdictLines(v, logOf)[0];
  assert.equal(line.includes("\n"), false);
});
