# SHIP — record-amendscope-hardening

Advisory roll-up. `/pharn-dev-ship` adds **no** floor primitive: every verdict below belongs to a
sub-stage checker, not to this command or to this document.

## Where the run ended

**GATE 2** — the human decision point. No RED-verdict STOP occurred.

## Stages run, in order, with the structural verdict read

| #   | Stage                | Verdict read (the deterministic input)       | Result                                                          |
| --- | -------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| 1   | `/pharn-dev-plan`    | its own approval halt                        | **GATE 1 passed** — approved as written, two questions answered |
| 2   | `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit                | **0** → proceed (L1, L20, L35 resolve + body-referenced)        |
| 3   | `/pharn-dev-build`   | `pharn/floor/validate.mjs .` exit            | **0** — GREEN, 36 capabilities → proceed                        |
| 4   | `/pharn-dev-regress` | `regression-report.json` `.verdict`          | **`no-regressions`**, exit 0 → proceed                          |
| 5   | `/pharn-dev-verify`  | `verify-report.json` `.verdict`              | **`PASS`**, exit 0, 11 gates, `failing_gates: []`               |
| 6   | `/pharn-dev-review`  | (no structural verdict — advisory by design) | GATE 2                                                          |

**Verbatim.**

- `validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`, exit 0
- `check-regress.mjs scope` → `escaped: []`, exit 0; `PLAN.md` + `GRILL.md` correctly `escape_exempt`
- `check-regress.mjs verdict` → `"verdict": "no-regressions"`, exit 0 (base `c338b9d`; `tests` 0→0, `validate` 0→0)
- `check-verify.mjs` → `"verdict": "PASS"`, exit 0
- `check-bash-reconcile.mjs --base . --require-baseline` → `CLEAN`, 4 reconciled, **0 escapes**, 3 amendments
- `npm test` → **1995 / 1995**, 0 failed, 0 skipped

## What shipped

**The obligation.** Commit `c338b9d` hardened `amendScope()` and the `--show` CLI mode in
`pharn/floor/reconcile-baseline.mjs` against a check-then-read race (CWE-367) — an `existsSync` probe
followed by a separate `readFileSync(path)` became a single `openSync` descriptor read. `pharn/floor/*.mjs`
is named in CLAUDE.md's bump-triggering set, so a `SKILLS_VERSION` bump and a CHANGELOG entry were owed
and neither had happened.

**What this increment wrote.** `SKILLS_VERSION` **5.1.0 → 5.1.1** (patch, chosen at GATE 1), the CHANGELOG
entry under the existing `### Fixed` group, and the README shields badge. Three files, all named in the
plan's `## Files`, all written through the guarded tool surface.

**The discovery that outlived the fix, measured not asserted.** Nothing verifies that a bump TRACKS the
bytes it versions. `check:changelog` asks only whether the CURRENT `SKILLS_VERSION` appears in
`CHANGELOG.md`; `check:badge` compares that same value to the README badge and disclaims the class in its
own header. **Both were exit 0 with the bump missing**, and so was all ten gates of `npm run check`.
Measured at HEAD: `26ab408..HEAD` held exactly one commit and exactly one product-surface file, with no
bump following. A per-commit sweep of all 222 commits finds 34 candidates, and that number is deliberately
**not** used — the discipline is a bump per _change_, not per _commit_, and a bump in a sibling commit of
the same PR is correct practice.

**Where the guarantee stops, in the artifact's own words:** this increment **discharges one instance** of
that gap and does not close it. A green chain here is not evidence the version story is correct — it is
evidence the three version stores agree with each other, which is exactly the blindness L43 names.

## Tests

**1995 / 1995**, 0 skipped. **+0 from this increment** — no test was added, and none was owed: no
capability, checker or behaviour changed. The `+1` against the previous increment's recorded 1994 belongs
to `c338b9d`, not here. (Recorded because that difference was misread earlier in the session as a
transcription error in `reconcile-scope-amendments/SHIP.md`; it was not — 1994 is correct for the tree
that increment describes. Established by running the suite in detached worktrees at `d0aaf6c`, `26ab408`
and HEAD.)

## Pointers (cited, not restated — P4)

- `.dev/features/record-amendscope-hardening/REVIEW.md` — four lenses; **F1** (a `blocking` finding raised
  and fixed inside the review: the CHANGELOG's "the same exit codes" was false for `--show`'s non-`ENOENT`
  path, which moved from an uncaught throw at exit 1 to a named refusal at exit 2 — and that sentence was
  load-bearing, justifying the patch bump), **F2** (the `## Files` template/parser back-tick mismatch), plus
  three process disclosures.
- `.dev/features/record-amendscope-hardening/GRILL.md` — advisory; **Q2** names the trap this increment
  could have walked into (a naive `5.1.0 → 5.1.1` sweep would have falsified two correct HISTORICAL
  sentences in `pharn/pharn-contracts/reconciliation-record.md` **and** created a second unbumped
  product-surface change).
- `.dev/features/record-amendscope-hardening/{PLAN,REGRESSION,VERIFY}.md` and the two verdict JSONs.

lesson: promoted L43

deferred:

- **The bump-tracks-bytes detector.** L43's own remedy, deferred at GATE 1 by explicit human choice with
  both design problems named: the bump-triggering set becomes a maintained enumeration (L29/L36), and a
  bump landing in a sibling commit of the same PR is correct practice yet would RED. The trigger is now
  measured and in canon, so a fourth occurrence meets a standing record rather than a fresh discovery.
- **The `## Files` template does not satisfy its own parser.** `/pharn-dev-plan`'s PLAN template renders
  `- <path> — <one line> — layer <L>` with no back-ticks; `set-writes-scope.cjs --from-plan` requires
  back-ticked paths and resolves **zero** without them. Hit live this run. Fails closed and names the
  reason, so it is friction rather than danger — but it is a defect in shipped command prose. REVIEW F2.
- **`--from-plan` silently under-resolves** (one literal path per bullet; globs dropped). Carried over
  from `reconcile-scope-amendments`, still unaddressed, still fails closed. Adjacent to the item above and
  arguably one increment with it.
- **The `## Files` bootstrap.** Widening an approved plan mid-build requires `--clear` first, because a
  plan-derived scope replaces the safe-set and therefore excludes the plan itself. Carried over; not hit
  this run.

## Standing decision

The chain ran; the named floor verdicts are as shown — this is **NOT** a judgment that the increment is
good or wise; that is the human's call at the post-review gate. Nothing was merged, pushed, or sealed by
this run.
