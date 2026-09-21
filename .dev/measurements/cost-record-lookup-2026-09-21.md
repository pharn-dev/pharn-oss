# Transcript lookup and cache-split coverage — measured, 2026-09-21

**Status:** measurement record. Apparatus-only (`.dev/`), no product surface measured into it, no
`SKILLS_VERSION` bump of its own.
**Raw data:** embedded below as JSON rather than kept in a sibling `.json`. The increment's `## Files`
declared the pair on one line and the writes-scope setter parses back-ticked paths, so only the `.md`
entered the fix #7 scope; embedding keeps every number recomputable without writing an undeclared path.
This is an instance of `.dev/memory-bank/lessons-learned.md` **L39** (one declaration section, two
consumers asking different questions), recorded rather than worked around silently.
**Register:** follows `LIMITS.md` — what is measured is stated, what is not is named and bounded.

This is the evidence behind the `cost-record-session-lookup` increment: why
`pharn/floor/render-cost-record.mjs` now locates a transcript by **session id** instead of deriving a
directory name from `cwd`, and why **no** unsplit-cache-write bucket was added.

---

## 0. What was measured, and what was deliberately not read

|            |                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | Claude Code session transcripts (JSONL) under `~/.claude/projects/`                                                                                             |
| Scope      | directory survey: all 25 project directories. Cache-split survey: `*pharn-oss*` only — the `token-cost-2026-08-18.md:17` precedent                              |
| Extraction | numeric usage fields, ISO timestamps, enum/identifier fields (`type`, `model`, `requestId`, `sessionId`, `attributionSkill`) and `cwd` — **no message content** |
| Machine    | one machine, one user. **Machine-local by construction**: transcripts are never committed, so no other clone can reproduce these numbers                        |

**The corpus is LIVE, and the numbers below drifted while being taken.** An earlier pass in the same
session counted 128 top-level transcripts and 8068 deduped requests; the pass recorded here counted 129
and 8112, because the session doing the measuring is itself a transcript being appended to. This is the
same property `coverage: partial` encodes in the renderer — a run cannot fully account for itself — and
it is why the conclusions below are stated as **invariants and ratios**, never as standing counts
(`lessons-learned` **L47**: replacing a stale count with a fresh count just sets a new expiry date).

---

## 1. Directory survey — the lookup key

```json
{
  "project_dirs": 25,
  "top_level_transcripts": 129,
  "nested_transcripts": 680,
  "distinct_top_level_basenames": 129,
  "basename_collisions_across_dirs": 0,
  "non_uuid_top_level_names": 0
}
```

**Finding 1 — the directory-name rule replaces `.` as well as `/`, and leaves `_` alone.** Read from
`cwd` evidence inside the transcripts, not inferred from the name shape:

| recorded `cwd`                                      | directory                                           |
| --------------------------------------------------- | --------------------------------------------------- |
| `/Users/…/bryff/.claude/worktrees/app-review-fixes` | `-Users-…-bryff--claude-worktrees-app-review-fixes` |
| `/Users/…/pharn-web/pharn-web`                      | `-Users-…-pharn-web-pharn-web`                      |
| (a path ending `bryff_`)                            | `-Users-…-bryff_` — the underscore survives         |

So the often-assumed rule "every character outside `[A-Za-z0-9/-]` becomes `-`" is **wider than the
evidence** and was not adopted.

**Finding 2 — DECISIVE: the directory is not a function of the session's `cwd` at all.** Three of the
four `pharn-oss` worktree directories record the **main repo** as their first `cwd`, and `cwd` is not
stable within a session:

| directory                                           | distinct `cwd` values in the transcript                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `…-pharn-oss--claude-worktrees-pharn-loop-run`      | 2 — `…/pharn-oss` **and** `…/pharn-oss/.claude/worktrees/pharn-loop-run` |
| `…-pharn-oss--claude-worktrees-model-routing-limit` | 2 — main repo and worktree                                               |
| `…-bryff--claude-worktrees-app-review-fixes`        | 3 — incl. a nested `.pharn/regress-base`                                 |

The renderer read only the **first** such value. A session opens in the main repo and moves into the
worktree, so **a dot-corrected derivation still resolves the wrong directory.** This is why the
derivation was retired rather than repaired, and why the cwd-mismatch refusal went with it: its premise
was a dirname collision that a UUID key makes unreachable, while this finding made it fire on
legitimate runs.

**Finding 3 — the session-id key is unambiguous on this corpus.** 129 top-level transcripts, 129
distinct basenames, **0 collisions**, every basename a UUID. Each transcript carries exactly **one**
distinct `sessionId`; auto-compaction changed neither the id nor the file (the fixture below holds 1815
records under one id). Nested subagent transcripts live at `<dir>/<sessionId>/…`, so a `sessionId`
prefix filter already excludes the non-session `memory/` and `vercel-plugin/` directories.

**Bound, and it is the important one:** this measures **the lookup's** behaviour on **this** corpus. It
is **not** a proof that the platform never reuses a session id. The renderer therefore refuses when an
id resolves to 2+ directories rather than relying on this count holding.

### Reproduction — the failure, before the change

```text
A) --cwd <the worktree>  -> coverage "unavailable"
   looked for …/-Users-pgalarowicz-Projects-pharn-oss-.claude-worktrees-pharn-loop-run
                                                      ^ dot kept, single hyphen; the real
                                                        directory is …-pharn-oss--claude-…
B) --cwd <the main repo> -> coverage "unavailable"
   no transcript found for session 51a7441d-… under …/-Users-pgalarowicz-Projects-pharn-oss
```

Both paths failed on the **real** `/pharn-loop` run behind `pharn/features/loop-decision-integrity/`
(`51a7441d-0e03-4066-8d1c-be5a2d419121.jsonl`, 1815 records, branches `main` →
`worktree-pharn-loop-run` → `pharn-loop-loop-decision-integrity`).

### Reproduction — after the change

```json
{
  "coverage": "partial",
  "session_id": "51a7441d-0e03-4066-8d1c-be5a2d419121",
  "window_start": "2026-09-21T08:35:42.425Z",
  "window_end": "2026-09-21T09:40:52.438Z",
  "transcript_files": 1,
  "requests": 275,
  "tokens": {
    "input_uncached": 550,
    "cache_write_1h": 936919,
    "cache_write_5m": 0,
    "cache_read": 91512265,
    "output": 171144,
    "thinking": 71838
  }
}
```

**This is the first measured cost of a `/pharn-loop` run recorded anywhere in this repo.** Read it with
the renderer's own bounds: tokens, never dollars; a floor on spend, never a total; annotation that gates
nothing.

---

## 2. Cache-split survey — why no unsplit bucket was added

```json
{
  "scope": "~/.claude/projects/*pharn-oss*",
  "files": 124,
  "deduped_requests": 8112,
  "split_present_and_equal": 8112,
  "split_present_mismatch": 0,
  "split_absent_with_nonzero_total": 0,
  "unaccounted_remainder": 0,
  "sum_cache_creation_input_tokens": 44395642,
  "sum_ephemeral_5m": 15865521,
  "sum_ephemeral_1h": 28530121
}
```

`fold()` reads only `cache_creation.ephemeral_{1h,5m}_input_tokens`, so a record carrying
`cache_creation_input_tokens` **without** the split would count cache writes as **0 with no signal** —
a silent undercount. The question was whether that happens.

**It does not, on this corpus.** Every deduped request carried the `cache_creation` object; the split
summed **exactly** to `cache_creation_input_tokens` in every case; the unaccounted remainder is **0**
tokens out of 44.4M. The object carried exactly two keys — `ephemeral_1h_input_tokens` and
`ephemeral_5m_input_tokens` — with no third class present.

**Conclusion — no field was added (P7).** An addition needs a real failure, and the failure rate here is
zero. The output shape also has **no bucket** for an unsplit total: attributing one to `1h` or `5m`
would be a guess (P5), and adding a bucket would be a speculative contract change. The exposure is
recorded instead as the named, deliberately-unbuilt residual **`cost-record-unsplit-cache-write`**, in
the module header and in the increment's guarantee audit — a pending remedy per `lessons-learned`
**L46**, not a solved problem.

What **was** done: the invariant (`cache_write_1h + cache_write_5m == cache_creation_input_tokens`) is
pinned by a hermetic test over four shapes, so a future change to `fold()` that broke the accounting
would fail rather than drift. The test pins the **invariant**, not the count above.

---

## 3. What this measurement does NOT establish

- **Not** that the renderer's numbers are correct in any absolute sense — only that the dedup, the
  per-class split and the lookup behave as specified. The platform's own `usage` fields are taken as
  given.
- **Not** that `CLAUDE_CODE_SESSION_ID` names the current run. Nothing here verifies that; it is the
  renderer's stated advisory bound, and it is weaker than the cwd refusal it replaced.
- **Not** reproducible from a fresh clone. Transcripts are machine-local and uncommitted.
- **Not** a statement about other machines' directory naming. Findings 1–3 are one user's corpus; the
  renderer is written so that none of them needs to hold — it tests filenames and refuses ambiguity.
