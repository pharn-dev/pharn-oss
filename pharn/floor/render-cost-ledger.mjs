#!/usr/bin/env node
// pharn/floor/render-cost-ledger.mjs — the deterministic EMITTER for `pharn/features/<name>/cost.json`,
// the per-run cost ledger (`pharn/pharn-contracts/cost-ledger.md`). Node stdlib only, no network, no
// model call.
//
// PURPOSE. `/pharn-loop` runs unattended and records no cost at all. Claude Code prunes transcripts on
// its own schedule (`cleanupPeriodDays`), so cost NOT captured at the stop is lost irreversibly — the
// 2026-08-18 measurement lost three features to exactly that (§9). This emitter captures it at the stop,
// for every stop, green or not, so a company can compute what a feature cost against ITS OWN price list.
//
// ── The governing principle: RECORD FACTS, DERIVE VIEWS ──────────────────────────────────────────────
// Two things are irrecoverable later: per-request usage, and phase boundaries. Both are recorded as
// facts. Every aggregate in the file (`totals`, `by_model`, `by_stage_iteration_model`, `unattributed`)
// is a PURE FUNCTION of `requests[]`, which is why `check-cost-ledger.mjs` can recompute all of them and
// compare. Phase attribution is a VIEW with a NAMED, VERSIONED method (`attribution.method`), so whether
// the platform's `attributionSkill` tags nested stages stops mattering: it is recorded raw, in
// `requests[].attribution_skill`, and nothing depends on it.
//
// ── WHY AN EMITTER AND NOT MODEL PROSE (the design fork, recorded) ───────────────────────────────────
// A model never retypes hundreds of numbers. This file WRITES `cost.json` itself — the
// `render-review-assignments.mjs` (#220) precedent, not the `render-cost-record.mjs` print-and-let-the-
// caller-Write one — because a single loop run produces ~275 request rows and transcription is the exact
// failure that precedent exists to prevent. The honest consequence, stated rather than glossed: this is
// a **Bash** write, outside the fix #7 `PreToolUse` gate (L19). It is declared in the plan's `## Files`
// and exempted by name in `pharn/floor/reconcile-ignore.json`, never described as gate-covered.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// FLOOR (primitive #3 + arithmetic):
//   * Records are deduplicated on `requestId`. LOAD-BEARING, not a nicety — one API response is written
//     to the transcript as several lines repeating the SAME usage object. Measured on this repo's own
//     `loop-decision-integrity` transcript: 552 raw assistant+usage records -> 275 deduped, a ~2.0x
//     over-count avoided. (The 2026-08-18 measurement recorded 2.34x over its own window.)
//   * Every `usage` leaf is number | bool | null | a short token; anything else is DROPPED and its key
//     path listed in `dropped[]`. Arrays are WALKED, not dropped (decision D1), so `usage` stays
//     genuinely verbatim.
//   * No string anywhere in the emitted file matches `ABS_PATH_RE`.
//   * Given the same transcript bytes AND the same markers bytes the output is byte-identical: no clock
//     read, no randomness. `window_*` come from the records' own timestamps, never `Date.now()`.
//     THE MARKERS HALF OF THAT CONJUNCTION IS LOAD-BEARING and was corrected after review: `markers[]`
//     is copied verbatim from a file whose `ts` values a DIFFERENT process wrote at wall-clock time, so
//     "same transcript bytes" alone would be a false quantifier (L37 — the quantifier is where the drift
//     lands).
// WHAT IS **NOT** GUARANTEED, and the distinction is the whole point:
//   * "no message content, no home paths" is a CONSEQUENCE of the three rules above, NOT a detector.
//     Message bodies are never read, so none can appear; `cwd` and `gitBranch` are never copied, so no
//     home path can. The claim "no usernames" is STRUCK and appears nowhere: no regex proves it.
//   * COVERAGE IS NEVER COMPLETE. `COVERAGE` has no `complete` member, for the same reason
//     `render-cost-record.mjs` has none — the stop's own turns, including this emission, are still being
//     written. The number is a floor on spend, never the total.
//   * It measures TOKENS, never DOLLARS. No price table is embedded, deliberately and permanently:
//     published prices change, a baked-in table would rot silently, and nothing here could floor-check
//     one. See `pricing_note` in the emitted file.
//   * "the markers describe what actually ran" is ADVISORY (see `mark-phase.mjs`).
//   * Coverage is MACHINE-LOCAL. The transcript lives outside the repo and is never committed, so a
//     fresh clone can reproduce nothing.
//
// ── SIZE, measured and disclosed rather than discovered later ────────────────────────────────────────
// A single 65-minute, one-iteration `STOP_GREEN` run emits ~393 KiB of pretty-printed JSON (275 rows;
// 402,567 bytes measured). The verbatim `usage` copy is ~263 KiB of that, and `usage.iterations[]` —
// walked per D1 — duplicates the numbers beside it. That cost was weighed at the plan gate and accepted
// for fidelity; it is stated here so a reader meets it at the artifact rather than in a diff.
//
// ── RELATIONSHIP TO `render-cost-record.mjs` (L35, answered rather than assumed) ─────────────────────
// Transcript LOCATION and the recursive file walk are IMPORTED from it — one implementation, not a copy.
// `pharn-cost-ledger/1` is nonetheless a distinct schema from the shipped `pharn-cost-record/1`, and the
// overlap is real: the record is an aggregate block embedded in `ship-record.json`, the ledger is a
// standalone per-request artifact. L35's prior question ("must the second copy exist?") is answered YES
// for now and NOT permanently — unifying them is the named `/pharn-ship` wiring follow-up. A ✧ parity
// test asserts the two agree on totals over the same bytes, with the class-name mapping made explicit
// (D4), so the pair cannot drift silently while both exist.
//
// Usage:
//   node pharn/floor/render-cost-ledger.mjs <name> [--base <dir>] [--repo <dir>] [--session <id>]
//                                           [--projects-dir <dir>] [--command <cmd>] [--base-sha <sha>]
//                                           [--markers-base <dir>] [--stdout]
// Exit codes: 0 = a ledger was written (including an honest `unavailable` one); 2 = bad usage.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { findTranscriptDirs, transcriptFiles } from "./render-cost-record.mjs";
import { DEFAULT_BASE as MARKERS_DEFAULT_BASE, MARKER_KINDS } from "./mark-phase.mjs";
import { FM_RE, stripBom } from "./frontmatter-core.mjs";

export const SCHEMA = "pharn-cost-ledger/1";

/** No `complete` member, by design — see the header. */
export const COVERAGE = Object.freeze(["partial", "unavailable"]);

/** The attribution VIEW's name and version. Bumping this is how a later, different method announces
 *  itself rather than silently reinterpreting old files (L42: timing is load-bearing). */
export const ATTRIBUTION_METHOD = "latest-marker-at-or-before-ts-same-session/1";

/** The six normalized token classes, 1:1 with the dimensions a published price list charges for.
 *  `output_thinking` is a SUBSET of `output`, not an addition to it — summing all six double-counts
 *  thinking tokens. The name says so; the contract says so; the checker does not "fix" it. */
export const TOKEN_CLASSES = Object.freeze(["input", "cache_write_5m", "cache_write_1h", "cache_read", "output", "output_thinking"]);

/** The CLOSED top-level key set. Membership is asserted in BOTH directions by `check-cost-ledger.mjs`:
 *  no extra key, no missing key. A per-member presence set would be satisfied by a variant spelling of
 *  any member (L36) — closure is what makes that fail. */
export const TOP_LEVEL_KEYS = Object.freeze([
  "schema",
  "name",
  "command",
  "base_sha",
  "outcome",
  "skills_version",
  "skills_version_source",
  "claude_code_versions",
  "sessions",
  "window_start",
  "window_end",
  "coverage",
  "coverage_note",
  "dedup_key",
  "attribution",
  "pricing_note",
  "markers",
  "requests",
  "totals",
  "by_model",
  "by_stage_iteration_model",
  "unattributed",
  "dropped",
]);

export const SKILLS_VERSION_SOURCES = Object.freeze(["pharn.config.json", "SKILLS_VERSION", "unknown"]);

/** A `usage` string leaf: a short, printable token. Applied ONLY after `cleanScalar` (L14 — compose the
 *  shape regex after the control-char guard, never instead of it). */
export const TOKEN_RE = /^[A-Za-z0-9._:+-]{1,64}$/;

/**
 * An absolute path: POSIX (`/Users/...`), home-relative (`~/...`), or a Windows drive (`C:\...`),
 * anchored at a string start or a delimiter.
 *
 * The anchor is load-bearing and is why this is not simply `/\//`: the schema token
 * `pharn-cost-ledger/1` contains a slash and must NOT match, while `/Users/someone/...` must. Probed
 * against both in the test rather than reasoned about (L37).
 */
export const ABS_PATH_RE = /(^|[\s"'`([{=,;])(~[/\\]|[A-Za-z]:[\\/]|\/[A-Za-z0-9._-]+\/)/;

export const PRICING_NOTE =
  "TOKENS ONLY — this file contains no prices and never will. Cost = Σ over classes of " +
  "tokens[class] × price(model, class, date, tier), computed by the reader against their OWN current " +
  "price list. `output_thinking` is a SUBSET of `output`, not an additional class — do not sum all six. " +
  "Any figure so derived is LIST-PRICE EQUIVALENT: a subscription is not billed per token, so it is what " +
  "this usage would have cost at list, not what was charged.";

const SYNTHETIC = "<synthetic>";

/** Control-char-free and bounded — the precondition, never the whole check (L14). */
function cleanScalar(v, maxLen) {
  if (typeof v !== "string") return false;
  if (v.length < 1 || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

const zeroTokens = () => Object.fromEntries(TOKEN_CLASSES.map((c) => [c, 0]));

/**
 * Walk a `usage` object, keeping only leaves the FLOOR rule admits.
 *
 * Arrays are WALKED like objects (D1), so `usage.iterations[]` survives and the contract's word
 * "verbatim" stays true. A leaf that is neither number, bool, null, nor a short token is DROPPED and its
 * key path pushed to `dropped` — an out-of-domain value is never coerced, never stringified, never
 * silently kept.
 */
export function sanitizeUsage(value, path, dropped) {
  if (value === null) return null;
  const t = typeof value;
  if (t === "number") return Number.isFinite(value) ? value : (dropped.push(path), undefined);
  if (t === "boolean") return value;
  if (t === "string") {
    if (cleanScalar(value, 64) && TOKEN_RE.test(value) && !ABS_PATH_RE.test(value)) return value;
    dropped.push(path);
    return undefined;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (let i = 0; i < value.length; i++) {
      const v = sanitizeUsage(value[i], `${path}[${i}]`, dropped);
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  if (t === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      const v = sanitizeUsage(value[k], path ? `${path}.${k}` : k, dropped);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  dropped.push(path); // function, symbol, bigint, undefined — not JSON, not admitted
  return undefined;
}

/** The six price-dimension classes, read from one raw `usage` object. */
export function normalizeTokens(u) {
  return {
    input: u.input_tokens ?? 0,
    cache_write_5m: u.cache_creation?.ephemeral_5m_input_tokens ?? 0,
    cache_write_1h: u.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    cache_read: u.cache_read_input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    output_thinking: u.output_tokens_details?.thinking_tokens ?? 0,
  };
}

function addTokens(acc, t) {
  for (const c of TOKEN_CLASSES) acc[c] += t[c] ?? 0;
  return acc;
}

/**
 * Read the markers file, tolerating a torn final line (the sibling renderer's posture — an interrupted
 * append is expected, not an error). Returns `[]` when there is no file, which is the recovery case and
 * a real state, not a failure.
 */
export function readMarkers(markersFile) {
  let text;
  try {
    text = readFileSync(markersFile, "utf8");
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue; // torn line from an interrupted append
    }
    if (!r || typeof r.seq !== "number" || !MARKER_KINDS.has(r.kind)) continue;
    out.push({
      seq: r.seq,
      kind: r.kind,
      stage: typeof r.stage === "string" ? r.stage : null,
      iteration: typeof r.iteration === "number" ? r.iteration : null,
      ts: typeof r.ts === "string" ? r.ts : null,
      session_id: typeof r.session_id === "string" ? r.session_id : null,
    });
  }
  return out.sort((a, b) => a.seq - b.seq);
}

/**
 * Attribute one request to a stage/iteration.
 *
 * THE VIEW, stated once: the latest marker whose `ts` is at-or-before the request's, in the SAME
 * session. Before the first such marker a request is `unattributed` — an honest bucket, never folded
 * into a neighbour. A `run-stop` or `orchestrator` marker carries no stage, so requests after it are
 * attributed to the orchestrator rather than to the stage that just finished; that is the whole reason
 * D5 chose the full marker set.
 *
 * BOUND, and it is inherent: the request that ISSUES a marker call necessarily precedes the marker it
 * writes, so at most one request per boundary lands on the earlier side. Stated, not corrected — the
 * correction would be a guess.
 */
export function attribute(markers, ts, sessionId) {
  let best = null;
  for (const m of markers) {
    if (m.ts === null || m.ts > ts) continue;
    if (m.session_id !== null && sessionId !== null && m.session_id !== sessionId) continue;
    if (best === null || m.ts > best.ts || (m.ts === best.ts && m.seq > best.seq)) best = m;
  }
  if (best === null) return { stage: null, iteration: null };
  return { stage: best.stage, iteration: best.iteration };
}

/** Read `outcome` from the LOOP.md ENVELOPE only — never grepped from the body (L6). A `decision:` line
 *  in prose is DATA about a record, not a declaration of one. Returns null when there is no record. */
export function readOutcome(loopPath) {
  let text;
  try {
    text = stripBom(readFileSync(loopPath, "utf8"));
  } catch {
    return null;
  }
  const m = text.match(FM_RE);
  if (!m) return null;
  const fields = new Map(); // a Map, never a plain object keyed by arbitrary input (L15)
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):[ \t]*(.*)$/);
    if (kv) fields.set(kv[1], kv[2].trim().replace(/^["']|["']$/g, ""));
  }
  const decision = fields.get("decision");
  if (typeof decision !== "string" || decision.length === 0) return null;
  const iterations = fields.get("iterations");
  const out = {
    decision,
    iterations: iterations !== undefined && /^\d+$/.test(iterations) ? Number(iterations) : null,
    source: "LOOP.md",
  };
  const blocked = fields.get("blocked");
  if (typeof blocked === "string" && blocked.length > 0) out.blocked = blocked;
  return out;
}

/** `skillsVersion` from an install's `pharn.config.json`, else this repo's `SKILLS_VERSION`, else an
 *  honest `unknown`. The SOURCE is recorded beside the value so a reader never has to guess which. */
export function readSkillsVersion(repo) {
  try {
    const cfg = JSON.parse(readFileSync(join(repo, "pharn.config.json"), "utf8"));
    if (typeof cfg.skillsVersion === "string" && cfg.skillsVersion.trim()) {
      return { version: cfg.skillsVersion.trim(), source: "pharn.config.json" };
    }
  } catch {
    // no config, or no skillsVersion in it — fall through to the repo file
  }
  try {
    const v = readFileSync(join(repo, "SKILLS_VERSION"), "utf8").trim();
    if (v) return { version: v, source: "SKILLS_VERSION" };
  } catch {
    // neither source present: an install that predates the key, or a bare directory
  }
  return { version: null, source: "unknown" };
}

function unavailableLedger({ name, command, baseSha, outcome, skills, markers, note }) {
  return {
    schema: SCHEMA,
    name,
    command,
    base_sha: baseSha,
    outcome,
    skills_version: skills.version,
    skills_version_source: skills.source,
    claude_code_versions: [],
    sessions: [],
    window_start: null,
    window_end: null,
    coverage: "unavailable",
    coverage_note: note,
    dedup_key: "requestId",
    attribution: { method: ATTRIBUTION_METHOD, markers: markers.length },
    pricing_note: PRICING_NOTE,
    markers,
    requests: [],
    totals: { requests: 0, tokens: zeroTokens() },
    by_model: [],
    by_stage_iteration_model: [],
    unattributed: { requests: 0, tokens: zeroTokens() },
    dropped: [],
  };
}

/** Build the ledger object. Pure over its inputs — no clock, no randomness. */
export function renderLedger({
  name,
  command = "/pharn-loop",
  baseSha = "unknown",
  repo = ".",
  sessionId,
  projectsDir,
  markersBase = MARKERS_DEFAULT_BASE,
  featureBase = "pharn/features",
}) {
  const markers = readMarkers(join(markersBase, name, "markers.jsonl"));
  const outcome = readOutcome(join(repo, featureBase, name, "LOOP.md"));
  const skills = readSkillsVersion(repo);
  const shell = (note) => unavailableLedger({ name, command, baseSha, outcome, skills, markers, note });

  if (!sessionId) return shell("no session id available (CLAUDE_CODE_SESSION_ID unset)");
  const hits = findTranscriptDirs(projectsDir, sessionId);
  if (hits.length === 0) return shell(`no transcript found for session ${sessionId} under ${projectsDir}`);
  if (hits.length > 1) {
    // A UUID colliding across directories is unreachable on a sane tree, but the BRANCH is live: a
    // malformed `--session` holding a path separator also lands here, and refusing is correct for both.
    // Do not delete it because the happy path cannot reach it (L51 — a guard deleted as "now
    // unreachable" is unreachable only under the reasoning that deleted it).
    return shell(`session ${sessionId} resolves to ${hits.length} transcript directories — refusing to guess which run to report`);
  }

  const projectDir = hits[0];
  const files = transcriptFiles(projectDir).filter((f) => {
    const rel = f.slice(projectDir.length + 1);
    return rel === `${sessionId}.jsonl` || rel.startsWith(`${sessionId}/`);
  });
  // A hit means `<dir>/<sessionId>.jsonl` STATTED, not that a transcript is readable out of `<dir>`:
  // the two matchers disagree on some inputs, and the file can be unlinked between them. Without this,
  // such a run renders `partial` with zero rows — a measurement that never happened, reported as a
  // cheap one. This is L51's exact defect and it is kept deliberately.
  if (files.length === 0) return shell(`no transcript found for session ${sessionId} under ${projectDir}`);

  const seen = new Set();
  const requests = [];
  const dropped = [];
  const versions = new Set();
  const sessions = new Set();
  let start = null;
  let end = null;

  for (const f of files) {
    let text;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      if (!line) continue;
      let r;
      try {
        r = JSON.parse(line);
      } catch {
        continue; // a torn final line while a session is live is expected, not an error
      }
      if (r?.type !== "assistant") continue;
      const u = r.message?.usage;
      if (!u) continue;
      const model = r.message?.model ?? "unknown";
      if (model === SYNTHETIC) continue; // not a real API call
      const id = r.requestId ?? r.message?.id;
      if (!id || seen.has(id)) continue; // THE dedup — load-bearing, see the header
      seen.add(id);

      const ts = typeof r.timestamp === "string" ? r.timestamp : null;
      const sid = typeof r.sessionId === "string" ? r.sessionId : null;
      // Both observed agent-id spellings, in a fixed precedence (L36 — a parameterized value acquires
      // variant spellings, and a set pinned to the one its author saw certifies only that one).
      const agentId = typeof r.agentId === "string" ? r.agentId : typeof r.attributionAgent === "string" ? r.attributionAgent : null;
      const where = ts === null ? { stage: null, iteration: null } : attribute(markers, ts, sid);
      const row = {
        request_id: String(id),
        ts,
        session_id: sid,
        model: String(model),
        sidechain: r.isSidechain === true,
        agent_id: agentId,
        attribution_skill: typeof r.attributionSkill === "string" ? r.attributionSkill : null,
        usage: sanitizeUsage(u, "usage", dropped),
        tokens: normalizeTokens(u),
        stage: where.stage,
        iteration: where.iteration,
      };
      requests.push(row);
      if (typeof r.version === "string") versions.add(r.version);
      if (sid) sessions.add(sid);
      if (ts !== null) {
        if (start === null || ts < start) start = ts;
        if (end === null || ts > end) end = ts;
      }
    }
  }

  requests.sort((a, b) =>
    a.ts === b.ts ? (a.request_id < b.request_id ? -1 : 1) : a.ts === null ? -1 : b.ts === null ? 1 : a.ts < b.ts ? -1 : 1
  );

  if (requests.length === 0) {
    const empty = shell(`transcript for session ${sessionId} carried no usage-bearing assistant records`);
    empty.dropped = dropped;
    return empty;
  }

  return {
    schema: SCHEMA,
    name,
    command,
    base_sha: baseSha,
    outcome,
    skills_version: skills.version,
    skills_version_source: skills.source,
    claude_code_versions: [...versions].sort(),
    sessions: [...sessions].sort(),
    window_start: start,
    window_end: end,
    coverage: "partial",
    coverage_note:
      "measured from this run's own session transcript; NEVER complete — the stop's own turns, including this emission, are still being written. A floor on spend, not the total.",
    dedup_key: "requestId",
    attribution: { method: ATTRIBUTION_METHOD, markers: markers.length },
    pricing_note: PRICING_NOTE,
    markers,
    requests,
    ...buildViews(requests),
    dropped,
  };
}

/** Every view, recomputed from `requests[]` alone. `check-cost-ledger.mjs` calls THIS function on the
 *  file's own rows and compares — so the checker and the emitter cannot disagree about what a view
 *  means, only about whether the stored one matches. Arrays, not keyed objects, so no arbitrary key
 *  ever indexes a plain object (L15). */
export function buildViews(requests) {
  const totals = { requests: 0, tokens: zeroTokens() };
  const unattributed = { requests: 0, tokens: zeroTokens() };
  const byModel = new Map();
  const byTriple = new Map();

  for (const r of requests) {
    totals.requests++;
    addTokens(totals.tokens, r.tokens);
    if (!byModel.has(r.model)) byModel.set(r.model, { model: r.model, requests: 0, tokens: zeroTokens() });
    const m = byModel.get(r.model);
    m.requests++;
    addTokens(m.tokens, r.tokens);

    if (r.stage === null) {
      unattributed.requests++;
      addTokens(unattributed.tokens, r.tokens);
    }
    const key = `${r.stage ?? ""}\u0000${r.iteration ?? ""}\u0000${r.model}`;
    if (!byTriple.has(key))
      byTriple.set(key, { stage: r.stage, iteration: r.iteration, model: r.model, requests: 0, tokens: zeroTokens() });
    const t = byTriple.get(key);
    t.requests++;
    addTokens(t.tokens, r.tokens);
  }

  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return {
    totals,
    by_model: [...byModel.values()].sort((a, b) => cmp(a.model, b.model)),
    by_stage_iteration_model: [...byTriple.values()].sort(
      (a, b) => cmp(a.stage ?? "", b.stage ?? "") || (a.iteration ?? 0) - (b.iteration ?? 0) || cmp(a.model, b.model)
    ),
    unattributed,
  };
}

/** The compact per-stage table `/pharn-loop` Step 7 prints. The FILE is the record; this screen copy is
 *  advisory and is regenerated from the same rows, never typed. */
export function table(ledger) {
  const rows = ledger.by_stage_iteration_model;
  const lines = [`cost ledger — ${ledger.name} (${ledger.coverage}, ${ledger.totals.requests} requests, dedup on ${ledger.dedup_key})`];
  if (rows.length === 0) return lines.concat("  (no attributed requests)").join("\n");
  const w = (s, n) => String(s).padEnd(n);
  const r = (s, n) => String(s).padStart(n);
  lines.push(`  ${w("stage", 18)}${r("iter", 5)}  ${w("model", 20)}${r("reqs", 6)}${r("cache_read", 12)}${r("output", 9)}`);
  for (const t of rows) {
    lines.push(
      `  ${w(t.stage ?? "(unattributed)", 18)}${r(t.iteration ?? "-", 5)}  ${w(t.model, 20)}${r(t.requests, 6)}${r(t.tokens.cache_read, 12)}${r(t.tokens.output, 9)}`
    );
  }
  lines.push(`  TOKENS ONLY — no prices here. Multiply by your own price list; output_thinking ⊂ output.`);
  return lines.join("\n");
}

function main(argv) {
  const opts = {
    name: null,
    base: null,
    repo: ".",
    sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? null,
    projectsDir: null,
    command: "/pharn-loop",
    baseSha: "unknown",
    markersBase: null,
    stdout: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--base") opts.base = argv[++i];
    else if (k === "--repo") opts.repo = argv[++i];
    else if (k === "--session") opts.sessionId = argv[++i];
    else if (k === "--projects-dir") opts.projectsDir = argv[++i];
    else if (k === "--command") opts.command = argv[++i];
    else if (k === "--base-sha") opts.baseSha = argv[++i];
    else if (k === "--markers-base") opts.markersBase = argv[++i];
    else if (k === "--stdout") opts.stdout = true;
    else if (k.startsWith("--")) {
      process.stderr.write(`render-cost-ledger: unknown argument ${k}\n`);
      return 2;
    } else if (opts.name === null) opts.name = k;
    else {
      process.stderr.write(`render-cost-ledger: unexpected argument ${k}\n`);
      return 2;
    }
  }
  if (!opts.name) {
    process.stderr.write("usage: node pharn/floor/render-cost-ledger.mjs <name> [--base <dir>] [--repo <dir>] [--session <id>]\n");
    return 2;
  }
  opts.projectsDir ??= process.env.CLAUDE_CONFIG_DIR
    ? join(process.env.CLAUDE_CONFIG_DIR, "projects")
    : join(homedir(), ".claude", "projects");

  // `--base` / `--markers-base` fall THROUGH to renderLedger's single defaults when absent. No second
  // copy of either default lives here — that is L41's defect verbatim, and one test exercises this
  // no-flag path precisely because every other test supplies the flags for hermeticity.
  const ledger = renderLedger({
    name: opts.name,
    command: opts.command,
    baseSha: opts.baseSha,
    repo: opts.repo,
    sessionId: opts.sessionId,
    projectsDir: opts.projectsDir,
    ...(opts.markersBase === null ? {} : { markersBase: opts.markersBase }),
    ...(opts.base === null ? {} : { featureBase: opts.base }),
  });

  const json = JSON.stringify(ledger, null, 2) + "\n";
  if (opts.stdout) {
    process.stdout.write(json);
    return 0;
  }
  const dir = join(opts.repo, opts.base ?? "pharn/features", opts.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cost.json"), json);
  process.stdout.write(table(ledger) + "\n");
  return 0;
}

// `import.meta.main` — NOT a `file://` + argv[1] compare (L25).
if (import.meta.main) process.exit(main(process.argv.slice(2)));
