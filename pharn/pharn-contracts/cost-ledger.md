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
aggregate is restricted to the run's own window (`run-window/1`, below), so unrelated work done earlier
or later in the same Claude Code session is excluded rather than summed. It is not a feature's lifetime
cost either: a new invocation for the same feature opens a new window.

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
  "markers": [{ "seq": 1, "kind": "run-start", "stage": null, "iteration": null, "ts": "…", "session_id": "…" }],
  "requests": [
    {
      "request_id": "req_…",
      "ts": "2026-09-21T08:35:42.425Z",
      "session_id": "<session uuid>",
      "model": "claude-opus-5",
      "sidechain": false,
      "agent_id": null,
      "attribution_skill": "pharn-loop",
      "usage": { "…": "copied from the record, leaf-filtered" },
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
    "method": "run-window/1",
    "status": "bounded",
    "reason": null,
    "session": "<the selected session uuid>",
    "start": "2026-09-21T08:35:00.000Z",
    "end": "2026-09-21T09:40:52.000Z",
    "excluded_requests": 14,
  },
}
```

---

## Field shape + trust classes

`pharn/floor/check-cost-ledger.mjs` owns every rule below. The **top-level key set is CLOSED**: exactly
the keys above, no more and no fewer, asserted in **both** directions. A per-member presence set would be
satisfied by a variant spelling of any member; closure is what makes a variant fail.

| field                                                               | shape                                                                     | class                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| `schema`                                                            | `pharn-cost-ledger/2` (or the legacy `/1`, see Compatibility)             | FLOOR (enum)                               |
| `name`                                                              | the feature slug                                                          | FLOOR (present)                            |
| `command`                                                           | the emitting command — `/pharn-loop` or `/pharn-ship`                     | FLOOR (present)                            |
| `base_sha`                                                          | the run's base SHA, or the literal `unknown`                              | FLOOR (present)                            |
| `outcome`                                                           | `{decision, iterations, source, blocked?}`, or `null` — see below         | FLOOR (shape, rule 7)                      |
| `skills_version`                                                    | the version string, or `null`                                             | FLOOR (shape)                              |
| `skills_version_source`                                             | `pharn.config.json` \| `SKILLS_VERSION` \| `unknown`                      | FLOOR (enum)                               |
| `claude_code_versions`                                              | sorted distinct `version` values seen on the records                      | FLOOR (array)                              |
| `sessions`                                                          | sorted distinct session ids                                               | FLOOR (array)                              |
| `window_start` / `_end`                                             | ISO timestamps from the **records' own** values, or `null`                | FLOOR (from data)                          |
| `coverage`                                                          | `partial` \| `unavailable` — **there is no `complete`**                   | FLOOR (enum)                               |
| `dedup_key`                                                         | the literal `requestId`                                                   | FLOOR (enum)                               |
| `attribution.method`                                                | the versioned method name                                                 | FLOOR (enum)                               |
| `pricing_note`                                                      | must state the file carries tokens, never prices                          | FLOOR (regex)                              |
| `markers[].seq`                                                     | integers, **strictly increasing**                                         | FLOOR (integer compare)                    |
| `markers[].kind`                                                    | `run-start` \| `stage-start` \| `orchestrator` \| `run-stop`              | FLOOR (enum)                               |
| `requests[].request_id`                                             | non-empty, **unique across the array**                                    | FLOOR (set membership)                     |
| `requests[].usage`                                                  | every leaf: number \| bool \| null \| a short token                       | FLOOR (enum-regex)                         |
| `requests[].model`                                                  | a bounded identity token (<=128 chars, no control char, no path)          | FLOOR (enum-regex)                         |
| `requests[].attribution_skill` / `agent_id`                         | the same bound, or `null`                                                 | FLOOR (enum-regex)                         |
| `requests[].tokens.*`                                               | the six classes, each a number                                            | FLOOR (shape)                              |
| `requests[].sidechain`                                              | a boolean                                                                 | FLOOR (shape)                              |
| `requests[].stage/iteration`                                        | the derived VIEW                                                          | **ADVISORY** (see below)                   |
| `totals` / `by_model` / `by_stage_iteration_model` / `unattributed` | equal to a recompute from `requests[]`                                    | FLOOR (recompute + equality)               |
| `dropped[]`                                                         | key paths of leaves the leaf rule refused                                 | FLOOR (array)                              |
| `membership`                                                        | closed `{method, status, reason, session, start, end, excluded_requests}` | FLOOR (shape + recompute)                  |
| `membership.status/reason/start/end`                                | equal to `runWindow()` recomputed over the file's own `markers[]`         | FLOOR (recompute + equality)               |
| every `requests[]` row                                              | a MEMBER of that recomputed window                                        | FLOOR (ordering test)                      |
| `membership.excluded_requests`                                      | an integer (known window) or `null` (unknown) — its VALUE                 | **ADVISORY** without `--verify-transcript` |

**`outcome` is copied VERBATIM from the `LOOP.md` envelope** (`pharn/pharn-contracts/loop-record.md` —
cited, not restated, P4), read from the `---`-fenced frontmatter only and never grepped from the body. The
ledger introduces **no second source of truth** for the decision. Its shape is deliberately general enough
that `/pharn-ship` fits later without a schema change.

**There is no `commit` field, and its absence is deliberate.** `LOOP.md`'s `commit` is HEAD _before_ the
loop commits, so it is the base — which is what `base_sha` already carries. A green run's `cost.json`
lands _inside_ the loop's own commit, so a field naming that commit could not be written before it exists.

---

## Run membership — `run-window/1` (added in `pharn-cost-ledger/2`)

**Why it exists — a real failure (P7).** Through `/1`, markers decided only the stage VIEW, never the
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
- no current-run marker is bound to the selected session.

The reason is recorded from a closed set. An `unknown` ledger is `coverage: unavailable` with **no
rows** and `excluded_requests: null`. Whole-session usage is never presented as run usage, and nothing
is shown as zero. A **known** window that contains no request is different: it is an **observed zero**,
`coverage: partial` with an empty `requests[]`, and the checker admits that shape ONLY under a known
window ([[L34]]).

**`excluded_requests`** counts the deduped session requests that fell outside a known window. It is
the minimum needed to explain an exclusion. No excluded-token aggregate and no session ledger is kept.

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

## Compatibility with `pharn-cost-ledger/1`

A `/1` file is **never rewritten and never retroactively REDed.** `check-cost-ledger.mjs` validates it
under its own closed key set and rules, and adds one WARN: its totals are SESSION-scoped and may include
activity outside the run. `render-run-report.mjs` prints the same label. `--verify-transcript` declines
a `/1` file with a WARN, because its rows are not re-derivable under the run-window rule. Reading a `/1`
total as run-scoped would silently reinterpret historical data.

## The FLOOR rules on content, stated precisely (P0)

> **The heading carries no count, deliberately.** It read "the four FLOOR rules" until rule 5 below was
> added, and [[L47]] is the record of what goes wrong next: retracting a false quantifier by substituting
> a new count rebuilds the defect at the new value, because nothing reads shipped prose to notice the
> day it moves again. The list below is the enumeration; its length is not restated anywhere.

1. **The top-level key set is closed.** Both directions.
2. **Every `usage` leaf is `number | bool | null | a short token`.** Anything else is **dropped and its
   key path listed** in `dropped[]` — never coerced, never stringified, never silently kept. **Arrays are
   WALKED, not exempted**: `usage.iterations[]` survives with its scalars, so `usage` is genuinely
   verbatim.
3. **Every IDENTITY field is a bounded token.** `model`, `attribution_skill` and `agent_id` are copied
   from an untrusted transcript into a **committed** artifact, so each must be ≤128 characters, free of
   control characters, and free of an absolute path. A refusal is **dropped and its key path listed** —
   `model` falls back to the literal `unknown`, the other two to `null`. **Never truncated**, which would
   invent a value that was never in the transcript.
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
   outside it. **Bound ([[L43]]):** this binds the rows to the RECORDED markers, never to the transcript.
   `--verify-transcript` re-derives the rows and `excluded_requests` under the same recorded markers,
   never the live markers file, so a later invocation cannot re-bound an old ledger. It works only while
   the transcript exists.

**"No message content and no home paths are in the file" is a CONSEQUENCE of rules 1–4, not a
detector.** Message bodies are never read, so none can appear; `cwd` and `gitBranch` are never copied, so
no home path can. **The claim "no usernames" is STRUCK** and appears nowhere in this contract or in the
implementation: **no regex proves it.** What is guaranteed is exactly what the rules above test.

### `outcome` — DECLARED or DERIVED, and the two are not equally strong

`outcome.source` records **where the outcome came from**, beside the value, so a reader never has to
infer it. The enum is **closed at two members**, defined once in `render-cost-ledger.mjs` and _imported_
by the checker rather than re-spelled:

| `source`           | who writes it                 | `decision` vocabulary                       | strength                                |
| ------------------ | ----------------------------- | ------------------------------------------- | --------------------------------------- |
| `LOOP.md`          | `/pharn-loop`, via its record | `check-loop.mjs`'s own tokens               | **DECLARED** — re-derivable (see below) |
| `verdicts+markers` | any command with no record    | `gate2` \| `stop:<stage>` \| `stop:unknown` | **DERIVED** — split, see below          |

**The declared form is re-derivable and the derived form is not, and that asymmetry is the point.** A
`LOOP.md` decision is checked by `pharn/floor/check-loop-decision.mjs`, which re-runs `check-loop.mjs`
against the record's own cited reports and refuses a mismatch. **There is no equivalent for a derived
outcome and none is claimed**: a `/pharn-ship` stop is a human gate or an orchestrator STOP, and no
checker computes either, so there is nothing to re-derive against.

**Within the derived form, the two halves differ (P0) and must never be averaged:**

- **`gate2` is FLOOR.** It means `verify-report.json` read `PASS` **and** `regression-report.json` read
  `no-regressions` — two enum values produced by tested non-LLM checkers. It says the run reached the
  human gate; it is **not** a judgment that the feature is good, which is the human's call.
- **`stop:<stage>` is ADVISORY in its stage NAME.** `<stage>` is the last `stage-start` marker, and
  markers are written by Bash calls in command prose, outside the `PreToolUse` gate — so a written
  marker does not mean the stage ran, nor the reverse. That the run did **not** satisfy the `gate2`
  test is a membership fact; _which_ stage it stopped at rests on marker discipline.
- **`stop:unknown` is the terminal fallback** — markers exist but none is a `stage-start`, or its stage
  token failed the grammar. The token is re-tested at READ time, not trusted from the writer: the
  markers file is ordinary state under `.pharn/` that a Bash write reaches (`LIMITS.md §6`).

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

## Size, disclosed rather than discovered

A single 65-minute, one-iteration `STOP_GREEN` run emits **~393 KiB** of pretty-printed JSON (275 rows;
402,567 bytes measured). The verbatim `usage` copy is ~263 KiB of that, and `usage.iterations[]` — walked
so that "verbatim" stays true — duplicates the numbers beside it. That cost was weighed and accepted for
fidelity. It is stated here so a reader meets it at the contract rather than in a diff.

## Relationship to `pharn-cost-record/1`

`pharn/floor/render-cost-record.mjs` emits an **aggregate** cost block embedded in `ship-record.json`;
this contract describes a **standalone per-request** artifact. The two overlap, and they share one
implementation of transcript location and the file walk — imported, never copied.

**The overlap is recorded rather than resolved.** A ✧ parity test asserts the two agree on totals over the
same bytes, with the class-name mapping made explicit, so they cannot drift silently while both exist.

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
a committed artifact and are attacker-influencable in principle. They key a **view**, never a gate, and
**rule 3 above** — not the `usage` leaf rule — is what bounds them: ≤128 characters, no control character,
no path.

**That bound is on SHAPE, not on MEANING, and the distinction is the residual.** A 40-character
lower-case token is admitted whatever it says. An attacker who controls `attributionSkill` can therefore
place a benign-looking string into a file that a green `/pharn-loop` stop commits — it cannot forge a line
(no newline survives), cannot smuggle a path, and cannot flip any verdict (`cost.json` gates nothing,
fix #3), but it is a channel into a durable artifact and it is not closed. Stated, not zeroed.
