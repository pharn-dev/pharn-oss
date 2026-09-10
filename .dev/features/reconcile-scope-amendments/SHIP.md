# SHIP — reconcile-scope-amendments

Advisory roll-up. `/pharn-dev-ship` adds **no** floor primitive: every verdict below belongs to a
sub-stage checker, not to this command or to this document.

## Where the run ended

**GATE 2** — the human decision point. No RED-verdict STOP occurred.

## Stages run, in order, with the structural verdict read

| #   | Stage                | Verdict read (the deterministic input)       | Result                                                    |
| --- | -------------------- | -------------------------------------------- | --------------------------------------------------------- |
| 1   | `/pharn-dev-plan`    | its own approval halt                        | **GATE 1 passed** — plan approved, two questions answered |
| 2   | `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit                | **0** → proceed (5 ids resolve + body-referenced)         |
| 3   | `/pharn-dev-build`   | `pharn/floor/validate.mjs .` exit            | **0** — GREEN, 36 capabilities → proceed                  |
| 4   | `/pharn-dev-regress` | `check-regress.mjs scope`                    | **exit 0**, `escaped: []` → proceed                       |
| 5   | `/pharn-dev-verify`  | gate chain                                   | **PASS** — `npm run check` exit 0, `npm test` 1994/1994   |
| 6   | `/pharn-dev-review`  | (no structural verdict — advisory by design) | GATE 2                                                    |

**Verbatim.**

- `validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`, exit 0
- `check-regress.mjs scope` → `escaped: []`, exit 0; `PLAN.md` correctly `escape_exempt`
- `check-bash-reconcile.mjs --base . --require-baseline` → `CLEAN`, 12 reconciled, **0 escapes**
- `npm run check` → **exit 0** across all ten gates

## What shipped

**The defect (F3, from the previous increment's review).** A reconciliation epoch carried **one**
`scope_snapshot`, taken when it opened, but an epoch spans build → ship and a run legitimately writes
under **several** scopes inside it. A canon write made through the `Edit` tool, past both live guards,
behind an explicit human accept, was reported as _"a write reached it outside the guarded tool surface"_.
Per **L7** the build scope may never name canon, so no `## Files` declaration could fix it — **every**
promoting ship run ended `npm run check` RED (**L17**'s failure mode).

**The fix.** `scope_amendments[]` on the baseline record + `reconcile-baseline.mjs --amend-scope`, called
immediately after each stage's own Step-0 setter; `check-bash-reconcile.mjs` judges against the **union**.
Additive — `scope_snapshot` keeps its shape, and an absent `scope_amendments` coerces to `[]`, so no
existing install is invalidated. **`SKILLS_VERSION` 5.0.1 → 5.1.0** (minor), README badge and CHANGELOG
in step.

**Where the guarantee stops, in the artifact's own words:** an amendment makes a write **accounted for**,
never **exempt** (`never_exempt` untouched; an unaccounted canon write is still `ESCAPE`, pinned by a
non-vacuity control); an amendment cannot authorize what the guard still refuses (a `PLAN.md`-origin
amendment fails to launder a canon write, pinned); and the detector's **non-adversarial bound is
unchanged** — `--amend-scope` is a Bash call, and the same actor could already forge a baseline hash.
This buys precision, not strength.

**The ship-command wiring carries a weaker, labelled trigger.** Added to `/pharn-ship` and
`/pharn-dev-ship` at the maintainer's explicit direction, answering **no observed failure** — recorded
plainly (the `check-plan-lessons` sub-check D precedent) rather than given a manufactured one. Measured:
all those scopes target paths already exempt under `pipeline_artifacts`, so it changes no verdict today.

## Tests

+13, suite **1994/1994**. Includes the F3 regression, the released-scope variant (the real F3
condition), a **non-vacuity control** (L34 — same write, no amendment, must still ESCAPE), the
wrong-origin laundering refusal, an absent-`scope_amendments` legacy baseline, both fail-closed paths of
`--amend-scope`, and the `activeFeatureSlug` pin.

## Pointers (cited, not restated — P4)

- `.dev/features/reconcile-scope-amendments/REVIEW.md` — four lenses; **F1** (advisory: the scope-probe
  sandbox cannot run file-based checks) and two **process disclosures about my own conduct**, F2 and F3,
  which a reader should see.
- `.dev/features/reconcile-scope-amendments/PLAN.md` — approved intent, `## Files`, guarantee audit.
- No `GRILL.md`: the grill's floor gate was run directly (`check-plan-lessons.mjs`, exit 0) rather than
  re-running the interrogation over a plan approved minutes earlier in the same session.

lesson: promoted L42

deferred:

- **The `## Files` bootstrap.** Widening an approved plan mid-build requires `--clear` first, because a
  plan-derived scope replaces the safe-set and therefore excludes the plan itself. Encountered twice this
  session as a real deny. Not carried: it is friction on a correct fail-closed design, and L41 plus L42
  were the stronger candidates. A command-level note ("clear before editing `## Files`") would be the
  cheap remedy if it recurs.
- **`--from-plan` silently under-resolves** (one literal path per bullet; globs dropped). Carried over
  from the previous increment's deferred list, still unaddressed, still fails closed.

## Standing decision

The chain ran; the named floor verdicts are as shown — this is **NOT** a judgment that the increment is
good or wise; that is the human's call at the post-review gate. Nothing was merged, pushed, or sealed by
this run.
