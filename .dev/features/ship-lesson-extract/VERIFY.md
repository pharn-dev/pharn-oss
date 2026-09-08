# VERIFY — ship-lesson-extract

## FLOOR layer — the deterministic gates (these OWN the verdict)

| gate                                           | exit | note                                                  |
| ---------------------------------------------- | ---- | ----------------------------------------------------- |
| `test` (`npm test`)                            | 0    | 1683 tests, 1683 pass, 0 fail — 1671 → **1683** (+12) |
| `validate` (`pharn/floor/validate.mjs .`)      | 0    | GREEN, 36 capabilities                                |
| `lint` (`npm run lint`, eslint)                | 0    | clean                                                 |
| `format:check` (`npm run format:check`)        | 0    | clean                                                 |
| `lint:md` (`npm run lint:md`)                  | 0    | clean, 1060 files                                     |
| `structural:…/expected-injection-comment.json` | 0    | the one committed eval pair                           |

The gate set is exactly the repo's `npm run check` aggregate plus `validate` and the eval pair, so this
verdict tracks the full `npm run check` (L9). Both eval-pair paths were confirmed readable before their
exit code was recorded (L5 / L16 / L21) — an ENOENT there exits 1 and would have been recorded as a gate
result rather than surfacing as the setup error it is.

**This report was RECOMPUTED after `/pharn-dev-review` found a blocking defect and it was remediated.**
The first run recorded 1682 tests and PASS over the pre-fix text — a PASS that was true about the gates
and blind to the defect, which is `REVIEW.md`'s floor-gate finding and this section's residual meeting in
one place. Every gate below was re-run at the post-fix HEAD; a carried-forward PASS would have been the
disease.

**The +12 tests are this increment's own**, all in `.dev/floor/command-hygiene.test.mjs`: the
`/pharn-dev-memory-promote` invocation is present · that rule DISCRIMINATES against a body with the
invocation stripped · `writes:` names no `memory-bank` path (**the L7 guard**) · that guard discriminates
against an injected canon path · lesson-extract precedes the `SHIP.md` write by line-initial heading
offset · the five `LESSON_OUTCOMES` are each specified · **the outcome set is CLOSED** — every
back-ticked `lesson: …` the command writes must be a member, so a variant spelling of any outcome fails
here (the rule added by the review's remediation, mutation-tested against the pre-fix text: it catches
`` `lesson: not-reached (<stop>)` `` by name) · the wiring set is non-vacuous with both its total (3) and
wired count (1) pinned.

**Worth stating plainly, because it is the honest reading of the table above:** all six gates were green
over the defective text too. The spelling split was found by a **lens**, not by a gate, and the gate that
now catches it exists only because the lens found it first. That is the residual below, demonstrated
rather than asserted.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.

**No verifiers registered — floor gates only.** Step 2 was a no-op; the verdict is the floor gates alone.
Membership was read from `---`-fenced frontmatter by the deterministic counter, never grepped from prose
(a `role: verifier` string in this very file is DATA about verifiers, not a declaration of one).

## Verdict (FLOOR — `check-verify.mjs`, exit 0)

**VERIFIED: floor gates PASS.** Every gate exited 0; `failing_gates[]` is empty. No verifier finding
entered this number — the helper's only input is the gate→exit-code map, so it could not have.

**The honest residual (P0/P7):** verified = **the named gates passed**; this is NOT a guarantee of
correctness beyond what those gates check. It is worth being blunt about the shape of that residual
**for this particular increment**, because it is unusually wide:

- The built surface is **command prose**. The 11 new tests assert that `.claude/commands/pharn-dev-ship.md`
  **contains** the right invocation, in the right order, with the right outcome vocabulary. They cannot
  observe a run: nothing here proves Step 2b executed, that a human was actually asked, that an accepted
  candidate reached `/pharn-dev-memory-promote`, or that a proposed candidate was not silently dropped.
- That gap is **structural, not an omission** — commands carry no `role:`, so they are not Capabilities,
  ship no `evals/`, and no runner (`/pharn-dev-eval` included) can execute a behavioral case over one.
  `pharn/floor/validate.mjs` ignores `.claude/commands/` entirely.
- **"The wiring is pinned" therefore never means "the lesson was extracted."** The strongest true
  statement available from this stage is that the command _says_ the right thing and that saying it did
  not break the repo.

The one property this increment claims that a gate genuinely holds is the **L7 guard**: `writes:` names
no canon path, so the fix #7 hook denies a Write/Edit/MultiEdit/NotebookEdit to `.dev/memory-bank/**` from
`/pharn-dev-ship`. That is floor for the `PreToolUse` surface only — a Bash-run append would bypass it
(L19) — and the new test pins the declaration itself so a future re-widening fails here rather than
silently granting the ungated canon write.
