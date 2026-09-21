#!/usr/bin/env node
// pharn/floor/render-review-assignments.mjs — the deterministic EMITTER for a /pharn-review assignment
// record (CONSTITUTION P0/P5/P7).
//
// PURPOSE. /pharn-review resolves a review TARGET, reads lens MEMBERSHIP from count-lenses.mjs, and cuts
// each lens a SLICE via the pharn/floor/lens-scanner-map.json scanner-prefilter. Until this file, none of
// that was recorded anywhere: the emitted artifacts (per-lens findings.json, the merged findings.json,
// REVIEW.md) are BYTE-IDENTICAL between a run that spawned 22 lenses over 6 files and one that spawned 1
// lens over 1 file. Measured, not argued — two runs differing 6x in target size produced the same sha256
// (.dev/features/coverage-record/PLAN.md, "The triggering failure"). This emitter writes that missing
// record; pharn/floor/check-review-assignments.mjs validates it.
//
// WHAT THE RECORD CLAIMS, AND THE BOUND IS THE WHOLE POINT (P0). Each entry says
// "this SLICE was ASSIGNED to this LENS". It NEVER says a lens READ, reviewed, covered or examined
// anything. Nothing on the floor can reach that: spawning a subagent and honoring a slice are ADVISORY
// orchestration (.claude/commands/pharn-review.md — its Guarantee audit already strikes "each reads only
// its slice"). A reader who upgrades "assigned" to "reviewed" has reintroduced the exact disease this
// repo exists to prevent. The field names are chosen to resist that upgrade: `assignments`, never
// `coverage`.
//
// WHY AN EMITTER AND NOT MODEL PROSE (the design fork, recorded). Every field here is mechanically
// derivable: the target from a deterministic CLI/git resolution, membership from count-lenses.mjs, the
// slices from the scanners' own regex verdicts. Routing a 100%-derivable fact through a model and
// checking it afterward would leave the checker certifying only that the record agrees with ITSELF
// (lessons-learned L43 — a consistency check over stores of one fact certifies their agreement, never
// the fact). Emitting deterministically puts the slice values on the floor AT EMISSION instead.
//
// TIMING IS LOAD-BEARING (L42). The scanner verdicts are captured HERE, at the moment of assignment. The
// checker deliberately does NOT re-run the scanners: re-execution would answer "would this scanner hit
// NOW", not "was this slice assigned THEN", and on a target whose files changed since the review that is
// a different question with a confidently wrong answer.
//
// FAIL-CLOSED, BOTH EDGES (P5 — the terminal fallback is refuse/ask, never a guess):
//   - No resolvable target -> exit non-zero, WRITE NOTHING. /pharn-review's Step 1 third branch is "ask
//     the human", which a deterministic emitter structurally cannot do. An empty-target record is not
//     the honest degradation — a record is a claim, and "I could not resolve a target" is not one.
//   - A registered lens absent from lens-scanner-map.json -> exit non-zero, WRITE NOTHING. It never
//     invents a `basis`. Reachable only once lens-scanner-map.test.mjs's consistency pin has already
//     failed, so refusing is the honest response rather than papering over it.
// Both edges are exercised by tests, because an unexercised fail-closed path is the L41 blind spot.
//
// Usage:  node pharn/floor/render-review-assignments.mjs <name> [--base <dir>] [--repo <dir>]
//                                                        [--target <path>]...
//   <name>      the feature slug; the record lands at <base>/<name>/assignments.json
//   --base      default "pharn/features" (ONE definition — L41: a default duplicated at the CLI entry
//               point and in the renderer is how the 5.0.0 relocation shipped a stale production path)
//   --repo      the repo to scan (default ".")
//   --target    a target path, repeatable. Omitted -> the git merge-base diff, exactly as
//               .claude/commands/pharn-review.md Step 1 branch 2 prescribes.
// Output: writes <base>/<name>/assignments.json (2-space JSON + trailing newline, deterministic);
//         prints {"lenses":<int>,"target":<int>,"unassigned_scanner_bound":<int>} on stdout; exit 0.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, basename, dirname, sep } from "node:path";

const DEFAULT_BASE = "pharn/features";
const SCHEMA = "review-assignments/v1";

// The two `basis` values. A CLOSED set, exported so the checker and the tests range over THIS
// enumeration rather than each re-deriving a list (lessons-learned L29: when a remedy is quantified over
// a set, the enumeration is the deliverable).
export const BASIS_ENUM = Object.freeze(["scanner-bound", "whole-target-fallback"]);

// A lens's NAME is its directory basename: count-lenses.mjs emits
// `pharn/pharn-review/<lens>/<lens>.md`, and lens-scanner-map.json is keyed on `<lens>`.
export function lensNameFromPath(lensPath) {
  return basename(dirname(lensPath));
}

export function readScannerMap(repoDir) {
  const p = join(repoDir, "pharn/floor/lens-scanner-map.json");
  const parsed = JSON.parse(readFileSync(p, "utf8"));
  if (!parsed || typeof parsed.scanners !== "object" || parsed.scanners === null) {
    throw new Error(`lens-scanner-map.json has no \`scanners\` object (${p})`);
  }
  return parsed.scanners;
}

export function readRegisteredLenses(repoDir) {
  const out = execFileSync("node", [join(repoDir, "pharn/floor/count-lenses.mjs"), repoDir], {
    encoding: "utf8",
  });
  const parsed = JSON.parse(out);
  return parsed.lenses.map(lensNameFromPath).sort();
}

// Expand a target argument to the set of FILES under it, repo-relative and POSIX-separated. A directory
// expands to the files beneath it, mirroring pharn-review.md Step 1 ("dirs expand to the files under
// them"); .git and node_modules are never review targets.
function expandTarget(repoDir, entry) {
  const abs = join(repoDir, entry);
  if (!existsSync(abs)) return [];
  const st = statSync(abs);
  if (!st.isDirectory()) return [relative(repoDir, abs).split(sep).join("/")];
  const acc = [];
  const walk = (dir) => {
    for (const nm of readdirSync(dir)) {
      if (nm === ".git" || nm === "node_modules") continue;
      const p = join(dir, nm);
      let s;
      try {
        s = statSync(p);
      } catch {
        continue;
      }
      if (s.isDirectory()) walk(p);
      else acc.push(relative(repoDir, p).split(sep).join("/"));
    }
  };
  walk(abs);
  return acc;
}

// pharn-review.md Step 1 branch 2, verbatim in intent: the files changed vs the merge-base with the
// default branch. Returns [] when this is not a git repo or the command fails — the caller turns an empty
// resolution into a REFUSAL, never into an empty-target record.
function gitDiffTarget(repoDir) {
  let base;
  try {
    base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
      cwd: repoDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    try {
      base = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repoDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return [];
    }
  }
  try {
    const out = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", base], {
      cwd: repoDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function resolveTarget(repoDir, explicitTargets) {
  const raw =
    explicitTargets && explicitTargets.length
      ? explicitTargets.flatMap((t) => expandTarget(repoDir, t))
      : gitDiffTarget(repoDir).filter((f) => existsSync(join(repoDir, f)));
  return [...new Set(raw)].sort();
}

// Run one scanner over one file. A scanner prints {"found":<bool>,...} and exits 0 on a clean read.
//
// A THROW IS NOT A MISS, and conflating the two was a real defect (surfaced by this increment's own
// review). A scanner that fails to run — unreadable path, non-zero exit, unparseable stdout — used to be
// recorded as "no hit", which made a WHOLLY BROKEN scanner indistinguishable from a clean target: its
// files simply appeared in unassigned_scanner_bound with nothing saying why. The slice then meant "the
// scanner's verdict OR silence", which is exactly the kind of widened claim this record exists to stop.
// So the two outcomes are now distinct: `hit` is the verdict, `errored` is the absence of one, and an
// errored file is reported in the record rather than folded into a miss. The emit is NOT refused — a
// scanner erroring on one odd file should not deny the whole record — but the silence is gone.
function scannerVerdict(repoDir, scannerFile, targetFile) {
  let out;
  try {
    out = execFileSync("node", [join(repoDir, "pharn/floor", scannerFile), join(repoDir, targetFile)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return { errored: true, hit: false };
  }
  try {
    const parsed = JSON.parse(out);
    return { errored: false, hit: parsed.found === true || (Array.isArray(parsed.hits) && parsed.hits.length > 0) };
  } catch {
    return { errored: true, hit: false };
  }
}

// `scannerErrors` is an OUT-parameter: computeAssignments pushes {lens, file} for every scanner
// invocation that failed to produce a verdict, so the caller can record them at the top level.
export function computeAssignments(repoDir, target, lenses, scanners, scannerErrors = []) {
  const assignments = [];
  for (const lens of lenses) {
    // Own-property test, never `||`/`??` — an inherited prototype member would leak silently (L15).
    if (!Object.prototype.hasOwnProperty.call(scanners, lens)) {
      throw new Error(
        `registered lens \`${lens}\` has no entry in pharn/floor/lens-scanner-map.json — refusing to ` +
          `invent a basis. Fix the map (lens-scanner-map.test.mjs pins it against disk) and re-run.`
      );
    }
    const scanner = scanners[lens];
    if (scanner === null) {
      // The scanner-less lenses: no deterministic prefilter exists, so the slice is the whole target.
      // This is the WIDEST nominal assignment on the WEAKEST basis, and naming it `whole-target-fallback`
      // rather than folding it into one undifferentiated slice list is what keeps that visible.
      assignments.push({ lens, basis: "whole-target-fallback", scanner: null, slice: [...target] });
      continue;
    }
    const slice = [];
    for (const f of target) {
      const v = scannerVerdict(repoDir, scanner, f);
      if (v.errored) scannerErrors.push({ lens, file: f });
      else if (v.hit) slice.push(f);
    }
    assignments.push({ lens, basis: "scanner-bound", scanner, slice });
  }
  assignments.sort((a, b) => (a.lens < b.lens ? -1 : a.lens > b.lens ? 1 : 0));
  return assignments;
}

// Target files no SCANNER-BOUND lens reached. Deliberately NOT "files assigned to no lens": the four
// scanner-less lenses take the whole target, so that set is empty BY CONSTRUCTION and would certify
// nothing (lessons-learned L34 — a per-item assertion set says nothing over an empty domain; here the
// domain would have been empty for every run forever). This field measures what no deterministic
// prefilter reached, which is the quantity a reader actually needs.
export function unassignedScannerBound(target, assignments) {
  const covered = new Set();
  for (const a of assignments) {
    if (a.basis === "scanner-bound") for (const f of a.slice) covered.add(f);
  }
  return target.filter((f) => !covered.has(f));
}

export function renderAssignments(name, opts = {}) {
  const repoDir = opts.repo ?? ".";
  const target = resolveTarget(repoDir, opts.target);
  if (target.length === 0) {
    return {
      ok: false,
      reason:
        "no resolvable review target (no --target paths, and the git merge-base diff yielded nothing). " +
        "Refusing to emit an empty-target record: /pharn-review Step 1's third branch is ASK THE HUMAN, " +
        "which this emitter structurally cannot do (P5).",
    };
  }
  const scanners = readScannerMap(repoDir);
  const lenses = readRegisteredLenses(repoDir);
  const scannerErrors = [];
  let assignments;
  try {
    assignments = computeAssignments(repoDir, target, lenses, scanners, scannerErrors);
  } catch (e) {
    return { ok: false, reason: e.message };
  }
  scannerErrors.sort((a, b) => (a.lens + a.file < b.lens + b.file ? -1 : a.lens + a.file > b.lens + b.file ? 1 : 0));
  const record = {
    schema: SCHEMA,
    feature: name,
    generated_by: "pharn/floor/render-review-assignments.mjs",
    target,
    lenses_registered: lenses,
    assignments,
    unassigned_scanner_bound: unassignedScannerBound(target, assignments),
    // Every (lens, file) where the scanner failed to produce a verdict. Empty is the normal state; a
    // non-empty list means those files got NO deterministic prefilter from that lens, which is a
    // different fact from "the scanner looked and found nothing" and must not read as one.
    scanner_errors: scannerErrors,
  };
  return { ok: true, record };
}

function flag(args, nm) {
  const i = args.indexOf(nm);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

function flagAll(args, nm) {
  const out = [];
  for (let i = 0; i < args.length; i++) if (args[i] === nm && i + 1 < args.length) out.push(args[i + 1]);
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const name = argv[0];
  if (!name || name.startsWith("--")) {
    process.stderr.write(
      "usage: node pharn/floor/render-review-assignments.mjs <name> [--base <dir>] [--repo <dir>] [--target <path>]...\n"
    );
    process.exit(1);
  }
  // No `?? DEFAULT_BASE` here: the default lives in ONE place (the destructure below), so a relocation
  // cannot update one copy and leave the production path stale (L41).
  const opts = { repo: flag(argv, "--repo"), target: flagAll(argv, "--target") };
  const result = renderAssignments(name, { ...opts, repo: opts.repo ?? "." });
  if (!result.ok) {
    process.stderr.write(`RED — ${result.reason}\n`);
    process.exit(1);
  }
  const base = flag(argv, "--base") ?? DEFAULT_BASE;
  const outDir = join(opts.repo ?? ".", base, name);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "assignments.json"), JSON.stringify(result.record, null, 2) + "\n");
  process.stdout.write(
    JSON.stringify({
      lenses: result.record.lenses_registered.length,
      target: result.record.target.length,
      unassigned_scanner_bound: result.record.unassigned_scanner_bound.length,
    }) + "\n"
  );
  process.exit(0);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare, which silently no-ops on spaced/non-ASCII/symlinked paths.
if (import.meta.main) {
  main();
}
