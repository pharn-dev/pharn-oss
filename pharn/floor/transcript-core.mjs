// pharn/floor/transcript-core.mjs — the ONE reader of a Claude Code session transcript's token usage on the
// PRODUCT floor: where a session's transcript lives, which files belong to it, and how its lines become
// requests. Node stdlib only, no network, no model call, no clock. No CLI: it is imported.
//
// ── One axis, and who imports it ─────────────────────────────────────────────────────────────────────
// This module changes for ONE reason: how the platform writes transcripts (P3). Its consumers are named
// here so a third one is a deliberate addition:
//   * render-cost-record.mjs — the `pharn-cost-record/1` block embedded in `ship-record.json`;
//   * render-cost-ledger.mjs — `cost.json`, and through the ledger's `deriveLedger`,
//     check-cost-ledger.mjs --verify-transcript.
// It was split out of render-cost-record.mjs in 6.24.1, when the per-request rule below gained its second
// consumer. A renderer that also served as the transcript library had two reasons to change, and this is
// the plan-files-core.mjs / ship-outcome-core.mjs precedent: two reasons, two files. No other module
// re-exports these functions, so each has exactly one import address.
//
// ── How a transcript is LOCATED, and why it is not derived ───────────────────────────────────────────
// By SESSION ID: the single directory under `<projectsDir>/` holding `<sessionId>.jsonl`, found by a
// filename test over the immediate children. The directory NAME is opaque here, deliberately.
//
// The lookup used to derive that name from `cwd` by replacing `/` with `-`. That was wrong twice over, and
// the second reason is why the derivation is retired rather than corrected (measured 2026-09-21; see
// `.dev/measurements/cost-record-lookup-2026-09-21.md`):
//   1. The platform also replaces `.` (so `…/repo/.claude/worktrees/wt` is filed under
//      `-…-repo--claude-worktrees-wt`, with `--`), while leaving `_` alone. A rule this module cannot pin is
//      a second copy of a platform fact — the thing to retire, not to sync.
//   2. DECISIVE: the directory is not a function of the session's `cwd` AT ALL. A Claude Code worktree
//      session is filed under the WORKTREE while its records carry the MAIN REPO as `cwd`, and `cwd` is not
//      even stable within one session (2-3 distinct values were observed in single transcripts; only the
//      first was ever read). So a dot-corrected rule still resolves the wrong directory.
// A session id is a UUID and was measured unique across every transcript on the machine, so the filename
// test needs no directory rule. `findTranscriptDirs` returns EVERY hit; each caller refuses on more than
// one rather than picking one. A cwd-mismatch refusal stood in the renderer until 6.4.3. Its premise was
// the lossy `a/b` vs `a-b` dirname collision, which a UUID key makes unreachable, and meanwhile reason 2
// above made it fire on legitimate worktree runs.
//
// ── How its lines become requests (6.24.1) ───────────────────────────────────────────────────────────
// FLOOR (deterministic, primitive #3): lines are grouped per request (`requestId`, else `message.id`), and
// each request is ONE entry. The grouping is LOAD-BEARING, not a nicety: the platform writes one API
// request to the transcript as SEVERAL lines, so a line-by-line sum over-counts (2.34x on the 2026-08-18
// corpus, .dev/measurements/token-cost-2026-08-18.md). That measurement also found every line of a request
// repeating the same usage object and nested subagent files sharing no request with their parent. On
// current transcripts neither holds (.dev/measurements/cost-dedup-usage-2026-09-26.md):
//   * an earlier line can record FEWER output tokens, and no thinking detail, than the last one (one
//     measured request's three lines read 8, 8, 163);
//   * a request can be written again later, in the same file, with its counts zeroed;
//   * a forked subagent's transcript can open with a copy of an EARLIER line of a parent request.
// So a request's `usage` is its line with the GREATEST `output_tokens`, the earliest such line on a tie,
// and its identity and timestamp are its FIRST line's in walk order. What that makes a ledger row MEAN is
// defined in `pharn/pharn-contracts/cost-ledger.md`, "One row per request" (cited, not restated — P4). The
// reasons for the shape are these: the first line, which both renderers kept until 6.24.1, under-counts
// `output` and `thinking`, and the last line miscounts the second and third shapes. A first line's
// timestamp never moves once written, while the largest line can still change, and run membership and
// stage attribution key on the timestamp. Nested subagent files are included, or fan-out cost would be
// invisible. A request found in several files is one request, under the identity of the copy walked first
// (the parent's, for every observed fork: `<id>.jsonl` sorts before `<id>/…`). Given the same bytes the
// result is identical: sorted paths, lines in file order, strict comparisons.
// ADVISORY, and it is the rule's one assumption: that the line with the most output tokens IS the request's
//   completed usage. It rests on a platform behaviour, never on a floor fact: no line of a request was seen
//   recording more output than its completed one, and on every measured request that carries a
//   `stop_reason` on any line, the largest line carries one. A request still being written when a caller
//   reads it is counted at the largest line written so far, so a later read can find MORE output for it —
//   which is why check-cost-ledger.mjs --verify-transcript bounds `output` and `output_thinking` rather than
//   comparing them exactly ([[L58]], [[L63]]).
// ONE OWNER ([[L35]]): nothing else in the product floor reads a transcript's usage. Until 6.24.1 the ledger
//   carried its own copy of the reading loop. A closure test pins the two spellings both copies used, and
//   it cannot see a third spelling (L36).
// NAMED RESIDUAL, pre-existing and unchanged here: a crafted non-string `requestId` or `message.model` makes a
//   caller's `String()` coercion throw. That is a follow-up, and it is not hardened silently here (P7).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SYNTHETIC = "<synthetic>";

/**
 * Every immediate child directory of `projectsDir` that holds `<sessionId>.jsonl`, sorted.
 * Returns `[]` rather than throwing when `projectsDir` is missing or unreadable — a fresh machine, or a
 * misdirected CLAUDE_CONFIG_DIR, is a real state, and every caller embeds an honest absence instead.
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
 * A line's rank in the per-request selection: its `output_tokens` when that is a finite number, else -1,
 * so a line carrying a real count outranks one that does not. Total over any input — a string, an object
 * or a missing field never takes part in a numeric comparison.
 */
const outputRank = (u) => (Number.isFinite(u?.output_tokens) ? u.output_tokens : -1);

/**
 * THE per-request read of one session's transcript, and the ONE owner of the counting rule (see the
 * header). Do not re-implement any part of it in a caller: a second copy of this loop is how the ledger
 * kept the first line after the platform stopped writing one usage object per request ([[L35]]).
 *
 * Selects the session's files — `<sessionId>.jsonl` and everything under `<sessionId>/` — and groups every
 * usage-bearing, non-synthetic assistant record by request id ACROSS all of them, in walk order:
 *   - `record` is the request's FIRST line: its identity (model, session, agent, sidechain, skill, version)
 *     and the timestamp that run membership and stage attribution read. Its `message` is reduced to
 *     `{ model }`, so no message body is kept or handed to a caller.
 *   - `usage` is the `message.usage` of the request's line with the greatest `output_tokens`, the earliest
 *     such line on a tie — one line's object, never assembled from several.
 * Returns `{ files, requests }`, `requests` being `[{ id, record, usage }]` in first-occurrence order.
 * An unreadable file and a torn line are skipped, never thrown on: a partial read is an honest partial.
 */
export function sessionRequests(projectDir, sessionId) {
  const files = transcriptFiles(projectDir).filter((f) => {
    const rel = f.slice(projectDir.length + 1);
    return rel === `${sessionId}.jsonl` || rel.startsWith(`${sessionId}/`);
  });
  const byId = new Map();
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
      if ((r.message.model ?? "unknown") === SYNTHETIC) continue; // not a real API call
      const id = r.requestId ?? r.message.id;
      if (!id) continue;
      const seen = byId.get(id);
      if (seen === undefined) byId.set(id, { id, record: { ...r, message: { model: r.message.model } }, usage: u });
      else if (outputRank(u) > outputRank(seen.usage)) seen.usage = u; // THE rule — see the header
    }
  }
  return { files, requests: [...byId.values()] };
}
