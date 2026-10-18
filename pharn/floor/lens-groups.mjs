#!/usr/bin/env node
// pharn/floor/lens-groups.mjs — which /pharn-review lenses share one subagent (review-lens-grouping, review finding
// CTX-3 (b)). CONSTITUTION P0/P5.
//
// WHAT IT PRINTS. /pharn-review Step 3 runs it on the assignment record Step 1b's emitter wrote
// (render-review-assignments.mjs) and spawns one subagent per printed group. A group is a family of the committed map
// pharn/floor/lens-family-map.json with at least one ACTIVE member, its members in map order. A lens is ACTIVE when
// its review set is non-empty: its slice, or a `scanner_errors` entry naming it (a failed scanner fails toward
// review). A scanner-less lens's slice is already the whole target. Membership is a lookup in the committed map and
// activity a non-empty test over the record (P5): no model decides a group.
//
// IT NEVER RE-RUNS A SCANNER AND NEVER READS A REVIEWED FILE. The record's verdicts are the input (L42's rule, as
// check-review-assignments.mjs follows it). The record fields it reads, and nothing else: `assignments[].lens`,
// `assignments[].slice`, `scanner_errors[].lens`. The record's shape has no contract file
// (check-review-assignments.mjs, "THE DEFERRED CONTRACT"), so this is its third reader after that checker and
// merge-findings.mjs; lens-groups.test.mjs runs this CLI on a REAL emitter record, so an emitter change that moves
// one of these fields turns that test red.
//
// IN AN INSTALL the installer copies only the selected lenses, so the map is a SUPERSET of the record. A map member
// absent from the record is ignored. A recorded lens the map does not name runs in a group of its own, named after
// itself, after the map's groups: the one-subagent-per-lens spawn of 6.62.0.
//
// `unwritten` lists every grouped lens whose `<record dir>/lenses/<lens>/findings.json` was not written THIS run, as
// {lens, reason}, the reason from the closed UNWRITTEN_REASONS: `absent` (no regular file there: missing, a directory, a
// symlink — lstat, never followed) or `stale` (a regular file whose modification time is NOT LATER than the record's,
// in nanoseconds: Step 1b rewrites the record at the start of every run, so a file an earlier run left is older, and an
// equal time is not later). /pharn-review re-runs the same line after its groups return, so a group that stopped
// partway shows per lens, never as "no findings". The trigger: in the grouped eval's second run a group subagent had its
// scanner calls refused, stopped and wrote nothing, while the first run's files were still on disk; existence alone
// would have counted all four of its lenses as written.
// BOUND (P0): a modification time is a filesystem fact any writer can set (`touch`, utimes), so this detects a stale or
// skipped write, never a forged one; and a fresh file says nothing about whether its lens finished. On a filesystem
// whose timestamps are coarser than the time between Step 1b and a lens's write (seconds on some), a fresh file can
// read as `stale`, toward re-review, never away from it.
//
// EXIT CODES. Each one picks a different /pharn-review Step 3 branch:
//   0  printed: the groups, from the map.
//   1  the RECORD is unusable — unreadable, not JSON, not an object, `assignments` or `scanner_errors` not well
//      shaped, a lens name that is not one path segment, a lens recorded twice, or a `scanner_errors` lens with no
//      assignment — or the usage is wrong. NOTHING is printed on stdout. Step 3 reads every lens's files from this
//      record, so no fallback can use it: the command stops and asks, and that branch never reads the record. Node's
//      own crash exit is also 1 and takes the same stop (fail-closed).
//   2  the MAP is unusable — unreadable, not JSON, or malformed: no `families`, an empty one, a family name that is
//      not kebab-case or appears twice, an empty family, a lens that is not kebab-case or appears twice, or
//      `trust-fence` with a sibling. The record WAS read: stdout holds the fallback document, one group per active
//      lens named after it (6.62.0's spawn), with `map_error` saying why, and one stderr line says the same.
// The record is judged before the map, so an exit 2 WITH a `lens-groups/v1` line on stdout means the record was usable.
// Exit 2 has a second cause: on a Node below 24.2, runtime-floor.mjs refuses before anything is read and prints NOTHING
// on stdout. So a consumer branches on exit 2 only together with the printed document: Step 3 treats an exit 2 with no
// `lens-groups/v1` line as unusable and stops, as it does exit 1 — the stop runtime-floor.mjs's callers take.
//
// It does not check a family's basis (scanner-bound vs scanner-less): that is a committed-map invariant, pinned by
// lens-groups.test.mjs against lens-scanner-map.json in this repository, and an install receives the map as committed.
//
// FLOOR: the groups are a deterministic function of the record and the map, pinned by lens-groups.test.mjs.
// ADVISORY: that /pharn-review spawns them, that each lens in a group judges only its own files, and anything about
// the subagent type the groups run as.
//
// Usage:  node pharn/floor/lens-groups.mjs <assignments.json>
//         (run from the project root; the map is read from ./pharn/floor/lens-family-map.json)
// Output: one line, {"schema":"lens-groups/v1","groups":[{"family","lenses":[…]}],"idle":[…],
//         "unwritten":[{"lens","reason":"absent"|"stale"}],"map_error":null|"<why>"}
//
// NON-LLM. No network, no child process.

import "./runtime-floor.mjs";
import { lstatSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { shown } from "./quote-core.mjs";

export const SCHEMA = "lens-groups/v1";
export const FAMILY_MAP_PATH = "pharn/floor/lens-family-map.json";
/** The attempt-0 injection probe (THREAT-MODEL.md §5): it shares its context with no other lens. */
export const FENCE_LENS = "trust-fence";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// eslint-disable-next-line no-control-regex
const UNSAFE_SEGMENT = /[/\\\u0000-\u001f\u007f]/;

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isKebab = (v) => typeof v === "string" && KEBAB.test(v);
/** A recorded lens name becomes one path segment (`lenses/<lens>/findings.json`), so it must be exactly one. */
const isLensName = (v) => typeof v === "string" && v !== "" && v !== "." && v !== ".." && !UNSAFE_SEGMENT.test(v);

const mapFault = (reason) => ({ ok: false, reason });

/** The map's shape, judged at run time. {ok:true, families} or {ok:false, reason}; it never throws (L62). */
export function checkFamilyMap(parsed) {
  if (!isPlainObject(parsed) || !Array.isArray(parsed.families)) return mapFault("the map has no `families` array");
  if (parsed.families.length === 0) return mapFault("`families` is empty");
  const names = new Set();
  const familyOf = new Map(); // lens -> family: a Map, so `constructor` or `__proto__` is an ordinary key (L15)
  const families = [];
  for (const f of parsed.families) {
    if (!isPlainObject(f)) return mapFault(`a family is not an object (${shown(f)})`);
    if (!isKebab(f.family)) return mapFault(`family name ${shown(f.family)} is not kebab-case`);
    if (names.has(f.family)) return mapFault(`family ${shown(f.family)} appears twice`);
    names.add(f.family);
    if (!Array.isArray(f.lenses) || f.lenses.length === 0) return mapFault(`family ${shown(f.family)} has no lenses`);
    for (const lens of f.lenses) {
      if (!isKebab(lens)) return mapFault(`family ${shown(f.family)} holds lens ${shown(lens)}, which is not kebab-case`);
      if (familyOf.has(lens)) {
        return mapFault(`lens ${shown(lens)} is in family ${shown(familyOf.get(lens))} and in family ${shown(f.family)}`);
      }
      familyOf.set(lens, f.family);
    }
    if (f.lenses.includes(FENCE_LENS) && f.lenses.length > 1) {
      return mapFault(`\`${FENCE_LENS}\` shares family ${shown(f.family)} with another lens; it must be alone`);
    }
    families.push({ family: f.family, lenses: [...f.lenses] });
  }
  return { ok: true, families };
}

/** Reads and checks `<repoDir>/pharn/floor/lens-family-map.json`. {ok:true, families} or {ok:false, reason}. */
export function readFamilyMap(repoDir) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(join(repoDir, FAMILY_MAP_PATH), "utf8"));
  } catch (e) {
    return mapFault(`${FAMILY_MAP_PATH} could not be read as JSON (${shown(e && (e.code ?? e.name))})`);
  }
  return checkFamilyMap(parsed);
}

/** Every recorded lens and whether its review set is non-empty, in record order. {ok:true, lenses} or {ok:false, reason}. */
function recordLenses(record) {
  if (!isPlainObject(record)) return { ok: false, reason: "the record is not a JSON object" };
  if (!Array.isArray(record.assignments)) return { ok: false, reason: "`assignments` is missing or not an array" };
  if (!Array.isArray(record.scanner_errors)) return { ok: false, reason: "`scanner_errors` is missing or not an array" };
  const lenses = [];
  const byName = new Map(); // never a plain object: a lens named `toString` must not find a prototype member (L15)
  for (const a of record.assignments) {
    if (!isPlainObject(a) || !isLensName(a.lens) || !Array.isArray(a.slice)) {
      return {
        ok: false,
        reason: `an \`assignments\` entry is not a {lens, slice} object whose lens is one path segment (lens ${shown(isPlainObject(a) ? a.lens : a)})`,
      };
    }
    if (byName.has(a.lens)) return { ok: false, reason: `lens ${shown(a.lens)} has two \`assignments\` entries` };
    const entry = { lens: a.lens, active: a.slice.length > 0 };
    byName.set(a.lens, entry);
    lenses.push(entry);
  }
  for (const e of record.scanner_errors) {
    if (!isPlainObject(e) || typeof e.lens !== "string") {
      return { ok: false, reason: `a \`scanner_errors\` entry is not an object with a lens string (${shown(e)})` };
    }
    const entry = byName.get(e.lens);
    if (entry === undefined) {
      return { ok: false, reason: `a \`scanner_errors\` entry names lens ${shown(e.lens)}, which has no \`assignments\` entry` };
    }
    entry.active = true;
  }
  return { ok: true, lenses };
}

/**
 * PURE. The groups for one record. `families` is a checked map's `families`, or null when the map is unusable (each
 * active lens then runs alone). {ok:true, groups, idle} or {ok:false, reason} when the record is unusable.
 */
export function computeLensGroups(record, families) {
  const r = recordLenses(record);
  if (!r.ok) return r;
  const active = new Map(r.lenses.map((x) => [x.lens, x.active]));
  const placed = new Set();
  const groups = [];
  for (const f of families ?? []) {
    const members = f.lenses.filter((l) => active.get(l) === true);
    for (const l of f.lenses) if (active.has(l)) placed.add(l);
    if (members.length > 0) groups.push({ family: f.family, lenses: members });
  }
  for (const x of r.lenses) if (x.active && !placed.has(x.lens)) groups.push({ family: x.lens, lenses: [x.lens] });
  return { ok: true, groups, idle: r.lenses.filter((x) => !x.active).map((x) => x.lens) };
}

/** Why a grouped lens's findings.json does not count as written this run. CLOSED. */
export const UNWRITTEN_REASONS = Object.freeze(["absent", "stale"]);

/** `p`'s modification time in nanoseconds when it is a regular file (lstat: never followed), else null. */
function regularFileMtimeNs(p) {
  try {
    const s = lstatSync(p, { bigint: true });
    return s.isFile() ? s.mtimeNs : null;
  } catch {
    return null;
  }
}

/**
 * Every grouped lens whose `<dir of recordPath>/lenses/<lens>/findings.json` was not written after the record, as
 * {lens, reason}: `absent` (not a regular file) or `stale` (modified at or before `recordMtimeNs`, a bigint).
 */
export function unwrittenLenses(recordPath, groups, recordMtimeNs) {
  const lensesDir = join(dirname(recordPath), "lenses");
  const out = [];
  for (const g of groups) {
    for (const lens of g.lenses) {
      const m = regularFileMtimeNs(join(lensesDir, lens, "findings.json"));
      if (m === null) out.push({ lens, reason: "absent" });
      else if (m <= recordMtimeNs) out.push({ lens, reason: "stale" });
    }
  }
  return out;
}

const USAGE = "usage: node pharn/floor/lens-groups.mjs <assignments.json>";

/** The CLI. Returns the exit code; writes only through process.stdout/stderr.write. */
export function main(argv) {
  if (argv.length !== 1 || argv[0] === "" || argv[0].startsWith("--")) {
    process.stderr.write(`lens-groups: ${USAGE} — exactly one argument, the record path.\n`);
    return 1;
  }
  const recordPath = argv[0];
  let record;
  let recordMtimeNs;
  try {
    record = JSON.parse(readFileSync(recordPath, "utf8"));
    recordMtimeNs = statSync(recordPath, { bigint: true }).mtimeNs;
  } catch (e) {
    process.stderr.write(
      `lens-groups: RECORD UNUSABLE — ${shown(recordPath)} could not be read as JSON (${shown(e && (e.code ?? e.name))}). ` +
        "Nothing printed; /pharn-review stops here.\n"
    );
    return 1;
  }
  const map = readFamilyMap(".");
  const result = computeLensGroups(record, map.ok ? map.families : null);
  if (!result.ok) {
    process.stderr.write(`lens-groups: RECORD UNUSABLE — ${result.reason}. Nothing printed; /pharn-review stops here.\n`);
    return 1;
  }
  const doc = {
    schema: SCHEMA,
    groups: result.groups,
    idle: result.idle,
    unwritten: unwrittenLenses(recordPath, result.groups, recordMtimeNs),
    map_error: map.ok ? null : map.reason,
  };
  process.stdout.write(JSON.stringify(doc) + "\n");
  if (!map.ok) {
    process.stderr.write(`lens-groups: MAP UNUSABLE — ${map.reason}. Printed one group per active lens (the fallback).\n`);
    return 2;
  }
  return 0;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
