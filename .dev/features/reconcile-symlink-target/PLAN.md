# PLAN — reconcile-symlink-target

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L59, L54, L51, L36, L34, L37, L1, L57]
- increment: `hashFile` classifies a path with `readlink` BEFORE any follow-call and hashes EVERY symlink by its link text (what git stores for a mode-120000 entry), so an edit made through a link is attributed to the target's own path — the path the live write guard judges — and the reconciler stops reporting a false `ESCAPE` on the link; the shared worktree fingerprint inherits the rule under a bumped `ALGO`.
- layer(s): product floor (`pharn/floor/`), `pharn-contracts`
- constitution_refs: [P0, P2, P5, P6, P7]

## The failure (verified review finding, reproduced this run)

`pharn/floor/reconcile-baseline.mjs` `hashFile` opens every enumerated path with `openSync(abs, "r")`, which FOLLOWS
a symlink. For a link whose target is a regular file it hashes the TARGET's bytes and records that digest under the
LINK's path. `check-bash-reconcile.mjs` then judges the link path as text (`authorizingScope`, the one duplicated
matcher), while the live guard `enforce-writes-scope.cjs` `realpathSync`s the target first.

Probed this run (L37 — executed, not read), a throwaway repo with tracked `CLAUDE.md -> AGENTS.md`, scope
`["AGENTS.md"]`, runner `.pharn/pharn-dev-plan/probe.mjs` on HEAD `22f002a`:

- live guard, Write `AGENTS.md` → exit 0; Write `CLAUDE.md` → exit 0; Write `OTHER.md` (control) → exit 2;
- anchor, then a Bash edit of `AGENTS.md` → `check-bash-reconcile --require-baseline` exit 1, `ESCAPE`,
  `[{"file":"CLAUDE.md","denied_by":"writes-scope (snapshot)",…}]`.

The finding text says the guards "would have DENIED a write to it" — false: the guard allows it. Downstream that is
`/pharn-verify` FAIL → `/pharn-loop` `STOP_TERMINAL` on a correct build (the same class as the 6.17.1 false ESCAPE).
Two further consequences of the same follow: re-pointing a link between two files with identical bytes is invisible
(the digest is the bytes), and a change to a file OUTSIDE the repo, reached through a tracked link, reads as a change
to a repo path.

## Decision — fix (a), the root cause; (b) rejected

**(a) Hash every symlink by its link text.** A link entry then changes only when the LINK changes (re-pointed,
created, removed), and a write THROUGH a link changes the target's own entry, judged under the target's own path —
exactly the path the live guard's `realpathSync` judges. The reconciler's text matcher becomes correct for link entries
without learning to resolve anything, and the baseline half agrees with the always-reconciled blob-id half, which
already uses `git diff` (git compares a link's text).

**(b) Resolve the link before the explicit-scope match — rejected, three reasons.** (1) It keeps the wrong digest: the
link entry still carries the target's bytes, so a re-point between same-content files stays invisible and an
out-of-repo change still reads as a repo change — two of the four behaviours this increment is asked to fix. (2) It
widens the one duplication the reconciler carries (its header: exactly ONE matcher is duplicated, pinned by a parity
test); copying the guard's segment-wise `realpath` walk is a second re-derivation, against the delegation rule the
header states. (3) For a RE-POINT (a Bash-only operation — the Write tool writes through a link, it cannot re-point
one) resolving would judge the new target instead of the changed entry, which is the link itself.

## The new `hashFile` (P5 — every branch is an errno or `fstat` membership test)

_Order amended after the grill (GRILL finding "Performance"; see "Post-grill amendments" below): the no-follow open
comes FIRST and `readlink` second. The approved design is unchanged: every symlink is hashed by its link text and
nothing follows a link._

1. `openSync(abs, O_RDONLY | O_NOFOLLOW | O_NONBLOCK)` — the repo's own no-follow read idiom (`check-spec.mjs`,
   `run-gates.mjs`), `?? 0` for a platform lacking a constant as `check-spec.mjs` does. A no-follow open never answers
   for a link's target (L59): on a symlink it FAILS (`ELOOP`, measured on darwin; Linux documents the same). On
   success, `fstatSync(fd).isFile()` → `sha256(bytes)` through the same fd; anything else (directory, FIFO, device) →
   `null`. A regular file therefore never reaches `readlink`.
2. Only after that open FAILS: `readlinkSync(abs, { encoding: "buffer" })` asks the name itself. It succeeds → the name
   is a symlink → `sha256("symlink\0" + raw text bytes)`, whatever the target is (directory, file, FIFO, nothing). Any
   error (`EINVAL` a non-link the open could not read — `EACCES` above all; `ENOENT` vanished or missing; `ENOTDIR`, …)
   → `null` (absent, so a reconcile candidate — fail-closed, unchanged). The branch does not read the open's errno, so
   it does not depend on which code a platform raises for `O_NOFOLLOW` on a link.
   Races, FINAL component only (GRILL finding "Security"): a name swapped between the two calls yields either the link
   text read at that instant or `null`, never another file's bytes. An ancestor directory swapped for a link after
   enumeration is followed by both calls — pre-existing and unchanged, since `O_NOFOLLOW` governs the last component.

| path kind (the `PATH_KINDS` rows)                      | before (6.20.4)            | after                             |
| ------------------------------------------------------ | -------------------------- | --------------------------------- |
| regular file                                           | sha256(bytes)              | unchanged                         |
| symlink → regular file                                 | sha256(**target** bytes)   | `symlink\0` + text — **changed**  |
| symlink → unreadable regular file (`EACCES`)           | `null`                     | `symlink\0` + text — **changed**  |
| symlink → FIFO (new row)                               | open blocks (stated bound) | `symlink\0` + text — never opened |
| symlink → directory / dangling / through a file / loop | `symlink\0` + text         | unchanged                         |
| unreadable regular file (new row)                      | `null`                     | unchanged                         |
| plain directory / missing path                         | `null`                     | unchanged                         |
| FIFO, not a link (new row)                             | open blocks                | `null`, does not block            |

`LINK_TEXT_ERRNOS` is **removed** (export and closure test): its three codes described which FOLLOW failures fall back
to link text, and nothing follows a link any more. Re-justified, not assumed (L51): the evasion it guarded — "make a
link's target unreadable to hide a change to a denied file" — now lands on the TARGET's own entry, which is `null` when
unreadable and so still a candidate (new row "unreadable regular file" + an end-to-end case below).

## Upgrade behaviour — both stores fail CLOSED across the change

- **Baseline (`version` stays `1`, the 6.17.1 precedent: keys and shape unchanged, one kind of `entries` value
  changed).** A baseline anchored by ≤6.20.4 holds a link→file's TARGET digest; 6.20.5 computes the link-text digest,
  so the link is a candidate on the first reconcile of that epoch — `ESCAPE` if its path is outside the recorded
  scopes. Never a silent pass; the next anchor records the text. Stated in the contract, not solved (P7: an epoch
  straddling an upgrade needs an upgrade between `/pharn-*build` and `/pharn-*verify`; no run has hit it).
- **Fingerprint — `ALGO` bumps `worktree-fingerprint/1+sha256` → `/2+sha256`.** The module's own rule is "Bump on ANY
  change to what is hashed"; 6.17.1 changed what is hashed WITHOUT a bump (recorded then as a decision), so this is the
  rule's second exception in a row unless it bumps — by L20's bar the recurrence earns a pin, so a GOLDEN-digest test
  (below) now fails any change to what is hashed that does not bump `ALGO`. `ALGO` is NOT part of the digest, so on a
  link-free tree a /1 and a /2 digest are equal — which is why every consumer's `algo` COMPARISON, not the digest, is
  what refuses a pre-upgrade stamp. The consumer audit, read this run (GATE-1 note 1):
  - `check-loop-fresh.mjs` F — compares `{algo, final}` with the live fingerprint → `RERUN tree-moved-since-verify`,
    and its reason already names both algos. Sensible; unchanged.
  - `check-loop-fresh.mjs` E — `treeMoved` includes the `algo` inequality, so it defers to F. Unchanged.
  - `check-loop-fresh.mjs` G — compares the regress head stamp's `{algo, final}` with the verify stamp's
    `{algo, init}` → `RERUN regress-verify-tree-mismatch` (fail-closed), but its reason says "regress judged a
    different tree" even when only the algo differs. **Changed:** the reason names both algos when they differ,
    mirroring F; the reason_code and the action are unchanged.
  - `red-run-core.mjs` `bindStamp` — refuses on `algo` or digest inequality (fail-closed), but its reason says "the
    tree changed since the red run". **Changed:** the reason names both algos when they differ; still a refusal.
  - `run-gates.mjs` / `gate-run-core.mjs` `validateStamp` — neither compares `algo` with the live module
    (`validateStamp` checks it is a token; `run --next` records digests). A stamp that straddles the upgrade
    MID-stage (init under /1, a later `run --next` under /2) on a link-bearing tree breaks the `fp` chain and is
    refused `tree-changed-between-gates`; on a link-free tree the chain holds and the stamp's recorded /1 `algo` is
    then refused by every consumer above. Fail-closed both ways; the first names the tree, not the algo. Not
    changed (P7): a mid-stage upgrade needs `pharn update` between two gates of one stage — stated in the CHANGELOG.
  - `check-verify.mjs`, `check-regress.mjs` — copy `algo` into the advisory `gate_run` block; they compare no
    fingerprint. Unaffected.

  The cost is one re-run for a stamp in flight across the upgrade — the fail-closed direction, stated in the CHANGELOG
  as 6.17.1 stated its own.

## Bounds, stated (P0), carried into the module headers and the contracts

- A change to a link's TARGET is seen only under the target's own path, and only when that path is in the reconciled
  set. A target outside the repo, or git-ignored, is outside the set exactly as any write outside the repo is — the
  existing bound 1, now reached through a link too. Same for the fingerprint: a gate that reads through a link to an
  out-of-set file is not re-run when that file changes.
- A RE-POINTED link is judged under the link's own path: the scope must name the link path itself. The guards cannot
  see a re-point at all (a Write writes through the link), so the reconciler's finding for it describes the recorded
  scope, not a guard decision — stated in the contract.
- `O_NOFOLLOW` absent (Windows — `?? 0`): the step-1 open FOLLOWS a link there, so a link→file hashes by its target's
  bytes, the pre-6.20.5 rule. POSIX is what CI and the measured runs use, and the runner is POSIX-only already.
- Not collision-free against a forger (unchanged): a regular file whose bytes are exactly `symlink\0<text>` hashes equal
  to that link — outside the non-adversarial claim.

## Applied lessons

- L59 — the fix IS this lesson's remedy: no call follows a link (the open is `O_NOFOLLOW`, so it answers for the name,
  and `readlink` classifies whatever the open could not read), and the suite's
  `PATH_KINDS` enumeration gains the missing kinds (link→unreadable, link→FIFO, FIFO, unreadable file) instead of
  per-case tests.
- L54 — only `readlink`'s own `ENOENT` is read as "absent"; no `existsSync`/`statSync` is introduced anywhere, and the
  ordered closure pin below keeps it that way.
- L51 — removing `LINK_TEXT_ERRNOS` is re-justified against the new input domain (the unreadable-target evasion moves to
  the target's own `null` entry) with a boundary test, not deleted as "now unreachable".
- L36 — the CWE-367 source pin stays a CLOSURE over path-addressed `*Sync(abs` calls, now ORDERED
  `["openSync(abs", "readlinkSync(abs"]`, plus a pin that the open carries `O_NOFOLLOW`.
- L34 — every CLEAN case has a non-vacuity mirror on the same fixture: the CLAUDE.md→AGENTS.md CLEAN is paired with a
  re-point → `ESCAPE` naming exactly `CLAUDE.md`, and with an edit through a link to an out-of-scope target → `ESCAPE`
  naming the TARGET; each fingerprint "unchanged" case with a "moves" control.
- L37 — the claim "the reconciler now agrees with the live guard" is verified by EXECUTING the copied real hooks in the
  end-to-end fixture (the suite's `makeRepo` copies them), with `OTHER.md` as the excluded-member control recorded above.
- L1 — meta-doc sweep: `CHANGELOG.md`, `SKILLS_VERSION`, the README badge, and BOTH contracts that state the changed
  facts (`reconciliation-record.md` Symlinks, `gate-run-record.md` fingerprint bounds). `CLAUDE.md`, `LIMITS.md`,
  `THREAT-MODEL.md` and `pharn/ARCHITECTURE.md` were grepped this run for symlink / link-text / algo claims: none state a
  fact this changes, so no protected follow-up is needed.
- L57 — the build formats only its own written files, prettier with an explicit path list and markdownlint with
  `--no-globs`; never a repo-wide `--write`/`--fix`.

## Files

- `pharn/floor/reconcile-baseline.mjs` — `hashFile`: readlink-first classification, every symlink by link text, no-follow non-blocking open for the rest; `LINK_TEXT_ERRNOS` removed; the comment block rewritten with the rule and bounds above — product floor
- `pharn/floor/reconcile-baseline.test.mjs` — `PATH_KINDS` rows updated and extended, same-content re-point, ordered CWE-367 closure + `O_NOFOLLOW` pin, `LINK_TEXT_ERRNOS` closure test removed — dev test (never ships)
- `pharn/floor/check-bash-reconcile.mjs` — comment only, at `authorizingScope` and header bound 1: why judging a link entry by its own path is correct now, and the out-of-set target bound — product floor
- `pharn/floor/check-bash-reconcile.test.mjs` — ★ end-to-end symlink cases (listed under Evals) — dev test (never ships)
- `pharn/floor/worktree-fingerprint.mjs` — `ALGO` → `worktree-fingerprint/2+sha256`; header bound rewritten (link text, out-of-set targets, the 6.17.1 un-bumped change recorded, the straddle) — product floor
- `pharn/floor/worktree-fingerprint.test.mjs` — link cases on the same trees + the golden-digest `ALGO` pin — dev test (never ships)
- `pharn/floor/check-loop-fresh.test.mjs` — the upgrade straddle, ONE `describe` block appended at the end (GATE-1 note 3: group D edits this file): a verify stamp under the previous `algo` reads `RERUN tree-moved-since-verify` naming both algos even when its digest equals the live one; a regress head stamp under the previous `algo` reads `RERUN regress-verify-tree-mismatch` naming both — dev test (never ships)
- `pharn/floor/check-loop-fresh.mjs` — check G's reason names both algos when they differ (reason_code and action unchanged) — product floor
- `pharn/floor/red-run-core.mjs` — `bindStamp`'s refusal names both algos when they differ (still a refusal) — product floor
- `pharn/floor/check-red-run.test.mjs` — one appended test: a stamp whose digest equals the live tree binds under the live `ALGO` (control) and is refused under the previous `algo`, the reason naming both — dev test (never ships)
- `pharn/floor/check-verify.test.mjs` — the fixture stamp's embedded `worktree-fingerprint/1+sha256` literal updated deliberately (GATE-1 note 1) — dev test (never ships)
- `pharn/floor/check-regress.test.mjs` — the same literal, updated deliberately — dev test (never ships)
- `pharn/floor/gate-run-core.test.mjs` — the same literal (two sites), updated deliberately — dev test (never ships)
- `pharn/floor/test-results-core.test.mjs` — the same literal, updated deliberately — dev test (never ships)
- `pharn/pharn-contracts/reconciliation-record.md` — the `entries` row and the Symlinks subsection rewritten for 6.20.6 (table, bounds, upgrade behaviour) — contracts
- `pharn/pharn-contracts/gate-run-record.md` — one fingerprint bound: links hashed by text, `ALGO` /2, straddle reads re-run — contracts
- `SKILLS_VERSION` — `6.20.7` → `6.20.8`
- `README.md` — the shields badge to `6.20.8` (`check:badge`); nothing else
- `CHANGELOG.md` — new `## [6.20.8] - 2026-09-25` section directly above `[6.20.7]` (`[Unreleased]` is empty, read this run)

**Renumbered 6.20.5 → 6.20.6 during the build** (orchestrator notice: #268 merged as 7bcd7a8 and took 6.20.5). The
branch was rebased onto 7bcd7a8 BEFORE the build's writes and the reconciliation epoch re-anchored after the setter,
so #268's files are part of the anchor, never candidates. Elsewhere in this plan "6.20.4" and "6.20.5" as the
pre-fix version read as "the last release before this fix": the pre-fix hashing shipped through 6.20.6.

**Renumbered again 6.20.6 → 6.20.7 after verify** (orchestrator notice: #269, group D, merged as 8eec2d7 and took
6.20.6, rewriting `check-loop-fresh.mjs` and its tests). Rebased onto 8eec2d7: only `CHANGELOG.md` conflicted, resolved
by keeping main's `[6.20.6]` verbatim and putting this entry in a new `[6.20.7]` above it (`git diff origin/main` shows
zero removed lines there). This increment's own version mentions shifted by one on the lines it added, and no line
another PR merged was touched. D's new check E reads an algo mismatch as a moved tree: it compares only what the stamp
alone decides, so an honest pre-upgrade report passes E and F names the algos. The ★ straddle block passes on D's code.
The reconciliation epoch was re-anchored on the rebased tree, and regress and verify were re-run there (their reports are
the post-rebase ones). A hard reset to the rebased base, which would have let the new epoch cover the build's writes
again, was refused by the session's auto-mode classifier. So the new epoch covers only post-anchor writes, and the
build's own writes rest on the pre-rebase reconcile (`CLEAN`, 19 candidates, no escapes). That is recorded in
`SHIP.md`.

**Renumbered a third time 6.20.7 → 6.20.8 after review** (orchestrator notice: #270, group F, merged as 67b7b8b and took
6.20.7; it touched only `CHANGELOG.md`, `SKILLS_VERSION` and the badge of this increment's files). Rebased onto 67b7b8b.
`CHANGELOG.md` was resolved as before: main's `[6.20.7]` is kept verbatim and this entry sits in `[6.20.8]` above it,
with zero removed lines against main. The shift was again confined to this branch's added lines. This was a text-only
change after verify, so `npm run check` was re-run on the final tree before the commit (see `SHIP.md`).

## Deliberately not touched

- `pharn/floor/check-bash-reconcile.mjs` logic, `reconcile-ignore.json`, the hooks — the matcher is correct once the
  digest is; no guard changes.
- `RECORD_VERSION` — stays `1` (keys and shape unchanged; the straddle already fails closed; the 6.17.1 precedent).
- `MIN_CLI` — no installed path moves and no contract shape changes; an older CLI installs this tree correctly.
- The four trusted docs, `CLAUDE.md` — grepped, state no fact this changes (L1 sweep).

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — the `entries` value rule for symlinks changes; the record's keys,
  `version` and verdict enum do not.
- `pharn/pharn-contracts/gate-run-record.md` — `fingerprint.algo` is a `<token>` there; only its value moves.

## Evals to write (P1) — tests; no Capability is added, so no `evals/` dir

`reconcile-baseline.test.mjs`:

- `PATH_KINDS` → each row's digest per the table; stable across calls. New rows: link→FIFO (skip if `mkfifo` is
  unavailable) returns without blocking; FIFO returns `null` without blocking; unreadable regular file `null` (skip as
  root, as today).
- every link kind, link→file included → re-pointing changes the digest; ★ two targets with IDENTICAL bytes → re-point
  still changes it (undetected on 6.20.4).
- ✧ CWE-367 closure: path-addressed calls in the `hashFile` region are exactly `["openSync(abs", "readlinkSync(abs"]`,
  in that order; the open's flags name `O_NOFOLLOW`.

`check-bash-reconcile.test.mjs`, the upgrade (GATE-1 note 2):

- ★ a baseline carrying a link→file entry as 6.20.4 wrote it (the TARGET's content digest), nothing changed since →
  the link is a candidate and, outside the recorded scope, an `ESCAPE` naming it — flagged, never passed.

`check-bash-reconcile.test.mjs` (real hooks copied into each fixture):

- ★ tracked `CLAUDE.md -> AGENTS.md`, scope `["AGENTS.md"]`, Bash edit of `AGENTS.md` → `CLEAN`, no escapes, no
  "treated as changed" warning (the false `ESCAPE` on 6.20.4).
- ★ mirror: same fixture, `CLAUDE.md` re-pointed to `OTHER.md` holding the same bytes → `ESCAPE` naming exactly
  `CLAUDE.md`.
- ★ mirror: a link to an out-of-scope in-repo target, edited THROUGH the link → `ESCAPE` naming the TARGET, not the link.
- ★ a tracked link to a file OUTSIDE the repo whose content changes → `CLEAN` (not a repo change).
- ★ L51 boundary: a link whose in-repo target becomes unreadable after a change → the TARGET is a candidate ("treated as
  changed"), the link is not.
- the existing directory-link / dangling-link CLEAN and re-point ESCAPE tests stay as they are (unchanged treatment).

`worktree-fingerprint.test.mjs`:

- same trees: editing `AGENTS.md` moves the digest (control); re-pointing `CLAUDE.md` between same-content files moves
  it (unmoved on 6.20.4); changing an out-of-repo target leaves it unchanged; a directory / dangling link is stable
  untouched and moves on re-point.
- ✧ golden: the fingerprint of one fixed fixture tree holding every link kind equals a recorded digest keyed by `ALGO` —
  a change to what is hashed without an `ALGO` bump fails it.

`check-loop-fresh.test.mjs`:

- ★ straddle F: after one ordinary iteration, the verify stamp's `algo` is rewritten to the previous token and its
  report regenerated through the real `check-verify.mjs` (so the D binding holds and F is what decides) → `RERUN
tree-moved-since-verify`, the reason naming both algos — never `FRESH`, although the digest equals the live one.
- ★ straddle G: the same for the regress HEAD stamp (report regenerated through the real `check-regress.mjs`) →
  `RERUN regress-verify-tree-mismatch`, the reason naming both algos.

`check-red-run.test.mjs`:

- ★ `bindStamp` over a git-initialised scratch: a stamp whose chain and `final` equal the live digest binds under the
  live `ALGO` (the non-vacuity control, L34) and is refused under the previous token, the reason naming both.

## Guarantee audit (P0)

- "an unchanged symlink of ANY kind reconciles `CLEAN`; a re-pointed one is a candidate" → floor: content-hash
  (primitive #2) over the link text, tested per `PATH_KINDS` row.
- "a Bash write THROUGH a link is judged under the target's own path, as the live guard judges it" → floor: content-hash
  of the target's own entry + the existing path/enum matcher (primitive #3); agreement with the guard is verified by
  executing the real hooks in the fixtures — for the cases tested, never a proof of equivalence (the header's existing
  "example-based" bound).
- "the race between classification and open resolves fail-closed" → advisory as a CLAIM about timing (not reachable
  deterministically from a test, as the module already states); the source SHAPE (no-follow open first, readlink only after it fails) is
  pinned — floor: enum-regex over source text.
- "a stamp written before the upgrade is never read as fresh" → floor: enum membership (`algo` equality) in every
  consumer, pinned by the straddle test; "a baseline straddling the upgrade never passes silently" → floor:
  content-hash inequality (target digest ≠ link-text digest).
- "any change to what the fingerprint hashes bumps `ALGO`" → floor: the golden-digest test — for changes that move the
  golden tree's digest; a change invisible on that tree is not caught (stated in the test).
- "a change to an out-of-set target is invisible" → a BOUND, stated in both headers and both contracts, not a claim.

## Trust audit (P2)

- Paths and link texts are untrusted DATA. Link text is read as a Buffer and only HASHED — never decoded, parsed,
  resolved, spawned or interpolated. The reconciler never follows a link any more, so a link cannot steer which bytes
  are hashed.

## Determinism audit (P5)

- Every branch is membership: `readlink` success / `EINVAL` / other errno; `fstat().isFile()`; `algo` string equality.
  No classification, no fallback guess — an unclassifiable path is `null` (a candidate).

## Open questions (HALT)

- none. The two decisions flagged at the plan gate — the `ALGO` bump (vs. rewording the rule as 6.17.1 did) and the
  removal of the exported `LINK_TEXT_ERRNOS` (vs. keeping a dead export for a downstream that might import it —
  nothing in this repo does, read this run) — were both approved at GATE 1 (below).

## GATE 1 — plan acceptance (delegated; recorded, not a human approval)

Approved on 2026-09-25 by the orchestrating session under the user's delegation of 2026-09-24 ("fix all findings …
each fix needs to be fixed by using pharn-dev-ship command and needs to ends by merged pull request"): fix (a), the
`ALGO` bump with the golden-digest test, and the `LINK_TEXT_ERRNOS` removal. Its four notes, applied above:

1. every test/fixture embedding `worktree-fingerprint/1+sha256` is updated deliberately (four files, `## Files`), and
   each consumer's algo-mismatch path is audited (Upgrade behaviour) — G's and `bindStamp`'s reasons now name the
   algos; the one-time in-flight cost goes into the CHANGELOG;
2. baseline `version` stays `1`; the first-reconcile-after-upgrade behaviour is stated in `reconciliation-record.md`
   and the CHANGELOG, and a test pins that it is flagged, never passed;
3. the `check-loop-fresh.test.mjs` addition is one self-contained `describe` block appended at the end;
4. the `.pharn/pharn-dev-plan/` probe is deleted before lint.

## Post-grill amendments (applied before the build; the design and `## Files` are unchanged)

`GRILL.md` raised 4 advisory concerns (3 important, 1 minor). All four sit inside the approved design (fix (a)) and the
declared files, so they are folded in here under the same delegation rather than re-planned. Each is recorded in
`SHIP.md`.

1. **Performance → the order.** No-follow open FIRST, `readlink` only after it fails. Measured at grill time,
   classification only, over 2220 paths: 49.6 ms readlink-first vs 35.7 ms open-first (median of 5). The fingerprint is
   re-measured at build, and its dated bound is restated in the `worktree-fingerprint.mjs` header and in
   `gate-run-record.md`, which carries the same numbers (L24). `CLAUDE.md` holds an older copy of those numbers and is
   not a shipped file, so it is left alone.
2. **Testability → the guard is executed.** The ★ `CLAUDE.md -> AGENTS.md` test spawns the fixture's own
   `enforce-writes-scope.cjs` under the same scope, in the ✧ PARITY test's shape. It asserts a Write to `CLAUDE.md` and
   to `AGENTS.md` both exit 0, and a Write to `OTHER.md` exits 2 as the control. It then asserts the reconciler's
   verdict agrees.
3. **Security → "final component".** The `hashFile` comment and the contract say `O_NOFOLLOW` governs the last
   component only.
4. **Documentation → the re-point residual is disclosed in the CHANGELOG too.** A re-pointed link that no recorded
   scope names keeps the checker's uniform "would have DENIED" sentence. When the new target is in scope, that sentence
   describes the scope matcher, not a guard decision. The finding text itself is not reworded here (P7: no observed
   failure on a re-point).
