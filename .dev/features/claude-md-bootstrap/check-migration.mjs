// .dev/features/claude-md-bootstrap/check-migration.mjs — ONE-OFF, READ-ONLY verifier for `claude-md-bootstrap`.
//
// Accounts for every line of the BASE root CLAUDE.md (read from git) against the files ON DISK:
//   KEPT     — base line must appear BYTE-EXACT in the new root CLAUDE.md (line multiset);
//   MOVED    — base line must appear in its named guide, compared after trimming leading/trailing whitespace
//              (Prettier dedents a moved list continuation; nothing else is normalized);
//   DEDUPED  — base lines 107–127, retired to their owner, CONTRIBUTING.md "CHANGELOG entries" (equivalence is the
//              PLAN's table — model work, not this script's; the script only checks the owner heading exists);
//   FRAME    — blank lines and the Commands block's own opening/closing fence (replaced by one fence per entry).
// Any non-blank base line in none of these, or missing from its destination, is printed and the exit is 1.
// It also lists the root's lines that are NOT base lines (the new wording) with their byte total, which must equal
// `check-instruction-files --growth`'s `added_bytes` for CLAUDE.md.
//
// BOUND (P0): this proves the TEXT is accounted for. It never proves a reader finds a guide in time, that a moved
// sentence still reads correctly out of its old context, or that a deduplicated rule is equivalent.

import { readFileSync } from "node:fs";
import { baseLines, buildRoot, GUIDE_RANGES } from "./split.mjs";

const L = baseLines();
const disk = (p) => readFileSync(p, "utf8").replace(/\n$/, "").split("\n");
const bag = (lines, norm) => {
  const m = new Map();
  for (const l of lines) m.set(norm(l), (m.get(norm(l)) ?? 0) + 1);
  return m;
};
const exact = (s) => s;
const trim = (s) => s.trim();
const take = (m, k) => {
  const n = m.get(k) ?? 0;
  if (n < 1) return false;
  m.set(k, n - 1);
  return true;
};

const root = disk("CLAUDE.md");
const rootBag = bag(root, exact);

// KEPT: the base line numbers buildRoot() takes, recovered by identity (buildRoot returns base strings by range).
const KEPT_RANGES = [
  [1, 51],
  [86, 106],
  [134, 152],
  [163, 196],
  [1433, 1498],
  [1571, 1571],
  [1622, 1637],
  [1661, 1742],
  [1765, 1768],
  [1803, 1818],
  [1903, 1912],
];
const DEDUPED = [[107, 127]];
const FRAME = new Set([197, 1431]);

const owner = new Map(); // base line no -> [kind, file]
const add = (a, b, kind, file) => {
  for (let i = a; i <= b; i++) (owner.get(i) ?? owner.set(i, []).get(i)).push([kind, file]);
};
for (const [a, b] of KEPT_RANGES) add(a, b, "KEPT", "CLAUDE.md");
for (const [file, a, b] of GUIDE_RANGES()) add(a, b, "MOVED", `.dev/guides/${file}`);
for (const [a, b] of DEDUPED) add(a, b, "DEDUPED", "CONTRIBUTING.md");

const guideBags = new Map();
const problems = [];
const counts = { KEPT: 0, MOVED: 0, DEDUPED: 0, FRAME: 0, BLANK: 0 };
const movedBy = {};

for (let i = 1; i <= L.length; i++) {
  const line = L[i - 1];
  if (line.trim() === "") {
    counts.BLANK++;
    continue;
  }
  if (FRAME.has(i)) {
    counts.FRAME++;
    continue;
  }
  const dests = owner.get(i);
  if (!dests) {
    problems.push(`UNACCOUNTED base line ${i}: ${line.slice(0, 100)}`);
    continue;
  }
  for (const [kind, file] of dests) {
    if (kind === "KEPT") {
      if (!take(rootBag, line)) problems.push(`KEPT base line ${i} missing byte-exact from CLAUDE.md: ${line.slice(0, 100)}`);
      else counts.KEPT++;
    } else if (kind === "MOVED") {
      if (!guideBags.has(file)) guideBags.set(file, bag(disk(file), trim));
      if (!take(guideBags.get(file), trim(line))) problems.push(`MOVED base line ${i} missing from ${file}: ${line.slice(0, 100)}`);
      else {
        counts.MOVED++;
        movedBy[file] = (movedBy[file] ?? 0) + 1;
      }
    } else counts.DEDUPED++;
  }
}

if (!/^### CHANGELOG entries$/m.test(readFileSync("CONTRIBUTING.md", "utf8")))
  problems.push('owner heading "### CHANGELOG entries" not found in CONTRIBUTING.md');

// NEW root lines: root lines that are not base lines (multiset), i.e. what --growth counts.
const baseBag = bag(L, exact);
const added = [];
for (const l of root) if (!take(baseBag, l)) added.push(l);
const addedBytes = added.reduce((s, l) => s + Buffer.byteLength(l, "utf8") + 1, 0);

// Sanity: the root on disk equals what split.mjs builds (Prettier left it unchanged), so the KEPT ranges are the
// ranges split.mjs used.
const rebuilt = buildRoot(L);
const rootMatchesBuild = rebuilt.length === root.length && rebuilt.every((l, i) => l === root[i]);

console.log(
  JSON.stringify(
    {
      base_lines: L.length,
      counts,
      moved_by_guide: movedBy,
      root_matches_split: rootMatchesBuild,
      new_root_lines: added.length,
      new_root_bytes: addedBytes,
      problems,
    },
    null,
    2
  )
);
process.exitCode = problems.length === 0 && rootMatchesBuild ? 0 : 1;
