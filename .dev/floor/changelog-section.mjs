#!/usr/bin/env node
// .dev/floor/changelog-section.mjs — cuts one version's CHANGELOG section into a GitHub release body (build apparatus).
//
// WHO CALLS IT: `.github/workflows/release.yml`, once per release, as
//
//     node .dev/floor/changelog-section.mjs . "$TAG" > "$RUNNER_TEMP/release-notes.md"
//
// and `gh release create --notes-file` reads that file. pharn-cli's `--ref latest` channel installs the newest release
// (pharn-cli `src/lib/release.ts`), so this body is what a user reading the release sees of what reached them.
//
// WHAT IT PRINTS (exit 0): the text of the section headed `## [X.Y.Z] - YYYY-MM-DD` for the tag `vX.Y.Z`, from the line
// after that heading to the line before the next level-2 heading, verbatim, with leading blank lines dropped (the
// grammar already trims trailing whitespace and folds CRLF). No trailing newline is added.
//
// ONE GRAMMAR (lessons-learned L35). The section and its entry boundaries come from `changelog-core.mjs`'s
// `parseChangelog`, the parser both CHANGELOG checkers use, so a heading inside a fence or an HTML comment is not a
// section here either, and the section this prints is the one `check-skills-version-recorded.mjs` judged newest.
//
// THE CAP. GitHub refuses a release body over 125,000 characters. `MAX_BODY_BYTES` counts UTF-8 BYTES, and a character
// is at least one byte, so a body within it is within GitHub's limit. A longer section is cut JUST BEFORE A TOP-LEVEL
// ENTRY — the last entry boundary at which the kept text, a blank line and the note still fit — and the note links the
// full section at the tag (`<repo>/blob/<tag>/CHANGELOG.md`). Cutting at an entry boundary is what keeps the note
// visible: the grammar recognizes an entry start only outside a fence or a raw HTML block, so the kept text can never
// end inside one that would swallow the note. When not even the text before the second entry fits, the body is the
// note alone. The largest section when this was written (`[2.1.0]`) is 20,843 bytes, so the cap is a bound, not a
// path any release has taken.
//
// THE TAG. `TAG_RE` is `^v\d+\.\d+\.\d+$`, the language pharn-cli's `RELEASE_TAG_RE` accepts
// (`/^v(\d+\.\d+\.\d+)$/` in pharn-cli `src/lib/validate.ts`, which only adds a capture group). It cannot be imported
// across repositories, so `release-workflow.test.mjs` pins this `.source`, the workflow's `TAG_RE` env value and that
// literal to one another. That pin certifies agreement with a copy, not with pharn-cli's live source (L43).
//
// EXITS (a closed set): 0 the body was printed; 1 `CHANGELOG.md` is unreadable, or holds no section — or more than one
// — for that version (refusal codes MISSING_CHANGELOG, NO_SECTION, AMBIGUOUS); 2 the usage is wrong or the tag fails
// `TAG_RE` (BAD_USAGE, BAD_TAG). ZERO LLM; every branch is a regex, equality or integer test (P5).
//
// BOUNDS (P0): the body is the CHANGELOG's text, which a reviewer approved in a pull request; this tool neither checks
// that it describes the release nor sanitizes it (GitHub renders it as Markdown). `REPO_URL` names pharn-dev/pharn-oss,
// so a fork's truncation note links upstream.
//
// It is build APPARATUS: under `.dev/floor/`, never shipped to an install, so it bumps no SKILLS_VERSION.

import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VERSION_HEADING_RE, parseChangelog } from "./changelog-core.mjs";

/** The release tag's shape — pharn-cli's RELEASE_TAG_RE language (`src/lib/validate.ts`). */
export const TAG_RE = /^v\d+\.\d+\.\d+$/;

/** A body at most this many UTF-8 bytes is within GitHub's 125,000-character release-body limit. */
export const MAX_BODY_BYTES = 125000;

/** Where the truncation note sends the reader. */
export const REPO_URL = "https://github.com/pharn-dev/pharn-oss";

const bytes = (s) => Buffer.byteLength(s, "utf8");

/** The note that ends a cut body. */
export function truncationNote(tag) {
  return `… truncated here. The full section: ${REPO_URL}/blob/${tag}/CHANGELOG.md`;
}

/**
 * The section for `version` in `changelogText`: { ok: true, lines, entryStarts } or { ok: false, code, reason }.
 * `lines` are the section's lines below its heading, leading blank lines dropped; `entryStarts` are the indexes in
 * `lines` where a top-level entry begins.
 */
export function sectionLines(changelogText, version) {
  const parsed = parseChangelog(changelogText);
  const matches = parsed.sections.filter((s) => s.kind === "VERSION" && VERSION_HEADING_RE.exec(s.key)[1] === version);
  if (matches.length === 0) return { ok: false, code: "NO_SECTION", reason: `no "## [${version}] - YYYY-MM-DD" section` };
  if (matches.length > 1) return { ok: false, code: "AMBIGUOUS", reason: `${matches.length} sections are headed [${version}]` };
  const section = matches[0];
  const all = section.text.split("\n").slice(1);
  let lead = 0;
  while (lead < all.length && all[lead].trim() === "") lead++;
  const lines = all.slice(lead);
  // An entry's `line` is 1-based in the whole file, and so is the section's heading line.
  const entryStarts = parsed.entries.filter((e) => e.section === section.key).map((e) => e.line - section.line - 1 - lead);
  return { ok: true, lines, entryStarts };
}

/** Join `lines`, cutting before the last entry boundary that fits under MAX_BODY_BYTES with the note. */
export function capBody(lines, entryStarts, tag) {
  const full = lines.join("\n");
  if (bytes(full) <= MAX_BODY_BYTES) return full;
  const note = truncationNote(tag);
  const budget = MAX_BODY_BYTES - bytes(`\n\n${note}`);
  let kept = "";
  for (const i of entryStarts) {
    if (i <= 0) continue;
    const candidate = lines.slice(0, i).join("\n").replace(/\s+$/, "");
    if (bytes(candidate) <= budget) kept = candidate;
    else break;
  }
  return kept === "" ? note : `${kept}\n\n${note}`;
}

/** The release body for `tag`: { ok: true, body } or { ok: false, code, reason }. */
export function releaseBody(changelogText, tag) {
  if (typeof tag !== "string" || !TAG_RE.test(tag))
    return { ok: false, code: "BAD_TAG", reason: `tag ${JSON.stringify(tag)} does not match ${TAG_RE.source}` };
  const section = sectionLines(changelogText, tag.slice(1));
  if (!section.ok) return section;
  return { ok: true, body: capBody(section.lines, section.entryStarts, tag) };
}

/** The CLI: returns { code, stdout, stderr } so a test can drive it in-process. */
export function run(argv) {
  if (argv.length !== 2)
    return { code: 2, stdout: "", stderr: "changelog-section: BAD_USAGE — usage: changelog-section.mjs <dir> <tag>\n" };
  const [dir, tag] = argv;
  if (!TAG_RE.test(tag))
    return { code: 2, stdout: "", stderr: `changelog-section: BAD_TAG — ${JSON.stringify(tag)} does not match ${TAG_RE.source}\n` };
  let text;
  try {
    text = readFileSync(join(dir, "CHANGELOG.md"), "utf8");
  } catch {
    return {
      code: 1,
      stdout: "",
      stderr: `changelog-section: MISSING_CHANGELOG — cannot read ${JSON.stringify(join(dir, "CHANGELOG.md"))}\n`,
    };
  }
  const result = releaseBody(text, tag);
  if (!result.ok) return { code: 1, stdout: "", stderr: `changelog-section: ${result.code} — ${result.reason}\n` };
  return { code: 0, stdout: result.body, stderr: "" };
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare; see `.dev/floor/hash-doc.mjs` for the three failure modes it has.
if (import.meta.main) {
  const { code, stdout, stderr } = run(process.argv.slice(2));
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  process.exitCode = code;
}
