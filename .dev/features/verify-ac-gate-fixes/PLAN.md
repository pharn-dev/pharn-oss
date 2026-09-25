# PLAN — verify-ac-gate-fixes

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L27, L29, L41, L50, L52]
- increment: fix three verified review findings about `/pharn-verify` under the 6.20.0 AC gate — INCOMPLETE is unreachable under `--ac-gate`, piped verdict JSON is cut at 64 KiB, and Step 3a still recommends the `--gates` form the AC gate now reads as changed test infrastructure — as ONE patch increment (6.20.4)
- layer(s): product floor (`pharn/floor/`), pharn-contracts (`verify-report.md`, `ac-tests.md`), product commands (`pharn-verify`, `pharn-ship`), repo-meta (CLAUDE.md, CHANGELOG, README badge, SKILLS_VERSION)
- constitution_refs: [P0, P3, P4, P5, P6, P7]

## Why (the three findings, each CONFIRMED by a repro this run's orchestrator holds)

1. **INCOMPLETE is unreachable under `--ac-gate`** (`pharn/floor/check-verify.mjs:333-357` at 137abd3). The AC
   gate's failing ids are pushed into `failing` BEFORE the completeness branch, so any `ac-delivery` reason makes the
   verdict FAIL, and an unmeasurable AC gate makes it INCONCLUSIVE, before INCOMPLETE is ever considered.
   `/pharn-verify` Step 5 ALWAYS passes `--ac-gate`. A partly built `spec_kind: test-infra` feature (`lint` 0, the
   `test` script not written yet, `aux.completeness` 1) therefore reads `FAIL ["ac-delivery"]` (AC-1 `ac-untested`,
   "the runner is not delivered yet") instead of INCOMPLETE, and `/pharn-ship` Step 2b's single bounded rebuild —
   reachable only from `INCOMPLETE` — cannot fire. `pharn-verify.md` Step 3d itself warns that an unreachable
   INCOMPLETE disables Step 2b. The precedence comment (`:322-329`) was not updated in 6.20.0, and the only
   reachability test (`check-verify.test.mjs` "INCOMPLETE stays REACHABLE through the stamp path") runs WITHOUT
   `--ac-gate`. Repro: the review's `angleC/incomplete.mjs`.
2. **Piped stdout is cut at 64 KiB** (`check-verify.mjs:130`). `emit()` calls `console.log` and then
   `process.exit(code)` at once; on macOS a piped stdout is asynchronous, so everything past the pipe buffer is
   dropped at exit. The 6.20.0 `ac_gate` block is unbounded (every matched test id per AC), and
   `check-loop-fresh.mjs` check E re-runs `check-verify.mjs --ac-gate` through `spawnSync` (a pipe) and
   `JSON.parse`s stdout → unusable → exit 2 INCONCLUSIVE → `/pharn-loop` S11 on every iteration and at the commit
   gate. Measured by the review: 12 ACs × 40 parametrized AC tests = 75,785 bytes to a file, 65,536 through a pipe.
3. **Step 3a still ranks an explicit `--gates` first and tells a PHARN dogfood run to pass it**
   (`.claude/commands/pharn-verify.md:196`, `:207-210`, `:259-260`; remedy `:404-406`). Since 6.20.0 the AC gate
   counts a level gate only when it ran as the discovered `npm run <id>` (`ac-gate-core.mjs` `ranAsPinned`: stamp
   `source` must be `discover`). So with `--gates` a test-first feature reads `test-infra-changed` — an EVIDENCE
   reason, verify `FAIL ["ac-evidence"]`, `/pharn-loop`'s terminal S13 — and a bootstrap feature reads `ac-untested`
   ("the runner is not delivered yet") for every AC. The Step 5 remedy (set the build aside, re-run `/pharn-test`)
   cannot help; re-running `/pharn-verify` WITHOUT `--gates` would. The checker behaviour is intended and pinned
   (`ac-gate-core.test.mjs` "test-infra-changed — … explicit --gates, grill G4"; `ac-tests.md` table row) — the
   COMMAND is what is wrong.

## Design decisions

### D1 — the new verdict precedence under `--ac-gate` (finding 1)

`check-verify.mjs` computes, in this order (first match decides; each step names why it sits where it does):

1. **any real gate red → FAIL** (`failing_gates` = the red gates, plus `ac-delivery` / `ac-evidence` when the AC gate
   has them — unchanged). A real failure beats incompleteness, as before, so `/pharn-ship` never rebuilds over a real
   bug.
2. **else any AC EVIDENCE reason → FAIL** (`ac-evidence`, plus `ac-delivery` if also present — unchanged). Evidence
   taken before the build cannot be restored by a rebuild, so it must beat INCOMPLETE; a rebuild here would be the
   blind retry the precedence exists to prevent.
3. **else completeness `incomplete` → INCOMPLETE** (exit 3, `failing_gates: []`, the `ac_gate` block KEPT in the
   report) — **NEW position.** It now beats an AC gate that is red for DELIVERY reasons only (`ac-untested`,
   `ac-not-passed`, `ac-skipped`) AND an AC gate that is UNMEASURABLE (item 01's record reasons, or an unusable
   SPEC). Rationale: over a partial tree, "not delivered yet" and "could not measure" are the expected readings of
   an unfinished build (the runner, its reporter config or the code under test may be among the missing `## Files`),
   the missing paths are a measured, named fact, and INCOMPLETE is never a green stop — `/pharn-ship` Step 2b's
   retry re-runs `/pharn-verify`, which re-measures the AC gate from scratch, and proceeds only on `PASS`.
4. else any AC DELIVERY reason → FAIL `["ac-delivery"]` (unchanged).
5. else the AC gate unmeasurable → INCONCLUSIVE, exit 2, no `reason_code` (unchanged).
6. else completeness `inconclusive` → INCONCLUSIVE (unchanged).
7. else PASS (unchanged).

**The AC-INCONCLUSIVE + incomplete case, decided deliberately: INCOMPLETE** (step 3 above). The alternative —
keep INCONCLUSIVE winning (fail-closed first) — was weighed and rejected: it leaves the SAME Step-2b dead end for a
test-infra feature whose `testResults` is configured but whose reporter config is still one of the missing files
(the record is then `results-unavailable`, an unmeasured reason, not `not-configured`, which is delivery). Cost of the
choice, stated: an unmeasurable AC gate whose cause a rebuild cannot fix (one flaky test voiding the record) costs
ONE bounded rebuild in `/pharn-ship` (≤1, structural) or one loop iteration (under the cap) before the re-verify —
now over a complete tree — reports INCONCLUSIVE and stops. It never reaches PASS: INCOMPLETE is not a green verdict,
and `check-loop.mjs` / `/pharn-ship` proceed only on PASS. **Resolved at GATE 1 (delegated, 2026-09-25): option
A.** The orchestrator's reasoning, recorded verbatim in substance: INCOMPLETE is never green; it spends at most one
bounded rebuild or loop iteration before the re-measured verdict stands; and it removes the bootstrap dead end.
Option B (INCONCLUSIVE keeps winning over incompleteness; only delivery-only reds yield to INCOMPLETE) was rejected.

**Without `--ac-gate` the output is byte-identical** (no `ac_gate`, so steps 2–5 are dead): the existing fixture set
and the EQUIVALENCE test keep asserting that.

### D2 — flush stdout before the process ends (finding 2)

`emit()` sets `process.exitCode = code` and unwinds with a module-private sentinel (`throw EMITTED`) that a
top-level `try { main() } catch (e) { if (e !== EMITTED) throw e; }` swallows; the process then ends naturally,
after Node has drained stdout. Chosen over `return emit(…)` at every call site because `emit` is called from nested
functions (`check-regress.mjs` `runScope` / `runVerdict`), and a forgotten `return` would fall through and emit a
second document — the sentinel keeps "emit never returns" true by construction. A genuine exception still escapes
(re-thrown), so a crash still exits non-zero with its stack, exactly as before. The `process.exit(main(argv))`
CLIs become `process.exitCode = main(argv)`.

**Measured before the build, not assumed** (grill, `.pharn/pharn-dev-grill/epipe-probe.mjs`, darwin, Node 24.13.1):
a child writing 300,001 bytes then calling `process.exit(3)` delivered **65,536** bytes through a pipe;
`process.exitCode = 3` delivered all **300,001**. With the read end destroyed after the first chunk, both still exit
**3** with empty stderr (3/3 runs), so ending naturally does not turn a reader's early close into a crash exit.

**What the tests can and cannot prove (grill findings 1–2).** CI runs `ubuntu-latest`, where Node documents piped
stdout as synchronous, so there the old pattern may not truncate at all and a pipe round-trip would stay green with
the defect restored. The pipe tests therefore MEASURE their own negative control (a `process.exit` child through
the same pipe) and report whether this platform truncates; the fixed CLI must parse whole either way. The
platform-independent regression guard is the static pin: no code line (comment lines skipped, grill finding 4) in
the four sources calls `process.exit(`. **Crash induction for GATE-1 condition 1:** no CLI in the set has a natural
input that throws inside `main()`, so the test preloads `--import data:text/javascript,…` that makes `console.log`
throw — probed: `check-loop.mjs` then exits **1** with the stack on stderr; after the fix every CLI in the set must
do the same, with no JSON on stdout.

**The set (L29 — the enumeration is the deliverable):** the floor CLIs whose stdout a FLOOR `spawnSync` caller
PARSES for a decision, plus the one the review named:

| CLI                             | parsed by                                                                 | why it is in the set                                |
| ------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `pharn/floor/check-verify.mjs`  | `check-loop-fresh.mjs` check E (`JSON.parse`)                             | the recorded failure — `ac_gate` is unbounded       |
| `pharn/floor/check-regress.mjs` | `check-loop-fresh.mjs` check E (`JSON.parse`)                             | same `emit` pattern; `gates` maps grow with the set |
| `pharn/floor/check-loop.mjs`    | `check-loop-decision.mjs` (`JSON.parse`)                                  | same `emit` pattern (output bounded today)          |
| `pharn/floor/check-red-run.mjs` | `/pharn-test` reads its lines; `--verdict` lists every failed test per AC | named by the review; same `process.exit(main())`    |

**Deliberately NOT in the set, each with its reason (stated, not silent):** `check-test-stage.mjs`,
`check-ac-tests.mjs`, `ac-tests-lock.mjs`, `check-spec*.mjs`, `check-plan-*.mjs` — their spawners branch on the EXIT
STATUS and at most the FIRST line (`check-loop-fresh.mjs` check I reads `lines[0]`), which a 64 KiB cut cannot reach,
or their output is a single short line (`check-spec.mjs --hash`). The exit status is unaffected by the cut.
Converting every floor CLI would be an addition with no triggering failure (P7); a later caller that starts parsing
one of them owes it the same change (the bound is named in the new test's header).

**`spawnSync`'s default `maxBuffer` (1 MiB) on the consuming side: NOT raised, decided.** Above it `spawnSync` kills
the child and sets `r.error` (`ENOBUFS`); `check-loop-fresh.mjs` `rerunChecker` already maps `r.error` to
`unusable` → exit 2 INCONCLUSIVE with a message naming the checker — fail-closed and named, never a silent pass. At
the review's measured ~158 bytes per matched test id, 1 MiB is ~6,600 AC tests in one feature; no run has come near
it (P7). And group D is editing `check-loop-fresh.mjs` in parallel, so this increment does not touch it. The bound is
stated in the CHANGELOG entry and in the new test's header.

### D3 — `/pharn-verify` Step 3a and the remedy (finding 3)

- Step 3a item 1 keeps `--gates` in the fixed rule (it is `/pharn-regress`'s rule too, P3) but no longer calls it
  the preferred form, and states the interaction: for a feature with AC evidence — a test-first or `spec_kind:
test-infra` SPEC, i.e. every templated SPEC — a level gate (`test`, `test:e2e`, `e2e`) counts only when it ran as
  the discovered `npm run <id>`, so an explicit `--gates` makes the AC gate read `test-infra-changed` (test-first:
  evidence → FAIL `ac-evidence`, `/pharn-loop` S13) or `ac-untested` for every AC (bootstrap). **Do not pass
  `--gates` for such a feature**; discovery covers it, because `/pharn-test`'s red-run preflight already required
  the level scripts to exist. `--gates` stays available for a legacy SPEC or a project with no allowlisted script.
- The PHARN-dogfood sentence no longer tells a dogfood run to pass `--gates`: PHARN's `package.json` exposes
  allowlisted scripts, so discovery applies.
- 3c Step 1's "if 3a resolved to explicit gates, `--gates`" gains the same exception.
- Step 5's evidence-remedy bullet gains a per-branch remedy (L27): a `test-infra-changed` whose detail says the gate
  "did not run as the pinned `npm run <id>`" because the stamp's source is explicit is THIS stage's own `--gates`,
  and the remedy is to re-run `/pharn-verify` without it — the set-the-build-aside remedy stays for every other
  evidence reason.
- **A small checker change makes the reason self-explanatory without weakening it** (`ac-gate-core.mjs`): the
  test-first `test-infra-changed` detail names the cause it can see — `the stamp's gate source is "explicit" (an
explicit --gates run) — re-run /pharn-verify without --gates` when `stamp.source !== "discover"`, else the
  argv/shell cause — and the bootstrap `ac-untested` detail, when a level gate DID run but not as discovered, says
  so instead of "the runner is not delivered yet". **Reasons, classes and verdicts are unchanged** — only the
  free-text `detail` (untrusted-DATA class, never read by a decision) moves. `stamp.source` is an enum
  `validateStamp` already checked; no argv string is echoed.

## Applied lessons

- L27 — the ac-evidence remedy ("set the build aside and re-run /pharn-test") is a SHARED remedy printed for every
  evidence reason, and it is unreachable for the `--gates` branch of `test-infra-changed`; this plan gives that
  branch its own remedy in the command AND in the checker's detail, and the test asserts the explicit-source detail
  is present for the explicit branch and ABSENT for the argv/shell branch (present-here-and-absent-there, not merely
  present).
- L29 — the reachability rule is quantified over a set (AC class × completeness × real-gate state), so the
  deliverable is ONE materialized table that the test iterates (every `{none, delivery, evidence, unmeasured}` ×
  `{complete, incomplete, inconclusive}` × `{real gate green, red}` cell with its expected verdict and
  `failing_gates`), not a test for the one cell the finding named; the flush CLIs are likewise ONE enumerated set.
- L41 — every `--ac-gate` fixture (`stampOf` in `ac-gate-core.test.mjs`) hard-codes `aux.completeness: 0`, so the
  incomplete path under `--ac-gate` was exercised by nothing; the fixture gains a `complete` parameter and the matrix
  drives all three values.
- L50 — the precedence claim has cites on several surfaces; the sweep goes by REFERENT (every cite of
  `check-verify.mjs`'s precedence / "INCOMPLETE is reachable only when…" and every `--gates` recommendation), not by
  one phrase. Enumerated and classified in "Sweep" below.
- L52 — the prescribed test is written for the MEMBER the finding is about: the incomplete bootstrap feature with
  `--ac-gate` (the `angleC` repro, turned into a test) and the >64 KiB `--ac-gate` report through a pipe (the
  `repro-big-acgate` shape), not only a generic large map.

## Sweep (L50) — every cite of the two referents, classified

`git grep` over the whole tree minus `.dev/features/`, `pharn/features/` and CHANGELOG (released sections are frozen).

- **Precedence / INCOMPLETE reachability** — CHANGE: `pharn/floor/check-verify.mjs` (header table + `--ac-gate`
  section + inline precedence comment), `pharn/pharn-contracts/verify-report.md` (`ac_gate` "How it reaches the
  verdict"), `pharn/pharn-contracts/ac-tests.md` (the three-classes paragraph), `.claude/commands/pharn-verify.md`
  (Step 3d last bullet, Step 5 exit-code paragraph + AC bullets, the completeness guarantee-audit bullet),
  `.claude/commands/pharn-ship.md` (step-7 verdict read, Step 2b opening, "Bounded firing"), `CLAUDE.md` (the AC GATE
  comment block). STILL TRUE, unchanged (they state that completeness is not a GATE, which this plan keeps):
  `pharn/floor/gate-run-core.mjs:47-50`, `pharn/floor/run-gates.mjs:582`, `pharn/pharn-contracts/gate-run-record.md:115-117`,
  `.claude/commands/pharn-loop.md:362-364` and `:432`, `CLAUDE.md:279-281`, `README.md:244`, `check-loop.mjs` (reads
  only `verdict`, and `failing_gates` on FAIL). The trusted docs carry no `INCOMPLETE` / `ac-delivery` cite (grepped).
- **`--gates` recommended for verify** — CHANGE: `pharn-verify.md:196`, `:207-210`, `:259-260`, Step 5 remedy. STILL
  TRUE: `pharn-verify.md:224` (regress), `:476`, `:580`, `:626` (describe the rule, recommend nothing),
  `pharn-ship.md:301` (the BUILD gate, which the AC gate never reads), `README.md:482` (regress),
  `pharn-loop.md:213` (S4). The trusted docs carry no `--gates` cite (grepped).

## Files

- `pharn/floor/check-verify.mjs` — D1 precedence (INCOMPLETE after real-gate and evidence reds, before delivery / unmeasured AC reds), the header and inline precedence comments, D2 flush — layer product floor
- `pharn/floor/check-regress.mjs` — D2 flush (sentinel emit) — layer product floor
- `pharn/floor/check-loop.mjs` — D2 flush (sentinel emit) — layer product floor
- `pharn/floor/check-red-run.mjs` — D2 flush (`process.exitCode = main(argv)`) — layer product floor
- `pharn/floor/ac-gate-core.mjs` — D3 detail strings naming the explicit gate source (reasons unchanged) — layer product floor
- `pharn/floor/ac-gate-core.test.mjs` — the D1 matrix with `--ac-gate` (incl. the bootstrap repro), the >64 KiB `--ac-gate` pipe test, the D3 detail tests — test (does not ship)
- `pharn/floor/cli-stdout-flush.test.mjs` — NEW: the D2 enumeration — no `process.exit(` on a code line of the set's sources, the crash-stays-a-crash preload case, and a >64 KiB pipe round-trip for `check-verify` (positional map) and `check-regress` (`verdict`) — test (does not ship)
- `.claude/commands/pharn-verify.md` — D3 (Step 3a, dogfood note, 3c Step 1, Step 5 remedy) and the D1 cites (Step 3d, Step 5, guarantee audit) — layer product command
- `.claude/commands/pharn-ship.md` — D1 cites (step-7 verdict read, Step 2b opening, "Bounded firing") — layer product command
- `pharn/pharn-contracts/verify-report.md` — D1 in the `ac_gate` section — layer pharn-contracts
- `pharn/pharn-contracts/ac-tests.md` — D1 in the three-classes paragraph; the `--gates` cause of `test-infra-changed` — layer pharn-contracts
- `CLAUDE.md` — the AC GATE comment block gains the incomplete-build case — repo-meta
- `SKILLS_VERSION` — 6.20.3 → 6.20.4 — repo-meta
- `CHANGELOG.md` — new `## [6.20.4] - 2026-09-25` section above `[6.20.3]` (the actual date, per the GATE-1 addendum) — repo-meta
- `README.md` — the shields badge → 6.20.4 (`check:badge`) — repo-meta

### Not touched (deliberately)

- `pharn/floor/check-loop-fresh.mjs` — no `maxBuffer` change (D2); group D edits it in parallel.
- `pharn/floor/check-verify.test.mjs` — its flag-less and stamp tests stay as the byte-identity guard; the `--ac-gate` cells live beside the AC world in `ac-gate-core.test.mjs`.
- The four trusted docs — no cite of either referent (grepped); no PROTECTED-FOLLOWUPS needed.

## Contracts satisfied

- `pharn/pharn-contracts/verify-report.md` — the four-value `verdict` enum and the `failing_gates` / `ac_gate` shapes are unchanged; only WHICH verdict a given input yields moves (INCOMPLETE now also carries an `ac_gate` that is FAIL-by-delivery or INCONCLUSIVE). No consumer reads `ac_gate` for a decision except `check-loop-fresh.mjs` E, which re-derives it.
- `pharn/pharn-contracts/ac-tests.md` "The AC gate" — reasons, classes and the partition unchanged (closure tests untouched).
- `pharn/pharn-contracts/gate-run-record.md` — completeness stays `aux`, never a gate.

## Evals to write (P1)

No Capability is added or changed (no `role:` file), so no eval pair is owed. The floor changes are covered by
`node --test` cases:

- D1 matrix (`ac-gate-core.test.mjs`) → every cell of AC class × completeness × real-gate state → its verdict, exit, `failing_gates`, and that `ac_gate` is present.
- D1 bootstrap repro → `lint`-only head run, `aux.completeness` 1, `--ac-gate` → INCOMPLETE exit 3 (was FAIL `["ac-delivery"]`).
- D2 (`ac-gate-core.test.mjs`) → 12 ACs × 40 parametrized tests, `--ac-gate`, `spawnSync` pipe → stdout > 64 KiB and `JSON.parse` succeeds, verdict PASS.
- D2 (`cli-stdout-flush.test.mjs`) → no CODE line (comment lines skipped) in the set's sources calls `process.exit(`; `check-verify` positional map and `check-regress verdict` with thousands of gates → > 64 KiB parsed whole through a pipe, beside a MEASURED negative control (a `process.exit` child through the same pipe, reported, never asserted to truncate — Linux pipes may be synchronous); every CLI in the set, with a `--import data:` preload making `console.log` throw, exits non-zero with the stack and no JSON (GATE-1 condition 1).
- D3 (`ac-gate-core.test.mjs`) → explicit source: detail names `--gates` (test-first `test-infra-changed`, bootstrap `ac-untested`); argv/shell cause: detail does NOT name it; reasons unchanged.

## Guarantee audit (P0)

- "Over an incomplete build with no real gate red and no AC evidence red, verify reads INCOMPLETE" → floor: enum-regex (integer/enum precedence in `check-verify.mjs`, tested). That `/pharn-ship` then fires Step 2b is command orchestration → advisory (unchanged).
- "INCOMPLETE never reaches a green stop" → floor: `check-loop.mjs` / `/pharn-ship` step-7 read only `PASS` as proceed (enum membership, unchanged).
- "No CLI in the set ends through `process.exit(`" → floor: enum-regex (the static pin over the four sources' code lines). That is the floor claim, and it is a PROXY for the property that matters.
- "Verdict JSON reaches a piped consumer whole" → tested behaviour, not floor: a >64 KiB pipe round-trip for `check-verify` (positional map and `--ac-gate`) and `check-regress`, discriminating only on a platform whose piped stdout is asynchronous (darwin measured; CI's Linux may not truncate at all). `check-loop` and `check-red-run` rest on the static proxy alone. NOT claimed for any other floor CLI — the set is a presence set, so a future caller that starts parsing another CLI's stdout is not detected (L36) — and not beyond `spawnSync`'s 1 MiB `maxBuffer` (fail-closed there, named).
- "A crash stays a crash" (GATE-1 condition 1) → tested behaviour: the `--import` preload case per CLI in the set.
- One-time upgrade cost, stated (grill finding 6): a `/pharn-loop` run that straddles the upgrade — a verify report written by 6.20.3, re-derived by 6.20.4 at `check-loop-fresh.mjs` check E — can stop with `report-verdict-mismatch` (S11) where the verdict or an `ac_gate` detail moved. Re-running `/pharn-verify` clears it. Named in the CHANGELOG.
- "An explicit `--gates` reads as changed test infrastructure" → floor (existing `ranAsPinned`, unchanged). The command's advice to not pass it is advisory prose; the detail naming the cause is free text (advisory).
- Nothing here is called a guarantee without one of the above.

## Trust audit (P2)

- The `ac_gate` block's test ids / titles / details remain untrusted DATA; D3 adds only `stamp.source` (an enum `validateStamp` checked) and a fixed sentence to `detail`, never an argv string or test title. No decision reads `detail`.
- No new input is ingested.

## Determinism audit (P5)

- The new precedence branches on integer completeness status and set membership of reason strings in `EVIDENCE_REASONS` / `DELIVERY_REASONS` — membership tests, no classification.
- D3's detail branch is `stamp.source === "discover"` (enum equality).

## Version

Patch — **6.20.4**: corrections to bytes that already shipped (a verdict precedence, a stdout flush, command prose, a
detail string); no new capability, no shape change. `MIN_CLI` untouched (no installed path moves).

## GATE 1 — approved under delegation, with four build conditions

Approved by the orchestrator (the session that spawned this run), acting under the user's delegation of both human
gates (2026-09-24: _"fix all findings … each fix needs to be fixed by using pharn-dev-ship command and needs to ends by
merged pull request. you merge pull requests when the CI are green."_). This is a model decision made under that
delegation, recorded as such — not a human approval. D1 option A, as above. The conditions, each a build obligation:

1. The sentinel exit swallows ONLY the module-private sentinel. Any other throw still propagates and exits non-zero —
   a crash stays a crash, because callers (`check-loop-fresh.mjs`, `check-test-stage.mjs`) read a crash's exit. A
   test proves it (`cli-stdout-flush.test.mjs`: a real throw inside `main()` still exits non-zero with its stack).
2. Flag-less `check-verify.mjs` output stays byte-identical: the existing EQUIVALENCE and flag-less tests stay green,
   and VERIFY.md says so.
3. `--ac-gate` with a stamp that has a RED real gate AND an incomplete build is still FAIL — a matrix cell, asserted.
4. `pharn/floor/check-loop-fresh.mjs` is not touched (group D owns it) — already in "Not touched".

## Open questions (HALT)

None — the one open question (D1 option A vs B) was resolved at GATE 1, above.
