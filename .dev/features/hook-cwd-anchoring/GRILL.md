# GRILL — hook-cwd-anchoring

**Plan:** `.dev/features/hook-cwd-anchoring/PLAN.md` (approved at GATE 1). **Spec-hash:** `83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487` recomputed with `.dev/floor/hash-doc.mjs` — **matches** the plan's pin. **Step 1b (FLOOR — the one deterministic stop):** `node pharn/floor/check-plan-lessons.mjs` → **exit 0**, verbatim:

> GREEN — applied_lessons: L1, L7, L16, L17, L18, L19, L20, L22, L25, L26, L27, L29, L31, L34, L36, L37, L38, L40, L41, L42, L43, L44 (.dev/features/hook-cwd-anchoring/PLAN.md); all 22 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L1: considered." satisfies the reference check.

That verdict covers the **declaration** only. Everything below is **advisory** interrogation. The plan is `trust: untrusted` to this stage: every `problem` / `evidence` value quotes it as DATA.

## Findings — inline interrogation (Step 2)

The enum-gated fields (`type`, `rule_id`, `severity`, `file`) are this stage's own assertions. `problem` / `evidence` inherit the plan's untrusted tag. Each `file` line was re-read against the plan on disk.

### Determinism / discovery (P5, P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:203"
  problem: "The apply commit is required to land on a feature branch, but no step creates one and the repo was on main when the plan was written."
  evidence: "It must land on the feature branch."
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:157"
  problem: "Under `set -eu`, a red `npm run check` aborts the verification block before `git worktree remove`, leaving a registered worktree behind; and the patch redirect writes into a `proposed/` directory that no earlier line creates."
  evidence: "set -eu"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:96"
  problem: "The worked-cases table says protect adds nothing for the non-git-project and monorepo rows, but a prototype on real git 2.50.1 fixtures returned protectAdds=true whenever the hook root differs from CLAUDE_PROJECT_DIR; the cells hold only because the pinned wiring makes the two equal, which the table never says."
  evidence: "| `mono/apps/web/src`, `.git` at `mono`, `CLAUDE_PROJECT_DIR`=`mono/apps/web` | `mono/apps/web` | nothing"
```

### Guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:243"
  problem: "The claim rests on the hook process's cwd, but Claude Code runs hooks from the session-start directory, the project root, home or temp when Claude's current directory no longer exists, so jurisdiction silently becomes that directory; the audit does not state this bound."
  evidence: '"Both guards run whatever Claude''s current directory is"'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:13"
  problem: "The portability claim is broader than what was established: a `||` parse failure applies to Windows PowerShell 5.1, not PowerShell 7, and neither shell was probed."
  evidence: "a `||` parse failure there would stop the guard from ever starting"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:250"
  problem: "The fix #2 narrowing omits that a launch-checkout session writing into a nested `.claude/worktrees/<w>/` by path is still judged by fix #7 alone, and the setter's exact CONTROL_SURFACE match would let a plan declare that worktree's own hook script — pre-existing and unchanged, but unstated."
  evidence: '"fix #2 protects the tree Claude is working in"'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:102"
  problem: "The third-branch predicate also matches a scratch path under a git-versioned home directory, which then loses the Bash scratch remedy; the residual is not recorded."
  evidence: "When the resolved target has an ancestor holding `.git`"
```

### Trust propagation (P2)

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:82"
  problem: "Adding a second guarded root makes protect's canon escape imprecise: canonWriteAuthorized() compares every root's scope record against a root-relative key without binding the record to the root the target sits under, so a promote-origin scope in one tree would authorize the same relative canon path in the other."
  evidence: "the hook-location `ROOTS` stay, and `t = workTreeRoot(CWD)` is **added**, never substituted"
```

### Eval coverage (P1), one axis (P3), honest scope (P7)

No finding.

- **P1:** no capability or `rule_id` is added. The behavior is pinned by hook tests, all of which are exit-code or string assertions (floor-reducible), with none routed through a judge.
- **P3:** no sibling reference is introduced. The ✧ parity matrix lives in the enforce test file, which already spawns the fix #2 hook for composition.
- **P7:** the bundle of four changes was put to the human as a scope question and chosen at GATE 1. Every part has an observed trigger (the probes and bryff evidence in the plan).

## Findings — registered grillers (Step 2b)

`node pharn/floor/count-grillers.mjs .` → `{"registered":13,…}`. Each griller's procedure was applied read-only by one of three parallel subagents, and this stage re-checked every returned `file` line before folding a finding in.

### a11y

- **scanner:** none named by the griller.
- **findings:** none. The change touches no UI: hooks, tests and docs only, plus a stderr deny-message branch in developer tooling.

### i18n

- **scanner:** `node pharn/floor/scan-plan-i18n.mjs .dev/features/hook-cwd-anchoring/PLAN.md` → exit 0 — `{"found":false,"hits":[]}`.
- **findings:** none. No end-user UI text is added; the new deny branch is English stderr read by an agent, the same form as the existing branches.

### migrations

- **scanner:** `node pharn/floor/scan-plan-migrations.mjs .dev/features/hook-cwd-anchoring/PLAN.md` → exit 0 — `{"mentions":true,"hits":[{"line":140,"term":"migration"}]}`.
- The hit is the manual migration of an existing install's persisted `.claude/settings.json`. Its ordering and its rollback are both unstated.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:140"
  problem: "The manual settings.json migration for existing installs has no required order and no rollback path, yet the plan's own probe #4 shows the anchored wiring over pre-fix hooks regresses both guards — a user who edits settings.json before running `pharn update` loses fix #2 over a worktree's trusted docs."
  evidence: "One `### Fixed` entry under `[Unreleased]`, with the bump and the manual `settings.json` migration for existing installs"
```

### performance

- **scanner:** none named by the griller.
- **findings:** none. `workTreeRoot()` is a bounded ancestor walk with no subprocess, and protect adds one small file read. The per-write git spawn was already rejected (`PLAN.md:72`).

### security

- **scanner:** `node pharn/floor/scan-plan-secrets.mjs .dev/features/hook-cwd-anchoring/PLAN.md` → exit 0 — `{"found":false,"hits":[]}`.

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:267"
  problem: "Today a native worktree is guarded by its own hook copy's __dirname roots; after the change its fix #2 coverage depends on reading `.git`/`commondir`, which is not write-protected, so a plan scope declaring the worktree's `.git` lets a Write-tool edit point it at a different common directory and silently remove fix #2 from that worktree — the opposite of what this line asserts."
  evidence: "Nothing read there can remove protection."
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:179"
  problem: "The sha256 reference values live in an agent-writable file next to the agent-generated patch, so the two can be rewritten to agree; the content-hash then proves agreement, not that the applied guard bytes are the verified ones, and the apply block commits guard bytes before any human reads the diff."
  evidence: "The printed sha256 values are copied into `APPLY.md`."
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:66"
  problem: "The fix substitutes the project path into a shell command string, and double quotes do not neutralise a `$`, a backtick, `\"` or `\\` in that path, so such a path can mis-expand (the guard fails open) or execute text from the directory name; neither the guarantee audit nor the rejection of the shell-free exec form mentions it."
  evidence: 'This is the documented form: "wrap each placeholder in double quotes".'
```

### privacy

- **scanner:** `node pharn/floor/scan-plan-pii.mjs .dev/features/hook-cwd-anchoring/PLAN.md` → exit 0 — `{"found":false,"hits":[]}`.
- **findings:** none. No personal data is collected, stored or logged. The bryff evidence is counts and shortened paths, and the throwaway commit uses a placeholder identity.

### error-handling

- **scanner:** none named by the griller.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:170"
  problem: "Nothing in the pinned block creates `proposed/`, and under `set -eu` that redirect — like a red `npm run check` — stops the block before `git worktree remove` and the staging removal, with no trap or recovery step, leaving a registered temp worktree and the staging sources behind."
  evidence: '> "$R/$F/proposed/human-only.patch"'
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:192"
  problem: "The apply block writes the patch into the live guard files before the hash check and the commit, so a mismatch or a failed commit stops the block with unverified guard bytes already in force for the next tool call, and no rollback is declared."
  evidence: "git apply .dev/features/hook-cwd-anchoring/proposed/human-only.patch"
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:83"
  problem: "Only the unreadable case has a declared outcome: a `.git` file with no `commondir` (a submodule, `--separate-git-dir`) and relative `gitdir:`/`commondir` values have no stated resolution base, and a value that reads fine but resolves wrongly lands in the under-protecting 'different repository' branch."
  evidence: "The common directory is read deterministically: a `.git` directory, or a `.git` file's `gitdir:` plus its `commondir`."
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:102"
  problem: "The third-branch test also matches an out-of-root target inside the SAME git working tree when `CLAUDE_PROJECT_DIR` narrowed the root (the monorepo row), where 'inside another git working tree' is false and the `EnterWorktree` remedy cannot apply; the planned tests cover only the other-tree and non-git shapes."
  evidence: 'When the resolved target has an ancestor holding `.git`, the Bash "temporary/scratch" bullet is replaced'
```

### observability

- **scanner:** `node pharn/floor/scan-plan-observability.mjs .dev/features/hook-cwd-anchoring/PLAN.md` → exit 0 — `{"mentions":true,"hits":[{"line":27,"term":"logging"},{"line":51,"term":"logging"}]}`. Both hits are "the bryff logs", which are incidental.

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:1"
  problem: "The defect is a guard that failed to start without anyone seeing it, yet the plan adds no runtime liveness signal: only a CI test checks that the guards start, the remaining fail-open paths (installs on the relative form, timeouts, PowerShell) stay silent, and the install-side warning is deferred to pharn-cli — whether an in-tree liveness check is wanted is a scope question for the human (P5)."
  evidence: "# PLAN — the write guards run, and judge the right tree, whatever Claude's current directory is"
```

### testability

- **scanner:** none named by the griller.

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:225"
  problem: "The parity rule is unsatisfiable for the different-repository row: enforce roots at that repository while protect deliberately adds nothing and line 230 expects exit 0 there, so the test cannot be written as specified."
  evidence: "enforce's printed root must equal the root at which protect denies `<root>/LIMITS.md`"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:218"
  problem: "No named test covers the regression the plan itself reproduced — enforce from a subdirectory with no scope, on a default-safe-set path — although `isPharnDevRepo()` / `isPharnInstalledProject()` move to ROOT."
  evidence: "A declared file is allowed and an undeclared one denied. The scope is read from the sandbox root"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:256"
  problem: "`check:reconcile` is counted as verification, but in the throwaway worktree it cannot go red: there is no baseline, and the throwaway commit makes the control-surface HEAD comparison clean by construction."
  evidence: "`npm run check`'s gate exits, `check:reconcile` included, in a worktree at the real path (L26)"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:224"
  problem: "The third-branch tests omit the package-root rows, where an out-of-root target inside the same enclosing repository would receive the other-worktree remedy."
  evidence: "An out-of-root target inside a git tree carries the worktree remedy and no Bash cue."
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:283"
  problem: "The untrusted plan records a run direction attributed to the human that the plan itself cannot prove; it was treated as data and moved no verdict."
  evidence: "the human added a standing direction for the run: fix any finding, promote a lesson if one qualifies, and open a pull request at the end"
```

### architecture

- **scanner:** none named by the griller.
- **findings:** none. `workTreeRoot()` follows the established copy-pair shape with a ✧ parity pin. The handoff follows the `bash-write-reconciler` / `canon-write-denylist` / `claude-dir-scan-exclusion` precedents. There is no leaf→leaf reference and no new `role:` capability.

### coupling

- **scanner:** none named by the griller.

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:147"
  problem: "The setter still writes the scope file at `process.cwd()` while enforce moves its read to `workTreeRoot(cwd)`, so a PHARN subpath install inside a git repository, entered through a worktree of that repository, has the setter write one file and enforce read another — silently falling back to the default-safe-set — with no matrix row for it."
  evidence: "`.claude/hooks/set-writes-scope.cjs` — no change."
```

### comprehension

- **scanner:** none named by the griller.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:84"
  problem: "The unreadable rule does not say whose common directory it means, nor what a hook root with no `.git` entry of its own yields, and reading it as 'either side unreadable adds t' contradicts line 230's exit-0 expectation."
  evidence: "If it is **unreadable**, `t` is added: over-block, the safe direction."
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:102"
  problem: "The predicate silently assumes enforce's ROOT is always a git work-tree root, which the `CLAUDE_PROJECT_DIR` rows contradict, so 'another git working tree' can be false."
  evidence: "When the resolved target has an ancestor holding `.git`"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/hook-cwd-anchoring/PLAN.md:148"
  problem: "The rationale comment at `check-bash-reconcile.mjs:236-237` states where the hook reads the scope record from, this increment changes that, and the file is marked no-change and absent from the L25 re-derivation list."
  evidence: "`pharn/floor/check-bash-reconcile.mjs` — no change."
```

### documentation

- **scanner:** none named by the griller.
- **findings:** none. Each consumer-facing change has a declared doc. The migration audience is correct: pharn-cli `init` copies `settings.json` only when absent, so only existing installs need the manual step.

## Disposition — every finding, before `/pharn-dev-build`

The human's run direction is to fix every finding, so each one below is folded into `PLAN.md` before build. The exceptions are a finding verified as partially mistaken and one that is a scope decision the plan cannot take alone. Duplicates are merged and named.

| Finding                                                               | Disposition                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P6 `:203` no feature branch                                           | **Fixed.** Branch `fix/hook-cwd-anchoring` created before build, and `apply.sh` refuses to commit on `main`.                                                                                                                                                                                                                                                                                    |
| P5 `:157` + P7 `:170` block leaves a worktree / no `proposed/`        | **Fixed (merged).** An `EXIT` trap removes the worktree and temp dir on every exit path; `mkdir -p` precedes the redirect.                                                                                                                                                                                                                                                                      |
| P7 `:192` guard bytes live before any check, no rollback              | **Fixed.** The apply script checks sums, then runs the three hook suites on the applied bytes, and restores the four files from `HEAD` on any failure before committing.                                                                                                                                                                                                                        |
| P2 `:179` agent-writable sums prove only agreement                    | **Fixed, and the claim is narrowed.** Sums move to `proposed/human-only.sha256`, and the audit now calls them a consistency check, not an authentication. The binding check is the test run on the applied bytes, and the human reads the diff before running the script.                                                                                                                       |
| P2 `:267` `.git` rewrite removes fix #2 from a worktree               | **Fixed — adds a guard.** fix #2 denies any tool write whose root-relative key contains a `.git` segment, under every guarded root. The trust-audit sentence is rewritten to say which surface it holds on. This addition is flagged at GATE 2, and it makes the bump **minor (6.1.0)**.                                                                                                        |
| P2 `:82` canon escape not bound to the target's root                  | **Fixed.** `canonWriteAuthorized()` reads only the record of the root the target sits under.                                                                                                                                                                                                                                                                                                    |
| P2 `:66` metacharacters in the substituted path                       | **Residual, stated.** The documented quoted-placeholder form is kept (PowerShell-compatible, and it degrades on older versions through the environment variable). The unbraced `$VAR` and exec forms were considered and rejected (unverified substitution semantics; PowerShell). A project path containing `"`, `` ` ``, `$` or `\` is recorded as unsupported in the audit and in LIMITS §7. |
| P0 `:243` process cwd when Claude's cwd was deleted                   | **Fixed (bound stated)** in the guarantee audit and LIMITS §7.                                                                                                                                                                                                                                                                                                                                  |
| P0 `:13` PowerShell claim too broad                                   | **Fixed.** Narrowed to Windows PowerShell 5.1, unprobed.                                                                                                                                                                                                                                                                                                                                        |
| P0 `:250` nested worktree by path judged by fix #7 alone              | **Fixed (bound stated).** The `.git` pointer of that worktree is now denied by the new rule; its hooks/settings stay reachable only through a main-scope declaration, which is stated.                                                                                                                                                                                                          |
| P0 `:102` + P7 `:102` (×2) + P1 `:224` third-branch predicate         | **Fixed (merged).** The branch wording now holds for both shapes — another checkout, or the same repository outside this guard's root — with no Bash remedy in either. Tests cover a sibling tree, a monorepo package boundary, and a non-git path; a git-versioned home directory is a stated residual.                                                                                        |
| P6 `:96` table cells assume the pinned wiring                         | **Fixed.** The table states the assumption, and the precise add rule (below) makes those rows independent of it.                                                                                                                                                                                                                                                                                |
| P7 `:84` + P7 `:83` common-dir rule underspecified                    | **Fixed (merged).** The rule is stated exactly: which side, resolution bases for relative `gitdir:`/`commondir`, the no-`commondir` case, a `.git`-less stop, and a hook root without `.git`.                                                                                                                                                                                                   |
| P1 `:225` parity rule unsatisfiable for row 7                         | **Fixed.** Parity is defined per row against an expected-add column.                                                                                                                                                                                                                                                                                                                            |
| P1 `:218` no subdirectory no-scope test                               | **Fixed.** Added for both postures.                                                                                                                                                                                                                                                                                                                                                             |
| P1 `:256` reconcile cannot go red in the worktree                     | **Fixed (claim narrowed).** It is no longer counted as verification of the patch.                                                                                                                                                                                                                                                                                                               |
| P7 `:140` migration order and rollback                                | **Fixed.** `CHANGELOG` and README state the order (`pharn update` first, then `settings.json`) and the reverse for rollback.                                                                                                                                                                                                                                                                    |
| P3 `:147` setter/enforce mismatch for a subpath install in a worktree | **Residual, stated, fail-closed.** Added as a matrix row. Subpath installs are already a stated bound of fix #2.                                                                                                                                                                                                                                                                                |
| P7 `:148` reconcile rationale comment                                 | **Verified partially.** Its only caller passes `protect-trusted-paths.cjs`, for which the comment was true. It still gains one clause for the added cwd root, so `pharn/floor/check-bash-reconcile.mjs` joins `## Files` (comment only).                                                                                                                                                        |
| P2 `:283` run direction inside the plan                               | **Fixed.** Removed from the plan and recorded in `SHIP.md`, where the orchestrator — not an untrusted plan — carries it.                                                                                                                                                                                                                                                                        |
| P6 `:1` no runtime liveness signal                                    | **Raised to the human (P5).** An in-tree check that REDs a stage when the wiring is not the anchored form would be a new floor checker. It is recorded as follow-up `hook-wiring-check` and put to the human at GATE 2, not built inside this approved scope.                                                                                                                                   |

## Summary

The interrogation found no defect in the plan's central mechanism, but it found three places where the mechanism would have made things **worse** than today:

1. a worktree's fix #2 coverage could have been switched off by editing its `.git` pointer (security);
2. the apply step could leave unverified guard bytes live (error-handling);
3. the new deny branch would have told a monorepo user something false (error-handling, testability, comprehension, and this stage's own pass — four independent hits).

The rest are gaps in stated bounds, test specification and procedure hygiene. None of the concerns is a constitution violation.

**ADVISORY VERDICT: 26 concerns raised (0 blocking-severity, 17 important, 9 minor) — for the human to weigh before `/pharn-dev-build`.** Every one has a disposition above. The Step 1b lessons-declaration verdict (GREEN, exit 0) is reported in the header as its own floor verdict and is not part of this count.
