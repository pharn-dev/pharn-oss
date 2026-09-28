# VERIFY — orchestrator-context

- tree: the build (`b1524fb`) plus the regress artifacts (`276d77d`), HEAD of `worktree-orchestrator-context`, based on
  `9490b1b` (6.31.1). `origin/main`'s newer `656d60b` (6.31.2) is not merged yet; verify is re-run after that merge.
- stage model: opus, inline. **Orchestration deviation, recorded (advisory):** the pinned `t=$?` / `printf` forms are
  refused in this worktree-isolated session, so the same gates ran through `.pharn/pharn-dev-verify/capture.mjs`
  (`spawnSync`, argv arrays; each exit code is the child's status). The eval pair's two paths were confirmed readable
  before its exit was recorded.

## Floor gates (own the verdict)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

`reconcile` read **CLEAN** against the epoch the build anchored (`--by pharn-dev-build`, amended twice as `## Files`
grew): 26 paths reconciled, no escapes; exempted: this feature's `BUILD.md`, `PLAN.md`, `REGRESSION.md` and
`regression-report.json`. The build's two Bash writes to declared paths (the mechanical split into the four parts,
and the one-off edit of `command-hygiene.test.mjs` / `run-marker.test.mjs`) and the Bash delete of the temporary
probe control were all inside the scope the guards held, so none is an escape.

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0; `failing_gates: []`).

## Verifiers (advisory)

No verifiers registered (`count-verifiers.mjs` → `registered: 0`) — floor gates only.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. In particular no gate here observes a model running `/pharn-loop` or
`/pharn-ship`: whether a run reads each part at its point is outside every gate.
