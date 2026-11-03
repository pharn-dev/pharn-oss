# PLAN — loop-record-honesty

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L6, L14, L15, L35, L52, L54, L62, L81]
- increment: batch group G6 of the 2026-11-03 principal review — three findings where a record reads differently to
  the floor and to a person: a repeated report key / SPEC `state:` read last-wins; `check-attestation` accepting
  `by: agent` and an impossible date, and `approved_by` validated by nothing; and `/pharn-loop`'s commit sweeping in a
  scope path the user had already edited before the run.
- layer(s): product floor (`pharn/floor/`), product contracts (`pharn/pharn-contracts/`), product commands
  (`.claude/commands/pharn-*.md`); build apparatus (tests, `.dev/guides/`, `.dev/features/`). The batch orchestrator
  bumps `SKILLS_VERSION` once, to 7.3.0.
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Why (P7)

Each item is a VERIFIED finding of the 2026-11-03 principal review
(`pharn-oss-principal-review-2026-11-03.md` §3 and `reports/axis4.md`), re-read against the live files in this
worktree (base `origin/batch/audit-2026-11-03` @ `fb997e4b`):

1. **[LOW] A duplicate-key verify/regression report reads last-wins; check-spec.mjs reads a repeated `state:`
   last-wins.** Live: `pharn/floor/check-loop.mjs:211-227` `readVerdict` is a bare `JSON.parse` (last copy wins), and
   `pharn/floor/check-spec.mjs:157-166` `parseSpec` assigns `fm[key]` per line (last copy wins), documented as such in
   `emitState`'s header (:292). Confirmed. The 6.71.3 repeated-key rule (`loop-record.md`) covers the LOOP.md envelope
   only.
2. **[LOW] check-attestation accepts `by: agent` and an impossible date; `approved_by` is validated by nothing; the
   commit message hard-codes it.** Live: `check-attestation.mjs:37-38` is a charset regex for `by` and a digit-shape
   regex for `at` (`2026-13-45T99:99:99Z` matches); `grep approved_by pharn/floor/*.mjs` finds only a comment in
   `loop-mode-core.mjs:21` and the `COMMIT_BODY` literal at `loop-closeout.mjs:157-158`. Confirmed.
3. **[MEDIUM] A user's pre-existing uncommitted edit to any path the plan names is swept into the loop's commit.**
   Live: `loop-closeout.mjs` `buildStageList` keeps `scope ∪ artifacts ∪ pinned` filtered only by regular / tracked
   deletion / ignored; the pre-run snapshot (`pre-run-snapshot.mjs` `preRunUnchanged` → `decidePreRun`) is consulted by
   the regress partition only. `.claude/commands/pharn-loop-close.md:375-376` states the residual. Confirmed.

Not a bug the review missed, stated so a reader does not look for it: `check-spec-approved.mjs` already shells
`check-spec.mjs` validate first, so once validate refuses a repeated `state:` the gate refuses it too — no second
reader is added there (L35).

## Approach

### 1 — repeated keys

- **`check-loop.mjs` `readVerdict`**: after `JSON.parse` succeeds, a total scan of the raw text's TOP-LEVEL object
  members (`repeatedTopLevelKeys`, a ~25-line string/depth scanner in the same file — no new module, so no scratch-tree
  copy list grows, L81). Each key token is decoded with `JSON.parse` so `verdict` and its `\u`-escaped spelling are one key —
  the comparison JSON.parse itself makes. Any repeated top-level key → `{ok: false}` → INCONCLUSIVE (exit 2), the
  reason naming the keys only, never a value (P2). Applies to both reports (the quick table never opens the regression
  report, unchanged). A repeat in a NESTED object is not refused: stated as the bound.
- **`check-spec.mjs`**: `parseSpec` also counts each key (a `Map`, L15) and returns the repeats; `validate()` REDs a
  repeat of any key the verdict reads — `state`, `spec_id`, `spec_content_hash`, `approved_by` — as kind `repeated-key`
  (keys and counts only, `describeRepeats`, frontmatter-core's existing message helper). Other keys stay unvalidated as
  today (a user SPEC repeating an unrelated key is not newly RED — P7). `--state` prints an EMPTY line (exit 0, the
  "unusable" convention `--spec-kind` already uses for two `spec_kind:` lines) when `state` repeats, so no reading of a
  repeated state exists anywhere (L35); its header comment is corrected.

### 2 — honest attestation and approval fields

- **`check-attestation.mjs`**: `by` keeps its charset regex and additionally must not be a member (case-folded) of a
  frozen `RESERVED_BY` list of agent names and placeholders — `agent, ai, anonymous, assistant, bot, claude, human,
llm, model, none, null, pharn, system, unknown, user` — else `malformed` (exit 2). `at` keeps `AT_RE` (L14: the
  shape test stays the precondition) and must also name a real instant: month 01–12, day within the month (leap years
  by the Gregorian rule), hour 00–23, minute and second 00–59, offset hours 00–23 and minutes 00–59 — else
  `malformed`. `ship-record.md`'s shape table states both and the bound: a reserved-name list stops the obvious
  self-fill, it does not prove a human typed `by` (advisory, unchanged).
- **`check-spec.mjs`**: `approved_by`, when present, must read exactly `model` (after `readValue`, so a trailing
  `# comment` is tolerated as for every field) — else RED kind `approved-by`. A human approval carries no key
  (`pharn-spec.md` Step 5 writes it only under `--model-approve`), so this refuses a model labelling its own approval
  `human`; ABSENCE is not detected (stated). `/pharn-loop`'s commit gate already re-runs `check-spec` through
  `check-spec-approved.mjs` (`check-loop-fresh --front`), so such a SPEC can no longer commit.
- **`loop-closeout.mjs` `COMMIT_BODY`**: drop the parenthetical `(approved_by: model)`, which cites a field the
  closeout never reads. The sentence that remains — the SPEC was approved by the model, not by a person — is true of
  every `/pharn-loop` run by construction (S2: the run created the feature directory; Step 3 approves it with
  `--model-approve`). Smallest change that makes the message state only what is known (see Open questions, Q2).

### 3 — the staging list leaves a pre-run edit out

- **`buildStageList(feature, {git, base, preRun})`**: when `base` is given, ask `preRun({feature, base, inside})`
  (default `preRunUnchanged` from `pre-run-snapshot.mjs` — the regress partition's own reader and digest rule, reused,
  not copied: L35, L54) which candidate paths still hold the bytes the open run's snapshot recorded. A path named by the
  plan's scope **and by neither the feature's artifacts nor the lock's pinned tests** that is in that set is left out of
  the list and returned as `leftDirty: {status, paths}`. Artifacts and pinned tests are always staged: the feature
  directory is the run's own (S2), and committing a lock without a test it pins would break the branch. On any snapshot
  miss (`no-delivery-run`, `no-snapshot`, …) nothing is subtracted — exactly today's list — and the status says which.
  Without `base` (a caller that does not pass one) the subtraction is skipped and `leftDirty` is null.
- **`closeLoop`** passes `base`; the closing document gains the key `left_dirty` (`null` until the list is built, then
  `{status, paths}`), added to the closed `DOC_KEYS`.
- **Bounds, stated in the header and the close part:** a scope path the build changed AFTER the user's pre-run edit
  is staged whole, the user's edit included (git cannot split one file's bytes by author); a build that writes a
  pre-run path back to its recorded bytes reads as unchanged (the snapshot's own bound); the snapshot is agreement,
  never provenance (a Bash writer can forge it — L19).
- **`pharn-loop-close.md`**: the summary bullet that told the model to name committed pre-run-dirty paths from
  `pre-run-status.txt` now reads `left_dirty` from the closing document (L6: from the structured location), and keeps
  the model-read bullet only for a pre-run path the build changed further; the residual at :375 is corrected.

## Files

- `.dev/features/loop-record-honesty/PLAN.md` — this plan
- `.dev/features/loop-record-honesty/GRILL.md` — grill log
- `.dev/features/loop-record-honesty/BUILD.md` — build notes (finding → outcome)
- `pharn/floor/check-loop.mjs` — repeated top-level report key → INCONCLUSIVE
- `pharn/floor/check-loop.test.mjs` — fixture (h) both orders, escaped-key spelling, nested-key bound, control
- `pharn/floor/check-spec.mjs` — repeated gated key RED, `approved_by` ∈ {model}, `--state` empty on a repeat
- `pharn/floor/check-spec.test.mjs` — the repeated-key and `approved_by` cases, with GREEN controls
- `pharn/floor/check-spec-approved.test.mjs` — the duplicate-`state:` regression test now expects check-spec's refusal
- `pharn/floor/check-plan-spec-agree.test.mjs` — added during build (see "Build deviations"): its chain test now expects
  the `repeated-key` refusal
- `pharn/floor/check-attestation.mjs` — `RESERVED_BY` and a calendar-valid `at`
- `pharn/floor/check-attestation.test.mjs` — reserved handles (each member), impossible dates, leap-day control
- `pharn/floor/loop-closeout.mjs` — `buildStageList` pre-run subtraction, `left_dirty`, `COMMIT_BODY`
- `pharn/floor/loop-closeout.test.mjs` — a pre-run-dirty unchanged scope path is left out and named; changed one is
  staged; artifacts never subtracted; the commit-body pin
- `pharn/floor/pre-run-snapshot-core.mjs` — header bullet on the loop commit corrected
- `pharn/pharn-contracts/ship-record.md` — `by` / `at` shape rows
- `pharn/pharn-contracts/verify-report.md` — `check-loop.mjs` refuses a repeated top-level key
- `pharn/pharn-contracts/regression-report.md` — the same sentence
- `.claude/commands/pharn-loop-close.md` — `left_dirty` in the summary, residual corrected
- `.claude/commands/pharn-spec.md` — the floor claim names the `approved_by` and repeated-key REDs
- `.dev/guides/floor-orchestration.md` — the `check-loop.mjs` and closeout entries
- `.dev/guides/floor-gates.md` — the pre-run snapshot entry (the loop commit now consults it)
- `CHANGELOG.md` — `[Unreleased]` entries

## Contracts satisfied

- `pharn/pharn-contracts/ship-record.md` — the attestation shape table gains the reserved-name and calendar rules.
- `pharn/pharn-contracts/verify-report.md`, `regression-report.md` — the consumers table's `check-loop.mjs` row gets
  the repeated-key refusal; the other three consumers are unchanged and the divergence is stated.
- `pharn/pharn-contracts/loop-record.md` — NOT edited (group G2 owns it this release); its closing-document keys are
  not listed there (they live in `loop-closeout.mjs` `DOC_KEYS` and the close part).

## Evals to write (P1)

No capability (`role:`) changes, so no eval fixture; every behaviour change gets a test (P7, the batch rule):

- check-loop: `{"verdict":"FAIL",…,"verdict":"PASS"}` → exit 2 INCONCLUSIVE; the reverse order → exit 2; a `\u`-escaped
  second `verdict` → exit 2; a repeated key in the regression report → exit 2; a repeated key only in a nested object → the
  normal decision (the stated bound); the unrepeated twin → its normal decision (control).
- check-spec: `state: Draft` + `state: Approved` → RED `repeated-key`, both orders; repeated `spec_content_hash` /
  `spec_id` / `approved_by` → RED; a repeated unrelated key → GREEN (control); `--state` on a repeat → empty line;
  `approved_by: human` / `""` / `Model` → RED `approved-by`; `approved_by: model` and `approved_by: model # note` and no
  key → GREEN.
- check-spec-approved: the duplicate-`state:` fixture still refuses (exit 1) and now names `repeated-key`.
- check-attestation: every `RESERVED_BY` member, and a case variant, → malformed (the enumeration is the set — L52);
  `2026-13-45T99:99:99Z`, `2026-02-30T…`, `2025-02-29T…`, hour 24, offset `+24:00` → malformed; `2024-02-29T…` and a
  real handle → attested (control).
- loop-closeout: a real snapshot (marker + `captureSnapshot` in the fixture repo) with a tracked scope file dirty
  before the run and unchanged → absent from `stage.list` and from the commit, named in `left_dirty`, still dirty in the
  working tree; the same file changed again after capture → staged; no marker → today's list and
  `left_dirty.status: "no-delivery-run"`; an artifact or pinned test recorded pre-run → still staged; the commit-body
  paragraph pin updated.

## Guarantee audit (P0)

- "check-loop.mjs never decides from a report whose top-level object repeats a key" → floor: enum-regex (a
  deterministic scan + membership), tested. Bound: top-level only.
- "check-spec REDs a repeated `state`/`spec_id`/`spec_content_hash`/`approved_by`" → floor: enum-regex, tested.
- "`approved_by`, when present, is `model`" → floor: enum. "a human approved" → advisory, unchanged (`LIMITS §1d`).
  "the key is present on a model-approved SPEC" → advisory (absence is not detected).
- "`by` is not a reserved agent/placeholder name and `at` is a real instant" → floor: enum + regex + arithmetic over
  captured digits. "a real human supplied `by`" → advisory, unchanged.
- "a scope path the run did not change from its pre-run bytes is not committed" → floor: content hash (the snapshot's
  digests, compared by `decidePreRun`), tested — AGREEMENT, never provenance; a Bash writer can forge the git-dir
  record. That a run calls the closeout at all → advisory (unchanged).
- "the summary names the left-dirty paths" → advisory (model-authored), now read from a structured field.

## Trust audit (P2)

- Report JSON keys and SPEC/ship-record values are untrusted DATA: messages print key names (identifier grammar for
  the SPEC, `JSON.stringify` for report keys) and counts, never values. The scanner and the date check are total over
  any string (L62): no throw on a malformed or hostile input — `JSON.parse` has already accepted the text before the
  scan runs.
- Paths in the snapshot and the scope are git-printed / plan-derived strings: compared, hashed, written NUL-separated,
  never evaluated (unchanged handling).

## Applied lessons

- L6 — the summary's "which committed paths were already dirty" moves from the model reading `pre-run-status.txt` to
  the closing document's `left_dirty`, a structured field the closeout computes.
- L14 — `at`'s calendar check and `by`'s reserved list run AFTER the existing anchored regexes, never instead of them,
  so the control-char / newline guard stays the precondition.
- L15 — the per-key counts in `parseSpec` and the scanner's seen-set are `Map`s / `Set`s, so a key named `toString`
  or `__proto__` counts like any other.
- L35 — no second reading is added: the closeout reuses `preRunUnchanged` / `pathDigest` rather than a copy; `--state`
  stops having a repeated-state reading instead of keeping one in sync with validate's.
- L52 — the attestation test iterates the whole `RESERVED_BY` set and the repeated-key test covers every gated key and
  both orders, not one member.
- L54 — the subtraction's digests come from `pathDigest`, which classifies with `lstat` and never follows a link;
  absence stays an `lstat` ENOENT.
- L62 — `repeatedTopLevelKeys` and the date check are total; a hostile key is quoted through `JSON.stringify` only.
- L81 — `check-spec.mjs`, `check-loop.mjs` and `check-attestation.mjs` gain no import of a new module (scratch-tree
  copy lists in `check-spec.test.mjs`, `check-loop.test.mjs` and others name them); `loop-closeout.mjs`'s new import
  (`pre-run-snapshot.mjs`) is checked against every test that copies it (none: its e2e fixture symlinks the whole
  `pharn/floor/`).

## Build deviations (recorded after GATE 1)

The first `npm run check` of the build was RED in four tests outside this plan. They showed that two choices in
"Approach §1" went further than the finding, so the build narrowed both:

- **`--state` keeps last-wins.** `frontmatter-core.test.mjs`'s ✧ PARITY pins `check-spec --state` equal to `readField`,
  the single reading L35 asks for. Printing an empty line would have made a second reading. validate's `repeated-key`
  RED already stops a repeated `state` at every gate, because `check-spec-approved` validates before it reads `--state`.
- **`repeated-key` covers `state` and `approved_by` only (`REPEAT_REFUSED`), not `spec_content_hash` / `spec_id`.**
  6.20.5 deliberately made every reader take the LAST pin, so that a re-approval appending a pin under a stale one, or
  under a Draft's `spec_content_hash: ""`, reads the same everywhere (`ac-tests-lock.test.mjs` pins both). Refusing
  that is outside this finding (P7).
- **One file added to `## Files` after the anchor:** `check-plan-spec-agree.test.mjs`. Its chain test asserted the
  old `"Draft" is not "Approved"` message, which `repeated-key` now precedes. Reconcile over the first window (anchor
  at 12:55:15Z up to this change) was **CLEAN** (18 reconciled, 0 escapes). Build Step 0 was then re-run (setter,
  then `--anchor`), so the epoch covers the widened plan. Every write in the first window went through the
  hook-gated Write/Edit tools or a formatter over scoped paths.

## GATE 1 — decided (the questions this plan raised, resolved)

GATE 1 was decided by the batch orchestrator (a model) under the owner's delegation — not a human approval.
Approved as written, with these answers:

- **Q1 — should a snapshot MISS at the closeout refuse the commit?** No. The miss is reported in `left_dirty.status`
  and today's list is staged (P7: no observed failure; a refusal would add a `not committed:` reason to a closed set).
- **Q2 — the commit message.** Drop `(approved_by: model)` from `COMMIT_BODY`.
- **Q3 — `RESERVED_BY` membership.** The exact 15-name list above, matched after lower-casing. The contract says
  plainly that it is a placeholder deny-list, not identity verification: a real-looking name typed by a model passes.
- **Grill items:** all five folded in (reader throw left uncaught → crash before the branch step; quoted keys bounded;
  a log line naming the left-out paths; the leap-second rationale; the 24 h marker bound beside the miss rule).
- **`loop-closeout.mjs`:** no edit to `BLOCKED_RE` (group G2's area).

No trusted-doc change is needed: no sentence in the four trusted docs becomes false (`LIMITS §1d` already calls
`approved_by: model` ungated; it stays true that a human approval is unverifiable). No DOCS-PROPOSAL.md.
