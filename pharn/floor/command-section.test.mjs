// pharn/floor/command-section.test.mjs — the section extractor `/pharn-ship` and `/pharn-loop` re-read the step in
// progress with after a compaction (6.69.0, ship-step2-part).
//
// What is pinned, one negative control per property (L60):
//   - START: a column-0 `##`–`######` heading whose text equals the operand or starts with it and a space; `Step 1`
//     never names `Step 1a`; a heading inside a fence or an HTML comment never starts a section; two matches refuse.
//   - END: the next heading of the same or a higher level, 0–3 spaces of indent allowed, outside fences and comments; a
//     deeper heading stays inside; EOF ends the last section; trailing blank lines are dropped; one end line follows.
//   - The input kinds of the grammar it models (L67): backtick and tilde fences, a longer closer, an info string holding
//     a backtick, an indented fence, a multi-line comment, BOM, CRLF — and the three refused constructs.
//   - THE FILE: only `.claude/commands/pharn-<name>.md` by spelling, directly in `<cwd>/.claude/commands` by realpath,
//     a regular file opened without following a symlink (L73).
//   - The CLI: exactly two operands, nothing on stdout on a refusal, exit 0 / 2.
//   - LIVE: every heading of the two orchestrators' files (and the stages part) resolves, uniquely, to a contiguous
//     slice of that file; the headings the compaction rules name as examples resolve.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { END_PREFIX, FILE_RE, classify, namesHeading, readCommandFile, run, sectionOf } from "./command-section.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CLI = join(HERE, "command-section.mjs");

/** The section body (end line removed) or the refusal reason. */
const body = (text, h) => {
  const r = sectionOf(text, h);
  return r.ok ? r.section.slice(0, r.section.lastIndexOf(`\n\n${END_PREFIX}`)) : `REFUSED: ${r.reason}`;
};

const DOC = [
  "# Title",
  "",
  "intro",
  "",
  "## Step 1 — Entry",
  "",
  "one",
  "",
  "### Step 1a — sub",
  "",
  "one-a",
  "",
  "## Step 1b — sibling",
  "",
  "bee",
  "",
  "## Step 2 — Run",
  "",
  "two",
  "",
].join("\n");

test("namesHeading: equal, or the operand then a space — never a longer word", () => {
  assert.equal(namesHeading("Step 1 — Entry", "Step 1"), true);
  assert.equal(namesHeading("Step 1", "Step 1"), true);
  assert.equal(namesHeading("Step 1a — sub", "Step 1"), false);
  assert.equal(namesHeading("Step 10 — x", "Step 1"), false);
  assert.equal(namesHeading("Step 2, after GATE 1 — x", "Step 2"), false);
});

test("START and END: a ## section keeps its ### children and ends at the next ##; a ### ends at the next ### or ##", () => {
  assert.equal(body(DOC, "Step 1"), "## Step 1 — Entry\n\none\n\n### Step 1a — sub\n\none-a");
  assert.equal(body(DOC, "Step 1a"), "### Step 1a — sub\n\none-a");
  assert.equal(body(DOC, "Step 1b"), "## Step 1b — sibling\n\nbee");
  // EOF ends the last section, and trailing blank lines are dropped.
  assert.equal(body(DOC, "Step 2"), "## Step 2 — Run\n\ntwo");
  // A level-1 heading ends any section; an indented (≤3 spaces) heading ends it too (END is liberal).
  assert.equal(body("## A\n\na\n# B\n\nb\n", "A"), "## A\n\na");
  assert.equal(body("## A\n\na\n   ## B\n\nb\n", "A"), "## A\n\na");
  // A `#` run with no space after it is not a heading and does not end the section.
  assert.equal(body("## A\n\n##not\n\n## B\n", "A"), "## A\n\n##not");
  // A level-1 heading never STARTS a section, and an indented one never does either.
  assert.match(body("# A\n\na\n", "A"), /^REFUSED: no heading names "A"/);
  assert.match(body("   ## A\n\na\n", "A"), /^REFUSED: no heading names "A"/);
  // The end line names the heading line.
  const r = sectionOf(DOC, "Step 1a");
  assert.ok(r.ok && r.section.endsWith(`\n\n${END_PREFIX}### Step 1a — sub -->\n`));
});

test("REFUSALS on the heading: none, two, empty, surrounding space, a control character", () => {
  assert.match(body(DOC, "Step 3"), /^REFUSED: no heading names "Step 3"/);
  assert.match(body("## A — one\n\n## A — two\n", "A"), /^REFUSED: 2 headings name "A"/);
  assert.match(body(DOC, ""), /empty or has surrounding space/);
  assert.match(body(DOC, " Step 1"), /empty or has surrounding space/);
  assert.match(body(DOC, "Step\u00071"), /control character/);
  assert.match(body(DOC, "Step 1\n## Step 2"), /control character/);
});

test("FENCES (L67): backtick and tilde, a longer closer, a backtick info string, an indented fence", () => {
  // A heading-shaped line inside a fence neither starts nor ends a section.
  const fenced = "## A\n\n```bash\n## not a heading\n```\n\nafter\n\n## B\n";
  assert.equal(body(fenced, "A"), "## A\n\n```bash\n## not a heading\n```\n\nafter");
  assert.match(body(fenced, "not a heading"), /no heading names/);
  const tilde = "## A\n\n~~~\n## x\n~~~\n\n## B\n";
  assert.equal(body(tilde, "A"), "## A\n\n~~~\n## x\n~~~");
  // A shorter closer, or the other character, does not close; a longer one does.
  const longer = "## A\n\n````\n```\n## x\n~~~~\n`````\n\nz\n\n## B\n";
  assert.equal(body(longer, "A"), "## A\n\n````\n```\n## x\n~~~~\n`````\n\nz");
  // A backtick info string holding a backtick is not a fence, so the next line is a heading.
  assert.equal(body("## A\n\n``` a`b\n## B\n", "A"), "## A\n\n``` a`b");
  // An indented fence (inside a list item) whose content and closer are indented the same.
  const listFence = "## A\n\n1. item\n\n   ```bash\n   ## x\n   ```\n\n## B\n";
  assert.equal(body(listFence, "A"), "## A\n\n1. item\n\n   ```bash\n   ## x\n   ```");
});

test("HTML COMMENTS: a one-line comment is plain; a multi-line one hides its heading-shaped lines", () => {
  assert.equal(body("## A\n\n<!-- one line -->\n\n## B\n", "A"), "## A\n\n<!-- one line -->");
  assert.equal(body("## A\n\n<!-- open\n## hidden\n-->\n\n## B\n", "A"), "## A\n\n<!-- open\n## hidden\n-->");
  assert.match(body("## A\n\n<!-- open\n## hidden\n-->\n", "hidden"), /no heading names/);
});

test("REFUSED CONSTRUCTS: an unclosed fence, an unclosed comment, an ambiguous indented fence", () => {
  assert.match(body("## A\n\n```\n## x\n", "A"), /a fence is still open/);
  assert.match(body("## A\n\n<!-- open\n## x\n", "A"), /an HTML comment is still open/);
  assert.match(body("## A\n\n   ```\nless indented\n   ```\n", "A"), /indented fence is followed by a less-indented line/);
  assert.equal(classify("```\nx\n```\n").ok, true, "control: a closed fence classifies");
});

test("INPUT KINDS: a BOM and CRLF are read; the printed section is LF", () => {
  assert.equal(body(String.fromCharCode(0xfeff) + DOC, "Step 1b"), "## Step 1b — sibling\n\nbee");
  assert.equal(body(DOC.replace(/\n/g, "\r\n"), "Step 1b"), "## Step 1b — sibling\n\nbee");
});

test("FORGED END: a section holding an end-line-shaped line is refused", () => {
  assert.match(body(`## A\n\n${END_PREFIX}## A -->\n\n## B\n`, "A"), /holds a line starting/);
  assert.equal(body("## A\n\n<!-- end of pharn-x -->\n", "A"), "## A\n\n<!-- end of pharn-x -->", "control: a part's end line is fine");
});

/** A scratch project with `.claude/commands/` holding `files` ({name: text}). */
function scratch(files) {
  const root = mkdtempSync(join(tmpdir(), "command-section-"));
  mkdirSync(join(root, ".claude", "commands"), { recursive: true });
  for (const [n, t] of Object.entries(files)) writeFileSync(join(root, ".claude", "commands", n), t);
  return root;
}

test("THE FILE (L73): spelling, directory identity by realpath, a regular non-symlinked file", () => {
  const root = scratch({ "pharn-x.md": DOC, "pharn-dev-y.md": DOC });
  try {
    assert.equal(readCommandFile(".claude/commands/pharn-x.md", root).ok, true);
    assert.equal(readCommandFile(".claude/commands/pharn-dev-y.md", root).ok, true, "a dev command is a command file");
    for (const bad of [
      "pharn-x.md",
      "./.claude/commands/pharn-x.md",
      ".claude/commands/../commands/pharn-x.md",
      ".claude/commands/sub/pharn-x.md",
      ".claude/commands/PHARN-x.md",
      ".claude/commands/pharn-X.md",
      ".Claude/commands/pharn-x.md",
      ".claude/commands/other.md",
      ".claude/commands/pharn-x.txt",
      "/etc/passwd",
    ]) {
      assert.equal(FILE_RE.test(bad), false, bad);
      assert.match(readCommandFile(bad, root).reason, /is not spelled/, bad);
    }
    assert.match(readCommandFile(".claude/commands/pharn-none.md", root).reason, /does not exist/);
    // A symlinked leaf is refused, even when it points at a command file.
    symlinkSync(join(root, ".claude", "commands", "pharn-x.md"), join(root, ".claude", "commands", "pharn-link.md"));
    assert.match(readCommandFile(".claude/commands/pharn-link.md", root).reason, /is a symlink/);
    // A directory with a command file's name is not a regular file.
    mkdirSync(join(root, ".claude", "commands", "pharn-dir.md"));
    assert.match(readCommandFile(".claude/commands/pharn-dir.md", root).reason, /not a regular file/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  // A cwd with no .claude/commands at all is refused, never read from elsewhere.
  const empty = mkdtempSync(join(tmpdir(), "command-section-"));
  try {
    assert.match(readCommandFile(".claude/commands/pharn-x.md", empty).reason, /cannot be resolved/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test("THE FILE: a commands directory that is itself a symlink is still THE commands directory (both realpaths agree)", () => {
  // The spelling rule already fixes the parent to `.claude/commands`, so the realpath comparison is defence in depth:
  // it never refuses the real directory, and a linked one resolves to the same place on both sides. Stated, not hidden.
  const root = scratch({});
  const outside = mkdtempSync(join(tmpdir(), "command-section-out-"));
  try {
    writeFileSync(join(outside, "pharn-x.md"), DOC);
    rmSync(join(root, ".claude", "commands"), { recursive: true });
    symlinkSync(outside, join(root, ".claude", "commands"));
    assert.equal(readCommandFile(".claude/commands/pharn-x.md", root).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("CLI: exactly two operands; exit 0 prints the section; a refusal prints nothing on stdout and exits 2", () => {
  const root = scratch({ "pharn-x.md": DOC });
  try {
    const cli = (...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });
    const ok = cli(".claude/commands/pharn-x.md", "Step 1b");
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout, `## Step 1b — sibling\n\nbee\n\n${END_PREFIX}## Step 1b — sibling -->\n`);
    for (const args of [
      [],
      [".claude/commands/pharn-x.md"],
      [".claude/commands/pharn-x.md", "Step 1b", ".claude/commands/pharn-y.md"],
      ["--help", "Step 1b"],
      [".claude/commands/pharn-x.md", "-x"],
    ]) {
      const r = cli(...args);
      assert.equal(r.status, 2, JSON.stringify(args));
      assert.equal(r.stdout, "", JSON.stringify(args));
      assert.match(r.stderr, /usage:/);
    }
    const none = cli(".claude/commands/pharn-x.md", "Step 9");
    assert.equal(none.status, 2);
    assert.equal(none.stdout, "");
    assert.match(none.stderr, /no heading names "Step 9"/);
    assert.deepEqual(run([".claude/commands/pharn-x.md", "Step 1b"], root).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/** Every `##`–`######` column-0 heading outside fences and comments, with its id (text up to the first ` — `). */
function liveHeadings(text) {
  const c = classify(text);
  assert.ok(c.ok, c.reason);
  return c.lines
    .filter((l) => !l.code && /^#{2,6} /.test(l.line))
    .map((l) => {
      const t = l.line.replace(/^#+ /, "").trim();
      const cut = t.indexOf(" — ");
      return { line: l.line, id: cut >= 0 ? t.slice(0, cut) : t };
    });
}

test("LIVE: every heading of the orchestrators' files resolves uniquely, to a contiguous slice of its file", () => {
  const files = ["pharn-ship.md", "pharn-ship-stages.md", "pharn-loop.md"];
  for (const f of files) {
    const rel = `.claude/commands/${f}`;
    const read = readCommandFile(rel, REPO);
    assert.ok(read.ok, `${f}: ${read.reason}`);
    const heads = liveHeadings(read.text);
    assert.ok(heads.length >= 5, `L34: ${f} has headings to resolve`);
    for (const h of heads) {
      const r = sectionOf(read.text, h.id);
      assert.ok(r.ok, `${f}: ${JSON.stringify(h.id)} → ${r.reason}`);
      assert.ok(r.section.startsWith(`${h.line}\n`), `${f}: ${h.id} starts at its heading`);
      const b = r.section.slice(0, r.section.lastIndexOf(`\n\n${END_PREFIX}`));
      assert.ok(read.text.includes(b), `${f}: ${h.id} is a contiguous slice`);
    }
  }
  // The headings each compaction rule names as its examples resolve, through the CLI, from the repository root.
  for (const [f, h] of [
    ["pharn-ship.md", "Step 2"],
    ["pharn-ship.md", "Closing the run"],
    ["pharn-loop.md", "Step 5"],
    ["pharn-loop.md", "Step 1a"],
  ]) {
    const r = spawnSync(process.execPath, [CLI, `.claude/commands/${f}`, h], { cwd: REPO, encoding: "utf8" });
    assert.equal(r.status, 0, `${f} ${h}: ${r.stderr}`);
    assert.match(r.stdout, new RegExp(`^#{2,3} ${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`), `${f} ${h}`);
  }
  // Each pinned compaction line names exactly its own command and the extractor.
  for (const f of ["pharn-ship.md", "pharn-loop.md"]) {
    const text = readFileSync(join(REPO, ".claude", "commands", f), "utf8");
    assert.ok(text.includes(`node pharn/floor/command-section.mjs .claude/commands/${f} '<heading>'`), f);
  }
});
