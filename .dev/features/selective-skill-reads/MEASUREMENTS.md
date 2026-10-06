# MEASUREMENTS — selective-skill-reads

Static byte counts from `node .dev/features/selective-skill-reads/measure.mjs <extra rosters>` (2026-10-06), plus
tool-call counts observed in the EVAL.md transcripts. **Bytes are bytes.** No token or latency figure is derived
from them, and no bytes/4 conversion is implied.

## Terms

- **baseline** — the pre-6.47.0 behaviour: every listed `SKILL.md` read in full (sum of their sizes).
- **catalogue** — the helper's stdout, which the consumer's Bash call returns into context.
- **procedure** — `installed-skill-selection.md`, 5,066 B, read only in `select` mode.
- **selected** — the bodies read in `select` mode: observed (EVAL.md transcripts) for the fixtures, scenario for
  the real roster. In `read-all` mode it is the baseline.
- **net** — catalogue + procedure + selected − baseline. Negative is a saving.

## Per roster, one consumer

| roster                  | mode                    | skills | baseline | catalogue | procedure |  selected |        net | bodies read |
| ----------------------- | ----------------------- | -----: | -------: | --------: | --------: | --------: | ---------: | ----------- |
| small (2 skills)        | read-all (small-roster) |      2 |    6,000 |       820 |         0 |     6,000 |   **+820** | 2/2         |
| c1 narrow UI copy       | select                  |      4 |   19,081 |     1,434 |     5,066 |     9,427 | **−3,154** | 2/4         |
| c2 wrapper              | select                  |      4 |   18,909 |     1,368 |     5,066 |     9,358 | **−3,117** | 2/4         |
| c3 tenancy              | select                  |      4 |   18,999 |     1,416 |     5,066 |     9,448 | **−3,069** | 2/4         |
| c4 legacy (grill)       | select                  |      4 |   18,937 |     1,226 |     5,066 |    18,937 | **+6,292** | 4/4         |
| c5 misleading           | select                  |      4 |   18,599 |     1,279 |     5,066 |     9,336 | **−2,918** | 2/4         |
| c6 lens                 | select                  |      4 |   19,042 |     1,357 |     5,066 |     9,563 | **−3,056** | 2/4         |
| c7 fallback-heavy       | select                  |      5 |   23,719 |     2,285 |     5,066 |    19,004 | **+2,636** | 4/5         |
| pharn-starter, real (8) | select                  |      8 |  118,389 |     3,925 |     5,066 | see below |  see below | —           |

**Overhead outweighs savings in three rosters.** The small roster pays the catalogue alone (+820 B). The
fallback-heavy c7 reads every must-read entry plus the procedure (+2,636 B). In c4 the conservative "when unsure,
read it" led both samples to read all four (+6,292 B). In the 4-entry cases, savings of about 3 KB (about 16%) are
modest, because the 16,384 B `select` threshold sits just under their 19 KB totals.

**The real roster** (pharn-starter's 8 discovered skills, a local scratch copy, never committed): selection costs
3,925 + 5,066 = 8,991 B before any body. Scenarios, since no live run used this roster:

| scenario                                                                                           | bodies read | selected |         net |
| -------------------------------------------------------------------------------------------------- | ----------- | -------: | ----------: |
| a React UI change: avoid-react-use-effect, shadcn-ui, feature-module-layers (must-read: `missing`) | 3/8         |   56,388 | **−53,010** |
| a backend change: nodejs-backend-patterns, vitest, feature-module-layers                           | 3/8         |   30,128 | **−79,270** |
| unsure, read everything                                                                            | 8/8         |  118,389 |  **+8,991** |

## Per consumer and mode

| consumer                                      | runs the catalogue                                               | reads the procedure (select) | where the saving can come from                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pharn-build`                                | once per build (each `/pharn-loop` iteration, each ship rebuild) | once per build               | bodies skipped for that build                                                                                                               |
| full `/pharn-grill`                           | once                                                             | once                         | bodies skipped for the interrogation                                                                                                        |
| `/pharn-grill --quick` / `--floor-only`       | never (unchanged)                                                | never                        | **none — nothing was read before either.** `/pharn-loop`'s full mode runs `--floor-only`, so no grill saving is attributed to any loop run. |
| standalone `/pharn-review`, orchestrator      | never (6.47.0: it no longer runs the scanner)                    | never                        | the orchestrator reads no catalogue and no body                                                                                             |
| standalone `/pharn-review`, each spawned lens | once per lens                                                    | once per lens (select)       | bodies that lens skips                                                                                                                      |

**Review is per lens.** Up to 22 lenses spawn. The 4 scanner-less lenses always spawn, and a scanner-bound lens
spawns only on a scanner hit. Per lens on the real roster: baseline 118,389 B; selection overhead 8,991 B; net
between −109,398 B (a lens that reads no body) and +8,991 B (one that reads all). With all 22 spawning, the baseline
is 2,604,558 B of skill bodies, against 197,802 B of selection overhead.

## Tool calls (observed)

- Per selecting consumer: +1 Bash call (the catalogue) and +1 Read (the procedure, `select` mode only), minus one
  Read per skipped body. Eval candidates: 4–6 tool calls including the case file and handback. Baselines: 5–6. The
  harness also runs the case read and a handback, neither of which a real stage has.
- Review: the orchestrator loses its scanner call. Each lens gains one Bash call.
- **Latency:** subagent wall-clock ran 17–37 s for candidates and 17–34 s for baselines, with overlapping
  distributions. That is noise at this size. No latency claim is made.

## What the runtime token counts show, and why they are not used

Every eval subagent's transcript shows 52–92 k tokens of cache creation and 150–185 k of cache reads. That is the
harness's fixed prefix (system prompt, tools, `CLAUDE.md`), which dwarfs a 19 KB fixture roster. The per-run token
totals therefore cannot resolve a few-KB difference, and none is reported.

## Content already loaded through another mechanism (not counted as avoided)

Claude Code itself lists installed skills' `name` and `description` in the model's skill listing. This was observed
in this session for the fixture skills, scoped "applies when working on files under" their directory. In a
session where the listing is present, the catalogue's description fields partly duplicate it. So the catalogue's
bytes are an upper bound on new context, and its description share is not new at all there. Whether stage subagents
receive that listing is not verified. Skill **bodies** are not preloaded by the listing, and the saving above counts
bodies only. (The fixtures now live under `<case>/skills/` and `measure.mjs` copies them into a scratch repo, so
they no longer appear in this repository's listing. The byte counts are unchanged by the move.)

## Duplicate content actually supplied

In `select` mode a consumer receives each `ok` description twice only if the harness listing is present (above).
No body is supplied twice. The orchestrator no longer forwards anything to lenses, so review duplicates nothing
across orchestrator and lens. Each lens does re-run the catalogue (bytes × spawned lenses), by design: each lens
selects independently.
