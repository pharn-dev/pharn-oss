# VERIFY — core-301-no-progress-stop

Gates run through `pharn/floor/run-gates.mjs` (stamp `pharn/.run/pharn-dev-verify/gates/stamp.json`, sha256
`a4a172e2…5245744c`), verdict by `check-verify.mjs --stamp` (exit 0). Tree: HEAD `db59a76c` (the build, the merge of
`origin/main` 302f26f8, the merge of `origin/fix/prettier-3.10.1-format` (#464), the regress artifacts and the first
verify's record), after the build's re-anchor.

| gate                 | exit |
| -------------------- | ---: |
| `test`               |    0 |
| `validate`           |    0 |
| `lint`               |    0 |
| `format:check`       |    0 |
| `lint:md`            |    0 |
| `instruction-growth` |    0 |
| `reconcile`          |    0 |

**VERIFIED: floor gates PASS.**

## Run 1 — FAIL, and the remedy

The first verify (stamp `32d690c6…a33c6fa`, at `2295c52f`) was **FAIL** on `reconcile` alone: two escapes, each
`denied_by: writes-scope (snapshot)` with the scope set by this feature's PLAN (quoted as data):

- `.dev/features/observability-code-side-limit/LIMITS-5-PROPOSED.md`
- `.dev/features/release-workflow/HUMAN-PATCH.md`

They are the two files #464 reformats. That branch was merged after the build anchored its reconciliation epoch,
and the reconcile's `merged` exception covers only bytes `origin/main` merged in during the window (it did list the
five files of the `origin/main` merge), not a branch that has not landed. The build never wrote either file.

Remedy, decided by the batch orchestrator under delegation (a model decision, not a human one): re-run
`/pharn-dev-build`. The build was already committed, so it wrote nothing; its Step 0 re-anchored the epoch after both
merges (3947 paths), the spec hash still matched and `validate.mjs` was GREEN. Then this stage was re-run from
`init`. The baseline was never edited. Run 2 is the verdict above.

## Verifiers

No verifiers registered — floor gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those deterministic gates
check._
