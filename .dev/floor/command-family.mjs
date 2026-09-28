// .dev/floor/command-family.mjs — a product command and its PARTS, read as one text (6.32.0, orchestrator-context).
//
// WHAT A PART IS. `/pharn-loop` and `/pharn-ship` keep the text a run needs only at one point in its own file under
// `.claude/commands/`: `pharn-<cmd>-quick.md` (read only for a `--quick` run, at entry) and `pharn-<cmd>-close.md`
// (read once, at the run's first stop). A part is recognized ONLY by its frontmatter — `part_of: <parent file stem>`
// and `part: quick | close` — never by its name (L6: a structural fact is read from its structured location), and that
// frontmatter is the ONE record of which parts a command has (L35): this module, the tests and the capability catalog
// all discover parts here, and no second list exists.
//
// WHAT THIS MODULE IS FOR. Tests only. Every pin that asked "does /pharn-loop carry this line, in this order?" read one
// file; after the move the answer spans three. `commandFamilyText()` splices each part back where its text sat before
// the move — a quick part at the end of the parent's `## Quick mode` section, a close part at the end of the parent —
// so those pins keep their meaning, and `.dev/floor/command-family.test.mjs` adds the rules that say WHERE each line
// must live. Importing it from shipped code would break an install, which ships without `.dev/`; the test file pins
// that no non-test file under `pharn/` or `.claude/hooks/` names this module.
//
// BOUND (P0): it reads files and splices text. It proves nothing about what a run loads; that is the parent command's
// pointer text, which the tests pin and a model obeys (advisory).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** The two kinds of part, in splice order. */
export const PART_KINDS = Object.freeze(["quick", "close"]);

/** The heading whose section a quick part is spliced to the end of. */
export const QUICK_ANCHOR_RE = /^## Quick mode\b/m;

/**
 * The leading `---` frontmatter of `text` as a flat {key: value} map (a value's surrounding double quotes are
 * removed; a line without `key:` is ignored), or null when there is no frontmatter block.
 */
export function frontmatterFields(text) {
  const m = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) v = v.slice(1, -1);
    out[kv[1]] = v;
  }
  return out;
}

/** `text` without its leading frontmatter block (unchanged when it has none). */
export function withoutFrontmatter(text) {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? text.slice(m[0].length) : text;
}

/** Every `.md` file in `dir` whose frontmatter declares `part_of:` — [{file, parent, part}], sorted by file. */
export function allParts(dir) {
  const out = [];
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()) {
    const fm = frontmatterFields(readFileSync(join(dir, file), "utf8"));
    if (fm && Object.hasOwn(fm, "part_of")) out.push({ file, parent: fm.part_of, part: fm.part ?? null });
  }
  return out;
}

/** The parts of the command `file` (e.g. `pharn-loop.md`), in PART_KINDS order. */
export function commandParts(dir, file) {
  const stem = file.replace(/\.md$/, "");
  return allParts(dir)
    .filter((p) => p.parent === stem)
    .sort((a, b) => PART_KINDS.indexOf(a.part) - PART_KINDS.indexOf(b.part));
}

/**
 * The command `file` with each part's text (frontmatter removed) spliced back where it sat before the move: a quick
 * part at the end of the parent's `## Quick mode` section, a close part at the end. A file with no parts is returned
 * unchanged. Throws — never splices somewhere else — when a quick part's anchor is missing, or a part's kind is not
 * in PART_KINDS (L60: an anchor that is not found must fail, not slice to the end).
 */
export function commandFamilyText(dir, file) {
  let text = readFileSync(join(dir, file), "utf8");
  for (const p of commandParts(dir, file)) {
    const body = withoutFrontmatter(readFileSync(join(dir, p.file), "utf8"));
    if (p.part === "quick") {
      const m = QUICK_ANCHOR_RE.exec(text);
      if (!m) throw new Error(`${file}: a quick part (${p.file}) but no "## Quick mode" heading to splice it under`);
      const next = text.indexOf("\n## ", m.index + 1);
      const at = next === -1 ? text.length : next + 1;
      text = `${text.slice(0, at)}${body}${body.endsWith("\n") ? "" : "\n"}\n${text.slice(at)}`;
    } else if (p.part === "close") {
      text = `${text}${text.endsWith("\n") ? "" : "\n"}\n${body}`;
    } else {
      throw new Error(`${p.file}: part ${JSON.stringify(p.part)} is not one of ${PART_KINDS.join(", ")}`);
    }
  }
  return text;
}
