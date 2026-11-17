// .dev/floor/install-manifest-core.mjs — THE ONE DECLARATION of what a PHARN install receives, and the builder of
// `pharn-install.json` from it (7.21.0, install-manifest, Linear CORE-193). Build apparatus: it ships to nobody.
//
// WHY (P7 — a real failure). pharn-cli derived the install from this repo's internals: a port of the frontmatter rules,
// a port of check-model-config.mjs and a hand-held copy of the tree layout, each pinned by a differential test, so every
// upstream change needed a lockstep CLI release (0.18.1: 833 lines for one new stage name, 1 of them in `src/`), and a
// closed CLI surface list could not see a surface this repo added (`.claude/agents/pharn-review-lens.md`, shipped
// 6.64.0, installed only after the CLI's C2.7). Now this repo DECLARES the install and the CLI reads the declaration
// (CORE-194). RFC: `.dev/features/install-manifest/RFC.md`. Schema: `docs/install-manifest.md`.
//
// ONE PLACE (L29). `INSTALL_SURFACES`, `CAPABILITY_SUBTREES`, `GLOBAL_EXCLUDE` and `LEGACY_INSTALL_ROOTS` below are the
// only statement of the install rules in this repo; the builder, the `installRoots` it emits and the tests all iterate
// them. Nothing is re-derived: the capability set is the catalog's `enumerateCapabilities` (the `role:` test
// validate.mjs uses), the file list is `gitListing` (capability-files-core.mjs), the glob grammar and version regex are
// check-surface-bump.mjs's, and the model rules are check-model-config.mjs's own exported bindings.
//
// THE RULES. A candidate path (git's tracked + untracked-not-ignored list; without git, a walk of the declared roots
// only) is installable when it matches no `GLOBAL_EXCLUDE` glob and EITHER lies inside a selectable capability's
// directory (surface `capability`, owned by that capability) OR matches the first `INSTALL_SURFACES` member whose
// `include` matches and whose `exclude` does not. Each installable file gets its `dest` (its own path, except the
// `license` surface's mapping), its `policy` (`if-absent` for `settings`, `managed` otherwise) and the SHA-256 of its
// RAW bytes (no line-ending fold: `.gitattributes` keeps the tree LF, which is also what `git archive` and codeload
// carry).
//
// REFUSALS (fail-closed, P5; each a thrown InstallManifestError, which the checker reports as ENUM_ERROR):
//   * SKILLS_VERSION missing or not `X.Y.Z`; `pharn.config.json` without a `models.stages` object;
//   * an installable path that is not a regular file now (a symlink, a gitlink, a directory — classified with lstat,
//     never followed, L59); a path that is absolute, holds a `.`, `..` or empty segment, or a backslash;
//   * two files with one `dest`;
//   * a surface, or a selectable role, contributing zero entries — a wrong target must not yield an empty GREEN (L34);
//   * a griller or lens outside its subtree, under the other role's subtree, or not one directory below it;
//   * an `applies` that is empty, holds a non-string, or holds `universal` beside another token.
//   A path that git lists but that is gone from the work tree is skipped: the manifest describes the tree as it is.
//
// WHAT IT DOES NOT CLAIM (P0, L43). The checker proves the committed manifest equals what this module computes from the
// tree — consistency, never correctness: a wrong rule here regenerates cleanly and stays GREEN. The binding tests
// (install-manifest-core.test.mjs) tie the rules to two referents: every bump-triggering PRODUCT_SURFACE path is
// declared, and the installable paths outside it are a named set. Archetype membership of `applies` tokens is
// validate.mjs's CHECK 4b, not re-checked here. The CLI must still validate everything it reads (the manifest is
// untrusted data to it).
//
// Non-LLM, stdlib-only (one git spawn, through capability-files-core.mjs).

import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gitListing } from "../../pharn/floor/capability-files-core.mjs";
import { EFFORT_ENUM, MODEL_ALIASES, MODEL_ID_RE, PRODUCT_STAGES } from "../../pharn/floor/check-model-config.mjs";
import { enumerateCapabilities } from "./capability-catalog-core.mjs";
import { matchesGlob, VERSION_RE } from "./check-surface-bump.mjs";

/** The generated file, at the repo root. */
export const MANIFEST_PATH = "pharn-install.json";
export const SCHEMA_VERSION = 1;
export const GENERATOR = ".dev/floor/gen-install-manifest.mjs";
export const REGENERATE = "npm run docs:generate";
export const SCHEMA_DOC = "docs/install-manifest.md";

/** The layout this tree has, and how a reader recognizes it (pharn-cli's `detectLayout` marker). */
export const LAYOUT = Object.freeze({ name: "pharn", marker: "pharn/pharn-contracts" });

/** The selectable capabilities: a role, and the subtree whose direct children are that role's capability dirs. */
export const CAPABILITY_SUBTREES = Object.freeze([
  Object.freeze({ role: "griller", subtree: "pharn/pharn-pipeline/grillers" }),
  Object.freeze({ role: "lens", subtree: "pharn/pharn-review" }),
]);

/** Never installed, wherever it sits: the checkers' and hooks' tests. */
export const GLOBAL_EXCLUDE = Object.freeze(["**/*.test.*"]);

/** The copy policies. `managed`: written, recorded, replaced only when record-equal. `if-absent`: written only when the
 *  project has no such file, never replaced. */
export const POLICIES = Object.freeze(["managed", "if-absent"]);

/**
 * The fixed surfaces, in the order a path is matched against them. `dest` maps the one file whose destination differs
 * from its source (upstream's LICENSE must not overwrite the project's own).
 */
export const INSTALL_SURFACES = Object.freeze([
  { surface: "commands", include: [".claude/commands/pharn-*.md"], exclude: [".claude/commands/pharn-dev-*.md"] },
  { surface: "agents", include: [".claude/agents/pharn-*.md"], exclude: [".claude/agents/pharn-dev-*.md"] },
  { surface: "hooks", include: [".claude/hooks/*.cjs"], exclude: [] },
  { surface: "settings", include: [".claude/settings.json"], exclude: [], policy: "if-absent" },
  {
    surface: "trusted-doc",
    include: ["pharn/CONSTITUTION.md", "pharn/ARCHITECTURE.md", "pharn/THREAT-MODEL.md", "pharn/LIMITS.md"],
    exclude: [],
  },
  { surface: "license", include: ["LICENSE"], exclude: [], dest: "pharn/LICENSE" },
  { surface: "features-readme", include: ["pharn/features/README.md"], exclude: [] },
  { surface: "contracts", include: ["pharn/pharn-contracts/**"], exclude: [] },
  { surface: "core", include: ["pharn/pharn-core/**"], exclude: [] },
  { surface: "floor", include: ["pharn/floor/**"], exclude: ["pharn/floor/test-fixtures/**"] },
]);

/**
 * Project paths OLDER trees installed and this one never writes — hand-declared history, so a reader can still bound
 * the record keys of an older install. The flat layout (this repo before `b42684b5`, #86, 2026-07-10) put every
 * surface at the root (the floor at `.dev/floor/`, LICENSE at `PHARN-LICENSE`); the same list covers a pharn-layout
 * install from before 7.0.0 (root THREAT-MODEL.md / LIMITS.md) and before 5.0.0 (root features/README.md). The
 * `.claude/` surfaces are not listed: they sit at the same paths in every layout, so the current roots cover them.
 */
export const LEGACY_INSTALL_ROOTS = Object.freeze([
  "CONSTITUTION.md",
  "ARCHITECTURE.md",
  "THREAT-MODEL.md",
  "LIMITS.md",
  "PHARN-LICENSE",
  "features/README.md",
  "pharn-contracts/**",
  "pharn-core/**",
  ".dev/floor/**",
  "pharn-pipeline/grillers/*/**",
  "pharn-review/*/**",
]);

/** The stage key a `models.stages` lookup falls back to — check-model-config.mjs's `"default"` literal, bound by a test
 *  that runs the checker on a block without it. */
export const FALLBACK_STAGE = "default";

/** A refusal: the manifest cannot be built from this tree as it is. */
export class InstallManifestError extends Error {}

function refuse(message) {
  throw new InstallManifestError(message);
}

const matchesAny = (globs, path) => globs.some((g) => matchesGlob(g, path));

/** lstat that answers null for a path that is gone or unreadable — never follows a link (L59). */
function lstatOrNull(abs) {
  try {
    return lstatSync(abs);
  } catch {
    return null;
  }
}

/** The first path segment of every glob the declaration names: the roots a no-git walk visits. */
export function declaredRoots() {
  const globs = [...CAPABILITY_SUBTREES.map((s) => s.subtree), ...INSTALL_SURFACES.flatMap((s) => s.include)];
  return [...new Set(globs.map((g) => g.split("/")[0]))].sort();
}

/** Every path under `target` a manifest may draw from, relative and `/`-separated, sorted by code unit. Git's list when
 *  git answers for the target; otherwise a walk of the declared roots that never follows a link (a link is listed as a
 *  path, as git lists it, so a matching one meets the regular-file refusal). */
export function listCandidates(target) {
  const listed = gitListing(target);
  if (listed !== null && listed.length > 0) return [...listed].sort();
  const out = [];
  const visit = (rel) => {
    const st = lstatOrNull(join(target, rel));
    if (st === null) return;
    if (!st.isDirectory()) {
      out.push(rel);
      return;
    }
    let names = [];
    try {
      names = readdirSync(join(target, rel));
    } catch {
      // an unreadable directory contributes nothing; git, when present, answers instead
    }
    for (const name of names) visit(`${rel}/${name}`);
  };
  for (const root of declaredRoots()) visit(root);
  return out.sort();
}

/** The CLI's `CapabilityEntry.applies` shape: the string "universal", or the archetype tokens as an array. */
export function normalizeApplies(value, where) {
  const tokens = Array.isArray(value) ? value : value === undefined || value === "" ? [] : [value];
  if (tokens.length === 0) refuse(`${where}: \`applies\` is empty`);
  for (const t of tokens) if (typeof t !== "string" || t === "") refuse(`${where}: \`applies\` holds a non-string or empty token`);
  if (tokens.includes("universal")) {
    if (tokens.length !== 1) refuse(`${where}: \`applies\` holds "universal" beside another token`);
    return "universal";
  }
  return [...tokens];
}

/** The selectable capabilities, sorted by subtree order then name. */
export function selectableCapabilities(target) {
  const caps = [];
  for (const cap of enumerateCapabilities(target)) {
    const dir = cap.srcRel.slice(0, cap.srcRel.lastIndexOf("/"));
    const home = CAPABILITY_SUBTREES.find((s) => dir.startsWith(`${s.subtree}/`));
    const selectableRole = CAPABILITY_SUBTREES.some((s) => s.role === cap.role);
    if (!home) {
      if (selectableRole) refuse(`${cap.srcRel}: a ${cap.role} outside ${CAPABILITY_SUBTREES.find((s) => s.role === cap.role).subtree}/`);
      continue;
    }
    if (cap.role !== home.role)
      refuse(`${cap.srcRel}: declares role "${cap.role}" but lives under ${home.subtree}/ (a ${home.role} subtree)`);
    const name = dir.slice(home.subtree.length + 1);
    if (name.includes("/")) refuse(`${cap.srcRel}: a capability directory must be one level below ${home.subtree}/`);
    caps.push({ name, role: cap.role, applies: normalizeApplies(cap.fm.applies, cap.srcRel), dir });
  }
  const order = (c) => CAPABILITY_SUBTREES.findIndex((s) => s.role === c.role);
  caps.sort((a, b) => order(a) - order(b) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const { role, subtree } of CAPABILITY_SUBTREES) {
    if (!caps.some((c) => c.role === role)) refuse(`no ${role} capability under ${subtree}/ — the target is not a PHARN tree`);
  }
  return caps;
}

/** Refuse a path a reader could resolve outside the project. */
function assertPlainRelative(path) {
  if (path.startsWith("/") || path.includes("\\")) refuse(`${JSON.stringify(path)}: not a plain relative path`);
  if (path.split("/").some((seg) => seg === "" || seg === "." || seg === ".."))
    refuse(`${JSON.stringify(path)}: holds an empty, "." or ".." segment`);
}

/** Classify one candidate against `surfaces` (default: the declaration). Returns null (not installable) or
 *  {surface, capability?, dest, policy}. */
export function classify(path, caps, surfaces = INSTALL_SURFACES) {
  if (matchesAny(GLOBAL_EXCLUDE, path)) return null;
  const cap = caps.find((c) => path.startsWith(`${c.dir}/`));
  if (cap) return { surface: "capability", capability: cap.name, dest: path, policy: "managed" };
  for (const s of surfaces) {
    if (matchesAny(s.include, path) && !matchesAny(s.exclude, path)) {
      return { surface: s.surface, dest: s.dest ?? path, policy: s.policy ?? "managed" };
    }
  }
  return null;
}

function readSkillsVersion(target) {
  let text;
  try {
    text = readFileSync(join(target, "SKILLS_VERSION"), "utf8");
  } catch {
    refuse("SKILLS_VERSION is missing or unreadable");
  }
  const v = text.trim();
  if (!VERSION_RE.test(v)) refuse(`SKILLS_VERSION is not X.Y.Z: ${JSON.stringify(v.slice(0, 40))}`);
  return v;
}

function readModelsDefaults(target) {
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(join(target, "pharn.config.json"), "utf8"));
  } catch {
    refuse("pharn.config.json is missing, unreadable or not JSON");
  }
  const models = cfg?.models;
  const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!plain(models) || !plain(models.stages)) refuse("pharn.config.json has no `models.stages` object to declare as the defaults");
  return models;
}

/** The model rules, from check-model-config.mjs's exported bindings (never a second list). */
export function modelRules() {
  return {
    fallbackStage: FALLBACK_STAGE,
    stages: Object.keys(PRODUCT_STAGES),
    aliases: [...MODEL_ALIASES],
    modelIdPattern: MODEL_ID_RE.source,
    effortLevels: [...EFFORT_ENUM],
  };
}

/** The project paths an install of this tree may write (`include`, minus `exclude`), and the older trees' (`legacy`). */
export function installRoots() {
  const include = [
    ...CAPABILITY_SUBTREES.map((s) => `${s.subtree}/*/**`),
    ...INSTALL_SURFACES.flatMap((s) => (s.dest ? [s.dest] : s.include)),
  ];
  const exclude = [...GLOBAL_EXCLUDE, ...INSTALL_SURFACES.flatMap((s) => s.exclude)];
  return { include, exclude, legacy: [...LEGACY_INSTALL_ROOTS] };
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Build the manifest object for `target`. Throws InstallManifestError on any refusal. `surfaces` exists for the tests,
 *  which need a declaration that maps two files to one destination; every caller in the repo uses the default. */
export function buildInstallManifest(target, { surfaces = INSTALL_SURFACES } = {}) {
  const skillsVersion = readSkillsVersion(target);
  const capabilities = selectableCapabilities(target);
  const files = [];
  const dests = new Map();
  for (const path of listCandidates(target)) {
    const c = classify(path, capabilities, surfaces);
    if (c === null) continue;
    const st = lstatOrNull(join(target, path));
    if (st === null) continue; // listed by git, gone from the work tree
    if (!st.isFile())
      refuse(`${JSON.stringify(path)}: an installable path that is not a regular file (a symlink, a directory or a gitlink)`);
    assertPlainRelative(path);
    assertPlainRelative(c.dest);
    if (dests.has(c.dest))
      refuse(`${JSON.stringify(path)} and ${JSON.stringify(dests.get(c.dest))} share the destination ${JSON.stringify(c.dest)}`);
    dests.set(c.dest, path);
    const entry = { path, dest: c.dest, surface: c.surface };
    if (c.capability !== undefined) entry.capability = c.capability;
    entry.policy = c.policy;
    entry.sha256 = sha256(readFileSync(join(target, path)));
    files.push(entry);
  }
  for (const { surface } of surfaces) {
    if (!files.some((f) => f.surface === surface)) refuse(`the ${surface} surface contributes no file — the target is not a PHARN tree`);
  }
  return {
    $comment: `GENERATED by ${GENERATOR} - DO NOT EDIT. Regenerate: ${REGENERATE}. Schema: ${SCHEMA_DOC}`,
    schemaVersion: SCHEMA_VERSION,
    skillsVersion,
    layout: {
      name: LAYOUT.name,
      marker: LAYOUT.marker,
      capabilitySubtrees: Object.fromEntries(CAPABILITY_SUBTREES.map((s) => [s.role, s.subtree])),
    },
    capabilities,
    files,
    models: { defaults: readModelsDefaults(target), rules: modelRules() },
    installRoots: installRoots(),
  };
}

/** Indent every line after the first by `pad` (for a pretty-printed value placed at depth 1). */
const indentTail = (text, pad) => text.split("\n").join(`\n${pad}`);

/** The manifest's bytes: deterministic, one `capabilities` / `files` entry per line, a trailing newline. */
export function renderInstallManifest(manifest) {
  const keys = Object.keys(manifest);
  const parts = keys.map((key) => {
    const value = manifest[key];
    let body;
    if ((key === "capabilities" || key === "files") && Array.isArray(value)) {
      body = value.length === 0 ? "[]" : `[\n${value.map((v) => `    ${JSON.stringify(v)}`).join(",\n")}\n  ]`;
    } else {
      body = indentTail(JSON.stringify(value, null, 2), "  ");
    }
    return `  ${JSON.stringify(key)}: ${body}`;
  });
  return `{\n${parts.join(",\n")}\n}\n`;
}

/** Build and render in one call: the bytes the generator writes and the checker compares. */
export function computeInstallManifest(target) {
  return renderInstallManifest(buildInstallManifest(target));
}
