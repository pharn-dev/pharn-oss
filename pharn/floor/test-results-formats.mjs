// pharn/floor/test-results-formats.mjs — the per-FORMAT adapters for a project's test-results file. Each
// adapter turns ONE format's JSON document into a flat list of `{file, path[], title, status}` entries plus
// a count of suite-level errors, or refuses with a closed reason. This file changes when a FORMAT's definition
// changes (a reporter's output, or PHARN's own neutral schema), and for no other reason (P3). The record's
// semantics — the stamp binding, the caps, identity, duplicates, the exit-code cross-check — live in
// test-results-core.mjs, which imports this file; this file imports nothing from it.
//
// ================================ THE FORMATS, AND WHERE THEY CAME FROM ================================
//
// A CLOSED set. Three are reporters built into their test runner, so a project needs no extra dependency; the
// fourth is a schema PHARN owns. All four are JSON, so the floor stays Node-stdlib-only (`JSON.parse`, never an
// XML parser):
//
//   jest-json        Jest's built-in `--json --outputFile=<f>` report
//   pharn-json       PHARN's framework-neutral schema, `pharn-test-results/1` (PHARN_RESULTS_SCHEMA) — any runner
//                    can emit it with a small reporter the project writes
//   playwright-json  Playwright's built-in `json` reporter
//   vitest-json      vitest's built-in `json` reporter (its shape is Jest's `--json` shape by design)
//
// Each reporter adapter's model of its format was checked against reports CAPTURED from the real reporter (vitest
// 5.0.1, @playwright/test 1.63.0, Jest 30.5.2 and 29.7.0 — pharn/floor/test-fixtures/test-results/), not only
// against fixtures written from that model (L4, L55). No other version is claimed. `pharn-json` has no reporter to
// capture: PHARN defines it, so its contract (pharn/pharn-contracts/test-results-record.md, "The neutral format")
// is the reference, and a test parses the contract's own example.
//
// NOT CHOSEN, and why (both measured 2026-09-25, recorded in .dev/features/neutral-test-results/PLAN.md):
//   CTRF — still pre-1.0 (`ctrf` 0.3.0; every reporter a 0.0.x third-party package).
//   JUnit XML — not one format. `jest-junit` 17.0.0 drops a file that fails to load (unless
//   `reportTestSuiteErrors`), renders `test.todo` as a plain passing testcase, and by default joins the describe path
//   into `name` with no `file`; vitest's `junit` joins it with " > " and puts the file in `classname`. The leaf
//   title, the file and "todo" are each defined by the producer, and parsing it would need an XML tokenizer.
//
// ========================================= STATUS MAPPING =========================================
// Closed and fail-closed (P5): a raw status outside the map is `unknown-status`, never a guess.
//   vitest, jest   passed → passed · failed → failed · skipped | pending | todo → skipped (ONE map, JEST_SHAPE_STATUS:
//                  the two raw vocabularies map identically — L35)
//   playwright     expected (with expectedStatus passed) → passed · unexpected → failed · skipped → skipped
//   pharn-json     the record's own RECORD_STATUSES, verbatim — no mapping
// Deliberately UNMAPPED, so they refuse: vitest/Jest `disabled` and `focused`; Playwright `flaky` (it passed only on
// a retry) and an expected failure (`test.fail()`: status `expected`, expectedStatus `failed`) — neither is a plain
// pass and neither is a plain fail. Jest adds the same two cases, read from its own fields: a `passed` test with
// `failing: true` (a `test.failing` whose body failed, as declared) and a `passed` test with `invocations > 1` (it
// passed only on a retry). A `test.failing` whose body PASSED is reported `failed`, and is a failed test — as
// Playwright's `unexpected` is.
//
// WHAT A REPORT DOES NOT MARK, IT CANNOT REFUSE — measured, not modelled (L56), each pinned by a test over its capture:
//   vitest 5.0.1   `test.fails` and a pass on retry are both reported plain `passed`
//   Jest 29.7.0    has no `failing` field, so a `test.failing` is its raw status (its retries ARE marked)
// So "an expected failure or a retry voids the record" holds only where the report says so.
//
// ========================================== FILE AND TITLE ==========================================
// `file` is made relative to the gate's root when the format gives an absolute path under it; otherwise it
// stays exactly as given (opaque). vitest and Jest give the absolute file in `testResults[].name`. Playwright gives
// `spec.file` relative to `config.rootDir` (the testDir), so it is resolved against that first. `pharn-json` gives
// what its producer wrote, which must be absolute or a CLEAN relative POSIX path (isCleanResultsPath) — so a
// `./tests/a.test.js` is refused by name instead of silently never matching a mapped path.
// `path` is the title path, empty titles dropped: vitest/Jest `[...ancestorTitles, title]`; Playwright
// `[projectName, ...describe titles, spec.title]` — the project is IN the path because a multi-project run
// emits the same spec once per project (measured), and without it every such test would collide; `pharn-json`
// the producer's `path`, whose every element must be non-empty and whose last element is the title.
//
// ========================================== SUITE ERRORS ==========================================
// A failure no test owns: a vitest/Jest `testResults[]` entry whose `status` is `failed` while none of its
// assertions failed (a file that could not be loaded), each entry of Playwright's top-level `errors[]`, and
// `pharn-json`'s required `suite_errors`. Counted, never described — their messages are untrusted free text and are
// not read.
//
// TRUST (P2): the document is written by PROJECT code — untrusted DATA. Only the fields named above are read,
// each type-checked; failure messages, stacks, durations and attachments are ignored. Nothing here is eval'd,
// compiled into a RegExp, spawned or sent anywhere. A raw value that appears in a refusal `reason` is quoted
// through `shown()`, which bounds it to SHOWN_CHARS, so an attacker-sized string cannot ride out in a reason.
//
// BOUNDED WORK: Playwright's describe nesting is capped at MAX_DEPTH (`over-cap`). Each nested suite carries its
// own title path, so without the cap a deeply nested report walks in quadratic time — measured at review, 1.9 s
// for 40k levels, and the 32 MiB file cap admits far more. No real suite nests near the cap. The other formats are
// flat and walk in linear time.

import { isAbsolute, resolve, sep } from "node:path";

/** The closed format set. `pharn.config.json`'s `testResults` values must be members. */
export const RESULTS_FORMATS = Object.freeze(["jest-json", "pharn-json", "playwright-json", "vitest-json"]);

/** The closed status set a record entry may carry. */
export const RECORD_STATUSES = Object.freeze(["passed", "failed", "skipped"]);

/** The refusals an adapter can return. test-results-core.mjs's RECORD_REASONS must contain each. */
export const FORMAT_REFUSALS = Object.freeze(["over-cap", "results-malformed", "unknown-status"]);

/** The one schema string a `pharn-json` document must carry. A later version is a new format member, never a
 *  reinterpretation of this one. */
export const PHARN_RESULTS_SCHEMA = "pharn-test-results/1";

/** A `pharn-json` document's keys, exactly (both directions — L36), at the top level and per test. */
export const PHARN_TOP_KEYS = Object.freeze(["schema", "suite_errors", "tests"]);
export const PHARN_TEST_KEYS = Object.freeze(["file", "path", "status"]);

/** The deepest Playwright `describe` nesting accepted; deeper is `over-cap`. */
export const MAX_DEPTH = 256;

/** How many characters of an untrusted raw value a refusal reason may quote. */
export const SHOWN_CHARS = 64;

/** An untrusted value, JSON-quoted and cut to SHOWN_CHARS, for a refusal reason. TOTAL: it never throws. `String(v)`
 *  throws on parsed JSON such as `{"toString":1}` (and on an array holding one), and a refusal that throws is no
 *  refusal — the caller's checker dies with node's exit 1, which reads as a RED verdict (6.22.0 review). Such a value
 *  is shown by its built-in tag (`[object Object]`), which cannot be overridden from JSON. */
export function shown(v) {
  let t;
  try {
    t = String(v);
  } catch {
    t = Object.prototype.toString.call(v);
  }
  return JSON.stringify(t.length > SHOWN_CHARS ? `${t.slice(0, SHOWN_CHARS)}…` : t);
}

/** Raw vitest / Jest status → record status. ONE map for both (their mapped vocabularies are identical). A `Map`,
 *  so a raw status such as `constructor` can never resolve to an inherited member (lessons-learned L15). */
const JEST_SHAPE_STATUS = new Map([
  ["passed", "passed"],
  ["failed", "failed"],
  ["skipped", "skipped"],
  ["pending", "skipped"],
  ["todo", "skipped"],
]);

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

function malformed(reason) {
  return { ok: false, reason_code: "results-malformed", reason };
}

function unknownStatus(reason) {
  return { ok: false, reason_code: "unknown-status", reason };
}

function overCap(reason) {
  return { ok: false, reason_code: "over-cap", reason };
}

function nonEmpty(s) {
  return s !== "";
}

/** A reporter's file path, relative to the first root it sits under; unchanged otherwise. */
export function relativeFile(p, roots) {
  if (!isAbsolute(p)) return p;
  for (const r of roots) {
    const prefix = r.endsWith(sep) ? r : r + sep; // a root of "/" already ends with the separator
    if (p.startsWith(prefix)) return p.slice(prefix.length);
  }
  return p;
}

/** A `pharn-json` `file`: absolute, or a clean relative POSIX path — non-empty, no backslash, no NUL, and no empty,
 *  `.` or `..` segment. Anything else could never equal a mapped path, so it is refused by name. */
export function isCleanResultsPath(p) {
  if (typeof p !== "string" || p === "" || p.includes("\\") || p.includes("\0")) return false;
  const rel = isAbsolute(p) ? p.slice(1) : p;
  return rel !== "" && rel.split("/").every((s) => s !== "" && s !== "." && s !== "..");
}

/** Jest's per-assertion fields, beyond the shared shape: `invocations` (always emitted by the measured versions) and
 *  `failing` (Jest 30 only). `null` when the entry is an ordinary test; a refusal otherwise. */
function jestChecks(a, status, where) {
  if (!Number.isSafeInteger(a.invocations) || a.invocations < 1) {
    return malformed(`${where} must carry a positive integer \`invocations\` (Jest 29.7.0 and 30.5.2 both emit it)`);
  }
  if (Object.hasOwn(a, "failing") && typeof a.failing !== "boolean") return malformed(`${where}.failing must be a boolean when present`);
  if (status === "passed" && a.failing === true) {
    return unknownStatus(`${where} is an expected failure (\`test.failing\`) — neither a plain pass nor a plain fail`);
  }
  if (status === "passed" && a.invocations > 1) {
    return unknownStatus(`${where} passed only on a retry (${a.invocations} invocations) — neither a plain pass nor a plain fail`);
  }
  return null;
}

/** vitest-json / jest-json: `testResults[].name` + `assertionResults[]`. `extra` is the format's per-assertion
 *  check (Jest's), or null. */
function parseJestShape(doc, roots, extra) {
  if (!isPlainObject(doc) || !Array.isArray(doc.testResults)) {
    return malformed("expected a top-level object with a `testResults` array");
  }
  const entries = [];
  let suiteErrors = 0;
  for (let i = 0; i < doc.testResults.length; i++) {
    const tr = doc.testResults[i];
    if (!isPlainObject(tr) || typeof tr.name !== "string" || !Array.isArray(tr.assertionResults)) {
      return malformed(`testResults[${i}] must carry a string \`name\` and an \`assertionResults\` array`);
    }
    const file = relativeFile(tr.name, roots);
    let failedHere = 0;
    for (let j = 0; j < tr.assertionResults.length; j++) {
      const a = tr.assertionResults[j];
      const where = `testResults[${i}].assertionResults[${j}]`;
      if (!isPlainObject(a) || typeof a.title !== "string" || typeof a.status !== "string" || !isStringArray(a.ancestorTitles)) {
        return malformed(`${where} must carry string \`title\`/\`status\` and a string \`ancestorTitles\` array`);
      }
      const status = JEST_SHAPE_STATUS.get(a.status);
      if (status === undefined) {
        return unknownStatus(`${where} has status ${shown(a.status)}, outside the closed map`);
      }
      if (extra !== null) {
        const refused = extra(a, status, where);
        if (refused !== null) return refused;
      }
      if (status === "failed") failedHere++;
      entries.push({ file, path: [...a.ancestorTitles, a.title].filter(nonEmpty), title: a.title, status });
    }
    if (tr.status === "failed" && failedHere === 0) suiteErrors++;
  }
  return { ok: true, entries, suiteErrors };
}

/** Playwright's per-test outcome → record status, or `null` for an outcome outside the closed map. */
function playwrightStatus(t) {
  if (t.status === "expected" && t.expectedStatus === "passed") return "passed";
  if (t.status === "unexpected") return "failed";
  if (t.status === "skipped") return "skipped";
  return null;
}

/** playwright-json: file suites → nested describe suites → specs → one test per project. Walked with an
 *  explicit stack, never recursion, so a deeply nested document cannot exhaust the call stack, and capped at
 *  MAX_DEPTH, so it cannot cost quadratic time either. */
function parsePlaywright(doc, roots) {
  if (!isPlainObject(doc) || !Array.isArray(doc.suites)) {
    return malformed("expected a top-level object with a `suites` array");
  }
  const errors = doc.errors ?? [];
  if (!Array.isArray(errors)) return malformed("`errors` must be an array when present");
  const cfg = doc.config;
  const rootDir = isPlainObject(cfg) && typeof cfg.rootDir === "string" && isAbsolute(cfg.rootDir) ? cfg.rootDir : null;
  const entries = [];
  // A TOP-LEVEL suite is a FILE suite: its title is the file name, never a describe, so it adds nothing to the
  // title path. Every nested suite is a describe.
  const stack = doc.suites.map((suite, i) => ({ suite, describes: [], where: `suites[${i}]` })).reverse();
  while (stack.length) {
    const { suite, describes, where } = stack.pop();
    if (describes.length > MAX_DEPTH) return overCap(`describe nesting deeper than ${MAX_DEPTH} levels`);
    if (!isPlainObject(suite) || typeof suite.title !== "string") return malformed(`${where} must be an object with a string \`title\``);
    const specs = suite.specs ?? [];
    const children = suite.suites ?? [];
    if (!Array.isArray(specs) || !Array.isArray(children)) return malformed(`${where}.specs and .suites must be arrays when present`);
    for (let j = 0; j < specs.length; j++) {
      const spec = specs[j];
      if (!isPlainObject(spec) || typeof spec.title !== "string" || typeof spec.file !== "string" || !Array.isArray(spec.tests)) {
        return malformed(`${where}.specs[${j}] must carry string \`title\`/\`file\` and a \`tests\` array`);
      }
      const file = relativeFile(rootDir ? resolve(rootDir, spec.file) : spec.file, roots);
      for (let k = 0; k < spec.tests.length; k++) {
        const t = spec.tests[k];
        if (
          !isPlainObject(t) ||
          typeof t.projectName !== "string" ||
          typeof t.status !== "string" ||
          typeof t.expectedStatus !== "string"
        ) {
          return malformed(`${where}.specs[${j}].tests[${k}] must carry string \`projectName\`/\`status\`/\`expectedStatus\``);
        }
        const status = playwrightStatus(t);
        if (status === null) {
          return unknownStatus(
            `${where}.specs[${j}].tests[${k}] has status ${shown(t.status)} (expectedStatus ${shown(t.expectedStatus)}), outside the closed map`
          );
        }
        entries.push({ file, path: [t.projectName, ...describes, spec.title].filter(nonEmpty), title: spec.title, status });
      }
    }
    for (let c = children.length - 1; c >= 0; c--) {
      const child = children[c];
      const title = isPlainObject(child) && typeof child.title === "string" ? child.title : "";
      stack.push({ suite: child, describes: [...describes, title], where: `${where}.suites[${c}]` });
    }
  }
  return { ok: true, entries, suiteErrors: errors.length };
}

/** `null` when `obj`'s own keys are exactly `keys`; otherwise a reason naming the extra and the missing ones. Own
 *  properties only, so a `"__proto__"` key JSON.parse created is an EXTRA key (L15), never invisible. */
function keysMismatch(where, obj, keys) {
  const extra = Object.keys(obj).filter((k) => !keys.includes(k));
  const missing = keys.filter((k) => !Object.hasOwn(obj, k));
  if (!extra.length && !missing.length) return null;
  const parts = [];
  if (extra.length) parts.push(`unexpected key(s) ${extra.map(shown).join(", ")}`);
  if (missing.length) parts.push(`missing key(s) ${missing.map(shown).join(", ")}`);
  return `${where} has ${parts.join("; ")} — its keys are exactly ${JSON.stringify(keys)}`;
}

/** pharn-json: PHARN's own schema, strict in both directions. The schema string is checked first, so a document
 *  of a later version is named as such rather than as a key mismatch. */
function parsePharn(doc, roots) {
  if (!isPlainObject(doc)) return malformed("expected a top-level object");
  if (doc.schema !== PHARN_RESULTS_SCHEMA) {
    return malformed(
      `\`schema\` is ${Object.hasOwn(doc, "schema") ? shown(doc.schema) : "absent"}, expected ${JSON.stringify(PHARN_RESULTS_SCHEMA)}`
    );
  }
  const top = keysMismatch("the document", doc, PHARN_TOP_KEYS);
  if (top !== null) return malformed(top);
  if (!Number.isSafeInteger(doc.suite_errors) || doc.suite_errors < 0) return malformed("`suite_errors` must be a non-negative integer");
  if (!Array.isArray(doc.tests)) return malformed("`tests` must be an array");
  const entries = [];
  for (let i = 0; i < doc.tests.length; i++) {
    const t = doc.tests[i];
    const where = `tests[${i}]`;
    if (!isPlainObject(t)) return malformed(`${where} must be an object`);
    const keys = keysMismatch(where, t, PHARN_TEST_KEYS);
    if (keys !== null) return malformed(keys);
    if (!isCleanResultsPath(t.file)) {
      return malformed(
        `${where}.file must be an absolute path or a clean relative POSIX path (no ".", ".." or empty segment, no backslash)`
      );
    }
    if (!Array.isArray(t.path) || t.path.length === 0 || !t.path.every((s) => typeof s === "string" && s !== "")) {
      return malformed(`${where}.path must be a non-empty array of non-empty strings, the test's own title last`);
    }
    if (typeof t.status !== "string") return malformed(`${where}.status must be a string`);
    if (!RECORD_STATUSES.includes(t.status)) {
      return unknownStatus(`${where} has status ${shown(t.status)}, outside {${RECORD_STATUSES.join(", ")}}`);
    }
    entries.push({ file: relativeFile(t.file, roots), path: [...t.path], title: t.path[t.path.length - 1], status: t.status });
  }
  return { ok: true, entries, suiteErrors: doc.suite_errors };
}

/** Parse one document. `format` must be a RESULTS_FORMATS member; `roots` are the absolute directories a
 *  document's absolute file paths are made relative to. */
export function parseResults(format, doc, roots) {
  if (format === "vitest-json") return parseJestShape(doc, roots, null);
  if (format === "jest-json") return parseJestShape(doc, roots, jestChecks);
  if (format === "playwright-json") return parsePlaywright(doc, roots);
  if (format === "pharn-json") return parsePharn(doc, roots);
  throw new Error(`internal: ${JSON.stringify(format)} is not a member of RESULTS_FORMATS`);
}
