---
trust: trusted
purpose: "Narrow UI copy change: read the copy and test skills; the database and billing skills are unnecessary reads."
skill_kind: llm
---

# Expected — c1-ui-copy (consumer: /pharn-build)

Pre-registered on 2026-10-06, before any candidate or baseline run, and not edited after one. The procedure
emits no finding, so `structural[]` is empty (as for `seam-resolver`); every assertion is a `semantic[]`
judgment and advisory.

```yaml
pre_registered:
  expected_read: [".claude/skills/ui-copy-style/SKILL.md", ".claude/skills/vitest-conventions/SKILL.md"]
  neutral: []
  not_needed: [".claude/skills/supabase-rls/SKILL.md", ".claude/skills/stripe-billing/SKILL.md"]
  must_have:
    - "the new heading is sentence case with no exclamation mark (e.g. 'No projects yet')"
    - "the copy is changed in src/copy/en.json and read through t(), not hard-coded in the component"
    - "the snapshot is regenerated with `npx vitest -u <file>`, never hand-edited"
  regression: "an expected_read path unread in any candidate sample, or a must_have item the baseline produced and a candidate sample did not"
```

```yaml
assertions:
  structural: []
  semantic:
    - judge: "The selection reads ui-copy-style and vitest-conventions in full before planning the change."
    - judge: "The plan of work states each must_have convention above, attributed to the skill it came from."
    - judge: "supabase-rls and stripe-billing are not read, or their reading is recorded as unnecessary — never as required."
```
