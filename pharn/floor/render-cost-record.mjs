#!/usr/bin/env node
// pharn/floor/render-cost-record.mjs — the deterministic RENDERER for the measured token-cost block on
// `pharn/features/<name>/ship-record.json`, on the PRODUCT surface.
//
// Non-LLM, dependency-free (Node stdlib only). It reads the CURRENT run's Claude Code session transcript,
// deduplicates it, and sums the usage fields the platform recorded. It is the floor reduction of
// `LIMITS.md §1c`'s true statement — "the real number is the MEASURED runtime cost" — replacing a static
// `est_tokens` guess with what the run actually consumed.
//
// WHAT THIS FILE DOES NOT DO: it does not write `ship-record.json` — it prints the cost block to stdout, so
// the CALLING COMMAND performs the Write (fix #7 gates that write, not this render). It is the same
// renderer/caller split `render-ship-briefing.mjs` uses.
//
// ── How the transcript is LOCATED, and why it is not derived ─────────────────────────────────────────
// By SESSION ID: the single directory under `<projectsDir>/` holding `<sessionId>.jsonl`, found by a
// filename test over the immediate children. The directory NAME is opaque here, deliberately.
//
// This module used to derive that name from `cwd` by replacing `/` with `-`. That was wrong twice over,
// and the second reason is why the derivation is retired rather than corrected (measured 2026-09-21; see
// `.dev/measurements/cost-record-lookup-2026-09-21.md`):
//   1. The platform also replaces `.` (so `…/repo/.claude/worktrees/wt` is filed under
//      `-…-repo--claude-worktrees-wt`, with `--`), while leaving `_` alone. A rule this module cannot
//      pin is a second copy of a platform fact — the thing to retire, not to sync.
//   2. DECISIVE: the directory is not a function of the session's `cwd` AT ALL. A Claude Code worktree
//      session is filed under the WORKTREE while its records carry the MAIN REPO as `cwd`, and `cwd` is
//      not even stable within one session (2-3 distinct values were observed in single transcripts;
//      only the first was ever read). So a dot-corrected rule still resolves the wrong directory.
// A session id is a UUID and was measured unique across every transcript on the machine, so the
// filename test needs no directory rule. If an id ever resolves to MORE than one directory the render
// REFUSES (below) rather than pick one.
//
// A cwd-mismatch refusal stood here until 6.4.3. Its premise was the lossy `a/b` vs `a-b` dirname
// collision, which a UUID key makes unreachable; meanwhile reason 2 above made it fire on legitimate
// worktree runs. It is gone, and the honest consequence is stated under ADVISORY below.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// FLOOR (deterministic, primitive #3 + arithmetic): records are deduplicated on `requestId` and summed.
//   The dedup is LOAD-BEARING, not a nicety — one API response is written to the transcript as several
//   lines that each repeat the SAME usage object, so a naive sum over-counts (measured at 2.34x on this
//   repo's own history; see .dev/measurements/token-cost-2026-08-18.md). Nested subagent transcripts are
//   stored DISJOINTLY from the parent and are included, or fan-out cost would be invisible. Given the same
//   transcript bytes the output is byte-identical — no clock read, no randomness (window_start/window_end
//   come from the records' OWN timestamps, never from Date.now()), so it is pinnable by test.
// FLOOR (primitive #3, an integer compare — the `check-ship.mjs` `iter >= cap` precedent): a session id
//   resolving to 2+ transcript directories is REFUSED, never resolved first-match-wins. Bounded, and
//   stated: that is a property of THIS LOOKUP, not a proof the platform never reuses a session id.
// ADVISORY / NARROWED, and stated:
//   * THE REPORTED RUN IS THE ONE `CLAUDE_CODE_SESSION_ID` NAMES, and nothing here verifies that is this
//     run. This is WEAKER than the cwd refusal it replaced — stated as a downgrade, not hidden. The
//     refusal was not a working backstop either: it read one arbitrary `cwd` of the several a session
//     records, so it produced false refusals rather than true catches.
//   * COVERAGE IS NEVER COMPLETE. The `coverage` enum has no `complete` member by design: the ship stage's
//     own turns are still being written when this runs, so a run can never fully account for itself. The
//     number is a floor on spend, never the total.
//   * It measures TOKENS, never DOLLARS. No price table is embedded, deliberately: published prices change,
//     a baked-in table would rot silently, and nothing here could floor-check it. Converting to currency is
//     the reader's job, against current published prices.
//   * "The record shows N tokens" NEVER means "the spend was worthwhile". It annotates; it gates nothing
//     (fix #3) and can never flip a verdict or block GATE 2.
//   * Coverage is MACHINE-LOCAL. The transcript lives outside the repo and is never committed, so a fresh
//     clone can reproduce nothing — the `product-lessons-index` precedent's weakness, not the dev floor's
//     byte-equality guarantee.
//   * `by_stage` keys come from the platform's own `attributionSkill` field. Records without it are grouped
//     under `(untagged)` — an honest bucket, not an error.
//   * NAMED RESIDUAL, deliberately unbuilt — `cost-record-unsplit-cache-write`. `fold()` reads the
//     `cache_creation` SPLIT, so a record carrying `cache_creation_input_tokens` with no split would count
//     cache writes as 0 with no signal. Measured 2026-09-21: 8068/8068 deduped requests carried the split,
//     equal to the total, 0 remainder — so P7's bar (a real failure) is unmet and no bucket is added; the
//     output shape has nowhere to put an unsplit total, and inventing one would be the speculative
//     addition. Recorded as a pending remedy, not a solved problem.
//
// Usage:
//   node pharn/floor/render-cost-record.mjs [--session <id>] [--projects-dir <dir>]
// Exit codes: 0 = a valid block was printed (including an honest `unavailable` one); 2 = bad usage.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const SCHEMA = "pharn-cost-record/1";
export const COVERAGE = Object.freeze(["partial", "unavailable"]);
const UNTAGGED = "(untagged)";
const SYNTHETIC = "<synthetic>";

const zero = () => ({
  requests: 0,
  input_uncached: 0,
  cache_write_1h: 0,
  cache_write_5m: 0,
  cache_read: 0,
  output: 0,
  thinking: 0,
});

function fold(acc, u) {
  acc.requests += 1;
  acc.input_uncached += u.input_tokens ?? 0;
  acc.cache_write_1h += u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  acc.cache_write_5m += u.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  acc.cache_read += u.cache_read_input_tokens ?? 0;
  acc.output += u.output_tokens ?? 0;
  acc.thinking += u.output_tokens_details?.thinking_tokens ?? 0;
  return acc;
}

/**
 * Every immediate child directory of `projectsDir` that holds `<sessionId>.jsonl`, sorted.
 * Returns `[]` rather than throwing when `projectsDir` is missing or unreadable — a fresh machine, or a
 * misdirected CLAUDE_CONFIG_DIR, is a real state, and the caller embeds this render's block verbatim.
 */
export function findTranscriptDirs(projectsDir, sessionId) {
  let entries;
  try {
    entries = readdirSync(projectsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const hits = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = join(projectsDir, e.name);
    try {
      if (statSync(join(dir, `${sessionId}.jsonl`)).isFile()) hits.push(dir);
    } catch {
      // no transcript for this session here — the ordinary case for every unrelated project
    }
  }
  return hits.sort(); // sorted so the read order and any message is filesystem-independent
}

/** Every .jsonl under `dir`, recursively. `tool-results/` holds captured tool output, never usage. */
export function transcriptFiles(dir) {
  const out = [];
  const walk = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return; // unreadable subtree: skip, never throw — a partial read is still an honest partial
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== "tool-results") walk(p);
      } else if (e.name.endsWith(".jsonl")) out.push(p);
    }
  };
  walk(dir);
  return out.sort(); // sorted so the read order is filesystem-independent
}

/**
 * Aggregate one session's usage. `sessionId` selects the top-level transcript AND its nested subagent
 * files; every other session in the directory is ignored, so no unrelated run is read.
 */
export function aggregate(projectDir, sessionId) {
  const files = transcriptFiles(projectDir).filter((f) => {
    const rel = f.slice(projectDir.length + 1);
    return rel === `${sessionId}.jsonl` || rel.startsWith(`${sessionId}/`);
  });
  const seen = new Set();
  const total = zero();
  const byStage = new Map();
  const byModel = new Map();
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
        continue; // a torn final line while the session is live is expected, not an error
      }
      if (r?.type !== "assistant") continue;
      const u = r.message?.usage;
      if (!u) continue;
      const model = r.message?.model ?? "unknown";
      if (model === SYNTHETIC) continue; // not a real API call
      const id = r.requestId ?? r.message?.id;
      if (!id || seen.has(id)) continue; // THE dedup — see the header note
      seen.add(id);

      fold(total, u);
      const stage = r.attributionSkill ?? UNTAGGED;
      if (!byStage.has(stage)) byStage.set(stage, zero());
      fold(byStage.get(stage), u);
      if (!byModel.has(model)) byModel.set(model, zero());
      fold(byModel.get(model), u);

      const ts = r.timestamp;
      if (typeof ts === "string") {
        if (start === null || ts < start) start = ts;
        if (end === null || ts > end) end = ts;
      }
    }
  }
  const sorted = (m) => Object.fromEntries([...m.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return { files: files.length, total, byStage: sorted(byStage), byModel: sorted(byModel), start, end };
}

function unavailable(note, sessionId) {
  return {
    schema: SCHEMA,
    coverage: "unavailable",
    coverage_note: note,
    session_id: sessionId ?? null,
    dedup_key: "requestId",
    requests: 0,
    tokens: zero(),
    by_stage: {},
    by_model: {},
  };
}

export function render({ sessionId, projectsDir }) {
  if (!sessionId) return unavailable("no session id available (CLAUDE_CODE_SESSION_ID unset)", null);
  const hits = findTranscriptDirs(projectsDir, sessionId);
  if (hits.length === 0) {
    return unavailable(`no transcript found for session ${sessionId} under ${projectsDir}`, sessionId);
  }
  if (hits.length > 1) {
    // A UUID id colliding across directories is the case this was written for, and that case is
    // unreachable on a sane tree — but the BRANCH is not dead: a malformed `--session` (one holding a
    // path separator) also lands here, and refusing is the correct answer for both. Do not delete it.
    return unavailable(
      `session ${sessionId} resolves to ${hits.length} transcript directories (${hits.join(", ")}) — refusing to guess which run to report`,
      sessionId
    );
  }
  const a = aggregate(hits[0], sessionId);
  // A hit means `<dir>/<sessionId>.jsonl` STATTED, not that `aggregate` could read a transcript out of
  // `<dir>`: the two matchers do not agree on every input (a `..` in the id satisfies the stat and
  // escapes the walk), and the file can be unlinked between the two. Without this, such a run renders
  // `coverage: "partial"` with zeros — a measurement that never happened, reported as a cheap one.
  if (a.files === 0) {
    return unavailable(`no transcript found for session ${sessionId} under ${hits[0]}`, sessionId);
  }
  const { requests, ...tokens } = a.total;
  const strip = (o) =>
    Object.fromEntries(
      Object.entries(o).map(([k, v]) => {
        const { requests: n, ...t } = v;
        return [k, { requests: n, tokens: t }];
      })
    );
  return {
    schema: SCHEMA,
    coverage: "partial",
    coverage_note:
      "measured from this run’s session transcript; never complete — the ship stage’s own turns are still being written. Tokens only: no price table is embedded (published prices change and nothing here could floor-check one). Annotation only — gates nothing.",
    session_id: sessionId,
    window_start: a.start,
    window_end: a.end,
    dedup_key: "requestId",
    transcript_files: a.files,
    requests,
    tokens,
    by_stage: strip(a.byStage),
    by_model: strip(a.byModel),
  };
}

function main(argv) {
  const opts = { sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? null, projectsDir: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--session") opts.sessionId = argv[++i];
    else if (k === "--projects-dir") opts.projectsDir = argv[++i];
    else {
      process.stderr.write(`render-cost-record: unknown argument ${k}\n`);
      return 2;
    }
  }
  opts.projectsDir ??= process.env.CLAUDE_CONFIG_DIR
    ? join(process.env.CLAUDE_CONFIG_DIR, "projects")
    : join(homedir(), ".claude", "projects");
  process.stdout.write(JSON.stringify(render(opts), null, 2) + "\n");
  return 0;
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare, which silently no-ops on spaced/non-ASCII/symlinked paths.
if (import.meta.main) process.exit(main(process.argv.slice(2)));
