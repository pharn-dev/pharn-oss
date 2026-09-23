#!/usr/bin/env node
// pharn/floor/ac-tests-lock.mjs — write and check `pharn/features/<name>/AC-TESTS.lock.json`, the record that pins
// the AC tests `/pharn-test` wrote. Contract: pharn/pharn-contracts/ac-tests.md ("The lock").
//
// Every digest in the lock is computed HERE, never typed by a model (PHARN's own build-loop lesson L22). One lock per
// feature, with NAMED sections, so later stages extend this record instead of adding a second one (L35):
//   schema    "ac-tests-lock/1"
//   feature   the slug
//   spec      { spec_id, spec_content_hash } — AC-TESTS.md's own frontmatter, which the mapping checker bound to
//             the current Approved SPEC through check-plan-spec-agree.mjs
//   mapping   { path, sha256 } — AC-TESTS.md's bytes
//   files     [{ path, sha256 }] — every `## Files` entry of AC-TESTS.md, sorted by path
//   red_run   null — reserved for the red-run evidence a later stage adds
//   test_infra null — reserved for the test-infrastructure pin a later stage adds
// `--write` always resets the two reserved sections to null: a rewrite means the tests changed, so any evidence
// about the old tests is stale by construction.
//
// FLOOR (primitive #2, content-hash): `--check` recomputes every recorded digest and the set of `## Files` paths
// and REDs naming the PATH, never the file's content. NOT GUARANTEED (P0): that the tests are good or right, that
// `/pharn-test` wrote them from SPEC + PLAN alone, or who wrote the lock — it is a file in the writable tree, and a
// self-consistent rewrite passes (L43). What `--check` proves is that the files on disk are the ones recorded.
//
// TRUST (P2): the test files are hashed, never read as text; AC-TESTS.md is parsed only for two frontmatter scalars
// and its `## Files` paths (the same parser the writes-scope setter's rule is held to).
//
// Usage:
//   node pharn/floor/ac-tests-lock.mjs --write <name> [--base <features-dir>]
//   node pharn/floor/ac-tests-lock.mjs --check <name> [--base <features-dir>]
//     <features-dir> defaults to `pharn/features`; test-file paths resolve against the current directory (the
//     project root), exactly as the writes-scope setter resolves them.
//
// Exit: --write  0 written · 2 refused (bad usage, AC-TESTS.md missing / not a regular file / no pin / no
//                  `## Files`, a listed file missing or not a regular file)
//       --check  0 GREEN · 1 RED (a pinned file or AC-TESTS.md changed, went missing or is no longer a regular
//                  file; a `## Files` entry added or dropped; the spec pin changed) · 2 unusable (bad usage, no lock,
//                  a lock that is not JSON or not the closed shape)
// Test-file paths resolve against the CURRENT directory (the project root), as the setter resolves them; `--base`
// moves only where AC-TESTS.md and the lock live, and the mapping path is compared resolved, never as spelled.

import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  renameSync,
  writeFileSync,
  constants as fsConstants,
} from "node:fs";
import { join, resolve } from "node:path";
import { matchFrontmatter } from "./frontmatter-core.mjs";
import { pathsFromPlanFiles } from "./plan-files-core.mjs";

export const SCHEMA = "ac-tests-lock/1";
export const LOCK_NAME = "AC-TESTS.lock.json";
export const MAPPING_NAME = "AC-TESTS.md";
export const DEFAULT_BASE = "pharn/features";
/** The lock's closed top-level key set (L36 — a presence set would admit a variant spelling). */
export const LOCK_KEYS = Object.freeze(["feature", "files", "mapping", "red_run", "schema", "spec", "test_infra"]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const OPEN_FLAGS = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;
const CHUNK = 1 << 20;

/** sha256 of a REGULAR file, read without following a link or blocking; `null` for anything else or absent. */
export function sha256RegularFile(path) {
  let fd;
  try {
    fd = openSync(path, OPEN_FLAGS);
  } catch {
    return null;
  }
  try {
    if (!fstatSync(fd).isFile()) return null;
    const h = createHash("sha256");
    const buf = Buffer.alloc(CHUNK);
    for (;;) {
      const n = readSync(fd, buf, 0, CHUNK, null);
      if (n === 0) break;
      h.update(buf.subarray(0, n));
    }
    return h.digest("hex");
  } finally {
    closeSync(fd);
  }
}

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

/** Build the lock object for feature `name` (pure over the files it reads). Returns `{ok, lock}` or a refusal. */
export function buildLock(name, base) {
  if (typeof name !== "string" || !SLUG_RE.test(name)) return { ok: false, reason: `<name> must be a plain slug matching ${SLUG_RE}` };
  const mappingPath = join(base, name, MAPPING_NAME);
  let text;
  try {
    text = readFileSync(mappingPath, "utf8");
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
    const sha256 = sha256RegularFile(path);
    if (sha256 === null) return { ok: false, reason: `${path} (listed in ${MAPPING_NAME}) is missing or not a regular file` };
    files.push({ path, sha256 });
  }
  const mappingSha = sha256RegularFile(mappingPath);
  if (mappingSha === null) return { ok: false, reason: `${mappingPath} is not a regular file (a symlink is refused)` };
  return {
    ok: true,
    lock: {
      schema: SCHEMA,
      feature: name,
      spec: { spec_id, spec_content_hash },
      mapping: { path: mappingPath, sha256: mappingSha },
      files,
      red_run: null,
      test_infra: null,
    },
  };
}

const exactKeys = (o, keys) =>
  o !== null && typeof o === "object" && !Array.isArray(o) && Object.keys(o).sort().join(",") === [...keys].sort().join(",");

/** Shape-check a parsed lock — closed at EVERY level (L36). Returns a reason string, or null when well-formed. Under
 *  `ac-tests-lock/1`, `red_run` and `test_infra` must be `null`: the stage that fills one bumps the schema, so a
 *  forged section cannot pass as this version's. */
export function lockShapeError(lock, name) {
  if (lock === null || typeof lock !== "object" || Array.isArray(lock)) return "the lock is not a JSON object";
  if (!exactKeys(lock, LOCK_KEYS)) return `the lock's keys are {${Object.keys(lock).sort().join(", ")}}, not {${LOCK_KEYS.join(", ")}}`;
  if (lock.schema !== SCHEMA) return `schema is ${JSON.stringify(lock.schema)}, not ${JSON.stringify(SCHEMA)}`;
  if (lock.feature !== name) return `the lock is for feature ${JSON.stringify(lock.feature)}, not ${JSON.stringify(name)}`;
  if (
    !exactKeys(lock.spec, ["spec_id", "spec_content_hash"]) ||
    typeof lock.spec.spec_id !== "string" ||
    !HEX64_RE.test(lock.spec.spec_content_hash ?? "")
  )
    return "spec is not exactly {spec_id, spec_content_hash}";
  if (!exactKeys(lock.mapping, ["path", "sha256"]) || typeof lock.mapping.path !== "string" || !HEX64_RE.test(lock.mapping.sha256 ?? ""))
    return "mapping is not exactly {path, sha256}";
  if (!Array.isArray(lock.files) || lock.files.length === 0) return "files is not a non-empty array";
  for (const f of lock.files) {
    if (!exactKeys(f, ["path", "sha256"]) || typeof f.path !== "string" || !HEX64_RE.test(f.sha256 ?? ""))
      return "a files entry is not exactly {path, sha256}";
  }
  const paths = lock.files.map((f) => f.path);
  if (new Set(paths).size !== paths.length) return "files lists a path twice";
  if (paths.join("\n") !== [...paths].sort().join("\n")) return "files is not sorted by path";
  if (lock.red_run !== null || lock.test_infra !== null) return `red_run and test_infra must be null under ${SCHEMA}`;
  return null;
}

/** A path's real location when it exists (so `/var/…` and `/private/var/…` agree on macOS), else its resolved form. */
function canon(p) {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

/** Compare a recorded lock with the tree. Returns the RED lines (empty = GREEN). Each names a PATH, never content. */
export function checkLock(lock, name, base) {
  const reds = [];
  const fresh = buildLock(name, base);
  const mappingPath = join(base, name, MAPPING_NAME);
  if (sha256RegularFile(mappingPath) !== lock.mapping.sha256) reds.push(`${mappingPath} changed since the lock was written`);
  if (canon(lock.mapping.path) !== canon(mappingPath))
    reds.push(`the lock's mapping path ${JSON.stringify(lock.mapping.path)} is not ${mappingPath}`);
  const recorded = new Map(lock.files.map((f) => [f.path, f.sha256]));
  for (const [path, sha] of recorded) {
    const now = sha256RegularFile(path);
    if (now === null) reds.push(`${path} is missing or no longer a regular file`);
    else if (now !== sha) reds.push(`${path} changed since the lock was written`);
  }
  // The set of test files is part of the pin: a `## Files` entry added or removed without a rewrite is a RED.
  const listed = pathsFromPlanFiles(readFileSafe(mappingPath));
  const now = new Set(listed.ok ? listed.value : []);
  for (const p of now) if (!recorded.has(p)) reds.push(`${p} is in ${MAPPING_NAME} \`## Files\` but not in the lock`);
  for (const p of recorded.keys()) if (!now.has(p)) reds.push(`${p} is in the lock but no longer in ${MAPPING_NAME} \`## Files\``);
  if (fresh.ok && fresh.lock.spec.spec_content_hash !== lock.spec.spec_content_hash)
    reds.push(`${MAPPING_NAME}'s spec_content_hash changed since the lock was written`);
  return reds;
}

function readFileSafe(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function main(argv) {
  const args = argv.slice(2);
  const mode = args[0];
  const name = args[1];
  const bi = args.indexOf("--base");
  const base = bi === -1 ? DEFAULT_BASE : args[bi + 1];
  if ((mode !== "--write" && mode !== "--check") || !name || !base || base.startsWith("--")) {
    console.log("usage: ac-tests-lock.mjs (--write | --check) <name> [--base <features-dir>]");
    return 2;
  }
  const lockPath = join(base, name, LOCK_NAME);
  if (mode === "--write") {
    const built = buildLock(name, base);
    if (!built.ok) {
      console.log(`UNUSABLE — ${built.reason}`);
      return 2;
    }
    const tmp = `${lockPath}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(built.lock, null, 2) + "\n");
    renameSync(tmp, lockPath);
    console.log(`WROTE — ${lockPath}: ${built.lock.files.length} test file(s) pinned against ${MAPPING_NAME}`);
    return 0;
  }
  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, "utf8"));
  } catch (e) {
    console.log(`UNUSABLE — ${lockPath} is missing or not JSON: ${e.code ?? e.message}`);
    return 2;
  }
  const shape = lockShapeError(lock, name);
  if (shape) {
    console.log(`UNUSABLE — ${lockPath}: ${shape}`);
    return 2;
  }
  const reds = checkLock(lock, name, base);
  if (reds.length) {
    for (const r of reds) console.log(`RED — ${r}`);
    console.log(`\nRED — ${reds.length} AC-tests lock check(s) failed`);
    return 1;
  }
  console.log(
    `GREEN — ${lockPath}: ${lock.files.length} test file(s) and ${MAPPING_NAME} match the lock. NOTE (P0): the files are the recorded ones — never that the tests are right.`
  );
  return 0;
}

if (import.meta.main) process.exit(main(process.argv));
