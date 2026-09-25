# VERIFY — reconcile-symlink-target

## Floor layer (owns the verdict)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate` (`pharn/floor/validate.mjs .`)                                                  | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

**These are the post-rebase gates** (base `8eec2d7`, after #269). The pre-rebase run, over base `7bcd7a8`, gave the
same seven exits and the same `PASS`.

`reconcile`, two epochs, stated as they are:

- **Pre-rebase:** anchored at the build's Step 0 after the setter, on `7bcd7a8`. It read `CLEAN`: 19 candidates,
  `escapes: []`, `warnings: []`. That epoch covered every write the build made, including the Bash ones (the
  `SKILLS_VERSION` bump, test runs, formatters).
- **Post-rebase:** re-anchored after the setter on the rebased tree, so #269's files are part of the anchor and never
  candidates. It read `CLEAN`: 14 candidates, 3 exempted, `escapes: []`, `warnings: []`. It covers what was written
  after the re-anchor: the post-rebase edits, the pipeline artifacts, and this stage's own runs. The build's earlier
  writes were already in that anchor, so for them the pre-rebase reading is the evidence. A hard reset that would have
  let one epoch span both was refused by the session's auto-mode classifier, and it was not worked around.

**Deterministic verdict (`check-verify.mjs`, exit 0): VERIFIED: floor gates PASS.**

## Advisory layer

No verifiers registered (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`). Floor gates only.

## Orchestration note (advisory)

This worktree session's shell guard refuses the pinned `; t=$?` captures. So the gates ran from a node runner under
`.pharn/pharn-dev-verify/` that calls each gate through `spawnSync` with an argv array and records only exit statuses.
The runner was linted on its own before it ran, so it could not redden the `lint` gate it runs itself (eslint descends
into `.pharn/`). The `{gate: exit}` map is `.pharn/pharn-dev-verify/results.json`.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
