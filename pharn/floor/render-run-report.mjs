#!/usr/bin/env node
// pharn/floor/render-run-report.mjs — renders `pharn/features/<name>/RUN-REPORT.md`, the human-readable
// run report `/pharn-loop` writes at every stop that has a feature directory.
//
// Floor infrastructure, NOT a Capability (no `role:`; it lives in the floor-ignored dir, exactly like
// render-cost-ledger.mjs / render-ship-briefing.mjs). NON-LLM: Node stdlib only, and the ONLY child
// process it ever spawns is `git`, always through `execFileSync` with an argument vector.
//
// ── WHAT IT IS (P0), stated before anything else ─────────────────────────────────────────────────────
// A DETERMINISTIC VIEW over artifacts that already exist. Every line is derived by this code; no line is
// authored by a model. It ANNOTATES a run and GATES NOTHING — no proceed/stop in any command reads it,
// and `/pharn-loop`'s Step 6c commit stays gated on `STOP_GREEN` and the decision re-derivation alone
// (fix #3). "The run report says the change is fine" is not a sentence this file can support.
//
// ── THREE BOUNDS, each one a thing a reader would otherwise assume ───────────────────────────────────
// 1. The FILE LIST is `changed since <base_sha>` plus untracked. That is NOT "what the build wrote".
//    lessons-learned L17 is the record of exactly that conflation — `check-regress scope` reporting a
//    changed-since-base test as a wrote-outside-scope test — producing a BLOCKING finding on the
//    correct, designed workflow, which trains an operator to wave through the one finding that must
//    never be waved through. The report therefore marks a path as `not named in PLAN ## Files` and says
//    in the artifact itself that this is an observation, not a scope verdict.
// 2. The TOKEN NUMBERS are copied from `cost.json`'s stored views, never recomputed here. That is
//    deliberate: `check-cost-ledger.mjs` already recomputes every view from `requests[]` and REDs on a
//    mismatch, so copying inherits that guarantee, while a second independent computation could
//    disagree with the file a checker had just certified (L43: several stores of one fact certify their
//    agreement, never the fact — so do not create a second store).
// 3. The report is rendered BEFORE `/pharn-loop`'s Step 6c commit and AFTER `cost.json` is written, so
//    it lists `cost.json` among the changed files and necessarily does NOT list itself. Stated in the
//    artifact rather than left for a reader to infer from a diff that looks short by one.
//
// ── UNTRUSTED INPUT, and why NO SECTION USES A MARKDOWN TABLE (P2) ───────────────────────────────────
// `model`, `attribution_skill` and `stage` come from a transcript; the PLAN `## Files` lines, the
// Handoff bodies, `failing_gates[]`, `regressions[]` and every git path are untrusted too. The ledger's
// rule 3 bounds those identities to <=128 chars, no control characters and no absolute path — and that
// is ALL it bounds. Probed live against the shipped sanitiser rather than read off it (L37):
// `sanitizeIdentity("opus|5", …)` returns `"opus|5"` UNCHANGED, because a pipe is none of those three
// things. A pipe in a table cell silently splits the row and shifts every column right of it, so the
// rendered numbers would stop belonging to the row they appear in — a well-formed page that lies.
//
// So every MULTI-LINE region carrying untrusted text is a FENCED BLOCK whose delimiter is computed by
// `fenceFor()` to be longer than any back-tick run inside it. A fence cannot be broken by a pipe, and it
// keeps the "copied verbatim" requirement literally true — no escaping, which would make the copy not a
// copy. This makes the block inert TO A COMMONMARK PARSER. It is NOT forgery-proofing (P0): nothing
// parses this report, and a reader who copies text out of a fence is outside anything this file can
// reach.
//
// ── THE EXCEPTION, named because the sentence above was FALSE as a universal ─────────────────────────
// TWO kinds of untrusted value are rendered as INLINE CODE SPANS, not fences: a FILE PATH in a `## Files`
// bullet, and a `verdict` token. `/pharn-dev-review` found the unqualified claim and probed it: a
// back-tick-bearing path (legal on every filesystem, and NOT part of git's C-quoting set) renders
// `- `we`ird.ts` — …` with its span broken. The claim was widened from ONE measured value (the pipe in
// `model`, genuinely fenced) to every untrusted region — [[L37]]'s recipe is to probe an EXCLUDED member
// and it was not applied to the universal, in a file citing L37 two paragraphs up.
//
// The exception is ACCEPTED rather than closed, and the reason is bounded: the break is COSMETIC. A path
// cannot carry a newline into this report — `git diff --name-only` C-quotes one — so no heading can be
// smuggled through a file row, the section-closure assertion still holds, and the report gates nothing
// either way. Fencing each path would cost a five-line block per file and make the list unreadable for a
// defect that garbles one row. What is NOT acceptable is the unqualified sentence, so it is qualified.
//
// ── The CHECK 5 preamble is load-bearing, not boilerplate (L10) ──────────────────────────────────────
// `pharn/features/**` is on `validate.mjs`'s SCANNED surface (`EXCLUDE_SEGMENTS` excludes `.dev/` and
// NOT `pharn/features/`). CHECK 5 REDs any scanned `.md` containing both `rule_id:` and `problem:`
// unless it also documents the enum-gated / free-text split — and a quoted Handoff can contain both by
// pure chance. The preamble is therefore emitted UNCONDITIONALLY. It is a true statement about this
// artifact, which is why it is acceptable; a sentence written only to satisfy a scanner would be the
// disease.
//
// ── DETERMINISM (P5) ─────────────────────────────────────────────────────────────────────────────────
// No clock, no randomness, no locale-dependent comparison. Git's own path ordering is PRESERVED and
// never re-sorted: git orders bytewise while JavaScript's default sort orders by UTF-16 code unit, and
// the two disagree on non-ASCII paths, so re-sorting would make "same inputs -> same bytes" depend on
// which sort ran last. Every branch is an existence or membership test; the terminal fallback of every
// lookup is an explicit `n/a — <reason>` line, never a guess and never a silently omitted section (L34:
// silence and asserted-silence are different claims).
//
// Usage:
//   node pharn/floor/render-run-report.mjs <name> [--base <dir>] [--repo <dir>] [--stdout]
//
// Exit: 0 — the report was rendered (an honest `n/a` in any section is still a success).
//       2 — unusable input: no `<name>`, a `<name>` that is not a plain slug, or the feature dir is
//           absent. Fail-closed: nothing is written.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { FEATURE_BASE, TOKEN_CLASSES } from "./render-cost-ledger.mjs";
import { handoffSections, fenceFor, HANDOFF_SECTIONS } from "./loop-record-core.mjs";
import { pathsFromPlanFiles } from "./plan-files-core.mjs";

// `FEATURE_BASE` and `TOKEN_CLASSES` are IMPORTED, never re-spelled. This module introduces ZERO new
// defaults, which is the whole of L41's remedy here — there is no second literal for a relocation to
// split, so L52's "one test per default in this change" ranges over an empty set, and a closure
// assertion pins that the literal stays absent from this file.

/** A `<name>` must be a plain slug: it is interpolated into paths. Fail-closed, never sanitized. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** The report's section vocabulary, in emission order. A CLOSED set, asserted in both directions by the
 *  suite (L36: a per-member presence set is satisfied by a variant spelling; closure is what fails). */
export const SECTIONS = Object.freeze([
  "## Outcome",
  "## Tokens — stage x iteration x model",
  "## Files",
  "## Verdicts",
  "## What the run ran into",
]);

/** Rendered wherever an input is absent or unusable. One shape, so a reader learns it once. */
export function na(reason) {
  return `_n/a — ${reason}_`;
}

/** Quote untrusted text as an inert fenced block (see the header). `label` names the source so a reader
 *  can tell DATA from this file's own prose. */
export function quoteData(label, text) {
  const body = String(text);
  const f = fenceFor(body);
  return [`${label}`, "", `${f}text`, body, f].join("\n");
}

/** File text from disk, or `null` when it is absent or unreadable. */
export function readTextOrNull(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/** The pre-run dirty snapshot as a path SET plus the sentence the report shows, or an honest absence. */
export function readDirtySnapshot(repo, name) {
  const text = readTextOrNull(join(repo, ".pharn", "pharn-loop", name, "pre-run-status.txt"));
  if (text === null) {
    return { set: null, note: na("no pre-run snapshot was found, so no path can be marked `dirty-before-run`") };
  }
  const set = parsePorcelain(text);
  return {
    set,
    note:
      set.size === 0
        ? "The tree was clean before the run, so no path below is marked `dirty-before-run`."
        : `${set.size} path(s) were already dirty before the run started; those are marked below.`,
  };
}

/** JSON from disk, or `null`. An unreadable or malformed file is an `n/a` reason, never a crash (L51: a
 *  guard is justified against the FULL input domain, not the happy path).
 *
 *  ARRAYS ARE REJECTED, and that is the repair for a real defect: `typeof [] === "object"`, so the
 *  earlier guard admitted `[1,2,3]` as a usable ledger and the Outcome section rendered seven `unknown`
 *  rows — a DIFFERENT claim ("a ledger exists and records unknowns") from the true one ("there is no
 *  usable ledger"). An `n/a — <reason>` line is this file's one idiom for unusable input and it must not
 *  be spent on the wrong state. Found by `/pharn-dev-review` (F2), together with the fact that the test
 *  named for this case had been passing on a DIFFERENT section's `n/a` — [[L52]] at range zero. */
export function readJson(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Parse `git status --porcelain -uall` output into a SET of paths.
 *
 * NOT a fixed-offset slice, and lessons-learned L21 is why: the porcelain v1 format is `XY <path>`, it
 * writes a rename as `old -> new`, and it C-QUOTES any path containing a special byte — wrapping it in
 * double quotes and backslash-escaping. A naive `line.slice(3)` mis-parses exactly those paths and the
 * failure is quiet: a wrong `dirty-before-run` marker reads as data, not as an error. L21's rule is that
 * a path-set reader must handle its input's real shape rather than trust its caller's happy path.
 *
 * Both sides of a rename are recorded: the run touched both.
 */
export function parsePorcelain(text) {
  const out = new Set();
  for (const line of String(text).split(/\r?\n/)) {
    if (line.length < 4) continue;
    const rest = line.slice(3); // 2 status columns + one space
    // A rename/copy entry is `old -> new`, and either side may be quoted.
    for (const part of splitRename(rest)) {
      const v = unquoteC(part);
      if (v) out.add(v);
    }
  }
  return out;
}

/** Split `old -> new` outside of a quoted region. A literal ` -> ` inside a quoted path is escaped by
 *  git as part of the quoted run, so scanning quote state is sufficient. */
function splitRename(s) {
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && (i === 0 || s[i - 1] !== "\\")) inQuote = !inQuote;
    if (!inQuote && s.startsWith(" -> ", i)) return [s.slice(0, i), s.slice(i + 4)];
  }
  return [s];
}

/**
 * Undo git's C-style quoting when a path is wrapped in double quotes; otherwise return it unchanged.
 *
 * The octal escapes git emits are UTF-8 **BYTES**, not code points, so they are accumulated as bytes and
 * decoded once at the end. Decoding each `\\NNN` with `String.fromCharCode` instead yields mojibake — a
 * path containing `é` comes back as `Ã©` and then never matches the same path from `git diff`, which
 * silently drops its `dirty-before-run` marker. That is L21's failure direction exactly (a path-set
 * reader trusting a convenient shape), and it was caught here by a test rather than by a run.
 */
export function unquoteC(s) {
  const t = String(s).trim();
  if (!(t.startsWith('"') && t.endsWith('"') && t.length >= 2)) return t;
  const inner = t.slice(1, -1);
  const enc = new TextEncoder();
  const bytes = [];
  const simple = { n: 0x0a, t: 0x09, r: 0x0d, '"': 0x22, "\\": 0x5c, b: 0x08, f: 0x0c, v: 0x0b, a: 0x07 };
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] !== "\\") {
      for (const b of enc.encode(inner[i])) bytes.push(b);
      continue;
    }
    const n = inner[++i];
    if (n === undefined) break;
    if (Object.hasOwn(simple, n)) {
      bytes.push(simple[n]); // own-property test, never `||`/`??` (L15)
    } else if (n >= "0" && n <= "7") {
      bytes.push(parseInt(inner.slice(i, i + 3), 8) & 0xff);
      i += 2;
    } else {
      for (const b of enc.encode(n)) bytes.push(b);
    }
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

/** Run git with an ARGUMENT VECTOR (never a shell string) under `GIT_LITERAL_PATHSPECS=1`, so a path
 *  like `app/[id]/page.tsx` is that file and never also `app/i/page.tsx`. Returns `null` on any failure
 *  — an absent repo, a bad base — which the caller renders as an `n/a` reason. */
export function git(repo, args) {
  try {
    return execFileSync("git", args, {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, GIT_LITERAL_PATHSPECS: "1" },
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

/** Git's own line order is PRESERVED — see the header's determinism note. */
const lines = (s) =>
  String(s ?? "")
    .split("\n")
    .filter((l) => l.length > 0);

// ── section renderers ────────────────────────────────────────────────────────────────────────────────

function outcomeSection(cost) {
  if (!cost) return na("no cost.json — a stop before the ledger was emitted records no outcome here");
  const o = cost.outcome;
  const rows = [
    ["decision", o && typeof o.decision === "string" ? o.decision : "unknown"],
    ["iterations", o && o.iterations !== null && o.iterations !== undefined ? String(o.iterations) : "unknown"],
    ["blocked", o && typeof o.blocked === "string" ? o.blocked : "none"],
    ["base", typeof cost.base_sha === "string" ? cost.base_sha : "unknown"],
    ["command", typeof cost.command === "string" ? cost.command : "unknown"],
    ["skills_version", typeof cost.skills_version === "string" ? cost.skills_version : "unknown"],
    ["ledger coverage", typeof cost.coverage === "string" ? cost.coverage : "unknown"],
  ];
  const w = Math.max(...rows.map((r) => r[0].length));
  // Fenced, not a table: `decision` and `base_sha` are copied from untrusted sources (see the header).
  const body = rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join("\n");
  return [
    "The `decision` below is copied verbatim from `LOOP.md`'s frontmatter by the ledger; this report",
    "introduces no second source of truth for it.",
    "",
    quoteData("", body).trimStart(),
  ].join("\n");
}

function tokensSection(cost) {
  if (!cost) return na("no cost.json — no token ledger was emitted for this run");
  const rows = Array.isArray(cost.by_stage_iteration_model) ? cost.by_stage_iteration_model : [];
  if (rows.length === 0) {
    return na("cost.json carries no attributed rows — nothing was recorded against a stage");
  }
  const head = ["stage", "iter", "model", "reqs", ...TOKEN_CLASSES];
  const body = rows.map((t) => [
    String(t.stage ?? "(unattributed)"),
    String(t.iteration ?? "-"),
    String(t.model ?? "unknown"),
    String(t.requests ?? 0),
    ...TOKEN_CLASSES.map((c) => String((t.tokens && t.tokens[c]) ?? 0)),
  ]);
  const totals = cost.totals ?? {};
  const unattr = cost.unattributed ?? {};
  body.push([
    "TOTAL",
    "-",
    "-",
    String(totals.requests ?? 0),
    ...TOKEN_CLASSES.map((c) => String((totals.tokens && totals.tokens[c]) ?? 0)),
  ]);
  body.push([
    "unattributed",
    "-",
    "-",
    String(unattr.requests ?? 0),
    ...TOKEN_CLASSES.map((c) => String((unattr.tokens && unattr.tokens[c]) ?? 0)),
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)));
  const fmt = (r) =>
    r
      .map((c, i) => (i <= 2 ? c.padEnd(widths[i]) : c.padStart(widths[i])))
      .join("  ")
      .trimEnd();
  const table = [fmt(head), widths.map((n) => "-".repeat(n)).join("  "), ...body.map(fmt)].join("\n");
  return [
    "Copied from `cost.json`'s stored views, never recomputed here — `check-cost-ledger.mjs` already",
    "holds those views to a recompute from `requests[]`, so this is one number with one owner.",
    "",
    "**TOKENS ONLY.** There is no price table here or in `cost.json`; money is the reader's own",
    "multiplication against their own list, and `output_thinking` is a SUBSET of `output`, not a seventh",
    "class. `unattributed` is an honest bucket — requests before the first marker — never folded into a",
    "neighbouring stage.",
    "",
    quoteData("", table).trimStart(),
  ].join("\n");
}

function filesSection({ cost, repo, planEntries, dirtyBefore, dirtyNote }) {
  const base = cost && typeof cost.base_sha === "string" ? cost.base_sha : null;
  if (!base) return na("no cost.json, so no base SHA to diff against");
  if (base === "unknown") {
    return na("`base_sha` is the literal `unknown` — the run recorded an honest absence, so no diff is computable");
  }
  const changed = git(repo, ["diff", "--name-only", base]);
  const untracked = git(repo, ["ls-files", "--others", "--exclude-standard"]);
  if (changed === null && untracked === null) {
    return na(`git could not be read in this worktree, or \`${base}\` is not a commit here`);
  }
  const seen = [];
  for (const p of [...lines(changed), ...lines(untracked)]) if (!seen.includes(p)) seen.push(p);
  if (seen.length === 0) return na(`nothing changed since \`${base}\` and nothing is untracked`);

  const out = [
    `Changed since \`${base}\`, plus untracked files. **This is a changed-since-base observation, not a`,
    "record of what the build wrote** — a path can appear here because another stage, a generator, or a",
    "person touched it. A `not named in PLAN ## Files` marker is therefore not a scope violation; the",
    "scope question is `check-bash-reconcile.mjs`'s and this report never answers it.",
    "",
    dirtyNote,
    "",
    `Rendered before this run's commit and after \`cost.json\` was written, so \`cost.json\` appears below`,
    "and this report itself does not.",
    "",
  ];
  for (const p of seen) {
    const marks = [];
    if (dirtyBefore && dirtyBefore.has(p)) marks.push("dirty-before-run");
    const entry = planEntries.get(p);
    if (!entry) marks.push("not named in PLAN ## Files");
    out.push(`- \`${p}\`${marks.length ? ` — _${marks.join("; ")}_` : ""}`);
    if (entry) {
      // The PLAN line is untrusted DATA, copied VERBATIM — fenced rather than escaped, because escaping
      // it would make the copy not a copy (see the header).
      out.push("");
      out.push(indent(quoteData("planned purpose (PLAN.md), quoted as DATA:", entry.line), "  "));
      out.push("");
    }
  }
  return out.join("\n");
}

const indent = (s, pad) =>
  s
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");

function verdictsSection({ verify, regress, cost }) {
  const iters = cost && cost.outcome && cost.outcome.iterations;
  const label = typeof iters === "number" ? `iteration ${iters} (final)` : "the final iteration";
  const out = [
    `**${label} only.** \`/pharn-loop\` OVERWRITES \`verify-report.json\` and \`regression-report.json\``,
    "in place on every iteration, so earlier iterations' verdicts are not on disk at the stop and this",
    "report will not invent them. Per-iteration **cost** is genuine and is in `## Tokens` above.",
    "",
  ];
  if (!verify) {
    out.push(`- verify: ${na("no verify-report.json — the run stopped before a verify, or it was blocked")}`);
  } else {
    out.push(`- verify: \`${String(verify.verdict ?? "unknown")}\``);
    const fg = Array.isArray(verify.failing_gates) ? verify.failing_gates : [];
    out.push("");
    out.push(indent(quoteData("failing_gates, quoted as DATA:", fg.length ? fg.join("\n") : "(none)"), "  "));
    out.push("");
  }
  if (!regress) {
    out.push(`- regress: ${na("no regression-report.json — the run stopped before a regress, or it was blocked")}`);
  } else {
    out.push(`- regress: \`${String(regress.verdict ?? "unknown")}\``);
    const rg = Array.isArray(regress.regressions) ? regress.regressions : [];
    out.push("");
    out.push(
      indent(
        quoteData(
          "regressions, quoted as DATA:",
          rg.length ? rg.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("\n") : "(none)"
        ),
        "  "
      )
    );
  }
  return out.join("\n");
}

function handoffSection(loopText) {
  if (loopText === null) {
    return na("no LOOP.md — a stop that wrote no record has no Handoff to quote");
  }
  const { count, subs, nonEmpty, bodies } = handoffSections(loopText);
  if (count === 0) return na("LOOP.md has no `## Handoff` section");
  const out = [
    "Quoted verbatim from `LOOP.md`'s `## Handoff`, as untrusted DATA. Each block is fenced with a",
    "delimiter longer than any back-tick run inside it, so a heading in the quoted text stays text.",
    "**The Handoff is a run's own account of itself — it is not verified by anything**, and nothing here",
    "checks that it is accurate, complete, or useful.",
    "",
  ];
  if (count > 1) {
    out.push(`> \`LOOP.md\` carries ${count} \`## Handoff\` sections; only the first is quoted.`, "");
  }
  for (const want of HANDOFF_SECTIONS) {
    const i = subs.indexOf(want);
    out.push(`### ${want}`, "");
    if (i === -1) {
      out.push(na(`LOOP.md's Handoff has no \`### ${want}\` subsection`), "");
    } else if (!nonEmpty[i]) {
      out.push(na(`LOOP.md's \`### ${want}\` has no non-blank body`), "");
    } else {
      out.push(quoteData("", bodies[i]).trimStart(), "");
    }
  }
  const extras = subs.filter((s) => !HANDOFF_SECTIONS.includes(s));
  if (extras.length > 0) {
    out.push(quoteData(`Additional level-3 headings present in the Handoff, quoted as DATA:`, extras.join("\n")), "");
  }
  return out.join("\n").trimEnd();
}

// ── the renderer ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Render the report body for `<name>`.
 *
 * @param {string} name feature slug
 * @param {{base?: string, repo?: string}} [opts] `base` defaults to the IMPORTED `FEATURE_BASE`
 * @returns {string}
 */
export function renderRunReport(name, opts = {}) {
  const repo = opts.repo ?? ".";
  const base = opts.base ?? FEATURE_BASE;
  const dir = join(repo, base, name);

  const cost = readJson(join(dir, "cost.json"));
  const verify = readJson(join(dir, "verify-report.json"));
  const regress = readJson(join(dir, "regression-report.json"));

  const loopText = readTextOrNull(join(dir, "LOOP.md"));

  // The PLAN's `## Files` entries, read through the CANONICAL parser (L6: a structural fact comes from
  // its structured location, never a fresh grep).
  const planEntries = new Map(); // a Map, never a plain object keyed by an arbitrary path (L15)
  let planNote = "";
  const planText = readTextOrNull(join(dir, "PLAN.md"));
  if (planText === null) {
    planNote = "No PLAN.md was readable, so no planned purpose is shown.";
  } else {
    const parsed = pathsFromPlanFiles(planText);
    if (parsed.ok) {
      for (const e of parsed.entries) if (!planEntries.has(e.path)) planEntries.set(e.path, e);
    } else {
      planNote = `PLAN.md has no parseable \`## Files\` (${parsed.reason}), so no planned purpose is shown.`;
    }
  }

  // The pre-run dirty snapshot.
  const { set: dirtyBefore, note: dirtyNote } = readDirtySnapshot(repo, name);

  const parts = [
    `# RUN REPORT — ${name}`,
    "",
    // ── the preamble. UNCONDITIONAL: see the header's CHECK 5 note (L10). ──
    "Every line below is derived by `pharn/floor/render-run-report.mjs` from artifacts this run already",
    "produced. No line is authored by a model.",
    "",
    "**Trust split (P2).** The values this report reads from deterministic tool output — verdicts, exit",
    "codes, token counts, paths — are the enum-gated / floor-verifiable class. Everything shown inside a",
    "fenced block is **free text that inherits its source's untrusted tag** and is rendered as DATA:",
    "quoted for a person to read, never executed, and never an instruction to any later stage.",
    "",
    "**This report ANNOTATES a run and gates nothing.** No proceed/stop anywhere reads it. It is not a",
    "judgment that the change is good, correct, or worth its cost.",
    "",
  ];

  const bodyBySection = {
    "## Outcome": outcomeSection(cost),
    "## Tokens — stage x iteration x model": tokensSection(cost),
    "## Files": filesSection({ cost, repo, planEntries, dirtyBefore, dirtyNote }),
    "## Verdicts": verdictsSection({ verify, regress, cost }),
    "## What the run ran into": handoffSection(loopText),
  };

  for (const heading of SECTIONS) {
    parts.push(heading, "");
    if (heading === "## Files" && planNote) parts.push(planNote, "");
    parts.push(bodyBySection[heading], "");
  }

  return (
    parts
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}

/** Render and write `<base>/<name>/RUN-REPORT.md`. Returns the absolute-ish path written. */
export function writeRunReport(name, opts = {}) {
  const repo = opts.repo ?? ".";
  const out = join(repo, opts.base ?? FEATURE_BASE, name, "RUN-REPORT.md");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderRunReport(name, opts), "utf8");
  return out;
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 || i + 1 >= argv.length ? undefined : argv[i + 1];
}

function main(argv) {
  const positional = [];
  for (const a of argv) {
    if (a.startsWith("--")) break;
    positional.push(a);
  }
  const name = positional[0];
  if (!name || !SLUG_RE.test(name)) {
    console.error("RUN-REPORT: usage: render-run-report.mjs <name> [--base <dir>] [--repo <dir>] [--stdout]");
    console.error("RUN-REPORT: <name> must be a plain slug (a-z, 0-9, hyphen). Nothing written.");
    process.exit(2);
  }
  const repo = flag(argv, "--repo") ?? ".";
  // NO second default: `--base` absent means `renderRunReport`'s own `?? FEATURE_BASE` decides (L41/L52).
  const opts = { repo, base: flag(argv, "--base") };
  const dir = join(repo, opts.base ?? FEATURE_BASE, name);
  if (!existsSync(dir)) {
    console.error(`RUN-REPORT: no feature directory at ${dir} — nothing written.`);
    process.exit(2);
  }
  if (argv.includes("--stdout")) {
    process.stdout.write(renderRunReport(name, opts));
    process.exit(0);
  }
  const written = writeRunReport(name, opts);
  console.log(`RUN-REPORT: wrote ${written}`);
  console.log("RUN-REPORT: this file ANNOTATES the run — it gates nothing and is not a judgment of the change.");
  process.exit(0);
}

// `import.meta.main` — NOT a `file://` + argv[1] compare, and NOT `pathToFileURL(argv[1]).href` either.
// Both are BANNED by .dev/floor/entry-point-guard.test.mjs, which MEASURED them: the template silently
// no-ops on a spaced or non-ASCII path, and the pathToFileURL "repair" still no-ops through a symlink
// (L25 — the partial rationale that made ten files copy the wrong idiom).
if (import.meta.main) main(process.argv.slice(2));
