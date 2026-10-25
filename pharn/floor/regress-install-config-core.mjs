#!/usr/bin/env node
// pharn/floor/regress-install-config-core.mjs — a project's declared answer to /pharn-regress's BASE install question
// (6.66.0, regress-install-config, audit LOOP-11). P3: this file changes when "how a project declares the base install"
// changes, and for no other reason; APPLYING the declaration is stage-regress-core.mjs's resolveInstall, which owns the
// values (DECLARED_INSTALL_VALUES, imported — L35).
//
// THE RECORDED FAILURE (P7): `resolveInstall` asks `install-unresolved` whenever the base commit has a package.json and
// not exactly one lockfile family. /pharn-loop cannot answer a question (it maps it to S10) and its granted regress line
// passes neither --install nor --no-install, so a library that commits no lockfile, or a project with two lockfile
// families, could never finish a full /pharn-loop.
//
// THE DECLARATION, in the project root's `pharn.config.json` (per-test-results-core.mjs CONFIG_FILE, imported):
//
//   { "regress": { "install": "none" | "head-node-modules" | "npm" | "pnpm" | "yarn" | "bun" } }
//
// What each value does is stage-regress-core.mjs's DECLARED_INSTALL_VALUES header. CLOSED in both directions (L36),
// fail-closed:
//   • no file, or no own `regress` key, or `{}` → no declaration (null), and nothing anywhere changes;
//   • `regress` must be a plain object whose only key is `install`;
//   • `install` must be one of DECLARED_INSTALL_VALUES, spelled exactly — never a command string;
//   • anything else REFUSES, including a file that exists but cannot be read or parsed (never read as "absent").
//
// WHERE IT IS READ: by stage-regress.mjs's head-init, from the project root, only when the invocation gave neither
// --install nor --no-install and the base commit has a package.json (argv > declaration > lockfile table).
//
// WHAT IT DOES NOT DO (P0):
//   • It is not pinned. `/pharn-test`'s test-infrastructure pin covers what decides /pharn-verify's AC gate; this
//     decides only regress's BASE environment. A build that changes it is held off by other means, none of them a pin:
//     in an installed project the writes-scope setter refuses `pharn.config.json` from a plan (6.61.0) and the write
//     guard reserves it outside a run (hooks), and a Bash write is DETECTED, never prevented, by /pharn-verify's
//     reconcile gate. In a dev checkout a plan may scope it.
//   • `none` does not make a no-dependency base comparable: over declared dependencies the base has none, so a gate
//     red on both sides refuses `base-install-unreliable` exactly as `--no-install` does.
//   • `head-node-modules` does not attribute a regression caused purely by a dependency change: the BASE runs with
//     HEAD's dependency tree, so such a gate is red on both sides and reads `pre_existing`. Disclosed in the report's
//     `base_install` block and in REGRESSION.md.
//   • The file is agent-editable project input; nothing here proves who wrote the declaration (L43).
//
// TRUST (P2): the file is untrusted DATA — parsed as JSON, keys tested by own-property (L15), the value used only after a
// set-membership test. A refusal names a key or a value quoted through quote-core.mjs's total `shown()` (L62); no value
// is interpreted or executed.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DECLARED_INSTALL_VALUES } from "./stage-regress-core.mjs";
import { CONFIG_FILE } from "./per-test-results-core.mjs";
import { shown } from "./quote-core.mjs";

/** The top-level key of the declaration, and its closed key set. */
export const REGRESS_KEY = "regress";
export const INSTALL_KEY = "install";
export const REGRESS_KEYS = Object.freeze([INSTALL_KEY]);

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function refuse(reason) {
  return { ok: false, reason: `${CONFIG_FILE} ${reason}` };
}

/**
 * Validate a `pharn.config.json` TEXT (`null` when the file is absent) and return the declared value, or null.
 * @param {string|null} text
 * @returns {{ok: true, install: string|null} | {ok: false, reason: string}}
 */
export function readRegressInstall(text) {
  if (text === null) return { ok: true, install: null };
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch (e) {
    return refuse(`is not valid JSON (${e.message}), so its \`${REGRESS_KEY}.${INSTALL_KEY}\` cannot be read`);
  }
  if (!isPlainObject(cfg)) return refuse("is not a JSON object");
  if (!Object.hasOwn(cfg, REGRESS_KEY)) return { ok: true, install: null };
  const block = cfg[REGRESS_KEY];
  if (!isPlainObject(block)) return refuse(`\`${REGRESS_KEY}\` must be an object — {"${INSTALL_KEY}": <value>}`);
  for (const k of Object.keys(block)) {
    if (!REGRESS_KEYS.includes(k)) return refuse(`\`${REGRESS_KEY}\` has the key ${shown(k)}; its only key is \`${INSTALL_KEY}\``);
  }
  if (!Object.hasOwn(block, INSTALL_KEY)) return { ok: true, install: null };
  const v = block[INSTALL_KEY];
  if (typeof v !== "string" || !DECLARED_INSTALL_VALUES.includes(v)) {
    return refuse(`\`${REGRESS_KEY}.${INSTALL_KEY}\` is ${shown(v)}; it must be one of ${DECLARED_INSTALL_VALUES.join(" | ")}`);
  }
  return { ok: true, install: v };
}

/**
 * `<dir>/pharn.config.json` → the declared value, or a refusal. An absent file declares nothing; a file that exists but
 * cannot be read (a directory, no permission) is a refusal, never "absent".
 * @param {string} dir
 */
export function loadRegressInstall(dir) {
  if (typeof dir !== "string" || dir === "") throw new TypeError("loadRegressInstall: `dir` must be a non-empty string");
  let text;
  try {
    text = readFileSync(join(dir, CONFIG_FILE), "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return readRegressInstall(null);
    return refuse(`is unreadable (${e && e.code ? e.code : "error"}), so its \`${REGRESS_KEY}.${INSTALL_KEY}\` cannot be read`);
  }
  return readRegressInstall(text);
}
