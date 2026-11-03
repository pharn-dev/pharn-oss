# REGRESSION — dev-verdict-discipline

**REGRESSIONS: none — no deterministically-detectable breakage outside the feature.**

- Base: `0f06ebcabe54c667dea6f707d77a39554af3b394` (HEAD; the working tree held the uncommitted build, so `base = HEAD`).
- Inside (14 paths, `check-regress.mjs scope`, `escaped: []`, `escape_exempt: []`): the three dev commands, the two new
  checkers' files and the new wiring test, `command-hygiene.test.mjs`, both guides, `ci.yml`, `CHANGELOG.md`,
  `CLAUDE.md`, `CONTRIBUTING.md`, `package.json`.
- Outside gates: 178 outside test files (one `node --test` run per side through the per-test reporter), `validate`,
  and the one committed eval pair. The style gates were skipped on both sides: no shared style config is inside.

| gate                                                                                       | base | head |
| ------------------------------------------------------------------------------------------ | ---: | ---: |
| `tests`                                                                                    |    1 |    0 |
| `validate`                                                                                 |    0 |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |    0 |

`regressions: []`, `pre_existing: ["tests"]`. Per-test: base 5,875 passed, 1 failed, 4 skipped; head 5,879 passed, 0
failed, 1 skipped; `new_failures: []`. The base's one failure is in `pharn/floor/entry-gates.test.mjs`, a file this
increment does not touch, measured while several batch agents loaded the host; it passed at head.

_Catches what the suite catches, nothing more: a regression no deterministic check covers is invisible here._
