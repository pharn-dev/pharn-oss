# VERIFY — docs-sync-6-11

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test`                                                                                     | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile`                                                                                | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0). `npm test` ran 2591 tests, all passing, none
skipped. `reconcile` is `CLEAN`: 5 paths were reconciled and there are 0 escapes.

## The plan's acceptance, re-run

I re-ran the site-4 enumeration over every tracked `.md`/`.mjs`/`.cjs`/`.json` outside `.dev/features/`
and `CHANGELOG.md`. It found **no** remaining claim that an install omits `THREAT-MODEL.md` /
`LIMITS.md`. The remaining hits are:

- the rewritten `CLAUDE.md` sentence, which states the opposite;
- `.claude/settings.json`'s `_comment`, which is about write protection, not installation;
- two unrelated matches, on "two of them" in `pharn/ARCHITECTURE.md:25` and on `THREAT-MODEL.md` in
  `specified-primitives.json`.

`docs:check`, `check:badge`, `check:changelog` and `check:contributing` also exit 0.

## Verifiers (advisory)

No verifiers are registered, so only the floor gates ran.

---

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates
check. For prose, that is nothing: no gate reads README, `CLAUDE.md` or `SECURITY.md` for truth. The
install claims rest on reading `pharn-cli@f853390` this run, and a later installer change can expire them.
