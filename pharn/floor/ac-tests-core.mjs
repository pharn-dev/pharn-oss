#!/usr/bin/env node
// pharn/floor/ac-tests-core.mjs — the AC-tests MAPPING grammar, pure: the closed level set, the mapping line regex,
// the `## Mapping` reader, the test-file path rule, the path the setter scopes (`scopedPath`) and its folded
// comparison key (`scopeKey`). Contract: pharn/pharn-contracts/ac-tests.md.
//
// WHY A CORE (P3): three modules read the mapping — check-ac-tests.mjs (the mapping check), run-gates.mjs (the red
// run's `--ac-tests`) and red-run-core.mjs (the per-AC verdict). No floor module imports a `check-*.mjs` CLI, so the
// grammar lives here, once (L35), and check-ac-tests.mjs re-exports it unchanged. It changes when the MAPPING'S
// GRAMMAR changes, and for no other reason.
//
// TRUST (P2): the text is untrusted DATA. Nothing here echoes it; callers quote at most a bounded id or path.

import { posix } from "node:path";
import { clean, isConcrete } from "./plan-files-core.mjs";
import { foldName } from "./spec-template-core.mjs";

/** The verify levels a mapping line may name — the spec-template's closed set. */
export const LEVELS = Object.freeze(["unit", "integration", "e2e"]);

/** One mapping line: `- AC-<n> | <level> | `<test file>` | <public target>`. The file cell has no whitespace at
 *  either edge (6.20.5: a trailing one was admitted, and a cell `tests/a.test.js ` then reached the runner and the
 *  red-run match as a path no test file has), so every consumer receives the cell exactly as `## Files` lists it. */
export const MAPPING_RE = /^- (AC-[1-9][0-9]*) \| (unit|integration|e2e) \| `([^`\s](?:[^`]*[^`\s])?)` \| (\S.*)$/;

const MAPPING_HEADING_RE = /^##\s+Mapping\s*$/;

/** The path the writes-scope setter scopes for a `## Files` entry — `clean` (a trailing ` (…)` annotation and edge
 *  whitespace stripped), then `isConcrete` — or `null` for an entry the setter drops (a placeholder or glob). Both
 *  rules are plan-files-core's copy of the setter's, held to it by a parity test; never re-derived here. */
export function scopedPath(entry) {
  const c = clean(entry);
  return isConcrete(c) ? c : null;
}

/** scopedPath, then FOLDED for comparison: NFC and full case folding — spec-template-core's `foldName`, the fold the
 *  write guard's toKey applies (minus its Windows trailing dot/space strip). Before 6.20.5 this only lowercased, so
 *  an NFD spelling, or `ſ` for `s`, of an AC test file passed `in-plan-files` while APFS resolved both to one file. */
export function scopeKey(entry) {
  const p = scopedPath(entry);
  return p === null ? null : foldName(p);
}

const H2_OR_ABOVE_RE = /^\s{0,3}#{1,2}\s/;

/** The lines under `## Mapping`, up to the next `#`/`##` heading. Blank lines are skipped; every other line must
 *  match MAPPING_RE. Returns the parsed rows and the file line numbers of the lines that did not. */
export function mappingOf(text) {
  const lines = String(text).split(/\r?\n/);
  const start = lines.findIndex((l) => MAPPING_HEADING_RE.test(l));
  if (start === -1) return { present: false, rows: [], malformed: [], extraSections: 0 };
  const extraSections = lines.filter((l) => MAPPING_HEADING_RE.test(l)).length - 1;
  const rows = [];
  const malformed = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (H2_OR_ABOVE_RE.test(line)) break;
    if (line.trim() === "") continue;
    const m = line.match(MAPPING_RE);
    if (!m) {
      malformed.push(i + 1);
      continue;
    }
    rows.push({ line: i + 1, id: m[1], level: m[2], file: m[3], target: m[4] });
  }
  return { present: true, rows, malformed, extraSections };
}

/** Why a `## Files` entry cannot be an AC test file path, or null when it can. */
export function badPath(p) {
  if (/[<>*?]/.test(p)) return "a placeholder or glob (the writes-scope setter drops it)";
  if (p.startsWith("/")) return "absolute";
  // The red run hands mapped files to the runner as argv after `--`, which stops npm's parsing, not the runner's.
  if (p.startsWith("-")) return "led by '-', which a test runner would read as a flag";
  if (p !== posix.normalize(p) || p.endsWith("/") || p.startsWith("./") || p.split("/").includes(".."))
    return "not a normalized repo-relative path";
  if (p === ".pharn" || p.startsWith(".pharn/")) return "under .pharn/, which is always writable and git-ignored";
  if (p.startsWith("pharn/features/")) return "under pharn/features/, the pipeline's own artifact tree";
  return null;
}

/** The mapping's rows as the red run needs them — `{id, level, file}` — or a refusal. Stricter than mappingOf: one
 *  `## Mapping`, no malformed line, at least one row, and every mapped file a path badPath accepts, so a file the
 *  mapping checker would refuse never reaches a runner's argv or a verdict. Used by run-gates.mjs (`--ac-tests`) and
 *  red-run-core.mjs; a refusal there means a caller skipped check-ac-tests.mjs. */
export function acRowsOf(text) {
  const m = mappingOf(text);
  if (!m.present || m.malformed.length || m.extraSections || m.rows.length === 0) {
    return { ok: false, reason: "no single, well-formed `## Mapping` with at least one row — run check-ac-tests.mjs" };
  }
  for (const r of m.rows) {
    const why = badPath(r.file);
    if (why) return { ok: false, reason: `${r.id} is mapped to ${JSON.stringify(r.file.slice(0, 80))}, which is ${why}` };
  }
  return { ok: true, rows: m.rows.map((r) => ({ id: r.id, level: r.level, file: r.file })) };
}
