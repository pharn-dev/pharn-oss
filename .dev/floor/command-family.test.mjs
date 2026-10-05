// .dev/floor/command-family.test.mjs — the COMMAND PARTS rules (6.32.0, orchestrator-context).
//
// `/pharn-loop` and `/pharn-ship` keep the text a run needs only at one point in PART files: a quick part, read only for
// a `--quick` run at entry, and a close part, read once — the loop's at its first stop, ship's with step 7's return
// marker after the first verify or at an earlier STOP. The rules below range over the parts
// DISCOVERED from frontmatter (`part_of:` / `part:`, `.dev/floor/command-family.mjs`) — never over a list written here —
// except R1, whose job is to be the closed expectation (L36). Each rule is a function over a {file → text} map, so its
// negative control runs the SAME predicate on a mutated copy (L60: one control per asserted property).
//
//   R1 closure — the parts on disk are exactly {pharn-loop: quick, close; pharn-ship: quick, close}, both ways; every
//      `part_of:` names a command file that is not itself a part.
//   R2 frontmatter — every part is hidden from both invocation paths (`disable-model-invocation: true`,
//      `user-invocable: false`), is `kind: pharn-owned` / `trust: trusted`, and carries no `model:`, `effort:`, `reads:`
//      or `writes:` (it runs inside its command's turn and scope).
//   R3 installed — every part is a top-level `pharn-*.md`, not `pharn-dev-*`, whose name matches pharn-cli's
//      COPY_FILENAME_RE (pharn-cli 0.7.0 `src/lib/validate.ts:18`; the copy filter is `src/lib/install-capabilities.ts`
//      232-236 and `src/lib/install-manifest.ts` 148-154 — another repository, so the rule is restated here and dated).
//   R4 framing — a part's first line after its frontmatter is its `# ` title and its last line is
//      `<!-- end of <stem> -->`, and its command's pointer names both, verbatim.
//   R5 one load instruction — the command names the part's path exactly once, inside the pointer section its kind
//      requires (quick → `## Quick mode`; close → the command's LAST `##` section), and that pointer carries the pinned
//      sentences (POINTER_PINS): the Read, the trusted-text and untrusted-path sentences, the compaction re-read, and —
//      per part — its loading condition and its not-loaded rule. Each pin has its own negative control.
//   R5b no second load — a part's file name appears in no command text but its pointer (and, for a quick part, its
//      sibling close part's claims block), across every `.md` in the commands directory.
//   R6 no duplication — no non-empty fenced line, `##`/`###` heading or prose paragraph of at least 80 characters
//      appears in two files of one command (its file and its parts).
//   R7 placement — every stop-procedure heading lives in the close part and nowhere else in the command; the main file
//      keeps its entry-to-stop headings; the quick part holds the numbered deltas and the main `## Quick mode` holds
//      none.
//   R8 dev-only helper — no non-test file under `pharn/` or `.claude/hooks/` names `command-family.mjs` (an install
//      ships without `.dev/`).
//
// ── Honest scope (P0) ─────────────────────────────────────────────────────────────────────────────────────────────
// FLOOR: the TEXT and the FILE NAMES — which step headings each file holds (R7), that no fenced line, heading or long
// paragraph sits in two files of a command (R6), one load pointer per part with its pinned sentences (R5), no other
// command text naming a part (R5b), and the installer's name rule as of pharn-cli 0.7.0. NOT pinned: the file of a
// body line under an unchanged heading (a fenced line moved from Step 7 to Step 5 passes — REVIEW.md FG2), and a
// sentence that sends a run to a part without its file name. NOT guaranteed, and never claimed: that a run reads a part at that
// point, or at all (a Read is invisible to every hook); that Claude Code honours the two frontmatter keys on a command
// FILE (documented for skills, and for command files by the docs' "same frontmatter" sentence; probed once live in
// BUILD.md); that an older pharn-cli copies the parts (read in 0.7.0 only).

import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PART_KINDS, allParts, commandFamilyText, commandParts, frontmatterFields, withoutFrontmatter } from "./command-family.mjs";

const REPO = new URL("../../", import.meta.url).pathname;
const COMMANDS_DIR = join(REPO, ".claude", "commands");

/** Every `.md` file in a commands directory as {file → text}. */
function loadDir(dir) {
  return new Map(
    readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => [f, readFileSync(join(dir, f), "utf8")])
  );
}

/** The parts in a {file → text} map — [{file, parent, part, fm}] — read from frontmatter only. */
function partsOf(files) {
  const out = [];
  for (const [file, text] of files) {
    const fm = frontmatterFields(text);
    if (fm && Object.hasOwn(fm, "part_of")) out.push({ file, parent: fm.part_of, part: fm.part ?? null, fm });
  }
  return out;
}

const EXPECTED_PARTS = Object.freeze({ "pharn-loop": ["quick", "close"], "pharn-ship": ["quick", "close"] });

// ── R1 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function closureOffenders(files) {
  const out = [];
  const parts = partsOf(files);
  const partFiles = new Set(parts.map((p) => p.file));
  const seen = {};
  for (const p of parts) {
    const parentFile = `${p.parent}.md`;
    if (!files.has(parentFile)) out.push(`${p.file}: part_of names ${parentFile}, which does not exist`);
    else if (partFiles.has(parentFile)) out.push(`${p.file}: part_of names ${parentFile}, which is itself a part`);
    (seen[p.parent] ??= []).push(p.part);
  }
  for (const [parent, kinds] of Object.entries(seen)) {
    const want = EXPECTED_PARTS[parent];
    if (!want) out.push(`${parent}: has parts, and is not a command expected to have any`);
    else if (JSON.stringify([...kinds].sort()) !== JSON.stringify([...want].sort()))
      out.push(`${parent}: parts ${JSON.stringify(kinds)}, expected ${JSON.stringify(want)}`);
  }
  for (const parent of Object.keys(EXPECTED_PARTS)) if (!seen[parent]) out.push(`${parent}: expected parts, found none`);
  return out;
}

// ── R2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const REQUIRED_FIELDS = Object.freeze({
  "disable-model-invocation": "true",
  "user-invocable": "false",
  kind: "pharn-owned",
  trust: "trusted",
});
const FORBIDDEN_FIELDS = Object.freeze(["model", "effort", "reads", "writes"]);

function frontmatterOffenders(files) {
  const out = [];
  for (const p of partsOf(files)) {
    for (const [k, v] of Object.entries(REQUIRED_FIELDS)) if (p.fm[k] !== v) out.push(`${p.file}: ${k} must be ${v}`);
    for (const k of FORBIDDEN_FIELDS) if (Object.hasOwn(p.fm, k)) out.push(`${p.file}: carries ${k}:`);
    if (!PART_KINDS.includes(p.part)) out.push(`${p.file}: part ${JSON.stringify(p.part)} not in ${PART_KINDS.join(", ")}`);
    if (p.file !== `${p.parent}-${p.part}.md`) out.push(`${p.file}: a ${p.part} part of ${p.parent} is named ${p.parent}-${p.part}.md`);
  }
  return out;
}

// ── R3 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// pharn-cli 0.7.0, src/lib/validate.ts:18 — restated, since the CLI is another repository.
const PHARN_CLI_COPY_FILENAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*\.(md|cjs|mjs|json)$/;
/** pharn-cli 0.7.0's product-command filter (install-capabilities.ts 232-236): top-level, `pharn-`, not `pharn-dev-`, `.md`. */
const installedByPharnCli = (name) =>
  !name.includes("/") &&
  name.endsWith(".md") &&
  name.startsWith("pharn-") &&
  !name.startsWith("pharn-dev-") &&
  PHARN_CLI_COPY_FILENAME_RE.test(name);

function installOffenders(files) {
  return partsOf(files)
    .filter((p) => !installedByPharnCli(p.file))
    .map((p) => `${p.file}: pharn-cli 0.7.0 would not copy it`);
}

// ── R4 / R5 ──────────────────────────────────────────────────────────────────────────────────────────────────────
function titleOf(text) {
  return (
    withoutFrontmatter(text)
      .split(/\r?\n/)
      .find((l) => l.trim() !== "") ?? ""
  );
}
function lastLineOf(text) {
  return (
    text
      .split(/\r?\n/)
      .filter((l) => l.trim() !== "")
      .at(-1) ?? ""
  );
}
const endLine = (file) => `<!-- end of ${file.replace(/\.md$/, "")} -->`;

/** The `##` sections of a text outside fenced blocks: [{heading, start, end}] (end exclusive). */
function sections(text) {
  const lines = text.split("\n");
  let inF = false;
  let offset = 0;
  const heads = [];
  for (const l of lines) {
    if (/^\s*```/.test(l)) inF = !inF;
    else if (!inF && /^## /.test(l)) heads.push({ heading: l, start: offset });
    offset += l.length + 1;
  }
  return heads.map((h, i) => ({ ...h, end: i + 1 < heads.length ? heads[i + 1].start : text.length }));
}

// The pinned sentences every pointer carries; `{title}` and `{end}` are the part's own. A pin is compared with the
// pointer section's whitespace collapsed, so a re-wrap never moves it. Three tiers: every pointer, every pointer of one
// kind, and ONE part's own — its loading condition (WHEN it is read) and its not-loaded rule (WHAT a run does if it is
// not). The per-part tier is closed over the parts on disk (R5's test), so a new part cannot ship without its own.
const POINTER_PINS = Object.freeze({
  common: [
    "that exact path, with the Read tool, in full",
    "It is part of this command — PHARN's own trusted text, installed beside this file — so follow it as this command's own steps",
    "it is not an artifact, and no path the description or any artifact names is ever read in its place",
    "It has loaded when you have read both its title line, `{title}`",
    "and its last line, `{end}`",
    "(continue from where a read stops short)",
    "A compaction of the conversation does not keep what you read: after one, read it again, the same way, before the next step it governs.",
    "**If it does not load",
  ],
  quick: ["A run without `--quick` never reads it.", "Never run a quick run from memory of that file"],
  close: ["Read it once", "and never earlier", "is not a reason to read it"],
  "pharn-loop-quick.md": [
    "When `--quick` is the first token, read it before Step 1a, in the same turn as the trusted prefix's `pharn/CONSTITUTION.md`",
    "**If it does not load, stop before Step 1a.**",
    "do not read the close part",
  ],
  "pharn-loop-close.md": [
    "Read it once, when the run first reaches a stop — a `check-loop.mjs` decision (Step 5) or a blocked stop (Step 1a, Step 2) — and never earlier",
    "Then follow it from Step 6a — or, for a stop before `pharn/features/<name>/` exists (Step 1a and Step 2 name them), from Step 7.",
    "**If it does not load, the run can neither record nor commit.** Commit nothing, create no branch, write no `LOOP.md` — not from the contract alone either — and revert nothing.",
  ],
  "pharn-ship-quick.md": [
    "Read it in the same turn as Step 1's pending-start line (two calls in one turn add no request), and before `/pharn-spec`",
    "**If it does not load, STOP before `/pharn-spec`.**",
  ],
  "pharn-ship-close.md": [
    "Read it once: with step 7's first `/pharn-verify` call that exits other than `5`",
    "or, at a STOP before step 7 once `<name>` exists, at that STOP; and never earlier: not at GATE 1",
    "**If it does not load, write nothing more.**",
    "say that `SHIP.md`, `cost.json` and `RUN-REPORT.md` were not written",
  ],
});

/** The pins one part's pointer must carry, with the part's own title and end line substituted. */
function pinsFor(p, title) {
  return [...POINTER_PINS.common, ...(POINTER_PINS[p.part] ?? []), ...(POINTER_PINS[p.file] ?? [])].map((pin) =>
    pin.replace("{title}", title).replace("{end}", endLine(p.file))
  );
}

function pointerOffenders(files) {
  const out = [];
  for (const p of partsOf(files)) {
    const parentFile = `${p.parent}.md`;
    const main = files.get(parentFile);
    const partText = files.get(p.file);
    if (main === undefined) continue; // R1's finding
    const path = `.claude/commands/${p.file}`;
    const title = titleOf(partText);
    if (!/^# \S/.test(title)) out.push(`${p.file}: the first line after the frontmatter must be its # title`);
    if (lastLineOf(partText) !== endLine(p.file)) out.push(`${p.file}: the last line must be ${endLine(p.file)}`);
    if (!Object.hasOwn(POINTER_PINS, p.file)) out.push(`${p.file}: no pins of its own (its loading condition and not-loaded rule)`);
    const hits = main.split(path).length - 1;
    if (hits !== 1) {
      out.push(`${parentFile}: names ${path} ${hits} times, expected exactly once`);
      continue;
    }
    const at = main.indexOf(path);
    const secs = sections(main);
    const sec = secs.find((s) => at >= s.start && at < s.end);
    if (!sec) {
      out.push(`${parentFile}: ${path} is named outside every ## section`);
      continue;
    }
    if (p.part === "quick" && !/^## Quick mode\b/.test(sec.heading))
      out.push(`${parentFile}: the quick part is named in "${sec.heading}", not in ## Quick mode`);
    if (p.part === "close" && sec !== secs.at(-1))
      out.push(`${parentFile}: the close part is named in "${sec.heading}", not in the command's last ## section`);
    const body = main.slice(sec.start, sec.end).replace(/\s+/g, " ");
    for (const want of pinsFor(p, title)) if (!body.includes(want)) out.push(`${parentFile}: its ${p.part} pointer lacks: ${want}`);
  }
  return out;
}

// ── R5b ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// No second load instruction ANYWHERE: a part's file name may appear in command text only where this table says —
// once in its command's pointer (R5 fixes that section), and, for a quick part, once in its sibling close part's
// claims block, which states when each part is read. Every other `.md` in the commands directory — the other parts,
// every other command, the dev commands — must not name it. Bound: a sentence that sends a run to a part WITHOUT its
// file name ("read the close part now") is not caught; the name is what a Read needs, and what this rule counts.
function allowedMentions(p) {
  const at = { [`${p.parent}.md`]: { count: 1, section: null } };
  if (p.part === "quick") at[`${p.parent}-close.md`] = { count: 1, section: "## What you may claim" };
  return at;
}

function mentionOffenders(files) {
  const out = [];
  for (const p of partsOf(files)) {
    const allowed = allowedMentions(p);
    for (const [file, text] of files) {
      const body = withoutFrontmatter(text);
      const hits = body.split(p.file).length - 1;
      const rule = allowed[file];
      if (!rule) {
        if (hits) out.push(`${file}: names ${p.file} ${hits} time(s); only its pointer may`);
        continue;
      }
      if (hits !== rule.count) out.push(`${file}: names ${p.file} ${hits} time(s), expected ${rule.count}`);
      else if (rule.section) {
        const at = body.indexOf(p.file);
        const sec = sections(body).find((s) => at >= s.start && at < s.end);
        if (!sec || !sec.heading.startsWith(rule.section)) out.push(`${file}: names ${p.file} outside ${rule.section}`);
      }
    }
  }
  return out;
}

/** A mutant that rewrites the first place `pin` sits in `text`, matched across any line wrap (a control's anchor). */
function breakPin(text, pin) {
  const re = new RegExp(
    pin
      .split(/\s+/)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+")
  );
  assert.match(text, re, `anchor (L60): the pin sits in the text — ${pin}`);
  return text.replace(re, "CHANGED");
}

// ── R6 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function units(text) {
  const body = withoutFrontmatter(text);
  const out = new Set();
  let inF = false;
  for (const l of body.split("\n")) {
    if (/^\s*```/.test(l)) {
      inF = !inF;
      continue;
    }
    if (inF) {
      if (l.trim()) out.add(`fenced line: ${l.trim()}`);
    } else if (/^#{2,3} /.test(l)) out.add(`heading: ${l.trim()}`);
  }
  for (const para of body.replace(/```[\s\S]*?```/g, "").split(/\n\s*\n/)) {
    const flat = para.replace(/\s+/g, " ").trim();
    if (flat.length >= 80) out.add(`paragraph: ${flat.slice(0, 100)}…`);
  }
  return out;
}

function duplicationOffenders(files) {
  const out = [];
  const byParent = new Map();
  for (const p of partsOf(files)) byParent.set(p.parent, [...(byParent.get(p.parent) ?? []), p.file]);
  for (const [parent, partFiles] of byParent) {
    const group = [`${parent}.md`, ...partFiles].filter((f) => files.has(f));
    const u = group.map((f) => units(files.get(f)));
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++)
        for (const x of u[i]) if (u[j].has(x)) out.push(`${group[i]} and ${group[j]} both carry ${x}`);
  }
  return out;
}

// ── R7 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const PLACEMENT = Object.freeze({
  "pharn-loop": {
    main: [
      "## Step 1 — ",
      "### Step 1a — ",
      "### Step 1b — ",
      "## Step 2 — ",
      "## Running a stage",
      "## Quick mode — ",
      "## Step 3 — ",
      "## Step 4 — ",
      "## Step 5 — ",
    ],
    close: [
      "## Step 6 — ",
      "### Step 6a — ",
      "### Step 6b — ",
      "### Step 6c — ",
      "### Step 6d — ",
      "## Step 7 — ",
      "## What you may claim",
      "## Final step — ",
    ],
    quickItems: 9,
  },
  "pharn-ship": {
    main: ["## The two human gates", "## Step 1 — ", "## Running a stage", "## Quick mode — ", "## Step 2 — ", "## Step 2b — "],
    close: [
      "## Step 2c — ",
      "## Step 2d — ",
      "## Step 3 — ",
      "## Step 3a — ",
      "## Step 3b — ",
      "## What you may claim",
      "## Final step — ",
    ],
    quickItems: 12,
  },
});

function headingLines(text) {
  let inF = false;
  return withoutFrontmatter(text)
    .split("\n")
    .filter((l) => {
      if (/^\s*```/.test(l)) inF = !inF;
      return !inF && /^#{2,3} /.test(l);
    });
}
const countHeading = (text, prefix) => headingLines(text).filter((h) => h.startsWith(prefix)).length;
/** The numbered delta items `N. **…` at the start of a line, outside fences. */
function deltaItems(text) {
  let inF = false;
  return withoutFrontmatter(text)
    .split("\n")
    .filter((l) => {
      if (/^\s*```/.test(l)) inF = !inF;
      return !inF && /^\d+\. \*\*/.test(l);
    })
    .map((l) => Number(l.match(/^(\d+)\./)[1]));
}

function placementOffenders(files) {
  const out = [];
  for (const [parent, want] of Object.entries(PLACEMENT)) {
    const main = files.get(`${parent}.md`);
    const close = files.get(`${parent}-close.md`);
    const quick = files.get(`${parent}-quick.md`);
    if (main === undefined || close === undefined || quick === undefined) {
      out.push(`${parent}: a file of the command is missing`);
      continue;
    }
    for (const h of want.main) {
      if (countHeading(main, h) !== 1) out.push(`${parent}.md: must carry "${h}" exactly once`);
      if (countHeading(close, h) + countHeading(quick, h) !== 0) out.push(`${parent}: "${h}" must stay in ${parent}.md`);
    }
    for (const h of want.close) {
      if (countHeading(close, h) !== 1) out.push(`${parent}-close.md: must carry "${h}" exactly once`);
      if (countHeading(main, h) + countHeading(quick, h) !== 0) out.push(`${parent}: "${h}" must live only in ${parent}-close.md`);
    }
    const items = deltaItems(quick);
    const expect = Array.from({ length: want.quickItems }, (_, i) => i + 1);
    if (JSON.stringify(items) !== JSON.stringify(expect))
      out.push(`${parent}-quick.md: delta items ${JSON.stringify(items)}, expected 1…${want.quickItems}`);
    const qs = sections(main).find((s) => /^## Quick mode\b/.test(s.heading));
    if (!qs) out.push(`${parent}.md: no ## Quick mode section (L60: an anchor that is not found fails)`);
    else if (deltaItems(main.slice(qs.start, qs.end)).length !== 0)
      out.push(`${parent}.md: its ## Quick mode pointer carries numbered deltas`);
  }
  return out;
}

// ── R8 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function walk(dir, rel = "") {
  const out = [];
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "test-fixtures") continue;
      out.push(...walk(dir, r));
    } else out.push(r);
  }
  return out;
}
const isTestFile = (f) => /\.test\.(mjs|cjs|js)$/.test(f);
function shippedHelperOffenders(entries) {
  return entries
    .filter(([f, text]) => !isTestFile(f) && text.includes("command-family.mjs"))
    .map(([f]) => `${f}: a shipped file names command-family.mjs`);
}
function shippedEntries() {
  const out = [];
  for (const root of ["pharn", ".claude/hooks"]) {
    for (const f of walk(join(REPO, root))) {
      const p = join(REPO, root, f);
      if (statSync(p).size > 2_000_000) continue;
      out.push([`${root}/${f}`, readFileSync(p, "utf8")]);
    }
  }
  return out;
}

// ── the tests ─────────────────────────────────────────────────────────────────────────────────────────────────────
const LIVE = loadDir(COMMANDS_DIR);
const clone = (m) => new Map(m);
const edit = (m, file, fn) => {
  const c = clone(m);
  c.set(file, fn(c.get(file)));
  return c;
};

test("R1 — the parts on disk are exactly the expected four, and every part_of names a command (closure, both ways)", () => {
  assert.equal(partsOf(LIVE).length, 4, "L34: the part set is counted");
  assert.deepEqual(closureOffenders(LIVE), []);
  // CONTROLS (L60): a fifth part, a dropped part, a part_of naming a missing command, a part naming a part.
  const fifth = clone(LIVE);
  fifth.set("pharn-verify-close.md", LIVE.get("pharn-loop-close.md").replace("part_of: pharn-loop", "part_of: pharn-verify"));
  assert.match(closureOffenders(fifth).join("\n"), /pharn-verify: has parts/);
  const dropped = clone(LIVE);
  dropped.delete("pharn-ship-quick.md");
  assert.match(closureOffenders(dropped).join("\n"), /pharn-ship: parts \["close"\]/);
  assert.match(
    closureOffenders(edit(LIVE, "pharn-loop-quick.md", (t) => t.replace("part_of: pharn-loop", "part_of: pharn-nope"))).join("\n"),
    /does not exist/
  );
  assert.match(
    closureOffenders(edit(LIVE, "pharn-loop-quick.md", (t) => t.replace("part_of: pharn-loop", "part_of: pharn-loop-close"))).join("\n"),
    /itself a part/
  );
});

test("R2 — every part is hidden from both invocation paths, trusted, and carries no model, effort, reads or writes", () => {
  assert.deepEqual(frontmatterOffenders(LIVE), []);
  for (const p of partsOf(LIVE)) {
    // CONTROLS (L60), per part: each required key dropped, and a forbidden key added, are red.
    for (const k of Object.keys(REQUIRED_FIELDS)) {
      const m = edit(LIVE, p.file, (t) => t.replace(new RegExp(`^${k}:.*\\n`, "m"), ""));
      assert.match(frontmatterOffenders(m).join("\n"), new RegExp(`${p.file}: ${k} must be`), `${p.file} without ${k}`);
    }
    const withModel = edit(LIVE, p.file, (t) => t.replace("trust: trusted\n", "trust: trusted\nmodel: opus\n"));
    assert.match(frontmatterOffenders(withModel).join("\n"), new RegExp(`${p.file}: carries model:`));
  }
});

test("R3 — every part is a file pharn-cli 0.7.0 copies into an installed project", () => {
  assert.deepEqual(installOffenders(LIVE), []);
  for (const p of partsOf(LIVE)) assert.ok(installedByPharnCli(p.file), p.file);
  // CONTROLS (L60): a dotted name, a dev prefix, a nested path and an upper-case name are each refused.
  for (const bad of ["pharn-loop.quick.md", "pharn-dev-loop-quick.md", "pharn/loop-quick.md", "pharn-Loop-quick.md", "loop-quick.md"])
    assert.equal(installedByPharnCli(bad), false, bad);
});

/** `main` with `pin` rewritten inside the ONE section that names `path` — a control scoped to that part's pointer. */
function breakPinIn(main, path, pin) {
  const sec = sections(main).find((s) => {
    const at = main.indexOf(path);
    return at >= s.start && at < s.end;
  });
  assert.ok(sec, `anchor (L60): ${path} sits in a ## section`);
  return main.slice(0, sec.start) + breakPin(main.slice(sec.start, sec.end), pin) + main.slice(sec.end);
}

test("R4/R5 — every part is framed by its title and end line, and its command loads it from ONE pointer that names both", () => {
  assert.deepEqual(pointerOffenders(LIVE), []);
  // Every part has pins of its own, and no pin tier names a part that is not on disk (closure, both ways — L36).
  const partFiles = partsOf(LIVE).map((p) => p.file);
  const ownKeys = Object.keys(POINTER_PINS).filter((k) => k.endsWith(".md"));
  assert.deepEqual([...ownKeys].sort(), [...partFiles].sort(), "the per-part pin tier is exactly the parts on disk");
  for (const p of partsOf(LIVE)) {
    const parentFile = `${p.parent}.md`;
    const path = `.claude/commands/${p.file}`;
    const title = titleOf(LIVE.get(p.file));
    // CONTROL: the # title dropped to prose.
    const noTitle = edit(LIVE, p.file, (t) => t.replace(`\n${title}\n`, `\n${title.replace(/^# /, "")}\n`));
    assert.match(pointerOffenders(noTitle).join("\n"), /must be its # title/, `${p.file} without its # title`);
    // CONTROLS (L60): EVERY pin of this part's pointer, rewritten in that pointer alone, is red — one per property.
    for (const pin of pinsFor(p, title)) {
      const broken = edit(LIVE, parentFile, (t) => breakPinIn(t, path, pin));
      assert.ok(
        pointerOffenders(broken).includes(`${parentFile}: its ${p.part} pointer lacks: ${pin}`),
        `${parentFile}: its ${p.part} pointer without "${pin}" must be red`
      );
    }
    // CONTROL: the end line dropped.
    const noEnd = edit(LIVE, p.file, (t) => t.replace(`${endLine(p.file)}\n`, ""));
    assert.match(pointerOffenders(noEnd).join("\n"), /the last line must be/, `${p.file} without its end line`);
    // CONTROL: the load instruction deleted (the path no longer named).
    const noLoad = edit(LIVE, parentFile, (t) => t.replace(path, ".claude/commands/elsewhere.md"));
    assert.match(pointerOffenders(noLoad).join("\n"), /0 times, expected exactly once/, `${parentFile} without its ${p.part} load`);
    // CONTROL: a second mention (an eager or duplicated load).
    assert.ok(LIVE.get(parentFile).includes("\n## Step 1 — "), "anchor (L60)");
    const twice = edit(LIVE, parentFile, (t) => t.replace("\n## Step 1 — ", `\nRead \`${path}\` now.\n\n## Step 1 — `));
    assert.match(pointerOffenders(twice).join("\n"), /2 times, expected exactly once/, `${parentFile} naming ${p.file} twice`);
    // CONTROL: the not-loaded rule deleted from the pointer.
    const noFallback = edit(LIVE, parentFile, (t) => t.replaceAll("**If it does not load", "**When it loads"));
    assert.match(pointerOffenders(noFallback).join("\n"), /lacks: \*\*If it does not load/, `${parentFile} without the not-loaded rule`);
  }
  // CONTROL: the quick load moved out of ## Quick mode (into Step 3), and the close load moved off the last section.
  const loopQuickPath = ".claude/commands/pharn-loop-quick.md";
  const movedQuick = edit(LIVE, "pharn-loop.md", (t) =>
    t
      .replace(loopQuickPath, ".claude/commands/elsewhere.md")
      .replace("## Step 3 — The SPEC", `## Step 3 — The SPEC\n\nRead \`${loopQuickPath}\`.\n`)
  );
  assert.match(pointerOffenders(movedQuick).join("\n"), /the quick part is named in "## Step 3/);
  const shipClosePath = ".claude/commands/pharn-ship-close.md";
  const movedClose = edit(LIVE, "pharn-ship.md", (t) =>
    t.replace(shipClosePath, ".claude/commands/elsewhere.md").replace("## Step 2b — ", `Read \`${shipClosePath}\`.\n\n## Step 2b — `)
  );
  assert.match(pointerOffenders(movedClose).join("\n"), /the close part is named in "## Step 2 — /);
  // REGRESSION (REVIEW.md FG1): the review's five pointer mutants — a load point moved or a not-loaded rule rewritten,
  // each of which left the 6.32.0 build's suite green — are each red now.
  const mutants = [
    [
      "pharn-loop.md",
      "When `--quick` is the first token, read it before Step 1a",
      "When `--quick` is anywhere in the description, read it before Step 5",
    ],
    ["pharn-loop.md", "Read it once, when the run first reaches a stop", "Read it once, at the start of Step 3"],
    ["pharn-ship.md", "with step 7's first `/pharn-verify` call that exits other than `5`", "with `/pharn-plan`'s stage-start marker"],
    ["pharn-ship.md", "Read it in the same turn as Step 1's pending-start line", "Read it after GATE 2"],
    ["pharn-loop.md", "Commit nothing, create no branch, write no `LOOP.md`", "Write `LOOP.md` from the contract and commit it"],
  ];
  for (const [file, from, to] of mutants) {
    const m = edit(LIVE, file, (t) => {
      const re = new RegExp(
        from
          .split(" ")
          .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("\\s+")
      );
      assert.match(t, re, `anchor (L60): ${from}`);
      return t.replace(re, to);
    });
    assert.match(pointerOffenders(m).join("\n"), /pointer lacks: /, `${file}: "${from}" → "${to}" must be red`);
  }
});

// 6.43.0 GATE-2 review R4: step 7's verify is a `stage-direct.mjs` call that writes its own return marker, so the close
// part loads with "the first verify call that exits other than 5" — said ALIKE in the pointer (pinned above) and in the
// close part's own title paragraph and claims bullet, with the old "return marker after the first" wording nowhere.
function shipCloseLoadOffenders(m) {
  const NEW = /with\s+step\s+7's\s+first\s+`\/pharn-verify`\s+call\s+that\s+exits\s+other\s+than\s+`5`/g;
  const out = [];
  const close = m.get("pharn-ship-close.md");
  if ((close.match(NEW) ?? []).length !== 2)
    out.push("pharn-ship-close.md: the load sentence is not in its title paragraph AND its claims bullet");
  for (const f of ["pharn-ship.md", "pharn-ship-close.md"])
    if (/return\s+marker\s+after\s+the\s+first/.test(m.get(f))) out.push(`${f}: the pre-6.43.0 load wording`);
  return out;
}

test("R4 (6.43.0) — /pharn-ship's close part states its own load condition as its pointer does; each mutant is red (L60)", () => {
  assert.deepEqual(shipCloseLoadOffenders(LIVE), []);
  const back = edit(LIVE, "pharn-ship-close.md", (t) =>
    t.replace(
      "with step 7's first `/pharn-verify` call that exits other than `5`",
      "with step 7's return marker after the first `/pharn-verify`"
    )
  );
  assert.match(shipCloseLoadOffenders(back).join("\n"), /title paragraph AND its claims bullet/);
  assert.match(shipCloseLoadOffenders(back).join("\n"), /pharn-ship-close\.md: the pre-6\.43\.0 load wording/);
});

test("R5b — a part's file name appears only in its pointer (and a quick part's in its sibling claims block): no second load", () => {
  assert.ok(LIVE.size > 20, "L34: the whole commands directory is read, dev commands included");
  assert.deepEqual(mentionOffenders(LIVE), []);
  // REGRESSION (REVIEW.md FG1, the sixth mutant): an eager close-part Read written INTO the quick part.
  const eager = edit(LIVE, "pharn-loop-quick.md", (t) =>
    t.replace(
      "<!-- end of pharn-loop-quick -->",
      "Read `.claude/commands/pharn-loop-close.md` now, before Step 1a.\n\n<!-- end of pharn-loop-quick -->"
    )
  );
  assert.match(mentionOffenders(eager).join("\n"), /pharn-loop-quick\.md: names pharn-loop-close\.md 1 time/);
  // CONTROLS (L60): a bare-name mention in ANOTHER command; a second mention in the command's own main file; the quick
  // part's claims mention moved out of the claims block; the claims mention deleted.
  const other = edit(LIVE, "pharn-verify.md", (t) => `${t}\nThen read pharn-ship-close.md.\n`);
  assert.match(mentionOffenders(other).join("\n"), /pharn-verify\.md: names pharn-ship-close\.md 1 time/);
  const again = edit(LIVE, "pharn-ship.md", (t) => t.replace("\n## Step 2 — ", "\nSee pharn-ship-quick.md.\n\n## Step 2 — "));
  assert.match(mentionOffenders(again).join("\n"), /pharn-ship\.md: names pharn-ship-quick\.md 2 time\(s\), expected 1/);
  const claims = LIVE.get("pharn-loop-close.md");
  assert.ok(claims.includes("`pharn-loop-quick.md`"), "anchor (L60): the claims block names the quick part");
  const moved = edit(LIVE, "pharn-loop-close.md", (t) =>
    t.replace("`pharn-loop-quick.md`", "the quick part").replace("\n## Step 7 — ", "\nSee `pharn-loop-quick.md`.\n\n## Step 7 — ")
  );
  assert.match(mentionOffenders(moved).join("\n"), /names pharn-loop-quick\.md outside ## What you may claim/);
  const gone = edit(LIVE, "pharn-loop-close.md", (t) => t.replace("`pharn-loop-quick.md`", "the quick part"));
  assert.match(mentionOffenders(gone).join("\n"), /pharn-loop-close\.md: names pharn-loop-quick\.md 0 time\(s\), expected 1/);
});

test("R6 — no fenced line, heading or long paragraph lives in two files of one command", () => {
  assert.deepEqual(duplicationOffenders(LIVE), []);
  // CONTROLS (L60), one per unit kind: a close-part fenced line, heading and paragraph copied back into the main file.
  const close = LIVE.get("pharn-loop-close.md");
  const fenced = "node pharn/floor/check-loop-record.mjs pharn/features/<name>/LOOP.md";
  assert.ok(close.includes(fenced), "anchor (L60): the copied line exists in the close part");
  const withLine = edit(LIVE, "pharn-loop.md", (t) => `${t}\n\`\`\`bash\n${fenced}\n\`\`\`\n`);
  assert.match(duplicationOffenders(withLine).join("\n"), /both carry fenced line: node pharn\/floor\/check-loop-record/);
  const withHeading = edit(LIVE, "pharn-ship.md", (t) => `${t}\n## Step 3a — Close the markers\n`);
  assert.equal(duplicationOffenders(withHeading).length, 0, "a heading that differs is not a copy");
  const realHeading = LIVE.get("pharn-ship-close.md")
    .split("\n")
    .find((l) => l.startsWith("## Step 3a — "));
  assert.ok(realHeading, "anchor (L60)");
  assert.match(
    duplicationOffenders(edit(LIVE, "pharn-ship.md", (t) => `${t}\n${realHeading}\n`)).join("\n"),
    /both carry heading: ## Step 3a/
  );
  const para = withoutFrontmatter(LIVE.get("pharn-ship-quick.md"))
    .split(/\n\s*\n/)
    .find((x) => x.replace(/\s+/g, " ").trim().length >= 80 && !x.includes("```"));
  assert.ok(para, "anchor (L60)");
  assert.match(duplicationOffenders(edit(LIVE, "pharn-ship.md", (t) => `${t}\n${para}\n`)).join("\n"), /both carry paragraph:/);
});

test("R7 — the stop procedure lives in each close part, the deltas in each quick part, and the rest stays in the command", () => {
  assert.deepEqual(placementOffenders(LIVE), []);
  // CONTROLS (L60): a stop heading moved back into the main file; a delta item left in the main pointer; a missing
  // ## Quick mode anchor fails rather than reading as "no deltas".
  const back = edit(LIVE, "pharn-loop.md", (t) => `${t}\n### Step 6d — when the commit does not happen\n`);
  assert.match(placementOffenders(back).join("\n"), /"### Step 6d — " must live only in pharn-loop-close\.md/);
  const itemInMain = edit(LIVE, "pharn-ship.md", (t) => t.replace("## Step 2 — ", "1. **A stray delta.**\n\n## Step 2 — "));
  assert.match(placementOffenders(itemInMain).join("\n"), /pointer carries numbered deltas/);
  const noAnchor = edit(LIVE, "pharn-loop.md", (t) => t.replace(/^## Quick mode — /m, "## Fast mode — "));
  assert.match(placementOffenders(noAnchor).join("\n"), /no ## Quick mode section/);
  const lostItem = edit(LIVE, "pharn-loop-quick.md", (t) => t.replace(/^5\. \*\*/m, "5 **"));
  assert.match(placementOffenders(lostItem).join("\n"), /delta items/);
});

test("R8 — no shipped file (a non-test file under pharn/ or .claude/hooks/) names the dev-only helper", () => {
  const entries = shippedEntries();
  assert.ok(entries.length > 50, "L34: the walk reads the shipped trees");
  assert.deepEqual(shippedHelperOffenders(entries), []);
  // CONTROLS (L60): a shipped module naming it is red; a test file naming it is not.
  assert.deepEqual(shippedHelperOffenders([["pharn/floor/x.mjs", 'import "../../.dev/floor/command-family.mjs";']]), [
    "pharn/floor/x.mjs: a shipped file names command-family.mjs",
  ]);
  assert.deepEqual(shippedHelperOffenders([["pharn/floor/x.test.mjs", 'import "../../.dev/floor/command-family.mjs";']]), []);
});

// ── the helper itself ─────────────────────────────────────────────────────────────────────────────────────────────

test("helper — commandFamilyText splices each part back where its text sat: quick inside ## Quick mode, close at the end", () => {
  for (const [file, next] of [
    ["pharn-loop.md", "\n## Step 3 — "],
    ["pharn-ship.md", "\n## Step 2 — "],
  ]) {
    const fam = commandFamilyText(COMMANDS_DIR, file);
    const parts = commandParts(COMMANDS_DIR, file);
    assert.deepEqual(
      parts.map((p) => p.part),
      ["quick", "close"],
      `${file}: its parts, in splice order`
    );
    const quickTitle = titleOf(LIVE.get(parts[0].file));
    const closeTitle = titleOf(LIVE.get(parts[1].file));
    const qm = fam.search(/^## Quick mode — /m);
    assert.ok(
      qm >= 0 && fam.indexOf(quickTitle) > qm && fam.indexOf(quickTitle) < fam.indexOf(next),
      `${file}: quick spliced inside ## Quick mode`
    );
    assert.ok(fam.indexOf(closeTitle) > fam.indexOf(next), `${file}: close spliced after the entry-to-stop text`);
    assert.ok(fam.trimEnd().endsWith(endLine(parts[1].file)), `${file}: the close part ends the family text`);
    assert.equal(fam.includes("part_of:"), false, `${file}: no part's frontmatter is spliced in`);
  }
  // A command with no parts reads as its own file.
  assert.equal(commandFamilyText(COMMANDS_DIR, "pharn-verify.md"), LIVE.get("pharn-verify.md"));
  assert.deepEqual(
    allParts(COMMANDS_DIR).map((p) => p.file),
    ["pharn-loop-close.md", "pharn-loop-quick.md", "pharn-ship-close.md", "pharn-ship-quick.md"]
  );
});

test("helper — a quick part with no ## Quick mode heading to splice under THROWS, never splices elsewhere (L60)", () => {
  const dir = mkdtempSync(join(tmpdir(), "command-family-"));
  try {
    cpSync(COMMANDS_DIR, dir, { recursive: true });
    const main = readFileSync(join(dir, "pharn-loop.md"), "utf8");
    writeFileSync(join(dir, "pharn-loop.md"), main.replace(/^## Quick mode — /m, "## Fast mode — "));
    assert.throws(() => commandFamilyText(dir, "pharn-loop.md"), /no "## Quick mode" heading/);
    // A part of an unknown kind throws too.
    const q = readFileSync(join(dir, "pharn-ship-quick.md"), "utf8");
    writeFileSync(join(dir, "pharn-ship-quick.md"), q.replace("part: quick", "part: middle"));
    assert.throws(() => commandFamilyText(dir, "pharn-ship.md"), /is not one of quick, close/);
    // Removing a part removes it from the family (the command then reads as its own file).
    unlinkSync(join(dir, "pharn-ship-quick.md"));
    unlinkSync(join(dir, "pharn-ship-close.md"));
    assert.equal(commandFamilyText(dir, "pharn-ship.md"), readFileSync(join(dir, "pharn-ship.md"), "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
