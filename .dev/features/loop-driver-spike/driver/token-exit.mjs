#!/usr/bin/env node
// .dev/features/loop-driver-spike/driver/token-exit.mjs — turn a closed token a floor script printed into an exit
// code, so the CORE-113 spike driver branches on exit codes only (AC2). Dev apparatus, never shipped.
//
//   node token-exit.mjs <table> <file> [--field <key>]
//
// Reads <file> (a step's saved stdout). Without --field the token is the file's FIRST LINE; with --field it is that
// key of the one JSON document the file holds. Exits 10 + the token's index in the frozen table when the token is
// an exact member; 9 when it is not, or the file or JSON cannot be read; 2 on a usage error. It never prints the
// token: the token came from a floor script's output, and nothing here needs to echo it.
//
// The tables are the closed sets `/pharn-loop` reads (`.claude/commands/pharn-loop.md` `## Running a stage`, Step 5;
// `pharn-loop-quick.md` items 2 and 6). Each is exact membership — never a prefix or substring match (L6, L36).

import { readFileSync } from "node:fs";

export const TABLES = Object.freeze({
  "refused-row": Object.freeze([
    "refused S4",
    "refused S5",
    "refused S6",
    "refused S6b",
    "refused S6c",
    "refused S7",
    "refused S8",
    "refused S9",
    "refused S10",
  ]),
  "spec-kind": Object.freeze(["quick"]),
  "rerun-stage": Object.freeze(["verify", "regress"]),
  "fresh-reason": Object.freeze(["empty-source-set", "ac-evidence-invalid"]),
  "terminal-cause": Object.freeze(["ac-evidence"]),
});

export const NOT_MEMBER = 9;
export const USAGE = 2;

/** The exit code for `text` under `table` (and `field`, when given). Total: never throws. */
export function tokenExit(table, text, field) {
  if (!Object.hasOwn(TABLES, table)) return USAGE;
  let token;
  try {
    token = field === undefined ? String(text).split("\n")[0] : JSON.parse(String(text))[field];
  } catch {
    return NOT_MEMBER;
  }
  if (typeof token !== "string") return NOT_MEMBER;
  const i = TABLES[table].indexOf(token);
  return i === -1 ? NOT_MEMBER : 10 + i;
}

function main(argv) {
  const [table, file, flag, field, ...rest] = argv;
  if (!table || !file || rest.length > 0 || (flag !== undefined && (flag !== "--field" || !field))) return USAGE;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return Object.hasOwn(TABLES, table) ? NOT_MEMBER : USAGE;
  }
  return tokenExit(table, text, flag === undefined ? undefined : field);
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
