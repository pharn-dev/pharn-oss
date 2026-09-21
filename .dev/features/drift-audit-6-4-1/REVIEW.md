# REVIEW — drift-audit-6-4-1

**Verdict: GREEN — 0 floor-gate findings; 3 advisory findings (0 important, 3 minor).** The floor is the only guaranteed part of this review. Everything below the "Floor first" line is advisory model judgment and gates nothing.

The increment under review is treated as `trust: untrusted`. Nothing in the reviewed files, the audit trails they quote or the lessons canon read as an instruction to this reviewer, and no behavior changed as a result of reading them (L-trust, below).

## Floor first (P0)

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`, exit 0. It is also GREEN in the stages that already own that verdict: `/pharn-dev-build` Step 3 and `/pharn-dev-verify` (`verify-report.json` `verdict: PASS`, all seven gates 0, `reconcile` `CLEAN` with 0 escapes). `/pharn-dev-regress` reports `no-regressions`. This review adds no floor verdict of its own.

Two facts stated in shipped text were re-checked against live state before this review was written, not carried over from the plan: the `check-loop-decision.mjs` attribution "added 6.3.0" (introduced by `231e422`, #222, titled 6.3.0), and that the edited `pharn-review.md` passage sits inside Step 3b (heading at `:180`, passage at `:210-212`). Both hold.

## The four lenses

- **L-floor → P0.** Every new claim was checked for a floor reduction or an `advisory` label. The `check-loop-decision` statements in `CLAUDE.md:229-239` are labelled correctly: floor for the verdict, **advisory for the act of running it**, and the bound (re-derivable, not honest) is in the text. The README's `/pharn-loop` sentence is the one place the label is weaker; see finding A1. The README skills-channel sentence and the `finding-shape.md`, `ARCHITECTURE.md`, `pharn-review.md` and `LIMITS.md` corrections make no guarantee claim; each says what is not bounded or names the owner. The bump/CHANGELOG bookkeeping is floor only for agreement across stores (L43), and the plan and `APPLY.md` say so.
- **L-eval → P1.** No Capability is added or changed, and no `rule_id` is introduced (`finding-shape.md` is a contract; `pharn-review.md` is a command outside the capability walk). `validate` agrees: 36 capabilities, GREEN. The carve-out closure test that pins `pharn-review.md` ran 133/133 before and after the edit. No finding.
- **L-trust → P2.** No instruction-looking content in the reviewed artifacts steered this review. The new prose adds no path by which untrusted text reaches a guaranteed decision. The README sentence about hostile installed skills describes the residual and claims no protection. No finding.
- **L-axis → P3.** Each edit is one topic in the file that owns it. `finding-shape.md` (contracts layer) and `pharn-review.md` cite root docs (`THREAT-MODEL.md §5`), which is the existing citation pattern, not a sibling-module reference. The `ARCHITECTURE.md` patch cites the probe directory from the root spec, which is a cite to an owner, not an import. No finding.

## Floor-gate findings (blocking)

None.

## Advisory-gate findings (warn; model judgment, gate nothing)

**A1 — `README.md:381`.**

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "README.md:381"
  problem: "The README states 'a green that does not re-derive is not committed' as fact, but the act is /pharn-loop command discipline reading a floor verdict; the CLAUDE.md sentence labels the act advisory and this one does not, so the two carry different honesty for the same claim."
  evidence: "README.md:380-385: 'Only a green result is committed, to a new local branch, and only if its recorded decision re-derives from the reports it cites (`check-loop-decision.mjs` re-runs the loop's stop computation and compares); a green that does not re-derive is not committed.' versus CLAUDE.md:236-238: '…and the ACT of running it is command prose (advisory); only its verdict is floor.' The README paragraph two lines above says orchestration is advisory, which covers this by proximity only."
```

**Suggested handling (human's call at GATE 2; README is agent-editable, so a one-line follow-up).** "…; the run does not commit a green that does not re-derive." moves the sentence from a claim about outcomes to a claim about the run, matching the label the neighbouring `CLAUDE.md` text carries. The original sentence ("Only a green result is committed") had the same shape, so this is a pre-existing looseness the rewrite inherited rather than introduced.

**A2 — `proposed/APPLY.md:64`.**

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/drift-audit-6-4-1/proposed/APPLY.md:64"
  problem: "The verification record certifies a clone run whose script lives only in the session scratchpad, so a reader of the committed repo cannot re-run it; the method is described in prose but is not reproducible from the repository alone."
  evidence: "APPLY.md:64: 'The whole run is `verify-clone.sh` in the build's scratchpad.' The scratchpad is not part of the repository and is not committed. The method (clone at the base, carry edits, apply the patches in order, commit, run each gate individually, link dependencies from the live tree) is fully stated, so it can be repeated by hand."
```

**Suggested handling.** Either accept it as stated (the record already says what it does and does not show), or commit the script next to `APPLY.md` before the human commits. The record's own "What this record does NOT show" paragraph already bounds the claim, which is why this is minor.

**A3 — `CHANGELOG.md:55`.**

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "CHANGELOG.md:55"
  problem: "The CHANGELOG entry asserts, in the present tense of a shipped record, that trusted-doc corrections exist that are not in this tree until the human applies the patches; the entry is true only after that step, and nothing detects a tree committed without it."
  evidence: "CHANGELOG.md:55: 'Each now uses the **open** form … **`pharn/ARCHITECTURE.md`, `THREAT-MODEL.md` and `LIMITS.md` are human-only (hook-denied), so those edits ship as staged patches**' — the entry says so and gives the ordering constraint, but `check:changelog` binds only the version token, never the edit it describes (L43)."
```

**Suggested handling.** None beyond what already exists. This restates the standing residual the plan named and the `model-routing-limit` precedent recorded, and the entry itself carries the constraint. It is listed so the residual is visible in the review the human reads at the gate, not because the build got it wrong.

## Considered and not raised

- `APPLY.md` opens with closed counts ("Three of the four", "Two decisions"). They describe a fixed, time-bound hand-off and are enumerated directly beneath, so they carry no expiry risk of the kind L47 concerns (a forward-looking count over a growing set). Not raised.
- The CHANGELOG entry lists the dead cites in `ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md` and `pharn-review.md` but not the one in `CLAUDE.md:749`, which it covers under the quantifier sentence. Incomplete as an enumeration, false in nothing, and `CLAUDE.md` is repo-meta. Not raised.
- The wrap-tolerant sweep and the line-based sweep both passed. That is a lower bound, not a clean bill, and the plan, `APPLY.md` and the plan's coverage boundary say so.

## Standing residuals this increment does not close (stated, not findings)

- **A skipped patch is invisible.** The `6.4.2` bump, the badge and the CHANGELOG assert edits that only the human can make. `APPLY.md` states the ordering (apply all, commit, then `npm run check`).
- **Nothing reads the corrected prose for truth.** The sweep is a lower bound over greps, and its own first run missed two sites.
- **The floor check for retracted-claim spellings is deferred**, at the maintainer's choice; pending, no trigger invented (L46).
- **The local reconcile baseline was replaced** by the build's anchor. That is the sanctioned writer, and a copy of the replaced epoch is in the session scratchpad.

## Corrections found after the plan was approved (stated, not silently fixed)

- **`PLAN.md` Trigger rows 8 and 9 over-attribute the cause.** Row 8 says `LIMITS.md:146` shares "the same root cause as row 4 (#166)". The history says otherwise: the "experiment agenda" text was in README from the bootstrap commit (`ea4ccc5`, 2026-06-23) and was removed by the reframe (`a82b073`, 2026-06-24), so that cite has been dead since the day after it was written, and #166 (2026-08-23) removed only the attempt-0 mention. Row 9's cite was introduced by #197 (2026-09-10), eighteen days after #166, so it was **dead on arrival** and not orphaned by #166. The defects are the same kind (a cite into README text that no longer exists) with three different origins. `PLAN.md` is an approved artifact and is left as written; this note, and the CHANGELOG entry, which was corrected, carry the accurate account.
- **The same over-attribution was stated to the maintainer** in the scope question put to them during the run ("README's agenda pointers orphaned by #166"). It was inaccurate for `LIMITS.md:146` and for the `pharn-review.md` cite.
- **Effect on the edits: none.** E10 and E11 are correct whatever the cause; only the account of why the cites were dead changes.
- **The CHANGELOG correction landed after `/pharn-dev-verify` ran.** The gates a prose edit to that file can affect were re-run and are GREEN (`format:check`, `lint:md`, `check:changelog`, `check:badge`, `docs:check`); the full suite was not re-run, because nothing executable changed.

## Proposed lesson candidate (one; the human decides at the ship gate — nothing is written to canon here)

**A sweep for a retracted claim must enumerate the cites of the referent that broke, not only the claim's spellings.**

- **What happened, measured.** Cites into README text that no longer exists survived for three different reasons at three different times. `LIMITS.md:146` has cited a README "experiment agenda" since the bootstrap commit, and that text has been gone since the reframe (`a82b073`, 2026-06-24). #166 (2026-08-23) later removed README's attempt-0 mention, orphaning the cites in `ARCHITECTURE.md`, `THREAT-MODEL.md` and `CLAUDE.md`. And `pharn-review.md`'s cite was written in #197 (2026-09-10), eighteen days after that, with the README already lacking the text: **dead on arrival**. #221 retracted "the one residual" and swept that claim's spellings, correctly by `L33`'s recipe. This increment's plan did the same and stated its coverage boundary, as `L49` asks. Two sites of the family still survived — `LIMITS.md:146` and `pharn-review.md:210-212`, whose wording differs ("experiment agenda", "the one capability … exists to measure") — and were found only when the grill searched a **different anchor phrase** (`GRILL.md` § Run history, first row of the Run-1 table).
- **Why it is distinct.** `L33` covers variant spellings of one claim; `L36` the closure of an enumeration; `L47` repair by a new count; `L49` stating the coverage boundary. Here the boundary was stated and exceeded anyway, because the sweep's axis (the claim) was not the defect's axis (an orphaned referent).
- **Remedy.** When the root cause is a deleted or moved referent, sweep by **referent** first — every cite of the file or section that went away, across every surface — classify each, then sweep by claim; state both axes in the declaration, and add a wrap-tolerant pass (a phrase split across a line wrap is invisible to a line grep). And **dereference** every cite in a sentence you write or re-author: open the target and confirm it says what the cite claims. A cite can be dead on arrival, which no history of the referent will show.
- **Honest trigger (P7).** One observed instance of this specific axis, in the same family as three promoted lessons; by `L20`'s bar that is arguably a second occurrence of the enumeration-scope family and not yet of this axis. No checker exists, and building one would need a maintained referent registry (the `L29`/`L36` cost). If the maintainer promotes it, the entry should record its remedy as **pending**, per `L46`.
- **Provenance.** feature `drift-audit-6-4-1`; source `.dev/features/drift-audit-6-4-1/GRILL.md` § Run history (the first row of the Run-1 table) and `PLAN.md` Trigger rows 8 and 9; commit `d9f2133` (working-tree dogfood built on this commit; uncommitted).
