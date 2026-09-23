// pharn/floor/test-results-formats.mjs — the per-FORMAT adapters for a project's test-results file. Each
// adapter turns ONE reporter's JSON document into a flat list of `{file, path[], title, status}` entries plus
// a count of suite-level errors, or refuses with a closed reason. This file changes when a REPORTER's output
// format changes, and for no other reason (P3). The record's semantics — the stamp binding, the caps,
// identity, duplicates, the exit-code cross-check — live in test-results-core.mjs, which imports this file;
// this file imports nothing from it.
//
// ================================ THE FORMATS, AND WHERE THEY CAME FROM ================================
//
// A CLOSED set of reporters built into the test runners, so a project needs no extra dependency and the
// floor stays Node-stdlib-only (`JSON.parse`, never an XML parser):
//
//   vitest-json      vitest's built-in `json` reporter (its shape is Jest's `--json` shape by design)
//   playwright-json  Playwright's built-in `json` reporter
//
// CTRF was weighed and not chosen: as of this writing its schema is explicitly pre-1.0 and every reporter for
// it is a 0.0.x third-party package. `jest-json` was dropped at grill: its only evidence would have been a
// fixture written from this module's own model of the format (lessons-learned L55). Both are recorded in
// .dev/features/test-results/PLAN.md; either joins when a live capture can back it.
//
// Each adapter's model of its format was checked against reports CAPTURED from the real reporters (vitest
// 5.0.1, @playwright/test 1.63.0 — pharn/floor/test-fixtures/test-results/), not only against fixtures
// written from that model (L4, L55).
//
// ========================================= STATUS MAPPING =========================================
// Closed and fail-closed (P5): a raw status outside the map is `unknown-status`, never a guess.
//   vitest       passed → passed · failed → failed · skipped | pending | todo → skipped
//   playwright   expected (with expectedStatus passed) → passed · unexpected → failed · skipped → skipped
// Deliberately UNMAPPED, so they refuse: vitest `disabled`; Playwright `flaky` (it passed only on a retry)
// and an expected failure (`test.fail()`: status `expected`, expectedStatus `failed`) — neither is a plain
// pass and neither is a plain fail.
//
// ========================================== FILE AND TITLE ==========================================
// `file` is made relative to the gate's root when the reporter gives an absolute path under it; otherwise it
// stays exactly as given (opaque). vitest gives the absolute file in `testResults[].name`. Playwright gives
// `spec.file` relative to `config.rootDir` (the testDir), so it is resolved against that first.
// `path` is the title path, empty titles dropped: vitest `[...ancestorTitles, title]`; Playwright
// `[projectName, ...describe titles, spec.title]` — the project is IN the path because a multi-project run
// emits the same spec once per project (measured), and without it every such test would collide.
//
// ========================================== SUITE ERRORS ==========================================
// A failure no test owns: a vitest `testResults[]` entry whose `status` is `failed` while none of its
// assertions failed (a file that could not be imported), and each entry of Playwright's top-level `errors[]`.
// Counted, never described — their messages are untrusted free text and are not read.
//
// TRUST (P2): the document is written by PROJECT code — untrusted DATA. Only the fields named above are read,
// each type-checked; failure messages, stacks, durations and attachments are ignored. Nothing here is eval'd,
// compiled into a RegExp, spawned or sent anywhere. A raw value that appears in a refusal `reason` is quoted
// through `shown()`, which bounds it to SHOWN_CHARS, so an attacker-sized string cannot ride out in a reason.
//
// BOUNDED WORK: Playwright's describe nesting is capped at MAX_DEPTH (`over-cap`). Each nested suite carries its
// own title path, so without the cap a deeply nested report walks in quadratic time — measured at review, 1.9 s
// for 40k levels, and the 32 MiB file cap admits far more. No real suite nests near the cap.

import { isAbsolute, resolve, sep } from "node:path";

/** The closed format set. `pharn.config.json`'s `testResults` values must be members. */
export const RESULTS_FORMATS = Object.freeze(["playwright-json", "vitest-json"]);

/** The closed status set a record entry may carry. */
export const RECORD_STATUSES = Object.freeze(["passed", "failed", "skipped"]);

/** The refusals an adapter can return. test-results-core.mjs's RECORD_REASONS must contain each. */
export const FORMAT_REFUSALS = Object.freeze(["over-cap", "results-malformed", "unknown-status"]);

/** The deepest Playwright `describe` nesting accepted; deeper is `over-cap`. */
export const MAX_DEPTH = 256;

/** How many characters of an untrusted raw value a refusal reason may quote. */
export const SHOWN_CHARS = 64;

/** An untrusted value, JSON-quoted and cut to SHOWN_CHARS, for a refusal reason. */
export function shown(v) {
  const t = String(v);
  return JSON.stringify(t.length > SHOWN_CHARS ? `${t.slice(0, SHOWN_CHARS)}…` : t);
}

/** Raw vitest status → record status. A `Map`, so a raw status such as `constructor` can never resolve to an
 *  inherited member (lessons-learned L15). */
const VITEST_STATUS = new Map([
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

/** vitest-json: `testResults[].name` + `assertionResults[]`. */
function parseVitest(doc, roots) {
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
      if (!isPlainObject(a) || typeof a.title !== "string" || typeof a.status !== "string" || !isStringArray(a.ancestorTitles)) {
        return malformed(
          `testResults[${i}].assertionResults[${j}] must carry string \`title\`/\`status\` and a string \`ancestorTitles\` array`
        );
      }
      const status = VITEST_STATUS.get(a.status);
      if (status === undefined) {
        return unknownStatus(`testResults[${i}].assertionResults[${j}] has status ${shown(a.status)}, outside the closed map`);
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

/** Parse one reporter document. `format` must be a RESULTS_FORMATS member; `roots` are the absolute
 *  directories a reporter's absolute file paths are made relative to. */
export function parseResults(format, doc, roots) {
  if (format === "vitest-json") return parseVitest(doc, roots);
  if (format === "playwright-json") return parsePlaywright(doc, roots);
  throw new Error(`internal: ${JSON.stringify(format)} is not a member of RESULTS_FORMATS`);
}
