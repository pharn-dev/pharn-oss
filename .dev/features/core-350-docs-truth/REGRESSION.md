# REGRESSION — core-350-docs-truth

- base: `33db1df7ae195261f8bcdd42990caac63620a402` (HEAD of a dirty tree, Step 1.1 — the commit carrying the
  human-applied `pharn/LIMITS.md` §11 and `release.yml` comment patch, made before the build anchor, L68)
- inside (12): the ten `## Files` paths plus this feature's `PLAN.md` and `GRILL.md` (`escape_exempt`); `scope` exit 0,
  no escape
- outside: 202 test files, `validate`, and one eval pair (`trust-fence` expected ↔ `.dev/features/trust-fence/findings.json`).
  Style gates skipped: no shared style config is inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 1    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per-test: base 7052 passed, 2 failed, 9 skipped; head 7062 passed, 0 failed, 1 skipped; `new_failures: []`.

The two base failures were in `.dev/floor/check-install-manifest.test.mjs` and
`.dev/floor/install-manifest-core.test.mjs`. The base commit holds the patched `pharn/LIMITS.md` but the
`pharn-install.json` generated before it, so the manifest's LIMITS.md sha256 was stale at base. The build regenerated
it, and head is green. Read from the record's file names; titles are not quoted.

REGRESSIONS: none — no deterministically-detectable breakage outside the feature (`check-regress.mjs verdict` exit 0,
`no-regressions`; `tests` is `pre_existing`).

This catches what the outside suite catches, nothing more.
