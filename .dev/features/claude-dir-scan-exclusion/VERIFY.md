# VERIFY — claude-dir-scan-exclusion

**Branch:** `feat/claude-dir-scan-exclusion` (isolated worktree). Gates run once at HEAD, whole-repo.

## FLOOR layer — the gates that OWN the verdict

| gate                                    | exit |
| --------------------------------------- | ---- |
| `test`                                  | 0    |
| `validate`                              | 0    |
| `lint`                                  | 0    |
| `format:check`                          | 0    |
| `lint:md`                               | 0    |
| `structural:expected-injection-comment` | 0    |

`npm test` reports **1892 passing, 0 failing** — 1886 before this increment plus the **6** the new
`.dev/floor/walker-exclusion.test.mjs` adds. `validate` reports **36 capabilities, GREEN**.

The `structural:*` gate is the one committed eval pair
(`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
`.dev/features/trust-fence/findings.json`); both paths were confirmed readable before their exit code was
recorded, so an unreadable path fails loudly as a setup error rather than quietly as a gate verdict.

**Beyond the six gates the verdict consumes**, the rest of `npm run check` was also run and is clean —
`docs:check` 0, `check:markers` 0, `check:badge` 0, `check:changelog` 0, `check:contributing` 0. Those are
**not** in the gate map and did **not** contribute to the verdict; they are recorded because the increment
bumps `SKILLS_VERSION`, and `check:badge` / `check:changelog` are precisely the gates a bump can red.

## The probe was mutation-tested, which is the part worth reading

A passing test proves nothing until it has been shown to fail. `.dev/floor/walker-exclusion.test.mjs` was run
against two deliberate mutations of `pharn/floor/count-verifiers.mjs`:

| mutation                                                       | closure rule | `.claude/worktrees/wt1/` | `.claude/zzz-arbitrary/` |
| -------------------------------------------------------------- | ------------ | ------------------------ | ------------------------ |
| revert to `.claude/commands/` (the pre-fix form)               | **FAIL**     | **FAIL**                 | **FAIL**                 |
| add `.claude/worktrees/` as a SECOND member (the naive repair) | **FAIL**     | pass                     | **FAIL**                 |

The second row is the increment's central claim, demonstrated rather than argued: **the per-member repair
passes the spelling its author was looking at and fails the class.** That is L36 reproduced on demand, and
it is why the fix is closure.

## ADVISORY layer — verifiers

**No verifiers registered — floor gates only.** `node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`. Step 2 is a no-op; the verdict is the floor gates alone, and no verifier
free-text exists to quote. Membership is a frontmatter read, never a prose grep.

## Verdict

**VERIFIED: floor gates PASS.** `check-verify.mjs` exit **0**, `"verdict": "PASS"`, `failing_gates: []`.

**The honest residual (P0):** verified = **the named gates passed**. This is **not** a guarantee of
correctness beyond what those gates check — a defect no test, eval, rule or lint covers is invisible here,
and the verifier layer that might have noticed it is advisory and empty. Two claims this increment makes are
**explicitly outside** what any gate above can see, and both are labeled advisory in the plan: that the new
install footer is **true**, and that the narrowed `npm test` glob **stays** narrowed — no checker reads either.

**One thing this stage cannot verify at all, stated because its absence is easy to miss:** axis E is
**unapplied**. `.dev/features/claude-dir-scan-exclusion/proposed/APPLY.md` ships a canon repair the floor
refused to let the build perform; canon `L10` still carries no provenance and `docs/lessons-index.md` still
renders `-` in its `promoted` column. Every gate above is green **with that repair outstanding** — green here
does not mean the increment's stated work is complete.
