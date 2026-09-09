# REVIEW — writes-scope-default-disclosure

**Increment under review:** one bullet added to `README.md` `## Current limitations` (lines 335–346),
disclosing the writes-scope guard's fail-closed `DEFAULT_SAFE_SET`. Reviewed as `trust: untrusted`.

## Step 1 — Floor first (P0)

`node pharn/floor/validate.mjs .` → **`FLOOR: GREEN — 36 capabilities checked in "."`**, exit 0.
The capability count is unchanged from base, as expected: this increment adds no capability.

The floor is the only guaranteed part of this review. Everything below is **advisory**.

## Findings

### Floor-gate (blocking)

**None.** No guarantee in the increment lacks a floor reduction or an advisory label, no eval binding is
missing (none is owed), and no sibling reference was introduced.

### Advisory-gate (warn — model judgment, never a blocking basis)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "README.md:338"
  problem: "The four globs are summarized as 'PHARN's own artifact directories', but one of them — `.dev/features/**` — never exists in a user's install, so the summary reads as if all four are reachable for the reader it addresses."
  evidence: "README.md:338 — '`pharn/pharn-*/**` and `.pharn/**` — PHARN's own artifact directories'. CLAUDE.md's dev/product boundary states `.dev/` is 'Committed (contributors use it), but NOT what a user receives', and this README's own Quick start tree (lines 106-121) lists what an install contains: `.claude/`, `pharn/`, `pharn.config.json`, `features/<name>/`, `.pharn/` — no `.dev/`. So in the very install this bullet describes, `.dev/features/**` is a dead glob. This is the ORIGINAL adversarial finding's own observation ('a PHARN-repo-shaped set') reappearing inside the sentence written to disclose it. Not false — the set genuinely contains that glob — but under-precise where precision is the deliverable. One-clause repair available: annotate it `.dev/features/**` (dev-repo only). Deliberately NOT self-applied: it is a content addition after human approval, not a precision repair, so it belongs at GATE 2."
  status: "RESOLVED at GATE 2 — the human agreed it must not ship as-is (a disclosure bullet reproducing the disease it discloses is the P0 failure the finding exists to close) and directed the repair. `.dev/features/**` now carries the clause '(present only in PHARN's own repo, never in an install)'. All four floor verdicts were re-run over the final bytes and still stand."

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "README.md:340"
  problem: "'a stage sets the scope in its first step' is ADVISORY orchestration stated as flat mechanism, one clause away from floor-grade claims — a reader can carry the floor's certainty across into it."
  evidence: "README.md:340 — 'That is the intended posture — a stage sets the scope in its first step, so `/pharn-build` writes exactly the concrete paths your `PLAN.md` declared'. The DENIAL is floor (the hook); that the ACTIVE SCOPE equals the plan's `## Files` depends on the command having executed its Step-0 setter, which is command PROSE run through Bash — outside the `PreToolUse` gate entirely (L19), and nothing forces it. Judged MINOR rather than important because 'the intended posture' does hedge the clause, and because the failure direction is safe: a skipped setter leaves the fail-closed default, which denies more, not less."

- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "README.md:345"
  problem: "The remedy `set-writes-scope.cjs --from-plan <PLAN.md>` is correct and reachable, but its precondition is unstated: the setter has no arbitrary-path mode, so a user wanting one ad-hoc file must first author a markdown file for it to parse."
  evidence: "set-writes-scope.cjs takes exactly two source modes — `--from-frontmatter <file.md> [--target <path>]` and `--from-plan <PLAN.md>` — and both read paths OUT OF a markdown document; there is no `--path src/app.ts`. So 'set a scope that names those paths' costs a `## Files` list or a `writes:` frontmatter the user may not have. This is L27-adjacent rather than L27 itself: the remedy WORKS (unlike the `--clear` remedy this increment exists to correct), it is merely more expensive than the sentence implies. Recorded rather than repaired because the honest fix lengthens a bullet the human already judged long, and the second remedy (leave the hook unwired) is unconditional and stated."
```

## Lens-by-lens

- **L-floor → P0.** Two findings above, both advisory. The bullet's load-bearing claims — the four
  globs, and that ordinary user source is denied — are floor-grade (glob membership in
  `enforce-writes-scope.cjs`) and were **measured**, not asserted: nine hook exit codes in `PLAN.md`
  `## Discovery`. The correction the increment exists to make (`--clear` does not re-open your source)
  rests on a three-state probe, not on reading the code. Nothing claims a guarantee the floor does not
  supply.
- **L-eval → P1.** No Capability and no `rule_id` are added, so P1 binds nothing here. The floor agrees:
  `validate` GREEN, capability count unchanged at 36. No disagreement between the floor and this lens.
- **L-trust → P2.** No finding, and one observation worth recording because it is the fence working
  rather than failing. The increment's real untrusted input is the external adversarial review, and it
  **did** attempt to steer the output — it prescribed remedy wording verbatim. That wording was not
  transcribed: it was re-derived against the live hook, measured false, and replaced. Untrusted input
  reached the artifact only as a POINTER to what to verify; no enum-gated or floor-verifiable field
  anywhere derives from it. Separately, the bullet tells a reader how to leave a security hook unwired —
  reviewed and **not** a P2 concern: it is the reader's own config, `README.md:123-126` already
  discloses it, the bullet names its cost inline, and the human ruled explicitly at GATE 1 to keep it.
- **L-axis → P3.** No finding. `README.md` changes for one reason. The bullet cites
  `.claude/hooks/enforce-writes-scope.cjs` by path, which is not a layer-tree sibling reference — the
  README is not a `pharn-*` module and the hook is not reached through `pharn-contracts` by anyone.

## What the grill caught that this review confirms

`GRILL.md` raised five concerns; two were `important` and both were repaired **before** the build wrote
anything, so they do not appear as findings here:

- **G1** — the approved text read "the **only** paths … may write are … and `.pharn/**`", a universal
  quantifier measurably false for `.pharn/writes-scope.json` (probed: exit 2). Repaired to "are
  restricted to", which is an upper-bound claim and true. This respects the human's GATE-1 decision (2)
  to omit **explaining** the exception, since the quantifier and the explanation are separable.
- **G2** — "writes exactly the paths your `PLAN.md` declared" was measurably an over-claim: a `## Files`
  glob is silently dropped by the setter's `isConcrete()` (probed: a 2-bullet list produced
  `1 path(s)`). Repaired to "exactly the **concrete** paths".

Both were post-approval edits to text a human had approved, and both are flagged as such for GATE 2 with
a one-word revert available. G3–G5 are `PLAN.md` hygiene and are carried to GATE 2 unrepaired.

## Verdict

**GREEN — 0 floor-gate findings, 3 advisory.**

A blocking floor-finding would mean the increment is not done; there is none. The three advisory
findings are precision, not correctness: no sentence in the built bullet is false, and the two that were
have already been repaired at build.

**The honest bound (P0):** this verdict is model judgment over prose. Nothing in this review is a floor
operation except Step 1, and Step 1 does not read README prose at all — `validate.mjs` ignores root
docs. "Review GREEN" here means "no lens raised a blocking concern", never "the bullet is true". What
supports the bullet's truth is the measurement in `PLAN.md`, which is evidence, not a gate.

## Proposed lesson candidate (PROPOSAL ONLY — canon is never written here)

**Candidate — target `.dev/memory-bank/lessons-learned.md`:**

> **A doc that states a guard's bounds must be probed against the guard, not read off it — the
> quantifier is where the drift lands.** Two sentences written to disclose `DEFAULT_SAFE_SET` were
> derived by READING `enforce-writes-scope.cjs` and were both wrong at the edges: "the **only** paths …
> may write are … `.pharn/**`" (false for `.pharn/writes-scope.json`, denied at `:314` before the
> allow-list is consulted) and "writes **exactly the paths** your `PLAN.md` declared" (false for a glob
> entry, silently dropped by `isConcrete()`). Both survived authoring, human GATE-1 approval, and a
> correct reading of the source; both fell to a 30-second probe. The transferable part is WHERE:
> universal quantifiers ("only", "exactly", "every") are the fragment a careful reading of an
> implementation does not check, because the reader confirms the listed members and never hunts the
> unlisted exception.

**Corroborating evidence found AFTER this review, at GATE 2 — the same failure mode, different
surface.** Restoring the `node_modules` symlink changed `npm test` from `1682 pass / 1 skipped` to
`1683 pass / 0 skipped`. The test that had been silently self-skipping was
`style: a spliced README passes the repo's prettier and markdownlint unchanged` — the single most
relevant test in the suite for a README-only change. `check-verify.mjs` sees exit 0 either way, so the
skip is **structurally invisible** to the PASS threshold. This is the candidate's claim in a second
place: the verdict confirms the members it was shown (gates that ran, exit 0) and never hunts the
member that quietly withdrew. Full analysis in `VERIFY.md`.

**Provenance (to be captured deterministically by `/pharn-dev-memory-promote`, not asserted here):**

- feature: `writes-scope-default-disclosure`
- source: `.dev/features/writes-scope-default-disclosure/GRILL.md` findings G1 and G2, both with their
  probes quoted in `evidence`; the repairs are visible in `git diff README.md` against the approved text
  quoted in `PLAN.md` `## The bullet to be written (exact text)`.

**Honest assessment against L20's bar — this may NOT clear it, and that is stated rather than argued
around.** L20 says a lesson is earned when a remedy would otherwise reduce to "remember next time" AND
the failure is recurrence-prone. The recurrence evidence here is **within one increment** (two
sentences, one sitting), which is the same range L33 and L36 were promoted at — so the shape has
precedent. But the nearest existing entries may already cover it: **L2** (a contract's honesty must
cite a LIVE floor op, verified by reading the implementation this run) and **L36** (a parameterized
value acquires variant spellings; presence is not closure). This candidate's distinct claim is narrower
than either: that **reading** the implementation is insufficient where **probing** it is cheap, and that
the quantifier is the predictable failure site. Whether that is a new lesson or a footnote to L2 is the
human's call at the promote gate — the model does not self-promote (P2).
