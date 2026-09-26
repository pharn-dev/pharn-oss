# Per-request usage in Claude Code transcripts — measured, 2026-09-26

**Status:** measurement record. Apparatus-only (`.dev/`), with no `SKILLS_VERSION` bump of its own.
**Raw data:** embedded below with the scripts that produced it, so every number can be recomputed on a machine that
still holds the transcripts.
**Register:** follows `LIMITS.md` — what is measured is stated, what is not is named and bounded.

This is the evidence behind the `cost-dedup-completed-usage` increment (6.22.1). It shows why
`pharn/floor/transcript-core.mjs`'s `sessionRequests()` counts each request at its line with the greatest
`output_tokens`, and takes the request's identity from its FIRST line. (The reader was first written in
`render-cost-record.mjs` and moved at review; the embedded scripts below name the module as it was when they ran.) It also shows why two findings of
`token-cost-2026-08-18.md` no longer describe current transcripts.

---

## 0. What was measured, and what was deliberately not read

|            |                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | Claude Code session transcripts (JSONL) under `~/.claude/projects/`, every project directory                                                                                      |
| Extraction | `type`, `requestId` / `message.id`, `message.model`, `message.stop_reason`, `timestamp`, `isSidechain`, `agentId`, the numeric `usage` fields and `uuid` — **no message content** |
| Walk       | the renderer's own order: every `.jsonl` recursively, `tool-results/` skipped, paths sorted, lines in file order                                                                  |
| Filter     | the renderer's own: `type: assistant`, a `message.usage`, a model other than `<synthetic>`, a request id                                                                          |
| Machine    | one machine, one user. **Machine-local by construction**: transcripts are never committed, so no other clone can reproduce these numbers                                          |

**The corpus is LIVE, and it grew while being measured** (44,195 → 44,253 → 44,734 requests across the runs below),
because the session doing the measuring is itself a transcript. The conclusions are therefore stated as shapes and
ratios. Every count carries the run it came from; none is a standing property ([[L47]]).

Paths are shown as `…/<session>…/…`. No home path and no project-directory name appears here, because those
names carry the user's name.

---

## 1. The maintainer's file

`…/9a44eb3f…/subagents/agent-ac9a6c6d0cb423fc9.jsonl`, whole file as of 11:22 local time:

```json
{ "requests": 245, "multi_line": 184, "output_disagrees": 11, "output_first_line": 7693, "output_largest_line": 35264 }
```

One request, `req_011CfR5fSd…`, as its three lines were written (usage only):

| line | `timestamp`  | `output_tokens` | `output_tokens_details` | `stop_reason` |
| ---- | ------------ | --------------- | ----------------------- | ------------- |
| 1    | 00:10:50.901 | 8               | absent                  | `null`        |
| 2    | 00:10:50.903 | 8               | absent                  | `null`        |
| 3    | 00:10:51.691 | 163             | `thinking_tokens: 22`   | `tool_use`    |

Input and cache fields are identical on all three lines. The maintainer's own count of the same file, over a
233-request window, was 1,657 output tokens under first-line counting against 28,707 at the largest line.

## 2. The corpus: three rules compared

986 files, 44,253 requests, dated 2026-09-07 to 2026-09-26 (older transcripts are pruned), Claude Code 2.1.234 to
2.1.281:

| rule, per request                         | output     | thinking   | input   | cache read     | cache write 5m | cache write 1h |
| ----------------------------------------- | ---------- | ---------- | ------- | -------------- | -------------- | -------------- |
| first line (the rule until 6.22.1)        | 25,703,622 | 9,469,497  | 232,414 | 14,352,722,236 | 150,553,862    | 125,844,583    |
| last line in walk order                   | 38,976,711 | 16,183,409 | 232,410 | 14,352,454,415 | 150,553,862    | 125,844,583    |
| greatest `output_tokens`, earliest on tie | 38,996,675 | 16,190,248 | 232,414 | 14,352,722,236 | 150,553,862    | 125,844,583    |
| greatest `output_tokens`, latest on tie   | 38,996,675 | 16,190,248 | 232,414 | 14,352,722,236 | 150,553,862    | 125,844,583    |

- First-line counting reported **65.9%** of the output tokens and **58.5%** of the thinking tokens. The other four
  classes were equal in total, and they were equal request by request as well (section 7, which also carries the
  script that measures it).
- Last-line counting lost **19,964** output tokens and **267,821** cache-read tokens against the largest line (section
  3 says where).
- **23,773** requests have more than one line at their maximum. On none of them do those lines differ in any class,
  so the tie direction changes no number on this corpus. The rule keeps the earliest, the stable choice: a later equal
  line cannot change the selected object after a ledger is written ([[L58]]).
- Of an earlier run's 44,195 requests, 32,810 were written on more than one line, and **9,131** had lines disagreeing
  on `output_tokens`. Disagreeing lines appear from Claude Code 2.1.263 on. Three older versions are also on disk
  (2.1.234, 2.1.241 and 2.1.260, 521 requests between them, see section 7), and none of their requests has disagreeing
  lines. But all three were used on 2026-09-07/08, alongside 2.1.263, and nothing older than 2026-09-07 survives
  pruning. So when the platform began writing disagreeing lines is **not** established.

## 3. Three request shapes — why the largest line, and not the first or the last

Three shapes were found on real transcripts. Counts are from the sorted walk:

1. **Growing lines.** An earlier line records fewer output tokens, and no thinking detail, than the last one (section
   1). First-line counting reads the early value.
2. **A zeroed re-append (2 requests).** The request is written again later in the SAME file, with the same `uuid`
   and timestamp. On the copy, `input_tokens`, `output_tokens`, `cache_read_input_tokens` and
   `cache_creation_input_tokens` read 0. Its `cache_creation` split and its `iterations[]` keep the original values,
   so the copy's split (764) disagrees with its own zeroed total. Last-line counting reads the zeros:
   `req_011CfLcrrwyg…` reads 2565 ×3 then 0 ×6, and `req_011CfLwrYq2N…` reads 522 then 0.
3. **A fork's copy of an earlier line (17 request ids).** The id appears in a parent transcript AND on line 2 of a
   forked subagent's (`subagents/agent-*.jsonl`), with `isSidechain: true` and the fork's `agentId`. 16 copies repeat
   the final usage. The copies of one request, `req_011CepD5FppC…`, in four agents, repeat an EARLY line: output 9 of
   16,886, with no thinking detail. `<session>.jsonl` sorts before `<session>/…`, so the copy is walked last, and
   last-line counting reads it.

In walk order, therefore, exactly three requests' counts fall: the two zeroed re-appends and the early-line fork
copy. The largest-line rule reads every shape right.

**Finding 2 of `token-cost-2026-08-18.md` ("subagent transcripts are stored disjointly") no longer holds** because
of shape 3. **Its finding 1 ("one distinct usage object per request") no longer holds** because of shapes 1 and 2.

## 4. The rule's one assumption: the largest line is the completed one

The rule assumes that no line of a request records more output than its completed one. A transcript does not label
"completed" directly. The best available mark is `stop_reason`, which the completed message carries. Over 44,734
requests:

```json
{
  "requests": 44734,
  "noStopAnywhere": 9727,
  "maxLineHasStop": 35007,
  "maxLineLacksStopButOtherHas": 0,
  "stopLineAboveMax": 0,
  "nonZeroedStopLinesBelowMax": 0
}
```

On **every** request that carries a `stop_reason` on any line (35,007), the largest line carries one. No line with a
`stop_reason` falls below its request's maximum, apart from the zeroed re-appends. The 9,727 requests with no
`stop_reason` anywhere give no second signal, so for them the maximum is the only one. This is evidence, not proof,
and the rule stays **advisory** in that respect. A request still being written when a renderer runs is counted at the
largest line written so far.

## 5. Why identity comes from the FIRST line

If a request's timestamp were taken from its selected (largest) line, **9,129** requests' timestamps would move, by
up to **301.75 s**. The ledger decides run membership and stage attribution from that timestamp, so a move would
re-decide both for no reason the defect gives. A first line's timestamp is fixed once written, and the largest line
can still change while a request completes. So `sessionRequests()` returns the first line as the request's
`record` and the largest line's `usage` beside it.

## 6. What this does not establish

- **Nothing about other machines, accounts or Claude Code versions.** One user's local transcripts, dated.
- **Not when the platform began writing disagreeing lines.** Everything older than 2026-09-07 is pruned.
- **Not that the largest line is always the completed one.** Section 4 is the evidence, and it is bounded.
- **Nothing about dollars.** Tokens only, as in every cost artifact in this repository.

## 7. The classes compared exactly, request by request (added after the first review, R9)

`check-cost-ledger.mjs --verify-transcript` compares four classes exactly: input, cache read and both cache writes.
It compares `output` and `output_thinking` as recorded ≤ re-derived. The four are compared exactly because they did
not differ between a request's FIRST line and its SELECTED line (greatest `output_tokens`, earliest on a tie) on any
measured request. Section 2's totals could not show that, so it was measured per request over 989 files and 46,073
requests, the live corpus a few hours after section 2:

```json
{ "requests": 46073, "fixedClassesDifferFirstVsSelected": 0, "oldestTranscriptDay": { "day": "2026-09-07", "version": "2.1.263" } }
```

The Claude Code versions on disk, by the first line of each request:

| version | requests | dates                    |
| ------- | -------- | ------------------------ |
| 2.1.234 | 301      | 2026-09-08               |
| 2.1.241 | 1        | 2026-09-07               |
| 2.1.260 | 219      | 2026-09-08               |
| 2.1.263 | 5,999    | 2026-09-07 to 2026-09-10 |
| 2.1.265 | 680      | 2026-09-08 to 2026-09-09 |
| 2.1.266 | 2,212    | 2026-09-09 to 2026-09-10 |
| 2.1.267 | 2,149    | 2026-09-10               |
| 2.1.270 | 3,113    | 2026-09-14 to 2026-09-15 |
| 2.1.272 | 6,033    | 2026-09-15 to 2026-09-21 |
| 2.1.273 | 52       | 2026-09-18 to 2026-09-20 |
| 2.1.276 | 386      | 2026-09-20               |
| 2.1.278 | 6,868    | 2026-09-20 to 2026-09-22 |
| 2.1.280 | 9,314    | 2026-09-22 to 2026-09-25 |
| 2.1.281 | 8,746    | 2026-09-25 to 2026-09-26 |

`measure-fixed.mjs` uses the same walk and filter as the renderer. It reads numeric usage fields, ids, timestamps and
`version` only:

```js
// Per request, in the renderer's walk order: do the four classes that are compared EXACTLY (input, cache read,
// both cache writes) differ between the request's FIRST line and its SELECTED line (greatest output_tokens,
// earliest on a tie)? Also: which Claude Code versions are on disk, and when. Reads numeric usage fields, ids,
// timestamps and `version` only -- never message content.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2];
const files = [];
const walk = (d) => {
  let es;
  try {
    es = readdirSync(d, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of es) {
    const p = join(d, e.name);
    if (e.isDirectory()) {
      if (e.name !== "tool-results") walk(p);
    } else if (e.name.endsWith(".jsonl")) files.push(p);
  }
};
walk(root);
files.sort();
const byId = new Map();
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const line of text.split("\n")) {
    if (!line || !line.includes('"assistant"')) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (r?.type !== "assistant") continue;
    const u = r.message?.usage;
    if (!u) continue;
    if ((r.message?.model ?? "unknown") === "<synthetic>") continue;
    const id = r.requestId ?? r.message?.id;
    if (!id) continue;
    let e = byId.get(id);
    if (!e) {
      e = [];
      byId.set(id, e);
    }
    e.push({ u, ts: r.timestamp, ver: typeof r.version === "string" ? r.version : null });
  }
}
const rank = (u) => (Number.isFinite(u?.output_tokens) ? u.output_tokens : -1);
const fixed = (u) =>
  [
    u.input_tokens ?? 0,
    u.cache_read_input_tokens ?? 0,
    u.cache_creation?.ephemeral_5m_input_tokens ?? 0,
    u.cache_creation?.ephemeral_1h_input_tokens ?? 0,
  ].join("/");
let differ = 0;
const versions = new Map();
let oldest = null;
for (const rs of byId.values()) {
  let sel = rs[0];
  for (const x of rs) if (rank(x.u) > rank(sel.u)) sel = x;
  if (fixed(rs[0].u) !== fixed(sel.u)) differ++;
  const v = rs[0].ver ?? "(none)";
  const day = (rs[0].ts ?? "").slice(0, 10);
  const b = versions.get(v) ?? { requests: 0, first: null, last: null };
  b.requests++;
  if (day && (!b.first || day < b.first)) b.first = day;
  if (day && (!b.last || day > b.last)) b.last = day;
  versions.set(v, b);
  if (day && (!oldest || day < oldest.day)) oldest = { day, version: v };
}
const cmp = (a, b) => a.localeCompare(b, "en", { numeric: true });
console.log(
  JSON.stringify(
    {
      files: files.length,
      requests: byId.size,
      fixedClassesDifferFirstVsSelected: differ,
      oldestTranscriptDay: oldest,
      versions: Object.fromEntries([...versions.entries()].sort(([a], [b]) => cmp(a, b))),
    },
    null,
    1
  )
);
```

---

## The scripts

Both are Node stdlib only and read no message content. Run each with the projects directory as the argument.

`measure-rules.mjs` (sections 2 and 5):

```js
// Compares per-request selection rules over every transcript under a projects dir, in the SAME walk
// order render-cost-record.mjs uses (sorted paths, tool-results/ skipped, lines in file order).
// Reads only numeric usage fields, ids and timestamps -- never message content.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2];
const files = [];
const walk = (d) => {
  let es;
  try {
    es = readdirSync(d, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of es) {
    const p = join(d, e.name);
    if (e.isDirectory()) {
      if (e.name !== "tool-results") walk(p);
    } else if (e.name.endsWith(".jsonl")) files.push(p);
  }
};
walk(root);
files.sort();
const byId = new Map();
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const line of text.split("\n")) {
    if (!line || !line.includes('"assistant"')) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (r?.type !== "assistant") continue;
    const u = r.message?.usage;
    if (!u) continue;
    if ((r.message?.model ?? "unknown") === "<synthetic>") continue;
    const id = r.requestId ?? r.message?.id;
    if (!id) continue;
    let e = byId.get(id);
    if (!e) {
      e = [];
      byId.set(id, e);
    }
    e.push({ u, ts: r.timestamp });
  }
}
const cls = (u) => ({
  input: u.input_tokens ?? 0,
  cw5: u.cache_creation?.ephemeral_5m_input_tokens ?? 0,
  cw1: u.cache_creation?.ephemeral_1h_input_tokens ?? 0,
  read: u.cache_read_input_tokens ?? 0,
  output: u.output_tokens ?? 0,
  thinking: u.output_tokens_details?.thinking_tokens ?? 0,
});
const rank = (u) => (Number.isFinite(u?.output_tokens) ? u.output_tokens : -1);
const rules = {
  first: (rs) => rs[0].u,
  last: (rs) => rs.at(-1).u,
  maxFirstTie: (rs) => {
    let b = rs[0];
    for (const x of rs) if (rank(x.u) > rank(b.u)) b = x;
    return b.u;
  },
  maxLastTie: (rs) => {
    let b = rs[0];
    for (const x of rs) if (rank(x.u) >= rank(b.u)) b = x;
    return b.u;
  },
};
const tot = Object.fromEntries(Object.keys(rules).map((k) => [k, { input: 0, cw5: 0, cw1: 0, read: 0, output: 0, thinking: 0 }]));
let tieDiffer = 0,
  tieCount = 0,
  maxTsShiftMs = 0,
  shifted = 0;
for (const [, rs] of byId) {
  for (const [k, fn] of Object.entries(rules)) {
    const c = cls(fn(rs));
    for (const q in c) tot[k][q] += c[q];
  }
  const mx = Math.max(...rs.map((x) => rank(x.u)));
  const atMax = rs.filter((x) => rank(x.u) === mx);
  if (atMax.length > 1) {
    tieCount++;
    if (new Set(atMax.map((x) => JSON.stringify(cls(x.u)))).size > 1) tieDiffer++;
  }
  const firstTs = Date.parse(rs[0].ts);
  const sel = rs.find((x) => rank(x.u) === mx);
  const selTs = Date.parse(sel.ts);
  if (Number.isFinite(firstTs) && Number.isFinite(selTs) && selTs !== firstTs) {
    shifted++;
    maxTsShiftMs = Math.max(maxTsShiftMs, selTs - firstTs);
  }
}
console.log(
  JSON.stringify(
    {
      files: files.length,
      requests: byId.size,
      tiesAtMax: tieCount,
      tiesWhoseClassesDiffer: tieDiffer,
      requestsWhoseSelectedTsDiffersFromFirst: shifted,
      maxTsShiftSeconds: maxTsShiftMs / 1000,
      totals: tot,
    },
    null,
    1
  )
);
```

`probe-completed.mjs` (section 4):

```js
// Grill probe: is the largest-output line the one carrying the completed message (a stop_reason)?
// Reads stop_reason, output_tokens, ids -- never message content.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2];
const files = [];
const walk = (d) => {
  let es;
  try {
    es = readdirSync(d, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of es) {
    const p = join(d, e.name);
    if (e.isDirectory()) {
      if (e.name !== "tool-results") walk(p);
    } else if (e.name.endsWith(".jsonl")) files.push(p);
  }
};
walk(root);
files.sort();
const byId = new Map();
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const line of text.split("\n")) {
    if (!line || !line.includes('"assistant"')) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (r?.type !== "assistant") continue;
    const u = r.message?.usage;
    if (!u) continue;
    if ((r.message?.model ?? "unknown") === "<synthetic>") continue;
    const id = r.requestId ?? r.message?.id;
    if (!id) continue;
    let e = byId.get(id);
    if (!e) {
      e = [];
      byId.set(id, e);
    }
    e.push({
      out: Number.isFinite(u.output_tokens) ? u.output_tokens : -1,
      stop: r.message?.stop_reason ?? null,
      zeroed: u.input_tokens === 0 && u.output_tokens === 0 && u.cache_read_input_tokens === 0,
    });
  }
}
const s = {
  requests: byId.size,
  noStopAnywhere: 0,
  maxLineHasStop: 0,
  maxLineLacksStopButOtherHas: 0,
  stopLineAboveMax: 0,
  nonZeroedStopLinesBelowMax: 0,
  examplesBelow: [],
};
for (const [id, rs] of byId) {
  const max = Math.max(...rs.map((x) => x.out));
  const stops = rs.filter((x) => x.stop !== null);
  if (stops.length === 0) {
    s.noStopAnywhere++;
    continue;
  }
  if (rs.some((x) => x.out === max && x.stop !== null)) s.maxLineHasStop++;
  else s.maxLineLacksStopButOtherHas++;
  const below = stops.filter((x) => x.out < max && !x.zeroed);
  if (below.length) {
    s.nonZeroedStopLinesBelowMax++;
    if (s.examplesBelow.length < 5)
      s.examplesBelow.push({
        id: id.slice(0, 16),
        outs: rs.map((x) => `${x.out}${x.stop ? "/" + x.stop : ""}${x.zeroed ? "/Z" : ""}`).join(" "),
      });
  }
}
console.log(JSON.stringify(s, null, 1));
```

## Raw output (the rule-comparison run)

```json
{
  "files": 986,
  "requests": 44253,
  "tiesAtMax": 23773,
  "tiesWhoseClassesDiffer": 0,
  "requestsWhoseSelectedTsDiffersFromFirst": 9129,
  "maxTsShiftSeconds": 301.75,
  "totals": {
    "first": { "input": 232414, "cw5": 150553862, "cw1": 125844583, "read": 14352722236, "output": 25703622, "thinking": 9469497 },
    "last": { "input": 232410, "cw5": 150553862, "cw1": 125844583, "read": 14352454415, "output": 38976711, "thinking": 16183409 },
    "maxFirstTie": { "input": 232414, "cw5": 150553862, "cw1": 125844583, "read": 14352722236, "output": 38996675, "thinking": 16190248 },
    "maxLastTie": { "input": 232414, "cw5": 150553862, "cw1": 125844583, "read": 14352722236, "output": 38996675, "thinking": 16190248 }
  }
}
```
