// pharn/floor/test-results-core.mjs — derive a deterministic PER-TEST record for one gate of a gate-run
// stamp, from the machine-readable results file the project's own test run wrote into the runner's `<out>`.
// Contract: pharn/pharn-contracts/test-results-record.md. This file changes when what a record MEANS changes
// (its binding to the stamp, identity, caps, the exit-code cross-check); a reporter's format lives in
// test-results-formats.mjs (P3). No `child_process`, no network, no eval — its only I/O is reading
// `<root>/pharn.config.json` and the one results file.
//
// ================================ WHY THIS EXISTS (and its honest trigger) ================================
// The floor sees only whole-gate exit codes (run-gates.mjs; gate-run-record.md). It cannot say whether ONE
// named test ran and passed: a suite exits 0 with `it.skip("AC-1: …")`. This module is the deterministic
// per-test view later stages need. HONEST TRIGGER (P7): no dogfood run failed on this; it was built at the
// maintainer's direction (the AC-delivery queue) for a gap demonstrable on any project. No stage read the
// record in 6.15.0; since 6.18.0 /pharn-test's red run does (red-run-core.mjs), where a refused record is a RED by
// its own reason; and since 6.20.0 /pharn-verify's AC gate does (ac-gate-core.mjs via check-verify.mjs
// --ac-gate), so a verify verdict computed with that flag DEPENDS on the record — a refused one is INCONCLUSIVE
// over green gates. The regress verdict, and a verify verdict computed without the flag, are unchanged for every
// stamp the runner writes; what did move on all three verdict paths is that validateStamp refuses a MALFORMED
// `results_sha256` (a forged or corrupted stamp) as `stamp-malformed`, and the runner refuses to run a gate
// whose results path it cannot clear (gate-run-record.md, "Per-test results").
//
// ================================ WHAT A RECORD IS, AND IS NOT ================================
// A DERIVED VIEW, never stored (L35): the raw results file under `<out>` is the single store, and the gate's
// `runs[]` entry carries only its `results_sha256`. `testRecord` re-hashes the file and refuses it if it no
// longer matches (`results-hash-mismatch`), so the record describes the exact bytes the runner hashed.
//   • The results file is a LIVE referent (L58): a detached descendant of the gate can still write it after
//     the runner hashed it. Nothing here compares against a growing source — a later write is refused as
//     `results-hash-mismatch`, never folded into the record.
//   • The hash certifies the file is the one the runner saw, NEVER that its contents are true (L43). The
//     reporter config and the `test` script are project code a build can edit, so a forged file is possible;
//     `results-exit-contradiction` (a failed test or a suite error under exit 0) narrows that, it does not
//     close it. "passed" means the project's reporter said so — PHARN does not re-run or re-judge a test.
//   • FAIL-CLOSED PER RECORD: any refusal voids the whole record. One flaky test or expected failure the report
//     MARKS (test-results-formats.mjs names which formats mark which), one duplicate title, or a `testResults` key
//     outside RESULTS_GATES makes the answer a reason, not a partial list. One the report does NOT mark — vitest's
//     `test.fails` or pass on retry, Jest 29's `test.failing` (measured) — reads as its raw status.
//   • An `ok` record may hold ZERO tests (a run that ran none). A consumer that needs tests must assert
//     non-emptiness itself (L34).
//
// TRUST (P2): the results file is UNTRUSTED project output, read under a byte cap from a descriptor opened
// O_NOFOLLOW|O_NONBLOCK and fstat-checked as a regular file. Test ids and titles are opaque strings — never
// interpreted, never compiled into a RegExp, never an instruction — and the RECORD CARRIES THEM AS UNTRUSTED
// DATA: `tests[].id`, `.file`, `.title` and every refusal `reason` inherit the file's taint, so a consumer
// must fence them before any model reads them. A raw value quoted in a reason is bounded by `shown()`. `pharn.config.json` is NOT guarded by any
// hook, so the opt-in and the format are agent-reachable: a build can switch the record off or change what
// is parsed. That is advisory, and stated rather than discovered.

import { createHash } from "node:crypto";
import { closeSync, fstatSync, openSync, readFileSync, readSync, realpathSync, constants as fsConstants } from "node:fs";
import { join, resolve } from "node:path";
import { E2E_SET, resultsFileName, validateStamp } from "./gate-run-core.mjs";
import { RECORD_STATUSES, RESULTS_FORMATS, parseResults, shown } from "./test-results-formats.mjs";

/** The config file and key a project opts in with: `{"testResults": {"<gate-id>": "<format>"}}`. */
export const CONFIG_FILE = "pharn.config.json";
export const CONFIG_KEY = "testResults";

/** The gate ids a `testResults` key may name: `test` and the e2e gates (gate-run-core's E2E_SET, imported, never
 *  restated — L35). CLOSED: a key outside it makes the block `config-invalid`. */
export const RESULTS_GATES = Object.freeze(["test", ...E2E_SET]);

/** The CLOSED reason vocabulary of a refused record. Separate from gate-run-core's REASON_CODES: those are
 *  the RUNNER's refusals, these are the reasons a per-test view cannot be given. Sorted; both closure
 *  directions are tested (L36). */
export const RECORD_REASONS = Object.freeze([
  "config-invalid",
  "duplicate-test-id",
  "gate-absent",
  "not-configured",
  "over-cap",
  "results-exit-contradiction",
  "results-hash-mismatch",
  "results-malformed",
  "results-unavailable",
  "stamp-invalid",
  "unknown-status",
]);

/** Caps on the untrusted file. Over any of them is `over-cap`, never a truncated record. The id cap counts
 *  UTF-16 code units (JavaScript string length), not user-perceived characters. */
export const MAX_RESULTS_BYTES = 32 * 1024 * 1024;
export const MAX_TESTS = 100000;
export const MAX_ID_CHARS = 4096;

/** The separators of a test id: `<file>::<title path joined by " › ">`. */
export const FILE_SEP = "::";
export const TITLE_SEP = " › ";

const REASON_SET = new Set(RECORD_REASONS);
const OPEN_FLAGS = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;

function refuse(reason_code, reason) {
  // Fail-closed by construction: a refusal cannot be invented at a call site.
  if (!REASON_SET.has(reason_code)) throw new Error(`internal: '${reason_code}' is not a member of RECORD_REASONS`);
  return { ok: false, reason_code, reason };
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Validate a `pharn.config.json` TEXT (or `null` when the file is absent) and return the gate → format map.
 *  Absent file or absent key → `not-configured`; anything present but malformed → `config-invalid`. */
export function readResultsConfig(text) {
  if (text === null) return refuse("not-configured", `no ${CONFIG_FILE}`);
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch (e) {
    return refuse("config-invalid", `${CONFIG_FILE} is not valid JSON: ${e.message}`);
  }
  if (!isPlainObject(cfg)) return refuse("config-invalid", `${CONFIG_FILE} is not a JSON object`);
  if (!Object.hasOwn(cfg, CONFIG_KEY)) return refuse("not-configured", `${CONFIG_FILE} has no \`${CONFIG_KEY}\` key`);
  const block = cfg[CONFIG_KEY];
  if (!isPlainObject(block)) return refuse("config-invalid", `\`${CONFIG_KEY}\` must be an object mapping a gate id to a format`);
  const formats = Object.create(null);
  for (const [gate, format] of Object.entries(block)) {
    if (!RESULTS_GATES.includes(gate)) {
      return refuse("config-invalid", `\`${CONFIG_KEY}\` names gate ${shown(gate)}, outside {${RESULTS_GATES.join(", ")}}`);
    }
    if (!RESULTS_FORMATS.includes(format)) {
      return refuse("config-invalid", `\`${CONFIG_KEY}.${gate}\` is ${shown(format)}, outside {${RESULTS_FORMATS.join(", ")}}`);
    }
    formats[gate] = format;
  }
  return { ok: true, formats };
}

/** The format configured for `gateId`, via an OWN-property test (L15): `toString` is never a gate. */
export function formatFor(config, gateId) {
  if (!config.ok) return config;
  if (!Object.hasOwn(config.formats, gateId)) return refuse("not-configured", `\`${CONFIG_KEY}\` does not name gate ${shown(gateId)}`);
  return { ok: true, format: config.formats[gateId] };
}

/** `<root>/pharn.config.json` → the validated gate → format map, or a refusal. An absent file is
 *  `not-configured`; a file that exists but cannot be read is `config-invalid`, never "absent". */
export function loadResultsConfig(root) {
  let text;
  try {
    text = readFileSync(join(root, CONFIG_FILE), "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return readResultsConfig(null);
    return refuse("config-invalid", `${CONFIG_FILE} is unreadable: ${e && e.code ? e.code : "error"}`);
  }
  return readResultsConfig(text);
}

/** Read the results file: a regular file under the byte cap, opened without following a link or blocking.
 *  Returns `{ok, bytes}` or a refusal. */
export function readResultsFile(file) {
  let fd;
  try {
    fd = openSync(file, OPEN_FLAGS);
  } catch (e) {
    if (e && e.code === "ENOENT") return refuse("results-unavailable", "the results file is absent");
    return refuse("results-unavailable", `the results file cannot be opened as a plain file (${e && e.code ? e.code : "error"})`);
  }
  try {
    const st = fstatSync(fd);
    if (!st.isFile()) return refuse("results-unavailable", "the results path is not a regular file");
    if (st.size > MAX_RESULTS_BYTES)
      return refuse("over-cap", `the results file is ${st.size} bytes, over the ${MAX_RESULTS_BYTES}-byte cap`);
    const bytes = Buffer.alloc(st.size);
    let off = 0;
    while (off < st.size) {
      const n = readSync(fd, bytes, off, st.size - off, off);
      if (n === 0) break;
      off += n;
    }
    return { ok: true, bytes: bytes.subarray(0, off) };
  } finally {
    closeSync(fd);
  }
}

/** The roots a reporter's absolute paths are made relative to: `root` as given (resolved) and its realpath,
 *  which differ on macOS (`/tmp` → `/private/tmp`) — a reporter reports the path its own process saw. */
function rootsOf(root) {
  const out = [resolve(root)];
  try {
    const real = realpathSync(root);
    if (!out.includes(real)) out.push(real);
  } catch {
    /* a root that does not exist yields only its lexical form */
  }
  return out;
}

/** Turn parsed entries into the record: ids, caps, duplicates, the exit-code cross-check. Pure. */
export function buildRecord({ gate, format, exit, sha, parsed }) {
  if (parsed.entries.length > MAX_TESTS) return refuse("over-cap", `${parsed.entries.length} tests, over the ${MAX_TESTS}-test cap`);
  const tests = [];
  const seen = new Set();
  for (const e of parsed.entries) {
    const id = `${e.file}${FILE_SEP}${e.path.join(TITLE_SEP)}`;
    if (id.length > MAX_ID_CHARS) return refuse("over-cap", `a test id is ${id.length} characters, over the ${MAX_ID_CHARS}-character cap`);
    if (seen.has(id)) return refuse("duplicate-test-id", `two tests share the id ${shown(id)} — identity is ambiguous`);
    seen.add(id);
    tests.push({ id, file: e.file, title: e.title, status: e.status });
  }
  tests.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const counts = Object.fromEntries(RECORD_STATUSES.map((s) => [s, tests.filter((t) => t.status === s).length]));
  if (exit === 0 && (counts.failed > 0 || parsed.suiteErrors > 0)) {
    return refuse(
      "results-exit-contradiction",
      `the gate exited 0 but its results report ${counts.failed} failed test(s) and ${parsed.suiteErrors} suite error(s)`
    );
  }
  return { ok: true, gate, format, results_sha256: sha, exit, counts, suite_errors: parsed.suiteErrors, tests };
}

/** THE EXPORT later stages call: the per-test record of gate `gateId` in a finalized stamp, or a closed
 *  reason. `outDir` is the runner's `<out>` for that stamp; `root` is the directory the gate ran in (the
 *  stamp does not record it) and holds `pharn.config.json`. All four are required — no defaults (L41). */
export function testRecord({ stamp, outDir, gateId, root }) {
  for (const [name, v] of [
    ["outDir", outDir],
    ["gateId", gateId],
    ["root", root],
  ]) {
    if (typeof v !== "string" || v === "") throw new TypeError(`testRecord: \`${name}\` must be a non-empty string`);
  }
  const valid = validateStamp(stamp);
  if (!valid.ok) return refuse("stamp-invalid", `${valid.reason_code}: ${valid.reason}`);
  const run = stamp.runs.find((r) => r.id === gateId);
  if (run === undefined) return refuse("gate-absent", `the stamp has no gate ${shown(gateId)}`);

  const fmt = formatFor(loadResultsConfig(root), gateId);
  if (!fmt.ok) return fmt;

  if (run.timed_out) return refuse("results-unavailable", "the gate timed out — a killed run's file is not a complete record");
  if (!Object.hasOwn(run, "results_sha256"))
    return refuse("results-unavailable", "the stamp predates per-test results (no results_sha256)");
  if (run.results_sha256 === null) {
    const why = run.ran === false ? "the gate did not run (no-files)" : "the gate wrote no results file";
    return refuse("results-unavailable", why);
  }

  const read = readResultsFile(join(outDir, resultsFileName(run.seq, run.id)));
  if (!read.ok) return read;
  const sha = createHash("sha256").update(read.bytes).digest("hex");
  if (sha !== run.results_sha256) {
    return refuse(
      "results-hash-mismatch",
      "the results file no longer hashes to the stamp's results_sha256 — it changed after the runner recorded it"
    );
  }
  let doc;
  try {
    doc = JSON.parse(read.bytes.toString("utf8"));
  } catch (e) {
    return refuse("results-malformed", `the results file is not valid JSON: ${e.message}`);
  }
  const parsed = parseResults(fmt.format, doc, rootsOf(root));
  if (!parsed.ok) return refuse(parsed.reason_code, parsed.reason);
  return buildRecord({ gate: gateId, format: fmt.format, exit: run.exit, sha, parsed });
}
