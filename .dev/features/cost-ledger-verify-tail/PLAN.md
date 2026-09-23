# PLAN — cost-ledger-verify-tail

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L29, L34, L37, L42, L43]
- increment: `check-cost-ledger.mjs --verify-transcript` stops REDding a genuine ledger whose session simply continued after the run, by checking `membership.excluded_requests` as a range — exact for the part before the window, bounded above by the part after the window's end — instead of by equality.
- layer(s): product floor (`pharn/floor/`) + `pharn/pharn-contracts/cost-ledger.md`
- constitution_refs: [P0, P1, P5, P6, P7]

## The defect (reproduced live this run, at `d96ef03`, 6.13.0)

A real dogfood failure (P7). The downstream project `pharn-starter` (PHARN 6.12.1) committed
`pharn/features/org-slug-routing/cost.json` in its PR #104 (`c241cb3`): `pharn-cost-ledger/2`, 630 request
rows, `membership.excluded_requests: 423`. Running THIS repo's 6.13.0 checker against it, read-only:

```text
node pharn/floor/check-cost-ledger.mjs <starter>/pharn/features/org-slug-routing/cost.json --verify-transcript --repo <starter>
RED — --verify-transcript: membership.excluded_requests does not match the transcript (423 recorded, 550 re-derived)
```

(The session's own report, taken earlier, said `508 re-derived`. The number moves between runs because
that transcript is still being appended to, which is the defect.)

`requests[]` and `totals` re-derive exactly, since both of those branches run first and passed. An
independent split of the same transcript under the ledger's own recorded markers (a scratch script, using
`run-window-core.mjs`'s `runWindow` and `tsMs`) gives **422 before the window, 630 inside, 161 after its
end, 0 other**. So the emission-time count was 422 + 1. The one after-window request was the emission's own
turn, which follows `run-stop` (`/pharn-loop` Step 6b writes `run-stop`, then emits). Since then the session
has gone on: the loop's own Step 6c commit, then conversation. The run-stop is at 15:07, and the transcript
was last written at 18:43 when the downstream agent measured it.

**Mechanism.** `renderLedger()` counts `excluded` as ONE number: every deduped session request that is not
a member. The checker's `--verify-transcript` (`check-cost-ledger.mjs:432`) re-derives that number from the
LIVE transcript and compares it for equality. The transcript is append-only. The part of the exclusion that
precedes the window is therefore fixed once the window is. The part after the window's end keeps growing
for as long as the session continues. So equality holds only if nothing has been written since the
emission, and every real stop fails it: the emission's own turns are already after `run-stop`, and the
command still has a commit and a summary to write.

## Applied lessons

- L42: the re-derivation answers "what is the exclusion NOW", while the recorded value answered "what was it
  THEN". The input the workflow legitimately changes between those two moments is the transcript tail after
  the window's end. That is the only such input, because the window itself is re-derived from the RECORDED
  markers, never the live file. The fix splits the exclusion on exactly that input: the part that cannot
  change is still compared exactly, and only the part that can change is widened.
- L43: `--verify-transcript` exists to bind the ledger to its referent (the transcript). The fix keeps that
  binding exact where the referent is stable (the rows, the totals, the before-window count) and writes the
  bound down where it is not: an inflated value up to `before + after` passes. A test pins that bound, and
  the contract states it.
- L37: the new contract sentence quantifies over what the check accepts ("some `0 <= t <= after`"). So the
  tests EXECUTE the check at both edges and one past each (`before - 1`, `before`, `before + after`,
  `before + after + 1`) and record the verdict, instead of reading the range off the code.
- L29: the tamper set is enumerated in ONE table (too low, too high, and each edge) that a single assertion
  loop iterates. It is not two hand-written tests for whichever member was in front of me.
- L34: every range test asserts that its domain is non-empty. The fixture must put at least one request
  before, inside and after the window, and must append at least one more after emission. Otherwise a zero
  tail would make the range degenerate and the test would pass by construction.

## Files

- `pharn/floor/run-window-core.mjs` — add `isAfterWindow(win, ts)`, the one definition of "after the window's end" (a known window with an end, a parseable timestamp, strictly later) — layer product floor
- `pharn/floor/run-window-core.test.mjs` — edge tests for `isAfterWindow` (inclusive end is NOT after, +1 ms is, open/unknown windows and unparseable timestamps are never after) — layer product floor (test; does not ship)
- `pharn/floor/render-cost-ledger.mjs` — count, inside the existing dedup/membership loop, how many excluded requests are after the window's end; export `deriveLedger()` returning `{ ledger, excludedAfterWindow }`, with `renderLedger()` returning its `.ledger` unchanged — layer product floor
- `pharn/floor/check-cost-ledger.mjs` — `--verify-transcript` compares `excluded_requests` as the range `[live − after, live]`; the RED names both parts; one WARN when the range was needed (recorded ≠ live); header rule 8 and the verify-transcript comment state the bound — layer product floor
- `pharn/floor/check-cost-ledger.test.mjs` — the continued-session GREEN, the enumerated tamper table, the open-window equality control, the WARN, and the bound pinned by a test — layer product floor (test; does not ship)
- `pharn/floor/fixtures/cost-ledger/session-continued.jsonl` — a committed, hand-authored tail: usage-bearing requests timestamped after the single-session fixture, appended to the staged transcript AFTER emission — layer product floor (fixture; does not ship)
- `pharn/pharn-contracts/cost-ledger.md` — `excluded_requests` is defined as a count AT EMISSION with a growing tail; the field-table row and rule 6's `--verify-transcript` sentence state the range and its bound — layer pharn-contracts
- `SKILLS_VERSION` — 6.13.0 → 6.13.1 (patch: a correction to shipped product-floor and contract bytes) — repo meta
- `CHANGELOG.md` — open `## [6.13.1] - 2026-09-23` above `[6.13.0]` with a `### Fixed` entry for this increment — repo meta
- `README.md` — the shields badge only, 6.13.0 → 6.13.1 (`check-version-badge.mjs` pins it) — repo meta

### Deliberately NOT touched

- The ledger's schema, `membership`'s closed key set, `MEMBERSHIP_KEYS`, and every emitted byte. A split field
  such as `excluded_before` / `excluded_after` would be a breaking contract change (`pharn-cost-ledger/3`)
  for no observed need. The split is re-derived at check time instead.
- The four trusted docs, `MIN_CLI`, the commands, and the generated docs. Nothing here moves a capability,
  a contract name or the floor-checker count.

## Design

- **`isAfterWindow(win, ts)`** in `run-window-core.mjs` returns true iff `win.status !== "unknown"`,
  `win.endMs !== null`, `tsMs(ts) !== null` and `tsMs(ts) > win.endMs`. The end is inclusive for
  membership, so a request AT the end is a member, not after it. An open window has no end, so nothing is
  after it. A request with no parseable timestamp is never after the window. It stays in the stable part,
  as it does today.
- **The emitter.** Inside the existing loop, right after `excluded++`, it adds
  `if (isAfterWindow(win, ts)) excludedAfterWindow++`. The work is carried by a module-private
  `buildLedger(opts, stats)`, which is the current `renderLedger` body with one extra out-parameter.
  `deriveLedger(opts)` returns `{ ledger, excludedAfterWindow }`, and `renderLedger(opts)` returns
  `deriveLedger(opts).ledger`. **The emitted ledger is byte-identical.** No field is added. Every existing
  `renderLedger` caller and test is untouched, and an equivalence test pins the unchanged output.
- **The checker.** The first two comparisons (row ids, then totals) stay exact and keep their order. The
  third becomes:
  - if the recorded or the re-derived value is `null` (an unknown window), require both to be `null`. That is
    the old equality, and this path is unreachable today, because unknown is WARNed earlier;
  - otherwise let `live` be the re-derived count, `after` the re-derived after-window count, and
    `before = live − after`, then accept iff `before <= recorded <= live`;
  - RED text:
    `--verify-transcript: membership.excluded_requests does not match the transcript (<recorded> recorded; re-derived <before> before the window + <after> after its end, so a genuine value lies in [<before>, <live>])`.
    It keeps the `does not match the transcript` prefix that the existing test matches;
  - when the range was used (`recorded !== live`), one WARN:
    `--verify-transcript: the session continued after the run — excluded_requests (<recorded>) is below the re-derived <live> because <after> request(s) now lie after the window's end; it is exact only for the <before> before the window, and an inflated value up to <live> would also pass`.
    That WARN is the P0 statement travelling with the verdict (L2). It does not fire when the value matches
    exactly.
- **Why a range and not a tighter pin.** The exact after-window count at emission would need an emission
  timestamp in the file. That is a schema change, and it is out of scope. The range is the tightest check
  the current schema supports.

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md`: this edits the contract itself. Its `excluded_requests` paragraph
  and rule 6 used to imply a stable value that `--verify-transcript` can reproduce exactly, and the
  transcript's append-only tail made that false. The edit states the range and its bound. The closed key
  set, the schema and the field table's class labels do not change. `excluded_requests` stays **ADVISORY
  without `--verify-transcript`**, and the row adds "bounded above, not exact, for the tail".

## Evals to write (P1)

No capability (`role:`) is added or changed, so no eval pair is owed. The floor checker and emitter get
`*.test.mjs` cases, and each one must fail on the pre-fix code where noted (L4):

1. **Continued session → GREEN.** The single-session fixture is staged with markers bounding a window in
   its middle (at least one request before, several inside, at least one after). The ledger is emitted,
   then `session-continued.jsonl` is appended to the staged transcript. `--verify-transcript` gives zero
   REDs and exactly one WARN naming the continuation. **This must RED on the pre-fix checker**, and the
   test asserts that the fixture really did change the live count (non-vacuity, L34).
2. **The enumerated tamper table (L29/L37)**, all on that same continued ledger:
   - `before − 1` → RED;
   - `before` → GREEN;
   - the emission value → GREEN;
   - `live` → GREEN;
   - `live + 1` → RED.

   The table is materialised once and one loop iterates it. The GREEN-at-`live` row is the **bound**,
   pinned: an inflated value passes.

3. **An uncontinued session stays exact.** Emission followed by an immediate verify gives zero REDs and no
   continuation WARN. `recorded + 1` is still RED. This is the regression control that the range did not
   loosen the untouched case.
4. **An open window stays exact.** With no `run-stop`, `after` is 0, so any tamper is RED. This pins the
   degenerate range.
5. **The emitter is unchanged.** `renderLedger(o)` deep-equals `deriveLedger(o).ledger` over the committed
   fixture set (single-session with both an open and a bounded window, with-subagents, an unknown window,
   an unavailable shell). `excludedAfterWindow` equals an independently computed literal for the bounded
   fixture.
6. **`isAfterWindow` edges** (`run-window-core.test.mjs`): the end instant is not after it, +1 ms is, and
   an open window, an unknown window, or a null or malformed timestamp is never after.
7. **The existing suites pass unmodified.** `check-cost-ledger.test.mjs`'s "REDs a tampered
   excluded_requests" (recorded 0 against a live 1, no tail) still REDs through the new branch.

## Guarantee audit (P0)

- "`--verify-transcript` REDs a recorded `excluded_requests` below the before-window count" → **floor:
  enum-regex + integer compare**, perishable (only while the transcript exists), and exact relative to the
  RECORDED markers.
- "`--verify-transcript` REDs a recorded `excluded_requests` above the live total" → **floor**, with the
  same bounds.
- "a value between the two is genuine" → **NOT claimed.** An inflated value up to `live` passes. That is a
  stated bound, pinned by a test, and said in the WARN and in the contract.
- "the before-window part never changes after emission" → **advisory**, because it rests on the transcript
  being append-only (a platform behaviour). A record appended later WITHOUT a parseable timestamp, or one
  whose timestamp falls before the window's end, would land in the stable part and could RED a genuine
  ledger. Neither has been observed. This is named in the contract, not fixed.
- "the emitted ledger is byte-identical" → **floor: test.** Deep-equality of `renderLedger` against
  `deriveLedger().ledger` over the fixture set, plus the existing emitter suite unchanged.

## Trust audit (P2)

No new input is ingested. The transcript was already untrusted and already read by `--verify-transcript`.
Its timestamps decide which side of the window's end an exclusion falls on. A crafted timestamp can move a
record from the stable part to the tail, which widens the accepted range by one request. That is bounded
the same way the contract already bounds membership ("Transcript timestamps are untrusted … it affects a
view that gates nothing"). `cost.json` gates nothing, and `--verify-transcript` is not wired into any
command.

## Determinism audit (P5)

Every branch is an integer compare or a membership test. There is no classification and no fallback that
guesses.

## Deferred (considered, out of scope)

- **An OPEN window's rows grow too.** Without a `run-stop`, requests appended later become members, so
  `requests[]` REDs on a continued session. Both emitters write `run-stop` before emitting (`/pharn-loop`
  Step 6b, `/pharn-ship` Step 3a), and the checker already WARNs an open window. There is no observed
  failure, so nothing is done (P7).
- **Recording an emission timestamp** would pin the tail exactly and close the inflation bound. That is a
  schema change, deferred.

## Open questions (HALT)

- none
