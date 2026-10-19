#!/usr/bin/env node
// pharn/floor/griller-extract.mjs — print every registered griller for a full `/pharn-grill` or `/pharn-dev-grill`,
// without the sections a grill does not use (6.60.0, grill-griller-trim; 6.63.0, grill-griller-slim — review finding
// CTX-1).
//
// WHY (P7 — a measured cost, not a hypothetical). A full grill read all 13 griller files, 188,978 B, into ONE context;
// the 2026-10-05 measured grill agent then made 41 requests whose context grew from 302k to 425k tokens, so each
// request re-sent those bodies (`.dev/measurements/loop-wall-clock-2026-10-05.md` §3). These sections are left out:
//   - Every griller (scope `all`, since 6.60.0): `## Guarantee audit` — the griller's own floor/advisory split of its
//     claims, written for maintainers; the grill carries its own claims block, and its Step 3b keeps the per-axis rule
//     (a griller's findings, or none, never mean the plan is secure / private / accessible on that axis). And
//     `## Machine-readable emission` — the standalone `findings.json` path, finalized only when a live griller runner
//     lands; inline, the grill folds findings into GRILL.md.
//   - Only a griller whose frontmatter `kind` is exactly `pharn-owned` (scope `pharn-owned`, since 6.63.0):
//     `## The two layers` (the intro sizing the griller's floor against its siblings), `### Layer 1` (membership
//     mechanics `count-grillers.mjs` owns, the scanner invocation and output schema `grill-scan.mjs` now runs once per
//     full grill, and eval-time floor rationale) and `## Finding output` (a YAML template whose `rule_id` and
//     `severity` each griller's `## Procedure` restates, and a closing paragraph both grill commands carry). Six
//     committed grillers held grill-time guidance only there, so 6.63.0 moved it first: a `### Presence — what counts as
//     a declaration` heading in a11y, documentation, error-handling and testability, and one sentence each into
//     `### Layer 2` of i18n and privacy (`.dev/features/grill-griller-slim/PLAN.md`, the per-griller audit).
// THE AUTHORING RULE THIS RELIES ON, for a `pharn-owned` griller: guidance a grill needs never sits under any of the
// five omitted headings. Since 6.63.0 (GATE 2, F1) the rule is stated where an author edits or copies a griller: a
// "**Not loaded by a full grill.**" paragraph at the end of each `pharn-owned` griller's `## The two layers` intro, which
// the extract itself leaves out, so it costs a grill 0 bytes while the extract runs; a grill that falls back to whole
// files (a grill-scan.mjs or extract failure) reads it, 4,823 B over the 13. `griller-extract.test.mjs` pins it as a
// closure over this repo's registered grillers: each `pharn-owned` one carries the sentence in its intro, the sentence
// names every OMITTED_SECTIONS member, and it never reaches the extract. RESIDUAL (P0): that pin is presence and
// placement, never that an author read it; an installed project's own griller, or a user-edited copy, is checked by
// nothing.
// Measured over the 13 grillers at 6.63.0: 194,015 B of files → 99,391 B of griller text printed (−48.8%; 102,417 B of
// stdout with the summary and frame lines); 6.60.0 printed 141,332 B, so −29.7% on a full `/pharn-grill`. The same for
// every plan.
//
// THE KIND GATE (P5, primitive #3). frontmatterKind reads only the frontmatter's column-0 `kind:` lines. Exactly one,
// whose value is exactly `pharn-owned`, admits the `pharn-owned` members; anything else — no frontmatter, unclosed
// frontmatter, no `kind:` line, two of them, any other value — keeps those three sections and drops only the `all` ones.
// RESIDUAL, stated (P0): `kind` is self-declared, so this is a membership test over a declaration, not over who wrote
// the file. A user-EDITED `pharn-owned` griller (`pharn update` keeps an edited file) is still trimmed, and a community
// griller that declares `pharn-owned` is trimmed too; text either puts under those three headings never reaches a grill.
//
// EVERY GRILLER STILL RUNS. Choosing grillers per plan was measured and rejected twice. From the `scan-plan-*` scanner
// hits (GATE 1 of grill-griller-trim; `.dev/features/grill-griller-trim/MEASUREMENTS.md`): over 282 committed plans it
// would have skipped the security griller on all 282, and committed GRILL.md files hold ≥34 griller findings raised on
// plans where that griller's scanner had no hit. Then four more candidates (GATE 1 of grill-griller-slim;
// `.dev/features/grill-griller-slim/MEASUREMENTS.md`): the project's archetype at run time saves 0 B in an install,
// because the installer already selects archetypes; the plan's `## Files` path classes lose findings (migrations on 10
// pharn-oss plans, i18n on one plan there and one in pharn-starter), with only a11y loss-free, at −0.24% to −2.4% by how
// wide the UI path class is; the two combined reduce to the path classes in an install; and one subagent per griller
// costs ≥13 × 68k prefix tokens against ≈35k of griller text. No griller has a deterministic not-applicable signal.
//
// WHAT IT DOES. Spawns `count-grillers.mjs <repo>` (membership stays owned there — no second walk), validates its shape,
// reads each listed file, and prints on stdout: line 1, the `grillers:` summary GRILL.md records (it counts the kind
// gate as `deep omission: <n> pharn-owned, <m> other`, naming each other griller by path with its KIND_REASONS token,
// never the kind value); then each griller between a BEGIN and an END frame line naming its path and the section ids
// left out.
//
// THE OMISSION RULE, and its failure direction (L55/L56 — the model's mistakes must only ever load MORE):
//   - Frontmatter is kept verbatim (its `kind:` / `trust:` tags stay visible, P2), delimited exactly as count-grillers.mjs
//     reads it (`---` at byte 0, closed at the next `\n---`). An unclosed frontmatter keeps the whole file.
//   - A section is omitted only when its heading is a column-0 run of EXACTLY the member's level of `#` and one space,
//     outside any fence, whose text starts with an OMITTED_SECTIONS prefix as a whole word (the prefix, then the end of
//     the text, a space or a tab), for a member the griller's kind admits. START is strict, so an indented, reworded or
//     other-level heading (`## Layer 1`, `### Finding output`) is kept, and so is a longer word (`### Layer 10`,
//     `## Finding outputs`, `## Guarantee auditing`).
//   - It ends at the first later line, outside a fence, that looks like any ATX heading (`#`–`######`, also after list or
//     blockquote markers) or is a line of only `=` or only `-` (a setext underline or a thematic break); before a setext
//     underline, the paragraph above it (that heading's text) is kept too. END is liberal, so it never runs past a
//     heading a renderer would show. A member heading met while dropping starts that member (`## The two layers` →
//     `### Layer 1`); any other heading ends the drop, so `### Layer 2` and `### Presence` are kept.
//   - Fences: backtick or tilde, 0–3 spaces of indent, closed by the same character at least as long with nothing after
//     it (CommonMark). Three constructs keep the WHOLE file, because there this model and a renderer can disagree: a fence
//     still open at EOF; an indented fence followed by a less-indented line before its closer (inside a list item that
//     line closes the fence, at top level it does not); and any line outside fences that opens an HTML block (`<` after
//     0–3 spaces).
// COUPLING, stated (P3): OMITTED_SECTIONS is a second store of the griller body shape — no contract declares griller
// section headings. Its detector is `griller-extract.test.mjs`, which pins that every member matches exactly one heading
// of its level in every committed griller and that the lines dropped are exactly the members' sections; a renamed
// heading is therefore KEPT (and that test fails), never something else dropped.
//
// FLOOR: the membership (count-grillers.mjs, primitive #3), the closed OMITTED_SECTIONS set, the kind gate and the line
// rules above (regex / enum equality, primitive #3), and the refusals. ADVISORY: that the omitted sections hold nothing
// a grill needs (a reading of the 13 committed grillers, backed by pins on the Procedure restating `rule_id` and
// `severity`, the four `### Presence` sections and the two moved sentences), that the model reads this output instead
// of the files, and that it applies every griller. NOT A CLAIM: "the grill reviewed less" — every registered griller is
// printed — nor "the extract matches a renderer" beyond the 13 files and the adversarial inputs probed with markdown-it
// at build time (scratch, recorded in MEASUREMENTS.md; not a pinned test).
//
// Exit: 0 the extract on stdout · 2 refusal (usage; count-grillers failed or printed another shape; a listed path that is
// not a plain in-repo `.md` regular file, a symlink, or unreadable; a griller body holding a frame line). The reason goes
// to stderr and NOTHING to stdout, so a partial extract is never printed; the grill command then reads every file in full.
//
// Usage: node pharn/floor/griller-extract.mjs [repoDir]      (default: the current directory)

import "./runtime-floor.mjs";
import { spawnSync } from "node:child_process";
import { closeSync, constants, fstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, sep } from "node:path";
import { stripBom } from "./frontmatter-core.mjs";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The closed set of sections left out: a stable id, the heading level (the count of `#`), the heading-text prefix after
 * the `#`s and one space, and the scope — `all` for every griller, `pharn-owned` only for a griller whose frontmatter
 * `kind` is exactly `pharn-owned` (frontmatterKind).
 */
export const OMITTED_SECTIONS = Object.freeze([
  Object.freeze({ id: "guarantee-audit", level: 2, prefix: "Guarantee audit", scope: "all" }),
  Object.freeze({ id: "machine-readable-emission", level: 2, prefix: "Machine-readable emission", scope: "all" }),
  Object.freeze({ id: "two-layers", level: 2, prefix: "The two layers", scope: "pharn-owned" }),
  Object.freeze({ id: "layer-1", level: 3, prefix: "Layer 1", scope: "pharn-owned" }),
  Object.freeze({ id: "finding-output", level: 2, prefix: "Finding output", scope: "pharn-owned" }),
]);

/** The closed set of scopes an OMITTED_SECTIONS member may carry. */
export const SCOPES = Object.freeze(["all", "pharn-owned"]);

/** The closed set of reasons a griller is NOT admitted to the `pharn-owned` members (frontmatterKind). */
export const KIND_REASONS = Object.freeze(["kind-missing", "kind-ambiguous", "kind-other"]);

/**
 * The griller's frontmatter `kind`, reduced to `"pharn-owned"` or a KIND_REASONS token. Pure. The frontmatter is sliced
 * exactly as count-grillers.mjs and validate.mjs slice it (`---` at byte 0, closed at the next `\n---`); only its
 * column-0 `kind:` lines are read, never the body (L6). One matching pair of `"` or `'` around the value is stripped.
 * Only ONE `kind:` line whose value is exactly `pharn-owned` (case-sensitive) admits; two or more lines are ambiguous,
 * even when they agree, because validate.mjs takes the last and a reader might take the first. One leading BOM is
 * stripped first (frontmatter-core.mjs `stripBom`, 6.65.2), as validate.mjs and count-grillers.mjs now strip it.
 */
export function frontmatterKind(rawText) {
  if (typeof rawText !== "string") return "kind-missing";
  const text = stripBom(rawText);
  if (!text.startsWith("---")) return "kind-missing";
  const close = text.indexOf("\n---", 3);
  if (close === -1) return "kind-missing";
  const values = [];
  for (const line of text.slice(3, close).split("\n")) {
    const m = line.match(/^kind:[ \t]*(.*?)[ \t\r]*$/);
    if (m) values.push(m[1]);
  }
  if (values.length === 0) return "kind-missing";
  if (values.length > 1) return "kind-ambiguous";
  let v = values[0];
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) v = v.slice(1, -1);
  return v === "pharn-owned" ? "pharn-owned" : "kind-other";
}

/** The frame marker. A griller body holding a line that starts with it is refused (it could forge a boundary). */
export const FRAME = "===== griller ";

/** True when any line, after its leading whitespace (spaces, tabs, a CR, other Unicode space), starts with FRAME. */
export function holdsFrameLine(text) {
  return text.split("\n").some((l) => l.trimStart().startsWith(FRAME));
}

const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
// Any ATX-looking heading, also after list or blockquote markers: an END test, so matching too much only ends early.
const ATX_RE = /^[ \t>*+\-\d.)]*#{1,6}(?:[ \t]|$)/;
const UNDERLINE_RE = /^ {0,3}(?:=+|-+)[ \t]*$/;
const HTML_RE = /^ {0,3}</;

/** Quote any value for a refusal reason without ever throwing (L62 — `String(v)` throws on `{"toString":1}`). */
export function shown(v) {
  let s;
  try {
    s = typeof v === "string" ? v : String(v);
  } catch {
    s = Object.prototype.toString.call(v);
  }
  return JSON.stringify(s.length > 200 ? `${s.slice(0, 200)}…` : s);
}

/**
 * True when `text` starts with `prefix` as a whole word: the character after it is the end of the text, a space or a
 * tab (6.63.0, GATE 2 F2). So `Layer 10`, `Layer 1.5`, `Finding outputs` and `Guarantee auditing` do not match, and
 * neither does `Guarantee audit:` — any other character after the prefix keeps the section, the safe direction.
 */
function startsWithWord(text, prefix) {
  if (!text.startsWith(prefix)) return false;
  const next = text[prefix.length];
  return next === undefined || next === " " || next === "\t";
}

/**
 * The omitted-section id a heading line opens, or null: a column-0 run of exactly a member's `level` `#` characters and
 * one space, whose text starts with that member's prefix as a whole word, for a member whose scope `deep` admits.
 */
function omittedId(line, deep) {
  const m = line.match(/^(#{1,6}) /);
  if (!m) return null;
  const level = m[1].length;
  const text = line.slice(level + 1).trimStart();
  const hit = OMITTED_SECTIONS.find((s) => s.level === level && (s.scope === "all" || deep === true) && startsWithWord(text, s.prefix));
  return hit ? hit.id : null;
}

/**
 * Trim one griller's text. Pure. Returns {text, omitted: [ids in file order], whole: null | reason, deep: true | a
 * KIND_REASONS token}; when `whole` is a reason, `text` is the input unchanged and `omitted` is empty. `deep` is true only
 * when frontmatterKind reads exactly `pharn-owned`, and only then are the `pharn-owned`-scoped members left out.
 */
export function trimGriller(text) {
  const kind = frontmatterKind(text);
  const deep = kind === "pharn-owned" ? true : kind;
  const keep = (reason) => ({ text, omitted: [], whole: reason, deep });
  // One leading BOM (the strip frontmatterKind applies) is skipped when finding the fence, and KEPT in `head`, so the
  // trimmed output still rejoins to the exact input bytes.
  const bom = text.length - stripBom(text).length;
  let bodyStart = 0;
  if (text.startsWith("---", bom)) {
    const close = text.indexOf("\n---", bom + 3);
    if (close === -1) return keep("unclosed-frontmatter");
    const eol = text.indexOf("\n", close + 1);
    bodyStart = eol === -1 ? text.length : eol + 1;
  }
  const head = text.slice(0, bodyStart);
  const lines = text.slice(bodyStart).split("\n");
  const out = [];
  const omitted = [];
  let fence = null; // {char, len, indent} while inside a fence
  let dropping = false;
  let paragraph = []; // the lines dropped since the last blank line or block: a setext heading's text, if one follows
  for (let i = 0; i < lines.length; i++) {
    // `raw` carries its own line terminator, so the kept lines rejoin to the exact input bytes.
    const raw = i < lines.length - 1 ? `${lines[i]}\n` : lines[i];
    const line = lines[i].endsWith("\r") ? lines[i].slice(0, -1) : lines[i];
    if (fence) {
      const m = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (m && m[1][0] === fence.char && m[1].length >= fence.len) fence = null;
      // An indented fence is either inside a list item (a less-indented line ends the item AND the fence) or a
      // top-level fence (the line is content). This model cannot tell the two apart, so it keeps the whole file.
      else if (line.trim() !== "" && line.length - line.trimStart().length < fence.indent) return keep("ambiguous-fence");
      if (!dropping) out.push(raw);
      continue;
    }
    const open = line.match(FENCE_OPEN_RE);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      fence = { char: open[1][0], len: open[1].length, indent: line.length - line.trimStart().length };
      paragraph = [];
      if (!dropping) out.push(raw);
      continue;
    }
    if (HTML_RE.test(line)) return keep("html-block");
    const id = omittedId(line, deep);
    if (id !== null) {
      dropping = true;
      paragraph = [];
      omitted.push(id);
      continue;
    }
    if (dropping && UNDERLINE_RE.test(line)) {
      // A setext underline: the paragraph just above it is that heading's text, so it is kept with it.
      out.push(...paragraph);
      dropping = false;
    } else if (dropping && ATX_RE.test(line)) dropping = false;
    if (!dropping) out.push(raw);
    else paragraph = line.trim() === "" ? [] : [...paragraph, raw];
  }
  if (fence) return keep("unclosed-fence");
  if (omitted.length === 0) return { text, omitted, whole: null, deep };
  return { text: head + out.join(""), omitted, whole: null, deep };
}

/** Render the extract from validated entries (`[{path, bytes, trimmed}]`, count-grillers order). Pure. */
export function renderExtract(entries) {
  const n = entries.length;
  if (n === 0) return "grillers: 0 registered — no griller to apply (pharn/floor/griller-extract.mjs)\n";
  const read = entries.reduce((a, e) => a + e.bytes, 0);
  const printed = entries.reduce((a, e) => a + Buffer.byteLength(e.trimmed.text), 0);
  const counts = OMITTED_SECTIONS.map((s) => `${s.id} (${entries.filter((e) => e.trimmed.omitted.includes(s.id)).length})`);
  const whole = entries.filter((e) => e.trimmed.whole !== null).map((e) => `${e.path} (${e.trimmed.whole})`);
  // The kind gate's record: a count, and each other griller by path with its closed reason token — never the kind value.
  const other = entries.filter((e) => e.trimmed.deep !== true).map((e) => `${e.path} (${e.trimmed.deep})`);
  const deep = `deep omission: ${n - other.length} pharn-owned, ${other.length} other${other.length ? `: ${other.join(", ")}` : ""}`;
  const lines = [
    `grillers: ${n} registered, ${n} printed (pharn/floor/griller-extract.mjs) — ${read} B of griller files, ${printed} B printed;` +
      ` ${deep}; left out where present: ${counts.join(", ")}; kept whole: ${whole.length ? whole.join(", ") : "none"}`,
  ];
  entries.forEach((e, i) => {
    const left = e.trimmed.omitted.length ? e.trimmed.omitted.join(", ") : "none";
    lines.push("", `${FRAME}${i + 1}/${n} BEGIN: ${e.path} (left out: ${left}) =====`);
    lines.push(e.trimmed.text.endsWith("\n") ? e.trimmed.text.slice(0, -1) : e.trimmed.text);
    lines.push(`${FRAME}${i + 1}/${n} END =====`);
  });
  return `${lines.join("\n")}\n`;
}

/** A registered path as count-grillers prints it: relative, `/`-separated, no `.`/`..` segment, no control char, `.md`. */
function pathReason(p) {
  if (typeof p !== "string" || p === "") return `griller path ${shown(p)} is not a non-empty string`;
  if (isAbsolute(p) || p.includes("\\")) return `griller path ${shown(p)} is not repo-relative`;
  if ([...p].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)) return `griller path ${shown(p)} holds a control character`;
  if (p.split("/").some((seg) => seg === "" || seg === "." || seg === ".."))
    return `griller path ${shown(p)} has an empty, . or .. segment`;
  if (!p.endsWith(".md")) return `griller path ${shown(p)} is not a .md file`;
  return null;
}

/** Run count-grillers over `repo`, read and trim every listed griller. Returns {ok:true, entries} or {ok:false, reason}. */
export function extractGrillers(repo = ".", { counter = join(HERE, "count-grillers.mjs") } = {}) {
  const r = spawnSync(process.execPath, [counter, repo], { encoding: "utf8" });
  if (r.status !== 0) return { ok: false, reason: `count-grillers.mjs exited ${r.status === null ? "on a signal" : r.status}` };
  let out;
  try {
    out = JSON.parse(r.stdout);
  } catch {
    return { ok: false, reason: "count-grillers.mjs printed no JSON" };
  }
  if (out === null || typeof out !== "object" || Array.isArray(out)) return { ok: false, reason: "count-grillers.mjs printed no object" };
  const keys = Object.keys(out).sort().join(",");
  if (keys !== "grillers,registered") return { ok: false, reason: `count-grillers.mjs printed keys ${shown(keys)}` };
  if (!Number.isInteger(out.registered) || !Array.isArray(out.grillers) || out.registered !== out.grillers.length) {
    return { ok: false, reason: "count-grillers.mjs: registered is not the length of grillers" };
  }
  let root;
  try {
    root = realpathSync(repo);
  } catch {
    return { ok: false, reason: `repo dir ${shown(repo)} cannot be resolved` };
  }
  const entries = [];
  for (const p of out.grillers) {
    const why = pathReason(p);
    if (why) return { ok: false, reason: why };
    const abs = join(repo, p);
    let real;
    try {
      real = realpathSync(abs);
    } catch (e) {
      if (e && e.code === "ENOENT") return { ok: false, reason: `griller ${shown(p)} cannot be found` };
      return { ok: false, reason: `griller ${shown(p)} cannot be resolved` };
    }
    if (!real.startsWith(root + sep)) return { ok: false, reason: `griller ${shown(p)} resolves outside the repo` };
    // ONE descriptor from here on (6.60.1, CodeQL js/file-system-race): the checks below and the read see the same
    // file, so the path cannot be swapped between them. O_NOFOLLOW refuses a symlink at the final component (ELOOP);
    // O_NONBLOCK keeps a FIFO from blocking the open, and fstat then refuses it as not a regular file.
    let fd;
    try {
      fd = openSync(abs, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    } catch (e) {
      if (e && e.code === "ELOOP") return { ok: false, reason: `griller ${shown(p)} is a symlink` };
      return { ok: false, reason: `griller ${shown(p)} cannot be opened` };
    }
    let text;
    try {
      if (!fstatSync(fd).isFile()) return { ok: false, reason: `griller ${shown(p)} is not a regular file` };
      text = readFileSync(fd, "utf8");
    } catch {
      return { ok: false, reason: `griller ${shown(p)} is unreadable` };
    } finally {
      closeSync(fd);
    }
    if (holdsFrameLine(text)) return { ok: false, reason: `griller ${shown(p)} holds a frame line` };
    entries.push({ path: p, bytes: Buffer.byteLength(text), trimmed: trimGriller(text) });
  }
  return { ok: true, entries };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0].startsWith("-"))) {
    process.stderr.write("usage: node pharn/floor/griller-extract.mjs [repoDir]\n");
    process.exitCode = 2;
  } else {
    const run = args.length === 1 ? extractGrillers(args[0]) : extractGrillers();
    if (!run.ok) {
      process.stderr.write(`griller-extract: ${run.reason}\n`);
      process.exitCode = 2;
    } else process.stdout.write(renderExtract(run.entries));
  }
}
