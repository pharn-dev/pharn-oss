# SHIP — canon-write-denylist

## Where the run ended

**At GATE 2, carrying a HALTED build.** The chain did not stop on a RED floor verdict; it stopped at the
**write surface**, one step earlier than any verdict, and then continued to the disclosure that could
ship. Recorded as a partial roll-up because that is what happened.

## Stages, in order, with the verdict each one actually produced

| Stage                | Ran        | Structural verdict read                                                                                                                                          |
| -------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pharn-dev-plan`    | yes        | `check-plan-lessons.mjs` → **exit 0** (12 ids resolve + referenced in body)                                                                                      |
| GATE 1               | yes        | **approved — by the agent under an explicit delegation, not by a human** (see below)                                                                             |
| `/pharn-dev-grill`   | yes        | `check-plan-lessons.mjs` re-verified → **exit 0**; spec hash matched; 7 advisory concerns (2 blocking-severity), both folded into the plan                       |
| `/pharn-dev-build`   | **HALTED** | Step 0 fix #7 refused, then resolved 11 paths with `--allow-claude-dir`; Step 1 fix #4 hash **matched**; **Step 2 DENIED by `protect-trusted-paths.cjs` itself** |
| `/pharn-dev-regress` | no         | not reached — there is no build to regress against                                                                                                               |
| `/pharn-dev-verify`  | no         | not reached                                                                                                                                                      |
| `/pharn-dev-review`  | no         | not reached                                                                                                                                                      |

`node pharn/floor/validate.mjs .` → **`FLOOR: GREEN — 36 capabilities checked`**, exit 0. Recorded with
its bound: the floor walks the `pharn/` capability surface and deliberately ignores `.claude/`, so it
never had an opinion about this increment. A green line here is not a verdict on work that did not
happen (P0).

## Why the build halted, and why that is the finding rather than an obstacle

**All three write-guard scripts are protected by the very hook this increment set out to harden**, so no
version of the fix is agent-writable. Probed live (`exit 2` = denied):
`protect-trusted-paths.cjs` **2**, `enforce-writes-scope.cjs` **2**, `set-writes-scope.cjs` **2**,
`protect-trusted-paths.test.cjs` **0**. The denylist has to compose with an existing case-fold +
segment-wise-symlink-resolution + fail-closed decision path, so it could only live in one of those three
files. The increment is therefore **structurally human-only**.

Three routes past it exist and **none was taken**: a Bash write (`CLAUDE.md` forbids routing an in-repo
write through Bash to dodge the guard), unwiring the hook in `settings.json` (protected, and the exact
self-escalation the guard exists to stop), and `PHARN_PROTECTED` (extends only — there is no reducing
knob, by design).

## What shipped

- `README.md` `## Current limitations` — the gap **disclosed where a user looks**. It had been recorded
  only in a command file, a test comment and a CHANGELOG entry. `LIMITS.md`, the finding's preferred
  home, is hook-protected and human-only; the README bullet is the shippable half.
- `CHANGELOG.md` `[Unreleased] → Deferred` — the full record, including the refusal to overclaim.
- `.dev/features/canon-write-denylist/proposed/` — the complete replacement hook, a standalone probe
  (**59/59, exit 0**), and `APPLY.md` for whoever lands it.
- `PLAN.md`, `GRILL.md`, `BUILD.md`, this file — the audit trail.

**`SKILLS_VERSION` deliberately NOT bumped** (stays `3.0.2`): no product-surface byte changed, and
`README`/`CHANGELOG` are repo-meta and non-bumping. The task assigned `3.0.9` on the premise the hook
would change; it did not, and advertising a guarantee that is not in the tree is the P0 disease.

## The two human gates

- **GATE 1 — approved by the agent under an explicit delegation from the parent session. No human was
  in the loop.** Stated plainly because `/pharn-dev-plan`'s halt is advisory (`LIMITS.md §1d`: the floor
  cannot verify a human said yes), so an unlabelled "approved" would read as a gate that did not occur.
- **GATE 2 — this is it, and the decision is the reviewer's.** The one decision that matters is whether
  to apply `proposed/protect-trusted-paths.cjs`. Nothing was merged, sealed, or self-approved.

lesson: none — the run's own best candidate ("a guard that protects its own source cannot be hardened
by the agent it constrains") is a real observation, but L20's bar is a **second** occurrence of a
recurring mechanism failure and this is a first; proposing it would manufacture the trigger P0 names.
It is recorded in `BUILD.md` and in the PR body instead, where a human can decide whether it recurs.

deferred:

- `canon-write-denylist` **itself** — prepared, probed, unapplied; needs a human (`proposed/APPLY.md`).
- The seven expiring doc sentences — they expire only **if** the hook lands, so editing them now would
  make the docs false in the other direction. Enumerated in `proposed/APPLY.md` step 4.
- Porting `probe.mjs` into `protect-trusted-paths.test.cjs` so `npm test` covers it. That file **is**
  agent-writable, but shipping tests for a hook that is not there would be a red suite.
- The suggested `THREAT-MODEL.md §3` sharpening — human-only; text supplied, not applied.

Chain ran to `/pharn-dev-build` and halted there; the named floor verdicts are as shown — this is **not**
a judgment that the increment is good or wise, and the disclosure that did ship is not a fix. That is the
human's call at this gate.
