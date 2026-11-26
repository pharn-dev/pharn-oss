# VERIFY — loop-host-execution-consent (Linear CORE-397)

**VERIFIED: floor gates PASS** (`check-verify.mjs --stamp`, exit 0; stamp sha256 `da0efe54…11ecfa`, run 4).

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

Completeness: every concrete `## Files` path is present (no INCOMPLETE). Verifiers: 0 registered, so there is no
advisory layer and no findings.

The tree this verdict covers: the build plus the review-nit fix (the ADVISORY label in Step 1a), with
`pharn/LIMITS.md` at main's bytes. The human's LIMITS.md sentence lands **after** this verdict (L68), followed by a
regenerated `pharn-install.json`. So the final PR tree differs from the verified one in exactly those two files.

## History — every run of this stage, recorded verbatim

- **Run 1** (stamp `a94ced9a…`): **FAIL**, `failing_gates: ["lint"]`. `eslint .` reached this ship's own scratch
  runner under git-ignored `pharn/.run/` (an unused import), not a build path. The scripts were deleted and the stage
  was re-run from `init`.
- **Run 2** (stamp `6c9fd08b…`): **PASS**. Then GATE 2, where the human chose to fix the review nits first, so the
  stage ran again after the fix.
- **Run 3** (stamp `7b8a370c…`): **FAIL**, `failing_gates: ["reconcile"]`, escape
  `{file: "pharn/LIMITS.md", denied_by: "protect-trusted-paths.cjs"}`. The human's own correct patch had landed
  inside the build's anchor→verify window. Reconcile has no attribution, so it reads as an escape (L68), and
  committing it (`a44a772a`) does not change that. At the human's choice it was reverted (`git reset --soft`,
  LIMITS.md restored to main's bytes, manifest regenerated), with the human's bytes kept aside, and the stage was
  re-run. The baseline was not re-anchored or edited.
- **Run 4** (stamp `da0efe54…`): **PASS**, the verdict above.

No gate value was carried from one run to another.

## Bounds (P0)

The verdict is exactly as good as the deterministic suite. It is whole-repo, so it also proves the rest of the repo
is green with this change in it. The ✧ test pins the command TEXT, never that a run obeys it. A stamp certifies
internal consistency, never provenance. A `reconcile` CLEAN means no escape was detected, never that none occurred.
The post-verify LIMITS.md edit and manifest regeneration are outside this verdict. CI's `docs:check` and test suite
judge the final tree.
