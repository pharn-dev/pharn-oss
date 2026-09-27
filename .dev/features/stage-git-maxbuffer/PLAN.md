# PLAN — stage-git-maxbuffer

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L6, L20, L25, L29, L34, L36, L37, L40, L41, L49, L52, L60, L62, L64]
- increment: The stage scripts' shared git helper (`gitSync`) and the one other product-floor git listing call that
  ran at node's 1 MiB default (`render-review-assignments.mjs`'s merge-base diff) get an explicit 256 MiB output
  ceiling, and every `git-failed` detail says why git failed instead of ending in an empty string.
- layer(s): product floor (`pharn/floor/`: `stage-runtime.mjs`, `stage-regress.mjs`, `stage-verify.mjs`,
  `scope-inputs.mjs`, `quick-scope-core.mjs`, `render-review-assignments.mjs`), floor tests (five edited, none new),
  repo meta (`CHANGELOG.md`, `SKILLS_VERSION`, the README badge).
- constitution_refs: [P0, P5, P6, P7]

## The finding, verified live (P6), and the trigger (P7)

The increment answers finding H1 of a read-only review of the last three days' merges, quoted to this run as DATA
(P2). Every claim in it was re-checked against the live tree (`main` at `70cb51c`, `SKILLS_VERSION` 6.28.2), and
each held:

- `pharn/floor/stage-runtime.mjs:174-180` — `gitSync` runs `execFileSync("git", args, { encoding: "utf8", stdio:
["ignore", "pipe", "pipe"] })`, so node's default `maxBuffer` (1,048,576 bytes) applies to both streams.
- Whole-repo listings go through it: `stage-regress.mjs:446` (`ls-files -z --cached --others --exclude-standard`, the
  test universe), `:452` (`ls-files -z`, the eval pairs), `:442` (the `--tests` pathspec listing), `:389`
  (`status --porcelain`); `stage-verify.mjs:248` (`phasePairs`); `scope-inputs.mjs:66-68` (the changed and untracked
  lists, read by `/pharn-regress`'s partition phase and by `check-quick-scope.mjs`, which `/pharn-ship --quick` and
  `/pharn-loop --quick` run).
- Past the default, node reports `ENOBUFS` with an empty stderr. Measured in this run (`.pharn/` scratch, not
  committed): the error carries `code: "ENOBUFS"` and `stderr: ""` (and, in the run measured, `status: 0`); a git that
  exits non-zero carries no `code` at all; a git that cannot be found carries `code: "ENOENT"`.
- **Reproduced on the live pre-fix floor**, over a fixture listing 1,709 paths of 766 bytes (1,310,803 bytes, NUL
  separators included). Each detail below ends at the colon — nothing follows it:
  - `stage-verify.mjs`, the tree committed: exit 2 `unusable git-failed`, detail
    `git ls-files -z --cached --others --exclude-standard failed:`;
  - `stage-regress.mjs`, the tree committed: exit 2 `unusable git-failed`, detail `git ls-files failed:` — the
    review's exact string;
  - `check-quick-scope.mjs`, the tree untracked: exit 2 `inconclusive git-failed`, detail
    `git ls-files -z --others --exclude-standard failed:`;
  - `render-review-assignments.mjs`'s `resolveTarget`, the tree staged: `0` of 1,710 changed paths, so the emitter
    refuses with "no resolvable review target (… the git merge-base diff yielded nothing)".

  So `/pharn-ship`, `/pharn-loop` and both `--quick` modes cannot finish on such a repo, and the stop names no cause.
  The review measured the same at 17,506 tracked files (1.42 MB) and 20,000 (1.75 MB); this repo's own listing is
  122,788 bytes for 2,450 tracked files (measured this run), which is why its own pipeline never met the limit.

**Trigger (P7):** a reproduced availability failure on the shipped floor, found by review, not a hypothetical.

## The sweep: every git spawn in a shipped `pharn/floor/` module (L29, L49)

Found by a `git grep -E` over the non-test modules for a `child_process` call (`execFileSync`, `spawnSync`,
`execSync`, `execFile`, `spawn`, `exec`) whose first argument is the string `git`, then read one by one. Nine spawns;
`scan-code-injection.mjs:83` spells `execFile("git", [arg])` inside a COMMENT and is not one.

| #   | site                                        | argv                                                              | output grows with                 | ceiling today       | after                         |
| --- | ------------------------------------------- | ----------------------------------------------------------------- | --------------------------------- | ------------------- | ----------------------------- |
| 1   | `stage-runtime.mjs:176` (`gitSync`)         | its callers' (below)                                              | the repo, for its listing callers | node default, 1 MiB | **`GIT_MAX_BUFFER`, 256 MiB** |
| 2   | `reconcile-baseline.mjs:89` (`enumerate()`) | `ls-files -z --cached --others --exclude-standard`                | the repo                          | `1 << 28` (256 MiB) | unchanged                     |
| 3   | `check-bash-reconcile.mjs:385`              | `diff --name-only HEAD --`                                        | the working-tree diff             | `1 << 26` (64 MiB)  | unchanged                     |
| 4   | `render-run-report.mjs:292` (`git()`)       | `diff --name-only <base>`; `ls-files --others --exclude-standard` | the diff / untracked set          | 64 MiB              | unchanged                     |
| 5   | `render-review-assignments.mjs:121`         | `merge-base HEAD origin/main`                                     | nothing (one SHA)                 | node default        | unchanged                     |
| 6   | `render-review-assignments.mjs:128`         | `rev-parse HEAD`                                                  | nothing (one SHA)                 | node default        | unchanged                     |
| 7   | `render-review-assignments.mjs:138`         | `diff --name-only --diff-filter=ACMR <base>`                      | the merge-base diff               | node default, 1 MiB | **`1 << 28`** (Q1)            |
| 8   | `render-ship-briefing.mjs:327`              | `rev-parse HEAD`                                                  | nothing (one SHA)                 | node default        | unchanged                     |
| 9   | `run-gates.mjs:576`                         | `rev-parse HEAD`                                                  | nothing (one SHA)                 | node default        | unchanged                     |

`gitSync`'s callers, all covered by the one change at row 1: `stage-regress.mjs` — `worktree remove`/`prune` (`:192`,
`:194`, `:784`, `:787`), `rev-parse --verify` (`:383`), `status --porcelain` (`:389`), `merge-base`/`rev-parse HEAD`
(`:396`, `:401`), the three `ls-files` listings (`:442`, `:446`, `:452`), `cat-file -e` (`:532`), `worktree add`
(`:670`); `stage-verify.mjs:248` (`ls-files`); `scope-inputs.mjs:66,68` (`diff --name-only`, `ls-files --others`);
`quick-scope-core.mjs:104` (`rev-parse --verify`). The ceiling applies to stderr too, which matters for a listing git
pads with one warning per file (a line-ending conversion warning, say).

**Coverage boundary of this sweep, stated (L49):** it finds a spawn spelled `<fn>("git"` (or `'git'`, `` `git ``).
A git run through a variable command name, a shell string, `node:child_process` reached any other way, or a wrapper
script is outside both this sweep and the closure test that holds it (below). The dev floor (`.dev/floor/`) is out of
scope: its one git spawn, `check-changelog-entry.mjs:301`, already carries a 64 MiB `MAX_BUFFER`.

## Design

### A. The ceiling — `pharn/floor/stage-runtime.mjs`

- `const GIT_MAX_BUFFER = 1 << 28;` (module-private: nothing imports it — GRILL G4) — 256 MiB, the ceiling
  `enumerate()` already uses for the reconcile and
  fingerprint walks (`reconcile-baseline.mjs:91`). A ceiling, not an allocation: 20 `git --version` calls at this
  ceiling left the process at 43 MiB RSS against 45 MiB before them (measured this run). The comment at the constant
  says why it exists and what happens past it, written from this run's measurements (L37, L64).
- `gitSync` passes `maxBuffer: GIT_MAX_BUFFER` on EVERY call. One option on the one owner covers every stage-script
  git call at once; per-call ceilings would be a second decision per call site with nothing to gain (a small output
  never approaches the ceiling, and the ceiling itself costs no memory, as measured above).

### B. The detail — `gitFailureDetail(e)` in `stage-runtime.mjs`, carried on `gitSync`'s failure result

`gitSync`'s failure result gains `detail: gitFailureDetail(e)` beside its existing `error` and `stderr` (kept: the
regress cleanup phase reads `stderr`). The text, from structured fields only — `e.code`, `e.status`, `e.signal`,
`e.stderr`, never parsed out of `e.message` (L6):

- git printed something on stderr → `<stderr, trimmed> (<how>)`; otherwise → `<how>`;
- `<how>` is, first match wins: `node error ENOBUFS: git's output exceeded the read buffer` (node set `code`
  `ENOBUFS`); `node error <code>` (any other `code` — `ENOENT` when git cannot be started); `git exited <n>` (an
  integer status); `git was killed by <signal>`; else `git failed with no exit status, signal or error code`.
- TOTAL (L62): the body reads each field only after a `typeof` test and runs inside a `try`, whose fallback is the
  fixed `git failed (its error could not be read)` — so an accessor that throws, a Proxy, or a hostile parsed-JSON
  shape yields text, never a throw.

Each of the ten `git-failed` emissions reads `.detail` where it read `.stderr` (the enumeration, L29):
`stage-regress.mjs:390` (status), `:402` (rev-parse HEAD — `: <detail>` appended only when git itself failed, not when
it printed a non-SHA), `:429`/`:431` (through `scope-inputs.mjs`), `:443`, `:447`, `:453` (the three listings),
`:672` (worktree add); `stage-verify.mjs:250` (still through `dataText`); `quick-scope-core.mjs:125` (was
`changed.stderr.trim()`). `scope-inputs.mjs`'s `changedPaths` failure becomes `{ok: false, which, detail}` — its
`stderr` field is read by nobody once both callers read `detail`, so it is replaced rather than kept beside it. The
regress cleanup's rendered error (`:788`, `r.stderr || "git worktree remove failed"`) is not a `git-failed` emission,
is never empty, and is unchanged.

**A visible change, disclosed:** a `git-failed` detail for a git that exited non-zero with a message now reads
`fatal: … (git exited 128)` where it read `fatal: …\n`. No consumer parses a `detail` (`stage-exit.md`: free text,
presented as quoted DATA by the thin commands); no test pins the old text (`git grep` over the suites, this run).

### C. The review emitter — `pharn/floor/render-review-assignments.mjs` (Q1)

`gitDiffTarget`'s `git diff --name-only --diff-filter=ACMR <base>` gains `maxBuffer: 1 << 28`, a literal with a
comment. Its catch still returns `[]` for a git that fails — the documented "not a git repo / bad base" branch — so
past 256 MiB it would still read as an empty diff; that is stated at the call. The literal is NOT imported from
`stage-runtime.mjs`: that module is the stage scripts' mechanics (P3), importing it would put `stage-runtime.mjs` and
`stage-exit-core.mjs` into the review emitter's and `check-review-assignments.mjs`'s load graphs for one number, and
the three 256 MiB values (rows 1, 2 and 7) are each call's own ceiling, not one fact bound across modules (L35
considered: nothing requires them equal, and the closure test holds presence, not value).

### D. The closure — `pharn/floor/stage-runtime.test.mjs` ★ GIT CEILING (L20, L25, L36)

The discipline "a git listing call carries an explicit `maxBuffer`" was followed at rows 2, 3 and 4 and in the dev
floor, and missed at rows 1 and 7 — two independent modules, so by L20's rule it earns a check rather than a comment
(a comment at `GIT_MAX_BUFFER` reaches only its own file, L25). The test scans every non-test `pharn/floor/*.mjs`, skips comment lines, extracts
each git spawn's full call text (balanced parentheses, string literals skipped), and asserts:

1. **the enumeration** (L29, L34): the spawns found equal the table above as a `{file: [subcommand | null]}` map — a
   new spawn, or a removed one, fails until the table is updated in the same diff;
2. **the rule, closed over the corpus** (L36): every spawn whose first literal subcommand is not in the closed set
   `{rev-parse, merge-base}` (one SHA each) carries `maxBuffer` in its call text — a variable argv (`gitSync`,
   `render-run-report.mjs`'s `git()`) counts as a listing;
3. **negative controls, one per property (L60):** `gitSync`'s source with its `maxBuffer` option removed is flagged;
   row 7 with its option removed is flagged; synthetic sources — `execFileSync("git", ["ls-files"], { cwd })` flagged,
   `spawnSync("git", ["rev-parse", "HEAD"])` exempt, a call whose argv holds a `")"` string extracted whole, a comment
   line spelling `execFile("git", [x])` not counted.

**Bound (P0):** it holds the PRESENCE of a `maxBuffer`, never its magnitude (a `maxBuffer: 1024` passes it — the
behavioural tests below pin `gitSync`'s real ceiling past 1 MiB), and only for the spelling the sweep names.

A second static closure in the same file holds the detail sites: every call in `stage-regress.mjs`,
`stage-verify.mjs` and `quick-scope-core.mjs` carrying the literal `"git-failed"` reads `.detail` and never
`.stderr`; counted 8 / 1 / 1 (L34); control: one `.detail` swapped back to `.stderr` is flagged.

### E. The behavioural tests — a listing that really crosses 1 MiB (L41, L52)

The finding is L41's shape exactly: a limit every fixture was too small to reach, so only production met it. Each
test below builds a real git repo whose listing is past 1 MiB and runs the REAL code — never an injected smaller
buffer, which would test the injection. The set the tests range over is named (L52): the shared helper, and every
entry that reads a whole listing through it or beside it — `stage-verify.mjs`, `stage-regress.mjs`,
`check-quick-scope.mjs` (through both committed command lines), and `render-review-assignments.mjs`. One test each.

The fixture: empty files under `big/<250×a>/<250×b>/<250×c>/NNNNN.txt` — 766-byte paths, so ~1,709 files list
~1.31 MB (bytes are what `maxBuffer` counts, not files), and the absolute path stays ~860 bytes, under darwin's
1,024-byte `PATH_MAX` even inside regress's base worktree. Measured this run: creating it and one listing ~0.25 s,
`git add` + commit ~0.2 s, a worktree checkout ~0.3 s. Each suite carries its own ~10-line builder, as every suite in
this floor builds its own fixture (no shared test module exists, and a shared non-test module would ship).

Each test carries two controls (L40, L60): an ANCHOR asserting the exact call the pre-fix code made, run at node's
default buffer over the same fixture, throws `ENOBUFS` — so the fixture really crosses the limit and the buffer is
the cause (the attributed condition varied, the fixture held); and, for the three stage entries, a MUTANT
`stage-runtime.mjs` with only the `maxBuffer` option removed, run over the same fixture, which must stop
`git-failed` with `ENOBUFS` in its detail — the old failure, now named (this is also the live ENOBUFS test of B).

1. `stage-runtime.test.mjs` — `gitSync(["ls-files", "-z", "--others", "--exclude-standard"])` over an untracked big
   tree returns every path, byte for byte; the anchor call at the default buffer is `ENOBUFS`. `gitFailureDetail`:
   live `ENOENT` (PATH without git) → `node error ENOENT` while that call's `stderr` is `""` (the old detail source,
   empty — the control); live non-zero exits with and without a message; synthetic `ENOBUFS` and signal; totality
   over `undefined`, `null`, a number, a string, `{"toString":1}` in each field, a non-integer status, a null-prototype
   object and a Proxy that throws on read (control: it does throw). `gitFailureDetail` joins the ★ ONE OWNER list.
2. `stage-verify.test.mjs` — the fixture helper's `committed` map carries the big tree; the anchor; the mutant (the
   closure copied OUTSIDE the fixture, so the committed floor and the reconcile anchor are untouched) → exit 2
   `git-failed` naming `ENOBUFS`; then the real script → `done`, verdict `PASS`.
3. `stage-regress.test.mjs` — `repo()` gains a `committed` option (files written before the base commit); the
   declared change; the anchor over the test-universe listing; the mutant (the fixture-regex closure copied outside)
   → exit 2, detail starting `git ls-files failed: node error ENOBUFS`; the real script → `done`, `no-regressions`.
4. `check-quick-scope.test.mjs` — an untracked big tree declared as `big/**`, both committed command lines run under
   `sh -c` (L45's form) → exit 0 `clean`, `inside` holding every path (the test's own spawn raises ITS buffer, since
   the document echoes all of them); the anchor; the mutant floor copy (`makeRepo({copy: true})`, `breakFloor`) →
   exit 2 `git-failed` naming `ENOBUFS`.
5. `render-review-assignments.test.mjs` — a big tree staged over a seed commit (no `origin`, so the base is `HEAD`):
   `resolveTarget(dir, [])` returns every path; the anchor is the pre-fix call verbatim, its options included (stderr
   ignored, no `maxBuffer`) → `ENOBUFS`.

## Applied lessons

- L6 — `gitFailureDetail` reads node's `code`, `status` and `signal` from the error's structured fields; it never
  pattern-matches `e.message` (`spawnSync git ENOBUFS`), which is prose.
- L20 — no promoted lesson names this discipline, so this is the escalation rule by analogy: the omission of an
  explicit `maxBuffer` appears in two independent modules (rows 1 and 7) while the three other product-floor listing
  calls and the dev floor's one carry one, so the remedy is a closure test (D), not a comment.
- L25 — the rationale at `GIT_MAX_BUFFER` reaches only `stage-runtime.mjs`; the ★ GIT CEILING closure is what carries
  it to every other floor module.
- L29 — the remedy is quantified over two sets, and both are materialized: the nine git spawns (the sweep table, and
  the closure's pinned map) and the ten `git-failed` emissions (B, and the detail closure's counts).
- L34 — both closures assert their domains' counts (9 spawns; 8 / 1 / 1 detail sites), so an empty or shrunken scan
  fails rather than passing vacuously.
- L36 — the maxBuffer rule is closed over the corpus: every spawn the scan finds is judged, so a new one is covered
  the day it lands; the pinned map is the enumeration beside it, not the rule's domain.
- L37 — the adjacent residual (below) is stated from a probe, not read off the code: this run executed the regress
  script over a changed set past 1 MiB with the ceiling raised in a scratch copy and recorded where it stopped.
- L40 — the attribution "the stop is caused by the 1 MiB buffer" is tested by varying the buffer over a fixed fixture:
  the anchor call at the default is `ENOBUFS`, the same call through `gitSync` succeeds.
- L41 — the defect is L41's blind spot (a limit no hermetic fixture reached); every new test builds a listing past
  1 MiB and runs the production code path, with no injected buffer anywhere.
- L49 — the sweep's coverage boundary is stated in its own section: the spelling it finds, and what it cannot see.
- L52 — the "write a test that crosses 1 MiB" remedy is quantified over entries; the set is named in E (helper,
  verify, regress, quick scope, review emitter) with one crossing test per member.
- L60 — every asserted property names its falsifier and runs it: the anchor and the mutant per stage test, the
  mutation controls per closure property, the throwing Proxy for totality, the empty `stderr` for "the detail used to
  be empty".
- L62 — `gitFailureDetail` is total: typeof-gated reads inside a `try` with a fixed fallback, tested with
  `{"toString":1}` shapes and a throwing Proxy.
- L64 — the bound sentences restated in the CHANGELOG entry and the module comments are written from this run's
  measurements and re-probed before hand-off (the grill and the build each grep the diff for "1 MiB", "256 MiB",
  "every", "any" and "never" and re-check each hit against a test or a measurement).

## Files

- `pharn/floor/stage-runtime.mjs` — product floor. `GIT_MAX_BUFFER`, `gitSync`'s `maxBuffer` and `detail`, the
  exported `gitFailureDetail`, and the "git helpers" comment block (why the ceiling, what happens past it).
- `pharn/floor/stage-regress.mjs` — product floor. The eight `git-failed` details read `.detail`; the comment above
  `assertRepresentable`, where the existing follow-up `regress-inside-echo-list` is described, gains this run's probe
  of the same echo's argv-size limit (Q3).
- `pharn/floor/stage-verify.mjs` — product floor. `phasePairs`'s `git-failed` detail reads `.detail`.
- `pharn/floor/scope-inputs.mjs` — product floor. `changedPaths`'s failure is `{ok: false, which, detail}`; the
  header's return shape follows.
- `pharn/floor/quick-scope-core.mjs` — product floor. The `git-failed` reason reads `changed.detail`.
- `pharn/floor/render-review-assignments.mjs` — product floor. `gitDiffTarget`'s diff gains `maxBuffer: 1 << 28` and
  its comment (Q1).
- `pharn/floor/stage-runtime.test.mjs` — floor test (does not ship). E.1, the two closures (D), `gitFailureDetail` in
  ★ ONE OWNER.
- `pharn/floor/stage-verify.test.mjs` — floor test. E.2.
- `pharn/floor/stage-regress.test.mjs` — floor test. E.3, and `repo()`'s new `committed` option.
- `pharn/floor/check-quick-scope.test.mjs` — floor test. E.4.
- `pharn/floor/render-review-assignments.test.mjs` — floor test. E.5.
- `CHANGELOG.md` — repo meta. A new `## [6.28.3] - 2026-09-27` section (`### Fixed`) directly above `[6.28.2]`;
  `[Unreleased]` is empty today, so nothing moves.
- `SKILLS_VERSION` — repo meta. 6.28.2 → 6.28.3.
- `README.md` — repo meta. The shields badge 6.28.2 → 6.28.3 (`check:badge`). The generated `CURRENT-STATE` block does
  not move: no non-test module is added (its "100 `.mjs` files" count stays).
- `.dev/features/stage-git-maxbuffer/BUILD.md` — dev apparatus. The build note: each mutant and anchor and the output
  it produced, the suite time before and after, and the residual probe.

### Not touched

- `pharn/floor/reconcile-baseline.mjs`, `check-bash-reconcile.mjs`, `render-run-report.mjs` — each already passes an
  explicit ceiling (256 / 64 / 64 MiB); unifying the values is not this finding.
- `pharn/floor/run-gates.mjs`, `render-ship-briefing.mjs`, and rows 5 and 6 in the review emitter — each prints one
  SHA.
- `pharn/pharn-contracts/stage-exit.md` — `detail` is a non-empty free-text string there, and stays one.
- `.claude/commands/*` — the thin commands present `detail` as quoted DATA; nothing they pin changes.
- The four trusted docs, `CODEOWNERS`, `.claude/settings*.json`, the hook scripts — no human-only file is needed.
- `MIN_CLI` — stays 0.5.0: no installed path moves and no contract or frontmatter changes.

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — unchanged; every emission still validates (`validateStageExit`), the tests
  run each exit through it. The `git-failed` reason code, its status and its exit code are unchanged.

## Evals to write (P1)

- None — P1 binds Capabilities and `rule_id`s, and this increment touches neither. The floor tests in E and D are the
  regression suite for the change.

## Guarantee audit (P0)

- "`gitSync` returns git output past 1 MiB" → tested behaviour (E.1, E.2-E.4 through the scripts), not a floor
  primitive; bounded: measured at 1,310,803 bytes, never at the 256 MiB ceiling, which no test reaches.
- "`/pharn-verify`, `/pharn-regress` and the quick scope check complete over a listing past 1 MiB" → tested behaviour,
  bounded to a big listing with a SMALL changed set: a changed set whose names pass the argv limit still stops regress
  at its verdict phase (the `regress-inside-echo-list` follow-up, below). STRUCK: "regress now works on any repo" —
  the claim is a big repo with a modest change.
- "a `git-failed` detail names why git failed" → tested behaviour (the mutant's live `ENOBUFS`, the live `ENOENT`
  and exit cases, the detail closure); the detail is free text that no machine reads, so it is diagnosis, never a
  verdict input.
- "every git spawn in a shipped floor module that can print a listing carries an explicit ceiling" → floor:
  enum-regex, held by the ★ GIT CEILING closure, a static test in `npm test` (so in `npm run check` and CI); bounded
  to the spelling `<fn>("git"`, to the PRESENCE of a `maxBuffer` (not its size), and to the subcommand exemption
  `{rev-parse, merge-base}`.
- "past 256 MiB the stop is diagnosable" → tested only through the mutant at 1 MiB (same code path, smaller buffer);
  the 256 MiB case itself is not produced by the suite.

## Trust audit (P2)

- git's stderr (file names a contributor chose) already flowed into `git-failed` details; it still does, trimmed, now
  followed by fixed text and node's own error code. `stage-verify.mjs` keeps quoting through `dataText`; the thin
  commands keep presenting `detail` as quoted DATA; no proceed/stop reads a `detail`. Nothing new is ingested.

## Determinism audit (P5)

- `gitFailureDetail` branches only on `typeof` and integer tests over node's structured fields. The closures are
  regex/membership scans with pinned counts. No judgment enters a branch.

## Named, not built

- **`regress-inside-echo-list`, extended (Q3).** The existing follow-up names the verdict call's `--inside` echo
  (ADVISORY, read by no floor op) as a comma list that refuses a comma or newline changed path. The same echo also
  has a SIZE limit, probed this run (L37): with `gitSync`'s ceiling raised in a scratch copy, a regress run over an
  UNTRACKED tree listing 1,310,803 bytes passed its partition and head gates, then stopped at "verdict" as exit 2
  `unusable child-crashed`, detail `check-regress.mjs verdict crashed (status null):`. The echo is ONE argv element
  (`stage-regress.mjs:758-759`), and a single 1,100,000-byte argument fails `E2BIG` on darwin (measured; `getconf
ARG_MAX` 1,048,576, argv and environment together). Linux caps one argument at 131,072 bytes (`MAX_ARG_STRLEN`, the
  kernel's documented constant — NOT measured here), which would put that stop at roughly 128 KiB of changed names.
  Pre-existing and independent of the buffer (a smaller buffer only stopped such a run earlier). **One follow-up, not
  two:** the remedy that follow-up already names — an array-safe verdict input in place of the argv list — removes
  both the comma grammar and the size limit, so the extension is recorded under its name (the comment above
  `assertRepresentable` and the CHANGELOG entry) rather than as a new one.
- The regress `test` gate hands its outside test files to the runner as argv, so a repo with enough test files meets
  an argv limit at the head gate too — unmeasured, a different spawn and a different remedy, so it is noted in
  `BUILD.md` for the maintainer rather than filed under that follow-up.

## Version

`SKILLS_VERSION` 6.28.2 → **6.28.3**, PATCH: a correction to shipped bytes in six product-floor modules; one new export
in an internal module (`gitFailureDetail`; `GIT_MAX_BUFFER` stays module-private, GRILL G4), no new command, checker,
contract or path. Picked as if
merging next after 6.28.2; renumbered by diff if another PR lands first.

## Decisions at GATE 1 (2026-09-27)

GATE 1 was decided by the orchestrating model under the maintainer's delegation for this batch — recorded as such,
never as a human approval. Approved, with these answers:

- Q1 — include `render-review-assignments.mjs:138`'s ceiling (C): the same defect class in a shipped module, and its
  refusal text is false past 1 MiB.
- Q2 — keep both closure tests (D) with their mutation controls, and state their bound — the PRESENCE of a
  `maxBuffer`, and only the `<fn>("git"` spelling — where they live (the test file's own header for them).
- Q3 — leave the argv-size limit out of this increment, recorded under the EXISTING follow-up
  `regress-inside-echo-list` (the same `--inside` echo) with the darwin `E2BIG` measurement and the unmeasured Linux
  per-argument bound, not under a new name — unless the two need different fixes. They do not (Named, not built).
- Claims stay worded as proposed: a big repo with a modest change. Version 6.28.3.

## Open questions (HALT)

- None — Q1–Q3 are resolved above.
