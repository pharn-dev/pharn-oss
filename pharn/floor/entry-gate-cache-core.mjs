// pharn/floor/entry-gate-cache-core.mjs — the PURE rules of the entry check's cached-red evidence (gate-evidence-cache,
// Linear CORE-86). No I/O: entry-gate-cache.mjs reads and writes the git dir, entry-gates.mjs calls both (P3 — this file
// changes when a RULE changes, that one when the STORAGE does).
//
// ============================== WHY THIS EXISTS (P7) ==============================
// .dev/measurements/loop-baseline-2026-11-11.md §6: 16 of 36 /pharn-loop runs stopped at the entry check, and 5 of those
// 16 used a base commit an earlier run had used. Each re-run paid the entry runner again (median 15.7 min) and the spec
// stage before the same stop. That is an UPPER BOUND — a stopped run leaves its feature directory uncommitted and no
// ledger recorded a tree fingerprint, so tree equality was unverifiable — and §12 rated the task needs-evidence. The
// orchestrator, under the maintainer's delegation, scoped it to REDS ONLY: a green is never cached, so nothing here ever
// stands in for evidence a later check relies on. A cached red can only STOP a run, before its spec stage.
//
// ============================== THE RECORD ==============================
// One record per repository (the git COMMON dir, so every worktree reads it), written by `entry-gates.mjs --wait` after a
// decided verdict (`cacheableRed` → `buildRecord`), and replaced or CLEARED by every later decided `--wait` — last writer
// wins. A clear only ever removes a hit; it can never add a stop. The record carries the KEY (every input below), the
// SOURCE run (its feature, nonce and the moment its gates started) and the red gate ids.
//
// ============================== THE DECISION (`decideCache`) — first failing check decides ==============================
//   refresh             `--refresh` was given (the loops' `--refresh-entry` or `--allow-red-entry`; /pharn-ship's Continue)
//   no-record           no record file
//   record-unusable     unreadable, a link, oversize, not JSON, or not exactly the record shape (`recordDefect`)
//   inputs-unavailable  this run's inputs could not all be computed (no HEAD, git failed, the exclusion refused, a throw)
//   expired             the source run's gates started more than CACHE_MAX_AGE_MS ago
//   future-dated        …or more than FUTURE_SKEW_MS in the future (a clock moved, or a forged date)
//   node-changed        `process.version` + platform-arch differ
//   cwd-changed         the repo-relative prefix (`git rev-parse --show-prefix`) differs
//   timeout-changed     the per-gate timeout differs
//   exclude-changed     the declared `gates.exclude` list differs
//   gates-changed       any gate's {id, shell, argv, files} differs, or the set does (the evidence-only base:test slot left out)
//   install-changed     the digest of a lockfile or a package manager's install record differs (INSTALL_FILES)
//   head-changed        HEAD differs
//   tree-changed        the entry fingerprint differs, the source run's and this run's own feature directories excluded
// The specific inputs come before the tree, so a tracked lockfile edit reads `install-changed` and a `pharn.config.json`
// exclusion edit reads `exclude-changed`, though both also move the tree.
//
// FEATURE-NEUTRAL (L58). A stopped run leaves `pharn/features/<src>/` behind, and the next run picks a new name, so the
// lookup's tree digest excludes BOTH feature directories. With one excluded, the digest is the ENTRY_ALGO digest itself,
// so the record carries the source stamp's own `fingerprint.init`. Every other leftover feature directory stays bound.
//
// WHAT IS CACHED (`cacheableRed`). A completed run (`--wait` decided over a bound `done` result) whose verdict is `red`,
// with no unmeasured gate (none timed out or failed to start), no mutated gate (base:test included), a non-null HEAD, and
// at least one red gate outside STYLE_SET. Only those non-style reds are recorded: a style gate can read markdown in the
// feature directories the key excludes, so a style red is never carried across runs.
//
// ============================== WHAT IT DOES NOT CLAIM (P0) ==============================
//   • FLOOR: the hit decision — string equality over sha256 digests and canonical JSON, membership over closed enums.
//   • ADVISORY: that a cached red is what a fresh run would measure. Environment variables, machine load, a flaky test,
//     ignored files other than INSTALL_FILES (caches, `.env`, build output) and the ABSOLUTE working directory are not
//     bound — the absolute path is left out on purpose, so a fresh worktree of the same repository can hit. The age limit
//     bounds their drift; it does not remove it.
//   • ADVISORY, inherited from entry-gates-core.mjs: that a non-style gate read nothing in the excluded feature
//     directories (`entry-gates-nonstyle-overlap`).
//   • Provenance (L43). The record is out of the write tools' reach, but a Bash writer reaches the git dir. A forged record
//     can only stop a run, never green one, and `--refresh` measures again.
//
// TRUST (P2): the decision reads ids, hex digests, a slug, an ISO time and a nonce, by equality and membership only. The
// record's `source.feature` is slug-gated before it names a directory to exclude, and every gate id is an ALLOWLIST
// member, so the stop line `--start` prints from a record carries no free text. Gate output is never read.

import { ALLOWLIST, STYLE_SET, FEATURE_SLUG_RE, ENTRY_BASE_TEST_ID } from "./gate-run-core.mjs";
import { LOCKFILE_FAMILIES } from "./stage-regress-core.mjs";

export const CACHE_BASENAME = "pharn-entry-gate-cache.json";
export const INPUTS_BASENAME = "pharn-entry-cache-inputs.json";
export const RECORD_SCHEMA = "pharn-entry-gate-cache/1";
export const INPUTS_SCHEMA = "pharn-entry-cache-inputs/1";
export const RECORD_MAX_BYTES = 1 << 20;
/** The age limit (GATE 1: fixed, no config key). */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** A source run dated further ahead than this is `future-dated`. */
export const FUTURE_SKEW_MS = 5 * 60 * 1000;

/** The install state: every lockfile name (stage-regress-core.mjs LOCKFILE_FAMILIES, the one owner — L35) and each
 *  package manager's record of the installed tree. Sorted, so the key does not depend on the table's order. */
export const INSTALL_RECORDS = Object.freeze([
  "node_modules/.package-lock.json",
  "node_modules/.modules.yaml",
  "node_modules/.yarn-state.yml",
  "node_modules/.yarn-integrity",
]);
export const INSTALL_FILES = Object.freeze([...Object.values(LOCKFILE_FAMILIES).flat(), ...INSTALL_RECORDS].sort());

/** The closed misses, in decision order (the first failing check decides). */
export const MISSES = Object.freeze([
  "refresh",
  "no-record",
  "record-unusable",
  "inputs-unavailable",
  "expired",
  "future-dated",
  "node-changed",
  "cwd-changed",
  "timeout-changed",
  "exclude-changed",
  "gates-changed",
  "install-changed",
  "head-changed",
  "tree-changed",
]);

/** Why a decided verdict is not recorded (the slot is then cleared), in decision order. */
export const NOT_CACHED = Object.freeze([
  "inputs-unavailable",
  "not-red",
  "unmeasured",
  "mutated",
  "no-head",
  "style-only",
  // the verdict was cacheable but the stamp's gate set could not be bound into a record (`buildRecord` returned null)
  "gates-unbound",
]);

const HEX64_RE = /^[0-9a-f]{64}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const NONCE_RE = /^[0-9a-f]{32}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const INPUT_KEYS = Object.freeze(["schema", "feature", "nonce", "measured_at", "node", "prefix", "timeout_ms", "exclude", "install"]);
const RECORD_KEYS = Object.freeze(["schema", "key", "source", "red"]);
const KEY_KEYS = Object.freeze(["node", "prefix", "timeout_ms", "exclude", "gates", "install", "head", "tree"]);
const SOURCE_KEYS = Object.freeze(["feature", "nonce", "measured_at"]);
const GATE_KEYS = Object.freeze(["id", "shell", "argv", "files"]);

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}

function exactKeys(o, keys) {
  const own = Object.keys(o);
  return own.length === keys.length && keys.every((k) => Object.hasOwn(o, k));
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

function isTime(s) {
  return typeof s === "string" && ISO_RE.test(s) && Number.isFinite(Date.parse(s));
}

function excludeDefect(v) {
  if (!isStringArray(v)) return "exclude is not a list of strings";
  for (let i = 1; i < v.length; i++) if (!(v[i - 1] < v[i])) return "exclude is not sorted and unique";
  return null;
}

function installDefect(v) {
  if (!Array.isArray(v) || v.length !== INSTALL_FILES.length) return "install does not name every INSTALL_FILES member";
  for (let i = 0; i < v.length; i++) {
    const pair = v[i];
    if (!Array.isArray(pair) || pair.length !== 2 || pair[0] !== INSTALL_FILES[i]) return "install is not INSTALL_FILES in order";
    if (!(pair[1] === null || (typeof pair[1] === "string" && HEX64_RE.test(pair[1])))) return "an install digest is not hex or null";
  }
  return null;
}

function gatesDefect(v) {
  if (!Array.isArray(v)) return "gates is not a list";
  for (const g of v) {
    if (!isPlainObject(g) || !exactKeys(g, GATE_KEYS)) return "a gate does not have exactly the keys id, shell, argv, files";
    // An ALLOWLIST member (the entry set is discovered from it; base:test is never keyed): so the ids a stop line quotes
    // are enum members, never free text a forged record could carry (P2).
    if (!ALLOWLIST.includes(g.id)) return "a gate id is not an ALLOWLIST member";
    const shellOk = g.shell === null || typeof g.shell === "string";
    const argvOk = g.argv === null || isStringArray(g.argv);
    if (!shellOk || !argvOk || (g.shell === null) === (g.argv === null)) return "a gate has neither or both of shell and argv";
    if (!isStringArray(g.files)) return "a gate's files is not a list of strings";
  }
  return null;
}

/** Why `v` is not a start-time inputs record, or null. Closed both ways. */
export function inputsDefect(v) {
  if (!isPlainObject(v) || !exactKeys(v, INPUT_KEYS)) return `does not have exactly the keys ${INPUT_KEYS.join(", ")}`;
  if (v.schema !== INPUTS_SCHEMA) return `schema is not ${INPUTS_SCHEMA}`;
  if (typeof v.feature !== "string" || !FEATURE_SLUG_RE.test(v.feature)) return "feature is not a slug";
  if (typeof v.nonce !== "string" || !NONCE_RE.test(v.nonce)) return "nonce is not 32 hex characters";
  if (!isTime(v.measured_at)) return "measured_at is not an ISO time";
  if (typeof v.node !== "string" || v.node === "") return "node is not a string";
  if (typeof v.prefix !== "string") return "prefix is not a string";
  if (!Number.isSafeInteger(v.timeout_ms) || v.timeout_ms <= 0) return "timeout_ms is not a positive integer";
  return excludeDefect(v.exclude) ?? installDefect(v.install);
}

/** Why `r` is not a cache record, or null. Closed both ways; `source.feature` is slug-gated here, before any caller
 *  builds a directory name from it. */
export function recordDefect(r) {
  if (!isPlainObject(r) || !exactKeys(r, RECORD_KEYS)) return `does not have exactly the keys ${RECORD_KEYS.join(", ")}`;
  if (r.schema !== RECORD_SCHEMA) return `schema is not ${RECORD_SCHEMA}`;
  const k = r.key;
  if (!isPlainObject(k) || !exactKeys(k, KEY_KEYS)) return `key does not have exactly the keys ${KEY_KEYS.join(", ")}`;
  if (typeof k.node !== "string" || k.node === "") return "key.node is not a string";
  if (typeof k.prefix !== "string") return "key.prefix is not a string";
  if (!Number.isSafeInteger(k.timeout_ms) || k.timeout_ms <= 0) return "key.timeout_ms is not a positive integer";
  const kd = excludeDefect(k.exclude) ?? gatesDefect(k.gates) ?? installDefect(k.install);
  if (kd !== null) return `key: ${kd}`;
  if (typeof k.head !== "string" || !SHA_RE.test(k.head)) return "key.head is not a commit";
  if (!isPlainObject(k.tree) || !exactKeys(k.tree, ["algo", "digest"])) return "key.tree is not {algo, digest}";
  if (typeof k.tree.algo !== "string" || k.tree.algo === "" || typeof k.tree.digest !== "string" || !HEX64_RE.test(k.tree.digest)) {
    return "key.tree is not a fingerprint";
  }
  const s = r.source;
  if (!isPlainObject(s) || !exactKeys(s, SOURCE_KEYS)) return `source does not have exactly the keys ${SOURCE_KEYS.join(", ")}`;
  if (typeof s.feature !== "string" || !FEATURE_SLUG_RE.test(s.feature)) return "source.feature is not a slug";
  if (typeof s.nonce !== "string" || !NONCE_RE.test(s.nonce)) return "source.nonce is not 32 hex characters";
  if (!isTime(s.measured_at)) return "source.measured_at is not an ISO time";
  if (!isStringArray(r.red) || r.red.length === 0) return "red is not a non-empty list";
  for (const id of r.red) {
    if (id === "" || STYLE_SET.includes(id) || id === ENTRY_BASE_TEST_ID) return "red names a style gate, the base:test slot or nothing";
    if (!k.gates.some((g) => g.id === id)) return "red names a gate outside key.gates";
  }
  return null;
}

/** The gate set a key binds: {id, shell, argv, files} per entry or run, in order, the evidence-only base:test slot left out.
 *  Accepts run-gates' `entries` (init) and a stamp's `runs` alike — both carry those four fields. */
export function gateSet(list) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const e of list) {
    if (!isPlainObject(e)) return null;
    if (e.id === ENTRY_BASE_TEST_ID) continue;
    out.push({ id: e.id, shell: e.shell ?? null, argv: e.argv ?? null, files: Array.isArray(e.files) ? [...e.files] : e.files });
  }
  return gatesDefect(out) === null ? out : null;
}

/** May this decided verdict be recorded? `{cacheable: true, red}` or `{cacheable: false, why}` (a NOT_CACHED member).
 *  `inputs` is the start-time record (null when unread or unbound); `nonce` and `feature` the runner record's. */
export function cacheableRed({ verdict, stamp, inputs, nonce, feature }) {
  if (inputs === null || inputsDefect(inputs) !== null || inputs.nonce !== nonce || inputs.feature !== feature) {
    return { cacheable: false, why: "inputs-unavailable" };
  }
  if (!verdict || verdict.status !== "red") return { cacheable: false, why: "not-red" };
  if (verdict.unmeasured.length !== 0) return { cacheable: false, why: "unmeasured" };
  if (verdict.mutated.length !== 0 || stamp.runs.some((r) => r.mutated === true)) return { cacheable: false, why: "mutated" };
  if (typeof stamp.head !== "string" || !SHA_RE.test(stamp.head)) return { cacheable: false, why: "no-head" };
  const red = verdict.red.filter((id) => !STYLE_SET.includes(id) && id !== ENTRY_BASE_TEST_ID);
  if (red.length === 0) return { cacheable: false, why: "style-only" };
  return { cacheable: true, red };
}

/** The record for a cacheable red, or null when the stamp's gate set cannot be bound. */
export function buildRecord({ inputs, stamp, red }) {
  const gates = gateSet(stamp.runs);
  if (gates === null) return null;
  const record = {
    schema: RECORD_SCHEMA,
    key: {
      node: inputs.node,
      prefix: inputs.prefix,
      timeout_ms: inputs.timeout_ms,
      exclude: [...inputs.exclude],
      gates,
      install: inputs.install.map(([p, d]) => [p, d]),
      head: stamp.head,
      tree: { algo: stamp.fingerprint.algo, digest: stamp.fingerprint.init },
    },
    source: { feature: inputs.feature, nonce: inputs.nonce, measured_at: inputs.measured_at },
    red: [...red],
  };
  return recordDefect(record) === null ? record : null;
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The decision. `read` is the record read `{state: absent | unusable | ok, value?}`; `live` is this run's inputs
 * `{node, prefix, timeout_ms, exclude, install, gates, head}` or null; `treeFor(sourceFeature)` returns this tree's
 * `{algo, digest}` with that feature's directory excluded too, or null. Returns `{hit: false, miss}` or
 * `{hit: true, source, ageMs, red}`. `treeFor` is called only when every other check passed.
 */
export function decideCache({ refresh, read, live, treeFor, nowMs }) {
  if (refresh === true) return { hit: false, miss: "refresh" };
  if (!read || read.state === "absent") return { hit: false, miss: "no-record" };
  if (read.state !== "ok" || recordDefect(read.value) !== null) return { hit: false, miss: "record-unusable" };
  const r = read.value;
  if (live === null || typeof live !== "object" || !Number.isFinite(nowMs) || typeof live.head !== "string" || !SHA_RE.test(live.head)) {
    return { hit: false, miss: "inputs-unavailable" };
  }
  const ageMs = nowMs - Date.parse(r.source.measured_at);
  if (ageMs > CACHE_MAX_AGE_MS) return { hit: false, miss: "expired" };
  if (ageMs < -FUTURE_SKEW_MS) return { hit: false, miss: "future-dated" };
  const k = r.key;
  if (k.node !== live.node) return { hit: false, miss: "node-changed" };
  if (k.prefix !== live.prefix) return { hit: false, miss: "cwd-changed" };
  if (k.timeout_ms !== live.timeout_ms) return { hit: false, miss: "timeout-changed" };
  if (!same(k.exclude, live.exclude)) return { hit: false, miss: "exclude-changed" };
  if (!same(k.gates, live.gates)) return { hit: false, miss: "gates-changed" };
  if (!same(k.install, live.install)) return { hit: false, miss: "install-changed" };
  if (k.head !== live.head) return { hit: false, miss: "head-changed" };
  const tree = treeFor(r.source.feature);
  if (tree === null) return { hit: false, miss: "inputs-unavailable" };
  if (tree.algo !== k.tree.algo || tree.digest !== k.tree.digest) return { hit: false, miss: "tree-changed" };
  return { hit: true, source: { ...r.source }, ageMs: Math.max(0, ageMs), red: [...r.red] };
}

/** A duration as people read it: `< 1 min`, `42 min`, `3 h 05 min`. */
export function formatAge(ms) {
  const min = Math.floor(Math.max(0, ms) / 60000);
  if (min < 1) return "< 1 min";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}
