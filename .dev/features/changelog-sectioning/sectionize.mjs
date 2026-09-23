#!/usr/bin/env node
// .dev/features/changelog-sectioning/sectionize.mjs — the git I/O + CLI of the one-shot CHANGELOG
// sectioning migration. The method's rules — parsing, classification, the placeholder window, rendering,
// the invariants — live in the pure `sectionize-core.mjs`. This file gathers git facts (execFileSync with
// argv arrays — NO shell, so a probe can never become a command), wires them into the core, and owns the
// two I/O preconditions: `--write` refuses a working file it did not analyse, and an override's evidence
// commit must resolve.
//
// Usage (every flag REQUIRED — no defaults, L41):
//   node .dev/features/changelog-sectioning/sectionize.mjs --repo <dir> --ref <rev> --overrides <json> --write
//   node .dev/features/changelog-sectioning/sectionize.mjs --repo <dir> --ref <rev> --overrides <json> --verify
//
// --write  refuses unless the working CHANGELOG.md is byte-identical to `<ref>:CHANGELOG.md` (it migrates
//          exactly what it analysed, and cannot run twice over its own output), then writes CHANGELOG.md
//          and .dev/features/changelog-sectioning/MIGRATION.md. Both writes are Bash-side
//          (fs.writeFileSync), so the PreToolUse write guards never see them — they are declared in the
//          plan's `## Files` for exactly that reason (L19). Run it ONLY inside /pharn-dev-build, after that
//          stage's Step-0 setter; a later regeneration first re-sets the scope from the plan (GRILL G5).
// --verify recomputes everything from <ref> and exits 0 only if the working CHANGELOG.md AND MIGRATION.md
//          both equal the render byte-for-byte and every invariant holds. It writes nothing.
//
// `--ref` is resolved to a 40-hex SHA ONCE and every later read uses that SHA (L32: `main` is a mutable
// alias). Exit: 0 ok · 1 a named MigrationHalt / verify mismatch · 2 bad usage.
// NOT a floor checker and not wired into `npm run check`: a one-shot migration bound to one pinned input.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "./sectionize-core.mjs";

/** Sections kept verbatim (out of scope). */
export const UNTOUCHED = ["1.0.0"];
/** The date this migration's own [Unreleased] entry carries. Fixed so --verify is reproducible. */
export const ENTRY_DATE = "2026-09-23";
/** The type group this migration's entry joins (the [Unreleased] intro comment: entries join their TYPE group). */
export const ENTRY_GROUP = "### Changed";
/** Where --write puts the report, relative to --repo. */
export const REPORT_PATH = ".dev/features/changelog-sectioning/MIGRATION.md";
export const CHANGELOG = "CHANGELOG.md";

const USAGE = "usage: sectionize.mjs --repo <dir> --ref <rev> --overrides <json> (--write | --verify)";

class UsageError extends Error {}

export function parseArgs(argv) {
  const a = { repo: null, ref: null, overrides: null, mode: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--write" || k === "--verify") {
      if (a.mode) throw new UsageError("pass exactly one of --write / --verify");
      a.mode = k.slice(2);
    } else if (k === "--repo" || k === "--ref" || k === "--overrides") {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new UsageError(`${k} needs a value`);
      a[k.slice(2)] = v;
    } else {
      throw new UsageError(`unexpected argument: ${k}`);
    }
  }
  for (const k of ["repo", "ref", "overrides", "mode"])
    if (!a[k]) throw new UsageError(`missing ${k === "mode" ? "--write | --verify" : `--${k}`}`);
  return a;
}

/** A git runner bound to one repo. argv arrays only — never a shell string. */
export function gitIn(repo) {
  return (...args) =>
    execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "pipe"] });
}

/** Everything the core needs from git, for one pinned SHA. */
export function gather({ git, sha }) {
  const fp = git("rev-list", "--first-parent", "--reverse", sha).trim().split("\n");
  const indexOf = new Map(fp.map((s, k) => [s, k]));
  const rows = git("log", "--first-parent", "--reverse", "--format=%H %cs", sha, "--", "SKILLS_VERSION")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [h, date] = l.split(" ");
      return { sha: h, date, value: git("show", `${h}:SKILLS_VERSION`).trim() };
    });
  const blobs = new Map();
  const changelogAt = (h) => {
    if (!blobs.has(h)) {
      const present = git("ls-tree", "--name-only", h, "--", CHANGELOG).trim() !== "";
      blobs.set(h, present ? git("show", `${h}:${CHANGELOG}`) : "");
    }
    return blobs.get(h);
  };
  const pickaxe = (probe) => {
    const shas = git("log", "--first-parent", "--reverse", `-S${probe}`, "--format=%H", sha, "--", CHANGELOG)
      .trim()
      .split("\n")
      .filter(Boolean);
    return shas.map((h) => ({ sha: h, count: core.countOccurrences(changelogAt(h), probe) }));
  };
  const touches = (fromSha, toSha) =>
    git("log", "--first-parent", "--reverse", "--format=%H", `${fromSha}..${toSha}`, "--", CHANGELOG).trim().split("\n").filter(Boolean);
  const resolves = (ref) => {
    try {
      git("cat-file", "-e", `${ref}^{commit}`);
      return true;
    } catch {
      return false;
    }
  };
  // The commit that FIRST set SKILLS_VERSION anywhere in history — NOT first-parent. It can sit on a merged
  // side branch (1.0.0 did: 126e2b3, merged by 8753940), which the first-parent table cannot see.
  const [firstSha, firstDate] = git("log", "--reverse", "--format=%H %cs", sha, "--", "SKILLS_VERSION").trim().split("\n")[0].split(" ");
  const firstEver = { sha: firstSha, date: firstDate, value: git("show", `${firstSha}:SKILLS_VERSION`).trim() };
  return {
    indexOf,
    rows,
    text: changelogAt(sha),
    skillsVersion: git("show", `${sha}:SKILLS_VERSION`).trim(),
    pickaxe,
    touches,
    resolves,
    firstEver,
  };
}

/** How many leading lines two texts share byte-for-byte. */
function sharedPrefixLines(a, b) {
  const x = a.split("\n");
  const y = b.split("\n");
  let k = 0;
  while (k < x.length && k < y.length && x[k] === y[k]) k++;
  return k;
}

/** The whole migration as a function of gathered git facts + the reviewed inputs. Returns what to write. */
export function migrate({ facts, inputs, sha }) {
  const { allowDrop, positional: knownPositional, overrides } = inputs;
  const table = core.buildVersionTable(facts.rows);
  const parsed = core.parseChangelog(facts.text, { allowDrop, untouched: UNTOUCHED });
  const at = (h) => {
    const k = facts.indexOf.get(h);
    if (k === undefined) throw new core.MigrationHalt("UNKNOWN_COMMIT", `${h} is not on the first-parent chain of ${sha}`);
    return { sha: h, version: core.versionForIndex(table, facts.indexOf, k) };
  };
  const classified = parsed.bullets.map((bullet) => {
    const { probe } = core.headProbe(bullet.text, facts.text);
    const headIntro = core.introductions(facts.pickaxe(probe));
    const head = headIntro.intro ? at(headIntro.intro) : { sha: null, version: null };
    const tp = core.tailProbe(bullet.text, facts.text);
    let tail = { skip: tp.skip };
    if (tp.probe) {
      const t = core.introductions(facts.pickaxe(tp.probe)).intro;
      tail = t ? at(t) : { skip: "unresolved" };
    }
    const markers = core.extractMarkers(bullet.text);
    const marker = core.classifyMarker(markers, table, UNTOUCHED);
    const status = core.classifyBullet({ head, tail, marker, untouched: UNTOUCHED });
    return { bullet, probe, head, headEarlier: headIntro.earlier, tail, markers, marker, status };
  });
  for (const o of overrides) {
    if (o && o.evidence && typeof o.evidence.sha === "string" && !facts.resolves(o.evidence.sha))
      throw new core.MigrationHalt("OVERRIDE_BAD_SHAPE", `evidence commit ${o.evidence.sha} does not resolve`);
  }
  const assignment = core.applyOverrides(classified, overrides, table, UNTOUCHED);

  // Placeholders for versions no bullet was filed under. A version's window is (previous version, it].
  const placeholders = new Map();
  const filed = new Set(assignment.values());
  table.versions.forEach((v, k) => {
    if (UNTOUCHED.includes(v.version) || filed.has(v.version)) return;
    const prev = k > 0 ? table.versions[k - 1].sha : null;
    const windowTouches = prev ? facts.touches(prev, v.sha) : [];
    const lo = prev ? facts.indexOf.get(prev) : -1;
    const hi = facts.indexOf.get(v.sha);
    const relanded = core.relandedIn({ classified, assignment, indexOf: facts.indexOf, lo, hi });
    placeholders.set(v.version, core.placeholderFor(v, { windowTouches, relanded }));
  });

  const stale = core.staleMentions(classified, assignment);
  const removedHeadings = parsed.sections
    .filter((s) => s.version !== "Unreleased" && !table.byVersion.has(s.version))
    .map((s) => s.heading);
  const generated = table.versions.filter((v) => !UNTOUCHED.includes(v.version));
  const filledCount = generated.filter((v) => filed.has(v.version)).length;
  const tailHeading = core.VERSION_HEADING_RE.exec(parsed.tail.text.split("\n")[0]);
  const tailVersion = table.byVersion.get(tailHeading[1]);
  const history = {
    version: tailHeading[1],
    headingDate: tailHeading[2],
    firstEver: facts.firstEver,
    firstParent: { sha: tailVersion.sha, date: tailVersion.date },
  };
  const entryArgs = {
    date: ENTRY_DATE,
    bulletCount: parsed.bullets.length,
    filledCount,
    overrideCount: overrides.length,
    stale,
    removedHeadings,
    placeholderVersions: [...placeholders.keys()],
    dropped: parsed.dropped.map((d) => d.text),
    history,
    outOfScope: core.outOfScopeFilings(classified, assignment, UNTOUCHED),
  };
  // Bullet order in the output does not depend on the entry's text, so a provisional render fixes every
  // migrated bullet's position; the positional check reads that, and the final entry then cites its result.
  const provisional = core.renderChangelog({
    parsed,
    table,
    assignment,
    placeholders,
    entry: { group: ENTRY_GROUP, text: "- provisional" },
    untouched: UNTOUCHED,
  });
  const positional = core.positionalMentions(parsed.bullets, knownPositional, provisional);
  // The unchanged leading lines end before the entry, so the provisional render already fixes the count;
  // the final render is held to the same number rather than trusted to share it.
  const unchangedLines = sharedPrefixLines(facts.text, provisional);
  const entry = { group: ENTRY_GROUP, text: core.renderEntry({ ...entryArgs, positional, unchangedLines }) };
  const outText = core.renderChangelog({ parsed, table, assignment, placeholders, entry, untouched: UNTOUCHED });
  if (sharedPrefixLines(facts.text, outText) !== unchangedLines)
    throw new core.MigrationHalt(
      "INVARIANT_FAILED",
      `the entry moved the unchanged-prefix boundary (${unchangedLines} lines provisionally)`
    );
  const invariants = core.assertInvariants(
    core.checkInvariants({
      parsed,
      outText,
      table,
      assignment,
      placeholders,
      entry,
      skillsVersion: facts.skillsVersion,
      allowDrop,
      untouched: UNTOUCHED,
    })
  );
  const report = core.renderReport({
    sha,
    skillsVersion: facts.skillsVersion,
    table,
    classified,
    assignment,
    overrides,
    placeholders,
    stale,
    removedHeadings,
    dropped: parsed.dropped,
    invariants,
    untouched: UNTOUCHED,
    sectionCount: generated.length,
    filledCount,
    history,
    positional,
    unread: new Map(classified.map((c) => [c.bullet, core.unreadMentions(c.bullet.text)])),
    bumpShas: new Set(facts.rows.map((r) => r.sha)),
  });
  return { outText, report, classified, invariants };
}

/**
 * The reviewed inputs file: {allowDrop, positional, overrides}, every key REQUIRED and an array (no
 * default — L41). `allowDrop` is the exact text of each non-structure line the parser may drop;
 * `positional` the {phrase, referent} references a review confirmed broken by the move; `overrides` the
 * resolutions for every bullet that does not auto-assign. All three are reviewed at /pharn-dev-grill.
 */
export function readInputs(file) {
  const doc = JSON.parse(readFileSync(file, "utf8"));
  for (const k of ["allowDrop", "positional", "overrides"]) {
    if (!doc || !Array.isArray(doc[k])) throw new core.MigrationHalt("OVERRIDE_BAD_SHAPE", `${file}: "${k}" must be an array`);
  }
  if (!doc.allowDrop.every((l) => typeof l === "string" && l.length > 0 && !l.includes("\n")))
    throw new core.MigrationHalt("OVERRIDE_BAD_SHAPE", `${file}: every "allowDrop" entry must be one non-empty line`);
  if (!doc.positional.every((k) => k && typeof k.phrase === "string" && typeof k.referent === "string"))
    throw new core.MigrationHalt("OVERRIDE_BAD_SHAPE", `${file}: every "positional" entry needs a string phrase and referent`);
  return doc;
}

export function run(argv) {
  const args = parseArgs(argv);
  const git = gitIn(args.repo);
  const sha = git("rev-parse", "--verify", `${args.ref}^{commit}`).trim();
  const inputs = readInputs(args.overrides);
  const working = readFileSync(join(args.repo, CHANGELOG), "utf8");
  const facts = gather({ git, sha });
  if (args.mode === "write" && working !== facts.text) {
    throw new core.MigrationHalt(
      "INVARIANT_FAILED",
      `the working ${CHANGELOG} is not byte-identical to ${sha}:${CHANGELOG} — refusing to migrate bytes it did not analyse`
    );
  }
  const result = migrate({ facts, inputs, sha });
  if (args.mode === "verify") {
    const report = readFileSync(join(args.repo, REPORT_PATH), "utf8");
    for (const [path, have, want] of [
      [CHANGELOG, working, result.outText],
      [REPORT_PATH, report, result.report],
    ]) {
      if (have !== want)
        return {
          code: 1,
          message: `VERIFY: RED — the working ${path} differs from the render of ${sha} at line ${sharedPrefixLines(have, want) + 1}`,
        };
    }
    return {
      code: 0,
      message: `VERIFY: GREEN — the working ${CHANGELOG} and ${REPORT_PATH} equal the render of ${sha}; ${result.invariants.length} invariants hold`,
    };
  }
  writeFileSync(join(args.repo, CHANGELOG), result.outText);
  writeFileSync(join(args.repo, REPORT_PATH), result.report);
  const tally = core.STATUSES.map((s) => `${s} ${result.classified.filter((c) => c.status === s).length}`).join(", ");
  return {
    code: 0,
    message: `WRITE: ${CHANGELOG} + ${REPORT_PATH} from ${sha} (${result.classified.length} bullets: ${tally}); ${result.invariants.length} invariants hold`,
  };
}

function main() {
  try {
    const { code, message } = run(process.argv.slice(2));
    (code === 0 ? process.stdout : process.stderr).write(message + "\n");
    process.exitCode = code;
  } catch (e) {
    if (e instanceof UsageError) {
      process.stderr.write(`${e.message}\n${USAGE}\n`);
      process.exitCode = 2;
    } else if (e instanceof core.MigrationHalt) {
      process.stderr.write(`HALT ${e.message}\n`);
      process.exitCode = 1;
    } else {
      throw e;
    }
  }
}

if (import.meta.main) main();
