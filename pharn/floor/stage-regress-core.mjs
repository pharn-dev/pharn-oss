// pharn/floor/stage-regress-core.mjs — the PURE rules for the /pharn-regress stage script. No
// `child_process`, no filesystem, no network, no clock. The execution half lives in
// pharn/floor/stage-regress.mjs (P3, one axis per file: this module changes when a RULE changes, not
// when an execution detail does).
//
// ================================ LOAD-GRAPH CONSTRAINT (GRILL G8) ================================
// This module imports NOTHING but `gate-run-core.mjs` — already in `loop-fresh-core.mjs`'s import graph —
// so importing `REGRESS_PATHS` from here (below) adds exactly one small, already-present module to the
// freshness checker's load graph. Since 6.21.1 a module that cannot load there is `checker-crashed`; every
// added import is one more way to reach it. `stage-regress-core.test.mjs` pins this module's import list.
//
// ==================================== THE FOUR CLOSED RULES ====================================
// Moved here from command prose (GRILL architecture finding): TEST_FILE_RULE, STYLE_CONFIG_RULE,
// INSTALL_RULE and BASE_RULE. Each is a pure membership/decision function over inputs the CLI reads live
// (git, the filesystem) — never a judgment call, and every terminal fallback is a closed `question`
// reason_code the CLI's stage-exit object carries, never a guess (P5).
//
// TEST_FILE_RULE — the union of vitest's and Jest's default test-file include conventions, plus
// `node --test`'s `*.test.{js,mjs,cjs}` files (GRILL G15): OTHER ecosystems (pytest, go) need `--tests`.
//
// STYLE_CONFIG_RULE — the config-touch skip (`/pharn-regress`'s existing prose rule, now tested code):
// eligible ONLY for a DISCOVERED source (an explicit `--gates` string is run as written); skips the style
// gates iff no `inside` path's basename is an eslint/prettier/markdownlint config. Bound: a config outside
// the closed name set (`package.json#eslintConfig`, `biome.json`, …) does not trigger the style gates at
// regress — `/pharn-verify`'s absolute gate still runs them at HEAD.
//
// INSTALL_RULE — read at the BASE commit (GATE 1 Q3: npm, pnpm, yarn and bun families, ALL included). The
// pnpm/yarn/bun LINES ARE UNMEASURED: nobody has run that command against that tool from this stage. The
// label is carried on the resolved decision (`unmeasured: true`) so a caller can render it honestly.
//
// BASE_RULE — a pure decision over git results the CLI passes in: explicit `--base` wins; else a dirty
// working tree resolves to `HEAD`; else `git merge-base HEAD origin/main`; else `ask`. The CLI turns the
// chosen SOURCE into the actual 40-hex SHA (a `git rev-parse` the CLI performs, never this module).
//
// ==================================== THE PROGRESS RECORD ====================================
// `.pharn/pharn-regress/stage.json` (REGRESS_PATHS.stageJson) is the in-progress record `--resume` reads.
// It carries EXACTLY what a resumed invocation needs and nothing re-derivable more cheaply elsewhere:
// the resolved `base` (a git rev-parse the CLI must not repeat, since the working tree/remote state that
// produced it may have moved by the time `--resume` runs — re-deriving it could silently pick a DIFFERENT
// commit), the resolved INSTALL decision (so a resumed run does not need to re-read the base commit's tree
// a second time), and the NEXT phase to execute. Everything else a resumed run needs — the discovered gate
// set, the test-file universe, the scope partition — is ALREADY durable on disk by the time a progress
// record can exist (run-gates.mjs's own stamps, `.pharn/pharn-regress/scope.json`), so it is read from
// there rather than duplicated here (one owner of each fact, L35).
//
// Since `/2` (6.33.0) it also carries `baseReuse`, the BASE-reuse decision made once the HEAD side is done, because a
// resumed invocation must know whether to run the base phases at all and what to report. It is never TRUSTED as a
// HIT: `stage-regress.mjs` re-decides a persisted HIT in full at the verdict (the record is ordinary `.pharn/` state
// the write tools reach, `regress-base-reuse.mjs`, header). A persisted MISS keeps the delivery run it saw, which a
// later publication must see again.
//
// Since `/3` (6.49.0, entry-run-as-base-evidence) it also carries `installOverride` (the invocation passed --install or
// --no-install) and `entryReuse`, the entry-derived BASE decision made when the retained one misses. A persisted entry
// HIT is never trusted either: stage-regress.mjs re-decides it in full at the verdict, from the git-dir offer and the
// entry source, before anything is materialized.
//
// TRUST (P2): every field here is a string/int/bool the CLI derived from deterministic tooling (git, a
// shelled checker's exit code) or from argv already shape-gated at the CLI layer. Nothing here is
// untrusted free text; a value that FAILS to validate is refused (`progress-malformed`), never repaired.

import { FEATURE_SLUG_RE, SHA_RE } from "./gate-run-core.mjs";

/** ------------------------------------------------------------------------------------------------
 *  Small helpers (this floor's repeated per-module pattern — see gate-run-core.mjs's own copy).
 *  ---------------------------------------------------------------------------------------------- */
function isCleanToken(v, max = 4096) {
  if (typeof v !== "string" || v.length === 0 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

/** ------------------------------------------------------------------------------------------------
 *  REGRESS_PATHS — the ONE owner of the stage's scratch layout, so `loop-fresh-core.mjs`'s
 *  `DEFAULT_STAMPS.regressHead`/`regressBase` are DERIVED from it rather than a second literal (L35).
 *  ---------------------------------------------------------------------------------------------- */
export const REGRESS_PATHS = Object.freeze({
  root: ".pharn/pharn-regress",
  head: ".pharn/pharn-regress/head",
  baseGates: ".pharn/pharn-regress/base-gates",
  base: ".pharn/pharn-regress/base",
  scopeJson: ".pharn/pharn-regress/scope.json",
  stageJson: ".pharn/pharn-regress/stage.json",
  // 6.40.0 — the HEAD install check's result (install-drift.mjs), written at head-init and re-read at render, so a
  // resumed chain reports it without a progress-record field (the scope.json precedent).
  headInstall: ".pharn/pharn-regress/head-install.json",
});

/** ------------------------------------------------------------------------------------------------
 *  THE PHASE ENUM, in EXECUTION ORDER. A progress record may only ever be PERSISTED at one of
 *  RESUMABLE_PHASES — everything before "drain-head" is fast work that completes within one invocation or
 *  ends in a `question`/`refused`/`unusable` exit before any progress record is written (GRILL G1: the
 *  stale-report removal happens in "fresh", before any step that can fail).
 *  ---------------------------------------------------------------------------------------------- */
export const PHASES = Object.freeze([
  "fresh",
  "chain",
  "base",
  "partition",
  "head-init",
  "drain-head",
  "worktree",
  "install",
  "base-init",
  "drain-base",
  "verdict",
  "cleanup",
  "render",
]);

// M9 (GATE 2 review): "cleanup" and "render" are execution-machine phases, but the script never PERSISTS
// either one — both complete inline, in the same invocation as "verdict", and the record is left parked
// at "verdict" (never advanced past it) until the whole tail finishes and the record is removed (see
// stage-regress.mjs's persistProgress call sites). A record naming either is therefore never a LEGITIMATE
// one; admitting them here meant a hand-edited or otherwise-malformed record naming "render" crashed with
// a raw TypeError instead of the clean, fail-closed `progress-malformed` every other malformed record
// gets. Narrowed to the phases the script actually checkpoints.
export const RESUMABLE_PHASES = Object.freeze(
  PHASES.filter((p) => PHASES.indexOf(p) >= PHASES.indexOf("drain-head") && p !== "cleanup" && p !== "render")
);

/** ------------------------------------------------------------------------------------------------
 *  BASE-EVIDENCE REUSE (6.33.0, regress-base-reuse) — the stage's two closed vocabularies for it, owned HERE with
 *  the phase enum because the progress record below carries a reuse decision and its validator checks membership;
 *  this module's G8 pin keeps its imports at `gate-run-core.mjs`, so the rules that USE them live in
 *  `regress-base-reuse-core.mjs`, which imports these.
 *
 *  DELIVERY_COMMANDS — the delivery runs that invoke /pharn-regress, whose run markers (`.pharn/<command>/<feature>/
 *  active.json`, written by require-loop-record.cjs and run-marker.mjs) bound a reuse to ONE run.
 *  BASE_REUSE_MISSES — why a base run was NOT reused, in the predicate's evaluation order (first failure decides).
 *  The one owner of each member's meaning (the contract cites this list rather than restating it, P4):
 *    requirement-unknown  the head record gives no spec, so no requirement can be built;
 *    no-delivery-run      not exactly one open /pharn-loop or /pharn-ship marker for the feature (presence + 24 h age,
 *                         never parsed — so a marker an interrupted run left makes a standalone invocation part of it);
 *    no-record            no reuse record in the git dir;
 *    record-malformed     the record is not a regular file of the closed pharn-regress-base-reuse/1 shape;
 *    other-run            the record names another feature, command or marker digest;
 *    evidence-missing     no retained base stamp;
 *    evidence-unbound     the stamp is not the bytes the record bound;
 *    evidence-invalid     the stamp fails validateStamp, or a log / results file it hashed changed;
 *    version-changed      another stamp schema or fingerprint algorithm;
 *    base-changed         another base SHA;
 *    gates-changed        another gate spec (set, command, files, style skip, source);
 *    execution-changed    another install decision, timeout, or root-level HEAD file;
 *    evidence-unreliable  no install, a failed or timed-out install, or a timed-out base gate.
 *  ---------------------------------------------------------------------------------------------- */
export const DELIVERY_COMMANDS = Object.freeze(["pharn-loop", "pharn-ship"]);

export const BASE_REUSE_MISSES = Object.freeze([
  "requirement-unknown",
  "no-delivery-run",
  "no-record",
  "record-malformed",
  "other-run",
  "evidence-missing",
  "evidence-unbound",
  "evidence-invalid",
  "version-changed",
  "base-changed",
  "gates-changed",
  "execution-changed",
  "evidence-unreliable",
]);

/** ------------------------------------------------------------------------------------------------
 *  ENTRY-DERIVED BASE EVIDENCE (6.49.0, entry-run-as-base-evidence) — why this delivery run's ENTRY execution was NOT
 *  used as the BASE evidence, in the predicate's evaluation order (first failure decides; entry-base-evidence-core.mjs
 *  `decideEntryBase`). Owned HERE for the reason BASE_REUSE_MISSES is: the progress record carries the decision and
 *  this module's validator checks membership (G8: this module imports gate-run-core.mjs alone). A miss is DATA — the
 *  BASE side then runs exactly as before. The one owner of each member's meaning (the contract cites this list):
 *    requirement-unknown   the head record gives no spec, so nothing can be mapped;
 *    no-delivery-run       not exactly one open /pharn-loop or /pharn-ship marker for the feature (6.33.0's rule);
 *    install-override      the invocation passed --install or --no-install: a BASE environment entry did not sample;
 *    no-offer              no entry offer in the git dir (no validated --wait published one in this run);
 *    offer-malformed       the offer is not a regular file of the closed pharn-entry-base-offer/1 shape;
 *    other-run             the offer names another feature or another run marker;
 *    no-snapshot           no pre-run snapshot in the git dir;
 *    snapshot-malformed    the snapshot is not a regular file of its closed shape;
 *    snapshot-other-run    the snapshot is bound to another feature or run;
 *    start-not-base        the snapshot's or the offer's base commit is not this invocation's BASE SHA;
 *    start-dirty           the snapshot lists a path outside this run's own pharn/features/<name>/;
 *    source-missing        no entry stamp at its path;
 *    source-unusable       the entry stamp is a link, a non-regular file, oversize, unreadable or not JSON;
 *    source-unbound        the entry stamp is not the bytes the offer bound;
 *    source-invalid        the entry stamp fails validateStamp as this feature's entry stamp, its fingerprint algo is not
 *                          ENTRY_ALGO, or its head is not the offer's base;
 *    timeout-incompatible  the entry timeout exceeds this invocation's --timeout-ms;
 *    structural-gate       a required BASE entry is a regress-only structural: gate;
 *    gate-missing          a required BASE entry has no entry run under its mapped id;
 *    shape-mismatch        the spec source, or a mapped pair's shell, argv or ordered files, differ;
 *    not-completed         a mapped entry run did not run, timed out, or is not a completed process exit;
 *    style-unattributed    a mapped style run's feature-directory digests are not all `absent`;
 *    mutated-prefix        an entry run up to the last mapped one moved the tree, or a mapped run did not judge the
 *                          stamp's init fingerprint;
 *    nothing-mapped        every BASE slot is a regress no-files slot, so no entry evidence would be used (L34);
 *    log-unverified        a mapped run's log is missing, a link, oversize, or not the stamp's digest (at the copy).
 *  ---------------------------------------------------------------------------------------------- */
export const ENTRY_BASE_MISSES = Object.freeze([
  "requirement-unknown",
  "no-delivery-run",
  "install-override",
  "no-offer",
  "offer-malformed",
  "other-run",
  "no-snapshot",
  "snapshot-malformed",
  "snapshot-other-run",
  "start-not-base",
  "start-dirty",
  "source-missing",
  "source-unusable",
  "source-unbound",
  "source-invalid",
  "timeout-incompatible",
  "structural-gate",
  "gate-missing",
  "shape-mismatch",
  "not-completed",
  "style-unattributed",
  "mutated-prefix",
  "nothing-mapped",
  "log-unverified",
]);

/** ------------------------------------------------------------------------------------------------
 *  TEST_FILE_RULE (GRILL G15).
 *  ---------------------------------------------------------------------------------------------- */
const TEST_FILE_BASENAME_RE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const JS_TS_EXT_RE = /\.[cm]?[jt]sx?$/;

export function isTestFile(path) {
  if (typeof path !== "string" || path.length === 0) return false;
  const segments = path.split("/");
  const base = segments[segments.length - 1];
  if (TEST_FILE_BASENAME_RE.test(base)) return true;
  return segments.slice(0, -1).includes("__tests__") && JS_TS_EXT_RE.test(base);
}

/** ------------------------------------------------------------------------------------------------
 *  STYLE_CONFIG_RULE — the config-touch skip.
 *  ---------------------------------------------------------------------------------------------- */
const STYLE_CONFIG_BASENAME_RE =
  /^(eslint\.config\..+|\.eslintrc.*|\.eslintignore|\.prettierrc.*|prettier\.config\..+|\.prettierignore|\.markdownlint.*)$/;

/** Does any `inside` path touch a shared eslint/prettier/markdownlint config, by BASENAME membership? */
export function styleConfigTouched(insidePaths) {
  if (!Array.isArray(insidePaths)) return false;
  return insidePaths.some((p) => typeof p === "string" && STYLE_CONFIG_BASENAME_RE.test(p.split("/").pop() ?? p));
}

/** Should `--skip-style` be passed to `run-gates.mjs init`? Eligible ONLY for a discovered source — an
 *  explicit `--gates` string is run exactly as written, never style-filtered. */
export function shouldSkipStyle({ source, insidePaths }) {
  if (source !== "discover") return false;
  return !styleConfigTouched(insidePaths);
}

/** ------------------------------------------------------------------------------------------------
 *  INSTALL_RULE (GATE 1 Q3 — all four families included; pnpm/yarn/bun are UNMEASURED).
 *  ---------------------------------------------------------------------------------------------- */
const UNMEASURED_FAMILY = Object.freeze({ npm: false, pnpm: true, yarn: true, bun: true });

/** LOCKFILE_FAMILIES — the file names that mean each family, the ONE owner (L35) of what `stage-regress.mjs`'s
 *  `lockfilesAtBase` reads at the BASE commit and what `install-drift.mjs` reads in the HEAD working tree (6.40.0).
 *  Two names in one family are the SAME family (npm's lock and shrinkwrap; bun's text and binary lockfile). */
export const LOCKFILE_FAMILIES = Object.freeze({
  npm: Object.freeze(["package-lock.json", "npm-shrinkwrap.json"]),
  pnpm: Object.freeze(["pnpm-lock.yaml"]),
  yarn: Object.freeze(["yarn.lock"]),
  bun: Object.freeze(["bun.lock", "bun.lockb"]),
});

/** `lockfiles` — `{npm, pnpm, yarn, bun}` booleans, read at the BASE commit (`git ls-tree`). `npm` is true
 *  whenever EITHER `package-lock.json` OR `npm-shrinkwrap.json` is present — both are the SAME family, so
 *  having both is not "two lockfile families". */
export function resolveInstall({ explicitInstall = null, noInstall = false, hasPackageJson, lockfiles }) {
  // `kind: "none"` ALWAYS carries `cmd: null, unmeasured: false` too — a stable, self-describing shape a
  // caller (the progress-record validator, the renderer) never needs to special-case by omission.
  if (noInstall) return { kind: "none", cmd: null, unmeasured: false };
  if (typeof explicitInstall === "string" && explicitInstall.length > 0) {
    if (!isCleanToken(explicitInstall, 4096)) throw new Error("internal: resolveInstall requires a clean explicitInstall token");
    return { kind: "cmd", cmd: explicitInstall, unmeasured: false };
  }
  if (!hasPackageJson) return { kind: "none", cmd: null, unmeasured: false, reason: "no-manifest" };
  const families = ["npm", "pnpm", "yarn", "bun"].filter((f) => lockfiles && lockfiles[f]);
  if (families.length !== 1) return { kind: "ask" };
  const family = families[0];
  const cmd = {
    npm: "npm ci",
    pnpm: "pnpm install --frozen-lockfile",
    yarn: "yarn install --frozen-lockfile",
    bun: "bun install --frozen-lockfile",
  }[family];
  return { kind: "cmd", cmd, unmeasured: UNMEASURED_FAMILY[family], family };
}

/** ------------------------------------------------------------------------------------------------
 *  BASE_RULE — a pure decision over git results the CLI already gathered. The CLI turns the chosen SOURCE
 *  into the resolved 40-hex SHA (a `git rev-parse`/`git merge-base` call), never this function.
 *  ---------------------------------------------------------------------------------------------- */
export function resolveBaseSource({ explicitBase = null, workingTreeDirty, hasMergeBase }) {
  if (typeof explicitBase === "string" && explicitBase.length > 0) return { kind: "explicit" };
  if (workingTreeDirty) return { kind: "head" };
  if (hasMergeBase) return { kind: "merge-base" };
  return { kind: "ask" };
}

/** ------------------------------------------------------------------------------------------------
 *  THE PROGRESS RECORD — schema + validator.
 *  ---------------------------------------------------------------------------------------------- */
// `/2` since 6.33.0: the record carries `baseReuse` (below). `/3` since 6.49.0: `installOverride` and `entryReuse`. An
// older record is refused as `progress-malformed` — a run straddling the upgrade stops and is re-run fresh, never
// resumed under rules it was not started with.
export const PROGRESS_SCHEMA = "pharn-stage-regress-progress/3";

const INSTALL_KIND_SET = new Set(["none", "cmd"]);
const HEX64_RE = /^[0-9a-f]{64}$/;
const REUSE_DECISION_KEYS = Object.freeze(["reused", "miss", "requirementSha256", "stampSha256", "run"]);
const ENTRY_DECISION_KEYS = Object.freeze(["reused", "miss", "offerSha256", "sourceStampSha256", "run"]);

function isHex64(v) {
  return typeof v === "string" && HEX64_RE.test(v);
}

/**
 * The reuse DECISION a progress record carries once the HEAD side is done (`regress-base-reuse-core.mjs`
 * `decideBaseReuse`'s result): closed keys; `run` is the delivery run seen when it was made, or null. A HIT names the
 * stamp it decided on and can only sit at `verdict` (a HIT never visits the base phases); a miss names its category,
 * no stamp, and a requirement digest unless the requirement itself was unknown.
 */
export function validateReuseDecision(d, phase) {
  if (d === null || typeof d !== "object" || Array.isArray(d)) return { ok: false, reason: "progress.baseReuse must be an object" };
  const keys = Object.keys(d);
  if (keys.length !== REUSE_DECISION_KEYS.length || !REUSE_DECISION_KEYS.every((k) => Object.hasOwn(d, k))) {
    return { ok: false, reason: `progress.baseReuse keys must be exactly ${REUSE_DECISION_KEYS.join(", ")}` };
  }
  if (typeof d.reused !== "boolean") return { ok: false, reason: "progress.baseReuse.reused must be a boolean" };
  if (d.run !== null) {
    const r = d.run;
    if (r === null || typeof r !== "object" || Array.isArray(r) || Object.keys(r).length !== 2) {
      return { ok: false, reason: "progress.baseReuse.run must be null or {command, markerSha256}" };
    }
    if (!DELIVERY_COMMANDS.includes(r.command) || !isHex64(r.markerSha256)) {
      return { ok: false, reason: "progress.baseReuse.run must name a delivery command and a sha256" };
    }
  }
  if (d.reused) {
    if (d.miss !== null || !isHex64(d.stampSha256) || !isHex64(d.requirementSha256) || d.run === null) {
      return { ok: false, reason: "a reused decision has no miss, and names its stamp, requirement and run" };
    }
    if (phase !== "verdict") return { ok: false, reason: "a reused decision can only sit at the verdict phase" };
    return { ok: true };
  }
  if (!BASE_REUSE_MISSES.includes(d.miss))
    return { ok: false, reason: `progress.baseReuse.miss must be one of ${BASE_REUSE_MISSES.join(" | ")}` };
  if (d.stampSha256 !== null) return { ok: false, reason: "a miss names no stamp" };
  if (d.miss === "requirement-unknown" ? d.requirementSha256 !== null : !isHex64(d.requirementSha256)) {
    return { ok: false, reason: "progress.baseReuse.requirementSha256 must be a sha256 (null only when the requirement was unknown)" };
  }
  return { ok: true };
}

function isRunOrNull(r) {
  if (r === null) return true;
  if (typeof r !== "object" || Array.isArray(r) || Object.keys(r).length !== 2) return false;
  return DELIVERY_COMMANDS.includes(r.command) && isHex64(r.markerSha256);
}

/**
 * The ENTRY-derived BASE decision a progress record carries (6.49.0, entry-base-evidence-core.mjs `decideEntryBase`'s
 * result): closed keys; `run` the delivery run seen, or null. A HIT names the offer and the entry stamp it decided on
 * and can only sit at `verdict`; a miss names its ENTRY_BASE_MISSES category and no digests.
 */
export function validateEntryDecision(d, phase) {
  if (d === null || typeof d !== "object" || Array.isArray(d)) return { ok: false, reason: "progress.entryReuse must be an object" };
  const keys = Object.keys(d);
  if (keys.length !== ENTRY_DECISION_KEYS.length || !ENTRY_DECISION_KEYS.every((k) => Object.hasOwn(d, k))) {
    return { ok: false, reason: `progress.entryReuse keys must be exactly ${ENTRY_DECISION_KEYS.join(", ")}` };
  }
  if (typeof d.reused !== "boolean") return { ok: false, reason: "progress.entryReuse.reused must be a boolean" };
  if (!isRunOrNull(d.run)) return { ok: false, reason: "progress.entryReuse.run must be null or {command, markerSha256}" };
  if (d.reused) {
    if (d.miss !== null || !isHex64(d.offerSha256) || !isHex64(d.sourceStampSha256) || d.run === null) {
      return { ok: false, reason: "a reused entry decision has no miss, and names its offer, source and run" };
    }
    if (phase !== "verdict") return { ok: false, reason: "a reused entry decision can only sit at the verdict phase" };
    return { ok: true };
  }
  if (!ENTRY_BASE_MISSES.includes(d.miss))
    return { ok: false, reason: `progress.entryReuse.miss must be one of ${ENTRY_BASE_MISSES.join(" | ")}` };
  if (d.offerSha256 !== null || d.sourceStampSha256 !== null) return { ok: false, reason: "an entry miss names no digests" };
  return { ok: true };
}

function isValidInstall(v) {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  if (!INSTALL_KIND_SET.has(v.kind)) return false;
  if (typeof v.unmeasured !== "boolean") return false;
  if (v.kind === "none") return v.cmd === null;
  return isCleanToken(v.cmd, 4096) && !v.cmd.startsWith("-");
}

/**
 * Validate a persisted progress record (`REGRESS_PATHS.stageJson`). Fail-closed: a record this rejects is
 * `unusable progress-malformed` to the CLI, never patched or partially trusted.
 */
export function validateProgress(rec) {
  if (rec === null || typeof rec !== "object" || Array.isArray(rec)) return { ok: false, reason: "progress record must be a JSON object" };
  if (rec.schema !== PROGRESS_SCHEMA) return { ok: false, reason: `progress.schema must be ${JSON.stringify(PROGRESS_SCHEMA)}` };
  if (!isCleanToken(rec.feature, 64) || !FEATURE_SLUG_RE.test(rec.feature))
    return { ok: false, reason: "progress.feature must be a plain slug" };
  if (!Number.isInteger(rec.timeoutMs) || rec.timeoutMs <= 0) return { ok: false, reason: "progress.timeoutMs must be a positive integer" };
  if (rec.budgetMs !== null && !(Number.isInteger(rec.budgetMs) && rec.budgetMs >= 0)) {
    return { ok: false, reason: "progress.budgetMs must be null or a non-negative integer" };
  }
  if (!isCleanToken(rec.base, 40) || !SHA_RE.test(rec.base)) return { ok: false, reason: "progress.base must be a 40-hex SHA" };
  if (!RESUMABLE_PHASES.includes(rec.phase)) return { ok: false, reason: `progress.phase must be one of ${RESUMABLE_PHASES.join(" | ")}` };
  if (!isValidInstall(rec.install)) return { ok: false, reason: "progress.install must be {kind: none|cmd, cmd, unmeasured}" };
  if (!Array.isArray(rec.e2eExcluded) || !rec.e2eExcluded.every((s) => typeof s === "string")) {
    return { ok: false, reason: "progress.e2eExcluded must be a string array" };
  }
  if (typeof rec.styleSkipped !== "boolean") return { ok: false, reason: "progress.styleSkipped must be a boolean" };
  if (
    rec.installResult !== null &&
    (typeof rec.installResult !== "object" ||
      Array.isArray(rec.installResult) ||
      typeof rec.installResult.ran !== "boolean" ||
      !Number.isInteger(rec.installResult.exit) ||
      typeof rec.installResult.timedOut !== "boolean" ||
      // `ms` (6.35.0): the install's measured interval for the cost ledger's work record — optional, so a record
      // persisted before it still resumes; when present, a non-negative safe integer or null.
      (Object.hasOwn(rec.installResult, "ms") &&
        rec.installResult.ms !== null &&
        !(Number.isSafeInteger(rec.installResult.ms) && rec.installResult.ms >= 0)))
  ) {
    return { ok: false, reason: "progress.installResult must be null or {ran, exit, timedOut, ms?}" };
  }
  if (
    rec.cleanupResult !== null &&
    (typeof rec.cleanupResult !== "object" || Array.isArray(rec.cleanupResult) || typeof rec.cleanupResult.ok !== "boolean")
  ) {
    return { ok: false, reason: "progress.cleanupResult must be null or {ok, error}" };
  }
  // `baseReuse` — null while the HEAD side drains (the decision is made after it), the decision from then on.
  if (!Object.hasOwn(rec, "baseReuse")) return { ok: false, reason: "progress.baseReuse is required (schema /2)" };
  // `installOverride` and `entryReuse` (/3): the entry decision is made only when the retained one misses.
  if (typeof rec.installOverride !== "boolean") return { ok: false, reason: "progress.installOverride must be a boolean (schema /3)" };
  if (!Object.hasOwn(rec, "entryReuse")) return { ok: false, reason: "progress.entryReuse is required (schema /3)" };
  if (rec.phase === "drain-head") {
    if (rec.baseReuse !== null)
      return { ok: false, reason: "progress.baseReuse must be null at drain-head — the decision follows the HEAD side" };
    if (rec.entryReuse !== null) return { ok: false, reason: "progress.entryReuse must be null at drain-head" };
  } else {
    const d = validateReuseDecision(rec.baseReuse, rec.phase);
    if (!d.ok) return d;
    if (rec.baseReuse.reused) {
      if (rec.entryReuse !== null) return { ok: false, reason: "progress.entryReuse must be null after a retained HIT (never evaluated)" };
    } else {
      const e = validateEntryDecision(rec.entryReuse, rec.phase);
      if (!e.ok) return e;
    }
  }
  return { ok: true };
}
