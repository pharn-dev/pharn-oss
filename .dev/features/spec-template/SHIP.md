# SHIP — spec-template

Branch `spec-template` off `main` = `2bea57c`. Nothing is committed, pushed or merged; the working tree holds
the increment for the human.

## Stages run, in order

1. **`/pharn-dev-plan`** → `PLAN.md`. It ended at **GATE 1**, where the human approved it as written and
   resolved three decisions:
   - (a) the template lives at `pharn/pharn-contracts/templates/spec-template.md`, because the brief's
     `pharn-pipeline/templates/` is never installed;
   - (b) the rules are checker constants citing the contract;
   - (c) the loop record's `spec:` set gains `not approved`.
2. **`/pharn-dev-grill`** → `GRILL.md`. The lessons re-verify (`check-plan-lessons.mjs`) exited **0**.
   It raised 14 advisory concerns, 1 of blocking severity, and all were folded into the plan before the
   build.
3. **`/pharn-dev-build`** → `validate` exited **0** (`FLOOR: GREEN — 36 capabilities checked`), and
   `npm run check` was GREEN.
4. **`/pharn-dev-regress`** → `.verdict` `no-regressions`.
5. **`/pharn-dev-verify`** → `.verdict` `PASS`.
6. **`/pharn-dev-review`** iteration 1 → **3 floor-gate findings** (R1–R3) and 7 advisory. At **GATE 2**
   the human chose **"fix all 10"**, then **"iterate until the work is done"**.
7. **Fix round 1** (R1–R10), then regress `no-regressions`, verify `PASS`, and review iteration 2. That
   review confirmed nine of the ten fixed and R8 only partly, and found four new defects (N1–N4) the fix
   round had introduced.
8. **Fix round 2** (N1–N4, plus the rest of R8 and R9), then regress `no-regressions`, verify `PASS`, and
   review iteration 3: **no defects remain.**

## Standing structural verdicts (final — iteration 3)

- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit **0**.
- `/pharn-dev-regress` → `regression-report.json` `.verdict` **`no-regressions`** (the helper's
  `check-regress.mjs verdict` exited 0). All three outside gates were 0 → 0.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` **`PASS`**, `failing_gates: []`. The seven gates
  were `test`, `validate`, `lint`, `format:check`, `lint:md`, the trust-fence structural gate, and
  `reconcile`, which was `CLEAN` with no escapes.
- After the lesson promotion, a final `npm run check` was GREEN on the tree as it stands (2875/2875).

Supporting evidence, recorded rather than gated:

- **Legacy differential (G5):** `main`'s `check-spec.mjs` against the new one gave byte-identical stdout,
  stderr and exit codes on all **80** runs: 20 inputs (both committed SPECs and 18 legacy fixture shapes)
  under 4 modes. The independent reviewer's own differential gave **216/216** identical.
- **Coverage** (`node --test --experimental-test-coverage pharn/floor/check-spec.test.mjs`, measured through
  the spawned CLI): **97.43 %** of `check-spec.mjs` lines and **100 %** of `spec-template-core.mjs` lines.
- **Mutation checks:** 19 mutants were run across the rounds. Every one is now caught, two of them only
  after a fixture was added for it (M7, N5).
- **Grep proof:**
  `grep -nE '^## (Intent|Scope|Acceptance Criteria|Constraints)$|^\*\*Out of scope:\*\* <' .claude/commands/pharn-spec.md`
  prints nothing (exit 1), so the inline skeleton is gone.

Artifacts: `REVIEW.md` holds three iterations of findings (free text quoted as DATA) and `GRILL.md` holds
the advisory grill-log. Neither is restated here.

## Beyond the brief, stated for the human

- **Template path:** `pharn/pharn-contracts/templates/`, not `pharn-pipeline/templates/`. Decided at GATE 1.
- **The stale cite:** `pharn/floor/gate-run-core.mjs:15`'s `CHANGELOG.md:1817-1818` now reads
  `CHANGELOG [6.3.0]`, and `CLAUDE.md`'s sentence about it is past tense. This fixes the deferral `CLAUDE.md`
  scheduled for the next increment that bumps (grill G10).
- **R10 split:** a new floor module, `pharn/floor/spec-template-core.mjs`. `check-loop-fresh.test.mjs`'s
  sandbox list gained it, and the generated README checker count went from 68 to 69.
- **`/pharn-loop`:** besides the S6b row, three sentences name S6b, and three sentences (plus the
  description) allow a never-approved SPEC.

## Trusted docs — edited by the human after GATE 2, outside the agent loop

These edits are staged in the index:

- `LIMITS.md` §1d gained the "phrased testably, not tested" bound and the opt-in note.
- `pharn/ARCHITECTURE.md` §4 lists the `spec-template` contract, and §6's spec row names `spec_template` as
  provenance. The file's content hash moves from `2f8b9264…d77e838` to `edc3d07d…a5d2c`. This plan's pin
  is now historical, and the next `/pharn-dev-plan` pins the new hash.

The agent then aligned the contract's opening sentence with the new §6 row and replaced the CHANGELOG's
follow-ups bullet with a record of the edits.

**Reconcile after the edit: `ESCAPE`, and the cause is known.** `check-bash-reconcile.mjs --base .` lists
exactly `LIMITS.md` and `pharn/ARCHITECTURE.md`, the two human-edited files. The reconciler has no
attribution, so a legitimate human edit to a guard-protected path looks the same to it as an agent's Bash
escape. The last reconcile before those edits was `CLEAN` (16 paths). This RED exists only in this
machine's gitignored `.pharn/` epoch; a CI checkout has no baseline, and `check:reconcile` is GREEN there
as `NO_BASELINE`. Every other gate of `npm run check` is GREEN, including `npm test` at 2875/2875.

**Re-anchored at the human's direction ("all needs to be green").** With the escape list attributed in
full to the two human edits, a fresh epoch was opened through the tool, never by deleting or hand-editing
the baseline:

```bash
node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/spec-template/PLAN.md
node pharn/floor/reconcile-baseline.mjs --anchor --by pharn-dev-build-reanchor
```

The scope is set first, exactly as `/pharn-dev-build` Step 0 orders it, and the order matters. A first
attempt anchored with no scope set, so the fail-closed default was snapshotted. Under that default, the
seven always-reconciled floor files this increment legitimately changed read as escapes against their
committed blobs. Re-anchoring under the plan's 15-path scope gives `check-bash-reconcile.mjs
--require-baseline` → `CLEAN` (7 reconciled, 0 escapes).

**What this costs, stated:** the new epoch can no longer see changes made before it was opened. The only
such changes since the last `CLEAN` check were the two human-edited trusted docs, and the escape list
shows that.

## PR #251 — CI follow-up

Every CI check passed except **CodeQL**. It raised one new alert, `js/bad-tag-filter` (high), at
`pharn/floor/spec-template-core.mjs:154`, because the HTML-comment end regex `/-->/` does not also accept
`--!>`. That rule is written for HTML **sanitizers**, and this code is not one. It decides which `##`
headings a markdown renderer shows, and CommonMark ends an HTML-comment block only at `-->`. Probed with
markdown-it (`html: true`): a comment "closed" only by `--!>` keeps the next `## Scope` hidden, which is
what the checker says.

Accepting `--!>` would therefore un-hide a heading the renderer hides (fail-open). The fix keeps the
CommonMark behaviour and makes it explicit:

- the end conditions are literal substring tests;
- the reason is stated in `spanned()`'s header;
- two new `section` RED fixtures pin it: a comment "closed" only by `--!>`, and an uppercase `<PRE>` block.

`check-spec.test.mjs` passes 150/150.

changelog-entry: exit 0

lesson: promoted L56

deferred: none

This SHIP.md was written after the promotion and the final `npm run check` above.

---

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise;
that is the human's call at the post-review gate._
