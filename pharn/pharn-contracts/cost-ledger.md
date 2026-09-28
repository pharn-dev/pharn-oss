---
file: "cost-ledger.md"
layer: "pharn-contracts"
trust: trusted
purpose: "The shape of pharn/features/<name>/cost.json — the per-run cost ledger a pipeline stage emits at its stop. Schemas only, zero behavior (ARCHITECTURE.md §4)."
schema: "pharn-cost-ledger/2"
emitted_by: "pharn/floor/render-cost-ledger.mjs"
checked_by: "pharn/floor/check-cost-ledger.mjs"
---

# Contract — cost-ledger

> Read `pharn/CONSTITUTION.md` first. Principle references (P0–P7) point there and are not restated
> here (P4).

A **cost ledger** is the machine-readable record of what one pipeline run consumed, written at the run's
stop — green or not. It exists so a reader can compute what a feature cost **in money**, deterministically,
**against their own price list**, from a file in the repository.

It is written by `pharn/floor/render-cost-ledger.mjs` and validated by `pharn/floor/check-cost-ledger.mjs`.

**It measures ONE RUN, not a session and not a feature.** Since `pharn-cost-ledger/2` every row and every
aggregate is restricted to the run's own window, so unrelated work done earlier or later in the same Claude
Code session is excluded rather than summed. Since 6.29.0 (membership `run-window/2`, below) it is also
restricted to the run's own CONTEXTS — the thread that ran the run and the agents that thread spawned during it —
so another run working inside the same window in the same session is excluded too, and when the transcript
cannot say which context a request belongs to, the ledger says membership is unknown. It is not a feature's
lifetime cost either: a new invocation for the same feature opens a new window.

**TWO commands emit one, and the set is named here so a third is a deliberate addition rather than a
discovery.** `/pharn-loop` emits at every stop that has a feature directory; `/pharn-ship` emits at
every exit that ends the run — GATE 2 and every STOP — from its own Step 3a, before its attestation step
so that neither an attestation STOP nor a `requireAttestation` halt can skip it. Both reuse this one
emitter unchanged: there is no per-command fork and no second copy.

---

## The governing principle: record facts, derive views

Exactly two things are **irrecoverable after the run**: per-request usage, and phase boundaries. Claude
Code prunes session transcripts on its own schedule (`cleanupPeriodDays`), and a phase boundary is a fact
about a **moment** that nothing writes down unless something writes it down then. The 2026-08-18
token-cost measurement lost three features to exactly this (§9).

So the ledger records **both as facts** — `requests[]` and `markers[]` — and every aggregate in the file
is a **pure function** of `requests[]`. That is what lets the checker recompute all of them and compare.

**Phase attribution is a VIEW with a named, versioned method**, not a stored truth. This matters because
the platform's own `attributionSkill` field does not answer "which stage": measured on this repo's
`loop-decision-integrity` run, 213 of 275 deduped requests were tagged and **every one of them was
tagged `pharn-loop`**, with no sub-stage named anywhere. The field is therefore recorded **raw**, in
`requests[].attribution_skill`, and nothing depends on it.

---

## The object

```jsonc
{
  "schema": "pharn-cost-ledger/2",
  "name": "<feature slug>",
  "command": "/pharn-loop",
  "base_sha": "<sha | unknown>",
  "outcome": { "decision": "STOP_GREEN", "iterations": 1, "source": "LOOP.md" },
  "skills_version": "6.5.0",
  "skills_version_source": "SKILLS_VERSION",
  "claude_code_versions": ["2.1.278"],
  "sessions": ["<session uuid>"],
  "window_start": "2026-09-21T08:35:42.425Z",
  "window_end": "2026-09-21T09:40:52.438Z",
  "coverage": "partial",
  "coverage_note": "<why it is never complete>",
  "dedup_key": "requestId",
  "attribution": { "method": "latest-marker-at-or-before-ts-same-session/1", "markers": 12 },
  "pricing_note": "TOKENS ONLY — …",
  "markers": [{ "seq": 1, "kind": "run-start", "stage": null, "iteration": null, "ts": "…", "session_id": "…", "mode": "quick" }],
  "requests": [
    {
      "request_id": "req_…",
      "ts": "2026-09-21T08:35:42.425Z",
      "session_id": "<session uuid>",
      "model": "claude-opus-5",
      "sidechain": false,
      "agent_id": null,
      "attribution_skill": "pharn-loop",
      "usage": { "…": "the request's line with the most output tokens, leaf-filtered" },
      "tokens": { "input": 2, "cache_write_5m": 0, "cache_write_1h": 44498, "cache_read": 28913, "output": 1046, "output_thinking": 726 },
      "stage": "pharn-build",
      "iteration": 1,
    },
  ],
  "totals": { "requests": 275, "tokens": { "…": 0 } },
  "by_model": [{ "model": "…", "requests": 0, "tokens": {} }],
  "by_stage_iteration_model": [{ "stage": "…", "iteration": 1, "model": "…", "requests": 0, "tokens": {} }],
  "unattributed": { "requests": 62, "tokens": {} },
  "dropped": [],
  "membership": {
    "method": "run-window/2",
    "status": "bounded",
    "reason": null,
    "session": "<the selected session uuid>",
    "start": "2026-09-21T08:35:00.000Z",
    "end": "2026-09-21T09:40:52.000Z",
    "excluded_requests": 14,
    "context": "agent:<the agent id that printed the run's markers>",
    "contexts": ["agent:<that id>", "agent:<an agent it spawned during the run>"],
  },
  "executions": {
    "method": "stage-start-to-return/1",
    "status": "derived",
    "reason": null,
    "rows": [
      {
        "stage": "pharn-regress",
        "iteration": 1,
        "run": 1,
        "start_seq": 7,
        "end_seq": 8,
        "elapsed_ms": 412345,
        "unmeasured": null,
        "work": [0],
      },
    ],
  },
  "work": [
    {
      "schema": "pharn-stage-work/1",
      "stage": "pharn-regress",
      "ts": "…",
      "session_id": "…",
      "head": { "required": 4, "executed": 3, "reused": 0, "no_files": 1 },
      "base": { "evidence": "fresh", "miss": "no-record", "required": 4, "executed": 3, "reused": 0, "no_files": 1 },
      "install": { "exit": 0, "timed_out": false, "ms": 41234 },
    },
  ],
}
```

---

## Field shape + trust classes

`pharn/floor/check-cost-ledger.mjs` owns every rule below. The **top-level key set is CLOSED**: exactly
the keys above, no more and no fewer, asserted in **both** directions. A per-member presence set would be
satisfied by a variant spelling of any member; closure is what makes a variant fail.

| field                                                               | shape                                                                                                                                                                                           | class                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `schema`                                                            | `pharn-cost-ledger/2` (or the legacy `/1`, see Compatibility)                                                                                                                                   | FLOOR (enum)                                                                         |
| `name`                                                              | the feature slug                                                                                                                                                                                | FLOOR (present)                                                                      |
| `command`                                                           | the emitting command — `/pharn-loop` or `/pharn-ship`                                                                                                                                           | FLOOR (present)                                                                      |
| `base_sha`                                                          | the run's base SHA, or the literal `unknown`                                                                                                                                                    | FLOOR (present)                                                                      |
| `outcome`                                                           | `{decision, iterations, source, blocked?}`, or `null` — see below                                                                                                                               | FLOOR (shape, rule 5)                                                                |
| `skills_version`                                                    | the version string, or `null`                                                                                                                                                                   | **ADVISORY** (shape unchecked; a value beside an `unknown` source is RED)            |
| `skills_version_source`                                             | `pharn.config.json` \| `SKILLS_VERSION` \| `unknown`                                                                                                                                            | FLOOR (enum)                                                                         |
| `claude_code_versions`                                              | sorted distinct `version` values seen on the records, each a rule-3 token                                                                                                                       | FLOOR (array + enum-regex, rule 3)                                                   |
| `sessions`                                                          | sorted distinct session ids, each a rule-3 token                                                                                                                                                | FLOOR (array + enum-regex, rule 3)                                                   |
| `window_start` / `_end`                                             | ISO timestamps from the **records' own** values, or `null`                                                                                                                                      | **ADVISORY** (written from data; no checker op)                                      |
| `coverage`                                                          | `partial` \| `unavailable` — **there is no `complete`**                                                                                                                                         | FLOOR (enum)                                                                         |
| `dedup_key`                                                         | the literal `requestId`                                                                                                                                                                         | FLOOR (enum)                                                                         |
| `attribution.method`                                                | the versioned method name                                                                                                                                                                       | FLOOR (enum)                                                                         |
| `pricing_note`                                                      | must state the file carries tokens, never prices                                                                                                                                                | FLOOR (regex)                                                                        |
| `markers[].seq`                                                     | integers, **strictly increasing**                                                                                                                                                               | FLOOR (integer compare)                                                              |
| `markers[].kind`                                                    | `run-start` \| `stage-start` \| `orchestrator` \| `run-stop`                                                                                                                                    | FLOOR (enum)                                                                         |
| `markers[].mode`                                                    | (6.25.0) absent, or a `MARKER_MODES` member (today: `quick`)                                                                                                                                    | **ADVISORY** (a marker field — see "Mode" below)                                     |
| `markers[].route`                                                   | (6.27.0) absent, or a route token (`agent:<alias>` \| `inline:<reason>`)                                                                                                                        | **ADVISORY** (a marker field — see "Route" below)                                    |
| `requests[].request_id`                                             | a rule-3 token, **unique across the array**                                                                                                                                                     | FLOOR (set membership + enum-regex)                                                  |
| `requests[].usage`                                                  | every leaf: number \| bool \| null \| a short token; every key a short token other than `__proto__`; no node deeper than `USAGE_MAX_DEPTH`                                                      | FLOOR (enum-regex + integer compare, rule 2)                                         |
| `requests[].model`                                                  | a bounded identity token (<=128 chars, no C0 control char or DEL, no path)                                                                                                                      | FLOOR (enum-regex)                                                                   |
| `requests[].attribution_skill` / `agent_id` / `session_id`          | the same bound, or `null`                                                                                                                                                                       | FLOOR (enum-regex)                                                                   |
| `requests[].tokens.*`                                               | the six classes, each a non-negative safe integer                                                                                                                                               | FLOOR (shape, rule 7)                                                                |
| `requests[].sidechain`                                              | a boolean; with `agent_id` it names the row's CONTEXT (`main` for `false`, `agent:<agent_id>` for `true`)                                                                                       | FLOOR (shape)                                                                        |
| `requests[].stage/iteration`                                        | a string or `null` / a number or `null`; the VALUE is the derived VIEW                                                                                                                          | FLOOR (type, rule 7); the value **ADVISORY** (see below)                             |
| `totals` / `by_model` / `by_stage_iteration_model` / `unattributed` | equal to a recompute from `requests[]`                                                                                                                                                          | FLOOR (recompute + equality)                                                         |
| `dropped[]`                                                         | key paths of values the emitter refused (vocabulary below)                                                                                                                                      | FLOOR (array); the vocabulary is the emitter's output, not a rule                    |
| the whole document                                                  | no node deeper than `WALK_MAX_DEPTH`                                                                                                                                                            | FLOOR (integer compare, rule 8)                                                      |
| `membership`                                                        | `method` `run-window/2`: closed `{method, status, reason, session, start, end, excluded_requests, context, contexts}`; `run-window/1`: the first seven                                          | FLOOR (shape + recompute)                                                            |
| `membership.method`                                                 | `run-window/2`, or the legacy `run-window/1` (never written since 6.29.0, see Compatibility)                                                                                                    | FLOOR (enum)                                                                         |
| `membership.status/reason/start/end`                                | equal to `runWindow()` recomputed over the file's own `markers[]`; under `run-window/2` a known window may instead be `unknown` for a context reason, and then only `start`/`end` must equal it | FLOOR (recompute + equality)                                                         |
| `membership.context` / `contexts`                                   | a measured ledger: a context key and a sorted, duplicate-free, non-empty list of context keys that includes it; otherwise both `null`                                                           | FLOOR (shape + set membership); the VALUE **ADVISORY** without `--verify-transcript` |
| every `requests[]` row                                              | a MEMBER of that recomputed window, and (`run-window/2`) its context one of `contexts`                                                                                                          | FLOOR (ordering test + set membership)                                               |
| `membership.excluded_requests`                                      | an integer (known window) or `null` (unknown) — its VALUE                                                                                                                                       | **ADVISORY** without `--verify-transcript`; with it, a RANGE (rule 6)                |
| `executions`                                                        | (6.35.0) `{method, status, reason, rows}`, equal to `buildExecutions` recomputed from `markers[]` and `work[]`                                                                                  | FLOOR (recompute + equality, rule 9); what an interval MEANS **ADVISORY**            |
| `work[]`                                                            | (6.35.0) `pharn-stage-work/1` records: closed keys, enums, `executed + reused + no_files = required`; each a MEMBER of the recomputed window                                                    | FLOOR (enum + integer compare, rule 9); that the record is true **ADVISORY**         |

**One row per request, and which of its transcript lines each value comes from (6.24.1).** `dedup_key` names
the grouping. The platform writes one API request to the transcript as several lines, sometimes in more than one
file, and those lines need not carry the same usage:

- an earlier line can record fewer output tokens, and no thinking detail, than the last one;
- a request can be written again later with its counts zeroed;
- a forked subagent's transcript can open with a copy of an earlier line of a parent request.

A row's identity fields and `ts` therefore come from the request's FIRST line in walk order. Its `usage` and
`tokens` come from the request's line with the greatest `output_tokens`, the earliest such line on a tie. This
paragraph defines the rule for the contracts and commands: `ship-record.md` and `/pharn-ship` cite it rather than
restate it. `CLAUDE.md`, the cost modules' headers and the CHANGELOG entry summarize it, and where a summary differs,
this paragraph governs. It has one implementation, `sessionRequests()` in `pharn/floor/transcript-core.mjs`, which
both cost renderers import.
`--verify-transcript` re-derives through the emitter.

- **Floor:** the selection itself is an integer compare in a tested, deterministic reader.
- **Advisory, and the rule's one assumption:** that the line with the most output tokens IS the request's completed
  usage. It rests on a platform behaviour — no line of a request was seen recording more output than its completed
  one — and on every request measured on 2026-09-26 that carried a `stop_reason`, the largest line carried one.
- **Bound:** a request still being written when the ledger is emitted is recorded at the largest line written so
  far, and a later line can carry more. That is why `--verify-transcript` compares `output` and `output_thinking` as
  recorded ≤ re-derived instead of exactly (rule 6).

A request found in several files is one row, under the identity of the copy walked first: the parent's, for every
fork observed.

**Which transcript lines are requests, and what a refused value becomes (6.28.1).** The transcript is untrusted
input, and parsed JSON can put any value where a string or a count is expected: `{"toString":1}` makes `String()`
throw. Until 6.28.1 the emitter coerced first and bounded second, so one crafted line crashed both cost renderers.
Now every transcript value the cost tooling reads is tested for type and domain BEFORE anything coerces it, by the
predicates in
`pharn/floor/cost-value-core.mjs` (`isIdentityToken`, rule 3's bound; `isTokenCount`, rule 7's).

- **A line is a request** only when its `message.usage` is a plain object (not null, not an array, a string or a
  number) and its resolved id — `requestId`, else `message.id` — satisfies rule 3's bound. A `requestId` that is
  present and not `null` but fails never falls back to `message.id`, because a fallback could split one request
  across two keys; a `null` one counts as absent. A line
  that fails either test is not a request: no row, and not counted in `excluded_requests`. The per-request selection
  ranks only by an `output_tokens` that rule 7 admits. `sessionRequests()` is the one implementation, as above.
- **A request outside the run window** is only counted, never emitted, so nothing about it is listed. Under a known
  window it is counted in `excluded_requests`; under an unknown window that field is `null`. A timestamp that does not
  parse makes a request such a non-member.
- **A refused value on a row** (a request inside the run window) takes a fixed fallback, and its path is listed in
  `dropped[]`:
  - an identity field (`model`, `agent_id`, `attribution_skill`, `session_id`) → `model` becomes `unknown`, the
    others `null`;
  - `version` → left out of `claude_code_versions[]`;
  - a count → `0` for that class;
  - a `usage` key rule 2 refuses, or a node deeper than `USAGE_MAX_DEPTH` → left out of the `usage` copy.
- **An ABSENT value** keeps the fallback it always had and is not listed.
- **Run membership is not changed by any of this.** It reads the session as before: a string as itself, anything
  else as absent. Only the emitted `session_id` is bounded, so a refused session string is still excluded by markers
  bound to another session.

**The `dropped[]` vocabulary**, as the emitter writes it. It is the emitter's output, pinned by the emitter's tests;
the checker checks only that `dropped` is an array:

- `requests[<n>].<field>` for an identity field, and `requests[<n>].version` for a version, named after its source
  field because a row has no version field;
- `requests[<n>].tokens.<class>` for a count;
- `usage.<path>` for a `usage` leaf or node, and `usage.<path>.<refused-key>` for a refused key. The marker is fixed,
  so the raw key never reaches the file.

`<n>` is the row's index BEFORE the rows are sorted by `ts`, so in a multi-file transcript it can name the wrong row
(the Residual section's `cost-ledger-dropped-row-index`).

**`outcome` is copied VERBATIM from the `LOOP.md` envelope** (`pharn/pharn-contracts/loop-record.md` —
cited, not restated, P4), read from the `---`-fenced frontmatter only and never grepped from the body. The
ledger introduces **no second source of truth** for the decision. Its shape is deliberately general enough
that `/pharn-ship` fits later without a schema change.

**There is no `commit` field, and its absence is deliberate.** `LOOP.md`'s `commit` is HEAD _before_ the
loop commits, so it is the base — which is what `base_sha` already carries. A green run's `cost.json`
lands _inside_ the loop's own commit, so a field naming that commit could not be written before it exists.

---

## Run membership — `run-window/2` (the window since `pharn-cost-ledger/2`, the context half since 6.29.0)

A request is a run member iff it is inside the run's WINDOW (rules 1–4, the `run-window/1` rule, unchanged) AND its
CONTEXT is in the run's context set (rules 5–8, "The context half" below). Both halves are decided in
`pharn/floor/run-window-core.mjs`, which the emitter and the checker import.

**Why the window exists — a real failure (P7).** Through `/1`, markers decided only the stage VIEW, never the
request POPULATION: every usage-bearing request of the selected session was a row. A session that spent
100 input tokens on unrelated work and then 10 inside a run reported **110**, the 100 sat in
`unattributed`, and the checker was GREEN. The file agreed with itself and misdescribed the run
([[L43]]).

**Membership and attribution are two decisions, made by two functions.** Membership asks "is this
request part of the run?", and it is decided ONCE, in `pharn/floor/run-window-core.mjs`, which the
emitter and the checker both import. Attribution asks "which stage?", and it is the unchanged
`attribution.method` below, applied to members only. A member with no preceding stage marker is
`unattributed` **and** counts in `totals`. `unattributed` is now a stage bucket INSIDE the run, never
an out-of-run bucket.

**The rule.**

1. The **current run** is the markers from the LAST `run-start` (by `seq`) onward. A new invocation
   always writes a fresh `run-start`, and resuming never does. So a new invocation for the same feature
   gets a new window, and a resumed run keeps its own.
2. It is **closed** by the LAST `run-stop` in the current run. A re-emission extends the window, it
   never truncates it. With no `run-stop` the run is **open**, which the checker WARNs.
3. Each **session** opens at its EARLIEST current-run marker. A marker with `session_id: null` binds
   every session. So a run resumed in a new session does not absorb that session's pre-resume work.
4. A request is a **member** iff its timestamp parses, `opening(session) <= ts`, and the run is open or
   `ts <= end`. Both bounds are inclusive. Timestamps are compared as **numbers**
   (`Date.parse` after an ISO shape test), never as strings, because `…:00Z` sorts after `…:00.000Z`.

**`status` is `bounded` | `open` | `unknown`, and unknown fails CLOSED.** Membership is `unknown` when:

- there are no markers;
- there is no `run-start`;
- the latest `run-start` or a `run-stop` has no valid timestamp;
- the stop precedes the start;
- a stage or orchestrator marker follows a `run-stop` without a new `run-start` — the markers may span
  two invocations;
- no current-run marker is bound to the selected session;
- (6.29.0) the window is known but the run cannot be bound to one context, or a request inside it cannot be placed
  (the three context reasons, below).

The reason is recorded from a closed set. An `unknown` ledger is `coverage: unavailable` with **no
rows** and `excluded_requests: null`. Whole-session usage is never presented as run usage, and nothing
is shown as zero. A **known** window that contains no request is different: it is an **observed zero**,
`coverage: partial` with an empty `requests[]`, and the checker admits that shape ONLY under a known
window ([[L34]]).

**`excluded_requests`** counts the deduped session requests that fell outside the run: outside a known window,
or (6.29.0) inside it from a context outside the run's set. `coverage_note` gives the second number. It is the
minimum needed to explain an exclusion. No excluded-token aggregate and no session ledger is kept.

**It is a count taken AT EMISSION, and one of its two parts keeps growing after that.** The transcript is
append-only, so the requests before the window are fixed once the window is. The requests after the
window's end are not. The emission's own turn is already among them, and the session goes on writing: the
stop's commit, the summary, and whatever the session does next. A later re-derivation therefore finds the
same before-window count and a larger after-window one. `--verify-transcript` checks this field as a range
for that reason (rule 6). The split itself is never written into the file.

**The start boundary, and why `/pharn-ship` needs a pending one.** `/pharn-loop` names its feature
before `/pharn-spec` runs, so its `run-start` already precedes spec work. `/pharn-ship` cannot: the
feature name is the marker directory, and `/pharn-spec` is what resolves it. So `/pharn-ship` calls
`mark-phase.mjs --pending-start` FIRST. That records a moment keyed by session id. The later named
`run-start --adopt-pending` in the same session adopts that moment and marks itself `origin: "pending"`,
which survives into `markers[]`. **Adoption is opt-in, and only `/pharn-ship` opts in.** A `run-start`
without the flag, such as every `/pharn-loop` run-start, never adopts. Before this was opt-in, a pending
file left by an abandoned ship was adopted by a later loop in the same session, and that widened the
loop's window.

**The bounds, each stated where the rule is:**

- **The initial request.** The request that ISSUES a boundary call precedes the marker it writes. It
  therefore falls before the window it opens. Correcting that would be a guess.
- **The unwritten tail.** The emission's own turns, and anything after `run-stop`, are not in the window.
- **Marker execution is ADVISORY.** Markers are Bash calls in command prose (L19). A skipped, stale or
  mistimed marker mis-bounds a window that the rule then computes faithfully. A pending start left by an
  abandoned `/pharn-ship` in the same session is adopted by a later `/pharn-ship` `run-start` whose own
  `--pending-start` was skipped, and that widens the window. Membership is exact **relative to the recorded markers**,
  never to the truth.
- **The selected session only.** The transcript read is the one session the emitter was pointed at.
  Markers written in another session prove nothing about that session's requests: they were not
  collected, and they are **not** in `excluded_requests` either.
- **Transcript timestamps are untrusted.** A crafted record can move itself into or out of the window.
  This is bounded: it affects a view that gates nothing.

### The context half (6.29.0)

**Why it exists — a real failure (P7).** A subagent's Bash sees its PARENT's session id and no id of its own
(measured), so every marker a run writes from inside an agent is bound to the parent session, and the window alone
admitted every concurrent context's request inside it. Three `/pharn-loop` runs in three background agents of one
session produced three ledgers sharing 357, 381 and 411 of their 370, 407 and 411 rows, main-thread rows included.
The measurements behind this section are in `.dev/measurements/cost-ledger-run-scope-2026-09-27.md` (in the PHARN
repository, not an install).

**The rule.**

1. **A context** is `main`, the session's own thread, or `agent:<agentId>`, one agent. A transcript record claims
   one by `isSidechain` — exactly `false` is `main`; exactly `true` with an `agentId` rule 3 admits is that agent;
   anything else is undecidable — and the claim counts only when the FILE it was read from names the same context
   (`<session>.jsonl` is `main`; `<session>/subagents/agent-<id>.jsonl` and
   `<session>/subagents/workflows/<run>/agent-<id>.jsonl` are that agent). A request's context is its first
   line's (the row rule above). A row's context is read back from `sidechain` and `agent_id` alone, and the emitter
   writes a row only when that reading equals the request's context.
2. **The binding.** The run's context `C` is the ONE context whose tool results carry, as a whole `\n`-delimited
   line, a line `mark-phase.mjs` printed for a current-run marker bound to the selected session. The line is
   rebuilt from the marker's own fields by `markerLine()` in `mark-phase.mjs`, the one encoding its CLI prints. No
   such context: `unknown`, "no … carries … a line mark-phase printed for this run". More than one: `unknown`,
   "… appear in the tool results of more than one context". A copy of a line in a second context therefore
   refuses; it never re-binds.
3. **The set `S`.** `C` is in `S`. `main` is in `S` only when it is `C`. An agent is in `S` iff it was spawned by a
   member of `S` at a time inside the window (the session's opening ≤ spawn ≤ end, both inclusive): its
   `agent-<id>.meta.json`, found by listing the `subagents/` directory and read only as a regular file, names a
   `toolUseId`, and exactly one context other than the agent itself holds a `tool_use` block with that id (a fork's
   file opens with a copy of its own spawning line). The spawn time is that holder's earliest record of the block.
   So an agent `C` spawned before the run is not the run's, and neither is a sibling run's agent.
4. **Fail closed.** A window member whose context is undecidable, or whose agent cannot be linked (no meta, no
   `toolUseId`, no single holder, an unreadable spawn time, a cycle), makes membership `unknown`, "a request inside
   the run window comes from a context whose place in the session's agent tree cannot be read". It is never counted
   and never dropped silently.

**Recorded.** `membership.method` is `run-window/2`. `membership.context` is `C` and `membership.contexts` is `S`,
sorted, over `C` and the contexts a transcript line names at or before the window's end (every named context
while the window is open). A context first named after the end has no request inside the window; leaving it out
keeps a closed run's recorded set fixed while the session goes on writing ([[L58]]). Both are `null` when nothing
was measured: an unknown membership, no transcript read, or a transcript holding no usage-bearing record
(`coverage: unavailable` under a known window). A context-unknown ledger is shaped like any other unknown one — `coverage: unavailable`, no
rows, `excluded_requests: null` — and keeps its window's `start` and `end`, which the checker still re-derives
from `markers[]`.

**What the binding reads, and what that costs ([[L6]]).** No structured location records which context ran a
run: the environment carries no agent id, and the platform writes the orchestrating context nowhere. So the
binding reads tool-result text, as narrowly as that can be done:

- **Tool results only.** A `tool_result` block's `content` — a string, or its `text` blocks — is read, and nothing
  else: not a user or assistant message, not a `queue-operation` record, not a field outside `message.content`. In
  an agent's transcript that block is the only copy of a command's output (measured).
- **A whole line, equal to a line rebuilt from the marker's own fields.** A substring never counts.
- **A second copy in a TOOL RESULT refuses.** A marker line can legitimately reach a second context. When the copy is
  in that context's tool results, the run becomes `unknown`, never re-bound; a copy anywhere else is not read at all.
  The two measured delivery shapes, each pinned by a test:
  - a FOREGROUND agent's final report is a tool result of the context that spawned it, so an orchestrator whose
    agent quotes a marker line in its report holds that line too: the run is ambiguous, `unknown`;
  - a BACKGROUND agent's hand-back reaches its parent as a `user` record with string content (and a
    `queue-operation` record), and a human's chat paste is a user message: neither is a tool result, so neither
    changes the binding.
- **The printed line is load-bearing.** Changing `markerLine()` changes run membership for every ledger emitted or
  re-derived afterwards: a run whose markers were printed in the old form no longer binds and reads `unknown`,
  never a wrong count. `mark-phase.test.mjs` runs the real CLI for each marker kind and each field that changes the line, and pins that its output
  equals `markerLine()` of the marker read back.

**Bounds, each stated where the rule is:**

- **The transcript layout is undocumented and machine-local.** The file names, the `isSidechain`/`agentId` fields,
  the meta file and its `toolUseId`, and where a command's output lands are the platform's, measured on one machine
  on 2026-09-27 (94,225 usage-bearing records agreed with their file; 382 of 383 agents linked to exactly one other
  context). None is a floor fact. Every departure the tests pin — a missing or non-boolean `isSidechain`, a record
  disagreeing with its file, a missing meta or `toolUseId`, an ambiguous spawn record, output missing from the tool
  result — reads as undecidable, unlinked or unbound, and so as `unknown`. A departure no test has met is not
  covered by that sentence.
- **"`C` is the context that ran the run" is ADVISORY.** It rests on the platform recording a Bash result in the
  calling context's transcript, and on the marker output reaching that result — the pinned lines print to stdout.
  A failure of either reads as `unknown`, except in the named case `cost-ledger-mention-only` (Residual): the
  output never reached the calling context and another context's tool result carries a copy, and then that
  context is measured.
- **"A concurrent run's requests are never counted" is NOT claimed.** What holds is narrower: a request is counted
  only when the transcript links its context to the context whose tool results carry the run's marker lines.
- **Transcript content is untrusted.** A crafted record can claim a marker's line or move a request between
  contexts — the timestamp bound above, one field wider. It gates nothing (fix #3).

## Mode (added 6.25.0, `/pharn-ship --quick`)

A run-start marker may carry `mode: "quick"` — recorded at the MOMENT THE RUN STARTS (the same
capture-at-the-act discipline as every other marker field), never re-derived later from the SPEC's
`spec_kind`: D7 lets a quick SPEC run the full pipeline (a human choice at GATE 1), so the kind alone
cannot tell a quick RUN from a full one. `render-cost-ledger.mjs`'s `normalizeMarkers` keeps the field only
as a `MARKER_MODES` member — the same pattern `origin: "pending"` already uses — so a garbage value is
dropped rather than copied, and `mark-phase.mjs` writes no key at all when `--mode` is absent, which keeps
every pre-6.25.0 marker byte-identical. **No schema bump**: `check-cost-ledger.mjs`'s per-marker rule is
the closed `kind` enum only; it asserts no closed key set over a marker OBJECT, so an old checker reads a
ledger carrying a `mode` key GREEN, unchanged.

**ADVISORY, exactly like every other marker field (fix #7's bound restated, not widened): a `mode` on disk
does not mean the run was invoked with `--quick`, and the reverse.** `ship-outcome-core.mjs`'s `runMode()`
reads only the CURRENT run's run-start (`currentRunMarkers(...)[0]`), by exact equality — an EARLIER run's
quick run-start never makes the current run quick, and vice versa.

**`/pharn-loop --quick` (6.28.0) writes no mode marker.** The loop's mode is its feature SPEC's pinned `spec_kind`,
which its stop core reads and its `LOOP.md` records (and `check-loop-decision.mjs` re-derives); a marker would be a
second, unverified copy of it. The one reader such a marker would feed — the no-`LOOP.md` fallback derivation — reads
a loop ledger as full, and with no `pharn-regress` stage-start after the build that is `stop:pharn-verify`: the
under-claiming direction.

## Route (added 6.27.0, stage-model routing)

Since 6.27.0 `/pharn-ship` and `/pharn-loop` run each stage their routing policy routes as a Claude Code
subagent — a stage agent — requested on the model `models.stages` resolves for it (`pharn/floor/stage-agent-core.mjs`'s
header is the protocol's spec). A stage-start marker may carry `route`, recorded at the MOMENT THE STAGE STARTS
(`mark-phase.mjs --route`, stage-start only): `agent:<alias>` when the stage was REQUESTED as a stage agent on
that alias, `inline:<reason>` when it ran in the orchestrator's own turn, and why. The grammar has one owner,
`pharn/floor/route-token-core.mjs`, a zero-import module; `normalizeMarkers` keeps the field only as a valid
token, so a garbage value is dropped, and `mark-phase.mjs` writes no key at all without the flag. A stage the
policy runs inline in every mode of its command has no route line and no `route` key.

**A routed stage's rows.** A stage agent's requests are read by the same `sessionRequests()` as every other
row: its transcript sits under the parent session's `subagents/` directory, and its records carry the parent's
session id. The orchestrator that printed the run's markers spawned it during the run, so it is in the run's
context set (Run membership, rule 7), and its rows are ordinary run members, `sidechain: true`, with the stage
agent's id in `agent_id` and the model the platform SERVED in `model`. Since 6.29.0 that holds whether the
orchestrator is the session's own thread or itself an agent, and a concurrent run's stage agents in the same
session are excluded: they were spawned by another context. The unchanged attribution method bills the rows to the
routed stage's bucket — as long as the stages run in the foreground one at a time and the `orchestrator` marker
follows the stage's final `read`, both command rules. The same bucket holds the orchestrator's own requests inside the
bracket, `sidechain: false`: the one that issues the Agent call, the one that issues `read`, and the one that
issues the closing `orchestrator` marker (whose first line precedes the marker it writes), plus a relayed
question's requests.

**Reading it (the plan's success measure).** For each stage-start marker whose `route` is `agent:<alias>`, the
`requests[]` rows with that marker's `stage` and `iteration` and `sidechain: true` should be non-empty and carry
one served model in `<alias>`'s family — a person reads the family, because the alias → model id map is the
platform's, and an alias is a mutable pointer. For an `inline:<reason>` marker the bucket holds no sidechain row.

**Bound, and it is the point.** `route` is a REQUEST; `requests[].model` is an OBSERVATION read from a transcript
format the platform does not document (the reader's own stated assumption). The two agreeing is agreement
between two records, never proof that a stage ran on a model, and `check-cost-ledger.mjs` still certifies
internal consistency only. The effort a routed stage ran at is not routed at all.

**No schema bump, and the old-reader direction stated.** `check-cost-ledger.mjs`'s per-marker rule is the closed
`kind` enum and the `seq` order; it asserts no closed key set over a marker OBJECT, and a token cannot carry a
path. So a pre-6.27.0 floor reading a 6.27.0 ledger or marker file stays correct: its `normalizeMarkers`
rebuilds each marker from fixed keys and drops `route`, and its checker reads the ledger GREEN, unchanged. No
other re-derivation of `markers[]` reads the field — run membership, attribution, the ship outcome and the run
report's staleness identity are each unchanged by it, and a test pins that. Reverting leaves only an inert key.

## Compatibility with `pharn-cost-ledger/1`

A `/1` file is **never rewritten, and never retroactively REDed for what `/2` added** — `membership` and the run
scope. `check-cost-ledger.mjs` validates it
under its own closed key set and rules, and adds one WARN: its totals are SESSION-scoped and may include
activity outside the run. `render-run-report.mjs` prints the same label. `--verify-transcript` declines
a `/1` file with a WARN, because its rows are not re-derivable under the run-window rule. Reading a `/1`
total as run-scoped would silently reinterpret historical data. The value rules 6.28.1 added apply to a `/1` file
too (next note).

**A `run-window/1` ledger (a `/2` file written from 6.9.0 through 6.28.x) is never rewritten either, and its rows
may include other contexts' requests.** 6.29.0 reads both methods:

- **Plain mode** validates it under its own seven `membership` keys and the window rules, never REDs it for lacking
  the context half, and WARNs once that it is not context-scoped, naming how many contexts its rows come from.
- **`--verify-transcript` re-derives under `run-window/2`,** the rule in force, over the file's own markers. Where
  the recorded rows are a superset of the re-derived ones, it is RED, and the RED says how many recorded rows are not
  the run's own. As for 6.28.1, where it is RED, that RED is correct: those rows were another context's requests.
  Where the rows agree, it is GREEN.
- **`render-run-report.mjs`** labels its totals "not context-scoped".
- **The old-reader direction.** A checker from 6.28.x or earlier REDs a `run-window/2` ledger twice: its `membership`
  key set is closed at seven keys, and `context` and `contexts` are two more, and it requires the method
  `run-window/1` (probed on a real ledger: both REDs). A 6.29.0 or later checker reads both methods. The files are
  checked by the floor they ship with, so the mismatch needs an older floor reading a newer file.

**A ledger emitted before 6.28.1 from a transcript carrying a value 6.28.1 refuses can now be RED, and where it is,
that RED is correct.** Those values were never valid; the old emitter copied or summed them. Two ways it shows:

- **The new rules RED a value that reached the file as it was, without `--verify-transcript`:** a `usage` deeper than `USAGE_MAX_DEPTH` or with a key
  rule 2 refuses; an identity string rule 3 refuses in `request_id`, `session_id`, `sessions[]` or
  `claude_code_versions[]`; a count that is not a non-negative safe integer (rule 7); or a node deeper than
  `WALK_MAX_DEPTH` (rule 8). This covers `/1` files too.
- **`--verify-transcript` REDs it** where the re-derivation now differs: a row the old emitter kept, or a count it
  summed.

**It is not always RED.** The old emitter coerced a model and a request id through `String()` before bounding them,
so a number, a boolean or a plain object there became a well-formed token, such as `"7"`, `"true"` or
`"[object Object]"`. Neither checker mode REDs such a model, because `--verify-transcript` compares request ids and
counts, never models: the ledger keeps a wrong `model` without a RED for it. Plain mode passes such an id too;
`--verify-transcript` REDs it, because the new reader does not take that line as a request at all.

No genuine transcript measured carries one of these values, so an old ledger from one stays GREEN. That is an observed
platform behaviour, not a floor fact: on 2026-09-26, one maintainer's local transcripts (115,666 usage-bearing lines)
held 0 refused values of any kind, and no `usage` deeper than 4.

**A ledger emitted before 6.24.1 under-counts `output` and `output_thinking`, and it is not rewritten.** Until
6.24.1 both cost renderers kept each request's FIRST transcript line, and on current transcripts that line can carry
an early, smaller output count and no thinking detail. The under-count lands wherever a request's FIRST line carries
fewer output tokens than its largest. A request whose lines disagree only because of a zeroed re-append or a fork's
copy was counted correctly, since its first line is its largest.
Measured on 2026-09-26 over one maintainer's local transcripts (44,253 requests, Claude Code 2.1.234–2.1.281),
first-line counting reported 66% of the output tokens and 58% of the thinking tokens. The input, cache-read and
cache-write classes were equal under both rules on every measured request. For such a ledger:

- **The internal checks stay GREEN.** It is still consistent with itself.
- **`--verify-transcript` reports it with a WARN, not a RED.** For a `/2` ledger whose run window holds such a
  request, and while its transcript exists, the WARN counts every row value whose `output` or `output_thinking` is below
  what the transcript now holds, and names the first three. It cannot tell such a row from a correct ledger whose
  request was still being written at emission, because both read as "recorded below re-derived" (rule 6). So the WARN
  names both causes, and it never claims either. Re-emit while the transcript exists, or read those two classes as a floor.
- **A `/1` ledger** is declined with a WARN, as above.
- **Which rule wrote it:** the ledger's `skills_version` indicates it. That is ADVISORY: the field records the
  configured version, never the bytes of the emitter that ran.

## The FLOOR rules on content, stated precisely (P0)

> **The heading carries no count, deliberately.** It read "the four FLOOR rules" until rule 5 below was
> added, and [[L47]] is the record of what goes wrong next: retracting a false quantifier by substituting
> a new count rebuilds the defect at the new value, because nothing reads shipped prose to notice the
> day it moves again. The list below is the enumeration; its length is not restated anywhere.

1. **The top-level key set is closed.** Both directions.
2. **Every `usage` leaf is `number | bool | null | a short token`.** Anything else is **dropped and its
   key path listed** in `dropped[]` — never coerced, never stringified, never silently kept. **Arrays are
   WALKED, not exempted**: `usage.iterations[]` survives with its scalars, so `usage` is genuinely
   verbatim. **Since 6.28.1 the copy is also bounded in depth and key shape:** no node deeper than
   `USAGE_MAX_DEPTH` (32, counted from `usage` itself), and every key a short token other than `__proto__`, which
   assigned on a plain object sets its prototype and vanished with nothing listed ([[L15]]). The emitter drops and
   lists both, and the checker REDs both, importing the emitter's constant and predicate (`isUsageKey`).
3. **Every IDENTITY field is a bounded token.** `model`, `attribution_skill` and `agent_id` are copied
   from an untrusted transcript into a **committed** artifact, so each must be ≤128 characters, free of
   C0 control characters and DEL, and free of an absolute path. A C1 control (U+0080 to U+009F) is admitted. A
   refusal is **dropped and its key path listed** —
   `model` falls back to the literal `unknown`, the other two to `null`. **Never truncated**, which would
   invent a value that was never in the transcript. **Since 6.28.1 the same bound covers `request_id`, a row's
   `session_id` (nullable), and every element of `sessions[]` and `claude_code_versions[]`,** in the emitter and in
   the checker alike ([[L2]]: each bound this rule names is one the checker checks). A refused `session_id` or
   version is dropped and listed like the three above. A refused `request_id` is different: the line is not a
   request at all, so there is no row and nothing is listed ("Which transcript lines are requests", above). The raw
   value is tested BEFORE any coercion. Until 6.28.1 the emitter ran `String()` first, so a number was coerced into an admitted token and an
   object threw.
4. **No string anywhere in the file matches the absolute-path regex.** Every value, at every depth.
5. **`outcome` is `null`, or matches its shape.** `decision` a bounded, control-char-free token;
   `iterations` an integer or `null`; `source` a member of the closed enum below; an optional `blocked`
   likewise bounded; and **the key set closed in both directions** — a `decisions` beside `decision`
   fails, which a per-member presence set would not ([[L36]]). Added because this contract advertised
   the row as `FLOOR (shape)` from the day it shipped while **nothing validated anything inside it**;
   the same direction [[L2]] requires, and the same repair rule 3 above records. `/pharn-ship` made it
   urgent rather than merely overdue: a second producer and a second `source` member would have
   deepened an unbacked label instead of inheriting it.

6. **(`/2`) Every row is a member of the recorded run window.** The checker recomputes the window from the
   file's own `markers[]` for `membership.session`, requires `membership` to equal it, and REDs any row
   outside it. **Under `run-window/2` (6.29.0) every row's context is also one of the recorded `contexts`:** the
   checker reads each row's context from its `sidechain` and `agent_id` alone, holds `context` and `contexts` to
   their shape (a measured ledger: a context key, and a sorted, duplicate-free, non-empty list that includes it;
   anything else: both `null`), and admits a context-unknown membership only over a KNOWN window, with its
   `start`/`end` still equal to the recompute. **Bound ([[L43]]):** this binds the rows to the RECORDED markers and
   the RECORDED context set, never to the transcript — a ledger whose `contexts` name the wrong agents is GREEN
   in plain mode. **And a fabricated context-unknown membership passes BOTH modes:** its status is not
   re-derivable from the file, and `--verify-transcript` declines every unknown ledger with a WARN, since it has no
   rows to re-derive. That is the safe direction — such a ledger claims no usage at all — and it is the 6.9.0
   posture for an unknown window, now stated for the context half too.
   `--verify-transcript` re-derives the rows, `excluded_requests` and (`run-window/2`) `context` and `contexts`
   under the same recorded markers, never the live markers file, so a later invocation cannot re-bound an old
   ledger. The two context fields must be EQUAL. Once a bounded window closes they are fixed: an agent spawned
   later is outside the set by rule 7, and one spawned inside it whose first line lands after the end is not
   reported. That rests on two observed platform behaviours, not floor facts: a record is timestamped when it is
   written, and an agent's meta file is written moments after the agent's first record (the median last write
   followed it by 33 ms; `.dev/measurements/cost-ledger-run-scope-2026-09-27.md` §5 gives the bound). A transcript
   that no longer binds the run to one context — a copy of a marker line that reached a second context after
   emission, say — is a WARN, never a RED: a re-derivation answers what the transcript says NOW ([[L42]]). It works
   only while the transcript exists. The request ids must match exactly, and each row is compared class by class:
   - **input, cache read and both cache writes must be EQUAL.** They did not differ across a request's first and
     selected line on any request measured.
   - **`output` and `output_thinking` must satisfy recorded ≤ re-derived (6.24.1).** A row's usage is its
     request's line with the most output tokens, and a request still being written at emission can grow afterwards.
   - **Above is RED:** the transcript never held that much.
   - **Below is a WARN** naming its two causes (the compatibility note above).
   - **Bound:** those two classes are exact only from above. A deflated value passes with the WARN, and pinning it
     exactly would need the emission's moment in the file, a schema change. The totals follow from the rows, which
     the `totals` recompute in the field table already binds.

   `excluded_requests` is checked as a **range**. Let `before` and `after` be the re-derived counts before the
   window and after its end. A genuine value is `before + t` for some `0 <= t <= after`, so it must lie in `[before, before + after]`.
   Anything outside that range is RED. **Bound (added 6.14.1, after the equality form REDded a genuine
   downstream ledger whose session had continued):**
   - The range is exact for the part before the window and only an upper bound for the tail. An inflated
     value up to `before + after` passes. The checker WARNs whenever it accepts a value below the
     re-derived total, so the bound travels with the verdict.
   - "The part before the window is fixed" rests on three platform behaviours, observed and not floor
     facts: the transcript is append-only, every record is timestamped when it is written, and a request's
     timestamp is its first occurrence's in file order. Its `usage` may come from a later line (6.24.1), and
     that moves no membership decision.
   - An OPEN window has no end. A continued session therefore adds MEMBERS, and `requests[]` REDs. Other
     contexts' requests inside it keep growing too, and `excluded_requests` REDs. Both emitters write `run-stop`
     before emitting, and the checker WARNs an open window.
   - (6.29.0) Under a BOUNDED window the part excluded for its context lies inside the window, so it is fixed with
     the before-window part; only the after-window tail grows.

7. **(6.28.1) Every count is a non-negative safe integer, and the view keys have a type.** Each
   `requests[].tokens.<class>` must satisfy `isTokenCount`: the emitter writes 0 for a refused count and lists it,
   so every row and every total is a sum of admitted counts, which never reaches `Infinity` and is exact below
   2^53. A row's `stage` is a string or `null` and its `iteration` a number or `null`. Those two are crash guards
   for the view recompute, not value rules: a fractional `iteration` from a crafted marker stays GREEN, as it was.
   The recompute runs only when every row passes them, and a RED says so when it does not.
8. **(6.28.1) No node of the document is deeper than `WALK_MAX_DEPTH` (64).** The emitter's deepest node is a
   `usage` leaf at most `USAGE_MAX_DEPTH` below its row, so a well-formed ledger never comes near it. The checker
   finds a deeper node without recursion and names its path, and its recursive walks stop at the bound.

**The checker is TOTAL over its own input (6.28.1), within stated bounds.** `cost.json` is agent-written,
committed, untrusted input. Before 6.28.1, twenty measured crash sites made the checker exit 1, its RED code, with
no verdict line, and raw file strings reached its verdict lines.

- **FLOOR, over the closures in `pharn/floor/cost-hostile-input.test.mjs`:** for every document they walk, the
  checker prints exactly one verdict line and exits 0 or 1. The closures cover every node of a GREEN ledger × a
  hostile alphabet, and the right-typed extremes they add.
- **What makes it true:** each value quoted from the file into a RED or WARN is printed by rule. A string or object
  goes through one total, escaped, bounded quoter (`shown()`, `pharn/floor/quote-core.mjs`), a number, boolean or
  `null` prints as itself so its type stays visible, and a key prints as itself only when it is a short token. The
  re-derivation's WARN about an unavailable transcript carries a session only after the precondition below admitted
  it. A list names at most five members and counts the rest. The view recompute and `--verify-transcript` each run only over
  input that passes their preconditions, and a RED says when they did not run. `--verify-transcript`'s
  preconditions: every row an object with a string `request_id`, `name` a feature slug, and the session it passes on
  (`membership.session`, else `sessions[0]`) `null` or a rule-3 token.
- **An internal error while checking is exit 2**, unusable, never GREEN and never RED, so a crash is never read as a
  verdict. The
  process ends through `process.exitCode`, so a verdict past a pipe's buffer is not dropped.
- **A line is `\n`-delimited.** U+2028, U+2029 and U+0085 pass `JSON.stringify` raw, and some viewers draw them as a
  line break. That is stated, not escaped: the same bound as the file's own layout.
- **NOT claimed: time and memory.** Rule 6 re-tests every row against every current-run marker, so it is
  O(rows × markers). A document large enough to exhaust the heap ends the process with no verdict, and that abort
  cannot be caught. A module that fails to load is outside the exit-2 backstop.

**"No message content and no home paths are in the file" is a CONSEQUENCE of rules 1–4, not a
detector.** Message bodies are never read, so none can appear; `cwd` and `gitBranch` are never copied, so
no home path can. **The claim "no usernames" is STRUCK** and appears nowhere in this contract or in the
implementation: **no regex proves it.** What is guaranteed is exactly what the rules above test.

### `outcome` — DECLARED or DERIVED, and the two are not equally strong

`outcome.source` records **where the outcome came from**, beside the value, so a reader never has to
infer it. The enum is **closed at two members**, defined once in `render-cost-ledger.mjs` and _imported_
by the checker rather than re-spelled:

| `source`           | who writes it                                          | `decision` vocabulary                                                                   | strength                                |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------- |
| `LOOP.md`          | `/pharn-loop`, via its record                          | `check-loop.mjs`'s own tokens                                                           | **DECLARED** — re-derivable (see below) |
| `verdicts+markers` | `/pharn-ship` always; any other command with no record | `gate2` \| `gate2-quick` (6.25.0) \| `stop:<stage>` \| `stop:unknown` \| `undetermined` | **DERIVED** — split, see below          |

The `LOOP.md` source's vocabulary includes `STOP_GREEN_QUICK` (6.28.0, `/pharn-loop --quick`), which is **not**
`STOP_GREEN` and claims no regression verdict: the emitter copies it verbatim, so a quick loop's ledger carries its
own claim with no marker involved, and rule 5 — a bounded token, not a vocabulary — reads it GREEN in an older
checker too.

**The declared form is re-derivable and the derived form is not, and that asymmetry is the point.** A
`LOOP.md` decision is checked by `pharn/floor/check-loop-decision.mjs`, which re-runs `check-loop.mjs`
against the record's own cited reports and refuses a mismatch. **There is no equivalent for a derived
outcome and none is claimed**: a `/pharn-ship` stop is a human gate or an orchestrator STOP, and no
checker computes either, so there is nothing to re-derive against.

**Within the derived form, the two halves differ (P0) and must never be averaged:**

- **`gate2` is FLOOR.** It means `verify-report.json` read `PASS` **and** `regression-report.json` read
  `no-regressions` — two enum values produced by tested non-LLM checkers. It says the run reached the
  human gate; it is **not** a judgment that the feature is good, which is the human's call.
- **`gate2-quick` (6.25.0) is FLOOR TOO, over a SMALLER stage set.** It means `verify-report.json` read
  `PASS` on the run's OWN `pharn-verify` stage — the regression verdict is **never** consulted, because a
  `--quick` run starts no `/pharn-regress` at all. **`gate2-quick` is NOT `gate2`**: it names where the run
  ended first (`gate2`) and the mode second, and every consumer compares `decision` by equality, never by
  prefix, so no reader takes it for the stronger form.
- **`stop:<stage>` is ADVISORY in its stage NAME.** `<stage>` is the last `stage-start` marker, and
  markers are written by Bash calls in command prose, outside the `PreToolUse` gate — so a written
  marker does not mean the stage ran, nor the reverse. That the run did **not** satisfy the `gate2`/
  `gate2-quick` test is a membership fact; _which_ stage it stopped at rests on marker discipline.
- **`stop:unknown` is the terminal fallback** — markers exist but none is a `stage-start`, or its stage
  token failed the grammar. The token is re-tested at READ time, not trusted from the writer: the
  markers file is ordinary state under `.pharn/` that a Bash write reaches (`LIMITS.md §6`).

- **`undetermined`** — markers exist, but the run's own boundary cannot be established from them: the
  run window is `unknown` (see "Run membership"), or — since 6.25.0 — the current run starts a stage other
  than `pharn-regress` / `pharn-verify` twice at one iteration, which is what a skipped run-start can leave
  when two invocations' markers run together. No verdict can then be bound to this run, so the outcome is
  neither a failed check nor a stop stage.

**The verdicts count only when they belong to THIS run (added 6.9.1; the stage SET they need forked by
mode in 6.25.0).** The applicability test now reads the run's own mode first (`ship-outcome-core.mjs`
`runMode()`, from the run-start marker, never the SPEC): a **full** run's `gate2` requires that the CURRENT
run carries a `stage-start` for BOTH `pharn-regress` and `pharn-verify` at its LATEST recorded iteration;
a **quick** run's `gate2-quick` requires only `pharn-verify` — demanding `pharn-regress` there would make
`gate2-quick` unreachable, since a quick run never starts one. The current run is the markers from the
latest `run-start`, the same definition `run-window-core.mjs` uses for membership. Outside its own stage
set, the reports on disk were left by an earlier invocation or superseded by a later attempt, and they are
excluded. The `stop:<stage>` name and `iterations` are also read from the current run only. **Why:**
`/pharn-spec` resumes an existing `<name>`, so a second `/pharn-ship` over the same feature used to derive
`gate2` from the PREVIOUS run's green reports after STOPping at grill.

**Two more conditions (6.25.0, the GATE-2 review of quick mode).** (a) **Order:** a verdict stage-start
counts only when it follows the latest `pharn-build` stage-start of the same iteration in the current run;
with no such build the reports are not current. (b) **No repeat:** a stage other than a verdict stage
started twice at one iteration makes the outcome `undetermined` (above). `/pharn-ship` starts every
(stage, iteration) at most once; the verdict stages are exempt because `/pharn-loop`'s freshness re-run
starts them again inside one iteration, and a loop ledger with no `LOOP.md` reaches this derivation.
**Why:** iteration numbers restart at 1 in every run, so a quick run whose run-start was skipped, after an
earlier run that never wrote its run-stop, joined that run's window, and the earlier `pharn-regress@1`
completed the pair for its own `pharn-verify@1`: the derivation returned `gate2` over a regress check that
never ran on this build. A full run is affected only on marker trails a compliant run never writes.

**A skipped or wrong mode marker never yields `gate2`.** A quick run-start written without `--mode quick`
reads as full, and the run starts no `/pharn-regress`, so its outcome is `stop:pharn-verify`. A quick run
whose run-start was skipped joins the previous run's window, and its outcome is `undetermined` or
`stop:<stage>`, never `gate2`: after a closed run its first stage marker follows a run-stop (membership
`unknown`, so `undetermined`); after an unclosed run that started a stage this run starts again, its own
stage-starts repeat that run's (condition (b), `undetermined`); and after an unclosed run that started none
of them — a `/pharn-loop` interrupted during `/pharn-spec` leaves only a `pharn-spec` stage-start, which
`/pharn-ship` never writes — nothing repeats, the joined run reads as full, and with no regress stage-start
after this build its outcome is `stop:pharn-verify`. An earlier regress stage-start that precedes this
run's build never counts (condition (a)). A full run whose run-start wrongly carries
`mode: "quick"` yields `gate2-quick` at most, which claims no regression verdict. **Two bounds:** this is
relative to the markers the command prescribes — a run that also skips its stage-starts is not covered —
and an earlier run that left nothing but its run-start (a halt at GATE 1) is byte-identical to resuming
that same run, so its run-start's mode is read: `stop:pharn-verify` after a full one, `gate2-quick` after a
quick one, never `gate2`.

**Strength:** the rule is exact relative to the RECORDED markers (enum + ordering), and the markers are
advisory. It never uses a file's mtime or its mere existence. **The residual, at its true width:** a
marker proves a stage STARTED, never that it REWROTE its report. A regress or verify that starts and then
refuses before emitting leaves the earlier file in place, and that file is accepted. This holds for every
attempt, and a test pins it. Closing it needs a report-side run identity or a lifecycle invalidation in
`/pharn-ship`.

**The source is chosen by the emitting COMMAND, not by artifact existence.** A `/pharn-ship` ledger is
always derived and never reads a `LOOP.md`, even when one is present: a `/pharn-ship` run over a
`/pharn-loop` feature directory used to copy the old loop's decision. Every other command keeps "a
`LOOP.md` envelope wins, else derive". So `/pharn-loop`'s declared path is unchanged, and its rarely
reached no-`LOOP.md` fallback now also applies the applicability rule.

`render-run-report.mjs` labels the `## Verdicts` section with the SAME applicability. It uses the same
function over the ledger's own `markers[]`, so a report the outcome excluded never appears as an
unqualified current verdict. **For a quick ship ledger (6.25.0) it additionally renders the regress line
as "not part of this run: a quick `/pharn-ship` run starts no `/pharn-regress`"** — read from the run's own
mode (`runMode()` over `cost.markers[]`), never from whether a `regression-report.json` happens to exist on
disk: a report left by an EARLIER full run over the same feature directory must never be shown as this
quick run's regress verdict, even when that report reads `no-regressions`. **By the same rule its
`## Briefing` never links a `BRIEFING.md`** (quick mode renders none, so a file of that name is an earlier
run's); it says "not part of this run" instead.

`outcome` is `null` when there are no markers at all — no evidence a run happened. That is a real state,
not a failure, and it is what a fresh or abandoned run renders.

**The label travels with the value.** `render-run-report.mjs` prints this split in `RUN-REPORT.md`'s
`## Outcome` section, so a reader of the artifact meets it without opening this contract. A bound stated
only in a document nobody opens is not stated (P0).

> **Rule 3 was added after `/pharn-dev-review` found this contract asserting it without the code providing
> it.** The sentence under "Residual" below used to say the leaf-shape rule bounded these three fields; it
> did not — that rule reaches `usage` only, and a probe accepted a 200,000-character `attribution_skill`,
> embedded NUL/BEL bytes, and a newline carrying a forged `RED — …` line. The gap was closed rather than
> the sentence weakened, which is the direction [[L2]] requires: a contract may cite only a floor op that
> is live **for the thing it claims to cover**.

---

## Pricing — fixed, and permanent

**This file contains no prices and never will.**

```text
cost = Σ over classes of  tokens[class] × price(model, class, date, tier)
```

computed by the reader against **their own current price list**. Three bounds travel with that formula:

- **`output_thinking` is a SUBSET of `output`, not an additional class.** Summing all six double-counts
  thinking tokens. The name says so; the contract says so; the checker does not "fix" it.
- **Any figure so derived is LIST-PRICE EQUIVALENT.** A subscription is not billed per token, so the
  result is what this usage _would have cost at list_, not what was charged.
- **No price table is embedded, deliberately.** Published prices change, a baked-in table would rot
  silently, and nothing here could floor-check one.

---

## Attribution — a VIEW, named and versioned

`attribution.method` is `latest-marker-at-or-before-ts-same-session/1`:

> a run MEMBER belongs to the **latest marker whose `ts` is at-or-before the request's own, in the same
> session**. Before the first stage marker, a member is **`unattributed`**. That is an honest bucket
> inside the run, never folded into a neighbour. Non-members are not rows at all; see Run membership.

The version suffix is load-bearing: a later, different method announces itself by bumping it rather than
silently reinterpreting files already written.

**Two bounds, both inherent and neither corrected:**

- **The request that ISSUES a marker call necessarily precedes the marker it writes**, so at most one
  request per boundary lands on the earlier side. Correcting it would be a guess.
- **`markers[]` is ADVISORY.** Markers are written by the orchestrator through `Bash`, outside the fix #7
  `PreToolUse` gate, so nothing on the floor forces a marker call. A missing marker is reported by the
  checker as a **WARN with a count** — never a RED, because an orchestration lapse is not a malformed
  artifact, and never a silent merge into a neighbouring stage.

---

## The rule of the contract (P0)

**What the ledger IS:** a floor-checked record of per-request token usage and phase boundaries, whose
every aggregate is recomputable from its own rows.

**What the ledger IS NOT:**

- **It is NOT complete.** `coverage` has no `complete` member. The stop's own turns, including the
  emission itself, are still being written. The request that opened the window, and every other
  session's requests, are outside it. The number is a **floor on this run's spend**, never the total,
  and never a feature's lifetime cost.
- **It is NOT dollars.** It records tokens (above).
- **It is NOT proof that `requests[]` matches the transcript.** `check-cost-ledger.mjs` certifies the
  file's **internal consistency**; a self-consistent fabricated ledger passes. `--verify-transcript`
  re-derives the rows from the live transcript and compares — a genuine floor primitive, **usable only
  while the transcript exists**, therefore machine-local and perishable, and therefore not a gate.
- **It is NOT a judgment.** "The run cost N tokens" never means the spend was worthwhile. The ledger
  **annotates**; it gates nothing, and no proceed/stop in any command reads it (fix #3).
- **It is NOT reproducible from a fresh clone.** The transcript lives outside the repository and is never
  committed. Determinism is bounded accordingly: **given the same transcript bytes AND the same markers
  bytes**, the output is byte-identical — the emitter reads no clock and no randomness. The markers half
  of that conjunction is load-bearing, because `markers[]` is copied from a file a different process
  wrote at wall-clock time.

## Stage executions and deterministic work (6.35.0)

Two keys answer, for one run, **where the observed wall-clock time went** and **which deterministic gate work ran
or was avoided by reuse** — beside the model usage above, never folded into it. They are appended after
`membership` on every `/2` ledger the emitter writes since 6.35.0, the `unavailable` and context-unknown shells
included: timing needs only markers, so a run whose transcript is gone still has its intervals. **No schema bump:**
the change is additive and no existing field changes meaning. The checker admits, for `/2`, EXACTLY the current key
set or the pre-6.35.0 set with neither key (`TOP_LEVEL_KEYS_PRE_WORK`); one key without the other is RED. A `/1`
ledger has neither.

### `executions` — a VIEW over `markers[]` (method `stage-start-to-return/1`)

No new marker, no new marker field, and no change to the line `mark-phase.mjs` prints (that line binds the run to
its context; this view reads no transcript). The one implementation is `pharn/floor/stage-executions-core.mjs`,
whose header holds the rule; in short, over the CURRENT run's markers (`currentRunMarkers`):

- every `stage-start` is ONE row `{stage, iteration, run, start_seq, end_seq, elapsed_ms, unmeasured, work}`;
  `run` numbers rows sharing `(stage, iteration)` in `seq` order, so a freshness re-run or a re-plan is `run 2`,
  never merged into run 1;
- its end is the NEXT marker, and only when that marker is an `orchestrator` return. Otherwise the row is
  UNMEASURED with a closed reason — `no-end-marker`, `no-return-marker`, `session-changed` (two different non-null
  sessions; a null binds any, as in attribution), `bad-timestamp`, `clock-went-back`, `foreign-work-inside` — and
  `elapsed_ms: null`. **The next stage-start or a `run-stop` is never used as an end.** So a stage that STOPs a
  `/pharn-ship` run (its next marker is `run-stop`) is `no-return-marker`; its work record, written before the stop,
  still shows what it ran;
- **one bound the markers cannot close, stated:** when a stage's return AND the next stage's start are both skipped,
  the next marker is the LATER stage's return, and the markers alone cannot tell. A work record of another stage
  inside the interval is the one evidence that can, and makes the row `foreign-work-inside`; a double skip around
  stages that write no work record reads as one long execution;
- **`elapsed_ms: null` means not measured; `0` means measured equal.** Unknown is never zero, in the file or in any
  rendering;
- when the markers do not describe one run (`runWindow(markers, null)` is unknown) the view is
  `status: "unknown"` with that reason and no rows. A CONTEXT-unknown ledger keeps its rows.
- A stage a run skipped (`pharn-regress` under `--quick`, `pharn-spec` in `/pharn-ship`, which marks no spec
  stage-start because the spec IS GATE 1) has no row: nothing is represented as executed.

**What an interval MEANS is ADVISORY, and the label travels with it.** It is OBSERVED WALL-CLOCK time between two
`toISOString()` reads by two short-lived processes — not CPU time, not model time, not tool time, not monotonic (a
clock step moves it) — and it includes orchestration, subprocesses, waiting and any human answer given inside the
stage. **Nothing decomposes it**: stage elapsed minus anything is not model time, and no such number is written.

### `work[]` — FACTS a stage script records at `done` (`pharn-stage-work/1`)

Whether a regress execution reused its BASE evidence and how many VERIFY results were reused is recorded in the two
reports — which every iteration OVERWRITES — and the gate-run stamps are cleared at every fresh start. So
`/pharn-regress` and `/pharn-verify` (`stage-regress.mjs`, `stage-verify.mjs`) each append ONE line at their `done`
exit to `<.pharn/cost>/<feature>/work.jsonl`, beside `markers.jsonl`, counted by `pharn/floor/stage-work.mjs` (the
record's one owner, whose header is its spec) from the stamp the verdict just used:

- `required` = the stamp's entries; `executed` = `ran: true` (a process ran); `reused` = `reason: "reused"` (a
  VERIFY result from the REGRESS/HEAD execution, 6.34.0); `no_files` = nothing to run. Invariant, checked:
  `executed + reused + no_files = required`.
- regress: `head`; `base` with `evidence` `fresh` | `reused` (6.33.0) and the decision's closed `miss` code. A BASE
  HIT has `executed: 0` and `reused = required − no_files`, even though the reused stamp's own entries record `ran`
  as true: they ran in an EARLIER execution. Those two counts follow from `evidence` and are stored anyway, so every
  side carries the same four counts and one invariant. `install` is `null` (none ran) or `{exit, timed_out, ms}`.
  **Worktree creation and install skipping are not stored at all**: both happen iff `evidence` is `fresh`, and are
  read from it.
- verify: `gates` (`reconcile` included).
- `install.ms` is the ONE new timer: `performance.now()` around the install process, integer milliseconds, carried
  through a budget `continue` by the progress record. No gate process is timed.

The emitter copies a record into `work[]` only when it passes `validateWork` and is a MEMBER of the run window
(`isMember`, the test every request row passes). A line that fails is not a row: `work.jsonl[<n>]` joins `dropped[]`
— `n` is its line index in the whole file, across every run the file has seen, not an index into `work[]` — and no
value of it is copied. A path that is not a regular file (a link, a FIFO) is never read through and is listed as
`work.jsonl`. A `--verify-transcript` re-derivation reads no live work file. `executions.rows[].work` lists the
`work[]` indices attached to each execution: the record's
own stage, found by the latest-marker-at-or-before rule `attribute()` applies to requests (a ✧ parity test pins the
two). A record attached to no execution is shown, never merged.

**Bounds, each stated.** Only a `done` exit writes a record: gates a stage ran before refusing, crashing or being
killed are NOT recorded (`work-on-non-done-exit`). The file is never pruned: one line per execution, standalone runs
included, in disposable `.pharn/` scratch. The append is best-effort and OBSERVATIONAL — it refuses a symlinked or
non-directory component, opens with `O_NOFOLLOW | O_NONBLOCK` (a planted FIFO is refused, never blocked on), never
throws, and a failure is one stderr note;
nothing reads a record to decide a verdict, an exit, a reuse, a route or a commit. `work.jsonl` is `.pharn/` state a
Bash write reaches (LIMITS.md §6): the checker certifies agreement between the file's facts and its view, never that
the records or markers are true (L43). `--verify-transcript` does not compare either key: neither is
transcript-derived. No per-gate duration is measured (`gate-process-duration`).

## Size, disclosed rather than discovered

**The layout (since 6.14.1).** The file is pretty-printed at a 2-space indent, except the FACT arrays,
`markers[]`, `requests[]` and (6.35.0) `work[]`, and the `executions.rows` view. Each of their elements is written as
one JSON value on one `\n`-delimited line.
An empty fact array is `[]`. The derived views stay pretty-printed, because they are what a person reads to
learn the cost. `JSON.parse` of the file is exactly what it was under the old layout, key order included.
`render-cost-ledger.mjs`'s `serializeLedger` is the one implementation, and both CLI output paths use it.
"One line" means one `\n`-delimited line. `JSON.stringify` escapes `\n` and every C0 control, but it leaves
U+2028, U+2029 and U+0085 raw, and some viewers draw those as line breaks.

**Why the layout changed: the cost that hurt was LINES, and this section had measured only BYTES.** The
section used to say only this: _a 65-minute, one-iteration `STOP_GREEN` run emits ~393 KiB of pretty-printed
JSON (275 rows; 402,567 bytes measured), ~263 KiB of it the verbatim `usage` copy._ That was true, and it
missed the unit that mattered. In a downstream project a single `/pharn-loop` ledger was the bulk of a pull
request's diff. The measurements below were taken on 2026-09-23 on the `cost.json` files committed in that
project. The "before" column is the file as committed. The "after" column is `serializeLedger` over the same
parsed object, which parses deep-equal.

| measured                                           | before (pretty-printed) | after (one row per line) |
| -------------------------------------------------- | ----------------------- | ------------------------ |
| one `/2` ledger, 630 rows, 14 markers — lines      | 33,051 (~52 per row)    | 823                      |
| the same ledger — bytes                            | 960,206                 | 629,344                  |
| all 14 committed ledgers (13 of them `/1`) — lines | 231,615                 | 6,922                    |
| all 14 committed ledgers — bytes                   | 6,704,361               | 4,402,399                |

That one ledger was 33,051 of the 38,927 lines its pull request added.

**What remains, and it is a byte cost, not a line cost.** In the new layout, the verbatim `usage` copy is
381,708 of that ledger's 629,344 bytes (60.7%). `usage.iterations[]` alone is 138,525 bytes (22.0%). It is
walked so that "verbatim" stays true, and it repeats the numbers beside it. That cost was weighed and
accepted for fidelity. Dropping either would change the schema, and it has not been done.

**These are dated measurements, not properties of every ledger.** A run's size scales with its request
count, so read the table as what one real run and one real project cost, not as a bound.

## Relationship to `pharn-cost-record/1`

`pharn/floor/render-cost-record.mjs` emits an **aggregate** cost block embedded in `ship-record.json`;
this contract describes a **standalone per-request** artifact. The two overlap, and they share one
implementation of transcript location, the file walk and the per-request reader: `pharn/floor/transcript-core.mjs`,
imported by both, never copied. Until 6.24.1 the reading loop was copied, and both copies kept each request's
first line.

**The overlap is recorded rather than resolved.** A ✧ parity test asserts the two agree on totals over the
same bytes, with the class-name mapping made explicit, so they cannot drift silently while both exist.
Agreement is all it proves ([[L43]]): it stayed GREEN while both under-counted output. What binds the counted
value to the transcript are the per-request tests over line shapes seen on real transcripts.

**"Must the second copy exist?" now has a settled answer, and it is YES — decided at a human gate during
the `/pharn-ship` wiring increment this paragraph used to defer to.** [[L35]] asks that question before
any remedy is chosen, and the evidence says the two are **not one fact stored twice**:

- **Different granularity.** `pharn-cost-record/1` is aggregates; `pharn-cost-ledger/1` is per-request
  rows from which every aggregate is recomputed and checked.
- **Different attribution METHOD.** The record's `by_stage` keys are the platform's `attributionSkill`,
  which names the orchestrator and never the sub-stage; the ledger's are marker-based. Deriving one from
  the other would silently change what `by_stage` MEANS.
- **Different POPULATION.** The embedded block stays SESSION-scoped: it sums the whole selected session.
  This ledger is RUN-scoped. On a session that did anything besides the run, the two differ by exactly
  that other work.
- **Different moment, hence different windows.** `/pharn-ship` emits `cost.json` at Step 3a and the
  embedded block at Step 3b, so the block's window legitimately extends past the ledger's. **They may
  disagree, and that is not drift.**
- **The block is inside ATTESTED content.** `record_hash` covers the record with `attestation` removed,
  so removing or reshaping `cost` changes what a named human attested to — a breaking change to
  `ship-record.md`, not a tidy-up.

**`cost.json` is authoritative for analysis**; the embedded block stays as the attested figure. **No
consistency check binds the two and none will be added** — per [[L43]] such a check certifies that
several stores of one fact AGREE, never that any of them is right (they can all be stale together), and
per [[L35]] it would itself become a third thing to keep in sync. What binds each to reality is the
window it records, which each already states.

## Residual (named, not hidden — `LIMITS.md §2`, `THREAT-MODEL.md §5`)

The transcript is **untrusted input**. `attribution_skill`, `model` and `agent_id` are copied from it into
a committed artifact and are attacker-influencable in principle. So are `request_id`, `session_id` and each
`claude_code_versions` entry, which since 6.28.1 carry the same bound. They key a **view**, never a gate, and
**rule 3 above** — not the `usage` leaf rule — is what bounds them: ≤128 characters, no C0 control character or
DEL, no path. A C1 control (U+0080 to U+009F) is admitted, and U+0085 among them passes `JSON.stringify` raw.

**That bound is on SHAPE, not on MEANING, and the distinction is the residual.** A 40-character
lower-case token is admitted whatever it says. An attacker who controls `attributionSkill` can therefore
place a benign-looking string into a file that a green `/pharn-loop` stop commits — it cannot forge a line
(no newline survives), cannot smuggle a path, and cannot flip any verdict (`cost.json` gates nothing,
fix #3), but it is a channel into a durable artifact and it is not closed. Stated, not zeroed.

**Named follow-up, not built: `cost-ledger-dropped-row-index`.** A `dropped[]` path's row index is taken before the
emitter sorts its rows by `ts`, so in a transcript spread over several files it can name the wrong row. Probed while
planning 6.28.1 and not selected at its plan gate; the paths 6.28.1 added (`session_id`, `version`, `tokens.<class>`)
inherit the same index.

**Named, not built (6.29.0, run membership's context half — P7: none has been met):**

- **`cost-ledger-workflow-agents`.** A Workflow-tool agent's meta carries no `toolUseId`, so it is unlinked by
  construction, and a Workflow agent working inside a run's window makes membership `unknown`. Its link is readable
  through the parent's Workflow tool result, which names the run id. No ledger has met one.
- **`cost-ledger-mention-only`.** If the orchestrator's marker output never reaches its own tool result (redirected
  to a file, say) and a DIFFERENT context later reads that output back through a tool, that context is the only
  holder, and the run is bound to it. The pinned marker lines print to stdout, and it has not been observed.
- **`cost-ledger-shared-markers-file`.** Two runs of the SAME feature at once in one checkout append to one markers
  file. The current run starts at the later `run-start`, and the binding refuses it as ambiguous only when both
  contexts printed lines of that current run; the stage view would mix them either way.
- **`cost-ledger-spawn-batched`.** An agent spawned in the same assistant message as the call that writes the run's
  first marker is stamped with that message's time, before the window opens, so it is excluded — an under-count,
  never an over-count. The pinned flows write the marker in a call of its own first.

**Named, not changed: a window ordered as strings.** The ledger's `window_start`/`window_end` and its row order
compare timestamps as strings, and since 6.28.1 the `pharn-cost-record/1` block's window does the same, after the same
parse test. `…:00Z` sorts after `…:00.500Z`, so on mixed-precision timestamps both would order them wrongly.
Membership and attribution compare numbers and are not affected. The platform writes one precision, so it has not
been observed (P7).
