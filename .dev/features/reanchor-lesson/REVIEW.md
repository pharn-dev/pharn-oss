# REVIEW — reanchor-lesson

**Verdict: GREEN** — 0 floor-gate findings, 3 advisory findings. Floor first: `node pharn/floor/validate.mjs .` →
`FLOOR: GREEN — 37 capabilities checked`. The increment under review (`git diff 0b2ec87a`: `CHANGELOG.md` +9 lines, and
this feature's `PLAN.md` and `GRILL.md`) is `trust: untrusted`; no instruction-looking content was found in it.

## Floor-gate findings

None. The increment adds no Capability, `rule_id`, contract or checker, and claims no guarantee: the CHANGELOG entry
states what happened and that the change is dev-only.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/reanchor-lesson/PLAN.md:33"
  problem: "The plan names `npm run docs:generate` as what the promote command's Step 6b runs, twice (lines 33 and 49). Step 6b runs the narrow `node .dev/floor/gen-lessons-index.mjs .` and names `docs:generate` as the rejected form, because that script also rewrites docs/capabilities/** and the README region. The promotion below follows the command, not the plan's wording."
  evidence: "`npm run docs:generate` runs only inside the promote command's Step 6b"
- type: FINDING
  rule_id: P6
  severity: minor
  file: "CHANGELOG.md:26"
  problem: "The entry, written at build, says L85 was promoted and the index regenerated, before the promote gate has run. It is true only if the promote command accepts and writes; on a deny or an id change the entry must be corrected before the pull request merges."
  evidence: "It was promoted through `/pharn-dev-ship` (`.dev/features/reanchor-lesson/`) and the gated `/pharn-dev-memory-promote`"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/delegated-signoff-2026-11-23/REVIEW.md:56"
  problem: "The source candidate proposed `type: process`; the candidate taken to promotion uses `type: scoping`, the type canon gives the two reconciliation-window lessons it sits beside (L48, L68). The choice of member is model judgment, ratified or corrected at the promote gate."
  evidence: "**type:** process · **concepts:** [reconciliation, merge, re-anchor, false-record]"
```

## Lenses

- **L-floor (P0):** no guarantee claimed by the increment. The plan's guarantee audit labels the lesson's truth
  advisory and names the floor checks that will run over the canon write (`check-provenance.mjs`, the two write hooks,
  `docs:check` in CI). Clean.
- **L-eval (P1):** no Capability or `rule_id`. Not applicable; the floor agrees (GREEN).
- **L-trust (P2):** the CHANGELOG entry paraphrases the CORE-314 records (untrusted free text) as data; nothing in the
  increment is fed to a gate. The candidate body is drawn from the same records and goes to canon only through
  `check-provenance.mjs` and the promote command's human gate. Clean.
- **L-axis (P3):** one file of product-adjacent change (`CHANGELOG.md`, one reason: the per-PR entry). No sibling
  reference. Clean.

## Proposed lesson candidate

This run carries one candidate, and it is the one the run exists for: the CORE-314 candidate in
`.dev/features/delegated-signoff-2026-11-23/REVIEW.md` § "Proposed lesson candidate", re-drafted after the grill's P7
finding (any write made before a re-anchor drops out of the window, committed or not; and the cases where a merge still
breaks the epoch are real verdicts handled as L68 says, never absorbed by a re-anchor). This run is its own evidence for
the remedy: the epoch was anchored once, `origin/main` did not move, and verify's reconcile read `reconciled: 1` — the
build's one write.

No second candidate from this run. Regress iteration 1's red (`entry-gates.test.mjs` "CLI cache (AC3)", under a host
load of 236) is the known load-timing class, already recorded in earlier runs; it is listed under `deferred:` in
`SHIP.md`, not proposed.
