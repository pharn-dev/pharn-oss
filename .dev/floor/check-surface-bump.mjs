#!/usr/bin/env node
// .dev/floor/check-surface-bump.mjs — the per-PR "product bytes moved, so SKILLS_VERSION moved" checker
// (build apparatus).
//
// WHAT IT ANSWERS: did this pull request change a path in the bump-triggering product surface (CLAUDE.md,
// "SKILLS_VERSION discipline") while leaving SKILLS_VERSION as it was at its base? Its siblings answer
// different questions and stay unchanged: `check-changelog-entry.mjs` judges what one PR did to the CHANGELOG
// TEXT, and `check-skills-version-recorded.mjs` / `check-version-badge.mjs` judge whether the stored copies of
// the version AGREE. Agreement is preserved by updating none of them, which is how a product edit with only an
// `[Unreleased]` entry passed every gate (audit 2026-10-12 ARCH-2; lessons-learned L43). This checker binds
// the version to its REFERENT — the product-surface paths that changed — which is L43's named remedy.
//
// The GUARANTEE (P0, ARCHITECTURE §2 primitive #3 — glob membership + string equality; ZERO LLM):
//
//   - the changed-path set is `git diff --no-renames --name-only -z <base>` (base commit → the WORKING TREE,
//     staged or not) ∪ `git ls-files --others --exclude-standard -z` (untracked, not ignored);
//   - a path is product surface iff it matches some PRODUCT_SURFACE.include pattern and no .exclude pattern;
//   - RED (`NOT_BUMPED`) iff at least one changed path is product surface and SKILLS_VERSION's bytes at the
//     base equal its bytes in the working tree (one trailing newline ignored on each side).
//
// WHAT "BUMPED" DELIBERATELY DOES NOT RE-CHECK (L35 — one rule, one owner). A moved SKILLS_VERSION must also
// open its own `## [X.Y.Z]` CHANGELOG section at the top: `check-skills-version-recorded.mjs` REDs when the
// first version heading is not SKILLS_VERSION's (UNRECORDED / NOT_NEWEST) and when headings are not strictly
// descending (so a DECREASE), and `check-changelog-entry.mjs` REDs a version heading inserted below the newest
// (HEADING_INSERTED) and a bump that leaves `[Unreleased]` entries (UNRELEASED_NOT_MOVED). The full rule is
// therefore the COMPOSITION of the three CI steps, not this file alone; repeating those rules here would be a
// third copy to keep in sync.
//
// THE BASE, and why a merge from main does not count. `--base-ref <ref>` compares against that commit: CI
// passes `HEAD^1` of GitHub's test merge commit, so the diff is the PR's net change by construction.
// `--merge-base <ref>` compares against `git merge-base HEAD <ref>`: after `git merge origin/main` that
// merge-base IS the merged main tip, so files the merge brought in are not in the diff. A bump made in a
// SIBLING commit of the same PR counts — the diff is the PR's whole net change, never per commit (L43's
// second design problem). Head is the working tree, as in `check-changelog-entry.mjs` (which reads the head
// CHANGELOG from disk) and `/pharn-dev-ship`, which does not commit before its GATE 2; in CI the tree is clean.
// `--no-renames` makes a move OUT of the surface count as the deletion of a surface path.
//
// The refusal states — the CLOSED set, exported as REFUSAL_STATES so the tests iterate it (L29):
//
//   exit 2 (the input is unusable, so no verdict about the PR is possible):
//   - BAD_USAGE       : not exactly one base flag, an unknown flag, a second target, or a ref failing
//                       REF_RE / MAX_REF_LEN (the grammar is IMPORTED from check-changelog-entry.mjs — one
//                       grammar, never two)
//   - BASE_UNREADABLE : the ref does not name one commit, a git call fails, or SKILLS_VERSION is absent at the
//                       base. A failed git call is NEVER read as an empty diff (L34)
//   - HEAD_UNREADABLE : the target is not a directory, is not the work tree's root (the diff's paths are
//                       root-relative and the untracked listing's are cwd-relative, so a subdirectory would
//                       mix the two), or `<target>/SKILLS_VERSION` cannot be read
//   exit 1 (a verdict):
//   - NOT_BUMPED      : a product-surface path changed and SKILLS_VERSION did not
//
// THE PATH SET (PRODUCT_SURFACE) is one constant, and `check-surface-bump.test.mjs` binds it to CLAUDE.md's
// "bump-triggering set" bullet by token-set EQUALITY in both directions (L36 closure), so neither can change
// alone. Decided OUT, with the reason (the constant names only what is in):
//   - `pharn/floor/test-fixtures/**`, `pharn/floor/fixtures/**`: read only by `*.test.*` files (apparatus);
//     `pharn/floor/*.mjs` / `*.json` match ONE level, so they fall out by construction;
//   - `pharn/floor/README.md`: whether it ships depends on the external installer (`pharn-cli`), which this
//     repo cannot show (P6); it joins when the maintainer says it ships (surface-bump-check GATE 1, Q1);
//   - `pharn/features/**`: product-PIPELINE artifacts (what a user's run produces; here this repo's dogfood
//     runs), not methodology an install receives;
//   - `pharn.spec-template.md`: the PROJECT's own SPEC template, human-only, never shipped;
//   - `.claude/settings.local.json`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SKILLS_VERSION`, `MIN_CLI`,
//     `package.json`, `.github/**`, `docs/**`, `.dev/**`: repo meta or apparatus (CLAUDE.md).
//   A sibling worktree under `.claude/worktrees/` cannot match: `git ls-files --others` lists a nested
//   repository as ONE `dir/` entry and does not descend into it (pinned by a fixture).
//
// WHY THIS EXISTS (P7, measured). Three recorded escapes of the discipline-only rule: `6c5ae8e`
// (`pharn/ARCHITECTURE.md`, 3.0.0 unchanged) and `e4e8529` (`pharn/floor/check-plan-lessons.mjs` + two
// `pharn-*` commands) on main, and `c338b9d` (`pharn/floor/reconcile-baseline.mjs`, 5.1.0 unchanged; L43) on
// a branch. L20: a discipline-only remedy that recurs earns a floor check. Dry run before build over the last
// 40 first-parent commits on main: 33 touched the surface and every one bumped, 7 touched none — 0 false
// positives; the three escapes above classify RED.
//
// BOUNDS (P0 — each one says where the verdict stops):
//   - It proves SKILLS_VERSION MOVED. Never that the bump is the right SIZE (patch / minor / major), and never
//     that the path set is the RIGHT set — the test binds the constant to CLAUDE.md's text, not to what an
//     install receives (L43's own caveat).
//   - `**/*.test.*` exempts every test-named file, mirroring CLAUDE.md; a future eval-case fixture named like a
//     test file inside a capability would be exempt too (0 such files when this landed).
//   - It needs a BASE, so it is NOT in `npm run check`. CI runs it on pull requests only: DIRECT PUSHES to
//     `main` (where `6c5ae8e` and `e4e8529` landed) are unchecked, an ADMIN MERGE bypasses required checks,
//     and the verdict is about GitHub's test merge as of the PR's last CI run. A PR runs its OWN copy of this
//     checker and of `ci.yml`, so review of `.dev/floor/**` and `.github/workflows/**` is the backstop.
//   - LOCALLY `origin/main` is a mutable alias (L32). `--merge-base` with a stale alias yields an older base,
//     whose extra paths arrived on main with their own bump — so a stale alias lists more, never a false RED
//     for main's own changes; the remedy is `git fetch` first.
//   - Path names are matched as git reports them (byte-exact, case-sensitive). It reads no file contents but
//     SKILLS_VERSION's.
//
// UNTRUSTED INPUT (P2). Refs are argv: REF_RE + MAX_REF_LEN before git sees them, argv-array git (no shell),
// `--end-of-options` on resolution. Path names are PR-controlled text: matched by the closed glob matcher
// below (no regex is built from them) and quoted only through `quote()` (JSON.stringify, length-capped).
//
// Usage:  node .dev/floor/check-surface-bump.mjs (--base-ref <ref> | --merge-base <ref>) [targetDir]
//         (targetDir default: cwd; git runs with cwd = targetDir)
// Non-LLM, stdlib-only, fail-closed. Apparatus: never ships to a user install, so no SKILLS_VERSION bump.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { quote } from "./changelog-core.mjs";
import { REF_RE, MAX_REF_LEN, MAX_BUFFER } from "./check-changelog-entry.mjs";

export const VERSION_PATH = "SKILLS_VERSION";
/** How many changed surface paths a RED lists before summarising the rest (P2 — bounded output). */
export const MAX_LISTED = 10;
/** How much of one path a quote shows (P2). */
export const QUOTE_LEN = 160;

/**
 * The bump-triggering product surface — CLAUDE.md "SKILLS_VERSION discipline", bound to that bullet by the
 * test. `*` matches within one path segment, `**` matches any number of segments (zero included), and an
 * exclude wins over an include.
 */
export const PRODUCT_SURFACE = Object.freeze({
  include: Object.freeze([
    "pharn/pharn-contracts/**",
    "pharn/pharn-core/**",
    "pharn/pharn-pipeline/grillers/**",
    "pharn/pharn-review/**",
    "pharn/floor/*.mjs",
    "pharn/floor/*.json",
    "pharn/CONSTITUTION.md",
    "pharn/ARCHITECTURE.md",
    "THREAT-MODEL.md",
    "LIMITS.md",
    ".claude/commands/pharn-*.md",
    ".claude/hooks/*.cjs",
    ".claude/settings.json",
    ".claude/agents/pharn-*.md",
  ]),
  exclude: Object.freeze(["**/*.test.*", ".claude/commands/pharn-dev-*.md"]),
});

/** The CLOSED set of non-GREEN outcomes, iterated by the tests (L29). */
export const REFUSAL_STATES = ["BAD_USAGE", "BASE_UNREADABLE", "HEAD_UNREADABLE", "NOT_BUMPED"];
/** The members that mean "the input is unusable" (exit 2) rather than "this PR breaks the rule" (exit 1). */
export const INPUT_STATES = ["BAD_USAGE", "BASE_UNREADABLE", "HEAD_UNREADABLE"];

/** One remedy per state, never a shared trailer (lessons-learned L27). */
export const FIX = {
  BAD_USAGE:
    "pass exactly one of --base-ref <ref> or --merge-base <ref>, then an optional target directory. A ref may use only letters, digits and . _ / ~ ^ @ { } - and must not start with '-'.",
  BASE_UNREADABLE:
    "make the base readable: fetch it first (git fetch --no-tags origin main), make sure the ref names one commit, and that SKILLS_VERSION exists at that commit.",
  HEAD_UNREADABLE: "run from — or pass as the target — the repository root that holds SKILLS_VERSION.",
  NOT_BUMPED:
    "this PR changes shipped bytes, so it bumps SKILLS_VERSION (patch: a correction to shipped bytes; minor: a new capability, command or checker; major: a breaking shape change) and opens its ## [X.Y.Z] - YYYY-MM-DD section at the top of CHANGELOG.md, moving every [Unreleased] entry into it. If a listed path should not ship, the set lives in CLAUDE.md and PRODUCT_SURFACE together.",
};

/** One glob segment (no `/`) to a predicate over one path segment. Only `*` is special. */
function segmentMatcher(seg) {
  const parts = seg.split("*");
  if (parts.length === 1) return (s) => s === seg;
  return (s) => {
    if (!s.startsWith(parts[0])) return false;
    let at = parts[0].length;
    for (let i = 1; i < parts.length - 1; i++) {
      const k = s.indexOf(parts[i], at);
      if (k === -1) return false;
      at = k + parts[i].length;
    }
    const last = parts[parts.length - 1];
    return s.length - at >= last.length && s.endsWith(last);
  };
}

/** Does `path` (a `/`-separated repo-relative path) match `pattern`? A closed matcher: no regex from input. */
export function matchesGlob(pattern, path) {
  const pat = pattern.split("/");
  const segs = path.split("/");
  const go = (i, j) => {
    if (i === pat.length) return j === segs.length;
    if (pat[i] === "**") {
      for (let k = j; k <= segs.length; k++) if (go(i + 1, k)) return true;
      return false;
    }
    return j < segs.length && segmentMatcher(pat[i])(segs[j]) && go(i + 1, j + 1);
  };
  return go(0, 0);
}

/** Is `path` in the bump-triggering product surface? */
export function isProductSurface(path, surface = PRODUCT_SURFACE) {
  return surface.include.some((p) => matchesGlob(p, path)) && !surface.exclude.some((p) => matchesGlob(p, path));
}

/** Parse argv. Returns { base: {kind, value, flag}, target } or { error }. */
export function parseArgs(argv) {
  const flags = { "--base-ref": "ref", "--merge-base": "merge-base" };
  let base = null;
  let target = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (Object.hasOwn(flags, a)) {
      if (base) return { error: `more than one base flag (${base.flag} and ${a})` };
      const value = argv[i + 1];
      if (value === undefined) return { error: `${a} needs a value` };
      base = { kind: flags[a], value, flag: a };
      i++;
    } else if (a.startsWith("-")) {
      return { error: `unknown flag ${quote(a, 60)}` };
    } else if (target !== null) {
      return { error: `more than one target directory (${quote(target, 60)} and ${quote(a, 60)})` };
    } else {
      target = a;
    }
  }
  if (!base) return { error: "no base: one of --base-ref or --merge-base is required" };
  if (base.value.length > MAX_REF_LEN || !REF_RE.test(base.value)) {
    return { error: `${base.flag} ${quote(base.value, 60)} is not an accepted ref` };
  }
  return { base, target: target ?? "." };
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: MAX_BUFFER, stdio: ["ignore", "pipe", "pipe"] });
}

const splitZ = (s) => s.split("\0").filter((p) => p.length > 0);
const versionOf = (text) => text.replace(/\r?\n$/, "");

/**
 * Read the base: resolve the commit, the changed paths base → working tree, and SKILLS_VERSION at the base.
 * Returns { sha, source, paths, baseVersion } or { error }. Any git failure is an error, never an empty set.
 */
export function readBase(base, target) {
  let stage = "resolve";
  try {
    let sha = git(["rev-parse", "--verify", "--quiet", "--end-of-options", `${base.value}^{commit}`], target).trim();
    if (base.kind === "merge-base") {
      stage = "merge-base";
      sha = git(["merge-base", "HEAD", sha], target).trim();
    }
    stage = "diff";
    const tracked = splitZ(git(["diff", "--no-renames", "--name-only", "-z", sha, "--"], target));
    stage = "untracked";
    const untracked = splitZ(git(["ls-files", "--others", "--exclude-standard", "-z"], target));
    stage = "version";
    const baseVersion = versionOf(git(["show", `${sha}:./${VERSION_PATH}`], target));
    const paths = [...new Set([...tracked, ...untracked])].sort();
    return { sha, source: `${base.flag} ${base.value} (${sha.slice(0, 12)})`, paths, baseVersion };
  } catch (e) {
    const detail = String(e.stderr || e.message || e)
      .trim()
      .split("\n")[0];
    return { error: `${base.flag} ${quote(base.value, 60)} could not be read at the ${stage} step: ${quote(detail, 160)}` };
  }
}

/** The pure core. Returns { ok, findings, stats }. */
export function judge({ paths, baseVersion, headVersion }) {
  const surface = paths.filter((p) => isProductSurface(p));
  const bumped = baseVersion !== headVersion;
  const findings = [];
  if (surface.length > 0 && !bumped) {
    const listed = surface.slice(0, MAX_LISTED).map((p) => quote(p, QUOTE_LEN));
    const more = surface.length > MAX_LISTED ? ` … and ${surface.length - MAX_LISTED} more` : "";
    findings.push({
      type: "NOT_BUMPED",
      problem: `${surface.length} product-surface path(s) changed but SKILLS_VERSION is still ${quote(headVersion, 40)}: ${listed.join(", ")}${more}.`,
    });
  }
  return { ok: findings.length === 0, findings, stats: { compared: paths.length, surface, baseVersion, headVersion } };
}

/** Render a verdict for a terminal (P2: every quoted value is JSON-quoted and capped). */
export function renderReport(res, source) {
  if (res.ok) {
    const s = res.stats;
    const what =
      s.surface.length === 0
        ? `no product-surface path changed (${s.compared} path(s) compared)`
        : `${s.surface.length} product-surface path(s) changed; SKILLS_VERSION ${quote(s.baseVersion, 40)} -> ${quote(s.headVersion, 40)}`;
    return `SURFACE-BUMP: GREEN — ${what} against the base (${source})\n`;
  }
  let out = `SURFACE-BUMP: RED — ${res.findings.length} finding(s)${source ? ` against the base (${source})` : ""}\n`;
  for (const f of res.findings) out += `- [${f.type}] ${f.problem}\n    FIX (${f.type}): ${FIX[f.type]}\n`;
  out +=
    `\nNOTE (P0): this proves SKILLS_VERSION moved when a listed path changed — never that the bump is the right\n` +
    `size, and on a pull request it runs the PR's own copy of this checker.\n`;
  return out;
}

/** CLI entry. Returns the exit code; writes through `io.out` so tests can run it in-process. */
export function main(argv = process.argv.slice(2), io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(s));
  const refuse = (type, problem, source) => {
    out(renderReport({ ok: false, findings: [{ type, problem }] }, source));
    return 2;
  };
  const args = parseArgs(argv);
  if (args.error) return refuse("BAD_USAGE", args.error);
  let isDir;
  try {
    isDir = statSync(args.target).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) return refuse("HEAD_UNREADABLE", `the target ${quote(args.target, 120)} is not a directory.`);
  // The target must be the work tree's ROOT: `git diff --name-only` prints root-relative paths, but
  // `git ls-files --others` prints cwd-relative ones and lists only the cwd's subtree, so from a
  // subdirectory the two halves of the path set would disagree (GATE-2 review R1). A git failure here is
  // left to readBase, which reports it as BASE_UNREADABLE.
  let prefix;
  try {
    prefix = git(["rev-parse", "--show-prefix"], args.target).trim();
  } catch {
    prefix = "";
  }
  if (prefix !== "")
    return refuse("HEAD_UNREADABLE", `the target ${quote(args.target, 120)} is not the repository root (it is ${quote(prefix, 120)}).`);
  const base = readBase(args.base, args.target);
  if (base.error) return refuse("BASE_UNREADABLE", base.error);
  let headVersion;
  try {
    headVersion = versionOf(readFileSync(join(args.target, VERSION_PATH), "utf8"));
  } catch {
    return refuse("HEAD_UNREADABLE", `${quote(join(args.target, VERSION_PATH), 160)} cannot be read.`, base.source);
  }
  const res = judge({ paths: base.paths, baseVersion: base.baseVersion, headVersion });
  out(renderReport(res, base.source));
  return res.ok ? 0 : 1;
}

if (import.meta.main) {
  process.exitCode = main();
}
