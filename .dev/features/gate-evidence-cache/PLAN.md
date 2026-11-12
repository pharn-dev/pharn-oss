# PLAN — gate-evidence-cache

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L35, L41, L43, L58, L65, L66, L84]
- increment: A measured RED at the entry check is kept in a single-slot record under the git common directory, bound
  to every input that decides the gates' result; the next `/pharn-loop` or `/pharn-ship` whose `entry-gates.mjs
--start` computes the same inputs stops before the spec stage at zero gate minutes, naming the source run and its
  age. Greens are never cached, a cached result never publishes the entry-base offer, and `--refresh` (the loops'
  `--refresh-entry`, or `--allow-red-entry`) measures again.
- layer(s): product floor (`pharn/floor/`), the `pharn-contracts` loop-record and cost-ledger contracts, the product
  `.claude` command surface (`/pharn-loop`, its quick and close parts, `/pharn-ship`'s stages part); dev apparatus
  (`.dev/floor/command-hygiene.test.mjs`, `.dev/guides/floor-gates.md`)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- linear: CORE-86 (epic CORE-13); baseline `.dev/measurements/loop-baseline-2026-11-11.md` §6, §7, §12 (rated
  **needs-evidence**)

## Why (P7), and the scope decision it forces

The baseline's 36 `/pharn-loop` runs: 16 stopped at the entry check; 12 of 36 runs used a `base_sha` an earlier run had
used, **5 of them among the 16 entry stops** (§6). That is an **upper bound**: a stopped run leaves its
`pharn/features/<name>/` uncommitted, no ledger records a tree fingerprint, so tree equality was unverifiable then. Each
of those re-runs paid the entry runner again (median runner lifetime 15.7 min, §6) and the spec stage (and, before
7.5.0's peeks, the plan) before the same stop. §12 rates the task **needs-evidence** and shows no use for cached greens.

The ticket's own scope says "cache measured reds, and greens only if the baseline shows a use for them". **Orchestrator
decision (made under the maintainer's delegation, recorded in SHIP.md as such): build reds only.** A green is never
cached, so nothing stands in for evidence a later check relies on: regress, verify and the entry-base offer see exactly
what they see today. The bounded gain, stated honestly for the PR: at most 5 of 16 entry stops, fewer once tree
equality is required, and 7.5.0's spec peek already stops some of them one stage later.

## Applied lessons

- L35 — every fact is read from its one owner, never re-spelled: the tree digest is `worktree-fingerprint.mjs`
  `fingerprint` (extended by one option, below — not a second hasher); the gate set is the `entries` `run-gates.mjs init`
  just wrote (the record) and the validated stamp's `runs` (the source); `gates.exclude` is `gate-exclusion-core.mjs`
  `loadGateExclusion`; the lockfile names are `stage-regress-core.mjs` `LOCKFILE_FAMILIES`; the per-worktree git-dir
  path is `regress-base-reuse.mjs` `gitDirFile`; reads go through `readRegularFile`; quoted values through `shown`. The
  one deliberate non-reuse is `gate-reuse-core.mjs` `executionIdentity`: it binds the **absolute** working directory,
  which would make every fresh worktree a miss, the opposite of the ticket's reason for storing under the common dir
  (open question 2).
- L41 — the age limit and the record's path are single constants with no caller override; one CLI test runs the real
  `--start` with no injected clock or path, so the production defaults are exercised (a record dated 25 h ago misses
  `expired` through the real CLI).
- L43 — the key binds the record to its **referent** (the tree, HEAD, the resolved commands, the install files), not
  to another stored copy; a test pins that each bound input, changed alone, is a miss.
- L58 — the referent is still being written between the source run and the lookup: the source run's own
  `pharn/features/<name>/` grows after its gates ran, and the next run gets a new name. The split is named: the key's tree
  digest excludes exactly the source run's and the looking run's own feature directories (the part that may change),
  and binds the rest exactly. The age limit bounds what the key cannot see (ignored files, environment).
- L65 — the start-time inputs the record will carry are captured into the per-worktree git dir (beside the entry-base
  offer), and the record into the common git dir, both out of the write tools' reach; a ★ HOOK test probes both paths
  through the real guards in a main checkout and a linked worktree.
- L66 — the record crosses runs on purpose, so a stale file is the defining risk: it is read only when every bound
  input is equal and it is younger than the limit, and every decided `--wait` replaces or clears the slot, so a re-run
  that measures green on the same tree removes the red it superseded.
- L84 — the hit is the non-default branch (a miss runs the gates as today): the tests build the realistic input — a red
  `--wait` in one feature, then a `--start` of a second feature on the same tree with the first one's feature directory
  left behind — and assert exit 4 with no runner spawned.

## Files

- `pharn/floor/entry-gate-cache-core.mjs` — NEW, pure: record and inputs schemas, the closed MISSES (ordered,
  first failure decides) and NOT_CACHED enums, `cacheableRed`, `buildRecord`, `decideCache` — layer product floor
- `pharn/floor/entry-gate-cache-core.test.mjs` — NEW: every miss member alone, every not-cached member, closure —
  layer product floor (tests, never shipped)
- `pharn/floor/entry-gate-cache.mjs` — NEW, I/O: the common-dir record path, read (no follow), atomic write, clear; the
  start-time input capture (node, repo prefix, install files, declared exclusion) to the per-worktree git dir — layer
  product floor
- `pharn/floor/entry-gate-cache.test.mjs` — NEW: storage round trip, symlink refusal, ★ HOOK probe — layer product floor
- `pharn/floor/entry-gates.mjs` — `--start [--refresh]`: capture inputs, look up after `init`, stop on a hit (exit 4, no
  runner); `--wait`: record or clear after a decided verdict — layer product floor
- `pharn/floor/entry-gates-core.mjs` — `cached-red` joins REASON_CODES (the result a hit leaves) — layer product floor
- `pharn/floor/entry-gates.test.mjs` — CLI: hit, each miss through the CLI, refresh, AC2's regress miss — layer product
  floor (tests)
- `pharn/floor/entry-base-evidence.test.mjs` — BUILD AMENDMENT: its offer test starts a second run on the tree a red
  run just measured, which now hits the cache; that start is `--refresh` — layer product floor (tests)
- `pharn/floor/worktree-fingerprint.mjs` — `fingerprint(…, {alsoExclude})`: a second feature directory excluded at the
  entry stage only; every existing digest byte-identical — layer product floor
- `pharn/floor/worktree-fingerprint.test.mjs` — the golden digest unchanged; `alsoExclude` equal to `feature` or absent
  is identity — layer product floor (tests)
- `pharn/floor/entry-observations.mjs` — `cached-red` joins START_OUTCOMES (a terminal start, like `no-gates`) — layer
  product floor
- `pharn/floor/entry-observations.test.mjs` — the new outcome validates and ends the invocation at the start — layer
  product floor (tests)
- `pharn/floor/loop-record-core.mjs` — `gates-red-cached` joins BLOCKED_IDS — layer product floor
- `pharn/pharn-contracts/loop-record.md` — the blocked-id list gains `gates-red-cached` — layer pharn-contracts
- `pharn/pharn-contracts/cost-ledger.md` — the `start` outcome list gains `cached-red` — layer pharn-contracts
- `pharn/pharn-contracts/gate-run-record.md` — the `entry` bullet names the cached-red record and that it is never
  evidence for any stage — layer pharn-contracts
- `.claude/commands/pharn-loop.md` — the `--refresh-entry` flag; Step 1a item 6's two lines and exit `4`; the S14c row;
  one allowed-tools line — layer product command
- `.claude/commands/pharn-loop-quick.md` — the flag in the quick entry grammar — layer product command
- `.claude/commands/pharn-loop-close.md` — Step 7 quotes the cached-evidence line on S14c — layer product command
- `.claude/commands/pharn-ship-stages.md` — Step 2.1: exit `4` asks Stop / Continue; Continue runs the `--refresh` line —
  layer product command
- `.dev/floor/command-hygiene.test.mjs` — the stuck-point count and S14c row; the new `--start` lines are allowed and
  pinned — layer dev apparatus
- `.dev/guides/floor-gates.md` — a `## entry-gate-cache.mjs` section — layer dev apparatus
- `CHANGELOG.md` — `## [7.14.0] - 2026-11-12` — repo meta
- `SKILLS_VERSION` — 7.13.1 → 7.14.0 (minor: a newly shipped capability) — repo meta
- `README.md` — the generated `## Current state` region, regenerated by `npm run docs:generate` — repo meta

## Design

### Where each piece lives, and who can write it

| piece                 | path                                                                          | write tools                    |
| --------------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| the cached-red record | `<git rev-parse --git-common-dir>/pharn-entry-gate-cache.json` (one per repo) | denied (★ HOOK)                |
| start-time inputs     | `<git rev-parse --absolute-git-dir>/pharn-entry-cache-inputs.json` (per tree) | denied (★ HOOK)                |
| the source stamp      | `pharn/.run/pharn-entry/gates/stamp.json` (unchanged)                         | reachable (existing L43 bound) |

The common dir is resolved as `resolve(cwd, git rev-parse --git-common-dir)` (git prints it relative in a main
checkout), so every worktree of a repository reads one record. In a main checkout both git-dir paths carry a `.git`
segment (`protect-trusted-paths.cjs`); in a linked worktree both resolve inside the main checkout's tree, which
`enforce-writes-scope.cjs` denies as another git tree — the layouts the entry-base offer's ★ HOOK test already proves.
**No hook script changes.**

### The key — every input, and the miss each one produces

| input               | record side (source run)                                                                                                                                                                       | lookup side (this run)                                                     | miss (order)                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| refresh             | —                                                                                                                                                                                              | `--refresh` given                                                          | `refresh` (1)                          |
| the record          | —                                                                                                                                                                                              | absent / unreadable / malformed / link                                     | `no-record` (2), `record-unusable` (3) |
| inputs computable   | —                                                                                                                                                                                              | any input below unavailable (no HEAD, git fails, exclusion refuses)        | `inputs-unavailable` (4)               |
| age                 | `measured_at` = the `--start` moment                                                                                                                                                           | now − measured_at > 24 h / < −5 min                                        | `expired` (5), `future-dated` (6)      |
| node                | `process.version` + platform-arch at `--start`                                                                                                                                                 | same, now                                                                  | `node-changed` (7)                     |
| working directory   | `git rev-parse --show-prefix` (repo-relative)                                                                                                                                                  | same, now                                                                  | `cwd-changed` (8)                      |
| timeout             | runner `timeout_ms`                                                                                                                                                                            | `--timeout-ms`                                                             | `timeout-changed` (9)                  |
| `gates.exclude`     | the declared list (`loadGateExclusion`), sorted                                                                                                                                                | same, now                                                                  | `exclude-changed` (10)                 |
| each gate's command | stamp `runs[]` `{id, shell, argv, files}` minus `base:test`                                                                                                                                    | `init`'s `entries[]`, same fields                                          | `gates-changed` (11)                   |
| install state       | `hashFile` of every `LOCKFILE_FAMILIES` name at the root plus the package managers' install records (`node_modules/.package-lock.json`, `.modules.yaml`, `.yarn-state.yml`, `.yarn-integrity`) | same, now                                                                  | `install-changed` (12)                 |
| HEAD                | stamp `head` (non-null required)                                                                                                                                                               | `init`'s `head`                                                            | `head-changed` (13)                    |
| tree                | stamp `fingerprint` `{algo, init}` (ENTRY_ALGO, the source feature's directory excluded)                                                                                                       | `fingerprint(".", {feature, stage: "entry", alsoExclude: source.feature})` | `tree-changed` (14)                    |

A hit requires all fourteen to pass. The specific inputs are checked before `tree-changed`, so a lockfile edit (tracked,
so the tree moves too) reads `install-changed`, a `pharn.config.json` exclusion edit reads `exclude-changed` — the
ticket's sixth criterion is observable by name.

**Feature-neutral (L58).** A stopped run leaves `pharn/features/<src>/` behind and the next run picks a new name, so the
lookup's tree digest excludes both `pharn/features/<this run>/` and `pharn/features/<src>/` (with their `.dev/features/`
artifact names, as `isExcluded` already does for one). With one directory excluded the digest is byte-identical to
today's ENTRY_ALGO digest, so the record can carry the source stamp's own `fingerprint.init`. Every other leftover
feature directory stays bound.

### When a run is recorded, and when the slot is cleared (`--wait` only; `--peek` writes nothing, as today)

After `decideDone` has decided a verdict over a bound `done` result (and after the offer, unchanged), with the inputs
file bound to this runner's nonce:

- **record** iff the verdict is `red`, `unmeasured` is empty (no gate timed out or failed to start), `mutated` is empty
  (no gate moved the tree, `base:test` included), the stamp's `head` is non-null, and at least one red gate is
  **not** in STYLE_SET (open question 1). The record carries only those non-style red ids;
- otherwise **clear** the slot (any key) — the closed reason is `not-red`, `style-only`, `unmeasured`, `mutated`,
  `inputs-unavailable`. Clearing on a green is what makes `--refresh` self-healing: a re-measured green on the same tree
  removes the stale red.

Best-effort: a write or clear failure is one `entry-gates: note —` line on stderr and changes no document, exit or
record — exactly the offer's rule.

### The lookup (`--start`, after `init` succeeded, before the runner is spawned)

1. Capture the start-time inputs to the per-worktree git dir (always — a `--refresh` run still records its result).
2. With `--refresh` → miss `refresh`. Else read the record and decide (`decideCache`, pure).
3. **Hit** → write `result.json` as `unusable` / `cached-red` (so a stray `--wait` or `--peek` reads that, never a
   takeover), record the `start` observation with outcome `cached-red`, print one line naming the red ids, the source
   run (its feature and the moment its gates started), its age, and the two ways out, and **exit 4**. No runner, no
   gate, no offer: `--start` discarded the offer before `init`, as today.
4. **Miss** → print `entry-gates: cached evidence — miss <member>` and continue exactly as today.

### The commands

- `/pharn-loop [--allow-red-entry] [--refresh-entry] …` (and `--quick`): Step 1a item 6 runs `--start --refresh …`
  when either flag was typed, else `--start …`. Exit `4` → **S14c** (`blocked: gates-red-cached`), a Step 1a stop like
  S4 and S15b: no feature directory, no record, the close part's Step 7 quotes the `--start` line. The row's remedy: fix
  the gate and commit (the tree moves, so the next run misses), re-run with `--refresh-entry` to measure again (a flaky
  red, an environment the key cannot see), or `--allow-red-entry` when fixing it is the feature.
- `/pharn-ship` Step 2.1: exit `4` → present the line as DATA and ask **Stop** / **Continue**; Continue runs the
  `--refresh` line, and the later peek and final read branch as written.

## Acceptance criteria → how each is met and tested

1. **A hit requires every bound input to be equal; each miss is a closed-enum member and runs the gates as today.**
   `decideCache` returns `{hit: true}` only when all checks pass; MISSES is frozen and ordered. Core test: from one
   matching (record, live) pair, mutate each input alone → exactly its member; ✧ closure: every member has a producing
   case and every produced value is a member (L36). CLI test: a miss prints its member and the runner starts (exit 0,
   the verdict arrives through `--wait` as before).
2. **A cached result publishes no entry-base offer; regress misses and measures BASE itself.** CLI test: after a hit,
   `entry-base-evidence.mjs` `readOffer()` is `absent`, a following `--wait` prints `unusable cached-red` and still no
   offer exists, and `decideEntryFromDisk` returns miss `no-offer` (a member of `ENTRY_BASE_MISSES`, the miss on which
   `stage-regress.mjs` runs the BASE side).
3. **Only completed, non-mutating, non-timed-out runs are cached — and only reds.** Core test over `cacheableRed` with
   a timed-out gate, a not-started gate, a mutated gate, a mutated `base:test`, a green, a style-only red, a null head;
   CLI tests: a timed-out gate's run and a green run leave no record (and a green clears an existing one); `--peek`
   over a finished red result writes no record.
4. **A stop names the source run and its age; `--allow-red-entry` or a refresh flag bypasses it.** CLI test: the hit
   line names the source feature and `measured_at` and an age; `--refresh` on the same tree is miss `refresh` and runs
   the gates. Command tests: the loop maps `--allow-red-entry` and `--refresh-entry` to the `--refresh` line, and S14c's
   row names both.
5. **The cache record is denied to the write tools.** ★ HOOK test (the entry-base offer's shape): both real guards in a
   main checkout and a linked worktree deny the record path and the inputs path; `pharn/.run/pharn-entry/` stays
   writable (control).
6. **Changing the lockfile, the node version or `gates.exclude` produces a miss.** CLI test: record a red, then edit
   `package-lock.json` → `install-changed`; edit `pharn.config.json` `gates.exclude` → `exclude-changed`. Node version
   through the core (`node-changed`), since a test cannot swap the running node; the I/O capture is pinned to read
   `process.version` by a storage test.

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — the entry stamp is read through `validateStamp` (unchanged); the cache is
  derived from it and is evidence for no stage (no reuse-matrix row).
- `pharn/pharn-contracts/loop-record.md` — `gates-red-cached` joins the blocked ids, pinned equal to BLOCKED_IDS and the
  stuck-point table by the existing ✧ test.
- `pharn/pharn-contracts/cost-ledger.md` — `cached-red` is a terminal `start` outcome; the ledger's existing rule for a
  non-`started` outcome applies unchanged.
- `pharn/pharn-contracts/regression-report.md` — unchanged: a cached hit never reaches regress, and a miss leaves the
  offer path exactly as it is.

## Evals to write (P1)

No capability with `role:` is added; the floor tests above are the specification (the `entry-context-guard`
precedent). Each acceptance criterion maps to at least one named test.

## Guarantee audit (P0)

- "a hit requires every bound input to be equal" → **floor: enum-regex + content-hash** (string equality over sha256
  digests and canonical JSON, membership over MISSES).
- "the record is out of the write tools' reach" → **floor: hook**, probed by the ★ HOOK test; Bash reaches it (L19), so
  a Bash writer can forge a record — and a forged record can only **stop** a run, never green one, with `--refresh-entry`
  as the way out.
- "a cached result publishes no offer" → **floor**: the hit returns before any code path that calls
  `publishEntryOffer`, and `--start` discards the offer first (test-pinned).
- "a cached red equals what a fresh run would measure" → **advisory**, and labeled so everywhere: environment
  variables, machine load, flaky tests, ignored files outside the install records (caches, `.env`, build output) and
  the absolute path are unbound; the 24 h limit bounds their drift, it does not remove it.
- "a non-style gate read nothing in the excluded feature directories" → **advisory**, inherited unchanged from
  entry-gates-core.mjs's existing bound (`entry-gates-nonstyle-overlap`).
- "the slot holds the latest measurement" → **advisory**: single slot, last writer wins across concurrent worktrees.

## Trust audit (P2)

The record holds gate ids (ALLOWLIST members from a validated stamp), hex digests, a slug, an ISO timestamp and a nonce;
the decision reads only those, by equality and membership. Gate output is never read. Every value quoted into the stop
line goes through `shown`. The record is read lstat-first without following (`readRegularFile`); a link, a FIFO, a
directory or an oversize file is `record-unusable`.

## Determinism audit (P5)

Every branch is a membership or equality test: the first failing check of the ordered MISSES decides; the record/clear
decision is membership over the verdict's lists and STYLE_SET; the commands branch on `--start`'s exit code only. The
terminal fallback of every unknown is a miss (the gates run as today), never a stop.

## Versioning

Minor (a newly shipped capability): 7.13.1 → **7.14.0**. No config key is added (the age limit is a constant), no
installed path moves and no existing frontmatter or contract shape breaks, so `MIN_CLI` does not move
(`.dev/guides/versioning.md`). The git-dir files are run state, not installed paths. No trusted-doc sentence goes stale
(`pharn/LIMITS.md` §5's reuse sentence is about verify reusing regress within one run, which this does not touch);
an optional LIMITS sentence naming the cross-run stop goes into the PR body as a proposal.

## GATE 1 — decision (recorded)

Approved as written by the orchestrator: **a model decision made under the maintainer's delegation, not a human
approval**. Every open question was answered as recommended:

1. Style reds — **non-style reds only**; a style-only red is `style-only`, not cached.
2. Working directory — **the repo-relative prefix** is bound; the absolute path is unbound and labeled advisory.
3. Age limit — **24 h, fixed**, no config key.
4. The loop's stop — **a new row S14c** (`blocked: gates-red-cached`).
5. **One record per repository, last writer wins**; the contract says that a clear only ever removes a hit, never adds a
   stop.
6. A red run with an unmeasured gate beside it — **not cached**.

Three build-time checks the decision named: (a) exit `4` is not taken by any `entry-gates.mjs` mode or by a caller's
mapping of `--start` before it is pinned; (b) a missing or unwritable git common dir is the `inputs-unavailable` miss at
the lookup and a best-effort stderr note at the write, never a crash or a stop; (c) the `pharn-loop.md` byte ceiling —
text moves to the close part rather than the ceiling rising without a stated reason.

## Build amendment (recorded)

The first full `npm test` of the build found one test outside `## Files` that the feature changes by design:
`pharn/floor/entry-base-evidence.test.mjs` ("the offer is published only after a validated … --wait") runs a red entry,
then a second `--start` on the same tree to show that a start removes the offer — and that start is now a cached-red hit
(exit 4; the offer is still removed). The test's subject is the offer, not the cache, so its second start becomes the
`--refresh` line and the assertion is kept. The path was added to `## Files` and the build's Step 0 (setter, then
anchor) was run again, so reconcile judges the amended scope. No other file was added. A model decision under the
maintainer's delegation, recorded in SHIP.md.

## Open questions (HALT)

None — resolved at GATE 1 (above).
