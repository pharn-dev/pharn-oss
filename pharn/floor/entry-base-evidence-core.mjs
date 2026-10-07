// pharn/floor/entry-base-evidence-core.mjs — the PURE rules deciding whether a /pharn-regress invocation may take its
// BASE evidence from THIS delivery run's ENTRY execution (entry-run-as-base-evidence, 6.49.0), and the shape of the
// entry-derived BASE stamp it then writes. No filesystem, no child process, no clock of its own: the execution half,
// `entry-base-evidence.mjs`, reads every input off disk and hands plain values in (P3 — this file changes when a RULE
// changes; that one when the storage does).
//
// ==================================== WHY (P7) ====================================
// The named follow-up `entry-run-as-base-evidence` (6.42.0, `.dev/features/loop-entry-preflight/PLAN.md`): a delivery
// run already runs its gates at ENTRY, in the real working tree, before the build; /pharn-regress then built a BASE
// worktree (nested in the project until regress-base-integrity, in the temp root since), installed into it and ran the
// BASE gates again. In the recorded 92-minute run that BASE side took two
// script calls (146.2 s + 192.1 s), and the nested worktree lacked the ignored `.env.local` the entry tree had. Built at
// the maintainer's direction (`.dev/features/entry-run-as-base-evidence/`).
//
// ============================ TWO EVIDENCE SOURCES, TWO RULES ============================
// 6.33.0's `decideBaseReuse` (regress-base-reuse-core.mjs, untouched) reuses an earlier NORMAL BASE execution, so it binds
// that execution's own inputs: the BASE worktree's install decision, the regress fingerprint ALGO, and the HEAD root
// files a parent-directory search from the (formerly nested) worktree reached. Entry evidence ran in the real starting
// tree: no BASE worktree and no install ran, so none of those bind — skipping the inferred install is the point. This rule binds
// what makes entry evidence the BASE: the same delivery run, a pre-run snapshot saying the run started at this BASE commit
// with nothing changed outside its own feature directory, the exact execution shape of every mapped slot, completion,
// style attribution, no tree movement through the last mapped run, and a compatible timeout. Shared, never copied (L35):
// `baseSpecFrom` (what base-init would build), `deliveryRunIdentity`, `validateStamp`, the snapshot's
// `parseRecord`/`boundToRun`.
//
// ============================ THE SLOT MAP ============================
// A required BASE entry maps to the entry run with the same id — EXCEPT `test` with non-empty `files`, which maps to the
// entry check's evidence-only ENTRY_BASE_TEST_ID slot (gate-run-core.mjs): regress's own default test list, computed at
// entry (entry-gates.mjs). `test` with `files: []` is a regress `no-files` slot (run-gates.mjs records it without a
// process at regress), so it takes no entry evidence. NO inference from a full-suite run to a subset exists: only byte
// equality of shell, argv and the ordered files maps a slot.
//
// ============================ THE PREDICATE — first failure decides ============================
// `decideEntryBase` returns a HIT or one ENTRY_BASE_MISSES member (stage-regress-core.mjs holds the list and each
// member's meaning), in that list's order. A MISS is DATA: the caller runs the BASE side exactly as before 6.49.0. Never a
// question, a refusal or a stop.
//
// THE MUTATION RULE (grill G2): no entry run up to and including the last mapped one (entry order) moved the tree, and
// every mapped run's fp_before/fp_after equal the stamp's `fingerprint.init`. So every mapped run judged the start tree,
// and — under the per-sample determinism every reuse in this floor assumes — none moves it in regress's order either, so
// the order difference (entry: style, the slot, the rest; regress: the head spec's order) cannot change a mapped result
// through the FINGERPRINTED tree. A mapped run that moved the tree is a MISS: `mutated` cannot tell a gate's own write
// from a concurrent one. Entry runs after the last mapped one (`e2e`) are ignored even if they moved it.
//
// HONEST SCOPE (P0):
//   • AGREEMENT, never PROVENANCE (L43): the offer, the snapshot, the marker, the entry stamp and its logs agree. All of
//     them live in the git dir or `.pharn/`, which a Bash writer reaches; a self-consistent forged set passes.
//   • NOT CLAIMED: that entry-derived BASE equals what a fresh BASE worktree would give. They may differ because
//     the environments differ (ignored files, `node_modules`, the inherited environment, the machine) — entry evidence is
//     the real sampled START environment, unattested. The definition of a regression is unchanged.
//   • NOT SEEN (grill G1): git-ignored state an earlier entry-only run left (a cache, `*.tsbuildinfo`, `.next/`) — the
//     fingerprint ignores it, and a fresh BASE never had it.
//   • INHERITED, and now pointing the other way (grill G3): entry's fingerprint excludes `pharn/features/<name>/`, and
//     that a NON-style gate does not read a front stage's concurrent write there is ADVISORY (6.42.0,
//     `entry-gates-nonstyle-overlap`). Before 6.49.0 such a read could only cause a false S14 stop; used as BASE
//     evidence, a false red can HIDE a HEAD regression as `pre_existing`. On /pharn-ship the approved SPEC.md is in that
//     directory at entry. A reused STYLE gate needs that directory `absent` before, during and after it.
//   • WINDOWS: between the pre-run snapshot's capture and entry `--start`'s init (two consecutive pinned lines), a write
//     is not seen.
//
// TRUST (P2): every operand is deterministic-tool JSON or raw bytes, compared as strings, integers and hex digests;
// nothing is evaluated, executed or rendered. Paths are attacker-nameable strings and are only compared. TOTAL (L62):
// every function returns for any parsed-JSON input, and no value is interpolated into a string.

import { createHash } from "node:crypto";
import {
  validateStamp,
  baseSpecFrom,
  logBasename,
  FEATURE_SLUG_RE,
  SHA_RE,
  SCHEMA as GATE_RUN_SCHEMA,
  STYLE_SET,
  STRUCTURAL_PREFIX,
  ENTRY_BASE_TEST_ID,
  ENTRY_REUSE_SOURCE,
  ENTRY_REUSE_TARGET,
  REUSED_REASON,
  MAX_REUSABLE_EXIT,
} from "./gate-run-core.mjs";
import { ENTRY_BASE_MISSES, DELIVERY_COMMANDS } from "./stage-regress-core.mjs";
import { deliveryRunIdentity } from "./regress-base-reuse-core.mjs";
import { parseRecord, boundToRun } from "./pre-run-snapshot-core.mjs";
import { ENTRY_ALGO, productFeatureDir } from "./worktree-fingerprint.mjs";

export const OFFER_SCHEMA = "pharn-entry-base-offer/1";
/** The offer's file name inside `git rev-parse --absolute-git-dir` (entry-base-evidence.mjs resolves the directory). */
export const OFFER_BASENAME = "pharn-entry-base-offer.json";
export const OFFER_MAX_BYTES = 64 * 1024;
const OFFER_KEYS = Object.freeze(["schema", "feature", "run", "nonce", "base", "stamp_sha256", "timeout_ms", "d0", "feature_dir"]);

/** A slot that takes no entry evidence: regress records it as `no-files` without a process. */
export const NO_FILES = "no-files";

const HEX64_RE = /^[0-9a-f]{64}$/;
const NONCE_RE = /^[0-9a-f]{32}$/;
const DIGEST_RE = /^(absent|unhashable|sha256:[0-9a-f]{64})$/;
const ABSENT = "absent";
/** sha256 of zero bytes — the digest run-gates.mjs records for a `no-files` slot's empty logs. */
export const EMPTY_SHA256 = createHash("sha256").update("").digest("hex");

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

function parseJson(bytes) {
  try {
    return { ok: true, value: JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString("utf8") : String(bytes)) };
  } catch {
    return { ok: false };
  }
}

/** ------------------------------------------------------------------------------------------------
 *  THE OFFER — what `entry-gates.mjs --wait` publishes once a completed entry run validated (green or red).
 *  ---------------------------------------------------------------------------------------------- */
/** The offer record. `run` is `deliveryRunIdentity`'s `{command, markerSha256}`; `featureDir` the result's per-gate
 *  `[{id, before, after}]`. */
export function buildOffer({ feature, run, nonce, base, stampSha256, timeoutMs, d0, featureDir }) {
  return {
    schema: OFFER_SCHEMA,
    feature,
    run: { command: run.command, marker_sha256: run.markerSha256 },
    nonce,
    base,
    stamp_sha256: stampSha256,
    timeout_ms: timeoutMs,
    d0,
    feature_dir: featureDir.map((x) => ({ id: x.id, before: x.before, after: x.after })),
  };
}

/** The offer's CLOSED shape, both directions. Fail-closed: anything else reads as `offer-malformed`. */
export function validateOffer(o) {
  if (!isPlainObject(o) || !hasExactKeys(o, OFFER_KEYS)) return false;
  if (o.schema !== OFFER_SCHEMA || typeof o.feature !== "string" || !FEATURE_SLUG_RE.test(o.feature)) return false;
  const r = o.run;
  if (!isPlainObject(r) || !hasExactKeys(r, ["command", "marker_sha256"])) return false;
  if (!DELIVERY_COMMANDS.includes(r.command) || typeof r.marker_sha256 !== "string" || !HEX64_RE.test(r.marker_sha256)) return false;
  if (typeof o.nonce !== "string" || !NONCE_RE.test(o.nonce)) return false;
  if (typeof o.base !== "string" || !SHA_RE.test(o.base)) return false;
  if (typeof o.stamp_sha256 !== "string" || !HEX64_RE.test(o.stamp_sha256)) return false;
  if (!Number.isInteger(o.timeout_ms) || o.timeout_ms < 100 || o.timeout_ms > 999999999) return false;
  if (typeof o.d0 !== "string" || !DIGEST_RE.test(o.d0)) return false;
  if (!Array.isArray(o.feature_dir)) return false;
  const seen = new Set();
  for (const x of o.feature_dir) {
    if (!isPlainObject(x) || !hasExactKeys(x, ["id", "before", "after"])) return false;
    if (typeof x.id !== "string" || x.id === "" || seen.has(x.id)) return false;
    seen.add(x.id);
    if (typeof x.before !== "string" || !DIGEST_RE.test(x.before) || typeof x.after !== "string" || !DIGEST_RE.test(x.after)) return false;
  }
  return true;
}

/** ------------------------------------------------------------------------------------------------
 *  THE SLOT MAP and the shape comparison.
 *  ---------------------------------------------------------------------------------------------- */
/** The entry run id a BASE spec entry takes its evidence from, or NO_FILES. */
export function mappedId(entry) {
  if (entry.id === "test") return Array.isArray(entry.files) && entry.files.length > 0 ? ENTRY_BASE_TEST_ID : NO_FILES;
  return entry.id;
}

/** The execution shape a spawn depends on, normalized exactly as run-gates.mjs reads it (`shell ?? null`, `argv ?? null`,
 *  `files ?? []`), as one canonical string. */
function shapeOf(x) {
  return JSON.stringify([x.shell ?? null, x.argv ?? null, x.files ?? []]);
}

function isCompleted(r) {
  return r.ran === true && r.timed_out === false && Number.isInteger(r.exit) && r.exit >= 0 && r.exit <= MAX_REUSABLE_EXIT;
}

function miss(category, run) {
  if (!ENTRY_BASE_MISSES.includes(category)) throw new Error(`internal: '${category}' is not an ENTRY_BASE_MISSES member`);
  return { decision: { reused: false, miss: category, offerSha256: null, sourceStampSha256: null, run }, detail: null };
}

/**
 * THE PREDICATE. Every input is read by the caller in THIS invocation:
 *   feature, base (40-hex), timeoutMs, installOverride (bool) — this invocation's;
 *   headRecord — the parsed, finalized HEAD stamp (or null): what base-init would copy its spec from;
 *   markers, now — the delivery-run identity (`deliveryRunIdentity`);
 *   offer, snapshot, entryStamp — `{state: "absent" | "unusable" | "ok", bytes}`.
 * Returns `{decision, detail}`. `decision` is the closed record the progress file carries (`validateEntryDecision`):
 * `{reused, miss, offerSha256, sourceStampSha256, run}`. `detail` is null on a miss; on a HIT it holds what
 * materialization needs — `{spec, offer, entryStamp, mapping, ignored}`, `mapping` one `{seq, id, kind, entry}` per BASE
 * slot in the head spec's order (`kind` "reused" with its entry run, or NO_FILES), `ignored` the entry run ids that did
 * not become evidence.
 */
export function decideEntryBase(i) {
  const spec = baseSpecFrom(i.headRecord, i.feature);
  if (!spec.ok) return miss("requirement-unknown", null);
  const id = deliveryRunIdentity({ markers: i.markers, now: i.now });
  if (!id.ok) return miss("no-delivery-run", null);
  const run = { command: id.command, markerSha256: id.markerSha256 };
  if (i.installOverride === true) return miss("install-override", run);

  if (!isPlainObject(i.offer) || i.offer.state === "absent") return miss("no-offer", run);
  if (i.offer.state !== "ok" || !Buffer.isBuffer(i.offer.bytes)) return miss("offer-malformed", run);
  const op = parseJson(i.offer.bytes);
  if (!op.ok || !validateOffer(op.value)) return miss("offer-malformed", run);
  const offer = op.value;
  if (offer.feature !== i.feature || offer.run.command !== run.command || offer.run.marker_sha256 !== run.markerSha256) {
    return miss("other-run", run);
  }

  const snap = parseRecord(i.snapshot);
  if (!snap.ok) return miss(snap.absent ? "no-snapshot" : "snapshot-malformed", run);
  if (!boundToRun(snap.value, i.feature, id)) return miss("snapshot-other-run", run);
  if (snap.value.base !== i.base || offer.base !== i.base) return miss("start-not-base", run);
  const own = productFeatureDir(i.feature);
  if (snap.value.paths.some(([p]) => !p.startsWith(own))) return miss("start-dirty", run);

  if (!isPlainObject(i.entryStamp) || i.entryStamp.state === "absent") return miss("source-missing", run);
  if (i.entryStamp.state !== "ok" || !Buffer.isBuffer(i.entryStamp.bytes)) return miss("source-unusable", run);
  const stampSha = sha256Hex(i.entryStamp.bytes);
  if (stampSha !== offer.stamp_sha256) return miss("source-unbound", run);
  const sp = parseJson(i.entryStamp.bytes);
  if (!sp.ok) return miss("source-unusable", run);
  const es = sp.value;
  if (!validateStamp(es, { stage: "entry", feature: i.feature }).ok) return miss("source-invalid", run);
  if (es.fingerprint.algo !== ENTRY_ALGO || es.head !== offer.base) return miss("source-invalid", run);

  if (!Number.isInteger(i.timeoutMs) || offer.timeout_ms > i.timeoutMs) return miss("timeout-incompatible", run);

  // The mapping, one row per BASE slot — each table row below is checked over EVERY slot before the next row, so the
  // first failure in ENTRY_BASE_MISSES order decides, whatever slot it sits in.
  const entries = spec.spec.entries;
  if (entries.some((e) => typeof e.id === "string" && e.id.startsWith(STRUCTURAL_PREFIX))) return miss("structural-gate", run);
  const byId = new Map(es.runs.map((r, idx) => [r.id, { r, idx }]));
  const mapped = [];
  for (const e of entries) {
    const want = mappedId(e);
    if (want === NO_FILES) continue;
    const hit = byId.get(want);
    if (hit === undefined) return miss("gate-missing", run);
    mapped.push({ e, ...hit });
  }
  if (spec.spec.source !== es.source || mapped.some((m) => shapeOf(m.e) !== shapeOf(m.r))) return miss("shape-mismatch", run);
  if (mapped.some((m) => !isCompleted(m.r))) return miss("not-completed", run);
  const fdById = new Map(offer.feature_dir.map((x) => [x.id, x]));
  for (const m of mapped) {
    if (!STYLE_SET.includes(m.e.id)) continue;
    const fd = fdById.get(m.r.id);
    if (offer.d0 !== ABSENT || fd === undefined || fd.before !== ABSENT || fd.after !== ABSENT) return miss("style-unattributed", run);
  }
  const init = es.fingerprint.init;
  if (mapped.length) {
    const last = Math.max(...mapped.map((m) => m.idx));
    if (es.runs.slice(0, last + 1).some((r) => r.mutated !== false)) return miss("mutated-prefix", run);
    if (mapped.some((m) => m.r.fp_before !== init || m.r.fp_after !== init)) return miss("mutated-prefix", run);
  }
  // L34: a spec whose every slot is `no-files` maps nothing — that is no entry evidence at all, never a vacuous HIT.
  if (mapped.length === 0) return miss("nothing-mapped", run);

  const usedIdx = new Set(mapped.map((m) => m.idx));
  const mapping = entries.map((e, seq) => {
    const want = mappedId(e);
    return want === NO_FILES
      ? { seq, id: e.id, kind: NO_FILES, entry: e }
      : { seq, id: e.id, kind: "reused", entry: e, source: byId.get(want).r };
  });
  return {
    decision: { reused: true, miss: null, offerSha256: sha256Hex(i.offer.bytes), sourceStampSha256: stampSha, run },
    detail: {
      spec: spec.spec,
      offer,
      entryStamp: es,
      mapping,
      ignored: es.runs.filter((_, idx) => !usedIdx.has(idx)).map((r) => r.id),
    },
  };
}

/** ------------------------------------------------------------------------------------------------
 *  THE DERIVED STAMP — new evidence with explicit provenance, never a relabelled entry stamp.
 *  ---------------------------------------------------------------------------------------------- */
/** The log copies a HIT needs: `{from, to, sha256}` per stream of each reused slot (the entry run's own log name to the
 *  regress slot's), and the `no-files` slots' empty logs (`from: null`). Names are gate-run-core.mjs `logBasename`. */
export function logPlan(detail) {
  const out = [];
  for (const m of detail.mapping) {
    const to = logBasename(m.seq, m.id);
    if (m.kind === NO_FILES) {
      out.push({ from: null, to: `${to}.out`, sha256: EMPTY_SHA256 }, { from: null, to: `${to}.err`, sha256: EMPTY_SHA256 });
      continue;
    }
    const from = logBasename(m.source.seq, m.source.id);
    out.push(
      { from: `${from}.out`, to: `${to}.out`, sha256: m.source.stdout_sha256 ?? null },
      { from: `${from}.err`, to: `${to}.err`, sha256: m.source.stderr_sha256 ?? null }
    );
  }
  return out;
}

/** The entry-derived `regress/base` stamp for a HIT's `detail`, `base` and the entry stamp's sha256. Every run is
 *  `ran: false`: this regress invocation spawned nothing. A reused run carries the entry run's exit and log digests and a
 *  `reused` block naming the entry stamp and its sequence; a `no-files` run is exactly what run-gates.mjs writes for
 *  one. Every fingerprint is the entry stamp's `init` (the mutation rule guarantees each mapped run judged it). */
export function derivedBaseStamp({ feature, base, detail, entryStampSha256 }) {
  const init = detail.entryStamp.fingerprint.init;
  const runs = detail.mapping.map((m) => {
    const common = {
      seq: m.seq,
      id: m.id,
      exit: m.kind === NO_FILES ? 0 : m.source.exit,
      ran: false,
      timed_out: false,
      mutated: false,
      reason: m.kind === NO_FILES ? "no-files" : REUSED_REASON,
      argv: m.entry.argv ?? null,
      shell: m.entry.shell ?? null,
      files: m.kind === NO_FILES ? [] : [...(m.entry.files ?? [])],
      fp_before: init,
      fp_after: init,
      stdout_sha256: m.kind === NO_FILES ? EMPTY_SHA256 : m.source.stdout_sha256,
      stderr_sha256: m.kind === NO_FILES ? EMPTY_SHA256 : m.source.stderr_sha256,
      results_sha256: null,
    };
    return m.kind === NO_FILES
      ? common
      : {
          ...common,
          reused: { stage: ENTRY_REUSE_SOURCE.stage, side: ENTRY_REUSE_SOURCE.side, seq: m.source.seq, stamp_sha256: entryStampSha256 },
        };
  });
  return {
    schema: GATE_RUN_SCHEMA,
    stage: ENTRY_REUSE_TARGET.stage,
    side: ENTRY_REUSE_TARGET.side,
    feature,
    head: base,
    source: detail.spec.source,
    source_raw: detail.spec.source_raw,
    style_skipped: detail.spec.style_skipped,
    finalized: true,
    fingerprint: { algo: detail.entryStamp.fingerprint.algo, init, final: init },
    required: [...detail.spec.required],
    runs,
    aux: { completeness: null },
  };
}

/** The report's `base_evidence.entry` block (6.49.0): booleans, enum members, hex digests and ids only. */
export function entryEvidenceBlock(decision, detail = null, base = null) {
  const used = decision.reused === true && detail !== null;
  return {
    used,
    miss: decision.miss,
    offer_sha256: decision.offerSha256,
    entry_stamp_sha256: decision.sourceStampSha256,
    base: used ? base : null,
    run: decision.run ? { command: decision.run.command, marker_sha256: decision.run.markerSha256 } : null,
    reused_ids: used ? detail.mapping.filter((m) => m.kind !== NO_FILES).map((m) => m.id) : [],
    no_files_ids: used ? detail.mapping.filter((m) => m.kind === NO_FILES).map((m) => m.id) : [],
    ignored_ids: used ? [...detail.ignored] : [],
  };
}
