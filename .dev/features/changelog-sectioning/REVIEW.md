# REVIEW — changelog-sectioning

**Floor first (Step 1):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. The
increment adds no capability; every file is apparatus or repo meta.

The review ran in two rounds. The increment was authored in this session, so round 1 was delegated to an
**independent, read-only agent** that applied the four lenses to iteration 1 without the author's framing.
It found five floor-gate defects. All five were in prose the increment wrote **about itself**; none was in
the migration. A fix loop inside the plan's `## Files` regenerated the output as iteration 2. Round 2 was the
author's own lens pass over that fix, re-deriving every number the new CHANGELOG entry states.

**What round 1 confirmed independently** (its own splitter and probes, not the increment's code):

- **Byte preservation.** Every one of the 142 migrated bullets appears exactly once, byte-for-byte. The
  only new bullets are this PR's entry and the `[6.5.0]` placeholder, and the only removed line is the
  conflict marker. The preamble, the intro comment and the `[1.0.0]` tail are identical.
- **Version table.** 87 commits and 86 values. All 85 generated headings carry first-parent
  first-appearance dates and strictly descend.
- **Filing.** Checked with the full first line and the last introduction, rather than the 60-character
  probe: 139 of 142 agree. The other 3 are reviewed overrides, and each matches its evidence.
- **Spot checks.** `[6.12.1]`, `[6.5.0]`, `[6.5.2]`, `[5.1.2]`, `[3.0.2]`, `[1.1.0]`, `[3.2.1]`, `[2.2.8]`,
  `[2.4.6]` and `[6.3.0]` are each correct inside their bump windows.
- **Execution.** No shell anywhere: `execFileSync` is called with argv arrays only.

## Floor-gate findings — round 1 (all fixed in iteration 2; none open)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "CHANGELOG.md:17"
  problem: "The 1.0.0 sentence was false: SKILLS_VERSION 1.0.0 was created on 2026-06-23 by 126e2b3 on the side branch that merge 8753940 brought into main, so the heading date did not 'precede the first SKILLS_VERSION commit'. The same slip named 8753940 as 'the commit that created SKILLS_VERSION 1.0.0' in the entry, in overrides.json and in MIGRATION.md."
  evidence: "git show 126e2b3:SKILLS_VERSION → 1.0.0; 126e2b3 %cs 2026-06-23; merge-base --is-ancestor 126e2b3 e8b6da2 → true"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:17"
  problem: "'moved byte-for-byte into 85 version sections' was off by one: 84 sections hold entries; [6.5.0] holds only its placeholder."
  evidence: "sectionCount: generated.length"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:17"
  problem: "'Every CHANGELOG.md:<line> cite elsewhere in the repo now points at moved text' was false for cites into lines 1-14, which are byte-identical before and after."
  evidence: ".dev/features/structural-checker/REVIEW.md:87 cites CHANGELOG.md:7"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/changelog-sectioning/MIGRATION.md:3"
  problem: "The header claimed '--verify … re-derives every row', but --verify compared only CHANGELOG.md; a hand edit to MIGRATION.md would have passed."
  evidence: "run() tested only `working !== result.outText`"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/changelog-sectioning/sectionize-core.mjs:710"
  problem: "DROPPED_EXACT could never fail inside migrate(): it compared the input's dropped lines with the same allowDrop the parser had already enforced as DROPPED_MISMATCH, so '15 invariants on the rendered output' overstated it."
  evidence: "migrate() passed one allowDrop to both parseChangelog and checkInvariants"
```

**How each was fixed:**

- **The 1.0.0 history.** `gather()` now also reads the first commit **anywhere** in history that set
  `SKILLS_VERSION` (non-first-parent `git log --reverse`), and the sentence is rendered from it: "Its heading
  date (2026-06-23) is the date `126e2b3` first set `SKILLS_VERSION` to 1.0.0, on a branch that reached
  `main` at `8753940` (2026-06-24)."
- **The two 1.0.0-era overrides** were re-evidenced from the full history:
  - the governance-files entry was written in `126e2b3` itself, under `[Unreleased]`;
  - the reframe entry was written in `f0d2ec7`, a no-bump commit after 1.0.0, so the method's own rule, run
    on the full history, puts it in 1.1.0.

  Both resolutions stand, now with true evidence.

- **The counts.** They are now derived: `filledCount` gives **84**, and the shared input/output prefix
  gives **line 14**. The provisional and final renders are held to the same prefix.
- **`--verify`** now compares `MIGRATION.md` as well. The report no longer embeds the `--ref` spelling,
  so the SHA alone fixes its bytes. An end-to-end test proves a hand edit to it is RED.
- **`DROPPED_EXACT`** now also asserts that no `allowDrop` line survives in the output. A new tamper case
  proves that half. The `INVARIANTS` doc comment names the two members that read the input.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/changelog-sectioning/overrides.json:4"
  problem: "Round 1: the confirmed positional set missed two broken cross-entry references (the 2.4.2 entry's 'corrected matcher above', the 6.3.0 entry's 'the /pharn-review assignments entry above'). FIXED: both added and checked by the script (6 confirmed). Still open by design: 28 of the 34 'above/below' entries are listed as unverified; some may also flip."
  evidence: "MIGRATION.md 'Positional references': 6 CONFIRMED rows, 28 'unverified' rows"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "CHANGELOG.md:11"
  problem: "Nothing makes the next bump PR open its own `## [X.Y.Z]` section, and nothing checks it: the byte-preserved intro comment and the repo's practice still put a new entry under [Unreleased], so the first bump after this merge re-creates the old shape until `changelog-per-pr` lands. Merge order matters. The entry now names this follow-up."
  evidence: "CHANGELOG.md:11-13 'A new entry joins its existing group at that group's top'"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:17"
  problem: "Round 2: the entry says the intro comment and CLAUDE.md 'still route a new entry into [Unreleased]'. For CLAUDE.md that is slightly strong: it PERMITS the placement ('it may sit under [Unreleased]', CLAUDE.md:99-100) rather than requiring it. The practical effect the sentence warns about is real."
  evidence: "CLAUDE.md:99 'Record the bump in the same CHANGELOG entry that describes the change (it may sit under'"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/changelog-sectioning/PLAN.md:414"
  problem: "GRILL G3 is still in the approved plan: 'A version section means that version existed on main from that date → FLOOR (git's object store)'. The corrected label is: FLOOR AT MIGRATION TIME ONLY, via the script's NO_GHOST_SECTION / ONE_SECTION_PER_VERSION / DATES_MATCH_TABLE invariants over git-derived data for the pinned SHA; after merge no checker holds a heading to history. Likewise :416's 'these four references now point the wrong way → FLOOR' holds only for the ORDER comparison; which entry a phrase refers to is a human mapping in overrides.json."
  evidence: "PLAN.md is the approved plan and outside the build scope; the label is corrected here, not there"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/changelog-sectioning/sectionize-core.mjs:1"
  problem: "The core carries three reasons to change: the method, the CHANGELOG entry's wording (renderEntry), and the report's layout (renderReport). Accepted for a one-shot migration whose output is bound to one SHA; a reusable tool would split them. (Round 1's other P3 point, the CLI header overstating 'every rule lives in the core', is FIXED: the window filter moved into the core as relandedIn, and the header now names the two I/O preconditions the CLI owns.)"
  evidence: "export function renderEntry / export function renderReport in sectionize-core.mjs"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "README.md:555"
  problem: "Pre-existing text that sectioning makes visible: README ('Since `6.5.0`') and CLAUDE.md ('COST LEDGER trio (added 6.5.0)') name 6.5.0, which is now a section holding only a placeholder that points to [6.5.2]. Not this increment's text, and not its scope (a README edit here would be unrelated scope; CLAUDE.md is out of scope by instruction). Recorded as a follow-up."
  evidence: "CHANGELOG.md [6.5.0]: 'An entry added at 8dacaa9 was re-landed in 6d2ed46 and is filed under [6.5.2].'"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/changelog-sectioning/MIGRATION.md:7"
  problem: "Grammar: '1 hold only a placeholder' (should be 'holds'). Cosmetic, in the report only; not regenerated for it."
  evidence: "Sections generated: 85 (84 hold entries; 1 hold only a placeholder)"
```

**Also fixed from round 1 (advisory):** override `evidence.reason` free text is now quoted inside a fence in
`MIGRATION.md` (P2). Before, it was rendered as markdown.

## Lens notes

- **L-floor (P0).** Every guarantee is labeled. Byte preservation, section/version agreement and the six
  positional flips are FLOOR **at migration time** for the pinned SHA, through the script's invariants and
  checks, and re-checkable with `--verify` while that SHA exists. Filing correctness is ADVISORY, with the
  probes' bound stated in the core header, `MIGRATION.md` and the entry. Nothing is claimed after merge.
- **L-eval (P1).** No capability is added. The tests are real:
  - each load-bearing rule has a mutation that fails its test (`VERIFY.md`: an earliest-match mutant fails
    2 tests, and a disabled multiset fails 1);
  - each closed set is iterated;
  - `HALT_CODES` has a closure test.
- **L-trust (P2).** CHANGELOG text is parsed as data. Probes go to git as argv, with no shell. Every piece
  of repo text in the report sits inside a computed fence. One exception: `problem`-style prose in the entry
  is authored by the script from structured data, including version tokens and SHAs.
- **L-axis (P3).** The feature directory imports nothing outside itself, and no sibling module references
  cross module roots.

## Proposed lesson

**None.** The one surprise was the 1.0.0 misdating. Every stage derived "when was 1.0.0 created" from
first-parent history: the prompt, the plan, the grill and the plan-stage adversarial round, which
re-derived it with the same view. That view cannot see a side branch. Only a full-history check at code
review found it. This is the shape canon already names: a verification that re-runs the claim's own
method confirms it rather than tests it (L40: vary the condition; L32: a method consulting a view
downstream of the fact). `main`'s first-parent chain has two true merges, both from June, so this instance
has no live recurrence path.

---

**Verdict: GREEN — 0 open floor-gate findings** (5 found in round 1, all fixed and re-verified in iteration
2). There are 7 advisory findings for the human: 2 important and 5 minor. One important finding is partly
fixed; the other is a follow-up. The review is advisory. It is not a seal.
