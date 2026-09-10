#!/usr/bin/env node
// .dev/floor/capability-catalog-core.mjs — the SHARED, deterministic core for the capability catalog.
//
// Single source of truth imported by BOTH the generator (gen-capability-catalog.mjs) and the drift
// checker (check-capability-catalog.mjs), so "recompute" (checker) is byte-identical to "generate"
// (generator) BY CONSTRUCTION — the byte-equality guard would be meaningless if the two sides rendered
// via different code (P3: route the shared thing through one module; do not duplicate).
//
// It is build APPARATUS, not a PHARN capability: it declares no `role:` frontmatter, ships no evals, and
// lives under `.dev/floor/` (excluded from validate.mjs's product scan). It CONSUMES the frontmatter
// shape that pharn/floor/validate.mjs enforces (ARCHITECTURE §3.1) — it renders only fields that script
// recognizes and enumerates by the SAME `role:` membership test (cite, don't restate — P4).
//
// SCOPE NOTE (P3, stated rather than hidden): this module renders TWO generated artifacts, not one —
// the capability catalog (docs/capabilities/**) and the root README's `## Current state` block. Its
// filename says only the first. That is a KNOWN, accepted cost: the alternative (a separate core +
// generator + checker per artifact) was put to the human at the plan gate for the readme-current-state
// increment and Option A — "extend this file" — was chosen, in exchange for reusing the existing
// generate/check wiring and CI step unchanged. The two artifacts share one enumeration source, which is
// the point; they are kept in clearly separated sections below.
//
// Deterministic (P5): enumeration = walk + frontmatter `role` membership (no LLM); ordering = fixed role
// order then slug ascending (a total order, independent of readdir order); rendering = a pure function of
// (frontmatter, source H1 tagline); NO timestamps anywhere → running twice yields byte-identical output.
// A duplicate page slug is a thrown Error (fail-closed), never a silent overwrite.
//
// Non-LLM, stdlib-only.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep, basename, dirname } from "node:path";
import { posix } from "node:path";

// The catalog output directory (repo-relative, POSIX). One page per capability + a README index.
export const OUT_DIR = "docs/capabilities";

// Fixed presentation order + labels for every `role` enum member (ARCHITECTURE §3.1 role enum). A total
// order over roles makes the index deterministic regardless of filesystem walk order.
export const ROLE_ORDER = ["griller", "lens", "skill", "validator", "verifier", "auditor"];
export const ROLE_HEADING = {
  griller: "Grillers",
  lens: "Lenses",
  skill: "Skills",
  validator: "Validators",
  verifier: "Verifiers",
  auditor: "Auditors",
};
// "what it <verb>" per role — the section that surfaces the source's own H1 tagline as DATA.
export const ROLE_VERB = {
  griller: "asks",
  lens: "flags",
  skill: "does",
  validator: "validates",
  verifier: "verifies",
  auditor: "audits",
};

// Same capability surface as validate.mjs / count-grillers.mjs: tooling + noise are NOT capabilities.
// `docs` is additionally excluded so a generated page (which carries no `role:` anyway) can never be
// re-ingested as a source — defensive, changes the capability set by nothing.
//
// `.claude` is excluded WHOLESALE (lessons-learned L36). Naming only `.claude/commands/` pinned ONE
// member of the `.claude/` subtree, so a nested checkout under `.claude/worktrees/<name>/` was walked as
// this repo's product surface. Here that failed LOUDLY rather than silently — two capabilities with the
// same directory name produce a duplicate page slug, which `enumerateCapabilities` throws on (fail-closed,
// by design) — so `npm run docs:check` went RED with `duplicate page slug "seam-resolver"` for a reason
// no reader could connect to a worktree. Closure, not a second member: an arbitrarily named `.claude/<x>/`
// reproduces it identically, so a `.claude/worktrees/` entry would only certify the current spelling.
const EXCLUDE_SEGMENTS = [
  `${sep}.claude${sep}`,
  `${sep}.dev${sep}`,
  `${sep}pharn${sep}floor${sep}`,
  `${sep}node_modules${sep}`,
  `${sep}.git${sep}`,
  `${sep}docs${sep}`,
];

// --- tiny dependency-free frontmatter parser (mirrors validate.mjs `parseFrontmatter`) ---
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return { fm: null, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { fm: null, body: text };
  const raw = text.slice(3, end).trim();
  const body = text.slice(end + 4);
  const fm = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, "");
    }
    fm[key] = val;
  }
  return { fm, body };
}

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

function isExcluded(targetDir, file) {
  const norm = sep + relative(targetDir, file);
  return EXCLUDE_SEGMENTS.some((s) => norm.includes(s));
}

function toArray(v) {
  return Array.isArray(v) ? v : v ? [v] : [];
}

// The source H1 tagline: text after "# <name> — " (em dash), or the whole H1 if there is no dash, or ""
// if the body has no H1. Rendered as DATA (P2), never interpreted.
function extractTagline(body) {
  const m = body.match(/^#\s+(.+)$/m);
  if (!m) return "";
  let t = m[1].trim();
  const dash = t.indexOf("—"); // em dash used by capability H1s: "# name — tagline"
  if (dash !== -1) t = t.slice(dash + 1).trim();
  return t;
}

// POSIX repo-relative path for a capability file (stable across OSes → stable link + slug).
function toPosixRel(targetDir, file) {
  return relative(targetDir, file).split(sep).join("/");
}

/**
 * Enumerate role-bearing capabilities under targetDir, sorted by (role order, slug ascending).
 * Returns [{ srcRel, slug, role, fm, tagline }]. Throws on a duplicate slug (fail-closed, P5).
 */
export function enumerateCapabilities(targetDir) {
  const caps = [];
  const seen = new Map();
  for (const file of walk(targetDir)) {
    if (isExcluded(targetDir, file)) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const { fm, body } = parseFrontmatter(text);
    if (!fm || !fm.role) continue; // capability = role-bearing markdown (ARCHITECTURE §3.1)
    const srcRel = toPosixRel(targetDir, file);
    const slug = basename(dirname(file));
    if (seen.has(slug)) {
      throw new Error(
        `capability-catalog: duplicate page slug "${slug}" from ${seen.get(slug)} and ${srcRel} — ` +
          `slugs (source directory names) must be unique`
      );
    }
    seen.set(slug, srcRel);
    caps.push({ srcRel, slug, role: fm.role, fm, tagline: extractTagline(body) });
  }
  caps.sort((a, b) => {
    const ra = ROLE_ORDER.indexOf(a.role);
    const rb = ROLE_ORDER.indexOf(b.role);
    if (ra !== rb) return (ra === -1 ? ROLE_ORDER.length : ra) - (rb === -1 ? ROLE_ORDER.length : rb);
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
  return caps;
}

const GEN = ".dev/floor/gen-capability-catalog.mjs";
const REGEN = "npm run docs:generate";

/** Render one capability's page (deterministic, no timestamp). */
export function renderPage(cap) {
  const fm = cap.fm;
  const dash = "—"; // em dash placeholder for absent fields
  const name = fm.name || cap.slug;
  const applies = toArray(fm.applies).join(", ") || dash;
  const enforces = toArray(fm.enforces).join(", ") || dash;
  const coupling = fm.coupling || dash;
  const modelTier = fm.model_tier || dash;
  const version = fm.version || dash;
  const kind = fm.kind || dash;
  const verb = ROLE_VERB[cap.role] || "does";
  const link = posix.relative(OUT_DIR, cap.srcRel);
  const tagline = cap.tagline || "_(no summary line in source)_";
  return (
    `<!-- GENERATED by ${GEN} from ${cap.srcRel} ${dash} DO NOT EDIT. Regenerate: ${REGEN} -->\n` +
    `\n` +
    `# ${name}\n` +
    `\n` +
    `| Field | Value |\n` +
    `| --- | --- |\n` +
    `| Role | ${cap.role} |\n` +
    `| Kind | ${kind} |\n` +
    `| Version | ${version} |\n` +
    `| Applies | ${applies} |\n` +
    `| Coupling | ${coupling} |\n` +
    `| Enforces | ${enforces} |\n` +
    `| Model tier | ${modelTier} |\n` +
    `\n` +
    `## What it ${verb}\n` +
    `\n` +
    `${tagline}\n` +
    `\n` +
    `## Source\n` +
    `\n` +
    `[\`${cap.srcRel}\`](${link})\n` +
    `\n` +
    // The install footer. It read "No install command yet — this repo has no PHARN CLI or install-token"
    // from #101 (2026-07-23) until 3.1.2, and EXPIRED when `@pharn-dev/pharn` was published: the
    // 2026-08-23 rewrite (f7c3caa, #166) corrected that claim class across README / SECURITY /
    // CONTRIBUTING / CLAUDE and missed the generated surface, because nothing reads a rendered sentence
    // (lessons-learned L33 — a "not yet" claim expires in a file nobody is editing, and the repair pass
    // misses the variant spellings). Each clause below is sourced: the command is README.md's install
    // section; "selects the capabilities that apply to your project" is README.md `## What gets installed`;
    // "no per-capability install command" is true because no such mechanism exists. It deliberately does
    // NOT say this capability WILL be installed — selection is archetype-gated by `applies:`.
    // STILL ADVISORY (P0): no floor op reads this sentence for truth. Fixing it does not close that gap;
    // `check-capability-catalog.mjs` guarantees only committed == recomputed, exactly as before.
    `_PHARN installs with \`npx @pharn-dev/pharn@latest init\`, which selects the capabilities that apply ` +
    `to your project; there is no per-capability install command. This page documents the source file ` +
    `linked above._\n`
  );
}

/** Render the README index: groups by role (fixed order), counts, one capability per line. */
export function renderIndex(caps) {
  let out =
    `<!-- GENERATED by ${GEN} ${"—"} DO NOT EDIT. Regenerate: ${REGEN} -->\n` +
    `\n` +
    `# Capability catalog\n` +
    `\n` +
    `${caps.length} capabilities, generated from their source \`.md\` files. Do not edit these pages by ` +
    `hand ${"—"} run \`${REGEN}\`.\n`;
  for (const role of ROLE_ORDER) {
    const group = caps.filter((c) => c.role === role);
    if (group.length === 0) continue;
    out += `\n## ${ROLE_HEADING[role]} (${group.length})\n\n`;
    for (const c of group) {
      const name = c.fm.name || c.slug;
      const tagline = c.tagline || "(no summary line in source)";
      out += `- [${name}](${c.slug}.md) ${"—"} ${tagline}\n`;
    }
  }
  return out;
}

/**
 * Build the full catalog for targetDir. Returns { capabilities, files } where `files` is a Map of
 * repo-relative path -> file content (the README index + one page per capability). Both the generator
 * and the checker call this — the ONLY renderer of catalog bytes.
 */
export function buildCatalog(targetDir) {
  const capabilities = enumerateCapabilities(targetDir);
  const files = new Map();
  files.set(`${OUT_DIR}/README.md`, renderIndex(capabilities));
  for (const cap of capabilities) {
    files.set(`${OUT_DIR}/${cap.slug}.md`, renderPage(cap));
  }
  return { capabilities, files };
}

/** List committed catalog page paths (repo-relative POSIX) actually on disk under OUT_DIR. */
export function listCommittedPages(targetDir) {
  const dir = join(targetDir, OUT_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => `${OUT_DIR}/${f}`)
    .sort();
}

// ---------------------------------------------------------------------------------------------------
// SECOND ARTIFACT — the root README's `## Current state` block.
//
// Same discipline as the catalog: ONE renderer, shared by the generator and the drift checker, so
// "recompute" is byte-identical to "generate" by construction. Everything below is a pure function of
// the live filesystem — no timestamps, every listing sorted, so two runs render identical bytes.
//
// WHAT THIS DOES AND DOES NOT BUY (P0). The guarantee is byte-equality: the committed block equals the
// recomputed block. It is NOT a guarantee that the block is TRUE in any deeper sense — a wrong
// enumerator here would be regenerated, committed wrongly, and the gate would stay GREEN. And the
// capability count MIRRORS pharn/floor/validate.mjs's `role:` test in a second implementation (that
// script exports nothing); nothing on the floor forces the two to agree, so that agreement is ADVISORY.
// Prose OUTSIDE the markers is unguarded entirely.
// ---------------------------------------------------------------------------------------------------

export const README_PATH = "README.md";
const CONTRACTS_DIR = "pharn/pharn-contracts";
const COMMANDS_DIR = ".claude/commands";
const HOOKS_DIR = ".claude/hooks";
const FLOOR_DIR = "pharn/floor";
const CATALOG_INDEX_LINK = `./${OUT_DIR}/README.md`;

// Singular / plural noun per role, so a count of 1 does not render as "1 lenses".
export const ROLE_NOUN = {
  griller: ["griller", "grillers"],
  lens: ["lens", "lenses"],
  skill: ["skill", "skills"],
  validator: ["validator", "validators"],
  verifier: ["verifier", "verifiers"],
  auditor: ["auditor", "auditors"],
};

// A rendered name — a basename OR any directory segment of a rendered path — must be inert markdown. A
// name carrying a `|`, a backtick, a bracket or a newline would distort the README (the residual recorded
// in .dev/features/docs-capability-catalog/REVIEW.md, L-trust). Fail closed (P5): throw rather than emit
// it. Not sanitization — refusal.
const SAFE_BASENAME = /^[A-Za-z0-9._-]+$/;

/**
 * The POSIX parent directory of a capability's `srcRel` (trailing "/" kept, "" at the repo root),
 * validated segment-by-segment against SAFE_BASENAME.
 *
 * Capability paths arrive from the filesystem WALK in enumerateCapabilities(), NOT from listDir(), so
 * they never passed that guard: a directory named with a backtick closes the code span this string is
 * rendered into and spills the rest into live README markdown. Same policy, same refusal — reject the
 * capability outright rather than sanitize it or render it (P5, fail-closed).
 */
function safeParentDir(srcRel) {
  const segments = srcRel.split("/").slice(0, -1);
  for (const seg of segments) {
    if (!SAFE_BASENAME.test(seg)) {
      throw new Error(
        `current-state: unsafe path segment ${JSON.stringify(seg)} in capability path ${JSON.stringify(srcRel)} — refusing to render it into README.md`
      );
    }
  }
  return segments.length === 0 ? "" : `${segments.join("/")}/`;
}

/**
 * Sorted basenames of the regular FILES in <targetDir>/<relDir> matching `predicate`.
 * Throws if the directory is missing/unreadable — rendering a plausible-looking "0" would be a lie, and
 * a lie that regenerates cleanly is worse than a hard error (P5, fail-closed).
 * Throws if a matching basename is not inert markdown (SAFE_BASENAME).
 */
function listDir(targetDir, relDir, predicate) {
  let entries;
  try {
    entries = readdirSync(join(targetDir, relDir), { withFileTypes: true });
  } catch {
    throw new Error(`current-state: expected directory is missing or unreadable: ${relDir} — refusing to render a count of 0 as fact`);
  }
  const out = [];
  for (const entry of entries) {
    // TYPE first, name second. Every predicate below tests only the NAME, so a DIRECTORY called
    // `scratch.mjs` (or a symlink to anywhere) would otherwise be counted as a checker and the README
    // would state a number no file on disk backs — the same "plausible-looking lie" the missing-directory
    // throw above exists to refuse. Regular files only, deliberately: nothing else is a contract, a
    // command, a hook, or a checker.
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!predicate(name)) continue;
    if (!SAFE_BASENAME.test(name)) {
      throw new Error(`current-state: unsafe basename in ${relDir}: ${JSON.stringify(name)} — refusing to render it into README.md`);
    }
    out.push(name);
  }
  return out.sort();
}

const stripExt = (n) => n.replace(/\.[^.]+$/, "");

/** Contract names (extension stripped) under pharn/pharn-contracts/. */
export function enumerateContracts(targetDir) {
  return listDir(targetDir, CONTRACTS_DIR, (n) => n.endsWith(".md")).map(stripExt);
}

/** `pharn-*` command names, split by the `pharn-dev-` prefix into { product, dev } (P5: prefix membership). */
export function enumerateCommands(targetDir) {
  const all = listDir(targetDir, COMMANDS_DIR, (n) => n.startsWith("pharn-") && n.endsWith(".md")).map(stripExt);
  return {
    product: all.filter((n) => !n.startsWith("pharn-dev-")),
    dev: all.filter((n) => n.startsWith("pharn-dev-")),
  };
}

/** Hook filenames under .claude/hooks/, tests excluded. */
export function enumerateHooks(targetDir) {
  return listDir(targetDir, HOOKS_DIR, (n) => n.endsWith(".cjs") && !n.endsWith(".test.cjs"));
}

/** Count of floor checkers under pharn/floor/ — `*.mjs` FILES, tests excluded (test-fixtures/ is a dir). */
export function countFloorCheckers(targetDir) {
  return listDir(targetDir, FLOOR_DIR, (n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs")).length;
}

// The marker pair. The BEGIN line is GENERATED (it names the generator), so both marker lines sit INSIDE
// the guarded region — hand-editing a marker is itself drift, not an unguarded escape hatch.
const BEGIN_LINE = `<!-- CURRENT-STATE:BEGIN ${"—"} GENERATED by ${GEN}. DO NOT EDIT BETWEEN MARKERS. Regenerate: ${REGEN} -->`;
const END_LINE = `<!-- CURRENT-STATE:END -->`;
const BEGIN_RE = /^<!-- CURRENT-STATE:BEGIN\b[^\n]*-->[ \t]*$/gm;
const END_RE = /^<!-- CURRENT-STATE:END -->[ \t]*$/gm;

function countOf(re, text) {
  return [...text.matchAll(re)];
}

/**
 * Locate the guarded region (both marker lines INCLUDED). Returns { start, end, region }.
 * Throws — with a message naming the exact defect — on a missing, duplicated, or inverted marker pair.
 * Deterministic (P5): occurrence COUNT plus an index comparison; never a nearest-match heuristic, and
 * never an invented marker.
 */
export function extractCurrentState(readmeText) {
  const begins = countOf(BEGIN_RE, readmeText);
  const ends = countOf(END_RE, readmeText);
  if (begins.length === 0) throw new Error(`current-state: no <!-- CURRENT-STATE:BEGIN ... --> marker found`);
  if (ends.length === 0) throw new Error(`current-state: no <!-- CURRENT-STATE:END --> marker found`);
  if (begins.length > 1) throw new Error(`current-state: ${begins.length} BEGIN markers found — exactly one pair is required`);
  if (ends.length > 1) throw new Error(`current-state: ${ends.length} END markers found — exactly one pair is required`);
  const start = begins[0].index;
  const end = ends[0].index + ends[0][0].length;
  if (end <= start) throw new Error(`current-state: END marker precedes BEGIN marker — the pair is inverted`);
  return { start, end, region: readmeText.slice(start, end) };
}

/** Render the whole guarded region — both marker lines included — from live repo state. */
export function renderReadmeCurrentState(targetDir) {
  const caps = enumerateCapabilities(targetDir);
  const counts = new Map(ROLE_ORDER.map((r) => [r, 0]));
  for (const c of caps) if (counts.has(c.role)) counts.set(c.role, counts.get(c.role) + 1);

  // Every role in ROLE_ORDER renders, including the zero ones: "the enum exists, instances do not" is
  // the honest read, and omitting a zero would quietly hide it (P0). This deliberately differs from
  // renderIndex(), which skips empty groups because a catalog lists MEMBERS, not the enum.
  const roleParts = ROLE_ORDER.map((role) => {
    const n = counts.get(role);
    const noun = ROLE_NOUN[role][n === 1 ? 0 : 1];
    if (role !== "skill" || n === 0) return `**${n}** ${noun}`;
    const dirs = caps
      .filter((c) => c.role === "skill")
      .map((c) => `\`${safeParentDir(c.srcRel)}\``)
      .join(", ");
    return `**${n}** ${noun} (${dirs})`;
  });

  const contracts = enumerateContracts(targetDir);
  const { product, dev } = enumerateCommands(targetDir);
  const hooks = enumerateHooks(targetDir);
  const checkers = countFloorCheckers(targetDir);
  const code = (xs) => xs.map((x) => `\`${x}\``).join(", ");
  const cmds = (xs) => xs.map((x) => `\`/${x}\``).join(", ");

  const bullets = [
    `- **Capabilities ${"—"} ${caps.length} built**, counted by the \`role:\` frontmatter test (mirrors \`${FLOOR_DIR}/validate.mjs\`): ` +
      `${roleParts.join(", ")}. Full list: [\`${OUT_DIR}/README.md\`](${CATALOG_INDEX_LINK}).`,
    `- **Contracts ${"—"} ${contracts.length}** (\`${CONTRACTS_DIR}/\`): ${code(contracts)}.`,
    `- **Product commands ${"—"} ${product.length}** (\`${COMMANDS_DIR}/\`): ${cmds(product)}.`,
    `- **Dev-apparatus commands ${"—"} ${dev.length}** (\`${COMMANDS_DIR}/\`): ${cmds(dev)}.`,
    // "Hook scripts", NOT "write-guards": only two of these are registered as PreToolUse guards in
    // .claude/settings.json; set-writes-scope.cjs is the setter commands call. A directory listing
    // cannot tell the difference, so the label must not claim what the enumeration does not know (P0).
    `- **Hook scripts ${"—"} ${hooks.length}** (\`${HOOKS_DIR}/\`): ${code(hooks)}.`,
    `- **Floor checkers ${"—"} ${checkers}** \`.mjs\` files under \`${FLOOR_DIR}/\` (tests excluded).`,
  ];

  return `${BEGIN_LINE}\n\n${bullets.join("\n")}\n\n${END_LINE}`;
}

/**
 * Replace the guarded region in `readmeText` with `region`, leaving exactly one blank line on each side.
 * Splices strictly BETWEEN an existing marker pair — it never invents markers and never guesses
 * boundaries; a missing/duplicated/inverted pair propagates extractCurrentState's throw.
 */
export function spliceCurrentState(readmeText, region) {
  const { start, end } = extractCurrentState(readmeText);
  const before = readmeText.slice(0, start).replace(/\s*$/, "");
  const after = readmeText.slice(end).replace(/^\s*/, "");
  return (before ? `${before}\n\n` : "") + region + (after ? `\n\n${after}` : "\n");
}
