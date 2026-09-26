# VERIFY — writes-scope-run-only

## After the human apply: VERIFY PASSES (the standing verdict)

- stage: `/pharn-dev-verify` — opus — set by the maintainer's instruction, overriding pharn.config.json's
  sonnet for build/regress/verify; routed via Agent subagent; effort not routed
- run: at `093ad54`, the maintainer's own commit of the reviewed patch (`feat(hooks): the write guard is
fail-closed only while PHARN is working (human-applied)`), made by `proposed/apply.sh` in this worktree
  after it fast-forwarded to `e607bcb`. That commit sits on top of the re-check. The working tree was clean.
  `shasum -a 256 -c proposed/human-only.sha256` reads OK for all three human-only files, so the bytes that
  landed are the bytes the runner verified.
- epoch: `apply.sh` re-ran the PLAN setter and re-anchored after its commit, `--by
writes-scope-run-only-apply`, epoch `2026-09-26T12:40:34.400Z` over 2339 paths. So
  `reconcile --require-baseline` had a baseline to read.
- how it ran: Step 1's pinned gates as one node runner under `.pharn/pharn-dev-verify/` (argv arrays, exit
  codes only), then `check-verify.mjs .pharn/pharn-dev-verify/results.json --feature writes-scope-run-only`

| gate                                                                                         | exit |
| -------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test` — the full hermetic suite, 3581 tests)                                    | 0    |
| `validate` (`pharn/floor/validate.mjs .`)                                                    | 0    |
| `lint` (`npm run lint` — eslint)                                                             | 0    |
| `format:check` (`npm run format:check` — prettier, whole-repo)                               | 0    |
| `lint:md` (`npm run lint:md` — markdownlint, whole-repo)                                     | 0    |
| `structural:…/expected-injection-comment.json` (the trust-fence committed eval pair)         | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline` — the fix #7 Bash-write detector) | 0    |

`check-verify.mjs` exited **0**, `"verdict": "PASS"`, `"failing_gates": []`. `npm test` reported `tests 3581,
pass 3581, fail 0` (0 cancelled, skipped or todo). The 41 tests the runs below expected to fail assert the
patched guard, and they now run against the patched hooks and pass. `reconcile` read `CLEAN` under the
apply epoch, with 0 paths reconciled: the tree is still at the state `apply.sh` anchored.

`verify-report.json` now holds this run: its `feature`, `gates`, `verdict` and `failing_gates` deep-equal
the helper's output, and `verifiers` reads `registered: 0`. The expected-FAIL runs below are kept as
written. Their report is in git history at `d24b282`, with the same gate map except `"test": 1`, `"verdict":
"FAIL"` and `"failing_gates": ["test"]`.

## Earlier runs, kept: the designed expected-FAIL before the human apply

The three sections below are the records written before the apply, unchanged except for one heading, which
now says which run its gate table belongs to.

## The reconcile reading before the merge of `origin/main` (recorded first, before anything moved)

At `67847e5`, with a clean working tree, `node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline`
exited **0**, `"verdict": "CLEAN"`: epoch `2026-09-26T08:26:59.272Z`, anchored by
`writes-scope-run-only-opus-fixes`, 17 paths reconciled, 0 escapes. It exempted five of this feature's own
pipeline artifacts (`BUILD.md`, `PLAN.md`, `REGRESSION.md`, `VERIFY.md`, `regression-report.json`) and warned
twice, for the two deleted `handoff/` sources (inside the declared scope). This is the last reading of that
epoch. The merge that follows brings #277's files in through `git`, which the epoch would read as escapes, so
the epoch is re-opened after the merge (see below) — and this reading is what the old epoch said, kept.

## The epoch was re-opened after the merge

- **The old epoch on the merged tree.** It read `ESCAPE`, with 67 paths reconciled and 30 escapes. Every one
  of the 30 is a file #277 changed: each is in `git diff --name-only 767bf61 1524c6f`. That is the merge,
  not a write this phase made.
- **The new epoch.** The PLAN setter was re-run (36 paths), then
  `node pharn/floor/reconcile-baseline.mjs --anchor --by writes-scope-run-only-post-merge` ran. It opened
  epoch `2026-09-26T09:56:59.691Z` over 2345 paths. No baseline was edited or deleted.
- **Why the merge was committed straight away, as `c0d33d7`.** Reconcile compares the always-reconciled
  control surface with HEAD's committed blobs: the hooks, the settings files, and every file under
  `pharn/floor/` and `.dev/floor/`. While the merge was uncommitted, HEAD was still `67847e5`, so the new
  epoch read `ESCAPE` with 17 escapes. Every one was a `pharn/floor/` or `.dev/floor/` file that #277
  changed. After the commit it read `CLEAN`. That commit is amended with the regenerated patch and this
  chain's artifacts, so the branch gains one merge commit.

- stage: `/pharn-dev-verify` — opus — set by the maintainer's instruction, overriding pharn.config.json's
  sonnet for build/regress/verify; routed via Agent subagent; effort not routed
- run: after the re-review fixes (`BUILD.md`, "After the re-review (R1–R4, 2026-09-26)"), over the working
  tree at `b9d2de5` with those fixes and the regenerated patch not yet committed, in the fix pass's own
  worktree and under the epoch re-opened after the merge — so `reconcile --require-baseline` had a baseline
  to read. The run before it, after the merge and the renumber, gave the same verdict with 36 expected
  failures; this one has 41, the five new ones being the R1 tests.
- how it ran: Step 1's pinned gates as one node runner under `.pharn/pharn-dev-verify/` (argv arrays,
  exit codes only), then `check-verify.mjs .pharn/pharn-dev-verify/results.json --feature writes-scope-run-only`

## Gate → exit code, before the human apply (after the re-review fixes)

| gate                                                                                         | exit |
| -------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test` — the full hermetic suite, 3581 tests)                                    | 1    |
| `validate` (`pharn/floor/validate.mjs .`)                                                    | 0    |
| `lint` (`npm run lint` — eslint)                                                             | 0    |
| `format:check` (`npm run format:check` — prettier, whole-repo)                               | 0    |
| `lint:md` (`npm run lint:md` — markdownlint, whole-repo)                                     | 0    |
| `structural:…/expected-injection-comment.json` (the trust-fence committed eval pair)         | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline` — the fix #7 Bash-write detector) | 0    |

## VERIFY FAILS: gate `test` red — stage FAILS

`check-verify.mjs` exited **1**, `"verdict": "FAIL"`, `"failing_gates": ["test"]`. **This is the STOP the plan
designs for.** The new and changed hook and floor tests assert the PATCHED write guard against
`.claude/hooks/enforce-writes-scope.cjs` and `.claude/hooks/set-writes-scope.cjs`. Those files are
human-only and still hold their pre-patch bytes here, which since the merge are `main`'s bytes. The patch is
`proposed/human-only.patch`.

**The failures are exactly the expected ones.** `npm test` reported `tests 3581, pass 3540, fail 41`. The 41
failing names are set-equal to the expected list:

- the 36 of the post-merge run, with one title renamed because its claim became false (the B1 dev-posture
  test, which had called itself "the one verdict change there besides a guard error");
- the five new R1 tests, each of which asserts the patched guard.

No other test in the suite failed. The six other new tests pass here, unpatched: the R1 dev-posture D1 pin
and R2's five executed-line tests.

| file                                          | failing | total in file |
| --------------------------------------------- | ------- | ------------- |
| `.claude/hooks/enforce-writes-scope.test.cjs` | 35      | 149           |
| `pharn/floor/run-marker.test.mjs`             | 4       | 43            |
| `pharn/floor/check-bash-reconcile.test.mjs`   | 1       | 54            |
| `.claude/hooks/set-writes-scope.test.cjs`     | 1       | 46            |

**Each of the 41 passes against the patched copy.** The verification runner ran its full `npm test` over
this tree with the patched hooks and `LIMITS.md` at their real paths. It passed 3581/3581, and the aggregate
`npm run check` exited 0 there (`BUILD.md`, "After the re-review (R1–R4, 2026-09-26)").

The 41, by name:

- `.claude/hooks/set-writes-scope.test.cjs` — ★ 6.24.0: the --clear message no longer claims a single
  fail-closed posture, either way
- `pharn/floor/check-bash-reconcile.test.mjs` — ★ PARITY: makeDefaultProbeSandbox()'s own run marker flips
  the REAL install-posture hook 0 -> 2
- `pharn/floor/run-marker.test.mjs`:
  - ★ NON-VACUITY (L34): opening EACH command's marker flips the install no-scope verdict for src/x.js
    0 -> 2, and closing flips it back
  - ★ a marker under an UNKNOWN state directory is ignored (negative control — the state-dir set is closed)
  - ★ an aged marker (utimesSync) past 24h no longer holds the install default fail-closed
  - ★ the require-loop-record.cjs marker under .pharn/pharn-loop/ ALSO flips the write guard — no third
    writer needed
- `.claude/hooks/enforce-writes-scope.test.cjs`:
  - ★ B1 in the DEV posture too — a verdict change there, and it is toward deny (renamed; it had said "the
    one verdict change there besides a guard error")
  - ★ B1: the review's dangling-link repros are DENIED, and a dangling link to an ordinary path is not
  - ★ BACKSLASH (install, no scope, no run): a path containing `\` is denied — each of these reached a
    reserved file
  - ★ D2 bound, pinned rather than hidden: the temp root is read from TMPDIR, so an environment can widen it
  - ★ D2: `<claude-config-dir>/projects/*/memory/**` is allowed outside the project; nothing else under the
    config dir is
  - ★ D2: the memory folder is allowed ONLY by the install posture's permissive default — never in dev,
    never with a run open
  - ★ D2: the temp roots — the OS temp directory and /tmp — are allowed outside the project
  - ★ D2: with no CLAUDE_CONFIG_DIR the config dir is ~/.claude — the review's home-directory repros are all
    DENIED
  - ★ DENY BODY 'in-repo' (install, run open, no scope): the RUN block lists the marker and a close command
  - ★ DENY BODY 'malformed': names the release/re-run remedy, never a bare 'declare it in writes:'
  - ★ DENY BODY 'out-of-root' (install, SET scope, no run): still states the permissive fact, plus the
    STALE-scope bullet
  - ★ DENY BODY 'out-of-root' (install, run open): states the permissive-outside-a-run fact and offers the
    RUN block
  - ★ DENY BODY 'reserved': never offers Bash, never a stale-scope/stale-run bullet (there is neither)
  - ★ L27 per branch: each 6.24.0 remedy is PRESENT in its own case and ABSENT from every other
  - ★ MARKERS: a marker under an UNKNOWN state directory is ignored (negative control)
  - ★ MARKERS: aged past 24h (either direction) is ignored; aged 23h still counts (symmetric ceiling)
  - ★ MARKERS: an unreadable state directory ALSO counts when it is otherwise empty of runs (non-vacuity,
    L34)
  - ★ P5: when deny() ITSELF throws, the uncaughtException backstop still exits 2 — and it never touches an
    allow
  - ★ POSTURE MATRIX: install, MALFORMED scope -> deny EVERYTHING (D4), .pharn/\*\* and out-of-root included
  - ★ POSTURE MATRIX: install, no scope, no run -> PERMISSIVE (in the project, denies PHARN's reserved
    surface)
  - ★ POSTURE MATRIX: the ROOT itself and an out-of-root/other-tree path, across postures
  - ★ S1: `.pharn` itself planted as a FILE makes the scope record unconfirmable — malformed, deny
    everything
  - ★ S1: a stray non-directory ENTRY inside a real state directory is not a run (the review's .DS_Store
    caveat)
  - ★ `..` after an EXISTING symlink is applied to its REAL parent, as the kernel does
  - ★ a guard error denies — SOURCE-SHAPE pin: the decision loop sits inside a try whose catch calls a deny
    function
  - ★ a marker directory name that FAILS the slug grammar is NEVER rendered — only its fixed state directory
    is
  - ★ minor 2: a scan error names the unreadable state directory — in-repo and out-of-root alike
  - ★ minor 2: install, a leftover SET scope, no run — the stale bullet's REASON is the install one, and it
    is true
  - ★ minor 6: a FORCED throw inside the decision exits 2 with the fixed message — dev and install
  - ✧ PIN: enforce-writes-scope.cjs's toKey() is byte-equal to protect-trusted-paths.cjs's
  - NEW (R1): ★ R1: the re-review's repro — a case variant of the project's own path is DENIED, never
    allowed as a temp-root path
  - NEW (R1): ★ R1: with a .git at the project root, a variant spelling gets the SAME alias body — never
    'another git tree'
  - NEW (R1): ★ R1: a Unicode-form variant (NFC for an NFD directory) is the project too; a trailing-dot
    SIBLING is denied as well — the accepted over-block
  - NEW (R1): ★ R1: resolution (2) reads the ON-DISK spelling — a dangling link to another spelling of the
    project's floor lands inside the project
  - NEW (R1): ✧ PIN: resolution (2) realpaths NATIVELY — resolvePhysicalTarget() and its start,
    realpathOr() (re-review R1)

**Every other gate is GREEN.** `reconcile` read `CLEAN` under the re-opened epoch, with 0 escapes and no
warnings.

- It reconciled 10 paths, each inside the declared scope:
  - `.claude/commands/pharn-loop.md`;
  - the two changed test files, `enforce-writes-scope.test.cjs` and `run-marker.test.mjs`;
  - `CHANGELOG.md`, `CLAUDE.md`, `README.md` and `pharn/floor/README.md`;
  - `proposed/APPLY.md`, `proposed/human-only.patch` and `proposed/human-only.sha256`.
- It exempted the stage artifacts this chain writes as pipeline artifacts: `BUILD.md`, `PLAN.md`,
  `REGRESSION.md`, `REVIEW.md`, `VERIFY.md` and `regression-report.json`.

No Bash write in this pass reached a path the live guards would have denied. The one Bash edit of an
in-repo file, a `sed -i` in `enforce-writes-scope.test.cjs`, is one of the 10 and is inside the scope
(`BUILD.md` declares it).

## Verifiers (both runs)

No verifiers registered — floor gates only. `node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`, read again for the run after the apply.

## The honest residual (both runs)

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check —
verifier concerns are advisory help, not assurance. Before the human apply, `test` did **not** pass, by
design: the human-only half of this increment had not been applied, and `FAIL` was the correct
deterministic reading of that tree. These records said it should read `PASS` once `proposed/apply.sh` landed
the patch in this worktree and this stage re-ran there (`/pharn-dev-verify` again, not `/pharn-dev-regress` —
L17). It did land, as `093ad54`, and the re-run reads `PASS`.
