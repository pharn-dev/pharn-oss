# PLAN — readme-audit-repairs

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299 # fix #4, pharn/ARCHITECTURE.md
- applied_lessons: [L1, L18, L19, L20, L28, L33, L35, L36, L37]
- increment: Repair FIVE verified prose defects in the root `README.md` — one self-contradicting command
  count, two imprecise claims about the installer, and two universal-quantifier claims that misstate what
  the write-guard actually does. (A sixth, F2, was DROPPED at the post-grill halt — see below.)
- layer(s): none — `README.md` is root repo-meta, outside the `pharn/` capability tree (`pharn/ARCHITECTURE.md §4`)
- constitution_refs: [P0, P6, P7]

## Applied lessons

- L1 — This increment's artifact **is** a meta-doc, so L1 is applied in reverse: I swept for other
  meta-docs asserting facts this change alters. Result, verified live: `CHANGELOG.md` and `SKILLS_VERSION`
  are **not** invalidated — `CLAUDE.md:65` lists `README` as pure repo-meta that does not bump, and the two
  most recent README-touching commits (`8bc6c0a` #189, `4982877` #187) touched neither file. No meta-doc
  joins `## Files`.
- L18 — Applied only after it caught this plan. The first draft's exclusion block was a **bold prose
  intro** (`Deliberately **not** in scope, each with its reason:`) — L18's verbatim failure text — and
  `--from-plan` parsed **3 paths against the 1** `## Files` authorizes, granting `SKILLS_VERSION` and
  `.dev/floor/specified-primitives.json`, the two files this increment most needs to not touch. Repaired to
  the `###` heading form (Boundary 1, structural at `set-writes-scope.cjs:233`), re-run below. Recorded as
  a live recurrence, not a citation: L18 was promoted 2026-08-05 and this is a fresh instance.
- L28 — Its companion defect: the cue can also fire on an authorized item's own **wrapped** line. The
  `README.md` bullet originally read "touch nothing between the `CURRENT-STATE` markers"; it is reworded to
  "leaving … byte-identical" so no continuation line carries the cue vocabulary. Belt and braces — the L18
  heading already ends the list before the exclusions — but L28's failure is a silent truncation to a
  smaller set, so avoiding the vocabulary in the authorized item costs nothing.
- L19 — The build's formatter pass must be scoped to the written file (`npx prettier --write README.md`),
  never `npm run format`, whose repo-wide sweep is a Bash write escaping the fix #7 scope. Recorded here
  because `README.md` **is** prettier- and markdownlint-covered (verified: it appears in neither ignore
  list), so this increment genuinely triggers a formatter pass.
- L20 — Its escalation bar is what I used to answer the P7 question below, and it is the reason the answer
  is "defer with a named trigger" rather than "no": the class **has** occurred twice, so the trigger has
  fired; what blocks the floor check is expressibility, not justification. Its Step-4 remedy (re-run
  `set-writes-scope.cjs --from-plan` and compare the parsed set against `## Files`) was executed at Step 4
  and **caught a real over-grant in this very plan** — 3 paths against 1 (see L18). L20's own thesis is
  that a discipline-only remedy recurs; the remedy that caught it here is still discipline (a human reading
  a printed count), which is why the count is quoted in the halt below rather than merely run.
- L33 — Applied as its method, not its conclusion: I treated the audit's list of five as a **lower bound to
  beat**, swept `README.md` for the defect _classes_ rather than the five sentences, and beat it by one
  (F6, README:171 — the `settings.local.json` variant of F5's quantifier defect). The same sweep also
  cleared three suspected sites as accurate (README:361 CI wiring, README:423 lens fan-out, README:338),
  which is recorded so a later reader does not re-derive them.
- L35 — Its qualifier gates the P7 answer: before proposing a checker, ask whether the second copy must
  exist. Here there is no redundant copy to retire — the README claim is the only statement of its fact —
  so L35 does not veto a check; it is L37's expressibility bound that defers it.
- L36 — F5's repair is a parameterized claim ("the guard denies X"), the exact shape that acquires variant
  spellings. Rather than enumerate members in one row, the repair is worded to avoid an exhaustiveness
  claim at all, so a member added later cannot silently falsify it.
- L37 — The load-bearing lesson, and applied as its literal remedy: every sentence this plan proposes about
  what the write-guard permits or denies was **probed by execution**, with the exit code recorded. It paid
  for itself immediately (see F5 below) — reading the hook would have shipped a fresh overclaim.

## Files

- `README.md` — apply the five built repairs below (F1, F3, F4, F5, F6), leaving the `CURRENT-STATE` block (lines 363–372) byte-identical — layer none

### Deliberately not in scope

Heading form, per L18: this is Boundary 1 (structural, any heading level), so nothing below enters the
authorized scope regardless of how the exclusions are worded.

- `SKILLS_VERSION` / `CHANGELOG.md` — `README` is pure repo-meta (`CLAUDE.md:65`); precedent `8bc6c0a`, `4982877`.
- `.dev/floor/specified-primitives.json` — the P7 decision below defers it.
- The `CURRENT-STATE` block — generated; `npm run docs:check` holds it to byte-equality.

## The repairs (F2 dropped at the post-grill halt; five built)

**F1 — README:201, a self-contradicting count.** "Two commands cover the normal path. The other eight are
the stages those two run." Only **six** of the eight are. Verified live: `grep -o '/pharn-[a-z-]*'` over
`.claude/commands/pharn-ship.md` and `pharn-loop.md` shows neither invokes `/pharn-review` or
`/pharn-memory-promote`. The table contradicts the sentence two rows later ("This is standalone; it is not
a pipeline stage"). Repair: say six stages plus two standalone commands.

**F2 — DROPPED at the post-grill halt (2026-09-10), by the human, on the grill's blocking finding.**
Not built. `/pharn-dev-grill` established that F2's premise is contradicted by the only installer-side
source readable here: the published `@pharn-dev/pharn` "What it installs" table lists **`CONSTITUTION.md`
only** (no `ARCHITECTURE.md`), places floor checkers at **`.dev/floor/`** rather than `pharn/floor/`, and
lists **no `pharn-core`** — its capability unit is "one **griller** or **lens**", which excludes
`role: skill`. All three of F2's proposed additions are therefore unbacked by any source in this tree,
and the repo cannot adjudicate the conflict: the authority is the `pharn-cli` implementation, which is
not here (P6 — never assert what you cannot read).

**Known residual — `install-tree-vs-installer` (reopens when `pharn-cli` is readable).** Three
statements are in an unresolved three-way conflict and at least one is wrong: README:161 (`pharn/floor/`)
vs the installer table (`.dev/floor/`); README:438/447 ("copies `pharn/CONSTITUTION.md` and
`pharn/ARCHITECTURE.md`") vs the table's single `CONSTITUTION.md` row; and whether `pharn/pharn-core/`
reaches a user at all. Recorded rather than dropped, per L33 — a deferral that is not written down is
indistinguishable from an oversight. The install tree is left **untouched**: incomplete is not false, and
this increment will not trade a gap for a fabrication.

<details>
<summary>Original F2 specification, kept for the record (NOT built)</summary>

**F2 — README:159–169, the install tree contradicts README:438.** The tree lists `pharn/` as `floor/`,
`pharn-contracts/`, `pharn-pipeline/grillers/`, `pharn-review/`. It omits `pharn/CONSTITUTION.md` and
`pharn/ARCHITECTURE.md`, which README:438 says the installer **does** copy, and `pharn/pharn-core/` (the
seam-resolver — the `1 skill` in the generated inventory, verified live). Repair: add the three entries.

</details>

**F3 — README:143, false exclusivity.** "resolving to `ssr`, `backend`, `spa`, or `lib`" reads as
mutually exclusive; the published installer's own docs state a project can match **several** (Next +
Express → `ssr` + `backend`) and that a signal-less project resolves to `lib`. Repair: say one or more.

**F4 — README:101–102, misattributed CI.** "The installer requires Node 20 or newer; CI runs it on Node
24." The Node-24 CI is **this** repo's `ci.yml`, which does not run the installer (`floor.yml` uses
`lts/*`); the installer's CI is in the separate `pharn-cli` repo. The Node ≥20 half **is** verified
(`npm view @pharn-dev/pharn engines` → `node: '>=20'`). Repair: keep the verified half, drop the
unverifiable attribution.

**F5 — the Guaranteed table row 1, understating the guard — and the naive repair is itself an
overclaim.** The row credits `protect-trusted-paths.cjs` with only the trusted docs + control surface.
Probed live (`echo '<payload>' | node .claude/hooks/protect-trusted-paths.cjs`, exit codes recorded):

| payload path                                                                                             | exit  | meaning                    |
| -------------------------------------------------------------------------------------------------------- | ----- | -------------------------- |
| the four trusted docs, `CODEOWNERS`, both settings files, the 3 hook scripts, `.pharn/writes-scope.json` | 2     | denied                     |
| `memory-bank/{lessons-learned,pattern-library}.md`, `.dev/memory-bank/**`                                | 2     | denied                     |
| `memory-bank/lessons-learned.md`, scope `set_by` = `features/foo/PLAN.md`                                | 2     | a plan cannot self-grant   |
| `memory-bank/lessons-learned.md`, scope `set_by` = a promote command                                     | **0** | **the gated escape**       |
| `pharn/CONSTITUTION.md`, same promote origin                                                             | 2     | no escape for trusted docs |
| `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `.claude/commands/*`, `pharn/floor/*`                          | 0     | allowed                    |

So memory-bank canon and the trusted docs are **not the same guarantee**: canon is writable through the
write tool under a promote-command origin, the trusted docs never are. Merging them into one row — the
obvious repair — would ship a **new** overclaim in the opposite direction. Repair: a **separate** row
whose guarantee is narrower and names the escape, with no exhaustiveness claim (L36).

**F6 — README:171, the `settings.local.json` variant of F5.** "The hooks enforce only after they are
registered in `.claude/settings.json`." The hook's own source contradicts the `only`:
`protect-trusted-paths.cjs:234–239` protects `.claude/settings.local.json` **because** it is "a real,
loaded settings file that can wire or override the same hooks." Found by L33's class sweep, not by the
audit. Repair: name both wiring sites in that one clause.

## Contracts satisfied

None. `README.md` is repo-meta and emits no typed artifact, so no `pharn-contracts/` shape applies
(cited, not restated — P4).

## Evals to write (P1)

None, and P1 is not engaged: P1 binds a **Capability** (a `.md` with `role:` frontmatter) and every
`rule_id` in an `enforces` field. This increment adds no capability, no rule and no `rule_id` — it edits
prose in a root meta-doc. The existing gates that **do** range over this file run unchanged at
`/pharn-dev-verify`: `format:check`, `lint:md`, `check:badge` (the shields badge, untouched),
`docs:check` (the `CURRENT-STATE` block, untouched), and — verified present, so it will **not**
self-skip — `.dev/floor/capability-catalog-core.test.mjs:477`, "style: a spliced README passes the repo's
prettier and markdownlint unchanged" (`node_modules` confirmed present; L37 names this exact test as one
that exits 0 by skipping when the toolchain is absent).

## Guarantee audit (P0)

| claim the increment makes                                               | reduction                                                                                                                                           |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| The five repaired sentences are true of the repo at this commit         | **advisory** — no checker reads README prose (L37); each was verified by a live read or probe this run, which is evidence, not a guarantee          |
| The write-guard denies/permits exactly the paths recorded in F5's table | **floor: hook** — each row is an executed exit code, not a reading                                                                                  |
| The `CURRENT-STATE` inventory still matches the repo                    | **floor: enum-regex** — `npm run docs:check` byte-equality (untouched by this increment)                                                            |
| The shields badge still matches `SKILLS_VERSION`                        | **floor: enum-regex** — `check-version-badge.mjs` (untouched)                                                                                       |
| README stays prettier/markdownlint clean                                | **floor: enum-regex** — `format:check` + `lint:md` at `/pharn-dev-verify`                                                                           |
| This increment need not bump `SKILLS_VERSION`                           | **advisory** — read from `CLAUDE.md:65` + two precedent commits; no checker enforces the repo-meta carve-out                                        |
| The repaired prose will **stay** true                                   | **struck.** Nothing guards it. That is F5's whole finding, and the P7 item below is the open question it raises — not a claim this increment closes |

## Trust audit (P2)

One untrusted input: the **published installer package's own README**, consulted via `npm view
@pharn-dev/pharn readme` for F3/F4. It is third-party text fetched over the network — `trust: untrusted`.
Taint handling: it is used **only** as corroboration for two claims that are otherwise hedged, it is
never quoted into `README.md`, and no floor decision rests on it. The one fact taken from the registry
that reaches the repaired prose is `engines.node` (`>=20`), a structured field, not free text — and F4's
repair **drops** the unverifiable half rather than restating the package's claim. Per L32, note the
registry tag `@latest` is a mutable alias: it proves reachability of _a_ version, not identity of the
one a user installs, which is a second reason F4 narrows rather than sharpens its claim.

## Determinism audit (P5)

Every branch in this plan is a membership or exit-code test, none is an LLM classification:

- which paths the guard denies → the exit codes in F5's table (probe, not judgment);
- whether the index may be used for the lessons sweep → `check-lessons-index.mjs` exit 0 (GREEN, run);
- whether the declaration is well-formed → `check-plan-lessons.mjs` exit code at Step 4;
- whether the parsed scope equals `## Files` → `set-writes-scope.cjs --from-plan` count compare (L20);
- whether this increment bumps `SKILLS_VERSION` → the repo-meta membership rule at `CLAUDE.md:65`.

The one irreducible judgment is **whether the replacement wording is clearer**, whose terminal fallback
is the human gate below — not a guess (P5).

## The P7 decision I was asked to make explicitly

**Should README sites be registered in `.dev/floor/specified-primitives.json`, so F5's class is caught by
a checker?** **Deferred — and the reason is expressibility, not "hypothetical".**

L20's bar **is** met: the class has now occurred twice — L37's increment shipped two false README sentences
about the writes-scope guard's bounds, and F5/F6 are the second occurrence. So this is not a speculative
addition; the trigger has fired.

What blocks it is mechanical, and verified live rather than assumed. `check-specified-markers.mjs`
supports exactly two probe types — `path` (`:146`) and `dir-contains` (`:150`); any other value throws
(`:165`). F5's claim is **behavioural** ("the hook denies `memory-bank/**`"), and **neither probe type can
express it**: `.claude/hooks/protect-trusted-paths.cjs` has existed continuously, including through the
whole period when it contained zero `memory-bank` references, so a `path` probe was green across the exact
transition that made F5 true. Expressing it needs a **new probe type** — execute the hook over a fixture
payload and read the exit code — which is a new floor capability with its own tests and wiring, i.e. its
own increment (P3: that is a second axis of change, not a rider on a prose fix).

L35 is why this is recorded rather than quietly built: it says ask whether the second copy must exist
before reaching for a sync check. Here there is no redundant copy — so L35 does not veto the checker; it
only insists the question be asked and answered, which this paragraph does.

**Reopen trigger (named, per L33 — a deferral dropped silently is the defect):** the first time a
`check-specified-markers.mjs` probe needs to assert a **runtime behaviour** rather than a file's existence
— whether that need arises from README prose or from any of the four trusted docs. At that point the new
probe type is justified by a real need and README sites can be registered in the same increment. Until
then the honest statement stands and is already in the README: **no checker reads README prose.**

## Open questions — ALL RESOLVED at the GATE-1 halt (2026-09-10)

None remain open. Recorded here with their answers so the build stage reads a plan with no unresolved
questions; the original wording is kept so the record shows what was asked, not only what was decided.

1. **F6 is scope I added, not scope you asked for.** It came from L33's class sweep, is one clause, and is
   the same defect class as F5 — but it is a sixth item on a five-item request. Include it, or drop it?
   → **RESOLVED: include it.** F6 is in scope; the increment repairs six sentences.
2. **F5's shape changed under probing.** You asked for the row to be corrected; the probe shows the
   correct repair is a **separate, narrower row naming the promote escape**, not an addition to row 1.
   Confirm that is the repair you want.
   → **RESOLVED: separate, narrower row.** Row 1 keeps its current subject (trusted docs + control
   surface); a new row states the memory-bank denylist and names the gated-promote escape, with no
   exhaustiveness claim (L36).
3. **A probe I ran wrote the guard's own input.** To measure the promote escape I wrote
   `.pharn/writes-scope.json` via a Bash heredoc (outside `PreToolUse`) and restored it; it was absent
   before and is absent now, verified. The cleaner method is a throwaway fixture repo, as the
   `canon-write-denylist` increment used. Disclosed rather than omitted — no residue, but you should know
   the method.
   → **RESOLVED: acknowledged, no action.** The scope file was absent before and after, verified. Future
   guard probes in this repo should use a throwaway fixture repo.
4. **L18 recurred inside this plan, and that is worth your attention independently of the README work.**
   The first draft's exclusion block used the bold-prose form; `--from-plan` reported **3 path(s)** where
   `## Files` authorizes **1**, granting write-scope to `SKILLS_VERSION` and
   `.dev/floor/specified-primitives.json`. It was caught only because L20's discipline — run the setter,
   **read the printed count** — was followed; every downstream gate would have been GREEN. Repaired to the
   `###` heading form and re-verified: `1 path(s)` → `['README.md']`. L18 was promoted 2026-08-05 with a
   discipline-only remedy and L20 says such a remedy recurs; this is at least its second recurrence, in a
   plan whose author had just read both lessons. That may itself be the lesson candidate this run
   surfaces at GATE 2 — flagging it now so the decision is yours, not a footnote later.
   → **RESOLVED: carried to GATE 2** as this run's leading lesson candidate, to be judged there.
5. **Three whole-repo gates were RED before this increment began** — `lint:md`, `format:check` and
   `docs:check` — entirely from a leftover locked worktree at `.claude/worktrees/bash-write-claim-wording`
   (clean: 0 changed files, 0 unique commits vs `main`; excluded only via machine-local
   `.git/info/exclude`, so CI never saw it). L11's exact shape: an unrelated pre-existing error blocking
   every later feature's verify.
   → **RESOLVED: removed at the human's direction** (`git worktree unlock` then `remove --force`).
   Re-verified immediately after: `lint:md`, `format:check`, `docs:check` all exit 0, and
   `pharn/floor/validate.mjs .` reports **GREEN — 36 capabilities** (it had reported 72, double-counting
   through the worktree). Recorded because the pre-existing red is the baseline `/pharn-dev-regress`
   compares against: the cleanup happened **before** the build, so it cannot be mistaken for a
   regression this increment introduced or repaired.
