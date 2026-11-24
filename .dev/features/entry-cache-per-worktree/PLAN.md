# PLAN — entry-cache-per-worktree

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L35, L65, L66, L84]
- increment: The entry check's cached-red record (`pharn-entry-gate-cache.json`, CORE-86) moves from the git COMMON
  dir to each worktree's own git dir (`git rev-parse --absolute-git-dir`, beside the start-time inputs it is already
  paired with), and its schema moves to `pharn-entry-gate-cache/2` so every record written before the upgrade is read
  as `record-unusable` (a miss) and never stops a run.
- layer(s): product floor (`pharn/floor/`), the `pharn-contracts` gate-run-record contract (one sentence); dev
  apparatus (`.dev/guides/floor-gates.md`)
- constitution_refs: [P0, P2, P6, P7]
- linear: CORE-358 (follow-up of epic CORE-293; defect observed in CORE-342's runs)
- bump: patch, 7.25.0 → 7.25.1 (a correction to shipped behaviour; no contract an install reads changes shape, no
  installed path moves, MIN_CLI unchanged)

## Why (P7) — the observed failure

CORE-342 ran `/pharn-loop` in two linked worktrees of pharn-app (`arm-a`, `arm-b`). Arm B's first run stopped S14 on a
load-timed-out `test`, and `--wait` stored that red in `pharn-app/.git/pharn-entry-gate-cache.json`, the COMMON git dir
the main checkout and every worktree share. After arm B's `pharn/.run/` and its own worktree git-dir records
(`.git/worktrees/arm-b/pharn-entry-cache-inputs.json`, `pharn-pre-run-snapshot.json`) were removed, its next run still
stopped S14c (`blocked: gates-red-cached`). Evidence: `~/Projects/pharn-measure/core-342/b-run1/gitdir/common-pharn-entry-gate-cache.json`
and `b-run2/final.json`; record `.dev/measurements/grill-effort-e1-2026-11-24.md`.

The defect the ticket names, and the only two things this increment fixes:

1. **the shared slot** — one file per repository that every worktree reads and overwrites, the user's main checkout
   included, so a red measured in one worktree can stop another and a cacheable red written in one replaces another's;
2. **the reset** — clearing a worktree's own state does not reset the slot, because the file sits in a directory no
   worktree-scoped cleanup touches.

## Why the common dir was chosen, and why it is given up

The common dir was **deliberate**. `.dev/features/gate-evidence-cache/PLAN.md` (L35 note, and the record table)
stored the record there "so every worktree of a repository reads one record", and `entry-gate-cache-core.mjs` leaves
the absolute working directory out of the key "so a fresh worktree of the same repository can hit". The trigger was an
**upper bound** (`.dev/measurements/loop-baseline-2026-11-11.md` §6: 5 of 16 entry stops reused an earlier run's base
commit, tree equality unverifiable then), and that increment's own GRILL said cross-worktree hits were unmeasured and
may be rarer than the design implied (the install key hashes `node_modules` package-manager records, which a fresh
`npm ci` in another worktree may not reproduce byte for byte). No measurement since has shown a cross-worktree hit
saving a run; CORE-342 shows the first real cross-worktree effect, and it is the harmful one.

Alternatives weighed (the brief asked for the smallest one that keeps a deliberate reuse):

| option                                                    | shared slot fixed?                      | reset fixed?          | keeps cross-worktree hits? |
| --------------------------------------------------------- | --------------------------------------- | --------------------- | -------------------------- |
| **(chosen) record in the per-worktree git dir**           | yes                                     | yes (see below)       | no                         |
| add a worktree identity (the absolute git dir) to the key | no — still one slot, last writer evicts | no                    | no (same loss)             |
| file name scoped by worktree, kept in the common dir      | yes                                     | no — still outside it | no (same loss)             |
| keep the common dir, document `--refresh-entry` as reset  | no                                      | partly                | yes                        |

Every option that fixes the shared slot gives up cross-worktree hits, because a hit in another worktree **is** the
shared slot. Of those, only the per-worktree git dir also gives the reset, and it reuses the resolver and the
directory the paired inputs file already uses (L35). The lost gain is the unmeasured one above; the PR says so.

**The reset, exactly.** With the record beside the worktree's other git-dir records, removing that worktree's git-dir
records (what CORE-342 did) or the worktree itself (`git worktree remove` deletes `.git/worktrees/<name>/`) removes
the record too; `--refresh-entry` / `--allow-red-entry` (`--start --refresh`) still measure again and replace or clear
it. Clearing `pharn/.run/` alone still does not reset it, and that stays deliberate: the record is kept out of
`pharn/.run/` because the write tools reach `pharn/.run/**` (the ★ HOOK test's control), and moving it there would let
any write-tool edit plant or drop it. This bound is stated in the code header and the guide, not hidden.

**The main checkout** is unchanged by the move: there `--absolute-git-dir` and `--git-common-dir` name the same
`.git`, so the path is byte-identical to today's (pinned by a test).

## Migration decision — ignore, by a schema bump (fail safe)

A record written before the upgrade sits in the common dir. After the move only the main checkout reads that path, and
it cannot tell its own pre-upgrade record from one a linked worktree wrote there. **Decision: ignore every
pre-upgrade record** by moving `RECORD_SCHEMA` to `pharn-entry-gate-cache/2` (shape otherwise unchanged).
`recordDefect` already refuses any other schema string, so a `/1` record reads `record-unusable` — a miss, the run
measures — and the main checkout's next decided `--wait` replaces or clears it. A `/1` file in the common dir that no
main-checkout run ever touches again is inert: nothing reads it as evidence. **No migration code** (moving a record
into a worktree would carry exactly the cross-worktree evidence this increment stops trusting), and no deletion of
another directory's file from a worktree. Mixed versions are safe both ways: an older install reads a `/2` record as
`record-unusable` too. Cost: at most one lost hit per checkout, once.

## Applied lessons

- L35 — the record's path is read from the one owner of "a file in this worktree's git dir",
  `regress-base-reuse.mjs` `gitDirFile` (the inputs file already uses it), and the second resolver
  `commonDirFile` is **retired** (deleted, no other user — checked by grep), not kept in sync beside it.
- L65 — the record stays out of the write tools' reach: in a main checkout the path carries a `.git` segment
  (`protect-trusted-paths.cjs`), in a linked worktree it lies inside the main checkout's tree
  (`enforce-writes-scope.cjs`); the existing ★ HOOK test is updated to probe the NEW linked-worktree record path
  (`.git/worktrees/<wt>/…`) through both real guards, not assumed from the inputs file's result.
- L66 — this ticket is L66's shape in another place: a lookup on a path several worktrees share was satisfied by a
  record another worktree's run left. The remedy follows L66 (state into a place the run owns) — the record moves into
  the worktree's own git dir, and the pre-upgrade shared file is ignored by schema rather than trusted by path.
- L84 — the feature's effect is a MISS in one branch (worktree B) and an unchanged HIT in another (main checkout); the
  test builds the realistic input — a real two-worktree temp repo, a valid record written from worktree A — and asserts
  B reads `absent`, A reads `ok`, the main checkout's own record round-trips at the unchanged path, and a `/1` record
  at the old common path reads `unusable` from the main checkout.

## Files

- `pharn/floor/entry-gate-cache.mjs` — `cachePath()` → `gitDirFile(CACHE_BASENAME)`; `commonDirFile` removed; the
  header's "WHERE EACH PIECE LIVES" rewritten (per worktree; the reset; why not `pharn/.run/`) — layer product floor
- `pharn/floor/entry-gate-cache-core.mjs` — `RECORD_SCHEMA` → `pharn-entry-gate-cache/2`; header "THE RECORD" and
  "WHAT IT DOES NOT CLAIM" re-stated for one record per worktree (no cross-worktree hit; the absolute path still
  unbound, now because a record never leaves its worktree) and the `/1` migration line — layer product floor
- `pharn/floor/entry-gates.mjs` — the one header comment that says "the repository's one cached-red record" →
  "this worktree's" (comment only, no behaviour) — layer product floor
- `pharn/floor/entry-gate-cache.test.mjs` — the "lives in the git COMMON dir" test replaced by the two-worktree test
  (A's red not read by B; main checkout path unchanged and round-trips; worktree write leaves main's slot untouched;
  a `/1` record reads `unusable`); the ★ HOOK test's linked-worktree probe now asserts the record is under
  `.git/worktrees/`; the file header updated — layer product floor tests (never ship)
- `pharn/floor/entry-gate-cache-core.test.mjs` — pin `RECORD_SCHEMA === "pharn-entry-gate-cache/2"` so the bump is
  deliberate (one assertion) — layer product floor tests (never ship)
- `pharn/pharn-contracts/gate-run-record.md` — the 7.14.0 sentence "the repository's one cached-red record (… in the
  git common dir) … one record per repository" corrected to one record per worktree, in its git dir, since 7.25.1 —
  layer pharn-contracts
- `.dev/guides/floor-gates.md` — the `entry-gate-cache.mjs` section: record path, "ONE per repository, so another
  worktree hits", "so fresh worktrees can hit" and "one slot … across worktrees" corrected; the reset named — layer
  dev apparatus
- `README.md` — the version badge 7.25.0 → 7.25.1 (`check:badge` binds it to `SKILLS_VERSION`; added at build, and
  the build's anchor re-taken over a clean tree before any edit — see SHIP.md) — repo meta
- `pharn-install.json` — the generated install manifest, regenerated by `npm run docs:generate` (it pins the product
  files' digests; the first regress run went red on its two drift tests, so the plan was corrected and the build re-run
  over a fresh anchor — see SHIP.md) — repo meta, generated
- `SKILLS_VERSION` — 7.25.0 → 7.25.1 — repo meta
- `CHANGELOG.md` — a `## [7.25.1]` section with one `### Fixed` entry — repo meta

### Not changed (checked this run)

- No trusted doc and no hook script: `pharn/LIMITS.md` and `pharn/THREAT-MODEL.md` do not mention the cache record
  (grep `gate-cache|cached` this run); the guards already deny the new path (the inputs file sits in the same
  directory and the ★ HOOK test already proves it). **No protected-file patch is needed.**
- No command text: `/pharn-loop` S14c and `/pharn-ship-stages` say "an earlier run measured a gate red on this same
  tree", which stays true.
- No generated doc: `docs/` and the README inventory do not mention `entry-gate-cache` (grep this run).
- `MIN_CLI`: no installed path moves and no install-read shape changes.

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — the entry stamp as the cached record's source: unchanged; only the
  record's location and cardinality sentence is corrected (P4: the rule stays in `entry-gate-cache-core.mjs`'s header,
  the contract cites it).

## Evals to write (P1)

No Capability or `rule_id` is added or changed (floor checker + tests only); `validate.mjs` must stay GREEN. Tests:

- two-worktree repo: `writeCache` from worktree A → `readCache` from A is `ok`, from B is `absent`; the main
  checkout's `readCache` is still `absent` (A did not touch main's slot)
- main checkout: `cachePath()` equals `<repo>/.git/pharn-entry-gate-cache.json` (unchanged path), write → read `ok`
- B's own record path is under `.git/worktrees/` and differs from A's and from main's
- migration: a record with `schema: "pharn-entry-gate-cache/1"` (otherwise valid) at the main checkout's path reads
  `unusable`; through the decision that is `record-unusable`, never a hit
- ★ HOOK: both real guards deny the worktree record path (exit 2), controls unchanged

## Guarantee audit (P0)

- "a record written in one worktree is never read by another" → floor-adjacent, not a new primitive: the path is a
  deterministic function of `git rev-parse --absolute-git-dir` (git's own per-worktree dir); pinned by the test.
  Bound: a Bash writer can copy a file into another worktree's git dir (L19) — a forged record can still only STOP a
  run, never green one (unchanged bound).
- "a pre-upgrade record never stops a run" → floor: enum-regex (`recordDefect` string equality on `schema`).
- "the record is out of the write tools' reach" → floor: hook (★ HOOK test, both guards, both layouts).
- "removing a worktree's git-dir records resets the cache" → floor-adjacent fact of the path (same directory as the
  inputs); stated, and pinned by the location test. "clearing `pharn/.run/` resets it" is NOT claimed.
- "a cached red equals a fresh measurement" → advisory, unchanged.

## Trust audit (P2)

No new input. The record is read by equality and membership exactly as before; only its location changes.

## Determinism audit (P5)

No new branch. The schema change makes an old record fail the existing membership check.

## Open questions (HALT)

- None of fact. GATE 1 decisions for the orchestrator: the per-worktree move (giving up unmeasured cross-worktree
  hits), the ignore-by-schema migration, and patch 7.25.1.
