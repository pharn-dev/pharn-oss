---
spec_id: loop-decision-integrity
state: Approved
spec_content_hash: "8c5e97bd52be683ca0d942c72ab5b7916523bd28f05f2cc422d2a9bca38c5429"
approved_by: model
---

## Intent

A previous unattended `/pharn-loop` run skipped `/pharn-grill`, `/pharn-regress` and `/pharn-verify`
entirely, hand-executed the equivalent work by judgment, and still produced a `LOOP.md` whose `decision`
field read as a genuine floor-grade stop. `pharn/floor/check-loop-record.mjs` — the only checker that
self-validates `LOOP.md` — passed it, because that checker is explicit in its own header that it verifies
the record's **shape** only: "that `decision` AGREES with what `check-loop.mjs` actually emitted
(membership is checked, agreement is not)". Nothing in the pipeline ever re-derives a recorded decision
from the reports it is supposed to summarize, so a hand-authored or corrupted `LOOP.md` is currently
**indistinguishable on disk** from a genuinely floor-computed one — and on a `STOP_GREEN` outcome
specifically, that record gets committed to a new branch **unattended**, with no human between the record
and the commit.

The fix closes this one gap: for a non-blocked `LOOP.md`, deterministically re-run
`pharn/floor/check-loop.mjs` against the `verify-report.json` / `regression-report.json` the record
implicitly cites (by feature-directory convention) using the record's own `iterations`, and require the
result to reproduce the recorded `decision`. This is a **cross-file agreement** check, exactly the
`render-ship-briefing.mjs` / `check-ship-briefing.mjs` pattern already used for `BRIEFING.md`, adapted to
`/pharn-loop`'s unattended context: unlike that pair (advisory-only, because a human gate already follows
it), this one **gates** the `STOP_GREEN → commit` step, because that is the one place in `/pharn-loop`
where no human stands between the record and a consequential action.

## Scope

**In scope:**

- A new deterministic floor checker that, given a `LOOP.md` path, re-derives the decision its cited
  reports would produce (by shelling out to `pharn/floor/check-loop.mjs`, reused rather than
  reimplemented) and compares it to the recorded `decision`. A blocked stop (`decision: INCONCLUSIVE` with
  a `blocked:` key) is exempt — per the existing contract, such a stop never consulted `check-loop.mjs` in
  the first place.
- Recording the loop's `cap` (the `--max-iter` value, already known to `/pharn-loop` at entry) in
  `LOOP.md`'s frontmatter as a new field, so the new checker can supply `--cap` to `check-loop.mjs` and
  fully re-derive a `STOP_CAP` decision too, not only `STOP_GREEN` / `STOP_TERMINAL`. Additive: existing
  records without `cap` are untouched and stay shape-valid — no historical `LOOP.md` is invalidated.
- Wiring `/pharn-loop`'s Step 6b to invoke the new checker immediately after `check-loop-record.mjs`, for
  every non-blocked stop, and Step 6c to require it GREEN before staging/branching/committing — mirroring
  exactly how a failed `check-loop-record.mjs` repair is already handled, with a new closed
  `not committed: <spelling>` outcome added to the existing enumerated set.
- Updating `pharn/pharn-contracts/loop-record.md` (the envelope table, the canonical template, and the
  guarantee-audit section) and this repo's own hygiene/consumer test pins that enumerate `/pharn-loop`'s
  closed sets and the frontmatter-core consumer list, so the new field and the new checker are held to the
  same "materialize the set, never assert from prose" discipline already used throughout this file.

**Out of scope:**

- Re-verifying any `LOOP.md` already committed by a prior run — this closes the gap for future runs; nothing retroactively re-audits history.
- Recovering the specific prior run's un-anchored `check-bash-reconcile.mjs` gap — that window is
  already closed (the worktree is gone) and is a `STOP_TERMINAL`-class loss this fix cannot undo.
- Any change to `check-loop.mjs`'s own input signature — it stays exactly
  `{verify-report.json, regression-report.json, iter, cap}`, so "no advisory stage can gate the loop's
  stop decision" remains structurally true. The new checker runs strictly **after** that decision exists
  and gates only the downstream commit, never the stop itself.
- `/pharn-dev-ship` / `/pharn-dev-loop` or any dev-surface equivalent — no dev-loop command exists, and
  this increment does not add one.
- A general anti-tamper mechanism for `LOOP.md` after it is written (e.g. content-hashing the whole
  record) — the fix targets the specific gap the incident exposed: an UN-derived decision reaching an
  unattended commit, not every possible post-write edit.

## Acceptance Criteria

- A `LOOP.md` whose `decision` is `STOP_GREEN`, `STOP_CAP`, `STOP_TERMINAL`, or an un-blocked
  `INCONCLUSIVE`, and whose cited `verify-report.json` / `regression-report.json` genuinely reduce (via a
  live re-run of `check-loop.mjs`, given the record's `iterations` and `cap`) to that same `decision` →
  the new checker exits 0 (GREEN).
- A `LOOP.md` whose cited reports are missing, malformed, or reduce to a **different** decision than the
  one recorded → the new checker exits non-zero (RED), with a message distinguishing "reports
  missing/malformed" from "decision mismatch" for a human reader.
- A `LOOP.md` with `decision: INCONCLUSIVE` and a `blocked:` key → the new checker exits 0 without
  attempting re-derivation (nothing to re-derive; the contract's existing exception).
- `pharn/floor/check-loop-record.mjs` still returns GREEN, unchanged, on every existing valid `LOOP.md`
  that has no `cap` field — the new field is additive, never mandatory for shape validity.
- `/pharn-loop`'s Step 6c (the `STOP_GREEN` commit) does not run — and the run reports
  `not committed: decision unverifiable` — when the new checker is RED for the record it just wrote.
- `npm test` is green including new fixtures for: a genuine record (PASS), a record citing absent reports
  (RED, missing), a record whose decision disagrees with a live re-derivation (RED, mismatch), and a
  blocked-stop record (skipped, GREEN).
- `node pharn/floor/validate.mjs .` stays GREEN over the product surface.
- `SKILLS_VERSION` is bumped (minor — a newly shipped checker + an additive record field + new command
  wiring, nothing existing breaks) with a `CHANGELOG.md` entry recording the bump and its size.

## Constraints

- No new floor primitive is invented — the fix is entirely `pharn/ARCHITECTURE.md §2` primitive #3
  (enum/regex — here, comparing one decision token to a live re-run's decision token) reusing
  `check-loop.mjs` as a shelled CLI, exactly the `check-plan-spec-agree.mjs` reuse idiom (`spawnSync`
  against a sibling checker, never an import of its internals).
- `check-loop.mjs`'s own input signature and the "no advisory stage can gate the loop" structural
  invariant are untouched. The new checker consumes `check-loop.mjs`'s **output**; it is never fed back
  into it, and it runs only after a stop already exists.
- Any file that parses `LOOP.md`'s frontmatter must import `FM_RE` / `stripBom` from
  `pharn/floor/frontmatter-core.mjs` (never re-declare the anchor) and be added to that module's
  materialized consumer list, per this repo's own `frontmatter-core.mjs` L31/L29 discipline.
- Every closed set this touches (`/pharn-loop`'s commit-outcome spellings, the loop-record envelope table,
  the frontmatter-core consumer list) must be updated as a **materialized enumeration**, not left to
  prose agreement — consistent with how every other closed set in this command and its test pins is
  already held.
- The new checker must state its own honest bound in its header, in this repo's house style: it proves
  the recorded decision is **re-derivable** from the reports it cites; it does not prove those reports
  themselves are honest (a fabricated but internally-consistent pair of reports would still pass) — that
  residual is named, not hidden.
