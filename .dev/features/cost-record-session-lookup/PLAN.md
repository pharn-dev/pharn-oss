# PLAN — cost-record-session-lookup

- spec_content_hash: b91d773cab8b0190f6bda5d5060156a62a2f813d375277895222576f454a045d # fix #4
- applied_lessons: [L25, L34, L35, L41, L47, L50]
- increment: Locate a run's transcript by its session id instead of deriving a directory name from `cwd`, retiring both the derivation and the `cwd` refusal whose premise the derivation created.
- layer(s): pharn/floor (product-floor checker) — not a capability; no `role:` frontmatter
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- **L25** — the header comment at `render-cost-record.mjs:179-180` states the cwd refusal's rationale
  ("the mapping is LOSSY"), and that rationale is **incomplete in the load-bearing way L25 names**: it
  names the `a/b` vs `a-b` collision and never the worktree case, where the directory is named for a
  path the session's `cwd` never equals. A repair guided only by the comment would fix the dot and keep
  the refusal. So this plan re-derives what the comment claims rather than carrying it across, and
  deletes the comment with the code it defends.
- **L34** — non-vacuity: the new worktree fixture must FAIL against current code, shown below with live
  output, before any edit. A test that passes both before and after certifies nothing.
- **L35** — `projectDirName` is a second copy of a platform rule this repo cannot pin. The first question
  is whether the copy should exist, not how to correct it. It is **retired**, not fixed — the evidence
  below shows a corrected rule still fails, so binding it would buy a maintained wrong answer.
- **L41** — the current test's `scratch()` helper builds its fixture directory with `projectDirName(cwd)`,
  the very function under test, so the bug is invisible by construction. The rewritten helper takes the
  directory name **explicitly**, shaped like the observed real names.
- **L47** — the measurement below found the split invariant holding over 8068 requests. That count is
  recorded as a dated observation, never written into a comment or contract as a standing quantifier.
- **L50** — the sweep ran by **referent** (`projectDirName`, the `cwdSeen` refusal, the `--cwd` flag),
  not by claim wording; the full cite list is in `## Files` and `## Referent sweep`.

## Discovery — live evidence (P6)

All read this run, on 2026-09-21, at HEAD `fc03578`.

**D0. `CLAUDE_CODE_SESSION_ID` is SET in the Bash tool environment** (`c0538698-…`). The prompt's HALT
condition does not fire. Stronger: running `node pharn/floor/render-cost-record.mjs` with no arguments in
**this** session returns `coverage: "partial"`, 17 requests, `by_stage: { "pharn-dev-plan": … }`. **The
renderer works live today.** What was missing was a committed artifact proving it, not the capability.
This retires the prompt's conditional constraint: `LIMITS.md:55` ("the system already observes it") is
**TRUE as written**, so no staged patch and no `APPLY.md` — writing one would assert a defect that does
not exist.

**D1. The directory rule replaces `.` as well as `/`, and `_` survives** — from `cwd` evidence, not from
the name shape: `-Users-pgalarowicz-Projects-bryff--claude-worktrees-app-review-fixes` records
`cwd=/Users/pgalarowicz/Projects/bryff/.claude/worktrees/app-review-fixes`. So the trigger's claim is
confirmed. But `-Users-pgalarowicz-Projects-bryff_` keeps its underscore, so the rule is **not**
"everything outside `[A-Za-z0-9/-]`" — the trigger's generalisation is **wider than the evidence** and is
not adopted.

**D2. The decisive finding — the directory name is not a function of the session's `cwd` at all.** Three
of the four `pharn-oss` worktree directories record the **main repo** as their `cwd`:

| directory                                                | recorded `cwd`(s)                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| `…-pharn-oss--claude-worktrees-pharn-loop-run` (fixture) | `…/pharn-oss` **and** `…/pharn-oss/.claude/worktrees/pharn-loop-run` |
| `…-pharn-oss--claude-worktrees-model-routing-limit`      | `…/pharn-oss` **and** the worktree                                   |
| `…-bryff--claude-worktrees-app-review-fixes`             | three distinct values, incl. a `.pharn/regress-base`                 |

`cwd` is **not stable within a session** (2–3 distinct values), and `aggregate()` keeps the **first** one
seen (`:129`). A session opens in the main repo and moves into the worktree. Therefore **no correction to
`projectDirName` can work**: with the dot fixed, the fixture's derived name is still wrong for the first
`cwd` and right only for the second. This overturns the trigger's implied remedy ("replace `.` too") and
is why the derivation is retired rather than patched.

**D3. Failure reproduced live on the named fixture, both ways** (L34 — non-vacuity, before any edit):

```text
A) --cwd <the worktree>  -> coverage "unavailable"
   "no transcript directory for this working directory (looked for
    …/-Users-pgalarowicz-Projects-pharn-oss-.claude-worktrees-pharn-loop-run)"
                                              ^^ derived `-.claude-`; the real dir is `--claude-`
B) --cwd <the main repo> -> coverage "unavailable"
   "no transcript found for session 51a7441d-… under …/-Users-pgalarowicz-Projects-pharn-oss"
```

The fixture is `51a7441d-0e03-4066-8d1c-be5a2d419121.jsonl`, 1815 records, branches `main` →
`worktree-pharn-loop-run` → `pharn-loop-loop-decision-integrity` — the `/pharn-loop` run behind
`pharn/features/loop-decision-integrity/`.

**D4. The session-id key is unambiguous — measured, not assumed.** Across all 25 project directories:
**128 top-level `.jsonl` files, 128 distinct basenames, 0 collisions, every basename a UUID.** Each
transcript holds exactly **1** distinct `sessionId`; auto-compaction changed neither the id nor the file
in the fixture (1815 records, one id). Nested subagent transcripts live at `<dir>/<sessionId>/…` — 56
nested directories all match a top-level session id; the 9 non-matching ones are `memory/` and
`vercel-plugin/`, which a `sessionId`-prefixed filter already ignores.

**D5. The token-class invariant HOLDS.** Over `~/.claude/projects/*pharn-oss*` (the
`.dev/measurements/token-cost-2026-08-18.md:17` precedent — numeric/enum fields only, no message content),
124 files, **8068 deduped requests**: `cache_creation` present on **8068/8068**, split equal to
`cache_creation_input_tokens` on **8068/8068**, **0** mismatches, **0** absent-with-nonzero-total, **0
unaccounted remainder**. `cache_creation` carried exactly two keys, `ephemeral_1h_input_tokens` and
`ephemeral_5m_input_tokens`. Per the Direction's own branch — _finds none → pin the invariant, record the
numbers, no speculative field_ — **no output field is added.** See `## Rejected alternatives`.

## Files

- `pharn/floor/render-cost-record.mjs` — **product surface, bumps `SKILLS_VERSION`.** Delete
  `projectDirName` (`:51`) and its call (`:173`); add `findTranscript(projectsDir, sessionId)`, a
  filename-only scan over the immediate children of `projectsDir` for `<sessionId>.jsonl`, returning the
  single containing directory. Zero hits → today's honest `unavailable`. **Two or more hits → refuse**
  (`unavailable`, both directories named) — fail-closed, a membership test, never first-match-wins.
  Delete the `cwdSeen` refusal (`:179-183`) and the `cwdSeen` plumbing (`:112`, `:129`, `:154`). Remove
  the `--cwd` flag (`:214`) and its usage line (`:38`). Rewrite the header note that states the lossy-
  mapping rationale (L25). `--projects-dir` and `--session` stay; no-argument invocation stays, which is
  how `/pharn-ship` calls it.
- `pharn/floor/render-cost-record.test.mjs` — **apparatus, no bump** (`*.test.*` never ships). Rewrite
  `scratch()` to take an explicit `dirName` (L41). Delete the three tests that pin the retired behaviour
  (`:68-70` the `/`-only rule, `:132-147` the cwd refusal) and the `--cwd` CLI case (`:284`). Add: the
  worktree-shaped fixture (`-Users-x-Projects-repo--claude-worktrees-wt`, anonymised to the file's
  `/Users/x/` convention) that FAILS on current code; a dotted-path fixture; a multi-hit refusal case; a
  zero-hit case; a case pinning that a transcript recording a **different** `cwd` is now **reported**,
  not refused; and the D5 invariant as a hermetic assertion.
- `.dev/measurements/cost-record-lookup-2026-09-21.md` + `.json` — **apparatus, no bump.** The D1/D2/D4/D5
  numbers with their extraction method, following the `token-cost-2026-08-18` precedent.
- `SKILLS_VERSION` — `6.4.2` → `6.4.3` (**patch**: a correction to bytes that already shipped).
- `README.md` — the shields version badge, `6.4.2` → `6.4.3`. **Added at BUILD time, not planned**, and
  recorded rather than quietly written: `.dev/floor/check-version-badge.mjs` holds the badge and
  `SKILLS_VERSION` in equality, so the approved bump _forces_ this edit — there is no judgment in it. The
  plan's `## Referent sweep` ran over the renderer's referents and never over `SKILLS_VERSION`'s own
  mirrored identity, which is the **L35** family (the badge is the second store of the version fact, kept
  by a sync check precisely because it cannot be retired). The miss surfaced as a RED in `npm test`, not
  as a blocked write, because `SKILLS_VERSION` and the badge live in different files.
- `CHANGELOG.md` — one `### Fixed` entry under `[Unreleased]`, recording plainly that the renderer **does**
  run live (D0), that the derivation is retired rather than corrected, and why the refusal goes.

**Not touched, and why:** `pharn/pharn-contracts/ship-record.md` — the `cost` block's shape is unchanged
(no field added, none removed), so the contract stays true. `.claude/commands/pharn-ship.md` — it invokes
with no arguments, which still works. `.dev/floor/entry-point-guard.test.mjs` — the `--nope` probe, the
argv slice and the exit-2 propagation are all preserved deliberately.

## Referent sweep (L50)

Swept by referent, not by claim wording. `projectDirName` → `mjs:51,173`, `test:20,50,68-70`. The cwd
refusal → `mjs:112,129,154,179-183`, `test:9-10,132-147`, `CHANGELOG:2054-2055`. `--cwd` → `mjs:38,214`,
`test:284`. Every site is in `## Files` above except `CHANGELOG:2054-2055`, which is **historical record
of a shipped release and is correctly left alone**; the new entry supersedes it rather than editing it.
`ship-record.md` was dereferenced (opened and read, not assumed): its `cost` block names no `cwd` field.

## Contracts satisfied

- `pharn/pharn-contracts/ship-record.md` § `The cost block` — unchanged and still satisfied; the rendered
  block keeps every key, including `coverage`'s two-member enum (cited, not restated — P4).

## Evals to write (P1)

Not applicable, and stated rather than skipped: P1 binds **Capabilities** — a `.md` file with a `role:`
in frontmatter. `render-cost-record.mjs` is a floor checker, whose specification is its `*.test.mjs`
suite; the repo's other floor checkers carry no `evals/` directory. The test file above is this
increment's specification.

## Guarantee audit (P0)

- "the transcript is located by session id" → **floor: enum-regex** (a filename equality test over a
  directory listing; no derivation, no judgment).
- "a session id resolves to at most one transcript directory" → **floor: enum-regex** — a count of hits,
  with ≥2 refusing. **NARROWED, and stated:** this is a property of the _lookup_, guaranteed by the code;
  it is **not** a proof that the platform never reuses a session id. D4 measures 0 collisions over 128
  real sessions — an observation with a date, never a standing quantifier (L47).
- "the reported number belongs to THIS run" → **advisory**, and **weaker than what it replaces.** The
  guarantee now rests on `CLAUDE_CODE_SESSION_ID` being this run's id, which nothing here can verify.
  This is stated as a downgrade, not hidden: the cwd refusal it replaces was **not** a real backstop
  either (D2 — it fires on legitimate worktree runs and its `cwdSeen` is an arbitrary first-of-several),
  so the change removes a check that produced false refusals, not one that produced true ones.
- "coverage is never `complete`" → **floor: enum-regex**, unchanged (`COVERAGE` has two members).
- "the dedup is load-bearing" → **floor: arithmetic over a `Set`**, unchanged and untouched.
- "cache-write tokens are never silently undercounted" → **ADVISORY, and deliberately NOT promoted.**
  D5 measures the split total-equal on 8068/8068 requests. The remaining exposure — a future platform
  record carrying `cache_creation_input_tokens` with no split — would count 0. It is **named as an
  unbuilt residual** (`cost-record-unsplit-cache-write`) rather than fixed, because the output shape has
  **no bucket** for an unsplit total and inventing one is the speculative addition P7 forbids on zero
  observed failures. Per L46 this is recorded as a pending remedy, not a solved problem.

## Trust audit (P2)

The renderer ingests **untrusted** transcript content. The taint boundary is unchanged by this increment
and is worth restating because the lookup moved: only **numeric** (`usage.*`), **enum/identifier**
(`type`, `model`, `requestId`, `attributionSkill`, `sessionId`) and **ISO-timestamp** fields are read;
no message content is read, and none reaches the output. The retired `cwd` read was the one **path-shaped**
field consulted, so this increment **narrows** the ingested surface. `by_stage` keys are
platform-supplied strings copied verbatim into a JSON object — already the case, unchanged.

## Determinism audit (P5)

- Locating the transcript = a filename equality test over a sorted directory listing — membership, not
  classification.
- The multi-hit branch = an integer count (`hits.length`), refusing at ≥2. Fail-closed; no tiebreak
  heuristic, because any tiebreak would be a guess.
- Directory listing is **sorted** before use, so the refusal message is filesystem-order-independent and
  the output stays byte-identical across runs (the ✦ DETERMINISM property the suite already pins).
- No fallback ends in a guess: zero hits → honest `unavailable`; many hits → honest `unavailable`.

## Rejected alternatives (recorded, not dropped)

1. **Correct `projectDirName` to replace `.` as well.** Rejected on evidence, not taste: D2 shows the
   fixture's directory is named for a path the session's first-recorded `cwd` never equals, so the
   corrected rule still fails. It would also be a second copy of an unpinnable platform rule (L35).
2. **Keep the cwd refusal alongside the session-id key.** Rejected: its stated premise (CHANGELOG:2054,
   the lossy `a/b`/`a-b` collision) cannot arise once the key is a UUID, and D2 shows it firing on
   legitimate runs. Keeping it would preserve a false-refusal source to guard a now-impossible case.
3. **Record the observed `cwd`s as a new `transcript_cwds` field.** Rejected under P7 — no failure
   motivates it, and it would change `ship-record.md`'s contract for diagnostic value alone.
4. **Make `cache_creation_input_tokens` authoritative in `fold()`.** Rejected: with no unsplit bucket in
   the output, an unsplit total could only be attributed to `1h` or `5m` by guessing (P5), and adding a
   bucket is alternative 3's problem again. Recorded as the named residual instead.

## Open questions (HALT) — ALL RESOLVED at the Step-4 gate, 2026-09-21

Each was put to the human as a selectable option at the plan-approval halt. The recorded answer is the
decision; the recommendation is kept beside it so a reader can see whether the two agreed.

1. **The `--cwd` flag: remove, or keep as an accepted no-op?** Recommended **remove** (L35 — retire the
   redundant thing). **DECIDED: remove.** `--cwd` becomes an unknown argument (exit 2). The
   `entry-point-guard` probe is unaffected — it pins `--nope`, the argv slice and exit-2 propagation,
   all preserved.
2. **The cwd refusal: goes, stays, or becomes a recorded field?** Recommended **goes**, per rejected
   alternatives 2 and 3. **DECIDED: remove it entirely**, with the guarantee-audit downgrade stated
   rather than hidden — "the reported number belongs to THIS run" now rests on
   `CLAUDE_CODE_SESSION_ID` alone, and no `transcript_cwds` field is added.
3. **The unsplit-cache-write residual: name it unbuilt, or build a bucket now?** Recommended **name it
   unbuilt** — D5 measured zero occurrences and P7's bar is a real failure. **DECIDED: name it
   unbuilt**, as `cost-record-unsplit-cache-write`, a pending remedy per L46.

No question remains open; nothing in this plan is blocked on a human answer.
