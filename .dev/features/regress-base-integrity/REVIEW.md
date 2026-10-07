# REVIEW — regress-base-integrity

Floor first: `node pharn/floor/validate.mjs .` → **GREEN** (37 capabilities). No Capability is added or changed, so
L-eval has nothing to bind (P1 does not arise); the executable changes ship with tests, and the new checker tests fail
on the `052709d` floor (REGRESSION.md, "Fail-before evidence").

How this review was run: an independent, read-only subagent reviewed the uncommitted diff against this plan with the
four lenses plus a bug hunt (it re-ran every focused suite: all pass; no reviewed file carried text aimed at it as
instructions). Its findings are below, re-checked against the code by the orchestrating agent; their free text is
quoted as DATA. Every finding is **advisory** — none is a floor-gate finding.

**Verdict: GREEN — 0 floor-gate findings, 1 important + 13 minor advisory findings.**

## Floor-gate findings

None. No P0 guarantee without a floor reduction was found; no sibling reference; no eval binding is affected.

## Advisory findings

### Correctness and drift (L-floor, P0 / P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".claude/commands/pharn-ship-quick.md:65"
  problem: "Quick item 3 still lists the run's order as backstop → kind read → marker → snapshot → entry gates → /pharn-plan and omits the new base capture, while item 7 STOPs without the captured base — a model following item 3's explicit order can skip the capture and then stop."
  evidence: "item 3's order sentence; pharn-ship.md:299-311 places the capture between the backstop and the marker"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/check-regress.mjs (changedUnderTest)"
  problem: 'The rule reuses L17''s exemptions ("the build did not write this") for a different question ("no gate can be affected"): a change that is only a human trusted-doc edit, or a pipeline artifact a lint gate reads, is refused no-change-under-test, and the suggested --base remedy cannot clear it. Fail-closed (a false stop, never a false green).'
  evidence: "changedUnderTest(inside, feature) = inside minus TRUSTED_DOCS and this feature's pipeline artifacts"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/floor/base-worktree.mjs:69"
  problem: 'placementError''s `rel.startsWith("..")` reads a temp root at `<project>/..foo` as outside the project; `rel === ".." || rel.startsWith(".." + sep)` is exact.'
  evidence: 'if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)))'
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/stage-regress.mjs (runResume)"
  problem: "A resume checks the recorded checkout's shape, not that it still exists: a pause across an OS temp sweep, a reboot or a changed TMPDIR becomes child-refused or progress-malformed without saying why; the base-worktree.mjs header names the sweep only for a hard kill."
  evidence: "isOurBaseDir(parsed.baseWorktree, projectReal()) — a shape test"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/stage-regress.mjs (base-install-unreliable refusal)"
  problem: "On the base-install-unreliable path a failed cleanup (a locked worktree) is not reported: the refusal render carries no cleanupResult."
  evidence: 'writeRefusedAndEmit(…, "base-install-unreliable", …) after the cleanup phase'
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/base-worktree.mjs (createBaseDir reasons)"
  problem: "The base-worktree-unplaceable detail carries the absolute temp-root path on stdout, unredacted; consistent with the header (the redaction claim covers renders only), but worth stating."
  evidence: "`the temp directory ${JSON.stringify(root)} is inside the project…`"
```

### Claims vs mechanism (L-floor, P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: 'CHANGELOG.md [6.51.0] — "The base no longer collapses onto HEAD."'
  problem: "For /pharn-ship this rests on an advisory command step (the plan's own audit says so), and standalone /pharn-regress still uses the implicit rules; the bullet should name the advisory capture."
  evidence: 'the plan''s guarantee audit: "`/pharn-ship` compares against the commit it started from" → advisory'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md [6.51.0]; .claude/commands/pharn-regress.md:298; .dev/guides/floor-gates.md:222; pharn/floor/render-regression.mjs:189"
  problem: '"closes regress-failed-install-false-green" overstates: it is closed for an install that exits non-zero or times out, and still open for an --install that exits 0 without preparing the base (e.g. `true`) and for dependencies baseInstallNeeded cannot see; only the contract''s Bounds paragraph names the second.'
  evidence: "unreliableInstallMasking reads install kind/exit/timedOut only"
```

### Stale text (L-floor, P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/render-regression.mjs:170-172"
  problem: 'The comment above the install warning still calls it "the ONLY signal" of an "unclosed" bound.'
  evidence: "unclosed `regress-failed-install-false-green` bound), so a reader must see it BEFORE the headline"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/guides/floor-gates.md:242"
  problem: 'The BASE-EVIDENCE REUSE block still says the root-level binding exists "because the base worktree is nested in the HEAD tree".'
  evidence: "because the base worktree is nested in the HEAD tree"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/check-quick-scope.mjs:32"
  problem: "The entry's header lists the reason codes without `total-glob-declared`."
  evidence: "header reason-code list"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/entry-base-evidence-core.mjs:9-18,47"
  problem: 'The header still describes the fresh BASE as a "nested worktree" in the present tense.'
  evidence: "NOT CLAIMED: that entry-derived BASE equals what a fresh nested-worktree BASE would give"
```

### Test gaps (L-eval spirit, P1 / L34)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/stage-regress.test.mjs"
  problem: "No test covers a run whose only non-exempt changes are pre-run-snapshot or entry-gate paths (the build changed nothing, yet no-change-under-test does not trip) — an unstated bound."
  evidence: "changedUnderTest subtracts only the closed exemptions, not pre-run paths"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/stage-regress.test.mjs:1235 (GRILL G4)"
  problem: "The through-the-script cleanup redaction check is vacuous (git's locked-tree message names no path); only base-worktree.test.mjs's unit test exercises redact."
  evidence: "(git's locked-tree message names no path today; base-worktree.test.mjs pins `redact` for one that does.)"
```

L-trust (P2): no finding beyond the unredacted stdout detail above. The new outputs carry enum codes, integers, digests
and repo-relative paths; `## Files` patterns are rendered through `quoteData`; no decision rests on free text.
L-axis (P3): the worktree lifecycle was split into `base-worktree.mjs` at the grill; `check-regress.mjs` imports
`isConcrete` from `plan-files-core.mjs` and `FEATURE_SLUG_RE`/`timedOutRunIds` from `gate-run-core.mjs` (tree-shaped,
no sibling leaf reference).

## Proposed lesson candidate (NOT canon — for `/pharn-dev-memory-promote`, if accepted)

- **Candidate:** "Renaming a member of a shared decision's return enum is an API change: every caller outside the plan's
  `## Files` that compares against the old literal keeps compiling and silently takes the other branch."
- **Source:** `.dev/features/regress-base-integrity/REGRESSION.md` (run 1 RED: `resolveBaseSource`'s `head` →
  `dirty-head` left `instruction-files.mjs`'s `kind === "head"` comparing against a value that no longer exists; 18
  outside tests went red). type: `process`, concepts: `[enumeration, referent-binding, shared-parser, test-blindspot]`.
- **Why it would recur:** a string-literal enum has no compiler; only a caller's own tests catch it, and the plan's
  enumeration of callers was a grep for the function name that the author did not run. The second occurrence would
  justify a floor check (L20): a test that every `.kind ===` literal compared against `resolveBaseSource` is a member of
  its closed set.
