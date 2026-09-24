# REVIEW — verify-ac-gate

Floor first: `node pharn/floor/validate.mjs .` → **GREEN**. Method:

- one independent read-only reviewer agent over the whole diff. It ran 534 tests across the touched and related
  suites, and ran four small experiments (EXP1–EXP4) in temp dirs.
- after the fix pass, a second read-only agent re-checked each fix (iteration 2, below).

The increment is `trust: untrusted`, and no instruction-looking content was found.

## Iteration 1 — GREEN (0 blocking), 9 should-fix, 5 notes

Every finding was fixed in the fix pass except #11, which is recorded as a bound. Principles cited per the lens.

1. **should-fix · correctness · P0.** The "once-red" check ran one way only: a test recorded red for an AC that the
   head run no longer reported (EXP1: an error-path case dropped) left the AC delivered. **Fixed:** such a test is
   `ac-untested`, with a fixture and a control.
2. **should-fix · honesty · P0.** The verdict's definition was not updated for `--ac-gate` ("exit codes alone",
   "PASS iff every gate…"). **Fixed** in:
   - `check-verify.mjs`: the header, the table note and the Exit line;
   - `verify-report.md`: the IS line, the PASS meaning and the `gate_run` consumer paragraph;
   - `pharn-verify.md`: FLOOR item 1 and the reconcile bullet.
3. **should-fix · honesty · P0.** "verified it means EXACTLY … every AC's locked, once-red test passed" was false for
   bootstrap and legacy SPECs. **Fixed:** the description and the residual line now state all three modes.
4. **should-fix · honesty · P0.** The "does not catch" list differed across surfaces, and none named `.npmrc`.
   **Fixed:** stated once in `test-infra-core.mjs`, restated in the contract, and cited from the README, CLAUDE.md,
   `pharn-verify.md` and the CHANGELOG entry. `.npmrc` is added (stated, not pinned — P7).
5. **should-fix · correctness · P5.** Check I sent ANY non-zero test-stage exit to S13, a crash included.
   **Fixed:** only exit 1 with a `RED` token is `ac-evidence-invalid`; exit 2 or a crash stays `front-stage-red`.
   Pinned by a WIRING test that deletes the stage's child module and runs the pinned line.
6. **should-fix · tests · P0.** The headline case — every real gate green, an AC skipped — was never run through
   `check-verify` or the loop, and STOP_GREEN's unreachability was shown for three reasons only. **Fixed:**
   - a CLI test (`failing_gates == ["ac-delivery"]`);
   - step 1b of the loop end-to-end (CONTINUE);
   - a table test running every delivery and evidence reason, plus one record reason, through
     `check-verify --ac-gate` (never PASS);
   - the Step 6c commit gate, asserted in step 3.
7. **should-fix · correctness · L59.** Check J hashed the results file with `readFileSync`, which follows a link and
   blocks on a FIFO. **Fixed:** it uses `sha256RegularFile` (O_NOFOLLOW|O_NONBLOCK).
8. **should-fix · wiring · P5.** A `/2` test-first lock with a red run passed the pre-build gate, so the build ran and
   verify then always failed (EXP4). **Fixed:** `check-test-stage.mjs` REDs `lock-red` for a test-first lock with no
   pin, before the build. Also updated: the contract, CLAUDE.md and the plan's `## Files`.
9. **should-fix · honesty · P4.** `ac_gate.reason` was null on a record-caused INCONCLUSIVE, contrary to the contract.
   **Fixed:** the block carries the first unmeasured AC and its reason, and the contract says so.
10. **note.** The RUN-REPORT comment said the table "cannot disagree with the verdict". **Fixed:** scoped to the loop
    (ship has no freshness binding).
11. **note.** A SPEC reverted to Draft with its lock intact passes the gate (EXP3). **Recorded as a bound** in the
    `ac-gate-core.mjs` header: `/pharn-verify` Step 2 and loop check I refuse it.
12. **note.** In bootstrap, the first `not-configured` gate stops the walk (EXP2). **Stated** in the header: every gate
    at a level must be configured, the preflight's rule.
13. **note · P2/L22.** `VERIFY.md` had the model retype the per-AC rows. **Fixed:** `VERIFY.md` states the verdict,
    the mode and the failing AC ids, and cites the `ac_gate` table.
14. **note.** `pharn-loop.md`'s CONTINUE line read as if an undelivered AC could be INCOMPLETE. **Fixed.**

### The brief's acceptance, as the reviewer tabulated it, after the fix pass

- **One fixture per reason (each alone), plus unpinned, bootstrap, legacy, all-green and another feature's
  `AC-1:`:** met.
- **End to end:** met. The flow is undelivered → CONTINUE, the headline case → CONTINUE, fixed → STOP_GREEN, then a
  Bash edit → S13 at the freshness line, STOP_TERMINAL at the stop core, and no commit at both the commit gate and
  the decision re-derivation.
- **STOP_GREEN unreachable:** met, for every reason through `check-verify` and through the real stop core.
- **Contracts, the README sentence, ≥90 % coverage (`VERIFY.md`), the MINOR bump, the CHANGELOG, protected
  follow-ups, correcting the record:** met.

## Iteration 2 — RED on wording, then fixed; code fixes all CONFIRMED

A second read-only agent re-checked each fix and ran 336 tests (all pass). The code fixes (1, 5, 7, 8, 9) were
CONFIRMED. It found no new blocking defect, but REDed the wording of fix 2/3, and was right to:

- Three lines still promised "every AC delivered" for any **templated** SPEC, a `spec_kind: test-infra` SPEC included:
  the `pharn-verify.md` "Guaranteed" bullet and description, and the `verify-report.md` IS line. **Fixed:** they say
  test-first, and name the bootstrap and legacy cases.
- `check-verify.mjs`'s HONEST SCOPE paragraph was unqualified. **Fixed.**
- Fix 5 had a test gap: the WIRING test produced only exit 2, never the exit-1 crash that the `RED`-token
  condition exists for. **Fixed:** the same test now replaces the fixture's gate with `process.exit(1)`, and
  removing the condition fails it.
- Nits, all fixed:
  - `gate-run-record.md`, CLAUDE.md (both check I summaries) and the CHANGELOG now say "RED only";
  - the contract's INCONCLUSIVE `reason` now includes the unusable-SPEC case;
  - the pin module's "stated where" line and the CHANGELOG's "not caught" list now say it is partial.

Gates re-run after these edits: 3207/3207, verify PASS (clean copy), regress `no-regressions`, every chain gate 0.

## Lessons

`none` promoted. The defects recur existing lessons:

- #1 is a one-directional binding, the L58 family;
- #5 is a verdict read from an exit class that also carries crashes, the L45 family;
- #7 recurs L59 exactly;
- #13 recurs L22.
