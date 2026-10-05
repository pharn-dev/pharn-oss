// pharn/floor/entry-gates-core.mjs — the PURE rules of a delivery run's ENTRY check (loop-entry-preflight, 6.41.0).
// No I/O, no spawning: entry-gates.mjs reads and writes the disk and runs the processes (P3 — this file changes when
// the RULE changes, that one when the storage or the process handling does).
//
// ============================== WHY THIS EXISTS (P7 — the recorded failure) ==============================
// All three real 6.35.0 /pharn-loop runs in a user's project (.dev/measurements/loop-wall-clock-2026-10-05.md §9) had
// project gates red BEFORE any change — a Sentry `typecheck`, unit tests, `build` — and nothing looked until
// /pharn-verify, 28–92 minutes in. /pharn-verify's threshold is absolute, so such a run cannot PASS; with the other two
// entry causes removed (6.36.0's gate exclusion, 6.37.0's pre-run snapshot) a loop would iterate to STOP_CAP on gates no
// build in its plan can fix. So the run now runs verify's discovered gate set ONCE on the tree it starts from, in the
// background while the spec, plan and grill stages work, and reads the verdict before /pharn-test.
//
// ============================== THE VERDICT RULE (`entryVerdict`) ==============================
// Over a stamp `validateStamp` accepted as `{stage: "entry", feature}` and the feature-directory digests the runner
// recorded around each gate:
//   • a gate is RED when its recorded exit is non-zero or it timed out — membership over the stamp, never its output;
//   • a red NON-style gate is ATTRIBUTABLE: it counts;
//   • a red STYLE_SET gate is attributable only when the run's own feature directory held its START digest (`d0`)
//     both before and after that gate ran — i.e. no artifact this run wrote existed yet. Otherwise it is
//     UNATTRIBUTED: reported, never a stop. The style gates run FIRST (gate-run-core.mjs resolveSet orders an `entry`
//     source that way) so this is the normal case; a style gate slow enough to overlap a front-stage write leaves its
//     red to /pharn-verify, exactly as before this check existed.
// status `red` iff at least one attributable red exists, else `green`.
//
// ============================== WHAT IT DOES NOT CLAIM (P0) ==============================
//   • That the run would have failed verify. A gate red at entry predicts a red verify gate only if the run does not
//     fix it; a gate green at entry may still go red. The stop says "red on the tree the run started from".
//   • That a NON-style gate read nothing a front stage wrote. The front writes only markdown under
//     `pharn/features/<name>/`, and that `test` / `typecheck` / `build` / `e2e` do not read it is ADVISORY (the
//     follow-up `entry-gates-nonstyle-overlap` names the extension). `--allow-red-entry` is the person's remedy.
//   • That a style gate read nothing between the two digest samples: a write and a byte-identical restore inside one
//     gate is invisible to two samples.
//   • Provenance (L43). The stamp, the result record and the digests live under `.pharn/`, which Bash reaches; a
//     self-consistent forged set passes. Agreement between the stamp, its digest and the result is all that is checked.
//
// TRUST (P2): gate ids are ALLOWLIST members from a validated stamp; digests are hex; `ps` output is read as three
// integer columns. Nothing here is evaluated, spawned or interpolated into a shell. A value quoted into a detail goes
// through `shown()`, which cannot throw (L62).

import { STYLE_SET, FEATURE_SLUG_RE, REASON_CODES as RUNNER_REASON_CODES } from "./gate-run-core.mjs";

/** The one scratch root of the entry check — ONE per tree (L38): a new `--start` supersedes an earlier runner. */
export const ENTRY_ROOT = ".pharn/pharn-entry";
export const ENTRY_PATHS = Object.freeze({
  root: ENTRY_ROOT,
  gates: `${ENTRY_ROOT}/gates`,
  stamp: `${ENTRY_ROOT}/gates/stamp.json`,
  runner: `${ENTRY_ROOT}/runner.json`,
  progress: `${ENTRY_ROOT}/progress.json`,
  result: `${ENTRY_ROOT}/result.json`,
  log: `${ENTRY_ROOT}/runner.log`,
});

export const RUNNER_SCHEMA = "pharn-entry-runner/1";
export const RESULT_SCHEMA = "pharn-entry-result/1";
export const PROGRESS_SCHEMA = "pharn-entry-progress/1";
export const DOC_SCHEMA = "pharn-entry-gates/1";

/** `--wait`'s statuses and their exit codes. `1` is never chosen, so node's own crash exit is never a verdict. */
export const STATUSES = Object.freeze(["green", "red", "no-gates", "continue", "unusable"]);
export const EXIT = Object.freeze({ green: 0, red: 4, "no-gates": 3, continue: 5, unusable: 2 });

/** The closed reasons of an `unusable` exit (and of a `--start` refusal). */
export const REASON_CODES = Object.freeze([
  "usage-error",
  "path-containment",
  "child-refused",
  "no-runner",
  "runner-died",
  "result-unbound",
  "stamp-invalid",
  "aborted",
  "spawn-failed",
  "crashed",
]);

/** What the runner (or `--start`, or `--abort`) recorded as the run's outcome. */
export const RESULT_STATUSES = Object.freeze(["done", "no-gates", "unusable", "aborted"]);
const RESULT_KEYS = Object.freeze({
  done: ["schema", "status", "feature", "nonce", "stamp_sha256", "feature_dir"],
  "no-gates": ["schema", "status", "feature", "nonce", "detail"],
  unusable: ["schema", "status", "feature", "nonce", "reason_code", "runner_reason", "detail"],
  aborted: ["schema", "status", "feature", "nonce"],
});
const RUNNER_KEYS = Object.freeze(["schema", "feature", "nonce", "pid", "timeout_ms", "d0"]);
const DOC_KEYS = Object.freeze([
  "schema",
  "status",
  "feature",
  "gates",
  "red",
  "unattributed",
  "mutated",
  "excluded",
  "reason_code",
  "runner_reason",
  "detail",
]);

/** The feature directory's digest tokens: `absent`, `unhashable`, or `sha256:<hex>`. */
export const DIGEST_ABSENT = "absent";
export const DIGEST_UNHASHABLE = "unhashable";
const DIGEST_RE = /^(absent|unhashable|sha256:[0-9a-f]{64})$/;
const NONCE_RE = /^[0-9a-f]{32}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const DETAIL_MAX = 600;

/** A value as quoted text, never a throw (L62): `String()` throws on `{"toString":1}`. */
export function shown(v) {
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return (s === undefined ? String(v) : s).slice(0, DETAIL_MAX);
  } catch {
    return Object.prototype.toString.call(v);
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function exactKeys(o, keys) {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => Object.hasOwn(o, x));
}

/** Why `r` is not a runner record, or null. Closed both ways. `pid` is null between the record and the spawn. */
export function runnerRecordDefect(r) {
  if (!isPlainObject(r)) return "is not an object";
  if (!exactKeys(r, RUNNER_KEYS)) return `does not have exactly the keys ${RUNNER_KEYS.join(", ")}`;
  if (r.schema !== RUNNER_SCHEMA) return `schema is not ${RUNNER_SCHEMA}`;
  if (typeof r.feature !== "string" || !FEATURE_SLUG_RE.test(r.feature)) return "feature is not a slug";
  if (typeof r.nonce !== "string" || !NONCE_RE.test(r.nonce)) return "nonce is not 32 hex characters";
  if (r.pid !== null && !(Number.isInteger(r.pid) && r.pid > 1)) return "pid is not null or a process id above 1";
  if (!Number.isInteger(r.timeout_ms) || r.timeout_ms < 100 || r.timeout_ms > 999999999) return "timeout_ms is out of range";
  if (typeof r.d0 !== "string" || !DIGEST_RE.test(r.d0)) return "d0 is not a digest token";
  return null;
}

/** Why `fd` is not a list of per-gate feature-directory digests, or null: `{id, before, after}`, ids distinct. */
function featureDirDefect(fd) {
  if (!Array.isArray(fd)) return "feature_dir is not an array";
  const seen = new Set();
  for (const x of fd) {
    if (!isPlainObject(x) || !exactKeys(x, ["id", "before", "after"])) return "a feature_dir entry is not {id, before, after}";
    if (typeof x.id !== "string" || x.id === "" || seen.has(x.id)) return "a feature_dir id is empty or repeated";
    seen.add(x.id);
    if (!DIGEST_RE.test(x.before) || !DIGEST_RE.test(x.after)) return "a feature_dir digest is not a digest token";
  }
  return null;
}

/** Why `p` is not the runner's progress record (the digests so far, so a `--wait` takeover keeps them), or null. */
export function progressRecordDefect(p) {
  if (!isPlainObject(p) || !exactKeys(p, ["schema", "feature", "nonce", "feature_dir"]))
    return "is not {schema, feature, nonce, feature_dir}";
  if (p.schema !== PROGRESS_SCHEMA) return `schema is not ${PROGRESS_SCHEMA}`;
  if (typeof p.feature !== "string" || !FEATURE_SLUG_RE.test(p.feature)) return "feature is not a slug";
  if (typeof p.nonce !== "string" || !NONCE_RE.test(p.nonce)) return "nonce is not 32 hex characters";
  return featureDirDefect(p.feature_dir);
}

/** Why `r` is not a result record, or null. Closed both ways, per status. */
export function resultRecordDefect(r) {
  if (!isPlainObject(r)) return "is not an object";
  if (!RESULT_STATUSES.includes(r.status)) return "status is not a result status";
  const keys = RESULT_KEYS[r.status];
  if (!exactKeys(r, keys)) return `a ${r.status} result does not have exactly the keys ${keys.join(", ")}`;
  if (r.schema !== RESULT_SCHEMA) return `schema is not ${RESULT_SCHEMA}`;
  if (typeof r.feature !== "string" || !FEATURE_SLUG_RE.test(r.feature)) return "feature is not a slug";
  if (typeof r.nonce !== "string" || !NONCE_RE.test(r.nonce)) return "nonce is not 32 hex characters";
  if (r.status === "done") {
    if (typeof r.stamp_sha256 !== "string" || !HEX64_RE.test(r.stamp_sha256)) return "stamp_sha256 is not a sha256 digest";
    const fd = featureDirDefect(r.feature_dir);
    if (fd !== null) return fd;
  }
  if (r.status === "unusable") {
    if (!REASON_CODES.includes(r.reason_code)) return "reason_code is not one of REASON_CODES";
    if (r.runner_reason !== null && !RUNNER_REASON_CODES.includes(r.runner_reason)) return "runner_reason is not run-gates' reason";
  }
  if ((r.status === "unusable" || r.status === "no-gates") && typeof r.detail !== "string") return "detail is not a string";
  return null;
}

/** The verdict over a validated entry stamp. `featureDir` is the result's `feature_dir`; `d0` the runner record's. */
export function entryVerdict({ stamp, featureDir, d0 }) {
  const byId = new Map((featureDir ?? []).map((x) => [x.id, x]));
  const gates = [];
  const red = [];
  const unattributed = [];
  const mutated = [];
  for (const r of stamp.runs) {
    gates.push({ id: r.id, exit: r.exit, timed_out: r.timed_out, mutated: r.mutated });
    if (r.mutated === true) mutated.push(r.id);
    if (!(r.exit !== 0 || r.timed_out === true)) continue;
    if (!STYLE_SET.includes(r.id)) {
      red.push(r.id);
      continue;
    }
    const fd = byId.get(r.id);
    const untouched = d0 !== DIGEST_UNHASHABLE && fd !== undefined && fd.before === d0 && fd.after === d0;
    (untouched ? red : unattributed).push(r.id);
  }
  const excluded = isPlainObject(stamp.excluded) && Array.isArray(stamp.excluded.ids) ? [...stamp.excluded.ids] : [];
  return { status: red.length ? "red" : "green", gates, red, unattributed, mutated, excluded };
}

/** The ONE document `--wait` prints, closed keys for every status. */
export function entryDocument({ status, feature, verdict = null, reasonCode = null, runnerReason = null, detail = null }) {
  const doc = {
    schema: DOC_SCHEMA,
    status,
    feature,
    gates: verdict ? verdict.gates : [],
    red: verdict ? verdict.red : [],
    unattributed: verdict ? verdict.unattributed : [],
    mutated: verdict ? verdict.mutated : [],
    excluded: verdict ? verdict.excluded : [],
    reason_code: reasonCode,
    runner_reason: runnerReason,
    detail: detail === null ? null : shown(detail),
  };
  return doc;
}

/** Why `d` is not a document `--wait` may print, or null. Closed both ways (the tests run it over every exit). */
export function documentDefect(d) {
  if (!isPlainObject(d)) return "is not an object";
  if (!exactKeys(d, DOC_KEYS)) return `does not have exactly the keys ${DOC_KEYS.join(", ")}`;
  if (d.schema !== DOC_SCHEMA) return "schema";
  if (!STATUSES.includes(d.status)) return "status";
  if (d.status === "unusable" ? !REASON_CODES.includes(d.reason_code) : d.reason_code !== null) return "reason_code";
  for (const k of ["gates", "red", "unattributed", "mutated", "excluded"]) if (!Array.isArray(d[k])) return k;
  return null;
}

/** `ps -A -o pid=,ppid=,pgid=` → rows of three positive integers; any other line is skipped (never guessed). */
export function parsePsTable(stdout) {
  const rows = [];
  for (const line of String(stdout).split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts.length !== 3 || !parts.every((p) => /^\d{1,10}$/.test(p))) continue;
    const [pid, ppid, pgid] = parts.map(Number);
    rows.push({ pid, ppid, pgid });
  }
  return rows;
}

/** The process groups of every DESCENDANT of `root` (by ppid, transitively) other than root's own group, sorted.
 *  A group id at or below 1 is never returned. */
export function descendantGroups(rows, root) {
  const children = new Map();
  for (const r of rows) {
    if (!children.has(r.ppid)) children.set(r.ppid, []);
    children.get(r.ppid).push(r);
  }
  const groups = new Set();
  const seen = new Set([root]);
  const queue = [root];
  while (queue.length) {
    const p = queue.shift();
    for (const c of children.get(p) ?? []) {
      if (seen.has(c.pid)) continue;
      seen.add(c.pid);
      queue.push(c.pid);
      if (c.pgid > 1 && c.pgid !== root) groups.add(c.pgid);
    }
  }
  return [...groups].sort((a, b) => a - b);
}
