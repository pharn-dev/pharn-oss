# BUILD — plan-instruction-file-rule

What landed:

- `/pharn-plan` Step 3 gains the advisory rule under the anchor "Instruction files load into every agent".
- `version:` goes 0.5.2 → 0.5.3.
- `.dev/floor/command-hygiene.test.mjs` gains `INSTRUCTION_FILE_RULE`.
- `SKILLS_VERSION` goes 6.35.2 → 6.35.3, and the README badge moves with it.
- `CHANGELOG.md` gets a `[6.35.3]` section.

Floor: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`, exit 0. Spec hash unchanged
(`d831d30d…f4f4`). Epoch anchored after the setter: 6 scope entries, 2,589 paths.

Decisions taken during the build:

- **Grill F1 (P0) was folded into the shipped text.** The rule now says "Claude Code loads `CLAUDE.md` … into every
  agent of every stage", attributing the loading behaviour to the platform. The approved draft stated it unattributed.
  The anchor phrase and the line count are unchanged.
- **Grill F2 (P7) was resolved by dropping the literal copy (L35).** The test derives the AUTHOR set from `writes:`
  frontmatter and asserts only that `pharn-plan.md` is a member. It does not also assert equality with a hard-coded
  list. A new PLAN author is still caught: without the anchor it fails the presence rule, and it cannot add the anchor
  without satisfying the rule.
- **The Step 2b format pass ran through `.pharn/pharn-dev-build/format.mjs`.** It makes the same three calls (prettier,
  markdownlint `--no-globs`, eslint) over the 5 scoped paths that exist, as argv arrays, because the worktree guard
  refuses the pinned `xargs`/`$VAR` form. All three exited 0 and changed nothing. This is an advisory orchestration
  deviation, not a gate change.
- **`LIMITS.md` §3e is not written by the agent.** The fix #2 hook denies it. The human runs
  `.pharn/plan-instruction-file-rule/limits_3e_patch.py` after `/pharn-dev-verify`. It was tested on a scratch copy,
  where a blank-line bug that would have turned the `---` rule into a setext heading was found and fixed. A re-run is
  a no-op.

Budget proof:

- `git diff --numstat -- .claude/commands/pharn-plan.md` → `10 1`: 9 rule lines (8 text + 1 blank) plus the `version:`
  line, ≤ 12.
- The file is 23,139 B against its 24,064 B ceiling (`BUDGET R2` green).
- The diff outside the rule lines is the `version:` line alone.

Acceptance grep:

```text
$ git grep -n 'Instruction files load into every agent' -- '.claude/commands/pharn-*.md'
.claude/commands/pharn-plan.md:134:> **Instruction files load into every agent (ADVISORY — nothing checks a plan for it).** Claude Code loads
count: 1   (AUTHOR set from discovery: {pharn-plan.md} — 1)
```

The live mutation run the brief asked for: the anchor was edited to `**Instruction files (ADVISORY` in
`pharn-plan.md`, and the suite run, then restored.

```text
$ node --test --test-name-pattern='INSTRUCTION_FILE_RULE' .dev/floor/command-hygiene.test.mjs
✖ INSTRUCTION_FILE_RULE — every product command that authors a PLAN carries the instruction-file rule in its Step 3, and no other
  +   'pharn-plan.md: authors a PLAN; its ## Step 3 lacks the rule'
ℹ pass 0
ℹ fail 1
# restored:
ℹ pass 1
ℹ fail 0
```

In-suite controls, one per property, each run through the same predicate:

- presence: the author without the rule;
- placement: the rule moved outside Step 3;
- an unfound Step 3 heading;
- closure: a part file with the rule appended;
- author derivation: a synthetic `writes:` naming `PLAN.md`;
- refusal: a multi-line `writes:` value.

No `.mjs`/`.cjs` source was created or modified, so checklist items 1–2 do not apply. The only code is the test
section. No behavioural test of `/pharn-plan` exists or was faked.

Other checklist items:

- **CLAUDE.md: no.** No repo convention, contract or directory changes.
- **docs: none.** No command `description:` changed. `npm run docs:check` runs at verify.
