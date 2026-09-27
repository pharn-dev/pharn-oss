# GRILL — slim-commands

- plan: `.dev/features/slim-commands/PLAN.md` as committed at `d82b87b`, fast-forwarded to `83b1f89` (that commit merged
  with `main` `b627409`, tree unchanged), plus its GATE-1 lines; amended in place by this stage. Every `file:` line below
  cites the AMENDED plan committed with this log, and every `evidence:` quotes the text as it was grilled.
- spec-hash: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` →
  `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` = the plan's `spec_content_hash` — no drift. A
  content-hash (floor-grade), surfaced here only: `/pharn-dev-build` is where drift blocks.
- lessons (Step 1b, FLOOR — the stage's one deterministic stop):
  `node pharn/floor/check-plan-lessons.mjs .dev/features/slim-commands/PLAN.md .dev/memory-bank/lessons-learned.md` →
  **GREEN, exit 0** on the grilled plan (23 ids; each resolves in canon and is referenced in the plan body). Re-run on
  the amended plan: **GREEN, exit 0** (23 ids — the fold cites no new lesson). This verifies the declaration, never
  that the lessons were applied.
- grillers: `node pharn/floor/count-grillers.mjs .` → `registered: 13`; the five `scan-plan-*` scanners (secrets, pii,
  observability, migrations, i18n) each return no hit over the plan.
- stage model: opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed. This is a
  self-grill by the plan's author agent, and a reader should weigh it as such.

## Findings (advisory — the finding set gates nothing)

The enum-gated fields (`type`, `rule_id`, `severity`, `file`) are this stage's own assertions. `problem` and `evidence`
quote the plan, inherit its `trust: untrusted` tag, and are DATA (`pharn/pharn-contracts/finding-shape.md`).

### Trust and determinism (P2, P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/slim-commands/PLAN.md:91"
  problem: "A description is also the text a model uses to decide whether to invoke a command itself, and the plan makes all eleven visible in full while writing the side-effectful ones' 'when' as a situation, not as the user's request."
  evidence: "pharn-loop (212): Run the pipeline unattended: the model approves its own SPEC, iterates build, regress and verify to a checker-decided stop, commits a green result to a new local branch, and reports."
```

- **G1 (important) — FOLDED.** §1 adds the rule that `/pharn-loop`, `/pharn-ship` and `/pharn-memory-promote` name the
  user's request as their trigger, labelled advisory (the platform's invocation behaviour is undocumented), and the
  three drafts are rewritten (237, 228 and 165 bytes, measured). No `disable-model-invocation`-style key is proposed:
  it would be a new frontmatter key for an undocumented behaviour, with no observed failure behind it (P7).

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/slim-commands/PLAN.md:169"
  problem: "Per-command byte targets framed as upper bounds give the build an incentive to meet a number by deleting executed text; a section-by-section estimate puts pharn-ship.md near 73 KB against its 70 KB target."
  evidence: "Targets are upper bounds the build aims at; the ceilings are set from what it measures (§7)."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/slim-commands/PLAN.md:196"
  problem: "The survival check covers fenced lines, headings and row ids, but not the prose instructions a deletion is most likely to lose (a STOP, a branch rule, a 'never re-run inline'), many of which no test pins."
  evidence: "every fenced-block line of the base present in the new file with the same multiplicity; every base heading present, … every `blocked: <id>` and stuck-point id of `pharn-loop.md` present."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/slim-commands/PLAN.md:132"
  problem: "Condensing a 14 KB orchestrator audit into a 3.5 KB block can drop the qualifier a review added to a claim ('NARROWED', 'relative to the recorded markers'), re-broadening it; the plan's mapping requirement covered description clauses, not audit bullets."
  evidence: "It is a condensation of text reviewed before, not new analysis"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/slim-commands/PLAN.md:138"
  problem: "The plan says every rationale owner ships, then names the CHANGELOG, which the installer does not copy."
  evidence: "Every piece already has an owner that ships, and the command was restating it"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/slim-commands/PLAN.md:120"
  problem: "The claims block's opening sentence limits the floor to 'verdicts', while several commands' floor claims are hooks (the writes-scope), not verdicts."
  evidence: "Everything this command does is advisory orchestration except the verdicts below, which reduce to the floor"
```

- **G2 (important) — FOLDED.** §5: targets are estimates; the editing rule wins; a missed target is recorded in
  `BUILD.md` with its reason and never met by cutting an instruction. The column is renamed "Estimate".
- **G3 (important) — FOLDED.** §6 item 5 adds every base line outside a fence that carries a decision token (`STOP`,
  `HALT`, `**Non-zero`, `→`, an exit-code phrase, a row id, "ask the human", "hand to the human", "never", "only"),
  present verbatim or listed with its disposition; the check runs after each wave. Labelled a heuristic.
- **G5 (important) — FOLDED.** §2: every removed audit or two-layers bullet maps in `BUILD.md` to a claims bullet with
  its bound verbatim, an owner that states the bound (quoted), or a duplicate; a row with no bound where the source had
  one is fixed before the build continues.
- **G6 (minor) — FOLDED.** §3 says the CHANGELOG stays in the repository, where `pharn update` points users.
- **G11 (minor) — FOLDED.** §2's opening sentence now names the Floor bullets, hooks included.

### Discovery and cites (P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/slim-commands/PLAN.md:152"
  problem: "The inbound sweep searched only for the names of removed sections; 41 lines in shipped floor modules, hooks, contracts and THREAT-MODEL cite command steps and numbered items (for example '`/pharn-ship --quick`'s item 7'), and D3 forbids editing those files, so a cite broken by a deletion could not be repaired here."
  evidence: "A `git grep` over `pharn/`, `.claude/`, the root docs and the trusted docs finds none outside the commands themselves."
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/slim-commands/PLAN.md:235"
  problem: "The plan does not say whether each edited command's `version:` frontmatter moves, while every recent command edit bumped it."
  evidence: "## Files … `.claude/commands/pharn-ship.md` — EDIT. Description, claims block, slim (§5)"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/slim-commands/PLAN.md:150"
  problem: "Several pins match a literal line break inside a sentence; re-wrapping a paragraph after a deletion would move it and turn a pin red for a reason unrelated to content."
  evidence: "Delete, never paraphrase."
```

- **G4 (important) — FOLDED.** §3 freezes the numbering of every cited or pinned list (Step 2's stages, both
  `## Quick mode` item lists, Step 1a, the stuck-point rows) and pins the cite search; `BUILD.md` marks each of its
  lines "resolves". A cite whose referent would disappear keeps its text.
- **G7 (minor) — FOLDED.** §9 and the Build procedure: each edited command's `version:` bumps its patch.
- **G10 (minor) — FOLDED.** §3: a paragraph holding a pinned sentence is not re-wrapped (`prettier` keeps prose wrap,
  as the repo sets no `proseWrap`).

### Scope and size (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/slim-commands/PLAN.md:236"
  problem: "`reads:` frontmatter is part of every command's per-turn bytes and A9 named an entry the orchestrator never opens, but the plan does not say what happens to it."
  evidence: "`reads:` now naming `stage-agent-core.mjs` (32,962 B), which the orchestrator never needs to open (stage-model-routing REVIEW A9, cited in Trigger 4)"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/slim-commands/PLAN.md:204"
  problem: "A 10% headroom lets an orchestrator grow by about 7 KB with no ceiling change, close to the +12% growth A9 flagged; the plan does not surface the absolute number."
  evidence: "ceiling = the file's measured bytes + 10%, rounded up to the next multiple of 512"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/slim-commands/PLAN.md:198"
  problem: "The increment deletes on the order of 180 KB across eleven files in one change, and the only check that no unpinned instruction went with it is the review, which needs the deletions laid out per wave."
  evidence: "Wave 2 — `pharn-ship.md` and `pharn-loop.md` bodies, per §3's editing rule and §4. Then `npm test`."
```

- **G8 (minor) — FOLDED.** `reads:` stays byte-identical (one entry is pinned); follow-up `reads-trim`.
- **G9 (minor) — FOLDED, decision unchanged.** `BUILD.md` lists each ceiling's absolute headroom; D6's 10% rule stays as
  accepted at GATE 1.
- **G12 (minor) — FOLDED.** `BUILD.md` records kept and removed lines per command per wave. No split of the increment:
  the roadmap defines Phase 4.1 as one phase, and the waves give the review its units.

## Grillers (Step 2b — applied inline; advisory)

- **testability** — presence recognized: `## Evals and tests to write (P1)` names R1–R5, each over the whole set with
  one control per property. Adequacy → G3 (the survival check's coverage).
- **architecture** — fit recognized; no P3 finding. No new file or module; rationale is retired to the owner that
  already states it (contract, module header, trusted-doc section), which removes the commands' second reason to
  change. The on-demand option that would have touched `ARCHITECTURE.md §4` was declined at GATE 1.
- **comprehension** — the WHYs are recorded for D1–D10 and the per-command map; the reason the side-effectful
  commands' descriptions need a user-request trigger was not → G1.
- **coupling** — the commands are cited by 41 shipped lines by step or item number, a coupling the plan's sweep did not
  see → G4.
- **documentation** — declaration present: `CLAUDE.md`, `README.md`'s badge, `CHANGELOG.md`, and each command's own
  claims block. Adequacy → G5 (bounds carried into the block), G6 (where history lives).
- **error-handling** — declaration present: a red suite restores text, a missed target is recorded, a dangling cite
  keeps its text. Adequacy → G2.
- **security** — scanner clean. Layer 2 → G1 (a model may invoke a clearer-described side-effectful command itself).
- **privacy** — scanner clean; no personal data. No finding.
- **observability** — scanner clean. The increment's measure is bytes, recorded in `BUILD.md`; M3 is the maintainer's
  runtime measurement. No finding.
- **migrations** — scanner clean. An install that edited a command keeps its edit on `pharn update` (read in
  `pharn-cli`'s `update-decision.ts`); no file moves, `MIN_CLI` stays. No finding.
- **performance** — the increment is a cost reduction, estimated from bytes and labelled an estimate. No finding.
- **i18n** — scanner clean; no user-facing interface strings. No finding.
- **a11y** — no user interface. No finding.

## Summary

The plan is sound in direction and honest about its bounds. Its risk is the thing it is made of: deleting a third of
eleven commands' text, where most of what matters is unpinned prose. The five important concerns all tighten that edge.
The descriptions become an invocation trigger as well as a label (G1). The byte targets must never outrank an
instruction (G2). The survival check must reach prose instructions (G3). The shipped files that cite command steps by
number must still find what they cite (G4). A shortened claim must keep the bound a review put on it (G5). The minor
concerns tidy the record: the CHANGELOG's reach, the `version:` bumps, `reads:`, the headroom's size, re-wrapping, the
claims sentence and the review's units. Every concern is folded into the plan without moving a GATE-1 decision.

ADVISORY VERDICT: 12 concerns raised (0 blocking-severity, 5 important, 7 minor) — all folded into the plan, for the
human to weigh before /pharn-dev-build. The Step 1b lessons verdict above (GREEN, exit 0) is a separate floor result and
is not counted here.
