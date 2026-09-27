# GRILL — stage-git-maxbuffer

- plan: `.dev/features/stage-git-maxbuffer/PLAN.md` as approved at GATE 1 (2026-09-27, decided by the orchestrating
  model under the maintainer's delegation), with its "Decisions at GATE 1" section. G4 below is folded into the plan by
  this stage; every `file:` line cites the plan as grilled, before that fold.
- spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` →
  `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` = the plan's `spec_content_hash` — no drift. A
  content-hash (floor-grade), surfaced here only: `/pharn-dev-build` is where drift blocks.
- lessons (Step 1b, FLOOR — the stage's one deterministic stop):
  `node pharn/floor/check-plan-lessons.mjs .dev/features/stage-git-maxbuffer/PLAN.md .dev/memory-bank/lessons-learned.md`
  → **GREEN, exit 0** (14 ids; each resolves in canon and is referenced in the plan body). This verifies the
  declaration, never that the lessons were applied.
- grillers: `node pharn/floor/count-grillers.mjs .` → `registered: 13`; the five `scan-plan-*` scanners (secrets, pii,
  observability, migrations, i18n) each return no hit over the plan.
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route). This is a
  self-grill by the plan's author, and a reader should weigh it as such.

## Findings (advisory — the finding set gates nothing)

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/stage-git-maxbuffer/PLAN.md:135"
  problem: "The closure's exemption is by subcommand NAME, and 'one SHA each' is true of today's four argv lists, not of every flag: `git rev-parse --all` prints every ref and `git merge-base --all` more than one SHA, so a future listing spelled through either name would be exempt without a maxBuffer."
  evidence: "every spawn whose first literal subcommand is not in the closed set `{rev-parse, merge-base}` (one SHA each) carries `maxBuffer` in its call text"
```

Disposition: the test's header states the exemption as a name-level rule with this exact gap; the plan's guarantee
audit already bounds the claim to "the subcommand exemption". No change to the rule.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/stage-git-maxbuffer/PLAN.md:129"
  problem: "'Skips comment lines' is a heuristic with an error in each direction, and the plan states neither: a real spawn written after a `//` inside a string on the same line would be skipped (a false GREEN), and a spawn quoted inside a multi-line block comment without leading `*` would be counted (a false RED, caught by the pinned map)."
  evidence: "The test scans every non-test `pharn/floor/*.mjs`, skips comment lines, extracts each git spawn's full call text"
```

Disposition: the test's header names both, beside the spelling bound (L49 — the sweep's coverage boundary is stated
where the sweep lives). No shipped module has either shape today; the pinned map would expose the second.

### Scope and surface (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/stage-git-maxbuffer/PLAN.md:80"
  problem: "`GIT_MAX_BUFFER` is planned as an export, but nothing imports it: the review emitter carries its own literal by decision (C), the closure checks presence rather than value, and no test needs the number. An export with no importer widens the module's surface for nothing."
  evidence: "`export const GIT_MAX_BUFFER = 1 << 28;` — 256 MiB, the ceiling `enumerate()` already uses"
```

Disposition: **folded into the plan** — `GIT_MAX_BUFFER` is module-private; the Version section's "two new exports"
becomes one (`gitFailureDetail`).

### Documentation and cites (P4, P6)

```yaml
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".dev/features/stage-git-maxbuffer/PLAN.md:301"
  problem: "The follow-up `regress-inside-echo-list` is described in three live places — `stage-regress.mjs`'s comment above `assertRepresentable`, `check-regress.mjs`'s header and CLAUDE.md's quick-scope comment — and the plan extends only the first. The other two stay true (the echo still refuses a comma or newline path) but will not name the size limit."
  evidence: "the extension is recorded under its name (the comment above `assertRepresentable` and the CHANGELOG entry) rather than as a new one"
```

Disposition: left as planned. The owner of the echo is `stage-regress.mjs`, where it is built; neither restatement
becomes false (L64's concern is a widened quantifier, and none widens), and neither file is in the approved `## Files`.
Named here so GATE 2 can widen the diff if it wants the two restatements to carry the size limit too.

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/stage-git-maxbuffer/PLAN.md:299"
  problem: "The plan cites code by line number (`stage-regress.mjs:758-759`, the ten detail sites), and the build shifts those lines. Correct in the plan, which records the tree it was written against, but a stale cite if copied into the CHANGELOG, which is permanent."
  evidence: "The echo is ONE argv element (`stage-regress.mjs:758-759`)"
```

Disposition: the CHANGELOG entry names functions and phases, never a code line (the CLAUDE.md rule for the CHANGELOG,
applied to what it cites).

### Trust (P2)

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/stage-git-maxbuffer/PLAN.md:93"
  problem: "The detail still carries git's whole stderr, uncapped. That is unchanged from today, and an `unusable` exit writes no artifact, so it reaches only the caller's terminal as quoted DATA — but the plan does not say the stderr part is unbounded."
  evidence: "git printed something on stderr → `<stderr, trimmed> (<how>)`; otherwise → `<how>`"
```

Disposition: stated in `gitFailureDetail`'s comment; no cap is added (a cap would change today's detail for an
ordinary failure, and no failure has called for one — P7).

## Grillers (Step 2b — applied inline; advisory)

- **testability** — presence recognized: `## Evals to write (P1)` states none is owed, and E and D name one crossing
  test per entry, an anchor and a mutant per stage test, and a mutation control per closure property. Adequacy → no
  finding; the per-property falsifiers are named in the plan (L60).
- **architecture** — fit recognized. The ceiling and the detail live in the stage scripts' one git owner; the review
  emitter keeps its own literal so its load graph does not grow (P3 considered in C). No finding.
- **comprehension** — the WHYs are recorded: why 256 MiB (the enumerate precedent), why a literal in the emitter, why a
  closure (L20), why no cap on stderr (G above), why one follow-up rather than two. No finding.
- **coupling** — `changedPaths`'s failure shape changes (`stderr` → `detail`); its two callers change in the same diff
  and one test reads it (`which` only). The closure's pinned map couples any future floor git spawn to one test —
  deliberate, approved at GATE 1 (Q2). No finding.
- **documentation** — declaration present: the CHANGELOG entry, the README badge, the module comments. CLAUDE.md and
  the trusted docs carry no sentence this increment makes false (`git grep` for `maxBuffer`, `ENOBUFS`, `git-failed`,
  `1 MiB`, `gitSync`). Adequacy → the `regress-inside-echo-list` finding above.
- **error-handling** — the increment is an error-handling fix: every `git-failed` stop gains its cause. Adequacy →
  the stderr finding above; the formatter is total (L62).
- **security** — scanner clean. No new input is ingested; git runs as an argument vector as before.
- **privacy** — scanner clean. git's stderr can carry a local path, but only into an `unusable` detail, which writes no
  committed artifact. No finding.
- **observability** — scanner clean. The change makes a failed stop diagnosable; suite time before and after is
  recorded in `BUILD.md` (baseline measured at plan time: 4,061 tests, 446.9 s).
- **migrations** — scanner clean. No file moves, no contract or frontmatter changes, `MIN_CLI` stays 0.5.0.
- **performance** — the ceiling allocates nothing up front (measured at plan time); the new fixtures cost about a
  second each (measured). No finding.
- **i18n** — scanner clean; no user-facing interface strings. No finding.
- **a11y** — no user interface. No finding.

## Summary

The plan fixes a reproduced availability failure with the smallest change that reaches every caller (one option on
the one git owner), adds the one sibling call the sweep found, and makes every `git-failed` stop say why. Its evidence
design is the strong part: every test crosses the real limit with the real code, and each carries the control that
would have failed on the old code. The concerns are all bounds that belong beside the thing they bound: the closure's
name-level exemption and comment heuristic, an export nothing needs, a follow-up described in three places and
extended in one, line cites that should not reach the CHANGELOG, and an uncapped stderr that should be stated. One is
folded into the plan (the export); the rest are dispositioned to where the build writes them.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 0 important, 6 minor) — one folded into the plan, five
dispositioned for the build, for the human to weigh before /pharn-dev-build. The Step 1b lessons verdict above (GREEN,
exit 0) is a separate floor result and is not counted here.
