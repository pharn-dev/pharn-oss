# VERIFY — finding-backstop-class

**Verdict (FLOOR, `pharn/floor/check-verify.mjs`, exit 0): `PASS`** — every gate exit 0, by an absolute
threshold. `failing_gates: []`.

| gate                                     | exit | what it covers                                  |
| ---------------------------------------- | ---- | ----------------------------------------------- |
| `test`                                   | 0    | 2166 tests pass, 0 fail (whole repo)            |
| `validate`                               | 0    | `FLOOR: GREEN — 36 capabilities checked in "."` |
| `lint`                                   | 0    | eslint clean (whole repo)                       |
| `format:check`                           | 0    | prettier clean (whole repo)                     |
| `lint:md`                                | 0    | markdownlint clean (whole repo)                 |
| `structural:…expected-injection-comment` | 0    | the one committed eval pair                     |
| `reconcile`                              | 0    | `CLEAN` — see the disclosure below              |

The `format:check` + `lint:md` + `lint` + `test` set is exactly the repo's `npm run check` aggregate, so
this verdict tracks the full gate chain (L9).

## ADVISORY layer — the verifier slot contributed nothing

`count-verifiers.mjs .` → `{"registered":0}`. Zero `role: verifier` capabilities are authored (P7), so
there were no annotations. This is not a near-miss: the advisory layer **could not** have changed the
number, because `check-verify.mjs`'s only input is the gate→exit-code map — it cannot receive a finding
(fix #3, structural rather than promised).

## Disclosure — the `reconcile` gate REDded on its first run, and the cause was not a Bash write

Recorded in full because a reader who sees only the final `CLEAN` would miss the more interesting fact,
and because silently re-running a gate until it passes is the shape this repo exists to prevent.

**First run: `ESCAPE`, exit 1**, naming `README.md` with `denied_by: "writes-scope (snapshot)"`. Evidence
retained verbatim at `.pharn/pharn-dev-verify/reconcile-pre-amend.json`.

**What actually happened.** `/pharn-dev-build` Step 0 anchored the epoch with the plan's **5-path** scope.
Mid-build, `npm test` came back 2165/1 — `check-version-badge` REDs when the README shields badge and
`SKILLS_VERSION` disagree — so `README.md` was **declared in the plan's `## Files`**, the setter re-run to
**6 paths**, and the write made with the **Edit tool**, which the live guard **allowed**. Verified from the
baseline: its opening `scope_snapshot` still listed only the original five.

**So the detector answered its own question correctly and named a false cause.** Its question is "would
the guards, per the recorded epoch scope, have denied this?" — and against a snapshot predating a
legitimate in-stage amendment, the answer is yes. The question a reader infers is "did a write reach this
path outside the guarded surface?" — and the answer to that is **no**. This is **L38**'s shape (the single
mutable scope record versus the anchored snapshot, with the checker then reporting a false cause) and
**L42**'s (replaying a policy after the fact answers "would it allow this _per the snapshot_", not "did it
allow it _then_").

**Resolution, and what was deliberately not done.** Resolved with `reconcile-baseline.mjs --amend-scope`,
the sanctioned mechanism — `/pharn-dev-ship` Step 3 states that the epoch holds **one** opening snapshot
and that a later scope must be **amended in** to be judged. The amendment records a scope that genuinely
was set, deterministically parsed from the approved plan, and under which the write genuinely was allowed.
The baseline was **never hand-edited** and **never deleted or re-anchored**: hand-editing is silent, which
is exactly why `CLAUDE.md` forbids it by discipline rather than by a check, and re-anchoring would have
erased the epoch along with any real escape in it.

**The residual this leaves, stated rather than closed.** An in-stage scope amendment is invisible to an
open epoch unless someone amends it, and the failure mode is **asymmetric**: forgetting to amend yields a
loud false ESCAPE (as here), while the reverse — a genuine Bash escape to a path that a later amendment
happens to cover — would be silently absorbed. That second direction is not detected by anything, and
nothing in this increment changes it. Carried to Step 2b as the lesson candidate.

## Bounds (P0)

- `PASS` means **exactly** "the named gates exited 0". It does **not** mean the increment is correct,
  well-designed, or wise.
- `test` / `validate` / `lint` / `format:check` / `lint:md` are **whole-repo**; the feature-specific
  correctness signal is the `structural:*` gate plus this feature's own tests inside `npm test`.
- `reconcile` `CLEAN` means **no escape was detected**, never that none occurred — the reconciled set
  excludes gitignored paths, the window is anchor→reconcile, and there is **no attribution**
  (`pharn/pharn-contracts/reconciliation-record.md`).
- The gate **set** is advisory orchestration; only the verdict over it is floor. Nothing floor-locks the
  two style gates into the map.
