# VERIFY — hook-cwd-anchoring

- stage: `/pharn-dev-verify` (**second run** — resumed after the human apply)
- feature: `hook-cwd-anchoring`
- date: 2026-09-18
- guard patch: commit `a7f32a1` — `.claude/hooks/enforce-writes-scope.cjs`,
  `.claude/hooks/protect-trusted-paths.cjs`, `.claude/settings.json`, `LIMITS.md` (+380/−80), applied and
  committed by the human via `proposed/apply.sh`
- machine report: `.dev/features/hook-cwd-anchoring/verify-report.json` (floor fields verbatim + the
  advisory `verifiers` block)
- ran at the real path (`/Users/pgalarowicz/Projects/pharn-oss`), never in a detached worktree

## FLOOR layer — the gates (owns the verdict)

| gate                                           | exit | note                              |
| ---------------------------------------------- | ---- | --------------------------------- |
| `test`                                         | 0    | **2066 / 2066 pass · 0 fail**     |
| `validate` (`pharn/floor/validate.mjs .`)      | 0    | structural floor GREEN            |
| `lint`                                         | 0    | eslint clean                      |
| `format:check`                                 | 0    | prettier clean, repo-wide         |
| `lint:md`                                      | 0    | markdownlint clean, repo-wide     |
| `structural:…/expected-injection-comment.json` | 0    | the one committed eval pair       |
| `reconcile`                                    | 0    | `CLEAN` — no Bash escape detected |

## VERDICT (floor — `check-verify.mjs`, exit 0)

**VERIFIED: floor gates PASS.** `failing_gates: []`.

The threshold is absolute (`PASS iff every gate exit 0`). Nothing in this verdict is judgment — the
helper compared integers.

## The first run FAILed, and that record stands

This is the second `/pharn-dev-verify` of the increment. The first returned **FAIL** on `test`: 20
failures / 2066, all inside the three in-flight hook suites, because they assert the **patched** guard
behavior while the guards were still unpatched. The guards are fix #2-protected control surface the agent
cannot write, so the patch was staged for a human rather than applied — the designed stop, recorded in
`SHIP.md` as a RED-verdict STOP with `lesson: not-reached (verify)`.

`apply.sh` then ran the three hook suites **on the applied bytes** before committing: **222 / 222 pass**.
This run re-checks the whole repo with the patch in place: the same 20 assertions are now green, and the
other 2046 tests stayed green — the patch broke nothing that was passing.

Both records are kept. A FAIL that later passes is not retroactively a pass, and this document does not
overwrite the history of the run that failed.

## `reconcile` gate — CLEAN, and its window is narrower than it looks

`check-bash-reconcile.mjs --base . --require-baseline` → `CLEAN` (exit 0): epoch
`2026-09-18T09:09:22.818Z`, `anchored_by: hook-cwd-anchoring-apply`, `reconciled: 2`, `escapes: []`,
`exempted: []`.

**State the bound plainly: `apply.sh` re-anchored the epoch as its last step, so this CLEAN covers only
the window from that re-anchor to now — two paths.** It does **not** re-certify the build→apply window;
that was the _previous_ epoch (`anchored_by: pharn-dev-build`, `reconciled: 13`), which reported `CLEAN`
at the first verify and again inside `apply.sh` before the patch went in. Each anchor RESETS the
baseline, which is exactly why a later anchor cannot be used to launder an earlier escape — and equally
why a single `CLEAN` line must not be read as covering the whole increment.

The contract's standing bounds are unchanged: detection, never prevention; git-ignored paths are outside
the reconciled set; one worktree per session; **no attribution**; the checker runs from the worktree it
judges; and the baseline is unauthenticated state under `.pharn/` that Bash can reach. An accounting tool
against tooling that escapes its scope — **not** a control against an attacker.

## ADVISORY layer — verifiers

**No verifiers registered — floor gates only.** `pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}` (a deterministic `role:` frontmatter read, never a prose grep). Step 2
is a no-op. No advisory free-text was produced, so nothing untrusted entered this report — and nothing
advisory could have reached the verdict regardless: `check-verify.mjs`'s only input is the
gate→exit-code map, which cannot carry a finding.

## The honest residual (P0/P7)

**Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates
check** — verifier concerns are advisory help, not assurance.

Three bounds this increment specifically must not be read past:

- **The gate SET is advisory composition.** `check-verify.mjs` is generic over gate keys; that
  `format:check` / `lint:md` / `reconcile` sit in the map is this command's orchestration, not a
  floor-locked fact.
- **A green suite means the suite passes, not that the jurisdiction model is right.** The tests encode
  this increment's own understanding of work-tree roots; a defect they do not encode stays invisible.
- **`hook-wiring.test.cjs` pins the COMMITTED command strings, not the live wiring.** It executes the
  two commands from `settings.json` under `sh -c` from a subdirectory and requires the anchored form to
  start and the old relative form not to. It cannot prove Claude Code loaded that file this session — no
  floor primitive reaches the running harness. That gap is the deferred `hook-wiring-check`.

## Stage outcome

`/pharn-dev-verify` **PASSES**. Under `/pharn-dev-ship` the chain proceeds to `/pharn-dev-review`, then
**GATE 2** — where the human decides merge / fix / abandon, and Step 2b proposes at most one lesson.
