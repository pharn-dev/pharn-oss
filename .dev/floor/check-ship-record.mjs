#!/usr/bin/env node
// .dev/floor/check-ship-record.mjs — the per-PR "product bytes moved, so a green dev-chain record is in the PR"
// checker (build apparatus, 7.3.0, dev-verdict-discipline).
//
// WHAT IT ANSWERS: does a pull request that changes the bump-triggering product surface carry a `/pharn-dev-ship`
// record of a GREEN run — and does no record in it show a run that STOPPED on a red floor verdict? Its sibling
// `check-surface-bump.mjs` answers "did SKILLS_VERSION move"; this one answers "did the dev chain end green", over
// the SAME changed-path set (`readBase`, imported) and the SAME product-surface predicate (`isProductSurface`,
// imported) — one path set, one diff rule, never a second copy (L35).
//
// WHY THIS EXISTS (P7, measured — the 2026-11-03 review, HIGH "the practised dev loop has merged past red floor
// verdicts"): `.dev/features/scanner-redos-sweep-2/SHIP.md` records a verify FAIL the run "proceeded to review
// instead of stopping" under a brief's delegation (#377), `stage-agent-background-fix` merged with verify FAIL
// standing (#391), `loop-cost-6-73-2` recorded a PASS over a hand-substituted map (#392), and `verify-test-reuse`
// shipped a product bump with no stage run at all (#385). Every record said so honestly; nothing read them before
// merge. L20: a discipline-only rule that recurs earns a floor check.
//
// The GUARANTEE (P0, ARCHITECTURE §2 primitive #3 — glob membership, string equality, enum/regex; ZERO LLM):
//
//   - the changed-path set is check-surface-bump.mjs `readBase`'s (base commit → working tree, plus untracked);
//   - the product set is those paths `isProductSurface` admits, minus HUMAN_ONLY (the four trusted docs — the
//     agent's write tools are denied them, so an edit there is a human's and has no dev chain to record);
//   - a RECORD is a changed path `.dev/features/<slug>/SHIP.md` (slug by FEATURE_SLUG_RE) present at head;
//   - a record's VERDICT BLOCK is its column-0 lines keyed `verdict-grill` / `verdict-build` / `verdict-regress` /
//     `verdict-verify` / `run-ended`, outside code fences, parsed by `parseBlock` against one closed grammar
//     (BLOCK_KEYS, the value sets below; `.claude/commands/pharn-dev-ship.md` Step 3 spells it, and
//     `command-hygiene.test.mjs` checks every spelling there against BLOCK_TEMPLATES — L29/L36);
//   - GREEN iff the product set is empty, or at least one record is green AND matched, and no record is malformed or
//     not green. Green = every block value equals GREEN_VALUES. Matched = the record's own directory holds a
//     `verify-report.json` whose own `verdict` is "PASS", whose `feature` is the slug and which carries a
//     `gate_run.stamp_sha256` hex digest (the block `check-verify.mjs --stamp` emits), and a `regression-report.json`
//     whose own `verdict` is "no-regressions".
//
// The refusal states — the CLOSED set, exported as REFUSAL_STATES so the tests iterate it (L29):
//
//   exit 2 (the input is unusable): BAD_USAGE, BASE_UNREADABLE, HEAD_UNREADABLE — check-surface-bump.mjs's meanings
//   exit 1 (a verdict):
//   - NO_SHIP_RECORD   : product paths changed and no record in the PR is green and matched (none at all, only
//                        legacy records without a block, or only red ones)
//   - RECORD_MALFORMED : a record carries a block line, but not all five keys exactly once in the closed grammar
//   - RECORD_NOT_GREEN : a well-formed block records a STOP or a non-green verdict — shipping past a red verdict
//   - REPORT_MISMATCH  : a green block whose sibling reports are absent, unreadable, or disagree with it
//
// BOUNDS (P0 — each one says where the verdict stops; GATE 1 of dev-verdict-discipline asked for the first one to be
// stated plainly):
//   - PRESENCE, NOT COVERAGE. One green record satisfies a PR, so a PR can carry product changes no record covers: a
//     multi-feature or batch PR passes on one feature's green record while another change in it ran no chain. A
//     record WITHOUT a block (every SHIP.md written before 7.3.0) is legacy — neither green nor red — so a run that
//     omits the block entirely is caught only when it is the PR's only record.
//   - AGREEMENT, NOT PROVENANCE (L43). It reads committed records and committed reports. A green block next to a
//     PASS report proves they AGREE — never that the stages ran. `gate_run.stamp_sha256` is checked for SHAPE only:
//     the stamp it hashes is gitignored runtime state, absent in CI, so a hand-typed block passes.
//   - IT JUDGES ITSELF. A pull request runs its OWN copy of this checker and of `ci.yml`, so a PR can weaken the rule
//     it is judged by; review of `.dev/floor/**` and `.github/workflows/**` is the backstop, and the 2026-11-03 review
//     found no human review on gate-path PRs. An ADMIN MERGE bypasses required checks. It needs a BASE, so it is NOT
//     in `npm run check`; CI runs it on pull requests only, and direct pushes to `main` are unchecked.
//   - The HUMAN_ONLY exemption trusts the hook that denies those four paths to the write tools; a Bash edit reaches
//     them (pharn/LIMITS.md §6) and would be exempt here too.
//
// UNTRUSTED INPUT (P2). Refs are argv, gated by check-surface-bump.mjs `parseArgs`. Path names, SHIP.md text and
// both report JSONs are PR-controlled: lines are matched by fixed anchored regexes (no regex is built from input),
// JSON is read with own-property tests, files through lstat (a symlink is never followed — it reads as unreadable),
// capped at MAX_FILE_BYTES, and every quoted value is a string passed through `quote()` (L62).
//
// Usage:  node .dev/floor/check-ship-record.mjs (--base-ref <ref> | --merge-base <ref>) [targetDir]
// Non-LLM, stdlib-only, fail-closed. Apparatus: never ships to a user install, so no SKILLS_VERSION bump.

import "../../pharn/floor/runtime-floor.mjs";
import { lstatSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { quote } from "./changelog-core.mjs";
import { MAX_BUFFER } from "./check-changelog-entry.mjs";
import { isProductSurface, parseArgs, readBase, MAX_LISTED, QUOTE_LEN } from "./check-surface-bump.mjs";
import { FEATURE_SLUG_RE } from "../../pharn/floor/gate-run-core.mjs";

/** The four trusted docs: human-only (the write tools are denied them), so they need no dev-chain record. */
export const HUMAN_ONLY = Object.freeze(["pharn/CONSTITUTION.md", "pharn/ARCHITECTURE.md", "pharn/THREAT-MODEL.md", "pharn/LIMITS.md"]);
/** The stages a run can STOP at — /pharn-dev-ship Step 2's four floor verdicts. */
export const STOP_STAGES = Object.freeze(["grill", "build", "regress", "verify"]);
export const REGRESS_VALUES = Object.freeze(["no-regressions", "regressions", "inconclusive"]);
export const VERIFY_VALUES = Object.freeze(["PASS", "FAIL", "INCONCLUSIVE", "INCOMPLETE"]);
/** The five block keys, each required exactly once. */
export const BLOCK_KEYS = Object.freeze(["verdict-grill", "verdict-build", "verdict-regress", "verdict-verify", "run-ended"]);
/** What each key reads on a run that ended green at GATE 2. */
export const GREEN_VALUES = Object.freeze({
  "verdict-grill": "exit 0",
  "verdict-build": "exit 0",
  "verdict-regress": "no-regressions",
  "verdict-verify": "PASS",
  "run-ended": "GATE 2",
});
/** The spellings /pharn-dev-ship Step 3 must show — derived from the value sets above, so the command's table and
 *  this grammar cannot drift apart without command-hygiene.test.mjs failing (L35/L36). */
export const BLOCK_TEMPLATES = Object.freeze([
  "verdict-grill: exit <n>",
  "verdict-build: exit <n>",
  `verdict-regress: <${REGRESS_VALUES.join("|")}>`,
  `verdict-verify: <${VERIFY_VALUES.join("|")}>`,
  "verdict-<stage>: not-reached (<stage>)",
  "run-ended: GATE 2",
  "run-ended: STOP <stage>",
]);

/** The CLOSED set of non-GREEN outcomes, iterated by the tests (L29). */
export const REFUSAL_STATES = Object.freeze([
  "BAD_USAGE",
  "BASE_UNREADABLE",
  "HEAD_UNREADABLE",
  "NO_SHIP_RECORD",
  "RECORD_MALFORMED",
  "RECORD_NOT_GREEN",
  "REPORT_MISMATCH",
]);
export const INPUT_STATES = Object.freeze(["BAD_USAGE", "BASE_UNREADABLE", "HEAD_UNREADABLE"]);

/** One remedy per state, never a shared trailer (L27). */
export const FIX = Object.freeze({
  BAD_USAGE:
    "pass exactly one of --base-ref <ref> or --merge-base <ref>, then an optional target directory. A ref may use only letters, digits and . _ / ~ ^ @ { } - and must not start with '-'.",
  BASE_UNREADABLE:
    "make the base readable: fetch it first (git fetch --no-tags origin main), and make sure the ref names one commit holding SKILLS_VERSION.",
  HEAD_UNREADABLE: "run from — or pass as the target — the repository root.",
  NO_SHIP_RECORD:
    "run the change through /pharn-dev-ship to a green GATE 2 and commit its .dev/features/<name>/ record — SHIP.md with the Step 3 verdict block, verify-report.json and regression-report.json. A product change has no light mode.",
  RECORD_MALFORMED:
    "write the SHIP.md verdict block exactly as /pharn-dev-ship Step 3 spells it: the five keys, each once, at column 0, outside a code fence, each value from its closed set.",
  RECORD_NOT_GREEN:
    "this record shows a run that stopped on, or ended with, a red floor verdict. Fix the cause and re-run the stopped stage until the chain ends green at GATE 2 — never ship past the STOP, delegated or not.",
  REPORT_MISMATCH:
    "commit the verify-report.json and regression-report.json the green run wrote beside this SHIP.md: verify must read PASS from check-verify.mjs --stamp (with its gate_run block) for this feature, regress no-regressions. Never edit a report to agree.",
});

/** A report or record larger than this is unreadable here (P2 — bounded input). */
export const MAX_FILE_BYTES = 1 << 20;
const RECORD_RE = /^\.dev\/features\/([^/]+)\/SHIP\.md$/;
const BLOCK_LINE_RE = /^(verdict-[A-Za-z0-9-]*|run-ended):(.*?)\r?$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const EXIT_RE = /^exit (?:0|[1-9][0-9]{0,2})$/;
const NOT_REACHED_RE = new RegExp(`^not-reached \\((?:${STOP_STAGES.join("|")})\\)$`);
const STOP_RE = new RegExp(`^STOP (?:${STOP_STAGES.join("|")})$`);
const HEX64_RE = /^[0-9a-f]{64}$/;

/** Is `value` in key `key`'s closed grammar? */
export function valueOk(key, value) {
  if (key === "run-ended") return value === "GATE 2" || STOP_RE.test(value);
  if (NOT_REACHED_RE.test(value)) return true;
  if (key === "verdict-grill" || key === "verdict-build") return EXIT_RE.test(value);
  if (key === "verdict-regress") return REGRESS_VALUES.includes(value);
  if (key === "verdict-verify") return VERIFY_VALUES.includes(value);
  return false;
}

/**
 * Parse a SHIP.md text's verdict block. Returns { present, values: {key: value}, defects: [string] }.
 * `present` is false when no column-0 block line exists outside a code fence (a legacy record).
 */
export function parseBlock(text) {
  const seen = new Map();
  const defects = [];
  let fence = null;
  for (const line of text.split("\n")) {
    const f = line.match(FENCE_RE);
    if (f) {
      if (fence === null) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const m = line.match(BLOCK_LINE_RE);
    if (!m) continue;
    const key = m[1];
    if (!BLOCK_KEYS.includes(key)) {
      defects.push(`unknown key ${quote(key, 40)}`);
      continue;
    }
    if (!m[2].startsWith(" ") || m[2].startsWith("  ")) {
      defects.push(`${key}: the value must follow exactly one space`);
      continue;
    }
    const value = m[2].slice(1);
    if (seen.has(key)) {
      defects.push(`${key} repeated`);
      continue;
    }
    seen.set(key, value);
    if (!valueOk(key, value)) defects.push(`${key}: ${quote(value, 60)} is not in its closed set`);
  }
  const present = seen.size > 0 || defects.length > 0;
  if (present) for (const k of BLOCK_KEYS) if (!seen.has(k)) defects.push(`${k} missing`);
  return { present, values: Object.fromEntries(seen), defects };
}

/** Is a well-formed block green? */
export function isGreen(values) {
  return BLOCK_KEYS.every((k) => values[k] === GREEN_VALUES[k]);
}

/** Read a regular file (never through a symlink), capped. Returns the text or null. */
function readRegular(path) {
  try {
    const st = lstatSync(path);
    if (!st.isFile() || st.size > MAX_FILE_BYTES) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function readJsonObject(path) {
  const text = readRegular(path);
  if (text === null) return null;
  try {
    const v = JSON.parse(text);
    return v !== null && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

const own = (o, k) => (o !== null && typeof o === "object" && Object.hasOwn(o, k) ? o[k] : undefined);

/** Why the green record of `slug` does not match its reports, or null. */
export function reportDefect(target, slug) {
  const dir = join(target, ".dev", "features", slug);
  const verify = readJsonObject(join(dir, "verify-report.json"));
  if (verify === null) return "verify-report.json is absent or not a readable JSON object";
  if (own(verify, "verdict") !== "PASS") return "verify-report.json does not read verdict PASS";
  if (own(verify, "feature") !== slug) return "verify-report.json is not this feature's";
  const stampSha = own(own(verify, "gate_run"), "stamp_sha256");
  if (typeof stampSha !== "string" || !HEX64_RE.test(stampSha))
    return "verify-report.json carries no gate_run.stamp_sha256 (not written by check-verify.mjs --stamp)";
  const regress = readJsonObject(join(dir, "regression-report.json"));
  if (regress === null) return "regression-report.json is absent or not a readable JSON object";
  if (own(regress, "verdict") !== "no-regressions") return "regression-report.json does not read verdict no-regressions";
  return null;
}

/**
 * The pure-ish core over the changed paths (reads only the records and their reports under `target`).
 * Returns { ok, findings, stats }.
 */
export function judge({ paths, target }) {
  const surface = paths.filter((p) => isProductSurface(p) && !HUMAN_ONLY.includes(p));
  const humanOnly = paths.filter((p) => HUMAN_ONLY.includes(p));
  const findings = [];
  const records = [];
  if (surface.length === 0) return { ok: true, findings, stats: { compared: paths.length, surface, humanOnly, records } };
  for (const p of paths) {
    const m = p.match(RECORD_RE);
    if (!m || !FEATURE_SLUG_RE.test(m[1])) continue;
    const text = readRegular(join(target, p));
    if (text === null) continue; // deleted at head (or not a regular file): not a record of this PR
    const block = parseBlock(text);
    const rec = { path: p, slug: m[1], state: "legacy" };
    if (!block.present) {
      records.push(rec);
      continue;
    }
    if (block.defects.length) {
      rec.state = "malformed";
      findings.push({ type: "RECORD_MALFORMED", problem: `${quote(p, QUOTE_LEN)}: ${block.defects.join("; ")}.` });
    } else if (!isGreen(block.values)) {
      rec.state = "not-green";
      const shown = BLOCK_KEYS.map((k) => `${k}: ${block.values[k]}`).join(" · ");
      findings.push({ type: "RECORD_NOT_GREEN", problem: `${quote(p, QUOTE_LEN)} records ${quote(shown, 300)}.` });
    } else {
      const bad = reportDefect(target, m[1]);
      if (bad) {
        rec.state = "mismatch";
        findings.push({ type: "REPORT_MISMATCH", problem: `${quote(p, QUOTE_LEN)} is green but ${bad}.` });
      } else rec.state = "green";
    }
    records.push(rec);
  }
  if (!records.some((r) => r.state === "green")) {
    const listed = surface.slice(0, MAX_LISTED).map((p) => quote(p, QUOTE_LEN));
    const more = surface.length > MAX_LISTED ? ` … and ${surface.length - MAX_LISTED} more` : "";
    const legacy = records.filter((r) => r.state === "legacy").length;
    const why =
      records.length === 0
        ? "no .dev/features/<name>/SHIP.md is in the diff"
        : `none of its ${records.length} record(s) is green and matched (${legacy} without a verdict block)`;
    findings.push({
      type: "NO_SHIP_RECORD",
      problem: `${surface.length} product-surface path(s) changed but ${why}: ${listed.join(", ")}${more}.`,
    });
  }
  return { ok: findings.length === 0, findings, stats: { compared: paths.length, surface, humanOnly, records } };
}

const NOTE =
  `\nNOTE (P0): presence, not coverage — one green record satisfies a PR, so a PR can carry product changes no record\n` +
  `covers. A green record agreeing with its committed reports is AGREEMENT, never proof the stages ran, and on a pull\n` +
  `request this runs the PR's own copy of itself.\n`;

/** Render a verdict for a terminal (P2: every quoted value is a string through quote()). */
export function renderReport(res, source) {
  const src = source ? ` against the base (${source})` : "";
  if (res.ok) {
    const s = res.stats;
    if (s.surface.length === 0) {
      const human = s.humanOnly.length ? `; ${s.humanOnly.length} human-only trusted doc(s) changed, which need no record` : "";
      return `SHIP-RECORD: GREEN — no product-surface path that needs a dev-chain record changed (${s.compared} path(s) compared${human})${src}\n`;
    }
    const green = s.records.filter((r) => r.state === "green").map((r) => quote(r.path, QUOTE_LEN));
    return `SHIP-RECORD: GREEN — ${s.surface.length} product-surface path(s) changed; green record(s): ${green.join(", ")}${src}\n${NOTE}`;
  }
  let out = `SHIP-RECORD: RED — ${res.findings.length} finding(s)${src}\n`;
  for (const f of res.findings) out += `- [${f.type}] ${f.problem}\n    FIX (${f.type}): ${FIX[f.type]}\n`;
  return out + NOTE;
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: MAX_BUFFER, stdio: ["ignore", "pipe", "pipe"] });
}

/** CLI entry. Returns the exit code; writes through `io.out` so tests can run it in-process. */
export function main(argv = process.argv.slice(2), io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(s));
  const refuse = (type, problem, source) => {
    out(renderReport({ ok: false, findings: [{ type, problem }] }, source));
    return 2;
  };
  const args = parseArgs(argv);
  if (args.error) return refuse("BAD_USAGE", args.error);
  let isDir;
  try {
    isDir = statSync(args.target).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) return refuse("HEAD_UNREADABLE", `the target ${quote(args.target, 120)} is not a directory.`);
  let prefix;
  try {
    prefix = git(["rev-parse", "--show-prefix"], args.target).trim();
  } catch {
    prefix = "";
  }
  if (prefix !== "")
    return refuse("HEAD_UNREADABLE", `the target ${quote(args.target, 120)} is not the repository root (it is ${quote(prefix, 120)}).`);
  const base = readBase(args.base, args.target);
  if (base.error) return refuse("BASE_UNREADABLE", base.error);
  const res = judge({ paths: base.paths, target: args.target });
  out(renderReport(res, base.source));
  return res.ok ? 0 : 1;
}

if (import.meta.main) {
  process.exitCode = main();
}
