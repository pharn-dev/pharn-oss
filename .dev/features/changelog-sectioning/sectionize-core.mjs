// .dev/features/changelog-sectioning/sectionize-core.mjs — the PURE core of the one-shot migration that
// cuts CHANGELOG.md's single `## [Unreleased]` block into one `## [X.Y.Z] - YYYY-MM-DD` section per
// SKILLS_VERSION value that existed on main. No `fs`, no `child_process`: every git fact arrives as data
// from `sectionize.mjs`, so every rule below is testable from fixtures (P3 — the core changes when the
// METHOD changes, the CLI when the git plumbing changes).
//
// THE METHOD, in one paragraph (the full statement is .dev/features/changelog-sectioning/PLAN.md):
// versions come from SKILLS_VERSION's first-parent history (first appearance wins; a later LOWER value
// marks a version REVERTED). Each bullet's introducing commit is the LAST 0 -> >0 transition of its head
// probe's occurrence count across `git log --first-parent -S<probe>` — never the earliest match, which
// would file a reverted-then-re-landed entry under the version it was reverted from. The bullet goes to the
// earliest non-reverted version whose first-appearance commit is at or after that commit. A tail probe
// cross-checks the head (DRIFTED when they disagree on the version), and a `SKILLS_VERSION` marker in the
// text — any member of MARKER_FORMS — cross-checks the pickaxe (CONFLICT when they disagree). Only AGREE
// and PICKAXE auto-assign; every other status needs a reviewed override. Nothing is ever guessed (P5): an
// unclassifiable input is a named MigrationHalt.
//
// WHAT THIS DOES NOT GUARANTEE (P0):
//   - That a bullet is filed under the RIGHT version. The assignment is deterministic, but the two probes
//     see only a bullet's first and last lines; an edit to its middle is invisible, and so is a history in
//     which both ends were rewritten by one later commit. Markers corroborate; they do not prove.
//   - Anything after the migration. `--verify` binds the output to ONE pinned input SHA; once main moves,
//     nothing re-checks the section set against git history (L35 — no standing sync check is built).
//   - That the version headings are releases in any sense beyond "this SKILLS_VERSION value was on main's
//     first-parent history from this committer date". No tag or GitHub release is implied.
//
// Non-LLM, stdlib-free (pure JS), deterministic.

/** A named refusal. `code` is a member of HALT_CODES; `detail` is free text built from repo data. */
export class MigrationHalt extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = "MigrationHalt";
    this.code = code;
    this.detail = detail;
  }
}

/** The CLOSED set of refusal codes (L29: the tests iterate it). Every `halt()` call names a member. */
export const HALT_CODES = [
  "BAD_ROW",
  "BAD_SEMVER",
  "EMPTY_HISTORY",
  "ORDER",
  "RELANDED_REVERTED",
  "CR_IN_INPUT",
  "NO_FINAL_NEWLINE",
  "BAD_HEADING",
  "NO_UNRELEASED",
  "DUPLICATE_SECTION",
  "UNCLOSED_COMMENT",
  "INTRO_CONTENT_LOST",
  "ORPHAN",
  "BULLET_OUTSIDE_GROUP",
  "UNTOUCHED_NOT_LAST",
  "DROPPED_MISMATCH",
  "PROBE_NOT_UNIQUE",
  "POSITIONAL_UNMATCHED",
  "UNKNOWN_COMMIT",
  "OVERRIDE_BAD_SHAPE",
  "OVERRIDE_DUPLICATE",
  "OVERRIDE_MISSING",
  "OVERRIDE_STALE",
  "OVERRIDE_STATUS_MISMATCH",
  "OVERRIDE_BAD_VERSION",
  "INVARIANT_FAILED",
];

const halt = (code, detail) => {
  if (!HALT_CODES.includes(code)) throw new Error(`internal: unlisted halt code ${code}`);
  throw new MigrationHalt(code, detail);
};

/** Classification statuses, in DECISION ORDER (the first that applies wins). */
export const STATUSES = ["UNRESOLVED", "DRIFTED", "OUT_OF_SCOPE", "MULTI", "CONFLICT", "AGREE", "PICKAXE"];
/** The only statuses that assign without an override. */
export const AUTO_STATUSES = ["AGREE", "PICKAXE"];

/** Keep a Changelog type-group order; any other group follows, in first-seen order. */
export const TYPE_ORDER = [
  "### Changed — BREAKING",
  "### Added",
  "### Changed",
  "### Deprecated",
  "### Removed",
  "### Fixed",
  "### Security",
  "### Deferred",
];

/** Probe sizing. */
export const HEAD_PROBE_MIN = 60;
export const PROBE_STEP = 10;
export const TAIL_PROBE_MIN_LINE = 25;
/** `SKILLS_VERSION` followed within this many characters by `A → B`. */
export const MARKER_WINDOW = 40;

const SHA_RE = /^[0-9a-f]{40}$/;
const SHORT_SHA_RE = /^[0-9a-f]{7,40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

export const short = (sha) => sha.slice(0, 7);

/**
 * The two placeholder bases and their optional suffixes. A version with no bullet gets exactly one line
 * built from ONE base plus zero or more suffixes, in this order. `recorded-none` is the prompt's wording
 * and is used ONLY when it is literally true (no first-parent commit in the version's window changed
 * CHANGELOG.md); for 6.5.0 it is false — `8dacaa9` added an entry that was reverted and re-landed. The
 * other base says only what is true of THIS file ("is filed under"), never that nothing was introduced.
 * A version's WINDOW is the first-parent commits after the previous table version's first-appearance
 * commit, up to and including its own.
 */
export const PLACEHOLDER_FORMS = {
  "recorded-none": /^- No CHANGELOG entry was recorded for this version \(bump commit [0-9a-f]{7}\)\./,
  "none-filed":
    /^- No entry in this file is filed under this version \(bump commit [0-9a-f]{7}\); CHANGELOG\.md changed in its window at [0-9a-f]{7}(?:, [0-9a-f]{7})*\./,
};
/** A full placeholder line: one base, then the optional suffixes, nothing else. */
export const PLACEHOLDER_LINE_RE = new RegExp(
  "^- (?:No CHANGELOG entry was recorded for this version \\(bump commit [0-9a-f]{7}\\)\\." +
    "|No entry in this file is filed under this version \\(bump commit [0-9a-f]{7}\\); CHANGELOG\\.md changed in its window at [0-9a-f]{7}(?:, [0-9a-f]{7})*\\.)" +
    "(?: Reverted by [0-9a-f]{7} on \\d{4}-\\d{2}-\\d{2}\\.)?" +
    "(?: An entry added at [0-9a-f]{7} was re-landed in [0-9a-f]{7} and is filed under \\[\\d+\\.\\d+\\.\\d+\\]\\.)*$"
);

/**
 * The invariants asserted before anything is written (L29: iterated by tests). Every member reads the
 * RE-PARSED OUTPUT except two, named so the count is not read as more than it is: NONEMPTY_PARSE reads
 * the input (an empty parse must certify nothing, L34), and DROPPED_EXACT reads BOTH — the input's dropped
 * lines against `allowDrop` (which the parser already enforces as DROPPED_MISMATCH; restated here so the
 * report shows it) and the output, which must contain no `allowDrop` line at all.
 */
export const INVARIANTS = [
  "NONEMPTY_PARSE",
  "BULLET_MULTISET",
  "NO_DUPLICATES",
  "NO_GHOST_SECTION",
  "ONE_SECTION_PER_VERSION",
  "HEADINGS_DESCEND",
  "DATES_NONINCREASING",
  "DATES_MATCH_TABLE",
  "NEWEST_IS_SKILLS_VERSION",
  "DROPPED_EXACT",
  "PREAMBLE_INTRO_TAIL_BYTES",
  "ASSIGNMENT_ON_REPARSE",
  "GROUP_ORDER",
  "RELATIVE_ORDER",
  "PLACEHOLDERS_WELL_FORMED",
];

// ── Semver + the version table ──────────────────────────────────────────────────────────────────────

export function parseSemver(v) {
  const m = typeof v === "string" ? SEMVER_RE.exec(v) : null;
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function cmpSemver(a, b) {
  const x = parseSemver(a);
  const y = parseSemver(b);
  if (!x || !y) halt("BAD_SEMVER", `cannot compare ${JSON.stringify(a)} with ${JSON.stringify(b)}`);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

/**
 * rows: every first-parent commit that touched SKILLS_VERSION, oldest first: {sha, date, value}.
 * Returns {versions, resets, byVersion}. `versions` is in first-appearance order; each carries
 * `reverted: null | {sha, date}` — the FIRST later commit that sets a LOWER value. A re-set of a value
 * already seen is a reset, never a new version.
 */
export function buildVersionTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) halt("EMPTY_HISTORY", "no commit ever set SKILLS_VERSION");
  const versions = [];
  const resets = [];
  const byVersion = new Map();
  rows.forEach((r, i) => {
    if (!r || !SHA_RE.test(r.sha) || !DATE_RE.test(r.date)) halt("BAD_ROW", `row ${i}: ${JSON.stringify(r)}`);
    if (!parseSemver(r.value)) halt("BAD_SEMVER", `${r.sha} sets SKILLS_VERSION to ${JSON.stringify(r.value)}`);
    if (byVersion.has(r.value)) {
      resets.push({ version: r.value, sha: r.sha, date: r.date, row: i });
      return;
    }
    const v = { version: r.value, sha: r.sha, date: r.date, row: i, reverted: null };
    versions.push(v);
    byVersion.set(r.value, v);
  });
  for (const v of versions) {
    for (let j = v.row + 1; j < rows.length; j++) {
      if (cmpSemver(rows[j].value, v.version) < 0) {
        v.reverted = { sha: rows[j].sha, date: rows[j].date };
        break;
      }
    }
  }
  for (const r of resets) {
    if (byVersion.get(r.version).reverted) halt("RELANDED_REVERTED", `${r.version} was reverted and later re-set at ${r.sha}`);
  }
  for (let i = 1; i < versions.length; i++) {
    if (cmpSemver(versions[i - 1].version, versions[i].version) >= 0) {
      halt(
        "ORDER",
        `${versions[i - 1].version} (${short(versions[i - 1].sha)}) first appears before ${versions[i].version} (${short(versions[i].sha)})`
      );
    }
  }
  return { versions, resets, byVersion };
}

/**
 * The version a commit's change belongs to: the earliest NON-REVERTED version whose first-appearance
 * commit is at or after `index` in first-parent order (a bump commit's own change belongs to that bump; a
 * no-bump commit's to the next bump). Untouched versions ARE mappable here — landing on one is reported
 * as OUT_OF_SCOPE by the classifier, never silently skipped. `null` when no bump follows (→ [Unreleased]).
 */
export function versionForIndex(table, indexOf, index) {
  for (const v of table.versions) {
    if (v.reverted) continue;
    const vi = indexOf.get(v.sha);
    if (vi === undefined) halt("UNKNOWN_COMMIT", `version ${v.version}'s commit ${v.sha} is not on the first-parent chain`);
    if (vi >= index) return v.version;
  }
  return null;
}

// ── Parse ───────────────────────────────────────────────────────────────────────────────────────────

const H2 = /^## /;
const H3 = /^### /;
const BULLET = /^- /;
const INDENTED = /^[ \t]/;
export const VERSION_HEADING_RE = /^## \[(\d+\.\d+\.\d+)\](?: - (\d{4}-\d{2}-\d{2}))?$/;
export const UNRELEASED_HEADING = "## [Unreleased]";

/**
 * Parse a Keep-a-Changelog file into preamble / sections / bullets / untouched tail.
 *
 * A bullet is a column-0 `- ` line plus everything up to the next bullet or heading: indented lines,
 * blank lines followed by more of the item, and UNINDENTED lazy-continuation lines that directly follow a
 * non-blank line of the bullet. Trailing blank lines are not part of the bullet. Any other non-structure
 * line is an ORPHAN and halts — except an exact member of `allowDrop`, which is dropped and recorded.
 *
 * `untouched`: versions whose sections are captured VERBATIM as the tail; they must come last.
 * `allowUngrouped`: accept bullets directly under a `##` heading (the rendered placeholders). The input
 * never gets it — an input bullet with no type group has nowhere defined to go.
 */
export function parseChangelog(text, { allowDrop = [], untouched = [], allowUngrouped = false } = {}) {
  if (typeof text !== "string") halt("NO_FINAL_NEWLINE", "input is not a string");
  if (text.includes("\r")) halt("CR_IN_INPUT", "CHANGELOG contains a carriage return; refusing to guess line structure");
  if (!text.endsWith("\n")) halt("NO_FINAL_NEWLINE", "CHANGELOG must end with a newline");
  const lines = text.slice(0, -1).split("\n");
  const preamble = [];
  let i = 0;
  while (i < lines.length && !H2.test(lines[i])) preamble.push(lines[i++]);

  const sections = [];
  const dropped = [];
  let tail = null;
  const seen = new Set();
  while (i < lines.length) {
    const heading = lines[i];
    const m = VERSION_HEADING_RE.exec(heading);
    const version = heading === UNRELEASED_HEADING ? "Unreleased" : m ? m[1] : null;
    if (version === null) halt("BAD_HEADING", `line ${i + 1}: ${JSON.stringify(heading.slice(0, 80))}`);
    if (seen.has(version)) halt("DUPLICATE_SECTION", `line ${i + 1}: a second ${heading}`);
    seen.add(version);
    if (untouched.includes(version)) {
      for (let k = i + 1; k < lines.length; k++) {
        if (!H2.test(lines[k])) continue;
        const mm = VERSION_HEADING_RE.exec(lines[k]);
        if (!mm || !untouched.includes(mm[1])) halt("UNTOUCHED_NOT_LAST", `line ${k + 1} follows the untouched ${heading}`);
      }
      tail = { version, line: i + 1, text: lines.slice(i).join("\n") + "\n" };
      break;
    }
    const sec = { version, date: m ? (m[2] ?? null) : null, heading, line: i + 1, intro: [], ungrouped: [], groups: [] };
    sections.push(sec);
    i++;

    // Intro: blank lines and HTML comments only, up to the first ###, bullet, or ##.
    let inComment = false;
    while (i < lines.length && !H2.test(lines[i]) && !H3.test(lines[i]) && !BULLET.test(lines[i])) {
      const l = lines[i];
      if (inComment || l === "" || l.startsWith("<!--")) {
        sec.intro.push(l);
        if (l.startsWith("<!--")) inComment = true;
        if (inComment && l.includes("-->")) inComment = false;
      } else {
        halt("ORPHAN", `line ${i + 1} in the intro of ${heading}: ${JSON.stringify(l.slice(0, 80))}`);
      }
      i++;
    }
    if (inComment) halt("UNCLOSED_COMMENT", `the HTML comment in the intro of ${heading} never closes`);

    let group = null;
    let bullet = null;
    let prevBlank = false;
    const close = () => {
      if (!bullet) return;
      while (bullet.lines.length > 1 && bullet.lines[bullet.lines.length - 1] === "") bullet.lines.pop();
      bullet.text = bullet.lines.join("\n");
      bullet.endLine = bullet.line + bullet.lines.length - 1;
      delete bullet.lines;
      bullet = null;
    };
    while (i < lines.length && !H2.test(lines[i])) {
      const l = lines[i];
      if (H3.test(l)) {
        close();
        group = { heading: l, line: i + 1, bullets: [] };
        sec.groups.push(group);
        prevBlank = false;
      } else if (BULLET.test(l)) {
        close();
        if (!group && !allowUngrouped) halt("BULLET_OUTSIDE_GROUP", `line ${i + 1} in ${heading} is a bullet under no ### type group`);
        bullet = { line: i + 1, lines: [l], section: version, group: group ? group.heading : null, lazy: [] };
        (group ? group.bullets : sec.ungrouped).push(bullet);
        prevBlank = false;
      } else if (l === "") {
        if (bullet) bullet.lines.push(l);
        prevBlank = true;
      } else if (bullet && INDENTED.test(l)) {
        bullet.lines.push(l);
        prevBlank = false;
      } else if (bullet && !prevBlank) {
        bullet.lines.push(l);
        bullet.lazy.push(i + 1);
      } else if (allowDrop.includes(l)) {
        close();
        dropped.push({ line: i + 1, text: l });
        prevBlank = false;
      } else {
        halt("ORPHAN", `line ${i + 1} in ${heading}: ${JSON.stringify(l.slice(0, 80))}`);
      }
      i++;
    }
    close();
  }

  const droppedTexts = dropped.map((d) => d.text).sort();
  const wanted = [...allowDrop].sort();
  if (droppedTexts.length !== wanted.length || droppedTexts.some((t, k) => t !== wanted[k])) {
    halt("DROPPED_MISMATCH", `dropped ${JSON.stringify(droppedTexts)}, allowed exactly ${JSON.stringify(wanted)}`);
  }
  const bullets = [];
  for (const s of sections) {
    for (const b of s.ungrouped) bullets.push(b);
    for (const g of s.groups) for (const b of g.bullets) bullets.push(b);
  }
  bullets.forEach((b, k) => (b.order = k));
  return { preamble, sections, bullets, tail, dropped };
}

// ── Markers ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * The CLOSED set of marker spellings (L36 — a parameterized value acquires variant spellings; each one
 * measured in the live file is a member, and `unreadMentions` lists every `SKILLS_VERSION … X.Y.Z` it
 * does NOT read, so an unlisted spelling is visible in the report rather than silently ignored). Each
 * regex runs over the text with `*` and back-ticks stripped; `B` is always the version the text says the
 * entry shipped as. A gap never crosses another `SKILLS_VERSION`, so a marker binds to its nearest one.
 */
const V = String.raw`(\d+\.\d+\.\d+)(?!\.?\d)`;
export const MARKER_FORMS = {
  pair: new RegExp(String.raw`SKILLS_VERSION(?:(?!SKILLS_VERSION)[\s\S]){0,${MARKER_WINDOW}}?(?<![\d.])(\d+\.\d+\.\d+)\s*→\s*${V}`, "g"),
  "arrow-only": new RegExp(String.raw`SKILLS_VERSION\s*→\s*${V}`, "g"),
  "bumped-to": new RegExp(String.raw`SKILLS_VERSION\s+bumped to\s+${V}`, "g"),
};

const strip = (text) => text.replace(/[*`]/g, "");

/** Every marker in a bullet: [{form, from, to}] (`from` is null for the one-sided forms). */
export function extractMarkers(text) {
  const s = strip(text);
  const out = [];
  for (const m of s.matchAll(MARKER_FORMS.pair)) out.push({ form: "pair", from: m[1], to: m[2], at: m.index });
  for (const form of ["arrow-only", "bumped-to"])
    for (const m of s.matchAll(MARKER_FORMS[form])) out.push({ form, from: null, to: m[1], at: m.index });
  return out.sort((a, b) => a.at - b.at).map(({ form, from, to }) => ({ form, from, to }));
}

/**
 * Every `SKILLS_VERSION` followed within MARKER_WINDOW characters by a version token that NO marker form
 * reads — reported, never classified (they are prose such as "had reached 3.0.4", not a record of what
 * shipped). Its purpose is closure: a new spelling of a real marker shows up here instead of vanishing.
 */
export function unreadMentions(text) {
  const s = strip(text);
  const generic = new RegExp(
    String.raw`SKILLS_VERSION(?:(?!SKILLS_VERSION)[\s\S]){0,${MARKER_WINDOW}}?(?<![\d.])\d+\.\d+\.\d+(?!\.?\d)`,
    "y"
  );
  const sticky = Object.values(MARKER_FORMS).map((re) => new RegExp(re.source, "y"));
  const out = [];
  for (let i = s.indexOf("SKILLS_VERSION"); i !== -1; i = s.indexOf("SKILLS_VERSION", i + 1)) {
    generic.lastIndex = i;
    const g = generic.exec(s);
    if (!g) continue;
    const read = sticky.some((re) => {
      re.lastIndex = i;
      return re.test(s);
    });
    if (!read) out.push(g[0].replace(/\s+/g, " "));
  }
  return out;
}

/**
 * Classify a bullet's markers against the version table: `none` | `target` (B is an assignable
 * version) | `ghost` (B never existed on main) | `nontarget` (B existed but is reverted or untouched) |
 * `multi` (several distinct Bs).
 */
export function classifyMarker(markers, table, untouched) {
  const tos = [...new Set(markers.map((m) => m.to))];
  if (tos.length === 0) return { kind: "none" };
  if (tos.length > 1) return { kind: "multi", names: tos };
  const b = tos[0];
  const v = table.byVersion.get(b);
  if (!v) return { kind: "ghost", names: b };
  if (v.reverted || untouched.includes(b)) return { kind: "nontarget", names: b };
  return { kind: "target", version: b };
}

// ── Probes + pickaxe ────────────────────────────────────────────────────────────────────────────────

/** Overlapping occurrence count — conservative for a uniqueness test. */
export function countOccurrences(hay, needle) {
  if (!needle) return Infinity;
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) n++;
  return n;
}

/**
 * The head probe: the first HEAD_PROBE_MIN characters after `- `, lengthened by PROBE_STEP within the
 * FIRST LINE until it occurs exactly once in `fileText`. Staying on one line keeps the probe blind to a
 * later re-wrap of the bullet's continuation lines. Crosses the line only if the whole first line is not
 * unique; halts PROBE_NOT_UNIQUE if the whole bullet is not.
 */
export function headProbe(bulletText, fileText) {
  const body = bulletText.slice(2);
  const first = body.split("\n")[0];
  for (let n = HEAD_PROBE_MIN; ; n += PROBE_STEP) {
    const p = first.slice(0, n);
    if (countOccurrences(fileText, p) === 1) return { probe: p, crossLine: false };
    if (n >= first.length) break;
  }
  for (let n = first.length + PROBE_STEP; ; n += PROBE_STEP) {
    const p = body.slice(0, n);
    if (countOccurrences(fileText, p) === 1) return { probe: p, crossLine: true };
    if (n >= body.length) break;
  }
  halt("PROBE_NOT_UNIQUE", `no prefix of the bullet at line ${JSON.stringify(first.slice(0, 60))} is unique in the file`);
}

/**
 * The tail probe: the trailing HEAD_PROBE_MIN characters of the bullet's last non-empty line (trimmed),
 * lengthened leftward until unique. `{skip}` when the trimmed line is shorter than TAIL_PROBE_MIN_LINE, or
 * when no suffix of it is unique.
 */
export function tailProbe(bulletText, fileText) {
  const last = bulletText
    .split("\n")
    .filter((l) => l.trim() !== "")
    .at(-1)
    .trim();
  if (last.length < TAIL_PROBE_MIN_LINE) return { skip: "short" };
  for (let n = Math.min(HEAD_PROBE_MIN, last.length); ; n += PROBE_STEP) {
    const p = last.slice(-Math.min(n, last.length));
    if (countOccurrences(fileText, p) === 1) return { probe: p };
    if (n >= last.length) break;
  }
  return { skip: "not-unique" };
}

/**
 * counts: [{sha, count}] — the probe's occurrence count after each first-parent commit that CHANGED it
 * (the `git log -S` list), oldest first. Returns every 0 -> >0 transition: `intro` is the LAST one (the
 * introducing commit), `earlier` the rest. `intro` is null when the probe is absent at the end.
 */
export function introductions(counts) {
  const all = [];
  let prev = 0;
  for (const c of counts) {
    if (prev === 0 && c.count > 0) all.push(c.sha);
    prev = c.count;
  }
  if (prev === 0 || all.length === 0) return { intro: null, earlier: all };
  return { intro: all[all.length - 1], earlier: all.slice(0, -1) };
}

// ── Classification + overrides ──────────────────────────────────────────────────────────────────────

/**
 * One bullet's status, in STATUSES decision order. `head`/`tail` are `{sha, version}` (version null =
 * after the last bump, i.e. [Unreleased]) or null / `{skip}`.
 */
export function classifyBullet({ head, tail, marker, untouched }) {
  if (!head || !head.sha) return "UNRESOLVED";
  if (tail && tail.sha && tail.version !== head.version) return "DRIFTED";
  if (untouched.includes(head.version)) return "OUT_OF_SCOPE";
  if (marker.kind === "multi") return "MULTI";
  if (marker.kind === "nontarget") return "CONFLICT";
  if (marker.kind === "target") return marker.version === head.version ? "AGREE" : "CONFLICT";
  return "PICKAXE";
}

/** The versions a bullet may be filed under: table versions, neither reverted nor untouched. */
export function isTarget(table, untouched, v) {
  const e = table.byVersion.get(v);
  return Boolean(e) && !e.reverted && !untouched.includes(v);
}

/**
 * Validate overrides against the classified bullets and produce the final assignment Map(bullet ->
 * version|"Unreleased"). Each override: {probe, status, version, evidence: {sha, reason}}. Halts on a
 * missing, stale, duplicated, mismatched or malformed override — it never falls back to the computed value.
 */
export function applyOverrides(classified, overrides, table, untouched) {
  if (!Array.isArray(overrides)) halt("OVERRIDE_BAD_SHAPE", "overrides must be an array");
  const byProbe = new Map();
  for (const o of overrides) {
    const ok =
      o &&
      typeof o.probe === "string" &&
      o.probe.length > 0 &&
      STATUSES.includes(o.status) &&
      !AUTO_STATUSES.includes(o.status) &&
      typeof o.version === "string" &&
      o.evidence &&
      typeof o.evidence.sha === "string" &&
      SHORT_SHA_RE.test(o.evidence.sha) &&
      typeof o.evidence.reason === "string" &&
      o.evidence.reason.trim().length > 0;
    if (!ok) halt("OVERRIDE_BAD_SHAPE", JSON.stringify(o).slice(0, 200));
    if (byProbe.has(o.probe)) halt("OVERRIDE_DUPLICATE", JSON.stringify(o.probe.slice(0, 60)));
    if (!isTarget(table, untouched, o.version))
      halt("OVERRIDE_BAD_VERSION", `${o.version} is not a target version (${JSON.stringify(o.probe.slice(0, 60))})`);
    byProbe.set(o.probe, o);
  }
  const assignment = new Map();
  const used = new Set();
  for (const c of classified) {
    const o = byProbe.get(c.probe);
    if (AUTO_STATUSES.includes(c.status)) {
      if (o) halt("OVERRIDE_STALE", `override for ${JSON.stringify(c.probe.slice(0, 60))} but the bullet is ${c.status}`);
      assignment.set(c.bullet, c.head.version ?? "Unreleased");
      continue;
    }
    if (!o)
      halt("OVERRIDE_MISSING", `${c.status} bullet at line ${c.bullet.line} needs an override: ${JSON.stringify(c.probe.slice(0, 60))}`);
    if (o.status !== c.status)
      halt("OVERRIDE_STATUS_MISMATCH", `override says ${o.status}, computed ${c.status}: ${JSON.stringify(c.probe.slice(0, 60))}`);
    used.add(o.probe);
    assignment.set(c.bullet, o.version);
  }
  for (const o of overrides) {
    if (!used.has(o.probe) && !classified.some((c) => c.probe === o.probe))
      halt("OVERRIDE_STALE", `override matches no bullet: ${JSON.stringify(o.probe.slice(0, 60))}`);
  }
  return assignment;
}

// ── Placeholders ────────────────────────────────────────────────────────────────────────────────────

/**
 * The bullets whose head probe had an EARLIER 0 -> >0 transition inside a version's window — the entry that
 * version's bump commit added, later reverted and re-landed elsewhere. `lo` / `hi` are first-parent
 * indices: the window is (lo, hi], i.e. after the previous table version's first appearance, up to and
 * including this one's. Returns [{earlier, intro, version}] for `placeholderFor`.
 */
export function relandedIn({ classified, assignment, indexOf, lo, hi }) {
  return classified
    .flatMap((c) => c.headEarlier.map((e) => ({ earlier: e, intro: c.head.sha, version: assignment.get(c.bullet) })))
    .filter((r) => {
      const i = indexOf.get(r.earlier);
      return i > lo && i <= hi;
    });
}

/**
 * The one line for a version no bullet was filed under. `windowTouches`: SHAs of first-parent commits in
 * the version's window that changed CHANGELOG.md (oldest first). `relanded`: [{earlier, intro, version}] —
 * bullets whose head probe had an earlier 0 -> >0 transition inside this window.
 */
export function placeholderFor(v, { windowTouches, relanded }) {
  let line =
    windowTouches.length === 0
      ? `- No CHANGELOG entry was recorded for this version (bump commit ${short(v.sha)}).`
      : `- No entry in this file is filed under this version (bump commit ${short(v.sha)}); CHANGELOG.md changed in its window at ${windowTouches.map(short).join(", ")}.`;
  if (v.reverted) line += ` Reverted by ${short(v.reverted.sha)} on ${v.reverted.date}.`;
  for (const r of relanded)
    line += ` An entry added at ${short(r.earlier)} was re-landed in ${short(r.intro)} and is filed under [${r.version}].`;
  return line;
}

// ── Render ──────────────────────────────────────────────────────────────────────────────────────────

function groupRank(heading, firstSeen) {
  const k = TYPE_ORDER.indexOf(heading);
  return k >= 0 ? k : TYPE_ORDER.length + firstSeen.indexOf(heading);
}

/** Group a section's bullets by type heading, in TYPE_ORDER then first-seen order; bullets keep input order. */
export function orderGroups(bullets, firstSeen) {
  const heads = [...new Set(bullets.map((b) => b.group))];
  heads.sort((a, b) => groupRank(a, firstSeen) - groupRank(b, firstSeen));
  return heads.map((h) => ({ heading: h, bullets: bullets.filter((b) => b.group === h).sort((x, y) => x.order - y.order) }));
}

/**
 * Render the migrated CHANGELOG. `assignment`: Map(bullet -> version | "Unreleased"). `placeholders`:
 * Map(version -> line). `entry`: {group, text} — this migration's own [Unreleased] entry.
 */
export function renderChangelog({ parsed, table, assignment, placeholders, entry, untouched }) {
  const unreleased = parsed.sections.find((s) => s.version === "Unreleased");
  if (!unreleased) halt("NO_UNRELEASED", "the input has no ## [Unreleased] section");
  for (const s of parsed.sections) {
    if (s !== unreleased && s.intro.some((l) => l !== ""))
      halt("INTRO_CONTENT_LOST", `${s.heading} carries intro text that has no place in the output`);
  }
  const firstSeen = [...new Set(parsed.bullets.map((b) => b.group))];
  const blocks = [];
  const pushSection = (heading, introLines, groups, ungroupedLine) => {
    const out = [heading];
    if (introLines) out.push(...introLines);
    else out.push("");
    while (out.length > 1 && out[out.length - 1] === "") out.pop();
    if (ungroupedLine) out.push("", ungroupedLine);
    for (const g of groups) {
      out.push("", g.heading);
      for (const b of g.bullets) out.push("", b.text);
    }
    blocks.push(out.join("\n"));
  };

  const unreleasedBullets = parsed.bullets.filter((b) => assignment.get(b) === "Unreleased");
  const entryBullet = { group: entry.group, text: entry.text, order: -1 };
  pushSection(UNRELEASED_HEADING, unreleased.intro, orderGroups([entryBullet, ...unreleasedBullets], [entry.group, ...firstSeen]), null);

  const generated = table.versions.filter((v) => !untouched.includes(v.version)).sort((a, b) => cmpSemver(b.version, a.version));
  for (const v of generated) {
    const bs = parsed.bullets.filter((b) => assignment.get(b) === v.version);
    const heading = `## [${v.version}] - ${v.date}`;
    if (bs.length === 0) pushSection(heading, null, [], placeholders.get(v.version));
    else pushSection(heading, null, orderGroups(bs, firstSeen), null);
  }
  const head = parsed.preamble.join("\n");
  let text = head + "\n" + blocks.join("\n\n") + "\n";
  if (parsed.tail) text += "\n" + parsed.tail.text;
  return text;
}

// ── Invariants ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Re-parse the RENDERED text with the same parser and check every member of INVARIANTS. Returns
 * [{id, ok, detail}] in INVARIANTS order; `assertInvariants` turns any failure into INVARIANT_FAILED.
 * The re-parse is the point: the multiset and placement checks read the OUTPUT, never the renderer's
 * intentions, so a render bug cannot certify itself.
 */
export function checkInvariants({ parsed, outText, table, assignment, placeholders, entry, skillsVersion, allowDrop, untouched }) {
  const results = [];
  const rec = (id, ok, detail = "") => results.push({ id, ok: Boolean(ok), detail });
  let out;
  try {
    out = parseChangelog(outText, { allowDrop: [], untouched, allowUngrouped: true });
  } catch (e) {
    for (const id of INVARIANTS) rec(id, false, `the output does not re-parse: ${e.message}`);
    return results;
  }
  const inTexts = parsed.bullets.map((b) => b.text);
  const outVersionSections = out.sections.filter((s) => s.version !== "Unreleased");
  const placeholderBullets = new Set();
  for (const s of outVersionSections) for (const b of s.ungrouped) placeholderBullets.add(b);
  const outUnreleased = out.sections.find((s) => s.version === "Unreleased");
  const entryBullets = outUnreleased ? outUnreleased.groups.flatMap((g) => g.bullets).filter((b) => b.text === entry.text) : [];
  const migrated = out.bullets.filter((b) => !placeholderBullets.has(b) && !entryBullets.includes(b));

  rec("NONEMPTY_PARSE", parsed.bullets.length > 0, `${parsed.bullets.length} input bullets`);

  const sortedIn = [...inTexts].sort();
  const sortedOut = migrated.map((b) => b.text).sort();
  const sameMultiset = sortedIn.length === sortedOut.length && sortedIn.every((t, k) => t === sortedOut[k]);
  rec(
    "BULLET_MULTISET",
    sameMultiset && entryBullets.length === 1,
    `${sortedIn.length} in, ${sortedOut.length} out, ${entryBullets.length} entry`
  );

  const dupIn = inTexts.length - new Set(inTexts).size;
  const outAll = out.bullets.map((b) => b.text);
  const dupOut = outAll.length - new Set(outAll).size;
  rec("NO_DUPLICATES", dupIn === 0 && dupOut === 0, `${dupIn} duplicate input bullets, ${dupOut} duplicate output bullets`);

  const allVersionHeads = [
    ...outVersionSections.map((s) => ({ version: s.version, date: s.date })),
    ...(out.tail ? [tailHead(out.tail)] : []),
  ];
  const ghosts = allVersionHeads.filter((h) => !table.byVersion.has(h.version));
  rec("NO_GHOST_SECTION", ghosts.length === 0, ghosts.map((g) => g.version).join(", "));

  const want = table.versions.map((v) => v.version).sort(cmpSemver);
  const got = allVersionHeads.map((h) => h.version).sort(cmpSemver);
  rec(
    "ONE_SECTION_PER_VERSION",
    want.length === got.length && want.every((v, k) => v === got[k]),
    `${want.length} table versions, ${got.length} sections`
  );

  let descend = true;
  let dates = true;
  for (let k = 1; k < allVersionHeads.length; k++) {
    if (cmpSemver(allVersionHeads[k - 1].version, allVersionHeads[k].version) <= 0) descend = false;
    if (!allVersionHeads[k].date || allVersionHeads[k - 1].date < allVersionHeads[k].date) dates = false;
  }
  rec("HEADINGS_DESCEND", descend && allVersionHeads.length > 0);
  rec("DATES_NONINCREASING", dates && allVersionHeads.every((h) => h.date));
  const badDates = outVersionSections.filter((s) => table.byVersion.get(s.version)?.date !== s.date);
  rec("DATES_MATCH_TABLE", badDates.length === 0, badDates.map((s) => s.version).join(", "));

  rec(
    "NEWEST_IS_SKILLS_VERSION",
    allVersionHeads.length > 0 && allVersionHeads[0].version === skillsVersion,
    `newest ${allVersionHeads[0]?.version}, SKILLS_VERSION ${skillsVersion}`
  );

  const dropped = parsed.dropped.map((d) => d.text).sort();
  const allowed = [...allowDrop].sort();
  const outLines = new Set(outText.split("\n"));
  const survivors = allowDrop.filter((l) => outLines.has(l));
  rec(
    "DROPPED_EXACT",
    dropped.length === allowed.length && dropped.every((t, k) => t === allowed[k]) && survivors.length === 0,
    `${dropped.length} dropped from the input, ${survivors.length} present in the output`
  );

  const inUnreleased = parsed.sections.find((s) => s.version === "Unreleased");
  const trim = (a) => {
    const c = [...a];
    while (c.length && c[c.length - 1] === "") c.pop();
    return c.join("\n");
  };
  const bytesOk =
    out.preamble.join("\n") === parsed.preamble.join("\n") &&
    Boolean(outUnreleased) &&
    trim(outUnreleased.intro) === trim(inUnreleased ? inUnreleased.intro : []) &&
    (out.tail ? out.tail.text : null) === (parsed.tail ? parsed.tail.text : null);
  rec("PREAMBLE_INTRO_TAIL_BYTES", bytesOk);

  const byText = new Map(parsed.bullets.map((b) => [b.text, b]));
  const misplaced = migrated.filter((b) => {
    const src = byText.get(b.text);
    return !src || assignment.get(src) !== b.section || src.group !== b.group;
  });
  rec("ASSIGNMENT_ON_REPARSE", misplaced.length === 0, misplaced.map((b) => `line ${b.line}`).join(", "));

  const firstSeen = [...new Set([entry.group, ...parsed.bullets.map((b) => b.group)])];
  const badGroupOrder = out.sections.filter((s) => {
    const ranks = s.groups.map((g) => groupRank(g.heading, firstSeen));
    return ranks.some((r, k) => k > 0 && ranks[k - 1] >= r);
  });
  rec("GROUP_ORDER", badGroupOrder.length === 0, badGroupOrder.map((s) => s.version).join(", "));

  const badOrder = out.sections.filter((s) =>
    s.groups.some((g) => {
      const orders = g.bullets.map((b) => byText.get(b.text)?.order ?? -1);
      return orders.some((o, k) => k > 0 && orders[k - 1] >= o);
    })
  );
  rec("RELATIVE_ORDER", badOrder.length === 0, badOrder.map((s) => s.version).join(", "));

  const emptyVersions = table.versions.filter((v) => !untouched.includes(v.version) && ![...assignment.values()].includes(v.version));
  const phOk =
    [...placeholderBullets].every((b) => PLACEHOLDER_LINE_RE.test(b.text) && placeholders.get(b.section) === b.text) &&
    placeholderBullets.size === emptyVersions.length &&
    outVersionSections.every((s) => s.ungrouped.length === 0 || (s.ungrouped.length === 1 && s.groups.length === 0));
  rec("PLACEHOLDERS_WELL_FORMED", phOk, `${placeholderBullets.size} placeholders, ${emptyVersions.length} empty versions`);
  return results;
}

function tailHead(tail) {
  const m = VERSION_HEADING_RE.exec(tail.text.split("\n")[0]);
  return { version: m ? m[1] : null, date: m ? (m[2] ?? null) : null };
}

export function assertInvariants(results) {
  const bad = results.filter((r) => !r.ok);
  if (bad.length) halt("INVARIANT_FAILED", bad.map((r) => `${r.id}${r.detail ? ` (${r.detail})` : ""}`).join("; "));
  return results;
}

// ── Positional references ───────────────────────────────────────────────────────────────────────────

const POSITIONAL_RE = /\b(?:above|below)\b/;

/**
 * Entries that use "above" or "below". They were written for the old type-grouped layout, so a reference
 * to ANOTHER entry may now point the wrong way: the two can land in different version sections. The core
 * cannot find a referent by itself, so it lists every candidate. `known` holds the references a review
 * resolved, each as {phrase, referent} (exact substrings of the referring and the referred-to entry). Each
 * one is CHECKED here rather than trusted: the phrase and the referent must each occur in exactly one
 * migrated bullet, the reference must have pointed the right way in the INPUT order, and it must point
 * the wrong way in the OUTPUT order. Otherwise POSITIONAL_UNMATCHED, so the list cannot rot into
 * claiming a breakage the render no longer has.
 */
export function positionalMentions(bullets, known, outText) {
  const candidates = bullets.filter((b) => POSITIONAL_RE.test(b.text));
  const unique = (needle, what) => {
    const hits = bullets.filter((b) => b.text.includes(needle));
    if (hits.length !== 1)
      halt("POSITIONAL_UNMATCHED", `${what} ${JSON.stringify(needle)} occurs in ${hits.length} bullets, expected exactly 1`);
    return hits[0];
  };
  const rank = (b) => {
    const k = outText.indexOf("\n" + b.text + "\n");
    if (k < 0) halt("POSITIONAL_UNMATCHED", `bullet at input line ${b.line} is not in the rendered output`);
    return k;
  };
  const confirmed = known.map((k) => {
    const m = /\b(above|below)\b/.exec(k.phrase);
    if (!m) halt("POSITIONAL_UNMATCHED", `${JSON.stringify(k.phrase)} contains neither "above" nor "below"`);
    const at = unique(k.phrase, "phrase");
    const ref = unique(k.referent, "referent");
    const up = m[1] === "above";
    const wasRight = up ? ref.order < at.order : ref.order > at.order;
    const isRight = up ? rank(ref) < rank(at) : rank(ref) > rank(at);
    if (!wasRight || isRight)
      halt(
        "POSITIONAL_UNMATCHED",
        `${JSON.stringify(k.phrase)} is listed as broken by the move, but it ${wasRight ? "still points the right way" : "was already wrong before it"}`
      );
    return { phrase: k.phrase, word: m[1], bullet: at, referent: ref };
  });
  return { candidates, confirmed };
}

// ── This migration's own [Unreleased] entry ─────────────────────────────────────────────────────────

/**
 * Stale version text the relocation leaves in place (it never edits a bullet): every ghost marker ("text
 * names X, filed under Y") and every marker naming a version its entry is not filed under.
 */
export function staleMentions(classified, assignment) {
  const out = [];
  for (const c of classified) {
    const filed = assignment.get(c.bullet);
    const at = { filed, line: c.bullet.line, probe: c.probe };
    if (c.marker.kind === "ghost") out.push({ kind: "ghost", names: c.marker.names, ...at });
    else if (c.marker.kind === "nontarget" || (c.marker.kind === "target" && c.marker.version !== filed))
      out.push({ kind: "stale", names: c.marker.kind === "target" ? c.marker.version : c.marker.names, ...at });
    else if (c.marker.kind === "multi") out.push({ kind: "multi", names: c.marker.names.join(", "), ...at });
  }
  return out;
}

/**
 * Entries whose head maps to an UNTOUCHED version but were filed elsewhere by a reviewed override, grouped
 * by (introducing commit, version, filed version). The CHANGELOG reader never opens MIGRATION.md, so the
 * entry names them (GRILL G2).
 */
export function outOfScopeFilings(classified, assignment, untouched) {
  const groups = new Map();
  for (const c of classified) {
    if (!c.head.sha || !untouched.includes(c.head.version)) continue;
    const key = `${c.head.sha}|${c.head.version}|${assignment.get(c.bullet)}`;
    const g = groups.get(key) ?? { sha: c.head.sha, version: c.head.version, filed: assignment.get(c.bullet), count: 0 };
    g.count++;
    groups.set(key, g);
  }
  return [...groups.values()];
}

/**
 * The entry text, every number and list filled from the run's own data (never hand-typed).
 *
 * `filledCount`: version sections that received at least one entry (a placeholder section is not one).
 * `unchangedLines`: how many leading lines of the file are byte-identical before and after, so the claim
 * about stale `CHANGELOG.md:<line>` cites names the lines it does NOT cover. `history`: the untouched
 * section's heading date against the commit that FIRST set SKILLS_VERSION anywhere in history
 * (`firstEver`, which can sit on a merged side branch) and the first-parent commit where it first appears
 * (`firstParent`) — the plan review found that the first-parent view alone misdates 1.0.0.
 */
export function renderEntry({
  date,
  bulletCount,
  filledCount,
  overrideCount,
  stale,
  removedHeadings,
  placeholderVersions,
  dropped,
  history,
  unchangedLines,
  positional,
  outOfScope,
}) {
  const ghosts = stale.filter((s) => s.kind === "ghost");
  const byFiled = new Map();
  for (const g of ghosts) {
    if (!byFiled.has(g.filed)) byFiled.set(g.filed, new Set());
    byFiled.get(g.filed).add(g.names);
  }
  const ghostPairs = [...byFiled.entries()]
    .sort((a, b) => cmpSemver(a[0], b[0]))
    .map(([filed, names]) => `${[...names].sort(cmpSemver).join(", ")} (filed under ${filed})`);
  const others = stale.filter((s) => s.kind !== "ghost").map((s) => `an entry naming ${s.names} is filed under ${s.filed}`);
  const parts = [
    `- ${date}: **\`CHANGELOG.md\` is cut into one section per \`SKILLS_VERSION\` that existed on \`main\`, built from git history** (no \`SKILLS_VERSION\` bump: only this file and \`.dev/**\` change).`,
    `pharn-cli installs the tip of \`main\` and \`pharn update\` links here, so every bump on \`main\` is a release, and one \`[Unreleased]\` block could not say what changed in a given version.`,
    `The ${bulletCount} entries that sat under \`[Unreleased]\` and \`[5.0.0]\` were moved byte-for-byte into ${filledCount} version sections by \`.dev/features/changelog-sectioning/sectionize.mjs\`, which files each entry under the version whose bump window introduced it (\`git log --first-parent -S\`, last introduction wins); ${overrideCount} needed a reviewed override, and each is listed with its evidence in \`.dev/features/changelog-sectioning/MIGRATION.md\`.`,
    `**No entry text was edited, so some entries still name a version they are not filed under:** entries naming ${ghostPairs.join("; ")} — none of which existed on \`main\` — and ${others.join("; ")}.`,
  ];
  if (positional && positional.candidates.length)
    parts.push(
      `For the same reason, ${positional.candidates.length} entries still say "above" or "below"; where that points at another entry it was written for the old layout, and at least ${positional.confirmed.length} now point the wrong way (all are listed in \`MIGRATION.md\`).`
    );
  for (const o of outOfScope ?? [])
    parts.push(
      `${o.count === 1 ? "One entry" : `${o.count} entries`} that ${o.count === 1 ? "reaches" : "reach"} \`main\` in \`${short(o.sha)}\`, the first-parent commit where \`SKILLS_VERSION\` ${o.version} first appears, ${o.count === 1 ? "is" : "are"} filed under \`[${o.filed}]\` by a reviewed override, because \`[${o.version}]\` is kept byte-for-byte (the evidence is in \`MIGRATION.md\`).`
    );
  if (removedHeadings.length)
    parts.push(`The ${removedHeadings.map((h) => `\`${h}\``).join(", ")} heading is gone: that version never existed on \`main\`.`);
  if (placeholderVersions.length)
    parts.push(
      `${placeholderVersions.map((v) => `\`[${v}]\``).join(", ")} keeps a section with a one-line placeholder, because it was on \`main\` and therefore installable.`
    );
  if (dropped.length)
    parts.push(
      `One line was dropped: a committed merge-conflict marker (\`${dropped[0].slice(0, 22).trimEnd()} …\`) that sat between two entries.`
    );
  const h = history;
  const onBranch =
    h.firstEver.sha !== h.firstParent.sha
      ? `, on a branch that reached \`main\` at \`${short(h.firstParent.sha)}\` (${h.firstParent.date})`
      : "";
  parts.push(
    `\`[${h.version}]\` is unchanged. Its heading date (${h.headingDate}) ${h.headingDate === h.firstEver.date ? "is the date" : "differs from the date"} \`${short(h.firstEver.sha)}\` first set \`SKILLS_VERSION\` to ${h.firstEver.value}${onBranch}. No git tag or GitHub release was cut.`,
    `Every \`CHANGELOG.md:<line>\` cite past line ${unchangedLines} elsewhere in the repo now points at moved text; the one outside \`.dev/features/\` (\`pharn/floor/gate-run-core.mjs:15\`) was already stale and is deferred to the next product-surface change.`,
    `The \`[Unreleased]\` intro comment and \`CLAUDE.md\` still route a new entry into \`[Unreleased]\`; giving each bump its own section is the follow-up \`changelog-per-pr\`.`
  );
  return parts.join(" ");
}

// ── The report ──────────────────────────────────────────────────────────────────────────────────────

/** A back-tick fence strictly longer than any back-tick run in `body` (min 3), so quoted text stays inert. */
export function fenceFor(body) {
  const longest = Math.max(0, ...[...body.matchAll(/`+/g)].map((m) => m[0].length));
  return "`".repeat(Math.max(3, longest + 1));
}

/** A fenced `text` block. Rows are trimmed: prettier strips trailing space inside a fence (measured). */
function block(lines) {
  const body = lines.map((l) => l.trimEnd()).join("\n");
  const f = fenceFor(body);
  return `${f}text\n${body}\n${f}`;
}

const pad = (s, n) => String(s).padEnd(n);

/**
 * MIGRATION.md. Tabular data sits in fenced `text` blocks (prettier and markdownlint leave them alone, and
 * a `|` inside a probe cannot break a table); probes are repo text, rendered as DATA inside those fences.
 */
export function renderReport(d) {
  const L = [];
  L.push("# MIGRATION — changelog-sectioning", "");
  L.push(
    "<!-- GENERATED by .dev/features/changelog-sectioning/sectionize.mjs --write. A record of one run over one pinned SHA; `--verify` against that SHA re-renders this file and CHANGELOG.md and requires both byte-identical. -->",
    ""
  );
  L.push(
    `- Pinned input: \`${d.sha}\`, resolved once at run time. \`main\` is a mutable alias, so this SHA, not a ref name, binds the report.`
  );
  L.push(`- \`SKILLS_VERSION\` at that SHA: \`${d.skillsVersion}\`.`);
  L.push(
    `- Bullets migrated: ${d.classified.length}. Sections generated: ${d.sectionCount} (${d.filledCount} hold entries; ${d.sectionCount - d.filledCount} hold only a placeholder). Overrides applied: ${d.overrides.length}.`
  );
  const tally = STATUSES.map((s) => `${s} ${d.classified.filter((c) => c.status === s).length}`).join(" · ");
  L.push(`- Status tally (every member of the closed set, zeros included): ${tally}.`);
  const forms = Object.keys(MARKER_FORMS)
    .map((f) => `${f} ${d.classified.reduce((n, c) => n + c.markers.filter((m) => m.form === f).length, 0)}`)
    .join(" · ");
  L.push(`- Markers read, by form (\`MARKER_FORMS\`, zeros included): ${forms}.`);
  const unassigned = d.classified.filter((c) => !d.assignment.has(c.bullet)).length;
  L.push(`- Unassigned bullets: ${unassigned}.`, "");

  L.push("## Invariants", "");
  for (const r of d.invariants) L.push(`- ${r.ok ? "GREEN" : "RED"} \`${r.id}\`${r.detail ? ` — ${r.detail}` : ""}`);
  L.push("");

  L.push("## Version table", "");
  L.push(
    "Every `SKILLS_VERSION` value on the pinned SHA's first-parent history, oldest first. `bullets` counts the entries filed under it.",
    ""
  );
  const vrows = [`${pad("version", 9)} ${pad("first", 8)} ${pad("date", 11)} ${pad("bullets", 8)} notes`];
  for (const v of d.table.versions) {
    const notes = [];
    if (v.reverted) notes.push(`REVERTED by ${short(v.reverted.sha)} on ${v.reverted.date}`);
    for (const r of d.table.resets.filter((x) => x.version === v.version)) notes.push(`re-set at ${short(r.sha)} (not a new version)`);
    if (d.untouched.includes(v.version)) notes.push("UNTOUCHED section, kept verbatim");
    if (d.placeholders.has(v.version)) notes.push("placeholder");
    const n = [...d.assignment.values()].filter((x) => x === v.version).length;
    vrows.push(`${pad(v.version, 9)} ${pad(short(v.sha), 8)} ${pad(v.date, 11)} ${pad(n, 8)} ${notes.join("; ")}`);
  }
  L.push(block(vrows), "");

  L.push("## Ghost versions (named in entry text, never on main)", "");
  const ghosts = d.stale.filter((s) => s.kind === "ghost");
  if (ghosts.length === 0) L.push("None.");
  for (const g of ghosts) L.push(`- Text names \`${g.names}\`, shipped as \`${g.filed}\` (entry at input line ${g.line}).`);
  for (const h of d.removedHeadings)
    L.push(
      `- The input heading \`${h}\` is removed: that version is not in the table. Its entries are filed by the same rule as every other entry.`
    );
  L.push("");

  L.push("## Other stale version text left in entries", "");
  const others = d.stale.filter((s) => s.kind !== "ghost");
  if (others.length === 0) L.push("None.");
  for (const s of others)
    L.push(
      `- Input line ${s.line}: the text names \`${s.names}\`, and the entry is filed under \`${s.filed}\`. The text is not edited (a relocation never edits an entry).`
    );
  L.push("");

  L.push('## Positional references ("above" / "below")', "");
  L.push(
    `${d.positional.candidates.length} migrated entries use "above" or "below". They were written for the old layout, so one that points at another entry may now point the wrong way. The references below marked CONFIRMED were resolved by review and are CHECKED by the script (right in the old order, wrong in the new one). The rest are listed unverified; many point inside their own entry.`,
    ""
  );
  const confirmedRows = d.positional.confirmed.map(
    (c) =>
      `CONFIRMED  line ${c.bullet.line} (filed ${d.assignment.get(c.bullet)}) says "${c.phrase}" -> line ${c.referent.line} (filed ${d.assignment.get(c.referent)}), which now sits ${c.word === "above" ? "below" : "above"} it`
  );
  const confirmedSet = new Set(d.positional.confirmed.map((c) => c.bullet));
  const restRows = d.positional.candidates
    .filter((b) => !confirmedSet.has(b))
    .map((b) => {
      const m = /[^.\n]{0,50}\b(?:above|below)\b[^.\n]{0,30}/.exec(b.text);
      return `unverified line ${b.line} (filed ${d.assignment.get(b)}): ${m ? m[0].trim() : ""}`;
    });
  L.push(block([...confirmedRows, ...restRows]), "");

  L.push("## SKILLS_VERSION mentions that no marker form reads", "");
  L.push(
    "Every `SKILLS_VERSION` followed within 40 characters by a version token that none of `MARKER_FORMS` matches. They are listed so a new spelling of a real marker is visible, not silently ignored.",
    ""
  );
  const unreadRows = d.classified.flatMap((c) => d.unread.get(c.bullet).map((u) => `line ${c.bullet.line}: ${u}`));
  L.push(unreadRows.length ? block(unreadRows) : "None.", "");

  L.push("## Entries introduced by a commit that did not change SKILLS_VERSION", "");
  const noBump = d.classified.filter((c) => c.head.sha && !d.bumpShas.has(c.head.sha));
  L.push(
    `${noBump.length} entries. Each is filed under the NEXT bump. Its bytes were installable under the previous \`SKILLS_VERSION\` label until that bump.`,
    ""
  );
  if (noBump.length)
    L.push(
      block(noBump.map((c) => `line ${c.bullet.line}: introduced at ${short(c.head.sha)}, filed under ${d.assignment.get(c.bullet)}`)),
      ""
    );

  L.push("## Overrides", "");
  if (d.overrides.length === 0) L.push("None.");
  for (const o of d.overrides) {
    const c = d.classified.find((x) => x.probe === o.probe);
    const tail = c.tail && c.tail.sha ? `${short(c.tail.sha)} → ${c.tail.version ?? "Unreleased"}` : (c.tail?.skip ?? "-");
    const marker = `${c.marker.kind}${c.marker.names ? ` (${[].concat(c.marker.names).join(", ")})` : c.marker.version ? ` (${c.marker.version})` : ""}`;
    // The reason is free text from the inputs file: it is quoted inside a fence as DATA, never as markdown.
    L.push(
      `- Input line ${c.bullet.line}, **${o.status}** → filed under \`${o.version}\`. Computed: head ${c.head.sha ? short(c.head.sha) : "-"} → ${c.head.version ?? "Unreleased"}; tail ${tail}; marker ${marker}. Evidence \`${o.evidence.sha}\`:`,
      "",
      block([o.evidence.reason]),
      ""
    );
  }
  if (d.overrides.length === 0) L.push("");

  L.push("## Placeholders", "");
  if (d.placeholders.size === 0) L.push("None.", "");
  for (const [v, line] of d.placeholders) L.push(`- \`${v}\`:`, "", block([line]), "");

  L.push("## Dropped lines", "");
  for (const x of d.dropped) L.push(`- Input line ${x.line}:`, "", block([x.text]), "");
  if (d.dropped.length === 0) L.push("None.", "");

  L.push("## Head/tail commit disagreements that map to the same version (information only)", "");
  const infos = d.classified.filter(
    (c) => c.tail && c.tail.sha && c.head.sha && c.tail.sha !== c.head.sha && c.tail.version === c.head.version
  );
  if (infos.length === 0) L.push("None.");
  for (const c of infos)
    L.push(
      `- Input line ${c.bullet.line}: head ${short(c.head.sha)}, tail ${short(c.tail.sha)}, both → ${c.head.version ?? "Unreleased"}.`
    );
  L.push("");

  L.push("## Reported, not changed", "");
  const h = d.history;
  L.push(
    `- \`[${h.version}]\` has heading date ${h.headingDate}. \`SKILLS_VERSION\` was first set anywhere in history by \`${short(h.firstEver.sha)}\` on ${h.firstEver.date} (value \`${h.firstEver.value}\`); on \`main\`'s first-parent history it first appears at \`${short(h.firstParent.sha)}\` on ${h.firstParent.date}, the date the version table uses. The heading date ${h.headingDate === h.firstEver.date ? "matches" : "does NOT match"} the commit that set the value. The section is out of scope and kept byte-for-byte.`,
    ""
  );

  L.push("## Per-bullet assignment", "");
  L.push(
    "`line` is the input line. `marker` is the marker class and its B. `head` / `tail` are the introducing commits' short SHAs, or the tail's skip reason.",
    ""
  );
  const rows = [
    `${pad("line", 5)} ${pad("status", 12)} ${pad("filed", 10)} ${pad("marker", 18)} ${pad("head", 8)} ${pad("tail", 10)} probe`,
  ];
  for (const c of d.classified) {
    const mk = c.marker.kind === "none" ? "-" : `${c.marker.kind}:${[].concat(c.marker.version ?? c.marker.names).join("+")}`;
    const tail = c.tail ? (c.tail.sha ? short(c.tail.sha) : c.tail.skip) : "-";
    rows.push(
      `${pad(c.bullet.line, 5)} ${pad(c.status, 12)} ${pad(d.assignment.get(c.bullet), 10)} ${pad(mk, 18)} ${pad(c.head.sha ? short(c.head.sha) : "-", 8)} ${pad(tail, 10)} ${c.probe.slice(0, 60).replace(/\n/g, "⏎")}`
    );
  }
  L.push(block(rows), "");

  L.push("## Bounds (P0)", "");
  L.push(
    "- The assignment is deterministic from git history, and it is ADVISORY as a statement of truth: the probes see only each entry's first and last lines. Marker agreement corroborates it; it does not prove it."
  );
  L.push(
    "- The byte-preservation invariants are checked on the rendered output for this one pinned SHA. Nothing re-checks them after `main` moves."
  );
  L.push(
    "- An entry edited during a LATER version keeps that later text under the version it is filed under: the probes read only an entry's first and last lines. Known instances, from the plan's adversarial review (examples, not a closed list): input lines 1588 (a 2.4.2 rewrite of its test counts), 1562 and 1642 (middle edits)."
  );
  L.push(
    "- A version section means that value was on `main`'s first-parent history from that committer date. No git tag or GitHub release is implied."
  );
  return L.join("\n") + "\n";
}
