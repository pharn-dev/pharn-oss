#!/usr/bin/env node
// pharn/floor/ac-tests-lock.mjs — write and check `pharn/features/<name>/AC-TESTS.lock.json`, the record that pins
// the AC tests `/pharn-test` wrote. Contract: pharn/pharn-contracts/ac-tests.md ("The lock").
//
// Every digest in the lock is computed HERE, never typed by a model (PHARN's own build-loop lesson L22). One lock per
// feature, with NAMED sections, so later stages extend this record instead of adding a second one (L35).
//
// SCHEMA `ac-tests-lock/3` (6.20.0) is what `--write` and `--write-bootstrap` write; `ac-tests-lock/2` (6.18.0) and
// `ac-tests-lock/1` (6.17.0) are still READ and checked — a /1 lock never passes `--require-red-run`, and neither
// carries the test-infrastructure pin (the AC gate reads that as `test-infra-unpinned`). /2 and /3 share one closed key
// set; /3 differs only in `test_infra`:
//   schema     "ac-tests-lock/3"
//   feature    the slug
//   mode       "test-first" (the AC tests were written before the build and must fail first) | "bootstrap" (a
//              `spec_kind: test-infra` SPEC: no tests before the build — WEAKER, and the record says so)
//   spec       { spec_id, spec_content_hash } — test-first: AC-TESTS.md's frontmatter, bound to the Approved SPEC by
//              the mapping checker; bootstrap: SPEC.md's own frontmatter
//   mapping    test-first { path, sha256 } — AC-TESTS.md's bytes · bootstrap null
//   files      test-first [{ path, sha256 }] — every `## Files` entry, sorted · bootstrap []
//   bootstrap  test-first null · bootstrap { spec_kind: "test-infra", levels: [...] } — the SPEC's AC levels, sorted,
//              which a later stage's post-build evidence is judged against
//   red_run    null, or (test-first only) the red-run evidence `--record-red-run` writes:
//              { stamp_sha256, files_sha256, gates: [{ gate, results_sha256 }], acs: [{ id, tests: [...] }] }
//   test_infra test-first (/3) { levels, gates, configs } — the TEST-INFRASTRUCTURE PIN test-infra-core.mjs computes:
//              the mapped levels, the package.json scripts and testResults formats of their gates, and the root runner
//              configs in a closed name set · bootstrap, /2 and /1 null
// `--write` always resets `red_run` to null and re-takes the pin: a rewrite means the tests changed, so evidence about
// the old ones is stale by construction. The pin is taken at `--write`, BEFORE the red run, so the red run runs under
// the pinned infrastructure and `--record-red-run` (which requires `--check` GREEN) refuses a pin that no longer holds.
//
// THE RED RUN'S EVIDENCE (grill G1/G8). `--record-red-run` re-derives the verdict itself (red-run-core.mjs — never a
// model's report), requires `--check` GREEN and the stamp BOUND to this mapping and the live tree, and records only
// on GREEN. `files_sha256` binds the evidence to the lock's `files` section and `--check` re-verifies it; the stamp
// and results digests are RECORDED, not re-checkable, because the next run-gates `init` wipes `<out>`. `--check`
// GREEN does not mean a red run happened — `--require-red-run` is the question that does, and a bootstrap lock (no red
// run) answers it only when the caller also passes `--allow-bootstrap`. A bootstrap lock is written and checked only
// over an Approved, un-drifted SPEC (check-spec-approved.mjs, shelled).
//
// FLOOR (primitive #2, content-hash): `--check` recomputes every recorded digest, the set of `## Files` paths and the
// test-infrastructure pin, and REDs naming the PATH or gate id, never the file's content. The check is composed of
// named PURE parts (testFirstReds, redRunReds, pinReds, bootstrapReds) so /pharn-verify's AC gate (ac-gate-core.mjs) can
// classify each into one reason without spawning; checkLock is their union plus the bootstrap approval spawn. NOT GUARANTEED (P0): that the tests are good or right, that
// `/pharn-test` wrote them from SPEC + PLAN alone, or who wrote the lock — it is a file in the writable tree, and a
// self-consistent rewrite passes (L43). What `--check` proves is that the files on disk are the ones recorded.
//
// TRUST (P2): the test files are hashed, never read as text; AC-TESTS.md is parsed only for two frontmatter scalars
// and its `## Files` paths (the same parser the writes-scope setter's rule is held to).
//
// Usage:
//   node pharn/floor/ac-tests-lock.mjs --write <name> [--base <features-dir>]
//   node pharn/floor/ac-tests-lock.mjs --write-bootstrap <name> [--base <features-dir>]
//   node pharn/floor/ac-tests-lock.mjs --record-red-run <name> --out <run-gates out dir> [--base <features-dir>]
//   node pharn/floor/ac-tests-lock.mjs --check <name> [--require-red-run [--allow-bootstrap]] [--base <features-dir>]
//     <features-dir> defaults to `pharn/features`; test-file paths resolve against the current directory (the
//     project root), exactly as the writes-scope setter resolves them.
//
// Exit: --write  0 written · 2 refused (bad usage, AC-TESTS.md missing / not a regular file / no pin / no
//                  `## Files` / no usable `## Mapping`, a listed file missing or not a regular file, a test
//                  infrastructure that cannot be pinned — an unparseable package.json, a symlinked runner config)
//       --write-bootstrap  0 written · 2 refused (the SPEC is not Approved and un-drifted, is not
//                  `spec_kind: test-infra`, has no usable criteria, or an AC-TESTS.md exists)
//       --record-red-run  0 recorded · 1 the red run is not GREEN, or `--check` is RED (nothing written) ·
//                  2 unusable (no lock, a bootstrap or /1 lock, no finished stamp, a stamp not bound to the mapping)
//       --check  0 GREEN · 1 RED (a pinned file or AC-TESTS.md changed, went missing or is no longer a regular
//                  file; a `## Files` entry added or dropped; the spec pin changed; `red_run` no longer bound to
//                  `files`; /3 test-first: the test-infrastructure pin no longer holds; bootstrap: the SPEC's pin, kind or levels changed, or an AC-TESTS.md appeared;
//                  `--require-red-run`: a test-first lock with no `red_run`, any /1 lock, and a bootstrap lock unless
//                  `--allow-bootstrap`; bootstrap: the SPEC is no longer Approved and un-drifted) · 2 unusable (bad
//                  usage, no lock, a lock that is not JSON or not the closed shape)
// Test-file paths resolve against the CURRENT directory (the project root), as the setter resolves them; `--base`
// moves only where AC-TESTS.md and the lock live, and the mapping path is compared resolved, never as spelled.

import { createHash } from "node:crypto";
import { readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { matchFrontmatter } from "./frontmatter-core.mjs";
import { pathsFromPlanFiles } from "./plan-files-core.mjs";
import { LEVELS, acRowsOf } from "./ac-tests-core.mjs";
import { specAcceptanceCriteria } from "./spec-template-core.mjs";
import { RESULTS_GATES } from "./test-results-core.mjs";
import { evaluateRedRun } from "./red-run-core.mjs";
import { computeTestInfra, pinShapeError, sha256RegularFile, testInfraReds } from "./test-infra-core.mjs";

export { sha256RegularFile };

/** The schema `--write` / `--write-bootstrap` write. */
export const SCHEMA = "ac-tests-lock/3";
/** The 6.18.0 schema: /3's keys, no test-infrastructure pin. Still read and checked. */
export const SCHEMA_V2 = "ac-tests-lock/2";
/** The 6.17.0 schema, still read and checked. */
export const SCHEMA_V1 = "ac-tests-lock/1";
export const MODES = Object.freeze(["bootstrap", "test-first"]);
export const LOCK_NAME = "AC-TESTS.lock.json";
export const MAPPING_NAME = "AC-TESTS.md";
export const DEFAULT_BASE = "pharn/features";
export const SPEC_NAME = "SPEC.md";
const CHECK_SPEC_APPROVED = join(dirname(fileURLToPath(import.meta.url)), "check-spec-approved.mjs");
/** The lock's closed top-level key set, per schema (L36 — a presence set would admit a variant spelling). */
export const LOCK_KEYS = Object.freeze(["bootstrap", "feature", "files", "mapping", "mode", "red_run", "schema", "spec", "test_infra"]);
export const LOCK_KEYS_V1 = Object.freeze(["feature", "files", "mapping", "red_run", "schema", "spec", "test_infra"]);
/** `red_run`'s closed key set. */
export const RED_RUN_KEYS = Object.freeze(["acs", "files_sha256", "gates", "stamp_sha256"]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const AC_ID_RE = /^AC-[1-9][0-9]*$/;
const MAX_TEST_ID = 4096;
const HEX64_RE = /^[0-9a-f]{64}$/;
/** One frontmatter scalar by exact key, quotes and an inline comment stripped. */
function scalar(raw, key) {
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (m && m[1] === key)
      return m[2]
        .replace(/(^|\s)#.*$/, "")
        .trim()
        .replace(/^["']|["']$/g, "");
  }
  return null;
}

/** AC-TESTS.md's recorded facts — its spec pin, its `## Files` digests, its own digest, and the mapped levels — without
 *  the test-infrastructure pin. Returns `{ok, spec, files, mapping, levels}` or a refusal. `levels` is null when the
 *  `## Mapping` is not usable (acRowsOf); only `buildLock` needs it. */
function mappingFacts(name, base, root) {
  if (typeof name !== "string" || !SLUG_RE.test(name)) return { ok: false, reason: `<name> must be a plain slug matching ${SLUG_RE}` };
  const mappingPath = join(base, name, MAPPING_NAME);
  let text;
  try {
    text = readFileSync(resolve(root, mappingPath), "utf8");
  } catch (e) {
    return { ok: false, reason: `${mappingPath} is not readable: ${e.code ?? e.message}` };
  }
  const fm = matchFrontmatter(text);
  const spec_id = fm ? scalar(fm[1], "spec_id") : null;
  const spec_content_hash = fm ? scalar(fm[1], "spec_content_hash") : null;
  if (!spec_id || !spec_content_hash || !HEX64_RE.test(spec_content_hash)) {
    return { ok: false, reason: `${mappingPath} carries no spec_id / 64-hex spec_content_hash frontmatter` };
  }
  const parsed = pathsFromPlanFiles(text);
  if (!parsed.ok || parsed.value.length === 0) return { ok: false, reason: `${mappingPath} has no \`## Files\` entries` };
  const files = [];
  for (const path of [...new Set(parsed.value)].sort()) {
    const sha256 = sha256RegularFile(resolve(root, path));
    if (sha256 === null) return { ok: false, reason: `${path} (listed in ${MAPPING_NAME}) is missing or not a regular file` };
    files.push({ path, sha256 });
  }
  const mappingSha = sha256RegularFile(resolve(root, mappingPath));
  if (mappingSha === null) return { ok: false, reason: `${mappingPath} is not a regular file (a symlink is refused)` };
  const rows = acRowsOf(text);
  const levels = rows.ok ? [...new Set(rows.rows.map((r) => r.level))].sort() : null;
  return { ok: true, spec: { spec_id, spec_content_hash }, files, mapping: { path: mappingPath, sha256: mappingSha }, levels };
}

/** Build the test-first lock for feature `name`: AC-TESTS.md's facts plus the test-infrastructure pin over the tree at
 *  `root` (test-infra-core.mjs). Returns `{ok, lock}` or a refusal. `root` is required (L41). */
export function buildLock(name, base, root) {
  if (typeof root !== "string" || root === "") throw new TypeError("buildLock: `root` must be a non-empty string");
  const f = mappingFacts(name, base, root);
  if (!f.ok) return f;
  if (f.levels === null) return { ok: false, reason: `${f.mapping.path} has no usable \`## Mapping\` — run check-ac-tests.mjs` };
  const pin = computeTestInfra({ root, levels: f.levels });
  if (!pin.ok) return { ok: false, reason: `the test infrastructure cannot be pinned: ${pin.reason}` };
  return {
    ok: true,
    lock: {
      schema: SCHEMA,
      feature: name,
      mode: "test-first",
      spec: f.spec,
      mapping: f.mapping,
      files: f.files,
      bootstrap: null,
      red_run: null,
      test_infra: pin.pin,
    },
  };
}

/** Read SPEC.md's pin and its bootstrap facts: `{ok, spec, kind, levels}` or a refusal. The kind and the levels come
 *  from spec-template-core.mjs — the readings check-spec.mjs and check-ac-tests.mjs use — never re-parsed here. */
export function readSpecFacts(name, base, root) {
  const specPath = join(base, name, SPEC_NAME);
  let text;
  try {
    text = readFileSync(resolve(root, specPath), "utf8");
  } catch (e) {
    return { ok: false, reason: `${specPath} is not readable: ${e.code ?? e.message}` };
  }
  const fm = matchFrontmatter(text);
  const spec_id = fm ? scalar(fm[1], "spec_id") : null;
  const spec_content_hash = fm ? scalar(fm[1], "spec_content_hash") : null;
  if (!spec_id || !spec_content_hash || !HEX64_RE.test(spec_content_hash)) {
    return { ok: false, reason: `${specPath} carries no spec_id / 64-hex spec_content_hash (is it Approved?)` };
  }
  const ac = specAcceptanceCriteria(text);
  const levels = [...new Set(ac.items.map((i) => i.level))].sort();
  const usable = ac.templated && ac.sections === 1 && ac.items.length > 0 && !levels.includes(null);
  return { ok: true, spec: { spec_id, spec_content_hash }, kind: ac.templated ? ac.kind : "legacy", levels: usable ? levels : null };
}

/** Is SPEC.md Approved and un-drifted? SHELLED to check-spec-approved.mjs (P3 — the one implementation of that
 *  verdict), because a bootstrap lock has no AC-TESTS.md for check-ac-tests.mjs to bind the pin through (REVIEW
 *  finding 3: without this, a Draft with an invented pin got a GREEN bootstrap lock). A reason, or null. */
function specApprovalError(name, base, root) {
  const specPath = join(base, name, SPEC_NAME);
  const r = spawnSync(process.execPath, [CHECK_SPEC_APPROVED, resolve(root, specPath)], { encoding: "utf8" });
  if (r.error) return `could not run check-spec-approved.mjs: ${r.error.message}`;
  return r.status === 0 ? null : `${specPath} is not an Approved, un-drifted SPEC (check-spec-approved.mjs exit ${r.status})`;
}

/** The BOOTSTRAP lock for a `spec_kind: test-infra` SPEC: no mapping, no files, no red run — the levels the setup
 *  increment is for, and SPEC.md's pin. Refuses when the SPEC is not test-infra, or when an AC-TESTS.md exists. */
export function buildBootstrapLock(name, base, root) {
  if (typeof root !== "string" || root === "") throw new TypeError("buildBootstrapLock: `root` must be a non-empty string");
  if (typeof name !== "string" || !SLUG_RE.test(name)) return { ok: false, reason: `<name> must be a plain slug matching ${SLUG_RE}` };
  const facts = readSpecFacts(name, base, root);
  if (!facts.ok) return facts;
  const approval = specApprovalError(name, base, root);
  if (approval) return { ok: false, reason: approval };
  if (facts.kind !== "test-infra")
    return { ok: false, reason: `the SPEC is not \`spec_kind: test-infra\` (${facts.kind ?? "an invalid spec_kind"}) — use --write` };
  if (facts.levels === null)
    return { ok: false, reason: "the SPEC's Acceptance Criteria are absent or a verify level is malformed — run check-spec.mjs" };
  if (readFileSafe(resolve(root, join(base, name, MAPPING_NAME))) !== null)
    return { ok: false, reason: `a bootstrap increment has no ${MAPPING_NAME}, but one exists` };
  return {
    ok: true,
    lock: {
      schema: SCHEMA,
      feature: name,
      mode: "bootstrap",
      spec: facts.spec,
      mapping: null,
      files: [],
      bootstrap: { spec_kind: "test-infra", levels: facts.levels },
      red_run: null,
      test_infra: null,
    },
  };
}

/** The digest `red_run.files_sha256` binds the evidence to: the lock's `files` section, one `path\0sha256\n` per entry. */
export function filesDigest(files) {
  return createHash("sha256")
    .update(files.map((f) => `${f.path}\0${f.sha256}\n`).join(""))
    .digest("hex");
}

const exactKeys = (o, keys) =>
  o !== null && typeof o === "object" && !Array.isArray(o) && Object.keys(o).sort().join(",") === [...keys].sort().join(",");

const isSorted = (xs) => xs.join("\n") === [...xs].sort().join("\n");
const isUnique = (xs) => new Set(xs).size === xs.length;
const acNum = (id) => Number(id.slice(3));

function cleanString(v, max) {
  if (typeof v !== "string" || v.length === 0 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

/** `red_run`'s shape, closed at every level. A reason string, or null. */
function redRunShapeError(r) {
  if (!exactKeys(r, RED_RUN_KEYS)) return `red_run is not exactly {${RED_RUN_KEYS.join(", ")}}`;
  for (const k of ["stamp_sha256", "files_sha256"]) if (!HEX64_RE.test(r[k] ?? "")) return `red_run.${k} is not a sha256`;
  if (!Array.isArray(r.gates) || r.gates.length === 0) return "red_run.gates is not a non-empty array";
  for (const g of r.gates) {
    if (!exactKeys(g, ["gate", "results_sha256"]) || !RESULTS_GATES.includes(g.gate) || !HEX64_RE.test(g.results_sha256 ?? ""))
      return "a red_run.gates entry is not exactly {gate ∈ the results gates, results_sha256}";
  }
  const gates = r.gates.map((g) => g.gate);
  if (!isUnique(gates) || !isSorted(gates)) return "red_run.gates is not unique and sorted by gate";
  if (!Array.isArray(r.acs) || r.acs.length === 0) return "red_run.acs is not a non-empty array";
  for (const a of r.acs) {
    if (!exactKeys(a, ["id", "tests"]) || typeof a.id !== "string" || !AC_ID_RE.test(a.id))
      return "a red_run.acs entry is not exactly {id: AC-<n>, tests}";
    if (!Array.isArray(a.tests) || a.tests.length === 0 || !a.tests.every((t) => cleanString(t, MAX_TEST_ID)))
      return `red_run.acs ${a.id}: tests is not a non-empty array of clean test ids`;
    if (!isUnique(a.tests) || !isSorted(a.tests)) return `red_run.acs ${a.id}: tests are not unique and sorted`;
  }
  const ids = r.acs.map((a) => a.id);
  if (
    !isUnique(ids) ||
    ids.map(acNum).join(",") !==
      ids
        .map(acNum)
        .sort((x, y) => x - y)
        .join(",")
  )
    return "red_run.acs is not unique and sorted by AC number";
  return null;
}

function filesShapeError(files) {
  if (!Array.isArray(files) || files.length === 0) return "files is not a non-empty array";
  for (const f of files) {
    if (!exactKeys(f, ["path", "sha256"]) || typeof f.path !== "string" || !HEX64_RE.test(f.sha256 ?? ""))
      return "a files entry is not exactly {path, sha256}";
  }
  const paths = files.map((f) => f.path);
  if (!isUnique(paths)) return "files lists a path twice";
  if (!isSorted(paths)) return "files is not sorted by path";
  return null;
}

/** Shape-check a parsed lock — closed at EVERY level (L36), per schema and mode. Returns a reason string, or null when
 *  well-formed. A section a schema or mode does not fill must be `null` (or `[]` for a bootstrap's `files`), so a
 *  forged section cannot pass as this version's. */
export function lockShapeError(lock, name) {
  if (lock === null || typeof lock !== "object" || Array.isArray(lock)) return "the lock is not a JSON object";
  const v1 = lock.schema === SCHEMA_V1;
  if (!v1 && lock.schema !== SCHEMA && lock.schema !== SCHEMA_V2)
    return `schema is ${JSON.stringify(lock.schema)}, not one of ${[SCHEMA, SCHEMA_V2, SCHEMA_V1].map((x) => JSON.stringify(x)).join(", ")}`;
  const keys = v1 ? LOCK_KEYS_V1 : LOCK_KEYS;
  if (!exactKeys(lock, keys)) return `the lock's keys are {${Object.keys(lock).sort().join(", ")}}, not {${keys.join(", ")}}`;
  if (lock.feature !== name) return `the lock is for feature ${JSON.stringify(lock.feature)}, not ${JSON.stringify(name)}`;
  if (
    !exactKeys(lock.spec, ["spec_id", "spec_content_hash"]) ||
    typeof lock.spec.spec_id !== "string" ||
    !HEX64_RE.test(lock.spec.spec_content_hash ?? "")
  )
    return "spec is not exactly {spec_id, spec_content_hash}";
  const mode = v1 ? "test-first" : lock.mode;
  if (!MODES.includes(mode)) return `mode is ${JSON.stringify(lock.mode)}, not one of {${MODES.join(", ")}}`;
  // The pin exists only on a /3 test-first lock, and there it is REQUIRED — a /3 test-first lock without it would
  // read as "pinned" to a reader that checks the schema alone.
  if (lock.schema === SCHEMA && mode === "test-first") {
    const pe = pinShapeError(lock.test_infra);
    if (pe) return pe;
  } else if (lock.test_infra !== null) return `test_infra must be null under ${lock.schema} ${mode}`;
  if (mode === "bootstrap") {
    if (lock.mapping !== null) return "a bootstrap lock's mapping must be null";
    if (!Array.isArray(lock.files) || lock.files.length !== 0) return "a bootstrap lock's files must be []";
    if (lock.red_run !== null) return "a bootstrap lock has no red_run";
    const b = lock.bootstrap;
    if (!exactKeys(b, ["levels", "spec_kind"]) || b.spec_kind !== "test-infra")
      return 'bootstrap is not exactly {spec_kind: "test-infra", levels}';
    if (
      !Array.isArray(b.levels) ||
      b.levels.length === 0 ||
      !b.levels.every((l) => LEVELS.includes(l)) ||
      !isUnique(b.levels) ||
      !isSorted(b.levels)
    )
      return `bootstrap.levels is not a non-empty, sorted, unique subset of {${LEVELS.join(", ")}}`;
    return null;
  }
  if (!exactKeys(lock.mapping, ["path", "sha256"]) || typeof lock.mapping.path !== "string" || !HEX64_RE.test(lock.mapping.sha256 ?? ""))
    return "mapping is not exactly {path, sha256}";
  const fe = filesShapeError(lock.files);
  if (fe) return fe;
  if (v1) return lock.red_run === null ? null : `red_run must be null under ${SCHEMA_V1}`;
  if (lock.bootstrap !== null) return "a test-first lock's bootstrap must be null";
  return lock.red_run === null ? null : redRunShapeError(lock.red_run);
}

/** A path's real location when it exists (so `/var/…` and `/private/var/…` agree on macOS), else its resolved form. */
function canon(p) {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

/** A lock's mode: `test-first` for a /1 lock (it had no other), else its `mode` field. */
export function modeOf(lock) {
  return lock.schema === SCHEMA_V1 ? "test-first" : lock.mode;
}

/** PURE: a BOOTSTRAP lock against SPEC.md — the pin, the kind and the levels it recorded, and no AC-TESTS.md. The
 *  approval half (a spawn) is checkLock's, not this part's. */
export function bootstrapReds(lock, name, base, root) {
  const reds = [];
  const facts = readSpecFacts(name, base, root);
  if (!facts.ok) return [facts.reason];
  if (facts.kind !== "test-infra") reds.push(`${SPEC_NAME} is no longer \`spec_kind: test-infra\` — the bootstrap lock does not apply`);
  if (facts.spec.spec_id !== lock.spec.spec_id || facts.spec.spec_content_hash !== lock.spec.spec_content_hash)
    reds.push(`${SPEC_NAME}'s spec_id / spec_content_hash changed since the lock was written`);
  if (JSON.stringify(facts.levels) !== JSON.stringify(lock.bootstrap.levels))
    reds.push(`${SPEC_NAME}'s criteria levels changed since the lock was written`);
  if (readFileSafe(resolve(root, join(base, name, MAPPING_NAME))) !== null)
    reds.push(`${join(base, name, MAPPING_NAME)} exists, but a bootstrap increment has no mapping`);
  return reds;
}

/** PURE: a TEST-FIRST lock's files half — AC-TESTS.md's bytes and path, every pinned test file, the `## Files` set, and
 *  the spec pin AC-TESTS.md carries. Each RED names a PATH, never content. */
export function testFirstReds(lock, name, base, root) {
  const reds = [];
  const fresh = mappingFacts(name, base, root);
  const mappingPath = join(base, name, MAPPING_NAME);
  if (sha256RegularFile(resolve(root, mappingPath)) !== lock.mapping.sha256) reds.push(`${mappingPath} changed since the lock was written`);
  if (canon(resolve(root, lock.mapping.path)) !== canon(resolve(root, mappingPath)))
    reds.push(`the lock's mapping path ${JSON.stringify(lock.mapping.path)} is not ${mappingPath}`);
  const recorded = new Map(lock.files.map((f) => [f.path, f.sha256]));
  for (const [path, sha] of recorded) {
    const now = sha256RegularFile(resolve(root, path));
    if (now === null) reds.push(`${path} is missing or no longer a regular file`);
    else if (now !== sha) reds.push(`${path} changed since the lock was written`);
  }
  // The set of test files is part of the pin: a `## Files` entry added or removed without a rewrite is a RED.
  const listed = pathsFromPlanFiles(readFileSafe(resolve(root, mappingPath)) ?? "");
  const now = new Set(listed.ok ? listed.value : []);
  for (const p of now) if (!recorded.has(p)) reds.push(`${p} is in ${MAPPING_NAME} \`## Files\` but not in the lock`);
  for (const p of recorded.keys()) if (!now.has(p)) reds.push(`${p} is in the lock but no longer in ${MAPPING_NAME} \`## Files\``);
  if (fresh.ok && fresh.spec.spec_content_hash !== lock.spec.spec_content_hash)
    reds.push(`${MAPPING_NAME}'s spec_content_hash changed since the lock was written`);
  return reds;
}

/** PURE: a test-first lock's `red_run` — bound to the lock's files and to the mapped ACs when present; with
 *  `requireRedRun`, present at all. */
export function redRunReds(lock, name, base, root, { requireRedRun = false } = {}) {
  const reds = [];
  if (lock.red_run) {
    if (lock.red_run.files_sha256 !== filesDigest(lock.files)) reds.push("red_run is not bound to the lock's files (files_sha256 differs)");
    const mapped = [...new Set(mappingIds(readFileSafe(resolve(root, join(base, name, MAPPING_NAME))) ?? ""))];
    if (JSON.stringify(lock.red_run.acs.map((a) => a.id)) !== JSON.stringify(mapped))
      reds.push(`red_run's ACs are not ${MAPPING_NAME}'s mapped ACs`);
  }
  if (requireRedRun && !lock.red_run) {
    reds.push(
      lock.schema === SCHEMA_V1
        ? `the lock is ${SCHEMA_V1}, which has no red run — re-run /pharn-test`
        : "no red_run is recorded — the AC tests have not been shown to fail before the build (run /pharn-test's red run)"
    );
  }
  return reds;
}

/** PURE: the test-infrastructure pin, recomputed over `root` (test-infra-core.mjs). A lock with no pin (/2, /1) has
 *  nothing to hold here — the AC gate names that absence `test-infra-unpinned`; `--check` does not. */
export function pinReds(lock, root) {
  if (lock.test_infra === null) return [];
  return testInfraReds({ recorded: lock.test_infra, root }).map((d) => `test infrastructure changed — ${d}`);
}

/** Compare a recorded lock with the tree. Returns the RED lines (empty = GREEN). Each names a PATH or a gate id, never
 *  content. The union of the pure parts above, plus the bootstrap APPROVAL spawn. `requireRedRun`: a test-first lock
 *  must carry `red_run` (a /1 lock never can), and a BOOTSTRAP lock — which has no red run at all — fails it too unless
 *  `allowBootstrap` says the caller accepts the weaker evidence (REVIEW finding 2: exit 0 must never let a caller
 *  mistake a bootstrap for a recorded red run). Test-file paths and the pin resolve against the current directory. */
export function checkLock(lock, name, base, { requireRedRun = false, allowBootstrap = false, root } = {}) {
  if (typeof root !== "string" || root === "") throw new TypeError("checkLock: `root` must be a non-empty string");
  if (modeOf(lock) === "bootstrap") {
    const facts = readSpecFacts(name, base, root);
    const approval = facts.ok ? specApprovalError(name, base, root) : null;
    const reds = bootstrapReds(lock, name, base, root);
    if (approval) reds.unshift(approval);
    if (requireRedRun && !allowBootstrap) {
      reds.push("the lock is a BOOTSTRAP lock: no red run exists — pass --allow-bootstrap only where a bootstrap is accepted");
    }
    return reds;
  }
  return [...testFirstReds(lock, name, base, root), ...redRunReds(lock, name, base, root, { requireRedRun }), ...pinReds(lock, root)];
}

/** The mapped AC ids in AC-number order (the order `red_run.acs` is written in). */
function mappingIds(text) {
  const rows = acRowsOf(text);
  return rows.ok ? rows.rows.map((r) => r.id).sort((a, b) => acNum(a) - acNum(b)) : [];
}

/** A file's text, or null when it cannot be read (absent included). */
function readFileSafe(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function writeLock(lockPath, lock) {
  const tmp = `${lockPath}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(lock, null, 2) + "\n");
  renameSync(tmp, lockPath);
}

/** Read and shape-check the lock: `{ok, lock}` or `{ok: false, line}` (the UNUSABLE line to print, exit 2). */
function loadLock(lockPath, name) {
  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, "utf8"));
  } catch (e) {
    return { ok: false, line: `UNUSABLE — ${lockPath} is missing or not JSON: ${e.code ?? e.message}` };
  }
  const shape = lockShapeError(lock, name);
  if (shape) return { ok: false, line: `UNUSABLE — ${lockPath}: ${shape}` };
  return { ok: true, lock };
}

function printReds(reds, what) {
  for (const r of reds) console.log(`RED — ${r}`);
  console.log(`\nRED — ${reds.length} ${what} failed`);
}

/** `--record-red-run`: re-derive the red run's verdict over `<out>` and, only when it is GREEN and the lock checks
 *  GREEN, write the evidence into `red_run`. The tree root is the current directory, as for the test files. */
function recordRedRun(name, base, lockPath, out) {
  const loaded = loadLock(lockPath, name);
  if (!loaded.ok) {
    console.log(loaded.line);
    return 2;
  }
  const lock = loaded.lock;
  if (lock.schema !== SCHEMA || lock.mode !== "test-first") {
    // A /2 test-first lock has no test-infrastructure pin, so a red run recorded on it could never pass /pharn-verify's
    // AC gate (`test-infra-unpinned`): refused here, where re-running --write is still cheap.
    console.log(
      `UNUSABLE — ${lockPath} is ${lock.schema}${lock.mode ? ` ${lock.mode}` : ""}; a red run is recorded on an ${SCHEMA} test-first lock — re-run --write`
    );
    return 2;
  }
  const reds = checkLock(lock, name, base, { root: process.cwd() });
  if (reds.length) {
    printReds(reds, "AC-tests lock check(s)");
    return 1;
  }
  const r = evaluateRedRun({ acTestsPath: join(base, name, MAPPING_NAME), outDir: out, root: process.cwd() });
  if (!r.ok) {
    console.log(`UNUSABLE — ${r.reason}`);
    return 2;
  }
  const bad = r.acs.filter((a) => a.reason !== null);
  if (bad.length) {
    printReds(
      bad.map((a) => `${a.reason}: ${a.id} (${a.level}) — ${a.detail}`),
      "AC(s) not red as required — nothing recorded"
    );
    return 1;
  }
  lock.red_run = {
    stamp_sha256: r.stamp_sha256,
    files_sha256: filesDigest(lock.files),
    gates: r.gates,
    acs: [...r.acs].sort((a, b) => acNum(a.id) - acNum(b.id)).map((a) => ({ id: a.id, tests: a.tests })),
  };
  const shape = lockShapeError(lock, name);
  if (shape) {
    // A matched test id the lock cannot hold (a control character, over-long) — refused rather than truncated.
    console.log(`UNUSABLE — the red run's evidence does not fit the lock: ${shape}`);
    return 2;
  }
  writeLock(lockPath, lock);
  console.log(`RECORDED — ${lockPath}: red_run for ${r.acs.length} AC(s) over gate(s) ${r.gates.map((g) => g.gate).join(", ")}`);
  return 0;
}

function main(argv) {
  const args = argv.slice(2);
  const mode = args[0];
  const name = args[1];
  const value = (flagName) => {
    const i = args.indexOf(flagName);
    if (i === -1) return undefined;
    const v = args[i + 1];
    return v && !v.startsWith("--") ? v : null;
  };
  const base = value("--base") === undefined ? DEFAULT_BASE : value("--base");
  const MODES_CLI = ["--write", "--write-bootstrap", "--record-red-run", "--check"];
  const usage = () => {
    console.log(
      "usage: ac-tests-lock.mjs (--write | --write-bootstrap) <name> [--base <features-dir>] | --record-red-run <name> --out <dir> " +
        "[--base <features-dir>] | --check <name> [--require-red-run [--allow-bootstrap]] [--base <features-dir>]"
    );
    return 2;
  };
  if (!MODES_CLI.includes(mode) || !name || name.startsWith("--") || !base) return usage();
  if (args.includes("--require-red-run") && mode !== "--check") return usage();
  if (args.includes("--allow-bootstrap") && !args.includes("--require-red-run")) return usage();
  const lockPath = join(base, name, LOCK_NAME);
  if (mode === "--write" || mode === "--write-bootstrap") {
    const built = mode === "--write" ? buildLock(name, base, process.cwd()) : buildBootstrapLock(name, base, process.cwd());
    if (!built.ok) {
      console.log(`UNUSABLE — ${built.reason}`);
      return 2;
    }
    writeLock(lockPath, built.lock);
    console.log(
      mode === "--write"
        ? `WROTE — ${lockPath}: ${built.lock.files.length} test file(s) pinned against ${MAPPING_NAME}, and the test infrastructure: ` +
            `${built.lock.test_infra.gates.length} gate(s), ${built.lock.test_infra.configs.length} runner config(s)`
        : `WROTE — ${lockPath}: BOOTSTRAP (spec_kind: test-infra) for level(s) ${built.lock.bootstrap.levels.join(", ")} — no tests before the build, WEAKER than test-first`
    );
    return 0;
  }
  if (mode === "--record-red-run") {
    const out = value("--out");
    if (!out) return usage();
    return recordRedRun(name, base, lockPath, out);
  }
  const loaded = loadLock(lockPath, name);
  if (!loaded.ok) {
    console.log(loaded.line);
    return 2;
  }
  const lock = loaded.lock;
  const reds = checkLock(lock, name, base, {
    root: process.cwd(),
    requireRedRun: args.includes("--require-red-run"),
    allowBootstrap: args.includes("--allow-bootstrap"),
  });
  if (reds.length) {
    printReds(reds, "AC-tests lock check(s)");
    return 1;
  }
  if (modeOf(lock) === "bootstrap") {
    console.log(
      `GREEN — ${lockPath}: BOOTSTRAP for level(s) ${lock.bootstrap.levels.join(", ")}; SPEC.md still test-infra with the same pin. ` +
        `NOTE (P0): no AC test ran before the build — weaker than test-first.`
    );
    return 0;
  }
  const red = lock.red_run ? `; red_run recorded for ${lock.red_run.acs.length} AC(s)` : "; no red_run recorded";
  const infra = lock.test_infra ? "; the test-infrastructure pin holds" : `; no test-infrastructure pin (${lock.schema})`;
  console.log(
    `GREEN — ${lockPath}: ${lock.files.length} test file(s) and ${MAPPING_NAME} match the lock${red}${infra}. NOTE (P0): the files are the recorded ones — never that the tests are right.`
  );
  return 0;
}

if (import.meta.main) process.exit(main(process.argv));
