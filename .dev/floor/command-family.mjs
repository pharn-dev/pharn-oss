// .dev/floor/command-family.mjs — a product command and its PARTS, read as one text (6.32.0, orchestrator-context).
//
// WHAT A PART IS. `/pharn-loop` and `/pharn-ship` keep the text a run needs only at one point in its own file under
// `.claude/commands/`: `pharn-<cmd>-quick.md` (read only for a `--quick` run, at entry) and `pharn-<cmd>-close.md`
// (read once: the loop's at its first stop, ship's with step 7's return marker after the first verify or at an earlier
// STOP). Since 6.70.0 `/pharn-ship` has a third, `pharn-ship-stages.md` (`## Running a stage`, Step 2 after GATE 1 and
// Step 2b, read once after the SPEC is approved). A part is recognized ONLY by its frontmatter — `part_of: <parent file
// stem>` and `part: quick | stages | close` — never by its name (L6: a structural fact is read from its structured location), and that
// frontmatter is the ONE record of which parts a command has (L35): this module, the tests and the capability catalog
// all discover parts here, and no second list exists.
//
// WHAT THIS MODULE IS FOR. Dev apparatus only: the tests, and `capability-catalog-core.mjs` (docs:generate /
// docs:check), which reads `frontmatterFields()` to leave parts out of the command catalog — both under `.dev/`, which
// no install receives. Every pin that asked "does /pharn-loop carry this line, in this order?" read one
// file; after the move the answer spans three. `commandFamilyText()` splices each part back where its text sat before
// the move — a quick part at the end of the parent's `## Quick mode` section, a stages part at the end of its
// `## Step 2 — ` section, a close part at the end of the parent — so those pins keep their meaning (one exception: the
// stages part carries `## Running a stage`, which sat before `## Quick mode` and is now spliced after Step 2 item 1), and `.dev/floor/command-family.test.mjs` adds the rules that say WHERE each line
// must live. Importing it from shipped code would break an install, which ships without `.dev/`; the test file pins
// that no non-test file under `pharn/` or `.claude/hooks/` names this module.
//
// BOUND (P0): it reads files and splices text. It proves nothing about what a run loads; that is the parent command's
// pointer text, which the tests pin and a model obeys (advisory).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fieldEntries, matchFrontmatter, stripBom } from "../../pharn/floor/frontmatter-core.mjs";

/** The three kinds of part, in splice order. */
export const PART_KINDS = Object.freeze(["quick", "stages", "close"]);

/** The heading whose section a quick part is spliced to the end of. */
export const QUICK_ANCHOR_RE = /^## Quick mode\b/m;

/** The heading whose section a stages part is spliced to the end of (6.70.0: `/pharn-ship`'s stages after GATE 1). */
export const STAGES_ANCHOR_RE = /^## Step 2 — /m;

/** `text` with `body` inserted at the end of the `##` section `anchor` starts; throws when the anchor is missing. */
function spliceAtSectionEnd(text, anchor, body, what) {
  const m = anchor.exec(text);
  if (!m) throw new Error(what);
  const next = text.indexOf("\n## ", m.index + 1);
  const at = next === -1 ? text.length : next + 1;
  return `${text.slice(0, at)}${body}${body.endsWith("\n") ? "" : "\n"}\n${text.slice(at)}`;
}

/**
 * The leading `---` frontmatter of `text` as a flat {key: value} map (a value's surrounding double quotes are
 * removed; a line without `key:` is ignored; the last copy of a repeated key wins), or null when there is no
 * frontmatter block. The anchor and the line grammar are the product core's (`matchFrontmatter`, `fieldEntries` —
 * 6.65.2), so a leading BOM and CRLF are tolerated as every floor reader tolerates them.
 */
export function frontmatterFields(text) {
  const m = matchFrontmatter(text);
  if (!m) return null;
  const out = {};
  for (const { key, raw } of fieldEntries(m[1].split(/\r?\n/))) {
    let v = raw.trim();
    if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) v = v.slice(1, -1);
    out[key] = v;
  }
  return out;
}

/** `text` without its leading frontmatter block (unchanged when it has none), read with the same anchor. */
export function withoutFrontmatter(text) {
  const clean = stripBom(text);
  const m = matchFrontmatter(clean);
  return m ? clean.slice(m[0].length) : text;
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
 * part at the end of the parent's `## Quick mode` section, a stages part at the end of its `## Step 2 — ` section, a
 * close part at the end. A file with no parts is returned unchanged. Throws — never splices somewhere else — when a
 * quick or stages part's anchor is missing, or a part's kind is not
 * in PART_KINDS (L60: an anchor that is not found must fail, not slice to the end).
 */
export function commandFamilyText(dir, file) {
  let text = readFileSync(join(dir, file), "utf8");
  for (const p of commandParts(dir, file)) {
    const body = withoutFrontmatter(readFileSync(join(dir, p.file), "utf8"));
    if (p.part === "quick") {
      text = spliceAtSectionEnd(
        text,
        QUICK_ANCHOR_RE,
        body,
        `${file}: a quick part (${p.file}) but no "## Quick mode" heading to splice it under`
      );
    } else if (p.part === "stages") {
      text = spliceAtSectionEnd(
        text,
        STAGES_ANCHOR_RE,
        body,
        `${file}: a stages part (${p.file}) but no "## Step 2 — " heading to splice it under`
      );
    } else if (p.part === "close") {
      text = `${text}${text.endsWith("\n") ? "" : "\n"}\n${body}`;
    } else {
      throw new Error(`${p.file}: part ${JSON.stringify(p.part)} is not one of ${PART_KINDS.join(", ")}`);
    }
  }
  return text;
}
