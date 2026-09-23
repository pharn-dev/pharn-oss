#!/usr/bin/env node
// .dev/floor/check-changelog-entry.mjs — the per-PR CHANGELOG diff checker (build apparatus).
//
// WHAT IT ANSWERS: given the BASE CHANGELOG a pull request is merged onto and the HEAD CHANGELOG it
// produces, did the PR add at least one entry, leave every merged entry and every released heading as it
// was, and put each entry where the convention allows? Its sibling `check-skills-version-recorded.mjs`
// answers the other question — what shape the committed file must have — and both read the file through
// the one shared grammar in `changelog-core.mjs` (lessons-learned L35: one grammar, never two parsers).
//
// The GUARANTEE (P0, ARCHITECTURE §2 primitive #3 — string equality and set membership; ZERO LLM):
//
//   - a new entry exists: some head entry BODY (the text after any `YYYY-MM-DD: ` prefix) is absent at base;
//   - no merged entry was edited or deleted: every base body is still present at head, and an entry that
//     sat outside `[Unreleased]` at base is still there BYTE-IDENTICAL, date prefix included;
//   - placement: an `[Unreleased]` entry from base may sit only under `[Unreleased]` (its date may change —
//     that is the one permitted edit, and the repair for a stale entry) or under NEW (its prefix may stay or
//     go); an entry from any other section may sit only in that same section; a new entry may sit only
//     under `[Unreleased]` or NEW. EVERY head occurrence is judged, so a copy left behind in a released
//     section is caught even when the original is untouched;
//   - no released heading changed: every base level-2 heading other than `[Unreleased]` is present verbatim;
//   - a released section is frozen WHOLE: every such section's TEXT (heading to the next level-2 heading;
//     changelog-core.mjs) is byte-identical at head — so regrouping or reordering its entries, an asterisk
//     bullet, stray prose or a merge-conflict marker is refused, not missed. A section is reported under
//     the most specific state that applies: an edited, deleted or moved entry is ENTRY_CHANGED /
//     ENTRY_MISPLACED, and a section already named by one of those is not ALSO reported SECTION_CHANGED —
//     so a second, unrelated change in that section surfaces only once the first is fixed (the verdict is
//     RED throughout). A released heading that appears TWICE at head is SECTION_CHANGED, so a pristine copy
//     above the original cannot shield an edit to it;
//     `[Unreleased]` (its guidance comment and group headings) and the preamble stay editable;
//   - a new version heading appears only as the FIRST version heading (NEW = the bump); one inserted
//     between released sections is refused;
//   - a bump moves everything: when NEW exists, NO entry at head — from the base or new in this PR — may
//     sit under `[Unreleased]`, so the bump records what it ships under its own section.
//
// The refusal states — the CLOSED set, exported as REFUSAL_STATES so the tests iterate it (L29):
//
//   exit 2 (the input is unusable, so no verdict about the PR is possible):
//   - BAD_USAGE            : not exactly one base flag, an unknown flag, or a ref failing validation
//   - BASE_UNREADABLE      : the base file cannot be read, or a git call fails (including a ref that does
//                            not name exactly one commit — a range such as `main..HEAD` is refused here)
//   - HEAD_UNREADABLE      : `<targetDir>/CHANGELOG.md` cannot be read
//   - EMPTY_BASE           : the base holds no version heading. An empty base would make every head entry
//                            "new" and nothing "changed" — a vacuous GREEN (lessons-learned L34)
//   exit 1 (a verdict: this PR breaks the convention):
//   - NO_NEW_ENTRY         : no head body is absent from base
//   - ENTRY_CHANGED        : a base body is absent from head, or a released entry is no longer byte-identical
//   - ENTRY_MISPLACED      : some head occurrence sits in a section the placement rule forbids
//   - HEADING_CHANGED      : a released level-2 heading is missing or altered at head
//   - SECTION_CHANGED      : a released section's text differs at head in a way no entry-level finding names
//   - HEADING_INSERTED     : a version heading absent at base is not the first version heading at head
//   - UNRELEASED_NOT_MOVED : NEW exists and some head entry is still under `[Unreleased]`
//
// WHY THIS EXISTS (P7, at its true weight). Every merge to `main` is a release — pharn-cli installs the tip
// of `main` and `pharn update` points users at CHANGELOG.md — so the CHANGELOG is the one record a user
// reads of what reached them. The per-PR entry rule and append-only are at the maintainer's DIRECTION
// (P5 — ask the human; recorded, not dressed in an invented trigger). The closest observed failures are
// edits to released text: a committed merge-conflict marker that #249 found and dropped from between two
// released entries, and #199 (`4e3daf5`) correcting a released entry in place. HEADING_INSERTED,
// EMPTY_BASE and the per-occurrence placement rule answer NO recorded escape: each closes a bypass of this
// very rule that the plan's adversarial review found before build (a ghost section inserted mid-history; a
// vacuous empty base; a copy left in a released section). SECTION_CHANGED and the widened
// UNRELEASED_NOT_MOVED likewise close bypasses the increment's own review demonstrated with probes (a
// conflict marker or an asterisk bullet placed outside any entry; a bump that leaves its own entry in
// `[Unreleased]`). They are stated as such.
//
// BOUNDS (P0 — each one says where the verdict stops):
//
//   - It needs a BASE, so it is NOT in `npm run check` and not in /pharn-dev-verify's standard gate set. CI
//     runs it on pull requests only; /pharn-dev-ship runs it locally at GATE 2.
//   - DIRECT PUSHES to `main` are unchecked — the CI step runs on `pull_request` only. The remedy is branch
//     protection, a maintainer setting OUTSIDE this repo. Even there: `main` requires the `check` job, but
//     `enforce_admins` is false and an ADMIN MERGE bypasses required checks. So the VERDICT is floor; a RED
//     informs the merge decision and does not, by itself, stop one.
//   - The verdict is about GitHub's test merge commit AS OF the PR's last CI run. Branch protection is
//     `strict: false`, so `main` can move before the merge without a re-run; what is finally merged was
//     never judged as such. A textual conflict forces a re-run, which narrows this, never closes it.
//   - CHANGELOG.md is Prettier-formatted, so a Prettier upgrade that reformats a released entry or section
//     makes `format:check` and this check impossible to satisfy together. That is a real cost of
//     append-only, resolved by a maintainer decision (an ignore entry or an accepted admin merge), not
//     by this checker.
//   - A PR RUNS ITS OWN COPY of this checker, of `changelog-core.mjs` and of `ci.yml` (a `pull_request`
//     workflow checks out the merge). A PR that edits them is judged by the edited code; review of changes
//     to `.dev/floor/**` and `.github/workflows/**` is the backstop, and nothing here replaces it.
//   - DEPENDABOT PRs are exempt by the CI step's `if:`. A maintainer-authored dependency bump is not.
//   - The date is the AUTHORED date, not the merge date; this checker never reads a date's value at all
//     (the repo-state checker does).
//   - It proves an entry was ADDED — never that the entry describes the PR.
//   - It compares TWO TEXTS. `--base-file` accepts any file; `--base-ref` / `--merge-base` prove only which
//     commit the base bytes came from.
//   - LOCALLY, `origin/main` is a mutable alias (lessons-learned L32): it is whatever the last fetch left.
//     `--merge-base <ref>` compares against `git merge-base HEAD <ref>`, so a branch that fell behind a
//     moving `main` is judged on its OWN changes — a stale alias yields an older merge-base, never a false
//     ENTRY_CHANGED. `--base-ref <ref>` compares against that ref's TIP, which is right for CI's merge
//     checkout (`HEAD^1`) and wrong for a branch behind its base.
//   - Link-reference definitions are not part of the grammar (none exist); see changelog-core.mjs.
//
// REFS ARE UNTRUSTED ARGV (P2). git is always invoked through an argv array, never a shell — but an argv
// array blocks SHELL injection, not OPTION injection: `git show --output=<f>` writes a file. So a ref must
// match REF_RE (no leading `-`, a closed character set) and fit MAX_REF_LEN before git sees it, and the
// resolving call also passes `--end-of-options` as a second layer. Every quote of CHANGELOG text is
// length-capped and rendered through JSON.stringify.
//
// Usage:  node .dev/floor/check-changelog-entry.mjs (--base-ref <ref> | --merge-base <ref> | --base-file <path>) [targetDir]
//         (targetDir default: cwd; head = <targetDir>/CHANGELOG.md; git runs with cwd = targetDir)
// Non-LLM, stdlib-only, fail-closed. Apparatus: never ships to a user install, so no SKILLS_VERSION bump.

import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { parseChangelog, quote, PREAMBLE_KEY } from "./changelog-core.mjs";

export const CHANGELOG_PATH = "CHANGELOG.md";

/** A ref: a closed character set, no leading `-` (option injection), no whitespace or control bytes. */
export const REF_RE = /^[A-Za-z0-9][A-Za-z0-9._/~^@{}-]*$/;
/** Longer than any real ref name (a SHA is 40 or 64 hex characters); bounds what reaches git's argv. */
export const MAX_REF_LEN = 256;
/**
 * git's stdout ceiling. execFileSync's 1 MiB default would be outgrown within the file's life (the live
 * CHANGELOG is ~483 KB); 64 MiB is two orders of magnitude of headroom and still bounds a hostile blob.
 */
export const MAX_BUFFER = 64 * 1024 * 1024;
/** How many findings of ONE state a report lists before summarising the rest (P2 — bounded output). */
export const MAX_LISTED = 10;
/** How much of an entry a quote shows (P2). */
export const QUOTE_LEN = 100;

/** The CLOSED set of non-GREEN outcomes, iterated by the tests (L29). */
export const REFUSAL_STATES = [
  "BAD_USAGE",
  "BASE_UNREADABLE",
  "HEAD_UNREADABLE",
  "EMPTY_BASE",
  "NO_NEW_ENTRY",
  "ENTRY_CHANGED",
  "ENTRY_MISPLACED",
  "HEADING_CHANGED",
  "SECTION_CHANGED",
  "HEADING_INSERTED",
  "UNRELEASED_NOT_MOVED",
];
/** The members that mean "the input is unusable" (exit 2) rather than "this PR breaks the rule" (exit 1). */
export const INPUT_STATES = ["BAD_USAGE", "BASE_UNREADABLE", "HEAD_UNREADABLE", "EMPTY_BASE"];

/** One remedy per state, never a shared trailer (lessons-learned L27). */
export const FIX = {
  BAD_USAGE:
    "pass exactly one of --base-ref <ref>, --merge-base <ref> or --base-file <path>, then an optional target directory. A ref may use only letters, digits and . _ / ~ ^ @ { } - and must not start with '-'.",
  BASE_UNREADABLE:
    "make the base readable: for a ref, fetch it first (git fetch --no-tags origin <ref>) and make sure it names one commit; for a file, check the path.",
  HEAD_UNREADABLE: "run from — or pass as the target — the directory that holds CHANGELOG.md.",
  EMPTY_BASE:
    "the base holds no version section, so there is nothing to compare against — point the base at a real CHANGELOG. An empty or unrelated file would make every entry look new.",
  NO_NEW_ENTRY:
    "add at least one entry for this PR: under ## [Unreleased] as a top-level '- YYYY-MM-DD: <what changed>' line dated today, or, if this PR bumps SKILLS_VERSION, under the new version section it opens.",
  ENTRY_CHANGED:
    "a merged entry is never edited or deleted: restore it byte-for-byte, and write any correction as a NEW entry. A revert rolls forward: keep the reverted entry and add one saying it was reverted. If your branch is behind its base, rebase first — or run with --merge-base — because newer base entries read as missing here.",
  ENTRY_MISPLACED:
    "put a new entry under ## [Unreleased] (or under the version section this PR adds); move an [Unreleased] entry only into the section this PR adds; never move, copy or add into a released section.",
  HEADING_CHANGED: "a released section heading is never edited or removed: restore it verbatim.",
  SECTION_CHANGED:
    "a released section is frozen whole: restore its text byte-for-byte — entry order, group headings, blank lines and every line that belongs to no entry. Anything new about a released version is a new entry under ## [Unreleased].",
  HEADING_INSERTED:
    "a new version section may be added only ABOVE every existing one, as the bump; a section inserted between released ones rewrites history. Roll forward to a new version instead.",
  UNRELEASED_NOT_MOVED:
    "this PR opens a new version section, so it is the bump: move every [Unreleased] entry — this PR's own included — into that section (the date prefix may stay or go), leaving [Unreleased] empty or removed.",
};

/**
 * The pure core. `baseText` and `headText` are CHANGELOG contents. Returns { ok, findings, stats }, where
 * each finding is { type, problem } and `stats` counts what was compared.
 */
export function compareChangelogs(baseText, headText) {
  const base = parseChangelog(baseText);
  const head = parseChangelog(headText);
  const findings = [];
  const add = (type, problem) => findings.push({ type, problem });

  if (!base.headings.some((h) => h.kind === "VERSION")) {
    add("EMPTY_BASE", "the base CHANGELOG has no version section.");
    return { ok: false, findings, stats: null };
  }

  // ── headings ────────────────────────────────────────────────────────────────────────────────────
  const baseHeadings = new Set(base.headings.map((h) => h.text));
  const headHeadings = new Set(head.headings.map((h) => h.text));
  for (const h of base.headings) {
    if (h.kind !== "UNRELEASED" && !headHeadings.has(h.text)) {
      add("HEADING_CHANGED", `the released heading ${quote(h.text, QUOTE_LEN)} is missing or altered at head.`);
    }
  }
  const headVersions = head.headings.filter((h) => h.kind === "VERSION");
  const first = headVersions[0];
  const NEW = first && !baseHeadings.has(first.text) ? first.text : null;
  for (const h of headVersions) {
    if (h !== first && !baseHeadings.has(h.text)) {
      add("HEADING_INSERTED", `the version heading ${quote(h.text, QUOTE_LEN)} is new but not the first version section.`);
    }
  }

  // ── entries ─────────────────────────────────────────────────────────────────────────────────────
  const byBody = (entries) => {
    const m = new Map();
    for (const e of entries) m.set(e.body, [...(m.get(e.body) ?? []), e]);
    return m;
  };
  const baseByBody = byBody(base.entries);
  const headByBody = byBody(head.entries);
  const underNew = (e) => NEW !== null && e.section === NEW;

  const touched = new Set(); // sections an entry-level finding already names (see SECTION_CHANGED below)
  for (const b of base.entries) {
    const hs = headByBody.get(b.body);
    if (!hs) {
      add("ENTRY_CHANGED", `the merged entry ${quote(b.text, QUOTE_LEN)} is edited or deleted at head.`);
      touched.add(b.section);
      continue;
    }
    if (b.sectionKind === "UNRELEASED") continue; // placement is judged per head occurrence below
    const inSection = hs.filter((h) => h.section === b.section);
    if (inSection.length > 0 && !inSection.some((h) => h.text === b.text)) {
      add("ENTRY_CHANGED", `the released entry ${quote(b.text, QUOTE_LEN)} is no longer byte-identical (its date prefix changed).`);
      touched.add(b.section);
    }
    // an entry that left its section entirely is reported by the per-occurrence pass below
  }
  // A bump records what it ships under its own section: when NEW exists, [Unreleased] holds NO entry —
  // neither one carried from the base nor one this PR added (review iteration 1, R3).
  const unreleasedLeft = NEW === null ? 0 : head.entries.filter((h) => h.sectionKind === "UNRELEASED").length;
  if (unreleasedLeft > 0) {
    add("UNRELEASED_NOT_MOVED", `this PR opens ${quote(NEW, QUOTE_LEN)} but ${unreleasedLeft} entr(ies) are still under [Unreleased].`);
  }

  let fresh = 0;
  for (const h of head.entries) {
    const bs = baseByBody.get(h.body);
    if (!bs) fresh++;
    const allowed = bs
      ? bs.some((b) => (b.sectionKind === "UNRELEASED" ? h.sectionKind === "UNRELEASED" || underNew(h) : h.section === b.section))
      : h.sectionKind === "UNRELEASED" || underNew(h);
    if (!allowed) {
      const where = h.section === PREAMBLE_KEY ? "the preamble" : quote(h.section, QUOTE_LEN);
      add("ENTRY_MISPLACED", `the ${bs ? "merged" : "new"} entry ${quote(h.text, QUOTE_LEN)} sits under ${where}.`);
      touched.add(h.section);
      for (const b of bs ?? []) touched.add(b.section);
    }
  }
  if (fresh === 0) add("NO_NEW_ENTRY", "no entry at head is absent from the base.");

  // ── released sections, frozen WHOLE ───────────────────────────────────────────────────────────────
  // A section whose heading went missing is already HEADING_CHANGED. One whose heading is present must keep
  // its whole text; a difference no entry-level finding explains (a regrouping, a reordering, a line that
  // belongs to no entry) is SECTION_CHANGED. [Unreleased] and the preamble are not released.
  for (const b of base.sections) {
    if (b.kind === "UNRELEASED" || b.kind === "PREAMBLE" || touched.has(b.key)) continue;
    const hs = head.sections.filter((s) => s.key === b.key);
    if (hs.length > 1 || (hs.length === 1 && hs[0].text !== b.text)) {
      add(
        "SECTION_CHANGED",
        `the released section ${quote(b.key, QUOTE_LEN)} changed in a way no entry-level finding names (order, grouping, or a line that belongs to no entry).`
      );
    }
  }

  return {
    ok: findings.length === 0,
    findings,
    stats: { fresh, baseEntries: base.entries.length, headEntries: head.entries.length, bump: NEW },
  };
}

/** Parse argv. Returns { base: {kind, value}, target } or { error }. */
export function parseArgs(argv) {
  const flags = { "--base-ref": "ref", "--merge-base": "merge-base", "--base-file": "file" };
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
      return { error: `unknown flag ${JSON.stringify(a)}` };
    } else if (target !== null) {
      return { error: `more than one target directory (${JSON.stringify(target)} and ${JSON.stringify(a)})` };
    } else {
      target = a;
    }
  }
  if (!base) return { error: "no base: one of --base-ref, --merge-base or --base-file is required" };
  if (base.kind !== "file" && (base.value.length > MAX_REF_LEN || !REF_RE.test(base.value))) {
    return { error: `${base.flag} ${quote(base.value, 60)} is not an accepted ref` };
  }
  return { base, target: target ?? "." };
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: MAX_BUFFER, stdio: ["ignore", "pipe", "pipe"] });
}

/** Resolve a validated ref to exactly one commit SHA, or throw. */
function resolveCommit(ref, cwd) {
  return git(["rev-parse", "--verify", "--quiet", "--end-of-options", `${ref}^{commit}`], cwd).trim();
}

/** Read the base CHANGELOG. Returns { text, source } or { error }. */
export function readBase(base, target) {
  try {
    if (base.kind === "file") return { text: readFileSync(base.value, "utf8"), source: `--base-file ${base.value}` };
    let sha = resolveCommit(base.value, target);
    if (base.kind === "merge-base") sha = git(["merge-base", "HEAD", sha], target).trim();
    return { text: git(["show", `${sha}:./${CHANGELOG_PATH}`], target), source: `${base.flag} ${base.value} (${sha.slice(0, 12)})` };
  } catch (e) {
    const detail = String(e.stderr || e.message || e)
      .trim()
      .split("\n")[0];
    return { error: `${base.flag} ${quote(base.value, 60)} could not be read: ${quote(detail, 160)}` };
  }
}

/** Render a verdict for a terminal, grouped by state and capped per state (P2). */
export function renderReport(res, source) {
  if (res.ok) {
    const bump = res.stats.bump ? `; this PR opens ${JSON.stringify(res.stats.bump)}` : "";
    return (
      `CHANGELOG-ENTRY: GREEN — ${res.stats.fresh} new entr(ies) against the base (${source})${bump}; ` +
      `no merged entry or released heading changed\n`
    );
  }
  let out = `CHANGELOG-ENTRY: RED — ${res.findings.length} finding(s)${source ? ` against the base (${source})` : ""}\n`;
  const perState = new Map();
  for (const f of res.findings) {
    const n = (perState.get(f.type) ?? 0) + 1;
    perState.set(f.type, n);
    if (n <= MAX_LISTED) out += `- [${f.type}] ${f.problem}\n`;
  }
  for (const [type, n] of perState) {
    if (n > MAX_LISTED) out += `- [${type}] … and ${n - MAX_LISTED} more\n`;
    out += `    FIX (${type}): ${FIX[type]}\n`;
  }
  out +=
    `\nNOTE (P0): this compares two CHANGELOG texts. It never verifies that an entry describes the change,\n` +
    `and on a pull request it runs the PR's own copy of this checker.\n`;
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
  // The target is checked BEFORE git runs in it: a missing directory would otherwise surface as a git
  // spawn error under BASE_UNREADABLE, whose "fetch it first" remedy cannot help (lessons-learned L27).
  let isDir;
  try {
    isDir = statSync(args.target).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) return refuse("HEAD_UNREADABLE", `the target ${quote(args.target, 120)} is not a directory.`);
  const base = readBase(args.base, args.target);
  if (base.error) return refuse("BASE_UNREADABLE", base.error);
  let head;
  try {
    head = readFileSync(join(args.target, CHANGELOG_PATH), "utf8");
  } catch {
    return refuse("HEAD_UNREADABLE", `${JSON.stringify(join(args.target, CHANGELOG_PATH))} cannot be read.`, base.source);
  }
  const res = compareChangelogs(base.text, head);
  out(renderReport(res, base.source));
  if (res.ok) return 0;
  return res.findings.some((f) => INPUT_STATES.includes(f.type)) ? 2 : 1;
}

if (import.meta.main) {
  process.exitCode = main();
}
