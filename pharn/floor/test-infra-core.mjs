#!/usr/bin/env node
// pharn/floor/test-infra-core.mjs — the TEST-INFRASTRUCTURE PIN: the parts of a project, other than the AC tests
// themselves, that decide how those tests run and what they report. `/pharn-test`'s `ac-tests-lock.mjs --write` records
// it in the lock's `test_infra` section (schema `ac-tests-lock/3`); `--check` and `/pharn-verify`'s AC gate
// (ac-gate-core.mjs) recompute it from the live tree and compare. Contract: pharn/pharn-contracts/ac-tests.md,
// "The test-infrastructure pin".
//
// WHY (the queue's item 06, P7): the AC gate trusts a test's `passed` only because the test was pinned and shown red
// before the build. The lock pins the test FILES; without this pin a build could change what runs them — the `test`
// script, the runner's config, the per-test results format — and a pinned test would pass without its body ever
// changing. P3: this file changes when "what counts as test infrastructure" changes, and for no other reason.
//
// THE PIN, recomputed and compared EXACTLY (sets and values):
//   levels   the mapped AC levels the pin was taken for, sorted — recorded, so a recompute ranges over the SAME
//            candidate gates whatever the mapping reads later (a mapping change is the lock's files check, not this)
//   gates    for each gate id in the union of LEVEL_GATES over the mapped levels that package.json `scripts` HAS
//            (gate-run-core.mjs discoverGates, an own-property test): { id, script, pre, post, results } — `script`
//            is the script's VALUE; `pre` / `post` are the `pre<id>` / `post<id>` script values npm runs around it
//            implicitly (null when absent — grill G4); `results` is the `testResults` format test-results-core.mjs reads for that id, or its
//            refusal code (`not-configured` | `config-invalid`). Not the whole package.json: dependencies
//            legitimately change in a build.
//   configs  { path, sha256 } for every entry at the project ROOT whose name is in a CLOSED set (isRunnerConfigName):
//            vitest.config, vitest.workspace, vite.config, playwright.config or jest.config, with a js/mjs/cjs/ts/
//            mts/cts/json extension — matched FOLDED (NFC + full case folding, spec-template-core's foldName, the fold
//            the write guard and ac-tests-core's scopeKey use; 6.21.0). Why folded: vite and vitest find their config
//            by an existence check of the LOWERCASE name, so on a case-insensitive volume (APFS) `Vitest.config.mjs`
//            IS the runner's config — the review measured real vitest 5.0.1 loading one — and before 6.21.0 it was
//            never pinned. The recorded `path` is the on-disk spelling. Hashed WITHOUT following a link (O_NOFOLLOW): a
//            matching entry that is not a regular file — a symlink, a directory — cannot be pinned, and says so (L59:
//            a call that follows a link answers for the target, never for the link).
//
// THE SAME PREDICATE AT PLAN TIME (6.21.0): testInfraPathKind() classifies a PLAN.md `## Files` entry as the writes-scope
// setter scopes it — `config` (a root runner config: check-ac-tests.mjs REDs it as `test-infra-in-plan`, because every
// write the build could make there changes the pin) or `manifest` (package.json / pharn.config.json: an advisory NOTE
// only — the build may legitimately change a dependency, and the checker cannot see which part will change). One
// predicate, one list of manifest names (PIN_MANIFESTS), imported; never a second regex (L35/L36).
//
// WHAT IT DOES NOT CATCH (P0) — stated here in full, restated in the contract, cited elsewhere: a setup or helper file the config
// imports; configuration read from the environment; a config outside the project root, or under another name than the
// closed set (a name the modelled fold does not reach is not caught — fail-open; one it folds beyond the filesystem is
// pinned anyway — fail-closed, e.g. on a case-SENSITIVE filesystem a `Vitest.config.mjs` the runner does NOT load is
// still pinned); a `jest` key inside package.json; tsconfig; script CHAINING (`"test": "npm run test:unit"` pins the one
// line, not what `test:unit` runs); npm's own configuration (a project `.npmrc`'s `script-shell` or `node-options`
// changes what `npm run test` executes without touching a pinned byte); the runner's own version (dependencies are
// deliberately out). This list is the one copy; pharn/pharn-contracts/ac-tests.md restates it and every other surface
// cites that. A change it does catch is `test-infra-changed` whether or not it was legitimate. The remedy is a human:
// for an ACCIDENTAL change, set the build aside and re-run /pharn-test; for an INTENDED one, re-running /pharn-test
// cannot help (the rebuild makes the change again) — split it into a `spec_kind: test-infra` increment first.
// And it is AGREEMENT, never provenance (L43): a lock rewritten to match a changed tree passes.
//
// TRUST (P2): script values and config bytes are untrusted DATA — compared and hashed, never interpreted. A
// difference names the gate id or the config path, never the script text.

import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, openSync, readdirSync, readFileSync, readSync, constants as fsConstants } from "node:fs";
import { join } from "node:path";
import { LEVELS, scopedPath } from "./ac-tests-core.mjs";
import { LEVEL_GATES, discoverGates } from "./gate-run-core.mjs";
import { foldName } from "./spec-template-core.mjs";
import { CONFIG_FILE, formatFor, loadResultsConfig } from "./test-results-core.mjs";
import { RESULTS_FORMATS } from "./test-results-formats.mjs";

/** The closed set of root config names the pin covers, in FOLDED (lowercase) form — test it only through
 *  isRunnerConfigName, which folds the name first. */
export const CONFIG_NAME_RE =
  /^(?:vitest\.config|vitest\.workspace|vite\.config|playwright\.config|jest\.config)\.(?:js|mjs|cjs|ts|mts|cts|json)$/;
/** The npm manifest the level gates' scripts are read from. */
export const MANIFEST_FILE = "package.json";
/** The root files the pin reads VALUES from (the level gates' scripts; the `testResults` formats) — as opposed to the
 *  runner configs it hashes whole. */
export const PIN_MANIFESTS = Object.freeze([MANIFEST_FILE, CONFIG_FILE]);

/** Is `name` (one path segment) a runner config name the pin covers? Folded, so a case or Unicode-form variant of a
 *  member is a member (the one predicate — the listing, the shape check and the plan-time check all use it). */
export function isRunnerConfigName(name) {
  return typeof name === "string" && CONFIG_NAME_RE.test(foldName(name));
}

/**
 * Classify a PLAN.md `## Files` entry, read as the writes-scope setter scopes it (ac-tests-core scopedPath: annotation
 * stripped, placeholders/globs dropped): `"config"` — a ROOT runner config the pin hashes; `"manifest"` — a root file
 * the pin reads values from (PIN_MANIFESTS, folded); `null` — anything else, including a dropped entry and any path
 * with a `/` (not at the root: the write guard matches a scope entry literally, so `./vite.config.ts` does not let the
 * build write the root file).
 * @param {string} entry
 * @returns {"config" | "manifest" | null}
 */
export function testInfraPathKind(entry) {
  const p = typeof entry === "string" ? scopedPath(entry) : null;
  if (p === null || p.includes("/")) return null;
  if (isRunnerConfigName(p)) return "config";
  const k = foldName(p);
  return PIN_MANIFESTS.some((m) => foldName(m) === k) ? "manifest" : null;
}
/** A pinned gate's `results` value: a format, or the refusal that stood in for one when the pin was taken. */
export const RESULTS_VALUES = Object.freeze([...RESULTS_FORMATS, "config-invalid", "not-configured"].sort());
/** `test_infra`'s closed key sets (L36). */
export const PIN_KEYS = Object.freeze(["configs", "gates", "levels"]);
export const GATE_KEYS = Object.freeze(["id", "post", "pre", "results", "script"]);
export const CONFIG_KEYS = Object.freeze(["path", "sha256"]);

const HEX64_RE = /^[0-9a-f]{64}$/;
const MAX_SCRIPT = 65536;
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

/** The gate ids the pin ranges over for `levels`: the union of LEVEL_GATES, sorted. */
export function candidateGates(levels) {
  return [...new Set(levels.flatMap((l) => LEVEL_GATES[l] ?? []))].sort();
}

/** `<root>/package.json`'s `scripts`: `{ok, scripts}` (an absent file has none) or a refusal for an unreadable or
 *  unparseable one — a manifest that exists and cannot be read is never "absent". */
function readScripts(root) {
  let text;
  try {
    text = readFileSync(join(root, MANIFEST_FILE), "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return { ok: true, scripts: null };
    return { ok: false, reason: `package.json is unreadable (${e && e.code ? e.code : "error"})` };
  }
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch (e) {
    return { ok: false, reason: `package.json is not valid JSON: ${e.message}` };
  }
  return { ok: true, scripts: pkg !== null && typeof pkg === "object" && !Array.isArray(pkg) ? pkg.scripts : null };
}

/**
 * Compute the pin over the live tree at `root` for the mapped `levels`. Both inputs are required (L41).
 * @returns {{ok: true, pin: {levels: string[], gates: {id: string, script: string, pre: string|null, post: string|null, results: string}[], configs: {path: string, sha256: string}[]}} | {ok: false, reason: string}}
 */
export function computeTestInfra({ root, levels }) {
  if (typeof root !== "string" || root === "") throw new TypeError("computeTestInfra: `root` must be a non-empty string");
  if (!Array.isArray(levels) || levels.length === 0 || !levels.every((l) => LEVELS.includes(l)))
    throw new TypeError(`computeTestInfra: \`levels\` must be a non-empty array of {${LEVELS.join(", ")}}`);
  const s = readScripts(root);
  if (!s.ok) return s;
  const have = new Set(discoverGates(s.scripts).map((e) => e.id));
  const config = loadResultsConfig(root);
  const gates = [];
  for (const id of candidateGates(levels)) {
    if (!have.has(id)) continue;
    const vals = {};
    for (const [key, name] of [
      ["script", id],
      ["pre", `pre${id}`],
      ["post", `post${id}`],
    ]) {
      if (key !== "script" && !Object.hasOwn(s.scripts, name)) {
        vals[key] = null;
        continue;
      }
      const v = s.scripts[name];
      if (typeof v !== "string") return { ok: false, reason: `package.json script ${JSON.stringify(name)} is not a string` };
      if (v.length > MAX_SCRIPT)
        return { ok: false, reason: `package.json script ${JSON.stringify(name)} is over ${MAX_SCRIPT} characters` };
      vals[key] = v;
    }
    const f = formatFor(config, id);
    gates.push({ id, script: vals.script, pre: vals.pre, post: vals.post, results: f.ok ? f.format : f.reason_code });
  }
  let names;
  try {
    names = readdirSync(root);
  } catch (e) {
    return { ok: false, reason: `the project root cannot be listed (${e && e.code ? e.code : "error"})` };
  }
  const configs = [];
  for (const path of names.filter(isRunnerConfigName).sort()) {
    const sha256 = sha256RegularFile(join(root, path));
    if (sha256 === null) {
      let kind = "not a regular file";
      try {
        if (lstatSync(join(root, path)).isSymbolicLink()) kind = "a symlink";
      } catch {
        /* vanished between the listing and the check: still not a regular file */
      }
      return { ok: false, reason: `${path} is ${kind} — a runner config is pinned only as a regular file` };
    }
    configs.push({ path, sha256 });
  }
  return { ok: true, pin: { levels: [...new Set(levels)].sort(), gates, configs } };
}

const exactKeys = (o, keys) =>
  o !== null && typeof o === "object" && !Array.isArray(o) && Object.keys(o).sort().join(",") === [...keys].sort().join(",");
const sortedUnique = (xs) => new Set(xs).size === xs.length && xs.join("\n") === [...xs].sort().join("\n");

/** Shape-check a recorded pin — closed at every level (L36). A reason string, or null when well-formed. */
export function pinShapeError(pin) {
  if (!exactKeys(pin, PIN_KEYS)) return `test_infra is not exactly {${PIN_KEYS.join(", ")}}`;
  if (!Array.isArray(pin.levels) || pin.levels.length === 0 || !pin.levels.every((l) => LEVELS.includes(l)) || !sortedUnique(pin.levels))
    return `test_infra.levels is not a non-empty, sorted, unique subset of {${LEVELS.join(", ")}}`;
  if (!Array.isArray(pin.gates)) return "test_infra.gates is not an array";
  for (const g of pin.gates) {
    if (!exactKeys(g, GATE_KEYS)) return `a test_infra.gates entry is not exactly {${GATE_KEYS.join(", ")}}`;
    if (!Object.values(LEVEL_GATES).some((ids) => ids.includes(g.id))) return "a test_infra.gates id is not a level gate";
    if (typeof g.script !== "string" || g.script.length > MAX_SCRIPT) return `test_infra.gates ${g.id}: script is not a string`;
    for (const k of ["pre", "post"]) {
      if (g[k] !== null && (typeof g[k] !== "string" || g[k].length > MAX_SCRIPT))
        return `test_infra.gates ${g.id}: ${k} is not a string or null`;
    }
    if (!RESULTS_VALUES.includes(g.results)) return `test_infra.gates ${g.id}: results is not one of {${RESULTS_VALUES.join(", ")}}`;
  }
  if (!sortedUnique(pin.gates.map((g) => g.id))) return "test_infra.gates is not unique and sorted by id";
  if (!Array.isArray(pin.configs)) return "test_infra.configs is not an array";
  for (const c of pin.configs) {
    if (!exactKeys(c, CONFIG_KEYS) || !isRunnerConfigName(c.path) || !HEX64_RE.test(c.sha256 ?? ""))
      return "a test_infra.configs entry is not exactly {path in the closed config set, sha256}";
  }
  if (!sortedUnique(pin.configs.map((c) => c.path))) return "test_infra.configs is not unique and sorted by path";
  return null;
}

/** Compare a recorded pin with a recomputed one. Returns the differences, each naming a gate id or a config path —
 *  never a script's text (P2). Empty = the pin holds. */
export function diffTestInfra(recorded, now) {
  const out = [];
  const byId = (xs) => new Map(xs.map((g) => [g.id, g]));
  const was = byId(recorded.gates);
  const is = byId(now.gates);
  for (const [id, g] of was) {
    const n = is.get(id);
    if (!n) out.push(`gate ${id}: its package.json script is gone`);
    else {
      if (n.script !== g.script) out.push(`gate ${id}: its package.json script changed`);
      for (const k of ["pre", "post"]) {
        if (n[k] !== g[k])
          out.push(`gate ${id}: its ${k}${id} script ${g[k] === null ? "was added" : n[k] === null ? "is gone" : "changed"}`);
      }
      if (n.results !== g.results) out.push(`gate ${id}: its testResults format changed (${g.results} → ${n.results})`);
    }
  }
  for (const id of is.keys()) if (!was.has(id)) out.push(`gate ${id}: a package.json script was added`);
  const byPath = (xs) => new Map(xs.map((c) => [c.path, c.sha256]));
  const cw = byPath(recorded.configs);
  const cn = byPath(now.configs);
  for (const [path, sha] of cw) {
    if (!cn.has(path)) out.push(`${path}: the runner config is gone`);
    else if (cn.get(path) !== sha) out.push(`${path}: the runner config changed`);
  }
  for (const path of cn.keys()) if (!cw.has(path)) out.push(`${path}: a runner config was added`);
  return out;
}

/** Recompute over `root` for the RECORDED levels and compare with `recorded` (a shape-valid pin): the differences, or
 *  `[reason]` when the live pin cannot be computed (an unreadable manifest, a symlinked config — itself a change from
 *  what was pinned). */
export function testInfraReds({ recorded, root }) {
  const now = computeTestInfra({ root, levels: recorded.levels });
  if (!now.ok) return [`the test infrastructure cannot be pinned now: ${now.reason}`];
  return diffTestInfra(recorded, now.pin);
}
