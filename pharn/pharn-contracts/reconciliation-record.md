---
file: "pharn/pharn-contracts/reconciliation-record.md"
kind: pharn-owned
trust: trusted
layer: pharn-contracts
coupling: agnostic
purpose: "The shape of the reconciliation baseline and the reconciliation verdict — the artifacts pharn/floor/reconcile-baseline.mjs writes and pharn/floor/check-bash-reconcile.mjs emits. Schema only, zero behavior."
reads: []
writes: []
---

# Contract — reconciliation record

`pharn-contracts` is the layer-tree root: schemas only, zero behavior (P3). This file defines two
shapes and one enum. It defines no procedure — the procedure lives in the two floor scripts, and their
honesty travels in their own headers (lessons-learned L2: the PLAN is ephemeral, the artifact is
durable).

## Why this exists

Both `PreToolUse` write guards match `Write|Edit|MultiEdit|NotebookEdit`. A write issued through
**`Bash`** reaches every path in the repository, is not denied, and — with no `PostToolUse` hook wired —
leaves no record. `LIMITS.md §6` states that bound; this contract is the shape of the mechanism that
makes such a write **detectable after the fact**.

## The claim these artifacts support — and the seven it does not

**Supported, literally:** _a **non-adversarial** write to a path the active writes-scope would have
DENIED is detected, and fails the stage_ — unless, since 6.52.0, the path's bytes are exactly the upstream bytes
HEAD merged in during the window, which classifies it `merged` and is reported, not failed (§2a).

**"Non-adversarial" is load-bearing.** The baseline is unauthenticated state inside the writable tree, so
a writer who edits a denied file **and** rewrites that file's baseline entry gets a silent `CLEAN`. This
is an **accounting tool against tooling that escapes its scope** — a formatter, a generator, a script, a
mistake, which is the entire population of the `L19`/`L20` failures it was built for — and it is **not a
control against an attacker**. Only the always-reconciled control surface resists that actor, because
only it is anchored in committed git objects rather than in the baseline. Since 6.53.0 that surface is the guard
files and the floors **plus the human-only surface and memory-bank canon** (§4a). Before 6.53.0, a forged baseline
entry cleared a Bash edit of `LIMITS.md`.

**Struck (P0), each for a stated reason:**

| Struck claim                                  | Why                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Bash writes are prevented"                   | Detection is strictly weaker than prevention. The only true prevention is OS-level sandboxing of the `Bash` process, which PHARN does not implement and cannot — harness-layer, environment-dependent, not expressible in markdown methodology (`LIMITS.md §6`)       |
| "all Bash writes are detected"                | Only those to **denied** paths, inside the reconciled set, between two anchors, in one worktree                                                                                                                                                                       |
| "a `CLEAN` verdict means no escape occurred"  | It means none was **detected**                                                                                                                                                                                                                                        |
| "the detector cannot be disabled"             | Its state is reachable by the channel it monitors. **Deleting** it is loud (`--require-baseline` ⇒ `INCONCLUSIVE`), and the control surface is anchored in committed blob ids — but **forging** an ordinary path's baseline entry is silent                           |
| "the detector cannot be disabled **quietly**" | True for the always-reconciled surface **only** (§4a). For ordinary paths a forged baseline entry yields `CLEAN` with no warning. Closing this needs authenticated state outside the worktree — the same harness-layer category as the OS sandbox, and just as absent |
| "the checker vouches for its own integrity"   | It cannot. `/pharn-*verify` runs the **worktree** copy through Bash. `pharn/floor/` is always-reconciled, so a modified checker is caught **by itself** — circular, and not a guarantee                                                                               |
| "skipping the anchor fails the run"           | Only in a tree that has **never** anchored. Otherwise `--require-baseline` is satisfied by whatever earlier epoch is on disk, and the reconciliation silently ranges over the wrong window. The anchor is a Bash call (`L19`), so nothing forces it                   |

## 1. The baseline record — `.pharn/reconcile/baseline.json`

Written by `pharn/floor/reconcile-baseline.mjs --anchor`. Gitignored (it lives under `.pharn/`), and
**disposable**: absent means "no epoch has been opened", which is the honest normal state of a fresh
clone.

**Since 6.24.0, `--anchor` REFUSES to open an epoch with no usable scope to snapshot (D6).** When
`snapshotScope()` returns `null` — an absent or unusable `.pharn/writes-scope.json` — the command exits 2
and writes nothing, with a message naming the remedy (run the stage's own scope-setter first). An
explicit `{"scope": []}` **is** a scope (an authorization to write nothing) and anchors normally. Both
shipped callers (`/pharn-build`, `/pharn-dev-build`) already run their own Step-0 setter immediately
before this call, so the refusal reaches only a caller that anchors out of order.

```json
{
  "version": 1,
  "epoch": "2026-09-10T11:33:19.704Z",
  "anchored_by": "pharn-build",
  "anchored_head": "052709d2c0ffee…",
  "scope_snapshot": { "scope": ["src/app.ts"], "set_by": "pharn/features/x/PLAN.md", "set_at": "…" },
  "scope_amendments": [
    { "scope": ["memory-bank/lessons-learned.md"], "set_by": ".claude/commands/pharn-memory-promote.md", "set_at": "…" }
  ],
  "entry_count": 1759,
  "entries": { "<repo-relative path>": "<sha256 hex>" }
}
```

| Field              | Type             | Meaning                                                                                                                                                                                                   |
| ------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`          | integer          | Schema version. A **newer** version than the reader is `INCONCLUSIVE`; an **older** one is tolerated at read and reported in `warnings[]`                                                                 |
| `epoch`            | ISO-8601         | When this epoch opened                                                                                                                                                                                    |
| `anchored_by`      | string           | A label passed as `--by`. **Advisory** — it is argv, so it is a description, never an authorization                                                                                                       |
| `anchored_head`    | string \| `null` | The full object id of the commit HEAD named at anchor time (6.52.0); `null` on an unborn HEAD or a git error. Read only by the `merged` classification (§2a). Absent on an older record, read as `null`   |
| `scope_snapshot`   | object \| `null` | A verbatim copy of `.pharn/writes-scope.json` at anchor time. An object; `null` only in a baseline anchored before 6.24.0 — since then `--anchor` REFUSES rather than write a `null` snapshot (D6, above) |
| `scope_amendments` | array            | Further scopes that came into force **during** the epoch, in call order. Empty on a fresh anchor; absent on a pre-5.1.0 record, read as `[]`                                                              |
| `entry_count`      | integer          | `Object.keys(entries).length` at write time                                                                                                                                                               |
| `entries`          | object           | Repo-relative path → SHA-256 of its bytes. A symlink → SHA-256 of `symlink\0` + its raw link text, whatever its target (6.17.1 for a non-file target, 6.20.8 for every link; see "Symlinks" below)        |

**Why the scope is snapshotted rather than read live.** By reconciliation time
`.pharn/writes-scope.json` holds a **later** stage's scope — it is one mutable record, global to the
worktree, that every stage's Step 0 overwrites (lessons-learned **L38**; `check-regress.mjs` documents
the same trap from the other side). Reading it live would judge the build's writes against verify's
scope.

**Why ONE snapshot was not enough — `scope_amendments` (5.1.0).** An epoch spans build → ship, and a run
legitimately writes under **several** scopes inside it. Judging every candidate against the opening
snapshot alone reported the later stages' **hook-approved** writes as escapes. The measured case:
`/pharn-*ship`'s lesson-extract invokes `/pharn-*memory-promote` **after** the build anchor, so a canon
write that passed **both** live `PreToolUse` guards and an explicit human accept was reported as _"a
write reached it outside the guarded tool surface"_ — false for that write. Canon is `never_exempt` by
deliberate design and, per lessons-learned **L7**, a build or ship scope may never **name** canon, so no
`## Files` declaration could fix it from the plan side. Left alone, **every** promoting ship run ended
RED: lessons-learned **L17**'s failure mode — a changed-since-anchor test reported as a
wrote-outside-scope test, blocking on the correct designed workflow, which is exactly what trains an
operator to wave through the one finding that must never be waved through.

`reconcile-baseline.mjs --amend-scope` appends the live scope to this list. **Ordering is load-bearing,
exactly as `--anchor`'s is (L38): call it AFTER the stage's own Step-0 setter**, never before, or it
records the previous stage's scope and authorizes the wrong paths. It **fails closed** on every unusable
input — no baseline, unreadable record, or no live scope all write nothing and exit 2. A missing live
scope is deliberately **not** recorded as an empty amendment: `{"scope": []}` reads as "this stage was
authorized to write nothing", a different claim from "no amendment was made".

**What this does NOT change, stated because the distinction IS the guarantee.** An amendment makes a
write **accounted for**, never **exempt**. `never_exempt` is untouched: canon stays in the candidate set
every epoch, and the verdict on an _unaccounted_ canon write is still `ESCAPE`. Nor does an amendment
override a guard — a path is cleared only if the guard **itself**, re-executed with that scope
materialized, permits it, so an amendment whose `set_by` is a `PLAN.md` cannot launder a canon write past
the origin check. And the detector's non-adversarial bound is **unchanged**: `--amend-scope` is a Bash
call, so anything holding Bash can append a scope authorizing anything — but the same actor could
already rewrite this record outright. Still an accounting tool, still not a control against an attacker.

**A plan-origin amendment authorizes nothing the opening snapshot did not (6.54.0, audit P2-I).**

**Why.** The plan is model-authored. Bash-editing `PLAN.md`'s `## Files`, re-running
`set-writes-scope.cjs --from-plan` and calling `--amend-scope` made any write `CLEAN`, because every amendment
counted toward the union. That is lessons-learned **L48**'s silent direction.

**The rule.**

- An amendment may authorize a **new** path only when its `set_by` is a stage command file: exactly one path segment
  under `.claude/commands/`, ending `.md`, compared after `/` normalization and leading-`./` stripping. So
  `.claude/commands/../../x/PLAN.md` is plan-origin. Those are the `--from-frontmatter` origins, each
  narrowed by `--target` to that stage's own artifacts; the promote canon write is one.
- Any other origin is a plan re-derivation. It may re-authorize what the snapshot already covered.
- A path that **only** a plan-origin amendment covers is an escape with `reason: "plan-widened-after-anchor"`, and its
  `scope_set_by` names that amendment.
- The test is the origin, not "an equal `set_by` and a strict superset". A plan copied to a new path, or a re-plan that
  adds one path and drops another, is the same widening.

**Where it applies.** Wherever the checker runs: verify, the loop close's re-derivation, and a later `npm run check`
in the same worktree.

**The cost, stated (GATE 1, option A).** The reconciler cannot tell an Edit-tool `PLAN.md` edit from a Bash one, so
a **legitimate mid-build re-plan is reported too**. A routine "declare the path in `## Files` and re-run the setter"
after a write block now:

- reds `/pharn-*verify`;
- in `/pharn-loop`, reaches `STOP_TERMINAL` (cause `reconcile`).

The human decides at the stop. False RED was chosen over false GREEN, because in the loop nobody reads a warning.
The only widening that stays clean is declaring every path **before** the build's Step 0. The finding's `problem`
says so.

**Where the reason is visible.** `check-loop.mjs`'s closed `terminal_cause` names the cause (`reconcile`), not the
reason. Since 6.55.0 `/pharn-verify` reads the reconcile gate's recorded output (bound to the stamp's digest) into
`verify-report.json`'s advisory `reconcile_detail` block (`verify-report.md`), and `VERIFY.md` — and `RUN-REPORT.md`
when the loop stopped on `reconcile` — lists each escape's `file`, `denied_by`, `reason` and `scope_set_by` (first 20
rows) and the `merged` count. The remedy text stays in each finding's `problem`, which the reports do not render: to
read it, or when the log is missing or unreadable (the reports say so in one line), re-run
`node pharn/floor/check-bash-reconcile.mjs --require-baseline`. The dev twin `/pharn-dev-verify` writes its `VERIFY.md`
by prose and does not render the block.

**Bounds.**

- The snapshot itself is unauthenticated state (bound 5).
- A Bash-written scope record claiming a command `set_by` is outside the non-adversarial claim.

**Why the baseline is not `git status`.** `git status` answers _changed since the base commit_, a
different question: it misses a `Bash` write that restores HEAD bytes, and it counts every legitimate
Write-tool edit as a change with no way to separate the two. `check-regress.mjs scope` already makes
exactly that conflation, and lessons-learned **L17** is the record of it. The baseline is therefore
_content-hash vs the last anchor_.

**Symlinks (6.17.1, 6.20.8).** `hashFile` used to open every path, and a plain open FOLLOWS a link. Before 6.17.1, a link to a
directory, or a dangling link, therefore hashed as `null`. The anchor never recorded it, and the
reconcile read it as unreadable, treated as changed (§3). Any repo that tracks such a link got a false
`ESCAPE` on every run with zero writes. The measured case: a downstream project's 20 tracked
`.claude/skills/*` directory links, which ended each of its `/pharn-loop` runs `STOP_TERMINAL`. Such a link
was then hashed by its **link text**, which is what git stores for a mode-120000 entry, so an unchanged
link reconciles `CLEAN` and a **re-pointed** one is still a candidate.

**Every link, 6.20.8.** 6.17.1 left one kind on the old rule: a link to a **regular file** was still
opened, the open followed it, and the **target's** bytes were recorded under the **link's** path. The
explicit-scope match (§2) judges that path as text, while the live guard `realpath`s a Write's target
first — so with a tracked `CLAUDE.md -> AGENTS.md` and a scope of `[AGENTS.md]`, an edit of `AGENTS.md`
that the guard **allows** was reported as an `ESCAPE` on `CLAUDE.md`, "writes-scope (snapshot)". Now every
link is hashed by its text and **nothing follows a link**: `hashFile` opens with `O_NOFOLLOW` first (a
regular file is hashed through that one descriptor), and only when that open fails asks `readlink`, the
call that answers for the name itself. A link's entry therefore changes only when the **link** changes;
a write **through** it changes the target's own entry and is judged under the target's own path — the
path the guard judges. The rule, as implemented and tested:

| The path                                                                   | Its `entries` value                    |
| -------------------------------------------------------------------------- | -------------------------------------- |
| a regular file                                                             | SHA-256 of its bytes                   |
| a symlink — to a file, a directory, a FIFO, an unreadable file, or nothing | SHA-256 of `symlink\0` + raw link text |
| an unreadable regular file (`EACCES`)                                      | absent, so it is a candidate           |
| a plain directory, a gitlink, a special file, a vanished path              | absent, so it is a candidate           |

- **Where the unreadable-is-changed rule (§3) now lives.** Up to 6.20.7 a link to an unreadable file stayed
  absent, so "make the target unreadable" could not hide a change behind the link. The link is never
  opened now, so that protection sits on the **target's own entry**: an unreadable target is absent, and so
  a candidate, under its own path.
- **What it newly sees, and what it no longer does.** A link re-pointed between two files with identical
  bytes is now a candidate (it was not, when the entry was the bytes). A change to a file **outside** the
  repo, or git-ignored, reached through a tracked link is no longer read as a change to the link's path:
  such a target is outside the reconciled set exactly as any other path there is.
- **A re-pointed link is judged under its own path**, so the scope must name the link path itself. The
  guards cannot see a re-point at all (a Write writes **through** a link), so for a link re-pointed to an
  in-scope target the finding's uniform "would have DENIED" sentence describes the scope match, not a
  decision a guard made. Stated, not reworded: no run has hit it (P7).
- **The text is hashed as raw bytes, never as a decoded string.** Two targets that differ only in invalid
  UTF-8 would decode to the same string, and re-pointing one to the other would go unseen. For a
  valid-UTF-8 target the digest equals SHA-256 of `"symlink\0" + text`.
- **No-follow means the FINAL component.** `O_NOFOLLOW` governs the last path component only; an ancestor
  directory swapped for a link after enumeration is still followed, as before. Where the platform has no
  `O_NOFOLLOW` (Windows), the open follows a link and a link to a regular file hashes by its target's bytes
  — the pre-6.20.8 rule. A **link to a FIFO**, the hazard 6.17.1 recorded as not handled, is never opened
  now, and a FIFO swapped in for a path after enumeration opens `O_NONBLOCK` and fails the regular-file test.
- **Not seen through the link:** the files inside a linked directory. They are reconciled under their own
  tracked paths, and a target outside the repo is not descended.
- **Not collision-free against a forger.** A regular file whose bytes are exactly `symlink\0<text>`
  hashes equal to that link. That takes deliberate forgery, which is outside the non-adversarial claim
  this record supports.
- **The first reconcile after an upgrade is NOT clean — flagged, never passed.** A baseline anchored by
  pre-6.17.1 code has no entry for a directory or dangling link, and one anchored by code before 6.20.8
  holds a link to a regular file under its **target's** digest. Either way the first reconcile of that
  epoch reports the link as changed: a candidate, and an `ESCAPE` when no recorded scope names it
  (pinned by a test). The next anchor (the next `/pharn-*build`) records the text. `version` stays `1`,
  because the record's keys and shape did not change. What changed is one kind of `entries` value.

## 2. The verdict — `pharn/floor/check-bash-reconcile.mjs` stdout

```json
{
  "verdict": "CLEAN",
  "epoch": "…",
  "anchored_by": "pharn-build",
  "reconciled": 0,
  "escapes": [],
  "exempted": [],
  "merged": [],
  "warnings": []
}
```

`escapes[]` entries carry `{ file, denied_by, scope_set_by?, reason? }`. `reason` is a closed enum whose only member
is `plan-widened-after-anchor` (§1, 6.54.0); it is absent on every other escape. When non-empty the record additionally
carries `findings[]` in `finding-shape.md`'s enum-gated/free-text split — `type`, `rule_id`, `severity`,
`file` are floor-verifiable; `problem` is free text and MUST be rendered as quoted DATA downstream.

### The verdict enum — closed

| Verdict        | Exit | Meaning                                                                                                                                                                                                                                                          |
| -------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLEAN`        | 0    | Reconciled against a baseline; every candidate the guards would deny, if any, was classified `merged` (§2a)                                                                                                                                                      |
| `ESCAPE`       | 1    | ≥1 changed path the guards would have denied and that is not `merged`. `escapes[]` names each                                                                                                                                                                    |
| `NO_BASELINE`  | 0    | No epoch has been opened. **GREEN by design** — a fresh clone or CI checkout has never anchored, and REDding there makes every first run a false alarm (the posture `check-lessons-index.mjs` takes for `COLD`). Only reachable **without** `--require-baseline` |
| `INCONCLUSIVE` | 2    | Fail-closed: a malformed or future-schema baseline, an absent guard, a failed enumeration, or `--require-baseline` with no baseline                                                                                                                              |

Callers branch on **set membership over this enum, or on the exit code** — never on prose (P5).

### 2a. `merged[]` — a would-be escape whose bytes came from upstream (6.52.0)

**Why (P7, measured — audit 2026-10-07, P3-L).** A `git merge` of upstream moves bytes without any write tool.
Every path upstream changed then differs from its baseline entry, and an out-of-scope one read as _"a write
reached it outside the guarded tool surface"_. On the maintainer's checkout a day-old baseline reported 9 such
escapes, every one a legitimate merge (two dependency bumps, and a docs PR that touched trusted docs), and a ship
run that merged `origin/main` mid-run met the same RED at verify. That is lessons-learned **L17**'s failure class
again: a changed-since-anchor fact reported as a wrote-outside-scope claim.

**The rule.** A path that would otherwise be an escape is listed in `merged[]` instead, and a `warnings[]` line
names the HEAD move and the count, iff **all** of the following hold. Each is an object-id or byte equality, or a
git exit code. **Any git failure leaves the path an escape.**

| #   | Condition                                                                                                                                                                                  | What failing it means                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| a   | the baseline records `anchored_head` X; HEAD H resolves and differs from X                                                                                                                 | an older baseline, or HEAD did not move: nothing to classify           |
| b   | X is an ancestor of H                                                                                                                                                                      | a rebase or a reset elsewhere; a warning says so                       |
| c   | the symbolic ref `refs/remotes/origin/HEAD` resolves to a commit U; H and U have a merge base M; and X does **not** contain M — so at least one upstream commit entered HEAD in the window | no upstream named, or HEAD moved by the build's own commits only       |
| d   | the path's **baseline** entry is the digest of its blob at X, or the path is absent from both                                                                                              | the path was edited, uncommitted, when the epoch opened                |
| e   | the path's **current** bytes are the digest of its blob at H                                                                                                                               | an uncommitted edit on top of the merge                                |
| f   | its blob at H equals its blob at M — same object id, same mode (100644, 100755 or 120000 only)                                                                                             | the build committed its own bytes to that path: **it stays an escape** |

A blob's digest follows the baseline's own rule: the SHA-256 of its bytes, or of `symlink\0` + bytes for mode 120000. **(f) is the anti-laundering condition.** M is reachable from upstream, and a commit the build makes during
the window is not, so committing an escape never clears it. (f) compares against M rather than U so that a later
fetch, which moves U past the commit HEAD merged, does not undo the classification.

**Scope of the class.** It is computed only for would-be escapes, so an authorized path is never relabelled and a
clean run makes no extra git call. It applies to every escape kind: a trusted doc or canon denied by
`protect-trusted-paths.cjs`, the always-reconciled control surface, and an ordinary path outside the scope. The
condition is about where the bytes came from, not which guard denied them. `merged[]` carries paths only, and no
finding is emitted for a merged path. The verdict enum and the exit codes do not change.

**Bounds, stated (P0).** This buys **precision** — fewer false REDs on the designed workflow — never **strength**
(lessons-learned **L42**'s bound):

- **Bytes equal to upstream's are classified `merged` whoever wrote them.** A `git checkout origin/main -- <path>`,
  or a write that reproduces exactly the merged upstream bytes and is then committed, is included. That is what the class
  means.
- **The upstream is a mutable local alias** (lessons-learned **L32**). `refs/remotes/origin/HEAD` and the ref it
  names can be moved by Bash, and a build that pushes its own commit to the upstream branch and fetches it back
  makes those bytes upstream's. Both are outside the **non-adversarial** claim this record already states. A
  **stale** fetch can only withhold the class, so the RED stays, which is the loud direction.
- **Read now versus recorded then** (lessons-learned **L42**, **L58**). Only X is recorded at anchor time. HEAD, U
  and M are read when the check runs, and each of those reads can only withhold the class, never grant it to bytes
  that are not upstream's.
- **Where it is inert, and says so.** A repository created by `git init` + `git remote add` has no
  `refs/remotes/origin/HEAD`; the warning then names `git remote set-head origin --auto`. A remote not named
  `origin` is never consulted. An older baseline (no `anchored_head`) gets a warning, and the next anchor records it.
- **Where it stays RED by design.** A conflict resolved by hand gives a blob equal to neither side, so (f) fails
  for an out-of-scope path. Line-ending or filter conversion (`.gitattributes` eol, LFS) makes (e) fail. A shallow
  clone may lack the history (b) needs; that reads as "could not decide", never as an ancestor.
- **No attribution, still** (lessons-learned **L68**). `merged` is provenance by content, not authorship. An
  uncommitted human edit of a trusted doc inside the window is an escape exactly as before.

## 3. `WARN` vs `RED`

**RED** (`ESCAPE` / `INCONCLUSIVE`): a denied candidate that is not `merged` (§2a); a control-surface path
changed with no authorizing scope and not `merged`; any statusless or unresolvable input. _Statusless = RED at
write._

**Unreadable during reconcile is a CANDIDATE, not only a warning.** A path the reconciler cannot hash
(`hashFile` returns `null`) is treated as **changed**. It is judged like any other candidate, so it goes
RED when the guards would deny it, and a `warnings[]` line names it either way. That is fail-closed on
purpose: if it were only a warning, making a file unreadable would hide a denied change. (Before 6.17.1
this section listed it under WARN; the checker had already been treating it as changed, and the row was
corrected in 6.17.1.)

**WARN** (`warnings[]`, verdict unaffected): a path present at anchor and absent now — a deletion is not
a write; a baseline written by an **older** schema version — _legacy records tolerated at read._

## 4. The ignore/exempt data — `pharn/floor/reconcile-ignore.json`

One file, iterated by the rules **and** by the tests (lessons-learned **L29**: when a remedy is
quantified over a set, the enumeration is the deliverable). Five keys:

| Key                  | What it holds                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `derived_ignore`     | git's own ignore rules — **never re-listed** here (**L35**: retire the second copy). The reconciled set is `tracked ∪ untracked-not-ignored`, so `node_modules/`, `.pharn/`, `runs/` cost nothing                                                                                                                                                                                              |
| `always_reconciled`  | Never exemptible, and compared against HEAD's committed blobs on every run, with or without a baseline: tracked changes and **added untracked files** (6.53.0). `exact` + `prefixes` are the guards' control surface and the floors; `human_only` + `human_only_prefixes` are the human-only surface and canon (§4a). Each list is a **copy** of the hooks' own sets, pinned set-equal by test |
| `pipeline_artifacts` | A stage's **own** output (`pharn/features/<slug>/PLAN.md`, `VERIFY.md`, `lenses/<lens>/findings.json`, …) — **exact** enum membership, never a `**` glob, so a stray file under the same directory is still reported. A copy of `check-regress.mjs`'s `PIPELINE_ARTIFACTS`, pinned set-equal by test                                                                                           |
| `exempt`             | Tracked paths a **named** command legitimately rewrites through Bash. Deliberately tiny; each entry carries its `writer`                                                                                                                                                                                                                                                                       |
| `never_exempt`       | A refusal set — memory-bank canon, the four trusted docs, `CODEOWNERS`. Enforced at **run time**, not only under test                                                                                                                                                                                                                                                                          |

**Why `pipeline_artifacts` exists, and it is lessons-learned L17 verbatim.** A stage's own artifact
changes _after_ the build's anchor — `/pharn-verify` writes `VERIFY.md`, `/pharn-review` writes
`findings.json`, and the `PLAN.md` that **sourced** the scope is not a **member** of it. Without this
key, every one of those reads as an escape: a _changed-since-anchor_ fact reported as a
_wrote-outside-scope_ claim, producing a **blocking** finding on the correct, designed workflow — which
is precisely how an operator is trained to wave through the one finding that must never be waved
through. This defect was found by running the checker against its own increment, not by reasoning about
it.

## 4a. The human-only surface is always reconciled (6.53.0)

**Why (P7, measured — audit 2026-10-07).** In the audit's fixture, a Bash edit of `LIMITS.md` followed by a
rewrite of its baseline entry read `CLEAN`. The four trusted docs were not always-reconciled, so the forgeable
baseline was their only reference. A second hole sat in the HEAD comparison itself: `git diff HEAD` never lists an
**untracked** file, so a control path absent at HEAD could be created through Bash and hidden the same way. With no
baseline at all it read `NO_BASELINE`. Examples are `pharn.spec-template.md`, which most repositories do not have,
or a new `pharn/floor/x.mjs`.

**What joined:**

- `human_only` — `protect-trusted-paths.cjs`'s `DEFAULT_PROTECTED` minus the guard control surface:
  - the four trusted docs;
  - `CODEOWNERS` at its three GitHub locations (root, `.github/`, `docs/`);
  - `pharn.spec-template.md`.

  `.pharn/writes-scope.json` is excluded by name: it is gitignored runtime state, never in the reconciled set.

- `human_only_prefixes` — the hook's `PROTECTED_SUBTREES`, `memory-bank/` and `.dev/memory-bank/`. That is the whole
  canon subtree, dev and product alike, because the hook denies the whole subtree.
- Every always-reconciled path's **added untracked-not-ignored** file is now a candidate too, from git's own
  `ls-files --others --exclude-standard`. The listing is filtered to control paths only, so an untracked file
  anywhere else is judged by the baseline alone, as before.
- Both listings are **NUL-separated** (`-z`). Before this change the tracked half split on newlines, and git quotes a
  non-ASCII name there, so a control path such as `.dev/memory-bank/lessons-ü.md` was silently missed. The tracked
  half also passes `--no-renames`, because a staged `git mv` of a control file used to list only the new name.

**Unchanged on purpose:**

- C1's `merged` class (§2a) still applies. A trusted doc changed on upstream and merged in during the window
  matches HEAD, so the HEAD comparison does not see it. It still differs from its baseline entry, and the `merged`
  conditions classify it.
- A forged baseline entry on an **ordinary** path is still silent. That bound is pinned as behaviour.

**The consequence, stated rather than hidden (lessons-learned L68).** Reconcile has no attribution, so a human's
**uncommitted** edit of a trusted doc, `CODEOWNERS`, the SPEC template or canon reads as an escape:

- inside a build's anchor→verify window, as before;
- **and now also with no baseline**, because the HEAD comparison sees it. So `npm run check` (`check:reconcile`) on
  a checkout holding an uncommitted `LIMITS.md` edit is RED, exactly as an uncommitted guard edit already was.
- The same holds for an uncommitted canon write by `/pharn-*memory-promote` run outside any build epoch, until that
  write is committed.

This is the loud direction, deliberately. Each such finding's `problem` ends with the remedy: commit the edit
before running the gates, or land it outside the anchor→verify window. **Never** re-anchor or edit the baseline to
clear it.

**Bounds.**

- A git-ignored control path is invisible, as every ignored path is. That includes one ignored only through
  `.git/info/exclude`.
- A **committed** change moves HEAD too (bound 6), so Code-Owner review stays the backstop for committed edits.
- The checker and `reconcile-ignore.json` run from the worktree (bound 7). A Bash writer can edit them, and that
  edit is caught only by the checker it alters.

None of this makes a trusted doc tamper-proof; it makes a Bash edit of one **detected** when the writer also forges
the baseline.

## 5. Guarantee audit (P0)

- **"a denied path that changed is reported"** → **FLOOR**: content-hash (`ARCHITECTURE §2` primitive
  #2) composed with path/enum membership (primitive #3). No model judgment. Reported in `escapes[]`, or in
  `merged[]` when every §2a condition holds — never dropped.
- **"a merged path's bytes are upstream's, and a commit the build made itself is not `merged`"** → **FLOOR
  within the non-adversarial claim**: object-id and SHA-256 equalities plus git exit codes (primitives #2, #3),
  pinned by one test per §2a condition. Bounded by §2a's list: the upstream ref is a Bash-movable alias, and bytes
  equal to upstream's are classified whoever wrote them. **"The detector got stronger" is STRUCK**: the class
  adds precision, not resistance.
- **"denied is decided by the real guards"** → **FLOOR, by delegation**: the checker **executes**
  `protect-trusted-paths.cjs`, and for the no-scope default it executes `enforce-writes-scope.cjs` in a
  probe sandbox reproducing THREE runtime signals (6.24.0, up from two): a `pharn.config.json`
  `skillsVersion`, `.dev/floor/` presence, and a FRESH run marker (written by `run-marker.mjs`'s own
  `openRun()`), so the probe always answers with the STRICT, in-run default rather than the newer
  install-posture permissive one — the only defensible answer for a probe with no write history to
  consult (§8's L42 bound, unchanged). The default set is never copied.
- **"the explicit-scope match agrees with the hook"** → **ADVISORY-BOUNDED**: that one matcher is a
  faithful copy, pinned by an example-based parity test — not a proof of equivalence. The two must be
  updated together.
- **"no Bash escape occurred"** → **STRUCK.** Four bounds: the reconciled set excludes git-ignored
  paths; the window is anchor→reconcile; the model is one worktree per session; no attribution.
- **"a shell command was analysed"** → **STRUCK, and structurally impossible here.** No Bash command
  string is ever read. Shell parsing is undecidable and a verb denylist is a heuristic, which P0 forbids
  labelling a guarantee.
