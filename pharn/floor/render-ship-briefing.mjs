#!/usr/bin/env node
// pharn/floor/render-ship-briefing.mjs — the deterministic GENERATOR for the GATE-2 briefing artifact
// (`pharn/features/<name>/BRIEFING.md`), on the PRODUCT surface.
//
// Non-LLM, dependency-free (Node stdlib + `git rev-parse`, the same subprocess convention
// `check-provenance.mjs`'s command-side caller uses to fill `commit`). Every enum-gated frontmatter field
// is a VERBATIM COPY of a value already present in a committed source file — SPEC.md/PLAN.md frontmatter,
// `regression-report.json`, `verify-report.json`, or GRILL.md's own verdict line — never restated from
// memory, never generated. This file NEVER calls an LLM. It is the floor reduction of
// `pharn/pharn-contracts/ship-briefing.md`'s "IS: a verbatim copy" half (cited, not restated — P4).
//
// WHAT THIS FILE DOES NOT DO: it does not write `BRIEFING.md` itself — it prints the rendered markdown to
// stdout, so the CALLING COMMAND performs the Write (fix #7 gates that write, not this render). It also
// does not author the ADVISORY paragraph (`## Why this design (ADVISORY — model-synthesized...)`): when no
// design-rationale section can be located in PLAN.md by structural heading-scan, this file emits the
// honest NO_DECISION_LINE sentinel in its place — a caller MAY replace that exact line with a
// model-generated paragraph before writing, but the decision to do so, and the generation itself, are
// this file's caller's job, never this file's (this file has no LLM access and no need for one).
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// FLOOR (what a caller gets for free by using this renderer): every frontmatter field is either copied
//   byte-for-byte from a source file's own structured field, or the literal `n/a`/`unknown` when that
//   source is absent — never fabricated. Running it twice against unchanged sources yields byte-identical
//   output (pinned by a test) — the render itself has no hidden state, no timestamp, no randomness.
// ADVISORY (what it can NEVER guarantee): that the SOURCE fields it copies are themselves correct (that is
//   each source's OWN floor's job — check-spec.mjs, check-regress.mjs, check-verify.mjs); that the
//   PLAN.md `## Files` list it quotes is complete; or that the design-rationale section it locates (when
//   found) is the RIGHT one to read. "Rendered" never means "verified" — `check-ship-briefing.mjs` is the
//   floor half that re-verifies the copy against the sources, after the fact (a genuinely NEW floor
//   primitive this pair introduces, per PLAN.md's Guarantee audit — not merely a shape check like
//   `check-loop-record.mjs`, whose job is structure only).
//
// ── The dual PLAN shape (lessons-learned.md L6, reused from check-plan-lessons.mjs — cited, not restated,
//    P4; re-implemented IN-FILE per P3, no sibling/cross-tree import) ──────────────────────────────────
// A PLAN's structured header is EITHER `---`-fenced YAML frontmatter (the PRODUCT `pharn/features/<name>/PLAN.md`
// shape) OR a leading `- key: value` bullet block ending at the first `##`+ heading (the DEV
// `.dev/features/<name>/PLAN.md` shape). Both are read the SAME way here as `check-plan-lessons.mjs`
// already reads `applied_lessons` — a field absent from BOTH shapes (e.g. `spec_id` on every dev PLAN, by
// construction, since the dev loop has no per-feature SPEC.md) renders `n/a`, never a guess. This is also
// why NO `--base`-conditional fail-closed/graceful-degrade branch is needed: for the REAL product
// `/pharn-ship` path, `SPEC.md` is guaranteed present by the time BRIEFING.md is rendered (Step 1 of
// `pharn-ship.md` already ran `check-spec-approved.mjs` before proceeding), so the `n/a` path is only ever
// exercised by a `.dev/features` (dev-loop) render — the SAME uniform "file exists → read it; else → n/a"
// rule is correct and honest for both.
//
// ── The design-rationale heading-scan (P5 — a membership test, not a guess) ─────────────────────────────
// A grep across all 121 `.dev/features/*/PLAN.md` files at pin-time found 34 plans carrying a
// design-rationale section, under 34 DIFFERENT heading spellings, with no fixed convention. DECISION_RE
// below is the curated pattern that matched all 34 verbatim (verified against the sampled corpus before
// this file was written, not asserted). It is a HEURISTIC scan, not a floor guarantee: a plan whose
// rationale uses none of {decision(s), alternative(s), rejected, resolved} in a heading is a genuine miss,
// handled by the honest NO_DECISION_LINE fallback, never a crash and never a fabricated quote.
//
// Usage:
//   node pharn/floor/render-ship-briefing.mjs <name> [--base <dir>]   (default --base: pharn/features)
//     Prints the rendered BRIEFING.md to stdout. Exit 0 on success; exit 1 if PLAN.md (the one REQUIRED
//     input) is absent or unreadable — fail-closed, since there is nothing to render without it.

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { FM_RE, stripBom } from "./frontmatter-core.mjs";

// The sentinel line emitted in `## Why this design` when the heading-scan finds nothing. A caller may
// replace this EXACT string with a generated paragraph; tests and `check-ship-briefing.mjs` both key off
// it verbatim, so it is exported rather than inlined twice.
export const NO_DECISION_LINE = "_No design-decision section found in PLAN.md — see PLAN.md directly._";

// The exact marker heading a caller's generated paragraph MUST carry (pharn-contracts/ship-briefing.md).
// Duplicated (not imported) into check-ship-briefing.mjs's own file per the no-sibling-import convention
// (P3) — a short literal, so the duplication is cheap and a parity test pins the two copies agree.
//
// The replacement contract (performed by the CALLER, never this file): when `needsAdvisoryParagraph` is
// true and a caller chooses to generate a paragraph, it replaces BOTH the rendered `## Why this design`
// heading line AND the `NO_DECISION_LINE` body with `ADVISORY_HEADING` and the generated text — never
// one without the other, so a reader can never see the plain heading paired with synthesized prose.
export const ADVISORY_HEADING = "## Why this design (ADVISORY — model-synthesized, not floor-verified; see PLAN.md/GRILL.md)";

// Curated heading-scan pattern (see header). `#{2,3}` — a design-rationale section is always a `##` or
// `###` heading in the sampled corpus, never `#`/`####+`. `\bdecisions?\b` (not `\bdecision\b`) is
// deliberate: an UNGUARDED `\bdecision\b` fails to match the plural "Decisions" because there is no word
// boundary between "n" and "s" — verified against all 34 sampled headings, several of which are plural.
const DECISION_RE = /^#{2,3}[ \t]+.*\b(decisions?|alternatives?|rejected|resolved)\b/i;

// A generic ATX heading, any level — the stop condition for every section-extraction below.
const HEADING_RE = /^#{1,6}[ \t]+\S/;

// The leading YAML frontmatter block (product PLAN/SPEC shape). Re-implemented in-file (P3) — the same
// mechanism `check-spec.mjs` / `check-plan-lessons.mjs` use.

const REGRESS_ENUM = new Set(["no-regressions", "regressions", "inconclusive"]);
const VERIFY_ENUM = new Set(["PASS", "FAIL", "INCOMPLETE", "INCONCLUSIVE"]);

function stripQuotes(v) {
  return v.replace(/^["']|["']$/g, "");
}

// Strip a trailing ` # comment` (the dev PLAN header carries them) and surrounding quotes — the same
// `clean()` convention `check-plan-lessons.mjs` uses.
function clean(v) {
  return stripQuotes(v.replace(/\s+#.*$/, "").trim()).trim();
}

// Read ONE field from a PLAN/SPEC's structured header, trying BOTH shapes (frontmatter, then the dev
// bullet-header), fenced blocks skipped inside the bullet-header region (L6). Returns undefined if the
// field is present in NEITHER shape — a legitimate, expected outcome (e.g. `spec_id` on a dev PLAN).
export function readHeaderField(text, field) {
  const fm = text.match(FM_RE);
  if (fm) {
    for (const line of fm[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);
      if (kv && kv[1] === field) return clean(kv[2]);
    }
    return undefined; // real frontmatter present but this field isn't in it — never fall through to
    // the bullet-header scan below, which would otherwise read a `- field: value` line that happens to
    // sit in the markdown BODY (past the frontmatter) as if it were structured header data.
  }
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (HEADING_RE.test(line)) break; // the structured header region ends at the first heading
    const kv = line.match(/^-[ \t]+([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (kv && kv[1] === field) return clean(kv[2]);
  }
  return undefined;
}

// Extract the body of the FIRST section whose heading line matches `headingTest(line)`, up to (not
// including) the next heading of any level. Fenced blocks are tracked so a heading-looking line inside a
// code block never starts or ends a section (L6) — a simple open/close TOGGLE (not full CommonMark
// nesting-length pairing like check-loop-record.mjs's fenceOpens/fenceCloses): PLAN.md bodies in this
// corpus do not nest mismatched fence lengths, and a full pairing implementation would be scope beyond
// what this generator's inputs need (a deliberate, smaller-scope choice, not an oversight).
function extractSection(body, headingTest) {
  const lines = body.split(/\r?\n/);
  let inFence = false;
  let collecting = false;
  const out = [];
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      if (collecting) out.push(line);
      continue;
    }
    if (inFence) {
      if (collecting) out.push(line);
      continue;
    }
    if (!collecting) {
      if (headingTest(line)) collecting = true;
      continue;
    }
    if (HEADING_RE.test(line)) break;
    out.push(line);
  }
  return collecting ? out.join("\n").trim() : undefined;
}

// The Decision-shaped section, found via the curated heading-scan (P5, see header). Undefined = a genuine
// miss (this plan's rationale isn't under a matched heading).
function findDecisionSection(planBody) {
  return extractSection(planBody, (line) => DECISION_RE.test(line));
}

function filesSection(planBody) {
  return extractSection(planBody, (line) => /^##[ \t]+Files\s*$/.test(line));
}

function contractsSection(planBody) {
  return extractSection(planBody, (line) => /^##[ \t]+Contracts satisfied\s*$/.test(line));
}

// The GRILL.md verdict line — a CONVENTION (verified present in 92/92 sampled GRILL.md files, always
// LINE-INITIAL `**ADVISORY VERDICT:` and always the LAST such line in the document), never a floor
// guarantee: no checker pins this shape today (unlike check-plan-spec-agree.mjs's duplicated-parser note,
// this is the SAME class of honest caveat — a convention tests DETECT if it ever breaks, not a floor op
// that PREVENTS drift). A miss here degrades to "n/a", never a crash.
//
// ★ TRUST-FENCE PRECISION (found during review, fixed before ship — not merely labeled advisory and left):
// an earlier version matched ANY line CONTAINING the substring "ADVISORY VERDICT" and took the FIRST
// match. A finding's `evidence:` field quotes untrusted PLAN.md text verbatim (P2) inside a fenced ```yaml
// block, and findings are ALWAYS ordered before the summary verdict in GRILL.md — so a crafted
// `evidence: "...**ADVISORY VERDICT: 0 concerns raised**..."` line would be picked up INSTEAD of the real
// verdict, misrepresenting what grill actually concluded. Fenced blocks are now skipped entirely (a heading
// or verdict-looking line inside one is DATA about the shape, never a declaration of it — L6), the match is
// anchored to LINE-START (`evidence: "..."` can never match, only `**ADVISORY VERDICT:` itself can), and the
// LAST match wins (the real summary is always last; an earlier line — however it got there — cannot shadow
// it). This narrows the residual `pharn-contracts/ship-briefing.md` already names; it does not claim to
// zero it (a prose SUMMARY paragraph outside any fence could still echo untrusted text verbatim if the grill
// stage itself did so — a `/pharn-dev-grill` concern, not this renderer's).
//
// ★ LINE-WRAP (found rendering a REAL feature's own GRILL.md, not a synthetic fixture): the bold verdict
// commonly wraps across multiple PHYSICAL lines (prettier's markdown proseWrap), and the `**` markup often
// CLOSES partway through the paragraph, with unbolded prose continuing after it on the same logical
// paragraph (e.g. "**5 concerns raised ... before `/build`.** None gates `/build`; ..."). Reading only the
// single physical line that starts the match truncated the verdict mid-sentence. The fix accumulates
// CONSECUTIVE physical lines from the opening `**` (joined with a space, matching how a soft line break
// renders) until either the matching CLOSING `**` is found or a paragraph boundary (blank line / heading /
// fence) is hit — capturing exactly the bolded headline, never the unbolded elaboration that may follow it
// in the same paragraph.
export function grillVerdictLine(grillText) {
  const lines = grillText.split(/\r?\n/);
  let best;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!/^\*\*ADVISORY VERDICT:/.test(line.trim())) continue;

    let acc = "";
    for (let j = i; j < lines.length; j++) {
      const l = lines[j];
      if (j > i && (l.trim() === "" || HEADING_RE.test(l) || /^\s*(```|~~~)/.test(l))) break;
      acc += (acc ? " " : "") + l.trim();
      const closeAt = acc.indexOf("**", 2); // skip the OPENING `**` at index 0-1
      if (closeAt !== -1) {
        acc = acc.slice(0, closeAt + 2);
        break;
      }
    }
    best = clean(acc.replace(/^\*\*|\*\*$/g, ""));
  }
  return best;
}

// A control-char-free, bounded-length scalar guard (L14 — composed BEFORE any use, never a substitute for
// one). Duplicated from `check-provenance.mjs`'s `cleanScalar` convention (P3, no sibling import).
function cleanScalar(v, maxLen) {
  if (typeof v !== "string") return false;
  if (v.length < 1 || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

// ── The frontmatter scalar CODEC — an inverse PAIR, defined together on purpose ───────────────────────
// A minimal YAML scalar quoter for hand-emitted frontmatter (no YAML library — stdlib only). Always
// double-quotes and escapes `\` and `"` — simple and unambiguous, never relies on YAML's "plain scalar"
// grammar (whose special-character rules are exactly the kind of subtlety this repo's own `readValue`
// helpers exist to parse defensively on the READ side; on the WRITE side, always-quote sidesteps it).
//
// `yamlScalar` and `yamlUnscalar` are ONE concept and live together BECAUSE they once did not: the writer
// escaped and no reader ever unescaped, so `check-ship-briefing.mjs` compared `…\"…` against a live source
// reading `…"…` and REDded a just-rendered briefing as "stale" against its own unchanged input. Splitting
// an encoder from its decoder across two files is how that drift happened; keeping the pair adjacent (and
// pinned by the ✧ round-trip + parity tests) is the repair. `check-ship-briefing.mjs` carries a DUPLICATE
// of all three functions per its documented no-sibling-import convention (P3), not an import.
export function yamlScalar(v) {
  return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// Is `raw` a COMPLETE double-quoted scalar — i.e. something `yamlScalar` could have produced?
//
// The subtle half is the CLOSING quote. "The character before it is not a backslash" is the obvious
// spelling and it is WRONG: `yamlScalar("a\\")` → `"a\\\\"`, whose final `"` IS preceded by a backslash —
// the second half of an escaped `\\` pair, not an escape of the quote. Decide on the PARITY of the
// backslash run immediately before the quote: an EVEN run (0, 2, 4, …) leaves the quote unescaped and
// therefore a real terminator; an ODD run means the quote is itself escaped and the scalar is unterminated.
// A `"`-only test corpus passes under both spellings, which is why the round-trip corpus below carries
// backslash-terminated values.
export function isQuotedScalar(raw) {
  if (typeof raw !== "string" || raw.length < 2) return false;
  if (raw[0] !== '"' || raw[raw.length - 1] !== '"') return false;
  let run = 0;
  for (let i = raw.length - 2; i >= 1 && raw[i] === "\\"; i--) run++;
  return run % 2 === 0;
}

// The exact inverse of `yamlScalar`: strip the outer quotes, then undo the two escapes it emits — in ONE
// left-to-right pass, never two sequential `.replace` calls whose order silently matters. Restricted to
// `[\\"]` on purpose: `yamlScalar` emits a backslash before nothing else, so an unrecognized sequence
// (`\n`, `A`) is left INERT rather than interpreted — this is a codec for this writer, never a
// general YAML unescaper, and pretending otherwise would invent bytes no source ever wrote.
// A value that is not a complete quoted scalar is returned unchanged, so the caller can fall back.
export function yamlUnscalar(raw) {
  if (!isQuotedScalar(raw)) return raw;
  return raw.slice(1, -1).replace(/\\([\\"])/g, "$1");
}

export function readJsonVerdict(path, enumSet) {
  if (!existsSync(path)) return "n/a";
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return "n/a";
  }
  // Object.hasOwn — never `||`/`??` on a plain-object property (L15): a report shaped `{"verdict":
  // "constructor"} would otherwise be indistinguishable from a missing field via a truthiness check, and
  // an inherited prototype member is both truthy and non-nullish.
  if (parsed === null || typeof parsed !== "object" || !Object.hasOwn(parsed, "verdict")) return "n/a";
  const v = parsed.verdict;
  return typeof v === "string" && enumSet.has(v) ? v : "n/a";
}

function resolveCommit() {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  const sha = r.status === 0 ? (r.stdout || "").trim() : "";
  return /^[0-9a-f]{7,40}$/.test(sha) ? sha : "unknown";
}

/**
 * Render the BRIEFING.md markdown for one feature. Pure function of the filesystem at call time — no
 * network, no LLM, no writes. Returns `{ ok: true, markdown, needsAdvisoryParagraph }` on success, or
 * `{ ok: false, reason }` when PLAN.md (the one required input) is missing/unreadable.
 */
export function renderBriefing(name, opts = {}) {
  const base = opts.base ?? "pharn/features";
  const dir = join(base, name);

  const planPath = join(dir, "PLAN.md");
  let planText;
  try {
    planText = stripBom(readFileSync(planPath, "utf8"));
  } catch (e) {
    return { ok: false, reason: `PLAN.md is unreadable (${planPath}): ${e.message}` };
  }
  const planFm = planText.match(FM_RE);
  const planBody = planFm ? planText.slice(planFm[0].length) : planText;

  let specId = "n/a";
  let specState = "n/a";
  const specPath = join(dir, "SPEC.md");
  if (existsSync(specPath)) {
    try {
      const specText = stripBom(readFileSync(specPath, "utf8"));
      specId = readHeaderField(specText, "spec_id") ?? "n/a";
      const state = readHeaderField(specText, "state");
      specState = state === "Approved" ? "Approved" : "n/a";
    } catch {
      // unreadable SPEC.md degrades to n/a, same as absent — never a crash over an optional cross-check
    }
  }
  if (specId !== "n/a" && !cleanScalar(specId, 128)) specId = "n/a";

  let grillVerdict = "n/a";
  const grillPath = join(dir, "GRILL.md");
  if (existsSync(grillPath)) {
    try {
      const line = grillVerdictLine(readFileSync(grillPath, "utf8"));
      if (line && cleanScalar(line, 256)) grillVerdict = line;
    } catch {
      // unreadable GRILL.md degrades to n/a
    }
  }

  const regressVerdict = readJsonVerdict(join(dir, "regression-report.json"), REGRESS_ENUM);
  const verifyVerdict = readJsonVerdict(join(dir, "verify-report.json"), VERIFY_ENUM);

  const decision = findDecisionSection(planBody);
  const needsAdvisoryParagraph = decision === undefined;
  const whyBody = decision !== undefined ? decision : NO_DECISION_LINE;

  const filesList = filesSection(planBody) ?? "_No `## Files` section found in PLAN.md._";
  const contractsList = contractsSection(planBody) ?? "_No `## Contracts satisfied` section found in PLAN.md._";

  const commit = resolveCommit();

  const frontmatter = [
    "---",
    `feature: ${yamlScalar(name)}`,
    `spec_id: ${yamlScalar(specId)}`,
    `spec_state: ${yamlScalar(specState)}`,
    `grill_verdict: ${yamlScalar(grillVerdict)}`,
    `regress_verdict: ${yamlScalar(regressVerdict)}`,
    `verify_verdict: ${yamlScalar(verifyVerdict)}`,
    `rendered_at_commit: ${yamlScalar(commit)}`,
    `briefing_contract_version: "0.1.0"`,
    "---",
  ].join("\n");

  const markdown = [
    frontmatter,
    "",
    `# BRIEFING — ${name}`,
    "",
    "> Assembled deterministically from committed sources by `pharn/floor/render-ship-briefing.mjs`; " +
      "cross-verified by `pharn/floor/check-ship-briefing.mjs`. This is NOT a seal, NOT a decision, and " +
      "NOT a precondition for GATE 2 — see `pharn/pharn-contracts/ship-briefing.md` (P0).",
    "",
    "## What",
    "",
    "### Files",
    "",
    filesList,
    "",
    "### Contracts satisfied",
    "",
    contractsList,
    "",
    "## Why this design",
    "",
    whyBody,
    "",
    "## Verdicts",
    "",
    "| stage | verdict | source |",
    "| --- | --- | --- |",
    `| grill | ${grillVerdict} | \`${dir}/GRILL.md\` |`,
    `| regress | ${regressVerdict} | \`${dir}/regression-report.json\` |`,
    `| verify | ${verifyVerdict} | \`${dir}/verify-report.json\` |`,
    "",
    "## Pointers",
    "",
    `- \`${dir}/PLAN.md\``,
    `- \`${dir}/GRILL.md\``,
    `- \`${dir}/REGRESSION.md\``,
    `- \`${dir}/VERIFY.md\``,
    `- \`${dir}/BUILD.md\``,
    "",
  ].join("\n");

  return { ok: true, markdown, needsAdvisoryParagraph };
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

function main() {
  const argv = process.argv.slice(2);
  const name = argv[0];
  if (!name || name.startsWith("--")) {
    process.stderr.write("usage: node pharn/floor/render-ship-briefing.mjs <name> [--base <dir>]\n");
    process.exit(1);
  }
  const baseFlag = flag(argv, "--base");
  const result = renderBriefing(name, baseFlag !== undefined ? { base: baseFlag } : {});
  if (!result.ok) {
    process.stderr.write(`RED — ${result.reason}\n`);
    process.exit(1);
  }
  process.stdout.write(result.markdown);
  process.exit(0);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare, which silently no-ops on spaced/non-ASCII/symlinked paths.
if (import.meta.main) {
  main();
}
