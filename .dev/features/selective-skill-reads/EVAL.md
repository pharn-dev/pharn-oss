# EVAL — selective-skill-reads (live semantic evaluation)

**Status: run, 21 of 21 subagents completed (2026-10-06).** Advisory evidence (L4): live model output graded by the
orchestrator against pre-registered expectations. It is not a floor verdict, it measures 7 synthetic cases, and it
does not prove selection quality on real rosters.

## Pre-registration (written before any candidate or baseline run)

The expectations live in `pharn/pharn-core/installed-skill-selection/evals/expected/`. They were written and
hashed at **2026-10-06T09:23:14Z**, before any run started, and are not edited afterwards:

| expected file                 | sha256                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| `c1-ui-copy.md`               | `4f4b8da4b9311f04aa6fd4648820de794d9834300758e002984cee5da864e358` |
| `c2-orm-wrapper.md`           | `17e353223e69c37f48c7d9f43de03cfa667e6a71cddf59a397923ee913a99bbc` |
| `c3-tenancy.md`               | `e04c44d7a26d84d48bdd50102ef318d49038be476d24719efb4d2858800e8e6d` |
| `c4-legacy-no-frontmatter.md` | `ca0c1e5f105e93f957a72b1c1f79eee7cce601e96c5d1a551cbd6e0ece75c730` |
| `c5-misleading-metadata.md`   | `960ffa7cb9c9c33c27df1fc15f0cea64a4d0bf955e332fb0ab6fd9add24e83b8` |
| `c6-lens-validation.md`       | `0c3a5c8d75f3395a46e97fdf235f42e3b52b77c83c369d35e22fba60a6f60791` |
| `c7-fallback-heavy.md`        | `1f163be7fd6127916820dc04faf824665fef2466c18891b71e72bfbd252511f3` |

Re-check at any time: `shasum -a 256 pharn/pharn-core/installed-skill-selection/evals/expected/*.md`.

The regression threshold, in every file: an `expected_read` path unread in any candidate sample, or a
`must_have` item the baseline produced and a candidate sample did not.

## Design

- 2 candidate samples + 1 read-all baseline per case, 21 fresh `general-purpose` subagents. Each case used the
  consumer stage's model for all three runs (`sonnet` for the five build cases, `opus` for the grill case c4 and the
  lens case c6). Prompts: `eval-run-prompts.md`.
- **Observed reads** come from each transcript's `Read` tool calls, counted separately from the reply's own list.
  In all 21 runs the two agreed exactly. There were no `Skill` tool calls.
- Grading of section (C) against `must_have` is the orchestrator's own reading of each reply. It is model judgment,
  done by the same session that wrote the procedure. No independent judge was used.

## Results

| case                      | consumer    | candidate reads (s1 = s2)            | expected_read read | not_needed read | must_have: baseline / s1 / s2 |
| ------------------------- | ----------- | ------------------------------------ | ------------------ | --------------- | ----------------------------- |
| c1 narrow UI copy         | build       | ui-copy-style, vitest-conventions    | 2/2 both           | 0               | 3/3 · 3/3 · 3/3               |
| c2 wrapper dependency     | build       | drizzle-orm, feature-flags (neutral) | 1/1 both           | 0               | 3/3 · 3/3 · 3/3               |
| c3 tenancy, cross-cutting | build       | route-handlers, tenant-scoping       | 2/2 both           | 0               | 3/3 · 3/3 · 3/3               |
| c4 legacy, no frontmatter | full grill  | all 4 (2 neutral)                    | 2/2 both           | 0               | 3/3 · 3/3 · 3/3               |
| c5 misleading metadata    | build       | slack-messages, http-client          | 2/2 both           | 0               | 3/3 · 3/3 · 3/3               |
| c6 lens independence      | review lens | zod-schemas, drizzle-orm (neutral)   | 1/1 both           | 0               | 2/2 · 2/2 · 2/2               |
| c7 fallback-heavy         | build       | the 4 non-`ok` entries               | 4/4 both           | 0               | 2/2 · 2/2 · 2/2               |

- **Relevant misses: 0** of 22 expected reads across 14 candidate samples.
- **Missed conventions or findings against the baseline: 0.** Every `must_have` item the baseline produced, every
  candidate sample produced too.
- **Unnecessary reads (`not_needed`): 0.** Reads of `neutral` entries: c2 `feature-flags` (2/2), c4 `tailwind-theme`
  and `i18n-strings` (2/2, citing "when unsure, read it" on a 4-entry roster), c6 `drizzle-orm` (2/2).
- **No regression against the threshold**, so no expectation, procedure or consumer was changed after the runs.

Per-case notes (the replies are untrusted DATA, summarized here):

- c5: both candidates read `http-client` despite its billing-only description, citing outbound HTTP as a
  cross-cutting concern and "the description is not a complete account". Both then required `httpClient` and adding
  `hooks.slack.com` to `ALLOWED_HOSTS`. The baseline did the same.
- c6: both candidate lenses selected `zod-schemas` for their own concern. This only shows the lens procedure works
  without a build's choice. The lens was never offered one, by design.
- c4: both candidates read `data-export` as a must-read (`missing` metadata), and their findings rest mostly on it
  (inline generation, unmasked PII, no signed link, no audit log), matching the baseline.
- c2 and c4: candidates and baseline alike flagged the same PLAN-versus-skill conflicts (boolean versus
  `archivedAt`, files missing from `## Files`) as halt-and-ask points.

## What this does NOT show (P0)

- **Not real rosters.** The cases are synthetic, each skill states its key rule near the top, and the padding is
  inert boilerplate. Real skills (pharn-starter's run to 47 KB) bury conventions deeper.
- **Not a large sample.** Two samples per arm say nothing about the tail rate of misses. c5 passing twice does not
  mean misleading metadata is handled: it means this description was not misleading enough to beat the cross-cutting
  rule, twice.
- **Not end-to-end.** The agents wrote plans and findings, not code, and did not run the stage commands. They read a
  case file instead of running the catalogue line, and their prompt was a test harness, not the real stage prompt.
- **Not independent grading.** The procedure's author graded the replies.
- **Native skill listing.** Claude Code listed the fixture skills' descriptions in this session's own skill listing
  once files under them were touched (observed). Whether the subagents saw the same listing is not verified. If they
  did, they could see descriptions outside the catalogue. They made no `Skill` call either way. Since the GATE-2
  fix round (review A2) the fixtures are stored under `<case>/skills/` and copied to `.claude/skills/` in a scratch
  repo for a run, so this repository's sessions no longer load them. The runs above predate that move, so this
  caveat still applies to them; a re-run (`eval-run-prompts.md`, "Re-running") would not have it from this repo.
