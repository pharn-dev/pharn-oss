# PLAN — loop-fresh-integrity

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L1, L29, L35, L43, L45, L50, L52, L58]
- increment: Fix two verified review findings in /pharn-loop's freshness checker — check E stops comparing a verify report's verdict over a moved tree (a forged PASS is "refreshed" instead of stopped), and check-test-stage reports a crashed child as a RED (routed to S13 instead of S11).
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (two contract sentences), repo meta (CLAUDE.md, CHANGELOG, SKILLS_VERSION, README badge)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Trigger (P7 — two verified review findings, both reproduced live on this tree at 137abd3)

1. **`pharn/floor/check-loop-fresh.mjs` check E (`checkE`, the `treeMoved ? STAMP_ONLY_FIELDS : COMPARED_FIELDS.verify` loop).**
   Since 6.20.0, when the live tree is not the verify stamp's, E compares only `gates` (`STAMP_ONLY_FIELDS`). c06ba64
   (6.19.0) compared `verdict`, `failing_gates` and `gates` unconditionally. Reproduced with the review's
   `angleB/repro/e-forged-verdict.mjs` against this worktree: an honest report `FAIL ["ac-delivery","test"]` forged
   to `PASS []` reads `STOP report-verdict-mismatch` over the unmoved tree, but after one edit to `a.txt` it reads
   `RERUN tree-moved-since-verify` (iteration — the re-run overwrites the forged report, so the forgery is never
   named) and `STOP tree-moved-since-verify` at `--commit-gate`. The module header still claims "a forged report
   STOPS the run instead of being 'refreshed'" and "a fabricated verdict stops the run (B / E)", and
   `pharn-loop.md`'s guarantee audit claims "A report that DROPS `reconcile` from `failing_gates` is a
   `report-verdict-mismatch` stop" — all three false over a moved tree today. The narrowing's stated reason (the AC
   gate reads the LIVE tree) covers only the AC-derived part of the report.
2. **`pharn/floor/check-test-stage.mjs` `fromLock` (status 1 → `RED lock-red`) and the full-mapping branch
   (status 1|2 → `RED mapping-red`).** A crashed child (uncaught throw or module-load failure → node exit 1) is
   reported as that RED with exit 1 (the header admits it: "a crash … reads as that RED"), and check-loop-fresh's
   check I routes an exit-1 `RED` token to STOP `ac-evidence-invalid` (/pharn-loop S13 — "set the build aside and
   re-run /pharn-test"), contradicting check I's own comment (REVIEW finding 5), check-loop-fresh's header and
   CHANGELOG [6.20.0] ("a crash or exit 2 stays front-stage-red"). Reproduced with the review's
   `v4verifier/v4b.mjs`: a `test-infra-core.mjs` that throws at load, or is missing, gives
   `exit=1 RED lock-red` → `ac-evidence-invalid (S13)`.

## Applied lessons

- **L58** — the fix IS L58's split. The verify report's referent has two parts: the stamp (fixed when the report was
  written) and the live tree the AC gate reads (may still change). Over a moved tree, E compares the stamp-derived
  part exactly — `gates`, `failing_gates` minus the AC ids, and the verdict's composition rule — and defers only the
  live-tree part (the AC ids, the `ac_gate` block, an unmeasurable AC gate's INCONCLUSIVE) to F. The split is named
  in the module header and in `verify-report.md`.
- **L43** — E still certifies AGREEMENT between the report, the stamp and the tree, never provenance: a
  self-consistent forged stamp passes, and the header keeps saying so. The new comparison does not claim more.
- **L35** — the AC ids are imported from where they are defined (`ac-gate-core.mjs` `FAILING_IDS`), never restated;
  `gate-run-core.mjs` `RESERVED_IDS` cannot be subtracted wholesale because it also holds `reconcile`, a real verify
  gate. `STAMP_ONLY_FIELDS` is retired, not kept beside the new rule as a second, now-wrong statement of it.
- **L29** — both fixes are quantified over sets, and the enumerations are the deliverable: the moved-tree forgeries
  are one array (verdict flip, a dropped gate id, a dropped `reconcile`, an AC id substituted for a gate id, PASS over
  an INCOMPLETE stamp, PASS with a non-empty `failing_gates`) iterated in BOTH modes; the crash cases cover BOTH
  child branches (lock, mapping) and both crash kinds (throw at load, module missing, runtime throw).
- **L52** — each test names the member it covers: the lock branch AND the mapping branch each get a crash test, and a
  closure test ranges over EVERY `return 1` site in both children (each must print its `RED —` line first), so the
  convention the crash detection rests on is pinned for the whole set, not the one path the repro hit.
- **L45** — the production path is the pinned /pharn-loop invocation, so both fixes are also exercised through the
  EXECUTED pinned decision and commit-gate lines (the existing ★ WIRING fixtures): a forged report over a moved tree
  must STOP there, and a child crash inside check-test-stage must stay `front-stage-red` there.
- **L50** — the sweep is by REFERENT (E's moved-tree comparison; check-test-stage's crash exit), not by the claim's
  wording. Every cite found: check-loop-fresh.mjs header rows E/I, the ORDER paragraph, the HONEST SCOPE bullet,
  the `STAMP_ONLY_FIELDS` doc comment and the checkE comment; check-test-stage.mjs header (OUTPUT paragraph);
  `pharn/pharn-contracts/verify-report.md` (the `gate_run` bound bullet: "over a moved tree only `gates` is
  compared"); `pharn/pharn-contracts/ac-tests.md` ("exit 2 is unusable input"); `CLAUDE.md` (THE AC GATE block:
  "`gates` alone is still compared"; THE TEST-STAGE GATE exit line); `check-loop-fresh.test.mjs`'s `FLOOR_MODULES`
  doc comment ("crashes a shelled child, which the caller reads as an ordinary RED"); `pharn-loop.md`'s reconcile
  audit bullet (restored true by fix 1 — no edit). Not edited, deliberately: CHANGELOG [6.20.0] (frozen — the new
  entry states the correction) and `.dev/features/verify-ac-gate/BUILD.md` (a historical build record). Trusted
  docs: `ARCHITECTURE.md` §6 and `LIMITS.md §9` cite check-test-stage but make no claim either fix changes — no
  protected follow-up.
- **L1** — the meta-docs this increment invalidates are in `## Files`: `CLAUDE.md`, `CHANGELOG.md`,
  `SKILLS_VERSION`, the README badge.

## Design

### Fix 1 — check E over a moved tree compares the stamp-derived part

`checkE` computes `treeMoved` FIRST, then spawns `check-verify.mjs --stamp <verify stamp> --feature <name>` ONCE:
with `--ac-gate` when the tree is unmoved (today's behaviour, byte-identical: every field in
`COMPARED_FIELDS.verify` compared), WITHOUT it when the tree moved. The flag-less run reads nothing but the stamp
(its gates and `aux.completeness`), so its output is a pure function of the stamp, and a new exported pure function
compares the report to it:

```js
/** The failing ids the AC gate adds — the one part of verify's failing_gates that reads the live tree. */
export const AC_FAILING_IDS = Object.freeze(Object.values(FAILING_IDS).sort()); // from ./ac-gate-core.mjs

/** Over a MOVED tree: the first field whose stamp-derived part disagrees with `stampOnly` (check-verify.mjs --stamp
 *  WITHOUT --ac-gate), or null. check-verify's composition, restated as a relation: failing_gates = the gate
 *  offenders ∪ AC ids; FAIL iff failing_gates is non-empty; else an unmeasurable AC gate → INCONCLUSIVE; else the
 *  stamp-only verdict. */
export function stampDerivedMismatch(report, stampOnly) {
  // gates: equal · failing_gates: an array, and minus AC_FAILING_IDS equal to stampOnly.failing_gates ·
  // verdict: FAIL when any gate or AC id fails, else ∈ {stampOnly.verdict, "INCONCLUSIVE"}
}
```

So over a moved tree a report can differ from the stamp only where the live tree legitimately decides: WHICH AC ids
it names, and whether the AC gate was unmeasurable. Everything else is a fabrication and STOPs
`report-verdict-mismatch` in both modes, before F. The repro's forgery (`PASS []` over a stamp with `test` exit 1)
fails the `failing_gates` part. An honest report over a moved tree still passes E and RERUNs at F.

**Merge-order compatibility (GATE 1 correction 2).** Group C, in parallel, changes check-verify's `--ac-gate`
precedence: a real gate red and an `ac-evidence` red still FAIL first, but INCOMPLETE now outranks an AC gate that is
red only for DELIVERY reasons, or that could not measure — and in those INCOMPLETE cases `failing_gates` is `[]`. The
relation above accepts BOTH semantics, so either PR can merge first: with no failing id at all the verdict may be the
stamp-only verdict (INCOMPLETE — group C) or INCONCLUSIVE (the old unmeasurable case), and with an AC id present it
must be FAIL (the old delivery case). Explicit `stampDerivedMismatch` tests pin the four readings over a stamp whose
flag-less verdict is INCOMPLETE: `INCOMPLETE []` consistent, `FAIL ["ac-delivery"]` consistent, `INCONCLUSIVE []`
consistent, `PASS []` a mismatch (→ STOP).

**Spawn change, stated for the merge order:** the E spawn's argv becomes conditional (`--ac-gate` only when the tree
is unmoved); `rerunChecker` itself is untouched (GATE 1 correction 3). Group C may change `rerunChecker`'s spawn
options (maxBuffer) — the two edits touch different lines of `checkE`/`rerunChecker`, so a rebase conflict, if any,
is textual.

`STAMP_ONLY_FIELDS` is removed (L35); its ✧ assertion becomes one over `AC_FAILING_IDS` (equals
`Object.values(FAILING_IDS)` sorted, every member in `RESERVED_IDS`, `reconcile` not a member).

**The residual, stated (P0):** a forgery confined to the AC part over a moved tree (e.g. `FAIL ["ac-delivery"]`
forged to `PASS []` over green gates) passes E and is a RERUN at F in iteration mode and a STOP
`tree-moved-since-verify` at the commit gate. It is never trusted: the re-run regenerates the report from a fresh
stamp and the commit gate never commits over it. What is lost is only the forgery's NAME — it cannot be told from
staleness without reading the old tree, which no longer exists.

### Fix 2 — check-test-stage tells a child's RED from a crash

`run()` also records whether the child's STDOUT carries a line starting `RED —` (both children end every exit-1
return with that line — `check-ac-tests.mjs`'s summary, `ac-tests-lock.mjs`'s `printReds`). Then:

- lock branch (`fromLock`): exit 1 WITH a RED line → `RED lock-red` (unchanged); exit 1 WITHOUT one → `UNUSABLE`
  (exit 2), detail naming the crash: `ac-tests-lock.mjs exited 1 without its closing RED line — it crashed`.
- full-mapping branch: exit 1 WITH a RED line → `RED mapping-red`; exit 1 WITHOUT → `UNUSABLE` (exit 2); exit 2 (the
  child's deliberate `UNUSABLE —`: AC-TESTS.md, SPEC.md or PLAN.md unreadable, or bad usage) → `RED mapping-red` as
  today (grill R6 corrected the example).
- the `--spec` branch is unchanged: its RED-free exit set is 0/2/3/4, so exit 1 is already `UNUSABLE`.

The child's lines are still appended (indented) as diagnosis, so a crash's trace tail stays visible. check-loop-fresh
check I needs NO code change: exit 2 already maps to `front-stage-red` (S11); its header gains one clause saying a
crashed child reaches it as exit 2. /pharn-build (exit 2 → HALT), /pharn-ship (non-zero → STOP) and /pharn-loop
(non-zero → its preflight decides S12/S9) already refuse on exit 2 — no command prose changes.

**Fail-closed direction, stated (P2/P5):** the RED-line test reads the child's stdout, which can echo lock-derived
strings. A spoofed `RED —` line can only turn a crash back into the pre-6.20.4 RED (fail-closed, S13 instead of
S11), never into a pass: a pass still needs exit 0.

## Files

- `pharn/floor/check-loop-fresh.mjs` — checkE: treeMoved first, one conditional spawn, `stampDerivedMismatch` over a moved tree; import `AC_RESERVED_IDS` from gate-run-core (no new module in its load graph) and export `stampDerivedMismatch`, retire `STAMP_ONLY_FIELDS`; header rows E and I, the ORDER paragraph, the HONEST SCOPE bullet and a NOT COVERED line (its own load failure) made truthful — layer product floor
- `pharn/floor/gate-run-core.mjs` — name the AC half of the existing `RESERVED_IDS` literal (`AC_RESERVED_IDS`); `RESERVED_IDS` is unchanged in value — layer product floor
- `pharn/floor/check-loop-fresh.test.mjs` — the moved-tree forgery set × {iteration, commit-gate} STOPs; honest FAIL/PASS reports over a moved tree still RERUN; unit cases for `stampDerivedMismatch` incl. the four merge-order pins; a differential test over real check-verify runs; a ✧ pin that `AC_RESERVED_IDS` equals ac-gate-core `FAILING_IDS`; ★ WIRING: a forged report over a moved tree through both pinned lines, and a lock-child crash (a RUN-TIME throw in the copied ac-tests-lock's --check path) through the pinned decision line stays `front-stage-red`; `iterate` gains `completeness`/results options; the `FLOOR_MODULES` comment corrected — layer product floor (test, does not ship)
- `pharn/floor/check-test-stage.mjs` — `run()` records the child's RED line; `fromLock` and the full-mapping branch report a crash as `UNUSABLE` (exit 2); header OUTPUT paragraph corrected — layer product floor
- `pharn/floor/check-test-stage.test.mjs` — crash tests over a copied floor (throw at load and missing module in `test-infra-core.mjs` → lock branch; a runtime throw in `check-ac-tests.mjs` full mode → mapping branch), each exit 2 `UNUSABLE`, intact-copy control READY; ✧ closure over every `return 1` in both children — layer product floor (test, does not ship)
- `pharn/pharn-contracts/verify-report.md` — the `gate_run` bound bullet: over a moved tree the stamp-derived part is compared, only the AC part defers — layer pharn-contracts
- `pharn/pharn-contracts/ac-tests.md` — "The test-stage gate": exit 2 includes a child checker that crashed, and the nested-child bound — layer pharn-contracts
- `.claude/commands/pharn-loop.md` — two guarantee-audit sentences name E's re-derivation mode over a moved tree — layer product command
- `.claude/commands/pharn-verify.md` — one sentence: the freshness check re-derives with `--ac-gate` over an unmoved tree only — layer product command
- `CLAUDE.md` — THE AC GATE block ("`gates` alone is still compared") and THE TEST-STAGE GATE exit line — repo meta
- `CHANGELOG.md` — new `## [6.20.4]` section with the `### Fixed` entry — repo meta
- `SKILLS_VERSION` — 6.20.3 → 6.20.4 — repo meta
- `README.md` — the shields badge only (`check:badge`) — repo meta

`npm run docs:generate` is run at build; the capability catalog cites neither checker nor either contract, so it is
expected to rewrite nothing (checked by `docs:check`, not assumed). `MIN_CLI` is untouched (no installed path moves).

## Contracts satisfied

- `pharn/pharn-contracts/verify-report.md` "`gate_run`" bound — its one machine consumer's moved-tree comparison is
  restated to match the code (P4: the contract describes, the code enforces).
- `pharn/pharn-contracts/ac-tests.md` "The test-stage gate" — the exit-2 meaning gains the crash case; the RED
  vocabulary (`TEST_STAGE_REASONS`) is unchanged.
- `pharn/pharn-contracts/gate-run-record.md` — unchanged; E still reads the stamp only through check-verify.mjs.

## Evals to write (P1)

No capability (`role:`) is added or changed, so no eval pair is owed; the floor suites are the specification here:

- check E, moved tree: each member of the forgery set → `STOP report-verdict-mismatch` (iteration AND commit-gate);
  honest `FAIL` (red gate) and honest `PASS` reports over a moved tree → `RERUN tree-moved-since-verify` / commit-gate
  `STOP tree-moved-since-verify`; an AC-only change over a moved tree → still deferred (RERUN), the residual pinned.
- `stampDerivedMismatch` unit table: each field's mismatch named; a non-array `failing_gates` → `failing_gates`.
- `stampDerivedMismatch` merge-order pins (GATE 1 correction 2), over a stamp-only verdict of INCOMPLETE `[]`:
  `INCOMPLETE []` → null (group C's semantics); `FAIL ["ac-delivery"]` → null (the old semantics);
  `INCONCLUSIVE []` → null; `PASS []` → `verdict` (a mismatch — STOP).
- check-test-stage: lock-child throw at load → exit 2 `UNUSABLE`; lock-child module missing → exit 2; mapping-child
  runtime throw → exit 2; the same worlds with an intact copy → exit 0 `READY test-first`; every existing RED test
  still RED (the RED line is present on every real RED path).
- ★ WIRING (check-loop-fresh): the pinned decision line over a lock-child crash → `front-stage-red`, reason naming
  `check-test-stage exits 2 (UNUSABLE)`.

## Guarantee audit (P0)

- "Over a moved tree, a verify report whose gates, non-AC failing ids or verdict composition disagree with the
  stamp STOPs `report-verdict-mismatch`" → **floor: enum/set equality** (primitive #3) over a live re-derivation by
  the tested check-verify.mjs, given C (the stamp validates) and D (the report names that stamp's bytes).
- "Only the AC part defers to F" → **floor** for what is compared; the AC-only forgery residual above is stated in
  the header and the contract, never claimed closed.
- "A crashed child is reported as exit 2 `UNUSABLE`, a child's RED as exit 1" → **floor: exit code + an anchored
  regex over the child's stdout** (primitive #3). It rests on the children's convention that every exit-1 return
  prints a `RED —` line — pinned by a ✧ closure test over both children's `return 1` sites, a source-shape pin that
  proves the print is PRESENT before each, not that it executes (a child crashing between the print and the return
  would read as RED — fail-closed).
- "check I keeps a crashed test stage at `front-stage-red` (S11)" → **floor** (check I's existing exit-code branch,
  tested through the pinned line).
- Unchanged and restated: agreement, never provenance (L43); tree identity, not recency; E runs from the worktree
  and cannot vouch for itself.

## Trust audit (P2)

- Verify report fields are deterministic-tool JSON used as enum/set operands only; no free-text field is read.
- Child stdout is read by ONE anchored regex (`^RED —`) and otherwise passed through as indented diagnosis, as
  today. It may echo lock-derived (agent-editable) strings; the only effect of a spoofed line is the fail-closed RED
  that shipped before this fix — never a pass.

## Determinism audit (P5)

Every new branch is an exit-code or set-membership test (`treeMoved`, `AC_FAILING_IDS.includes`, the verdict set,
the RED-line regex). No classification; nothing falls through to a guess.

## Version (CLAUDE.md "SKILLS_VERSION discipline")

**PATCH, 6.20.3 → 6.20.4** — both are corrections to shipped bytes restoring their documented behaviour (the header
and CHANGELOG [6.20.0] already promised both); no new capability, no contract shape change. `MIN_CLI` unchanged.

## GATE 1 (delegated) — recorded

Approved by the orchestrator under the user's delegation (a model decision, not a human approval; recorded in
SHIP.md), with three corrections, all applied above: (1) the CHANGELOG section is dated `2026-09-25`, the actual
date; (2) the moved-tree rule must accept both check-verify precedence semantics (group C's and today's) — it does,
and four explicit `stampDerivedMismatch` tests pin it; (3) `rerunChecker` stays untouched.

## Amended after grill (supersedes the sections above where they differ)

`GRILL.md` holds the findings; this is what the build does about them.

1. **AC ids from a light module (grill R2 + inline P5).** check-loop-fresh does NOT import `ac-gate-core.mjs`: that
   would add ac-gate-core, ac-tests-lock, frontmatter-core, red-run-core and spec-template-core to its own static
   import graph, where a load failure exits node's 1 — check-loop-fresh's own RERUN code — with no JSON.
   `gate-run-core.mjs` (already loaded) names the AC half of its existing `RESERVED_IDS` literal as
   `AC_RESERVED_IDS = ["ac-delivery", "ac-evidence"]` and builds `RESERVED_IDS` from it, so the value is unchanged and
   no new store exists. A ✧ test pins `AC_RESERVED_IDS` equal to `ac-gate-core.mjs` `FAILING_IDS` values, a subset of
   `RESERVED_IDS`, and without `reconcile`. `STAMP_ONLY_FIELDS` is retired (L35); `AC_FAILING_IDS` is not introduced.
2. **Its own load failure, stated (grill R2).** The header's NOT COVERED list gains: a static import that cannot load
   makes check-loop-fresh exit 1 (its RERUN code) with no JSON, which /pharn-loop's exit-1 branch cannot read. That
   is pre-existing (it imports test-infra-core.mjs today) and is also where the review's cited trigger lands. It is
   named follow-up `loop-fresh-load-crash`, not fixed here. The check-test-stage fix covers a crash in every module
   check-loop-fresh does not load itself, and every other caller of check-test-stage (/pharn-build, /pharn-ship,
   /pharn-loop Step 4).
3. **Nested-child crash, stated (grill R1 + inline P0).** check-test-stage's header and the ac-tests contract state
   the residual: an input-dependent crash of `check-plan-spec-agree.mjs` over AC-TESTS.md (check-ac-tests' pin check)
   still reads as `RED mapping-red`. A load-time crash of it or of `check-spec-approved.mjs` (ac-tests-lock's
   bootstrap check), and any crash over SPEC.md/PLAN.md, is caught first by check I's own runs of the same checkers
   (`front-stage-red`). Named follow-up `nested-child-crash`.
4. **The relation is proved against the real checker (inline P3 + R7).** A differential test enumerates honest
   worlds — the `test` gate {0, 1} × `aux.completeness` {0, 1} × the AC reading {delivered, not delivered,
   unmeasurable (a hash-consistent malformed results file), evidence changed}, plus a `reconcile` red. For each it
   runs the REAL `check-verify.mjs --stamp` with and without `--ac-gate` and requires
   `stampDerivedMismatch(withAc, flagless) === null`. A non-vacuity guard requires the observed with-AC verdicts to
   cover PASS, FAIL, INCOMPLETE and INCONCLUSIVE. A negative control requires the forged `PASS []` to be a mismatch
   exactly when the stamp-only verdict is not PASS, which also pins the AC-only residual. The four GATE-1
   merge-order unit pins stay.
5. **The sweep (inline P6 + R3).** `pharn-loop.md` (the AC-evidence and reconcile audit bullets), `pharn-verify.md`
   (the freshness sentence) and `verify-report.md` (the `gate_run` bound bullet) say that E re-derives WITH
   `--ac-gate` over an unmoved tree, and from the stamp alone over a moved one.
6. **RED-line test over the full stdout (R4)**, line-anchored (`/^RED — /m` over `r.stdout`), never over the
   merged, truncated diagnosis lines.
7. **Reserved id used as a gate id (R5)**, stated at `stampDerivedMismatch`: a stamp whose gate is named `ac-delivery`
   can only be hand-made (the writer refuses reserved ids), and the result is a STOP (fail-closed).
8. **The exit-2 example (R6)** is corrected above, and so is check-test-stage's `mapping-red` detail string ("or one
   of AC-TESTS.md, SPEC.md, PLAN.md is unreadable").
9. **The ★ WIRING crash uses a run-time throw** in the copied ac-tests-lock's `--check` path (anchored on its
   `requireRedRun:` argument), never a load failure (inline P1 + R2).

## Open questions (HALT)

- none — the one open question (the CHANGELOG date) was resolved at GATE 1: `2026-09-25`.
