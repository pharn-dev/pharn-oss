#!/usr/bin/env node
// pharn/floor/command-section.mjs — print ONE section of a PHARN command file, so an orchestrator can re-read the step it
// is on after a compaction without re-reading the whole command (6.70.0, ship-step2-part — review findings ARCH-7 and
// CTX-4/CTX-5 of 2026-10-12).
//
// WHY (P7 — a measured gap, not a hypothetical). A compaction of the conversation summarises the turn that carried the
// invoked command's text like any other turn. `/pharn-ship` and `/pharn-loop` re-read their PARTS after one (each part's
// pointer says so), but nothing re-read the MAIN command, so a run resumed a 600-to-800-line procedure from a summary.
// `pharn-loop.md` is about 60 KB; its Step 5 is about 120 lines. This CLI prints the section a run is on, and both
// commands pin one line that runs it after a compaction (their "After a compaction" paragraph).
//
// WHAT IT PRINTS. `node pharn/floor/command-section.mjs <file> <heading>` reads `<file>` and finds the ONE heading line —
// a column-0 run of 2 to 6 `#`, one space, then text — outside fences and HTML comments whose text equals `<heading>`
// or starts with `<heading>` followed by a space. So `Step 1` names `## Step 1 — Entry` and not `### Step 1a — …`, and
// `Step 2.5` names `### Step 2.5 — …`. It prints that heading and every line after it, up to (not including) the next
// line that looks like a heading of the same or a higher level (fewer or equal `#`, 0–3 spaces of indent allowed — END
// is liberal, so a section never runs past a heading a renderer would show), outside fences and HTML comments; then one
// end line, `<!-- end of section: <the heading line> -->`, so a reader can tell the whole section arrived.
//
// THE FILE REFUSAL (L73 — identity by the filesystem, never by spelling). `<file>` must be spelled
// `.claude/commands/pharn-<name>.md` (lower-case kebab name, relative to the current directory), its parent directory's
// realpath must be the realpath of `<cwd>/.claude/commands` (defence in depth: the spelling already fixes the parent,
// and a `.claude/commands` that is itself a link resolves the same on both sides), and it must open as a regular file
// with O_NOFOLLOW (a symlinked leaf is refused). So the CLI reads only command files in `.claude/commands` — the bound `/pharn-loop`'s `allowed-tools`
// grant for it relies on: that grant fixes the file operand to `.claude/commands/pharn-loop.md` and leaves the heading
// free, and a third operand is a usage refusal.
//
// THE MODEL, and its failure direction (L55/L67). Fences are CommonMark's: backtick or tilde, 0–3 spaces of indent,
// closed by the same character at least as long with nothing after it; an info string holding a backtick does not open a
// backtick fence. An HTML comment opened by a line starting `<!--` (0–3 spaces) that does not close on that line runs to
// the first line holding `-->`. Three inputs are REFUSED rather than guessed, so the caller reads the whole file instead:
// a fence still open at EOF, a comment still open at EOF, and an indented fence followed by a less-indented line before
// its closer (inside a list item that line ends the fence, at top level it does not — `griller-extract.mjs` refuses the
// same construct). Not modelled: other HTML block kinds, setext headings and headings inside blockquotes or list items
// (none starts a section here, since START is column 0; an END they would cause is missed, so the section prints MORE).
// It is not differentially tested against a renderer; the fixture list in `command-section.test.mjs` enumerates the
// constructs above, and its live test reads every heading of the orchestrators' files.
//
// FLOOR (primitive #3): the printed bytes are that section by the rules above, and the refusals — regex, string
// equality and realpath identity, tested. ADVISORY: that a run executes this line after a compaction, and that the
// section it reads is the one its step needs. NOT A CLAIM: that a section holds everything a step needs (a step can cite
// another section, which the run then reads the same way).
//
// Exit: 0 the section and its end line on stdout · 2 refusal (usage; the file; no such heading; more than one; an
// unclosed fence or comment; an ambiguous fence; a section holding an end-line-shaped line), the reason on stderr and
// NOTHING on stdout, so a partial section is never printed.
//
// Usage: node pharn/floor/command-section.mjs <.claude/commands/pharn-*.md> <heading>

import "./runtime-floor.mjs";
import { closeSync, constants, fstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { stripBom } from "./frontmatter-core.mjs";

/** The only spelling of `<file>` admitted: a product or dev command file directly under `.claude/commands/`. */
export const FILE_RE = /^\.claude\/commands\/pharn-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

/** The prefix of the end line; a section line starting with it is refused (it could forge the end). */
export const END_PREFIX = "<!-- end of section: ";

const FENCE_OPEN_RE = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const START_RE = /^(#{2,6}) (.*)$/;
const END_RE = /^ {0,3}(#{1,6})(?:[ \t]|$)/;
const COMMENT_OPEN_RE = /^ {0,3}<!--/;

/** Quote any value for a refusal reason without ever throwing (L62). */
function shown(v) {
  let s;
  try {
    s = typeof v === "string" ? v : String(v);
  } catch {
    s = Object.prototype.toString.call(v);
  }
  return JSON.stringify(s.length > 200 ? `${s.slice(0, 200)}…` : s);
}

/** True when `text` names `heading`: equal to it, or `heading` followed by a space. */
export function namesHeading(text, heading) {
  return text === heading || text.startsWith(`${heading} `);
}

/**
 * Classify every line of `text` (BOM stripped, CRLF folded): [{line, code}] where `code` is true inside a fence or an
 * HTML comment (the fence and comment delimiter lines included). Returns {ok:false, reason} for the three refused
 * constructs. Pure.
 */
export function classify(text) {
  const lines = stripBom(text).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let fence = null; // {char, len, indent}
  let comment = false;
  for (const line of lines) {
    if (fence) {
      const m = line.match(FENCE_CLOSE_RE);
      if (m && m[1][0] === fence.char && m[1].length >= fence.len) fence = null;
      else if (line.trim() !== "" && line.length - line.trimStart().length < fence.indent)
        return { ok: false, reason: "an indented fence is followed by a less-indented line before its closer" };
      out.push({ line, code: true });
      continue;
    }
    if (comment) {
      if (line.includes("-->")) comment = false;
      out.push({ line, code: true });
      continue;
    }
    const open = line.match(FENCE_OPEN_RE);
    if (open && !(open[2][0] === "`" && open[3].includes("`"))) {
      fence = { char: open[2][0], len: open[2].length, indent: open[1].length };
      out.push({ line, code: true });
      continue;
    }
    if (COMMENT_OPEN_RE.test(line)) {
      if (!line.slice(line.indexOf("<!--") + 4).includes("-->")) comment = true;
      out.push({ line, code: true });
      continue;
    }
    out.push({ line, code: false });
  }
  if (fence) return { ok: false, reason: "a fence is still open at the end of the file" };
  if (comment) return { ok: false, reason: "an HTML comment is still open at the end of the file" };
  return { ok: true, lines: out };
}

/**
 * The section of `text` named by `heading` — {ok:true, section} (the heading line through the line before its end, then
 * the end line, `\n`-terminated) or {ok:false, reason}. Pure.
 */
export function sectionOf(text, heading) {
  if (typeof heading !== "string" || heading.trim() === "" || heading !== heading.trim())
    return { ok: false, reason: `heading ${shown(heading)} is empty or has surrounding space` };
  if ([...heading].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f))
    return { ok: false, reason: `heading ${shown(heading)} holds a control character` };
  const c = classify(text);
  if (!c.ok) return c;
  const starts = [];
  c.lines.forEach((l, i) => {
    if (l.code) return;
    const m = l.line.match(START_RE);
    if (m && namesHeading(m[2].trim(), heading)) starts.push({ i, level: m[1].length });
  });
  if (starts.length === 0) return { ok: false, reason: `no heading names ${shown(heading)}` };
  if (starts.length > 1)
    return {
      ok: false,
      reason: `${starts.length} headings name ${shown(heading)}: ${starts.map((s) => shown(c.lines[s.i].line)).join(", ")}`,
    };
  const { i, level } = starts[0];
  let end = c.lines.length;
  for (let k = i + 1; k < c.lines.length; k++) {
    if (c.lines[k].code) continue;
    const m = c.lines[k].line.match(END_RE);
    if (m && m[1].length <= level) {
      end = k;
      break;
    }
  }
  const body = c.lines.slice(i, end).map((l) => l.line);
  while (body.length > 1 && body.at(-1).trim() === "") body.pop();
  if (body.some((l) => l.trimStart().startsWith(END_PREFIX)))
    return { ok: false, reason: `the section named ${shown(heading)} holds a line starting ${shown(END_PREFIX)}` };
  return { ok: true, section: `${body.join("\n")}\n\n${END_PREFIX}${body[0]} -->\n` };
}

/**
 * Open `file` (relative to `cwd`) as PHARN's own command file and return {ok:true, text} or {ok:false, reason}: the
 * spelling must match FILE_RE, its parent's realpath must be `<cwd>/.claude/commands`'s, and the leaf must open as a
 * regular file without following a symlink — one descriptor for the check and the read.
 */
export function readCommandFile(file, cwd = process.cwd()) {
  if (typeof file !== "string" || !FILE_RE.test(file))
    return { ok: false, reason: `file ${shown(file)} is not spelled .claude/commands/pharn-<name>.md` };
  const abs = join(cwd, file);
  let commandsReal;
  let parentReal;
  try {
    commandsReal = realpathSync.native(join(cwd, ".claude", "commands"));
    parentReal = realpathSync.native(dirname(abs));
  } catch {
    return { ok: false, reason: `file ${shown(file)}: .claude/commands cannot be resolved from ${shown(cwd)}` };
  }
  if (parentReal !== commandsReal) return { ok: false, reason: `file ${shown(file)} is not directly in .claude/commands` };
  let fd;
  try {
    fd = openSync(abs, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (e) {
    if (e && e.code === "ELOOP") return { ok: false, reason: `file ${shown(file)} is a symlink` };
    if (e && e.code === "ENOENT") return { ok: false, reason: `file ${shown(file)} does not exist` };
    return { ok: false, reason: `file ${shown(file)} cannot be opened` };
  }
  try {
    if (!fstatSync(fd).isFile()) return { ok: false, reason: `file ${shown(file)} is not a regular file` };
    return { ok: true, text: readFileSync(fd, "utf8") };
  } catch {
    return { ok: false, reason: `file ${shown(file)} is unreadable` };
  } finally {
    closeSync(fd);
  }
}

/** The CLI over argv: {code, stdout, stderr}. */
export function run(args, cwd = process.cwd()) {
  if (args.length !== 2 || args.some((a) => a.startsWith("-")))
    return { code: 2, stdout: "", stderr: "usage: node pharn/floor/command-section.mjs <.claude/commands/pharn-*.md> <heading>\n" };
  const f = readCommandFile(args[0], cwd);
  if (!f.ok) return { code: 2, stdout: "", stderr: `command-section: ${f.reason}\n` };
  const s = sectionOf(f.text, args[1]);
  if (!s.ok) return { code: 2, stdout: "", stderr: `command-section: ${args[0]}: ${s.reason}\n` };
  return { code: 0, stdout: s.section, stderr: "" };
}

if (import.meta.main) {
  const r = run(process.argv.slice(2));
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  process.exitCode = r.code;
}
