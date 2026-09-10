# REVIEW — readme-writes-scope-default

- **Increment under review:** correcting the writes-scope fail-closed default's stated width and
  attribution in `README.md` (`## Current limitations`) and `.claude/commands/pharn-review.md`;
  `SKILLS_VERSION` 3.2.0 -> 3.2.1 + CHANGELOG + badge.
- **Trust:** the increment under review is treated as `trust: untrusted`. Nothing instruction-shaped was
  found in the reviewed diff.
- **Floor gate (already owned upstream):** `pharn/floor/validate.mjs .` = 0; `check-verify` = `PASS`;
  `check-regress` = `no-regressions`.

## Lens 1 — P0 (floor-or-advisory: is every claim reduced or labelled?)

```yaml
- type: observation
  rule_id: "CONSTITUTION.md P0"
  severity: advisory
  file: README.md
  problem: >-
    The rewritten bullet keeps a universal quantifier ("may write only `features/**`"), which is the exact
    fragment L37 identifies as where drift lands. Here it is SOUND, and the reason is structural rather
    than lucky: the very next sentence names the unlisted member (`.pharn/**`) and the sentence after it
    names the excluded one (`.pharn/writes-scope.json`), so the quantifier is closed in-place instead of
    being left for a reader to falsify. Recorded as an observation, not a defect, so a later editor does
    not "simplify" the two follow-on sentences and silently re-open L37.
  evidence: "README.md `## Current limitations` — 'may write only `features/**` in an installed project'"

- type: observation
  rule_id: "CONSTITUTION.md P0"
  severity: advisory
  file: CHANGELOG.md
  problem: >-
    The entry states its own bound plainly ("nothing reads either file's prose ... correct today by
    evidence, not by enforcement") and does not claim a guarantee. It also names the one site left
    uncorrected on purpose (`CHANGELOG.md:254`), so the absence is a recorded decision rather than a miss.
  evidence: "CHANGELOG.md `### Fixed` — 'Bound (P0): nothing reads either file's prose'"
```

## Lens 2 — P4 (rules are the single source of truth; cite, never restate)

```yaml
- type: risk
  rule_id: "CONSTITUTION.md P4"
  severity: blocking
  file: .claude/commands/pharn-review.md
  problem: >-
    This increment CREATES A SECOND SITE stating the guard's width in prose. `README.md` and
    `pharn-review.md` now independently describe the same runtime-computed set, so the next change to
    `DEFAULT_SAFE_SET` or to `ALWAYS` must land in three places (the hook, plus both docs) — and the whole
    defect being repaired is what happens when one of them is missed. This is the residual the increment
    ENLARGES, and it is stated rather than hidden.
  evidence: >-
    "README.md '## Current limitations' and .claude/commands/pharn-review.md:83-93 both now enumerate
    `features/**` + `.pharn/**` + the `writes-scope.json` exclusion"
  mitigation: >-
    Both sentences cite `.claude/hooks/enforce-writes-scope.cjs` as the computing authority, and both
    record an executed exit code beside the claim, so a reader who doubts either can re-probe in seconds.
    That narrows the drift window; it does not close it. The pre-existing named residual
    `default-safe-set-doc-pin` is the right home for a real fix and stays deliberately unbuilt (see the
    plan's guarantee audit for why a stem-scan checker was declined on VALUE, not on impossibility).
```

## Lens 3 — P6 (discovery-first: is every assertion from live state this run?)

```yaml
- type: observation
  rule_id: "CONSTITUTION.md P6"
  severity: advisory
  file: .dev/features/readme-writes-scope-default/PLAN.md
  problem: >-
    Every path-set claim in this increment traces to an executed probe recorded in the plan, not to a
    reading of the hook: the install/dev partition, the ALWAYS composition, the `writes-scope.json` deny,
    and the replaces-not-adds trade were each measured in a throwaway fixture. The `pharn-review.md`
    claim was additionally re-probed on its own terms (`.pharn/anything.json` -> exit 0) before the
    sentence was rewritten.
  evidence: "PLAN.md '## The failure this closes' — the two recorded exit-code blocks"

- type: gap
  rule_id: "CONSTITUTION.md P6"
  severity: advisory
  file: README.md
  problem: >-
    One property of the rewritten bullet was NOT measured: how the emphasis around an inline code span
    containing `**` renders on GitHub (`**` + ` `.pharn/**` ` + text + `**`). CommonMark resolves code
    spans before emphasis, and `prettier` + `markdownlint-cli2` both accept it, so it is very likely fine
    — but "the linters accept it" is not "it renders as intended", and this repo's own standard is to
    measure rather than to reason. Cheap to close: look at the rendered PR page.
  evidence: "README.md `## Current limitations` — '**`.pharn/**` is writable too, but it is not part of that default**'"
```

## Lens 4 — P7 (no speculative additions)

```yaml
- type: observation
  rule_id: "CONSTITUTION.md P7"
  severity: advisory
  file: .dev/features/readme-writes-scope-default/PLAN.md
  problem: >-
    No capability, command, checker or test is added. The increment corrects two shipped sentences and
    bumps the version that ships one of them. The one addition it was tempted into — a drift checker over
    the claim — was declined with a stated reason, and the grill caught the first draft of that refusal
    resting on a false impossibility claim, which was corrected rather than carried.
  evidence: "PLAN.md '## Guarantee audit' — 'It does not rest on impossibility, and the first draft of this audit was wrong to say so'"
```

## Standing verdicts + what is NOT claimed

| item                         | value                           | kind     |
| ---------------------------- | ------------------------------- | -------- |
| `pharn/floor/validate.mjs .` | exit 0 (GREEN, 36 capabilities) | FLOOR    |
| `check-regress` verdict      | `no-regressions`                | FLOOR    |
| `check-verify` verdict       | `PASS` (10 gates, 1886 tests)   | FLOOR    |
| the two sentences are TRUE   | probed, not gated               | ADVISORY |

**Struck, explicitly:** "the docs now agree with the guard" is not a guarantee — no checker reads either
file's prose. What the run establishes is that on 2026-09-10, against the hook at `4bd1b0c`, the corrected
sentences matched measured exit codes.
