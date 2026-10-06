// pharn/floor/installed-skills-core.mjs — the ONE discovery of user-installed Claude Code skills, plus a
// bounded, body-free metadata CATALOGUE over that discovery (6.47.0, selective-skill-reads).
//
// TWO CONSUMERS, ONE ENUMERATOR (L35). `scan-installed-skills.mjs` prints the legacy roster
// `{count, skills:[{name, path}]}` from `discoverInstalledSkills()`; `catalogue-installed-skills.mjs` prints
// the catalogue from `buildCatalogue()`, which calls the same function. There is no second listing that
// could disagree with the first. The legacy predicate is preserved exactly: an entry registers iff it is
// a real directory directly under `<target>/.claude/skills/` (lstat, never a link) that directly holds a
// real `SKILL.md` file (lstat). What changed is that the reasons an entry did NOT register, and the
// failures the legacy loop swallowed, are now returned as diagnostics the legacy CLI discards.
//
// WHAT THE CATALOGUE IS FOR. The product stages `/pharn-build`, full `/pharn-grill` and each `/pharn-review`
// lens used to read every listed `SKILL.md` in full. They now read this catalogue first and follow
// `pharn/pharn-core/installed-skill-selection/installed-skill-selection.md` to decide which bodies to read.
// The selection is ADVISORY model work. Nothing here decides relevance, and nothing here gates.
//
// OUTPUT (`buildCatalogue`, printed as one JSON line by the companion CLI):
//   { catalogue: "installed-skills/1",
//     mode: "none" | "read-all" | "select",            // deterministic, see modeOf()
//     mode_reason: MODE_REASONS member,
//     roster: "complete" | "incomplete",               // incomplete = an entry or the root could not be stat'ed/listed
//     skills_root: ROOT_STATES member,
//     count, total_bytes (number | null — null when any entry's size is unknown),
//     excluded: [{ entry, reason: EXCLUDED_REASONS member }],   // what the discovery rules left out, never read
//     skills: [{ path, dir, bytes, metadata: METADATA member, issues: [ISSUES members],
//                declared_name: string | null, description: string | null }] }
//   `path` is the IDENTITY (repo-relative, the legacy roster's own value); `dir` is the legacy `name`;
//   `declared_name` is display-only. Two dirs declaring one name stay two entries.
//
// METADATA STATUS (closed enum). `ok` — a `description` read in the supported subset, untruncated. Every
// other status means "do not exclude this skill on the strength of its description":
//   truncated · missing (no frontmatter / no description / empty or null description) · unsupported (any form
//   outside the subset, a duplicate key, invalid UTF-8, a fence not closed within the head bound) ·
//   unreadable (open/read failed, e.g. vanished after discovery) · unsafe (failed the access check — this
//   helper never reads it (floor, tested); a consumer is INSTRUCTED never to read it, which is ADVISORY: the
//   model's Read tool can open any path) · withheld (the output bound dropped the description).
//
// THE SUPPORTED SUBSET (keys `name` and `description` only; every other key is skipped and never
// interpreted — `allowed-tools`, `model`, hooks and nested maps confer nothing here). Inside the leading
// `---` block (one leading BOM and CRLF tolerated, via frontmatter-core), a top-level `key: value` line whose
// value is ONE of:
//   - a single-line plain scalar that does not start with an indicator (`[ { & * ! % @ \` | > ' " ~` handled
//     separately), contains no `: ` and no tab; a ` #` comment is stripped;
//   - a single-line single-quoted scalar without `''`, or double-quoted scalar without a backslash, closed on
//     the same line, followed by nothing but an optional ` #` comment;
//   - a block scalar `|` or `>` with an optional `-`/`+` chomping indicator and NO explicit indentation
//     indicator, whose content lines share one space indentation (no tabs). `|` keeps line breaks; `>` joins
//     the lines of a paragraph with one space and turns a blank line into a line break. A `>` body with a
//     MORE-indented line is unsupported (YAML keeps those lines literal; this reader does not model it).
//     Trailing whitespace is trimmed whatever the chomping indicator says (a description is display text).
// Everything else — multi-line plain, flow, escapes, `''`, an indentation indicator, a duplicate key, an
// unterminated quote, `~`/`null`, an empty value, a nested map — is `unsupported` or `missing`, never guessed.
// `frontmatter-core`'s `readValue` is deliberately NOT used for values: it is lenient by design (it keeps
// text after a closing quote, strips an unterminated quote, reads LAST-wins on a duplicate), which is right
// for PHARN's own pins and wrong here, where any doubt must route the skill to a full read. (L67) This
// subset is the author's model of YAML as Claude Code reads it; it states what it ACCEPTS, and claims nothing
// about every form a real skill may use — an unmodelled form lands in `unsupported`, the safe direction.
//
// BOUNDS, and why each number. HEAD_BYTES = 16,384: the most read per file; real skills keep their
// frontmatter in the first few hundred bytes (the eight measured in pharn-starter: all under 2 KB), so 16 KiB
// is generous while keeping a 47 KB body out of memory. DESCRIPTION_MAX_CHARS = 1,024: the description
// length Claude Code's own skill docs set as the maximum; longer is `truncated` (cut at a code point).
// NAME_MAX_CHARS = 128: display only. OUTPUT_MAX_BYTES = 65,536: over it, EVERY description and declared
// name is withheld (`withheld`, mode `read-all`, reason `output-bound`). The roster itself is NEVER cut and
// never truncated to the first N, so a roster large enough to exceed the bound on its own still prints
// whole — the bound limits descriptions, not entries. READ_ALL_MAX_BYTES = 16,384: at or below this total of
// SKILL.md bytes, mode is `read-all` — selecting costs the procedure file plus the catalogue (measured in
// .dev/features/selective-skill-reads/MEASUREMENTS.md), so below this the bytes a selection could save are
// about what it spends, while a miss would cost a convention.
//
// THE ACCESS CHECK (L54, L59), per entry, before any byte is read: realpath(entry) must lie strictly inside
// realpath(target); the open uses O_RDONLY|O_NOFOLLOW|O_NONBLOCK (a SKILL.md swapped for a link after
// discovery fails with ELOOP; a FIFO cannot block the open); fstat must say regular file. A failure is
// `unsafe` and is never retried or read another way. ENOENT/EACCES/other read errors are `unreadable`.
// BOUNDED (P0): realpath→open is a race — a parent directory swapped between the two is not caught, and the
// check covers the bytes THIS process read, never a later model Read of the same path. On a platform without
// O_NOFOLLOW (Windows) only the discovery lstat and the realpath check apply. A catalogue is not a snapshot.
//
// WHAT THIS DOES NOT DO (P0). It executes nothing, expands nothing, follows no instruction in a skill, and
// emits no body text — never an excerpt, never a fallback to the first lines. It does not decide relevance.
// It does not prove a later read used these bytes. `ok` metadata is syntactically readable, NEVER a complete
// or truthful account of what a skill applies to. TRUST (P2): every name, path and description is untrusted
// DATA; JSON.stringify keeps the output one line whatever a name holds.
//
// stdlib only, deterministic (sorted, no clock, no randomness).

import { readdirSync, lstatSync, realpathSync, openSync, readSync, fstatSync, closeSync, constants } from "node:fs";
import { join, sep } from "node:path";
import { FM_RE, FIELD_LINE_RE, stripBom } from "./frontmatter-core.mjs";

export const CATALOGUE_FORMAT = "installed-skills/1";
export const HEAD_BYTES = 16384;
export const DESCRIPTION_MAX_CHARS = 1024;
export const NAME_MAX_CHARS = 128;
export const OUTPUT_MAX_BYTES = 65536;
export const READ_ALL_MAX_BYTES = 16384;

export const METADATA = Object.freeze(["ok", "truncated", "missing", "unsupported", "unreadable", "unsafe", "withheld"]);
export const MODES = Object.freeze(["none", "read-all", "select"]);
export const MODE_REASONS = Object.freeze([
  "no-skills",
  "roster-incomplete",
  "output-bound",
  "all-unsafe",
  "no-usable-metadata",
  "small-roster",
  "selectable",
]);
export const ROOT_STATES = Object.freeze(["absent", "directory", "symlink", "not-a-directory", "unreadable"]);
export const EXCLUDED_REASONS = Object.freeze([
  "symlink",
  "not-a-directory",
  "no-skill-file",
  "skill-file-symlink",
  "skill-file-not-a-file",
  "vanished",
  "stat-failed",
]);

const FIELD_ISSUES = [
  "duplicate",
  "empty",
  "null",
  "flow",
  "escape",
  "unterminated-quote",
  "trailing-text",
  "continuation",
  "multiline-plain",
  "nested",
  "indicator",
  "colon-in-plain",
  "tab",
  "block-indent-indicator",
  "block-malformed",
  "truncated",
];
export const ISSUES = Object.freeze([
  "no-frontmatter",
  "frontmatter-unterminated",
  "frontmatter-over-bound",
  "invalid-utf8",
  "description-absent",
  ...FIELD_ISSUES.map((i) => `description-${i}`),
  ...FIELD_ISSUES.map((i) => `name-${i}`),
  "outside-target",
  "link",
  "not-a-file",
  "vanished",
  "read-failed",
  "withheld-output-bound",
]);

// ── discovery ─────────────────────────────────────────────────────────────────────────────────────────

function lstatOrError(p) {
  try {
    return { st: lstatSync(p) };
  } catch (e) {
    return { code: e && typeof e.code === "string" ? e.code : "UNKNOWN" };
  }
}

const ABSENT_CODES = new Set(["ENOENT", "ENOTDIR"]);
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const byEntry = (a, b) => (a.entry < b.entry ? -1 : a.entry > b.entry ? 1 : 0);

/**
 * The one enumerator. Returns `{ root, roster, skills: [{name, path}], excluded: [{entry, reason}] }`.
 * `skills` is exactly the legacy roster (same predicate, same sort). Never throws.
 */
export function discoverInstalledSkills(target) {
  const skillsRoot = join(target, ".claude", "skills");
  const skills = [];
  const excluded = [];
  let roster = "complete";
  let root;

  const r = lstatOrError(skillsRoot);
  if (!r.st) {
    root = ABSENT_CODES.has(r.code) ? "absent" : "unreadable";
  } else if (r.st.isSymbolicLink()) {
    root = "symlink";
  } else if (!r.st.isDirectory()) {
    root = "not-a-directory";
  } else {
    root = "directory";
  }
  if (root === "unreadable") roster = "incomplete";

  if (root === "directory") {
    let entries = [];
    try {
      entries = readdirSync(skillsRoot);
    } catch {
      root = "unreadable";
      roster = "incomplete";
    }
    for (const name of entries) {
      const dir = join(skillsRoot, name);
      const d = lstatOrError(dir);
      if (!d.st) {
        excluded.push({ entry: name, reason: ABSENT_CODES.has(d.code) ? "vanished" : "stat-failed" });
        if (!ABSENT_CODES.has(d.code)) roster = "incomplete";
        continue;
      }
      if (d.st.isSymbolicLink()) {
        excluded.push({ entry: name, reason: "symlink" });
        continue;
      }
      if (!d.st.isDirectory()) {
        excluded.push({ entry: name, reason: "not-a-directory" });
        continue;
      }
      const f = lstatOrError(join(dir, "SKILL.md"));
      if (!f.st) {
        if (ABSENT_CODES.has(f.code)) {
          excluded.push({ entry: name, reason: "no-skill-file" });
        } else {
          excluded.push({ entry: name, reason: "stat-failed" });
          roster = "incomplete";
        }
        continue;
      }
      if (f.st.isSymbolicLink()) {
        excluded.push({ entry: name, reason: "skill-file-symlink" });
        continue;
      }
      if (!f.st.isFile()) {
        excluded.push({ entry: name, reason: "skill-file-not-a-file" });
        continue;
      }
      skills.push({ name, path: `.claude/skills/${name}/SKILL.md` });
    }
  }

  skills.sort(byName);
  excluded.sort(byEntry);
  return { root, roster, skills, excluded };
}

// ── safe bounded read ─────────────────────────────────────────────────────────────────────────────────

const OPEN_FLAGS = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);

function isInside(child, parent) {
  const p = parent.endsWith(sep) ? parent : parent + sep;
  return child.startsWith(p);
}

function failure(metadata, issue, bytes = null) {
  return { bytes, metadata, issues: [issue], declared_name: null, description: null };
}

/**
 * Read one entry's head under the access check and parse its metadata. `realTarget` is realpath(target),
 * or null when it could not be resolved (every entry is then `unsafe`). Never throws.
 */
export function readSkillMetadata(target, realTarget, entry) {
  const abs = join(target, entry.path);
  if (realTarget === null) return failure("unsafe", "outside-target");
  let real;
  try {
    real = realpathSync(abs);
  } catch (e) {
    const code = e && e.code;
    if (code === "ELOOP") return failure("unsafe", "link");
    return failure("unreadable", code === "ENOENT" || code === "ENOTDIR" ? "vanished" : "read-failed");
  }
  if (!isInside(real, realTarget)) return failure("unsafe", "outside-target");

  let fd;
  try {
    fd = openSync(abs, OPEN_FLAGS);
  } catch (e) {
    const code = e && e.code;
    if (code === "ELOOP" || code === "EMLINK") return failure("unsafe", "link");
    return failure("unreadable", code === "ENOENT" || code === "ENOTDIR" ? "vanished" : "read-failed");
  }
  let bytes;
  let head;
  try {
    const st = fstatSync(fd);
    if (!st.isFile()) return failure("unsafe", "not-a-file");
    bytes = st.size;
    const buf = Buffer.alloc(Math.min(HEAD_BYTES, Math.max(st.size, 0)));
    let got = 0;
    while (got < buf.length) {
      const n = readSync(fd, buf, got, buf.length - got, got);
      if (n <= 0) break;
      got += n;
    }
    head = buf.subarray(0, got);
  } catch {
    return failure("unreadable", "read-failed", bytes ?? null);
  } finally {
    try {
      closeSync(fd);
    } catch {
      // nothing to do: the descriptor is gone either way
    }
  }
  return { bytes, ...parseMetadata(head, bytes > head.length) };
}

// ── the subset parser ─────────────────────────────────────────────────────────────────────────────────

// A plain scalar may not START with a YAML indicator: flow/anchor/alias/tag/directive/reserved characters,
// or `-`/`?`/`:` followed by a space (a sequence entry, a complex key, a mapping value).
const PLAIN_INDICATOR_RE = /^(?:[[{&*!%@`|>'"]|[-?:](?:\s|$))/;
const NESTED_LINE_RE = /^\s*(?:- |[\w-]+:(?:\s|$))/;
const BLOCK_HEADER_RE = /^([|>])([+-]?)(?:[ \t]+#.*)?$/;
const NULL_RE = /^(~|null|Null|NULL)$/;

function stripPlainComment(v) {
  return v.replace(/(^|\s)#.*$/, "").trim();
}

// One field's value from its key line and the indented/blank lines that follow it. Returns
// `{ value }` or `{ issue }` (a FIELD_ISSUES member).
function readFieldValue(raw, cont) {
  const contText = cont.filter((l) => l.trim() !== "");
  const v = raw.replace(/[ \t]+$/, "");
  const head = v.trim();

  if (head === "" || /^#/.test(head)) {
    if (contText.length > 0) return { issue: NESTED_LINE_RE.test(contText[0]) ? "nested" : "multiline-plain" };
    return { issue: "empty" };
  }

  const block = head.match(BLOCK_HEADER_RE);
  if (block) return readBlock(block[1], cont);
  if (/^[|>]/.test(head)) return { issue: "block-indent-indicator" };

  if (head[0] === '"' || head[0] === "'") {
    const q = head[0];
    if (q === '"' && head.includes("\\")) return { issue: "escape" };
    const end = head.indexOf(q, 1);
    if (end < 0) return { issue: "unterminated-quote" };
    if (q === "'" && head[end + 1] === "'") return { issue: "escape" };
    const rest = head.slice(end + 1);
    if (rest.trim() !== "" && !/^[ \t]+#/.test(rest)) return { issue: "trailing-text" };
    if (contText.length > 0) return { issue: "continuation" };
    return { value: head.slice(1, end) };
  }

  if (head[0] === "[" || head[0] === "{") return { issue: "flow" };
  if (PLAIN_INDICATOR_RE.test(head)) return { issue: "indicator" };
  if (contText.length > 0) return { issue: "multiline-plain" };
  if (head.includes("\t")) return { issue: "tab" };
  const plain = stripPlainComment(head);
  if (plain === "") return { issue: "empty" };
  if (NULL_RE.test(plain)) return { issue: "null" };
  if (/:(\s|$)/.test(plain)) return { issue: "colon-in-plain" };
  return { value: plain };
}

function readBlock(style, cont) {
  // trailing blank lines belong to chomping, not content
  const lines = [...cont];
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length === 0) return { issue: "empty" };
  if (lines.some((l) => /^\s*\t/.test(l) || /^\t/.test(l))) return { issue: "block-malformed" };
  const first = lines.find((l) => l.trim() !== "");
  const indent = first.length - first.trimStart().length;
  if (indent === 0) return { issue: "block-malformed" };
  const body = [];
  for (const l of lines) {
    if (l.trim() === "") {
      body.push("");
      continue;
    }
    const li = l.length - l.trimStart().length;
    if (li < indent) return { issue: "block-malformed" };
    if (li > indent && style === ">") return { issue: "block-malformed" };
    body.push(l.slice(indent));
  }
  let value;
  if (style === "|") {
    value = body.join("\n");
  } else {
    const paras = [];
    let cur = [];
    for (const l of body) {
      if (l === "") {
        paras.push(cur.join(" "));
        cur = [];
      } else {
        cur.push(l);
      }
    }
    paras.push(cur.join(" "));
    value = paras.filter((p, i) => p !== "" || i < paras.length - 1).join("\n");
  }
  value = value.replace(/\s+$/, "");
  if (value === "") return { issue: "empty" };
  return { value };
}

function bounded(value, max) {
  const cps = Array.from(value);
  return cps.length > max ? { text: cps.slice(0, max).join(""), cut: true } : { text: value, cut: false };
}

/**
 * Parse the supported subset from a head buffer. `moreBeyondHead` says the file is longer than the head.
 * Returns `{ metadata, issues, declared_name, description }`. Exported for tests; never throws.
 */
export function parseMetadata(head, moreBeyondHead) {
  const text = stripBom(new TextDecoder("utf-8", { fatal: false }).decode(head));
  const none = (metadata, issue) => ({ metadata, issues: [issue], declared_name: null, description: null });

  if (/^---\r?\n---(\r?\n|$)/.test(text)) return none("missing", "description-absent");
  const m = text.match(FM_RE);
  if (!m) {
    if (/^---\r?\n/.test(text)) return none("unsupported", moreBeyondHead ? "frontmatter-over-bound" : "frontmatter-unterminated");
    return none("missing", "no-frontmatter");
  }
  const block = m[1];
  if (block.includes("�")) return none("unsupported", "invalid-utf8");

  const lines = block.split(/\r?\n/);
  const found = { name: [], description: [] };
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(FIELD_LINE_RE);
    if (!kv || !(kv[1] in found)) continue;
    const cont = [];
    for (let j = i + 1; j < lines.length && (lines[j].trim() === "" || /^[ \t]/.test(lines[j])); j++) cont.push(lines[j]);
    found[kv[1]].push({ raw: kv[2], cont });
  }

  const issues = [];
  const field = (key, max) => {
    const occ = found[key];
    if (occ.length === 0) return { text: null, status: "absent" };
    if (occ.length > 1) {
      issues.push(`${key}-duplicate`);
      return { text: null, status: "bad" };
    }
    const r = readFieldValue(occ[0].raw, occ[0].cont);
    if (r.issue) {
      issues.push(`${key}-${r.issue}`);
      return { text: null, status: r.issue === "empty" || r.issue === "null" ? "absent" : "bad" };
    }
    const b = bounded(r.value, max);
    if (b.cut) issues.push(`${key}-truncated`);
    return { text: b.text, status: b.cut ? "cut" : "ok" };
  };

  const name = field("name", NAME_MAX_CHARS);
  const desc = field("description", DESCRIPTION_MAX_CHARS);
  if (desc.status === "absent" && found.description.length === 0) issues.push("description-absent");
  const metadata = desc.status === "ok" ? "ok" : desc.status === "cut" ? "truncated" : desc.status === "absent" ? "missing" : "unsupported";
  return { metadata, issues, declared_name: name.text, description: desc.text };
}

// ── the catalogue ─────────────────────────────────────────────────────────────────────────────────────

function modeOf(doc) {
  if (doc.roster === "incomplete") return ["read-all", "roster-incomplete"];
  if (doc.count === 0) return ["none", "no-skills"];
  if (doc.skills.some((s) => s.metadata === "withheld")) return ["read-all", "output-bound"];
  // Every entry failed the access check (e.g. `.claude` links outside the target): read-all reads nothing,
  // and the reason says why, rather than blaming the metadata.
  if (doc.skills.every((s) => s.metadata === "unsafe")) return ["read-all", "all-unsafe"];
  if (!doc.skills.some((s) => s.metadata === "ok")) return ["read-all", "no-usable-metadata"];
  if (doc.total_bytes !== null && doc.total_bytes <= READ_ALL_MAX_BYTES) return ["read-all", "small-roster"];
  return ["select", "selectable"];
}

function assemble(d, skills) {
  const total = skills.every((s) => typeof s.bytes === "number") ? skills.reduce((a, s) => a + s.bytes, 0) : null;
  const doc = {
    catalogue: CATALOGUE_FORMAT,
    mode: null,
    mode_reason: null,
    roster: d.roster,
    skills_root: d.root,
    count: skills.length,
    total_bytes: total,
    excluded: d.excluded,
    skills,
  };
  [doc.mode, doc.mode_reason] = modeOf(doc);
  return doc;
}

/** The whole catalogue document for `target`. Deterministic; throws only on a programming error. */
export function buildCatalogue(target) {
  const d = discoverInstalledSkills(target);
  let realTarget;
  try {
    realTarget = realpathSync(target);
  } catch {
    realTarget = null;
  }
  const skills = d.skills.map((e) => {
    const m = readSkillMetadata(target, realTarget, e);
    return {
      path: e.path,
      dir: e.name,
      bytes: m.bytes,
      metadata: m.metadata,
      issues: m.issues,
      declared_name: m.declared_name,
      description: m.description,
    };
  });
  let doc = assemble(d, skills);
  if (Buffer.byteLength(JSON.stringify(doc)) > OUTPUT_MAX_BYTES) {
    const withheld = skills.map((s) =>
      s.description === null && s.declared_name === null
        ? s
        : {
            ...s,
            metadata: s.metadata === "ok" || s.metadata === "truncated" ? "withheld" : s.metadata,
            issues: [...s.issues, "withheld-output-bound"],
            declared_name: null,
            description: null,
          }
    );
    doc = assemble(d, withheld);
    if (!withheld.some((s) => s.metadata === "withheld")) [doc.mode, doc.mode_reason] = ["read-all", "output-bound"];
  }
  return doc;
}
