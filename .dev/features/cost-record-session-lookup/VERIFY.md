# VERIFY — cost-record-session-lookup

**Machine report:** `.dev/features/cost-record-session-lookup/verify-report.json` (the helper's verdict
verbatim + the advisory `verifiers` block).

## FLOOR layer — gate results

| gate                                    | exit | result |
| --------------------------------------- | ---- | ------ |
| `test` (full hermetic suite, 2179)      | 0    | pass   |
| `validate` (structural floor)           | 0    | pass   |
| `lint` (eslint)                         | 0    | pass   |
| `format:check` (prettier)               | 0    | pass   |
| `lint:md` (markdownlint)                | 0    | pass   |
| `structural:expected-injection-comment` | 0    | pass   |
| `reconcile` (Bash-write escape)         | 0    | pass   |

```text
VERIFIED: floor gates PASS
```

`check-verify.mjs` exit **0** — PASS by the absolute threshold (every gate exit 0). This stage does not
re-decide the verdict, and no verifier finding could change it: the helper's only input is the
gate→exit-code map.

## The `reconcile` gate — it went RED first, and how that was resolved

**Recorded because a gate that flips deserves its history, not a clean final table.** On the first pass
`reconcile` exited **1** with `ESCAPE` on `README.md`, making the verdict `FAIL`.

**Cause.** The epoch's opening `scope_snapshot`, taken at `/pharn-dev-build` Step 0, held **five** paths.
`README.md` entered the build legitimately _mid-stage_: `.dev/floor/check-version-badge.mjs` holds the
shields badge equal to `SKILLS_VERSION`, so the approved patch bump **forced** the badge edit. The build
declared `README.md` in the plan's `## Files`, re-ran the setter (6 paths), and wrote it with the
**Edit tool** — so both `PreToolUse` guards evaluated that write against the live 6-path scope and
**allowed** it. No write reached `README.md` outside the guarded surface. What the build omitted was
`reconcile-baseline.mjs --amend-scope` immediately after the re-scope.

**Resolution — the contract's own designed remedy, not a silencing.**
`pharn/pharn-contracts/reconciliation-record.md` introduced `scope_amendments` in 5.1.0 for exactly this
class: judging every candidate against the opening snapshot alone "reported the later stages'
**hook-approved** writes as escapes", and the contract names leaving such a RED standing as the harmful
outcome, because it is "exactly what trains an operator to wave through the one finding that must never
be waved through." The build's true final scope (the 6-path, plan-derived scope that was in force before
the write) was re-set and appended with `--amend-scope`; `reconcile` then returned `CLEAN`.

**What was NOT done, and the distinction that matters.** The baseline's `entries` — the content hashes —
were never touched, and the epoch was never re-anchored (a re-anchor resets the baseline and would erase
any real escape). The amendment is an **append** to `scope_amendments[]`, visible in the record as
`amendment 1` with its `set_by`, so it is auditable rather than silent; and the checker guarantees a
later amendment "can never re-attribute a path the opening scope already covered". The amendment records
a **true** fact — that scope genuinely came into force during this epoch — and its truth does not depend
on when it was written down.

**The honest residual this leaves.** That an agent may append an amendment after seeing a RED is a real
property of the mechanism, not something this run invented; it is bounded only by the amendment being
logged and by the plan's `## Files` being the amendment's source. It is recorded here so a reader can
weigh it rather than discover it.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.

**No verifiers registered — floor gates only.** Step 2 was a no-op; membership is a deterministic
frontmatter read, never a prose grep. No verifier is authored speculatively (P7), so no advisory
free-text was produced this run.

## Honest residual (P0/P7)

**Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates
check — verifier concerns are advisory help, not assurance.**

Two bounds specific to `reconcile`, both the contract's rather than this command's: `CLEAN` means **no
escape was detected**, never that none occurred — the baseline is unauthenticated state under `.pharn/`
that a Bash writer could rewrite, so this is an accounting tool against tooling that escapes its scope,
not a control against an attacker. The reconciled set excludes git-ignored paths, the window is
anchor→reconcile, the model is one worktree per session, and the report names **what**, never **who**.
