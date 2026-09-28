# VERIFY — run-performance-breakdown

Floor gates run at HEAD (the working tree with the build) into a private `.pharn/pharn-dev-verify/rpb/` directory
created empty for this run; the verdict is `pharn/floor/check-verify.mjs` over the recorded exit codes.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 4502 tests, 4502 pass, 0 fail)                                        | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 1    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`: CLEAN, 0 escapes)              | 0    |

**Raw floor verdict: FAIL** (`failing_gates: ["lint:md"]`) — `verify-report.json` is the checker's output verbatim.

**The one red is environmental, and it is recorded, not waved through.** Every issue `lint:md` reported is in ONE
file, `.pharn/pr-body.md`: a gitignored scratch file last modified at 19:50, before this build's reconcile anchor
(20:08), written by another session sharing this checkout. It is not this increment's and was not touched (a
gitignored path is still in markdownlint-cli2's reach — `.dev/memory-bank/lessons-learned.md` **L61**, cited). CI checks
out no `.pharn/`.

**Clean measurement:** `npm run lint:md` in a copy of this tree without `.git`, `.pharn`, `node_modules` (symlinked)
and `.claude/worktrees` → exit **0**, "0 issues". `check-verify.mjs` over the same map with that one measured value →
**PASS**. Both maps and both verdicts are kept under `.pharn/pharn-dev-verify/rpb/` (`results.json` /
`verdict-raw.json`, `results-clean.json` / `verdict-clean.json`).

Verifiers: none registered — floor gates only (advisory layer empty, P7).

This certifies that the named gates exited as shown — never that the increment is good or wise (P0).
