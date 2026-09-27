# BUILD — write-guard-narrowing

- plan: `.dev/features/write-guard-narrowing/PLAN.md`, as amended at GATE 1, at grill (`GRILL.md` records G1–G7)
  and in build ("Amended in build")
- stage model: opus (`claude-opus-5-5`), by the maintainer's instruction for this batch — not a `pharn.config.json`
  route; effort not routed
- chain: `spec_content_hash` d831d30d…42f4f4 — GREEN (`shasum -a 256 pharn/ARCHITECTURE.md` recomputed at build
  start and again when this record was written)
- scope: `set-writes-scope.cjs --from-plan` → 17 paths (`set_at` 2026-09-27T15:58:43.071Z);
  `reconcile-baseline.mjs --anchor --by pharn-dev-build` → 2452 entries, anchored after the setter
  (2026-09-27T15:58:43.863Z), its `scope_snapshot` the same 17 paths
- floor: `node pharn/floor/validate.mjs .` → **GREEN** (`FLOOR: GREEN — 72 capabilities checked in "."`, exit 0;
  this increment adds no capability)

## What landed (the agent-writable surface)

- `.claude/hooks/protect-trusted-paths.test.cjs` — a `write-guard-narrowing (M4)` section: the review's `s\x → .`
  repros (a trusted doc; memory-bank canon under a PLAN-origin scope; the promote-origin control, still allowed), a
  dangling link whose text holds a backslash, git metadata through `g\it → .git`, the canon escape's backslash
  refusal, a link inside canon to a different canon file, and two controls (a user's own `src/a\b.md` allowed;
  `pharn\CONSTITUTION.md` denied with the old message, no arrow). POSIX-only cases skip on a `\` system. The
  existing `mutantSandbox()` now also switches the second pass off (see Deviations), and a strict mutant proves
  the second pass is what closes the backslash-named link.
- `.claude/hooks/enforce-writes-scope.test.cjs` — the five D2 tests re-derived as "D2 narrowed" with the payload's
  session fields; `installDenyMessages()` gains the `out-of-root (install, Claude state)` entry, so every
  `everyDenyMessage()` rule (L27, L29) now iterates the new variant; the L27-per-branch test gains the variant's
  two cues; and a `write-guard-narrowing (M7)` section: another project's memory (denied, Claude-state body) vs
  this project's; the scratchpad (own vs another session's, own task output, fail-closed field cases); the
  transcript key's fail-closed cases and a subagent transcript; the folded and closed `claude-<uid>` exclusion; a
  `TMPDIR` inside a `claude-<uid>` folder; HOME inside a temp root, HOME=`/`, a temp root inside HOME; (1b) in real
  git sandboxes — a main-checkout, a subdirectory and a linked-worktree session, a forged pointer, a
  submodule-style gitdir, a symlinked `.git`, a bare common dir, relative pointers, a >200-character path — each
  asserting git's realpath premise before relying on it (grill G7); the two L41 real-environment tests (the second
  skips, never fakes, when `~/.claude` is unusable — grill G3); the no-echo test over every branch (grill G4); and
  the ✧ pin (`resolvePhysicalTarget()`, `fsRootOf()`, `MAX_RESOLVED_SEGMENTS`, `MAX_LINK_HOPS`, `SEPARATORS`
  byte-equal in both guards; `realpathOr()` asserted to differ, deliberately).
- `pharn/floor/run-marker.mjs` — header only: it cites the hook's rule instead of restating the out-of-project
  places (L25).
- `pharn/floor/README.md` — both guard sections.
- `CLAUDE.md` — hard constraint 1 (the second reading), and "Writes-scope": the out-of-project paragraph (three
  places, the D2 history), the every-target bullet (protect's copy), the out-of-root remedy bullet and its
  Claude-state variant.
- `README.md` — badge `6.28.3`; the guarantee row; the posture paragraph.
- `CHANGELOG.md` — `## [6.28.3] - 2026-09-27`, `### Fixed`; `SKILLS_VERSION` 6.28.2 → 6.28.3.

## The human-only patch (NOT written by the agent)

`.claude/hooks/protect-trusted-paths.cjs`, `.claude/hooks/enforce-writes-scope.cjs` and `LIMITS.md` were staged
under `handoff/` (the two full patched hooks, copied in from HEAD with Bash `cp` and then edited with the Edit
tool, plus `limits-edits.json`, a `[{find, replace}]` list whose every `find` matched exactly once). The
verify-patch runner (`.pharn/pharn-dev-build/verify-patch.mjs`, a scratch file) checked them in a throwaway
detached worktree and wrote `proposed/human-only.patch` (703 lines) and `proposed/human-only.sha256` from that
worktree's own `git diff HEAD~1 HEAD`. `handoff/` was then deleted. `proposed/apply.sh` is byte-identical to the
script the PLAN pins (1589 bytes, compared by a scratch check), and `proposed/APPLY.md` says what to read, what the
script does and where to resume.

```text
a5e22d3d2aaa69d1944ab75903ca44aed73f87e0ee0b6d1576ee192c23d9f608  .claude/hooks/protect-trusted-paths.cjs
5127029edd72e8193e1db33063844f82c82c578e4263a464f3dd9e1061f1a0ba  .claude/hooks/enforce-writes-scope.cjs
eb4bb45374958dc90276cfd46ad6e0b6edee28189a607991516d6628bd7cb2af  LIMITS.md
```

No added line of the patch matches `/\b6\.28\.\d+\b/` (the runner checks it), so a renumber after another PR
merges first changes neither the patch nor its checksums. `git apply --check` of the patch against this worktree
exits 0.

## The verify-patch runner (Build procedure step 5)

The runner overlays this build's written files (the live scope list, minus `handoff/` and `proposed/`) and the three
patched files onto a worktree at HEAD, commits them there (author `pharn-verify <verify@localhost>`), runs every
gate of `scripts.check` one at a time and then the chain, and regenerates the patch. It ran three times. The last
run applied `proposed/human-only.patch` itself — `handoff/` was gone — so it verified the exact bytes a human
applies, and it asserted that the patch and the checksums it regenerated are byte-identical to the ones on disk.

The last run (pass 3), each gate run on its own in that worktree:

| gate                 | exit | note                                                                                   |
| -------------------- | ---- | -------------------------------------------------------------------------------------- |
| `format:check`       | 0    |                                                                                        |
| `lint`               | 0    |                                                                                        |
| `lint:md`            | 0    |                                                                                        |
| `docs:check`         | 0    | no generated region moved                                                              |
| `check:markers`      | 0    |                                                                                        |
| `check:badge`        | 0    |                                                                                        |
| `check:changelog`    | 0    |                                                                                        |
| `check:contributing` | 0    |                                                                                        |
| `check:reconcile`    | 0    | not counted: a worktree that never anchored can only read `NO_BASELINE` (plan, step 5) |
| `test`               | 0    | the full suite against the PATCHED hooks: **4088 tests, 4088 pass, 0 fail, 0 skipped** |

- regenerated patch byte-identical to `proposed/human-only.patch`: **yes** (703 lines); regenerated checksums
  byte-identical to `proposed/human-only.sha256`: **yes**;
- added lines matching `/\b6\.28\.\d+\b/`: **0**; `git apply --check` against this worktree: **0**;
- the 30 expected-fail titles (below), run with the TAP reporter in that worktree: **30 of 30 `ok`**, no SKIP
  directive (TAP exit 0).

**The chain, `npm run check`, exited 1 in pass 3**, after every one of its gates had exited 0 on its own in the same
worktree, and the runner kept no output from it (a runner defect: it logged a gate's output only for the individual
runs). Pass 2's chain, over the same patch before the last three enforce tests were added, had exited 0. Two
follow-ups, each in a fresh throwaway worktree built the same way and each keeping the whole log
(`.pharn/pharn-dev-build/chain-check.mjs`, scratch):

- the first overlaid this `BUILD.md` mid-draft, and the chain stopped at `lint:md` on the hard tabs of its
  expected-fail block (MD010) — a defect of this record, fixed (the list below now separates file and title with
  `::`), not of the patch;
- the second, in a worktree under the OS temp directory, repeated pass 3's order — a full `npm test` (4088 of 4088),
  a check that it left no file behind (`git status --porcelain --ignored`: nothing but `node_modules`), then the
  whole chain: **exit 0**, its `npm test` 4088 of 4088.

So pass 3's red did not reproduce, and its cause is not known. What is known: it was not a gate this build can make
red on its own, since each passed alone just before; and pass 3 ran while other sessions' suites loaded the machine
(`uptime` just after it: 45, 63 and 76 over one, five and fifteen minutes), where a timing-sensitive test failing
once is the likeliest reading. That reading is a guess, and it is labelled as one.

## The D1 sweeps and the behavioural probe (L37)

Re-run over the final bytes: the three files rebuilt from HEAD plus `proposed/human-only.patch` in a fresh OS-temp
directory, each checked against `human-only.sha256` before use (all three OK). The HEAD side is the in-tree hooks,
which `git diff --quiet HEAD` confirmed untouched.

**D1, enforce: 560 combinations, 0 differences.** HEAD's hook and the patched one, each spawned with the same
payload and compared on `(exit status, stderr)`: the dev and unsignalled postures × seven scope-record states (none,
a set scope, unparseable, `{}`, `[]`, a directory, a dangling link) × 20 paths (the 6.24.0 list plus the M7
out-of-project paths: another project's and this project's memory, a `claude-<uid>` scratchpad and task output, an
ordinary `/tmp` file, `~/.zshrc`) × the payload with and without the three session fields. **D1, protect: 520
combinations, 0 differences** (stderr compared with the sandbox path masked): four scope records (none, PLAN-origin,
promote-origin, promote-origin with two entries) × `PHARN_PROTECTED` unset and set × 31 relative paths (34 with the
variable set), each written relative and absolute — trusted docs in case, trailing-dot and `ſ` spellings, the control
surface, canon, git metadata, a symlink to a trusted doc, a link to the root, a `..` through a link, a dangling link,
a hard link, and two backslash paths with no backslash-named link on them (`pharn\CONSTITUTION.md`, `src/a\b.md`).

**The behavioural probe: 51 of 51 as expected**, every row a hook spawn against the patched file with its exit code
(or a message property) compared to the expected one. `2` is a denial, `0` an allow; unless a row says otherwise it
runs in the install posture with no scope and no run open.

| #   | case                                                                                                         | want  | got   |
| --- | ------------------------------------------------------------------------------------------------------------ | ----- | ----- |
| 1   | `M4 install: <root>/s\x/LIMITS.md, scoped to it (protect)`                                                   | 2     | 2     |
| 2   | `M4 install: <root>/s\x/pharn/CONSTITUTION.md, scoped to it (protect)`                                       | 2     | 2     |
| 3   | `M4 install: control <root>/LIMITS.md (protect)`                                                             | 2     | 2     |
| 4   | `M4 install: s\x/memory-bank/lessons-learned.md under a PLAN-origin scope (protect)`                         | 2     | 2     |
| 5   | `M4 install: s\x/memory-bank/lessons-learned.md under a PROMOTE-origin scope (protect: the authorized file)` | 0     | 0     |
| 6   | `M4 install: memory-bank/x\..\lessons-learned.md under a PROMOTE-origin scope (protect)`                     | 2     | 2     |
| 7   | `M4 install: control memory-bank/lessons-learned.md under a PROMOTE-origin scope (protect)`                  | 0     | 0     |
| 8   | `M4 install: dangling link evil -> s\x/docs/CODEOWNERS (protect)`                                            | 2     | 2     |
| 9   | `M4 install: g\it/config through a link to .git (protect)`                                                   | 2     | 2     |
| 10  | `M4 install: a user's own src/a\b.md (protect)`                                                              | 0     | 0     |
| 11  | `M4 install: s\x/LIMITS.md with no scope (enforce, unchanged)`                                               | 2     | 2     |
| 12  | `M4 dev: <root>/s\x/LIMITS.md, scoped to it (protect)`                                                       | 2     | 2     |
| 13  | `M4 dev: <root>/s\x/pharn/CONSTITUTION.md, scoped to it (protect)`                                           | 2     | 2     |
| 14  | `M4 dev: control <root>/LIMITS.md (protect)`                                                                 | 2     | 2     |
| 15  | `M4 dev: s\x/memory-bank/lessons-learned.md under a PLAN-origin scope (protect)`                             | 2     | 2     |
| 16  | `M4 dev: s\x/memory-bank/lessons-learned.md under a PROMOTE-origin scope (protect: the authorized file)`     | 0     | 0     |
| 17  | `M4 dev: memory-bank/x\..\lessons-learned.md under a PROMOTE-origin scope (protect)`                         | 2     | 2     |
| 18  | `M4 dev: control memory-bank/lessons-learned.md under a PROMOTE-origin scope (protect)`                      | 0     | 0     |
| 19  | `M4 dev: dangling link evil -> s\x/docs/CODEOWNERS (protect)`                                                | 2     | 2     |
| 20  | `M4 dev: g\it/config through a link to .git (protect)`                                                       | 2     | 2     |
| 21  | `M4 dev: a user's own src/a\b.md (protect)`                                                                  | 0     | 0     |
| 22  | `M4 dev: s\x/LIMITS.md with no scope (enforce, unchanged)`                                                   | 2     | 2     |
| 23  | `M4: a canon link to ANOTHER canon file under a promote scope (protect)`                                     | 2     | 2     |
| 24  | `M7: another project's MEMORY.md, config dir under a temp root`                                              | 2     | 2     |
| 25  | `M7: that denial carries the Claude-state body`                                                              | true  | true  |
| 26  | `M7: that denial offers no Bash route`                                                                       | false | false |
| 27  | `M7: this project's own MEMORY.md`                                                                           | 0     | 0     |
| 28  | `M7: <config>/settings.json under a temp root`                                                               | 2     | 2     |
| 29  | `M7: ~/.claude/settings.json, HOME under a temp root`                                                        | 2     | 2     |
| 30  | `M7: ~/.zshrc, HOME under a temp root`                                                                       | 2     | 2     |
| 31  | `M7: this project's memory, HOME under a temp root`                                                          | 0     | 0     |
| 32  | `M7: another project's memory, config dir NOT under a temp root`                                             | 2     | 2     |
| 33  | `M7: this project's memory, config dir NOT under a temp root`                                                | 0     | 0     |
| 34  | `M7: another session's scratchpad script under the real /tmp`                                                | 2     | 2     |
| 35  | `M7: another session's task output under the real /tmp`                                                      | 2     | 2     |
| 36  | `M7: this session's own scratchpad`                                                                          | 0     | 0     |
| 37  | `M7: this session's own task output`                                                                         | 2     | 2     |
| 38  | `M7: own scratchpad with no payload fields`                                                                  | 2     | 2     |
| 39  | `M7: an ordinary /tmp file`                                                                                  | 0     | 0     |
| 40  | `M7: an ordinary os.tmpdir() file`                                                                           | 0     | 0     |
| 41  | `M7: HOME=/ leaves an ordinary temp path allowed`                                                            | 0     | 0     |
| 42  | `1b: main-checkout session -> main's key`                                                                    | 0     | 0     |
| 43  | `1b: subdirectory session -> main's key`                                                                     | 0     | 0     |
| 44  | `1b: linked-worktree session -> main's key`                                                                  | 0     | 0     |
| 45  | `1b: linked-worktree session -> another key`                                                                 | 2     | 2     |
| 46  | `1b: a forged .git whose back-pointer names another worktree`                                                | 2     | 2     |
| 47  | `1b: a submodule-style gitdir with no commondir`                                                             | 2     | 2     |
| 48  | `L41: the real ~/.claude, this project's main-checkout key`                                                  | 0     | 0     |
| 49  | `L41: the real ~/.claude, another project's key`                                                             | 2     | 2     |
| 50  | `dev: another project's memory -> 2`                                                                         | 2     | 2     |
| 51  | `dev: no Claude-state body (D1)`                                                                             | false | false |

## The hook's per-write cost (L24)

End-to-end hook spawns, the median of 100 per side, HEAD and patched interleaved so the machine's load lands on
both alike. Measured twice: first over the `handoff/` draft, before its last comment and message edits, and then
over the final bytes, while other sessions' test suites loaded the machine heavily (`uptime` read 45 to 76 soon
after), which roughly quadrupled every number:

| case                                             | earlier run: HEAD / patched (ms) | final bytes, loaded: HEAD / patched (ms) |
| ------------------------------------------------ | -------------------------------- | ---------------------------------------- |
| protect, an ordinary in-repo write               | 70.0 / 71.3                      | 327.7 / 336.0                            |
| enforce, install posture, an out-of-project path | 77.4 / 75.2                      | 292.0 / 300.9                            |
| enforce, install posture, an in-repo path        | 67.1 / 65.3                      | 264.6 / 245.9                            |

Node's startup dominates every row, and the HEAD/patched differences (−7 to +3 %) sit inside the run-to-run
noise; the enforce in-repo row never reaches the out-of-project rules. The added work is protect's second walk over
each path (one `realpath` per segment) and, for an out-of-project path in the install posture, the (1b) mirror's
`lstat` and at most three pointer-file reads, plus resolving the config, home and temp directories.

## The designed verify STOP — the expected-fail list (Build procedure step 7)

The full suite, run in this worktree with the TAP reporter against the still-unpatched hooks: **4088 tests, 4058
pass, 30 fail**, every failure in the two hook test files this build edited — 23 in
`.claude/hooks/enforce-writes-scope.test.cjs` and 7 in `.claude/hooks/protect-trusted-paths.test.cjs`. Each was
checked against HEAD's copy of its file:

- **25 are new tests** (their titles do not exist at HEAD).
- **5 existed at HEAD, and fail because of data this build added**: they are exactly the five callers of
  `everyDenyMessage()`, which now includes the `out-of-root (install, Claude state)` case. That case writes to a
  `claude-99999` temp folder, which HEAD's hook allows, and `denyText()` asserts a denial — so the helper throws in
  each caller before its own assertions run.

```text
.claude/hooks/enforce-writes-scope.test.cjs :: deny message: every command it NAMES actually invokes the writes-scope setter — in EVERY branch
.claude/hooks/enforce-writes-scope.test.cjs :: deny message: every command it NAMES exists in .claude/commands/ — in EVERY branch
.claude/hooks/enforce-writes-scope.test.cjs :: deny message: the /build and /review phantoms stay dead — in EVERY branch
.claude/hooks/enforce-writes-scope.test.cjs :: deny message: the out-of-root branch cites NO command at all — its own case, asserted (L27)
.claude/hooks/enforce-writes-scope.test.cjs :: ★ D2 narrowed: only THIS project's memory folder — the transcript's key — is allowed under the config dir
.claude/hooks/enforce-writes-scope.test.cjs :: ★ D2 narrowed: with no CLAUDE_CONFIG_DIR the config dir is ~/.claude — the review's home-directory repros are all DENIED
.claude/hooks/enforce-writes-scope.test.cjs :: ★ L27 per branch: each 6.24.0 remedy is PRESENT in its own case and ABSENT from every other
.claude/hooks/enforce-writes-scope.test.cjs :: ★ L41: the real per-user claude-<uid> folder under /tmp is Claude state, and os.tmpdir() is ordinary — defaults, no overrides
.claude/hooks/enforce-writes-scope.test.cjs :: ★ L41: with the DEFAULT config dir (~/.claude), the main checkout's key is this project's memory folder
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7 (1a): a subagent's transcript, one level deeper, names the same project folder
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7 (1b) fail-closed: a forged pointer, a submodule-style gitdir, a symlinked .git and a bare common dir each grant NOTHING
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7 (1b): RELATIVE worktree pointers resolve as Claude Code resolves them — against the worktree and its gitdir
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7 (1b): a main checkout whose path is over 200 characters grants nothing — Claude Code hashes those, and the hash is not copied
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7 (1b): a main-checkout, a subdirectory and a linked-worktree session each reach the MAIN checkout's memory folder
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7 fail-closed: a scratchpad the payload does not name as THIS session's grants nothing — and the body never calls it 'not scratch'
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7 fail-closed: a transcript_path that is absent or malformed grants nothing from the transcript's key
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7: HOME, and so the config dir, inside a temp root — its settings and dotfiles are not temp paths
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7: a TMPDIR that itself points inside a claude-<uid> folder cannot widen the temp rule — the WHOLE path is tested
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7: another project's auto-memory folder is DENIED with the Claude-state body; this project's is not
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7: nothing from the payload's session fields ever reaches a deny message (grill G4)
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7: the claude-<uid> exclusion is folded and closed — its case variants are Claude state, its look-alikes are ordinary
.claude/hooks/enforce-writes-scope.test.cjs :: ★ M7: the scratchpad — only this session's own, recognised from the payload's scratchpad_dir and session_id
.claude/hooks/enforce-writes-scope.test.cjs :: ✧ PIN: resolvePhysicalTarget(), fsRootOf() and the three walk constants are byte-equal in both guards (L31)
.claude/hooks/protect-trusted-paths.test.cjs :: ★ M4: a DANGLING link whose TEXT holds a backslash is followed the way the kernel follows it
.claude/hooks/protect-trusted-paths.test.cjs :: ★ M4: a link inside canon to a DIFFERENT canon file is judged at its target, not by its authorized name
.claude/hooks/protect-trusted-paths.test.cjs :: ★ M4: a symlink named `s\x` → `.` no longer carries a write to a trusted doc past this hook
.claude/hooks/protect-trusted-paths.test.cjs :: ★ M4: git metadata through a backslash-named link — found only by the filesystem's reading
.claude/hooks/protect-trusted-paths.test.cjs :: ★ M4: the canon escape never authorizes a target whose name holds a backslash
.claude/hooks/protect-trusted-paths.test.cjs :: ★ M4: the same link cannot carry a canon write under a PLAN-origin scope — the `## Files` → canon vector (L7, L20)
.claude/hooks/protect-trusted-paths.test.cjs :: ✧ MUTANT: switching the second pass off re-opens the backslash-named link — the pass is what closes it (L4)
```

Against the patched hooks all 30 pass: the runner's pass 3 ran the two files with the TAP reporter in its patched
worktree and found an `ok` line, with no SKIP directive, for each of the 30 titles above; its full `npm test` there
was 4088 of 4088.

## The probe of every quantified sentence (L37, L64)

Each sentence below quantifies over a set, so each was held to a measurement rather than read as true:

- "every write it denied before is denied with the same message" (protect) — by construction (PASS 1 is
  byte-identical and runs first over every path; a PASS-1 offender carries no `shown`, so the old message branch
  composes it) and measured by the protect D1 sweep.
- "every verdict the second check changes is a denial" — by construction: PASS 2 runs only when PASS 1 found no
  offender, and it can only set one.
- "it changes one only for a write that involves a backslash … or that goes through a link inside canon … to a
  DIFFERENT canon file" (protect header, CHANGELOG, LIMITS) — the build's first draft said "only for a backslash";
  checking it against the two walks found the canon cross-link (PASS 1 takes the first canon match, the link's own
  name), so the sentence and a test were added. Without a backslash the two walks visit the same segments and
  follow the same links, applying `..` to the real parent alike; they differ only in the realpath flavour (JS vs
  native), i.e. in case and Unicode spelling, which `toKey()` folds.
- "the dev and unsignalled postures are unchanged" (enforce) — the enforce D1 sweep, and the Claude-state variant
  is keyed by `ctx.claudeState`, which only the install posture sets.
- "never inside the Claude config directory or the home directory when either lies inside that temp root" — the
  first draft of `OUT_OF_PROJECT_PLACES` and of the README said "nor inside the home directory" without the
  condition, which is false for a temp root inside HOME (`TMPDIR=$HOME/tmp` is an ordinary temp path); corrected in
  both, with a test.
- "a payload field that is absent or malformed grants nothing" — one test per field (`session_id`,
  `scratchpad_dir`, `transcript_path`), each asserting the denial.
- "none of them … ever reaches a deny message" — the grill-G4 test, over every branch the permissive posture can
  reach, with each field carrying a newline and imperative text.
- "no PHARN version string in the human-only bytes" — the runner's check over every added patch line (0 hits),
  after the build removed "(6.x.y)" markers the first draft of the headers carried.

## Deviations from the plan

- **Step 2b ran through a node runner** (`.pharn/pharn-dev-build/fmt.mjs`, argv arrays): this isolated worktree
  refuses the pinned `xargs` form. The same three tools over the same list — the scoped paths that exist —
  prettier `--ignore-unknown --write`, `markdownlint-cli2 --no-globs --fix` over the `.md` subset, and `eslint`
  (read-only) over the JS subset. Advisory orchestration, as the step itself is.
- **The protect MUTANT tests.** With PASS 2 in place, a single mutation of PASS 1 is masked by PASS 2 (defense in
  depth), so four existing mutants stopped discriminating. `mutantSandbox()` now also switches PASS 2 off
  (tolerantly: HEAD's hook has no PASS 2, and the replace is then a no-op), so each existing mutant still isolates
  the PASS-1 rule it targets; a new strict mutant switches PASS 2 alone off and requires the backslash-named link
  to be allowed again.
- **The (1b) `<common>/worktrees` check compares lexically**, as Claude Code's own check does, where PLAN §2 first
  named a realpath comparison. The two disagree only at edges (a `commondir` spelled through a symlink; a
  `worktrees` directory that is itself a symlink), and the back-pointer check holds either way. PLAN §2 is amended
  in place ("Amended in build").
- **`apply.sh` runs twelve suites**: the 6.24.0 script's eight, plus `check-spec`, `check-ac-tests` and
  `stage-verify` — each executes a guard or reads its source, found by grepping the test tree for the two hook
  names (the three `*capability-catalog*` suites match only through fixture file names and never run a guard) —
  plus `command-hygiene`. The PLAN's pinned copy carries the same list ("Amended in build"), so the two stay
  byte-identical.
- **PLAN §1's sentence on when PASS 2 changes a verdict** gained the canon cross-link case (see the L37 section
  below); amended in place.
- **Declared Bash writes (L19)**: the `cp` of HEAD's two hooks into `handoff/`; the runner's `proposed/`
  patch and checksums; the deletion of `handoff/`. Every one of those paths is in `## Files`. Scratch runners live
  under `.pharn/pharn-dev-plan/` and `.pharn/pharn-dev-build/` (gitignored) and are deleted before any lint gate.

## Open issues for the human (beyond the designed verify STOP)

- **`main` moved during this run.** `f255f0c` (#286) released `6.28.3`, the number this build uses. Per the
  batch's rule the renumber happens when the orchestrator says so: `SKILLS_VERSION`, the README badge and the
  CHANGELOG heading move; the human-only patch and its checksums do not (no version string in them).
