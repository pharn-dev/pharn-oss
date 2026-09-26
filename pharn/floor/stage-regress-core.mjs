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

export const RESUMABLE_PHASES = Object.freeze(PHASES.filter((p) => PHASES.indexOf(p) >= PHASES.indexOf("drain-head")));

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
export const PROGRESS_SCHEMA = "pharn-stage-regress-progress/1";

const INSTALL_KIND_SET = new Set(["none", "cmd"]);

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
      typeof rec.installResult.timedOut !== "boolean")
  ) {
    return { ok: false, reason: "progress.installResult must be null or {ran, exit, timedOut}" };
  }
  if (
    rec.cleanupResult !== null &&
    (typeof rec.cleanupResult !== "object" || Array.isArray(rec.cleanupResult) || typeof rec.cleanupResult.ok !== "boolean")
  ) {
    return { ok: false, reason: "progress.cleanupResult must be null or {ok, error}" };
  }
  return { ok: true };
}
