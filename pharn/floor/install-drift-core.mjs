// pharn/floor/install-drift-core.mjs — THE HEAD INSTALL CHECK, the pure half (6.40.0, regress-head-install-drift). No
// filesystem, no child process, no clock. `install-drift.mjs` reads the tree and hands this module what it found; both
// stage scripts (`stage-regress.mjs` at head-init, `stage-verify.mjs` at init) call it before any gate runs (P3: this
// module changes when the RULE changes, the reader when the way the tree is read changes).
//
// ======================================== THE RECORDED FAILURE (P7) ========================================
// A user's 92-minute `/pharn-loop` (pharn-starter, `billing-plan-catalog`, 2026-10-05) reported `typecheck` as a
// REGRESSION — exit 0 at base, 1 at head — in files the build never touched. The HEAD gates ran over the user's stale
// `node_modules` (`@sentry/core@10.75.0`, invalid against `^11.0.0` after a dependency bump the user had pulled), while
// the BASE side ran on a fresh `npm ci` (`stage-regress-core.mjs` INSTALL_RULE). `/pharn-verify` reads the same tree,
// so it fails the same way, and the loop would rebuild to fix a red no build can reach. The same state was measured
// in this repository's own main checkout the same day (12 packages changed, 1 missing after a bump nobody installed).
// The evidence: `.dev/features/regress-head-install-drift/PLAN.md`, "Why".
//
// ============================================== THE RULE ==============================================
// For an npm project — exactly one lockfile family at the project root, and it is npm's — compare npm's own record of
// what it last installed, `node_modules/.package-lock.json` (the "hidden lockfile", written at every reify), with the
// lockfile the project declares: `npm-shrinkwrap.json` when present, else `package-lock.json` (npm's own precedence,
// read from @npmcli/arborist's shrinkwrap.js). Only keys with a `node_modules/` segment are compared — a workspace's own
// folder entry is source, not an install, and the hidden lockfile carries no root entry. Per key:
//   changed     in both, and `version` differs, or `link` differs, or — when BOTH carry an `integrity` string — the
//               integrity differs, else `resolved` differs. Integrity first, so a registry-host difference in
//               `resolved` cannot read as drift. A field that is not a string is never equal to anything (a lockfile
//               npm wrote holds strings there), which keeps the comparison total over any parsed JSON (L62).
//   missing     in the lockfile only, and EITHER the entry carries none of `dev`, `peer`, `optional`, `devOptional`,
//               OR it carries `dev`, `peer` or `devOptional` and npm's record holds at least one PRESENT entry carrying
//               that same flag — the class WAS installed, so this member of it is missing (independent review R1:
//               a pulled `devDependencies` addition read `clean` under the first rule; measured: after `npm ci
//               --omit=dev` the record holds no `dev: true` entry at all).
//   missing-unchecked   in the lockfile only, and the entry is `optional`, or `devOptional` with a platform constraint
//               (`os` / `cpu` / `libc`), or carries `dev` / `peer` / `devOptional` while the record holds NO present
//               entry with that flag — COUNTED, never drift (GATE 1). npm skips an optional package that does not fit
//               the platform (271 such entries in pharn-starter, every one flagged optional), and an install configured
//               with `omit=dev`, `NODE_ENV=production` or `legacy-peer-deps` leaves that whole class absent on EVERY
//               `npm ci` — refusing it would be a permanent stop no remedy clears (L27). Residual, stated: a needed
//               package in such a class that is really absent reads `clean`, and its gate fails as it did before.
//   extraneous  in the hidden lockfile only.
//
// THE STATES (closed). `drifted` and `not-installed` REFUSE (`refuses`); every other state proceeds exactly as before
// this check existed and is only reported:
//   clean          npm, and no changed / missing / extraneous entry (missing-unchecked ones may exist);
//   drifted        npm, and at least one changed, missing or extraneous entry;
//   not-installed  npm, the lockfile lists at least one entry that would count as `missing`, and there is no
//                  `node_modules` (no packages at all → `clean`: npm writes no `node_modules` for an empty lockfile);
//   not-checked    with ONE closed `why` (NOT_CHECKED_WHYS), the first that applies, in that order.
//
// ======================================= WHAT THIS DOES NOT CLAIM (P0) =======================================
// It certifies that two records npm writes AGREE — never that `node_modules` holds what the lockfile says (L43):
//   • a `node_modules` changed outside npm after npm last wrote its record reads `clean`; npm itself trusts the record
//     only when no package folder is newer (`assertNoNewer`), and that walk is NOT mirrored here;
//   • `npm install --package-lock-only` rewrites the hidden lockfile to the new lockfile WITHOUT installing (measured,
//     npm 11.12.1, 2026-10-05), so that tree reads `clean`;
//   • pnpm, yarn and bun are `not-checked` `unmeasured-family` — no rule is guessed for them.
// A false `clean` leaves the pre-6.40.0 behaviour (the gates run); it never causes a refusal. The remedy for both
// refusing states is the command INSTALL_RULE resolves for npm (`npm ci`, what the BASE side runs), measured to bring a
// drifted tree back to `clean`. A KNOWN REFUSAL, named (independent review R3, measured): a workspace-filtered install
// (`npm ci -w <ws>`) leaves the other workspaces' packages absent and reads `drifted`; its remedy is a full install. No
// bypass is offered: the only way past a refusal is an install that matches the lockfile.
//
// TRUST (P2): the lockfile and the hidden lockfile are project content a build can write. Only enums, integers and
// booleans branch here. Package paths and versions leave this module only in `mismatches` and in `detailText`, where
// each is JSON-quoted and cut to SHOWN_CHARS (`quote-core.mjs` `shown` — review R4: a multi-megabyte hostile key is
// size, not injection), and the stage scripts render that detail inside a DATA fence (`quoteData`); the report
// block (`headInstallBlock`) carries enums and integers only. No lockfile key ever becomes a path that is read.

import { LOCKFILE_FAMILIES, resolveInstall } from "./stage-regress-core.mjs";
import { shown } from "./quote-core.mjs";

export const STATES = Object.freeze(["clean", "drifted", "not-installed", "not-checked"]);
export const REFUSING_STATES = Object.freeze(["drifted", "not-installed"]);

/** Why the install was not checked — evaluated in THIS order, the first that applies decides. */
export const NOT_CHECKED_WHYS = Object.freeze([
  "no-manifest", // no package.json at the project root
  "no-lockfile", // a package.json, and no lockfile of any family
  "several-lockfile-families", // more than one family present: which one installed node_modules is unknown
  "unmeasured-family", // pnpm, yarn or bun: no rule here has been measured for them
  "lockfile-unreadable", // the npm lockfile is not a readable regular file of JSON
  "lockfile-unsupported", // JSON without a `packages` object (npm ≤ 6's lockfileVersion 1)
  "node-modules-unreadable", // node_modules exists but is not a readable directory
  "no-hidden-lockfile", // node_modules is a directory without npm's record in it (another tool, or a copy)
  "hidden-lockfile-unreadable", // npm's record is not a readable regular file of JSON with a `packages` object
]);

export const MISMATCH_KINDS = Object.freeze(["changed", "missing", "extraneous"]);
export const COUNT_KEYS = Object.freeze(["changed", "missing", "extraneous", "missing_unchecked"]);
export const NPM_LOCKFILES = Object.freeze(["npm-shrinkwrap.json", "package-lock.json"]); // npm's precedence order
export const NPM_HIDDEN_LOCKFILE = "node_modules/.package-lock.json";
/** How many mismatches a result lists (the counts are always complete). */
export const MISMATCH_CAP = 20;

/** The flags whose absent entries count as drift only when npm's record shows the class was installed (review R1). */
const CLASS_FLAGS = Object.freeze(["dev", "peer", "devOptional"]);
const PLATFORM_FIELDS = Object.freeze(["os", "cpu", "libc"]);
const FAMILIES = Object.freeze(Object.keys(LOCKFILE_FAMILIES));
const BLOCK_KEYS = Object.freeze(["state", "why", "family", "lockfile", "counts"]);
const INSTALL_KEY_RE = /(^|\/)node_modules\//;

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function zeroCounts() {
  return { changed: 0, missing: 0, extraneous: 0, missing_unchecked: 0 };
}

function notChecked(why, family = null, lockfile = null) {
  return { state: "not-checked", why, family, lockfile, counts: zeroCounts(), mismatches: [], remedy: null };
}

/** Equal only when both are absent, or both are the SAME string. A non-string is never equal (total over JSON). */
function sameString(a, b) {
  if (a === undefined && b === undefined) return true;
  return typeof a === "string" && typeof b === "string" && a === b;
}

function field(entry, name) {
  return isPlainObject(entry) && Object.hasOwn(entry, name) ? entry[name] : undefined;
}

function isChanged(lockEntry, hiddenEntry) {
  if (!sameString(field(lockEntry, "version"), field(hiddenEntry, "version"))) return true;
  if ((field(lockEntry, "link") === true) !== (field(hiddenEntry, "link") === true)) return true;
  const li = field(lockEntry, "integrity");
  const hi = field(hiddenEntry, "integrity");
  if (typeof li === "string" && typeof hi === "string") return li !== hi;
  return !sameString(field(lockEntry, "resolved"), field(hiddenEntry, "resolved"));
}

function installKeys(packages) {
  return Object.keys(packages).filter((k) => INSTALL_KEY_RE.test(k));
}

/** The CLASS_FLAGS some present install entry of npm's record carries (`true`) — the classes that were installed. */
export function installedClasses(hiddenPackages) {
  const seen = new Set();
  for (const key of installKeys(hiddenPackages)) {
    for (const flag of CLASS_FLAGS) if (field(hiddenPackages[key], flag) === true) seen.add(flag);
  }
  return seen;
}

/**
 * Is an entry ABSENT from the install drift? `false` → missing-unchecked: npm skips it on this platform (`optional`, or
 * `devOptional` with a platform constraint), or it belongs only to classes this install did not install (an omit=dev /
 * legacy-peer-deps install). An entry with no class flag is always drift.
 */
export function absentIsDrift(entry, installed) {
  if (field(entry, "optional") === true) return false;
  if (field(entry, "devOptional") === true && PLATFORM_FIELDS.some((f) => field(entry, f) !== undefined)) return false;
  const flags = CLASS_FLAGS.filter((f) => field(entry, f) === true);
  return flags.length === 0 || flags.some((f) => installed.has(f));
}

function asVersion(v) {
  return typeof v === "string" ? v : null;
}

/**
 * Compare two parsed `packages` maps. Returns `{counts, mismatches}` — every mismatch counted, the list sorted by path
 * (code-unit order) and capped at MISMATCH_CAP.
 */
export function comparePackages(lockPackages, hiddenPackages) {
  const counts = zeroCounts();
  const all = [];
  const installed = installedClasses(hiddenPackages);
  for (const key of installKeys(lockPackages)) {
    const lockEntry = lockPackages[key];
    if (Object.hasOwn(hiddenPackages, key)) {
      const hiddenEntry = hiddenPackages[key];
      if (isChanged(lockEntry, hiddenEntry)) {
        counts.changed++;
        all.push({
          path: key,
          kind: "changed",
          lockfile: asVersion(field(lockEntry, "version")),
          installed: asVersion(field(hiddenEntry, "version")),
        });
      }
    } else if (!absentIsDrift(lockEntry, installed)) {
      counts.missing_unchecked++;
    } else {
      counts.missing++;
      all.push({ path: key, kind: "missing", lockfile: asVersion(field(lockEntry, "version")), installed: null });
    }
  }
  for (const key of installKeys(hiddenPackages)) {
    if (Object.hasOwn(lockPackages, key)) continue;
    counts.extraneous++;
    all.push({ path: key, kind: "extraneous", lockfile: null, installed: asVersion(field(hiddenPackages[key], "version")) });
  }
  all.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { counts, mismatches: all.slice(0, MISMATCH_CAP) };
}

/**
 * THE DECISION. `inputs` is exactly what `install-drift.mjs` read (every field required — no defaults, L41):
 *   manifest     boolean — an entry named package.json exists at the root;
 *   families     {npm, pnpm, yarn, bun} booleans — an entry named one of LOCKFILE_FAMILIES[f] exists;
 *   lockfile     the npm lockfile's name (NPM_LOCKFILES member) or null;
 *   lock         {kind: "ok", value} | {kind: "unreadable"} | null (null when the family is not npm);
 *   nodeModules  "dir" | "absent" | "unreadable" | null (null when not read);
 *   hidden       {kind: "ok", value} | {kind: "absent"} | {kind: "unreadable"} | null (null when not read).
 * Returns `{state, why, family, lockfile, counts, mismatches, remedy}`; `remedy` is a command only for a refusing state.
 */
export function installCheck(inputs) {
  if (!isPlainObject(inputs)) throw new Error("internal: installCheck requires its inputs object");
  const { manifest, families, lockfile, lock, nodeModules, hidden } = inputs;
  if (!manifest) return notChecked("no-manifest");
  const present = FAMILIES.filter((f) => isPlainObject(families) && families[f] === true);
  if (present.length === 0) return notChecked("no-lockfile");
  if (present.length > 1) return notChecked("several-lockfile-families");
  const family = present[0];
  if (family !== "npm") return notChecked("unmeasured-family", family);
  if (!NPM_LOCKFILES.includes(lockfile)) throw new Error("internal: installCheck requires the npm lockfile's name");
  if (!isPlainObject(lock) || lock.kind !== "ok") return notChecked("lockfile-unreadable", family, lockfile);
  if (!isPlainObject(lock.value) || !isPlainObject(lock.value.packages)) return notChecked("lockfile-unsupported", family, lockfile);
  const lockPackages = lock.value.packages;
  const remedy = resolveInstall({ hasPackageJson: true, lockfiles: Object.fromEntries(FAMILIES.map((f) => [f, f === family])) }).cmd;

  if (nodeModules === "absent") {
    const counts = zeroCounts();
    const mismatches = [];
    const none = new Set(); // no node_modules: no class was installed
    for (const key of installKeys(lockPackages)) {
      const entry = lockPackages[key];
      if (!absentIsDrift(entry, none)) {
        counts.missing_unchecked++;
      } else {
        counts.missing++;
        mismatches.push({ path: key, kind: "missing", lockfile: asVersion(field(entry, "version")), installed: null });
      }
    }
    mismatches.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const state = counts.missing > 0 ? "not-installed" : "clean";
    return {
      state,
      why: null,
      family,
      lockfile,
      counts,
      mismatches: mismatches.slice(0, MISMATCH_CAP),
      remedy: state === "not-installed" ? remedy : null,
    };
  }
  if (nodeModules !== "dir") return notChecked("node-modules-unreadable", family, lockfile);
  if (!isPlainObject(hidden) || hidden.kind === "absent") return notChecked("no-hidden-lockfile", family, lockfile);
  if (hidden.kind !== "ok" || !isPlainObject(hidden.value) || !isPlainObject(hidden.value.packages)) {
    return notChecked("hidden-lockfile-unreadable", family, lockfile);
  }
  const { counts, mismatches } = comparePackages(lockPackages, hidden.value.packages);
  const drifted = counts.changed + counts.missing + counts.extraneous > 0;
  return {
    state: drifted ? "drifted" : "clean",
    why: null,
    family,
    lockfile,
    counts,
    mismatches,
    remedy: drifted ? remedy : null,
  };
}

/** A path or version for the detail: JSON-quoted, cut to SHOWN_CHARS (`shown`); an absent version is `null`. */
function quoted(v) {
  return v === null ? "null" : shown(v);
}

/** Does this result stop the stage before any gate? Membership in REFUSING_STATES. */
export function refuses(result) {
  return isPlainObject(result) && REFUSING_STATES.includes(result.state);
}

/**
 * The refusal detail for a refusing result: fixed sentences, the counts, the remedy, then the capped list — every path
 * and version JSON-quoted, so a newline or a backtick in a lockfile key stays on its one line (the caller fences it).
 */
export function detailText(result) {
  if (!refuses(result)) throw new Error("internal: detailText is for a refusing result only");
  const c = result.counts;
  const lines = [];
  if (result.state === "drifted") {
    lines.push(
      `The installed dependencies do not match ${result.lockfile}: npm's record of the installed tree (${NPM_HIDDEN_LOCKFILE}) ` +
        `differs in ${c.changed} changed, ${c.missing} missing and ${c.extraneous} extraneous package(s). ` +
        "The gates would run over a different install than the lockfile declares, so no gate was run."
    );
  } else {
    lines.push(
      `${result.lockfile} lists ${c.missing} package(s) that every install includes, and there is no node_modules directory, ` +
        "so no gate was run."
    );
  }
  lines.push(`Remedy: run \`${result.remedy}\` in the project root, then re-run.`);
  const shown = result.mismatches.length;
  const total = c.changed + c.missing + c.extraneous;
  lines.push(shown === total ? `All ${total} mismatch(es), by path:` : `The first ${shown} of ${total} mismatches, by path:`);
  for (const m of result.mismatches) {
    lines.push(`- ${m.kind} ${quoted(m.path)}: lockfile ${quoted(m.lockfile)}, installed ${quoted(m.installed)}`);
  }
  return lines.join("\n");
}

/** The report block — enums and integers only, never a path or a version. */
export function headInstallBlock(result) {
  return {
    state: result.state,
    why: result.why,
    family: result.family,
    lockfile: result.lockfile,
    counts: { ...result.counts },
  };
}

/**
 * The ONE line both renderers (REGRESSION.md, VERIFY.md) print for a block — or for `null`, a record that was absent
 * or malformed. Every interpolated value is a validated enum or an integer, so nothing untrusted reaches it; a block
 * that fails validation renders as "not recorded". `clean` says what was compared, never "the install is correct" (L43).
 */
export function headInstallLine(block) {
  if (block === null || !validateHeadInstallBlock(block).ok) {
    return "HEAD install: not recorded — the check's record was absent or malformed when this report was written (advisory).";
  }
  const unchecked = block.counts.missing_unchecked;
  const uncheckedNote = unchecked > 0 ? ` (${unchecked} absent dev/peer/optional package(s) not counted)` : "";
  if (block.state === "clean") {
    return (
      `HEAD install: checked — npm's record of the installed tree agrees with \`${block.lockfile}\`${uncheckedNote}. ` +
      "That `node_modules` holds those packages is not itself checked (install-drift-core.mjs)."
    );
  }
  if (block.state === "not-checked") {
    return (
      `HEAD install: NOT CHECKED (\`${block.why}\`${block.family ? `, ${block.family}` : ""}) — the gates ran over the working ` +
      "tree's install as it was, so a red gate may come from the install rather than from the change."
    );
  }
  return `HEAD install: \`${block.state}\` — the stage refuses before any gate in this state.`;
}

/** The block's closed shape (both directions, L36), for a block re-read from disk. `{ok, reason?}`. */
export function validateHeadInstallBlock(b) {
  if (!isPlainObject(b)) return { ok: false, reason: "the head_install block must be a JSON object" };
  const keys = Object.keys(b);
  if (keys.length !== BLOCK_KEYS.length || !BLOCK_KEYS.every((k) => Object.hasOwn(b, k))) {
    return { ok: false, reason: `the head_install block must carry exactly ${BLOCK_KEYS.join(", ")}` };
  }
  if (!STATES.includes(b.state)) return { ok: false, reason: `head_install.state must be one of ${STATES.join(" | ")}` };
  if (b.state === "not-checked" ? !NOT_CHECKED_WHYS.includes(b.why) : b.why !== null) {
    return { ok: false, reason: "head_install.why is a NOT_CHECKED_WHYS member exactly when the state is not-checked" };
  }
  if (b.family !== null && !FAMILIES.includes(b.family))
    return { ok: false, reason: "head_install.family must be a lockfile family or null" };
  if (b.lockfile !== null && !NPM_LOCKFILES.includes(b.lockfile))
    return { ok: false, reason: "head_install.lockfile must be an npm lockfile name or null" };
  if (b.state !== "not-checked" && (b.family !== "npm" || b.lockfile === null)) {
    return { ok: false, reason: "a checked head_install block names the npm family and its lockfile" };
  }
  const c = b.counts;
  if (
    !isPlainObject(c) ||
    Object.keys(c).length !== COUNT_KEYS.length ||
    !COUNT_KEYS.every((k) => Number.isSafeInteger(c[k]) && c[k] >= 0)
  ) {
    return { ok: false, reason: `head_install.counts must be exactly ${COUNT_KEYS.join(", ")}, each a non-negative integer` };
  }
  const drift = c.changed + c.missing + c.extraneous;
  const consistent =
    b.state === "not-checked"
      ? COUNT_KEYS.every((k) => c[k] === 0)
      : b.state === "clean"
        ? drift === 0
        : b.state === "drifted"
          ? drift > 0
          : c.missing > 0 && c.changed === 0 && c.extraneous === 0; // not-installed
  if (!consistent) return { ok: false, reason: `head_install.counts do not fit the state ${b.state}` };
  return { ok: true };
}
