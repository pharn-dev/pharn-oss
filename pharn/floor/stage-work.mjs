// pharn/floor/stage-work.mjs — the DETERMINISTIC WORK RECORD a `/pharn-regress` or `/pharn-verify` execution leaves for
// the cost ledger (`cost.json`'s `work[]`, `pharn/pharn-contracts/cost-ledger.md`, "Stage executions and deterministic
// work"). The one owner of the record's schema, its derivation, its validation, its append and its read ([[L35]]).
//
// ── WHY IT EXISTS (L42 — capture at the moment of the act) ───────────────────────────────────────────────────────
// Whether a regress execution reused its BASE evidence (6.33.0) and how many VERIFY gate results were reused from the
// REGRESS/HEAD execution (6.34.0) is recorded in `regression-report.json`'s `base_evidence` and `verify-report.json`'s
// `gate_reuse` — and both reports are OVERWRITTEN every iteration, and the gate-run stamps are cleared at every stage's
// fresh start. So for every iteration but the last, the work actually performed or avoided is gone by the time the
// ledger is emitted. The stage script therefore appends ONE compact line at its `done` exit, derived from the evidence
// it just finished with, to `<.pharn/cost>/<feature>/work.jsonl` — beside the markers the ledger already reads.
//
// ── WHAT A RECORD SAYS (schema `pharn-stage-work/1`) ─────────────────────────────────────────────────────────────
//   {"schema","stage":"pharn-regress","ts","session_id",
//    "head":{"required","executed","reused","no_files"},
//    "base":{"evidence":"fresh"|"reused","miss","required","executed","reused","no_files"},
//    "install":null | {"exit","timed_out","ms"}}
//   {"schema","stage":"pharn-verify","ts","session_id","gates":{"required","executed","reused","no_files"}}
// Counts come from a gate-run stamp's `runs[]` (`countRuns`): `executed` = entries with `ran: true` (a process ran),
// `reused` = `reason: "reused"` (a VERIFY result taken from the REGRESS/HEAD execution), `no_files` = `reason:
// "no-files"` (nothing to run), `required` = every entry. For a BASE HIT the base stamp is the earlier execution's, so
// its `ran: true` entries did NOT run here: `executed` is 0 and `reused` = required − no_files. Invariant, checked:
// executed + reused + no_files === required. A BASE worktree was created, and an install could run, only when
// `base.evidence` is `fresh` — those facts are DERIVED from `evidence`, never stored a second time. `install` is null
// when no install ran (not configured, or skipped by reuse — `evidence` says which).
//
// ── HONEST SCOPE (P0) ────────────────────────────────────────────────────────────────────────────────────────────
// FLOOR: the record's shape and invariants (closed keys, enums, integer compare) — `validateWork`, applied by the
//   ledger emitter and checker to every line; the counts are derived by tested code from the stamp the stage just
//   used for its verdict.
// ADVISORY: that a record was written for every execution (only a `done` exit writes one; a refused, unusable,
//   crashed or `continue` exit writes none, so gates a stage ran before refusing are NOT recorded); that the file
//   was not edited afterwards (`.pharn/` is Bash-reachable, LIMITS.md §6 — agreement, never provenance, [[L43]]).
//   `install.ms` is ONE `performance.now()` interval around the install process, integer milliseconds — monotonic
//   within that one process, and nothing more; a killed-and-resumed install records the run that completed.
// OBSERVATIONAL ONLY: nothing reads a record to decide a verdict, an exit, a reuse, a route or a commit. The append is
//   best-effort — `appendWork` never throws; a stage whose append fails prints one note and exits exactly as before.

import { closeSync, constants as FS, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_BASE, cleanScalar } from "./mark-phase.mjs";
import { isIdentityToken, isTokenCount } from "./cost-value-core.mjs";
import { tsMs } from "./run-window-core.mjs";
import { FEATURE_SLUG_RE, REUSED_REASON } from "./gate-run-core.mjs";
import { BASE_REUSE_MISSES } from "./stage-regress-core.mjs";

export const WORK_SCHEMA = "pharn-stage-work/1";
/** The file, under `<DEFAULT_BASE>/<feature>/`, beside `markers.jsonl`. */
export const WORK_FILE = "work.jsonl";
/** The two stage labels a record may carry — the `--stage` labels the orchestrators mark these stages with. */
export const REGRESS_STAGE = "pharn-regress";
export const VERIFY_STAGE = "pharn-verify";
export const WORK_STAGES = Object.freeze([REGRESS_STAGE, VERIFY_STAGE]);
export const BASE_EVIDENCE = Object.freeze(["fresh", "reused"]);

export const SIDE_KEYS = Object.freeze(["required", "executed", "reused", "no_files"]);
export const BASE_KEYS = Object.freeze(["evidence", "miss", ...SIDE_KEYS]);
export const INSTALL_KEYS = Object.freeze(["exit", "timed_out", "ms"]);
export const REGRESS_KEYS = Object.freeze(["schema", "stage", "ts", "session_id", "head", "base", "install"]);
export const VERIFY_KEYS = Object.freeze(["schema", "stage", "ts", "session_id", "gates"]);

/** A gate set larger than this is not a gate set; it also keeps every sum below an exactness limit. */
export const MAX_GATES = 100000;

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const exactKeys = (o, keys) => {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => Object.hasOwn(o, x));
};

/** The session id a record carries: the environment's value when it is a bounded identity token, else null — the
 *  work record is never lost over a malformed environment variable, and never carries one. */
const sessionOrNull = (v) => (isIdentityToken(v) ? v : null);

/** `{required, executed, reused, no_files}` over a stamp's `runs[]`, or null when `runs` is not a list of entries this
 *  rule can classify (a stamp the verdict accepted always is). */
export function countRuns(stamp) {
  if (!isPlain(stamp) || !Array.isArray(stamp.runs)) return null;
  let executed = 0;
  let reused = 0;
  let noFiles = 0;
  for (const r of stamp.runs) {
    if (!isPlain(r)) return null;
    if (r.ran === true) executed++;
    else if (r.ran === false && r.reason === REUSED_REASON) reused++;
    else if (r.ran === false && r.reason === "no-files") noFiles++;
    else return null;
  }
  return { required: stamp.runs.length, executed, reused, no_files: noFiles };
}

/** The regress record, from the finished HEAD and BASE stamps and the stage's final reuse decision. Null when a stamp
 *  cannot be counted. `baseReuse` is `{reused, miss}`; `installResult` is null or `{exit, timedOut, ms?}`. TOTAL: it
 *  never throws (a stage script evaluates it before its `done` exit, which must not depend on it). */
export function regressWork(input) {
  try {
    return regressWorkUnsafe(input);
  } catch {
    return null;
  }
}

function regressWorkUnsafe({ headStamp, baseStamp, baseReuse, installResult, ts, sessionId = null }) {
  const head = countRuns(headStamp);
  const base = countRuns(baseStamp);
  if (head === null || base === null || !baseReuse || typeof baseReuse.reused !== "boolean") return null;
  const reused = baseReuse.reused;
  const rec = {
    schema: WORK_SCHEMA,
    stage: REGRESS_STAGE,
    ts,
    session_id: sessionOrNull(sessionId),
    head,
    base: reused
      ? {
          evidence: "reused",
          miss: null,
          required: base.required,
          executed: 0,
          reused: base.required - base.no_files,
          no_files: base.no_files,
        }
      : { evidence: "fresh", miss: baseReuse.miss ?? null, ...base },
    install:
      reused || installResult === null || installResult === undefined
        ? null
        : {
            exit: installResult.exit,
            timed_out: installResult.timedOut === true,
            ms: Number.isSafeInteger(installResult.ms) && installResult.ms >= 0 ? installResult.ms : null,
          },
  };
  return validateWork(rec).ok ? rec : null;
}

/** The verify record, from the finished verify stamp. Null when the stamp cannot be counted. TOTAL, like `regressWork`. */
export function verifyWork(input) {
  try {
    const { stamp, ts, sessionId = null } = input;
    const gates = countRuns(stamp);
    if (gates === null) return null;
    const rec = { schema: WORK_SCHEMA, stage: VERIFY_STAGE, ts, session_id: sessionOrNull(sessionId), gates };
    return validateWork(rec).ok ? rec : null;
  } catch {
    return null;
  }
}

function sideDefect(s, path) {
  if (!isPlain(s)) return `${path} is not an object`;
  for (const k of SIDE_KEYS) {
    if (!isTokenCount(s[k]) || s[k] > MAX_GATES) return `${path}.${k} is not a count in 0..${MAX_GATES}`;
  }
  if (s.executed + s.reused + s.no_files !== s.required) return `${path}: executed + reused + no_files !== required`;
  return null;
}

/**
 * Validate one record. Total over any parsed JSON value ([[L62]]): every value is type-tested before it is read as
 * anything, and no refusal quotes the value. Returns `{ok: true}` or `{ok: false, reason}`.
 */
export function validateWork(rec) {
  const bad = (reason) => ({ ok: false, reason });
  if (!isPlain(rec)) return bad("not an object");
  if (rec.schema !== WORK_SCHEMA) return bad("schema");
  if (!WORK_STAGES.includes(rec.stage)) return bad("stage");
  if (!exactKeys(rec, rec.stage === REGRESS_STAGE ? REGRESS_KEYS : VERIFY_KEYS)) return bad("key set");
  if (!cleanScalar(rec.ts, 64) || tsMs(rec.ts) === null) return bad("ts");
  if (rec.session_id !== null && !isIdentityToken(rec.session_id)) return bad("session_id");
  if (rec.stage === VERIFY_STAGE) {
    const d = sideDefect(rec.gates, "gates");
    return d === null ? { ok: true } : bad(d);
  }
  const h = sideDefect(rec.head, "head");
  if (h !== null) return bad(h);
  const b = rec.base;
  if (!isPlain(b) || !exactKeys(b, BASE_KEYS)) return bad("base key set");
  const bd = sideDefect(b, "base");
  if (bd !== null) return bad(bd);
  if (!BASE_EVIDENCE.includes(b.evidence)) return bad("base.evidence");
  if (b.evidence === "reused") {
    if (b.miss !== null || b.executed !== 0 || rec.install !== null) return bad("a reused BASE has no miss, executed 0 and no install");
  } else if (b.reused !== 0 || (b.miss !== null && !BASE_REUSE_MISSES.includes(b.miss))) {
    return bad("a fresh BASE reuses nothing and names a closed miss code (or null)");
  }
  const i = rec.install;
  if (i !== null) {
    if (!isPlain(i) || !exactKeys(i, INSTALL_KEYS)) return bad("install key set");
    if (!Number.isSafeInteger(i.exit)) return bad("install.exit");
    if (typeof i.timed_out !== "boolean") return bad("install.timed_out");
    if (i.ms !== null && !isTokenCount(i.ms)) return bad("install.ms");
  }
  return { ok: true };
}

/**
 * Append one record as one JSON line to `<root>/<base>/<feature>/work.jsonl`. BEST-EFFORT and TOTAL: never throws;
 * returns `{ok: true}` or `{ok: false, why}`. Refuses (writes nothing) when a record is invalid, the feature is not a
 * slug, or any directory component under `root` is a symlink or not a directory ([[L54]]/[[L59]]: lstat, never
 * followed), and opens the file with `O_NOFOLLOW | O_NONBLOCK` so a link planted at the file is refused, not followed,
 * and a FIFO planted there fails the open (ENXIO with no reader) or the regular-file test instead of BLOCKING the stage
 * before its `done` exit (GATE-2 review: a plain open hung on a planted FIFO, reproduced).
 */
export function appendWork({ feature, record, root = ".", base = DEFAULT_BASE }) {
  try {
    if (typeof feature !== "string" || !FEATURE_SLUG_RE.test(feature)) return { ok: false, why: "feature is not a slug" };
    if (!validateWork(record).ok) return { ok: false, why: "record is not a valid work record" };
    const segments = [
      ...String(base)
        .split("/")
        .filter((s) => s && s !== "."),
      feature,
    ];
    if (segments.some((s) => s === "..")) return { ok: false, why: "base names a parent directory" };
    let dir = root;
    for (const seg of segments) {
      dir = join(dir, seg);
      let st = null;
      try {
        st = lstatSync(dir);
      } catch (e) {
        if (e.code !== "ENOENT") return { ok: false, why: `cannot lstat a state directory (${e.code})` };
      }
      if (st === null) mkdirSync(dir);
      else if (st.isSymbolicLink() || !st.isDirectory())
        return { ok: false, why: "a state directory component is a symlink or not a directory" };
    }
    const flags = FS.O_WRONLY | FS.O_APPEND | FS.O_CREAT | (FS.O_NOFOLLOW ?? 0) | (FS.O_NONBLOCK ?? 0);
    const fd = openSync(join(dir, WORK_FILE), flags, 0o644);
    try {
      if (!fstatSync(fd).isFile()) return { ok: false, why: "the work file is not a regular file" };
      writeSync(fd, `${JSON.stringify(record)}\n`);
    } finally {
      closeSync(fd);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, why: `append failed (${e && typeof e.code === "string" ? e.code : "error"})` };
  }
}

/** A work file larger than this is not read (its records are dropped as one `work.jsonl` entry). One line per stage
 *  execution is ~300 bytes, so this is millions of executions. */
export const WORK_FILE_MAX_BYTES = 16 * 1024 * 1024;

/**
 * Read a work file: `{records, dropped}`. `records` are the lines `validateWork` accepts, in file order; `dropped`
 * lists `work.jsonl[<n>]` for every other non-empty line — n is its index among the FILE's non-empty lines, across every
 * run the file has seen (the file is never pruned), not an index into a ledger's `work[]`; a torn final line from an
 * interrupted append included. No raw value is ever copied into `dropped`. A missing file is `{[], []}`. A path that is
 * not a regular file (a symlink — `O_NOFOLLOW` —, a FIFO — `O_NONBLOCK`, never blocking —, a directory) or is larger
 * than `WORK_FILE_MAX_BYTES` is `{[], ["work.jsonl"]}`: nothing is read through it, and its presence is listed.
 */
export function readWork(file) {
  let text;
  let fd = null;
  try {
    fd = openSync(file, FS.O_RDONLY | (FS.O_NOFOLLOW ?? 0) | (FS.O_NONBLOCK ?? 0));
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > WORK_FILE_MAX_BYTES) return { records: [], dropped: [WORK_FILE] };
    text = readFileSync(fd, "utf8");
  } catch (e) {
    return { records: [], dropped: e && e.code === "ENOENT" ? [] : [WORK_FILE] };
  } finally {
    if (fd !== null) closeSync(fd);
  }
  const records = [];
  const dropped = [];
  let n = 0;
  for (const line of text.split("\n")) {
    if (!line) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      rec = undefined;
    }
    if (rec !== undefined && validateWork(rec).ok) records.push(rec);
    else dropped.push(`${WORK_FILE}[${n}]`);
    n++;
  }
  return { records, dropped };
}

/** The stage scripts' one call: derive nothing here, append the record they built, and say so on stderr when it could
 *  not be written — the stage's exit never depends on it. */
export function recordWork(feature, record, note = (m) => process.stderr.write(`${m}\n`)) {
  if (record === null) {
    note("note — no deterministic-work record was written for the cost ledger (the stage's evidence could not be counted)");
    return { ok: false, why: "no record" };
  }
  const r = appendWork({ feature, record });
  if (!r.ok) note(`note — the deterministic-work record for the cost ledger was not written (${r.why})`);
  return r;
}
