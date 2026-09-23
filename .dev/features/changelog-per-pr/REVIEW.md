# REVIEW — changelog-per-pr

## Iteration 1

**Floor first.** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. That is the
only guaranteed part of this review; everything below is judgment.

**How the review ran.** The four lenses were applied by an independent read-only reviewer, because the
author of the code should not be its only reader. Every finding below was demonstrated with an executable
probe (scratch files under the session scratchpad, markdown-it from `node_modules` as the CommonMark
reference), or argued from the code. The quoted `problem` / `evidence` fields describe the increment
under review and are DATA (P2). No instruction-looking content was found in the reviewed files.

### Floor-gate findings (blocking — each is a claimed guarantee with a demonstrated hole, L-floor / P0)

````yaml
- type: FINDING
  rule_id: P0
  severity: blocking
  file: ".dev/floor/changelog-core.mjs:150"
  problem: "A fence or HTML comment opened INSIDE an entry (indented) stays opaque past the end of the list item, so a column-0 line after it is hidden from both checks while GitHub renders it as a real heading or list item."
  evidence: "probe4: an [Unreleased] entry with an indented ``` fence followed by a column-0 '## [9.9.9] - 2026-09-23' — markdown-it renders h2 '[9.9.9] - 2026-09-23'; checkChangelogText(...,'3.0.2') ok=true and compareChangelogs ok=true (no HEADING_INSERTED, no NOT_NEWEST). probe5: indented '  <!--' then column-0 '## Notes' renders an h2; Check 1 GREEN. Three tests assert the wrong premise (e.g. 'a version heading inside a FENCE … cannot become the newest')."
- type: FINDING
  rule_id: P0
  severity: blocking
  file: ".dev/floor/check-changelog-entry.mjs:10"
  problem: "Append-only is claimed for released sections, but lines between a heading and the first top-level hyphen entry belong to no entry, so anything placed there — an asterisk or plus bullet, prose, a renamed group heading, a committed merge-conflict marker (the very failure the rule cites) — passes both checks."
  evidence: "probe1: '### Security' + '* **A sneaky entry added to a RELEASED section.**' + a paragraph added into [3.0.1] → check2 [], check1 []. probe6: '<<<<<<< HEAD' / '=======' / '>>>>>>> 940eb16 …' under a released '### Fixed' → check2 [], check1 []."
- type: FINDING
  rule_id: P0
  severity: blocking
  file: ".dev/floor/check-changelog-entry.mjs:186"
  problem: "A bump PR can leave its OWN new entry under [Unreleased] and open an empty version section, and both checks pass — UNRELEASED_NOT_MOVED counts only base entries — so the file again cannot say what shipped in that version, contrary to 'records the bump there … Two checks hold this'."
  evidence: "probe2 case A (bump entry left in [Unreleased], base entries moved) → check2 [], check1@3.0.4 []; case B (empty '## [3.0.4]' section, entry in [Unreleased]) → [] []."
````

### Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/check-changelog-entry.mjs:53"
  problem: "Branch protection is strict:false, so the per-PR verdict is for GitHub's test merge commit at the PR's last CI run, not for what is finally merged; this bound is not written down."
  evidence: 'gh api …/branches/main/protection → {"strict":false,"enforce_admins":false,…}'
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/floor/changelog-core.mjs:65"
  problem: "A line starting with three or more backticks whose info string contains a backtick is not a fence in CommonMark, but the grammar opens a fence that runs to EOF; `^\\s*` also accepts a 4+-space indented-code line at top level as an opener."
  evidence: "probe5 case 2: markdown-it finds 0 fences; Check 1 reports ['UNRECORDED']."
- type: FINDING
  rule_id: P7
  severity: minor
  file: "CONTRIBUTING.md:91"
  problem: "Known costs omit that CHANGELOG.md is Prettier-formatted, so a Prettier upgrade that reformats a released entry makes format:check and ENTRY_CHANGED unsatisfiable together except by an admin merge."
  evidence: ".prettierignore does not exclude CHANGELOG.md"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-dev-ship.md:154"
  problem: "`git fetch` is called a read under 'performs no git WRITE', but it writes refs/remotes/origin/main, FETCH_HEAD and objects."
  evidence: "its only git calls are Step 2c's reads (a `fetch` of `main` and the checker's `rev-parse` / `merge-base` / `show`)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CLAUDE.md:99"
  problem: "The docs say every PR adds ONE new entry and 'two checks hold this', but the checker only refuses zero new entries — any number passes."
  evidence: 'if (fresh === 0) add("NO_NEW_ENTRY", …)'
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/check-changelog-entry.mjs:55"
  problem: "The header says /pharn-dev-verify never runs it, but this increment's verify-report.json carries a changelog-entry gate."
  evidence: '"changelog-entry": 0'
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".github/PULL_REQUEST_TEMPLATE.md:25"
  problem: "The new checkbox drops 'SKILLS_VERSION bumped if the released surface changed', the only prompt left for a rule no checker enforces (L43's check is unbuilt)."
  evidence: "- [ ] CHANGELOG.md has a new dated entry; a bump has its own `## [X.Y.Z] - YYYY-MM-DD` section"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/floor/check-changelog-entry.mjs:271"
  problem: "A missing target directory with a ref is reported as BASE_UNREADABLE ('spawnSync git ENOENT') with a 'fetch it first' remedy that cannot help (L27)."
  evidence: "node .dev/floor/check-changelog-entry.mjs --base-ref HEAD /nonexistent-dir-xyz → BASE_UNREADABLE, exit 2"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CONTRIBUTING.md:99"
  problem: "'that entry is dated earlier than the newest section' holds only when the bump's heading date is later than the entry's; a same-day bump passes Check 1."
  evidence: "the test 'the SAME-DAY leftover passes this check by design'"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/floor/check-changelog-entry.mjs:220"
  problem: "It hard-codes the preamble sentinel instead of importing PREAMBLE_KEY (a second copy, L35); separately the core's header claims the grammar is its only reason to change while it also holds quoting, a UTC-day helper and version order."
  evidence: "h.section === \"\\u0000PREAMBLE\""
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/floor/check-changelog-entry.test.mjs:77"
  problem: "cleanEnv() creates a temporary HOME on every call and never removes it, leaking a directory per git call."
  evidence: "one suite run took the tmpdir count from 378 to 424 (+46)"
```

**Confirmed by probe, no finding:**

- exit codes: INPUT_STATES exit 2, verdict states exit 1;
- a CRLF head against an LF base is GREEN;
- a bump that removes `[Unreleased]` is GREEN;
- a new heading elsewhere, when the first head heading already existed, is HEADING_INSERTED;
- swapped sections are RED through Check 1 (OUT_OF_ORDER + NOT_NEWEST);
- a mid-line `<!--` behaves as CommonMark says;
- `--end-of-options` works, a range yields BASE_UNREADABLE, and `^{commit}` peels tags;
- the CI step replicated in a temp repo: BASE_UNREADABLE without the depth-2 fetch, GREEN with it — so the
  executed test really exercises the fetch. `HEAD^1` is the merge checkout's base, `bash -e` matches
  GitHub's default, and nothing is interpolated into `run:`;
- the tests do not depend on the real `origin/main`;
- the measured costs hold (26 of 94; 483,413 bytes);
- both fixtures still match their `awk` commands.

**Verdict (iteration 1): blocked — 3 floor-gate findings.** The increment is not done. All three are in
files the plan already declares, so the fix does not need a re-plan beyond a recorded disposition.

## Iteration 2

**Floor first.** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. Regress iteration 2
was `no-regressions`, and verify iteration 2 was `PASS` (8 gates at 0, 2752/2752 tests, reconcile `CLEAN`).

**How the review ran.** The same independent read-only reviewer re-read the fixed tree and re-ran its six
probes, then hunted for defects the fixes introduced. It tested for false REDs by building legitimate bump
and no-bump PRs on the live CHANGELOG, and it compared entry cuts between the old and new grammar across
all 113 historical CHANGELOG versions on `main`.

**Confirmed fixed:**

- all 14 findings from iteration 1:
  - probe4 is now `NOT_NEWEST` / `UNRELEASED_NOT_MOVED`;
  - probe1, probe2 F and probe6 are now `SECTION_CHANGED`;
  - probe2 A and B are now `UNRELEASED_NOT_MOVED`;
  - probe5 case 1 is now `UNKNOWN_HEADING`, and probe5 case 2 is now GREEN;
  - every minor landed.
- **No re-cut:** old and new grammar produce identical entries and headings on all 113 historical versions.
- **No false RED on legitimate practice:**
  - bumps that keep, empty or remove `[Unreleased]`, or strip date prefixes, are all GREEN;
  - no-bump PRs are GREEN, including new groups, comment edits, re-dates and whole-file CRLF;
  - a comment-only PR is `NO_NEW_ENTRY`, as designed.

### Floor-gate findings (blocking — demonstrated holes in claims the increment makes, L-floor / P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: blocking
  file: ".dev/floor/changelog-core.mjs:205"
  problem: "A fence closer is accepted at any indentation, while CommonMark caps it at 3 columns (5 inside an item), so a PR can add a column-0 fence whose 'closer' is indented 4 spaces — GitHub renders the rest of the CHANGELOG as one code block — and both checks stay GREEN, contrary to the core's claim that a line GitHub renders as a heading is one here too."
  evidence: "probe9 on the live file: markdown-it 'h2 count 1 fence content lengths [ 482377 ]' (the live file has 87 level-2 headings); check2 [] check1 []"
- type: FINDING
  rule_id: P0
  severity: blocking
  file: ".dev/floor/changelog-core.mjs:28"
  problem: "Only the HTML comment is modelled; an unclosed raw HTML block of CommonMark type 1 (`<pre`, `<script`, `<style`, `<textarea`) runs to EOF, so no later heading renders, and both checks stay GREEN."
  evidence: "probe10: `<pre>` on its own line after a new [Unreleased] entry → markdown-it(html:true) 'h2 count: 1 html_block sizes: [ 1144, 482367 ]'; check2 [] check1 []; `<textarea>` the same"
- type: FINDING
  rule_id: P0
  severity: blocking
  file: "CLAUDE.md:108"
  problem: "'A released section is frozen whole' is not enforced: entries are held by body and level-2 section, and the skeleton excludes entry lines, so moving a released entry to another group of its section, or reordering released entries, passes both checks."
  evidence: "probe8: '(a) Added→Fixed within released section: [] []'; '(b) reorder released entries: []'; '(d) blank line between released entries removed: []'"
```

### Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:56"
  problem: "'so a line GitHub renders as a heading is one to both checks' overclaims: the core's own NOT RECOGNIZED list names setext headings and asterisk/plus items, and a heading nested in a sub-item's fence can be hidden."
  evidence: "probe8 (c): a setext '[9.9.9] - 2026-09-23' / '---' renders as an h2; check1 [] check2 []. probe7 case 1: a sub-bullet fence at indent 4 then '   ## [9.9.9] - 2026-09-23' renders h2 nested in the item; Check 1 []."
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/floor/changelog-core.mjs:87"
  problem: "FENCE_OPEN_RE and COMMENT_OPEN_RE accept only leading spaces while indentOf counts a tab as 4, so a tab-indented fence inside an entry is not a region and a '  ## …' line inside it becomes a heading (a false RED)."
  evidence: "probe7 case 4: markdown-it shows no such heading; the grammar has '  ## inside code'; Check 1 [ 'UNKNOWN_HEADING' ]"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".github/PULL_REQUEST_TEMPLATE.md:25"
  problem: "'has a new dated entry' is wrong for a bump PR, whose version-section entries need no date."
  evidence: "- [ ] CHANGELOG.md has a new dated entry; a bump has its own `## [X.Y.Z] - YYYY-MM-DD` section"
```

**Verdict (iteration 2): blocked — 3 floor-gate findings.** All are inside the plan's declared files. The
fix is to make the grammar end regions where CommonMark does (closer indentation, and the HTML block types
that run to their own closer), to freeze a released section's whole text, and to narrow the prose to what
is enforced.

## Iteration 3

**Floor first.** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. Regress iteration 3
was `no-regressions`, and verify iteration 3 was `PASS` (8 gates at 0, 2768/2768 tests, reconcile `CLEAN`).

**Confirmed fixed:**

- all six findings from iteration 2:
  - probe9 (a 4-space fence closer) and probe10 (an unclosed `<pre>` / `<textarea>`) now fail closed;
  - probe8 regroup, reorder and blank-line edits are `SECTION_CHANGED`;
  - the tab-indented fence matches markdown-it;
  - the prose and the PR template are narrowed.
- **Suppression is safe:** every `touched.add` follows an `add(...)`, so a section it suppresses is always
  RED for another reason.
- **No false RED** on any live-file bump or no-bump variant.
- **No re-cut** across the 113 historical versions.

### Floor-gate findings

None.

### Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/floor/changelog-core.mjs:htmlOpener"
  problem: "The same-line closer is searched only after the opener token, but CommonMark tests the whole line, so `<!-->`, `<!--->` and `<?>` are complete one-line blocks on GitHub yet open a region here — a PR can place a rendered heading (a fake newest version) where neither check sees it."
  evidence: "probe11: markdown-it h2s ['[Unreleased]','[9.9.9] - 2026-09-24','[6.12.1] - 2026-09-23']; grammar ['## [Unreleased]','## [6.12.1] - 2026-09-23']; check2 [] check1 []"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/changelog-core.mjs:NOT RECOGNIZED"
  problem: "The bound for HTML blocks of types 6/7 says they change 'only the few lines before' a blank line, which understates it: those lines can be the newest released heading, so GitHub shows an older version as newest while both checks stay GREEN."
  evidence: "probe12: `<div>` directly above '## [6.12.1] - 2026-09-23' → markdown-it first h2s ['[Unreleased]','[6.12.0] - 2026-09-23', …]; check2 [] check1 []"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/changelog-core.mjs:NOT RECOGNIZED"
  problem: "A heading inside a blockquote (`> ## [9.9.9] - …`) renders as an h2 and is not a listed exception."
  evidence: "probe13: markdown-it h2 count 87 → 88; check1 [] check2 []"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/check-changelog-entry.mjs:header"
  problem: "'Each difference is reported once' overstates: a second, unrelated change in a section an entry finding already names is reported zero times until the first is fixed (the verdict is RED throughout)."
  evidence: "probe13: an edited [6.12.0] entry plus a conflict marker → ['ENTRY_CHANGED','ENTRY_MISPLACED']; the marker is unnamed"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/floor/check-changelog-entry.mjs:section loop"
  problem: "`head.sections.find` takes the first section with a given heading, so a pristine duplicate of a released section placed above the original lets the original be edited unseen by Check 2 (Check 1 still REDs on OUT_OF_ORDER + DUPLICATE_ENTRY)."
  evidence: "probe13: duplicate [6.12.1] above, '* **sneaky**' in the original → check2 [], check1 ['OUT_OF_ORDER','DUPLICATE_ENTRY']"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:56"
  problem: "The entry's 'follows CommonMark's block rules where they decide what renders as a heading' is contradicted by the first finding until it is fixed, and understates the type-6/7 exception."
  evidence: "Its grammar follows CommonMark's block rules where they decide what renders as a heading"
```

**Verdict (iteration 3): GREEN — 0 floor-gate findings.** The six advisory findings are cheap and in
declared files, so they were closed in a third fix round. That round is verified in iteration 4 below,
rather than left as follow-ups.

## Iteration 4

**Floor first.** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. Regress iteration 4
was `no-regressions`, and verify iteration 4 was `PASS` (8 gates at 0, 2774/2774 tests, reconcile `CLEAN`).

**Scope of this pass.** The delta since iteration 3 is small, and each part is covered by a new test:

- `htmlOpener` tests its closer against the whole line;
- a released heading that appears twice at head is `SECTION_CHANGED`;
- the stated exceptions now include blockquote headings, and say that a type-6/7 HTML block can hide an
  adjacent released heading;
- the "reported once" sentence is corrected.

The author reviewed this delta directly, re-running the independent reviewer's own probes:

- `probe11` (`<!-->`, `<!--->`, `<?>`) is now RED: Check 1 `NOT_NEWEST`, Check 2 `UNRELEASED_NOT_MOVED`;
- `probe13`'s pristine duplicate is now `SECTION_CHANGED`;
- the blockquote case stays GREEN, as the stated exception it now is;
- `bump.mjs` shows every legitimate bump and no-bump variant GREEN;
- `cmp.mjs` shows no re-cut across the 113 historical versions.

The whole-line closer test can close a block only on a line that contains its closer, and none of the five
opener tokens contains its own closer. So it cannot close a block that CommonMark leaves open.

**Findings:** none. No floor-gate and no advisory finding.

**Verdict (iteration 4): GREEN — 0 floor-gate findings.** What the increment still does not see is stated,
not hidden: setext headings, asterisk/plus items, headings in nested items or blockquotes, HTML blocks that
end at a blank line, and link-reference definitions. It also proves nothing about whether an entry describes
its change, whether a date is true, or whether a bump was needed.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`, human-gated — not written here)

- **Title:** A check that re-derives a renderer's structure must be probed AGAINST the renderer — fixtures
  written from the author's model of the syntax certify that model, not the renderer.
- **type:** floor · **concepts:** [differential-testing, verification-fidelity, parser-parity, false-green,
  review-recurrence]
- **What happened (this increment, measured).** The CHANGELOG grammar claims to see what GitHub renders as
  a heading. Its own suites stayed GREEN through four constructs where it did not:
  - a fence opened inside a list item;
  - a 4-column fence "closer";
  - an unclosed `<pre>`;
  - a one-line `<!-->`.

  In each case a PR could hide a rendered heading, or the rest of the file, from both checks. Three
  independent review rounds found them one at a time, each by rendering the probe with markdown-it
  (already in `node_modules`) and comparing. Every fixture written before a round encoded the author's
  model, so it passed by construction. That is L4's mechanism, now in a parser: a test that "a heading
  inside a fence is hidden" was itself wrong about what a fence is.

- **Remedy.** When a floor check re-implements a renderer's or parser's notion of structure, include a
  differential test against a reference implementation over a corpus: every committed version of the
  file, plus adversarial constructs. That covers the whole construct space, not only the constructs the
  author already thought of. Where the reference is not a direct dependency, run the differential probe at
  review time and record it.
- **Provenance:** feature `changelog-per-pr`; source
  `.dev/features/changelog-per-pr/REVIEW.md`, iterations 1–3, findings 1 / 1–2 / 1; the commit is captured
  at promotion.
- **Why it would recur (L20's bar).** Four instances in one increment, each surviving a GREEN suite written
  by an author who had just cited L4 and L36.

## Iteration 5 (the R7 delta only)

**Floor first.** `node pharn/floor/validate.mjs .` → GREEN. Regress iteration 5 was `no-regressions`, against
a freshly captured baseline because the outside set changed. Verify iteration 5 was `PASS` (8 gates at 0,
2774/2774 tests, reconcile `CLEAN` over 18 paths).

**What changed, and why.** After review iteration 4, `npm run check` went RED on a test outside this
increment: `.claude/hooks/require-loop-record.test.cjs`, "CLI: blocks from a SUBDIRECTORY".

- **The cause.** It dates its marker from a fixed `NOW` (2026-09-22T12:00Z), while the CLI subprocess it
  spawns judges the marker against the real clock under a 24-hour ceiling.
- **The effect.** It failed on every branch from 2026-09-23T12:00Z. It was reproduced five times in a row,
  and it is on `main` since #243.
- **What R7 did.** The plan declared the file, and the one fixture call now dates the marker from the real
  clock. A dated `### Fixed` entry records it, and the fixture-transition test now expects this PR's two
  new entries.

**Lenses.**

- **L-floor (P0).** The fix claims no guarantee. Its comment states the mechanism: a spawned CLI cannot take
  an injected clock.
- **L-eval (P1).** The test still exercises the `.git` walk from a subdirectory, which is what it exists for.
  The other CLI tests in the file already date their marker through `--open` (real time).
- **L-trust (P2).** Nothing new.
- **L-axis (P3).** One reason to change, in one file.
- **The same trap in this increment's own suites.** None:
  - fixture dates fed to the real-clock CLI are in the past, or deliberately far in the future (2099);
  - precise-time cases inject `now`;
  - the per-PR checker never reads a date's value.

**Findings:** none.

**Verdict (iteration 5): GREEN — 0 floor-gate findings.**
