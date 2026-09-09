# VERIFY — stale-lint-ignores

## FLOOR layer — the deterministic gates (these OWN the verdict)

| gate                                           | exit |
| ---------------------------------------------- | ---- |
| `test`                                         | 0    |
| `validate`                                     | 0    |
| `lint`                                         | 0    |
| `format:check`                                 | 0    |
| `lint:md`                                      | 0    |
| `structural:…/expected-injection-comment.json` | 0    |

`failing_gates: []`

**VERIFIED: floor gates PASS** (`pharn/floor/check-verify.mjs`, exit 0 — `PASS iff every gate exit 0`).

The plan's one declared `## Files` path, `.markdownlint-cli2.jsonc`, is present and modified, so there is
no build-completion gap for the verdict to report as `INCOMPLETE`.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.

**No verifiers registered — floor gates only.** Membership is a deterministic frontmatter read, not a
prose grep. Step 2 is a no-op; the verdict is the floor gates alone.

## A change-sensitive check the gate map cannot make (recorded, NOT part of the verdict)

`/pharn-dev-grill` raised this as its `rule_id: P1` finding: every gate above is **insensitive to this
increment's change**. `lint:md` was exit 0 before the edit and is exit 0 after, so the gate map would
look identical had the build deleted the wrong entry, deleted all three, or done nothing. A PASS here
therefore says "the repo is green with this in it" — it does **not** say the edit did what it claims.

A change-sensitive probe was run separately, **at the real path in this worktree** (L26 — a copy outside
the repo resolves config-driven gates differently, so the mirror used at plan time is not sufficient for
this). Badly-formatted markdown was placed at all three `.pharn/` paths and `lint:md` re-run:

```text
Linting: 1067 files
Summary: 6 issues in 2 files
.pharn/FABLE_REVIEW.md:1:1  MD018 / :3:9 MD009 / :3:1 MD030
.pharn/fixes/probe.md:1:1   MD018 / :3:9 MD009 / :3:1 MD030
```

`.pharn/lessons-index.md` was **not** flagged. So both halves of the change are demonstrated, in the
direction the change actually goes: the two deleted entries no longer shield their paths, and the
surviving entry still shields the generated cache. The probe files were removed afterwards and the
removal verified (`.pharn/` holds only `writes-scope.json`;
`pharn/floor/check-lessons-index.mjs . --verdict` → `NO_CANON`, its pre-probe state).

**This probe is ADVISORY and deliberately outside the gate map (P0).** It was written through Bash, so it
never passed the fix #7 gate (L19); it is a measurement recorded for the human, not a floor guarantee,
and it did not and could not flip the verdict above.

## The honest residual (P0/P7)

Verified = **the named gates passed**. This is **not** a guarantee of correctness beyond what those gates
check — a defect no test, eval, rule or linter covers is invisible to this verdict, and the verifier layer
that might notice it is advisory and, today, empty. Verifier concerns would be advisory help, not
assurance.
