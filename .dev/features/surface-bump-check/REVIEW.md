# REVIEW — surface-bump-check

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (this increment adds no
capability). Everything below is advisory. The increment under review was read as `trust: untrusted`; no instruction-
looking content in it changed this review.

Standing verdicts: regress `no-regressions` (with `tests` red on both sides, `pre_existing`); verify **FAIL** on `test`
(4 timing tests outside the increment, 61/61 when re-run alone — see `VERIFY.md`).

## Floor-gate findings (blocking)

None. Every guarantee the increment claims reduces to glob membership + string equality (primitive #3) or is stated as
a bound; no capability, eval binding or sibling module reference is involved.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/floor/check-surface-bump.mjs:302"
  problem: "From a subdirectory target the path set mixed root-relative diff names with cwd-relative untracked names (and only that subtree's untracked files), so a RED could be missed."
  evidence: "`git diff --name-only` prints root-relative paths, but `git ls-files --others` prints cwd-relative ones"
```

**Fixed in this pass:** a target that is not the work tree's root is now `HEAD_UNREADABLE` (exit 2), header and test
`R3` added, with a negative control (the same change judged from the root is RED). The CLI and CI only ever pass the
root, so no observed verdict changed.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/surface-bump-check/PLAN.md:93"
  problem: "The dry-run numbers in the PLAN, CHANGELOG and checker header were measured with a scratch classifier, not the shipped isProductSurface."
  evidence: "Each of the last 40 first-parent commits on origin/main … diffed against its first parent"
```

**Re-measured in this pass** with the shipped `isProductSurface` (scratch `.pharn/surface-bump-check/dryrun2.mjs`):
window 40, 33 bumped-with-surface, 7 no-surface, 0 RED; controls `6c5ae8e4`, `e4e85294`, `c338b9d0` all RED. The claims
stand as written.

### L-eval → P1

No capability, so no `evals/`. The suite (23 tests) iterates `PRODUCT_SURFACE.include`/`.exclude` and
`REFUSAL_STATES`, and three mutations were run by hand during build, each turning the named tests red:
`--no-renames` → `-M` plus no untracked listing (G5, G6, G8 red); dropping `pharn/floor/*.json` from the constant (B1,
B2, C1, C4 red). The CLAUDE.md binding has per-property negative controls (drop, add, swap, three renamed anchors).

### L-trust → P2

Refs pass `REF_RE`/`MAX_REF_LEN` (imported, one grammar) before git, git runs from argv arrays, resolution carries
`--end-of-options`; path names are only glob-matched (no regex built from input) and only rendered through `quote()`.
No guaranteed decision rests on free text. No finding.

### L-axis → P3

One axis per file: the checker answers "did product bytes move without the version"; it imports the ref grammar from
`check-changelog-entry.mjs` and `quote` from `changelog-core.mjs` rather than copying them (L35). The test imports
`parseGateChain` from `check-contributing-gates.mjs`, as `instruction-growth-wiring.test.mjs` does. No finding.

```yaml
- type: FINDING
  rule_id: P4
  severity: minor
  file: "CHANGELOG.md:7"
  problem: "The CHANGELOG preamble still describes the versioned surface in its own words, and nothing binds it to the constant or to CLAUDE.md."
  evidence: "the bytes an install receives (the `pharn/` tree, the product-floor checkers, the four trusted docs, and the `pharn-*` commands)"
```

Left as is: the preamble is a reader's summary, not a list a check reads, and it stays true (it omits `.json` data and
hooks by brevity, not by contradiction). Binding it would be a third copy (L35). Named so a later sweep sees it.

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: "CLAUDE.md:80"
  problem: "The always-loaded instruction set grows by 1,284 B — within the 2,048 B per-PR budget, but over the 400 B the plan estimated."
  evidence: 'check:instruction-growth: "verdict": "within", "added_bytes": 1284'
```

Accepted: the bullet must carry every pattern for the binding to be possible, and the second edit names the new gate
where CLAUDE.md lists the gates outside the chain.

## Verdict

GREEN (0 floor-gate findings); 4 advisory findings, 2 fixed or re-measured in this pass, 2 accepted with reasons. The
verify `FAIL` stands as computed and is the decision input for GATE 2, not this review.

## Proposed lesson candidate (not promoted — batch rule: deferred)

- **Candidate:** a full-suite gate run while parallel agents load the machine measures the machine: timing-bound tests
  (`entry-base-evidence`, `stage-verify`, `stage-regress`) failed 6, 3 and 4 times across three runs of byte-identical
  outside files, and passed 61/61 alone. Remedy shape: a verify/regress runner that records per-test failure names and
  re-runs only the failing files once, in isolation, reporting both — never silently replacing the first result.
- **source:** this `REVIEW.md` + `VERIFY.md` "What the red `test` gate is" + `REGRESSION.md` "The red `tests` gate on
  both sides". Recurrence evidence outside this run is in the batch memory note on sibling worktrees breaking gates.
