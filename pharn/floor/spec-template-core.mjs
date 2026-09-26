// pharn/floor/spec-template-core.mjs — the SPEC-template rules, as pure functions over a parsed SPEC.
//
// WHY A SEPARATE FILE (P3 — one reason to change per file). check-spec.mjs changes when ARCHITECTURE §6's spec
// contract changes: the state enum, the spec_id identity, the content-hash pin. THIS file changes when the SPEC
// TEMPLATE changes: its sections, the acceptance-criteria grammar, the registry of template ids, and what a
// template must contain before it can be pinned (validateTemplate). check-spec.mjs imports it and turns its
// findings and refusals into REDs and exits; nothing else imports it. The rules are DEFINED by
// pharn/pharn-contracts/spec-template.md; the constants below are the one ENFORCING copy, and this header cites
// rather than restates them (P4).
//
// NON-LLM, dependency-free (Node stdlib only). No network, no child_process, no eval, no dynamic import, no
// filesystem call, and no side effect at import time. Every export is a pure function or a frozen constant: the
// project template's file checks (lstat, directory listing, O_NOFOLLOW read) live in check-spec.mjs, which reads
// files; this file only says what a template's TEXT must contain.
//
// WHEN THE RULES APPLY. Only to a SPEC whose frontmatter carries the key `spec_template` — see isTemplated().
// The switch is a RAW line test over the frontmatter block, not "the field parser produced the key": a key line
// the parser drops (it holds a lone CR, U+2028 or U+2029, which a `.`-based field regex does not match) still
// selects the rules, and rule 7 then REDs the unreadable value. Before this was a raw test, such a SPEC visibly
// carried the key and was validated on the legacy path (REVIEW finding R3). A SPEC with no line starting
// `spec_template:` is LEGACY and never reaches this file.
//
// THE TEMPLATE RULES (an open form — L47: retracted by "the template rules", never re-counted as a new
// number every time one is added), one RED kind each: `section`, `ac`, `clarification`, `out-of-scope`,
// `optional-section`, `guidance`, `template`, `spec-kind` (6.18.0), `quick` (6.23.0). All are presence /
// regex / count / Map-membership tests over STRUCTURE — never over what
// the intent means (P5, P2). A finding names a FILE LINE NUMBER, an AC id, or a value's LENGTH, never the text on
// a line: the SPEC body is untrusted DATA, and a RED must not become a channel for it.
//
// Honest bounds (P0), each also stated in the contract:
//   - OPT-IN. A SPEC with no `spec_template` line bypasses every template rule. /pharn-spec writing the key is command
//     prose — advisory. A near-miss spelling (`spec-template:`, `Spec_Template:`) is also legacy.
//   - PHRASED, NOT TESTED. A valid AC grammar means each criterion is PHRASED testably. It never means a test
//     exists, runs, or passes, nor that the Then is observable on the public surface (advisory).
//   - WHICH HEADINGS EXIST. A `##` line counts as a section only when it is not inside a block that a renderer
//     would show as something else: a fenced code block, an HTML comment, or a <pre>/<script>/<style>/<textarea>
//     block, each opened at COLUMN 0 (see spanned()). Openers at column 0 are the ones that can hide a column-0
//     heading: a block opened inside a list item ends when a column-0 line ends the item. Not modeled, each named:
//     an opener indented 1–3 columns at the top level (fail-open: its hidden headings still count), HTML blocks
//     that end at a blank line (CommonMark types 6 and 7 — fail-open), and setext headings (fail-closed: the
//     section reads as missing). There is no reference-parser differential behind this model (named residual
//     `spec-ac-grammar-differential`), so "the checker sees what a renderer shows" is the INTENT, tested only
//     against the fixtures in check-spec.test.mjs.
//   - A LINE GRAMMAR FOR THE CRITERIA. Inside `## Acceptance Criteria` every line is blank, a column-0 item start,
//     or a continuation indented by two spaces or a tab. That is stricter than CommonMark (an unindented lazy
//     continuation REDs — fail-closed). A bold `**AC-<n>**` anywhere but an item start is a RED (the id count).
//   - VERIFY LINES are recognised by one regex (VERIFY_LIKE_RE): a continuation whose text starts with `verify`
//     and a colon, after an optional list marker and optional `*` / `_` / backtick marks. A verify level written
//     any other way — mid-line, say — is not counted. The converse, stated because it is a trap (fail-closed):
//     ANY such line inside an item counts, including one inside a code block or a prose sub-bullet
//     (`verify: true` in a YAML example), so a criterion that needs such a line must rephrase it.
//   - PLACEHOLDERS ARE NOT DETECTED. An unfilled `<state>` in an AC passes; only the verify level and the
//     `spec_template` value have a closed shape an unfilled placeholder fails.
//   - MARKERS are counted by one regex: NEED/NEEDS, any case, with a space, `_` or `-` between the words.
//   - PROVENANCE ONLY. `spec_template` records which template a SPEC came from and that template's digest at the
//     time. Nothing compares the digest with the template file, by design: a template edit must never RED an
//     already-Approved spec. So rule 7 never reads a template file, and the `project` id is a STATIC registry
//     member: deleting the project template never REDs a SPEC pinned to it. The converse is stated too: a
//     hand-typed `project@sha256:<64 hex>` passes rule 7, because the validator gates what check-spec PRINTS,
//     never what a SPEC declares.
//   - A VALIDATED TEMPLATE HAS A MINIMUM SHAPE. validateTemplate() refuses a template that could not produce a
//     templated SPEC at all (a required heading missing or hidden, no example criterion, no Out-of-scope label, no
//     `spec_template:` line). It never proves a faithful fill will be GREEN: extra prose in the template's
//     Acceptance Criteria section passes here and REDs rule 2 once filled.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { matchFrontmatter, stripBom } from "./frontmatter-core.mjs";

export const TEMPLATE_KEY = "spec_template";

/** `spec_kind` (6.18.0): what the SPEC's increment IS, for /pharn-test (pharn-contracts/spec-template.md,
 *  "`spec_kind`"). Absent means `feature`: /pharn-test writes the AC tests and requires them red before the build.
 *  `test-infra` is the increment that sets the test runner up, which cannot have failing tests first, so /pharn-test
 *  records a BOOTSTRAP lock instead — weaker, and the lock says so.
 *
 *  ONE READING (grill G9): the key is read from the RAW frontmatter lines that start `spec_kind:` exactly, never
 *  through a field parser, so what counts as the kind and what check-spec.mjs's pin covers cannot diverge. A
 *  near-miss spelling (`spec_kind :`, `Spec_Kind:`) is not the key: the SPEC is `feature`, the stricter mode. */
export const SPEC_KIND_KEY = "spec_kind";
export const SPEC_KINDS = Object.freeze(["feature", "test-infra", "quick"]);
const SPEC_KIND_LINE_RE = /^spec_kind:/;

/** The `SPEC_KINDS` members `/pharn-test` treats test-first — it writes their AC tests and requires them
 *  RED before the build. `SPEC_KINDS` is exactly `TEST_FIRST_KINDS ∪ {test-infra}`, disjoint (a fourth kind
 *  fails a partition test until it is classified into one or the other, 6.23.0). */
export const TEST_FIRST_KINDS = Object.freeze(["feature", "quick"]);

/** The `spec_kind: quick` value, and the bounds a quick SPEC's Acceptance Criteria must hold to (6.23.0,
 *  the maintainer's 2026-09-25 decision — see `pharn/pharn-contracts/spec-template.md`, "Rule 9"). Exported
 *  once (L35), so the constants have exactly one owner. `/pharn-ship --quick` trades checks for cost: it
 *  keeps test-first evidence and drops the regression check, so what it may carry is a change whose
 *  evidence is a FEW FAST tests — three criteria bound the change a human approves at GATE 1, and an `e2e`
 *  criterion would need its test written and run red at `/pharn-test` through the end-to-end runner (the
 *  slowest level, with a runner of its own), which the quick bound keeps out. It does NOT keep the project's
 *  own e2e gates out: `/pharn-verify` still discovers and runs them in a quick run. A larger or end-to-end
 *  change takes the full pipeline. */
export const QUICK_KIND = "quick";
export const QUICK_MAX_ACS = 3;
export const QUICK_LEVELS = Object.freeze(["unit", "integration"]);

/** The raw frontmatter lines starting `spec_kind:`, a trailing CR removed. check-spec.mjs hashes exactly these
 *  (grill G2: the pin covers the kind), so flipping it after approval is drift. */
export function specKindLines(rawFrontmatter) {
  return String(rawFrontmatter)
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => SPEC_KIND_LINE_RE.test(l));
}

/** Does the SPEC body OPEN with a `spec_kind:` line? Tested after the line-ending fold the pin applies (`\r\n` → `\n`,
 *  check-spec.mjs pinHash), with the same SPEC_KIND_LINE_RE specKindLines uses, and no `m` flag, so only the body's
 *  first line counts. Such a body pins exactly like the same line in the frontmatter (the argument is in check-spec.mjs's
 *  pinHash comment and pharn-contracts/spec-template.md, "`spec_kind`"), so check-spec.mjs REDs it (`kind-in-body`) and
 *  specAcceptanceCriteria reports the kind as unusable. The fold cannot change the answer (the prefix holds no CR or
 *  LF); it is applied so the predicate reads exactly the string the pin hashes. */
export function kindLineOpensBody(body) {
  return SPEC_KIND_LINE_RE.test(String(body).replace(/\r\n/g, "\n"));
}

/** The SPEC's kind: `feature` with no `spec_kind:` line, the member its one line names, else `null` (two lines, or
 *  a value outside SPEC_KINDS once spaces and tabs are trimmed — a stray CR, U+2028 or quote included). */
export function specKindOf(rawFrontmatter) {
  const lines = specKindLines(rawFrontmatter);
  if (lines.length === 0) return "feature";
  if (lines.length > 1) return null;
  const v = lines[0].slice(SPEC_KIND_KEY.length + 1).replace(/^[ \t]+|[ \t]+$/g, "");
  return SPEC_KINDS.includes(v) ? v : null;
}
// Exactly `spec_template:` at a line start — the one spelling the field parser reads, so `spec_template :` is a
// near-miss (legacy), like `spec-template:`. `m`: ^ also matches after \r, U+2028 and U+2029.
const TEMPLATE_KEY_LINE_RE = /^spec_template:/m;

// id -> { rel, shipped }. `rel` is relative to THIS file (never the cwd), so the lookup resolves the same way in
// this repo and in an install, where pharn/floor/ sits at <project-root>/pharn/floor/ beside pharn/pharn-contracts/.
// A Map, not a plain object: `__proto__` / `constructor` must be unknown ids, not inherited members (PHARN's own
// build-loop lesson L15). This is the ONLY place an id or a template path is written (L41).
//
// `project` is the project's OWN template at ONE fixed path, the project root. It is fixed, not configurable, and
// .claude/hooks/protect-trusted-paths.cjs denies Write/Edit/MultiEdit/NotebookEdit to it by path: a template's
// guidance comments are instructions /pharn-spec follows, so a path read from an unprotected config would let a
// build agent point every future /pharn-spec at a file it wrote (P2). The hook's literal is a deliberate second
// copy (the hook must not import the floor); check-spec.test.mjs pins the two equal. The `pharn-` id prefix is
// reserved for SHIPPED templates, and a test holds `id.startsWith("pharn-") === shipped` for every entry.
//
// HERE is this module's REAL path (Node resolves the main module's symlinks), so a symlinked pharn/ or pharn/floor/
// would move projectRoot() to the link target's grandparent, where the project's hook does not guard and where the
// project's own template is not. check-spec.mjs therefore REFUSES (`symlinked-root`) when the root it was invoked
// through is not this real root, rather than silently reading another directory (REVIEW finding F1).
const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = new Map([
  ["pharn-default", { rel: join("..", "pharn-contracts", "templates", "spec-template.md"), shipped: true }],
  ["project", { rel: join("..", "..", "pharn.spec-template.md"), shipped: false }],
]);

/** The id of the project's own template (a static registry member, whether or not its file exists). */
export const PROJECT_TEMPLATE_ID = "project";

/** Absolute path of a KNOWN template id, or null for any other string (own-key membership, L15). */
export function templatePath(id) {
  return TEMPLATES.has(id) ? join(HERE, TEMPLATES.get(id).rel) : null;
}

/** Is `id` a known template that PHARN ships (as opposed to one the project supplies)? */
export function isShippedTemplate(id) {
  return TEMPLATES.has(id) && TEMPLATES.get(id).shipped;
}

/** The project root the registry's paths are resolved under: two levels above pharn/floor/. */
export function projectRoot() {
  return join(HERE, "..", "..");
}

/**
 * The comparison key for a file NAME: NFC, then full case folding (toUpperCase().toLowerCase(), not a bare
 * toLowerCase(), which is only simple case mapping). The same fold protect-trusted-paths.cjs's toKey applies, minus
 * its Windows trailing dot/space strip (on POSIX `pharn.spec-template.md.` is a different file, never read).
 */
export function foldName(name) {
  return String(name).normalize("NFC").toUpperCase().toLowerCase();
}

/**
 * Why a template is refused, as ONE closed enumeration (L29) — the validator produces five, check-spec.mjs the
 * file checks. The contract's refusal table cites these codes.
 */
export const TEMPLATE_REFUSALS = Object.freeze([
  "frontmatter",
  "template-key",
  "section",
  "ac-example",
  "out-of-scope-label",
  "absent",
  "outside-root",
  "symlinked-root",
  "name-case",
  "symlink",
  "not-regular-file",
  "unreadable",
]);

/** The known template ids, in registry order. */
export function knownTemplateIds() {
  return [...TEMPLATES.keys()];
}

/** The section the template adds to check-spec.mjs's base four. */
export const TEMPLATE_EXTRA_REQUIRED = Object.freeze(["assumptions"]);
const TEMPLATE_OPTIONAL = ["scenarios", "data", "open questions", "success metrics"];
const VERIFY_LEVELS = ["unit", "integration", "e2e"];
const MAX_MARKERS = 3;
const SPEC_TEMPLATE_MAX = 256; // longer than any <id>@sha256:<64-hex> the registry can hold; a bound, not a shape
const SPEC_TEMPLATE_RE = /^([a-z0-9]+(?:-[a-z0-9]+)*)@sha256:([0-9a-f]{64})$/;

/** An ATX h2 heading — the ONE heading regex; check-spec.mjs's headingsOf imports it too. */
export const H2_RE = /^##\s+(.+?)\s*$/;

// An AC item start: column 0, `- **AC-<n>**`, then whitespace or the end of the line. `<n>` takes no leading zero,
// because `AC-01` and `AC-1` would be two spellings of one id.
const AC_START_RE = /^- \*\*AC-([1-9][0-9]*)\*\*(?=[ \t]|$)/;
// Every bold AC id in the section. Their count must equal the item count, so an id anywhere but at an item start
// (inside a continuation, on an indented line, in a code span) is a RED rather than a silently merged item.
const AC_TOKEN_RE = /\*\*AC-[0-9]+\*\*/g;
const CONTINUATION_RE = /^(?: {2,}|\t)/; // an indented line inside the current AC item
// Anything that LOOKS like a verify line (the closure — PHARN's own build-loop lesson L36): after the indent, an
// optional list marker, optional emphasis / code marks, then `verify` and a colon.
const VERIFY_LIKE_RE = /^[ \t]+(?:(?:[-*+]|[0-9]+[.)])[ \t]+)?[*_`]*verify[*_`]*[ \t]*:/i;
const VERIFY_RE = /^[ \t]+- verify:[ \t]*(\S+)[ \t]*$/; // the one accepted spelling; the level is checked next
const MARKER_RE = /\[\s*NEEDS?[\s_-]*CLARIFICATION/gi; // the clarification marker, and the variants it admits
const GUIDANCE_RE = /<!--\s*pharn:guidance/i; // the template's guidance-comment sentinel
const OUT_OF_SCOPE_RE = /^\*\*out of scope[^*]*\*\*(.*)$/i; // the label, legacy or `(non-goals)`, + its tail
const LIST_ENTRY_RE = /^[ \t]*(?:[-*+]|[0-9]+[.)])[ \t]+\S/; // a list line with content
// Column-0 block openers that can hide a column-0 heading (see the header's WHICH HEADINGS EXIST bound).
const FENCE_OPEN_RE = /^(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_RE = /^( {0,3})(`{3,}|~{3,})[ \t]*$/;
const COMMENT_OPEN_RE = /^<!--/;
const RAW_BLOCK_OPEN_RE = /^<(pre|script|style|textarea)(?=[\s>]|$)/i;

/** Does this SPEC opt in to the template rules? A raw line test over the frontmatter block (see the header). */
export function isTemplated(fm, rawFrontmatter) {
  return Object.hasOwn(fm, TEMPLATE_KEY) || TEMPLATE_KEY_LINE_RE.test(rawFrontmatter);
}

const isBlank = (text) => /^[ \t]*$/.test(text);
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// A string with no control characters and a bounded length — composed IN FRONT of an anchored regex, never
// replaced by it (PHARN's own build-loop lesson L14).
function cleanScalar(v, maxLen) {
  if (typeof v !== "string" || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

// For each body line: -1 when it is outside every column-0 block, else the index of the line that opened the
// block it sits in. A fence closes on a line of the same character, at least as long, indented at most three
// columns (CommonMark's rule for a top-level fence); a comment closes at the first `-->`; a raw block at its end
// tag. An unclosed block runs to the end of the body, exactly as a renderer shows it.
//
// The end conditions are CommonMark's HTML-block end conditions, as literal substring tests: type 2 (a comment)
// ends at a line containing `-->`, type 1 at `</pre>` / `</script>` / `</style>` / `</textarea>`. This is NOT an
// HTML sanitizer and must not be read as one: `--!>`, which a browser's HTML parser also accepts as a comment
// end, deliberately does NOT close the block, because CommonMark keeps such a block open — so the headings after
// it are raw HTML text, not rendered headings. Accepting it would un-hide headings a renderer hides (fail-open).
// Pinned by a test. (A CodeQL `js/bad-tag-filter` alert on the earlier `/-->/` regex was that sanitizer rule
// applied to a structural checker; the behaviour it asked for is the wrong one here.)
function spanned(lines) {
  const inside = new Array(lines.length).fill(-1);
  let open = null;
  lines.forEach((text, i) => {
    if (open) {
      inside[i] = open.line;
      if (open.fence) {
        const c = text.match(FENCE_CLOSE_RE);
        if (c && c[2][0] === open.fence[0] && c[2].length >= open.fence.length) open = null;
      } else if (open.end(text)) {
        open = null;
      }
      return;
    }
    const f = text.match(FENCE_OPEN_RE);
    // A backtick fence's info string may not contain a backtick (CommonMark), so ```x``` is inline code, not a fence.
    if (f && !(f[1][0] === "`" && f[2].includes("`"))) {
      open = { line: i, fence: f[1] };
    } else if (COMMENT_OPEN_RE.test(text)) {
      // `<!-->` and `<!--->` close on their own line: CommonMark's closer may overlap the opener, so search from 2.
      if (text.indexOf("-->", 2) === -1) open = { line: i, end: (t) => t.includes("-->") };
    } else {
      const r = text.match(RAW_BLOCK_OPEN_RE);
      if (r) {
        const closer = `</${r[1].toLowerCase()}>`;
        const end = (t) => t.toLowerCase().includes(closer);
        if (!end(text.slice(r[0].length))) open = { line: i, end };
      }
    }
  });
  return inside;
}

// The body as sections: each VISIBLE `##` heading with the lines under it up to the next one. A `##` line inside a
// column-0 block is content, and is also reported in `hidden`, so rule 1 can say which heading a renderer would not
// show. Every line carries its FILE line number (P2 — a RED points at a line, never quotes it), and `inBlock`: true
// when it sits inside a column-0 block. checkTemplate ignores `inBlock`; validateTemplate skips such lines.
function sectionsOf(body, firstLine) {
  const lines = body.split(/\r?\n/);
  const inside = spanned(lines);
  const sections = [];
  const hidden = [];
  let cur = null;
  lines.forEach((text, i) => {
    const hm = text.match(H2_RE);
    if (hm && inside[i] === -1) {
      cur = { name: hm[1].toLowerCase(), line: firstLine + i, lines: [] };
      sections.push(cur);
      return;
    }
    if (hm) hidden.push({ name: hm[1].toLowerCase(), line: firstLine + i, opener: firstLine + inside[i] });
    if (cur) cur.lines.push({ n: firstLine + i, text, inBlock: inside[i] !== -1 });
  });
  return { sections, hidden };
}

// Are `words` present in `text` in this order, each as a whole word (case-sensitive)?
function inOrder(text, words) {
  let from = 0;
  for (const w of words) {
    const re = new RegExp(`\\b${w}\\b`, "g");
    re.lastIndex = from;
    const m = re.exec(text);
    if (!m) return false;
    from = m.index + w.length;
  }
  return true;
}

// The Acceptance Criteria ITEM PARSE — the one parser (6.17.0 extracted it from rule 2 so specAcceptanceCriteria()
// reads the SAME items check-spec.mjs checks; PHARN's own build-loop lesson L6 / the brief's "one parser").
// Returns the items (id, file line, raw lines), the bold-id token count, and the line numbers that are not part of
// any item (rule 2 REDs each).
function parseAcItems(sec) {
  const items = [];
  const strays = [];
  let tokens = 0;
  for (const { n, text } of sec.lines) {
    tokens += (text.match(AC_TOKEN_RE) || []).length;
    const start = text.match(AC_START_RE);
    if (start) {
      items.push({ id: start[1], n, lines: [text] });
    } else if (isBlank(text)) {
      if (items.length) items[items.length - 1].lines.push(text);
    } else if (items.length && CONTINUATION_RE.test(text)) {
      items[items.length - 1].lines.push(text);
    } else {
      strays.push(n);
    }
  }
  return { items, strays, tokens };
}

// An item's verify line(s) and the level they name: `level` is a VERIFY_LEVELS member only when there is exactly
// one verify-like line and it has the one accepted spelling; otherwise `null`.
function verifyOf(item) {
  const verify = item.lines.slice(1).filter((l) => VERIFY_LIKE_RE.test(l));
  const vm = verify.length === 1 ? verify[0].match(VERIFY_RE) : null;
  return { count: verify.length, level: vm && VERIFY_LEVELS.includes(vm[1]) ? vm[1] : null };
}

// Rule 2 — the Acceptance Criteria grammar. Pushes findings; returns the number of items parsed.
function checkAcceptanceCriteria(sec, out) {
  const { items, strays, tokens } = parseAcItems(sec);
  for (const n of strays) {
    // CLOSURE (L36): a column-0 paragraph, a `1.` / `*` / `+` item, a heading below h2, an item indented by one
    // space, or any text before the first item is not part of an AC item, so it is a RED, never absorbed.
    out.push(["ac", `line ${n}: not an AC item start (\`- **AC-<n>**\`), an indented continuation of one, or blank`]);
  }
  if (items.length === 0) {
    out.push(["ac", `\`## Acceptance Criteria\` (line ${sec.line}) holds no AC item — at least one \`- **AC-<n>**\` item is required`]);
    return 0;
  }
  if (tokens !== items.length) {
    out.push([
      "ac",
      `\`## Acceptance Criteria\` (line ${sec.line}) spells ${tokens} \`**AC-<n>**\` id(s) but starts ${items.length} item(s) — ` +
        `a bold AC id is reserved for a column-0 item start; refer to another criterion as plain AC-<n>`,
    ]);
  }
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) out.push(["ac", `line ${item.n}: AC-${item.id} is a duplicate id`]);
    seen.add(item.id);
    const verify = verifyOf(item);
    if (verify.count !== 1) {
      out.push([
        "ac",
        `line ${item.n}: AC-${item.id} has ${verify.count} verify line(s) — exactly one \`  - verify: <level>\` continuation is required`,
      ]);
    } else if (verify.level === null) {
      out.push([
        "ac",
        `line ${item.n}: AC-${item.id}'s verify line is not \`  - verify: <level>\` with level in {${VERIFY_LEVELS.join(", ")}}`,
      ]);
    }
    const text = item.lines.filter((l) => !VERIFY_LIKE_RE.test(l)).join("\n");
    if (!inOrder(text, ["Given", "When", "Then"])) {
      out.push(["ac", `line ${item.n}: AC-${item.id} does not read Given … When … Then, in that order (case-sensitive, whole words)`]);
    }
  }
  return items.length;
}

/**
 * A templated SPEC's Acceptance Criteria as DATA (6.17.0): each item's id (`AC-<n>`) and its `verify:` level, read
 * through the SAME item parser rule 2 checks with (parseAcItems / verifyOf) — so the ids this returns are the ids
 * check-spec.mjs counted, never a second reading of the section.
 *
 * Pure: the SPEC's full text in, no filesystem. A SPEC with no frontmatter, or without a `spec_template` line, is
 * LEGACY: `{templated: false, items: []}` — a legacy SPEC has no AC ids. A templated SPEC whose Acceptance Criteria
 * section is absent, hidden or duplicated yields `items: []` and `sections` ≠ 1, which check-spec.mjs REDs on its
 * own; a caller that needs ids must treat that as unusable rather than as "no criteria". An item whose verify line
 * is malformed carries `level: null`.
 *
 * @param {string} text  the SPEC.md source
 * `kind` is specKindOf() over the frontmatter: a `SPEC_KINDS` member (`feature`, `test-infra` or `quick`), or `null`
 * for an invalid value (a legacy SPEC reports `feature`: it has no AC ids either way). `kindInBody` is kindLineOpensBody() over the body (`false` with no
 * frontmatter): when it holds, a templated SPEC's `kind` is `null` too, because the approval pin cannot tell that body
 * from the same line in the frontmatter, so no AC mode may be read from it (6.20.7). A legacy SPEC keeps `feature`.
 *
 * @returns {{templated: boolean, kind: string|null, kindInBody: boolean, sections: number, items: {id: string, level: string|null, line: number}[]}}
 */
export function specAcceptanceCriteria(text) {
  const src = stripBom(String(text));
  const fmMatch = matchFrontmatter(src);
  const body = fmMatch ? src.slice(fmMatch[0].length) : "";
  const kindInBody = fmMatch ? kindLineOpensBody(body) : false;
  if (!fmMatch || !isTemplated({}, fmMatch[1])) return { templated: false, kind: "feature", kindInBody, sections: 0, items: [] };
  const kind = kindInBody ? null : specKindOf(fmMatch[1]);
  const firstLine = (fmMatch[0].match(/\n/g) || []).length + 1;
  const acs = sectionsOf(body, firstLine).sections.filter((s) => s.name === "acceptance criteria");
  if (acs.length !== 1) return { templated: true, kind, kindInBody, sections: acs.length, items: [] };
  const items = parseAcItems(acs[0]).items.map((it) => ({ id: `AC-${it.id}`, level: verifyOf(it).level, line: it.n }));
  return { templated: true, kind, kindInBody, sections: 1, items };
}

/**
 * THE one reading of a SPEC's AC mode — check-ac-tests.mjs `--spec` prints it, and /pharn-verify's AC gate
 * (ac-gate-core.mjs) imports it, so the CLI and the gate cannot disagree (L35). It lives here, beside the parser it
 * reads, because no floor module imports a `check-*.mjs` CLI. Precedence, fixed (grill G10): legacy 3 → invalid spec_kind 2 (or a
 * body that opens with a `spec_kind:` line, 6.20.7 — kindInBody) → no usable criteria 2 → test-infra 4 (a malformed level is 2) → templated 0. An unreadable file is the caller's (2).
 * @returns {{token: "LEGACY"|"UNUSABLE"|"BOOTSTRAP"|"TEMPLATED", code: number, line: string, items: {id: string, level: string|null}[], levels: string[]|null}}
 */
export function specVerdict(text) {
  const spec = specAcceptanceCriteria(text);
  const out = (token, code, line, levels = null) => ({
    token,
    code,
    line,
    items: spec.items.map((i) => ({ id: i.id, level: i.level })),
    levels,
  });
  if (!spec.templated) return out("LEGACY", 3, "LEGACY — the SPEC has no `spec_template`: no AC ids, so no AC-TESTS.md is written");
  if (spec.kind === null)
    return out(
      "UNUSABLE",
      2,
      spec.kindInBody
        ? "UNUSABLE — the SPEC's body opens with a `spec_kind:` line, which the approval pin cannot tell from the frontmatter key — run check-spec.mjs"
        : `UNUSABLE — the SPEC's \`spec_kind\` is not one of {${SPEC_KINDS.join(", ")}} — run check-spec.mjs`
    );
  if (spec.sections !== 1 || spec.items.length === 0)
    return out("UNUSABLE", 2, "UNUSABLE — the SPEC's `## Acceptance Criteria` is absent, duplicated or empty — run check-spec.mjs");
  if (spec.kind === "test-infra") {
    if (spec.items.some((i) => i.level === null))
      return out(
        "UNUSABLE",
        2,
        "UNUSABLE — a criterion's verify level is malformed, so the bootstrap levels are unknown — run check-spec.mjs"
      );
    const levels = [...new Set(spec.items.map((i) => i.level))].sort();
    return out("BOOTSTRAP", 4, `BOOTSTRAP — spec_kind: test-infra; no AC-TESTS.md; the lock records levels: ${levels.join(", ")}`, levels);
  }
  // Explicit, no fall-through (6.23.0): every other branch above has already returned, so `spec.kind` here is a
  // SPEC_KINDS member that is not `test-infra` — i.e. a TEST_FIRST_KINDS member, since SPEC_KINDS is exactly
  // TEST_FIRST_KINDS ∪ {test-infra}, disjoint (a partition test pins it). The throw is unreachable given that
  // invariant; it exists so a future kind added to SPEC_KINDS without a TEST_FIRST_KINDS/test-infra classification
  // fails loudly here instead of silently reading as TEMPLATED.
  if (!TEST_FIRST_KINDS.includes(spec.kind)) {
    throw new Error(`internal: spec_kind ${JSON.stringify(spec.kind)} is a SPEC_KINDS member outside TEST_FIRST_KINDS ∪ {test-infra}`);
  }
  return out(
    "TEMPLATED",
    0,
    `TEMPLATED — ${spec.items.length} AC(s): ${spec.items.map((i) => `${i.id} (${i.level ?? "malformed level"})`).join(", ")}`
  );
}

// Rule 4 — a non-goal under `## Scope`: a column-0 `**Out of scope…**` label followed by at least one entry, either
// on the label's own line or as a list line before the next column-0 `**` label or the section's end.
function hasOutOfScopeEntry(sec) {
  const lines = sec.lines;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.match(OUT_OF_SCOPE_RE);
    if (!m) continue;
    if (m[1].replace(/^[\s:]+/, "").trim() !== "") return true;
    for (let j = i + 1; j < lines.length && !lines[j].text.startsWith("**"); j++) {
      if (LIST_ENTRY_RE.test(lines[j].text)) return true;
    }
  }
  return false;
}

/**
 * The template rules (an open form — L47) over one parsed SPEC.
 * @param {{fm: object, raw: string, body: string, firstLine: number, baseRequired: string[]}} spec
 *   `firstLine` is the FILE line number of the body's first line; `baseRequired` is check-spec.mjs's base
 *   section set, which that checker already REDs by its own (legacy) loop. `raw` is the frontmatter block's text,
 *   which rule 8 reads (never the parsed `fm` — see SPEC_KIND_KEY).
 * @returns {{findings: {kind: string, detail: string}[], id: string, acCount: number, required: number}}
 */
export function checkTemplate({ fm, raw, body, firstLine, baseRequired }) {
  const out = [];
  const required = [...baseRequired, ...TEMPLATE_EXTRA_REQUIRED];
  const templateSections = [...required, ...TEMPLATE_OPTIONAL];
  const { sections, hidden } = sectionsOf(body, firstLine);
  const count = (name) => sections.filter((s) => s.name === name).length;
  const only = (name) => (count(name) === 1 ? sections.find((s) => s.name === name) : null);

  // Rule 1 (`section`). (a) A template heading a renderer would not show — inside a column-0 fence, comment or
  // raw block — is a RED naming both lines (REVIEW finding R1: before this, such a SPEC was GREEN while its
  // criteria were invisible). (b) The template's extra required sections must be visibly present; a MISSING base
  // section is already REDed by check-spec.mjs's legacy loop, so it is not reported twice. (c) Each template
  // section appears at most once, so every rule below reads ONE unambiguous body.
  for (const h of hidden) {
    // Only when the section has NO visible occurrence: a fenced example that quotes `## Scope` beside a real,
    // visible `## Scope` hides nothing a reader needs (REVIEW iteration 2, finding N1).
    if (templateSections.includes(h.name) && count(h.name) === 0) {
      out.push([
        "section",
        `line ${h.line}: \`## ${titleCase(h.name)}\` sits inside a block opened at line ${h.opener}, so a renderer shows no heading there`,
      ]);
    }
  }
  for (const name of TEMPLATE_EXTRA_REQUIRED) {
    if (count(name) === 0 && !hidden.some((h) => h.name === name)) {
      out.push(["section", `missing required \`## ${titleCase(name)}\` section (the spec-template requires it)`]);
    }
  }
  for (const name of templateSections) {
    if (count(name) > 1)
      out.push(["section", `\`## ${titleCase(name)}\` appears ${count(name)} times — a template section appears at most once`]);
  }

  // Rule 2 (`ac`). Skipped when the section is absent, hidden or duplicated: rule 1 or the legacy loop REDs that.
  const ac = only("acceptance criteria");
  const acCount = ac ? checkAcceptanceCriteria(ac, out) : 0;

  // Rule 3 (`clarification`): a literal count over the whole body.
  const markers = (body.match(MARKER_RE) || []).length;
  if (fm.state === "Approved" && markers > 0) {
    out.push(["clarification", `an Approved spec carries ${markers} clarification marker(s) — every one must be resolved before approval`]);
  } else if (markers > MAX_MARKERS) {
    out.push(["clarification", `${markers} clarification markers — at most ${MAX_MARKERS} are allowed`]);
  }

  // Rule 4 (`out-of-scope`). Skipped when `## Scope` is absent, hidden or duplicated, for the same reason.
  const scope = only("scope");
  if (scope && !hasOutOfScopeEntry(scope)) {
    out.push(["out-of-scope", `\`## Scope\` (line ${scope.line}) has no \`**Out of scope…**\` label with at least one entry`]);
  }

  // Rule 5 (`optional-section`): an optional section that is present has a non-blank line. Unknown `##` headings
  // are allowed and never checked.
  for (const s of sections) {
    if (TEMPLATE_OPTIONAL.includes(s.name) && s.lines.every((l) => isBlank(l.text))) {
      out.push(["optional-section", `\`## ${titleCase(s.name)}\` (line ${s.line}) is empty — delete an unused optional section`]);
    }
  }

  // Rule 6 (`guidance`): the template's guidance comments are removed when a SPEC is emitted.
  const g = body.split(/\r?\n/).findIndex((l) => GUIDANCE_RE.test(l));
  if (g !== -1) out.push(["guidance", `line ${firstLine + g}: a \`<!-- pharn:guidance\` comment remains — remove every guidance comment`]);

  // Rule 7 (`template`): the value's shape, then the id's membership. PROVENANCE ONLY — see the header. The value
  // is never echoed (it is untrusted text); an unknown id is, because it has already matched [a-z0-9-].
  const v = fm[TEMPLATE_KEY];
  const m = cleanScalar(v, SPEC_TEMPLATE_MAX) ? v.match(SPEC_TEMPLATE_RE) : null;
  if (v === undefined) {
    out.push([
      "template",
      `a \`${TEMPLATE_KEY}:\` line is present but its value does not read as one clean line (a stray CR, U+2028 or U+2029 in it) — ` +
        `copy the line \`--resolve-template-ref\` prints`,
    ]);
  } else if (!m) {
    out.push([
      "template",
      `${TEMPLATE_KEY} (${v.length} chars) is not <id>@sha256:<64 lowercase hex> — copy the line \`--resolve-template-ref\` prints`,
    ]);
  } else if (!TEMPLATES.has(m[1])) {
    out.push(["template", `${TEMPLATE_KEY} names unknown template "${m[1]}" — known: {${knownTemplateIds().join(", ")}}`]);
  }

  // Rule 8 (`spec-kind`): at most one `spec_kind:` line, naming a SPEC_KINDS member. The value is never echoed.
  const kindLines = specKindLines(raw);
  if (kindLines.length > 1) {
    out.push(["spec-kind", `${kindLines.length} \`${SPEC_KIND_KEY}:\` lines — at most one is allowed`]);
  } else if (specKindOf(raw) === null) {
    out.push([
      "spec-kind",
      `${SPEC_KIND_KEY} (${kindLines[0].length - SPEC_KIND_KEY.length - 1} chars) is not one of {${SPEC_KINDS.join(", ")}} — delete the line for a feature`,
    ]);
  }

  // Rule 9 (`quick`, 6.23.0): on a SPEC whose kind is `quick`, at most QUICK_MAX_ACS criteria, each verified at a
  // QUICK_LEVELS member. Skipped when the AC section is absent, hidden or duplicated (rule 1 already reports that)
  // and, per item, when the level is malformed (rule 2 already reports that) — so each defect is reported once.
  // Applies in every state (a Draft is caught before approval; every downstream check-spec-approved call re-checks
  // it through checkTemplate). The value is read the SAME way rule 8 does (specKindOf over the raw frontmatter),
  // never through the parsed `fm`.
  if (ac && specKindOf(raw) === QUICK_KIND) {
    const quickItems = parseAcItems(ac).items;
    if (quickItems.length > QUICK_MAX_ACS) {
      out.push(["quick", `${quickItems.length} criteria — a quick SPEC carries at most ${QUICK_MAX_ACS}`]);
    }
    for (const item of quickItems) {
      const level = verifyOf(item).level;
      if (level !== null && !QUICK_LEVELS.includes(level)) {
        out.push([
          "quick",
          `line ${item.n}: AC-${item.id}'s verify level \`${level}\` is not allowed — a quick SPEC's criteria are ` +
            `${QUICK_LEVELS.map((l) => `\`${l}\``).join(" or ")}`,
        ]);
      }
    }
  }

  return { findings: out.map(([kind, detail]) => ({ kind, detail })), id: m ? m[1] : "", acCount, required: required.length };
}

// ── The template validator ──────────────────────────────────────────────────────────────────────────────────

// Does `## Acceptance Criteria` hold at least one EXAMPLE criterion a writer can copy? An example is a VISIBLE item
// that starts `- **AC-<n>**`, reads Given → When → Then, and has exactly one verify-like continuation. The level is
// NOT checked: the shipped default's example is the placeholder `<unit | integration | e2e>`. Unlike rule 2, other
// lines are not REDs here: a template's section also holds guidance, so a line that is neither an item start nor a
// continuation only ENDS the current item. A line inside a column-0 block (a guidance comment's body, say) is
// skipped for the same reason a renderer skips it, and also ends the current item, as a column-0 block ends a list.
function hasExampleCriterion(sec) {
  const items = [];
  let cur = null;
  for (const { text, inBlock } of sec.lines) {
    if (!inBlock && AC_START_RE.test(text)) {
      cur = [text];
      items.push(cur);
    } else if (cur && !inBlock && (isBlank(text) || CONTINUATION_RE.test(text))) {
      cur.push(text);
    } else {
      cur = null;
    }
  }
  return items.some((lines) => {
    const verify = lines.slice(1).filter((l) => VERIFY_LIKE_RE.test(l));
    const text = lines.filter((l) => !VERIFY_LIKE_RE.test(l)).join("\n");
    return verify.length === 1 && inOrder(text, ["Given", "When", "Then"]);
  });
}

/**
 * Validate a template's TEXT before check-spec.mjs may print a reference to it — applied to EVERY template, the
 * shipped default included. Pure: the caller splits the file (check-spec.mjs's parseSpec) and does every file check.
 * A refusal names a code from TEMPLATE_REFUSALS plus a heading from the closed section list or a file line number,
 * never the template's text (P2 discipline, as for a SPEC).
 *
 * The dependent checks (`ac-example`, `out-of-scope-label`) are SKIPPED when their section is missing, hidden or
 * duplicated — exactly as checkTemplate's only() skips rules 2 and 4 — so each defect is reported once, under
 * `section`, and never under two codes.
 *
 * @param {{raw: string, body: string, firstLine: number, baseRequired: string[]}} tpl
 *   `raw` is the frontmatter block's text; `baseRequired` is check-spec.mjs's base section set (stored there, once).
 * @returns {{refusals: {code: string, detail: string}[]}}
 */
export function validateTemplate({ raw, body, firstLine, baseRequired }) {
  const out = [];
  if (!TEMPLATE_KEY_LINE_RE.test(raw)) {
    out.push([
      "template-key",
      `the frontmatter has no line starting \`${TEMPLATE_KEY}:\` — the line /pharn-spec fills with the resolved reference`,
    ]);
  }
  const required = [...baseRequired, ...TEMPLATE_EXTRA_REQUIRED];
  const templateSections = [...required, ...TEMPLATE_OPTIONAL];
  const { sections, hidden } = sectionsOf(body, firstLine);
  const count = (name) => sections.filter((s) => s.name === name).length;
  const only = (name) => (count(name) === 1 ? sections.find((s) => s.name === name) : null);

  for (const name of required) {
    if (count(name) > 0) continue;
    const h = hidden.find((x) => x.name === name);
    out.push([
      "section",
      h
        ? `line ${h.line}: \`## ${titleCase(name)}\` sits inside a block opened at line ${h.opener}, so a renderer shows no heading there`
        : `missing required \`## ${titleCase(name)}\` section`,
    ]);
  }
  for (const name of templateSections) {
    if (count(name) > 1)
      out.push(["section", `\`## ${titleCase(name)}\` appears ${count(name)} times — a template section appears at most once`]);
  }

  const ac = only("acceptance criteria");
  if (ac && !hasExampleCriterion(ac)) {
    out.push([
      "ac-example",
      `\`## Acceptance Criteria\` (line ${ac.line}) has no visible example item: \`- **AC-<n>**\` reading Given … When … Then, ` +
        `with exactly one \`  - verify: <level>\` continuation`,
    ]);
  }
  const scope = only("scope");
  if (scope && !scope.lines.some((l) => !l.inBlock && OUT_OF_SCOPE_RE.test(l.text))) {
    out.push(["out-of-scope-label", `\`## Scope\` (line ${scope.line}) has no visible column-0 \`**Out of scope…**\` label`]);
  }
  return { refusals: out.map(([code, detail]) => ({ code, detail })) };
}
