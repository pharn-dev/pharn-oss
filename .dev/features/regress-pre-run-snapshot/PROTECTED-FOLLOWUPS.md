# PROTECTED-FOLLOWUPS — regress-pre-run-snapshot

`LIMITS.md` is human-only (`.claude/hooks/protect-trusted-paths.cjs`). This increment makes two of its sentences
incomplete. Neither is edited here; a human applies (or declines) each replacement below.

## 1. `LIMITS.md` §6, "Older partial backstop" — INCOMPLETE (a bound is missing; read alone, the first clause overclaims)

**Why.** Inside a `/pharn-loop` or `/pharn-ship` run, `/pharn-regress`'s partition and `check-quick-scope.mjs` no
longer count every undeclared changed path: one that was already changed when the run began, and whose bytes still
equal the run's pre-run snapshot, is reported (`pre_run_snapshot.unchanged`) and not counted as an escape. The
`check-regress.mjs scope` CLI itself is unchanged, so the sentence's first clause stays literally true of the CLI, but
the bound list ("Four bounds") no longer describes the rule the two callers apply.

**Current text (exact):**

```text
- **Older partial backstop, advisory and still present.** `pharn/floor/check-regress.mjs scope` exits 1 on a changed
  path the plan's `## Files` did not declare (since 6.17.0 `/pharn-regress` also declares
  `AC-TESTS.md`'s), and before 4.0.0 was the only thing in the tree that could surface such a
  write after the fact. Four bounds, every one stated in that checker's own header: it fires only if
  `/pharn-regress` runs, or when `check-quick-scope.mjs` (6.28.0) applies that rule — for `/pharn-ship --quick`'s
  item 7 and for every `/pharn-loop --quick` iteration — to inputs it builds by code exactly as that stage's script
  does, without the rest of that stage; it compares _changed since base_, not _written by the build_; it carries
  closed-enum exemptions for the pipeline's own artifacts; and a plan that edits its own `## Files`
  (or its `AC-TESTS.md`) defeats it. A smoke alarm, never the guard.
```

**Proposed replacement:**

```text
- **Older partial backstop, advisory and still present.** `pharn/floor/check-regress.mjs scope` exits 1 on a changed
  path the plan's `## Files` did not declare (since 6.17.0 `/pharn-regress` also declares
  `AC-TESTS.md`'s), and before 4.0.0 was the only thing in the tree that could surface such a
  write after the fact. Five bounds, every one stated in that checker's own header or in
  `pharn/floor/pre-run-snapshot.mjs`'s: it fires only if
  `/pharn-regress` runs, or when `check-quick-scope.mjs` (6.28.0) applies that rule — for `/pharn-ship --quick`'s
  item 7 and for every `/pharn-loop --quick` iteration — to inputs it builds by code exactly as that stage's script
  does, without the rest of that stage; it compares _changed since base_, not _written by the build_; it carries
  closed-enum exemptions for the pipeline's own artifacts; a plan that edits its own `## Files`
  (or its `AC-TESTS.md`) defeats it; and, inside a `/pharn-loop` or `/pharn-ship` run (6.37.0), a path already
  changed when the run began whose bytes still equal the run's pre-run snapshot is reported, not counted — so a build
  that writes such a path back to its pre-run bytes is not seen, a path an earlier run escaped with is pre-run state
  for a re-run (reported, not refused), and the snapshot, kept in the git dir out of the write tools' reach, can be
  forged through `Bash`. A smoke alarm, never the guard.
```

## 2. `LIMITS.md` §3a, the `/pharn-ship --quick` paragraph — STALE by reference (reads as an overclaim)

**Why.** "a changed file outside the plan's `## Files` still stops the run" is now false for a file that was already
changed, with the same bytes, when the run began. The sentence is qualified by "within the bounds §6 states for that
check", so once §6 carries the fifth bound (item 1) it is accurate; until then it overclaims. The smallest fix names
what the check now asks.

**Current text (exact):**

```text
> `/pharn-regress`'s scope check (a changed file outside the plan's `## Files` still stops the run, within
> the bounds §6 states for that check) and `/pharn-verify` with its AC gate. It leaves out: **the regression
```

**Proposed replacement:**

```text
> `/pharn-regress`'s scope check (a file the run changed outside the plan's `## Files` still stops the run, within
> the bounds §6 states for that check) and `/pharn-verify` with its AC gate. It leaves out: **the regression
```

## 3. Grill additions (GRILL.md #1, #3) — folded into item 1, recorded here so the reason survives

- **#1, the re-run bound:** item 1's proposed text names it ("a path an earlier run escaped with is pre-run state for
  a re-run"). It is inherent: the recorded case this increment passes (an abandoned run's leftover folder) is an
  earlier run's output too. `/pharn-loop` never commits such a path (Step 6c stages plan scope ∪ the feature's
  artifacts ∪ pinned tests), and `pharn-regress.md`'s remedy text says a re-run does not clear an escape.
- **#3, a pre-run-changed test file is not compared at regress:** no trusted-doc sentence claims every outside test is
  compared, so nothing here is made false. The claim it qualifies lives in `.claude/commands/pharn-regress.md`'s
  "Guaranteed" bullet, which this increment edits directly (not a protected path).

## Checked and unaffected

- `LIMITS.md` §3a's `/pharn-loop --quick` paragraph ("the scope check (within the bounds §6 states for that check; it
  leaves no record …)") makes no per-file claim; it stays true once §6 carries item 1.
- `pharn/ARCHITECTURE.md` §6 ("`regress`'s scope check alone") and `THREAT-MODEL.md` make no claim about which changed
  paths the check counts.
- `pharn/CONSTITUTION.md` — no sentence touches the partition.
