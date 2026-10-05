// pharn/floor/instruction-files-core.mjs — the PURE rules of the instruction-files checker: which files of a project
// Claude Code attaches to every session (the "always-loaded instruction set"), and how many bytes a change ADDED to
// that set. No I/O here: every function reads a TREE object its caller builds. pharn/floor/instruction-files.mjs builds
// one over the working tree and one over a base commit's git objects; the CLI is pharn/floor/check-instruction-files.mjs.
//
// ============================== THE RECORDED FAILURE (P7), AND WHY THIS CHECK EXISTS ==============================
// A measured /pharn-ship run on a user's project attached 634,379 B of the project's instruction files to every stage
// agent: a 418,456 B CLAUDE.md and 14 `.claude/rules/*.md` files totalling 213,290 B (plus a 2,633 B auto-memory index,
// which is user-level and outside this set). That is about half of a ~302k-token first-request prefix, at bytes/4 (an
// estimate). Eight of the rules carried Cursor-style `globs:` frontmatter and none carried `paths:`, so every rule
// loaded every time. The user reports that the growth came from features whose plans routed per-feature narrative
// into CLAUDE.md; that report cannot be verified from PHARN's repository and is recorded as such. The planning rule
// against that routing is advisory. This is its deterministic backstop: `/pharn-verify` runs `--growth` as the gate
// `instruction-growth` (gate-run-core.mjs).
//
// ============================== THE SET, as Claude Code's memory documentation states it ==============================
// Source: https://code.claude.com/docs/en/memory (read 2026-10-05). DOCUMENTED unless marked ASSUMED.
//   • `CLAUDE.md` and `.claude/CLAUDE.md` at the project root ("Project instructions").
//   • `AGENTS.md` and `.claude/AGENTS.md` at the root, only when neither CLAUDE.md file exists ("Claude reads AGENTS.md
//     only when you have no CLAUDE.md"). NARROWED: the docs also count a CLAUDE.local.md for that test; this module
//     does not, because that file is personal and the gate must read the same on every machine.
//   • `@path` imports, recursively, "with a maximum depth of four hops" (ASSUMED: a direct import of a member is hop 1,
//     so hop 5 is not counted — `import-depth-exceeded`); relative to the importing file's own path (ASSUMED for a file
//     reached through a link); skipped inside code spans and fenced blocks; `\ ` escapes a space; a quoted path is not
//     imported. ASSUMED: a token starts at a line start or after whitespace; trailing punctuation is part of the path;
//     imports inside rules files are expanded too (the docs name CLAUDE.md and AGENTS.md — counting is the safe side).
//   • every `.claude/rules/**/*.md` ("discovered recursively") with no `paths` key ("loaded at launch"). `paths` is
//     "the only field Claude Code reads from a rule", so `globs:` scopes nothing (note `globs-not-read`); a frontmatter
//     whose YAML does not parse loads the rule "as if it had no paths". ASSUMED: the patterns `**`, `**/*` and `*` are
//     catch-alls (`*` strictly matches root-level files only — counted anyway, the safe side); a `paths` key with no
//     pattern loads always; a `paths` value that is not a string or a list of strings (YAML null `~`, a number, a
//     boolean, a mapping, a block scalar `|`/`>`) is `paths-unrecognised` and loads always; and this LINE READER IS NOT
//     A YAML PARSER: an unquoted value starting with a YAML indicator (`*`, `&`, `!`, `%`, `@`, a backquote), a tab in
//     an indentation, a duplicated `paths` key or an unrecognised line marks the frontmatter `frontmatter-unparsed`
//     (always loaded).
//   • the fixed names (`CLAUDE.md`, `.claude/CLAUDE.md`, the AGENTS.md files, `.claude/rules`, a rule's `.md`) are
//     matched CASE-INSENSITIVELY when the exact spelling is absent (`case-variant`): on a case-insensitive volume
//     Claude Code opening `CLAUDE.md` reads a `claude.md`. On a case-sensitive volume that over-counts — the safe side.
//   • symlinks inside the root are followed, directory links in the rules tree included (the hop cap MAX_LINK_HOPS is
//     ASSUMED); an absolute link target is compared to the root after the caller's canonicalisation (`tree.canon`), so
//     `/tmp/…` and `/private/tmp/…` agree; a link or import that resolves outside the root is an "external import" —
//     noted, never counted.
//   • a git SUBMODULE on the way to a member is not read (`submodule-not-read`); its commit is compared instead, and
//     `growth` reports a submodule whose commit differs from the base's as unmeasured (the caller refuses:
//     `submodule-changed`).
// EXCLUDED, stated: subdirectory CLAUDE.md files (loaded on demand), directories above the root, `~/.claude/**`,
// managed policy files, auto memory, git-ignored files (the caller's tree is `tracked ∪ untracked-not-ignored`), and
// `CLAUDE.local.md` (personal: `--report` lists it, `--growth` never counts it). NOT MODELLED, each an over-count:
// block-level HTML comments (stripped before injection), the 4 MiB per-file skip, frontmatter removal, and
// `claudeMdExcludes`. UNDER-COUNT routes KNOWN SO FAR — never a complete list (lessons-learned L67): a catch-all
// spelled another way (`**/*.*`, `./**`, a brace set), a YAML error of a shape the line reader does not recognise
// beside a `paths` key, an always-loaded file made git-ignored, and an edit inside an initialised submodule that is
// not committed there. The harness's real set may differ from this model in either direction; `--growth` is a FLOOR
// verdict over THIS MODEL of the loader, never over the loader itself.
//
// ============================== ADDED BYTES (the `--growth` measure) ==============================
// Per file of the HEAD set: a file that is not in the BASE set (new, lost its `paths`, gained a catch-all, newly
// imported, renamed in) counts WHOLE; a file in both counts its HEAD lines minus its BASE lines as a LINE MULTISET —
// the positive part only, each line's bytes plus its newline. So removals never offset additions, a copy of an
// existing line counts, and a line moved within one file is free; a move ACROSS files counts (the safe side). It is a
// CHANGED-SINCE-BASE measure, never "written by the build" (lessons-learned L17). A per-change budget does not bound
// growth accumulated over many changes that each stay under it; `--report` is the tool for the total.
//
// TRUST (P2): every path, frontmatter value and import token is untrusted repository content. They are used as path
// OPERANDS (normalised, containment-checked) and set members — compared as data, never executed and never compiled
// into a RegExp. A value quoted into a reason goes through `shown`, which cannot throw (lessons-learned L62).

import { posix } from "node:path";
import { matchFrontmatter, readValue, FIELD_LINE_RE } from "./frontmatter-core.mjs";

export const SCHEMA = "pharn-instruction-files/1";

/** Exit codes, shared by both modes; `--report` uses 0 and 2 only. check-instruction-files.mjs restates them (it may
 *  not import this module) and a test pins the two copies equal. */
export const EXIT = Object.freeze({ ok: 0, over: 1, inconclusive: 2 });

/** The verdict tokens. `reported` is `--report`'s; the other three are `--growth`'s. */
export const VERDICTS = Object.freeze(["reported", "within", "over", "inconclusive"]);

/** The threshold when the base commit has no pharn.config.json, or no `budget.instructionGrowthBytes` in it. The ONE
 *  copy (lessons-learned L41): a test reaches it through the CLI with neither present. The value is the maintainer's
 *  choice at GATE 1, not a measurement. */
export const DEFAULT_GROWTH_BYTES = 2048;
export const CONFIG_FILE = "pharn.config.json";
export const BUDGET_KEY = "budget";
export const THRESHOLD_KEY = "instructionGrowthBytes";

export const MAX_IMPORT_HOPS = 4;
export const MAX_LINK_HOPS = 8;

export const ROOT_FILES = Object.freeze(["CLAUDE.md", ".claude/CLAUDE.md"]);
export const AGENTS_FILES = Object.freeze(["AGENTS.md", ".claude/AGENTS.md"]);
export const PERSONAL_FILE = "CLAUDE.local.md";
export const RULES_DIR = ".claude/rules";
export const CATCH_ALL_PATTERNS = Object.freeze(["**", "**/*", "*"]);

/** How a file entered the set. */
export const VIA = Object.freeze(["root", "agents", "rule", "import"]);

/** The closed note vocabulary. A note never changes an exit code; it explains a set decision. */
export const NOTE_CODES = Object.freeze([
  "no-instruction-files",
  "globs-not-read",
  "paths-catch-all",
  "paths-empty",
  "paths-unrecognised",
  "frontmatter-unparsed",
  "case-variant",
  "submodule-not-read",
  "import-missing",
  "import-cycle",
  "import-depth-exceeded",
  "import-not-a-file",
  "outside-root",
  "link-loop",
  "git-ignored-not-counted",
  "personal-not-regular",
]);

/** The closed refusal vocabulary. `crashed` is the CLI entry's alone. */
export const REASON_CODES = Object.freeze([
  "usage-error",
  "git-failed",
  "enumeration-failed",
  "base-unresolved",
  "base-not-commit",
  "unreadable",
  "threshold-malformed",
  "submodule-changed",
  "crashed",
]);

/** A value quoted into a reason, through a function that cannot throw (lessons-learned L62). Bounded. */
export function shown(v) {
  let s;
  try {
    s = JSON.stringify(v);
  } catch {
    s = undefined;
  }
  if (typeof s !== "string") {
    try {
      s = Object.prototype.toString.call(v);
    } catch {
      s = "[unprintable]";
    }
  }
  return s.length > 200 ? `${s.slice(0, 200)}…` : s;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** ------------------------------------------------------------------------------------------------
 *  The threshold, from the BASE commit's pharn.config.json text (`null` when the file is absent there). An absent
 *  `budget` or key → the default; anything present but malformed → `{ok: false, reason_code, reason}`.
 *  ---------------------------------------------------------------------------------------------- */
export function parseThreshold(text) {
  const dflt = { ok: true, value: DEFAULT_GROWTH_BYTES, source: "default" };
  const bad = (reason) => ({ ok: false, reason_code: "threshold-malformed", reason });
  if (text === null) return dflt;
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch {
    return bad(`${CONFIG_FILE} at the base commit is not valid JSON`);
  }
  if (!isPlainObject(cfg)) return bad(`${CONFIG_FILE} at the base commit is not a JSON object`);
  if (!Object.hasOwn(cfg, BUDGET_KEY)) return dflt;
  const budget = cfg[BUDGET_KEY];
  if (!isPlainObject(budget)) return bad(`\`${BUDGET_KEY}\` at the base commit is not an object (got ${shown(budget)})`);
  if (!Object.hasOwn(budget, THRESHOLD_KEY)) return dflt;
  const v = budget[THRESHOLD_KEY];
  if (!Number.isSafeInteger(v) || v < 0) {
    return bad(`\`${BUDGET_KEY}.${THRESHOLD_KEY}\` at the base commit must be a non-negative integer (got ${shown(v)})`);
  }
  return { ok: true, value: v, source: "config" };
}

/** ------------------------------------------------------------------------------------------------
 *  Rule frontmatter → `{loaded, notes}`. A rule is path-scoped (not loaded) only when its frontmatter reads cleanly AND
 *  carries exactly one `paths` key with at least one pattern, none of them a catch-all.
 *  ---------------------------------------------------------------------------------------------- */
const YAML_INDICATOR_RE = /^[*&!%@`]/;
const TOP_KEY_RE = /^([A-Za-z_][\w-]*):(.*)$/;
const NESTED_KEY_RE = /^ +([A-Za-z_][\w-]*):(.*)$/;
const ITEM_RE = /^ *-(?: +(.*))?$/;

function suspectValue(raw) {
  return YAML_INDICATOR_RE.test(raw.trim());
}

/** An UNQUOTED YAML scalar that is not a string — null, a boolean, a number — or a value that is not a scalar at all (a
 *  mapping, a block scalar). Such a `paths` value scopes nothing Claude Code can use as a glob list (GATE 2 review). */
const YAML_NON_STRING_RE =
  /^(?:~|null|Null|NULL|true|True|TRUE|false|False|FALSE|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN)|[-+]?(?:[0-9][0-9_]*(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][-+]?[0-9]+)?|0x[0-9a-fA-F]+|0o[0-7]+|[{[|>].*)$/;

/** One scalar pattern as written, or null when it is not a string. */
function scalarPattern(raw) {
  const t = raw.trim();
  const v = readValue(t);
  if (!/^["']/.test(t) && YAML_NON_STRING_RE.test(v)) return null;
  return v;
}

/** The patterns of a `paths` value written on the key's own line — a flow list `[a, b]` or a comma-separated string.
 *  `"unparsed"` for a flow list that does not close; `"unrecognised"` for a value that is not a string or a list of
 *  strings. */
function inlinePatterns(raw) {
  const v = raw.trim();
  if (v.startsWith("[")) {
    if (!v.endsWith("]")) return "unparsed";
    const items = v
      .slice(1, -1)
      .split(",")
      .filter((s) => s.trim().length > 0)
      .map(scalarPattern);
    if (items.includes(null)) return "unrecognised";
    return items.filter((s) => s.length > 0);
  }
  const whole = scalarPattern(v);
  if (whole === null) return "unrecognised";
  return whole
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function classifyRule(text) {
  const unparsed = { loaded: true, notes: ["frontmatter-unparsed"] };
  const fm = matchFrontmatter(text);
  if (!fm) return { loaded: true, notes: [] };
  const lines = fm[1].split(/\r?\n/);
  let pathsLine = -1;
  let pathsCount = 0;
  let hasGlobs = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^ *\t/.test(line)) return unparsed;
    if (line.trim() === "" || /^\s*#/.test(line)) continue;
    let m = line.match(TOP_KEY_RE);
    if (m) {
      if (suspectValue(m[2])) return unparsed;
      if (m[1] === "paths") {
        pathsLine = i;
        pathsCount++;
      }
      if (m[1] === "globs") hasGlobs = true;
      continue;
    }
    m = line.match(ITEM_RE);
    if (m) {
      if (m[1] !== undefined && suspectValue(m[1])) return unparsed;
      continue;
    }
    m = line.match(NESTED_KEY_RE);
    if (m) {
      if (suspectValue(m[2])) return unparsed;
      continue;
    }
    if (/^ +\S/.test(line)) continue; // an indented continuation of a multi-line scalar
    return unparsed;
  }
  if (pathsCount > 1) return unparsed;
  if (pathsLine === -1) return { loaded: true, notes: hasGlobs ? ["globs-not-read"] : [] };

  const unrecognised = { loaded: true, notes: ["paths-unrecognised"] };
  const value = lines[pathsLine].match(FIELD_LINE_RE)[2];
  let patterns;
  if (value.trim().length > 0) {
    patterns = inlinePatterns(value);
    if (patterns === "unparsed") return unparsed;
    if (patterns === "unrecognised") return unrecognised;
  } else {
    patterns = [];
    for (let i = pathsLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "" || /^\s*#/.test(line)) continue;
      const item = line.match(ITEM_RE);
      if (item) {
        const p = scalarPattern(item[1] ?? "");
        if (p === null) return unrecognised;
        if (p.length > 0) patterns.push(p);
        continue;
      }
      if (/^ /.test(line)) continue;
      break;
    }
  }
  if (patterns.length === 0) return { loaded: true, notes: ["paths-empty"] };
  if (patterns.some((p) => CATCH_ALL_PATTERNS.includes(p))) return { loaded: true, notes: ["paths-catch-all"] };
  return { loaded: false, notes: [] };
}

/** ------------------------------------------------------------------------------------------------
 *  The `@path` imports of one file's text, in order, as written (a `\ ` unescaped to a space).
 *  ---------------------------------------------------------------------------------------------- */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const IMPORT_RE = /(^|\s)@((?:\\ |\S)+)/g;

export function parseImports(text) {
  const out = [];
  let fence = null;
  for (const line of text.split(/\r?\n/)) {
    const f = line.match(FENCE_RE);
    if (fence !== null) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && line.trim() === f[1]) fence = null;
      continue;
    }
    if (f) {
      fence = f[1];
      continue;
    }
    const noSpans = line.replace(/(`+)[\s\S]*?\1/g, " ");
    for (const m of noSpans.matchAll(IMPORT_RE)) {
      const raw = m[2];
      if (raw.startsWith('"') || raw.startsWith("'")) continue;
      out.push(raw.replace(/\\ /g, " "));
    }
  }
  return out;
}

/** ------------------------------------------------------------------------------------------------
 *  Path resolution over a TREE: `{rootAbs, list(): string[], kind(p): "file"|"link"|"other"|null, linkText(p): string,
 *  read(p): Buffer}` — paths repo-relative and `/`-separated; `list()` the tree's file entries (a link is one entry).
 *  ---------------------------------------------------------------------------------------------- */

/** The repo-relative target of `text`, written in directory `parentDir` (a link's text or an import token), or null
 *  when it leaves the root. An absolute path counts only when it lies under the tree's absolute root — as written, or
 *  after `canon` (the caller's canonicalisation, so `/tmp/x` and `/private/tmp/x` agree); `~` never does. */
export function targetRel(parentDir, text, rootAbs, canon = null) {
  if (typeof text !== "string" || text.length === 0 || text.startsWith("~")) return null;
  let rel;
  if (text.startsWith("/")) {
    if (typeof rootAbs !== "string" || rootAbs.length === 0) return null;
    const under = (t) => (t === rootAbs ? "" : typeof t === "string" && t.startsWith(`${rootAbs}/`) ? t.slice(rootAbs.length + 1) : null);
    rel = under(text);
    if (rel === null && typeof canon === "function") rel = under(canon(text));
    if (rel === null) return null;
    if (rel === "") return "";
  } else {
    rel = parentDir ? `${parentDir}/${text}` : text;
  }
  const n = posix.normalize(rel).replace(/\/+$/, "");
  if (n === "." || n === "") return "";
  if (n === ".." || n.startsWith("../") || n.startsWith("/")) return null;
  return n;
}

function dirSet(tree) {
  if (!tree.dirs) {
    const dirs = new Set([""]);
    for (const p of tree.list()) {
      for (let i = p.indexOf("/"); i !== -1; i = p.indexOf("/", i + 1)) dirs.add(p.slice(0, i));
    }
    tree.dirs = dirs;
  }
  return tree.dirs;
}

/** dir → the names listed directly in it (a link or a submodule is a leaf). */
function childIndex(tree) {
  if (!tree.children) {
    const m = new Map();
    for (const p of tree.list()) {
      const parts = p.split("/");
      for (let i = 0; i < parts.length; i++) {
        const dir = parts.slice(0, i).join("/");
        if (!m.has(dir)) m.set(dir, new Set());
        m.get(dir).add(parts[i]);
      }
    }
    tree.children = m;
  }
  return tree.children;
}

/** The listed spelling of `p`, component by component, matching a component CASE-INSENSITIVELY when its exact spelling
 *  is not listed: `{path, folded}`, or null when some component has no match (or sits below a link). */
export function foldPath(tree, p) {
  const idx = childIndex(tree);
  let cur = "";
  let folded = false;
  for (const part of p.split("/")) {
    const kids = idx.get(cur);
    if (!kids) return null;
    const name = kids.has(part) ? part : [...kids].sort().find((k) => k.toLowerCase() === part.toLowerCase());
    if (name === undefined) return null;
    if (name !== part) folded = true;
    cur = cur ? `${cur}/${name}` : name;
  }
  return { path: cur, folded };
}

/** Resolve `rel` component by component, following links inside the root.
 *  `{state: "file"|"dir"|"missing"|"outside-root"|"link-loop"|"submodule", path}` — for a submodule, `path` is the
 *  submodule itself. */
export function resolvePath(tree, rel) {
  let parts = rel === "" ? [] : rel.split("/");
  let hops = 0;
  let i = 0;
  while (i < parts.length) {
    const prefix = parts.slice(0, i + 1).join("/");
    const kind = tree.kind(prefix);
    if (kind === "submodule") return { state: "submodule", path: prefix };
    if (kind === "link") {
      if (++hops > MAX_LINK_HOPS) return { state: "link-loop", path: rel };
      const target = targetRel(parts.slice(0, i).join("/"), tree.linkText(prefix), tree.rootAbs, tree.canon);
      if (target === null) return { state: "outside-root", path: rel };
      parts = [...(target === "" ? [] : target.split("/")), ...parts.slice(i + 1)];
      i = 0;
      continue;
    }
    i++;
  }
  const p = parts.join("/");
  if (p !== "" && tree.kind(p) === "file") return { state: "file", path: p };
  if (dirSet(tree).has(p)) return { state: "dir", path: p };
  return { state: "missing", path: p };
}

/** ------------------------------------------------------------------------------------------------
 *  The always-loaded set of one tree: `{files: Map<path, {via, bytes, content}>, scoped: string[], notes: [{code,
 *  path, detail?}]}`. Keys are the paths Claude Code sees (a rule reached through a directory link keeps its path under
 *  `.claude/rules`). A read failure propagates; the I/O layer maps it to a refusal.
 *  ---------------------------------------------------------------------------------------------- */
export function computeSet(tree) {
  const files = new Map();
  const scoped = [];
  const notes = [];
  const submodules = new Map();
  const note = (code, path, detail) => notes.push(detail === undefined ? { code, path } : { code, path, detail });
  const add = (path, real, via) => {
    const content = tree.read(real);
    files.set(path, { via, bytes: content.length, content });
  };
  // A submodule on the way to a member: not read, its commit recorded for `growth` to compare (`unmeasured`).
  const unread = (r, path, detail) => {
    note("submodule-not-read", path, detail);
    submodules.set(r.path, tree.submoduleId(r.path));
  };
  // A fixed name, matched case-insensitively when its exact spelling is not listed.
  const resolveFixed = (p) => {
    const f = foldPath(tree, p);
    const r = resolvePath(tree, f ? f.path : p);
    if (f?.folded && (r.state === "file" || r.state === "dir")) note("case-variant", p, f.path);
    return r;
  };

  // 1. CLAUDE.md / .claude/CLAUDE.md, else the AGENTS.md files.
  const present = (p) => {
    const r = resolveFixed(p);
    if (r.state === "outside-root" || r.state === "link-loop") note(r.state, p);
    if (r.state === "submodule") unread(r, p);
    return r.state === "file" ? r : null;
  };
  const roots = ROOT_FILES.map((p) => [p, present(p), "root"]).filter(([, r]) => r);
  const tops = roots.length > 0 ? roots : AGENTS_FILES.map((p) => [p, present(p), "agents"]).filter(([, r]) => r);
  for (const [p, r, via] of tops) add(p, r.path, via);

  // 2. Rules, recursively, through in-root directory links; a directory already on the walk is a loop, noted once.
  const walkRules = (shownDir, realDir, visited) => {
    const prefix = realDir === "" ? "" : `${realDir}/`;
    const children = new Set();
    for (const p of tree.list()) if (p.startsWith(prefix)) children.add(p.slice(prefix.length).split("/")[0]);
    for (const name of [...children].sort()) {
      const path = `${shownDir}/${name}`;
      const r = resolvePath(tree, `${prefix}${name}`);
      if (r.state === "dir") {
        if (visited.has(r.path)) note("link-loop", path);
        else walkRules(path, r.path, new Set([...visited, r.path]));
        continue;
      }
      if (r.state === "outside-root" || r.state === "link-loop") {
        note(r.state, path); // a link of either kind, file or directory, that leaves the root or loops
        continue;
      }
      if (r.state === "submodule") {
        unread(r, path);
        continue;
      }
      if (!name.toLowerCase().endsWith(".md")) continue;
      if (r.state !== "file") continue;
      const content = tree.read(r.path);
      const c = classifyRule(content.toString("utf8"));
      if (!c.loaded) {
        scoped.push(path);
        continue;
      }
      files.set(path, { via: "rule", bytes: content.length, content });
      for (const code of c.notes) note(code, path);
    }
  };
  const rules = resolveFixed(RULES_DIR);
  if (rules.state === "outside-root" || rules.state === "link-loop") note(rules.state, RULES_DIR);
  if (rules.state === "submodule") unread(rules, RULES_DIR);
  if (rules.state === "dir") walkRules(RULES_DIR, rules.path, new Set([rules.path]));

  // 3. Imports, breadth-first from every member; `chain` is the import path from a member down to this file.
  const queue = [...files.keys()].map((p) => ({ path: p, depth: 0, chain: [p] }));
  while (queue.length) {
    const { path, depth, chain } = queue.shift();
    const dir = posix.dirname(path);
    for (const token of parseImports(files.get(path).content.toString("utf8"))) {
      const rel = targetRel(dir === "." ? "" : dir, token, tree.rootAbs, tree.canon);
      if (rel === null) {
        note("outside-root", path, token);
        continue;
      }
      if (chain.includes(rel)) {
        note("import-cycle", path, token);
        continue;
      }
      if (files.has(rel)) continue; // already in the set — counted once
      if (depth + 1 > MAX_IMPORT_HOPS) {
        note("import-depth-exceeded", path, token);
        continue;
      }
      const r = resolvePath(tree, rel);
      if (r.state === "file") {
        add(rel, r.path, "import");
        queue.push({ path: rel, depth: depth + 1, chain: [...chain, rel] });
      } else if (r.state === "dir") note("import-not-a-file", path, token);
      else if (r.state === "missing") note("import-missing", path, token);
      else if (r.state === "submodule") unread(r, path, token);
      else note(r.state, path, token);
    }
  }

  if (files.size === 0) note("no-instruction-files", "");
  return { files, scoped: scoped.sort(), notes, submodules };
}

/** ------------------------------------------------------------------------------------------------
 *  Bytes `head` ADDED over `base` (two Buffers): the positive part of the line-multiset difference. latin1 keeps one
 *  character per byte, so lengths are byte counts; each line counts with the newline that ends it.
 *  ---------------------------------------------------------------------------------------------- */
function lineEntries(buf) {
  const parts = buf.toString("latin1").split("\n");
  const last = parts.pop();
  const out = parts.map((l) => [l, l.length + 1]);
  if (last.length > 0) out.push([last, last.length]);
  return out;
}

export function addedBytes(base, head) {
  const counts = new Map();
  for (const [l] of lineEntries(base)) counts.set(l, (counts.get(l) ?? 0) + 1);
  let added = 0;
  for (const [l, n] of lineEntries(head)) {
    const c = counts.get(l) ?? 0;
    if (c > 0) counts.set(l, c - 1);
    else added += n;
  }
  return added;
}

/** Growth between two computed sets: `{added_bytes, files: [{path, added_bytes, entered_set}]}`, sorted by path; a file
 *  that entered the set or added bytes is listed. */
export function growth(baseSet, headSet) {
  const files = [];
  let total = 0;
  for (const path of [...headSet.files.keys()].sort()) {
    const h = headSet.files.get(path);
    const b = baseSet.files.get(path);
    const added = b ? addedBytes(b.content, h.content) : h.bytes;
    total += added;
    if (added > 0 || !b) files.push({ path, added_bytes: added, entered_set: !b });
  }
  // A submodule the HEAD set reaches whose commit differs from the base's (or that the base set never reached) holds
  // content this module cannot read — so the growth is UNMEASURED there, never 0.
  const baseSubs = baseSet.submodules ?? new Map();
  const unmeasured = [...(headSet.submodules ?? new Map())]
    .filter(([p, id]) => baseSubs.get(p) !== id)
    .map(([p]) => p)
    .sort();
  return { added_bytes: total, files, unmeasured };
}

/** The `--report` fields for one computed set. */
export function reportBody(set) {
  const files = [...set.files.keys()].sort().map((p) => ({ path: p, via: set.files.get(p).via, bytes: set.files.get(p).bytes }));
  const total = files.reduce((s, f) => s + f.bytes, 0);
  return {
    files,
    total_bytes: total,
    estimated_tokens: Math.ceil(total / 4),
    estimate_basis: "bytes / 4 — an estimate, never a measurement (LIMITS.md §1c)",
    path_scoped: set.scoped,
    notes: set.notes,
  };
}
