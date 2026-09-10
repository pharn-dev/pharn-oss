# REVIEW — record-amendscope-hardening

- reviewed: the working-tree increment on top of `c338b9d`
- floor: `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities, exit 0
- trust posture: the increment under review is `trust: untrusted` (P2). Nothing instruction-looking was
  found in the reviewed files, and nothing in them was followed as an instruction.

## The four lenses

### L-floor → P0 (the governing lens)

**This increment makes no new guarantee, and that is the correct shape for it.** It writes three literal
values into three files. Two existing floor primitives check them (`check:badge`, `check:changelog`,
both enum/regex — primitive #3), and both were exit 0 **before** the increment as well, which the
`VERIFY.md` bounds section states rather than letting the green read as vindication.

**The claim that was NOT made:** that this increment closes the gap it discovered. The plan says so in
its own words — _"Do not write that this increment closes that gap; it discharges one instance of it"_ —
and the CHANGELOG entry repeats it. The gap (nothing verifies a bump TRACKS the changed bytes) is
carried in `deferred:`, measured, with the two design problems that a detector would have to solve.

- **F1 — `severity: blocking`, FOUND IN THIS REVIEW AND FIXED, then re-verified.** The first draft of the
  CHANGELOG entry read _"no observable contract moves — the same return shapes, the same exit codes, the
  same message strings."_ **The exit-code half is false.** Checked against `26ab408`'s bytes rather than
  against the diff's shape: `--show`'s `readFileSync` sat **outside** any `try`, so a non-`ENOENT` read
  failure (`EACCES`, `EISDIR`, a mid-read I/O error) threw **uncaught** — Node exit **1** with a stack
  trace. Post-`c338b9d` it is caught and reported at exit **2**. A caller branching on `--show`'s exit
  code sees a different number for the same condition.

  This mattered beyond pedantry: the sentence was doing **load-bearing work**, justifying "patch" as the
  bump size. The entry now states the moved path explicitly and rests "patch" on the accurate ground (no
  capability added; every **success** path byte-identical). The bump size does not change — a strictly
  better error path is a correction, not a capability — but the justification had to stop being false to
  get there. `amendScope()` was re-checked in the same pass and has **no** counterpart change: its
  `readFileSync` was already inside the `try`.

  Recorded as blocking rather than advisory because P0 is precisely about a sentence claiming more than
  the bytes support, on the product surface, where nothing reads prose.

### L-eval → P1

Not applicable by membership test: no file in this increment carries a `role:` key, so no capability was
added or changed. This was **predicted in the plan and then checked**, not assumed — `validate.mjs`
reports 36 both before and after, and an unchanged count is exactly the observable the plan named for
this claim.

### L-trust → P2

No untrusted artifact is ingested and no taint propagates. The single piece of free text consulted is
`c338b9d`'s commit message (the bare word `fix`), read as DATA to identify the commit; the entry's
content is derived from the **diff**, read directly. `GRILL.md` F2 notes the consequence honestly — with
the commit message empty of information, this CHANGELOG entry becomes the only durable description of
what that commit did, which raises the entry's burden rather than lowering it.

### L-axis → P3

No layer edges moved; no layer was touched. `SKILLS_VERSION`, `CHANGELOG.md` and `README.md` are the root
version surface and repo-meta, outside the `pharn-contracts` → `pharn-core` → leaf tree entirely. The
product-surface file that changed (`pharn/floor/reconcile-baseline.mjs`) changed in `c338b9d`, **not
here** — this increment records it and deliberately does not touch it.

## Findings carried forward (ADVISORY)

- **F2 — the `## Files` template and its parser disagree, in shipped command prose.**
  `/pharn-dev-plan`'s own PLAN template renders the section as `- <path> — <one line> — layer <L>`, with
  **no back-ticks**. `set-writes-scope.cjs --from-plan` requires back-ticked paths and finds none —
  it refuses with _"no back-tick paths under `## Files`"_. Following the command's own template
  therefore produces a plan whose build scope resolves to **zero** paths. It hit this run and cost a
  correction pass. **It fails closed and names the reason**, so this is friction, not danger — but a
  template that does not satisfy its own parser is a defect in shipped prose, and it is adjacent to the
  previous increment's still-open `deferred:` item about `--from-plan` under-resolving. Carried to
  `deferred:`, not silently absorbed.

## Process disclosures (my own conduct, recorded because nothing else would)

- **Every product-surface write in this increment went through the guarded tool surface** (`Edit` on
  `SKILLS_VERSION`, `README.md`, `CHANGELOG.md`). Stated because the previous increment's review had to
  disclose the opposite (a `python3` heredoc used for a mechanical multi-site insertion), and a
  correction is only visible if the corrected behaviour is named too.
- **Two throwaway git worktrees were created and removed** (`git worktree add --detach` at `d0aaf6c` and
  `26ab408`, plus the regress baseline at `c338b9d`). All three were outside the repo root, read-only,
  and removed; `git worktree list` shows only the main tree. They were what established that the 1994 →
  1995 test-count difference was a **later commit**, not suite non-determinism — a conclusion I had
  reported wrongly before measuring it, and corrected here.
- **A mid-review scope change was amended into the epoch rather than left implicit.** Fixing F1 required
  re-scoping from the review artifact back to the plan's `## Files`; `reconcile-baseline.mjs
--amend-scope` was run immediately after the setter, recording amendment 1. The final `reconcile`
  verdict is `CLEAN` with 0 escapes and the epoch carries an honest record of both scopes — the
  mechanism shipped in 5.1.0 exercised on its own follow-up.

## Floor verdicts standing

| gate                                          | verdict                                                |
| --------------------------------------------- | ------------------------------------------------------ |
| `check-plan-lessons.mjs` (the grill gate)     | GREEN, exit 0 — L1, L20, L35 resolve + body-referenced |
| `validate.mjs .`                              | GREEN, 36 capabilities, exit 0                         |
| `check-regress.mjs scope`                     | `escaped: []`, exit 0                                  |
| `check-regress.mjs verdict`                   | **`no-regressions`**, exit 0                           |
| `check-verify.mjs`                            | **`PASS`**, exit 0, 11 gates, `failing_gates: []`      |
| `check-bash-reconcile.mjs --require-baseline` | **CLEAN**, 3 reconciled, 0 escapes, 1 amendment        |
| `npm test`                                    | **1995 / 1995**, 0 skipped                             |

## Honest bounds on this review (P0)

- The four lenses are model judgment. The verdicts above belong to their checkers, not to this document.
- **No gate here can see the thing this increment is about.** Every gate would have been green with the
  bump absent — that is the measured fact that produced the increment. A green chain is therefore not
  evidence the version story is now correct; it is evidence the three version stores agree with each
  other.
- "Reviewed" never means "correct".
