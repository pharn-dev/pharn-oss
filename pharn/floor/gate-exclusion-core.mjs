#!/usr/bin/env node
// pharn/floor/gate-exclusion-core.mjs — a project's declaration of DISCOVERED gates it excludes (6.36.0,
// gate-exclusion-config). P3: this file changes when "how a project declares an exclusion" changes, and for no other
// reason; APPLYING it is gate-run-core.mjs's resolveSet (one membership rule, `exclusionError`, imported — L35).
//
// THE RECORDED FAILURE (P7): in a user's project (PHARN 6.35.0) the discovered `e2e` gate could not run on the
// user's machine (not enough RAM). Discovery is the closed ALLOWLIST ∩ package.json scripts, with no way to leave a
// member out, and the only alternative — an explicit `--gates` list — makes /pharn-verify's AC gate read
// `test-infra-changed` by design. Two of three real /pharn-loop runs stopped on exactly that.
//
// THE DECLARATION, in the project root's `pharn.config.json` (per-test-results-core.mjs CONFIG_FILE, imported):
//
//   { "gates": { "exclude": ["e2e"] } }
//
// CLOSED in both directions (L36), fail-closed:
//   • no file, or no own `gates` key → nothing is excluded, and nothing anywhere changes (byte-for-byte);
//   • `gates` must be a plain object whose keys are among GATES_KEYS — `exclude`, and since 7.16.0 `timeoutMs`
//     (`{}` excludes nothing and declares no timeout);
//   • `exclude` must be an array of DISTINCT ALLOWLIST members (`[]` excludes nothing);
//   • `timeoutMs` (7.16.0, gate-timeout-above-bash-cap) must pass gate-timeout-core.mjs `timeoutDeclarationError`, which
//     owns its value rule; this file only carries it, as `timeoutMs` in the result (`null` when absent). Every reader of
//     the block therefore refuses a malformed value, as it refuses a malformed `exclude`; the gate callers that APPLY it
//     (entry-gates.mjs, stage-direct.mjs, and since 7.22.1 build-gate.mjs, stage-regress.mjs, stage-verify.mjs) do so
//     through gate-timeout-core.mjs `resolveRunTimeout`;
//   • an unknown key names the remedy (7.16.0): a key a newer PHARN added needs that PHARN (`npx @pharn-dev/pharn@latest
//     update`), otherwise it is removed. A floor ≤ 7.15.0 cannot be changed to say so: it refuses `timeoutMs` with "its
//     only key is `exclude`" (CHANGELOG [7.16.0]);
//   • anything else REFUSES, loudly — including a file that exists but cannot be read or parsed, which is never read
//     as "absent" (a project that declared nothing and whose pharn.config.json is not valid JSON now has discovery
//     refused, where before 6.36.0 discovery never read the file: a stated behaviour change).
// The result is in ALLOWLIST order, whatever order the file lists.
//
// WHERE IT IS READ: by run-gates.mjs `init` from the directory of its `--discover` manifest (every pinned caller passes
// `--discover package.json` from the project root), and from the project root by the red run's preflight and stamp
// binding (red-run-core.mjs) and by the test-infrastructure pin (ac-test-infra-core.mjs), which PINS the declared list so
// a later change reads `test-infra-changed` at /pharn-verify (pharn-contracts/ac-tests.md).
//
// WHAT IT DOES NOT DO (P0): it does not make excluding a gate safe — an excluded gate does not run, and its absence is
// DISCLOSED (the stamp's `excluded` block, both reports, VERIFY.md, REGRESSION.md, and since 6.65.0 /pharn-loop's
// RUN-REPORT.md, closeout document and commit message, read through gate-run-core.mjs excludedFacts), never evidence
// either way. It does not filter an explicit `--gates` string. The file is agent-editable project input: the pin narrows a later change
// and never proves who wrote the declaration (L43).
//
// TRUST (P2): the file is untrusted DATA — parsed as JSON, keys tested by own-property (L15), values used only as
// ALLOWLIST members after a membership test. A refusal names a position or a key quoted through quote-core.mjs's total
// `shown()` (L62); no value is interpreted or executed.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALLOWLIST, exclusionError } from "./gate-run-core.mjs";
import { CONFIG_FILE } from "./per-test-results-core.mjs";
import { shown } from "./quote-core.mjs";
import { TIMEOUT_KEY, timeoutDeclarationError } from "./gate-timeout-core.mjs";

/** The top-level key of the declaration, and its closed key set. */
export const GATES_KEY = "gates";
export const EXCLUDE_KEY = "exclude";
export const GATES_KEYS = Object.freeze([EXCLUDE_KEY, TIMEOUT_KEY]);

/** What an unknown `gates` key is told (7.16.0): the update that knows it, or its removal. */
export const UNKNOWN_KEY_REMEDY = "a key a newer PHARN added needs that PHARN (npx @pharn-dev/pharn@latest update); otherwise remove it";

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function refuse(reason) {
  return { ok: false, reason: `${CONFIG_FILE} ${reason}` };
}

/**
 * Validate a `pharn.config.json` TEXT (`null` when the file is absent) and return the excluded ids in ALLOWLIST order
 * and the declared per-gate timeout (`null` when none is declared).
 * @param {string|null} text
 * @returns {{ok: true, exclude: string[], timeoutMs: number|null} | {ok: false, reason: string}}
 */
export function readGateExclusion(text) {
  if (text === null) return { ok: true, exclude: [], timeoutMs: null };
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch (e) {
    return refuse(`is not valid JSON (${e.message}), so its \`${GATES_KEY}.${EXCLUDE_KEY}\` cannot be read`);
  }
  if (!isPlainObject(cfg)) return refuse("is not a JSON object");
  if (!Object.hasOwn(cfg, GATES_KEY)) return { ok: true, exclude: [], timeoutMs: null };
  const block = cfg[GATES_KEY];
  if (!isPlainObject(block)) {
    return refuse(`\`${GATES_KEY}\` must be an object — {"${EXCLUDE_KEY}": [<gate id>, …], "${TIMEOUT_KEY}": <milliseconds>}`);
  }
  for (const k of Object.keys(block)) {
    if (!GATES_KEYS.includes(k)) {
      return refuse(
        `\`${GATES_KEY}\` has the key ${shown(k)}; its keys are \`${EXCLUDE_KEY}\` and \`${TIMEOUT_KEY}\` — ${UNKNOWN_KEY_REMEDY}`
      );
    }
  }
  let exclude = [];
  if (Object.hasOwn(block, EXCLUDE_KEY)) {
    const ids = block[EXCLUDE_KEY];
    const bad = exclusionError(ids);
    if (bad !== null) return refuse(`\`${GATES_KEY}.${EXCLUDE_KEY}\` ${bad}`);
    exclude = ALLOWLIST.filter((id) => ids.includes(id));
  }
  let timeoutMs = null;
  if (Object.hasOwn(block, TIMEOUT_KEY)) {
    const bad = timeoutDeclarationError(block[TIMEOUT_KEY]);
    if (bad !== null) return refuse(`\`${GATES_KEY}.${TIMEOUT_KEY}\` ${bad}`);
    timeoutMs = block[TIMEOUT_KEY];
  }
  return { ok: true, exclude, timeoutMs };
}

/**
 * `<dir>/pharn.config.json` → the excluded ids, or a refusal. An absent file excludes nothing; a file that exists but
 * cannot be read (a directory, no permission) is a refusal, never "absent".
 * @param {string} dir
 */
export function loadGateExclusion(dir) {
  if (typeof dir !== "string" || dir === "") throw new TypeError("loadGateExclusion: `dir` must be a non-empty string");
  let text;
  try {
    text = readFileSync(join(dir, CONFIG_FILE), "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return readGateExclusion(null);
    return refuse(`is unreadable (${e && e.code ? e.code : "error"}), so its \`${GATES_KEY}.${EXCLUDE_KEY}\` cannot be read`);
  }
  return readGateExclusion(text);
}
