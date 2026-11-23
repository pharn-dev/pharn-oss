# VERIFY — core-301-no-progress-stop

Gates run through `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`32d690c6…a33c6fa`), verdict by `check-verify.mjs --stamp` (exit 1). Tree: HEAD `2295c52f` (the build, the merge of
`origin/main` 302f26f8 and the merge of `origin/fix/prettier-3.10.1-format`, #464).

| gate                 | exit |
| -------------------- | ---: |
| `test`               |    0 |
| `validate`           |    0 |
| `lint`               |    0 |
| `format:check`       |    0 |
| `lint:md`            |    0 |
| `instruction-growth` |    0 |
| `reconcile`          |    1 |

**VERIFY FAILS: gate(s) `reconcile` red — stage FAILS.**

## The reconcile red

`pharn/.run/pharn-dev-verify/gates/6-reconcile.out` lists two escapes, each `denied_by: writes-scope (snapshot)`,
scope set by this feature's PLAN (quoted as data):

- `.dev/features/observability-code-side-limit/LIMITS-5-PROPOSED.md`
- `.dev/features/release-workflow/HUMAN-PATCH.md`

Those are exactly the two files #464 (`origin/fix/prettier-3.10.1-format`, commit `9a29df8a`) reformats. The branch
was merged into this one after the build anchored, at the orchestrator's instruction, because `origin/main` 302f26f8
is red on `format:check` without it. The reconcile's `merged` exception covers bytes that `origin/main` merged in
during the window — it lists the five files of the `origin/main` merge (`install-manifest-core.mjs` and its test,
`docs/install-manifest.md`, `package.json`, `package-lock.json`) — and not a branch that has not landed on `main`.
No write in this build touched either file; the checker reports _what_ changed, never _who_ changed it.

Not edited, not re-measured elsewhere: the verdict stands as `FAIL` and the run stops here (`/pharn-dev-ship`, "A
STOP is a STOP").

## Verifiers

No verifiers registered — floor gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those deterministic gates
check._
