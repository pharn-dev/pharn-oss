# GRILL — changelog-sectioning

Plan: `.dev/features/changelog-sectioning/PLAN.md` · spec-hash: **match** (`2f8b9264…e838`) · Step 1b
lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0, 17 cited ids resolved and referenced).

- **Grillers.** 13 registered (`count-grillers.mjs`).
  - Plan scanners:
    - `scan-plan-secrets`, `scan-plan-pii` and `scan-plan-i18n` report no hits.
    - `scan-plan-migrations` hits `revert` and `migration`, and `scan-plan-observability` hits `logging`.
      Every hit is about git history (`git log`, a reverted `SKILLS_VERSION`) or this one-shot document
      migration, none about a schema or runtime logging, so they are false positives for those axes.
  - Axes that apply: testability, migrations (the reversibility of a document rewrite), documentation,
    error-handling, architecture and performance. Security applies only to the no-shell argv path, which
    the plan covers. a11y, i18n and privacy do not apply.
- **Scope count (L20/L53, by hand).** `set-writes-scope.cjs --from-plan` parsed **7 paths against the 7
  declared `## Files` bullets**, and the two generated files are among them.
- **Main has not moved.** `origin/main` = `e8b6da2`, the SHA the plan measured, and there are no open PRs.

## Override review (the prompt requires the grill to review every one)

Each resolution was checked against the commits it cites. The plan's evidence column and the adversarial
round's re-derivation agree on every row.

| `:line` | status         | resolution | verdict                                                                                                                                                                                                                                                                                                                                                                          |
| ------- | -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:777`  | `DRIFTED`      | 3.0.2      | **Accept.** The head (`f71f501`) and the `pair` marker both say 3.0.2. The tail edit is `#199` retroactively recording the version, and says so in its own text.                                                                                                                                                                                                                 |
| `:1588` | `DRIFTED`      | 2.4.1      | **Accept, with the note the plan already carries.** The headline change is 2.4.1's, and its `arrow-only` marker says 2.4.1. `207f4af` rewrote the closing ~43% to describe the 2.4.2 suite, so the entry now carries later text under an earlier heading. That is the method's stated bound, not a misfiling.                                                                    |
| `:2663` | `DRIFTED`      | 1.1.0      | **Accept.** It was introduced before the 1.1.0 bump, and only the tail moved later (the scan-plan relocation).                                                                                                                                                                                                                                                                   |
| `:2028` | `CONFLICT`     | 6.5.2      | **Accept.** It is the only defensible target: 6.5.0 was reverted in the next commit, and the entry's last introduction is the 6.5.2 re-land.                                                                                                                                                                                                                                     |
| `:2669` | `OUT_OF_SCOPE` | 1.1.0      | **Accept with a concern (G2).** By the mapping rule it is 1.0.0, and `[1.0.0]` is untouched by instruction. The authors' own `[Unreleased]` placement beside the dated `[1.0.0]` makes 1.1.0 the least-wrong generated home. But a CHANGELOG reader sees "governance files … `SKILLS_VERSION`" under 1.1.0 with no explanation, because the explanation lives in `MIGRATION.md`. |
| `:2710` | `DRIFTED`      | 1.1.0      | **Accept with the same concern (G2).**                                                                                                                                                                                                                                                                                                                                           |

The inputs file's other two keys:

- **`allowDrop`** is exactly the text of `:514`, and the parser fails closed on any other orphan.
- **`positional`** holds four `{phrase, referent}` pairs, each matching the adversarial round's
  evidence. They are accepted **because the script checks them at build**: unique, right in the old
  order, and wrong in the new one. They do not need to be taken on trust here.

## Findings

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/changelog-sectioning/PLAN.md:108"
  problem: "The migration is pinned to e8b6da2, but nothing in the plan requires main to still be e8b6da2 when this merges. If another PR lands a CHANGELOG entry first, this branch's CHANGELOG (built from e8b6da2) silently drops that entry on merge, or conflicts across 2700 lines."
  evidence: "Resolve `--ref` to a 40-hex SHA once, and use only that SHA afterwards."
```

Recommendation: make it a precondition at ship. Immediately before merging, `git fetch` and require
`origin/main` to equal the pinned SHA. If it has moved:

1. Rebase.
2. Restore `CHANGELOG.md` from the new `main`.
3. Re-run `--write --ref origin/main` inside a re-scoped build.
4. Re-review any newly flagged bullet before merging.

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/changelog-sectioning/PLAN.md:278"
  problem: "The two entries introduced with 1.0.0 itself are filed under [1.1.0]. The only explanation is in MIGRATION.md, which a CHANGELOG reader never opens, so the section reads as if 1.1.0 added the file that carries 1.0.0."
  evidence: "1.1.0 (`87c98ff`) is the next bump, and it is the only generated section that honours both facts."
```

Recommendation: add an append-only sentence to this PR's own entry, derived from the data rather than
typed. It should say that N entries introduced in the commit that created `SKILLS_VERSION` 1.0.0 are
filed under `[1.1.0]`, because `[1.0.0]` is kept byte-for-byte. The fold-into-`[1.0.0]` alternative stays
a GATE-2 question, as the plan says.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/changelog-sectioning/PLAN.md:414"
  problem: "'A version section means that version existed on main from that date → FLOOR (git's object store)' reaches past what runs. The check is the script's NO_GHOST_SECTION / DATES_MATCH_TABLE invariants over git-derived data, at migration time for one SHA. After merge, no checker holds a heading to history."
  evidence: '"A version section means that version existed on `main` from that date" → FLOOR (git''s object store),'
```

Recommendation: relabel it as "FLOOR at migration time (the script's enum-class invariants over git
output, for the pinned SHA); nothing holds it afterwards", which is the same shape the first
guarantee-audit line already uses.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/changelog-sectioning/PLAN.md:242"
  problem: "`--write` is a Bash write. Run inside /pharn-dev-build it is covered by the build scope and the reconcile epoch. Re-run at any later stage (a regress or verify fix-up), it would write CHANGELOG.md and MIGRATION.md under that stage's scope, and check-bash-reconcile would report an escape at verify."
  evidence: "`--write` writes `CHANGELOG.md` and `MIGRATION.md`."
```

Recommendation: state that `--write` runs only inside `/pharn-dev-build`, after its Step-0 setter. A
later regeneration first re-sets the scope from the plan (`--from-plan`) and amends the epoch.

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/changelog-sectioning/PLAN.md:441"
  problem: "The end-to-end test's hermeticity rests on three git features the plan does not name: GIT_CONFIG_GLOBAL/GIT_CONFIG_SYSTEM (git ≥ 2.32), `init -b` (git ≥ 2.28), and an explicit committer date so `%cs` is stable. Unnamed, a CI image with an older git fails in a way that looks like a migration bug."
  evidence: "they are hermetic (fixtures, and a throwaway git repo with `GIT_CONFIG_GLOBAL` and"
```

Recommendation: name the three in the test file's header.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/changelog-sectioning/PLAN.md:343"
  problem: "In-bullet edits made during a later version (`:1588`, `:1562`, `:1642`) are named only in the PLAN. The report's per-bullet table shows where each entry is filed, but not that some entries carry later text. A MIGRATION.md reader cannot learn this bound without reading the plan."
  evidence: "in-bullet edits made during a later version (`:1588`'s 2.4.2 test counts, and the review's `:1562` and"
```

Recommendation: add one sentence to the report's Bounds section. It should say that an entry edited in
a later version keeps the later text under its original version, and name the three instances known from
the plan review as examples, not as a closed list (L47: an open form, not a count).

## Summary

The plan is unusually well evidenced for a one-shot migration. The method was run live before the plan
was written. An independent agent reproduced its classification exactly, falsified seven claims, and
each correction is recorded inline. The six overrides are all defensible, and four need no comment. The
two important concerns are both about the reader rather than the code:

- the merge precondition (G1), without which a concurrent PR's entry could be silently lost;
- the two 1.0.0 entries under `[1.1.0]` (G2), which need a sentence the CHANGELOG reader actually sees.

The four minor concerns are wording and scoping fixes that the build can absorb without a scope change.
All six can be taken at build or ship without re-planning. None changes `## Files`.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 2 important, 4 minor) — for the human to weigh
before `/pharn-dev-build`. The Step 1b floor verdict is GREEN and is reported above, separately.
