# PLAN — unmeasured-gates-inconclusive

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6 # fix #4
- applied_lessons: [L1, L29, L34, L35, L36, L37, L43, L55, L58, L72]
- increment: a gate the runner did not measure — killed at `--timeout-ms` (`timed_out: true`, whatever exit the kill left) or unable to start (exit 126/127) — makes the stamp-path verify verdict `INCONCLUSIVE` (`reason_code` `gate-not-measured`, `unmeasured_gates[]`), never `FAIL` or `PASS`; a timed-out HEAD run makes the regress verdict `inconclusive` (`head-timed-out`, `head_timed_out[]`) exactly as a timed-out BASE run already does; `check-loop-fresh.mjs` check B passes those three "not measured" codes through to `check-loop.mjs`, whose existing table stops them `STOP_TERMINAL` / `unmeasured` instead of `CONTINUE`; VERIFY.md, REGRESSION.md and RUN-REPORT.md name the gates.
- layer(s): product floor (`pharn/floor/` — five edits, no new module); product contracts (`verify-report.md`, `regression-report.md`, `gate-run-record.md`, `loop-record.md`); product commands (`pharn-verify.md`, `pharn-ship.md`, `pharn-loop.md`, `pharn-loop-close.md` — one sentence each); tests; dev guides; repo-meta. No hook, settings file, capability or trusted-doc change.
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- base: branch `fix/unmeasured-gates-inconclusive`, cut from `origin/main` at `fa983a8` (6.58.0), fetched this run; `main` was RED there (a duplicate `## [Unreleased]` heading in `CHANGELOG.md`). Amended after grill (G5): before the build the branch fast-forwarded to `origin/main` `8fe73d1` (#343 — main green, still 6.58.0), so the build's base is `8fe73d1`. `pharn/ARCHITECTURE.md` hashed this run with `.dev/floor/hash-doc.mjs` (the pin above). Bumps to **6.59.0** (minor — `## Version`), renumbered at GATE 2 if `main` moves first.
- lessons index: `node .dev/floor/check-lessons-index.mjs .` exited 0 (GREEN) this run, so the two-step sweep ran: candidates selected from `docs/lessons-index.md`, every cited entry read in full from canon.
- gate1: APPROVED 2026-10-13 — delegated: decided by the orchestrating model under the maintainer's 2026-10-13 delegation (a model decision under delegation, NOT a human approval), with the recommended answer (a) to every open question, Q1–Q6. See `## Resolved questions (GATE 1)`.

## Applied lessons

- **L1** — the meta-docs this changes are in `## Files`: the CHANGELOG entry, `SKILLS_VERSION`, the README badge, and the two dev guides whose sections describe the changed checkers (`floor-gates.md` stamp surface + regress base-integrity, `floor-orchestration.md` freshness check B). `CLAUDE.md` and the four trusted docs state nothing about timeouts (grepped this run: zero hits), so none is touched.
- **L29** — the two closed sets this adds are each materialized ONCE and iterated by the tests: `UNMEASURED_CAUSES` (`timed-out`, `not-started`) and `UNMEASURED_CODES` (`base-timed-out`, `gate-not-measured`, `head-timed-out`), both in `gate-run-core.mjs`; the suite loops over every member rather than testing the one in front of it.
- **L34** — every new "inconclusive" row has a control that stays measured: the same exit with `timed_out: false` (`1` stays `FAIL`, `0` stays `PASS`), exit `125` and `128+n` stay a measured `FAIL`, a timed-out HEAD over a measured red BASE stays `pre_existing`, and a stamp with no unmeasured run emits no `unmeasured_gates` key at all (byte-identical to 6.58.0).
- **L35** — one owner of the predicate: `gate-run-core.mjs` `unmeasuredRuns(stamp)` next to the existing `timedOutRunIds`; `check-verify.mjs` calls the first, `check-regress.mjs` calls the second on the HEAD stamp as it already does on the BASE one. No checker re-derives "timed out" or "could not start" itself.
- **L36** — `UNMEASURED_CODES ⊆ REASON_CODES` and `UNMEASURED_CODES ∩ LAPSE_CODES = ∅` are asserted as set relations, and the existing two-way `REASON_CODES` closure test covers the two new members (each must have an emitter — `check-verify.mjs`, `check-regress.mjs`).
- **L37** — the premise was PROBED this run against the live runner, not read off `run-gates.mjs` (table below); the new contract sentences are written from those rows, and one test re-runs the probe with the real runner.
- **L43** — freshness check E re-derives the verify and regress reports from their stamps; because the new rule reads only the stamp, the re-derivation reaches the same verdict, and the differential "honest worlds" test gains timed-out and 127 worlds so that agreement is measured, not argued.
- **L55** — the honest-worlds differential runs the REAL `check-verify.mjs` with and without `--ac-gate` over the new worlds (the existing harness), so `stampDerivedMismatch`'s invariant is re-checked against the checker, not against my model of it.
- **L58** — nothing new is bound to a live referent: `unmeasured_gates` is derived from the finalized stamp alone, which is immutable once written; the AC gate's live reads are untouched.
- **L72** — this changes what two existing verdict functions RETURN for a class of stamps (`FAIL`→`INCONCLUSIVE`, `regressions`/`no-regressions`→`inconclusive`, freshness `STOP`→pass-through for `base-timed-out`). Every reader of those values was grepped this run (table in D7); every test that builds a timed-out or 126/127 run was listed — none asserts the old verify/regress verdict for one (the only timed-out regress tests are the BASE ones, unchanged).

## The trigger (P7)

A real review finding, reproduced: LOOP-1 (High) of the 2026-10-12 independent review (`loop-report.md` beside it):
a verify report whose `test` gate exited 124 makes `check-loop.mjs` return `CONTINUE`, so `/pharn-loop` rebuilds up to
the cap "fixing" a hang, paying the regress-head and verify timeouts each iteration, and its fix list says "test
failed". Re-measured this run (below), with one row the review did not report: a gate that traps the runner's SIGTERM
and exits `0` is recorded `exit 0, timed_out: true` and reads as a **PASS** today — a false green.

## Measured this run (L37)

A throwaway git repo (`.pharn/pharn-dev-plan/probe.mjs`, removed before commit) with five `--gates` entries, the real
`run-gates.mjs init --stage verify` and `run --next --timeout-ms 1500`, then the real `check-verify.mjs --stamp` and
`check-loop.mjs` at `fa983a8`:

| gate (`--gates` token)                         | runner records                | `check-verify` today                |
| ---------------------------------------------- | ----------------------------- | ----------------------------------- |
| `sh -c 'trap "exit 0" TERM; sleep 30 & wait'`  | exit `0`, `timed_out` true    | **not** in `failing_gates` — a pass |
| `sh -c 'trap "exit 1" TERM; sleep 30 & wait'`  | exit `1`, `timed_out` true    | in `failing_gates` — "failed"       |
| `nosuchbinary_xyz` (shell `command not found`) | exit `127`, `timed_out` false | in `failing_gates` — "failed"       |
| `sleep 30` (killed by the group SIGTERM)       | exit `124`, `timed_out` true  | in `failing_gates` — "failed"       |
| `true`                                         | exit `0`                      | pass                                |

The review's own reproduction (`{"test":124}` → `FAIL` → `check-loop` `CONTINUE`) was re-run and holds. A spawn failure
other than ENOENT/EACCES never reaches a stamp: `run-gates.mjs` stops the drain `usage-error` (`:1228`), so inside a
stamp "could not start" is exactly exit 126/127 (`:1066-1069`; a shell's own `command not found` is 127 too).

## Decisions

### D1 — one predicate, in `gate-run-core.mjs`

`UNMEASURED_CAUSES = ["not-started", "timed-out"]` and `unmeasuredRuns(stamp)` → `[{ id, cause }]` in run order:
`timed-out` iff `run.timed_out === true` (whatever its exit — the runner's kill is the cause, and a gate that handles
SIGTERM can exit 0 or 1); else `not-started` iff `run.exit` is 126 or 127. A reused run (exit 0..125, `timed_out`
false by `MAX_REUSABLE_EXIT`) and a `no-files` run (exit 0) are never unmeasured. Called on a VALIDATED stamp only,
like `timedOutRunIds`.

**A signal exit (≥ 128) the runner did not cause is a measured FAIL** (recommended answer to Q1): the runner forwards
a harness signal and records nothing for that entry, so a signal in a stamp came from inside the gate's group or the
kernel — a segfault, an abort, an OOM kill — which is the code under test failing, and a rebuild may fix it.

### D2 — `check-verify.mjs --stamp`: unmeasured is INCONCLUSIVE, and it comes first

On the stamp path only (the positional map carries exits alone, so the dev twin `/pharn-dev-verify` and every legacy
fixture stay byte-identical), when `unmeasuredRuns` is non-empty the verdict is:

```json
{
  "verdict": "INCONCLUSIVE",
  "failing_gates": [],
  "reason_code": "gate-not-measured",
  "unmeasured_gates": [{ "id": "test", "cause": "timed-out" }],
  "reason": "…"
}
```

with `gates`, `gate_run` and `ac_gate` (when `--ac-gate`) kept, exit 2. **It is the FIRST branch of the precedence,
before a real red gate** (recommended answer to Q2): (a) `check-loop.mjs` already ranks "nothing was measured" above
every other cause; (b) check-loop-fresh's moved-tree rule (`stampDerivedMismatch`) accepts a non-FAIL verdict only with
an empty `failing_gates`, so the measured reds stay in `gates`, not in `failing_gates`; (c) `/pharn-ship` stops on
`FAIL` and `INCONCLUSIVE` alike, so only the label changes there; (d) a `FAIL` beside a hung gate would `CONTINUE`
the loop straight back into the same hang. The real reds are named by `gates` and by VERIFY.md.

### D3 — `check-regress.mjs verdict`: a timed-out HEAD is not a head result

Symmetric with the BASE rule: `headTimedOut = timedOutRunIds(h.stamp)`. A gate whose HEAD run timed out and whose BASE
is not a **measured** red (`base === 0`, or the base run timed out too) cannot be classified OK or a regression, so the
verdict is `inconclusive`, `reason_code` `head-timed-out`, exit 2, the table still reported. A timed-out HEAD over a
measured red BASE masks nothing — the gate is `pre_existing` either way — and the verdict stands. `head_timed_out`
lists every timed-out head run whenever there is one (absent otherwise, so older reports keep their bytes). Precedence:
the existing `base-timed-out` branch first (its reports keep their bytes), then `head-timed-out`, then the plain table —
an unmeasured gate wins over a regression elsewhere, as the base rule already does. 126/127 at regress are NOT
changed: each side's exit is compared as before (out of the finding; Q3).

### D4 — freshness check B: the three "not measured" codes are verdicts, not refusals

`UNMEASURED_CODES = ["base-timed-out", "gate-not-measured", "head-timed-out"]` (in `gate-run-core.mjs`, disjoint from
`LAPSE_CODES`). In `loop-fresh-core.mjs` check B a report carrying one of them is **not a freshness failure**: the
remaining checks (C, D, J, E, H, F, G, I) run as for any report, and the stop is read by `check-loop.mjs`, which maps
verify `INCONCLUSIVE` / regress `inconclusive` to `STOP_TERMINAL`, `terminal_cause` `unmeasured`. Today the catch-all
in check B maps `base-timed-out` to STOP, which `/pharn-loop` records as S11 `blocked: stale-evidence` — a mislabel the
same finding is about; without this, the commonest case (a hang at regress HEAD and again at verify) would end S11
too, because check B reads the regress report before `check-loop.mjs` runs. **`check-loop.mjs` itself is unchanged**:
its existing `unmeasured` predicate is the terminal stop the finding asks for.

### D5 — what the human and the record see

- `render-verify.mjs`: on `INCONCLUSIVE` with `unmeasured_gates`, a "NOT MEASURED" block under the verdict — one
  fenced line per gate (id, then cause), the cause rendered inline only after membership in `UNMEASURED_CAUSES` — and
  one fixed sentence saying an unmeasured gate is neither a pass nor a fail and that a measured red stays in `## Gates`.
- `render-regression.mjs`: a `head_timed_out` line mirroring the existing `base_timed_out` one.
- `render-run-report.mjs` (RUN-REPORT.md, what `/pharn-loop` and `/pharn-ship` summaries print from): verify's
  `unmeasured_gates` and regress's `base_timed_out` / `head_timed_out` as quoted DATA beside the verdict lines.
- `.claude/commands/pharn-loop-close.md` Step 6b: the record's standing-reds line names a gate verify or regress could
  not measure as **not measured**, never as a red (LOOP.md is model-written from that rule).
- **The build brief is NOT changed, and that is deliberate:** a rebuild follows only `CONTINUE`, and `check-loop.mjs`
  never returns `CONTINUE` for an `INCONCLUSIVE` verify or an `inconclusive` regress — and D2/D3 make an unmeasured
  gate win over every red in the same report — so no fix list can carry one. A test pins that path (the finding's own
  reproduction now stops `STOP_TERMINAL`).

### D6 — product command prose (one sentence each, within the byte ceilings)

`pharn-verify.md` reference section (an unmeasured gate → `INCONCLUSIVE` `gate-not-measured`); `pharn-ship.md` Step 2's
`INCONCLUSIVE` examples; `pharn-loop.md` Step 5.4's `STOP_TERMINAL` bullet (an unmeasured gate is one of the
inconclusive verdicts it covers); `pharn-loop-close.md` Step 6b (D5). Each command's `version:` is bumped (patch).
Headroom measured this run: loop 2,430 B, loop-close 3,029 B, ship 2,714 B, verify 1,498 B — no ceiling is raised.

### D7 — every reader of the changed values (L72, grepped this run)

| reader                                                                                                  | reads                                      | effect of this change                                  |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `check-loop.mjs`                                                                                        | verify/regress `.verdict`                  | unchanged code; the new verdicts hit `unmeasured`      |
| `check-loop-decision.mjs`                                                                               | re-runs `check-loop.mjs`                   | unchanged                                              |
| `loop-fresh-core.mjs` B / E                                                                             | `reason_code`; re-derived verdict fields   | B: D4; E: agrees by construction (stamp-only rule)     |
| `stage-verify-core.mjs` `classifyVerdict` / `composeReport`                                             | verdict ↔ exit; checker keys kept in order | unchanged (`INCONCLUSIVE` ↔ 2; new key passes through) |
| `stage-regress.mjs`                                                                                     | `check-regress verdict` output             | unchanged (as for `base-timed-out` today)              |
| `render-verify.mjs`, `render-regression.mjs`, `render-run-report.mjs`                                   | report fields                              | D5                                                     |
| `check-ship.mjs` (dev loop), `/pharn-dev-verify`                                                        | positional map; `.verdict`                 | unchanged — no stamp, so no new verdict reaches them   |
| `ship-outcome-core.mjs`, `render-ship-briefing.mjs`, `check-ship-briefing.mjs`                          | `.verdict` enum                            | unchanged (`INCONCLUSIVE` already a member)            |
| `gate-reuse-core.mjs`, `regress-base-reuse-core.mjs`, `entry-*`, `build-gate*`, `test-results-core.mjs` | `timed_out` / exit ≤ 125                   | unchanged (each already excludes these runs)           |

## Files

- `.dev/features/unmeasured-gates-inconclusive/PLAN.md` — this plan.
- `pharn/floor/gate-run-core.mjs` — EDIT: `UNMEASURED_CAUSES`, `unmeasuredRuns`, `UNMEASURED_CODES`; `gate-not-measured` and `head-timed-out` join `REASON_CODES` (D1, D4).
- `pharn/floor/gate-run-core.test.mjs` — EDIT: `unmeasuredRuns` over every cause and its controls (125, 128+n, reused, no-files); the set relations (L36).
- `pharn/floor/check-verify.mjs` — EDIT: the D2 branch and its header (verdict table, precedence comment, the stamp-surface paragraph).
- `pharn/floor/check-verify.test.mjs` — EDIT: D2 over every cause, the precedence over a red gate / AC ids / INCOMPLETE, the byte-identical controls, and one test that drives the REAL runner (the probe above) into `check-verify` and `check-loop` → `STOP_TERMINAL` `unmeasured`.
- `pharn/floor/check-regress.mjs` — EDIT: D3 and its header lines.
- `pharn/floor/check-regress.test.mjs` — EDIT: head-timed-out rows with the measured-red-base control, both-sides, precedence beside a regression and beside a base-timed-out.
- `pharn/floor/loop-fresh-core.mjs` — EDIT: check B passes `UNMEASURED_CODES` through (D4); its header's check list.
- `pharn/floor/check-loop-fresh.test.mjs` — EDIT: B pass-through for each member of `UNMEASURED_CODES` (reaching FRESH over an otherwise honest fixture), a lapse and a non-lapse control unchanged; timed-out and 127 worlds in the honest-worlds differential.
- `pharn/floor/check-loop.test.mjs` — EDIT: the review's reproduction, rebuilt from `check-verify`'s new output, stops `STOP_TERMINAL` `unmeasured` in the full and quick tables (never `CONTINUE`).
- `pharn/floor/render-verify.mjs` — EDIT: D5's NOT MEASURED block.
- `pharn/floor/render-verify.test.mjs` — EDIT: the block, the closed cause rendering, a hostile id fenced, no block without the key.
- `pharn/floor/render-regression.mjs` — EDIT: the `head_timed_out` line.
- `pharn/floor/render-regression.test.mjs` — EDIT: that line and its absent-key control.
- `pharn/floor/render-run-report.mjs` — EDIT: D5's lines.
- `pharn/floor/render-run-report.test.mjs` — EDIT: those lines and their absent-key controls.
- `pharn/pharn-contracts/verify-report.md` — EDIT: `unmeasured_gates` and `reason_code` `gate-not-measured` in the field table; a short "A gate that was not measured" section (the rule, the precedence, the bound).
- `pharn/pharn-contracts/regression-report.md` — EDIT: `head_timed_out` in the field table; the base-integrity bullet becomes the two-sided rule.
- `pharn/pharn-contracts/gate-run-record.md` — EDIT: the reason-code section names `UNMEASURED_CODES` and check B's pass-through.
- `pharn/pharn-contracts/loop-record.md` — EDIT: the `STOP_TERMINAL` paragraph gains the 6.59.0 sentence (an unmeasured gate now stops `STOP_TERMINAL`; a timed-out base no longer records as S11).
- `.claude/commands/pharn-verify.md` — EDIT: one reference bullet; `version:` 0.6.1.
- `.claude/commands/pharn-ship.md` — EDIT: Step 2's `INCONCLUSIVE` examples; `version:` 0.11.2.
- `.claude/commands/pharn-loop.md` — EDIT: Step 5.4's `STOP_TERMINAL` bullet; `version:` 0.12.1.
- `.claude/commands/pharn-loop-close.md` — EDIT: Step 6b's standing-reds line (D5).
- `.dev/guides/floor-gates.md` — EDIT: the stamp-surface section and the regress base-integrity paragraph.
- `.dev/guides/floor-orchestration.md` — EDIT: the freshness section's check B line.
- `SKILLS_VERSION` — EDIT: 6.59.0.
- `CHANGELOG.md` — EDIT: the 6.59.0 entry (`### Changed`: the three verdict changes, the freshness routing change for `base-timed-out`, the false-green row).
- `README.md` — EDIT: the version badge; the generated region only if `npm run docs:generate` moves it.

### Explicitly not touched

- `pharn/floor/check-loop.mjs` — its table already stops an inconclusive verdict terminally (D4); a test pins it.
- `pharn/floor/run-gates.mjs` — it already records what the verdict needs (`timed_out`, 126/127).
- `pharn/floor/stage-verify.mjs`, `stage-verify-core.mjs`, `stage-regress.mjs` — pass the checker's object through unchanged (D7).
- `pharn/floor/check-ship.mjs`, `.claude/commands/pharn-dev-*.md` — the dev twins type the map; no stamp reaches them (Q4).
- `pharn/floor/stage-agent-core.mjs` and the build brief — unreachable for an unmeasured gate (D5).
- `.claude/commands/pharn-loop-quick.md`, `pharn-ship-close.md`, `pharn-regress.md` — they branch on exits and verdicts this does not rename; their text stays true.
- `.claude/hooks/*`, `.claude/settings*.json`, the four trusted docs, `CODEOWNERS` — not needed (no trusted doc states anything about timeouts — grepped).
- `.dev/memory-bank/lessons-learned.md` — canon; a candidate goes to `/pharn-dev-memory-promote` at GATE 2, never here.

## Contracts satisfied

- `pharn/pharn-contracts/verify-report.md` — the report gains one additive key on one verdict; the `verdict` enum and its four consumers' sets are unchanged.
- `pharn/pharn-contracts/regression-report.md` — `head_timed_out` mirrors `base_timed_out`; the verdict enum is unchanged.
- `pharn/pharn-contracts/gate-run-record.md` — the stamp shape is unchanged; the closed reason-code vocabulary gains two members and one named subset.
- `pharn/pharn-contracts/loop-record.md` — the envelope is unchanged; the `STOP_TERMINAL` meaning paragraph is extended.
- `pharn/pharn-contracts/stage-exit.md` — unchanged: every new verdict is a `done` exit with a report, as `base-timed-out` is today.

## Evals / tests to write (P1)

No Capability changes, so no eval. The tests are listed per file under `## Files`. The property set they range over,
materialized once (L29): every member of `UNMEASURED_CAUSES` × {verify alone, verify beside a measured red, verify
beside an AC id, verify over an incomplete build}; every member of `UNMEASURED_CODES` × check B; HEAD timed out ×
{base 0, base measured red, base timed out}. Each property has a control that keeps today's verdict (L34).

## Guarantee audit (P0)

- "a gate the runner recorded as timed out or as exit 126/127 never yields `PASS` or `FAIL` from `check-verify.mjs --stamp`" → **floor: enum-regex** (set membership over the validated stamp's `timed_out` boolean and exit integer). It holds for the stamp **as recorded**: a stamp is internally consistent, never provenance (L43's bound, unchanged) — a forged stamp with `timed_out: false` reads as before.
- "a timed-out HEAD run over a base that was not a measured red never yields `regressions` or `no-regressions`" → **floor: enum-regex**, same bound.
- "`/pharn-loop` stops terminally instead of iterating on an unmeasured gate" → the DECISION is floor (`check-loop.mjs`'s unchanged enum table + `loop-fresh-core.mjs` B's membership test); obeying it is **advisory** orchestration (the existing two-clocks bound).
- "`unmeasured_gates` / `head_timed_out` name the right gates" → **advisory** shape: derived by tested code from the stamp, read by no floor op, not compared by freshness E (a forged list changes no decision; the verdict beside it is compared).
- "a timed-out gate was a hang" → **not claimed.** `timed_out` means the runner's clock ran out; a slow machine, a too-small `--timeout-ms` or a real hang look the same. The contract says "not measured", never "hung".
- "exit 127 means the gate could not start" → **advisory reading of a convention**: 126/127 are the shell's and the runner's spawn-failure codes; a gate that itself exits 127 on purpose reads as not measured (stated bound, contract).

## Trust audit (P2)

No new untrusted input. Gate ids are attacker-nameable (a `--gates` token, a `structural:` path): every renderer fences
them (`quoteData`/`dataText`), and a cause renders inline only after membership in `UNMEASURED_CAUSES`. No decision
reads `unmeasured_gates` or a gate id's text.

## Determinism audit (P5)

Every new branch is a membership test: `timed_out === true`, `exit ∈ {126, 127}`, `base === 0 || base timed out`,
`code ∈ UNMEASURED_CODES`. No fallback ends in a guess.

## Version

**Minor, 6.59.0.** Shipped floor checkers change verdicts (verify `FAIL`/`PASS` → `INCONCLUSIVE` for an unmeasured gate;
regress `regressions`/`no-regressions` → `inconclusive` for a timed-out head) and a loop stop (`CONTINUE` →
`STOP_TERMINAL`; `base-timed-out` S11 → `STOP_TERMINAL`), with one new report key each and two new reason codes. Not
major: no verdict enum, exit code, stamp schema or record envelope changes, so no install breaks — the 6.52.0–6.57.0
verdict changes were minor too. `MIN_CLI` unchanged: no installed path moves.

## Amended after grill

All five `GRILL.md` concerns are inside the approved intent and are taken here, before the build:

- **G1 (the GATE-1 pin, two halves).** `check-verify.test.mjs` pins it twice: (i) the REAL runner records a
  SIGTERM-trapping gate as `exit 0, timed_out: true` and the resulting stamp reads `INCONCLUSIVE` with that gate listed
  `timed-out` — the injected `instruction-growth` / `reconcile` gates are red in a scratch repo, so this half cannot show
  "was PASS"; (ii) a stamp whose every run exits 0 and one of which carries `timed_out: true` reads `INCONCLUSIVE`, and
  the SAME stamp with `timed_out: false` reads `PASS` — the control that shows the false green is closed.
- **G2 (INCOMPLETE).** Unmeasured beats `INCOMPLETE` too (it is first). The contract states it: over an incomplete build
  a hung or unstartable gate reads `INCONCLUSIVE` (terminal in the loop) where it read `FAIL` (a loop `CONTINUE`);
  `/pharn-ship` Step 2b stays unreachable for it either way. A test row pins it.
- **G3 (the check-B test reaches FRESH).** The pass-through test builds stamps that genuinely produce each coded verdict
  (a timed-out verify run; a timed-out base under a red head; a timed-out head over a green base) and asserts the
  freshness verdict is `FRESH` (exit 0) — not merely that check B did not fire.
- **G4 (the re-run cost).** D4 now states it: a coded report that is also STALE meets checks F/G and is re-run once
  inside the iteration (the existing budget), so a hang can cost one more stage timeout before the terminal stop,
  where `base-timed-out`'s S11 stopped at once. The contract (`gate-run-record.md`) says the same.
- **G5 (base).** The base line above is updated: `8fe73d1`.

## Resolved questions (GATE 1)

Delegated decision by the orchestrating model under the maintainer's 2026-10-13 delegation — every answer (a):
Q1 a signal exit the runner did not cause is a measured FAIL; Q2 `INCONCLUSIVE` wins over a measured red in the same
report, first in the precedence; Q3 regress 126/127 stays out of scope, named as a bound in the contract; Q4 the dev
twins are untouched; Q5 all three codes pass through freshness check B, so every unmeasured case ends `STOP_TERMINAL`
`unmeasured`; Q6 minor, provisional 6.59.0, renumbered by diff before pushing. Added at GATE 1: a test must pin that the
SIGTERM-trapping gate that exits 0 with `timed_out: true` is now `INCONCLUSIVE`, not `PASS` (it is the probe's first
row, driven through the real runner), and the CHANGELOG entry says so. A parallel PR (`stage-load-budget`) may add
`.dev/floor/stage-load-budget.test.mjs`; if a command sentence here trips it after merging `origin/main`, the row it
names is added then.

## Open questions (HALT) — each with the recommended answer (all resolved above)

- **Q1 — a signal exit (≥ 128) the runner did not cause:** (a) **recommended** — a measured FAIL (D1: a segfault, abort or OOM kill is the code under test failing, and the runner records nothing for a harness signal); (b) unmeasured too.
- **Q2 — an unmeasured gate beside a measured red gate:** (a) **recommended** — `INCONCLUSIVE` wins, the reds stay in `gates` (D2's four reasons); (b) `FAIL` wins with a separate `unmeasured_gates`, and `check-loop.mjs` learns to read that list on a FAIL (grows its input set and freshness E's compared fields).
- **Q3 — regress 126/127:** (a) **recommended** — out of scope: the finding names only the timed-out asymmetry, and at regress both sides' exits are compared (a 127 at both is `pre_existing`; a head-only 127 after a build that removed a binary is a real regression); (b) treat a head 126/127 like a timed-out head.
- **Q4 — the dev twins (`/pharn-dev-verify`, `check-ship.mjs`):** (a) **recommended** — untouched: they type a positional map, which carries no `timed_out` and stays byte-identical; (b) apply the 126/127 rule to the positional map too.
- **Q5 — freshness routing (D4):** (a) **recommended** — pass all three codes through check B, so `base-timed-out` moves from S11 `blocked: stale-evidence` to `STOP_TERMINAL` `unmeasured` (a label change on a stop that already happens); (b) mirror `base-timed-out` exactly (`head-timed-out` → S11 too, verify carries no `reason_code`), which leaves the commonest hang ending S11, because check B stops on the regress report's code before `check-loop.mjs` is ever read.
- **Q6 — bump size:** (a) **recommended** — minor 6.59.0 (`## Version`); (b) patch.
