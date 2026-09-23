# VERIFY — run-gates-dangling-link-containment

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test`                                                                                     | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile`                                                                                | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0). `npm test` ran 2594 tests, all passing, none
skipped. `reconcile` is `CLEAN`: 5 paths were reconciled and there are 0 escapes.

## Red before green (L4), measured

Against the UNFIXED `run-gates.mjs` (`daaa999`), the new test failed on its first case, with the
discriminating assertion:

```text
AssertionError [ERR_ASSERTION]: a dangling symlink component: no document on stdout — the runner crashed instead of refusing
```

The loop stops at the first failure, so the other two cases were run directly against the unfixed CLI in
scratch repos. Both crashed with exit 2 and an **empty stdout**:

- `file`: `.pharn/afile` is a regular file, `--out .pharn/afile/gates`;
- `root`: `.pharn` is a dangling link, `--out .pharn/gates`.

After the fix, all three cases return a `path-containment` document, and the suite passes 35/35.

## Verifiers (advisory)

No verifiers are registered, so only the floor gates ran.

---

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates
check. In particular, a component swapped between the containment check and `mkdirSync` (TOCTOU) is not
covered, and the EACCES branch is reached by no test.
