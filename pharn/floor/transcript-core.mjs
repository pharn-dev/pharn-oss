// pharn/floor/transcript-core.mjs — the ONE reader of a Claude Code session transcript on the PRODUCT floor: where a
// session's transcript lives, which files belong to it, how its lines become requests, and (6.29.0) which CONTEXT —
// the session's own thread or one of its agents — each line belongs to. Node stdlib only, no network, no model call,
// no clock. No CLI: it is imported.
//
// ── One axis, and who imports it ─────────────────────────────────────────────────────────────────────
// This module changes for ONE reason: how the platform writes transcripts (P3). Its consumers are named
// here so a third one is a deliberate addition:
//   * render-cost-record.mjs — the `pharn-cost-record/1` block embedded in `ship-record.json` (`sessionRequests`);
//   * render-cost-ledger.mjs — `cost.json` (`sessionScan`), and through the ledger's `deriveLedger`,
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
// WHICH LINES ARE REQUESTS (6.28.1), FLOOR (primitive #3). A line is a usage-bearing record only when its
//   `message.usage` is a plain object (not null, not an array, a string or a number), and its resolved id
//   (`requestId`, else `message.id`, precedence unchanged) is a bounded identity token (`isIdentityToken`,
//   cost-value-core.mjs). A `requestId` that is present and not null but fails the test does NOT fall back to
//   `message.id`: the line is malformed, and a fallback could split one request across two keys. A null one counts
//   as absent, as `??` reads it. A line failing either test is not a request,
//   for every consumer. The selection ranks only by a count `isTokenCount` admits, so a line whose `output_tokens` is
//   refused never outranks one whose count is admitted: the selected line carries an admitted `output_tokens`
//   whenever any line of the request does. When none does, the earliest line is selected, and both renderers count
//   that class as 0 for it. Each value is tested BEFORE anything coerces it: until 6.28.1 a crafted non-string
//   id or model made a caller's `String()` throw ([[L62]]). BOUND: this decides which lines are requests and which
//   line a request is counted at, nothing more. Each consumer bounds the fields it copies (see its header). A crafted
//   line with a fresh, bounded id and right-typed usage is still a request, because nothing here can tell it from a
//   real one. The STRONGER vector, stated because it is the one that matters: a crafted line that REUSES a genuine
//   request's id with a larger admitted `output_tokens` becomes that request's selected line, so its whole usage
//   replaces the real one in both renderers, with nothing listed, and both checker modes stay GREEN
//   (--verify-transcript re-reads the same bytes). That follows from the selection rule above (6.24.1) and predates
//   6.28.1, which does not widen it; the transcript is agent-writable (`LIMITS.md §6`). Stated, not closed.
//
// ── Which CONTEXT a line belongs to, and who spawned whom (6.29.0, the ledger's `run-window/2`) ──────
// Measured on 2026-09-27 over every transcript on one machine (`.dev/measurements/cost-ledger-run-scope-2026-09-27.md`):
//   * FILES. The session's own thread writes `<sessionId>.jsonl`. An Agent-tool agent writes
//     `<sessionId>/subagents/agent-<agentId>.jsonl` beside `agent-<agentId>.meta.json`, and a NESTED agent is filed
//     flat in that same directory. A Workflow-tool agent writes under `<sessionId>/subagents/workflows/<run>/`.
//   * RECORDS. All 94,225 usage-bearing records agreed with their file: agent files carry `isSidechain: true` and an
//     `agentId` equal to the file's id, and main files carry `isSidechain: false` and no `agentId`.
//   * LINKS. A child's meta `toolUseId` names the `tool_use` block that spawned it. That block sits in exactly one
//     OTHER context's transcript (382 of 383 agents, all 5 nested ones included, agreeing with the meta's own parent
//     field every time). A fork's own file opens with a copy of its spawning line, which is why the child's own
//     context is excluded. The parent's `toolUseResult.agentId` is NOT a link: nested agents have none.
//   * OUTPUT. A command's output reaches a transcript as a `tool_result` block's `content`: a string, or `text`
//     blocks. In an agent's transcript that is the ONLY copy. A background agent's hand-back reaches its parent as a
//     `user` record with string content (and a `queue-operation` record), never as a tool result.
// THE RULES, each a membership or equality test (P5):
//   * `recordContext(r)`: `isSidechain === true` with an admitted `agentId` → `agent:<agentId>`;
//     `isSidechain === false` → `main`; anything else → null. Exactly `true` or `false`, so a format that drops
//     the field reads as undecidable, never as main (GRILL G2).
//   * `fileContext(rel)` reads the same from the path. `contextOf` keeps a record's context only when the two
//     AGREE, else null.
//   * `sessionScan` reads the session ONCE: the requests (the rule above, one copy, each with its first line's
//     context), the contexts holding each wanted line as a WHOLE line of a tool result, each agent's spawn link, and
//     the earliest time each context is named. A meta file is found by listing the directory, never by building a
//     path from a transcript value.
// FLOOR: given the same bytes, contexts, holders and links are deterministic. ADVISORY, and stated in the contract:
//   that the layout above is the platform's. It is undocumented and machine-local. The departures the suite pins
//   each read as null, unlinked or no holder, which the ledger turns into `unknown`:
//     - a missing or non-boolean `isSidechain`;
//     - a record disagreeing with its file;
//     - a missing meta or `toolUseId`;
//     - an ambiguous spawn record;
//     - output missing from the tool result.
//   The named exception is `cost-ledger-mention-only`: the output never reached its own context, and another
//   context's tool result carries a copy. Then that context is measured.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isIdentityToken, isTokenCount } from "./cost-value-core.mjs";
import { MAIN_CONTEXT, agentContext, tsMs } from "./run-window-core.mjs";

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
 * A line's rank in the per-request selection: its `output_tokens` when `isTokenCount` admits it, else -1,
 * so a line carrying a real count outranks one that does not. Total over any input — a string, an object,
 * a fraction or a missing field never takes part in a numeric comparison (6.28.1: a count both renderers
 * would refuse can no longer be what selects a line).
 */
const outputRank = (u) => (isTokenCount(u?.output_tokens) ? u.output_tokens : -1);

/** A plain object: not null, not an array. The only shape a request's usage may have (see the header). */
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * One pass over a session's lines, in walk order: the session's files — `<sessionId>.jsonl` and everything under
 * `<sessionId>/` — sorted, and each file's lines in order. `visit(record, rel)` sees every line that parses, `rel`
 * being its file's path relative to `projectDir`. Returns the files. An unreadable file and a torn line are skipped,
 * never thrown on: a partial read is an honest partial.
 */
function walkSession(projectDir, sessionId, visit) {
  const files = transcriptFiles(projectDir).filter((f) => {
    const rel = f.slice(projectDir.length + 1);
    return rel === `${sessionId}.jsonl` || rel.startsWith(`${sessionId}/`);
  });
  for (const f of files) {
    let text;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    const rel = f.slice(projectDir.length + 1);
    for (const line of text.split("\n")) {
      if (!line) continue;
      let r;
      try {
        r = JSON.parse(line);
      } catch {
        continue; // a torn final line while the session is live is expected, not an error
      }
      visit(r, rel);
    }
  }
  return files;
}

/**
 * THE per-request counting rule, as a collector: `add(record, extra)` folds one line in, `requests()` returns the
 * requests in first-occurrence order. Both `sessionRequests` and `sessionScan` read through it, so the rule has ONE
 * copy (see the header). A line is usage-bearing only with a plain-object usage and an id `isIdentityToken` admits:
 *   - the request's `record` is its FIRST line: its identity (model, session, agent, sidechain, skill, version)
 *     and the timestamp that run membership and stage attribution read. Its `message` is reduced to `{ model }`,
 *     so no message body is kept or handed to a caller. `extra` (the first line's fields a caller adds) is copied
 *     from the first line too;
 *   - its `usage` is the `message.usage` of its line with the greatest `output_tokens`, the earliest such line on a
 *     tie — one line's object, never assembled from several.
 */
function requestCollector() {
  const byId = new Map();
  return {
    add(r, extra) {
      if (r?.type !== "assistant") return;
      const u = r.message?.usage;
      if (!isPlainObject(u)) return; // no usage, or one of the wrong type: not a request
      if ((r.message.model ?? "unknown") === SYNTHETIC) return; // not a real API call
      const id = r.requestId ?? r.message.id;
      if (!isIdentityToken(id)) return; // tested before any caller coerces it; no fallback past a present id
      const seen = byId.get(id);
      if (seen === undefined) byId.set(id, { id, record: { ...r, message: { model: r.message.model } }, usage: u, ...extra });
      else if (outputRank(u) > outputRank(seen.usage)) seen.usage = u; // THE rule — see the header
    },
    requests: () => [...byId.values()],
  };
}

/**
 * THE per-request read of one session's transcript, and the ONE owner of the counting rule (see the
 * header and `requestCollector`). Do not re-implement any part of it in a caller: a second copy of this loop is
 * how the ledger kept the first line after the platform stopped writing one usage object per request ([[L35]]).
 * Returns `{ files, requests }`, `requests` being `[{ id, record, usage }]` in first-occurrence order.
 */
export function sessionRequests(projectDir, sessionId) {
  const collector = requestCollector();
  const files = walkSession(projectDir, sessionId, (r) => collector.add(r));
  return { files, requests: collector.requests() };
}

/** The context a record CLAIMS (see the header): exactly `true`/`false` `isSidechain`, else null. */
export function recordContext(r) {
  if (r?.isSidechain === true) return isIdentityToken(r.agentId) ? agentContext(r.agentId) : null;
  if (r?.isSidechain === false) return MAIN_CONTEXT;
  return null;
}

/**
 * The context a transcript FILE holds, from its path relative to the project directory (`/`-separated, as
 * `transcriptFiles` builds it on a POSIX system): `<sessionId>.jsonl` is `main`;
 * `<sessionId>/subagents/agent-<id>.jsonl` and `<sessionId>/subagents/workflows/<run>/agent-<id>.jsonl` are
 * `agent:<id>` when `<id>` is an identity token. Any other file under the session names no context: null.
 */
export function fileContext(rel, sessionId) {
  if (typeof rel !== "string") return null;
  if (rel === `${sessionId}.jsonl`) return MAIN_CONTEXT;
  const parts = rel.split("/");
  const name = /^agent-(.+)\.jsonl$/.exec(parts[parts.length - 1] ?? "");
  if (!name || parts[0] !== sessionId || parts[1] !== "subagents") return null;
  const inPlace = parts.length === 3;
  const inWorkflow = parts.length === 5 && parts[2] === "workflows";
  return (inPlace || inWorkflow) && isIdentityToken(name[1]) ? agentContext(name[1]) : null;
}

/** A line's context: what the record claims, kept only when its file agrees (GRILL G2), else null. */
export function contextOf(r, rel, sessionId) {
  const claimed = recordContext(r);
  return claimed !== null && claimed === fileContext(rel, sessionId) ? claimed : null;
}

/** The texts of a `tool_result` block's `content`: the string itself, or each `text` block's text. */
function resultTexts(content) {
  if (typeof content === "string") return [content];
  if (!Array.isArray(content)) return [];
  return content.filter((b) => b?.type === "text" && typeof b.text === "string").map((b) => b.text);
}

/** The longest prefix every string in `set` shares — "" when the set is empty. A cheap pre-test before a split. */
function commonPrefix(set) {
  let prefix = null;
  for (const s of set) {
    if (typeof s !== "string") return "";
    if (prefix === null) prefix = s;
    else {
      let i = 0;
      while (i < prefix.length && i < s.length && prefix[i] === s[i]) i++;
      prefix = prefix.slice(0, i);
    }
  }
  return prefix ?? "";
}

/**
 * Each agent's spawn link: `agent:<id>` → `{ parent, ts }`, from `agent-<id>.meta.json` in the session's
 * `subagents/` directory — found by LISTING that directory, and only a regular file (a symlink is not followed).
 * The meta's `toolUseId` must name a `tool_use` block held by exactly ONE context other than the agent's own (a
 * fork's file holds a copy of its own spawning line); `ts` is that context's earliest record of the block. Anything
 * else — an unreadable or malformed meta, no `toolUseId`, no holder, two holders, an undecidable one — leaves the
 * agent out of the map: UNLINKED. A Workflow agent's meta lives elsewhere and carries no `toolUseId`, so it is
 * unlinked by construction.
 */
function spawnLinks(projectDir, sessionId, uses) {
  const links = new Map();
  const dir = join(projectDir, sessionId, "subagents");
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return links; // no subagents directory: no agent can be linked
  }
  for (const e of entries) {
    const m = /^agent-(.+)\.meta\.json$/.exec(e.name);
    if (!m || !e.isFile() || !isIdentityToken(m[1])) continue;
    let meta;
    try {
      meta = JSON.parse(readFileSync(join(dir, e.name), "utf8"));
    } catch {
      continue;
    }
    const toolUseId = meta !== null && typeof meta === "object" ? meta.toolUseId : undefined;
    if (!isIdentityToken(toolUseId)) continue;
    const self = agentContext(m[1]);
    const held = (uses.get(toolUseId) ?? []).filter((h) => h.ctx !== self);
    const parents = new Set(held.map((h) => h.ctx));
    if (parents.size !== 1) continue;
    const [parent] = parents;
    if (parent === null) continue;
    let ts = null;
    for (const h of held) {
      const t = tsMs(h.ts);
      if (t !== null && (ts === null || t < tsMs(ts))) ts = h.ts;
    }
    links.set(self, { parent, ts });
  }
  return links;
}

/**
 * The ONE pass the cost ledger makes over a session (6.29.0): the requests, each with its first line's `context`
 * (`contextOf`), plus the evidence run membership reads (see the header):
 *   - `holders`: for each line in `lines`, the Set of contexts (a key, or null when the record's context is
 *     undecidable) whose TOOL RESULTS carry it as a whole `\n`-delimited line. Only `tool_result` blocks are read.
 *     A user or assistant message quoting the line is not a tool result and is not evidence either way;
 *   - `links`: `spawnLinks`, above;
 *   - `named`: every context a line of the session names → the earliest timestamp (the string) among those lines
 *     that parses, or null when none does. Run membership reports its context set only over the contexts named by
 *     the run's end (`run-window-core.mjs` `runContexts`), so a context first written after it cannot change a
 *     ledger's recorded set on a later re-derivation (L58).
 * Returns `{ files, requests, holders, links, named }`. `lines` may be any iterable of strings; an empty one skips
 * the holder search (the caller has no run to bind).
 */
export function sessionScan(projectDir, sessionId, lines) {
  const want = new Set([...(lines ?? [])].filter((l) => typeof l === "string" && l.length > 0));
  const prefix = commonPrefix(want);
  const collector = requestCollector();
  const holders = new Map();
  const uses = new Map();
  const named = new Map();
  const files = walkSession(projectDir, sessionId, (r, rel) => {
    const ctx = contextOf(r, rel, sessionId);
    collector.add(r, { context: ctx });
    if (ctx !== null) {
      const t = tsMs(r.timestamp);
      if (!named.has(ctx)) named.set(ctx, t === null ? null : r.timestamp);
      else if (t !== null && (named.get(ctx) === null || t < tsMs(named.get(ctx)))) named.set(ctx, r.timestamp);
    }
    const content = r?.message?.content;
    if (!Array.isArray(content)) return;
    if (r.type === "assistant") {
      for (const b of content) {
        if (b?.type !== "tool_use" || !isIdentityToken(b.id)) continue;
        if (!uses.has(b.id)) uses.set(b.id, []);
        uses.get(b.id).push({ ctx, ts: typeof r.timestamp === "string" ? r.timestamp : null });
      }
    } else if (r.type === "user" && want.size > 0) {
      for (const b of content) {
        if (b?.type !== "tool_result") continue;
        for (const text of resultTexts(b.content)) {
          if (prefix && !text.includes(prefix)) continue; // the cheap test first (GRILL G8)
          for (const l of text.split("\n")) {
            if (!want.has(l)) continue;
            if (!holders.has(l)) holders.set(l, new Set());
            holders.get(l).add(ctx);
          }
        }
      }
    }
  });
  return { files, requests: collector.requests(), holders, links: spawnLinks(projectDir, sessionId, uses), named };
}
