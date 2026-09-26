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
// ONE kind of UNCHECKED untrusted value is rendered as an INLINE CODE SPAN, not a fence: a FILE PATH in a
// `## Files` bullet. Every other untrusted value that appears inline passed a closed test first: the command
// (COMMAND_RE), `base_sha` (COMMIT_RE, 6.21.2) and the verdict tokens (their enums). (A `verdict` token was a
// second UNCHECKED kind until 6.21.2, and a verdict string CAN carry a newline — probed: `"PASS\n\n## Briefing…"`
// rendered a duplicate `## Briefing`. Since 6.21.2 a verdict is rendered inline only when it is a member of its
// closed enum; any other value renders `unknown` and is quoted in a fence.)
// `/pharn-dev-review` found the unqualified claim and probed it: a
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
// ── A VALUE READ FROM JSON IS TYPE-CHECKED OR GOES THROUGH dataText() (6.21.2) ───────────────────────
// `cost.json`, `verify-report.json` and `regression-report.json` are parsed HERE, so any field can hold any
// JSON value. `String()` is not total over that domain: on a parsed object whose own `toString` is not
// callable (`{"toString": 1}`) it throws "Cannot convert object to primitive value", and a template literal or
// `Array#join` over it throws the same; a `null` entry in an array throws on the first property read. Both
// exited 1 with no report written — outside the exits documented below (a review finding, reproduced at
// 6.21.0 in `acGateLines`, `verdictsSection`, `outcomeSection`, `measurementLabel` and `tokensSection`). So a
// JSON value this file renders is either type- or membership-checked first (`typeof … === "string"`, an enum,
// COMMIT_RE) or goes through dataText(), and every array of entries is guarded element by element: a malformed
// entry is RENDERED as a marker row, never dropped (L34). BOUND, stated: the domain is those three files —
// `markers.jsonl` and `LOOP.md` are parsed by imported readers (render-cost-ledger.mjs, loop-record-core.mjs) —
// and the suite's closure test walks the nodes of ONE fixture that populates every section, so a field no
// fixture carries is not mutated. Size is covered as MEASURED, not as a universal: a value nested 20,000 deep
// and 250,000 token rows render and exit 0 (both are suite tests); exhausting memory or another engine limit
// by sheer size is not claimed.
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
//   node pharn/floor/render-run-report.mjs <name> [--base <dir>] [--repo <dir>] [--markers-base <dir>] [--stdout]
//
// Exit: 0 — the report was rendered (an honest `n/a` in any section is still a success).
//       2 — unusable input: no `<name>`, a `<name>` that is not a plain slug, or the feature dir is
//           absent. Fail-closed: nothing is written.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { FEATURE_BASE, TOKEN_CLASSES, LEGACY_SCHEMA, SHIP_COMMAND, readMarkers, normalizeMarkers } from "./render-cost-ledger.mjs";
import { DEFAULT_BASE as MARKERS_DEFAULT_BASE } from "./mark-phase.mjs";
import { verdictApplicability, APPLICABILITY, runMode } from "./ship-outcome-core.mjs";
import { handoffSections, HANDOFF_SECTIONS } from "./loop-record-core.mjs";
import { pathsFromPlanFiles } from "./plan-files-core.mjs";
import { quoteData, dataText } from "./quote-core.mjs";

// `quoteData` and `dataText` are IMPORTED, not defined here (GRILL G6, stage-regress-script): they moved
// byte-for-byte into `quote-core.mjs`, whose only import is `fenceFor` from `loop-record-core.mjs` (a
// module with no imports of its own), so a second renderer (`render-regression.mjs`) can quote untrusted
// text without pulling this file's cost-ledger load graph into its own. Re-exported here so this file's
// own existing tests keep exercising the one implementation (L35 — one owner, one test suite).
export { quoteData, dataText };

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
  "## Briefing",
  "## What the run ran into",
]);

/** A command token safe to render INLINE (outside a fence). `cost.command` is a CLI argument: the
 *  ledger bounds it to <=128 control-char-free chars and nothing more, so a back-tick or a pipe can
 *  reach this file. Every multi-line untrusted region here is fenced, but these two sections name the
 *  command in PROSE, so the token is membership-tested and the terminal fallback is a generic phrase —
 *  never a sanitized rewrite, which would misname the command (P5). */
const COMMAND_RE = /^\/[a-z0-9][a-z0-9-]{0,63}$/;

/** The emitting command, or an honest generic phrase. Read from `cost.json`'s own `command` field —
 *  the structured location, never inferred from which artifacts happen to exist (L6). */
export function commandLabel(cost) {
  const c = cost && typeof cost.command === "string" ? cost.command : null;
  return c !== null && COMMAND_RE.test(c) ? `\`${c}\`` : "the emitting command";
}

/** Rendered wherever an input is absent or unusable. One shape, so a reader learns it once. */
export function na(reason) {
  return `_n/a — ${reason}_`;
}

/** A JSON object that is not an array — the only shape an entry of a report's entry array may have. */
const isRecord = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** A git commit id, full or abbreviated (7–64 hex digits, either case — git accepts all of them, measured), the only
 *  `base_sha` this file hands to git or renders inline. `base_sha` is a cost.json value, and before 6.21.2 any string
 *  went into `git diff --name-only <base>` as an argument — measured: `--output=<file>` made git WRITE that file — and
 *  into an inline span, where a newline opens a heading. No member can start with `-` or hold a newline. NARROWED,
 *  stated: a symbolic ref (`HEAD`, a branch name) used to produce a diff and now renders `n/a`; no emitting command
 *  writes one (`/pharn-loop` and `/pharn-ship` record `git rev-parse HEAD`, or `unknown`). */
const COMMIT_RE = /^[0-9a-fA-F]{7,64}$/;

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

function outcomeSection(cost, absentReason = null) {
  if (absentReason) return na(absentReason);
  if (!cost) return na("no cost.json — a stop before the ledger was emitted records no outcome here");
  const o = cost.outcome;
  const rows = [
    ["decision", o && typeof o.decision === "string" ? o.decision : "unknown"],
    ["iterations", o && o.iterations !== null && o.iterations !== undefined ? dataText(o.iterations) : "unknown"],
    ["blocked", o && typeof o.blocked === "string" ? o.blocked : "none"],
    ["base", typeof cost.base_sha === "string" ? cost.base_sha : "unknown"],
    ["command", typeof cost.command === "string" ? cost.command : "unknown"],
    ["skills_version", typeof cost.skills_version === "string" ? cost.skills_version : "unknown"],
    ["ledger coverage", typeof cost.coverage === "string" ? cost.coverage : "unknown"],
    ["run membership", membershipStatus(cost)],
  ];
  const w = Math.max(...rows.map((r) => r[0].length));
  // Fenced, not a table: `decision` and `base_sha` are copied from untrusted sources (see the header).
  const body = rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join("\n");
  return [...outcomePreamble(cost, o), "", quoteData("", body).trimStart()].join("\n");
}

/**
 * How the `decision` above came to exist — read from `outcome.source`, the structured location, never
 * inferred from which sibling artifacts happen to be on disk (L6).
 *
 * THE FLOOR/ADVISORY SPLIT IS CARRIED HERE, beside the value, and that placement is the point (P0).
 * `/pharn-dev-grill` raised (G2) that the plan promised "the artifact carries the bound" without naming
 * a carrier, which would have left the label living only in a contract a reader of this report may
 * never open. A derived decision is two halves of different strength and they must not read as one.
 */
function outcomePreamble(cost, o) {
  const source = o && typeof o.source === "string" ? o.source : null;
  if (source === "LOOP.md") {
    return [
      "The `decision` below is copied verbatim from `LOOP.md`'s frontmatter by the ledger; this report",
      "introduces no second source of truth for it.",
    ];
  }
  if (source === "verdicts+markers") {
    return [
      `The \`decision\` below was **DERIVED** by the ledger, because ${commandLabel(cost)} writes no`,
      "`LOOP.md` to copy one from. It is read from this run's own verdict reports and phase markers —",
      "never from `SHIP.md` prose, which is a roll-up ABOUT a run, not a declaration of one.",
      "",
      "**The two forms are not equally strong (P0), and this report does not average them.**",
      "",
      "- `gate2` is **FLOOR**: it means `verify-report.json` read `PASS` **and**",
      "  `regression-report.json` read `no-regressions` — two enum values produced by tested non-LLM",
      "  checkers. Reaching GATE 2 hands the decision to a human; it is not itself a judgment.",
      "- `gate2-quick` is **FLOOR too, over a SMALLER stage set**: a `--quick` run whose OWN `pharn-verify`",
      "  stage-start read `PASS` at its latest iteration. **`gate2-quick` is NOT `gate2`** — quick mode",
      "  starts no `/pharn-regress` at all, so no regression verdict is read, ever, for this decision; a",
      "  `regression-report.json` left on disk by an earlier run is never consulted.",
      "- `stop:<stage>` is **ADVISORY** in its stage NAME: `<stage>` is the last `stage-start` marker,",
      "  and markers are written by Bash calls in command prose, outside the `PreToolUse` gate — so a",
      "  written marker does not mean the stage ran, nor the reverse. That the run did **not** meet the",
      "  `gate2`/`gate2-quick` test is a membership fact; which stage it stopped at rests on marker",
      "  discipline.",
      "- `stop:unknown` is the terminal fallback: markers exist but none is a `stage-start`.",
      "- `undetermined` means the run's own boundary could not be established from its markers, so no",
      "  verdict could be bound to THIS run — including a run that starts a non-verdict stage twice at one",
      "  iteration, which is what a skipped run-start can leave behind. It is neither a failed check nor a",
      "  stop stage.",
      "",
      "**Only verdicts that belong to THIS run count.** The stage set `gate2`/`gate2-quick` requires is the",
      "run's OWN mode (read from its run-start marker, never from the SPEC): a FULL run must have STARTED",
      "both `pharn-regress` and `pharn-verify` at its latest iteration; a QUICK run needs only",
      "`pharn-verify` — quick mode never starts `/pharn-regress`, so demanding it would make `gate2-quick`",
      "unreachable. Either way each one counts only AFTER that iteration's latest `pharn-build`",
      "stage-start, and reports an earlier run or attempt left on disk are excluded. This is exact",
      "relative to the recorded markers, which are themselves ADVISORY, and a stage that started but",
      "refused before rewriting its report is NOT detected.",
      "",
      "**Neither form says the outcome was correct.** Unlike `/pharn-loop`, whose recorded decision",
      "`check-loop-decision.mjs` re-derives from its own cited reports, there is no equivalent",
      "re-derivation here and none is claimed — a ship stop is a human gate or an orchestrator STOP, and",
      "no checker computes either.",
    ];
  }
  return [
    "`outcome.source` is absent or unrecognized, so this report says nothing about how the `decision`",
    "below was produced. Read it as unattributed rather than as either declared or derived.",
  ];
}

/** The measured POPULATION, as one token: the membership status, `legacy-session-scoped` for a `/1`
 *  ledger, or `unrecognized`. Read from the structured location, never inferred (L6). */
function membershipStatus(cost) {
  if (cost && cost.schema === LEGACY_SCHEMA) return "legacy-session-scoped";
  const s = cost && cost.membership && typeof cost.membership.status === "string" ? cost.membership.status : null;
  return s === "bounded" || s === "open" || s === "unknown" ? s : "unrecognized";
}

/**
 * WHAT THE NUMBERS BELOW MEASURE — carried in the artifact, beside the numbers (P0). A `/2` ledger counts
 * only requests inside the run window (`run-window/1`); a `/1` ledger counts the whole selected session;
 * an UNKNOWN window counts nothing and must never read as zero. The window's own values (timestamps, a
 * session id, a count) are copied from `cost.json` and so are fenced as DATA, never inlined in prose.
 */
function measurementLabel(cost) {
  const status = membershipStatus(cost);
  if (status === "legacy-session-scoped") {
    return [
      "**Measured population: LEGACY `pharn-cost-ledger/1` — SESSION-scoped.** These totals count every",
      "usage-bearing request of the selected session, so they may include activity OUTSIDE this run. They",
      "are not a run measurement.",
    ];
  }
  if (status === "unrecognized") {
    return ["**Measured population: unrecognized** — `cost.json` names no membership this report knows. Read the numbers as unscoped."];
  }
  const m = cost.membership;
  const facts = [
    `status             ${status}`,
    `window start       ${dataText(m.start ?? "none")}`,
    `window end         ${dataText(m.end ?? (status === "open" ? "OPEN (no run-stop)" : "none"))}`,
    `selected session   ${dataText(m.session ?? "none")}`,
    `excluded requests  ${m.excluded_requests === null || m.excluded_requests === undefined ? "n/a — nothing was measured" : dataText(m.excluded_requests)}`,
  ].join("\n");
  const note = typeof cost.coverage_note === "string" && cost.coverage_note ? cost.coverage_note : "(none recorded)";
  if (status === "unknown") {
    return [
      "**Run usage: UNKNOWN — this is NOT a zero.** The run's boundary could not be established from its",
      "markers, so NO session request is reported as run usage. The reason is recorded in `cost.json`'s",
      "`membership.reason`.",
      "",
      quoteData("", facts).trimStart(),
      "",
      quoteData("coverage_note, quoted as DATA:", note).trimStart(),
    ];
  }
  // A KNOWN window whose transcript could not be read (6.9.2, integration-review F1). The window was
  // bounded, but nothing inside it was MEASURED — so this must not render as a measured-and-empty window,
  // which a reader takes for a zero. Branches on `coverage` (the structured field), never on the note.
  if (cost.coverage === "unavailable") {
    return [
      "**Run usage: UNAVAILABLE — not measured, and NOT a zero.** The run window below is known, but no",
      "transcript could be read for it, so no request inside it was counted. The ledger says why:",
      "",
      quoteData("coverage_note, quoted as DATA:", note).trimStart(),
      "",
      quoteData("", facts).trimStart(),
    ];
  }
  return [
    "**Measured population: the RUN WINDOW** (`run-window/1`) — only requests of the selected session",
    "that fall inside the window below. Earlier and later activity in that session is excluded and",
    "counted, never summed. This is NOT a feature's lifetime cost, other sessions' requests are not",
    "collected, and the request that opened the window falls just before it. A floor on this run's",
    "spend, never the total.",
    ...(status === "open" ? ["", "**The window is OPEN** — no `run-stop` was recorded, so its end is unbounded."] : []),
    "",
    quoteData("", facts).trimStart(),
  ];
}

function tokensSection(cost, absentReason = null) {
  if (absentReason) return na(absentReason);
  if (!cost) return na("no cost.json — no token ledger was emitted for this run");
  const label = measurementLabel(cost);
  if (membershipStatus(cost) === "unknown") return label.join("\n");
  if (cost.coverage === "unavailable" && membershipStatus(cost) !== "legacy-session-scoped") return label.join("\n");
  const rows = Array.isArray(cost.by_stage_iteration_model) ? cost.by_stage_iteration_model : [];
  if (rows.length === 0) {
    const why =
      cost.coverage === "partial" && ["bounded", "open"].includes(membershipStatus(cost))
        ? "the run window contained no usage-bearing request — an OBSERVED zero for the measured window"
        : "cost.json carries no attributed rows — nothing was recorded against a stage";
    return [...label, "", na(why)].join("\n");
  }
  const head = ["stage", "iter", "model", "reqs", ...TOKEN_CLASSES];
  // A row that is not an object is RENDERED as a marker, never dropped and never read (a `null` row threw here).
  const body = rows.map((t) =>
    isRecord(t)
      ? [
          dataText(t.stage ?? "(unattributed)"),
          dataText(t.iteration ?? "-"),
          dataText(t.model ?? "unknown"),
          dataText(t.requests ?? 0),
          ...TOKEN_CLASSES.map((c) => dataText((t.tokens && t.tokens[c]) ?? 0)),
        ]
      : ["(not a row)", "-", "-", "-", ...TOKEN_CLASSES.map(() => "-")]
  );
  const totals = cost.totals ?? {};
  const unattr = cost.unattributed ?? {};
  body.push([
    "TOTAL",
    "-",
    "-",
    dataText(totals.requests ?? 0),
    ...TOKEN_CLASSES.map((c) => dataText((totals.tokens && totals.tokens[c]) ?? 0)),
  ]);
  body.push([
    "unattributed",
    "-",
    "-",
    dataText(unattr.requests ?? 0),
    ...TOKEN_CLASSES.map((c) => dataText((unattr.tokens && unattr.tokens[c]) ?? 0)),
  ]);
  // A loop, not `Math.max(...column)`: spreading one argument per row threw a RangeError near 200k rows (GRILL G1).
  const widths = head.map((h, i) => body.reduce((w, r) => Math.max(w, r[i].length), h.length));
  const fmt = (r) =>
    r
      .map((c, i) => (i <= 2 ? c.padEnd(widths[i]) : c.padStart(widths[i])))
      .join("  ")
      .trimEnd();
  const table = [fmt(head), widths.map((n) => "-".repeat(n)).join("  "), ...body.map(fmt)].join("\n");
  return [
    ...label,
    "",
    "Copied from `cost.json`'s stored views, never recomputed here — `check-cost-ledger.mjs` already",
    "holds those views to a recompute from `requests[]`, so this is one number with one owner.",
    "",
    "**TOKENS ONLY.** There is no price table here or in `cost.json`; money is the reader's own",
    "multiplication against their own list, and `output_thinking` is a SUBSET of `output`, not a seventh",
    "class. `unattributed` is an honest STAGE bucket — run requests before the first stage marker — never",
    "folded into a neighbouring stage.",
    "",
    quoteData("", table).trimStart(),
  ].join("\n");
}

function filesSection({ cost, repo, planEntries, dirtyBefore, dirtyNote, absentReason = null }) {
  if (absentReason) return na(absentReason);
  const base = cost && typeof cost.base_sha === "string" ? cost.base_sha : null;
  if (!base) return na("no cost.json, so no base SHA to diff against");
  if (base === "unknown") {
    return na("`base_sha` is the literal `unknown` — the run recorded an honest absence, so no diff is computable");
  }
  // Membership BEFORE git sees it: an argument that is not a commit id could be a git OPTION (see COMMIT_RE). The
  // value is not echoed — it is untrusted and failed its shape.
  if (!COMMIT_RE.test(base)) {
    return na("`base_sha` is not a commit id (7 to 64 hex digits), so it is never handed to git and no diff is computed");
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
    "Rendered after `cost.json` was written and before any commit this run may make, so `cost.json`",
    "appears below and this report itself does not.",
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

/**
 * For a `/pharn-ship` ledger: the SAME applicability the derived `outcome` used, computed from the
 * ledger's own recorded `markers[]` by the SAME function (`ship-outcome-core.mjs` — imported, never
 * re-derived here, [[L35]]). A report the outcome refused must not appear below as an unqualified current
 * verdict. Returns the label lines, or [] when the reports are current or the command is not ship.
 */
function applicabilityLabel(cost) {
  if (!cost || cost.command !== SHIP_COMMAND || !Array.isArray(cost.markers)) return [];
  const app = verdictApplicability(cost.markers);
  if (app.status === APPLICABILITY.CURRENT) return [];
  const head =
    app.status === APPLICABILITY.UNKNOWN
      ? "**CANNOT BE BOUND TO THIS RUN — excluded from the outcome.** The run's boundary could not be"
      : "**NOT FROM THIS RUN — excluded from the outcome.** The reports below were left on disk by an";
  const tail =
    app.status === APPLICABILITY.UNKNOWN
      ? "established from its markers. The verdicts are shown only as diagnostics."
      : "earlier run or attempt. They are shown only as diagnostics, never as this run's verdicts.";
  // A HISTORICAL ledger may have STORED `gate2` from exactly these reports — one derived before 6.9.1's
  // current-run rule, OR one derived after it but before 6.24.0's build-order and no-repeat conditions. The
  // label names no single rule as the one it predates (GATE-2 re-review N2: "predates this applicability rule
  // (6.9.1)" mis-dated a 6.20.0 ledger the new conditions exclude); the quoted reason below names the rule
  // that excludes it. Its stored value is never rewritten (compatibility), but the two sections must not
  // silently disagree.
  const legacy =
    cost.outcome && cost.outcome.decision === "gate2"
      ? [
          "",
          "**The stored `gate2` above predates the applicability rules in force today** (6.9.1's current-run",
          "rule; 6.24.0's build-order and no-repeat conditions — the reason below names the one that excludes",
          "it) and rests on these same reports; it would not be derived as `gate2` today. It is kept as",
          "recorded, not rewritten.",
        ]
      : [];
  return [head, tail, ...legacy, "", quoteData("", `applicability  ${app.status}\nreason         ${app.reason ?? "none"}`).trimStart(), ""];
}

/** Is this ledger a QUICK `/pharn-ship` run's (6.24.0)? Read from the ledger's own recorded markers through the
 *  derivation's `runMode()` — never from which artifacts exist (L6). ONE definition for the two sections that
 *  branch on it, `## Verdicts` and `## Briefing` (L35). A stale or absent ledger is never quick: its markers
 *  are another run's, so the caller passes `null`. */
function isQuickShip(cost) {
  return Boolean(cost) && cost.command === SHIP_COMMAND && Array.isArray(cost.markers) && runMode(cost.markers) === "quick";
}

function verdictsSection({ verify, regress, cost, stale = false }) {
  const iters = cost && cost.outcome && cost.outcome.iterations;
  const label = typeof iters === "number" ? `iteration ${iters} (final)` : "the final iteration";
  const out = [
    ...(stale
      ? [
          "**No current ledger — see STALE LEDGER above.** The reports below are simply the files in this",
          "directory; with no ledger for this run, nothing binds them to it.",
          "",
        ]
      : []),
    ...applicabilityLabel(cost),
    `**${label} only.** ${commandLabel(cost)} OVERWRITES \`verify-report.json\` and \`regression-report.json\``,
    "in place whenever it re-runs those stages, so earlier iterations' verdicts are not on disk at the",
    "stop and this",
    "report will not invent them. Per-iteration **cost** is genuine and is in `## Tokens` above.",
    "",
  ];
  if (!verify) {
    out.push(`- verify: ${na("no verify-report.json — the run stopped before a verify, or it was blocked")}`);
  } else {
    out.push(...verdictLines("verify", verify.verdict, VERIFY_VERDICTS));
    const fg = Array.isArray(verify.failing_gates) ? verify.failing_gates : [];
    out.push("");
    out.push(indent(quoteData("failing_gates, quoted as DATA:", fg.length ? fg.map(dataText).join("\n") : "(none)"), "  "));
    out.push("");
    out.push(...acGateLines(verify.ac_gate));
  }
  // A quick `/pharn-ship` run starts no `/pharn-regress` at all (6.24.0), so a `regression-report.json` on
  // disk — left by an earlier full run over the same feature directory, say — is NEVER this run's regress
  // verdict. Read from the STRUCTURED location (the run's own mode, from its markers), never inferred from
  // whether a report happens to exist (L6) — the same discipline `outcome.source` already gets above.
  if (isQuickShip(cost)) {
    out.push("- regress: not part of this run: a quick `/pharn-ship` run starts no `/pharn-regress`");
  } else if (!regress) {
    out.push(`- regress: ${na("no regression-report.json — the run stopped before a regress, or it was blocked")}`);
  } else {
    out.push(...verdictLines("regress", regress.verdict, REGRESS_VERDICTS));
    const rg = Array.isArray(regress.regressions) ? regress.regressions : [];
    out.push("");
    out.push(indent(quoteData("regressions, quoted as DATA:", rg.length ? rg.map(dataText).join("\n") : "(none)"), "  "));
  }
  return out.join("\n");
}

/** The two reports' closed verdict enums (check-verify.mjs, check-regress.mjs), restated ONLY as the render guard, as
 *  AC_VERDICTS is below. A verdict is the one untrusted value this section puts in an INLINE span, and a string can
 *  carry a newline an inline span cannot hold (the header's EXCEPTION), so only a member is rendered inline. A THIRD
 *  copy (check-loop.mjs and check-ship.mjs keep their own; none is exported), accepted because drift fails SAFE: a
 *  verdict added upstream renders `unknown` here, with its value quoted — never inline, never dropped. */
const VERIFY_VERDICTS = new Set(["FAIL", "INCOMPLETE", "INCONCLUSIVE", "PASS"]);
const REGRESS_VERDICTS = new Set(["inconclusive", "no-regressions", "regressions"]);

/** `- <name>: \`<verdict>\`` for a member; `unknown` for an absent verdict, as before 6.21.2; and for any other value,
 *  `unknown` plus the value quoted as DATA in a fence — shown, never dropped, never inline. */
function verdictLines(name, value, members) {
  if (typeof value === "string" && members.has(value)) return [`- ${name}: \`${value}\``];
  if (value === undefined || value === null) return [`- ${name}: \`unknown\``];
  return [
    `- ${name}: \`unknown\` — the report's \`verdict\` is not one of {${[...members].join(", ")}}`,
    "",
    indent(quoteData("verdict, quoted as DATA:", dataText(value)), "  "),
  ];
}

/** The AC gate's closed enums (ac-gate-core.mjs), restated ONLY as the render guard: a value outside them is shown as
 *  `unknown`, never interpolated inline — the block itself is DATA from a report a model could have edited. */
const AC_MODES = new Set(["bootstrap", "not-applicable", "test-first"]);
const AC_VERDICTS = new Set(["FAIL", "INCONCLUSIVE", "NOT-APPLICABLE", "PASS"]);

/**
 * The per-AC table (6.20.0) — the verify report's `ac_gate` block, one row per criterion, as a FENCED DATA block: test
 * ids and titles come from the project's reporter, and this file never renders untrusted text as a markdown table (its
 * header's measured reason). The block is copied, never recomputed. Inside /pharn-loop, check-loop-fresh.mjs check E
 * binds it to what check-verify.mjs computes from the stamp; a /pharn-ship run has no such binding, so there it is
 * whatever verify-report.json holds (REVIEW finding 10).
 */
function acGateLines(ac) {
  if (ac === null || typeof ac !== "object" || Array.isArray(ac)) {
    return [
      `- acceptance criteria: ${na("verify-report.json carries no ac_gate — /pharn-verify ran without --ac-gate, or before 6.20.0")}`,
      "",
    ];
  }
  const mode = AC_MODES.has(ac.mode) ? ac.mode : "unknown";
  const verdict = AC_VERDICTS.has(ac.verdict) ? ac.verdict : "unknown";
  const rows = [];
  // An entry that is not an object is RENDERED as a marker row, never read (a `null` entry threw here — the review's
  // finding) and never dropped (a malformed entry and an absent one must not look the same, L34).
  for (const a of Array.isArray(ac.acs) ? ac.acs : []) {
    if (!isRecord(a)) {
      rows.push(`(not an AC entry)  ${dataText(a)}`);
      continue;
    }
    const tests = Array.isArray(a.tests) && a.tests.length ? a.tests.map(dataText).join(" | ") : "(no matched test)";
    rows.push(
      `${dataText(a.id)}  ${dataText(a.level)}  ${dataText(a.status)}  ${a.reason === null ? "delivered" : dataText(a.reason)}  ${tests}`
    );
  }
  for (const e of Array.isArray(ac.evidence) ? ac.evidence : []) {
    rows.push(isRecord(e) ? `evidence  ${dataText(e.reason)}  ${dataText(e.detail)}` : `evidence  (not an evidence entry)  ${dataText(e)}`);
  }
  if (typeof ac.reason === "string") rows.push(`reason  ${ac.reason}`);
  if (typeof ac.note === "string") rows.push(`note  ${ac.note}`);
  return [
    `- acceptance criteria: \`${verdict}\` (${mode})`,
    "",
    indent(
      quoteData(
        "the AC gate — id, level, status, reason, matched test ids — quoted as DATA:",
        rows.length ? rows.join("\n") : "(no criteria)"
      ),
      "  "
    ),
    "",
  ];
}

/**
 * A POINTER to the GATE-2 briefing, never a copy of it.
 *
 * Only EXISTENCE is tested; no byte of `BRIEFING.md` is read into this report. That is deliberate on two
 * counts. (1) P4 — `pharn/pharn-contracts/ship-briefing.md` defines what the artifact is and what it is
 * not; restating any of it here would create a second description to keep in sync ([[L35]]). (2) P2 — the
 * briefing may carry a bounded, always-labeled model-synthesized paragraph, and quoting untrusted prose
 * into a second artifact widens its reach for no gain when a link reaches the same reader.
 *
 * An absent briefing is a REAL state, not a failure: `/pharn-ship` renders it only after a `PASS` verify,
 * and `/pharn-loop` never renders one at all. The section is emitted UNCONDITIONALLY with an honest `n/a`
 * rather than dropped, because a missing section and an absent artifact must not look the same ([[L34]]:
 * silence and asserted-silence are different claims).
 *
 * A QUICK `/pharn-ship` ledger (6.24.0) never links one: quick mode renders no `BRIEFING.md`, so a file of
 * that name beside the report was written by an EARLIER run over the same feature directory, and linking it
 * as "the GATE-2 briefing, rendered beside this report" would present that run's briefing — and the regress
 * verdict it carries — as this run's (GATE-2 review). Read from the run's own mode, from the ledger's
 * recorded markers, never from whether the file exists (L6) — the `## Verdicts` regress line's rule.
 */
function briefingSection({ dir, cost }) {
  const rel = join(dir, "BRIEFING.md");
  if (isQuickShip(cost)) {
    return [
      "- `BRIEFING.md`: not part of this run: a quick `/pharn-ship` run renders no `BRIEFING.md`.",
      ...(existsSync(rel)
        ? [
            "",
            "The `BRIEFING.md` in this directory was written by an EARLIER run, so it is not linked here and describes no part of this run.",
          ]
        : []),
    ].join("\n");
  }
  if (!existsSync(rel)) {
    // The sentinel states THIS artifact's absence and nothing else. It must NOT explain the emitting
    // command's lifecycle: the earlier form read "<command> renders one only at GATE 2", which is false
    // for `/pharn-loop` — a command that has no GATE 2 and never renders a briefing at all. A renderer
    // whose claim is that every line is DERIVED cannot afford a derived line that is wrong for one of
    // its two callers (REVIEW finding F1, fixed before the gate rather than deferred).
    return na(
      "no BRIEFING.md beside this report — not every command renders one, and a run that stops before its post-verify gate never does"
    );
  }
  return [
    "- [`BRIEFING.md`](./BRIEFING.md) — the GATE-2 briefing, rendered beside this report.",
    "",
    "**Linked, not quoted.** No byte of it is copied here, and this report makes no claim about its",
    "contents. What that artifact is — and what it is not — is defined once in",
    "`pharn/pharn-contracts/ship-briefing.md`; its own frontmatter is cross-verified against its sources",
    "by `pharn/floor/check-ship-briefing.mjs`, which annotates and gates nothing.",
  ].join("\n");
}

function handoffSection(loopText, cost) {
  if (loopText === null) {
    const source = cost && cost.outcome && cost.outcome.source;
    // A DERIVED outcome means the emitting command writes no record, so the absence is BY DESIGN. The
    // older single message read "a stop that wrote no record", which invites a reader to hunt for a
    // record that was never owed — an honest `n/a` must say WHICH of the two states it is.
    if (source === "verdicts+markers") {
      return na(`${commandLabel(cost)} writes no \`LOOP.md\`, so this run has no Handoff BY DESIGN — nothing is missing`);
    }
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
/** The latest `run-start` in a marker list (by `seq`), as `{seq, ts}`, or `null`. */
function latestRunStart(markers) {
  let best = null;
  for (const m of normalizeMarkers(markers)) if (m.kind === "run-start" && (best === null || m.seq > best.seq)) best = m;
  return best === null ? null : { seq: best.seq, ts: best.ts };
}

/**
 * Is `cost.json` the CURRENT run's ledger? (6.9.2, integration-review F2.)
 *
 * A failed emission leaves the PREVIOUS run's `cost.json` on disk; `check-cost-ledger.mjs` is GREEN on it,
 * because internal consistency is all it certifies ([[L43]]), and this report used to render it as the
 * current run's. So the ledger is bound to its referent: the LIVE markers file's latest `run-start` must
 * be the SAME marker (`seq` AND `ts` — identity, not "greater", so a reset `.pharn/` that restarts `seq`
 * cannot make an old ledger read as current, GRILL finding 1) as the latest one the ledger recorded.
 *
 *  - `current`   — identical latest run-start.
 *  - `stale`     — they differ, or the live file has one and the ledger recorded none: a later run started
 *                  and wrote no ledger of its own.
 *  - `unchecked` — no live markers file / no live run-start: nothing to bind against, stated, never
 *                  treated as proven current ([[L34]]).
 *
 * BOUND: blind when the failed run wrote no `run-start` either. Markers are advisory (Bash-written).
 * Never uses a file's mtime ([[L42]]).
 */
export function ledgerCurrency(cost, liveMarkers) {
  const live = latestRunStart(liveMarkers);
  if (live === null) return { state: "unchecked", reason: "no live run-start marker to compare against" };
  const rec = latestRunStart(cost && Array.isArray(cost.markers) ? cost.markers : []);
  if (rec !== null && rec.seq === live.seq && rec.ts === live.ts) return { state: "current", reason: null };
  return {
    state: "stale",
    reason: `the live markers' latest run-start (seq ${live.seq}) is not the one this cost.json recorded (${rec === null ? "none" : `seq ${rec.seq}`}) — a later run started and emitted no ledger of its own`,
  };
}

export function renderRunReport(name, opts = {}) {
  const repo = opts.repo ?? ".";
  const base = opts.base ?? FEATURE_BASE;
  const dir = join(repo, base, name);
  // The live markers, under the ONE markers default (`mark-phase.mjs`'s DEFAULT_BASE) resolved against
  // `repo` — no second literal here (L41).
  const markersBase = opts.markersBase ?? join(repo, MARKERS_DEFAULT_BASE);

  const cost = readJson(join(dir, "cost.json"));
  const currency = cost ? ledgerCurrency(cost, readMarkers(join(markersBase, name, "markers.jsonl"))) : null;
  const staleReason =
    currency && currency.state === "stale"
      ? "STALE LEDGER — cost.json describes an EARLIER run, not this one; its values are not shown as current"
      : null;
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
  if (currency && currency.state === "stale") {
    parts.push(
      "**STALE LEDGER.** The `cost.json` in this directory belongs to an EARLIER run: this run emitted no",
      "ledger of its own (its emission failed or was skipped). Its outcome, tokens and base are therefore",
      "NOT shown as this run's. `check-cost-ledger.mjs` can still be GREEN on that file — it certifies",
      "internal consistency, never which run the file describes.",
      "",
      quoteData("", `currency  stale\nreason    ${currency.reason}`).trimStart(),
      ""
    );
  } else if (currency && currency.state === "unchecked") {
    parts.push(
      "_Ledger currency not checked — no live phase-marker file with a run-start was found, so whether",
      "`cost.json` belongs to this run could not be established._",
      ""
    );
  }

  const bodyBySection = {
    "## Outcome": outcomeSection(cost, staleReason),
    "## Tokens — stage x iteration x model": tokensSection(cost, staleReason),
    "## Files": filesSection({ cost, repo, planEntries, dirtyBefore, dirtyNote, absentReason: staleReason }),
    "## Verdicts": verdictsSection({ verify, regress, cost: staleReason ? null : cost, stale: Boolean(staleReason) }),
    "## Briefing": briefingSection({ dir, cost: staleReason ? null : cost }),
    "## What the run ran into": handoffSection(loopText, cost),
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
    console.error("RUN-REPORT: usage: render-run-report.mjs <name> [--base <dir>] [--repo <dir>] [--markers-base <dir>] [--stdout]");
    console.error("RUN-REPORT: <name> must be a plain slug (a-z, 0-9, hyphen). Nothing written.");
    process.exit(2);
  }
  const repo = flag(argv, "--repo") ?? ".";
  // NO second default: `--base` absent means `renderRunReport`'s own `?? FEATURE_BASE` decides (L41/L52).
  const opts = { repo, base: flag(argv, "--base"), markersBase: flag(argv, "--markers-base") ?? undefined };
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
