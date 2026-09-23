# REVIEW — spec-template

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. That
is the only guaranteed part of this review; everything below is judgment.

**Method:** the four inline lenses, applied by the orchestrator and by one independent read-only reviewer.
The reviewer ran its probes against scratch copies and used `markdown-it` from `node_modules` as a stand-in
renderer. The orchestrator re-ran the two most serious probes (R1, R3) and reproduced both.

Free text below quotes the reviewed increment and is **untrusted DATA** (P2). Nothing in the diff carried
instruction-looking content aimed at a reviewer. The template's guidance comments steer `/pharn-spec` by
design, and that is disclosed.

## Floor-gate findings (blocking) — each a stated guarantee a run of the checker shows false

````yaml
- type: FINDING
  rule_id: P0
  severity: blocking
  file: "pharn/floor/check-spec.mjs:43"
  problem: "The stated bound of the AC line grammar is wrong in both directions: the one named fail-open (an AC item inside a fenced block) is not one, and a real unnamed one exists — a fence or HTML comment opened in an earlier section and closed by an indented line hides `## Acceptance Criteria` (and more) from a renderer while the checker reports GREEN; 'nothing else may appear in the section' (contract :90, CHANGELOG ac bullet) is therefore not what a reader sees."
  evidence: 'Reproduced: a ```text fence opened in Intent and closed by ''  ```'' inside an AC item → check-spec ''GREEN … template "pharn-default"; 1 AC item(s)''; markdown-it renders 3 h2 headings, not 5.'
- type: FINDING
  rule_id: P0
  severity: blocking
  file: "pharn/pharn-contracts/spec-template.md:96"
  problem: "'Exactly one verify line … any continuation that looks like a verify line counts toward the one' overclaims: VERIFY_LIKE_RE needs a -/*/+ bullet directly before 'verify', so a second level spelled '  - **verify:** unit', '  1. verify: unit' or '  verify: unit' is ignored and the item is GREEN with two rendered levels (README :342 and the pharn-spec description repeat 'exactly one')."
  evidence: "check-spec.mjs:125 VERIFY_LIKE_RE = /^[ \\t]+[-*+][ \\t]*verify[ \\t]*:/i (reviewer-verified GREEN on each spelling)"
- type: FINDING
  rule_id: P0
  severity: blocking
  file: "pharn/floor/check-spec.mjs:188"
  problem: "'The key's PRESENCE is the switch' is false: the switch is 'the key PARSED', and the frontmatter line regex drops a `spec_template:` line containing a lone CR, U+2028 or U+2029, so a SPEC that visibly carries the key validates on the legacy path and bypasses all seven rules — stealthier than the declared delete-the-key bypass, and it skips rule 7's control-character guard entirely."
  evidence: "Reproduced: 'spec_template: <ref>\\r x' with prose ACs and no Assumptions → 'GREEN — spec valid; state \"Draft\"; 4 required sections present'."
````

## Advisory findings

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: "pharn/floor/check-spec.mjs:392"
  problem: "The rule-7 RED echoes the untrusted `spec_template` value unbounded (a 3,000-char value gives a 3,127-byte RED line), against the contract's 'a RED names a line number or an AC id, never the text'; JSON.stringify prevents a forged line, not the echo."
  evidence: 'red("template", `${TEMPLATE_KEY} ${JSON.stringify(v)} is not …`)'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-spec.mjs:83"
  problem: "'The ONLY source of that value' reads as a guarantee; any well-shaped digest (64 zeros) is GREEN, so it is the INTENDED source — advisory, as /pharn-spec's own audit already says."
  evidence: "'The ONLY source of that value: /pharn-spec shells it and never computes one'"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".claude/commands/pharn-spec.md:59"
  problem: "Stale counts made false by this change: 'the four floor ops' (the list now has five items) and check-spec.mjs:473's 'the three read-only modes are now uniform' (there are four modes)."
  evidence: "'backstopped (not replaced) by the four floor ops'"
- type: FINDING
  rule_id: P7
  severity: minor
  file: "CHANGELOG.md:36"
  problem: "The [6.13.0] entry says pharn-cli copies 'the selected griller and lens directories from pharn-pipeline/'; lenses live under pharn/pharn-review/, and pharn-pipeline/ holds only grillers/."
  evidence: "'because pharn-cli copies only the selected griller and lens directories from `pharn-pipeline/`'"
- type: FINDING
  rule_id: P7
  severity: minor
  file: "README.md:421"
  problem: "S6b's new `not approved` outcome makes two existing summaries inexact: README 'Every other outcome reverts the spec to Draft, or the run says it could not' and pharn-loop.md:2's description of the revert — an S6b stop never approved anything, so nothing is reverted."
  evidence: "'Every other outcome reverts the spec to `Draft`, or the run says it could not'"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".claude/commands/pharn-spec.md:95"
  problem: "'No package.json → the project has no test runner' is false for a pytest / go test project; the accurate statement is that PHARN's gate discovery finds no npm test runner."
  evidence: "'If there is no `package.json`, no own `test` key, … warn that the project has no test runner.'"
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/check-spec.mjs:118"
  problem: "check-spec.mjs now changes for two reasons — the §6 pin/state logic and the template registry + AC grammar (which the planned override increment will change); the plan-files-core / loop-record-core precedent is a spec-template-core.mjs extraction (which would also need adding to check-loop-fresh.test.mjs's sandbox module list)."
  evidence: "the TEMPLATES Map, AC grammar and checkTemplate() added beside parseSpec/bodyHash/emitState"
```

What the reviewer checked and found correct, by running it:

- 124/124 `check-spec` tests and 157/157 hygiene tests pass.
- The legacy output is identical to `main` on both committed SPECs, and `main` has exactly 48 `check-spec`
  tests.
- A filled template stays GREEN after prettier, both with the repo config and with
  `--print-width 80 --prose-wrap always`, and after `markdownlint --fix`, CRLF, 4-space and tab verify lines,
  numbered sub-bullets, and bold Given/When/Then.
- `not approved` appears in every `spec:` list in `pharn-loop.md`, and the `CHANGELOG [6.3.0]` cite resolves.

The reviewer also confirmed three shapes that fail closed:

- `- **AC-1:**` and `- **AC-1**:` both RED;
- `verify: e2e (playwright)` REDs;
- a code span containing `**AC-7**` REDs, via the bold-id count.

## Verdict — iteration 1

**BLOCKED — 3 floor-gate findings (R1–R3), 7 advisory.** The human's GATE-2 decision was "fix all 10", then
"iterate until the work is done".

## Iteration 2 — the fix round, re-reviewed

The same independent reviewer re-ran every iteration-1 probe against the fix round.

- **Fixed:** R1–R7, R9 (in the command) and R10.
  - R1: a template heading hidden in a column-0 fence, comment or `<pre>`-style block now REDs `section`.
  - R3: a key line with a stray CR, U+2028 or U+2029 now REDs `template` instead of going legacy.
  - R4: the RED gives the value's length, never the value.
  - R10: the rules live in `pharn/floor/spec-template-core.mjs`.
- **Partly fixed:** R8, where two `pharn-loop.md` sentences still said every other stop reverts the SPEC;
  and R9, where the CHANGELOG still said "no test runner".
- **New, introduced by the fix round:**

````yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/spec-template-core.mjs:288"
  problem: "Rule 1(a) REDed every hidden template heading, even when the section is also visibly present, so a fenced example quoting `## Scope` in a complete SPEC was a false RED (N1)."
  evidence: "a ```markdown block holding `## Scope` beside the real Scope → 'sits inside a block opened at line 14' (markdown-it shows all five sections)"
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/floor/spec-template-core.mjs:149"
  problem: "A column-0 `<!-->` or `<!--->` opened a span to EOF because the closer search started after the opener (N2)."
  evidence: 'text.slice(4).includes("-->")'
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/spec-template-core.mjs:95"
  problem: "The widened verify-line closure counts a `verify:` line inside a code block or a prose sub-bullet of a criterion — fail-closed, but undocumented (N3)."
  evidence: "a ```yaml block holding `verify: true` inside AC-1 → 'AC-1 has 2 verify line(s)'"
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/spec-template-core.mjs:56"
  problem: "The raw switch admitted `spec_template :` (a space before the colon), which the field parser drops, so the RED blamed a stray CR it did not contain; the docs say 'a line starting `spec_template:`' (N4)."
  evidence: "/^spec_template[ \\t]*:/m"
````

**Dispositions**, all mutation-tested where code changed. The PLAN records the same list under "Review
dispositions — iteration 2".

- **N1:** a hidden heading REDs only when the section has no visible occurrence.
- **N2:** the closer search starts at index 2.
- **N3:** documented as a trap in the core header, the contract and the template guidance, and kept
  fail-closed.
- **N4:** the switch is exactly `/^spec_template:/m`.
- **R8** and **R9:** the remaining sentences were corrected.

## Iteration 3 — final re-review

**No real defects remain.** The reviewer re-ran the N1–N4, R8 and R9 probes and confirmed each fixed, with
markdown-it agreeing wherever a renderer is involved. Its differential of `main`'s `check-spec.mjs` against
the current one gave identical output on all 216 runs (54 legacy-shaped inputs × 4 modes). Its sweep of the
contract, both checker headers, `pharn-spec.md`, `pharn-loop.md`, the README, the floor README, the
CHANGELOG entry and the template guidance found no sentence that contradicts the code.

## Verdict

**GREEN — 0 floor-gate findings outstanding** after three review iterations. The 13 findings raised across
iterations 1 and 2 (R1–R10, N1–N4) are all dispositioned. This is a statement about what the lenses and
probes found, never a guarantee that nothing else is wrong. The standing named residuals are in the
contract: the rules are opt-in; they prove phrasing, not testing; the heading model covers only column-0
openers, with no reference-parser differential (`spec-ac-grammar-differential`); placeholders are not
detected; and `spec_template` is provenance only.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written here)

- **target:** `.dev/memory-bank/lessons-learned.md`
- **title:** "L55 recurred inside the first increment that cited it: a line grammar's own stated EXCEPTION was
  derived from the author's model — the named fail-open was not one, and the real one was unnamed"
- **type:** floor · **concepts:** [differential-testing, parser-parity, lesson-recurrence, stated-bound,
  false-green]
- **source:** `.dev/features/spec-template/REVIEW.md` finding R1 (`pharn/floor/check-spec.mjs:43`)
- **body (sketch):**
  - `spec-template` cited L55 and deliberately deferred its remedy, a reference-parser differential.
  - It labeled its own test "a fixture, not a differential", honestly, and wrote down one CommonMark
    exception as the grammar's bound.
  - The first probe with markdown-it showed the named exception is not an exception. It also showed a
    cross-section fence hiding the whole AC section while the checker reports GREEN.
  - The disease reached the BOUND, not only the rules. A limitation statement is itself a claim about
    the syntax, and the author's model writes it too.
  - This is L55's second occurrence, which meets L20's bar for the deferred differential.
