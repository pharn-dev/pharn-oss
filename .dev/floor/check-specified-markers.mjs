#!/usr/bin/env node
// .dev/floor/check-specified-markers.mjs — bind PHARN's "specified; ships with the guarded surface"
// annotations to reality, in BOTH drift directions.
//
// Build apparatus, NOT product surface: it guards PHARN's OWN governing docs, and a user's install has
// no reason to check PHARN's annotations. It is not a Capability (no `role:`), ships to nobody, and
// drives no SKILLS_VERSION bump. The dependency may only point .dev/ -> pharn/, never the reverse.
//
// Floor primitive (ARCHITECTURE §2): #3 (enum / regex — here, set membership by file EXISTENCE and by
// exact SUBSTRING presence, plus one regex for the direction-3 sweep). No LLM, no classification, no
// heuristics, no network. One child process: the sweep asks `git ls-files` which files to scan.
//
// WHY IT EXISTS (P7 — a real failure, not a hypothetical). The four trusted docs asserted, in the
// present tense, floor primitives that do not exist as running checks: a `pre-egress` hook (no
// .claude/hooks/*egress* file), the fix #5 archetype-maps agreement (validate.mjs CHECK 7 is
// CONDITIONAL and no manifest exists, so it has never fired), and `/pharn-estimate` (no such command).
// pharn/THREAT-MODEL.md even carried `_Closed._` on fix #5. That is the P0 disease — "written in the contract"
// mistaken for "therefore guaranteed" — reproduced inside the documents that DEFINE it, and NOTHING
// DETECTED IT: the three trusted docs are in .prettierignore AND excluded by name in
// .markdownlint-cli2.jsonc, and no floor checker reads their prose. The `trusted-doc-accuracy` (F7)
// increment corrected the sites by hand. This checker exists because that correction's only remaining
// remedy was "remember to update the docs", which is exactly the remedy-class
// .dev/memory-bank/lessons-learned.md L20 says WILL recur — the second occurrence being the trigger to
// give the class a floor check rather than another reminder.
//
// THE TWO DIRECTIONS IT CLOSES.
//   1. THE PRIMITIVE SHIPS, THE MARKERS REMAIN.  Someone builds the pre-egress hook. The docs still say
//      "specified; ships with the guarded surface", now UNDERSTATING a live protection. RED, naming
//      every site to update. This is the load-bearing direction: it fires exactly when the repo gets
//      BETTER, which is precisely when nobody is looking for a doc bug.
//   2. A MARKER IS DELETED, THE PRIMITIVE IS STILL ABSENT.  The doc silently returns to overclaiming —
//      the original F7 defect. RED, naming the file and the missing marker.
//   3. A NEW ANNOTATION NOBODY REGISTERED (the marker sweep, `marker_sweep` in the manifest).  Someone
//      writes a fresh "specified; ships with the guarded surface" hedge and never adds a site, so
//      directions 1 and 2 never look at it: when its primitive ships, the hedge silently understates;
//      when someone deletes it, nothing notices. The sweep matches the phrase on every file git would
//      commit (`git ls-files --cached --others --exclude-standard`), whitespace- and case-tolerant so a
//      re-wrapped or re-cased hedge is still seen, and REDs each hit that does not lie wholly inside an
//      occurrence of a registered `specified_primitives` marker in the SAME file — per hit, so a second
//      hedge in an already-registered doc is caught too. This is a CLOSURE assertion over the phrase
//      (lessons-learned L36), not a registration source: membership still comes only from the manifest
//      (L6), and prose ABOUT the marker is never read as a site — it is a loud RED until a human lists
//      the file in the closed `marker_sweep.exempt` allowlist with a reason. The trigger (P7): the
//      manifest records two annotations (archetype-maps' ARCHITECTURE §4 site, constitution-injection)
//      that sat unregistered until a hand sweep found them — audit 2026-10-12 ENF-8.
//      Fail-closed: not a git work tree, or zero files listed, is exit 2 (a sweep over nothing certifies
//      nothing, L34); an exemption that covers a file holding a registered site (of either class) is
//      exit 2; an exemption that matches no hit is RED (STALE_EXEMPTION). The manifest file itself is
//      exempt by construction — the address book has to quote every marker it registers. The key is
//      optional (absent => no sweep, so a one-entry fixture manifest can drive directions 1 and 2 over
//      real docs that also hold OTHER entries' hedges); the test suite pins that the REAL manifest
//      declares it.
//      Because the listing includes untracked, not-ignored files, a local scratch note carrying the
//      phrase REDs `npm run check` on that machine while CI, which never sees the file, stays GREEN.
//      That is the intended direction: the note would be caught the moment it was committed.
//
// THE SECOND CLASS: FORWARD-LOOKING CLAIMS (`forward_claims` in the manifest). A sentence like "the
// checker that runs these is the NEXT increment" is TRUE when written and FALSE the moment the named
// artifact lands, in a file nobody is editing. That is the SAME computation as above with a different
// marker vocabulary: direction 1 is the claim EXPIRING (the artifact shipped, the hedge remains), and
// direction 2 is the hedge being DELETED while the artifact is still absent (the doc now implies
// something exists that does not). Registered here rather than in a second checker with its own
// manifest, npm script, ci.yml step and wiring tests — lessons-learned L35: when the existing thing
// already computes the answer, a parallel identity is the wrong remedy. Adding NO new wiring is the
// point; there is no new invoker to pin because there is no new invoker.
//
// The trigger (P7 — a real failure, never a hypothetical): the class recurred INSIDE #165, the
// increment whose entire purpose was fixing it — it corrected one "next increment" claim in
// pharn/pharn-contracts/eval-format.md and left a second in the same file. Per L20 that second
// occurrence is when a discipline-only remedy has earned a check.
//
// AN EMPTY `forward_claims` ARRAY IS EXIT 2 (EMPTY_CLASS), NEVER GREEN — lessons-learned L34: every
// check here is "for each registered claim, assert P", which is vacuously true over zero claims, so an
// emptied array would certify nothing. OMITTING the key is the expressible "none registered" state.
//
// WHY A STRUCTURED MANIFEST (lessons-learned L6). Membership is read from specified-primitives.json —
// never by scanning doc prose for what LOOKS like a marker. L6's defect (a membership fact grepped out
// of free text, so documentation ABOUT a declaration counts as a declaration) recurred inside F7's own
// REVIEW.md while correcting an unrelated error: a substring search for finding objects counted the
// remediation note that quoted the search pattern, inflating 6 findings to 7. A prose-scanning version
// of THIS checker would have the identical bug — a CHANGELOG sentence quoting a marker would register
// as a doc site. So the sites are enumerated, not discovered. Direction 3 does scan prose, but only to
// demand that each hit BE enumerated (or exempted by a human); a hit never becomes a site by being found,
// so the L6 failure turns into a loud RED instead of a silent registration.
//
// HONEST SCOPE (P0) — what this does NOT guarantee, stated because it is not obvious.
//   * IT DISCOVERS NEW HEDGES, NEVER NEW OVERCLAIMS. The sweep finds a new annotation only when it
//     carries the literal phrase. A doc that asserts some OTHER non-existent primitive with no hedge at
//     all, or hedges it in other words (THREAT-MODEL §4 item 5's `_Specified; the check is conditional…_`
//     is a live example, registered by its own marker), is invisible until a human adds the entry.
//     "The manifest checked out" NEVER means "the docs are true" — the same bound the lessons index
//     carries, and the reason this file is not called check-doc-accuracy.
//   * FORWARD CLAIMS ARE NOT SWEPT. They share no invariant phrase: the registered markers are one-off
//     sentences, and the generic words ("next increment", "not yet built", "future increment") occur in
//     dozens of correct P7 policy sentences the manifest deliberately leaves unregistered. A sweep would
//     need a heuristic (P0/P5 forbid calling it a guarantee) or registrations of sentences that are
//     true. An unregistered forward claim stays invisible here.
//   * AN EXEMPTION HIDES ITS WHOLE FILE (or directory). A future hedge written into CHANGELOG.md or under
//     .dev/features/ is not swept. The allowlist is a reviewed declaration whose exact set the test pins.
//   * IGNORED PATHS ARE NOT SWEPT. Whatever `.gitignore` / `.git/info/exclude` hide is outside the scan.
//   * THE PROBE TESTS EXISTENCE, NOT FUNCTION. `dir-contains` asks whether a file whose NAME contains a
//     substring is present; `path` asks whether a path exists. Neither asks whether a hook is WIRED in
//     .claude/settings.json, whether it is invoked, or whether it works. A stub named pre-egress.cjs
//     flips the probe to "live" and REDs direction 1 — deliberately: a loud early signal beats a silent
//     one, and the remedy (check the doc, then the wiring) is the right next action either way.
//   * SUBSTRING PRESENCE IS NOT SENTENCE COHERENCE. Direction 2 proves the marker bytes are still in the
//     file. It says nothing about whether the surrounding sentence still makes sense, sits in the same
//     section, or has been reduced to a quotation inside an unrelated paragraph.
//   * IT IS APPARATUS. Nothing on the floor forces `npm run check` to run it; that wiring is a
//     convention this file cannot enforce about itself.
//
// TRUST (P2): the manifest is a trusted, human-reviewed apparatus file, and the docs its sites name are
// trusted. The sweep is wider: it reads EVERY file git lists, untracked ones included, so its input may
// be untrusted (code under review, a fetched file, a contributor's note). All file bytes are opaque DATA
// — compared by `String.prototype.includes` and one regex, never parsed, interpreted, or executed. No
// free text steers a branch: only match offsets, byte ranges and paths do. The one excerpt the sweep
// prints (the line of an unregistered hit) goes through `JSON.stringify`, which escapes control
// characters, so no terminal escape sequence reaches the output.
//   Two further bounds of the sweep, stated: `git` inherits the caller's environment, so a run from
// inside a git hook with GIT_DIR / GIT_INDEX_FILE set would list THAT index (no hook runs this checker
// today); and a hit is covered only by a `specified_primitives` marker, never a forward-claim one — the
// phrase is the specified class's vocabulary, so a forward-claim marker carrying it would RED.
//
// Usage:  node .dev/floor/check-specified-markers.mjs [targetDir] [--manifest <path>]
//         targetDir defaults to cwd; --manifest defaults to the sibling specified-primitives.json and
//         exists so the test suite can drive fixture manifests (an authored fixture passes by
//         construction — L4 — so the RED paths must be reachable, not merely asserted).
// Exit:   0 GREEN | 1 RED (a drifted annotation) | 2 the manifest itself is unusable, or the sweep cannot
//         list the tree (fail-closed)

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const mIdx = argv.indexOf("--manifest");
const MANIFEST = mIdx !== -1 && argv[mIdx + 1] ? resolve(argv[mIdx + 1]) : join(HERE, "specified-primitives.json");
const positional = argv.filter((a, i) => !a.startsWith("--") && i !== mIdx + 1);
const TARGET = resolve(positional[0] ?? process.cwd());

const reds = [];
const red = (msg) => reds.push(msg);

// --- Load the manifest. Any defect here is exit 2, never a silent pass: a checker that cannot read its
// --- own membership set has no verdict to give, and reporting GREEN would be the worst outcome.
let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch (e) {
  console.error(`RED (manifest unusable): cannot read/parse ${MANIFEST} — ${e.message}`);
  process.exit(2);
}
const primitives = manifest.specified_primitives;
const named = manifest.named_artifacts ?? [];
if (!Array.isArray(primitives)) {
  console.error(`RED (manifest unusable): ${MANIFEST} has no \`specified_primitives\` array`);
  process.exit(2);
}

// FORWARD-LOOKING CLAIMS — the same two directions, a different marker vocabulary. See the manifest's
// $forward_claims_comment for what is deliberately unregistered.
//
// The key is OPTIONAL (omitted => none registered, a real GREEN), but a PRESENT-and-EMPTY array is
// exit 2. Every check below is "for each registered claim, assert P", which is VACUOUSLY TRUE over
// zero claims (lessons-learned L34), so an emptied array would otherwise certify nothing as GREEN.
// Omission and emptiness are distinguishable, which is what keeps the honest "none yet" state
// expressible — the same shape as check-structural.mjs's `finding_count == 0` escape.
const hasForwardKey = Object.hasOwn(manifest, "forward_claims");
const forward = hasForwardKey ? manifest.forward_claims : [];
if (hasForwardKey && !Array.isArray(forward)) {
  console.error(`RED (manifest unusable): ${MANIFEST} has a \`forward_claims\` key that is not an array`);
  process.exit(2);
}
if (hasForwardKey && forward.length === 0) {
  console.error(
    `RED (manifest unusable): ${MANIFEST} declares an EMPTY \`forward_claims\` array (EMPTY_CLASS).\n` +
      `  Per-claim assertions pass vacuously over zero claims, so this would certify nothing as GREEN.\n` +
      `  To register no forward claims, OMIT the \`forward_claims\` key entirely.`
  );
  process.exit(2);
}

/**
 * Is the primitive LIVE? A pure existence test (ARCHITECTURE §2 primitive #3).
 * Unknown probe type => throw, so a typo in the manifest fails CLOSED (exit 2) rather than
 * silently reporting "not live" and passing every marker check.
 */
function isLive(probe, id) {
  if (!probe || typeof probe !== "object") throw new Error(`primitive ${id}: missing probe`);
  if (probe.type === "path") {
    if (typeof probe.path !== "string") throw new Error(`primitive ${id}: probe.path must be a string`);
    return existsSync(join(TARGET, probe.path));
  }
  if (probe.type === "dir-contains") {
    if (typeof probe.dir !== "string" || typeof probe.substring !== "string") {
      throw new Error(`primitive ${id}: dir-contains needs string \`dir\` and \`substring\``);
    }
    const dir = join(TARGET, probe.dir);
    let entries;
    try {
      if (!statSync(dir).isDirectory()) return false;
      entries = readdirSync(dir);
    } catch {
      // The directory itself is absent/unreadable => nothing in it => the primitive is not live.
      return false;
    }
    return entries.some((e) => e.includes(probe.substring));
  }
  throw new Error(`primitive ${id}: unknown probe type ${JSON.stringify(probe.type)}`);
}

function validatePrimitive(p) {
  if (!p || typeof p !== "object") throw new Error("primitive record must be an object");
  if (typeof p.id !== "string") throw new Error("primitive record lacks string `id`");
  if (!Array.isArray(p.sites)) throw new Error(`primitive ${p.id}: \`sites\` must be an array`);
  for (const site of p.sites) {
    if (!site || typeof site !== "object") {
      throw new Error(`primitive ${p.id}: each site must be an object`);
    }
    // An EMPTY marker is present in every file (`includes("")` is always true), so direction 2 could
    // never fire for it and the sweep would have nothing to cover — refused like any other unusable site.
    if (typeof site.file !== "string" || typeof site.marker !== "string" || site.marker === "") {
      throw new Error(`primitive ${p.id}: each site needs string \`file\` and \`marker\` fields, the marker non-empty`);
    }
  }
}

function validateNamedArtifact(a) {
  if (!a || typeof a !== "object") throw new Error("named-artifact record must be an object");
  if (typeof a.id !== "string") throw new Error("named-artifact record lacks string `id`");
  if (typeof a.cited_in !== "string") {
    throw new Error(`named-artifact ${a.id}: \`cited_in\` must be a string`);
  }
  if (typeof a.citation !== "string") {
    throw new Error(`named-artifact ${a.id}: \`citation\` must be a string`);
  }
  if (typeof a.must_exist !== "string") {
    throw new Error(`named-artifact ${a.id}: \`must_exist\` must be a string`);
  }
  if (a.forbidden !== undefined) {
    if (!Array.isArray(a.forbidden)) {
      throw new Error(`named-artifact ${a.id}: \`forbidden\` must be an array`);
    }
    for (const entry of a.forbidden) {
      if (typeof entry !== "string") {
        throw new Error(`named-artifact ${a.id}: each \`forbidden\` entry must be a string`);
      }
    }
  }
}

// ------------------------------------------------------------------ direction 3: the marker sweep

// The specified-class vocabulary: the shortest substring every phrase-bearing hedge shares
// (lessons-learned L33), with `\s+` between words so a markdown re-wrap does not hide a hit, and `i` so
// a sentence-initial "Ships" does not either.
const SWEEP_PHRASE = /ships\s+with\s+the\s+guarded\s+surface/gi;
const sweep = Object.hasOwn(manifest, "marker_sweep") ? manifest.marker_sweep : undefined;

/** An exemption path: an exact repo-relative file, or a directory prefix ending in `/`. */
const exemptCovers = (path, rel) => (path.endsWith("/") ? rel.startsWith(path) : rel === path);

function validateSweep(sw, siteFiles) {
  if (!sw || typeof sw !== "object" || Array.isArray(sw) || !Array.isArray(sw.exempt)) {
    throw new Error("`marker_sweep` must be an object with an `exempt` array");
  }
  const seen = new Set();
  for (const e of sw.exempt) {
    const path = e?.path;
    if (typeof path !== "string" || typeof e.reason !== "string" || e.reason.trim() === "") {
      throw new Error("each `marker_sweep.exempt` entry needs a string `path` and a non-empty string `reason`");
    }
    const segments = (path.endsWith("/") ? path.slice(0, -1) : path).split("/");
    if (path.includes("\\") || segments.some((s) => s === "" || s === "." || s === "..")) {
      throw new Error(
        `marker_sweep exempt path ${JSON.stringify(path)} must be repo-relative, with no empty, '.', '..' or backslash segment`
      );
    }
    if (seen.has(path)) throw new Error(`marker_sweep exempt path ${JSON.stringify(path)} is listed twice`);
    seen.add(path);
    const guarded = siteFiles.find((f) => exemptCovers(path, f));
    if (guarded) {
      throw new Error(
        `marker_sweep exempt path ${JSON.stringify(path)} covers ${guarded}, which holds a registered site — a guarded doc is never exempt`
      );
    }
  }
}

/** Every file git would commit: tracked, plus untracked-but-not-ignored. Fail-closed on no listing. */
function listTree() {
  let out;
  try {
    out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: TARGET,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (e) {
    const why = `${e.stderr ?? ""}`.trim().split("\n")[0] || e.message;
    throw new Error(`marker sweep: \`git ls-files\` failed in ${TARGET} — the sweep needs a git work tree (${why})`, { cause: e });
  }
  const files = [...new Set(out.split("\0").filter(Boolean))];
  if (files.length === 0) {
    throw new Error(`marker sweep: \`git ls-files\` listed no files in ${TARGET} — a sweep over nothing certifies nothing`);
  }
  return files;
}

const sweepStats = { files: 0, hits: 0, exemptHits: 0 };

/** Direction 3. Assumes `primitives` and `forward` already passed validatePrimitive. */
function runSweep() {
  const siteFiles = [...new Set([...primitives, ...forward].flatMap((p) => p.sites.map((s) => s.file)))];
  validateSweep(sweep, siteFiles);
  const markersByFile = new Map();
  for (const p of primitives) {
    for (const s of p.sites) markersByFile.set(s.file, [...(markersByFile.get(s.file) ?? []), s.marker]);
  }
  const exempt = sweep.exempt.map((e) => ({ path: e.path, hits: 0 }));
  const manifestRel = relative(TARGET, MANIFEST).split(sep).join("/");

  for (const rel of listTree()) {
    if (rel === manifestRel) continue;
    let st;
    try {
      st = lstatSync(join(TARGET, rel));
    } catch {
      continue; // listed (tracked) but deleted from the working tree: no bytes to scan
    }
    // Only regular files. A symlink is never followed out of the tree (a target inside it is listed
    // itself), and git lists a nested repository — a sibling worktree, say — as one `dir/` entry, whose
    // bytes belong to another tree.
    if (!st.isFile()) continue;
    let src;
    try {
      src = readFileSync(join(TARGET, rel), "utf8");
    } catch (e) {
      red(`${rel}: listed for the marker sweep but could not be read (${e.code}) — an unread file is never a clean one`);
      continue;
    }
    const hits = [...src.matchAll(SWEEP_PHRASE)];
    if (hits.length === 0) continue;
    sweepStats.files++;
    const ex = exempt.find((x) => exemptCovers(x.path, rel));
    if (ex) {
      ex.hits += hits.length;
      sweepStats.exemptHits += hits.length;
      continue;
    }
    sweepStats.hits += hits.length;
    const ranges = [];
    for (const m of markersByFile.get(rel) ?? []) {
      for (let i = src.indexOf(m); i !== -1; i = src.indexOf(m, i + 1)) ranges.push([i, i + m.length]);
    }
    for (const h of hits) {
      const start = h.index;
      const end = start + h[0].length;
      if (ranges.some(([a, b]) => start >= a && end <= b)) continue;
      const line = src.slice(0, start).split("\n").length;
      const text = src.split("\n")[line - 1].trim().slice(0, 140);
      red(
        `${rel}:${line}: an UNREGISTERED "specified" annotation — no registered marker covers it, so nothing ` +
          `tells anyone when its primitive ships or when it is deleted.\n` +
          `    line: ${JSON.stringify(text)}\n` +
          `    fix: add it as a site of a \`specified_primitives\` entry (with a probe); if this text is ABOUT ` +
          `the marker rather than an annotation, list the file in \`marker_sweep.exempt\` with a reason.`
      );
    }
  }

  for (const x of exempt) {
    if (x.hits === 0) {
      red(
        `marker_sweep.exempt ${JSON.stringify(x.path)}: STALE_EXEMPTION — it covers no hit of the phrase. ` +
          `Remove the entry; an allowlist entry that outlived its reason hides the next real hedge.`
      );
    }
  }
}

const fileCache = new Map();
function readDoc(rel) {
  if (!fileCache.has(rel)) {
    try {
      fileCache.set(rel, readFileSync(join(TARGET, rel), "utf8"));
    } catch {
      fileCache.set(rel, null);
    }
  }
  return fileCache.get(rel);
}

let siteCount = 0;
let liveCount = 0;
let claimCount = 0;
let landedCount = 0;

try {
  for (const p of primitives) {
    validatePrimitive(p);
    const live = isLive(p.probe, p.id);
    if (live) liveCount++;
    for (const site of p.sites) {
      siteCount++;
      const src = readDoc(site.file);
      if (src === null) {
        red(`${site.file}: listed as a site for \`${p.id}\` but the file could not be read`);
        continue;
      }
      const present = src.includes(site.marker);
      if (live && present) {
        // DIRECTION 1 — the repo got better and the docs did not follow.
        red(
          `${site.file}: \`${p.id}\` IS NOW LIVE (${describe(p.probe)}), but the doc still annotates it ` +
            `as not-yet-live. REMOVE the marker — the doc now UNDERSTATES a real protection.\n` +
            `    marker: ${JSON.stringify(site.marker)}`
        );
      } else if (!live && !present) {
        // DIRECTION 2 — the annotation was removed while the primitive is still absent.
        red(
          `${site.file}: the \`${p.id}\` annotation is GONE, but the primitive is still absent ` +
            `(${describe(p.probe)}). The doc has returned to asserting a protection the repo does not have.\n` +
            `    expected: ${JSON.stringify(site.marker)}`
        );
      }
    }
  }

  for (const c of forward) {
    validatePrimitive(c); // identical record shape: id + probe + sites[{file, marker}]
    const landed = isLive(c.probe, c.id);
    if (landed) landedCount++;
    for (const site of c.sites) {
      claimCount++;
      const src = readDoc(site.file);
      if (src === null) {
        red(`${site.file}: listed as a site for forward claim \`${c.id}\` but the file could not be read`);
        continue;
      }
      const present = src.includes(site.marker);
      if (landed && present) {
        // DIRECTION 1 — the claim EXPIRED: the artifact landed, the sentence still says it has not.
        red(
          `${site.file}: forward claim \`${c.id}\` has EXPIRED — ${describe(c.probe)}, but the doc still ` +
            `says it is not built. RE-DERIVE the sentence; the doc now describes the repo as weaker than it is.\n` +
            `    marker: ${JSON.stringify(site.marker)}`
        );
      } else if (!landed && !present) {
        // DIRECTION 2 — the hedge was deleted while the artifact is still absent.
        red(
          `${site.file}: the forward-claim hedge for \`${c.id}\` is GONE, but the artifact is still absent ` +
            `(${describe(c.probe)}). The doc now implies something exists that does not.\n` +
            `    expected: ${JSON.stringify(site.marker)}`
        );
      }
    }
  }

  for (const a of named) {
    validateNamedArtifact(a);
    const src = readDoc(a.cited_in);
    if (src === null) {
      red(`${a.cited_in}: named-artifact citation for \`${a.id}\` — the file could not be read`);
      continue;
    }
    if (!src.includes(a.citation)) {
      red(`${a.cited_in}: no longer cites \`${a.id}\` as ${JSON.stringify(a.citation)} — the name drifted`);
    }
    if (a.forbidden) {
      for (const forbidden of a.forbidden) {
        if (src.includes(forbidden)) {
          red(`${a.cited_in}: still cites \`${a.id}\` by the obsolete name ${JSON.stringify(forbidden)} — ` + "remove the legacy citation");
        }
      }
    }
    if (!existsSync(join(TARGET, a.must_exist))) {
      red(`${a.cited_in} cites \`${a.id}\`, but ${a.must_exist} does not exist — the doc names a missing artifact`);
    }
  }

  if (sweep !== undefined) runSweep();
} catch (e) {
  console.error(`RED (manifest unusable): ${e.message}`);
  process.exit(2);
}

function describe(probe) {
  return probe.type === "path" ? `${probe.path} exists` : `${probe.dir}/*${probe.substring}*`;
}

if (reds.length) {
  console.error(`SPECIFIED-MARKERS: RED — ${reds.length} finding(s)\n`);
  for (const r of reds) console.error(`  - ${r}`);
  console.error(
    `\nManifest: ${MANIFEST}\n` +
      `This checks the annotations and forward claims that manifest LISTS, and sweeps for unlisted hedges that ` +
      `carry the literal phrase. It cannot discover an overclaim with no such hedge, or a forward-looking claim ` +
      `nobody registered (P0).`
  );
  process.exit(1);
}

const sweepLine =
  sweep === undefined
    ? "marker sweep: OFF (the manifest declares no `marker_sweep`)"
    : `marker sweep: ${sweepStats.hits} phrase hit(s) all registered, ${sweepStats.exemptHits} exempt, ` +
      `across ${sweepStats.files} file(s) (${sweep.exempt.length} exemption(s))`;
console.log(
  `SPECIFIED-MARKERS: GREEN — ${siteCount} annotation(s) across ${primitives.length} specified primitive(s) ` +
    `(${liveCount} now live), ${claimCount} forward-claim site(s) across ${forward.length} registered claim(s) ` +
    `(${landedCount} now landed), ${named.length} named artifact(s) checked in ${TARGET}; ${sweepLine}.\n` +
    `NOTE (P0): this proves the LISTED annotations and claims still match reality and, with the sweep on, that ` +
    `every hedge carrying the phrase is listed or exempt. It never means the docs are accurate — an overclaim with no such hedge, or an expired ` +
    `claim not in the manifest, is invisible here.`
);
