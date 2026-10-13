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
// ONE SPAWN PER SCANNER, UNDER A TIME LIMIT (review-fanout, review finding CTX-3). Each mapped scanner is
// spawned ONCE per review in its `--files` batch mode (pharn/floor/code-scanner-cli.mjs), the target list on
// its stdin. It used to be spawned once per (lens × file): 18 × N node processes, measured ≈59 min for this
// repo's 2,908 files under load and hours for a 24k-file tree (.dev/features/review-fanout/MEASUREMENTS.md).
// Each spawn gets SCANNER_TIMEOUT_BASE_MS + SCANNER_TIMEOUT_MS_PER_KIB × the target's KiB. The rate is several
// times the slowest scanner's measured linear cost, so the limit exists to stop a HANG — a pathological line
// in a scanner whose regex backtracks (TST-2/TST-3) — not to cap linear work. A spawn that times out or fails
// in any other way is recorded in `scanner_failures` (reason `timeout` | `error`), and every target file goes
// into `scanner_errors` for that lens, so none of them reaches its slice: no verdict was obtained. The command
// then hands that lens its errored files to review (fail toward reviewing). The bound: the limits of the
// scanners that hang ADD UP, because the spawns run one after another.
//
// WHAT A DIRECTORY TARGET EXPANDS TO (review-fanout). Inside a git work tree — asked from the named directory, so a
// nested repository or a submodule answers for itself — the files `git ls-files --cached --others
// --exclude-standard` lists for it; what that repository's ignore rules drop is listed in `skipped` as `git-ignored`
// (an ignored directory once, with its trailing `/`). Outside one (no git, or a directory git refuses), a
// `readdirSync` walk. A path under a `.git` or `node_modules` directory BELOW the named one is dropped and listed as
// `excluded-name`. The named directory itself is followed as named; nothing below it that is a symlink is followed.
// Every DISCOVERED file — from a directory, and from the merge-base diff — is then judged on the path itself
// (`lstatSync`, never a follow-call, L59): not a regular file → `not-a-regular-file`; larger than
// MAX_TARGET_FILE_BYTES → `over-size-cap`; a NUL byte in its first BINARY_SNIFF_BYTES → `binary` (git's
// content heuristic and window; git's `.gitattributes` are NOT read, so a file an attribute marks binary, or
// marks text despite a NUL, can be judged differently here). A path the user names as a FILE is kept as named,
// unfiltered: that is how a file the rules above would drop gets reviewed. The rules are git's ignore rules and a
// byte sniff, not a judgment that a skipped file holds nothing worth reviewing.
//
// NOT DETERMINISTIC IN ONE RESPECT, stated because the paragraphs above call every field derivable: the per-spawn
// time limit is wall-clock, so on a loaded machine a scanner that finishes on a quiet one can time out, and the same
// tree can then yield a different record. The difference always falls toward review (`scanner_failures`, every file
// errored for that lens), never toward a narrower slice.
//
// FAIL-CLOSED, BOTH EDGES (P5 — the terminal fallback is refuse/ask, never a guess):
//   - No resolvable target -> exit non-zero, WRITE NOTHING. /pharn-review's Step 1 third branch is "ask
//     the human", which a deterministic emitter structurally cannot do. An empty-target record is not
//     the honest degradation — a record is a claim, and "I could not resolve a target" is not one. When
//     files WERE found but every one was skipped, the refusal says so, by reason, and names the override.
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
//         prints {"lenses":<int>,"target":<int>,"skipped":<int>,"unassigned_scanner_bound":<int>,
//         "scanner_failures":<int>} on stdout, one stderr line per scanner failure; exit 0.

import "./runtime-floor.mjs";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  lstatSync,
  readdirSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, relative, basename, dirname, sep } from "node:path";

const DEFAULT_BASE = "pharn/features";
const SCHEMA = "review-assignments/v1";

// The two `basis` values. A CLOSED set, exported so the checker and the tests range over THIS
// enumeration rather than each re-deriving a list (lessons-learned L29: when a remedy is quantified over
// a set, the enumeration is the deliverable).
export const BASIS_ENUM = Object.freeze(["scanner-bound", "whole-target-fallback"]);

// Why a discovered path is not in the target. CLOSED; the checker imports it (I8).
export const SKIP_REASON_ENUM = Object.freeze(["binary", "excluded-name", "git-ignored", "not-a-regular-file", "over-size-cap"]);

// Why a scanner's one spawn produced no usable batch. CLOSED; the checker imports it (I9).
export const SCANNER_FAILURE_ENUM = Object.freeze(["error", "timeout"]);

// A discovered file larger than this is skipped (`over-size-cap`). 512 KiB, measured against this repo: it drops
// the 836 KB CHANGELOG.md (prose) and keeps the largest code file (a 347 KB test). A lens reads its files whole.
export const MAX_TARGET_FILE_BYTES = 512 * 1024;

// A discovered file with a NUL byte in its first this-many bytes is skipped (`binary`) — git's content heuristic and
// its window (FIRST_FEW_BYTES in git's xdiff). `.gitattributes` are not read, so it can disagree with git there.
export const BINARY_SNIFF_BYTES = 8000;

// The per-spawn time limit: BASE + PER_KIB × the target's size in KiB. Measured on 2026-10-13: the slowest scanner
// (scan-code-n-plus-one) cost ≈1 ms per KB of input and the 18 together ≈5.6 ms per KB, so 5 ms per KiB is several
// times the slowest one's linear cost; the 30 s base covers process start and a small target. Re-derived from the
// build measurement, never carried from an estimate (L24) — see .dev/features/review-fanout/MEASUREMENTS.md.
export const SCANNER_TIMEOUT_BASE_MS = 30_000;
export const SCANNER_TIMEOUT_MS_PER_KIB = 5;

// The directory names never reviewed, in either expansion route — today's rule, now listed in `skipped`.
const EXCLUDED_NAMES = Object.freeze([".git", "node_modules"]);

// The list separator — built from its code so this source stays printable ASCII (source-nul-guard.test.mjs).
const NUL = String.fromCharCode(0);

// One output ceiling for every child this module reads: git's listings and the scanners' batch documents. 256 MiB
// is the ceiling gitDiffTarget already used (stage-git-maxbuffer, 6.28.3); past it the call fails, and the failure
// is reported, never read as an empty result.
const MAX_BUFFER = 1 << 28;

/** The time limit for one scanner spawn over a target of `targetBytes` bytes. */
export function scannerTimeoutMs(targetBytes) {
  return SCANNER_TIMEOUT_BASE_MS + SCANNER_TIMEOUT_MS_PER_KIB * Math.ceil(targetBytes / 1024);
}

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

const toPosix = (p) => p.split(sep).join("/");

// The listed form of the first `.git` / `node_modules` segment of a path RELATIVE TO THE NAMED DIRECTORY — the
// directory, with its trailing `/` — or null when the path has none. Only segments BELOW the named directory count:
// a directory the user names is reviewed as named, even one called `node_modules`. A last segment so named is the
// entry itself (a worktree's `.git` FILE), listed without the slash.
function excludedPrefix(below) {
  const segs = below.split("/");
  for (let i = 0; i < segs.length; i++) {
    if (EXCLUDED_NAMES.includes(segs[i])) return segs.slice(0, i + 1).join("/") + (i < segs.length - 1 ? "/" : "");
  }
  return null;
}

// Is `dir` inside a git work tree? Asked FROM the named directory, so a nested repository or a submodule answers for
// itself. A failure of the question itself — git absent, not a repository — is "no", which lands on the readdir
// walk: never an empty or a crashed resolution.
function insideGitWorkTree(dir) {
  try {
    const out = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim() === "true";
  } catch {
    return false;
  }
}

// `git ls-files -z <args>` run FROM `cwd`, as paths relative to it. `--literal-pathspecs`: no pathspec is ever read
// as a glob. Throws on any git failure; the caller falls back to the walk.
function gitListFiles(cwd, args) {
  const out = execFileSync("git", ["--literal-pathspecs", "ls-files", "-z", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: MAX_BUFFER,
  });
  return out.split(NUL).filter(Boolean);
}

// Expand a DIRECTORY target to the repo-relative POSIX paths under it, pushing what the expansion itself drops into
// `skipped` (git-ignored, excluded-name). The files returned are still to be classified (classifyPath).
//
// git runs FROM the named directory with the pathspec `.`, so the repository that answers is the one that owns that
// directory: a nested repository or a submodule lists its own files under its own ignore rules. Asked from the outer
// repository's root instead, git lists nothing for a path inside a nested repository, and the files vanished from
// both `target` and `skipped` (found by this increment's review). The named directory itself is followed as named,
// like a named file; nothing BELOW it that is a symlink is followed (classifyPath lists such a path).
function expandDirectory(repoDir, entry, skipped) {
  const absEntry = join(repoDir, entry);
  const entryRel = toPosix(relative(repoDir, absEntry));
  const fromEntry = (p) => (entryRel === "" ? p : `${entryRel}/${p}`);
  const fromGit = (() => {
    if (!insideGitWorkTree(absEntry)) return null;
    try {
      return {
        files: gitListFiles(absEntry, ["--cached", "--others", "--exclude-standard", "--", "."]),
        ignored: gitListFiles(absEntry, ["--others", "--ignored", "--exclude-standard", "--directory", "--", "."]),
      };
    } catch {
      return null; // git refused the directory — the walk below decides it
    }
  })();
  const kept = [];
  if (fromGit !== null) {
    for (const p of fromGit.ignored) {
      const prefix = excludedPrefix(p);
      skipped.push(prefix === null ? { path: fromEntry(p), reason: "git-ignored" } : { path: fromEntry(prefix), reason: "excluded-name" });
    }
    for (const p of fromGit.files) {
      const prefix = excludedPrefix(p);
      if (prefix === null) kept.push(fromEntry(p));
      else skipped.push({ path: fromEntry(prefix), reason: "excluded-name" });
    }
    return kept;
  }
  const walk = (abs) => {
    let names;
    try {
      names = readdirSync(abs);
    } catch {
      return;
    }
    for (const nm of names) {
      const p = join(abs, nm);
      const rel = toPosix(relative(repoDir, p));
      let st;
      try {
        st = lstatSync(p);
      } catch {
        continue;
      }
      if (EXCLUDED_NAMES.includes(nm)) skipped.push({ path: rel + (st.isDirectory() ? "/" : ""), reason: "excluded-name" });
      else if (st.isDirectory()) walk(p);
      else kept.push(rel); // a symlink is an entry here, never followed — classifyPath lists it
    }
  };
  walk(absEntry);
  return kept;
}

// Does the file hold a NUL byte in its first BINARY_SNIFF_BYTES? A file that cannot be opened reads as not binary:
// it is kept, and the scanners then report it as an error for every lens (fail toward reviewing).
function looksBinary(abs) {
  let fd;
  try {
    fd = openSync(abs, "r");
    const buf = Buffer.alloc(BINARY_SNIFF_BYTES);
    const n = readSync(fd, buf, 0, BINARY_SNIFF_BYTES, 0);
    return buf.subarray(0, n).includes(0);
  } catch {
    return false;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

// Judge one DISCOVERED path: null to keep it, "gone" when nothing is there any more (dropped unlisted, as the diff
// branch always did), else the SKIP_REASON_ENUM member it is listed under. lstat, never stat: the question is what
// the PATH is, and a follow-call answers for a symlink's target (L59).
function classifyPath(repoDir, rel) {
  const abs = join(repoDir, rel);
  let st;
  try {
    st = lstatSync(abs);
  } catch {
    return "gone";
  }
  if (!st.isFile()) return "not-a-regular-file";
  if (st.size > MAX_TARGET_FILE_BYTES) return "over-size-cap";
  if (looksBinary(abs)) return "binary";
  return null;
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
  // An explicit output ceiling (stage-git-maxbuffer, 6.28.3). At node's 1 MiB default a diff naming more than 1 MiB of
  // paths failed with ENOBUFS, and the catch below turned that into an empty target, so the emitter refused with "the
  // git merge-base diff yielded nothing" over a diff that yielded plenty (measured: 0 of 1,710 changed paths). 256 MiB
  // is the ceiling stage-runtime.mjs's gitSync and reconcile-baseline.mjs's enumerate() use — each module's own value,
  // bound to neither. Past it, or on another git failure, the catch still reads as an empty diff (the documented
  // "not a git repo" branch), so the refusal can still name the wrong cause.
  try {
    const out = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", base], {
      cwd: repoDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: MAX_BUFFER,
    });
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const byPathThenReason = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : 0);

/**
 * Resolve the review target. Returns `{ target, skipped }`: `target` the sorted, de-duplicated repo-relative paths a
 * lens may be assigned; `skipped` the sorted `{path, reason}` entries the resolution dropped (none of them in
 * `target` — a path named explicitly as a file wins over the same path skipped under a named directory).
 */
export function resolveTarget(repoDir, explicitTargets) {
  const kept = new Set();
  const skipped = [];
  const consider = (rel) => {
    const verdict = classifyPath(repoDir, rel);
    if (verdict === null) kept.add(rel);
    else if (verdict !== "gone") skipped.push({ path: rel, reason: verdict });
  };
  if (explicitTargets && explicitTargets.length) {
    for (const entry of explicitTargets) {
      const abs = join(repoDir, entry);
      if (!existsSync(abs)) continue;
      if (statSync(abs).isDirectory()) {
        for (const rel of expandDirectory(repoDir, entry, skipped)) consider(rel);
      } else {
        kept.add(toPosix(relative(repoDir, abs))); // named as a file: kept as named, unfiltered
      }
    }
  } else {
    for (const rel of gitDiffTarget(repoDir)) consider(rel);
  }
  const target = [...kept].sort();
  const seen = new Set();
  const listed = [];
  for (const s of skipped) {
    const key = s.path + NUL + s.reason;
    if (kept.has(s.path) || seen.has(key)) continue;
    seen.add(key);
    listed.push(s);
  }
  return { target, skipped: listed.sort(byPathThenReason) };
}

/** The sum of the target files' sizes in bytes (a file that cannot be stat'ed counts 0). */
function targetBytes(repoDir, target) {
  let total = 0;
  for (const f of target) {
    try {
      total += statSync(join(repoDir, f)).size;
    } catch {
      // counted as 0: the scanner reports it as an error, which the record already carries
    }
  }
  return total;
}

// Run ONE scanner over the WHOLE target in one process (`--files -`, the list on stdin) and map its batch document
// back to the target, entry by entry.
//
// A THROW IS NOT A MISS, and conflating the two was a real defect (surfaced by the coverage-record increment's own
// review): a scanner that fails to produce a verdict for a file used to be recorded as "no hit", which made a WHOLLY
// BROKEN scanner indistinguishable from a clean target. So the outcomes stay distinct: `hit` is the verdict,
// `errored` is the absence of one. Since review-fanout there are two levels of failure:
//   - the WHOLE spawn — it timed out, could not start, exited non-zero or on a signal, overflowed MAX_BUFFER, or
//     printed something that is not one `{"results":[…]}` entry per path sent, each naming the path sent. Returns
//     `{ failure: <SCANNER_FAILURE_ENUM member> }`: no file got a verdict.
//   - ONE entry — the scanner could not read that file (`{"file","error"}`), exactly as a per-file spawn exiting 1
//     always was. That file alone is `errored`.
function runScannerBatch(repoDir, scannerFile, target, timeoutMs) {
  const sent = target.map((f) => join(repoDir, f));
  const r = spawnSync(process.execPath, [join(repoDir, "pharn/floor", scannerFile), "--files", "-"], {
    input: sent.join(NUL),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
    timeout: timeoutMs,
    maxBuffer: MAX_BUFFER,
  });
  if (r.error && r.error.code === "ETIMEDOUT") return { failure: "timeout", detail: `no result within ${timeoutMs} ms` };
  if (r.error) return { failure: "error", detail: `spawn failed (${r.error.code ?? "unknown"})` };
  if (r.status !== 0) return { failure: "error", detail: r.signal ? `killed by ${r.signal}` : `exit ${r.status}` };
  let doc;
  try {
    doc = JSON.parse(r.stdout);
  } catch {
    return { failure: "error", detail: "output is not JSON" };
  }
  if (!doc || !Array.isArray(doc.results) || doc.results.length !== sent.length) {
    return { failure: "error", detail: "output does not hold one result per path sent" };
  }
  const verdicts = [];
  for (let i = 0; i < sent.length; i++) {
    const e = doc.results[i];
    if (!e || typeof e !== "object" || e.file !== sent[i]) return { failure: "error", detail: `result ${i} names another path` };
    if (typeof e.error === "string") verdicts.push({ errored: true, hit: false });
    else verdicts.push({ errored: false, hit: e.found === true || (Array.isArray(e.hits) && e.hits.length > 0) });
  }
  return { verdicts };
}

// `scannerErrors` and `scannerFailures` are OUT-parameters: every (lens, file) that got no verdict, and every lens
// whose ONE spawn failed ({lens, scanner, reason, detail} — `detail` is for the stderr line, never the record).
// `options.timeoutMs` overrides the per-spawn limit (tests); the default is scannerTimeoutMs over the target's bytes.
export function computeAssignments(repoDir, target, lenses, scanners, scannerErrors = [], scannerFailures = [], options = {}) {
  const timeoutMs = options.timeoutMs ?? scannerTimeoutMs(targetBytes(repoDir, target));
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
    if (target.length > 0) {
      const batch = runScannerBatch(repoDir, scanner, target, timeoutMs);
      if (batch.failure !== undefined) {
        scannerFailures.push({ lens, scanner, reason: batch.failure, detail: batch.detail });
        for (const f of target) scannerErrors.push({ lens, file: f });
      } else {
        target.forEach((f, i) => {
          if (batch.verdicts[i].errored) scannerErrors.push({ lens, file: f });
          else if (batch.verdicts[i].hit) slice.push(f);
        });
      }
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

// The refusal when nothing resolved. When files WERE found and every one was skipped, it says so by reason and
// names the override, so the person who named a directory is not left with "nothing found".
function emptyTargetReason(skipped) {
  const refusal =
    "Refusing to emit an empty-target record: /pharn-review Step 1's third branch is ASK THE HUMAN, " +
    "which this emitter structurally cannot do (P5).";
  if (skipped.length === 0) {
    return `no resolvable review target (no --target paths, and the git merge-base diff yielded nothing). ${refusal}`;
  }
  const counts = SKIP_REASON_ENUM.map((r) => [r, skipped.filter((s) => s.reason === r).length]).filter(([, n]) => n > 0);
  return (
    `no resolvable review target: every path found was skipped (${counts.map(([r, n]) => `${n} ${r}`).join(", ")}). ` +
    `Name a file with --target to review it as named, or ask the human for another target. ${refusal}`
  );
}

export function renderAssignments(name, opts = {}) {
  const repoDir = opts.repo ?? ".";
  const { target, skipped } = resolveTarget(repoDir, opts.target);
  if (target.length === 0) return { ok: false, reason: emptyTargetReason(skipped) };
  const scanners = readScannerMap(repoDir);
  const lenses = readRegisteredLenses(repoDir);
  const scannerErrors = [];
  const failures = [];
  let assignments;
  try {
    assignments = computeAssignments(repoDir, target, lenses, scanners, scannerErrors, failures, { timeoutMs: opts.timeoutMs });
  } catch (e) {
    return { ok: false, reason: e.message };
  }
  scannerErrors.sort((a, b) => (a.lens + a.file < b.lens + b.file ? -1 : a.lens + a.file > b.lens + b.file ? 1 : 0));
  failures.sort((a, b) => (a.lens < b.lens ? -1 : a.lens > b.lens ? 1 : 0));
  const record = {
    schema: SCHEMA,
    feature: name,
    generated_by: "pharn/floor/render-review-assignments.mjs",
    target,
    // Every path the resolution judged and did not assign, with why (SKIP_REASON_ENUM). Empty is the normal state
    // for a diff of source files; a directory target usually lists its ignored directories here. NOT listed: a path
    // the merge-base diff names that no longer exists, and one `git diff --name-only` prints quoted (a non-ASCII
    // name) — that listing is newline-split, as before this change, so such a path never reaches the judging.
    skipped,
    lenses_registered: lenses,
    assignments,
    unassigned_scanner_bound: unassignedScannerBound(target, assignments),
    // Every (lens, file) where the scanner failed to produce a verdict. Empty is the normal state; a
    // non-empty list means those files got NO deterministic prefilter from that lens, which is a
    // different fact from "the scanner looked and found nothing" and must not read as one.
    scanner_errors: scannerErrors,
    // Every lens whose ONE scanner spawn produced no usable batch, and why (SCANNER_FAILURE_ENUM). Each such lens
    // has an empty slice and every target file in scanner_errors.
    scanner_failures: failures.map(({ lens, scanner, reason }) => ({ lens, scanner, reason })),
  };
  return { ok: true, record, failureDetails: failures };
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
  for (const f of result.failureDetails) {
    process.stderr.write(
      `render-review-assignments: scanner ${f.scanner} (lens ${f.lens}) — ${f.reason}: ${f.detail}. ` +
        `Its files are recorded in scanner_errors and go to the lens for review.\n`
    );
  }
  process.stdout.write(
    JSON.stringify({
      lenses: result.record.lenses_registered.length,
      target: result.record.target.length,
      skipped: result.record.skipped.length,
      unassigned_scanner_bound: result.record.unassigned_scanner_bound.length,
      scanner_failures: result.record.scanner_failures.length,
    }) + "\n"
  );
  process.exit(0);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare, which silently no-ops on spaced/non-ASCII/symlinked paths.
if (import.meta.main) {
  main();
}
