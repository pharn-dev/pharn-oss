// pharn/floor/gate-reuse-core.mjs — the PURE rules deciding when /pharn-verify may record a gate result from a COMPLETED
// execution of this delivery run's /pharn-regress HEAD side instead of spawning the gate again (verify-head-gate-reuse,
// 6.34.0). No filesystem, no child process, no clock: `run-gates.mjs` (the per-entry decision, at execution time) reads
// every input and hands plain values in. One axis (P3): this file changes when "which two executions are equivalent"
// changes. WHICH source is offered is `head-reuse-offer.mjs`'s axis (its record and its acceptance rule), kept out of
// this file so the runner's load graph never carries the regress stage's modules (GATE-2 review).
//
// ==================================== WHY (P7) ====================================
// Built at the maintainer's direction (`.dev/features/verify-head-gate-reuse/`). /pharn-loop and /pharn-ship run
// /pharn-regress then /pharn-verify over the same tree (check-loop-fresh.mjs G already requires the regress HEAD stamp's
// `fingerprint.final` to equal the verify stamp's `init`), and both stages spawn a discovered `typecheck` / `build` gate
// with the same argv at the same directory — the second spawn re-runs an execution whose result is already on disk.
//
// ============================ THE EXECUTION IDENTITY — what a spawn depends on ============================
// `run-gates.mjs`'s `spawnGate` runs `/bin/sh -c '<shell> "$@"' sh <files…>` (a `--gates` token) or `<argv…> [-- <files…>]`
// (a discovered or structural gate), at `cwd`, stdin ignored, in a new process group, with the inherited environment
// plus ONE PHARN-added variable (RESULTS_ENV = this gate's own results path), killed after `--timeout-ms`. It judges the
// worktree whose fingerprint is `fp_before`, at the commit the stamp records as `head`. The identity binds each of those:
//   • `shell`, `argv`, the ORDERED `files` — what runs;
//   • `cwd` — the realpath the gate ran in (the caller resolves it);
//   • `stdin: "ignore"` and `env_added: [RESULTS_ENV]` — constants of the runner, in the digest so a runner change that
//     alters either must bump IDENTITY_SCHEMA rather than silently match an old identity;
//   • `timeout_ms` — the kill timer (a run that completed under one timer is not assumed to complete under another);
//   • `head` — `git rev-parse HEAD` as the stamp records it (null outside git): a gate may read git state (grill M1);
//   • `fingerprint: {algo, before}` — the tree content it judged.
// NOT in it, each on purpose: the gate id (a LABEL — `findReusable` also requires the source run's id to equal the
// entry's, as a lookup key, never as the equivalence), `seq`, the stage/side, `<out>`, and the VALUE of RESULTS_ENV (a
// per-stage path by construction; `findReusable` requires the source to have recorded no regular file there). NOT
// BOUND, named: the inherited environment and the machine (the BASE-reuse bound, regress-base-reuse-core.mjs), the git
// INDEX, and content the fingerprint does not see — a git-ignored `node_modules/` or build output, a file outside the
// repo a gate reads through a link, and the feature's own fingerprint-excluded artifacts (worktree-fingerprint.mjs
// EXCLUDED_ARTIFACTS), which is why every style gate is never reused (gate-run-core.mjs NON_REUSABLE_IDS).
//
// ============================ ELIGIBILITY — which recorded execution is a result ============================
// From gate-run-record.md: an entry is a COMPLETED process exit only when it ran (`ran: true`, `reason: null`), was not
// killed by the runner (`timed_out: false`), and exited with a process status, never a spawn failure (126/127) or a
// signal (>= 128) — so `exit` in 0..MAX_REUSABLE_EXIT. A completed RED is a result exactly as a green one is: VERIFY's
// absolute threshold reads the same integer either way. It must not have moved the tree (`mutated: false`), must have
// recorded no regular per-test results file (`results_sha256: null`, the field present), and must not be a
// NON_REUSABLE_IDS member (gate-run-core.mjs owns the set; validateStamp refuses a reused member too).
//
// ============================ THE SOURCE — only this run's offer ============================
// A regress/head stamp reaches the runner only as `--reuse-stamp` + `--reuse-sha256`, which `stage-verify.mjs` passes
// only when `head-reuse-offer.mjs`'s git-dir offer names THIS run and THOSE bytes (grill B2) — see that module.
//
// HONEST SCOPE (P0): a HIT proves AGREEMENT — the offer, the stamp bytes, the recorded identity and argv/shell/files,
// the logs and the live identity agree, i.e. the BOUND inputs are equal — never that the two executions are the same,
// and never PROVENANCE (L43): a Bash writer can forge the offer and the stamp together (L19). That the reused result equals what a fresh run would produce NOW is ADVISORY: it assumes the gate is
// deterministic for one identity and that nothing unbound changed; verify also loses its independent second sample of a
// flaky gate. Every miss runs the gate exactly as before 6.34.0.
//
// TRUST (P2): every operand is deterministic-tool JSON (stamps, the offer) or raw bytes, compared as strings, integers and
// hex digests; nothing is evaluated. TOTAL (L62): every function returns for any parsed-JSON input.

import { createHash } from "node:crypto";
import { validateStamp, RESULTS_ENV, REUSE_SOURCE, REUSED_REASON, NON_REUSABLE_IDS, MAX_REUSABLE_EXIT } from "./gate-run-core.mjs";

export { NON_REUSABLE_IDS, MAX_REUSABLE_EXIT };

export const IDENTITY_SCHEMA = "gate-execution-identity/1";

/** Why an offered source or one entry was not reused — a closed set, in evaluation order (first failure decides).
 *    no-delivery-run   not exactly one open /pharn-loop or /pharn-ship run marker for the feature (the BASE-reuse rule);
 *    no-offer          no offer record in the git dir (no regress published one in this run — e.g. under --quick);
 *    offer-malformed   the offer is not a regular file of the closed pharn-regress-head-offer/1 shape;
 *    other-run         the offer names another feature, command or marker digest;
 *    source-absent     no regress/head stamp at its path;
 *    source-unusable   a link, a non-regular file, oversize or unreadable;
 *    source-unbound    the stamp's bytes are not the bytes the offer bound;
 *    source-changed    at the entry, the stamp's bytes are no longer the bytes bound at init;
 *    source-invalid    the stamp fails validateStamp as this feature's regress/head stamp;
 *    not-reusable-id   the entry is a NON_REUSABLE_IDS member;
 *    no-candidate      the source ran no entry with this id;
 *    not-completed     the candidate did not run, is a reused or no-files entry, timed out, or is not a process exit;
 *    mutated           the candidate moved the tree;
 *    results-written   the candidate recorded a regular per-test results file (or predates the field);
 *    identity-missing  the candidate records no execution identity (a pre-6.34.0 stamp);
 *    identity-mismatch the candidate's shell/argv/files or identity differ from the entry's live identity;
 *    log-unverified    the candidate's logs are not the bytes it recorded, or exceed the copy cap (the runner's check).
 *  The first seven are head-reuse-offer.mjs's (is a source offered at all); the rest the runner's, per entry. */
export const REUSE_MISSES = Object.freeze([
  "no-delivery-run",
  "no-offer",
  "offer-malformed",
  "other-run",
  "source-absent",
  "source-unusable",
  "source-unbound",
  "source-changed",
  "source-invalid",
  "not-reusable-id",
  "no-candidate",
  "not-completed",
  "mutated",
  "results-written",
  "identity-missing",
  "identity-mismatch",
  "log-unverified",
]);

const HEX64_RE = /^[0-9a-f]{64}$/;
const SHA_RE = /^[0-9a-f]{40}$/;

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function miss(code) {
  if (!REUSE_MISSES.includes(code)) throw new Error(`internal: '${code}' is not a REUSE_MISSES member`);
  return { hit: false, miss: code };
}

/**
 * The execution identity: sha256 over the canonical JSON of the inputs above, in a fixed key order. Returns
 * `{ok: true, value}` or `{ok: false}` for a malformed input — which can never match anything (fail-closed).
 */
export function executionIdentity({ shell, argv, files, cwdAbs, timeoutMs, head, fingerprintAlgo, fpBefore }) {
  const shellOk = shell === null || typeof shell === "string";
  const argvOk = argv === null || isStringArray(argv);
  if (!shellOk || !argvOk || (shell === null) === (argv === null)) return { ok: false };
  if (!isStringArray(files) || typeof cwdAbs !== "string" || !cwdAbs.startsWith("/")) return { ok: false };
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) return { ok: false };
  if (!(head === null || (typeof head === "string" && SHA_RE.test(head)))) return { ok: false };
  if (typeof fingerprintAlgo !== "string" || fingerprintAlgo === "" || typeof fpBefore !== "string" || !HEX64_RE.test(fpBefore)) {
    return { ok: false };
  }
  const canonical = {
    schema: IDENTITY_SCHEMA,
    shell,
    argv,
    files,
    cwd: cwdAbs,
    stdin: "ignore",
    env_added: [RESULTS_ENV],
    timeout_ms: timeoutMs,
    head,
    fingerprint: { algo: fingerprintAlgo, before: fpBefore },
  };
  return { ok: true, value: sha256Hex(JSON.stringify(canonical)) };
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The per-entry decision over a source stamp ALREADY bound by bytes (the caller compared its sha256 with the one
 * recorded at init — `source-changed` is the caller's). `entry` is the verify entry about to run (`{id, shell, argv,
 * files}`), `liveIdentity` its identity at the live tree. Returns `{hit: true, run}` (the candidate run, whose logs the
 * caller must still verify while copying) or `{hit: false, miss}`.
 */
export function findReusable({ source, feature, entry, liveIdentity }) {
  if (!validateStamp(source, { stage: REUSE_SOURCE.stage, side: REUSE_SOURCE.side, feature }).ok) return miss("source-invalid");
  if (!isPlainObject(entry) || typeof entry.id !== "string") return miss("no-candidate");
  if (NON_REUSABLE_IDS.includes(entry.id)) return miss("not-reusable-id");
  const run = source.runs.find((r) => r.id === entry.id);
  if (run === undefined) return miss("no-candidate");
  if (
    run.ran !== true ||
    run.reason !== null ||
    run.timed_out !== false ||
    !Number.isInteger(run.exit) ||
    run.exit < 0 ||
    run.exit > MAX_REUSABLE_EXIT
  ) {
    return miss("not-completed");
  }
  if (run.mutated !== false || run.fp_before !== run.fp_after) return miss("mutated");
  if (!Object.hasOwn(run, "results_sha256") || run.results_sha256 !== null) return miss("results-written");
  if (typeof run.identity_sha256 !== "string" || !HEX64_RE.test(run.identity_sha256)) return miss("identity-missing");
  if (
    run.identity_sha256 !== liveIdentity ||
    !sameJson(run.shell ?? null, entry.shell ?? null) ||
    !sameJson(run.argv ?? null, entry.argv ?? null) ||
    !sameJson(run.files ?? [], entry.files ?? [])
  ) {
    return miss("identity-mismatch");
  }
  if (typeof run.stdout_sha256 !== "string" || typeof run.stderr_sha256 !== "string") return miss("log-unverified");
  return { hit: true, run };
}

/**
 * The run record a HIT writes into the verify stamp — the ONE shape gate-run-core.mjs `validateStamp` admits for a
 * reused entry. `ran: false` is the truthful value (VERIFY spawned nothing); the result, the log digests and the
 * identity are the source execution's; `fp_before === fp_after === liveFp` (nothing ran in this slot; a concurrent tree
 * change is caught at the next entry's boundary, as today); no per-test file exists at this stage's results path.
 */
export function reusedRunRecord({ entry, candidate, sourceSha256, liveFp, liveIdentity }) {
  return {
    seq: entry.seq,
    id: entry.id,
    exit: candidate.exit,
    ran: false,
    timed_out: false,
    mutated: false,
    reason: REUSED_REASON,
    argv: entry.argv,
    shell: entry.shell,
    files: entry.files ?? [],
    fp_before: liveFp,
    fp_after: liveFp,
    stdout_sha256: candidate.stdout_sha256,
    stderr_sha256: candidate.stderr_sha256,
    results_sha256: null,
    identity_sha256: liveIdentity,
    reused: { stage: REUSE_SOURCE.stage, side: REUSE_SOURCE.side, seq: candidate.seq, stamp_sha256: sourceSha256 },
  };
}
