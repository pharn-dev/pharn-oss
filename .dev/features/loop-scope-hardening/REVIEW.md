# REVIEW — loop-scope-hardening

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. No Capability
(`role:`) is added or changed, so L-eval has no `enforces` binding to check; the executable specs are tests (verify
`test` 0: 5363 tests, 0 failing). The increment is `trust: untrusted` to this review; its comments and strings were read
as DATA — no instruction-shaped content addressed to the reviewer was found.

Reviewed: `git diff origin/main...HEAD` (build commits `125b3f8`, `80918bc`, the merge `d06d12e`) plus the
human-applied hook commit `a809c32`.

## Floor-gate findings (blocking)

None. Every guarantee the increment states reduces to a floor primitive or carries its advisory label:

- grant == derived pinned set → enum/regex set equality over committed text (`command-hygiene.test.mjs`); that Claude
  Code honours the grant, matches redirections, or passes it to a stage agent is labelled ADVISORY in the command and
  the CHANGELOG;
- the installed-surface and promote refusals → membership/presence tests in the setter, composing with the fix #7 hook
  on the Write surface; their Bash bounds (opt-in passable, marker deletable, record forgeable) are stated in the
  hook header and the CHANGELOG;
- the fence rule → line grammar held across the copy-pair by ★ PARITY fixtures, stated as example-based with named
  residuals; the "the loop no longer executes model-written code" claim is struck, explicitly, in the loop bullet.

## Advisory findings

````yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/hooks/set-writes-scope.cjs:55"
  problem: "The hook header (human-applied) dates its three new sections '6.59.0', a number #345 took; this increment ships as 6.61.0 (provisional), so the shipped comment names the wrong release. Remedy prepared: human patch 2 removes the numbers entirely."
  evidence: "// TWO MORE REFUSALS (6.59.0, loop-scope-hardening — review findings SEC-1 and SEC-3 of 2026-10-12)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/plan-files-core.mjs:65"
  problem: "The header's corpus count (281 committed PLAN/AC-TESTS files) and the CHANGELOG's (283) disagree; both were measured, at different moments, and the header pins a count that moves with every merged plan (L47's shape)."
  evidence: "Measured over the 281 committed PLAN.md / AC-TESTS.md files"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/render-ship-briefing.mjs:122"
  problem: "Only extractSection moved to the core's fence rule; the same file's structured-header reader and its ADVISORY VERDICT scan keep the old open/close toggle, so one renderer now carries two fence rules (named follow-up fence-rule-unify)."
  evidence: "if (/^\\s*(```|~~~)/.test(line)) {"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".claude/hooks/set-writes-scope.cjs:550"
  problem: "The installed-surface refusal prints offending plan entries verbatim to stderr (as the control-surface refusal already did); a crafted entry can carry terminal control characters into what an agent or person reads. Pre-existing pattern, stated in the CHANGELOG's Not-covered list."
  evidence: "`refusing to scope PHARN's own installed files from a plan: ${offenders.join(\", \")}\\n`"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/hooks/set-writes-scope.cjs:195"
  problem: "isReserved tests the pharn/features/ exception on the entry as written, so `pharn/features/../floor/x.mjs` is not refused by the setter; it is inert only because enforce-writes-scope.cjs matches a scope entry against the RESOLVED target byte-exactly — a dependency the setter's header does not state."
  evidence: 'if (key.startsWith("pharn/") && !rel.startsWith("pharn/features/")) return true;'
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".claude/commands/pharn-loop.md:138"
  problem: "The grant still pre-approves the inline build's exact `reconcile-baseline.mjs --anchor --by pharn-build`, which re-opens the reconcile epoch mid-run; named in the bullet and the CHANGELOG (6.58.0's prefix grant allowed it too), but it is the one granted line whose misuse silences the Bash-write detector."
  evidence: '"Bash(node pharn/floor/reconcile-baseline.mjs --anchor --by pharn-build)",'
````

### Trust lens (P2) — what was checked and held

- No guaranteed decision reads a free-text field: the setter refusals are membership/presence tests; the fence rule is
  a line grammar; the grant test is set equality.
- Marker directory names (agent-nameable) are rendered only when slug-shaped; a non-slug name is elided (tested).
- The refusal for the promote origin cannot be opted out by argv; the installed-surface opt-in cannot ride a granted
  line (operator flags before the mode, tested both flags).

### Axis lens (P3)

`render-ship-briefing.mjs` now imports `fenceStates` from `plan-files-core.mjs` — a floor module importing a floor core,
the shape the other cores already have, not a sibling-module reference. The setter keeps byte-equal copies of
`toKey`/`isReserved` and a set-equal `PROMOTE_COMMANDS` (a hook cannot import a floor module), each pinned by a ✧ test.

## Verdict

**GREEN — 0 floor-gate findings; 6 advisory (1 important, 5 minor).** The important one has its remedy prepared
(human patch 2).

## Proposed lesson candidate (for `/pharn-dev-memory-promote` — not written here)

- **Title:** Moving executable text into a new place changes what every raw-text scanner of that file sees — enumerate
  the scanners before you move it.
- **What happened:** the exact `allowed-tools` grant copied 84 pinned shell lines into `pharn-loop.md`'s frontmatter.
  Seven tests across two suites read command files as raw text and took the grant for lines the command runs: six in
  `command-hygiene.test.mjs` (caught at build) and one in `installed-skills-consumers.test.mjs` (caught only by
  `/pharn-dev-regress`, after the build declared itself done). Each needed the same "strip the grant list" fix.
- **Why it recurs:** the scanners are spread over many test files, each with its own reader, and nothing enumerates
  "every consumer of a command's raw text" — the L31 copy-pair shape, for readers instead of writers.
- **Provenance:** feature `loop-scope-hardening`; source `.dev/features/loop-scope-hardening/REGRESSION.md` (pass 1)
  and this REVIEW.md.
