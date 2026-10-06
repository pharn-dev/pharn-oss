# MEASUREMENTS — claude-md-bootstrap

Base: `6ff4dd1ac064087660c03e20b48571868ab45863` (main, SKILLS_VERSION 6.46.0), fetched and confirmed equal to
`origin/main` at the start of the run. Measured 2026-10-06 on macOS (Darwin 27.0.0), Node 24, Claude Code 2.1.289. All
sizes are UTF-8 bytes (`wc -c`). The `~tokens` figures are the checker's bytes/4 **estimate**, not a token count.

## Reproduce

```bash
git show 6ff4dd1:CLAUDE.md | wc -c
wc -c CLAUDE.md
node pharn/floor/check-instruction-files.mjs --report
node pharn/floor/check-instruction-files.mjs --growth --base 6ff4dd1ac064087660c03e20b48571868ab45863
node .dev/features/claude-md-bootstrap/check-migration.mjs
```

The checker, its budget and `pharn.config.json` are unchanged. No `--base-rule` was used.

## Root `CLAUDE.md`

|                    |                 bytes | ~tokens (bytes/4) |
| ------------------ | --------------------: | ----------------: |
| before (`6ff4dd1`) |               189,120 |            47,280 |
| after              |                28,403 |             7,101 |
| change             | −160,717 (**−85.0%**) |           −40,179 |

## The checker's always-loaded set (`--report`)

- **Before:** `CLAUDE.md` (root) 189,120 B, the whole set. Note: `git-ignored-not-counted: AGENTS.md`.
- **After:** `CLAUDE.md` (root) 28,403 B, the whole set. No notes. The `AGENTS.md` note is gone because the local
  file was moved to the Trash (GATE 1 decision 2); it was never counted.
- No `@` import, no `.claude/CLAUDE.md` and no `.claude/rules/` exist before or after. Nothing was moved into another
  loaded file.

## Growth (`--growth --base 6ff4dd1…`)

`verdict: within`, `added_bytes: 1722` (`CLAUDE.md`, `entered_set: false`), threshold 2,048 B (`default`, since the
base has no `budget` key). `check-migration.mjs` independently finds 19 root lines that are not base lines,
totalling 1,722 B. Every other root line is a byte-identical base line, which the checker counts as free (a line moved
within one file). Keeping retained text verbatim is what fits it under the budget. It is also this increment's
preservation property.

## Line accounting (`check-migration.mjs`, exit 0)

Of the 1,912 base lines:

- 287 kept byte-exact in the root;
- 1,523 moved to a guide, compared after trimming leading and trailing whitespace;
- 19 deduplicated to `CONTRIBUTING.md` "CHANGELOG entries";
- 2 framing (the Commands block's own fences, replaced by one fence per entry);
- 88 blank.

None is missing. Lines moved per guide:

| guide                    | lines |  bytes |
| ------------------------ | ----: | -----: |
| `floor-orchestration.md` |   404 | 45,164 |
| `floor-gates.md`         |   368 | 42,469 |
| `floor-checks.md`        |   279 | 29,733 |
| `floor-ac-tests.md`      |   138 | 17,064 |
| `writes-scope.md`        |   159 | 17,225 |
| `lessons.md`             |    60 |  6,829 |
| `product-commands.md`    |    34 |  4,515 |
| `versioning.md`          |    36 |  4,400 |
| `deferred-decisions.md`  |    37 |  4,274 |
| `generated-docs.md`      |     8 |  1,442 |

The guides total 173,115 B. The removed text was moved, not deleted. Only an agent whose task triggers a guide pays
for that guide, and the index tells it to read one `##` section of a floor guide, not the whole file. The checker's bound applies: this proves
the text is accounted for, not that a reader finds it in time.

## Mandatory follow-up reading (unchanged)

The root still says, byte for byte: read `README.md` → `pharn/CONSTITUTION.md` → `pharn/ARCHITECTURE.md` →
`THREAT-MODEL.md` → `LIMITS.md` before substantive work (167,772 B together, the same before and after). No new
universal read was added: every guide is conditional.

## Conditional reading per task (static walkthrough, not observed loading)

A **static walkthrough**: it reads the files and the index and follows the pointers by hand. No harness was run to
observe what a fresh agent actually loads. The "root" column is the auto-loaded file, assuming the harness gives it
to that consumer.

| task                                                   | before: root |                                  after: root + task guidance | available before the governed action?                                                                 |
| ------------------------------------------------------ | -----------: | -----------------------------------------------------------: | ----------------------------------------------------------------------------------------------------- |
| Irrelevant task (README typo)                          |      189,120 |                                                   28,403 + 0 | yes: no guide is triggered                                                                            |
| Planning a new capability, before opening any file     |      189,120 |                                                   28,403 + 0 | yes: conventions, P0–P7 constraints, SKILLS_VERSION rules and the generated-docs rule are in the root |
| Planning a change to a floor helper (`build-gate.mjs`) |      189,120 |            28,403 + 2,202 (its section) + 818 (guide header) | yes: the index line fires on "planning a change to" a floor CLI                                       |
| Editing a product command                              |      189,120 |                       28,403 + 4,515 (`product-commands.md`) | yes: the index fires on "planning or editing"                                                         |
| Apparatus/doc-only change → CHANGELOG entry            |      189,120 |       28,403 + 5,477 (`CONTRIBUTING.md` "CHANGELOG entries") | yes: the "do NOT bump" rule is in the root, and the index fires on "writing a CHANGELOG entry"        |
| A write is denied                                      |      189,120 | 28,403 + 4,104 (deny section), or 17,225 for the whole guide | the deny message itself names the remedy, and the index fires on "after a write is denied"            |
| After compaction / in a fresh stage agent              |      189,120 |                   28,403 + whichever guide its task triggers | the index says to re-read in your own context, because another agent's read does not count            |

**A task-specific increase is possible:** a CHANGELOG-writing task now reads `CONTRIBUTING.md`'s 5,477 B section
where the root used to carry a 1,444 B summary. It is still far below the old root. **Known duplicate inclusion:** the
first six lines of the fail-closed bullet and the first line of the write-blocked bullet are in both the root and
`writes-scope.md` (about 0.7 KB), so an agent that reads that guide sees them twice.

## Consumers (static, from documentation and earlier measurements)

- **Main Claude Code session:** the root is auto-loaded (documented; modelled by the checker).
- **Agent-tool subagents / stage agents:** in a user project, the root was observed attached to every stage agent
  (`.dev/measurements/loop-wall-clock-2026-10-05.md` §10). This run did not check whether every built-in subagent type
  in 2.1.289 receives it. The index therefore tells every reader to read guides itself.
- **`claude -p`** (`/pharn-dev-eval`): its own text says it loads the repo `CLAUDE.md`.
- **Codex:** reads `AGENTS.md`, which was proven to be a name-rewriting import of `CLAUDE.md` @ `c9737b4`, and so
  already stale. Per GATE 1 it was moved to `~/.Trash/AGENTS.md.pharn-oss-2026-10-06`. It was never tracked, and
  `.gitignore` already lists `/AGENTS.md`. A Codex user re-imports after this merges.

## Exclusions, assumptions and unmeasured sources

- The checker is a model of the loader (`LIMITS.md §3e`). It does not count `~/.claude/CLAUDE.md` (0 B here), auto
  memory, managed policy, nested `CLAUDE.md` files (two exist inside other sessions' `.claude/worktrees/` checkouts),
  or git-ignored files.
- Not measured: model quality, run time and token cost under the smaller prefix. No claim is made about any of them,
  and the saving is not multiplied by an assumed number of agents or requests.
- This change shrinks **this repo's** `CLAUDE.md` only. It says nothing about any installed project's instruction
  files.

## Disagreement found and not resolved

Base lines 131–132 (now in `versioning.md`) say the `gate-run-core.mjs:15` line cite was fixed in 6.13.0. The
CHANGELOG entry about `gate-run-core.mjs` line cites ("cites by name, not by line number") is filed under `[6.21.2]`.
The two may describe different fixes. Not verified, so not resolved.

## Validation run by the build

| command                                                                         | outcome                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------ |
| `node pharn/floor/validate.mjs .`                                               | `FLOOR: GREEN — 36 capabilities checked`, exit 0 |
| `node .dev/features/claude-md-bootstrap/check-migration.mjs`                    | exit 0, `problems: []`                           |
| `npm run check:markers`                                                         | GREEN (2 forward-claim sites re-pointed)         |
| `npm run check:changelog` / `check:badge` / `docs:check` / `check:contributing` | GREEN                                            |
| `npx markdownlint-cli2 --no-globs` (root + guides + edited docs)                | 0 issues                                         |

`npm run check` (the whole chain) and the CHANGELOG per-PR check run at `/pharn-dev-verify` and `/pharn-dev-ship`
Step 2c. Their outcomes are recorded in `VERIFY.md` and `SHIP.md`, not here.
