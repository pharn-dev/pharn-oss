# REVIEW — verify-head-gate-reuse

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`.

**How this review was run (advisory).** An independent, read-only Opus agent with a fresh context applied the four
lenses to the uncommitted diff against `main` (`2cf0e85`). It ran the changed modules' suites (all green), and ran 21
mutants in throwaway temp copies of the repo. Its free text below inherits the increment's untrusted tag and is quoted
as DATA (P2). It found **no false-HIT path**: /pharn-loop iteration 2, a check-loop-fresh RERUN of verify only, the
/pharn-ship Step 2b retry, `--quick`, `--resume` and a crash between the log copy and the state write each end in a miss
(`fp_before` and git HEAD are in the identity) or a real same-tree hit. Consumers (`check-verify`, `ac-gate-core`,
`check-loop-fresh` E/F/G/J, `test-results-core`) read a reused entry correctly, and BASE reuse (6.33.0) still passes.

## Floor-gate findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/head-reuse-offer.mjs:11"
  problem: "The claim that the write tools cannot write the git dir 'in every posture' is false for a separate git dir under a temp root, in an installed project with no run open."
  evidence: "Repro: git init --separate-git-dir /tmp/…/sep.git + pharn.config.json skillsVersion 6.34.0 → protect-trusted-paths exit 0, enforce-writes-scope exit 0; with a pharn-loop marker present, enforce exits 2. The 6.33.0 BASE record shares the wording through gitDirFile."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/gate-run-core.mjs (reusedRunDefect); gate-run-record.md 'Reused entries'"
  problem: "'validateStamp admits exactly that shape' was not true of the exit: a reused entry with exit 137 or 127 validated."
  evidence: "reusedRunDefect checked stage, reason/ran, id, block, identity, timed_out/mutated/fp, results — not 0 <= exit <= 125."
```

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "CHANGELOG.md [6.34.0]; CLAUDE.md HEAD→VERIFY paragraph"
  problem: "'when tested code proves the two executions are the same' overstates: the code proves the bound inputs are equal; sameness is advisory."
  evidence: "gate-reuse-core.mjs header: a HIT proves AGREEMENT, never PROVENANCE; fresh-run equality is ADVISORY."
- type: FINDING
  rule_id: "P1"
  severity: important
  file: "pharn/floor/run-gates.mjs (executionIdentity call in runNext)"
  problem: "No runner- or stage-level test pinned the head and cwd identity inputs (L60)."
  evidence: "Mutants head:null and cwdAbs:'/x' left run-gates REUSE 10/10 and stage-verify reuse 8/8 green."
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/run-gates.mjs (noLinkInside)"
  problem: "The intermediate-component symlink check on the reuse source was untested."
  evidence: "Mutant noLinkInside → return true survived every suite."
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/gate-reuse-core.mjs"
  problem: "Two reasons to change (identity/eligibility vs the offer schema and acceptance); the latter pulled regress-stage modules into the runner's load graph."
  evidence: "gate-reuse-core imported regress-base-reuse-core and stage-regress-core; run-gates uses only executionIdentity, findReusable, reusedRunRecord."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/stage-regress.mjs; pharn/floor/head-reuse-offer.mjs"
  problem: "discardOffer threw on a non-ENOENT failure, so reuse housekeeping could crash /pharn-regress."
  evidence: "if (!st.ok) throw …; rmSync/removeIfPresent failures propagated."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/verify-report.md (gate_reuse)"
  problem: "'Truthful by construction' is outside the floor vocabulary, and the block re-read stamp.json without binding it to the bytes the verdict read or type-checking the copied fields."
  evidence: "stage-verify.mjs read STAMP again after check-verify; gateReuseBlock copied b.stage/b.side/b.seq unchecked."
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/run-gates.mjs (tryReuse)"
  problem: "During a budget-paused verify chain, rec.reuse in writable state.json can be repointed at a forged, contained stamp; the residual was unnamed."
  evidence: "run --next reads rec.reuse from state.json and never consults the offer again."
```

## Disposition (orchestrator, GATE-2 fix under the maintainer's delegation)

Every finding was fixed inside the plan's `## Files`, then the full gate set was re-run (VERIFY.md: PASS, 4455/4455):

- the git-dir claim is narrowed everywhere it appeared (head-reuse-offer.mjs header, CHANGELOG, CLAUDE.md) to the layouts
  the ★ HOOK test probes, with the separate-git-dir case named — it covers the 6.33.0 BASE record too;
- `validateStamp` requires a reused `exit` in 0..125 (`MAX_REUSABLE_EXIT`, now owned by `gate-run-core.mjs`), tested;
- "proves the two executions are the same" → "proves every input it binds is equal (agreement)";
- runner-level negative controls for git HEAD (an empty commit, same fingerprint), cwd (a linked worktree, same
  fingerprint) and an intermediate-directory symlink — each re-run against its mutant and now RED under it;
- the offer's record and acceptance rule moved into `head-reuse-offer.mjs`; `gate-reuse-core.mjs` imports only
  `gate-run-core.mjs` (a ★ LOAD GRAPH test with an injected-import control pins it);
- `discardOffer` returns `{ok, why}` and never throws; stage-regress reports a failure on stderr (tested with a read-only
  git dir);
- the `gate_reuse` block is read only from stamp bytes whose sha256 equals the verdict's `gate_run.stamp_sha256`, with
  its fields type-checked; the contract wording is plain;
- `verify-paused-chain-integrity` is named in run-gates.mjs, the contract, CHANGELOG and CLAUDE.md.

**Verdict: GREEN — 0 open floor-gate findings** (2 found, both fixed and tested).

**Proposed lesson candidate: none.** The findings are first occurrences of known lesson shapes (L37 universal-quantifier
drift, L60 per-property controls), each fixed with a test in this increment.
