// pharn/floor/regress-base-reuse-core.mjs — the PURE rules deciding whether a /pharn-regress invocation may reuse
// retained BASE-side evidence whose record agrees with the SAME delivery run (regress-base-reuse, 6.33.0). No
// filesystem, no child process, no clock of its own: the execution half, `regress-base-reuse.mjs`, reads every input
// off disk and hands plain values in (P3 — this file changes when a RULE changes; that one when the storage does).
//
// ==================================== WHY (P7) ====================================
// Every fresh `stage-regress.mjs` invocation cleared `.pharn/pharn-regress/`, then re-created the base worktree, re-ran
// the base-commit install and re-ran every base gate — even when an earlier invocation of the same `/pharn-loop` (every
// iteration, and every freshness re-run) or `/pharn-ship` (the Step 2b retry) had produced that exact evidence minutes
// before. Built at the maintainer's direction, at the narrowest scope (`.dev/features/regress-base-reuse/`).
//
// ============================ THE REQUIREMENT — what a fresh BASE run depends on ============================
// A fresh BASE execution is `git worktree add` at the base commit → the INSTALL_RULE install → `run-gates.mjs init
// --side base`, which copies the HEAD record's spec VERBATIM (gate-run-core.mjs `baseSpecFrom`, the one owner) → one
// `run --next` per entry under `--timeout-ms` → a stamp in the gate-run-record SCHEMA, fingerprinted with the
// worktree-fingerprint ALGO. Its gates also read whatever lies OUTSIDE the base worktree: the worktree is nested at
// `.pharn/pharn-regress/base` inside the HEAD tree, so a tool that searches parent directories (node's module
// resolution, npm's `.bin` PATH, tsc / prettier / eslint config lookup) reaches the HEAD tree's root. The requirement
// binds every input PHARN can enumerate:
//   • the feature, the base SHA, the stamp schema and the fingerprint algorithm;
//   • the copied spec — source, source_raw, style_skipped, required, and each entry's ordered id/shell/argv/files, which
//     is where the outside tests, the outside eval pairs, the style skip, explicit-vs-discovered gates and the e2e
//     exclusion already live;
//   • the install DECISION (kind + command; an explicit --install/--no-install included) and the timeout;
//   • `head_root` — the content sha256 of every ROOT-LEVEL path in the scope's `inside` (changed since base): the only
//     HEAD files a parent-directory search from the nested worktree can reach that differ from the base's own copies
//     (an unchanged root file is shadowed by the base worktree's identical copy, which the search meets first).
// NOT in it, each on purpose: the rest of the HEAD tree (a later build that leaves all of the above alone must still
// HIT), --budget-ms (it decides where an invocation pauses, never a gate's result), the install's `unmeasured`/
// `family`/`reason` labels, its logs and duration, and the base worktree's fingerprint (recorded by the stamp).
// NOT BOUND, and named: ignored HEAD root content (`node_modules/`, `.env`, caches) the same search reaches, the
// environment and the machine. A run with NO install is therefore never reused (`evidence-unreliable`): its
// dependency resolution may walk straight up into the HEAD tree's own `node_modules/`.
//
// The EVIDENCE's requirement is read from the evidence itself: a base stamp records head, feature, schema,
// fingerprint.algo, source, source_raw, style_skipped, required and every run's id/shell/argv/files. Only the install
// decision, the timeout and `head_root` are not in a stamp, so the reuse RECORD carries exactly those three about the
// requirement — no second copy of the spec (L35).
//
// ============================ THE PREDICATE — first failure decides ============================
// `decideBaseReuse` returns a HIT or one member of BASE_REUSE_MISSES (stage-regress-core.mjs, which owns the stage's
// closed vocabularies and says what each row means), in that list's order. A
// MISS is never a question and never a guess: the caller runs the BASE side exactly as it did before 6.33.0. The same
// predicate decides PUBLICATION: the caller publishes a record only when this function HITs with it.
//
// THE DELIVERY RUN (`deliveryRunIdentity`): the run marker is NEVER PARSED — run-marker.mjs's and
// require-loop-record.cjs's headers both say no reader reads a marker's fields. It counts when it is present and open
// by the write guard's own rule (a regular file whose mtime is within 24 h of now, in either direction:
// enforce-writes-scope.cjs RUN_AGE_CEILING_MS), and its identity is sha256 of its bytes: each `--open` rewrites it, so a
// new run has new bytes.
//
// HONEST SCOPE (P0): a HIT proves AGREEMENT — the run marker, the record, the stamp, its logs and the root files agree
// with each other and with the current requirement — never PROVENANCE (L43): a self-consistent forged set passes. That
// the reused evidence equals what a fresh base run would produce NOW is ADVISORY: it assumes the suite is deterministic
// for one requirement and that nothing it does not bind changed — the assumption the fresh path already makes of its
// one sample. Where each input lives, and which writer can reach it, is `regress-base-reuse.mjs`'s header.
//
// TRUST (P2): every operand is deterministic-tool JSON or raw bytes (markers, record, stamp, logs, root files). Values
// are compared as strings, integers and hex digests and hashed; nothing is evaluated, executed or rendered. TOTAL
// (L62): every function returns for any parsed-JSON input, and no value is interpolated into a string.

import { createHash } from "node:crypto";
import { validateStamp, baseSpecFrom, logBasename, resultsFileName, FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { BASE_REUSE_MISSES, DELIVERY_COMMANDS } from "./stage-regress-core.mjs";

export const REQUIREMENT_SCHEMA = "pharn-regress-base-requirement/1";
export const RECORD_SCHEMA = "pharn-regress-base-reuse/1";
/** The record's file name inside `git rev-parse --absolute-git-dir` (regress-base-reuse.mjs resolves the directory). */
export const RECORD_BASENAME = "pharn-regress-base-reuse.json";

/** The write guard's own "a run is open" age (enforce-writes-scope.cjs RUN_AGE_CEILING_MS; a ✧ test pins parity). */
export const MARKER_AGE_CEILING_MS = 24 * 60 * 60 * 1000;

/** Read caps in bytes, so a planted huge file is a miss, never a memory spike. */
export const MARKER_MAX_BYTES = 4096;
export const RECORD_MAX_BYTES = 1024 * 1024;
export const STAMP_MAX_BYTES = 64 * 1024 * 1024;

const HEX64_RE = /^[0-9a-f]{64}$/;
const RECORD_KEYS = Object.freeze(["schema", "feature", "run", "stamp_sha256", "install", "install_result", "timeout_ms", "head_root"]);

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function hasExactKeys(o, keys) {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => Object.hasOwn(o, x));
}

function isCleanToken(v, max) {
  if (typeof v !== "string" || v.length === 0 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

function parseJson(bytes) {
  try {
    return { ok: true, value: JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString("utf8") : String(bytes)) };
  } catch {
    return { ok: false };
  }
}

/** Is `p` a ROOT-LEVEL path of the HEAD tree? No `/` except a trailing one (git lists an untracked nested repository
 *  as `vendor/`). The execution half hashes exactly these `inside` paths into `head_root`. */
export function isRootLevel(p) {
  return typeof p === "string" && p.length > 0 && !p.replace(/\/+$/, "").includes("/");
}

/** The install DECISION, stripped to what decides an execution: `{kind, cmd}`. `unmeasured`, `family` and `reason`
 *  are labels of the INSTALL_RULE decision, never inputs to the install. */
export function installDecision(install) {
  const kind = isPlainObject(install) ? install.kind : null;
  return { kind, cmd: kind === "cmd" ? install.cmd : null };
}

function specPart(spec) {
  return {
    source: spec.source,
    source_raw: spec.source_raw ?? null,
    style_skipped: spec.style_skipped === true,
    required: spec.required,
    entries: spec.entries.map((e) => ({ id: e.id, shell: e.shell ?? null, argv: e.argv ?? null, files: e.files ?? [] })),
  };
}

/** The requirement object. Its key order is fixed by construction, so JSON.stringify is its canonical form. */
export function baseRequirement({ feature, base, gateRunSchema, fingerprintAlgo, spec, install, timeoutMs, headRoot }) {
  return {
    schema: REQUIREMENT_SCHEMA,
    feature,
    base,
    gate_run_schema: gateRunSchema,
    fingerprint_algo: fingerprintAlgo,
    spec: specPart(spec),
    install: installDecision(install),
    timeout_ms: timeoutMs,
    head_root: headRoot,
  };
}

export function requirementSha256(req) {
  return sha256Hex(JSON.stringify(req));
}

/** The requirement a VALIDATED base stamp was produced for: the stamp's own fields, plus the record's install
 *  decision, timeout and `head_root` — the three inputs a stamp does not carry. */
export function evidenceRequirement(stamp, record) {
  return baseRequirement({
    feature: stamp.feature,
    base: stamp.head,
    gateRunSchema: stamp.schema,
    fingerprintAlgo: stamp.fingerprint.algo,
    spec: {
      source: stamp.source,
      source_raw: stamp.source_raw,
      style_skipped: stamp.style_skipped,
      required: stamp.required,
      entries: stamp.runs,
    },
    install: record.install,
    timeoutMs: record.timeout_ms,
    headRoot: record.head_root,
  });
}

/**
 * The delivery run this invocation belongs to. `markers` maps each DELIVERY_COMMANDS member to what the execution half
 * found at `.pharn/<command>/<feature>/active.json`: `{state: "absent"}`, `{state: "unusable"}` (a link, a directory,
 * an oversize or unreadable file) or `{state: "ok", bytes, mtimeMs}`. Exactly ONE path may hold anything, and it must be
 * a regular file whose mtime is within the write guard's 24 h of `now`; else there is no identity. Fail-closed: a
 * second present entry, even an unreadable one (which the write guard counts as a run open), is ambiguity. The bytes
 * are hashed, never parsed.
 */
export function deliveryRunIdentity({ markers, now }) {
  const present = DELIVERY_COMMANDS.filter((c) => isPlainObject(markers) && isPlainObject(markers[c]) && markers[c].state !== "absent");
  if (present.length !== 1) return { ok: false };
  const command = present[0];
  const m = markers[command];
  if (m.state !== "ok" || !Buffer.isBuffer(m.bytes) || !Number.isFinite(m.mtimeMs)) return { ok: false };
  if (Math.abs(now - m.mtimeMs) > MARKER_AGE_CEILING_MS) return { ok: false };
  return { ok: true, command, markerSha256: sha256Hex(m.bytes) };
}

/** The record the execution half publishes. `run` is `{command, markerSha256}`; `headRoot` the `[path, sha256|null]`
 *  pairs the requirement binds. */
export function buildRecord({ feature, run, stampSha256, install, installResult, timeoutMs, headRoot }) {
  return {
    schema: RECORD_SCHEMA,
    feature,
    run: { command: run.command, marker_sha256: run.markerSha256 },
    stamp_sha256: stampSha256,
    install: installDecision(install),
    install_result: installResult === null ? null : { ran: installResult.ran, exit: installResult.exit, timedOut: installResult.timedOut },
    timeout_ms: timeoutMs,
    head_root: headRoot,
  };
}

function isHeadRoot(v) {
  if (!Array.isArray(v)) return false;
  let prev = null;
  for (const pair of v) {
    if (!Array.isArray(pair) || pair.length !== 2 || !isCleanToken(pair[0], 4096) || !isRootLevel(pair[0])) return false;
    if (!(pair[1] === null || (typeof pair[1] === "string" && HEX64_RE.test(pair[1])))) return false;
    if (prev !== null && !(prev < pair[0])) return false; // sorted, unique
    prev = pair[0];
  }
  return true;
}

/** The record's CLOSED shape, in both directions. Fail-closed: anything else reads as `record-malformed`. */
export function validateRecord(r) {
  if (!isPlainObject(r) || !hasExactKeys(r, RECORD_KEYS)) return { ok: false, reason: "the record's keys are not exactly the schema's" };
  if (r.schema !== RECORD_SCHEMA) return { ok: false, reason: "record.schema is not this version" };
  if (!isCleanToken(r.feature, 64) || !FEATURE_SLUG_RE.test(r.feature)) return { ok: false, reason: "record.feature is not a plain slug" };
  if (!isPlainObject(r.run) || !hasExactKeys(r.run, ["command", "marker_sha256"]))
    return { ok: false, reason: "record.run is not {command, marker_sha256}" };
  if (!DELIVERY_COMMANDS.includes(r.run.command)) return { ok: false, reason: "record.run.command is not a delivery command" };
  if (typeof r.run.marker_sha256 !== "string" || !HEX64_RE.test(r.run.marker_sha256))
    return { ok: false, reason: "record.run.marker_sha256 is not a sha256" };
  if (typeof r.stamp_sha256 !== "string" || !HEX64_RE.test(r.stamp_sha256))
    return { ok: false, reason: "record.stamp_sha256 is not a sha256" };
  const inst = r.install;
  if (!isPlainObject(inst) || !hasExactKeys(inst, ["kind", "cmd"])) return { ok: false, reason: "record.install is not {kind, cmd}" };
  if (inst.kind === "none") {
    if (inst.cmd !== null || r.install_result !== null) return { ok: false, reason: "a `none` install carries no command and no result" };
  } else if (inst.kind === "cmd") {
    if (!isCleanToken(inst.cmd, 4096) || inst.cmd.startsWith("-"))
      return { ok: false, reason: "record.install.cmd is not a clean command" };
    const ir = r.install_result;
    if (!isPlainObject(ir) || !hasExactKeys(ir, ["ran", "exit", "timedOut"]))
      return { ok: false, reason: "a `cmd` install carries {ran, exit, timedOut}" };
    if (typeof ir.ran !== "boolean" || !Number.isInteger(ir.exit) || typeof ir.timedOut !== "boolean") {
      return { ok: false, reason: "record.install_result is not {ran: bool, exit: int, timedOut: bool}" };
    }
  } else {
    return { ok: false, reason: "record.install.kind is not none | cmd" };
  }
  if (!Number.isInteger(r.timeout_ms) || r.timeout_ms <= 0) return { ok: false, reason: "record.timeout_ms is not a positive integer" };
  if (!isHeadRoot(r.head_root))
    return { ok: false, reason: "record.head_root is not sorted, unique [root-level path, sha256 | null] pairs" };
  return { ok: true };
}

/** Every file a validated stamp binds by digest, with the digest it recorded — check-loop-fresh.mjs check J's own rule
 *  (stdout/stderr always, compared to `?? null`; the per-test results file only when recorded as a string), so evidence
 *  that would trip J later is a miss here instead of a STOP there. */
export function evidenceFiles(stamp) {
  const out = [];
  for (const r of stamp.runs) {
    const b = logBasename(r.seq, r.id);
    out.push({ file: `${b}.out`, expected: r.stdout_sha256 ?? null });
    out.push({ file: `${b}.err`, expected: r.stderr_sha256 ?? null });
    if (typeof r.results_sha256 === "string") out.push({ file: resultsFileName(r.seq, r.id), expected: r.results_sha256 });
  }
  return out;
}

/** Evidence a fresh run could not be ASSUMED to reproduce: no install at all (dependency resolution may walk up into
 *  the HEAD tree), an install that ran and failed or timed out, or a base gate that timed out (a wall-clock artifact,
 *  not a result of the tree). */
function unreliable(stamp, record) {
  if (record.install.kind !== "cmd") return true;
  const ir = record.install_result;
  if (ir.ran !== true || ir.exit !== 0 || ir.timedOut === true) return true;
  return stamp.runs.some((r) => r.timed_out === true);
}

function canon(v) {
  return JSON.stringify(v);
}

function miss(category, requirementSha256, run) {
  if (!BASE_REUSE_MISSES.includes(category)) throw new Error(`internal: '${category}' is not a BASE_REUSE_MISSES member`);
  return { reused: false, miss: category, requirementSha256, stampSha256: null, run };
}

/**
 * THE PREDICATE. Every input is read by the caller in THIS invocation:
 *   feature, base (40-hex), install (the INSTALL_RULE decision), timeoutMs, gateRunSchema, fingerprintAlgo — this run's;
 *   headRecord — the parsed, finalized HEAD stamp (or null): what base-init would copy its spec from;
 *   headRoot — the current `[path, sha256|null]` pairs for the root-level `inside` paths (sorted);
 *   markers, now — the delivery-run identity (`deliveryRunIdentity`);
 *   record, stamp — `{state: "absent" | "unusable" | "ok", bytes}` for the reuse record and the retained base stamp;
 *   hashEvidence(file) — the sha256 of `<base-gates>/<file>`, read without following a link, or null.
 * Returns `{reused, miss, requirementSha256, stampSha256, run}`: `run` is the delivery run it saw
 * (`{command, markerSha256}`, or null), which a later publication must see again; a HIT names the stamp bytes it
 * decided on; a miss names none.
 */
export function decideBaseReuse(i) {
  const spec = baseSpecFrom(i.headRecord, i.feature);
  if (!spec.ok) return miss("requirement-unknown", null, null);
  const current = baseRequirement({
    feature: i.feature,
    base: i.base,
    gateRunSchema: i.gateRunSchema,
    fingerprintAlgo: i.fingerprintAlgo,
    spec: spec.spec,
    install: i.install,
    timeoutMs: i.timeoutMs,
    headRoot: i.headRoot,
  });
  const reqSha = requirementSha256(current);

  const id = deliveryRunIdentity({ markers: i.markers, now: i.now });
  if (!id.ok) return miss("no-delivery-run", reqSha, null);
  const run = { command: id.command, markerSha256: id.markerSha256 };

  if (!isPlainObject(i.record) || i.record.state === "absent") return miss("no-record", reqSha, run);
  if (i.record.state !== "ok") return miss("record-malformed", reqSha, run);
  const rp = parseJson(i.record.bytes);
  if (!rp.ok || !validateRecord(rp.value).ok) return miss("record-malformed", reqSha, run);
  const rec = rp.value;
  if (rec.feature !== i.feature || rec.run.command !== run.command || rec.run.marker_sha256 !== run.markerSha256) {
    return miss("other-run", reqSha, run);
  }

  if (!isPlainObject(i.stamp) || i.stamp.state === "absent") return miss("evidence-missing", reqSha, run);
  if (i.stamp.state !== "ok") return miss("evidence-invalid", reqSha, run);
  const stampSha = sha256Hex(i.stamp.bytes);
  if (stampSha !== rec.stamp_sha256) return miss("evidence-unbound", reqSha, run);
  const sp = parseJson(i.stamp.bytes);
  if (!sp.ok) return miss("evidence-invalid", reqSha, run);
  const stamp = sp.value;
  if (!validateStamp(stamp, { stage: "regress", side: "base", feature: i.feature }).ok) return miss("evidence-invalid", reqSha, run);
  for (const f of evidenceFiles(stamp)) {
    if (i.hashEvidence(f.file) !== f.expected) return miss("evidence-invalid", reqSha, run);
  }

  // Every key of the requirement object is compared by exactly one row below (schema is a constant on both sides, and
  // feature is held by validateStamp's `expect.feature`); a unit test pins the key list against these rows.
  const ev = evidenceRequirement(stamp, rec);
  if (ev.gate_run_schema !== current.gate_run_schema || ev.fingerprint_algo !== current.fingerprint_algo)
    return miss("version-changed", reqSha, run);
  if (ev.base !== current.base) return miss("base-changed", reqSha, run);
  if (canon(ev.spec) !== canon(current.spec)) return miss("gates-changed", reqSha, run);
  if (
    canon(ev.install) !== canon(current.install) ||
    ev.timeout_ms !== current.timeout_ms ||
    canon(ev.head_root) !== canon(current.head_root)
  ) {
    return miss("execution-changed", reqSha, run);
  }
  if (unreliable(stamp, rec)) return miss("evidence-unreliable", reqSha, run);
  return { reused: true, miss: null, requirementSha256: reqSha, stampSha256: stampSha, run };
}
