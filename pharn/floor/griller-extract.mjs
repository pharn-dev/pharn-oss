#!/usr/bin/env node
// pharn/floor/griller-extract.mjs — print every registered griller for a full `/pharn-grill`, without the two
// sections a grill never uses (6.59.0, grill-griller-trim, review finding CTX-1).
//
// WHY (P7 — a measured cost, not a hypothetical). A full `/pharn-grill` Step 3b read all 13 griller files, 188,978 B,
// into ONE context; the 2026-10-05 measured grill agent then made 41 requests whose context grew from 302k to 425k
// tokens, so each request re-sent those bodies (`.dev/measurements/loop-wall-clock-2026-10-05.md` §3). Two sections of
// every griller are not used when the grill applies it inline:
//   - `## Guarantee audit` — the griller's own floor/advisory split of its claims, written for maintainers. The grill
//     carries its own claims block, and its Step 3b keeps the per-axis rule (a griller's findings, or none, never mean
//     the plan is secure / private / accessible on that axis).
//   - `## Machine-readable emission` — the standalone `findings.json` path, which every griller says is finalized only
//     when a live griller runner lands; inline, the grill folds findings into GRILL.md.
// Measured over the 13 grillers at 6.59.0: 188,978 B of files → 141,332 B of griller text printed (−25.2%; 143,786 B of
// stdout with the summary and frame lines), the same for every plan.
//
// EVERY GRILLER STILL RUNS. The review proposed SELECTING grillers per plan from the `scan-plan-*` scanner hits. That was
// measured and rejected (GATE 1 of grill-griller-trim; `.dev/features/grill-griller-trim/MEASUREMENTS.md`): over the
// repo's 282 committed plans it would have skipped the security griller on all 282, and committed GRILL.md files hold
// ≥34 griller findings raised on plans where that griller's scanner had no hit — each griller judges beyond its scanner,
// and for migrations / observability a non-hit is exactly the absence case their main finding covers. No griller has a
// deterministic not-applicable signal, and archetype (`applies:`) selection already happens at install time.
//
// WHAT IT DOES. Spawns `count-grillers.mjs <repo>` (membership stays owned there — no second walk), validates its shape,
// reads each listed file, and prints on stdout: line 1, the `grillers:` summary GRILL.md records; then each griller
// between a BEGIN and an END frame line naming its path and the section ids left out.
//
// THE OMISSION RULE, and its failure direction (L55/L56 — the model's mistakes must only ever load MORE):
//   - Frontmatter is kept verbatim (its `kind:` / `trust:` tags stay visible, P2), delimited exactly as count-grillers.mjs
//     reads it (`---` at byte 0, closed at the next `\n---`). An unclosed frontmatter keeps the whole file.
//   - A section is omitted only when its heading is a column-0 `## ` line, outside any fence, whose text starts with an
//     OMITTED_SECTIONS prefix. START is strict, so an indented or reworded heading is simply kept.
//   - It ends at the first later line, outside a fence, that looks like any ATX heading (`#`–`######`, also after list or
//     blockquote markers) or is a line of only `=` or only `-` (a setext underline or a thematic break); before a setext
//     underline, the paragraph above it (that heading's text) is kept too. END is liberal, so it never runs past a
//     heading a renderer would show.
//   - Fences: backtick or tilde, 0–3 spaces of indent, closed by the same character at least as long with nothing after
//     it (CommonMark). Three constructs keep the WHOLE file, because there this model and a renderer can disagree: a fence
//     still open at EOF; an indented fence followed by a less-indented line before its closer (inside a list item that
//     line closes the fence, at top level it does not); and any line outside fences that opens an HTML block (`<` after
//     0–3 spaces).
// COUPLING, stated (P3): OMITTED_SECTIONS is a second store of the griller body shape — no contract declares griller
// section headings. Its detector is `griller-extract.test.mjs`, which pins that every member matches a heading in every
// committed griller and that no other `##` section of any of them is omitted; a renamed heading is therefore KEPT (and
// that test fails), never something else dropped.
//
// FLOOR: the membership (count-grillers.mjs, primitive #3), the closed OMITTED_SECTIONS set and the line rules above
// (regex, primitive #3), and the refusals. ADVISORY: that the omitted sections hold nothing a grill needs (a reading of
// the 13 committed grillers), that the model reads this output instead of the files, and that it applies every griller.
// NOT A CLAIM: "the grill reviewed less" — every registered griller is printed — nor "the extract matches a renderer"
// beyond the 13 files probed with markdown-it at build time (scratch, recorded in MEASUREMENTS.md; not a pinned test).
//
// Exit: 0 the extract on stdout · 2 refusal (usage; count-grillers failed or printed another shape; a listed path that is
// not a plain in-repo `.md` regular file, a symlink, or unreadable; a griller body holding a frame line). The reason goes
// to stderr and NOTHING to stdout, so a partial extract is never printed; `/pharn-grill` then reads every file in full.
//
// Usage: node pharn/floor/griller-extract.mjs [repoDir]      (default: the current directory)

import "./runtime-floor.mjs";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The closed set of sections left out of every griller: a stable id and the heading-text prefix after `## `. */
export const OMITTED_SECTIONS = Object.freeze([
  Object.freeze({ id: "guarantee-audit", prefix: "Guarantee audit" }),
  Object.freeze({ id: "machine-readable-emission", prefix: "Machine-readable emission" }),
]);

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

/** The omitted-section id a column-0 `## ` heading line opens, or null. */
function omittedId(line) {
  if (!line.startsWith("## ")) return null;
  const text = line.slice(3).trimStart();
  const hit = OMITTED_SECTIONS.find((s) => text.startsWith(s.prefix));
  return hit ? hit.id : null;
}

/**
 * Trim one griller's text. Pure. Returns {text, omitted: [ids in file order], whole: null | reason}; when `whole` is a
 * reason, `text` is the input unchanged and `omitted` is empty.
 */
export function trimGriller(text) {
  const keep = (reason) => ({ text, omitted: [], whole: reason });
  let bodyStart = 0;
  if (text.startsWith("---")) {
    const close = text.indexOf("\n---", 3);
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
    const id = omittedId(line);
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
  if (omitted.length === 0) return { text, omitted, whole: null };
  return { text: head + out.join(""), omitted, whole: null };
}

/** Render the extract from validated entries (`[{path, bytes, trimmed}]`, count-grillers order). Pure. */
export function renderExtract(entries) {
  const n = entries.length;
  if (n === 0) return "grillers: 0 registered — no griller to apply (pharn/floor/griller-extract.mjs)\n";
  const read = entries.reduce((a, e) => a + e.bytes, 0);
  const printed = entries.reduce((a, e) => a + Buffer.byteLength(e.trimmed.text), 0);
  const counts = OMITTED_SECTIONS.map((s) => `${s.id} (${entries.filter((e) => e.trimmed.omitted.includes(s.id)).length})`);
  const whole = entries.filter((e) => e.trimmed.whole !== null).map((e) => `${e.path} (${e.trimmed.whole})`);
  const lines = [
    `grillers: ${n} registered, ${n} printed (pharn/floor/griller-extract.mjs) — ${read} B of griller files, ${printed} B printed;` +
      ` left out where present: ${counts.join(", ")}; kept whole: ${whole.length ? whole.join(", ") : "none"}`,
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
    let st;
    try {
      st = lstatSync(abs);
    } catch {
      return { ok: false, reason: `griller ${shown(p)} cannot be lstat-ed` };
    }
    if (st.isSymbolicLink()) return { ok: false, reason: `griller ${shown(p)} is a symlink` };
    if (!st.isFile()) return { ok: false, reason: `griller ${shown(p)} is not a regular file` };
    let real;
    try {
      real = realpathSync(abs);
    } catch {
      return { ok: false, reason: `griller ${shown(p)} cannot be resolved` };
    }
    if (!real.startsWith(root + sep)) return { ok: false, reason: `griller ${shown(p)} resolves outside the repo` };
    let text;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      return { ok: false, reason: `griller ${shown(p)} is unreadable` };
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
