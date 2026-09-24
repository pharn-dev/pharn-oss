# PLAN — reconcile-symlink-hash

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L1, L2, L17, L29, L34, L52, L54, L57]
- increment: `reconcile-baseline.mjs`'s `hashFile` hashes a symlink whose target is not an openable regular file (a directory, a dangling or looping link) by its LINK TEXT instead of returning `null`, so an unchanged tracked directory symlink stops reconciling as a false `ESCAPE` and every downstream `/pharn-loop` run stops ending `STOP_TERMINAL` on it.
- layer(s): product floor (`pharn/floor/`) + `pharn/pharn-contracts/reconciliation-record.md`
- constitution_refs: [P0, P1, P5, P6, P7]

## The defect (reproduced live this run, at `7e9ed52`, 6.16.0)

A real dogfood failure (P7), recorded in a downstream project and reproduced here.

**Mechanism.** `hashFile` (`pharn/floor/reconcile-baseline.mjs:110`) opens the path with `openSync(abs, "r")`,
which FOLLOWS a symlink. For a link to a directory, `fstatSync(fd).isFile()` is false and it returns `null`
(`:114`). For a dangling link, the open throws and the catch returns `null`. Then:

1. `buildRecord` skips a `null` hash (`:146`), so the anchor never records the link;
2. `check-bash-reconcile.mjs:379-384` reads `null` as _"unreadable during reconcile, treated as changed"_ (the
   deliberate fail-closed rule) and makes the path a candidate;
3. the link is outside the build's scope, so the guards would deny it: `ESCAPE`, the `reconcile` gate goes red,
   verify `FAIL`s, and `check-loop.mjs` returns `STOP_TERMINAL` ("a retry would re-anchor and erase the detected
   escape"), so `/pharn-loop` makes no commit.

This happens on every run in any repo that tracks a symlink to a directory, with zero writes. `hashFile` has had
this shape since reconcile shipped in 4.0.0 (`7035087`, read this run with `git show`).

**Reproduced here,** read-only, against this tree's checker. The fixture was a scratch `git init` repo with one
tracked `.claude/skills/skill-a -> ../../vendored/skill-a`, then `--anchor`, then no change at all, then
`check-bash-reconcile.mjs --require-baseline`. Result: `"verdict": "ESCAPE"`, exit 1,
`escapes: [{ file: ".claude/skills/skill-a", denied_by: "writes-scope (fail-closed default)" }]`, warning
`unreadable during reconcile, treated as changed: .claude/skills/skill-a`. The anchor's `entries` held 4 paths
and not the link.

**The downstream record.** `pharn-starter` (installed `skillsVersion` 6.12.1) tracks 20 `.claude/skills/*`
directory symlinks into `.agents/skills/`. Its LOOP.md records at least eight `STOP_TERMINAL` runs whose
`reconcile` red is those links: `org-slug-routing`, `team-invitations`, `team-management`,
`team-ownership-transfer`, `smaller-findings`, `fix-static-rendering-nonce`, `remove-motion` and
`delete-a11y-tests`. The last two also had other escapes. It patched its installed copy in its PR #93 (`0b3d34e`,
2026-09-22). Its own `update pharn` commit (`119b3cf`, 2026-09-23) overwrote that copy with this repo's unfixed
bytes, which confirms `diff` against this tree's file is empty. Since then its 3 local tests of the patch fail
too. The fix belongs here. That downstream text is quoted as DATA (P2). The mechanism above was re-derived from
this tree's source, not taken from it.

## Applied lessons

- L1 — meta-doc sweep done. `SKILLS_VERSION`, `CHANGELOG.md` and the README badge (held equal to
  `SKILLS_VERSION` by `check:badge`) are in `## Files`. `CLAUDE.md`, `LIMITS.md`, `THREAT-MODEL.md` and
  `pharn/ARCHITECTURE.md` were grepped for `symlink`/`reconcil` this run. None of them states a fact this
  changes, so none is named.
- L2 — the contract's honesty travels with the artifact. `reconciliation-record.md`'s `entries` row today reads
  "SHA-256 of its bytes", which becomes false for a link, so the contract carries the new rule AND its bounds (see
  Guarantee audit). The PLAN is not where they live.
- L17 — this is L17's failure mode exactly: a blocking finding on the correct, designed workflow, which trains an
  operator to wave through the finding that must never be waved through. The downstream LOOP.md files already
  describe the 20 escapes as "pre-existing tool false positives". The fix removes the false finding. It does not
  exempt the path: a re-pointed link must still be an `ESCAPE` (★ non-vacuity test).
- L29 — the remedy ranges over a set: every path kind `git ls-files --cached --others` can hand `hashFile`. The
  deliverable is ONE enumeration (`PATH_KINDS`) in `reconcile-baseline.test.mjs`, iterated by the rules, not
  one test per kind I happened to think of.
- L34 — each ★ CLEAN case carries a non-vacuity mirror on the same fixture. Re-pointing the link must produce an
  `ESCAPE` naming exactly it, so a checker that stopped looking at links cannot pass.
- L52 — the set is named in the same sentence as the test. The kinds are: regular file, symlink→file, symlink→dir,
  dangling symlink, symlink through a file (`ENOTDIR`), self-loop (`ELOOP`), plain directory, missing path, and
  symlink→unreadable file. A closure assertion also checks that the errno codes the link-text branch accepts are
  exactly the codes the `PATH_KINDS` rows produce, so a code added to the module without a row fails.
- L54 — open/stat FOLLOW a link, so a dangling link looks absent. The fix never infers "not a link" from a failed
  open. It asks `readlinkSync`, the one call that answers for the name itself. The dangling case is a
  `PATH_KINDS` row, not an afterthought.
- L57 — the build formats only its own artifacts, with `--no-globs` on markdownlint and an explicit path list on
  prettier. It never runs a repo-wide `--write`/`--fix`: this checkout sits beside other sessions' worktrees.

## The fix — design, and the one place it deliberately diverges from the downstream patch

The downstream patch (`0b3d34e`) is the right shape, and its digest domain is adopted byte-for-byte:
`sha256("symlink\0" + readlinkSync(abs))`. So `pharn-starter`'s 3 local tests pass again after `pharn update`, and
a baseline it anchored with its patch reconciles consistently with this code.

**Divergence (one), and why.** The downstream patch falls back to link text on ANY open error. That includes
`EACCES` on a symlink to an unreadable regular file. There it would hash the link text, which stays the same
whatever the target's bytes do. That re-opens the evasion `check-bash-reconcile.test.mjs`'s REVIEW test guards
against ("an unreadable path is treated as CHANGED"): _make it unreadable_ would silence a change to a denied
file, now reached through a link. So the fallback is gated by errno membership in a closed set,
`LINK_TEXT_ERRNOS = ["ENOENT", "ENOTDIR", "ELOOP"]` (the target does not resolve to anything). Every other open
error returns `null` as before, and the path stays fail-closed.

Resulting `hashFile(abs)` table:

| path kind                                                                 | result                                        |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| regular file                                                              | `sha256(bytes)` (unchanged)                   |
| symlink → regular file                                                    | `sha256(target bytes)` (unchanged)            |
| symlink → directory / non-regular target                                  | `sha256("symlink\0" + linkText)` — **new**    |
| dangling symlink (`ENOENT`) / through a file (`ENOTDIR`) / loop (`ELOOP`) | `sha256("symlink\0" + linkText)` — **new**    |
| plain directory, gitlink, special file                                    | `null` (unchanged; `readlinkSync` → `EINVAL`) |
| missing path                                                              | `null` (unchanged)                            |
| symlink → unreadable regular file (`EACCES`)                              | `null` (unchanged — fail-closed, see above)   |

`openSync` stays first and stays the only path-addressed call before the fd. `readlinkSync(abs)` is a second
path-addressed call, reached only when the fd names no regular file or the open failed. It hashes a property of
the NAME, read in one syscall, so it never hashes bytes other than the ones it inspected. The ★ CWE-367 source
pin is tightened from "no `statSync(abs)`/`readFileSync(abs)`" to a CLOSURE: the path-addressed `*Sync(abs`
calls in the `hashFile` region are exactly `["openSync(abs", "readlinkSync(abs"]`. That is the same
comment-stripped technique the `amendScope` pin uses (L36's closure).

## Files

- `pharn/floor/reconcile-baseline.mjs` — `hashFile` link-text fallback, gated by errno; `LINK_TEXT_ERRNOS`
  exported (frozen); the `hashFile` comment block gains the symlink rule and its bounds — product floor
- `pharn/floor/reconcile-baseline.test.mjs` — `PATH_KINDS` enumeration + its rules, re-point cases, the errno
  closure, the CWE-367 closure pin (replacing the two negative asserts); the existing "null for a directory or a
  missing path" test is kept — dev test (never ships)
- `pharn/floor/check-bash-reconcile.test.mjs` — ★ end-to-end: a tracked directory symlink + a dangling symlink,
  anchor, no change → `CLEAN` with no "treated as changed" warning; ★ non-vacuity mirror: re-point the link →
  `ESCAPE` naming exactly it — dev test (never ships)
- `pharn/floor/worktree-fingerprint.mjs` — one header bound: it inherits the link-text rule (re-pointing a
  directory link now moves the digest; a stamp straddling the 6.16.1 upgrade on such a tree reads tree-moved,
  never fresh). No code change — product floor
- `pharn/pharn-contracts/reconciliation-record.md` — `entries` row + a short "Symlinks (6.16.1)" subsection with
  the bounds below — contracts
- `SKILLS_VERSION` — `6.16.0` → `6.16.1` (patch: a correction to shipped bytes; no new capability, no shape change)
- `README.md` — the shields badge to `6.16.1` (`check:badge`); nothing else
- `CHANGELOG.md` — new `## [6.16.1] - 2026-09-24` section above `[6.16.0]` (`[Unreleased]` is empty today, read
  this run, so nothing moves)

## Deliberately not touched

- `MIN_CLI` — no installed path moves and no contract shape changes, so an older CLI installs this tree correctly
- `CLAUDE.md` — states no fact this changes (L1 sweep above)

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — the baseline shape is unchanged (`version` stays `1`, same
  keys). Only the meaning of one `entries` value, for one path kind, is extended, and the row says so.
- `pharn/pharn-contracts/finding-shape.md` — unchanged; no finding field moves.

## Evals to write (P1)

No Capability (`role:`) is added or changed, so no `evals/` fixture is owed. The floor module's behavior is
specified by its `node --test` suites (the files above), which run in `npm test` and CI:

- `PATH_KINDS` → each kind's expected result per the table above (the unreadable-target row is skipped under
  root, where `chmod 000` does not deny a read)
- each link-text kind → re-pointing the link changes the digest; hashing twice is stable
- `LINK_TEXT_ERRNOS` → set-equal to the errno codes the `PATH_KINDS` link-text rows actually raise at `openSync`
- `pharn-starter` compatibility → `hashFile(dangling -> "nowhere") === sha256("symlink\0nowhere")`
- e2e → unchanged directory + dangling symlinks: `CLEAN`, exit 0, no escapes, no "treated as changed" warning;
  a re-pointed link: `ESCAPE`, exit 1, `escapes` names exactly that link

## Guarantee audit (P0)

- "an unchanged tracked symlink whose target is not an openable regular file reconciles `CLEAN`" → **floor:
  content-hash** (link text), pinned by the ★ e2e test
- "re-pointing such a link is still detected" → **floor: content-hash**, ★ non-vacuity test
- "an unreadable link target stays fail-closed" → **floor: content-hash** absence (`null` → candidate), pinned by
  the `EACCES` row. Skipped under root and stated as skipped.
- "the fallback fires only for a target that does not resolve" → **floor: enum** (errno membership in
  `LINK_TEXT_ERRNOS`), closure-pinned
- "writes INSIDE a linked directory are detected" → **struck as stated**. Only under those files' own tracked
  paths. A linked directory outside the repo is not descended, as before.
- "the first reconcile after upgrading is clean" → **struck**. An epoch anchored by pre-6.16.1 code has no entry
  for such a link, so its first reconcile under 6.16.1 still reports it (the downstream #93 LOOP.md measured
  exactly this). The remedy is a fresh anchor (the next `/pharn-*build`). Stated in the contract and the
  CHANGELOG. There is no version bump or transition branch: P7, and a legacy-epoch softening would be a
  fail-open window for a link created by Bash inside that epoch.
- "the link-text digest cannot collide with a content digest" → **struck**. A regular file whose bytes are
  exactly `symlink\0<text>` hashes equal to that link. That takes a deliberate forgery, which the contract already
  places outside the non-adversarial claim.
- "`pharn-starter`'s local tests pass after update" → **advisory**. The digest domain is pinned here by one test.
  Their test file is theirs and is not run by this repo.

## Trust audit (P2)

- Link text is attacker-choosable DATA. It is only fed to `createHash().update()`: never followed further, never
  printed, never parsed, never used as a path or a regex source. No new output field carries it.
- The downstream LOOP.md/commit text quoted in "The defect" is DATA. The mechanism was re-derived from this
  tree's source and re-measured on a fresh fixture.

## Determinism audit (P5)

- The fallback branch is errno membership in a closed, exported set, plus `readlinkSync` success or failure. No
  judgment. The unknown-errno path is `null`, which is the fail-closed direction.

## Out of scope (observed, not fixed — P7)

- `openSync(abs, "r")` on a tracked symlink to a FIFO would block. That is pre-existing, no failure has been
  observed, and `run-gates.mjs` already reads with `O_NONBLOCK` for its own case.
- Converting symlink→regular-file to link-text hashing (git's own semantics) would stop detecting a Bash write to
  an out-of-repo target reached through an in-repo link. It is not done.

## Open questions (HALT)

None. The user asked for the fix and delegated both gates in chat on 2026-09-24 ("tak, napraw to w pharn-oss";
"jak skończysz zrób PR i zmerguj jak będą zielone checki"). Plan acceptance is therefore a model decision made
under that delegation, recorded as such in SHIP.md, never as a human approval.
