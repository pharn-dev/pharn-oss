# VERIFY — write-guard-narrowing

- stage: `/pharn-dev-verify` — opus (`claude-opus-5-5`), by the maintainer's instruction for this batch, not a
  `pharn.config.json` route; effort not routed
- run: before the human applies `proposed/human-only.patch` — the designed STOP of `PLAN.md`'s chain sequencing
  (step 3). The two guards in this worktree are still HEAD's, so every test that asserts the patched guards fails
  here by construction.
- how it ran: the command's Step 1 and Step 3 as one node runner (`.pharn/pharn-dev-verify/verify-run.mjs`,
  scratch), with argv arrays, because this isolated worktree refuses the pinned `$?` capture. The runner deleted
  itself before the first gate, and every other scratch script had been moved out of `.pharn/` first, so `eslint .`
  and `markdownlint-cli2` (both of which descend into `.pharn/`) judged no scratch file. The eval pair's two paths
  were read before any gate ran, so an unreadable path fails as a setup error, never as a gate verdict. `reconcile`
  ran last.
- **one deviation, recorded:** the `test` gate's exit code comes from ONE run of the exact globs of `package.json`'s
  `test` script under `node --test --test-reporter=tap` — the command `npm test` runs, with another reporter — so the
  failing titles GATE-1 decision 1 compares (below) come from the very run whose exit code the verdict reads. That
  run: **4088 tests, 4058 pass, 30 fail**, 0 skipped, 0 cancelled.

## FLOOR layer — the gates

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (the full suite, TAP reporter)                                                      | 1    |
| `validate` (`pharn/floor/validate.mjs .`)                                                  | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

`reconcile` read **CLEAN**: the epoch `/pharn-dev-build` anchored (2026-09-27T15:58:43.863Z, `pharn-dev-build`),
12 paths reconciled, **0 escapes**. It exempted `BUILD.md`, `PLAN.md`, `REGRESSION.md` and `regression-report.json`
as pipeline artifacts; every other changed path was one the build's recorded scope allowed.

## VERIFY FAILS: gate(s) `test` red — stage FAILS

`check-verify.mjs .pharn/pharn-dev-verify/results.json --feature write-guard-narrowing` exited **1**
(`"verdict": "FAIL"`, `"failing_gates": ["test"]`); `verify-report.json` carries its output verbatim.

## GATE-1 decision 1 — delegated to the orchestrating model, applied here

The maintainer delegated GATE 1 to the orchestrating model, and its decision 1 (a decision of that model, **not a
human approval**) reads: continue past `/pharn-dev-verify` to `/pharn-dev-review` **only if** `failing_gates ==
["test"]` **and** the failing test titles from a TAP run exactly equal `BUILD.md`'s expected-fail list, each shown
passing in the patched throwaway worktree; any other shape STOPs.

The runner compared the two mechanically (sorted line lists, string equality):

- `failing_gates == ["test"]`: **yes**;
- the TAP run's failing top-level titles, as `<file> :: <title>`: **30**, and `BUILD.md`'s list: **30** — **identical**
  (missing from the run: none; unexpected in the run: none);
- each shown passing in the patched worktree: **yes** — `BUILD.md`, "The verify-patch runner", pass 3: all 30 `ok`,
  no SKIP directive, and the full suite 4088 of 4088 there.

**So the chain continues to `/pharn-dev-review`.** The exact list:

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

Once the human applies the patch (`proposed/apply.sh`), this stage is re-run and is expected to PASS.

## ADVISORY layer — verifiers

no verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

**The honest residual:** verified = the named gates passed; this is NOT a guarantee of correctness beyond what those
gates check — verifier concerns are advisory help, not assurance. Here one named gate did not pass, by design, and
the equality check above is what licensed the chain to go on: it matches titles, and it cannot tell a test that
fails for the designed reason from one that fails the same way for another.

## After the human apply (2026-09-28) — the current verdict

The sections above record the pre-apply run (the designed STOP, 30 expected failures at the time; the list grew to 32
with the patch review's m1/m3 tests — `BUILD.md`). The maintainer then compared the patch's sha256
(`6cceeebc…6d82b5aff`) and ran `proposed/apply.sh` from this worktree's root. It ended "applied, tested and committed"
(12 suites 1099/1099), set the scope from the PLAN and re-anchored the baseline (`write-guard-narrowing-apply`).
Checked before this run: HEAD `2bf04a8` is the apply commit, touching exactly the three files; `shasum -a 256 -c
human-only.sha256` OK ×3; the working tree clean; `origin/main` still `17dda60`.

The same gates, re-run the same way (a node runner with argv arrays that deletes itself before the first gate;
`reconcile` last):

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: **4250 tests, 4250 pass**, 0 fail, 0 skipped)                          | 0    |
| `validate` (`pharn/floor/validate.mjs .`)                                                  | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

`reconcile` read **CLEAN** under the apply epoch (2026-09-28T07:28:50.959Z, `write-guard-narrowing-apply`), 0
escapes.

## VERIFIED: floor gates PASS

`check-verify.mjs .pharn/pharn-dev-verify/results.json --feature write-guard-narrowing` exited **0** (`"verdict":
"PASS"`, `"failing_gates": []`); `verify-report.json` now carries that output verbatim, replacing the pre-apply FAIL.
No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

**The honest residual:** verified = the named gates passed; this is NOT a guarantee of correctness beyond what those
gates check — verifier concerns are advisory help, not assurance.
