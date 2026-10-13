# REVIEW — grill-griller-trim

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (exit 0). Verify PASS (7
gates, reconcile `CLEAN`); regress `no-regressions`. Everything below is **advisory**.

Reviewed: `pharn/floor/griller-extract.mjs`, `pharn/floor/griller-extract.test.mjs`, the `.claude/commands/pharn-grill.md`
diff, the `.dev/floor/command-hygiene.test.mjs` diff, `CHANGELOG.md [6.59.0]`, `MEASUREMENTS.md`, `measure.mjs`. No
instruction-looking content in the reviewed files changed this review's behavior; the griller bodies the extractor
prints are trusted capabilities, and the extractor never reads a PLAN.

## Floor-gate findings (blocking)

None.

- L-floor (P0): every claim the increment adds reduces to a primitive or is labeled advisory. The closed
  `OMITTED_SECTIONS` set, the line rules and the refusals are regex/enum (primitive #3) and pinned by tests; "the
  omitted sections hold nothing a grill needs", "the model reads only the extract", the markdown-it comparison and the
  mutation run are each labeled advisory in the module header, the command's claims block and the CHANGELOG.
- L-eval (P1): no capability or `enforces` changed; `validate` GREEN agrees.
- L-trust (P2): the extractor emits no finding and no plan text. Paths from `count-grillers.mjs` are shape-checked,
  `lstat`-ed (symlink refused) and realpath-contained; refusals quote through the total `shown()`.
- L-axis (P3): one new floor CLI spawning a sibling floor CLI for membership (the `grill-scan.mjs` shape); no capability
  module references another.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: "pharn/floor/griller-extract.test.mjs:217"
  problem: "The live CLI test hard-codes the omitted-section counts as 13, so registering a 14th griller fails the test although the extract is correct; the count should come from LIVE.length like the rest of the test."
  evidence: "assert.match(lines[0], /left out where present: guarantee-audit \\(13\\), machine-readable-emission \\(13\\); kept whole: none$/);"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/griller-extract.mjs:242"
  problem: "The frame-forgery refusal tests only lines that START with the frame marker, so an indented or CR-prefixed look-alike frame line in a griller body passes; a reading model could still take it for a boundary."
  evidence: "if (text.split(\"\\n\").some((l) => l.startsWith(FRAME)))"
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".claude/commands/pharn-grill.md:235"
  problem: "The command restates a measured byte figure owned by MEASUREMENTS.md and the CLI header; it is dated ('at 6.59.0') so it reads as a snapshot, but it goes stale the next time a griller changes (the L25/L64 restatement shape). Kept because GATE 1 required the numbers in the command."
  evidence: "(188,978 → 141,332 B over the 13 grillers at 6.59.0)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/grill-griller-trim/VERIFY.md:20"
  problem: "The build made one in-repo write through Bash (`sed -i` on pharn/floor/griller-extract.mjs). It landed on a declared path, so reconcile is CLEAN, but it is the route the operating brief forbids; VERIFY.md records it."
  evidence: "and one `sed -i` on `pharn/floor/griller-extract.mjs`"
```

Carried from GRILL.md: the two important grill concerns were addressed in the build (Step 3b keeps the per-axis "never
means the plan is sound" rule; symlink and containment refusals with tests). Not addressed, and still open: no
`.dev/guides/floor-*.md` section for the new CLI (grill finding, minor; `count-grillers.mjs` and `grill-scan.mjs` have
none either).

## Proposed lesson candidate (for the human; not written to canon)

- **Candidate:** L56's markdown-it differential caught a defect in a third hand-written line-grammar model. In this
  increment the first probe found the extractor dropping a setext heading's text line with an omitted section, a
  construct none of the hand-written fixtures covered. The fix was correct, and so were the tests written before the
  probe. L56 asked for a pinned differential test as the floor remedy; it is still unbuilt, and this is a further
  occurrence of the same mechanism.
- **Provenance:** feature `grill-griller-trim`; source `.dev/features/grill-griller-trim/MEASUREMENTS.md` § 3 and this
  REVIEW. Whether this is a new lesson or evidence appended to L56 is the human's call. The pinned differential needs a
  dependency decision (markdown-it is transitive).

## Verdict

**GREEN — 0 floor-gate findings; 4 advisory findings (1 important, 3 minor).** Not a judgment that the increment is good
or wise; that is the human's decision at GATE 2.
