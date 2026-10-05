#!/usr/bin/env node
// pharn/floor/test-infra-core.mjs — the TEST-INFRASTRUCTURE PIN: the parts of a project, other than the AC tests
// themselves, that decide how those tests run and what they report. `/pharn-test`'s `ac-tests-lock.mjs --write` records
// it in the lock's `test_infra` section (schema `ac-tests-lock/5` since 6.36.0; `/4` and `/3` are still read); `--check` and
// `/pharn-verify`'s AC gate (ac-gate-core.mjs) recompute it from the live tree and compare. Contract:
// pharn/pharn-contracts/ac-tests.md, "The test-infrastructure pin".
//
// WHY (the queue's item 06, P7): the AC gate trusts a test's `passed` only because the test was pinned and shown red
// before the build. The lock pins the test FILES; without this pin a build could change what runs them — the `test`
// script, the runner's config, the per-test results format — and a pinned test would pass without its body ever
// changing. P3: this file changes when "what counts as test infrastructure" changes, and for no other reason.
// 6.31.0 (the recorded failure, P7 — a read-only review's H2, reproduced in install-like worlds): with the lock
// writable a build could re-pin anything, and even with it unwritable the pin did not read a file the gate's script
// NAMES (the `pharn-json` reporter), a script the gate CHAINS to (`"test": "npm run test:unit"`), package.json's `jest`
// key, or the root `.npmrc` — each a route to a forged `passed` with every floor check green.
//
// THE PIN, recomputed and compared EXACTLY (sets and values):
//   levels        the mapped AC levels the pin was taken for, sorted — recorded, so a recompute ranges over the SAME
//                 candidate gates whatever the mapping reads later (a mapping change is the lock's files check, not
//                 this)
//   gates         for each gate id in the union of LEVEL_GATES over the mapped levels that package.json `scripts` HAS
//                 (gate-run-core.mjs discoverGates, an own-property test): { id, script, pre, post, results } —
//                 `script` is the script's VALUE; `pre` / `post` are the `pre<id>` / `post<id>` values npm runs around
//                 it implicitly (null when absent — grill G4); `results` is the `testResults` format
//                 test-results-core.mjs reads for that id, or its refusal code (`not-configured` | `config-invalid`).
//                 Not the whole package.json: dependencies legitimately change in a build.
//   chained       (/4) every script a pinned value CHAINS to, transitively: { id, script, pre, post }, sorted by id,
//                 level gate ids not repeated (THE TOKEN PASS, below)
//   configs       { path, sha256 } for every entry at the project ROOT whose name is in a CLOSED set
//                 (isPinnedConfigName): vitest.config, vitest.workspace, vite.config, playwright.config or jest.config,
//                 with a js/mjs/cjs/ts/mts/cts/json extension (isRunnerConfigName), and (/4) the package-manager configs
//                 `.npmrc`, `.yarnrc`, `.yarnrc.yml` (PACKAGE_MANAGER_CONFIGS — the gate itself is `npm run <id>`, whose
//                 `script-shell` and `node-options` live there, and yarn runs its `yarnPath` on every chained call) —
//                 matched FOLDED (NFC + full case folding, spec-template-core's foldName, the fold the write guard and
//                 ac-tests-core's scopeKey use; 6.21.0). Why folded: vite and vitest find their config by an existence
//                 check of the LOWERCASE name, so on a case-insensitive volume (APFS) `Vitest.config.mjs` IS the
//                 runner's config — the review measured real vitest 5.0.1 loading one. The recorded `path` is the
//                 on-disk spelling. Hashed WITHOUT following a link and never read into the lock (O_NOFOLLOW): a
//                 matching entry that is not a regular file — a symlink, a directory — cannot be pinned, and says so
//                 (L59: a call that follows a link answers for the target, never for the link).
//   script_files  (/4) { path, sha256 } for every REGULAR file the token pass finds named in a pinned value, sorted —
//                 hashed like the configs; a named path that is a symlink or any other kind refuses the pin
//   jest          (/4) the sha256 of package.json's `jest` key in canonical JSON (keys sorted at every level), or null
//                 when the key is absent — a digest, never the value (a Jest config can hold paths and tokens, and the
//                 lock is committed). Jest reads its config from that key when no jest.config.* exists, and a
//                 `testResultsProcessor` there rewrites the results before `--json` writes them.
//   exclude       (/5, 6.36.0) the project's DECLARED gate exclusion — `pharn.config.json` `gates.exclude`, read by
//                 gate-exclusion-core.mjs, in ALLOWLIST order, `[]` when none — the WHOLE list, not only level gates:
//                 an excluded `typecheck` or `build` changes what /pharn-verify runs as surely as an excluded `test`. A
//                 declaration that cannot be read refuses the pin. A /4 or /3 pin never recorded it, so a NON-EMPTY live
//                 declaration reads `unpinned` against one (and an empty one reads exactly as before 6.36.0).
//
// THE TOKEN PASS (6.31.0) — ONE closed, literal rule, never a shell parse (the reconcile precedent: parsing a shell
// command is undecidable, and a verb list would be a heuristic P0 forbids calling a guarantee). scriptTokens() splits
// a script value on whitespace and the shell control characters `; & | ( )` and strips one pair of matching quotes.
// Over the tokens of every pinned value — each level gate's script, pre and post, then each chained script's own:
//   • a FILE the value names (scriptPathCandidates): each token, split on `=`, leading `./` stripped, that is a clean
//     relative POSIX path — not led by `-` or `/`, no empty / `.` / `..` segment, no whitespace, quote, shell or glob
//     character, first segment not `node_modules` (dependencies stay out) or `.pharn` (runtime scratch) — whose
//     extension is one a gate EXECUTES (EXECUTED_EXTENSIONS). Skipped: the token after an OUTPUT redirect (`>`, `>>`,
//     `2>`, and `&>` / `>|` as the tokenizer leaves them) and after an output flag (`-o`, or any `--out…` flag, whose
//     `=` value is skipped too) — a gate's own OUTPUT named literally would otherwise be pinned and then rewritten by the
//     red run itself. An INPUT redirect's target is not skipped: `node < tools/x.mjs` executes it.
//     A chain to a script whose name is over MAX_NAME characters REFUSES the pin rather than reading past it.
//   • a SCRIPT the value chains to (chainedIds): a package-manager token `npm`, `pnpm` or `yarn`, the flags after it
//     skipped, then `run` / `run-script` / `rum` / `urn` and the next non-flag token as the id; `test` / `t` / `tst`
//     (the `test` script — and, for pnpm and yarn, a script of that name too); `start` / `stop` / `restart` (that
//     script; `restart` also `stop` and `start`); and for pnpm and yarn only, any other word as the id (their
//     `yarn <script>` shorthand). Also Node's own `node --run <id>` / `--run=<id>`, among node's leading flags.
//     An id pins only when it is an OWN property of `scripts` (L15), so `yarn install` pins nothing unless a script is
//     named `install`. The walk stops at an id already pinned (a cycle) and REFUSES past MAX_CHAIN_HOPS hops.
//
// THE SAME PREDICATES AT PLAN TIME: testInfraPathKind() classifies a PLAN.md `## Files` entry as the writes-scope setter
// scopes it — `config` (a root config the pin hashes: check-ac-tests.mjs REDs it as `test-infra-in-plan`, because every
// write the build could make there changes the pin) or `manifest` (package.json / pharn.config.json: an advisory NOTE
// only — the build may legitimately change a dependency, and the checker cannot see which part will change). And
// scriptNamedFiles() lists every file the token pass finds named that is not an existing directory — absent ones
// included, since a file the build CREATES there is one the pin would read at verify — which check-ac-tests.mjs REDs
// as `test-infra-in-plan` too. One rule, imported; never a second regex (L35/L36).
//
// WHAT IT DOES NOT CATCH (P0) — stated here in full, restated in the contract, cited elsewhere:
//   • THE IN-PROCESS BOUND, first because it is the widest: code the build writes runs INSIDE the test process, so it
//     can switch off the assertion library or the reporter there — `assert.equal = () => {}` in the only in-scope
//     file made verify PASS with the AC counted delivered while `f()` was wrong (a read-only review's wA, re-measured
//     on 6.28.2). No pin reaches it: every pinned byte is unchanged, only what the process does changes. So a green
//     pin never means the build could not forge the AC gate.
//   • any file a pinned file IMPORTS — a setup or helper file a config imports, the named reporter's own imports:
//     imports are never followed;
//   • configuration read from the environment (`NODE_OPTIONS`, `npm_config_*`, a runner's own variables), and npm
//     configuration outside the project root (the user and the global npmrc);
//   • package.json fields other than the level gates' scripts, the scripts they chain to and `jest` — a `mocha` or
//     `ava` key, `config` (a script reads it as `$npm_package_config_*`), `type`, `imports`, `exports`, `workspaces`,
//     `overrides`, and dependencies (the runner's own version);
//   • a chain the token pass does not read — through another runner (`npm-run-all`, `run-s`, `concurrently`,
//     `turbo`), into another package (`--prefix`, `-w`, `yarn workspace`), after a flag whose value is a separate
//     token between the manager and its command, or through `bun`;
//   • a file a script names that the rule does not read — a path with whitespace, a quote or a shell or glob
//     character (so one built from a variable), an absolute path or one outside the root, `node_modules/**`, a path
//     over MAX_NAME characters, an extension outside EXECUTED_EXTENSIONS (so a JSON or YAML config a script names —
//     `jest --config jest.ci.json` — outside the root configs' closed set), an output redirect's or an output flag's
//     target, and a named path that is a directory (its contents are never read);
//   • a config outside the project root, or under another name than the closed sets (a name the modelled fold does not
//     reach is not caught — fail-open; one it folds beyond the filesystem is pinned anyway — fail-closed, e.g. on a
//     case-SENSITIVE filesystem a `Vitest.config.mjs` the runner does NOT load is still pinned); tsconfig; and
//     package-manager configuration other than the three root files (`.pnpmfile.cjs`, `bunfig.toml`).
// This list is the one copy; pharn/pharn-contracts/ac-tests.md restates it and every other surface cites that.
// FAIL-CLOSED COSTS, stated: a change it catches is `test-infra-changed` whether or not it was legitimate. So a SOURCE
// file a test-reachable script names literally — a bundler's entry (`tsup src/index.ts` reached through
// `"pretest": "npm run build"`), `node test.js` — is pinned, and a feature that edits it reads `test-infra-changed`;
// a chained build step is pinned as a value, so a feature that edits the build script reads the same. The remedy is a
// human: name a directory, a glob or a config file instead, as its own `spec_kind: test-infra` increment. For an
// ACCIDENTAL change, set the build aside and re-run /pharn-test; for an INTENDED one, re-running /pharn-test cannot
// help (the rebuild makes the change again) — split it into a `spec_kind: test-infra` increment first. And it is
// AGREEMENT, never provenance (L43): a lock rewritten to match a changed tree passes — which is why the build's scope
// may not name the lock (check-ac-tests.mjs `ac-artifact-in-plan`, 6.31.0), leaving a Bash rewrite of it to reconcile.
// The `.npmrc` digest is committed with the lock: a digest of a file that holds a LOW-ENTROPY credential lets anyone who
// reads the lock test guesses offline — keep registry credentials in an environment variable or the user-level npmrc,
// as npm recommends.
//
// TRUST (P2): script values, package.json and config bytes are untrusted DATA — compared and hashed, never
// interpreted or executed. A difference names a gate id, a chained script's id (quoted through `shown()`), a config
// path or a script-named path (a clean relative path by construction), never a script's text or a config's content.

import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, openSync, readdirSync, readFileSync, readSync, constants as fsConstants } from "node:fs";
import { join, posix } from "node:path";
import { LEVELS, scopedPath } from "./ac-tests-core.mjs";
import { ALLOWLIST, LEVEL_GATES, discoverGates, exclusionError } from "./gate-run-core.mjs";
import { loadGateExclusion } from "./gate-exclusion-core.mjs";
import { foldName } from "./spec-template-core.mjs";
import { CONFIG_FILE, formatFor, loadResultsConfig } from "./test-results-core.mjs";
import { RESULTS_FORMATS } from "./test-results-formats.mjs";
import { shown } from "./quote-core.mjs";

/** The closed set of root RUNNER config names the pin covers, in FOLDED (lowercase) form — test it only through
 *  isRunnerConfigName, which folds the name first. */
export const CONFIG_NAME_RE =
  /^(?:vitest\.config|vitest\.workspace|vite\.config|playwright\.config|jest\.config)\.(?:js|mjs|cjs|ts|mts|cts|json)$/;
/** The root PACKAGE-MANAGER configs the pin covers (6.31.0), folded form: npm's (the gate is `npm run <id>`) and yarn's
 *  two (yarn runs its `yarnPath` / `yarn-path` on every invocation, and the token pass reads yarn chains). */
export const PACKAGE_MANAGER_CONFIGS = Object.freeze([".npmrc", ".yarnrc", ".yarnrc.yml"]);
/** The npm manifest the level gates' scripts are read from. */
export const MANIFEST_FILE = "package.json";
/** The root files the pin reads VALUES from (the level gates' scripts; the `testResults` formats) — as opposed to the
 *  configs it hashes whole. */
export const PIN_MANIFESTS = Object.freeze([MANIFEST_FILE, CONFIG_FILE]);
/** The extensions of a file a gate EXECUTES (6.31.0), sorted: a script-named file with another extension is not
 *  pinned — a gate's JSON or XML OUTPUT named literally must not be (the red run would rewrite it). */
export const EXECUTED_EXTENSIONS = Object.freeze([".bash", ".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".sh", ".ts", ".tsx", ".zsh"]);
/** The package managers whose script-running commands the token pass reads (6.31.0). */
export const PACKAGE_MANAGERS = Object.freeze(["npm", "pnpm", "yarn"]);
/** npm's `run-script` and its aliases, which pnpm and yarn share in part — the next non-flag token is the id. */
export const RUN_WORDS = Object.freeze(["rum", "run", "run-script", "urn"]);
/** npm's `test` and its aliases — they run the `test` script. */
export const TEST_WORDS = Object.freeze(["t", "test", "tst"]);
/** The lifecycle commands that run a same-named script (`restart` also runs `stop` and `start`). */
export const LIFECYCLE_WORDS = Object.freeze(["restart", "start", "stop"]);
/** The managers whose bare `<pm> <script>` runs a script (a word that is not a script pins nothing). */
export const SHORTHAND_MANAGERS = Object.freeze(["pnpm", "yarn"]);
/** How many chaining hops the pin follows from a level gate before REFUSING (6.31.0). Real chains are one or two hops
 *  (`test` → `test:unit`); a deeper one is refused, never walked partially, so a small bound fails CLOSED and costs
 *  nothing a real project uses. Not measured beyond that; raise it with the chain that needs it. */
export const MAX_CHAIN_HOPS = 8;

/** Is `name` (one path segment) a runner config name the pin covers? Folded, so a case or Unicode-form variant of a
 *  member is a member (the one predicate for runner configs — the listing, the /3 shape check and the plan-time check
 *  all use it). */
export function isRunnerConfigName(name) {
  return typeof name === "string" && CONFIG_NAME_RE.test(foldName(name));
}

/** Is `name` a root package-manager config the pin covers (6.31.0)? Folded, as a runner config is. */
export function isPackageManagerConfigName(name) {
  return typeof name === "string" && PACKAGE_MANAGER_CONFIGS.includes(foldName(name));
}

/** Is `name` a root config the /4 pin hashes whole — a runner's or the package manager's? */
export function isPinnedConfigName(name) {
  return isRunnerConfigName(name) || isPackageManagerConfigName(name);
}

const isManifestName = (name) => PIN_MANIFESTS.some((m) => foldName(m) === foldName(name));
/** What a pinned root config is, in a message: a runner's or the package manager's. */
const configKind = (path) => (isPackageManagerConfigName(path) ? "package-manager config" : "runner config");

/**
 * Classify a PLAN.md `## Files` entry, read as the writes-scope setter scopes it (ac-tests-core scopedPath: annotation
 * stripped, placeholders/globs dropped): `"config"` — a ROOT config the pin hashes (a runner's or, since 6.31.0, the
 * package manager's); `"manifest"` — a root file the pin reads values from (PIN_MANIFESTS, folded); `null` — anything
 * else, including a dropped entry and any path with a `/` (not at the root: the write guard matches a scope entry
 * literally, so `./vite.config.ts` does not let the build write the root file).
 * @param {string} entry
 * @returns {"config" | "manifest" | null}
 */
export function testInfraPathKind(entry) {
  const p = typeof entry === "string" ? scopedPath(entry) : null;
  if (p === null || p.includes("/")) return null;
  if (isPinnedConfigName(p)) return "config";
  return isManifestName(p) ? "manifest" : null;
}
/** A pinned gate's `results` value: a format, or the refusal that stood in for one when the pin was taken. */
export const RESULTS_VALUES = Object.freeze([...RESULTS_FORMATS, "config-invalid", "not-configured"].sort());
/** `test_infra`'s closed key sets (L36): the /5 pin (6.36.0), and the /4 (6.31.0–6.35.x) and /3 (6.20.0–6.30.x) pins
 *  still read. */
export const PIN_KEYS = Object.freeze(["chained", "configs", "exclude", "gates", "jest", "levels", "script_files"]);
export const PIN_KEYS_V4 = Object.freeze(["chained", "configs", "gates", "jest", "levels", "script_files"]);
export const PIN_KEYS_V3 = Object.freeze(["configs", "gates", "levels"]);
export const GATE_KEYS = Object.freeze(["id", "post", "pre", "results", "script"]);
export const CHAINED_KEYS = Object.freeze(["id", "post", "pre", "script"]);
export const CONFIG_KEYS = Object.freeze(["path", "sha256"]);
export const SCRIPT_FILE_KEYS = Object.freeze(["path", "sha256"]);

const HEX64_RE = /^[0-9a-f]{64}$/;
const MAX_SCRIPT = 65536;
/** A chained script id or a script-named path longer than this is not read (a package.json key or a path of this size
 *  is no real project's, and a bound keeps every message that names one short). */
const MAX_NAME = 1024;
const OPEN_FLAGS = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;
const CHUNK = 1 << 20;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function hasControl(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

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

// ─── THE TOKEN PASS (6.31.0) ─────────────────────────────────────────────────────────────────────────────────────

const SEPARATOR_RE = /[\s;&|()]+/;
/** An OUTPUT redirect, as the tokenizer leaves it (`&>` and `>|` split at `&` / `|` into `>`): `>`, `>>`, `2>`, `2>>`.
 *  Input redirects are NOT skipped — `node < tools/x.mjs` executes the file after `<`. */
const OUTPUT_REDIRECT_RE = /^\d*>>?$/;
const OUTPUT_FLAG_RE = /^--out/i;
const PATH_BAD_CHAR_RE = /[\s$`\\'"*?[\]{}()<>|&;!#~]/;

/** A script value's tokens: split on whitespace and the shell control characters `; & | ( )`, one pair of matching
 *  surrounding quotes stripped. A non-string yields none. */
export function scriptTokens(value) {
  if (typeof value !== "string") return [];
  return value
    .split(SEPARATOR_RE)
    .filter((t) => t !== "")
    .map((t) => (t.length >= 2 && (t[0] === "'" || t[0] === '"') && t[t.length - 1] === t[0] ? t.slice(1, -1) : t));
}

/** Is `p` (leading `./` already stripped) a path the rule reads as a file a gate executes? */
function isCandidatePath(p) {
  if (typeof p !== "string" || p === "" || p.length > MAX_NAME || p.startsWith("-") || p.startsWith("/")) return false;
  if (PATH_BAD_CHAR_RE.test(p) || hasControl(p)) return false;
  const segs = p.split("/");
  if (segs.some((s) => s === "" || s === "." || s === "..")) return false;
  if (segs[0] === "node_modules" || segs[0] === ".pharn") return false;
  return EXECUTED_EXTENSIONS.includes(posix.extname(segs[segs.length - 1]).toLowerCase());
}

/** The files a script VALUE names, by the closed rule in the header: sorted, unique. Pure — nothing is stat'ed. */
export function scriptPathCandidates(value) {
  const tokens = scriptTokens(value);
  const out = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (OUTPUT_REDIRECT_RE.test(t) || t === "-o") {
      i++; // the operator's target is the gate's own output, never a file it executes
      continue;
    }
    if (OUTPUT_FLAG_RE.test(t)) {
      if (!t.includes("=")) i++; // `--out… <path>`: the next token is the output
      continue; // `--out…=<path>`: the value is the output
    }
    for (const part of t.split("=")) {
      const p = part.replace(/^(?:\.\/)+/, "");
      if (isCandidatePath(p)) out.add(p);
    }
  }
  return [...out].sort(cmp);
}

/** The script ids a script VALUE chains to, by the closed rule in the header — BEFORE the own-property test, which the
 *  walk applies. Pure. */
export function chainedIds(value) {
  const t = scriptTokens(value);
  const ids = [];
  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    if (PACKAGE_MANAGERS.includes(w)) {
      let j = i + 1;
      while (j < t.length && t[j].startsWith("-")) j++;
      if (j >= t.length) continue;
      const cmd = t[j];
      if (RUN_WORDS.includes(cmd)) {
        let k = j + 1;
        while (k < t.length && t[k].startsWith("-")) k++;
        if (k < t.length) ids.push(t[k]);
      } else if (TEST_WORDS.includes(cmd)) {
        // `yarn t` may run a script named `t`, where npm and pnpm read an alias of `test`: both are pinned (fail-closed).
        ids.push("test", ...(SHORTHAND_MANAGERS.includes(w) && cmd !== "test" ? [cmd] : []));
      } else if (LIFECYCLE_WORDS.includes(cmd)) ids.push(...(cmd === "restart" ? ["restart", "stop", "start"] : [cmd]));
      else if (SHORTHAND_MANAGERS.includes(w)) ids.push(cmd);
    } else if (w === "node") {
      for (let j = i + 1; j < t.length && t[j].startsWith("-"); j++) {
        if (t[j] === "--run") {
          if (j + 1 < t.length) ids.push(t[j + 1]);
          break;
        }
        if (t[j].startsWith("--run=")) {
          ids.push(t[j].slice("--run=".length));
          break;
        }
      }
    }
  }
  return [...new Set(ids)];
}

/** One script's value and its implicit `pre` / `post`: `{ok, script, pre, post}` (pre/post null when absent) or a
 *  refusal — a value that is not a string, or is over MAX_SCRIPT characters, is never read as "no script". */
function valuesOf(scripts, id) {
  const v = {};
  for (const [key, name] of [
    ["script", id],
    ["pre", `pre${id}`],
    ["post", `post${id}`],
  ]) {
    if (key !== "script" && !Object.hasOwn(scripts, name)) {
      v[key] = null;
      continue;
    }
    const s = scripts[name];
    if (typeof s !== "string") return { ok: false, reason: `package.json script ${shown(name)} is not a string` };
    if (s.length > MAX_SCRIPT) return { ok: false, reason: `package.json script ${shown(name)} is over ${MAX_SCRIPT} characters` };
    v[key] = s;
  }
  return { ok: true, script: v.script, pre: v.pre, post: v.post };
}

/**
 * The token pass over the pinned gates' values, transitively through the scripts they chain to (6.31.0): `{ok, chained,
 * candidates}` — the chained scripts `{id, script, pre, post}` sorted by id (the gates' own ids and pre/post names not
 * repeated), and every candidate path any pinned value names, sorted — or a refusal (a chained value that is not a
 * string, a chain past MAX_CHAIN_HOPS).
 */
export function scriptWalk({ scripts, gates }) {
  if (!isPlainObject(scripts)) return { ok: true, chained: [], candidates: [] };
  const seen = new Set(gates.flatMap((g) => [g.id, `pre${g.id}`, `post${g.id}`]));
  const chained = [];
  const candidates = new Set();
  let frontier = gates.map((g) => ({ values: [g.script, g.pre, g.post], hop: 0 }));
  while (frontier.length) {
    const next = [];
    for (const { values, hop } of frontier) {
      for (const value of values) {
        if (value === null) continue;
        for (const p of scriptPathCandidates(value)) candidates.add(p);
        for (const id of chainedIds(value)) {
          if (!Object.hasOwn(scripts, id) || seen.has(id)) continue;
          if (id.length > MAX_NAME)
            return { ok: false, reason: `a level gate's scripts chain to a script whose name is over ${MAX_NAME} characters` };
          if (hop + 1 > MAX_CHAIN_HOPS) {
            return {
              ok: false,
              reason: `a level gate's scripts chain deeper than ${MAX_CHAIN_HOPS} hops (at ${shown(id)}) — the pin refuses rather than reading part of the chain`,
            };
          }
          const v = valuesOf(scripts, id);
          if (!v.ok) return v;
          for (const n of [id, `pre${id}`, `post${id}`]) seen.add(n);
          chained.push({ id, script: v.script, pre: v.pre, post: v.post });
          next.push({ values: [v.script, v.pre, v.post], hop: hop + 1 });
        }
      }
    }
    frontier = next;
  }
  return { ok: true, chained: chained.sort((a, b) => cmp(a.id, b.id)), candidates: [...candidates].sort(cmp) };
}

/** A path's kind, WITHOUT following its last component (L59): `file`, `directory`, `absent` (ENOENT, or a component
 *  that is not a directory), or a phrase naming what else it is — never a thrown error. */
function pathKind(abs) {
  let st;
  try {
    st = lstatSync(abs);
  } catch (e) {
    if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return "absent";
    return `unreadable (${e && e.code ? e.code : "error"})`;
  }
  if (st.isSymbolicLink()) return "a symlink";
  if (st.isDirectory()) return "directory";
  if (st.isFile()) return "file";
  return "not a regular file";
}

/** A candidate the pin reads elsewhere — a root config (hashed whole under `configs`) or a root manifest (read by value)
 *  — is not a script-named file. */
const pinnedElsewhere = (p) => !p.includes("/") && (isPinnedConfigName(p) || isManifestName(p));

/** Is `p` a path a /4 `script_files` entry may record? Exactly what the token pass can produce for itself. */
function isScriptFilePath(p) {
  return isCandidatePath(p) && !pinnedElsewhere(p);
}

/** `<root>/package.json`: `{ok, pkg, scripts}` (an absent file has neither) or a refusal for an unreadable or
 *  unparseable one — a manifest that exists and cannot be read is never "absent". */
function readManifest(root) {
  let text;
  try {
    text = readFileSync(join(root, MANIFEST_FILE), "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return { ok: true, pkg: null, scripts: null };
    return { ok: false, reason: `package.json is unreadable (${e && e.code ? e.code : "error"})` };
  }
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch (e) {
    return { ok: false, reason: `package.json is not valid JSON: ${e.message}` };
  }
  const obj = isPlainObject(pkg) ? pkg : null;
  return { ok: true, pkg: obj, scripts: obj ? obj.scripts : null };
}

/** The level gates `levels` range over that the manifest HAS, each `{id, script, pre, post}`, or a refusal. */
function readGates(scripts, levels) {
  const have = new Set(discoverGates(scripts).map((e) => e.id));
  const gates = [];
  for (const id of candidateGates(levels)) {
    if (!have.has(id)) continue;
    const v = valuesOf(scripts, id);
    if (!v.ok) return v;
    gates.push({ id, script: v.script, pre: v.pre, post: v.post });
  }
  return { ok: true, gates };
}

/** Sort an object's keys (the canonical-form replacer): `Object.fromEntries` DEFINES each key, so a `__proto__` key
 *  JSON.parse created stays a key and never reaches the prototype (L15). */
function sortedKeys(_key, value) {
  return isPlainObject(value)
    ? Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((k) => [k, value[k]])
      )
    : value;
}

/** package.json's `jest` key as a digest of its canonical JSON, or null when absent; a refusal when it cannot be
 *  serialized (nested past the engine's own limit) — never a digest of part of it. */
function jestPin(pkg) {
  if (!isPlainObject(pkg) || !Object.hasOwn(pkg, "jest")) return { ok: true, jest: null };
  let text;
  try {
    text = JSON.stringify(pkg.jest, sortedKeys);
  } catch {
    return { ok: false, reason: "package.json's `jest` key cannot be written in canonical form (nested too deeply)" };
  }
  return { ok: true, jest: createHash("sha256").update(text).digest("hex") };
}

/** The root configs the pin hashes (isPinnedConfigName), sorted by on-disk name, or a refusal. */
function rootConfigs(root) {
  let names;
  try {
    names = readdirSync(root);
  } catch (e) {
    return { ok: false, reason: `the project root cannot be listed (${e && e.code ? e.code : "error"})` };
  }
  const configs = [];
  for (const path of names.filter(isPinnedConfigName).sort(cmp)) {
    const sha256 = sha256RegularFile(join(root, path));
    if (sha256 === null) {
      let kind = "not a regular file";
      try {
        if (lstatSync(join(root, path)).isSymbolicLink()) kind = "a symlink";
      } catch {
        /* vanished between the listing and the check: still not a regular file */
      }
      return { ok: false, reason: `${path} is ${kind} — a ${configKind(path)} is pinned only as a regular file` };
    }
    configs.push({ path, sha256 });
  }
  return { ok: true, configs };
}

/** Hash every candidate that is a regular file (absent / directory: skipped; any other kind refuses). */
function scriptFilesOf(root, candidates) {
  const files = [];
  for (const path of candidates) {
    if (pinnedElsewhere(path)) continue;
    const kind = pathKind(join(root, path));
    if (kind === "absent" || kind === "directory") continue;
    const sha256 = kind === "file" ? sha256RegularFile(join(root, path)) : null;
    if (sha256 === null) {
      // `file` with no digest: lstat saw a regular file that could not be opened or read (EACCES, or swapped since).
      return {
        ok: false,
        reason: `${path} (a file a level gate's script names) is ${kind === "file" ? "unreadable" : kind} — it is pinned only as a readable regular file`,
      };
    }
    files.push({ path, sha256 });
  }
  return { ok: true, files };
}

function requireInputs(fn, root, levels) {
  if (typeof root !== "string" || root === "") throw new TypeError(`${fn}: \`root\` must be a non-empty string`);
  if (!Array.isArray(levels) || levels.length === 0 || !levels.every((l) => LEVELS.includes(l)))
    throw new TypeError(`${fn}: \`levels\` must be a non-empty array of {${LEVELS.join(", ")}}`);
}

/**
 * Compute the /5 pin over the live tree at `root` for the mapped `levels`. Both inputs are required (L41).
 * @returns {{ok: true, pin: {levels: string[], gates: object[], chained: object[], configs: {path: string, sha256: string}[], script_files: {path: string, sha256: string}[], jest: string|null, exclude: string[]}} | {ok: false, reason: string}}
 */
export function computeTestInfra({ root, levels }) {
  requireInputs("computeTestInfra", root, levels);
  const m = readManifest(root);
  if (!m.ok) return m;
  const g = readGates(m.scripts, levels);
  if (!g.ok) return g;
  const config = loadResultsConfig(root);
  const gates = g.gates.map((x) => {
    const f = formatFor(config, x.id);
    return { id: x.id, script: x.script, pre: x.pre, post: x.post, results: f.ok ? f.format : f.reason_code };
  });
  const walk = scriptWalk({ scripts: m.scripts, gates });
  if (!walk.ok) return walk;
  const cfg = rootConfigs(root);
  if (!cfg.ok) return cfg;
  const named = scriptFilesOf(root, walk.candidates);
  if (!named.ok) return named;
  const jest = jestPin(m.pkg);
  if (!jest.ok) return jest;
  const ex = loadGateExclusion(root);
  if (!ex.ok) return ex;
  return {
    ok: true,
    pin: {
      levels: [...new Set(levels)].sort(),
      gates,
      chained: walk.chained,
      configs: cfg.configs,
      script_files: named.files,
      jest: jest.jest,
      exclude: ex.exclude,
    },
  };
}

/**
 * The PLAN-TIME reading (6.31.0): every file the token pass finds named in the level gates' values and the scripts they
 * chain to that is NOT an existing directory at `root` — absent ones included (a file the build creates there is one
 * the pin reads at verify: `was added`), a symlink or unreadable one too (fail-closed) — minus the root configs and
 * manifests read elsewhere. check-ac-tests.mjs REDs a PLAN.md `## Files` entry naming one. `{ok, paths}` or a refusal
 * (an unreadable manifest, a chain the pin would refuse).
 */
export function scriptNamedFiles({ root, levels }) {
  requireInputs("scriptNamedFiles", root, levels);
  const m = readManifest(root);
  if (!m.ok) return m;
  const g = readGates(m.scripts, levels);
  if (!g.ok) return g;
  const walk = scriptWalk({ scripts: m.scripts, gates: g.gates });
  if (!walk.ok) return walk;
  const paths = walk.candidates.filter((p) => !pinnedElsewhere(p) && pathKind(join(root, p)) !== "directory");
  return { ok: true, paths };
}

const exactKeys = (o, keys) =>
  o !== null && typeof o === "object" && !Array.isArray(o) && Object.keys(o).sort().join(",") === [...keys].sort().join(",");
const sortedUnique = (xs) => new Set(xs).size === xs.length && xs.join("\n") === [...xs].sort(cmp).join("\n");
const isScriptValue = (v) => typeof v === "string" && v.length <= MAX_SCRIPT;

/** Shape-check a recorded pin — closed at every level (L36), per schema: `{version: 5}` for `ac-tests-lock/5`,
 *  `{version: 4}` for `/4`, `{version: 3}` for `/3`. The version is required (L41). A reason string, or null when
 *  well-formed. */
export function pinShapeError(pin, { version } = {}) {
  if (version !== 3 && version !== 4 && version !== 5) throw new TypeError("pinShapeError: `version` must be 3, 4 or 5");
  const keys = version === 5 ? PIN_KEYS : version === 4 ? PIN_KEYS_V4 : PIN_KEYS_V3;
  if (!exactKeys(pin, keys)) return `test_infra is not exactly {${keys.join(", ")}}`;
  if (!Array.isArray(pin.levels) || pin.levels.length === 0 || !pin.levels.every((l) => LEVELS.includes(l)) || !sortedUnique(pin.levels))
    return `test_infra.levels is not a non-empty, sorted, unique subset of {${LEVELS.join(", ")}}`;
  if (!Array.isArray(pin.gates)) return "test_infra.gates is not an array";
  for (const g of pin.gates) {
    if (!exactKeys(g, GATE_KEYS)) return `a test_infra.gates entry is not exactly {${GATE_KEYS.join(", ")}}`;
    if (!Object.values(LEVEL_GATES).some((ids) => ids.includes(g.id))) return "a test_infra.gates id is not a level gate";
    if (!isScriptValue(g.script)) return `test_infra.gates ${g.id}: script is not a string`;
    for (const k of ["pre", "post"]) {
      if (g[k] !== null && !isScriptValue(g[k])) return `test_infra.gates ${g.id}: ${k} is not a string or null`;
    }
    if (!RESULTS_VALUES.includes(g.results)) return `test_infra.gates ${g.id}: results is not one of {${RESULTS_VALUES.join(", ")}}`;
  }
  if (!sortedUnique(pin.gates.map((g) => g.id))) return "test_infra.gates is not unique and sorted by id";
  if (!Array.isArray(pin.configs)) return "test_infra.configs is not an array";
  const configName = version >= 4 ? isPinnedConfigName : isRunnerConfigName;
  for (const c of pin.configs) {
    if (!exactKeys(c, CONFIG_KEYS) || !configName(c.path) || !HEX64_RE.test(c.sha256 ?? ""))
      return "a test_infra.configs entry is not exactly {path in the closed config set, sha256}";
  }
  if (!sortedUnique(pin.configs.map((c) => c.path))) return "test_infra.configs is not unique and sorted by path";
  if (version === 3) return null;
  if (!Array.isArray(pin.chained)) return "test_infra.chained is not an array";
  for (const c of pin.chained) {
    if (!exactKeys(c, CHAINED_KEYS)) return `a test_infra.chained entry is not exactly {${CHAINED_KEYS.join(", ")}}`;
    if (typeof c.id !== "string" || c.id === "" || c.id.length > MAX_NAME || hasControl(c.id))
      return "a test_infra.chained id is not a clean, non-empty string";
    if (!isScriptValue(c.script)) return `test_infra.chained ${shown(c.id)}: script is not a string`;
    for (const k of ["pre", "post"]) {
      if (c[k] !== null && !isScriptValue(c[k])) return `test_infra.chained ${shown(c.id)}: ${k} is not a string or null`;
    }
  }
  if (!sortedUnique(pin.chained.map((c) => c.id))) return "test_infra.chained is not unique and sorted by id";
  if (!Array.isArray(pin.script_files)) return "test_infra.script_files is not an array";
  for (const f of pin.script_files) {
    if (!exactKeys(f, SCRIPT_FILE_KEYS) || !isScriptFilePath(f.path) || !HEX64_RE.test(f.sha256 ?? ""))
      return "a test_infra.script_files entry is not exactly {path a level gate's script can name, sha256}";
  }
  if (!sortedUnique(pin.script_files.map((f) => f.path))) return "test_infra.script_files is not unique and sorted by path";
  if (pin.jest !== null && !HEX64_RE.test(pin.jest)) return "test_infra.jest is not a sha256 or null";
  if (version === 4) return null;
  const exErr = exclusionError(pin.exclude);
  if (exErr !== null) return `test_infra.exclude ${exErr}`;
  if (pin.exclude.join("\n") !== ALLOWLIST.filter((id) => pin.exclude.includes(id)).join("\n"))
    return "test_infra.exclude is not in ALLOWLIST order";
  return null;
}

/** Compare a recorded pin with a recomputed one. Returns the differences, each naming a gate id, a chained script's id,
 *  a config path or a script-named path — never a script's text or a config's content (P2). Empty = the pin holds.
 *  The /4 members are compared only when `recorded` carries them, so a /3 pin is judged by what it pinned. */
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
  if (Object.hasOwn(recorded, "chained")) {
    const cwas = byId(recorded.chained);
    const cis = byId(now.chained);
    for (const [id, c] of cwas) {
      const n = cis.get(id);
      const at = `chained script ${shown(id)}`;
      if (!n) out.push(`${at}: the level gates no longer reach it, or it is gone`);
      else {
        if (n.script !== c.script) out.push(`${at}: its value changed`);
        for (const k of ["pre", "post"]) {
          if (n[k] !== c[k]) out.push(`${at}: its ${k}-script ${c[k] === null ? "was added" : n[k] === null ? "is gone" : "changed"}`);
        }
      }
    }
    for (const id of cis.keys()) if (!cwas.has(id)) out.push(`chained script ${shown(id)}: a level gate now reaches it`);
  }
  const byPath = (xs) => new Map(xs.map((c) => [c.path, c.sha256]));
  const cw = byPath(recorded.configs);
  const cn = byPath(now.configs);
  for (const [path, sha] of cw) {
    if (!cn.has(path)) out.push(`${path}: the ${configKind(path)} is gone`);
    else if (cn.get(path) !== sha) out.push(`${path}: the ${configKind(path)} changed`);
  }
  for (const path of cn.keys()) if (!cw.has(path)) out.push(`${path}: a ${configKind(path)} was added`);
  if (Object.hasOwn(recorded, "script_files")) {
    const fw = byPath(recorded.script_files);
    const fn = byPath(now.script_files);
    for (const [path, sha] of fw) {
      if (!fn.has(path)) out.push(`${path}: a file a level gate's script names is gone`);
      else if (fn.get(path) !== sha) out.push(`${path}: a file a level gate's script names changed`);
    }
    for (const path of fn.keys()) if (!fw.has(path)) out.push(`${path}: a file a level gate's script names was added`);
  }
  if (Object.hasOwn(recorded, "jest") && recorded.jest !== now.jest) {
    out.push(
      recorded.jest === null
        ? "package.json's jest key was added"
        : now.jest === null
          ? "package.json's jest key is gone"
          : "package.json's jest key changed"
    );
  }
  // /5 (6.36.0): the declared exclusion. Every id is an ALLOWLIST member on both sides (shape-checked / loaded), so
  // naming it inline quotes no project text.
  if (Object.hasOwn(recorded, "exclude")) {
    for (const id of recorded.exclude)
      if (!now.exclude.includes(id)) out.push(`pharn.config.json gates.exclude: ${id} is no longer excluded — discovery runs it again`);
    for (const id of now.exclude)
      if (!recorded.exclude.includes(id)) out.push(`pharn.config.json gates.exclude: ${id} was added — discovery no longer runs it`);
  }
  return out;
}

/** What the /5 pin covers that a /4 or /3 pin could not (6.36.0): a NON-EMPTY declared gate exclusion — UNPINNED, never
 *  "changed". An empty one adds nothing, so a pre-6.36 lock over a project that declares none reads as before. */
function beyondV4(pin) {
  return pin.exclude.length
    ? [
        `pharn.config.json gates.exclude: ${pin.exclude.join(", ")} — the project excludes discovered gate(s), and a pin written before ac-tests-lock/5 does not cover the declaration`,
      ]
    : [];
}

/** What the /4 pin covers that a /3 pin could not: each chained script, script-named file, package-manager config and
 *  `jest` key the live tree has — UNPINNED, never "changed" (the /3 lock did not record them). */
function beyondV3(pin) {
  const out = [];
  for (const c of pin.chained)
    out.push(`chained script ${shown(c.id)}: a level gate runs it, and an ac-tests-lock/3 pin does not cover it`);
  for (const f of pin.script_files) out.push(`${f.path}: a level gate's script names it, and an ac-tests-lock/3 pin does not cover it`);
  for (const c of pin.configs.filter((x) => isPackageManagerConfigName(x.path)))
    out.push(`${c.path}: a package-manager config, which an ac-tests-lock/3 pin does not cover`);
  if (pin.jest !== null) out.push("package.json's jest key: an ac-tests-lock/3 pin does not cover it");
  return out;
}

/** Recompute over `root` for the RECORDED levels and compare with `recorded` (a shape-valid pin): `{changed, unpinned}`
 *  (L6 — two fields, never one list split by prefix). `changed` holds the differences, or `[reason]` when the live pin
 *  cannot be computed (an unreadable manifest, a symlinked config or named file — itself a change from what was
 *  pinned). `unpinned` is empty for a /5 pin; for a /4 pin it names a non-empty declared gate exclusion (6.36.0); for a
 *  /3 pin it names that and what the live tree has that /4 pins and /3 did not (6.31.0 — the AC gate reads it as
 *  `test-infra-unpinned`, `--check` as a RED). A /3 or /4 pin over a tree the current pin cannot be computed on (a
 *  symlinked `.npmrc` or script-named file, a chain past MAX_CHAIN_HOPS, a gate exclusion that cannot be read) reads
 *  `changed`, not `unpinned`, deliberately: the refusal cannot tell a change the old pin covered from one only the new
 *  pin covers, so it keeps the stricter reading — stated in the contract and the README. */
export function testInfraReds({ recorded, root }) {
  const now = computeTestInfra({ root, levels: recorded.levels });
  if (!now.ok) return { changed: [`the test infrastructure cannot be pinned now: ${now.reason}`], unpinned: [] };
  if (Object.hasOwn(recorded, "exclude")) return { changed: diffTestInfra(recorded, now.pin), unpinned: [] };
  if (Object.hasOwn(recorded, "script_files")) return { changed: diffTestInfra(recorded, now.pin), unpinned: beyondV4(now.pin) };
  const v3 = { ...now.pin, configs: now.pin.configs.filter((c) => isRunnerConfigName(c.path)) };
  return { changed: diffTestInfra(recorded, v3), unpinned: [...beyondV3(now.pin), ...beyondV4(now.pin)] };
}
