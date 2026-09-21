#!/usr/bin/env node
// pharn/floor/check-cost-ledger.mjs — the deterministic CHECKER for a `pharn-cost-ledger/1` record
// (`pharn/pharn-contracts/cost-ledger.md`). Node stdlib only, no network, no model call.
//
// ── WHAT THIS CERTIFIES, AND THE BOUND IS THE WHOLE POINT (P0, L43) ──────────────────────────────────
// This checks the file's INTERNAL CONSISTENCY. It does NOT check that `requests[]` matches the
// transcript. Those are different claims, and the gap between them is exactly the failure class L43
// records: a consistency check over several stores of one fact certifies their AGREEMENT, never the
// FACT — they can all be wrong together. A ledger whose rows were fabricated, and whose views were then
// computed from those fabricated rows, is GREEN here. It is self-consistent and it is false.
//
// `--verify-transcript` is the referent-binding half: it re-derives `requests[]` from the live
// transcript and compares. That mode is a genuine floor primitive and it is USABLE ONLY WHILE THE
// TRANSCRIPT EXISTS — machine-local and perishable, since Claude Code prunes transcripts on its own
// schedule and they are never committed. So the strong check cannot be a gate, and the gate cannot be
// the strong check. Both facts are stated rather than one being quietly preferred.
//
// HONEST TRIGGER (P7), recorded rather than dressed up: `--verify-transcript` answered NO observed
// failure. It exists because L43 names binding-to-referent as the remedy shape, and it was retained at
// the maintainer's explicit direction at the post-grill gate — the `check-plan-lessons` sub-check (D)
// precedent, where a manufactured trigger would have been the disease P0 names.
//
// ── The FLOOR rules (primitive #3 + arithmetic) ──────────────────────────────────────────────────────
//  1. TOP-LEVEL KEY SET IS CLOSED — both directions: no extra key, no missing key. A per-member
//     presence set is satisfied by a variant spelling of any member (L36); closure is what fails it.
//  2. EVERY `usage` LEAF is number | bool | null | a short token (`TOKEN_RE`, composed AFTER a
//     control-char guard — L14). Arrays are walked (D1), not exempted.
//  3. NO STRING ANYWHERE in the file matches `ABS_PATH_RE` — every value, at every depth, including
//     keys' values inside `markers[]` and `outcome`.
//  4. `request_id`s are UNIQUE (set membership).
//  5. `markers[].seq` is STRICTLY INCREASING (integer compare).
//  6. EVERY VIEW equals a recompute from `requests[]` — `totals`, `by_model`,
//     `by_stage_iteration_model`, `unattributed`. The recompute calls the EMITTER's own `buildViews`,
//     so the two cannot disagree about what a view MEANS, only about whether the stored one matches.
//
// "No message content and no home paths are in the file" is a CONSEQUENCE of rules 2 and 3, NOT a
// detector this file implements. The claim "no usernames" is STRUCK and appears nowhere here: no regex
// proves it, and writing it would be the exact P0 disease.
//
// ── WARN, never RED: marker completeness ─────────────────────────────────────────────────────────────
// A missing phase marker is an ORCHESTRATION lapse (the marker call is Bash-invoked command prose,
// outside the `PreToolUse` gate — L19), not a malformed artifact. It is reported as a WARN WITH A COUNT
// and never silently merged into a neighbouring stage. Making it RED would fail a well-formed file for
// something the file's writer did not do wrong.
//
// Usage:
//   node pharn/floor/check-cost-ledger.mjs <cost.json> [--verify-transcript] [--projects-dir <dir>]
// Exit codes: 0 = GREEN (possibly with WARNs); 1 = RED; 2 = unusable input.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  SCHEMA,
  COVERAGE,
  TOKEN_CLASSES,
  TOP_LEVEL_KEYS,
  SKILLS_VERSION_SOURCES,
  TOKEN_RE,
  ABS_PATH_RE,
  ATTRIBUTION_METHOD,
  buildViews,
  renderLedger,
} from "./render-cost-ledger.mjs";
import { MARKER_KINDS } from "./mark-phase.mjs";

const reds = [];
const warns = [];
const red = (m) => reds.push(m);
const warn = (m) => warns.push(m);

function cleanScalar(v, maxLen) {
  if (typeof v !== "string") return false;
  if (v.length < 1 || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

/** RULE 3, applied to the WHOLE document at every depth. Exported so the test can range over committed
 *  FIXTURE bytes too — the guard the post-grill gate added, so a fixture is covered by the same rule as
 *  a ledger rather than by a description of how it was built. */
export function findAbsolutePaths(value, path, hits) {
  if (typeof value === "string") {
    if (ABS_PATH_RE.test(value)) hits.push(`${path} = ${JSON.stringify(value.slice(0, 80))}`);
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findAbsolutePaths(v, `${path}[${i}]`, hits));
    return hits;
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) findAbsolutePaths(value[k], path ? `${path}.${k}` : k, hits);
  }
  return hits;
}

/** RULE 2, over one `usage` subtree. */
function checkUsageLeaves(value, path, bad) {
  if (value === null || typeof value === "number" || typeof value === "boolean") return bad;
  if (typeof value === "string") {
    if (!cleanScalar(value, 64) || !TOKEN_RE.test(value)) bad.push(path);
    return bad;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkUsageLeaves(v, `${path}[${i}]`, bad));
    return bad;
  }
  if (typeof value === "object") {
    for (const k of Object.keys(value)) checkUsageLeaves(value[k], `${path}.${k}`, bad);
    return bad;
  }
  bad.push(path);
  return bad;
}

const sameTokens = (a, b) => TOKEN_CLASSES.every((c) => (a?.[c] ?? null) === (b?.[c] ?? null));

export function checkLedger(led, opts = {}) {
  reds.length = 0;
  warns.length = 0;

  if (!led || typeof led !== "object" || Array.isArray(led)) {
    red("the ledger is not a JSON object");
    return { reds: [...reds], warns: [...warns] };
  }

  // ---- RULE 1: the closed top-level key set, BOTH directions -----------------------------------
  const present = new Set(Object.keys(led));
  const expected = new Set(TOP_LEVEL_KEYS);
  const extra = [...present].filter((k) => !expected.has(k)).sort();
  const missing = [...expected].filter((k) => !present.has(k)).sort();
  if (extra.length) red(`top-level key set is not closed — unexpected key(s): ${extra.join(", ")}`);
  if (missing.length) red(`top-level key set is not closed — missing key(s): ${missing.join(", ")}`);

  // ---- enums and scalar grammars ---------------------------------------------------------------
  if (led.schema !== SCHEMA) red(`schema must be "${SCHEMA}" (got ${JSON.stringify(led.schema)})`);
  if (!COVERAGE.includes(led.coverage)) red(`coverage must be one of ${COVERAGE.join(" | ")} (got ${JSON.stringify(led.coverage)})`);
  if (led.dedup_key !== "requestId") red(`dedup_key must be "requestId" (got ${JSON.stringify(led.dedup_key)})`);
  if (!SKILLS_VERSION_SOURCES.includes(led.skills_version_source)) {
    red(`skills_version_source must be one of ${SKILLS_VERSION_SOURCES.join(" | ")} (got ${JSON.stringify(led.skills_version_source)})`);
  }
  if (led.skills_version_source === "unknown" && led.skills_version !== null) {
    red("skills_version_source is `unknown` but skills_version carries a value — an honest absence is null");
  }
  if (!led.attribution || led.attribution.method !== ATTRIBUTION_METHOD) {
    red(`attribution.method must be "${ATTRIBUTION_METHOD}" (got ${JSON.stringify(led.attribution?.method)})`);
  }
  if (typeof led.pricing_note !== "string" || !/TOKENS ONLY/.test(led.pricing_note)) {
    red("pricing_note must be present and state that the file carries tokens, never prices");
  }
  if (!Array.isArray(led.requests)) red("requests must be an array");
  if (!Array.isArray(led.markers)) red("markers must be an array");
  if (!Array.isArray(led.dropped)) red("dropped must be an array");
  if (!Array.isArray(led.sessions)) red("sessions must be an array");
  if (!Array.isArray(led.claude_code_versions)) red("claude_code_versions must be an array");

  // A price table must never appear, at any depth, under any key naming money.
  for (const k of Object.keys(led)) {
    if (/price|cost_usd|usd|dollar/i.test(k)) red(`key ${JSON.stringify(k)} looks like a price field — this record carries tokens only`);
  }

  // ---- RULE 3: no absolute path anywhere -------------------------------------------------------
  const pathHits = findAbsolutePaths(led, "", []);
  if (pathHits.length)
    red(
      `absolute-path-shaped string(s) present: ${pathHits.slice(0, 5).join("; ")}${pathHits.length > 5 ? ` (+${pathHits.length - 5} more)` : ""}`
    );

  // ---- RULE 5: markers, strictly increasing seq ------------------------------------------------
  if (Array.isArray(led.markers)) {
    let prev = null;
    for (const [i, m] of led.markers.entries()) {
      if (!m || typeof m !== "object") {
        red(`markers[${i}] is not an object`);
        continue;
      }
      if (!MARKER_KINDS.has(m.kind))
        red(`markers[${i}].kind must be one of ${[...MARKER_KINDS].join(" | ")} (got ${JSON.stringify(m.kind)})`);
      if (!Number.isInteger(m.seq)) red(`markers[${i}].seq must be an integer (got ${JSON.stringify(m.seq)})`);
      else if (prev !== null && m.seq <= prev) red(`markers[${i}].seq must be strictly increasing (${m.seq} follows ${prev})`);
      else prev = m.seq;
    }
  }

  // ---- RULES 2 + 4: per-request -----------------------------------------------------------------
  // NON-VACUITY (L34): a per-item rule set says NOTHING over an empty domain, and a vacuous pass is
  // indistinguishable from a real one at the verdict. An EMPTY `requests[]` is legitimate — an
  // `unavailable` ledger has one — so the guard is not "requests must be non-empty"; it is that an
  // empty `requests[]` must AGREE with the coverage enum and with every view. Silence and
  // asserted-silence are different claims, and only the second is a record.
  if (Array.isArray(led.requests)) {
    if (led.requests.length === 0) {
      if (led.coverage !== "unavailable") {
        red("requests[] is empty but coverage is not `unavailable` — an empty measurement must say so, not read as a cheap run");
      }
      if (led.totals?.requests !== 0) red("requests[] is empty but totals.requests is not 0");
      if ((led.by_model?.length ?? 0) !== 0 || (led.by_stage_iteration_model?.length ?? 0) !== 0) {
        red("requests[] is empty but a view carries rows — every view is a function of requests[]");
      }
    }
    const ids = new Set();
    for (const [i, r] of led.requests.entries()) {
      if (!r || typeof r !== "object") {
        red(`requests[${i}] is not an object`);
        continue;
      }
      if (typeof r.request_id !== "string" || !r.request_id) red(`requests[${i}].request_id must be a non-empty string`);
      else if (ids.has(r.request_id)) red(`requests[${i}].request_id is a duplicate: ${r.request_id}`);
      else ids.add(r.request_id);
      if (typeof r.sidechain !== "boolean") red(`requests[${i}].sidechain must be a boolean`);
      if (typeof r.model !== "string" || !r.model) red(`requests[${i}].model must be a non-empty string`);
      const badLeaves = checkUsageLeaves(r.usage, `requests[${i}].usage`, []);
      if (badLeaves.length)
        red(`usage leaf out of domain (must be number | bool | null | short token): ${badLeaves.slice(0, 4).join(", ")}`);
      for (const c of TOKEN_CLASSES) {
        if (!Number.isFinite(r.tokens?.[c])) red(`requests[${i}].tokens.${c} must be a number`);
      }
    }
  }

  // ---- RULE 6: every view recomputed from requests[] --------------------------------------------
  if (Array.isArray(led.requests) && led.requests.every((r) => r && typeof r === "object" && r.tokens)) {
    const v = buildViews(led.requests);
    if (led.totals?.requests !== v.totals.requests || !sameTokens(led.totals?.tokens, v.totals.tokens)) {
      red(`totals disagrees with a recompute from requests[] (stored ${led.totals?.requests} requests, recomputed ${v.totals.requests})`);
    }
    if (led.unattributed?.requests !== v.unattributed.requests || !sameTokens(led.unattributed?.tokens, v.unattributed.tokens)) {
      red(
        `unattributed disagrees with a recompute from requests[] (stored ${led.unattributed?.requests}, recomputed ${v.unattributed.requests})`
      );
    }
    const cmpView = (name, stored, want, keyOf) => {
      if (!Array.isArray(stored) || stored.length !== want.length) {
        red(
          `${name} disagrees with a recompute from requests[] (stored ${Array.isArray(stored) ? stored.length : "?"} rows, recomputed ${want.length})`
        );
        return;
      }
      for (let i = 0; i < want.length; i++) {
        if (
          keyOf(stored[i]) !== keyOf(want[i]) ||
          stored[i].requests !== want[i].requests ||
          !sameTokens(stored[i].tokens, want[i].tokens)
        ) {
          red(`${name}[${i}] disagrees with a recompute from requests[] (${keyOf(stored[i])} vs ${keyOf(want[i])})`);
          return;
        }
      }
    };
    cmpView("by_model", led.by_model, v.by_model, (r) => r?.model);
    cmpView(
      "by_stage_iteration_model",
      led.by_stage_iteration_model,
      v.by_stage_iteration_model,
      (r) => `${r?.stage ?? ""}/${r?.iteration ?? ""}/${r?.model}`
    );
  }

  // ---- WARN (never RED): marker completeness ----------------------------------------------------
  if (Array.isArray(led.markers) && led.outcome && Number.isInteger(led.outcome.iterations)) {
    const stageStarts = led.markers.filter((m) => m?.kind === "stage-start");
    const iters = new Set(stageStarts.map((m) => m.iteration).filter((n) => Number.isInteger(n)));
    const missingIters = [];
    for (let n = 1; n <= led.outcome.iterations; n++) if (!iters.has(n)) missingIters.push(n);
    if (missingIters.length) {
      warn(
        `marker completeness: outcome.iterations is ${led.outcome.iterations} but no stage-start marker carries iteration(s) ${missingIters.join(", ")} — ${missingIters.length} boundary/boundaries unrecorded; those requests stay in their own bucket and are NOT merged into a neighbour`
      );
    }
    if (!led.markers.some((m) => m?.kind === "run-start"))
      warn("marker completeness: no run-start marker — requests before the first marker are `unattributed`");
    if (!led.markers.some((m) => m?.kind === "run-stop"))
      warn("marker completeness: no run-stop marker — the run's tail is attributed to the last stage that started");
  }

  // ---- OPTIONAL: bind the rows to their referent (L43) -------------------------------------------
  if (opts.verifyTranscript) {
    const live = renderLedger({
      name: led.name,
      command: led.command,
      baseSha: led.base_sha,
      repo: opts.repo ?? ".",
      sessionId: led.sessions?.[0] ?? null,
      projectsDir: opts.projectsDir,
      ...(opts.markersBase ? { markersBase: opts.markersBase } : {}),
    });
    if (live.coverage === "unavailable") {
      warn(
        `--verify-transcript: the transcript is no longer available (${live.coverage_note}) — the rows could NOT be re-derived, so this run certifies internal consistency only`
      );
    } else {
      const a = led.requests.map((r) => r.request_id).sort();
      const b = live.requests.map((r) => r.request_id).sort();
      if (a.length !== b.length || a.some((id, i) => id !== b[i])) {
        red(`--verify-transcript: requests[] does not match the transcript (${a.length} recorded, ${b.length} re-derived)`);
      } else if (!sameTokens(led.totals.tokens, live.totals.tokens)) {
        red("--verify-transcript: totals do not match a re-derivation from the transcript");
      }
    }
  }

  return { reds: [...reds], warns: [...warns] };
}

function main(argv) {
  let file = null;
  const opts = { verifyTranscript: false, projectsDir: null, repo: "." };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--verify-transcript") opts.verifyTranscript = true;
    else if (k === "--projects-dir") opts.projectsDir = argv[++i];
    else if (k === "--repo") opts.repo = argv[++i];
    else if (k === "--markers-base") opts.markersBase = argv[++i];
    else if (k.startsWith("--")) {
      process.stderr.write(`check-cost-ledger: unknown argument ${k}\n`);
      return 2;
    } else if (file === null) file = k;
    else {
      process.stderr.write(`check-cost-ledger: unexpected argument ${k}\n`);
      return 2;
    }
  }
  if (!file) {
    process.stderr.write("usage: node pharn/floor/check-cost-ledger.mjs <cost.json> [--verify-transcript]\n");
    return 2;
  }
  opts.projectsDir ??= process.env.CLAUDE_CONFIG_DIR
    ? join(process.env.CLAUDE_CONFIG_DIR, "projects")
    : join(homedir(), ".claude", "projects");

  let led;
  try {
    led = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    process.stderr.write(`check-cost-ledger: cannot read or parse ${file} — ${e.message}\n`);
    return 2; // unusable input is never GREEN by default (fail-closed, P5)
  }

  const { reds: r, warns: w } = checkLedger(led, opts);
  for (const m of w) console.log(`WARN — ${m}`);
  if (r.length) {
    for (const m of r) console.log(`RED — ${m}`);
    console.log(`RED — ${file}: ${r.length} floor violation(s)`);
    return 1;
  }
  console.log(
    `GREEN — ${file}: closed key set, ${led.requests.length} request(s) with unique ids, every usage leaf in domain, ` +
      `no absolute-path string, ${led.markers.length} marker(s) with increasing seq, all views recompute from requests[]` +
      `${w.length ? ` (${w.length} WARN)` : ""}.`
  );
  console.log(
    "NOTE (P0): this certifies the file's INTERNAL CONSISTENCY, never that requests[] matches the transcript — " +
      "a self-consistent fabricated ledger passes. `--verify-transcript` binds the rows to their referent, and only while the transcript exists."
  );
  return 0;
}

// `import.meta.main` — NOT a `file://` + argv[1] compare (L25).
if (import.meta.main) process.exit(main(process.argv.slice(2)));
