# PLAN — run-gates-lock-claim-site

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838 # fix #4
- applied_lessons: [L1, L29, L36, L37, L47]
- increment: Close the check-then-use pair CodeQL still reports in `takeLock()` — the gate runner claims
  its lock with `openSync(lp, "wx")` at TWO call sites, and the first dominates the second, which is the
  same `js/file-system-race` shape (alert 7, security-severity high) the PR's own first fix was written
  to remove. Also retract the comment that fix left behind, which claims a race the protocol does not win.
- layer(s): none — `pharn/floor/` is floor infrastructure, not a capability; no contract, no `role:`
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- L1 — `pharn/floor/run-gates.mjs` is named in CLAUDE.md's bump-triggering set (a product-floor `.mjs`
  that is not a `*.test.mjs`), so this increment invalidates three meta-doc facts at once:
  `SKILLS_VERSION`, the `CHANGELOG.md` entry keyed to it, and the README shields badge `check:badge`
  holds to it. L1's remedy is to name those meta-docs in `## Files` rather than leave them to a later
  sweep, so all three are listed below.
- L29 — This is L29's exact shape, and the set is the one CodeQL ranges over. The first fix (commit
  `81cb673`) removed the `existsSync(lp)` member of the check-then-use pair and asserted nothing, so the
  pair simply re-formed around the member it added — a second `wx`. Per L29 the deliverable is the
  ENUMERATION materialized in one place: the new pin matches EVERY `openSync(lp…)` occurrence in the
  file and requires the list to be exactly one element, so a call site added later fails without anyone
  having to remember this class.
- L36 — The pin is a CLOSURE, not a presence test. A presence assertion ("`claimLock` contains an
  `openSync(lp, "wx")`") is green for a file that also opens `lp` somewhere else, and the flag string is
  exactly the parameterized fragment L36 names as where a variant spelling lands — so the enumeration
  collects every `openSync(lp` occurrence, whatever its flags, and `deepEqual`s the list.
- L37 — The claim "alert 7 is resolved" is PROBED to the limit this machine allows and labelled for the
  rest. The CodeQL query itself was fetched and read this run (`FileSystemRace.ql`), which is what
  establishes that `openSync` is a member of BOTH its `FileCheck` and `FileUse` classes and that
  `useAfterCheck` needs the check's basic block to STRICTLY dominate the use's — i.e. a single call site
  cannot pair with itself. No CodeQL CLI is installed here (`which codeql` → not found), so the verdict
  is settled by the next analysis on push, and the guarantee audit says so rather than claiming a
  resolution nothing here executed.
- L47 — The comment being retracted ("Two concurrent recoveries still cannot both win: the second `wx`
  decides") is a false quantifier, and L47 is the rule for HOW to retract one: replace the form, never
  substitute a new closed count. The replacement states what the exclusive create does decide (a race for
  an UNHELD name) and names the case it does not (two recoverers of the same incumbent), without
  asserting a new "only" about the remaining behaviour.

## Files

- `pharn/floor/run-gates.mjs` — `takeLock()` claims through ONE `openSync(lp, "wx")` call site; the
  stale-recovery path calls the same helper again instead of reopening inline; the false-quantifier
  comment is retracted and the residual named
- `pharn/floor/run-gates.test.mjs` — the closure pin over the file's `openSync(lp…)` call sites, plus the
  unreadable-lock recovery case the restructure makes a distinct branch
- `SKILLS_VERSION` — bump 6.8.0 → 6.8.1 (patch: a correction to bytes already on the product surface)
- `CHANGELOG.md` — the `[Unreleased]` → `### Fixed` entry recording the bump
- `README.md` — move the shields badge 6.8.0 → 6.8.1 so `check:badge` stays GREEN
- `.dev/features/run-gates-lock-claim-site/PLAN.md` — this file (apparatus; no bump)

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — unchanged. No field of the stamp, the in-progress record
  or the lock's own `{pid, started_ms, timeout_ms}` payload moves; only the syscall sequence that creates
  the lock file changes. Cited, not restated (P4).

## Evals to write (P1)

- None, by membership test: P1 binds capabilities, and a file becomes a capability the moment its
  frontmatter carries `role:`. No file in `## Files` carries one and none is added, so the obligation
  does not attach. The floor's own coverage obligation is discharged by `*.test.mjs`, which is where
  every other `pharn/floor/` checker's is.

## What is being fixed (measured live this run — P6)

`gh api repos/pharn-dev/pharn-oss/code-scanning/alerts/7` reports `js/file-system-race` (CWE-367,
security-severity **high**, state `open`) at `pharn/floor/run-gates.mjs:237`, pairing it against the
check at `:220`. Its `most_recent_instance.commit_sha` is `04857b3` — the merge commit of PR #230, i.e.
the alert is live against `main` as it stands, not a stale instance. The PR's review thread carrying it
is `isResolved: false`; the thread for alert 6 above it is resolved and outdated, which is the FIRST fix
having moved the defect rather than removed it.

The surviving pair, read at those line numbers this run:

- `:220` `fd = openSync(lp, "wx")` — the claim attempt. Under the query this is a `FileCheck` (`openSync`
  is a member of its member list, alongside `existsSync`/`statSync`/`accessSync`).
- `:237` `fd = openSync(lp, "wx")` — the retry after a stale lock is unlinked. Under the query this is a
  `FileUse`, and `:220`'s basic block strictly dominates it, so the pair is reported.

Commit `81cb673`'s comment says the exclusive create "IS the claim — no `existsSync` first (that is a
TOCTOU / CodeQL `js/file-system-race`)", which is right about `existsSync` and incomplete about the rule:
the query's `FileCheck` class contains `open`/`openSync` too, so replacing one member of the pair with a
second `wx` leaves the pair intact. The fix is to have exactly ONE call site. `claimLock(lp, timeoutMs)`
holds it and returns `{held, busy}`; `takeLock()` calls it, and on `busy` reads the incumbent,
stale-checks it, unlinks it and calls the SAME helper again. `useAfterCheck` requires the check's basic
block to **strictly** dominate the use's (or to precede it by index within one block), and neither holds
for a node against itself, so one site cannot pair with itself.

**Nothing about the lock protocol changes.** Same refusals, same two messages, same `reason_code`
(`lock-busy`), same recorded payload, same `Date.now()` capture at write time. The behaviour the existing
three lock tests pin — a LIVE lock refuses, a DEAD-PID lock and an AGED lock are recovered, a normal call
releases — is unchanged, which is the regression control for this restructure.

**One comment is retracted, and it is the reason this increment touches prose at all.** `81cb673` also
wrote "Two concurrent recoveries still cannot both win: the second `wx` decides." That is false, and the
interleaving is short enough to state in full: A and B both read the same stale incumbent; A unlinks and
creates, so A holds; B then unlinks **A's fresh lock** and creates its own, so B holds too. The exclusive
create decides a race to CREATE on an unheld name; it cannot decide a race to REMOVE a held one, because
POSIX has no conditional unlink. The pre-existing protocol is unchanged here — only the sentence is.

## Guarantee audit (P0)

- "the lock file is created by exactly one of two racing claimants" → **floor: the operation itself.**
  `O_CREAT|O_EXCL` is atomic in the kernel; nothing in this increment weakens it, and the LIVE-lock test
  is the executable form.
- "no second path-addressed claim can be added back to this file" → **floor: enum-regex (primitive #3)**
  — the closure pin, which collects every `openSync(lp…)` in the source and requires the list to equal
  one element.
- "an unreadable lock record is recovered rather than trusted" → **floor: the new test**, which writes
  a non-JSON lock and requires the next `run --next` to proceed (`readJson` fails → `lock` is `null` →
  `isStaleLock(null)` is `true`).
- "CodeQL alert 7 is resolved" → **advisory, and it must not be written as anything else.** No CodeQL
  CLI is installed on this machine, so nothing in this run executes the analyzer that raised it. What was
  executed is the reading of the QUERY (fetched this run) against the restructured source; whether the
  analyzer agrees is settled by the next analysis on push (L37).
- "two concurrent RECOVERIES cannot both hold the lock" → **struck. Not claimed, and the comment that
  claimed it is removed.** See the residual below; no new closed count replaces it (L47).
- "6.8.1 is the correct bump size" → **advisory** — CLAUDE.md's patch/minor/major rule is prose applied
  by judgment; no checker reads it. Patch: a correction to bytes 6.8.0 already put on the product
  surface, no capability, command or checker added, every success path byte-identical.

## Trust audit (P2)

Two untrusted inputs are consulted and both are read as DATA. (1) The CodeQL alert body over `gh api` —
a rule id, a path, two line numbers, a commit sha — every claim taken from it re-derived against local
bytes (the lines were read at those numbers; the commit was matched against `git log`). Nothing in its
`help` prose is followed as an instruction. (2) `FileSystemRace.ql`, fetched over HTTPS and read as the
rule's text; it is quoted for its class membership and its `useAfterCheck` predicate, and no part of it
is executed. The lock record itself is unchanged in trust: it is ordinary `.pharn/` state a Bash write
reaches, which is why `isStaleLock()` shape-gates every field it reads and treats a malformed record as
stale rather than as authority.

## Determinism audit (P5)

No branch is added and none is removed. The `{held, busy}` return is a two-field record over the same
two outcomes the old `try`/`catch` distinguished (`EEXIST` versus every other `e.code`), and the
recovery path's guard is the same `isStaleLock()` call on the same input. The one judgment in the
increment — the bump size — is CLAUDE.md's rule applied by a human, recorded in the CHANGELOG entry
where a reader can dispute it.

## Known residuals

- **The stale-recovery race is unchanged, now named instead of denied.** Two runners that both judge the
  same incumbent stale can interleave unlink/create so that both end up holding the lock. Closing it needs
  a second protocol — an exclusive tombstone keyed to the incumbent's bytes, which itself introduces a
  wedge if its winner crashes between unlink and create — and no observed run has produced the race
  (it needs a crashed runner AND two simultaneous recoverers). Per P7 that is a hypothetical, so the
  residual is recorded and the protocol is not built. Named `run-gates-lock-recovery-race`.
- **The class is closed for THIS file only.** `spawnGate()` and `runSync()` each open two log files by
  name, but on distinct variables and in distinct functions, so neither forms the rule's pair; `:143`,
  `:305` and `:582` are exists-then-read, which the query excludes explicitly. No other `pharn/floor/`
  file was audited for this class in this increment.
- **The pin is over SOURCE TEXT, not over behaviour.** It proves one call site exists in the file; it
  cannot prove the claim is atomic (the kernel's `O_EXCL` is), and it would not notice a path-addressed
  open written against a variable other than `lp`.
