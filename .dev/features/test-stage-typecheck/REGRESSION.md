# REGRESSION — test-stage-typecheck

- base: `08d7f63e693a1cdb1e0269ee552357ce77408313` (working-tree build, so `base = HEAD`)
- inside (16): the plan's `## Files` that changed (`pharn/floor/ac-types-core.mjs` + test, `check-ac-types.mjs` + test,
  the two tsc fixtures, `.claude/commands/pharn-test.md`, `.claude/commands/pharn-loop.md`,
  `.dev/floor/stage-load-budget.test.mjs`, `.dev/guides/floor-ac-tests.md`, `CHANGELOG.md`, `README.md`,
  `SKILLS_VERSION`, `pharn-install.json`) plus this feature's `PLAN.md` / `GRILL.md` (`escape_exempt`). `scope` exit 0:
  no escape from `## Files`.
- outside gates: `tests` (203 outside test files, per-test reporter), `validate`, `structural:` the trust-fence eval
  pair. Style gates skipped: no shared style config is inside.

## Gates

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---- | ---- |
| `tests`                                                                                    | 0    | 0    |
| `validate`                                                                                 | 0    | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | 0    |

Per test: base 7075 passed / 0 failed / 9 skipped; head 7083 passed / 0 failed / 1 skipped. `new_failures: []`.

- regressions: `[]`
- pre_existing: `[]`

## The first run of this stage (recorded, then re-run after the fix)

The first run read **`regressions`**: two head failures, both
`.dev/floor/check-install-manifest.test.mjs` and `.dev/floor/install-manifest-core.test.mjs` asserting the committed
`pharn-install.json` equals the recomputed manifest. Cause: the build ran `npm run docs:generate` before its Step 2b
prettier pass reformatted `pharn/floor/ac-types-core.mjs`, so the manifest's sha256 for that file was stale. Fix:
`npm run docs:generate` again (`pharn-install.json` is a declared `## Files` path); `check-install-manifest.mjs` then
read GREEN. The stage was re-run in full; the verdict above is the re-run's.

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.** This certifies the base/head
comparison over the gates above only; it catches what the suite catches, nothing more.
