#!/usr/bin/env node
// pharn/floor/grill-round.mjs — the re-plan round of a full /pharn-loop (7.8.0, loop-replan-rounds). The CLI half of
// `pharn/floor/grill-round-core.mjs`, whose header holds the rules and their bounds; contract:
// `pharn/pharn-contracts/grill-triage.md`, "Rounds (7.8.0)" (cited, not restated — P4). Run from the project root.
//
//   node pharn/floor/grill-round.mjs current <name>
//        0 → one JSON line {"schema":"pharn-grill-round/1","round":<n>,"archived":<k>,"replan_from":"live"|"r<k>"|null}
//            — the round the next grill writes, and the round a re-plan reads (/pharn-grill, /pharn-plan)
//        1 → `RED — <codes>` first (a gap, a partial round, a non-regular file), then one fixed hint per code
//        2 → usage, or an absent or unreadable feature directory (stderr)
//
//   node pharn/floor/grill-round.mjs next <name>
//        0 → the round's four live files were renamed to their `.r<round>` archives; one JSON line names the next round
//        5 → no re-plan round is left (the live round is REPLAN_CAP + 1); nothing written
//        1 → `RED — <codes>` first, then the hints; nothing written, except `rename-partial`, which also lists the
//            names that exist so a person can restore them
//        2 → usage, or an unreadable input (stderr)
//
// Exit 1 is ALWAYS printed WITH its `RED — ` line first, so a caller can tell this checker's RED from node's own exit 1.
//
// READING AND RENAMING (L54): every live file and archive is lstat'ed first; a link, a directory or any non-regular file
// is refused (`not-regular`). The two JSON inputs are read through regular-file.mjs (one O_NOFOLLOW descriptor). `next`
// checks every source and destination BEFORE the first rename, renames within one directory in LIVE_NAMES order, and
// on a failed rename moves back what it already moved (`rename-failed`); if that fails too it reports `rename-partial`.
// Output names codes, file names and integers — never any content of either file (P2, L62).
//
// FLOOR: the round arithmetic and refusals (the core's header). At write time only: once archived, an archive is a
// pipeline artifact that reconcile exempts, so a later change to it is neither prevented nor detected (the contract's
// bound). ADVISORY: that the caller acts on the exit code (/pharn-loop Step 4).

import "./runtime-floor.mjs";
import { createHash } from "node:crypto";
import { lstatSync, renameSync } from "node:fs";
import { join } from "node:path";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { validate } from "./grill-findings-core.mjs";
import {
  ARCHIVE_NAMES,
  EXIT,
  LIVE_NAMES,
  archivedRounds,
  currentRound,
  decideNext,
  defectHints,
  formatDefects,
  roundArchives,
} from "./grill-round-core.mjs";
import { checkTriage } from "./grill-triage-core.mjs";
import { readRegularFile } from "./regular-file.mjs";

const INPUT_MAX = 4 * 1024 * 1024;
const USAGE = "usage: node pharn/floor/grill-round.mjs current <name>\n" + "       node pharn/floor/grill-round.mjs next <name>\n";

function usage(io) {
  io.stderr.write(USAGE);
  return EXIT.usage;
}

function red(io, codes, extra = []) {
  io.stdout.write(`${[`RED — ${formatDefects(codes)}`, ...defectHints(codes), ...extra].join("\n")}\n`);
  return EXIT.red;
}

/** lstat one name: "absent", "file", or "other" (a link, a directory, anything not a regular file). Never throws. */
function kindOf(path) {
  try {
    return lstatSync(path).isFile() ? "file" : "other";
  } catch (e) {
    return e?.code === "ENOENT" ? "absent" : "other";
  }
}

/** The feature directory's listing over the live and archive names: `{ok, live:Set, archives:Set}` or `{ok:false}`. */
function list(dir) {
  const live = new Set();
  const archives = new Set();
  for (const n of [...LIVE_NAMES, ...ARCHIVE_NAMES]) {
    const k = kindOf(join(dir, n));
    if (k === "other") return { ok: false };
    if (k === "file") (LIVE_NAMES.includes(n) ? live : archives).add(n);
  }
  return { ok: true, live, archives };
}

/** Read and check the live findings + triage pair: `{ok, round, verdict}` or `{ok:false, code}` (a defect code). */
function livePair(dir) {
  const f = readRegularFile(join(dir, "grill-findings.json"), "findings file", INPUT_MAX);
  if (!f.ok) return { ok: false, code: "findings-invalid" };
  const v = validate(f.bytes.toString("utf8"));
  if (!v.ok) return { ok: false, code: "findings-invalid" };
  const t = readRegularFile(join(dir, "grill-triage.json"), "triage file", INPUT_MAX);
  if (!t.ok) return { ok: false, code: "triage-invalid" };
  const sha = createHash("sha256").update(f.bytes).digest("hex");
  const r = checkTriage(t.bytes.toString("utf8"), v.doc, sha);
  if (!r.ok) return { ok: false, code: "triage-invalid" };
  return { ok: true, round: v.doc.round, verdict: r.verdict.verdict };
}

/** Resolve `<name>` to its feature directory, or null (a bad slug, or no such directory). */
function featureDir(rest, io) {
  if (rest.length !== 1 || !FEATURE_SLUG_RE.test(rest[0])) return { code: usage(io) };
  const dir = join("pharn", "features", rest[0]);
  let st;
  try {
    st = lstatSync(dir);
  } catch {
    io.stderr.write(`grill-round: feature directory not found: ${dir}\n`);
    return { code: EXIT.usage };
  }
  if (!st.isDirectory()) {
    io.stderr.write(`grill-round: not a directory: ${dir}\n`);
    return { code: EXIT.usage };
  }
  return { dir };
}

function doCurrent(rest, io) {
  const fd = featureDir(rest, io);
  if (!fd.dir) return fd.code;
  const l = list(fd.dir);
  if (!l.ok) return red(io, ["not-regular"]);
  const a = archivedRounds(l.archives);
  if (!a.ok) return red(io, a.codes);
  let binds = false;
  if (l.live.has("grill-findings.json") && l.live.has("grill-triage.json")) {
    const p = livePair(fd.dir);
    binds = p.ok && p.round === a.archived + 1;
  }
  io.stdout.write(`${JSON.stringify(currentRound(a.archived, binds))}\n`);
  return EXIT.ok;
}

/** Rename round `r`'s live files to its archives, moving back on failure. Returns null on success, or the RED exit. */
function archiveRound(dir, r, io) {
  const targets = roundArchives(r);
  const moved = [];
  for (let i = 0; i < LIVE_NAMES.length; i++) {
    try {
      renameSync(join(dir, LIVE_NAMES[i]), join(dir, targets[i]));
      moved.push(i);
    } catch {
      let back = true;
      for (const j of moved.reverse()) {
        try {
          renameSync(join(dir, targets[j]), join(dir, LIVE_NAMES[j]));
        } catch {
          back = false;
        }
      }
      if (back) return red(io, ["rename-failed"]);
      const exist = [...LIVE_NAMES, ...targets].filter((n) => kindOf(join(dir, n)) === "file");
      return red(io, ["rename-partial"], [`  exists: ${exist.join(", ")}`]);
    }
  }
  return null;
}

function doNext(rest, io) {
  const fd = featureDir(rest, io);
  if (!fd.dir) return fd.code;
  const l = list(fd.dir);
  if (!l.ok) return red(io, ["not-regular"]);
  const a = archivedRounds(l.archives);
  if (!a.ok) return red(io, a.codes);
  if (LIVE_NAMES.some((n) => !l.live.has(n))) return red(io, ["live-missing"]);
  const p = livePair(fd.dir);
  if (!p.ok) return red(io, [p.code]);
  const dest = roundArchives(p.round).filter((n) => kindOf(join(fd.dir, n)) !== "absent").length;
  const d = decideNext({ archived: a.archived, findingsRound: p.round, verdict: p.verdict, destinationsPresent: dest });
  if (d.action === "refuse") return red(io, d.codes);
  if (d.action === "cap") return EXIT.cap;
  const failed = archiveRound(fd.dir, d.archived, io);
  if (failed !== null) return failed;
  io.stdout.write(`${JSON.stringify(currentRound(d.archived, false))}\n`);
  return EXIT.ok;
}

/** Entry point; returns the exit code (never calls process.exit — the flush rule). */
export function main(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const [cmd, ...rest] = argv.slice(2);
  if (cmd === "current") return doCurrent(rest, io);
  if (cmd === "next") return doNext(rest, io);
  return usage(io);
}

if (import.meta.main) process.exitCode = main(process.argv);
