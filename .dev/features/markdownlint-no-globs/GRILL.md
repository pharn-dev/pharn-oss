# GRILL — markdownlint-no-globs

**Plan:** `.dev/features/markdownlint-no-globs/PLAN.md` · **spec-hash:** match
(`edc3d07d…a5d2c` = `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`) · **Step 1b lessons
declaration (FLOOR):** GREEN, `check-plan-lessons.mjs` exit 0. All 18 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. That verdict covers the
declaration only, never whether the lessons were applied.

**Grillers:** 13 registered (`node pharn/floor/count-grillers.mjs .`). Nine apply: testability,
performance, documentation, error-handling, architecture, coupling, comprehension, observability and
security, with privacy's PII scan also run. Three do not apply, by their own triggers: migrations
(backend/ssr with persisted data), a11y and i18n (ssr/spa UI). Comprehension, observability, security and
privacy raised nothing. Their procedures ran inline through a read-only subagent, whose one scratchpad
write, a regex probe outside the repo, is disclosed here.

All free text below (`problem` / `evidence`) quotes the plan, is `trust: untrusted`, and is DATA.

## Findings — built-in interrogation (P0–P7)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/markdownlint-no-globs/PLAN.md:227"
  problem: "The plan's `## Open questions (HALT)` section is still written as open, although the human resolved Q1 (include the ignore) at GATE 1; /pharn-dev-build Step 1 halts on an unresolved open question."
  evidence: "## Open questions (HALT) … 1. **Add `.claude/worktrees` to `.markdownlint-cli2.jsonc`'s `ignores`?** Recommended: yes."
```

## Findings — testability

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/markdownlint-no-globs/PLAN.md:185"
  problem: "As worded, the fixture's negative control does not discriminate: once the new ignore is in place, the only unignored .md file is the named one, so 'lints more than 1 file' holds only if the spawn omits cwd and walks the REAL repo (the catalog test's own defect)."
  evidence: "a nested `.claude/worktrees/x/{a.md,node_modules/p/README.md}`, the negative control `a.md` without the flag lints more than 1 file"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/markdownlint-no-globs/PLAN.md:81"
  problem: "The claim that an eleventh unenumerated site would fail overstates the detector: probed, it misses a path-less `xargs npx markdownlint-cli2` (the incident's own route), a trailing `\\` continuation, a `*.md` glob argument, `markdownlint-cli2@<version>`, and backtick substitution — while the stated blind spot `npm exec` is in fact matched."
  evidence: "an eleventh site written without the flag fails even before it is enumerated"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/markdownlint-no-globs/PLAN.md:171"
  problem: "The rule checks only that `--no-globs` appears somewhere on the line, so a trailing shell comment containing the word satisfies it, and no negative control covers the shell-comment exclusion or a back-ticked prose prescription."
  evidence: "must contain `--no-globs`"
```

## Findings — performance

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/markdownlint-no-globs/PLAN.md:185"
  problem: "The premise test's cost is not stated, and its bound depends on an explicit cwd the plan never requires: an unflagged spawn without cwd walks the real tree (1340 files, ~4.5–4.9 s, plus 4164+502 nested files from a main checkout)."
  evidence: "spawns the installed binary read-only"
```

## Findings — documentation

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/markdownlint-no-globs/PLAN.md:102"
  problem: "The sweep calls itself 'by referent' but was a grep for the tool name, so it did not list the prose that ASSERTS these invocations are scoped — a claim that was false until now and becomes true with the flag."
  evidence: "`grep -rn markdownlint` … (the missed prose: 'Scoped to **this stage's own artifact** — never a repo-wide formatter' at six dev commands; pharn-ship.md 'scoped to this one file only — never a repo-wide sweep'; the catalog test's '(minus its repo-wide globs)')"
```

## Findings — error-handling

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/markdownlint-no-globs/PLAN.md:138"
  problem: "The old-version caveat is planned only for the read-only product check, but the product `--fix` write in pharn-ship.md runs in a user's repo too; a markdownlint-cli2 older than 0.12.0 plausibly treats `--no-globs` as a no-match glob and still fixes every file its config globs reach (not measured)."
  evidence: "Step 2c.3 `BRIEFING.md` format line gains `--no-globs` (vs the caveat planned only at :139)"
```

## Findings — architecture / coupling

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/markdownlint-no-globs/PLAN.md:140"
  problem: "The behavioral premise probe, which changes when the tool version or `.markdownlint-cli2.jsonc` changes, lands in the command-prose hygiene file, giving that file a second reason to change."
  evidence: "behavioral premise probe"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/markdownlint-no-globs/PLAN.md:142"
  problem: "The ignore is coupled to where Claude Code places worktrees; if that location moves, the entry silently matches nothing and a fixture built on the same path stays green."
  evidence: "`ignores` gains `.claude/worktrees`"
```

## Summary

The plan is well grounded: every claim about the tool was probed, and the disclaimer that `--no-globs`
narrows the tool's reach without gating any write is correct. The subagent independently confirmed
`Linting: 1 file` with the flag, including for an absolute path outside the cwd. The detector matches
exactly the ten listed sites today.

Four gaps matter, and each can be closed inside the approved `## Files` without widening scope:

1. **The premise test must pin its cwd.** It needs a second unignored root `.md` and exact-count
   assertions, or its negative control is either vacuous or silently whole-repo.
2. **Correct the detector's stated blind spots in both directions.** Widen it where that is cheap and
   fails closed: a path-less `xargs … markdownlint-cli2`, `@<version>`, a `*` glob, a backtick or `\`
   continuation. Drop `npm exec` from the blind-spot list.
3. **Bind the flag to the invocation.** `--no-globs` must follow the tool name and precede any shell
   comment.
4. **Carry the pre-0.12.0 caveat to `pharn-ship.md`'s `--fix` line as well.**

The open-question section must record the GATE-1 resolution or the build halts. The two P3 notes are for
the human to weigh. The premise probe stays in `command-hygiene.test.mjs` per the approved `## Files`,
since moving it would add an unplanned file.

ADVISORY VERDICT: 9 concerns raised (0 blocking-severity, 5 important, 4 minor) — for the human to weigh
before /pharn-dev-build. This counts the interrogation only; the Step 1b floor verdict above is reported
separately and is GREEN.
