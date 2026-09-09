# VERIFY — ship-scope-target

**Verdict (FLOOR):** `PASS` — `pharn/floor/check-verify.mjs` exit **0**. `failing_gates`: **empty**.

## Gate table (`gate → exit code`)

| gate                                                                                       | exit | what it covers                                     |
| ------------------------------------------------------------------------------------------ | ---- | -------------------------------------------------- |
| `test`                                                                                     | 0    | `node --test` over the whole suite — **1691/1691** |
| `validate`                                                                                 | 0    | `pharn/floor/validate.mjs .` — 36 capabilities     |
| `lint`                                                                                     | 0    | eslint, whole repo                                 |
| `format:check`                                                                             | 0    | prettier, whole repo                               |
| `lint:md`                                                                                  | 0    | markdownlint, whole repo                           |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    | the one committed eval pair                        |

The `test` + `validate` + `lint` + `format:check` + `lint:md` set is exactly the repo's `npm run check`
aggregate, so this verdict tracks it (L9). `npm run check` itself was additionally run whole at build and
returned **exit 0**, which also covers the four gates outside this map (`docs:check`, `check:markers`,
`check:badge`, `check:contributing`) — notable here because this increment bumps `SKILLS_VERSION` and the
README badge, and `check:badge` is the gate that binds them (`VERSION-BADGE: GREEN — README.md badge
"3.0.2" matches SKILLS_VERSION "3.0.2"`).

**Test-count delta, stated because it is the increment's own deliverable:** 1683 → **1691**, +8, all in
`.dev/floor/command-hygiene.test.mjs` (Rule A ×4, Rule B ×3, the placeholder predicate ×1). No existing
test changed.

## The increment's own correctness signal, beyond "the suite is green"

A green suite would be satisfied by tests that pass vacuously, so the two new rules were **mutation-tested
against the pre-fix file** rather than only against the fixed one. Running both predicates over
`git show HEAD:.claude/commands/pharn-ship.md`:

- **Rule A → RED**, naming `pharn-ship.md:270 — node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-ship.md`
- **Rule B → RED**, naming all three declared-but-never-targeted paths: `features/<name>/SHIP.md`,
  `features/<name>/ship-record.json`, `features/<name>/BRIEFING.md`

So the rules genuinely catch the CRIT they were built from; they are not assertions that pass because the
defect was already gone. Each rule additionally carries its own in-suite discrimination test whose mutant
is derived from the **real** command body (L4), and a non-vacuity assertion over its discovered domain
(L34) — Rule A ≥15 invocation sites, Rule B ≥5 multi-artifact commands with `pharn-ship.md` pinned as a
member by name.

## Verifier layer (ADVISORY)

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`. **No verifiers registered —
floor gates only.** Zero `role: verifier` capabilities have been authored (P7: the runner is deferred until
the first one lands), so there is no advisory layer to annotate this verdict, and none could have flipped
it if there were (fix #3).

## Honest residual (P0)

**Verified = the named gates passed.** This is NOT a guarantee of correctness beyond what those gates
check, and the gap is unusually wide for this particular increment, so it is worth naming precisely:

- The bulk of the diff is **command prose**, and nothing in this repo reads command prose for truth —
  `validate.mjs` deliberately ignores `.claude/commands/`. No gate above read a single corrected sentence.
- The two new rules prove a **flag is present on a line** and that each declared path is **named** as some
  call's `--target`. They do **not** prove the `--target` **value** is right, that a setter call sits
  **immediately before** the write it authorizes, or that the ordering is correct. Ordering remains
  advisory command prose, and the corrected guarantee-audit bullet now says so.
- Nothing here executed `/pharn-ship`. That the four calls work **at run time** is untested by
  construction: commands are not `role:`-bearing capabilities, so no behavioral case can be run over one.
  The setter's behaviour with each `--target` was, however, confirmed live during discovery (exit 0, scope
  = exactly that one path).

"`/pharn-dev-verify` ensures the feature is correct" is struck (P0) — it certifies only the gates it ran.
