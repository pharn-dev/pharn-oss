# REVIEW — product-features-relocation (post-relocation hygiene pass)

- reviewed: the 4-file working-tree delta on top of `aa5aafe` (`fix(product): harden features relocation per review (5.0.1)`)
- floor: `node pharn/floor/validate.mjs .` → **GREEN**, 36 capabilities, exit 0
- trust posture: the increment under review is treated `trust: untrusted` (P2). No instruction-looking
  content was found in the reviewed files; nothing in them was followed as an instruction.

## Scope of this review

This is **not** a review of the relocation itself — that shipped in `213985d` / `5dbbad2` / `aa5aafe`
and carries its own history. This pass reviews only the residue those commits left behind, found by
re-reading live state rather than by trusting the earlier survey (P6):

| #   | File                                                | Change                                                                                                              |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | `CLAUDE.md`                                         | `sed` artifact: a sentence enumerating root-level files was left asserting `pharn/features/` "sit\[s\] at the root" |
| 2   | `CLAUDE.md`                                         | **new**: the `MIN_CLI` discipline paragraph — the file was load-bearing and documented nowhere a contributor looks  |
| 3   | `CONTRIBUTING.md`                                   | same `sed` artifact: "plus a **root** `pharn/features/`"                                                            |
| 4   | `.dev/floor/command-hygiene.test.mjs`               | stale `(pharn-review.md)` attribution — the command now declares `pharn/features/**`                                |
| 5   | `.dev/features/product-features-relocation/PLAN.md` | `## Files` made resolvable by the setter                                                                            |

## The four lenses

### L-floor → P0 (the governing lens)

**Two findings. F2 is the increment's, F1 is my own — and my own is the reason this lens is first.**

- **F2 — `blocking`, FIXED in `5dbbad2` during this session.** The relocation left
  `pharn/floor/render-ship-briefing.mjs` holding **two** copies of the `base` default and moved only one:
  the renderer (`:318`) became `"pharn/features"` while the CLI entry point (`:438`) stayed `"features"`.
  `/pharn-ship` Step 2c invokes that CLI **without `--base`**, so the CLI default was the production
  path and **every product ship RED-failed at GATE 2**, with an ENOENT naming the pre-relocation root.
  Reproduced live before the fix:
  `RED — PLAN.md is unreadable (features/product-features-relocation/PLAN.md): ENOENT`.
  **The suite was green throughout — 1979/1979.** Every CLI case in `render-ship-briefing.test.mjs`
  passes `--base` explicitly (each builds a scratch dir), and every unit case calls `renderBriefing()`
  directly, so the default was exercised by **nothing but production**. Fixed by deleting the second
  copy rather than syncing it ([[L35]]) — `flag()` returns `undefined`, so the renderer's own
  `?? "pharn/features"` is now the single default — plus a regression test that omits `--base`
  (`"CLI: default --base is pharn/features"`). Suite now 1981/1981.
- **F1 — `advisory`, FIXED before the write landed.** The `MIN_CLI` paragraph asserts pharn-cli
  behaviour (`minCliGate()` refuses a strictly-older CLI; absent/malformed means no constraint). That
  claim was carried from earlier in this session's context, **not read live** — asserting repo state
  from memory is exactly what P6 forbids, and the repo in question is a _different_ one. Verified live
  against `/Users/pgalarowicz/Projects/pharn-cli/src/lib/min-cli-gate.ts` before finalizing: `cmp > 0`
  → refusal; `read.version === null` → `{refusal: null}`; incomparable → `{refusal: null, warning}`.
  The claim holds as written. Recorded rather than silently corrected, because the process failure
  (assert-then-verify instead of verify-then-assert) is the interesting part, not the outcome.

**P0 labelling in the new paragraph — checked against the three primitives.** It claims no guarantee:
it states in terms that `MIN_CLI` is fail-open in one direction, that **no floor primitive reads it**
(verified: zero references under `pharn/floor`, `.dev/floor`, `.claude`), that its correctness is
"care, not a guarantee", and that its residual `min-cli-format-check` is deliberately unbuilt on P7
grounds. No "guarantee" survives that is not reducible to hook / content-hash / enum-regex.

**No new claim in edits 1, 3, 4** — all three delete or correct a false statement; none adds one.

- **F3 — `blocking`, NOT fixed; surfaced for the human.** `check-bash-reconcile.mjs` reports a
  **legitimate, hook-approved canon write as an escape**, which is [[L17]]'s exact failure mode: a
  changed-since-anchor test reported as a wrote-outside-scope test, producing a blocking finding on the
  correct, designed workflow. After `/pharn-dev-memory-promote` wrote `L41` through the `Edit` tool —
  passing **both** live `PreToolUse` guards, under a scope whose `set_by` origin is the promote command,
  behind an explicit human accept — the gate flipped to
  `ESCAPE`, naming `.dev/memory-bank/lessons-learned.md` with the problem text _"a write reached it
  outside the guarded tool surface"_. **That sentence is false for this write.** Nothing Bash-written
  touched canon.
  **Cause, measured in both directions rather than assumed.** With the scope released, the probe asks
  `protect-trusted-paths.cjs` live, sees no promote origin, and denies (`exit 2`, reproduced). Restoring
  the promote-origin scope makes that hook pass (`exit 0`, reproduced) — **and the escape survives
  anyway**, because the checker then consults `baseline.scope_snapshot`, which holds the **build**
  stage's 20-path scope. Canon is not in it and, per [[L7]], never can be: `/pharn-dev-ship` and
  `/pharn-dev-build` must not declare canon, which is the whole reason the promote gate exists.
  **Therefore it is structural, not incidental.** One epoch spans build→ship, canon is `never_exempt` by
  deliberate design in `reconcile-ignore.json`, and `/pharn-dev-ship` Step 2b writes canon **after** the
  Step-3 build anchor by construction. So **every** `/pharn-dev-ship` run that promotes a lesson ends
  with `npm run check` RED.
  **Bounded honestly:** this does **not** affect the chain's own verify verdict, which is read at Step 5
  **before** Step 2b writes canon — that verdict was a true `PASS`. It affects the tree afterwards, and
  therefore CI on the resulting PR. The designed reset is the next `/pharn-dev-build` Step 0 anchor,
  which opens a new epoch. **No remedy was applied here**: the baseline was not touched, no exemption was
  added (`never_exempt` forbids it, correctly), and the promote scope was not left set to make the probe
  pass — that would be gaming the detector, which is precisely what L17 warns trains an operator to wave
  through the finding that must never be waved through.

### L-eval → P1

**Not applicable, and that is a membership test, not a judgment.** No file in this delta carries a
`role:` frontmatter key, so no capability was added or changed and no eval obligation is triggered.
`validate.mjs` confirms the capability count is unchanged at 36.

### L-trust → P2

The one edit that touches executable content is #4, a **string literal inside an assertion message**.
Its `isScopeablePlaceholder("pharn/features/**")` argument is a test fixture, not data crossing a trust
boundary. The assertion's meaning is unchanged (a bare glob with no `<` must not qualify); only the
attribution now names a string the command actually declares. Verified by execution, not by reading:
1981/1981 tests pass.

The `PLAN.md` edit (#5) deserves an explicit note, because plans are **untrusted input** (P2) and this
one was edited after its GATE-1 approval. What changed is **resolvability, not intent**: every path
added was already named in the list's own prose and simply sat behind a glob or a second back-tick that
`set-writes-scope.cjs`'s one-literal-path-per-bullet parser drops. The single genuine addition
(`.dev/floor/command-hygiene.test.mjs`) is called out in the plan itself so the widening is auditable
rather than buried. The floor agreed independently: `check-regress.mjs scope` returned `escaped: []`.

### L-axis → P3

No layer edges touched. `command-hygiene.test.mjs` is `.dev/` apparatus; the other three are repo-meta.
No capability gained or lost a `reads:` edge, and `validate.mjs` CHECK 6 (leaf→leaf) is unchanged.

## Floor verdicts standing at this review

| gate                                          | verdict                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `validate.mjs .`                              | GREEN (exit 0), 36 capabilities                                  |
| `check-regress.mjs scope`                     | `escaped: []`, exit 0 — PLAN.md correctly `escape_exempt`        |
| `check-bash-reconcile.mjs --require-baseline` | **CLEAN**, epoch `2026-09-10T14:11:15Z`, 3 reconciled, 0 escapes |
| `npm run check` (10 gates)                    | exit 0; `npm test` 1981/1981                                     |

`check:reconcile` is worth one sentence because it was **RED with 23 escapes** when this session began.
All 23 were `always_reconciled` control surface (both write-guard hooks + 20 `pharn/floor/**` +
`.dev/floor/command-hygiene.test.mjs`) compared against **committed blob ids**, because the relocation
had been applied by bulk `sed` — a Bash write — and left uncommitted. Neither setting a live scope nor
anchoring a baseline clears that state (the checker reads `baseline.scope_snapshot`, never the live
file — L38; and `controlSurfaceChanges()` is unioned into candidates in **both** branches). Committing
was the only remedy, and it was the correct one: the findings were **true**, and the checker did
exactly the job it exists to do. Nothing was done to the baseline.

## SKILLS_VERSION

**No bump.** Every file in this delta is outside the bump-triggering set: `CLAUDE.md` and
`CONTRIBUTING.md` are repo-meta, `.dev/floor/**` is apparatus, `*.test.mjs` never ships, and
`.dev/features/**` is a build-loop audit trail. `SKILLS_VERSION` stays `5.0.1`; `check:changelog` and
`check:badge` both pass at that value.

## Honest bounds on this review (P0)

- The four lenses are **model judgment**. Nothing here is a floor verdict; the floor verdicts are the
  table above, and they belong to their checkers, not to this document.
- F1 is recorded as a **process** finding. That the corrected claim now matches pharn-cli's source was
  verified once, live, in this session — it is **not** pinned by any check, and pharn-cli is a separate
  repo that can change without anything here noticing. A future divergence would be silent.
- "Reviewed" never means "correct". It means these five changes were read against four principles and
  the named floor gates were green when read.
