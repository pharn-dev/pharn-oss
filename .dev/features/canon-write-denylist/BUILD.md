# BUILD — canon-write-denylist — **HALTED at Step 2 (P6 halt-and-ask)**

**Status: the code change was NOT built. The floor was never reached.** This is not a RED floor verdict;
it is a refusal at the write surface, one step earlier.

## What happened, in order

1. **Step 0 (fix #7) behaved exactly as designed.** `set-writes-scope.cjs --from-plan` **refused** the
   plan, naming `.claude/hooks/protect-trusted-paths.cjs` as the write-guards' own control surface.
   Re-run with `--allow-claude-dir` — the flag's documented purpose, "the increments that genuinely edit
   a guard" — it resolved **11 path(s)**.
2. **Step 1 (fix #4) passed.** `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` recomputed
   `bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299`, equal to the plan's
   `spec_content_hash`. No spec drift.
3. **Step 2 was DENIED by `protect-trusted-paths.cjs` itself.** The first `Edit` to the hook returned:

   ```text
   BLOCKED by PHARN floor: …/.claude/hooks/protect-trusted-paths.cjs is (or resolves to) a trusted file
   (CONSTITUTION P2 / fix #2). Trusted spec is human-only; the build agent may not write it. If a change
   is genuinely needed, a human edits it outside the agent loop.
   ```

## The structural fact this run establishes

**All three guard scripts are protected, so no version of this fix is agent-writable — the guard cannot
be hardened by the agent at all.** Probed live rather than reasoned about:

```text
echo '{"tool_name":"Write","tool_input":{"file_path":"<path>"}}' | node .claude/hooks/protect-trusted-paths.cjs
  .claude/hooks/protect-trusted-paths.cjs   -> EXIT=2   (denied)
  .claude/hooks/enforce-writes-scope.cjs    -> EXIT=2   (denied)
  .claude/hooks/set-writes-scope.cjs        -> EXIT=2   (denied)
  .claude/hooks/protect-trusted-paths.test.cjs -> EXIT=0 (allowed — tests deliberately unprotected)
```

The denylist could only live in one of those three files (it must compose with an existing case-fold +
symlink-resolution + fail-closed decision path), so the increment is **structurally human-only**. The
three routes an agent could take to proceed anyway are each explicitly forbidden and none was taken:

- a **Bash** write — `PreToolUse` never sees it, but `CLAUDE.md` states plainly that "routing an
  **in-repo** write through Bash to dodge the guard is still the thing you must not do";
- editing `.claude/settings.json` / `settings.local.json` to unwire the hook — both are themselves
  protected, and this is the self-escalation the guard exists to stop;
- `PHARN_PROTECTED` — it only **extends** the protected set; there is no reducing knob, by design.

**Nothing was bypassed, disarmed, or worked around.**

## A correction to this feature's own PLAN (P6 — never assert repo state from memory, and re-probe)

`PLAN.md`'s open question 1 recorded that "the write-guard hooks are not firing against this session's
tool calls". **That is FALSE, and the plan's own evidence for it was an invalid probe.** The probe was an
`Edit` carrying a deliberately non-matching `old_string`; the Edit tool rejects an unmatched string
**before** the `PreToolUse` hook runs, so the "String to replace not found" it returned proved the
**tool** was reachable and said nothing about the **guard's** verdict. A real edit was denied at once.

This is **L37** demonstrating itself inside the increment that cites it: a bound was read off a
convenient signal instead of executed against the guard, and it was wrong. It is recorded here rather
than quietly corrected, because an audit trail that edits away its own wrong turn is not one.

## What DID ship in this increment

- `README.md` — one `## Current limitations` bullet **disclosing the gap that still exists**. This is the
  finding's own prescribed fallback ("state the limitation"), taken because `LIMITS.md` is one of the four
  hook-protected trusted docs and is likewise not agent-writable.
- `CHANGELOG.md` — an `[Unreleased]` entry recording the disclosure and the blocked remediation.
- `PLAN.md`, `GRILL.md`, this `BUILD.md`, and `SHIP.md` — the audit trail.
- `proposed/` — the complete, ready-to-apply patch for a human (see `proposed/APPLY.md`).

## What did NOT ship, and why not

- **`SKILLS_VERSION` was NOT bumped, and no product-surface byte changed.** The assignment for this task
  was `3.0.9` on the premise that `.claude/hooks/*.cjs` would change. It did not. Bumping a version that
  advertises a shipped guarantee which is not in the tree would be precisely the P0 disease this repo
  exists to prevent ("written in the contract" mistaken for "therefore guaranteed"), so the bump is
  deliberately withheld. `README.md` and `CHANGELOG.md` are repo-meta and non-bumping by `CLAUDE.md`'s
  own rule. **The README shields badge is therefore also untouched**, and `check-version-badge` stays
  GREEN because both sides of its comparison are unchanged.
- The seven doc sites whose sentences would expire — they expire **only if the hook change lands**, so
  editing them now would make the docs false in the other direction (L33, applied in the correct
  temporal order). They are enumerated in `proposed/APPLY.md` for whoever applies the patch.

**FLOOR STATUS: `node pharn/floor/validate.mjs .` is GREEN, and that fact is nearly meaningless here** —
the floor walks the `pharn/` capability surface and deliberately ignores `.claude/`, so it never had an
opinion about this increment. Recorded so a green line is not mistaken for a verdict on work that did not
happen (P0).
