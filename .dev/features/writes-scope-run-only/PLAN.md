# PLAN — in an installed project, the write guard is fail-closed only while PHARN is working

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f # fix #4
- applied_lessons: [L1, L3, L7, L17, L18, L19, L22, L24, L25, L26, L27, L29, L31, L34, L35, L36, L37, L38, L39, L41, L42, L43, L44, L45, L50, L54, L57, L62]
- increment: In an installed project (`pharn.config.json` carries `skillsVersion` at the judged root), `enforce-writes-scope.cjs` stops denying ordinary edits when no scope is set and no PHARN run is open — it then denies PHARN's installed surface (`pharn/**` except `pharn/features/**`, `.claude/**`, `pharn.config.json`) and its own input `.pharn/writes-scope.json`, allows every other path inside the project, and allows a path outside the project only when it lies in no git tree (`protect-trusted-paths.cjs` still denies its own set) — while an open-run marker keeps today's fail-closed default, a malformed scope record denies everything, and `reconcile-baseline.mjs --anchor` refuses to open an epoch with no scope.
- layer(s): floor / hooks (`.claude/hooks/enforce-writes-scope.cjs`, `set-writes-scope.cjs` — human-applied patch); product floor (`pharn/floor/run-marker.mjs` NEW, `reconcile-baseline.mjs`, `check-bash-reconcile.mjs`); contracts (`pharn/pharn-contracts/reconciliation-record.md`, `finding-shape.md`); product commands (`.claude/commands/pharn-*.md`); shipped docs (`pharn/floor/README.md`; `LIMITS.md` — human-applied); repo-meta (`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SKILLS_VERSION`). No `role:` capability.
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- stage model: plan — model routed via Agent subagent; effort not routed

## Applied lessons

- **L1** — the meta-docs that state the old default are in `## Files`: `CLAUDE.md` ("Writes-scope" and the Commands block), `README.md` (guarantee row, the "does not cover your source" bullet, badge, generated inventory), `pharn/floor/README.md`, `CHANGELOG.md`, `SKILLS_VERSION`, and `LIMITS.md` through the patch.
- **L3** — changing the install default makes every existing test that asserted it a claim to re-audit. The build enumerates them by running the suite against the patched hook, and re-seeds each into the posture it meant (dev, unsignalled, or install with a run open) or rewrites it to the new expectation. None is deleted.
- **L7** — `## Files` names exactly what the agent writes. The three human-only files sit under the exclusion heading and travel as a patch.
- **L17** — the resume point after the human apply is `/pharn-dev-verify`, not `/pharn-dev-regress`: a committed hook script would read there as a scope escape on the correct workflow.
- **L18** — the exclusion block in `## Files` is its own `###` heading, so the setter's list ends structurally.
- **L19** — every Bash write is declared: `npm run docs:generate` (README's generated region), the verification runner and its worktree under `.pharn/pharn-dev-build/`, the generated patch and sums, the deletion of `handoff/`, the scoped formatter runs, and `apply.sh`'s apply, commit and re-anchor.
- **L22** — every command line this increment adds to a command is pinned literally (the `run-marker.mjs` open/close lines), and the build procedure and `apply.sh` are pinned below.
- **L24** — the hook's new per-write cost (the state-directory scan) is measured on this repo at build, never inherited from the loop guard's "one readdir" figure.
- **L25** — the rationale comments that assert the old story are re-derived rather than carried: `enforce-writes-scope.cjs`'s header ("FAIL-CLOSED: if that file is absent/invalid, only a default-safe-set is writable"), its `loadScope()` comment, its `ALWAYS`/`DEFAULT_SAFE_SET` comment, `set-writes-scope.cjs`'s `--clear` header, and `check-bash-reconcile.mjs`'s "two runtime signals".
- **L26** — the patch is verified at the REAL paths, in a throwaway `git worktree` of this repo, by a full `npm run check` — never in a sandbox copy.
- **L27** — two new deny bodies (`reserved`, `malformed`) and a conditional RUN block, and the out-of-root body's "releasing the scope cannot change this verdict" becomes false in the install posture. Each remedy's reachability is asserted per branch, "present in its own case AND absent from the others" (Design §5).
- **L29** — the branches are one enumeration: `everyDenyMessage()` gains every new body and variant, and the posture table (Design §1) is one data array every verdict rule iterates.
- **L31** — two deliberate copies are pinned: the reserved-path fold is a copy of `protect-trusted-paths.cjs`'s `toKey()` (✧ byte-equal, the `workTreeRoot()` precedent), and the loop marker's path layout is read by the guard as well as by its owner (pinned by EXECUTING the owner's `--open` and then the real guard).
- **L34** — every new rule is non-vacuous: the probe's run marker is shown to flip the real hook's verdict, the run-state-directory set is non-empty, and each wiring pin carries a mutation control.
- **L35** — the loop keeps its one marker; no second copy is made. The new writer owns only the two markers that did not exist, and the guard reads presence and age, never a schema, so no schema has two owners. `mark-phase.mjs` is deliberately not reused (Design §2).
- **L36** — the run-state-directory set is closed and pinned by execution over every writer, with a negative control (a marker under an unknown directory is ignored); the retracted Final-step phrase gets a closure assertion over the product-command corpus.
- **L37** — every quantified sentence this increment writes ("everything except …", "only while a run is open", "dev posture unchanged") is probed against the patched hook, including the members expected to be excluded, and each exit code is recorded in `BUILD.md`.
- **L38** — the run marker is tree-wide on purpose: the scope record is already one per tree, and a second session writing during a run is the contention L38 records. Stated as a bound, not solved.
- **L39** — the reason `mark-phase.mjs`'s `markers.jsonl` is not the guard's input: it answers "which requests belong to the run", treats an ambiguous boundary as `unknown`, and would be read here for a different question.
- **L41** — no default is left unexercised: the CLI's default root (the cwd) is exercised by a spawned test, the exported `openRun()` takes `root` with no default, and the 24 h ceiling is tested by ageing real markers with `fs.utimesSync` against the real hook.
- **L42** — `check-bash-reconcile.mjs` replays the guard after the fact, and the guard gains a third mutable input whose state at each write is recorded nowhere. So the replay is removed from the ordinary path (`--anchor` now always records a scope), and where it remains the probe answers with the strict in-run default rather than a NOW reading of today's markers.
- **L43** — `human-only.sha256` certifies agreement between two agent-written files, never authentication; what binds the applied bytes is the hook suites run on them by `apply.sh` and the human's reading of the diff.
- **L44** — the verification is ONE node runner invocation and `apply.sh` is one shell; nothing carries state between blocks.
- **L45** — the commands' open/close lines are EXECUTED from the committed command text against the real guard, not only pinned for presence and order.
- **L50** — the sweep is by REFERENT ("the install default denies everything outside `pharn/features/**`"), not by one spelling: every cite found this run is classified in Discovery below, including the ones that stay true.
- **L54** — marker presence and a malformed-record test use `lstat`, never `existsSync`: a dangling link at either path counts as present.
- **L57** — the scoped formatter runs pass explicit paths, `prettier --ignore-unknown` and `markdownlint-cli2 --no-globs`.
- **L62** — every value the new deny bodies echo (marker names, paths, ages) goes through `asData()`, which is total (it returns `null` for a non-string and never calls `String()`), and `run-marker.mjs` quotes argv through the same kind of total helper in its refusals.

## Trigger (P7)

A user running PHARN in another project reported that the installed hooks block Claude even when no PHARN
command is running: with no scope file, `enforce-writes-scope.cjs` allows only `pharn/features/**` and
`.pharn/**`, so every ordinary edit is denied, including writes to Claude Code's own memory folder
(`~/.claude/projects/<proj>/memory/`, outside every git tree). Users are pushed to stop using Claude or to
unwire the guard. Roadmap Phase 0.2, approved by the maintainer 2026-09-25. The maintainer's decisions are
cited below as D1–D9 and are fixed.

## Discovery (P6) — live state read this run

- `HEAD` = `767bf61` (6.22.0). `SKILLS_VERSION` 6.22.0, `MIN_CLI` 0.5.0. Lessons index GREEN
  (`check-lessons-index.mjs` exit 0). The ARCHITECTURE pin above is from `.dev/floor/hash-doc.mjs`.
- `enforce-writes-scope.cjs`: `defaultSafeSet()` returns `INSTALL_SAFE_SET` (`pharn/features/**`) whenever
  `isPharnDevRepo()` is false, so a tree with **neither** signal is treated like an install today. Its own
  comment and `isPharnInstalledProject()` define the install posture as "`skillsVersion` present".
  `loadRecord()`/`loadScope()` fall back to the default on an absent, unparseable, non-object or
  non-array-`scope` record. Out-of-root paths are always denied (bodies `out-of-root`, `other-tree`).
- `require-loop-record.cjs`: the loop marker is `.pharn/pharn-loop/<name>/active.json`
  (`pharn-loop-active/1`), opened by `--open` in `/pharn-loop` Step 1a after S2–S4 and removed by `--close`
  in its Final step; 24 h ceiling on `started_at`, symmetric; session-bound for the Stop guard.
- `/pharn-ship` has no run marker. It records `mark-phase.mjs --pending-start` before `/pharn-spec`,
  `run-start --adopt-pending` once `<name>` exists, `run-stop` in Step 3a; its turn ends at GATE 1.
- `/pharn-review` sets **no** scope and states its fix #7 guarantee as "writes only inside
  `pharn/features/**` or `.pharn/**`", which rests entirely on the fail-closed default (Step 0). Every other
  product command sets a scope before its own Write-tool writes (the stages in their first step; the two
  orchestrators before each artifact they write). `/pharn-review` has no turn-end instruction; Step 6b is its
  last procedure step, and it asks the human at Step 0, Step 1 and Step 1b.
- `/pharn-ship`'s release pointer to its Final step sits at the end of Step 3b, and the command itself says a
  reader "cannot tell … whether a stopped run reaches attestation at all" (Step 3a); Step 3a is the one step it
  states runs on every exit that ends the run. `/pharn-spec` holds its own SPEC-only scope through the GATE-1
  halt, until its Final step.
- `set-writes-scope.cjs` writes its record at `process.cwd()`, not at the hook's root; `--clear` prints
  "fail-closed default-safe-set active".
- `reconcile-baseline.mjs --anchor` prints `(none set — fail-closed default)` and records
  `scope_snapshot: null` with no scope. `check-bash-reconcile.mjs` delegates the no-scope default to the real
  hook in a probe sandbox reproducing two signals. Tests that anchor with no scope: two `★ no-scope` cases,
  the malformed-baseline and absent-guard cases, and four symlink cases in `check-bash-reconcile.test.mjs`;
  three CLI cases in `reconcile-baseline.test.mjs` (a heuristic count; the build enumerates by running).
- The generated README inventory counts "Floor checkers — 81", so a new `pharn/floor/*.mjs` needs
  `npm run docs:generate`.
- **The referent sweep (L50)** — every cite of "the install default denies everything outside
  `pharn/features/**`", classified:
  - **becomes false, edited:** `README.md` guarantee row and the "does not cover your source" bullet;
    `CLAUDE.md` "Writes-scope" (the Fail-closed bullet, the out-of-root remedy, the `.pharn/` load-bearing
    list) and the Commands block ("two runtime signals"); `pharn/floor/README.md` (the `README.md → exit 2`
    example); the Final step of 11 product commands ("absence of a scope file = the fail-closed
    default-safe-set"); `/pharn-review` Step 0; `/pharn-loop` Final step ("a present `LOOP.md` and the 24 h
    ceiling both make the guard inert" — true of the Stop guard only);
    `pharn/pharn-contracts/reconciliation-record.md` §5 ("two runtime signals");
    `pharn/pharn-contracts/finding-shape.md`'s emission audit ("`enforce-writes-scope.cjs` reads exactly one
    input — `.pharn/writes-scope.json`", and a `/pharn-review` lens writes under "the active scope (or the
    fail-closed default)") — added at grill (G5); `set-writes-scope.cjs` (the `--clear` message and header)
    and `enforce-writes-scope.cjs` (header) via the patch; `LIMITS.md §7`, one phrase in §8 ("to choose its
    fail-closed posture") and §1d's "re-gate every downstream write … regardless of `state`" (added at grill,
    G6: a universal quantifier the permissive posture falsifies for a write made outside a run) via the patch.
  - **stays true, unchanged, with the reason:** `pharn/pharn-contracts/spec-template.md` ("in an install the
    fail-closed write guard's default denies it" — the shipped template is under `pharn/**`, reserved);
    `THREAT-MODEL.md §4` item 7 and `pharn/ARCHITECTURE.md §3.1/§7` (about a DECLARED `writes:` scope, which
    is enforced unchanged); `SECURITY.md` ("allow a write outside the active scope" — with no scope set there
    is no active scope to be outside of; reason added at grill, G10); `CONTRIBUTING.md` and the `pharn-dev-*` commands (dev posture
    unchanged).

## Design

### 1. Postures — one table

The posture is read at the judged root (`ROOT`, unchanged since 6.1.0):

| posture         | signal at ROOT                                      | no scope, no run                                                                                                                                                  | no scope, run open                                  | scope set            | malformed scope record   |
| --------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------- | ------------------------ |
| **install**     | `pharn.config.json` has a non-empty `skillsVersion` | **permissive**: deny `pharn/**` except `pharn/features/**`, `.claude/**`, `pharn.config.json`; allow the rest; out-of-root allowed unless inside another git tree | today's default (`pharn/features/**` + `.pharn/**`) | authoritative, today | **deny every path** (D4) |
| **dev**         | `.dev/floor/` directory and no `skillsVersion`      | today, byte-for-byte (D1)                                                                                                                                         | today (markers never read)                          | today                | today (the default)      |
| **unsignalled** | neither                                             | today (`pharn/features/**` + `.pharn/**`)                                                                                                                         | today (markers never read)                          | today                | today (the default)      |

- `.pharn/writes-scope.json` stays denied first, in every posture, unchanged.
- `protect-trusted-paths.cjs` is untouched and keeps its whole set in every posture: trusted docs,
  `CODEOWNERS`, the control surface, canon, `pharn.spec-template.md`, git metadata. A write must still pass
  both guards.
- **Why "unsignalled" keeps today's default** (see Decisions for GATE 1): the relaxation needs a POSITIVE
  install signal. `LIMITS.md §7`'s subpath-install-through-a-worktree case judges a root with neither signal,
  and it must not flip from "fail-closed friction" to "permissive, with the run marker and the scope both
  invisible". Hermetic temp-dir tests also live here, so their verdicts do not move.
- **Reserved matching is case-folded.** The permissive posture is a DENY list, and a case-variant spelling
  that misses a deny list is a fail-OPEN (on APFS, `PHARN/floor/x.mjs` is `pharn/floor/x.mjs`). Today's
  allow-list is case-sensitive, which was fail-closed; the new deny list cannot be. The reserved test runs on
  a folded key built by a deliberate copy of `protect-trusted-paths.cjs`'s `toKey()` (NFC, per-segment
  trailing dot/space strip, `toUpperCase().toLowerCase()`), pinned byte-equal by a ✧ test. Reserved iff the
  key equals `pharn.config.json`, or starts with `.claude/`, or starts with `pharn/` and not with
  `pharn/features/`.

### 2. What "a run is open" means (D3)

A run is open when, at ROOT, some `<dir>/<name>/active.json` exists (`lstat`, never followed) whose
modification time is within 24 h of now (§4), for `<dir>` in the closed set below — and also whenever the
scan cannot tell (an error other than absence counts as open; see "Errors fail closed" — wording amended at
grill, G12):

- `.pharn/pharn-loop` — the existing loop marker, owned by `require-loop-record.cjs`, unchanged;
- `.pharn/pharn-review` — NEW, `/pharn-review` (see Decisions for GATE 1);
- `.pharn/pharn-ship` — NEW, `/pharn-ship`.

- **Presence and age only; the guard never parses a marker.** No schema reaches the hook, so the loop
  marker keeps its single owner and the new schema has a single owner (`run-marker.mjs`). A marker that is
  torn, a directory or a dangling link still counts: fail-closed.
- **Errors fail closed.** `ENOENT` or `ENOTDIR` on a state directory means "no run there"; any other error
  while scanning counts as a run open.
- **Tree-wide, not per session.** A run open in one session keeps every session and subagent in that tree
  fail-closed. The scope record is already one per tree (L38), `/pharn-review`'s lens subagents must be
  covered, and the loop marker's `session_id` can be `null`.
- **Read only when it matters:** install posture and no usable scope. The cost is one `readdir` per state
  directory plus one `lstat` per entry, measured at build (L24).
- **Why not `mark-phase.mjs` run-start/run-stop** (the brief's suggestion; rejected, reasons recorded):
  (1) `markers.jsonl` answers which requests belong to the run and treats a torn or ambiguous boundary as
  `unknown`, where the guard needs a fail-closed presence test (L39); (2) "open" there is DERIVED (the last
  run-start after the last run-stop) from an append log that grows with every run and every feature, and
  would be re-read on every Write; (3) its semantics live in `run-window-core.mjs`, an ESM module outside the
  protected set, so importing it puts an unprotected file in a guard's load graph and copying it makes a
  second owner (L35); (4) `/pharn-ship`'s pre-naming window is a third file shape (`.pending/<session>.json`).

### 3. The new marker writer — `pharn/floor/run-marker.mjs` (D3)

- `node pharn/floor/run-marker.mjs --open <command> <name>` and `--close <command> <name>`, where
  `<command>` is in the closed set `{pharn-review, pharn-ship}`. It REFUSES `pharn-loop`: that marker has its
  owner.
- Writes `<cwd>/.pharn/<command>/<name>/active.json` =
  `{"schema":"pharn-run-active/1","command":…,"name":…,"session_id":…,"started_at":…}` — the loop marker's
  shape minus `cap`. `session_id` comes from `CLAUDE_CODE_SESSION_ID` or is `null`; it is diagnostic only and
  nothing reads it. The root is the cwd, like `set-writes-scope.cjs`, so the marker and the scope record land
  in the same place.
- `<name>` must match `^[a-z0-9][a-z0-9-]{0,63}$`. It refuses a symlink on any path component (the
  `require-loop-record.cjs` `markerMode` rule, `lstat` per component). `--open` overwrites, which refreshes
  the age; `--close` removes the file and is idempotent. Exit 0 ok, 2 refusal with nothing written.
- Exports `RUN_MARKER_COMMANDS`, `markerPath()`, `openRun({root, command, name, sessionId, now})` and
  `closeRun({root, command, name})`, with `root` required and no default. The reconcile probe (§8) and the
  tests use these, so no second writer exists.
- **Placement in `/pharn-ship`** (amended at grill — G1, G2):
  - `node pharn/floor/run-marker.mjs --open pharn-ship '<name>'` immediately after the GATE-1 resume
    backstop `node pharn/floor/check-spec-approved.mjs pharn/features/<name>/SPEC.md` exits 0, and before
    `/pharn-plan`'s `stage-start` marker. Not at naming: until GATE 1 resolves, `/pharn-spec` holds its own
    SPEC-only scope, so a marker there adds no protection, and an abandoned or "Keep as Draft" GATE 1 would
    hold the whole tree fail-closed for 24 h — the trigger's own complaint in a new form. Everything after the
    backstop runs in one continued turn until GATE 2 or a STOP, so a single `--open` covers every
    between-stage window;
  - `node pharn/floor/run-marker.mjs --close pharn-ship '<name>'` in **Step 3a**, directly after
    `mark-phase.mjs --name '<name>' --kind run-stop`. Not in the Final step: Step 3a is the one step the
    command states runs on **every exit that ends the run** (GATE 2 and every STOP) and is positioned before
    Step 3b for exactly that reason, while the Final step is reached through a pointer at the end of Step 3b,
    whose reachability on a STOP path the command itself calls ambiguous. Every write after Step 3a is made
    under an explicit scope (Step 3's `SHIP.md`, Step 3b's `ship-record.json`/`SHIP.md`), so closing there
    opens no unscoped window. A STOP before the backstop closes a marker that was never opened — `--close`
    is idempotent.

- **Placement in `/pharn-review`** (amended at grill — G3): `--open pharn-review '<name>'` immediately before
  Step 3 — after every ask-the-human point (Step 0's `<name>`, Step 1's target, Step 1b's `--target`) and
  before the first step that puts untrusted code or skill content into the context (Steps 3, 3b, 4). A new
  `## Step 7 — Close the run` directly after Step 6b (the last procedure step; the command has no turn-end
  instruction), stated to run on every exit after the open, including an early refusal. Opening at Step 0
  would leave an unanswered question at Step 1 holding the tree fail-closed for 24 h.
- **ADVISORY (P0), stated in each command.** Both lines are Bash calls outside the `PreToolUse` gate (L19). A
  run that skips `--open` runs under the permissive default between its own scoped steps. One that skips
  `--close` leaves a marker that holds the fail-closed default for at most 24 h. Neither fails the run.
- **The windows before the open are not covered by a marker**, and each is stated: `/pharn-ship` before its
  GATE-1 backstop (covered instead by `/pharn-spec`'s own scope, held through the halt), `/pharn-loop`'s
  S1–S4 (no marker can exist before `<name>`, and nothing is written through the Write tool there), and
  `/pharn-review`'s Steps 0–1b (deterministic Bash steps and questions, before any untrusted content). A
  bound.
- **GATE 1 opens no run.** A ship that never passes its backstop — "Keep as Draft", an unanswered form, an
  abandoned session — leaves no marker at all. The one wait inside an open ship run is Step 3b's attestation
  halt, which comes after Step 3a has already closed it.
- `/pharn-loop` gains one sentence in Step 1a (the same marker also holds the write guard's fail-closed
  default in an install) and a correction in its Final step (for the write guard, only `--close` or the
  24 h ceiling releases a leftover marker; a present `LOOP.md` does not).

### 4. The stale-marker rule (D7a)

**A marker counts while its modification time is within 24 h of now in either direction** — the same
ceiling and the same symmetric rule as `require-loop-record.cjs`'s `AGE_CEILING_MS`, so a loop run is over at
the same age for both guards. A crashed run holds the fail-closed default for at most 24 h, a far-future-dated
marker is ignored rather than locking the tree, and `--open` refreshes the age. **mtime, not `started_at`**,
because the guard never parses (§2); for a marker written once the two agree. Bound: `touch` extends it, a
Bash write outside the gate like every marker operation.

### 5. Deny messages — one body per reachable remedy set (D7b, L27)

`denyMessage()` stays pure string composition over values the caller computes. The caller now also passes
`ctx = { install, runs, openWithout }`: `runs` is the list of open markers (relative path, age in whole
hours), and `openWithout` is true iff the path would be ALLOWED in the install posture with neither scope nor
run.

| branch                   | reached when                                                             | must offer                                                                                                                                                                                                        | must NOT offer                                                                            |
| ------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `in-repo` (existing)     | scope set; dev or unsignalled with no scope; install, run open, no scope | today's bullets; the RUN block iff `install` and `runs` is non-empty and `openWithout`                                                                                                                            | the RUN block in dev/unsignalled, for `.pharn/writes-scope.json`, or for a reserved path  |
| `out-of-root` (existing) | not inside ROOT and in no other git tree                                 | today's bullets; in the install posture when `openWithout`, the sentence "outside a run, with no scope, this path is writable", plus the stale-scope bullet if a record exists and the RUN block if runs are open | "releasing the scope cannot change this verdict" whenever releasing can (install)         |
| `other-tree` (existing)  | inside a git tree that is not ROOT's                                     | unchanged                                                                                                                                                                                                         | the RUN block or the stale-scope bullet (neither can help)                                |
| `reserved` (NEW)         | install, no scope, no run, reserved path                                 | a scope naming the path (never `.claude/settings*.json` or a hook script, which stay denied regardless); `pharn update`; a human edit                                                                             | Bash; the stale-scope or stale-run bullet (there is neither)                              |
| `malformed` (NEW)        | install, the record is present but not usable                            | release it (`set-writes-scope.cjs --clear`) or re-run the running command's setter, after which the ordinary rules decide the path                                                                                | "declare it in `writes:`" on its own (no declaration counts until the record is replaced) |

- **The RUN block** lists each open marker (path and age) with its own close command:
  `node pharn/floor/run-marker.mjs --close <command> <name>`, or
  `node .claude/hooks/require-loop-record.cjs --close <name>` for a loop run. A command is rendered only for
  a `<name>` that matches the slug grammar; any other name is listed by path with "remove that file by hand",
  so a crafted directory name never becomes a suggested shell command. It says a marker older than 24 h is
  ignored on its own, and it says **never close a run you are executing** — closing removes the guard that
  run depends on.
- New bodies name no slash-command, so the existing "cited commands exist / invoke the setter / are exactly
  the two build stages" rules keep their meaning; they iterate the new bodies too (L29).
- **Dev and unsignalled messages are byte-identical to today's**, not only their verdicts (D1): every new
  sentence is conditional on `ctx.install`. The build measures it by running the HEAD hook and the new hook
  over the §1 path list × {dev, unsignalled} × {no scope, scope set, malformed} and diffing stderr (0
  differences expected, recorded in `BUILD.md`). It is also held **permanently** (amended at grill — G8): the
  enforce test pins the full stderr of three dev-posture denials — in-repo with no scope, in-repo under a set
  scope, out-of-root — as exact strings captured from the HEAD hook, so a later edit that changes a dev
  message fails CI instead of passing a one-time measurement. The stale-scope bullet's "narrower than the
  fail-closed default" gets an install-only variant ("narrower than the guard's default").

### 5b. A guard error denies (amended at grill — G7)

The new decision path adds filesystem calls (the marker scan, the malformed-record `lstat`) and string work
(the fold, the new bodies). An uncaught throw there would end the hook with exit 1, which Claude Code treats
as a non-blocking error — the write would proceed, a fail-OPEN (the hook header's own warning, and L62's
crash-read-as-verdict shape). So the whole decision loop runs inside a `try/catch` whose `catch` DENIES with
exit 2 and a fixed message ("the writes-scope guard failed while deciding; the write is denied — fail-closed"),
in every posture. This changes dev-posture behavior on an error path only: a crash that used to let the write
through now denies it, which is the posture the dev default already has. Bound, stated: no fixture can make the
current code throw on demand, so the wrapper is pinned by a source-shape test (the decision loop sits inside a
`try` whose `catch` calls `deny`) — presence, not a demonstrated catch.

### 6. Malformed scope record → deny everything (D4)

"Malformed" means `.pharn/writes-scope.json` exists (`lstat` succeeds; a dangling link or a directory counts,
L54) and it is not a readable file whose JSON is a plain object with an array `scope` — exactly the states
that fall back to the default today, minus absence. In the **install** posture it denies every write,
`.pharn/**` and out-of-root paths included, with the `malformed` body. Recovery goes through the setter
(`--clear` or a fresh set), which writes with `fs` and is never gated. Nothing from a malformed record is
echoed. Dev and unsignalled keep today's fallback (see Decisions for GATE 1). `loadScope()`'s comment
("falls back to the safe-set rather than denying everything") is re-derived. Bound: the setter writes its
record non-atomically, so a Write racing a set in an install can read a torn record and be denied once —
fail-closed and transient.

### 7. Subpath install (D7c)

`LIMITS.md §7`: an install at a subpath of a repository, entered through a worktree, is judged at the worktree
root, which reads a different scope record than its setter wrote. With this plan that root has neither signal,
so it is **unsignalled**: today's fail-closed default with and without a run, and no permissive posture.
Friction, still not a hole. The markers are written at the cwd and read at ROOT exactly as the scope record
is, so they are equally invisible there, and nothing is relaxed because they are absent. A subpath install
opened as its own project (`CLAUDE_PROJECT_DIR` = the install dir) is judged at the install dir and gets the
full install behavior. The §7 bullet is extended in the patch to say so.

### 8. `check-bash-reconcile.mjs` parity (D7d, L42)

- `makeDefaultProbeSandbox()` reproduces **three** runtime signals: `pharn.config.json` (copied),
  `.dev/floor/` (created), and **a fresh run marker** written by `run-marker.mjs`'s own `openRun()` into the
  sandbox. The probe therefore always answers with the **in-run** default, the strict one. It is exported for
  the parity test.
- Why the strict one: after D6 (§9) every new baseline records a scope, so the default probe is reached only
  for a legacy baseline anchored without one and for the no-baseline control-surface check. The marker state
  at the moment of each past write is recorded nowhere (L42), so replaying with today's markers would give a
  NOW answer, and replaying with none would give the permissive answer — fail-open exactly where the checker
  knows least.
- The ★ parity test runs the **real** hook: in an install-posture sandbox, `src/x.js` exits **2** with the
  probe's marker and **0** without it (non-vacuity, L34), and `makeDefaultProbeSandbox()`'s own output makes
  the real hook deny it. The header and the contract say "three runtime signals".
- A bound, named and not fixed: between a manual `/pharn-build` and `/pharn-verify` with no run open, a
  Write-tool edit the live guard now ALLOWS is still judged against the build's recorded scope and reads as
  `ESCAPE`, exactly as an edit made in an editor does today (reconcile has no attribution). The finding text
  "a write reached it outside the guarded tool surface" is an attribution reconcile cannot make: follow-up
  `reconcile-escape-attribution-wording`.

### 9. `--anchor` refuses with no scope (D6)

`reconcile-baseline.mjs --anchor` exits **2** and writes nothing when `snapshotScope()` is `null` (absent or
unusable record), with "no usable writes-scope at .pharn/writes-scope.json — run the stage's scope-setter
first". An explicit `{"scope": []}` is a scope and anchors. Both shipped callers (`/pharn-build`,
`/pharn-dev-build`) set the scope first, and `check-bash-reconcile.test.mjs` already pins that order.
`/pharn-build` Step 3's HALT sentence is widened to "a non-zero exit from either line". The contract's
`scope_snapshot` row becomes "an object; `null` only in a baseline anchored before 6.23.0".

### 10. Docs (D8)

- `CLAUDE.md` "Writes-scope": the Fail-closed bullet becomes the three-posture rule; a run-marker bullet; the
  deny-message bullet gains the two new bodies and the install out-of-root case; the `.pharn/` load-bearing
  list names the run markers for an install (in this dev repo the guard never reads them). The Commands block
  gains `run-marker.mjs` and the anchor refusal, and "two runtime signals" becomes three.
- `README.md`: the guarantee row and the "does not cover your source" bullet rewritten and probed (L37);
  badge 6.23.0; the generated inventory regenerated.
- `pharn/floor/README.md`: the enforce section states the postures; the `README.md → exit 2` example is
  labelled dev-repo or in-run, with the install-outside-a-run exit beside it.
- The Final step of the 11 setter-invoking product commands (plus `/pharn-review`'s Step 0): two phrases
  re-worded so they hold in every posture. The `pharn-dev-*` commands are untouched.
- `LIMITS.md §7`, §1d and one phrase in §8, and the two hook edits, travel in the patch. `THREAT-MODEL.md` and
  `pharn/ARCHITECTURE.md` are byte-identical (see Discovery).
- `pharn/pharn-contracts/finding-shape.md` (added at grill — G5): "reads exactly one input" becomes "reads
  exactly one SCOPE input — `.pharn/writes-scope.json` — beside the signals that choose its default
  (`pharn.config.json`, `.dev/floor/`, and in an installed project the run markers)", and the lens sentence
  becomes "(or, with no scope set, the default — fail-closed while `/pharn-review`'s run marker is open)".

**Draft of the `LIMITS.md` change** (the build may tighten wording; the facts are fixed here, and the grill
corrected two quantifiers — G4, G6):

- the subpath bullet gains: "…and, because that root carries no `skillsVersion`, it keeps the fail-closed
  default outside a run as well: friction, not a hole."
- a new bullet: "**In an installed project, `enforce-writes-scope.cjs` is fail-closed only while PHARN is
  working (6.23.0).** With no scope set and no open `/pharn-ship`, `/pharn-loop` or `/pharn-review` run, it
  denies PHARN's installed surface — `pharn/**` except `pharn/features/**`, `.claude/**` and
  `pharn.config.json`, matched case-folded — and its own input `.pharn/writes-scope.json`, and allows every
  other path inside the project. Outside the project it allows a path that lies in no git tree, such as
  Claude Code's own memory folder, and denies one inside another git tree. `protect-trusted-paths.cjs` is
  unchanged and still denies its own set in every posture. A run is open while
  `.pharn/<pharn-loop|pharn-ship|pharn-review>/<name>/active.json` exists with a modification time within
  24 h, or while the guard cannot read those directories. The markers are written and removed through `Bash`
  (§6), so a run that skips `--open` is unguarded between its stages, a crashed run's marker keeps every
  session in the tree fail-closed for up to 24 h unless it is closed, and `touch` extends it. The posture
  needs `skillsVersion` at the root the guard judges. A malformed `.pharn/writes-scope.json` denies every
  write in an installed project. Outside a run, an edit the guard allows between a manual `/pharn-build` and
  `/pharn-verify` is still judged by `check-bash-reconcile.mjs` against the build's recorded scope, and reads
  as an escape, as an editor edit does."
- §1d: after "re-gate every downstream write issued through the `Write`/`Edit`/`MultiEdit`/`NotebookEdit`
  tool surface and network call regardless of `state`", add "— in an installed project, while a scope is set
  or a PHARN run is open; outside both, the writes-scope guard no longer gates ordinary paths (§7)".
- §8: "(`skillsVersion`, to choose its fail-closed posture)" → "(`skillsVersion`, to choose its posture)".

### 11. Version (D9)

**Minor: 6.22.0 → 6.23.0** — a newly shipped floor script (`run-marker.mjs`) and a new guard posture. Not
major: no contract, finding shape or frontmatter change invalidates an install, and the anchor refusal only
affects a caller that anchors with no scope, while every shipped caller sets one first. **`MIN_CLI` stays
0.5.0**: nothing is relocated, and a CLI that copies `pharn/floor/` per file lands the new script.
`settings.json` is unchanged, so an install needs no wiring edit. A sibling phase (`stage-regress-script`)
also bumps; whichever merges second renumbers (by diff, never by memory).

**How `pharn update` reaches an install — ADVISORY, not verified this run** (amended at grill — G9): per the
roadmap's 0.1 pre-check (pharn-cli 0.5.0 @765eec4, recorded 2026-09-25, not re-measured here), `pharn update`
re-copies commands, `*.cjs` hooks and `pharn/floor/` per file, lands new files, keeps a user-edited file unless
`--force`, and never writes `settings.json`. That is pharn-cli's behavior, outside this repository, so the
CHANGELOG states it as the CLI's documented behavior, not as a floor fact.

**The CHANGELOG migration note carries exactly these points** (pinned here so the build does not improvise
them):

- nothing to wire: the hooks change, `settings.json` does not;
- an install whose `pharn-ship.md` or `pharn-review.md` was edited locally keeps the old command under
  `pharn update`, so it never opens a run marker and those runs are unguarded between their stages — re-take
  the shipped command, or add the two pinned lines;
- a malformed `.pharn/writes-scope.json` now denies every write in an installed project —
  `node .claude/hooks/set-writes-scope.cjs --clear` releases it;
- `reconcile-baseline.mjs --anchor` now refuses (exit 2) with no scope set; every shipped caller sets one
  first, so only a caller outside PHARN's commands is affected;
- rollback: reverting 6.23.0 restores the fail-closed default everywhere; a leftover
  `.pharn/pharn-ship/` or `.pharn/pharn-review/` marker is inert, because nothing in the older tree reads
  those directories (the loop marker is unchanged and keeps its Stop-guard meaning).

## Decisions for GATE 1 (beyond or interpreting the brief — all four accepted at GATE 1)

1. **`/pharn-review` opens a run marker.** It is not in D3's list, but its stated fix #7 guarantee rests on the
   fail-closed default, and it is the one product command that sets no scope while reading untrusted code
   whose lens subagents write (THREAT-MODEL: reviewed code is hostile input). Without a marker an injected
   lens could write anywhere outside the reserved set. The alternative is narrowing `/pharn-review`'s claim.
2. **"Install posture" means a positive `skillsVersion` signal**, not "not dev" — the code's own definition
   (`isPharnInstalledProject()`). The unsignalled tree keeps today's default (§1, §7).
3. **D4 applies to the install posture only.** D1 fixes the dev posture byte-for-byte, and both other postures
   already fall back to a fail-closed default.
4. **`set-writes-scope.cjs` joins the patch**, for its `--clear` message and header only: that message tells
   the model "fail-closed default-safe-set active" after every command, which is false in an install outside
   a run.

## Files

- `.dev/features/writes-scope-run-only/PLAN.md` — this plan — layer dev artifact
- `pharn/floor/run-marker.mjs` — NEW. The `/pharn-ship` and `/pharn-review` run-marker writer (§3) — layer product floor
- `pharn/floor/run-marker.test.mjs` — NEW. Writer behaviour and refusals; the ★ WIRING tests that EXECUTE the commands' pinned open/close lines (ship, review, and the loop's) against the real hook — layer product floor tests
- `pharn/floor/reconcile-baseline.mjs` — EDIT. `--anchor` refuses with no scope (§9) — layer product floor
- `pharn/floor/reconcile-baseline.test.mjs` — EDIT. The refusal; the no-scope CLI cases re-seeded — layer product floor tests
- `pharn/floor/check-bash-reconcile.mjs` — EDIT. The probe's third signal, the export, the header (§8) — layer product floor
- `pharn/floor/check-bash-reconcile.test.mjs` — EDIT. No-scope cases rebuilt as legacy baselines; the ★ probe-marker parity — layer product floor tests
- `pharn/pharn-contracts/reconciliation-record.md` — EDIT. `scope_snapshot`, the anchor refusal, three signals — layer contract
- `pharn/pharn-contracts/finding-shape.md` — EDIT. The emission audit's "reads exactly one input" and the `/pharn-review` lens sentence (§10, grill G5) — layer contract
- `pharn/floor/README.md` — EDIT. The enforce section's postures and examples — layer shipped doc
- `.claude/hooks/enforce-writes-scope.test.cjs` — EDIT. The posture table as one matrix; markers; the stale rule; the fold; the two new bodies; per-branch remedy reachability; the ✧ `toKey` copy pin — layer hook tests
- `.claude/hooks/set-writes-scope.test.cjs` — EDIT. The new `--clear` message — layer hook tests
- `.claude/hooks/writes-scope-release.test.cjs` — EDIT. Closure: no product command keeps the retracted phrase — layer hook tests
- `.dev/floor/command-hygiene.test.mjs` — EDIT. RUN_MARKER_WIRING: one open and one close line per command, ordered, closed over the corpus, with mutation controls — layer dev tests
- `.claude/commands/pharn-ship.md` — EDIT. Open after run-start; close in the Final step; Final-step phrasing — layer product command
- `.claude/commands/pharn-review.md` — EDIT. Open at the end of Step 0; Step 7 closes; the fix #7 paragraph re-derived — layer product command
- `.claude/commands/pharn-loop.md` — EDIT. Step 1a and Final-step sentences (§3); Final-step phrasing — layer product command
- `.claude/commands/pharn-build.md` — EDIT. The Step 3 HALT covers the anchor's exit; Final-step phrasing — layer product command
- `.claude/commands/pharn-grill.md` — EDIT. Final-step phrasing — layer product command
- `.claude/commands/pharn-plan.md` — EDIT. Final-step phrasing — layer product command
- `.claude/commands/pharn-regress.md` — EDIT. Final-step phrasing — layer product command
- `.claude/commands/pharn-verify.md` — EDIT. Final-step phrasing — layer product command
- `.claude/commands/pharn-spec.md` — EDIT. Final-step phrasing — layer product command
- `.claude/commands/pharn-test.md` — EDIT. Final-step phrasing — layer product command
- `.claude/commands/pharn-memory-promote.md` — EDIT. Final-step phrasing — layer product command
- `CLAUDE.md` — EDIT. "Writes-scope" and the Commands block (§10) — layer repo-meta
- `README.md` — EDIT. Badge, guarantee row, the default bullet by hand; the generated inventory by `npm run docs:generate` (a Bash write) — layer repo-meta
- `CHANGELOG.md` — EDIT. `## [6.23.0]` with the migration note (§11) — layer repo-meta
- `SKILLS_VERSION` — EDIT. `6.22.0` → `6.23.0` — layer repo-meta
- `.dev/features/writes-scope-run-only/handoff/enforce-writes-scope.cjs` — NEW. Transient staging source for the patch, deleted after generation — layer dev artifact
- `.dev/features/writes-scope-run-only/handoff/set-writes-scope.cjs` — NEW. Transient staging source — layer dev artifact
- `.dev/features/writes-scope-run-only/handoff/limits-edits.json` — NEW. Transient: the `LIMITS.md` edits as `[{find, replace}]`, each `find` required to match exactly once — layer dev artifact
- `.dev/features/writes-scope-run-only/proposed/human-only.patch` — NEW. Generated by the verification runner — layer dev artifact
- `.dev/features/writes-scope-run-only/proposed/human-only.sha256` — NEW. Generated by the runner, `shasum -c` format — layer dev artifact
- `.dev/features/writes-scope-run-only/proposed/apply.sh` — NEW. The human-run apply script pinned below — layer dev artifact
- `.dev/features/writes-scope-run-only/proposed/APPLY.md` — NEW. What to read, what the script does, where to resume — layer dev artifact

### Explicitly not touched by the agent

- `.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/set-writes-scope.cjs`, `LIMITS.md` — **human-only** (fix #2); they travel in `proposed/human-only.patch`, applied by `apply.sh`. The setter refuses the two hooks without `--allow-claude-dir`, and fix #2 denies all three regardless of scope.
- `.claude/settings.json`, `.claude/settings.local.json`, `.claude/hooks/protect-trusted-paths.cjs`, `.claude/hooks/require-loop-record.cjs`, `CODEOWNERS`, `pharn.spec-template.md` — human-only and unchanged: no hook is newly wired, and the loop marker's writer is reused as is.
- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md` — human-only and byte-identical.
- `MIN_CLI` — stays `0.5.0`.
- `.claude/commands/pharn-dev-*.md` — the dev posture is unchanged, so their Final-step sentence stays true.
- `pharn/floor/reconcile-ignore.json` — no tracked path is newly written through Bash outside a declared scope.

## Build procedure (pinned — L19, L22, L26, L44, L57)

1. `/pharn-dev-build` Step 0 as written: the setter from this PLAN, then `--anchor` (the old anchor; §9 lands
   in this same build).
2. **Before** writing the new hook, capture the three golden dev-posture deny messages (§5, grill G8) from the
   current in-tree hook — it is still HEAD's — into the enforce test. Then write the agent files above and the
   three `handoff/` sources (the two full hook files and `limits-edits.json`).
3. Format only this build's own files: `npx prettier --ignore-unknown --write <the written paths>`, and
   `npx markdownlint-cli2 --no-globs --fix <the written .md paths>` — never over the tree (L57).
4. `npm run docs:generate` — a declared Bash write; it changes only README's generated inventory
   (81 → 82 floor checkers) and rewrites the other generated files byte-identically.
5. Write `.pharn/pharn-dev-build/verify-patch.mjs` with the Write tool and run it ONCE:
   `node .pharn/pharn-dev-build/verify-patch.mjs`. It uses `spawnSync` with argv arrays only (no shell
   strings, no `$VAR`, no heredoc — the forms an isolated worktree refuses) and, in a `try/finally`:
   - `git worktree add --detach .pharn/pharn-dev-build/verify-wt HEAD`, and symlinks `node_modules` into it;
   - copies every existing agent-written path from `## Files` into it, the two handoff hooks to their real
     paths, and applies `limits-edits.json` to its `LIMITS.md` (each `find` must match exactly once, else
     exit 1);
   - `git add` those paths and makes a throwaway commit (author `pharn-verify <verify@localhost>`);
   - runs `npm run check` in the worktree and records each gate's exit;
   - runs the HEAD hook and the new hook over the §1 path list × {dev, unsignalled} × {no scope, scope set,
     malformed} and counts stderr differences (§5, expected 0);
   - writes `git diff HEAD~1 HEAD -- .claude/hooks/enforce-writes-scope.cjs .claude/hooks/set-writes-scope.cjs LIMITS.md`
     to `proposed/human-only.patch`, and each file's sha256 (node `crypto`) to `proposed/human-only.sha256`
     as `<hex>  <path>`;
   - in `finally`: `git worktree remove --force` the worktree. Exit non-zero on any red.

   In that worktree `check:reconcile` cannot go red (no baseline; the throwaway commit is the control
   surface's HEAD), so it is not counted as verification of the patch.

6. Delete `.dev/features/writes-scope-run-only/handoff/` and the runner (`rm -r` — declared Bash writes).
7. Write `proposed/apply.sh` (below) and `proposed/APPLY.md` with the Write tool.
8. Record in `BUILD.md`: the runner's gate exits; the probe of every quantified sentence (L37) with its exit
   code; the hook cost (L24); the §5 message-difference count.
9. The floor: `node pharn/floor/validate.mjs .`. The agent commits nothing in the main tree beyond the
   stage's own wip commit.

## Chain sequencing — a designed STOP at verify

0. The phase branch `writes-scope-run-only` exists; `apply.sh` refuses `main`.
1. `/pharn-dev-grill` → `/pharn-dev-build` (procedure above) → the floor.
2. `/pharn-dev-regress` runs **before** the apply, over the outside gates (the new and edited tests are inside
   `## Files`).
3. `/pharn-dev-verify` → **expected `FAIL`** on `test`: the new tests assert the patched guard behaviour
   against the still-unpatched hooks. This is the floor reporting un-applied human-only state, not a defect
   (the `hook-cwd-anchoring` precedent). **The chain STOPS here for the human.**
4. **The human reads `proposed/human-only.patch`, then runs
   `sh .dev/features/writes-scope-run-only/proposed/apply.sh` inside the BUILD stage's worktree** (GATE-1
   amendment, below). That worktree holds the baseline the build anchored, so the checkpoint has the epoch it
   is meant to protect. The orchestrator first fast-forwards that worktree to the phase branch
   (`git merge --ff-only writes-scope-run-only`) so the apply commit lands on top of the chain; the only files
   that merge brings in are the regress and verify stages' own artifacts, which reconcile exempts as the
   active feature's pipeline artifacts. It then advances the phase branch to the apply commit.

   ```sh
   #!/bin/sh
   set -eu
   F=.dev/features/writes-scope-run-only/proposed
   [ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit the guard change on main" >&2; exit 1; }
   node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline
   git apply --check "$F/human-only.patch"
   git apply "$F/human-only.patch"
   if ! { shasum -a 256 -c "$F/human-only.sha256" && node --test .claude/hooks/enforce-writes-scope.test.cjs .claude/hooks/set-writes-scope.test.cjs .claude/hooks/protect-trusted-paths.test.cjs .claude/hooks/hook-wiring.test.cjs .claude/hooks/writes-scope-release.test.cjs pharn/floor/run-marker.test.mjs pharn/floor/check-bash-reconcile.test.mjs pharn/floor/reconcile-baseline.test.mjs; }; then
     git checkout -- .claude/hooks/enforce-writes-scope.cjs .claude/hooks/set-writes-scope.cjs LIMITS.md
     echo "apply.sh: FAILED - the three files were restored from HEAD; nothing was committed" >&2
     exit 1
   fi
   git commit -q -m "feat(hooks): the write guard is fail-closed only while PHARN is working (human-applied)" -- .claude/hooks/enforce-writes-scope.cjs .claude/hooks/set-writes-scope.cjs LIMITS.md
   node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/writes-scope-run-only/PLAN.md
   node pharn/floor/reconcile-baseline.mjs --anchor --by writes-scope-run-only-apply
   echo "apply.sh: applied, tested and committed - resume at /pharn-dev-verify"
   ```

   - **The checkpoint keeps the precedent's `--require-baseline`** (GATE-1 amendment by the orchestrator,
     2026-09-25). The plan as approved had dropped it on the grounds that the stage agents run in separate
     worktrees, each with its own `.pharn/`; running `apply.sh` in the build stage's worktree removes that
     concern, so the build's epoch must reconcile `CLEAN` before the re-anchor, and an absent baseline stops
     the script (`INCONCLUSIVE`) instead of proceeding.
   - **Verify reads a baseline only where one was anchored** — the build's worktree, re-anchored there by this
     script. A verify run in another worktree reads `INCONCLUSIVE` under `--require-baseline`. That is an
     orchestration constraint, stated here; the remedy is never to delete or hand-edit a baseline.
   - Tests run on the applied bytes, with restore-on-failure, so unverified guard bytes never stay live.
   - The path-scoped commit carries the human's authorship and clears the control-surface HEAD comparison.
   - Setter, then anchor (L38) — and the anchor now REQUIRES the scope the setter just wrote (§9).

5. **Resume at `/pharn-dev-verify`** (L17), then `/pharn-dev-review` → GATE 2.

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — amended (§8, §9); no baseline is deleted or hand-edited
  anywhere in this plan.
- `pharn/pharn-contracts/finding-shape.md` — the finding object is unchanged and reconcile findings keep
  their shape; only its emission audit's two sentences about the guard's inputs are corrected (§10, G5).
- No new contract for the run marker (P7): the guard reads only a path and an age, and the writer's header is
  its spec, the `require-loop-record.cjs` precedent.

## Evals and tests to write (P1)

No `role:` capability is added, so no eval pair is owed. The tests:

- **Posture matrix** (`enforce-writes-scope.test.cjs`, one array, L29): posture {dev, unsignalled, install} ×
  state {no scope + no run, no scope + run, scope set, malformed record} × paths {`src/x.js`, `README.md`,
  `.dev/features/x/PLAN.md`, `pharn/features/x/SPEC.md`, `pharn/pharn-review/x.md`, `pharn/floor/x.mjs`,
  `PHARN/Floor/x.mjs`, `.claude/commands/x.md`, `pharn.config.json`, `.pharn/other`, `.pharn/writes-scope.json`,
  an out-of-root path in no git tree, a sibling-worktree path, the root itself} → the exit each table cell
  predicts. Dev and unsignalled rows carry today's expectations unchanged.
- **Markers**: each real writer (`run-marker.mjs --open` for both commands, `require-loop-record.cjs --open`)
  flips the install no-scope verdict for `src/x.js` 0 → 2, and `--close` flips it back; a marker under
  `.pharn/pharn-foo/` is ignored (negative control); a marker as a directory and as a dangling link count; one
  aged 25 h (via `utimesSync`) and one dated 25 h ahead are ignored, one aged 23 h counts; an unreadable state
  directory (`chmod 000`, skipped when the suite runs as root) counts as a run open (grill G14).
- **D1, held permanently** (grill G8): the full stderr of three dev-posture denials, captured from the HEAD
  hook, pinned as exact strings.
- **A guard error denies** (grill G7): a source-shape pin that the decision loop sits inside a `try` whose
  `catch` calls `deny` — presence only, stated as such (§5b).
- **Fold**: `PHARN/Floor/x.mjs` and `.CLAUDE/x` are denied in the permissive posture; `✧ toKey()` byte-equal
  to `protect-trusted-paths.cjs`'s.
- **Deny bodies**: per-branch present/absent over the §5 table, through `everyDenyMessage()`; a marker name
  carrying a newline or shell metacharacters is folded and never rendered inside a command.
- **Malformed**: install + each malformed shape (unparseable, array, `scope` not an array, a directory, a
  dangling link) denies `src/x.js` and `.pharn/other`; dev and unsignalled fall back as today.
- **Anchor**: refuses with no scope and with a malformed one (exit 2, `lstat` proves nothing written); anchors
  with `{"scope": []}`; the no-scope fixtures re-seeded.
- **Reconcile**: legacy no-scope baselines (built with `buildRecord` and written directly) still delegate; ★
  the probe marker flips the real hook (2 with it, 0 without).
- **Writer**: open/close/idempotence, refusals (`pharn-loop`, a bad name, a symlinked component, extra argv),
  the CLI's cwd root exercised by a spawn (L41), `openRun()` rejects a missing `root`.
- **Wiring** (`command-hygiene.test.mjs`): exactly one open and one close line in `pharn-ship.md` and
  `pharn-review.md`, ordered as §3 says (ship: open after the GATE-1 `check-spec-approved.mjs` backstop and
  before `/pharn-plan`'s `stage-start`, close after Step 3a's `run-stop`; review: open after Step 1b's last
  ask point and before Step 3, close in Step 7), no other command invokes `run-marker.mjs`, with
  drop/misplace mutation controls; **executed** from the committed text by `run-marker.test.mjs` (L45).
- **Closure** (`writes-scope-release.test.cjs`): no `pharn-*` (non-dev) command contains "absence of a scope
  file = the fail-closed default-safe-set".
- **Setter**: the `--clear` message pin.

## Guarantee audit (P0)

- "In an installed project with no scope and no open run, `enforce-writes-scope.cjs` denies PHARN's
  installed surface and `.pharn/writes-scope.json`, allows every other in-project path, and allows an
  out-of-project path only in no git tree" → **floor: hook** (primitive #1) over folded path membership (#3);
  probed at build, the excluded members included (grill G4). For `Write|Edit|MultiEdit|NotebookEdit` only —
  Bash is outside both hooks (`LIMITS.md §6`) — and `protect-trusted-paths.cjs` still denies its own set.
- "A guard error denies" → **floor: hook**, for the throws the wrapper catches; pinned by source shape only
  (§5b).
- "While a run is open, the default is today's fail-closed set" → **floor: hook**, given a marker. **That a
  marker exists while a run is running is ADVISORY**: markers are Bash-written command prose (L19).
- "The ship, review and loop commands open and close their markers" → **advisory**; the wiring tests prove
  presence, order and that the committed lines work when executed, never that a run executed them.
- "A crashed run's marker stops holding the guard after 24 h" → **floor: hook** (an age comparison), bounded:
  `touch` extends it.
- "A malformed scope record denies every write in an install" → **floor: hook**.
- "`--anchor` refuses without a scope" → **floor: enum/shape check** (#3) with a fail-closed exit.
- "reconcile's default probe answers with the in-run default" → **floor by delegation** (it executes the real
  hook), pinned by the ★ parity test; its reach is bounded by L42 (legacy and no-baseline paths only).
- "The dev posture is unchanged byte-for-byte" → **tested** (the matrix rows and three golden messages) and
  **measured once** over the wider list (§5); not a floor guarantee beyond those cases. The one deliberate
  dev-posture change is on an error path: a crash now denies (§5b).
- "Tree-wide markers" → a design property of the hook's read, stated with its L38 cost.

## Trust audit (P2)

- **Marker directory entries** are untrusted (a Bash-writable directory). They are used only as `lstat`
  path segments and echoed through `asData()`; a name failing the slug grammar is never rendered inside a
  suggested command. Marker CONTENT is never read by the guard.
- **The scope record**: a malformed one now denies instead of falling back (install); nothing from it is
  echoed.
- **`pharn.config.json` `skillsVersion`** remains the posture signal, and **the direction of an accidental
  flip reverses in this increment** (grill G11). Today, adding `skillsVersion` to this dev repo's config
  makes the guard STRICTER, and a contributor notices at once. After it, the same edit makes the dev repo an
  install, which is PERMISSIVE outside a run — and the dev commands open no run markers — so the guard
  loosens silently. No checker reads `skillsVersion` in this repo's config (checked: neither
  `check-config.mjs` nor `check-model-config.mjs` does). The Write tool reaches the file only through a scope
  that names it, a Bash write reaches it anyway, and reconcile sees it (a tracked file). Recorded as follow-up
  `dev-posture-pin` (below), not built (P7).
- **Closing a run marker grants nothing Bash does not already grant.** The deny message offers the close
  command for a stale run; an injected instruction could name it too. It is a Bash call, and an actor holding
  Bash can already write any path directly (`LIMITS.md §6`), so the remedy adds no power. The message says
  never to close a run you are executing, and prints each marker's age so the reader can tell stale from live.
- **Hard links**: a hard link into the reserved surface is not resolved by `realpath`, so the permissive
  posture judges it by its own name. Creating one needs Bash. A bound.

## Determinism audit (P5)

Every branch is a membership test: posture signals (a JSON field, a directory stat), `lstat` presence, an
integer age comparison, a folded-prefix test, and the existing glob and root-relativity tests. No model
decides a verdict; the deny message is composed by code from values the caller computed. Where the guard
cannot tell (a scan error, a torn record), it fails closed.

## Named follow-ups (recorded, not built — P7)

- `reconcile-escape-attribution-wording` — reconcile's finding says "outside the guarded tool surface", an
  attribution it cannot make; now reachable by an ordinary Write-tool edit made outside a run (§8).
- `stale-scope-expiry` — a leftover scope record still never expires (unchanged; the deny message names
  `--clear`). Only markers gained a ceiling.
- `run-marker-open-failure` — `--open` failing is advisory in all three commands; whether a run should STOP
  when it cannot mark itself open is left for a real failure.
- `dev-posture-pin` (grill G11) — a one-assertion test that this repository's own tree computes the dev
  posture (no `skillsVersion` in its `pharn.config.json`, `.dev/floor/` present), so an accidental flip to the
  now-permissive install posture fails CI. Not built: no observed failure (P7).
- `reconcile-import-crash-label` (grill G13) — `check-bash-reconcile.mjs` gains a second static import
  (`run-marker.mjs`); a module that cannot load makes node exit 1, which is the checker's `ESCAPE` code. That
  fails the stage in the safe direction but names the wrong cause — the class `check-loop-fresh.mjs` closed in
  6.21.1 with a dynamic import. Not changed here (the existing `reconcile-baseline.mjs` import already has it).

## GATE 1 record

**APPROVED on 2026-09-25 by the orchestrator** — a model decision made under the maintainer's 2026-09-25
delegation ("Deliver all things … when all check green merge pull request"), **not a human approval**. The four
"Decisions for GATE 1" were accepted as written. One amendment was made at the gate: `apply.sh` keeps
`--require-baseline`, and the human runs it inside the build stage's worktree (Chain sequencing, step 4).
`/pharn-dev-grill` then amended this plan in place for the findings recorded in `GRILL.md`: G1–G9, G11, G12
and G14 amended, G10 a sharpened classification, G13 a named follow-up. Each changed line names its finding.

## Open questions (HALT)

- none.

## Amended at GATE 2 (2026-09-26)

`/pharn-dev-review` (`REVIEW.md`, commit `a154214`) returned `blocked-with-1-floor-finding` plus 2 important
and 8 minor findings. GATE 2 = **FIX** (orchestrator decision under the maintainer's 2026-09-25 delegation —
not a human approval; the human still has not applied `proposed/human-only.patch`, held so review could run
first). This section is a MAINTAINER DECISION given in chat 2026-09-26, recorded verbatim, that resolves
REVIEW.md's first important finding (P2, `human-only.patch:616`, "every out-of-project no-git-tree path" — the
permissive breadth GRILL.md:152 names as **D2**, "the relaxation itself is D2, the maintainer's decision"; the
coordinator's relay also cites **D5**, which is not independently labeled by that name anywhere in this
PLAN/GRILL — recorded as such rather than guessed at, P6):

> Installed project, no scope, no run open: outside the project, the guard ALLOWS only (1) Claude's memory
> folders, `<claude-config-dir>/projects/*/memory/**`, where claude-config-dir is `$CLAUDE_CONFIG_DIR` when
> set, else `~/.claude`, both realpath'd; and (2) the temp/scratch roots: realpath(os.tmpdir()) and
> realpath('/tmp'). Every other out-of-root path stays DENIED, exactly as today, with the out-of-root body.
> That includes dotfiles, `~/.ssh`, `~/.claude/settings*.json`, `~/.claude.json`, `~/.claude/hooks/` and
> LaunchAgents. A path inside another git tree stays denied even under those roots. Update the deny message,
> LIMITS §7 in the patch, and CLAUDE.md to match.

This REPLACES Design §1's install-row clause "out-of-root allowed unless inside another git tree" and the
`### 7. Subpath install (D7c)`-adjacent LIMITS draft bullet's "allows a path that lies in no git tree, such as
Claude Code's own memory folder" with the two-root allow-list above. The out-of-root branch of `denyMessage()`
(Design §5) is reworded to name the two roots instead of "no git tree"; `openWithout` (ctx) now means
"under one of the two allowed roots and not inside another git tree", never merely "outside every git tree".

### Review fixes (all required before re-verify)

- **B1 (blocking, patch:703)** — `resolveWriteTarget()`'s lexical fallback let a **dangling** symlink whose
  final component cannot be `realpath`'d (`ENOENT`) fall back to its own unresolved name instead of resolving
  through its link target. Fixed by porting `protect-trusted-paths.cjs`'s segment-wise `readlinkSync`
  resolution (resolve every existing leading segment with `realpathSync`, then apply `readlinkSync` to the
  final dangling component and re-join, repeating for a chained dangling link) into the patched
  `enforce-writes-scope.cjs`, so `src/evil-cmd -> ../.claude/commands/pharn-evil.md` (absent) and
  `src/evil-floor -> ../pharn/floor/new.mjs` both resolve to their reserved targets and are DENIED.
- **B2 (blocking, patch:703)** — the `pharn/features/` exception was tested against the folded key, so
  `pharn/features./x.md` and `"pharn/features /x.md"` folded to `pharn/features/x.md` and were wrongly
  exempted. Fixed by testing the exception on the **raw** relative path: reserved iff
  `key === "pharn.config.json" || key.startsWith(".claude/") || (key.startsWith("pharn/") &&
!rel.startsWith("pharn/features/"))` — the fold can now only ever WIDEN the deny, never narrow it.
- **S1 (important, patch:266)** — `scanRuns()` read `ENOTDIR` (a *file* planted at a run-state path) the same
  as `ENOENT` ("no run"), and `openRun()`'s unguarded `mkdirSync`/`writeFileSync` threw uncaught on the same
  planted file, crashing `run-marker.mjs --open` with exit 1 (Claude Code treats a non-zero non-2 hook exit as
  non-blocking) and a raw stack trace. Fixed three ways: (1) `scanRuns()` folds `ENOTDIR` into the
  `scanError = true` ("open") branch in both its `readdirSync(stateDir)` and `lstatSync(markerAbs)` catches,
  alongside every error that is not `ENOENT`; (2) `openRun()`/`closeRun()` wrap their filesystem calls in
  `try/catch` and return `{ok:false, reason}` instead of throwing, so the CLI's existing `!result.ok -> exit 2`
  path is reached instead of an uncaught throw; (3) `.claude/commands/pharn-ship.md` and `pharn-review.md` are
  edited so a non-zero exit from `run-marker.mjs --open` is an explicit STOP, not a continue.
- **Minor 1 (D1 message parity, P0)** — `readScopeFileState()` returned a bare `{kind:"malformed"}` for a
  parseable object lacking a valid `scope` array, dropping `set_by`/`set_at`, so the composed message lost
  the "scope set by / stale" bullets HEAD's `loadRecord()`-based message keeps for that exact shape. Fixed:
  return `{kind:"malformed", record: parsed}` and thread `record` into the `!install` (dev/unsignalled)
  message path; a `{}` case is pinned as a golden message.
- **Minor 2 (in-repo wording, P0)** — the in-repo deny body's "absence of a scope file = the fail-closed
  default-safe-set" sentence is now false in the install posture outside a run. Fixed: the sentence is
  conditional on `ctx.install`, mirroring the out-of-root branch's existing `openWithout` handling.
- **Minor 3 (dangling reference, P0)** — the out-of-root body's "(see below)" pointed at nothing after the
  wording pass. Fixed: replaced with the actual two-root sentence inline, no forward reference.
- **Minor 4 (doc overclaims, P1)** — `README.md:697`, `pharn/floor/README.md:135` and
  `pharn/pharn-contracts/finding-shape.md:93` each overstated the guard's reach (pre-existing text, sharpened
  wording only where this increment already touches these files per `## Files`); corrected to the exact
  posture/branch language used above.
- **Minor 5 (pharn-loop.md:998, P1)** — cited the wrong fallback set and a nonexistent "§2 above"; corrected
  to name the actual fail-closed default (`pharn/features/**` + `.pharn/**` writable) and point at this PLAN's
  Design §2 rather than a section `pharn-loop.md` does not itself contain.
- **Minor 6 (guard-error test, P2)** — added a behavioural test that forces the patched hook's decision loop
  to throw (a preloaded module that makes a call inside the `try` throw) and asserts exit 2 with the fixed
  fail-closed message, not just the source-shape presence pin Design §5b already had.
- **Minor 7 (marker-name injection, P0)** — `runCloseSuggestion()` embedded `run.path`, which contains the raw
  untrusted marker directory name, in the RUN block's suggested remedy line, reachable even though that name
  fails the slug grammar (the "NOTE: … never instructions" framing sits above the RUN block and does not, by
  construction, relabel text rendered below it as data). Fixed: for a name failing `RUN_NAME_RE`, the line
  never interpolates `run.name` or `run.path` at all — it renders only the state directory and a count of
  such entries ("remove that file by hand"), so the untrusted string is never emitted, not merely folded.
- **Minor 8 (reconcile probe, P5)** — `makeDefaultProbeSandbox()` called `run-marker.mjs`'s `openRun()` without
  checking its result; fixed to throw if `{ok:false}`, so a future regression in the writer fails the probe's
  setup loudly instead of silently answering with the permissive (no-marker) default.
- **Minor 9 (VERIFY.md counts, P6)** — `VERIFY.md:25` quoted stale first-pass numbers
  ("118/120, 25/29, 52/53 and 45/46") that contradicted `BUILD.md`'s recorded final counts (120/120, 29/29,
  53/53, 46/46 — all green against the patched hooks). Corrected on the GATE-2 re-verify pass to match
  `BUILD.md`.

All nine minor items plus B1/B2/S1 are implemented in the `handoff/` copies before `proposed/human-only.patch`
and `proposed/human-only.sha256` are regenerated by a re-run of the verification runner (Build procedure step
5), never by editing the live hooks or `LIMITS.md` directly.
